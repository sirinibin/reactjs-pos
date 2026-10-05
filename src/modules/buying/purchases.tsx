import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/api/client';
import { useList, useRecord } from '@/api/hooks';
import { useAuth, useStoreId } from '@/auth/AuthContext';
import { ListPage, type ListConfig } from '@/framework/ListPage';
import { DocumentEditor, type DocConfig, type DocState } from '@/framework/doc/DocumentEditor';
import { DocumentView, type ViewConfig } from '@/framework/doc/DocumentView';
import { PaymentPill, PAYMENT_STATUS_OPTIONS, METHOD_LABEL } from '@/framework/doc/status';
import { ReceivePaymentModal } from '@/framework/doc/ReceivePayment';
import { searchParties, partyToOption } from '@/framework/doc/lookups';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { ErrorState, Skeleton, Banner } from '@/ui/Misc';
import { Checkbox, Field, Input, Select } from '@/ui/Field';
import { Pill } from '@/ui/Pill';
import { useToast } from '@/ui/Toast';
import { fmtDate, fmtDateTime, fmtMoney, fmtTime } from '@/lib/format';
import { t as tt } from '@/i18n';
import { EP, PATHS, normalizeDocLines, poReceivedBody, purchaseFromPo, purchaseToApi, validateSellPrices, type Doc, type SellMap } from './api';
import { PoPickerModal, PURCHASE_PAYMENT_METHODS, SellingPrices, ShareActions } from './components';

const LIST = PATHS.purchases;
const SELECT = 'id,code,date,net_total,return_count,return_amount,cash_discount,discount,vat_price,total,store_id,created_by_name,vendor_id,vendor_name,vendor_name_arabic,vendor_invoice_no,status,created_at,total_payment_paid,payments_count,payment_methods,payment_status,balance_amount,enable_on_accounts';
export const PURCHASE_METHOD_OPTIONS = [...PURCHASE_PAYMENT_METHODS, { value: 'sales', label: 'Sales' }, { value: 'purchase_return', label: 'Purchase return' }];

export const vendorFilterLoad = (storeId: string) => async (q: string, s: AbortSignal) => (await searchParties('vendor', storeId, q, s)).map(partyToOption);

