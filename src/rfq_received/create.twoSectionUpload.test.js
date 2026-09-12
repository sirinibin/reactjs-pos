/**
 * Source-level tests for the two-section file upload feature in
 * rfq_received/create.js:
 *  1. Two separate upload sections: Products and Additional Details
 *  2. Excel extraction for Products section
 *  3. Non-Excel product files shown as-is (stored as data URIs)
 *  4. Additional files stored separately
 *  5. Payload includes both attachment_data_uris and additional_attachment_data_uris
 *  6. Validation: passes if productFiles.length > 0 (no products required)
 *  7. State reset on open/edit
 *  8. RFQPreviewContent shows additional files below products table
 */

const fs   = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
    path.join(__dirname, 'create.js'),
    'utf8'
);

const PREVIEW_SRC = fs.readFileSync(
    path.join(__dirname, 'RFQPreviewContent.js'),
    'utf8'
);

// ── 1. XLSX import ────────────────────────────────────────────────────────────

describe('create.js — XLSX import', () => {
    test('1.1  XLSX is imported from the xlsx package', () => {
        expect(SRC).toMatch(/import\s+\*\s+as\s+XLSX\s+from\s+["']xlsx["']/);
    });
});

// ── 2. State variables ────────────────────────────────────────────────────────

describe('create.js — two-section file state variables', () => {
    test('2.1  productFiles state is declared', () => {
        expect(SRC).toMatch(/productFiles.*setProductFiles.*useState/s);
    });

    test('2.2  additionalFiles state is declared', () => {
        expect(SRC).toMatch(/additionalFiles.*setAdditionalFiles.*useState/s);
    });

    test('2.3  isDragOverProduct state is declared', () => {
        expect(SRC).toMatch(/isDragOverProduct.*setIsDragOverProduct.*useState/s);
    });

    test('2.4  isDragOverAdditional state is declared', () => {
        expect(SRC).toMatch(/isDragOverAdditional.*setIsDragOverAdditional.*useState/s);
    });

    test('2.5  productFileInputRef and additionalFileInputRef refs are declared', () => {
        expect(SRC).toMatch(/productFileInputRef/);
        expect(SRC).toMatch(/additionalFileInputRef/);
    });

    test('2.6  productDropZoneRef and additionalDropZoneRef refs are declared', () => {
        expect(SRC).toMatch(/productDropZoneRef/);
        expect(SRC).toMatch(/additionalDropZoneRef/);
    });
});

// ── 3. Excel extraction helpers ───────────────────────────────────────────────

describe('create.js — Excel extraction helpers', () => {
    test('3.1  extractExcelText function is defined', () => {
        expect(SRC).toMatch(/extractExcelText/);
    });

    test('3.2  XLSX.read is called in extractExcelText', () => {
        expect(SRC).toMatch(/XLSX\.read/);
    });

    test('3.3  XLSX.utils.sheet_to_csv is used to convert sheet', () => {
        expect(SRC).toMatch(/XLSX\.utils\.sheet_to_csv/);
    });

    test('3.4  extractFromExcel function is defined and calls the extract API', () => {
        expect(SRC).toMatch(/extractFromExcel/);
        expect(SRC).toMatch(/rfq-received\/extract/);
    });

    test('3.5  extractFromExcel sends text_content to extract endpoint', () => {
        expect(SRC).toMatch(/fd\.append\(["']text_content["']/);
    });

    test('3.6  extractFromExcel calls setProducts with extracted products', () => {
        expect(SRC).toMatch(/setProducts\(extracted\)/);
    });

    test('3.7  extractFromExcel calls autoSyncProducts after extraction', () => {
        expect(SRC).toMatch(/autoSyncProducts\(extracted\)/);
    });
});

// ── 4. addProductFiles handler ────────────────────────────────────────────────

describe('create.js — addProductFiles separates Excel from non-Excel', () => {
    test('4.1  addProductFiles function is defined', () => {
        expect(SRC).toMatch(/addProductFiles/);
    });

    test('4.2  xlsx and xls are detected as Excel extensions', () => {
        expect(SRC).toMatch(/["']xlsx["'].*["']xls["']|["']xls["'].*["']xlsx["']/);
    });

    test('4.3  Excel files trigger extractFromExcel', () => {
        expect(SRC).toMatch(/excelFiles.*extractFromExcel|extractFromExcel.*excelFiles/s);
    });

    test('4.4  non-Excel files are added to productFiles state', () => {
        expect(SRC).toMatch(/setProductFiles/);
        expect(SRC).toMatch(/otherFiles/);
    });
});

// ── 5. addAdditionalFiles handler ─────────────────────────────────────────────

describe('create.js — addAdditionalFiles handler', () => {
    test('5.1  addAdditionalFiles function is defined', () => {
        expect(SRC).toMatch(/addAdditionalFiles/);
    });

    test('5.2  addAdditionalFiles calls setAdditionalFiles', () => {
        expect(SRC).toMatch(/setAdditionalFiles/);
    });
});

// ── 6. Drag & drop handlers ───────────────────────────────────────────────────

describe('create.js — separate drag/drop handlers per section', () => {
    test('6.1  onProductDragOver, onProductDragLeave, onProductDrop defined', () => {
        expect(SRC).toMatch(/onProductDragOver/);
        expect(SRC).toMatch(/onProductDragLeave/);
        expect(SRC).toMatch(/onProductDrop/);
    });

    test('6.2  onAdditionalDragOver, onAdditionalDragLeave, onAdditionalDrop defined', () => {
        expect(SRC).toMatch(/onAdditionalDragOver/);
        expect(SRC).toMatch(/onAdditionalDragLeave/);
        expect(SRC).toMatch(/onAdditionalDrop/);
    });

    test('6.3  removeProductFile is defined', () => {
        expect(SRC).toMatch(/removeProductFile/);
    });

    test('6.4  removeAdditionalFile is defined', () => {
        expect(SRC).toMatch(/removeAdditionalFile/);
    });
});

// ── 7. JSX — two dropzone sections ───────────────────────────────────────────

describe('create.js — JSX renders two distinct upload sections', () => {
    test('7.1  Products section label is present', () => {
        expect(SRC).toMatch(/Products/);
    });

    test('7.2  Additional Details section label is present', () => {
        expect(SRC).toMatch(/Additional Details/);
    });

    test('7.3  productDropZoneRef is used in JSX', () => {
        expect(SRC).toMatch(/ref=\{productDropZoneRef\}/);
    });

    test('7.4  additionalDropZoneRef is used in JSX', () => {
        expect(SRC).toMatch(/ref=\{additionalDropZoneRef\}/);
    });

    test('7.5  productFileInputRef is wired to a hidden file input', () => {
        expect(SRC).toMatch(/ref=\{productFileInputRef\}/);
    });

    test('7.6  additionalFileInputRef is wired to a hidden file input', () => {
        expect(SRC).toMatch(/ref=\{additionalFileInputRef\}/);
    });
});

// ── 8. handleSubmit payload ───────────────────────────────────────────────────

describe('create.js — handleSubmit sends both attachment arrays', () => {
    test('8.1  attachment_data_uris is included in payload', () => {
        expect(SRC).toMatch(/attachment_data_uris/);
    });

    test('8.2  additional_attachment_data_uris is included in payload', () => {
        expect(SRC).toMatch(/additional_attachment_data_uris/);
    });

    test('8.3  additionalFiles converted to data URIs', () => {
        expect(SRC).toMatch(/filesToDataURIs\(additionalFiles\)/);
    });

    test('8.4  productFiles converted to data URIs', () => {
        expect(SRC).toMatch(/filesToDataURIs\(productFiles\)/);
    });

    test('8.5  products array is empty when hasProductFiles is true', () => {
        expect(SRC).toMatch(/hasProductFiles\s*\?\s*\[\]/);
    });
});

// ── 9. Validation ─────────────────────────────────────────────────────────────

describe('create.js — validation uses hasProductFiles not hasFiles', () => {
    test('9.1  hasProductFiles is derived from productFiles.length', () => {
        expect(SRC).toMatch(/hasProductFiles\s*=\s*productFiles\.length/);
    });

    test('9.2  validation check uses hasProductFiles', () => {
        expect(SRC).toMatch(/!hasProducts.*!hasProductFiles|!hasProductFiles.*!hasProducts/);
    });
});

// ── 10. State reset on modal open/edit ────────────────────────────────────────

describe('create.js — modal open/edit resets both file arrays', () => {
    test('10.1  setProductFiles([]) called in open()', () => {
        expect(SRC).toMatch(/setProductFiles\(\[\]\)/);
    });

    test('10.2  setAdditionalFiles([]) called in open()', () => {
        expect(SRC).toMatch(/setAdditionalFiles\(\[\]\)/);
    });
});

// ── 11. RFQPreviewContent — additional files section ─────────────────────────

describe('RFQPreviewContent.js — additional attachments below products table', () => {
    test('11.1  additional_attachment_data_uris is read from rfq', () => {
        expect(PREVIEW_SRC).toMatch(/additional_attachment_data_uris/);
    });

    test('11.2  hasAdditionalAttachments variable is derived', () => {
        expect(PREVIEW_SRC).toMatch(/hasAdditionalAttachments/);
    });

    test('11.3  additional attachments are rendered with iframe for PDFs', () => {
        expect(PREVIEW_SRC).toMatch(/additional-attachment/);
    });

    test('11.4  additional attachments section appears after the products table section in JSX', () => {
        const productsTablePos = PREVIEW_SRC.indexOf('Products table');
        const additionalPos    = PREVIEW_SRC.indexOf('Additional detail files');
        // The additional files section comment must come after the products table comment
        expect(additionalPos).toBeGreaterThan(productsTablePos);
        expect(additionalPos).toBeGreaterThan(0);
    });
});
