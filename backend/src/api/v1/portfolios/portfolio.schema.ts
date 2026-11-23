import { z } from 'zod';

export const portfolioSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    clientName: z.string().trim().min(2).max(100),
    baseCurrency: z.enum(['KES', 'USD']),
  })
  .strict();
