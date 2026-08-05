import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import AutoRefresh from '../AutoRefresh';
import { fetchStore } from '../storeUtils.js';

// ── Module mocks ──────────────────────────────────────────────────────────────

jest.mock('../storeUtils.js', () => ({
    fetchStore: jest.fn(),
}));

// ── window.location.reload mock ───────────────────────────────────────────────
// jsdom does not allow direct assignment to window.location, so we replace the
// whole object once at module level before any tests run.
const mockReload = jest.fn();
Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: { ...window.location, reload: mockReload },
});

// ── Constants (must match the component) ─────────────────────────────────────
const POLL_INTERVAL = 10 * 60 * 1000; // 10 minutes in ms

// ── HTML fixtures that produce distinct version fingerprints ──────────────────
// The component's getVersionFingerprint() scans for /static/(js|css)/... paths.
const HTML_V1 = '<html><script src="/static/js/main.aaa111.js"></script></html>';
const HTML_V2 = '<html><script src="/static/js/main.bbb222.js"></script></html>';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Return a minimal fetch() response that yields `html` from .text(). */
function makeFetchResponse(html) {
    return { text: () => Promise.resolve(html) };
}

/**
 * Flush enough microtask-queue rounds to drain the component's async chain:
 *   fetchStore → .then → check → fetchVersion → fetch → res.text → setState
 * Ten rounds is well above the ~5-level depth needed.
 */
async function flushAll() {
    for (let i = 0; i < 10; i++) {
        await Promise.resolve();
    }
}

