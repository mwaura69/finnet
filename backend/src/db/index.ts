import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { config } from '../config/index.js';
export function openDatabase(path = config.database) {
  if (path !== ':memory:') mkdirSync(dirname(resolve(path)), { recursive: true });
  const connection = new DatabaseSync(path);
  connection.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
  connection.exec(
    'CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY,applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)',
  );
  const directory = new URL('./migrations/', import.meta.url);
  const files = readdirSync(directory)
    .filter((f) => /^\d+.*\.sql$/.test(f))
    .sort();
  for (const file of files) {
    const version = Number(file.match(/^\d+/)![0]);
    if (connection.prepare('SELECT version FROM schema_migrations WHERE version=?').get(version))
      continue;
    connection.exec('BEGIN IMMEDIATE');
    try {
      connection.exec(readFileSync(new URL(file, directory), 'utf8'));
      connection.prepare('INSERT OR IGNORE INTO schema_migrations(version) VALUES(?)').run(version);
      connection.exec('COMMIT');
    } catch (error) {
      connection.exec('ROLLBACK');
      connection.close();
      throw error;
    }
  }
  return connection;
}
export const db = openDatabase();
export function atomic<T>(work: () => T): T {
  db.exec('BEGIN IMMEDIATE');
  try {
    const value = work();
    db.exec('COMMIT');
    return value;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
