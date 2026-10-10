/**
 * Render tests for the customer-withdrawal (payable / refund) receipt preview.
 */
import CustomerWithdrawalPreviewContent from '../previewContent';
import { renderDoc, makeStore } from '../../testHelpers/invoiceFixtures';

jest.mock('qrcode.react', () => require('../../testHelpers/invoiceFixtures').qrcodeStub());
jest.mock('@emran-alhaddad/saudi-riyal-font/index.css', () => ({}));

const receipt = (o = {}) => ({
    code: 'CW-0009',
    date: '2026-03-01T09:00:00Z',
    store_id: 'store-1',
    store: makeStore(),
    customer: { name: 'ACME Trading', name_in_arabic: 'أكمي للتجارة', vat_no: '311111111100003', code: 'CUST-1' },
    amount: 1150,
    net_total: 1150,
    payment_method: 'bank_transfer',
    bank_reference_no: 'BR-777',
    description: 'Advance refund',
    total_pages: 1,
    pages: [{ top: 0 }],
    zatca: { qr_code: 'QR-CW', reporting_passed: true },
    ...o,
});

describe('CustomerWithdrawalPreviewContent', () => {
    test('title, receipt number and customer', () => {
        const { text } = renderDoc(CustomerWithdrawalPreviewContent, receipt());
        expect(text).toContain('PAYMENT RECEIPT (PAYABLE / REFUND) | إيصال الدفع (مستحق الدفع / مسترد)');
        expect(text).toContain('CW-0009');
        expect(text).toContain('ACME Trading | أكمي للتجارة');
        expect(text).toContain('311111111100003');
    });

    test('payment row: description, humanised method, bank ref and amount', () => {
        const { text } = renderDoc(CustomerWithdrawalPreviewContent, receipt());
        expect(text).toContain('Paid to ACME Trading | Advance refund');
        expect(text).toContain('Bank Transfer');
        expect(text).toContain('BR-777');
        expect(text).toContain('1,150.00');
    });

    test('net total and amount in words (Arabic + English)', () => {
        const { text } = renderDoc(CustomerWithdrawalPreviewContent, receipt());
        expect(text).toMatch(/Net Total صافي المجموع:\s?1,150\.00/);
        expect(text).toContain('one thousand one hundred and fifty saudi riyals');
        expect(text).toContain('ريال سعودي');
    });

    test('VAT split shown only when the store enables it: 1150 @15% → 1000.00 + 150.00', () => {
        const store = makeStore({ vat_percent: 15, settings: { display_vat_in_receivables_and_payables: true } });
        const { text } = renderDoc(CustomerWithdrawalPreviewContent, receipt({ store }));
        expect(text).toMatch(/Amount Excl\. VAT المبلغ بدون ضريبة:\s?1,000\.00/);
        expect(text).toMatch(/VAT \(15%\) ضريبة القيمة المضافة:\s?150\.00/);

        const { text: noSplit } = renderDoc(CustomerWithdrawalPreviewContent, receipt());
        expect(noSplit).not.toContain('Amount Excl. VAT');
    });

    test('VAT split rounds to 2 decimals and the parts add up (100 @15%)', () => {
        const store = makeStore({ vat_percent: 15, settings: { display_vat_in_receivables_and_payables: true } });
        const { text } = renderDoc(CustomerWithdrawalPreviewContent, receipt({ store, amount: 100, net_total: 100 }));
        // 100 * 15 / 115 = 13.0434… → 13.04 ; 100 - 13.04 = 86.96
        expect(text).toMatch(/Amount Excl\. VAT المبلغ بدون ضريبة:\s?86\.96/);
        expect(text).toMatch(/VAT \(15%\) ضريبة القيمة المضافة:\s?13\.04/);
    });

    test('ZATCA phase 2 + reported: QR and signed-XML link to the payables XML', () => {
        const { text, container, getAllByTestId } = renderDoc(CustomerWithdrawalPreviewContent, receipt());
        expect(getAllByTestId('qr')[0].textContent).toBe('QR:QR-CW');
        expect(text).toContain('Zatca Signed XML');
        expect(container.querySelector('a').getAttribute('href')).toBe('/zatca/store-1/payables/xml/CW-0009.xml');
    });

    test('XML link is hidden while printing and when not reported', () => {
        expect(renderDoc(CustomerWithdrawalPreviewContent, receipt({ printing: true })).text).not.toContain('Zatca Signed XML');
        expect(renderDoc(CustomerWithdrawalPreviewContent, receipt({ zatca: { reporting_passed: false } })).text).not.toContain('Zatca Signed XML');
    });

    test('minimal record (no store, customer, amount, net_total) renders placeholders without crashing', () => {
        const { text } = renderDoc(CustomerWithdrawalPreviewContent, { pages: [{ top: 0 }] });
        expect(text).toContain('<STORE_NAME>');
        expect(text).not.toContain('saudi riyals');
    });
});
