import type { FastifyInstance } from 'fastify';
import type { ITaskUseCase } from '../../../../core/ports/input/task-use-case.ts';
import { requireAuth, requireTeacher } from '../auth-hook.ts';

export function taskRoutes(tasks: ITaskUseCase) {
  return async function (app: FastifyInstance) {
    // GET /api/tasks — teacher sees all own tasks, student sees published tasks of their teacher
    app.get('/tasks', { preHandler: requireAuth }, async (request, reply) => {
      const { sub, role, teacherId } = request.user;
      if (role === 'teacher') {
        return reply.send(await tasks.listForTeacher(sub));
      }
      return reply.send(await tasks.listForStudent(teacherId!, sub));
    });

    // POST /api/tasks
    app.post('/tasks', { preHandler: requireTeacher }, async (request, reply) => {
      const body = request.body as Parameters<ITaskUseCase['create']>[0];
      const task = await tasks.create({ ...body, authorId: request.user.sub });
      return reply.code(201).send(task);
    });

    // GET /api/tasks/:id
    app.get('/tasks/:id', { preHandler: requireAuth }, async (request, reply) => {
      const { id } = request.params as { id: string };
      const { sub, role } = request.user;
      return reply.send(await tasks.getById(id, sub, role));
    });

    // PATCH /api/tasks/:id
    app.patch('/tasks/:id', { preHandler: requireTeacher }, async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as Parameters<ITaskUseCase['update']>[2];
      return reply.send(await tasks.update(id, request.user.sub, body));
    });

    // DELETE /api/tasks/:id
    app.delete('/tasks/:id', { preHandler: requireTeacher }, async (request, reply) => {
      const { id } = request.params as { id: string };
      await tasks.delete(id, request.user.sub);
      return reply.code(204).send();
    });
  };
}
