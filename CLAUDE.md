# Frontend Instructions (v2 — React 18 + Vite + TypeScript)

## Environment
- Dev server: `npm run dev` → http://localhost:3004 (proxies /v1 etc. to the Go API on :2000)
- React 18 / Vite 5 / TypeScript, TanStack Query, react-router v6, i18next
- Test credentials: sirinibin2006@gmail.com / 123456

## Deploy rules (deploy_v2.sh)
deploy_v2.sh enforces these gates before every deploy — all must pass:

1. **Branch is `v2`** (bypass only with `--force`).
2. **No uncommitted changes** — `git status --porcelain` must be empty.
3. **Types + lint clean** — `npm run typecheck` and `npm run lint` (zero warnings).
4. **All tests pass** — `CI=true npm test` (Vitest) must exit 0.
5. **No build warnings** — `npm run build` must not print any warning.

## After every frontend change
1. Write unit/functional tests for changed logic (next to the module: `*.test.ts(x)`).
2. `npx vitest run <path>` to verify; `npm test` for everything.
3. For API-facing changes also run `npm run test:integration` (live API) and the relevant
   Playwright spec (`npx playwright test tests/e2e/<spec> --project=desktop-1920 --project=iphone-se`).
4. Commit all changed files, then run `./deploy_v2.sh` from the `v2` branch.

## Conventions
- Every API call carries `search[store_id]` (the client adds it via `useStoreId()` / hooks).
- New features go in `src/modules/<name>/index.ts` (auto-discovered) — see `docs/BUILDING_MODULES.md`.
- UI text uses English strings as i18n keys; add Arabic in the module's `ar.ts`.

## Branch isolation rule (NON-NEGOTIABLE)

The `v2` branch is a **completely separate product line** from `master`/`test`.

1. **Never merge, cherry-pick, or rebase between `v2` and `master`/`test` in either direction.**
   Features for v2 stay on v2. Features for master/test stay there. No exceptions.

2. **The one allowed exception — GitHub Actions workflow files only:**
   GitHub only reads `.github/workflows/` from the default branch (`master`).
   When adding a new workflow file to `v2`, copy that file to `master` using:
   `git checkout v2 -- .github/workflows/<file>.yml`
   This is a file copy only — NOT a merge. No other files cross the v2 boundary.

3. **`master` and `test` may share changes freely.** This rule only applies to the v2 boundary.

4. **Always run `deploy_v2.sh` from the `v2` branch.** It enforces the branch check and aborts otherwise.

## Important rules
- The working directory must match what's committed before deploying (deploy_v2.sh checks this).
- The legacy CRA app (src/quotation/create.js etc.) lives on `master`/`test` only; its rules do not apply here.
