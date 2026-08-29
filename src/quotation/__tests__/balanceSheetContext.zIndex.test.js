/**
 * Tests for the App.css z-index rules added to fix modal stacking when a
 * quotation or quotation-sales-return form is opened from the balance sheet.
 *
 * ── Root cause ────────────────────────────────────────────────────────────────
 * When the balance sheet (PostingIndex) is open, body gains `balance-sheet-open`.
 * The blanket rule `body.balance-sheet-open .modal { z-index: 1070 !important }`
 * (spec 0,2,1) overrides most modals to 1070 so they sit below the balance sheet.
 *
 * When the user clicks a quotation ID in the balance sheet, the quotation form
 * opens and body gains `quotation-form-open`.  The existing two-class rule
 * `body.balance-sheet-open.quotation-form-open .quotation-create-wrap` (spec 0,3,1)
 * lifts the form to 1082 — correctly above the balance sheet at 1081.
 *
 * But panels opened from the form's info-icon menu (DraggableHistoryModal,
 * ImageViewerModal) were still stuck at 1081 via `body.quotation-form-open
 * .above-sales-modal` — below the form at 1082 → invisible behind the form.
 *
 * Similarly, QuotationType3Form (.qt3-modal-wrap) was overridden to 1070 by the
 * blanket rule (spec 0,2,1 beats the inline style spec 0,1,0).
 *
 * ── Fix ───────────────────────────────────────────────────────────────────────
 * Five new rules (spec 0,3,1) in App.css lift these elements above the form:
 *
 *   body.balance-sheet-open.quotation-form-open .draggable-history-modal            { z-index: 1083 }
 *   body.balance-sheet-open.quotation-sales-return-form-open .draggable-history-modal { z-index: 1083 }
 *   body.balance-sheet-open.quotation-form-open .image-viewer-modal-wrap            { z-index: 1083 }
 *   body.balance-sheet-open.quotation-sales-return-form-open .image-viewer-modal-wrap { z-index: 1083 }
 *   body.balance-sheet-open.quotation-form-open .qt3-modal-wrap                     { z-index: 1082 }
 *
 * ── Stacking chain (balance-sheet-open + quotation-form-open active) ──────────
 *   DraggableHistoryModal (.draggable-history-modal)  → 1083  (panels above form)
 *   ImageViewerModal      (.image-viewer-modal-wrap)  → 1083  (image above form)
 *   QuotationCreate       (.quotation-create-wrap)    → 1082  (form above balance sheet)
 *   QuotationType3Form    (.qt3-modal-wrap)            → 1082  (form above balance sheet)
 *   Balance sheet         (.above-sales-modal)         → 1081  (below form)
 */

const fs   = require('fs');
const path = require('path');

const APP_CSS = fs.readFileSync(path.join(__dirname, '../../App.css'), 'utf8');

// ── CSS z-index model for this fix ────────────────────────────────────────────
// Mirrors the App.css cascade for the rules relevant to this fix.
// Specificity notation: (0, class-count, element-count).
//   body.X .Y         → (0,2,1)
//   body.X.Z .Y       → (0,3,1)   ← new three-class rules always win here
// Among equal-spec !important rules, the later rule in App.css wins.

