/**
 * Source-code tests for the Compose new email feature in
 * ProcurementEmailConversationTab.js
 */

const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(
    path.join(__dirname, 'ProcurementEmailConversationTab.js'),
    'utf8'
);

describe('ProcurementEmailConversationTab — Compose new email', () => {
    it('1. composeOpen state is declared', () => {
        expect(src).toMatch(/const\s+\[composeOpen,\s*setComposeOpen\]/);
    });

    it('2. composeTo state is declared', () => {
        expect(src).toMatch(/const\s+\[composeTo,\s*setComposeTo\]/);
    });

    it('3. composeSubject state is declared', () => {
        expect(src).toMatch(/const\s+\[composeSubject,\s*setComposeSubject\]/);
    });

    it('4. composeBody state is declared', () => {
        expect(src).toMatch(/const\s+\[composeBody,\s*setComposeBody\]/);
    });

    it('5. handleCompose function is defined', () => {
        expect(src).toMatch(/const\s+handleCompose\s*=\s*async/);
    });

    it('6. handleCompose calls POST /v1/procurement-email-send', () => {
        expect(src).toMatch(/\/v1\/procurement-email-send/);
        expect(src).toMatch(/method:\s*['"]POST['"]/);
    });

    it('7. handleCompose sends to, subject, body and store_id', () => {
        expect(src).toMatch(/handleCompose[\s\S]{0,800}store_id[\s\S]{0,200}composeTo/);
    });

    it('8. Compose button exists in thread list panel', () => {
        expect(src).toMatch(/bi-pencil-square[\s\S]{0,100}Compose/);
    });

    it('9. Compose modal renders To, Subject, Message fields', () => {
        expect(src).toMatch(/composeOpen[\s\S]{0,200}composeTo/);
        expect(src).toMatch(/composeSubject/);
        expect(src).toMatch(/composeBody/);
    });

    it('10. Send Email button is disabled when To or body is empty', () => {
        expect(src).toMatch(/composeSending[\s\S]{0,100}composeTo[\s\S]{0,100}composeBody/);
    });

    it('11. Compose modal closes after successful send', () => {
        expect(src).toMatch(/setComposeOpen\(false\)/);
    });

    it('12. handleCompose refreshes thread list after sending', () => {
        expect(src).toMatch(/handleCompose[\s\S]{0,1500}loadThreads/);
    });

    it('13. Ctrl+Enter shortcut is wired to handleCompose', () => {
        expect(src).toMatch(/handleCompose[\s\S]{0,2000}ctrlKey[\s\S]{0,100}metaKey[\s\S]{0,100}handleCompose|ctrlKey[\s\S]{0,100}metaKey[\s\S]{0,200}handleCompose/);
    });
});
