# Verification

Verified on 23 November 2026 with Node 24 and Angular 21. The generated scaffold checkpoint was copied into a clean temporary directory and tested independently, so concurrent local backend implementation edits were preserved.

## Automated checks

| Check                                                 | Result                                                                               |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Backend TypeScript production build                   | Passed                                                                               |
| Angular production build and strict templates         | Passed; initial bundle approximately 405 KB, approximately 102 KB estimated transfer |
| Backend HTTP integration and domain tests             | 5 passed                                                                             |
| Angular allocation component and formatting/CSV tests | 3 passed                                                                             |
| Backend ESLint                                        | Passed                                                                               |
| Production dependency audit                           | 0 reported vulnerabilities at verification time                                      |
| Docker Compose configuration validation               | Passed                                                                               |
| Docker image build / container run                    | Not exercised; local Docker daemon was unavailable                                   |
| Public deployment / remote PR                         | Pending; not claimed                                                                 |

The HTTP integration test exercises JWT-protected CRUD against an in-memory SQLite database, including password hashing, ownership isolation on all portfolio/transaction routes, invalid input, historical oversells, invalidated buy deletions, moving-average summaries, currency locking, cascade deletion, JSON errors, Swagger, versioned routes and the assessment compatibility alias. A separate test checks that the unimplemented service throws 501.

The Angular component test renders the real compiler-produced allocation component, checks the chart's accessible label and API-input values, then checks its empty state. Formatting tests cover KES/USD, explicit return signs and CSV formula escaping.

## Browser checks

Verified the actual Angular interface over HTTP against the SQLite-backed development adapter:

- Demo sign-in and authenticated navigation.
- Portfolio creation, editing and transaction recording using a temporary fictional QA portfolio; the QA portfolio was removed after verification.
- Helpful empty states, success notices, disabled controls while saving, and a server-supplied oversell error displayed within the transaction dialog.
- Instrument/type filters, column sorting, CSV download, holdings view and delete confirmation/cancel.
- Currency switching: KES total 3,642,750.00 across two portfolios; USD total 23,700.00 in one portfolio, with no currency mixing.
- Desktop and 375 × 812 mobile layout. After correction, the document width measured exactly 375px; financial tables scroll within their panels.
- Hidden mobile navigation is inert and excluded from keyboard/accessibility navigation until opened. Dialogs use native modal focus behavior and have accessible names.
- Corrected date-only rendering so a trade recorded on 18 November stays on 18 November instead of shifting to the previous day.

Screenshots: [overview](screenshots/overview-desktop.jpg), [detail](screenshots/detail-desktop.jpg), [375px mobile](screenshots/detail-mobile.jpg), [sign-in](screenshots/login-desktop.jpg).

## Scope and limits

This verifies the generated scaffold and the demo reference, not a completed production portfolio/transaction service. Implement those service methods and rerun checks with demo mode disabled. Additional uncommitted implementation work in the Desktop checkout is not covered by the clean checkpoint result. Test the exact final tree before submitting.

This is not a formal WCAG audit or a multi-browser compatibility certification. No market feed, production deployment, hosted PR, backup restore exercise or load test is claimed. The optional Angular disk cache is disabled because its native LMDB cache crashed on this Mac; compilation and bundling succeed without it. Polling is enabled for development file watching to avoid local macOS file-descriptor limits.
