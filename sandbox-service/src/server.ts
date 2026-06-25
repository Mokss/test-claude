import { createChannel } from './amqp/setup.ts';
import { startConsumer } from './amqp/consumer.ts';
import { AmqpPublisher } from './amqp/publisher.ts';
import { runCode, ensureImages } from './runner.ts';

const RABBITMQ_URL = process.env.RABBITMQ_URL ?? 'amqp://localhost:5672';

async function main() {
  console.log('[sandbox-service] ensuring runtime images...');
  await ensureImages();

  console.log('[sandbox-service] connecting to RabbitMQ...');
  const channel = await createChannel(RABBITMQ_URL);
  console.log('[sandbox-service] connected');

  const publisher = new AmqpPublisher(channel);

  await startConsumer(channel, async (event) => {
    console.log(`[sandbox-service] running submission ${event.submissionId} (${event.language})`);

    const result = await runCode(event);

    console.log(`[sandbox-service] done ${event.submissionId}: ${result.status} (${result.passedCount}/${result.totalCount})`);

    publisher.publishResult({ submissionId: event.submissionId, result });
  });

  console.log('[sandbox-service] listening on sandbox.run');
}

main().catch((err) => {
  console.error('[sandbox-service] fatal:', err);
  process.exit(1);
});
