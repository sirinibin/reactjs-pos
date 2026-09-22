/**
 * Source-level tests for the quotation link feature in ForwardDetail (RFQ Detail modal).
 *
 * When a quotation has been created for an RFQ, rfq.quotation_ids and rfq.quotation_codes
 * are populated.  The header must render a clickable button for each linked quotation that
 * calls onOpenQuotation(id) so the QuotationCreate modal opens showing that quotation.
 */

const fs   = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
    path.join(__dirname, '..', 'index.js'),
    'utf8'
);

describe('ForwardDetail — quotation link in header', () => {
    test('1.1  onOpenQuotation is in ForwardDetail props', () => {
        // The destructuring must include onOpenQuotation
        const detailFn = SRC.match(/export function ForwardDetail\s*\(\s*\{([^}]+)\}/);
        expect(detailFn).not.toBeNull();
        expect(detailFn[1]).toMatch(/onOpenQuotation/);
    });

    test('1.2  renders a button for each quotation_code', () => {
        // Must iterate over rfq.quotation_codes (or quotation_ids) to render buttons
        expect(SRC).toMatch(/quotation_codes.*\.map|quotation_ids.*\.map/);
    });

    test('1.3  button calls onOpenQuotation with the quotation ID', () => {
        expect(SRC).toMatch(/onOpenQuotation\s*&&\s*onOpenQuotation\s*\(|onOpenQuotation\s*\(/);
    });

    test('1.4  quotation ID comes from rfq.quotation_ids (not just the code)', () => {
        // Must look up the ID by index, not just navigate by code string
        expect(SRC).toMatch(/rfq\.quotation_ids/);
    });

    test('1.5  button has a receipt icon', () => {
        expect(SRC).toMatch(/bi-receipt/);
    });

    test('1.6  button shows the quotation code as label', () => {
        // The code variable from the map callback must appear in the button label
        const block = SRC.match(/quotation_codes.*\.map[\s\S]{0,700}/);
        expect(block).not.toBeNull();
        expect(block[0]).toMatch(/\{code\}/);
    });

    test('1.7  guard: button group only shown when quotation_ids is non-empty', () => {
        expect(SRC).toMatch(/rfq\.quotation_ids.*\).*\.length.*>.*0|quotation_ids.*\|\|.*\[\].*\)\.length/);
    });
});

describe('RFQReceivedIndex — handleOpenQuotation wiring', () => {
    test('2.1  handleOpenQuotation defined', () => {
        expect(SRC).toMatch(/handleOpenQuotation/);
    });

    test('2.2  handleOpenQuotation calls quotationCreateRef.current.open(id)', () => {
        const block = SRC.match(/handleOpenQuotation[\s\S]{0,200}/);
        expect(block).not.toBeNull();
        expect(block[0]).toMatch(/quotationCreateRef\.current.*open\s*\(/);
    });

    test('2.3  onOpenQuotation prop is passed to ForwardDetail', () => {
        const detailEl = SRC.match(/<ForwardDetail[\s\S]{0,600}\/>/);
        expect(detailEl).not.toBeNull();
        expect(detailEl[0]).toMatch(/onOpenQuotation/);
    });
});
