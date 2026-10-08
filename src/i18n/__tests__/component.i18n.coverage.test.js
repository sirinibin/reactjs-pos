/**
 * Verifies that every component added during the Arabic translation session
 * has useTranslation imported and the t() hook initialised.
 *
 * These are source-level smoke tests — they confirm the wiring exists,
 * not that every string is translated.
 */

const fs   = require('fs');
const path = require('path');

const SRC_ROOT = path.join(__dirname, '../../');

function read(rel) {
    return fs.readFileSync(path.join(SRC_ROOT, rel), 'utf8');
}

function hasImport(src)  { return /import.*useTranslation.*from ['"]react-i18next['"]/.test(src); }
function hasHook(src)    { return /const\s*\{\s*t[^}]*\}\s*=\s*useTranslation\(/.test(src); }

const COMPONENTS = [
    // Vendor category
    'vendor_category/create.js',
    'vendor_category/index.js',
    'vendor_category/view.js',
    // Customer
    'customer/index.js',
    // Product
    'product/index.js',
    'product/sales_history.js',
    'product/purchase_history.js',
    'product/delivery_note_history.js',
    'product/product_history.js',
    // Quotation
    'quotation/index.js',
    'quotation/create.js',
    'quotation_sales_return/index.js',
    // Purchase
    'purchase/index.js',
    'purchase/create.js',
    'purchase_return/index.js',
    // Sales
    'sales_return/index.js',
    'sales_return/create.js',
    // Delivery note
    'delivery_note/index.js',
    'delivery_note/create.js',
    // Stock transfer
    'stock_transfer/create.js',
    // Customer deposit / withdrawal
    'customer_deposit/create.js',
    'customer_deposit/view.js',
    'customer_withdrawal/create.js',
    'customer_withdrawal/view.js',
    // Quotation sales return payment
    'quotation_sales_return_payment/create.js',
    'quotation_sales_return_payment/index.js',
    // Purchase request
    'purchase_request/index.js',
    'purchase_request/view.js',
    // Capital / divident / expense index
    'capital/index.js',
    'capital_withdrawal/index.js',
    'divident/index.js',
    'expense/index.js',
    // RFQ
    'rfq_received/index.js',
    'rfq_suppliers/index.js',
    // Employee / salary
    'employee/index.js',
    'employee/salaryIndex.js',
    // Vendor
    'vendor/index.js',
    // Service
    'service/index.js',
    // Product category
    'product_category/index.js',
    'product_category/view.js',
    // User modals
    'user/ChangePasswordModal.js',
    'user/ManageUsersModal.js',
    // Store
    'store/index.js',
    'store/zatca_connect.js',
    // Sidebar settings
    'sidebar_settings/index.js',
    // Utils
    'utils/StatsSummary.js',
];

COMPONENTS.forEach(rel => {
    describe(`${rel}`, () => {
        const src = read(rel);

        test('imports useTranslation from react-i18next', () => {
            expect(hasImport(src)).toBe(true);
        });

        test('calls useTranslation() hook and destructures t', () => {
            expect(hasHook(src)).toBe(true);
        });
    });
});
