import { env, jwtSecret } from './env.js';
export { env } from './env.js';
export const config = {
  port: env.PORT,
  production: env.NODE_ENV === 'production',
  demo: env.DEMO_MODE === 'true',
  secret: jwtSecret,
  database: env.DATABASE_PATH,
  origin: env.FRONTEND_ORIGIN,
};