export function purchaseListConfig(): ListConfig<Doc> {
  return {
    title: 'Purchase bills',
    subtitle: 'Vendor bills received into stock',
    icon: 'cart',
    endpoint: EP.purchase,
    resource: 'purchases',
    select: SELECT,
    defaultSort: { key: 'date', dir: -1 },
    searchKey: (q) => (/^\d|^[A-Za-z]+-/.test(q) ? { code: q } : { vendor_invoice_no: q }),
    searchPlaceholder: 'Search bill # or vendor invoice #…',
    createPath: `${LIST}/new`,
    createLabel: 'New purchase',
    detailPath: (r) => `${LIST}/${r.id}`,
    views: [
      { id: 'all', label: 'All bills' },
      { id: 'open', label: 'To pay', search: { payment_status: 'not_paid,paid_partially' } },
      { id: 'unpaid', label: 'Unpaid', search: { payment_status: 'not_paid' } },
      { id: 'paid', label: 'Paid', search: { payment_status: 'paid' } },
      { id: 'returns', label: 'With returns', search: { return_count: '>0' } },
    ],
    filters: [
      { id: 'date', label: 'Date', type: 'daterange' },
      { id: 'vendor', label: 'Vendor', type: 'picker', toSearch: (v) => ({ vendor_id: v }), load: async () => [] },
      { id: 'payment_status', label: 'Payment status', type: 'select', options: PAYMENT_STATUS_OPTIONS },
      { id: 'payment_methods', label: 'Payment method', type: 'select', options: PURCHASE_METHOD_OPTIONS },
      { id: 'net_total', label: 'Amount', type: 'number', placeholder: 'e.g. >=1000' },
      { id: 'vendor_invoice_no', label: 'Vendor invoice #', type: 'text' },
      { id: 'created_at', label: 'Created', type: 'daterange', fromKey: 'created_at_from', toKey: 'created_at_to' },
    ],
    summary: (m) => [
      { label: 'Purchases', value: fmtMoney(m.total_purchase) },
      { label: 'Paid', value: fmtMoney(m.paid_purchase) },
      { label: 'Credit (unpaid)', value: fmtMoney(m.unpaid_purchase), tone: m.unpaid_purchase > 0 ? 'warn' : undefined },
      { label: 'Cash', value: fmtMoney(m.cash_purchase) },
      { label: 'Bank', value: fmtMoney(m.bank_account_purchase) },
      { label: 'VAT paid', value: fmtMoney(m.vat_price) },
      { label: 'Discount', value: fmtMoney(m.discount) },
      { label: 'Cash discount', value: fmtMoney(m.cash_discount) },
      { label: 'Returns', value: fmtMoney(m.return_amount) },
    ],
    columns: [
      { key: 'code', header: tt('Bill #'), sortKey: 'code', className: 'code', render: (r) => r.code },
      { key: 'date', header: tt('Date'), sortKey: 'date', render: (r) => <span className="num">{fmtDate(r.date)} <span className="muted">{fmtTime(r.date)}</span></span> },
      { key: 'vendor', header: tt('Vendor'), sortKey: 'vendor_name', className: 'two', render: (r) => <><b><bdi>{r.vendor_name || '—'}</bdi></b><span>{r.vendor_invoice_no ? `${tt('Inv.')} ${r.vendor_invoice_no}` : <bdi>{r.vendor_name_arabic}</bdi>}</span></> },
      { key: 'net_total', header: tt('Total'), sortKey: 'net_total', align: 'end', render: (r) => <b className="num">{fmtMoney(r.net_total)}</b> },
      { key: 'paid', header: tt('Paid'), sortKey: 'total_payment_paid', align: 'end', hideBelow: 'md', render: (r) => <span className="num">{fmtMoney(r.total_payment_paid)}</span> },
      { key: 'balance', header: tt('Balance'), sortKey: 'balance_amount', align: 'end', render: (r) => <span className="num" style={r.balance_amount > 0 ? { color: 'var(--crit)', fontWeight: 600 } : { color: 'var(--text-4)' }}>{fmtMoney(r.balance_amount)}</span> },
      { key: 'status', header: tt('Payment'), render: (r) => <PaymentPill status={r.payment_status} /> },
      { key: 'methods', header: tt('Methods'), hideBelow: 'xl', render: (r) => (r.payment_methods || []).map((m: string) => tt(METHOD_LABEL[m] || m)).join(', ') || '—' },
      { key: 'vat', header: tt('VAT'), sortKey: 'vat_price', align: 'end', hideBelow: 'lg', render: (r) => <span className="num muted">{fmtMoney(r.vat_price)}</span> },
      { key: 'cash_discount', header: tt('Cash disc.'), sortKey: 'cash_discount', align: 'end', hideBelow: 'xl', render: (r) => <span className="num muted">{r.cash_discount ? fmtMoney(r.cash_discount) : '—'}</span> },
      { key: 'returns', header: tt('Returns'), sortKey: 'return_count', align: 'end', hideBelow: 'lg', render: (r) => (r.return_count ? <span className="num">{r.return_count} · {fmtMoney(r.return_amount)}</span> : <span className="muted">—</span>) },
      { key: 'created_by', header: tt('Created by'), hideBelow: 'xl', render: (r) => r.created_by_name || '—' },
    ],
    mobileCard: (r) => ({ title: <span className="mono">{r.code}</span>, amount: fmtMoney(r.net_total), subtitle: <bdi>{r.vendor_name}</bdi>, meta: <>{fmtDate(r.date)} <PaymentPill status={r.payment_status} /></> }),
    exportColumns: [
      { header: 'Bill #', value: (r) => r.code },
      { header: 'Date', value: (r) => fmtDate(r.date) },
      { header: 'Vendor', value: (r) => r.vendor_name },
      { header: 'Vendor invoice #', value: (r) => r.vendor_invoice_no },
      { header: 'Amount before VAT', value: (r) => r.total },
      { header: 'Discount', value: (r) => r.discount },
      { header: 'VAT', value: (r) => r.vat_price },
      { header: 'Total', value: (r) => r.net_total },
      { header: 'Paid', value: (r) => r.total_payment_paid },
      { header: 'Balance', value: (r) => r.balance_amount },
      { header: 'Payment status', value: (r) => r.payment_status },
    ],
    exportName: 'purchases',
    showFooter: false,
  };
}

