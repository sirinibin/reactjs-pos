/**
 * Source-level tests for Topbar.js user-menu changes:
 * - "Change Password" dropdown item (all users)
 * - "Manage Users" dropdown item (Manager/Admin only)
 * - Mobile drawer equivalents
 * - Modal refs wired up
 */

const fs   = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
    path.join(__dirname, '..', '..', 'Topbar.js'),
    'utf8'
);

// ── 1. Imports ────────────────────────────────────────────────────────────────

describe('Topbar.js — new imports', () => {
    test('1.1  ChangePasswordModal is imported', () => {
        expect(SRC).toMatch(/import ChangePasswordModal/);
    });

    test('1.2  ManageUsersModal is imported', () => {
        expect(SRC).toMatch(/import ManageUsersModal/);
    });

    test('1.3  ChangePasswordModal imported from user/ChangePasswordModal', () => {
        expect(SRC).toMatch(/from.*user\/ChangePasswordModal/);
    });

    test('1.4  ManageUsersModal imported from user/ManageUsersModal', () => {
        expect(SRC).toMatch(/from.*user\/ManageUsersModal/);
    });
});

// ── 2. Refs and canManageUsers flag ──────────────────────────────────────────

describe('Topbar.js — refs and role flag', () => {
    test('2.1  changePwRef created with useRef', () => {
        expect(SRC).toMatch(/changePwRef\s*=\s*useRef/);
    });

    test('2.2  manageUsersRef created with useRef', () => {
        expect(SRC).toMatch(/manageUsersRef\s*=\s*useRef/);
    });

    test('2.3  canManageUsers checks Manager or Admin role', () => {
        expect(SRC).toMatch(/canManageUsers/);
        expect(SRC).toMatch(/Manager/);
        expect(SRC).toMatch(/Admin/);
    });
});

// ── 3. Desktop dropdown — Change Password ─────────────────────────────────────

describe('Topbar.js — desktop dropdown Change Password item', () => {
    test('3.1  "Change Password" text in dropdown', () => {
        expect(SRC).toMatch(/Change Password/);
    });

    test('3.2  bi-shield-lock icon used for Change Password', () => {
        expect(SRC).toMatch(/bi-shield-lock/);
    });

    test('3.3  changePwRef.current?.open() called when item clicked', () => {
        expect(SRC).toMatch(/changePwRef\.current\?\.open\(/);
    });

    test('3.4  Change Password passes user_id from localStorage', () => {
        expect(SRC).toMatch(/localStorage\.getItem\(['"]user_id['"]\)/);
    });

    test('3.5  Change Password passes user_name from localStorage', () => {
        expect(SRC).toMatch(/localStorage\.getItem\(['"]user_name['"]\)/);
    });

    test('3.6  Change Password passes false as skipCurrent (own password)', () => {
        const idx = SRC.indexOf("changePwRef.current?.open(");
        const window400 = SRC.slice(idx, idx + 400);
        expect(window400).toMatch(/false/);
    });
});

// ── 4. Desktop dropdown — Manage Users ───────────────────────────────────────

describe('Topbar.js — desktop dropdown Manage Users item', () => {
    test('4.1  "Manage Users" text in dropdown', () => {
        expect(SRC).toMatch(/Manage Users/);
    });

    test('4.2  bi-people icon used for Manage Users', () => {
        expect(SRC).toMatch(/bi-people/);
    });

    test('4.3  manageUsersRef.current?.open() called when clicked', () => {
        expect(SRC).toMatch(/manageUsersRef\.current\?\.open\(\)/);
    });

    test('4.4  Manage Users item is conditional on canManageUsers', () => {
        expect(SRC).toMatch(/canManageUsers/);
        const count = (SRC.match(/Manage Users/g) || []).length;
        expect(count).toBeGreaterThanOrEqual(2);
    });
});

// ── 5. Mobile drawer — Change Password ────────────────────────────────────────

describe('Topbar.js — mobile drawer Change Password button', () => {
    test('5.1  mobile drawer has a Change Password button', () => {
        // Check that Change Password appears in more than one place (desktop + mobile)
        const matches = SRC.match(/Change Password/g) || [];
        expect(matches.length).toBeGreaterThanOrEqual(2);
    });

    test('5.2  mobile drawer closes when Change Password is clicked', () => {
        expect(SRC).toMatch(/setMobileMenuOpen\(false\)[\s\S]{0,50}changePwRef|changePwRef[\s\S]{0,50}setMobileMenuOpen\(false\)/);
    });
});

// ── 6. Mobile drawer — Manage Users ──────────────────────────────────────────

describe('Topbar.js — mobile drawer Manage Users button', () => {
    test('6.1  mobile drawer Manage Users button is conditional on canManageUsers', () => {
        const matches = SRC.match(/Manage Users/g) || [];
        expect(matches.length).toBeGreaterThanOrEqual(2);
    });

    test('6.2  mobile drawer closes when Manage Users is clicked', () => {
        expect(SRC).toMatch(/setMobileMenuOpen\(false\)[\s\S]{0,80}manageUsersRef|manageUsersRef[\s\S]{0,80}setMobileMenuOpen\(false\)/);
    });
});

// ── 7. Modal mounting ─────────────────────────────────────────────────────────

describe('Topbar.js — modals mounted in JSX', () => {
    test('7.1  ChangePasswordModal rendered with ref={changePwRef}', () => {
        expect(SRC).toMatch(/<ChangePasswordModal\s+ref=\{changePwRef\}/);
    });

    test('7.2  ManageUsersModal rendered with ref={manageUsersRef}', () => {
        expect(SRC).toMatch(/<ManageUsersModal\s+ref=\{manageUsersRef\}/);
    });
});
