export type Language = 'python' | 'javascript';
export type TaskStatus = 'draft' | 'published';

export interface TestCase {
  input: string;
  expectedOutput: string;
  isHidden: boolean; // скрытые тест-кейсы не показываются ученику
}

export interface Task {
  _id: string;
  title: string;
  description: string;
  authorId: string; // ID учителя
  language: Language;
  starterCode?: string;
  testCases: TestCase[];
  timeLimitMs: number; // default: 5000
  memoryLimitMb: number; // default: 128
  status: TaskStatus;
  createdAt: Date;
  updatedAt: Date;
}

// --- Requests ---

export type TaskCreateRequest = Pick<
  Task,
  'title' | 'description' | 'language' | 'starterCode' | 'testCases' | 'timeLimitMs' | 'memoryLimitMb'
> & { status?: TaskStatus };

export type TaskUpdateRequest = Partial<
  Pick<Task, 'title' | 'description' | 'starterCode' | 'testCases' | 'timeLimitMs' | 'memoryLimitMb' | 'status'>
>;

// --- Responses ---

// Для ученика скрытые тест-кейсы не возвращаются
export type TaskForStudent = Omit<Task, 'testCases'> & {
  testCases: Omit<TestCase, 'isHidden'>[];
  submissionStatus: SubmissionStatusForList;
};

export type SubmissionStatusForList = 'not_submitted' | 'pending' | 'passed' | 'failed';

export type TaskListItem = Pick<Task, '_id' | 'title' | 'language' | 'status' | 'createdAt'> & {
  submissionStatus?: SubmissionStatusForList;
};
