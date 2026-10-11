# Frontend Instructions

## Environment
- Dev server: http://localhost:3004 (PORT=3004 in .env — never restart it, it hot-reloads automatically)
- React 17 / CRA
- Test credentials: sirinibin2006@gmail.com / 123456

## Deploy rules (frontend/deploy.sh)
deploy.sh is the deploy gate. It refuses uncommitted changes (`git status --porcelain` must be
empty), then runs `ci/run_all_tests.sh`, the unit, functional and e2e suites of the GitHub Actions
`tests.yml`, locally, stopping at the first failure:
ESLint (errors only), Jest (every suite, with the pos-rest source for the suites that read it),
one site-neutral build with no "Compiled with warnings", Playwright with a mocked API, and
Playwright full-stack against the real pos-rest API on fresh MongoDB + Redis on a laptop screen.
`FULL=1` adds what GitHub Actions always runs on top: the other five screen sizes and the role audit.
It deploys exactly the build it tested (`build/`) to the test site, then (unless `--test-only`) to production, through
`.github/scripts/deploy_site.sh` like the pipeline (atomic swap, verify the site serves it, roll back).
Needs Docker running (throwaway MongoDB/Redis on ports 37017/36379, API on 32000, so a dev stack
on 27017/6379/2000 is untouched), go, node 18+. pos-rest comes from GitHub at master
(`BACKEND_REF` to change) or `BACKEND_DIR=<checkout>`.
Settings are documented in `ci/lib.sh` (keep it identical to pos-rest's `ci/lib.sh`).

## GitHub Actions
One pipeline for both sites: a push to `master` runs `deploy.yml`, which calls `tests.yml` once and deploys
that one build to the test site and, only after the test site serves it, to production
(`.github/scripts/deploy_site.sh`: atomic swap, verify, roll back). There is no `test` branch any
more (removed 2026-10-11): push to `master` only. The build is site-neutral: absolute API links come
from `src/utils/apiBaseURL.js` (page host → API), never a baked `REACT_APP_API_URL`.
`deploy_quick.yml` (manual, tests skipped) takes a target: both / test / production. `tests.yml` runs:
ESLint + Jest, build (no warnings), Playwright with a mocked API (`e2e/tests`) and Playwright
full-stack against the real pos-rest API on MongoDB + Redis (`e2e/fullstack`, see `e2e/README.md`).
The build the tests ran against is the one deployed. `ci/run_all_tests.sh` mirrors `tests.yml`:
change both together.

## Usage
```
frontend/deploy.sh              # every suite, one build, test site (verified), then production
frontend/deploy.sh --test-only  # same, stop after the test site
```

## After every frontend change
1. Write unit tests for changed logic.
2. `npm test -- --watchAll=false --runInBand --testPathPattern=<changed-module>` to verify.
3. Commit all changed files (including App.css, translations, etc. — tests depend on them).
4. Run `frontend/deploy.sh`.

## Branch isolation rule (NON-NEGOTIABLE)

The `v2` branch is a **completely separate product line** from `master`.

1. **Never merge, cherry-pick, or rebase between `v2` and `master` in either direction.**
   Features for v2 stay on v2. Features for master stay there. No exceptions.

2. **The one allowed exception — GitHub Actions workflow files only:**
   GitHub only reads `.github/workflows/` from the default branch (`master`).
   When adding a new workflow file to `v2`, copy that file to `master` using:
   `git checkout v2 -- .github/workflows/<file>.yml`
   This is a file copy only — NOT a merge. No other files cross the v2 boundary.

3. **There is no `test` branch.** The test server gets master's tested build from the `deploy.yml` pipeline.

4. **Always run `deploy_v2.sh` from the `v2` branch.** It enforces the branch check and aborts otherwise.

## Important rules
- Never use `React.lazy(() => import('../order/create.js'))` inside quotation/create.js —
  creates an infinite render loop (order/create.js unconditionally renders Quotation).
- Quotation "Import > From Sales / From Purchases / From Quotations" all go through
  `QuotationImportPicker` (search modal, then product selection modal). Don't reuse the shared
  SalesRef for importing.
- The working directory must match what's committed before deploying (deploy.sh checks this).
  If many files are uncommitted, commit them all — they're interdependent.
