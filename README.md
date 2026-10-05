# StartERP v2 — frontend

React 18 + Vite + TypeScript rebuild of the StartPOS / StartERP frontend ("Horizon" design).
It talks to the unchanged Go API (`pos-rest`) on the same origin (`/v1/...`).

## Run locally

Requirements: Node 20+, the Go API on `http://127.0.0.1:2000` (MongoDB + Redis running).

```bash
npm ci
npm run dev            # http://localhost:3004 — proxies /v1, /zatca, /pdfs, /images… to :2000
```

Point the proxy elsewhere with `VITE_PROXY_HOST=http://host:port` in `.env.local`.
Sign in with an existing user (dev seed: `sirinibin2006@gmail.com` / `123456`).

## Tests

| Command | What |
|---|---|
| `npm test` | Unit + functional tests (Vitest + Testing Library, mocked API) |
| `npm run seed` | Seed demo customers/vendors/products into the store used by the live tests (`tests/.seed.json`) |
| `npm run test:integration` | Integration tests against the live API on :2000 (needs seed) |
| `npm run test:e2e` | Playwright E2E on 10 device profiles (desktop 1920/1366/1280, iPad landscape/portrait, Galaxy Tab, iPhone 14/SE, Pixel 7, Galaxy S9+) |

E2E uses `npm run dev` by default; set `E2E_BASE_URL=http://localhost:4173` to run against `npm run build && npx vite preview`.
The API rate-limits sign-in (10 / 15 min / IP), so E2E signs in once (`tests/e2e/auth.setup.ts`) and reuses the session.

## Quality gates

`npm run typecheck`, `npm run lint` (zero warnings), `npm test`, `npm run build` (no warnings).
`deploy_v2.sh` and `.github/workflows/deploy_v2.yml` enforce all of them.

## Structure

- `src/app`, `src/shell` — routing, guards, app shell (rail + panel, workspace tabs, Ctrl+K palette, notifications)
- `src/api`, `src/auth`, `src/realtime` — API client, session, WebSocket bridge
- `src/ui`, `src/framework` — design-system components, list pages, entity forms, document editor/view/print
- `src/modules/*` — feature modules, auto-discovered (`index.ts` exports `routes` + `setup()`); see `docs/BUILDING_MODULES.md`
- `src/i18n` — en, ar, ur, hn, ml, bn, ru (Arabic/Urdu are right-to-left)
