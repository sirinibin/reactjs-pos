/**
 * Conversions into a new sales invoice (sales.md §10.3):
 *  - quotation → invoice      (/sales/invoices/new?quotation_id=…)
 *  - delivery note → invoice  (/sales/invoices/new?delivery_note_id=…)
 *  - workshop repair job → invoice (sessionStorage `workshop_invoice_prefill`, written by the workshop module)
 * All mappers are pure so they can be unit-tested; `loadInvoicePrefill` does the fetching.
 */
// Relative imports so the live-API integration tests can use these mappers (their config has no "@/" alias).
import { api } from '../../api/client';
import { applyVat, linesFromApi, r8, type DocLine } from '../../framework/doc/calc';
import type { DocState } from '../../framework/doc/DocumentEditor';

export const WORKSHOP_PREFILL_KEY = 'workshop_invoice_prefill';
export const ZERO_ID = '000000000000000000000000';

export interface WorkshopPrefill {
  customer_id?: string | null;
  customer_name?: string;
  vehicle_id?: string | null;
  km_driven?: number;
  repair_job_ids?: string[];
  products?: any[];
}

export type InvoiceSource = { kind: 'quotation' | 'delivery_note' | 'customer'; id: string };

const safeStorage = (): Storage | null => {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage;
  } catch {
    return null;
  }
};

/** Read (without removing) the workshop hand-over; invalid JSON is discarded. */
export function readWorkshopPrefill(storage: Storage | null = safeStorage()): WorkshopPrefill | null {
  if (!storage) return null;
  const raw = storage.getItem(WORKSHOP_PREFILL_KEY);
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    return v && typeof v === 'object' ? (v as WorkshopPrefill) : null;
  } catch {
    storage.removeItem(WORKSHOP_PREFILL_KEY);
    return null;
  }
}

export function clearWorkshopPrefill(storage: Storage | null = safeStorage()) {
  storage?.removeItem(WORKSHOP_PREFILL_KEY);
}

/** Party option for the editor: a real customer id, or a free-text name (server creates the customer). */
export function partyOption(id: string | null | undefined, name: string | undefined): DocState['party'] {
  if (id && id !== ZERO_ID) return { id, label: name || '', data: { id, name: name || '' } };
  if (name) return { id: `new:${name}`, label: name, data: { id: '', name } };
  return null;
}

/** Lines copied from another document: fresh keys, no returned quantities, VAT re-derived for the invoice. */
export function copyLines(products: any[] | undefined, vat: number): DocLine[] {
  const lines = linesFromApi(products, vat).map((l) => {
    const { quantity_returned: _q, selected: _s, profit: _p, loss: _l, ...rest } = l as DocLine & Record<string, unknown>;
    return rest as DocLine;
  });
  return applyVat(lines, vat);
}

export function workshopToDocState(p: WorkshopPrefill, vat: number): Partial<DocState> {
  const ids = (p.repair_job_ids || []).filter(Boolean);
  return {
    party: partyOption(p.customer_id, p.customer_name),
    lines: copyLines(p.products, vat),
    extra: {
      vehicle_id: p.vehicle_id || null,
      km_driven: Number(p.km_driven) || 0,
      repair_job_id: ids[0] || null,
      repair_job_ids: ids,
      _source: { kind: 'repair_job', code: ids.length > 1 ? `${ids.length}` : '' },
    },
  };
}

const summaryFrom = (d: any, vat: number) => ({
  vat_percent: vat,
  shipping_handling_fees: d.shipping_handling_fees || 0,
  discount: d.discount || 0,
  discount_with_vat: d.discount_with_vat || 0,
  auto_rounding_amount: d.auto_rounding_amount ?? true,
  rounding_amount: d.auto_rounding_amount === false ? d.rounding_amount || 0 : 0,
  cash_discount: 0,
});

/** Quotation → invoice: party, contact, lines, header discount/shipping, link ids (sales.md §1.4 import). */
export function quotationToDocState(q: any, vat: number): Partial<DocState> {
  const extra: Record<string, any> = {
    quotation_id: q.id,
    quotation_code: q.code,
    quotation_ids: [q.id],
    quotation_codes: [q.code],
    _source: { kind: 'quotation', id: q.id, code: q.code, invoicedAs: q.order_code || null },
  };
  if (q.vehicle_id) Object.assign(extra, { vehicle_id: q.vehicle_id, km_driven: q.km_driven || 0 });
  if (q.repair_job_id) Object.assign(extra, { repair_job_id: q.repair_job_id, repair_job_ids: q.repair_job_ids || [q.repair_job_id] });
  return {
    party: partyOption(q.customer_id, q.customer_name),
    phone: q.phone || '',
    vat_no: q.vat_no || '',
    address: q.address || '',
    remarks: q.remarks || '',
    lines: copyLines(q.products, vat),
    summary: summaryFrom(q, vat),
    extra,
  };
}

