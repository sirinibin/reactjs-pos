/**
 * Tests for the warehouse-module gate in the product history stock column.
 *
 * The stock column now shows a warehouse breakdown (OverlayTrigger tooltip +
 * per-warehouse rows) ONLY when store.settings.enable_warehouse_module is true.
 * When the module is disabled the column renders just the plain total stock value.
 *
 * Implementation details verified here (static source analysis):
 *   1. store state is initialised and populated from fetchStore.
 *   2. enable_warehouse_module is the exact flag consulted.
 *   3. An early-return path renders only the total when the flag is falsy.
 *   4. The OverlayTrigger / tooltip path is still present for the enabled case.
 */

const fs   = require('fs');
const path = require('path');

const PRODUCT_HISTORY = fs.readFileSync(
    path.join(__dirname, '../product_history.js'),
    'utf8'
);

// ─── 1. Store state wiring ────────────────────────────────────────────────────

describe('product_history.js — store state is populated from fetchStore', () => {
    test('store state is initialised with useState(null)', () => {
        expect(PRODUCT_HISTORY).toMatch(/const\s+\[store,\s*setStore\]\s*=\s*useState\(null\)/);
    });

    test('getStore stores the fetchStore result via setStore', () => {
        // The async getStore function must call setStore with the resolved data.
        expect(PRODUCT_HISTORY).toMatch(/setStore\(data\)/);
    });

    test('fetchStore result is awaited and assigned to a variable before setStore', () => {
        expect(PRODUCT_HISTORY).toMatch(/const\s+data\s*=\s*await\s+fetchStore\(/);
    });
});

// ─── 2. Warehouse-module flag read ────────────────────────────────────────────

describe('product_history.js — enable_warehouse_module controls stock column', () => {
    test('enable_warehouse_module is read from store.settings', () => {
        expect(PRODUCT_HISTORY).toMatch(/store\?\.settings\?\.enable_warehouse_module/);
    });

    test('warehouseEnabled variable is derived from the flag', () => {
        expect(PRODUCT_HISTORY).toMatch(/warehouseEnabled\s*=\s*store\?\.settings\?\.enable_warehouse_module/);
    });

    test('early-return renders plain bold total when warehouse is disabled', () => {
        // When !warehouseEnabled, only <b>{totalStock}</b> is returned.
        expect(PRODUCT_HISTORY).toMatch(/if\s*\(!warehouseEnabled\)/);
        expect(PRODUCT_HISTORY).toMatch(/return\s*<b>\{totalStock\}<\/b>/);
    });
});

// ─── 3. Warehouse-enabled path still intact ───────────────────────────────────

describe('product_history.js — warehouse breakdown renders when module is enabled', () => {
    test('OverlayTrigger is still present (warehouse-enabled path)', () => {
        expect(PRODUCT_HISTORY).toMatch(/OverlayTrigger/);
    });

    test('stock tooltip ID remains per-row unique (history.id)', () => {
        expect(PRODUCT_HISTORY).toMatch(/stock-tooltip-\$\{history\.id\}/);
    });

    test('per-warehouse rows are rendered inside the enabled path', () => {
        expect(PRODUCT_HISTORY).toMatch(/orderedEntries\.map/);
    });

    test('dotted underline visual affordance is on the tooltip trigger span', () => {
        expect(PRODUCT_HISTORY).toMatch(/textDecoration.*underline dotted/);
    });
});

// ─── 4. Guard: no accidental always-on warehouse display ─────────────────────

describe('product_history.js — warehouse breakdown is guarded, not always rendered', () => {
    test('OverlayTrigger is NOT rendered outside the warehouseEnabled branch', () => {
        // The early return (!warehouseEnabled → plain <b>) must come BEFORE the
        // OverlayTrigger block so disabled stores never reach it.
        const earlyReturnIdx  = PRODUCT_HISTORY.indexOf('if (!warehouseEnabled)');
        const overlayIdx      = PRODUCT_HISTORY.indexOf('<OverlayTrigger');
        expect(earlyReturnIdx).toBeGreaterThan(-1);
        expect(overlayIdx).toBeGreaterThan(-1);
        expect(earlyReturnIdx).toBeLessThan(overlayIdx);
    });

    test('warehouseEnabled check comes before orderedEntries construction', () => {
        const checkIdx    = PRODUCT_HISTORY.indexOf('warehouseEnabled');
        const entriesIdx  = PRODUCT_HISTORY.indexOf('orderedEntries');
        expect(checkIdx).toBeGreaterThan(-1);
        expect(entriesIdx).toBeGreaterThan(-1);
        expect(checkIdx).toBeLessThan(entriesIdx);
    });
});
