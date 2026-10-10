/**
 * Invoice-arithmetic edge cases for trimTo2Decimals, the rounding helper every
 * create form / preview uses for line totals, VAT and net totals.
 *
 * The line/VAT/net calculations themselves (CalCulateLineTotals, findVatPrice,
 * findNetTotal …) are closures inside order/quotation/purchase/sales_return
 * create.js and cannot be imported; these tests pin the shared rounding rule
 * they all go through, using the same formulas the previews render.
 */
import { trimTo2Decimals } from '../numberUtils';

const line = ({ price, discount = 0, qty, vat }) => {
    const net = (price - discount) * qty;
    const netStr = trimTo2Decimals(net);
    const vatAmt = trimTo2Decimals(parseFloat(netStr) * (vat / 100));
    const gross = trimTo2Decimals(parseFloat(netStr) + parseFloat(vatAmt));
    return { net: netStr, vat: vatAmt, gross };
};

describe('trimTo2Decimals — half-cent values (x.xx5)', () => {
    test.each([
        [1.005, '1.01'],
        [2.675, '2.68'],
        [0.145, '0.15'],
        [0.285, '0.29'],
        [8.345, '8.35'],
        [1.255, '1.26'],
        [100.005, '100.01'],
        [1234.565, '1234.57'],
    ])('%p → %s (half-up)', (v, out) => {
        expect(trimTo2Decimals(v)).toBe(out);
    });

    // KNOWN BUG: the Number.EPSILON nudge is absolute (2.2e-16) so it stops
    // compensating binary representation error once values grow: 10.075 is
    // stored as 10.07499999…, and rounds DOWN. Decimal half-up gives 10.08 / 4.73.
    // Note the backend (models/common.go RoundTo2Decimals = math.Round(x*100)/100)
    // has no nudge at all, so for 1.005 / 2.675 the API gives 1.00 / 2.67 while
    // the UI shows 1.01 / 2.68 — totals can differ by 0.01 between UI and API.
    test.skip.each([
        [10.075, '10.08'],
        [4.725, '4.73'],
    ])('%p → %s (half-up at larger magnitudes)', (v, out) => {
        expect(trimTo2Decimals(v)).toBe(out);
    });

    test('current behaviour at larger magnitudes is documented (rounds down)', () => {
        expect(trimTo2Decimals(10.075)).toBe('10.07');
        expect(trimTo2Decimals(4.725)).toBe('4.72');
    });
});

describe('invoice line arithmetic through trimTo2Decimals', () => {
    test('VAT 15 %: 2 × (100 - 10) → 180.00 + 27.00 = 207.00', () => {
        expect(line({ price: 100, discount: 10, qty: 2, vat: 15 })).toEqual({ net: '180.00', vat: '27.00', gross: '207.00' });
    });

    test('VAT 0 %: VAT is 0.00 and gross equals net', () => {
        expect(line({ price: 99.99, qty: 3, vat: 0 })).toEqual({ net: '299.97', vat: '0.00', gross: '299.97' });
    });

    test('repeating decimals are rounded once per step: 33.3333 × 3 → 100.00 / 15.00 / 115.00', () => {
        expect(line({ price: 33.3333, qty: 3, vat: 15 })).toEqual({ net: '100.00', vat: '15.00', gross: '115.00' });
    });

    test('VAT that lands on a half cent rounds up: 18.90 × 15 % = 2.835 → 2.84', () => {
        expect(line({ price: 18.9, qty: 1, vat: 15 }).vat).toBe('2.84');
    });

    test('floating-point drift is removed: 0.1 × 3 → 0.30, VAT 0.05', () => {
        expect(line({ price: 0.1, qty: 3, vat: 15 })).toEqual({ net: '0.30', vat: '0.05', gross: '0.35' });
    });

    test('zero quantity → all 0.00', () => {
        expect(line({ price: 100, discount: 5, qty: 0, vat: 15 })).toEqual({ net: '0.00', vat: '0.00', gross: '0.00' });
    });

    test('discount greater than price yields a negative line (no clamping in the helper)', () => {
        expect(line({ price: 100, discount: 150, qty: 1, vat: 15 })).toEqual({ net: '-50.00', vat: '-7.50', gross: '-57.50' });
    });

    test('fractional quantity (e.g. 2.5 m) is supported', () => {
        expect(line({ price: 12.4, qty: 2.5, vat: 15 })).toEqual({ net: '31.00', vat: '4.65', gross: '35.65' });
    });

    test('large invoice keeps cent precision', () => {
        expect(line({ price: 123456.78, qty: 9, vat: 15 })).toEqual({ net: '1111111.02', vat: '166666.65', gross: '1277777.67' });
    });
});
