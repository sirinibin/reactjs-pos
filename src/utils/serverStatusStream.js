// Server status pushed by the health monitor instead of fetched on a timer.
//
// GET /health-monitor/status/stream stays open and sends the status of both
// environments when it opens and again only when it changes (server-sent
// events, read with fetch so the token stays in the Authorization header).
// The health monitor runs apart from the main API, so this keeps working
// while the API, MongoDB or Redis are down; the WebSocket would not.
//
// watchServerStatus(handlers) returns { stop() }. handlers:
//   onStatus(data)    each status the server sends
//   onDenied(status)  401/403: not retried
//   onError(message)  the stream could not be opened or broke; it reconnects
// A stream that ends (the token expired, the health monitor restarted) is
// reopened after a short wait that grows while it keeps failing.

const RETRY_FIRST_MS = 1000;
const RETRY_MAX_MS = 30000;

export function parseEventStream(buffer) {
    // Returns { events: [{event, data}], rest } for the complete frames in buffer.
    const events = [];
    const frames = buffer.split(/\r?\n\r?\n/);
    const rest = frames.pop();
    for (const frame of frames) {
        let event = 'message';
        const data = [];
        for (const line of frame.split(/\r?\n/)) {
            if (!line || line.startsWith(':')) continue;
            const i = line.indexOf(':');
            const field = i < 0 ? line : line.slice(0, i);
            const value = i < 0 ? '' : line.slice(i + 1).replace(/^ /, '');
            if (field === 'event') event = value;
            else if (field === 'data') data.push(value);
        }
        if (data.length) events.push({ event, data: data.join('\n') });
    }
    return { events, rest };
}

export function watchServerStatus({ onStatus, onDenied, onError } = {}) {
    let stopped = false;
    let controller = null;
    let retryTimer = null;
    let retryMs = RETRY_FIRST_MS;

    const scheduleRetry = () => {
        if (stopped) return;
        retryTimer = setTimeout(open, retryMs);
        retryMs = Math.min(retryMs * 2, RETRY_MAX_MS);
    };

    async function readOnce() {
        try {
            const token = localStorage.getItem('access_token');
            const r = await fetch('/health-monitor/status', { headers: { Authorization: `Bearer ${token}` } });
            if (stopped) return;
            if (r.status === 401 || r.status === 403) { onDenied?.(r.status); return; }
            if (!r.ok) { onError?.(`Health monitor returned HTTP ${r.status}. Is it running?`); return; }
            onStatus?.(await r.json());
        } catch (_) {
            if (!stopped) onError?.('Cannot reach the health monitor. Check nginx and the service.');
        }
    }

    async function open() {
        retryTimer = null;
        if (stopped) return;
        controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        let resp;
        try {
            const token = localStorage.getItem('access_token');
            resp = await fetch('/health-monitor/status/stream', {
                headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
                signal: controller?.signal,
            });
        } catch (_) {
            if (stopped) return;
            onError?.('Cannot reach the health monitor. Check nginx and the service.');
            scheduleRetry();
            return;
        }
        if (stopped) return;
        if (resp.status === 401 || resp.status === 403) {
            onDenied?.(resp.status);
            return;
        }
        if (resp.status === 404) {
            // A health monitor deployed before the stream existed: show its
            // status once (not live) rather than nothing.
            readOnce();
            return;
        }
        if (!resp.ok || !resp.body?.getReader) {
            onError?.(`Health monitor returned HTTP ${resp.status}. Is it running?`);
            scheduleRetry();
            return;
        }

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        try {
            for (;;) {
                const { value, done } = await reader.read();
                if (done || stopped) break;
                buffer += decoder.decode(value, { stream: true });
                const parsed = parseEventStream(buffer);
                buffer = parsed.rest;
                for (const e of parsed.events) {
                    if (e.event !== 'status') continue;
                    let data;
                    try { data = JSON.parse(e.data); } catch (_) { continue; }
                    retryMs = RETRY_FIRST_MS; // a working stream resets the wait
                    if (!stopped) onStatus?.(data);
                }
            }
        } catch (_) {
            // broken connection: reopened below
        }
        if (!stopped) scheduleRetry();
    }

    open();

    return {
        stop() {
            stopped = true;
            if (retryTimer) clearTimeout(retryTimer);
            try { controller?.abort(); } catch (_) { }
        },
    };
}
