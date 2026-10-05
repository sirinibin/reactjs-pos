import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '@/api/client';
import { useRecord } from '@/api/hooks';
import { useAuth } from '@/auth/AuthContext';
import type { Store } from '@/auth/types';
import { METHOD_LABEL } from '@/framework/doc/status';
import { Button } from '@/ui/Button';
import { ErrorState, Spinner } from '@/ui/Misc';
import { fmtDateTime, fmtMoney } from '@/lib/format';
import { amountInWords, type MoneyKind } from './logic';
import { MONEY, partyName, partyNameAr } from './money';
import './customers.css';

const METHOD_AR: Record<string, string> = { cash: 'نقدي', debit_card: 'بطاقة مدى', credit_card: 'بطاقة ائتمان', bank_card: 'بطاقة بنكية', bank_transfer: 'تحويل بنكي', bank_cheque: 'شيك', purchase_fund: 'صندوق المشتريات' };

/** A4 bilingual receipt voucher (legacy customer_deposit/previewContent.js). */
export function ReceiptPaper({ doc, store, kind }: { doc: Record<string, any>; store: Store | null; kind: MoneyKind }) {
  const def = MONEY[kind];
  const title: string = store?.settings?.invoice?.[def.receiptTitleKey] || def.receiptTitleFallback;
  const [en, ar] = title.split('|').map((s) => s.trim());
  const na = store?.national_address || {};
  const party = doc.type === 'vendor' ? doc.vendor : doc.customer;
  const pna = party?.national_address || {};
  const payments: any[] = (doc.payments || []).filter((p: any) => !p.deleted);
  const fromLabel = kind === 'receivable' ? ['Received from', 'تم الاستلام من'] : ['Paid to', 'مدفوع إلى'];
  return (
    <article className="paper cu-receipt" dir="ltr" aria-label={en}>
      <header className="bi" style={{ alignItems: 'flex-start', borderBottom: '2px solid #111', paddingBottom: 14, marginBottom: 14 }}>
        <div>
          {store?.logo && <img src={store.logo} alt="" style={{ maxHeight: 48, marginBottom: 6 }} />}
          <div style={{ fontSize: 18, fontWeight: 700 }}>{store?.name}</div>
          <div style={{ color: '#555', lineHeight: 1.6 }}>
            {[na.building_no, na.street_name, na.district_name, na.city_name, na.zipcode].filter(Boolean).join(', ')}<br />
            {store?.vat_no && <>VAT {store.vat_no}</>}{store?.registration_number && <> · CR {store.registration_number}</>}{store?.phone && <> · {store.phone}</>}
          </div>
        </div>
        <div className="ar">
          <div style={{ fontSize: 18, fontWeight: 700 }}>{store?.name_in_arabic}</div>
          <div style={{ color: '#555', lineHeight: 1.6 }}>{[na.street_name_arabic, na.city_name_arabic].filter(Boolean).join('، ')}<br />{store?.vat_no && <>الرقم الضريبي {store.vat_no}</>}</div>
        </div>
      </header>
      <div style={{ textAlign: 'center', marginBottom: 14, fontSize: 16, fontWeight: 700, letterSpacing: '.04em' }}>{en?.toUpperCase()}{ar && <> · <span className="ar" style={{ display: 'inline' }}>{ar}</span></>}</div>
      <table className="cu-r-meta"><tbody>
        <tr><td>Receipt No. | رقم الإيصال</td><td><b style={{ fontFamily: 'var(--mono)' }}>{doc.code}</b></td><td>Receipt Date | تاريخ الإيصال</td><td>{fmtDateTime(doc.date)}</td></tr>
        <tr><td>{fromLabel[0]} | {fromLabel[1]}</td><td colSpan={3}><b>{partyName(doc)}</b>{partyNameAr(doc) && <span className="ar" style={{ display: 'inline', marginInlineStart: 8 }}>{partyNameAr(doc)}</span>}{party?.code && <> · {party.code}</>}</td></tr>
        {(party?.vat_no || party?.registration_number) && <tr><td>VAT | الرقم الضريبي</td><td>{party?.vat_no || '—'}</td><td>C.R | السجل التجاري</td><td>{party?.registration_number || '—'}</td></tr>}
        {(pna.city_name || pna.street_name) && <tr><td>Address | العنوان</td><td colSpan={3}>{[pna.building_no, pna.street_name, pna.district_name, pna.city_name, pna.zipcode].filter(Boolean).join(', ')}</td></tr>}
      </tbody></table>
      <table style={{ marginTop: 14 }}>
        <thead><tr><th>SI No. · رقم</th><th>Date · التاريخ</th><th>Payment Mode · وضع الدفع</th><th>Bank Ref. # · المرجع</th><th>Description · وصف</th><th className="r">Discount · تخفيض</th><th className="r">Amount · المبلغ</th></tr></thead>
        <tbody>
          {payments.map((p, i) => (
            <tr key={p.id || i}>
              <td>{i + 1}</td>
              <td>{fmtDateTime(p.date)}</td>
              <td>{METHOD_LABEL[p.method] || (p.method === 'purchase_fund' ? 'Purchase fund A/c' : p.method)}{METHOD_AR[p.method] && <span className="ar" style={{ display: 'block', textAlign: 'start' }}>{METHOD_AR[p.method]}</span>}</td>
              <td>{p.bank_reference || '—'}</td>
              <td>{[p.invoice_code, p.description].filter(Boolean).join(' · ') || '—'}</td>
              <td className="r">{p.discount ? fmtMoney(p.discount) : '—'}</td>
              <td className="r">{fmtMoney(p.amount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr><td colSpan={6} className="r">Sub Total · المجموع الفرعي</td><td className="r">{fmtMoney(doc.total)}</td></tr>
          {!!doc.total_discount && <tr><td colSpan={6} className="r">Discount · تخفيض</td><td className="r">− {fmtMoney(doc.total_discount)}</td></tr>}
          <tr><td colSpan={6} className="r"><b>Total · الإجمالي</b></td><td className="r"><b>{fmtMoney(doc.net_total)}</b></td></tr>
        </tfoot>
      </table>
      <p style={{ marginTop: 12 }}><b>In Words · بالكلمات:</b> {amountInWords(doc.net_total)}</p>
      {doc.remarks && <p><b>Remarks · ملاحظات:</b> {doc.remarks}</p>}
      <div className="bi" style={{ marginTop: 48 }}>
        <div>{kind === 'receivable' ? 'Received By | تم الاستلام بواسطة' : 'Paid By | دفع بواسطة'}: ______________________</div>
        <div>{doc.created_by_name}</div>
      </div>
    </article>
  );
}

/** In-app print: /sales/receivables/:id/print and /buying/payables/:id/print (opens in a new tab and prints). */
export function ReceiptPrintPage({ kind }: { kind: MoneyKind }) {
  const { id } = useParams();
  const { t } = useTranslation();
  const { store } = useAuth();
  const def = MONEY[kind];
  const q = useRecord<any>(def.endpoint, id);
  useEffect(() => {
    if (!q.data) return;
    document.title = `${q.data.code} · ${t('Receipt')}`;
    const h = setTimeout(() => window.print(), 400);
    return () => clearTimeout(h);
  }, [q.data, t]);
  if (q.isError) return <div className="pad"><ErrorState error={q.error} onRetry={() => q.refetch()} /></div>;
  if (!q.data) return <div className="full-center"><Spinner /></div>;
  return (
    <div className="print-page">
      <div className="print-toolbar row no-print" style={{ width: 'min(794px,100%)', justifyContent: 'flex-end' }}>
        <Button variant="ghost" onClick={() => window.close()}>{t('Close')}</Button>
        <Button variant="primary" icon="print" onClick={() => window.print()}>{t('Print')}</Button>
      </div>
      <ReceiptPaper doc={q.data} store={store} kind={kind} />
    </div>
  );
}
export const ReceivablePrintPage = () => <ReceiptPrintPage kind="receivable" />;
export const PayablePrintPage = () => <ReceiptPrintPage kind="payable" />;

/**
 * Server-side PDF contract (POST /v1/receipt/pdf): the Go API drives headless Chrome to
 * /receipt-print?key=K; we fetch the one-time payload (no auth), render and flag body[data-print-ready].
 */
export function ServerReceiptPrint() {
  const [sp] = useSearchParams();
  const key = sp.get('key');
  const [data, setData] = useState<{ model: any; modelName: string } | null>(null);
  const [err, setErr] = useState<unknown>(null);
  useEffect(() => {
    if (!key) { setErr(new Error('No print key provided')); return; }
    api.get<any>(`/v1/receipt/print-data/${encodeURIComponent(key)}`).then((r) => {
      const res = (r.result || r) as any;
      setData({ model: res.model, modelName: res.modelName || 'customer_deposit' });
    }).catch(setErr);
  }, [key]);
  useEffect(() => {
    if (!data) return;
    let done = false;
    const mark = () => { if (!done) { done = true; setTimeout(() => { document.body.dataset.printReady = 'true'; }, 800); } };
    const fonts = (document as any).fonts;
    if (fonts?.ready) fonts.ready.then(mark, mark); else setTimeout(mark, 1500);
  }, [data]);
  if (err) return <div className="pad"><ErrorState error={err} /></div>;
  if (!data) return null;
  const kind: MoneyKind = /withdrawal|payable/.test(data.modelName) ? 'payable' : 'receivable';
  return (
    <div style={{ background: '#fff' }}>
      <ReceiptPaper doc={data.model} store={data.model?.store || null} kind={kind} />
    </div>
  );
}
