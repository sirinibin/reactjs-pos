import { buildQuery, sortParam, errorSummary, timezoneOffsetHours, request, ApiError, onUnauthorized } from '../../api/client';

describe('buildQuery', () => {
    it('encodes search keys as search[field]=value', () => {
        expect(buildQuery({ search: { name: 'Bosch', code: 'B 1' } })).toBe('search[name]=Bosch&search[code]=B%201');
    });

    it('skips blank, null, undefined and empty-array values', () => {
        expect(buildQuery({ search: { a: '', b: null, c: undefined, d: [], e: 0 } })).toBe('search[e]=0');
    });

    it('joins arrays with commas (multi-select ids)', () => {
        expect(buildQuery({ search: { created_by: ['x', 'y'] } })).toBe('search[created_by]=x%2Cy');
    });

    it('appends plain params after search params', () => {
        expect(buildQuery({ search: { store_id: 's1' }, params: { sort: '-created_at', page: 2, limit: 20 } }))
            .toBe('search[store_id]=s1&sort=-created_at&page=2&limit=20');
    });

    it('escapes special characters in keys and values', () => {
        expect(buildQuery({ search: { 'a&b': 'x=y' } })).toBe('search[a%26b]=x%3Dy');
    });

    it('returns an empty string for no input', () => {
        expect(buildQuery()).toBe('');
        expect(buildQuery({})).toBe('');
    });
});

describe('sortParam', () => {
    it('prefixes descending with "-"', () => {
        expect(sortParam({ key: 'created_at', dir: 'desc' })).toBe('-created_at');
    });
    it('leaves ascending bare', () => {
        expect(sortParam({ key: 'name', dir: 'asc' })).toBe('name');
    });
    it('returns empty for no sort', () => {
        expect(sortParam(null)).toBe('');
        expect(sortParam({})).toBe('');
    });
});

describe('errorSummary', () => {
    it('joins field messages', () => {
        expect(errorSummary({ name: 'Name is required', code: 'Code is required' })).toBe('Name is required Code is required');
    });
    it('passes strings through', () => {
        expect(errorSummary('boom')).toBe('boom');
    });
    it('falls back when there are no usable messages', () => {
        expect(errorSummary({ a: '' }, 'fallback')).toBe('fallback');
        expect(errorSummary(null, 'fallback')).toBe('fallback');
    });
});

describe('timezoneOffsetHours', () => {
    it('converts getTimezoneOffset minutes to hours', () => {
        expect(timezoneOffsetHours({ getTimezoneOffset: () => -180 })).toBe(-3);
        expect(timezoneOffsetHours({ getTimezoneOffset: () => 330 })).toBe(5.5);
    });
});

describe('request', () => {
    const realFetch = global.fetch;
    afterEach(() => { global.fetch = realFetch; onUnauthorized(null); localStorage.clear(); });

    function mockFetch(status, body, contentType = 'application/json') {
        global.fetch = jest.fn().mockResolvedValue({
            ok: status >= 200 && status < 300,
            status,
            headers: { get: () => contentType },
            json: () => Promise.resolve(body),
        });
    }

    it('sends the raw token and JSON body', async () => {
        localStorage.setItem('access_token', 'tok123');
        mockFetch(200, { status: true, result: { id: 1 } });
        const res = await request('POST', '/v1/x', { query: 'a=1', body: { n: 1 } });
        expect(res.result.id).toBe(1);
        const [url, opts] = global.fetch.mock.calls[0];
        expect(url).toBe('/v1/x?a=1');
        expect(opts.headers.Authorization).toBe('tok123');
        expect(opts.body).toBe('{"n":1}');
    });

    it('uses & when the path already has a query', async () => {
        mockFetch(200, { status: true });
        await request('GET', '/v1/x?select=id', { query: 'page=1' });
        expect(global.fetch.mock.calls[0][0]).toBe('/v1/x?select=id&page=1');
    });

    it('throws ApiError with field errors on 4xx', async () => {
        mockFetch(400, { status: false, errors: { name: 'Name is required' } });
        await expect(request('POST', '/v1/x', { body: {} })).rejects.toMatchObject({
            name: 'ApiError', status: 400, errors: { name: 'Name is required' }, message: 'Name is required',
        });
    });

    it('treats status:false in a 200 response as an error', async () => {
        mockFetch(200, { status: false, errors: { code: 'Code already exists' } });
        await expect(request('GET', '/v1/x')).rejects.toBeInstanceOf(ApiError);
    });

    it('calls the unauthorized handler only for access_token errors', async () => {
        const handler = jest.fn();
        onUnauthorized(handler);
        mockFetch(401, { status: false, errors: { access_token: 'expired' } });
        await expect(request('GET', '/v1/x')).rejects.toBeInstanceOf(ApiError);
        expect(handler).toHaveBeenCalledTimes(1);

        mockFetch(401, { status: false, errors: { password: 'wrong' } });
        await expect(request('GET', '/v1/x')).rejects.toBeInstanceOf(ApiError);
        expect(handler).toHaveBeenCalledTimes(1);
    });

    it('reports network failures as a readable error', async () => {
        global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));
        await expect(request('GET', '/v1/x')).rejects.toMatchObject({ status: 0, message: expect.stringMatching(/cannot reach the server/i) });
    });

    it('re-throws AbortError untouched', async () => {
        const abort = new Error('aborted');
        abort.name = 'AbortError';
        global.fetch = jest.fn().mockRejectedValue(abort);
        await expect(request('GET', '/v1/x')).rejects.toBe(abort);
    });

    it('handles non-JSON error bodies', async () => {
        mockFetch(502, null, 'text/html');
        await expect(request('GET', '/v1/x')).rejects.toMatchObject({ status: 502, message: 'Request failed (502)' });
    });
});
