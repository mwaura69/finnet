import { UserRepository } from './user.repository.js';
import { toUserDto } from './user.mapper.js';
import { ApiError } from '../../../utils/ApiError.js';
export class UserService {
  me(id: string) {
    const user = new UserRepository().findById(id);
    if (!user) throw new ApiError(401, 'UNAUTHENTICATED', 'Sign in again.');
    return toUserDto(user);
  }
}
