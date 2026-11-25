import type { Database } from '../db/connection.js';
import type { LedgerTransaction } from '../types/index.js';
export async function readLedger(db: Database, portfolioId: string): Promise<LedgerTransaction[]> {
  return (await db
    .prepare(
      'SELECT id,instrument,type,quantity,unit_price_minor/100.0 AS unitPrice,trade_date AS tradeDate,created_at AS createdAt FROM transactions WHERE portfolio_id=? ORDER BY trade_date DESC,created_at DESC,id DESC',
    )
    .all(portfolioId)) as unknown as LedgerTransaction[];
}
