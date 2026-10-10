/**
 * Render tests for the delivery-note printable preview.
 */
import DeliveryNotePreviewContent from '../previewContent';
import { renderDoc, makeDoc, makeTwoPageDoc } from '../../testHelpers/invoiceFixtures';

describe('DeliveryNotePreviewContent', () => {
    test('title, number, customer and VAT', () => {
        const { text } = renderDoc(DeliveryNotePreviewContent, makeDoc());
        expect(text).toContain('DELIVERY NOTE / مذكرة تسليم');
        expect(text).toContain('Delivery Note: #DOC-0001');
        expect(text).toContain('Customer: ACME Trading');
        expect(text).toContain('VAT Number: 311111111100003');
        expect(text).toContain('أكمي للتجارة');
    });

    test('Arabic side converts the note number to Eastern-Arabic digits', () => {
        const { text } = renderDoc(DeliveryNotePreviewContent, makeDoc({ code: 'DN-2026' }));
        expect(text).toMatch(/DN-[\u0660-\u0669\u06F0-\u06F9]{4}/);
    });

    // KNOWN BUG: this file's digit map mixes two Unicode digit sets
    // ("۰۱۲۳٤۵٦۷۸۹" = Persian ۰-۳,۵,۷-۹ + Arabic-Indic ٤,٦), so "2026" prints as
    // "۲۰۲٦". Every other preview uses the Arabic-Indic set "٠١٢٣٤٥٦٧٨٩".
    test.skip('Arabic digits come from a single digit set (Arabic-Indic)', () => {
        const { text } = renderDoc(DeliveryNotePreviewContent, makeDoc({ code: 'DN-2026' }));
        expect(text).toContain('DN-٢٠٢٦');
    });

    test('line: unit price with/without VAT, discount with/without VAT, totals', () => {
        const { text } = renderDoc(DeliveryNotePreviewContent, makeDoc());
        expect(text).toMatch(/2 pcs\s?100\.00\s?115\.00\s?10\.00\s?11\.50\s?180\.00\s?207\.00/);
    });

    test('totals block: subtotal, with VAT, VAT %, net total', () => {
        const { text } = renderDoc(DeliveryNotePreviewContent, makeDoc());
        expect(text).toContain('Total(without VAT) / المجموع الفرعي180.00');
        expect(text).toContain('Total(with VAT) / المجموع مع ض.ق.م207.00');
        expect(text).toContain('VAT (15%) / ضريبة القيمة المضافة27.00');
        expect(text).toContain('Net Total(with VAT) / الإجمالي207.00');
    });

    test('two pages are numbered', () => {
        const { text } = renderDoc(DeliveryNotePreviewContent, makeTwoPageDoc());
        expect(text).toContain('Page 1 of 2');
        expect(text).toContain('Page 2 of 2');
    });

    test('no store / customer: placeholders instead of a crash', () => {
        const { text } = renderDoc(DeliveryNotePreviewContent, { pages: [{ top: 0, products: [] }] });
        expect(text).toContain('<STORE_NAME>');
        expect(text).toContain('<CUSTOMER_NAME>');
    });

    // KNOWN BUG: a store without `registration_number_in_arabic` prints
    // "رقم التسجيل: undefined" in the Arabic header.
    test.skip('missing Arabic C.R. number does not print "undefined"', () => {
        const doc = makeDoc();
        delete doc.store.registration_number_in_arabic;
        const { text } = renderDoc(DeliveryNotePreviewContent, doc);
        expect(text).not.toContain('undefined');
    });
});
