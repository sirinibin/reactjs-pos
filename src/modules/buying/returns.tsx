import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useRecord } from '@/api/hooks';
import { useAuth, useStoreId } from '@/auth/AuthContext';
import { ListPage, type ListConfig } from '@/framework/ListPage';
import { DocumentEditor, type DocConfig } from '@/framework/doc/DocumentEditor';
import { DocumentView, type ViewConfig } from '@/framework/doc/DocumentView';
import { PaymentPill, PAYMENT_STATUS_OPTIONS } from '@/framework/doc/status';
import { AsyncPicker } from '@/ui/AsyncPicker';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Field, Input } from '@/ui/Field';
import { Banner, EmptyState, ErrorState, Skeleton } from '@/ui/Misc';
import { ObjectBody, ObjectHeader } from '@/ui/ObjectPage';
import { usePageMeta } from '@/shell/Workspace';
import { fmtDate, fmtMoney, fmtTime } from '@/lib/format';
import { t as tt } from '@/i18n';
import { EP, PATHS, balanceForCreditCheck, isSaudiMobile, buildReturnProducts, normalizeDocLines, returnDocForEditor, returnPrefill, validateReturnLines, type Doc } from './api';
import { RefundModal, ShareActions, UserPicker, searchPurchases } from './components';
import { PURCHASE_METHOD_OPTIONS, vendorFilterLoad } from './purchases';

const LIST = PATHS.returns;
const SELECT = 'id,code,purchase_code,vat_price,cash_discount,purchase_id,date,net_total,created_by_name,vendor_name,vendor_name_arabic,vendor_id,vendor_invoice_no,status,created_at,total_payment_paid,payments_count,payment_methods,payment_status,balance_amount,store_id,enable_on_accounts';

