import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { ApiError } from '../errors.js';
import { summarize } from '../domain/holdings.js';
import type { LedgerTransaction, PortfolioInput, TransactionInput } from '../types.js';
/** Local preview reference. Data is fictional but persisted and isolated by authenticated user. */
export class DemoPortfolioService {
  constructor(private db: DatabaseSync) {}
  private owned(user: string,id: string) {
    const p = this.db.prepare('SELECT id,name,client_name AS clientName,base_currency AS baseCurrency,created_at AS createdAt FROM portfolios WHERE id=? AND user_id=?').get(id,user);
    if (!p) throw new ApiError(404,'PORTFOLIO_NOT_FOUND','This portfolio could not be found.');
    return p;
  }
  private ledger(id: string): LedgerTransaction[] {
    return this.db.prepare('SELECT id,instrument,type,quantity,unit_price_minor / 100.0 AS unitPrice,trade_date AS tradeDate,created_at AS createdAt FROM transactions WHERE portfolio_id=? ORDER BY trade_date DESC,created_at DESC,id DESC').all(id) as unknown as LedgerTransaction[];
  }
  list(user: string) {
    return this.db.prepare('SELECT id FROM portfolios WHERE user_id=? ORDER BY created_at DESC,id').all(user).map(p => this.get(user,String(p['id'])));
  }
  get(user: string,id: string) {
    const p = this.owned(user,id); const transactions = this.ledger(id); const s = summarize(transactions);
    return { ...p,totalValue:s.totalValue,totalInvested:s.totalInvested,unrealizedGain:s.unrealizedGain,holdingsCount:s.holdings.length,transactionCount:transactions.length };
  }
  create(user: string,input: PortfolioInput) {
    const id = randomUUID();
    this.db.prepare('INSERT INTO portfolios(id,user_id,name,client_name,base_currency) VALUES(?,?,?,?,?)').run(id,user,input.name,input.clientName,input.baseCurrency);
    return this.get(user,id);
  }
  update(user: string,id: string,input: PortfolioInput) {
    const existing = this.owned(user,id);
    if (existing['baseCurrency'] !== input.baseCurrency && this.ledger(id).length) throw new ApiError(422,'CURRENCY_LOCKED','Currency cannot change once a portfolio has transactions.');
    this.db.prepare('UPDATE portfolios SET name=?,client_name=?,base_currency=? WHERE id=?').run(input.name,input.clientName,input.baseCurrency,id);
    return this.get(user,id);
  }
  remove(user: string,id: string) { this.owned(user,id); this.db.prepare('DELETE FROM portfolios WHERE id=?').run(id); }
  transactions(user: string,id: string) { this.owned(user,id); return this.ledger(id); }
  addTransaction(user: string,id: string,input: TransactionInput) {
    this.owned(user,id);
    const tx: LedgerTransaction = {...input,id:randomUUID(),createdAt:new Date().toISOString()};
    // Replay the complete chronological ledger: backdated trades must not invalidate later sells.
    this.db.exec('BEGIN IMMEDIATE');
    try {
      summarize([...this.ledger(id),tx]);
      this.db.prepare('INSERT INTO transactions(id,portfolio_id,instrument,type,quantity,unit_price_minor,trade_date,created_at) VALUES(?,?,?,?,?,?,?,?)').run(tx.id,id,tx.instrument,tx.type,tx.quantity,Math.round(tx.unitPrice*100),tx.tradeDate,tx.createdAt);
      this.db.exec('COMMIT'); return tx;
    } catch(e) { this.db.exec('ROLLBACK'); throw e; }
  }
  removeTransaction(user: string,id: string) {
    const row = this.db.prepare('SELECT t.portfolio_id AS portfolioId FROM transactions t JOIN portfolios p ON p.id=t.portfolio_id WHERE t.id=? AND p.user_id=?').get(id,user);
    if (!row) throw new ApiError(404,'TRANSACTION_NOT_FOUND','This transaction could not be found.');
    this.db.exec('BEGIN IMMEDIATE');
    try {
      summarize(this.ledger(String(row['portfolioId'])).filter(t => t.id !== id));
      this.db.prepare('DELETE FROM transactions WHERE id=?').run(id); this.db.exec('COMMIT');
    } catch(e) { this.db.exec('ROLLBACK'); throw e; }
  }
  summary(user: string,id: string) { this.owned(user,id); return summarize(this.ledger(id)); }
}
