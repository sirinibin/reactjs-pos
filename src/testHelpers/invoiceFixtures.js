/**
 * Realistic fixtures for the printable invoice components
 * (<domain>/previewContent.js and <domain>/printContent.js).
 *
 * Default document: 1 line, 2 × 100.00 with 10.00 unit discount (10 %),
 * VAT 15 % → total 180.00, VAT 27.00, net 207.00.
 */
import React from 'react';
import { render } from '@testing-library/react';

export const makeStore = (overrides = {}) => ({
    name: 'Gulf Union Ozone',
    name_in_arabic: 'الاتحاد الخليجي',
    title: 'Trading Est.',
    title_in_arabic: 'مؤسسة تجارية',
    vat_no: '300000000000003',
    vat_no_in_arabic: '٣٠٠٠٠٠٠٠٠٠٠٠٠٠٣',
    registration_number: '1010101010',
    registration_number_in_arabic: '١٠١٠١٠١٠١٠',
    phone: '0110000000',
    email: 'store@example.com',
    zatca: { phase: '2' },
    settings: {},
    ...overrides,
});

export const makeLine = (overrides = {}) => ({
    name: 'Steel Pipe',
    name_in_arabic: 'أنبوب فولاذي',
    item_code: 'IC-100',
    part_number: 'SP-100',
    quantity: 2,
    unit: 'pcs',
    unit_price: 100,
    purchase_unit_price: 100,
    purchasereturn_unit_price: 100,
    unit_discount: 10,
    unit_discount_percent: 10,
    unit_price_with_vat: 115,
    unit_discount_with_vat: 11.5,
    ...overrides,
});

export const makeDoc = (overrides = {}) => ({
    code: 'DOC-0001',
    date: '2026-03-01T09:00:00Z',
    store: makeStore(),
    customer: { name: 'ACME Trading', name_in_arabic: 'أكمي للتجارة', vat_no: '311111111100003' },
    vendor: { name: 'Steel Vendor LLC', name_in_arabic: 'مورد الحديد', vat_no: '322222222200003' },
    total: 180,
    total_with_vat: 207,
    discount: 0,
    discount_with_vat: 0,
    shipping_handling_fee: 0,
    shipping_handling_fees: 0,
    rounding_amount: 0,
    vat_percent: 15,
    vat_price: 27,
    net_total: 207,
    amount: 207,
    payment_method: 'cash',
    validity_days: 7,
    delivery_days: 3,
    total_pages: 1,
    pageSize: 20,
    pages: [{ top: 0, lastPage: true, products: [makeLine()] }],
    zatca: { qr_code: 'QR-PAYLOAD', reporting_passed: true, is_simplified: false },
    ...overrides,
});

/** Two pages, one line each (pageSize 1), for page-number / SI-number checks. */
export const makeTwoPageDoc = (overrides = {}) => makeDoc({
    total_pages: 2,
    pageSize: 1,
    pages: [
        { top: 0, lastPage: false, products: [makeLine({ item_code: 'IC-A', part_number: 'P-A', name: 'Item A' })] },
        { top: 1200, lastPage: true, products: [makeLine({ item_code: 'IC-B', part_number: 'P-B', name: 'Item B' })] },
    ],
    ...overrides,
});

/** Render and return whitespace-normalised text content. */
export function renderDoc(Component, model) {
    const utils = render(<Component model={model} />);
    const text = utils.container.textContent.replace(/\s+/g, ' ');
    return { ...utils, text };
}

/** qrcode.react stub — jsdom has no canvas. Use in jest.mock factories. */
export const qrcodeStub = () => {
    const R = require('react');
    const Stub = ({ value }) => R.createElement('span', { 'data-testid': 'qr' }, 'QR:' + value);
    return { QRCodeCanvas: Stub, QRCodeSVG: Stub };
};

/**
 * Shared render checks for the VAT invoice previews (sales_return,
 * quotation_sales_return, quotation, purchase, purchase_return previewContent).
 *
 * cfg = { Component, party: 'customer' | 'vendor', partyLabel, showsQr }
 */
