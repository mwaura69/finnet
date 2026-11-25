import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { Pool, type PoolClient } from 'pg';
import { Database } from '../../src/db/connection.js';

test('PostgreSQL transactions lease one client and retry serialization failures before committing', async () => {
  const pool = new Pool();
  const statements: string[] = [];
  let connects = 0,
    releases = 0,
    failures = 0,
    writes = 0;
  const client = {
    query: async (sql: string) => {
      statements.push(sql);
      if (sql.startsWith('UPDATE')) {
        writes++;
        if (failures++ === 0)
          throw Object.assign(new Error('serialization test'), { code: '40001' });
      }
      return { rows: [{ id: 'row' }], rowCount: 1 };
    },
    release: () => {
      releases++;
    },
  };
  mock.method(pool, 'connect', async () => {
    connects++;
    return client as unknown as PoolClient;
  });
  mock.method(pool, 'query', async () => {
    throw new Error('A transaction must not query the pool');
  });
  const database = new Database(pool);
  const result = await database.transaction(async () => {
    await database.prepare('UPDATE sample SET value=? WHERE id=?').run(1, 'row');
    return database.transaction(async () =>
      database.prepare('SELECT * FROM sample WHERE id=?').get('row'),
    );
  });
  assert.deepEqual(result, { id: 'row' });
  assert.equal(connects, 2);
  assert.equal(releases, 2);
  assert.equal(writes, 2);
  assert.ok(statements.includes('ROLLBACK'));
  assert.equal(statements.at(-1), 'COMMIT');
  assert.ok(statements.some((sql) => sql.includes('$1')));
  await pool.end();
});
test('PostgreSQL rollback releases the client on business rule failures without retrying', async () => {
  const pool = new Pool();
  let releases = 0;
  const statements: string[] = [];
  mock.method(
    pool,
    'connect',
    async () =>
      ({
        query: async (sql: string) => {
          statements.push(sql);
          return { rows: [] };
        },
        release: () => {
          releases++;
        },
      }) as unknown as PoolClient,
  );
  const database = new Database(pool);
  await assert.rejects(
    database.transaction(async () => {
      throw new Error('invalid trade');
    }),
    /invalid trade/,
  );
  assert.deepEqual(statements, ['BEGIN ISOLATION LEVEL SERIALIZABLE', 'ROLLBACK']);
  assert.equal(releases, 1);
  await pool.end();
});
