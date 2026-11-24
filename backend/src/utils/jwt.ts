import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
export function signToken(userId: string, sessionId: string) {
  return jwt.sign({ sid: sessionId, typ: 'access' }, config.secret, {
    subject: userId,
    expiresIn: config.session.accessSeconds,
    issuer: 'fintrack',
    audience: 'fintrack-web',
    algorithm: 'HS256',
  });
}
export function verifyToken(token: string) {
  const payload = jwt.verify(token, config.secret, {
    issuer: 'fintrack',
    audience: 'fintrack-web',
    algorithms: ['HS256'],
  });
  if (
    typeof payload === 'string' ||
    !payload.sub ||
    typeof payload['sid'] !== 'string' ||
    payload['typ'] !== 'access'
  )
    throw new Error('Invalid token');
  return { userId: payload.sub, sessionId: payload['sid'] };
}
