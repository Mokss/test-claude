import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import type { IAuthUseCase } from './core/ports/input/auth-use-case.ts';
import type { ITaskUseCase } from './core/ports/input/task-use-case.ts';
import type { ISubmissionUseCase } from './core/ports/input/submission-use-case.ts';
import type { IStatsUseCase } from './core/ports/input/stats-use-case.ts';
import { registerErrorHandler } from './adapters/primary/http/errors.ts';
import { authRoutes } from './adapters/primary/http/routes/auth.routes.ts';
import { taskRoutes } from './adapters/primary/http/routes/task.routes.ts';
import { submissionRoutes } from './adapters/primary/http/routes/submission.routes.ts';
import { statsRoutes } from './adapters/primary/http/routes/stats.routes.ts';
import { internalRoutes } from './adapters/primary/http/routes/internal.routes.ts';

export interface AppServices {
  auth: IAuthUseCase;
  tasks: ITaskUseCase;
  submissions: ISubmissionUseCase;
  stats: IStatsUseCase;
}

export async function buildApp(services: AppServices, jwtSecret: string) {
  const app = Fastify({ logger: true });

  await app.register(fastifyJwt, { secret: jwtSecret });

  registerErrorHandler(app);

  app.register(authRoutes(services.auth), { prefix: '/api/auth' });
  app.register(taskRoutes(services.tasks), { prefix: '/api' });
  app.register(submissionRoutes(services.submissions), { prefix: '/api' });
  app.register(statsRoutes(services.stats), { prefix: '/api' });
  app.register(internalRoutes(services.submissions), { prefix: '/api' });

  return app;
}
