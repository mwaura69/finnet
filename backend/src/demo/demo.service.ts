import type { DatabaseSync } from 'node:sqlite';
import { PortfolioService } from '../api/v1/portfolios/portfolio.service.js';
import { TransactionService } from '../api/v1/transactions/transaction.service.js';
import type { TransactionInput } from '../types/index.js';
/** Backward-compatible local adapter. All routes use the real services in every mode. */
export class DemoPortfolioService extends PortfolioService {
  private transactionService: TransactionService;
  constructor(connection: DatabaseSync) {
    super(connection);
    this.transactionService = new TransactionService(connection);
  }
  transactions(userId: string, id: string) {
    return this.transactionService.list(userId, id);
  }
  addTransaction(userId: string, id: string, input: TransactionInput) {
    return this.transactionService.create(userId, id, input);
  }
  removeTransaction(userId: string, id: string) {
    return this.transactionService.remove(userId, id);
  }
}
