import { config } from '../../config/index.js';
import { db } from '../../db/index.js';
import { DemoPortfolioService } from '../../demo/demo.service.js';
import { PortfolioService } from './portfolios/portfolio.service.js';
import { TransactionService } from './transactions/transaction.service.js';
const demo = new DemoPortfolioService(db);
/** Composition root: controllers work with either the preview adapter or your service. */
export const business = {
  portfolios: config.demo ? demo : new PortfolioService(),
  transactions: config.demo
    ? {
        list: (u: string, id: string) => demo.transactions(u, id),
        create: (
          u: string,
          id: string,
          input: Parameters<DemoPortfolioService['addTransaction']>[2],
        ) => demo.addTransaction(u, id, input),
        remove: (u: string, id: string) => demo.removeTransaction(u, id),
      }
    : new TransactionService(),
};
