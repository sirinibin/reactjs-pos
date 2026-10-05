import { useEffect, useState } from 'react';
import type { Store } from '@/auth/types';
import { fmtDateTime, fmtMoney } from '@/lib/format';
import { lineTotal, lineTotalWithVat } from './calc';
import { qrSvg, zatcaTlv } from './zatcaQr';

export interface PaperDoc {
  code?: string;
  date?: string;
  products?: any[];
  total?: number;
  vat_price?: number;
  vat_percent?: number;
  net_total?: number;
  discount?: number;
  shipping_handling_fees?: number;
  rounding_amount?: number;
  customer_name?: string;
  vendor_name?: string;
  vat_no?: string;
  phone?: string;
  address?: string;
  remarks?: string;
  zatca?: { qr_code?: string };
  payment_status?: string;
  [k: string]: any;
}

/** A4 bilingual tax invoice (English / Arabic) with ZATCA QR. Used for in-app print and server PDF. */
export function InvoicePaper({ doc, store, title, titleAr, partyLabel = 'Bill to', hideVat, hidePrices, hideQr, terms, onReady }: {
  doc: PaperDoc; store: Store | null; title: string; titleAr: string; partyLabel?: string; hideVat?: boolean;
  /** Quantities only (delivery notes without price details). */ hidePrices?: boolean;
  /** No ZATCA QR (quotations, delivery notes). */ hideQr?: boolean;
  /** Free-text terms block (quotation terms, validity…). */ terms?: React.ReactNode;
  onReady?: () => void;
}) {
  const [qr, setQr] = useState('');
  useEffect(() => {
    let alive = true;
    const text = hideQr ? '' : doc.zatca?.qr_code || (store?.vat_no && !hideVat ? zatcaTlv(store.name, store.vat_no, new Date(doc.date || Date.now()).toISOString(), doc.net_total || 0, doc.vat_price || 0) : '');
    (text ? qrSvg(text) : Promise.resolve('')).then((s) => { if (alive) { setQr(s); onReady?.(); } });
    return () => { alive = false; };
  }, [doc, store, hideVat, hideQr, onReady]);

  const na = store?.national_address || {};
  return (
    <article className="paper" dir="ltr" aria-label={title}>
      <header className="bi" style={{ alignItems: 'flex-start', borderBottom: '2px solid #111', paddingBottom: 14, marginBottom: 14 }}>
        <div>
          {store?.logo && <img src={store.logo} alt="" style={{ maxHeight: 48, marginBottom: 6 }} />}
          <div style={{ fontSize: 18, fontWeight: 700 }}>{store?.name}</div>
          <div style={{ color: '#555', lineHeight: 1.6 }}>
            {[na.building_no, na.street_name, na.district_name, na.city_name, na.zipcode].filter(Boolean).join(', ')}<br />
            {store?.vat_no && <>VAT {store.vat_no}</>}{store?.registration_number && <> · CR {store.registration_number}</>}
          </div>
        </div>
        <div className="ar">
          <div style={{ fontSize: 18, fontWeight: 700 }}>{store?.name_in_arabic}</div>
          <div style={{ color: '#555', lineHeight: 1.6 }}>{[na.street_name_arabic, na.city_name_arabic].filter(Boolean).join('، ')}<br />{store?.vat_no && <>الرقم الضريبي {store.vat_no}</>}</div>
        </div>
      </header>
      <div style={{ textAlign: 'center', marginBottom: 14, fontSize: 16, fontWeight: 700, letterSpacing: '.04em' }}>{title.toUpperCase()} · <span className="ar" style={{ display: 'inline' }}>{titleAr}</span></div>
      <div className="bi" style={{ marginBottom: 14 }}>
        <table style={{ width: '58%' }}><tbody>
          <tr><td style={{ width: '32%', color: '#555' }}>{partyLabel}</td><td><b>{doc.customer_name || doc.vendor_name || '—'}</b>{doc.vat_no && <><br />VAT {doc.vat_no}</>}{doc.phone && <><br />{doc.phone}</>}{doc.address && <><br />{doc.address}</>}</td></tr>
        </tbody></table>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <table><tbody>
            <tr><td style={{ color: '#555' }}>No. · رقم</td><td><b style={{ fontFamily: 'var(--mono)' }}>{doc.code}</b></td></tr>
            <tr><td style={{ color: '#555' }}>Date · التاريخ</td><td>{fmtDateTime(doc.date)}</td></tr>
          </tbody></table>
          {qr && <div style={{ width: 96, height: 96, flex: 'none' }} dangerouslySetInnerHTML={{ __html: qr }} aria-label="ZATCA QR code" role="img" />}
        </div>
      </div>
      <table>
        <thead><tr><th>#</th><th>Description · الوصف</th><th className="r">Qty · الكمية</th>{!hidePrices && <><th className="r">Unit price · سعر الوحدة</th><th className="r">Disc. · خصم</th>{!hideVat && <th className="r">VAT · الضريبة</th>}<th className="r">Amount · المبلغ</th></>}</tr></thead>
        <tbody>
          {(doc.products || []).filter((p) => p.selected !== false).map((p, i) => {
            const amt = lineTotal(p);
            return (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>{p.name}{p.name_in_arabic && <div className="ar" style={{ textAlign: 'start' }}>{p.name_in_arabic}</div>}{p.part_number && <div style={{ color: '#777', fontSize: 10 }}>{p.part_number}</div>}</td>
                <td className="r">{p.quantity} {p.unit}</td>
                {!hidePrices && <>
                <td className="r">{fmtMoney(hideVat ? p.unit_price_with_vat || p.unit_price : p.unit_price)}</td>
                <td className="r">{p.unit_discount ? fmtMoney(p.unit_discount * p.quantity) : '—'}</td>
                {!hideVat && <td className="r">{fmtMoney((amt * (doc.vat_percent ?? 15)) / 100)}</td>}
                <td className="r">{fmtMoney(hideVat ? (p.unit_price_with_vat ? lineTotalWithVat(p) : amt) : (amt * (100 + (doc.vat_percent ?? 15))) / 100)}</td>
                </>}
              </tr>
            );
          })}
        </tbody>
      </table>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, marginTop: 12, alignItems: 'flex-start' }}>
        <div style={{ color: '#555', maxWidth: '50%' }}>{doc.remarks}{terms && <div style={{ marginTop: 8 }}>{terms}</div>}</div>
        {!hidePrices && <table style={{ width: 320 }}><tbody>
          <tr><td>Total excl. VAT · الإجمالي غير شامل الضريبة</td><td className="r">{fmtMoney(doc.total)}</td></tr>
          {!!doc.shipping_handling_fees && <tr><td>Shipping · الشحن</td><td className="r">{fmtMoney(doc.shipping_handling_fees)}</td></tr>}
          {!!doc.discount && <tr><td>Discount · الخصم</td><td className="r">− {fmtMoney(doc.discount)}</td></tr>}
          {!hideVat && <tr><td>VAT {doc.vat_percent ?? 15}% · ضريبة القيمة المضافة</td><td className="r">{fmtMoney(doc.vat_price)}</td></tr>}
          {!!doc.rounding_amount && <tr><td>Rounding · التقريب</td><td className="r">{fmtMoney(doc.rounding_amount)}</td></tr>}
          <tr><td><b>Total · المجموع</b></td><td className="r"><b>SAR {fmtMoney(doc.net_total)}</b></td></tr>
        </tbody></table>}
      </div>
      {!hideVat && !hideQr && <footer style={{ marginTop: 22, color: '#777', fontSize: 10.5, textAlign: 'center' }}>ZATCA-compliant electronic invoice · فاتورة إلكترونية متوافقة مع متطلبات هيئة الزكاة والضريبة والجمارك</footer>}
    </article>
  );
}
