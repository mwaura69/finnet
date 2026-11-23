import { randomUUID } from 'node:crypto';
import { db } from '../../../db/index.js';
import type { PortfolioModel } from '../../../db/models/portfolio.model.js';
import type { PortfolioInput } from './portfolio.types.js';
/** Query layer ready for your production service; authorization and ledger rules belong in services. */
export class PortfolioRepository {
  findAllByOwner(userId: string) {
    return db
      .prepare('SELECT * FROM portfolios WHERE user_id=? ORDER BY created_at DESC,id')
      .all(userId) as unknown as PortfolioModel[];
  }
  findOwned(userId: string, id: string) {
    return db
      .prepare('SELECT * FROM portfolios WHERE id=? AND user_id=?')
      .get(id, userId) as unknown as PortfolioModel | undefined;
  }
  create(userId: string, input: PortfolioInput) {
    const id = randomUUID();
    db.prepare(
      'INSERT INTO portfolios(id,user_id,name,client_name,base_currency) VALUES(?,?,?,?,?)',
    ).run(id, userId, input.name, input.clientName, input.baseCurrency);
    return this.findOwned(userId, id)!;
  }
  update(userId: string, id: string, input: PortfolioInput) {
    db.prepare(
      'UPDATE portfolios SET name=?,client_name=?,base_currency=? WHERE id=? AND user_id=?',
    ).run(input.name, input.clientName, input.baseCurrency, id, userId);
    return this.findOwned(userId, id);
  }
  remove(userId: string, id: string) {
    return db.prepare('DELETE FROM portfolios WHERE id=? AND user_id=?').run(id, userId);
  }
}
