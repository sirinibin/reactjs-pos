/**
 * Functional tests for the Quotation Sales Return Payment create/edit modal.
 * Real component + real react-bootstrap; only fetch, the date picker and the
 * enter-key hook are mocked. Shared cases live in testHelpers/paymentFormHarness.
 */
import QuotationSalesReturnPaymentCreate from '../create';
import {
    describePaymentForm, renderPaymentForm, setAmount, setMethod, clickSubmit,
    callsTo, bodyOf, jsonResponse,
} from '../../testHelpers/paymentFormHarness';
import { screen } from '@testing-library/react';

jest.mock('react-datepicker', () => require('../../testHelpers/paymentFormHarness').DatePickerStub);
jest.mock('../../utils/useEnterKeyNavigation.js', () => ({ useEnterKeyNavigation: jest.fn() }));

const QSR = {
    id: 'qsr-1', code: 'QSR-0001', quotation_id: 'q-1', quotation_code: 'Q-0001', store_id: 'store-1', net_total: 300,
};
const EP = '/v1/quotation-sales-return-payment';

describe('QuotationSalesReturnPaymentCreate', () => {
    describePaymentForm({
        Component: QuotationSalesReturnPaymentCreate,
        endpoint: EP,
        parent: QSR,
        expectedParentFields: {
            quotation_sales_return_id: 'qsr-1', quotation_sales_return_code: 'QSR-0001',
            quotation_id: 'q-1', quotation_code: 'Q-0001', store_id: 'store-1',
        },
        refreshParentProp: 'refreshQuotationSalesReturnList',
        methodValues: ['cash', 'debit_card', 'credit_card', 'bank_card', 'bank_transfer', 'bank_cheque', 'customer_account'],
        labels: {
            create: 'Create', update: 'Update',
            invalidAmount: 'Invalid amount',
            zeroOnChange: 'Amount should be > 0',
            zeroOnSubmit: 'Amount should be > 0:',
            emptyOnSubmit: 'Amount should be > 0:',
            invalidMethod: 'Invalid Payment Method',
            created: 'Payment created successfully!',
            updated: 'Payment updated successfully!',
            failed: 'Failed to process payment!',
        },
        footerSpinnerBug: false,
    });

    describe('quotation-sales-return-specific', () => {
        beforeEach(() => {
            localStorage.setItem('access_token', 'tok-123');
            localStorage.setItem('store_id', 'store-1');
            global.fetch = jest.fn().mockResolvedValue(jsonResponse({ result: { id: 'p1' } }));
            jest.spyOn(console, 'log').mockImplementation(() => {});
            jest.spyOn(console, 'error').mockImplementation(() => {});
        });
        afterEach(() => jest.restoreAllMocks());

        test('title shows the quotation sales return code', async () => {
            await renderPaymentForm(QuotationSalesReturnPaymentCreate, { id: '', parent: QSR });
            expect(screen.getByText('Add Payment of quotation sales return #' + 'QSR-0001')).toBeInTheDocument();
        });

        test('amount above net total is left to the server (no client cap)', async () => {
            await renderPaymentForm(QuotationSalesReturnPaymentCreate, { id: '', parent: QSR });
            setAmount('301');
            setMethod('cash');
            await clickSubmit('Create');
            expect(callsTo(EP)).toHaveLength(1);
        });
    });
});
