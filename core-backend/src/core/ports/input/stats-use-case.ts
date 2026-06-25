import type { StudentStats } from '../../domain/stats.ts';

export interface IStatsUseCase {
  getStudentStats(studentId: string, teacherId: string): Promise<StudentStats>;
}
