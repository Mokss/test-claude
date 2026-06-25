import type { Language } from './task.ts';

export type SubmissionStatus = 'pending' | 'running' | 'passed' | 'failed' | 'timeout' | 'error';
export type SandboxStatus = 'passed' | 'failed' | 'timeout' | 'error';

export interface TestResult {
  passed: boolean;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  error?: string;
  durationMs: number;
}

export interface SandboxResult {
  status: SandboxStatus;
  stdout: string;
  stderr: string;
  durationMs: number;
  testResults: TestResult[];
  passedCount: number;
  totalCount: number;
}

export interface Grade {
  score: number;
  comment?: string;
  gradedAt: Date;
  gradedBy: string;
}

export interface Submission {
  _id: string;
  taskId: string;
  studentId: string;
  code: string;
  language: Language;
  status: SubmissionStatus;
  sandboxResult?: SandboxResult;
  grade?: Grade;
  submittedAt: Date;
}
