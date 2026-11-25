import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { config } from '../config/index.js';
import { Database, postgresPool } from './connection.js';
export { Database } from './connection.js';

export async function openDatabase(path = config.database): Promise<Database> {
  let connection: Database;
  if (process.env['NODE_ENV'] === 'test' && process.env['TEST_DATABASE_ENGINE'] === 'postgres') {
    const { PGlite } = await import('@electric-sql/pglite');
    const engine = await PGlite.create({
      parsers: { 20: (value) => Number(value), 1700: (value) => Number(value) },
    });
    connection = new Database(engine);
  } else if (config.databaseUrl) {
    connection = new Database(postgresPool(config.databaseUrl, config.databaseCaFile));
  } else {
    if (path !== ':memory:') mkdirSync(dirname(resolve(path)), { recursive: true });
    const sqlite = new DatabaseSync(path);
    sqlite.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
    connection = new Database(sqlite);
  }
  if (connection.kind === 'postgres') await connection.exec('CREATE SCHEMA IF NOT EXISTS fintrack');
  await connection.exec(
    'CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY,applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)',
  );
  const directory = new URL(
    connection.kind === 'postgres' ? './migrations/postgres/' : './migrations/',
    import.meta.url,
  );
  const files = readdirSync(directory)
    .filter((f) => /^\d+.*\.sql$/.test(f))
    .sort();
  await connection.transaction(async () => {
    if (connection.kind === 'postgres' && process.env['NODE_ENV'] !== 'test')
      await connection.exec('SELECT pg_advisory_xact_lock(710252026)');
    for (const file of files) {
      const version = Number(file.match(/^\d+/)![0]);
      if (
        await connection
          .prepare('SELECT version FROM schema_migrations WHERE version=?')
          .get(version)
      )
        continue;
      await connection.exec(readFileSync(new URL(file, directory), 'utf8'));
      // The legacy SQLite baseline records its own version.
      if (
        !(await connection
          .prepare('SELECT version FROM schema_migrations WHERE version=?')
          .get(version))
      )
        await connection.prepare('INSERT INTO schema_migrations(version) VALUES(?)').run(version);
    }
  });
  return connection;
}
export const db = await openDatabase();
export async function atomic<T>(work: () => T | Promise<T>): Promise<T> {
  return db.transaction(work);
}
