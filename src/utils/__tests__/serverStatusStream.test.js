import { parseEventStream, watchServerStatus } from '../serverStatusStream';

if (typeof global.TextDecoder === 'undefined') {
    global.TextDecoder = require('util').TextDecoder;
}
const encoder = new (require('util').TextEncoder)();

// A response whose body hands out the given chunks, then stays open until
// close() (or ends at once with endAfter).
function streamResponse(chunks, { endAfter = false } = {}) {
    const queue = chunks.map((c) => encoder.encode(c));
    let wake = null;
    let closed = endAfter;
    const reader = {
        read: () => new Promise((resolve) => {
            const next = () => {
                if (queue.length) resolve({ value: queue.shift(), done: false });
                else if (closed) resolve({ value: undefined, done: true });
                else wake = next;
            };
            next();
        }),
    };
    return {
        ok: true,
        status: 200,
        body: { getReader: () => reader },
        push(chunk) { queue.push(encoder.encode(chunk)); if (wake) { const w = wake; wake = null; w(); } },
        close() { closed = true; if (wake) { const w = wake; wake = null; w(); } },
    };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('parseEventStream', () => {
    it('reads complete frames, skips pings and keeps a partial frame', () => {
        const { events, rest } = parseEventStream(': ping\n\nevent: status\ndata: {"a":1}\n\nevent: status\ndata: {"a"');
        expect(events).toEqual([{ event: 'status', data: '{"a":1}' }]);
        expect(rest).toBe('event: status\ndata: {"a"');
    });

    it('joins multi-line data and handles CRLF', () => {
        const { events } = parseEventStream('event: status\r\ndata: x\r\ndata: y\r\n\r\n');
        expect(events).toEqual([{ event: 'status', data: 'x\ny' }]);
    });
});

describe('watchServerStatus', () => {
    beforeEach(() => {
        localStorage.setItem('access_token', 'tok');
    });
    afterEach(() => {
        jest.useRealTimers();
        delete global.fetch;
    });

    it('opens one stream with the token in the header and hands over each pushed status', async () => {
        const resp = streamResponse(['event: status\ndata: {"production":{"overall":"running"}}\n\n']);
        global.fetch = jest.fn().mockResolvedValue(resp);
        const onStatus = jest.fn();
        const w = watchServerStatus({ onStatus });
        await flush(); await flush();

        expect(global.fetch).toHaveBeenCalledTimes(1);
        const [url, opts] = global.fetch.mock.calls[0];
        expect(url).toBe('/health-monitor/status/stream');
        expect(opts.headers.Authorization).toBe('Bearer tok');
        expect(onStatus).toHaveBeenLastCalledWith({ production: { overall: 'running' } });

        // A change split across two chunks arrives as one status.
        resp.push('event: status\ndata: {"production":');
        resp.push('{"overall":"down"}}\n\n');
        await flush(); await flush();
        expect(onStatus).toHaveBeenLastCalledWith({ production: { overall: 'down' } });
        expect(onStatus).toHaveBeenCalledTimes(2);
        expect(global.fetch).toHaveBeenCalledTimes(1); // pushed, never fetched again
        w.stop();
    });

    it('does not retry when access is denied', async () => {
        jest.useFakeTimers();
        global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 403 });
        const onDenied = jest.fn();
        watchServerStatus({ onDenied });
        for (let i = 0; i < 5; i++) await Promise.resolve();
        expect(onDenied).toHaveBeenCalledWith(403);
        jest.advanceTimersByTime(120000);
        expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('reopens a stream that ended, waiting longer while it keeps failing', async () => {
        jest.useFakeTimers();
        global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 502 });
        const onError = jest.fn();
        const w = watchServerStatus({ onError });
        const settle = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };
        await settle();
        expect(onError).toHaveBeenCalledWith(expect.stringContaining('502'));
        expect(global.fetch).toHaveBeenCalledTimes(1);

        jest.advanceTimersByTime(999); await settle();
        expect(global.fetch).toHaveBeenCalledTimes(1);
        jest.advanceTimersByTime(1); await settle();
        expect(global.fetch).toHaveBeenCalledTimes(2);
        jest.advanceTimersByTime(1999); await settle();
        expect(global.fetch).toHaveBeenCalledTimes(2);
        jest.advanceTimersByTime(1); await settle();
        expect(global.fetch).toHaveBeenCalledTimes(3);

        w.stop();
        jest.advanceTimersByTime(120000); await settle();
        expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('reopens after the server closes the stream (token expiry, monitor restart)', async () => {
        jest.useFakeTimers();
        const first = streamResponse(['event: status\ndata: {"n":1}\n\n'], { endAfter: true });
        const second = streamResponse(['event: status\ndata: {"n":2}\n\n']);
        global.fetch = jest.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(second);
        const onStatus = jest.fn();
        const w = watchServerStatus({ onStatus });
        const settle = async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); };
        await settle();
        expect(onStatus).toHaveBeenLastCalledWith({ n: 1 });
        jest.advanceTimersByTime(1000); await settle();
        expect(global.fetch).toHaveBeenCalledTimes(2);
        expect(onStatus).toHaveBeenLastCalledWith({ n: 2 });
        w.stop();
    });

    it('stop() aborts the open stream', async () => {
        const resp = streamResponse([]);
        let signal;
        global.fetch = jest.fn((url, opts) => { signal = opts.signal; return Promise.resolve(resp); });
        const w = watchServerStatus({});
        await flush();
        w.stop();
        expect(signal.aborted).toBe(true);
    });
});
