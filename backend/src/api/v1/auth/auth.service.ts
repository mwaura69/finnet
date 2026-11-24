import { randomBytes } from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import { AuthRepository } from './auth.repository.js';
import { ApiError } from '../../../utils/ApiError.js';
import { hashPassword, verifyPassword, dummyHash } from '../../../utils/hash.js';
import { config } from '../../../config/index.js';
import { db, atomic } from '../../../db/index.js';
import {
  hashToken,
  newSession,
  refreshSession,
  revokeAll,
  revokeSession,
  sessionData,
  activeSession,
} from '../../../security/sessions.js';
import { mfaService } from './mfa.service.js';
import { sendEmail } from '../../../utils/email.service.js';
import type { GoogleInput, GoogleProfile, LoginInput, RegisterInput } from './auth.types.js';
import type { UserModel } from '../../../db/models/user.model.js';
import { verifyToken } from '../../../utils/jwt.js';
import { renderEmail, emailContent } from '../../../utils/email.template.js';

const genericMessage =
  'If an eligible account exists, a secure link has been sent to its email address.';
const googleClient = new OAuth2Client();

export async function verifyGoogleCredential(credential: string): Promise<GoogleProfile> {
  if (!config.google.clientId)
    throw new ApiError(
      503,
      'GOOGLE_NOT_CONFIGURED',
      'Google sign-in has not been configured. Use email and password.',
    );
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: config.google.clientId,
    });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email || !payload.email_verified) throw new Error();
    return {
      googleId: payload.sub,
      email: payload.email.toLowerCase(),
      name: payload.name || payload.email.split('@')[0],
    };
  } catch {
    throw new ApiError(
      401,
      'INVALID_GOOGLE_TOKEN',
      'Google could not verify this account. Please try again.',
    );
  }
}

export class AuthService {
  constructor(
    private repository = new AuthRepository(),
    private googleVerifier = verifyGoogleCredential,
  ) {}
  private async authenticated(user: UserModel, stay = false) {
    if (!user.email_verified)
      throw new ApiError(
        403,
        'EMAIL_NOT_VERIFIED',
        'Confirm your email address before signing in. You can request another confirmation link.',
      );
    if (user.email_mfa_enabled)
      return { kind: 'mfa' as const, data: await mfaService.create(user, 'login', stay) };
    return newSession(user.id, stay);
  }

  private issueToken(userId: string, purpose: 'verify' | 'reset' | 'set') {
    const token = randomBytes(32).toString('base64url'),
      now = Date.now();
    db.prepare(
      'UPDATE auth_tokens SET consumed_at=? WHERE user_id=? AND purpose=? AND consumed_at IS NULL',
    ).run(now, userId, purpose);
    db.prepare(
      'INSERT INTO auth_tokens(id,user_id,purpose,token_hash,expires_at,created_at) VALUES(?,?,?,?,?,?)',
    ).run(
      randomBytes(16).toString('hex'),
      userId,
      purpose,
      hashToken(token),
      now + (purpose === 'verify' ? 86400000 : 1800000),
      now,
    );
    return token;
  }

  private async emailLink(user: UserModel, purpose: 'verify' | 'reset' | 'set') {
    const token = atomic(() => this.issueToken(user.id, purpose));

    const route =
      purpose === 'verify'
        ? 'verify-email'
        : purpose === 'reset'
          ? 'reset-password'
          : 'set-password';
    const link = new URL('/' + route, config.origin);
    link.searchParams.set('token', token);
    const label =
      purpose === 'verify'
        ? 'Confirm your email address'
        : purpose === 'reset'
          ? 'Reset your FinTrack password'
          : 'Set your FinTrack password';
    await sendEmail({
      to: user.email,
      subject: label,
      text: `${label}\n\nOpen this secure link: ${link.toString()}\n\n${purpose === 'verify' ? 'The link expires in 24 hours.' : 'The link expires in 30 minutes.'} It can be used once. If you did not request this, ignore this message.`,
      html: renderEmail(emailContent[purpose](link.toString())),
    });
  }

  async register(input: RegisterInput) {
    if (this.repository.findByEmail(input.email))
      throw new ApiError(409, 'EMAIL_IN_USE', 'An account with this email already exists.');
    const passwordHash = await hashPassword(input.password);
    let user: UserModel;
    try {
      user = atomic(() => this.repository.create({ ...input, passwordHash }));
    } catch (error) {
      if (this.repository.findByEmail(input.email))
        throw new ApiError(409, 'EMAIL_IN_USE', 'An account with this email already exists.');
      throw error;
    }
    await this.emailLink(user, 'verify');

    return {
      message:
        'A confirmation link has been sent to your email. Open it to confirm your account before signing in.',
      requiresVerification: true,
      email: user.email,
    };
  }

  async login(input: LoginInput) {
    const user = this.repository.findByEmail(input.email);
    const valid = await verifyPassword(input.password, user?.password_hash || dummyHash);
    if (!user || !valid || !user.password_hash)
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
    return this.authenticated(user, input.stayLoggedIn);
  }

