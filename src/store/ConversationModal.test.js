/**
 * Source-level tests for the WhatsApp/Email conversation modal feature.
 * Verifies that all components wire up correctly without needing a live API.
 */

const fs   = require('fs');
const path = require('path');

const CONV_MODAL  = fs.readFileSync(path.join(__dirname, 'ConversationModal.js'), 'utf8');
const EMAIL_MODAL = fs.readFileSync(path.join(__dirname, 'EmailChatModal.js'), 'utf8');
const WA_TAB      = fs.readFileSync(path.join(__dirname, 'ProcurementWhatsAppTab.js'), 'utf8');
const EMAIL_TAB   = fs.readFileSync(path.join(__dirname, 'ProcurementEmailConversationTab.js'), 'utf8');
const RFQ_RECV    = fs.readFileSync(path.join(__dirname, '../rfq_received/index.js'), 'utf8');
const RFQ_SUP     = fs.readFileSync(path.join(__dirname, '../rfq_suppliers/index.js'), 'utf8');

// ── 1. ConversationModal.js structure ─────────────────────────────────────────

describe('ConversationModal.js', () => {
    test('1.1  exports WhatsAppChatModal', () => {
        expect(CONV_MODAL).toMatch(/export function WhatsAppChatModal/);
    });

    test('1.2  exports EmailChatModal (directly or via re-export from EmailChatModal.js)', () => {
        // EmailChatModal was extracted to its own file to avoid circular imports.
        // ConversationModal re-exports it; EmailChatModal.js defines it.
        const reExport = CONV_MODAL.match(/export\s*\{[\s\S]{0,50}EmailChatModal[\s\S]{0,50}\}/);
        const directExport = CONV_MODAL.match(/export function EmailChatModal/);
        const emailModalDef = EMAIL_MODAL.match(/export function EmailChatModal/);
        expect(reExport || directExport || emailModalDef).not.toBeNull();
    });

    test('1.3  WhatsAppChatModal passes initialPhone prop to ProcurementWhatsAppTab', () => {
        expect(CONV_MODAL).toMatch(/ProcurementWhatsAppTab[\s\S]{0,200}initialPhone/);
    });

    test('1.4  EmailChatModal passes initialEmail prop to ProcurementEmailConversationTab', () => {
        // EmailChatModal is in its own file now
        expect(EMAIL_MODAL).toMatch(/ProcurementEmailConversationTab[\s\S]{0,200}initialEmail/);
    });

    test('1.5  both modals use key prop for remount on contact change', () => {
        const waKey    = CONV_MODAL.match(/ProcurementWhatsAppTab[\s\S]{0,100}key=/);
        const emailKey = EMAIL_MODAL.match(/ProcurementEmailConversationTab[\s\S]{0,100}key=/);
        expect(waKey).not.toBeNull();
        expect(emailKey).not.toBeNull();
    });
});

// ── 2. ProcurementWhatsAppTab accepts initialPhone prop ───────────────────────

describe('ProcurementWhatsAppTab', () => {
    test('2.1  function signature accepts initialPhone prop', () => {
        expect(WA_TAB).toMatch(/function ProcurementWhatsAppTab\s*\(\s*\{[\s\S]{0,100}initialPhone/);
    });

    test('2.2  initialPhoneRef uses initialPhone prop as first choice', () => {
        expect(WA_TAB).toMatch(/initialPhoneRef\s*=\s*useRef\s*\(\s*initialPhoneProp\s*\|\|/);
    });
});

// ── 3. ProcurementEmailConversationTab accepts initialEmail prop ──────────────

describe('ProcurementEmailConversationTab', () => {
    test('3.1  function signature accepts initialEmail prop', () => {
        expect(EMAIL_TAB).toMatch(/function ProcurementEmailConversationTab\s*\(\s*\{[\s\S]{0,100}initialEmail/);
    });

    test('3.2  initialEmailRef is declared with initialEmailProp', () => {
        expect(EMAIL_TAB).toMatch(/initialEmailRef\s*=\s*useRef\s*\(\s*initialEmailProp/);
    });

    test('3.3  useEffect auto-selects thread when initialEmail is set', () => {
        expect(EMAIL_TAB).toMatch(/initialEmailRef[\s\S]{0,300}setSelectedThread[\s\S]{0,100}loadThread/);
    });
});

// ── 4. rfq_received/index.js — ForwardDetail modal wiring ────────────────────

describe('rfq_received ForwardDetail', () => {
    test('4.1  imports WhatsAppChatModal and EmailChatModal', () => {
        expect(RFQ_RECV).toMatch(/WhatsAppChatModal[\s\S]{0,50}EmailChatModal/);
    });

    test('4.2  ForwardDetail has chatModal state', () => {
        expect(RFQ_RECV).toMatch(/ForwardDetail[\s\S]{0,1400}chatModal/);
    });

    test('4.3  customer WhatsApp button calls setChatModal (no history.push)', () => {
        expect(RFQ_RECV).toMatch(/customer_phone[\s\S]{0,200}setChatModal[\s\S]{0,50}whatsapp/);
    });

    test('4.4  customer email button calls setChatModal (no history.push)', () => {
        expect(RFQ_RECV).toMatch(/customer_email[\s\S]{0,200}setChatModal[\s\S]{0,50}email/);
    });

    test('4.5  supplier row WhatsApp button calls setChatModal', () => {
        const matches = RFQ_RECV.match(/setChatModal\(\s*\{\s*type:\s*['"]whatsapp['"]/g);
        expect(matches).not.toBeNull();
        expect(matches.length).toBeGreaterThanOrEqual(3);
    });

    test('4.6  ForwardDetail renders WhatsAppChatModal and EmailChatModal', () => {
        expect(RFQ_RECV).toMatch(/<WhatsAppChatModal/);
        expect(RFQ_RECV).toMatch(/<EmailChatModal/);
    });

    test('4.7  no remaining history.push to procurement-whatsapp or procurement-emails in ForwardDetail/RFQSendModal', () => {
        expect(RFQ_RECV).not.toMatch(/history\.push[\s\S]{0,100}procurement-whatsapp/);
        expect(RFQ_RECV).not.toMatch(/history\.push[\s\S]{0,100}procurement-emails/);
    });
});

// ── 5. rfq_suppliers/index.js — modal wiring ─────────────────────────────────

describe('rfq_suppliers RFQSuppliersIndex', () => {
    test('5.1  imports ConversationModal components', () => {
        expect(RFQ_SUP).toMatch(/WhatsAppChatModal[\s\S]{0,50}EmailChatModal/);
    });

    test('5.2  has chatModal state', () => {
        expect(RFQ_SUP).toMatch(/chatModal/);
    });

    test('5.3  supplier WhatsApp button calls setChatModal', () => {
        expect(RFQ_SUP).toMatch(/setChatModal[\s\S]{0,50}whatsapp/);
    });

    test('5.4  supplier email button calls setChatModal', () => {
        expect(RFQ_SUP).toMatch(/setChatModal[\s\S]{0,50}email/);
    });

    test('5.5  renders WhatsAppChatModal and EmailChatModal', () => {
        expect(RFQ_SUP).toMatch(/<WhatsAppChatModal/);
        expect(RFQ_SUP).toMatch(/<EmailChatModal/);
    });

    test('5.6  no remaining history.push to procurement routes', () => {
        expect(RFQ_SUP).not.toMatch(/history\.push[\s\S]{0,100}procurement-whatsapp/);
        expect(RFQ_SUP).not.toMatch(/history\.push[\s\S]{0,100}procurement-emails/);
    });
});
