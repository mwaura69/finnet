import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtemp, rm } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import '../setup.js';
const { db } = await import('../../src/db/index.js');
const { importSqlite } = await import('../../src/db/sqlite-import.js');
test('SQLite import preserves data, rolls back constraint failures, and refuses a populated target', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'fintrack-import-'));
  const file = join(folder, 'source.sqlite');
  const source = new DatabaseSync(file);
  try {
    for (const migration of [
      '001_initial.sql',
      '002_auth.sql',
      '003_notifications_permissions.sql',
    ])
      source.exec(
        readFileSync(new URL('../../src/db/migrations/' + migration, import.meta.url), 'utf8'),
      );
    source
      .prepare('INSERT INTO users(id,name,email,password_hash,email_verified) VALUES(?,?,?,?,1)')
      .run('import-user', 'Fictional Analyst', 'import@example.test', 'existing-hash');
    source
      .prepare(
        'INSERT INTO portfolios(id,user_id,name,client_name,base_currency) VALUES(?,?,?,?,?)',
      )
      .run('import-portfolio', 'import-user', 'Imported portfolio', 'Fictional Client', 'KES');
    source.exec("PRAGMA ignore_check_constraints=ON; UPDATE portfolios SET client_name='x';");
    await assert.rejects(importSqlite(file, db));
    assert.equal(
      (await db.prepare('SELECT COUNT(*) AS n FROM users').get())!.n,
      0,
      'Failed import must roll back users inserted before the invalid portfolio',
    );
    source.exec("UPDATE portfolios SET client_name='Fictional Client';");
    const counts = await importSqlite(file, db);
    assert.equal(counts.users, 1);
    assert.equal(counts.portfolios, 1);
    assert.equal(
      (await db.prepare('SELECT password_hash FROM users WHERE id=?').get('import-user'))!
        .password_hash,
      'existing-hash',
    );
    await assert.rejects(importSqlite(file, db), /empty FinTrack target/);
    assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM users').get())!.n, 1);
  } finally {
    source.close();
    await rm(folder, { recursive: true, force: true });
  }
});
