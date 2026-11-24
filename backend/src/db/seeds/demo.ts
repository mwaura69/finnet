import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcryptjs';

/** Idempotent: create only missing accounts. Never reset an existing user's credentials or preferences. */
export function seedDemo(connection: DatabaseSync, options: { email: string; password: string }) {
  const email = options.email.trim().toLowerCase();
  const password = options.password;
  if (!connection.prepare('SELECT id FROM users WHERE email = ?').get(email)) {
    const user = randomUUID();
    const ids = { growth: randomUUID(), income: randomUUID(), global: randomUUID() };
    connection.exec('BEGIN');
    try {
      connection
        .prepare('INSERT INTO users(id,name,email,password_hash) VALUES(?,?,?,?)')
        .run(user, 'Alex Morgan', email, bcrypt.hashSync(password, 12));
      const insert = connection.prepare(
        'INSERT INTO portfolios(id,user_id,name,client_name,base_currency,created_at) VALUES(?,?,?,?,?,?)',
      );
      insert.run(
        ids.growth,
        user,
        'East Africa Growth',
        'Amani Capital',
        'KES',
        '2026-08-12T08:00:00Z',
      );
      insert.run(
        ids.income,
        user,
        'Steady Income',
        'Mawingu Family Trust',
        'KES',
        '2026-09-04T08:00:00Z',
      );
      insert.run(
        ids.global,
        user,
        'Global Opportunities',
        'Horizon Ventures',
        'USD',
        '2026-10-15T08:00:00Z',
      );
      const tx = connection.prepare(
        'INSERT INTO transactions(id,portfolio_id,instrument,type,quantity,unit_price_minor,trade_date,created_at) VALUES(?,?,?,?,?,?,?,?)',
      );
      const portfolioIds = {
        'p-growth': ids.growth,
        'p-income': ids.income,
        'p-global': ids.global,
      };
      const rows: [keyof typeof portfolioIds, string, string, number, number, string][] = [
        ['p-growth', 'SCOM', 'BUY', 20000, 2650, '2026-09-02'],
        ['p-growth', 'KCB', 'BUY', 10000, 4200, '2026-09-10'],
        ['p-growth', 'EQTY', 'BUY', 8000, 4850, '2026-09-18'],
        ['p-growth', 'T-BILL-91', 'BUY', 500, 100000, '2026-10-01'],
        ['p-growth', 'SCOM', 'BUY', 5000, 2800, '2026-10-12'],
        ['p-growth', 'KCB', 'SELL', 1500, 4650, '2026-11-05'],
        ['p-growth', 'SCOM', 'SELL', 2000, 2950, '2026-11-12'],
        ['p-growth', 'EQTY', 'BUY', 1000, 5100, '2026-11-18'],
        ['p-income', 'T-BILL-91', 'BUY', 1500, 100000, '2026-10-05'],
        ['p-income', 'KCB', 'BUY', 2500, 4400, '2026-11-02'],
        ['p-income', 'KCB', 'SELL', 500, 4650, '2026-11-12'],
        ['p-global', 'VOO', 'BUY', 30, 51000, '2026-10-20'],
        ['p-global', 'VOO', 'SELL', 5, 52500, '2026-11-08'],
        ['p-global', 'MSFT', 'BUY', 20, 42000, '2026-11-10'],
      ];
      rows.forEach((r, i) =>
        tx.run(
          randomUUID(),
          portfolioIds[r[0]],
          ...r.slice(1),
          `2026-11-20T08:00:${String(i).padStart(2, '0')}Z`,
        ),
      );
      connection
        .prepare(
          "UPDATE users SET email_verified=1,terms_accepted_at=created_at,terms_version='2026-11-24',transaction_emails=0,product_emails=0 WHERE id=?",
        )
        .run(user);
      connection.exec('COMMIT');
      return { created: true, passwordMatches: true };
    } catch (error) {
      connection.exec('ROLLBACK');
      throw error;
    }
  }
  const existing = connection.prepare('SELECT password_hash FROM users WHERE email=?').get(email);
  return {
    created: false,
    passwordMatches:
      !!existing?.['password_hash'] &&
      bcrypt.compareSync(password, String(existing['password_hash'])),
  };
}
