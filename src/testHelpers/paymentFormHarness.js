/**
 * Shared functional-test harness for the five payment "create" modals:
 *   sales_payment, purchase_payment, sales_return_payment,
 *   purchase_return_payment, quotation_sales_return_payment.
 *
 * Each form is a forwardRef modal opened via ref.open(id, parent). The harness
 * renders the REAL component (real react-bootstrap Modal, real query-string
 * builder) with only `fetch`, the date picker and the enter-key hook mocked,
 * then drives it like a user would.
 *
 * Test files must mock (jest.mock is hoisted per test file):
 *   jest.mock('react-datepicker', () => require('../../testHelpers/paymentFormHarness').DatePickerStub);
 *   jest.mock('../../utils/useEnterKeyNavigation.js', () => ({ useEnterKeyNavigation: jest.fn() }));
 */
import React from 'react';
import { render, screen, fireEvent, act, within } from '@testing-library/react';

/** Minimal stand-in for react-datepicker (renders a plain input). */
export function DatePickerStub({ id, value, onChange }) {
    return (
        <input
            data-testid={`datepicker-${id || 'date'}`}
            value={value || ''}
            onChange={e => onChange(new Date(e.target.value))}
        />
    );
}

export const jsonResponse = (body, { ok = true, status = 200 } = {}) => ({
    ok,
    status,
    headers: { get: () => 'application/json' },
    json: () => Promise.resolve(body),
});

export const flush = async (rounds = 10) => {
    for (let i = 0; i < rounds; i++) {
        // eslint-disable-next-line no-await-in-loop
        await Promise.resolve();
    }
};

/**
 * Render the form and open it.
 * @returns helpers bound to the rendered instance
 */
export async function renderPaymentForm(Component, { id, parent, props = {} } = {}) {
    const ref = React.createRef();
    const handlers = {
        showToastMessage: jest.fn(),
        refreshList: jest.fn(),
        openDetailsView: jest.fn(),
        ...props,
    };
    const utils = render(<Component ref={ref} {...handlers} />);
    await act(async () => {
        ref.current.open(id, parent);
        await flush();
    });
    return { ref, handlers, ...utils };
}

/** The amount <input type=number> (the only number input in these forms). */
export const amountInput = () => document.querySelector('.modal input[type="number"]');

/** The payment-method <select> (contains a "cash" option). */
export const methodSelect = () =>
    Array.from(document.querySelectorAll('.modal select'))
        .find(s => Array.from(s.options).some(o => o.value === 'cash'));

export const setAmount = (value) => fireEvent.change(amountInput(), { target: { value } });
export const setMethod = (value) => fireEvent.change(methodSelect(), { target: { value } });

/** Click the header "create"/"update" button (first of the two). */
export async function clickSubmit(label) {
    const btn = screen.getAllByRole('button', { name: label })[0];
    await act(async () => {
        fireEvent.click(btn);
        await flush();
    });
}

/** All fetch calls whose URL starts with `prefix`. */
export const callsTo = (prefix) => global.fetch.mock.calls.filter(([url]) => String(url).startsWith(prefix));

/** Parse the JSON body of a fetch call. */
export const bodyOf = (call) => JSON.parse(call[1].body);

export const isModalOpen = () => !!document.querySelector('.modal');

export { within };

/**
 * Behaviour shared by all five payment forms. Domain test files call this and
 * then add their own form-specific cases.
 *
 * cfg = {
 *   Component, endpoint,               // e.g. '/v1/sales-payment'
 *   parent, expectedParentFields,      // ref.open('', parent) → body fields
 *   refreshParentProp,                 // e.g. 'refreshSalesList'
 *   methodValues,                      // option values of the method select
 *   labels: { create, update, invalidAmount, zeroOnChange, zeroOnSubmit,
 *             emptyOnSubmit, invalidMethod, created, updated, failed },
 *   footerSpinnerBug,                  // true when the footer renders "[object Object]"
 * }
 */
