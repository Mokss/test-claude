import type { GradeRequest, Submission, SubmitRequest } from '../types.ts';
import { get, post, patch } from './client.ts';

export const submissionsApi = {
  submit: (taskId: string, body: SubmitRequest) =>
    post<Submission>(`/tasks/${taskId}/submissions`, body),

  listByTask: (taskId: string) =>
    get<Submission[]>(`/tasks/${taskId}/submissions`),

  listByStudent: (studentId: string) =>
    get<Submission[]>(`/students/${studentId}/submissions`),

  get: (id: string) => get<Submission>(`/submissions/${id}`),

  grade: (id: string, body: GradeRequest) =>
    patch<Submission>(`/submissions/${id}/grade`, body),
};
