import type { Task } from '@ismart/specs';

export type TaskUpdateData = Partial<Pick<Task,
  'title' | 'description' | 'starterCode' | 'testCases' | 'timeLimitMs' | 'memoryLimitMb' | 'status'
>>;

export interface ITaskRepository {
  findById(id: string): Promise<Task | null>;
  findByAuthor(authorId: string): Promise<Task[]>;
  findPublishedByTeacher(teacherId: string): Promise<Task[]>;
  create(data: Omit<Task, '_id' | 'createdAt' | 'updatedAt'>): Promise<Task>;
  update(id: string, data: TaskUpdateData): Promise<Task | null>;
  delete(id: string): Promise<boolean>;
}
