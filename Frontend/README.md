# FinTrack Angular frontend

Angular 21 / TypeScript SPA consuming only the FinTrack HTTP/JSON API. There are no hard-coded portfolio or transaction fixture arrays. Finnet reference branding is implemented with shared CSS tokens and vector assets.

From the repository root, run `npm ci`, `npm run setup`, then `npm run dev`. Open http://localhost:4200. The demo button uses the documented fictional seeded account.

| Route | Screen |
| --- | --- |
| `/login`, `/register` | Validated authentication and Google account entry |
| `/verify-email`, `/resend-verification` | Email confirmation and recovery |
| `/forgot-password`, `/reset-password`, `/set-password`, `/mfa` | Account recovery and email MFA |
| `/` | Currency-specific portfolio overview |
| `/portfolios` | Searchable portfolio CRUD |
| `/portfolios/:id` | Transactions, filters/sort/pagination, holdings/allocation, CSV/Excel |
| `/profile`, `/settings`, `/terms` | Account profile, preferences, security and terms |
| `/transactions/:id/receipt` | Printable transaction record |

Access and refresh tokens stay in HttpOnly cookies; the frontend does not store JWTs in sessionStorage/localStorage. A signed CSRF header protects mutations. Route guards restore the server session, refresh once for concurrent expired requests, and return unauthenticated users to sign-in.

`npm run build -w Frontend` generates `environment.prod.ts` and `public/config.json` from public `API_URL`/optional `GOOGLE_CLIENT_ID`; default API URL is `/api/v1`. Netlify configuration proxies `/api/*` to Render before the SPA fallback. Local dev proxies to port 3000. Keep provider secrets and database URLs out of frontend environment variables.

```sh
npm run lint -w Frontend
npm run build -w Frontend
npm run test -w Frontend
```

Output: `Frontend/dist/fintrack/browser`. `ngc` compiles strict templates before tests. Component tests cover accessible allocation, transaction form/server errors, Google terms and MFA navigation; helpers cover passwords, refresh single-flight, currencies and CSV injection escaping.

Loading/empty/error states, labelled controls, native modal focus trapping, equal-height BUY/SELL cards with whole-card keyboard focus, mobile navigation and 375px table containment are included. The PWA caches only public shell assets. [Verification and browser limits](../docs/VERIFICATION.md).
