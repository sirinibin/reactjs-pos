import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/api/client';
import { useRecord } from '@/api/hooks';
import { useAuth, useStoreId } from '@/auth/AuthContext';
import { AsyncPicker, type PickerOption } from '@/ui/AsyncPicker';
import { Card } from '@/ui/Card';
import { Field, Input, Textarea } from '@/ui/Field';
import { Banner, ErrorState, Skeleton } from '@/ui/Misc';
import { Pill } from '@/ui/Pill';
import { useToast } from '@/ui/Toast';
import type { IconName } from '@/ui/Icon';
import { usePageMeta } from '@/shell/Workspace';
import { BillSummary, PaymentsEditor, blankPayment, type SummaryValues } from '@/framework/doc/Summary';
import { newLineKey, type PaymentRow, type Totals } from '@/framework/doc/calc';
import { fmtMoney, toRfc3339 } from '@/lib/format';
import { EditorFrame } from './EditorFrame';
import { ReturnLinesTable } from './ReturnLinesTable';
import { useServerTotals } from './useServerTotals';
import {
  buildNonVatReturnLines, buildSalesReturnLines, isReturnLocked, nonVatReturnProductsToApi, nonVatTotals, paymentsToApi, paymentsTotal,
  refundCap, returnProductsToApi, returnSummaryFromOrder, salesReturnTotals, selectedLines, summaryFromDoc, validateReturnLines, type ReturnLine,
} from '../logic';
import { NON_VAT, NON_VAT_RETURN, ORDER, PATHS, SALES_PAY_METHODS, SALES_RETURN, searchNonVatSales, searchOrders } from '../api';

export type ReturnMode = 'sales' | 'non_vat';

interface Kind {
  endpoint: string; calcEndpoint: string; resource: string; listPath: string; icon: IconName;
  parentField: string; parentCodeField: string; parentEndpoint: string; parentPath: string; parentLabel: string;
  titleNew: string; crumbs: { label: string; to?: string }[];
  pickTitle: string; pickHint: string;
  searchParents: (storeId: string, q: string, s: AbortSignal) => Promise<PickerOption<any>[]>;
}

export const KINDS: Record<ReturnMode, Kind> = {
  sales: {
    endpoint: SALES_RETURN, calcEndpoint: `${SALES_RETURN}/calculate-net-total`, resource: 'sales_return', listPath: PATHS.returns, icon: 'undo',
    parentField: 'order_id', parentCodeField: 'order_code', parentEndpoint: ORDER, parentPath: PATHS.invoices, parentLabel: 'Sales invoice',
    titleNew: 'New sales return', crumbs: [{ label: 'Sales', to: PATHS.invoices }, { label: 'Sales returns', to: PATHS.returns }],
    pickTitle: 'Which invoice is being returned?', pickHint: 'Returns are always issued against a sales invoice. Search by invoice number or customer.',
    searchParents: (storeId, q, s) => searchOrders(storeId, q, s),
  },
  non_vat: {
    endpoint: NON_VAT_RETURN, calcEndpoint: `${NON_VAT_RETURN}/calculate-net-total`, resource: 'non_vat_sales_return', listPath: PATHS.nonVatReturns, icon: 'undo',
    parentField: 'non_vat_sales_id', parentCodeField: 'non_vat_sales_code', parentEndpoint: NON_VAT, parentPath: PATHS.nonVat, parentLabel: 'Non-VAT sale',
    titleNew: 'New non-VAT sales return', crumbs: [{ label: 'Sales', to: PATHS.invoices }, { label: 'Non-VAT sales returns', to: PATHS.nonVatReturns }],
    pickTitle: 'Which non-VAT sale is being returned?', pickHint: 'Search by sale number or customer.',
    searchParents: (storeId, q, s) => searchNonVatSales(storeId, q, s),
  },
};

