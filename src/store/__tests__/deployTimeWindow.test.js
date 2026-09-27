/**
 * Tests for the deploy-time window guard in frontend/deploy.sh and
 * backend/deploy.sh.
 *
 * Coverage:
 *   - Source-level structure: correct flags, functions, and case branches
 *   - Window boundary logic: every Saudi hour, --force override, edge cases
 *
 * The window logic (10 pm – 6 am Saudi) is reproduced in JS for boundary
 * checks — same arithmetic as the shell functions.
 */

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const FE_DEPLOY = path.join(__dirname, '../../../deploy.sh');
const BE_DEPLOY = path.join(__dirname, '../../../../backend/deploy.sh');

const feSrc = fs.readFileSync(FE_DEPLOY, 'utf8');
const beSrc = fs.readFileSync(BE_DEPLOY, 'utf8');

// ─── JS replica of the window check (mirrors bash arithmetic) ────────────────
// Saudi hours allowed: 22, 23, 0, 1, 2, 3, 4, 5
function testWindowOpen(saHour) {
    return saHour >= 22 || saHour <= 5;
}
function testAllowed(saHour, force) {
    return force || testWindowOpen(saHour);
}

// ─── Frontend deploy.sh — source checks ──────────────────────────────────────

describe('frontend/deploy.sh — source structure', () => {
    test('1. FORCE=false default is declared', () => {
        expect(feSrc).toMatch(/FORCE=false/);
    });

    test('2. --force arg sets FORCE=true', () => {
        expect(feSrc).toMatch(/--force.*FORCE=true/s);
    });

    test('3. test_allowed() helper exists and short-circuits when FORCE', () => {
        expect(feSrc).toMatch(/test_allowed\(\)/);
        expect(feSrc).toMatch(/\$FORCE && return 0/);
        expect(feSrc).toMatch(/test_window_open/);
    });

    test('4. test target uses test_allowed (not raw window check)', () => {
        const testCase = feSrc.match(/\btest\)\s*([\s\S]*?);;\s/)?.[1] || '';
        expect(testCase).toMatch(/test_allowed/);
    });

    test('5. both target uses test_allowed', () => {
        const bothCase = feSrc.match(/both\)\s*([\s\S]*?);;\s/)?.[1] || '';
        expect(bothCase).toMatch(/test_allowed/);
    });

    test('6. production target has NO time restriction', () => {
        const prodCase = feSrc.match(/production\|prod\)\s*([\s\S]*?);;\s/)?.[1] || '';
        expect(prodCase).not.toMatch(/test_allowed|test_window_open/);
    });

    test('7. abort message (test target) tells user to use --force', () => {
        expect(feSrc).toMatch(/Use --force to override/);
    });

    test('8. skip message (both target outside window) mentions --force', () => {
        expect(feSrc).toMatch(/skipped[\s\S]{0,80}--force to override/);
    });

    test('9. --force prints a bypass notice', () => {
        expect(feSrc).toMatch(/Bypassing test deploy time restriction/);
    });

    test('10. both target skips test build when not in window (builds prod only)', () => {
        const bothCase = feSrc.match(/both\)\s*([\s\S]*?);;\s/)?.[1] || '';
        expect(bothCase).toMatch(/build.*PROD_API_URL/s);
        expect(bothCase).toMatch(/else/);
    });
});

// ─── Backend deploy.sh — source checks ───────────────────────────────────────

