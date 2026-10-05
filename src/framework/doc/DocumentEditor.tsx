import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { AsyncPicker, type PickerOption } from '@/ui/AsyncPicker';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Field, Input, Textarea } from '@/ui/Field';
import { Banner } from '@/ui/Misc';
import { ObjectBody, ObjectHeader } from '@/ui/ObjectPage';
import { Pill } from '@/ui/Pill';
import { useToast } from '@/ui/Toast';
import type { IconName } from '@/ui/Icon';
import { usePageMeta } from '@/shell/Workspace';
import { fmtMoney, toRfc3339 } from '@/lib/format';
import { computeTotals, linesFromApi, linesToApi, validateLines, applyVat, newLineKey, type DocLine, type PaymentRow, type Totals } from './calc';
import { LinesEditor, type LineColumn } from './LinesEditor';
import { BillSummary, PaymentsEditor, blankPayment, type SummaryValues } from './Summary';
import { loadWarehouses, partyToOption, searchParties, type Party, type PriceSource } from './lookups';

export interface DocState {
  date: string; // datetime-local value
  party: PickerOption<Party> | null;
  phone: string;
  vat_no: string;
  address: string;
  remarks: string;
  lines: DocLine[];
  summary: SummaryValues;
  payments: PaymentRow[];
  enable_report_to_zatca: boolean;
  extra: Record<string, any>;
}

export interface DocConfig {
  kind: string;
  endpoint: string;
  /** Server totals endpoint (e.g. /v1/order/calculate-net-total). */
  calcEndpoint?: string;
  resource: string;
  icon: IconName;
  titleNew: string;
  titleEdit: (code: string) => string;
  crumbs: { label: string; to?: string }[];
  listPath: string;
  viewPath: (id: string) => string;
  party?: { kind: 'customer' | 'vendor'; idField: string; nameField: string; label: string; required?: boolean; allowFreeText?: boolean };
  priceSource: PriceSource;
  lineColumns?: LineColumn[];
  checkStock?: boolean;
  features?: { payments?: boolean; shipping?: boolean; discount?: boolean; rounding?: boolean; cashDiscount?: boolean; zatca?: boolean; warehouse?: boolean; hideVat?: boolean; vatEditable?: boolean; contactFields?: boolean };
  defaultVat?: number;
  /** Extra header fields (render prop). */
  renderExtra?: (s: DocState, set: (patch: Partial<DocState['extra']>) => void, errors: Record<string, string>) => ReactNode;
  /** Final body tweaks (rename keys, add links). */
  toApi?: (body: Record<string, any>, s: DocState) => Record<string, any>;
  /** Hydrate extra fields from an existing doc. */
  fromApi?: (doc: any) => Partial<DocState['extra']>;
  /** Prefill for new documents (e.g. from a quotation). */
  prefill?: () => Partial<DocState> | null;
  /** Lock pricing edits (ZATCA). */
  isLocked?: (doc: any) => boolean;
  maxQty?: (l: DocLine) => number | undefined;
  /** Non-blocking per-line warnings keyed like errors (e.g. quantity_0). */
  lineWarnings?: (lines: DocLine[], s: DocState) => Record<string, string>;
  extraValidate?: (s: DocState, totals: Totals) => Record<string, string>;
  allowZeroPrice?: boolean;
  paymentsKey?: string;
  /** Payment methods offered in the payments editor (e.g. vendor_account for purchases). */
  paymentMethods?: { value: string; label: string }[];
  /** Runs after a successful save, before navigation (link records, update a PO…). Return a path to override navigation. */
  afterSave?: (doc: any, s: DocState) => Promise<string | void> | string | void;
  /** Rename server error keys onto editor keys (e.g. purchase_unit_price_0 → unit_price_0). */
  mapErrors?: (errors: Record<string, string>) => Record<string, string>;
  /** Extra search[...] filters for the product picker (e.g. { is_service: 0 }). */
  searchExtra?: Record<string, string | number>;
  /** Hide the add-item row (returns). */
  allowAdd?: boolean;
}

const toLocalInput = (d: Date) => toRfc3339(d).slice(0, 16);

