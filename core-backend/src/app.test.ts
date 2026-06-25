import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { FastifyInstance } from 'fastify';
import { buildApp } from './app.ts';
import type { IAuthUseCase, AuthResult } from './core/ports/input/auth-use-case.ts';
import type { ITaskUseCase } from './core/ports/input/task-use-case.ts';
import type { ISubmissionUseCase } from './core/ports/input/submission-use-case.ts';
import type { IStatsUseCase } from './core/ports/input/stats-use-case.ts';
import type { Task } from './core/domain/task.ts';
import type { Submission } from './core/domain/submission.ts';
import type { StudentStats } from './core/domain/stats.ts';

// --- Mock services ---

const JWT_SECRET = 'test-secret';

const MOCK_AUTH_RESULT: AuthResult = {
  token: 'will-be-replaced',
  user: { _id: 'u1', email: 'a@b.com', role: 'teacher', name: 'Test' },
};

const MOCK_TASK: Task = {
  _id: 't1', title: 'Task', description: 'Desc', authorId: 'u1',
  language: 'python', testCases: [], timeLimitMs: 5000, memoryLimitMb: 128,
  status: 'published', starterCode: '', createdAt: new Date(), updatedAt: new Date(),
};

const MOCK_SUBMISSION: Submission = {
  _id: 's1', taskId: 't1', studentId: 'u2', code: 'x', language: 'python',
  status: 'pending', submittedAt: new Date(),
};

const MOCK_STATS: StudentStats = {
  studentId: 'u2', totalSubmissions: 1, passedCount: 1, failedCount: 0, taskStats: [],
};

function makeMockAuth(): IAuthUseCase {
  return {
    async register() { return MOCK_AUTH_RESULT; },
    async login() { return MOCK_AUTH_RESULT; },
  };
}

function makeMockTasks(): ITaskUseCase {
  return {
    async listForTeacher() { return [MOCK_TASK]; },
    async listForStudent() { return [MOCK_TASK]; },
    async getById() { return MOCK_TASK; },
    async create() { return MOCK_TASK; },
    async update() { return MOCK_TASK; },
    async delete() { },
  };
}

function makeMockSubmissions(): ISubmissionUseCase {
  return {
    async submit() { return MOCK_SUBMISSION; },
    async getById() { return MOCK_SUBMISSION; },
    async listByTask() { return [MOCK_SUBMISSION]; },
    async listByStudent() { return [MOCK_SUBMISSION]; },
    async grade() { return MOCK_SUBMISSION; },
    async handleSandboxResult() { },
  };
}

function makeMockStats(): IStatsUseCase {
  return {
    async getStudentStats() { return MOCK_STATS; },
  };
}

// --- Helpers ---

function makeServices() {
  return {
    auth: makeMockAuth(),
    tasks: makeMockTasks(),
    submissions: makeMockSubmissions(),
    stats: makeMockStats(),
  };
}

async function setup() {
  const app = await buildApp(makeServices(), JWT_SECRET);
  await app.ready();
  return app;
}

function teacherToken(app: FastifyInstance, id = 'u1') {
  return app.jwt.sign({ sub: id, role: 'teacher' });
}

function studentToken(app: FastifyInstance, id = 'u2', teacherId = 'u1') {
  return app.jwt.sign({ sub: id, role: 'student', teacherId });
}

function authHeader(token: string) {
  return { authorization: `Bearer ${token}` };
}

// --- Tests ---

