import { randomUUID } from 'node:crypto';
import { db } from '../../../db/index.js';
import type { UserModel } from '../../../db/models/user.model.js';
export class UserRepository {
  findByEmail(email: string) {
    return db.prepare('SELECT * FROM users WHERE email=?').get(email) as unknown as
      UserModel | undefined;
  }
  findByGoogleId(id: string) {
    return db.prepare('SELECT * FROM users WHERE google_id=?').get(id) as unknown as
      UserModel | undefined;
  }
  findById(id: string) {
    return db.prepare('SELECT * FROM users WHERE id=?').get(id) as unknown as UserModel | undefined;
  }
  create(input: {
    name: string;
    email: string;
    passwordHash: string;
    googleId?: string;
    verified?: boolean;
  }) {
    const id = randomUUID();
    db.prepare(
      'INSERT INTO users(id,name,email,password_hash,google_id,email_verified,terms_accepted_at,terms_version) VALUES(?,?,?,?,?,?,?,?)',
    ).run(
      id,
      input.name,
      input.email,
      input.passwordHash,
      input.googleId || null,
      input.verified ? 1 : 0,
      new Date().toISOString(),
      '2026-11-24',
    );
    return this.findById(id)!;
  }
  createWithGoogle(input: { name: string; email: string; googleId: string }) {
    return this.create({ ...input, passwordHash: '', verified: true });
  }
  linkGoogleAccount(userId: string, googleId: string) {
    db.prepare('UPDATE users SET google_id=? WHERE id=?').run(googleId, userId);
    return this.findById(userId)!;
  }
}
