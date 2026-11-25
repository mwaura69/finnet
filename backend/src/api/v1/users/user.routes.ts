import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import { validate } from '../../../middleware/validate.middleware.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { db } from '../../../db/index.js';
import { UserService } from './user.service.js';
import { mfaService } from '../auth/mfa.service.js';
import { UserRepository } from './user.repository.js';
import { activeSession } from '../../../security/sessions.js';
import { verifyPassword } from '../../../utils/hash.js';
import { ApiError } from '../../../utils/ApiError.js';
export const userRouter = Router();
userRouter.use(requireAuth);
const service = new UserService();
userRouter.get('/me', async (req, res) => res.json({ data: await service.me(req.userId) }));
const avatar = z
  .string()
  .max(1400000)
  .refine((value) => {
    const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(value);
    if (!match) return false;
    const b = Buffer.from(match[2], 'base64');
    return (
      b.length <= 1048576 &&
      ((match[1] === 'png' &&
        b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) ||
        (match[1] === 'jpeg' && b[0] === 255 && b[1] === 216 && b[2] === 255) ||
        (match[1] === 'webp' &&
          b.toString('ascii', 0, 4) === 'RIFF' &&
          b.toString('ascii', 8, 12) === 'WEBP'))
    );
  }, 'Choose a valid PNG, JPEG or WebP image no larger than 1 MB.')
  .nullable();
userRouter.patch(
  '/me',
  validate(
    z
      .object({
        name: z.string().trim().min(2).max(100).optional(),
        avatarUrl: avatar.optional(),
        onboardingCompleted: z.boolean().optional(),
      })
      .strict(),
  ),
  async (req, res) => {
    for (const [key, column] of [
      ['name', 'name'],
      ['avatarUrl', 'avatar_url'],
      ['onboardingCompleted', 'onboarding_completed'],
    ]) {
      if (req.body[key] !== undefined)
        await db
          .prepare(`UPDATE users SET ${column}=? WHERE id=?`)
          .run(
            typeof req.body[key] === 'boolean' ? Number(req.body[key]) : req.body[key],
            req.userId,
          );
    }
    res.json({ data: await service.me(req.userId) });
  },
);
userRouter.patch(
  '/me/preferences',
  validate(
    z
      .object({
        transactionEmails: z.boolean().optional(),
        productEmails: z.boolean().optional(),
        emailMfaEnabled: z.boolean().optional(),
        currentPassword: z.string().max(72).optional(),
      })
      .strict(),
  ),
  asyncHandler(async (req, res) => {
    const user = (await new UserRepository().findById(req.userId))!;
    if (req.body.emailMfaEnabled === true && !user.email_mfa_enabled) {
      res.json({ data: await mfaService.create(user, 'enable', false, req.sessionId) });
      return;
    }
    if (req.body.emailMfaEnabled === false && user.email_mfa_enabled) {
      const session = await activeSession(req.sessionId);
      if (
        !(session.mfa_verified_at && session.mfa_verified_at > Date.now() - 600000) &&
        !(
          user.password_hash &&
          req.body.currentPassword &&
          (await verifyPassword(req.body.currentPassword, user.password_hash))
        )
      )
        throw new ApiError(
          403,
          'REAUTHENTICATION_REQUIRED',
          'Verify your current password before disabling MFA.',
        );
    }
    for (const [key, column] of [
      ['transactionEmails', 'transaction_emails'],
      ['productEmails', 'product_emails'],
      ['emailMfaEnabled', 'email_mfa_enabled'],
    ])
      if (req.body[key] !== undefined)
        await db
          .prepare(`UPDATE users SET ${column}=? WHERE id=?`)
          .run(Number(req.body[key]), req.userId);
    res.json({ data: await service.me(req.userId) });
  }),
);