  async google(input: GoogleInput) {
    const profile = await this.googleVerifier(input.credential);
    let user = this.repository.findByGoogleId(profile.googleId);
    if (!user) {
      const existing = this.repository.findByEmail(profile.email);
      if (existing)
        throw new ApiError(
          409,
          'GOOGLE_LINK_REQUIRED',
          'This email already has a password account. Sign in with your password; accounts are not linked automatically.',
        );
      if (!input.acceptTerms)
        throw new ApiError(
          422,
          'TERMS_REQUIRED',
          'Accept the terms and conditions to create an account.',
        );
      user = atomic(() =>
        this.repository.createWithGoogle({
          name: profile.name,
          email: profile.email,
          googleId: profile.googleId,
        }),
      );
    }
    return this.authenticated(user, input.stayLoggedIn);
  }
  async verifyMfa(input: { challengeId: string; code: string }, accessToken?: string) {
    let sid: string | undefined;
    try {
      if (accessToken) {
        const claims = verifyToken(accessToken);
        activeSession(claims.sessionId);
        sid = claims.sessionId;
      }
    } catch {
      /* No signed-in session is needed for login MFA. */
    }
    const challenge = mfaService.consume(input.challengeId, input.code, sid);
    if (challenge.purpose === 'enable' && sid) revokeSession(sid);
    return newSession(challenge.user_id, !!challenge.stay_logged_in, Date.now());
  }

  resendMfa(input: { challengeId: string }) {
    return mfaService.resend(input.challengeId);
  }
  refresh(token?: string) {
    if (!token) throw new ApiError(401, 'UNAUTHENTICATED', 'Please sign in again.');
    return refreshSession(token);
  }
  logout(sessionId?: string, refreshToken?: string) {
    if (sessionId) revokeSession(sessionId);
    if (refreshToken) {
      const row = db
        .prepare('SELECT session_id FROM refresh_tokens WHERE token_hash=?')
        .get(hashToken(refreshToken));
      if (row) revokeSession(String(row['session_id']));
    }
    return { message: 'You have been signed out.' };
  }
  me(sessionId: string) {
    return sessionData(sessionId);
  }

  async forgotPassword(email: string) {
    const user = this.repository.findByEmail(email);
    if (user?.email_verified) await this.emailLink(user, user.password_hash ? 'reset' : 'set');
    return { message: genericMessage };
  }

  async resendVerification(email: string) {
    const user = this.repository.findByEmail(email);
    if (user && !user.email_verified) await this.emailLink(user, 'verify');
    return { message: genericMessage };
  }

  verifyEmail(token: string) {
    atomic(() => {
      const record = db
        .prepare("SELECT * FROM auth_tokens WHERE token_hash=? AND purpose='verify'")
        .get(hashToken(token));
      if (!record || record['consumed_at'] !== null || Number(record['expires_at']) <= Date.now())
        throw new ApiError(
          400,
          'INVALID_LINK',
          'This confirmation link is invalid, expired or already used. Request another link.',
        );
      db.prepare('UPDATE auth_tokens SET consumed_at=? WHERE id=?').run(
        Date.now(),
        String(record['id']),
      );
      db.prepare('UPDATE users SET email_verified=1 WHERE id=?').run(String(record['user_id']));
    });
    return { message: 'Email confirmed. You can now sign in.' };
  }

  async resetPassword(input: { token: string; password: string }, purpose: 'reset' | 'set') {
    const passwordHash = await hashPassword(input.password);
    let email = '';
    atomic(() => {
      const record = db
        .prepare('SELECT * FROM auth_tokens WHERE token_hash=? AND purpose=?')
        .get(hashToken(input.token), purpose);
      if (!record || record['consumed_at'] !== null || Number(record['expires_at']) <= Date.now())
        throw new ApiError(
          400,
          'INVALID_LINK',
          'This password link is invalid, expired or already used. Request another link.',
        );
      const userId = String(record['user_id']);
      const user = this.repository.findById(userId)!;
      email = user.email;
      db.prepare(
        'UPDATE auth_tokens SET consumed_at=? WHERE user_id=? AND consumed_at IS NULL',
      ).run(Date.now(), userId);
      db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(passwordHash, userId);
      revokeAll(userId);
      db.prepare(
        'UPDATE mfa_challenges SET consumed_at=? WHERE user_id=? AND consumed_at IS NULL',
      ).run(Date.now(), userId);
    });
    await sendEmail({
      to: email,
      subject: 'Your FinTrack password was changed',
      text: 'Your password was changed and all active sessions were signed out. If this was not you, reset your password immediately.',
    });
    return { message: 'Password saved. Sign in with your new password.' };
  }

  async requestSetPassword(userId: string) {
    const user = this.repository.findById(userId)!;
    await this.emailLink(user, 'set');
    return { message: 'A secure set-password link has been sent to your email address.' };
  }

  async changePassword(userId: string, input: { currentPassword: string; password: string }) {
    const user = this.repository.findById(userId)!;
    if (!user.password_hash || !(await verifyPassword(input.currentPassword, user.password_hash)))
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Your current password is incorrect.');
    const hash = await hashPassword(input.password);
    atomic(() => {
      db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(hash, userId);
      revokeAll(userId);
      db.prepare(
        'UPDATE auth_tokens SET consumed_at=? WHERE user_id=? AND consumed_at IS NULL',
      ).run(Date.now(), userId);
    });
    await sendEmail({
      to: user.email,
      subject: 'Your FinTrack password was changed',
      text: 'Your password was changed and all active sessions were signed out. If this was not you, request a password reset.',
    });
    return { message: 'Password changed. Sign in again to continue.' };
  }
}