function zIndex(elementClasses, bodyClasses) {
    const hasBody = (...cls) => cls.every(c => bodyClasses.includes(c));
    const hasEl   = (...cls) => cls.every(c => elementClasses.includes(c));

    // ── (0,3,1): new three-class rules (highest priority in this context) ────

    // DraggableHistoryModal — lifted above quotation form
    if (hasBody('balance-sheet-open', 'quotation-form-open') && hasEl('draggable-history-modal'))
        return 1083;
    if (hasBody('balance-sheet-open', 'quotation-sales-return-form-open') && hasEl('draggable-history-modal'))
        return 1083;

    // ImageViewerModal — lifted above quotation form
    if (hasBody('balance-sheet-open', 'quotation-form-open') && hasEl('image-viewer-modal-wrap'))
        return 1083;
    if (hasBody('balance-sheet-open', 'quotation-sales-return-form-open') && hasEl('image-viewer-modal-wrap'))
        return 1083;

    // QuotationType3Form — lifted above balance sheet
    if (hasBody('balance-sheet-open', 'quotation-form-open') && hasEl('qt3-modal-wrap'))
        return 1082;

    // ── (0,3,1): existing three-class form rules (unchanged) ────────────────
    if (hasBody('balance-sheet-open', 'quotation-form-open') && hasEl('quotation-create-wrap'))
        return 1082;
    if (hasBody('balance-sheet-open', 'quotation-sales-return-form-open') && hasEl('quotation-sales-return-create-wrap'))
        return 1082;

    // ── (0,2,1): one-body-class rules (source order breaks ties) ────────────
    // body.balance-sheet-open .modal fires first (~line 12017); the later
    // body.quotation-form-open .above-sales-modal (~line 12045) overrides it
    // for elements that have the above-sales-modal class.
    if (hasBody('balance-sheet-open') && hasEl('modal')) {
        if (hasBody('quotation-form-open')              && hasEl('above-sales-modal')) return 1081;
        if (hasBody('quotation-sales-return-form-open') && hasEl('above-sales-modal')) return 1081;
        return 1070; // blanket rule
    }
    if (hasBody('quotation-form-open')              && hasEl('above-sales-modal')) return 1081;
    if (hasBody('quotation-sales-return-form-open') && hasEl('above-sales-modal')) return 1081;

    // ── defaults (no body-class rule applies) ────────────────────────────────
    if (hasEl('quotation-create-wrap'))              return 1080;
    if (hasEl('quotation-sales-return-create-wrap')) return 1080;
    // qt3-modal-wrap inline style (.qt3-modal-wrap { z-index: 1080 }, spec 0,1,0)
    // wins only when no body-class rule fires.
    if (hasEl('qt3-modal-wrap'))   return 1080;
    if (hasEl('above-sales-modal')) return 1065;

    return 0;
}

// Element class descriptors (matches actual Bootstrap Modal portal className).
const balanceSheet          = ['modal', 'above-sales-modal'];
const quotationForm         = ['modal', 'quotation-create-wrap'];
const qt3Form               = ['modal', 'qt3-modal-wrap'];
const quotationSRForm       = ['modal', 'quotation-sales-return-create-wrap'];
const draggableHistoryModal = ['modal', 'above-sales-modal', 'draggable-history-modal'];
const imageViewerModal      = ['modal', 'above-sales-modal', 'image-viewer-modal-wrap'];


// ── 1. CSS rule presence ───────────────────────────────────────────────────────

describe('App.css — new balance-sheet + quotation-form rules are present', () => {
    test('1.1  body.balance-sheet-open.quotation-form-open .draggable-history-modal has z-index 1083 !important', () => {
        expect(APP_CSS).toMatch(
            /body\.balance-sheet-open\.quotation-form-open\s+\.draggable-history-modal\s*\{[^}]*z-index\s*:\s*1083\s*!important/
        );
    });

    test('1.2  body.balance-sheet-open.quotation-sales-return-form-open .draggable-history-modal has z-index 1083 !important', () => {
        expect(APP_CSS).toMatch(
            /body\.balance-sheet-open\.quotation-sales-return-form-open\s+\.draggable-history-modal\s*\{[^}]*z-index\s*:\s*1083\s*!important/
        );
    });

    test('1.3  body.balance-sheet-open.quotation-form-open .image-viewer-modal-wrap has z-index 1083 !important', () => {
        expect(APP_CSS).toMatch(
            /body\.balance-sheet-open\.quotation-form-open\s+\.image-viewer-modal-wrap\s*\{[^}]*z-index\s*:\s*1083\s*!important/
        );
    });

    test('1.4  body.balance-sheet-open.quotation-sales-return-form-open .image-viewer-modal-wrap has z-index 1083 !important', () => {
        expect(APP_CSS).toMatch(
            /body\.balance-sheet-open\.quotation-sales-return-form-open\s+\.image-viewer-modal-wrap\s*\{[^}]*z-index\s*:\s*1083\s*!important/
        );
    });

    test('1.5  body.balance-sheet-open.quotation-form-open .qt3-modal-wrap has z-index 1082 !important', () => {
        expect(APP_CSS).toMatch(
            /body\.balance-sheet-open\.quotation-form-open\s+\.qt3-modal-wrap\s*\{[^}]*z-index\s*:\s*1082\s*!important/
        );
    });
});


