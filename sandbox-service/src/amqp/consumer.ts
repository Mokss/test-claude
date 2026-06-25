import type amqplib from 'amqplib';
import type { SandboxRunEvent } from '../types.ts';
import { ROUTING_SANDBOX_RUN } from './setup.ts';

export async function startConsumer(
  channel: amqplib.Channel,
  handler: (event: SandboxRunEvent) => Promise<void>,
): Promise<void> {
  await channel.consume(ROUTING_SANDBOX_RUN, async (msg) => {
    if (!msg) return;

    let event: SandboxRunEvent;
    try {
      event = JSON.parse(msg.content.toString()) as SandboxRunEvent;
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
