import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/api/client';
import { useAuth, useStoreId } from '@/auth/AuthContext';
import { ListPage, type ListConfig } from '@/framework/ListPage';
import { METHOD_LABEL } from '@/framework/doc/status';
import { AsyncPicker, type PickerOption } from '@/ui/AsyncPicker';
import { Button, IconButton } from '@/ui/Button';
import { Field, Input, Select, Textarea } from '@/ui/Field';
import { Banner, useConfirm } from '@/ui/Misc';
import { Modal } from '@/ui/Overlay';
import { Pill } from '@/ui/Pill';
import { useToast } from '@/ui/Toast';
import type { IconName } from '@/ui/Icon';
import { fmtDate, fmtDateTime, fmtMoney, fmtTime, parseNumber, toRfc3339 } from '@/lib/format';
import { t as tt } from '@/i18n';
import { CASH_DISCOUNT, ORDER, RETURN_PAYMENT, SALES_PAY_METHODS, SALES_RETURN, searchOrders, searchSalesReturns } from './api';
import { isSystemPayment } from './logic';

export type PayKind = 'sales' | 'return' | 'cash_discount';
type Row = Record<string, any> & { id: string };

interface KindDef {
  title: string; subtitle: string; icon: IconName; endpoint: string; resource: string; createLabel: string; formTitle: string;
  parentLabel: string; canDelete: boolean; extraFields: boolean; metaKey: string; totalLabel: string; invalidate: string[];
  select: string; exportName: string;
}

export const PAY_KINDS: Record<PayKind, KindDef> = {
  sales: {
    title: 'Sales payments', subtitle: 'Money received against sales invoices', icon: 'cash', endpoint: '/v1/sales-payment', resource: 'sales',
    createLabel: 'Receive payment', formTitle: 'Sales payment', parentLabel: 'Sales invoice', canDelete: true, extraFields: true, metaKey: 'total_payment', totalLabel: 'Total received',
    invalidate: [ORDER], exportName: 'sales-payments',
    select: 'id,date,amount,method,bank_reference,description,reference_type,reference_code,receivable_id,order_id,order_code,created_by_name,created_at,deleted',
  },
  return: {
    title: 'Return refunds', subtitle: 'Money paid back to customers for sales returns', icon: 'cash', endpoint: RETURN_PAYMENT, resource: 'sales_return',
    createLabel: 'Record refund', formTitle: 'Return refund', parentLabel: 'Sales return', canDelete: true, extraFields: true, metaKey: 'total_payment', totalLabel: 'Total refunded',
    invalidate: [SALES_RETURN, ORDER], exportName: 'sales-return-refunds',
    select: 'id,date,amount,method,bank_reference,description,reference_type,reference_code,payable_id,sales_return_id,sales_return_code,order_id,order_code,created_by_name,created_at,deleted',
  },
  cash_discount: {
    title: 'Cash discounts', subtitle: 'Discounts given at payment time on sales invoices', icon: 'tag', endpoint: CASH_DISCOUNT, resource: 'sales',
    createLabel: 'New cash discount', formTitle: 'Cash discount', parentLabel: 'Sales invoice', canDelete: false, extraFields: false, metaKey: 'total_cash_discount', totalLabel: 'Total cash discount',
    invalidate: [ORDER], exportName: 'sales-cash-discounts',
    select: 'id,date,amount,method,order_id,order_code,created_by_name,created_at',
  },
};

const METHOD_FILTER = SALES_PAY_METHODS.map((m) => ({ ...m }));
const methodLabel = (m: string) => tt(METHOD_LABEL[m] || m);

