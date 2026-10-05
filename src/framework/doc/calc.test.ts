import { describe, expect, it } from 'vitest';
import {
  applyVat, computeTotals, discountWithVat, discountWithoutVat, goRound2, lineTotal, lineTotalWithVat, linesFromApi, linesToApi,
  makeLine, paymentSummary, r2, r8, setDiscountPercent, setLineDiscountWithVat, setLineTotal, setLineTotalWithVat, setQuantity,
  setUnitDiscount, setUnitPrice, setUnitPriceWithVat, validateLines, type DocLine, type PaymentRow,
} from './calc';

const VAT = 15;
const line = (o: Partial<DocLine> = {}) => makeLine({ name: 'Brake pad set', product_id: 'p1', unit_price: 100, quantity: 1, ...o }, VAT);

describe('rounding helpers', () => {
  it('r2 rounds half up and avoids float drift', () => {
    expect(r2(1.005)).toBe(1.01);
    expect(r2(2.675)).toBe(2.68);
    expect(r2(0.1 + 0.2)).toBe(0.3);
    expect(r2(NaN)).toBe(0);
    expect(r2(Infinity)).toBe(0);
  });
  it('r8 keeps 8 decimals', () => {
    expect(r8(1 / 3)).toBe(0.33333333);
  });
  it('goRound2 rounds half away from zero like Go math.Round', () => {
    expect(goRound2(-1.005)).toBe(-1);
    expect(goRound2(-2.5)).toBe(-2.5);
    expect(goRound2(0)).toBe(0);
    expect(Object.is(goRound2(-0.001), -0)).toBe(false);
  });
});

describe('line editing', () => {
  it('makeLine derives with-VAT price', () => {
    const l = line();
    expect(l.unit_price_with_vat).toBe(115);
    expect(l.unit_discount_with_vat).toBe(0);
  });
  it('makeLine derives ex-VAT price from with-VAT', () => {
    const l = makeLine({ name: 'Oil 4L', unit_price_with_vat: 115 }, VAT);
    expect(l.unit_price).toBe(100);
  });
  it('setUnitPrice keeps with-VAT in sync', () => {
    expect(setUnitPrice(line(), 200, VAT).unit_price_with_vat).toBe(230);
  });
  it('setUnitPriceWithVat back-solves ex-VAT price with 8 decimals', () => {
    const l = setUnitPriceWithVat(line(), 100, VAT);
    expect(l.unit_price).toBe(86.95652174);
  });
  it('setUnitDiscount computes percents and line discount', () => {
    const l = setUnitDiscount(line({ quantity: 2 }), 10, VAT);
    expect(l.unit_discount_with_vat).toBe(11.5);
    expect(l.unit_discount_percent).toBe(10);
    expect(l.unit_discount_percent_with_vat).toBe(10);
    expect(l.line_discount_with_vat).toBe(23);
  });
  it('setDiscountPercent clamps to 0..100', () => {
    expect(setDiscountPercent(line(), 150, VAT).unit_discount).toBe(100);
    expect(setDiscountPercent(line(), -5, VAT).unit_discount).toBe(0);
    expect(setDiscountPercent(line(), 12.5, VAT).unit_discount).toBe(12.5);
  });
  it('line discount stays constant when quantity changes', () => {
    let l = setLineDiscountWithVat(line({ quantity: 2 }), 23, VAT);
    expect(l.unit_discount_with_vat).toBe(11.5);
    l = setQuantity(l, 4, VAT);
    expect(l.unit_discount_with_vat).toBe(5.75);
    expect(r2(l.unit_discount_with_vat * l.quantity)).toBe(23);
  });
  it('setQuantity without line discount only changes quantity', () => {
    const l = setQuantity(line(), 7, VAT);
    expect(l.quantity).toBe(7);
    expect(l.unit_discount).toBe(0);
  });
  it('setLineDiscountWithVat on zero quantity divides by 1 (no NaN)', () => {
    const l = setLineDiscountWithVat(line({ quantity: 0 }), 10, VAT);
    expect(Number.isFinite(l.unit_discount)).toBe(true);
  });
  it('setLineTotal back-solves unit price including discount', () => {
    const l = setLineTotal(setUnitDiscount(line({ quantity: 4 }), 5, VAT), 380, VAT);
    expect(l.unit_price).toBe(100);
    expect(lineTotal(l)).toBe(380);
  });
  it('setLineTotalWithVat back-solves both prices', () => {
    const l = setLineTotalWithVat(line({ quantity: 2 }), 460, VAT);
    expect(l.unit_price_with_vat).toBe(230);
    expect(l.unit_price).toBe(200);
    expect(lineTotalWithVat(l)).toBe(460);
  });
  it('applyVat re-derives with-VAT figures', () => {
    const [l] = applyVat([setUnitDiscount(line(), 10, VAT)], 5);
    expect(l.unit_price_with_vat).toBe(105);
    expect(l.unit_discount_with_vat).toBe(10.5);
  });
  it('zero unit price gives 0% discount, not NaN', () => {
    const l = setUnitDiscount(line({ unit_price: 0 }), 0, VAT);
    expect(l.unit_discount_percent).toBe(0);
  });
});

