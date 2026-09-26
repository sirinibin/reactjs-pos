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
