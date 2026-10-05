/**
 * Product editor state ↔ API body (masters.md §5.2, §5.5). Pure — see productForm.test.ts.
 */
import { toRfc3339 } from '../../../lib/format';
import { adjustmentTotals, setTotals, withSetPercents, withVat, type Adjustment, type SetLine, type StorePrices } from './pricing';

export interface Opt { id: string; label: string }

export interface AdjustmentRow extends Adjustment { key: string }

export interface ProductForm {
  name: string;
  name_in_arabic: string;
  item_code: string;
  prefix_part_number: string;
  part_number: string;
  ean_12: string;
  unit: string;
  note: string;
  country_code: string;
  country_name: string;
  brand: Opt | null;
  categories: Opt[];
  allow_duplicates: boolean;
  /** Legacy single rack (stores without the warehouse module). */
  rack: string;
  /** warehouse_racks: main_store + each warehouse code. */
  racks: Record<string, string>;
  prices: StorePrices;
  auto_update_wholesale: boolean;
  auto_update_retail: boolean;
  adjustments: AdjustmentRow[];
  set_name: string;
  set_lines: SetLine[];
  linked: Opt[];
}

const blankPrices = (): StorePrices => ({
  purchase_unit_price: 0, purchase_unit_price_with_vat: 0, wholesale_unit_price: 0, wholesale_unit_price_with_vat: 0,
  retail_unit_price: 0, retail_unit_price_with_vat: 0, wholesale_margin_percent: 0, retail_margin_percent: 0,
});

let seq = 0;
export const rowKey = () => `a${Date.now().toString(36)}${(seq++).toString(36)}`;

export function emptyProduct(settings: Record<string, any> = {}): ProductForm {
  return {
    name: '', name_in_arabic: '', item_code: '', prefix_part_number: '', part_number: '', ean_12: '', unit: '', note: '',
    country_code: '', country_name: '', brand: null, categories: [], allow_duplicates: !!settings.allow_products_duplicates_by_default,
    rack: '', racks: {}, prices: blankPrices(), auto_update_wholesale: false, auto_update_retail: false,
    adjustments: [], set_name: '', set_lines: [], linked: [],
  };
}

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0);

/** Hydrate the form from GET /v1/product/{id}. */
export function productFromApi(p: any, storeId: string, settings: Record<string, any> = {}): ProductForm {
  const ps = p?.product_stores?.[storeId] || {};
  const base = emptyProduct(settings);
  const catIds: string[] = p.category_id || [];
  const catNames: string[] = p.category_name || [];
  return {
    ...base,
    name: p.name || '',
    name_in_arabic: p.name_in_arabic || '',
    item_code: p.item_code || '',
    prefix_part_number: p.prefix_part_number || '',
    part_number: p.part_number || '',
    ean_12: p.ean_12 || '',
    unit: p.unit || '',
    note: p.note || '',
    country_code: p.country_code || '',
    country_name: p.country_name || '',
    brand: p.brand_id ? { id: p.brand_id, label: p.brand_name || p.brand_id } : null,
    categories: catIds.map((id, i) => ({ id, label: catNames[i] || id })),
    allow_duplicates: !!p.allow_duplicates,
    rack: p.rack || '',
    racks: { ...(ps.warehouse_racks || {}) },
    prices: {
      purchase_unit_price: num(ps.purchase_unit_price), purchase_unit_price_with_vat: num(ps.purchase_unit_price_with_vat),
      wholesale_unit_price: num(ps.wholesale_unit_price), wholesale_unit_price_with_vat: num(ps.wholesale_unit_price_with_vat),
      retail_unit_price: num(ps.retail_unit_price), retail_unit_price_with_vat: num(ps.retail_unit_price_with_vat),
      wholesale_margin_percent: num(ps.wholesale_margin_percent), retail_margin_percent: num(ps.retail_margin_percent),
      wholesale_manual_price_updated_at: ps.wholesale_manual_price_updated_at ?? null,
      retail_manual_price_updated_at: ps.retail_manual_price_updated_at ?? null,
    },
    auto_update_wholesale: !!ps.auto_update_wholesale_price_from_last_purchase,
    auto_update_retail: !!ps.auto_update_retail_price_from_last_purchase,
    adjustments: (ps.stock_adjustments || []).map((a: any) => ({
      key: rowKey(),
      date_str: a.date_str || (a.date ? toRfc3339(new Date(a.date)) : toRfc3339(new Date())),
      type: a.type || '',
      quantity: num(a.quantity),
      reason: a.reason || '',
      warehouse_id: a.warehouse_id || null,
      warehouse_code: a.warehouse_code || null,
    })),
    set_name: p.set?.name || '',
    set_lines: (p.set?.products || []).map((l: any) => ({
      product_id: l.product_id, part_number: l.part_number || '', name: l.name || '', quantity: num(l.quantity), unit: l.unit || '',
      purchase_unit_price: num(l.purchase_unit_price), purchase_unit_price_with_vat: num(l.purchase_unit_price_with_vat),
      retail_unit_price: num(l.retail_unit_price), retail_unit_price_with_vat: num(l.retail_unit_price_with_vat),
      retail_price_percent: num(l.retail_price_percent), purchase_price_percent: num(l.purchase_price_percent),
    })),
    linked: (p.linked_products || []).map((x: any) => ({ id: x.id, label: x.name || x.id })),
  };
}