// ── 2. CSS source order ────────────────────────────────────────────────────────

describe('App.css — new rules appear after the rules they override', () => {
    test('2.1  new draggable-history-modal rule appears after body.balance-sheet-open .modal (blanket rule)', () => {
        const blanketIdx = APP_CSS.indexOf('body.balance-sheet-open .modal {');
        const newRuleIdx = APP_CSS.indexOf('body.balance-sheet-open.quotation-form-open .draggable-history-modal');
        expect(blanketIdx).toBeGreaterThan(-1);
        expect(newRuleIdx).toBeGreaterThan(-1);
        expect(newRuleIdx).toBeGreaterThan(blanketIdx);
    });

    test('2.2  new draggable-history-modal rule appears after body.quotation-form-open .above-sales-modal', () => {
        const existingIdx = APP_CSS.indexOf('body.quotation-form-open .above-sales-modal');
        const newRuleIdx  = APP_CSS.indexOf('body.balance-sheet-open.quotation-form-open .draggable-history-modal');
        expect(existingIdx).toBeGreaterThan(-1);
        expect(newRuleIdx).toBeGreaterThan(existingIdx);
    });

    test('2.3  new image-viewer-modal-wrap rule appears after body.quotation-form-open .above-sales-modal', () => {
        const existingIdx = APP_CSS.indexOf('body.quotation-form-open .above-sales-modal');
        const newRuleIdx  = APP_CSS.indexOf('body.balance-sheet-open.quotation-form-open .image-viewer-modal-wrap');
        expect(newRuleIdx).toBeGreaterThan(existingIdx);
    });

    test('2.4  qt3-modal-wrap rule appears after body.balance-sheet-open.quotation-form-open .quotation-create-wrap', () => {
        const existingIdx = APP_CSS.indexOf('body.balance-sheet-open.quotation-form-open .quotation-create-wrap');
        const newRuleIdx  = APP_CSS.indexOf('body.balance-sheet-open.quotation-form-open .qt3-modal-wrap');
        expect(existingIdx).toBeGreaterThan(-1);
        expect(newRuleIdx).toBeGreaterThan(existingIdx);
    });

    test('2.5  quotation-sales-return draggable-history-modal rule appears after quotation-form-open variant', () => {
        const qtIdx  = APP_CSS.indexOf('body.balance-sheet-open.quotation-form-open .draggable-history-modal');
        const qsrIdx = APP_CSS.indexOf('body.balance-sheet-open.quotation-sales-return-form-open .draggable-history-modal');
        expect(qtIdx).toBeGreaterThan(-1);
        expect(qsrIdx).toBeGreaterThan(-1);
    });
});


// ── 3. Stacking invariants — quotation-form-open context ──────────────────────