function initialState(c: DocConfig, vat: number): DocState {
  return {
    date: toLocalInput(new Date()),
    party: null, phone: '', vat_no: '', address: '', remarks: '',
    lines: [],
    summary: { vat_percent: vat, shipping_handling_fees: 0, discount: 0, discount_with_vat: 0, auto_rounding_amount: true, rounding_amount: 0, cash_discount: 0 },
    payments: c.features?.payments ? [blankPayment(0)] : [],
    enable_report_to_zatca: false,
    extra: {},
  };
}

export function stateFromDoc(c: DocConfig, doc: any, vat: number): DocState {
  const v = doc.vat_percent ?? vat;
  const pid = c.party ? doc[c.party.idField] : null;
  return {
    date: toLocalInput(doc.date ? new Date(doc.date) : new Date()),
    party: pid ? { id: pid, label: doc[c.party!.nameField] || '', data: { id: pid, name: doc[c.party!.nameField] || '' } } : null,
    phone: doc.phone || '', vat_no: doc.vat_no || '', address: doc.address || '', remarks: doc.remarks || '',
    lines: linesFromApi(doc.products, v),
    summary: {
      vat_percent: v, shipping_handling_fees: doc.shipping_handling_fees || 0, discount: doc.discount || 0, discount_with_vat: doc.discount_with_vat || 0,
      auto_rounding_amount: doc.auto_rounding_amount ?? true, rounding_amount: doc.rounding_amount || 0, cash_discount: doc.cash_discount || 0,
    },
    payments: (doc.payments || []).filter((p: any) => !p.deleted).map((p: any) => ({ ...p, key: newLineKey(), date_str: p.date_str || p.date || toRfc3339(new Date()) })),
    enable_report_to_zatca: false,
    extra: c.fromApi ? c.fromApi(doc) : {},
  };
}

export function buildBody(c: DocConfig, s: DocState, storeId: string, totals: Totals): Record<string, any> {
  const body: Record<string, any> = {
    store_id: storeId,
    date_str: toRfc3339(new Date(s.date)),
    remarks: s.remarks,
    products: linesToApi(s.lines),
    vat_percent: s.summary.vat_percent,
    discount: s.summary.discount,
    discount_with_vat: s.summary.discount_with_vat,
    discount_percent: totals.discount_percent,
    discount_percent_with_vat: totals.discount_percent_with_vat,
    shipping_handling_fees: s.summary.shipping_handling_fees,
    auto_rounding_amount: s.summary.auto_rounding_amount,
    rounding_amount: totals.rounding_amount,
    cash_discount: s.summary.cash_discount,
    ...s.extra,
  };
  if (c.party) {
    body[c.party.idField] = s.party?.id && !s.party.id.startsWith('new:') ? s.party.id : null;
    body[c.party.nameField] = s.party?.label || '';
  }
  if (c.features?.contactFields !== false) Object.assign(body, { phone: s.phone, vat_no: s.vat_no, address: s.address });
  if (c.features?.payments) {
    body[c.paymentsKey || 'payments_input'] = s.payments
      .filter((p) => p.id || (p.amount && !p.deleted))
      .map(({ key: _k, ...p }) => ({ ...p, amount: Number(p.amount) || 0 }));
  }
  if (c.features?.zatca) body.enable_report_to_zatca = s.enable_report_to_zatca;
  return c.toApi ? c.toApi(body, s) : body;
}

