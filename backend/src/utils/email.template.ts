// Shared Finnet email branding.
const brand = {
  navy: '#162b42',
  accent: '#51b630',
  accentText: '#162b42', // dark text on the green button keeps AA contrast
  text: '#1F2937',
  muted: '#6B7280',
  border: '#E5E7EB',
  page: '#F3F4F6',
  font: "-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
};

// A text wordmark avoids broken or blocked remote images in email clients.

export interface EmailContent {
  preheader: string; // hidden inbox preview text
  heading: string;
  paragraphs: string[];
  cta?: { label: string; url: string };
  note?: string; // small print under the button
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function renderEmail(c: EmailContent): string {
  if (c.cta && !['https:', 'http:'].includes(new URL(c.cta.url).protocol)) {
    throw new Error('Email action links must use HTTP or HTTPS.');
  }
  const body = c.paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:16px;line-height:24px;color:${brand.text};">${esc(p)}</p>`,
    )
    .join('');

  const button = c.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;">
        <tr><td bgcolor="${brand.accent}" style="border-radius:8px;">
          <a href="${esc(c.cta.url)}" target="_blank"
             style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:600;color:${brand.accentText};text-decoration:none;border-radius:8px;">
            ${esc(c.cta.label)}
          </a>
        </td></tr>
      </table>
      <p style="margin:0 0 16px;font-size:13px;line-height:20px;color:${brand.muted};">
        Button not working? Copy and paste this link into your browser:<br>
        <a href="${esc(c.cta.url)}" style="color:${brand.muted};word-break:break-all;">${esc(c.cta.url)}</a>
      </p>`
    : '';

  const note = c.note
    ? `<p style="margin:0;font-size:13px;line-height:20px;color:${brand.muted};">${esc(c.note)}</p>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${esc(c.heading)}</title>
</head>
<body style="margin:0;padding:0;background:${brand.page};font-family:${brand.font};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(c.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${brand.page}">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="max-width:600px;background:#ffffff;border:1px solid ${brand.border};border-radius:12px;overflow:hidden;">
        <tr><td bgcolor="${brand.navy}" style="padding:24px 32px;">
          <span style="color:#ffffff;font-size:28px;font-weight:700;">Finnet</span><br><span style="color:#95df75;font-size:11px;letter-spacing:3px;">NEXUS GROUP · FINTRACK</span>
        </td></tr>
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 16px;font-size:24px;line-height:32px;color:${brand.navy};">${esc(c.heading)}</h1>
          ${body}${button}${note}
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid ${brand.border};background:#FAFAFA;">
          <p style="margin:0;font-size:12px;line-height:18px;color:${brand.muted};">
            FinTrack by Finnet Technologies · Part of Finnet Group<br>
            You received this email because of activity on your FinTrack account.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// Ready-made content for each flow in auth.service.ts
export const emailContent = {
  verify: (url: string): EmailContent => ({
    preheader: 'Confirm your email to finish setting up FinTrack.',
    heading: 'Confirm your email address',
    paragraphs: ['Welcome to FinTrack. Confirm your email address to activate your account.'],
    cta: { label: 'Confirm email', url },
    note: 'This link expires in 24 hours and can be used once. If you did not create an account, ignore this message.',
  }),
  reset: (url: string): EmailContent => ({
    preheader: 'Reset your FinTrack password.',
    heading: 'Reset your password',
    paragraphs: ['We received a request to reset your FinTrack password.'],
    cta: { label: 'Reset password', url },
    note: 'This link expires in 30 minutes and can be used once. If you did not request this, ignore this message.',
  }),
  set: (url: string): EmailContent => ({
    preheader: 'Set a password for your FinTrack account.',
    heading: 'Set your password',
    paragraphs: ['Use the button below to set a password for your FinTrack account.'],
    cta: { label: 'Set password', url },
    note: 'This link expires in 30 minutes and can be used once. If you did not request this, ignore this message.',
  }),
  passwordChanged: (): EmailContent => ({
    preheader: 'Your FinTrack password was changed.',
    heading: 'Your password was changed',
    paragraphs: [
      'Your password was changed and all active sessions were signed out.',
      'If this was not you, reset your password immediately.',
    ],
  }),
};
