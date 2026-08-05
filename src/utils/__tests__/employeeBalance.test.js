import { getEmployeeBalanceInfo } from '../employeeBalance';

const t = (key) => key;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeAccount(overrides = {}) {
    return { type: 'liability', balance: 100, ...overrides };
}

// ---------------------------------------------------------------------------
// Return-shape guard — every branch must return all six fields
// ---------------------------------------------------------------------------
const EXPECTED_KEYS = ['amount', 'magnitude', 'label', 'suffix', 'colorClass', 'colorHex'];

function expectShape(result) {
    EXPECTED_KEYS.forEach((key) => {
        expect(result).toHaveProperty(key);
    });
}

// ---------------------------------------------------------------------------
// 1. Normal LIABILITY account with positive balance
//    Store owes the employee → amount should be negative, red colour
// ---------------------------------------------------------------------------
describe('liability account with positive balance', () => {
    const account = makeAccount({ type: 'liability', balance: 250 });
    let result;

    beforeEach(() => {
        result = getEmployeeBalanceInfo(account, t);
    });

    test('returns all expected fields', () => {
        expectShape(result);
    });

    test('magnitude equals raw stored balance', () => {
        expect(result.magnitude).toBe(250);
    });

    test('amount is negated (store owes employee = negative)', () => {
        expect(result.amount).toBe(-250);
    });

    test('label is "Balance"', () => {
        expect(result.label).toBe('Balance');
    });

    test('suffix is "Owed to Employee"', () => {
        expect(result.suffix).toBe('Owed to Employee');
    });

    test('colorClass is text-danger', () => {
        expect(result.colorClass).toBe('text-danger');
    });

    test('colorHex is red', () => {
        expect(result.colorHex).toBe('#ba1a1a');
    });
});

// ---------------------------------------------------------------------------
// 2. Normal ASSET account with positive balance
//    Employee owes the store → amount should be positive, blue colour
// ---------------------------------------------------------------------------
describe('asset account with positive balance', () => {
    const account = makeAccount({ type: 'asset', balance: 500 });
    let result;

    beforeEach(() => {
        result = getEmployeeBalanceInfo(account, t);
    });

    test('returns all expected fields', () => {
        expectShape(result);
    });

    test('magnitude equals raw stored balance', () => {
        expect(result.magnitude).toBe(500);
    });

    test('amount is positive (employee owes store)', () => {
        expect(result.amount).toBe(500);
    });

    test('label is "Balance"', () => {
        expect(result.label).toBe('Balance');
    });

    test('suffix is "Employee Owes"', () => {
        expect(result.suffix).toBe('Employee Owes');
    });

    test('colorClass is text-primary', () => {
        expect(result.colorClass).toBe('text-primary');
    });

    test('colorHex is blue', () => {
        expect(result.colorHex).toBe('#0a58ca');
    });
});

// ---------------------------------------------------------------------------
// 3. Zero balance stored on account
// ---------------------------------------------------------------------------
describe('zero balance', () => {
    const account = makeAccount({ type: 'liability', balance: 0 });
    let result;

    beforeEach(() => {
        result = getEmployeeBalanceInfo(account, t);
    });

    test('returns all expected fields', () => {
        expectShape(result);
    });

    test('amount is 0', () => {
        expect(result.amount).toBe(0);
    });

    test('magnitude is 0', () => {
        expect(result.magnitude).toBe(0);
    });

    test('colorClass is text-success (settled)', () => {
        expect(result.colorClass).toBe('text-success');
    });

    test('colorHex is green', () => {
        expect(result.colorHex).toBe('#1a7a3a');
    });

    test('suffix is empty string', () => {
        expect(result.suffix).toBe('');
    });
});

// ---------------------------------------------------------------------------
// 4. Negative balance value (sign stored in balance field)
//    The code treats balance as a magnitude so a negative value propagates
//    through; asset type keeps it negative, liability type negates it positive.
// ---------------------------------------------------------------------------
describe('negative balance value on asset account', () => {
    // balance = -80 is truthy (non-zero), so magnitude = -80
    // amount = magnitude (asset) = -80
    const account = makeAccount({ type: 'asset', balance: -80 });
    let result;

    beforeEach(() => {
        result = getEmployeeBalanceInfo(account, t);
    });

    test('magnitude mirrors the raw negative balance', () => {
        expect(result.magnitude).toBe(-80);
    });

    test('amount equals magnitude for asset type', () => {
        expect(result.amount).toBe(-80);
    });

    test('still resolves to asset branch (Employee Owes suffix)', () => {
        expect(result.suffix).toBe('Employee Owes');
        expect(result.colorClass).toBe('text-primary');
    });
});

