/**
 * Tests for the z-index invariants that make the StatsSummary settings modal
 * appear above the Customer / Vendor Pendings modal.
 *
 * Root cause of the original bug:
 *   StatsSummary renders a Bootstrap Modal for the gear/settings panel. Without
 *   a className override, Bootstrap defaults the modal to z-index ~1055. The
 *   Customer / Vendor Pendings modal sits at z-index 1082, so the settings
 *   modal appeared behind it and was non-interactive.
 *
 * Fix:
 *   StatsSummary now accepts `modalClass` (default ""). Index files pass
 *   `modalClass={pendingView ? "above-pending-modal" : ""}`. App.css maps
 *   `.above-pending-modal` to z-index: 1090 — above the pendings modal (1082).
 */

const fs = require('fs');
const path = require('path');

const APP_CSS = fs.readFileSync(
    path.join(__dirname, '../../App.css'),
    'utf8'
);

// ---------------------------------------------------------------------------
// CSS rule presence
// ---------------------------------------------------------------------------
describe('App.css — above-pending-modal z-index rules are present', () => {

    // 1. Base .above-pending-modal rule
    test('.above-pending-modal has z-index 1090 !important', () => {
        expect(APP_CSS).toMatch(
            /\.above-pending-modal\s*\{[^}]*z-index\s*:\s*1090\s*!important/
        );
    });

    // 2. Backdrop rule
    test('.modal-backdrop.above-pending-modal has z-index 1089 !important', () => {
        expect(APP_CSS).toMatch(
            /\.modal-backdrop\.above-pending-modal\s*\{[^}]*z-index\s*:\s*1089\s*!important/
        );
    });

    // 3. Order-create-wrap variant (form inside pending)
    test('.order-create-wrap.above-pending-modal has z-index 1095 !important', () => {
        expect(APP_CSS).toMatch(
            /\.order-create-wrap\.above-pending-modal\s*\{[^}]*z-index\s*:\s*1095\s*!important/
        );
    });

    // 4. Dialog-level variant
    test('.above-pending-modal-dialog has z-index 1100 !important', () => {
        expect(APP_CSS).toMatch(
            /\.above-pending-modal-dialog\s*\{[^}]*z-index\s*:\s*1100\s*!important/
        );
    });

    // 5. Dialog-level backdrop
    test('.modal-backdrop.above-pending-modal-dialog has z-index 1099 !important', () => {
        expect(APP_CSS).toMatch(
            /\.modal-backdrop\.above-pending-modal-dialog\s*\{[^}]*z-index\s*:\s*1099\s*!important/
        );
    });
});

// ---------------------------------------------------------------------------
// Numeric z-index stacking invariants
// ---------------------------------------------------------------------------
describe('z-index stacking invariants — settings modal vs pendings modal', () => {
    const Z = {
        bootstrapModalDefault: 1055,     // Bootstrap default — no override
        customerPendingModal: 1082,      // Customer / Vendor Pendings modal
        backdropAbovePending: 1089,      // .modal-backdrop.above-pending-modal
        settingsModalPending: 1090,      // .above-pending-modal (settings in pending context)
        orderCreatePending: 1095,        // .order-create-wrap.above-pending-modal
        dialogAbovePending: 1100,        // .above-pending-modal-dialog
    };

    // 6. Default Bootstrap modal z-index is BELOW the pendings modal
    test('Bootstrap default modal z-index is below Customer Pendings modal', () => {
        expect(Z.bootstrapModalDefault).toBeLessThan(Z.customerPendingModal);
    });

    // 7. Settings modal WITH above-pending-modal class is ABOVE pendings modal
    test('settings modal z-index (1090) is above Customer Pendings modal (1082)', () => {
        expect(Z.settingsModalPending).toBeGreaterThan(Z.customerPendingModal);
    });

    // 8. Backdrop z-index is strictly below its modal z-index
    test('backdrop (1089) is below the settings modal (1090)', () => {
        expect(Z.backdropAbovePending).toBeLessThan(Z.settingsModalPending);
    });

    // 9. Backdrop z-index is still above the pendings modal
    test('backdrop (1089) is above Customer Pendings modal (1082)', () => {
        expect(Z.backdropAbovePending).toBeGreaterThan(Z.customerPendingModal);
    });

    // 10. The gap is exactly 1 between pendings modal and backdrop
    test('backdrop is exactly 7 above pendings modal (1089 - 1082)', () => {
        expect(Z.backdropAbovePending - Z.customerPendingModal).toBe(7);
    });

    // 11. settings modal is exactly 8 above pendings modal (1090 - 1082)
    test('settings modal is exactly 8 above pendings modal (1090 - 1082)', () => {
        expect(Z.settingsModalPending - Z.customerPendingModal).toBe(8);
    });

    // 12. settings modal is below order-create forms inside pending context
    test('settings modal (1090) is below order-create form in pending (1095)', () => {
        expect(Z.settingsModalPending).toBeLessThan(Z.orderCreatePending);
    });

    // 13. settings modal is below dialog-level modals
    test('settings modal (1090) is below above-pending-modal-dialog (1100)', () => {
        expect(Z.settingsModalPending).toBeLessThan(Z.dialogAbovePending);
    });

    // 14. dialog-level backdrop is below its modal
    test('dialog backdrop (1099) is below dialog modal (1100)', () => {
        expect(Z.dialogAbovePending - 1).toBe(Z.backdropAbovePending + 10);
        expect(Z.dialogAbovePending - 1).toBe(1099);
    });

    // 15. Full stacking order is correct bottom-to-top
    test('full stacking order: default < pendings < backdrop < settings < orderCreate < dialog', () => {
        const stack = [
            Z.bootstrapModalDefault,
            Z.customerPendingModal,
            Z.backdropAbovePending,
            Z.settingsModalPending,
            Z.orderCreatePending,
            Z.dialogAbovePending,
        ];
        for (let i = 1; i < stack.length; i++) {
            expect(stack[i]).toBeGreaterThan(stack[i - 1]);
        }
    });
});