export function PurchaseListPage() {
  const storeId = useStoreId();
  const cfg = purchaseListConfig();
  cfg.filters = cfg.filters!.map((f) => (f.id === 'vendor' && f.type === 'picker' ? { ...f, load: vendorFilterLoad(storeId) } : f));
  return <ListPage config={cfg} />;
}

// ───────────────────────────── editor ─────────────────────────────

const MERGE_KEY = 'buying.purchase.merge';
export const BILL_KEY = (id: string) => `buying.bill.${id}`;

function ss(k: string): any {
  try { const v = sessionStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; }
}

function FromPoButton({ s }: { s: DocState }) {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const vendorId = s.party?.id && !s.party.id.startsWith('new:') ? s.party.id : undefined;
  return (
    <div className="field" style={{ justifyContent: 'flex-end' }}>
      <Button icon="file" onClick={() => setOpen(true)}>{t('From P.O.')}</Button>
      <PoPickerModal open={open} onClose={() => setOpen(false)} vendorId={vendorId} onPick={(po) => {
        try { sessionStorage.setItem(MERGE_KEY, JSON.stringify(s)); } catch { /* storage unavailable */ }
        setOpen(false);
        nav(`${LIST}/new?from_po=${po.id}${s.lines.length ? '&merge=1' : ''}`, { replace: true });
      }} />
    </div>
  );
}

export interface PurchaseCfgOpts {
  userId?: string;
  settings?: Record<string, any>;
  prefill?: () => Partial<DocState> | null;
  /** Appended to the view path after a create (post-save links: PO received, bill linked). */
  afterCreate?: string;
  isNew: boolean;
}

export function purchaseDocConfig(o: PurchaseCfgOpts): DocConfig {
  const st = o.settings || {};
  return {
    kind: 'purchase',
    endpoint: EP.purchase,
    calcEndpoint: `${EP.purchase}/calculate-net-total`,
    resource: 'purchases',
    icon: 'cart',
    titleNew: 'New purchase bill',
    titleEdit: (code) => `${tt('Edit')} ${code}`,
    crumbs: [{ label: 'Buying', to: LIST }, { label: 'Purchase bills', to: LIST }],
    listPath: LIST,
    viewPath: (id) => `${LIST}/${id}${o.isNew && o.afterCreate ? `?${o.afterCreate}` : ''}`,
    party: { kind: 'vendor', idField: 'vendor_id', nameField: 'vendor_name', label: 'Vendor', allowFreeText: true },
    priceSource: 'purchase',
    lineColumns: ['warehouse', 'unit_price', 'unit_price_with_vat', 'unit_discount', 'discount_percent', 'line_total', 'line_total_with_vat'],
    features: { payments: true, shipping: true, discount: true, rounding: true, cashDiscount: true, warehouse: true },
    renderExtra: (s, set, errors) => (
      <>
        <Field label={tt('Vendor invoice #')} error={errors.vendor_invoice_no}>{(id, d) => <Input id={id} aria-describedby={d} value={s.extra.vendor_invoice_no || ''} onChange={(e) => set({ vendor_invoice_no: e.target.value })} invalid={!!errors.vendor_invoice_no} />}</Field>
        <Field label={tt('Commission')} error={errors.commission}>{(id) => <Input id={id} inputMode="decimal" className="num" value={s.extra.commission ?? ''} onChange={(e) => set({ commission: e.target.value })} />}</Field>
        {Number(s.extra.commission) > 0 && (
          <Field label={tt('Commission paid by')} required error={errors.commission_payment_method}>{(id, d) => <Select id={id} aria-describedby={d} value={s.extra.commission_payment_method || ''} placeholder={tt('Select…')} onChange={(e) => set({ commission_payment_method: e.target.value })} options={PURCHASE_PAYMENT_METHODS.map((m) => ({ ...m, label: tt(m.label) }))} invalid={!!errors.commission_payment_method} />}</Field>
        )}
        {st.disable_purchases_on_accounts && <div className="field" style={{ justifyContent: 'flex-end' }}><Checkbox label={tt('Post to accounts')} checked={!!s.extra.enable_on_accounts} onChange={(e) => set({ enable_on_accounts: e.target.checked })} /></div>}
        {o.isNew && st.enable_purchase_order_module && <FromPoButton s={s} />}
        <SellingPrices lines={s.lines} value={s.extra.sell as SellMap} onChange={(sell) => set({ sell })} errors={errors} autoUpdate={!!st.enable_auto_update_prices_from_last_purchase} />
      </>
    ),
    fromApi: (d) => ({
      vendor_invoice_no: d.vendor_invoice_no || '', order_placed_by: d.order_placed_by || undefined, status: d.status || 'delivered',
      enable_on_accounts: !!d.enable_on_accounts, commission: d.commission || '', commission_payment_method: d.commission_payment_method || '',
    }),
    toApi: (body, s) => purchaseToApi({ ...body, order_placed_by: body.order_placed_by || o.userId }, s),
    prefill: o.prefill,
    extraValidate: (s) => {
      const e: Record<string, string> = { ...validateSellPrices(s.lines, s.extra.sell as SellMap) };
      Object.keys(e).forEach((k) => { e[k] = tt(e[k]); });
      s.lines.forEach((l, i) => { if (l.is_service) e[`name_${i}`] = tt('Services can’t be purchased.'); });
      if (Number(s.extra.commission) < 0) e.commission = tt('Commission can’t be negative.');
      if (Number(s.extra.commission) > 0 && !s.extra.commission_payment_method) e.commission_payment_method = tt('Choose how the commission was paid.');
      return e;
    },
  };
}

