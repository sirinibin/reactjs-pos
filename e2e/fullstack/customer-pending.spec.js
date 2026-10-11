// The customer pendings modal (Customers list > credit balance link) against the
// real API: it shows the customer's unpaid and partly paid sales, the matching
// vendor's purchase tabs (found by name and VAT no., even with "&" or "#" in the
// name), and loads each list once. Before the fix every list was fetched twice
// because the modal body remounted when the customer lookup answered, and a name
// with "&" cut the vendor lookup short so the purchase tabs never showed.
const { test, expect, AUTH_STATE } = require('./fixtures');
const { salesApi } = require('./helpers/sales');
const { typeInto, openPurchaseCreate, chooseVendor } = require('./helpers/purchase');
const { uniq } = require('./api');

test.use({ storageState: AUTH_STATE });
test.describe.configure({ timeout: 120_000 });

/** A customer and a vendor with the same name and VAT no., and two credit sales (200 + 115 unpaid, 115 - 50 paid). */
async function arrange(api) {
  const word = uniq('PND');
  const vat = '3' + String(Date.now()).slice(-13) + '3';
  const name = `E2E Pend & Co #${word}`;
  const customer = await api.createCustomer({ name, extra: { vat_no: vat } });
  const vendor = await api.createVendor({ name, extra: { vat_no: vat } });
  const product = await api.createProduct({ name: `E2E Item ${word}`, partNumber: `I-${word}` });
  const unpaid = await api.createSale({ customer, lines: [{ product, qty: 2, price: 100 }] });
  const partly = await api.createSale({ customer, lines: [{ product, qty: 1, price: 100 }], payments: [{ amount: 50 }] });
  const paid = await api.createSale({ customer, lines: [{ product, qty: 1, price: 100 }], payments: [{ amount: 115 }] });
  return { word, customer, vendor, unpaid, partly, paid };
}

async function customerRow(page, customer, word) {
  await page.goto('/dashboard/customers');
  await typeInto(page, page.getByPlaceholder('Customer Name / Mob / VAT # / ID').first(), word);
  const row = page.locator('table tbody tr').filter({ hasText: customer.code });
  await expect(row).toHaveCount(1);
  // Close the name suggestions, which cover the rows on small screens.
  await page.keyboard.press('Escape');
  await expect(page.locator('.rbt-menu')).toHaveCount(0);
  return row;
}

/** Records the /v1 requests the page makes from now on, as "METHOD path?query" (decoded). */
function recordCalls(page) {
  const calls = [];
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (u.pathname.startsWith('/v1/')) calls.push({ method: r.method(), path: u.pathname, params: u.searchParams, raw: `${r.method()} ${u.pathname}?${decodeURIComponent(u.search.slice(1))}` });
  });
  return calls;
}

/** Resolves when the pending list of `path` (the one filtered by payment status) has answered. */
function waitForList(page, path) {
  return page.waitForResponse((r) => {
    const u = new URL(r.url());
    return u.pathname === path && u.searchParams.get('search[payment_status]') === 'not_paid,paid_partially';
  });
}
const isList = (c, path) => c.path === path && c.params.get('search[payment_status]') === 'not_paid,paid_partially';

/** No request is repeated, and the modal stays within its call budget (was 18 on open for a customer). */
function expectNoRepeats(calls, max) {
  const raws = calls.map((c) => c.raw);
  expect(raws.filter((r, i) => raws.indexOf(r) !== i), raws.join('\n')).toEqual([]);
  expect(raws.length, raws.join('\n')).toBeLessThanOrEqual(max);
}

