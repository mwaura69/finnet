import { renderEmail } from '../utils/email.template.js';
import { randomUUID } from 'node:crypto';
import type { Database } from '../db/connection.js';
import type { LedgerTransaction } from '../types/index.js';
import type { PortfolioRecord } from './business-access.js';
export interface NotificationMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}
export type NotificationSender = (message: NotificationMessage) => Promise<unknown>;
const money = (value: number, currency: string) =>
  `${currency} ${value.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const receiptNumber = (id: string) =>
  'FT-' + id.replace(/-/g, '').slice(0, 12).toUpperCase();
/** Queue within the ledger write transaction. */
export async function queueTransactionNotification(
  db: Database,
  actorId: string,
  portfolio: PortfolioRecord,
  transaction: LedgerTransaction,
  action: 'recorded' | 'deleted',
) {
  const recipients = await db
    .prepare('SELECT id,name,email FROM users WHERE id IN (?,?) AND transaction_emails=1')
    .all(actorId, portfolio.user_id);
  const now = new Date().toISOString();
  for (const user of recipients) {
    const subject = `FinTrack: ${transaction.type} ${transaction.instrument} transaction ${action}`;
    const text = [
      `Hello ${user['name']},`,
      `A transaction was ${action} in ${portfolio.name} (${portfolio.client_name}).`,
      `Reference: ${receiptNumber(transaction.id)}`,
      `Instrument: ${transaction.instrument}`,
      `Trade: ${transaction.type}`,
      `Quantity: ${transaction.quantity}`,
      `Unit price: ${money(transaction.unitPrice, portfolio.base_currency)}`,
      `Total value: ${money(transaction.quantity * transaction.unitPrice, portfolio.base_currency)}`,
      `Trade date: ${transaction.tradeDate}`,
      `Recorded at: ${transaction.createdAt}`,
      action === 'deleted'
        ? 'Holdings have been recalculated after deletion.'
        : 'Your portfolio holdings have been updated.',
      'This is a transaction record, not a tax invoice or proof of settlement.',
      'FinTrack by Finnet Technologies | Finnet Nexus Group',
    ].join('\n\n');
    const html = renderEmail({
      preheader: subject,
      heading: `Transaction ${action}`,
      paragraphs: text.split('\n\n'),
      note: 'Transaction email preferences are available in your profile. Security emails remain enabled.',
    });
    await db
      .prepare(
        'INSERT INTO notification_outbox(id,event_key,recipient_user_id,recipient_email,subject,text_body,html_body,next_attempt_at,created_at) VALUES(?,?,?,?,?,?,?,?,?)',
      )
      .run(
        randomUUID(),
        `${transaction.id}:${action}`,
        String(user['id']),
        String(user['email']),
        subject,
        text,
        html,
        now,
        now,
      );
  }
}
/** Durable at-least-once delivery; retry from a periodic worker. */
export class NotificationOutbox {
  private draining = false;
  constructor(
    private db: Database,
    private sender: NotificationSender,
  ) {}
  async drain(limit = 20) {
    if (this.draining) return { sent: 0, failed: 0 };
    this.draining = true;
    let sent = 0,
      failed = 0;
    try {
      for (let i = 0; i < limit; i++) {
        const now = new Date().toISOString(),
          lockUntil = new Date(Date.now() + 60000).toISOString();
        const row = await this.db.transaction(async () => {
          const claimed = await this.db
            .prepare(
              'SELECT * FROM notification_outbox WHERE sent_at IS NULL AND next_attempt_at<=? AND (locked_until IS NULL OR locked_until<?) ORDER BY created_at,id LIMIT 1',
            )
            .get(now, now);
          if (claimed)
            await this.db
              .prepare(
                'UPDATE notification_outbox SET locked_until=?,attempts=attempts+1 WHERE id=?',
              )
              .run(lockUntil, String(claimed['id']));
          return claimed;
        });
        if (!row) break;
        try {
          await this.sender({
            to: String(row['recipient_email']),
            subject: String(row['subject']),
            text: String(row['text_body']),
            html: String(row['html_body']),
          });
          await this.db
            .prepare(
              'UPDATE notification_outbox SET sent_at=?,locked_until=NULL,last_error=NULL WHERE id=?',
            )
            .run(new Date().toISOString(), String(row['id']));
          sent++;
        } catch {
          const delay = Math.min(3600000, 30000 * 2 ** Math.min(Number(row['attempts']), 7));
          await this.db
            .prepare(
              'UPDATE notification_outbox SET locked_until=NULL,next_attempt_at=?,last_error=? WHERE id=?',
            )
            .run(
              new Date(Date.now() + delay).toISOString(),
              'Delivery failed; retry scheduled.',
              String(row['id']),
            );
          failed++;
        }
      }
    } finally {
      this.draining = false;
    }
    return { sent, failed };
  }
}