/** Route component: /sales/returns/new?order_id=…, /sales/returns/:id/edit (and the non-VAT equivalents). */
export function ReturnEditorPage({ mode }: { mode: ReturnMode }) {
  const k = KINDS[mode];
  const { id } = useParams();
  const [sp, setSp] = useSearchParams();
  const { t } = useTranslation();
  const storeId = useStoreId();
  const existing = useRecord<any>(k.endpoint, id);
  const parentId: string | undefined = id ? existing.data?.[k.parentField] || undefined : sp.get(k.parentField) || undefined;
  const parent = useRecord<any>(k.parentEndpoint, parentId);
  const siblings = useQuery({
    queryKey: [k.endpoint, 'siblings', parentId, storeId],
    enabled: mode === 'non_vat' && !!parentId && !!storeId,
    queryFn: async () => (await api.get<any[]>(k.endpoint, { search: { store_id: storeId, [k.parentField]: parentId }, limit: 200, select: 'id,products' })).result || [],
  });
  usePageMeta(id ? existing.data?.code || t('Edit') : t(k.titleNew), id ? 'edit' : 'plus');

  if (!id && !parentId) {
    return (
      <section className="pad">
        <Card title={t(k.pickTitle)} className="sr-pick">
          <p className="muted" style={{ marginTop: 0 }}>{t(k.pickHint)}</p>
          <Field label={t(k.parentLabel)}>
            {(fid) => <AsyncPicker id={fid} value={null} eager autoFocus placeholder={t('Search…')} load={(q, s) => k.searchParents(storeId, q, s)} onChange={(o) => o && setSp({ [k.parentField]: o.id }, { replace: true })} />}
          </Field>
        </Card>
      </section>
    );
  }
  const err = existing.error || parent.error || siblings.error;
  if (err) return <div className="pad"><ErrorState error={err} onRetry={() => { existing.refetch(); parent.refetch(); siblings.refetch(); }} /></div>;
  const parentDoc = parentId ? parent.data : existing.data ? { products: existing.data.products, vat_percent: existing.data.vat_percent } : undefined;
  if ((id && !existing.data) || !parentDoc || (mode === 'non_vat' && parentId && !siblings.data)) {
    return <div className="pad stack"><Skeleton width={260} height={22} /><Skeleton height={300} /></div>;
  }
  return <ReturnEditor key={`${id || 'new'}:${parentId}`} mode={mode} id={id} existing={existing.data} parent={parentDoc} siblings={siblings.data || []} />;
}

interface RState { date: string; lines: ReturnLine[]; summary: SummaryValues; payments: PaymentRow[]; remarks: string; enable_report_to_zatca: boolean }

const toLocalInput = (d: Date) => toRfc3339(d).slice(0, 16);

