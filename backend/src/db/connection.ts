import { AsyncLocalStorage } from 'node:async_hooks';
import { DatabaseSync } from 'node:sqlite';
import { Pool, type PoolClient, types } from 'pg';
import { readFileSync } from 'node:fs';

types.setTypeParser(20, (value) => Number(value));
types.setTypeParser(1700, (value) => Number(value)); // Stored integers fit JavaScript's safe range.
export type Row = Record<string, unknown>;
type Executor = {
  query(
    sql: string,
    values?: unknown[],
  ): Promise<{ rows: Row[]; rowCount?: number | null; affectedRows?: number }>;
  exec?(sql: string): Promise<unknown>;
};

/** One asynchronous data-access boundary; parameters are always bound, never interpolated. */
export class Database {
  readonly kind: 'sqlite' | 'postgres';
  private context = new AsyncLocalStorage<Executor | true>();
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private driver: DatabaseSync | Pool | Executor) {
    this.kind = driver instanceof DatabaseSync ? 'sqlite' : 'postgres';
  }
  private async exclusive<T>(work: () => Promise<T>): Promise<T> {
    const prior = this.queue;
    let release!: () => void;
    this.queue = new Promise<void>((resolve) => {
      release = resolve;
    });
    await prior;
    try {
      return await work();
    } finally {
      release();
    }
  }
  private sql(sql: string) {
    if (this.kind === 'sqlite') return sql;
    let parameter = 0;
    return sql
      .replace(
        /'(?:''|[^'])*'|"(?:""|[^"])*"|(?<![.\w])\b(?:users|portfolios|transactions|sessions|refresh_tokens|auth_tokens|mfa_challenges|portfolio_members|notification_outbox|schema_migrations)\b/g,
        (name) => (name.startsWith("'") || name.startsWith('"') ? name : '"fintrack".' + name),
      )
      .replace(/COLLATE NOCASE/g, '')
      .replace(/\bAS\s+([a-z][A-Za-z]*[A-Z][A-Za-z]*)\b/g, 'AS "$1"')
      .replace(/'([^']|'')*'|\?/g, (match) => (match === '?' ? '$' + ++parameter : match));
  }
  private async query(
    sql: string,
    values: unknown[] = [],
  ): Promise<{ rows: Row[]; changes: number }> {
    const run = async () => {
      if (this.driver instanceof DatabaseSync) {
        const statement = this.driver.prepare(sql);
        if (/^\s*(SELECT|WITH)\b/i.test(sql))
          return { rows: statement.all(...(values as never[])) as Row[], changes: 0 };
        return { rows: [], changes: Number(statement.run(...(values as never[])).changes) };
      }
      const context = this.context.getStore();
      const executor = context && context !== true ? context : this.driver;
      const result = await executor.query(this.sql(sql), values);
      return {
        rows: result.rows,
        changes: result.rowCount ?? ('affectedRows' in result ? Number(result.affectedRows) : 0),
      };
    };
    if (this.context.getStore() || this.driver instanceof Pool) return run();
    return this.exclusive(run);
  }
  prepare(sql: string) {
    return {
      get: async (...values: unknown[]) => (await this.query(sql, values)).rows[0],
      all: async (...values: unknown[]) => (await this.query(sql, values)).rows,
      run: async (...values: unknown[]) => ({ changes: (await this.query(sql, values)).changes }),
    };
  }
  async exec(sql: string) {
    const run = async () => {
      if (this.driver instanceof DatabaseSync) return this.driver.exec(sql);
      const context = this.context.getStore();
      const executor = context && context !== true ? context : this.driver;
      if ('exec' in executor && executor.exec) await executor.exec(this.sql(sql));
      else await executor.query(this.sql(sql));
    };
    if (this.context.getStore() || this.driver instanceof Pool) return run();
    return this.exclusive(run);
  }
  async transaction<T>(work: () => T | Promise<T>): Promise<T> {
    if (this.context.getStore()) return work();
    if (this.driver instanceof Pool) {
      for (let attempt = 0; ; attempt++) {
        const client = await this.driver.connect();
        try {
          await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
          const result = await this.context.run(client as PoolClient, work);
          await client.query('COMMIT');
          return result;
        } catch (error) {
          await client.query('ROLLBACK');
          if (attempt < 2 && ['40001', '40P01'].includes(String((error as { code?: string }).code)))
            continue;
          throw error;
        } finally {
          client.release();
        }
      }
    }
    return this.exclusive(async () =>
      this.context.run(this.driver instanceof DatabaseSync ? true : this.driver, async () => {
        await this.exec(this.kind === 'sqlite' ? 'BEGIN IMMEDIATE' : 'BEGIN');
        try {
          const result = await work();
          await this.exec('COMMIT');
          return result;
        } catch (error) {
          await this.exec('ROLLBACK');
          throw error;
        }
      }),
    );
  }
  async close() {
    if (this.driver instanceof DatabaseSync) this.driver.close();
    else if (this.driver instanceof Pool) await this.driver.end();
    else if ('close' in this.driver) await (this.driver.close as () => Promise<void>)();
  }
}

export function postgresPool(url: string, caFile?: string) {
  const parsed = new URL(url);
  // Do not let URL parameters silently disable certificate verification.
  for (const name of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert'])
    parsed.searchParams.delete(name);
  const local = ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname);
  return new Pool({
    connectionString: parsed.toString(),
    max: 5,
    connectionTimeoutMillis: 15000,
    ssl: local
      ? undefined
      : { rejectUnauthorized: true, ...(caFile ? { ca: readFileSync(caFile, 'utf8') } : {}) },
  });
}
