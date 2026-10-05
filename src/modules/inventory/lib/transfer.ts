/**
 * Stock-transfer helpers (masters.md §9). Pure — see transfer.test.ts.
 */
import { MAIN_STORE } from './pricing';

export interface Warehouse { id: string; code: string; name: string }

export interface TransferEnds {
  from_warehouse_id: string | null;
  from_warehouse_code: string | null;
  to_warehouse_id: string | null;
  to_warehouse_code: string | null;
}

/** Location value used by <select>: '' is the Main Store, otherwise the warehouse id. */
export function endsFromSelect(fromId: string, toId: string, warehouses: Warehouse[]): TransferEnds {
  const f = warehouses.find((w) => w.id === fromId);
  const t = warehouses.find((w) => w.id === toId);
  return { from_warehouse_id: f?.id || null, from_warehouse_code: f?.code || null, to_warehouse_id: t?.id || null, to_warehouse_code: t?.code || null };
}

/** Same rules as the server (both Main Store / same location). */
export function validateEnds(e: TransferEnds): Record<string, string> {
  const out: Record<string, string> = {};
  if (!e.from_warehouse_id && !e.to_warehouse_id) {
    out.from_warehouse_id = 'Both From & To warehouse cannot be Main Store';
    out.to_warehouse_id = 'Both From & To warehouse cannot be Main Store';
  } else if (e.from_warehouse_id && e.from_warehouse_id === e.to_warehouse_id) {
    out.to_warehouse_id = 'Choose different warehouse';
  }
  return out;
}

/** Human label for a location code (null / main_store → Main Store). */
export function locationName(code: string | null | undefined, warehouses: Warehouse[] = [], main = 'Main Store'): string {
  if (!code || code === MAIN_STORE) return main;
  const w = warehouses.find((x) => x.code === code);
  return w ? `${w.code} · ${w.name}` : code;
}

/**
 * Non-blocking availability warnings (create only): qty above the stock held at the source.
 * Returns { quantity_<i>: { code, have } } for lines whose (summed) quantity exceeds the source stock.
 */
export function stockWarnings(
  lines: { product_id: string | null; quantity: number }[],
  stocks: Record<string, Record<string, number> | undefined>,
  fromCode: string | null,
): Record<string, { code: string; have: number }> {
  const code = fromCode || MAIN_STORE;
  const need = new Map<string, number>();
  lines.forEach((l) => { if (l.product_id) need.set(l.product_id, (need.get(l.product_id) || 0) + (Number(l.quantity) || 0)); });
  const out: Record<string, { code: string; have: number }> = {};
  lines.forEach((l, i) => {
    if (!l.product_id) return;
    const ws = stocks[l.product_id];
    if (!ws) return;
    const have = ws[code] ?? 0;
    if ((need.get(l.product_id) || 0) > have) out[`quantity_${i}`] = { code, have };
  });
  return out;
}
