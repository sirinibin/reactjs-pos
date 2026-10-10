/**
 * Render tests for the purchase printable preview (previewContent.js).
 */
import PurchasePreviewContent from '../previewContent';
import { describeVatInvoicePreview, renderDoc, makeDoc, makeStore } from '../../testHelpers/invoiceFixtures';

jest.mock('qrcode.react', () => require('../../testHelpers/invoiceFixtures').qrcodeStub());

describe('PurchasePreviewContent', () => {
    describeVatInvoicePreview({
        Component: PurchasePreviewContent, party: 'vendor',
        partyLabel: 'Vendor Name | اسم العميل:', showsQr: false,
    });

    test.each([
        ['1', 'paid', {}, 'PURCHASE TAX INVOICE | الفاتورة الضريبية'],
        ['1', 'not_paid', {}, 'CREDIT PURCHASE TAX INVOICE | فاتورة ضريبة الائتمان'],
        ['2', 'paid', { is_simplified: false }, 'STANDARD PURCHASE TAX INVOICE | فاتورة ضريبية قياسية'],
        ['2', 'paid', { is_simplified: true, reporting_passed: true }, 'SIMPLIFIED PURCHASE TAX INVOICE | فاتورة ضريبية مبسطة'],
    ])('phase %s, payment %s, zatca %j → "%s"', (phase, payment_status, zatca, title) => {
        const { text } = renderDoc(PurchasePreviewContent, makeDoc({ store: makeStore({ zatca: { phase } }), payment_status, zatca }));
        expect(text).toContain(title);
    });
});