export function DocumentEditor({ config: c, id, existing }: { config: DocConfig; id?: string; existing?: any }) {
  const { t } = useTranslation();
  const nav = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const { store, can } = useAuth();
  const storeId = store?.id || '';
  const vat = c.defaultVat ?? store?.vat_percent ?? 15;
  const [s, setS] = useState<DocState>(() => {
    if (existing) return stateFromDoc(c, existing, vat);
    const base = initialState(c, vat);
    const pre = c.prefill?.();
    return pre ? { ...base, ...pre, extra: { ...base.extra, ...(pre.extra || {}) } } : base;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [server, setServer] = useState<Partial<Totals> | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [warehouses, setWarehouses] = useState<{ id: string; code: string; name: string }[]>([]);
  const reqId = useRef(0);
  const editing = !!id;
  const locked = !!(existing && c.isLocked?.(existing));
  const zatcaLive = store?.zatca?.phase === '2' && store?.zatca?.connected;
  usePageMeta(editing ? c.titleEdit(existing?.code || '') : t(c.titleNew), editing ? 'edit' : 'plus');

  useEffect(() => {
    if (c.features?.warehouse && store?.settings?.enable_warehouse_module && storeId) loadWarehouses(storeId).then(setWarehouses);
  }, [c.features?.warehouse, store?.settings?.enable_warehouse_module, storeId]);

  const update = useCallback((patch: Partial<DocState>) => { setS((x) => ({ ...x, ...patch })); setDirty(true); }, []);
  const local = useMemo(() => computeTotals({ lines: s.lines, ...s.summary }), [s.lines, s.summary]);
  const totals: Totals = useMemo(() => (server ? { ...local, ...server } as Totals : local), [local, server]);

  // Reconcile with the server's authoritative totals (debounced; stale responses dropped).
  useEffect(() => {
    if (!c.calcEndpoint || !storeId || s.lines.length === 0) { setServer(null); return; }
    const my = ++reqId.current;
    const h = setTimeout(async () => {
      setSyncing(true);
      try {
        const r = await api.post<any>(c.calcEndpoint!, buildBody(c, s, storeId, local), { search: { store_id: storeId } });
        if (my !== reqId.current || !r.result) return;
        const x = r.result;
        const pick = (k: keyof Totals) => (typeof x[k] === 'number' ? { [k]: x[k] } : {});
        setServer({ ...pick('total'), ...pick('total_with_vat'), ...pick('vat_price'), ...pick('net_total'), ...(s.summary.auto_rounding_amount ? pick('rounding_amount') : {}), ...pick('discount_percent'), ...pick('discount_percent_with_vat') });
      } catch {
        if (my === reqId.current) setServer(null);
      } finally {
        if (my === reqId.current) setSyncing(false);
      }
    }, 450);
    setServer(null);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.lines, s.summary, c.calcEndpoint, storeId]);

  // New document with a single untouched payment row: keep it equal to the amount due.
  useEffect(() => {
    if (editing || !c.features?.payments) return;
    const live = s.payments.filter((p) => !p.deleted);
    if (live.length === 1 && !live[0].reference_type && !(live[0] as any).touched) {
      const due = Math.max(0, totals.net_total - (s.summary.cash_discount || 0));
      if (live[0].amount !== due) setS((x) => ({ ...x, payments: x.payments.map((p) => (p === live[0] ? { ...p, amount: due } : p)) }));
    }
  }, [totals.net_total, s.summary.cash_discount, editing, c.features?.payments, s.payments]);

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const save = useCallback(async (after: 'view' | 'new' = 'view') => {
    const e: Record<string, string> = { ...validateLines(s.lines, { allowZeroPrice: c.allowZeroPrice }) };
    if (c.party?.required && !s.party) e[c.party.idField] = t('{{f}} is required', { f: t(c.party.label) });
    if (!s.date) e.date_str = t('Date is required');
    if (s.summary.cash_discount < 0 || (s.summary.cash_discount > 0 && s.summary.cash_discount >= totals.net_total)) e.cash_discount = t('Cash discount must be less than the total.');
    Object.assign(e, c.extraValidate?.(s, totals) || {});
    setErrors(e);
    if (Object.keys(e).length) { toast.error(t('Please fix the highlighted fields.')); return; }
    setSaving(true);
    try {
      const body = buildBody(c, s, storeId, totals);
      const r = id ? await api.put<any>(`${c.endpoint}/${id}`, body, { search: { store_id: storeId } }) : await api.post<any>(c.endpoint, body, { search: { store_id: storeId } });
      setDirty(false);
      qc.invalidateQueries({ queryKey: [c.endpoint] });
      toast.success(id ? t('Saved') : t('{{code}} created', { code: r.result?.code || t('Document') }));
      const newId = r.result?.id || id;
      const override = c.afterSave ? await c.afterSave(r.result, s) : undefined;
      if (override) nav(override, { replace: !id });
      else if (after === 'new') { setS(initialState(c, vat)); setErrors({}); nav(c.listPath + '/new', { replace: true }); }
      else if (newId) nav(c.viewPath(newId), { replace: !id });
    } catch (err) {
      if (err instanceof ApiError) { setErrors(c.mapErrors ? c.mapErrors(err.errors) : err.errors); toast.error(err.message); }
      else toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }, [s, c, id, storeId, totals, nav, qc, toast, t, vat]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
      if (e.key === 'F2') { e.preventDefault(); document.getElementById('doc-add-item')?.focus(); }
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [save]);

  const onParty = (o: PickerOption<Party> | null) => {
    const p = o?.data;
    update({
      party: o,
      phone: p?.phone || '',
      vat_no: p?.vat_no || '',
      address: p?.address || s.address,
      remarks: (c.party?.kind === 'vendor' ? p?.use_remarks_in_purchases : p?.use_remarks_in_sales) && p?.remarks ? p.remarks : s.remarks,
    });
  };

  const party = s.party?.data;
  const creditLimit = party?.credit_limit || 0;
  const projected = (party?.credit_balance || 0) + Math.max(0, totals.net_total - (s.payments.reduce((a, p) => a + (p.deleted ? 0 : Number(p.amount) || 0), 0)));
  const overLimit = creditLimit > 0 && projected > creditLimit;
  const otherErrors = Object.entries(errors).filter(([k]) => !/_\d+$/.test(k) && !['product_id', 'date_str', 'cash_discount', 'total_payment', c.party?.idField].includes(k) && !(k in s.extra));
  const canSave = can(c.resource, id ? 'update' : 'create');

  const actions = (
    <div className="row doc-actions">
      <Button variant="ghost" onClick={() => nav(id ? c.viewPath(id) : c.listPath)}>{t(dirty ? 'Discard' : 'Close')}</Button>
      {!id && <Button onClick={() => save('new')} disabled={!canSave} loading={saving}>{t('Save & new')}</Button>}
      <Button variant="primary" icon="check" onClick={() => save()} loading={saving} disabled={!canSave}>{t(id ? 'Save changes' : 'Save')} <kbd style={{ background: 'rgba(255,255,255,.15)', color: '#fff', borderColor: 'rgba(255,255,255,.25)' }}>Ctrl S</kbd></Button>
    </div>
  );

  return (
    <>
      <ObjectHeader
        crumbs={[...c.crumbs.map((x) => ({ ...x, label: t(x.label) })), { label: id ? existing?.code || '' : t('New') }]}
        icon={c.icon}
        title={id ? <span className="mono" style={{ fontSize: 20 }}>{existing?.code}</span> : t(c.titleNew)}
        pills={<>{!id && <Pill tone="neutral" icon="edit">{t('Draft')}</Pill>}{locked && <Pill tone="info" icon="lock">{t('Locked by ZATCA')}</Pill>}{dirty && <Pill tone="warn" icon="clock">{t('Unsaved')}</Pill>}</>}
        actions={actions}
      />
      <ObjectBody
        side={
          <aside className="stack" style={{ position: 'sticky', top: 16 }}>
            <Card title={t('Summary')}>
              <BillSummary totals={totals} values={s.summary} locked={locked} syncing={syncing}
                features={{ shipping: c.features?.shipping ?? true, discount: c.features?.discount ?? true, rounding: c.features?.rounding ?? true, cashDiscount: c.features?.cashDiscount, hideVat: c.features?.hideVat, vatEditable: c.features?.vatEditable ?? true }}
                onChange={(patch) => update({ summary: { ...s.summary, ...patch }, ...(patch.vat_percent !== undefined && patch.vat_percent !== s.summary.vat_percent ? { lines: applyVat(s.lines, patch.vat_percent) } : {}) })} />
              {errors.cash_discount && <div className="errmsg">{errors.cash_discount}</div>}
            </Card>
            {c.features?.payments && (
              <Card title={t('Payment')}>
                <PaymentsEditor payments={s.payments} netTotal={totals.net_total} cashDiscount={s.summary.cash_discount} errors={errors} methods={c.paymentMethods}
                  onChange={(p) => update({ payments: p.map((x) => ({ ...x, touched: true }) as PaymentRow) })} />
              </Card>
            )}
            {c.features?.zatca && zatcaLive && !id && (
              <Banner tone="info" icon="shield">
                <label className="checkline"><input type="checkbox" className="chk" checked={s.enable_report_to_zatca} onChange={(e) => update({ enable_report_to_zatca: e.target.checked })} />
                  <span><b>{t('Report to ZATCA on save')}</b> — {t('signed, hashed, QR-coded and cleared automatically.')}</span></label>
              </Banner>
            )}
          </aside>
        }
      >
        {otherErrors.length > 0 && <Banner tone="crit"><b>{t('Couldn’t save.')}</b> {otherErrors.map(([, m]) => m).join(' · ')}</Banner>}
        <Card title={t('Details')}>
          <div className="fgrid">
            {c.party && (
              <Field label={t(c.party.label)} required={c.party.required} error={errors[c.party.idField] || errors.customer_credit_limit || errors.blocked} className="span2">
                {(fid, d) => (
                  <AsyncPicker<Party> id={fid} aria-describedby={d} value={s.party} onChange={onParty} clearable eager invalid={!!errors[c.party!.idField]}
                    placeholder={t('Search by name, phone, VAT no., code…')}
                    load={async (q, sig) => (await searchParties(c.party!.kind, storeId, q, sig)).map(partyToOption)}
                    onCreate={c.party!.allowFreeText ? (q) => onParty({ id: `new:${q}`, label: q, data: { id: '', name: q } }) : undefined}
                    createLabel={t('Use “{{q}}” as a new {{kind}}', { q: '…', kind: t(c.party!.kind) })} />
                )}
              </Field>
            )}
            <Field label={t('Date')} required error={errors.date_str}>
              {(fid, d) => <Input id={fid} aria-describedby={d} type="datetime-local" value={s.date} onChange={(e) => update({ date: e.target.value })} disabled={locked} />}
            </Field>
            {c.features?.contactFields !== false && c.party && (
              <>
                <Field label={t('Phone')} error={errors.phone}>{(fid, d) => <Input id={fid} aria-describedby={d} type="tel" value={s.phone} onChange={(e) => update({ phone: e.target.value })} />}</Field>
                <Field label={t('VAT no.')} error={errors.vat_no}>{(fid, d) => <Input id={fid} aria-describedby={d} inputMode="numeric" maxLength={15} value={s.vat_no} onChange={(e) => update({ vat_no: e.target.value })} />}</Field>
              </>
            )}
            {c.renderExtra?.(s, (patch) => update({ extra: { ...s.extra, ...patch } }), errors)}
            <Field label={t('Remarks')} className="span2">{(fid) => <Textarea id={fid} rows={2} value={s.remarks} onChange={(e) => update({ remarks: e.target.value })} />}</Field>
          </div>
          {party && creditLimit > 0 && (
            <div style={{ marginTop: 12 }}>
              {overLimit ? <Banner tone="warn"><b>{t('Credit limit exceeded by {{n}}', { n: fmtMoney(projected - creditLimit) })}</b> — {t('collect payment now or ask a manager to raise the limit.')}</Banner>
                : <div className="hint">{t('Credit available after this document')}: <b className="num">{fmtMoney(creditLimit - projected)}</b> / {fmtMoney(creditLimit, 0)}</div>}
            </div>
          )}
        </Card>
        <Card title={<>{t('Items')} <span className="muted" style={{ fontWeight: 500 }}>· {s.lines.length}</span></>} bodyClass="card-b-tight">
          <LinesEditor lines={s.lines} onChange={(lines) => update({ lines })} vat={s.summary.vat_percent} storeId={storeId} priceSource={c.priceSource}
            columns={c.lineColumns} errors={errors} warnings={c.lineWarnings?.(s.lines, s)} locked={locked} checkStock={c.checkStock && !id} warehouses={warehouses} maxQty={c.maxQty} searchExtra={c.searchExtra} allowAdd={c.allowAdd}
            onToast={(m, k) => (k === 'error' ? toast.error(m) : toast.success(m))} />
        </Card>
      </ObjectBody>
      <div className="mbar">
        <div className="t"><span>{t('Total')}</span><b className="num">{fmtMoney(totals.net_total)}</b></div>
        <Button variant="primary" icon="check" onClick={() => save()} loading={saving} disabled={!canSave}>{t('Save')}</Button>
      </div>
    </>
  );
}
