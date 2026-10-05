import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/auth/AuthContext';
import { session } from '@/api/session';
import { bus } from '@/realtime/bus';
import { IconButton } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { fmtRelative } from '@/lib/format';
import { papi } from './api';
import { mergeHistory, normPhone } from './logic';
import './procurement.css';

export interface WaUnread { rfq_id?: string; rfq_code?: string; phone: string; contact_name?: string; phone_type?: string; unread_count: number; last_message_date?: string; last_message_text?: string }
export interface EmailUnread { id: string; subject?: string; from?: string; snippet?: string; message_date?: string; code?: string; unread?: boolean }
const WA_HIST = '_wa_notif_history';
const EM_HIST = '_email_notif_history';

/** Poll every 30 s and refresh on realtime events (topbar counters, §7.7). */
function useUnread<T>(enabled: boolean, path: string, storeId: string | undefined, events: string[]) {
  const [data, setData] = useState<{ items: T[]; total_unread: number } | null>(null);
  const load = useCallback(async () => {
    if (!storeId) return;
    try { const r = await papi.get<{ items: T[] | null; total_unread: number }>(path, { store_id: storeId }); setData({ items: r.items || [], total_unread: r.total_unread || 0 }); } catch { /* counters are best-effort */ }
  }, [path, storeId]);
  useEffect(() => {
    if (!enabled) return;
    load();
    const h = setInterval(load, 30_000);
    const offs = events.map((e) => bus.on(e, () => { load(); }));
    return () => { clearInterval(h); offs.forEach((o) => o()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, load]);
  return { data, load, setData };
}

function usePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', h); document.addEventListener('keydown', k);
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('keydown', k); };
  }, [open]);
  return { open, setOpen, ref };
}

/** Two-tone chime (880 Hz + 1100 Hz) when the unread email total increases. */
function chime() {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    [880, 1100].forEach((f, i) => { const o = ctx.createOscillator(); const g = ctx.createGain(); o.frequency.value = f; g.gain.value = 0.08; o.connect(g); g.connect(ctx.destination); o.start(ctx.currentTime + i * 0.18); o.stop(ctx.currentTime + i * 0.18 + 0.15); });
    setTimeout(() => ctx.close?.(), 800);
  } catch { /* audio blocked */ }
}

