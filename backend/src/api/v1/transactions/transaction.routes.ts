import { Router } from 'express';
import * as controller from './transaction.controller.js';
import { transactionSchema } from './transaction.schema.js';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import { validate } from '../../../middleware/validate.middleware.js';

export const transactionRouter = Router();
transactionRouter.use(requireAuth);
transactionRouter
  .route('/portfolios/:id/transactions')
  .get(controller.list)
  .post(validate(transactionSchema), controller.create);
transactionRouter.delete('/transactions/:id', controller.remove);
