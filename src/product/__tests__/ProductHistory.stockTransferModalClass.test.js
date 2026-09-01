/**
 * Tests that product_history.js passes fromHistory and modalClass props to
 * StockTransferCreate — the same way every other sub-form is rendered.
 *
 * Bug: StockTransferCreate was rendered WITHOUT fromHistory/modalClass, causing
 * its Bootstrap modal to open at the default z-index (below the history modal
 * at 1150), so the form appeared behind the history modal.
 *
 * Fix: add fromHistory={true} modalClass={props.subFormModalClass} to the
 * StockTransferCreate line, consistent with all sibling sub-forms.
 */

const fs   = require('fs');
const path = require('path');

const PRODUCT_HISTORY = fs.readFileSync(
    path.join(__dirname, '../product_history.js'),
    'utf8'
);

// Grab just the StockTransferCreate JSX line for focused assertions.
const stLine = PRODUCT_HISTORY
    .split('\n')
    .find(l => l.includes('StockTransferCreate') && l.includes('showStockTransferForm'));

// ─── 1. StockTransferCreate receives both props ───────────────────────────────

describe('product_history.js — StockTransferCreate gets fromHistory and modalClass', () => {
    test('StockTransferCreate is rendered when showStockTransferForm is true', () => {
        expect(stLine).toBeDefined();
        expect(stLine).toContain('StockTransferCreate');
    });

    test('fromHistory={true} is passed to StockTransferCreate', () => {
        expect(stLine).toContain('fromHistory={true}');
    });

    test('modalClass={props.subFormModalClass} is passed to StockTransferCreate', () => {
        expect(stLine).toContain('modalClass={props.subFormModalClass}');
    });
});

// ─── 2. Consistency — all sibling sub-forms have the same props ───────────────

describe('product_history.js — all sub-forms consistently pass fromHistory and modalClass', () => {
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

        test(`${form} line passes fromHistory={true}`, () => {
            expect(line).toBeDefined();
            expect(line).toContain('fromHistory={true}');
        });

        test(`${form} line passes modalClass={props.subFormModalClass}`, () => {
            expect(line).toBeDefined();
            expect(line).toContain('modalClass={props.subFormModalClass}');
        });
    });
});

// ─── 3. StockTransferCreate accepts modalClass prop ───────────────────────────

describe('stock_transfer/create.js — modal applies props.modalClass as className', () => {
    const STOCK_TRANSFER_CREATE = fs.readFileSync(
        path.join(__dirname, '../../stock_transfer/create.js'),
        'utf8'
    );

    test('props.modalClass is used in the modal className', () => {
        expect(STOCK_TRANSFER_CREATE).toMatch(/props\.modalClass/);
    });

    test('className uses props.modalClass with a fallback', () => {
        expect(STOCK_TRANSFER_CREATE).toMatch(/className=\{props\.modalClass\s*\|\|\s*""\}/);
    });
});
