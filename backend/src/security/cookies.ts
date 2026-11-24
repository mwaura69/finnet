import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Request, Response, RequestHandler } from 'express';
import { config } from '../config/index.js';
import { ApiError } from '../utils/ApiError.js';
export function cookies(req: Request): Record<string, string> {
  const pairs = (req.headers.cookie || '')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const index = s.indexOf('=');
      if (index < 0) return ['', ''];
      try {
        return [s.slice(0, index), decodeURIComponent(s.slice(index + 1))];
      } catch {
        return ['', ''];
      }
    });
  return Object.fromEntries(pairs);
}
const base = { httpOnly: true, secure: config.production, sameSite: 'lax' as const, path: '/api' };
export function setSessionCookies(
  res: Response,
  grant: { access: string; refresh: string; stayLoggedIn: boolean; expiresAt: number },
) {
  const remain = Math.max(0, grant.expiresAt - Date.now());
  res.cookie('ft_access', grant.access, {
    ...base,
    ...(grant.stayLoggedIn
      ? { maxAge: Math.min(config.session.accessSeconds * 1000, remain) }
      : {}),
  });
  res.cookie('ft_refresh', grant.refresh, {
    ...base,
    ...(grant.stayLoggedIn ? { maxAge: remain } : {}),
  });
}
export function clearSessionCookies(res: Response) {
  res.clearCookie('ft_access', base);
  res.clearCookie('ft_refresh', base);
}
function signature(value: string) {
  return createHmac('sha256', config.secret)
    .update('csrf:' + value)
    .digest('hex');
}
function valid(value: string | undefined) {
  if (!value) return false;
  const [nonce, sig, ...rest] = value.split('.');
  if (!nonce || !sig || rest.length) return false;
  const expected = signature(nonce);
  return sig.length === expected.length && timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}
export function csrfToken(req: Request, res: Response) {
  const existing = cookies(req)['ft_csrf'];
  if (valid(existing)) return existing!;
  const nonce = randomBytes(24).toString('hex');
  const token = nonce + '.' + signature(nonce);
  res.cookie('ft_csrf', token, {
    httpOnly: false,
    secure: config.production,
    sameSite: 'lax',
    path: '/',
  });
  return token;
}
export const requireCsrf: RequestHandler = (req, _res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    next();
    return;
  }
  const token = cookies(req)['ft_csrf'];
  const header = req.headers['x-csrf-token'];
  const origin = req.headers.origin;
  if (
    (origin && origin !== config.origin) ||
    !valid(token) ||
    typeof header !== 'string' ||
    token !== header
  ) {
    next(
      new ApiError(
        403,
        'CSRF_REJECTED',
        'Your security token is missing or expired. Refresh the page and try again.',
      ),
    );
    return;
  }
  next();
};
