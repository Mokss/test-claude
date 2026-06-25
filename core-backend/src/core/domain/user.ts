import type { UserRole, UserPublic } from '@ismart/specs';

export type { UserRole, UserPublic };

// User — backend-only: содержит passwordHash, которого нет в публичном типе
export interface User {
  _id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  name: string;
  teacherId?: string;
  createdAt: Date;
}

export function toPublic(user: User): UserPublic {
  return { _id: user._id, email: user.email, role: user.role, name: user.name };
}
