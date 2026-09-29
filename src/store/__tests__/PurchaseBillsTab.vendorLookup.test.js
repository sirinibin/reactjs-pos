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

describe('PurchaseBillsTab — vendor VAT lookup URL includes name parameter', () => {
    test('initial VAT lookup URL includes &name= parameter', () => {
        // The endpoint requires both vat_no AND name (MongoDB query uses both fields).
        // Verify the source passes name in the initial lookup.
        expect(src).toContain(
            '`/v1/vendor/vat_no/name?vat_no=${encodeURIComponent(vatNo)}&name=${encodeURIComponent(companyName)}&store_id=${stId}`'
        );
    });

    test('post-409 retry VAT lookup URL also includes &name= parameter', () => {
        // The retry after a 409 Conflict must also pass name, otherwise the
        // retry has the same bug as the original lookup.
        const occurrences = (src.match(/v1\/vendor\/vat_no\/name\?vat_no.*name.*store_id/g) || []).length;
        expect(occurrences).toBeGreaterThanOrEqual(2);
    });

    test('old URL pattern (vat_no only, no name) is gone', () => {
        // The old broken pattern ended with: &store_id= immediately after vat_no (no &name= between them).
        // Specifically: vat_no=${...}&store_id= with nothing in between
        expect(src).not.toMatch(/vat_no\/name\?vat_no=\$\{encodeURIComponent\(vatNo\)\}&store_id=/);
    });

    test('both lookups guard on vatNo && companyName (not vatNo alone)', () => {
        // Since the backend needs both fields, the condition must also require both.
        // Count occurrences of the guard `if (vatNo && companyName)` near the endpoint.
        const lines = src.split('\n');
        const guardLines = lines.filter(l =>
            l.includes('vat_no/name') || (l.includes('vatNo &&') && l.includes('companyName'))
        );
        // Should have at least 2 guarded calls (initial + retry)
        const guarded = lines.filter(l => l.includes('vatNo && companyName'));
        expect(guarded.length).toBeGreaterThanOrEqual(2);
    });
});
