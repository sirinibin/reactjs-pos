/**
 * Unit tests for the refreshTrigger prop added to ProductIndex (product/index.js).
 *
 * Change: a new useEffect was added:
 *   useEffect(() => { if (props.refreshTrigger) list(); }, [props.refreshTrigger]);
 *
 * This lets a parent component (e.g. Products modal) force a list refresh by
 * incrementing `refreshTrigger` without remounting ProductIndex.
 *
 * Key invariants:
 *  1. The effect is guarded by `if (props.refreshTrigger)` → does NOT call list()
 *     when refreshTrigger is 0 / undefined / null (prevents spurious fetch on mount).
 *  2. Any truthy value of refreshTrigger triggers list().
 *  3. The effect depends on [props.refreshTrigger] (runs once per value change).
 */

const fs   = require('fs');
const path = require('path');

const PRODUCT_INDEX_JS = fs.readFileSync(
    path.join(__dirname, '../index.js'), 'utf8'
);


// ─── 1. Source presence ───────────────────────────────────────────────────────

describe('ProductIndex — refreshTrigger useEffect present in source', () => {
    test('useEffect with props.refreshTrigger guard is in source', () => {
        expect(PRODUCT_INDEX_JS).toMatch(
            /useEffect\(\s*\(\)\s*=>\s*\{\s*if\s*\(props\.refreshTrigger\)\s*list\(\)/
        );
    });

    test('refreshTrigger is in the dependency array [props.refreshTrigger]', () => {
        expect(PRODUCT_INDEX_JS).toMatch(/\[props\.refreshTrigger\]/);
    });

    test('the guard uses if(props.refreshTrigger) not if(!props.refreshTrigger)', () => {
        // Must be the positive guard (truthy) not a negation
        expect(PRODUCT_INDEX_JS).toMatch(/if\s*\(props\.refreshTrigger\)\s*list\(\)/);
        expect(PRODUCT_INDEX_JS).not.toMatch(/if\s*\(!props\.refreshTrigger\)\s*list\(\)/);
    });

    test('at least one other useEffect (for initialization) is present', () => {
        // ProductIndex has multiple useEffects beyond the refreshTrigger one
        const allEffects = (PRODUCT_INDEX_JS.match(/useEffect\(/g) || []).length;
        expect(allEffects).toBeGreaterThan(1);
    });
});


// ─── 2. Guard logic — pure function mirror ────────────────────────────────────

// Mirrors: if (props.refreshTrigger) list();
function shouldCallList(refreshTrigger) {
    return !!refreshTrigger;
}

describe('refreshTrigger guard — truthy/falsy boundary', () => {
    test('0 → does NOT trigger list (initial state, prevents double-fetch on mount)', () => {
        expect(shouldCallList(0)).toBe(false);
    });

    test('undefined → does NOT trigger list', () => {
        expect(shouldCallList(undefined)).toBe(false);
    });

    test('null → does NOT trigger list', () => {
        expect(shouldCallList(null)).toBe(false);
    });

    test('1 → triggers list (first increment from parent)', () => {
        expect(shouldCallList(1)).toBe(true);
    });

    test('2 → triggers list (second increment)', () => {
        expect(shouldCallList(2)).toBe(true);
    });

    test('any positive integer triggers list', () => {
        [1, 2, 3, 5, 10, 100, 999].forEach(n => {
            expect(shouldCallList(n)).toBe(true);
        });
    });

    test('false → does NOT trigger list', () => {
        expect(shouldCallList(false)).toBe(false);
    });
});


// ─── 3. Increment behaviour ───────────────────────────────────────────────────

// Mirrors the parent's: setServiceRefreshKey(k => k + 1)
function makeRefreshTrigger() {
    let key = 0;
    return {
        increment() { key = key + 1; },
        value()    { return key; },
    };
}

describe('refreshTrigger increment sequence', () => {
    test('key starts at 0 (falsy — no initial list call)', () => {
        const t = makeRefreshTrigger();
        expect(shouldCallList(t.value())).toBe(false);
    });

    test('after first increment key is 1 (truthy — list called)', () => {
        const t = makeRefreshTrigger();
        t.increment();
        expect(t.value()).toBe(1);
        expect(shouldCallList(t.value())).toBe(true);
    });

    test('each subsequent increment also triggers list', () => {
        const t = makeRefreshTrigger();
        for (let i = 1; i <= 5; i++) {
            t.increment();
            expect(t.value()).toBe(i);
            expect(shouldCallList(t.value())).toBe(true);
        }
    });

    test('key is strictly monotonically increasing', () => {
        const t = makeRefreshTrigger();
        let prev = t.value();
        for (let i = 0; i < 10; i++) {
            t.increment();
            expect(t.value()).toBeGreaterThan(prev);
            prev = t.value();
        }
    });
});
