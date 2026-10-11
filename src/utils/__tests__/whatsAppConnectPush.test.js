import eventEmitter from '../eventEmitter';
import { watchWhatsAppConnect } from '../whatsAppConnectPush';
import { dispatchSocketMessage } from '../WebSocketContext';

const settle = async () => { for (let i = 0; i < 3; i++) await new Promise((r) => setTimeout(r, 0)); };

describe('watchWhatsAppConnect', () => {
    afterEach(() => { delete global.fetch; });

    it('routes the pushed QR, connected and expired events of its own store', () => {
        const onQR = jest.fn(), onConnected = jest.fn(), onExpired = jest.fn();
        const w = watchWhatsAppConnect('s1', { onQR, onConnected, onExpired });
        dispatchSocketMessage({ event: 'whatsapp_connect', data: { store_id: 's2', qr_base64: 'X', qr_count: 1 } });
        dispatchSocketMessage({ event: 'whatsapp_connect', data: { store_id: 's1', qr_base64: 'Q', qr_count: 3 } });
        dispatchSocketMessage({ event: 'whatsapp_connect', data: { store_id: 's1', expired: true } });
        dispatchSocketMessage({ event: 'whatsapp_connect', data: { store_id: 's1', connected: true, phone: '966' } });
        expect(onQR).toHaveBeenCalledTimes(1);
        expect(onQR).toHaveBeenCalledWith('Q', 3);
        expect(onExpired).toHaveBeenCalledTimes(1);
        expect(onConnected).toHaveBeenCalledWith('966');
        w.stop();
        dispatchSocketMessage({ event: 'whatsapp_connect', data: { store_id: 's1', connected: true } });
        expect(onConnected).toHaveBeenCalledTimes(1);
    });

    it('reads the status and QR once after the WebSocket reconnects', async () => {
        global.fetch = jest.fn()
            .mockResolvedValueOnce({ json: () => Promise.resolve({ connected: false }) })
            .mockResolvedValueOnce({ json: () => Promise.resolve({ base64: 'QR', count: 2 }) });
        const onQR = jest.fn();
        const w = watchWhatsAppConnect('s1', { onQR });
        expect(global.fetch).not.toHaveBeenCalled();
        eventEmitter.emit('socket_connection_open');
        await settle();
        expect(global.fetch.mock.calls.map(c => c[0])).toEqual(['/v1/whatsapp/status?store_id=s1', '/v1/whatsapp/qr?store_id=s1']);
        expect(onQR).toHaveBeenCalledWith('QR', 2);
        w.stop();
    });

    it('reports a phone linked while the WebSocket was down', async () => {
        global.fetch = jest.fn().mockResolvedValue({ json: () => Promise.resolve({ connected: true, phone: '966' }) });
        const onConnected = jest.fn();
        const w = watchWhatsAppConnect('s1', { onConnected });
        eventEmitter.emit('socket_connection_open');
        await settle();
        expect(onConnected).toHaveBeenCalledWith('966');
        expect(global.fetch).toHaveBeenCalledTimes(1);
        w.stop();
    });
});
