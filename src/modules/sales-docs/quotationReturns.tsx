import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/api/client';
import { useRecord } from '@/api/hooks';
import { useAuth, useStoreId } from '@/auth/AuthContext';
import { ListPage, type ListConfig } from '@/framework/ListPage';
import { DocumentView, type ViewConfig } from '@/framework/doc/DocumentView';
import { BillSummary, PaymentsEditor, blankPayment } from '@/framework/doc/Summary';
import { ReceivePaymentModal } from '@/framework/doc/ReceivePayment';
import { PaymentPill, PAYMENT_STATUS_OPTIONS, METHOD_LABEL } from '@/framework/doc/status';
import { lineTotalWithVat, newLineKey, setQuantity, setUnitDiscount, setUnitPrice, type Totals } from '@/framework/doc/calc';
import { searchParties, partyToOption } from '@/framework/doc/lookups';
import { AsyncPicker, type PickerOption } from '@/ui/AsyncPicker';
import { Button, IconButton } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Field, Input, Textarea } from '@/ui/Field';
import { Banner, EmptyState, ErrorState, Skeleton, useConfirm } from '@/ui/Misc';
import { ObjectBody, ObjectHeader } from '@/ui/ObjectPage';
import { Pill } from '@/ui/Pill';
import { useToast } from '@/ui/Toast';
import { usePageMeta } from '@/shell/Workspace';
import { fmtDate, fmtDateTime, fmtMoney, fmtTime, parseNumber, toRfc3339 } from '@/lib/format';
import { t as tt } from '@/i18n';
import { ShareActions } from '@/modules/sales/share';
import { QUOTATION, QTN_LIST } from './quotations';
import {
  autoRefund, buildReturnBody, refundCap, returnRows, returnSummaryFrom, returnTotals, validateReturn, ZERO_ID, type ReturnDraft, type ReturnRow,
} from './logic';

export const QSR = '/v1/quotation-sales-return';
export const QSR_PAYMENT = '/v1/quotation-sales-return-payment';
export const QSR_LIST = '/sales/quotation-returns';

type Ret = Record<string, any> & { id: string; code: string };

const SELECT = 'id,code,date,customer_id,customer_name,customer_name_arabic,quotation_id,quotation_code,net_total,vat_price,total_payment_paid,balance_amount,payment_status,payment_methods,cash_discount,discount,net_profit,net_loss,created_by_name,created_at';

/** Refund methods (quotation_sales_return/create.js): `quotation_sales` settles against the quotation invoice. */
export const REFUND_METHODS = [
  { value: 'cash', label: 'Cash' }, { value: 'debit_card', label: 'Debit card' }, { value: 'credit_card', label: 'Credit card' }, { value: 'bank_card', label: 'Bank card' },
  { value: 'bank_transfer', label: 'Bank transfer' }, { value: 'bank_cheque', label: 'Bank cheque' }, { value: 'customer_account', label: 'Customer account' },
  { value: 'quotation_sales', label: 'Quotation sales' },
];

export const qsrSearchKey = (q: string) => (/^QTN/i.test(q.trim()) ? { quotation_code: q.trim() } : { code: q.trim() });

