/**
 * Source-level tests for the Sales ↔ Quotation form switch feature.
 *
 * Tests verify that all required code is present in the relevant source files
 * without rendering the full components (which require a live API).
 */

const fs   = require('fs');
const path = require('path');

const ORDER_CREATE = fs.readFileSync(path.join(__dirname, 'create.js'), 'utf8');
const ORDER_INDEX  = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8');
const QUOT_CREATE  = fs.readFileSync(path.join(__dirname, '../quotation/create.js'), 'utf8');
const QUOT_INDEX   = fs.readFileSync(path.join(__dirname, '../quotation/index.js'), 'utf8');
const QUOT_TYPE3   = fs.readFileSync(path.join(__dirname, '../quotation/QuotationType3Form.js'), 'utf8');
const SALES_TYPE1  = fs.readFileSync(path.join(__dirname, 'SalesType1Form.js'), 'utf8');
const SALES_VAN    = fs.readFileSync(path.join(__dirname, 'SalesVanStoreForm.js'), 'utf8');
const SALES_TYPE5  = fs.readFileSync(path.join(__dirname, 'SalesType5Form.js'), 'utf8');

// ── 1. order/create.js — handleSwitchToQuotation ─────────────────────────────

describe('order/create.js — handleSwitchToQuotation', () => {
    test('1.1  handleSwitchToQuotation function is declared', () => {
        expect(ORDER_CREATE).toMatch(/function\s+handleSwitchToQuotation/);
    });

    test('1.2  writes sales_to_quotation_switch to sessionStorage', () => {
        expect(ORDER_CREATE).toMatch(/sessionStorage\.setItem\s*\(\s*['"]sales_to_quotation_switch['"]/);
    });

    test('1.3  serializes products in the switch payload', () => {
        expect(ORDER_CREATE).toMatch(/sales_to_quotation_switch[\s\S]{0,500}products\s*:/);
    });

    test('1.4  calls props.onSwitchToQuotation after closing', () => {
        expect(ORDER_CREATE).toMatch(/props\.onSwitchToQuotation\?\.\(\)/);
    });

    test('1.5  guards against update forms (returns early when isUpdateForm)', () => {
        expect(ORDER_CREATE).toMatch(/handleSwitchToQuotation[\s\S]{0,200}isUpdateForm[\s\S]{0,50}return/);
    });

    test('1.6  button rendered for type3 inline header (sc-header-actions)', () => {
        // Both sc-header-actions div and Switch to Quotation button exist in the file
        expect(ORDER_CREATE).toMatch(/sc-header-actions/);
        expect(ORDER_CREATE).toMatch(/Switch to Quotation/);
    });

    test('1.7  button rendered for type2 inline header', () => {
        // Two occurrences of Switch to Quotation: one for type3 and one for type2
        const matches = ORDER_CREATE.match(/Switch to Quotation/g);
        expect(matches).not.toBeNull();
        expect(matches.length).toBeGreaterThanOrEqual(2);
    });

    test('1.8  onSwitchToQuotation prop forwarded to SalesType1Header', () => {
        expect(ORDER_CREATE).toMatch(/SalesType1[\s\S]{0,1500}onSwitchToQuotation/);
    });

    test('1.9  onSwitchToQuotation prop forwarded to SalesVanStoreHeader', () => {
        expect(ORDER_CREATE).toMatch(/SalesVanStore[\s\S]{0,1500}onSwitchToQuotation/);
    });

    test('1.10 onSwitchToQuotation prop forwarded to SalesType5Header', () => {
        expect(ORDER_CREATE).toMatch(/SalesType5[\s\S]{0,1500}onSwitchToQuotation/);
    });
});

// ── 2. order/create.js — open() prefill from quotation_to_sales_switch ────────

describe('order/create.js — open() reads quotation_to_sales_switch', () => {
    test('2.1  reads quotation_to_sales_switch from sessionStorage', () => {
        expect(ORDER_CREATE).toMatch(/sessionStorage\.getItem\s*\(\s*['"]quotation_to_sales_switch['"]/);
    });

    test('2.2  removes the key after reading it', () => {
        expect(ORDER_CREATE).toMatch(/sessionStorage\.removeItem\s*\(\s*['"]quotation_to_sales_switch['"]/);
    });

    test('2.3  only applied when !id (new form)', () => {
        // The block is inside `if (!id)` branch
        expect(ORDER_CREATE).toMatch(/if\s*\(!\s*id\s*\)[\s\S]{0,1000}quotation_to_sales_switch/);
    });

    test('2.4  applies products from switch data', () => {
        expect(ORDER_CREATE).toMatch(/quotation_to_sales_switch[\s\S]{0,500}switchData\.products/);
    });
});

// ── 3. order/index.js — navigation and useEffect ─────────────────────────────

describe('order/index.js — switch navigation', () => {
    test('3.1  handleSwitchToQuotation pushes to /dashboard/quotations', () => {
        expect(ORDER_INDEX).toMatch(/handleSwitchToQuotation[\s\S]{0,200}\/dashboard\/quotations/);
    });

    test('3.2  URL param from_quotation_form=1 is checked or appended', () => {
        expect(ORDER_INDEX).toMatch(/from_quotation_form/);
    });

    test('3.3  useEffect detects from_quotation_form param and opens create form', () => {
        expect(ORDER_INDEX).toMatch(/from_quotation_form[\s\S]{0,200}openCreateForm/);
    });

    test('3.4  onSwitchToQuotation prop wired on OrderCreate', () => {
        expect(ORDER_INDEX).toMatch(/onSwitchToQuotation\s*=\s*\{handleSwitchToQuotation\}/);
    });
});

// ── 4. quotation/create.js — handleSwitchToSales ─────────────────────────────

describe('quotation/create.js — handleSwitchToSales', () => {
    test('4.1  handleSwitchToSales function is declared', () => {
        expect(QUOT_CREATE).toMatch(/function\s+handleSwitchToSales/);
    });

    test('4.2  writes quotation_to_sales_switch to sessionStorage', () => {
        expect(QUOT_CREATE).toMatch(/sessionStorage\.setItem\s*\(\s*['"]quotation_to_sales_switch['"]/);
    });

    test('4.3  calls props.onSwitchToSales after closing', () => {
        expect(QUOT_CREATE).toMatch(/props\.onSwitchToSales\?\.\(\)/);
    });

    test('4.4  guards against update forms (returns early when formData.id)', () => {
        expect(QUOT_CREATE).toMatch(/handleSwitchToSales[\s\S]{0,200}formData\.id[\s\S]{0,50}return/);
    });

    test('4.5  Switch to Sales button visible only when !formData.id', () => {
        expect(QUOT_CREATE).toMatch(/!\s*formData\.id[\s\S]{0,700}Switch to Sales/);
    });
});

// ── 5. quotation/create.js — open() prefill from sales_to_quotation_switch ───

describe('quotation/create.js — open() reads sales_to_quotation_switch', () => {
    test('5.1  reads sales_to_quotation_switch from sessionStorage', () => {
        expect(QUOT_CREATE).toMatch(/sessionStorage\.getItem\s*\(\s*['"]sales_to_quotation_switch['"]/);
    });

    test('5.2  removes the key after reading it', () => {
        expect(QUOT_CREATE).toMatch(/sessionStorage\.removeItem\s*\(\s*['"]sales_to_quotation_switch['"]/);
    });

    test('5.3  applies products from switch data', () => {
        expect(QUOT_CREATE).toMatch(/sales_to_quotation_switch[\s\S]{0,800}switchData\.products/);
    });
});

// ── 6. quotation/index.js — navigation and useEffect ─────────────────────────

describe('quotation/index.js — switch navigation', () => {
    test('6.1  handleSwitchToSales function is declared', () => {
        expect(QUOT_INDEX).toMatch(/function\s+handleSwitchToSales/);
    });

    test('6.2  handleSwitchToSales pushes to /dashboard/sales', () => {
        expect(QUOT_INDEX).toMatch(/handleSwitchToSales[\s\S]{0,200}\/dashboard\/sales/);
    });

    test('6.3  URL param from_quotation_form=1 is appended', () => {
        expect(QUOT_INDEX).toMatch(/from_quotation_form=1/);
    });

    test('6.4  useEffect detects from_sales_form param and opens create form', () => {
        expect(QUOT_INDEX).toMatch(/from_sales_form[\s\S]{0,200}openCreateForm/);
    });

    test('6.5  onSwitchToSales prop wired on QuotationCreate', () => {
        expect(QUOT_INDEX).toMatch(/QuotationCreate[\s\S]{0,400}onSwitchToSales\s*=\s*\{handleSwitchToSales\}/);
    });

    test('6.6  onSwitchToSales prop wired on QuotationType3Form', () => {
        expect(QUOT_INDEX).toMatch(/QuotationType3Form[\s\S]{0,700}onSwitchToSales\s*=\s*\{handleSwitchToSales\}/);
    });
});

// ── 7. quotation/QuotationType3Form.js — open() prefill ──────────────────────

describe('quotation/QuotationType3Form.js — open() reads sales_to_quotation_switch', () => {
    test('7.1  reads sales_to_quotation_switch from sessionStorage', () => {
        expect(QUOT_TYPE3).toMatch(/sessionStorage\.getItem\s*\(\s*['"]sales_to_quotation_switch['"]/);
    });

    test('7.2  removes the key after reading it', () => {
        expect(QUOT_TYPE3).toMatch(/sessionStorage\.removeItem\s*\(\s*['"]sales_to_quotation_switch['"]/);
    });

    test('7.3  applies products from switch data', () => {
        expect(QUOT_TYPE3).toMatch(/sales_to_quotation_switch[\s\S]{0,800}setSelectedProducts/);
    });

    test('7.4  Switch to Sales button is in QuotationType3Form modal header', () => {
        expect(QUOT_TYPE3).toMatch(/Switch to Sales/);
    });

    test('7.5  button only shown for standard quotation (apiBase check)', () => {
        expect(QUOT_TYPE3).toMatch(/apiBase\s*===\s*['"]\/v1\/quotation['"][\s\S]{0,1400}Switch to Sales/);
    });
});

// ── 8. Sub-form components accept onSwitchToQuotation prop ───────────────────

describe('Sales sub-form components — onSwitchToQuotation prop', () => {
    test('8.1  SalesType1Form accepts and renders onSwitchToQuotation button', () => {
        expect(SALES_TYPE1).toMatch(/onSwitchToQuotation/);
        expect(SALES_TYPE1).toMatch(/Switch to Quotation/);
    });

    test('8.2  SalesVanStoreForm accepts and renders onSwitchToQuotation button', () => {
        expect(SALES_VAN).toMatch(/onSwitchToQuotation/);
        expect(SALES_VAN).toMatch(/Switch to Quotation|Quotation/);
    });

    test('8.3  SalesType5Form accepts and renders onSwitchToQuotation button', () => {
        expect(SALES_TYPE5).toMatch(/onSwitchToQuotation/);
        expect(SALES_TYPE5).toMatch(/Switch to Quotation/);
    });

    test('8.4  SalesType1Form button only shown when !isUpdateForm', () => {
        expect(SALES_TYPE1).toMatch(/!\s*isUpdateForm[\s\S]{0,100}onSwitchToQuotation[\s\S]{0,500}Switch to Quotation/);
    });
});