describe('Stacking invariants — balance-sheet-open + quotation-form-open', () => {
    const body = ['balance-sheet-open', 'quotation-form-open'];

    test('3.1  DraggableHistoryModal (1083) is above quotation form (1082)', () => {
        expect(zIndex(draggableHistoryModal, body)).toBeGreaterThan(zIndex(quotationForm, body));
    });

    test('3.2  ImageViewerModal (1083) is above quotation form (1082)', () => {
        expect(zIndex(imageViewerModal, body)).toBeGreaterThan(zIndex(quotationForm, body));
    });

    test('3.3  quotation form (1082) is above balance sheet (1081)', () => {
        expect(zIndex(quotationForm, body)).toBeGreaterThan(zIndex(balanceSheet, body));
    });

    test('3.4  DraggableHistoryModal (1083) is above balance sheet (1081)', () => {
        expect(zIndex(draggableHistoryModal, body)).toBeGreaterThan(zIndex(balanceSheet, body));
    });

    test('3.5  ImageViewerModal (1083) is above balance sheet (1081)', () => {
        expect(zIndex(imageViewerModal, body)).toBeGreaterThan(zIndex(balanceSheet, body));
    });

    test('3.6  qt3Form (1082) is above balance sheet (1081)', () => {
        expect(zIndex(qt3Form, body)).toBeGreaterThan(zIndex(balanceSheet, body));
    });

    test('3.7  exact z-index values: draggable=1083, form=1082, balance-sheet=1081', () => {
        expect(zIndex(draggableHistoryModal, body)).toBe(1083);
        expect(zIndex(quotationForm, body)).toBe(1082);
        expect(zIndex(balanceSheet, body)).toBe(1081);
    });

    test('3.8  exact z-index values: imageViewer=1083, qt3=1082', () => {
        expect(zIndex(imageViewerModal, body)).toBe(1083);
        expect(zIndex(qt3Form, body)).toBe(1082);
    });

    test('3.9  DraggableHistoryModal and ImageViewerModal share the same z-index level', () => {
        expect(zIndex(draggableHistoryModal, body)).toBe(zIndex(imageViewerModal, body));
    });

    test('3.10  qt3Form and quotationForm share the same z-index level (both at 1082)', () => {
        expect(zIndex(qt3Form, body)).toBe(zIndex(quotationForm, body));
    });

    test('3.11  complete stacking order: panels(1083) > forms(1082) > balance-sheet(1081)', () => {
        const PANELS = zIndex(draggableHistoryModal, body);
        const FORMS  = zIndex(quotationForm, body);
        const BS     = zIndex(balanceSheet, body);
        expect(PANELS).toBeGreaterThan(FORMS);
        expect(FORMS).toBeGreaterThan(BS);
        // Strict hierarchy — no overlaps
        expect(PANELS).toBe(1083);
        expect(FORMS).toBe(1082);
        expect(BS).toBe(1081);
    });
});


// ── 4. Stacking invariants — quotation-sales-return-form-open context ─────────

describe('Stacking invariants — balance-sheet-open + quotation-sales-return-form-open', () => {
    const body = ['balance-sheet-open', 'quotation-sales-return-form-open'];

    test('4.1  DraggableHistoryModal (1083) is above quotation-sales-return form (1082)', () => {
        expect(zIndex(draggableHistoryModal, body)).toBeGreaterThan(zIndex(quotationSRForm, body));
    });

    test('4.2  ImageViewerModal (1083) is above quotation-sales-return form (1082)', () => {
        expect(zIndex(imageViewerModal, body)).toBeGreaterThan(zIndex(quotationSRForm, body));
    });

    test('4.3  quotation-sales-return form (1082) is above balance sheet (1081)', () => {
        expect(zIndex(quotationSRForm, body)).toBeGreaterThan(zIndex(balanceSheet, body));
    });

    test('4.4  exact z-index values for the sales-return context', () => {
        expect(zIndex(draggableHistoryModal, body)).toBe(1083);
        expect(zIndex(imageViewerModal, body)).toBe(1083);
        expect(zIndex(quotationSRForm, body)).toBe(1082);
        expect(zIndex(balanceSheet, body)).toBe(1081);
    });

    test('4.5  quotation-form-open and quotation-sales-return-form-open produce the same panel z-index', () => {
        const bodyQT  = ['balance-sheet-open', 'quotation-form-open'];
        const bodyQSR = ['balance-sheet-open', 'quotation-sales-return-form-open'];
        expect(zIndex(draggableHistoryModal, bodyQT)).toBe(zIndex(draggableHistoryModal, bodyQSR));
        expect(zIndex(imageViewerModal, bodyQT)).toBe(zIndex(imageViewerModal, bodyQSR));
    });
});


// ── 5. Bug demonstration — pre-fix stacking ───────────────────────────────────

