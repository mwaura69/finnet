import { Router, type Request, type Response } from 'express';
import type { z } from 'zod';
import { AuthService } from './auth.service.js';
import * as schemas from './auth.schema.js';
import { validate } from '../../../middleware/validate.middleware.js';
import { authRateLimit } from '../../../middleware/rateLimit.middleware.js';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import {
  csrfToken,
  cookies,
  setSessionCookies,
  clearSessionCookies,
} from '../../../security/cookies.js';
import { config } from '../../../config/index.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
export const authRouter = Router();
const service = new AuthService();
type AuthResponse =
  | Awaited<ReturnType<AuthService['login']>>
  | Awaited<ReturnType<AuthService['resendMfa']>>
  | {
      message: string;
    };
function result(res: Response, value: AuthResponse) {
  if ('kind' in value) {
    if (value.kind === 'session') setSessionCookies(res, value.cookies);
    res.json({ data: value.data });
  } else res.json({ data: value });
}
authRouter.get('/csrf', (req, res) => res.json({ data: { csrfToken: csrfToken(req, res) } }));
authRouter.get('/config', (_req, res) =>
  res.json({
    data: {
      googleClientId: config.google.clientId || null,
      emailDelivery: config.mail.delivery,
      passwordPolicy: { minLength: 8 },
    },
  }),
);
function action<T extends z.ZodType>(
  path: string,
  schema: T,
  handler: (body: z.output<T>, req: Request) => AuthResponse | Promise<AuthResponse>,
) {
  authRouter.post(
    path,
    authRateLimit,
    validate(schema),
    asyncHandler(async (req, res) => result(res, await handler(req.body as z.output<T>, req))),
  );
}
action('/register', schemas.registerSchema, async (body) => await service.register(body));
action('/login', schemas.loginSchema, async (body) => await service.login(body));
action('/google', schemas.googleLoginSchema, async (body) => await service.google(body));
action(
  '/mfa/verify',
  schemas.mfaVerifySchema,
  async (body, req) => await service.verifyMfa(body, cookies(req).ft_access),
);
action('/mfa/resend', schemas.mfaResendSchema, async (body) => await service.resendMfa(body));
action('/verify-email', schemas.tokenSchema, async (body) => await service.verifyEmail(body.token));
action(
  '/forgot-password',
  schemas.emailSchema,
  async (body) => await service.forgotPassword(body.email),
);
action(
  '/resend-verification',
  schemas.emailSchema,
  async (body, req) => await service.resendVerification(body.email, req.requestId),
);
action(
  '/reset-password',
  schemas.resetPasswordSchema,
  async (body) => await service.resetPassword(body, 'reset'),
);
action(
  '/set-password',
  schemas.resetPasswordSchema,
  async (body) => await service.resetPassword(body, 'set'),
);
authRouter.post(
  '/refresh',
  authRateLimit,
  asyncHandler(async (req, res) => result(res, await service.refresh(cookies(req).ft_refresh))),
);
authRouter.post('/logout', async (req, res) => {
  await service.logout(undefined, cookies(req).ft_refresh);
  clearSessionCookies(res);
  res.json({ data: { message: 'Signed out.' } });
});
authRouter.get('/me', requireAuth, async (req, res) =>
  res.json({ data: await service.me(req.sessionId) }),
);
authRouter.post(
  '/request-set-password',
  requireAuth,
  asyncHandler(async (req, res) =>
    res.json({ data: await service.requestSetPassword(req.userId) }),
  ),
);
authRouter.post(
  '/change-password',
  requireAuth,
  validate(schemas.changePasswordSchema),
  asyncHandler(async (req, res) => {
    const data = await service.changePassword(req.userId, req.body);
    clearSessionCookies(res);
    res.json({ data });
  }),
);
