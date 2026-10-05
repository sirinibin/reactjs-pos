// Normalise the payloads the backend hands to /posting-print and /report-print.
// The legacy client sent pre-paginated `pages`; v2 clients may send flat rows. Accept both.
import { round } from '@/lib/format';

export interface StatementPrintRow {
  no: number;
  date?: string;
  debit_account?: string;
  credit_account?: string;
  debit_amount?: number;
  credit_amount?: number;
  balance_amount?: number;
  reference_code?: string;
  reference_model?: string;
}

export function statementPrintRows(model: any): StatementPrintRow[] {
  if (!model) return [];
  const label = (n?: string, no?: string | number, side?: 'Dr' | 'Cr') => (n ? `${side === 'Dr' ? 'To' : 'By'} ${n} A/c #${no ?? ''} ${side}.` : '');
  if (Array.isArray(model.pages) && model.pages.length) {
    return model.pages.flatMap((p: any) => p.posts || []).filter((r: any) => r && (r.date || r.debit_amount || r.credit_amount)).map((r: any, i: number) => ({
      no: r.no || i + 1,
      date: r.date,
      debit_account: r.debit_account || label(r.debit_account_name, r.debit_account_number, 'Dr'),
      credit_account: r.credit_account || label(r.credit_account_name, r.credit_account_number, 'Cr'),
      debit_amount: Number(r.debit_amount) || 0,
      credit_amount: Number(r.credit_amount) || 0,
      balance_amount: Number(r.balance_amount) || 0,
      reference_code: [r.reference_code, r.reference_code2].filter(Boolean).join(' / '),
      reference_model: r.reference_model,
    }));
  }
  const postings: any[] = model.posts || model.postings || [];
  const out: StatementPrintRow[] = [];
  postings.forEach((p) => (p.posts || []).forEach((post: any) => {
    const dr = post.debit_or_credit === 'debit';
    out.push({
      no: out.length + 1,
      date: post.date || p.date,
      debit_account: dr ? label(post.account_name, post.account_number, 'Dr') : '',
      credit_account: dr ? '' : label(post.account_name, post.account_number, 'Cr'),
      debit_amount: dr ? Number(post.debit) || 0 : 0,
      credit_amount: dr ? 0 : Number(post.credit) || 0,
      balance_amount: Number(post.balance) || 0,
      reference_code: [p.reference_code, post.reference_code].filter(Boolean).join(' / '),
      reference_model: p.reference_model,
    });
  }));
  return out;
}

export interface ReportPrintRow { code?: string; date?: string; party?: string; net_total: number; paid: number; balance: number; payment_status?: string }

export function reportPrintRows(model: any): ReportPrintRow[] {
  if (!model) return [];
  const raw: any[] = Array.isArray(model.pages) && model.pages.length ? model.pages.flatMap((p: any) => p.models || []) : model.models || model.rows || [];
  return raw.filter(Boolean).map((r) => ({
    code: r.code,
    date: r.date,
    party: r.customer_name || r.vendor_name || '',
    net_total: Number(r.net_total) || 0,
    paid: Number(r.total_payment_received) || 0,
    balance: Number(r.balance_amount) || 0,
    payment_status: r.payment_status,
  }));
}

export const sumRows = (rows: ReportPrintRow[]) => rows.reduce((a, r) => ({ net_total: round(a.net_total + r.net_total), paid: round(a.paid + r.paid), balance: round(a.balance + r.balance) }), { net_total: 0, paid: 0, balance: 0 });

export const REPORT_TITLES: Record<string, [string, string]> = {
  sales_report: ['Sales report', 'تقرير المبيعات'],
  sales_return_report: ['Sales return report', 'تقرير مرتجعات المبيعات'],
  purchase_report: ['Purchase report', 'تقرير المشتريات'],
  purchase_return_report: ['Purchase return report', 'تقرير مرتجعات المشتريات'],
  quotation_report: ['Quotation report', 'تقرير عروض الأسعار'],
  quotation_invoice_report: ['Quotation invoice report', 'تقرير فواتير عروض الأسعار'],
  quotation_sales_return_report: ['Quotation sales return report', 'تقرير مرتجعات مبيعات عروض الأسعار'],
  delivery_note_report: ['Delivery note report', 'تقرير إشعارات التسليم'],
};

export const isPurchaseReport = (name: string) => name.startsWith('purchase');
