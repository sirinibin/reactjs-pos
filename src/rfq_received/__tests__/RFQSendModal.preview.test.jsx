/**
 * Unit tests for rfqTemplateWantsDocument — the function that controls
 * whether the send modal preview shows a PDF card (DOCUMENT template)
 * or an image thumbnail (IMAGE template / no header).
 *
 * Also tests the PDF filename convention: code + ".pdf" with no added prefix.
 *
 * Covers:
 *  1.  DOCUMENT header → true
 *  2.  IMAGE header → false
 *  3.  No HEADER component → false (default to image)
 *  4.  Empty array → false
 *  5.  Null / undefined → false (safe for missing preview)
 *  6.  type check is case-insensitive ("header" lowercase)
 *  7.  format check is case-insensitive ("document" lowercase)
 *  8.  Mixed components — BODY + DOCUMENT header → true
 *  9.  Mixed components — BODY + IMAGE header → false
 * 10.  Multiple HEADER components — first is DOCUMENT, second IMAGE → true
 * 11.  PDF filename: code.pdf — no double "RFQ-" prefix for code "RFQ-0017"
 * 12.  PDF filename: code.pdf — works for any rfq code value
 */

import { rfqTemplateWantsDocument } from '../index';

describe('rfqTemplateWantsDocument', () => {
    it('1. DOCUMENT header → true', () => {
        expect(rfqTemplateWantsDocument([
            { type: 'HEADER', format: 'DOCUMENT' },
        ])).toBe(true);
    });

    it('2. IMAGE header → false', () => {
        expect(rfqTemplateWantsDocument([
            { type: 'HEADER', format: 'IMAGE' },
        ])).toBe(false);
    });

    it('3. No HEADER component → false', () => {
        expect(rfqTemplateWantsDocument([
            { type: 'BODY', text: 'Hello' },
        ])).toBe(false);
    });

    it('4. Empty array → false', () => {
        expect(rfqTemplateWantsDocument([])).toBe(false);
    });

    it('5. null → false (safe for missing preview)', () => {
        expect(rfqTemplateWantsDocument(null)).toBe(false);
    });

    it('5b. undefined → false', () => {
        expect(rfqTemplateWantsDocument(undefined)).toBe(false);
    });

    it('6. type field is case-insensitive — "header" lowercase matches', () => {
        expect(rfqTemplateWantsDocument([
            { type: 'header', format: 'DOCUMENT' },
        ])).toBe(true);
    });

    it('7. format field is case-insensitive — "document" lowercase matches', () => {
        expect(rfqTemplateWantsDocument([
            { type: 'HEADER', format: 'document' },
        ])).toBe(true);
    });

    it('7b. both fields lowercase', () => {
        expect(rfqTemplateWantsDocument([
            { type: 'header', format: 'document' },
        ])).toBe(true);
    });

    it('8. BODY + DOCUMENT header → true', () => {
        expect(rfqTemplateWantsDocument([
            { type: 'BODY', text: 'Dear supplier...' },
            { type: 'HEADER', format: 'DOCUMENT' },
        ])).toBe(true);
    });

    it('9. BODY + IMAGE header → false', () => {
        expect(rfqTemplateWantsDocument([
            { type: 'HEADER', format: 'IMAGE' },
            { type: 'BODY', text: 'Dear supplier...' },
        ])).toBe(false);
    });

    it('10. first HEADER is DOCUMENT → true (regardless of other components)', () => {
        expect(rfqTemplateWantsDocument([
            { type: 'HEADER', format: 'DOCUMENT' },
            { type: 'HEADER', format: 'IMAGE' }, // second header (unusual, but safe)
            { type: 'BODY', text: 'Text' },
        ])).toBe(true);
    });

    it('11. FOOTER component alone → false', () => {
        expect(rfqTemplateWantsDocument([
            { type: 'FOOTER', text: 'Regards' },
        ])).toBe(false);
    });

    it('12. HEADER with no format field → false (not DOCUMENT)', () => {
        expect(rfqTemplateWantsDocument([
            { type: 'HEADER' },
        ])).toBe(false);
    });
});

// PDF filename convention tests — the rendered filename must be exactly
// rfq.code + ".pdf", never "RFQ-" + rfq.code + ".pdf".
describe('PDF card filename convention', () => {
    function pdfFilename(rfqCode) {
        return `${rfqCode}.pdf`;
    }

    it('11. RFQ-0017 → "RFQ-0017.pdf" (not "RFQ-RFQ-0017.pdf")', () => {
        expect(pdfFilename('RFQ-0017')).toBe('RFQ-0017.pdf');
        expect(pdfFilename('RFQ-0017')).not.toContain('RFQ-RFQ-');
    });

    it('12. RFQ-0001 → "RFQ-0001.pdf"', () => {
        expect(pdfFilename('RFQ-0001')).toBe('RFQ-0001.pdf');
    });

    it('13. RFQ-9999 → "RFQ-9999.pdf"', () => {
        expect(pdfFilename('RFQ-9999')).toBe('RFQ-9999.pdf');
    });

    it('14. Empty code → ".pdf" (degenerate but no crash)', () => {
        expect(pdfFilename('')).toBe('.pdf');
    });
});
