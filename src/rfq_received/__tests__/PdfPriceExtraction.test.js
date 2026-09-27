/**
 * Tests for the PDF price extraction flow:
 *
 * 1. Backend prompt uses 0-based product numbering ("index N: Name")
 * 2. Frontend matching: byPart, byIdx (0-based), byPos (positional), prices.length===1
 * 3. Part-number matching: exact, product_name contains part_no, substring fallback
 * 4. ForwardDetail accepts initialTab and initialAddFile props
 * 5. PriceComparisonTable accepts initialAddFile prop and opens the add panel
 * 6. EmailDetailModal has "Extract Prices" button on PDF attachments
 * 7. ProcurementEmailConversationTab has "Extract Prices" button on PDF attachments
 */

const fs   = require('fs');
const path = require('path');

const rfqSrc     = fs.readFileSync(path.join(__dirname, '../index.js'), 'utf8');
const emailModal = fs.readFileSync(
    path.join(__dirname, '../../store/EmailDetailModal.js'), 'utf8'
);
const emailConv  = fs.readFileSync(
    path.join(__dirname, '../../store/ProcurementEmailConversationTab.js'), 'utf8'
);

// ── Backend product list format ───────────────────────────────────────────────

describe('backend rfq_bot.go — 0-based product list', () => {
    let botSrc;
    beforeAll(() => {
        botSrc = fs.readFileSync(
            path.join(__dirname, '../../../../backend/controller/rfq_bot.go'), 'utf8'
        );
    });

    test('1. product list uses "index N:" not "N." (0-based numbering)', () => {
        // Should have `index %d:` format, not `%d.` for the product context
        expect(botSrc).toMatch(/Sprintf\("index %d:.*i,/s);
    });

    test('2. product list does NOT use i+1 (old 1-based)', () => {
        // The product list line should no longer have i+1
        const productContextLine = botSrc.match(/productContext\.WriteString.*Sprintf.*"index/)?.[0] || '';
        expect(productContextLine).not.toMatch(/i\+1/);
    });
});

// ── Frontend matching logic ───────────────────────────────────────────────────

describe('frontend rfq_received/index.js — price matching', () => {
    test('3. byIdx checks p.product_index === i (0-based)', () => {
        expect(rfqSrc).toMatch(/byIdx\s*=\s*prices\.find\(p => p\.product_index === i\)/);
    });

    test('4. byPos positional fallback exists when prices.length === products.length', () => {
        expect(rfqSrc).toMatch(/byPos\s*=\s*prices\.length === products\.length \? prices\[i\] : null/);
    });

    test('5. match uses byPart || byIdx || byPos || single-price fallback', () => {
        expect(rfqSrc).toMatch(/match\s*=\s*byPart \|\| byIdx \|\| byPos \|\| \(prices\.length === 1/);
    });

    test('6. byPart checks supplier part_no against product name (key fix for internal-code mismatch)', () => {
        // LLM extracts "FC5723" but RFQ part_no is "FD-EQPFILTERS-025"; the name contains "FC-5723"
        expect(rfqSrc).toMatch(/nameNorm\.includes\(pnoNorm\)/);
    });

    test('6b. byPart scans product_name tokens when part_no is empty (e.g. "FC5723 FUEL FILTER" with no part_no)', () => {
        // LLM may put the part number only in product_name, not in part_no
        expect(rfqSrc).toMatch(/pnTokens.*product_name.*split/s);
        expect(rfqSrc).toMatch(/nameNorm\.includes\(norm\(tok\)\)/);
    });
});

// ── ForwardDetail props ───────────────────────────────────────────────────────

describe('ForwardDetail — initialTab and initialAddFile props', () => {
    test('7. ForwardDetail accepts initialTab prop', () => {
        expect(rfqSrc).toMatch(/ForwardDetail\(\{[^}]*initialTab[^}]*\}/s);
    });

    test('8. ForwardDetail accepts initialAddFile prop', () => {
        expect(rfqSrc).toMatch(/ForwardDetail\(\{[^}]*initialAddFile[^}]*\}/s);
    });

    test('9. initialTab triggers setActiveTab via useEffect', () => {
        expect(rfqSrc).toMatch(/if \(initialTab\) setActiveTab\(initialTab\)/);
    });

    test('10. PriceComparisonTable receives initialAddFile from ForwardDetail', () => {
        expect(rfqSrc).toMatch(/PriceComparisonTable[\s\S]{0,400}initialAddFile=\{initialAddFile\}/);
    });
});

// ── PriceComparisonTable initialAddFile ──────────────────────────────────────

describe('PriceComparisonTable — initialAddFile auto-opens add panel', () => {
    test('11. PriceComparisonTable accepts initialAddFile prop', () => {
        expect(rfqSrc).toMatch(/PriceComparisonTable\(\{[^}]*initialAddFile[^}]*\}/s);
    });

    test('12. useEffect sets addFiles and showAddReply when initialAddFile is set', () => {
        expect(rfqSrc).toMatch(/if \(initialAddFile\)[\s\S]{0,200}setAddFiles\(\[initialAddFile\]\)/);
        expect(rfqSrc).toMatch(/if \(initialAddFile\)[\s\S]{0,200}setShowAddReply\(true\)/);
    });
});

// ── EmailDetailModal — Extract Prices button ──────────────────────────────────

describe('EmailDetailModal — Extract Prices button on PDF attachments', () => {
    test('13. handleExtractPricesFromAtt function is defined', () => {
        expect(emailModal).toMatch(/handleExtractPricesFromAtt/);
    });

    test('14. button is rendered only for PDF attachments', () => {
        expect(emailModal).toMatch(/isPDF.*hasLinkedRfq.*att\.url[\s\S]{0,600}Extract Prices/s);
    });

    test('15. ForwardDetail receives initialTab and initialAddFile props', () => {
        expect(emailModal).toMatch(/ForwardDetail[\s\S]{0,300}initialTab=\{rfqInitialTab\}/s);
        expect(emailModal).toMatch(/ForwardDetail[\s\S]{0,300}initialAddFile=\{rfqInitialFile\}/s);
    });

    test('16. close handler resets rfqInitialTab and rfqInitialFile', () => {
        expect(emailModal).toMatch(/setRfqInitialTab\(null\)/);
        expect(emailModal).toMatch(/setRfqInitialFile\(null\)/);
    });
});

// ── ProcurementEmailConversationTab — Extract Prices button ──────────────────

describe('ProcurementEmailConversationTab — Extract Prices button in message bubbles', () => {
    test('17. handleExtractPricesFromAtt function is defined', () => {
        expect(emailConv).toMatch(/handleExtractPricesFromAtt/);
    });

    test('18. button renders for PDF attachments with rfq_received_id', () => {
        expect(emailConv).toMatch(/isPDF.*msg\?\.rfq_received_id.*att\.url[\s\S]{0,600}bi-magic/s);
    });

    test('19. ForwardDetail receives initialTab and initialAddFile props', () => {
        expect(emailConv).toMatch(/ForwardDetail[\s\S]{0,400}initialTab=\{rfqDetailInitialTab\}/s);
        expect(emailConv).toMatch(/ForwardDetail[\s\S]{0,400}initialAddFile=\{rfqDetailInitialFile\}/s);
    });

    test('20. close handler resets rfqDetailInitialTab and rfqDetailInitialFile', () => {
        expect(emailConv).toMatch(/setRfqDetailInitialTab\(null\)/);
        expect(emailConv).toMatch(/setRfqDetailInitialFile\(null\)/);
    });
});
