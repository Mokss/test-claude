import type { FastifyInstance } from 'fastify';
import type { ISubmissionUseCase } from '../../../../core/ports/input/submission-use-case.ts';
import { requireAuth, requireTeacher, requireStudent } from '../auth-hook.ts';

export function submissionRoutes(submissions: ISubmissionUseCase) {
  return async function (app: FastifyInstance) {
    // POST /api/tasks/:taskId/submissions
    app.post('/tasks/:taskId/submissions', { preHandler: requireStudent }, async (request, reply) => {
      const { taskId } = request.params as { taskId: string };
      const { code, language } = request.body as { code: string; language: 'python' | 'javascript' };
      const sub = await submissions.submit({ taskId, studentId: request.user.sub, code, language });
      return reply.code(201).send(sub);
    });

    // GET /api/tasks/:taskId/submissions
    app.get('/tasks/:taskId/submissions', { preHandler: requireAuth }, async (request, reply) => {
      const { taskId } = request.params as { taskId: string };
      const { sub, role } = request.user;
      return reply.send(await submissions.listByTask(taskId, sub, role));
    });

    // GET /api/submissions/:id
    app.get('/submissions/:id', { preHandler: requireAuth }, async (request, reply) => {
      const { id } = request.params as { id: string };
      const { sub, role } = request.user;
      return reply.send(await submissions.getById(id, sub, role));
    });

    // GET /api/students/:studentId/submissions
    app.get('/students/:studentId/submissions', { preHandler: requireTeacher }, async (request, reply) => {
      const { studentId } = request.params as { studentId: string };
      return reply.send(await submissions.listByStudent(studentId, request.user.sub));
    });

    // PATCH /api/submissions/:id/grade
    app.patch('/submissions/:id/grade', { preHandler: requireTeacher }, async (request, reply) => {
      const { id } = request.params as { id: string };
      const { score, comment } = request.body as { score: number; comment?: string };
      const result = await submissions.grade({
        submissionId: id,
        teacherId: request.user.sub,
        score,
        comment,
      });
      return reply.send(result);
    });
  };
}
