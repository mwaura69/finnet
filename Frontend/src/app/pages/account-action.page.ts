import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Auth, message } from '../core/api';
import { validPassword } from '../core/session';
@Component({
  selector: 'ft-account-action',
  imports: [FormsModule, RouterLink],
  template: `<main class="account-page public-account-page">
    <a routerLink="/login" class="account-brand"
      ><img src="/brand/finnet-logo-dark.svg" alt="Finnet Nexus Group" width="180" height="58"
    /></a>
    <section class="panel account-panel">
      <span class="eyebrow">FINTRACK ACCOUNT SECURITY</span>
      <h1>{{ title }}</h1>
      <p>{{ intro }}</p>
      @if (busy() && mode === 'verify-email') {
        <div class="loading-state" role="status">
          <span class="spinner"></span>Confirming your email…
        </div>
      }
      @if (notice()) {
        <p class="notice" role="status">{{ notice() }}</p>
      }
      @if (error()) {
        <p class="form-error" role="alert">{{ error() }}</p>
      }
      @if (!complete() && mode !== 'verify-email') {
        <form #form="ngForm" (ngSubmit)="submit(form)">
          <fieldset [disabled]="busy()">
            @if (mode === 'forgot-password' || mode === 'resend-verification') {
              <label for="account-email">Email address</label
              ><input
                id="account-email"
                type="email"
                name="email"
                [(ngModel)]="email"
                required
                email
                autocomplete="email"
                placeholder="you@example.com"
              />
            } @else {
              <label for="new-password">New password</label
              ><input
                id="new-password"
                type="password"
                name="password"
                [(ngModel)]="password"
                required
                minlength="8"
                maxlength="72"
                autocomplete="new-password"
              />
              <p class="password-rules field-help">
                At least 8 characters, with an uppercase letter, lowercase letter, number and
                symbol.
              </p>
              <label for="confirm-password">Confirm new password</label
              ><input
                id="confirm-password"
                type="password"
                name="confirmPassword"
                [(ngModel)]="confirmPassword"
                required
                autocomplete="new-password"
              />
            }
            @if (form.submitted && (form.invalid || passwordInvalid())) {
              <p class="form-error" role="alert">
                {{
                  mode === 'forgot-password' || mode === 'resend-verification'
                    ? 'Enter a valid email address.'
                    : 'Use the password requirements above and make sure both passwords match.'
                }}
              </p>
            }
            <button class="button primary full-width auth-submit" type="submit">
              {{ busy() ? 'Please wait…' : action }}
            </button>
          </fieldset>
        </form>
      }
      @if (mode === 'verify-email' && error()) {
        <a routerLink="/resend-verification" class="button secondary"
          >Request a new confirmation link</a
        >
      }
      @if (complete()) {
        <a routerLink="/login" class="button primary full-width">Continue to sign in</a>
      }
      <p class="auth-switch"><a routerLink="/login">Back to sign in</a></p>
      <p class="field-help">
        Authentication links are single-use and expire. For your security, account existence is not
        disclosed by recovery requests.
      </p>
    </section>
  </main>`,
})
export class AccountActionPage implements OnInit {
  auth = inject(Auth);
  route = inject(ActivatedRoute);
  mode = this.route.snapshot.routeConfig?.path || 'forgot-password';
  token = this.route.snapshot.queryParamMap.get('token') || '';
  email = '';
  password = '';
  confirmPassword = '';
  busy = signal(false);
  error = signal('');
  notice = signal('');
  complete = signal(false);
  get title() {
    return this.mode === 'verify-email'
      ? 'Confirm your email'
      : this.mode === 'forgot-password'
        ? 'Forgot your password?'
        : this.mode === 'resend-verification'
          ? 'Send a new confirmation link'
          : this.mode === 'set-password'
            ? 'Set your password'
            : 'Choose a new password';
  }
  get intro() {
    return this.mode === 'verify-email'
      ? 'We are confirming that this email belongs to you.'
      : this.mode === 'forgot-password'
        ? 'Enter your account email and we will prepare a secure password reset link.'
        : this.mode === 'resend-verification'
          ? 'Enter your email to request another account confirmation link.'
          : 'Create a strong password for your FinTrack account.';
  }
  get action() {
    return this.mode === 'forgot-password'
      ? 'Send password reset link'
      : this.mode === 'resend-verification'
        ? 'Send confirmation link'
        : 'Save password';
  }
  ngOnInit() {
    if (this.mode === 'verify-email') void this.verify();
  }
  passwordInvalid() {
    return (
      !['forgot-password', 'resend-verification'].includes(this.mode) &&
      (!validPassword(this.password) || this.password !== this.confirmPassword)
    );
  }
  async verify() {
    if (!this.token) {
      this.error.set(
        'This confirmation link is missing its token. Open the complete link from your email.',
      );
      return;
    }
    this.busy.set(true);
    try {
      const result = await this.auth.authAction('/verify-email', { token: this.token });
      this.notice.set(result.message);
      this.complete.set(true);
    } catch (error) {
      this.error.set(message(error));
    } finally {
      this.busy.set(false);
    }
  }

  async submit(form: NgForm) {
    if (form.invalid || this.passwordInvalid() || this.busy()) return;
    if (!['forgot-password', 'resend-verification'].includes(this.mode) && !this.token) {
      this.error.set(
        'This link is incomplete. Request a new link from the sign-in or profile page.',
      );
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      const body = ['forgot-password', 'resend-verification'].includes(this.mode)
        ? { email: this.email }
        : { token: this.token, password: this.password };
      const result = await this.auth.authAction('/' + this.mode, body);
      this.notice.set(result.message);
      this.complete.set(true);
      this.password = '';
      this.confirmPassword = '';
    } catch (error) {
      this.error.set(message(error));
    } finally {
      this.busy.set(false);
    }
  }
}
