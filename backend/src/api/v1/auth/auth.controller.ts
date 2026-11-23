import { asyncHandler } from '../../../utils/asyncHandler.js';
import { AuthService } from './auth.service.js';
const service = new AuthService();
export const register = asyncHandler(async (req, res) => {
  res.status(201).json({ data: await service.register(req.body) });
});
export const login = asyncHandler(async (req, res) => {
  res.json({ data: await service.login(req.body) });
});
