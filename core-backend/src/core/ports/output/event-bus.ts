import type { Language } from '../../domain/task.ts';
import type { SandboxResult } from '../../domain/submission.ts';

export interface SandboxRunEvent {
  submissionId: string;
  code: string;
  language: Language;
  timeLimitMs: number;
  memoryLimitMb: number;
  testCases: Array<{ input: string; expectedOutput: string }>;
}

export interface SandboxResultEvent {
  submissionId: string;
  result: SandboxResult;
}

export interface NotifyTeacherEvent {
  teacherId: string;
  studentName: string;
  taskTitle: string;
  submissionId: string;
  status: 'passed' | 'failed';
}

export interface IEventBus {
  publishSandboxRun(event: SandboxRunEvent): Promise<void>;
  publishNotifyTeacher(event: NotifyTeacherEvent): Promise<void>;
}
