import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import * as controller from './portfolio.controller.js';
import { portfolioSchema, memberSchema, memberEmailSchema } from './portfolio.schema.js';
import { validate } from '../../../middleware/validate.middleware.js';
import { requireAuth } from '../../../middleware/auth.middleware.js';
export const portfolioRouter = Router();
portfolioRouter.use(requireAuth);
portfolioRouter.use(
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
          message: 'Too many portfolio requests. Please wait a minute.',
        },
      }),
  }),
);
portfolioRouter.route('/').get(controller.list).post(validate(portfolioSchema), controller.create);
portfolioRouter
  .route('/:id')
  .get(controller.get)
  .put(validate(portfolioSchema), controller.update)
  .delete(controller.remove);
portfolioRouter.get('/:id/summary', controller.summary);
portfolioRouter
  .route('/:id/members')
  .get(controller.members)
  .put(validate(memberEmailSchema), controller.grantEmail);
portfolioRouter
  .route('/:id/members/:userId')
  .put(validate(memberSchema), controller.grant)
  .delete(controller.revoke);
