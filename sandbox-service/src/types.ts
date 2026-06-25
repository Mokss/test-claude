export type Language = 'python' | 'javascript';

export interface TestCase {
  input: string;
  expectedOutput: string;
}

export interface SandboxRunEvent {
  submissionId: string;
  code: string;
  language: Language;
  timeLimitMs: number;
  memoryLimitMb: number;
  testCases: TestCase[];
}

export type SandboxStatus = 'passed' | 'failed' | 'timeout' | 'error';

export interface TestResult {
  passed: boolean;
  input: string;
  expectedOutput: string;
  actualOutput: string;
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

export interface SandboxResultEvent {
  submissionId: string;
  result: SandboxResult;
}
