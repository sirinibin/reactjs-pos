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

describe('user/create.js — role dropdown hides Admin for non-admins', () => {
    test('2.1  Admin option is gated on currentUserIsAdmin (not managerMode)', () => {
        expect(SRC).toMatch(/currentUserIsAdmin[\s\S]{0,50}Admin|Admin[\s\S]{0,50}currentUserIsAdmin/);
    });

    test('2.2  Manager option still present unconditionally', () => {
        expect(SRC).toMatch(/<option value=["']Manager["']>/);
    });

    test('2.3  SalesMan option still present unconditionally', () => {
        expect(SRC).toMatch(/<option value=["']SalesMan["']>/);
    });

    test('2.4  Admin option gated on currentUserCanAssignAdmin (user_role === Admin only)', () => {
        // currentUserCanAssignAdmin = user_role === 'Admin' only (not the admin flag)
        // Ensures users with admin=true but role!==Admin cannot assign Admin role
        const adminOptionLine = SRC.match(/currentUserCanAssignAdmin[\s\S]{0,80}<option value=["']Admin["']>|<option value=["']Admin["']>[\s\S]{0,80}currentUserCanAssignAdmin/);
        expect(adminOptionLine).not.toBeNull();
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

describe('user/create.js — loadAllStores restricted to Manager stores', () => {
    test('4.1  managerMode restricts store list to Manager own store_id', () => {
        expect(SRC).toMatch(/managerMode[\s\S]{0,200}?store_id/);
    });

    test('4.2  localStorage store_id used as restriction in loadAllStores', () => {
        const fn = SRC.match(/if\s*\(managerMode\)[\s\S]{0,400}/);
        expect(fn).not.toBeNull();
        expect(fn[0]).toMatch(/store_id/);
    });

    test('4.3  loadAllStores appends store_ids query param in managerMode', () => {
        // loadAllStores uses ObjectToSearchQueryParams({store_ids: myStoreId}) to restrict
        expect(SRC).toMatch(/store_ids.*myStoreId|ObjectToSearchQueryParams.*store_ids/);
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

// ── 9. open() resets stores for new-user flow ─────────────────────────────────

describe('user/create.js — open() clears stores when creating new user', () => {
    test('9.1  open() resets selectedStores to empty array', () => {
        // Grab the open() function body
        const openBlock = SRC.match(/open\(id\)\s*\{[\s\S]{0,1500}SetShow\(true\)/);
        expect(openBlock).not.toBeNull();
        expect(openBlock[0]).toMatch(/selectedStores\s*=\s*\[\]/);
        expect(openBlock[0]).toMatch(/setSelectedStores\(\s*\[\]\s*\)/);
    });

    test('9.2  open() resets pickerSelected to empty Set', () => {
        const openBlock = SRC.match(/open\(id\)\s*\{[\s\S]{0,1500}SetShow\(true\)/);
        expect(openBlock).not.toBeNull();
        expect(openBlock[0]).toMatch(/setPickerSelected\(\s*new Set\(\)/);
    });

    test('9.3  stores are reset before getUser is called (create path is clean)', () => {
        const openBlock = SRC.match(/open\(id\)\s*\{[\s\S]{0,1500}SetShow\(true\)/);
        expect(openBlock).not.toBeNull();
        // setSelectedStores([]) must appear before getUser(id) in the open body
        const resetPos = openBlock[0].indexOf('setSelectedStores([])');
        const getUserPos = openBlock[0].indexOf('getUser(id)');
        expect(resetPos).toBeGreaterThan(-1);
        expect(getUserPos).toBeGreaterThan(-1);
        expect(resetPos).toBeLessThan(getUserPos);
    });
});

// ── 10. Self-role-change prevention ──────────────────────────────────────────

describe('user/create.js — non-admin cannot change own role', () => {
    test('10.1  currentUserId read from localStorage user_id', () => {
        expect(SRC).toMatch(/localStorage\.getItem\(['"]user_id['"]\)/);
    });

    test('10.2  currentUserIsAdmin derived from server-fetched currentUserRole === Admin', () => {
        // Role is now fetched from /v1/me on form open — not from localStorage admin flag
        expect(SRC).toMatch(/currentUserRole\s*===\s*['"]Admin['"]/);
        expect(SRC).toMatch(/\/v1\/me/);
    });

    test('10.3  isEditingSelf is true only when editing an existing user (formData.id exists) matching currentUserId', () => {
        expect(SRC).toMatch(/isEditingSelf\s*=\s*!!formData\.id.*currentUserId|isEditingSelf.*formData\.id.*===.*currentUserId/);
    });

    test('10.4  roleDisabled = isEditingSelf && !currentUserIsAdmin', () => {
        expect(SRC).toMatch(/roleDisabled\s*=\s*isEditingSelf\s*&&\s*!currentUserIsAdmin/);
    });

    test('10.5  role <select> has disabled={roleDisabled}', () => {
        expect(SRC).toMatch(/disabled=\{roleDisabled\}/);
    });

    test('10.6  hint message shown when roleDisabled', () => {
        // A hint/note is shown under the role field when disabled
        expect(SRC).toMatch(/roleDisabled[\s\S]{0,200}cannot change your own role|cannot change your own role[\s\S]{0,200}roleDisabled/);
    });

    test('10.7  admins are NOT blocked — currentUserIsAdmin allows role change', () => {
        // roleDisabled must include !currentUserIsAdmin (not just isEditingSelf alone)
        const line = SRC.match(/roleDisabled\s*=[\s\S]{0,80}/);
        expect(line).not.toBeNull();
        expect(line[0]).toMatch(/!currentUserIsAdmin/);
    });

    test('10.8  managers editing OTHER users are NOT blocked — isEditingSelf guards on formData.id match', () => {
        // isEditingSelf must compare formData.id to currentUserId (not just !!formData.id)
        expect(SRC).toMatch(/isEditingSelf.*formData\.id.*===.*currentUserId|formData\.id.*===.*currentUserId.*isEditingSelf/);
    });

    test('10.9  new-user form (no formData.id) never blocks role — !!formData.id is false', () => {
        // The !!formData.id guard ensures create-mode is never locked
        expect(SRC).toMatch(/isEditingSelf\s*=\s*!!formData\.id/);
    });
});

// ── 11. open() — Update button and default role ───────────────────────────────

describe('user/create.js — open() shows Update immediately and defaults role', () => {
    test('11.1  edit path pre-sets formData.id so header shows Update without waiting for fetch', () => {
        // open(id) must set formData = { id: id } (or similar) before SetShow
        const openBlock = SRC.match(/open\(id\)\s*\{[\s\S]{0,1200}SetShow\(true\)/);
        expect(openBlock).not.toBeNull();
        expect(openBlock[0]).toMatch(/formData\s*=\s*\{[^}]*id\s*:/);
    });

    test('11.2  edit path calls setFormData with id immediately', () => {
        const openBlock = SRC.match(/open\(id\)\s*\{[\s\S]{0,1200}SetShow\(true\)/);
        expect(openBlock).not.toBeNull();
        expect(openBlock[0]).toMatch(/setFormData\(\{\s*id\s*:/);
    });

    test('11.3  create path initializes role to Manager (prevents undefined role submission)', () => {
        // Without a default role, formData.role stays undefined even though the
        // dropdown visually shows Manager — user gets stored with no role.
        const openBlock = SRC.match(/open\(id\)\s*\{[\s\S]{0,1200}SetShow\(true\)/);
        expect(openBlock).not.toBeNull();
        expect(openBlock[0]).toMatch(/role\s*:\s*['"]Manager['"]/);
    });

    test('11.4  create path sets admin: false as default', () => {
        const openBlock = SRC.match(/open\(id\)\s*\{[\s\S]{0,1200}SetShow\(true\)/);
        expect(openBlock).not.toBeNull();
        expect(openBlock[0]).toMatch(/admin\s*:\s*false/);
    });
});

// ── 12. Password field — create only (update form never shows it) ─────────────

describe('user/create.js — password field rules', () => {
    test('12.1  password shown only in create form — condition is !formData.id', () => {
        // Create mode (no id): show. Update mode: never show; use Change Password instead.
        expect(SRC).toMatch(/!formData\.id/);
    });

    test('12.2  password condition appears before the type=password input', () => {
        const condPos = SRC.indexOf('!formData.id');
        const pwPos = SRC.indexOf('type="password"');
        expect(condPos).toBeGreaterThan(-1);
        expect(pwPos).toBeGreaterThan(-1);
        expect(condPos).toBeLessThan(pwPos);
    });

    test('12.3  password input type is password', () => {
        expect(SRC).toMatch(/type="password"/);
    });

    test('12.4  non-admins in update mode use Change Password option instead', () => {
        expect(SRC).toMatch(/Change password|Change Password/);
    });
});

// ── 13. Server-fetched role — never trust localStorage for Admin gate ──────────

describe('user/create.js — currentUserRole fetched from server, not localStorage', () => {
    test('13.1  currentUserRole state declared with null default', () => {
        expect(SRC).toMatch(/currentUserRole.*useState\(null\)|useState\(null\).*currentUserRole/);
    });

    test('13.2  setCurrentUserRole is the setter companion', () => {
        expect(SRC).toMatch(/\[currentUserRole,\s*setCurrentUserRole\]/);
    });

    test('13.3  useEffect fetches /v1/me when show becomes true', () => {
        // Guard: if (!show) return; ensures fetch only fires when modal opens
        expect(SRC).toMatch(/if\s*\(!show\)\s*return/);
        expect(SRC).toMatch(/\/v1\/me/);
    });

    test('13.4  /v1/me fetch depends on show in useEffect deps', () => {
        const meBlock = SRC.match(/\/v1\/me[\s\S]{0,400}?\[show\]/);
        expect(meBlock).not.toBeNull();
    });

    test('13.5  setCurrentUserRole called with data.result.role fallback to Manager', () => {
        // Falsy role from server (omitempty empty) defaults to Manager — never null
        expect(SRC).toMatch(/setCurrentUserRole\([\s\S]{0,60}['"]Manager['"]/);
    });

    test('13.6  currentUserIsAdmin derived from currentUserRole, not localStorage', () => {
        // Must NOT read user_role or admin from localStorage for the admin gate
        const isAdminLine = SRC.match(/currentUserIsAdmin\s*=[\s\S]{0,80}/);
        expect(isAdminLine).not.toBeNull();
        expect(isAdminLine[0]).not.toMatch(/localStorage/);
        expect(isAdminLine[0]).toMatch(/currentUserRole/);
    });

    test('13.7  currentUserCanAssignAdmin derived from currentUserRole, not localStorage', () => {
        const canAssignLine = SRC.match(/currentUserCanAssignAdmin\s*=[\s\S]{0,80}/);
        expect(canAssignLine).not.toBeNull();
        expect(canAssignLine[0]).not.toMatch(/localStorage/);
        expect(canAssignLine[0]).toMatch(/currentUserRole/);
    });

    test('13.8  Admin option hidden by default (null role = non-admin) until server responds', () => {
        // currentUserRole starts null; null === Admin = false → option hidden
        // Verified by the useState(null) default on currentUserRole
        expect(SRC).toMatch(/useState\(null\)/);
        expect(SRC).toMatch(/currentUserCanAssignAdmin[\s\S]{0,80}<option value=["']Admin["']>/);
    });

    test('13.9  Admin option only rendered when currentUserCanAssignAdmin is true', () => {
        const optionLine = SRC.match(/currentUserCanAssignAdmin[\s\S]{0,80}<option value=["']Admin["']>/);
        expect(optionLine).not.toBeNull();
    });

    test('13.10  localStorage admin flag NOT used anywhere for admin role gate', () => {
        // Security: admin flag in localStorage can be stale or manipulated
        // The form must not check localStorage admin for showing Admin option
        const adminOptionLine = SRC.match(/currentUserCanAssignAdmin\s*=[\s\S]{0,100}/);
        expect(adminOptionLine).not.toBeNull();
        expect(adminOptionLine[0]).not.toMatch(/localStorage.*admin|admin.*localStorage/);
    });
});
