# FinTrack by Finnet Technologies

A navy-and-teal Angular portfolio and transactions workspace for fictional investment clients. This repository is a **frontend-complete starter with a backend business-service scaffold**, as requested. It is **not a completed assessment submission or a live deployment**.

## Start in under ten minutes

Requires **Node.js 24.x**, npm, and Git. SQLite is provided by Node's built-in `node:sqlite`; no database server is required. Node 24 currently prints an experimental SQLite warning.

```sh
cd ~/Desktop/Finnet
npm ci
cp backend/.env.example backend/.env
npm run setup
npm run dev:demo
```

Open **http://localhost:4200**. API documentation: **http://localhost:3000/api/v1/docs**. On the sign-in screen choose **Explore demo workspace**, or use:

| Field    | Fictional local demo value |
| -------- | -------------------------- |
| Email    | `demo@fintrack.local`      |
| Password | `FinTrackDemo!2026`        |

`npm run setup` applies the schema and seeds three portfolios and 12 transactions once; running it again preserves existing data. Registration creates a separate analyst with an empty workspace. The local SQLite file is ignored by Git. Stop both processes with Ctrl+C.

For Docker users, `docker compose up --build` starts the local demo at **http://localhost:8080** with persistent SQLite storage. Docker configuration is provided; see the verification notes for whether it was exercised on this machine.

## What's finished and what's yours to implement

| Area                                    | Status                                                                                                                            |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Responsive Angular screens and branding | Implemented: login/register, overview, portfolios, details, holdings, allocation, forms, confirmations, feedback states           |
| UI interactions                         | Implemented: create/edit/delete, transaction recording/deletion, search/type/date filters, sorting, pagination, CSV               |
| API consumption                         | Typed `HttpClient` calls only; no embedded portfolio or transaction fixtures in Angular                                           |
| Backend infrastructure                  | Implemented: Express routes, JWT auth, bcrypt hashing, input validation, CORS, auth rate limiting, errors, schema, seeds, OpenAPI |
| Backend business services               | **TODO** in portfolio and transaction services under `backend/src/api/v1/`; return HTTP 501 outside demo mode                     |
| Local demo adapter                      | Implemented as an isolated reference in `backend/src/demo/demo.service.ts`; real HTTP and SQLite persistence                      |
| Tests/build                             | See [verification](docs/VERIFICATION.md)                                                                                          |
| Local Git history                       | Incremental commits on `feat/fintrack-foundation`                                                                                 |
| Remote repository and pull request      | **Pending your GitHub/GitLab/Bitbucket repository**                                                                               |
| Public deployment/demo login/API docs   | **Pending your completed service and hosting configuration**                                                                      |

To work against your API scaffold instead of the demo adapter, stop the dev servers and run:

```sh
npm run dev
```

Make sure `DEMO_MODE=false` in `backend/.env`. Authentication works; portfolio and transaction routes return explicit `NOT_IMPLEMENTED` errors. The interface displays these errors with retry actions. Implement both portfolio and transaction service methods without changing the documented JSON contract. The demo adapter is a reference you may understand, adapt and move into your production service. Production startup rejects `DEMO_MODE=true` to prevent an unfinished preview being mistaken for a completed backend.

## Structure and architecture

```text
Finnet/
├── backend/
│   ├── src/config/                   # env validation, central config, Pino logger
│   ├── src/db/                       # connection, migrations, seeds, row models
│   ├── src/api/v1/                   # auth, users, portfolios, transactions
│   │   └── <feature>/                # routes, controller, service, repository, schema, types
│   ├── src/middleware/               # auth, errors, validation, rate limit, 404, request log
│   ├── src/utils/                    # ApiError, asyncHandler, JWT, hashing
│   ├── src/types/                    # shared interfaces and Express declarations
│   ├── src/demo/                     # development-only reference adapter
│   ├── src/domain/                   # reusable ledger calculation
│   ├── src/app.ts                    # Express composition
│   ├── src/server.ts                 # entry point and graceful shutdown
│   ├── tests/{unit,integration}/
│   ├── data/                         # ignored local SQLite database
│   └── openapi.json                  # frontend-facing contract
├── Frontend/                         # uppercase F as requested; case-sensitive on Linux
│   ├── src/app/core/                 # API client, auth, models, financial formatting
│   ├── src/app/pages/                # authentication, dashboard/list, portfolio detail
│   ├── src/app/shared/               # shell, dialogs, allocation visualization
│   ├── src/styles.css               # design tokens and responsive layouts
│   ├── public/config.json           # runtime API URL
│   └── tests/
├── docs/
├── compose.yaml
└── .github/workflows/ci.yml
```

Angular → HTTP/JSON → Express routes → service interface → SQLite. All business routes scope access to the authenticated analyst in the demo reference. Authentication and the service boundary stay independent. Angular 21, standalone components, signals and template-driven forms keep the starter approachable. Express + TypeScript shares data-model vocabulary with the frontend. SQLite makes setup fast and persists real records. Swagger documents the interface while the business API is unfinished.

The canonical API prefix is `/api/v1`. The same routes are also available under `/api` to match the assessment examples.

## API overview

