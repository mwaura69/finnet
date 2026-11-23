import type { RequestHandler } from 'express';
import { verifyToken } from '../utils/jwt.js';
import { ApiError } from '../utils/ApiError.js';
import { UserRepository } from '../api/v1/users/user.repository.js';
const users = new UserRepository();
export const requireAuth: RequestHandler = (req, _res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new Error();
    const id = verifyToken(header.slice(7));
    if (!users.findById(id)) throw new Error();
    req.userId = id;
    next();
  } catch {
    next(new ApiError(401, 'UNAUTHENTICATED', 'Please sign in again to continue.'));
  }
};
