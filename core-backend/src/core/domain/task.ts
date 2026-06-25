export type Language = 'python' | 'javascript';
export type TaskStatus = 'draft' | 'published';

export interface TestCase {
  input: string;
  expectedOutput: string;
  isHidden: boolean;
}

export interface Task {
  _id: string;
  title: string;
  description: string;
  authorId: string;
  language: Language;
  starterCode?: string;
  testCases: TestCase[];
  timeLimitMs: number;
  memoryLimitMb: number;
  status: TaskStatus;
  createdAt: Date;
  updatedAt: Date;
}
