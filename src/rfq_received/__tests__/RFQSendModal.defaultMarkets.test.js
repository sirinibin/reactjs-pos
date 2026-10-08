/**
 * Tests for the "Default Purchase Markets to Forward RFQs" feature in the Send modal.
 *
 * When store settings have rfq_forward_markets configured, the Send modal should
 * pre-select only suppliers belonging to those default markets. Suppliers from
 * non-default markets are still shown in the list but start deselected.
 *
 * This tests the filtering logic used in applyData inside RFQSendModal.
 *
 * Covers:
 *  1.  No default markets configured → all suppliers pre-selected
 *  2.  Default markets set → only matching suppliers pre-selected
 *  3.  Suppliers with no purchase_market → always pre-selected (manually added)
 *  4.  Already-sent suppliers excluded regardless of market
 *  5.  Default markets set, some suppliers have matching market, some don't
 *  6.  Empty supplier list → empty selection
 *  7.  defaultMarkets Set is empty → all suppliers pre-selected
 */

// The filter logic mirrored from applyData in rfq_received/index.js:
// defaultMarkets is a Set (or null if not configured)
function filterByDefaultMarkets(suppliers, alreadySent, defaultMarkets) {
    const all = (suppliers || []).filter(s => !alreadySent.has(s.phone));
    if (!defaultMarkets || defaultMarkets.size === 0) return all;
    return all.filter(s => !s.purchase_market || defaultMarkets.has(s.purchase_market));
}

const makeSupplier = (phone, market) => ({ phone, purchase_market: market, name: 'Test' });

describe('RFQSendModal — default market pre-selection', () => {
    it('1. No default markets → all suppliers pre-selected', () => {
        const suppliers = [
            makeSupplier('+1', 'Jeddah'),
            makeSupplier('+2', 'Dubai'),
            makeSupplier('+3', 'Riyadh'),
        ];
        const result = filterByDefaultMarkets(suppliers, new Set(), null);
        expect(result.map(s => s.phone)).toEqual(['+1', '+2', '+3']);
    });

    it('2. Default markets set → only matching suppliers selected', () => {
        const suppliers = [
            makeSupplier('+1', 'Jeddah'),
            makeSupplier('+2', 'Dubai'),
            makeSupplier('+3', 'Riyadh'),
            makeSupplier('+4', 'Abu Dhabi'),
        ];
        const result = filterByDefaultMarkets(suppliers, new Set(), new Set(['Jeddah', 'Riyadh']));
        expect(result.map(s => s.phone)).toEqual(['+1', '+3']);
    });

    it('3. Supplier with no purchase_market is always included', () => {
        const suppliers = [
            makeSupplier('+1', 'Jeddah'),
            makeSupplier('+2', ''),        // empty string = no market
            makeSupplier('+3', undefined), // undefined = no market
            makeSupplier('+4', 'Dubai'),
        ];
        const result = filterByDefaultMarkets(suppliers, new Set(), new Set(['Jeddah']));
        expect(result.map(s => s.phone)).toEqual(['+1', '+2', '+3']);
    });

    it('4. Already-sent suppliers excluded regardless of market', () => {
        const suppliers = [
            makeSupplier('+1', 'Jeddah'),
            makeSupplier('+2', 'Jeddah'),
            makeSupplier('+3', 'Dubai'),
        ];
        const result = filterByDefaultMarkets(suppliers, new Set(['+1']), new Set(['Jeddah']));
        expect(result.map(s => s.phone)).toEqual(['+2']); // +1 already sent, +3 wrong market
    });

    it('5. Mixed: default markets filter out non-default, keep default-market suppliers', () => {
        const suppliers = [
            makeSupplier('+SA1', 'Jeddah'),
            makeSupplier('+SA2', 'Dammam'),
            makeSupplier('+SA3', 'Riyadh'),
            makeSupplier('+AE1', 'Dubai'),
            makeSupplier('+AE2', 'Abu Dhabi'),
        ];
        const defaults = new Set(['Jeddah', 'Dammam', 'Riyadh']);
        const result = filterByDefaultMarkets(suppliers, new Set(), defaults);
        expect(result.map(s => s.phone)).toEqual(['+SA1', '+SA2', '+SA3']);
    });

    it('6. Empty supplier list → empty selection', () => {
        const result = filterByDefaultMarkets([], new Set(), new Set(['Jeddah']));
        expect(result).toEqual([]);
    });

    it('7. defaultMarkets is an empty Set → all suppliers selected (same as null)', () => {
        const suppliers = [
            makeSupplier('+1', 'Jeddah'),
            makeSupplier('+2', 'Dubai'),
        ];
        const result = filterByDefaultMarkets(suppliers, new Set(), new Set());
        expect(result.map(s => s.phone)).toEqual(['+1', '+2']);
    });
});

