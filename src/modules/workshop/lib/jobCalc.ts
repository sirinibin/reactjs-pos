// Repair-job money math. Mirrors the server's CalculateTotals (models/repair_job.go:88) and the
// legacy card-view formulas (workshop spec §2.2, §2.8) so what the user sees is what gets stored.

export const r2 = (n: number) => Math.round(((Number.isFinite(n) ? n : 0) + Number.EPSILON) * 100) / 100;
export const r4 = (n: number) => Math.round(((Number.isFinite(n) ? n : 0) + Number.EPSILON) * 1e4) / 1e4;
export const r8 = (n: number) => Math.round(((Number.isFinite(n) ? n : 0) + Number.EPSILON) * 1e8) / 1e8;
export const vatMul = (vat: number) => 1 + (Number(vat) || 0) / 100;

export interface Part {
  product_id?: string | null;
  item_code?: string;
  part_number?: string;
  name: string;
  qty: number;
  purchase_unit_price?: number;
  stock?: number;
  warehouse_stocks?: Record<string, number>;
  unit_price: number;
  unit_price_with_vat: number;
  unit_discount: number;
  unit_discount_with_vat: number;
  total_price: number;
  total_price_with_vat: number;
  is_service?: boolean;
}

const n = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** Recompute line totals from qty / prices / discounts. */
export function withTotals(p: Part): Part {
  return {
    ...p,
    total_price: r2(n(p.qty) * (n(p.unit_price) - n(p.unit_discount))),
    total_price_with_vat: r2(n(p.qty) * (n(p.unit_price_with_vat) - n(p.unit_discount_with_vat))),
  };
}

export function makePart(p: Partial<Part> & { name: string }, vat: number): Part {
  const excl = n(p.unit_price);
  const stored = n(p.unit_price_with_vat);
  return withTotals({
    product_id: p.product_id ?? null,
    item_code: p.item_code || '',
    part_number: p.part_number || '',
    name: p.name,
    qty: p.qty === undefined ? 1 : n(p.qty),
    purchase_unit_price: n(p.purchase_unit_price),
    stock: n(p.stock),
    warehouse_stocks: p.warehouse_stocks,
    unit_price: excl,
    unit_price_with_vat: stored > excl ? stored : r2(excl * vatMul(vat)),
    unit_discount: n(p.unit_discount),
    unit_discount_with_vat: n(p.unit_discount_with_vat),
    total_price: 0,
    total_price_with_vat: 0,
    is_service: !!p.is_service,
  });
}

export const setPartQty = (p: Part, q: number): Part => withTotals({ ...p, qty: q });
export const setPartUnitPrice = (p: Part, v: number, vat: number): Part => withTotals({ ...p, unit_price: v, unit_price_with_vat: r2(v * vatMul(vat)) });
export const setPartUnitPriceWithVat = (p: Part, v: number, vat: number): Part => withTotals({ ...p, unit_price_with_vat: v, unit_price: r4(v / vatMul(vat)) });

/** Line discount (VAT incl.) entered for the whole line → per-unit discounts. */
export function setPartLineDiscount(p: Part, lineDiscWithVat: number, vat: number): Part {
  const q = n(p.qty) || 1;
  const udv = r8(lineDiscWithVat / q);
  return withTotals({ ...p, unit_discount_with_vat: udv, unit_discount: r8(udv / vatMul(vat)) });
}

/** Line total (VAT incl.) typed by the user → back-solve the unit prices. */
export function setPartTotalWithVat(p: Part, total: number, vat: number): Part {
  const q = n(p.qty) || 1;
  const upv = r4(total / q + n(p.unit_discount_with_vat));
  const up = r4(upv / vatMul(vat));
  return { ...p, unit_price_with_vat: upv, unit_price: up, total_price_with_vat: r2(total), total_price: r2(q * (up - n(p.unit_discount))) };
}

export const lineDiscountWithVat = (p: Part) => r2(n(p.unit_discount_with_vat) * n(p.qty));

export interface JobSummary { partsExcl: number; partsIncl: number; labourExcl: number; subtotal: number; vat: number; totalIncl: number }

/** Cost summary — labour is entered VAT-inclusive (spec §2.8 computeSummary; matches BE when vat_percent is sent). */
export function computeSummary(parts: Part[], labour: number, vat: number): JobSummary {
  const m = vatMul(vat);
  const partsExcl = r2(parts.reduce((a, p) => a + n(p.qty) * (n(p.unit_price) - n(p.unit_discount)), 0));
  const partsIncl = r2(parts.reduce((a, p) => a + n(p.qty) * (n(p.unit_price_with_vat) - n(p.unit_discount_with_vat)), 0));
  const labourExcl = m > 1 ? r2(n(labour) / m) : n(labour);
  const subtotal = r2(partsExcl + labourExcl);
  const vatAmt = r2((subtotal * (Number(vat) || 0)) / 100);
  return { partsExcl, partsIncl, labourExcl, subtotal, vat: vatAmt, totalIncl: r2(subtotal + vatAmt) };
}

