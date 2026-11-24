import { Component, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth, message } from '../core/api';
@Component({
  selector: 'ft-mfa-page',
  imports: [FormsModule, RouterLink],
  template: `<main class="account-page public-account-page">
    <a routerLink="/login" class="account-brand"
      ><img src="/brand/finnet-logo-dark.svg" alt="Finnet Nexus Group" width="180" height="58"
    /></a>
    <section class="panel account-panel">
      <span class="eyebrow">AN EXTRA LAYER OF SECURITY</span>
      <h1>Check your email</h1>
      @if (auth.pendingMfa(); as challenge) {
        <p>
          Enter the six-digit code sent to {{ challenge.emailHint }}. The code expires at
          {{ expires(challenge.expiresAt) }}.
        </p>
        <form #form="ngForm" (ngSubmit)="verify(form)">
          <fieldset [disabled]="busy()">
            <label for="mfa-code">Verification code</label
            ><input
              id="mfa-code"
              name="code"
              [(ngModel)]="code"
              inputmode="numeric"
              autocomplete="one-time-code"
              required
              pattern="[0-9]{6}"
              maxlength="6"
              placeholder="000000"
              autofocus
            />
            @if (form.submitted && form.invalid) {
              <p class="form-error" role="alert">Enter the six-digit code from your email.</p>
            }
            @if (error()) {
              <p class="form-error" role="alert">{{ error() }}</p>
            }
            @if (notice()) {
              <p class="notice" role="status">{{ notice() }}</p>
            }
            <button type="submit" class="button primary full-width auth-submit">
              {{ busy() ? 'Verifying…' : 'Verify and continue' }}</button
            ><button
              type="button"
              class="button secondary full-width auth-submit"
              (click)="resend()"
              [disabled]="busy()"
            >
              Send a new code
            </button>
          </fieldset>
        </form>
      } @else {
        <p class="notice" role="status">
          There is no active verification challenge. Sign in again to request a fresh code.
        </p>
        <a routerLink="/login" class="button primary full-width">Back to sign in</a>
      }
      <p class="auth-switch"><a routerLink="/login">Use another sign-in method</a></p>
    </section>
  </main>`,
})
export class MfaPage {
  auth = inject(Auth);
  router = inject(Router);
  code = '';
  busy = signal(false);
  error = signal('');
  notice = signal('');
  expires(value: string) {
    return new Date(value).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
  }
  async verify(form: NgForm) {
    const challenge = this.auth.pendingMfa();
    if (!challenge || form.invalid || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await this.auth.verifyMfa(challenge.challengeId, this.code);
      await this.router.navigateByUrl(challenge.purpose === 'enable' ? '/profile' : '/');
    } catch (error) {
      this.error.set(message(error));
    } finally {
      this.busy.set(false);
    }
  }
  async resend() {
    const challenge = this.auth.pendingMfa();
    if (!challenge || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const result = await this.auth.resendMfa(challenge.challengeId);
      this.notice.set(result.message);
    } catch (error) {
      this.error.set(message(error));
    } finally {
      this.busy.set(false);
    }
  }
}
