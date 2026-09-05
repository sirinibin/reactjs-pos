import {
    DEFAULT_MENU,
    loadSidebarConfig,
    applyAutomobileMenuOrder,
    saveSidebarConfig,
    getLandingPath,
} from './sidebar_menu_config';

const STORAGE_KEY = 'sidebar_config';

beforeEach(() => {
    localStorage.clear();
});

// ---------------------------------------------------------------------------
// DEFAULT_MENU
// ---------------------------------------------------------------------------

describe('DEFAULT_MENU', () => {
    test('1. is an array', () => {
        expect(Array.isArray(DEFAULT_MENU)).toBe(true);
    });

    test('2. has entries with expected shape (id, label, icon, path)', () => {
        DEFAULT_MENU.forEach(item => {
            expect(typeof item.id).toBe('string');
            expect(typeof item.label).toBe('string');
            expect(typeof item.icon).toBe('string');
            expect(typeof item.path).toBe('string');
            expect(item.path).toMatch(/^\//);
        });
    });

    test('3. is not empty', () => {
        expect(DEFAULT_MENU.length).toBeGreaterThan(0);
    });

    test('4. each entry has at minimum a non-empty string id field', () => {
        DEFAULT_MENU.forEach(item => {
            expect(item.id).toBeDefined();
            expect(typeof item.id).toBe('string');
            expect(item.id.length).toBeGreaterThan(0);
        });
    });

    test('4b. all ids are unique', () => {
        const ids = DEFAULT_MENU.map(m => m.id);
        const unique = new Set(ids);
        expect(unique.size).toBe(ids.length);
    });
});

// ---------------------------------------------------------------------------
// loadSidebarConfig()
// ---------------------------------------------------------------------------

describe('loadSidebarConfig()', () => {
    test('5. returns DEFAULT_MENU when localStorage is empty', () => {
        const result = loadSidebarConfig();

        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(DEFAULT_MENU.length);

        const resultIds = result.map(i => i.id);
        DEFAULT_MENU.forEach(m => expect(resultIds).toContain(m.id));

        result.forEach(item => expect(item.visible).toBe(true));
    });

    test('6. returns saved config order and visibility when localStorage has valid JSON with matching items', () => {
        // Save all DEFAULT_MENU items so no unsaved items are inserted in between;
        // the three items of interest are moved to the front in the desired order.
        const PINNED = ['sales', 'dashboard', 'customers'];
        const savedConfig = [
            { id: 'sales', visible: false },
            { id: 'dashboard', visible: true },
            { id: 'customers', visible: true },
            ...DEFAULT_MENU.filter(m => !PINNED.includes(m.id)).map(m => ({ id: m.id, visible: true })),
        ];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(savedConfig));

        const result = loadSidebarConfig();

        // Saved items appear first, in saved order
        expect(result[0].id).toBe('sales');
        expect(result[0].visible).toBe(false);
        expect(result[1].id).toBe('dashboard');
        expect(result[1].visible).toBe(true);
        expect(result[2].id).toBe('customers');
        expect(result[2].visible).toBe(true);

        // Full DEFAULT_MENU metadata is restored on each item
        expect(result[0].path).toBe('/dashboard/sales');
        expect(result[0].icon).toBe('bi-receipt');
    });

    test('7. merges saved config: new items absent from saved are inserted at their DEFAULT_MENU position', () => {
        const EXCLUDED_ID = 'stats';
        const savedConfig = DEFAULT_MENU
            .filter(m => m.id !== EXCLUDED_ID)
            .map(m => ({ id: m.id, visible: true }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(savedConfig));

        const result = loadSidebarConfig();

        // All DEFAULT_MENU items must be present
        expect(result).toHaveLength(DEFAULT_MENU.length);
        const resultIds = result.map(i => i.id);
        expect(resultIds).toContain(EXCLUDED_ID);

        // The newly inserted item must have visible:true (default for new items)
        const insertedItem = result.find(i => i.id === EXCLUDED_ID);
        expect(insertedItem.visible).toBe(true);

        // Position must honour DEFAULT_MENU ordering: item before stats in DEFAULT_MENU
        // must appear before stats in the result
        const defaultIdxStats = DEFAULT_MENU.findIndex(m => m.id === EXCLUDED_ID);
        const prevDefaultId = DEFAULT_MENU[defaultIdxStats - 1].id;
        const resultIdxPrev = resultIds.indexOf(prevDefaultId);
        const resultIdxStats = resultIds.indexOf(EXCLUDED_ID);
        expect(resultIdxPrev).toBeLessThan(resultIdxStats);
    });

    test('8. returns defaults (all items visible) when localStorage has invalid JSON', () => {
        localStorage.setItem(STORAGE_KEY, 'not-valid-json{{{');

        const result = loadSidebarConfig();

        expect(result).toHaveLength(DEFAULT_MENU.length);
        result.forEach(item => expect(item.visible).toBe(true));
    });

    test('9. returns full DEFAULT_MENU (all visible) when saved config has no overlap with DEFAULT_MENU', () => {
        const savedConfig = [
            { id: 'completely_unknown_item_aaa', visible: true },
            { id: 'another_nonexistent_xyz', visible: false },
        ];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(savedConfig));

        const result = loadSidebarConfig();

        expect(result).toHaveLength(DEFAULT_MENU.length);
        const resultIds = result.map(i => i.id);
        DEFAULT_MENU.forEach(m => expect(resultIds).toContain(m.id));
        // All should be visible since they are treated as new items
        result.forEach(item => expect(item.visible).toBe(true));
    });
});

