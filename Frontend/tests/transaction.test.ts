import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateTrade } from '../src/app/shared/transaction-validation';
const valid = {
  instrument: 'SCOM',
  type: 'BUY' as const,
  quantity: 100,
  unitPrice: 25,
  tradeDate: '2026-01-01',
};
test('trade validation rejects impossible dates, future dates, blank fields and invalid amounts', () => {
  assert.deepEqual(validateTrade(valid, '2026-01-02'), {});
  for (const tradeDate of ['', '2026-02-30', '2026-01-03'])
    assert.ok(validateTrade({ ...valid, tradeDate }, '2026-01-02')['tradeDate']);
  const errors = validateTrade(
    { ...valid, instrument: '', quantity: 0, unitPrice: -1 },
    '2026-01-02',
  );
  for (const field of ['instrument', 'quantity', 'unitPrice']) assert.ok(errors[field]);
  assert.ok(validateTrade({ ...valid, unitPrice: 1.123 }, '2026-01-02')['unitPrice']);
  assert.deepEqual(
    validateTrade({ ...valid, instrument: 't-bill-91', quantity: 0.001 }, '2026-01-02'),
    {},
  );
});
