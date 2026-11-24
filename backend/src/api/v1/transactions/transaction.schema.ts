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
const filterDate = z
  .string()
  .refine((value) => value === '' || realDate(value), 'Enter a valid YYYY-MM-DD date.')
  .optional();
export const transactionFilterSchema = z
  .object({
    instrument: z.string().trim().max(20).optional(),
    type: z.enum(['BUY', 'SELL', '']).optional(),
    from: filterDate,
    to: filterDate,
    sort: z.enum(['tradeDate', 'instrument', 'quantity', 'unitPrice', 'amount']).optional(),
    direction: z.enum(['asc', 'desc']).optional(),
  })
  .strict()
  .refine(
    (value) => !value.from || !value.to || value.from <= value.to,
    'The start date must be on or before the end date.',
  );