describe('negative balance value on liability account', () => {
    // magnitude = -80, amount = -(-80) = 80
    const account = makeAccount({ type: 'liability', balance: -80 });
    let result;

    beforeEach(() => {
        result = getEmployeeBalanceInfo(account, t);
    });

    test('magnitude mirrors the raw negative balance', () => {
        expect(result.magnitude).toBe(-80);
    });

    test('amount is negated magnitude (double-negative → positive)', () => {
        expect(result.amount).toBe(80);
    });

    test('still resolves to liability branch (Owed to Employee suffix)', () => {
        expect(result.suffix).toBe('Owed to Employee');
        expect(result.colorClass).toBe('text-danger');
    });
});

// ---------------------------------------------------------------------------
// 5. Account type variants that are NOT "asset" go to liability branch
// ---------------------------------------------------------------------------
describe('account type is "Salary Payable" (not asset)', () => {
    const account = makeAccount({ type: 'Salary Payable', balance: 300 });
    let result;

    beforeEach(() => {
        result = getEmployeeBalanceInfo(account, t);
    });

    test('resolves to liability branch because type !== "asset"', () => {
        expect(result.suffix).toBe('Owed to Employee');
        expect(result.colorClass).toBe('text-danger');
    });

    test('amount is negated', () => {
        expect(result.amount).toBe(-300);
    });
});

describe('account type is "LIABILITY" (case mismatch, not asset)', () => {
    const account = makeAccount({ type: 'LIABILITY', balance: 150 });
    let result;

    beforeEach(() => {
        result = getEmployeeBalanceInfo(account, t);
    });

    test('resolves to liability branch', () => {
        expect(result.suffix).toBe('Owed to Employee');
    });
});

describe('account type is undefined (not asset)', () => {
    const account = { balance: 200 };
    let result;

    beforeEach(() => {
        result = getEmployeeBalanceInfo(account, t);
    });

    test('resolves to liability branch when type is undefined', () => {
        expect(result.suffix).toBe('Owed to Employee');
        expect(result.amount).toBe(-200);
    });
});

// ---------------------------------------------------------------------------
// 6. account.balance is undefined or null
// ---------------------------------------------------------------------------
describe('account.balance is undefined', () => {
    const account = { type: 'liability' };  // no balance property
    let result;

    beforeEach(() => {
        result = getEmployeeBalanceInfo(account, t);
    });

    test('magnitude defaults to 0', () => {
        expect(result.magnitude).toBe(0);
    });

    test('amount is 0', () => {
        expect(result.amount).toBe(0);
    });

    test('returns settled (zero) state', () => {
        expect(result.colorClass).toBe('text-success');
        expect(result.suffix).toBe('');
    });
});

describe('account.balance is null', () => {
    const account = makeAccount({ balance: null });
    let result;

    beforeEach(() => {
        result = getEmployeeBalanceInfo(account, t);
    });

    test('magnitude defaults to 0', () => {
        expect(result.magnitude).toBe(0);
    });

    test('returns settled (zero) state', () => {
        expect(result.colorClass).toBe('text-success');
    });
});

// ---------------------------------------------------------------------------
// 7. null account input
// ---------------------------------------------------------------------------
describe('null account input', () => {
    let result;

    beforeEach(() => {
        result = getEmployeeBalanceInfo(null, t);
    });

    test('does not throw', () => {
        expect(() => getEmployeeBalanceInfo(null, t)).not.toThrow();
    });

    test('returns all expected fields', () => {
        expectShape(result);
    });

    test('amount is 0', () => {
        expect(result.amount).toBe(0);
    });

    test('magnitude is 0', () => {
        expect(result.magnitude).toBe(0);
    });

    test('colorClass is text-success', () => {
        expect(result.colorClass).toBe('text-success');
    });

    test('suffix is empty string', () => {
        expect(result.suffix).toBe('');
    });
});

describe('undefined account input', () => {
    test('does not throw and returns zero state', () => {
        expect(() => getEmployeeBalanceInfo(undefined, t)).not.toThrow();
        const result = getEmployeeBalanceInfo(undefined, t);
        expect(result.amount).toBe(0);
        expect(result.magnitude).toBe(0);
        expect(result.colorClass).toBe('text-success');
    });
});

