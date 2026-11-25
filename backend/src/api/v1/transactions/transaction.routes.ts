import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import * as controller from './transaction.controller.js';
import { transactionSchema } from './transaction.schema.js';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import { validate } from '../../../middleware/validate.middleware.js';

export const transactionRouter = Router();
transactionRouter.use(requireAuth);
transactionRouter.use(
  rateLimit({
    windowMs: 60_000,
    limit: 120,
    keyGenerator: (req) => req.userId,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, res) =>
      res.status(429).json({
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many transaction requests. Please wait a minute.',
        },
      }),
  }),
);
transactionRouter
  .route('/portfolios/:id/transactions')
  .get(controller.list)
  .post(validate(transactionSchema), controller.create);
transactionRouter.delete('/transactions/:id', controller.remove);
transactionRouter.get('/portfolios/:id/transactions/export.xlsx', controller.exportWorkbook);
transactionRouter.get('/transactions/:id/receipt', controller.receipt);
