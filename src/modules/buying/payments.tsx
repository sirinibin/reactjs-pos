import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/api/client';
import { useAuth, useStoreId } from '@/auth/AuthContext';
import { ListPage, type ListConfig } from '@/framework/ListPage';
import { EntityForm, type FieldDef } from '@/framework/EntityForm';
import { METHOD_LABEL } from '@/framework/doc/status';
import { AsyncPicker, type PickerOption } from '@/ui/AsyncPicker';
import { IconButton } from '@/ui/Button';
import { Input } from '@/ui/Field';
import { Banner, useConfirm } from '@/ui/Misc';
import { Pill } from '@/ui/Pill';
import { useToast } from '@/ui/Toast';
import { fmtDate, fmtDateTime, fmtMoney, fmtTime, parseNumber, toRfc3339 } from '@/lib/format';
import { t as tt } from '@/i18n';
import { EP, PATHS } from './api';
import { PURCHASE_PAYMENT_METHODS, searchPurchases } from './components';

type Row = Record<string, any> & { id: string };

const METHOD_OPTIONS = PURCHASE_PAYMENT_METHODS;

function purchaseField(storeId: string, extra: Record<string, string> = {}): FieldDef {
  return {
    name: 'purchase', label: 'Purchase bill', type: 'custom', required: true, span: 2,
    render: (v, set) => <PurchasePicker storeId={storeId} value={v || null} onChange={set} extra={extra} />,
  };
}

function PurchasePicker({ storeId, value, onChange, extra }: { storeId: string; value: PickerOption | null; onChange: (v: PickerOption | null) => void; extra: Record<string, string> }) {
  const { t } = useTranslation();
  return <AsyncPicker aria-label={t('Purchase bill')} value={value} onChange={onChange} eager clearable placeholder={t('Search bill #…')} load={(q, s) => searchPurchases(storeId, q, s, extra)} />;
}

const dateField: FieldDef = {
  name: 'date', label: 'Date', type: 'custom', required: true,
  render: (v, set) => <Input type="datetime-local" aria-label={tt('Date')} value={v || ''} onChange={(e) => set(e.target.value)} />,
};

/** Form values → POST/PUT body for /purchase-payment. */
export function paymentBody(v: Record<string, any>): Record<string, any> {
  return {
    purchase_id: v.purchase?.id, purchase_code: v.purchase?.label,
    date_str: v.date ? toRfc3339(new Date(v.date)) : '', amount: parseNumber(v.amount), method: v.method, description: v.description || '',
  };
}

export function validatePayment(v: Record<string, any>, editing: boolean): Record<string, string> {
  const e: Record<string, string> = {};
  const a = parseNumber(v.amount);
  if (!(a > 0)) e.amount = tt('Enter an amount greater than zero.');
  const bal = v.purchase?.data?.balance_amount;
  if (!editing && typeof bal === 'number' && a > bal + 0.004) e.amount = tt('Amount can’t exceed the balance due ({{b}}).', { b: fmtMoney(bal) });
  return e;
}

