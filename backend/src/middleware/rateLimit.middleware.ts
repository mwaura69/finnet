import { rateLimit } from 'express-rate-limit';
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_req, res) =>
    res.status(429).json({
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many sign-in attempts. Try again in 15 minutes.',
      },
    }),
});