export function returnListConfig(): ListConfig<Doc> {
  return {
    title: 'Purchase returns',
    subtitle: 'Goods sent back to vendors',
    icon: 'undo',
    endpoint: EP.ret,
    resource: 'purchase_return',
    select: SELECT,
    defaultSort: { key: 'date', dir: -1 },
    searchKey: (q) => (/^\d|^[A-Za-z]+-/.test(q) ? { code: q } : { vendor_invoice_no: q }),
    searchPlaceholder: 'Search return # or vendor return invoice #…',
    createPath: `${LIST}/new`,
    createLabel: 'New return',
    detailPath: (r) => `${LIST}/${r.id}`,
    views: [
      { id: 'all', label: 'All returns' },
      { id: 'open', label: 'Refund due', search: { payment_status: 'not_paid,paid_partially' } },
      { id: 'paid', label: 'Refunded', search: { payment_status: 'paid' } },
    ],
    filters: [
      { id: 'date', label: 'Date', type: 'daterange' },
      { id: 'vendor', label: 'Vendor', type: 'picker', toSearch: (v) => ({ vendor_id: v }), load: async () => [] },
      { id: 'purchase_code', label: 'Purchase bill #', type: 'text' },
      { id: 'payment_status', label: 'Payment status', type: 'select', options: PAYMENT_STATUS_OPTIONS },
      { id: 'payment_methods', label: 'Payment method', type: 'select', options: PURCHASE_METHOD_OPTIONS.filter((m) => m.value !== 'purchase_return').concat([{ value: 'purchase', label: 'Purchase' }]) },
      { id: 'net_total', label: 'Amount', type: 'number', placeholder: 'e.g. >=1000' },
    ],
    summary: (m) => [
      { label: 'Returns', value: fmtMoney(m.total_purchase_return) },
      { label: 'Refunded', value: fmtMoney(m.paid_purchase_return) },
      { label: 'Refund due', value: fmtMoney(m.unpaid_purchase_return), tone: m.unpaid_purchase_return > 0 ? 'warn' : undefined },
      { label: 'Cash', value: fmtMoney(m.cash_purchase_return) },
      { label: 'Bank', value: fmtMoney(m.bank_account_purchase_return) },
      { label: 'Set off against bills', value: fmtMoney(m.purchase_purchase_return) },
      { label: 'VAT', value: fmtMoney(m.vat_price) },
    ],
    columns: [
      { key: 'code', header: tt('Return #'), sortKey: 'code', className: 'code', render: (r) => r.code },
      { key: 'date', header: tt('Date'), sortKey: 'date', render: (r) => <span className="num">{fmtDate(r.date)} <span className="muted">{fmtTime(r.date)}</span></span> },
      { key: 'vendor', header: tt('Vendor'), sortKey: 'vendor_name', className: 'two', render: (r) => <><b><bdi>{r.vendor_name || '—'}</bdi></b><span>{r.vendor_invoice_no ? `${tt('Inv.')} ${r.vendor_invoice_no}` : ''}</span></> },
      { key: 'purchase', header: tt('Purchase bill'), sortKey: 'purchase_code', hideBelow: 'md', render: (r) => <span className="mono">{r.purchase_code || '—'}</span> },
      { key: 'net_total', header: tt('Total'), sortKey: 'net_total', align: 'end', render: (r) => <b className="num">{fmtMoney(r.net_total)}</b> },
      { key: 'paid', header: tt('Refunded'), sortKey: 'total_payment_paid', align: 'end', hideBelow: 'md', render: (r) => <span className="num">{fmtMoney(r.total_payment_paid)}</span> },
      { key: 'balance', header: tt('Balance'), sortKey: 'balance_amount', align: 'end', render: (r) => <span className="num" style={r.balance_amount > 0 ? { color: 'var(--crit)', fontWeight: 600 } : { color: 'var(--text-4)' }}>{fmtMoney(r.balance_amount)}</span> },
      { key: 'status', header: tt('Payment'), render: (r) => <PaymentPill status={r.payment_status} /> },
      { key: 'vat', header: tt('VAT'), sortKey: 'vat_price', align: 'end', hideBelow: 'lg', render: (r) => <span className="num muted">{fmtMoney(r.vat_price)}</span> },
      { key: 'created_by', header: tt('Created by'), hideBelow: 'xl', render: (r) => r.created_by_name || '—' },
    ],
    mobileCard: (r) => ({ title: <span className="mono">{r.code}</span>, amount: fmtMoney(r.net_total), subtitle: <bdi>{r.vendor_name}</bdi>, meta: <>{fmtDate(r.date)} · <span className="mono">{r.purchase_code}</span> <PaymentPill status={r.payment_status} /></> }),
    exportColumns: [
      { header: 'Return #', value: (r) => r.code },
      { header: 'Date', value: (r) => fmtDate(r.date) },
      { header: 'Vendor', value: (r) => r.vendor_name },
      { header: 'Purchase bill #', value: (r) => r.purchase_code },
      { header: 'Total', value: (r) => r.net_total },
      { header: 'VAT', value: (r) => r.vat_price },
      { header: 'Refunded', value: (r) => r.total_payment_paid },
      { header: 'Balance', value: (r) => r.balance_amount },
    ],
    exportName: 'purchase-returns',
    showFooter: false,
  };
}

export function ReturnListPage() {
  const storeId = useStoreId();
  const cfg = returnListConfig();
  cfg.filters = cfg.filters!.map((f) => (f.id === 'vendor' && f.type === 'picker' ? { ...f, load: vendorFilterLoad(storeId) } : f));
  return <ListPage config={cfg} />;
}

// ───────────────────────────── editor ─────────────────────────────

