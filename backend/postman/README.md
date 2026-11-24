# FinTrack Postman collection

Import `FinTrack.postman_collection.json` into Postman. It contains 45 requests covering all 38 implemented HTTP endpoints. Optional `FinTrack.Render.postman_environment.json` and `FinTrack.Local.postman_environment.json` environments select the host and expected frontend Origin.

1. Select an environment, then set the collection's `email` and `password` variables to your test account. Keep Postman's cookie jar enabled. No server API keys or JWT secrets belong in this collection.
2. For a verified account, run **Login**. If it returns `requiresMfa: true`, enter `mfaCode` and run **Verify MFA challenge**. Session cookies are stored automatically; there is no Bearer token to paste.
3. For a new account, run **Register account**, receive the confirmation email, copy its token into `verificationToken`, run **Verify email**, then **Login**. Resend/forgot-password responses deliberately do not disclose account existence or guarantee inbox delivery.
4. Create a portfolio to capture `portfolioId`, then create a BUY before testing the partial SELL. Transaction IDs and MFA challenges are captured automatically. Request bodies, descriptions and variable descriptions explain required values.
5. Use **Send and Download** for Excel. Receipt endpoints return JSON for the frontend's printable receipt, not a PDF.

A collection-level pre-request script obtains CSRF before every mutation and adds the matching header. Keep cookies enabled and use the correct `frontendOrigin` for the backend's FRONTEND_ORIGIN. Render cold starts may need a request timeout of 60 seconds or more. Use Desktop/Desktop Agent for localhost.

Send requests individually: the collection includes password changes, MFA changes, permissions, real email triggers, and deletes. It is a route reference rather than an unattended whole-collection production test. Failed oversell or future-date examples expect 422; deleting a BUY required by a later SELL returns 409.

`GET /transactions` under a portfolio currently returns the complete ledger; query filters are supported by the Excel export endpoint, while the Angular app filters the displayed table. There is no transaction edit endpoint.

Tokens and codes must come from actual emails. Google requires a fresh ID token from your application's Google Identity Services flow, with the correct audience. The collection cannot read an inbox or choose a Google account.

The exported files contain no credentials. Clear credentials and auto-captured tokens before sharing a used collection. Route coverage, JSON bodies, script syntax, and CSRF/session scripts were checked locally with mocks; this collection was not run against production.
