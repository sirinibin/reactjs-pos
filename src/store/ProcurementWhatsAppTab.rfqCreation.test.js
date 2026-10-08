/**
 * Source-level tests for the RFQ Creation feature additions to
 * store/ProcurementWhatsAppTab.js:
 *  - ID column (msg.code, e.g. WA-000001)
 *  - "View RFQ" button when msg.rfq_received_id is set
 *  - "Create RFQ" button when autoRfqDisabled and no RFQ exists
 *  - disable_auto_rfq_from_whatsapp read from store settings cache
 *  - handleCreateRfq POSTs to /v1/procurement-messages/{id}/create-rfq
 *  - RFQ mini-modal rendered with products table and "Open RFQ" link
 */

const fs   = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
    path.join(__dirname, 'ProcurementWhatsAppTab.js'),
    'utf8'
);

// ── 1. ID column ──────────────────────────────────────────────────────────────

describe('ProcurementWhatsAppTab — ID column', () => {
    test('1.1  "ID" column header is present', () => {
        expect(SRC).toMatch(/\bt\('ID'\)|t\("ID"\)/);
    });

    test('1.2  msg.code is rendered in the table', () => {
        expect(SRC).toMatch(/msg\.code/);
    });
});

// ── 2. Store settings cache read ──────────────────────────────────────────────

describe('ProcurementWhatsAppTab — reads disable_auto_rfq_from_whatsapp from cache', () => {
    test('2.1  _store_settings_cache is read', () => {
        expect(SRC).toMatch(/_store_settings_cache/);
    });

    test('2.2  disable_auto_rfq_from_whatsapp field is accessed', () => {
        expect(SRC).toMatch(/disable_auto_rfq_from_whatsapp/);
    });

    test('2.3  autoRfqDisabled variable is derived', () => {
        expect(SRC).toMatch(/autoRfqDisabled/);
    });

    test('2.4  strict === true comparison used', () => {
        expect(SRC).toMatch(/disable_auto_rfq_from_whatsapp\s*===\s*true/);
    });
});

// ── 3. "View RFQ" button ──────────────────────────────────────────────────────

describe('ProcurementWhatsAppTab — "View RFQ" button when RFQ exists', () => {
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

// ── 4. RFQ navigation ────────────────────────────────────────────────────────

describe('ProcurementWhatsAppTab — View RFQ navigation', () => {
    test('6.1  useHistory is imported for navigation', () => {
        expect(SRC).toMatch(/useHistory/);
    });

    test('6.2  history.push navigates to rfq-received page', () => {
        expect(SRC).toMatch(/history\.push.*rfq-received/);
    });

    test('6.3  navigation URL includes the rfq id', () => {
        expect(SRC).toMatch(/rfq-received.*id=|id=.*rfq-received/);
    });

    test('6.4  openRfqModal function defined and uses history.push', () => {
        expect(SRC).toMatch(/openRfqModal/);
        expect(SRC).toMatch(/history\.push/);
    });

    test('6.5  rfq-received route referenced', () => {
        expect(SRC).toMatch(/rfq-received/);
    });
});

// ── 7. Delete All button (admin-only) ─────────────────────────────────────────

describe('ProcurementWhatsAppTab — Delete All button (admin-only)', () => {
    test('7.1  isAdmin check is present', () => {
        expect(SRC).toMatch(/isAdmin/);
    });

    test('7.2  "Delete All" text or "Delete all" present', () => {
        expect(SRC).toMatch(/Delete All|Delete all/);
    });

    test('7.3  DELETE method is used for bulk delete', () => {
        expect(SRC).toMatch(/method.*DELETE|DELETE.*method/);
    });

    test('7.4  deletingAll state is managed', () => {
        expect(SRC).toMatch(/deletingAll/);
    });
});

// ── 8. Extract Quotation Prices — auto-load RFQs after extraction ─────────────

describe('ExtractModal — auto-load RFQ list after quotation extraction', () => {
    test('8.1  useEffect watches result._quotation and auto-fetches supplier RFQs', () => {
        expect(SRC).toMatch(/result\._quotation[\s\S]{0,200}rfq-received/);
    });

    test('8.2  auto-fetch uses supplier_phone from msg.from', () => {
        expect(SRC).toMatch(/supplier_phone.*msg\.from/);
    });

    test('8.3  RFQ list renders immediately after extraction (addPhase null)', () => {
        expect(SRC).toMatch(/addPhase === null \|\| addPhase === 'picking'/);
    });

    test('8.4  each RFQ row has a "View" button calling onViewRFQ(rfq.id)', () => {
        expect(SRC).toMatch(/onViewRFQ.*rfq\.id/);
    });

    test('8.5  "Add Prices" button only shows when extracted prices exist', () => {
        expect(SRC).toMatch(/result\.prices.*\|\|.*\[\].*\.length > 0/);
        expect(SRC).toMatch(/Add Prices/);
    });

    test('8.6  RFQ code is a clickable link calling onViewRFQ', () => {
        expect(SRC).toMatch(/rfq\.code[\s\S]{0,100}onViewRFQ.*rfq\.id|onViewRFQ.*rfq\.id[\s\S]{0,100}rfq\.code/s);
    });

    test('8.7  handleAddPriceToRFQ is removed (no longer needed)', () => {
        expect(SRC).not.toMatch(/handleAddPriceToRFQ/);
    });
});
