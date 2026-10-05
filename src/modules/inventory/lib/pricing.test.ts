import { describe, expect, it } from 'vitest';
import {
  adjustmentTotals, applyPriceEdit, cleanEan, formatDuration, isKit, marginOf, monthlyUnits, normalizeServiceUnit, partLabel, priceFromLastPurchase,
  reorderAdvice, secretCode, setTotals, soldInLast, stockByLocation, toArabicDigits, unitProfit, withSetPercents, withVat, withoutVat, type StorePrices,
} from './pricing';

const P0: StorePrices = { purchase_unit_price: 0, purchase_unit_price_with_vat: 0, wholesale_unit_price: 0, wholesale_unit_price_with_vat: 0, retail_unit_price: 0, retail_unit_price_with_vat: 0, wholesale_margin_percent: 0, retail_margin_percent: 0 };
const NOW = () => '2026-10-05T10:00:00.000Z';

describe('VAT conversions', () => {
  it('adds and removes VAT with 8-decimal trimming', () => {
    expect(withVat(22.1, 15)).toBe(25.415);
    expect(withVat(38.5, 15)).toBe(44.275);
    expect(withoutVat(115, 15)).toBe(100);
    expect(withoutVat(10, 15)).toBe(8.69565217);
    expect(withVat(10, 0)).toBe(10);
  });
});

describe('margins and profit', () => {
  it('computes margin over purchase, 0 when purchase is 0', () => {
    expect(marginOf(38.5, 22.1)).toBe(74.21);
    expect(marginOf(50, 0)).toBe(0);
  });
  it('mirrors the server profit rule', () => {
    expect(unitProfit(38.5, 22.1)).toEqual({ profit: 16.4, percent: 74.21 });
    expect(unitProfit(10, 0)).toEqual({ profit: 10, percent: 100 });
    expect(unitProfit(0, 0)).toEqual({ profit: 0, percent: 0 });
    expect(unitProfit(8, 10)).toEqual({ profit: -2, percent: -20 });
  });
  it('price from last purchase needs a margin', () => {
    expect(priceFromLastPurchase(100, 0, 15)).toBeNull();
    expect(priceFromLastPurchase(100, 25, 15)).toEqual({ price: 125, price_with_vat: 143.75 });
  });
});

describe('applyPriceEdit cascade', () => {
  it('purchase ex VAT fills incl VAT', () => {
    const n = applyPriceEdit(P0, 'purchase_unit_price', 100, 15, NOW);
    expect(n.purchase_unit_price_with_vat).toBe(115);
  });
  it('purchase incl VAT back-solves ex VAT', () => {
    const n = applyPriceEdit(P0, 'purchase_unit_price_with_vat', 115, 15, NOW);
    expect(n.purchase_unit_price).toBe(100);
  });
  it('a purchase change re-prices tiers that have a margin', () => {
    const p = { ...P0, retail_margin_percent: 50, wholesale_margin_percent: 20 };
    const n = applyPriceEdit(p, 'purchase_unit_price', 100, 15, NOW);
    expect(n.retail_unit_price).toBe(150);
    expect(n.retail_unit_price_with_vat).toBe(172.5);
    expect(n.wholesale_unit_price).toBe(120);
  });
  it('a purchase change recomputes the margin of tiers priced manually', () => {
    const p = { ...P0, retail_unit_price: 150 };
    const n = applyPriceEdit(p, 'purchase_unit_price', 120, 15, NOW);
    expect(n.retail_unit_price).toBe(150);
    expect(n.retail_margin_percent).toBe(25);
  });
  it('editing a selling price recomputes margin and stamps manual update', () => {
    const p = { ...P0, purchase_unit_price: 100, purchase_unit_price_with_vat: 115 };
    const n = applyPriceEdit(p, 'retail_unit_price_with_vat', 172.5, 15, NOW);
    expect(n.retail_unit_price).toBe(150);
    expect(n.retail_margin_percent).toBe(50);
    expect(n.retail_manual_price_updated_at).toBe(NOW());
    expect(n.wholesale_manual_price_updated_at).toBeUndefined();
  });
  it('editing a margin re-prices that tier', () => {
    const p = { ...P0, purchase_unit_price: 80 };
    const n = applyPriceEdit(p, 'wholesale_margin_percent', 25, 15, NOW);
    expect(n.wholesale_unit_price).toBe(100);
    expect(n.wholesale_unit_price_with_vat).toBe(115);
  });
  it('margin without a purchase price just stores the margin', () => {
    const n = applyPriceEdit(P0, 'retail_margin_percent', 30, 15, NOW);
    expect(n.retail_margin_percent).toBe(30);
    expect(n.retail_unit_price).toBe(0);
  });
});

describe('labels', () => {
  it('purchase secret code maps digits to letters', () => {
    expect(secretCode(22.1)).toBe('LL');
    expect(secretCode(1090.5)).toBe('KTST');
    expect(secretCode(0)).toBe('T');
  });
  it('strips the legacy barcode suffix', () => {
    expect(cleanEan('100000000003(Old:ABC123)')).toBe('100000000003');
    expect(cleanEan(undefined)).toBe('');
  });
  it('joins prefix and part number', () => {
    expect(partLabel({ prefix_part_number: 'BO', part_number: '123' })).toBe('BO-123');
    expect(partLabel({ part_number: 'X' })).toBe('X');
  });
  it('converts digits to Arabic-Indic', () => {
    expect(toArabicDigits('1234')).toBe('۱۲۳٤');
    expect(toArabicDigits('A-05')).toBe('A-۰۵');
  });
});

