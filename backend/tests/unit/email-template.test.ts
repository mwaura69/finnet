import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderEmail, emailContent } from '../../src/utils/email.template.js';
test('all account action emails retain their tokens and escape untrusted content', () => {
  for (const purpose of ['verify', 'reset', 'set'] as const) {
    const html = renderEmail(
      emailContent[purpose](
        'https://fintrack.example/' + purpose + '?token=test-token&source=email',
      ),
    );
    assert.match(html, /href="https:\/\/fintrack.example\//);
    assert.match(html, /token=test-token&amp;source=email/);
    assert.equal(html.includes('localhost'), false);
  }
  const escaped = renderEmail({
    preheader: '<script>',
    heading: '<img>',
    paragraphs: ['<script>alert(1)</script>'],
  });
  assert.equal(escaped.includes('<script>'), false);
  assert.match(escaped, /&lt;script&gt;/);
  assert.throws(() =>
    renderEmail({
      preheader: '',
      heading: '',
      paragraphs: [],
      cta: { label: 'Unsafe', url: 'javascript:alert(1)' },
    }),
  );
});
