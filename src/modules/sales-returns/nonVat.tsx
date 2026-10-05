import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/api/client';
import { useRecord } from '@/api/hooks';
import { useAuth, useStoreId } from '@/auth/AuthContext';
import { ListPage, type ListConfig } from '@/framework/ListPage';
import { DocumentView, type ViewConfig } from '@/framework/doc/DocumentView';
import { LinesEditor } from '@/framework/doc/LinesEditor';
import { BillSummary, PaymentsEditor, blankPayment, type SummaryValues } from '@/framework/doc/Summary';
import { newLineKey, linesFromApi, validateLines, type DocLine, type PaymentRow, type Totals } from '@/framework/doc/calc';
import { PaymentPill, PAYMENT_STATUS_OPTIONS } from '@/framework/doc/status';
import { partyToOption, searchParties, type Party } from '@/framework/doc/lookups';
import { AsyncPicker, type PickerOption } from '@/ui/AsyncPicker';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Field, Input, Textarea } from '@/ui/Field';
import { Banner, ErrorState, Skeleton, useConfirm } from '@/ui/Misc';
import { Pill } from '@/ui/Pill';
import { useToast } from '@/ui/Toast';
import { fmtDate, fmtMoney, fmtTime, toRfc3339 } from '@/lib/format';
import { t as tt } from '@/i18n';
import { NON_VAT, NON_VAT_RETURN, PATHS, SALES_PAY_METHODS } from './api';
import { EditorFrame } from './components/EditorFrame';
import { ShareActions } from './components/ShareActions';
import { useServerTotals } from './components/useServerTotals';
import { applyExclusions, looksLikeCode, nonVatDisplayDoc, nonVatProductsToApi, nonVatTotals, normalizeNonVatEdit, paymentsToApi, paymentsTotal, summaryFromDoc, type ExcludeFlags } from './logic';

type NV = Record<string, any> & { id: string; code: string };
const LIST = PATHS.nonVat;
const SELECT = 'id,code,date,customer_id,customer_name,net_total,total_payment_received,balance_amount,payment_status,cash_discount,return_count,return_amount,net_profit,created_by_name,created_at';

