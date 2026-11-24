import { createHmac, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import { db, atomic } from '../../../db/index.js';
import { config } from '../../../config/index.js';
import { ApiError } from '../../../utils/ApiError.js';
import { sendMfaCode } from '../../../utils/email.service.js';
import type { UserModel } from '../../../db/models/user.model.js';

export interface MfaChallenge {
  id: string;
  user_id: string;
  purpose: 'login' | 'enable';
  session_id: string | null;
  code_hash: string;
  expires_at: number;
  attempts: number;
  consumed_at: number | null;
  last_sent_at: number;
  stay_logged_in: number;
}

const codeHash = (id: string, code: string) =>
  createHmac('sha256', config.mfa.secret).update(`${id}:${code}`).digest('hex');

function hint(email: string) {
  const [name, domain] = email.split('@');
  return name.slice(0, 2) + '***@' + domain;
}

export class MfaService {
  async create(
    user: UserModel,
    purpose: 'login' | 'enable',
    stay = false,
    sessionId: string | null = null,
  ) {
    const now = Date.now(),
      id = randomUUID(),
      code = randomInt(0, 1000000).toString().padStart(6, '0');
    atomic(() => {
      const last = db
        .prepare(
          'SELECT last_sent_at FROM mfa_challenges WHERE user_id=? AND purpose=? ORDER BY last_sent_at DESC LIMIT 1',
        )
        .get(user.id, purpose);
      if (last && Number(last['last_sent_at']) + config.mfa.resendCooldownMs > now)
        throw new ApiError(
          429,
          'MFA_COOLDOWN',
          'Wait one minute before requesting another verification code.',
        );
      db.prepare(
        'UPDATE mfa_challenges SET consumed_at=? WHERE user_id=? AND purpose=? AND consumed_at IS NULL',
      ).run(now, user.id, purpose);
      db.prepare(
        'INSERT INTO mfa_challenges(id,user_id,purpose,session_id,code_hash,expires_at,last_sent_at,stay_logged_in) VALUES(?,?,?,?,?,?,?,?)',
      ).run(
        id,
        user.id,
        purpose,
        sessionId,
        codeHash(id, code),
        now + config.mfa.codeTtlMs,
        now,
        stay ? 1 : 0,
      );
    });
    await sendMfaCode(user.email, code);
    return {
      requiresMfa: true as const,
      challengeId: id,
      emailHint: hint(user.email),
      expiresAt: new Date(now + config.mfa.codeTtlMs).toISOString(),
      purpose,
    };
  }

  async resend(id: string) {
    const record = this.record(id);
    if (!record || record.consumed_at || record.expires_at <= Date.now())
      throw new ApiError(401, 'MFA_EXPIRED', 'Verification expired. Please sign in again.');
    const now = Date.now();
    if (record.last_sent_at + config.mfa.resendCooldownMs > now)
      throw new ApiError(429, 'MFA_COOLDOWN', 'Wait one minute before requesting a new code.');
    const code = randomInt(0, 1000000).toString().padStart(6, '0');
    db.prepare(
      'UPDATE mfa_challenges SET code_hash=?,expires_at=?,attempts=0,last_sent_at=? WHERE id=? AND consumed_at IS NULL',
    ).run(codeHash(id, code), now + config.mfa.codeTtlMs, now, id);
    const user = db.prepare('SELECT email FROM users WHERE id=?').get(record.user_id)!;

    await sendMfaCode(String(user['email']), code);
    return {
      requiresMfa: true as const,
      challengeId: id,
      emailHint: hint(String(user['email'])),
      expiresAt: new Date(now + config.mfa.codeTtlMs).toISOString(),
      purpose: record.purpose,
    };
  }
  record(id: string) {
    return db.prepare('SELECT * FROM mfa_challenges WHERE id=?').get(id) as unknown as
      MfaChallenge | undefined;
  }
  consume(id: string, code: string, sessionId?: string) {
    let failure: ApiError | undefined;
    let consumed: MfaChallenge | undefined;
    atomic(() => {
      const row = this.record(id);
      if (!row || row.consumed_at || row.expires_at <= Date.now()) {
        failure = new ApiError(401, 'MFA_EXPIRED', 'Verification expired. Please sign in again.');
        return;
      }
      if (row.purpose === 'enable' && row.session_id !== sessionId) {
        failure = new ApiError(
          403,
          'MFA_SESSION_MISMATCH',
          'Use the same signed-in session to enable verification.',
        );
        return;
      }
      const attempts = row.attempts + 1;
      db.prepare('UPDATE mfa_challenges SET attempts=? WHERE id=?').run(attempts, id);
      if (attempts > config.mfa.maxAttempts) {
        db.prepare('UPDATE mfa_challenges SET consumed_at=? WHERE id=?').run(Date.now(), id);
        failure = new ApiError(
          429,
          'MFA_LOCKED',
          'Too many attempts. Sign in again to request another code.',
        );
        return;
      }
      const actual = Buffer.from(codeHash(id, code)),
        expected = Buffer.from(row.code_hash);
      if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
        failure = new ApiError(401, 'MFA_INVALID', 'That verification code is incorrect.');
        return;
      }
      db.prepare('UPDATE mfa_challenges SET consumed_at=? WHERE id=?').run(Date.now(), id);
      if (row.purpose === 'enable')
        db.prepare('UPDATE users SET email_mfa_enabled=1 WHERE id=?').run(row.user_id);
      consumed = row;
    });
    if (failure) throw failure;
    return consumed!;
  }
}
export const mfaService = new MfaService();
