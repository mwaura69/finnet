import { AuthLayout } from '../shared/auth-layout';
import { PasswordStrength } from '../shared/password-strength';
import { Icon } from '../shared/icon';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Auth, message } from '../core/api';
import { validPassword } from '../core/session';
@Component({
  selector: 'ft-account-action',
  imports: [FormsModule, RouterLink, AuthLayout, PasswordStrength, Icon],
  templateUrl: './account-action.page.html',
})
export class AccountActionPage implements OnInit {
  auth = inject(Auth);
  route = inject(ActivatedRoute);
  mode = this.route.snapshot.routeConfig?.path || 'forgot-password';
  token = this.route.snapshot.queryParamMap.get('token') || '';
  email = '';
  password = '';
  visible = signal(false);
  confirmVisible = signal(false);
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
            ? 'Set a new password'
            : 'Set a new password';
  }
  get intro() {
    return this.mode === 'verify-email'
      ? 'We are confirming that this email belongs to you.'
      : this.mode === 'forgot-password'
        ? "Enter your account email and we'll send you a secure reset link."
        : this.mode === 'resend-verification'
          ? 'Enter your email to request another account confirmation link.'
          : 'Choose a strong password for your FinTrack account.';
  }
  get action() {
    return this.mode === 'forgot-password'
      ? 'Send reset link'
      : this.mode === 'resend-verification'
        ? 'Send confirmation link'
        : 'Update password';
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
