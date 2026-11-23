import type { Request, Response } from 'express';
import { config } from '../../../config/index.js';
import { UserService } from './user.service.js';
const service = new UserService();
export function me(req: Request, res: Response) {
  res.json({ data: { user: service.me(req.userId), demoMode: config.demo } });
}
