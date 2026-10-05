import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/api/client';
import { useAuth, useStoreId } from '@/auth/AuthContext';
import { requestDocumentPdf, saveBlob, uploadPdf, whatsappLink } from '@/framework/doc/pdf';
import { PAYMENT_METHODS } from '@/framework/doc/Summary';
import { r8, type DocLine } from '@/framework/doc/calc';
import { AsyncPicker, type PickerOption } from '@/ui/AsyncPicker';
import { Button } from '@/ui/Button';
import { Field, Input, Select, Textarea } from '@/ui/Field';
import { Banner, EmptyState, Spinner } from '@/ui/Misc';
import { Modal } from '@/ui/Overlay';
import { Pill, type Tone } from '@/ui/Pill';
import { useToast } from '@/ui/Toast';
import { fmtDate, fmtMoney, parseNumber, toRfc3339 } from '@/lib/format';
import { t as tt } from '@/i18n';
import { EP, marginPct, refundPaymentsInput, type SellMap } from './api';
import './buying.css';

// ───────────────────────────── status pills ─────────────────────────────

const PO_TONE: Record<string, [Tone, string]> = {
  draft: ['neutral', 'Draft'], sent: ['info', 'Sent'], confirmed: ['info', 'Confirmed'],
  partially_received: ['warn', 'Partially received'], received: ['good', 'Received'], cancelled: ['crit', 'Cancelled'],
};
export function PoStatusPill({ status }: { status?: string }) {
  const [tone, label] = PO_TONE[status || 'draft'] || ['neutral', status || '—'];
  return <Pill tone={tone}>{tt(label)}</Pill>;
}
export const PO_STATUS_OPTIONS = Object.entries(PO_TONE).map(([value, [, label]]) => ({ value, label }));

const PR_TONE: Record<string, [Tone, string]> = {
  pending: ['warn', 'Pending'], accepted: ['good', 'Accepted'], partially_accepted: ['info', 'Partially accepted'], rejected: ['crit', 'Rejected'],
};
export function PrStatusPill({ status }: { status?: string }) {
  const [tone, label] = PR_TONE[status || 'pending'] || ['neutral', status || '—'];
  return <Pill tone={tone}>{tt(label)}</Pill>;
}
export const PR_STATUS_OPTIONS = Object.entries(PR_TONE).map(([value, [, label]]) => ({ value, label }));

/** Purchase payment methods (purchase.md §1.4 / §5). */
export const PURCHASE_PAYMENT_METHODS = [...PAYMENT_METHODS, { value: 'vendor_account', label: 'Vendor account' }];

// ───────────────────────────── PDF / WhatsApp ─────────────────────────────

/** Download PDF + WhatsApp share via the server PDF renderer (legacy view.js Share/Download). */
export function ShareActions({ doc, modelName, phone }: { doc: any; modelName: string; phone?: string }) {
  const { t } = useTranslation();
  const { store } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState<'' | 'pdf' | 'wa'>('');
  const run = async (kind: 'pdf' | 'wa') => {
    setBusy(kind);
    try {
      const blob = await requestDocumentPdf({ doc, modelName, store });
      if (kind === 'pdf') saveBlob(blob, doc.code);
      else {
        const url = await uploadPdf(blob, doc.code);
        window.open(whatsappLink(phone || doc.phone, `${doc.code} — ${url}`), '_blank', 'noopener');
      }
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : (e as Error).message);
    } finally {
      setBusy('');
    }
  };
  return (
    <>
      <Button icon="download" className="hide-sm" loading={busy === 'pdf'} onClick={() => run('pdf')}>{t('PDF')}</Button>
      <Button icon="wa" className="hide-sm" loading={busy === 'wa'} onClick={() => run('wa')}>{t('WhatsApp')}</Button>
    </>
  );
}

// ───────────────────────────── selling prices ─────────────────────────────

