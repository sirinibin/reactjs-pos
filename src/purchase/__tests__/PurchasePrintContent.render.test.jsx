/**
 * Render tests for purchase/printContent.js (pre-printed stationery layout).
 */
import PurchasePrintContent from '../printContent';
import { describePrintContent, renderDoc, makeDoc } from '../../testHelpers/invoiceFixtures';

describe('PurchasePrintContent', () => {
    describePrintContent({ Component: PurchasePrintContent, title: 'PURCHASE TAX INVOICE / فاتورة ضريبة الشراء', party: 'vendor', priced: true, currencySuffix: '' });

    test('shipping / handling fee is printed when > 0', () => {
        const { text } = renderDoc(PurchasePrintContent, makeDoc({ shipping_handling_fees: 12.5 }));
        expect(text).toContain('12.50');
    });
});
