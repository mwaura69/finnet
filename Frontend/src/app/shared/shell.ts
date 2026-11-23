import { Component, DestroyRef, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Auth, ApiConfig } from '../core/api';
import { Icon } from './icon';
@Component({
  selector: 'ft-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, Icon],
  template: ` <a class="skip-link" href="#main">Skip to content</a>
    @if (menu()) {
      <button class="nav-scrim" aria-label="Close navigation" (click)="menu.set(false)"></button>
    }
    <aside
      class="sidebar"
      [class.open]="menu()"
      [inert]="mobile() && !menu()"
      (keydown.escape)="menu.set(false)"
    >
      <a routerLink="/" class="brand" (click)="menu.set(false)"
        ><span class="brand-mark">f<span>↗</span></span
        ><span>FinTrack<small>BY FINNET TECHNOLOGIES</small></span></a
      >
      <div class="workspace">
        <span class="workspace-mark"><ft-icon name="briefcase" /></span
        ><span>Investment workspace<small>Portfolio management</small></span>
      </div>
      <p class="nav-caption">WORKSPACE</p>
      <nav aria-label="Main navigation">
        <a
          routerLink="/"
          routerLinkActive="active"
          [routerLinkActiveOptions]="{ exact: true }"
          (click)="menu.set(false)"
          ><ft-icon name="grid" />Overview</a
        >
        <a routerLink="/portfolios" routerLinkActive="active" (click)="menu.set(false)"
          ><ft-icon name="wallet" />Portfolios</a
        >
      </nav>
      <div class="sidebar-bottom">
        <div class="insight-note">
          <ft-icon name="shield" /><strong>Clarity. Confidence. Control.</strong>
          <p>One place for every portfolio decision.</p>
        </div>
        <a [href]="config.base + '/docs'" target="_blank" rel="noopener" class="docs-link"
          ><ft-icon name="book" />API documentation</a
        >
        <div class="sidebar-footer">
          <span class="avatar">{{ initials() }}</span><span class="user-name"
            >{{ auth.user()?.name }}<small>Investment analyst</small></span
          ><button class="icon-button" (click)="auth.logout()" aria-label="Sign out">
            <ft-icon name="logout" />
          </button>
        </div>
      </div>
    </aside>
    <div class="app-content">
      <header class="topbar">
        <div class="topbar-left">
          <button
            class="icon-button mobile-menu"
            (click)="menu.set(!menu())"
            [attr.aria-expanded]="menu()"
            aria-label="Toggle navigation"
          >
            <ft-icon name="menu" /></button
          ><span class="topbar-product">Investment operations</span
          ><span class="topbar-divider">/</span><span>FinTrack</span>
        </div>
        <div class="topbar-right">
          @if (auth.demo()) {
            <span class="demo-badge">Demo workspace</span>
          }
          <span class="avatar small">{{ initials() }}</span>
        </div>
      </header>
      <main id="main" tabindex="-1"><router-outlet /></main>
      <footer class="page-footer">
        <span>FinTrack by Finnet Technologies</span
        ><span>Built for a clearer financial picture.</span>
      </footer>
    </div>`,
})
export class Shell {
  auth = inject(Auth);
  config = inject(ApiConfig);
  menu = signal(false);
  private viewport = window.matchMedia('(max-width: 760px)');
  mobile = signal(this.viewport.matches);
  constructor() {
    const update = () => {
      this.mobile.set(this.viewport.matches);
      this.menu.set(false);
    };
    this.viewport.addEventListener('change', update);
    inject(DestroyRef).onDestroy(() => this.viewport.removeEventListener('change', update));
  }
  initials() {
    return (this.auth.user()?.name || 'Analyst')
      .split(' ')
      .map((s) => s[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
}
