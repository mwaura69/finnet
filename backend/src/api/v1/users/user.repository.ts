import { randomUUID } from 'node:crypto';
import { db } from '../../../db/index.js';
import type { UserModel } from '../../../db/models/user.model.js';
export class UserRepository {
  async findByEmail(email: string) {
    return (await db.prepare('SELECT * FROM users WHERE email=?').get(email)) as unknown as
      UserModel | undefined;
  }
  async findByGoogleId(id: string) {
    return (await db.prepare('SELECT * FROM users WHERE google_id=?').get(id)) as unknown as
      UserModel | undefined;
  }
  async findById(id: string) {
    return (await db.prepare('SELECT * FROM users WHERE id=?').get(id)) as unknown as
      UserModel | undefined;
  }
  async create(input: {
    name: string;
    email: string;
    passwordHash: string;
    googleId?: string;
    verified?: boolean;
  }) {
    const id = randomUUID();
    await db
      .prepare(
        'INSERT INTO users(id,name,email,password_hash,google_id,email_verified,terms_accepted_at,terms_version) VALUES(?,?,?,?,?,?,?,?)',
      )
      .run(
        id,
        input.name,
        input.email,
        input.passwordHash,
        input.googleId || null,
        input.verified ? 1 : 0,
        new Date().toISOString(),
        '2026-11-24',
      );
    return (await this.findById(id))!;
  }
  async createWithGoogle(input: { name: string; email: string; googleId: string }) {
    return await this.create({ ...input, passwordHash: '', verified: true });
  }
  async linkGoogleAccount(userId: string, googleId: string) {
    await db.prepare('UPDATE users SET google_id=? WHERE id=?').run(googleId, userId);
    return (await this.findById(userId))!;
  }
}
