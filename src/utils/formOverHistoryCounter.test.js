// Tests for the reference-counting body-class manager.
// Each test gets a fresh module instance (jest.resetModules) so _count starts at 0.

describe('formOverHistoryCounter', () => {
    let acquireFormOverHistory;
    let releaseFormOverHistory;

    beforeEach(() => {
        jest.resetModules();
        ({ acquireFormOverHistory, releaseFormOverHistory } = require('./formOverHistoryCounter'));
        document.body.className = '';
    });

    afterEach(() => {
        document.body.className = '';
    });

    // ── acquire ──────────────────────────────────────────────────────────────

    test('1. single acquire adds form-over-history to body', () => {
        acquireFormOverHistory();
        expect(document.body.classList.contains('form-over-history')).toBe(true);
    });

    test('2. two acquires keep form-over-history on body', () => {
        acquireFormOverHistory();
        acquireFormOverHistory();
        expect(document.body.classList.contains('form-over-history')).toBe(true);
    });

    test('3. classList.add is idempotent: class appears exactly once after multiple acquires', () => {
        acquireFormOverHistory();
        acquireFormOverHistory();
        acquireFormOverHistory();
        const occurrences = Array.from(document.body.classList).filter(c => c === 'form-over-history').length;
        expect(occurrences).toBe(1);
    });

    // ── release ───────────────────────────────────────────────────────────────

    test('4. one release after two acquires keeps the class (counter = 1)', () => {
        acquireFormOverHistory();
        acquireFormOverHistory();
        releaseFormOverHistory();
        expect(document.body.classList.contains('form-over-history')).toBe(true);
    });

    test('5. two releases after two acquires removes the class (counter = 0)', () => {
        acquireFormOverHistory();
        acquireFormOverHistory();
        releaseFormOverHistory();
        releaseFormOverHistory();
        expect(document.body.classList.contains('form-over-history')).toBe(false);
    });

    test('6. one acquire then one release removes the class', () => {
        acquireFormOverHistory();
        releaseFormOverHistory();
        expect(document.body.classList.contains('form-over-history')).toBe(false);
    });

    test('7. release without any prior acquire does not throw and leaves body clean', () => {
        expect(() => releaseFormOverHistory()).not.toThrow();
        expect(document.body.classList.contains('form-over-history')).toBe(false);
    });

    test('8. counter does not go negative: extra releases beyond zero are no-ops', () => {
        acquireFormOverHistory();
        releaseFormOverHistory();        // counter → 0, class removed
        releaseFormOverHistory();        // extra release, counter stays 0
        releaseFormOverHistory();        // extra release, counter stays 0
        expect(document.body.classList.contains('form-over-history')).toBe(false);

        // A subsequent acquire still works normally
        acquireFormOverHistory();
        expect(document.body.classList.contains('form-over-history')).toBe(true);
        releaseFormOverHistory();
        expect(document.body.classList.contains('form-over-history')).toBe(false);
    });

    // ── multiple holders ─────────────────────────────────────────────────────

    test('9. three holders: class survives until the last holder releases', () => {
        acquireFormOverHistory(); // holder A (outer TABLE)
        acquireFormOverHistory(); // holder B (inner TABLE)
        acquireFormOverHistory(); // holder C (second inner TABLE)

        releaseFormOverHistory(); // A releases — B and C still hold
        expect(document.body.classList.contains('form-over-history')).toBe(true);

        releaseFormOverHistory(); // B releases — C still holds
        expect(document.body.classList.contains('form-over-history')).toBe(true);

        releaseFormOverHistory(); // C releases — no holders remain
        expect(document.body.classList.contains('form-over-history')).toBe(false);
    });

    // ── re-acquire after full release ─────────────────────────────────────────

    test('10. re-acquire after full release restores the class correctly', () => {
        acquireFormOverHistory();
        releaseFormOverHistory();
        expect(document.body.classList.contains('form-over-history')).toBe(false);

        acquireFormOverHistory();
        expect(document.body.classList.contains('form-over-history')).toBe(true);

        releaseFormOverHistory();
        expect(document.body.classList.contains('form-over-history')).toBe(false);
    });

    // ── interleaved mount/unmount simulation ──────────────────────────────────

    test('11. interleaved acquire/release across simulated component mount-unmount cycles', () => {
        // Outer TABLE opens a form
        acquireFormOverHistory(); // outer
        // Inner TABLE opens a second form
        acquireFormOverHistory(); // inner
        expect(document.body.classList.contains('form-over-history')).toBe(true);

        // Inner form closes
        releaseFormOverHistory();
        expect(document.body.classList.contains('form-over-history')).toBe(true); // outer still holds

        // A different inner form opens
        acquireFormOverHistory();
        expect(document.body.classList.contains('form-over-history')).toBe(true);

        // That inner form closes
        releaseFormOverHistory();
        expect(document.body.classList.contains('form-over-history')).toBe(true); // outer still holds

        // Outer form closes
        releaseFormOverHistory();
        expect(document.body.classList.contains('form-over-history')).toBe(false);
    });

    test('12. acquire returns undefined (no accidental value usage)', () => {
        const ret = acquireFormOverHistory();
        expect(ret).toBeUndefined();
    });

    test('13. releaseFormOverHistory can safely be used directly as a cleanup function (no bind needed)', () => {
        acquireFormOverHistory();
        // React useEffect returns the cleanup function directly as a reference
        const cleanup = releaseFormOverHistory;
        cleanup();
        expect(document.body.classList.contains('form-over-history')).toBe(false);
    });
});