/** Effective prices: a kit's component totals overwrite its own purchase/retail prices. */
export function effectivePrices(f: ProductForm): StorePrices {
  if (!f.set_lines.length) return f.prices;
  const t = setTotals(f.set_lines);
  return { ...f.prices, retail_unit_price: t.total, retail_unit_price_with_vat: t.total_with_vat, purchase_unit_price: t.purchase_total, purchase_unit_price_with_vat: t.purchase_total_with_vat };
}

/**
 * Build the POST/PUT body. The API replaces the whole product_stores[<store>] entry on update,
 * so the existing entry (server counters, other keys) is carried over and only editable fields overlaid.
 */
export function productToApi(f: ProductForm, opts: { storeId: string; existingStore?: Record<string, any> | null; warehouseModule: boolean; linkTo?: string | null }): Record<string, any> {
  const { storeId } = opts;
  const prices = effectivePrices(f);
  const set = f.set_lines.length ? { name: f.set_name.trim(), products: withSetPercents(f.set_lines) } : { name: '', products: [] };
  const racks = Object.fromEntries(Object.entries(f.racks).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v).trim()]));
  const body: Record<string, any> = {
    store_id: storeId,
    name: f.name.trim(),
    name_in_arabic: f.name_in_arabic.trim(),
    item_code: f.item_code.trim(),
    prefix_part_number: f.prefix_part_number.trim(),
    part_number: f.part_number.trim(),
    unit: f.unit,
    note: f.note,
    country_code: f.country_code,
    country_name: f.country_name,
    brand_id: f.brand?.id || null,
    category_id: f.categories.map((c) => c.id),
    allow_duplicates: f.allow_duplicates,
    is_service: false,
    linked_product_ids: f.linked.map((l) => l.id),
    set,
    product_stores: {
      [storeId]: {
        ...(opts.existingStore || {}),
        store_id: storeId,
        ...prices,
        auto_update_wholesale_price_from_last_purchase: f.auto_update_wholesale,
        auto_update_retail_price_from_last_purchase: f.auto_update_retail,
        warehouse_racks: opts.warehouseModule ? racks : opts.existingStore?.warehouse_racks || null,
        stock_adjustments: f.adjustments.map(({ key: _k, ...a }) => ({ ...a, quantity: Number(a.quantity) || 0 })),
      },
    },
  };
  if (!opts.warehouseModule) body.rack = f.rack.trim();
  if (opts.linkTo) body.link_to_product_id = opts.linkTo;
  return body;
}

/** Client-side validation mirroring BE product.go:2767 (same error keys). */
export function validateProduct(f: ProductForm): Record<string, string> {
  const e: Record<string, string> = {};
  const name = f.name.trim();
  if (!name) e.name = 'Name is required';
  else if (name.length < 3) e.name = 'Name length should be min. 3 chars';
  else if (name.length > 500) e.name = 'Name length should be max. 500 chars';
  const p = effectivePrices(f);
  (['purchase_unit_price', 'wholesale_unit_price', 'retail_unit_price'] as const).forEach((k) => {
    const inc = Number(p[`${k}_with_vat` as keyof StorePrices]) || 0;
    if (p[k] < 0 || inc < 0) e[k] = 'Price should not be < 0';
  });
  f.adjustments.forEach((a, i) => {
    if (!a.date_str) e[`adjustment_date_${i}`] = 'Date is required';
    if (!a.type) e[`adjustment_type_${i}`] = 'Type is required';
    if (!(Number(a.quantity) > 0)) e[`adjustment_quantity_${i}`] = 'Quantity should be > 0';
  });
  f.set_lines.forEach((l, i) => {
    if (!(Number(l.quantity) > 0)) e[`set_product_quantity_${i}`] = 'Quantity is required';
  });
  return e;
}

/** Server error keys that belong to a visible field under another name. */
export function normalizeServerErrors(errors: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(errors)) {
    const k2 = k === 'purchase_unit_price_0' ? 'purchase_unit_price' : k.replace(/_with_vat$/, '');
    out[k2] = out[k2] || v;
  }
  return out;
}

export function newAdjustment(type: 'adding' | 'removing', quantity: number, now = new Date()): AdjustmentRow {
  return { key: rowKey(), date_str: toRfc3339(now), type, quantity, reason: '', warehouse_id: null, warehouse_code: null };
}

export { adjustmentTotals };

/** Add a component to a kit (bump quantity if already there). */
export function addSetLine(lines: SetLine[], p: { id: string; name: string; part_number?: string; unit?: string; product_stores?: Record<string, any> }, storeId: string, vat: number): SetLine[] {
  const i = lines.findIndex((l) => l.product_id === p.id);
  if (i >= 0) return lines.map((l, j) => (j === i ? { ...l, quantity: (Number(l.quantity) || 0) + 1 } : l));
  const ps = p.product_stores?.[storeId] || {};
  const rp = num(ps.retail_unit_price), pp = num(ps.purchase_unit_price);
  return [...lines, {
    product_id: p.id, name: p.name, part_number: p.part_number || '', unit: p.unit || '', quantity: 1,
    retail_unit_price: rp, retail_unit_price_with_vat: num(ps.retail_unit_price_with_vat) || withVat(rp, vat),
    purchase_unit_price: pp, purchase_unit_price_with_vat: num(ps.purchase_unit_price_with_vat) || withVat(pp, vat),
  }];
}
