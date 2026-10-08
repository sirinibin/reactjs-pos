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

    test('1.2  saves the switch payload under the sales-to-quotation key', () => {
        expect(ORDER_CREATE).toMatch(/saveSwitchPayload\(\s*SALES_TO_QUOTATION_KEY\s*,\s*buildSwitchPayload\(/);
    });

    test('1.3  passes form data, products, customers and live amounts to the payload', () => {
        expect(ORDER_CREATE).toMatch(/buildSwitchPayload\(\{\s*formData,\s*products:\s*selectedProducts,\s*customers:\s*selectedCustomers,\s*amounts:/);
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
    test('2.1  takes (reads and removes) the quotation-to-sales payload', () => {
        expect(ORDER_CREATE).toMatch(/takeSwitchPayload\(\s*QUOTATION_TO_SALES_KEY\s*\)/);
    });

    test('2.2  applies the carried form fields', () => {
        expect(ORDER_CREATE).toMatch(/switchFields\(switchData\)[\s\S]{0,100}Object\.assign\(formData,\s*fields\)/);
    });

    test('2.3  only applied when !id (new form)', () => {
        expect(ORDER_CREATE).toMatch(/if\s*\(!\s*id\s*\)\s*\{\s*const switchData = takeSwitchPayload\(QUOTATION_TO_SALES_KEY\)/);
    });

    test('2.4  applies products and the amount inputs from switch data', () => {
        expect(ORDER_CREATE).toMatch(/takeSwitchPayload\(QUOTATION_TO_SALES_KEY\)[\s\S]{0,3000}switchData\.products/);
        expect(ORDER_CREATE).toMatch(/takeSwitchPayload\(QUOTATION_TO_SALES_KEY\)[\s\S]{0,2000}setShipping\(shipping\)/);
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

    test('4.2  saves the switch payload under the quotation-to-sales key', () => {
        expect(QUOT_CREATE).toMatch(/saveSwitchPayload\(\s*QUOTATION_TO_SALES_KEY\s*,\s*buildSwitchPayload\(/);
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
    test('5.1  takes (reads and removes) the sales-to-quotation payload', () => {
        expect(QUOT_CREATE).toMatch(/takeSwitchPayload\(\s*SALES_TO_QUOTATION_KEY\s*\)/);
    });

    test('5.2  applies the carried form fields and shows the phone', () => {
        expect(QUOT_CREATE).toMatch(/Object\.assign\(formData,\s*fields\)/);
        expect(QUOT_CREATE).toMatch(/formData\.customer_phone_number = fields\.phone/);
    });

    test('5.3  applies products from switch data', () => {
        expect(QUOT_CREATE).toMatch(/takeSwitchPayload\(SALES_TO_QUOTATION_KEY\)[\s\S]{0,2500}switchData\.products/);
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
    test('7.1  takes (reads and removes) the sales-to-quotation payload', () => {
        expect(QUOT_TYPE3).toMatch(/takeSwitchPayload\(\s*SALES_TO_QUOTATION_KEY\s*\)/);
    });

    test('7.2  applies the carried discount and shipping', () => {
        expect(QUOT_TYPE3).toMatch(/setDiscount\(fields\.discount\)/);
        expect(QUOT_TYPE3).toMatch(/setShipping\(fields\.shipping_handling_fees\)/);
    });

    test('7.3  applies products from switch data', () => {
        expect(QUOT_TYPE3).toMatch(/takeSwitchPayload\(SALES_TO_QUOTATION_KEY\)[\s\S]{0,1200}setSelectedProducts/);
    });

    test('7.6  saves the quotation-to-sales payload when switching', () => {
        expect(QUOT_TYPE3).toMatch(/saveSwitchPayload\(\s*QUOTATION_TO_SALES_KEY\s*,\s*buildSwitchPayload\(/);
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
