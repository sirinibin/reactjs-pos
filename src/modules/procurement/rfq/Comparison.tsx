import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '@/api/client';
import { useAuth, useStoreId } from '@/auth/AuthContext';
import { Button, IconButton } from '@/ui/Button';
import { Banner, EmptyState, useConfirm } from '@/ui/Misc';
import { Field, Input, Select, Textarea } from '@/ui/Field';
import { Modal } from '@/ui/Overlay';
import { Pill } from '@/ui/Pill';
import { useToast } from '@/ui/Toast';
import { fmtDateTime, fmtMoney, parseNumber } from '@/lib/format';
import { papi } from '../api';
import {
  PREFILL_KEY, buildMatrix, buildPriceUpdates, buildQuotationPrefill, clampMargin, dedupeReplies, latestQuotations, lowestSelections, matchPricesToProducts,
  mergeParseResults, pricesForProducts, retailPrice, supplierKey, type ParseFileResult,
} from '../logic';
import type { RFQ, SupplierReply, SupplierReplyPrice } from '../types';
import { AiPicker, FileDrop, Section, useAiChoice } from '../components/common';

export const QUOTE_ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,.gif,.xlsx,.xls,.csv,.txt';

/** Price comparison matrix with margins (§5.4). */
export function PriceComparison({ rfq, onChanged }: { rfq: RFQ; onChanged: () => void }) {
  const { t } = useTranslation();
  const nav = useNavigate();
  const toast = useToast();
  const storeId = useStoreId();
  const { setting, can } = useAuth();
  const products = useMemo(() => rfq.products || [], [rfq.products]);
  const quotes = useMemo(() => latestQuotations(rfq.supplier_replies), [rfq.supplier_replies]);
  const matrix = useMemo(() => buildMatrix(products, quotes), [products, quotes]);
  const lowest = useMemo(() => lowestSelections(matrix), [matrix]);
  const [sel, setSel] = useState<(string | null)[]>(lowest);
  const defMargin = Number(setting('default_quotation_margin_percent', 0)) || 35;
  const [margins, setMargins] = useState<number[]>(() => products.map(() => defMargin));
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const replyCount = (rfq.supplier_replies || []).length;
  // Recompute default selection when the replies change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setSel(lowest), [replyCount, quotes.length]);
  useEffect(() => {
    setMargins(products.map(() => defMargin));
    const ac = new AbortController();
    products.forEach((p, i) => {
      if (!p.product_id) return;
      api.get<any>(`/v1/product/${p.product_id}`, { search: { store_id: storeId }, select: `product_stores.${storeId}.retail_margin_percent` }, ac.signal)
        .then((r) => { const m = Number(r.result?.product_stores?.[storeId]?.retail_margin_percent); if (m > 0) setMargins((x) => x.map((v, j) => (j === i ? m : v))); })
        .catch(() => { /* fall back to the store default */ });
    });
    return () => ac.abort();
  }, [products, storeId, defMargin]);

  const updatePrices = async () => {
    const items = buildPriceUpdates(products, matrix, sel, margins);
    if (!items.length) { toast.error(t('Select a supplier price for at least one catalog-linked product.')); return; }
    setBusy(true);
    try {
      const r = await papi.patch<{ updated: number; skipped: number }>(`/v1/rfq-received/${rfq.id}/update-product-prices`, { items }, { store_id: storeId });
      toast.success(t('{{u}} updated, {{s}} skipped', { u: r.updated ?? 0, s: r.skipped ?? 0 }));
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  const createQuotation = () => {
    const prefill = buildQuotationPrefill(rfq, matrix, sel, margins, quotes);
    try { sessionStorage.setItem(PREFILL_KEY, JSON.stringify(prefill)); } catch { /* storage unavailable */ }
    nav(`/sales/quotations/new?from_rfq=${rfq.id}`);
  };

  return (
    <div className="stack">
      <Section title={t('Price comparison')} actions={<>
        {can('rfq_received', 'update') && <Button icon="plus" onClick={() => setAdding(true)}>{t('Add quotation')}</Button>}
        {quotes.length > 0 && <Button icon="cash" loading={busy} onClick={updatePrices}>{t('Update product prices')}</Button>}
        {quotes.length > 0 && can('quotations', 'create') && <Button variant="primary" icon="clip" onClick={createQuotation}>{t('Create quotation')}</Button>}
      </>}>
        {!products.length ? <Banner tone="info">{t('This RFQ has no item list (attachments only), so prices can’t be compared per item.')}</Banner>
          : !quotes.length ? <EmptyState icon="cash" title={t('No supplier quotations yet')}>{t('Prices appear here when suppliers reply with a quotation, or add one from a file.')}</EmptyState> : (
          <div className="pr-scroll">
            <table className="pr-table" aria-label={t('Price comparison')}>
              <thead>
                <tr>
                  <th>#</th><th>{t('Part No.')}</th><th>{t('Product')}</th><th className="r">{t('Qty')}</th>
                  {quotes.map((q) => <th key={supplierKey(q)} className="r"><bdi>{q.supplier_name || q.supplier_phone}</bdi></th>)}
                  <th>{t('Selected supplier')}</th><th className="r">{t('Margin %')}</th><th className="r">{t('Retail price')}</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p, i) => {
                  const chosen = sel[i] ? matrix[i]?.[sel[i]!] : undefined;
                  return (
                    <tr key={i}>
                      <td className="num">{i + 1}</td><td>{p.part_no || '—'}</td><td><bdi>{p.name}</bdi></td><td className="r num">{p.quantity ?? ''}</td>
                      {quotes.map((q) => {
                        const k = supplierKey(q);
                        const c = matrix[i]?.[k];
                        return (
                          <td key={k} className="r">
                            {c ? (
                              <button type="button" className={`pr-cell${lowest[i] === k ? ' low' : ''}${sel[i] === k ? ' sel' : ''}`} aria-pressed={sel[i] === k}
                                aria-label={`${q.supplier_name || q.supplier_phone} ${fmtMoney(c.unit_price)}`} onClick={() => setSel((s) => s.map((v, j) => (j === i ? k : v)))}>
                                <b className="num">{fmtMoney(c.unit_price)} <small>{c.currency}</small></b>
                                <small>{c.vat_included ? t('incl. VAT') : t('excl. VAT')}{lowest[i] === k ? ` · ${t('lowest')}` : ''}</small>
                              </button>
                            ) : <span className="muted">—</span>}
                          </td>
                        );
                      })}
                      <td>
                        <Select aria-label={`${t('Selected supplier')} ${i + 1}`} value={sel[i] || ''} onChange={(e) => setSel((s) => s.map((v, j) => (j === i ? e.target.value || null : v)))}
                          placeholder={t('None')} options={quotes.filter((q) => matrix[i]?.[supplierKey(q)]).map((q) => ({ value: supplierKey(q), label: q.supplier_name || q.supplier_phone || '?' }))} />
                      </td>
                      <td className="r"><Input aria-label={`${t('Margin %')} ${i + 1}`} className="num" inputMode="decimal" style={{ width: 80 }} value={margins[i] ?? ''} onChange={(e) => setMargins((m) => m.map((v, j) => (j === i ? clampMargin(parseNumber(e.target.value)) : v)))} /></td>
                      <td className="r num"><b>{chosen ? fmtMoney(retailPrice(chosen.unit_price, margins[i] ?? 0)) : '—'}</b></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>
      <AddQuotationModal open={adding} rfq={rfq} onClose={() => setAdding(false)} onAdded={() => { setAdding(false); onChanged(); }} />
    </div>
  );
}

/** Supplier reply cards + manual reply entry (Replies tab). */
export function RepliesPanel({ rfq, onChanged }: { rfq: RFQ; onChanged: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const storeId = useStoreId();
  const { can } = useAuth();
  const [confirmEl, ask] = useConfirm();
  const replies = dedupeReplies(rfq.supplier_replies);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ supplier_name: '', supplier_phone: '', raw_text: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const del = async (r: SupplierReply) => {
    if (!(await ask(t('Delete this reply?'), { danger: true, confirmLabel: t('Delete'), body: t('The reply from {{s}} and its prices will be removed from the comparison.', { s: r.supplier_name || r.supplier_phone }) }))) return;
    try { await papi.del(`/v1/rfq-received/${rfq.id}/supplier-replies/${r.id}`, { store_id: storeId }); toast.success(t('Reply deleted')); onChanged(); } catch (e) { toast.error((e as Error).message); }
  };
  const add = async () => {
    setErr('');
    if (!form.supplier_name.trim() && !form.supplier_phone.trim()) { setErr(t('Enter the supplier name or phone.')); return; }
    if (!form.raw_text.trim()) { setErr(t('Paste the supplier’s reply text.')); return; }
    setBusy(true);
    try {
      await papi.post(`/v1/rfq-received/${rfq.id}/supplier-reply`, { supplier_name: form.supplier_name.trim(), supplier_phone: form.supplier_phone.replace(/\D/g, ''), raw_text: form.raw_text }, { store_id: storeId });
      toast.success(t('Reply added — AI is extracting prices'));
      setOpen(false); setForm({ supplier_name: '', supplier_phone: '', raw_text: '' });
      onChanged();
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <Section title={<>{t('Supplier replies')} <span className="muted num">({replies.length})</span></>} actions={can('rfq_received', 'update') && <Button icon="plus" onClick={() => setOpen(true)}>{t('Add reply')}</Button>}>
      {!replies.length ? <EmptyState icon="mail" title={t('No replies yet')}>{t('Supplier replies on WhatsApp or email are linked here automatically.')}</EmptyState> : (
        <div className="pr-grid-cards">
          {replies.map((r) => (
            <div className="pr-reply" key={r.id}>
              <div className="row" style={{ flexWrap: 'nowrap' }}>
                <b style={{ flex: 1, minWidth: 0 }}><bdi>{r.supplier_name || r.supplier_phone || r.supplier_email}</bdi></b>
                {can('rfq_received', 'delete') && <IconButton icon="trash" label={`${t('Delete reply')} ${r.supplier_name || ''}`} onClick={() => del(r)} />}
              </div>
              <div className="row" style={{ gap: 6 }}>
                {r.is_quotation ? <Pill tone="good">{t('Quotation')}</Pill> : <Pill tone="neutral" icon="mail">{t('Not a quotation')}</Pill>}
                {r.extraction_status && <Pill tone={r.extraction_status === 'done' ? 'good' : r.extraction_status === 'failed' ? 'crit' : 'warn'}>{t(r.extraction_status)}</Pill>}
                <span className="muted num" style={{ fontSize: 12 }}>{fmtDateTime(r.received_at)}</span>
              </div>
              {r.supplier_phone && <span className="muted num" style={{ fontSize: 12 }}>{r.supplier_phone}</span>}
              {r.raw_text && <div className="pr-wrap" style={{ fontSize: 12.5, maxHeight: 140, overflow: 'auto' }}>{r.raw_text}</div>}
              {(r.prices || []).length > 0 && <span className="muted" style={{ fontSize: 12 }}>{t('{{n}} prices', { n: r.prices!.length })}</span>}
              {r.extraction_error && <Banner tone="crit">{r.extraction_error}</Banner>}
            </div>
          ))}
        </div>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title={t('Add supplier reply')} width={560}
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>{t('Cancel')}</Button><Button variant="primary" loading={busy} onClick={add}>{t('Add reply')}</Button></>}>
        <div className="grid-2c">
          {err && <div className="span2"><Banner tone="crit">{err}</Banner></div>}
          <Field label={t('Supplier name')}>{(id) => <Input id={id} value={form.supplier_name} onChange={(e) => setForm({ ...form, supplier_name: e.target.value })} />}</Field>
          <Field label={t('Supplier phone')}>{(id) => <Input id={id} type="tel" className="num" value={form.supplier_phone} onChange={(e) => setForm({ ...form, supplier_phone: e.target.value })} />}</Field>
          <Field label={t('Reply text')} className="span2" hint={t('AI extracts prices from the text in the background (needs an LLM key).')}>{(id) => <Textarea id={id} rows={6} value={form.raw_text} onChange={(e) => setForm({ ...form, raw_text: e.target.value })} />}</Field>
        </div>
      </Modal>
      {confirmEl}
    </Section>
  );
}

interface Row { price: SupplierReplyPrice | null; unit_price: string; currency: string }

/** Add Quotation wizard: (1) files + AI → parse-file in parallel, (2) review prices, (3) POST supplier-replies. */
export function AddQuotationModal({ open, rfq, onClose, onAdded, initialFiles }: { open: boolean; rfq: RFQ; onClose: () => void; onAdded: () => void; initialFiles?: File[] }) {
  const { t } = useTranslation();
  const toast = useToast();
  const storeId = useStoreId();
  const ai = useAiChoice();
  const products = rfq.products || [];
  const [step, setStep] = useState<1 | 2>(1);
  const [files, setFiles] = useState<File[]>(initialFiles || []);
  const [rows, setRows] = useState<Row[]>([]);
  const [supplier, setSupplier] = useState({ name: '', phone: '' });
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setStep(1); setFiles(initialFiles || []); setRows([]); setErr(''); setSupplier({ name: '', phone: '' }); } }, [open, initialFiles]);

  const parse = async () => {
    if (!files.length) { setErr(t('Choose at least one quotation file.')); return; }
    setErr(''); setBusy(true);
    try {
      const results = await Promise.all(files.map((f) => {
        const fd = new FormData();
        fd.append('file', f);
        return papi.post<ParseFileResult>(`/v1/rfq-received/${rfq.id}/supplier-replies/parse-file`, fd, { store_id: storeId, llm_provider: ai.provider, llm_model: ai.model });
      }));
      const m = mergeParseResults(results);
      const matched = matchPricesToProducts(products, m.prices);
      setRows(products.map((_, i) => ({ price: matched[i], unit_price: matched[i] ? String(matched[i]!.unit_price ?? '') : '', currency: matched[i]?.currency || 'SAR' })));
      setSupplier({ name: m.supplier_name, phone: m.supplier_phone });
      setNotes(m.general_notes);
      setStep(2);
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  const save = async () => {
    if (!supplier.name.trim() && !supplier.phone.trim()) { setErr(t('Enter the supplier name or phone.')); return; }
    const matched = rows.map((r, i) => (parseNumber(r.unit_price) > 0 ? { ...(r.price || { product_index: i, unit_price: 0 }), unit_price: parseNumber(r.unit_price), currency: r.currency || 'SAR' } : null));
    const prices = pricesForProducts(products, matched);
    if (!prices.length) { setErr(t('Enter at least one unit price.')); return; }
    setBusy(true); setErr('');
    try {
      await papi.post(`/v1/rfq-received/${rfq.id}/supplier-replies`, { supplier_name: supplier.name.trim(), supplier_phone: supplier.phone.replace(/\D/g, ''), raw_text: '', prices, run_llm_extraction: false }, { store_id: storeId });
      toast.success(t('Added {{n}} prices to {{code}}', { n: prices.length, code: rfq.code }));
      onAdded();
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  const manual = () => { setRows(products.map(() => ({ price: null, unit_price: '', currency: 'SAR' }))); setStep(2); };

  return (
    <Modal open={open} onClose={onClose} title={t('Add quotation')} width={860}
      footer={step === 1
        ? <><Button variant="ghost" onClick={manual}>{t('Enter prices manually')}</Button><Button variant="primary" icon="layers" loading={busy} onClick={parse}>{t('Extract prices')}</Button></>
        : <><Button variant="ghost" onClick={() => setStep(1)}>{t('Back')}</Button><Button variant="primary" icon="check" loading={busy} onClick={save}>{t('Add prices to RFQ')}</Button></>}>
      <div className="stack">
        {err && <Banner tone="crit">{err}</Banner>}
        {step === 1 ? (
          <>
            <FileDrop files={files} onChange={setFiles} accept={QUOTE_ACCEPT} label={t('Supplier quotation files')} />
            <AiPicker ai={ai} compact />
          </>
        ) : (
          <>
            <div className="grid-2c">
              <Field label={t('Supplier name')}>{(id) => <Input id={id} value={supplier.name} onChange={(e) => setSupplier({ ...supplier, name: e.target.value })} />}</Field>
              <Field label={t('Supplier phone')}>{(id) => <Input id={id} type="tel" className="num" value={supplier.phone} onChange={(e) => setSupplier({ ...supplier, phone: e.target.value })} />}</Field>
            </div>
            {notes && <Banner tone="info">{notes}</Banner>}
            <div className="pr-scroll">
              <table className="pr-table" aria-label={t('Review prices')}>
                <thead><tr><th>#</th><th>{t('Part No.')}</th><th>{t('Product')}</th><th className="r">{t('Qty')}</th><th className="r">{t('Unit price')}</th><th>{t('Currency')}</th><th>{t('Matched')}</th></tr></thead>
                <tbody>{products.map((p, i) => (
                  <tr key={i}>
                    <td className="num">{i + 1}</td><td>{p.part_no || '—'}</td><td><bdi>{p.name}</bdi></td><td className="r num">{p.quantity ?? ''}</td>
                    <td className="r"><Input aria-label={`${t('Unit price')} ${i + 1}`} className="num" inputMode="decimal" style={{ width: 100 }} value={rows[i]?.unit_price ?? ''} onChange={(e) => setRows((r) => r.map((x, j) => (j === i ? { ...x, unit_price: e.target.value } : x)))} /></td>
                    <td><Input aria-label={`${t('Currency')} ${i + 1}`} style={{ width: 70 }} value={rows[i]?.currency ?? 'SAR'} onChange={(e) => setRows((r) => r.map((x, j) => (j === i ? { ...x, currency: e.target.value } : x)))} /></td>
                    <td>{rows[i]?.price ? <Pill tone="good">{t('Matched')}</Pill> : <span className="muted">—</span>}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
