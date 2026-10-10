/**
 * Guard test: every snake_case translation key used in source via a literal
 * t('some_key' ...) call must exist in BOTH en/common.json and ar/common.json.
 *
 * Without this, i18next falls back to rendering the raw key (e.g. "looks_good",
 * "payment_method") on screen.
 *
 * Also checks for every such key that:
 *  - the {{placeholders}} in the English and Arabic values are identical sets
 *  - neither the English nor the Arabic value is just the raw key itself
 */

const fs   = require('fs');
const path = require('path');

const SRC_ROOT = path.join(__dirname, '../../');
const en = JSON.parse(fs.readFileSync(path.join(SRC_ROOT, 'i18n/locales/en/common.json'), 'utf8'));
const ar = JSON.parse(fs.readFileSync(path.join(SRC_ROOT, 'i18n/locales/ar/common.json'), 'utf8'));

const SNAKE_RE = /^[a-z0-9]+(_[a-z0-9]+)+$/;
const CALL_RE  = /\bt\(\s*["']([^"'\n]+)["']\s*[,)]/g;

function walk(dir, out) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        const rel  = path.relative(SRC_ROOT, full).split(path.sep).join('/');
        if (entry.isDirectory()) {
            if (entry.name === '__tests__' || entry.name === 'node_modules' || rel === 'i18n') continue;
            walk(full, out);
        } else if (entry.name.endsWith('.js') && !entry.name.includes('.test.')) {
            out.push({ full, rel });
        }
    }
    return out;
}

// Literal keys that point at another namespace (t('x', { ns: 'validation' }))
// are resolved there, not in common.json — skip those call sites.
function collectKeys() {
    const keys = new Map();
    for (const { full, rel } of walk(SRC_ROOT, [])) {
        const src = fs.readFileSync(full, 'utf8');
        let m;
        CALL_RE.lastIndex = 0;
        while ((m = CALL_RE.exec(src)) !== null) {
            const key = m[1];
            if (!SNAKE_RE.test(key)) continue;
            const tail = src.slice(m.index + m[0].length, m.index + m[0].length + 200);
            if (m[0].trim().endsWith(',') && /^\s*\{[^}]*\bns\s*:/.test(tail)) continue;
            if (!keys.has(key)) keys.set(key, new Set());
            keys.get(key).add(rel);
        }
    }
    return keys;
}

function placeholders(value) {
    const set = new Set();
    const re = /\{\{\s*([^}\s]+)\s*\}\}/g;
    let m;
    while ((m = re.exec(String(value))) !== null) set.add(m[1]);
    return [...set].sort();
}

const KEYS = collectKeys();
const SORTED = [...KEYS.keys()].sort();

describe('snake_case t() keys used in source', () => {
    test('scanner finds a meaningful number of snake_case keys', () => {
        expect(SORTED.length).toBeGreaterThan(100);
    });

    test('every key exists in en/common.json', () => {
        const missing = SORTED
            .filter(k => typeof en[k] !== 'string' || en[k].length === 0)
            .map(k => `${k}  (${[...KEYS.get(k)].join(', ')})`);
        expect(missing).toEqual([]);
    });

    test('every key exists in ar/common.json', () => {
        const missing = SORTED
            .filter(k => typeof ar[k] !== 'string' || ar[k].length === 0)
            .map(k => `${k}  (${[...KEYS.get(k)].join(', ')})`);
        expect(missing).toEqual([]);
    });

    test('en and ar values use identical {{placeholder}} sets', () => {
        const mismatched = SORTED
            .filter(k => typeof en[k] === 'string' && typeof ar[k] === 'string')
            .filter(k => placeholders(en[k]).join(',') !== placeholders(ar[k]).join(','))
            .map(k => `${k}: en=[${placeholders(en[k])}] ar=[${placeholders(ar[k])}]`);
        expect(mismatched).toEqual([]);
    });

    test('no en/ar value is just its own raw snake_case key', () => {
        const raw = SORTED.filter(k => en[k] === k || ar[k] === k);
        expect(raw).toEqual([]);
    });
});
