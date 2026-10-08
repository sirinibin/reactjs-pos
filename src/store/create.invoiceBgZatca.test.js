/**
 * Source-level tests for the invoice background tab, ZATCA reconnect-required
 * banner, save-success flash in header, logo dimension hints, and dynamic
 * ZATCA reporting scope added to create.js (the admin Store form).
 */

const fs   = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
    path.join(__dirname, 'create.js'),
    'utf8'
);

// ── 1. Imports ────────────────────────────────────────────────────────────────

describe('create.js — imports', () => {
    test('1.1  resolveImageUrl is imported from imageUtils', () => {
        expect(SRC).toMatch(/import.*resolveImageUrl.*from.*imageUtils/);
    });
});

// ── 2. Invoice Background tab in NAV_TABS ─────────────────────────────────────

describe('create.js — Invoice Background tab in NAV_TABS', () => {
    test('2.1  invoice_background id is declared in NAV_TABS', () => {
        expect(SRC).toMatch(/id:\s*['"]invoice_background['"]/);
    });

    test('2.2  tab label is present', () => {
        expect(SRC).toMatch(/Invoice B(G Image|ackground)/);
    });

    test('2.3  bi-image icon is used for the tab', () => {
        expect(SRC).toMatch(/bi-image/);
    });
});

// ── 3. Invoice Background tab content ─────────────────────────────────────────

describe('create.js — Invoice Background tab UI', () => {
    test('3.1  tab content renders when activeTab is invoice_background', () => {
        expect(SRC).toMatch(/activeTab\s*===\s*['"]invoice_background['"]/);
    });

    test('3.2  resolveImageUrl is called with formData.invoice_background', () => {
        expect(SRC).toMatch(/resolveImageUrl\(\s*formData\.invoice_background/);
    });

    test('3.3  invoice_background_content field is used for upload preview', () => {
        expect(SRC).toMatch(/formData\.invoice_background_content/);
    });

    test('3.4  file input accepts image/* only', () => {
        expect(SRC).toMatch(/accept=["']image\/\*["']/);
    });

    test('3.5  remove_invoice_background flag is set to true on removal', () => {
        expect(SRC).toMatch(/remove_invoice_background.*true|true.*remove_invoice_background/);
    });

    test('3.6  enlarge hint is present', () => {
        expect(SRC).toMatch(/bi-zoom-in|Enlarge/);
    });

    test('3.7  A4 dimension guidelines are shown', () => {
        expect(SRC).toMatch(/1240.*1754|A4.*150|150.*dpi/i);
    });

    test('3.8  max file-size guidance present', () => {
        expect(SRC).toMatch(/2\s*MB/i);
    });

    test('3.9  PNG format guidance is present', () => {
        expect(SRC).toMatch(/PNG/);
    });
});

// ── 4. Logo dimension hints ───────────────────────────────────────────────────

describe('create.js — logo dimension hints', () => {
    test('4.1  recommended logo dimensions are shown', () => {
        expect(SRC).toMatch(/300.*100|100.*300/);
    });

    test('4.2  transparent PNG is mentioned', () => {
        expect(SRC).toMatch(/transparent.*PNG|PNG.*transparent/i);
    });

    test('4.3  invoice header usage is mentioned', () => {
        expect(SRC).toMatch(/invoice header/i);
    });

    test('4.4  logo size-limit hint is present', () => {
        expect(SRC).toMatch(/500\s*KB/i);
    });
});

// ── 5. ZATCA reporting-scope helper ──────────────────────────────────────────

describe('create.js — createZatcaReportingScope dynamic text', () => {
    test('5.1  createZatcaReportingScope is defined', () => {
        expect(SRC).toMatch(/createZatcaReportingScope/);
    });

    test('5.2  enable_zatca_reporting_for_receivables is read', () => {
        expect(SRC).toMatch(/enable_zatca_reporting_for_receivables/);
    });

    test('5.3  enable_zatca_reporting_for_payables is read', () => {
        expect(SRC).toMatch(/enable_zatca_reporting_for_payables/);
    });

    test('5.4  "receivables" is conditionally pushed', () => {
        expect(SRC).toMatch(/push\(\s*['"]receivables['"]\s*\)/);
    });

    test('5.5  "payables" is conditionally pushed', () => {
        expect(SRC).toMatch(/push\(\s*['"]payables['"]\s*\)/);
    });

    test('5.6  createZatcaReportingScope() is called at least twice (General + Address warning banners)', () => {
        const matches = SRC.match(/createZatcaReportingScope\(\)/g) || [];
        expect(matches.length).toBeGreaterThanOrEqual(2);
    });
});

// ── 6. ZATCA reconnect-required persistent banner ─────────────────────────────

describe('create.js — ZATCA reconnect-required banner', () => {
    test('6.1  zatca_reconnect_required is checked', () => {
        expect(SRC).toMatch(/zatca_reconnect_required/);
    });

    test('6.2  "ZATCA Reconnection Required" heading is in the banner', () => {
        expect(SRC).toMatch(/ZATCA Reconnection Required/);
    });

    test('6.3  banner is shown outside any tab condition (persistent across all tabs)', () => {
        // The banner must appear BEFORE the first activeTab === 'general' check
        // so it's shown on every tab, not hidden inside one tab's block.
        const bannerIdx = SRC.indexOf('ZATCA Reconnection Required');
        const generalTabIdx = SRC.indexOf("activeTab === 'general'");
        expect(bannerIdx).toBeGreaterThan(-1);
        expect(generalTabIdx).toBeGreaterThan(-1);
        expect(bannerIdx).toBeLessThan(generalTabIdx);
    });

    test('6.4  Reconnect button calls zatcaConnectRef.current.open', () => {
        expect(SRC).toMatch(/zatcaConnectRef\.current.*open/);
    });

    test('6.5  createZatcaReportingScope() used inside the reconnect banner', () => {
        // All three usages: banner + general advisory + address advisory
        const matches = SRC.match(/createZatcaReportingScope\(\)/g) || [];
        expect(matches.length).toBeGreaterThanOrEqual(3);
    });
});

// ── 7. ZATCA field-change advisory banners (yellow) ──────────────────────────

describe('create.js — ZATCA field-change advisory banners', () => {
    test('7.1  General Info tab shows ZATCA re-connection advisory for Phase 2', () => {
        expect(SRC).toMatch(/ZATCA Re-Connection Required/);
    });

    test('7.2  National Address tab also shows the advisory', () => {
        const matches = SRC.match(/ZATCA Re-Connection Required/g) || [];
        expect(matches.length).toBeGreaterThanOrEqual(2);
    });
});

// ── 8. Save-success flash in header ──────────────────────────────────────────

describe('create.js — save-success flash pill in header', () => {
    test('8.1  flash.type === success is checked for header display', () => {
        expect(SRC).toMatch(/flash.*type.*===.*['"]success['"]|['"]success['"].*===.*flash.*type/);
    });

    test('8.2  success flash pill appears inside the header section', () => {
        // create.js has TWO occurrences of flash.type === 'success':
        //   1. The existing fixed top-right overlay (before Modal.Header)
        //   2. The new inline header pill (between Modal.Header and Modal.Body)
        // Verify at least 2 occurrences exist and one is in the header zone.
        const headerIdx = SRC.indexOf('Modal.Header');
        const bodyIdx   = SRC.indexOf('Modal.Body');
        expect(headerIdx).toBeGreaterThan(-1);
        expect(bodyIdx).toBeGreaterThan(headerIdx);

        const NEEDLE = "flash.type === 'success'";
        const allOccurrences = [];
        let searchFrom = 0;
        let idx;
        while ((idx = SRC.indexOf(NEEDLE, searchFrom)) !== -1) {
            allOccurrences.push(idx);
            searchFrom = idx + 1;
        }
        // Must appear at least twice
        expect(allOccurrences.length).toBeGreaterThanOrEqual(2);
        // At least one occurrence must fall between Modal.Header and Modal.Body
        const inHeader = allOccurrences.some(i => i > headerIdx && i < bodyIdx);
        expect(inHeader).toBe(true);
    });

    test('8.3  check-circle-fill icon is used for success pill', () => {
        expect(SRC).toMatch(/bi-check-circle-fill/);
    });
});
