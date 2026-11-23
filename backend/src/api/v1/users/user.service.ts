import { UserRepository } from './user.repository.js';
import { ApiError } from '../../../utils/ApiError.js';
import type { UserDto } from './user.types.js';
export class UserService {
  constructor(private repository = new UserRepository()) {}
  me(id: string): UserDto {
    const row = this.repository.findById(id);
    if (!row) throw new ApiError(401, 'UNAUTHENTICATED', 'Please sign in again to continue.');
    return { id: row.id, name: row.name, email: row.email };
  }
}
