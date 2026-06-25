import type amqplib from 'amqplib';
import type { NotifyTeacherEvent } from '../types.ts';
import { ROUTING_NOTIFY_TEACHER } from './setup.ts';

export async function startConsumer(
  channel: amqplib.Channel,
  handler: (event: NotifyTeacherEvent) => Promise<void>,
): Promise<void> {
  channel.prefetch(1);

  await channel.consume(ROUTING_NOTIFY_TEACHER, async (msg) => {
    if (!msg) return;

    let event: NotifyTeacherEvent;
    try {
      event = JSON.parse(msg.content.toString()) as NotifyTeacherEvent;
    } catch {
      channel.nack(msg, false, false);
      return;
    }

    try {
      await handler(event);
      channel.ack(msg);
    } catch (err) {
      console.error('[consumer] handler error:', err);
      channel.nack(msg, false, false);
    }
  });
}
