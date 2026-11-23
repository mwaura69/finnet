# Backend implementation guide

## Service integration boundaries

Fill in `backend/src/api/v1/portfolios/portfolio.service.ts` and `backend/src/api/v1/transactions/transaction.service.ts`. Each method is already wired to a protected route, parsed input, and `{data: ...}` response wrapper in `src/api/v1/*/*.controller.ts`. It currently throws `ApiError(501, 'NOT_IMPLEMENTED', ...)`. Keep the method names, ownership arguments and response properties unchanged so the finished Angular interface works without edits.

| Service method                                          | Return                                          |
| ------------------------------------------------------- | ----------------------------------------------- |
| `list(userId)`                                          | `Portfolio[]`, including aggregate fields below |
| `get(userId, id)`                                       | One portfolio, or 404 if absent/not owned       |
| `create(userId, input)`                                 | Newly created portfolio                         |
| `update(userId, id, input)`                             | Updated portfolio                               |
| `remove(userId, id)`                                    | Void; delete portfolio and its transactions     |
| `TransactionService.list(userId, portfolioId)`          | `Transaction[]`, newest trade first             |
| `TransactionService.create(userId, portfolioId, input)` | New transaction                                 |
| `TransactionService.remove(userId, transactionId)`      | Void; reject if the remaining ledger is invalid |
| `summary(userId, id)`                                   | `Summary`                                       |

`Frontend/src/app/core/models.ts` and `backend/openapi.json` are the UI contract. You can introduce a shared contracts package later. For now, update both if you intentionally change the contract.

## Portfolio response

```json
{
  "id": "portfolio-id",
  "name": "East Africa Growth",
  "clientName": "Amani Capital",
  "baseCurrency": "KES",
  "createdAt": "2026-11-23T09:00:00Z",
  "totalValue": 1200,
  "totalInvested": 1000,
  "unrealizedGain": 200,
  "holdingsCount": 1,
  "transactionCount": 2
}
```

## Transaction input

```json
{
  "instrument": "SCOM",
  "type": "BUY",
  "quantity": 100,
  "unitPrice": 25.5,
  "tradeDate": "2026-11-23"
}
```

Output adds `id` and ISO `createdAt`. Prices in the HTTP contract are currency units. The SQL column `unit_price_minor` stores cents; divide by 100 when reading and round ×100 when writing. A portfolio's base currency determines every transaction's currency.

## Holdings response

The summary has `holdings[]`, `totalInvested`, `totalValue`, `unrealizedGain`, `realizedGain`, and `valuationMethod: "latest-transaction-price"`. Each holding has `instrument`, `netQuantity`, `averageCost`, `totalInvested`, `unitPrice`, `totalValue`, `unrealizedGain`.

`src/domain/holdings.ts` implements a reusable moving-average reference. Example: buy 10 at 20, buy 10 at 30, sell 5 at 40. The remaining 15 units have average cost 25, remaining basis 375, illustrative value 600, unrealized gain 225, and realized gain 75. Cost basis is not lifetime gross purchases.

## Suggested implementation sequence

1. Implement owned portfolio reads and CRUD using parameterized queries. Reuse the database exported by `src/db/index.ts` or introduce repositories.
2. Implement transaction reads, creation and deletion within database transactions. Replay the complete chronological ledger before accepting changes. Validate historical holdings, not only today's net units.
3. Implement summaries; aggregate list metrics from the same calculation to avoid inconsistent totals.
4. Add integration tests for your service with `DEMO_MODE=false`. The existing HTTP tests exercise the demo reference; those alone do not prove your new service works.
5. Run `npm run check`, then use `npm run dev` and verify all UI flows without the demo badge.
6. Supply a random JWT secret and deploy the implemented service. Set `NODE_ENV=production`, `DEMO_MODE=false`.

The demo adapter is deliberately small and transparent. You may promote its behavior into the real service after reviewing it, strengthening decimal precision and adding production-service tests. Do not enable the development adapter on a production host to bypass the missing service.

## Schema

- `users`: ID, analyst name, case-insensitive unique email, bcrypt hash, created timestamp.
- `portfolios`: ID, owner FK, name, fictional client name, KES/USD base currency, created timestamp.
- `transactions`: ID, portfolio FK, instrument, BUY/SELL, positive quantity, integer unit price in minor units, trade date, created timestamp.
- Foreign keys cascade on deletion. Ownership and ledger rules belong in the service. Indexes cover ownership and chronological transaction access.
- `schema_migrations` records version 1. The current schema script is idempotent. For later changes add versioned migrations and a runner that only applies unapplied versions; do not edit version 1 after deployment.

## Errors and identity

Throw `ApiError(status, code, message)`. Never return an arbitrary internal error to the UI. The middleware formats known errors and masks unexpected ones. Zod details identify input fields. Missing/other-analyst resources return the same 404 response. Authentication returns a two-hour HS256 JWT with issuer and audience checks. Passwords are bcrypt hashed with cost 12. Keep CORS restricted to the configured frontend origin; CORS does not replace token authorization.

The frontend supports relative `/api/v1` routing or an HTTPS API base URL in `Frontend/public/config.json`. A production frontend must never point at `localhost`. Swagger is intentionally public; business data is protected.
