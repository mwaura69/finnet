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
          message: 'The demo adapter is development-only. Implement the production service first.',
        });
      if (!value.FRONTEND_ORIGIN.startsWith('https://'))
        ctx.addIssue({
          code: 'custom',
          path: ['FRONTEND_ORIGIN'],
          message: 'Production frontend origin must use HTTPS.',
        });
    }
  });
const raw = schema.safeParse(process.env);
if (!raw.success)
  throw new Error(
    'Invalid environment: ' +
      raw.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
  );
export const env = raw.data;
export const jwtSecret =
  env.JWT_SECRET && !env.JWT_SECRET.startsWith('replace-')
    ? env.JWT_SECRET
    : randomBytes(48).toString('hex');
