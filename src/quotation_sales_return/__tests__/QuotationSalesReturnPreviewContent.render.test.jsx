/**
 * Render tests for the quotation_sales_return printable preview (previewContent.js).
 */
import QuotationSalesReturnPreviewContent from '../previewContent';
import { describeVatInvoicePreview, renderDoc, makeDoc, makeStore } from '../../testHelpers/invoiceFixtures';

jest.mock('qrcode.react', () => require('../../testHelpers/invoiceFixtures').qrcodeStub());

describe('QuotationSalesReturnPreviewContent', () => {
    describeVatInvoicePreview({
        Component: QuotationSalesReturnPreviewContent, party: 'customer',
        partyLabel: 'Customer Name | اسم العميل:', showsQr: true,
    });

    test.each([
        ['2', { is_simplified: false }, 'STANDARD CREDIT NOTE TAX INVOICE'],
        ['2', { is_simplified: true, reporting_passed: true }, 'SIMPLIFIED CREDIT NOTE TAX INVOICE'],
    ])('ZATCA phase %s %j → title contains "%s"', (phase, zatca, title) => {
        const { text } = renderDoc(QuotationSalesReturnPreviewContent, makeDoc({ store: makeStore({ zatca: { phase } }), zatca }));
        expect(text).toContain(title);
    });
});
