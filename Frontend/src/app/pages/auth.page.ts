import { AuthLayout } from '../shared/auth-layout';
import { PasswordStrength } from '../shared/password-strength';
import { AfterViewInit, Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Auth, message } from '../core/api';
import { GoogleIdentity } from '../core/google';
import { validPassword } from '../core/session';
import { Icon } from '../shared/icon';

@Component({
  selector: 'ft-auth-page',
  imports: [FormsModule, RouterLink, Icon, AuthLayout, PasswordStrength],
  templateUrl: './auth.page.html',
})
export class AuthPage implements AfterViewInit {
  auth = inject(Auth);
  router = inject(Router);
  route = inject(ActivatedRoute);
  google = inject(GoogleIdentity);
  register = this.route.snapshot.routeConfig?.path === 'register';
  expired = !!this.route.snapshot.queryParamMap.get('expired');
  year = new Date().getFullYear();
  name = '';
  email = '';
  password = '';
  confirmPassword = '';
  confirmVisible = signal(false);
  googleAttempted = false;
  stayLoggedIn = false;
  acceptTerms = false;
  validPassword = validPassword;
  visible = signal(false);
  busy = signal(false);
  error = signal('');
  confirmation = signal('');
  verificationNeeded = signal(false);
  googleLoading = signal(true);
  googleError = signal('');
  googleButton = viewChild.required<ElementRef<HTMLElement>>('googleButton');
  ngAfterViewInit() {
    void this.setupGoogle();
  }
  async setupGoogle() {
    this.googleLoading.set(true);
    this.googleError.set('');
    try {
      const config = await this.auth.configInfo();
      if (!config.googleClientId) {
        this.googleError.set(
          'Google sign-in is unavailable. Configure GOOGLE_CLIENT_ID in the backend environment and restart the API.',
        );
        return;
      }
      await this.google.render(
        this.googleButton().nativeElement,
        config.googleClientId,
        (credential) => void this.googleLogin(credential),
      );
    } catch (error) {
      this.googleError.set(message(error));
    } finally {
      this.googleLoading.set(false);
    }
  }
  async submit(form: NgForm) {
    if (
      form.invalid ||
      this.busy() ||
      (this.register && (!validPassword(this.password) || this.password !== this.confirmPassword))
    )
      return;
    this.busy.set(true);
    this.error.set('');
    this.verificationNeeded.set(false);
    try {
      if (this.register) {
        const result = await this.auth.register({
          name: this.name,
          email: this.email,
          password: this.password,
          acceptTerms: true,
        });
        this.confirmation.set(result.message);
        this.name = '';
        this.email = '';
        this.password = '';
        this.confirmPassword = '';
        this.acceptTerms = false;
        this.visible.set(false);
        this.confirmVisible.set(false);
        form.resetForm({
          name: '',
          email: '',
          password: '',
          confirmPassword: '',
          acceptTerms: false,
          stayLoggedIn: false,
        });
      } else {
        const result = await this.auth.login({
          email: this.email,
          password: this.password,
          stayLoggedIn: this.stayLoggedIn,
        });
        await this.router.navigateByUrl('requiresMfa' in result ? '/mfa' : '/');
      }
    } catch (error) {
      this.error.set(message(error));
      this.verificationNeeded.set(
        (error as { error?: { error?: { code?: string } } }).error?.error?.code ===
          'EMAIL_NOT_VERIFIED',
      );
    } finally {
      this.busy.set(false);
    }
  }
  async googleLogin(credential: string) {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const result = await this.auth.google({
        credential,
        stayLoggedIn: this.stayLoggedIn,
        acceptTerms: true,
      });
      await this.router.navigateByUrl('requiresMfa' in result ? '/mfa' : '/');
    } catch (error) {
      this.error.set(message(error));
    } finally {
      this.busy.set(false);
    }
  }
  async demoLogin() {
    this.email = 'demo@fintrack.local';
    this.password = 'FinTrackDemo!2026';
    this.busy.set(true);
    this.error.set('');
    try {
      const result = await this.auth.login({
        email: this.email,
        password: this.password,
        stayLoggedIn: false,
      });
      await this.router.navigateByUrl('requiresMfa' in result ? '/mfa' : '/');
    } catch (error) {
      this.error.set(message(error));
    } finally {
      this.busy.set(false);
    }
  }
}
