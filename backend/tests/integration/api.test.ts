import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import '../setup.js';
const { createApp } = await import('../../src/app.js');
const { setEmailSenderForTests } = await import('../../src/utils/email.service.js');
const { db } = await import('../../src/db/index.js');
const mail: { text: string; html?: string }[] = [];
setEmailSenderForTests(async (message) => {
  mail.push(message);
  return { messageId: 'test' };
});
const app = createApp();
test('verified cookie sessions, CSRF, profile, ledger, Excel, receipts, MFA and password recovery', async () => {
  const agent = request.agent(app);
  const csrf = (await agent.get('/api/v1/auth/csrf').expect(200)).body.data.csrfToken;
  const post = (path: string, body: unknown) =>
    agent
      .post('/api/v1' + path)
      .set('X-CSRF-Token', csrf)
      .send(body);
  await agent.post('/api/v1/auth/register').send({}).expect(403);
  await post('/auth/register', {
    name: 'Test Analyst',
    email: 'test@example.test',
    password: 'Test123!',
    acceptTerms: true,
  }).expect(200);
  await post('/auth/login', { email: 'test@example.test', password: 'Test123!' }).expect(403);
  const beforeResend = mail.length;
  await post('/auth/resend-verification', { email: 'test@example.test' }).expect(200);
  assert.equal(
    mail.length,
    beforeResend + 1,
    'Eligible unverified account must reach the transport',
  );
  const token = new URL(mail.at(-1)!.text.match(/https?:\/\/\S+/)![0]).searchParams.get('token');
  assert.ok(
    mail.at(-1)!.html?.includes('token=' + token),
    'HTML confirmation button includes the issued token',
  );
  await post('/auth/verify-email', { token }).expect(200);
  await post('/auth/verify-email', { token }).expect(400);
  const sentCount = mail.length;
  await post('/auth/resend-verification', { email: 'missing@example.test' }).expect(200);
  await post('/auth/resend-verification', { email: 'test@example.test' }).expect(200);
  assert.equal(
    mail.length,
    sentCount,
    'Unknown and already verified accounts must not receive verification tokens',
  );
  const login = await post('/auth/login', {
    email: 'test@example.test',
    password: 'Test123!',
    stayLoggedIn: true,
  }).expect(200);
  assert.ok(login.headers['set-cookie'].some((s: string) => s.includes('HttpOnly')));
  assert.equal(login.body.data.token, undefined);
  await agent
    .patch('/api/v1/users/me')
    .set('X-CSRF-Token', csrf)
    .send({ name: 'Updated Analyst' })
    .expect(200);
  const p = (
    await post('/portfolios', {
      name: 'Growth',
      clientName: 'Fictional Client',
      baseCurrency: 'KES',
    }).expect(201)
  ).body.data;
  const buy = (
    await post(`/portfolios/${p.id}/transactions`, {
      instrument: ' scom ',
      type: 'BUY',
      quantity: 100,
      unitPrice: 25,
      tradeDate: '2026-01-01',
    }).expect(201)
  ).body.data;
  assert.equal(
    buy.instrument,
    'SCOM',
    'API trims and uppercases instruments without trusting the UI',
  );
  const future = await post(`/portfolios/${p.id}/transactions`, {
    instrument: 'SCOM',
    type: 'BUY',
    quantity: 1,
    unitPrice: 25,
    tradeDate: '9999-12-31',
  }).expect(422);
  assert.ok(future.body.error.details.some((d: { field: string }) => d.field === 'tradeDate'));
  await post(`/portfolios/${p.id}/transactions`, {
    instrument: 'SCOM',
    type: 'SELL',
    quantity: 101,
    unitPrice: 25,
    tradeDate: '2026-01-02',
  }).expect(422);
  await post(`/portfolios/${p.id}/transactions`, {
    instrument: 'SCOM',
    type: 'SELL',
    quantity: 60,
    unitPrice: 28,
    tradeDate: '2026-01-03',
  }).expect(201);
  await post(`/portfolios/${p.id}/transactions`, {
    instrument: 'SCOM',
    type: 'SELL',
    quantity: 50,
    unitPrice: 27,
    tradeDate: '2026-01-02',
  }).expect(422); // Backdating cannot invalidate the later sell.
  await agent.delete(`/api/v1/transactions/${buy.id}`).set('X-CSRF-Token', csrf).expect(409);
  const invalid = await post(`/portfolios/${p.id}/transactions`, {
    instrument: '',
    type: 'BUY',
    quantity: -1,
    unitPrice: 0,
    tradeDate: '2026-02-30',
  }).expect(422);
  assert.ok(invalid.body.error.details.some((d: { field: string }) => d.field === 'quantity'));
  const summary = await agent.get(`/api/v1/portfolios/${p.id}/summary`).expect(200);
  assert.equal(summary.body.data.holdings[0].netQuantity, 40);
  const x = await agent.get(`/api/v1/portfolios/${p.id}/transactions/export.xlsx`).expect(200);
  assert.match(x.headers['content-type'], /spreadsheet/);
  await agent.get(`/api/v1/transactions/${buy.id}/receipt`).expect(200);
  await agent.get('/api/v1/portfolios/missing').expect(404);
  await post('/auth/refresh', {}).expect(200);
  const enabled = await agent
    .patch('/api/v1/users/me/preferences')
    .set('X-CSRF-Token', csrf)
    .send({ emailMfaEnabled: true })
    .expect(200);
  const code = mail.at(-1)!.text.match(/\b\d{6}\b/)![0];
  await post('/auth/mfa/verify', { challengeId: enabled.body.data.challengeId, code }).expect(200);
  await post('/auth/logout', {}).expect(200);
  await agent.get('/api/v1/auth/me').expect(401);
  const challenge = await post('/auth/login', {
    email: 'test@example.test',
    password: 'Test123!',
  }).expect(200);
  assert.equal(challenge.body.data.requiresMfa, true);
  await post('/auth/forgot-password', { email: 'test@example.test' }).expect(200);
  const reset = new URL(mail.at(-1)!.text.match(/https?:\/\/\S+/)![0]).searchParams.get('token');
  await post('/auth/reset-password', { token: reset, password: 'Changed123!' }).expect(200);
  assert.equal(
    db.prepare('SELECT name FROM users WHERE email=?').get('test@example.test')?.name,
    'Updated Analyst',
  );
});
test('refresh reuse revokes the session and viewer role blocks financial writes', async () => {
  const { newSession, refreshSession, activeSession } =
    await import('../../src/security/sessions.js');
  const user = db.prepare('SELECT id FROM users WHERE email=?').get('test@example.test')!;
  const id = String(user.id);
  const grant = newSession(id, true);
  refreshSession(grant.cookies.refresh);
  assert.throws(() => refreshSession(grant.cookies.refresh));
  assert.throws(() =>
    activeSession(
      String(
        db
          .prepare('SELECT id FROM sessions WHERE user_id=? ORDER BY created_at DESC LIMIT 1')
          .get(id)!.id,
      ),
    ),
  );
  db.prepare("UPDATE users SET role='viewer' WHERE id=?").run(id);
  const viewer = newSession(id, false);
  const browser = request.agent(app);
  const token = (await browser.get('/api/v1/auth/csrf')).body.data.csrfToken;
  await browser
    .post('/api/v1/portfolios')
    .set('Cookie', `ft_access=${viewer.cookies.access}; ft_csrf=${token}`)
    .set('X-CSRF-Token', token)
    .send({ name: 'Forbidden portfolio', clientName: 'Viewer', baseCurrency: 'KES' })
    .expect(403);
  db.prepare("UPDATE users SET role='analyst' WHERE id=?").run(id);
});
