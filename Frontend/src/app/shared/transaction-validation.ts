import type { TransactionInput } from '../core/models';
export type TradeDraft = Omit<TransactionInput, 'quantity' | 'unitPrice'> & {
  quantity: number | null;
  unitPrice: number | null;
};
export function validateTrade(value: TradeDraft, today: string): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!/^[A-Z0-9][A-Z0-9.-]{0,19}$/.test(value.instrument.trim().toUpperCase()))
    errors['instrument'] = 'Enter an instrument using up to 20 letters, numbers, dots or hyphens.';
  if (!['BUY', 'SELL'].includes(value.type)) errors['type'] = 'Choose BUY or SELL.';
  for (const field of ['quantity', 'unitPrice'] as const) {
    if (
      typeof value[field] !== 'number' ||
      !Number.isFinite(value[field]) ||
      value[field]! <= 0 ||
      value[field]! > 1e9
    )
      errors[field] = 'Enter a number greater than 0 and no more than 1,000,000,000.';
  }
  if (
    !errors['unitPrice'] &&
    value.unitPrice !== null &&
    Math.abs(value.unitPrice * 100 - Math.round(value.unitPrice * 100)) > 0.00001
  )
    errors['unitPrice'] = 'Use at most two decimal places.';
  const date = value.tradeDate;
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(date)) ||
    new Date(date).toISOString().slice(0, 10) !== date
  )
    errors['tradeDate'] = 'Enter a valid trade date.';
  else if (date > today) errors['tradeDate'] = 'Trade date cannot be in the future.';
  return errors;
}
