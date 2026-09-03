/**
 * Source-level tests for ChangePasswordModal.js
 * Covers: structure, validation logic, API call shape, strength meter, eye toggles, skipCurrentPassword mode
 */

const fs   = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
    path.join(__dirname, '..', 'ChangePasswordModal.js'),
    'utf8'
);

// ── 1. Export & forwardRef ────────────────────────────────────────────────────

describe('ChangePasswordModal.js — module shape', () => {
    test('1.1  file uses forwardRef', () => {
        expect(SRC).toMatch(/forwardRef/);
    });

    test('1.2  useImperativeHandle exposes open()', () => {
        expect(SRC).toMatch(/useImperativeHandle/);
        expect(SRC).toMatch(/open\s*\(/);
    });

    test('1.3  default export is ChangePasswordModal', () => {
        expect(SRC).toMatch(/export default ChangePasswordModal/);
    });
});

// ── 2. State fields ───────────────────────────────────────────────────────────

describe('ChangePasswordModal.js — state fields', () => {
    test('2.1  currentPw state exists', () => {
        expect(SRC).toMatch(/currentPw/);
    });

    test('2.2  newPw state exists', () => {
        expect(SRC).toMatch(/newPw/);
    });

    test('2.3  confirmPw state exists', () => {
        expect(SRC).toMatch(/confirmPw/);
    });

    test('2.4  saving state exists', () => {
        expect(SRC).toMatch(/saving/);
    });

    test('2.5  errors state exists', () => {
        expect(SRC).toMatch(/errors/);
    });

    test('2.6  skipCurrentPassword state exists', () => {
        expect(SRC).toMatch(/skipCurrentPassword/);
    });
});

// ── 3. open() method parameters ──────────────────────────────────────────────

describe('ChangePasswordModal.js — open() sets userId, userName, skipCurrent', () => {
    test('3.1  open() accepts userId', () => {
        expect(SRC).toMatch(/setTargetUserId/);
    });

    test('3.2  open() accepts userName', () => {
        expect(SRC).toMatch(/setTargetUserName/);
    });

    test('3.3  open() accepts skipCurrent and casts to bool', () => {
        expect(SRC).toMatch(/setSkipCurrentPassword\s*\(\s*!!/);
    });

    test('3.4  open() resets all password fields to empty', () => {
        expect(SRC).toMatch(/setCurrentPw\s*\(\s*['"]{2}/);
        expect(SRC).toMatch(/setNewPw\s*\(\s*['"]{2}/);
        expect(SRC).toMatch(/setConfirmPw\s*\(\s*['"]{2}/);
    });
});

// ── 4. Validation ─────────────────────────────────────────────────────────────

describe('ChangePasswordModal.js — client-side validation', () => {
    test('4.1  validate() function exists', () => {
        expect(SRC).toMatch(/function validate/);
    });

    test('4.2  validates current_password required when skipCurrentPassword is false', () => {
        expect(SRC).toMatch(/current_password.*required|required.*current_password/i);
    });

    test('4.3  validates new_password required', () => {
        expect(SRC).toMatch(/new_password.*required|required.*new_password/i);
    });

    test('4.4  validates minimum 6 character length for new password', () => {
        expect(SRC).toMatch(/length\s*<\s*6/);
    });

    test('4.5  validates confirm_password must match newPw', () => {
        expect(SRC).toMatch(/newPw\s*!==\s*confirmPw|confirmPw\s*!==\s*newPw/);
    });

    test('4.6  validates confirm_password not empty', () => {
        expect(SRC).toMatch(/confirm_password/);
    });
});

// ── 5. Password strength meter ────────────────────────────────────────────────

describe('ChangePasswordModal.js — password strength meter', () => {
    test('5.1  passwordStrength() function exists', () => {
        expect(SRC).toMatch(/function passwordStrength/);
    });

    test('5.2  strength labels include Weak, Fair, Good, Strong', () => {
        expect(SRC).toMatch(/Weak/);
        expect(SRC).toMatch(/Fair/);
        expect(SRC).toMatch(/Good/);
        expect(SRC).toMatch(/Strong/);
    });

    test('5.3  strength checks uppercase letter', () => {
        expect(SRC).toMatch(/\[A-Z\]/);
    });

    test('5.4  strength checks digit', () => {
        expect(SRC).toMatch(/\[0-9\]/);
    });

    test('5.5  strength checks special character', () => {
        expect(SRC).toMatch(/\[.*A-Za-z0-9.*\]/);
    });

    test('5.6  strength bar renders 4 segments', () => {
        expect(SRC).toMatch(/\[1,\s*2,\s*3,\s*4\]/);
    });
});

// ── 6. Eye toggle buttons ─────────────────────────────────────────────────────

describe('ChangePasswordModal.js — show/hide password toggles', () => {
    test('6.1  EyeToggle component exists', () => {
        expect(SRC).toMatch(/EyeToggle/);
    });

    test('6.2  showCurrent state controls current password visibility', () => {
        expect(SRC).toMatch(/showCurrent/);
    });

    test('6.3  showNew state controls new password visibility', () => {
        expect(SRC).toMatch(/showNew/);
    });

    test('6.4  showConfirm state controls confirm password visibility', () => {
        expect(SRC).toMatch(/showConfirm/);
    });

    test('6.5  bi-eye and bi-eye-slash icons used', () => {
        expect(SRC).toMatch(/bi-eye-slash/);
        expect(SRC).toMatch(/bi-eye/);
    });
});

// ── 7. API call ───────────────────────────────────────────────────────────────

describe('ChangePasswordModal.js — API call', () => {
    test('7.1  calls PATCH /v1/user/{id}/change-password', () => {
        expect(SRC).toMatch(/\/v1\/user\/.*change-password/);
        expect(SRC).toMatch(/method:\s*['"]PATCH['"]/);
    });

    test('7.2  sends new_password in body', () => {
        expect(SRC).toMatch(/new_password:\s*newPw/);
    });

    test('7.3  sends current_password only when not skipping', () => {
        expect(SRC).toMatch(/skipCurrentPassword.*current_password|current_password.*skipCurrentPassword/);
    });

    test('7.4  sends Authorization header', () => {
        expect(SRC).toMatch(/Authorization.*access_token/);
    });

    test('7.5  showToastMessage called on success', () => {
        expect(SRC).toMatch(/showToastMessage.*success/);
    });
});

// ── 8. skipCurrentPassword mode (Manager changing others) ────────────────────

describe('ChangePasswordModal.js — skipCurrentPassword (Manager mode)', () => {
    test('8.1  current password field is conditionally rendered', () => {
        expect(SRC).toMatch(/!skipCurrentPassword/);
    });

    test('8.2  header shows "No current password required" hint when not self', () => {
        expect(SRC).toMatch(/No current password required/);
    });

    test('8.3  title changes based on isSelf', () => {
        expect(SRC).toMatch(/isSelf/);
        expect(SRC).toMatch(/Change Your Password/);
    });
});

// ── 9. UI elements ────────────────────────────────────────────────────────────

describe('ChangePasswordModal.js — UI elements', () => {
    test('9.1  success message shown after successful change', () => {
        expect(SRC).toMatch(/successMsg/);
        expect(SRC).toMatch(/Password changed successfully/);
    });

    test('9.2  Spinner shown while saving', () => {
        expect(SRC).toMatch(/Spinner/);
    });

    test('9.3  cancel button calls handleClose', () => {
        expect(SRC).toMatch(/Cancel/);
        expect(SRC).toMatch(/onClick.*handleClose|handleClose.*onClick/);
    });

    test('9.4  gradient header background', () => {
        expect(SRC).toMatch(/linear-gradient/);
    });

    test('9.5  bi-shield-lock-fill icon in header', () => {
        expect(SRC).toMatch(/bi-shield-lock-fill/);
    });
});
