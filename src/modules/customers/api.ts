import { api, request } from '../../api/client';
import type { PickerOption } from '@/ui/AsyncPicker';
import { fmtDate, fmtMoney } from '../../lib/format';
import type { InvoiceTypeDef } from './logic';

export const CUSTOMER = '/v1/customer';
export const DEPOSIT = '/v1/customer-deposit';
export const WITHDRAWAL = '/v1/customer-withdrawal';
export const PACKAGE = '/v1/customer-package';

/** POST /v1/translate {text} → {translatedText} (plain JSON, not the std envelope). Returns '' on any failure. */
export async function translateToArabic(text: string): Promise<string> {
  if (!text.trim()) return '';
  try {
    const r = (await api.post<any>('/v1/translate', { text: text.trim(), target: 'ar' })) as any;
    return String(r?.translatedText || '');
  } catch {
    return '';
  }
}

/** POST /v1/customer/upload-image (multipart id, storeID, image) → {url}. */
export async function uploadCustomerImage(customerId: string, storeId: string, file: File): Promise<string> {
  const fd = new FormData();
  fd.append('id', customerId);
  fd.append('storeID', storeId);
  fd.append('image', file);
  const r = (await request<any>('/v1/customer/upload-image', { method: 'POST', body: fd })) as any;
  return String(r?.url || '');
}

export async function deleteCustomerImage(customerId: string, storeId: string, url: string): Promise<void> {
  await request('/v1/customer/delete-image', { method: 'POST', query: { url, id: customerId, storeID: storeId } });
}

export interface InvoiceHit { id: string; code: string; date?: string; net_total?: number; balance_amount?: number; payment_status?: string; customer_id?: string; vendor_id?: string }

/** Open (not fully paid) invoices of one party, for linking receivable/payable payments. */
export async function searchOpenInvoices(def: InvoiceTypeDef, storeId: string, partyId: string, q: string, signal?: AbortSignal): Promise<InvoiceHit[]> {
  const r = await api.get<InvoiceHit[]>(def.endpoint, {
    search: { store_id: storeId, [def.partyField]: partyId, payment_status: 'not_paid,paid_partially', ...(def.extraSearch || {}), ...(q ? { code: q } : {}) },
    limit: 20, sort: '-date', select: 'id,code,date,net_total,balance_amount,payment_status,customer_id,vendor_id',
  }, signal);
  return r.result || [];
}

export const invoiceToOption = (i: InvoiceHit): PickerOption<InvoiceHit> => ({ id: i.id, label: i.code, sub: fmtDate(i.date), right: fmtMoney(i.balance_amount), data: i });

export async function searchEmployees(storeId: string, q: string, signal?: AbortSignal): Promise<{ id: string; name: string; code?: string; mob1?: string }[]> {
  const r = await api.get<any[]>('/v1/employee', { search: { store_id: storeId, ...(q ? { search: q } : {}) }, limit: 50, select: 'id,name,code,mob1' }, signal);
  return r.result || [];
}

/** Read a File as base64 (no data: prefix) for `images_content`. */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result).replace(/^data:[^;]+;base64,/, ''));
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(file);
  });
}
