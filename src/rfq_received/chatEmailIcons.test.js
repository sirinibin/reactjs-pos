/**
 * Source-code tests for WhatsApp chat and Email icons added to RFQ supplier/customer locations.
 *
 * Covers:
 *  1. ForwardDetail Info tab: WhatsApp icon links to /dashboard/procurement-whatsapp?phone=...
 *  2. ForwardDetail Info tab: Email icon links to /dashboard/procurement-emails?email=...
 *  3. ForwardDetail Suppliers tab: WhatsApp icon per supplier row (uses r.phone)
 *  4. ForwardDetail Suppliers tab: Email icon per supplier row (uses resolved.email)
 *  5. RFQSendModal Recipients: WhatsApp icon per recipient (uses s.phone)
 *  6. RFQSendModal Recipients: Email icon per recipient (uses s.email)
 *  7. ProcurementWhatsAppTab: reads ?phone= URL param via useLocation
 *  8. ProcurementWhatsAppTab: auto-selects thread matching ?phone= param after threads load
 *  9. ProcurementEmailsTab: initialises search state from ?email= URL param
 */

const fs = require('fs');
const path = require('path');

const rfqSrc = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8');
const waSrc  = fs.readFileSync(path.join(__dirname, '../store/ProcurementWhatsAppTab.js'), 'utf8');
const emlSrc = fs.readFileSync(path.join(__dirname, '../store/ProcurementEmailsTab.js'), 'utf8');
const supSrc = fs.readFileSync(path.join(__dirname, '../rfq_suppliers/index.js'), 'utf8');

describe('WhatsApp & Email chat icons', () => {
    it('1. Info tab customer: WhatsApp button navigates to procurement-whatsapp with phone', () => {
        expect(rfqSrc).toMatch(/procurement-whatsapp.*phone.*customer_phone|customer_phone.*procurement-whatsapp/);
    });

    it('2. Info tab customer: Email button navigates to procurement-emails with customer_email', () => {
        expect(rfqSrc).toMatch(/procurement-emails.*email.*customer_email|customer_email.*procurement-emails/);
    });

    it('3. Suppliers tab: WhatsApp button per row uses r.phone to open conversation', () => {
        // Button: {r.phone && <button...procurement-whatsapp...r.phone.replace...>}
        expect(rfqSrc).toMatch(/r\.phone\.replace[\s\S]{0,50}procurement-whatsapp|procurement-whatsapp[\s\S]{0,100}r\.phone\.replace/);
    });

    it('4. Suppliers tab: Email icon per row using resolved.email', () => {
        expect(rfqSrc).toMatch(/resolved\.email[\s\S]{0,200}procurement-emails|procurement-emails[\s\S]{0,200}resolved\.email/);
    });

    it('5. Send RFQ Recipients: WhatsApp icon using s.phone', () => {
        expect(rfqSrc).toMatch(/procurement-whatsapp[\s\S]{0,200}s\.phone|s\.phone[\s\S]{0,200}procurement-whatsapp/);
    });

    it('6. Send RFQ Recipients: Email icon using s.email', () => {
        // Both procurement-emails navigation and s.email check exist
        expect(rfqSrc).toMatch(/procurement-emails/);
        expect(rfqSrc).toMatch(/s\.email[\s\S]{0,100}procurement-emails|procurement-emails[\s\S]{0,1000}s\.email/);
    });
});

describe('RFQ Suppliers index table — chat icons', () => {
    it('7. Imports useHistory from react-router-dom', () => {
        expect(supSrc).toMatch(/import.*useHistory.*react-router-dom/);
    });

    it('8. WhatsApp icon links to procurement-whatsapp with sup.phone', () => {
        expect(supSrc).toMatch(/procurement-whatsapp[\s\S]{0,200}sup\.phone|sup\.phone[\s\S]{0,200}procurement-whatsapp/);
    });

    it('9. Email icon links to procurement-emails with sup.email', () => {
        expect(supSrc).toMatch(/sup\.email[\s\S]{0,200}procurement-emails|procurement-emails[\s\S]{0,200}sup\.email/);
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
