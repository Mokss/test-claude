export type UserRole = 'teacher' | 'student';

export interface User {
  _id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  name: string;
  teacherId?: string; // только для student — ссылка на учителя
  createdAt: Date;
}

export type UserPublic = Pick<User, '_id' | 'email' | 'role' | 'name'>;

// --- Auth ---

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  teacherId?: string; // обязательно если role === 'student'
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: UserPublic;
}
