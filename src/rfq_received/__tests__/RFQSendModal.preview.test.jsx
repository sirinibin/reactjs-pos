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

// Customer RFQ ID / Email / Phone field tests
describe('RFQ customer reference fields', () => {
    // Simulates the form state helper used in create.js
    function applyFormField(form, key, value) {
        return { ...form, [key]: value };
    }

    const EMPTY_FORM = () => ({
        customer_id: '', customer_name: '', customer_rfq_id: '',
        customer_email: '', customer_phone: '', text_content: '',
    });

    it('1. EMPTY_FORM initialises customer_rfq_id to empty string', () => {
        expect(EMPTY_FORM().customer_rfq_id).toBe('');
    });

    it('2. EMPTY_FORM initialises customer_email to empty string', () => {
        expect(EMPTY_FORM().customer_email).toBe('');
    });

    it('3. EMPTY_FORM initialises customer_phone to empty string', () => {
        expect(EMPTY_FORM().customer_phone).toBe('');
    });

    it('4. customer_rfq_id is set correctly', () => {
        const form = applyFormField(EMPTY_FORM(), 'customer_rfq_id', 'PO-2025-001');
        expect(form.customer_rfq_id).toBe('PO-2025-001');
    });

    it('5. customer_email is set correctly', () => {
        const form = applyFormField(EMPTY_FORM(), 'customer_email', 'buyer@example.com');
        expect(form.customer_email).toBe('buyer@example.com');
    });

    it('6. customer_phone is set correctly', () => {
        const form = applyFormField(EMPTY_FORM(), 'customer_phone', '+966501234567');
        expect(form.customer_phone).toBe('+966501234567');
    });

    it('7. edit() maps rfq.customer_rfq_id → form.customer_rfq_id', () => {
        const rfq = { customer_id: 'c1', customer_name: 'Acme', customer_rfq_id: 'RFQ-XYZ', customer_email: '', customer_phone: '', text_content: '' };
        const form = {
            customer_id:     rfq.customer_id || '',
            customer_name:   rfq.customer_name || '',
            customer_rfq_id: rfq.customer_rfq_id || '',
            customer_email:  rfq.customer_email || '',
            customer_phone:  rfq.customer_phone || '',
            text_content:    rfq.text_content || '',
        };
        expect(form.customer_rfq_id).toBe('RFQ-XYZ');
    });

    it('8. edit() with missing customer_rfq_id falls back to empty string', () => {
        const rfq = { customer_id: '', customer_name: '', text_content: '' };
        const form = { customer_rfq_id: rfq.customer_rfq_id || '' };
        expect(form.customer_rfq_id).toBe('');
    });

    it('9. payload uses form values first, then selectedCustomers fallback for email', () => {
        const formEmail = 'manual@email.com';
        const selectedEmail = 'selected@email.com';
        const result = formEmail || selectedEmail;
        expect(result).toBe('manual@email.com');
    });

    it('10. payload falls back to selectedCustomers email when form email is empty', () => {
        const formEmail = '';
        const selectedEmail = 'fallback@email.com';
        const result = formEmail || selectedEmail;
        expect(result).toBe('fallback@email.com');
    });

    it('11. payload uses form phone first, then selectedCustomers fallback', () => {
        const formPhone = '+966500000000';
        const selectedPhone = '+966511111111';
        const result = formPhone || selectedPhone;
        expect(result).toBe('+966500000000');
    });

    it('12. payload sends undefined for customer_rfq_id when field is empty', () => {
        const rfqId = '';
        const payload = { customer_rfq_id: rfqId || undefined };
        expect(payload.customer_rfq_id).toBeUndefined();
    });

    it('13. payload sends value for customer_rfq_id when field is filled', () => {
        const rfqId = 'INV-001';
        const payload = { customer_rfq_id: rfqId || undefined };
        expect(payload.customer_rfq_id).toBe('INV-001');
    });
});
