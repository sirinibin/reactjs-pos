/**
 * Tests that StockTransferCreate appears above the product history modal.
 *
 * Root cause: when a sub-form is opened from the history table,
 * acquireFormOverHistory() adds "form-over-history" to document.body.
 * The CSS rule `body.form-over-history .from-history-form { z-index: 1093 }` then
 * raises any modal with the "from-history-form" class above the history modal
 * (which drops to 1072 under form-over-history).
 *
 * StockTransferCreate previously:
 *   1. Was not passed fromHistory={true} from product_history.js
 *   2. Did not add "from-history-form" to its own modal className
 * Both omissions meant it opened at Bootstrap's default z-index (1050),
 * below the history modal's 1072 — so it appeared behind.
 *
 * Fix:
 *   1. product_history.js: pass fromHistory={true} modalClass={props.subFormModalClass}
 *   2. stock_transfer/create.js: include "from-history-form" in className when
 *      props.fromHistory is true (same pattern as OrderCreate, PurchaseCreate, etc.)
 */

const fs   = require('fs');
const path = require('path');

const PRODUCT_HISTORY = fs.readFileSync(
    path.join(__dirname, '../product_history.js'),
    'utf8'
);
const STOCK_TRANSFER_CREATE = fs.readFileSync(
    path.join(__dirname, '../../stock_transfer/create.js'),
    'utf8'
);
const APP_CSS = fs.readFileSync(
    path.join(__dirname, '../../App.css'),
    'utf8'
);

// Grab just the StockTransferCreate JSX render line.
const stLine = PRODUCT_HISTORY
    .split('\n')
    .find(l => l.includes('StockTransferCreate') && l.includes('showStockTransferForm'));

// ─── 1. product_history.js passes the right props ────────────────────────────

describe('product_history.js — StockTransferCreate receives fromHistory and modalClass', () => {
    test('StockTransferCreate render line exists', () => {
        expect(stLine).toBeDefined();
        expect(stLine).toContain('StockTransferCreate');
    });

    test('fromHistory={true} is passed', () => {
        expect(stLine).toContain('fromHistory={true}');
    });

    test('modalClass={props.subFormModalClass} is passed', () => {
        expect(stLine).toContain('modalClass={props.subFormModalClass}');
    });
});

// ─── 2. Consistency — every sub-form has the same props ──────────────────────

describe('product_history.js — all sub-forms pass fromHistory and modalClass', () => {
    const subForms = [
        'OrderCreate',
        'SalesReturnCreate',
        'PurchaseCreate',
        'PurchaseReturnCreate',
        'QuotationCreate',
        'QuotationSalesReturnCreate',
        'DeliveryNoteCreate',
        'StockTransferCreate',
    ];

    subForms.forEach(form => {
        const line = PRODUCT_HISTORY
            .split('\n')
            .find(l => l.includes(form) && l.includes('show'));

        test(`${form} passes fromHistory={true}`, () => {
            expect(line).toBeDefined();
            expect(line).toContain('fromHistory={true}');
        });

        test(`${form} passes modalClass={props.subFormModalClass}`, () => {
            expect(line).toBeDefined();
            expect(line).toContain('modalClass={props.subFormModalClass}');
        });
    });
});

// ─── 3. stock_transfer/create.js — modal className includes from-history-form ─

describe('stock_transfer/create.js — adds from-history-form class when fromHistory is true', () => {
    test('from-history-form is added to modal className when props.fromHistory is truthy', () => {
        expect(STOCK_TRANSFER_CREATE).toMatch(/props\.fromHistory.*from-history-form/);
    });

    test('the modal className expression references props.fromHistory', () => {
        // The fix pattern: `${props.fromHistory ? 'from-history-form ' : ''}${props.modalClass || ''}`
        expect(STOCK_TRANSFER_CREATE).toMatch(/className=\{`[^`]*props\.fromHistory[^`]*from-history-form[^`]*`\}/);
    });

    test('props.modalClass is also included in the className', () => {
        expect(STOCK_TRANSFER_CREATE).toMatch(/props\.modalClass/);
    });
});

// ─── 4. CSS z-index chain that the fix relies on ─────────────────────────────

describe('App.css — z-index rules that raise from-history-form above the history modal', () => {
    test('body.form-over-history drops DraggableHistoryModal to 1072', () => {
        expect(APP_CSS).toMatch(
            /body\.form-over-history\s+\.above-sales-modal\s*\{[^}]*z-index\s*:\s*1072\s*!important/
        );
    });

    test('body.form-over-history raises .from-history-form to 1093 (above 1072)', () => {
        expect(APP_CSS).toMatch(
            /body\.form-over-history\s+\.from-history-form\s*\{[^}]*z-index\s*:\s*1093\s*!important/
        );
    });

    test('from-history-form z-index (1093) is above form-over-history history modal (1072)', () => {
        const FROM_HISTORY_Z  = 1093;
        const HISTORY_MODAL_Z = 1072;
        expect(FROM_HISTORY_Z).toBeGreaterThan(HISTORY_MODAL_Z);
    });
});
