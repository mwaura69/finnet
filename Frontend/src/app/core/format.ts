import type { Currency } from './models';
export const money = (n: number, currency: Currency = 'KES') =>
  `${currency} ${new Intl.NumberFormat('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)}`;
export const number = (n: number) =>
  new Intl.NumberFormat('en-KE', { maximumFractionDigits: 4 }).format(n);
export const signedMoney = (n: number, currency: Currency) =>
  `${n >= 0 ? '+' : '−'}${money(Math.abs(n), currency)}`;
export const percentage = (gain: number, cost: number) =>
  `${gain >= 0 ? '+' : '−'}${(cost ? (Math.abs(gain) / cost) * 100 : 0).toFixed(2)}%`;
export function csvCell(value: unknown): string {
  return (
    '"' +
    String(value)
      .replace(/^[=+\-@\t\r]/, (v) => "'" + v)
      .replace(/"/g, '""') +
    '"'
  );
}