export function qsrListConfig(): ListConfig<Ret> {
  return {
    title: 'Quotation sales returns',
    subtitle: 'Returns against sales recorded as quotation invoices',
    icon: 'undo',
    endpoint: QSR,
    resource: 'qtn_sales_return',
    select: SELECT,
    defaultSort: { key: 'created_at', dir: -1 },
    searchKey: qsrSearchKey,
    searchPlaceholder: 'Search return # or quotation #…',
    createPath: `${QSR_LIST}/new`,
    createLabel: 'New return',
    detailPath: (r) => `${QSR_LIST}/${r.id}`,
    views: [
      { id: 'all', label: 'All returns' },
      { id: 'open', label: 'Refund due', search: { payment_status: 'not_paid,paid_partially' } },
      { id: 'paid', label: 'Refunded', search: { payment_status: 'paid' } },
    ],
    filters: [
      { id: 'date', label: 'Date', type: 'daterange' },
      { id: 'customer', label: 'Customer', type: 'picker', toSearch: (v) => ({ customer_id: v }), load: async () => [] },
      { id: 'quotation', label: 'Quotation', type: 'picker', toSearch: (v) => ({ quotation_id: v }), load: async () => [] },
      { id: 'payment_status', label: 'Payment status', type: 'select', options: PAYMENT_STATUS_OPTIONS },
      { id: 'payment_methods', label: 'Payment method', type: 'select', options: REFUND_METHODS },
      { id: 'net_total', label: 'Amount', type: 'number', placeholder: 'e.g. >=1000' },
    ],
    summary: (m) => [
      { label: 'Sales returns', value: fmtMoney(m.total_quotation_sales_return) },
      { label: 'Refunded', value: fmtMoney(m.paid_quotation_sales_return) },
      { label: 'Refund due', value: fmtMoney(m.unpaid_quotation_sales_return), tone: m.unpaid_quotation_sales_return > 0 ? 'warn' : undefined },
      { label: 'Cash', value: fmtMoney(m.cash_quotation_sales_return) },
      { label: 'Bank', value: fmtMoney(m.bank_account_quotation_sales_return) },
      { label: 'VAT returned', value: fmtMoney(m.vat_price) },
      { label: 'Net profit', value: fmtMoney(m.net_profit) },
      { label: 'Net loss', value: fmtMoney(m.net_loss), tone: m.net_loss > 0 ? 'crit' : undefined },
    ],
    columns: [
      { key: 'code', header: tt('Return #'), sortKey: 'code', className: 'code', render: (r) => r.code },
      { key: 'date', header: tt('Date'), sortKey: 'date', render: (r) => <span className="num">{fmtDate(r.date)} <span className="muted">{fmtTime(r.date)}</span></span> },
      { key: 'customer', header: tt('Customer'), sortKey: 'customer_name', className: 'two', render: (r) => <><b><bdi>{r.customer_name || '—'}</bdi></b>{r.customer_name_arabic ? <span><bdi>{r.customer_name_arabic}</bdi></span> : null}</> },
      { key: 'quotation', header: tt('Quotation'), sortKey: 'quotation_code', hideBelow: 'md', render: (r) => <span className="mono">{r.quotation_code || '—'}</span> },
      { key: 'net_total', header: tt('Total'), sortKey: 'net_total', align: 'end', render: (r) => <b className="num">{fmtMoney(r.net_total)}</b> },
      { key: 'paid', header: tt('Refunded'), sortKey: 'total_payment_paid', align: 'end', hideBelow: 'md', render: (r) => <span className="num">{fmtMoney(r.total_payment_paid)}</span> },
      { key: 'balance', header: tt('Balance'), sortKey: 'balance_amount', align: 'end', render: (r) => <span className="num" style={r.balance_amount > 0 ? { color: 'var(--crit)', fontWeight: 600 } : { color: 'var(--text-4)' }}>{fmtMoney(r.balance_amount)}</span> },
      { key: 'status', header: tt('Payment'), render: (r) => <PaymentPill status={r.payment_status} /> },
      { key: 'profit', header: tt('Net profit'), sortKey: 'net_profit', align: 'end', hideBelow: 'xl', render: (r) => <span className="num">{fmtMoney(r.net_profit)}</span> },
      { key: 'created_by', header: tt('Created by'), hideBelow: 'xl', render: (r) => r.created_by_name || '—' },
    ],
    mobileCard: (r) => ({ title: <span className="mono">{r.code}</span>, amount: fmtMoney(r.net_total), subtitle: <bdi>{r.customer_name}</bdi>, meta: <>{fmtDate(r.date)} <span className="mono">{r.quotation_code}</span> <PaymentPill status={r.payment_status} /></> }),
    exportColumns: [
      { header: 'Return #', value: (r) => r.code },
      { header: 'Date', value: (r) => fmtDate(r.date) },
      { header: 'Customer', value: (r) => r.customer_name },
      { header: 'Quotation', value: (r) => r.quotation_code },
      { header: 'Total', value: (r) => r.net_total },
      { header: 'Refunded', value: (r) => r.total_payment_paid },
      { header: 'Balance', value: (r) => r.balance_amount },
      { header: 'Payment status', value: (r) => r.payment_status },
      { header: 'Net profit', value: (r) => r.net_profit },
      { header: 'Created by', value: (r) => r.created_by_name },
    ],
    exportName: 'quotation-sales-returns',
    showFooter: false,
  };
}

