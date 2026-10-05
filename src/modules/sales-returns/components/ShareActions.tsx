import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/auth/AuthContext';
import { ApiError } from '@/api/client';
import { requestDocumentPdf, saveBlob, uploadPdf, whatsappLink } from '@/framework/doc/pdf';
import { Button } from '@/ui/Button';
import { useToast } from '@/ui/Toast';

/** Legacy WhatsApp message noun per model (order/preview.js:1505-1575). */
const NOUN: Record<string, string> = { sales_return: 'Return Invoice', non_vat_sales_return: 'Return Invoice', non_vat_invoice: 'Invoice' };
export const shareMessage = (modelName: string, url: string) => `Hello, here is your ${NOUN[modelName] || 'Invoice'}:\n${url}`;

/** "Download PDF" + "WhatsApp" for a return / non-VAT document (server PDF via /v1/invoice/pdf). */
export function ShareActions({ doc, modelName }: { doc: any; modelName: string }) {
  const { t } = useTranslation();
  const toast = useToast();
  const { store } = useAuth();
  const [busy, setBusy] = useState<'' | 'pdf' | 'wa'>('');
  const fail = (e: unknown) => toast.error(e instanceof ApiError ? e.message : (e as Error).message);

  const download = async () => {
    setBusy('pdf');
    try { saveBlob(await requestDocumentPdf({ doc, modelName, store }), doc.code || modelName); } catch (e) { fail(e); } finally { setBusy(''); }
  };
  const share = async () => {
    const w = window.open('', '_blank'); // opened synchronously so pop-up blockers allow it
    setBusy('wa');
    try {
      const url = await uploadPdf(await requestDocumentPdf({ doc, modelName: `whatsapp_${modelName}`, store }), doc.code || modelName);
      const link = whatsappLink(doc.phone || doc.customer?.phone, shareMessage(modelName, url));
      if (w) w.location.href = link; else window.location.href = link;
    } catch (e) { w?.close(); fail(e); } finally { setBusy(''); }
  };
  return (
    <>
      <Button icon="download" className="hide-sm" loading={busy === 'pdf'} onClick={download}>{t('Download PDF')}</Button>
      <Button icon="wa" className="hide-sm" loading={busy === 'wa'} onClick={share}>{t('WhatsApp')}</Button>
    </>
  );
}
