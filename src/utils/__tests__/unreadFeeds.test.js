import { whatsAppUnreadEnabled, emailUnreadEnabled, UNREAD_POLL_MS } from '../unreadFeeds';

describe('whatsAppUnreadEnabled', () => {
    test.each([
        ['null settings', null, false],
        ['undefined settings', undefined, false],
        ['empty settings', {}, false],
        ['module off, numbers set', { enable_rfq_module: false, store_rfq_waba_phone_number_id: '1', bot_waba_phone_number_id: '2' }, false],
        ['module missing, number set', { store_rfq_waba_phone_number_id: '1' }, false],
        ['module truthy but not true', { enable_rfq_module: 'true', store_rfq_waba_phone_number_id: '1' }, false],
        ['module on, nothing connected', { enable_rfq_module: true }, false],
        ['module on, empty ids', { enable_rfq_module: true, store_rfq_waba_phone_number_id: '', bot_waba_phone_number_id: '' }, false],
        ['module on, whitespace id', { enable_rfq_module: true, store_rfq_waba_phone_number_id: '   ' }, false],
        ['module on, non-string id', { enable_rfq_module: true, store_rfq_waba_phone_number_id: 123 }, false],
        ['module on, legacy Evolution number only', { enable_rfq_module: true, store_rfq_whatsapp_phone: '9665' }, false],
        ['module on, email only', { enable_rfq_module: true, rfq_email_connected: true }, false],
        ['module on, store RFQ number', { enable_rfq_module: true, store_rfq_waba_phone_number_id: '111' }, true],
        ['module on, bot number', { enable_rfq_module: true, bot_waba_phone_number_id: '222' }, true],
    ])('%s', (_, settings, want) => {
        expect(whatsAppUnreadEnabled(settings)).toBe(want);
    });
});

describe('emailUnreadEnabled', () => {
    test.each([
        ['null settings', null, false],
        ['empty settings', {}, false],
        ['module off, connected', { enable_rfq_module: false, rfq_email_connected: true, rfq_email_accounts: [{ email: 'a@b.c' }] }, false],
        ['module on, nothing connected', { enable_rfq_module: true }, false],
        ['module on, flag false and no accounts', { enable_rfq_module: true, rfq_email_connected: false, rfq_email_accounts: [] }, false],
        ['module on, accounts not an array', { enable_rfq_module: true, rfq_email_accounts: { length: 2 } }, false],
        ['module on, flag truthy but not true', { enable_rfq_module: true, rfq_email_connected: 'yes' }, false],
        ['module on, WhatsApp only', { enable_rfq_module: true, bot_waba_phone_number_id: '2' }, false],
        ['module on, legacy connected flag', { enable_rfq_module: true, rfq_email_connected: true }, true],
        ['module on, one account', { enable_rfq_module: true, rfq_email_accounts: [{ email: 'a@b.c' }] }, true],
    ])('%s', (_, settings, want) => {
        expect(emailUnreadEnabled(settings)).toBe(want);
    });
});

test('fallback poll interval is 30 seconds', () => {
    expect(UNREAD_POLL_MS).toBe(30000);
});