export function paymentListConfig(kind: PayKind, opts: { storeId: string; onEdit: (r: Row) => void; onDelete: (r: Row) => void; onCreate: () => void; canEdit: boolean; canDelete: boolean }): ListConfig<Row> {
  const k = PAY_KINDS[kind];
  const isReturn = kind === 'return';
  return {
    title: k.title,
    subtitle: k.subtitle,
    icon: k.icon,
    endpoint: k.endpoint,
    resource: k.resource,
    select: k.select,
    defaultSort: { key: 'date', dir: -1 },
    searchKey: (q) => (isReturn && !/INV/i.test(q) ? { sales_return_code: q } : { order_code: q }),
    searchPlaceholder: isReturn ? 'Search return # or invoice #…' : 'Search invoice #…',
    onCreate: opts.onCreate,
    createLabel: k.createLabel,
    filters: [
      { id: 'date', label: 'Date', type: 'daterange' },
      ...(isReturn ? [{ id: 'return', label: 'Sales return', type: 'picker' as const, toSearch: (v: string) => ({ sales_return_id: v }), load: (q: string, s: AbortSignal) => searchSalesReturns(opts.storeId, q, s) }] : []),
      { id: 'order', label: 'Sales invoice', type: 'picker', toSearch: (v) => ({ order_id: v }), load: (q, s) => searchOrders(opts.storeId, q, s) },
      { id: 'method', label: 'Method', type: 'select', options: METHOD_FILTER },
      { id: 'amount', label: 'Amount', type: 'number', placeholder: 'e.g. >=1000' },
    ],
    summary: (m, total) => [
      { label: k.totalLabel, value: fmtMoney(m[k.metaKey]) },
      { label: 'Records', value: total.toLocaleString() },
    ],
    columns: [
      ...(isReturn ? [{ key: 'ret', header: tt('Return #'), sortKey: 'sales_return_code', className: 'code', render: (r: Row) => r.sales_return_code || '—' }] : []),
      { key: 'order', header: tt('Invoice #'), sortKey: 'order_code', className: isReturn ? undefined : 'code', render: (r) => <span className="mono">{r.order_code || '—'}</span> },
      { key: 'date', header: tt('Date'), sortKey: 'date', render: (r) => <span className="num">{fmtDate(r.date)} <span className="muted">{fmtTime(r.date)}</span></span> },
      { key: 'amount', header: tt('Amount'), sortKey: 'amount', align: 'end', render: (r) => <b className="num">{fmtMoney(r.amount)}</b> },
      { key: 'method', header: tt('Method'), sortKey: 'method', render: (r) => methodLabel(r.method) },
      ...(k.extraFields ? [{ key: 'ref', header: tt('Reference'), hideBelow: 'md' as const, render: (r: Row) => (isSystemPayment(r) ? <Pill tone="info" icon="lock">{r.reference_code || tt('System')}</Pill> : <span className="muted">{r.bank_reference || r.description || '—'}</span>) }] : []),
      { key: 'created_by', header: tt('Created by'), sortKey: 'created_by_name', hideBelow: 'lg', render: (r) => r.created_by_name || '—' },
      { key: 'created_at', header: tt('Created at'), sortKey: 'created_at', hideBelow: 'xl', render: (r) => <span className="num muted">{fmtDateTime(r.created_at)}</span> },
    ],
    rowActions: (r) => (
      <>
        {opts.canEdit && <IconButton icon="edit" label={`${tt('Edit')} ${r.order_code || ''}`} disabled={isSystemPayment(r)} title={isSystemPayment(r) ? tt('Created automatically — edit it from its source document.') : undefined} onClick={(e) => { e.stopPropagation(); opts.onEdit(r); }} />}
        {k.canDelete && opts.canDelete && <IconButton icon="trash" label={`${tt('Delete')} ${r.order_code || ''}`} disabled={isSystemPayment(r)} onClick={(e) => { e.stopPropagation(); opts.onDelete(r); }} />}
      </>
    ),
    onRowClick: (r) => { if (opts.canEdit && !isSystemPayment(r)) opts.onEdit(r); },
    mobileCard: (r) => ({ title: <span className="mono">{isReturn ? r.sales_return_code : r.order_code}</span>, amount: fmtMoney(r.amount), subtitle: methodLabel(r.method), meta: <>{fmtDate(r.date)}{r.created_by_name ? ` · ${r.created_by_name}` : ''}</> }),
    exportColumns: [
      ...(isReturn ? [{ header: 'Return #', value: (r: Row) => r.sales_return_code }] : []),
      { header: 'Invoice #', value: (r) => r.order_code },
      { header: 'Date', value: (r) => fmtDateTime(r.date) },
      { header: 'Amount', value: (r) => r.amount },
      { header: 'Method', value: (r) => r.method },
      { header: 'Created by', value: (r) => r.created_by_name },
    ],
    exportName: k.exportName,
    showFooter: false,
  };
}

