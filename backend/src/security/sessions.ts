import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { db, atomic } from '../db/index.js';
import { config } from '../config/index.js';
import { signToken } from '../utils/jwt.js';
import { ApiError } from '../utils/ApiError.js';
import { UserRepository } from '../api/v1/users/user.repository.js';
import { toUserDto } from '../api/v1/users/user.mapper.js';
export interface SessionRow {
  id: string;
  user_id: string;
  created_at: number;
  last_seen_at: number;
  expires_at: number;
  revoked_at: number | null;
  stay_logged_in: number;
  mfa_verified_at: number | null;
}
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
export function findSession(id: string) {
  return db.prepare('SELECT * FROM sessions WHERE id=?').get(id) as unknown as
    SessionRow | undefined;
}
export function activeSession(id: string) {
  const row = findSession(id);
  if (
    !row ||
    row.revoked_at ||
    row.expires_at <= Date.now() ||
    row.last_seen_at + config.session.idleSeconds * 1000 <= Date.now()
  )
    throw new ApiError(401, 'SESSION_EXPIRED', 'Your session expired. Please sign in again.');
  return row;
}
export function revokeSession(id: string) {
  db.prepare('UPDATE sessions SET revoked_at=? WHERE id=? AND revoked_at IS NULL').run(
    Date.now(),
    id,
  );
}
export function revokeAll(userId: string) {
  db.prepare('UPDATE sessions SET revoked_at=? WHERE user_id=? AND revoked_at IS NULL').run(
    Date.now(),
    userId,
  );
}
function grant(row: SessionRow, refresh: string) {
  const user = new UserRepository().findById(row.user_id);
  if (!user) throw new ApiError(401, 'UNAUTHENTICATED', 'Please sign in again.');
  return {
    kind: 'session' as const,
    data: {
      user: toUserDto(user),
      demoMode: config.demo,
      session: {
        accessExpiresAt: new Date(Date.now() + config.session.accessSeconds * 1000).toISOString(),
        sessionExpiresAt: new Date(row.expires_at).toISOString(),
        idleTimeoutSeconds: config.session.idleSeconds,
      },
    },
    cookies: {
      access: signToken(row.user_id, row.id),
      refresh,
      stayLoggedIn: !!row.stay_logged_in,
      expiresAt: row.expires_at,
    },
  };
}
export function newSession(userId: string, stayLoggedIn: boolean, mfaAt: number | null = null) {
  const now = Date.now(),
    id = randomUUID(),
    refresh = randomBytes(48).toString('base64url');
  const expires =
    now + (stayLoggedIn ? config.session.persistentSeconds : config.session.normalSeconds) * 1000;
  atomic(() => {
    db.prepare(
      'INSERT INTO sessions(id,user_id,created_at,last_seen_at,expires_at,stay_logged_in,mfa_verified_at) VALUES(?,?,?,?,?,?,?)',
    ).run(id, userId, now, now, expires, stayLoggedIn ? 1 : 0, mfaAt);
    db.prepare(
      'INSERT INTO refresh_tokens(token_hash,session_id,expires_at,created_at) VALUES(?,?,?,?)',
    ).run(hashToken(refresh), id, expires, now);
  });
  return grant(findSession(id)!, refresh);
}
export function refreshSession(token: string) {
  const hash = hashToken(token);
  let failure = false;
  let updated: SessionRow | undefined;
  const refresh = randomBytes(48).toString('base64url');
  atomic(() => {
    const record = db.prepare('SELECT * FROM refresh_tokens WHERE token_hash=?').get(hash);
    if (!record) {
      failure = true;
      return;
    }
    const id = String(record['session_id']);
    const row = findSession(id);
    if (record['consumed_at'] !== null) {
      revokeSession(id);
      failure = true;
      return;
    }
    try {
      updated = activeSession(id);
    } catch {
      if (row) revokeSession(id);
      failure = true;
      return;
    }
    if (Number(record['expires_at']) <= Date.now()) {
      revokeSession(id);
      failure = true;
      return;
    }
    const now = Date.now();
    db.prepare('UPDATE refresh_tokens SET consumed_at=? WHERE token_hash=?').run(now, hash);
    db.prepare(
      'INSERT INTO refresh_tokens(token_hash,session_id,expires_at,created_at) VALUES(?,?,?,?)',
    ).run(hashToken(refresh), id, updated.expires_at, now);
    db.prepare('UPDATE sessions SET last_seen_at=? WHERE id=?').run(now, id);
  });
  if (failure || !updated)
    throw new ApiError(
      401,
      'SESSION_EXPIRED',
      'Session expired or refresh token was reused. Please sign in again.',
    );
  return grant(updated, refresh);
}
export function sessionData(id: string) {
  const row = activeSession(id);
  return grant(row, '').data;
}