// ---------------------------------------------------------------------------
// saveSidebarConfig(items)
// ---------------------------------------------------------------------------

describe('saveSidebarConfig()', () => {
    test('10. saves items to localStorage as JSON containing only id and visible fields', () => {
        const items = [
            { id: 'dashboard', visible: true, label: 'Dashboard', path: '/dashboard/business-dashboard', icon: 'bi-speedometer2' },
            { id: 'sales', visible: false, label: 'Sales', path: '/dashboard/sales', icon: 'bi-receipt' },
        ];

        saveSidebarConfig(items);

        const raw = localStorage.getItem(STORAGE_KEY);
        expect(raw).not.toBeNull();

        const parsed = JSON.parse(raw);
        expect(parsed).toEqual([
            { id: 'dashboard', visible: true },
            { id: 'sales', visible: false },
        ]);
        // No extra fields
        parsed.forEach(entry => {
            expect(Object.keys(entry).sort()).toEqual(['id', 'visible'].sort());
        });
    });

    test('11. after saveSidebarConfig(items), loadSidebarConfig() returns the same item order (roundtrip)', () => {
        // Reverse DEFAULT_MENU order and mark alternating items hidden
        const items = [...DEFAULT_MENU].reverse().map((m, idx) => ({ ...m, visible: idx % 2 === 0 }));

        saveSidebarConfig(items);

        const loaded = loadSidebarConfig();

        expect(loaded.map(i => i.id)).toEqual(items.map(i => i.id));
        expect(loaded.map(i => i.visible)).toEqual(items.map(i => i.visible));
    });
});

// ---------------------------------------------------------------------------
// getLandingPath()
// ---------------------------------------------------------------------------

