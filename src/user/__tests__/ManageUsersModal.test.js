/**
 * Source-level tests for ManageUsersModal.js
 * Covers: exports, user listing, manager restrictions, actions (edit/change-pw/toggle/delete),
 * store and role filtering, sub-modal wiring, status badges, pagination
 */

const fs   = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
    path.join(__dirname, '..', 'ManageUsersModal.js'),
    'utf8'
);

// ── 1. Module shape ───────────────────────────────────────────────────────────

describe('ManageUsersModal.js — module shape', () => {
    test('1.1  uses forwardRef', () => {
        expect(SRC).toMatch(/forwardRef/);
    });

    test('1.2  useImperativeHandle exposes open()', () => {
        expect(SRC).toMatch(/useImperativeHandle/);
        expect(SRC).toMatch(/open\s*\(\s*\)/);
    });

    test('1.3  default export is ManageUsersModal', () => {
        expect(SRC).toMatch(/export default ManageUsersModal/);
    });

    test('1.4  imports UserCreate', () => {
        expect(SRC).toMatch(/import UserCreate/);
    });

    test('1.5  imports ChangePasswordModal', () => {
        expect(SRC).toMatch(/import ChangePasswordModal/);
    });
});

// ── 2. Manager role restrictions ──────────────────────────────────────────────

describe('ManageUsersModal.js — Manager role restrictions', () => {
    test('2.1  MANAGER_ALLOWED_ROLES contains Manager and SalesMan', () => {
        expect(SRC).toMatch(/MANAGER_ALLOWED_ROLES.*Manager.*SalesMan|MANAGER_ALLOWED_ROLES.*SalesMan.*Manager/);
    });

    test('2.2  Manager cannot see Admin role in roleOptions', () => {
        const roleOptionsBlock = SRC.match(/const roleOptions[\s\S]{0,300}?;/);
        expect(roleOptionsBlock).not.toBeNull();
        expect(roleOptionsBlock[0]).toMatch(/isAdmin|isManager/);
    });

    test('2.3  list() filters users by MANAGER_ALLOWED_ROLES when isManager', () => {
        expect(SRC).toMatch(/isManager\(\)[\s\S]{0,200}?MANAGER_ALLOWED_ROLES/);
    });

    test('2.4  isManager() checks user_role === Manager', () => {
        expect(SRC).toMatch(/user_role.*Manager|Manager.*user_role/);
    });

    test('2.5  isAdmin() checks user_role === Admin', () => {
        expect(SRC).toMatch(/user_role.*Admin|Admin.*user_role/);
    });
});

// ── 3. User list loading ──────────────────────────────────────────────────────

describe('ManageUsersModal.js — user list loading', () => {
    test('3.1  list() fetches /v1/user', () => {
        expect(SRC).toMatch(/\/v1\/user/);
    });

    test('3.2  loading spinner shown while fetching', () => {
        expect(SRC).toMatch(/Spinner/);
        expect(SRC).toMatch(/loading/);
    });

    test('3.3  empty state shown when no users', () => {
        expect(SRC).toMatch(/No users found/);
    });

    test('3.4  list() triggered by useEffect (instant search, no button)', () => {
        // Filter button removed — list fires from useEffect on state changes
        expect(SRC).toMatch(/useEffect/);
        expect(SRC).toMatch(/list\(\)/);
        expect(SRC).not.toMatch(/type="submit"/);
    });

    test('3.4b  name search is debounced with setTimeout', () => {
        expect(SRC).toMatch(/setTimeout[\s\S]{0,30}list\(\)/);
        expect(SRC).toMatch(/clearTimeout/);
    });

    test('3.4c  role filter and showInactive trigger list immediately', () => {
        // Both roleFilter and showInactive appear in the same useEffect dependency array
        expect(SRC).toMatch(/roleFilter[\s\S]{0,50}showInactive|showInactive[\s\S]{0,50}roleFilter/);
    });

    test('3.5  search by name param sent in query', () => {
        expect(SRC).toMatch(/search\[name\]/);
    });

    test('3.6  search by role filter param sent in query', () => {
        expect(SRC).toMatch(/search\[role\]/);
    });
});

// ── 4. Action buttons ─────────────────────────────────────────────────────────

