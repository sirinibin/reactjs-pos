import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useStoreId } from '@/auth/AuthContext';
import { Button } from '@/ui/Button';
import { Banner, Spinner } from '@/ui/Misc';
import { Field, Select } from '@/ui/Field';
import { Modal } from '@/ui/Overlay';
import { Pill } from '@/ui/Pill';
import { useToast } from '@/ui/Toast';
import { fmtMoney } from '@/lib/format';
import { papi, pfetch } from '../api';
import { matchPricesToProducts, normPhone, pricesForProducts } from '../logic';
import type { ExtractResult, ProcurementMessage, RFQ, SupplierReplyPrice } from '../types';
import { EXTRACTION_PREFILL_KEY, type ExtractionPrefill } from '../rfq/editor';
import { AiPicker, FileDrop, useAiChoice } from './common';

interface QuoteResult { is_quotation?: boolean; rfq_code?: string; prices?: SupplierReplyPrice[]; price_count?: number; general_notes?: string; suggested_rfq_code?: string; suggested_rfq_id?: string }

/** AI extraction from a procurement message: RFQ mode (→ new RFQ) or supplier-quotation mode (→ prices on an RFQ). */
export function ExtractModal({ msg, open, onClose }: { msg: ProcurementMessage | null; open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const nav = useNavigate();
  const toast = useToast();
  const storeId = useStoreId();
  const ai = useAiChoice();
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [result, setResult] = useState<ExtractResult | null>(null);
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [target, setTarget] = useState('');
  const quotationMode = !!msg?.is_supplier_quotation;
  useEffect(() => { if (open) { setFiles([]); setErr(''); setResult(null); setQuote(null); setRfqs([]); setTarget(''); } }, [open, msg?.id]);
  if (!msg) return null;

  const run = async () => {
    setErr(''); setBusy(true);
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 5 * 60_000);
    try {
      if (quotationMode) {
        const r = await pfetch<QuoteResult>(`/v1/procurement-messages/${msg.id}/extract-quotation`, { method: 'POST', query: { store_id: storeId, llm_provider: ai.provider, llm_model: ai.model }, signal: ac.signal });
        setQuote(r);
        const phone = normPhone(msg.from);
        const list = phone ? (await papi.get<{ items: RFQ[] | null }>('/v1/rfq-received', { store_id: storeId, supplier_phone: phone, limit: 50 })).items || [] : [];
        setRfqs(list);
        setTarget(r.suggested_rfq_id || list[0]?.id || '');
      } else {
        const fd = new FormData();
        fd.append('llm_provider', ai.provider);
        fd.append('llm_model', ai.model);
        fd.append('store_id', storeId);
        files.forEach((f) => fd.append('files', f));
        setResult(await pfetch<ExtractResult>(`/v1/procurement-messages/${msg.id}/extract`, { method: 'POST', body: fd, query: { store_id: storeId }, signal: ac.signal }));
      }
    } catch (e) {
      setErr((e as Error).name === 'AbortError' ? t('Extraction timed out after 5 minutes.') : (e as Error).message);
    } finally { clearTimeout(timer); setBusy(false); }
  };

  const createRfq = () => {
    if (!result) return;
    const pre: ExtractionPrefill = { data: result, msgId: msg.id, msgCode: msg.code };
    sessionStorage.setItem(EXTRACTION_PREFILL_KEY, JSON.stringify(pre));
    onClose();
    nav('/procurement/rfq/new?from=extraction');
  };

  const addPrices = async () => {
    if (!quote?.prices?.length || !target) return;
    setBusy(true); setErr('');
    try {
      const rfq = await papi.get<RFQ>(`/v1/rfq-received/${target}`, { store_id: storeId });
      const prods = rfq.products || [];
      const prices = pricesForProducts(prods, matchPricesToProducts(prods, quote.prices));
      if (!prices.length) { setErr(t('None of the extracted prices could be matched to this RFQ’s items.')); return; }
      await papi.post(`/v1/rfq-received/${rfq.id}/supplier-replies`, { supplier_name: msg.sender_name || msg.from, supplier_phone: normPhone(msg.from), raw_text: '', prices, run_llm_extraction: false }, { store_id: storeId });
      const items = prices.filter((p) => prods[p.product_index]?.product_id).map((p) => ({ product_index: p.product_index, purchase_unit_price: p.unit_price, retail_unit_price: 0, vat_included: !!p.vat_included }));
      if (items.length) await papi.patch(`/v1/rfq-received/${rfq.id}/update-product-prices`, { items }, { store_id: storeId }).catch(() => undefined);
      toast.success(t('Added {{n}} prices to {{code}}', { n: prices.length, code: rfq.code }));
      onClose();
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  const linked = msg.rfq_received_id || msg.linked_rfq_received_id;
  const footer = quotationMode
    ? <><Button variant="ghost" onClick={onClose}>{t('Close')}</Button>{quote ? <Button variant="primary" loading={busy} disabled={!target || !quote.prices?.length} onClick={addPrices}>{t('Add quotation prices to RFQ')}</Button> : <Button variant="primary" icon="layers" loading={busy} onClick={run}>{t('Extract prices')}</Button>}</>
    : <><Button variant="ghost" onClick={onClose}>{t('Close')}</Button>{linked && <Link className="btn" to={`/procurement/rfq/${linked}`} onClick={onClose}>{t('View RFQ')}</Link>}{result ? <Button variant="primary" icon="plus" onClick={createRfq}>{t('Create RFQ')}</Button> : <Button variant="primary" icon="layers" loading={busy} onClick={run}>{t('Extract')}</Button>}</>;

  return (
    <Modal open={open} onClose={onClose} title={quotationMode ? t('Extract supplier quotation') : t('Extract RFQ with AI')} width={820} footer={footer}>
      <div className="stack">
        <Banner tone="info">
          {t('Sending')}: {msg.subject ? <><b>{msg.subject}</b> · </> : null}{t('message text')}{(msg.attachments || []).length ? ` · ${t('{{n}} attachments', { n: msg.attachments!.length })}` : ''}{files.length ? ` · ${t('{{n}} extra files', { n: files.length })}` : ''}
        </Banner>
        {msg.attachment_missing && <Banner tone="warn">{t('Some attachments failed to download. Retry or upload them before extracting.')}</Banner>}
        <AiPicker ai={ai} compact />
        {!quotationMode && !result && <FileDrop files={files} onChange={setFiles} label={t('Extra files (optional)')} accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.xlsx,.xls,.csv,.txt" />}
        {busy && <div className="row"><Spinner /> <span className="muted">{t('Extracting… reasoning models can take 1–3 minutes.')}</span></div>}
        {err && <Banner tone="crit">{err}{/API key|LLM/i.test(err) && <> <Link className="link" to="/procurement/settings?tab=ai" onClick={onClose}>{t('Open AI models settings')}</Link></>}</Banner>}
        {result && (
          <>
            <h3 style={{ margin: 0 }}>{t('Customer')}</h3>
            <dl className="pr-kv">
              <dt>{t('Name')}</dt><dd>{result.customer_name || '—'}</dd><dt>{t('Company')}</dt><dd>{result.customer_company || '—'}</dd>
              <dt>{t('Phone')}</dt><dd className="num">{result.customer_phone || '—'}</dd><dt>{t('Email')}</dt><dd>{result.customer_email || '—'}</dd><dt>{t('VAT')}</dt><dd>{result.customer_vat_no || '—'}</dd>
            </dl>
            <h3 style={{ margin: 0 }}>{t('Products')} <span className="muted num">({(result.products || []).length})</span></h3>
            <div className="pr-scroll"><table className="pr-table" aria-label={t('Extracted products')}>
              <thead><tr><th>#</th><th>{t('Part No.')}</th><th>{t('Name / description')}</th><th className="r">{t('Qty')}</th><th>{t('Unit')}</th><th>{t('Notes')}</th></tr></thead>
              <tbody>{(result.products || []).map((p, i) => <tr key={i}><td>{i + 1}</td><td>{p.part_no}</td><td>{p.name}</td><td className="r num">{p.quantity}</td><td>{p.unit}</td><td>{p.notes}</td></tr>)}</tbody>
            </table></div>
            {result.general_instructions && <Banner tone="info"><b>{t('General instructions')}:</b> {result.general_instructions}</Banner>}
            {result.llm_model && <span className="muted" style={{ fontSize: 12 }}>{t('Model')}: {result.llm_model}</span>}
          </>
        )}
        {quote && (
          <>
            <div className="row">{quote.is_quotation ? <Pill tone="good">{t('Quotation detected')}</Pill> : <Pill tone="warn">{t('Not clearly a quotation')}</Pill>}<span className="muted">{t('{{n}} prices', { n: quote.price_count ?? (quote.prices || []).length })}</span></div>
            <div className="pr-scroll"><table className="pr-table" aria-label={t('Extracted prices')}>
              <thead><tr><th>{t('Part No.')}</th><th>{t('Product')}</th><th className="r">{t('Qty')}</th><th className="r">{t('Unit price')}</th><th>{t('Currency')}</th></tr></thead>
              <tbody>{(quote.prices || []).map((p, i) => <tr key={i}><td>{p.part_no}</td><td>{p.product_name}</td><td className="r num">{p.quantity}</td><td className="r num">{fmtMoney(p.unit_price)}</td><td>{p.currency || 'SAR'}</td></tr>)}</tbody>
            </table></div>
            <Field label={t('Add prices to RFQ')} hint={quote.suggested_rfq_code ? t('Suggested: {{c}}', { c: quote.suggested_rfq_code }) : undefined}>{(id) => (
              <Select id={id} value={target} onChange={(e) => setTarget(e.target.value)} placeholder={t('Select RFQ')}
                options={[...(quote.suggested_rfq_id && !rfqs.some((r) => r.id === quote.suggested_rfq_id) ? [{ value: quote.suggested_rfq_id, label: quote.suggested_rfq_code || quote.suggested_rfq_id }] : []), ...rfqs.map((r) => ({ value: r.id, label: `${r.code} · ${r.customer_name || ''}` }))]} />
            )}</Field>
          </>
        )}
      </div>
    </Modal>
  );
}