describe('HTTP routes', () => {
  describe('POST /api/auth/register', () => {
    it('возвращает 201 и токен', async () => {
      const app = await setup();
      after(() => app.close());

      const res = await app.inject({
        method: 'POST', url: '/api/auth/register',
        payload: { email: 'a@b.com', password: '123', name: 'X', role: 'teacher' },
      });

      assert.equal(res.statusCode, 201);
      assert.ok(res.json().user);
    });

    it('маппит EMAIL_TAKEN → 400', async () => {
      const auth = makeMockAuth();
      auth.register = async () => { throw new Error('EMAIL_TAKEN'); };
      const app = await buildApp({ ...makeServices(), auth }, JWT_SECRET);
      await app.ready();
      after(() => app.close());

      const res = await app.inject({
        method: 'POST', url: '/api/auth/register',
        payload: { email: 'a@b.com', password: '123', name: 'X', role: 'teacher' },
      });

      assert.equal(res.statusCode, 400);
      assert.equal(res.json().error, 'EMAIL_TAKEN');
    });
  });

  describe('POST /api/auth/login', () => {
    it('возвращает 200 и токен', async () => {
      const app = await setup();
      after(() => app.close());

      const res = await app.inject({
        method: 'POST', url: '/api/auth/login',
        payload: { email: 'a@b.com', password: '123' },
      });

      assert.equal(res.statusCode, 200);
      assert.ok(res.json().token);
    });

    it('маппит INVALID_CREDENTIALS → 401', async () => {
      const auth = makeMockAuth();
      auth.login = async () => { throw new Error('INVALID_CREDENTIALS'); };
      const app = await buildApp({ ...makeServices(), auth }, JWT_SECRET);
      await app.ready();
      after(() => app.close());

      const res = await app.inject({
        method: 'POST', url: '/api/auth/login',
        payload: { email: 'a@b.com', password: 'wrong' },
      });

      assert.equal(res.statusCode, 401);
    });
  });

  describe('GET /api/tasks', () => {
    it('возвращает 401 без токена', async () => {
      const app = await setup();
      after(() => app.close());

      const res = await app.inject({ method: 'GET', url: '/api/tasks' });
      assert.equal(res.statusCode, 401);
    });

    it('учитель получает список задач', async () => {
      const app = await setup();
      after(() => app.close());

      const res = await app.inject({
        method: 'GET', url: '/api/tasks',
        headers: authHeader(teacherToken(app)),
      });

      assert.equal(res.statusCode, 200);
      assert.equal(res.json().length, 1);
    });

    it('студент получает список задач', async () => {
      const app = await setup();
      after(() => app.close());

      const res = await app.inject({
        method: 'GET', url: '/api/tasks',
        headers: authHeader(studentToken(app)),
      });

      assert.equal(res.statusCode, 200);
    });
  });

  describe('POST /api/tasks', () => {
    it('учитель создаёт задачу → 201', async () => {
      const app = await setup();
      after(() => app.close());

      const res = await app.inject({
        method: 'POST', url: '/api/tasks',
        headers: authHeader(teacherToken(app)),
        payload: { title: 'T', description: 'D', language: 'python' },
      });

      assert.equal(res.statusCode, 201);
    });

    it('студент не может создать задачу → 403', async () => {
      const app = await setup();
      after(() => app.close());

      const res = await app.inject({
        method: 'POST', url: '/api/tasks',
        headers: authHeader(studentToken(app)),
        payload: { title: 'T', description: 'D', language: 'python' },
      });

      assert.equal(res.statusCode, 403);
    });
  });

  describe('PATCH /api/tasks/:id', () => {
    it('маппит NOT_FOUND → 404', async () => {
      const tasks = makeMockTasks();
      tasks.update = async () => { throw new Error('NOT_FOUND'); };
      const app = await buildApp({ ...makeServices(), tasks }, JWT_SECRET);
      await app.ready();
      after(() => app.close());

      const res = await app.inject({
        method: 'PATCH', url: '/api/tasks/t1',
        headers: authHeader(teacherToken(app)),
        payload: { title: 'New' },
      });

      assert.equal(res.statusCode, 404);
    });

    it('маппит FORBIDDEN → 403', async () => {
      const tasks = makeMockTasks();
      tasks.update = async () => { throw new Error('FORBIDDEN'); };
      const app = await buildApp({ ...makeServices(), tasks }, JWT_SECRET);
      await app.ready();
      after(() => app.close());

      const res = await app.inject({
        method: 'PATCH', url: '/api/tasks/t1',
        headers: authHeader(teacherToken(app)),
        payload: { title: 'New' },
      });

      assert.equal(res.statusCode, 403);
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    it('учитель удаляет задачу → 204', async () => {
      const app = await setup();
      after(() => app.close());

      const res = await app.inject({
        method: 'DELETE', url: '/api/tasks/t1',
        headers: authHeader(teacherToken(app)),
      });

      assert.equal(res.statusCode, 204);
    });
  });

  describe('POST /api/tasks/:taskId/submissions', () => {
    it('студент отправляет решение → 201', async () => {
      const app = await setup();
      after(() => app.close());

      const res = await app.inject({
        method: 'POST', url: '/api/tasks/t1/submissions',
        headers: authHeader(studentToken(app)),
        payload: { code: 'print(1)', language: 'python' },
      });

      assert.equal(res.statusCode, 201);
      assert.equal(res.json().status, 'pending');
    });

    it('учитель не может отправить решение → 403', async () => {
      const app = await setup();
      after(() => app.close());

      const res = await app.inject({
        method: 'POST', url: '/api/tasks/t1/submissions',
        headers: authHeader(teacherToken(app)),
        payload: { code: 'print(1)', language: 'python' },
      });

      assert.equal(res.statusCode, 403);
    });
  });

  describe('PATCH /api/submissions/:id/grade', () => {
    it('учитель выставляет оценку → 200', async () => {
      const app = await setup();
      after(() => app.close());

      const res = await app.inject({
        method: 'PATCH', url: '/api/submissions/s1/grade',
        headers: authHeader(teacherToken(app)),
        payload: { score: 90, comment: 'Хорошо' },
      });

      assert.equal(res.statusCode, 200);
    });

    it('маппит INVALID_SCORE → 400', async () => {
      const submissions = makeMockSubmissions();
      submissions.grade = async () => { throw new Error('INVALID_SCORE'); };
      const app = await buildApp({ ...makeServices(), submissions }, JWT_SECRET);
      await app.ready();
      after(() => app.close());

      const res = await app.inject({
        method: 'PATCH', url: '/api/submissions/s1/grade',
        headers: authHeader(teacherToken(app)),
        payload: { score: 150 },
      });

      assert.equal(res.statusCode, 400);
    });

    it('маппит NOT_READY → 409', async () => {
      const submissions = makeMockSubmissions();
      submissions.grade = async () => { throw new Error('NOT_READY'); };
      const app = await buildApp({ ...makeServices(), submissions }, JWT_SECRET);
      await app.ready();
      after(() => app.close());

      const res = await app.inject({
        method: 'PATCH', url: '/api/submissions/s1/grade',
        headers: authHeader(teacherToken(app)),
        payload: { score: 80 },
      });

      assert.equal(res.statusCode, 409);
    });
  });

  describe('GET /api/students/:studentId/stats', () => {
    it('учитель получает статистику → 200', async () => {
      const app = await setup();
      after(() => app.close());

      const res = await app.inject({
        method: 'GET', url: '/api/students/u2/stats',
        headers: authHeader(teacherToken(app)),
      });

      assert.equal(res.statusCode, 200);
      assert.equal(res.json().studentId, 'u2');
    });

    it('студент не может смотреть статистику → 403', async () => {
      const app = await setup();
      after(() => app.close());

      const res = await app.inject({
        method: 'GET', url: '/api/students/u2/stats',
        headers: authHeader(studentToken(app)),
      });

      assert.equal(res.statusCode, 403);
    });
  });

  describe('POST /api/internal/sandbox-result', () => {
    it('принимает результат без JWT → 200', async () => {
      const app = await setup();
      after(() => app.close());

      const res = await app.inject({
        method: 'POST', url: '/api/internal/sandbox-result',
        payload: {
          submissionId: 's1',
          result: {
            status: 'passed', stdout: '', stderr: '', durationMs: 100,
            testResults: [], passedCount: 1, totalCount: 1,
          },
        },
      });

      assert.equal(res.statusCode, 200);
    });
  });
});
