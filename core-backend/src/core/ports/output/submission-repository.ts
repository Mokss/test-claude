import type { Submission, SandboxResult, Grade } from '@ismart/specs';

export interface ISubmissionRepository {
  findById(id: string): Promise<Submission | null>;
  findByTask(taskId: string): Promise<Submission[]>;
  findByStudent(studentId: string): Promise<Submission[]>;
  findByTaskAndStudent(taskId: string, studentId: string): Promise<Submission[]>;
  create(data: Omit<Submission, '_id' | 'submittedAt'>): Promise<Submission>;
  updateStatus(id: string, status: Submission['status'], sandboxResult?: SandboxResult): Promise<Submission | null>;
  updateGrade(id: string, grade: Grade): Promise<Submission | null>;
}
