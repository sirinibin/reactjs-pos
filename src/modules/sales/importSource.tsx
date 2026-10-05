import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import type { DocState } from '@/framework/doc/DocumentEditor';
import { AsyncPicker, type PickerOption } from '@/ui/AsyncPicker';
import { Button } from '@/ui/Button';
import { Banner, useConfirm } from '@/ui/Misc';
import { Modal } from '@/ui/Overlay';
import { fmtDate, fmtMoney } from '@/lib/format';

type Kind = 'quotation' | 'delivery_note';
const ENDPOINT: Record<Kind, string> = { quotation: '/v1/quotation', delivery_note: '/v1/delivery-note' };
const PARAM: Record<Kind, string> = { quotation: 'quotation_id', delivery_note: 'delivery_note_id' };
const VIEW: Record<Kind, string> = { quotation: '/sales/quotations', delivery_note: '/sales/delivery-notes' };

/** Search not-yet-invoiced quotations / delivery notes (optionally for one customer). */
export async function searchSourceDocs(kind: Kind, storeId: string, q: string, customerId: string | null, signal?: AbortSignal): Promise<PickerOption[]> {
  const search: Record<string, string> = { store_id: storeId, invoiced: '0' };
  if (q.trim()) search.code = q.trim();
  if (customerId) search.customer_id = customerId;
  if (kind === 'quotation') search.type = 'quotation';
  const r = await api.get<any[]>(ENDPOINT[kind], { search, limit: 20, sort: '-created_at', select: 'id,code,date,customer_name,net_total' }, signal);
  return (r.result || []).map((d) => ({ id: d.id, label: d.code, sub: [d.customer_name, fmtDate(d.date)].filter(Boolean).join(' · '), right: fmtMoney(d.net_total), data: d }));
}

/**
 * Shown in the invoice header: where this draft came from (quotation / delivery note / repair job),
 * and — on a new invoice — buttons to start it from a quotation or a delivery note.
 */
export function InvoiceSource({ s, isNew }: { s: DocState; isNew: boolean }) {
  const { t } = useTranslation();
  const nav = useNavigate();
  const { store, can } = useAuth();
  const [pick, setPick] = useState<Kind | null>(null);
  const [confirmEl, ask] = useConfirm();
  const src = s.extra._source as { kind: string; id?: string; code?: string; invoicedAs?: string | null } | undefined;
  const qCode = s.extra.quotation_code || (src?.kind === 'quotation' ? src.code : '');

  const choose = async (kind: Kind, o: PickerOption | null) => {
    if (!o) return;
    setPick(null);
    if (s.lines.length && !(await ask(t('Replace the current items?'), { body: t('Starting from another document replaces the items on this draft.'), confirmLabel: t('Replace') }))) return;
    nav(`/sales/invoices/new?${PARAM[kind]}=${o.id}`);
  };

  const canQuotes = can('quotations', 'read');
  const canDn = can('delivery_notes', 'read');
  return (
    <div className="span2 stack" style={{ gap: 8 }}>
      {src?.kind === 'quotation' || qCode ? (
        <Banner tone="info" icon="clip">
          {t('From quotation')} {s.extra.quotation_id ? <Link className="link mono" to={`${VIEW.quotation}/${s.extra.quotation_id}`}>{qCode}</Link> : <span className="mono">{qCode}</span>}
          {src?.invoicedAs && <> — <b>{t('already invoiced as {{code}}', { code: src.invoicedAs })}</b></>}
        </Banner>
      ) : null}
      {s.extra.delivery_note_id && (
        <Banner tone="info" icon="truck">
          {t('From delivery note')} <Link className="link mono" to={`${VIEW.delivery_note}/${s.extra.delivery_note_id}`}>{src?.kind === 'delivery_note' ? src.code : t('View')}</Link>
          {src?.kind === 'delivery_note' && src.invoicedAs && <> — <b>{t('already invoiced as {{code}}', { code: src.invoicedAs })}</b></>}
        </Banner>
      )}
      {src?.kind === 'repair_job' && <Banner tone="info" icon="wrench">{t('From workshop job card')}</Banner>}
      {isNew && !src && !s.extra.quotation_id && !s.extra.delivery_note_id && (canQuotes || canDn) && (
        <div className="row" style={{ gap: 8 }}>
          {canQuotes && <Button size="sm" variant="ghost" icon="clip" onClick={() => setPick('quotation')}>{t('Import from quotation')}</Button>}
          {canDn && <Button size="sm" variant="ghost" icon="truck" onClick={() => setPick('delivery_note')}>{t('Import from delivery note')}</Button>}
        </div>
      )}
      <Modal open={!!pick} onClose={() => setPick(null)} title={t(pick === 'delivery_note' ? 'Import from delivery note' : 'Import from quotation')} width={520}>
        {pick && (
          <div className="stack" style={{ gap: 10 }}>
            <div className="hint">{s.party?.data?.id ? t('Showing documents of the selected customer that are not invoiced yet.') : t('Showing documents that are not invoiced yet.')}</div>
            <AsyncPicker value={null} eager autoFocus aria-label={t('Document')} placeholder={t('Search by number…')}
              load={(q, sig) => searchSourceDocs(pick, store?.id || '', q, s.party?.data?.id || null, sig)}
              onChange={(o) => choose(pick, o)} />
          </div>
        )}
      </Modal>
      {confirmEl}
    </div>
  );
}
