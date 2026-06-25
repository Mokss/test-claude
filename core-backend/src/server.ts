import { MongoClient } from 'mongodb';
import { buildApp } from './app.ts';
import { MongoUserRepository } from './adapters/secondary/mongo/user.repository.ts';
import { MongoTaskRepository } from './adapters/secondary/mongo/task.repository.ts';
import { MongoSubmissionRepository } from './adapters/secondary/mongo/submission.repository.ts';
import { ensureIndexes } from './adapters/secondary/mongo/indexes.ts';
import { createChannel } from './adapters/secondary/amqp/setup.ts';
import { AmqpEventBus } from './adapters/secondary/amqp/event-bus.ts';
import { startSandboxResultConsumer } from './adapters/secondary/amqp/consumer.ts';
import { AuthService } from './core/services/auth.service.ts';
import { TaskService } from './core/services/task.service.ts';
import { SubmissionService } from './core/services/submission.service.ts';
import { StatsService } from './core/services/stats.service.ts';

const MONGO_URL = process.env.MONGO_URL ?? 'mongodb://mongo:27017/ismart';
const RABBITMQ_URL = process.env.RABBITMQ_URL ?? 'amqp://guest:guest@rabbitmq:5672';
const JWT_SECRET = process.env.JWT_SECRET ?? 'change-me-in-production';
const PORT = Number(process.env.PORT ?? 3000);

// --- Infrastructure ---
const mongoClient = await MongoClient.connect(MONGO_URL);
const db = mongoClient.db();
await ensureIndexes(db);

const channel = await createChannel(RABBITMQ_URL);

// --- Repositories & Bus ---
const users = new MongoUserRepository(db);
const tasks = new MongoTaskRepository(db);
const submissions = new MongoSubmissionRepository(db);
const bus = new AmqpEventBus(channel);

// --- Sign function: deferred reference resolved after app.ready() ---
let resolveSign!: (sign: (payload: object) => Promise<string>) => void;
const signReady = new Promise<(payload: object) => Promise<string>>(r => { resolveSign = r; });
const sign = (payload: object) => signReady.then(fn => fn(payload));

// --- Services ---
const auth = new AuthService(users, sign);
const taskSvc = new TaskService(tasks, users);
const submissionSvc = new SubmissionService(submissions, tasks, users, bus);
const statsSvc = new StatsService(submissions, tasks);

// --- App ---
const app = await buildApp(
  { auth, tasks: taskSvc, submissions: submissionSvc, stats: statsSvc },
  JWT_SECRET,
);

await app.ready();

// Resolve sign now that JWT plugin is ready
resolveSign((payload) => Promise.resolve(app.jwt.sign(payload as { sub: string; role: 'teacher' | 'student'; teacherId?: string })));

// --- Consumer ---
await startSandboxResultConsumer(channel, submissionSvc);

// --- Listen ---
await app.listen({ port: PORT, host: '0.0.0.0' });
