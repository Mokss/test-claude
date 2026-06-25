import type { Task, TaskCreateRequest, TaskUpdateRequest } from '../types.ts';
import { get, post, patch, del } from './client.ts';

export const tasksApi = {
  list: () => get<Task[]>('/tasks'),
  get: (id: string) => get<Task>(`/tasks/${id}`),
  create: (body: TaskCreateRequest) => post<Task>('/tasks', body),
  update: (id: string, body: TaskUpdateRequest) => patch<Task>(`/tasks/${id}`, body),
  delete: (id: string) => del(`/tasks/${id}`),
};