// ---------------------------------------------------------------------------
// 8. t function is called with the correct keys
// ---------------------------------------------------------------------------
describe('translation key usage', () => {
    test('zero-balance path calls t("Balance") only', () => {
        const mockT = jest.fn((key) => key);
        getEmployeeBalanceInfo(makeAccount({ balance: 0 }), mockT);
        expect(mockT).toHaveBeenCalledWith('Balance');
        expect(mockT).not.toHaveBeenCalledWith('Employee Owes');
        expect(mockT).not.toHaveBeenCalledWith('Owed to Employee');
    });

    test('asset branch calls t("Balance") and t("Employee Owes")', () => {
        const mockT = jest.fn((key) => key);
        getEmployeeBalanceInfo(makeAccount({ type: 'asset', balance: 100 }), mockT);
        expect(mockT).toHaveBeenCalledWith('Balance');
        expect(mockT).toHaveBeenCalledWith('Employee Owes');
        expect(mockT).not.toHaveBeenCalledWith('Owed to Employee');
    });

    test('liability branch calls t("Balance") and t("Owed to Employee")', () => {
        const mockT = jest.fn((key) => key);
        getEmployeeBalanceInfo(makeAccount({ type: 'liability', balance: 100 }), mockT);
        expect(mockT).toHaveBeenCalledWith('Balance');
        expect(mockT).toHaveBeenCalledWith('Owed to Employee');
        expect(mockT).not.toHaveBeenCalledWith('Employee Owes');
    });

    test('null-account path calls t("Balance") only', () => {
        const mockT = jest.fn((key) => key);
        getEmployeeBalanceInfo(null, mockT);
        expect(mockT).toHaveBeenCalledWith('Balance');
        expect(mockT).not.toHaveBeenCalledWith('Employee Owes');
        expect(mockT).not.toHaveBeenCalledWith('Owed to Employee');
    });
});

// ---------------------------------------------------------------------------
// 9. Return value has the expected shape in every branch
// ---------------------------------------------------------------------------
describe('return value shape in all branches', () => {
    const cases = [
        ['null account', null],
        ['zero balance liability', makeAccount({ balance: 0 })],
        ['positive liability', makeAccount({ type: 'liability', balance: 100 })],
        ['positive asset', makeAccount({ type: 'asset', balance: 100 })],
    ];

    test.each(cases)('%s returns all six required fields', (_label, account) => {
        const result = getEmployeeBalanceInfo(account, t);
        expectShape(result);
    });

    test('label field is always the string "Balance"', () => {
        const scenarios = [
            null,
            makeAccount({ balance: 0 }),
            makeAccount({ type: 'liability', balance: 50 }),
            makeAccount({ type: 'asset', balance: 50 }),
        ];
        scenarios.forEach((account) => {
            expect(getEmployeeBalanceInfo(account, t).label).toBe('Balance');
        });
    });
});

// ---------------------------------------------------------------------------
// 10. Edge: balance exactly at the 0 boundary
// ---------------------------------------------------------------------------
describe('balance exactly at 0 boundary', () => {
    test('balance === 0 on liability account returns zero state', () => {
        const result = getEmployeeBalanceInfo(makeAccount({ type: 'liability', balance: 0 }), t);
        expect(result.amount).toBe(0);
        expect(result.magnitude).toBe(0);
        expect(result.colorClass).toBe('text-success');
        expect(result.suffix).toBe('');
    });

    test('balance === 0 on asset account returns zero state', () => {
        const result = getEmployeeBalanceInfo(makeAccount({ type: 'asset', balance: 0 }), t);
        expect(result.amount).toBe(0);
        expect(result.magnitude).toBe(0);
        expect(result.colorClass).toBe('text-success');
        expect(result.suffix).toBe('');
    });

    test('balance just above 0 (0.01) on liability is NOT the zero state', () => {
        const result = getEmployeeBalanceInfo(makeAccount({ type: 'liability', balance: 0.01 }), t);
        expect(result.suffix).toBe('Owed to Employee');
        expect(result.magnitude).toBe(0.01);
        expect(result.amount).toBeCloseTo(-0.01);
    });

    test('balance just above 0 (0.01) on asset is NOT the zero state', () => {
        const result = getEmployeeBalanceInfo(makeAccount({ type: 'asset', balance: 0.01 }), t);
        expect(result.suffix).toBe('Employee Owes');
        expect(result.magnitude).toBe(0.01);
        expect(result.amount).toBeCloseTo(0.01);
    });
});