export function returnDocConfig(o: { purchase: any; base: any[]; baseIsReturn: boolean; onReload: () => void }): DocConfig {
  const { purchase } = o;
  return {
    kind: 'purchase_return',
    endpoint: EP.ret,
    calcEndpoint: `${EP.ret}/calculate-net-total`,
    resource: 'purchase_return',
    icon: 'undo',
    titleNew: 'New purchase return',
    titleEdit: (code) => `${tt('Edit')} ${code}`,
    crumbs: [{ label: 'Buying', to: LIST }, { label: 'Purchase returns', to: LIST }],
    listPath: LIST,
    viewPath: (id) => `${LIST}/${id}`,
    party: { kind: 'vendor', idField: 'vendor_id', nameField: 'vendor_name', label: 'Vendor' },
    priceSource: 'purchase',
    lineColumns: ['warehouse', 'unit_price', 'unit_price_with_vat', 'unit_discount', 'line_total', 'line_total_with_vat'],
    features: { payments: true, shipping: true, discount: true, rounding: true, cashDiscount: true, warehouse: true },
    maxQty: (l) => (typeof l.max_qty === 'number' ? l.max_qty : undefined),
    renderExtra: (s, set, errors) => (
      <>
        <Field label={tt('Purchase bill')}>{(id) => <Input id={id} value={purchase?.code || ''} readOnly className="mono" />}</Field>
        <Field label={tt('Vendor return invoice #')} error={errors.vendor_invoice_no}>{(id) => <Input id={id} value={s.extra.vendor_invoice_no || ''} onChange={(e) => set({ vendor_invoice_no: e.target.value })} />}</Field>
        <Field label={tt('Returned by')} required error={errors.purchase_returned_by}>
          {(id, d) => <UserPicker id={id} describedBy={d} invalid={!!errors.purchase_returned_by} value={s.extra.returned_by_opt || (s.extra.purchase_returned_by ? { id: s.extra.purchase_returned_by, label: s.extra.purchase_returned_by_name || tt('Selected user'), data: null } : null)}
            onChange={(opt) => set({ purchase_returned_by: opt?.id || '', returned_by_opt: opt })} />}
        </Field>
        <div className="span2 hint">
          {tt('{{n}} of {{m}} returnable items selected — remove the lines you are not returning.', { n: s.lines.length, m: o.base.length })}{' '}
          <button type="button" className="link" onClick={o.onReload}>{tt('Reload all items')}</button>
        </div>
      </>
    ),
    fromApi: (d) => ({ purchase_id: d.purchase_id, purchase_code: d.purchase_code, vendor_invoice_no: d.vendor_invoice_no || '', purchase_returned_by: d.purchase_returned_by || '', purchase_returned_by_name: d.purchase_returned_by_name || '', enable_on_accounts: !!d.enable_on_accounts }),
    toApi: (body, s) => {
      const { returned_by_opt: _o, purchase_returned_by_name: _n, ...rest } = body;
      return { ...rest, products: buildReturnProducts(o.base, s.lines, o.baseIsReturn), balance_amount: balanceForCreditCheck(s) };
    },
    extraValidate: (s) => {
      const e = validateReturnLines(s.lines, (k, x) => tt(k, x));
      if (s.phone.trim() && !isSaudiMobile(s.phone)) e.phone = tt('Enter a Saudi mobile number (05XXXXXXXX) or leave it empty.');
      if (!s.extra.purchase_returned_by) e.purchase_returned_by = tt('Choose who returned the goods.');
      return e;
    },
  };
}

function ChoosePurchase() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const storeId = useStoreId();
  usePageMeta(t('New purchase return'), 'undo');
  return (
    <>
      <ObjectHeader crumbs={[{ label: t('Buying'), to: LIST }, { label: t('Purchase returns'), to: LIST }, { label: t('New') }]} icon="undo" title={t('New purchase return')} />
      <ObjectBody>
        <Card title={t('Which purchase bill are you returning goods from?')}>
          <div className="stack" style={{ gap: 10 }}>
            <AsyncPicker aria-label={t('Purchase bill')} value={null} eager autoFocus placeholder={t('Search bill #…')} load={(q, s) => searchPurchases(storeId, q, s)} onChange={(o) => o && nav(`${LIST}/new?purchase_id=${o.id}`, { replace: true })} />
            <div className="hint">{t('Returns are always created from a purchase bill so quantities and prices match what was bought.')}</div>
          </div>
        </Card>
      </ObjectBody>
    </>
  );
}

export function ReturnEditorPage() {
  const { id } = useParams();
  const [sp, setSp] = useSearchParams();
  const { store, user } = useAuth();
  const purchaseId = sp.get('purchase_id') || undefined;
  const [reload, setReload] = useState(0);
  const r = useRecord<Doc>(EP.ret, id);
  const p = useRecord<Doc>(EP.purchase, id ? r.data?.purchase_id : purchaseId);
  const existing = useMemo(() => (r.data ? returnDocForEditor(r.data, p.data || null) : undefined), [r.data, p.data]);
  if (!id && !purchaseId) return <ChoosePurchase />;
  const failed = (id && r.isError && r) || (p.isError && p) || null;
  if (failed) return <div className="pad"><ErrorState error={failed.error} onRetry={() => failed.refetch()} /></div>;
  if ((id && !r.data) || !p.data) return <div className="pad stack"><Skeleton width={260} height={22} /><Skeleton height={300} /></div>;
  const purchase = p.data;
  if (!id && !(purchase.products || []).some((x: any) => x.quantity - (x.quantity_returned || 0) > 0)) {
    return <div className="pad"><EmptyState icon="undo" title={tt('Everything on {{code}} has already been returned.', { code: purchase.code })} action={<Button onClick={() => setSp({}, { replace: true })}>{tt('Choose another bill')}</Button>} /></div>;
  }
  const base = id ? r.data!.products || [] : purchase.products || [];
  const cfg = returnDocConfig({ purchase, base, baseIsReturn: !!id, onReload: () => setReload((x) => x + 1) });
  if (!id) cfg.prefill = () => returnPrefill(purchase, user?.id, store?.vat_percent ?? 15);
  return (
    <>
      {purchase.payment_status !== 'not_paid' && !id && <div className="pad" style={{ paddingBottom: 0 }}><Banner tone="info">{tt('This bill was paid — record the refund you receive from the vendor in the payment panel.')}</Banner></div>}
      <DocumentEditor key={`${id || 'new'}:${purchaseId || ''}:${reload}`} config={cfg} id={id} existing={existing} />
    </>
  );
}

