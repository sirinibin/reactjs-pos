# Frontend Instructions

## Environment
- Dev server: http://localhost:3004 (PORT=3004 in .env — never restart it, it hot-reloads automatically)
- React 17 / CRA
- Test credentials: sirinibin2006@gmail.com / 123456

## Deploy rules (frontend/deploy.sh)
deploy.sh is the deploy gate. It refuses uncommitted changes (`git status --porcelain` must be
empty), then runs `ci/run_all_tests.sh`, every test suite, locally, stopping at the first failure:
ESLint (errors only), Jest (every suite, with the pos-rest source for the suites that read it),
one site-neutral build with no "Compiled with warnings", Playwright with a mocked API, and
Playwright full-stack against the real pos-rest API on fresh MongoDB + Redis on all six screen sizes,
and the role audit. Deploy only after all of it passes (user rule 2026-10-11): `QUICK=1 ci/run_all_tests.sh`
(laptop screen only, no role audit) is for local iteration, and deploy.sh refuses to run with `QUICK` set.
It deploys exactly the build it tested (`build/`) to the test site, then (unless `--test-only`) to production, through
`.github/scripts/deploy_site.sh` (atomic swap, verify the site serves it, roll back).
Needs Docker running (throwaway MongoDB/Redis on ports 37017/36379, API on 32000, so a dev stack
on 27017/6379/2000 is untouched), go, node 18+. pos-rest comes from GitHub at master
(`BACKEND_REF` to change) or `BACKEND_DIR=<checkout>`.
Settings are documented in `ci/lib.sh` (keep it identical to pos-rest's `ci/lib.sh`).

## No GitHub Actions
GitHub Actions is not used (user decision 2026-10-11, cost): `.github/workflows/` is gone and must not be
added back (a Jest test fails if it exists). `deploy.sh` is the only deploy path, run from the user's Mac
(it needs Docker and the server SSH key); a push to `master` deploys nothing. There is no `test` branch
(removed 2026-10-11): push to `master` only. The build is site-neutral: absolute API links come from
`src/utils/apiBaseURL.js` (page host → API), never a baked `REACT_APP_API_URL`. `deploy_quick.sh` is the
emergency path with tests skipped.

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

2. **No exceptions for workflow files either:** GitHub Actions is not used, so nothing under
   `.github/workflows/` is copied between `v2` and `master`.

3. **There is no `test` branch.** The test server gets master's tested build from `deploy.sh`.

4. **Always run `deploy_v2.sh` from the `v2` branch.** It enforces the branch check and aborts otherwise.

## Important rules
- Never use `React.lazy(() => import('../order/create.js'))` inside quotation/create.js —
  creates an infinite render loop (order/create.js unconditionally renders Quotation).
- Quotation "Import > From Sales / From Purchases / From Quotations" all go through
  `QuotationImportPicker` (search modal, then product selection modal). Don't reuse the shared
  SalesRef for importing.
- The working directory must match what's committed before deploying (deploy.sh checks this).
  If many files are uncommitted, commit them all — they're interdependent.
