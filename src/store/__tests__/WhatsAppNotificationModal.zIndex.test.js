/**
 * Source-level tests for the WhatsApp notification modal z-index fixes.
 *
 * Covers:
 *  1. WhatsAppNotificationModal passes zIndexBase to ProcurementWhatsAppTab
 *  2. ProcurementWhatsAppTab accepts zIndexBase prop
 *  3. directMode is false when showSidebar is true (full page shown in notification modal)
 *  4. ForwardDetail receives zIndex prop (above 15000 when zIndexBase=15000)
 *  5. RFQSendModal receives zIndex prop
 *  6. CustomerCreate receives zIndex prop
 *  7. EmailDetailModal receives zIndex prop and uses it on the outer div
 */

const fs   = require('fs');
const path = require('path');

const CONV  = fs.readFileSync(path.join(__dirname, '../ConversationModal.js'), 'utf8');
const TAB   = fs.readFileSync(path.join(__dirname, '../ProcurementWhatsAppTab.js'), 'utf8');
const EMAIL = fs.readFileSync(path.join(__dirname, '../EmailDetailModal.js'), 'utf8');

describe('WhatsAppNotificationModal — zIndexBase propagation', () => {
    test('1. WhatsAppNotificationModal passes zIndexBase to ProcurementWhatsAppTab', () => {
        expect(CONV).toMatch(/zIndexBase\s*=\s*\{MODAL_Z\}/);
    });

    test('2. ProcurementWhatsAppTab accepts zIndexBase prop', () => {
        expect(TAB).toMatch(/function ProcurementWhatsAppTab\s*\(\s*\{[^}]*zIndexBase/);
    });

    test('3. directMode is false when showSidebar=true (not active when showSidebar)', () => {
        // directMode must check !showSidebar so the full page UI is shown in the notification modal
        expect(TAB).toMatch(/useState\(!!initialPhoneRef\.current\s*&&\s*!showSidebar\)/);
    });

    test('4. ForwardDetail gets zIndex from zIndexBase + 2000', () => {
        expect(TAB).toMatch(/zIndex=\{zIndexBase\s*\?\s*zIndexBase\s*\+\s*2000\s*:\s*11000\}/);
    });

    test('5. RFQSendModal gets zIndex from zIndexBase + 2000', () => {
        expect(TAB).toMatch(/zIndex=\{zIndexBase\s*\?\s*zIndexBase\s*\+\s*2000\s*:\s*undefined\}/);
    });

    test('6. CustomerCreate gets zIndex from zIndexBase + 2000', () => {
        expect(TAB).toMatch(/CustomerCreate[^/]{0,200}zIndex=\{zIndexBase\s*\?\s*zIndexBase\s*\+\s*2000\s*:\s*undefined\}/);
    });

    test('7. EmailDetailModal gets zIndex from zIndexBase + 2000', () => {
        expect(TAB).toMatch(/EmailDetailModal[^/]{0,400}zIndex=\{zIndexBase\s*\?\s*zIndexBase\s*\+\s*2000\s*:/);
    });
});

describe('EmailDetailModal — zIndex and send button fixes', () => {
    test('8. EmailDetailModal accepts zIndex prop', () => {
        expect(EMAIL).toMatch(/function EmailDetailModal\s*\(\s*\{[^}]*zIndex/);
    });

    test('9. EmailDetailModal uses zIndex on the outer modal div', () => {
        expect(EMAIL).toMatch(/zIndex\s*:\s*zIndex\s*\|\|\s*9999/);
    });

    test('10. handleOpenReply falls back to msg.reply_to when msg.from has no email', () => {
        expect(EMAIL).toMatch(/extractEmail\(msg\.reply_to/);
    });

    test('11. Send button shows "Fill in the To field" hint when replyTo has no @', () => {
        expect(EMAIL).toMatch(/Fill in the To field/);
    });

    test('12. Send button has title tooltip explaining the To field requirement', () => {
        expect(EMAIL).toMatch(/Enter a recipient email in the To field/);
    });
});

describe('ForwardDetail — z-index override via JS', () => {
    const FWD = fs.readFileSync(
        path.join(__dirname, '../../rfq_received/index.js'), 'utf8'
    );

    test('13. ForwardDetail accepts zIndex prop', () => {
        expect(FWD).toMatch(/export function ForwardDetail\s*\(\s*\{[^}]*zIndex/);
    });

    test('14. ForwardDetail uses document.querySelector to override z-index with !important', () => {
        expect(FWD).toMatch(/querySelector\(.*rfq-detail-modal.*\)[\s\S]{0,100}setProperty\(.*z-index.*important/);
    });
});

describe('RFQSendModal — zIndex prop', () => {
    const RFQ = fs.readFileSync(
        path.join(__dirname, '../../rfq_received/index.js'), 'utf8'
    );

    test('15. RFQSendModal accepts zIndex prop', () => {
        expect(RFQ).toMatch(/export function RFQSendModal\s*\(\s*\{[^}]*zIndex/);
    });

    test('16. RFQSendModal uses zIndex in the setProperty call', () => {
        expect(RFQ).toMatch(/targetZ\s*=\s*zIndex\s*\|\|\s*1600/);
    });
});

describe('CustomerCreate — zIndex prop', () => {
    const CUST = fs.readFileSync(
        path.join(__dirname, '../../customer/create.js'), 'utf8'
    );

    test('17. CustomerCreate uses props.zIndex in its CSS style tag', () => {
        expect(CUST).toMatch(/props\.zIndex\s*\|\|\s*1600/);
    });
});

describe('QuotationCreate — zIndex prop', () => {
    const QC = fs.readFileSync(
        path.join(__dirname, '../../quotation/create.js'), 'utf8'
    );
    const RFQ = fs.readFileSync(
        path.join(__dirname, '../../rfq_received/index.js'), 'utf8'
    );

    test('18. QuotationCreate uses document.querySelector to override z-index with !important', () => {
        expect(QC).toMatch(/querySelector\(.*quotation-create-wrap.*\)[\s\S]{0,100}setProperty\(.*z-index.*important/);
    });

    test('19. QuotationCreate useEffect depends on props.zIndex', () => {
        expect(QC).toMatch(/props\.zIndex[\s\S]{0,200}setProperty\(.*z-index/);
    });

    test('20. RFQReceivedIndex passes static zIndex={2000} to QuotationCreate (above ForwardDetail CSS 1500)', () => {
        expect(RFQ).toMatch(/QuotationCreate[^/]{0,100}zIndex=\{2000\}/);
    });

    test('21. ProcurementWhatsAppTab passes zIndexBase + 3000 (or 12000 baseline) to its QuotationCreate', () => {
        const TAB2 = fs.readFileSync(path.join(__dirname, '../ProcurementWhatsAppTab.js'), 'utf8');
        expect(TAB2).toMatch(/QuotationCreate[^/]{0,200}zIndex=\{zIndexBase\s*\?\s*zIndexBase\s*\+\s*3000\s*:\s*12000\}/);
    });
});

describe('AttachmentPreview / FileViewerModal — zIndex prop', () => {
    const TAB = fs.readFileSync(path.join(__dirname, '../ProcurementWhatsAppTab.js'), 'utf8');

    test('22. AttachmentPreview accepts zIndex prop', () => {
        expect(TAB).toMatch(/AttachmentPreview\s*=\s*\(\s*\{[^}]*zIndex/);
    });

    test('23. AttachmentPreview passes zIndex to ViewButton', () => {
        expect(TAB).toMatch(/ViewButton\s[^/]{0,60}zIndex=\{zIndex\}/);
    });

    test('24. AttachmentPreview usages pass zIndexBase + 1000 when in notification modal', () => {
        const matches = [...TAB.matchAll(/AttachmentPreview[^/\n]{0,200}zIndex=\{zIndexBase\s*\?\s*zIndexBase\s*\+\s*1000\s*:\s*undefined\}/g)];
        expect(matches.length).toBeGreaterThanOrEqual(2);
    });
});

describe('ProcurementWhatsAppTab — unread count update on conversation open', () => {
    test('25. loadThread always emits wa_unread_changed when not silent (fixes count not updating when threads list is empty)', () => {
        // The emit must NOT be conditional on checking local unread_count —
        // when opened from notification modal, threads is [] so had would always be false.
        // Verify the unconditional emit pattern exists after the threads update.
        expect(TAB).toMatch(/eventEmitter\.emit\('wa_unread_changed'\)/);
        // Verify the old conditional "if (had)" pattern is gone
        expect(TAB).not.toMatch(/if\s*\(had\)\s*eventEmitter\.emit/);
    });

    test('26. loadThread still zeroes unread_count in local threads state', () => {
        expect(TAB).toMatch(/setThreads\(prev => prev\.map\(t => t\.contact_phone === contactPhone \? \{ \.\.\.t, unread_count: 0 \} : t\)\)/);
    });
});

describe('EmailDetailModal — attachment ViewButton z-index', () => {
    const EMAIL = fs.readFileSync(path.join(__dirname, '../EmailDetailModal.js'), 'utf8');

    test('27. image attachment ViewButton uses dynamic zIndex above the modal itself', () => {
        expect(EMAIL).not.toMatch(/ViewButton[^/\n]{0,60}zIndex=\{10100\}/);
        expect(EMAIL).toMatch(/ViewButton[^/\n]{0,60}zIndex=\{\(zIndex \|\| 9999\) \+ 100\}/);
    });

    test('28. non-image attachment ViewButton also uses dynamic zIndex', () => {
        const matches = [...EMAIL.matchAll(/ViewButton[^/\n]{0,60}zIndex=\{\(zIndex \|\| 9999\) \+ 100\}/g)];
        expect(matches.length).toBeGreaterThanOrEqual(2);
    });
});

describe('RFQPreview — dynamic zIndex prop', () => {
    const PREVIEW = fs.readFileSync(path.join(__dirname, '../../rfq_received/RFQPreview.js'), 'utf8');
    const RFQ     = fs.readFileSync(path.join(__dirname, '../../rfq_received/index.js'), 'utf8');

    test('29. RFQPreview accepts zIndex prop', () => {
        expect(PREVIEW).toMatch(/forwardRef\s*\(\s*\(\s*\{[^}]*zIndex/);
    });

    test('30. RFQPreview uses zIndex prop instead of hardcoded 1600', () => {
        expect(PREVIEW).toMatch(/zIndex \|\| 1600/);
        expect(PREVIEW).not.toMatch(/setProperty\(.*z-index.*'1600'/);
    });

    test('31. ForwardDetail passes zIndex + 100 to RFQPreview', () => {
        // Match RFQPreview within ~200 chars after the ForwardDetail rfqEditRef line (not RFQSendModal)
        expect(RFQ).toMatch(/RFQPreview ref=\{rfqPreviewRef\} zIndex=\{zIndex \? zIndex \+ 100 : undefined\}/);
    });

    test('32. RFQSendModal also passes zIndex + 100 to its RFQPreview', () => {
        const matches = [...RFQ.matchAll(/RFQPreview ref=\{rfqPreviewRef\} zIndex=\{zIndex \? zIndex \+ 100 : undefined\}/g)];
        expect(matches.length).toBeGreaterThanOrEqual(2);
    });
});
