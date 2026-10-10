/**
 * Functional tests for the Sales Payment create/edit modal.
 * Real component + real react-bootstrap; only fetch, the date picker and the
 * enter-key hook are mocked. Shared cases live in testHelpers/paymentFormHarness.
 */
import SalesPaymentCreate from '../create';
import {
    describePaymentForm, renderPaymentForm, setAmount, setMethod, clickSubmit,
    callsTo, bodyOf, jsonResponse,
} from '../../testHelpers/paymentFormHarness';
import { screen } from '@testing-library/react';

jest.mock('react-datepicker', () => require('../../testHelpers/paymentFormHarness').DatePickerStub);
jest.mock('../../utils/useEnterKeyNavigation.js', () => ({ useEnterKeyNavigation: jest.fn() }));

const ORDER = { id: 'ord-1', code: 'S-0001', store_id: 'store-1', net_total: 115 };

describe('SalesPaymentCreate', () => {
    describePaymentForm({
        Component: SalesPaymentCreate,
        endpoint: '/v1/sales-payment',
        parent: ORDER,
        expectedParentFields: { order_id: 'ord-1', order_code: 'S-0001', store_id: 'store-1' },
        refreshParentProp: 'refreshSalesList',
        methodValues: ['cash', 'debit_card', 'credit_card', 'bank_card', 'bank_transfer', 'bank_cheque', 'customer_account'],
        labels: {
            create: 'create', update: 'update',
            invalidAmount: 'invalid_amount',
            zeroOnChange: 'amount_greater_than_zero',
            zeroOnSubmit: 'amount_greater_than_zero',
            emptyOnSubmit: 'amount_greater_than_zero',
            invalidMethod: 'invalid_payment_method',
            created: 'payment_created_successfully',
            updated: 'payment_updated_successfully',
            failed: 'failed_to_process_payment',
        },
        footerSpinnerBug: true,
    });

    describe('sales-specific', () => {
        beforeEach(() => {
            localStorage.setItem('access_token', 'tok-123');
            localStorage.setItem('store_id', 'store-1');
            global.fetch = jest.fn().mockResolvedValue(jsonResponse({ result: { id: 'p1' } }));
            jest.spyOn(console, 'log').mockImplementation(() => {});
            jest.spyOn(console, 'error').mockImplementation(() => {});
        });
        afterEach(() => jest.restoreAllMocks());

        test('title shows the sales order code', async () => {
            await renderPaymentForm(SalesPaymentCreate, { id: '', parent: ORDER });
            expect(screen.getByText('add_payment_for_sales_order' + 'S-0001')).toBeInTheDocument();
        });

        test('amount above net total is NOT blocked client side (server enforces Net Total - Cash Discount)', async () => {
            await renderPaymentForm(SalesPaymentCreate, { id: '', parent: ORDER });
            setAmount('1000');
            setMethod('cash');
            await clickSubmit('create');
            expect(callsTo('/v1/sales-payment')).toHaveLength(1);
            expect(bodyOf(callsTo('/v1/sales-payment')[0]).amount).toBe(1000);
        });

        test('untouched amount is sent to the server (no client-side "required" check)', async () => {
            await renderPaymentForm(SalesPaymentCreate, { id: '', parent: ORDER });
            setMethod('cash');
            await clickSubmit('create');
            const calls = callsTo('/v1/sales-payment');
            expect(calls).toHaveLength(1);
            expect(bodyOf(calls[0]).amount).toBeUndefined();
        });

        test('server "customer account balance" error (payment_method key) is displayed', async () => {
            global.fetch = jest.fn().mockResolvedValue(jsonResponse(
                { errors: { payment_method: 'customer account balance is zero' } }, { ok: false, status: 400 }
            ));
            await renderPaymentForm(SalesPaymentCreate, { id: '', parent: ORDER });
            setAmount('50');
            setMethod('customer_account');
            await clickSubmit('create');
            expect(screen.getByText('customer account balance is zero')).toBeInTheDocument();
        });

        test('2-decimal amount is sent as a number without rounding artefacts', async () => {
            await renderPaymentForm(SalesPaymentCreate, { id: '', parent: ORDER });
            setAmount('0.1');
            setMethod('cash');
            await clickSubmit('create');
            expect(bodyOf(callsTo('/v1/sales-payment')[0]).amount).toBe(0.1);
        });
    });
});
