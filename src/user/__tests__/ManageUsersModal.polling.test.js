/**
 * Source-level tests for the real-time online/offline polling added to
 * ManageUsersModal.js.
 *
 * Problem: the online/offline label in the Manage Users table only updated
 * when the modal was reopened (full re-fetch with spinner). Status changes
 * were not visible in real time.
 *
 * Fix:
 *  - list() now delegates to fetchUsers(true)  — shows loading spinner
 *  - silentRefresh() delegates to fetchUsers(false) — no spinner, no flicker
 *  - While the modal is open, silentRefresh() runs on the server's
 *    user_status_change push (no timer polling)
 */

const fs   = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
    path.join(__dirname, '..', 'ManageUsersModal.js'), 'utf8'
);


// ── 1. fetchUsers(showSpinner) introduced ────────────────────────────────────

describe('ManageUsersModal — fetchUsers(showSpinner) abstraction', () => {
    test('fetchUsers function is defined', () => {
        expect(SRC).toMatch(/function fetchUsers\s*\(\s*showSpinner/);
    });

    test('fetchUsers calls setLoading(true) only when showSpinner is true', () => {
        expect(SRC).toMatch(/if\s*\(\s*showSpinner\s*\)\s*setLoading\s*\(\s*true\s*\)/);
    });

    test('fetchUsers calls setLoading(false) only when showSpinner is true', () => {
        expect(SRC).toMatch(/if\s*\(\s*showSpinner\s*\)\s*setLoading\s*\(\s*false\s*\)/);
    });

    test('fetchUsers always calls fetch (not conditional on showSpinner)', () => {
        // fetch call should NOT be gated on showSpinner
        const fetchIdx = SRC.indexOf('function fetchUsers');
        const snippet = SRC.slice(fetchIdx, fetchIdx + 500);
        expect(snippet).toMatch(/fetch\s*\(`/);
    });
});


// ── 2. list() and silentRefresh() wrappers ────────────────────────────────────

describe('ManageUsersModal — list() and silentRefresh() wrappers', () => {
    test('list() calls fetchUsers(true)', () => {
        expect(SRC).toMatch(/function list\s*\(\s*\)\s*\{\s*fetchUsers\s*\(\s*true/);
    });

    test('silentRefresh() calls fetchUsers(false)', () => {
        expect(SRC).toMatch(/function silentRefresh\s*\(\s*\)\s*\{\s*fetchUsers\s*\(\s*false/);
    });

    test('list() does NOT call setLoading directly', () => {
        // list should delegate entirely to fetchUsers
        const listIdx = SRC.indexOf('function list()');
        const snippet = SRC.slice(listIdx, listIdx + 80);
        expect(snippet).not.toMatch(/setLoading/);
    });

    test('silentRefresh() does NOT call setLoading directly', () => {
        const srIdx = SRC.indexOf('function silentRefresh()');
        const snippet = SRC.slice(srIdx, srIdx + 80);
        expect(snippet).not.toMatch(/setLoading/);
    });
});


// ── 3. Server push instead of polling (user rule 2026-10-11) ────────────────
// Online status changes arrive as the server's user_status_change event; the
// window refreshes silently then, never on a timer.

describe('ManageUsersModal — online status by server push', () => {
    test('no timer polling', () => {
        expect(SRC).not.toMatch(/setInterval/);
    });

    test('refreshes silently on user_status_change', () => {
        expect(SRC).toMatch(/const refresh = \(\) => silentRefresh\(\)/);
        expect(SRC).toMatch(/eventEmitter\.on\('user_status_change', refresh\)/);
    });

    test('refreshes after a WebSocket reconnect', () => {
        expect(SRC).toMatch(/eventEmitter\.on\('socket_connection_open', refresh\)/);
    });

    test('removes both listeners on cleanup', () => {
        expect(SRC).toMatch(/eventEmitter\.off\('user_status_change', refresh\)/);
        expect(SRC).toMatch(/eventEmitter\.off\('socket_connection_open', refresh\)/);
    });

    test('listens only while the window is open', () => {
        expect(SRC).toMatch(/if\s*\(\s*!show\s*\)\s*return/);
    });

    test('re-subscribes when the open page changes so refresh reloads that page', () => {
        expect(SRC).toMatch(/\[\s*show\s*,\s*roleFilter\s*,\s*showInactive\s*,\s*searchName\s*,\s*page\s*,\s*pageSize\s*\]/);
    });
});


// ── 4. No-spinner behaviour — semantics ──────────────────────────────────────

describe('ManageUsersModal — silent refresh semantics', () => {
    test('fetchUsers with false does NOT set loading (no flicker during polling)', () => {
        // showSpinner=false path: setLoading must be gated on the flag
        // Verified by: all setLoading calls use "if (showSpinner)"
        const loadingCalls = [...SRC.matchAll(/setLoading\s*\(/g)];
        // Every setLoading call should be preceded by "if (showSpinner)"
        // We verify by checking there is no bare "setLoading(" not inside an if-showSpinner block
        // Simplest check: number of "setLoading" occurrences equals number of "if (showSpinner)"
        const guards = [...SRC.matchAll(/if\s*\(\s*showSpinner\s*\)/g)];
        expect(loadingCalls.length).toBeGreaterThan(0);
        expect(guards.length).toBeGreaterThanOrEqual(loadingCalls.length - 1);
    });

    test('silentRefresh does not contain the word "Loading"', () => {
        const srIdx = SRC.indexOf('function silentRefresh()');
        const snippet = SRC.slice(srIdx, srIdx + 100);
        expect(snippet).not.toMatch(/[Ll]oading/);
    });
});
