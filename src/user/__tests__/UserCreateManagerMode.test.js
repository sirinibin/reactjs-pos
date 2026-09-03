/**
 * Source-level tests for Manager-mode restrictions added to user/create.js:
 * - managerMode prop consumed
 * - Role dropdown hides Admin option in managerMode
 * - MANAGER_ALLOWED_ROLES guard in handleCreate
 * - suggestStores restricts to Manager's store when managerMode
 * - Store picker: states, functions, UI, managerMode restriction
 * - RBAC module dynamic check based on selected store
 */

const fs   = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
    path.join(__dirname, '..', 'create.js'),
    'utf8'
);

// ── 1. managerMode prop ───────────────────────────────────────────────────────

describe('user/create.js — managerMode prop', () => {
    test('1.1  managerMode is derived from props.managerMode', () => {
        expect(SRC).toMatch(/managerMode\s*=\s*!!props\.managerMode/);
    });

    test('1.2  MANAGER_ALLOWED_ROLES constant defined with Manager and SalesMan', () => {
        expect(SRC).toMatch(/MANAGER_ALLOWED_ROLES\s*=\s*\[.*Manager.*SalesMan|MANAGER_ALLOWED_ROLES.*SalesMan.*Manager/);
    });
});

// ── 2. Role dropdown restriction ─────────────────────────────────────────────

describe('user/create.js — role dropdown hides Admin for Manager', () => {
    test('2.1  Admin option is conditionally rendered (not managerMode)', () => {
        expect(SRC).toMatch(/!managerMode.*Admin|Admin.*!managerMode/);
    });

    test('2.2  Manager option still present unconditionally', () => {
        expect(SRC).toMatch(/<option value=["']Manager["']>/);
    });

    test('2.3  SalesMan option still present unconditionally', () => {
        expect(SRC).toMatch(/<option value=["']SalesMan["']>/);
    });
});

// ── 3. handleCreate guard ─────────────────────────────────────────────────────

describe('user/create.js — handleCreate rejects Admin role in managerMode', () => {
    test('3.1  handleCreate checks managerMode && !MANAGER_ALLOWED_ROLES.includes', () => {
        expect(SRC).toMatch(/managerMode.*MANAGER_ALLOWED_ROLES\.includes/);
    });

    test('3.2  error set on role field when guard fires', () => {
        const guardBlock = SRC.match(/managerMode[\s\S]{0,200}?MANAGER_ALLOWED_ROLES/);
        expect(guardBlock).not.toBeNull();
        expect(guardBlock[0]).toMatch(/role/);
    });

    test('3.3  guard returns early without calling fetch', () => {
        const guardBlock = SRC.match(/managerMode[\s\S]{0,400}?MANAGER_ALLOWED_ROLES[\s\S]{0,200}?return/);
        expect(guardBlock).not.toBeNull();
    });
});

// ── 4. suggestStores store restriction ───────────────────────────────────────

describe('user/create.js — suggestStores restricted to Manager stores', () => {
    test('4.1  managerMode restricts store search to Manager own store_id', () => {
        expect(SRC).toMatch(/managerMode[\s\S]{0,200}?store_id/);
    });

    test('4.2  localStorage store_id used as restriction param', () => {
        const fn = SRC.match(/if\s*\(managerMode\)[\s\S]{0,400}/);
        expect(fn).not.toBeNull();
        expect(fn[0]).toMatch(/store_id/);
    });

    test('4.3  store_ids param set on params object in managerMode', () => {
        expect(SRC).toMatch(/params\.store_ids\s*=/);
    });
});

// ── 5. Store picker — state declarations ──────────────────────────────────────

describe('user/create.js — store picker state declarations', () => {
    test('5.1  showStorePicker state declared', () => {
        expect(SRC).toMatch(/showStorePicker.*useState\(false\)|useState\(false\).*showStorePicker/);
    });

    test('5.2  allStores state declared', () => {
        expect(SRC).toMatch(/allStores.*useState\(\[\]\)|useState\(\[\]\).*allStores/);
    });

    test('5.3  pickerSelected state declared with initial Set', () => {
        expect(SRC).toMatch(/pickerSelected.*useState\(new Set\(\)\)|useState\(new Set\(\)\).*pickerSelected/);
    });

    test('5.4  storePickerLoading state declared', () => {
        expect(SRC).toMatch(/storePickerLoading/);
    });

    test('5.5  storePickerSearch state declared', () => {
        expect(SRC).toMatch(/storePickerSearch.*useState\(['"]{2}\)|useState\(['"]{2}\).*storePickerSearch/);
    });
});

// ── 6. Store picker — functions ───────────────────────────────────────────────

describe('user/create.js — store picker helper functions', () => {
    test('6.1  loadAllStores function declared', () => {
        expect(SRC).toMatch(/async function loadAllStores/);
    });

    test('6.2  loadAllStores fetches /v1/store with select=id,name,branch_name,code', () => {
        expect(SRC).toMatch(/\/v1\/store/);
        expect(SRC).toMatch(/select=id,name,branch_name,code/);
    });

    test('6.3  loadAllStores restricts by store_ids in managerMode', () => {
        const block = SRC.match(/function loadAllStores[\s\S]{0,400}/);
        expect(block).not.toBeNull();
        expect(block[0]).toMatch(/managerMode/);
        expect(block[0]).toMatch(/store_ids/);
    });

    test('6.4  loadAllStores pre-selects already-selected stores in pickerSelected', () => {
        const block = SRC.match(/function loadAllStores[\s\S]{0,300}/);
        expect(block).not.toBeNull();
        expect(block[0]).toMatch(/setPickerSelected/);
        expect(block[0]).toMatch(/selectedStores\.map/);
    });

    test('6.5  loadAllStores resets storePickerSearch to empty on open', () => {
        const block = SRC.match(/function loadAllStores[\s\S]{0,300}/);
        expect(block).not.toBeNull();
        expect(block[0]).toMatch(/setStorePickerSearch\s*\(\s*['"]{2}\s*\)/);
    });

    test('6.6  togglePickerStore adds/removes from pickerSelected Set', () => {
        expect(SRC).toMatch(/function togglePickerStore/);
        const block = SRC.match(/function togglePickerStore[\s\S]{0,200}/);
        expect(block).not.toBeNull();
        expect(block[0]).toMatch(/new Set\(prev\)/);
        expect(block[0]).toMatch(/next\.delete|next\.add/);
    });

    test('6.7  applyStorePicker filters allStores by pickerSelected and updates selectedStores', () => {
        expect(SRC).toMatch(/function applyStorePicker/);
        const block = SRC.match(/function applyStorePicker[\s\S]{0,200}/);
        expect(block).not.toBeNull();
        expect(block[0]).toMatch(/allStores\.filter/);
        expect(block[0]).toMatch(/pickerSelected\.has/);
        expect(block[0]).toMatch(/setSelectedStores/);
    });

    test('6.8  applyStorePicker closes the picker after applying', () => {
        const block = SRC.match(/function applyStorePicker[\s\S]{0,300}/);
        expect(block).not.toBeNull();
        expect(block[0]).toMatch(/setShowStorePicker\(false\)/);
    });

    test('6.9  applyStorePicker clears store_ids error', () => {
        const block = SRC.match(/function applyStorePicker[\s\S]{0,300}/);
        expect(block).not.toBeNull();
        expect(block[0]).toMatch(/store_ids/);
    });

    test('6.10  removeStore filters out store by id from selectedStores', () => {
        expect(SRC).toMatch(/function removeStore/);
        const block = SRC.match(/function removeStore[\s\S]{0,150}/);
        expect(block).not.toBeNull();
        expect(block[0]).toMatch(/prev\.filter/);
        expect(block[0]).toMatch(/s\.id !== storeId/);
    });
});

// ── 7. Store picker — UI elements ─────────────────────────────────────────────

describe('user/create.js — store picker UI', () => {
    test('7.1  bi-list-ul icon present on the trigger button', () => {
        expect(SRC).toMatch(/bi-list-ul/);
    });

    test('7.2  "Add Stores" label shown when no stores selected', () => {
        expect(SRC).toMatch(/Add Stores/);
    });

    test('7.3  "Manage Stores" label shown when stores already selected', () => {
        expect(SRC).toMatch(/Manage Stores/);
    });

    test('7.4  showStorePicker conditionally renders the picker panel', () => {
        expect(SRC).toMatch(/showStorePicker\s*&&/);
    });

    test('7.5  picker has a search input bound to storePickerSearch', () => {
        expect(SRC).toMatch(/storePickerSearch[\s\S]{0,100}onChange/);
    });

    test('7.6  picker filters allStores client-side using storePickerSearch', () => {
        expect(SRC).toMatch(/allStores\.filter[\s\S]{0,100}toLowerCase/);
    });

    test('7.7  picker renders checkboxes for each store', () => {
        expect(SRC).toMatch(/type=["']checkbox["']/);
        expect(SRC).toMatch(/pickerSelected\.has/);
    });

    test('7.8  "Apply" button calls applyStorePicker', () => {
        expect(SRC).toMatch(/onClick=\{applyStorePicker\}/);
    });

    test('7.9  "Cancel" button closes picker', () => {
        expect(SRC).toMatch(/setShowStorePicker\(false\)/);
    });

    test('7.10  selected store badge has a remove (×) button calling removeStore', () => {
        expect(SRC).toMatch(/removeStore\(store\.id\)/);
    });

    test('7.11  store badge uses bi-shop icon', () => {
        expect(SRC).toMatch(/bi-shop/);
    });

    test('7.12  picker count footer shows how many stores are selected', () => {
        expect(SRC).toMatch(/pickerSelected\.size/);
    });

    test('7.13  storePickerLoading shows a Spinner while loading', () => {
        expect(SRC).toMatch(/storePickerLoading/);
        expect(SRC).toMatch(/Spinner/);
        const idx = SRC.indexOf('{storePickerLoading &&');
        expect(idx).toBeGreaterThan(-1);
        expect(SRC.slice(idx, idx + 300)).toMatch(/Spinner/);
    });

    test('7.14  trigger button calls loadAllStores when opening', () => {
        expect(SRC).toMatch(/loadAllStores\(\)/);
    });

    test('7.15  No stores found shown when filtered list is empty', () => {
        expect(SRC).toMatch(/No stores found/);
    });
});

// ── 8. RBAC — dynamic check based on selected store ──────────────────────────

describe('user/create.js — RBAC dynamic check', () => {
    test('8.1  rbacEnabled state declared', () => {
        expect(SRC).toMatch(/rbacEnabled/);
    });

    test('8.2  useEffect watches selectedStores for rbac check', () => {
        expect(SRC).toMatch(/selectedStores[\s\S]{0,50}rbac|rbac[\s\S]{0,50}selectedStores/i);
    });

    test('8.3  fetches /v1/store/{id}?select=id,enable_rbac_module', () => {
        expect(SRC).toMatch(/enable_rbac_module/);
    });

    test('8.4  RBAC Roles section is conditionally rendered on rbacEnabled', () => {
        expect(SRC).toMatch(/rbacEnabled[\s\S]{0,200}RBAC Roles|RBAC Roles[\s\S]{0,200}rbacEnabled/);
    });

    test('8.5  rbacEnabled set false when no stores selected', () => {
        const block = SRC.match(/selectedStores.*length.*===.*0[\s\S]{0,100}/);
        expect(block).not.toBeNull();
        expect(block[0]).toMatch(/setRbacEnabled\(false\)/);
    });
});
