import { Router } from 'express';
import { readFileSync } from 'node:fs';
import swaggerUi from 'swagger-ui-express';
import { authRouter } from './auth/auth.routes.js';
import { userRouter } from './users/user.routes.js';
import { portfolioRouter } from './portfolios/portfolio.routes.js';
import { transactionRouter } from './transactions/transaction.routes.js';
export const v1Router = Router();
const spec = JSON.parse(readFileSync(new URL('../../../openapi.json', import.meta.url), 'utf8'));
v1Router.get('/openapi.json', (_req, res) => res.json(spec));
v1Router.use(
  '/docs',
  swaggerUi.serve,
  swaggerUi.setup(spec, { customSiteTitle: 'FinTrack API documentation' }),
);
v1Router.use('/auth', authRouter);
v1Router.use('/users', userRouter);
v1Router.use('/portfolios', portfolioRouter);
v1Router.use('/', transactionRouter);