export function describeVatInvoicePreview(cfg) {
    const { Component } = cfg;
    const doc = (o) => makeDoc(o);
    const linesDoc = (line, o = {}) => makeDoc({ pages: [{ top: 0, lastPage: true, products: [line] }], ...o });

    test('store header shows English + Arabic name, VAT and C.R. numbers', () => {
        const { text } = renderDoc(Component, doc());
        expect(text).toContain('Gulf Union Ozone');
        expect(text).toContain('الاتحاد الخليجي');
        expect(text).toContain('VAT / 300000000000003');
        expect(text).toContain('C.R. / 1010101010');
        expect(text).toContain('٣٠٠٠٠٠٠٠٠٠٠٠٠٠٣');
    });

    test(`${cfg.party} name and VAT number are shown`, () => {
        const { text } = renderDoc(Component, doc());
        const name = cfg.party === 'vendor' ? 'Steel Vendor LLC' : 'ACME Trading';
        const vat = cfg.party === 'vendor' ? '322222222200003' : '311111111100003';
        expect(text).toContain(cfg.partyLabel);
        expect(text).toContain(name);
        expect(text).toContain(vat);
    });

    test('line shows part no, bilingual name, qty+unit, unit price, discount, net, VAT and gross', () => {
        const { text } = renderDoc(Component, doc());
        expect(text).toContain('SP-100');
        expect(text).toContain('Steel Pipe/أنبوب فولاذي');
        expect(text).toContain('2 pcs');
        // 100.00 unit, (10%) 20.00 discount, 180.00 net, 27.00 VAT, 207.00 gross
        expect(text).toMatch(/100\.00\s?\(10\.00%\) 20\.00 180\.00\s?27\.00\s?207\.00/);
    });

    test('totals block: total, taxable (net - VAT), VAT and net total', () => {
        const { text } = renderDoc(Component, doc({ total: 180, discount: 5, shipping_handling_fee: 2.5, vat_price: 26.63, net_total: 204.13 }));
        expect(text).toContain('Total (without VAT) الإجمالي (بدون ضريبة القيمة المضافة):180.00');
        expect(text).toContain('رسوم الشحن / المناولة:2.50');
        expect(text).toContain('Total Discount الخصم الإجمالي:5.00');
        expect(text).toMatch(/Total Taxable Amount \(without VAT\).*?:177\.50/);
        expect(text).toMatch(/Total VAT 15\.00% إجمالي ضريبة القيمة المضافة :26\.63/);
        expect(text).toMatch(/Net Total \(with VAT\).*?:204\.13/);
    });

    test('amount in words is given in Arabic and English', () => {
        const { text } = renderDoc(Component, doc());
        expect(text).toContain('مئتان و سبعة ريال سعودي');
        expect(text).toContain('two hundred and seven saudi riyals');
    });

    test('VAT 0 %: header, line VAT and totals show 0', () => {
        const { text } = renderDoc(Component, doc({ vat_percent: 0, vat_price: 0, net_total: 180 }));
        expect(text).toContain('VAT(0.00%)');
        expect(text).toMatch(/180\.00\s?0\.00\s?180\.00/);
        expect(text).toContain('Total VAT 0.00%');
        expect(text).toContain('one hundred and eighty saudi riyals');
    });

    test('line amounts are rounded to 2 decimals (33.3333 × 3 → 100.00, VAT 15.00)', () => {
        const line = makeLine({ unit_price: 33.3333, unit_discount: 0, unit_discount_percent: 0, quantity: 3,
            purchase_unit_price: 33.3333, purchasereturn_unit_price: 33.3333 });
        const { text } = renderDoc(Component, linesDoc(line, { total: 100, vat_price: 15, net_total: 115 }));
        expect(text).toContain('33.33');
        expect(text).toMatch(/100\.00\s?15\.00\s?115\.00/);
        expect(text).not.toContain('33.3333');
        expect(text).not.toContain('99.99');
    });

    test('zero quantity line renders 0.00 amounts', () => {
        const line = makeLine({ quantity: 0, unit_discount: 0, unit_discount_percent: 0 });
        const { text } = renderDoc(Component, linesDoc(line, { total: 0, vat_price: 0, net_total: 0 }));
        expect(text).toMatch(/0\.00\s?0\.00\s?0\.00/);
        expect(text).toContain('zero saudi riyals');
    });

    test('discount larger than the price is NOT clamped (renders a negative line)', () => {
        // Documents current behaviour: the preview trusts the saved document.
        const line = makeLine({ unit_price: 100, purchase_unit_price: 100, purchasereturn_unit_price: 100,
            unit_discount: 150, unit_discount_percent: 150, quantity: 1 });
        const { text } = renderDoc(Component, linesDoc(line));
        expect(text).toContain('-50.00');
    });

    test('two pages: page X of Y in English and Arabic digits, SI numbers continue', () => {
        const { text, container } = renderDoc(Component, makeTwoPageDoc());
        expect(text).toContain('Page 1 of 2');
        expect(text).toContain('Page 2 of 2');
        expect(text).toContain('٢ الصفحة ١ من');
        expect(text).toContain('٢ الصفحة ٢ من');
        expect(container.querySelectorAll('#printableArea')).toHaveLength(2);
        expect(text).toContain('Item A');
        expect(text).toContain('Item B');
        const siCells = Array.from(container.querySelectorAll('tbody tr td:first-child')).map(td => td.textContent.trim());
        expect(siCells).toEqual(expect.arrayContaining(['1', '2']));
    });

    test('no store: placeholders instead of a crash', () => {
        const { text } = renderDoc(Component, doc({ store: undefined }));
        expect(text).toContain('<STORE_NAME>');
        expect(text).toContain('<STORE_VAT_NO>');
    });

    test(`no ${cfg.party}: renders without crashing`, () => {
        const { text } = renderDoc(Component, doc({ [cfg.party]: undefined }));
        expect(text).toContain('Net Total');
    });

    test('no pages → renders nothing', () => {
        const { container } = renderDoc(Component, doc({ pages: undefined }));
        expect(container.textContent).toBe('');
    });

    if (cfg.showsQr) {
        test('ZATCA phase 2 with a QR payload renders the QR code', () => {
            const { getAllByTestId } = renderDoc(Component, doc());
            expect(getAllByTestId('qr')[0].textContent).toBe('QR:QR-PAYLOAD');
        });

        test('ZATCA phase 1 does not render the phase-2 QR code', () => {
            const { queryAllByTestId } = renderDoc(Component, doc({ store: makeStore({ zatca: { phase: '1' } }) }));
            expect(queryAllByTestId('qr')).toHaveLength(0);
        });
    }

    // KNOWN BUG: if net_total is missing (e.g. previewing an unsaved/incomplete
    // document) n2words(undefined) throws "Invalid number: undefined" and the whole
    // preview crashes. Expected: render 0.00 / "zero" like other missing amounts.
    test.skip('missing net_total does not crash the preview', () => {
        expect(() => renderDoc(Component, doc({ net_total: undefined }))).not.toThrow();
    });
}