/** Invoice-type quotations for pickers (returns are only allowed against `type: invoice`). */
export async function searchInvoiceQuotations(storeId: string, q: string, signal?: AbortSignal): Promise<PickerOption[]> {
  const search: Record<string, string> = { store_id: storeId, type: 'invoice' };
  if (q.trim()) search.code = q.trim();
  const r = await api.get<any[]>(QUOTATION, { search, limit: 20, sort: '-created_at', select: 'id,code,date,customer_name,net_total' }, signal);
  return (r.result || []).map((d) => ({ id: d.id, label: d.code, sub: [d.customer_name, fmtDate(d.date)].filter(Boolean).join(' · '), right: fmtMoney(d.net_total), data: d }));
}

export function QsrListPage() {
  const storeId = useStoreId();
  const cfg = qsrListConfig();
  cfg.filters = cfg.filters!.map((f) => {
    if (f.type !== 'picker') return f;
    if (f.id === 'customer') return { ...f, load: async (q: string, s: AbortSignal) => (await searchParties('customer', storeId, q, s)).map(partyToOption) };
    return { ...f, load: (q: string, s: AbortSignal) => searchInvoiceQuotations(storeId, q, s) };
  });
  return <ListPage config={cfg} />;
}

// ───────────────────────── Editor ─────────────────────────

const toLocalInput = (d: Date) => toRfc3339(d).slice(0, 16);

function initialDraft(q: any, existing?: any): ReturnDraft {
  const payable = q?.payment_status !== 'not_paid';
  if (existing) {
    return {
      date: toLocalInput(existing.date ? new Date(existing.date) : new Date()),
      remarks: existing.remarks || '', phone: existing.phone || '', vat_no: existing.vat_no || '', address: existing.address || '',
      rows: returnRows(q, existing),
      summary: {
        vat_percent: existing.vat_percent ?? 15, shipping_handling_fees: existing.shipping_handling_fees || 0, discount: existing.discount || 0,
        discount_with_vat: existing.discount_with_vat || 0, auto_rounding_amount: existing.auto_rounding_amount ?? true, rounding_amount: existing.rounding_amount || 0, cash_discount: existing.cash_discount || 0,
      },
      payments: (existing.payments || []).filter((p: any) => !p.deleted).map((p: any) => ({ ...p, key: newLineKey(), date_str: p.date_str || p.date || toRfc3339(new Date()) })),
    };
  }
  return {
    date: toLocalInput(new Date()),
    remarks: q?.remarks || '', phone: q?.phone || '', vat_no: q?.vat_no || '', address: q?.address || '',
    rows: returnRows(q),
    summary: returnSummaryFrom(q),
    payments: payable ? [blankPayment(0)] : [],
  };
}

function QtyCell({ row, i, vat, onChange, error }: { row: ReturnRow; i: number; vat: number; onChange: (r: ReturnRow) => void; error?: string }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <>
      <input className={`cell num${error ? ' err' : ''}`} inputMode="decimal" aria-label={`${t('Return quantity')} ${i + 1}`} disabled={!row.selected} aria-invalid={!!error || undefined}
        value={draft ?? String(row.quantity)} onFocus={(e) => { setDraft(String(row.quantity)); e.currentTarget.select(); }}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { if (draft !== null) onChange(setQuantity(row, parseNumber(draft), vat) as ReturnRow); setDraft(null); }}
        onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()} />
      <div className="hint">{t('max')} {row.max}</div>
      {error && <div className="errmsg">{error}</div>}
    </>
  );
}

function MoneyCell({ value, label, disabled, onCommit }: { value: number; label: string; disabled?: boolean; onCommit: (n: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <input className="cell num" inputMode="decimal" aria-label={label} disabled={disabled}
      value={draft ?? String(Number(value.toFixed(4)))} onFocus={(e) => { setDraft(String(Number(value.toFixed(4)))); e.currentTarget.select(); }}
      onChange={(e) => setDraft(e.target.value)} onBlur={() => { if (draft !== null) onCommit(parseNumber(draft)); setDraft(null); }}
      onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()} />
  );
}

