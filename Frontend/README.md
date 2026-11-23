# FinTrack Angular frontend

The finished interface consumes HTTP/JSON only. It has no embedded portfolio or transaction fixture arrays. Use the backend's development demo adapter to preview it while implementing the production business service.

From the repository root:

```sh
npm ci
npm run setup
npm run dev:demo
```

Open `http://localhost:4200`. Sign in using the demo button, or `demo@fintrack.local` / `FinTrackDemo!2026`.

## Routes

| Route             | Interface                                                                        |
| ----------------- | -------------------------------------------------------------------------------- |
| `/login`          | Validated sign-in, password visibility and demo entry                            |
| `/register`       | Validated analyst registration                                                   |
| `/`               | Currency-specific overview, metrics, portfolio table, allocation and activity    |
| `/portfolios`     | Searchable portfolio cards, create/edit/delete                                   |
| `/portfolios/:id` | Holdings, allocation, transactions, filters/sorting, recording, deletion and CSV |

The route guard restores identity from `/api/v1/auth/me`. JWTs remain in per-tab session storage; unauthorized API calls return to sign-in. All API methods and errors are centralized in `src/app/core/api.ts`, with the contract in `models.ts`.

## Connect your API

The default `public/config.json` is `{ "apiBaseUrl": "/api/v1" }`. Development requests are proxied to port 3000 using `proxy.conf.json`. The backend also supports the assessment's `/api` alias.

For a separate deployed API, set `apiBaseUrl` to its HTTPS origin followed by `/api/v1`, configure exact-origin backend CORS and update the frontend host's `connect-src` CSP. This is runtime configuration; no Angular source edit is needed. Never ship a production configuration pointing at localhost.

Keep the documented response shapes: `{data: ...}` for success and `{error: {code,message,details?,requestId?}}` for errors; delete returns 204. The production service can be synchronous or asynchronous because controllers await its methods.

## Design and states

`src/styles.css` defines navy, teal, greys, semantic return colours, one sans-serif family, spacing and border tokens. Positive/negative return colours accompany explicit +/− signs. All amounts identify the portfolio currency and use two decimal places. The allocation chart has a text equivalent and a legend. Trade values are explicitly indicative, based on the latest recorded trade, rather than live market prices.

The UI includes loading, empty, error and mutation feedback; confirmations for destructive actions; labels and visible keyboard focus; modal focus behavior; mobile navigation; and contained table scrolling at 375px. Shared dialogs and the allocation component live under `src/app/shared/`.

```sh
npm run build -w Frontend
npm run test -w Frontend
```

The test script compiles Angular first, then runs a real allocation component test and financial formatting/CSV checks. Production output is `Frontend/dist/fintrack/browser`. Configure SPA fallback on the host so deep links survive refreshes. See the root README and `docs/VERIFICATION.md` for screenshots and verification limits.
