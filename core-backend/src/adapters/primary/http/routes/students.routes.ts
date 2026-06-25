import type { FastifyInstance } from 'fastify';
import type { IAuthUseCase } from '../../../../core/ports/input/auth-use-case.ts';
import { requireTeacher } from '../auth-hook.ts';

export function studentsRoutes(auth: IAuthUseCase) {
  return async function (app: FastifyInstance) {
    app.get('/students', { preHandler: requireTeacher }, async (request, reply) => {
      const students = await auth.getStudents(request.user.sub);
      return reply.send(students);
    });
  };
}
