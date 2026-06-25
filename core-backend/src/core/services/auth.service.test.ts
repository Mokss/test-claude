import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { AuthService } from './auth.service.ts';
import type { IUserRepository } from '../ports/output/user-repository.ts';
import type { User } from '../domain/user.ts';

// In-memory реализация IUserRepository для тестов
function makeUserRepo(initial: User[] = []): IUserRepository {
  const store: User[] = [...initial];
  let seq = 0;

  return {
    async findById(id) {
      return store.find(u => u._id === id) ?? null;
    },
    async findByEmail(email) {
      return store.find(u => u.email === email) ?? null;
    },
    async findStudentsByTeacher(teacherId) {
      return store.filter(u => u.teacherId === teacherId);
    },
    async create(data) {
      const user: User = { ...data, _id: String(++seq), createdAt: new Date() };
      store.push(user);
      return user;
    },
  };
}

const SIGN = async (payload: object) => 'token.' + JSON.stringify(payload);

describe('AuthService', () => {
  describe('register', () => {
    it('создаёт нового пользователя и возвращает токен', async () => {
      const service = new AuthService(makeUserRepo(), SIGN);

      const result = await service.register({
        email: 'teacher@test.com',
        password: 'password123',
        name: 'Иван',
        role: 'teacher',
      });

      assert.ok(result.token);
      assert.equal(result.user.email, 'teacher@test.com');
      assert.equal(result.user.role, 'teacher');
      assert.equal(result.user.name, 'Иван');
      assert.ok(!('passwordHash' in result.user), 'passwordHash не должен утекать в ответ');
    });

    it('не хранит пароль в открытом виде', async () => {
      const repo = makeUserRepo();
      const service = new AuthService(repo, SIGN);

      await service.register({ email: 'a@b.com', password: 'secret', name: 'A', role: 'teacher' });

      const user = await repo.findByEmail('a@b.com');
      assert.ok(user);
      assert.notEqual(user.passwordHash, 'secret');
    });

    it('бросает ошибку если email уже занят', async () => {
      const existing: User = {
        _id: '1', email: 'dup@test.com', passwordHash: 'x',
        role: 'teacher', name: 'X', createdAt: new Date(),
      };
      const service = new AuthService(makeUserRepo([existing]), SIGN);

      await assert.rejects(
        () => service.register({ email: 'dup@test.com', password: '123', name: 'Y', role: 'teacher' }),
        { message: 'EMAIL_TAKEN' },
      );
    });

    it('student без teacherId бросает ошибку', async () => {
      const service = new AuthService(makeUserRepo(), SIGN);

      await assert.rejects(
        () => service.register({ email: 's@test.com', password: '123', name: 'S', role: 'student' }),
        { message: 'TEACHER_ID_REQUIRED' },
      );
    });
  });

  describe('login', () => {
    it('возвращает токен при правильных данных', async () => {
      const repo = makeUserRepo();
      const service = new AuthService(repo, SIGN);
      await service.register({ email: 'u@test.com', password: 'pass123', name: 'U', role: 'teacher' });

      const result = await service.login({ email: 'u@test.com', password: 'pass123' });

      assert.ok(result.token);
      assert.equal(result.user.email, 'u@test.com');
    });

    it('бросает ошибку при неверном пароле', async () => {
      const repo = makeUserRepo();
      const service = new AuthService(repo, SIGN);
      await service.register({ email: 'u@test.com', password: 'correct', name: 'U', role: 'teacher' });

      await assert.rejects(
        () => service.login({ email: 'u@test.com', password: 'wrong' }),
        { message: 'INVALID_CREDENTIALS' },
      );
    });

    it('бросает ошибку если пользователь не найден', async () => {
      const service = new AuthService(makeUserRepo(), SIGN);

      await assert.rejects(
        () => service.login({ email: 'nobody@test.com', password: 'x' }),
        { message: 'INVALID_CREDENTIALS' },
      );
    });
  });
});
