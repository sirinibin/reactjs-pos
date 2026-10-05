import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '@/api/client';
import { ErrorState, Spinner } from '@/ui/Misc';
import { fmtDate, fmtMoney } from '@/lib/format';
import { titleCase } from './logic';
import { isPurchaseReport, REPORT_TITLES, reportPrintRows, statementPrintRows, sumRows } from './printModel';
import './finance.css';

interface PrintPayload { model: any; modelName: string; fontSizes?: Record<string, any> }

/** Fetch the one-time payload stored by POST /v1/{posting|report}/pdf (no auth; 404 once expired). */
function usePrintPayload(kind: 'posting' | 'report') {
  const [sp] = useSearchParams();
  const key = sp.get('key');
  const [data, setData] = useState<PrintPayload | null>(null);
  const [err, setErr] = useState<unknown>(null);
  useEffect(() => {
    if (!key) { setErr(new Error('No print key provided')); return; }
    api.get<any>(`/v1/${kind}/print-data/${encodeURIComponent(key)}`, undefined).then((r: any) => {
      // The handler returns the raw object {model, modelName, fontSizes} (no envelope).
      const res = r.result || r;
      if (!res?.model) throw new Error('Print data not found or expired');
      setData({ model: res.model, modelName: res.modelName || '', fontSizes: res.fontSizes || {} });
    }).catch(setErr);
  }, [key, kind]);
  return { data, err };
}

/** Headless Chrome waits for body[data-print-ready="true"] — set it once fonts are in (+800 ms like v1). */
function usePrintReady(ready: boolean) {
  useEffect(() => {
    if (!ready) return;
    let done = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const mark = () => { if (!done) { done = true; timer = setTimeout(() => { document.body.dataset.printReady = 'true'; }, 800); } };
    const fonts = (document as any).fonts;
    if (fonts?.ready) fonts.ready.then(mark, mark);
    else mark();
    return () => { if (timer) clearTimeout(timer); };
  }, [ready]);
}

function StoreHeader({ store, titleEn, titleAr }: { store: any; titleEn: string; titleAr: string }) {
  return (
    <div className="hd">
      <div>
        <h2>{store?.name || ''}</h2>
        <div>{[store?.vat_no && `VAT ${store.vat_no}`, store?.registration_number && `C.R. ${store.registration_number}`].filter(Boolean).join(' · ')}</div>
        <div><b>{titleEn}</b></div>
      </div>
      <div className="ar">
        <h2>{store?.name_in_arabic || store?.store_name_in_arabic || ''}</h2>
        <div><b>{titleAr}</b></div>
      </div>
    </div>
  );
}

const PrintShell = ({ children }: { children: React.ReactNode }) => (
  <div style={{ background: '#fff', minHeight: '100vh' }} dir="ltr">
    <style>{'html,body{margin:0!important;padding:0!important;background:#fff} @page{size:A4;margin:0}'}</style>
    {children}
  </div>
);

