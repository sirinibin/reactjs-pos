/**
 * Purchasing — endpoints and pure mappers between the shared document engine
 * (DocLine.unit_price = the document's own price) and the Go API's purchase shapes.
 * Spec: specs/purchase.md §1–§11, specs/masters.md §4.
 */
import { computeTotals, linesFromApi, makeLine, r2, r8, type DocLine, type PaymentRow } from '../../framework/doc/calc';
import type { DocState } from '../../framework/doc/DocumentEditor';
import type { SummaryValues } from '../../framework/doc/Summary';

export const EP = {
  purchase: '/v1/purchase',
  ret: '/v1/purchase-return',
  po: '/v1/purchase-order',
  pr: '/v1/purchase-request',
  pay: '/v1/purchase-payment',
  retPay: '/v1/purchase-return-payment',
  cd: '/v1/purchase-cash-discount',
  vendor: '/v1/vendor',
  vcat: '/v1/vendor-category',
  pm: '/v1/procurement-messages',
  product: '/v1/product',
  user: '/v1/user',
} as const;

export const PATHS = {
  purchases: '/buying/purchases',
  returns: '/buying/returns',
  orders: '/buying/orders',
  requests: '/buying/requests',
  payments: '/buying/payments',
  returnPayments: '/buying/return-payments',
  cashDiscounts: '/buying/cash-discounts',
  vendors: '/buying/vendors',
  bills: '/buying/bill-images',
} as const;

export type Doc = Record<string, any> & { id: string; code: string };

const vf = (vat: number) => 1 + (vat || 0) / 100;

// ───────────────────────────── line price keys ─────────────────────────────

/** Copy `<prefix>_unit_price(_with_vat)` into the engine's `unit_price(_with_vat)`. */
export function normalizeDocLines(doc: any, prefix: 'purchase' | 'purchasereturn'): any {
  if (!doc) return doc;
  const vat = doc.vat_percent ?? 15;
  return {
    ...doc,
    products: (doc.products || []).map((p: any) => {
      const up = Number(p[`${prefix}_unit_price`] ?? p.unit_price) || 0;
      const upv = Number(p[`${prefix}_unit_price_with_vat`] ?? p.unit_price_with_vat) || r8(up * vf(vat));
      const ud = Number(p.unit_discount) || 0;
      return { ...p, unit_price: up, unit_price_with_vat: upv, unit_discount: ud, unit_discount_with_vat: Number(p.unit_discount_with_vat) || r8(ud * vf(vat)) };
    }),
  };
}

/** Rename engine price keys to the API's purchase keys (purchase_unit_price / purchasereturn_unit_price). */
export function renamePriceKeys(products: Record<string, any>[], prefix: 'purchase' | 'purchasereturn'): Record<string, any>[] {
  return products.map((p) => {
    const { unit_price, unit_price_with_vat, ...rest } = p;
    const out: Record<string, any> = { ...rest, [`${prefix}_unit_price`]: unit_price ?? 0, [`${prefix}_unit_price_with_vat`]: unit_price_with_vat ?? 0 };
    if (prefix === 'purchasereturn') { delete out.purchase_unit_price; delete out.purchase_unit_price_with_vat; }
    return out;
  });
}

/** Payments still on the document after the user's edits (Σ of non-deleted rows). */
export const paidSum = (payments: PaymentRow[]) => r2(payments.filter((p) => !p.deleted).reduce((a, p) => a + (Number(p.amount) || 0), 0));

/** balance_amount the server uses for the vendor credit-limit check (purchase.md §1.6). */
export function balanceForCreditCheck(s: Pick<DocState, 'lines' | 'summary' | 'payments'>): number {
  const t = computeTotals({ lines: s.lines, ...s.summary });
  return r2(t.net_total - (s.summary.cash_discount || 0) - paidSum(s.payments));
}

// ───────────────────────────── selling prices (purchase price-update behaviour) ─────────────────────────────

export interface SellPrice { retail?: number; wholesale?: number; curRetail?: number; curWholesale?: number }
export type SellMap = Record<string, SellPrice>;

/**
 * Validation for selling prices typed on a purchase: the purchase price (ex VAT, net of unit discount)
 * may not exceed the retail or wholesale price (legacy checkError, create.js:2878).
 */