export function PurchaseEditorPage() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const { store, user } = useAuth();
  const fromPo = sp.get('from_po') || undefined;
  const merge = sp.get('merge') === '1';
  const fromBill = sp.get('from_bill') || undefined;
  const vendorId = sp.get('vendor_id') || undefined;
  const q = useRecord<Doc>(EP.purchase, id);
  const po = useRecord<Doc>(EP.po, id ? undefined : fromPo);
  const vendor = useRecord<any>(EP.vendor, id ? undefined : vendorId, { select: 'id,code,name,phone,vat_no,address,remarks,use_remarks_in_purchases,credit_limit,credit_balance' });
  const vat = store?.vat_percent ?? 15;
  const existing = useMemo(() => (q.data ? normalizeDocLines(q.data, 'purchase') : undefined), [q.data]);

  const waiting = (id && !q.data) || (fromPo && !po.data && !po.isError) || (vendorId && !vendor.data && !vendor.isError);
  const err = (id && q.isError && q) || (fromPo && po.isError && po) || null;
  if (err) return <div className="pad"><ErrorState error={err.error} onRetry={() => err.refetch()} /></div>;
  if (waiting) return <div className="pad stack"><Skeleton width={260} height={22} /><Skeleton height={300} /></div>;

  const prefill = (): Partial<DocState> | null => {
    const base: Partial<DocState> = { extra: { order_placed_by: user?.id, status: 'delivered', vendor_invoice_no: '', commission: '', commission_payment_method: '' } };
    if (po.data) {
      const prev = merge ? (ss(MERGE_KEY) as DocState | null) : null;
      try { sessionStorage.removeItem(MERGE_KEY); } catch { /* ignore */ }
      const p = purchaseFromPo(po.data, vat, prev);
      return { ...p, extra: { ...base.extra, ...(p.extra || {}) } };
    }
    if (fromBill) {
      const b = ss(BILL_KEY(fromBill)) as Partial<DocState> | null;
      if (b) return { ...b, extra: { ...base.extra, ...(b.extra || {}) } };
    }
    if (vendor.data) {
      const v = vendor.data;
      return { ...base, party: partyToOption(v), phone: v.phone || '', vat_no: v.vat_no || '', address: v.address || '', remarks: v.use_remarks_in_purchases ? v.remarks || '' : '' };
    }
    return base;
  };
  const afterCreate = po.data ? `po_link=${po.data.id}` : fromBill ? `bill_link=${fromBill}` : undefined;
  const cfg = purchaseDocConfig({ userId: user?.id, settings: store?.settings, prefill: id ? undefined : prefill, afterCreate, isNew: !id });
  return (
    <>
      {po.data && !id && <div className="pad" style={{ paddingBottom: 0 }}><Banner tone="info" icon="file">{tt('Lines copied from')} <b className="mono">{po.data.code}</b> — {tt('the order is marked as received when you save this bill.')}</Banner></div>}
      <DocumentEditor key={`${id || 'new'}:${fromPo || ''}:${fromBill || ''}:${vendorId || ''}`} config={cfg} id={id} existing={existing} />
    </>
  );
}

