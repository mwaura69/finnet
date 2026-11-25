# Verification record

Assessment completion audit: 25 November 2026, Africa/Nairobi. Evidence below distinguishes local tests, prior browser captures and live external checks.

## Local quality checks

- Backend ESLint and TypeScript production compilation passed after removing untyped route dispatch and converting data access to asynchronous transactions.
- Angular ESLint, production build and strict-template/component compilation passed. Production bundle was approximately 484 KB raw / 118 KB estimated transfer at the final build.
- Backend SQLite suite: 18 tests, covering account security, demo startup data, SQLite import rollback, cross-account isolation, member permissions, concurrent SELL validation, currency lock, cascade deletion, refresh reuse, receipts, Excel and provider failures.
- PostgreSQL-compatible suite uses PGlite to run the PostgreSQL schema and the same API scenarios. Driver unit tests separately assert one leased node-postgres client, rollback, release and serialization retries. This does not substitute for the candidate's live Supabase connection check.
- Frontend suite: 8 tests covering accessible chart rendering/empty states, financial formatting, CSV formula escaping, mixed passwords, refresh single-flight, Google terms/MFA routing and transaction validation/server-error preservation.
- `docker compose config --quiet` passed. Container execution could not be checked because the local Docker daemon was unavailable.
- Postman validation covered 45 requests / 38 implemented endpoints, defined variables, JSON bodies, script syntax and mocked CSRF/session scripts. No production mutation was performed by the collection validator.
- OpenAPI request bodies, response DTOs, cookie/CSRF security and references were corrected. Obsolete 501 response placeholders and JSON access-token claims were removed.

Run `npm run check` to reproduce lint, builds, default tests and the PostgreSQL-compatible suite. CI performs the same categories. Consult the actual GitHub Actions run for the pushed revision rather than assuming a local pass means hosted CI passed.

## Live HTTP evidence

The public Netlify frontend, Render health, proxied authentication configuration and OpenAPI document returned 200 during the audit. The advertised demo login succeeded through Netlify's same-origin proxy and returned three portfolios: two KES and one USD. Their summaries loaded with nonempty holdings. GitHub's public API confirmed the repository is public and feature PRs #1–#4 are merged.

This evidence was gathered on the deployed revision before the Supabase adapter was merged. After deploying this revision, verify `/health` reports `database: "postgres"`, then repeat demo login, CRUD/summary/export and recovery-provider checks. The candidate reports DATABASE_URL is configured privately in Render; the agent has not read that secret.

## Browser and screenshots

Representative development screenshots are in [screenshots](screenshots/overview-desktop.jpg), including the redesigned dashboard/login/account menu and 375px mobile registration; older detail-screen captures remain linked from the README. They are actual prior captures, not newly generated mockups.

The final audit's browser automation could not start its native service / timed out. Therefore no fresh final-commit visual or multi-browser certification is claimed. Prior checks covered desktop and 375px layout, inert mobile navigation, native dialog focus, date-only rendering, empty states, filtering and confirmations. The final human review should verify keyboard focus, radio arrow keys, accessible labels, contrast, 375px containment, deep-link refresh and real Google account selection.

## Known limits and follow-up

- The production dependency audit reports moderate transitive findings in ExcelJS/uuid. The advisory concerns uuid v3/v5/v6 buffer handling; the inspected ExcelJS call site uses v4. No forced downgrade of ExcelJS was applied. Review upstream updates; this is not a formal exploitability certification. No high/critical production findings were reported at this check.
- Real inbox delivery and Google/MFA provider behavior require provider configuration and user confirmation. Generic resend/forgot-password responses do not prove delivery.
- Rotate keys previously exposed in chat or historical commits; current blank examples do not revoke them. The candidate must confirm provider-side rotation.
- Existing SQLite data is not automatically imported into Supabase. The explicit importer is tested to preserve rows and roll back partial failure; retain the source until migration and login are verified.
- Verify the final cloud database, merged/deployed commit, CI result and 14-day retention before submitting. Do not mark external checks complete from local evidence alone.
