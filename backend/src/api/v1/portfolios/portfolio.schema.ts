import { z } from 'zod';

export const portfolioSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    clientName: z.string().trim().min(2).max(100),
    baseCurrency: z.enum(['KES', 'USD']),
  })
  .strict();
export const memberSchema = z.object({ permission: z.enum(['read', 'write']) }).strict();
export const memberEmailSchema = z
  .object({
    email: z
      .email()
      .max(254)
      .transform((s) => s.toLowerCase()),
    permission: z.enum(['read', 'write']),
  })
  .strict();
