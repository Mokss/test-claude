import type { Grade, SandboxStatus } from './submission.ts';

export interface TaskStat {
  taskId: string;
  taskTitle: string;
  attempts: number;
  bestStatus: SandboxStatus;
  grade?: Grade;
}

export interface StudentStats {
  studentId: string;
  totalSubmissions: number;
  passedCount: number;
  failedCount: number;
  averageScore?: number;
  averageDurationMs?: number;
  taskStats: TaskStat[];
}
