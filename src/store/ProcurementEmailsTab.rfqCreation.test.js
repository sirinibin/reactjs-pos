/**
 * Source-level tests for the RFQ feature additions to
 * store/ProcurementEmailsTab.js:
 *  - ID column (msg.code, e.g. EM-000001)
 *  - "View RFQ" button when msg.rfq_received_id is set
 *  - disable_auto_rfq_from_email read from store settings cache
 *  - RFQ navigation (history.push to rfq-received page)
 */

const fs   = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
    path.join(__dirname, 'ProcurementEmailsTab.js'),
    'utf8'
);

// ── 1. ID column ──────────────────────────────────────────────────────────────

describe('ProcurementEmailsTab — ID column', () => {
    test('1.1  "ID" column header is present', () => {
        expect(SRC).toMatch(/\bt\('ID'\)|t\("ID"\)/);
    });

    test('1.2  msg.code is rendered in the table', () => {
        expect(SRC).toMatch(/msg\.code/);
    });

    test('1.3  EM-000001 format hint present (code field name in context)', () => {
        // The code column renders msg.code which holds EM-000001 / WA-000001 values.
        expect(SRC).toMatch(/msg\.code/);
    });
});

// ── 2. Store settings cache read ──────────────────────────────────────────────

describe('ProcurementEmailsTab — reads disable_auto_rfq_from_email from cache', () => {
    test('2.1  _store_settings_cache is read', () => {
        expect(SRC).toMatch(/_store_settings_cache/);
    });

    test('2.2  disable_auto_rfq_from_email is accessed', () => {
        expect(SRC).toMatch(/disable_auto_rfq_from_email/);
    });

    test('2.3  autoRfqDisabled variable is derived from the setting', () => {
        expect(SRC).toMatch(/autoRfqDisabled/);
    });

    test('2.4  setting uses === true comparison (strict, not truthy)', () => {
        expect(SRC).toMatch(/disable_auto_rfq_from_email\s*===\s*true/);
    });
});

// ── 3. "View RFQ" button ──────────────────────────────────────────────────────

describe('ProcurementEmailsTab — "View RFQ" button when RFQ exists', () => {
    test('3.1  "View RFQ" text is present', () => {
        expect(SRC).toMatch(/View RFQ/);
    });

    test('3.2  rfq_received_id condition gates the View RFQ button', () => {
        expect(SRC).toMatch(/msg\.rfq_received_id/);
    });

    test('3.3  openRfqModal is called with rfq_received_id', () => {
        expect(SRC).toMatch(/openRfqModal\(msg\.rfq_received_id/);
    });
});

// ── 4. "View RFQ" navigation ─────────────────────────────────────────────────

describe('ProcurementEmailsTab — View RFQ navigation', () => {
    test('6.1  useHistory is imported for navigation', () => {
        expect(SRC).toMatch(/useHistory/);
    });

    test('6.2  history.push navigates to rfq-received page', () => {
        expect(SRC).toMatch(/history\.push.*rfq-received/);
    });

    test('6.3  navigation URL includes the rfq id', () => {
        expect(SRC).toMatch(/rfq-received.*id=|id=.*rfq-received/);
    });
});
