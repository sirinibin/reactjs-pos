/**
 * Source-level tests for the PDF Extract → Preview → Confirm flow
 * in PriceComparisonTable (Add Quotation Prices section).
 */

const fs   = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '../index.js'), 'utf8');

describe('PriceComparisonTable — PDF extract flow', () => {
    test('1. extractResult, previewRows, extracting state declared', () => {
        expect(src).toMatch(/extractResult.*setExtractResult.*useState\(null\)/);
        expect(src).toMatch(/previewRows.*setPreviewRows.*useState\(\[\]\)/);
        expect(src).toMatch(/extracting.*setExtracting.*useState\(false\)/);
    });

    test('2. addProvider and addModel state declared with AI_PROVIDERS defaults', () => {
        expect(src).toMatch(/addProvider.*setAddProvider.*useState/);
        expect(src).toMatch(/addModel.*setAddModel.*useState/);
    });

    test('3. handleExtractQuotation calls parse-file with llm_provider and llm_model', () => {
        expect(src).toMatch(/supplier-replies\/parse-file\?store_id=.*llm_provider=.*llm_model=/);
    });

    test('4. extraction result populates previewRows matched against rfq products', () => {
        expect(src).toMatch(/byPart.*prices\.find.*prod\.part_no/s);
        expect(src).toMatch(/byIdx.*prices\.find.*product_index === i/);
        expect(src).toMatch(/match.*byPart \|\| byIdx/);
    });

    test('5. previewRow has matched flag set to true only when a price was found', () => {
        expect(src).toMatch(/matched:\s*!!match/);
    });

    test('6. handleConfirmExtractedPrices filters rows with price > 0 before saving', () => {
        expect(src).toMatch(/previewRows\s*\.filter\(r => parseFloat\(r\.unitPrice\) > 0\)/);
    });

    test('7. confirm step calls supplier-replies with run_llm_extraction: false', () => {
        expect(src).toMatch(/run_llm_extraction:\s*false/);
    });

    test('8. step 1 UI shows file drop zone and Extract button', () => {
        expect(src).toMatch(/Click or drag.*quotation PDF/);
        expect(src).toMatch(/handleExtractQuotation/);
    });

    test('9. step 2 shows preview table with editable unit price inputs', () => {
        expect(src).toMatch(/Extraction complete/);
        expect(src).toMatch(/handleConfirmExtractedPrices/);
        expect(src).toMatch(/Add Prices to RFQ/);
    });

    test('10. matched rows get a green check icon; unmatched get a warning icon', () => {
        expect(src).toMatch(/row\.matched[\s\S]{0,200}bi-check-circle-fill text-success/);
        expect(src).toMatch(/bi-question-circle text-warning/);
    });

    test('11. Back button resets extractResult so user can re-upload', () => {
        expect(src).toMatch(/setExtractResult\(null\)[\s\S]{0,50}setPreviewRows\(\[\]\)/);
    });

    test('12. provider/model dropdowns use AI_PROVIDERS and modelsForProvider', () => {
        expect(src).toMatch(/AI_PROVIDERS\.map\(p => <option key=\{p\.value\}/);
        expect(src).toMatch(/modelsForProvider\(addProvider\)\.map/);
    });

    test('13. old manual supplier name/phone/email fields are removed', () => {
        // The form should NOT contain the old raw_text textarea or the 3-column supplier info row
        // (those were replaced by the file drop zone)
        const formSection = src.slice(src.indexOf('Add Quotation Prices'), src.indexOf('Price comparison table'));
        expect(formSection).not.toMatch(/paste_supplier_reply_text/);
        expect(formSection).not.toMatch(/upload_quotation_hint/);
    });
});
