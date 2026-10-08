# Browser end-to-end tests

Playwright tests that drive the production build of the app in Chromium.
The REST API is mocked inside each test with `page.route()`, so no backend or
database is needed. This folder has its own `package.json` so the app's
install and CI are unaffected.

```
cd e2e
npm install
npx playwright install chromium     # once per machine
(cd .. && npm run build)            # build the app the tests will serve
npm test
```

Set `E2E_CHROMIUM=/path/to/chrome` to use an existing Chromium instead of the
downloaded one, and `E2E_PORT` to change the port (default 4310).

| Spec | Covers |
|---|---|
| `tests/quotation-import.spec.js` | Quotation form > Import > From Quotations: dropdown, quotation search (store id, newest first, empty result), product picker (checkbox size, select-all, filter, quantities, back button) and what gets imported |
