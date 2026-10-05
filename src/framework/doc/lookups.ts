import { api } from '@/api/client';
import type { PickerOption } from '@/ui/AsyncPicker';
import { fmtMoney } from '@/lib/format';
import { makeLine, type DocLine } from './calc';

/**
 * Normalise a product search term like the legacy typeahead (masters.md §5.4):
 * split letter↔digit boundaries ("toy116" → "toy 116") and strip leading "-".
 */
export function normalizeProductQuery(q: string): string {
  return q
    .trim()
    .replace(/^-+/, '')
    .replace(/([A-Za-z؀-ۿ]{2,})(\d{2,})/g, '$1 $2')
    .replace(/(\d{2,})([A-Za-z؀-ۿ]{2,})/g, '$1 $2');
}

export interface ProductHit {
  id: string;
  name: string;
  name_in_arabic?: string;
  part_number?: string;
  prefix_part_number?: string;
  item_code?: string;
  brand_name?: string;
  country_name?: string;
  unit?: string;
  is_service?: boolean;
  allow_duplicates?: boolean;
  product_stores?: Record<string, {
    retail_unit_price?: number; retail_unit_price_with_vat?: number;
    purchase_unit_price?: number; purchase_unit_price_with_vat?: number;
    wholesale_unit_price?: number; wholesale_unit_price_with_vat?: number;
    stock?: number; warehouse_stocks?: Record<string, number>; warehouse_racks?: Record<string, string>;
  }>;
}

const productSelect = (sid: string) =>
  ['id', 'name', 'name_in_arabic', 'part_number', 'prefix_part_number', 'item_code', 'brand_name', 'country_name', 'unit', 'is_service', 'allow_duplicates', 'set.name']
    .concat(['purchase_unit_price', 'purchase_unit_price_with_vat', 'retail_unit_price', 'retail_unit_price_with_vat', 'wholesale_unit_price', 'wholesale_unit_price_with_vat', 'stock', 'warehouse_stocks', 'warehouse_racks'].map((f) => `product_stores.${sid}.${f}`))
    .join(',');

export const partLabel = (p: Pick<ProductHit, 'prefix_part_number' | 'part_number'>) =>
  [p.prefix_part_number, p.part_number].filter(Boolean).join('-');

export async function searchProducts(storeId: string, q: string, signal?: AbortSignal, extra: Record<string, string | number> = {}): Promise<ProductHit[]> {
  const r = await api.get<ProductHit[]>('/v1/product', { search: { store_id: storeId, search_text: normalizeProductQuery(q), ...extra }, limit: 30, select: productSelect(storeId) }, signal);
  return r.result || [];
}

export async function productByBarcode(storeId: string, code: string): Promise<ProductHit | null> {
  try {
    const r = await api.get<ProductHit>(`/v1/product/barcode/${encodeURIComponent(code.trim())}`, { search: { store_id: storeId }, select: productSelect(storeId) });
    return r.result || null;
  } catch {
    return null;
  }
}

export type PriceSource = 'retail' | 'wholesale' | 'purchase';

export function productToOption(p: ProductHit, storeId: string, source: PriceSource): PickerOption<ProductHit> {
  const ps = p.product_stores?.[storeId] || {};
  const price = source === 'purchase' ? ps.purchase_unit_price_with_vat : source === 'wholesale' ? ps.wholesale_unit_price_with_vat : ps.retail_unit_price_with_vat;
  const stock = ps.stock ?? 0;
  return {
    id: p.id,
    label: p.name,
    sub: [partLabel(p), p.brand_name, p.country_name, p.is_service ? 'Service' : `${stock} ${p.unit || ''} in stock`].filter(Boolean).join(' · '),
    right: price ? fmtMoney(price) : '',
    data: p,
  };
}

/** Build a document line from a product with the store's price list (sales.md §1.2). */
export function productToLine(p: ProductHit, storeId: string, source: PriceSource, vat: number): DocLine {
  const ps = p.product_stores?.[storeId] || {};
  const up = source === 'purchase' ? ps.purchase_unit_price : source === 'wholesale' ? ps.wholesale_unit_price || ps.retail_unit_price : ps.retail_unit_price;
  const upv = source === 'purchase' ? ps.purchase_unit_price_with_vat : source === 'wholesale' ? ps.wholesale_unit_price_with_vat || ps.retail_unit_price_with_vat : ps.retail_unit_price_with_vat;
  return makeLine(
    {
      product_id: p.id,
      name: p.name,
      name_in_arabic: p.name_in_arabic,
      part_number: p.part_number,
      unit: p.unit,
      quantity: 1,
      unit_price: up ?? undefined,
      // At 0% VAT (non-VAT sales, no-tax quotations) the incl.-VAT price equals the ex-VAT price.
      unit_price_with_vat: vat === 0 && up !== undefined ? up : upv ?? undefined,
      purchase_unit_price: ps.purchase_unit_price ?? 0,
      purchase_unit_price_with_vat: ps.purchase_unit_price_with_vat ?? 0,
      stock: ps.stock ?? 0,
      is_service: !!p.is_service,
      allow_duplicates: !!p.allow_duplicates,
    },
    vat,
  );
}

/** Add a product to lines: bump quantity when already present (unless duplicates are allowed). */
export function addProductLine(lines: DocLine[], line: DocLine): DocLine[] {
  const i = lines.findIndex((l) => l.product_id && l.product_id === line.product_id && !l.allow_duplicates);
  if (i < 0 || line.allow_duplicates) return [...lines, line];
  const next = [...lines];
  next[i] = { ...next[i], quantity: next[i].quantity + 1 };
  return next;
}

export interface Party {
  id: string;
  name: string;
  name_in_arabic?: string;
  code?: string;
  phone?: string;
  vat_no?: string;
  email?: string;
  credit_limit?: number;
  credit_balance?: number;
  remarks?: string;
  use_remarks_in_sales?: boolean;
  address?: string;
  stores?: Record<string, any>;
  [k: string]: any;
}

const partySelect = 'id,code,name,name_in_arabic,phone,vat_no,email,credit_limit,credit_balance,remarks,use_remarks_in_sales,use_remarks_in_purchases,address,stores';

export async function searchParties(kind: 'customer' | 'vendor', storeId: string, q: string, signal?: AbortSignal): Promise<Party[]> {
  const r = await api.get<Party[]>(`/v1/${kind}`, { search: { store_id: storeId, query: q }, limit: 20, select: partySelect }, signal);
  return r.result || [];
}

export function partyToOption(p: Party): PickerOption<Party> {
  return {
    id: p.id,
    label: p.name,
    sub: [p.code, p.phone, p.vat_no && `VAT ${p.vat_no}`].filter(Boolean).join(' · '),
    right: p.credit_balance ? fmtMoney(p.credit_balance) : '',
    data: p,
  };
}

export async function loadWarehouses(storeId: string): Promise<{ id: string; code: string; name: string }[]> {
  try {
    const r = await api.get<any[]>('/v1/warehouse', { search: { store_id: storeId }, limit: 100, select: 'id,code,name' });
    return r.result || [];
  } catch {
    return [];
  }
}
