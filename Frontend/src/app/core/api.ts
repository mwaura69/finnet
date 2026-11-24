import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import {
  HttpClient,
  HttpContextToken,
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom, catchError, from, switchMap, throwError } from 'rxjs';
import type {
  AuthCapabilities,
  Envelope,
  MfaChallenge,
  Portfolio,
  PortfolioInput,
  Session,
  SessionInfo,
  Summary,
  Transaction,
  TransactionInput,
  User,
} from './models';
import { environment } from '../environments/environment';
import { isPublicAuthRequest, SingleFlight } from './session';

@Injectable({ providedIn: 'root' })
export class ApiConfig {
  base = environment.apiUrl;
  readonly googleClientId = environment.googleClientId;
  private csrfFlight = new SingleFlight<string>();
  private csrfToken = '';
  async load() {
    const response = await fetch('/config.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Cannot load application configuration.');
    const config = await response.json();
    this.base = String(config.apiBaseUrl || this.base).replace(/\/$/, '');
    if (!this.base.startsWith('/') && !this.base.startsWith('https://'))
      throw new Error('API URL must be relative or HTTPS.');
  }
  csrf(force = false): Promise<string> {
    if (force) this.csrfToken = '';
    if (this.csrfToken) return Promise.resolve(this.csrfToken);
    return this.csrfFlight.run(async () => {
      const response = await fetch(this.base + '/auth/csrf', {
        credentials: 'include',
        cache: 'no-store',
      });
      console.log(response);
      if (!response.ok)
        throw new Error('Could not initialize the secure session. Please try again.');
      const payload = await response.json();
      if (!payload.data?.csrfToken) throw new Error('The API did not return a CSRF token.');
      return (this.csrfToken = payload.data.csrfToken);
    });
  }
}