/** Selectable return lines (every quotation line; only ticked ones are returned). */
export function ReturnLinesTable({ rows, vat, onChange, errors }: { rows: ReturnRow[]; vat: number; onChange: (rows: ReturnRow[]) => void; errors: Record<string, string> }) {
  const { t } = useTranslation();
  const selectable = rows.filter((r) => r.max > 0);
  const all = selectable.length > 0 && selectable.every((r) => r.selected);
  const upd = (i: number, r: ReturnRow) => onChange(rows.map((x, j) => (j === i ? r : x)));
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="lines" aria-label={t('Items to return')}>
        <thead>
          <tr>
            <th style={{ width: 36 }}><input type="checkbox" className="chk" aria-label={t('Select all')} checked={all} disabled={!selectable.length} onChange={(e) => onChange(rows.map((r) => (r.max > 0 ? { ...r, selected: e.target.checked } : r)))} /></th>
            <th>{t('Item')}</th>
            <th className="r" style={{ width: 100 }}>{t('Qty')}</th>
            <th className="r" style={{ width: 112 }}>{t('Unit price')}<div className="muted" style={{ fontWeight: 500, fontSize: 10.5 }}>{t('ex VAT')}</div></th>
            <th className="r" style={{ width: 100 }}>{t('Disc.')}<div className="muted" style={{ fontWeight: 500, fontSize: 10.5 }}>{t('per unit')}</div></th>
            <th className="r" style={{ width: 112 }}>{t('Amount')}<div className="muted" style={{ fontWeight: 500, fontSize: 10.5 }}>{t('incl. VAT')}</div></th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={6}><EmptyState icon="box" title={t('No items on this quotation')} /></td></tr>}
          {rows.map((r, i) => (
            <tr className="ln" key={r.key} style={r.selected ? undefined : { opacity: 0.6 }}>
              <td><input type="checkbox" className="chk" aria-label={`${t('Return')} ${r.name}`} checked={r.selected} disabled={r.max <= 0 && !r.selected} onChange={(e) => upd(i, { ...r, selected: e.target.checked })} /></td>
              <td className="pn">
                <b>{r.name}</b>
                <span>{r.part_number && <span className="mono">{r.part_number}</span>}{r.max <= 0 && <> · <span className="muted">{t('Already returned in full')}</span></>}</span>
                {errors[`product_id_${i}`] && <div className="errmsg">{errors[`product_id_${i}`]}</div>}
              </td>
              <td data-l={t('Qty')}><QtyCell row={r} i={i} vat={vat} error={errors[`quantity_${i}`]} onChange={(x) => upd(i, x)} /></td>
              <td data-l={t('Unit price')}><MoneyCell label={`${t('Unit price')} ${i + 1}`} value={r.unit_price} disabled={!r.selected} onCommit={(n) => upd(i, setUnitPrice(r, n, vat) as ReturnRow)} /></td>
              <td data-l={t('Disc.')}><MoneyCell label={`${t('Unit discount')} ${i + 1}`} value={r.unit_discount} disabled={!r.selected} onCommit={(n) => upd(i, setUnitDiscount(r, n, vat) as ReturnRow)} />{errors[`unit_discount_${i}`] && <div className="errmsg">{errors[`unit_discount_${i}`]}</div>}</td>
              <td className="r num lt" data-l={t('Amount')} style={{ fontWeight: 600 }}>{r.selected ? fmtMoney(lineTotalWithVat(r)) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Pick an invoice-type quotation when /new is opened without ?quotation_id=. */
function ChooseQuotation() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const storeId = useStoreId();
  usePageMeta(t('New quotation sales return'), 'plus');
  return (
    <>
      <ObjectHeader crumbs={[{ label: t('Sales'), to: QSR_LIST }, { label: t('Quotation sales returns'), to: QSR_LIST }, { label: t('New') }]} icon="undo" title={t('New quotation sales return')} />
      <div className="pad">
        <Card title={t('Which sale is being returned?')} sub={t('Returns are recorded against a quotation invoice (sales in quotation).')}>
          <AsyncPicker value={null} eager autoFocus aria-label={t('Quotation invoice')} placeholder={t('Search quotation #…')}
            load={(q, s) => searchInvoiceQuotations(storeId, q, s)} onChange={(o) => o && nav(`${QSR_LIST}/new?quotation_id=${o.id}`, { replace: true })} />
        </Card>
      </div>
    </>
  );
}

function ReturnEditor({ quotation, existing }: { quotation: any; existing?: Ret }) {
  const { t } = useTranslation();
  const nav = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const { can } = useAuth();
  const storeId = useStoreId();
  const id = existing?.id;
  const [d, setD] = useState<ReturnDraft>(() => initialDraft(quotation, existing));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [server, setServer] = useState<Partial<Totals> | null>(null);
  const [touchedPay, setTouchedPay] = useState(!!id);
  const reqId = useRef(0);
  const payable = quotation?.payment_status !== 'not_paid';
  const cap = refundCap(quotation, existing);
  usePageMeta(id ? `${t('Edit')} ${existing?.code}` : t('New quotation sales return'), id ? 'edit' : 'plus');

  const update = (patch: Partial<ReturnDraft>) => { setD((x) => ({ ...x, ...patch })); setDirty(true); };
  const local = useMemo(() => returnTotals(d.rows, d.summary), [d.rows, d.summary]);
  const totals: Totals = useMemo(() => (server ? { ...local, ...server } as Totals : local), [local, server]);

  // Server totals (stale responses dropped), same contract as the shared editor.
  useEffect(() => {
    if (!storeId || !d.rows.some((r) => r.selected)) { setServer(null); return; }
    const my = ++reqId.current;
    const h = setTimeout(async () => {
      try {
        const r = await api.post<any>(`${QSR}/calculate-net-total`, buildReturnBody(d, local, { storeId, quotation, payable }), { search: { store_id: storeId } });
        if (my !== reqId.current || !r.result) return;
        const x = r.result;
        const pick = (k: keyof Totals) => (typeof x[k] === 'number' ? { [k]: x[k] } : {});
        setServer({ ...pick('total'), ...pick('total_with_vat'), ...pick('vat_price'), ...pick('net_total'), ...(d.summary.auto_rounding_amount ? pick('rounding_amount') : {}) });
      } catch {
        if (my === reqId.current) setServer(null);
      }
    }, 450);
    setServer(null);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d.rows, d.summary, storeId]);

  // New return, one untouched refund row: keep it at min(return total, refundable).
  useEffect(() => {
    if (touchedPay || !payable) return;
    const live = d.payments.filter((p) => !p.deleted);
    if (live.length !== 1) return;
    const amt = autoRefund(totals, d.summary.cash_discount, cap);
    if (live[0].amount !== amt) setD((x) => ({ ...x, payments: x.payments.map((p) => (p === live[0] ? { ...p, amount: amt } : p)) }));
  }, [totals, d.summary.cash_discount, d.payments, cap, payable, touchedPay]);

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const save = useCallback(async () => {
    const e = Object.fromEntries(Object.entries(validateReturn(d, totals, { quotation, refundCap: cap, payable })).map(([k, v]) => [k, t(v)]));
    setErrors(e);
    if (Object.keys(e).length) { toast.error(t('Please fix the highlighted fields.')); return; }
    setSaving(true);
    try {
      const body = buildReturnBody(d, totals, { storeId, quotation, payable });
      const q = { search: { store_id: storeId } };
      const r = id ? await api.put<any>(`${QSR}/${id}`, body, q) : await api.post<any>(QSR, body, q);
      setDirty(false);
      [QSR, QUOTATION, QSR_PAYMENT].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      toast.success(id ? t('Saved') : t('{{code}} created', { code: r.result?.code || t('Return') }));
      const nid = r.result?.id || id;
      if (nid) nav(`${QSR_LIST}/${nid}`, { replace: !id });
    } catch (err) {
      if (err instanceof ApiError) { setErrors(err.errors); toast.error(err.message); }
      else toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }, [d, totals, quotation, cap, payable, storeId, id, qc, toast, nav, t]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); } };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [save]);

  const canSave = can('qtn_sales_return', id ? 'update' : 'create');
  const selected = d.rows.filter((r) => r.selected).length;
  const known = new Set(['product_id', 'date_str', 'cash_discount', 'total_payment', 'net_total']);
  const otherErrors = Object.entries(errors).filter(([k]) => !/_\d+$/.test(k) && !known.has(k));
  const actions = (
    <div className="row doc-actions">
      <Button variant="ghost" onClick={() => nav(id ? `${QSR_LIST}/${id}` : `${QTN_LIST}/${quotation.id}`)}>{t(dirty ? 'Discard' : 'Close')}</Button>
      <Button variant="primary" icon="check" onClick={save} loading={saving} disabled={!canSave}>{t(id ? 'Save changes' : 'Save')} <kbd style={{ background: 'rgba(255,255,255,.15)', color: '#fff', borderColor: 'rgba(255,255,255,.25)' }}>Ctrl S</kbd></Button>
    </div>
  );

  return (
    <>
      <ObjectHeader
        crumbs={[{ label: t('Sales'), to: QSR_LIST }, { label: t('Quotation sales returns'), to: QSR_LIST }, { label: id ? existing?.code || '' : t('New') }]}
        icon="undo"
        title={id ? <span className="mono" style={{ fontSize: 20 }}>{existing?.code}</span> : t('New quotation sales return')}
        subtitle={<>{t('Against')} <Link className="link mono" to={`${QTN_LIST}/${quotation.id}`}>{quotation.code}</Link> · <bdi>{quotation.customer_name || '—'}</bdi> · {fmtMoney(quotation.net_total)}</>}
        pills={<>{!id && <Pill tone="neutral" icon="edit">{t('Draft')}</Pill>}{dirty && <Pill tone="warn" icon="clock">{t('Unsaved')}</Pill>}</>}
        actions={actions}
      />
      <ObjectBody
        side={
          <aside className="stack" style={{ position: 'sticky', top: 16 }}>
            <Card title={t('Summary')}>
              <BillSummary totals={totals} values={d.summary} features={{ cashDiscount: true, vatEditable: false }} onChange={(p) => update({ summary: { ...d.summary, ...p } })} />
              {errors.cash_discount && <div className="errmsg">{errors.cash_discount}</div>}
              {errors.net_total && <div className="errmsg">{errors.net_total}</div>}
              {errors.discount_with_vat && <div className="errmsg">{errors.discount_with_vat}</div>}
            </Card>
            <Card title={t('Refund')}>
              {payable ? (
                <>
                  <div className="hint" style={{ marginBottom: 8 }}>{t('Refundable (paid on the invoice)')}: <b className="num">{fmtMoney(cap)}</b></div>
                  <PaymentsEditor payments={d.payments} netTotal={totals.net_total} cashDiscount={d.summary.cash_discount} errors={errors} methods={REFUND_METHODS}
                    onChange={(p) => { setTouchedPay(true); update({ payments: p }); }} />
                </>
              ) : <div className="muted" style={{ fontSize: 12.5 }}>{t('The invoice was not paid, so nothing is refunded — the return reduces the customer’s balance.')}</div>}
            </Card>
          </aside>
        }
      >
        {otherErrors.length > 0 && <Banner tone="crit"><b>{t('Couldn’t save.')}</b> {otherErrors.map(([, m]) => m).join(' · ')}</Banner>}
        <Card title={t('Details')}>
          <div className="fgrid">
            <Field label={t('Customer')} className="span2">{() => <div className="inp" style={{ display: 'flex', alignItems: 'center' }}><bdi>{quotation.customer_name || '—'}</bdi></div>}</Field>
            <Field label={t('Date')} required error={errors.date_str}>{(fid, dd) => <Input id={fid} aria-describedby={dd} type="datetime-local" value={d.date} onChange={(e) => update({ date: e.target.value })} />}</Field>
            <Field label={t('Phone')} error={errors.phone}>{(fid, dd) => <Input id={fid} aria-describedby={dd} type="tel" value={d.phone} onChange={(e) => update({ phone: e.target.value })} />}</Field>
            <Field label={t('VAT no.')} error={errors.vat_no}>{(fid, dd) => <Input id={fid} aria-describedby={dd} inputMode="numeric" maxLength={15} value={d.vat_no} onChange={(e) => update({ vat_no: e.target.value })} />}</Field>
            <Field label={t('Remarks')} className="span2">{(fid) => <Textarea id={fid} rows={2} value={d.remarks} onChange={(e) => update({ remarks: e.target.value })} />}</Field>
          </div>
        </Card>
        <Card title={<>{t('Items to return')} <span className="muted" style={{ fontWeight: 500 }}>· {selected}/{d.rows.length}</span></>} bodyClass="card-b-tight">
          <ReturnLinesTable rows={d.rows} vat={d.summary.vat_percent} errors={errors} onChange={(rows) => update({ rows })} />
          {errors.product_id && <div className="errmsg" style={{ padding: '6px 10px' }}>{errors.product_id}</div>}
        </Card>
      </ObjectBody>
      <div className="mbar">
        <div className="t"><span>{t('Total')}</span><b className="num">{fmtMoney(totals.net_total)}</b></div>
        <Button variant="primary" icon="check" onClick={save} loading={saving} disabled={!canSave}>{t('Save')}</Button>
      </div>
    </>
  );
}

export function QsrEditorPage() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const storeId = useStoreId();
  const ret = useRecord<Ret>(QSR, id);
  const quotationId = id ? ret.data?.quotation_id : sp.get('quotation_id');
  const quotation = useQuery({
    queryKey: [QUOTATION, 'one', quotationId, storeId, 'for-return'],
    queryFn: async ({ signal }) => (await api.get<any>(`${QUOTATION}/${quotationId}`, { search: { store_id: storeId } }, signal)).result,
    enabled: !!quotationId && quotationId !== ZERO_ID && !!storeId,
    gcTime: 0,
  });
  if (!id && !quotationId) return <ChooseQuotation />;
  const err = ret.error || quotation.error;
  if (err) return <div className="pad"><ErrorState error={err} onRetry={() => { ret.refetch(); quotation.refetch(); }} /></div>;
  if ((id && !ret.data) || !quotation.data) return <div className="pad stack"><Skeleton width={260} height={22} /><Skeleton height={300} /></div>;
  if (quotation.data.type !== 'invoice') {
    return <div className="pad"><Banner tone="warn"><b>{quotation.data.code}</b> — {tt('Only sales recorded as quotation invoices can be returned. Convert the quotation to a sales invoice and return that instead.')}</Banner></div>;
  }
  return <ReturnEditor key={id || quotationId} quotation={quotation.data} existing={ret.data} />;
}