export interface FreshPrice { unit_price: number; unit_price_with_vat: number; purchase_unit_price?: number; purchase_unit_price_with_vat?: number; stock?: number }

/**
 * Delivery note → invoice. DN prices are used when the note carries them (add_price_details_in_delivery_note);
 * lines without a price take the current retail price from `fresh` (keyed by product id).
 */
export function deliveryNoteToDocState(dn: any, vat: number, fresh: Record<string, FreshPrice> = {}): Partial<DocState> {
  const lines = copyLines(dn.products, vat).map((l) => {
    const f = l.product_id ? fresh[l.product_id] : undefined;
    if (l.unit_price > 0 || !f) return { ...l, ...(f?.stock !== undefined ? { stock: f.stock } : {}) };
    const up = f.unit_price || r8((f.unit_price_with_vat || 0) / (1 + vat / 100));
    return { ...l, unit_price: up, unit_price_with_vat: r8(up * (1 + vat / 100)), purchase_unit_price: f.purchase_unit_price ?? l.purchase_unit_price, purchase_unit_price_with_vat: f.purchase_unit_price_with_vat ?? l.purchase_unit_price_with_vat, stock: f.stock };
  });
  return {
    party: partyOption(dn.customer_id, dn.customer_name),
    remarks: dn.remarks || '',
    lines,
    summary: summaryFrom(dn, vat),
    extra: { delivery_note_id: dn.id, _source: { kind: 'delivery_note', id: dn.id, code: dn.code, invoicedAs: dn.order_code || null } },
  };
}

/** Product ids whose current price must be fetched for a DN conversion. */
export const missingPriceIds = (dn: any): string[] =>
  Array.from(new Set((dn.products || []).filter((p: any) => p.product_id && !(Number(p.unit_price) > 0)).map((p: any) => String(p.product_id))));

export const CUSTOMER_PREFILL_SELECT = 'id,name,phone,vat_no,credit_limit,credit_balance,address,remarks,use_remarks_in_sales';

/** ?customer_id= (e.g. from Customer 360): party + contact details, remarks when the customer uses them in sales. */
export function customerToDocState(c: any): Partial<DocState> {
  if (!c?.id) return {};
  return {
    party: { id: c.id, label: c.name || '', data: c },
    phone: c.phone || '',
    vat_no: c.vat_no || '',
    address: c.address || '',
    ...(c.use_remarks_in_sales && c.remarks ? { remarks: c.remarks } : {}),
  };
}

export async function loadCustomerPrefill(id: string, storeId: string, signal?: AbortSignal): Promise<Partial<DocState>> {
  const r = await api.get<any>(`/v1/customer/${id}`, { search: { store_id: storeId }, select: CUSTOMER_PREFILL_SELECT }, signal);
  return customerToDocState(r.result);
}

/** Fetch the source document (and, for DNs without prices, current product prices) and build the editor prefill. */
export async function loadInvoicePrefill(src: InvoiceSource, storeId: string, vat: number, signal?: AbortSignal): Promise<Partial<DocState>> {
  const q = { search: { store_id: storeId } };
  if (src.kind === 'customer') return loadCustomerPrefill(src.id, storeId, signal);
  if (src.kind === 'quotation') {
    const r = await api.get<any>(`/v1/quotation/${src.id}`, q, signal);
    return quotationToDocState(r.result, vat);
  }
  const r = await api.get<any>(`/v1/delivery-note/${src.id}`, q, signal);
  const dn = r.result;
  const fresh: Record<string, FreshPrice> = {};
  await Promise.all(missingPriceIds(dn).map(async (pid) => {
    try {
      const p = (await api.get<any>(`/v1/product/${pid}`, { ...q, select: 'id,product_stores' }, signal)).result;
      const ps = p?.product_stores?.[storeId] || {};
      fresh[pid] = { unit_price: ps.retail_unit_price || 0, unit_price_with_vat: ps.retail_unit_price_with_vat || 0, purchase_unit_price: ps.purchase_unit_price, purchase_unit_price_with_vat: ps.purchase_unit_price_with_vat, stock: ps.stock };
    } catch {
      /* keep the DN line as is — the user can type the price */
    }
  }));
  return deliveryNoteToDocState(dn, vat, fresh);
}

/** Strip UI-only extra keys (prefixed with "_") before posting. */
export function stripPrivate(body: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(body)) if (!k.startsWith('_')) out[k] = v;
  return out;
}
