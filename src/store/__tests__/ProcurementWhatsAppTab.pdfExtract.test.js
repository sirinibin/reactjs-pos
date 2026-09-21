/**
 * Source-code pattern tests for the "Extract Quotation Prices" button
 * that appears inside PDF message bubbles in the WhatsApp conversation view.
 *
 * Covers:
 *  1. Button forces is_supplier_quotation:true so modal opens in quotation mode
 *  2. Button label is "Extract Quotation Prices"
 *  3. Button uses bi-receipt icon (quotation style, not general extraction style)
 *  4. Button only appears for incoming (non-outgoing) messages
 *  5. Hover overlay button also forces is_supplier_quotation:true
 */

const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(
    path.join(__dirname, '../ProcurementWhatsAppTab.js'),
    'utf8'
);

describe('ProcurementWhatsAppTab — PDF Extract Quotation Prices button', () => {
    it('1. bubble button opens modal with is_supplier_quotation:true (forces quotation mode)', () => {
        // Must spread msg and override is_supplier_quotation
        expect(src).toMatch(/setExtractMsg\(\s*\{[\s\S]{0,60}\.\.\.msg[\s\S]{0,60}is_supplier_quotation\s*:\s*true/);
    });

    it('2. bubble button label is "Extract Quotation Prices"', () => {
        expect(src).toMatch(/t\('Extract Quotation Prices'\)/);
    });

    it('3. bubble button uses bi-receipt icon (not bi-magic)', () => {
        // The conversation bubble button must use bi-receipt
        expect(src).toMatch(/bi-receipt[\s\S]{0,200}Extract Quotation Prices|Extract Quotation Prices[\s\S]{0,200}bi-receipt/);
    });

    it('4. bubble button only shown for incoming (non-outgoing) messages', () => {
        // The bubble button block starts with !isOut and contains the PDF attachment check
        expect(src).toMatch(/\/\* Extract Quotation Prices button[\s\S]{0,20}only for incoming[\s\S]{0,100}!isOut/);
    });

    it('5. hover overlay button also forces is_supplier_quotation:true', () => {
        // The circular hover button "Add Quotation Prices to RFQ" must also use the spread+override pattern
        const overrideCount = (src.match(/is_supplier_quotation\s*:\s*true/g) || []).length;
        expect(overrideCount).toBeGreaterThanOrEqual(2);
    });
});