// ───────────────────────── View ─────────────────────────

/** Refund payments (GET/DELETE /v1/quotation-sales-return-payment). */
function RefundPayments({ d, canDelete }: { d: Ret; canDelete: boolean }) {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const storeId = useStoreId();
  const [confirmEl, ask] = useConfirm();
  const list = useQuery({
    queryKey: [QSR_PAYMENT, 'list', d.id, storeId],
    queryFn: async ({ signal }) => (await api.get<any[]>(QSR_PAYMENT, { search: { store_id: storeId, quotation_sales_return_id: d.id }, limit: 100, sort: '-date' }, signal)).result || [],
    enabled: !!storeId,
  });
  const remove = async (p: any) => {
    if (!(await ask(t('Delete this refund of {{a}}?', { a: fmtMoney(p.amount) }), { danger: true, confirmLabel: t('Delete') }))) return;
    try {
      await api.del(`${QSR_PAYMENT}/${p.id}`, { search: { store_id: storeId } });
      toast.success(t('Refund deleted'));
      [QSR_PAYMENT, QSR, QUOTATION].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : (e as Error).message);
    }
  };
  const rows = (list.data || []).filter((p: any) => !p.deleted);
  return (
    <Card title={t('Refunds')} bodyClass="card-b-tight">
      {list.isError ? <div style={{ padding: 12 }}><ErrorState error={list.error} onRetry={() => list.refetch()} /></div>
        : list.isLoading ? <div style={{ padding: 12 }}><Skeleton height={60} /></div>
          : rows.length === 0 ? <div className="muted" style={{ padding: 12 }}>{t('No refunds recorded.')}</div> : (
            <table className="lines" aria-label={t('Refunds')}>
              <thead><tr><th>{t('Date')}</th><th>{t('Method')}</th><th className="hide-sm">{t('Created by')}</th><th className="r">{t('Amount')}</th><th style={{ width: 44 }} /></tr></thead>
              <tbody>
                {rows.map((p: any) => (
                  <tr key={p.id}>
                    <td className="num">{fmtDateTime(p.date)}</td>
                    <td>{t(METHOD_LABEL[p.method] || REFUND_METHODS.find((m) => m.value === p.method)?.label || p.method)}</td>
                    <td className="hide-sm muted">{p.created_by_name || '—'}</td>
                    <td className="r num" style={{ fontWeight: 600 }}>{fmtMoney(p.amount)}</td>
                    <td>{canDelete && <IconButton icon="trash" label={`${t('Delete refund')} ${fmtMoney(p.amount)}`} onClick={() => remove(p)} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      {confirmEl}
    </Card>
  );
}

export function QsrViewPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { t } = useTranslation();
  const { store, can } = useAuth();
  const q = useRecord<Ret>(QSR, id);
  const [pay, setPay] = useState(false);

  const view: ViewConfig = {
    icon: 'undo',
    crumbs: [{ label: 'Sales', to: QSR_LIST }, { label: 'Quotation sales returns', to: QSR_LIST }],
    partyLabel: 'Customer',
    partyName: (d) => d.customer_name,
    hideVat: !!store?.settings?.no_tax_for_quotation_invoice,
    showPayments: true,
    pills: (d) => <PaymentPill status={d.payment_status} />,
    facets: (d) => [
      { label: t('Return total'), value: <>{fmtMoney(d.net_total)} <small>SAR</small></> },
      { label: t('Refunded'), value: fmtMoney(d.total_payment_paid) },
      { label: t('Refund due'), value: fmtMoney(d.balance_amount), tone: d.balance_amount > 0 ? 'warn' : undefined },
      { label: t('Quotation'), value: d.quotation_code || '—', hideOnMobile: true },
    ],
    steps: (d) => ({ steps: ['Received', 'Partially refunded', 'Refunded'], current: d.payment_status === 'paid' ? 3 : d.payment_status === 'paid_partially' ? 2 : 1 }),
    flow: (d) => [
      { kind: t('Sales (invoice)'), icon: 'clip' as const, code: d.quotation_code, to: d.quotation_id ? `${QTN_LIST}/${d.quotation_id}` : undefined },
      { kind: t('Return'), icon: 'undo' as const, code: d.code, current: true, status: <PaymentPill status={d.payment_status} /> },
      ...(d.payments_count ? [{ kind: t('Refunds'), icon: 'cash' as const, code: `${d.payments_count} × ${fmtMoney(d.total_payment_paid)}` }] : []),
    ],
    actions: (d) => (
      <>
        {d.balance_amount > 0 && can('qtn_sales_return', 'update') && <Button variant="primary" icon="cash" onClick={() => setPay(true)}>{t('Record refund')}</Button>}
        <Button icon="print" onClick={() => window.open(`/print/quotation_sales_return/${d.id}`, '_blank', 'noopener')}>{t('Print')}</Button>
        <ShareActions doc={d} modelName="quotation_sales_return" compact />
        {can('qtn_sales_return', 'update') && <Button icon="edit" onClick={() => nav(`${QSR_LIST}/${d.id}/edit`)}>{t('Edit')}</Button>}
      </>
    ),
    extraTabs: [{ id: 'refunds', label: 'Refunds', render: (d) => <RefundPayments d={d as Ret} canDelete={can('qtn_sales_return', 'update')} /> }],
  };

  return (
    <>
      <DocumentView doc={q.data} loading={q.isLoading} error={q.error} refetch={() => q.refetch()} config={view} />
      {q.data && (
        <ReceivePaymentModal open={pay} onClose={() => setPay(false)} endpoint={QSR_PAYMENT} title={`${t('Record refund')} · ${q.data.code}`} methods={REFUND_METHODS}
          parent={{ quotation_sales_return_id: q.data.id, quotation_sales_return_code: q.data.code, quotation_id: q.data.quotation_id, quotation_code: q.data.quotation_code }}
          balance={q.data.balance_amount} invalidate={[QSR, QUOTATION]} />
      )}
    </>
  );
}
