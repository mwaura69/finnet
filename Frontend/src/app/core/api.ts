import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom, catchError, throwError } from 'rxjs';
import type {
  Envelope,
  Portfolio,
  PortfolioInput,
  Session,
  Summary,
  Transaction,
  TransactionInput,
  User,
} from './models';
@Injectable({ providedIn: 'root' })
export class ApiConfig {
  base = '/api';
  async load() {
    const r = await fetch('/config.json');
    if (!r.ok) throw new Error('Cannot load application configuration.');
    const c = await r.json();
    this.base = String(c.apiBaseUrl).replace(/\/$/, '');
    if (!this.base.startsWith('/') && !this.base.startsWith('https://'))
      throw new Error('API URL must be relative or HTTPS.');
  }
}
@Injectable({ providedIn: 'root' })
export class Auth {
  private http = inject(HttpClient);
  private config = inject(ApiConfig);
  private router = inject(Router);
  user = signal<User | null>(null);
  demo = signal(false);
  token = sessionStorage.getItem('fintrack.token');
  async signIn(mode: 'login' | 'register', input: unknown) {
    const { data } = await firstValueFrom(
      this.http.post<Envelope<Session>>(`${this.config.base}/auth/${mode}`, input),
    );
    this.token = data.token;
    sessionStorage.setItem('fintrack.token', data.token);
    this.user.set(data.user);
    this.demo.set(data.demoMode);
  }
  async restore() {
    if (this.user()) return true;
    if (!this.token) return false;
    try {
      const { data } = await firstValueFrom(
        this.http.get<Envelope<{ user: User; demoMode: boolean }>>(`${this.config.base}/auth/me`),
      );
      this.user.set(data.user);
      this.demo.set(data.demoMode);
      return true;
    } catch {
      this.clear();
      return false;
    }
  }
  clear() {
    this.token = null;
    sessionStorage.removeItem('fintrack.token');
    this.user.set(null);
    this.demo.set(false);
  }
  logout() {
    this.clear();
    void this.router.navigateByUrl('/login');
  }
}
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(Auth),
    config = inject(ApiConfig),
    router = inject(Router);
  const api = req.url.startsWith(config.base + '/');
  const protectedRequest =
    api && !req.url.endsWith('/auth/login') && !req.url.endsWith('/auth/register');
  return next(
    protectedRequest && auth.token
      ? req.clone({ setHeaders: { Authorization: `Bearer ${auth.token}` } })
      : req,
  ).pipe(
    catchError((error) => {
      if (protectedRequest && error.status === 401) {
        auth.clear();
        void router.navigate(['/login'], { queryParams: { expired: '1' } });
      }
      return throwError(() => error);
    }),
  );
};
export function message(error: unknown) {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0)
      return 'We could not reach the API. Check that the backend is running, then try again.';
    const e = error.error?.error;
    if (e?.details?.length)
      return e.details
        .map((d: { field: string; message: string }) => `${d.field}: ${d.message}`)
        .join(' ');
    return e?.message || `The request failed (${error.status}). Please try again.`;
  }
  return 'Something went wrong. Please try again.';
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
  async deleteTransaction(id: string) {
    await firstValueFrom(
      this.http.delete(this.config.base + '/transactions/' + encodeURIComponent(id)),
    );
  }
}
