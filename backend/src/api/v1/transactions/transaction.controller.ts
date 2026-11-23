import { asyncHandler } from '../../../utils/asyncHandler.js';
import { business } from '../services.js';
export const list = asyncHandler(async (req, res) =>
  res.json({ data: await business.transactions.list(req.userId, String(req.params['id'])) }),
);
export const create = asyncHandler(async (req, res) =>
  res
    .status(201)
    .json({
      data: await business.transactions.create(req.userId, String(req.params['id']), req.body),
    }),
);
export const remove = asyncHandler(async (req, res) => {
  await business.transactions.remove(req.userId, String(req.params['id']));
  res.sendStatus(204);
});
