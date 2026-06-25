import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SubmissionService } from './submission.service.ts';
import type { ISubmissionRepository } from '../ports/output/submission-repository.ts';
import type { ITaskRepository } from '../ports/output/task-repository.ts';
import type { IUserRepository } from '../ports/output/user-repository.ts';
import type { IEventBus, SandboxRunEvent, NotifyTeacherEvent } from '../ports/output/event-bus.ts';
import type { Submission, SandboxResult, Grade } from '../domain/submission.ts';
import type { Task } from '../domain/task.ts';
import type { User } from '../domain/user.ts';

// --- In-memory repos ---

function makeSubmissionRepo(initial: Submission[] = []): ISubmissionRepository {
  const store: Submission[] = [...initial];
  let seq = 0;

  return {
    async findById(id) { return store.find(s => s._id === id) ?? null; },
    async findByTask(taskId) { return store.filter(s => s.taskId === taskId); },
    async findByStudent(studentId) { return store.filter(s => s.studentId === studentId); },
    async findByTaskAndStudent(taskId, studentId) {
      return store.filter(s => s.taskId === taskId && s.studentId === studentId);
    },
    async create(data) {
      const sub: Submission = { ...data, _id: String(++seq), submittedAt: new Date() };
      store.push(sub);
      return sub;
    },
    async updateStatus(id, status, sandboxResult) {
      const idx = store.findIndex(s => s._id === id);
      if (idx === -1) return null;
      store[idx] = { ...store[idx], status, sandboxResult };
      return store[idx];
    },
    async updateGrade(id, grade) {
      const idx = store.findIndex(s => s._id === id);
      if (idx === -1) return null;
      store[idx] = { ...store[idx], grade };
      return store[idx];
    },
  };
}

function makeTaskRepo(initial: Task[] = []): ITaskRepository {
  const store: Task[] = [...initial];
  return {
    async findById(id) { return store.find(t => t._id === id) ?? null; },
    async findByAuthor(authorId) { return store.filter(t => t.authorId === authorId); },
    async findPublishedByTeacher(teacherId) { return store.filter(t => t.authorId === teacherId && t.status === 'published'); },
    async create(data) { return { ...data, _id: '0', createdAt: new Date(), updatedAt: new Date() }; },
    async update(id, data) { return null; },
    async delete(id) { return false; },
  };
}

function makeUserRepo(initial: User[] = []): IUserRepository {
  const store: User[] = [...initial];
  return {
    async findById(id) { return store.find(u => u._id === id) ?? null; },
    async findByEmail(email) { return store.find(u => u.email === email) ?? null; },
    async findStudentsByTeacher(teacherId) { return store.filter(u => u.teacherId === teacherId); },
    async create(data) { return { ...data, _id: '0', createdAt: new Date() }; },
  };
}

function makeEventBus(): IEventBus & { sandboxEvents: SandboxRunEvent[]; notifyEvents: NotifyTeacherEvent[] } {
  const sandboxEvents: SandboxRunEvent[] = [];
  const notifyEvents: NotifyTeacherEvent[] = [];
  return {
    sandboxEvents,
    notifyEvents,
    async publishSandboxRun(event) { sandboxEvents.push(event); },
    async publishNotifyTeacher(event) { notifyEvents.push(event); },
  };
}

// --- Fixtures ---

const TEACHER: User = { _id: 't1', email: 'teacher@t.com', passwordHash: 'x', role: 'teacher', name: 'Мария', createdAt: new Date() };
const STUDENT: User = { _id: 's1', email: 'student@t.com', passwordHash: 'x', role: 'student', name: 'Иван', teacherId: 't1', createdAt: new Date() };
const OTHER_STUDENT: User = { _id: 's2', email: 'other@t.com', passwordHash: 'x', role: 'student', name: 'Пётр', teacherId: 't1', createdAt: new Date() };

const TASK: Task = {
  _id: 'task1', title: 'Сортировка', description: 'Отсортируй', authorId: 't1',
  language: 'python', testCases: [{ input: '3 1 2', expectedOutput: '1 2 3', isHidden: false }],
  timeLimitMs: 5000, memoryLimitMb: 128, status: 'published',
  starterCode: '', createdAt: new Date(), updatedAt: new Date(),
};

const SANDBOX_PASSED: SandboxResult = {
  status: 'passed', stdout: '1 2 3', stderr: '', durationMs: 100,
  testResults: [{ passed: true, input: '3 1 2', expectedOutput: '1 2 3', actualOutput: '1 2 3', durationMs: 100 }],
  passedCount: 1, totalCount: 1,
};

