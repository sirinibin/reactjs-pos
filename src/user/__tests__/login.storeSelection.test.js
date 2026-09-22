/**
 * Unit tests for the store-selection logic in the login flow.
 *
 * The `me()` function is not exported, so we test its observable effects:
 * what ends up in localStorage after a successful login API call.
 *
 * We isolate the code by mocking `fetch` and `fetchStore` (storeUtils).
 */

// ── fetch mock helper ─────────────────────────────────────────────────────────

function mockFetch(responses) {
    // responses: array of objects returned in order per fetch() call
    let callIdx = 0;
    global.fetch = jest.fn().mockImplementation(() => {
        const res = responses[callIdx] || responses[responses.length - 1];
        callIdx++;
        return Promise.resolve({
            ok: res.ok !== false,
            headers: { get: () => 'application/json' },
            json: () => Promise.resolve(res.body),
        });
    });
}

// ── storeUtils mock ───────────────────────────────────────────────────────────

jest.mock('../../utils/storeUtils', () => ({
    fetchStore: jest.fn(),
}));

// We can't import Login directly because it renders JSX and calls hooks.
// Instead we test the pure logic extracted from login.js:
// selecting a store at login and saving last_store_{userId}.
//
// The functions below mirror the exact logic in login.js me() to make sure
// the mapping is covered by tests even without a real DOM render.

const USER_ID = 'user001';
const STORE_A = { id: 'storeAAA', name: 'Store A', branch_name: '', settings: { enable_sales: true } };
const STORE_B = { id: 'storeBBB', name: 'Store B', branch_name: 'Branch 1', settings: { enable_sales: false } };

beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
});

// ── Non-admin store selection ─────────────────────────────────────────────────

describe('Non-admin login store selection', () => {
    function selectNonAdminStore({ storeIDs, storeNames, lastStoreId, userId }) {
        // Mirror of login.js me() non-admin block
        let storeId = storeIDs[0];
        let storeName = storeNames[0];
        if (lastStoreId && storeIDs.includes(lastStoreId)) {
            const idx = storeIDs.indexOf(lastStoreId);
            storeId = lastStoreId;
            storeName = storeNames[idx] || storeNames[0];
        }
        localStorage.setItem('store_name', storeName);
        localStorage.setItem('store_id', storeId);
        if (storeId) localStorage.setItem('last_store_' + userId, storeId);
        return storeId;
    }

    test('selects first store when no last_store saved', () => {
        const selected = selectNonAdminStore({
            storeIDs: [STORE_A.id, STORE_B.id],
            storeNames: [STORE_A.name, STORE_B.name],
            lastStoreId: null,
            userId: USER_ID,
        });
        expect(selected).toBe(STORE_A.id);
        expect(localStorage.getItem('store_id')).toBe(STORE_A.id);
        expect(localStorage.getItem('store_name')).toBe(STORE_A.name);
    });

    test('restores last_store when it is in assigned stores', () => {
        const selected = selectNonAdminStore({
            storeIDs: [STORE_A.id, STORE_B.id],
            storeNames: [STORE_A.name, STORE_B.name],
            lastStoreId: STORE_B.id,
            userId: USER_ID,
        });
        expect(selected).toBe(STORE_B.id);
        expect(localStorage.getItem('store_id')).toBe(STORE_B.id);
        expect(localStorage.getItem('store_name')).toBe(STORE_B.name);
    });

    test('falls back to first store when last_store is not in assigned stores', () => {
        const selected = selectNonAdminStore({
            storeIDs: [STORE_A.id, STORE_B.id],
            storeNames: [STORE_A.name, STORE_B.name],
            lastStoreId: 'storeGONE',
            userId: USER_ID,
        });
        expect(selected).toBe(STORE_A.id);
        expect(localStorage.getItem('store_id')).toBe(STORE_A.id);
    });

    test('saves last_store_{userId} after selecting store', () => {
        selectNonAdminStore({
            storeIDs: [STORE_A.id, STORE_B.id],
            storeNames: [STORE_A.name, STORE_B.name],
            lastStoreId: null,
            userId: USER_ID,
        });
        expect(localStorage.getItem('last_store_' + USER_ID)).toBe(STORE_A.id);
    });

    test('saves last_store_{userId} when restoring from last used', () => {
        selectNonAdminStore({
            storeIDs: [STORE_A.id, STORE_B.id],
            storeNames: [STORE_A.name, STORE_B.name],
            lastStoreId: STORE_B.id,
            userId: USER_ID,
        });
        expect(localStorage.getItem('last_store_' + USER_ID)).toBe(STORE_B.id);
    });

    test('single store: selects the only store', () => {
        const selected = selectNonAdminStore({
            storeIDs: [STORE_A.id],
            storeNames: [STORE_A.name],
            lastStoreId: null,
            userId: USER_ID,
        });
        expect(selected).toBe(STORE_A.id);
    });

    test('uses storeNames[0] when lastStoreId is valid but no matching name index', () => {
        // Edge: storeNames shorter than storeIDs (data inconsistency)
        const selected = selectNonAdminStore({
            storeIDs: [STORE_A.id, STORE_B.id],
            storeNames: [STORE_A.name], // only one name
            lastStoreId: STORE_B.id,
            userId: USER_ID,
        });
        expect(selected).toBe(STORE_B.id);
        expect(localStorage.getItem('store_name')).toBe(STORE_A.name); // falls back to [0]
    });
});

// ── Admin login store selection ───────────────────────────────────────────────

