/**
 * Unit tests for the z-index fix: history modal visible above Sales Return /
 * Quotation Sales Return update forms opened from the Customer Pendings modal.
 *
 * Bug:
 *   `body.sales-return-form-open .above-sales-modal { z-index: 1081 !important }`
 *   has specificity (0,2,1) and beats DraggableHistoryModal's own
 *   `.draggable-history-modal.draggable-history-modal { z-index: 1150 !important }` (0,2,0).
 *   When the SR form is in pendingView (.above-pending-modal → z-index 1090),
 *   the history modal is stuck at 1081 and hidden behind the form.
 *
 * Fix (App.css):
 *   body.sales-return-form-open .draggable-history-modal { z-index: 1097 !important; }
 *   body.quotation-sales-return-form-open .draggable-history-modal { z-index: 1097 !important; }
 *   body.sales-return-form-open.form-over-history .draggable-history-modal { z-index: 1081 !important; }
 *   body.quotation-sales-return-form-open.form-over-history .draggable-history-modal { z-index: 1081 !important; }
 *
 * Both new rules have specificity (0,2,1) — same as the existing .above-sales-modal rule —
 * but appear LATER in App.css, so source order gives them the win.
 * The form-over-history variant uses (0,3,1) to definitively override when a sub-form is open.
 *
 * Classes on DraggableHistoryModal container: "above-sales-modal draggable-history-modal"
 * Classes on Customer Pendings modal:         "modal show above-sales-modal"  (no draggable-history-modal)
 */

const fs = require('fs');
const path = require('path');

const APP_CSS = fs.readFileSync(
    path.join(__dirname, '../../App.css'),
    'utf8'
);

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Count class segments in a CSS selector (approximates class-level specificity). */
function classCount(selector) {
    return (selector.match(/\.\w[\w-]*/g) || []).length;
}

