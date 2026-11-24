import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Auth, message } from '../core/api';
import { Dialog } from './dialog';
@Component({
  selector: 'ft-onboarding',
  imports: [Dialog],
  template: `<ft-dialog (closed)="finish()"
    ><h2 dialog-title>{{ steps[index()].title }}</h2>
    <p class="eyebrow">WELCOME TO FINTRACK · {{ index() + 1 }} OF {{ steps.length }}</p>
    <p class="dialog-intro">{{ steps[index()].body }}</p>
    <ol class="onboarding-progress" aria-label="Tour progress">
      @for (step of steps; track step.title; let i = $index) {
        <li [class.active]="i === index()" [attr.aria-current]="i === index() ? 'step' : null">
          {{ step.label }}
        </li>
      }
    </ol>
    @if (error()) {
      <p class="form-error" role="alert">{{ error() }}</p>
    }
    <div class="dialog-actions">
      <button class="button secondary" [disabled]="busy()" (click)="finish()">Skip tour</button>
      @if (index() > 0) {
        <button class="button secondary" [disabled]="busy()" (click)="previous()">Previous</button>
      }
      <button class="button primary" [disabled]="busy()" (click)="next()">
        {{ busy() ? 'Saving…' : index() === steps.length - 1 ? 'Finish tour' : 'Show me next' }}
      </button>
    </div></ft-dialog
  >`,
})
export class Onboarding {
  auth = inject(Auth);
  router = inject(Router);
  index = signal(0);
  busy = signal(false);
  error = signal('');
  steps = [
    {
      label: 'Overview',
      title: 'Welcome to your investment workspace',
      body: 'Your overview keeps each currency separate and shows portfolio value, invested capital and returns. The charts use your recorded transactions.',
      route: '/',
    },
    {
      label: 'Portfolios',
      title: 'Give each client portfolio a home',
      body: 'Open Portfolios to create a portfolio with a client name and base currency. Currency is locked after its first transaction.',
      route: '/portfolios',
    },
    {
      label: 'Transactions',
      title: 'Record a trade and review its holdings',
      body: 'Open a portfolio to record a buy or sell. Transactions can be filtered, sorted, exported to Excel and viewed as printable receipts. Holdings update after every accepted change.',
      route: '/portfolios',
    },
    {
      label: 'Your account',
      title: 'Make the workspace yours',
      body: 'Use your profile to add a photo, choose transaction email notifications and enable email verification at sign-in. You can replay this tour from Profile at any time.',
      route: '/profile',
    },
  ];
  async next() {
    if (this.index() === this.steps.length - 1) {
      await this.finish();
      return;
    }
    this.index.update((i) => i + 1);
    await this.router.navigateByUrl(this.steps[this.index()].route);
  }
  async previous() {
    this.index.update((i) => Math.max(0, i - 1));
    await this.router.navigateByUrl(this.steps[this.index()].route);
  }
  async finish() {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await this.auth.updateProfile({ onboardingCompleted: true });
    } catch (error) {
      this.error.set(message(error));
    } finally {
      this.busy.set(false);
    }
  }
}
