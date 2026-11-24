import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
@Component({
  selector: 'ft-auth-layout',
  imports: [RouterLink],
  template: `<div class="auth-layout reference-auth">
    <aside class="auth-story">
      <a routerLink="/login" class="reference-brand" aria-label="Finnet Nexus Group"
        ><img src="/brand/finnet-logo-light.svg" alt="Finnet Nexus Group" width="205" height="66"
      /></a>
      <div class="auth-story-copy">
        <h1>Every position.<br />One perspective.</h1>
        <p>
          Bring your client portfolios, transactions and holdings<br class="wide-break" />
          into focus.
        </p>
      </div>
      <footer class="auth-story-footer">
        <span>FinTrack by Finnet Technologies</span><span>© {{ year }} Finnet Technologies</span>
      </footer>
    </aside>
    <main class="auth-form-side">
      <a class="mobile-reference-brand" routerLink="/login"
        ><img src="/brand/finnet-logo-dark.svg" alt="Finnet Nexus Group" width="180" height="58"
      /></a>
      <div class="auth-form-wrap"><ng-content /></div>
    </main>
  </div>`,
})
export class AuthLayout {
  year = new Date().getFullYear();
}
