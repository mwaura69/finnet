import { asyncHandler } from '../../../utils/asyncHandler.js';
import { business, flushTransactionNotifications } from '../services.js';
export const list = asyncHandler(async (req, res) =>
  res.json({ data: await business.portfolios.list(req.userId) }),
);
export const get = asyncHandler(async (req, res) =>
  res.json({ data: await business.portfolios.get(req.userId, String(req.params['id'])) }),
);
export const create = asyncHandler(async (req, res) =>
  res.status(201).json({ data: await business.portfolios.create(req.userId, req.body) }),
);
export const update = asyncHandler(async (req, res) =>
  res.json({
    data: await business.portfolios.update(req.userId, String(req.params['id']), req.body),
  }),
);
export const remove = asyncHandler(async (req, res) => {
  await business.portfolios.remove(req.userId, String(req.params['id']));
  await flushTransactionNotifications();
  res.sendStatus(204);
});
export const summary = asyncHandler(async (req, res) =>
  res.json({ data: await business.portfolios.summary(req.userId, String(req.params['id'])) }),
);
export const members = asyncHandler(async (req, res) =>
  res.json({ data: await business.portfolios.members(req.userId, String(req.params['id'])) }),
);
export const grant = asyncHandler(async (req, res) =>
  res.json({
    data: await business.portfolios.grant(
      req.userId,
      String(req.params['id']),
      { userId: String(req.params['userId']) },
      req.body.permission,
    ),
  }),
);
export const grantEmail = asyncHandler(async (req, res) =>
  res.json({
    data: await business.portfolios.grant(
      req.userId,
      String(req.params['id']),
      { email: req.body.email },
      req.body.permission,
    ),
  }),
);
export const revoke = asyncHandler(async (req, res) => {
  await business.portfolios.revoke(
    req.userId,
    String(req.params['id']),
    String(req.params['userId']),
  );
  res.sendStatus(204);
});
