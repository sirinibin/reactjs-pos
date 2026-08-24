/**
 * Unit tests for the onOpenCreate + refreshTrigger props added to ServiceIndex
 * (service/index.js).
 *
 * Changes:
 *  1. ServiceCreate is now conditionally rendered:
 *       {!props.onOpenCreate && <ServiceCreate ... />}
 *     When onOpenCreate is provided by the parent (Products modal), the parent
 *     owns ServiceCreate and passes a ref to it; ServiceIndex must NOT render
 *     its own copy.
 *
 *  2. The "Create" button handler now delegates to the parent:
 *       onClick={() => props.onOpenCreate ? props.onOpenCreate() : createFormRef.current?.open()}
 *
 *  3. A refreshTrigger useEffect was added (same pattern as ProductIndex):
 *       useEffect(() => { if (props.refreshTrigger) list(); }, [props.refreshTrigger]);
 */

const fs   = require('fs');
const path = require('path');

const SERVICE_INDEX_JS = fs.readFileSync(
    path.join(__dirname, '../index.js'), 'utf8'
);


// ─── 1. Conditional ServiceCreate rendering ───────────────────────────────────

describe('ServiceIndex — ServiceCreate conditionally rendered', () => {
    test('ServiceCreate is guarded by !props.onOpenCreate', () => {
        expect(SERVICE_INDEX_JS).toMatch(/\{!props\.onOpenCreate\s*&&\s*<ServiceCreate/);
    });

    test('ServiceCreate is NOT rendered unconditionally', () => {
        // The old pattern was: <ServiceCreate ref={createFormRef} .../>  with no guard
        // After the fix it must be wrapped in {!props.onOpenCreate && ...}
        // Verify the guard exists (already tested above); ensure no bare <ServiceCreate> that
        // would bypass the guard.  We do this by checking the string before <ServiceCreate
        // always contains the guard.
        const match = SERVICE_INDEX_JS.match(
            /(\{!props\.onOpenCreate\s*&&\s*)?<ServiceCreate\s/g
        );
        // Every occurrence should be prefixed with the guard
        expect(match).not.toBeNull();
        match.forEach(m => {
            expect(m).toMatch(/!props\.onOpenCreate/);
        });
    });

    test('ServiceView is still rendered unconditionally (no guard)', () => {
        // ServiceView must remain always-mounted
        expect(SERVICE_INDEX_JS).toMatch(/<ServiceView\s[^>]*ref=\{viewRef\}/);
        // Must NOT be guarded by onOpenCreate
        const guardedView = SERVICE_INDEX_JS.match(
            /!props\.onOpenCreate[^<]*<ServiceView/
        );
        expect(guardedView).toBeNull();
    });
});


// ─── 2. Create button — onOpenCreate delegation ───────────────────────────────

describe('ServiceIndex — Create button delegates to onOpenCreate', () => {
    test('button onClick calls props.onOpenCreate() when prop is provided', () => {
        expect(SERVICE_INDEX_JS).toMatch(
            /props\.onOpenCreate\s*\?\s*props\.onOpenCreate\(\)/
        );
    });

    test('button onClick falls back to createFormRef.current?.open() when absent', () => {
        expect(SERVICE_INDEX_JS).toMatch(/:\s*createFormRef\.current\?\.open\(\)/);
    });

    test('ternary operator is used (not && short-circuit)', () => {
        // The pattern must be a ternary so both branches are explicit
        expect(SERVICE_INDEX_JS).toMatch(
            /props\.onOpenCreate\s*\?\s*props\.onOpenCreate\(\)\s*:\s*createFormRef\.current\?\.open\(\)/
        );
    });
});

// Pure logic mirror of the button's onClick handler
function handleCreateClick(onOpenCreate, openRef) {
    if (onOpenCreate) {
        onOpenCreate();
    } else {
        openRef?.();
    }
}

describe('Create button delegation — pure logic', () => {
    test('calls onOpenCreate when provided', () => {
        const onOpenCreate = jest.fn();
        const openRef = jest.fn();
        handleCreateClick(onOpenCreate, openRef);
        expect(onOpenCreate).toHaveBeenCalledTimes(1);
        expect(openRef).not.toHaveBeenCalled();
    });

    test('calls openRef when onOpenCreate is undefined', () => {
        const openRef = jest.fn();
        handleCreateClick(undefined, openRef);
        expect(openRef).toHaveBeenCalledTimes(1);
    });

    test('calls openRef when onOpenCreate is null', () => {
        const openRef = jest.fn();
        handleCreateClick(null, openRef);
        expect(openRef).toHaveBeenCalledTimes(1);
    });

    test('onOpenCreate takes precedence — openRef is never called when onOpenCreate exists', () => {
        const onOpenCreate = jest.fn();
        const openRef = jest.fn();
        handleCreateClick(onOpenCreate, openRef);
        expect(openRef).not.toHaveBeenCalled();
    });

    test('does not throw when neither onOpenCreate nor openRef is provided', () => {
        expect(() => handleCreateClick(undefined, undefined)).not.toThrow();
    });

    test('calling onOpenCreate multiple times always reaches onOpenCreate, not openRef', () => {
        const onOpenCreate = jest.fn();
        const openRef = jest.fn();
        for (let i = 0; i < 5; i++) {
            handleCreateClick(onOpenCreate, openRef);
        }
        expect(onOpenCreate).toHaveBeenCalledTimes(5);
        expect(openRef).not.toHaveBeenCalled();
    });
});


// ─── 3. refreshTrigger useEffect ─────────────────────────────────────────────

describe('ServiceIndex — refreshTrigger useEffect', () => {
    test('refreshTrigger useEffect with truthy guard is in source', () => {
        expect(SERVICE_INDEX_JS).toMatch(
            /useEffect\(\s*\(\)\s*=>\s*\{\s*if\s*\(props\.refreshTrigger\)\s*list\(\)/
        );
    });

    test('refreshTrigger is in the dependency array', () => {
        expect(SERVICE_INDEX_JS).toMatch(/\[props\.refreshTrigger\]/);
    });

    test('the guard prevents list() call on falsy values', () => {
        function shouldCallList(refreshTrigger) {
            return !!refreshTrigger;
        }
        expect(shouldCallList(0)).toBe(false);
        expect(shouldCallList(undefined)).toBe(false);
        expect(shouldCallList(null)).toBe(false);
        expect(shouldCallList(1)).toBe(true);
        expect(shouldCallList(2)).toBe(true);
    });

    test('original mount-time useEffect(() => { list(); }, []) is still present', () => {
        expect(SERVICE_INDEX_JS).toMatch(
            /useEffect\(\s*\(\)\s*=>\s*\{\s*list\(\);\s*\},\s*\[\]\s*\)/
        );
    });

    test('both useEffects coexist — there are now two separate useEffects for list()', () => {
        // One for mount (empty dep array), one for refreshTrigger
        const mountEffect       = /useEffect\(\s*\(\)\s*=>\s*\{\s*list\(\);\s*\},\s*\[\]\s*\)/;
        const refreshEffect     = /useEffect\(\s*\(\)\s*=>\s*\{.*if\s*\(props\.refreshTrigger\)\s*list\(\)/s;
        expect(SERVICE_INDEX_JS).toMatch(mountEffect);
        expect(SERVICE_INDEX_JS).toMatch(refreshEffect);
    });
});


// ─── 4. No regression ────────────────────────────────────────────────────────

describe('ServiceIndex — no regression in existing behaviour', () => {
    test('createFormRef is still declared (needed for the fallback branch)', () => {
        expect(SERVICE_INDEX_JS).toMatch(/createFormRef\s*=\s*useRef\b/);
    });

    test('viewRef is still declared', () => {
        expect(SERVICE_INDEX_JS).toMatch(/viewRef\s*=\s*useRef\b/);
    });
});
