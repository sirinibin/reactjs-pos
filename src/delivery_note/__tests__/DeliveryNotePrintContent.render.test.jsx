/**
 * Render tests for delivery_note/printContent.js (pre-printed stationery layout).
 */
import DeliveryNotePrintContent from '../printContent';
import { describePrintContent, renderDoc, makeDoc } from '../../testHelpers/invoiceFixtures';

describe('DeliveryNotePrintContent', () => {
    describePrintContent({ Component: DeliveryNotePrintContent, title: 'DELIVERY NOTE / مذكرة تسليم', party: 'customer', priced: false, currencySuffix: '' });

    test('delivery note prints no prices or totals', () => {
        const { text } = renderDoc(DeliveryNotePrintContent, makeDoc());
        expect(text).not.toContain('180.00');
        expect(text).not.toContain('saudi riyals');
    });
});
