import { randomUUID } from 'node:crypto';
import { db } from '../../../db/index.js';
import type { PortfolioModel } from '../../../db/models/portfolio.model.js';
import type { PortfolioInput } from './portfolio.types.js';
/** Query layer ready for your production service; authorization and ledger rules belong in services. */
export class PortfolioRepository {
  async findAllByOwner(userId: string) {
    return (await db
      .prepare('SELECT * FROM portfolios WHERE user_id=? ORDER BY created_at DESC,id')
      .all(userId)) as unknown as PortfolioModel[];
  }
  async findOwned(userId: string, id: string) {
    return (await db
      .prepare('SELECT * FROM portfolios WHERE id=? AND user_id=?')
      .get(id, userId)) as unknown as PortfolioModel | undefined;
  }
  async create(userId: string, input: PortfolioInput) {
    const id = randomUUID();
    await db
      .prepare(
        'INSERT INTO portfolios(id,user_id,name,client_name,base_currency) VALUES(?,?,?,?,?)',
      )
      .run(id, userId, input.name, input.clientName, input.baseCurrency);
    return (await this.findOwned(userId, id))!;
  }
  async update(userId: string, id: string, input: PortfolioInput) {
    await db
      .prepare(
        'UPDATE portfolios SET name=?,client_name=?,base_currency=? WHERE id=? AND user_id=?',
      )
      .run(input.name, input.clientName, input.baseCurrency, id, userId);
    return await this.findOwned(userId, id);
  }
  async remove(userId: string, id: string) {
    return await db.prepare('DELETE FROM portfolios WHERE id=? AND user_id=?').run(id, userId);
  }
}
