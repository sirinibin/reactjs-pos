# Frontend Instructions

## Environment
- Dev server: http://localhost:3004 (PORT=3004 in .env — never restart it, it hot-reloads automatically)
- React 17 / CRA
- Test credentials: sirinibin2006@gmail.com / 123456

## Deploy rules (frontend/deploy.sh)
deploy.sh enforces three gates before every deploy — all three must pass:

1. **No uncommitted changes** — `git status --porcelain` must be empty.
   Commit or stash everything before running deploy.sh.

2. **All tests pass** — `npm test` with CI=true must exit 0.
   Fix failing tests before deploying. Skipped tests:
   RFQReceived.smoke | importHandlers | QuotationCreate.productEditFocus

3. **No build warnings** — CRA must output "Compiled successfully." not "Compiled with warnings."
   Fix all ESLint / webpack warnings before deploying.

## GitHub Actions
`deploy.yml` (test) / `deploy_production.yml` call `tests.yml` and deploy only if all of it passes:
ESLint + Jest, build (no warnings), Playwright with a mocked API (`e2e/tests`) and Playwright
full-stack against the real pos-rest API on MongoDB + Redis (`e2e/fullstack`, see `e2e/README.md`).
The build the tests ran against is the one deployed.

## Usage
```
frontend/deploy.sh both        # test + production (default)
frontend/deploy.sh test        # test only
frontend/deploy.sh production  # production only
```

## After every frontend change
1. Write unit tests for changed logic.
2. `npm test -- --watchAll=false --runInBand --testPathPattern=<changed-module>` to verify.
3. Commit all changed files (including App.css, translations, etc. — tests depend on them).
4. Run `frontend/deploy.sh both`.

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
- Never use `React.lazy(() => import('../order/create.js'))` inside quotation/create.js —
  creates an infinite render loop (order/create.js unconditionally renders Quotation).
- Quotation "Import > From Sales / From Purchases / From Quotations" all go through
  `QuotationImportPicker` (search modal, then product selection modal). Don't reuse the shared
  SalesRef for importing.
- The working directory must match what's committed before deploying (deploy.sh checks this).
  If many files are uncommitted, commit them all — they're interdependent.
