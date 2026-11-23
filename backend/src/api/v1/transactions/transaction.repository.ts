import { db } from '../../../db/index.js';
import type { TransactionDto } from './transaction.types.js';
import type { TransactionModel } from '../../../db/models/transaction.model.js';

export class TransactionRepository {
  list(portfolioId: string) {
    return db
      .prepare(
        'SELECT id,instrument,type,quantity,unit_price_minor/100.0 AS unitPrice,trade_date AS tradeDate,created_at AS createdAt FROM transactions WHERE portfolio_id=? ORDER BY trade_date DESC,created_at DESC,id DESC',
      )
      .all(portfolioId) as unknown as TransactionDto[];
  }
  findOwned(userId: string, id: string) {
    return db
      .prepare(
        'SELECT t.* FROM transactions t JOIN portfolios p ON p.id=t.portfolio_id WHERE t.id=? AND p.user_id=?',
      )
      .get(id, userId) as unknown as TransactionModel | undefined;
  }
  create(portfolioId: string, tx: TransactionDto) {
    db.prepare(
      'INSERT INTO transactions(id,portfolio_id,instrument,type,quantity,unit_price_minor,trade_date,created_at) VALUES(?,?,?,?,?,?,?,?)',
    ).run(
      tx.id,
      portfolioId,
      tx.instrument,
      tx.type,
      tx.quantity,
      Math.round(tx.unitPrice * 100),
      tx.tradeDate,
      tx.createdAt,
    );
    return tx;
  }
  remove(id: string) {
    return db.prepare('DELETE FROM transactions WHERE id=?').run(id);
  }
}