export function nonVatListConfig(storeId: string): ListConfig<NV> {
  return {
    title: 'Non-VAT sales',
    subtitle: 'Sales without a tax invoice',
    icon: 'receipt',
    endpoint: NON_VAT,
    resource: 'non_vat_sales',
    select: SELECT,
    defaultSort: { key: 'created_at', dir: -1 },
    searchKey: (q) => (looksLikeCode(q) ? { code: q } : { customer_name: q }),
    searchPlaceholder: 'Search sale # or customer…',
    createPath: `${LIST}/new`,
    createLabel: 'New non-VAT sale',
    detailPath: (r) => `${LIST}/${r.id}`,
    views: [
      { id: 'all', label: 'All sales' },
      { id: 'open', label: 'Open balance', search: { payment_status: 'not_paid,paid_partially' } },
      { id: 'paid', label: 'Paid', search: { payment_status: 'paid' } },
    ],
    filters: [
      { id: 'date', label: 'Date', type: 'daterange' },
      { id: 'customer', label: 'Customer', type: 'picker', toSearch: (v) => ({ customer_id: v }), load: async (q, s) => (await searchParties('customer', storeId, q, s)).map(partyToOption) },
      { id: 'payment_status', label: 'Payment status', type: 'select', options: PAYMENT_STATUS_OPTIONS },
    ],
    summary: (m) => [
      { label: 'Net total', value: fmtMoney(m.net_total) },
      { label: 'Discount', value: fmtMoney(m.discount) },
      { label: 'Net profit', value: fmtMoney(m.net_profit), tone: 'good' },
      { label: 'Net loss', value: fmtMoney(m.net_loss), tone: m.net_loss > 0 ? 'crit' : undefined },
    ],
    columns: [
      { key: 'code', header: tt('Sale #'), sortKey: 'code', className: 'code', render: (r) => r.code },
      { key: 'date', header: tt('Date'), sortKey: 'date', render: (r) => <span className="num">{fmtDate(r.date)} <span className="muted">{fmtTime(r.date)}</span></span> },
      { key: 'customer', header: tt('Customer'), sortKey: 'customer_name', render: (r) => <b><bdi>{r.customer_name || '—'}</bdi></b> },
      { key: 'net_total', header: tt('Total'), sortKey: 'net_total', align: 'end', render: (r) => <b className="num">{fmtMoney(r.net_total)}</b> },
      { key: 'paid', header: tt('Paid'), sortKey: 'total_payment_received', align: 'end', hideBelow: 'md', render: (r) => <span className="num">{fmtMoney(r.total_payment_received)}</span> },
      { key: 'balance', header: tt('Balance'), sortKey: 'balance_amount', align: 'end', render: (r) => <span className="num" style={r.balance_amount > 0 ? { color: 'var(--crit)', fontWeight: 600 } : { color: 'var(--text-4)' }}>{fmtMoney(r.balance_amount)}</span> },
      { key: 'status', header: tt('Payment'), render: (r) => <PaymentPill status={r.payment_status} /> },
      { key: 'returns', header: tt('Returns'), align: 'end', hideBelow: 'lg', render: (r) => (r.return_count ? <span className="num">{r.return_count} · {fmtMoney(r.return_amount)}</span> : <span className="muted">—</span>) },
      { key: 'created_by', header: tt('Created by'), hideBelow: 'xl', render: (r) => r.created_by_name || '—' },
    ],
    mobileCard: (r) => ({ title: <span className="mono">{r.code}</span>, amount: fmtMoney(r.net_total), subtitle: <bdi>{r.customer_name || '—'}</bdi>, meta: <>{fmtDate(r.date)} <PaymentPill status={r.payment_status} /></> }),
    exportColumns: [
      { header: 'Sale #', value: (r) => r.code },
      { header: 'Date', value: (r) => fmtDate(r.date) },
      { header: 'Customer', value: (r) => r.customer_name },
      { header: 'Total', value: (r) => r.net_total },
      { header: 'Paid', value: (r) => r.total_payment_received },
      { header: 'Balance', value: (r) => r.balance_amount },
      { header: 'Payment status', value: (r) => r.payment_status },
      { header: 'Returns', value: (r) => r.return_amount },
    ],
    exportName: 'non-vat-sales',
    showFooter: false,
  };
}

export function NonVatListPage() {
  const storeId = useStoreId();
  return <ListPage config={nonVatListConfig(storeId)} />;
}

/* ---------------------------------------------------------------- editor */

interface NState extends ExcludeFlags { date: string; party: PickerOption<Party> | null; phone: string; remarks: string; lines: DocLine[]; summary: SummaryValues; payments: PaymentRow[] }

const toLocalInput = (d: Date) => toRfc3339(d).slice(0, 16);

function initialNonVat(vat: number, doc?: any): NState {
  if (doc) {
    const flags = { exclude_service_tax: !!doc.exclude_service_tax, exclude_product_tax: !!doc.exclude_product_tax };
    return {
      ...flags,
      date: toLocalInput(doc.date ? new Date(doc.date) : new Date()),
      party: doc.customer_id || doc.customer_name ? { id: doc.customer_id || `new:${doc.customer_name}`, label: doc.customer_name || '', data: { id: doc.customer_id || '', name: doc.customer_name || '' } } : null,
      phone: doc.phone || '', remarks: doc.remarks || '',
      lines: linesFromApi(doc.products, doc.vat_percent ?? vat),
      summary: summaryFromDoc({ ...doc, vat_percent: doc.vat_percent ?? vat }),
      payments: (doc.payments || []).filter((p: any) => !p.deleted).map((p: any) => ({ ...p, key: newLineKey(), date_str: p.date_str || p.date || toRfc3339(new Date()) })),
    };
  }
  // Legacy defaults (QuotationType3Form): services tax-free, products taxed.
  return {
    exclude_service_tax: true, exclude_product_tax: false, date: toLocalInput(new Date()), party: null, phone: '', remarks: '', lines: [],
    summary: { vat_percent: vat, shipping_handling_fees: 0, discount: 0, discount_with_vat: 0, auto_rounding_amount: true, rounding_amount: 0, cash_discount: 0 },
    payments: [blankPayment(0)],
  };
}

