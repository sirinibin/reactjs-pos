/**
 * Functional tests for the Purchase Payment create/edit modal.
 * Real component + real react-bootstrap; only fetch, the date picker and the
 * enter-key hook are mocked. Shared cases live in testHelpers/paymentFormHarness.
 */
import PurchasePaymentCreate from '../create';
import {
    describePaymentForm, renderPaymentForm, setAmount, setMethod, clickSubmit,
    callsTo, bodyOf, jsonResponse,
} from '../../testHelpers/paymentFormHarness';
import { screen } from '@testing-library/react';

jest.mock('react-datepicker', () => require('../../testHelpers/paymentFormHarness').DatePickerStub);
jest.mock('../../utils/useEnterKeyNavigation.js', () => ({ useEnterKeyNavigation: jest.fn() }));

const PURCHASE = { id: 'pur-1', code: 'P-0001', store_id: 'store-1', net_total: 1000 };
const EP = '/v1/purchase-payment';

describe('PurchasePaymentCreate', () => {
    describePaymentForm({
        Component: PurchasePaymentCreate,
        endpoint: EP,
        parent: PURCHASE,
        expectedParentFields: { purchase_id: 'pur-1', purchase_code: 'P-0001', store_id: 'store-1' },
        refreshParentProp: 'refreshPurchaseList',
        methodValues: ['cash', 'debit_card', 'credit_card', 'bank_card', 'bank_transfer', 'bank_cheque', 'vendor_account'],
        labels: {
            create: 'create', update: 'update',
            invalidAmount: 'invalid_amount',
            zeroOnChange: 'amount_greater_than_zero',
            zeroOnSubmit: 'amount_greater_than_zero',
            emptyOnSubmit: 'amount_is_required',
            invalidMethod: 'invalid_payment_method',
            created: 'payment_created_successfully',
            updated: 'payment_updated_successfully',
            failed: 'failed_to_process_payment',
        },
        footerSpinnerBug: true,
    });

    describe('purchase-specific', () => {
        beforeEach(() => {
            localStorage.setItem('access_token', 'tok-123');
            localStorage.setItem('store_id', 'store-1');
            global.fetch = jest.fn().mockResolvedValue(jsonResponse({ result: { id: 'p1' } }));
            jest.spyOn(console, 'log').mockImplementation(() => {});
            jest.spyOn(console, 'error').mockImplementation(() => {});
        });
        afterEach(() => jest.restoreAllMocks());

        test('title shows the purchase code', async () => {
            await renderPaymentForm(PurchasePaymentCreate, { id: '', parent: PURCHASE });
            expect(screen.getByText('add_payment_for_purchase' + 'P-0001')).toBeInTheDocument();
        });

        test('untouched amount is blocked client side with "amount_is_required"', async () => {
            await renderPaymentForm(PurchasePaymentCreate, { id: '', parent: PURCHASE });
            setMethod('cash');
            await clickSubmit('create');
            expect(callsTo(EP)).toHaveLength(0);
            expect(screen.getByText('amount_is_required')).toBeInTheDocument();
        });

        test('amount above purchase net total is blocked on change and on submit', async () => {
            await renderPaymentForm(PurchasePaymentCreate, { id: '', parent: PURCHASE });
            setAmount('1000.01');
            expect(screen.getByText('amount_should_be_less_than_net_total1000')).toBeInTheDocument();
            setMethod('cash');
            await clickSubmit('create');
            expect(callsTo(EP)).toHaveLength(0);
        });

        test('amount exactly equal to the net total is allowed', async () => {
            await renderPaymentForm(PurchasePaymentCreate, { id: '', parent: PURCHASE });
            setAmount('1000');
            setMethod('vendor_account');
            await clickSubmit('create');
            expect(callsTo(EP)).toHaveLength(1);
            expect(bodyOf(callsTo(EP)[0])).toEqual(expect.objectContaining({ amount: 1000, method: 'vendor_account' }));
        });
    });
});