export function validateSellPrices(lines: DocLine[], sell: SellMap | undefined): Record<string, string> {
  const e: Record<string, string> = {};
  if (!sell) return e;
  lines.forEach((l, i) => {
    const sp = sell[l.key];
    if (!sp) return;
    const cost = r8(l.unit_price - (l.unit_discount || 0));
    const retail = sp.retail ?? sp.curRetail ?? 0;
    const wholesale = sp.wholesale ?? sp.curWholesale ?? 0;
    if (retail > 0 && cost > retail) e[`retail_unit_price_${i}`] = 'Purchase price is higher than the retail price.';
    if (wholesale > 0 && cost > wholesale) e[`wholesale_unit_price_${i}`] = 'Purchase price is higher than the wholesale price.';
  });
  return e;
}

export const marginPct = (cost: number, price: number) => (cost > 0 && price > 0 ? r2(((price - cost) / cost) * 100) : null);

/** Attach retail/wholesale prices to API product rows (only values > 0 are applied by the server). */
export function attachSellPrices(products: Record<string, any>[], lines: DocLine[], sell: SellMap | undefined, vat: number): Record<string, any>[] {
  return products.map((p, i) => {
    const sp = sell?.[lines[i]?.key];
    const retail = sp?.retail;
    const wholesale = sp?.wholesale;
    return {
      ...p,
      ...(retail && retail > 0 ? { retail_unit_price: retail, retail_unit_price_with_vat: r2(retail * vf(vat)) } : {}),
      ...(wholesale && wholesale > 0 ? { wholesale_unit_price: wholesale, wholesale_unit_price_with_vat: r2(wholesale * vf(vat)) } : {}),
    };
  });
}

// ───────────────────────────── purchase ─────────────────────────────

export function purchaseToApi(body: Record<string, any>, s: DocState): Record<string, any> {
  const { sell, ...rest } = body;
  const vat = s.summary.vat_percent;
  const products = attachSellPrices(renamePriceKeys(rest.products || [], 'purchase'), s.lines, sell as SellMap, vat);
  const out: Record<string, any> = { ...rest, products, status: rest.status || 'delivered', balance_amount: balanceForCreditCheck(s) };
  out.commission = Number(out.commission) || 0;
  if (!out.commission) out.commission_payment_method = '';
  if (!out.order_placed_by) delete out.order_placed_by;
  return out;
}

/** Merge lines into an existing list: same product (unless duplicates allowed) adds quantity (PO → purchase picker). */
export function mergeLines(existing: DocLine[], incoming: DocLine[]): DocLine[] {
  const out = existing.map((l) => ({ ...l }));
  for (const l of incoming) {
    const i = out.findIndex((x) => x.product_id && x.product_id === l.product_id && !x.allow_duplicates);
    if (i >= 0) out[i] = { ...out[i], quantity: r8(out[i].quantity + l.quantity), line_discount_with_vat: undefined };
    else out.push({ ...l });
  }
  return out;
}

const fullSummary = (doc: any, vat: number): SummaryValues => ({
  vat_percent: doc?.vat_percent ?? vat,
  shipping_handling_fees: Number(doc?.shipping_handling_fees) || 0,
  discount: Number(doc?.discount) || 0,
  discount_with_vat: Number(doc?.discount_with_vat) || r2((Number(doc?.discount) || 0) * vf(doc?.vat_percent ?? vat)),
  auto_rounding_amount: doc?.auto_rounding_amount ?? true,
  rounding_amount: Number(doc?.rounding_amount) || 0,
  cash_discount: 0,
});

const partyFrom = (doc: any) => (doc?.vendor_id ? { id: doc.vendor_id, label: doc.vendor_name || '', data: { id: doc.vendor_id, name: doc.vendor_name || '', vat_no: doc.vat_no, phone: doc.phone } } : doc?.vendor_name ? { id: `new:${doc.vendor_name}`, label: doc.vendor_name, data: { id: '', name: doc.vendor_name } } : null);

/** New purchase prefilled from a purchase order (client-side copy, legacy "From P.O."). */
export function purchaseFromPo(po: any, vat: number, base?: Partial<DocState> | null): Partial<DocState> {
  const lines = linesFromApi(normalizeDocLines(po, 'purchase').products, po.vat_percent ?? vat).map((l) => ({ ...l, quantity_returned: 0 }));
  if (base?.lines?.length) {
    return { ...base, lines: mergeLines(base.lines, lines), extra: { ...(base.extra || {}), purchase_order_id: po.id, purchase_order_code: po.code } };
  }
  return {
    party: partyFrom(po),
    phone: po.phone || '', vat_no: po.vat_no || '', address: po.address || '', remarks: po.remarks || '',
    lines,
    summary: fullSummary(po, vat),
    extra: { vendor_invoice_no: po.vendor_invoice_no || '', purchase_order_id: po.id, purchase_order_code: po.code },
  };
}

