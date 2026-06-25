import type { FastifyInstance } from 'fastify';
import type { IStatsUseCase } from '../../../../core/ports/input/stats-use-case.ts';
import { requireTeacher } from '../auth-hook.ts';

export function statsRoutes(stats: IStatsUseCase) {
  return async function (app: FastifyInstance) {
    app.get('/students/:studentId/stats', { preHandler: requireTeacher }, async (request, reply) => {
      const { studentId } = request.params as { studentId: string };
      return reply.send(await stats.getStudentStats(studentId, request.user.sub));
    });
  };
}
