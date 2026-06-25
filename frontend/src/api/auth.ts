import type { AuthResponse, LoginRequest, RegisterRequest } from '../types.ts';
import { post } from './client.ts';

export const authApi = {
  register: (body: RegisterRequest) => post<AuthResponse>('/auth/register', body),
  login: (body: LoginRequest) => post<AuthResponse>('/auth/login', body),
};
