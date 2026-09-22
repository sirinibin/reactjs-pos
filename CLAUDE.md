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

## Important rules
- Never use `React.lazy(() => import('../order/create.js'))` inside quotation/create.js —
  creates an infinite render loop (order/create.js unconditionally renders Quotation).
- For "Import from Sales" in Quotation: use a dedicated `<Sales ref={SalesImportRef}>` instance,
  not a mode-flag hack on the shared SalesRef.
- The working directory must match what's committed before deploying (deploy.sh checks this).
  If many files are uncommitted, commit them all — they're interdependent.
