import type { z } from 'zod';
import type { loginSchema, registerSchema, googleLoginSchema } from './auth.schema.js';
import type { UserDto } from '../users/user.types.js';
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type GoogleInput = z.infer<typeof googleLoginSchema>;
export interface SessionDto {
  user: UserDto;
  demoMode: boolean;
  session: { accessExpiresAt: string; sessionExpiresAt: string; idleTimeoutSeconds: number };
}
export interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
  picture?: string;
}
