# FinTrack API scaffold

The feature-based backend follows the requested folder convention. `portfolios` and `transactions` replace the generic example's `posts`; no unrelated post model is introduced.

```text
backend/
├── src/
│   ├── config/
│   │   ├── index.ts
│   │   ├── env.ts
│   │   └── logger.ts
│   ├── db/
│   │   ├── index.ts
│   │   ├── migrations/001_initial.sql
│   │   ├── seeds/index.ts
│   │   └── models/{user,portfolio,transaction}.model.ts
│   ├── api/
│   │   ├── index.ts
│   │   └── v1/
│   │       ├── index.ts
│   │       ├── services.ts
│   │       ├── auth/auth.{routes,controller,service,repository,schema,types}.ts
│   │       ├── users/user.{routes,controller,service,repository,schema,types}.ts
│   │       ├── portfolios/portfolio.{routes,controller,service,repository,schema,types}.ts
│   │       └── transactions/transaction.{routes,controller,service,repository,schema,types}.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── error.middleware.ts
│   │   ├── validate.middleware.ts
│   │   ├── rateLimit.middleware.ts
│   │   ├── notFound.middleware.ts
│   │   └── requestLogger.middleware.ts
│   ├── utils/{ApiError,asyncHandler,jwt,hash}.ts
│   ├── types/{express.d.ts,index.ts}
│   ├── domain/holdings.ts
│   ├── demo/demo.service.ts
│   ├── app.ts
│   └── server.ts
├── tests/
│   ├── unit/holdings.test.ts
│   ├── integration/api.test.ts
│   └── setup.ts
├── scripts/copy-assets.mjs
├── data/.gitkeep
├── .env                   # local, ignored; random secret generated during setup
├── .env.example
├── .eslintrc.json
├── .prettierrc
├── .gitignore
├── nodemon.json
├── package.json
├── tsconfig.json
├── openapi.json
├── Dockerfile
└── README.md
```

## Responsibilities

- **Routes** map HTTP methods and apply authentication/validation middleware.
- **Controllers** map validated input into a service call and format success responses. Async wrappers forward errors.
- **Services** enforce business rules. Auth and user services work; portfolio and transaction services are your implementation points and currently return 501.
- **Repositories** hold parameterized SQL. User/auth queries work, and portfolio/transaction query helpers are ready for the service implementation.
- **Schemas** validate requests with Zod. **Types** describe DTOs; **models** describe stored SQLite rows.
- **Middleware** verifies JWTs, formats errors, validates input, rate-limits auth attempts, handles missing routes and logs request metadata.
- **Config** validates environment values and exposes configuration/Pino logging. Requests do not log bodies or authorization headers.
- **Demo** is an isolated reference adapter used only with `DEMO_MODE=true`; production configuration rejects it.

## Run from the repository root

```sh
npm ci
cp backend/.env.example backend/.env
npm run setup
npm run dev:demo
```

The root README covers demo credentials and the frontend. For backend only, `npm run dev -w backend` starts the scaffold on port 3000. `npm run dev:demo -w backend` uses the reference adapter. Nodemon uses polling for compatibility with restricted macOS file watcher limits.

```sh
npm run build -w backend
npm run lint -w backend
npm run test -w backend
```

Canonical docs: `http://localhost:3000/api/v1/docs/`. The Swagger document includes both `/api/v1` and `/api` servers. `GET /api/v1/users/me` and `GET /api/v1/auth/me` expose the authenticated profile. Health is public at `/health`.

The database is real SQLite and lives in `data/fintrack.sqlite` by default. Migrations and seeds are under `src/db` as requested. The build copies SQL migrations into `dist/db/migrations` for production. The initial migration is idempotent; add a version-aware migration runner for future versions.

Read [implementation guide](../docs/BACKEND_IMPLEMENTATION.md), [deployment guide](../docs/DEPLOYMENT.md), and [root README](../README.md) before connecting production services. No live deployment or remote repository is claimed.
