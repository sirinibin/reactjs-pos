/**
 * Tests the vendor lookup logic in handleCreatePurchase (PurchaseBillsTab.js).
 *
 * Root cause that prompted this: the /v1/vendor/vat_no/name backend endpoint
 * queries MongoDB with { name, vat_no, store_id } — it requires BOTH fields.
 * The old code only sent vat_no in the URL, so name was "" and the query never
 * matched. The vendor was not found, a duplicate create was attempted, the
 * server returned 409, and the retry had the same bug — leaving vendorObj null.
 *
 * Fix: include &name=<companyName> in both the initial VAT lookup and the
 * post-409 retry. These tests lock that behavior in.
 */

// ── minimal mock set so the module loads ──────────────────────────────────────
jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (k) => k }),
    withTranslation: () => (C) => C,
    Trans: ({ children }) => children,
}));
jest.mock('react-bootstrap', () => ({
    Spinner: () => null,
    Button: ({ children, onClick }) => <button onClick={onClick}>{children}</button>,
    Modal: ({ show, children }) => (show ? <div>{children}</div> : null),
    Badge: ({ children }) => <span>{children}</span>,
    Row: ({ children }) => <div>{children}</div>,
    Col: ({ children }) => <div>{children}</div>,
    Form: ({ children }) => <form>{children}</form>,
    Card: ({ children }) => <div>{children}</div>,
    Table: ({ children }) => <table>{children}</table>,
    Dropdown: ({ children }) => <div>{children}</div>,
    DropdownButton: ({ children }) => <div>{children}</div>,
}));
jest.mock('react-bootstrap/DropdownButton', () => ({ children }) => <div>{children}</div>);
jest.mock('react-bootstrap/Dropdown', () => {
    const D = ({ children }) => <div>{children}</div>;
    D.Item = ({ children, onClick }) => <div onClick={onClick}>{children}</div>;
    return D;
});

// ── extract the vendor lookup logic directly via source parsing ───────────────
// Rather than mounting the full PurchaseBillsTab (which has 30+ deps),
// we extract and evaluate the lookup sub-function to test the URL construction.

const fs   = require('fs');
const path = require('path');

const src = fs.readFileSync(
    path.join(__dirname, '../PurchaseBillsTab.js'), 'utf8'
);

// ── URL construction tests (static analysis on source) ────────────────────────

describe('PurchaseBillsTab — vendor VAT lookup and product search use search[store_id]', () => {
    test('initial VAT lookup URL includes &name= and search[store_id] parameters', () => {
        // The endpoint requires both vat_no AND name (MongoDB query uses both fields).
        // ParseStore reads search[store_id], not plain store_id.
        expect(src).toContain(
            '`/v1/vendor/vat_no/name?vat_no=${encodeURIComponent(vatNo)}&name=${encodeURIComponent(companyName)}&search[store_id]=${stId}`'
        );
    });

    test('post-409 retry VAT lookup URL also includes &name= parameter', () => {
        // The retry after a 409 Conflict must also pass name, otherwise the
        // retry has the same bug as the original lookup.
        const occurrences = (src.match(/v1\/vendor\/vat_no\/name\?vat_no.*name.*store_id/g) || []).length;
        expect(occurrences).toBeGreaterThanOrEqual(2);
    });

    test('old URL patterns (no name, or plain store_id) are gone', () => {
        // Must not use plain store_id= (ParseStore requires search[store_id])
        expect(src).not.toMatch(/vat_no\/name\?vat_no=\$\{encodeURIComponent\(vatNo\)\}&name=[^`]*&store_id=\$\{stId\}`/);
        // Must not omit name entirely
        expect(src).not.toMatch(/vat_no\/name\?vat_no=\$\{encodeURIComponent\(vatNo\)\}&search\[store_id\]=/);
    });

    test('both lookups guard on vatNo && companyName (not vatNo alone)', () => {
        const lines = src.split('\n');
        const guarded = lines.filter(l => l.includes('vatNo && companyName'));
        expect(guarded.length).toBeGreaterThanOrEqual(2);
    });

    test('product part_number search uses search[store_id]', () => {
        expect(src).toContain('search[part_number]=');
        expect(src).toContain('search[store_id]=');
        // Must not use plain store_id= for product searches
        expect(src).not.toMatch(/v1\/product\?search\[part_number\]=[^`]*&store_id=\$\{stId\}/);
        expect(src).not.toMatch(/v1\/product\?search\[query\]=[^`]*&store_id=\$\{stId\}/);
    });
});
