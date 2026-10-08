/**
 * Source-level tests for the auto-match RFQ list in ExtractModal.
 *
 * When the LLM finds no RFQ ID in the document but auto-matches by supplier phone,
 * the UI should load and display ALL RFQs for that phone so the user can select one.
 */

const fs   = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '../ProcurementWhatsAppTab.js'), 'utf8');

describe('ExtractModal — auto-match RFQ list', () => {
    test('1. autoMatchList and loadingAutoMatch state are declared', () => {
        expect(src).toMatch(/autoMatchList.*setAutoMatchList.*useState\(\[\]\)/);
        expect(src).toMatch(/loadingAutoMatch.*setLoadingAutoMatch.*useState\(false\)/);
    });

    test('2. useEffect fetches supplier RFQs when auto-match fires', () => {
        expect(src).toMatch(/rfq-received\?store_id=.*supplier_phone/);
        expect(src).toMatch(/setAutoMatchList\(d\.items \|\| \[\]\)/);
    });

    test('3. useEffect clears list when result has rfq_code (no auto-match needed)', () => {
        expect(src).toMatch(/result\.rfq_code.*setAutoMatchList\(\[\]\)/);
    });

    test('4. useEffect fires when result or msg.from changes', () => {
        expect(src).toMatch(/\[result.*msg\.from.*storeId.*token\]/);
    });

    test('5. Loading spinner shown while fetching auto-match list', () => {
        expect(src).toMatch(/loadingAutoMatch.*spinner-border/);
    });

    test('6. auto-matched RFQ is visually highlighted in the list', () => {
        expect(src).toMatch(/rfq\.id === result\.suggested_rfq_id/);
        expect(src).toMatch(/auto-matched/);
    });

    test('7. each RFQ row has a View button calling onViewRFQ', () => {
        expect(src).toMatch(/onViewRFQ && onViewRFQ\(rfq\.id\)/);
    });

    test('7b. each RFQ row has an Add Prices button calling handleSelectRFQ', () => {
        expect(src).toMatch(/handleSelectRFQ\(rfq\)/);
    });

    test('8. banner title changed to indicate selection (not just single auto-match)', () => {
        expect(src).toMatch(/No RFQ ID found in document/);
        expect(src).toMatch(/select the matching RFQ from this supplier/);
    });

    test('9. fallback View button shown when autoMatchList is empty', () => {
        expect(src).toMatch(/autoMatchList\.length === 0[\s\S]{0,300}onViewRFQ.*suggested_rfq_id/);
    });

    test('10. product names are shown under each RFQ row (up to 3 + count)', () => {
        expect(src).toMatch(/rfq\.products\.slice\(0, 3\)/);
        expect(src).toMatch(/rfq\.products\.length > 3.*more/);
    });
});
