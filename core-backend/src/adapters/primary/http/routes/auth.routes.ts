import type { FastifyInstance } from 'fastify';
import type { IAuthUseCase } from '../../../../core/ports/input/auth-use-case.ts';

export function authRoutes(auth: IAuthUseCase) {
  return async function (app: FastifyInstance) {
    app.post('/register', async (request, reply) => {
      const body = request.body as Parameters<IAuthUseCase['register']>[0];
      const result = await auth.register(body);
      return reply.code(201).send(result);
    });

    app.post('/login', async (request, reply) => {
      const body = request.body as Parameters<IAuthUseCase['login']>[0];
      const result = await auth.login(body);
      return reply.send(result);
    });
  };
}
