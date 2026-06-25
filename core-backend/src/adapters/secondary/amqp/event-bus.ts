import type amqplib from 'amqplib';
import type { IEventBus, SandboxRunEvent, NotifyTeacherEvent } from '../../../core/ports/output/event-bus.ts';
import { EXCHANGE_SANDBOX, EXCHANGE_NOTIFY, ROUTING_SANDBOX_RUN, ROUTING_NOTIFY_TEACHER } from './setup.ts';

export class AmqpEventBus implements IEventBus {
  private readonly channel: amqplib.Channel;

  constructor(channel: amqplib.Channel) {
    this.channel = channel;
  }

  async publishSandboxRun(event: SandboxRunEvent): Promise<void> {
    this.channel.publish(
      EXCHANGE_SANDBOX,
      ROUTING_SANDBOX_RUN,
      Buffer.from(JSON.stringify(event)),
      { persistent: true },
    );
  }

  async publishNotifyTeacher(event: NotifyTeacherEvent): Promise<void> {
    this.channel.publish(
      EXCHANGE_NOTIFY,
      ROUTING_NOTIFY_TEACHER,
      Buffer.from(JSON.stringify(event)),
      { persistent: true },
    );
  }
}
