import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth, useStoreId } from '@/auth/AuthContext';
import type { Store } from '@/auth/types';
import { Button } from '@/ui/Button';
import { ErrorState, Spinner } from '@/ui/Misc';
import { mediaUrl, papi } from '../api';
import type { RFQ } from '../types';
import '../procurement.css';

const pad = (n: number) => String(n).padStart(2, '0');
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** "dd MMM yyyy h:mm a" like the legacy paper. */
export function paperDate(d?: string): string {
  if (!d) return '';
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return '';
  const h = x.getHours() % 12 || 12;
  return `${pad(x.getDate())} ${MON[x.getMonth()]} ${x.getFullYear()} ${h}:${pad(x.getMinutes())} ${x.getHours() < 12 ? 'AM' : 'PM'}`;
}

const addressText = (a: any): string => (!a ? '' : typeof a === 'string' ? a : Object.values(a).filter((v) => typeof v === 'string' && v).join(', '));
const isImage = (u: string) => /\.(png|jpe?g|gif|webp)(\?|$)/i.test(u) || u.startsWith('data:image');

/** Notes like "Brand: Bosch\nSize: 10mm" render as a small two-column table. */
function Notes({ text }: { text?: string }) {
  if (!text) return null;
  const lines = text.split(/\n|;\s*/).map((l) => l.trim()).filter(Boolean);
  const kv = lines.map((l) => /^([^:]{1,40}):\s*(.+)$/.exec(l));
  if (lines.length > 1 && kv.every(Boolean)) {
    return <table style={{ border: 0 }}><tbody>{kv.map((m, i) => <tr key={i}><td style={{ border: 0, padding: '1px 4px', color: '#555' }}>{m![1]}</td><td style={{ border: 0, padding: '1px 4px' }}>{m![2]}</td></tr>)}</tbody></table>;
  }
  return <span className="pr-wrap">{text}</span>;
}

/** A4 RFQ document (shared by preview, in-app print and the headless-Chrome /rfq-print route). */
export function RfqPaper({ rfq, store }: { rfq: RFQ; store?: Store | Record<string, any> | null }) {
  const s: Record<string, any> = store || {};
  const atts = rfq.attachment_urls || [];
  const extra = rfq.additional_attachment_urls || [];
  return (
    <article className="rfq-paper" dir="ltr" lang="en" data-testid="rfq-paper">
      <header className="hd">
        <div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{s.name || s.store_name}</div>
          {s.title && <div>{s.title}</div>}
          <div style={{ color: '#555' }}>{s.registration_number && <>C.R. {s.registration_number} · </>}{s.vat_no && <>VAT {s.vat_no}</>}</div>
        </div>
        {s.logo && <img src={mediaUrl(s.logo)} alt="" />}
        <div className="ar">
          <div style={{ fontSize: 16, fontWeight: 700 }}>{s.name_in_arabic}</div>
          {s.title_in_arabic && <div>{s.title_in_arabic}</div>}
          <div style={{ color: '#555' }}>{s.vat_no && <>الرقم الضريبي {s.vat_no}</>}</div>
        </div>
      </header>
      <div className="banner-t">{s.settings?.rfq_pdf_title || 'REQUEST FOR QUOTATION'} | <span lang="ar" dir="rtl">طلب عرض أسعار</span></div>
      <table><tbody>
        <tr><th style={{ width: 140 }}>RFQ No.</th><td><b>{rfq.code}</b></td><th style={{ width: 90 }}>Date</th><td>{paperDate(rfq.received_at)}</td></tr>
        {rfq.customer_address && <tr><th>Address</th><td colSpan={3}>{rfq.customer_address}</td></tr>}
      </tbody></table>

      {atts.length > 0 ? (
        <div style={{ marginTop: 12 }}>
          {atts.map((u, i) => isImage(u)
            ? <img key={i} className="att" src={mediaUrl(u)} alt={`Attachment ${i + 1}`} />
            : <div key={i} className="box"><h4>Attachment {i + 1}</h4><div><a href={mediaUrl(u)}>{u.split('/').pop()}</a> (included as extra pages in the PDF)</div></div>)}
        </div>
      ) : (
        <table style={{ marginTop: 12 }}>
          <thead><tr><th style={{ width: 34 }}>Sn</th><th style={{ width: 120 }}>Part No</th><th>Name / Description</th><th style={{ width: 50 }} className="r">Qty</th><th style={{ width: 50 }}>Unit</th><th>Notes</th></tr></thead>
          <tbody>
            {(rfq.products || []).map((p, i) => (
              <tr key={i}><td>{i + 1}</td><td>{p.part_no}</td><td>{p.name}{p.name_in_arabic && <div lang="ar" dir="rtl">{p.name_in_arabic}</div>}</td><td style={{ textAlign: 'right' }}>{p.quantity ?? ''}</td><td>{p.unit}</td><td><Notes text={p.notes} /></td></tr>
            ))}
            {!(rfq.products || []).length && <tr><td colSpan={6} style={{ color: '#777' }}>{rfq.text_content || '—'}</td></tr>}
          </tbody>
        </table>
      )}

      {extra.length > 0 && (
        <div className="box"><h4>ADDITIONAL DETAILS</h4><div>
          {extra.map((u, i) => isImage(u)
            ? <img key={i} className="att" src={mediaUrl(u)} alt={rfq.additional_attachment_filenames?.[i] || `File ${i + 1}`} />
            : <div key={i}>• {rfq.additional_attachment_filenames?.[i] || u.split('/').pop()}</div>)}
        </div></div>
      )}
      {rfq.general_instructions && <div className="box"><h4>GENERAL INSTRUCTIONS</h4><div>{rfq.general_instructions}</div></div>}
      <div className="box">
        <h4>QUOTATION SUBMISSION INSTRUCTIONS | <span lang="ar" dir="rtl">تعليمات تقديم عرض الأسعار</span></h4>
        <div>
          Please include the RFQ reference number <span className="code">{rfq.code}</span> in your quotation email, WhatsApp message, or document. This ensures your quotation is matched to the correct request promptly.
          <p dir="rtl" lang="ar" style={{ margin: '6px 0 0', textAlign: 'right' }}>يرجى ذكر رقم الطلب <span className="code">{rfq.code}</span> في بريدكم الإلكتروني أو رسالة واتساب أو وثيقة عرض الأسعار، لضمان مطابقة عرضكم بسرعة مع الطلب الصحيح.</p>
        </div>
      </div>
      <div className="sig">
        <div><b>Prepared By</b><br />{rfq.prepared_by || ''}</div>
        <div><b>Authorized By</b><br />{rfq.authorized_by || ''}</div>
      </div>
      <footer className="ft">
        <span>{addressText(s.national_address)}</span>
        <span>{[s.phone, s.email].filter(Boolean).join(' · ')}</span>
        <span>Generated by StartPOS</span>
      </footer>
    </article>
  );
}

