import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/client';
import { errorMessage, mediaUrl, papi, qs } from './api';

const respond = (body: string, status = 200, type = 'application/json') => vi.stubGlobal('fetch', vi.fn(async () => new Response(body, { status, headers: { 'content-type': type } })));
afterEach(() => vi.unstubAllGlobals());

describe('procurement api helper', () => {
  it('builds plain query strings and drops empty values', () => {
    expect(qs({ store_id: 'S', page: 1, search: '', status: undefined, x: null })).toBe('?store_id=S&page=1');
    expect(qs()).toBe('');
  });
  it('reads {error} from text/plain bodies (http.Error)', async () => {
    respond('{"error":"Bot WhatsApp not connected"}\n', 400, 'text/plain; charset=utf-8');
    await expect(papi.post('/v1/x', {})).rejects.toSatisfy((e: unknown) => e instanceof ApiError && e.message === 'Bot WhatsApp not connected' && e.status === 400);
  });
  it('reads standard {status:false, errors} bodies', async () => {
    respond('{"status":false,"errors":{"store_id":"store_id is required"}}', 400);
    await expect(papi.get('/v1/rfq-suppliers')).rejects.toSatisfy((e: unknown) => e instanceof ApiError && e.errors.store_id === 'store_id is required');
  });
  it('treats 200 + {error} as a failure, plain text errors as messages', async () => {
    respond('{"error":"nope"}');
    await expect(papi.get('/v1/x')).rejects.toThrow('nope');
    respond('Failed to create Google Translate client', 500, 'text/plain');
    await expect(papi.post('/v1/translate', {})).rejects.toThrow('Failed to create Google Translate client');
  });
  it('returns non-standard success shapes untouched and sends the token + JSON', async () => {
    localStorage.setItem('access_token', 'tok');
    const f = vi.fn(async () => new Response('{"items":[],"total_count":0}', { status: 200 }));
    vi.stubGlobal('fetch', f);
    expect(await papi.get('/v1/rfq-received', { store_id: 'S' })).toEqual({ items: [], total_count: 0 });
    const [, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe('tok');
  });
  it('maps network failures and generic statuses to readable messages', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    await expect(papi.get('/v1/x')).rejects.toThrow(/Cannot reach the server/);
    expect(errorMessage(503, '')).toBe('Request failed (503)');
    expect(errorMessage(429, '')).toMatch(/Too many/);
    expect(errorMessage(500, '<html>oops</html>')).toBe('Request failed (500)');
  });
  it('resolves media urls', () => {
    expect(mediaUrl('/cdn/a.png')).toBe('/cdn/a.png');
    expect(mediaUrl('https://x/y.png')).toBe('https://x/y.png');
    expect(mediaUrl(undefined)).toBe('');
  });
});
