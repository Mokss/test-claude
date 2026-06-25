import bcrypt from 'bcrypt';
import type { IAuthUseCase, RegisterInput, LoginInput, AuthResult } from '../ports/input/auth-use-case.ts';
import type { IUserRepository } from '../ports/output/user-repository.ts';
import { toPublic } from '../domain/user.ts';

type SignFn = (payload: object) => Promise<string>;

export class AuthService implements IAuthUseCase {
  private readonly users: IUserRepository;
  private readonly sign: SignFn;

  constructor(users: IUserRepository, sign: SignFn) {
    this.users = users;
    this.sign = sign;
  }

  async register(input: RegisterInput): Promise<AuthResult> {
    if (input.role === 'student' && !input.teacherId) {
      throw new Error('TEACHER_ID_REQUIRED');
    }

    const existing = await this.users.findByEmail(input.email);
    if (existing) throw new Error('EMAIL_TAKEN');

    const passwordHash = await bcrypt.hash(input.password, 10);

    const user = await this.users.create({
      email: input.email,
      passwordHash,
      role: input.role,
      name: input.name,
      teacherId: input.teacherId,
    });

    const token = await this.sign({ sub: user._id, role: user.role, teacherId: user.teacherId });
    return { token, user: toPublic(user) };
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const user = await this.users.findByEmail(input.email);
    if (!user) throw new Error('INVALID_CREDENTIALS');

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) throw new Error('INVALID_CREDENTIALS');

    const token = await this.sign({ sub: user._id, role: user.role, teacherId: user.teacherId });
    return { token, user: toPublic(user) };
  }
}
