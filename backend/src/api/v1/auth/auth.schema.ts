import { z } from 'zod';
export const passwordSchema = z
  .string()
  .min(8, 'Use at least 8 characters.')
  .max(72)
  .refine((s) => Buffer.byteLength(s, 'utf8') <= 72, 'Use no more than 72 UTF-8 bytes.')
  .regex(/[a-z]/, 'Include a lowercase letter.')
  .regex(/[A-Z]/, 'Include an uppercase letter.')
  .regex(/[0-9]/, 'Include a number.')
  .regex(/[^A-Za-z0-9\s]/, 'Include a symbol.');
const email = z
  .email()
  .max(254)
  .transform((s) => s.toLowerCase());
export const registerSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    email,
    password: passwordSchema,
    acceptTerms: z.literal(true),
  })
  .strict();
export const loginSchema = z
  .object({ email, password: z.string().min(1).max(72), stayLoggedIn: z.boolean().optional() })
  .strict();
export const googleLoginSchema = z
  .object({
    credential: z.string().min(10).max(20000),
    stayLoggedIn: z.boolean().optional(),
    acceptTerms: z.literal(true).optional(),
  })
  .strict();
export const emailSchema = z.object({ email }).strict();
export const tokenSchema = z.object({ token: z.string().min(20).max(200) }).strict();
export const resetPasswordSchema = tokenSchema.extend({ password: passwordSchema });
export const changePasswordSchema = z
  .object({ currentPassword: z.string().min(1).max(72), password: passwordSchema })
  .strict();
export const mfaVerifySchema = z
  .object({ challengeId: z.string().uuid(), code: z.string().regex(/^\d{6}$/) })
  .strict();
export const mfaResendSchema = z.object({ challengeId: z.string().uuid() }).strict();
