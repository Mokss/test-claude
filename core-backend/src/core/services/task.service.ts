import type { ITaskUseCase, CreateTaskInput, UpdateTaskInput } from '../ports/input/task-use-case.ts';
import type { ITaskRepository } from '../ports/output/task-repository.ts';
import type { IUserRepository } from '../ports/output/user-repository.ts';
import type { Task } from '../domain/task.ts';

export class TaskService implements ITaskUseCase {
  private readonly tasks: ITaskRepository;
  private readonly users: IUserRepository;

  constructor(tasks: ITaskRepository, users: IUserRepository) {
    this.tasks = tasks;
    this.users = users;
  }

  async create(input: CreateTaskInput): Promise<Task> {
    return this.tasks.create({
      title: input.title,
      description: input.description,
      language: input.language,
      authorId: input.authorId,
      starterCode: input.starterCode,
      testCases: input.testCases ?? [],
      timeLimitMs: input.timeLimitMs ?? 5000,
      memoryLimitMb: input.memoryLimitMb ?? 128,
      status: 'draft',
    });
  }

  async listForTeacher(authorId: string): Promise<Task[]> {
    return this.tasks.findByAuthor(authorId);
  }

  async listForStudent(teacherId: string, _studentId: string): Promise<Task[]> {
    const tasks = await this.tasks.findPublishedByTeacher(teacherId);
    return tasks.map(t => hideTestCases(t));
  }

  async getById(id: string, requesterId: string, requesterRole: 'teacher' | 'student'): Promise<Task> {
    const task = await this.tasks.findById(id);

    if (!task) throw new Error('NOT_FOUND');

    if (requesterRole === 'student') {
      if (task.status !== 'published') throw new Error('NOT_FOUND');
      return hideTestCases(task);
    }

    return task;
  }

  async update(id: string, authorId: string, data: UpdateTaskInput): Promise<Task> {
    const task = await this.tasks.findById(id);
    if (!task) throw new Error('NOT_FOUND');
    if (task.authorId !== authorId) throw new Error('FORBIDDEN');

    const updated = await this.tasks.update(id, data);
    return updated!;
  }

  async delete(id: string, authorId: string): Promise<void> {
    const task = await this.tasks.findById(id);
    if (!task) throw new Error('NOT_FOUND');
    if (task.authorId !== authorId) throw new Error('FORBIDDEN');

    await this.tasks.delete(id);
  }
}

function hideTestCases(task: Task): Task {
  return {
    ...task,
    testCases: task.testCases.filter(tc => !tc.isHidden),
  };
}
