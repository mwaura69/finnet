import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import '../setup.js';
const { db } = await import('../../src/db/index.js');
const { createApp } = await import('../../src/app.js');
const { newSession } = await import('../../src/security/sessions.js');
const app = createApp();

test('ownership, shared permissions, currency lock, rollback and cascade deletion protect the real API', async () => {
  for (const id of ['owner-test', 'other-test'])
    await db
      .prepare(
        'INSERT INTO users(id,name,email,password_hash,email_verified,transaction_emails) VALUES(?,?,?,?,1,0)',
      )
      .run(id, id, id + '@example.test', bcrypt.hashSync('Test123!', 4));
  async function client(id: string) {
    const grant = await newSession(id, false);
    const agent = request.agent(app);
    const csrf = (await agent.get('/api/v1/auth/csrf')).body.data.csrfToken;
    const cookie = `ft_access=${grant.cookies.access}; ft_csrf=${csrf}`;
    return {
      get: (path: string) => agent.get('/api/v1' + path).set('Cookie', cookie),
      post: (path: string, body: object) =>
        agent
          .post('/api/v1' + path)
          .set('Cookie', cookie)
          .set('X-CSRF-Token', csrf)
          .send(body),
      put: (path: string, body: object) =>
        agent
          .put('/api/v1' + path)
          .set('Cookie', cookie)
          .set('X-CSRF-Token', csrf)
          .send(body),
      delete: (path: string) =>
        agent
          .delete('/api/v1' + path)
          .set('Cookie', cookie)
          .set('X-CSRF-Token', csrf),
    };
  }
  const owner = await client('owner-test'),
    other = await client('other-test');
  const fields = {
    name: 'QA fictional portfolio',
    clientName: 'Example Client',
    baseCurrency: 'KES',
  };
  const p = (await owner.post('/portfolios', fields).expect(201)).body.data;
  await request(app).get('/api/v1/portfolios').expect(401);
  await other.get(`/portfolios/${p.id}`).expect(404);
  await other.get(`/portfolios/${p.id}/summary`).expect(404);
  await other.get(`/portfolios/${p.id}/transactions`).expect(404);
  await other.put(`/portfolios/${p.id}`, fields).expect(404);
  await other.delete(`/portfolios/${p.id}`).expect(404);
  const trade = {
    instrument: 'SCOM',
    type: 'BUY',
    quantity: 100,
    unitPrice: 25,
    tradeDate: '2026-01-01',
  };
  await other.post(`/portfolios/${p.id}/transactions`, trade).expect(404);
  const buy = (await owner.post(`/portfolios/${p.id}/transactions`, trade).expect(201)).body.data;
  await other.get(`/transactions/${buy.id}/receipt`).expect(404);
  await other.delete(`/transactions/${buy.id}`).expect(404);
  await owner.put(`/portfolios/${p.id}`, { ...fields, baseCurrency: 'USD' }).expect(422);
  const sells = await Promise.all(
    [1, 2].map(() =>
      owner.post(`/portfolios/${p.id}/transactions`, {
        ...trade,
        type: 'SELL',
        quantity: 60,
        tradeDate: '2026-01-02',
      }),
    ),
  );
  assert.deepEqual(sells.map((r) => r.status).sort(), [201, 422]);
  assert.equal(
    (await owner.get(`/portfolios/${p.id}/summary`)).body.data.holdings[0].netQuantity,
    40,
  );
  await owner.put(`/portfolios/${p.id}/members/other-test`, { permission: 'read' }).expect(200);
  await other.get(`/portfolios/${p.id}`).expect(200);
  await other.post(`/portfolios/${p.id}/transactions`, trade).expect(403);
  await owner.put(`/portfolios/${p.id}/members/other-test`, { permission: 'write' }).expect(200);
  await other.post(`/portfolios/${p.id}/transactions`, { ...trade, instrument: 'KCB' }).expect(201);
  await other.delete(`/portfolios/${p.id}`).expect(403);
  await owner.delete(`/portfolios/${p.id}/members/other-test`).expect(204);
  await other.get(`/portfolios/${p.id}`).expect(404);
  await owner.delete(`/portfolios/${p.id}`).expect(204);
  assert.equal(
    (await db.prepare('SELECT COUNT(*) AS n FROM transactions WHERE portfolio_id=?').get(p.id))!.n,
    0,
  );
  if (db.kind === 'postgres') {
    await db.exec('CREATE TABLE public.users(id TEXT PRIMARY KEY)');
    await db.prepare('INSERT INTO public.users(id) VALUES(?)').run('unrelated-existing-app');
    assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM public.users').get())!.n, 1);
    assert.equal(
      await db.prepare('SELECT id FROM users WHERE id=?').get('unrelated-existing-app'),
      undefined,
    );
    await db.exec('DROP TABLE public.users');
  }
});
