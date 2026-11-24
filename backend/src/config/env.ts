import 'dotenv/config';
import { z } from 'zod';
import { randomBytes } from 'node:crypto';
const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    DATABASE_PATH: z.string().min(1).default('./data/fintrack.sqlite'),
    FRONTEND_ORIGIN: z.url().default('http://localhost:4200'),
    JWT_SECRET: z.string().optional(),
    DEMO_MODE: z.enum(['true', 'false']).default('false'),
    LOG_LEVEL: z
      .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'])
      .default('info'),
    MFA_HMAC_SECRET: z.string().min(32).optional(),
    GOOGLE_CLIENT_ID: z.string().optional(),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    MAIL_FROM: z.string().default('FinTrack <no-reply@fintrack.local>'),
    MAIL_DELIVERY: z.enum(['smtp', 'outbox']).default('outbox'),
    MAIL_OUTBOX_PATH: z.string().default('./data/outbox'),
    ACCESS_TOKEN_SECONDS: z.coerce.number().int().min(60).max(3600).default(900),
    SESSION_IDLE_SECONDS: z.coerce.number().int().min(60).max(86400).default(1800),
    SESSION_NORMAL_SECONDS: z.coerce.number().int().min(300).default(28800),
    SESSION_PERSISTENT_SECONDS: z.coerce.number().int().min(300).default(2592000),
  })
  .superRefine((value, ctx) => {
    if (value.NODE_ENV === 'production') {
      if (
        !value.JWT_SECRET ||
        value.JWT_SECRET.length < 32 ||
        value.JWT_SECRET.startsWith('replace-')
      )
        ctx.addIssue({
          code: 'custom',
          path: ['JWT_SECRET'],
          message: 'Production requires a random secret of at least 32 characters.',
        });
      if (value.DEMO_MODE === 'true')
        ctx.addIssue({
          code: 'custom',
          path: ['DEMO_MODE'],
          message: 'Development demo mode is not permitted in production.',
        });
      if (!value.FRONTEND_ORIGIN.startsWith('https://'))
        ctx.addIssue({
          code: 'custom',
          path: ['FRONTEND_ORIGIN'],
          message: 'Production frontend must use HTTPS.',
        });
      if (!value.MFA_HMAC_SECRET)
        ctx.addIssue({
          code: 'custom',
          path: ['MFA_HMAC_SECRET'],
          message: 'Production requires a separate MFA HMAC secret.',
        });
      if (
          value.MAIL_DELIVERY === 'outbox' ||
          (value.MAIL_DELIVERY === 'smtp' && !value.SMTP_HOST) ||
          (value.MAIL_DELIVERY === 'resend' && !value.RESEND_API_KEY)
        )
        ctx.addIssue({
          code: 'custom',
          path: ['MAIL_DELIVERY'],
          message: 'Production authentication requires a configured SMTP delivery transport.',
        });
    }
  });
const result = schema.safeParse(process.env);
if (!result.success)
  throw new Error(
    'Invalid environment: ' +
      result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
  );
export const env = result.data;
export const jwtSecret =
  env.JWT_SECRET && !env.JWT_SECRET.startsWith('replace-')
    ? env.JWT_SECRET
    : randomBytes(48).toString('hex');
