import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
// Check tracked text only; ignored local credentials and private DB/outbox files are not read.
const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const findings = [];
for (const file of files) {
  if (!/\.(?:ts|js|mjs|json|md|txt|ya?ml|toml|sh)$|\.env\.example$/.test(file)) continue;
  if (statSync(file).size > 2_000_000) continue;
  const text = readFileSync(file, 'utf8');
  if (/\bsb_secret_[A-Za-z0-9_-]{15,}|\bre_[A-Za-z0-9_-]{25,}/.test(text)) findings.push(file + ': provider secret pattern');
  if (file.endsWith('.env.example') && /^(?:JWT_SECRET|MFA_HMAC_SECRET|RESEND_API_KEY|SMTP_PASS)=.+$/m.test(text)) findings.push(file + ': nonblank example credential');
}
if (findings.length) {
  console.error('Credential check failed (values omitted):\n' + findings.join('\n'));
  process.exitCode = 1;
} else console.log('Tracked source/example credential check passed. Rotate any historically exposed keys separately.');
