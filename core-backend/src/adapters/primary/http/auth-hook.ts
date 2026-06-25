import type { FastifyRequest, FastifyReply } from 'fastify';

// Augment @fastify/jwt to type request.user
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string; role: 'teacher' | 'student'; teacherId?: string };
    user: { sub: string; role: 'teacher' | 'student'; teacherId?: string };
  }
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    await request.jwtVerify();
  } catch {
    reply.code(401).send({ error: 'UNAUTHORIZED' });
  }
}

export async function requireTeacher(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  await requireAuth(request, reply);
  if (request.user?.role !== 'teacher') {
    reply.code(403).send({ error: 'FORBIDDEN' });
  }
}

export async function requireStudent(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  await requireAuth(request, reply);
  if (request.user?.role !== 'student') {
    reply.code(403).send({ error: 'FORBIDDEN' });
  }
}
