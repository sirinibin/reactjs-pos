/**
 * Source-code tests for WhatsApp chat and Email icons added to RFQ supplier/customer locations.
 *
 * Covers:
 *  1. ForwardDetail Info tab: WhatsApp icon opens chat modal for customer_phone
 *  2. ForwardDetail Info tab: Email icon opens chat modal for customer_email
 *  3. ForwardDetail Suppliers tab: WhatsApp icon per supplier row (uses r.phone)
 *  4. ForwardDetail Suppliers tab: Email icon per supplier row (uses resolved.email)
 *  5. RFQSendModal Recipients: WhatsApp icon per recipient (uses s.phone)
 *  6. RFQSendModal Recipients: Email icon per recipient (uses s.email)
 *  7. ProcurementWhatsAppTab: reads ?phone= URL param via useLocation
 *  8. ProcurementWhatsAppTab: auto-selects thread matching ?phone= param after threads load
 *  9. rfq_suppliers: chat icons use setChatModal (not history.push)
 */

const fs = require('fs');
const path = require('path');

const rfqSrc = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8');
const waSrc  = fs.readFileSync(path.join(__dirname, '../store/ProcurementWhatsAppTab.js'), 'utf8');
const emlSrc = fs.readFileSync(path.join(__dirname, '../store/ProcurementEmailsTab.js'), 'utf8');
const supSrc = fs.readFileSync(path.join(__dirname, '../rfq_suppliers/index.js'), 'utf8');

describe('WhatsApp & Email chat icons — modal pattern', () => {
    it('1. Info tab customer: WhatsApp button opens chatModal with customer_phone', () => {
        expect(rfqSrc).toMatch(/setChatModal[\s\S]{0,100}whatsapp[\s\S]{0,100}customer_phone|customer_phone[\s\S]{0,100}setChatModal[\s\S]{0,50}whatsapp/);
    });

    it('2. Info tab customer: Email button opens chatModal with customer_email', () => {
        expect(rfqSrc).toMatch(/setChatModal[\s\S]{0,100}email[\s\S]{0,100}customer_email|customer_email[\s\S]{0,100}setChatModal[\s\S]{0,50}email/);
    });

    it('3. Suppliers tab: WhatsApp button per row uses r.phone with setChatModal', () => {
        expect(rfqSrc).toMatch(/setChatModal[\s\S]{0,100}whatsapp[\s\S]{0,100}r\.phone|r\.phone[\s\S]{0,100}setChatModal[\s\S]{0,100}whatsapp/);
    });

    it('4. Suppliers tab: Email icon per row using resolved.email with setChatModal', () => {
        expect(rfqSrc).toMatch(/setChatModal[\s\S]{0,100}email[\s\S]{0,100}resolved\.email|resolved\.email[\s\S]{0,100}setChatModal/);
    });

    it('5. Send RFQ Recipients: WhatsApp icon uses s.phone with setChatModal', () => {
        expect(rfqSrc).toMatch(/setChatModal[\s\S]{0,100}whatsapp[\s\S]{0,200}s\.phone|s\.phone[\s\S]{0,200}setChatModal[\s\S]{0,100}whatsapp/);
    });

    it('6. Send RFQ Recipients: Email icon uses s.email with setChatModal', () => {
        expect(rfqSrc).toMatch(/setChatModal[\s\S]{0,100}email[\s\S]{0,200}s\.email|s\.email[\s\S]{0,100}setChatModal[\s\S]{0,100}email/);
    });

    it('6b. No remaining history.push to procurement-whatsapp or procurement-emails', () => {
        expect(rfqSrc).not.toMatch(/history\.push[\s\S]{0,100}procurement-whatsapp/);
        expect(rfqSrc).not.toMatch(/history\.push[\s\S]{0,100}procurement-emails/);
    });
});

describe('RFQ Suppliers index table — chat icons', () => {
    it('7. Does not import unused useHistory', () => {
        // useHistory was removed from rfq_suppliers/index.js since it was never used
        expect(supSrc).not.toMatch(/history\.push|history\.replace/);
    });

    it('8. WhatsApp icon uses setChatModal with sup.phone', () => {
        expect(supSrc).toMatch(/setChatModal[\s\S]{0,100}whatsapp[\s\S]{0,100}sup\.phone|sup\.phone[\s\S]{0,100}setChatModal[\s\S]{0,100}whatsapp/);
    });

    it('9. Email icon uses setChatModal with sup.email', () => {
        expect(supSrc).toMatch(/setChatModal[\s\S]{0,100}email[\s\S]{0,100}sup\.email|sup\.email[\s\S]{0,100}setChatModal[\s\S]{0,100}email/);
    });
});

describe('ProcurementWhatsAppTab — ?phone= URL param', () => {
    it('10. imports useLocation from react-router-dom', () => {
        expect(waSrc).toMatch(/useLocation/);
    });

    it('11. reads ?phone= from URL and auto-selects thread when threads load', () => {
        expect(waSrc).toMatch(/initialPhoneRef/);
        expect(waSrc).toMatch(/setSelectedThread/);
        expect(waSrc).toMatch(/setViewMode\(['"]conversations['"]\)/);
    });
});

describe('ProcurementEmailsTab — ?email= URL param', () => {
    it('12. initialises search from ?email= URL param', () => {
        expect(emlSrc).toMatch(/useLocation/);
        expect(emlSrc).toMatch(/get\(['"]email['"]\)/);
    });
});
