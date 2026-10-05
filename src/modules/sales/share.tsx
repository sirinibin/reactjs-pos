import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/auth/AuthContext';
import { ApiError } from '@/api/client';
import { requestDocumentPdf, saveBlob, uploadPdf, whatsappLink } from '@/framework/doc/pdf';
import { Button, IconButton } from '@/ui/Button';
import { useToast } from '@/ui/Toast';

/** Legacy share message noun per model (sales.md §0.4 WhatsApp share). */
export const SHARE_NOUN: Record<string, string> = {
  sales: 'Invoice',
  quotation: 'Quotation',
  delivery_note: 'Delivery Note',
  quotation_sales_return: 'Return Invoice',
  sales_return: 'Return Invoice',
};

export const shareMessage = (modelName: string, url: string) => `Hello, here is your ${SHARE_NOUN[modelName] || 'Invoice'}:\n${url}`;

/** "Download PDF" + "WhatsApp" buttons for a document view (server PDF via /v1/invoice/pdf). */
export function ShareActions({ doc, modelName, phone, compact }: { doc: any; modelName: string; phone?: string; compact?: boolean }) {
  const { t } = useTranslation();
  const toast = useToast();
  const { store } = useAuth();
  const [busy, setBusy] = useState<'' | 'pdf' | 'wa'>('');
  const err = (e: unknown) => toast.error(e instanceof ApiError ? e.message : (e as Error).message);

  const download = async () => {
    setBusy('pdf');
    try {
      saveBlob(await requestDocumentPdf({ doc, modelName, store }), doc.code || modelName);
    } catch (e) {
      err(e);
    } finally {
      setBusy('');
    }
  };

  const share = async () => {
    // Open the tab synchronously so pop-up blockers allow it, then point it at wa.me.
    const w = window.open('', '_blank');
    setBusy('wa');
    try {
      const blob = await requestDocumentPdf({ doc, modelName: `whatsapp_${modelName}`, store });
      const url = await uploadPdf(blob, `${doc.code || modelName}`);
      const link = whatsappLink(phone ?? doc.phone ?? doc.customer?.phone, shareMessage(modelName, url));
      if (w) w.location.href = link;
      else window.location.href = link;
    } catch (e) {
      w?.close();
      err(e);
    } finally {
      setBusy('');
    }
  };

  // Compact: icon buttons (accessible names kept) so busy record headers don't squeeze the title.
  if (compact) {
    return (
      <>
        <IconButton icon={busy === 'pdf' ? 'clock' : 'download'} label={t('Download PDF')} title={t('Download PDF')} className="hide-sm" disabled={!!busy} aria-busy={busy === 'pdf' || undefined} onClick={download} />
        <IconButton icon={busy === 'wa' ? 'clock' : 'wa'} label={t('WhatsApp')} title={t('WhatsApp')} disabled={!!busy} aria-busy={busy === 'wa' || undefined} onClick={share} />
      </>
    );
  }
  return (
    <>
      <Button icon="download" loading={busy === 'pdf'} onClick={download}>{t('Download PDF')}</Button>
      <Button icon="wa" loading={busy === 'wa'} onClick={share}>{t('WhatsApp')}</Button>
    </>
  );
}
