import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import '../setup.js';
const { createApp } = await import('../../src/app.js');
const { config } = await import('../../src/config/index.js');
const { environmentSchema } = await import('../../src/config/env.js');

test('proxy trust is bounded and rate limits follow the nearest forwarded client, not a spoofed prefix', async () => {
  const original = config.trustProxyHops;
  config.trustProxyHops = 1;
  const app = createApp();
  config.trustProxyHops = original;
  assert.equal(app.get('trust proxy'), 1);
  const trust = app.get('trust proxy fn');
  assert.equal(trust('127.0.0.1', 0), true);
  assert.equal(trust('198.51.100.10', 1), false);
  const agent = request.agent(app);
  const csrf = (await agent.get('/api/v1/auth/csrf')).body.data.csrfToken;
  const login = (forwarded: string) =>
    agent
      .post('/api/v1/auth/login')
      .set('X-CSRF-Token', csrf)
      .set('X-Forwarded-For', forwarded)
      .send({ email: 'proxy-test@example.test', password: 'Wrong123!' })
      .expect(401);
  const remaining = (header: string) => Number(header.match(/r=(\d+)/)![1]);
  const first = await login('192.0.2.1, 198.51.100.10');
  const sameClient = await login('192.0.2.2, 198.51.100.10');
  const otherClient = await login('192.0.2.1, 198.51.100.11');
  assert.equal(
    remaining(sameClient.headers['ratelimit']),
    remaining(first.headers['ratelimit']) - 1,
  );
  assert.equal(remaining(otherClient.headers['ratelimit']), remaining(first.headers['ratelimit']));
});
test('proxy hop validation rejects boolean trust-all and invalid hop counts', () => {
  assert.equal(environmentSchema.safeParse({ TRUST_PROXY_HOPS: 'true' }).success, false);
  assert.equal(environmentSchema.safeParse({ TRUST_PROXY_HOPS: '-1' }).success, false);
  assert.equal(environmentSchema.safeParse({ TRUST_PROXY_HOPS: '1.5' }).success, false);
  assert.equal(environmentSchema.safeParse({ TRUST_PROXY_HOPS: '11' }).success, false);
  assert.equal(environmentSchema.safeParse({ TRUST_PROXY_HOPS: '1' }).success, true);
});
