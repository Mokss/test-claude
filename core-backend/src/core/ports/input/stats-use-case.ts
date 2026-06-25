import type { StudentStats } from '@ismart/specs';

export interface IStatsUseCase {
  getStudentStats(studentId: string, teacherId: string): Promise<StudentStats>;
}