| Method           | Path                                   | Purpose                             |
| ---------------- | -------------------------------------- | ----------------------------------- |
| POST             | `/api/v1/auth/register`                | Register analyst and return token   |
| POST             | `/api/v1/auth/login`                   | Sign in and return token            |
| GET              | `/api/v1/auth/me`                      | Restore signed-in identity          |
| GET, POST        | `/api/v1/portfolios`                   | List/create own portfolios          |
| GET, PUT, DELETE | `/api/v1/portfolios/:id`               | Read/update/delete own portfolio    |
| GET, POST        | `/api/v1/portfolios/:id/transactions`  | List/record trades                  |
| DELETE           | `/api/v1/transactions/:id`             | Delete a trade                      |
| GET              | `/api/v1/portfolios/:id/summary`       | Holdings and illustrative returns   |
| GET              | `/api/v1/docs`, `/api/v1/openapi.json` | Public Swagger UI and specification |
| GET              | `/health`                              | Health and runtime mode             |

Success responses use `{ "data": ... }`; failures use `{ "error": { "code": "...", "message": "...", "details": [], "requestId": "..." } }`. Deletes return 204 with no body. Validation uses 422; bad credentials use 401; unknown or other-user resources use 404. `details` and `requestId` are optional. Swagger's Authorize button accepts the JWT returned by login. See [backend implementation guide](docs/BACKEND_IMPLEMENTATION.md).

## Commands and checks

```sh
npm run setup       # migration + idempotent fictional seed
npm run dev:demo    # API with reference adapter + Angular
npm run dev         # API scaffold + Angular
npm run build       # TypeScript backend and production Angular bundle
npm test            # backend integration/domain + frontend component/format tests
npm run check       # build + tests
```

CI runs `npm ci` and `npm run check`. If a machine has limited memory, use `NG_BUILD_MAX_WORKERS=2 npm run build`. Frontend output is `Frontend/dist/fintrack/browser`; backend output is `backend/dist`. Use `npm run start -w backend` for the compiled server. The server must run with `backend` as its working directory (npm workspaces does this automatically).

## Design, assumptions and trade-offs

- Brand is typographic, inspired by the assessment's deep-navy/one-accent instruction. No official logo assets were supplied. Product lockup reads **FinTrack by Finnet Technologies**.
- The interface supports 375px mobile. Wide financial tables scroll within their panels, while the page itself stays within the viewport. Controls are labeled, focus is visible, native modal dialogs contain keyboard focus, and destructive actions require confirmation.
- KES and USD are displayed separately. There is no FX conversion or combined multi-currency total. Positive/negative return colours always accompany explicit +/− signs. BUY/SELL badges use teal/amber rather than return colours.
- Moving-average cost removes the average cost of sold units. Total invested means remaining open-position basis. Realized return is shown separately. No fees, dividends, corporate actions, short selling or cash ledger are modeled.
- Value is **illustrative**, using the latest recorded trade price per instrument. It is not a market price or a time-series performance feed. This is disclosed in the interface.
- The demo replays trades by trade date, creation timestamp and ID; it rejects oversells, backdated oversells and deleting a buy needed by a later sell. Portfolio currency is locked after the first transaction.
- Prices are stored in integer minor units. Quantities and cost calculations use JavaScript numbers in the reference adapter. Replace with decimal arithmetic before demanding accounting-grade precision. Dates use date-only trade dates; UI display dates use Nairobi time where appropriate.
- JWTs expire after two hours and live in per-tab session storage. Sign-out clears the browser token; it does not revoke a stolen token. For production consider secure HttpOnly cookies, refresh/revocation design, stricter password policies and deployment-specific proxy settings.
- The demo seed uses fictional names only. No confidential assessment PDF or real client data is copied into this repository.

## Git, deployment and submission

The local repository has meaningful incremental commits and a feature branch. It has **no remote and no hosted PR yet**. [Git workflow](docs/GIT_WORKFLOW.md) describes the actual remaining steps; do not claim a local merge as a pull request.

[Deployment guide](docs/DEPLOYMENT.md) covers a persistent backend disk, runtime secrets, HTTPS, same-origin proxying or a separate API origin, and a submission checklist. The current scaffold is deliberately local and is not publicly deployed. Complete and test the business service before publishing a submission. Keep the eventual deployment running for at least 14 days after submission.

Assessment deadline: **25 November 2026, 23:59 EAT**. The brief asks for no commits after that deadline. Track your actual time spent; this scaffold does not invent an hours-spent value.

## Screenshots

See [desktop overview](docs/screenshots/overview-desktop.jpg), [portfolio detail](docs/screenshots/detail-desktop.jpg), [mobile portfolio](docs/screenshots/detail-mobile.jpg), and [sign-in](docs/screenshots/login-desktop.jpg). Verification details and any remaining limits are in [VERIFICATION.md](docs/VERIFICATION.md).

## AI assistance

OpenAI Codex assisted with the initial architecture, code, visual design, test setup and documentation. Review, understand and take responsibility for every line before submission, as required by the assessment. The remaining production business service, remote PR, hosting and submission must reflect work you have completed and verified.

Technical references: [Angular version compatibility](https://angular.dev/reference/versions) and [Node SQLite API](https://nodejs.org/api/sqlite.html).
