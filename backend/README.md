# FinTrack backend

Express 5 / TypeScript REST API using Supabase PostgreSQL in deployment and SQLite for local setup. Both drivers expose asynchronous parameterized queries and transactions. There are no placeholder 501 business services.

From the repository root:

```sh
npm ci
cp backend/.env.example backend/.env
npm run setup
npm run dev -w backend
```

The `.env` copy is only needed once. Node 24 is required. `npm run build -w backend` emits `backend/dist`; `npm run start -w backend` starts that build. Use `npm run db:setup:prod -w backend` to seed a compiled checkout, or `SEED_DEMO_ON_START=true` to initialize a missing demo on the running database before listening.

`DATABASE_URL` selects PostgreSQL. Without it, `DATABASE_PATH` selects local SQLite. Ordered migrations are in `src/db/migrations` (SQLite) and `src/db/migrations/postgres` (PostgreSQL). PostgreSQL application tables are isolated in the `fintrack` schema. The schema enables RLS on application tables with no public Data API policies; connect the backend using the database owner/pooler credentials, never a browser publishable key. Existing SQLite files are preserved; an explicit import script is available.

- `src/config`: validated environment, constants, Pino logger.
- `src/db`: driver boundary, migrations, seed and offline import.
- `src/api/v1/{auth,users,portfolios,transactions}`: routes, controllers, validation, services, repositories and DTOs.
- `src/domain`: ownership/entity authorization, ledger calculations and durable notifications.
- `src/security`: cookie/CSRF handling and server-side sessions.
- `src/middleware`: auth, validation, bounded rate limiting, consistent errors and request IDs.
- `src/utils`: password/JWT helpers and branded SMTP/Resend/outbox email.

API docs: `/api/v1/docs/`; machine-readable schema: `/api/v1/openapi.json`. Compatibility prefix `/api` serves the same endpoints. Public health: `/health`; it checks database access and reports `sqlite` or `postgres` without exposing credentials.

```sh
npm run lint -w backend
npm run build -w backend
npm run test -w backend
npm run test:postgres -w backend
```

Tests use isolated databases and mocked email delivery; they do not use the deployed database or send real messages. The PostgreSQL-compatible suite uses PGlite; a separate mocked node-postgres driver test verifies transaction connection ownership, rollback and serialization retries.

See [root overview](../README.md), [deployment](../docs/DEPLOYMENT.md), [business rules](../docs/BACKEND_IMPLEMENTATION.md), [security](../docs/SECURITY_AND_ACCOUNT_FLOWS.md) and [Postman](postman/README.md).
