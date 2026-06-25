import type { Grade, SandboxStatus } from './submission';

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
  averageScore?: number; // среднее по оценённым решениям
  averageDurationMs?: number; // среднее время выполнения в sandbox
  taskStats: TaskStat[];
}
