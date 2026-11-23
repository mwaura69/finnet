import { AuthRepository } from './auth.repository.js';
import { ApiError } from '../../../utils/ApiError.js';
import { hashPassword, verifyPassword, dummyHash } from '../../../utils/hash.js';
import { signToken } from '../../../utils/jwt.js';
import { config } from '../../../config/index.js';
import type { LoginInput, RegisterInput, SessionDto } from './auth.types.js';
import type { UserModel } from '../../../db/models/user.model.js';
export class AuthService {
  constructor(private repository = new AuthRepository()) {}
  private session(user: UserModel): SessionDto {
    return {
      token: signToken(user.id),
      user: { id: user.id, name: user.name, email: user.email },
      demoMode: config.demo,
    };
  }
  async register(input: RegisterInput) {
    if (this.repository.findByEmail(input.email))
      throw new ApiError(409, 'EMAIL_IN_USE', 'An account with this email already exists.');
    const passwordHash = await hashPassword(input.password);
    try {
      return this.session(this.repository.create({ ...input, passwordHash }));
    } catch (error) {
      if (this.repository.findByEmail(input.email))
        throw new ApiError(409, 'EMAIL_IN_USE', 'An account with this email already exists.');
      throw error;
    }
  }
  async login(input: LoginInput) {
    const row = this.repository.findByEmail(input.email);
    const valid = await verifyPassword(input.password, row?.password_hash || dummyHash);
    if (!row || !valid)
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
    return this.session(row);
  }
}
