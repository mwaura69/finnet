import type { Database } from '../db/connection.js';
import { ApiError } from '../utils/ApiError.js';
export type Role = 'admin' | 'analyst' | 'viewer';
export type EntityAction = 'read' | 'write' | 'manage';
export interface PortfolioRecord {
  id: string;
  user_id: string;
  name: string;
  client_name: string;
  base_currency: 'KES' | 'USD';
  created_at: string;
}
export class PortfolioAccess {
  constructor(private db: Database) {}
  async role(userId: string): Promise<Role> {
    const user = await this.db.prepare('SELECT role FROM users WHERE id=?').get(userId);
    if (!user) throw new ApiError(401, 'UNAUTHENTICATED', 'Please sign in again to continue.');
    return String(user['role']) as Role;
  }
  async permissions(userId: string, portfolio: PortfolioRecord) {
    const role = await this.role(userId);
    const ownerOrAdmin = role === 'admin' || portfolio.user_id === userId;
    const grant = await this.db
      .prepare('SELECT permission FROM portfolio_members WHERE portfolio_id=? AND user_id=?')
      .get(portfolio.id, userId);
    const canRead = ownerOrAdmin || !!grant;
    const canManage = role === 'admin' || (role === 'analyst' && portfolio.user_id === userId);
    const canWrite = canManage || (role === 'analyst' && grant?.['permission'] === 'write');
    return {
      canRead,
      canEdit: canWrite,
      canDelete: canManage,
      canRecordTransactions: canWrite,
      canManageMembers: canManage,
    };
  }
  async require(userId: string, id: string, action: EntityAction = 'read') {
    const portfolio = (await this.db
      .prepare('SELECT * FROM portfolios WHERE id=?')
      .get(id)) as unknown as PortfolioRecord | undefined;
    if (!portfolio)
      throw new ApiError(404, 'PORTFOLIO_NOT_FOUND', 'This portfolio could not be found.');
    const permissions = await this.permissions(userId, portfolio);
    if (!permissions.canRead)
      throw new ApiError(404, 'PORTFOLIO_NOT_FOUND', 'This portfolio could not be found.');
    if (
      (action === 'write' && !permissions.canEdit) ||
      (action === 'manage' && !permissions.canManageMembers)
    )
      throw new ApiError(403, 'FORBIDDEN', 'You do not have permission to change this portfolio.');
    return portfolio;
  }
  async requireCreate(userId: string) {
    if ((await this.role(userId)) === 'viewer')
      throw new ApiError(403, 'FORBIDDEN', 'Viewer accounts cannot create portfolios.');
  }
}
/** Work and its reads/writes share one transaction and one leased database connection. */
export async function atomic<T>(db: Database, work: () => T | Promise<T>): Promise<T> {
  return db.transaction(work);
}
