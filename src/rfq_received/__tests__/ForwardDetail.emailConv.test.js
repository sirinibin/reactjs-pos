/**
 * Tests for the email conversation feature in ForwardDetail Suppliers tab.
 *
 * - Email icon appears when resolved supplier has an email
 * - EmailChatModal receives zIndex above the ForwardDetail modal (zIndex + 100)
 * - WhatsAppChatModal also receives zIndex above the ForwardDetail modal
 */

const fs   = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '../index.js'), 'utf8');

describe('ForwardDetail — email icon in Suppliers tab', () => {
    test('1. email icon button is rendered when resolved.email exists', () => {
        expect(src).toMatch(/resolved\.email[\s\S]{0,500}bi-envelope/);
    });

    test('2. email icon button calls setChatModal with type email and resolved.email', () => {
        expect(src).toMatch(/setChatModal\(\{.*type:.*'email'.*value:.*resolved\.email/s);
    });

    test('3. EmailChatModal receives zIndex prop above parent (zIndex + 100)', () => {
        expect(src).toMatch(/EmailChatModal[\s\S]{0,400}zIndex=\{zIndex \? zIndex \+ 100 : undefined\}/);
    });

    test('4. WhatsAppChatModal in ForwardDetail also receives zIndex prop', () => {
        expect(src).toMatch(/WhatsAppChatModal[\s\S]{0,400}zIndex=\{zIndex \? zIndex \+ 100 : undefined\}/);
    });
});