/** /posting-print?key=… — account statement rendered for the server-side PDF. */
export function PostingPrintPage() {
  const { data, err } = usePrintPayload('posting');
  usePrintReady(!!data);
  if (err) return <div className="pad"><ErrorState error={err} /></div>;
  if (!data) return <div className="full-center"><Spinner /></div>;
  const m = data.model;
  const rows = statementPrintRows(m);
  const party = m.customer || m.vendor;
  const range = m.dateValue ? fmtDate(m.dateValue) : m.fromDateValue || m.toDateValue ? `${m.fromDateValue ? fmtDate(m.fromDateValue) : '…'} → ${m.toDateValue ? fmtDate(m.toDateValue) : fmtDate(new Date())}` : '';
  const dBD = Number(m.debitBalanceBoughtDown) || 0, cBD = Number(m.creditBalanceBoughtDown) || 0;
  const dTot = Number(m.debitTotal) || 0, cTot = Number(m.creditTotal) || 0;
  return (
    <PrintShell>
      <div className="fin-paper" data-testid="posting-paper">
        <StoreHeader store={m.store} titleEn="Account statement" titleAr="كشف حساب" />
        <div className="meta">
          <div>Account: <b>{m.name}</b>{m.name_arabic ? ` | ${m.name_arabic}` : ''} (#{m.number})</div>
          {range && <div>Date: <b>{range}</b></div>}
          {party && <div>{m.customer ? 'Customer' : 'Vendor'}: <b>{party.name}</b>{party.vat_no ? ` · VAT ${party.vat_no}` : ''}</div>}
          {party?.address && <div>Address: {party.address}</div>}
        </div>
        <table>
          <thead><tr><th>Sn.</th><th>Date</th><th>Type</th><th>ID</th><th className="r">Debit</th><th className="r">Credit</th><th className="r">Balance</th></tr></thead>
          <tbody>
            {!m.ignoreOpeningBalance && (dBD > 0 || cBD > 0) && (
              <tr><td /><td colSpan={3}><b>{dBD > 0 ? 'To Opening Balance' : 'By Opening Balance'}</b></td><td className="r">{dBD > 0 ? fmtMoney(dBD) : ''}</td><td className="r">{cBD > 0 ? fmtMoney(cBD) : ''}</td><td /></tr>
            )}
            {rows.map((r) => (
              <tr key={r.no}>
                <td>{r.no}</td><td>{fmtDate(r.date)}</td><td>{titleCase(r.reference_model)}</td><td>{r.reference_code}</td>
                <td className="r">{r.debit_amount ? <>{fmtMoney(r.debit_amount)}<div style={{ fontSize: 10, color: '#555' }}>{r.debit_account}</div></> : ''}</td>
                <td className="r">{r.credit_amount ? <>{fmtMoney(r.credit_amount)}<div style={{ fontSize: 10, color: '#555' }}>{r.credit_account}</div></> : ''}</td>
                <td className="r">{fmtMoney(r.balance_amount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="tot"><td colSpan={4}>Amount</td><td className="r">{fmtMoney(dTot)}</td><td className="r">{fmtMoney(cTot)}</td><td /></tr>
            <tr className="tot"><td colSpan={4}>Due Amount</td><td className="r">{m.debitBalance > 0 ? `To Closing Balance ${fmtMoney(m.debitBalance)}` : ''}</td><td className="r">{m.creditBalance > 0 ? `By Closing Balance ${fmtMoney(m.creditBalance)}` : ''}</td><td /></tr>
            <tr className="tot"><td colSpan={4}>Total Amount</td><td className="r">{fmtMoney(Math.max(dTot, cTot))}</td><td className="r">{fmtMoney(Math.max(dTot, cTot))}</td><td /></tr>
          </tfoot>
        </table>
      </div>
    </PrintShell>
  );
}

/** /report-print?key=… — sales/purchase list report rendered for the server-side PDF. */
export function ReportPrintPage() {
  const { data, err } = usePrintPayload('report');
  usePrintReady(!!data);
  if (err) return <div className="pad"><ErrorState error={err} /></div>;
  if (!data) return <div className="full-center"><Spinner /></div>;
  const m = data.model;
  const name = data.modelName || 'sales_report';
  const [en, ar] = REPORT_TITLES[name] || [titleCase(name), ''];
  const rows = reportPrintRows(m);
  const tot = sumRows(rows);
  const party = isPurchaseReport(name) ? m.vendor : m.customer;
  return (
    <PrintShell>
      <div className="fin-paper" data-testid="report-paper">
        <StoreHeader store={m.store} titleEn={en} titleAr={ar} />
        <div className="meta">
          {m.dateStr && <div>Date: <b>{m.dateStr}</b></div>}
          {party && <div>{isPurchaseReport(name) ? 'Vendor' : 'Customer'}: <b>{party.name}</b>{party.vat_no ? ` · VAT ${party.vat_no}` : ''}</div>}
        </div>
        <table>
          <thead><tr><th>Sn.</th><th>Date</th><th>ID</th><th>{isPurchaseReport(name) ? 'Vendor' : 'Customer'}</th><th className="r">Net Total</th><th className="r">Amount Paid</th><th className="r">Credit Balance</th><th>Payment Status</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={`${r.code}-${i}`}><td>{i + 1}</td><td>{fmtDate(r.date)}</td><td>{r.code}</td><td>{r.party}</td><td className="r">{fmtMoney(r.net_total)}</td><td className="r">{fmtMoney(r.paid)}</td><td className="r">{fmtMoney(r.balance)}</td><td>{titleCase(r.payment_status)}</td></tr>
            ))}
          </tbody>
          <tfoot><tr className="tot"><td colSpan={4}>Total</td><td className="r">{fmtMoney(tot.net_total)}</td><td className="r">{fmtMoney(tot.paid)}</td><td className="r">{fmtMoney(tot.balance)}</td><td /></tr></tfoot>
        </table>
      </div>
    </PrintShell>
  );
}
