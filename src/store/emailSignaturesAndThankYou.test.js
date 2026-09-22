/**
 * Source-code tests for:
 *  1. EmailDetailModal — "Thank You Reply" button and handleThankYouReply
 *  2. ProcurementOutgoingEmailWidget — Email Signatures management section
 */

const fs = require('fs');
const path = require('path');

const emailDetailSrc = fs.readFileSync(
    path.join(__dirname, 'EmailDetailModal.js'),
    'utf8'
);

const widgetSrc = fs.readFileSync(
    path.join(__dirname, 'ProcurementOutgoingEmailWidget.js'),
    'utf8'
);

// ── EmailDetailModal ──────────────────────────────────────────────────────────

describe('EmailDetailModal — Thank You Reply', () => {
    it('1. THANK_YOU_BODY constant is defined with professional content', () => {
        expect(emailDetailSrc).toMatch(/THANK_YOU_BODY\s*=/);
        expect(emailDetailSrc).toMatch(/Thank you for reaching out/);
        expect(emailDetailSrc).toMatch(/will be in touch/);
        expect(emailDetailSrc).toMatch(/Best regards/);
    });

    it('2. handleThankYouReply function is defined', () => {
        expect(emailDetailSrc).toMatch(/handleThankYouReply\s*=/);
    });

    it('3. handleThankYouReply calls handleOpenReply to set up reply state', () => {
        expect(emailDetailSrc).toMatch(/handleThankYouReply[\s\S]{0,100}handleOpenReply\(\)/);
    });

    it('4. handleThankYouReply sets replyBody to THANK_YOU_BODY', () => {
        expect(emailDetailSrc).toMatch(/handleThankYouReply[\s\S]{0,200}setReplyBody\(THANK_YOU_BODY\)/);
    });

    it('5. Thank You Reply button exists in modal footer', () => {
        expect(emailDetailSrc).toMatch(/Thank You Reply/);
    });

    it('6. Thank You Reply button calls handleThankYouReply', () => {
        expect(emailDetailSrc).toMatch(/onClick=\{handleThankYouReply\}/);
    });

    it('7. Thank You Reply button is disabled when replyOpen is true', () => {
        expect(emailDetailSrc).toMatch(/handleThankYouReply[\s\S]{0,400}disabled=\{replyOpen\}|disabled=\{replyOpen\}[\s\S]{0,200}handleThankYouReply/);
    });

    it('8. Thank You Reply button uses a success-style icon', () => {
        expect(emailDetailSrc).toMatch(/check2-circle|check-circle|bi-check/);
    });
});

// ── ProcurementOutgoingEmailWidget — Email Signatures ────────────────────────

describe('ProcurementOutgoingEmailWidget — Email Signatures', () => {
    it('1. signatures state is initialized from settings.email_signatures', () => {
        expect(widgetSrc).toMatch(/signatures[\s\S]{0,60}email_signatures/);
    });

    it('2. sigEditing state is declared', () => {
        expect(widgetSrc).toMatch(/sigEditing[\s\S]{0,30}setSigEditing/);
    });

    it('3. saveSignatures function sends PUT /v1/store/{storeId}', () => {
        expect(widgetSrc).toMatch(/saveSignatures[\s\S]{0,300}\/v1\/store/);
    });

    it('4. saveSignatures sends email_signatures in body', () => {
        expect(widgetSrc).toMatch(/email_signatures[\s\S]{0,100}newSigs|newSigs[\s\S]{0,100}email_signatures/);
    });

    it('5. handleSigSave validates name and content are required', () => {
        expect(widgetSrc).toMatch(/Name and content are required/);
    });

    it('6. handleSigSave deselects other defaults when is_default is true', () => {
        expect(widgetSrc).toMatch(/is_default.*false|false.*is_default/);
    });

    it('7. handleSigDelete confirms before deleting', () => {
        expect(widgetSrc).toMatch(/window\.confirm.*Delete this signature/);
    });

    it('8. handleSigSetDefault marks only clicked signature as default', () => {
        expect(widgetSrc).toMatch(/handleSigSetDefault[\s\S]{0,200}is_default.*i\s*===\s*idx|i\s*===\s*idx.*is_default/);
    });

    it('9. Email Signatures section heading is rendered', () => {
        expect(widgetSrc).toMatch(/Email Signatures/);
    });

    it('10. Add Signature button exists and sets sigEditing with idx: -1', () => {
        expect(widgetSrc).toMatch(/Add Signature/);
        expect(widgetSrc).toMatch(/idx:\s*-1/);
    });

    it('11. Signature content textarea exists with placeholder', () => {
        expect(widgetSrc).toMatch(/<textarea/);
        expect(widgetSrc).toMatch(/Best regards/);
    });

    it('12. "Use as default" checkbox exists for signatures', () => {
        expect(widgetSrc).toMatch(/Use as default signature/);
    });

    it('13. useEffect syncs signatures when settings prop changes', () => {
        expect(widgetSrc).toMatch(/useEffect[\s\S]{0,100}email_signatures/);
    });
});
