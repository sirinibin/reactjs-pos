// Pure request-body builders (no React) — shared by the pages and the live-API integration tests.
import type { PickerOption } from '@/ui/AsyncPicker';
import type { IconName } from '@/ui/Icon';
import type { Party } from '@/framework/doc/lookups';
import { parseNumber, toRfc3339 } from '@/lib/format';
import { stripDataUrl } from './logic';

export type Expense = Record<string, any> & { id: string; code: string };
export interface PendingFile { name: string; dataUrl: string; size: number; type: string }

/** Capital, Drawings (API "divident") and Capital withdrawals share one shape (spec §3). */
export interface EquityKind {
  id: 'capital' | 'drawing' | 'withdrawal';
  endpoint: string;
  title: string;
  subtitle: string;
  singular: string;
  icon: IconName;
  resource: string;
  userField: 'invested_by_user_id' | 'withdrawn_by_user_id';
  userName: 'invested_by_user_name' | 'withdrawn_by_user_name';
  userLabel: string;
  imageFolder: string;
  /** The API only filters by user for capital (search[invested_by_user_id]); the others ignore it. */
  userFilter: boolean;
}

export const EQUITY: Record<EquityKind['id'], EquityKind> = {
  capital: { id: 'capital', endpoint: '/v1/capital', title: 'Capital', subtitle: 'Money invested into the business by owners and partners', singular: 'capital entry', icon: 'bank', resource: 'capitals', userField: 'invested_by_user_id', userName: 'invested_by_user_name', userLabel: 'Invested by', imageFolder: 'capitals', userFilter: true },
  drawing: { id: 'drawing', endpoint: '/v1/divident', title: 'Drawings', subtitle: 'Money withdrawn by owners for personal use', singular: 'drawing', icon: 'wallet', resource: 'dividents', userField: 'withdrawn_by_user_id', userName: 'withdrawn_by_user_name', userLabel: 'Withdrawn by', imageFolder: 'dividents', userFilter: false },
  withdrawal: { id: 'withdrawal', endpoint: '/v1/capital-withdrawal', title: 'Capital withdrawals', subtitle: 'Legacy capital withdrawals (not posted to the ledger — use Drawings for new entries)', singular: 'withdrawal', icon: 'bank', resource: 'capitals', userField: 'withdrawn_by_user_id', userName: 'withdrawn_by_user_name', userLabel: 'Withdrawn by', imageFolder: 'capital_withdrawals', userFilter: false },
};

/** Exact POST/PUT body (spec §3): user id, amount, description, date_str RFC3339, payment_method, optional single image. */
export function equityBody(k: EquityKind, v: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {
    [k.userField]: v[k.userField] || '',
    amount: v.amount,
    description: v.description,
    payment_method: v.payment_method,
    date_str: v.date_str ? toRfc3339(new Date(v.date_str)) : '',
  };
  if (v.image?.dataUrl) out.images_content = [stripDataUrl(v.image.dataUrl)];
  if (v.image?.keep) out.images = v.image.keep;
  return out;
}

export interface FormState {
  date: string;
  amount: string;
  description: string;
  payment_method: string;
  vendor: PickerOption<Party> | null;
  vendor_invoice_no: string;
  categories: PickerOption[];
  images: string[];
  pending: PendingFile[];
}

export const blankExpense = (): FormState => ({ date: toLocalInput(new Date()), amount: '', description: '', payment_method: 'cash', vendor: null, vendor_invoice_no: '', categories: [], images: [], pending: [] });

export function fromExpense(e: Expense): FormState {
  const cats: string[] = e.category_id || [];
  const names: string[] = e.category_name || (e.category || []).map((c: any) => c.name) || [];
  return {
    date: toLocalInput(e.date),
    amount: String(e.amount ?? ''),
    description: e.description || '',
    payment_method: e.payment_method || 'cash',
    vendor: e.vendor_id ? { id: e.vendor_id, label: e.vendor_name || e.vendor?.name || '', data: { id: e.vendor_id, name: e.vendor_name || '' } } : e.vendor_name ? { id: `new:${e.vendor_name}`, label: e.vendor_name, data: { id: '', name: e.vendor_name } } : null,
    vendor_invoice_no: e.vendor_invoice_no || '',
    categories: cats.map((id, i) => ({ id, label: names[i] || id, data: null })),
    images: e.images || [],
    pending: [],
  };
}

/** Exact API body for POST/PUT /v1/expense (spec §1.2). */
export function toExpenseBody(s: FormState, storeId: string): Record<string, any> {
  const vendorId = s.vendor && !s.vendor.id.startsWith('new:') ? s.vendor.id : '';
  return {
    store_id: storeId,
    date_str: toRfc3339(new Date(s.date)),
    amount: parseNumber(s.amount),
    description: s.description.trim(),
    payment_method: s.payment_method,
    category_id: s.categories.map((c) => c.id),
    vendor_id: vendorId,
    vendor_name: s.vendor?.label || '',
    vendor_invoice_no: s.vendor_invoice_no.trim(),
    images: s.images,
    ...(s.pending.length ? { images_content: s.pending.map((p) => stripDataUrl(p.dataUrl)) } : {}),
  };
}

/** Datetime-local value for a Date / ISO string (local time). */
export function toLocalInput(d: Date | string | null | undefined): string {
  const x = d ? new Date(d) : new Date();
  if (Number.isNaN(x.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}T${p(x.getHours())}:${p(x.getMinutes())}`;
}
