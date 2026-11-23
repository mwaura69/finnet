import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
export const signToken = (userId: string) =>
  jwt.sign({}, config.secret, {
    subject: userId,
    expiresIn: '2h',
    issuer: 'fintrack',
    audience: 'fintrack-web',
    algorithm: 'HS256',
  });
export function verifyToken(token: string) {
  const payload = jwt.verify(token, config.secret, {
    issuer: 'fintrack',
    audience: 'fintrack-web',
    algorithms: ['HS256'],
  });
  if (typeof payload === 'string' || !payload.sub) throw new Error('Invalid token subject');
  return payload.sub;
}
