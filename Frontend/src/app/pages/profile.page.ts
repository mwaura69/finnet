import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Auth, message } from '../core/api';
import { validPassword } from '../core/session';
import { Icon } from '../shared/icon';
@Component({
  selector: 'ft-profile-page',
  imports: [FormsModule, RouterLink, Icon],
  template: `<section class="page-heading">
      <div>
        <p class="eyebrow">YOUR FINTRACK ACCOUNT</p>
        <h1>{{ settings ? 'Preferences and security' : 'My profile' }}</h1>
        <p>Keep your details current and choose how your workspace keeps you informed.</p>
      </div>
    </section>
    <nav class="account-tabs" aria-label="Account sections">
      <a routerLink="/profile" [attr.aria-current]="!settings ? 'page' : null">Profile details</a
      ><a routerLink="/settings" [attr.aria-current]="settings ? 'page' : null"
        >Preferences and security</a
      ><a routerLink="/terms">Terms and conditions</a>
    </nav>
    @if (notice()) {
      <p class="notice" role="status">{{ notice() }}</p>
    }
    @if (error()) {
      <p class="form-error" role="alert">{{ error() }}</p>
    }
    @if (auth.user(); as user) {
      <div class="account-grid">
        @if (!settings) {
          <section class="panel account-panel">
            <h2>Profile details</h2>
            <p>Your photo and name appear within your investment workspace.</p>
            <form #profileForm="ngForm" (ngSubmit)="saveProfile(profileForm)">
              <fieldset [disabled]="busy()">
                <div class="profile-avatar">
                  <div class="profile-avatar-preview">
                    @if (avatarUrl) {
                      <img [src]="avatarUrl" alt="Your profile photo" />
                    } @else {
                      <span>{{ initials() }}</span>
                    }
                  </div>
                  <div>
                    <label for="profile-image">Profile photo</label
                    ><input
                      id="profile-image"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      (change)="chooseAvatar($event)"
                    />
                    <p class="field-help">PNG, JPEG or WebP. Maximum 1 MB.</p>
                    <button type="button" class="text-button" (click)="avatarUrl = null">
                      Remove photo
                    </button>
                  </div>
                </div>
                <label for="profile-name">Full name</label
                ><input
                  id="profile-name"
                  name="name"
                  [(ngModel)]="name"
                  minlength="2"
                  maxlength="100"
                  required
                  autocomplete="name"
                /><label for="profile-email">Verified email</label
                ><input id="profile-email" type="email" [value]="user.email" disabled />
                <p class="field-help">
                  Your account email is used for verification, recovery and security alerts.
                </p>
                <p class="field-help">
                  Access role: <strong>{{ user.role }}</strong>. Roles and entity permissions are
                  assigned by a workspace administrator.
                </p>
                @if (profileForm.submitted && profileForm.invalid) {
                  <p class="form-error" role="alert">
                    Enter a full name of at least two characters.
                  </p>
                }
                <button type="submit" class="button primary auth-submit">
                  {{ busy() ? 'Saving…' : 'Save profile' }}
                </button>
              </fieldset>
            </form>
          </section>
          <section class="panel account-panel">
            <h2>Getting started</h2>
            <p>
              Take the guided tour again to revisit portfolios, transactions and account settings.
            </p>
            <button class="button secondary" [disabled]="busy()" (click)="replayTour()">
              <ft-icon name="book" />Replay workspace tour
            </button>
            <h2 class="account-section-title">Session security</h2>
            <p>
              Sign-in credentials are kept in secure, HttpOnly cookies. Inactive or expired sessions
              are signed out automatically.
            </p>
            <button class="button secondary" [disabled]="busy()" (click)="auth.logout()">
              Sign out of this device
            </button>
          </section>
        } @else {
          <section class="panel account-panel">
            <h2>Email preferences</h2>
            <p>
              Choose optional notifications. Account verification, password recovery and essential
              security emails stay enabled.
            </p>
            <form #preferenceForm="ngForm" (ngSubmit)="savePreferences()">
              <fieldset [disabled]="busy()">
                <label class="settings-row"
                  ><span
                    ><strong>Transaction notifications</strong
                    ><small
                      >Email me when a transaction is recorded or removed, including its trade
                      details and receipt reference.</small
                    ></span
                  ><input
                    type="checkbox"
                    name="transactionEmails"
                    [(ngModel)]="transactionEmails" /></label
                ><label class="settings-row"
                  ><span
                    ><strong>Product updates</strong
                    ><small>Optional workspace news and feature announcements.</small></span
                  ><input type="checkbox" name="productEmails" [(ngModel)]="productEmails" /></label
                ><button class="button primary auth-submit" type="submit">
                  {{ busy() ? 'Saving…' : 'Save email preferences' }}
                </button>
              </fieldset>
            </form>
          </section>
          <section class="panel account-panel">
            <h2>Email verification at sign-in</h2>
            <p>Require a short-lived code from your email after your password or Google sign-in.</p>
            <p class="security-note">
              <ft-icon name="shield" />Email MFA is currently
              <strong>{{ user.emailMfaEnabled ? 'enabled' : 'disabled' }}</strong>.
            </p>
            <form #mfaForm="ngForm" (ngSubmit)="toggleMfa()">
              <fieldset [disabled]="busy()">
                @if (user.emailMfaEnabled) {
                  <label for="mfa-current-password">Current password</label
                  ><input
                    id="mfa-current-password"
                    name="currentPassword"
                    type="password"
                    [(ngModel)]="mfaPassword"
                    autocomplete="current-password"
                  />
                  <p class="field-help">
                    Required to turn off MFA unless you verified a code in the last 10 minutes. If
                    you sign in through Google, set a password first.
                  </p>
                }
                <button class="button secondary auth-submit" type="submit">
                  {{
                    busy()
                      ? 'Please wait…'
                      : user.emailMfaEnabled
                        ? 'Turn off email MFA'
                        : 'Enable email MFA'
                  }}
                </button>
              </fieldset>
            </form>
          </section>
          <section class="panel account-panel">
            <h2>Change your password</h2>
            <form #passwordForm="ngForm" (ngSubmit)="changePassword(passwordForm)">
              <fieldset [disabled]="busy()">
                <label for="current-password">Current password</label
                ><input
                  id="current-password"
                  name="currentPassword"
                  type="password"
                  [(ngModel)]="currentPassword"
                  required
                  autocomplete="current-password"
                /><label for="profile-password">New password</label
                ><input
                  id="profile-password"
                  name="password"
                  type="password"
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
                <label for="profile-password-confirm">Confirm new password</label
                ><input
                  id="profile-password-confirm"
                  name="confirmPassword"
                  type="password"
                  [(ngModel)]="confirmPassword"
                  required
                  autocomplete="new-password"
                />
                @if (passwordForm.submitted && (passwordForm.invalid || !passwordValid())) {
                  <p class="form-error" role="alert">
                    Check your current password, follow the password requirements and make sure the
                    new passwords match.
                  </p>
                }
                <button class="button primary auth-submit" type="submit">
                  {{ busy() ? 'Saving…' : 'Change password' }}
                </button>
              </fieldset>
            </form>
          </section>
          <section class="panel account-panel">
            <h2>Set a password using email</h2>
            <p>
              If you usually use Google sign-in, request a single-use password setup link for your
              verified account email.
            </p>
            <button class="button secondary" [disabled]="busy()" (click)="requestPasswordLink()">
              Email me a password setup link
            </button>
            <p class="field-help">
              Forgot an existing password?
              <a routerLink="/forgot-password" class="text-link">Request a reset link</a>.
            </p>
            <h2 class="account-section-title">Session security</h2>
            <p>
              “Stay signed in” extends the device session, but inactivity and security events still
              end it. Password changes revoke existing sessions.
            </p>
            <button class="button secondary" (click)="auth.logout()">
              Sign out of this device
            </button>
          </section>
        }
      </div>
    }`,
})
export class ProfilePage implements OnInit {
  auth = inject(Auth);
  router = inject(Router);
  route = inject(ActivatedRoute);
  settings = this.route.snapshot.routeConfig?.path === 'settings';
  name = '';
  avatarUrl: string | null = null;
  transactionEmails = true;
  productEmails = false;
  currentPassword = '';
  password = '';
  confirmPassword = '';
  mfaPassword = '';
  busy = signal(false);
  error = signal('');
  notice = signal('');
  ngOnInit() {
    const user = this.auth.user();
    if (user) {
      this.name = user.name;
      this.avatarUrl = user.avatarUrl;
      this.transactionEmails = user.transactionEmails;
      this.productEmails = user.productEmails;
    }
  }
  initials() {
    return (this.name || 'Analyst')
      .split(' ')
      .map((s) => s[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
  async chooseAvatar(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.error.set('');
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 1024 * 1024) {
      this.error.set('Choose a PNG, JPEG or WebP image no larger than 1 MB.');
      return;
    }
    try {
      this.avatarUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('The photo could not be read.'));
        reader.readAsDataURL(file);
      });
    } catch (error) {
      this.error.set(message(error));
    }
  }
  private begin() {
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
  }
  async saveProfile(form: NgForm) {
    if (form.invalid || this.busy()) return;
    this.begin();
    try {
      await this.auth.updateProfile({ name: this.name, avatarUrl: this.avatarUrl });
      this.notice.set('Your profile has been updated.');
    } catch (error) {
      this.error.set(message(error));
    } finally {
      this.busy.set(false);
    }
  }
  async savePreferences() {
    if (this.busy()) return;
    this.begin();
    try {
      await this.auth.preferences({
        transactionEmails: this.transactionEmails,
        productEmails: this.productEmails,
      });
      this.notice.set('Your notification preferences have been saved.');
    } catch (error) {
      this.error.set(message(error));
    } finally {
      this.busy.set(false);
    }
  }
  async toggleMfa() {
    if (this.busy()) return;
    this.begin();
    try {
      const result = await this.auth.preferences({
        emailMfaEnabled: !this.auth.user()?.emailMfaEnabled,
        ...(this.mfaPassword ? { currentPassword: this.mfaPassword } : {}),
      });
      this.mfaPassword = '';
      if ('requiresMfa' in result) {
        await this.router.navigateByUrl('/mfa');
        return;
      }
      this.notice.set('Email MFA settings have been updated.');
    } catch (error) {
      this.error.set(message(error));
    } finally {
      this.busy.set(false);
    }
  }
  passwordValid() {
    return validPassword(this.password) && this.password === this.confirmPassword;
  }
  async changePassword(form: NgForm) {
    if (form.invalid || !this.passwordValid() || this.busy()) return;
    this.begin();
    try {
      const result = await this.auth.authAction('/change-password', {
        currentPassword: this.currentPassword,
        password: this.password,
      });
      this.currentPassword = '';
      this.password = '';
      this.confirmPassword = '';
      this.notice.set(result.message);
      await this.auth.logout();
    } catch (error) {
      this.error.set(message(error));
    } finally {
      this.busy.set(false);
    }
  }
  async requestPasswordLink() {
    if (this.busy()) return;
    this.begin();
    try {
      const result = await this.auth.authAction('/request-set-password', {});
      this.notice.set(result.message);
    } catch (error) {
      this.error.set(message(error));
    } finally {
      this.busy.set(false);
    }
  }
  async replayTour() {
    if (this.busy()) return;
    this.begin();
    try {
      await this.auth.updateProfile({ onboardingCompleted: false });
      await this.router.navigateByUrl('/');
    } catch (error) {
      this.error.set(message(error));
    } finally {
      this.busy.set(false);
    }
  }
}
