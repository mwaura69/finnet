# Backend implementation and business rules

This is the implemented service, not a list of unimplemented placeholders. See [API specification](../backend/openapi.json) and [Postman collection](../backend/postman/FinTrack.postman_collection.json) for request/response details.

Portfolios include name, client name, KES/USD base currency and created date. Ownership and shared member permissions are checked on every read/write. An inaccessible portfolio returns 404 to avoid exposing another client's records. Role restrictions remain authoritative even when entity membership grants write access. Currency locks once transactions exist.

Transactions normalize instruments to uppercase, require positive finite quantities/prices, bound supported amounts, limit prices to two decimals, and reject invalid/future trade dates in Africa/Nairobi. Requests are validated at the API boundary and again in the service.

Holdings replay the chronological ledger using moving-average cost. A SELL reduces cost basis at the average acquisition cost and records the difference as realized gain. Open quantity times latest recorded trade price provides indicative total value. Empty/closed positions have no residual basis. Same-day trades use creation order, then ID as a final tie-breaker.

Writes replay the whole resulting ledger inside a transaction. Backdated SELLs cannot invalidate later SELLs. Removing a supporting BUY returns 409; invalid creation returns 422. There is no transaction-edit endpoint. A transaction mutation queues notification records atomically; only after commit does the worker contact the email provider. Delivery retries are at least once, so a provider timeout can result in a duplicate notification.

The database boundary supports Node SQLite locally and pooled PostgreSQL in deployment. PostgreSQL transactions use a single leased client, serializable isolation and bounded retries for serialization/deadlock failures. SQLite uses an async-local transaction context plus a connection queue, preventing unrelated requests from interleaving within an open transaction. Nested work reuses the current transaction. Migrations are versioned; demo seeding is idempotent and preserves existing accounts.

Integer minor units store prices; quantity/value calculations use JavaScript numbers with safety checks and display rounding. Fixed-decimal arithmetic, server pagination, external market data, reconciliation and payment settlement are outside this assessment's scope.