describe('computeTotals (port of Order.FindNetTotal)', () => {
  it('simple invoice', () => {
    const t = computeTotals({ lines: [line({ quantity: 2 })], vat_percent: VAT });
    expect(t.total).toBe(200);
    expect(t.vat_price).toBe(30);
    expect(t.net_total).toBe(230);
    expect(t.total_quantity).toBe(2);
  });
  it('shipping and header discount affect taxable base', () => {
    const t = computeTotals({ lines: [line({ quantity: 2 })], vat_percent: VAT, shipping_handling_fees: 20, discount: 10 });
    expect(t.taxable).toBe(210);
    expect(t.vat_price).toBe(31.5);
    expect(t.net_total).toBe(241.5);
    expect(t.discount_percent).toBe(goRound2((10 / (241.5 + 10)) * 100));
  });
  it('auto rounding absorbs the 2-dp vs 8-dp difference', () => {
    const lines = [makeLine({ name: 'Bolt M8', unit_price_with_vat: 10, quantity: 3 }, VAT)]; // 8.69565217 ex VAT
    const t = computeTotals({ lines, vat_percent: VAT, auto_rounding_amount: true });
    expect(t.total).toBe(26.09);
    expect(t.before_rounding).toBe(30);
    expect(t.net_total).toBe(goRound2(t.before_rounding + t.rounding_amount));
  });
  it('manual rounding is applied when auto is off', () => {
    const t = computeTotals({ lines: [line()], vat_percent: VAT, auto_rounding_amount: false, rounding_amount: -0.5 });
    expect(t.net_total).toBe(114.5);
    expect(t.rounding_amount).toBe(-0.5);
  });
  it('empty document totals to zero', () => {
    const t = computeTotals({ lines: [], vat_percent: VAT });
    expect(t).toMatchObject({ total: 0, vat_price: 0, net_total: 0, discount_percent: 0 });
  });
  it('zero VAT (non-VAT sales)', () => {
    const t = computeTotals({ lines: [line({ quantity: 3 })], vat_percent: 0 });
    expect(t.vat_price).toBe(0);
    expect(t.net_total).toBe(300);
  });
  it('accumulates with round2 per line like the server', () => {
    const lines = [line({ unit_price: 0.333, quantity: 1 }), line({ unit_price: 0.333, quantity: 1 }), line({ unit_price: 0.333, quantity: 1 })];
    expect(computeTotals({ lines, vat_percent: VAT }).total).toBe(0.99);
  });
  it('line discounts reduce the base', () => {
    const t = computeTotals({ lines: [setUnitDiscount(line({ quantity: 10 }), 5, VAT)], vat_percent: VAT });
    expect(t.total).toBe(950);
    expect(t.net_total).toBe(1092.5);
  });
});

describe('header discount conversions', () => {
  it('round-trips', () => {
    expect(discountWithVat(100, VAT)).toBe(115);
    expect(discountWithoutVat(115, VAT)).toBe(100);
  });
});

describe('paymentSummary', () => {
  const pay = (amount: number, deleted = false): PaymentRow => ({ key: String(amount), date_str: '', amount, method: 'cash', deleted });
  it('not paid', () => expect(paymentSummary(230, 0, [])).toEqual({ paid: 0, balance: 230, status: 'not_paid' }));
  it('partially paid', () => expect(paymentSummary(230, 0, [pay(100)]).status).toBe('paid_partially'));
  it('paid with cash discount', () => expect(paymentSummary(230, 30, [pay(200)])).toEqual({ paid: 200, balance: 0, status: 'paid' }));
  it('ignores deleted payments', () => expect(paymentSummary(230, 0, [pay(230, true)]).status).toBe('not_paid'));
  it('overpayment yields negative balance (change)', () => expect(paymentSummary(230, 0, [pay(250)]).balance).toBe(-20));
});

describe('validateLines', () => {
  it('requires at least one line', () => expect(validateLines([])).toHaveProperty('product_id'));
  it('flags zero quantity, short names, zero price, discount > price', () => {
    const e = validateLines([{ ...line(), quantity: 0, name: 'ab', unit_price: 0, unit_discount: 5 }]);
    expect(Object.keys(e).sort()).toEqual(['name_0', 'quantity_0', 'unit_discount_0', 'unit_price_0']);
  });
  it('allows zero price when configured', () => expect(validateLines([{ ...line(), unit_price: 0 }], { allowZeroPrice: true })).toEqual({}));
  it('flags negative quantity', () => expect(validateLines([{ ...line(), quantity: -1 }])).toHaveProperty('quantity_0'));
});

describe('API mapping', () => {
  it('round-trips lines', () => {
    const out = linesToApi([setUnitDiscount(line({ quantity: 2, warehouse_id: 'w1' }), 5, VAT)]);
    expect(out[0]).toMatchObject({ product_id: 'p1', quantity: 2, unit_price: 100, unit_discount: 5, warehouse_id: 'w1' });
    expect(out[0]).not.toHaveProperty('key');
    const back = linesFromApi(out, VAT);
    expect(back[0].line_discount_with_vat).toBe(11.5);
    expect(back[0].key).toBeTruthy();
  });
  it('hydrates missing with-VAT values', () => {
    const [l] = linesFromApi([{ product_id: 'x', name: 'Xyz item', quantity: 1, unit_price: 100 }], VAT);
    expect(l.unit_price_with_vat).toBe(115);
  });
  it('handles undefined products', () => expect(linesFromApi(undefined, VAT)).toEqual([]));
});