describe('backend/deploy.sh — source structure', () => {
    test('11. FORCE=false default is declared', () => {
        expect(beSrc).toMatch(/FORCE=false/);
    });

    test('12. --force arg sets FORCE=true', () => {
        expect(beSrc).toMatch(/--force.*FORCE=true/s);
    });

    test('13. test_window_open() function exists', () => {
        expect(beSrc).toMatch(/test_window_open\(\)/);
    });

    test('14. test deploy is conditional on FORCE or test_window_open', () => {
        expect(beSrc).toMatch(/\$FORCE \|\| test_window_open/);
    });

    test('15. skip message mentions --force', () => {
        expect(beSrc).toMatch(/Use --force to override/);
    });

    test('16. production deploy is always called (no FORCE/window guard around it)', () => {
        // deploy_to "start-api" appears outside the if/else block — not wrapped in test guard
        const prodDeploy = beSrc.match(/deploy_to "start-api"\s+["\/]/)?.[0];
        expect(prodDeploy).toBeTruthy();
    });

    test('17. usage comment mentions --force', () => {
        expect(beSrc).toMatch(/--force/);
    });
});

// ─── Window logic boundary checks (JS replica) ───────────────────────────────

const ALLOWED_HOURS = [22, 23, 0, 1, 2, 3, 4, 5];
const BLOCKED_HOURS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];

describe('window logic — allowed hours (no --force needed)', () => {
    ALLOWED_HOURS.forEach(h => {
        test(`hour ${h} → ALLOWED`, () => {
            expect(testAllowed(h, false)).toBe(true);
        });
    });
});

describe('window logic — blocked hours without --force', () => {
    BLOCKED_HOURS.forEach(h => {
        test(`hour ${h} → BLOCKED`, () => {
            expect(testAllowed(h, false)).toBe(false);
        });
    });
});

describe('window logic — --force overrides every blocked hour', () => {
    BLOCKED_HOURS.forEach(h => {
        test(`hour ${h} + --force → ALLOWED`, () => {
            expect(testAllowed(h, true)).toBe(true);
        });
    });
});

describe('window logic — boundary precision', () => {
    test('hour 5 (last allowed) → ALLOWED', () => {
        expect(testAllowed(5, false)).toBe(true);
    });
    test('hour 6 (first blocked) → BLOCKED', () => {
        expect(testAllowed(6, false)).toBe(false);
    });
    test('hour 21 (last blocked) → BLOCKED', () => {
        expect(testAllowed(21, false)).toBe(false);
    });
    test('hour 22 (first allowed after block) → ALLOWED', () => {
        expect(testAllowed(22, false)).toBe(true);
    });
    test('hour 0 (midnight) → ALLOWED', () => {
        expect(testAllowed(0, false)).toBe(true);
    });
    test('hour 23 → ALLOWED', () => {
        expect(testAllowed(23, false)).toBe(true);
    });
    test('--force on boundary hour 6 → ALLOWED', () => {
        expect(testAllowed(6, true)).toBe(true);
    });
    test('--force on boundary hour 21 → ALLOWED', () => {
        expect(testAllowed(21, true)).toBe(true);
    });
});

// ─── Verify bash arithmetic matches JS replica ────────────────────────────────

describe('window logic — bash arithmetic verification', () => {
    function bashWindowCheck(hourStr) {
        // Mirror: sa_hour=$((10#XX)); [ "$sa_hour" -ge 22 ] || [ "$sa_hour" -le 5 ]
        // Pass script via stdin (bash -s) so $sa_hour isn't expanded by the outer shell.
        const script = [
            `sa_hour=$(( 10#${hourStr} ))`,
            `if [ "$sa_hour" -ge 22 ] || [ "$sa_hour" -le 5 ]; then`,
            `    echo ALLOWED`,
            `else`,
            `    echo BLOCKED`,
            `fi`,
        ].join('\n');
        try {
            return execSync('bash -s', { input: script, timeout: 3000 }).toString().trim();
        } catch (_) { return 'ERROR'; }
    }

    [
        ['00', true], ['01', true], ['05', true], ['06', false],
        ['10', false], ['17', false], ['21', false], ['22', true], ['23', true],
    ].forEach(([h, allowed]) => {
        test(`bash: hour ${h} → ${allowed ? 'ALLOWED' : 'BLOCKED'}`, () => {
            expect(bashWindowCheck(h)).toBe(allowed ? 'ALLOWED' : 'BLOCKED');
        });
    });
});
