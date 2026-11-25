# Assessment completion checklist

Source: Finnet Software Developer Technical Assessment, issued 23 November 2026, five pages. Required items are separate from optional extras. Status reflects evidence, not assumed cloud configuration.

| Brief requirement | Implementation / evidence | Status |
| --- | --- | --- |
| Register/login analyst, hashed passwords, protected API | Auth services, bcrypt, JWT/session cookies, CSRF, integration tests | Implemented and tested |
| Portfolio CRUD and specified fields | Portfolio API, ownership/member checks, KES/USD, created date | Implemented and tested |
| Transactions list/create/delete and specified fields | Transaction API; positive values/date/type/instrument validation | Implemented and tested |
| Holdings net quantity/average cost/invested/value | Chronological moving-average replay and summary tests | Implemented and tested |
| Correct validation/error status bodies | 400/401/403/404/409/422/429; consistent error envelope | Implemented and tested |
| Real database, migrations and seeds | Local SQLite plus Supabase PostgreSQL adapter and versioned schema; idempotent seed | Implemented; verify live postgres after deployment |
| OpenAPI or Postman in repo | Full OpenAPI request/response/security schemas; 45-request Postman collection | Present |
| SPA consumes API only | Angular typed API services; sample records live in backend seed | Implemented |
| Login/register validation and errors | Angular forms, server errors, confirmation/recovery states | Implemented and component-tested |
| Portfolio list create/edit/delete | Dashboard/list and modal/confirm flows | Implemented; prior browser evidence |
| Detail table filter/sort, add trade, holdings | Detail screen; blur/submit/server validation and atomic refresh | Implemented and tested |
| Data visualization | Accessible allocation chart and legend | Component-tested |
| Loading/empty/error states | Page/forms/API state branches | Implemented; final manual browser review advised |
| Desktop and 375px mobile | Responsive layouts, inert navigation, contained tables; screenshots | Prior browser evidence; current browser tool unavailable |
| Finnet brand/header/tokens | Shared palette, wordmark, favicon, titles and typography | Present |
| Financial formatting | Currency labels, two decimals, right-aligned amounts, signed returns | Tested |
| Semantic/labelled/keyboard/AA design | Labelled inputs, radio group, native dialogs, focus styles, accessible chart | Implemented; no formal WCAG certification claimed |
| Helpful states and destructive confirmation | Portfolio/trade confirmation, clear empty/error copy | Present |
| Hosted Git repo | https://github.com/mwaura69/finnet | Public URL verified |
| Incremental meaningful commits | Commit history across API, UI, security, tests, docs and deployments | Verified |
| Feature branch merged through PR | https://github.com/mwaura69/finnet/pull/4 and earlier PRs | GitHub API verified merged |
| README overview/architecture/rationale/setup/env/API/tests/trade-offs/next steps | Root README and linked guides | Updated |
| README screenshots or recording | Desktop/mobile/login/account-menu screenshots linked directly | Present; development capture dates disclosed |
| Public HTTPS frontend and backend | Netlify and Render health/docs | Reachable; demo login verified before migration |
| Hosted database | Supabase selected; candidate reports DATABASE_URL configured in Render | Final cloud connection check pending deployment |
| Pre-seeded working demo | Advertised login returned three sample portfolios over HTTPS | Verified on prior deployed revision; recheck after migration |
| Public live docs | Render and Netlify OpenAPI endpoints | Reachable; updated spec needs deployment |
| Platform secrets, exact frontend CORS | Blank example, server-only settings, no frontend provider keys | Current files sanitized; exposed historical keys require rotation |
| Deployment steps/live URLs/14-day availability | Deployment guide and README | Documented; candidate maintains hosting |
| Submission URLs, credentials, approximate hours, reviewer notes | docs/SUBMISSION_EMAIL.txt; candidate supplied 14 hours | Draft ready; candidate reviews and sends |
| AI disclosure and fictional-only data | README, fictional demo clients | Included |
| Deadline and no later commits | 25 November 2026, 23:59 EAT | Recorded |

## Optional items

Backend unit/integration tests, Angular component tests, SQLite Docker Compose, pull-request CI, transaction pagination in the UI, CSV/Excel export, email MFA, Google login, receipts and PWA shell support are included. Dark mode, a live price feed, server-side pagination and offline financial editing are not implemented.

## Completion gate

The source tree can be built/tested independently of cloud credentials. Full deployment completion additionally requires the final commit merged/deployed, successful live PostgreSQL health and demo checks, rotation of exposed credentials, a final human desktop/mobile review, and the candidate's submission/retention commitment. Do not label these passed merely because a local test passed.
