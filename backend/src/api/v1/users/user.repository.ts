import { randomUUID } from 'node:crypto';
import { db } from '../../../db/index.js';
import type { UserModel } from '../../../db/models/user.model.js';
export class UserRepository {
  findByEmail(email: string) {
    return db.prepare('SELECT * FROM users WHERE email=?').get(email) as unknown as
      UserModel | undefined;
  }
  findById(id: string) {
    return db.prepare('SELECT * FROM users WHERE id=?').get(id) as unknown as UserModel | undefined;
  }
  create(input: { name: string; email: string; passwordHash: string }) {
    const id = randomUUID();
    db.prepare('INSERT INTO users(id,name,email,password_hash) VALUES(?,?,?,?)').run(
      id,
      input.name,
      input.email,
      input.passwordHash,
    );
    return this.findById(id)!;
  }
}