export function PaymentListPage({ kind }: { kind: PayKind }) {
  const k = PAY_KINDS[kind];
  const { t } = useTranslation();
  const storeId = useStoreId();
  const { can } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const [sp, setSp] = useSearchParams();
  const [form, setForm] = useState<{ open: boolean; id?: string }>({ open: sp.get('new') === '1' });
  const [confirmEl, ask] = useConfirm();
  useEffect(() => {
    if (sp.get('new') === '1') { setForm({ open: true }); setSp((p) => { const n = new URLSearchParams(p); n.delete('new'); return n; }, { replace: true }); }
  }, [sp, setSp]);

  const onDelete = async (r: Row) => {
    if (!(await ask(t('Delete this {{what}}?', { what: t(k.formTitle).toLowerCase() }), { danger: true, confirmLabel: t('Delete'), body: <>{fmtMoney(r.amount)} · {methodLabel(r.method)} · <span className="mono">{r.sales_return_code || r.order_code}</span><p className="muted">{t('The document’s paid amount and balance are recalculated.')}</p></> }))) return;
    try {
      await api.del(`${k.endpoint}/${r.id}`, { search: { store_id: storeId } });
      [k.endpoint, ...k.invalidate].forEach((x) => qc.invalidateQueries({ queryKey: [x] }));
      toast.success(t('Deleted'));
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : (e as Error).message);
    }
  };
  const cfg = paymentListConfig(kind, {
    storeId, onEdit: (r) => setForm({ open: true, id: r.id }), onDelete, onCreate: () => setForm({ open: true }),
    canEdit: can(k.resource, 'update'), canDelete: can(k.resource, 'delete'),
  });
  return (
    <>
      <ListPage config={cfg} />
      <PaymentFormModal kind={kind} open={form.open} id={form.id} onClose={() => setForm({ open: false })} />
      {confirmEl}
    </>
  );
}

/* ---------------------------------------------------------------- form */

const toLocalInput = (d: Date) => toRfc3339(d).slice(0, 16);