/** Mount AutoRefresh with a store that has enable_auto_refresh = true. */
function setupEnabledStore() {
    localStorage.setItem('store_id', 'test-store-id');
    fetchStore.mockResolvedValue({ settings: { enable_auto_refresh: true } });
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

beforeEach(() => {
    localStorage.clear();
    jest.useFakeTimers();
    global.fetch = jest.fn();
    fetchStore.mockReset();
    mockReload.mockReset();
});

afterEach(() => {
    // Cancel any pending timers before restoring real timers to prevent
    // Jest "open handle" warnings from lingering setIntervals.
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
});

// ── Tests: early-return / null-render paths ───────────────────────────────────

describe('AutoRefresh — renders null without a valid, enabled store', () => {
    // Test 1
    it('renders null when localStorage has no store_id', () => {
        const { container } = render(<AutoRefresh />);
        expect(container.firstChild).toBeNull();
    });

    // Test 4
    it('does not call fetchStore when localStorage has no store_id', () => {
        render(<AutoRefresh />);
        expect(fetchStore).not.toHaveBeenCalled();
    });

    // Test 2
    it('renders null when fetchStore returns null', async () => {
        localStorage.setItem('store_id', 'test-store');
        fetchStore.mockResolvedValue(null);

        const { container } = render(<AutoRefresh />);
        await act(async () => { await flushAll(); });

        expect(container.firstChild).toBeNull();
    });

    // Test 3a — enable_auto_refresh explicitly false
    it('renders null when store.settings.enable_auto_refresh is false', async () => {
        localStorage.setItem('store_id', 'test-store');
        fetchStore.mockResolvedValue({ settings: { enable_auto_refresh: false } });

        const { container } = render(<AutoRefresh />);
        await act(async () => { await flushAll(); });

        expect(container.firstChild).toBeNull();
    });

    // Test 3b — settings key missing entirely
    it('renders null when store has no settings object', async () => {
        localStorage.setItem('store_id', 'test-store');
        fetchStore.mockResolvedValue({});

        const { container } = render(<AutoRefresh />);
        await act(async () => { await flushAll(); });

        expect(container.firstChild).toBeNull();
    });
});

// ── Tests: polling logic and update banner ────────────────────────────────────

/**
 * Trigger the second poll by advancing the fake clock by POLL_INTERVAL.
 *
 * WHY two separate act() calls instead of one:
 *   - The synchronous act() fires the setInterval callback which starts the
 *     async check() chain (microtasks queued but not yet drained).
 *   - The subsequent async act() flushes those microtasks and lets React
 *     commit the resulting state update.
 *
 * WHY NOT window.dispatchEvent('focus') for tests 6-9:
 *   The component registers its focus listener inside a .then() callback and
 *   the cleanup it returns never reaches useEffect's cleanup (it is returned
 *   from .then, not from the effect itself). After a test unmounts the
 *   component its focus listener stays on window, and it would consume the
 *   next test's mockResolvedValueOnce responses, breaking isolation.
 *   Fake-timer intervals are cleared every beforeEach so they have no
 *   cross-test leakage.
 */
async function triggerSecondCheck() {
    // Fire the setInterval callback synchronously.
    act(() => { jest.advanceTimersByTime(POLL_INTERVAL); });
    // Drain the resulting async chain (fetchVersion → fetch → res.text → setState).
    await act(async () => { await flushAll(); });
}

describe('AutoRefresh — polling and update banner', () => {
    // Test 5
    it('renders null on the first check — stores baseline, shows no banner', async () => {
        setupEnabledStore();
        global.fetch.mockResolvedValue(makeFetchResponse(HTML_V1));

        const { container } = render(<AutoRefresh />);
        // Flush mount + fetchStore resolution + first check()
        await act(async () => { await flushAll(); });

        expect(container.firstChild).toBeNull();
        // First check should have fetched /index.html once (baseline)
        expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    // Test 6
    it('shows "New version available" banner after two polls with different versions', async () => {
        setupEnabledStore();
        global.fetch
            .mockResolvedValueOnce(makeFetchResponse(HTML_V1)) // 1st check: stores baseline
            .mockResolvedValueOnce(makeFetchResponse(HTML_V2)); // 2nd check: detects change

        render(<AutoRefresh />);

        // Mount + first check (baseline stored, no banner yet)
        await act(async () => { await flushAll(); });

        // Second check via interval — detects version change → shows banner
        await triggerSecondCheck();

        expect(screen.getByText('New version available')).toBeInTheDocument();
    });

    // Test 7
    it('shows the countdown number (60) in the banner', async () => {
        setupEnabledStore();
        global.fetch
            .mockResolvedValueOnce(makeFetchResponse(HTML_V1))
            .mockResolvedValueOnce(makeFetchResponse(HTML_V2));

        render(<AutoRefresh />);
        await act(async () => { await flushAll(); });
        await triggerSecondCheck();

        // The component renders: Refreshing in <strong>{countdown}s</strong>…
        // countdown starts at 60, so the <strong> element text is exactly "60s".
        expect(screen.getByText('60s')).toBeInTheDocument();
    });

    // Test 8
    it('"Refresh Now" button calls window.location.reload()', async () => {
        setupEnabledStore();
        global.fetch
            .mockResolvedValueOnce(makeFetchResponse(HTML_V1))
            .mockResolvedValueOnce(makeFetchResponse(HTML_V2));

        render(<AutoRefresh />);
        await act(async () => { await flushAll(); });
        await triggerSecondCheck();

        fireEvent.click(screen.getByText('Refresh Now'));

        expect(mockReload).toHaveBeenCalledTimes(1);
    });

    // Test 9
    it('"Later (10 min)" button hides the banner (snooze)', async () => {
        setupEnabledStore();
        global.fetch
            .mockResolvedValueOnce(makeFetchResponse(HTML_V1))
            .mockResolvedValueOnce(makeFetchResponse(HTML_V2));

        const { container } = render(<AutoRefresh />);
        await act(async () => { await flushAll(); });
        await triggerSecondCheck();

        // Banner is visible
        expect(screen.getByText('New version available')).toBeInTheDocument();

        // Click snooze
        await act(async () => {
            fireEvent.click(screen.getByText('Later (10 min)'));
        });

        // Banner disappears immediately
        expect(container.firstChild).toBeNull();
    });

    // Test 10
    it('after snooze, checks triggered within the 10-min window do not re-show the banner', async () => {
        setupEnabledStore();
        // Only two fetch responses: the third check is gated by snooze so
        // fetchVersion() is never reached for it.
        global.fetch
            .mockResolvedValueOnce(makeFetchResponse(HTML_V1)) // 1st check: baseline
            .mockResolvedValueOnce(makeFetchResponse(HTML_V2)); // 2nd check: triggers banner

        const { container } = render(<AutoRefresh />);

        // Mount + first check (baseline stored, no banner)
        await act(async () => { await flushAll(); });

        // Second check → version change detected → banner appears
        await triggerSecondCheck();
        expect(screen.getByText('New version available')).toBeInTheDocument();

        // Snooze: component sets snoozeUntilRef.current = Date.now() + 10 min.
        // Legacy fake timers do NOT advance Date.now(), so the snooze window is
        // anchored to the real wall-clock time at this moment — any focus event
        // dispatched immediately will satisfy Date.now() < snoozeUntilRef.current.
        await act(async () => {
            fireEvent.click(screen.getByText('Later (10 min)'));
        });
        expect(container.firstChild).toBeNull();

        // Third check triggered via focus — snooze is active, check() returns
        // early without calling fetchVersion() → banner stays hidden.
        await act(async () => {
            window.dispatchEvent(new Event('focus'));
            await flushAll();
        });

        expect(container.firstChild).toBeNull();
        // fetch was called only twice: baseline + version-change.
        // The snoozed check never reached fetchVersion().
        expect(global.fetch).toHaveBeenCalledTimes(2);
    });
});
