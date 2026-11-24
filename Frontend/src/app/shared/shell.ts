import { Onboarding } from './onboarding';
import { Component, DestroyRef, HostListener, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, NavigationEnd } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Auth, ApiConfig } from '../core/api';
import { Icon } from './icon';
@Component({
  selector: 'ft-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, Icon, Onboarding],
  template: `<a class="skip-link" href="#main">Skip to content</a>
    @if (menu()) {
      <button class="nav-scrim" aria-label="Close navigation" (click)="menu.set(false)"></button>
    }
    <aside class="sidebar" [class.open]="menu()" [inert]="mobile() && !menu()">
      <a
        routerLink="/"
        class="reference-sidebar-brand"
        aria-label="Finnet Nexus Group"
        (click)="menu.set(false)"
        ><img src="/brand/finnet-logo-light.svg" alt="Finnet Nexus Group" width="160" height="52"
      /></a>
      <p class="nav-caption">WORKSPACE</p>
      <nav aria-label="Main navigation">
        <a
          routerLink="/"
          routerLinkActive="active"
          [routerLinkActiveOptions]="{ exact: true }"
          (click)="menu.set(false)"
          ><ft-icon name="grid" />Overview</a
        ><a routerLink="/portfolios" routerLinkActive="active" (click)="menu.set(false)"
          ><ft-icon name="wallet" />Portfolios</a
        ><a routerLink="/settings" routerLinkActive="active" (click)="menu.set(false)"
          ><ft-icon name="settings" />Settings</a
        >
      </nav>
      <div class="sidebar-bottom">
        <a [href]="config.base + '/docs'" target="_blank" rel="noopener" class="docs-link"
          ><ft-icon name="book" />API documentation</a
        ><a routerLink="/terms" class="docs-link" (click)="menu.set(false)"
          ><ft-icon name="book" />Terms</a
        >
      </div>
    </aside>
    <div class="app-content">
      <header class="topbar">
        <div class="topbar-left">
          <button
            class="icon-button mobile-menu"
            aria-label="Toggle navigation"
            [attr.aria-expanded]="menu()"
            (click)="menu.set(!menu())"
          >
            <ft-icon name="menu" /></button
          ><span class="topbar-product">Investment operations</span><ft-icon name="chevron" /><span
            class="breadcrumb-product"
            >FinTrack</span
          ><ft-icon name="chevron" /><strong>{{ section() }}</strong>
        </div>
        <div class="account-menu-wrap" (click)="$event.stopPropagation()">
          <button
            id="account-trigger"
            class="account-trigger"
            [class.open]="accountOpen()"
            aria-label="Account menu"
            aria-controls="account-menu"
            [attr.aria-expanded]="accountOpen()"
            (click)="accountOpen.set(!accountOpen())"
            (keydown.arrowdown)="openAccount($event)"
          >
            <span class="avatar small">
              @if (auth.user()?.avatarUrl) {
                <img [src]="auth.user()?.avatarUrl" alt="" />
              } @else {
                {{ initials() }}
              }</span
            ><ft-icon name="down" />
          </button>
          @if (accountOpen()) {
            <section id="account-menu" class="account-dropdown" aria-label="Account options">
              <div class="account-dropdown-user">
                <span class="avatar">
                  @if (auth.user()?.avatarUrl) {
                    <img [src]="auth.user()?.avatarUrl" alt="" />
                  } @else {
                    {{ initials() }}
                  }
                </span>
                <div>
                  <strong>{{ auth.user()?.name }}</strong
                  ><small>{{
                    auth.user()?.role === 'admin'
                      ? 'Workspace administrator'
                      : auth.user()?.role === 'viewer'
                        ? 'Portfolio viewer'
                        : 'Investment analyst'
                  }}</small>
                </div>
              </div>
              <a routerLink="/profile" (click)="accountOpen.set(false)"
                ><ft-icon name="user" />Profile</a
              ><button (click)="accountOpen.set(false); auth.logout()">
                <ft-icon name="logout" />Log out
              </button>
            </section>
          }
        </div>
      </header>
      <main id="main" tabindex="-1"><router-outlet /></main>
    </div>
    @if (auth.user() && !auth.user()?.onboardingCompleted) {
      <ft-onboarding />
    }`,
})
export class Shell {
  auth = inject(Auth);
  config = inject(ApiConfig);
  router = inject(Router);
  menu = signal(false);
  accountOpen = signal(false);
  section = signal('Overview');
  private viewport = window.matchMedia('(max-width: 760px)');
  mobile = signal(this.viewport.matches);
  constructor() {
    const update = () => {
      this.mobile.set(this.viewport.matches);
      this.menu.set(false);
    };
    this.viewport.addEventListener('change', update);
    inject(DestroyRef).onDestroy(() => this.viewport.removeEventListener('change', update));
    const label = () => {
      const path = this.router.url;
      this.section.set(
        path.includes('/settings')
          ? 'Settings'
          : path.includes('/profile')
            ? 'Profile'
            : path.includes('/receipt')
              ? 'Receipt'
              : path.includes('/portfolios')
                ? 'Portfolios'
                : 'Overview',
      );
      this.accountOpen.set(false);
    };
    label();
    this.router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event instanceof NavigationEnd) label();
    });
  }
  initials() {
    return (this.auth.user()?.name || 'Analyst')
      .split(' ')
      .map((s) => s[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
  @HostListener('document:click') outside() {
    this.accountOpen.set(false);
  }
  @HostListener('document:keydown.escape') escape() {
    if (this.accountOpen()) {
      this.accountOpen.set(false);
      document.getElementById('account-trigger')?.focus();
    }
    this.menu.set(false);
  }
  openAccount(event: Event) {
    event.preventDefault();
    this.accountOpen.set(true);
    setTimeout(() => document.querySelector<HTMLAnchorElement>('.account-dropdown a')?.focus());
  }
}