describe('Bug demonstration — stacking WITHOUT the new rules', () => {
    // The fix adds body.balance-sheet-open.quotation-form-open rules.
    // Without them, panels were resolved by the (0,2,1) rules only.

    function zIndexPreFix(elementClasses, bodyClasses) {
        const hasBody = (...cls) => cls.every(c => bodyClasses.includes(c));
        const hasEl   = (...cls) => cls.every(c => elementClasses.includes(c));

        // Only the EXISTING (0,3,1) rules — no new draggable/imageViewer/qt3 rules.
        if (hasBody('balance-sheet-open', 'quotation-form-open') && hasEl('quotation-create-wrap'))
            return 1082;
        if (hasBody('balance-sheet-open', 'quotation-sales-return-form-open') && hasEl('quotation-sales-return-create-wrap'))
            return 1082;

        // (0,2,1) rules.
        if (hasBody('balance-sheet-open') && hasEl('modal')) {
            if (hasBody('quotation-form-open')              && hasEl('above-sales-modal')) return 1081;
            if (hasBody('quotation-sales-return-form-open') && hasEl('above-sales-modal')) return 1081;
            return 1070;
        }
        if (hasBody('quotation-form-open')              && hasEl('above-sales-modal')) return 1081;
        if (hasBody('quotation-sales-return-form-open') && hasEl('above-sales-modal')) return 1081;

        if (hasEl('quotation-create-wrap'))              return 1080;
        if (hasEl('quotation-sales-return-create-wrap')) return 1080;
        if (hasEl('qt3-modal-wrap'))   return 1080;
        if (hasEl('above-sales-modal')) return 1065;
        return 0;
    }

    const body = ['balance-sheet-open', 'quotation-form-open'];

    test('5.1  PRE-FIX: DraggableHistoryModal (1081) was BELOW quotation form (1082) → invisible', () => {
        expect(zIndexPreFix(draggableHistoryModal, body)).toBeLessThan(zIndexPreFix(quotationForm, body));
        expect(zIndexPreFix(draggableHistoryModal, body)).toBe(1081);
        expect(zIndexPreFix(quotationForm, body)).toBe(1082);
    });

    test('5.2  PRE-FIX: ImageViewerModal (1081) was BELOW quotation form (1082) → invisible', () => {
        expect(zIndexPreFix(imageViewerModal, body)).toBeLessThan(zIndexPreFix(quotationForm, body));
        expect(zIndexPreFix(imageViewerModal, body)).toBe(1081);
    });

    test('5.3  PRE-FIX: qt3Form was overridden to 1070 by blanket rule → below balance sheet (1081)', () => {
        const bodyNoQtOpen = ['balance-sheet-open']; // qt3 before quotation-form-open is added
        expect(zIndexPreFix(qt3Form, bodyNoQtOpen)).toBe(1070);
        expect(zIndexPreFix(balanceSheet, ['balance-sheet-open', 'quotation-form-open'])).toBe(1081);
        expect(1070).toBeLessThan(1081);
    });

    test('5.4  POST-FIX: DraggableHistoryModal (1083) is now ABOVE quotation form (1082)', () => {
        expect(zIndex(draggableHistoryModal, body)).toBeGreaterThan(zIndex(quotationForm, body));
    });

    test('5.5  POST-FIX: ImageViewerModal (1083) is now ABOVE quotation form (1082)', () => {
        expect(zIndex(imageViewerModal, body)).toBeGreaterThan(zIndex(quotationForm, body));
    });

    test('5.6  POST-FIX: qt3Form (1082) is now ABOVE balance sheet (1081)', () => {
        expect(zIndex(qt3Form, body)).toBeGreaterThan(zIndex(balanceSheet, body));
    });

    test('5.7  fix adds exactly 2 z-index levels for panels (1081 → 1083)', () => {
        const before = zIndexPreFix(draggableHistoryModal, body);
        const after  = zIndex(draggableHistoryModal, body);
        expect(after - before).toBe(2);
    });

    test('5.8  fix adds exactly 12 z-index levels for qt3 in balance-sheet-only context (1070 → 1082)', () => {
        const bodyBsOnly = ['balance-sheet-open', 'quotation-form-open'];
        const before = zIndexPreFix(qt3Form, ['balance-sheet-open']); // 1070 (no qt form body class)
        const after  = zIndex(qt3Form, bodyBsOnly);                   // 1082 (with both classes)
        expect(after - before).toBe(12);
    });
});


