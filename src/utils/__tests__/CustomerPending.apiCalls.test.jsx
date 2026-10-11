// What the customer pendings modal fetches, rendered with the real react-bootstrap
// Modal and Tabs (the smoke test mocks them away):
//  - the modal body is mounted once per open; before the fix the inline dialogAs
//    remounted every tab list each time the customer or vendor lookup answered,
//    so every list was fetched twice (or three times with a matching vendor)
//  - only the open tab's list is mounted (mountOnEnter)
//  - the vendor lookup sends the name and VAT no. encoded
//  - a lookup answered after the modal was reopened for another customer is dropped
//  - the tabs follow the store settings cached now, not at bundle load

jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));

const mockMounts = {};
const mockProps = {};
function mockListTab(name) {
  return (props) => {
    const React = require('react');
    mockProps[name] = props;
    React.useEffect(() => {
      mockMounts[name] = (mockMounts[name] || 0) + 1;
    }, []);
    return React.createElement('div', { 'data-testid': 'tab-' + name }, name);
  };
}
jest.mock('../../order/index.js', () => mockListTab('sales'));
jest.mock('../../sales_return/index.js', () => mockListTab('salesReturn'));
jest.mock('../../quotation/index.js', () => mockListTab('quotation'));
jest.mock('../../quotation_sales_return/index.js', () => mockListTab('quotationSalesReturn'));
jest.mock('../../non_vat_sales/index.js', () => mockListTab('nonVatSales'));
jest.mock('../../non_vat_sales_return/index.js', () => mockListTab('nonVatSalesReturn'));
jest.mock('../../purchase/index.js', () => mockListTab('purchase'));
jest.mock('../../purchase_return/index.js', () => mockListTab('purchaseReturn'));
jest.mock('../../posting/index.js', () => {
  const React = require('react');
  return React.forwardRef(() => null);
});
jest.mock('../amount.js', () => ({ amount }) => require('react').createElement('span', null, String(amount)));

import React, { createRef } from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import CustomerPending, { vendorLookupURL } from '../customer_pending.js';
import VendorPending, { customerLookupURL } from '../vendor_pending.js';

const STORE = 'store1';
const json = (result, ok = true) => Promise.resolve({
  ok,
  headers: { get: () => 'application/json' },
  json: () => Promise.resolve({ status: ok, result }),
});

// Responses are released by the test, to control the order they arrive in.
let pending;
function installFetch() {
  pending = [];
  global.fetch = jest.fn((url) => new Promise((resolve) => pending.push({ url, resolve })));
}
async function answer(match, result, ok = true) {
  const i = pending.findIndex((p) => p.url.includes(match));
  if (i < 0) throw new Error('no pending request for ' + match + ' in ' + pending.map((p) => p.url).join(', '));
  const [p] = pending.splice(i, 1);
  await act(async () => { p.resolve(await json(result, ok)); });
}

const ACME = { id: 'c1', code: 'C-001', name: 'Acme & Sons #1', vat_no: '300000000000003', account: { id: 'a1' } };

beforeEach(() => {
  Object.keys(mockMounts).forEach((k) => delete mockMounts[k]);
  localStorage.setItem('store_id', STORE);
  localStorage.setItem('access_token', 'tok');
  localStorage.removeItem('_store_settings_cache');
  installFetch();
});

describe('vendorLookupURL / customerLookupURL', () => {
  test('encode the name and VAT no.', () => {
    const url = vendorLookupURL('Acme & Sons #1+2', '300 0', STORE);
    expect(url).toBe('/v1/vendor/vat_no/name?vat_no=300%200&name=Acme%20%26%20Sons%20%231%2B2&search[store_id]=' + STORE);
    const params = new URL('http://x' + url).searchParams;
    expect(params.get('name')).toBe('Acme & Sons #1+2');
    expect(params.get('vat_no')).toBe('300 0');
    expect(params.get('search[store_id]')).toBe(STORE);
  });

  test('Arabic names survive the round trip', () => {
    const url = customerLookupURL('شركة النور', '311', STORE);
    expect(new URL('http://x' + url).searchParams.get('name')).toBe('شركة النور');
    expect(url.startsWith('/v1/customer/vat_no/name?')).toBe(true);
  });

  test('no store id, no store parameter', () => {
    expect(vendorLookupURL('A', '1', null)).toBe('/v1/vendor/vat_no/name?vat_no=1&name=A');
  });
});