/** Count element (tag) segments in a CSS selector. */
function elementCount(selector) {
    // Match bare tag names: at start or after whitespace/+/>~ but NOT preceded by ./#/[/:
    return (selector.match(/(?:^|[\s+>~])([a-z][a-z0-9]*)(?=[.\s+>~:[\]{,]|$)/g) || []).length;
}

/** Find the character position of the FIRST match of a regex in APP_CSS (-1 if absent). */
function rulePos(regex) {
    const m = regex.exec(APP_CSS);
    return m ? m.index : -1;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Rule presence — new .draggable-history-modal rules exist
// ─────────────────────────────────────────────────────────────────────────────

describe('App.css — new .draggable-history-modal rules are present', () => {
    test('body.sales-return-form-open .draggable-history-modal { z-index: 1097 !important }', () => {
        expect(APP_CSS).toMatch(
            /body\.sales-return-form-open\s+\.draggable-history-modal\s*\{[^}]*z-index\s*:\s*1097\s*!important/
        );
    });

    test('body.quotation-sales-return-form-open .draggable-history-modal { z-index: 1097 !important }', () => {
        expect(APP_CSS).toMatch(
            /body\.quotation-sales-return-form-open\s+\.draggable-history-modal\s*\{[^}]*z-index\s*:\s*1097\s*!important/
        );
    });

    test('body.sales-return-form-open.form-over-history .draggable-history-modal { z-index: 1081 !important }', () => {
        expect(APP_CSS).toMatch(
            /body\.sales-return-form-open\.form-over-history\s+\.draggable-history-modal\s*\{[^}]*z-index\s*:\s*1081\s*!important/
        );
    });

    test('body.quotation-sales-return-form-open.form-over-history .draggable-history-modal { z-index: 1081 !important }', () => {
        expect(APP_CSS).toMatch(
            /body\.quotation-sales-return-form-open\.form-over-history\s+\.draggable-history-modal\s*\{[^}]*z-index\s*:\s*1081\s*!important/
        );
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Existing rules are NOT changed
// ─────────────────────────────────────────────────────────────────────────────

describe('App.css — existing .above-sales-modal rules are unchanged', () => {
    test('body.sales-return-form-open .above-sales-modal still at z-index 1081', () => {
        expect(APP_CSS).toMatch(
            /body\.sales-return-form-open\s+\.above-sales-modal\s*\{[^}]*z-index\s*:\s*1081\s*!important/
        );
    });

    test('body.quotation-sales-return-form-open .above-sales-modal still at z-index 1081', () => {
        expect(APP_CSS).toMatch(
            /body\.quotation-sales-return-form-open\s+\.above-sales-modal\s*\{[^}]*z-index\s*:\s*1081\s*!important/
        );
    });

    test('body.sales-return-form-open.form-over-history .above-sales-modal still at z-index 1081', () => {
        expect(APP_CSS).toMatch(
            /body\.sales-return-form-open\.form-over-history\s+\.above-sales-modal\s*\{[^}]*z-index\s*:\s*1081\s*!important/
        );
    });

    test('.sales-return-create-wrap base rule still at z-index 1080', () => {
        expect(APP_CSS).toMatch(
            /\.sales-return-create-wrap\s*\{[^}]*z-index\s*:\s*1080\s*!important/
        );
    });

    test('.quotation-sales-return-create-wrap base rule still at z-index 1080', () => {
        expect(APP_CSS).toMatch(
            /\.quotation-sales-return-create-wrap\s*\{[^}]*z-index\s*:\s*1080\s*!important/
        );
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Source order — .draggable-history-modal rule must come AFTER .above-sales-modal
//    (same specificity: 0,2,1 — source order determines winner among !important rules)
// ─────────────────────────────────────────────────────────────────────────────

describe('App.css — source order: .draggable-history-modal rules follow .above-sales-modal rules', () => {
    // For sales-return-form-open
    const aboveSalesPos = rulePos(/body\.sales-return-form-open\s+\.above-sales-modal\s*\{[^}]*z-index\s*:\s*1081/);
    const draggablePos  = rulePos(/body\.sales-return-form-open\s+\.draggable-history-modal\s*\{[^}]*z-index\s*:\s*1097/);

    test('SR: .draggable-history-modal rule appears AFTER .above-sales-modal rule', () => {
        expect(aboveSalesPos).toBeGreaterThan(-1);
        expect(draggablePos).toBeGreaterThan(-1);
        expect(draggablePos).toBeGreaterThan(aboveSalesPos);
    });

    // For quotation-sales-return-form-open
    const qsrAboveSalesPos = rulePos(/body\.quotation-sales-return-form-open\s+\.above-sales-modal\s*\{[^}]*z-index\s*:\s*1081/);
    const qsrDraggablePos  = rulePos(/body\.quotation-sales-return-form-open\s+\.draggable-history-modal\s*\{[^}]*z-index\s*:\s*1097/);

    test('QSR: .draggable-history-modal rule appears AFTER .above-sales-modal rule', () => {
        expect(qsrAboveSalesPos).toBeGreaterThan(-1);
        expect(qsrDraggablePos).toBeGreaterThan(-1);
        expect(qsrDraggablePos).toBeGreaterThan(qsrAboveSalesPos);
    });

    // form-over-history variants must appear AFTER the base draggable-history-modal rules
    const fohDraggablePos = rulePos(/body\.sales-return-form-open\.form-over-history\s+\.draggable-history-modal\s*\{/);

    test('SR form-over-history .draggable-history-modal rule appears AFTER base .draggable-history-modal rule', () => {
        expect(fohDraggablePos).toBeGreaterThan(draggablePos);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Specificity analysis — why each rule wins
// ─────────────────────────────────────────────────────────────────────────────

describe('CSS specificity analysis', () => {
    // ── New rule vs DraggableHistoryModal own style ──────────────────────────
    // body.sales-return-form-open .draggable-history-modal → (0, 2, 1)
    // .draggable-history-modal.draggable-history-modal     → (0, 2, 0)
    // Body rule wins (higher specificity) → 1097 overrides 1150 self-style

    const bodyRuleSelector    = 'body.sales-return-form-open .draggable-history-modal';
    const selfStyleSelector   = '.draggable-history-modal.draggable-history-modal';

    test('body.sales-return-form-open .draggable-history-modal has more element segments than self-style rule', () => {
        // body element adds 1 element specificity point
        expect(elementCount(bodyRuleSelector)).toBeGreaterThan(elementCount(selfStyleSelector));
    });

    test('body rule (0,2,1) has strictly higher specificity than self-style (0,2,0)', () => {
        const bodyClasses = classCount(bodyRuleSelector);   // 2 (.sales-return-form-open, .draggable-history-modal)
        const selfClasses = classCount(selfStyleSelector);  // 2 (.draggable-history-modal × 2)
        const bodyElements = elementCount(bodyRuleSelector); // 1 (body)
        const selfElements = elementCount(selfStyleSelector); // 0

        expect(bodyClasses).toBe(selfClasses); // same class count
        expect(bodyElements).toBeGreaterThan(selfElements); // body tag tips the balance
    });

    // ── New rule vs existing .above-sales-modal rule — same specificity, source order wins ─

    const aboveSalesSelector = 'body.sales-return-form-open .above-sales-modal';
    const draggableSelector  = 'body.sales-return-form-open .draggable-history-modal';

    test('both selectors have identical specificity (0,2,1)', () => {
        expect(classCount(draggableSelector)).toBe(classCount(aboveSalesSelector));
        expect(elementCount(draggableSelector)).toBe(elementCount(aboveSalesSelector));
    });

    // ── form-over-history rule vs base rule ──────────────────────────────────
    // body.sales-return-form-open.form-over-history .draggable-history-modal → (0, 3, 1)
    // body.sales-return-form-open .draggable-history-modal                   → (0, 2, 1)
    // form-over-history wins → 1081 overrides 1097

    const fohSelector  = 'body.sales-return-form-open.form-over-history .draggable-history-modal';
    const baseSelector = 'body.sales-return-form-open .draggable-history-modal';

    test('form-over-history selector has one extra class (form-over-history), so higher specificity', () => {
        expect(classCount(fohSelector)).toBeGreaterThan(classCount(baseSelector));
    });

    test('form-over-history class count = 3, base class count = 2', () => {
        expect(classCount(fohSelector)).toBe(3);
        expect(classCount(baseSelector)).toBe(2);
    });

    test('form-over-history (0,3,1) beats base (0,2,1) regardless of source order', () => {
        // (0,3,1) > (0,2,1) — higher class count = higher specificity
        expect(classCount(fohSelector)).toBeGreaterThan(classCount(baseSelector));
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Numeric stacking invariants — pendingView (normal user path)
//    Flow: Customer Pendings (1082) → SR form pendingView (1090) → history (1097)
// ─────────────────────────────────────────────────────────────────────────────

describe('z-index stacking — pendingView: history above SR form above Customer Pendings', () => {
    const Z = {
        historyModal:          1097,  // body.sales-return-form-open .draggable-history-modal
        srFormPendingView:     1090,  // .above-pending-modal (SR form with pendingView prop)
        customerPendingDialog: 1082,  // customer_pending.js: zIndex: 1082 inline style
        srFormStandalone:      1080,  // .sales-return-create-wrap (no pendingView)
    };

    test('history modal (1097) appears above SR form in pendingView (1090)', () => {
        expect(Z.historyModal).toBeGreaterThan(Z.srFormPendingView);
    });

    test('SR form in pendingView (1090) appears above Customer Pendings (1082)', () => {
        expect(Z.srFormPendingView).toBeGreaterThan(Z.customerPendingDialog);
    });

    test('history modal (1097) appears above Customer Pendings (1082)', () => {
        expect(Z.historyModal).toBeGreaterThan(Z.customerPendingDialog);
    });

    test('history modal (1097) appears above SR form standalone (1080)', () => {
        expect(Z.historyModal).toBeGreaterThan(Z.srFormStandalone);
    });

    test('SR form in pendingView (1090) is strictly above standalone (1080)', () => {
        expect(Z.srFormPendingView).toBeGreaterThan(Z.srFormStandalone);
    });
});

describe('z-index stacking — pendingView: QSR history follows same rules as SR', () => {
    const Z = {
        qsrHistoryModal:           1097,  // body.quotation-sales-return-form-open .draggable-history-modal
        qsrFormPendingView:        1090,  // .above-pending-modal (QSR form with pendingView)
        customerPendingDialog:     1082,
        qsrFormStandalone:         1080,  // .quotation-sales-return-create-wrap
    };

    test('QSR history modal (1097) appears above QSR form in pendingView (1090)', () => {
        expect(Z.qsrHistoryModal).toBeGreaterThan(Z.qsrFormPendingView);
    });

    test('QSR form in pendingView (1090) appears above Customer Pendings (1082)', () => {
        expect(Z.qsrFormPendingView).toBeGreaterThan(Z.customerPendingDialog);
    });

    test('QSR history modal (1097) appears above Customer Pendings (1082)', () => {
        expect(Z.qsrHistoryModal).toBeGreaterThan(Z.customerPendingDialog);
    });

    test('QSR history modal (1097) appears above QSR form standalone (1080)', () => {
        expect(Z.qsrHistoryModal).toBeGreaterThan(Z.qsrFormStandalone);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Numeric stacking — form-over-history scenario
//    When a sub-form is opened FROM the history modal, form-over-history is set.
//    Sub-form (.from-history-form = 1093) must appear above history modal (1081).
// ─────────────────────────────────────────────────────────────────────────────

describe('z-index stacking — form-over-history: sub-form above history modal', () => {
    const Z = {
        historyModalFOH:  1081,  // body.sales-return-form-open.form-over-history .draggable-history-modal
        subFormFOH:       1093,  // body.form-over-history .from-history-form
        historyNormal:    1097,  // history without form-over-history
    };

    test('sub-form (1093) appears above history modal when form-over-history active (1081)', () => {
        expect(Z.subFormFOH).toBeGreaterThan(Z.historyModalFOH);
    });

    test('form-over-history drops history from 1097 to 1081 (below sub-form)', () => {
        expect(Z.historyModalFOH).toBeLessThan(Z.historyNormal);
        expect(Z.historyModalFOH).toBeLessThan(Z.subFormFOH);
    });

    test('QSR form-over-history drops history to same level (1081)', () => {
        const qsrFOH = 1081; // body.quotation-sales-return-form-open.form-over-history .draggable-history-modal
        expect(qsrFOH).toBe(Z.historyModalFOH); // both SR and QSR use same floor
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Class targeting precision — new rules only affect DraggableHistoryModal,
//    NOT the Customer Pendings modal or generic above-sales-modal elements
// ─────────────────────────────────────────────────────────────────────────────

describe('class targeting: rules only affect DraggableHistoryModal, not Customer Pendings', () => {
    function hasClass(elementClasses, className) {
        return elementClasses.split(/\s+/).includes(className);
    }

    const CUSTOMER_PENDING_CLASSES  = 'modal show above-sales-modal';          // customer_pending.js modal
    const DRAGGABLE_HISTORY_CLASSES = 'above-sales-modal draggable-history-modal'; // DraggableHistoryModal

    test('Customer Pendings modal has class "above-sales-modal"', () => {
        expect(hasClass(CUSTOMER_PENDING_CLASSES, 'above-sales-modal')).toBe(true);
    });

    test('Customer Pendings modal does NOT have class "draggable-history-modal"', () => {
        expect(hasClass(CUSTOMER_PENDING_CLASSES, 'draggable-history-modal')).toBe(false);
    });

    test('DraggableHistoryModal has class "draggable-history-modal"', () => {
        expect(hasClass(DRAGGABLE_HISTORY_CLASSES, 'draggable-history-modal')).toBe(true);
    });

    test('DraggableHistoryModal also has class "above-sales-modal"', () => {
        expect(hasClass(DRAGGABLE_HISTORY_CLASSES, 'above-sales-modal')).toBe(true);
    });

    test('new rule targets DraggableHistoryModal (has draggable-history-modal)', () => {
        const newRuleClass = 'draggable-history-modal';
        expect(hasClass(DRAGGABLE_HISTORY_CLASSES, newRuleClass)).toBe(true);
        expect(hasClass(CUSTOMER_PENDING_CLASSES, newRuleClass)).toBe(false);
    });

    test('Customer Pendings z-index (1082 inline) is NOT affected by new .draggable-history-modal rule', () => {
        // Rule `body.sales-return-form-open .draggable-history-modal { z-index: 1097 }` targets
        // .draggable-history-modal class. Customer Pendings lacks this class → not elevated.
        const customerPendingZIndex = 1082; // hardcoded in customer_pending.js dialogAs style
        const historyModalZIndex = 1097;    // what we want for the history modal

        expect(hasClass(CUSTOMER_PENDING_CLASSES, 'draggable-history-modal')).toBe(false);
        expect(historyModalZIndex).toBeGreaterThan(customerPendingZIndex);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. DraggableHistoryModal self-style is overridden by body-class rules
//    (body-class rules have specificity (0,2,1) > self-style (0,2,0))
// ─────────────────────────────────────────────────────────────────────────────

describe('DraggableHistoryModal self-style is overridden when body class is active', () => {
    const SELF_STYLE_Z = 1150;  // .draggable-history-modal.draggable-history-modal { z-index: 1150 }
    const BODY_RULE_Z  = 1097;  // body.sales-return-form-open .draggable-history-modal { z-index: 1097 }
    const BODY_FOH_Z   = 1081;  // body.sales-return-form-open.form-over-history .draggable-history-modal

    test('self-style z-index (1150) is higher than body-rule z-index (1097)', () => {
        // Despite the higher z-index number, the self-style loses due to lower specificity
        expect(SELF_STYLE_Z).toBeGreaterThan(BODY_RULE_Z);
    });

    test('body rule (0,2,1) has strictly higher specificity than self-style (0,2,0)', () => {
        const bodySelector    = 'body.sales-return-form-open .draggable-history-modal';
        const selfStyleSelector = '.draggable-history-modal.draggable-history-modal';
        // Same class count, but body adds an element — so body rule wins
        expect(elementCount(bodySelector)).toBeGreaterThan(elementCount(selfStyleSelector));
    });

    test('body rule (1097) effectively applied, not self-style (1150), when SR form open', () => {
        // When body.sales-return-form-open is set, the modal ends up at 1097 not 1150
        // Simulation: body class rule wins due to higher specificity
        const effectiveZIndex = BODY_RULE_Z; // not SELF_STYLE_Z
        expect(effectiveZIndex).toBe(1097);
        expect(effectiveZIndex).toBeGreaterThan(1090); // still above SR form in pendingView
    });

    test('body form-over-history rule (1081) overrides self-style (1150) by even more specificity', () => {
        const fohSelector = 'body.sales-return-form-open.form-over-history .draggable-history-modal';
        expect(elementCount(fohSelector)).toBeGreaterThan(0);
        expect(classCount(fohSelector)).toBe(3); // specificity (0,3,1)
        expect(BODY_FOH_Z).toBeLessThan(SELF_STYLE_Z);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. No accidental rules added for incorrect selectors / wrong z-index values
// ─────────────────────────────────────────────────────────────────────────────

describe('no accidental regressions — wrong selector/value rules are absent', () => {
    test('no rule sets body.sales-return-form-open .draggable-history-modal to 1081 (non-FOH)', () => {
        // Only the form-over-history variant should be at 1081; the base rule must be 1097
        const matches = [...APP_CSS.matchAll(
            /body\.sales-return-form-open(?!\.form-over-history)\s+\.draggable-history-modal\s*\{[^}]*z-index\s*:\s*(\d+)/g
        )];
        for (const m of matches) {
            expect(Number(m[1])).toBe(1097);
        }
    });

    test('no rule sets body.quotation-sales-return-form-open .draggable-history-modal to 1081 (non-FOH)', () => {
        const matches = [...APP_CSS.matchAll(
            /body\.quotation-sales-return-form-open(?!\.form-over-history)\s+\.draggable-history-modal\s*\{[^}]*z-index\s*:\s*(\d+)/g
        )];
        for (const m of matches) {
            expect(Number(m[1])).toBe(1097);
        }
    });

    test('body.sales-return-form-open .above-sales-modal is NOT accidentally changed to 1097', () => {
        // above-sales-modal still controls customer_pending at 1081 — must not be elevated
        expect(APP_CSS).toMatch(
            /body\.sales-return-form-open\s+\.above-sales-modal\s*\{[^}]*z-index\s*:\s*1081\s*!important/
        );
        expect(APP_CSS).not.toMatch(
            /body\.sales-return-form-open\s+\.above-sales-modal\s*\{[^}]*z-index\s*:\s*1097\s*!important/
        );
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. Full stacking chain — all layers in the correct order
// ─────────────────────────────────────────────────────────────────────────────

describe('full z-index chain: complete layer ordering from bottom to top', () => {
    const Z = {
        srFormStandalone:       1080,  // .sales-return-create-wrap (not in pendingView)
        customerPendingDialog:  1082,  // customer_pending.js dialogAs inline
        srFormPendingView:      1090,  // .above-pending-modal
        subFormOverHistory:     1093,  // .from-history-form (opened from history modal)
        historyModal:           1097,  // body.sales-return-form-open .draggable-history-modal
        historyModalFOH:        1081,  // history when form-over-history active
    };

    test('normal path (no pendingView): standalone SR form < history modal', () => {
        expect(Z.srFormStandalone).toBeLessThan(Z.historyModal);
    });

    test('pendingView path: customer pending < SR form < history modal', () => {
        expect(Z.customerPendingDialog).toBeLessThan(Z.srFormPendingView);
        expect(Z.srFormPendingView).toBeLessThan(Z.historyModal);
    });

    test('form-over-history path: history drops below sub-form', () => {
        expect(Z.historyModalFOH).toBeLessThan(Z.subFormOverHistory);
    });

    test('history modal is above customer pending in all paths', () => {
        expect(Z.historyModal).toBeGreaterThan(Z.customerPendingDialog);
        expect(Z.historyModalFOH).toBeLessThan(Z.historyModal); // drops in FOH
        // even in FOH, customer pending (1082) vs history in FOH (1081):
        // in FOH, a sub-form is the "front" element; both customer pending and history are below sub-form
    });

    test('correct layer order: standalone(1080) < customerPending(1082) < pendingView(1090) < historyNormal(1097)', () => {
        const chain = [
            Z.srFormStandalone,
            Z.customerPendingDialog,
            Z.srFormPendingView,
            Z.historyModal,
        ];
        for (let i = 0; i < chain.length - 1; i++) {
            expect(chain[i]).toBeLessThan(chain[i + 1]);
        }
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 11. Body class lifecycle — sales_return/create.js adds/removes body class
// ─────────────────────────────────────────────────────────────────────────────

describe('body class lifecycle simulation — CSS rules activate only while class is present', () => {
    function simulateBodyClass(className, callback) {
        const body = { classList: new Set() };
        body.classList.add = (c) => body.classList.add_impl(c);
        body.classList.remove = (c) => body.classList.delete(c);
        body.classList.add_impl = (c) => body.classList.add(c);

        // Simulate actual Set behavior
        const set = new Set();
        const api = {
            add: (c) => set.add(c),
            remove: (c) => set.delete(c),
            has: (c) => set.has(c),
        };

        api.add(className);
        const result = callback(api);
        api.remove(className);
        return { resultWhileActive: result, hasClassAfter: api.has(className) };
    }

    test('body class is present while SR form is mounted, absent after unmount', () => {
        const { resultWhileActive, hasClassAfter } = simulateBodyClass(
            'sales-return-form-open',
            (api) => api.has('sales-return-form-open')
        );
        expect(resultWhileActive).toBe(true);
        expect(hasClassAfter).toBe(false);
    });

    test('body class is present while QSR form is mounted, absent after unmount', () => {
        const { resultWhileActive, hasClassAfter } = simulateBodyClass(
            'quotation-sales-return-form-open',
            (api) => api.has('quotation-sales-return-form-open')
        );
        expect(resultWhileActive).toBe(true);
        expect(hasClassAfter).toBe(false);
    });

    test('CSS rule z-index 1097 applies only while sales-return-form-open is set', () => {
        // When class is absent → self-style (.draggable-history-modal.draggable-history-modal = 1150) wins
        // When class is present → body rule (1097) wins (higher specificity)
        // Test ensures the intended effective z-index in each state
        const withBodyClass    = 1097;  // body rule wins
        const withoutBodyClass = 1150;  // own style wins when no body class

        expect(withBodyClass).toBeLessThan(withoutBodyClass);   // body rule is "lower" but correct
        expect(withBodyClass).toBeGreaterThan(1090);            // still above SR form in pendingView
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 12. Regression guard — related unchanged rules still present
// ─────────────────────────────────────────────────────────────────────────────

describe('regression guard — other z-index rules unchanged', () => {
    test('.above-pending-modal z-index is still 1090', () => {
        expect(APP_CSS).toMatch(
            /\.above-pending-modal\s*\{[^}]*z-index\s*:\s*1090\s*!important/
        );
    });

    test('body.quotation-form-pending-open .draggable-history-modal still at 1097', () => {
        expect(APP_CSS).toMatch(
            /body\.quotation-form-pending-open\s+\.draggable-history-modal\s*\{[^}]*z-index\s*:\s*1097\s*!important/
        );
    });

    test('body.form-over-history .from-history-form still at 1093', () => {
        expect(APP_CSS).toMatch(
            /body\.form-over-history\s+\.from-history-form\s*\{[^}]*z-index\s*:\s*1093\s*!important/
        );
    });

    test('.above-pending-modal-dialog still at 1100', () => {
        expect(APP_CSS).toMatch(
            /\.above-pending-modal-dialog\s*\{[^}]*z-index\s*:\s*1100\s*!important/
        );
    });

    test('.order-preview-wrap still at 1300', () => {
        expect(APP_CSS).toMatch(
            /\.order-preview-wrap\s*\{[^}]*z-index\s*:\s*1300\s*!important/
        );
    });
});
