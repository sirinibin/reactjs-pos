/**
 * Source-level tests verifying that SalesReturnIndex passes the correct
 * modalClass to the OrderCreate form opened by clicking the Sales ID column.
 *
 * Bug: clicking the Sales ID (order_code) in the Sales Return tab of
 * CustomerPending opened the OrderCreate form behind the modal because
 * the default .order-create-wrap z-index (1080) is lower than
 * CustomerPending's z-index (1082).
 *
 * Fix: OrderCreate is now rendered with
 *   modalClass={props.pendingView ? "above-pending-modal" : ""}
 * which App.css resolves to z-index 1095 via the two-class selector
 * .order-create-wrap.above-pending-modal — higher specificity than the
 * single-class inline style, so it wins regardless of DOM order.
 */

const fs   = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
    path.join(__dirname, '../index.js'),
    'utf8'
);

// ── 1. OrderCreate is imported and conditionally rendered ─────────────────────

describe('SalesReturnIndex — OrderCreate for Sales ID column', () => {
    test('1.1  OrderCreate is imported', () => {
        expect(SRC).toMatch(/import OrderCreate from/);
    });

    test('1.2  showSalesUpdateForm state is declared', () => {
        expect(SRC).toMatch(/showSalesUpdateForm/);
    });

    test('1.3  SalesUpdateFormRef is declared', () => {
        expect(SRC).toMatch(/SalesUpdateFormRef/);
    });

    test('1.4  OrderCreate is rendered conditionally on showSalesUpdateForm', () => {
        expect(SRC).toMatch(/showSalesUpdateForm[\s\S]{0,30}OrderCreate/);
    });
});

// ── 2. modalClass prop is wired to pendingView ────────────────────────────────

describe('SalesReturnIndex — OrderCreate modalClass prop is pendingView-aware', () => {
    test('2.1  modalClass prop is present on the OrderCreate rendered by showSalesUpdateForm', () => {
        expect(SRC).toMatch(/OrderCreate[^>]*modalClass=/);
    });

    test('2.2  modalClass value is "above-pending-modal" when pendingView is true', () => {
        expect(SRC).toMatch(/modalClass=\{[^}]*pendingView[^}]*["']above-pending-modal["']/);
    });

    test('2.3  modalClass falls back to empty string when pendingView is falsy', () => {
        expect(SRC).toMatch(/modalClass=\{[^}]*pendingView[^}]*:\s*["']["']/);
    });

    test('2.4  modalClass uses the ternary pattern pendingView ? "above-pending-modal" : ""', () => {
        expect(SRC).toMatch(
            /modalClass=\{props\.pendingView\s*\?\s*["']above-pending-modal["']\s*:\s*["']["']\}/
        );
    });
});

// ── 3. openSalesUpdateForm triggers the form ──────────────────────────────────

describe('SalesReturnIndex — openSalesUpdateForm function', () => {
    test('3.1  openSalesUpdateForm is defined', () => {
        expect(SRC).toMatch(/function openSalesUpdateForm/);
    });

    test('3.2  openSalesUpdateForm sets showSalesUpdateForm to true', () => {
        expect(SRC).toMatch(/setShowSalesUpdateForm\(true\)/);
    });

    test('3.3  openSalesUpdateForm calls SalesUpdateFormRef.current?.open', () => {
        expect(SRC).toMatch(/SalesUpdateFormRef\.current\?\.open/);
    });

    test('3.4  open is called with the order id argument', () => {
        const fnIdx = SRC.indexOf('function openSalesUpdateForm');
        expect(fnIdx).toBeGreaterThan(-1);
        const block = SRC.slice(fnIdx, fnIdx + 250);
        expect(block).toMatch(/SalesUpdateFormRef\.current\?\.open\(id\)/);
    });
});

// ── 4. Sales ID column click wires to openSalesUpdateForm ────────────────────

describe('SalesReturnIndex — Sales ID column click handler', () => {
    test('4.1  order_code column renders a clickable span', () => {
        expect(SRC).toMatch(/order_code[\s\S]{0,200}cursor.*pointer/);
    });

    test('4.2  clicking the order_code value calls openSalesUpdateForm', () => {
        expect(SRC).toMatch(/openSalesUpdateForm\(salesReturn\.order_id\)/);
    });

    test('4.3  openSalesUpdateForm receives salesReturn.order_id (not order_code)', () => {
        // order_id is the MongoDB ObjectId, order_code is the display string
        const idx = SRC.indexOf('openSalesUpdateForm(salesReturn.order_id)');
        expect(idx).toBeGreaterThan(-1);
    });
});