@Injectable({ providedIn: 'root' })
export class Auth {
  private http = inject(HttpClient);
  private config = inject(ApiConfig);
  private router = inject(Router);
  private refreshFlight = new SingleFlight<Session>();
  private lastActivity = Date.now();
  private restoring: Promise<boolean> | null = null;
  user = signal<User | null>(null);
  demo = signal(false);
  session = signal<SessionInfo | null>(null);
  pendingMfa = signal<MfaChallenge | null>(null);
  capabilities = signal<AuthCapabilities | null>(null);
  idleRemaining = signal(0);
  restoreError = signal('');
  constructor() {
    // Remove the obsolete scaffold token; all new credentials are HttpOnly cookies.
    sessionStorage.removeItem('fintrack.token');
    const activity = () => {
      if (this.user()) this.lastActivity = Date.now();
    };
    for (const name of ['pointerdown', 'keydown', 'touchstart', 'scroll'])
      window.addEventListener(name, activity, { passive: true });
    const timer = window.setInterval(() => void this.tick(), 15000);
    inject(DestroyRef).onDestroy(() => {
      clearInterval(timer);
      for (const name of ['pointerdown', 'keydown', 'touchstart', 'scroll'])
        window.removeEventListener(name, activity);
    });
  }
  async configInfo() {
    const { data } = await firstValueFrom(
      this.http.get<Envelope<AuthCapabilities>>(this.config.base + '/auth/config'),
    );
    this.capabilities.set(data);
    return data;
  }
  private accept(data: Session, activity = true) {
    this.user.set(data.user);
    this.demo.set(data.demoMode);
    this.session.set(data.session);
    this.pendingMfa.set(null);
    if (activity) this.lastActivity = Date.now();
    this.restoreError.set('');
    this.idleRemaining.set(data.session.idleTimeoutSeconds);
  }
  async login(input: {
    email: string;
    password: string;
    stayLoggedIn?: boolean;
  }): Promise<Session | MfaChallenge> {
    const { data } = await firstValueFrom(
      this.http.post<Envelope<Session | MfaChallenge>>(this.config.base + '/auth/login', input),
    );
    if ('requiresMfa' in data) this.pendingMfa.set(data);
    else this.accept(data);
    return data;
  }
  async register(input: { name: string; email: string; password: string; acceptTerms: true }) {
    return (
      await firstValueFrom(
        this.http.post<Envelope<{ message: string; requiresVerification: boolean; email: string }>>(
          this.config.base + '/auth/register',
          input,
        ),
      )
    ).data;
  }
  async google(input: { credential: string; stayLoggedIn: boolean; acceptTerms: true }) {
    const { data } = await firstValueFrom(
      this.http.post<Envelope<Session | MfaChallenge>>(this.config.base + '/auth/google', input),
    );
    if ('requiresMfa' in data) this.pendingMfa.set(data);
    else this.accept(data);
    return data;
  }
  async verifyMfa(challengeId: string, code: string) {
    const { data } = await firstValueFrom(
      this.http.post<Envelope<Session>>(this.config.base + '/auth/mfa/verify', {
        challengeId,
        code,
      }),
    );
    this.accept(data);
    return data;
  }
  async resendMfa(challengeId: string) {
    return this.authAction('/mfa/resend', { challengeId });
  }
  async authAction(path: string, body: unknown) {
    return (
      await firstValueFrom(
        this.http.post<Envelope<{ message: string }>>(this.config.base + '/auth' + path, body),
      )
    ).data;
  }
  async restore() {
    if (this.user()) return true;
    if (this.restoring) return this.restoring;
    this.restoring = (async () => {
      try {
        const { data } = await firstValueFrom(
          this.http.get<Envelope<Session>>(this.config.base + '/auth/me'),
        );
        this.accept(data);
        return true;
      } catch (error) {
        this.restoreError.set(message(error));
        this.clear();
        return false;
      } finally {
        this.restoring = null;
      }
    })();
    return this.restoring;
  }
  refresh() {
    return this.refreshFlight.run(async () => {
      const operation = async () => {
        const { data } = await firstValueFrom(
          this.http.post<Envelope<Session>>(this.config.base + '/auth/refresh', {}),
        );
        this.accept(data, false);
        return data;
      };
      return navigator.locks ? navigator.locks.request('fintrack-refresh', operation) : operation();
    });
  }
  clear() {
    this.user.set(null);
    this.demo.set(false);
    this.session.set(null);
    this.pendingMfa.set(null);
    this.idleRemaining.set(0);
  }
  async logout(expired = false) {
    try {
      await this.authAction('/logout', {});
    } catch {
      /* Local sign-out still applies if offline. Server expiry remains authoritative. */
    }
    this.clear();
    await this.router.navigate(['/login'], { queryParams: expired ? { expired: '1' } : {} });
  }
  async stayActive() {
    this.lastActivity = Date.now();
    try {
      await this.refresh();
    } catch {
      await this.logout(true);
    }
  }
  private async tick() {
    const session = this.session();
    if (!session || !this.user()) return;
    const remaining = Math.max(
      0,
      session.idleTimeoutSeconds - Math.floor((Date.now() - this.lastActivity) / 1000),
    );
    this.idleRemaining.set(remaining);
    if (!remaining || Date.now() >= Date.parse(session.sessionExpiresAt)) {
      await this.logout(true);
      return;
    }
    if (Date.parse(session.accessExpiresAt) - Date.now() < 60000) {
      try {
        await this.refresh();
      } catch {
        await this.logout(true);
      }
    }
  }
  async updateProfile(input: {
    name?: string;
    avatarUrl?: string | null;
    onboardingCompleted?: boolean;
  }) {
    const { data } = await firstValueFrom(
      this.http.patch<Envelope<User>>(this.config.base + '/users/me', input),
    );
    this.user.set(data);
    return data;
  }
  async preferences(input: {
    transactionEmails?: boolean;
    productEmails?: boolean;
    emailMfaEnabled?: boolean;
    currentPassword?: string;
  }) {
    const { data } = await firstValueFrom(
      this.http.patch<Envelope<User | Session | MfaChallenge>>(
        this.config.base + '/users/me/preferences',
        input,
      ),
    );
    if ('requiresMfa' in data) this.pendingMfa.set(data);
    else if ('session' in data) this.accept(data);
    else this.user.set(data);
    return data;
  }
}
const retried = new HttpContextToken(() => false);
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const config = inject(ApiConfig),
    auth = inject(Auth),
    router = inject(Router);
  if (!request.url.startsWith(config.base + '/')) return next(request);
  const path = request.url.slice(config.base.length).split('?')[0];
  const mutation = !['GET', 'HEAD', 'OPTIONS'].includes(request.method);
  const send = (csrf?: string) =>
    next(
      request.clone({
        withCredentials: true,
        ...(csrf ? { setHeaders: { 'X-CSRF-Token': csrf } } : {}),
      }),
    );
  return (mutation ? from(config.csrf()).pipe(switchMap((token) => send(token))) : send()).pipe(
    catchError((error) => {
      if (
        error.status === 403 &&
        error.error?.error?.code?.includes('CSRF') &&
        !request.context.get(retried)
      ) {
        request.context.set(retried, true);
        return from(config.csrf(true)).pipe(switchMap((token) => send(token)));
      }
      if (error.status !== 401 || isPublicAuthRequest(path) || request.context.get(retried))
        return throwError(() => error);
      request.context.set(retried, true);
      return from(auth.refresh()).pipe(
        switchMap(() =>
          mutation ? from(config.csrf()).pipe(switchMap((token) => send(token))) : send(),
        ),
        catchError((refreshError) => {
          auth.clear();
          void router.navigate(['/login'], { queryParams: { expired: '1' } });
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
export function message(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0)
      return 'We could not reach the API. Check your connection and try again.';
    const detail = error.error?.error;
    if (detail?.details?.length)
      return detail.details
        .map((d: { field: string; message: string }) => `${d.field}: ${d.message}`)
        .join(' ');
    return detail?.message || `The request failed (${error.status}). Please try again.`;
  }
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}
@Injectable({ providedIn: 'root' })
export class Api {
  private http = inject(HttpClient);
  private config = inject(ApiConfig);
  private async get<T>(path: string) {
    return (await firstValueFrom(this.http.get<Envelope<T>>(this.config.base + path))).data;
  }
  list() {
    return this.get<Portfolio[]>('/portfolios');
  }
  portfolio(id: string) {
    return this.get<Portfolio>('/portfolios/' + encodeURIComponent(id));
  }
  transactions(id: string) {
    return this.get<Transaction[]>(`/portfolios/${encodeURIComponent(id)}/transactions`);
  }
  summary(id: string) {
    return this.get<Summary>(`/portfolios/${encodeURIComponent(id)}/summary`);
  }
  async savePortfolio(input: PortfolioInput, id?: string) {
    const url = this.config.base + '/portfolios' + (id ? '/' + encodeURIComponent(id) : '');
    return (
      await firstValueFrom(
        id
          ? this.http.put<Envelope<Portfolio>>(url, input)
          : this.http.post<Envelope<Portfolio>>(url, input),
      )
    ).data;
  }
  async deletePortfolio(id: string) {
    await firstValueFrom(
      this.http.delete(this.config.base + '/portfolios/' + encodeURIComponent(id)),
    );
  }
  async addTransaction(id: string, input: TransactionInput) {
    return (
      await firstValueFrom(
        this.http.post<Envelope<Transaction>>(
          `${this.config.base}/portfolios/${encodeURIComponent(id)}/transactions`,
          input,
        ),
      )
    ).data;
  }
  async exportTransactions(id: string, filters: Record<string, string> = {}) {
    const query = new URLSearchParams(
      Object.entries(filters).filter(([, value]) => !!value),
    ).toString();
    return await firstValueFrom(
      this.http.get(
        `${this.config.base}/portfolios/${encodeURIComponent(id)}/transactions/export.xlsx${query ? '?' + query : ''}`,
        { responseType: 'blob' },
      ),
    );
  }
  receipt(id: string) {
    return this.get<import('./models').Receipt>(
      '/transactions/' + encodeURIComponent(id) + '/receipt',
    );
  }
  async deleteTransaction(id: string) {
    await firstValueFrom(
      this.http.delete(this.config.base + '/transactions/' + encodeURIComponent(id)),
    );
  }
}
