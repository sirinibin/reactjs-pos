// Which header unread feeds a store can have anything in. Both feeds belong to
// the RFQ module; WhatsApp also needs a Meta Cloud API number, email a connected
// account. The Topbar polls /v1/rfq-whatsapp-unread and /v1/email-unread only
// when these return true (pos-rest models.UnreadFeedsEnabled applies the same rule).

function hasText(v) {
    return typeof v === 'string' && v.trim() !== '';
}

export function whatsAppUnreadEnabled(settings) {
    if (!settings || settings.enable_rfq_module !== true) return false;
    return hasText(settings.store_rfq_waba_phone_number_id) || hasText(settings.bot_waba_phone_number_id);
}

export function emailUnreadEnabled(settings) {
    if (!settings || settings.enable_rfq_module !== true) return false;
    return settings.rfq_email_connected === true
        || (Array.isArray(settings.rfq_email_accounts) && settings.rfq_email_accounts.length > 0);
}

// The fallback poll interval for both feeds (WebSocket events drive the rest).
export const UNREAD_POLL_MS = 30 * 1000;