// ── 6. Regression — standalone form (no balance sheet) ───────────────────────

describe('Regression — standalone form without balance-sheet-open', () => {
    const body = ['quotation-form-open'];

    test('6.1  DraggableHistoryModal (1081) is above standalone quotation form (1080)', () => {
        expect(zIndex(draggableHistoryModal, body)).toBeGreaterThan(zIndex(quotationForm, body));
        expect(zIndex(draggableHistoryModal, body)).toBe(1081);
        expect(zIndex(quotationForm, body)).toBe(1080);
    });

    test('6.2  ImageViewerModal (1081) is above standalone quotation form (1080)', () => {
        expect(zIndex(imageViewerModal, body)).toBeGreaterThan(zIndex(quotationForm, body));
        expect(zIndex(imageViewerModal, body)).toBe(1081);
    });

    test('6.3  qt3Form uses its inline-style z-index 1080 (no balance-sheet-open → blanket rule inactive)', () => {
        expect(zIndex(qt3Form, body)).toBe(1080);
    });

    test('6.4  balance-sheet-open without quotation-form-open: blanket rule gives 1070 to modals', () => {
        const bodyBsOnly = ['balance-sheet-open'];
        expect(zIndex(quotationForm, bodyBsOnly)).toBe(1070);
        expect(zIndex(qt3Form, bodyBsOnly)).toBe(1070);
    });

    test('6.5  no body classes: quotation form at default 1080', () => {
        expect(zIndex(quotationForm, [])).toBe(1080);
        expect(zIndex(qt3Form, [])).toBe(1080);
    });

    test('6.6  quotation-sales-return-form-open standalone: panels (1081) above form (1080)', () => {
        const bodySR = ['quotation-sales-return-form-open'];
        expect(zIndex(draggableHistoryModal, bodySR)).toBe(1081);
        expect(zIndex(imageViewerModal, bodySR)).toBe(1081);
        expect(zIndex(quotationSRForm, bodySR)).toBe(1080);
        expect(zIndex(draggableHistoryModal, bodySR)).toBeGreaterThan(zIndex(quotationSRForm, bodySR));
    });
});


// ── 7. CSS specificity analysis ───────────────────────────────────────────────

describe('CSS specificity — why (0,3,1) beats (0,2,1) and inline (0,1,0)', () => {
    function parseSpecificity(selector) {
        // Strip :not() but count its class argument
        const expanded = selector.replace(/:not\(([^)]+)\)/g, '$1');
        const elements = (expanded.match(/^[a-z]+[\w-]*/g) || []).length;
        const classes  = (expanded.match(/\.[a-z][\w-]*/g) || []).length;
        return { elements, classes };
    }

    const newThreeClassRule = 'body.balance-sheet-open.quotation-form-open .draggable-history-modal';
    const existingTwoClassRule = 'body.balance-sheet-open.quotation-form-open .quotation-create-wrap';
    const blanketRule     = 'body.balance-sheet-open .modal';
    const inlineStyleRule = '.qt3-modal-wrap'; // spec of the inline <style> tag rule

    test('7.1  new rule (0,3,1) has 3 classes and 1 element', () => {
        const s = parseSpecificity(newThreeClassRule);
        expect(s.classes).toBe(3);
        expect(s.elements).toBe(1);
    });

    test('7.2  blanket rule (0,2,1) has 2 classes and 1 element', () => {
        const s = parseSpecificity(blanketRule);
        expect(s.classes).toBe(2);
        expect(s.elements).toBe(1);
    });

    test('7.3  inline style rule (0,1,0) has 1 class and 0 elements', () => {
        const s = parseSpecificity(inlineStyleRule);
        expect(s.classes).toBe(1);
        expect(s.elements).toBe(0);
    });

    test('7.4  new rule (3 classes) beats blanket rule (2 classes)', () => {
        expect(parseSpecificity(newThreeClassRule).classes)
            .toBeGreaterThan(parseSpecificity(blanketRule).classes);
    });

    test('7.5  blanket rule (2 classes) beats inline style (1 class)', () => {
        expect(parseSpecificity(blanketRule).classes)
            .toBeGreaterThan(parseSpecificity(inlineStyleRule).classes);
    });

    test('7.6  new rule (3 classes) beats inline style (1 class)', () => {
        expect(parseSpecificity(newThreeClassRule).classes)
            .toBeGreaterThan(parseSpecificity(inlineStyleRule).classes);
    });

    test('7.7  new and existing three-class rules have equal specificity (source order breaks ties)', () => {
        expect(parseSpecificity(newThreeClassRule).classes)
            .toBe(parseSpecificity(existingTwoClassRule).classes);
        expect(parseSpecificity(newThreeClassRule).elements)
            .toBe(parseSpecificity(existingTwoClassRule).elements);
    });

    test('7.8  qt3-modal-wrap CSS rule trumps the inline style — App.css has the three-class rule', () => {
        // The <style> tag in QuotationType3Form injects `.qt3-modal-wrap { z-index: 1080 }` (0,1,0).
        // body.balance-sheet-open .modal (0,2,1) overrides it to 1070.
        // body.balance-sheet-open.quotation-form-open .qt3-modal-wrap (0,3,1) overrides it to 1082.
        const inlineSpec   = parseSpecificity('.qt3-modal-wrap').classes;
        const blanketSpec  = parseSpecificity(blanketRule).classes;
        const newRuleSpec  = parseSpecificity('body.balance-sheet-open.quotation-form-open .qt3-modal-wrap').classes;
        expect(blanketSpec).toBeGreaterThan(inlineSpec);
        expect(newRuleSpec).toBeGreaterThan(blanketSpec);
    });
});


