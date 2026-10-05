/** Service drawer state ↔ API body (services are products with is_service=true, masters.md §6). */
import { normalizeServiceUnit, type StorePrices } from './pricing';

export interface ServiceForm {
  name: string; name_in_arabic: string; item_code: string; unit: string; note: string;
  category: { id: string; label: string } | null;
  duration_minutes: number; duration_unit: string; delivery_mode: string; booking_required: boolean;
  prices: StorePrices;
}

const blankPrices = (): StorePrices => ({ purchase_unit_price: 0, purchase_unit_price_with_vat: 0, wholesale_unit_price: 0, wholesale_unit_price_with_vat: 0, retail_unit_price: 0, retail_unit_price_with_vat: 0, wholesale_margin_percent: 0, retail_margin_percent: 0 });

export function serviceFromApi(p: Record<string, any> | null, storeId: string): ServiceForm {
  const ps = p?.product_stores?.[storeId] || {};
  return {
    name: p?.name || '', name_in_arabic: p?.name_in_arabic || '', item_code: p?.item_code || '', unit: normalizeServiceUnit(p?.unit), note: p?.note || '',
    category: p?.service_category_id ? { id: p.service_category_id, label: p.service_category_name || p.service_category_id } : null,
    duration_minutes: Number(p?.duration_minutes) || 0, duration_unit: p?.duration_unit || 'minutes', delivery_mode: p?.delivery_mode || '', booking_required: !!p?.booking_required,
    prices: { ...blankPrices(), ...Object.fromEntries(Object.keys(blankPrices()).map((k) => [k, Number(ps[k]) || 0])) },
  };
}

/** POST/PUT body: a product with is_service=true; the store entry keeps server counters. */
export function serviceToApi(f: ServiceForm, storeId: string, existingStore?: Record<string, any> | null): Record<string, any> {
  return {
    store_id: storeId, is_service: true, name: f.name.trim(), name_in_arabic: f.name_in_arabic.trim(), item_code: f.item_code.trim(), unit: f.unit || 'C62', note: f.note,
    service_category_id: f.category?.id || null, service_category_name: f.category?.label || '',
    duration_minutes: Math.max(0, Math.round(Number(f.duration_minutes) || 0)), duration_unit: f.duration_unit || 'minutes',
    delivery_mode: f.delivery_mode, booking_required: f.booking_required,
    product_stores: { [storeId]: { ...(existingStore || {}), store_id: storeId, ...f.prices } },
  };
}

export function validateService(f: ServiceForm): Record<string, string> {
  const e: Record<string, string> = {};
  if (!f.name.trim()) e.name = 'Name is required';
  else if (f.name.trim().length < 3) e.name = 'Name length should be min. 3 chars';
  if (!f.unit) e.unit = 'Unit is required';
  (['purchase_unit_price', 'wholesale_unit_price', 'retail_unit_price'] as const).forEach((k) => { if (f.prices[k] < 0) e[k] = 'Price should not be < 0'; });
  return e;
}