// ───────────────────────────── view ─────────────────────────────

export function ReturnViewPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { t } = useTranslation();
  const { can } = useAuth();
  const q = useRecord<Doc>(EP.ret, id);
  const [refund, setRefund] = useState(false);
  const doc = useMemo(() => {
    if (!q.data) return undefined;
    const n = normalizeDocLines(q.data, 'purchasereturn');
    return { ...n, products: (n.products || []).filter((x: any) => x.selected !== false) };
  }, [q.data]);

  const view: ViewConfig = {
    icon: 'undo',
    crumbs: [{ label: 'Buying', to: LIST }, { label: 'Purchase returns', to: LIST }],
    partyLabel: 'Vendor',
    partyName: (d) => d.vendor_name,
    partyLink: (d) => (d.vendor_id ? `${PATHS.vendors}/${d.vendor_id}` : undefined),
    showPayments: true,
    pills: (d) => <PaymentPill status={d.payment_status} />,
    facets: (d) => [
      { label: t('Total incl. VAT'), value: <>{fmtMoney(d.net_total)} <small>SAR</small></> },
      { label: t('Refunded'), value: fmtMoney(d.total_payment_paid) },
      { label: t('Refund due'), value: fmtMoney(d.balance_amount), tone: d.balance_amount > 0 ? 'warn' : undefined },
      { label: t('VAT'), value: fmtMoney(d.vat_price), hideOnMobile: true },
    ],
    flow: (d) => [
      ...(d.purchase_id ? [{ kind: t('Purchase bill'), icon: 'cart' as const, code: d.purchase_code, to: `${PATHS.purchases}/${d.purchase_id}` }] : []),
      { kind: t('Return'), icon: 'undo', code: d.code, current: true, status: <PaymentPill status={d.payment_status} /> },
      ...(d.payments_count ? [{ kind: t('Refunds'), icon: 'cash' as const, code: `${d.payments_count} × ${fmtMoney(d.total_payment_paid)}`, to: `${PATHS.returnPayments}?f.return=${encodeURIComponent(d.code)}` }] : []),
    ],
    actions: (d) => (
      <>
        {d.balance_amount > 0 && can('purchase_return', 'update') && <Button variant="primary" icon="cash" onClick={() => setRefund(true)}>{t('Record refund')}</Button>}
        <Button icon="print" onClick={() => window.open(`/print/purchase_return/${d.id}`, '_blank', 'noopener')}>{t('Print')}</Button>
        <ShareActions doc={d} modelName="purchase_return" phone={d.phone} />
        {can('purchase_return', 'update') && <Button icon="edit" onClick={() => nav(`${LIST}/${d.id}/edit`)}>{t('Edit')}</Button>}
      </>
    ),
    sideExtra: (d) => [{
      title: t('Return'),
      body: <dl className="bkv"><dt>{t('Purchase bill')}</dt><dd className="mono">{d.purchase_code || '—'}</dd><dt>{t('Vendor return invoice #')}</dt><dd>{d.vendor_invoice_no || '—'}</dd><dt>{t('Returned by')}</dt><dd>{d.purchase_returned_by_name || '—'}</dd></dl>,
    }],
  };
  return (
    <>
      <DocumentView doc={doc} loading={q.isLoading} error={q.error} refetch={() => q.refetch()} config={view} />
      {q.data && <RefundModal open={refund} onClose={() => setRefund(false)} ret={q.data} />}
    </>
  );
}