// ───────────────────────────── view ─────────────────────────────

function CashDiscountsTab({ purchaseId }: { purchaseId: string }) {
  const { t } = useTranslation();
  const q = useList<any>(EP.cd, { search: { purchase_id: purchaseId }, limit: 50, sort: '-created_at' });
  return (
    <Card title={t('Cash discounts')} bodyClass="card-b-tight">
      {q.isError ? <div style={{ padding: 12 }}><ErrorState error={q.error} onRetry={() => q.refetch()} /></div> : !q.data?.rows.length ? <div className="muted" style={{ padding: 12 }}>{q.isLoading ? t('Loading…') : t('No cash discounts recorded.')}</div> : (
        <table className="lines">
          <thead><tr><th>{t('Created at')}</th><th>{t('Created by')}</th><th className="r">{t('Amount')}</th></tr></thead>
          <tbody>{q.data.rows.map((r) => <tr key={r.id}><td className="num">{fmtDateTime(r.created_at)}</td><td>{r.created_by_name || '—'}</td><td className="r num">{fmtMoney(r.amount)}</td></tr>)}</tbody>
        </table>
      )}
    </Card>
  );
}

/** Post-save links carried in the URL after a create (?po_link=…, ?bill_link=…). */
function usePostSaveLinks(doc: Doc | undefined) {
  const [sp, setSp] = useSearchParams();
  const storeId = useStoreId();
  const toast = useToast();
  const qc = useQueryClient();
  const done = useRef<string>('');
  const poLink = sp.get('po_link');
  const billLink = sp.get('bill_link');
  useEffect(() => {
    if (!doc || (!poLink && !billLink)) return;
    const key = `${doc.id}:${poLink}:${billLink}`;
    if (done.current === key) return;
    done.current = key;
    (async () => {
      try {
        if (poLink) {
          const po = (await api.get<any>(`${EP.po}/${poLink}`, { search: { store_id: storeId } })).result;
          if (po) {
            await api.put(`${EP.po}/${poLink}`, poReceivedBody(po, storeId, { id: doc.id, code: doc.code }), { search: { store_id: storeId } });
            qc.invalidateQueries({ queryKey: [EP.po] });
            toast.success(tt('{{code}} marked as received', { code: po.code }));
          }
        }
        if (billLink) {
          await api.post(`${EP.pm}/${billLink}/link-purchase`, { purchase_id: doc.id, purchase_code: doc.code }, { store_id: storeId });
          try { sessionStorage.removeItem(BILL_KEY(billLink)); } catch { /* ignore */ }
          qc.invalidateQueries({ queryKey: [EP.pm] });
          toast.success(tt('Bill image linked to {{code}}', { code: doc.code }));
        }
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : (e as Error).message);
      } finally {
        setSp((p) => { const n = new URLSearchParams(p); n.delete('po_link'); n.delete('bill_link'); return n; }, { replace: true });
      }
    })();
  }, [doc, poLink, billLink, storeId, toast, qc, setSp]);
}

