import type { Database } from '../db/connection.js';
import { PortfolioService } from '../api/v1/portfolios/portfolio.service.js';
import { TransactionService } from '../api/v1/transactions/transaction.service.js';
import type { TransactionInput } from '../types/index.js';
/** Backward-compatible local adapter. All routes use the real services in every mode. */
export class DemoPortfolioService extends PortfolioService {
  private transactionService: TransactionService;
  constructor(connection: Database) {
    super(connection);
    this.transactionService = new TransactionService(connection);
  }
  async transactions(userId: string, id: string) {
    return await this.transactionService.list(userId, id);
  }
  async addTransaction(userId: string, id: string, input: TransactionInput) {
    return await this.transactionService.create(userId, id, input);
  }
  async removeTransaction(userId: string, id: string) {
    return await this.transactionService.remove(userId, id);
  }
}
