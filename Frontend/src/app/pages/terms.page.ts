import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
@Component({
  selector: 'ft-terms-page',
  imports: [RouterLink],
  template: `<main class="account-page public-account-page">
    <a routerLink="/login" class="account-brand"
      ><img src="/brand/finnet-logo-dark.svg" alt="Finnet Nexus Group" width="180" height="58"
    /></a>
    <article class="panel account-panel terms-copy">
      <span class="eyebrow">FINTRACK WORKSPACE</span>
      <h1>Terms and conditions</h1>
      <p class="field-help">Version 1.0 · Effective 24 November 2026</p>
      <p>
        These terms apply to this FinTrack demonstration and assessment workspace. They are an
        initial product draft and require Finnet's review before commercial use.
      </p>
      <h2>Using your account</h2>
      <p>
        Keep your sign-in details private, use an email address you control and maintain accurate
        profile information. Do not share another person's confidential information or attempt to
        access portfolios without permission.
      </p>
      <h2>Fictional investment records</h2>
      <p>
        This workspace records portfolios and transactions for demonstration. It does not execute
        trades, hold funds or provide investment advice. Displayed values use the latest recorded
        trade price and may differ from market values.
      </p>
      <h2>Security and email</h2>
      <p>
        We use session cookies to keep you signed in and send essential account-security messages.
        You can choose whether to receive transaction or product emails from your profile settings.
        Turning off optional emails does not disable password-reset or verification messages.
      </p>
      <h2>Your data</h2>
      <p>
        You may update your profile and records where your assigned permissions allow. Avoid
        uploading real client data to a demonstration deployment. Contact the workspace operator for
        data-access or removal requests.
      </p>
      <h2>Availability and responsibilities</h2>
      <p>
        Service availability and data accuracy cannot be guaranteed in this assessment build. Verify
        any exported records independently before relying on them. Finnet must supply approved
        privacy, retention, support and jurisdiction details before production release.
      </p>
      <a routerLink="/register" class="button primary">Back to create an account</a
      ><a routerLink="/login" class="text-link">Sign in</a>
    </article>
  </main>`,
})
export class TermsPage {}