export function PurchaseViewPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { t } = useTranslation();
  const { can } = useAuth();
  const q = useRecord<Doc>(EP.purchase, id);
  const [pay, setPay] = useState(false);
  const doc = useMemo(() => (q.data ? normalizeDocLines(q.data, 'purchase') : undefined), [q.data]);
  usePostSaveLinks(q.data);

  const view: ViewConfig = {
    icon: 'cart',
    crumbs: [{ label: 'Buying', to: LIST }, { label: 'Purchase bills', to: LIST }],
    partyLabel: 'Vendor',
    partyName: (d) => d.vendor_name,
    partyLink: (d) => (d.vendor_id ? `${PATHS.vendors}/${d.vendor_id}` : undefined),
    showPayments: true,
    pills: (d) => <><PaymentPill status={d.payment_status} />{d.status === 'draft' && <Pill tone="neutral">{t('Draft')}</Pill>}</>,
    facets: (d) => [
      { label: t('Total incl. VAT'), value: <>{fmtMoney(d.net_total)} <small>SAR</small></> },
      { label: t('VAT'), value: fmtMoney(d.vat_price), hideOnMobile: true },
      { label: t('Paid'), value: fmtMoney(d.total_payment_paid) },
      { label: t('Balance due'), value: fmtMoney(d.balance_amount), tone: d.balance_amount > 0 ? 'crit' : undefined },
      ...(d.cash_discount ? [{ label: t('Cash discount'), value: fmtMoney(d.cash_discount), hideOnMobile: true }] : []),
      ...(d.return_count ? [{ label: t('Returns'), value: `${d.return_count} · ${fmtMoney(d.return_amount)}`, hideOnMobile: true }] : []),
    ],
    steps: (d) => ({ steps: ['Received', 'Partially paid', 'Paid'], current: d.payment_status === 'paid' ? 3 : d.payment_status === 'paid_partially' ? 2 : 1 }),
    flow: (d) => [
      { kind: t('Purchase bill'), icon: 'cart', code: d.code, current: true, status: <PaymentPill status={d.payment_status} /> },
      ...(d.payments_count ? [{ kind: t('Payments'), icon: 'cash' as const, code: `${d.payments_count} × ${fmtMoney(d.total_payment_paid)}`, to: `${PATHS.payments}?f.purchase=${encodeURIComponent(d.code)}` }] : []),
      ...(d.return_count
        ? [{ kind: t('Returns'), icon: 'undo' as const, code: `${d.return_count} · ${fmtMoney(d.return_amount)}`, to: `${PATHS.returns}?f.purchase_code=${encodeURIComponent(d.code)}` }]
        : [{ kind: t('Return'), icon: 'undo' as const, code: t('Create return'), ghost: true, to: `${PATHS.returns}/new?purchase_id=${d.id}` }]),
    ],
    actions: (d) => (
      <>
        {d.balance_amount > 0 && can('purchases', 'update') && <Button variant="primary" icon="cash" onClick={() => setPay(true)}>{t('Record payment')}</Button>}
        <Button icon="print" onClick={() => window.open(`/print/purchase/${d.id}`, '_blank', 'noopener')}>{t('Print')}</Button>
        <ShareActions doc={d} modelName="purchase" phone={d.phone} />
        {can('purchase_return', 'create') && <Button icon="undo" className="hide-sm" onClick={() => nav(`${PATHS.returns}/new?purchase_id=${d.id}`)}>{t('Return')}</Button>}
        {can('purchases', 'update') && <Button icon="edit" onClick={() => nav(`${LIST}/${d.id}/edit`)}>{t('Edit')}</Button>}
      </>
    ),
    sideExtra: (d) => [{
      title: t('Bill'),
      body: <dl className="bkv"><dt>{t('Vendor invoice #')}</dt><dd>{d.vendor_invoice_no || '—'}</dd><dt>{t('Ordered by')}</dt><dd>{d.order_placed_by_name || '—'}</dd><dt>{t('Methods')}</dt><dd>{(d.payment_methods || []).map((m: string) => t(METHOD_LABEL[m] || m)).join(', ') || '—'}</dd>{d.commission > 0 && <><dt>{t('Commission')}</dt><dd className="num">{fmtMoney(d.commission)}</dd></>}</dl>,
    }],
    extraTabs: [{ id: 'cash_discounts', label: 'Cash discounts', render: (d) => <CashDiscountsTab purchaseId={d.id} /> }],
  };

  return (
    <>
      <DocumentView doc={doc} loading={q.isLoading} error={q.error} refetch={() => q.refetch()} config={view} />
      {doc && (
        <ReceivePaymentModal open={pay} onClose={() => setPay(false)} endpoint={EP.pay} title={`${t('Record payment')} · ${doc.code}`} methods={PURCHASE_PAYMENT_METHODS}
          parent={{ purchase_id: doc.id, purchase_code: doc.code }} balance={doc.balance_amount} invalidate={[EP.purchase]} />
      )}
    </>
  );
}
