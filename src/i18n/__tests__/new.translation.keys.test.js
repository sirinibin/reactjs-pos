/**
 * Tests for the 297 translation keys added to ar/common.json in session 2.
 *
 * Covers the most user-visible strings added across:
 *  1. View page common strings (order, vendor, product, purchase, delivery note…)
 *  2. Create/edit form strings (validation messages, placeholders, action labels)
 *  3. Column labels for stock-transfers, vendors, customers, products, employees
 *  4. WhatsApp / sharing strings
 *  5. Stats page section headers
 *
 * All assertions use direct property access (ar[key]) to avoid Jest's toHaveProperty
 * interpreting dots in key names as nested path separators.
 */

const fs   = require('fs');
const path = require('path');

const AR_PATH = path.join(__dirname, '../locales/ar/common.json');
const ar = JSON.parse(fs.readFileSync(AR_PATH, 'utf8'));

function expectTranslated(key) {
    expect(typeof ar[key]).toBe('string');
    expect(ar[key].length).toBeGreaterThan(0);
}

// ── 1. View page common strings ───────────────────────────────────────────────

describe('ar/common.json — view page strings', () => {
    const VIEW_STRINGS = [
        'Order processed on',
        'Fully settled',
        'Partial',
        'Sold Items',
        'Purchased Items',
        'Quoted Items',
        'Transferred Items',
        'Invoice created on',
        'Quotation created on',
        'Purchase processed on',
        'Transfer processed on',
        'Details of Invoice',
        'Details of Quotation',
        'Details of Sales Return',
        'Details of Stock Transfer #',
        'Return Total',
        'Returned By',
        'Net Payable',
        'Balance Due',
        'Payment Date',
        'Purchase Date',
        'Transfer Date',
        'Transfer Info',
        'Purchase Info',
        'Item',
        'Item Count',
        'Destination',
    ];

    VIEW_STRINGS.forEach(key => {
        test(`"${key}" has an Arabic translation`, () => { expectTranslated(key); });
    });
});

// ── 2. Column labels (stock-transfers, vendors, customers, products) ──────────

describe('ar/common.json — column label translations added in session 2', () => {
    const COLUMN_LABELS = [
        // Stock transfer
        'Total Qty',
        'Net Total Amt.',
        // Vendor columns
        'Purchase Credit Balance Amount',
        'Purchase Paid Amount',
        'Purchase Return Amount',
        'Vat No.',
        'First Purchase',
        'Last Purchase',
        'Tenure (Days)',
        // Customer columns
        'Sales Credit Balance',
        'Sales Paid Amount',
        'Sales Paid Count',
        'Sales Return Credit Balance Amount',
        'CLV 12m (SAR)',
        'Churn Risk Tier',
        // Product columns
        'Sales Amount',
        'Sales Count',
        'Purchase Qty',
        'Purchase Amount',
        'Total Stock',
        'Main Store Stock',
        'Revenue (SAR)',
        // Employee / salary columns
        'Total Employees',
        'Total Monthly Salary',
        'Employees Owe',
        'Total Amount Paid',
        'Total Cash',
        'Total Bank Transfer',
        'Total Payments',
    ];

    COLUMN_LABELS.forEach(key => {
        test(`col.label "${key}" has an Arabic translation`, () => { expectTranslated(key); });
    });
});

// ── 3. Form validation and action strings ─────────────────────────────────────

describe('ar/common.json — form / action strings', () => {
    const FORM_STRINGS = [
        'Add Payment',
        'Create Sale',
        'Create Return',
        'Create Invoice',
        'Update Sale',
        'Max decimal points allowed is 2',
        'Unit price(with VAT) is less than Purchase Unit Price',
        'Commission should not be greater than or equal to Net Total: ',
        'Cash discount should not be greater than or equal to Net Total: ',
        'Unit discount % should be greater than or equal to 0',
        'Amount must be greater than 0',
        'Customer is required',
        'Search and add products or services',
        'Search product by name / code / barcode',
        'Search customer by name / phone / VAT',
        'Select payment method',
        'Tap to add payment method',
        'Discount applied before VAT',
        'Discount applied including VAT',
        'Partial Payment',
        'On Account',
        'Compliance check failed',
        'Reporting failed',
        'Failed to delete payment',
        'Failed to save quotation',
    ];

    FORM_STRINGS.forEach(key => {
        test(`"${key}" has an Arabic translation`, () => { expectTranslated(key); });
    });
});

// ── 4. WhatsApp / sharing strings ─────────────────────────────────────────────

describe('ar/common.json — WhatsApp and sharing strings', () => {
    const WA_STRINGS = [
        'Send via WhatsApp',
        'Send PDF',
        'Open in WhatsApp',
        'WhatsApp is not connected',
        'PDF sent successfully via WhatsApp!',
        'Re-sync contacts from WhatsApp',
        'Store Contacts',
        'Has WhatsApp',
        'No WhatsApp',
        'Checking WhatsApp connection…',
        'Sending…',
    ];

    WA_STRINGS.forEach(key => {
        test(`"${key}" has an Arabic translation`, () => { expectTranslated(key); });
    });
});

// ── 5. Stats / P&L section headers ───────────────────────────────────────────

describe('ar/common.json — stats section header strings', () => {
    const STATS_HEADERS = [
        '— Sales —',
        '— Non-VAT Sales —',
        '— Revenue —',
        '— Expenses —',
        'Net Revenue (with VAT)',
        'Net Revenue (without VAT)',
        'Total Expense (with VAT)',
        'Total Expense (without VAT)',
        'Net Profit (with VAT)',
        'Net Loss (with VAT)',
        'Gross Sales',
        'Sales Returns',
        'Purchases',
        'Purchase Returns',
        'Expenses',
        'Salary Paid',
    ];

    STATS_HEADERS.forEach(key => {
        test(`"${key}" has an Arabic translation`, () => { expectTranslated(key); });
    });
});

// ── 6. Internationalised success / error messages ─────────────────────────────

describe('ar/common.json — success / error message strings', () => {
    const MSG_STRINGS = [
        'Invoice created successfully!',
        'Invoice updated successfully!',
        'Quotation created successfully!',
        'Quotation updated successfully!',
        'Capital created successfully!',
        'Employee created successfully!',
        'Vehicle created successfully!',
        'Repair job created successfully!',
        'Salary payment recorded successfully!',
        'Sales return deleted successfully!',
        'Sales return restored successfully!',
        'Network error. Please try again.',
        'Try Again',
        'Reload',
    ];

    MSG_STRINGS.forEach(key => {
        test(`"${key}" has an Arabic translation`, () => { expectTranslated(key); });
    });
});

// ── 7. Key count milestone ────────────────────────────────────────────────────

describe('ar/common.json — total key count after session 2 additions', () => {
    test('file has more than 3000 top-level keys', () => {
        expect(Object.keys(ar).length).toBeGreaterThan(3000);
    });
});
