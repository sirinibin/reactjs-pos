import eventEmitter from "./eventEmitter";

// Follows a WhatsApp (Evolution API) connect by server push. After
// POST /v1/whatsapp/connect the API watches the new instance and sends
// "whatsapp_connect" to the user who started it:
//   { store_id, qr_base64, qr_count }  a new QR to show
//   { store_id, connected, phone }     the phone is linked
//   { store_id, expired }              the server stopped waiting
// After a WebSocket reconnect (events may have been missed) it reads the status
// and the QR once. Returns { stop() }.
export function watchWhatsAppConnect(storeId, { onQR, onConnected, onExpired }) {
    let stopped = false;

    const onEvent = (data) => {
        if (stopped || !data || data.store_id !== storeId) return;
        if (data.connected) onConnected?.(data.phone || '');
        else if (data.expired) onExpired?.();
        else if (data.qr_base64) onQR?.(data.qr_base64, data.qr_count);
    };

    const catchUp = async () => {
        try {
            const headers = { Authorization: localStorage.getItem('access_token') };
            const status = await fetch(`/v1/whatsapp/status?store_id=${storeId}`, { headers }).then(r => r.json());
            if (stopped) return;
            if (status.connected) { onConnected?.(status.phone || ''); return; }
            const qr = await fetch(`/v1/whatsapp/qr?store_id=${storeId}`, { headers }).then(r => r.json());
            if (!stopped && qr.base64) onQR?.(qr.base64, qr.count);
        } catch (e) {
            console.error('WhatsApp status read failed:', e);
        }
    };

    eventEmitter.on("whatsapp_connect", onEvent);
    eventEmitter.on("socket_connection_open", catchUp);
    return {
        stop() {
            stopped = true;
            eventEmitter.off("whatsapp_connect", onEvent);
            eventEmitter.off("socket_connection_open", catchUp);
        },
    };
}
