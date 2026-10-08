# Browser end-to-end tests

Two Playwright suites drive the production build of the app in Chromium.
Both run in GitHub Actions (`.github/workflows/tests.yml`) before every test
and production deploy.

## Mocked API (`tests/`, `playwright.config.js`)

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
| `tests/purchase-import.spec.js` | Quotation form > Import > From Purchases: purchase search, cost and selling prices in the product picker, import at selling price, price-lookup failure, empty result |
| `tests/sales-purchase-import.spec.js` | Sales form type 1 > Import > From Purchase: dropdown, purchase search, product picker (vendor, cost and selling prices, checkbox size, select-all, filter, quantities, back button), price-lookup failure, and quantity merge on repeat import |
| `tests/sales-import.spec.js` | Quotation form > Import > From Sales: sales search, product picker (lines without a product hidden, back button), import with the sale's prices, discounts and edited quantities, empty result |
| `tests/sales-sales-import.spec.js` | Sales form type 1 > Import > From Sales: dropdown, sales search, product picker (customer, sale prices, back button), import with the sale's prices and discounts, quantity merge on repeat import, empty result |
| `tests/quotation-types-import.spec.js` | Quotation form type 2 and type 3 > Import: all 4 options, P.O. option hidden when the module is off, importing from a quotation, a purchase and a sale (prices, discounts, quantity merge), product picker stacking above the form and its back button, and "Allow duplicates" products imported as a separate line (types 1, 2 and 3) |
| `tests/import-picker-settings-stacking.spec.js` | Import document search (sales form types 1-5, quotation form types 1 and 3, all import options): the customer / vendor search settings modal shows on top of the picker and the form, and closing it leaves the picker open |
| `tests/quotation-types-import.spec.js` | Quotation form type 2 and type 3 > Import: all 4 options, P.O. option hidden when the module is off, importing from a quotation, a purchase and a sale (prices, discounts, quantity merge), product picker stacking above the form and its back button |

## Full stack (`fullstack/`, `playwright.fullstack.config.js`)

The build is served by the real Go API (sirinibin/pos-rest, `STATIC_DIR`) on
a throwaway MongoDB + Redis, so these specs check the UI, API and database
together. Requests to the live API hosts are blocked and fail the test, as do
uncaught page errors and any HTTP 5xx from `/v1/`.

```
# MongoDB on :27017 and Redis on :6379, then in pos-rest:
export MONGO_DB=pos_e2e REDIS_DSN=localhost:6379
go run ./e2e/seed                                   # creates the e2e admin user
API_PORT=2000 STATIC_DIR=/path/to/reactjs-pos/build go run main.go &

# here:
npm run test:fullstack
```

`E2E_BASE_URL` (default `http://localhost:2000`), `E2E_EMAIL` and
`E2E_PASSWORD` override the defaults shared with `e2e/seed`. Global setup
creates a store through the API if the user has none.

| Spec | Covers |
|---|---|
| `fullstack/auth.spec.js` | Login form, blank and wrong credentials, no account enumeration, client-side lockout, successful sign-in, signed-in redirect, corrupted token, logout |
| `fullstack/navigation.spec.js` | Every sidebar screen opens without uncaught errors, API 5xx or live-API calls |
| `fullstack/data.spec.js` | Customer created in the form is stored and listed; nameless customer refused; product created through the API is found by the products filter |
