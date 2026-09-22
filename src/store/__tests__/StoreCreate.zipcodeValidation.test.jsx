/**
 * Regression test for phantom "Zipcode is required" validation in the Store form.
 *
 * Bug: create.js had a root-level formData.zipcode validation block that fired
 * even when the General Info tab was not the Zatca/national-address section.
 * Fix: the standalone zipcode validation block was removed; zipcode is only
 * validated as part of national_address (building_no, street_name, etc.) which
 * is correctly gated behind a Zatca/address context check.
 */

const fs   = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
    path.join(__dirname, '..', 'create.js'),
    'utf8'
);

describe('store/create.js — zipcode validation (phantom bug regression)', () => {
    test('1.1  no standalone formData.zipcode required-check outside address block', () => {
        // The removed block looked like:
        //   if (!formData.zipcode) { errors["zipcode"] = "Zipcode is required"; ... }
        // It must not exist at the top-level validate path any more.
        expect(SRC).not.toMatch(/errors\["zipcode"\]\s*=\s*["']Zipcode is required["']/);
    });

    test('1.2  no standalone isValidNDigitNumber(formData.zipcode) check', () => {
        // The removed block also had: isValidNDigitNumber(formData.zipcode, 5)
        // This check belongs only inside the national-address / Zatca section.
        const matches = SRC.match(/isValidNDigitNumber\s*\(\s*formData\.zipcode/g) || [];
        // There must be 0 occurrences of the standalone check.
        // (Occurrences inside national_address objects are acceptable but this
        //  codebase had 0 after the fix.)
        expect(matches.length).toBe(0);
    });

    test('1.3  "Zipcode is required" error string does not appear in root validation', () => {
        // If the string exists at all it should only be in a comment or a
        // national-address-specific block, never as a bare error assignment.
        const pattern = /errors\[[^\]]*\]\s*=\s*["']Zipcode is required["']/;
        expect(SRC).not.toMatch(pattern);
    });
});