/** Retail / wholesale prices to push to the product on save (server copies values > 0; purchase.md §1.2). */
export function SellingPrices({ lines, value, onChange, errors, autoUpdate }: {
  lines: DocLine[]; value: SellMap | undefined; onChange: (v: SellMap) => void; errors: Record<string, string>; autoUpdate?: boolean;
}) {
  const { t } = useTranslation();
  const storeId = useStoreId();
  const sell = useMemo(() => value || {}, [value]);
  const hasErr = Object.keys(errors).some((k) => /^(retail|wholesale)_unit_price_\d+$/.test(k));
  const [open, setOpen] = useState(false);
  const ids = lines.filter((l) => l.product_id && !sell[l.key]).map((l) => l.product_id as string);
  const idKey = Array.from(new Set(ids)).join(',');

  // Load current selling prices for lines we have not seen yet.
  useEffect(() => {
    if (!idKey || !storeId) return;
    const ctl = new AbortController();
    const f = ['retail_unit_price', 'wholesale_unit_price'].map((x) => `product_stores.${storeId}.${x}`).join(',');
    api.get<any[]>(EP.product, { search: { store_id: storeId, ids: idKey }, limit: 100, select: `id,${f}` }, ctl.signal)
      .then((r) => {
        const by = new Map((r.result || []).map((p) => [p.id, p.product_stores?.[storeId] || {}]));
        const next: SellMap = { ...sell };
        lines.forEach((l) => {
          if (!l.product_id || next[l.key]) return;
          const ps = by.get(l.product_id) || {};
          next[l.key] = { curRetail: Number(ps.retail_unit_price) || 0, curWholesale: Number(ps.wholesale_unit_price) || 0 };
        });
        onChange(next);
      })
      .catch(() => {});
    return () => ctl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idKey, storeId]);

  const priced = lines.map((l, i) => ({ l, i })).filter((x) => x.l.product_id);
  if (!priced.length) return null;
  const set = (key: string, patch: Partial<SellMap[string]>) => onChange({ ...sell, [key]: { ...sell[key], ...patch } });
  return (
    <details className="span2 bsell" open={open || hasErr} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary>
        <b>{t('Selling prices')}</b> <span className="muted">· {t('updated on the product when you save')}</span>
        {hasErr && <span className="errmsg" style={{ display: 'inline-flex', marginInlineStart: 8 }}>{t('Check the highlighted prices.')}</span>}
      </summary>
      {autoUpdate && <div className="hint" style={{ margin: '6px 0' }}>{t('Prices of products set to follow the last purchase are recalculated from their margin automatically.')}</div>}
      <div style={{ overflowX: 'auto' }}>
        <table className="lines" aria-label={t('Selling prices')}>
          <thead><tr><th>{t('Item')}</th><th className="r">{t('Cost')}</th><th className="r">{t('Retail price')}</th><th className="r">{t('Wholesale price')}</th></tr></thead>
          <tbody>
            {priced.map(({ l, i }) => {
              const sp = sell[l.key] || {};
              const cost = r8(l.unit_price - (l.unit_discount || 0));
              const cell = (kind: 'retail' | 'wholesale') => {
                const cur = kind === 'retail' ? sp.curRetail : sp.curWholesale;
                const v = sp[kind] ?? cur ?? 0;
                const m = marginPct(cost, v);
                const err = errors[`${kind}_unit_price_${i}`];
                return (
                  <td className="r">
                    <input className={`cell num${err ? ' err' : ''}`} inputMode="decimal" aria-label={`${t(kind === 'retail' ? 'Retail price' : 'Wholesale price')} ${l.name}`}
                      defaultValue={v ? String(v) : ''} key={`${l.key}-${kind}-${cur}`} onBlur={(e) => set(l.key, { [kind]: parseNumber(e.target.value) })} />
                    <div className={`hint${m !== null && m < 0 ? ' neg' : ''}`}>{m === null ? '—' : `${m}%`}</div>
                    {err && <div className="errmsg">{t(err)}</div>}
                  </td>
                );
              };
              return (
                <tr key={l.key}>
                  <td className="pn"><b>{l.name}</b>{l.part_number && <span className="mono">{l.part_number}</span>}</td>
                  <td className="r num">{fmtMoney(cost)}</td>
                  {cell('retail')}
                  {cell('wholesale')}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </details>
  );
}

// ───────────────────────────── pickers ─────────────────────────────

export async function searchPurchases(storeId: string, q: string, signal: AbortSignal, extra: Record<string, string> = {}): Promise<PickerOption[]> {
  const r = await api.get<any[]>(EP.purchase, { search: { store_id: storeId, ...(q ? { code: q } : {}), ...extra }, limit: 15, sort: '-date', select: 'id,code,date,vendor_name,net_total,balance_amount,payment_status,cash_discount,total,total_payment_paid' }, signal);
  return (r.result || []).map((p) => ({ id: p.id, label: p.code, sub: [p.vendor_name, fmtDate(p.date)].filter(Boolean).join(' · '), right: fmtMoney(p.net_total), data: p }));
}

/** Pick a purchase order (legacy PurchaseOrderPicker). */
export function PoPickerModal({ open, onClose, onPick, vendorId }: { open: boolean; onClose: () => void; onPick: (po: any) => void; vendorId?: string }) {
  const { t } = useTranslation();
  const storeId = useStoreId();
  const [code, setCode] = useState('');
  const [rows, setRows] = useState<any[] | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    if (!open) return;
    const ctl = new AbortController();
    setRows(null); setErr('');
    const h = setTimeout(() => {
      api.get<any[]>(EP.po, { search: { store_id: storeId, ...(code ? { code } : {}), ...(vendorId ? { vendor_id: vendorId } : {}) }, limit: 30, sort: '-created_at', select: 'id,code,date,vendor_name,net_total,status,total_quantity' }, ctl.signal)
        .then((r) => setRows((r.result || []).filter((p) => p.status !== 'cancelled')))
        .catch((e) => { if ((e as Error).name !== 'AbortError') setErr((e as Error).message); });
    }, 250);
    return () => { clearTimeout(h); ctl.abort(); };
  }, [open, code, storeId, vendorId]);
  return (
    <Modal open={open} onClose={onClose} title={t('Copy lines from a purchase order')} width={640}>
      <div className="stack" style={{ gap: 10 }}>
        <Input aria-label={t('Search PO #')} placeholder={t('Search PO #')} value={code} onChange={(e) => setCode(e.target.value)} data-autofocus />
        {err && <Banner tone="crit">{err}</Banner>}
        {!rows && !err && <div className="full-center" style={{ padding: 20 }}><Spinner /></div>}
        {rows && rows.length === 0 && <EmptyState icon="file" title={t('No purchase orders found')} />}
        {rows && rows.length > 0 && (
          <div className="bpick" role="listbox" aria-label={t('Purchase orders')}>
            {rows.map((p) => (
              <button type="button" role="option" aria-selected={false} key={p.id} onClick={() => onPick(p)}>
                <span className="mono">{p.code}</span>
                <span className="grow"><bdi>{p.vendor_name || '—'}</bdi> <span className="muted">· {fmtDate(p.date)}</span></span>
                <PoStatusPill status={p.status} />
                <b className="num">{fmtMoney(p.net_total)}</b>
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

// ───────────────────────────── refund (purchase return payment) ─────────────────────────────

/**
 * Record a refund on a purchase return. POST /purchase-return-payment crashes server-side
 * (purchase.md §6), so we PUT the return with the full payments_input list instead.
 */
export function RefundModal({ open, onClose, ret }: { open: boolean; onClose: () => void; ret: any }) {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const storeId = useStoreId();
  const balance = Number(ret?.balance_amount) || 0;
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [date, setDate] = useState('');
  const [desc, setDesc] = useState('');
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) { setAmount(String(Math.max(0, balance))); setMethod('cash'); setDate(toRfc3339(new Date()).slice(0, 16)); setDesc(''); setErrs({}); }
  }, [open, balance]);
  const submit = async () => {
    const a = parseNumber(amount);
    const e: Record<string, string> = {};
    if (!(a > 0)) e.amount = t('Enter an amount greater than zero.');
    else if (a > balance + 0.004) e.amount = t('Amount can’t exceed the balance due ({{b}}).', { b: fmtMoney(balance) });
    if (!date) e.date_str = t('Date is required');
    setErrs(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const payments_input = refundPaymentsInput(ret, { amount: a, method, date_str: toRfc3339(new Date(date)), description: desc });
      await api.put(`${EP.ret}/${ret.id}`, { store_id: storeId, date_str: ret.date, payments_input }, { search: { store_id: storeId } });
      [EP.ret, EP.retPay, EP.purchase].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      toast.success(t('Refund of {{a}} recorded', { a: fmtMoney(a) }));
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        const mapped: Record<string, string> = {};
        Object.entries(err.errors).forEach(([k, v]) => { mapped[/^payment_amount_\d+$|^total_payment$/.test(k) ? 'amount' : k] = v; });
        setErrs(mapped);
      } else toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const generic = Object.entries(errs).filter(([k]) => !['amount', 'date_str', 'method'].includes(k));
  return (
    <Modal open={open} onClose={onClose} title={`${t('Record refund')} · ${ret?.code || ''}`} width={480}
      footer={<><Button variant="ghost" onClick={onClose}>{t('Cancel')}</Button><Button variant="primary" icon="check" loading={busy} onClick={submit}>{t('Record refund')}</Button></>}>
      <div className="stack" style={{ gap: 14 }}>
        <div className="bal due"><span>{t('Refund due from vendor')}</span><span className="num">{fmtMoney(balance)}</span></div>
        {generic.length > 0 && <Banner tone="crit">{generic.map(([, m]) => m).join(' · ')}</Banner>}
        <div className="grid-2c">
          <Field label={t('Amount')} required error={errs.amount}>{(id, d) => <Input id={id} aria-describedby={d} inputMode="decimal" className="num" value={amount} onChange={(e) => setAmount(e.target.value)} invalid={!!errs.amount} data-autofocus />}</Field>
          <Field label={t('Method')} required error={errs.method}>{(id) => <Select id={id} value={method} onChange={(e) => setMethod(e.target.value)} options={[...PURCHASE_PAYMENT_METHODS, { value: 'purchase', label: 'Purchase' }].map((m) => ({ ...m, label: t(m.label) }))} />}</Field>
          <Field label={t('Date')} required error={errs.date_str}>{(id) => <Input id={id} type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />}</Field>
          <Field label={t('Note')} className="span2">{(id) => <Textarea id={id} rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} />}</Field>
        </div>
      </div>
    </Modal>
  );
}

/** Async picker of active-store users (purchase request assignee). */
export async function searchUsers(q: string, signal: AbortSignal): Promise<PickerOption[]> {
  const r = await api.get<any[]>(EP.user, { search: q ? { name: q } : {}, limit: 20, select: 'id,name,email,role' }, signal);
  return (r.result || []).map((u) => ({ id: u.id, label: u.name, sub: u.email || u.role || '', data: u }));
}

export function UserPicker({ value, onChange, invalid, id, describedBy }: { value: PickerOption | null; onChange: (o: PickerOption | null) => void; invalid?: boolean; id?: string; describedBy?: string }) {
  const { t } = useTranslation();
  return <AsyncPicker id={id} aria-describedby={describedBy} value={value} onChange={onChange} load={searchUsers} eager clearable invalid={invalid} placeholder={t('Search users…')} />;
}