describe('ManageUsersModal.js — action buttons', () => {
    test('4.1  Edit button opens UserCreate modal', () => {
        expect(SRC).toMatch(/openEdit/);
        expect(SRC).toMatch(/userCreateRef.*open|open.*userCreateRef/);
    });

    test('4.2  Change Password button opens ChangePasswordModal with skipCurrent=true', () => {
        expect(SRC).toMatch(/openChangePassword/);
        const fn = SRC.match(/function openChangePassword[\s\S]{0,400}/);
        expect(fn).not.toBeNull();
        expect(fn[0]).toMatch(/true/);
    });

    test('4.3  Toggle status button calls /v1/user/{id}/toggle-status', () => {
        expect(SRC).toMatch(/toggle-status/);
        expect(SRC).toMatch(/method.*PATCH|PATCH.*method/);
    });

    test('4.4  Delete button calls DELETE /v1/user/{id} (Admin only)', () => {
        expect(SRC).toMatch(/method.*DELETE|DELETE.*method/);
    });

    test('4.5  Delete button visible only for Admin (canDelete)', () => {
        expect(SRC).toMatch(/canDelete/);
        expect(SRC).toMatch(/isAdmin\(\)/);
    });

    test('4.6  ActionBtn component exists with icon, title, color, onClick props', () => {
        expect(SRC).toMatch(/function ActionBtn/);
        expect(SRC).toMatch(/icon.*title.*color.*onClick|onClick.*icon/);
    });
});

// ── 5. Confirmation prompts ───────────────────────────────────────────────────

describe('ManageUsersModal.js — confirmation prompts', () => {
    test('5.1  toggleStatus asks window.confirm before toggling', () => {
        expect(SRC).toMatch(/window\.confirm/);
    });

    test('5.2  deleteUser asks window.confirm before deleting', () => {
        const deleteBlock = SRC.match(/function deleteUser[\s\S]{0,300}/);
        expect(deleteBlock).not.toBeNull();
        expect(deleteBlock[0]).toMatch(/window\.confirm/);
    });

    test('5.3  activate confirm message mentions logging in', () => {
        expect(SRC).toMatch(/log in again/i);
    });

    test('5.4  deactivate confirm message mentions not being able to log in', () => {
        expect(SRC).toMatch(/not be able to log in/i);
    });
});

// ── 6. Status & Role badges ───────────────────────────────────────────────────

describe('ManageUsersModal.js — status and role badges', () => {
    test('6.1  StatusBadge component exists', () => {
        expect(SRC).toMatch(/function StatusBadge/);
    });

    test('6.2  StatusBadge shows Active / Inactive', () => {
        expect(SRC).toMatch(/Active/);
        expect(SRC).toMatch(/Inactive/);
    });

    test('6.3  RoleBadge component exists', () => {
        expect(SRC).toMatch(/function RoleBadge/);
    });

    test('6.4  RoleBadge has styles for Manager, SalesMan, Admin', () => {
        expect(SRC).toMatch(/Manager.*bg.*color|bg.*Manager/);
        expect(SRC).toMatch(/SalesMan.*bg.*color|bg.*SalesMan/);
        expect(SRC).toMatch(/Admin.*bg.*color|bg.*Admin/);
    });
});

// ── 7. Show Inactive toggle ───────────────────────────────────────────────────

describe('ManageUsersModal.js — show inactive users toggle', () => {
    test('7.1  showInactive state exists', () => {
        expect(SRC).toMatch(/showInactive/);
    });

    test('7.2  Show Inactive label present', () => {
        expect(SRC).toMatch(/Show Inactive/);
    });

    test('7.3  search[deleted]=1 sent when showInactive is true', () => {
        expect(SRC).toMatch(/search\[deleted\]/);
    });
});

// ── 8. New User button & Create flow ─────────────────────────────────────────

describe('ManageUsersModal.js — new user creation flow', () => {
    test('8.1  New User button calls openCreate()', () => {
        expect(SRC).toMatch(/openCreate/);
        expect(SRC).toMatch(/New User/);
    });

    test('8.2  openCreate() calls userCreateRef.current.open()', () => {
        const block = SRC.match(/function openCreate[\s\S]{0,150}/);
        expect(block).not.toBeNull();
        expect(block[0]).toMatch(/userCreateRef.*open/);
    });

    test('8.3  UserCreate receives managerMode prop', () => {
        expect(SRC).toMatch(/managerMode=/);
    });

    test('8.4  UserCreate receives refreshList prop to reload after save', () => {
        expect(SRC).toMatch(/refreshList=\{list\}/);
    });
});

// ── 9. Table columns ──────────────────────────────────────────────────────────

describe('ManageUsersModal.js — table structure', () => {
    test('9.1  Name column rendered', () => {
        expect(SRC).toMatch(/<th>Name<\/th>/);
    });

    test('9.2  Role column rendered', () => {
        expect(SRC).toMatch(/<th>Role<\/th>/);
    });

    test('9.3  Stores column rendered', () => {
        expect(SRC).toMatch(/<th>Stores<\/th>/);
    });

    test('9.4  Status column rendered', () => {
        expect(SRC).toMatch(/<th>Status<\/th>/);
    });

    test('9.5  store_names rendered as badges', () => {
        expect(SRC).toMatch(/store_names/);
    });

    test('9.6  online indicator shown for online users', () => {
        expect(SRC).toMatch(/u\.online/);
        expect(SRC).toMatch(/Online/);
    });
});
