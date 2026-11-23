import { z } from 'zod';
const password = z
  .string()
  .max(72)
  .refine((s) => Buffer.byteLength(s, 'utf8') <= 72, 'Password must not exceed 72 UTF-8 bytes.');
export const registerSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    email: z
      .email()
      .max(254)
      .transform((s) => s.toLowerCase()),
    password: password.refine((s) => s.length >= 12, 'Use at least 12 characters.'),
  })
  .strict();
export const loginSchema = z
  .object({
    email: z
      .email()
      .max(254)
      .transform((s) => s.toLowerCase()),
    password: password.refine((s) => s.length >= 1, 'Enter a password.'),
  })
  .strict();
