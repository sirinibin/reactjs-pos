/**
 * Source-level tests for changes introduced to StoreSettingsModal.js:
 *  - Logo tab added to TABS
 *  - Logo dropzone moved from General Info to Logo tab
 *  - Logo onRemove sets remove_logo: true + clears logo and logo_content
 *  - ImageDropzone Remove button asks window.confirm before calling onRemove
 *  - "Save Changes" button added to modal header
 *  - Sample download buttons added to Invoice BG Image tab
 */

const fs   = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
    path.join(__dirname, 'StoreSettingsModal.js'),
    'utf8'
);

// ── 1. Logo tab in TABS ───────────────────────────────────────────────────────

describe('StoreSettingsModal.js — Logo tab in TABS', () => {
    test('1.1  id "logo" is declared in TABS', () => {
        expect(SRC).toMatch(/id:\s*['"]logo['"]/);
    });

    test('1.2  tab label is "Logo"', () => {
        expect(SRC).toMatch(/label:\s*['"]Logo['"]/);
    });

    test('1.3  bi-image-fill icon is used for the Logo tab', () => {
        expect(SRC).toMatch(/bi-image-fill/);
    });

    test('1.4  Logo tab appears before invoice_background in TABS', () => {
        const logoIdx = SRC.indexOf("id: 'logo'");
        const bgIdx   = SRC.indexOf("id: 'invoice_background'");
        expect(logoIdx).toBeGreaterThan(-1);
        expect(bgIdx).toBeGreaterThan(logoIdx);
    });
});

// ── 2. Logo tab content ───────────────────────────────────────────────────────

describe('StoreSettingsModal.js — Logo tab content', () => {
    test('2.1  tab content renders when activeTab === "logo"', () => {
        expect(SRC).toMatch(/activeTab\s*===\s*['"]logo['"]/);
    });

    test('2.2  resolveImageUrl is called with formData.logo for Logo currentSrc', () => {
        expect(SRC).toMatch(/resolveImageUrl\(\s*formData\.logo/);
    });

    test('2.3  Logo ImageDropzone is in compact mode only in other tabs, full mode in Logo tab', () => {
        // The Logo tab renders <ImageDropzone label="Logo" without compact
        // (compact was only used in the old General Info inline dropzone)
        const logoTabStart = SRC.indexOf("activeTab === 'logo'");
        const logoTabEnd   = SRC.indexOf("activeTab === 'invoice_background'");
        const logoTabSrc   = SRC.slice(logoTabStart, logoTabEnd);
        // full-size dropzone: no compact prop on the main logo dropzone in Logo tab
        expect(logoTabSrc).toMatch(/label=["']Logo["']/);
    });

    test('2.4  Logo guidelines info box is shown in Logo tab', () => {
        expect(SRC).toMatch(/Logo Guidelines/);
    });

    test('2.5  logo hint mentions recommended 300×100 px', () => {
        expect(SRC).toMatch(/300.*100|100.*300/);
    });

    test('2.6  logo hint mentions transparent PNG', () => {
        expect(SRC).toMatch(/transparent.*PNG|PNG.*transparent/i);
    });

    test('2.7  logo hint mentions invoice header', () => {
        expect(SRC).toMatch(/invoice header/i);
    });

    test('2.8  logo hint mentions 500 KB size limit', () => {
        expect(SRC).toMatch(/500\s*KB/i);
    });
});

// ── 3. Logo onRemove — clears logo, logo_content, sets remove_logo ────────────

describe('StoreSettingsModal.js — Logo onRemove sets remove_logo', () => {
    test('3.1  remove_logo: true is set on logo removal', () => {
        expect(SRC).toMatch(/remove_logo:\s*true/);
    });

    test('3.2  logo field is cleared to empty string on removal', () => {
        // setFormData(prev => ({ ...prev, logo: '', logo_content: '', remove_logo: true }))
        expect(SRC).toMatch(/logo:\s*['"]{2}/);
    });

    test('3.3  logo_content is cleared on removal', () => {
        expect(SRC).toMatch(/logo_content:\s*['"]{2}/);
    });

    test('3.4  all three fields appear together in the same onRemove expression', () => {
        // The pattern: logo: '', logo_content: '', remove_logo: true must coexist
        const removeBlock = SRC.match(/onRemove=\{[^}]+remove_logo[^}]+\}/);
        expect(removeBlock).not.toBeNull();
        const block = removeBlock[0];
        expect(block).toMatch(/logo_content/);
        expect(block).toMatch(/remove_logo/);
    });
});

// ── 4. ImageDropzone — window.confirm before Remove ──────────────────────────

describe('StoreSettingsModal.js — ImageDropzone confirm prompt', () => {
    test('4.1  window.confirm is called in the Remove button handler', () => {
        expect(SRC).toMatch(/window\.confirm/);
    });

    test('4.2  confirm message references the image label', () => {
        expect(SRC).toMatch(/window\.confirm\(`Remove this \$\{label\}/);
    });

    test('4.3  confirm message mentions deletion happens on save', () => {
        expect(SRC).toMatch(/delete it when you save/);
    });

    test('4.4  onRemove is only called when confirm returns truthy', () => {
        // Pattern: if (!window.confirm(...)) return; onRemove();
        expect(SRC).toMatch(/if\s*\(\s*!window\.confirm/);
    });

    test('4.5  early return prevents onRemove when user cancels', () => {
        // The guard must be followed by a return
        const guardIdx  = SRC.indexOf('!window.confirm');
        const returnIdx = SRC.indexOf('return;', guardIdx);
        expect(guardIdx).toBeGreaterThan(-1);
        expect(returnIdx).toBeGreaterThan(guardIdx);
        expect(returnIdx - guardIdx).toBeLessThan(100);
    });
});

// ── 5. "Save Changes" button in modal header ──────────────────────────────────

describe('StoreSettingsModal.js — Save Changes button in header', () => {
    test('5.1  "Save Changes" text is present in the header', () => {
        expect(SRC).toMatch(/Save Changes/);
    });

    test('5.2  Save Changes button calls handleSave', () => {
        expect(SRC).toMatch(/onClick=\{handleSave\}/);
    });

    test('5.3  bi-floppy2-fill icon is used on the Save Changes button', () => {
        expect(SRC).toMatch(/bi-floppy2-fill/);
    });

    test('5.4  Save Changes button is disabled while saving', () => {
        expect(SRC).toMatch(/disabled=\{saving/);
    });

    test('5.5  Save Changes button is inside the Modal.Header', () => {
        const headerStart = SRC.indexOf('Modal.Header');
        const headerEnd   = SRC.indexOf('Modal.Body');
        const saveIdx     = SRC.indexOf('Save Changes');
        expect(saveIdx).toBeGreaterThan(headerStart);
        expect(saveIdx).toBeLessThan(headerEnd);
    });

    test('5.6  Saving spinner shown while saving', () => {
        expect(SRC).toMatch(/Saving…/);
    });
});

// ── 6. Sample download buttons in Invoice BG Image tab ───────────────────────

describe('StoreSettingsModal.js — sample invoice background downloads', () => {
    test('6.1  SampleInvoiceBg1 is imported from INVOICE.jpg', () => {
        expect(SRC).toMatch(/import SampleInvoiceBg1 from ['"].*INVOICE\.jpg['"]/);
    });

    test('6.2  SampleInvoiceBg2 is imported from LGK_WHATSAPP.png', () => {
        expect(SRC).toMatch(/import SampleInvoiceBg2 from ['"].*LGK_WHATSAPP\.png['"]/);
    });

    test('6.3  Sample 1 download anchor uses SampleInvoiceBg1 as href', () => {
        expect(SRC).toMatch(/href=\{SampleInvoiceBg1\}/);
    });

    test('6.4  Sample 2 download anchor uses SampleInvoiceBg2 as href', () => {
        expect(SRC).toMatch(/href=\{SampleInvoiceBg2\}/);
    });

    test('6.5  Sample 1 has download filename ending in .jpg', () => {
        expect(SRC).toMatch(/download=["']sample-invoice-background-1\.jpg["']/);
    });

    test('6.6  Sample 2 has download filename ending in .png', () => {
        expect(SRC).toMatch(/download=["']sample-invoice-background-2\.png["']/);
    });

    test('6.7  download buttons are inside the invoice_background tab', () => {
        const bgTabIdx   = SRC.indexOf("activeTab === 'invoice_background'");
        const hrefIdx    = SRC.indexOf('href={SampleInvoiceBg1}');
        expect(bgTabIdx).toBeGreaterThan(-1);
        expect(hrefIdx).toBeGreaterThan(bgTabIdx);
    });

    test('6.8  bi-download icon is present near the sample section', () => {
        expect(SRC).toMatch(/bi-download/);
    });
});

// ── 7. Logo dropzone no longer in General Info ────────────────────────────────

describe('StoreSettingsModal.js — logo removed from General Info', () => {
    test('7.1  resolveImageUrl(formData.logo …) only appears in the Logo tab section', () => {
        // There should be exactly one call to resolveImageUrl with formData.logo
        const matches = SRC.match(/resolveImageUrl\(\s*formData\.logo/g) || [];
        expect(matches.length).toBe(1);
    });

    test('7.2  the logo ImageDropzone label appears in the Logo tab block', () => {
        const logoTabStart = SRC.indexOf("activeTab === 'logo'");
        const logoTabEnd   = SRC.indexOf("activeTab === 'invoice_background'");
        const labelIdx     = SRC.indexOf("label=\"Logo\"", logoTabStart);
        expect(labelIdx).toBeGreaterThan(logoTabStart);
        expect(labelIdx).toBeLessThan(logoTabEnd);
    });
});
