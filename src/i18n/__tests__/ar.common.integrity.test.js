/**
 * Integrity tests for src/i18n/locales/ar/common.json.
 *
 * Verifies that every value is a plain string (not a nested object),
 * that the file grew as expected, that critical keys are present,
 * and that the previously-broken {en, ar} object values have been flattened.
 */

const fs   = require('fs');
const path = require('path');

const AR_PATH = path.join(__dirname, '../locales/ar/common.json');
const ar = JSON.parse(fs.readFileSync(AR_PATH, 'utf8'));

const INTENTIONAL_NAMESPACES = new Set(['buttons', 'labels', 'status']);

// ── 1. Value types ────────────────────────────────────────────────────────────

describe('ar/common.json — value types', () => {
    test('1.1  every top-level value is a string except intentional namespaces', () => {
        const bad = Object.entries(ar)
            .filter(([k, v]) => typeof v !== 'string' && !INTENTIONAL_NAMESPACES.has(k))
            .map(([k]) => k);
        expect(bad).toEqual([]);
    });

    test('1.2  no key retains a {en, ar} object as its value', () => {
        const enAr = Object.entries(ar)
            .filter(([, v]) => v && typeof v === 'object' && ('en' in v || 'ar' in v))
            .map(([k]) => k);
        expect(enAr).toEqual([]);
    });

    test('1.3  intentional namespace "buttons" contains only strings', () => {
        expect(typeof ar.buttons).toBe('object');
        const bad = Object.values(ar.buttons).filter(v => typeof v !== 'string');
        expect(bad).toEqual([]);
    });
});

// ── 2. Key count ──────────────────────────────────────────────────────────────

describe('ar/common.json — key count', () => {
    test('2.1  file has more than 3000 top-level keys (up from original 996)', () => {
        expect(Object.keys(ar).length).toBeGreaterThan(3000);
    });
});

// ── 3. Sidebar menu labels ────────────────────────────────────────────────────

describe('ar/common.json — sidebar menu labels', () => {
    const SIDEBAR_LABELS = [
        'Dashboard', 'Sales', 'Sales Returns', 'Purchases', 'Purchase Orders',
        'Purchase Requests', 'Delivery Notes', 'Quotations',
        'Quotation Sales Returns', 'Non VAT Sales', 'Non VAT Sales Returns',
        'Statistics', 'Vendors / Suppliers', 'Stores', 'Warehouses',
        'Stock Transfers', 'Customers', 'Products', 'Services',
        'Product Categories', 'Service Categories', 'Product Brands',
        'Expense Categories', 'Expenses', 'Analytics',
        'Receivables', 'Payables', 'Capitals', 'Drawings', 'Ledger',
        'Accounts & Trial Balances', 'Users', 'User Roles (RBAC)',
        'Customer Packages', 'Employees', 'Salaries', 'Vehicles',
        'Repair Jobs', 'Repair Jobs Board',
    ];

    SIDEBAR_LABELS.forEach(label => {
        test(`3.x  "${label}" has an Arabic translation`, () => {
            // Use direct access instead of toHaveProperty — the latter interprets
            // dots in keys as nested paths (e.g. "Qtn. Sales" → Qtn → Sales).
            expect(typeof ar[label]).toBe('string');
            expect(ar[label].length).toBeGreaterThan(0);
        });
    });
});

// ── 4. Show / Hide keys (used by StatsSummary) ────────────────────────────────

describe('ar/common.json — Show / Hide composite keys', () => {
    test('4.1  "Show" exists as a plain string', () => {
        expect(typeof ar['Show']).toBe('string');
        expect(ar['Show'].length).toBeGreaterThan(0);
    });

    test('4.2  "Hide" exists as a plain string', () => {
        expect(typeof ar['Hide']).toBe('string');
        expect(ar['Hide'].length).toBeGreaterThan(0);
    });

    const SUMMARY_TITLES = [
        'Salaries Summary', 'Employees Summary', 'Sales Summary',
        'Purchase Summary', 'Customer Stats Summary', 'Vendor Stats Summary',
        'Sales Return Summary', 'Purchase Return Summary',
        'Delivery Note Summary', 'StockTransfer Summary',
        'Quotation Summary', 'Qtn. Sales Summary',
    ];

    SUMMARY_TITLES.forEach(title => {
        test(`4.x  "${title}" exists for StatsSummary title prop`, () => {
            // Direct access avoids Jest interpreting dots as nested paths
            expect(typeof ar[title]).toBe('string');
            expect(ar[title].length).toBeGreaterThan(0);
        });
    });
});

// ── 5. Previously-broken object keys are now plain strings ────────────────────

describe('ar/common.json — formerly-broken keys are now strings', () => {
    const FORMERLY_OBJECTS = [
        'accounts_trial_balances', 'customer_packages', 'customer_packages_description',
        'arabic_name_updated', 'arabic_name_created', 'back', 'update', 'create',
        'close', 'delete', 'cancel', 'name', 'signature', 'signatures', 'loading',
        'created_by', 'created_at', 'updated_at', 'updated_by', 'edit', 'select_users',
        'no_accounts_to_display', 'account_no', 'account_name',
        'debit_balance', 'credit_balance',
    ];

    FORMERLY_OBJECTS.forEach(key => {
        test(`5.x  "${key}" is a plain string`, () => {
            if (ar[key] !== undefined) {
                expect(typeof ar[key]).toBe('string');
            }
        });
    });
});

// ── 6. Vendor category keys ───────────────────────────────────────────────────

describe('ar/common.json — vendor category keys', () => {
    const VENDOR_CAT_KEYS = [
        'Vendor Categories', 'New Category', 'Search categories...',
        'No categories found.', 'Create New Vendor Category',
        'Update Vendor Category', 'Category Details',
    ];

    VENDOR_CAT_KEYS.forEach(key => {
        test(`6.x  "${key}" exists`, () => {
            // Direct access avoids Jest interpreting dots as nested paths
            expect(typeof ar[key]).toBe('string');
            expect(ar[key].length).toBeGreaterThan(0);
        });
    });
});

// ── 7. RFQ keys ───────────────────────────────────────────────────────────────

describe('ar/common.json — RFQ keys', () => {
    test('7.1  "RFQ Contents Received" label is translated', () => {
        expect(typeof ar['RFQ Contents Received']).toBe('string');
    });

    test('7.2  "RFQ Suppliers" label is translated', () => {
        expect(typeof ar['RFQ Suppliers']).toBe('string');
    });
});
