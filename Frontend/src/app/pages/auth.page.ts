import { Component, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Auth, message } from '../core/api';
import { Icon } from '../shared/icon';
@Component({
  selector: 'ft-auth-page',
  imports: [FormsModule, RouterLink, Icon],
  template: `<div class="auth-layout">
    <section class="auth-story">
      <a routerLink="/login" class="brand"
        ><span class="brand-mark">f<span>↗</span></span
        ><span>FinTrack<small>BY FINNET TECHNOLOGIES</small></span></a
      >
      <div class="auth-story-copy">
        <span class="eyebrow light">A CLEARER FINANCIAL PICTURE</span>
        <h1>Every position.<br />One perspective.</h1>
        <p>
          From the first trade to the bigger picture. Bring your client portfolios, transactions and
          holdings into focus.
        </p>
        <div class="auth-art" aria-hidden="true">
          <div class="art-orbit orbit-one"></div>
          <div class="art-orbit orbit-two"></div>
          <div class="art-card">
            <span class="art-label">YOUR INVESTMENT WORKSPACE</span>
            <div class="art-bars"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
            <span class="art-caption"
              ><ft-icon name="shield" />Designed for confident decisions</span
            >
          </div>
          <span class="art-spark">✦</span>
        </div>
      </div>
      <p class="auth-story-footer">FINNET TECHNOLOGIES <span>PART OF FINNET GROUP</span></p>
    </section>
    <main class="auth-form-side">
      <div class="auth-form-wrap">
        <div class="mobile-auth-brand">FinTrack <span>by Finnet Technologies</span></div>
        <span class="eyebrow">YOUR INVESTMENT WORKSPACE</span>
        <h2>{{ register ? 'A fresh perspective starts here.' : 'Welcome back.' }}</h2>
        <p class="auth-subtitle">
          {{
            register
              ? 'Create your analyst account to get started.'
              : 'Sign in to see the complete picture.'
          }}
        </p>
        @if (expired) {
          <p class="notice" role="status">Your session has expired. Sign in to continue.</p>
        }
        <form #form="ngForm" (ngSubmit)="submit(form)">
          <fieldset [disabled]="busy()">
            @if (register) {
              <label for="name">Full name</label
              ><input
                id="name"
                name="name"
                [(ngModel)]="name"
                required
                minlength="2"
                maxlength="100"
                autocomplete="name"
                placeholder="Your full name"
              />
            }
            <label for="email">Work email</label
            ><input
              id="email"
              name="email"
              type="email"
              [(ngModel)]="email"
              required
              email
              autocomplete="username"
              placeholder="you@example.com"
            />
            <label for="password">Password</label>
            <div class="password-input">
              <input
                id="password"
                name="password"
                [type]="visible() ? 'text' : 'password'"
                [(ngModel)]="password"
                required
                [minlength]="register ? 12 : 1"
                maxlength="72"
                [autocomplete]="register ? 'new-password' : 'current-password'"
                placeholder="Enter your password"
              /><button
                type="button"
                (click)="visible.set(!visible())"
                [attr.aria-label]="visible() ? 'Hide password' : 'Show password'"
                [attr.aria-pressed]="visible()"
              >
                <ft-icon name="eye" />
              </button>
            </div>
            @if (register) {
              <p class="field-help">Use at least 12 characters.</p>
            }
            @if (form.submitted && form.invalid) {
              <p class="form-error" role="alert">
                {{
                  register
                    ? 'Enter your name, a valid email and a password of at least 12 characters.'
                    : 'Enter a valid email and your password.'
                }}
              </p>
            }
            @if (error()) {
              <p class="form-error" role="alert">{{ error() }}</p>
            }
            <button type="submit" class="button primary full-width auth-submit">
              {{ busy() ? 'Signing in…' : register ? 'Create account' : 'Sign in to FinTrack' }}
            </button>
          </fieldset>
        </form>
        <p class="auth-switch">
          {{ register ? 'Already have an account?' : 'New to FinTrack?' }}
          <a [routerLink]="register ? '/login' : '/register'">{{
            register ? 'Sign in' : 'Create an account'
          }}</a>
        </p>
        @if (!register) {
          <div class="demo-login">
            <span class="eyebrow">TAKE A LOOK AROUND</span>
            <p>Explore a fictional investment workspace.<br />No setup needed.</p>
            <button class="button secondary full-width" [disabled]="busy()" (click)="demoLogin()">
              <ft-icon name="grid" />Explore demo workspace</button
            ><small
              >demo&#64;fintrack.local · FinTrackDemo!2026<br />Requires the local demo API to be
              running.</small
            >
          </div>
        }
        <p class="auth-trust"><ft-icon name="shield" />Your workspace. Your perspective.</p>
      </div>
      <footer class="auth-copyright">© {{ year }} Finnet Technologies. All rights reserved.</footer>
    </main>
  </div>`,
})
export class AuthPage {
  auth = inject(Auth);
  router = inject(Router);
  route = inject(ActivatedRoute);
  register = this.route.snapshot.routeConfig?.path === 'register';
  expired = !!this.route.snapshot.queryParamMap.get('expired');
  year = new Date().getFullYear();
  name = '';
  email = '';
  password = '';
  visible = signal(false);
  busy = signal(false);
  error = signal('');
  async submit(form: NgForm) {
    if (form.invalid || this.busy()) return;
    await this.login();
  }
  async login() {
    this.busy.set(true);
    this.error.set('');
    try {
      await this.auth.signIn(
        this.register ? 'register' : 'login',
        this.register
          ? { name: this.name, email: this.email, password: this.password }
          : { email: this.email, password: this.password },
      );
      await this.router.navigateByUrl('/');
    } catch (e) {
      this.error.set(message(e));
    } finally {
      this.busy.set(false);
    }
  }
  async demoLogin() {
    this.email = 'demo@fintrack.local';
    this.password = 'FinTrackDemo!2026';
    await this.login();
  }
}
