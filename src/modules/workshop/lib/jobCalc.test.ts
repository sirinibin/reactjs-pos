import { describe, expect, it } from 'vitest';
import {
  buildInvoicePrefill, computeSummary, invoiceable, lineDiscountWithVat, makePart, serverTotals, setPartLineDiscount, setPartQty, setPartTotalWithVat,
  setPartUnitPrice, setPartUnitPriceWithVat, type FullJob,
} from './jobCalc';

describe('part line formulas', () => {
  it('makePart derives incl. price from excl. unless a higher stored incl. price exists', () => {
    expect(makePart({ name: 'Oil', unit_price: 75 }, 15)).toMatchObject({ unit_price_with_vat: 86.25, total_price: 75, total_price_with_vat: 86.25, qty: 1 });
    expect(makePart({ name: 'Oil', unit_price: 75, unit_price_with_vat: 90 }, 15).unit_price_with_vat).toBe(90);
  });
  it('editing excl. updates incl. (r2); editing incl. updates excl. (r4)', () => {
    const p = makePart({ name: 'Pad', unit_price: 100, qty: 2 }, 15);
    expect(setPartUnitPrice(p, 33.33, 15)).toMatchObject({ unit_price_with_vat: 38.33, total_price: 66.66, total_price_with_vat: 76.66 });
    expect(setPartUnitPriceWithVat(p, 99.99, 15)).toMatchObject({ unit_price: 86.9478, total_price_with_vat: 199.98 });
    expect(setPartQty(p, 3).total_price_with_vat).toBe(345);
  });
  it('line discount (incl.) spreads per unit and back', () => {
    const p = setPartLineDiscount(makePart({ name: 'Pad', unit_price: 100, qty: 3 }, 15), 30, 15);
    expect(p.unit_discount_with_vat).toBe(10);
    expect(p.unit_discount).toBeCloseTo(8.69565217, 8);
    expect(p.total_price_with_vat).toBe(315);
    expect(lineDiscountWithVat(p)).toBe(30);
  });
  it('typing the line total back-solves unit prices', () => {
    const p = setPartTotalWithVat(makePart({ name: 'Pad', unit_price: 100, qty: 2 }, 15), 200, 15);
    expect(p.unit_price_with_vat).toBe(100);
    expect(p.unit_price).toBe(86.9565);
    expect(p.total_price).toBe(173.91);
  });
});

describe('cost summary matches the server', () => {
  const parts = [makePart({ name: 'Oil', unit_price: 75, qty: 1 }, 15), makePart({ name: 'Filter', unit_price: 25, qty: 1 }, 15)];
  it('labour is VAT inclusive', () => {
    const s = computeSummary(parts, 50, 15);
    expect(s).toEqual({ partsExcl: 100, partsIncl: 115, labourExcl: 43.48, subtotal: 143.48, vat: 21.52, totalIncl: 165 });
    expect(serverTotals({ parts, labour_charge: 50, vat_percent: 15 }).total_with_vat).toBe(165);
  });
  it('zero VAT falls back to labour + parts incl.', () => {
    expect(computeSummary(parts, 50, 0).totalIncl).toBe(150);
    expect(serverTotals({ parts, labour_charge: 50, vat_percent: 0 })).toMatchObject({ total: 150, total_with_vat: 165 });
  });
  it('empty job totals zero', () => {
    expect(computeSummary([], 0, 15).totalIncl).toBe(0);
  });
});

describe('sales invoice prefill', () => {
  const job = (o: Partial<FullJob>): FullJob => ({ id: 'j1', job_number: 'RJ-1', customer_id: 'c1', customer_name: 'Ahmed', vehicle_id: 'v1', vehicle_number: 'ABC 1234', brand: 'Toyota', model: 'Camry', km: 85000, labour_charge: 0, parts: [], ...o });
  it('maps parts to product lines and adds one VAT-inclusive Labour Charge line', () => {
    const p = buildInvoicePrefill([job({ labour_charge: 115, parts: [makePart({ product_id: 'p1', name: 'Oil', unit_price: 75, qty: 2, purchase_unit_price: 45 }, 15)] })], 15, 'lab1');
    expect(p).toMatchObject({ type: 'invoice', customer_id: 'c1', customer_name: 'Ahmed', vehicle_id: 'v1', km_driven: 85000, repair_job_ids: ['j1'], vehicle_snapshot: { vehicle_number: 'ABC 1234', brand: 'Toyota', model: 'Camry' } });
    expect(p.products).toEqual([
      expect.objectContaining({ product_id: 'p1', name: 'Oil', quantity: 2, unit_price: 75, unit_price_with_vat: 86.25, purchase_unit_price: 45, purchase_unit_price_with_vat: 51.75, is_service: false }),
      expect.objectContaining({ product_id: 'lab1', name: 'Labour Charge', quantity: 1, unit_price: 100, unit_price_with_vat: 115, is_service: true }),
    ]);
  });
  it('combines several jobs, sums labour, uses the filter customer and the first job with a vehicle', () => {
    const p = buildInvoicePrefill([job({ id: 'a', vehicle_id: null, km: 0, labour_charge: 50 }), job({ id: 'b', vehicle_id: 'v2', vehicle_number: 'XYZ', km: 1200, labour_charge: 65 })], 15, 'lab', { id: 'cX', name: 'Fleet Co' });
    expect(p.repair_job_ids).toEqual(['a', 'b']);
    expect(p.customer_id).toBe('cX');
    expect(p.vehicle_id).toBe('v2');
    expect(p.km_driven).toBe(1200);
    expect(p.products).toHaveLength(1);
    expect(p.products[0]).toMatchObject({ name: 'Labour Charge', unit_price_with_vat: 115, unit_price: 100 });
  });
  it('skips the labour line when a part is already named "labour charge" or labour is 0', () => {
    expect(buildInvoicePrefill([job({ labour_charge: 0 })], 15, 'lab').products).toEqual([]);
    const p = buildInvoicePrefill([job({ labour_charge: 50, parts: [makePart({ name: 'LABOUR CHARGE', unit_price: 10 }, 15)] })], 15, 'lab');
    expect(p.products).toHaveLength(1);
    expect(p.km_driven).toBe(85000);
  });
  it('invoiceable() excludes jobs already linked to an order', () => {
    expect(invoiceable([{ id: 'a', order_id: 'o' }, { id: 'b', order_id: null }, { id: 'c' }]).map((j) => (j as any).id)).toEqual(['b', 'c']);
  });
});