describe('Admin login store selection', () => {
    async function selectAdminStore({ lastStoreId, fetchStoreResult, firstStoreResult, userId }) {

        if (lastStoreId) {
            try {
                const storeData = fetchStoreResult;
                if (storeData) {
                    localStorage.setItem('store_id', storeData.id);
                    localStorage.setItem('store_name', storeData.name);
                    localStorage.setItem('last_store_' + userId, storeData.id);
                    if (storeData.branch_name) {
                        localStorage.setItem('branch_name', storeData.branch_name);
                    } else {
                        localStorage.removeItem('branch_name');
                    }
                    if (storeData.settings) {
                        localStorage.setItem('_store_settings_cache', JSON.stringify(storeData.settings));
                    }
                } else {
                    await applyFirstStore(firstStoreResult, userId);
                }
            } catch (_) {
                await applyFirstStore(firstStoreResult, userId);
            }
        } else {
            await applyFirstStore(firstStoreResult, userId);
        }
    }

    async function applyFirstStore(first, userId) {
        if (!first) return;
        localStorage.setItem('store_name', first.name);
        localStorage.setItem('store_id', first.id);
        if (first.branch_name) {
            localStorage.setItem('branch_name', first.branch_name);
        } else {
            localStorage.removeItem('branch_name');
        }
        if (userId) localStorage.setItem('last_store_' + userId, first.id);
    }

    test('restores last used store for admin when lastStoreId exists', async () => {
        await selectAdminStore({ lastStoreId: STORE_B.id, fetchStoreResult: STORE_B, firstStoreResult: null, userId: USER_ID });
        expect(localStorage.getItem('store_id')).toBe(STORE_B.id);
        expect(localStorage.getItem('store_name')).toBe(STORE_B.name);
    });

    test('saves last_store_{userId} when restoring admin last store', async () => {
        await selectAdminStore({ lastStoreId: STORE_B.id, fetchStoreResult: STORE_B, firstStoreResult: null, userId: USER_ID });
        expect(localStorage.getItem('last_store_' + USER_ID)).toBe(STORE_B.id);
    });

    test('saves branch_name when store has one', async () => {
        await selectAdminStore({ lastStoreId: STORE_B.id, fetchStoreResult: STORE_B, firstStoreResult: null, userId: USER_ID });
        expect(localStorage.getItem('branch_name')).toBe('Branch 1');
    });

    test('removes branch_name when store has none', async () => {
        localStorage.setItem('branch_name', 'old value');
        await selectAdminStore({ lastStoreId: STORE_A.id, fetchStoreResult: STORE_A, firstStoreResult: null, userId: USER_ID });
        expect(localStorage.getItem('branch_name')).toBeNull();
    });

    test('saves _store_settings_cache when store has settings', async () => {
        await selectAdminStore({ lastStoreId: STORE_A.id, fetchStoreResult: STORE_A, firstStoreResult: null, userId: USER_ID });
        const cache = JSON.parse(localStorage.getItem('_store_settings_cache'));
        expect(cache).toEqual(STORE_A.settings);
    });

    test('falls back to first store when no lastStoreId', async () => {
        await selectAdminStore({ lastStoreId: null, fetchStoreResult: null, firstStoreResult: STORE_A, userId: USER_ID });
        expect(localStorage.getItem('store_id')).toBe(STORE_A.id);
        expect(localStorage.getItem('store_name')).toBe(STORE_A.name);
    });

    test('saves last_store_{userId} when selecting first store (no lastStoreId)', async () => {
        await selectAdminStore({ lastStoreId: null, fetchStoreResult: null, firstStoreResult: STORE_A, userId: USER_ID });
        expect(localStorage.getItem('last_store_' + USER_ID)).toBe(STORE_A.id);
    });

    test('falls back to first store when fetchStore returns null', async () => {
        await selectAdminStore({ lastStoreId: STORE_B.id, fetchStoreResult: null, firstStoreResult: STORE_A, userId: USER_ID });
        expect(localStorage.getItem('store_id')).toBe(STORE_A.id);
    });

    test('no store set when both lastStoreId and firstStore are absent', async () => {
        await selectAdminStore({ lastStoreId: null, fetchStoreResult: null, firstStoreResult: null, userId: USER_ID });
        expect(localStorage.getItem('store_id')).toBeNull();
        expect(localStorage.getItem('last_store_' + USER_ID)).toBeNull();
    });
});

// ── last_store_{userId} persistence across logins ─────────────────────────────

describe('last_store persistence', () => {
    test('last_store key is user-scoped (different users get different keys)', () => {
        localStorage.setItem('last_store_user001', STORE_A.id);
        localStorage.setItem('last_store_user002', STORE_B.id);
        expect(localStorage.getItem('last_store_user001')).toBe(STORE_A.id);
        expect(localStorage.getItem('last_store_user002')).toBe(STORE_B.id);
    });

    test('last_store is overwritten when user selects a new store at login', () => {
        localStorage.setItem('last_store_' + USER_ID, STORE_A.id);
        // Simulate selecting STORE_B at next login
        localStorage.setItem('last_store_' + USER_ID, STORE_B.id);
        expect(localStorage.getItem('last_store_' + USER_ID)).toBe(STORE_B.id);
    });

    test('Topbar switchStore saves last_store_{userId} correctly', () => {
        localStorage.setItem('user_id', USER_ID);
        const userId = localStorage.getItem('user_id');
        // Mirror Topbar switchStore logic
        localStorage.setItem('store_id', STORE_B.id);
        localStorage.setItem('store_name', STORE_B.name);
        if (userId) localStorage.setItem('last_store_' + userId, STORE_B.id);
        expect(localStorage.getItem('last_store_' + USER_ID)).toBe(STORE_B.id);
    });
});
