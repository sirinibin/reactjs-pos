/**
 * Functional tests for the Purchase Return Payment create/edit modal.
 * Real component + real react-bootstrap; only fetch, the date picker and the
 * enter-key hook are mocked. Shared cases live in testHelpers/paymentFormHarness.
 */
import PurchaseReturnPaymentCreate from '../create';
import {
    describePaymentForm, renderPaymentForm, setAmount, setMethod, clickSubmit,
    callsTo, bodyOf, jsonResponse,
} from '../../testHelpers/paymentFormHarness';
import { screen } from '@testing-library/react';

jest.mock('react-datepicker', () => require('../../testHelpers/paymentFormHarness').DatePickerStub);
jest.mock('../../utils/useEnterKeyNavigation.js', () => ({ useEnterKeyNavigation: jest.fn() }));

const PURCHASE_RETURN = {
    id: 'pr-1', code: 'PR-0001', purchase_id: 'pur-1', purchase_code: 'P-0001', store_id: 'store-1', net_total: 1000,
};
const EP = '/v1/purchase-return-payment';

describe('PurchaseReturnPaymentCreate', () => {
    describePaymentForm({
        Component: PurchaseReturnPaymentCreate,
        endpoint: EP,
        parent: PURCHASE_RETURN,
        expectedParentFields: {
            purchase_return_id: 'pr-1', purchase_return_code: 'PR-0001',
            purchase_id: 'pur-1', purchase_code: 'P-0001', store_id: 'store-1',
        },
        refreshParentProp: 'refreshPurchaseReturnList',
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

    describe('purchase-return-specific', () => {
        beforeEach(() => {
            localStorage.setItem('access_token', 'tok-123');
            localStorage.setItem('store_id', 'store-1');
            global.fetch = jest.fn().mockResolvedValue(jsonResponse({ result: { id: 'p1' } }));
            jest.spyOn(console, 'log').mockImplementation(() => {});
            jest.spyOn(console, 'error').mockImplementation(() => {});
        });
        afterEach(() => jest.restoreAllMocks());

        test('title shows the purchase return code', async () => {
            await renderPaymentForm(PurchaseReturnPaymentCreate, { id: '', parent: PURCHASE_RETURN });
            expect(screen.getByText('add_payment_of_purchase_return' + 'PR-0001')).toBeInTheDocument();
        });

        test('untouched amount is blocked client side with "amount_is_required"', async () => {
            await renderPaymentForm(PurchaseReturnPaymentCreate, { id: '', parent: PURCHASE_RETURN });
            setMethod('cash');
            await clickSubmit('create');
            expect(callsTo(EP)).toHaveLength(0);
            expect(screen.getByText('amount_is_required')).toBeInTheDocument();
        });

        test('amount above net total shows a warning on change, but submit is NOT blocked (server enforces)', async () => {
            // Unlike purchase_payment, handleCreate has no net_total check here.
            await renderPaymentForm(PurchaseReturnPaymentCreate, { id: '', parent: PURCHASE_RETURN });
            setAmount('1500');
            expect(screen.getByText('amount_should_be_less_than_net_total1000')).toBeInTheDocument();
            setMethod('cash');
            await clickSubmit('create');
            expect(callsTo(EP)).toHaveLength(1);
            expect(bodyOf(callsTo(EP)[0]).amount).toBe(1500);
        });
    });
});