export function ReturnEditor({ mode, id, existing, parent, siblings }: { mode: ReturnMode; id?: string; existing?: any; parent: any; siblings: any[] }) {
  const k = KINDS[mode];
  const sales = mode === 'sales';
  const { t } = useTranslation();
  const nav = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const { store, user, can } = useAuth();
  const storeId = store?.id || '';
  const editing = !!id;
  const src = existing || parent;
  const flags = useMemo(() => ({ exclude_service_tax: !!src?.exclude_service_tax, exclude_product_tax: !!src?.exclude_product_tax }), [src]);
  const canRefund = !sales || parent?.payment_status !== 'not_paid';

  const [s, setS] = useState<RState>(() => {
    const lines = sales ? buildSalesReturnLines(parent, existing) : buildNonVatReturnLines(parent, siblings, existing);
    const summary = existing ? summaryFromDoc(existing) : sales ? returnSummaryFromOrder(parent)
      : { ...summaryFromDoc(parent), shipping_handling_fees: 0, cash_discount: 0, rounding_amount: 0, auto_rounding_amount: true };
    const payments: PaymentRow[] = existing
      ? (existing.payments || []).filter((p: any) => !p.deleted).map((p: any) => ({ ...p, key: newLineKey(), date_str: p.date_str || p.date || toRfc3339(new Date()) }))
      : canRefund ? [blankPayment(0)] : [];
    return { date: toLocalInput(existing?.date ? new Date(existing.date) : new Date()), lines, summary, payments, remarks: existing?.remarks || '', enable_report_to_zatca: false };
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const update = useCallback((p: Partial<RState>) => { setS((x) => ({ ...x, ...p })); setDirty(true); }, []);

  const locked = sales && editing && isReturnLocked(existing, store);
  const zatcaLive = store?.zatca?.phase === '2' && !!store?.zatca?.connected;
  const sel = useMemo(() => selectedLines(s.lines), [s.lines]);

  const local: Totals = useMemo(() => (sales
    ? salesReturnTotals(s.lines, s.summary)
    : nonVatTotals({ lines: sel, ...flags, vat_percent: s.summary.vat_percent, discount: s.summary.discount, cash_discount: s.summary.cash_discount, auto_rounding_amount: s.summary.auto_rounding_amount, rounding_amount: s.summary.rounding_amount, isReturn: true })),
  [sales, s.lines, s.summary, sel, flags]);

  const body = useMemo(() => {
    const common = {
      store_id: storeId,
      [k.parentField]: parent?.id || existing?.[k.parentField] || null,
      [k.parentCodeField]: parent?.code || existing?.[k.parentCodeField] || '',
      date_str: toRfc3339(new Date(s.date || Date.now())),
      customer_id: src?.customer_id || null,
      customer_name: src?.customer_name || '',
      phone: src?.phone || '', vat_no: src?.vat_no || '', address: src?.address || '',
      remarks: s.remarks,
      vat_percent: s.summary.vat_percent,
      discount: s.summary.discount, discount_with_vat: s.summary.discount_with_vat,
      cash_discount: s.summary.cash_discount,
      auto_rounding_amount: s.summary.auto_rounding_amount, rounding_amount: local.rounding_amount,
      payments_input: canRefund ? paymentsToApi(s.payments) : [],
      total_payment_paid: canRefund ? paymentsTotal(s.payments) : 0,
    };
    if (!sales) return { ...common, ...flags, products: nonVatReturnProductsToApi(s.lines) };
    return {
      ...common,
      status: 'received', received_by: existing?.received_by || user?.id || null,
      discount_percent: local.discount_percent, discount_percent_with_vat: local.discount_percent_with_vat,
      shipping_handling_fees: s.summary.shipping_handling_fees,
      commission: src?.commission || 0, commission_payment_method: src?.commission_payment_method || '',
      enable_report_to_zatca: !editing && s.enable_report_to_zatca,
      products: returnProductsToApi(s.lines),
    };
  }, [storeId, k, parent, existing, src, s, local, canRefund, sales, flags, user, editing]);

  const { server, syncing } = useServerTotals(k.calcEndpoint, body, storeId, sel.length > 0, s.summary.auto_rounding_amount);
  const totals: Totals = useMemo(() => ({ ...local, ...(server || {}) }), [local, server]);
  const cap = sales ? refundCap(parent, totals.net_total, s.summary.cash_discount, editing) : Math.max(0, totals.net_total - s.summary.cash_discount);

  // New return with one untouched refund row: keep it equal to what can be refunded.
  useEffect(() => {
    if (editing || !canRefund) return;
    const live = s.payments.filter((p) => !p.deleted);
    if (live.length === 1 && !(live[0] as any).touched && live[0].amount !== cap) {
      setS((x) => ({ ...x, payments: x.payments.map((p) => (p === live[0] ? { ...p, amount: cap } : p)) }));
    }
  }, [cap, editing, canRefund, s.payments]);

  const save = async () => {
    const e: Record<string, string> = {};
    Object.entries(validateReturnLines(s.lines, { checkPrice: sales })).forEach(([key, m]) => { e[key] = t(m.replace(/\d+(\.\d+)?/, '{{n}}'), { n: m.match(/\d+(\.\d+)?/)?.[0] }); });
    if (!s.date) e.date_str = t('Date is required');
    if (canRefund && paymentsTotal(s.payments) > cap + 0.004) e.total_payment = t('Refunds can’t exceed {{n}}.', { n: fmtMoney(cap) });
    if (sales && totals.net_total > (parent?.net_total ?? Infinity) + 0.004) e.net_total = t('The return total can’t exceed the invoice total ({{n}}).', { n: fmtMoney(parent.net_total) });
    if (s.summary.cash_discount < 0 || (s.summary.cash_discount > 0 && s.summary.cash_discount >= totals.net_total)) e.cash_discount = t('Cash discount must be less than the total.');
    setErrors(e);
    if (Object.keys(e).length) { toast.error(t('Please fix the highlighted fields.')); return; }
    setSaving(true);
    try {
      const final = { ...body, rounding_amount: totals.rounding_amount };
      const r = id ? await api.put<any>(`${k.endpoint}/${id}`, final, { search: { store_id: storeId } }) : await api.post<any>(k.endpoint, final, { search: { store_id: storeId } });
      setDirty(false);
      [k.endpoint, k.parentEndpoint].forEach((p) => qc.invalidateQueries({ queryKey: [p] }));
      toast.success(id ? t('Saved') : t('{{code}} created', { code: r.result?.code || t('Return') }));
      const nid = r.result?.id || id;
      if (nid) nav(`${k.listPath}/${nid}`, { replace: !id });
    } catch (err) {
      if (err instanceof ApiError) {
        // payments_input indices → editor rows (only live, non-empty rows are sent).
        const sent = s.payments.map((p, i) => ({ p, i })).filter(({ p }) => !p.deleted && (p.id || Number(p.amount) > 0));
        const mapped: Record<string, string> = {};
        Object.entries(err.errors).forEach(([key, m]) => {
          const pm = key.match(/^(payment_(?:amount|method|date))_(\d+)$/);
          mapped[pm ? `${pm[1]}_${sent[Number(pm[2])]?.i ?? pm[2]}` : key] = m;
        });
        setErrors(mapped);
        toast.error(err.message);
      } else toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const known = ['product_id', 'date_str', 'cash_discount', 'total_payment', 'net_total'];
  const otherErrors = Object.entries(errors).filter(([key, m]) => m && !/_\d+$/.test(key) && !known.includes(key));
  const canSave = can(k.resource, id ? 'update' : 'create');
  const parentLink = parent?.id ? `${k.parentPath}/${parent.id}` : undefined;
  const displayTotals = sales ? totals : { ...totals, total: totals.total_with_vat };

  return (
    <EditorFrame
      crumbs={[...k.crumbs, { label: id ? existing?.code || '' : 'New' }]}
      icon={k.icon}
      title={id ? <span className="mono" style={{ fontSize: 20 }}>{existing?.code}</span> : t(k.titleNew)}
      pills={<>{!id && <Pill tone="neutral" icon="edit">{t('Draft')}</Pill>}{locked && <Pill tone="info" icon="lock">{t('Locked by ZATCA')}</Pill>}{dirty && <Pill tone="warn" icon="clock">{t('Unsaved')}</Pill>}</>}
      onSave={save}
      onClose={() => nav(id ? `${k.listPath}/${id}` : parentLink || k.listPath)}
      saving={saving} canSave={canSave} dirty={dirty} total={totals.net_total} editing={editing}
      side={
        <>
          <Card title={t('Summary')}>
            <BillSummary totals={displayTotals} values={s.summary} locked={locked} syncing={syncing}
              features={sales ? { shipping: true, discount: true, rounding: true, cashDiscount: true, vatEditable: false } : { shipping: false, discount: true, rounding: true, cashDiscount: true, hideVat: true, vatEditable: false }}
              onChange={(patch) => update({ summary: { ...s.summary, ...patch } })} />
            {!sales && s.summary.cash_discount > 0 && <div className="hint" style={{ marginTop: 6 }}>{t('Cash discount is deducted from the total and again from the balance (server rule).')}</div>}
            {errors.cash_discount && <div className="errmsg">{errors.cash_discount}</div>}
            {errors.net_total && <div className="errmsg">{errors.net_total}</div>}
          </Card>
          {canRefund ? (
            <Card title={t('Refund to customer')} sub={sales ? t('Up to {{n}} can be refunded', { n: fmtMoney(cap) }) : undefined}>
              <PaymentsEditor payments={s.payments} netTotal={totals.net_total} cashDiscount={s.summary.cash_discount} errors={errors} methods={SALES_PAY_METHODS}
                onChange={(p) => update({ payments: p.map((x) => ({ ...x, touched: true }) as PaymentRow) })} />
            </Card>
          ) : (
            <Banner tone="info">{t('This invoice was never paid, so nothing is refunded — the return reduces what the customer owes.')}</Banner>
          )}
          {sales && zatcaLive && !id && (
            <Banner tone="info" icon="shield">
              <label className="checkline"><input type="checkbox" className="chk" checked={s.enable_report_to_zatca} onChange={(e) => update({ enable_report_to_zatca: e.target.checked })} />
                <span><b>{t('Report to ZATCA on save')}</b> — {t('issued as a credit note.')}</span></label>
            </Banner>
          )}
        </>
      }
    >
      {otherErrors.length > 0 && <Banner tone="crit"><b>{t('Couldn’t save.')}</b> {otherErrors.map(([, m]) => m).join(' · ')}</Banner>}
      {locked && <Banner tone="info" icon="lock">{t('This return was reported to ZATCA: items, prices, discount and shipping can’t change. Refunds can still be edited.')}</Banner>}
      <Card title={t('Details')}>
        <div className="sr-kv" style={{ marginBottom: 14 }}>
          <div><span>{t(k.parentLabel)}</span><b className="mono">{parentLink ? <Link className="link" to={parentLink}>{parent?.code}</Link> : existing?.[k.parentCodeField] || '—'}</b></div>
          <div><span>{t('Customer')}</span><b><bdi>{src?.customer_name || '—'}</bdi></b></div>
          <div><span>{t('Invoice total')}</span><b className="num">{fmtMoney(parent?.net_total)}</b></div>
          <div><span>{sales ? t('Received on invoice') : t('Paid')}</span><b className="num">{fmtMoney(parent?.total_payment_received)}</b></div>
        </div>
        <div className="fgrid">
          <Field label={t('Return date')} required error={errors.date_str}>
            {(fid, d) => <Input id={fid} aria-describedby={d} type="datetime-local" value={s.date} onChange={(e) => update({ date: e.target.value })} />}
          </Field>
          {!sales && (
            <div className="sr-flags span2" aria-label={t('Tax')}>
              <label className="checkline"><input type="checkbox" className="chk" checked={flags.exclude_service_tax} disabled readOnly />{t('Exclude service tax')}</label>
              <label className="checkline"><input type="checkbox" className="chk" checked={flags.exclude_product_tax} disabled readOnly />{t('Exclude product tax')}</label>
            </div>
          )}
          <Field label={t('Remarks')} className="span2">{(fid) => <Textarea id={fid} rows={2} value={s.remarks} onChange={(e) => update({ remarks: e.target.value })} />}</Field>
        </div>
      </Card>
      <Card title={<>{t('Items to return')} <span className="muted" style={{ fontWeight: 500 }}>· {sel.length}</span></>} bodyClass="card-b-tight">
        <ReturnLinesTable lines={s.lines} onChange={(lines) => update({ lines })} vat={s.summary.vat_percent} locked={locked} errors={errors} priceEditable={sales} showVat={sales} />
      </Card>
    </EditorFrame>
  );
}