// ── Per-market toggle button logic (Remove All ↔ Select All) ──────────────────
// Mirrors the unified button section in rfq_received/index.js.
// Rule: if a market has ANY selected supplier → show Remove All.
//       if a market has NO selected suppliers  → show Select All.
// Both never appear simultaneously for the same market.

function computeMarketButtons(supplierList, selectedPhones, sentPhones) {
    const selectedCount = {};
    const unselectedCount = {};
    supplierList.forEach(s => {
        if (!s.purchase_market || sentPhones.has(s.phone)) return;
        const mk = s.purchase_market;
        if (selectedPhones.has(s.phone)) {
            selectedCount[mk] = (selectedCount[mk] || 0) + 1;
        } else {
            unselectedCount[mk] = (unselectedCount[mk] || 0) + 1;
        }
    });
    const allMarkets = new Set([...Object.keys(selectedCount), ...Object.keys(unselectedCount)]);
    const buttons = {};
    for (const mk of allMarkets) {
        buttons[mk] = (selectedCount[mk] || 0) > 0 ? 'remove' : 'select';
    }
    return { buttons, selectedCount, unselectedCount };
}

const mkS = (phone, market) => ({ phone, purchase_market: market });

describe('RFQSendModal — per-market Remove All / Select All mutual exclusivity', () => {
    it('8. All selected in market → Remove All shown', () => {
        const suppliers = [mkS('+1', 'Jeddah'), mkS('+2', 'Jeddah')];
        const { buttons } = computeMarketButtons(suppliers, new Set(['+1', '+2']), new Set());
        expect(buttons['Jeddah']).toBe('remove');
    });

    it('9. None selected in market → Select All shown', () => {
        const suppliers = [mkS('+1', 'Jeddah'), mkS('+2', 'Jeddah')];
        const { buttons } = computeMarketButtons(suppliers, new Set(), new Set());
        expect(buttons['Jeddah']).toBe('select');
    });

    it('10. Partial selection → Remove All shown (any selected = remove)', () => {
        const suppliers = [mkS('+1', 'Jeddah'), mkS('+2', 'Jeddah')];
        const { buttons } = computeMarketButtons(suppliers, new Set(['+1']), new Set());
        expect(buttons['Jeddah']).toBe('remove');
    });

    it('11. After remove-all click (all deselected) → flips to Select All', () => {
        const suppliers = [mkS('+1', 'Jeddah'), mkS('+2', 'Jeddah')];
        // Before: all selected → remove
        const before = computeMarketButtons(suppliers, new Set(['+1', '+2']), new Set());
        expect(before.buttons['Jeddah']).toBe('remove');
        // After remove all: selectedPhones emptied for Jeddah
        const after = computeMarketButtons(suppliers, new Set(), new Set());
        expect(after.buttons['Jeddah']).toBe('select');
    });

    it('12. After select-all click (all selected) → flips to Remove All', () => {
        const suppliers = [mkS('+1', 'Dubai'), mkS('+2', 'Dubai')];
        // Before: none selected → select
        const before = computeMarketButtons(suppliers, new Set(), new Set());
        expect(before.buttons['Dubai']).toBe('select');
        // After select all: all selected
        const after = computeMarketButtons(suppliers, new Set(['+1', '+2']), new Set());
        expect(after.buttons['Dubai']).toBe('remove');
    });

    it('13. Two markets: one fully selected (remove), one fully deselected (select)', () => {
        const suppliers = [mkS('+1', 'Jeddah'), mkS('+2', 'Dubai')];
        const { buttons } = computeMarketButtons(suppliers, new Set(['+1']), new Set());
        expect(buttons['Jeddah']).toBe('remove');
        expect(buttons['Dubai']).toBe('select');
    });

    it('14. Sent suppliers ignored — do not affect button type', () => {
        const suppliers = [mkS('+1', 'Riyadh'), mkS('+2', 'Riyadh')];
        // +1 is sent (ignored), +2 is unselected → Select All
        const { buttons } = computeMarketButtons(suppliers, new Set(), new Set(['+1']));
        expect(buttons['Riyadh']).toBe('select');
    });
});
