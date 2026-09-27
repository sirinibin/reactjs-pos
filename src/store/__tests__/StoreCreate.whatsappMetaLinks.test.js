/**
 * Verifies the three Meta quick-access links in the WhatsApp Settings tab.
 */

const fs   = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '../create.js'), 'utf8');

describe('Store form — WhatsApp Settings Meta quick-access links', () => {
    test('1. Insights link points to Meta phone numbers page', () => {
        expect(src).toMatch(/business\.facebook\.com\/latest\/whatsapp_manager\/phone_numbers\?business_id=1442312137713796&asset_id=28106721685688550/);
    });

    test('2. Templates link points to Meta message templates page', () => {
        expect(src).toMatch(/business\.facebook\.com\/latest\/whatsapp_manager\/message_templates\//);
        expect(src).toMatch(/asset_id=28106721685688550/);
    });

    test('3. Billing link points to Meta billing hub', () => {
        expect(src).toMatch(/business\.facebook\.com\/latest\/billing_hub\/accounts\/details\//);
        expect(src).toMatch(/payment_account_id=2075149283102188/);
    });

    test('4. All three links open in a new tab', () => {
        const matches = [...src.matchAll(/business\.facebook\.com\/latest\/(whatsapp_manager\/phone_numbers|whatsapp_manager\/message_templates|billing_hub)[^"']*/g)];
        // Each href is followed by target="_blank" nearby — check the surrounding context
        expect(src).toMatch(/whatsapp_manager\/phone_numbers[^>]{0,300}target="_blank"/s);
        expect(src).toMatch(/whatsapp_manager\/message_templates[^>]{0,800}target="_blank"/s);
        expect(src).toMatch(/billing_hub[^>]{0,300}target="_blank"/s);
    });

    test('5. Links appear inside the whatsapp_settings tab section', () => {
        const tabSection = src.slice(src.indexOf("activeTab === 'whatsapp_settings'"));
        expect(tabSection).toMatch(/business\.facebook\.com\/latest\/whatsapp_manager\/phone_numbers/);
        expect(tabSection).toMatch(/business\.facebook\.com\/latest\/whatsapp_manager\/message_templates/);
        expect(tabSection).toMatch(/business\.facebook\.com\/latest\/billing_hub/);
    });
});