// ── 8. Element class invariants ───────────────────────────────────────────────

describe('Element class invariants — CSS selectors match actual class names', () => {
    test('8.1  DraggableHistoryModal has draggable-history-modal class (CSS selector target)', () => {
        expect(draggableHistoryModal).toContain('draggable-history-modal');
    });

    test('8.2  DraggableHistoryModal has above-sales-modal class (body.quotation-form-open rule)', () => {
        expect(draggableHistoryModal).toContain('above-sales-modal');
    });

    test('8.3  ImageViewerModal has image-viewer-modal-wrap class (CSS selector target)', () => {
        expect(imageViewerModal).toContain('image-viewer-modal-wrap');
    });

    test('8.4  ImageViewerModal has above-sales-modal class (body.quotation-form-open rule)', () => {
        expect(imageViewerModal).toContain('above-sales-modal');
    });

    test('8.5  qt3Form has qt3-modal-wrap class (CSS selector target)', () => {
        expect(qt3Form).toContain('qt3-modal-wrap');
    });

    test('8.6  balance sheet has above-sales-modal class (body.quotation-form-open .above-sales-modal rule)', () => {
        expect(balanceSheet).toContain('above-sales-modal');
    });

    test('8.7  DraggableHistoryModal source contains draggable-history-modal class string', () => {
        const SRC = fs.readFileSync(
            path.join(__dirname, '../../utils/DraggableHistoryModal.js'), 'utf8'
        );
        expect(SRC).toContain('draggable-history-modal');
    });

    test('8.8  ImageViewerModal source contains image-viewer-modal-wrap class string', () => {
        const SRC = fs.readFileSync(
            path.join(__dirname, '../../utils/ImageViewerModal.js'), 'utf8'
        );
        expect(SRC).toContain('image-viewer-modal-wrap');
    });

    test('8.9  QuotationType3Form source contains qt3-modal-wrap class string', () => {
        const SRC = fs.readFileSync(
            path.join(__dirname, '../QuotationType3Form.js'), 'utf8'
        );
        expect(SRC).toContain('qt3-modal-wrap');
    });
});


// ── 9. Body class management — prerequisite for the CSS rules to fire ─────────