export function PurchasePaymentsPage() {
  const { t } = useTranslation();
  const storeId = useStoreId();
  const { can } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const [confirmEl, ask] = useConfirm();
  const [form, setForm] = useState<Record<string, any> | null>(null);
  const fields = useMemo<FieldDef[]>(() => [
    purchaseField(storeId, form?.id ? {} : { payment_status: 'not_paid,paid_partially' }),
    dateField,
    { name: 'amount', label: 'Amount', type: 'number', required: true },
    { name: 'method', label: 'Method', type: 'select', required: true, options: METHOD_OPTIONS },
    { name: 'description', label: 'Note', type: 'textarea' },
  ], [storeId, form?.id]);

  const remove = async (r: Row) => {
    if (!(await ask(t('Delete this payment?'), { body: t('{{a}} on {{code}} is removed and the bill’s balance goes back up.', { a: fmtMoney(r.amount), code: r.purchase_code }), danger: true, confirmLabel: t('Delete') }))) return;
    try {
      await api.del(`${EP.pay}/${r.id}`, { search: { store_id: storeId } });
      [EP.pay, EP.purchase].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      toast.success(t('Payment deleted'));
    } catch (e) { toast.error(e instanceof ApiError ? e.message : (e as Error).message); }
  };

  const cfg: ListConfig<Row> = {
    title: 'Purchase payments',
    subtitle: 'Payments made to vendors against purchase bills',
    icon: 'cash',
    endpoint: EP.pay,
    resource: 'purchases',
    select: 'id,date,amount,method,description,purchase_id,purchase_code,reference_type,reference_code,created_by_name,created_at,deleted',
    defaultSort: { key: 'date', dir: -1 },
    searchKey: 'purchase_code',
    searchPlaceholder: 'Search bill #…',
    onCreate: () => setForm({ date: toRfc3339(new Date()).slice(0, 16), method: 'cash' }),
    createLabel: 'Record payment',
    onRowClick: (r) => nav(`${PATHS.purchases}/${r.purchase_id}`),
    views: [{ id: 'all', label: 'Active' }, { id: 'deleted', label: 'Deleted', search: { deleted: 1 } }],
    filters: [
      { id: 'date', label: 'Date', type: 'daterange' },
      { id: 'purchase', label: 'Purchase bill #', type: 'text', toSearch: (v) => ({ purchase_code: v }) },
      { id: 'method', label: 'Method', type: 'select', options: METHOD_OPTIONS },
      { id: 'amount', label: 'Amount', type: 'number', placeholder: 'e.g. >=1000' },
      { id: 'created_by_name', label: 'Created by', type: 'text' },
    ],
    summary: (m) => [{ label: 'Total paid', value: fmtMoney(m.total_payment) }],
    columns: [
      { key: 'purchase', header: tt('Purchase bill'), sortKey: 'purchase_code', className: 'code', render: (r) => r.purchase_code },
      { key: 'date', header: tt('Date'), sortKey: 'date', render: (r) => <span className="num">{fmtDate(r.date)} <span className="muted">{fmtTime(r.date)}</span></span> },
      { key: 'amount', header: tt('Amount'), sortKey: 'amount', align: 'end', render: (r) => <b className="num">{fmtMoney(r.amount)}</b> },
      { key: 'method', header: tt('Method'), sortKey: 'method', render: (r) => <>{tt(METHOD_LABEL[r.method] || r.method)}{r.reference_code && <span className="muted"> · {r.reference_code}</span>}</> },
      { key: 'created_by', header: tt('Created by'), hideBelow: 'md', render: (r) => r.created_by_name || '—' },
      { key: 'created_at', header: tt('Created at'), sortKey: 'created_at', hideBelow: 'lg', render: (r) => <span className="num muted">{fmtDateTime(r.created_at)}</span> },
      { key: 'deleted', header: tt('Status'), hideBelow: 'md', render: (r) => (r.deleted ? <Pill tone="crit">{tt('Deleted')}</Pill> : <Pill tone="good">{tt('Active')}</Pill>) },
    ],
    rowActions: (r) => (r.deleted || r.reference_type ? null : (
      <div className="row" style={{ gap: 2, flexWrap: 'nowrap', justifyContent: 'flex-end' }}>
        {can('purchases', 'update') && <IconButton icon="edit" label={tt('Edit payment')} onClick={() => setForm({ ...r, purchase: { id: r.purchase_id, label: r.purchase_code, data: null }, date: toRfc3339(new Date(r.date)).slice(0, 16) })} />}
        {can('purchases', 'delete') && <IconButton icon="trash" label={tt('Delete payment')} onClick={() => remove(r)} />}
      </div>
    )),
    mobileCard: (r) => ({ title: <span className="mono">{r.purchase_code}</span>, amount: fmtMoney(r.amount), subtitle: tt(METHOD_LABEL[r.method] || r.method), meta: fmtDate(r.date) }),
    exportColumns: [
      { header: 'Purchase bill', value: (r) => r.purchase_code },
      { header: 'Date', value: (r) => fmtDate(r.date) },
      { header: 'Amount', value: (r) => r.amount },
      { header: 'Method', value: (r) => r.method },
      { header: 'Created by', value: (r) => r.created_by_name },
    ],
    exportName: 'purchase-payments',
  };

  return (
    <>
      <ListPage config={cfg} />
      <EntityForm open={!!form} onClose={() => setForm(null)} endpoint={EP.pay} title={form?.id ? 'Edit payment' : 'Record payment'} modal
        fields={fields} initial={form} toBody={paymentBody} invalidate={[EP.purchase]}
        validate={(v) => validatePayment(v, !!form?.id)} />
      {confirmEl}
    </>
  );
}