/** Body that marks a PO received and links it to the purchase created from it (PUT is a full replace). */
export function poReceivedBody(po: any, storeId: string, purchase?: { id: string; code: string }): Record<string, any> {
  const { id: _id, code: _code, created_at: _c, updated_at: _u, ...rest } = po;
  return {
    ...rest,
    store_id: storeId,
    date_str: po.date || po.date_str,
    ...(po.expected_date ? { expected_date_str: po.expected_date } : {}),
    status: 'received',
    ...(purchase ? { purchase_id: purchase.id, purchase_code: purchase.code } : {}),
  };
}

// ───────────────────────────── purchase return ─────────────────────────────

/** Lines a new return starts with: every purchase line with quantity still returnable. */
export function returnLinesFromPurchase(purchase: any): DocLine[] {
  const n = normalizeDocLines(purchase, 'purchase');
  return linesFromApi(n.products, n.vat_percent ?? 15)
    .map((l, i) => {
      const remaining = r8(l.quantity - (Number(l.quantity_returned) || 0));
      return { ...l, quantity: remaining, max_qty: remaining, src_index: i, quantity_returned: 0, line_discount_with_vat: l.unit_discount_with_vat ? r2(l.unit_discount_with_vat * remaining) : undefined };
    })
    .filter((l) => l.quantity > 0);
}

/** The return API only accepts Saudi mobile numbers (ValidateSaudiPhone: ^(?:\+966|0)5\d{8}$). */
export const isSaudiMobile = (p: string) => /^(?:\+966|0)5\d{8}$/.test(String(p || '').trim());

/** Prefill for a new purchase return (purchase_return/create.js getPurchase, :443). */
export function returnPrefill(purchase: any, userId: string | undefined, vat: number): Partial<DocState> {
  const summary = fullSummary(purchase, vat);
  summary.discount = r2((Number(purchase.discount) || 0) - (Number(purchase.return_discount) || 0));
  summary.discount_with_vat = r2((Number(purchase.discount_with_vat) || 0) - (Number(purchase.return_discount_with_vat) || 0));
  summary.cash_discount = Math.max(0, r2((Number(purchase.cash_discount) || 0) - (Number(purchase.return_cash_discount) || 0)));
  return {
    party: partyFrom(purchase),
    // Landline numbers on the bill would be rejected by the return API — leave them out.
    phone: isSaudiMobile(purchase.phone) ? purchase.phone : '', vat_no: purchase.vat_no || '', address: purchase.address || '', remarks: purchase.remarks || '',
    lines: returnLinesFromPurchase(purchase),
    summary,
    ...(purchase.payment_status === 'not_paid' ? { payments: [] } : {}),
    extra: {
      purchase_id: purchase.id, purchase_code: purchase.code, vendor_invoice_no: '',
      purchase_returned_by: purchase.order_placed_by || userId || '',
      purchase_returned_by_name: purchase.order_placed_by ? purchase.order_placed_by_name || '' : '',
      enable_on_accounts: !!purchase.enable_on_accounts,
    },
  };
}

/** Existing return → editor doc: only selected lines, engine price keys, max qty from the purchase. */
export function returnDocForEditor(ret: any, purchase: any | null): any {
  const n = normalizeDocLines(ret, 'purchasereturn');
  const products = (n.products || [])
    .map((p: any, i: number) => {
      const pp = purchase?.products?.find((x: any) => x.product_id === p.product_id);
      const max = pp ? r8(pp.quantity - (Number(pp.quantity_returned) || 0) + (p.selected ? p.quantity : 0)) : undefined;
      return { ...p, src_index: i, max_qty: max };
    })
    .filter((p: any) => p.selected);
  return { ...n, products };
}

/**
 * API products for a return: the FULL base list (purchase lines on create, stored return lines on update — the
 * server indexes the old return's products by position) with `selected` set for lines the user kept.
 */
