import type { Task, Language, TestCase } from '@ismart/specs';

export interface CreateTaskInput {
  title: string;
  description: string;
  language: Language;
  starterCode?: string;
  testCases?: TestCase[];
  timeLimitMs?: number;
  memoryLimitMb?: number;
  authorId: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  starterCode?: string;
  testCases?: TestCase[];
  timeLimitMs?: number;
  memoryLimitMb?: number;
  status?: 'draft' | 'published';
}

export interface ITaskUseCase {
  listForTeacher(authorId: string): Promise<Task[]>;
  listForStudent(teacherId: string, studentId: string): Promise<Task[]>;
  getById(id: string, requesterId: string, requesterRole: 'teacher' | 'student'): Promise<Task>;
  create(input: CreateTaskInput): Promise<Task>;
  update(id: string, authorId: string, data: UpdateTaskInput): Promise<Task>;
  delete(id: string, authorId: string): Promise<void>;
}
