import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { StatsService } from './stats.service.ts';
import type { ISubmissionRepository } from '../ports/output/submission-repository.ts';
import type { ITaskRepository } from '../ports/output/task-repository.ts';
import type { Submission, SandboxResult, Task } from '@ismart/specs';

// --- In-memory repos ---

function makeSubmissionRepo(initial: Submission[] = []): ISubmissionRepository {
  const store: Submission[] = [...initial];
  return {
    async findById(id) { return store.find(s => s._id === id) ?? null; },
    async findByTask(taskId) { return store.filter(s => s.taskId === taskId); },
    async findByStudent(studentId) { return store.filter(s => s.studentId === studentId); },
    async findByTaskAndStudent(taskId, studentId) {
      return store.filter(s => s.taskId === taskId && s.studentId === studentId);
    },
    async create(data) { return { ...data, _id: '0', submittedAt: new Date() }; },
    async updateStatus(id, status, sandboxResult) { return null; },
    async updateGrade(id, grade) { return null; },
  };
}

function makeTaskRepo(initial: Task[] = []): ITaskRepository {
  const store: Task[] = [...initial];
  return {
    async findById(id) { return store.find(t => t._id === id) ?? null; },
    async findByAuthor(authorId) { return store.filter(t => t.authorId === authorId); },
    async findPublishedByTeacher(teacherId) {
      return store.filter(t => t.authorId === teacherId && t.status === 'published');
    },
    async create(data) { return { ...data, _id: '0', createdAt: new Date(), updatedAt: new Date() }; },
    async update(id, data) { return null; },
    async delete(id) { return false; },
  };
}

// --- Fixtures ---

const TASK_1: Task = {
  _id: 'task1', title: 'Сортировка', description: '', authorId: 't1',
  language: 'python', testCases: [], timeLimitMs: 5000, memoryLimitMb: 128,
  status: 'published', starterCode: '', createdAt: new Date(), updatedAt: new Date(),
};

const TASK_2: Task = {
  _id: 'task2', title: 'Поиск', description: '', authorId: 't1',
  language: 'javascript', testCases: [], timeLimitMs: 5000, memoryLimitMb: 128,
  status: 'published', starterCode: '', createdAt: new Date(), updatedAt: new Date(),
};

function makeSandboxResult(status: 'passed' | 'failed', durationMs = 100): SandboxResult {
  return {
    status, stdout: '', stderr: '', durationMs,
    testResults: [], passedCount: status === 'passed' ? 1 : 0, totalCount: 1,
  };
}

function makeSub(id: string, taskId: string, studentId: string, overrides: Partial<Submission> = {}): Submission {
  return {
    _id: id, taskId, studentId, code: 'x', language: 'python',
    status: 'pending', submittedAt: new Date(), ...overrides,
  };
}

// --- Tests ---