export function buildReturnProducts(base: any[], lines: DocLine[], baseIsReturn: boolean): Record<string, any>[] {
  return base.map((b, j) => {
    const l = lines.find((x) => x.src_index === j);
    const price = Number(baseIsReturn ? b.purchasereturn_unit_price : b.purchase_unit_price) || 0;
    const priceVat = Number(baseIsReturn ? b.purchasereturn_unit_price_with_vat : b.purchase_unit_price_with_vat) || 0;
    const common = {
      product_id: b.product_id, name: b.name, name_in_arabic: b.name_in_arabic, part_number: b.part_number || '', prefix_part_number: b.prefix_part_number || '',
      unit: b.unit || '', warehouse_id: b.warehouse_id || null, warehouse_code: b.warehouse_code || null, is_service: !!b.is_service,
    };
    if (!l) {
      const qty = baseIsReturn ? Number(b.quantity) || 0 : r8((Number(b.quantity) || 0) - (Number(b.quantity_returned) || 0));
      return {
        ...common, quantity: qty, selected: false,
        purchasereturn_unit_price: price, purchasereturn_unit_price_with_vat: priceVat,
        unit_discount: Number(b.unit_discount) || 0, unit_discount_with_vat: Number(b.unit_discount_with_vat) || 0,
        unit_discount_percent: Number(b.unit_discount_percent) || 0, unit_discount_percent_with_vat: Number(b.unit_discount_percent_with_vat) || 0,
      };
    }
    return {
      ...common, name: l.name, quantity: l.quantity, selected: true,
      warehouse_id: l.warehouse_id || common.warehouse_id, warehouse_code: l.warehouse_code || common.warehouse_code,
      purchasereturn_unit_price: l.unit_price, purchasereturn_unit_price_with_vat: l.unit_price_with_vat,
      unit_discount: l.unit_discount, unit_discount_with_vat: l.unit_discount_with_vat,
      unit_discount_percent: l.unit_discount_percent, unit_discount_percent_with_vat: l.unit_discount_percent_with_vat,
    };
  });
}

/** Client checks the server skips (purchase.md §2.1: no server check that qty ≤ purchased − returned). */
export function validateReturnLines(lines: DocLine[], tr: (k: string, o?: Record<string, unknown>) => string = (k, o) => k.replace('{{n}}', String(o?.n ?? ''))): Record<string, string> {
  const e: Record<string, string> = {};
  if (!lines.length) e.product_id = tr('No products selected');
  lines.forEach((l, i) => {
    if (typeof l.src_index !== 'number') e[`name_${i}`] = tr('This item is not on the original purchase.');
    const max = typeof l.max_qty === 'number' ? l.max_qty : undefined;
    if (max !== undefined && l.quantity > max + 1e-9) e[`quantity_${i}`] = tr('Only {{n}} can be returned.', { n: max });
  });
  return e;
}

/** Payments to PUT on a return when recording a refund (POST /purchase-return-payment panics server-side). */
export function refundPaymentsInput(ret: any, add: { amount: number; method: string; date_str: string; description?: string }) {
  const existing = (ret.payments || []).filter((p: any) => !p.deleted).map((p: any) => ({
    id: p.id, date_str: p.date_str || p.date, amount: p.amount, method: p.method, description: p.description || '',
  }));
  return [...existing, { ...add, description: add.description || '' }];
}

// ───────────────────────────── purchase order / request ─────────────────────────────

export const PO_STATUSES = ['draft', 'sent', 'confirmed', 'partially_received', 'received', 'cancelled'] as const;
export type PoStatus = (typeof PO_STATUSES)[number];
export const PR_STATUSES = ['pending', 'accepted', 'partially_accepted', 'rejected'] as const;

/** PO/PR products carry is_service + item codes; drop warehouse-free keys the API does not know. */
export function poProductsToApi(products: Record<string, any>[], lines: DocLine[]): Record<string, any>[] {
  return renamePriceKeys(products, 'purchase').map((p, i) => ({
    ...p,
    is_service: !!lines[i]?.is_service,
    item_code: (lines[i]?.item_code as string) || '',
    prefix_part_number: (lines[i]?.prefix_part_number as string) || '',
  }));
}

/** Prefill a PO from a purchase request (legacy openFromPR). */
export function poFromPr(pr: any, vat: number): Partial<DocState> {
  const n = normalizeDocLines({ ...pr, vat_percent: pr.vat_percent || vat }, 'purchase');
  return {
    lines: linesFromApi(n.products, pr.vat_percent || vat),
    remarks: pr.notes || '',
    summary: { ...fullSummary({ ...pr, vat_percent: pr.vat_percent || vat }, vat) },
    extra: { purchase_request_id: pr.id, purchase_request_code: pr.code, status: 'draft' },
  };
}

