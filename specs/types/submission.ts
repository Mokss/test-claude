import type { Language } from './task.ts';
import type { UserPublic } from './user.ts';

export type SubmissionStatus = 'pending' | 'running' | 'passed' | 'failed' | 'timeout' | 'error';
export type SandboxStatus = 'passed' | 'failed' | 'timeout' | 'error';

export interface TestResult {
  passed: boolean;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  error?: string; // stderr
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
  score: number; // 0–100
  comment?: string;
  gradedAt: Date;
  gradedBy: string; // ID учителя
}

export interface Submission {
  _id: string;
  taskId: string;
  studentId: string;
  student?: UserPublic; // populated при запросах учителя
  code: string;
  language: Language;
  status: SubmissionStatus;
  sandboxResult?: SandboxResult;
  grade?: Grade;
  submittedAt: Date;
}

// --- Requests ---

export type SubmitRequest = Pick<Submission, 'code' | 'language'>;

export interface GradeRequest {
  score: number;
  comment?: string;
}
