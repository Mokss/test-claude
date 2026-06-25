import type amqplib from 'amqplib';
import type { ISubmissionUseCase } from '../../../core/ports/input/submission-use-case.ts';
import type { SandboxResultEvent } from '../../../core/ports/output/event-bus.ts';
import { ROUTING_SANDBOX_RESULT } from './setup.ts';

export async function startSandboxResultConsumer(
  channel: amqplib.Channel,
  submissions: ISubmissionUseCase,
): Promise<void> {
  await channel.consume(ROUTING_SANDBOX_RESULT, async (msg) => {
    if (!msg) return;

    let event: SandboxResultEvent;
    try {
      event = JSON.parse(msg.content.toString()) as SandboxResultEvent;
    } catch {
      // невалидный JSON — не можем обработать, отбрасываем
      channel.nack(msg, false, false);
      return;
    }

    try {
      await submissions.handleSandboxResult(event.submissionId, event.result);
      channel.ack(msg);
    } catch (err) {
      // submission не найден или другая ошибка — не requeue
      channel.nack(msg, false, false);
    }
  });
}