describe('sets / kits', () => {
  const lines = [
    { product_id: 'a', name: 'Pad', quantity: 2, purchase_unit_price: 10, purchase_unit_price_with_vat: 11.5, retail_unit_price: 20, retail_unit_price_with_vat: 23 },
    { product_id: 'b', name: 'Disc', quantity: 1, purchase_unit_price: 30, purchase_unit_price_with_vat: 34.5, retail_unit_price: 60, retail_unit_price_with_vat: 69 },
  ];
  it('totals components', () => {
    expect(setTotals(lines)).toEqual({ total: 100, total_with_vat: 115, purchase_total: 50, purchase_total_with_vat: 57.5, total_quantity: 3 });
  });
  it('computes each component share', () => {
    const w = withSetPercents(lines);
    expect(w[0].retail_price_percent).toBe(40);
    expect(w[1].purchase_price_percent).toBe(60);
  });
  it('detects kits from components, not the inverted is_set flag', () => {
    expect(isKit({ set: { products: [{}] } })).toBe(true);
    expect(isKit({ set: { products: null } })).toBe(false);
    expect(isKit({})).toBe(false);
  });
});

describe('stock', () => {
  it('sums adjustments by type', () => {
    expect(adjustmentTotals([
      { date_str: 'x', type: 'adding', quantity: 5, reason: '', warehouse_id: null, warehouse_code: null },
      { date_str: 'x', type: 'removing', quantity: 2, reason: '', warehouse_id: null, warehouse_code: null },
      { date_str: 'x', type: 'adding', quantity: 1.5, reason: '', warehouse_id: null, warehouse_code: null },
    ])).toEqual({ added: 6.5, removed: 2 });
  });
  it('lists Main Store first then warehouses', () => {
    const rows = stockByLocation({ stock: 12, warehouse_stocks: { main_store: 9, WH1: 3 } }, [{ id: 'w1', code: 'WH1', name: 'Dammam' }, { id: 'w2', code: 'WH2', name: 'Jeddah' }]);
    expect(rows).toEqual([{ code: 'main_store', name: 'Main Store', stock: 9 }, { code: 'WH1', name: 'Dammam', stock: 3 }, { code: 'WH2', name: 'Jeddah', stock: 0 }]);
  });
  it('falls back to total stock when there are no warehouse figures', () => {
    expect(stockByLocation({ stock: 7 }, [])[0].stock).toBe(7);
  });
});

describe('demand and reorder', () => {
  const now = new Date(2026, 9, 5, 12);
  const rows = [
    { date: new Date(2026, 9, 1).toISOString(), reference_type: 'sales', quantity: 6 },
    { date: new Date(2026, 8, 20).toISOString(), reference_type: 'sales', quantity: 10 },
    { date: new Date(2026, 8, 21).toISOString(), reference_type: 'sales_return', quantity: 1 },
    { date: new Date(2026, 8, 22).toISOString(), reference_type: 'purchase', quantity: 50 },
    { date: new Date(2026, 8, 23).toISOString(), reference_type: 'quotation', quantity: 99 },
    { date: new Date(2025, 0, 1).toISOString(), reference_type: 'sales', quantity: 100 },
  ];
  it('buckets net units sold per month, oldest first', () => {
    const m = monthlyUnits(rows, 3, now);
    expect(m.map((x) => x.key)).toEqual(['2026-08', '2026-09', '2026-10']);
    expect(m.map((x) => x.value)).toEqual([0, 9, 6]);
  });
  it('counts recent net sales only', () => {
    expect(soldInLast(rows, 30, now)).toBe(15);
  });
  it('flags low stock and suggests an order quantity', () => {
    const a = reorderAdvice(2, rows, { now, windowDays: 30, lowDays: 14, coverDays: 30, leadDays: 0 });
    expect(a.dailyRate).toBe(0.5);
    expect(a.daysLeft).toBe(4);
    expect(a.low).toBe(true);
    expect(a.suggest).toBe(13);
  });
  it('is not low when nothing sells', () => {
    const a = reorderAdvice(5, [], { now });
    expect(a.low).toBe(false);
    expect(a.daysLeft).toBe(Infinity);
    expect(a.suggest).toBe(0);
  });
  it('treats zero stock with demand as out and low', () => {
    const a = reorderAdvice(0, rows, { now, windowDays: 30 });
    expect(a.out).toBe(true);
    expect(a.low).toBe(true);
    expect(a.suggest).toBeGreaterThan(0);
  });
});

describe('services', () => {
  it('maps legacy units to UN/ECE codes', () => {
    expect(normalizeServiceUnit('hour')).toBe('HUR');
    expect(normalizeServiceUnit('visit')).toBe('C62');
    expect(normalizeServiceUnit('')).toBe('C62');
    expect(normalizeServiceUnit('MON')).toBe('MON');
  });
  it('formats durations', () => {
    expect(formatDuration(90, 'minutes')).toBe('1h 30m');
    expect(formatDuration(120)).toBe('2h');
    expect(formatDuration(45)).toBe('45m');
    expect(formatDuration(2, 'hours')).toBe('2 hours');
    expect(formatDuration(0)).toBe('');
  });
});
