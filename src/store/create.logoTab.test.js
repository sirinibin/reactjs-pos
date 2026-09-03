/**
 * Source-level tests for changes introduced to create.js (Store form):
 *  - Logo tab added to NAV_TABS
 *  - Logo dropzone moved from General Info to Logo tab
 *  - ERROR_TAB_MAP routes logo_content errors to 'logo' tab
 *  - Logo onRemove sets remove_logo: true + clears logo and logo_content
 *  - ImageDropzone Remove button asks window.confirm before calling onRemove
 *  - Header "Update" button renamed to "Save Changes"
 *  - Sample download buttons added to Invoice BG Image tab
 */

const fs   = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
    path.join(__dirname, 'create.js'),
    'utf8'
);

// ── 1. Logo tab in NAV_TABS ───────────────────────────────────────────────────

describe('create.js — Logo tab in NAV_TABS', () => {
    test('1.1  id "logo" is declared in NAV_TABS', () => {
        expect(SRC).toMatch(/id:\s*['"]logo['"]/);
    });

    test('1.2  tab label is "Logo"', () => {
        expect(SRC).toMatch(/label:\s*['"]Logo['"]/);
    });

    test('1.3  bi-image-fill icon is used for the Logo tab', () => {
        expect(SRC).toMatch(/bi-image-fill/);
    });

    test('1.4  Logo tab appears before invoice_background in NAV_TABS', () => {
        // Find the NAV_TABS array section specifically
        const navTabsIdx  = SRC.indexOf('const NAV_TABS');
        const logoIdx     = SRC.indexOf("id: 'logo'", navTabsIdx);
        const bgIdx       = SRC.indexOf("id: 'invoice_background'", navTabsIdx);
        expect(logoIdx).toBeGreaterThan(navTabsIdx);
        expect(bgIdx).toBeGreaterThan(logoIdx);
    });
});

// ── 2. ERROR_TAB_MAP routes logo_content to Logo tab ─────────────────────────

describe('create.js — ERROR_TAB_MAP for logo_content', () => {
    test('2.1  logo_content is mapped to the "logo" tab', () => {
        expect(SRC).toMatch(/logo_content:\s*['"]logo['"]/);
    });

    test('2.2  logo_content is NOT mapped to "general"', () => {
        expect(SRC).not.toMatch(/logo_content:\s*['"]general['"]/);
    });
});

// ── 3. Logo tab content ───────────────────────────────────────────────────────

describe('create.js — Logo tab content', () => {
    test('3.1  tab content renders when activeTab === "logo"', () => {
        expect(SRC).toMatch(/activeTab\s*===\s*['"]logo['"]/);
    });

    test('3.2  resolveImageUrl is called with formData.logo for Logo currentSrc', () => {
        expect(SRC).toMatch(/resolveImageUrl\(\s*formData\.logo/);
    });

    test('3.3  Logo guidelines info box is shown in Logo tab', () => {
        expect(SRC).toMatch(/Logo Guidelines/);
    });

    test('3.4  logo hint mentions recommended 300×100 px', () => {
        expect(SRC).toMatch(/300.*100|100.*300/);
    });

    test('3.5  logo hint mentions transparent PNG', () => {
        expect(SRC).toMatch(/transparent.*PNG|PNG.*transparent/i);
    });

    test('3.6  logo hint mentions invoice header', () => {
        expect(SRC).toMatch(/invoice header/i);
    });

    test('3.7  logo hint mentions 500 KB size limit', () => {
        expect(SRC).toMatch(/500\s*KB/i);
    });

    test('3.8  errors.logo_content is rendered inside the Logo tab', () => {
        const logoTabStart = SRC.indexOf("activeTab === 'logo'");
        const logoTabEnd   = SRC.indexOf("activeTab === 'invoice_background'");
        const errIdx       = SRC.indexOf('errors.logo_content', logoTabStart);
        expect(errIdx).toBeGreaterThan(logoTabStart);
        expect(errIdx).toBeLessThan(logoTabEnd);
    });
});

// ── 4. Logo onRemove — clears logo, logo_content, sets remove_logo ────────────

describe('create.js — Logo onRemove sets remove_logo', () => {
    test('4.1  remove_logo is set to true on logo removal', () => {
        expect(SRC).toMatch(/remove_logo\s*=\s*true/);
    });

    test('4.2  formData.logo is cleared on removal', () => {
        expect(SRC).toMatch(/formData\.logo\s*=\s*['"]{2}/);
    });

    test('4.3  formData.logo_content is cleared on removal', () => {
        expect(SRC).toMatch(/formData\.logo_content\s*=\s*['"]{2}/);
    });

    test('4.4  formData.remove_logo is set to true on removal', () => {
        expect(SRC).toMatch(/formData\.remove_logo\s*=\s*true/);
    });

    test('4.5  all three assignments appear together in one onRemove handler', () => {
        // Find the onRemove in the Logo tab that sets all three
        const matches = SRC.match(/onRemove=\{[^}]*remove_logo[^}]*\}/g) || [];
        expect(matches.length).toBeGreaterThanOrEqual(1);
        const logoRemove = matches.find(m => m.includes('logo_content'));
        expect(logoRemove).toBeDefined();
    });
});

// ── 5. ImageDropzone — window.confirm before Remove ──────────────────────────

describe('create.js — ImageDropzone confirm prompt', () => {
    test('5.1  window.confirm is called in the Remove button handler', () => {
        expect(SRC).toMatch(/window\.confirm/);
    });

    test('5.2  confirm message references the image label', () => {
        expect(SRC).toMatch(/window\.confirm\(`Remove this \$\{label\}/);
    });

    test('5.3  confirm message mentions deletion happens on save', () => {
        expect(SRC).toMatch(/delete it when you save/);
    });

    test('5.4  guard uses negated confirm result', () => {
        expect(SRC).toMatch(/if\s*\(\s*!window\.confirm/);
    });

    test('5.5  early return follows the confirm guard', () => {
        const guardIdx  = SRC.indexOf('!window.confirm');
        const returnIdx = SRC.indexOf('return;', guardIdx);
        expect(guardIdx).toBeGreaterThan(-1);
        expect(returnIdx).toBeGreaterThan(guardIdx);
        expect(returnIdx - guardIdx).toBeLessThan(100);
    });
});

// ── 6. "Save Changes" in header button ───────────────────────────────────────

describe('create.js — Save Changes button label in header', () => {
    test('6.1  "Save Changes" text is present', () => {
        expect(SRC).toMatch(/Save Changes/);
    });

    test('6.2  Save Changes is the label when formData.id exists', () => {
        expect(SRC).toMatch(/formData\.id\s*\?\s*['"]Save Changes['"]/);
    });

    test('6.3  "Create" label is used for new stores', () => {
        expect(SRC).toMatch(/['"]Save Changes['"]\s*:\s*['"]Create['"]/);
    });
});

// ── 7. Sample download buttons in Invoice BG Image tab ───────────────────────

describe('create.js — sample invoice background downloads', () => {
    test('7.1  SampleInvoiceBg1 is imported from INVOICE.jpg', () => {
        expect(SRC).toMatch(/import SampleInvoiceBg1 from ['"].*INVOICE\.jpg['"]/);
    });

    test('7.2  SampleInvoiceBg2 is imported from LGK_WHATSAPP.png', () => {
        expect(SRC).toMatch(/import SampleInvoiceBg2 from ['"].*LGK_WHATSAPP\.png['"]/);
    });

    test('7.3  Sample 1 download anchor uses SampleInvoiceBg1 as href', () => {
        expect(SRC).toMatch(/href=\{SampleInvoiceBg1\}/);
    });

    test('7.4  Sample 2 download anchor uses SampleInvoiceBg2 as href', () => {
        expect(SRC).toMatch(/href=\{SampleInvoiceBg2\}/);
    });

    test('7.5  Sample 1 has download filename ending in .jpg', () => {
        expect(SRC).toMatch(/download=["']sample-invoice-background-1\.jpg["']/);
    });

    test('7.6  Sample 2 has download filename ending in .png', () => {
        expect(SRC).toMatch(/download=["']sample-invoice-background-2\.png["']/);
    });

    test('7.7  download buttons are inside the invoice_background tab', () => {
        const bgTabIdx   = SRC.indexOf("activeTab === 'invoice_background'");
        const sample1Idx = SRC.indexOf('SampleInvoiceBg1', bgTabIdx);
        expect(bgTabIdx).toBeGreaterThan(-1);
        expect(sample1Idx).toBeGreaterThan(bgTabIdx);
    });
});

// ── 8. Logo dropzone no longer in General Info ────────────────────────────────

describe('create.js — logo removed from General Info tab', () => {
    test('8.1  resolveImageUrl(formData.logo …) only appears in the Logo tab section', () => {
        const matches = SRC.match(/resolveImageUrl\(\s*formData\.logo/g) || [];
        expect(matches.length).toBe(1);
    });

    test('8.2  the Logo ImageDropzone is inside the Logo tab block', () => {
        const logoTabStart = SRC.indexOf("activeTab === 'logo'");
        const logoTabEnd   = SRC.indexOf("activeTab === 'invoice_background'");
        const dropzoneIdx  = SRC.indexOf("label=\"Logo\"", logoTabStart);
        expect(dropzoneIdx).toBeGreaterThan(logoTabStart);
        expect(dropzoneIdx).toBeLessThan(logoTabEnd);
    });
});
