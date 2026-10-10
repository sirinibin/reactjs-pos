/**
 * Functional tests for the Sales Return Payment create/edit modal.
 * Real component + real react-bootstrap; only fetch, the date picker and the
 * enter-key hook are mocked. Shared cases live in testHelpers/paymentFormHarness.
 */
import SalesReturnPaymentCreate from '../create';
import {
    describePaymentForm, renderPaymentForm, setAmount, setMethod, clickSubmit,
    callsTo, bodyOf, jsonResponse,
} from '../../testHelpers/paymentFormHarness';
import { screen } from '@testing-library/react';

jest.mock('react-datepicker', () => require('../../testHelpers/paymentFormHarness').DatePickerStub);
jest.mock('../../utils/useEnterKeyNavigation.js', () => ({ useEnterKeyNavigation: jest.fn() }));

const SALES_RETURN = { id: 'sr-1', code: 'SR-0001', order_id: 'ord-1', order_code: 'S-0001', store_id: 'store-1', net_total: 200 };
const EP = '/v1/sales-return-payment';

describe('SalesReturnPaymentCreate', () => {
    describePaymentForm({
        Component: SalesReturnPaymentCreate,
        endpoint: EP,
        parent: SALES_RETURN,
        expectedParentFields: {
            sales_return_id: 'sr-1', sales_return_code: 'SR-0001',
            order_id: 'ord-1', order_code: 'S-0001', store_id: 'store-1',
        },
        refreshParentProp: 'refreshSalesReturnList',
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

    describe('sales-return-specific', () => {
        beforeEach(() => {
            localStorage.setItem('access_token', 'tok-123');
            localStorage.setItem('store_id', 'store-1');
            global.fetch = jest.fn().mockResolvedValue(jsonResponse({ result: { id: 'p1' } }));
            jest.spyOn(console, 'log').mockImplementation(() => {});
            jest.spyOn(console, 'error').mockImplementation(() => {});
        });
        afterEach(() => jest.restoreAllMocks());

        test('title shows the sales return code', async () => {
            await renderPaymentForm(SalesReturnPaymentCreate, { id: '', parent: SALES_RETURN });
            expect(screen.getByText('add_payment_of_sales_return' + 'SR-0001')).toBeInTheDocument();
        });

        test('refund above the return net total is left to the server (no client cap)', async () => {
            await renderPaymentForm(SalesReturnPaymentCreate, { id: '', parent: SALES_RETURN });
            setAmount('250');
            setMethod('cash');
            await clickSubmit('create');
            expect(callsTo(EP)).toHaveLength(1);
            expect(bodyOf(callsTo(EP)[0]).amount).toBe(250);
        });
    });
});
