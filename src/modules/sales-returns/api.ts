import { api } from '@/api/client';
import type { PickerOption } from '@/ui/AsyncPicker';
import { fmtMoney } from '@/lib/format';
import { looksLikeCode } from './logic';

export const ORDER = '/v1/order';
export const SALES_RETURN = '/v1/sales-return';
export const NON_VAT = '/v1/non-vat-sales';
export const NON_VAT_RETURN = '/v1/non-vat-sales-return';
export const SALES_PAYMENT = '/v1/sales-payment';
export const RETURN_PAYMENT = '/v1/sales-return-payment';
export const CASH_DISCOUNT = '/v1/sales-cash-discount';

export const PATHS = {
  returns: '/sales/returns',
  nonVat: '/sales/non-vat',
  nonVatReturns: '/sales/non-vat-returns',
  payments: '/sales/payments',
  returnPayments: '/sales/return-payments',
  cashDiscounts: '/sales/cash-discounts',
  invoices: '/sales/invoices',
};

/** Refund / payment methods offered in sales payment forms (sales.md §7). */
export const SALES_PAY_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'debit_card', label: 'Debit card' },
  { value: 'credit_card', label: 'Credit card' },
  { value: 'bank_card', label: 'Bank card' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'bank_cheque', label: 'Bank cheque' },
  { value: 'customer_account', label: 'Customer account' },
];

export interface OrderHit { id: string; code: string; customer_name?: string; net_total: number; balance_amount?: number; cash_discount?: number; total_payment_received?: number; payment_status?: string; date?: string }

/** Sales invoices for pickers (code when it looks like one, else customer name). */
export async function searchOrders(storeId: string, q: string, signal?: AbortSignal, extra: Record<string, any> = {}): Promise<PickerOption<OrderHit>[]> {
  const search: Record<string, any> = { store_id: storeId, ...extra };
  if (q) Object.assign(search, looksLikeCode(q) ? { code: q } : { customer_name: q });
  const r = await api.get<OrderHit[]>(ORDER, { search, limit: 15, sort: '-created_at', select: 'id,code,date,customer_name,net_total,balance_amount,cash_discount,total_payment_received,payment_status' }, signal);
  return (r.result || []).map((o) => ({ id: o.id, label: o.code, sub: [o.customer_name, `${fmtMoney(o.net_total)}`].filter(Boolean).join(' · '), right: o.balance_amount ? fmtMoney(o.balance_amount) : '', data: o }));
}

export interface ReturnHit { id: string; code: string; order_id: string; order_code: string; customer_name?: string; net_total: number; cash_discount?: number; balance_amount?: number; total_payment_paid?: number }

export async function searchSalesReturns(storeId: string, q: string, signal?: AbortSignal): Promise<PickerOption<ReturnHit>[]> {
  const search: Record<string, any> = { store_id: storeId };
  if (q) search[/^S-INV|INV/i.test(q) ? 'order_code' : 'code'] = q;
  const r = await api.get<ReturnHit[]>(SALES_RETURN, { search, limit: 15, sort: '-created_at', select: 'id,code,order_id,order_code,customer_name,net_total,cash_discount,balance_amount,total_payment_paid' }, signal);
  return (r.result || []).map((o) => ({ id: o.id, label: o.code, sub: [o.order_code, o.customer_name, fmtMoney(o.net_total)].filter(Boolean).join(' · '), right: o.balance_amount ? fmtMoney(o.balance_amount) : '', data: o }));
}

export async function searchNonVatSales(storeId: string, q: string, signal?: AbortSignal): Promise<PickerOption<any>[]> {
  const search: Record<string, any> = { store_id: storeId };
  if (q) Object.assign(search, looksLikeCode(q) ? { code: q } : { customer_name: q });
  const r = await api.get<any[]>(NON_VAT, { search, limit: 15, sort: '-created_at', select: 'id,code,date,customer_name,net_total,return_amount' }, signal);
  return (r.result || []).map((o) => ({ id: o.id, label: o.code, sub: [o.customer_name, fmtMoney(o.net_total)].filter(Boolean).join(' · '), data: o }));
}
