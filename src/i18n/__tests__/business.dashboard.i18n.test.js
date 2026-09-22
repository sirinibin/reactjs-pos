/**
 * Tests for Arabic translation wiring in business_dashboard/.
 *
 * Covers:
 *  1. All 7 JS files import useTranslation and call the hook.
 *  2. index.js uses the getTabs(t) pattern (TABS is no longer a bare module constant).
 *  3. Chart files wrap their Google Charts `title:` option with t().
 *  4. KPICards wraps every card title prop with t().
 *  5. Module-level label maps (METHOD_LABELS, ACCOUNT_TYPE_LABELS) are converted
 *     to factory functions so they can receive t().
 *  6. ar/common.json contains all business-dashboard-specific keys.
 */

const fs   = require('fs');
const path = require('path');

const SRC_ROOT = path.join(__dirname, '../../');
const AR_PATH  = path.join(__dirname, '../locales/ar/common.json');

const ar = JSON.parse(fs.readFileSync(AR_PATH, 'utf8'));

function read(rel) { return fs.readFileSync(path.join(SRC_ROOT, rel), 'utf8'); }

// ── 1. All 7 dashboard files have useTranslation wiring ──────────────────────

const DASHBOARD_FILES = [
    'business_dashboard/index.js',
    'business_dashboard/charts/KPICards.js',
    'business_dashboard/charts/RevenueCharts.js',
    'business_dashboard/charts/PaymentCharts.js',
    'business_dashboard/charts/ProductCharts.js',
    'business_dashboard/charts/CustomerCharts.js',
    'business_dashboard/charts/FinancialCharts.js',
];

