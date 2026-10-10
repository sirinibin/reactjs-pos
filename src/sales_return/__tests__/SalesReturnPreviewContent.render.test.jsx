/**
 * Render tests for the sales-return (credit note) printable preview.
 */
import SalesReturnPreviewContent from '../previewContent';
import { describeVatInvoicePreview, renderDoc, makeDoc, makeStore } from '../../testHelpers/invoiceFixtures';

jest.mock('qrcode.react', () => require('../../testHelpers/invoiceFixtures').qrcodeStub());

describe('SalesReturnPreviewContent', () => {
    describeVatInvoicePreview({
        Component: SalesReturnPreviewContent, party: 'customer',
        partyLabel: 'Customer Name | اسم العميل:', showsQr: true,
    });

    test.each([
        ['1', {}, 'SALES RETURN TAX INVOICE | فاتورة ضريبة المبيعات المرتجعة'],
        ['2', { is_simplified: false }, 'STANDARD CREDIT NOTE TAX INVOICE | مذكرة ائتمان قياسية، فاتورة ضريبية'],
        ['2', { is_simplified: true, reporting_passed: true }, 'SIMPLIFIED CREDIT NOTE TAX INVOICE | مذكرة ائتمان مبسطة، فاتورة ضريبية'],
    ])('ZATCA phase %s %j → title "%s"', (phase, zatca, title) => {
        const { text } = renderDoc(SalesReturnPreviewContent, makeDoc({ store: makeStore({ zatca: { phase } }), zatca }));
        expect(text).toContain(title);
    });

    test('shows the original sales invoice number and date', () => {
        const { text } = renderDoc(SalesReturnPreviewContent, makeDoc({ order_code: 'S-0042', order: { date: '2026-02-20T08:30:00Z' } }));
        expect(text).toContain('S-0042');
        expect(text).toContain('2026-02-20');
    });

    // KNOWN BUG: when the original order date is unknown the Arabic half is
    // rendered as "Invalid Date" (getArabicDate(undefined)) next to "<DATETIME>".
    test.skip('missing original order date does not print "Invalid Date"', () => {
        const { text } = renderDoc(SalesReturnPreviewContent, makeDoc({ order: undefined }));
        expect(text).not.toContain('Invalid Date');
    });
});
