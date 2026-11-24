import type { DatabaseSync } from 'node:sqlite';
import type { LedgerTransaction } from '../types/index.js';
export function readLedger(db: DatabaseSync, portfolioId: string): LedgerTransaction[] {
  return db
    .prepare(
      'SELECT id,instrument,type,quantity,unit_price_minor/100.0 AS unitPrice,trade_date AS tradeDate,created_at AS createdAt FROM transactions WHERE portfolio_id=? ORDER BY trade_date DESC,created_at DESC,id DESC',
    )
    .all(portfolioId) as unknown as LedgerTransaction[];
}
