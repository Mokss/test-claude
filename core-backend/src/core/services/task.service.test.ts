import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TaskService } from './task.service.ts';
import type { ITaskRepository, TaskUpdateData } from '../ports/output/task-repository.ts';
import type { IUserRepository } from '../ports/output/user-repository.ts';
import type { Task } from '@ismart/specs';
import type { User } from '../domain/user.ts';

function makeTaskRepo(initial: Task[] = []): ITaskRepository {
  const store: Task[] = [...initial];
  let seq = 0;

  return {
    async findById(id) {
      return store.find(t => t._id === id) ?? null;
    },
    async findByAuthor(authorId) {
      return store.filter(t => t.authorId === authorId);
    },
    async findPublishedByTeacher(teacherId) {
      return store.filter(t => t.authorId === teacherId && t.status === 'published');
    },
    async create(data) {
      const task: Task = { ...data, _id: String(++seq), createdAt: new Date(), updatedAt: new Date() };
      store.push(task);
      return task;
    },
    async update(id, data) {
      const idx = store.findIndex(t => t._id === id);
      if (idx === -1) return null;
      store[idx] = { ...store[idx], ...data, updatedAt: new Date() };
      return store[idx];
    },
    async delete(id) {
      const idx = store.findIndex(t => t._id === id);
      if (idx === -1) return false;
      store.splice(idx, 1);
      return true;
    },
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

const TEACHER: User = { _id: 't1', email: 'teacher@t.com', passwordHash: 'x', role: 'teacher', name: 'Учитель', createdAt: new Date() };
const STUDENT: User = { _id: 's1', email: 'student@t.com', passwordHash: 'x', role: 'student', name: 'Ученик', teacherId: 't1', createdAt: new Date() };

function baseTask(override: Partial<Task> = {}): Task {
  return {
    _id: '1', title: 'Задача 1', description: 'Описание', authorId: 't1',
    language: 'python', testCases: [], timeLimitMs: 5000, memoryLimitMb: 128,
    status: 'published', starterCode: '', createdAt: new Date(), updatedAt: new Date(),
    ...override,
  };
}

describe('TaskService', () => {
  describe('create', () => {
    it('создаёт задачу с дефолтными лимитами', async () => {
      const service = new TaskService(makeTaskRepo(), makeUserRepo([TEACHER]));

      const task = await service.create({
        title: 'Сортировка', description: 'Отсортируй массив',
        language: 'python', authorId: 't1',
      });

      assert.equal(task.title, 'Сортировка');
      assert.equal(task.status, 'draft');
      assert.equal(task.timeLimitMs, 5000);
      assert.equal(task.memoryLimitMb, 128);
    });

    it('без указания статуса задача создаётся как draft', async () => {
      const service = new TaskService(makeTaskRepo(), makeUserRepo([TEACHER]));
      const task = await service.create({ title: 'T', description: 'D', language: 'javascript', authorId: 't1' });
      assert.equal(task.status, 'draft');
    });

    it('создаёт сразу опубликованную задачу, если передан status', async () => {
      const service = new TaskService(makeTaskRepo(), makeUserRepo([TEACHER]));
      const task = await service.create({ title: 'T', description: 'D', language: 'javascript', status: 'published', authorId: 't1' });
      assert.equal(task.status, 'published');
    });
  });

  describe('listForTeacher', () => {
    it('возвращает все задачи автора включая draft', async () => {
      const tasks = [
        baseTask({ _id: '1', authorId: 't1', status: 'draft' }),
        baseTask({ _id: '2', authorId: 't1', status: 'published' }),
        baseTask({ _id: '3', authorId: 'other' }),
      ];
      const service = new TaskService(makeTaskRepo(tasks), makeUserRepo([TEACHER]));

      const result = await service.listForTeacher('t1');

      assert.equal(result.length, 2);
      assert.ok(result.every(t => t.authorId === 't1'));
    });
  });

  describe('listForStudent', () => {
    it('возвращает только published задачи своего учителя', async () => {
      const tasks = [
        baseTask({ _id: '1', authorId: 't1', status: 'published' }),
        baseTask({ _id: '2', authorId: 't1', status: 'draft' }),
        baseTask({ _id: '3', authorId: 'other', status: 'published' }),
      ];
      const service = new TaskService(makeTaskRepo(tasks), makeUserRepo([TEACHER, STUDENT]));

      const result = await service.listForStudent('t1', 's1');

      assert.equal(result.length, 1);
      assert.equal(result[0]._id, '1');
    });

    it('скрывает isHidden тест-кейсы от ученика', async () => {
      const task = baseTask({
        _id: '1', authorId: 't1', status: 'published',
        testCases: [
          { input: '1', expectedOutput: '1', isHidden: false },
          { input: '2', expectedOutput: '2', isHidden: true },
        ],
      });
      const service = new TaskService(makeTaskRepo([task]), makeUserRepo([TEACHER, STUDENT]));

      const result = await service.listForStudent('t1', 's1');

      assert.equal(result[0].testCases.length, 1);
      assert.equal(result[0].testCases[0].input, '1');
    });
  });

  describe('getById', () => {
    it('учитель видит все тест-кейсы включая скрытые', async () => {
      const task = baseTask({
        testCases: [
          { input: '1', expectedOutput: '1', isHidden: false },
          { input: '2', expectedOutput: '2', isHidden: true },
        ],
      });
      const service = new TaskService(makeTaskRepo([task]), makeUserRepo([TEACHER]));

      const result = await service.getById('1', 't1', 'teacher');

      assert.equal(result.testCases.length, 2);
    });

    it('ученик не видит скрытые тест-кейсы', async () => {
      const task = baseTask({
        status: 'published',
        testCases: [
          { input: '1', expectedOutput: '1', isHidden: false },
          { input: '2', expectedOutput: '2', isHidden: true },
        ],
      });
      const service = new TaskService(makeTaskRepo([task]), makeUserRepo([TEACHER, STUDENT]));

      const result = await service.getById('1', 's1', 'student');

      assert.equal(result.testCases.length, 1);
    });

    it('бросает NOT_FOUND если задача не существует', async () => {
      const service = new TaskService(makeTaskRepo(), makeUserRepo([TEACHER]));
      await assert.rejects(() => service.getById('999', 't1', 'teacher'), { message: 'NOT_FOUND' });
    });

    it('ученик не может открыть draft задачу', async () => {
      const task = baseTask({ status: 'draft' });
      const service = new TaskService(makeTaskRepo([task]), makeUserRepo([TEACHER, STUDENT]));
      await assert.rejects(() => service.getById('1', 's1', 'student'), { message: 'NOT_FOUND' });
    });
  });

  describe('update', () => {
    it('обновляет поля задачи', async () => {
      const task = baseTask({ authorId: 't1' });
      const service = new TaskService(makeTaskRepo([task]), makeUserRepo([TEACHER]));

      const result = await service.update('1', 't1', { title: 'Новое название', status: 'published' });

      assert.equal(result.title, 'Новое название');
      assert.equal(result.status, 'published');
    });

    it('бросает FORBIDDEN если не автор', async () => {
      const task = baseTask({ authorId: 't1' });
      const service = new TaskService(makeTaskRepo([task]), makeUserRepo([TEACHER]));
      await assert.rejects(() => service.update('1', 'other', { title: 'X' }), { message: 'FORBIDDEN' });
    });
  });

  describe('delete', () => {
    it('удаляет задачу автора', async () => {
      const task = baseTask({ authorId: 't1' });
      const taskRepo = makeTaskRepo([task]);
      const service = new TaskService(taskRepo, makeUserRepo([TEACHER]));

      await service.delete('1', 't1');

      assert.equal((await taskRepo.findById('1')), null);
    });

    it('бросает FORBIDDEN если не автор', async () => {
      const task = baseTask({ authorId: 't1' });
      const service = new TaskService(makeTaskRepo([task]), makeUserRepo([TEACHER]));
      await assert.rejects(() => service.delete('1', 'other'), { message: 'FORBIDDEN' });
    });
  });
});