describe('business_dashboard — useTranslation wiring', () => {
    DASHBOARD_FILES.forEach(rel => {
        const src = read(rel);

        test(`${rel}: imports useTranslation from react-i18next`, () => {
            expect(src).toMatch(/import.*useTranslation.*from ['"]react-i18next['"]/);
        });

        test(`${rel}: calls useTranslation('common') hook`, () => {
            expect(src).toMatch(/useTranslation\(['"]common['"]\)/);
        });

        test(`${rel}: destructures t from the hook`, () => {
            expect(src).toMatch(/const\s*\{\s*t[^}]*\}\s*=\s*useTranslation/);
        });
    });
});

// ── 2. index.js — TABS converted to factory function ─────────────────────────

describe('business_dashboard/index.js — TABS factory pattern', () => {
    const src = read('business_dashboard/index.js');

    test('getTabs(t) function is defined', () => {
        expect(src).toMatch(/function\s+getTabs\s*\(\s*t\s*\)/);
    });

    test('tab labels are wrapped with t()', () => {
        expect(src).toMatch(/t\(["']Overview["']\)/);
        expect(src).toMatch(/t\(["']Revenue["']\)/);
        expect(src).toMatch(/t\(["']Payments["']\)/);
        expect(src).toMatch(/t\(["']Products & Inventory["']\)/);
        expect(src).toMatch(/t\(["']Customers & Finance["']\)/);
    });

    test('TABS is not a bare module-level const array (would bypass t())', () => {
        // Module-level `const TABS = [` should not exist
        expect(src).not.toMatch(/^const\s+TABS\s*=\s*\[/m);
    });

    test('section titles are translated', () => {
        expect(src).toMatch(/t\(["']Key Performance Indicators["']\)/);
        expect(src).toMatch(/t\(["']Revenue Trends["']\)/);
        expect(src).toMatch(/t\(["']Payment Analysis["']\)/);
        expect(src).toMatch(/t\(["']Product Performance["']\)/);
        expect(src).toMatch(/t\(["']Inventory Health["']\)/);
        expect(src).toMatch(/t\(["']Customer Intelligence["']\)/);
        expect(src).toMatch(/t\(["']Financial Overview["']\)/);
    });

    test('stock summary labels are translated', () => {
        expect(src).toMatch(/t\(["']Out of Stock["']\)/);
        expect(src).toMatch(/t\(["']Healthy Stock["']\)/);
        expect(src).toMatch(/t\(["']Total Products["']\)/);
    });

    test('"Business Dashboard" heading is translated', () => {
        expect(src).toMatch(/t\(["']Business Dashboard["']\)/);
    });
});

// ── 3. Chart files wrap Google Charts title option ────────────────────────────

describe('chart files — Google Charts title options use t()', () => {
    const CHART_TITLES = [
        ['business_dashboard/charts/RevenueCharts.js', [
            "Monthly P&L Trend",
            "Cumulative Net Revenue Growth",
            "Last 12 Months — Monthly Sales",
            "Sales vs Returns by Month",
        ]],
        ['business_dashboard/charts/PaymentCharts.js', [
            "Payment Method Distribution",
            "Payment Status Overview",
            "Cash vs Bank Collections by Month",
        ]],
        ['business_dashboard/charts/ProductCharts.js', [
            "Top 10 Products by Revenue",
            "Category Revenue Breakdown",
            "Category Profit Margin %",
            "Stock Health Overview",
        ]],
        ['business_dashboard/charts/CustomerCharts.js', [
            "Top 10 Customers by Revenue",
            "Outstanding Receivables by Customer",
        ]],
        ['business_dashboard/charts/FinancialCharts.js', [
            "Account Balances by Type",
            "Purchase Spend by Vendor",
            "Monthly Net Revenue vs Total Expense",
        ]],
    ];

    CHART_TITLES.forEach(([rel, titles]) => {
        const src = read(rel);
        titles.forEach(title => {
            test(`${rel}: chart title "${title}" wrapped with t()`, () => {
                // title: t("...") or title: t('...')
                const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                expect(src).toMatch(new RegExp(`t\\(['""]${escaped}['""]\\)`));
            });
        });
    });
});

// ── 4. KPICards — card title props wrapped ───────────────────────────────────

describe('business_dashboard/charts/KPICards.js — KPI card titles use t()', () => {
    const src = read('business_dashboard/charts/KPICards.js');

    const TITLES = [
        'Total Revenue', 'Net Revenue', 'Total Expense',
        'Net Profit', 'Net Loss', 'Total Orders',
        'Avg Order Value', 'Return Rate', 'VAT', 'Salary Balance',
    ];

    TITLES.forEach(title => {
        test(`title="${title}" wrapped with t()`, () => {
            const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            expect(src).toMatch(new RegExp(`t\\(['"]${escaped}['"]\\)`));
        });
    });

    test('tooltip label "Gross Sales" is translated', () => {
        expect(src).toMatch(/t\(["']Gross Sales["']\)/);
    });

    test('tooltip label "Total Expense (with VAT)" is translated', () => {
        expect(src).toMatch(/t\(["']Total Expense \(with VAT\)["']\)/);
    });
});

// ── 5. Module-level label maps converted to factory functions ─────────────────

describe('PaymentCharts.js — METHOD_LABELS is a factory function', () => {
    const src = read('business_dashboard/charts/PaymentCharts.js');

    test('getMethodLabels(t) function is defined', () => {
        expect(src).toMatch(/function\s+getMethodLabels\s*\(\s*t\s*\)/);
    });

    test('payment method labels use t()', () => {
        expect(src).toMatch(/t\(["']Cash["']\)/);
        expect(src).toMatch(/t\(["']Bank Transfer["']\)/);
        expect(src).toMatch(/t\(["']Customer Account["']\)/);
    });

    test('bare const METHOD_LABELS = { ... } at module level is removed', () => {
        expect(src).not.toMatch(/^const\s+METHOD_LABELS\s*=\s*\{/m);
    });
});

describe('FinancialCharts.js — ACCOUNT_TYPE_LABELS is a factory function', () => {
    const src = read('business_dashboard/charts/FinancialCharts.js');

    test('getAccountTypeLabels(t) function is defined', () => {
        expect(src).toMatch(/function\s+getAccountTypeLabels\s*\(\s*t\s*\)/);
    });

    test('account type labels use t()', () => {
        expect(src).toMatch(/t\(["']Asset["']\)/);
        expect(src).toMatch(/t\(["']Liability["']\)/);
        expect(src).toMatch(/t\(["']Capital["']\)/);
    });

    test('bare const ACCOUNT_TYPE_LABELS = { ... } at module level is removed', () => {
        expect(src).not.toMatch(/^const\s+ACCOUNT_TYPE_LABELS\s*=\s*\{/m);
    });
});

// ── 6. ar/common.json has business-dashboard-specific keys ───────────────────

describe('ar/common.json — business dashboard keys', () => {
    const BD_KEYS = [
        // index.js UI
        'Business Dashboard', 'Overview', 'Revenue', 'Payments',
        'Products & Inventory', 'Customers & Finance',
        'Key Performance Indicators', 'Revenue Trends', 'Payment Analysis',
        'Product Performance', 'Inventory Health', 'Stock Summary',
        'Out of Stock', 'Low Stock (< 5 units)', 'Healthy Stock', 'Total Products',
        'Customer Intelligence', 'Financial Overview',
        'Single Month', 'Month Range', 'Year', 'Clear',
        'Download', 'Recompute', 'Loading dashboard data…',
        // KPI card titles
        'Total Revenue', 'Net Revenue', 'Total Expense',
        'Net Profit', 'Net Loss', 'Total Orders', 'Avg Order Value',
        'Return Rate', 'Salary Balance', 'Payable to Authority', 'Refundable',
        'Owed to Employees', 'Employees Owe Us', 'Settled',
        // Chart titles
        'Monthly P&L Trend', 'Cumulative Net Revenue Growth',
        'Last 12 Months — Monthly Sales', 'Sales vs Returns by Month',
        'Payment Method Distribution', 'Payment Status Overview',
        'Cash vs Bank Collections by Month', 'Top 10 Products by Revenue',
        'Category Revenue Breakdown', 'Category Profit Margin %',
        'Stock Health Overview', 'Top 10 Customers by Revenue',
        'Outstanding Receivables by Customer', 'Account Balances by Type',
        'Purchase Spend by Vendor', 'Monthly Net Revenue vs Total Expense',
        // Payment methods
        'Cash', 'Debit Card', 'Bank Card', 'Credit Card',
        'Bank Transfer', 'Bank Cheque', 'Customer Account',
        // Payment statuses
        'Paid', 'Unpaid', 'Partially Paid',
        // Account types
        'Asset', 'Liability', 'Capital', 'Drawing', 'General',
    ];

    BD_KEYS.forEach(key => {
        test(`"${key}" is translated`, () => {
            expect(typeof ar[key]).toBe('string');
            expect(ar[key].length).toBeGreaterThan(0);
        });
    });
});
