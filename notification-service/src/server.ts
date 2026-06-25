import { createChannel } from './amqp/setup.ts';
import { startConsumer } from './amqp/consumer.ts';
import { Mailer } from './mailer.ts';

const RABBITMQ_URL = process.env.RABBITMQ_URL ?? 'amqp://localhost:5672';
const SMTP_HOST = process.env.SMTP_HOST ?? 'localhost';
const SMTP_PORT = parseInt(process.env.SMTP_PORT ?? '587', 10);
const SMTP_USER = process.env.SMTP_USER ?? '';
const SMTP_PASS = process.env.SMTP_PASS ?? '';

async function main() {
  console.log('[notification-service] connecting to RabbitMQ...');
  const channel = await createChannel(RABBITMQ_URL);
  console.log('[notification-service] connected');

  const mailer = new Mailer({ host: SMTP_HOST, port: SMTP_PORT, user: SMTP_USER, pass: SMTP_PASS });

  await startConsumer(channel, async (event) => {
    console.log(`[notification-service] notifying ${event.teacherEmail} — student ${event.studentName}, task "${event.taskTitle}", status: ${event.status}`);
    await mailer.sendTeacherNotification(event);
    console.log(`[notification-service] email sent to ${event.teacherEmail}`);
  });

  console.log('[notification-service] listening on notify.teacher');
}

main().catch((err) => {
  console.error('[notification-service] fatal:', err);
  process.exit(1);
});
