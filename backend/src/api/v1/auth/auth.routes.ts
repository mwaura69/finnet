import { Router } from 'express';
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
function result(res: any, value: any) {
  if (value.kind === 'session') {
    setSessionCookies(res, value.cookies);
    res.json({ data: value.data });
  } else res.json({ data: value.data || value });
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
const action = (path: string, schema: any, fn: any) =>
  authRouter.post(
    path,
    authRateLimit,
    validate(schema),
    asyncHandler(async (req, res) => result(res, await fn(req))),
  );
action('/register', schemas.registerSchema, (req: any) => service.register(req.body));
action('/login', schemas.loginSchema, (req: any) => service.login(req.body));
action('/google', schemas.googleLoginSchema, (req: any) => service.google(req.body));
action('/mfa/verify', schemas.mfaVerifySchema, (req: any) =>
  service.verifyMfa(req.body, cookies(req).ft_access),
);
action('/mfa/resend', schemas.mfaResendSchema, (req: any) => service.resendMfa(req.body));
action('/verify-email', schemas.tokenSchema, (req: any) => service.verifyEmail(req.body.token));
action('/forgot-password', schemas.emailSchema, (req: any) =>
  service.forgotPassword(req.body.email),
);
action('/resend-verification', schemas.emailSchema, (req: any) =>
  service.resendVerification(req.body.email, req.requestId),
);
action('/reset-password', schemas.resetPasswordSchema, (req: any) =>
  service.resetPassword(req.body, 'reset'),
);
action('/set-password', schemas.resetPasswordSchema, (req: any) =>
  service.resetPassword(req.body, 'set'),
);
authRouter.post(
  '/refresh',
  authRateLimit,
  asyncHandler(async (req, res) => result(res, service.refresh(cookies(req).ft_refresh))),
);
authRouter.post('/logout', (req, res) => {
  service.logout(undefined, cookies(req).ft_refresh);
  clearSessionCookies(res);
  res.json({ data: { message: 'Signed out.' } });
});
authRouter.get('/me', requireAuth, (req, res) => res.json({ data: service.me(req.sessionId) }));
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