/**
 * Server PDF contract (§5.6, §10.14): headless Chrome opens /rfq-print?key=K, we GET the one-time payload
 * (no auth), render the paper LTR, set document.title=code and, after fonts are ready + 800 ms,
 * flag body[data-print-ready="true"].
 */
export function RfqServerPrint() {
  const [sp] = useSearchParams();
  const key = sp.get('key');
  const [model, setModel] = useState<RFQ | null>(null);
  const [err, setErr] = useState<unknown>(null);
  useEffect(() => { document.documentElement.setAttribute('dir', 'ltr'); }, []);
  useEffect(() => {
    if (!key) { setErr(new Error('No print key provided')); return; }
    papi.get<{ model: RFQ }>(`/v1/rfq/print-data/${encodeURIComponent(key)}`).then((r) => setModel(r.model)).catch(setErr);
  }, [key]);
  useEffect(() => {
    if (!model) return;
    if (model.code) document.title = model.code;
    let h: ReturnType<typeof setTimeout>;
    const mark = () => { h = setTimeout(() => { document.body.dataset.printReady = 'true'; }, 800); };
    const fonts = (document as any).fonts;
    if (fonts?.ready) fonts.ready.then(mark, mark); else mark();
    return () => clearTimeout(h);
  }, [model]);
  if (err) return <div style={{ padding: 20 }}><ErrorState error={err} /></div>;
  if (!model) return null;
  return <div style={{ background: '#fff', minHeight: '100vh' }}><RfqPaper rfq={model} store={model.store} /></div>;
}

/** In-app print view /procurement/rfq/:id/print (opens in a new tab). */
export function RfqPrintView() {
  const { id } = useParams();
  const { t } = useTranslation();
  const { store } = useAuth();
  const storeId = useStoreId();
  const [rfq, setRfq] = useState<RFQ | null>(null);
  const [err, setErr] = useState<unknown>(null);
  useEffect(() => {
    if (!id || !storeId) return;
    papi.get<RFQ>(`/v1/rfq-received/${id}`, { store_id: storeId }).then((r) => { setRfq(r); document.title = r.code; }).catch(setErr);
  }, [id, storeId]);
  if (err) return <div className="pad"><ErrorState error={err} /></div>;
  if (!rfq) return <div className="full-center"><Spinner /></div>;
  return (
    <div className="print-page">
      <div className="print-toolbar row no-print" style={{ width: 'min(794px,100%)', justifyContent: 'flex-end' }}>
        <Button variant="ghost" onClick={() => window.close()}>{t('Close')}</Button>
        <Button variant="primary" icon="print" onClick={() => window.print()}>{t('Print')}</Button>
      </div>
      <RfqPaper rfq={rfq} store={store} />
    </div>
  );
}

/** Download the server-generated PDF (merged attachments) — needs auth, so fetch as a blob. */
export async function downloadRfqPdf(rfq: Pick<RFQ, 'id' | 'code'>, storeId: string) {
  const blob = await papi.blob(`/v1/rfq-received/${rfq.id}/download-pdf`, { store_id: storeId });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${rfq.code}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
