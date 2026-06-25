import type { UserPublic, UserRole } from '../../domain/user.ts';

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  teacherId?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResult {
  token: string;
  user: UserPublic;
}

export interface IAuthUseCase {
  register(input: RegisterInput): Promise<AuthResult>;
  login(input: LoginInput): Promise<AuthResult>;
  getStudents(teacherId: string): Promise<UserPublic[]>;
}