/** Purchase-request list query — this endpoint paginates through search[] keys (purchase.md §4.1). */
export function prListQuery(o: { storeId: string; page: number; limit: number; sortBy?: string; dir?: 1 | -1; tab: 'sent' | 'received' | 'all'; userId?: string; status?: string; code?: string }) {
  return {
    search: {
      store_id: o.storeId,
      page: o.page,
      limit: o.limit,
      sort_by: o.sortBy || 'created_at',
      sort_order: o.dir === 1 ? 'asc' : 'desc',
      ...(o.tab === 'sent' && o.userId ? { created_by: o.userId } : {}),
      ...(o.tab === 'received' && o.userId ? { assigned_to: o.userId } : {}),
      ...(o.status ? { status: o.status } : {}),
      ...(o.code ? { code: o.code } : {}),
    },
  };
}

/** PR body: no party, notes instead of remarks, assigned_to required. */
export function prToApi(body: Record<string, any>, s: DocState): Record<string, any> {
  const products = renamePriceKeys(body.products || [], 'purchase').map((p, i) => ({
    product_id: p.product_id, name: p.name, name_in_arabic: p.name_in_arabic, part_number: p.part_number, prefix_part_number: (s.lines[i]?.prefix_part_number as string) || '',
    item_code: (s.lines[i]?.item_code as string) || '', quantity: p.quantity, unit: p.unit, purchase_unit_price: p.purchase_unit_price,
    purchase_unit_price_with_vat: p.purchase_unit_price_with_vat, unit_discount: p.unit_discount, is_service: !!s.lines[i]?.is_service,
  }));
  return {
    store_id: body.store_id,
    date_str: body.date_str,
    assigned_to: s.extra.assigned_to?.id || s.extra.assigned_to || '',
    assigned_to_name: s.extra.assigned_to?.label || s.extra.assigned_to_name || '',
    notes: body.remarks,
    vat_percent: body.vat_percent,
    discount: body.discount,
    shipping_handling_fees: body.shipping_handling_fees,
    products,
  };
}

/** PR totals (no rounding amount on this model). */
export function prTotals(products: any[], vat: number, shipping = 0, discount = 0) {
  let total = 0;
  for (const p of products || []) total = r2(total + r2((Number(p.quantity) || 0) * ((Number(p.purchase_unit_price) || 0) - (Number(p.unit_discount) || 0))));
  const base = r2(total + shipping - discount);
  const vatPrice = r2((base * vat) / 100);
  return { total, vat_price: vatPrice, net_total: r2(base + vatPrice) };
}

// ───────────────────────────── vendors ─────────────────────────────

export const NA_KEYS = ['building_no', 'street_name', 'street_name_arabic', 'district_name', 'district_name_arabic', 'unit_no', 'city_name', 'city_name_arabic', 'zipcode', 'additional_no', 'short_code'] as const;

/** Flatten a vendor for the form (national_address.x → na_x, categories → option list). */
export function vendorToForm(v: any): Record<string, any> {
  const out: Record<string, any> = { ...v };
  for (const k of NA_KEYS) out[`na_${k}`] = v?.national_address?.[k] ?? '';
  out.category_id = (v?.category_id || []).map((id: string, i: number) => ({ id, label: v?.category_name?.[i] || id }));
  out.product_categories = v?.product_categories || [];
  out.opening_balance_date = v?.opening_balance_date ? String(v.opening_balance_date).slice(0, 16) : '';
  return out;
}

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
export const toArabicDigits = (s: string) => String(s || '').replace(/\d/g, (d) => AR_DIGITS[Number(d)]);

