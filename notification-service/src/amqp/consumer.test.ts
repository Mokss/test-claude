import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { startConsumer } from './consumer.ts';
import type { NotifyTeacherEvent } from '../types.ts';

const VALID_EVENT: NotifyTeacherEvent = {
  teacherId: 't1',
  teacherEmail: 'teacher@school.com',
  studentName: 'Иван',
  taskTitle: 'Сортировка',
  submissionId: 's1',
  status: 'passed',
};

function makeChannel() {
  let capturedCallback: ((msg: unknown) => Promise<void>) | null = null;
  const acks: unknown[] = [];
  const nacks: unknown[] = [];

  const channel = {
    prefetch(_n: number) {},
    async consume(_queue: string, cb: (msg: unknown) => Promise<void>) {
      capturedCallback = cb;
    },
    ack(msg: unknown) { acks.push(msg); },
    nack(msg: unknown) { nacks.push(msg); },

    async deliver(content: unknown) {
      const msg = { content: Buffer.from(typeof content === 'string' ? content : JSON.stringify(content)) };
      await capturedCallback!(msg);
      return msg;
    },

    acks,
    nacks,
  };

  return channel;
}

describe('startConsumer', () => {
  it('вызывает handler с распарсенным событием и делает ack', async () => {
    const channel = makeChannel();
    const received: NotifyTeacherEvent[] = [];

    await startConsumer(channel as never, async (event) => { received.push(event); });

    const msg = await channel.deliver(VALID_EVENT);

    assert.equal(received.length, 1);
    assert.equal(received[0].teacherEmail, VALID_EVENT.teacherEmail);
    assert.equal(received[0].status, VALID_EVENT.status);
    assert.equal(channel.acks.length, 1);
    assert.equal(channel.acks[0], msg);
    assert.equal(channel.nacks.length, 0);
  });

  it('делает nack при невалидном JSON без вызова handler', async () => {
    const channel = makeChannel();
    let handlerCalled = false;

    await startConsumer(channel as never, async () => { handlerCalled = true; });

    await channel.deliver('не json {{{');

    assert.equal(handlerCalled, false);
    assert.equal(channel.nacks.length, 1);
    assert.equal(channel.acks.length, 0);
  });

  it('делает nack если handler бросает ошибку', async () => {
    const channel = makeChannel();

    await startConsumer(channel as never, async () => { throw new Error('SMTP_ERROR'); });

    const msg = await channel.deliver(VALID_EVENT);

    assert.equal(channel.nacks.length, 1);
    assert.equal(channel.nacks[0], msg);
    assert.equal(channel.acks.length, 0);
  });

  it('игнорирует null сообщение (consumer cancel)', async () => {
    const channel = makeChannel();
    let handlerCalled = false;

    await startConsumer(channel as never, async () => { handlerCalled = true; });

    // consume callback с null (RabbitMQ cancels consumer)
    let capturedCb!: (msg: unknown) => Promise<void>;
    const spy = {
      prefetch() {},
      async consume(_q: string, cb: (msg: unknown) => Promise<void>) { capturedCb = cb; },
      ack() {},
      nack() {},
    };
    await startConsumer(spy as never, async () => { handlerCalled = true; });
    await capturedCb(null);

    assert.equal(handlerCalled, false);
  });
});
