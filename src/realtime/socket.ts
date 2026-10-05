import { bus } from './bus';

/**
 * Store realtime channel: /v1/socket?userId=&deviceId= (admin.md §4).
 * Server → client messages are {event, data}; every event is forwarded to the bus.
 */
const DEVICE_KEY = 'device_id';

export function deviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `d-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return 'unknown-device';
  }
}

function deviceType(ua: string) {
  if (/iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(ua)) return 'Tablet';
  if (/Mobi|iPhone|Android/i.test(ua)) return 'Mobile';
  return 'Computer';
}

async function deviceInfo() {
  const nav = navigator as any;
  let battery = 'N/A';
  try { if (nav.getBattery) battery = String(Math.round((await nav.getBattery()).level * 100)); } catch { /* not available */ }
  return {
    device_id: deviceId(),
    fingerprint: deviceId(),
    user_agent: navigator.userAgent,
    platform: String(nav.userAgentData?.platform || navigator.platform || ''),
    screen_width: String(window.screen?.width || 0),
    screen_height: String(window.screen?.height || 0),
    cpu_cores: String(navigator.hardwareConcurrency || 'Unknown'),
    ram: String(nav.deviceMemory || 'Unknown'),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    touch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    battery,
    device_type: deviceType(navigator.userAgent),
    ip_address: '',
  };
}

export interface SocketHandle { close: () => void }

export function connectSocket(userId: string): SocketHandle {
  let ws: WebSocket | null = null;
  let closed = false;
  let attempts = 0;
  let ping: ReturnType<typeof setInterval> | undefined;
  let retry: ReturnType<typeof setTimeout> | undefined;

  const open = () => {
    if (closed) return;
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    try {
      ws = new WebSocket(`${proto}://${location.host}/v1/socket?userId=${encodeURIComponent(userId)}&deviceId=${encodeURIComponent(deviceId())}`);
    } catch {
      schedule();
      return;
    }
    ws.onopen = async () => {
      attempts = 0;
      bus.emit('socket_connection_open');
      try { ws?.send(JSON.stringify({ event: 'connection_open', data: await deviceInfo() })); } catch { /* ignore */ }
      const p = () => { try { ws?.send(JSON.stringify({ event: 'ping', data: { message: 'ping' } })); } catch { /* ignore */ } };
      p();
      ping = setInterval(p, 5 * 60 * 1000);
    };
    ws.onmessage = (m) => {
      try {
        const msg = JSON.parse(String(m.data));
        if (msg?.event && msg.event !== 'pong') bus.emit(msg.event, msg.data);
      } catch { /* non-JSON frame */ }
    };
    ws.onclose = () => { clearInterval(ping); schedule(); };
    ws.onerror = () => { try { ws?.close(); } catch { /* ignore */ } };
  };
  const schedule = () => {
    if (closed || attempts >= 50) return;
    attempts += 1;
    retry = setTimeout(open, Math.min(30000, 3000 * attempts));
  };
  open();
  return {
    close() {
      closed = true;
      clearInterval(ping);
      clearTimeout(retry);
      try { ws?.close(); } catch { /* ignore */ }
    },
  };
}

/** Server events → API list keys to refresh. */
export const EVENT_INVALIDATES: Record<string, string[]> = {
  sales_updated: ['/v1/order', '/v1/sales-payment'],
  sales_return_updated: ['/v1/sales-return'],
  purchase_updated: ['/v1/purchase', '/v1/purchase-payment'],
  purchase_return_updated: ['/v1/purchase-return'],
  quotation_updated: ['/v1/quotation'],
  quotationsales_return_updated: ['/v1/quotation-sales-return'],
  expense_updated: ['/v1/expense'],
  receivable_updated: ['/v1/customer-deposit'],
  payable_updated: ['/v1/customer-withdrawal'],
  stocktransfer_updated: ['/v1/stock-transfer'],
  purchase_order_updated: ['/v1/purchase-order'],
  user_status_change: ['/v1/user'],
  user_device_count_change: ['/v1/user'],
};