/** Form values → vendor API body. */
export function vendorFromForm(v: Record<string, any>, toIso: (d: Date) => string): Record<string, any> {
  const body: Record<string, any> = {};
  const na: Record<string, string> = {};
  for (const [k, val] of Object.entries(v)) {
    if (k.startsWith('na_')) na[k.slice(3)] = typeof val === 'string' ? val.trim() : val;
    else body[k] = val;
  }
  body.national_address = { ...na, building_no_arabic: toArabicDigits(na.building_no), zipcode_arabic: toArabicDigits(na.zipcode), additional_no_arabic: toArabicDigits(na.additional_no), unit_no_arabic: toArabicDigits(na.unit_no) };
  body.category_id = (v.category_id || []).map((o: any) => (typeof o === 'string' ? o : o.id));
  body.product_categories = v.product_categories || [];
  body.vat_percent = v.vat_percent === '' || v.vat_percent === undefined || v.vat_percent === null ? 15 : Number(v.vat_percent);
  body.credit_limit = Number(v.credit_limit) || 0;
  body.opening_balance = Number(v.opening_balance) || 0;
  body.opening_balance_date = v.opening_balance_date ? toIso(new Date(v.opening_balance_date)) : undefined;
  if (!body.opening_balance) { delete body.opening_balance_date; }
  body.phone_in_arabic = toArabicDigits(v.phone);
  body.phone2_in_arabic = toArabicDigits(v.phone2);
  body.vat_no_in_arabic = toArabicDigits(v.vat_no);
  body.registration_number_in_arabic = toArabicDigits(v.registration_number);
  for (const k of ['id', 'stores', 'account', 'search_label', 'search_words', 'name_prefixes', 'credit_balance', 'category_name', 'created_at', 'updated_at', 'created_by', 'updated_by', 'created_by_name', 'updated_by_name', 'deleted', 'opening_balance_posted', 'additional_keywords']) delete body[k];
  return body;
}

/** Client validation mirroring Vendor.Validate (masters.md §4.1). */
export function validateVendor(v: Record<string, any>): Record<string, string> {
  const e: Record<string, string> = {};
  if (!String(v.name || '').trim()) e.name = 'Name is required';
  const vat = String(v.vat_no || '').trim();
  if (vat && !/^3\d{13}3$/.test(vat)) e.vat_no = 'VAT No. must be 15 digits, starting and ending with 3';
  const email = String(v.email || '').trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Invalid e-mail';
  const crn = String(v.registration_number || '').trim();
  if (crn && !/^[A-Za-z0-9]+$/.test(crn)) e.registration_number = 'C.R. No. must be letters and digits only';
  const vp = v.vat_percent;
  if (vp !== '' && vp !== undefined && vp !== null && (Number.isNaN(Number(vp)) || Number(vp) < 0 || Number(vp) > 100)) e.vat_percent = 'Enter a VAT % between 0 and 100';
  if (Number(v.opening_balance) < 0) e.opening_balance = 'Opening balance can’t be negative';
  if (Number(v.opening_balance) > 0 && !v.opening_balance_date) e.opening_balance_date = 'Date is required';
  return e;
}

/** Per-store stats for the active store (vendor.stores[sid]). */
export const vendorStats = (v: any, storeId: string): Record<string, number> => v?.stores?.[storeId] || {};

// ───────────────────────────── bill extraction → purchase ─────────────────────────────

export interface Extraction {
  vendor_company_name?: string; vendor_vat_no?: string; vendor_mobile?: string; vendor_national_address?: string;
  invoice_number?: string; invoice_date?: string; total_amount?: number; tax_amount?: number;
  products?: { part_no?: string; name?: string; quantity?: number; unit_price?: number; unit?: string }[];
}

/** Build purchase prefill from an AI extraction + resolved vendor/products (PurchaseBillsTab.js:535). */
export function purchaseFromExtraction(x: Extraction, vendor: { id: string; name: string; vat_no?: string; phone?: string; address?: string } | null, productIds: (string | null)[], vat: number): Partial<DocState> {
  const lines = (x.products || []).map((p, i) => makeLine({
    product_id: productIds[i] || null, name: p.name || p.part_no || 'Item', part_number: p.part_no || '', unit: p.unit || '',
    quantity: Number(p.quantity) || 1, unit_price: Number(p.unit_price) || 0,
  }, vat));
  return {
    party: vendor ? { id: vendor.id, label: vendor.name, data: { id: vendor.id, name: vendor.name } } : x.vendor_company_name ? { id: `new:${x.vendor_company_name}`, label: x.vendor_company_name, data: { id: '', name: x.vendor_company_name } } : null,
    phone: vendor?.phone || x.vendor_mobile || '', vat_no: vendor?.vat_no || x.vendor_vat_no || '', address: vendor?.address || x.vendor_national_address || '',
    lines,
    extra: { vendor_invoice_no: x.invoice_number || '' },
  };
}
