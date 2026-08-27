/**
 * Source-level tests for the Store Settings entry-point added to Topbar.js.
 *
 * Full render tests for Topbar would require mocking a large tree of
 * dependencies (WebSocket, i18n, store-switcher fetch, etc.).  These
 * tests verify the structural changes at the source level — the same
 * pattern used for other targeted Topbar checks in this codebase.
 */

const fs   = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
    path.join(__dirname, 'Topbar.js'),
    'utf8'
);

// ── 1. Import ─────────────────────────────────────────────────────────────────

describe('Topbar — StoreSettingsModal import', () => {
    test('1.1  StoreSettingsModal is imported', () => {
        expect(SRC).toMatch(/import StoreSettingsModal from/);
    });

    test('1.2  import path points to store/StoreSettingsModal', () => {
        expect(SRC).toMatch(/from\s+['"]\.\/store\/StoreSettingsModal['"]/);
    });
});

// ── 2. State ──────────────────────────────────────────────────────────────────

describe('Topbar — storeSettingsOpen state', () => {
    test('2.1  storeSettingsOpen state variable is declared', () => {
        expect(SRC).toMatch(/storeSettingsOpen/);
    });

    test('2.2  useState is used to manage storeSettingsOpen', () => {
        expect(SRC).toMatch(/useState\(false\)/);
    });

    test('2.3  setStoreSettingsOpen is referenced (used to open/close)', () => {
        expect(SRC).toMatch(/setStoreSettingsOpen/);
    });
});

// ── 3. Desktop dropdown item ──────────────────────────────────────────────────

describe('Topbar — desktop dropdown "Store Settings" item', () => {
    test('3.1  "Store Settings" text is in the source', () => {
        expect(SRC).toMatch(/Store Settings/);
    });

    test('3.2  Store Settings item opens the modal (setStoreSettingsOpen(true))', () => {
        expect(SRC).toMatch(/setStoreSettingsOpen\(true\)/);
    });

    test('3.3  gear icon used for Store Settings item', () => {
        // bi-gear is used; bi-gear-fill is used in the modal header — both are acceptable
        expect(SRC).toMatch(/bi-gear/);
    });

    test('3.4  Store Settings item is a Dropdown.Item', () => {
        expect(SRC).toMatch(/<Dropdown\.Item[^>]*onClick[^>]*>\s*.*Store Settings/s);
    });
});

// ── 4. Mobile drawer button ───────────────────────────────────────────────────

describe('Topbar — mobile drawer "Store Settings" button', () => {
    test('4.1  mobile drawer also sets storeSettingsOpen to true', () => {
        // Count how many times setStoreSettingsOpen(true) appears — must be ≥ 2
        // (desktop dropdown + mobile drawer)
        const matches = SRC.match(/setStoreSettingsOpen\(true\)/g) || [];
        expect(matches.length).toBeGreaterThanOrEqual(2);
    });

    test('4.2  mobile drawer closes the menu before opening modal (setMobileMenuOpen(false))', () => {
        // The mobile Store Settings button should close the drawer first
        expect(SRC).toMatch(/setMobileMenuOpen\(false\);?\s*setStoreSettingsOpen\(true\)|setStoreSettingsOpen\(true\);?\s*setMobileMenuOpen\(false\)/s);
    });
});

// ── 5. Modal rendered in JSX ──────────────────────────────────────────────────

describe('Topbar — StoreSettingsModal rendered in the component', () => {
    test('5.1  <StoreSettingsModal ... /> is rendered', () => {
        expect(SRC).toMatch(/<StoreSettingsModal/);
    });

    test('5.2  show prop is wired to storeSettingsOpen', () => {
        expect(SRC).toMatch(/show=\{storeSettingsOpen\}/);
    });

    test('5.3  onHide prop is provided to close the modal', () => {
        expect(SRC).toMatch(/onHide=\{[^}]+\}/);
    });

    test('5.4  closing the modal sets storeSettingsOpen to false', () => {
        expect(SRC).toMatch(/setStoreSettingsOpen\(false\)/);
    });
});
