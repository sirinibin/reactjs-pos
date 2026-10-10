/**
 * Helpers for testing the read-only "view" (details) modals: each is a
 * forwardRef component opened with ref.open(id) that GETs /v1/<entity>/<id>
 * and renders `data.result`.
 */
import React from 'react';
import { render, act } from '@testing-library/react';

export const jsonResponse = (body, { ok = true, status = 200 } = {}) => ({
    ok,
    status,
    headers: { get: () => 'application/json' },
    json: () => Promise.resolve(body),
});

export const flush = async (rounds = 15) => {
    for (let i = 0; i < rounds; i++) {
        // eslint-disable-next-line no-await-in-loop
        await Promise.resolve();
    }
};

/**
 * Render `Component`, then ref.open(id, ...extraOpenArgs).
 * `respond` is either a result object (wrapped as {result}) or a function
 * (url, opts) => response.
 */
export async function openView(Component, { id = 'id-1', result = {}, respond, props = {}, openArgs = [] } = {}) {
    global.fetch = jest.fn(respond || (() => Promise.resolve(jsonResponse({ result }))));
    const ref = React.createRef();
    const utils = render(<Component ref={ref} {...props} />);
    await act(async () => {
        ref.current.open(id, ...openArgs);
        await flush();
    });
    return { ref, ...utils };
}

/** Response helpers for the empty/error cases. */
export const notFound = () => Promise.resolve(jsonResponse({ errors: { id: 'not found' } }, { ok: false, status: 404 }));
export const unauthorized = () => Promise.resolve(jsonResponse({ errors: { access_token: 'expired' } }, { ok: false, status: 401 }));
export const networkError = () => Promise.reject(new TypeError('Failed to fetch'));

/** Visible text (react-bootstrap renders modals in a portal under <body>). */
export const modalText = () => document.body.textContent;

/** Common setup: token + store in localStorage, quiet console. */
export function setupViewEnv() {
    beforeEach(() => {
        localStorage.clear();
        localStorage.setItem('access_token', 'tok');
        localStorage.setItem('store_id', 'store-1');
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});
    });
    afterEach(() => {
        jest.restoreAllMocks();
    });
}

/**
 * Standard cases for a details modal:
 *  - GET <endpoint>/<id> with the store filter and the token
 *  - every `expectTexts` entry is rendered for a realistic model
 *  - an empty result renders the `emptyTexts` placeholders without crashing
 *  - 404 / 401 / network failure leave the modal usable (no throw)
 *
 * cfg = { Component, endpoint, model, expectTexts, emptyTexts?, expectedUrl?,
 *         wrapResult?(model) => body, skipNetworkError? }
 */
export function describeViewModal(cfg) {
    const { Component, endpoint, model } = cfg;
    const body = (m) => (cfg.wrapResult ? cfg.wrapResult(m) : { status: true, result: m });
    const respondWith = (m) => () => Promise.resolve(jsonResponse(body(m)));

    test('GETs the record by id with the store filter and auth token', async () => {
        await openView(Component, { id: 'rec-42', respond: respondWith(model) });
        const [url, opts] = global.fetch.mock.calls[0];
        expect(url).toBe(cfg.expectedUrl || `${endpoint}/rec-42?search[store_id]=store-1`);
        expect((opts.headers || {}).Authorization).toBe('tok');
    });

    test('renders the key fields of a realistic record', async () => {
        await openView(Component, { respond: respondWith(model) });
        const text = modalText();
        cfg.expectTexts.forEach(s => expect(text).toContain(s));
    });

    test('empty record renders placeholders without crashing', async () => {
        await openView(Component, { respond: respondWith({}) });
        const text = modalText();
        (cfg.emptyTexts || []).forEach(s => expect(text).toContain(s));
        expect(text).not.toContain('[object Object]');
    });

    test.each([
        ['404', notFound],
        ['401', unauthorized],
    ])('%s response does not crash the modal', async (_, respond) => {
        await openView(Component, { respond });
        expect(document.querySelector('.modal')).not.toBeNull();
    });

    if (!cfg.skipNetworkError) {
        test('network error does not crash the modal', async () => {
            await openView(Component, { respond: networkError });
            expect(document.querySelector('.modal')).not.toBeNull();
        });
    }
}
