import fs from 'fs';
import path from 'path';
import { apiBaseURL, API_BY_HOST } from './apiBaseURL';

describe('apiBaseURL', () => {
    it.each([
        ['startpos.gulfunionozone.com', 'https://startpos-api.gulfunionozone.com'],
        ['workshop.gulfunionozone.com', 'https://startpos-api.gulfunionozone.com'],
        ['test.gulfunionozone.com', 'https://startpos-api-test.gulfunionozone.com'],
    ])('maps the %s site to its own API', (host, api) => {
        expect(apiBaseURL(host, 'http://127.0.0.1:2000', `https://${host}`)).toBe(api);
    });

    it('ignores the baked-in URL on a known site (one build serves both)', () => {
        expect(apiBaseURL('test.gulfunionozone.com', 'https://startpos-api.gulfunionozone.com', ''))
            .toBe('https://startpos-api-test.gulfunionozone.com');
        expect(apiBaseURL('startpos.gulfunionozone.com', 'https://startpos-api-test.gulfunionozone.com', ''))
            .toBe('https://startpos-api.gulfunionozone.com');
    });

    it('tolerates case, www., a trailing dot and spaces', () => {
        expect(apiBaseURL('  WWW.Test.GulfUnionOzone.com. ', '', '')).toBe('https://startpos-api-test.gulfunionozone.com');
    });

    it('never lets the test site point at production, or the reverse', () => {
        expect(API_BY_HOST['test.gulfunionozone.com']).not.toMatch(/\/\/startpos-api\./);
        expect(API_BY_HOST['startpos.gulfunionozone.com']).not.toMatch(/-test\./);
    });

    it('uses the build setting on other hosts (local dev)', () => {
        expect(apiBaseURL('localhost', 'http://127.0.0.1:2000', 'http://localhost:3004')).toBe('http://127.0.0.1:2000');
        expect(apiBaseURL('localhost', 'http://127.0.0.1:2000/', 'http://localhost:3004')).toBe('http://127.0.0.1:2000');
    });

    it('falls back to the page origin when nothing is set', () => {
        expect(apiBaseURL('example.org', '', 'https://example.org')).toBe('https://example.org');
        expect(apiBaseURL('example.org', null, 'https://example.org/')).toBe('https://example.org');
        expect(apiBaseURL('', null, '')).toBe('');
        expect(apiBaseURL(null, null, null)).toBe('');
    });

    it('reads window.location by default', () => {
        // jsdom serves the page from http://localhost
        expect(apiBaseURL(undefined, '')).toBe(window.location.origin);
    });

    it('is the only place the frontend reads REACT_APP_API_URL', () => {
        const src = path.join(__dirname, '..');
        const offenders = [];
        const walk = (dir) => {
            for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
                const p = path.join(dir, f.name);
                if (f.isDirectory()) walk(p);
                else if (/\.(js|jsx)$/.test(f.name) && !/\.test\.jsx?$/.test(f.name)
                    && p !== path.join(__dirname, 'apiBaseURL.js')
                    && fs.readFileSync(p, 'utf8').includes('process.env.REACT_APP_API_URL')) {
                    offenders.push(path.relative(src, p));
                }
            }
        };
        walk(src);
        expect(offenders).toEqual([]);
    });
});
