import nodemailer from 'nodemailer';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { config } from '../config/index.js';
import { ApiError } from './ApiError.js';
export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}
let testSender: ((message: EmailMessage) => Promise<unknown>) | null = null;
export function setEmailSenderForTests(sender: typeof testSender) {
  if (process.env['NODE_ENV'] !== 'test') throw new Error('Test sender is only allowed in tests.');
  testSender = sender;
}
export async function sendEmail(message: EmailMessage) {
  if (testSender) return testSender(message);
  if (config.mail.delivery === 'outbox') {
    const id = randomUUID();
    await mkdir(config.mail.outboxPath, { recursive: true, mode: 0o700 });
    await writeFile(
      resolve(config.mail.outboxPath, `${Date.now()}-${id}.json`),
      JSON.stringify(
        { id, createdAt: new Date().toISOString(), from: config.smtp.from, ...message },
        null,
        2,
      ),
      { mode: 0o600 },
    );
    return { messageId: id, delivery: 'outbox' };
  }
  if (!config.smtp.host)
    throw new ApiError(503, 'EMAIL_NOT_CONFIGURED', 'Email delivery is not configured.');
  const transport = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    requireTLS: config.smtp.port === 587,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
    ...(config.smtp.user ? { auth: { user: config.smtp.user, pass: config.smtp.pass } } : {}),
  });
  try {
    return await transport.sendMail({ from: config.smtp.from, ...message });
  } catch (error) {
    const code = (error as { code?: string }).code;
    const detail =
      code === 'EAUTH'
        ? 'SMTP authentication failed. Check the account and app password.'
        : code === 'EDNS' || code === 'ENOTFOUND'
          ? 'SMTP server could not be found. Check SMTP_HOST.'
          : 'Email delivery is temporarily unavailable. Please try again.';
    throw new ApiError(503, 'EMAIL_DELIVERY_FAILED', detail);
  }
}
export const sendMfaCode = (to: string, code: string) =>
  sendEmail({
    to,
    subject: 'Your FinTrack verification code',
    text: `Your FinTrack verification code is ${code}. It expires in 10 minutes. If this was not you, do not share the code and review your account security.`,
  });
