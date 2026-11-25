import { randomUUID } from 'node:crypto';
import type { Database } from '../../../db/connection.js';
import { db } from '../../../db/index.js';
import { ApiError } from '../../../utils/ApiError.js';
import { PortfolioAccess, atomic } from '../../../domain/business-access.js';
import { readLedger } from '../../../domain/transaction-ledger.js';
import { summarize } from '../../../domain/holdings.js';
import { queueTransactionNotification } from '../../../domain/transaction-notifications.js';
import type { PortfolioInput, PortfolioDto } from './portfolio.types.js';
export class PortfolioService {
  private access: PortfolioAccess;
  constructor(private connection: Database = db) {
    this.access = new PortfolioAccess(connection);
  }
  async list(userId: string): Promise<PortfolioDto[]> {
    const role = await this.access.role(userId);
    const rows =
      role === 'admin'
        ? await this.connection
            .prepare('SELECT id FROM portfolios ORDER BY created_at DESC,id')
            .all()
        : await this.connection
            .prepare(
              'SELECT DISTINCT p.id,p.created_at FROM portfolios p LEFT JOIN portfolio_members m ON m.portfolio_id=p.id AND m.user_id=? WHERE p.user_id=? OR m.user_id=? ORDER BY p.created_at DESC,p.id',
            )
            .all(userId, userId, userId);
    return Promise.all(rows.map(async (p) => await this.get(userId, String(p['id']))));
  }
  async get(userId: string, id: string): Promise<PortfolioDto> {
    const p = await this.access.require(userId, id);
    const ledger = await readLedger(this.connection, id),
      summary = summarize(ledger);
    const { canRead: _canRead, ...permissions } = await this.access.permissions(userId, p);
    return {
      id: p.id,
      name: p.name,
      clientName: p.client_name,
      baseCurrency: p.base_currency,
      createdAt: p.created_at,
      totalValue: summary.totalValue,
      totalInvested: summary.totalInvested,
      unrealizedGain: summary.unrealizedGain,
      holdingsCount: summary.holdings.length,
      transactionCount: ledger.length,
      permissions,
    };
  }
  async create(userId: string, input: PortfolioInput) {
    const id = randomUUID();
    await atomic(this.connection, async () => {
      await this.access.requireCreate(userId);
      await this.connection
        .prepare(
          'INSERT INTO portfolios(id,user_id,name,client_name,base_currency) VALUES(?,?,?,?,?)',
        )
        .run(id, userId, input.name, input.clientName, input.baseCurrency);
    });
    return await this.get(userId, id);
  }
  async update(userId: string, id: string, input: PortfolioInput) {
    await atomic(this.connection, async () => {
      const p = await this.access.require(userId, id, 'write');
      if (p.base_currency !== input.baseCurrency && (await readLedger(this.connection, id)).length)
        throw new ApiError(
          422,
          'CURRENCY_LOCKED',
          'Currency cannot change once a portfolio has transactions.',
        );
      await this.connection
        .prepare('UPDATE portfolios SET name=?,client_name=?,base_currency=? WHERE id=?')
        .run(input.name, input.clientName, input.baseCurrency, id);
    });
    return await this.get(userId, id);
  }
  async remove(userId: string, id: string) {
    await atomic(this.connection, async () => {
      const p = await this.access.require(userId, id, 'manage');
      for (const transaction of await readLedger(this.connection, id))
        await queueTransactionNotification(this.connection, userId, p, transaction, 'deleted');
      await this.connection.prepare('DELETE FROM portfolios WHERE id=?').run(id);
    });
  }
  async summary(userId: string, id: string) {
    await this.access.require(userId, id);
    return summarize(await readLedger(this.connection, id));
  }
  async members(userId: string, id: string) {
    await this.access.require(userId, id, 'manage');
    return await this.connection
      .prepare(
        'SELECT u.id,u.name,u.email,u.role,m.permission,m.created_at AS grantedAt FROM portfolio_members m JOIN users u ON u.id=m.user_id WHERE m.portfolio_id=? ORDER BY u.name,u.id',
      )
      .all(id);
  }
  async grant(
    userId: string,
    id: string,
    target: {
      userId?: string;
      email?: string;
    },
    permission: 'read' | 'write',
  ) {
    return await atomic(this.connection, async () => {
      const p = await this.access.require(userId, id, 'manage');
      const user = target.userId
        ? await this.connection
            .prepare('SELECT id,email_verified FROM users WHERE id=?')
            .get(target.userId)
        : await this.connection
            .prepare('SELECT id,email_verified FROM users WHERE email=? COLLATE NOCASE')
            .get(target.email?.trim().toLowerCase() || '');
      if (!user)
        throw new ApiError(404, 'USER_NOT_FOUND', 'No matching verified account was found.');
      if (!user['email_verified'])
        throw new ApiError(
          422,
          'EMAIL_NOT_VERIFIED',
          'The invited analyst must verify their email first.',
        );
      if (user['id'] === p.user_id)
        throw new ApiError(
          422,
          'OWNER_IMMUTABLE',
          'The portfolio owner already has ownership permissions.',
        );
      await this.connection
        .prepare(
          'INSERT INTO portfolio_members(portfolio_id,user_id,permission,granted_by) VALUES(?,?,?,?) ON CONFLICT(portfolio_id,user_id) DO UPDATE SET permission=excluded.permission,granted_by=excluded.granted_by',
        )
        .run(id, String(user['id']), permission, userId);
      return (await this.members(userId, id)).find((m) => m['id'] === user['id']);
    });
  }
  async revoke(userId: string, id: string, memberId: string) {
    await atomic(this.connection, async () => {
      const p = await this.access.require(userId, id, 'manage');
      if (memberId === p.user_id)
        throw new ApiError(422, 'OWNER_IMMUTABLE', 'The portfolio owner cannot be removed.');
      const result = await this.connection
        .prepare('DELETE FROM portfolio_members WHERE portfolio_id=? AND user_id=?')
        .run(id, memberId);
      if (!result.changes)
        throw new ApiError(404, 'MEMBER_NOT_FOUND', 'This portfolio member could not be found.');
    });
  }
}
