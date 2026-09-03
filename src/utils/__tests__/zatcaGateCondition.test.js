/**
 * Pure logic tests for the ZATCA reporting gate conditions used in:
 *   - order/index.js
 *   - sales_return/index.js
 *   - customer_deposit/view.js
 *   - customer_withdrawal/view.js
 *
 * The key change: `!store.zatca?.zatca_reconnect_required` is now part of the
 * condition, hiding ZATCA reporting when reconnection is required.
 */

// ── Pure gate functions extracted from component conditions ───────────────────

/** order/index.js and sales_return/index.js */
function shouldShowZatcaReporting(zatca) {
    return zatca?.phase === "2" && zatca?.connected && !zatca?.zatca_reconnect_required;
}

/** customer_deposit/view.js */
function shouldShowDepositZatca(zatca, settings) {
    return (
        zatca?.phase === "2" &&
        zatca?.connected &&
        !zatca?.zatca_reconnect_required &&
        settings?.enable_zatca_reporting_for_receivables
    );
}

/** customer_withdrawal/view.js */
function shouldShowWithdrawalZatca(zatca, settings) {
    return (
        zatca?.phase === "2" &&
        zatca?.connected &&
        !zatca?.zatca_reconnect_required &&
        settings?.enable_zatca_reporting_for_payables
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// shouldShowZatcaReporting — order & sales_return gate
// ═══════════════════════════════════════════════════════════════════════════════

describe('shouldShowZatcaReporting (order / sales_return gate)', () => {
    test('phase "2", connected true, reconnect_required false → true', () => {
        expect(shouldShowZatcaReporting({ phase: '2', connected: true, zatca_reconnect_required: false })).toBe(true);
    });

    test('phase "2", connected true, reconnect_required true → false (KEY new behavior)', () => {
        expect(shouldShowZatcaReporting({ phase: '2', connected: true, zatca_reconnect_required: true })).toBe(false);
    });

    test('phase "2", connected true, reconnect_required undefined → true', () => {
        expect(shouldShowZatcaReporting({ phase: '2', connected: true, zatca_reconnect_required: undefined })).toBe(true);
    });

    test('phase "2", connected true, reconnect_required null → true (null is falsy)', () => {
        expect(shouldShowZatcaReporting({ phase: '2', connected: true, zatca_reconnect_required: null })).toBe(true);
    });

    test('phase "2", connected false, reconnect_required false → false', () => {
        expect(shouldShowZatcaReporting({ phase: '2', connected: false, zatca_reconnect_required: false })).toBe(false);
    });

    test('phase "1", connected true, reconnect_required false → false', () => {
        expect(shouldShowZatcaReporting({ phase: '1', connected: true, zatca_reconnect_required: false })).toBe(false);
    });

    test('phase "1", connected true, reconnect_required true → false', () => {
        expect(shouldShowZatcaReporting({ phase: '1', connected: true, zatca_reconnect_required: true })).toBe(false);
    });

    test('phase undefined, connected true, reconnect_required false → false', () => {
        expect(shouldShowZatcaReporting({ phase: undefined, connected: true, zatca_reconnect_required: false })).toBe(false);
    });

    test('null zatca → false', () => {
        expect(shouldShowZatcaReporting(null)).toBe(false);
    });

    test('undefined zatca → false', () => {
        expect(shouldShowZatcaReporting(undefined)).toBe(false);
    });

    test('phase "2", connected undefined, reconnect_required false → false', () => {
        // JS && returns the first falsy operand (here: undefined), not boolean false
        expect(shouldShowZatcaReporting({ phase: '2', connected: undefined, zatca_reconnect_required: false })).toBeFalsy();
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// shouldShowDepositZatca — customer_deposit gate
// ═══════════════════════════════════════════════════════════════════════════════

describe('shouldShowDepositZatca (customer_deposit gate)', () => {
    const settingsOn  = { enable_zatca_reporting_for_receivables: true };
    const settingsOff = { enable_zatca_reporting_for_receivables: false };

    test('phase "2", connected, reconnect_required=false, receivables=true → true', () => {
        expect(shouldShowDepositZatca(
            { phase: '2', connected: true, zatca_reconnect_required: false },
            settingsOn
        )).toBe(true);
    });

    test('phase "2", connected, reconnect_required=true, receivables=true → false (KEY new behavior)', () => {
        expect(shouldShowDepositZatca(
            { phase: '2', connected: true, zatca_reconnect_required: true },
            settingsOn
        )).toBe(false);
    });

    test('phase "2", connected, reconnect_required=false, receivables=false → false', () => {
        expect(shouldShowDepositZatca(
            { phase: '2', connected: true, zatca_reconnect_required: false },
            settingsOff
        )).toBe(false);
    });

    test('phase "1", connected, reconnect_required=false, receivables=true → false', () => {
        expect(shouldShowDepositZatca(
            { phase: '1', connected: true, zatca_reconnect_required: false },
            settingsOn
        )).toBe(false);
    });

    test('null zatca → false', () => {
        expect(shouldShowDepositZatca(null, settingsOn)).toBe(false);
    });

    test('undefined settings → false', () => {
        // JS && returns the first falsy operand (here: undefined), not boolean false
        expect(shouldShowDepositZatca(
            { phase: '2', connected: true, zatca_reconnect_required: false },
            undefined
        )).toBeFalsy();
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// shouldShowWithdrawalZatca — customer_withdrawal gate
// ═══════════════════════════════════════════════════════════════════════════════

describe('shouldShowWithdrawalZatca (customer_withdrawal gate)', () => {
    const settingsOn  = { enable_zatca_reporting_for_payables: true };
    const settingsOff = { enable_zatca_reporting_for_payables: false };

    test('phase "2", connected, reconnect_required=false, payables=true → true', () => {
        expect(shouldShowWithdrawalZatca(
            { phase: '2', connected: true, zatca_reconnect_required: false },
            settingsOn
        )).toBe(true);
    });

    test('phase "2", connected, reconnect_required=true, payables=true → false (KEY new behavior)', () => {
        expect(shouldShowWithdrawalZatca(
            { phase: '2', connected: true, zatca_reconnect_required: true },
            settingsOn
        )).toBe(false);
    });

    test('phase "2", connected, reconnect_required=false, payables=false → false', () => {
        expect(shouldShowWithdrawalZatca(
            { phase: '2', connected: true, zatca_reconnect_required: false },
            settingsOff
        )).toBe(false);
    });

    test('phase "1", connected, reconnect_required=false, payables=true → false', () => {
        expect(shouldShowWithdrawalZatca(
            { phase: '1', connected: true, zatca_reconnect_required: false },
            settingsOn
        )).toBe(false);
    });

    test('null zatca → false', () => {
        expect(shouldShowWithdrawalZatca(null, settingsOn)).toBe(false);
    });

    test('undefined settings → false', () => {
        // JS && returns the first falsy operand (here: undefined), not boolean false
        expect(shouldShowWithdrawalZatca(
            { phase: '2', connected: true, zatca_reconnect_required: false },
            undefined
        )).toBeFalsy();
    });
});
