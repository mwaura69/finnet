import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import { db } from './db/database.js';
import { config } from './config.js';
import { ApiError } from './errors.js';
import { loginSchema, registerSchema } from './validation.js';
declare global { namespace Express { interface Request { userId: string; } } }
function session(row: Record<string,unknown>) {
  return { token:jwt.sign({},config.secret,{subject:String(row['id']),expiresIn:'2h',issuer:'fintrack',audience:'fintrack-web',algorithm:'HS256'}),user:{id:row['id'],name:row['name'],email:row['email']},demoMode:config.demo };
}
export function requireAuth(req: Request,_res: Response,next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new Error();
    const payload = jwt.verify(header.slice(7),config.secret,{issuer:'fintrack',audience:'fintrack-web',algorithms:['HS256']});
    if (typeof payload === 'string' || !payload.sub || !db.prepare('SELECT id FROM users WHERE id=?').get(payload.sub)) throw new Error();
    req.userId = payload.sub; next();
  } catch { next(new ApiError(401,'UNAUTHENTICATED','Please sign in again to continue.')); }
}
export const authRouter = Router();
authRouter.post('/register',async (req,res) => {
  const input = registerSchema.parse(req.body);
  if (db.prepare('SELECT id FROM users WHERE email=?').get(input.email)) throw new ApiError(409,'EMAIL_IN_USE','An account with this email already exists.');
  const id = randomUUID(); const hash = await bcrypt.hash(input.password,12);
  try { db.prepare('INSERT INTO users(id,name,email,password_hash) VALUES(?,?,?,?)').run(id,input.name,input.email,hash); }
  catch(error) { if (db.prepare('SELECT id FROM users WHERE email=?').get(input.email)) throw new ApiError(409,'EMAIL_IN_USE','An account with this email already exists.'); throw error; }
  res.status(201).json({data:session({id,name:input.name,email:input.email})});
});
authRouter.post('/login',async (req,res) => {
  const input = loginSchema.parse(req.body);
  const row = db.prepare('SELECT * FROM users WHERE email=?').get(input.email);
  const dummy = '$2b$12$yT9vQKGZjkxXHsUOXJMnAOwT2vFYMdCH0s0BXYwO2GftRJ3zEivZG';
  const valid = await bcrypt.compare(input.password,String(row?.['password_hash'] || dummy));
  if (!row || !valid) throw new ApiError(401,'INVALID_CREDENTIALS','Email or password is incorrect.');
  res.json({data:session(row)});
});
authRouter.get('/me',requireAuth,(req,res) => { const user=db.prepare('SELECT id,name,email FROM users WHERE id=?').get(req.userId);res.json({data:{user,demoMode:config.demo}}); });
