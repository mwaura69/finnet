import type { z } from 'zod';
import type { loginSchema, registerSchema } from './auth.schema.js';
import type { UserDto } from '../users/user.types.js';
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export interface SessionDto {
  token: string;
  user: UserDto;
  demoMode: boolean;
}