export function WhatsAppUnreadButton() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const { store } = useAuth();
  const enabled = !!store?.settings?.enable_rfq_module && !!store?.settings?.enable_ai_rfq_bot;
  const { data, load } = useUnread<WaUnread>(enabled, '/v1/rfq-whatsapp-unread', store?.id, ['wa_unread_changed', 'socket_connection_open']);
  const pop = usePopover();
  const [hist, setHist] = useState<WaUnread[]>(() => session.getJSON<WaUnread[]>(WA_HIST, []));
  useEffect(() => {
    if (!data) return;
    setHist((h) => {
      const next = mergeHistory(h, data.items, (x) => normPhone(x.phone), 100, (x) => ({ ...x, unread_count: 0 }))
        .sort((a, b) => (b.unread_count > 0 ? 1 : 0) - (a.unread_count > 0 ? 1 : 0) || String(b.last_message_date || '').localeCompare(String(a.last_message_date || '')));
      session.setJSON(WA_HIST, next);
      return next;
    });
  }, [data]);
  if (!enabled) return null;
  const total = data?.total_unread || 0;
  return (
    <div style={{ position: 'relative' }} ref={pop.ref}>
      <IconButton icon="wa" label={`${t('WhatsApp notifications')}${total ? ` (${total})` : ''}`} badge={total > 0} onClick={() => pop.setOpen(!pop.open)} aria-expanded={pop.open} />
      {pop.open && (
        <div className="notif on" role="dialog" aria-label={t('WhatsApp notifications')} style={{ position: 'absolute', top: 'calc(100% + 8px)' }}>
          <div className="notif-h"><span>{t('WhatsApp notifications')}</span><span className="spacer" />{hist.length > 0 && <button className="btn gh sm" onClick={() => { setHist([]); session.setJSON(WA_HIST, []); }}>{t('Clear all')}</button>}</div>
          {!hist.length && <div className="empty-state" style={{ padding: 24 }}><Icon name="wa" />{t('No new WhatsApp messages.')}</div>}
          <div style={{ maxHeight: 420, overflow: 'auto' }}>
            {hist.map((n) => (
              <button type="button" key={n.phone} className={`notif-i${n.unread_count > 0 ? ' unread' : ''}`} style={{ width: '100%', textAlign: 'start', border: 0, background: undefined }}
                onClick={() => { pop.setOpen(false); nav(`/procurement/whatsapp?phone=${normPhone(n.phone)}`); setTimeout(load, 1500); }}>
                <span className={`pr-av ${n.phone_type || ''}`} style={{ width: 28, height: 28, fontSize: 11 }}>{(n.contact_name || n.phone || '?').slice(0, 1).toUpperCase()}</span>
                <span style={{ minWidth: 0 }}>
                  <b><bdi>{n.contact_name || `+${normPhone(n.phone)}`}</bdi></b> {n.phone_type && <span className="m">· {t(n.phone_type)}</span>}
                  <div className="m">{n.unread_count > 0 ? (n.rfq_code ? t('{{n}} new messages for {{code}}', { n: n.unread_count, code: n.rfq_code }) : t('{{n}} new messages', { n: n.unread_count })) : t('No new messages')}</div>
                  {n.last_message_text && <div className="m" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.last_message_text}</div>}
                  <div className="m">{fmtRelative(n.last_message_date)}</div>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function EmailUnreadButton() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const { store } = useAuth();
  const s = store?.settings || {};
  const enabled = !!s.enable_ai_rfq_bot && (!!s.rfq_email_connected || (s.rfq_email_accounts?.length || 0) > 0);
  const { data, load } = useUnread<EmailUnread>(enabled, '/v1/email-unread', store?.id, ['email_unread_changed', 'socket_connection_open']);
  const pop = usePopover();
  const prev = useRef<number | null>(null);
  const [hist, setHist] = useState<EmailUnread[]>(() => session.getJSON<EmailUnread[]>(EM_HIST, []));
  useEffect(() => {
    if (!data) return;
    if (prev.current !== null && data.total_unread > prev.current) chime();
    prev.current = data.total_unread;
    setHist((h) => {
      const next = mergeHistory(h, data.items.map((x) => ({ ...x, unread: true })), (x) => x.id, 100, (x) => ({ ...x, unread: false }));
      session.setJSON(EM_HIST, next);
      return next;
    });
  }, [data]);
  if (!enabled) return null;
  const total = data?.total_unread || 0;
  return (
    <div style={{ position: 'relative' }} ref={pop.ref}>
      <IconButton icon="mail" label={`${t('Email notifications')}${total ? ` (${total})` : ''}`} badge={total > 0} onClick={() => pop.setOpen(!pop.open)} aria-expanded={pop.open} />
      {pop.open && (
        <div className="notif on" role="dialog" aria-label={t('Email notifications')} style={{ position: 'absolute', top: 'calc(100% + 8px)' }}>
          <div className="notif-h"><span>{t('Email notifications')}</span><span className="spacer" />{hist.length > 0 && <button className="btn gh sm" onClick={() => { setHist([]); session.setJSON(EM_HIST, []); }}>{t('Clear all')}</button>}</div>
          {!hist.length && <div className="empty-state" style={{ padding: 24 }}><Icon name="mail" />{t('No new emails.')}</div>}
          <div style={{ maxHeight: 420, overflow: 'auto' }}>
            {hist.map((n) => (
              <button type="button" key={n.id} className={`notif-i${n.unread ? ' unread' : ''}`} style={{ width: '100%', textAlign: 'start', border: 0 }}
                onClick={() => { pop.setOpen(false); nav(`/procurement/emails?msg=${n.id}`); setTimeout(load, 1500); }}>
                <Icon name="mail" size="s" />
                <span style={{ minWidth: 0 }}>
                  <b>{n.subject || t('(no subject)')}</b> {n.unread && <span className="tag">{t('New')}</span>}
                  <div className="m"><bdi>{n.from}</bdi></div>
                  {n.snippet && <div className="m" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.snippet}</div>}
                  <div className="m">{fmtRelative(n.message_date)}</div>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
