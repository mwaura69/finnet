import { ApiError } from '../errors.js';
import type { Holding, LedgerTransaction } from '../types.js';
/** Moving-average cost. Demo valuation uses latest recorded trade price, not a market feed. */
export function summarize(transactions: LedgerTransaction[]) {
  const positions = new Map<string, { quantity: number; cost: number; price: number }>();
  let realizedGain = 0;
  const ledger = [...transactions].sort((a,b) => a.tradeDate.localeCompare(b.tradeDate) || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  for (const tx of ledger) {
    const p = positions.get(tx.instrument) || { quantity: 0, cost: 0, price: 0 };
    if (tx.type === 'BUY') { p.quantity += tx.quantity; p.cost += tx.quantity * tx.unitPrice; }
    else {
      if (tx.quantity > p.quantity + 1e-8) throw new ApiError(422, 'INSUFFICIENT_HOLDINGS', `Cannot sell ${tx.quantity} ${tx.instrument}; only ${p.quantity} held on ${tx.tradeDate}.`);
      const average = p.quantity ? p.cost / p.quantity : 0;
      p.quantity -= tx.quantity; p.cost -= average * tx.quantity;
      realizedGain += tx.quantity * (tx.unitPrice - average);
      if (Math.abs(p.quantity) < 1e-8) { p.quantity = 0; p.cost = 0; }
    }
    p.price = tx.unitPrice;
    positions.set(tx.instrument,p);
  }
  const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
  const holdings: Holding[] = [...positions.entries()].filter(([,p]) => p.quantity > 0).map(([instrument,p]) => ({ instrument, netQuantity: p.quantity, averageCost: round(p.cost/p.quantity), totalInvested: round(p.cost), unitPrice: p.price, totalValue: round(p.quantity*p.price), unrealizedGain: round(p.quantity*p.price-p.cost) }));
  const totalInvested = round(holdings.reduce((s,h) => s+h.totalInvested,0));
  const totalValue = round(holdings.reduce((s,h) => s+h.totalValue,0));
  return { holdings, totalInvested, totalValue, unrealizedGain: round(totalValue-totalInvested), realizedGain: round(realizedGain), valuationMethod: 'latest-transaction-price' as const };
}
