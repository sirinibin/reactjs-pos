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
| `tests/purchase-import.spec.js` | Quotation form > Import > From Purchases: purchase search, cost and selling prices in the product picker, import at selling price, price-lookup failure, empty result |
| `tests/sales-purchase-import.spec.js` | Sales form type 1 > Import > From Purchase: dropdown, purchase search, product picker (vendor, cost and selling prices, checkbox size, select-all, filter, quantities, back button), price-lookup failure, and quantity merge on repeat import |
| `tests/sales-import.spec.js` | Quotation form > Import > From Sales: sales search, product picker (lines without a product hidden, back button), import with the sale's prices, discounts and edited quantities, empty result |
| `tests/sales-sales-import.spec.js` | Sales form type 1 > Import > From Sales: dropdown, sales search, product picker (customer, sale prices, back button), import with the sale's prices and discounts, quantity merge on repeat import, empty result |