/**
 * Shared checks for the pre-printed-stationery layouts (<domain>/printContent.js).
 * cfg = { Component, title, party, priced (false for delivery notes), currencySuffix }
 */
export function describePrintContent(cfg) {
    const { Component } = cfg;
    const sfx = cfg.currencySuffix || '';

    test(`title "${cfg.title}", party, code and page number`, () => {
        const { text } = renderDoc(Component, makeDoc());
        expect(text).toContain(cfg.title);
        expect(text).toContain(cfg.party === 'vendor' ? 'Steel Vendor LLC' : 'ACME Trading');
        expect(text).toContain('DOC-0001');
        expect(text).toContain('Page 1 of 1');
    });

    test('line shows part number, Arabic + English name and quantity with unit', () => {
        const { text } = renderDoc(Component, makeDoc());
        expect(text).toContain('SP-100');
        expect(text).toContain('أنبوب فولاذي');
        expect(text).toContain('Steel Pipe');
        expect(text).toContain('2 pcs');
    });

    test('missing party prints N/A placeholders', () => {
        const { text } = renderDoc(Component, makeDoc({ customer: undefined, vendor: undefined }));
        expect(text).toContain('N/A');
    });

    test('two pages: SI numbers continue across pages', () => {
        const { container, text } = renderDoc(Component, makeTwoPageDoc());
        expect(text).toContain('Page 1 of 2');
        expect(text).toContain('Page 2 of 2');
        expect(container.querySelectorAll('#printableArea')).toHaveLength(2);
        const firstCells = Array.from(container.querySelectorAll('tbody tr td:first-child')).map(td => td.textContent.trim());
        expect(firstCells).toEqual(expect.arrayContaining(['1', '2']));
    });

    if (cfg.priced !== false) {
        test('unit price with discount note and line net amount', () => {
            const { text } = renderDoc(Component, makeDoc());
            expect(text).toContain(`100.00${sfx} [20.00 off]`);
            expect(text).toContain('180.00');
        });

        test('totals (total, VAT, discount, net) and amount in words on the last page', () => {
            const { text } = renderDoc(Component, makeDoc({ discount: 3, vat_price: 26.55, net_total: 203.55 }));
            expect(text).toMatch(new RegExp(`180\\.00${sfx}\\s?26\\.55${sfx}\\s?3\\.00${sfx}\\s?203\\.55${sfx}`));
            expect(text).toContain('two hundred and three');
            expect(text).toContain('saudi riyals');
        });

        test('totals and words are printed only on the last page', () => {
            const { text } = renderDoc(Component, makeTwoPageDoc());
            expect(text.match(/saudi riyals/g)).toHaveLength(1);
        });

        test('VAT 0 prints 0.00 VAT', () => {
            const { text } = renderDoc(Component, makeDoc({ vat_percent: 0, vat_price: 0, net_total: 180 }));
            expect(text).toMatch(new RegExp(`180\\.00${sfx}\\s?0\\.00${sfx}`));
            expect(text).toContain('one hundred and eighty saudi riyals');
        });
    }
}
