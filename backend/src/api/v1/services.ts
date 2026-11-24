import { db } from '../../db/index.js';
import { PortfolioService } from './portfolios/portfolio.service.js';
import { TransactionService } from './transactions/transaction.service.js';
import { NotificationOutbox } from '../../domain/transaction-notifications.js';
import { sendEmail } from '../../utils/email.service.js';
import { logger } from '../../config/logger.js';

// Demo and normal operation share one real authorization and persistence implementation.
export const business = {
  portfolios: new PortfolioService(db),
  transactions: new TransactionService(db),
};
export const notificationOutbox = new NotificationOutbox(db, sendEmail);
export function flushTransactionNotifications() {
  void notificationOutbox
    .drain()
    .catch(() =>
      logger.warn('Transaction notification worker will retry after a database failure.'),
    );
}
export function startNotificationWorker() {
  const timer = setInterval(flushTransactionNotifications, 30_000);
  timer.unref();
  flushTransactionNotifications();
  return () => clearInterval(timer);
}