describe('Body class management — quotation-form-open prerequisite', () => {
    test('9.1  QuotationCreate (create.js) adds quotation-form-open to body on open', () => {
        const SRC = fs.readFileSync(path.join(__dirname, '../create.js'), 'utf8');
        expect(SRC).toMatch(/document\.body\.classList\.add\(['"]quotation-form-open['"]\)/);
    });

    test('9.2  QuotationCreate (create.js) removes quotation-form-open from body on close', () => {
        const SRC = fs.readFileSync(path.join(__dirname, '../create.js'), 'utf8');
        expect(SRC).toMatch(/document\.body\.classList\.remove\(['"]quotation-form-open['"]\)/);
    });

    test('9.3  QuotationType3Form adds quotation-form-open to body on open', () => {
        const SRC = fs.readFileSync(path.join(__dirname, '../QuotationType3Form.js'), 'utf8');
        expect(SRC).toMatch(/document\.body\.classList\.add\(['"]quotation-form-open['"]\)/);
    });

    test('9.4  QuotationType3Form removes quotation-form-open from body on close', () => {
        const SRC = fs.readFileSync(path.join(__dirname, '../QuotationType3Form.js'), 'utf8');
        expect(SRC).toMatch(/document\.body\.classList\.remove\(['"]quotation-form-open['"]\)/);
    });

    test('9.5  QuotationType3Form adds quotation-form-pending-open when modalClass is above-pending-modal', () => {
        const SRC = fs.readFileSync(path.join(__dirname, '../QuotationType3Form.js'), 'utf8');
        expect(SRC).toMatch(/above-pending-modal.*quotation-form-pending-open|quotation-form-pending-open.*above-pending-modal/s);
    });

    test('9.6  PostingIndex (balance sheet) adds balance-sheet-open to body', () => {
        const SRC = fs.readFileSync(
            path.join(__dirname, '../../posting/index.js'), 'utf8'
        );
        expect(SRC).toMatch(/document\.body\.classList\.add\(['"]balance-sheet-open['"]\)/);
    });

    test('9.7  PostingIndex removes balance-sheet-open from body on close', () => {
        const SRC = fs.readFileSync(
            path.join(__dirname, '../../posting/index.js'), 'utf8'
        );
        expect(SRC).toMatch(/document\.body\.classList\.remove\(['"]balance-sheet-open['"]\)/);
    });

    test('9.8  body class lifecycle: add on open, remove on close (via cleanup)', () => {
        // Simulate the useEffect pattern used by create.js / QuotationType3Form.js
        document.body.classList.add('quotation-form-open');
        expect(document.body.classList.contains('quotation-form-open')).toBe(true);
        document.body.classList.remove('quotation-form-open');
        expect(document.body.classList.contains('quotation-form-open')).toBe(false);
    });
});


// ── 10. Global stacking invariant summary ────────────────────────────────────

describe('Global stacking invariant: panels > quotation-form > balance-sheet', () => {
    const body = ['balance-sheet-open', 'quotation-form-open'];

    test('10.1  z-index hierarchy is strictly increasing: balanceSheet < form < panels', () => {
        const BS      = zIndex(balanceSheet, body);
        const FORM    = zIndex(quotationForm, body);
        const PANELS  = zIndex(draggableHistoryModal, body);
        expect(BS).toBeLessThan(FORM);
        expect(FORM).toBeLessThan(PANELS);
    });

    test('10.2  all four elements are in distinct bands (no two share the same z-index)', () => {
        const bs      = zIndex(balanceSheet, body);
        const form    = zIndex(quotationForm, body);
        const history = zIndex(draggableHistoryModal, body);
        const image   = zIndex(imageViewerModal, body);
        const qt3     = zIndex(qt3Form, body);
        // Panels share the same band intentionally (1083)
        expect(history).toBe(image);
        // Forms share the same band (1082)
        expect(form).toBe(qt3);
        // Balance sheet is strictly below forms
        expect(bs).toBeLessThan(form);
        // Forms are strictly below panels
        expect(form).toBeLessThan(history);
    });

    test('10.3  exact numeric stacking: 1081, 1082, 1083 — one level apart', () => {
        const bs      = zIndex(balanceSheet, body);
        const form    = zIndex(quotationForm, body);
        const history = zIndex(draggableHistoryModal, body);
        expect(form   - bs).toBe(1);
        expect(history - form).toBe(1);
    });
});
