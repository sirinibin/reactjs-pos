import type { IconName } from '@/ui/Icon';
import { DEPOSIT, WITHDRAWAL } from './api';
import type { MoneyKind } from './logic';

/** Receivables (customer deposits) and Payables (customer withdrawals) are mirror images (masters.md §2). */
export interface MoneyDef {
  kind: MoneyKind;
  endpoint: string;
  listPath: string;
  navId: string;
  resource: string;
  icon: IconName;
  title: string;
  subtitle: string;
  singular: string;
  newLabel: string;
  zatcaSetting: string;
  zatcaCheckbox: string;
  receivedLabel: string;
  receiptTitleKey: string;
  receiptTitleFallback: string;
  modelName: string;
}

export const MONEY: Record<MoneyKind, MoneyDef> = {
  receivable: {
    kind: 'receivable', endpoint: DEPOSIT, listPath: '/sales/receivables', navId: 'receivables', resource: 'receivables', icon: 'cash',
    title: 'Receivables', subtitle: 'Money received from customers, vendors and employees', singular: 'Receivable', newLabel: 'New receivable',
    zatcaSetting: 'enable_zatca_reporting_for_receivables', zatcaCheckbox: 'Report to ZATCA as debit note on create',
    receivedLabel: 'Received from', receiptTitleKey: 'receivable_title', receiptTitleFallback: 'PAYMENT RECEIPT (RECEIVABLE) | إيصال الدفع (مستحق القبض)', modelName: 'customer_deposit',
  },
  payable: {
    kind: 'payable', endpoint: WITHDRAWAL, listPath: '/buying/payables', navId: 'payables', resource: 'payables', icon: 'card',
    title: 'Payables', subtitle: 'Money paid out to customers, vendors and employees (refunds, advances)', singular: 'Payable', newLabel: 'New payable',
    zatcaSetting: 'enable_zatca_reporting_for_payables', zatcaCheckbox: 'Report to ZATCA as credit note on create',
    receivedLabel: 'Paid to', receiptTitleKey: 'payable_title', receiptTitleFallback: 'PAYMENT RECEIPT (PAYABLE / REFUND) | إيصال الدفع (مستحق الدفع / مسترد)', modelName: 'customer_withdrawal',
  },
};

export const partyName = (d: Record<string, any>) => (d.type === 'vendor' ? d.vendor_name || d.vendor?.name : d.type === 'employee' ? d.employee_name || d.employee?.name : d.customer_name || d.customer?.name) || '';
export const partyNameAr = (d: Record<string, any>) => (d.type === 'vendor' ? d.vendor_name_arabic || d.vendor?.name_in_arabic : d.type === 'employee' ? '' : d.customer_name_arabic || d.customer?.name_in_arabic) || '';
export const partyId = (d: Record<string, any>) => (d.type === 'vendor' ? d.vendor_id : d.type === 'employee' ? d.employee_id : d.customer_id) || '';
export const partyPath = (d: Record<string, any>) => {
  const id = partyId(d);
  if (!id) return null;
  return d.type === 'vendor' ? `/buying/vendors/${id}` : d.type === 'employee' ? `/workshop/employees/${id}` : `/sales/customers/${id}`;
};

/** ZATCA reporting for receipts is live only when the store is phase 2, connected and the per-module setting is on. */
export const zatcaEnabled = (store: { zatca?: Record<string, any>; settings?: Record<string, any> } | null | undefined, def: MoneyDef) =>
  store?.zatca?.phase === '2' && !!store?.zatca?.connected && !!store?.settings?.[def.zatcaSetting];
