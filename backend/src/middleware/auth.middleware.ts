import type { RequestHandler } from 'express';
import { verifyToken } from '../utils/jwt.js';
import { ApiError } from '../utils/ApiError.js';
import { UserRepository } from '../api/v1/users/user.repository.js';
import { activeSession } from '../security/sessions.js';
import { cookies } from '../security/cookies.js';
import { db } from '../db/index.js';
const users = new UserRepository();
export const requireAuth: RequestHandler = (req, _res, next) => {
  try {
    const token = cookies(req)['ft_access'];
    if (!token) throw new Error();
    const claims = verifyToken(token);
    const session = activeSession(claims.sessionId);
    const user = users.findById(claims.userId);
    if (!user || session.user_id !== user.id || !user.email_verified) throw new Error();
    req.userId = user.id;
    req.sessionId = session.id;
    db.prepare('UPDATE sessions SET last_seen_at=? WHERE id=?').run(Date.now(), session.id);
    next();
  } catch (error) {
    next(
      error instanceof ApiError
        ? error
        : new ApiError(401, 'UNAUTHENTICATED', 'Please sign in again to continue.'),
    );
  }
};
