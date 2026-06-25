import type { Language, SandboxResult } from '@ismart/specs';

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
  teacherEmail: string;
  studentName: string;
  taskTitle: string;
  submissionId: string;
  status: 'passed' | 'failed';
}

export interface IEventBus {
  publishSandboxRun(event: SandboxRunEvent): Promise<void>;
  publishNotifyTeacher(event: NotifyTeacherEvent): Promise<void>;
}
