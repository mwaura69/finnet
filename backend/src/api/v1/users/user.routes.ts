import { Router } from 'express';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import { me } from './user.controller.js';
export const userRouter = Router();
userRouter.get('/me', requireAuth, me);
