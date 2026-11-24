# Account and session flows

The account extension adds email verification, single-use verification/reset/set-password links, email MFA, Google ID-token verification, profile photos and names, notification preferences, terms acceptance, a welcome tour, installable PWA assets, cookie sessions, real portfolio services, entity permissions, transaction notification outbox, Excel exports and printable ledger receipts.

## Provider setup

Set `GOOGLE_CLIENT_ID` to a Google web client and register the exact frontend JavaScript origin in Google Cloud. The frontend loads Google Identity Services and offers its account chooser; the backend verifies the credential audience and verified email. It does not silently link a Google account to an existing password account. Without a client ID, Google sign-in reports that it is unavailable.

Set `MAIL_DELIVERY=smtp`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `MAIL_FROM` for delivery. For development use `MAIL_DELIVERY=outbox`: messages, including confirmation/reset links and MFA codes, are written privately under `MAIL_OUTBOX_PATH` (default backend data directory). These files contain sensitive links: never publish or commit them. Automated tests replace the sender and never contact SMTP. Live Google and SMTP operation require valid provider credentials and separate verification.

## Sessions

Access and rotating refresh credentials use HttpOnly cookies, Secure in production and SameSite=Lax. Browser code uses credentials and a signed double-submit CSRF token header for mutations. No JWT is returned to browser storage. Prefer serving frontend and `/api` through the same HTTPS origin; unrelated frontend/API sites can have third-party cookies blocked. CORS allows only the configured frontend origin with credentials.

Refresh-token hashes are stored in SQLite; consuming a refresh token rotates it and reuse revokes the session. Idle and absolute session expiry are checked on the server; the frontend also signs out idle users. Stay signed in changes persistence, not authorization. Logout and password changes revoke sessions. Passwords require at least eight characters with uppercase, lowercase, digit and symbol and at most 72 UTF-8 bytes. Passwords are bcrypt hashed. Auth routes are rate limited; MFA codes expire, have retry limits and resend cooldowns. Security emails cannot be disabled by optional notification preferences.

## Data and permissions

Migrations apply in order without resetting data. Roles are admin, analyst and viewer; owners/admins manage portfolios and grants, analysts may write when granted, and viewers can only read assigned portfolios. Profile updates cannot assign roles. Every transaction/holdings/export/receipt request checks its entity authorization. Transactions replay the historical ledger and reject oversells. Financial mutations and pending notification records share a SQLite transaction. The background outbox retries email failures; a mail failure does not reverse an already committed trade.

Excel exports honor instrument/type/date/sort filters. Printable receipts record ledger activity rather than payments or tax invoices. Profile image data must be a bounded PNG/JPEG/WebP with a matching signature. The PWA caches only public shell assets and bypasses API responses, profiles, receipts and exports. An internet connection is required for financial records.

## Validation limits

This extension must pass build and local integration checks before deployment. It is not a completed public deployment, a formal security audit, or proof that production SMTP/Google credentials work. The OpenAPI route index includes the extension; detailed request validation is defined by each route’s Zod schema.
