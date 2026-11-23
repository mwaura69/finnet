import { Router } from 'express';
import * as controller from './portfolio.controller.js';
import { portfolioSchema } from './portfolio.schema.js';
import { validate } from '../../../middleware/validate.middleware.js';
import { requireAuth } from '../../../middleware/auth.middleware.js';
export const portfolioRouter = Router();
portfolioRouter.use(requireAuth);
portfolioRouter.route('/').get(controller.list).post(validate(portfolioSchema), controller.create);
portfolioRouter
  .route('/:id')
  .get(controller.get)
  .put(validate(portfolioSchema), controller.update)
  .delete(controller.remove);
portfolioRouter.get('/:id/summary', controller.summary);
