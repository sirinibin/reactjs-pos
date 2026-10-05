import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/ui/Icon';
import { IconButton } from '@/ui/Button';
import { useToast } from '@/ui/Toast';
import { fmtDateTime } from '@/lib/format';
import { mediaUrl, papi } from '../api';
import { fmtBytes, stripHtml } from '../logic';
import type { Attachment, ProcurementMessage } from '../types';

export function Attachments({ list }: { list?: Attachment[] }) {
  if (!list?.length) return null;
  return (
    <ul className="pr-files">
      {list.map((a, i) => (
        <li key={i}><Icon name="paper" size="s" /><a className="link" href={mediaUrl(a.url)} target="_blank" rel="noopener noreferrer"><bdi>{a.filename || a.url?.split('/').pop()}</bdi></a><span className="muted num">{fmtBytes(a.size)}</span></li>
      ))}
    </ul>
  );
}

/** Media/text body of a WhatsApp message by wa_message_type. */
export function WaBody({ m }: { m: ProcurementMessage }) {
  const { t } = useTranslation();
  const a = m.attachments?.[0];
  const url = mediaUrl(a?.url);
  const text = m.body_text || '';
  let media = null;
  if (m.wa_message_type === 'image' && url) media = <a href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt={a?.filename || t('Image')} loading="lazy" /></a>;
  else if (m.wa_message_type === 'audio' && url) media = <audio controls src={url} style={{ maxWidth: '100%' }} />;
  else if (m.wa_message_type === 'video' && url) media = <video controls src={url} style={{ maxWidth: '100%', maxHeight: 260 }} />;
  else if (m.wa_message_type === 'document' && url) media = <a className="row link" href={url} target="_blank" rel="noopener noreferrer"><Icon name="file" size="s" /><bdi>{a?.filename || t('Document')}</bdi></a>;
  else if (m.wa_message_type && m.wa_message_type !== 'text' && !url) media = <span className="muted">({t('media message')}){m.attachment_missing ? ` · ${t('download failed')}` : ''}</span>;
  return <>{media}{text && <div className="pr-wrap">{text}</div>}</>;
}

/** One chat bubble with Copy / Translate / extra actions. */
export function Bubble({ m, kind, actions }: { m: ProcurementMessage; kind: 'whatsapp' | 'email'; actions?: React.ReactNode }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [tr, setTr] = useState('');
  const [busy, setBusy] = useState(false);
  const text = kind === 'email' ? m.body_text || stripHtml(m.body_html) : m.body_text || '';
  const translate = async () => {
    setBusy(true);
    try { const r = await papi.post<{ translatedText: string }>('/v1/translate', { text, target: 'en' }); setTr(r.translatedText || ''); }
    catch (e) { toast.error(`${t('Translation failed')}: ${(e as Error).message}`); } finally { setBusy(false); }
  };
  return (
    <div className={`pr-bub${m.direction === 'out' ? ' out' : ''}`} data-testid="bubble">
      {kind === 'email' && m.subject && <b style={{ display: 'block', marginBottom: 4 }}>{m.subject}</b>}
      {kind === 'whatsapp' ? <WaBody m={m} /> : <div className="pr-wrap" style={{ maxHeight: 280, overflow: 'auto' }}>{text}</div>}
      {kind === 'email' && <Attachments list={m.attachments} />}
      {tr && <div className="pr-wrap muted" style={{ borderTop: '1px solid var(--border)', marginTop: 6, paddingTop: 6 }}>{tr}</div>}
      <div className="m">
        <span className="num">{fmtDateTime(m.message_date || m.created_at)}</span>
        {m.code && <span className="mono">{m.code}</span>}
        {m.direction === 'out' && <span>{t('You sent')}</span>}
        {m.processed_as_rfq && m.rfq_received_code && <span className="tag">{m.rfq_received_code}</span>}
        {m.is_supplier_quotation && <span className="tag">{t('Quotation')}{m.linked_rfq_received_code ? ` · ${m.linked_rfq_received_code}` : ''}</span>}
      </div>
      <div className="acts">
        {text && <IconButton icon="copy" label={t('Copy')} onClick={() => navigator.clipboard?.writeText(text).then(() => toast.success(t('Copied')), () => undefined)} />}
        {text && <IconButton icon="globe" label={t('Translate')} disabled={busy} onClick={translate} />}
        {actions}
      </div>
    </div>
  );
}

/** "A" initials avatar coloured by sender type. */
export function Avatar({ name, type }: { name?: string; type?: string }) {
  const ini = (name || '?').replace(/[^\p{L}\p{N} ]/gu, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '#';
  return <span className={`pr-av ${type || ''}`} aria-hidden>{ini}</span>;
}