export function NonVatEditorPage() {
  const { id } = useParams();
  const q = useRecord<NV>(NON_VAT, id);
  if (id && q.isError) return <div className="pad"><ErrorState error={q.error} onRetry={() => q.refetch()} /></div>;
  if (id && !q.data) return <div className="pad stack"><Skeleton width={260} height={22} /><Skeleton height={300} /></div>;
  return <NonVatEditor key={id || 'new'} id={id} existing={q.data} />;
}

export function NonVatEditor({ id, existing }: { id?: string; existing?: NV }) {
  const { t } = useTranslation();
  const nav = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const { store, can } = useAuth();
  const storeId = store?.id || '';
  const vat = store?.vat_percent ?? 15;
  const [s, setS] = useState<NState>(() => initialNonVat(vat, existing));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const update = useCallback((p: Partial<NState>) => { setS((x) => ({ ...x, ...p })); setDirty(true); }, []);
  const flags = useMemo(() => ({ exclude_service_tax: s.exclude_service_tax, exclude_product_tax: s.exclude_product_tax }), [s.exclude_service_tax, s.exclude_product_tax]);

  const local = useMemo(() => nonVatTotals({ lines: s.lines, ...flags, vat_percent: s.summary.vat_percent, discount: s.summary.discount, cash_discount: s.summary.cash_discount, shipping_handling_fees: s.summary.shipping_handling_fees, auto_rounding_amount: s.summary.auto_rounding_amount, rounding_amount: s.summary.rounding_amount }), [s.lines, s.summary, flags]);
  const body = useMemo(() => ({
    store_id: storeId,
    date_str: toRfc3339(new Date(s.date || Date.now())),
    customer_id: s.party?.id && !s.party.id.startsWith('new:') ? s.party.id : null,
    customer_name: s.party?.label || '',
    phone: s.phone, vat_no: existing?.vat_no || '', address: existing?.address || '',
    remarks: s.remarks,
    vat_percent: s.summary.vat_percent,
    discount: s.summary.discount, discount_with_vat: s.summary.discount_with_vat,
    shipping_handling_fees: s.summary.shipping_handling_fees,
    cash_discount: s.summary.cash_discount,
    auto_rounding_amount: s.summary.auto_rounding_amount, rounding_amount: local.rounding_amount,
    ...flags,
    products: nonVatProductsToApi(s.lines),
    payments_input: paymentsToApi(s.payments),
  }), [storeId, s, existing, flags, local.rounding_amount]);
  const { server, syncing } = useServerTotals(`${NON_VAT}/calculate-net-total`, body, storeId, s.lines.length > 0, s.summary.auto_rounding_amount);
  const totals: Totals = useMemo(() => ({ ...local, ...(server || {}) }), [local, server]);
  const due = Math.max(0, totals.net_total - s.summary.cash_discount);

  useEffect(() => {
    if (id) return;
    const live = s.payments.filter((p) => !p.deleted);
    if (live.length === 1 && !(live[0] as any).touched && live[0].amount !== due) setS((x) => ({ ...x, payments: x.payments.map((p) => (p === live[0] ? { ...p, amount: due } : p)) }));
  }, [due, id, s.payments]);

  const save = async (after: 'view' | 'new' = 'view') => {
    const e: Record<string, string> = {};
    Object.entries(validateLines(s.lines)).forEach(([k, m]) => { e[k] = t(m); });
    if (!s.date) e.date_str = t('Date is required');
    if (paymentsTotal(s.payments) > due + 0.004) e.total_payment = t('Total payment can’t exceed {{n}}.', { n: fmtMoney(due) });
    if (s.summary.cash_discount < 0 || (s.summary.cash_discount > 0 && s.summary.cash_discount >= totals.net_total)) e.cash_discount = t('Cash discount must be less than the total.');
    setErrors(e);
    if (Object.keys(e).length) { toast.error(t('Please fix the highlighted fields.')); return; }
    setSaving(true);
    try {
      const final = { ...body, rounding_amount: totals.rounding_amount };
      const r = id ? await api.put<any>(`${NON_VAT}/${id}`, final, { search: { store_id: storeId } }) : await api.post<any>(NON_VAT, final, { search: { store_id: storeId } });
      setDirty(false);
      qc.invalidateQueries({ queryKey: [NON_VAT] });
      toast.success(id ? t('Saved') : t('{{code}} created', { code: r.result?.code || t('Sale') }));
      if (after === 'new') { setS(initialNonVat(vat)); setErrors({}); nav(`${LIST}/new`, { replace: true }); }
      else if (r.result?.id || id) nav(`${LIST}/${r.result?.id || id}`, { replace: !id });
    } catch (err) {
      if (err instanceof ApiError) { setErrors(err.errors); toast.error(err.message); } else toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const setFlag = (k: keyof ExcludeFlags, v: boolean) => {
    const f = { ...flags, [k]: v };
    // Re-derive tax per line kind when a flag changes (QuotationType3Form exclude_* handlers).
    const lines = s.lines.map((l) => (isKind(l, k) ? { ...l, unit_price_with_vat: l.unit_price, unit_discount_with_vat: l.unit_discount } : l));
    update({ ...f, lines: applyExclusions(lines, f, s.summary.vat_percent) });
  };
  const isKind = (l: DocLine, k: keyof ExcludeFlags) => (k === 'exclude_service_tax' ? !!l.is_service : !l.is_service);

  const known = ['product_id', 'date_str', 'cash_discount', 'total_payment', 'customer_id', 'phone'];
  const otherErrors = Object.entries(errors).filter(([k, m]) => m && !/_\d+$/.test(k) && !known.includes(k));
  const canSave = can('non_vat_sales', id ? 'update' : 'create');

  return (
    <EditorFrame
      crumbs={[{ label: 'Sales', to: PATHS.invoices }, { label: 'Non-VAT sales', to: LIST }, { label: id ? existing?.code || '' : 'New' }]}
      icon="receipt"
      title={id ? <span className="mono" style={{ fontSize: 20 }}>{existing?.code}</span> : t('New non-VAT sale')}
      pills={<>{!id && <Pill tone="neutral" icon="edit">{t('Draft')}</Pill>}{dirty && <Pill tone="warn" icon="clock">{t('Unsaved')}</Pill>}</>}
      onSave={() => save()} onSaveNew={() => save('new')}
      onClose={() => nav(id ? `${LIST}/${id}` : LIST)}
      saving={saving} canSave={canSave} dirty={dirty} total={totals.net_total} editing={!!id}
      side={
        <>
          <Card title={t('Summary')}>
            <BillSummary totals={{ ...totals, total: totals.total_with_vat }} values={s.summary} syncing={syncing}
              features={{ shipping: true, discount: true, rounding: true, cashDiscount: true, hideVat: true, vatEditable: false }}
              onChange={(patch) => update({ summary: { ...s.summary, ...patch } })} />
            {s.summary.cash_discount > 0 && <div className="hint" style={{ marginTop: 6 }}>{t('Cash discount is deducted from the total and again from the balance (server rule).')}</div>}
            {errors.cash_discount && <div className="errmsg">{errors.cash_discount}</div>}
          </Card>
          <Card title={t('Payment')}>
            <PaymentsEditor payments={s.payments} netTotal={totals.net_total} cashDiscount={s.summary.cash_discount} errors={errors} methods={SALES_PAY_METHODS}
              onChange={(p) => update({ payments: p.map((x) => ({ ...x, touched: true }) as PaymentRow) })} />
          </Card>
        </>
      }
    >
      {otherErrors.length > 0 && <Banner tone="crit"><b>{t('Couldn’t save.')}</b> {otherErrors.map(([, m]) => m).join(' · ')}</Banner>}
      <Card title={t('Details')}>
        <div className="fgrid">
          <Field label={t('Customer')} error={errors.customer_id} className="span2">
            {(fid, d) => (
              <AsyncPicker<Party> id={fid} aria-describedby={d} value={s.party} clearable eager placeholder={t('Search by name, phone, VAT no., code…')}
                onChange={(o) => update({ party: o, phone: o?.data?.phone || s.phone })}
                load={async (q, sig) => (await searchParties('customer', storeId, q, sig)).map(partyToOption)}
                onCreate={(q) => update({ party: { id: `new:${q}`, label: q, data: { id: '', name: q } } })} createLabel={t('Use “{{q}}” as the customer name', { q: '…' })} />
            )}
          </Field>
          <Field label={t('Date')} required error={errors.date_str}>{(fid, d) => <Input id={fid} aria-describedby={d} type="datetime-local" value={s.date} onChange={(e) => update({ date: e.target.value })} />}</Field>
          <Field label={t('Phone')} error={errors.phone}>{(fid, d) => <Input id={fid} aria-describedby={d} type="tel" value={s.phone} onChange={(e) => update({ phone: e.target.value })} />}</Field>
          <div className="sr-flags span2">
            <label className="checkline"><input type="checkbox" className="chk" checked={s.exclude_service_tax} onChange={(e) => setFlag('exclude_service_tax', e.target.checked)} />{t('Exclude service tax')}</label>
            <label className="checkline"><input type="checkbox" className="chk" checked={s.exclude_product_tax} onChange={(e) => setFlag('exclude_product_tax', e.target.checked)} />{t('Exclude product tax')}</label>
          </div>
          <Field label={t('Remarks')} className="span2">{(fid) => <Textarea id={fid} rows={2} value={s.remarks} onChange={(e) => update({ remarks: e.target.value })} />}</Field>
        </div>
      </Card>
      <Card title={<>{t('Items')} <span className="muted" style={{ fontWeight: 500 }}>· {s.lines.length}</span></>} bodyClass="card-b-tight">
        <LinesEditor lines={s.lines} vat={s.summary.vat_percent} storeId={storeId} priceSource="retail" errors={errors} checkStock={!id}
          columns={['unit_price', 'unit_price_with_vat', 'unit_discount', 'line_total_with_vat']}
          onChange={(lines) => update({ lines: normalizeNonVatEdit(s.lines, lines, flags, s.summary.vat_percent) })}
          onToast={(m, k) => (k === 'error' ? toast.error(m) : toast.success(m))} />
      </Card>
    </EditorFrame>
  );
}

/* ---------------------------------------------------------------- view */

export function NonVatViewPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const storeId = useStoreId();
  const { can } = useAuth();
  const q = useRecord<NV>(NON_VAT, id);
  const [busy, setBusy] = useState(false);
  const [confirmEl, ask] = useConfirm();

  const del = async (d: NV) => {
    if (!(await ask(t('Delete sale {{code}}?', { code: d.code }), { danger: true, confirmLabel: t('Delete'), body: t('The sale is removed from lists and stock is restored.') }))) return;
    setBusy(true);
    try {
      await api.del(`${NON_VAT}/${d.id}`, { search: { store_id: storeId } });
      qc.invalidateQueries({ queryKey: [NON_VAT] });
      toast.success(t('Sale deleted'));
      nav(LIST);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const view: ViewConfig = {
    icon: 'receipt',
    crumbs: [{ label: 'Sales', to: PATHS.invoices }, { label: 'Non-VAT sales', to: LIST }],
    partyLabel: 'Customer',
    partyName: (d) => d.customer_name,
    hideVat: true,
    showPayments: true,
    pills: (d) => <><PaymentPill status={d.payment_status} /><Pill tone="neutral">{t('No VAT invoice')}</Pill></>,
    facets: (d) => [
      { label: t('Total'), value: <>{fmtMoney(d.net_total)} <small>SAR</small></> },
      { label: t('Paid'), value: fmtMoney(d.total_payment_received) },
      { label: t('Balance due'), value: fmtMoney(d.balance_amount), tone: d.balance_amount > 0 ? 'crit' : undefined },
      ...(d.return_count ? [{ label: t('Returns'), value: `${d.return_count} · ${fmtMoney(d.return_amount)}`, hideOnMobile: true }] : []),
    ],
    flow: (d) => [
      { kind: t('Sale'), icon: 'receipt' as const, code: d.code, current: true, status: <PaymentPill status={d.payment_status} /> },
      d.return_count
        ? { kind: t('Returns'), icon: 'undo' as const, code: `${d.return_count} · ${fmtMoney(d.return_amount)}`, to: `${PATHS.nonVatReturns}?f.sale=${d.id}|${encodeURIComponent(d.code)}` }
        : { kind: t('Return'), icon: 'undo' as const, code: t('Create return'), ghost: true, to: `${PATHS.nonVatReturns}/new?non_vat_sales_id=${d.id}` },
    ],
    actions: (d) => (
      <>
        <Button icon="print" onClick={() => window.open(`/print/non_vat_invoice/${d.id}`, '_blank', 'noopener')}>{t('Print')}</Button>
        <ShareActions doc={d} modelName="non_vat_invoice" />
        {can('non_vat_sales_return', 'create') && <Button icon="undo" className="hide-sm" onClick={() => nav(`${PATHS.nonVatReturns}/new?non_vat_sales_id=${d.id}`)}>{t('Return')}</Button>}
        {can('non_vat_sales', 'update') && <Button icon="edit" onClick={() => nav(`${LIST}/${d.id}/edit`)}>{t('Edit')}</Button>}
        {can('non_vat_sales', 'delete') && <Button variant="danger" icon="trash" loading={busy} onClick={() => del(d)}>{t('Delete')}</Button>}
      </>
    ),
    sideExtra: (d) => [{ title: t('Tax'), body: <div className="kv"><dt>{t('Exclude service tax')}</dt><dd>{t(d.exclude_service_tax ? 'Yes' : 'No')}</dd><dt>{t('Exclude product tax')}</dt><dd>{t(d.exclude_product_tax ? 'Yes' : 'No')}</dd>{d.cash_discount ? <><dt>{t('Cash discount')}</dt><dd className="num">{fmtMoney(d.cash_discount)}</dd></> : null}</div> }],
  };
  return (
    <>
      <DocumentView doc={nonVatDisplayDoc(q.data)} loading={q.isLoading} error={q.error} refetch={() => q.refetch()} config={view} />
      {confirmEl}
    </>
  );
}

export const nonVatSearch = (storeId: string, q: string, signal: AbortSignal) =>
  api.get<any[]>(NON_VAT, { search: { store_id: storeId, ...(looksLikeCode(q) ? { code: q } : { customer_name: q }) }, limit: 5, select: 'id,code,customer_name,net_total', sort: '-created_at' }, signal);
export const nonVatReturnSearch = (storeId: string, q: string, signal: AbortSignal) =>
  api.get<any[]>(NON_VAT_RETURN, { search: { store_id: storeId, ...(looksLikeCode(q) ? { code: q } : { customer_name: q }) }, limit: 5, select: 'id,code,customer_name,net_total', sort: '-created_at' }, signal);