// ───────────────────────────── return refunds (read-only list) ─────────────────────────────

export function ReturnPaymentsPage() {
  const nav = useNavigate();
  const cfg: ListConfig<Row> = {
    title: 'Return refunds',
    subtitle: 'Refunds received from vendors for purchase returns — record new ones from the return',
    icon: 'cash',
    endpoint: EP.retPay,
    resource: 'purchase_return',
    select: 'id,date,amount,method,store_name,purchase_return_code,purchase_return_id,purchase_id,purchase_code,reference_code,created_by_name,created_at,deleted',
    defaultSort: { key: 'date', dir: -1 },
    searchKey: 'purchase_return_code',
    searchPlaceholder: 'Search return #…',
    onRowClick: (r) => nav(`${PATHS.returns}/${r.purchase_return_id}`),
    views: [{ id: 'all', label: 'Active' }, { id: 'deleted', label: 'Deleted', search: { deleted: 1 } }],
    filters: [
      { id: 'date', label: 'Date', type: 'daterange' },
      { id: 'return', label: 'Return #', type: 'text', toSearch: (v) => ({ purchase_return_code: v }) },
      { id: 'purchase', label: 'Purchase bill #', type: 'text', toSearch: (v) => ({ purchase_code: v }) },
      { id: 'method', label: 'Method', type: 'select', options: [...METHOD_OPTIONS, { value: 'purchase', label: 'Purchase' }] },
      { id: 'amount', label: 'Amount', type: 'number', placeholder: 'e.g. >=1000' },
    ],
    summary: (m) => [{ label: 'Total refunded', value: fmtMoney(m.total_payment) }],
    columns: [
      { key: 'ret', header: tt('Return #'), sortKey: 'purchase_return_code', className: 'code', render: (r) => r.purchase_return_code },
      { key: 'purchase', header: tt('Purchase bill'), sortKey: 'purchase_code', hideBelow: 'md', render: (r) => <span className="mono">{r.purchase_code || '—'}</span> },
      { key: 'date', header: tt('Date'), sortKey: 'date', render: (r) => <span className="num">{fmtDate(r.date)}</span> },
      { key: 'amount', header: tt('Amount'), sortKey: 'amount', align: 'end', render: (r) => <b className="num">{fmtMoney(r.amount)}</b> },
      { key: 'method', header: tt('Method'), render: (r) => tt(METHOD_LABEL[r.method] || r.method) },
      { key: 'created_by', header: tt('Created by'), hideBelow: 'lg', render: (r) => r.created_by_name || '—' },
      { key: 'deleted', header: tt('Status'), hideBelow: 'md', render: (r) => (r.deleted ? <Pill tone="crit">{tt('Deleted')}</Pill> : <Pill tone="good">{tt('Active')}</Pill>) },
    ],
    mobileCard: (r) => ({ title: <span className="mono">{r.purchase_return_code}</span>, amount: fmtMoney(r.amount), subtitle: tt(METHOD_LABEL[r.method] || r.method), meta: fmtDate(r.date) }),
    exportColumns: [
      { header: 'Return #', value: (r) => r.purchase_return_code },
      { header: 'Purchase bill', value: (r) => r.purchase_code },
      { header: 'Date', value: (r) => fmtDate(r.date) },
      { header: 'Amount', value: (r) => r.amount },
      { header: 'Method', value: (r) => r.method },
    ],
    exportName: 'purchase-return-refunds',
  };
  return <ListPage config={cfg} />;
}

