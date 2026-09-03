/**
 * Source-level tests for the invoice background feature and related changes
 * added to StoreSettingsModal.js.
 *
 * Full render tests would require mocking Bootstrap Modal, Typeahead,
 * ZatcaConnect, and several API calls. These tests verify the structural
 * changes at the source level — the same pattern used elsewhere in this
 * codebase.
 */

const fs   = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
    path.join(__dirname, 'StoreSettingsModal.js'),
    'utf8'
);

// ── 1. Imports ────────────────────────────────────────────────────────────────

describe('StoreSettingsModal — imports', () => {
    test('1.1  resolveImageUrl is imported from imageUtils', () => {
        expect(SRC).toMatch(/import.*resolveImageUrl.*from.*imageUtils/);
    });
});

// ── 2. Invoice Background tab ─────────────────────────────────────────────────

describe('StoreSettingsModal — Invoice Background tab in TABS array', () => {
    test('2.1  invoice_background id is in TABS', () => {
        expect(SRC).toMatch(/id:\s*['"]invoice_background['"]/);
    });

    test('2.2  tab label is present', () => {
        // either "Invoice BG Image" or "Invoice Background"
        expect(SRC).toMatch(/Invoice B(G Image|ackground)/);
    });

    test('2.3  tab icon uses bi-image', () => {
        expect(SRC).toMatch(/bi-image/);
    });
});

// ── 3. Invoice Background tab content ─────────────────────────────────────────

describe('StoreSettingsModal — Invoice Background tab UI', () => {
    test('3.1  tab content is rendered when activeTab === invoice_background', () => {
        expect(SRC).toMatch(/activeTab\s*===\s*['"]invoice_background['"]/);
    });

    test('3.2  resolveImageUrl is called with invoice_background and store id', () => {
        expect(SRC).toMatch(/resolveImageUrl\(\s*formData\.invoice_background/);
    });

    test('3.3  invoice_background_content field is used for preview of new upload', () => {
        expect(SRC).toMatch(/formData\.invoice_background_content/);
    });

    test('3.4  file input accepts image types only', () => {
        // The invoice_background upload input must restrict to image/*
        expect(SRC).toMatch(/accept=["']image\/\*["']/);
    });

    test('3.5  remove_invoice_background flag is set when removing', () => {
        expect(SRC).toMatch(/remove_invoice_background.*true|true.*remove_invoice_background/);
    });

    test('3.6  enlarge / zoom hint is shown for existing image', () => {
        expect(SRC).toMatch(/bi-zoom-in|Enlarge/);
    });

    test('3.7  dimension guidelines are displayed (recommended size)', () => {
        // Must mention A4 dimensions or dpi guidance
        expect(SRC).toMatch(/1240.*1754|A4.*150|150.*dpi/i);
    });

    test('3.8  max file-size guidance is present', () => {
        expect(SRC).toMatch(/2\s*MB/i);
    });

    test('3.9  PNG format guidance is present', () => {
        expect(SRC).toMatch(/PNG/);
    });
});

// ── 4. Logo dimension hints ───────────────────────────────────────────────────

describe('StoreSettingsModal — logo dimension hints', () => {
    test('4.1  recommended logo dimensions are shown', () => {
        expect(SRC).toMatch(/300.*100|100.*300/);
    });

    test('4.2  transparent PNG hint is present', () => {
        expect(SRC).toMatch(/transparent.*PNG|PNG.*transparent/i);
    });

    test('4.3  invoice header usage context is mentioned', () => {
        expect(SRC).toMatch(/invoice header/i);
    });

    test('4.4  logo file-size hint is present', () => {
        expect(SRC).toMatch(/500\s*KB/i);
    });
});

// ── 5. ZATCA reporting-scope function ─────────────────────────────────────────

describe('StoreSettingsModal — zatcaReportingScope dynamic text', () => {
    test('5.1  zatcaReportingScope function is defined', () => {
        expect(SRC).toMatch(/function zatcaReportingScope/);
    });

    test('5.2  enable_zatca_reporting_for_receivables is checked', () => {
        expect(SRC).toMatch(/enable_zatca_reporting_for_receivables/);
    });

    test('5.3  enable_zatca_reporting_for_payables is checked', () => {
        expect(SRC).toMatch(/enable_zatca_reporting_for_payables/);
    });

    test('5.4  "receivables" is conditionally pushed', () => {
        expect(SRC).toMatch(/push\(\s*['"]receivables['"]\s*\)/);
    });

    test('5.5  "payables" is conditionally pushed', () => {
        expect(SRC).toMatch(/push\(\s*['"]payables['"]\s*\)/);
    });

    test('5.6  zatcaReportingScope() is called in the reconnect-required banner', () => {
        expect(SRC).toMatch(/zatcaReportingScope\(\)/);
    });

    test('5.7  zatcaReportingScope() is called in the General Info ZATCA warning', () => {
        // Must appear at least twice: once for the reconnect banner, twice for the two yellow warning banners
        const matches = SRC.match(/zatcaReportingScope\(\)/g) || [];
        expect(matches.length).toBeGreaterThanOrEqual(2);
    });
});

// ── 6. ZATCA reconnect-required banner (already existed, now scope-aware) ─────

describe('StoreSettingsModal — ZATCA reconnect-required banner', () => {
    test('6.1  reconnectRequired is derived from zatca.zatca_reconnect_required', () => {
        expect(SRC).toMatch(/zatca_reconnect_required/);
    });

    test('6.2  banner is conditionally rendered based on reconnectRequired', () => {
        expect(SRC).toMatch(/reconnectRequired/);
    });

    test('6.3  "ZATCA Reconnection Required" heading is shown in the banner', () => {
        expect(SRC).toMatch(/ZATCA Reconnection Required/);
    });

    test('6.4  Reconnect button calls zatcaConnectRef.current.open', () => {
        expect(SRC).toMatch(/zatcaConnectRef\.current.*open|open.*zatcaConnectRef\.current/);
    });
});

// ── 7. Save flash in header (success type) ────────────────────────────────────

describe('StoreSettingsModal — save-success flash in header', () => {
    test('7.1  flash.type === success is checked for header display', () => {
        expect(SRC).toMatch(/flash.*type.*===.*['"]success['"]|['"]success['"].*===.*flash.*type/);
    });

    test('7.2  success flash is rendered in the Modal.Header section before Modal.Body', () => {
        const headerIdx  = SRC.indexOf('Modal.Header');
        const bodyIdx    = SRC.indexOf('Modal.Body');
        const successIdx = SRC.indexOf("flash.type === 'success'");
        expect(headerIdx).toBeGreaterThan(-1);
        expect(bodyIdx).toBeGreaterThan(-1);
        expect(successIdx).toBeGreaterThan(-1);
        // The first occurrence of the success check must come before Modal.Body
        expect(successIdx).toBeLessThan(bodyIdx);
    });

    test('7.3  error flash (non-success) remains in Modal.Footer area', () => {
        const footerIdx   = SRC.indexOf('Modal.Footer');
        const nonSuccIdx  = SRC.indexOf("flash.type !== 'success'");
        expect(footerIdx).toBeGreaterThan(-1);
        expect(nonSuccIdx).toBeGreaterThan(-1);
        expect(nonSuccIdx).toBeGreaterThan(footerIdx);
    });
});

// ── 8. ZATCA yellow warning banners (field-change advisory) ───────────────────

describe('StoreSettingsModal — ZATCA field-change warning banners', () => {
    test('8.1  General Info tab shows ZATCA warning when isPhase2', () => {
        expect(SRC).toMatch(/isPhase2.*ZATCA Re-Connection Required|ZATCA Re-Connection Required.*isPhase2/s);
    });

    test('8.2  National Address tab also shows ZATCA warning when isPhase2', () => {
        // There should be at least two occurrences of the "ZATCA Re-Connection Required" string
        const matches = SRC.match(/ZATCA Re-Connection Required/g) || [];
        expect(matches.length).toBeGreaterThanOrEqual(2);
    });
});
