// Pure logic for customers, receivables (customer deposits) and payables (customer withdrawals).
// Everything here is framework-free so it can be unit tested directly (see logic.test.ts).
import { parseNumber, round, toRfc3339 } from '../../lib/format';

/* ------------------------------------------------------------------ */
/* Arabic digits                                                       */
/* ------------------------------------------------------------------ */

/** Exact digit map used by the legacy app (masters.md §0) — mixes Persian and Arabic-Indic glyphs on purpose. */
export const ARABIC_DIGIT_MAP = '۰۱۲۳٤۵٦۷۸۹';

export function toArabicDigits(input: string | number | null | undefined): string {
  if (input === null || input === undefined) return '';
  return String(input).replace(/\d/g, (d) => ARABIC_DIGIT_MAP[Number(d)]);
}

/* ------------------------------------------------------------------ */
/* Customer                                                            */
/* ------------------------------------------------------------------ */

export interface NationalAddress {
  short_code: string; building_no: string; building_no_arabic: string; street_name: string; street_name_arabic: string;
  district_name: string; district_name_arabic: string; city_name: string; city_name_arabic: string; zipcode: string; zipcode_arabic: string;
  additional_no: string; additional_no_arabic: string; unit_no: string; unit_no_arabic: string;
}

export interface CustomerStoreStats { [k: string]: number | string | undefined }

export interface Customer {
  id: string;
  code?: string;
  name: string;
  name_in_arabic?: string;
  email?: string;
  phone?: string;
  phone2?: string;
  contact_person?: string;
  vat_no?: string;
  registration_number?: string;
  country_code?: string;
  country_name?: string;
  address?: string;
  remarks?: string;
  use_remarks_in_sales?: boolean;
  credit_limit?: number;
  credit_balance?: number;
  national_address?: Partial<NationalAddress>;
  opening_balance?: number;
  opening_balance_type?: string;
  opening_balance_date?: string;
  opening_balance_posted?: boolean;
  images?: string[];
  account?: { id: string; number?: string; balance?: number; type?: string; debit_or_credit_balance?: string } | null;
  stores?: Record<string, CustomerStoreStats>;
  deleted?: boolean;
  deleted_at?: string;
  churn_risk_tier?: string;
  lifetime_value_segment_for_12months?: string;
  first_purchase_at?: string;
  last_purchase_at?: string;
  created_at?: string;
  updated_at?: string;
  created_by_name?: string;
  updated_by_name?: string;
  [k: string]: any;
}

export const EMPTY_ADDRESS: NationalAddress = {
  short_code: '', building_no: '', building_no_arabic: '', street_name: '', street_name_arabic: '', district_name: '', district_name_arabic: '',
  city_name: '', city_name_arabic: '', zipcode: '', zipcode_arabic: '', additional_no: '', additional_no_arabic: '', unit_no: '', unit_no_arabic: '',
};

export interface CustomerForm {
  code: string;
  name: string;
  name_in_arabic: string;
  email: string;
  phone: string;
  phone2: string;
  contact_person: string;
  country_code: string;
  country_name: string;
  vat_no: string;
  registration_number: string;
  remarks: string;
  use_remarks_in_sales: boolean;
  credit_limit: string;
  national_address: NationalAddress;
  opening_balance: string;
  opening_balance_type: 'receivable' | 'payable';
  /** datetime-local value (yyyy-MM-ddTHH:mm) */
  opening_balance_date: string;
}

export const blankCustomerForm = (): CustomerForm => ({
  code: '', name: '', name_in_arabic: '', email: '', phone: '', phone2: '', contact_person: '', country_code: 'SA', country_name: 'Saudi Arabia',
  vat_no: '', registration_number: '', remarks: '', use_remarks_in_sales: false, credit_limit: '', national_address: { ...EMPTY_ADDRESS },
  opening_balance: '', opening_balance_type: 'receivable', opening_balance_date: '',
});

/** RFC3339/ISO → value for <input type="datetime-local"> in local time. */
export function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return toRfc3339(d).slice(0, 16);
}