describe('StatsService', () => {
  describe('getStudentStats', () => {
    it('считает totalSubmissions, passedCount, failedCount', async () => {
      const subs: Submission[] = [
        makeSub('1', 'task1', 's1', { status: 'passed', sandboxResult: makeSandboxResult('passed') }),
        makeSub('2', 'task1', 's1', { status: 'failed', sandboxResult: makeSandboxResult('failed') }),
        makeSub('3', 'task2', 's1', { status: 'passed', sandboxResult: makeSandboxResult('passed') }),
      ];
      const service = new StatsService(makeSubmissionRepo(subs), makeTaskRepo([TASK_1, TASK_2]));

      const stats = await service.getStudentStats('s1', 't1');

      assert.equal(stats.totalSubmissions, 3);
      assert.equal(stats.passedCount, 2);
      assert.equal(stats.failedCount, 1);
    });

    it('возвращает пустую статистику если нет решений', async () => {
      const service = new StatsService(makeSubmissionRepo(), makeTaskRepo([TASK_1]));

      const stats = await service.getStudentStats('s1', 't1');

      assert.equal(stats.totalSubmissions, 0);
      assert.equal(stats.passedCount, 0);
      assert.equal(stats.failedCount, 0);
      assert.equal(stats.taskStats.length, 0);
      assert.equal(stats.averageScore, undefined);
    });

    it('считает averageScore только по оценённым решениям', async () => {
      const subs: Submission[] = [
        makeSub('1', 'task1', 's1', {
          status: 'passed',
          sandboxResult: makeSandboxResult('passed'),
          grade: { score: 80, gradedAt: new Date(), gradedBy: 't1' },
        }),
        makeSub('2', 'task2', 's1', {
          status: 'passed',
          sandboxResult: makeSandboxResult('passed'),
          grade: { score: 100, gradedAt: new Date(), gradedBy: 't1' },
        }),
        makeSub('3', 'task1', 's1', {
          status: 'failed',
          sandboxResult: makeSandboxResult('failed'),
          // нет оценки
        }),
      ];
      const service = new StatsService(makeSubmissionRepo(subs), makeTaskRepo([TASK_1, TASK_2]));

      const stats = await service.getStudentStats('s1', 't1');

      assert.equal(stats.averageScore, 90);
    });

    it('считает averageDurationMs по завершённым решениям', async () => {
      const subs: Submission[] = [
        makeSub('1', 'task1', 's1', { status: 'passed', sandboxResult: makeSandboxResult('passed', 200) }),
        makeSub('2', 'task2', 's1', { status: 'passed', sandboxResult: makeSandboxResult('passed', 400) }),
      ];
      const service = new StatsService(makeSubmissionRepo(subs), makeTaskRepo([TASK_1, TASK_2]));

      const stats = await service.getStudentStats('s1', 't1');

      assert.equal(stats.averageDurationMs, 300);
    });

    it('формирует taskStats: attempts и bestStatus по каждой задаче', async () => {
      const subs: Submission[] = [
        makeSub('1', 'task1', 's1', { status: 'failed', sandboxResult: makeSandboxResult('failed') }),
        makeSub('2', 'task1', 's1', { status: 'passed', sandboxResult: makeSandboxResult('passed') }),
        makeSub('3', 'task2', 's1', { status: 'failed', sandboxResult: makeSandboxResult('failed') }),
      ];
      const service = new StatsService(makeSubmissionRepo(subs), makeTaskRepo([TASK_1, TASK_2]));

      const stats = await service.getStudentStats('s1', 't1');

      const task1stat = stats.taskStats.find(t => t.taskId === 'task1')!;
      assert.equal(task1stat.attempts, 2);
      assert.equal(task1stat.bestStatus, 'passed');
      assert.equal(task1stat.taskTitle, 'Сортировка');

      const task2stat = stats.taskStats.find(t => t.taskId === 'task2')!;
      assert.equal(task2stat.attempts, 1);
      assert.equal(task2stat.bestStatus, 'failed');
    });

    it('в taskStats берёт grade из последнего оценённого решения по задаче', async () => {
      const grade = { score: 95, gradedAt: new Date(), gradedBy: 't1' };
      const subs: Submission[] = [
        makeSub('1', 'task1', 's1', { status: 'passed', sandboxResult: makeSandboxResult('passed') }),
        makeSub('2', 'task1', 's1', { status: 'passed', sandboxResult: makeSandboxResult('passed'), grade }),
      ];
      const service = new StatsService(makeSubmissionRepo(subs), makeTaskRepo([TASK_1]));

      const stats = await service.getStudentStats('s1', 't1');

      const task1stat = stats.taskStats.find(t => t.taskId === 'task1')!;
      assert.deepEqual(task1stat.grade, grade);
    });

    it('учитывает только terminal статусы при подсчёте passed/failed', async () => {
      const subs: Submission[] = [
        makeSub('1', 'task1', 's1', { status: 'pending' }),
        makeSub('2', 'task1', 's1', { status: 'passed', sandboxResult: makeSandboxResult('passed') }),
      ];
      const service = new StatsService(makeSubmissionRepo(subs), makeTaskRepo([TASK_1]));

      const stats = await service.getStudentStats('s1', 't1');

      assert.equal(stats.totalSubmissions, 2);
      assert.equal(stats.passedCount, 1);
      assert.equal(stats.failedCount, 0);
    });
  });
});
