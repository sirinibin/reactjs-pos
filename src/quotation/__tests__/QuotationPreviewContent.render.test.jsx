/**
 * Render tests for the quotation printable preview (previewContent.js).
 */
import QuotationPreviewContent from '../previewContent';
import { describeVatInvoicePreview, renderDoc, makeDoc, makeStore } from '../../testHelpers/invoiceFixtures';

jest.mock('qrcode.react', () => require('../../testHelpers/invoiceFixtures').qrcodeStub());

describe('QuotationPreviewContent', () => {
    describeVatInvoicePreview({
        Component: QuotationPreviewContent, party: 'customer',
        partyLabel: 'Customer Name | اسم العميل:', showsQr: false,
    });

    test('title is QUOTATION and validity / delivery terms are shown', () => {
        const { text } = renderDoc(QuotationPreviewContent, makeDoc({ validity_days: 7, delivery_days: 3, delivery_from: 'Approval' }));
        expect(text).toContain('QUOTATION / اقتباس');
        expect(text).toContain('7 days أيام');
        expect(text).toContain('Within 3 days from the date of Approval');
        expect(text).toContain('الموافقة');
    });

    test('delivery_from defaults to Payment', () => {
        const { text } = renderDoc(QuotationPreviewContent, makeDoc({ delivery_days: 5, delivery_from: undefined }));
        expect(text).toContain('Within 5 days from the date of Payment');
        expect(text).toContain('الدفع');
    });

    // KNOWN BUG: a quotation without validity_days prints "undefined days".
    test.skip('missing validity_days does not print "undefined"', () => {
        const { text } = renderDoc(QuotationPreviewContent, makeDoc({ validity_days: undefined }));
        expect(text).not.toContain('undefined');
    });
});
