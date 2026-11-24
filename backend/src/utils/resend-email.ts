import { ApiError } from './ApiError.js';
import { logger } from '../config/logger.js';
import type { EmailMessage } from './email.service.js';

/** HTTPS transport for hosts that block outbound SMTP. Never log message bodies or API keys. */
export async function sendResendEmail(
  message: EmailMessage,
  settings: { apiKey?: string; from: string },
  request: typeof fetch = fetch,
) {
  if (!settings.apiKey)
    throw new ApiError(503, 'EMAIL_NOT_CONFIGURED', 'Email delivery is not configured.');
  try {
    const response = await request('https://api.resend.com/emails', {
      method: 'POST',
      redirect: 'error',
      headers: {
        Authorization: `Bearer ${settings.apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(15_000),
      body: JSON.stringify({
        from: settings.from,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
    });
    if (!response.ok) {
      // Provider error bodies may contain addresses or message content. Log status only.
      logger.warn(
        { provider: 'resend', status: response.status },
        'Email provider rejected delivery',
      );
      throw new ApiError(
        503,
        'EMAIL_DELIVERY_FAILED',
        response.status === 401 || response.status === 403 || response.status === 422
          ? 'Email provider rejected delivery. The administrator must check the API key and verified sender domain.'
          : 'Email delivery is temporarily unavailable. Please try again.',
      );
    }
    const payload: unknown = await response.json();
    if (
      !payload ||
      typeof payload !== 'object' ||
      !('id' in payload) ||
      typeof payload.id !== 'string' ||
      !payload.id
    )
      throw new Error('Invalid provider response');
    return { messageId: payload.id, delivery: 'resend' as const };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.warn({ provider: 'resend' }, 'Email provider request failed');
    throw new ApiError(
      503,
      'EMAIL_DELIVERY_FAILED',
      'Email delivery is temporarily unavailable. Please try again.',
    );
  }
}
