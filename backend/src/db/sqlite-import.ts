import { DatabaseSync } from 'node:sqlite';
import type { Database } from './connection.js';
const tables = [
  'users',
  'portfolios',
  'transactions',
  'sessions',
  'refresh_tokens',
  'auth_tokens',
  'mfa_challenges',
  'portfolio_members',
  'notification_outbox',
];
/** Import only into empty application tables. One transaction prevents partial account/ledger copies. */
export async function importSqlite(sourcePath: string, target: Database) {
  const source = new DatabaseSync(sourcePath, { readOnly: true });
  try {
    return await target.transaction(async () => {
      const counts: Record<string, number> = {};
      for (const table of tables) {
        if (Number((await target.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get())?.['n']))
          throw new Error(
            'Import requires an empty FinTrack target schema. Existing data was not changed.',
          );
      }
      for (const table of tables) {
        const rows = source.prepare(`SELECT * FROM ${table}`).all();
        for (const row of rows) {
          const columns = Object.keys(row);
          if (!columns.every((column) => /^[a-z_]+$/.test(column)))
            throw new Error('Unexpected source schema.');
          await target
            .prepare(
              `INSERT INTO ${table}(${columns.join(',')}) VALUES(${columns.map(() => '?').join(',')})`,
            )
            .run(...columns.map((column) => row[column]));
        }
        counts[table] = rows.length;
      }
      return counts;
    });
  } finally {
    source.close();
  }
}
