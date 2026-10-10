/**
 * Render tests for the purchase_return printable preview (previewContent.js).
 */
import PurchaseReturnPreviewContent from '../previewContent';
import { describeVatInvoicePreview, renderDoc, makeDoc, makeStore } from '../../testHelpers/invoiceFixtures';

jest.mock('qrcode.react', () => require('../../testHelpers/invoiceFixtures').qrcodeStub());

describe('PurchaseReturnPreviewContent', () => {
    describeVatInvoicePreview({
        Component: PurchaseReturnPreviewContent, party: 'vendor',
        partyLabel: 'Vendor Name | اسم العميل:', showsQr: true,
    });

    test('shows the original purchase number', () => {
        const { text } = renderDoc(PurchaseReturnPreviewContent, makeDoc({ purchase_code: 'P-0077', purchase: { date: '2026-02-01T00:00:00Z' } }));
        expect(text).toContain('P-0077');
    });

    test('phase 2 standard credit note title', () => {
        const { text } = renderDoc(PurchaseReturnPreviewContent, makeDoc({ store: makeStore({ zatca: { phase: '2' } }) }));
        expect(text).toContain('STANDARD CREDIT NOTE TAX INVOICE');
    });
});
