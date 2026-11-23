import bcrypt from 'bcryptjs';
export const hashPassword = (password: string) => bcrypt.hash(password, 12);
export const verifyPassword = (password: string, hash: string) => bcrypt.compare(password, hash);
export const dummyHash = '$2b$12$yT9vQKGZjkxXHsUOXJMnAOwT2vFYMdCH0s0BXYwO2GftRJ3zEivZG';
