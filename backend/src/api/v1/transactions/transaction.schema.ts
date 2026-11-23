import { z } from 'zod';

const realDate = (date: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(date) &&
  !Number.isNaN(Date.parse(date)) &&
  new Date(date).toISOString().slice(0, 10) === date;
const today = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
export const transactionSchema = z
  .object({
    instrument: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9][A-Z0-9.-]{0,19}$/),
    type: z.enum(['BUY', 'SELL']),
    quantity: z.number().finite().positive().max(1e9),
    unitPrice: z
      .number()
      .finite()
      .positive()
      .max(1e9)
      .refine(
        (n) => Math.abs(n * 100 - Math.round(n * 100)) < 0.00001,
        'Use at most two decimal places.',
      ),
    tradeDate: z
      .string()
      .refine(realDate, 'Enter a valid YYYY-MM-DD date.')
      .refine((d) => d <= today(), 'Trade date cannot be in the future.'),
  })
  .strict();
