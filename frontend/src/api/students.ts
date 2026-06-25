import type { StudentStats, UserPublic } from '../types.ts';
import { get } from './client.ts';

export const studentsApi = {
  list: () => get<UserPublic[]>('/students'),
  stats: (studentId: string) => get<StudentStats>(`/students/${studentId}/stats`),
};