describe('CustomerPending API calls', () => {
  async function open(ref, customer = ACME) {
    await act(async () => { ref.current.open(false, customer); });
  }

  test('one customer and one vendor lookup per open; the sales list mounts once', async () => {
    const ref = createRef();
    render(<CustomerPending ref={ref} />);
    await open(ref);

    expect(global.fetch.mock.calls.map(([u]) => u.split('?')[0])).toEqual([
      '/v1/customer/c1',
      '/v1/vendor/vat_no/name',
    ]);
    expect(mockMounts.sales).toBe(1);

    await answer('/v1/customer/c1', { ...ACME, stores: { [STORE]: { sales_balance_amount: 295 } } });
    await answer('/v1/vendor/vat_no/name', { id: 'v1', name: ACME.name, stores: { [STORE]: { purchase_balance_amount: 40 } } });

    // The answers re-render the header and badges but do not remount the lists.
    expect(mockMounts.sales).toBe(1);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(screen.getByText("C-001/Acme & Sons #1's Pendings")).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Sales\s*295/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Purchases\s*40/ })).toBeInTheDocument();
  });

  test('the vendor lookup URL carries the full name', async () => {
    const ref = createRef();
    render(<CustomerPending ref={ref} />);
    await open(ref);
    const url = global.fetch.mock.calls.find(([u]) => u.includes('/v1/vendor/vat_no/name'))[0];
    expect(new URL('http://x' + url).searchParams.get('name')).toBe('Acme & Sons #1');
  });

  test('other tabs mount only when opened, and stay mounted', async () => {
    const ref = createRef();
    render(<CustomerPending ref={ref} />);
    await open(ref);
    await answer('/v1/customer/c1', ACME);
    await answer('/v1/vendor/vat_no/name', { id: 'v1', name: ACME.name });

    expect(mockMounts.salesReturn).toBeUndefined();
    expect(mockMounts.purchase).toBeUndefined();
    fireEvent.click(screen.getByRole('tab', { name: /Sales Return/ }));
    expect(mockMounts.salesReturn).toBe(1);
    fireEvent.click(screen.getByRole('tab', { name: /^Sales\s*[\d.-]/ }));
    fireEvent.click(screen.getByRole('tab', { name: /Sales Return/ }));
    expect(mockMounts.salesReturn).toBe(1);
    expect(mockMounts.sales).toBe(1);
  });

  test('a refresh after a payment keeps the open tab and does not remount it', async () => {
    const ref = createRef();
    render(<CustomerPending ref={ref} />);
    await open(ref);
    await answer('/v1/customer/c1', ACME);
    await answer('/v1/vendor/vat_no/name', { id: 'v1', name: ACME.name });
    fireEvent.click(screen.getByRole('tab', { name: /Sales Return/ }));

    await act(async () => { mockProps.salesReturn.handleUpdated(); });
    await answer('/v1/customer/c1', { ...ACME, stores: { [STORE]: { sales_return_balance_amount: 12 } } });
    await answer('/v1/vendor/vat_no/name', { id: 'v1', name: ACME.name });

    expect(screen.getByRole('tab', { name: /Sales Return\s*12/ })).toHaveAttribute('aria-selected', 'true');
    expect(mockMounts.salesReturn).toBe(1);
    expect(mockMounts.sales).toBe(1);
  });

  test('a customer with no VAT no. gets no vendor lookup and no purchase tabs', async () => {
    const ref = createRef();
    render(<CustomerPending ref={ref} />);
    await open(ref, { id: 'c2', code: 'C-002', name: 'Walk In' });
    await answer('/v1/customer/c2', { id: 'c2', code: 'C-002', name: 'Walk In' });
    expect(global.fetch.mock.calls.some(([u]) => u.includes('/v1/vendor/'))).toBe(false);
    expect(screen.queryByRole('tab', { name: /Purchases/ })).toBeNull();
  });

  test('a vendor lookup with no match leaves the purchase tabs hidden', async () => {
    const ref = createRef();
    render(<CustomerPending ref={ref} />);
    await open(ref);
    await answer('/v1/customer/c1', ACME);
    await answer('/v1/vendor/vat_no/name', undefined); // the API answers 200, status false, no result
    expect(screen.queryByRole('tab', { name: /Purchases/ })).toBeNull();
  });

  test('a failed customer lookup keeps the customer the list passed in', async () => {
    const ref = createRef();
    render(<CustomerPending ref={ref} />);
    await open(ref);
    await answer('/v1/customer/c1', null, false);
    expect(screen.getByText("C-001/Acme & Sons #1's Pendings")).toBeInTheDocument();
  });

  test('answers for a customer the modal was reopened away from are dropped', async () => {
    const ref = createRef();
    render(<CustomerPending ref={ref} />);
    await open(ref); // Acme, lookups still in flight
    await act(async () => { ref.current.open(false, { id: 'c2', code: 'C-002', name: 'Walk In' }); });

    await answer('/v1/customer/c1', { ...ACME, code: 'C-001' });
    await answer('/v1/vendor/vat_no/name', { id: 'v1', name: ACME.name });
    expect(screen.getByText("C-002/Walk In's Pendings")).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /Purchases/ })).toBeNull();

    await answer('/v1/customer/c2', { id: 'c2', code: 'C-002', name: 'Walk In', credit_balance: 7 });
    expect(screen.getByText("C-002/Walk In's Pendings")).toBeInTheDocument();
  });

  test('tabs follow the store settings cached at open time', async () => {
    const ref = createRef();
    render(<CustomerPending ref={ref} />);
    await open(ref, { id: 'c2', code: 'C-002', name: 'Walk In' });
    expect(screen.queryByRole('tab', { name: /Non VAT Sales/ })).toBeNull();

    localStorage.setItem('_store_settings_cache', JSON.stringify({ non_vat_sales: true, enable_sales_in_quotation: true }));
    await open(ref, { id: 'c2', code: 'C-002', name: 'Walk In' });
    expect(screen.getByRole('tab', { name: /^Non VAT Sales\s*[\d.-]/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Qtn\. Sales Return/ })).toBeInTheDocument();
  });

  test('closing raises no request and reopening mounts the list again once', async () => {
    const ref = createRef();
    render(<CustomerPending ref={ref} />);
    await open(ref);
    await answer('/v1/customer/c1', ACME);
    await answer('/v1/vendor/vat_no/name', { id: 'v1', name: ACME.name });
    const before = global.fetch.mock.calls.length;
    fireEvent.click(screen.getByLabelText('Close'));
    expect(global.fetch.mock.calls.length).toBe(before);
    expect(screen.queryByTestId('tab-sales')).toBeNull();

    await open(ref);
    expect(mockMounts.sales).toBe(2);
  });
});

describe('VendorPending API calls', () => {
  test('one vendor and one customer lookup per open; the purchase list mounts once', async () => {
    const ref = createRef();
    render(<VendorPending ref={ref} />);
    const vendor = { id: 'v1', code: 'V-001', name: 'Acme & Sons #1', vat_no: '300000000000003' };
    await act(async () => { ref.current.open(false, vendor); });
    expect(global.fetch.mock.calls.map(([u]) => u.split('?')[0])).toEqual([
      '/v1/vendor/v1',
      '/v1/customer/vat_no/name',
    ]);
    const url = global.fetch.mock.calls[1][0];
    expect(new URL('http://x' + url).searchParams.get('name')).toBe('Acme & Sons #1');

    await answer('/v1/vendor/v1', vendor);
    await answer('/v1/customer/vat_no/name', { id: 'c1', name: vendor.name });
    expect(mockMounts.purchase).toBe(1);
    expect(mockMounts.sales).toBeUndefined();
    expect(screen.getByRole('tab', { name: /^Sales\s*[\d.-]/ })).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