// ───────────────────────────── cash discounts ─────────────────────────────

export function cashDiscountBody(v: Record<string, any>) {
  return { purchase_id: v.purchase?.id, purchase_code: v.purchase?.label, amount: parseNumber(v.amount) };
}

export function CashDiscountsPage() {
  const storeId = useStoreId();
  const { can } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState<Record<string, any> | null>(null);
  const fields = useMemo<FieldDef[]>(() => [
    purchaseField(storeId),
    { name: 'amount', label: 'Amount', type: 'number', required: true },
    { name: 'note', label: '', type: 'custom', span: 2, render: () => <Banner tone="warn">{tt('Saving replaces the cash discount on the bill with the total of its cash-discount records.')}</Banner> },
  ], [storeId]);
  const cfg: ListConfig<Row> = {
    title: 'Cash discounts',
    subtitle: 'Settlement discounts granted by vendors on purchase bills',
    icon: 'tag',
    endpoint: EP.cd,
    resource: 'purchases',
    select: 'id,purchase_id,purchase_code,amount,created_by_name,created_at,updated_at',
    defaultSort: { key: 'created_at', dir: -1 },
    searchKey: 'purchase_code',
    searchPlaceholder: 'Search bill #…',
    onCreate: () => setForm({}),
    createLabel: 'New cash discount',
    onRowClick: (r) => nav(`${PATHS.purchases}/${r.purchase_id}`),
    filters: [
      { id: 'amount', label: 'Amount', type: 'number', placeholder: 'e.g. >=100' },
      { id: 'created_at', label: 'Created', type: 'daterange', fromKey: 'created_at_from', toKey: 'created_at_to' },
      { id: 'created_by_name', label: 'Created by', type: 'text' },
    ],
    summary: (m) => [{ label: 'Total cash discount', value: fmtMoney(m.total_cash_discount) }],
    columns: [
      { key: 'purchase', header: tt('Purchase bill'), sortKey: 'purchase_code', className: 'code', render: (r) => r.purchase_code },
      { key: 'amount', header: tt('Amount'), sortKey: 'amount', align: 'end', render: (r) => <b className="num">{fmtMoney(r.amount)}</b> },
      { key: 'created_by', header: tt('Created by'), hideBelow: 'md', render: (r) => r.created_by_name || '—' },
      { key: 'created_at', header: tt('Created at'), sortKey: 'created_at', render: (r) => <span className="num muted">{fmtDateTime(r.created_at)}</span> },
    ],
    rowActions: (r) => (can('purchases', 'update') ? <IconButton icon="edit" label={tt('Edit cash discount')} onClick={() => setForm({ ...r, purchase: { id: r.purchase_id, label: r.purchase_code, data: null } })} /> : null),
    mobileCard: (r) => ({ title: <span className="mono">{r.purchase_code}</span>, amount: fmtMoney(r.amount), meta: fmtDateTime(r.created_at) }),
    exportColumns: [
      { header: 'Purchase bill', value: (r) => r.purchase_code },
      { header: 'Amount', value: (r) => r.amount },
      { header: 'Created by', value: (r) => r.created_by_name },
      { header: 'Created at', value: (r) => fmtDateTime(r.created_at) },
    ],
    exportName: 'purchase-cash-discounts',
  };
  return (
    <>
      <ListPage config={cfg} />
      <EntityForm open={!!form} onClose={() => setForm(null)} endpoint={EP.cd} title={form?.id ? 'Edit cash discount' : 'New cash discount'} modal
        fields={fields} initial={form} toBody={cashDiscountBody} invalidate={[EP.purchase]}
        validate={(v): Record<string, string> => {
          const a = parseNumber(v.amount);
          if (!(a > 0)) return { amount: tt('Enter an amount greater than zero.') };
          const tot = v.purchase?.data?.total;
          if (typeof tot === 'number' && a >= tot) return { amount: tt('Cash discount must be less than the bill total ({{b}}).', { b: fmtMoney(tot) }) };
          return {};
        }} />
    </>
  );
}
