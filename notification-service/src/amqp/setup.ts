import amqplib from 'amqplib';

export const EXCHANGE_NOTIFY = 'notify';
export const ROUTING_NOTIFY_TEACHER = 'notify.teacher';

export async function createChannel(url: string): Promise<amqplib.Channel> {
  const conn = await amqplib.connect(url);
  const channel = await conn.createChannel();

  await channel.assertExchange(EXCHANGE_NOTIFY, 'topic', { durable: true });

  await channel.assertQueue(ROUTING_NOTIFY_TEACHER, { durable: true });
  await channel.bindQueue(ROUTING_NOTIFY_TEACHER, EXCHANGE_NOTIFY, ROUTING_NOTIFY_TEACHER);

  return channel;
}
