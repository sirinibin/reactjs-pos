import { useCallback, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '@/api/client';
import { useRecord } from '@/api/hooks';
import { useAuth } from '@/auth/AuthContext';
import type { Store } from '@/auth/types';
import { InvoicePaper } from '@/framework/doc/InvoicePaper';
import { Button } from '@/ui/Button';
import { ErrorState, Spinner } from '@/ui/Misc';

/** Invoice titles per document type (sales.md §0.4). */
export const DOC_TITLES: Record<string, [string, string]> = {
  sales: ['Tax invoice', 'فاتورة ضريبية'],
  simplified: ['Simplified tax invoice', 'فاتورة ضريبية مبسطة'],
  sales_return: ['Credit note', 'إشعار دائن'],
  quotation: ['Quotation', 'عرض سعر'],
  delivery_note: ['Delivery note', 'إشعار تسليم'],
  non_vat_invoice: ['Invoice', 'فاتورة'],
  non_vat_sales_return: ['Return invoice', 'فاتورة مرتجع'],
  purchase: ['Purchase invoice', 'فاتورة مشتريات'],
  purchase_return: ['Purchase return', 'مرتجع مشتريات'],
  purchase_order: ['Purchase order', 'أمر شراء'],
  quotation_sales_return: ['Return invoice', 'فاتورة مرتجع'],
  quotation_invoice: ['Invoice', 'فاتورة'],
};

const ENDPOINTS: Record<string, string> = {
  sales: '/v1/order', sales_return: '/v1/sales-return', quotation: '/v1/quotation', delivery_note: '/v1/delivery-note',
  non_vat_invoice: '/v1/non-vat-sales', non_vat_sales_return: '/v1/non-vat-sales-return', purchase: '/v1/purchase', purchase_return: '/v1/purchase-return',
  purchase_order: '/v1/purchase-order', quotation_sales_return: '/v1/quotation-sales-return',
};

/** Purchase documents store prices under purchase_* / purchasereturn_* keys; the paper reads unit_price. */
export function normalisePrices(doc: any): any {
  if (!doc?.products) return doc;
  const products = doc.products.map((p: any) => ({
    ...p,
    unit_price: p.unit_price ?? p.purchasereturn_unit_price ?? p.purchase_unit_price ?? 0,
    unit_price_with_vat: p.unit_price_with_vat ?? p.purchasereturn_unit_price_with_vat ?? p.purchase_unit_price_with_vat ?? 0,
  }));
  return { ...doc, products };
}

export function titlesFor(kind: string, doc: any): [string, string] {
  if (kind === 'sales' && !doc?.vat_no) return DOC_TITLES.simplified;
  if (kind === 'quotation' && doc?.type === 'invoice') return DOC_TITLES.quotation_invoice;
  return DOC_TITLES[kind] || DOC_TITLES.sales;
}

/** VAT hidden on paper: non-VAT docs; quotation invoices / their returns per store settings (sales.md §0.4). */
export function hideVatFor(kind: string, doc: any, settings: Record<string, any> | undefined): boolean {
  if (kind.startsWith('non_vat')) return true;
  if (kind === 'quotation' && doc?.type === 'invoice') return !!(settings?.no_tax_for_quotation_invoice || settings?.hide_quotation_invoice_vat);
  if (kind === 'quotation_sales_return') return !!settings?.no_tax_for_quotation_invoice;
  return false;
}

/** In-app print view: /print/:kind/:id (opens in a new tab, auto-prints). */
export function PrintPage() {
  const { kind = 'sales', id } = useParams();
  const { t } = useTranslation();
  const { store } = useAuth();
  const q = useRecord<any>(ENDPOINTS[kind] || '/v1/order', id);
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);
  useEffect(() => {
    if (ready && q.data) {
      document.title = `${q.data.code} · ${t(titlesFor(kind, q.data)[0])}`;
      const h = setTimeout(() => window.print(), 300);
      return () => clearTimeout(h);
    }
  }, [ready, q.data, kind, t]);
  if (q.isError) return <div className="pad"><ErrorState error={q.error} onRetry={() => q.refetch()} /></div>;
  if (!q.data) return <div className="full-center"><Spinner /></div>;
  const [en, ar] = titlesFor(kind, q.data);
  const isPurchase = kind.startsWith('purchase');
  return (
    <div className="print-page">
      <div className="print-toolbar row" style={{ width: 'min(794px,100%)', justifyContent: 'flex-end' }}>
        <Button variant="ghost" onClick={() => window.close()}>{t('Close')}</Button>
        <Button variant="primary" icon="print" onClick={() => window.print()}>{t('Print')}</Button>
      </div>
      <InvoicePaper doc={normalisePrices(q.data)} store={store} title={en} titleAr={ar} hideVat={hideVatFor(kind, q.data, store?.settings)} partyLabel={isPurchase ? 'Vendor' : 'Bill to'} onReady={onReady} />
    </div>
  );
}

/**
 * Server-side PDF contract: the Go API drives headless Chrome to /invoice-print?key=K,
 * we fetch the one-time payload (no auth), render, then flag body[data-print-ready].
 */
export function ServerInvoicePrint() {
  const [sp] = useSearchParams();
  const key = sp.get('key');
  const [data, setData] = useState<{ model: any; modelName: string; store?: Store } | null>(null);
  const [err, setErr] = useState<unknown>(null);
  useEffect(() => {
    if (!key) { setErr(new Error('Missing key')); return; }
    api.get<any>(`/v1/invoice/print-data/${encodeURIComponent(key)}`).then((r) => {
      const res = r.result || r;
      setData({ model: res.model, modelName: res.modelName || 'sales', store: res.model?.store || res.store });
    }).catch(setErr);
  }, [key]);
  const onReady = useCallback(() => { document.body.dataset.printReady = 'true'; }, []);
  if (err) return <div className="pad"><ErrorState error={err} /></div>;
  if (!data) return null;
  const kind = String(data.modelName || 'sales').replace(/^whatsapp_/, '');
  const [en, ar] = titlesFor(kind, data.model);
  return (
    <div className="print-page" style={{ background: '#fff', padding: 0 }}>
      <InvoicePaper doc={normalisePrices(data.model)} store={data.store || null} title={en} titleAr={ar} hideVat={hideVatFor(kind, data.model, (data.store || data.model?.store)?.settings)} onReady={onReady} />
    </div>
  );
}