const SANDBOX_FAILED: SandboxResult = {
  status: 'failed', stdout: '3 2 1', stderr: '', durationMs: 80,
  testResults: [{ passed: false, input: '3 1 2', expectedOutput: '1 2 3', actualOutput: '3 2 1', durationMs: 80 }],
  passedCount: 0, totalCount: 1,
};

// --- Tests ---

describe('SubmissionService', () => {
  describe('submit', () => {
    it('создаёт submission со статусом pending', async () => {
      const bus = makeEventBus();
      const service = new SubmissionService(makeSubmissionRepo(), makeTaskRepo([TASK]), makeUserRepo([TEACHER, STUDENT]), bus);

      const sub = await service.submit({ taskId: 'task1', studentId: 's1', code: 'print(1)', language: 'python' });

      assert.equal(sub.status, 'pending');
      assert.equal(sub.taskId, 'task1');
      assert.equal(sub.studentId, 's1');
    });

    it('публикует SandboxRunEvent в шину', async () => {
      const bus = makeEventBus();
      const service = new SubmissionService(makeSubmissionRepo(), makeTaskRepo([TASK]), makeUserRepo([TEACHER, STUDENT]), bus);

      const sub = await service.submit({ taskId: 'task1', studentId: 's1', code: 'print(1)', language: 'python' });

      assert.equal(bus.sandboxEvents.length, 1);
      assert.equal(bus.sandboxEvents[0].submissionId, sub._id);
      assert.equal(bus.sandboxEvents[0].language, 'python');
      assert.equal(bus.sandboxEvents[0].timeLimitMs, TASK.timeLimitMs);
    });

    it('бросает NOT_FOUND если задача не существует', async () => {
      const service = new SubmissionService(makeSubmissionRepo(), makeTaskRepo(), makeUserRepo([STUDENT]), makeEventBus());
      await assert.rejects(
        () => service.submit({ taskId: 'none', studentId: 's1', code: '', language: 'python' }),
        { message: 'NOT_FOUND' },
      );
    });

    it('бросает FORBIDDEN если задача не опубликована', async () => {
      const draftTask = { ...TASK, status: 'draft' as const };
      const service = new SubmissionService(makeSubmissionRepo(), makeTaskRepo([draftTask]), makeUserRepo([STUDENT]), makeEventBus());
      await assert.rejects(
        () => service.submit({ taskId: 'task1', studentId: 's1', code: '', language: 'python' }),
        { message: 'FORBIDDEN' },
      );
    });
  });

  describe('handleSandboxResult', () => {
    it('обновляет статус submission на passed', async () => {
      const subRepo = makeSubmissionRepo();
      const bus = makeEventBus();
      const service = new SubmissionService(subRepo, makeTaskRepo([TASK]), makeUserRepo([TEACHER, STUDENT]), bus);
      const sub = await service.submit({ taskId: 'task1', studentId: 's1', code: 'x', language: 'python' });

      await service.handleSandboxResult(sub._id, SANDBOX_PASSED);

      const updated = await subRepo.findById(sub._id);
      assert.equal(updated!.status, 'passed');
      assert.deepEqual(updated!.sandboxResult, SANDBOX_PASSED);
    });

    it('публикует NotifyTeacherEvent после обработки результата', async () => {
      const bus = makeEventBus();
      const service = new SubmissionService(makeSubmissionRepo(), makeTaskRepo([TASK]), makeUserRepo([TEACHER, STUDENT]), bus);
      const sub = await service.submit({ taskId: 'task1', studentId: 's1', code: 'x', language: 'python' });

      await service.handleSandboxResult(sub._id, SANDBOX_PASSED);

      assert.equal(bus.notifyEvents.length, 1);
      assert.equal(bus.notifyEvents[0].teacherId, 't1');
      assert.equal(bus.notifyEvents[0].studentName, STUDENT.name);
      assert.equal(bus.notifyEvents[0].status, 'passed');
    });

    it('бросает NOT_FOUND если submission не существует', async () => {
      const service = new SubmissionService(makeSubmissionRepo(), makeTaskRepo([TASK]), makeUserRepo([TEACHER, STUDENT]), makeEventBus());
      await assert.rejects(
        () => service.handleSandboxResult('none', SANDBOX_PASSED),
        { message: 'NOT_FOUND' },
      );
    });
  });

  describe('getById', () => {
    it('ученик видит своё решение', async () => {
      const subRepo = makeSubmissionRepo();
      const bus = makeEventBus();
      const service = new SubmissionService(subRepo, makeTaskRepo([TASK]), makeUserRepo([TEACHER, STUDENT]), bus);
      const sub = await service.submit({ taskId: 'task1', studentId: 's1', code: 'x', language: 'python' });

      const result = await service.getById(sub._id, 's1', 'student');
      assert.equal(result._id, sub._id);
    });

    it('ученик не видит чужое решение', async () => {
      const subRepo = makeSubmissionRepo();
      const service = new SubmissionService(subRepo, makeTaskRepo([TASK]), makeUserRepo([TEACHER, STUDENT, OTHER_STUDENT]), makeEventBus());
      const sub = await service.submit({ taskId: 'task1', studentId: 's1', code: 'x', language: 'python' });

      await assert.rejects(() => service.getById(sub._id, 's2', 'student'), { message: 'FORBIDDEN' });
    });

    it('учитель видит любое решение своего ученика', async () => {
      const subRepo = makeSubmissionRepo();
      const service = new SubmissionService(subRepo, makeTaskRepo([TASK]), makeUserRepo([TEACHER, STUDENT]), makeEventBus());
      const sub = await service.submit({ taskId: 'task1', studentId: 's1', code: 'x', language: 'python' });

      const result = await service.getById(sub._id, 't1', 'teacher');
      assert.equal(result._id, sub._id);
    });
  });

  describe('grade', () => {
    it('учитель выставляет оценку и комментарий', async () => {
      const subRepo = makeSubmissionRepo();
      const service = new SubmissionService(subRepo, makeTaskRepo([TASK]), makeUserRepo([TEACHER, STUDENT]), makeEventBus());
      const sub = await service.submit({ taskId: 'task1', studentId: 's1', code: 'x', language: 'python' });
      await service.handleSandboxResult(sub._id, SANDBOX_PASSED);

      const graded = await service.grade({ submissionId: sub._id, teacherId: 't1', score: 90, comment: 'Отлично!' });

      assert.equal(graded.grade!.score, 90);
      assert.equal(graded.grade!.comment, 'Отлично!');
      assert.equal(graded.grade!.gradedBy, 't1');
    });

    it('нельзя оценить submission который ещё pending', async () => {
      const subRepo = makeSubmissionRepo();
      const service = new SubmissionService(subRepo, makeTaskRepo([TASK]), makeUserRepo([TEACHER, STUDENT]), makeEventBus());
      const sub = await service.submit({ taskId: 'task1', studentId: 's1', code: 'x', language: 'python' });

      await assert.rejects(
        () => service.grade({ submissionId: sub._id, teacherId: 't1', score: 80 }),
        { message: 'NOT_READY' },
      );
    });

    it('score должен быть от 0 до 100', async () => {
      const subRepo = makeSubmissionRepo();
      const service = new SubmissionService(subRepo, makeTaskRepo([TASK]), makeUserRepo([TEACHER, STUDENT]), makeEventBus());
      const sub = await service.submit({ taskId: 'task1', studentId: 's1', code: 'x', language: 'python' });
      await service.handleSandboxResult(sub._id, SANDBOX_PASSED);

      await assert.rejects(
        () => service.grade({ submissionId: sub._id, teacherId: 't1', score: 150 }),
        { message: 'INVALID_SCORE' },
      );
    });
  });

  describe('listByTask', () => {
    it('ученик видит только свои решения по задаче', async () => {
      const subRepo = makeSubmissionRepo();
      const service = new SubmissionService(subRepo, makeTaskRepo([TASK]), makeUserRepo([TEACHER, STUDENT, OTHER_STUDENT]), makeEventBus());
      await service.submit({ taskId: 'task1', studentId: 's1', code: 'x', language: 'python' });
      await service.submit({ taskId: 'task1', studentId: 's2', code: 'y', language: 'python' });

      const result = await service.listByTask('task1', 's1', 'student');
      assert.equal(result.length, 1);
      assert.equal(result[0].studentId, 's1');
    });

    it('учитель видит все решения по задаче', async () => {
      const subRepo = makeSubmissionRepo();
      const service = new SubmissionService(subRepo, makeTaskRepo([TASK]), makeUserRepo([TEACHER, STUDENT, OTHER_STUDENT]), makeEventBus());
      await service.submit({ taskId: 'task1', studentId: 's1', code: 'x', language: 'python' });
      await service.submit({ taskId: 'task1', studentId: 's2', code: 'y', language: 'python' });

      const result = await service.listByTask('task1', 't1', 'teacher');
      assert.equal(result.length, 2);
    });
  });
});