export function customerToForm(c: Customer): CustomerForm {
  const na = { ...EMPTY_ADDRESS, ...(c.national_address || {}) };
  return {
    code: c.code || '', name: c.name || '', name_in_arabic: c.name_in_arabic || '', email: c.email || '', phone: c.phone || '', phone2: c.phone2 || '',
    contact_person: c.contact_person || '', country_code: c.country_code || '', country_name: c.country_name || '', vat_no: c.vat_no || '',
    registration_number: c.registration_number || '', remarks: c.remarks || '', use_remarks_in_sales: !!c.use_remarks_in_sales,
    credit_limit: c.credit_limit ? String(c.credit_limit) : '', national_address: na,
    opening_balance: c.opening_balance ? String(c.opening_balance) : '', opening_balance_type: c.opening_balance_type === 'payable' ? 'payable' : 'receivable',
    opening_balance_date: isoToLocalInput(c.opening_balance_date),
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isDigits = (s: string, n: number) => new RegExp(`^\\d{${n}}$`).test(s);

/** Client mirror of the server rules (masters.md §1.1 validation + §1.4). Keys match the API error keys. */
export function validateCustomer(f: CustomerForm, opts: { zatcaPhase2?: boolean } = {}): Record<string, string> {
  const e: Record<string, string> = {};
  if (!f.name.trim()) e.name = 'Name is required';
  if (f.email.trim() && !EMAIL_RE.test(f.email.trim())) e.email = 'Enter a valid email address.';
  const vat = f.vat_no.trim();
  if (vat && (f.country_code === '' || f.country_code === 'SA')) {
    if (!isDigits(vat, 15)) e.vat_no = 'VAT No. should be 15 digits';
    else if (!/^3\d*3$/.test(vat)) e.vat_no = 'VAT No. should start and end with 3';
  }
  if (f.registration_number.trim() && !/^[A-Za-z0-9]+$/.test(f.registration_number.trim())) e.registration_number = 'Registration Number should be alpha numeric(a-zA-Z|0-9)';
  if (vat && opts.zatcaPhase2) {
    const b = f.national_address.building_no.trim();
    const z = f.national_address.zipcode.trim();
    if (b && !isDigits(b, 4)) e.national_address_building_no = 'Building number should be 4 digits';
    if (z && !isDigits(z, 5)) e.national_address_zipcode = 'Zip code should be 5 digits';
  }
  if (f.credit_limit.trim() && (!/^[\d.,\s٠-٩۰-۹٫]+$/.test(f.credit_limit.trim()) || parseNumber(f.credit_limit) < 0)) e.credit_limit = 'Enter a valid amount.';
  const ob = parseNumber(f.opening_balance);
  if (f.opening_balance.trim() && ob < 0) e.opening_balance = 'Opening balance cannot be negative';
  if (ob > 0 && !f.opening_balance_date) e.opening_balance_date = 'Opening balance date is required when an opening balance is entered';
  return e;
}

/** Build the POST/PUT body. *_in_arabic digit fields are derived like the legacy form. Images are managed by the upload endpoints. */
export function customerFormToBody(f: CustomerForm): Record<string, any> {
  const t = (s: string) => s.trim();
  const na = Object.fromEntries(Object.entries(f.national_address).map(([k, v]) => [k, t(v)])) as unknown as NationalAddress;
  na.building_no_arabic = toArabicDigits(na.building_no);
  na.zipcode_arabic = toArabicDigits(na.zipcode);
  na.additional_no_arabic = toArabicDigits(na.additional_no);
  na.unit_no_arabic = toArabicDigits(na.unit_no);
  const ob = round(parseNumber(f.opening_balance), 2);
  return {
    code: t(f.code), name: t(f.name), name_in_arabic: t(f.name_in_arabic), email: t(f.email),
    phone: t(f.phone), phone_in_arabic: toArabicDigits(t(f.phone)), phone2: t(f.phone2), phone2_in_arabic: toArabicDigits(t(f.phone2)),
    contact_person: t(f.contact_person), country_code: f.country_code, country_name: f.country_name,
    vat_no: t(f.vat_no), vat_no_in_arabic: toArabicDigits(t(f.vat_no)),
    registration_number: t(f.registration_number), registration_number_in_arabic: toArabicDigits(t(f.registration_number)),
    remarks: f.remarks, use_remarks_in_sales: f.use_remarks_in_sales,
    credit_limit: round(parseNumber(f.credit_limit), 2),
    national_address: na,
    opening_balance: ob,
    opening_balance_type: ob > 0 ? f.opening_balance_type : '',
    ...(ob > 0 && f.opening_balance_date ? { opening_balance_date: toRfc3339(new Date(f.opening_balance_date)) } : {}),
  };
}

/** Per-store stat (customer.stores[storeId][key]) as a number. */
export function stat(c: Pick<Customer, 'stores'> | null | undefined, storeId: string, key: string): number {
  const v = c?.stores?.[storeId]?.[key];
  return typeof v === 'number' ? v : Number(v) || 0;
}

export function initials(name: string | undefined): string {
  const words = (name || '').replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
  if (!words.length) return '?';
  return (words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[1][0]).toUpperCase();
}

/** Stable avatar colour variant (.av, .av.a2 …) from the id. */
export function avatarClass(id: string | undefined): string {
  const n = (id || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 4;
  return n === 0 ? 'av' : `av a${n + 1}`;
}

export function creditUsage(balance: number | undefined, limit: number | undefined) {
  const used = Math.max(0, balance || 0);
  const lim = Math.max(0, limit || 0);
  return { limit: lim, used, available: lim ? round(lim - used, 2) : 0, ratio: lim ? used / lim : 0, over: lim > 0 && used > lim };
}

export interface OpenInvoice { id: string; code: string; date: string; net_total: number; balance_amount: number; payment_status?: string }
export const AGING_LABELS = ['0–30', '31–60', '61–90', '91–120', '120+'];

export const daysOld = (date: string, now: Date = new Date()) => Math.max(0, Math.floor((now.getTime() - new Date(date).getTime()) / 86_400_000));

/**
 * Receivables aging by invoice age (the API has no due dates, so age = days since the invoice date).
 * Returns the five buckets of the Customer 360 design with summed open balances.
 */
export function agingBuckets(invoices: Pick<OpenInvoice, 'date' | 'balance_amount'>[], now: Date = new Date()): { label: string; value: number }[] {
  const out = AGING_LABELS.map((label) => ({ label, value: 0 }));
  for (const inv of invoices) {
    const bal = Number(inv.balance_amount) || 0;
    if (bal <= 0 || !inv.date) continue;
    const d = daysOld(inv.date, now);
    const i = d <= 30 ? 0 : d <= 60 ? 1 : d <= 90 ? 2 : d <= 120 ? 3 : 4;
    out[i].value = round(out[i].value + bal, 2);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Account statement (postings)                                        */
/* ------------------------------------------------------------------ */

export interface Post { id?: string; date: string; account_name: string; account_number?: string; debit_or_credit: 'debit' | 'credit'; debit: number; credit: number; balance: number; reference_code?: string | null }
export interface Posting { id: string; date: string; reference_id?: string; reference_model?: string; reference_code?: string; posts: Post[] }
export interface StatementRow { key: string; date: string; model: string; code: string; refId?: string; contra: string; debit: number; credit: number; balance: number }

/** Flatten /v1/posting rows into one statement line per post (finance.md §7.2). */
export function flattenPostings(postings: Posting[]): StatementRow[] {
  const rows: StatementRow[] = [];
  for (const p of postings || []) {
    (p.posts || []).forEach((post, i) => {
      const acc = `${post.account_name}${post.account_number ? ` A/c #${post.account_number}` : ''}`;
      rows.push({
        key: `${p.id}-${post.id || i}`,
        date: post.date || p.date,
        model: p.reference_model || '',
        code: [p.reference_code, post.reference_code].filter(Boolean).join(' / '),
        refId: p.reference_id,
        contra: post.debit_or_credit === 'debit' ? `To ${acc} Dr.` : `By ${acc} Cr.`,
        debit: post.debit || 0,
        credit: post.credit || 0,
        balance: post.balance || 0,
      });
    });
  }
  return rows;
}

/** Statement totals from posting `meta` (finance.md §7.1). Positive closing with side DR = customer owes the store. */
export function statementSummary(meta: Record<string, any> | undefined) {
  const m = meta || {};
  const debit = Number(m.debit_total) || 0;
  const credit = Number(m.credit_total) || 0;
  const closing = round(Math.abs(debit - credit), 2);
  return {
    debit, credit, closing,
    side: (debit >= credit ? 'DR' : 'CR') as 'DR' | 'CR',
    opening: Number(m.debit_balance_bought_down || 0) - Number(m.credit_balance_bought_down || 0),
  };
}

/** In-app link for a ledger reference (null when the document has no screen). */
export function referenceLink(model: string | undefined, id: string | undefined): string | null {
  if (!model || !id) return null;
  const map: Record<string, string> = {
    sales: '/sales/invoices', sales_return: '/sales/returns', quotation_sales: '/sales/quotations', quotation: '/sales/quotations',
    quotation_sales_return: '/sales/quotation-returns', customer_deposit: '/sales/receivables', customer_withdrawal: '/buying/payables',
    vendor_deposit: '/sales/receivables', vendor_withdrawal: '/buying/payables', purchase: '/buying/purchases', purchase_return: '/buying/returns',
    non_vat_sales: '/sales/non-vat', non_vat_sales_return: '/sales/non-vat-returns',
  };
  return map[model] ? `${map[model]}/${id}` : null;
}

export const titleCase = (s: string | undefined) => (s || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/* ------------------------------------------------------------------ */
/* Receivables / Payables                                              */
/* ------------------------------------------------------------------ */

export type MoneyKind = 'receivable' | 'payable';
export type PartyType = 'customer' | 'vendor' | 'employee';

export interface InvoiceTypeDef { type: string; label: string; endpoint: string; partyField: 'customer_id' | 'vendor_id'; extraSearch?: Record<string, string>; path: string }

export const INVOICE_TYPES: Record<string, InvoiceTypeDef> = {
  sales: { type: 'sales', label: 'Sales invoice', endpoint: '/v1/order', partyField: 'customer_id', path: '/sales/invoices' },
  quotation_sales: { type: 'quotation_sales', label: 'Quotation invoice', endpoint: '/v1/quotation', partyField: 'customer_id', extraSearch: { type: 'invoice' }, path: '/sales/quotations' },
  purchase_return: { type: 'purchase_return', label: 'Purchase return', endpoint: '/v1/purchase-return', partyField: 'vendor_id', path: '/buying/returns' },
  sales_return: { type: 'sales_return', label: 'Sales return', endpoint: '/v1/sales-return', partyField: 'customer_id', path: '/sales/returns' },
  quotation_sales_return: { type: 'quotation_sales_return', label: 'Quotation sales return', endpoint: '/v1/quotation-sales-return', partyField: 'customer_id', path: '/sales/quotation-returns' },
  purchase: { type: 'purchase', label: 'Purchase bill', endpoint: '/v1/purchase', partyField: 'vendor_id', path: '/buying/purchases' },
};

/** Which invoice types a payment row may settle (masters.md §2.1 "Linkable invoice types"). */
export function linkableInvoiceTypes(kind: MoneyKind, party: PartyType, settings: Record<string, any> = {}): InvoiceTypeDef[] {
  const qtn = !!settings.quotation_invoice_accounting;
  if (party === 'employee') return [];
  if (kind === 'receivable') return party === 'customer' ? [INVOICE_TYPES.sales, ...(qtn ? [INVOICE_TYPES.quotation_sales] : [])] : [INVOICE_TYPES.purchase_return];
  return party === 'customer' ? [INVOICE_TYPES.sales_return, ...(qtn ? [INVOICE_TYPES.quotation_sales_return] : [])] : [INVOICE_TYPES.purchase];
}

export const MONEY_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'debit_card', label: 'Debit card' },
  { value: 'credit_card', label: 'Credit card' },
  { value: 'bank_card', label: 'Bank card' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'bank_cheque', label: 'Bank cheque' },
];
export const methodsFor = (kind: MoneyKind) => (kind === 'receivable' ? [...MONEY_METHODS, { value: 'purchase_fund', label: 'Purchase fund A/c' }] : MONEY_METHODS);

export interface MoneyPayment {
  id?: string;
  date: string; // datetime-local
  amount: string;
  discount: string;
  method: string;
  bank_reference: string;
  description: string;
  invoice_id: string;
  invoice_code: string;
  invoice_type: string;
  /** Balance of the linked invoice when picked (client-side cap). */
  invoice_balance?: number;
}

export interface MoneyForm {
  type: PartyType;
  party: { id: string; name: string } | null;
  date: string; // datetime-local
  description: string;
  remarks: string;
  bank_reference_no: string;
  payments: MoneyPayment[];
  images: string[];
  images_content: string[];
  enable_report_to_zatca: boolean;
}

export const blankPaymentRow = (date: string): MoneyPayment => ({ date, amount: '', discount: '', method: '', bank_reference: '', description: '', invoice_id: '', invoice_code: '', invoice_type: '' });

export function blankMoneyForm(now: Date = new Date()): MoneyForm {
  const d = toRfc3339(now).slice(0, 16);
  return { type: 'customer', party: null, date: d, description: '', remarks: '', bank_reference_no: '', payments: [blankPaymentRow(d)], images: [], images_content: [], enable_report_to_zatca: false };
}

export function moneyToForm(doc: Record<string, any>): MoneyForm {
  const type: PartyType = doc.type === 'vendor' ? 'vendor' : doc.type === 'employee' ? 'employee' : 'customer';
  const party = type === 'vendor' ? (doc.vendor_id ? { id: doc.vendor_id, name: doc.vendor_name || doc.vendor?.name || '' } : null)
    : type === 'employee' ? (doc.employee_id ? { id: doc.employee_id, name: doc.employee_name || doc.employee?.name || '' } : null)
      : doc.customer_id ? { id: doc.customer_id, name: doc.customer_name || doc.customer?.name || '' } : null;
  return {
    type, party,
    date: isoToLocalInput(doc.date),
    description: doc.description || '', remarks: doc.remarks || '', bank_reference_no: doc.bank_reference_no || '',
    payments: (doc.payments || []).map((p: any) => ({
      id: p.id, date: isoToLocalInput(p.date), amount: String(p.amount ?? ''), discount: p.discount ? String(p.discount) : '', method: p.method || '',
      bank_reference: p.bank_reference || '', description: p.description || '', invoice_id: p.invoice_id || '', invoice_code: p.invoice_code || '', invoice_type: p.invoice_type || '',
    })),
    images: doc.images || [], images_content: [], enable_report_to_zatca: false,
  };
}

export function moneyTotals(payments: Pick<MoneyPayment, 'amount' | 'discount'>[]) {
  const total = round(payments.reduce((a, p) => a + parseNumber(p.amount), 0), 2);
  const discount = round(payments.reduce((a, p) => a + parseNumber(p.discount), 0), 2);
  return { total, discount, net: round(total - discount, 2) };
}

export const errPrefix = (kind: MoneyKind) => (kind === 'receivable' ? 'customer_receivable_' : 'customer_payable_');
export const payErrKey = (kind: MoneyKind, field: 'amount' | 'date' | 'discount' | 'method' | 'invoice', i: number) => `${errPrefix(kind)}payment_${field}_${i}`;
export const partyField = (t: PartyType) => (t === 'vendor' ? 'vendor_id' : t === 'employee' ? 'employee_id' : 'customer_id');

/** Client validation with the same error keys the server uses (masters.md §2.1). */
export function validateMoney(f: MoneyForm, kind: MoneyKind): Record<string, string> {
  const e: Record<string, string> = {};
  if (!f.party) e[partyField(f.type)] = f.type === 'vendor' ? 'Vendor is required' : f.type === 'employee' ? 'Employee is required' : 'Customer is required';
  if (!f.date) e.date_str = 'Date is required';
  if (!f.payments.length) e.payments = 'At least one payment is required';
  const header = f.date ? new Date(f.date).getTime() : 0;
  f.payments.forEach((p, i) => {
    const amt = parseNumber(p.amount);
    const disc = parseNumber(p.discount);
    if (!p.date) e[payErrKey(kind, 'date', i)] = 'Payment date is required';
    else if (header && new Date(p.date).getTime() < header) e[payErrKey(kind, 'date', i)] = `Payment date time should be greater than or equal to ${kind === 'receivable' ? 'Receivable' : 'Payable'} date time`;
    if (!p.amount.trim()) e[payErrKey(kind, 'amount', i)] = 'Payment amount is required';
    else if (!(amt > 0)) e[payErrKey(kind, 'amount', i)] = 'Payment amount should be greater than zero';
    else if (p.invoice_id && p.invoice_balance !== undefined && round(amt - disc, 2) > round(p.invoice_balance, 2)) e[payErrKey(kind, 'amount', i)] = `Payment amount (-discount) should not be greater than ${p.invoice_balance.toFixed(2)} (Invoice Balance)`;
    if (disc < 0 || disc > amt) e[payErrKey(kind, 'discount', i)] = 'Payment discount should not be grater than amount';
    if (!p.method) e[payErrKey(kind, 'method', i)] = 'Payment method is required';
  });
  return e;
}

/** POST/PUT body for /v1/customer-deposit and /v1/customer-withdrawal. Only the selected party id is sent. */
export function moneyFormToBody(f: MoneyForm, opts: { isNew: boolean }): Record<string, any> {
  const body: Record<string, any> = {
    type: f.type,
    customer_id: f.type === 'customer' ? f.party?.id || null : null,
    vendor_id: f.type === 'vendor' ? f.party?.id || null : null,
    employee_id: f.type === 'employee' ? f.party?.id || null : null,
    date_str: f.date ? toRfc3339(new Date(f.date)) : '',
    description: f.description.trim(),
    remarks: f.remarks,
    bank_reference_no: f.bank_reference_no.trim(),
    payments: f.payments.map((p) => ({
      ...(p.id ? { id: p.id } : {}),
      date_str: p.date ? toRfc3339(new Date(p.date)) : '',
      amount: round(parseNumber(p.amount), 2),
      discount: round(parseNumber(p.discount), 2),
      method: p.method,
      bank_reference: p.bank_reference.trim(),
      description: p.description.trim(),
      invoice_id: p.invoice_id || null,
      invoice_code: p.invoice_id ? p.invoice_code : null,
      invoice_type: p.invoice_id ? p.invoice_type : null,
    })),
    images: f.images,
  };
  if (f.images_content.length) body.images_content = f.images_content;
  if (opts.isNew) body.enable_report_to_zatca = f.enable_report_to_zatca;
  return body;
}

/** Switching party type is blocked when a payment is linked to an invoice of another party type (masters.md §2.3). */
export function canSwitchType(f: MoneyForm, next: PartyType): boolean {
  if (next === f.type) return true;
  return !f.payments.some((p) => p.invoice_id);
}

/* ------------------------------------------------------------------ */
/* Amount in words (receipt)                                           */
/* ------------------------------------------------------------------ */

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function below1000(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  const parts: string[] = [];
  if (h) parts.push(`${ONES[h]} Hundred`);
  if (r) parts.push(r < 20 ? ONES[r] : `${TENS[Math.floor(r / 10)]}${r % 10 ? `-${ONES[r % 10]}` : ''}`);
  return parts.join(' ');
}

export function intToWords(n: number): string {
  n = Math.floor(Math.abs(n));
  if (n === 0) return 'Zero';
  const scales = ['', 'Thousand', 'Million', 'Billion'];
  const parts: string[] = [];
  for (let i = 0; n > 0 && i < scales.length; i++) {
    const chunk = n % 1000;
    if (chunk) parts.unshift(`${below1000(chunk)}${scales[i] ? ` ${scales[i]}` : ''}`);
    n = Math.floor(n / 1000);
  }
  return parts.join(' ');
}

/** "One Thousand Two Hundred Riyals and 50 Halalas only" */
export function amountInWords(amount: number): string {
  const v = round(Math.abs(amount || 0), 2);
  const riyals = Math.floor(v);
  const halalas = Math.round((v - riyals) * 100);
  return `${intToWords(riyals)} Riyal${riyals === 1 ? '' : 's'}${halalas ? ` and ${halalas} Halala${halalas === 1 ? '' : 's'}` : ''} only`;
}

/* ------------------------------------------------------------------ */
/* Customer packages                                                   */
/* ------------------------------------------------------------------ */

/** Menu ids the legacy sidebar understands (reactjs-pos src/sidebar_menu_config.js DEFAULT_MENU). */
export const LEGACY_TAB_IDS = [
  'dashboard', 'sales', 'sales_return', 'purchases', 'purchase_orders', 'purchase_requests', 'rfq_received', 'rfq_suppliers', 'procurement_emails', 'procurement_whatsapp',
  'purchase_bill_images', 'purchase_return', 'delivery_notes', 'quotations', 'qtn_sales_return', 'non_vat_sales', 'non_vat_sales_return', 'stats', 'vendors', 'stores',
  'warehouses', 'stock_transfers', 'customers', 'products', 'services', 'product_category', 'service_category', 'product_brand', 'expense_category', 'expenses', 'analytics',
  'receivables', 'payables', 'capitals', 'dividents', 'ledger', 'accounts', 'users', 'user_roles', 'customer_packages', 'automobile_dashboard', 'employees', 'salaries',
  'vehicles', 'repair_jobs', 'repair_jobs_board',
];

export function toggleTab(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
}
