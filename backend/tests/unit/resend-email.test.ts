import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../setup.js';
const { sendResendEmail } = await import('../../src/utils/resend-email.js');
const { environmentSchema } = await import('../../src/config/env.js');
const message = {
  to: 'recipient@example.test',
  subject: 'Confirm email',
  text: 'Token: private-token',
  html: '<p>private-token</p>',
};
const settings = { from: 'FinTrack <hello@example.test>', apiKey: 're_test_only' };
const failure = (error: unknown) => {
  assert.ok(error instanceof Error);
  assert.equal((error as Error & { status: number }).status, 503);
  assert.equal(error.message.includes('private-token'), false);
  assert.equal(error.message.includes('re_test_only'), false);
  return true;
};
test('HTTPS transport sends both email formats with credentials server-side and a bounded timeout', async () => {
  const result = await sendResendEmail(message, settings, async (url, init) => {
    assert.equal(url, 'https://api.resend.com/emails');
    assert.equal(init?.method, 'POST');
    assert.equal(init?.redirect, 'error');
    assert.equal(new Headers(init?.headers).get('Authorization'), 'Bearer re_test_only');
    assert.ok(init?.signal);
    assert.deepEqual(JSON.parse(String(init?.body)), {
      from: settings.from,
      to: [message.to],
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
    return Response.json({ id: 'provider-message-id' });
  });
  assert.equal(result.messageId, 'provider-message-id');
});
test('HTTPS provider failures are sanitized, including rate limits, invalid keys and broken responses', async () => {
  for (const status of [401, 403, 422, 429, 500]) {
    await assert.rejects(
      sendResendEmail(
        message,
        settings,
        async () => new Response('private-token re_test_only', { status }),
      ),
      failure,
    );
  }
  await assert.rejects(
    sendResendEmail(message, settings, async () => {
      throw new Error('private-token re_test_only');
    }),
    failure,
  );
  await assert.rejects(
    sendResendEmail(message, settings, async () => new Response('not json')),
    failure,
  );
  await assert.rejects(
    sendResendEmail(message, settings, async () => Response.json({})),
    failure,
  );
  await assert.rejects(
    sendResendEmail(message, { from: settings.from }, async () => {
      throw new Error('Must not call provider');
    }),
    failure,
  );
});
test('production allows a configured HTTPS mail provider and rejects missing keys or outbox delivery', () => {
  const production = {
    NODE_ENV: 'production',
    JWT_SECRET: 'a'.repeat(48),
    MFA_HMAC_SECRET: 'b'.repeat(48),
    FRONTEND_ORIGIN: 'https://finnet-nexus.netlify.app',
    MAIL_DELIVERY: 'resend',
    RESEND_API_KEY: 're_test_only',
  };
  assert.equal(environmentSchema.safeParse(production).success, true);
  assert.equal(environmentSchema.safeParse({ ...production, RESEND_API_KEY: '' }).success, false);
  assert.equal(
    environmentSchema.safeParse({ ...production, MAIL_DELIVERY: 'outbox' }).success,
    false,
  );
  assert.equal(
    environmentSchema.safeParse({
      ...production,
      MAIL_DELIVERY: 'smtp',
      SMTP_HOST: 'smtp.example.test',
    }).success,
    true,
  );
});
