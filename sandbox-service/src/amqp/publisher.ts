import type amqplib from 'amqplib';
import type { SandboxResultEvent } from '../types.ts';
import { EXCHANGE_SANDBOX, ROUTING_SANDBOX_RESULT } from './setup.ts';

export class AmqpPublisher {
  private readonly channel: amqplib.Channel;

  constructor(channel: amqplib.Channel) {
    this.channel = channel;
  }

  publishResult(event: SandboxResultEvent): void {
    this.channel.publish(
      EXCHANGE_SANDBOX,
      ROUTING_SANDBOX_RESULT,
      Buffer.from(JSON.stringify(event)),
      { persistent: true },
    );
  }
}
