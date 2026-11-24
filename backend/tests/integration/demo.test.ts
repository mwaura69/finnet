import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import '../setup.js';
const { db } = await import('../../src/db/index.js');
const { seedDemo } = await import('../../src/db/seeds/demo.js');
const { createApp } = await import('../../src/app.js');
const { config } = await import('../../src/config/index.js');
const options = { email: 'demo@fintrack.local', password: 'FinTrackDemo!2026' };
test('fresh demo seed logs in through cookie authentication and has valid sample portfolios', async () => {
  assert.deepEqual(seedDemo(db, options), { created: true, passwordMatches: true });
  config.demo = false; // Exercise real authenticated API behavior, not development demo mode.
  const app = createApp();
  const agent = request.agent(app);
  const csrf = (await agent.get('/api/v1/auth/csrf').expect(200)).body.data.csrfToken;
  const login = await agent
    .post('/api/v1/auth/login')
    .set('X-CSRF-Token', csrf)
    .send({ ...options, stayLoggedIn: false })
    .expect(200);
  assert.equal(login.body.data.user.emailVerified, true);
  assert.equal(login.body.data.user.role, 'analyst');
  assert.equal(login.body.data.user.transactionEmails, false);
  assert.equal(login.body.data.demoMode, false);
  const portfolios = (await agent.get('/api/v1/portfolios').expect(200)).body.data;
  assert.equal(portfolios.length, 3);
  for (const p of portfolios) {
    const summary = (await agent.get(`/api/v1/portfolios/${p.id}/summary`).expect(200)).body.data;
    assert.ok(summary.totalValue > 0);
    const trades = (await agent.get(`/api/v1/portfolios/${p.id}/transactions`).expect(200)).body
      .data;
    assert.ok(trades.some((t: { type: string }) => t.type === 'BUY'));
    assert.ok(trades.some((t: { type: string }) => t.type === 'SELL'));
  }
  const before = db.prepare('SELECT COUNT(*) AS n FROM transactions').get()!.n;
  assert.deepEqual(seedDemo(db, options), { created: false, passwordMatches: true });
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM transactions').get()!.n, before);
});
test('seeding never resets existing passwords, verification or preferences and different seed accounts do not collide', () => {
  const hash = bcrypt.hashSync('Existing123!', 4);
  db.prepare(
    'UPDATE users SET password_hash=?,email_verified=0,email_mfa_enabled=1 WHERE email=?',
  ).run(hash, options.email);
  assert.deepEqual(seedDemo(db, options), { created: false, passwordMatches: false });
  const preserved = db
    .prepare('SELECT password_hash,email_verified,email_mfa_enabled FROM users WHERE email=?')
    .get(options.email)!;
  assert.equal(preserved.password_hash, hash);
  assert.equal(preserved.email_verified, 0);
  assert.equal(preserved.email_mfa_enabled, 1);
  assert.equal(
    seedDemo(db, { email: 'second-demo@example.test', password: 'Another123!' }).created,
    true,
  );
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM portfolios').get()!.n, 6);
});
