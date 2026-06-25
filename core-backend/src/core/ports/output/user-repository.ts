import type { User } from '../../domain/user.ts';

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findStudentsByTeacher(teacherId: string): Promise<User[]>;
  create(data: Omit<User, '_id' | 'createdAt'>): Promise<User>;
}
