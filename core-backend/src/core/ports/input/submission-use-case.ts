import type { Submission, Language, SandboxResult } from '@ismart/specs';

export interface SubmitInput {
  taskId: string;
  studentId: string;
  code: string;
  language: Language;
}

export interface GradeInput {
  submissionId: string;
  teacherId: string;
  score: number;
  comment?: string;
}

export interface ISubmissionUseCase {
  submit(input: SubmitInput): Promise<Submission>;
  getById(id: string, requesterId: string, requesterRole: 'teacher' | 'student'): Promise<Submission>;
  listByTask(taskId: string, requesterId: string, requesterRole: 'teacher' | 'student'): Promise<Submission[]>;
  listByStudent(studentId: string, teacherId: string): Promise<Submission[]>;
  grade(input: GradeInput): Promise<Submission>;
  handleSandboxResult(submissionId: string, result: SandboxResult): Promise<void>;
}
