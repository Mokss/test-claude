import type { Language } from './task';
import type { SandboxResult } from './submission';

// Контракты событий через шину (core → sandbox, sandbox → core, core → notification)

// core → sandbox: запустить код
export interface SandboxRunEvent {
  submissionId: string;
  code: string;
  language: Language;
  timeLimitMs: number;
  memoryLimitMb: number;
  testCases: Array<{ input: string; expectedOutput: string }>;
}

// sandbox → core: результат выполнения
export interface SandboxResultEvent {
  submissionId: string;
  result: SandboxResult;
}

// core → notification: уведомить учителя
export interface NotifyTeacherEvent {
  teacherId: string;
  studentName: string;
  taskTitle: string;
  submissionId: string;
  status: 'passed' | 'failed';
}
