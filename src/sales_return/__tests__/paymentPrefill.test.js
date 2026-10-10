/**
 * The Sales Return form pre-fills one refund payment. It was capped at the sale's
 * total_payment_received only, while the API caps it at
 * total_payment_received - return_amount (rounded to 2 decimals). Two units at
 * 75.50 + 15% VAT are sold for 173.65; after one unit was returned (86.83), the
 * form offered 86.83 for the second unit and the API refused it: "Total payment
 * should not be greater than 86.82 (total payment received)".
 */
import { maxRefundableForReturn, capReturnPaymentPrefill } from '../paymentPrefill';

describe('sales return refund pre-fill', () => {
    const sale = { total_payment_received: 173.65, return_amount: 86.83 };

    test('is capped at what is left to refund, as the API computes it', () => {
        expect(maxRefundableForReturn(sale)).toBe(86.82);
        expect(capReturnPaymentPrefill(86.83, sale)).toBe(86.82);
    });

    test('is not changed when it is within what is left', () => {
        expect(capReturnPaymentPrefill(50, sale)).toBe(50);
        expect(capReturnPaymentPrefill(86.83, { total_payment_received: 173.65, return_amount: 0 })).toBe(86.83);
    });

    test('a sale without returns caps at what was received', () => {
        expect(capReturnPaymentPrefill(100, { total_payment_received: 86.82 })).toBe(86.82);
    });

    test('never negative, and no cap when the sale does not say what was received', () => {
        expect(capReturnPaymentPrefill(10, { total_payment_received: 50, return_amount: 60 })).toBe(0);
        expect(capReturnPaymentPrefill(10, {})).toBe(10);
        expect(capReturnPaymentPrefill(10, undefined)).toBe(10);
    });

    test('the form uses the shared cap', () => {
        const src = require('fs').readFileSync(require('path').join(__dirname, '../create.js'), 'utf8');
        expect(src).toMatch(/capReturnPaymentPrefill\(formData\.payments_input\[0\]\.amount, order\)/);
        expect(src).not.toMatch(/amount > order\?\.total_payment_received/);
    });
});
