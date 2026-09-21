/**
 * Source-code tests for the RFQ Detail modal's Suppliers tab improvements:
 *  1. SupplierForm is now exported from rfq_suppliers/index.js
 *  2. SupplierForm is imported in rfq_received/index.js
 *  3. resolvedSuppliers state is declared in ForwardDetail
 *  4. fetchResolvedSuppliers fetches the suppliers list and maps by phone
 *  5. fetchResolvedSuppliers is triggered when suppliers tab becomes active
 *  6. Search input exists and filters by supplier name and phone
 *  7. Edit button per row opens SupplierForm with the resolved supplier data
 *  8. Market column falls back to resolved supplier data when r.purchase_market is empty
 *  9. Category column falls back to resolved supplier's categories when r.category is empty
 */

const fs = require('fs');
const path = require('path');

const indexSrc = fs.readFileSync(
    path.join(__dirname, 'index.js'),
    'utf8'
);

const suppliersSrc = fs.readFileSync(
    path.join(__dirname, '../rfq_suppliers/index.js'),
    'utf8'
);

describe('RFQ Detail modal — Suppliers tab improvements', () => {
    it('1. SupplierForm is exported from rfq_suppliers/index.js', () => {
        expect(suppliersSrc).toMatch(/export\s+function\s+SupplierForm/);
    });

    it('2. SupplierForm is imported in rfq_received/index.js', () => {
        expect(indexSrc).toMatch(/import\s*\{[^}]*SupplierForm[^}]*\}\s*from\s*['"]\.\.\/rfq_suppliers\/index/);
    });

    it('3. resolvedSuppliers state is declared in ForwardDetail', () => {
        expect(indexSrc).toMatch(/resolvedSuppliers[\s\S]{0,30}setResolvedSuppliers/);
    });

    it('4. fetchResolvedSuppliers fetches /v1/rfq-suppliers with limit', () => {
        expect(indexSrc).toMatch(/fetchResolvedSuppliers[\s\S]{0,300}rfq-suppliers[\s\S]{0,100}limit/);
    });

    it('5. fetchResolvedSuppliers maps by phone and phone2', () => {
        expect(indexSrc).toMatch(/map\[s\.phone\]\s*=\s*s/);
        expect(indexSrc).toMatch(/map\[s\.phone2\]\s*=\s*s/);
    });

    it('6. fetchResolvedSuppliers triggers on suppliers tab activation', () => {
        expect(indexSrc).toMatch(/activeTab.*suppliers[\s\S]{0,50}fetchResolvedSuppliers|fetchResolvedSuppliers[\s\S]{0,100}suppliers/);
    });

    it('7. Search input filters forwarded_to by supplier name and phone', () => {
        expect(indexSrc).toMatch(/supplierSearch/);
        expect(indexSrc).toMatch(/supplier_name[\s\S]{0,30}toLowerCase[\s\S]{0,30}includes\(q\)/);
        expect(indexSrc).toMatch(/phone[\s\S]{0,20}includes\(q\)/);
    });

    it('8. Edit button opens SupplierForm with resolved supplier data', () => {
        expect(indexSrc).toMatch(/btn-outline-warning/);
        expect(indexSrc).toMatch(/setEditingSupplier\(/);
        expect(indexSrc).toMatch(/<SupplierForm[\s\S]{0,100}editingSupplier/);
    });

    it('9. Market falls back to resolved.purchase_market when r.purchase_market is empty', () => {
        expect(indexSrc).toMatch(/r\.purchase_market\s*\|\|\s*resolved\.purchase_market/);
    });

    it('10. Category falls back to resolved.categories when r.category is empty', () => {
        expect(indexSrc).toMatch(/r\.category\s*\|\|[\s\S]{0,30}resolved\.categories/);
    });
});