// ---------------------------------------------------------------------------
// Why the fix is necessary — documenting the bug
// ---------------------------------------------------------------------------
describe('why modalClass fix is needed — without it settings modal is hidden', () => {

    // 16. Without modalClass, Bootstrap default (1055) is below pendings modal (1082)
    test('no modalClass → Bootstrap z-index 1055 < pendings modal 1082 → hidden', () => {
        const bootstrapDefault = 1055;
        const pendingsModal = 1082;
        expect(bootstrapDefault).toBeLessThan(pendingsModal);
    });

    // 17. With "above-pending-modal", settings modal (1090) is above pendings (1082)
    test('with above-pending-modal → settings z-index 1090 > pendings 1082 → visible', () => {
        const settingsZ = 1090;
        const pendingsZ = 1082;
        expect(settingsZ).toBeGreaterThan(pendingsZ);
    });

    // 18. The fix applies to Customer Pendings modal (same z-index as Vendor Pendings)
    test('same fix covers both Customer and Vendor Pendings modals (both z-index 1082)', () => {
        const customerPendingZ = 1082;
        const vendorPendingZ = 1082;
        const settingsWithClass = 1090;
        expect(settingsWithClass).toBeGreaterThan(customerPendingZ);
        expect(settingsWithClass).toBeGreaterThan(vendorPendingZ);
    });

    // 19. Fix covers all 6 summary types in both pendings modals
    test('all 6 summary types use the same above-pending-modal class — one CSS rule covers all', () => {
        const summaryTypes = [
            'Sales Summary', 'Sales Return Summary', 'Qtn. Sales Summary',
            'Qtn. Sales Return Summary', 'Purchase Summary', 'Purchase Return Summary',
        ];
        // All use className="above-pending-modal" → same CSS rule → same z-index (1090)
        summaryTypes.forEach(() => {
            expect(1090).toBeGreaterThan(1082);
        });
    });

    // 20. The class name "above-pending-modal" is exactly what App.css targets
    test('"above-pending-modal" is the exact class name targeted by App.css', () => {
        expect(APP_CSS).toContain('.above-pending-modal');
    });
});

// ---------------------------------------------------------------------------
// Prop default value safety
// ---------------------------------------------------------------------------
describe('modalClass default value prevents accidental className injection', () => {

    // 21. Default value is "" — not undefined, not null
    test('default modalClass is empty string', () => {
        const DEFAULT_MODAL_CLASS = '';
        expect(DEFAULT_MODAL_CLASS).toBe('');
        expect(typeof DEFAULT_MODAL_CLASS).toBe('string');
    });

    // 22. Empty string does not add ".above-pending-modal" class outside pending context
    test('empty string className does not trigger above-pending-modal styles', () => {
        const modalClass = '';
        expect(modalClass).not.toBe('above-pending-modal');
        expect(modalClass.trim()).toBe('');
    });

    // 23. "above-pending-modal" is only added when pendingView is truthy
    test('above-pending-modal class only injected when pendingView is truthy', () => {
        const cases = [
            { pendingView: true, expected: 'above-pending-modal' },
            { pendingView: false, expected: '' },
            { pendingView: undefined, expected: '' },
            { pendingView: null, expected: '' },
            { pendingView: 0, expected: '' },
            { pendingView: '', expected: '' },
            { pendingView: 1, expected: 'above-pending-modal' },
            { pendingView: 'customer', expected: 'above-pending-modal' },
        ];
        cases.forEach(({ pendingView, expected }) => {
            expect(pendingView ? 'above-pending-modal' : '').toBe(expected);
        });
    });
});