describe('getLandingPath()', () => {
    test('12. returns a non-empty string path', () => {
        const path = getLandingPath();
        expect(typeof path).toBe('string');
        expect(path.length).toBeGreaterThan(0);
        expect(path).toMatch(/^\//);
    });

    test('13. for an Admin user, returns the path of the first visible menu item', () => {
        localStorage.setItem('user_role', 'Admin');

        const path = getLandingPath();
        const config = loadSidebarConfig();
        const firstVisible = config.find(item => item.visible);

        expect(path).toBe(firstVisible.path);
    });

    test('13b. for Admin when first item is hidden, returns second visible items path', () => {
        localStorage.setItem('user_role', 'Admin');

        // Save config with first item hidden
        const customOrder = DEFAULT_MENU.map((m, idx) => ({ id: m.id, visible: idx !== 0 }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(customOrder));

        const path = getLandingPath();
        expect(path).toBe(DEFAULT_MENU[1].path);
    });

    test('14. getLandingPath() reflects a custom saved config order', () => {
        localStorage.setItem('user_role', 'Admin');

        // Put sales before dashboard
        const customOrder = [
            { id: 'sales', visible: true },
            { id: 'dashboard', visible: true },
        ];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(customOrder));

        const path = getLandingPath();
        // First visible is now 'sales'
        expect(path).toBe('/dashboard/sales');
    });

    test('14b. falls back to /dashboard/business-dashboard when all items are hidden', () => {
        localStorage.setItem('user_role', 'Admin');

        const allHidden = DEFAULT_MENU.map(m => ({ id: m.id, visible: false }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(allHidden));

        const path = getLandingPath();
        expect(path).toBe('/dashboard/business-dashboard');
    });

    test('14c. non-admin user: adminOnly items are skipped unless RBAC grants read', () => {
        // Non-admin, no RBAC, no permissions
        localStorage.setItem('user_role', 'Staff');

        // Put dashboard (non-adminOnly) first then analytics (adminOnly)
        const customOrder = [
            { id: 'analytics', visible: true },  // adminOnly
            { id: 'dashboard', visible: true },   // no restriction
        ];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(customOrder));

        const path = getLandingPath();
        // analytics is adminOnly and no rbac grants it, so dashboard wins
        expect(path).toBe('/dashboard/business-dashboard');
    });
});

// ---------------------------------------------------------------------------
// AI RFQ Bot menu entries (requiresAIRFQBot flag)
// ---------------------------------------------------------------------------

describe('AI RFQ Bot menu entries', () => {
    test('18. rfq_received entry exists in DEFAULT_MENU', () => {
        const entry = DEFAULT_MENU.find(m => m.id === 'rfq_received');
        expect(entry).toBeDefined();
    });

    test('19. rfq_suppliers entry exists in DEFAULT_MENU', () => {
        const entry = DEFAULT_MENU.find(m => m.id === 'rfq_suppliers');
        expect(entry).toBeDefined();
    });

    test('20. rfq_received has correct path and icon', () => {
        const entry = DEFAULT_MENU.find(m => m.id === 'rfq_received');
        expect(entry.path).toBe('/dashboard/rfq-received');
        expect(entry.icon).toBe('bi-inbox-fill');
    });

    test('21. rfq_suppliers has correct path and icon', () => {
        const entry = DEFAULT_MENU.find(m => m.id === 'rfq_suppliers');
        expect(entry.path).toBe('/dashboard/rfq-suppliers');
        expect(entry.icon).toBe('bi-building-fill');
    });

    test('22. rfq_received has requiresAIRFQBot: true', () => {
        const entry = DEFAULT_MENU.find(m => m.id === 'rfq_received');
        expect(entry.requiresAIRFQBot).toBe(true);
    });

    test('23. rfq_suppliers has requiresAIRFQBot: true', () => {
        const entry = DEFAULT_MENU.find(m => m.id === 'rfq_suppliers');
        expect(entry.requiresAIRFQBot).toBe(true);
    });

    test('24. only rfq_received and rfq_suppliers have requiresAIRFQBot set', () => {
        const flagged = DEFAULT_MENU.filter(m => m.requiresAIRFQBot);
        const flaggedIds = flagged.map(m => m.id).sort();
        expect(flaggedIds).toEqual(['rfq_received', 'rfq_suppliers'].sort());
    });

    test('25. rfq_received resource field matches its id', () => {
        const entry = DEFAULT_MENU.find(m => m.id === 'rfq_received');
        expect(entry.resource).toBe('rfq_received');
    });

    test('26. rfq_suppliers resource field matches its id', () => {
        const entry = DEFAULT_MENU.find(m => m.id === 'rfq_suppliers');
        expect(entry.resource).toBe('rfq_suppliers');
    });

    test('27. loadSidebarConfig() preserves requiresAIRFQBot flag on rfq_received', () => {
        const result = loadSidebarConfig();
        const entry = result.find(m => m.id === 'rfq_received');
        expect(entry).toBeDefined();
        expect(entry.requiresAIRFQBot).toBe(true);
    });

    test('28. loadSidebarConfig() preserves requiresAIRFQBot flag on rfq_suppliers', () => {
        const result = loadSidebarConfig();
        const entry = result.find(m => m.id === 'rfq_suppliers');
        expect(entry).toBeDefined();
        expect(entry.requiresAIRFQBot).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// applyAutomobileMenuOrder()
// ---------------------------------------------------------------------------

describe('applyAutomobileMenuOrder()', () => {
    // applyAutomobileMenuOrder is a side-effecting void function;
    // observable result is what loadSidebarConfig() returns afterwards.

    test('15. after calling, loadSidebarConfig() returns an array', () => {
        applyAutomobileMenuOrder();
        const result = loadSidebarConfig();
        expect(Array.isArray(result)).toBe(true);
    });

    test('16. after calling, loadSidebarConfig() returns an array with the same length as DEFAULT_MENU (no items lost or duplicated)', () => {
        applyAutomobileMenuOrder();
        const result = loadSidebarConfig();
        expect(result).toHaveLength(DEFAULT_MENU.length);
    });

    test('16b. automobile items appear before non-automobile items after calling', () => {
        applyAutomobileMenuOrder();
        const result = loadSidebarConfig();

        const AUTOMOBILE_FIRST_IDS = [
            'automobile_dashboard',
            'repair_jobs_board',
            'repair_jobs',
            'vehicles',
            'customers',
            'employees',
        ];

        // Each automobile id must appear before any non-automobile id
        const firstAutoIdx = result.findIndex(m => AUTOMOBILE_FIRST_IDS.includes(m.id));
        const firstNonAutoIdx = result.findIndex(m => !AUTOMOBILE_FIRST_IDS.includes(m.id));

        // If both exist, automobiles must come first
        if (firstAutoIdx !== -1 && firstNonAutoIdx !== -1) {
            expect(firstAutoIdx).toBeLessThan(firstNonAutoIdx);
        }
    });

    test('17. does not crash when called (with empty localStorage)', () => {
        expect(() => applyAutomobileMenuOrder()).not.toThrow();
    });

    test('17b. does not crash when called after a prior saveSidebarConfig()', () => {
        saveSidebarConfig(DEFAULT_MENU.map(m => ({ ...m, visible: true })));
        expect(() => applyAutomobileMenuOrder()).not.toThrow();
    });
});

// ---------------------------------------------------------------------------
// saveSidebarConfig – server sync
// ---------------------------------------------------------------------------

describe('saveSidebarConfig server sync', () => {
    const ITEMS = [
        { id: 'dashboard', label: 'Dashboard', icon: 'bi-speedometer2', path: '/dashboard/business-dashboard', visible: true },
        { id: 'sales', label: 'Sales', icon: 'bi-receipt', path: '/dashboard/sales', visible: false },
    ];

    beforeEach(() => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ status: true }),
        });
        localStorage.setItem('store_id', 'store123');
        localStorage.setItem('access_token', 'tok123');
    });

    afterEach(() => {
        delete global.fetch;
        localStorage.clear();
    });

    test('always saves to localStorage regardless of flag', () => {
        saveSidebarConfig(ITEMS);
        const stored = JSON.parse(localStorage.getItem('sidebar_config') || '[]');
        expect(stored).toHaveLength(2);
        expect(stored[0]).toEqual({ id: 'dashboard', visible: true });
        expect(stored[1]).toEqual({ id: 'sales', visible: false });
    });

    test('only saves id and visible to localStorage (strips metadata)', () => {
        saveSidebarConfig(ITEMS);
        const stored = JSON.parse(localStorage.getItem('sidebar_config') || '[]');
        stored.forEach(item => {
            expect(Object.keys(item).sort()).toEqual(['id', 'visible']);
        });
    });

    test('does NOT call fetch when save_sidebar_config_to_server flag is absent', () => {
        saveSidebarConfig(ITEMS);
        expect(global.fetch).not.toHaveBeenCalled();
    });

    test('does NOT call fetch when save_sidebar_config_to_server is false', () => {
        localStorage.setItem('_store_settings_cache', JSON.stringify({ save_sidebar_config_to_server: false }));
        saveSidebarConfig(ITEMS);
        expect(global.fetch).not.toHaveBeenCalled();
    });

    test('calls fetch with PUT /v1/store/{id}/sidebar-config when flag is true', () => {
        localStorage.setItem('_store_settings_cache', JSON.stringify({ save_sidebar_config_to_server: true }));
        saveSidebarConfig(ITEMS);
        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(global.fetch).toHaveBeenCalledWith(
            '/v1/store/store123/sidebar-config',
            expect.objectContaining({ method: 'PUT' })
        );
    });

    test('sends Authorization header when flag is true', () => {
        localStorage.setItem('_store_settings_cache', JSON.stringify({ save_sidebar_config_to_server: true }));
        saveSidebarConfig(ITEMS);
        const [, opts] = global.fetch.mock.calls[0];
        expect(opts.headers).toMatchObject({ Authorization: 'tok123' });
    });

    test('sends correct JSON body when flag is true', () => {
        localStorage.setItem('_store_settings_cache', JSON.stringify({ save_sidebar_config_to_server: true }));
        saveSidebarConfig(ITEMS);
        const [, opts] = global.fetch.mock.calls[0];
        const body = JSON.parse(opts.body);
        expect(body).toHaveProperty('sidebar_config');
        expect(body.sidebar_config).toEqual([
            { id: 'dashboard', visible: true },
            { id: 'sales', visible: false },
        ]);
    });

    test('does NOT call fetch when store_id is missing', () => {
        localStorage.removeItem('store_id');
        localStorage.setItem('_store_settings_cache', JSON.stringify({ save_sidebar_config_to_server: true }));
        saveSidebarConfig(ITEMS);
        expect(global.fetch).not.toHaveBeenCalled();
    });

    test('does NOT call fetch when access_token is missing', () => {
        localStorage.removeItem('access_token');
        localStorage.setItem('_store_settings_cache', JSON.stringify({ save_sidebar_config_to_server: true }));
        saveSidebarConfig(ITEMS);
        expect(global.fetch).not.toHaveBeenCalled();
    });
});