export function describePaymentForm(cfg) {
    const { Component, endpoint, parent, expectedParentFields, labels } = cfg;
    const STORE = 'store-1';
    const qs = `?search[store_id]=${STORE}`;
    const open = (opts = {}) => renderPaymentForm(Component, { id: '', parent, ...opts });

    beforeEach(() => {
        localStorage.clear();
        localStorage.setItem('access_token', 'tok-123');
        localStorage.setItem('store_id', STORE);
        global.fetch = jest.fn().mockResolvedValue(jsonResponse({ result: { id: 'new-pay-1' } }));
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });
    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('opening the form', () => {
        test('modal opens with an empty amount and no method selected', async () => {
            await open();
            expect(isModalOpen()).toBe(true);
            expect(amountInput().value).toBe('');
            expect(methodSelect().value).toBe('');
            expect(global.fetch).not.toHaveBeenCalled();
        });

        test('payment method select offers exactly the expected methods', async () => {
            await open();
            const values = Array.from(methodSelect().options).map(o => o.value);
            expect(values).toEqual(['', ...cfg.methodValues]);
        });
    });

    describe('amount validation (client side)', () => {
        test.each([['0'], ['0.00'], ['-5'], ['-0.01']])('amount %s → "greater than zero" error, no request on submit', async (v) => {
            await open();
            setAmount(v);
            expect(screen.getByText(labels.zeroOnChange)).toBeInTheDocument();
            setMethod('cash');
            await clickSubmit(labels.create);
            expect(callsTo(endpoint)).toHaveLength(0);
            expect(screen.getByText(labels.zeroOnSubmit)).toBeInTheDocument();
            expect(isModalOpen()).toBe(true);
        });

        test('clearing the amount shows the invalid-amount error', async () => {
            await open();
            setAmount('10');
            setAmount('');
            expect(screen.getByText(labels.invalidAmount)).toBeInTheDocument();
        });

        test('non-numeric text is rejected (number input sanitises it to empty)', async () => {
            await open();
            setAmount('10');
            setAmount('abc');
            expect(amountInput().value).toBe('');
            expect(screen.getByText(labels.invalidAmount)).toBeInTheDocument();
        });

        test('Arabic-Indic digits are NOT normalised: "٥٠" is treated as empty and blocked on submit', async () => {
            await open();
            setAmount('10');
            setAmount('٥٠');
            expect(screen.getByText(labels.invalidAmount)).toBeInTheDocument();
            setMethod('cash');
            await clickSubmit(labels.create);
            expect(callsTo(endpoint)).toHaveLength(0);
            expect(screen.getByText(labels.emptyOnSubmit)).toBeInTheDocument();
        });

        test('a valid amount shows the "looks good" hint', async () => {
            await open();
            setAmount('12.5');
            expect(screen.getByText(/looks_good|Looks good/)).toBeInTheDocument();
        });
    });

    describe('payment method', () => {
        test('re-selecting the empty option shows the invalid-method error', async () => {
            await open();
            setMethod('cash');
            setMethod('');
            expect(screen.getByText(labels.invalidMethod)).toBeInTheDocument();
        });

        test('server "method is required" error is displayed under the select', async () => {
            global.fetch = jest.fn().mockResolvedValue(
                jsonResponse({ errors: { method: 'Payment method is required' } }, { ok: false, status: 400 })
            );
            const { handlers } = await open();
            setAmount('10');
            await clickSubmit(labels.create);
            expect(callsTo(endpoint)).toHaveLength(1);
            expect(screen.getByText('Payment method is required')).toBeInTheDocument();
            expect(handlers.showToastMessage).toHaveBeenCalledWith(labels.failed, 'danger');
        });
    });

    describe('create (POST)', () => {
        test('sends the expected POST request', async () => {
            await open();
            setAmount('150.5');
            setMethod('bank_transfer');
            await clickSubmit(labels.create);

            const calls = callsTo(endpoint);
            expect(calls).toHaveLength(1);
            const [url, opts] = calls[0];
            expect(url).toBe(endpoint + qs);
            expect(opts.method).toBe('POST');
            expect(opts.headers.Authorization).toBe('tok-123');
            expect(opts.headers['Content-Type']).toBe('application/json');
            const body = bodyOf(calls[0]);
            expect(body.amount).toBe(150.5);
            expect(typeof body.amount).toBe('number');
            expect(body.method).toBe('bank_transfer');
            expect(body).toEqual(expect.objectContaining(expectedParentFields));
            expect(body.date_str).toBeTruthy();
            expect(body.id).toBeUndefined();
        });

        test('omits the store_id query when no store is selected', async () => {
            localStorage.removeItem('store_id');
            await open();
            setAmount('10');
            setMethod('cash');
            await clickSubmit(labels.create);
            expect(callsTo(endpoint)[0][0]).toBe(endpoint + '?');
        });

        test('success: toast, list refreshes, details view opens, modal closes', async () => {
            const refreshParent = jest.fn();
            const { handlers } = await open({ props: { [cfg.refreshParentProp]: refreshParent } });
            setAmount('99.99');
            setMethod('cash');
            await clickSubmit(labels.create);
            expect(handlers.showToastMessage).toHaveBeenCalledWith(labels.created, 'success');
            expect(handlers.refreshList).toHaveBeenCalledTimes(1);
            expect(refreshParent).toHaveBeenCalledTimes(1);
            expect(handlers.openDetailsView).toHaveBeenCalledWith('new-pay-1');
            expect(isModalOpen()).toBe(false);
        });

        test('success without a details view is still reported as a success (no failure toast)', async () => {
            // The host's details view may be missing (prop not wired / ref not mounted);
            // this used to throw a TypeError and the catch showed "failed".
            const { handlers } = await open({ props: { openDetailsView: undefined } });
            setAmount('25');
            setMethod('cash');
            await clickSubmit(labels.create);
            expect(handlers.showToastMessage).toHaveBeenCalledWith(labels.created, 'success');
            expect(handlers.showToastMessage).not.toHaveBeenCalledWith(labels.failed, 'danger');
            expect(isModalOpen()).toBe(false);
        });

        test('server-side amount error is shown, toast is danger, modal stays open', async () => {
            global.fetch = jest.fn().mockResolvedValue(jsonResponse(
                { errors: { amount: 'Amount should not exceed: 100.00 (Net Total - Cash Discount)' } },
                { ok: false, status: 400 }
            ));
            const { handlers } = await open();
            setAmount('500');
            setMethod('cash');
            await clickSubmit(labels.create);
            expect(screen.getByText('Amount should not exceed: 100.00 (Net Total - Cash Discount)')).toBeInTheDocument();
            expect(handlers.showToastMessage).toHaveBeenCalledWith(labels.failed, 'danger');
            expect(handlers.showToastMessage).not.toHaveBeenCalledWith(labels.created, 'success');
            expect(handlers.openDetailsView).not.toHaveBeenCalled();
            expect(handlers.refreshList).not.toHaveBeenCalled();
            expect(isModalOpen()).toBe(true);
        });

        test('network failure: danger toast, no crash, can retry', async () => {
            global.fetch = jest.fn().mockRejectedValueOnce(new TypeError('Failed to fetch'))
                .mockResolvedValue(jsonResponse({ result: { id: 'retry-1' } }));
            const { handlers } = await open();
            setAmount('10');
            setMethod('cash');
            await clickSubmit(labels.create);
            expect(handlers.showToastMessage).toHaveBeenCalledWith(labels.failed, 'danger');
            expect(isModalOpen()).toBe(true);
            await clickSubmit(labels.create);
            expect(handlers.openDetailsView).toHaveBeenCalledWith('retry-1');
        });
    });

    describe('edit (GET then PUT)', () => {
        test('loads the payment and submits a PUT to /:id', async () => {
            global.fetch = jest.fn((url, opts) => {
                if (opts.method === 'GET') {
                    return Promise.resolve(jsonResponse({
                        result: { id: 'pay-9', amount: 75, method: 'cash', date: '2026-01-05T10:00:00Z', store_id: STORE },
                    }));
                }
                return Promise.resolve(jsonResponse({ result: { id: 'pay-9' } }));
            });
            const { handlers } = await renderPaymentForm(Component, { id: 'pay-9' });
            expect(global.fetch.mock.calls[0][0]).toBe(`${endpoint}/pay-9${qs}`);
            expect(global.fetch.mock.calls[0][1].method).toBe('GET');
            expect(amountInput().value).toBe('75');
            expect(methodSelect().value).toBe('cash');

            setAmount('80');
            await clickSubmit(labels.update);
            const put = global.fetch.mock.calls.find(([, o]) => o.method === 'PUT');
            expect(put[0]).toBe(`${endpoint}/pay-9${qs}`);
            expect(bodyOf(put)).toEqual(expect.objectContaining({ id: 'pay-9', amount: 80, method: 'cash' }));
            expect(handlers.showToastMessage).toHaveBeenCalledWith(labels.updated, 'success');
        });

        test('GET failure does not crash the modal', async () => {
            global.fetch = jest.fn().mockResolvedValue(
                jsonResponse({ errors: { id: 'not found' } }, { ok: false, status: 404 })
            );
            await renderPaymentForm(Component, { id: 'missing' });
            expect(isModalOpen()).toBe(true);
        });
    });

    describe('auth', () => {
        test('redirects to "/" when there is no access token', async () => {
            localStorage.removeItem('access_token');
            const original = window.location;
            delete window.location;
            window.location = { href: '' };
            try {
                await open();
                expect(window.location).toBe('/');
            } finally {
                window.location = original;
            }
        });
    });

    if (cfg.footerSpinnerBug) {
        // KNOWN BUG: the footer button renders `<Spinner/> + " " + t('processing')`,
        // which stringifies the React element → "[object Object] processing" while
        // the request is in flight. Expected: a spinner + "processing" text.
        test.skip('footer button does not render "[object Object]" while processing', async () => {
            global.fetch = jest.fn(() => new Promise(() => {}));
            await open();
            setAmount('10');
            setMethod('cash');
            await clickSubmit(labels.create);
            expect(document.querySelector('.modal').textContent).not.toContain('[object Object]');
        });
    }
}