test.describe('Customer pendings modal', () => {
  test('lists the pending sales, finds the vendor and loads each list once @devices', async ({ page, request }) => {
    const api = salesApi(request);
    const { word, customer, vendor, unpaid, partly, paid } = await arrange(api);
    const row = await customerRow(page, customer, word);

    const calls = recordCalls(page);
    const salesListed = waitForList(page, '/v1/order');
    await row.locator('button.btn-link').filter({ hasText: /\d/ }).first().click();
    const modal = page.locator('.customer-pending-modal');
    await salesListed;
    await expect(modal.locator('.modal-title')).toContainText(`${customer.code}/${customer.name}'s Pendings`);

    // Unpaid and partly paid sales are listed, the paid one is not.
    const salesPane = modal.locator('.tab-pane.active');
    await expect(salesPane.locator('tbody tr').filter({ hasText: unpaid.code })).toHaveCount(1);
    await expect(salesPane.locator('tbody tr').filter({ hasText: partly.code })).toHaveCount(1);
    await expect(salesPane.locator('tbody tr').filter({ hasText: paid.code })).toHaveCount(0);

    // Badges: 230 + 65 still owed on sales; header shows the account balance.
    await expect(modal.getByRole('tab', { name: /^Sales\s*295\.00/ })).toBeVisible();
    // The vendor with the same name and VAT no. is found despite "&" and "#".
    await expect(modal.getByRole('tab', { name: /^Purchases\s*[\d.-]/ })).toBeVisible();
    await expect(modal.getByRole('tab', { name: /^Purchases Returns/ })).toBeVisible();
    await page.waitForTimeout(1000);

    // customer, vendor lookup, sales list, plus the sales list's store, draft count and reminders.
    expectNoRepeats(calls, 6);
    const own = (pred) => calls.filter(pred);
    const customerGets = own((c) => c.path === `/v1/customer/${customer.id}`);
    const vendorLookups = own((c) => c.path === '/v1/vendor/vat_no/name');
    const salesLists = own((c) => isList(c, '/v1/order'));
    expect(customerGets, calls.map((c) => c.raw).join('\n')).toHaveLength(1);
    expect(vendorLookups).toHaveLength(1);
    expect(vendorLookups[0].params.get('name')).toBe(customer.name);
    expect(vendorLookups[0].params.get('vat_no')).toBe(customer.vat_no);
    expect(salesLists, calls.map((c) => c.raw).join('\n')).toHaveLength(1);
    expect(salesLists[0].params.get('search[payment_status]')).toBe('not_paid,paid_partially');
    expect(salesLists[0].params.get('search[store_id]')).toBe(api.storeId);
    // Tabs that are not open are not loaded.
    expect(own((c) => c.path === '/v1/sales-return')).toHaveLength(0);
    expect(own((c) => c.path.startsWith('/v1/purchase'))).toHaveLength(0);
    expect(own((c) => c.method !== 'GET')).toHaveLength(0);

    // Opening a tab loads its list once, scoped to the customer and store.
    const returnListed = waitForList(page, '/v1/sales-return');
    await modal.getByRole('tab', { name: /^Sales Return\s/ }).click();
    await returnListed;
    await page.waitForTimeout(1000);
    const returnLists = own((c) => isList(c, '/v1/sales-return'));
    expect(returnLists).toHaveLength(1);
    expect(returnLists[0].params.get('search[customer_id]')).toBe(customer.id);
    expect(returnLists[0].params.get('search[store_id]')).toBe(api.storeId);

    const purchaseListed = waitForList(page, '/v1/purchase');
    await modal.getByRole('tab', { name: /^Purchases\s*[\d.-]/ }).click();
    await purchaseListed;
    await page.waitForTimeout(1000);
    const purchaseLists = own((c) => isList(c, '/v1/purchase'));
    expect(purchaseLists).toHaveLength(1);
    expect(purchaseLists[0].params.get('search[store_id]')).toBe(api.storeId);
    expect(purchaseLists[0].params.get('search[vendor_id]')).toBe(vendor.id);

    // Going back to a tab already open does not reload it.
    await modal.getByRole('tab', { name: /^Sales\s*295/ }).click();
    await expect(modal.locator('.tab-pane.active tbody tr').filter({ hasText: unpaid.code })).toBeVisible();
    await page.waitForTimeout(1000);
    expect(own((c) => isList(c, '/v1/order'))).toHaveLength(1);

    // Closing raises no request.
    const before = calls.length;
    const close = modal.locator('.modal-header .btn-close');
    await expect(close).toBeInViewport();
    await close.click();
    await expect(modal).toHaveCount(0);
    await page.waitForTimeout(500);
    expect(calls.slice(before).map((c) => c.raw)).toEqual([]);
  });

  test('a customer with no VAT no. shows no purchase tabs and makes no vendor lookup', async ({ page, request }) => {
    const api = salesApi(request);
    const word = uniq('PNV');
    const customer = await api.createCustomer({ name: `E2E Walk In ${word}` });
    const product = await api.createProduct({ name: `E2E Item ${word}`, partNumber: `I-${word}` });
    await api.createSale({ customer, lines: [{ product, qty: 1, price: 100 }] });
    const row = await customerRow(page, customer, word);

    const calls = recordCalls(page);
    await row.locator('button.btn-link').filter({ hasText: /\d/ }).first().click();
    const modal = page.locator('.customer-pending-modal');
    await expect(modal.getByRole('tab', { name: /^Sales\s*115\.00/ })).toBeVisible();
    await page.waitForTimeout(1000);
    await expect(modal.getByRole('tab', { name: /^Purchases/ })).toHaveCount(0);
    expect(calls.filter((c) => c.path.startsWith('/v1/vendor'))).toHaveLength(0);
  });

  test('vendor pendings modal (Purchase form > Cr.Balance) loads each list once and finds the customer @devices', async ({ page, request }) => {
    const api = salesApi(request);
    const { vendor, customer, word } = await arrange(api);
    const product = await api.createProduct({ name: `E2E Item V ${word}`, partNumber: `IV-${word}` });
    const unpaid = await api.createPurchase({ vendor, lines: [{ product, qty: 2, price: 100 }] });
    const paid = await api.createPurchase({ vendor, lines: [{ product, qty: 1, price: 100 }], payments: [{ amount: 115 }] });

    const dialog = await openPurchaseCreate(page);
    await chooseVendor(page, dialog, vendor);
    const opener = dialog.getByTitle('Click to view pendings').first();
    await expect(opener).toBeVisible();

    const calls = recordCalls(page);
    const purchaseListed = waitForList(page, '/v1/purchase');
    await opener.click();
    const modal = page.locator('.vendor-pending-modal');
    await purchaseListed;
    await expect(modal.locator('.modal-title')).toContainText(`${vendor.code}/${vendor.name}'s Pendings`);
    const pane = modal.locator('.tab-pane.active');
    await expect(pane.locator('tbody tr').filter({ hasText: unpaid.code })).toHaveCount(1);
    await expect(pane.locator('tbody tr').filter({ hasText: paid.code })).toHaveCount(0);
    await expect(modal.getByRole('tab', { name: /^Purchases\s*230\.00/ })).toBeVisible();
    // The customer with the same name and VAT no. is found despite "&" and "#".
    await expect(modal.getByRole('tab', { name: /^Sales\s*295\.00/ })).toBeVisible();
    await page.waitForTimeout(1000);

    // vendor, customer lookup, purchase list and its draft count.
    expectNoRepeats(calls, 4);
    const own = (pred) => calls.filter(pred);
    expect(own((c) => c.path === `/v1/vendor/${vendor.id}`), calls.map((c) => c.raw).join('\n')).toHaveLength(1);
    const lookups = own((c) => c.path === '/v1/customer/vat_no/name');
    expect(lookups).toHaveLength(1);
    expect(lookups[0].params.get('name')).toBe(vendor.name);
    const lists = own((c) => isList(c, '/v1/purchase'));
    expect(lists, calls.map((c) => c.raw).join('\n')).toHaveLength(1);
    expect(lists[0].params.get('search[vendor_id]')).toBe(vendor.id);
    expect(own((c) => c.path === '/v1/order' || c.path === '/v1/purchase-return')).toHaveLength(0);
    expect(own((c) => c.method !== 'GET')).toHaveLength(0);

    const salesListed = waitForList(page, '/v1/order');
    await modal.getByRole('tab', { name: /^Sales\s*295/ }).click();
    await salesListed;
    await page.waitForTimeout(1000);
    const salesLists = own((c) => isList(c, '/v1/order'));
    expect(salesLists).toHaveLength(1);
    expect(salesLists[0].params.get('search[customer_id]')).toBe(customer.id);

    const before = calls.length;
    await modal.locator('.modal-header .btn-close').click();
    await expect(modal).toHaveCount(0);
    await page.waitForTimeout(500);
    expect(calls.slice(before).map((c) => c.raw)).toEqual([]);
  });
});
