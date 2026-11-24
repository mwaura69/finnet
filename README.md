# FinTrack by Finnet Technologies

A Finnet-branded Angular and Express portfolio workspace with real SQLite persistence, account security, transaction notifications and financial exports. The supplied Finnet reference provides the navy/green palette, traced vector logo and geometric motifs.

## Run locally

Use Node 24.x and npm. From this directory:

```sh
npm ci
cp backend/.env.example backend/.env  # only if you do not already have your own file
npm run setup
npm run dev
```

Open http://localhost:4200; Swagger is at http://localhost:3000/api/v1/docs/. The seeded fictional account is `demo@fintrack.local` / `FinTrackDemo!2026`. Registration creates a separate account that must confirm its email before sign-in.

Set `MAIL_DELIVERY=outbox` for local testing. Confirmation/reset links and MFA codes are then in the private directory configured by `MAIL_OUTBOX_PATH`, not delivered to a real inbox. SMTP delivery and Google sign-in need valid provider settings. See [account setup and security](docs/SECURITY_AND_ACCOUNT_FLOWS.md).

## Implemented flows

- Registration with terms acceptance, email confirmation, password reset/setup links, an eight-character mixed password policy, email MFA and server-verified Google credentials.
- HttpOnly cookie access/rotating refresh tokens, signed CSRF protection, server expiry/revocation, stay signed in, idle logout and auth rate limiting.
- Profile name/photo updates, optional transaction/product email settings, MFA settings and first-login onboarding with replay.
- Authenticated portfolio CRUD, historical ledger validation, holdings and allocation charts, role and entity authorization, member API, filters/sorting, CSV/Excel exports and printable ledger receipts.
- Transaction writes and a durable notification outbox recorded atomically; a background worker retries delivery.
- Installable PWA manifest/icons and public shell caching. Financial/API data is never cached for offline use.

## Structure

`backend/src/config` centralizes validated settings and logging; `db` contains connection, ordered migrations, models and seed data. `api/v1/{auth,users,portfolios,transactions}` separates routes/controllers/services/repositories/schemas/types. Shared security and middleware implement cookie sessions, validation and errors.

`Frontend/src/app/core` owns typed HTTP/session logic, `pages` contains account/portfolio/profile/receipt screens, and `shared` contains navigation, onboarding, forms, charts and install controls. Brand assets and PWA files are in `Frontend/public`.

## Checks

```sh
npm run build
npm test
```

The account extension passed backend and Angular production builds plus ten automated tests (HTTP integration/domain and Angular component/format/session tests). Integration checks capture emails without contacting SMTP. Tests cover confirmation, cookie auth, CSRF, profile updates, trade validation, Excel, receipts, MFA, recovery, refresh reuse and viewer write rejection.

## Deployment and remaining validation

No public deployment or hosted PR is claimed. Configure HTTPS, a persistent database volume, strong secrets, exact frontend CORS origin and real provider credentials. Prefer a same-origin `/api` reverse proxy for cookie reliability. Run the actual final tree through desktop/mobile browser QA, verify SMTP/Google against your providers, and review the draft application terms before publication. The manifest supports installation; actual installation depends on the browser and HTTPS. Docker files are supplied; the local daemon was unavailable during the original scaffold check.

Read [deployment](docs/DEPLOYMENT.md), [Git workflow](docs/GIT_WORKFLOW.md) and [account/security details](docs/SECURITY_AND_ACCOUNT_FLOWS.md). Earlier scaffold screenshots/check notes describe that checkpoint; account-extension browser screenshots have not yet been refreshed.

Codex assisted with architecture, implementation, visual assets, tests and documentation. Review and understand the code before assessment submission. Use fictional client data only. The assessment deadline is 25 November 2026, 23:59 EAT, with no commits afterwards and at least 14 days of deployment availability after submission.

### First trade and ledger safeguards

Creating a portfolio opens its detail page with an Add transaction action. Trades refresh the transactions, holdings summary and chart together. Currency is locked once transactions exist. Instrument entry supports suggestions and free text; dates use Africa/Nairobi and cannot be in the future. Failed submissions preserve input and display field or server errors.

The server replays the entire ledger in trade-date order (creation order breaks same-day ties). A SELL must be covered at that point in time, and a backdated trade must leave every later SELL covered. Invalid trade creation returns 422; deleting a trade that invalidates a later SELL returns 409 without changing the ledger. There is no transaction edit endpoint: delete and re-add, subject to these safeguards. Fresh demo seeds include BUYs and partial SELLs in each portfolio; existing demo accounts are preserved by the seed command.

Account emails use `backend/src/utils/email.template.ts` for escaped, table-based HTML with a plain-text alternative. Confirmation/reset/set-password buttons include the same single-use token as the text link. The text wordmark renders without remote images, including in local development. Mail delivery still requires the configured SMTP service or development outbox.
