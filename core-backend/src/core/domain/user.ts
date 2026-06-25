export type UserRole = 'teacher' | 'student';

export interface User {
  _id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  name: string;
  teacherId?: string;
  createdAt: Date;
}

export type UserPublic = Pick<User, '_id' | 'email' | 'role' | 'name'>;

export function toPublic(user: User): UserPublic {
  return { _id: user._id, email: user.email, role: user.role, name: user.name };
}
