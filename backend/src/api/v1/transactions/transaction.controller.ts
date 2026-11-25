import { asyncHandler } from '../../../utils/asyncHandler.js';
import { business, flushTransactionNotifications } from '../services.js';
import { transactionFilterSchema } from './transaction.schema.js';
export const list = asyncHandler(async (req, res) =>
  res.json({ data: await business.transactions.list(req.userId, String(req.params['id'])) }),
);
export const create = asyncHandler(async (req, res) => {
  const transaction = await business.transactions.create(
    req.userId,
    String(req.params['id']),
    req.body,
  );
  await flushTransactionNotifications();
  res.status(201).json({ data: transaction });
});
export const remove = asyncHandler(async (req, res) => {
  await business.transactions.remove(req.userId, String(req.params['id']));
  await flushTransactionNotifications();
  res.sendStatus(204);
});
export const receipt = asyncHandler(async (req, res) =>
  res.json({ data: await business.transactions.receipt(req.userId, String(req.params['id'])) }),
);
export const exportWorkbook = asyncHandler(async (req, res) => {
  const exported = await business.transactions.exportWorkbook(
    req.userId,
    String(req.params['id']),
    transactionFilterSchema.parse(req.query),
  );
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
  res.setHeader('Content-Disposition', `attachment; filename="${exported.filename}"`);
  res.setHeader('Cache-Control', 'no-store');
  res.send(exported.buffer);
});
