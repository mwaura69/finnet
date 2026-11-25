# Deployment: Netlify, Render and Supabase

Frontend: https://finnet-nexus.netlify.app/ · API: https://finnet.onrender.com · Swagger: https://finnet.onrender.com/api/v1/docs/ · Repository: https://github.com/mwaura69/finnet.

The core deployed demo has been exercised over HTTPS. This revision adds Supabase PostgreSQL support; do not assume the cloud switch succeeded until `/health` reports `database: "postgres"` and login/holdings work on the deployed revision.

## Supabase database connection

1. Use the Supabase project selected by the candidate. In **Connect → Transaction pooler**, copy its PostgreSQL URI. Use the database password, not an anon/publishable/secret API key. URL-encode special characters in the password.
2. Save the complete URI **privately in Render as DATABASE_URL**. The Supabase pooler is suitable for IPv4 hosts; the direct database host can require IPv6. Only the backend connects to PostgreSQL. `SUPABASE_URL`, publishable/secret keys and JWKS settings are not needed by this adapter; FinTrack retains its own cookie authentication.
3. TLS certificate verification stays enabled for remote hosts. If the provider requires its CA, save the downloaded CA as a Render secret file and set `DATABASE_CA_FILE` to its path. Do not disable certificate verification. See [Supabase connections](https://supabase.com/docs/guides/database/connecting-to-postgres).
4. Application tables live in a dedicated `fintrack` schema, preserving unrelated tables in an existing Supabase project. On startup the API applies ordered migrations in `backend/src/db/migrations/postgres` using its database connection. Application tables enable RLS with no anon/authenticated Data API policies. Use the backend database-owner/pooler role; browser clients never query those tables directly.
5. Migration and application transactions use one leased connection. Serializable isolation with bounded retries protects chronological SELL validation and refresh rotation. Changing `DATABASE_URL` does not automatically copy SQLite data.

## Render backend

Node version: 24.x. Build from the repository root:

```sh
npm ci
npm run build -w backend
```

Start from repository root with `npm run start -w backend`. If Render's root directory is `backend`, build using `cd .. && npm ci && npm run build -w backend`, and start using `npm start`.

Set environment values in Render, never in the frontend or Git:

```dotenv
NODE_ENV=production
DEMO_MODE=false
DATABASE_URL=<private Supabase PostgreSQL pooler URI>
FRONTEND_ORIGIN=https://finnet-nexus.netlify.app
TRUST_PROXY_HOPS=1
JWT_SECRET=<separately generated random secret, at least 32 characters>
MFA_HMAC_SECRET=<another independent random secret, at least 32 characters>
MAIL_DELIVERY=resend
RESEND_API_KEY=<private sending API key>
MAIL_FROM=FinTrack <address@your-verified-domain>
GOOGLE_CLIENT_ID=<Google web client ID, if enabling Google>
SEED_DEMO_ON_START=true
DEMO_EMAIL=demo@fintrack.local
DEMO_PASSWORD=FinTrackDemo!2026
```

Render supplies the listening port; the API honors `PORT`. Enter MAIL_FROM in an individual value editor without surrounding quote characters/backslashes. Retain your own real environment values; the angle-bracket examples above are placeholders.

`TRUST_PROXY_HOPS` is bounded numeric trust, not `true`. One hop trusts the nearest reverse proxy. Confirm the actual forwarding topology before increasing the count: the Netlify and directly accessible Render paths can differ. Never disable express-rate-limit validation to hide a warning. [Express proxy guidance](https://expressjs.com/en/guide/behind-proxies/).

Demo seeding runs on the running API database before listening. It creates a missing verified fictional account and sample BUY/partial SELL records, with transaction emails disabled. It does not reset existing passwords, MFA preferences or edits. A password mismatch is logged without the password. Keep development `DEMO_MODE=false` in production; seeding does not bypass authentication.

Deploy from the repository's main branch and enable Render's automatic deploy after CI/review. Record the exact deployed commit in verification notes. Build output includes migrations and the OpenAPI document is served beside the compiled tree.

## Netlify frontend

Use `Frontend/netlify.toml`: base `Frontend`, command `npm run build`, publish `dist/fintrack/browser`, Node 24. The build defaults `API_URL=/api/v1`; its prebuild script generates the public environment/runtime configuration. It contains no secrets.

The `/api/*` rewrite to Render comes **before** the SPA fallback. Keep it configured in the repository rather than only in dashboard UI. This makes session cookies first-party at the Netlify hostname and avoids cross-site-cookie restrictions. `config.json` uses no-store; `sw.js` uses no-cache. The PWA excludes authenticated/API data from caches.

Backend CORS is restricted to the exact Netlify origin and credentials are allowed. All mutation requests still need a signed CSRF cookie and matching X-CSRF-Token header. Changing hosts requires changing FRONTEND_ORIGIN and the proxy target as appropriate.

## Email and Google

Render Free blocks outbound SMTP ports 25, 465 and 587; use Resend HTTPS. Add and verify your sender domain in Resend, then use a sending key allowed for that domain. The default resend.dev sender is limited to testing your own account email; public registration requires a verified domain. [Resend domain rules](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain).

Account emails include single-use token buttons plus a plain-text alternative. Registration stores the account before sending email, so a failed delivery can leave an unverified account: use Resend verification after fixing delivery. MFA codes expire after ten minutes; reset/set links after thirty minutes; verification links after twenty-four hours.

Google's web client must allow the Netlify origin. Backend GOOGLE_CLIENT_ID must match the token audience. The application validates Google credentials on the server. Existing email/password accounts are not automatically linked to Google identities.

A public generic 200 from resend/forgot-password is not proof of delivery. Private logs for `verification_resend` include the request ID and `outcome`: `not_eligible` (unknown/already verified), `accepted` (transport accepted), or `failed`. Provider logs expose HTTP status or allowlisted connection failure codes, never tokens/message bodies/keys. Verify the recipient inbox and provider delivery/bounce records.

## Preserving existing SQLite data

A new Supabase database starts empty. The startup seed creates only the fictional demo; it does not migrate registered users or their portfolios. Keep the old source available until you have verified the new database. Render Free's old filesystem can disappear on redeploy; do not claim a migration of unavailable data.

If you have a source SQLite file that must be retained, use the explicit offline import before adding data to the target:

```sh
# In backend, after building; set DATABASE_URL privately first.
SQLITE_SOURCE_PATH=/private/path/fintrack.sqlite node dist/db/migrate-sqlite.js
```

The importer opens the source read-only, requires empty FinTrack target tables, preserves IDs/password hashes/order/preferences, and imports in one transaction. It never deletes target rows or prints row contents. Failed imports roll back. Do not commit or upload a database snapshot to the public repository. Verify login/holdings and take provider backups before switching a real service.

## Local Docker / SQLite

`docker compose up --build` seeds and runs the real SQLite-backed API with a named persistent volume, plus nginx/Angular on http://localhost:8080. It uses development settings and binds published ports to loopback. Local email delivery defaults to a private outbox. Docker images/container execution require a running Docker daemon; configuration can be checked with `docker compose config --quiet`.

## Live acceptance checks

1. `/health` returns 200 and `database: "postgres"` after Supabase deployment.
2. Netlify `/api/v1/auth/config`, `/auth/csrf`, Swagger and OpenAPI remain reachable over HTTPS.
3. Demo login succeeds, returns three portfolios, and summaries/transactions load after refresh.
4. In a fictional QA portfolio, create BUY, partial SELL, reject oversell, verify holdings/chart, export CSV/Excel and confirm delete safeguards. Remove QA data when finished.
5. Verify registration email and password recovery in a real inbox; Google selection/MFA require their real providers.
6. Review keyboard focus, dialogs, contrast, loading/empty/error states at desktop and 375px. Refresh deep links. Browser automation failure is not a passed visual test.
7. Check CI for the deployed commit. Rotate every credential previously shared in chat or committed to history. Current blank examples do not revoke historical secrets.

Keep frontend, API and database available for at least fourteen days after submission. For a 25 November 2026 submission, keep them through 9 December 2026. Candidate sends the reviewed submission email by 25 November 2026, 23:59 EAT; do not make later assessment commits.
