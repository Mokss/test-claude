import type { ISubmissionUseCase, SubmitInput, GradeInput } from '../ports/input/submission-use-case.ts';
import type { ISubmissionRepository } from '../ports/output/submission-repository.ts';
import type { ITaskRepository } from '../ports/output/task-repository.ts';
import type { IUserRepository } from '../ports/output/user-repository.ts';
import type { IEventBus } from '../ports/output/event-bus.ts';
import type { Submission, SandboxResult } from '../domain/submission.ts';

export class SubmissionService implements ISubmissionUseCase {
  private readonly submissions: ISubmissionRepository;
  private readonly tasks: ITaskRepository;
  private readonly users: IUserRepository;
  private readonly bus: IEventBus;

  constructor(
    submissions: ISubmissionRepository,
    tasks: ITaskRepository,
    users: IUserRepository,
    bus: IEventBus,
  ) {
    this.submissions = submissions;
    this.tasks = tasks;
    this.users = users;
    this.bus = bus;
  }

  async submit(input: SubmitInput): Promise<Submission> {
    const task = await this.tasks.findById(input.taskId);
    if (!task) throw new Error('NOT_FOUND');
    if (task.status !== 'published') throw new Error('FORBIDDEN');

    const sub = await this.submissions.create({
      taskId: input.taskId,
      studentId: input.studentId,
      code: input.code,
      language: input.language,
      status: 'pending',
    });

    await this.bus.publishSandboxRun({
      submissionId: sub._id,
      code: input.code,
      language: input.language,
      timeLimitMs: task.timeLimitMs,
      memoryLimitMb: task.memoryLimitMb,
      testCases: task.testCases.map(tc => ({ input: tc.input, expectedOutput: tc.expectedOutput })),
    });

    return sub;
  }

  async handleSandboxResult(submissionId: string, result: SandboxResult): Promise<void> {
    const sub = await this.submissions.findById(submissionId);
    if (!sub) throw new Error('NOT_FOUND');

    await this.submissions.updateStatus(submissionId, result.status, result);

    const task = await this.tasks.findById(sub.taskId);
    const student = await this.users.findById(sub.studentId);

    if (task && student && student.teacherId) {
      await this.bus.publishNotifyTeacher({
        teacherId: student.teacherId,
        studentName: student.name,
        taskTitle: task.title,
        submissionId: sub._id,
        status: result.status === 'passed' ? 'passed' : 'failed',
      });
    }
  }

  async getById(id: string, requesterId: string, requesterRole: 'teacher' | 'student'): Promise<Submission> {
    const sub = await this.submissions.findById(id);
    if (!sub) throw new Error('NOT_FOUND');

    if (requesterRole === 'student' && sub.studentId !== requesterId) {
      throw new Error('FORBIDDEN');
    }

    return sub;
  }

  async listByTask(taskId: string, requesterId: string, requesterRole: 'teacher' | 'student'): Promise<Submission[]> {
    if (requesterRole === 'student') {
      return this.submissions.findByTaskAndStudent(taskId, requesterId);
    }
    return this.submissions.findByTask(taskId);
  }

  async listByStudent(studentId: string, _teacherId: string): Promise<Submission[]> {
    return this.submissions.findByStudent(studentId);
  }

  async grade(input: GradeInput): Promise<Submission> {
    if (input.score < 0 || input.score > 100) throw new Error('INVALID_SCORE');

    const sub = await this.submissions.findById(input.submissionId);
    if (!sub) throw new Error('NOT_FOUND');

    const terminalStatuses = ['passed', 'failed', 'timeout', 'error'];
    if (!terminalStatuses.includes(sub.status)) throw new Error('NOT_READY');

    const updated = await this.submissions.updateGrade(input.submissionId, {
      score: input.score,
      comment: input.comment,
      gradedAt: new Date(),
      gradedBy: input.teacherId,
    });

    return updated!;
  }
}
