import type { FastifyInstance } from 'fastify';

const HTTP_STATUS: Record<string, number> = {
  EMAIL_TAKEN: 400,
  TEACHER_ID_REQUIRED: 400,
  INVALID_SCORE: 400,
  INVALID_CREDENTIALS: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  NOT_READY: 409,
};

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((err: Error, _req, reply) => {
    const code = err.message;
    const status = HTTP_STATUS[code] ?? 500;
    reply.code(status).send({ error: code });
  });
}
