# Deployment and submission

## Current status

This is a local scaffold. There is no claimed public URL, hosted repository, remote pull request or production business API. The original assessment requires these before submission; the frontend-complete scaffold alone does not fulfill those requirements.

## Recommended topology

Use a single Node 24 backend instance with a persistent SQLite disk and an Angular static frontend. An HTTPS reverse proxy may host both behind one origin and route `/api/*` to the backend. This avoids cross-origin browser setup. Alternatively, serve Angular on a static host and configure its runtime API URL to your separate HTTPS backend origin plus `/api/v1`.

The included Docker images provide a starting point. `compose.yaml` is a **local demo profile**, bound to loopback, and must be changed for production. It is not a cloud deployment. The API image builds the TypeScript backend; the frontend image builds Angular and serves it through nginx with SPA fallback. SQLite lives on a named local volume in Compose.

## Backend host

1. Complete `PortfolioService`, add production-service tests and run `npm run check`.
2. Create your hosting service and persistent disk. Build from the repository root with `backend/Dockerfile`, or run `npm ci` and `npm run build -w backend`. Start with `npm run start -w backend`. The backend build copies SQL migrations into `dist/db/migrations`; keep `backend/openapi.json` beside `dist`.
3. Set platform variables: `NODE_ENV=production`, `DEMO_MODE=false`, `PORT`, `DATABASE_PATH` pointing inside the persistent disk, `FRONTEND_ORIGIN` to the exact frontend HTTPS origin, and a random `JWT_SECRET` of at least 32 characters. Never commit the secret. A production startup with the example placeholder or demo mode fails deliberately.
4. Mount the persistent directory writable by the Node process. The image runs as the `node` user; make sure the host's volume UID/permissions match. Use one instance for this synchronous SQLite starter, not multiple replicas sharing an ephemeral filesystem.
5. Seed the fictional demo account once: run `node dist/db/seeds/index.js` from `backend`, or `npm run setup` in a source checkout. Set `DEMO_EMAIL`/`DEMO_PASSWORD` in the host environment first if changing the documented demo login. The seed does not overwrite an existing account/password.
6. Expose HTTPS and check `/health`, `/api/v1/docs/`, and `/api/v1/openapi.json`. Verify all authenticated endpoints against the production service. Adjust Express trust-proxy only to the known topology if required by your host's rate limiter; do not blindly trust all proxies.

SQLite on an ephemeral serverless filesystem will lose data. Choose a persistent-volume host, or migrate the service/repository layer to PostgreSQL. The included SQL is SQLite-specific and is not a PostgreSQL schema.

## Frontend host

1. Run `npm ci` and `npm run build -w Frontend` from the repository root.
2. Publish `Frontend/dist/fintrack/browser`. Configure SPA fallback so `/portfolios/...` and `/register` return `index.html` on refresh.
3. With same-origin reverse proxying, leave `config.json` as `{ "apiBaseUrl": "/api/v1" }`. The supplied nginx config expects a Docker service named `api` on port 3000.
4. With a separate API origin, edit the deployed `config.json` to `{ "apiBaseUrl": "https://YOUR-API-HOST/api/v1" }`. This is runtime configuration; no Angular rebuild is needed. Set `Cache-Control: no-store` on this file. Configure backend CORS with the exact frontend origin.
5. If using the included CSP with a different API origin, add that origin to `connect-src`. The shipped nginx policy permits same-origin API calls only. Protect production with HTTPS and deployment-appropriate headers.
6. Test sign-in, register, portfolio CRUD, recording and removing trades, validation errors, filtered CSV export, holdings and reload after navigation on desktop and 375px mobile.

## Git and assessment submission

- Push the real incremental commits to your own GitHub/GitLab/Bitbucket repository.
- Open and merge a feature pull/merge request. The scaffold's branch is available for this; a local branch is not a hosted PR.
- Add actual screenshots to the README if your final design changes.
- Fill in the table below with verified public URLs. Do not invent a live URL or mark the scaffold as complete.
- Keep the deployment available for at least 14 days after submission. Submit before **25 November 2026, 23:59 EAT**, and follow the brief's no-commits-after-deadline rule.
- Submit repository URL, frontend URL, API/Swagger URL, actual demo credentials, actual hours spent and reviewer notes. Sending the recruitment email is the candidate's action, not performed by this scaffold.

| Submission item         | Actual value to fill in                        |
| ----------------------- | ---------------------------------------------- |
| Repository URL          | Pending                                        |
| Merged PR URL           | Pending                                        |
| Live frontend URL       | Pending                                        |
| Live API / Swagger URL  | Pending                                        |
| Demo email/password     | Verify seeded values on your deployed database |
| Hours spent             | Record your actual time                        |
| Retain deployment until | At least 14 days after submission              |

## Production follow-ups

Use decimal arithmetic for strict accounting, backup/restore the SQLite database, make migrations version-aware, establish deployment-specific proxy limits, decide token revocation/cookie policy, and review transitive dependencies. A market price feed is optional; keep the indicative valuation disclosure unless one is genuinely connected.
