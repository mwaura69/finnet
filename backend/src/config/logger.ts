import pino from 'pino';
import { env } from './env.js';
export const logger = pino({
  level: env.LOG_LEVEL,
  base: { service: 'fintrack-api' },
  redact: ['password', 'password_hash', 'token', 'authorization', 'secret'],
});