export function PaymentFormModal({ kind, open, id, onClose }: { kind: PayKind; open: boolean; id?: string; onClose: () => void }) {
  const k = PAY_KINDS[kind];
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const storeId = useStoreId();
  const [rec, setRec] = useState<Row | null>(null);
  const [parent, setParent] = useState<PickerOption<any> | null>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [date, setDate] = useState('');
  const [ref, setRef] = useState('');
  const [desc, setDesc] = useState('');
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrs({}); setRec(null); setParent(null); setAmount(''); setMethod('cash'); setDate(toLocalInput(new Date())); setRef(''); setDesc('');
    if (!id) return;
    setLoading(true);
    api.get<Row>(`${k.endpoint}/${id}`, { search: { store_id: storeId } }).then((r) => {
      const x = r.result!;
      setRec(x);
      const code = kind === 'return' ? x.sales_return_code : x.order_code;
      setParent({ id: kind === 'return' ? x.sales_return_id : x.order_id, label: code || '', data: null });
      setAmount(String(x.amount ?? ''));
      setMethod(x.method || 'cash');
      setDate(toLocalInput(x.date ? new Date(x.date) : new Date()));
      setRef(x.bank_reference || '');
      setDesc(x.description || '');
    }).catch((e) => setErrs({ load: e instanceof ApiError ? e.message : (e as Error).message })).finally(() => setLoading(false));
  }, [open, id, k.endpoint, kind, storeId]);

  const p = parent?.data;
  /** What is still open on the picked document (create only — the server re-checks either way). */
  const openAmount = !id && p ? (kind === 'cash_discount' ? Math.max(0, (p.total_payment_received || 0) - (p.cash_discount || 0)) : Math.max(0, p.balance_amount || 0)) : undefined;

  const pick = (o: PickerOption<any> | null) => {
    setParent(o);
    if (o?.data && !id && kind !== 'cash_discount') setAmount(String(Math.max(0, o.data.balance_amount || 0)));
  };

  const submit = async () => {
    const a = parseNumber(amount);
    const e: Record<string, string> = {};
    if (!parent) e.parent = t('{{f}} is required', { f: t(k.parentLabel) });
    if (!(a > 0)) e.amount = t('Enter an amount greater than zero.');
    else if (openAmount !== undefined && kind !== 'cash_discount' && a > openAmount + 0.004) e.amount = t('Amount can’t exceed the balance due ({{b}}).', { b: fmtMoney(openAmount) });
    else if (openAmount !== undefined && kind === 'cash_discount' && a >= openAmount) e.amount = t('Cash discount must be less than {{b}} (amount received).', { b: fmtMoney(openAmount) });
    if (!method) e.method = t('Payment method is required');
    if (!date) e.date_str = t('Date is required');
    setErrs(e);
    if (Object.keys(e).length) return;
    const parentFields = kind === 'return'
      ? { sales_return_id: parent!.id, sales_return_code: parent!.label, order_id: p?.order_id ?? rec?.order_id, order_code: p?.order_code ?? rec?.order_code }
      : { order_id: parent!.id, order_code: parent!.label };
    const body: Record<string, any> = { ...(rec || {}), ...parentFields, store_id: storeId, amount: a, method, date_str: toRfc3339(new Date(date)) };
    if (k.extraFields) Object.assign(body, { bank_reference: ref || null, description: desc || null });
    setBusy(true);
    try {
      if (id) await api.put(`${k.endpoint}/${id}`, body, { search: { store_id: storeId } });
      else await api.post(k.endpoint, body, { search: { store_id: storeId } });
      [k.endpoint, ...k.invalidate].forEach((x) => qc.invalidateQueries({ queryKey: [x] }));
      toast.success(id ? t('Saved') : t('{{what}} of {{a}} recorded', { what: t(k.formTitle), a: fmtMoney(a) }));
      onClose();
    } catch (err) {
      if (err instanceof ApiError) setErrs(err.errors);
      else toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const generic = Object.entries(errs).filter(([key, m]) => m && !['amount', 'method', 'payment_method', 'date_str', 'parent'].includes(key));
  const load = kind === 'return' ? (q: string, s: AbortSignal) => searchSalesReturns(storeId, q, s) : (q: string, s: AbortSignal) => searchOrders(storeId, q, s);
  return (
    <Modal open={open} onClose={onClose} title={t(id ? 'Edit {{what}}' : 'New {{what}}', { what: t(k.formTitle).toLowerCase() })} width={520}
      footer={<><Button variant="ghost" onClick={onClose}>{t('Cancel')}</Button><Button variant="primary" icon="check" loading={busy} disabled={loading} onClick={submit}>{id ? t('Save changes') : t('Save')}</Button></>}>
      <form className="stack" style={{ gap: 14 }} onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate>
        {generic.length > 0 && <Banner tone="crit">{generic.map(([, m]) => m).join(' · ')}</Banner>}
        {openAmount !== undefined && (
          <div className="bal due"><span>{kind === 'cash_discount' ? t('Received on invoice') : kind === 'return' ? t('Still to refund') : t('Balance due')}</span><span className="num">{fmtMoney(openAmount)}</span></div>
        )}
        <div className="grid-2c">
          <Field label={t(k.parentLabel)} required error={errs.parent} className="span2">
            {(fid) => <AsyncPicker id={fid} value={parent} onChange={pick} load={load} eager clearable disabled={!!id} invalid={!!errs.parent} placeholder={t('Search by number or customer…')} />}
          </Field>
          <Field label={t('Amount')} required error={errs.amount}>{(fid, d) => <Input id={fid} aria-describedby={d} inputMode="decimal" className="num" value={amount} onChange={(e) => setAmount(e.target.value)} invalid={!!errs.amount} />}</Field>
          <Field label={t('Method')} required error={errs.method || errs.payment_method}>{(fid) => <Select id={fid} value={method} onChange={(e) => setMethod(e.target.value)} options={SALES_PAY_METHODS.map((m) => ({ ...m, label: t(m.label) }))} />}</Field>
          <Field label={t('Date')} required error={errs.date_str}>{(fid) => <Input id={fid} type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />}</Field>
          {k.extraFields && <Field label={t('Bank reference')}>{(fid) => <Input id={fid} value={ref} onChange={(e) => setRef(e.target.value)} />}</Field>}
          {k.extraFields && <Field label={t('Note')} className="span2">{(fid) => <Textarea id={fid} rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} />}</Field>}
        </div>
        {kind === 'cash_discount' && <div className="hint">{t('All cash discounts on an invoice must stay below the amount received on it.')}</div>}
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

export const SalesPaymentsPage = () => <PaymentListPage kind="sales" />;
export const ReturnPaymentsPage = () => <PaymentListPage kind="return" />;
export const CashDiscountsPage = () => <PaymentListPage kind="cash_discount" />;