/** Server-side CalculateTotals, for verification (integration tests) and optimistic display. */
export function serverTotals(job: { parts?: Part[]; labour_charge?: number; vat_percent?: number }) {
  const parts = (job.parts || []).map((p) => {
    const total_price = n(p.qty) * (n(p.unit_price) - n(p.unit_discount));
    const unitWithVat = n(p.unit_price_with_vat) || n(p.unit_price);
    return { total_price, total_price_with_vat: n(p.qty) * (unitWithVat - n(p.unit_discount_with_vat)) };
  });
  const parts_total = parts.reduce((a, p) => a + p.total_price, 0);
  const parts_total_with_vat = parts.reduce((a, p) => a + p.total_price_with_vat, 0);
  const labour = n(job.labour_charge);
  const vat = n(job.vat_percent);
  let total_with_vat: number;
  if (vat > 0) {
    const sub = r2(parts_total + r2(labour / (1 + vat / 100)));
    total_with_vat = r2(sub + r2((sub * vat) / 100));
  } else total_with_vat = labour + parts_total_with_vat;
  return { parts_total, parts_total_with_vat, total: labour + parts_total, total_with_vat };
}

// ---------- Sales-invoice prefill (spec §2.9) ----------

export const PREFILL_KEY = 'workshop_invoice_prefill';
export const LABOUR_NAME = 'Labour Charge';

export interface PrefillProduct {
  product_id: string | null; item_code?: string; part_number?: string; name: string; quantity: number;
  unit_price: number; unit_price_with_vat: number; purchase_unit_price: number; purchase_unit_price_with_vat: number;
  unit_discount: number; unit_discount_with_vat: number; line_discount_with_vat: number; unit: string; is_service: boolean;
}

export interface InvoicePrefill {
  type: 'invoice';
  customer_id: string | null;
  customer_name: string;
  vehicle_id: string | null;
  vehicle_snapshot: { vehicle_number?: string; brand?: string; model?: string } | null;
  km_driven: number | null;
  repair_job_ids: string[];
  repair_job_infos: { id: string; job_number?: string; customer_name?: string }[];
  products: PrefillProduct[];
}

export interface FullJob {
  id: string; job_number?: string; customer_id?: string | null; customer_name?: string; vehicle_id?: string | null;
  vehicle_number?: string; brand?: string; model?: string; km?: number; labour_charge?: number; parts?: Part[] | null;
}

/**
 * Build the sales-invoice prefill from one or more full job cards. `labourProductId` is the
 * "Labour Charge" service product (find-or-create done by the caller). `customer` overrides the
 * customer (board filter) when several jobs are combined.
 */
export function buildInvoicePrefill(jobs: FullJob[], vat: number, labourProductId: string | null, customer?: { id: string; name: string } | null): InvoicePrefill {
  const m = vatMul(vat);
  const products: PrefillProduct[] = [];
  for (const j of jobs) {
    for (const p of j.parts || []) {
      const qty = n(p.qty) || 1;
      const excl = n(p.unit_price);
      const stored = n(p.unit_price_with_vat);
      const pup = n(p.purchase_unit_price);
      products.push({
        product_id: p.product_id || null, item_code: p.item_code || '', part_number: p.part_number || '', name: p.name, quantity: qty,
        unit_price: excl, unit_price_with_vat: stored > excl ? stored : r2(excl * m),
        purchase_unit_price: pup, purchase_unit_price_with_vat: r2(pup * m),
        unit_discount: n(p.unit_discount), unit_discount_with_vat: n(p.unit_discount_with_vat),
        line_discount_with_vat: r2(n(p.unit_discount_with_vat) * qty), unit: '', is_service: false,
      });
    }
  }
  const labour = jobs.reduce((a, j) => a + n(j.labour_charge), 0);
  if (labour > 0 && !products.some((p) => p.name.trim().toLowerCase() === LABOUR_NAME.toLowerCase())) {
    products.push({
      product_id: labourProductId, name: LABOUR_NAME, quantity: 1, unit_price: r4(labour / m), unit_price_with_vat: labour,
      purchase_unit_price: 0, purchase_unit_price_with_vat: 0, unit_discount: 0, unit_discount_with_vat: 0, line_discount_with_vat: 0, unit: '', is_service: true,
    });
  }
  const first = jobs[0];
  const withVehicle = jobs.find((j) => j.vehicle_id);
  const cust = jobs.length === 1 || !customer ? { id: first?.customer_id || null, name: first?.customer_name || '' } : { id: customer.id, name: customer.name };
  const km = withVehicle ? parseFloat(String(withVehicle.km ?? '')) : NaN;
  return {
    type: 'invoice',
    customer_id: cust.id || null,
    customer_name: cust.name || '',
    vehicle_id: withVehicle?.vehicle_id || null,
    vehicle_snapshot: withVehicle ? { vehicle_number: withVehicle.vehicle_number, brand: withVehicle.brand, model: withVehicle.model } : null,
    km_driven: Number.isFinite(km) && km > 0 ? km : null,
    repair_job_ids: jobs.map((j) => j.id),
    repair_job_infos: jobs.map((j) => ({ id: j.id, job_number: j.job_number, customer_name: j.customer_name })),
    products,
  };
}

/** Jobs eligible for a new sales invoice (no linked order yet). */
export const invoiceable = <T extends { order_id?: string | null }>(jobs: T[]) => jobs.filter((j) => !j.order_id);
