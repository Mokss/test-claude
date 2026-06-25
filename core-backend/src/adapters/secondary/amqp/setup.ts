import amqplib from 'amqplib';

export const EXCHANGE_SANDBOX = 'sandbox';
export const EXCHANGE_NOTIFY = 'notify';

export const ROUTING_SANDBOX_RUN = 'sandbox.run';
export const ROUTING_SANDBOX_RESULT = 'sandbox.result';
export const ROUTING_NOTIFY_TEACHER = 'notify.teacher';

export async function createChannel(url: string): Promise<amqplib.Channel> {
  const conn = await amqplib.connect(url);
  const channel = await conn.createChannel();

  await channel.assertExchange(EXCHANGE_SANDBOX, 'direct', { durable: true });
  await channel.assertExchange(EXCHANGE_NOTIFY, 'topic', { durable: true });

  await channel.assertQueue(ROUTING_SANDBOX_RUN, { durable: true });
  await channel.bindQueue(ROUTING_SANDBOX_RUN, EXCHANGE_SANDBOX, ROUTING_SANDBOX_RUN);

  await channel.assertQueue(ROUTING_SANDBOX_RESULT, { durable: true });
  await channel.bindQueue(ROUTING_SANDBOX_RESULT, EXCHANGE_SANDBOX, ROUTING_SANDBOX_RESULT);

  await channel.assertQueue(ROUTING_NOTIFY_TEACHER, { durable: true });
  await channel.bindQueue(ROUTING_NOTIFY_TEACHER, EXCHANGE_NOTIFY, ROUTING_NOTIFY_TEACHER);

  return channel;
}
