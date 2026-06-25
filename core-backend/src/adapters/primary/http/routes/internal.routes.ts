import type { FastifyInstance } from 'fastify';
import type { ISubmissionUseCase } from '../../../../core/ports/input/submission-use-case.ts';
import type { SandboxResult } from '@ismart/specs';

// Called by sandbox-service after execution — no JWT, protected by Docker network only
export function internalRoutes(submissions: ISubmissionUseCase) {
  return async function (app: FastifyInstance) {
    app.post('/internal/sandbox-result', async (request, reply) => {
      const { submissionId, result } = request.body as { submissionId: string; result: SandboxResult };
      await submissions.handleSandboxResult(submissionId, result);
      return reply.send({ ok: true });
    });
  };
}
