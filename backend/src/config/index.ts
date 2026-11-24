import { env, jwtSecret } from './env.js';
export { env } from './env.js';
export const config = {
  port: env.PORT,
  trustProxyHops: env.TRUST_PROXY_HOPS,
  production: env.NODE_ENV === 'production',
  demo: env.DEMO_MODE === 'true',
  secret: jwtSecret,
  database: env.DATABASE_PATH,
  origin: env.FRONTEND_ORIGIN,
  google: { clientId: env.GOOGLE_CLIENT_ID || null },
  mfa: {
    secret: env.MFA_HMAC_SECRET || jwtSecret,
    codeTtlMs: 600000,
    maxAttempts: 5,
    resendCooldownMs: 60000,
  },
  session: {
    accessSeconds: env.ACCESS_TOKEN_SECONDS,
    idleSeconds: env.SESSION_IDLE_SECONDS,
    normalSeconds: env.SESSION_NORMAL_SECONDS,
    persistentSeconds: env.SESSION_PERSISTENT_SECONDS,
  },
  smtp: {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
    from: env.MAIL_FROM,
  },
  mail: {
    delivery: env.NODE_ENV === 'test' ? 'outbox' : env.MAIL_DELIVERY,
    outboxPath: env.MAIL_OUTBOX_PATH,
    resendApiKey: env.RESEND_API_KEY,
  },
};
export const mfa = config.mfa;
export const smtp = config.smtp;
