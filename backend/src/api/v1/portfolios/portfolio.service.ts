import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { db } from '../../../db/index.js';
import { ApiError } from '../../../utils/ApiError.js';
import { PortfolioAccess, atomic } from '../../../domain/business-access.js';
import { readLedger } from '../../../domain/transaction-ledger.js';
import { summarize } from '../../../domain/holdings.js';
import { queueTransactionNotification } from '../../../domain/transaction-notifications.js';
import type { PortfolioInput, PortfolioDto } from './portfolio.types.js';

export class PortfolioService {
  private access: PortfolioAccess;
  constructor(private connection: DatabaseSync = db) {
    this.access = new PortfolioAccess(connection);
  }
  list(userId: string): PortfolioDto[] {
    const role = this.access.role(userId);
    const rows =
      role === 'admin'
        ? this.connection.prepare('SELECT id FROM portfolios ORDER BY created_at DESC,id').all()
        : this.connection
            .prepare(
              'SELECT DISTINCT p.id,p.created_at FROM portfolios p LEFT JOIN portfolio_members m ON m.portfolio_id=p.id AND m.user_id=? WHERE p.user_id=? OR m.user_id=? ORDER BY p.created_at DESC,p.id',
            )
            .all(userId, userId, userId);
    return rows.map((p) => this.get(userId, String(p['id'])));
  }
  get(userId: string, id: string): PortfolioDto {
    const p = this.access.require(userId, id);
    const ledger = readLedger(this.connection, id),
      summary = summarize(ledger);
    const { canRead: _canRead, ...permissions } = this.access.permissions(userId, p);
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
  create(userId: string, input: PortfolioInput) {
    const id = randomUUID();
    atomic(this.connection, () => {
      this.access.requireCreate(userId);
      this.connection
        .prepare(
          'INSERT INTO portfolios(id,user_id,name,client_name,base_currency) VALUES(?,?,?,?,?)',
        )
        .run(id, userId, input.name, input.clientName, input.baseCurrency);
    });
    return this.get(userId, id);
  }
  update(userId: string, id: string, input: PortfolioInput) {
    atomic(this.connection, () => {
      const p = this.access.require(userId, id, 'write');
      if (p.base_currency !== input.baseCurrency && readLedger(this.connection, id).length)
        throw new ApiError(
          422,
          'CURRENCY_LOCKED',
          'Currency cannot change once a portfolio has transactions.',
        );
      this.connection
        .prepare('UPDATE portfolios SET name=?,client_name=?,base_currency=? WHERE id=?')
        .run(input.name, input.clientName, input.baseCurrency, id);
    });
    return this.get(userId, id);
  }
  remove(userId: string, id: string) {
    atomic(this.connection, () => {
      const p = this.access.require(userId, id, 'manage');
      for (const transaction of readLedger(this.connection, id))
        queueTransactionNotification(this.connection, userId, p, transaction, 'deleted');
      this.connection.prepare('DELETE FROM portfolios WHERE id=?').run(id);
    });
  }
  summary(userId: string, id: string) {
    this.access.require(userId, id);
    return summarize(readLedger(this.connection, id));
  }
  members(userId: string, id: string) {
    this.access.require(userId, id, 'manage');
    return this.connection
      .prepare(
        'SELECT u.id,u.name,u.email,u.role,m.permission,m.created_at AS grantedAt FROM portfolio_members m JOIN users u ON u.id=m.user_id WHERE m.portfolio_id=? ORDER BY u.name,u.id',
      )
      .all(id);
  }
  grant(
    userId: string,
    id: string,
    target: { userId?: string; email?: string },
    permission: 'read' | 'write',
  ) {
    return atomic(this.connection, () => {
      const p = this.access.require(userId, id, 'manage');
      const user = target.userId
        ? this.connection
            .prepare('SELECT id,email_verified FROM users WHERE id=?')
            .get(target.userId)
        : this.connection
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
      this.connection
        .prepare(
          'INSERT INTO portfolio_members(portfolio_id,user_id,permission,granted_by) VALUES(?,?,?,?) ON CONFLICT(portfolio_id,user_id) DO UPDATE SET permission=excluded.permission,granted_by=excluded.granted_by',
        )
        .run(id, String(user['id']), permission, userId);
      return this.members(userId, id).find((m) => m['id'] === user['id']);
    });
  }
  revoke(userId: string, id: string, memberId: string) {
    atomic(this.connection, () => {
      const p = this.access.require(userId, id, 'manage');
      if (memberId === p.user_id)
        throw new ApiError(422, 'OWNER_IMMUTABLE', 'The portfolio owner cannot be removed.');
      const result = this.connection
        .prepare('DELETE FROM portfolio_members WHERE portfolio_id=? AND user_id=?')
        .run(id, memberId);
      if (!result.changes)
        throw new ApiError(404, 'MEMBER_NOT_FOUND', 'This portfolio member could not be found.');
    });
  }
}
