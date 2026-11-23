import { z } from 'zod';
export const registerSchema = z.object({name:z.string().trim().min(2).max(100),email:z.email().max(254).transform(s=>s.toLowerCase()),password:z.string().min(12).max(72)}).strict();
export const loginSchema = z.object({email:z.email().transform(s=>s.toLowerCase()),password:z.string().min(1).max(72)}).strict();
export const portfolioSchema = z.object({name:z.string().trim().min(2).max(100),clientName:z.string().trim().min(2).max(100),baseCurrency:z.enum(['KES','USD'])}).strict();
const realDate = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date)) && new Date(date).toISOString().slice(0,10) === date;
export const transactionSchema = z.object({
  instrument:z.string().trim().toUpperCase().regex(/^[A-Z0-9][A-Z0-9.-]{0,19}$/),
  type:z.enum(['BUY','SELL']),quantity:z.number().finite().positive().max(1e9),
  unitPrice:z.number().finite().positive().max(1e9).refine(n=>Math.abs(n*100-Math.round(n*100))<0.00001,'Use at most two decimal places.'),
  tradeDate:z.string().refine(realDate,'Enter a valid YYYY-MM-DD date.').refine(d=>d <= new Date().toISOString().slice(0,10),'Trade date cannot be in the future.'),
}).strict();
