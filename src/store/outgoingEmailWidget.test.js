/**
 * Source-code tests for ProcurementOutgoingEmailWidget.js
 */

const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(
    path.join(__dirname, 'ProcurementOutgoingEmailWidget.js'),
    'utf8'
);

describe('ProcurementOutgoingEmailWidget — auth token key', () => {
    it('uses access_token key (not token) for handleSave', () => {
        expect(src).not.toMatch(/getItem\('token'\)/);
        expect(src).not.toMatch(/getItem\("token"\)/);
    });

    it('all fetch calls use access_token', () => {
        const matches = src.match(/getItem\('access_token'\)/g) || [];
        // handleSave, handleTestEmail, saveSignatures — at least 3 usages
        expect(matches.length).toBeGreaterThanOrEqual(3);
    });
});

describe('ProcurementOutgoingEmailWidget — smtp port as number', () => {
    it('smtp port is initialized as 0 (number), not empty string', () => {
        expect(src).toMatch(/outgoing_email_smtp_port.*s\.outgoing_email_smtp_port.*\|\|.*0/);
    });

    it('handleFieldChange coerces smtp port to integer', () => {
        expect(src).toMatch(/outgoing_email_smtp_port.*parseInt/);
    });

    it('smtp port is never initialized as empty string', () => {
        expect(src).not.toMatch(/outgoing_email_smtp_port.*\|\|.*''/);
    });
});

describe('ProcurementOutgoingEmailWidget — iframe preview', () => {
    it('list preview iframe has min-width of 600px', () => {
        expect(src).toMatch(/minWidth.*600px/);
    });

    it('list preview iframe is wrapped in overflow-x auto container', () => {
        expect(src).toMatch(/overflowX.*auto/);
    });

    it('list preview iframe has no inline border (border on wrapper)', () => {
        // iframes themselves should have border:none after the fix
        expect(src).toMatch(/border.*none/);
    });

    it('editor live preview iframe also has min-width of 600px', () => {
        // both list and editor iframes should have minWidth
        const matches = src.match(/minWidth.*600px/g) || [];
        expect(matches.length).toBeGreaterThanOrEqual(2);
    });
});
