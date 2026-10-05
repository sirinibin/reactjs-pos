import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, buildQuery, request } from './client';

const reply = (body: string, status = 200, type = 'application/json') => vi.stubGlobal('fetch', vi.fn(async () => new Response(body, { status, headers: { 'content-type': type } })));
afterEach(() => vi.unstubAllGlobals());

describe('buildQuery', () => {
  it('wraps search keys, drops empties, joins arrays', () => {
    expect(buildQuery({ search: { store_id: 'S', code: '', x: null as any, ids: ['a', 'b'] }, page: 2, sort: '-date' })).toBe('?search%5Bstore_id%5D=S&search%5Bids%5D=a%2Cb&page=2&sort=-date');
  });
});

describe('request', () => {
  it('returns the envelope on success', async () => {
    reply('{"status":true,"result":{"id":1}}');
    expect((await request('/v1/x')).result).toEqual({ id: 1 });
  });
  it('maps {errors} to ApiError.errors', async () => {
    reply('{"status":false,"errors":{"name":"Name is required"}}', 400);
    await expect(request('/v1/x')).rejects.toMatchObject({ status: 400, errors: { name: 'Name is required' } });
  });
  it('treats HTTP 200 + status:false with errors as failure', async () => {
    reply('{"status":false,"errors":{"code":"exists"}}');
    await expect(request('/v1/x')).rejects.toBeInstanceOf(ApiError);
  });
  it('treats HTTP 200 + status:false WITH a result and no errors as success (CreateProduct quirk)', async () => {
    reply('{"status":false,"result":{"id":"p1"}}');
    expect((await request('/v1/product', { method: 'POST' })).result).toEqual({ id: 'p1' });
  });
  it('understands {error} bodies sent as text/plain', async () => {
    reply('{"error":"LLM not configured"}', 400, 'text/plain');
    await expect(request('/v1/x')).rejects.toMatchObject({ message: 'LLM not configured' });
  });
  it('uses short plain-text bodies as the message', async () => {
    reply('not found or expired', 404, 'text/plain');
    await expect(request('/v1/x')).rejects.toMatchObject({ status: 404, message: 'not found or expired' });
  });
  it('maps network failures and 429', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    await expect(request('/v1/x')).rejects.toMatchObject({ status: 0 });
    reply('{}', 429);
    await expect(request('/v1/x')).rejects.toMatchObject({ status: 429 });
  });
  it('calls the unauthorized handler on 401', async () => {
    const { setUnauthorizedHandler } = await import('./client');
    const h = vi.fn();
    setUnauthorizedHandler(h);
    reply('{"status":false,"errors":{"access_token":"expired"}}', 401);
    await expect(request('/v1/x')).rejects.toBeInstanceOf(ApiError);
    expect(h).toHaveBeenCalled();
  });
});
