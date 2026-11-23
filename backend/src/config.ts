import 'dotenv/config';
import { randomBytes } from 'node:crypto';
const production = process.env['NODE_ENV'] === 'production';
const suppliedSecret = process.env['JWT_SECRET'];
if (production && (!suppliedSecret || suppliedSecret.length < 32 || suppliedSecret.startsWith('replace-'))) {
  throw new Error('Production requires a random JWT_SECRET of at least 32 characters.');
}
if (production && process.env['DEMO_MODE'] === 'true') throw new Error('Demo adapter is development-only. Implement the production service first.');
export const config = {
  port: Number(process.env['PORT'] || 3000),
  production,
  demo: process.env['DEMO_MODE'] === 'true',
  secret: suppliedSecret && !suppliedSecret.startsWith('replace-') ? suppliedSecret : randomBytes(48).toString('hex'),
  database: process.env['DATABASE_PATH'] || './data/fintrack.sqlite',
  origin: process.env['FRONTEND_ORIGIN'] || 'http://localhost:4200',
};
