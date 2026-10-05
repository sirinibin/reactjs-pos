import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '@/api/client';
import { session } from '@/api/session';
import { useAuth } from '@/auth/AuthContext';
import { Icon } from '@/ui/Icon';
import { IconButton } from '@/ui/Button';
import { bus } from '@/realtime/bus';
import { fmtRelative } from '@/lib/format';

interface Note { id: string; kind: 'dn' | 'pr'; title: string; sub?: string; at?: string; path: string; key: string }

const DN_DISMISSED = 'dn_dismissed';
const PR_DISMISSED = 'dismissed_pr_ids';

/** Bell: delivery-note reminders + purchase-request updates (admin.md §3.3). */
export function NotificationBell() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const { store, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const settings = store?.settings || {};
  const storeId = store?.id;
  const enabled = settings.enable_notification === true || settings.enable_purchase_request_module === true;

  const add = useCallback((n: Note[]) => setNotes((cur) => {
    const map = new Map(cur.map((x) => [x.key, x]));
    n.forEach((x) => map.set(x.key, x));
    return Array.from(map.values()).sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')));
  }), []);

  const load = useCallback(async () => {
    if (!storeId) return;
    const dismissedDn = session.getJSON<Record<string, string>>(DN_DISMISSED, {});
    const dismissedPr = new Set(session.getJSON<string[]>(PR_DISMISSED, []));
    try {
      const r = await api.get<any[]>('/v1/delivery-note/reminders', { search: { store_id: storeId } });
      add((r.result || []).filter((d) => dismissedDn[d.id] !== d.notify_at).map((d) => ({
        id: d.id, kind: 'dn' as const, key: `dn:${d.id}`, title: t('Create sales for delivery note {{code}}', { code: d.code }), at: d.notify_at, sub: d.notify_at, path: `/sales/delivery-notes/${d.id}`,
      })));
    } catch { /* reminders are optional */ }
    if (settings.enable_purchase_request_module && user?.id) {
      const q = (s: Record<string, string>) => api.get<any[]>('/v1/purchase-request', { search: { store_id: storeId, limit: '20', ...s } } as any).then((r) => r.result || []).catch(() => []);
      const [recv, acc, rej] = await Promise.all([
        q({ assigned_to: user.id, status: 'pending' }), q({ created_by: user.id, status: 'accepted' }), q({ created_by: user.id, status: 'rejected' }),
      ]);
      const mk = (list: any[], label: string) => list.filter((p) => !dismissedPr.has(p.id)).map((p) => ({
        id: p.id, kind: 'pr' as const, key: `pr:${p.id}:${label}`, title: t(label, { code: p.code }), at: p.updated_at || p.created_at, path: `/buying/requests/${p.id}`,
      }));
      add([...mk(recv, 'Purchase request received: {{code}}'), ...mk(acc, 'Purchase request accepted: {{code}}'), ...mk(rej, 'Purchase request rejected: {{code}}')]);
    }
  }, [storeId, user?.id, settings.enable_purchase_request_module, add, t]);

  useEffect(() => {
    if (!enabled) return;
    load();
    const offs = [
      bus.on('socket_connection_open', load),
      bus.on('delivery_note_reminder', (d) => d?.id && add([{ id: d.id, kind: 'dn', key: `dn:${d.id}`, title: t('Create sales for delivery note {{code}}', { code: d.code }), at: d.notify_at, path: `/sales/delivery-notes/${d.id}` }])),
      bus.on('delivery_note_order_linked', (d) => setNotes((n) => n.filter((x) => x.key !== `dn:${d?.delivery_note_id}`))),
      bus.on('purchase_request_received', (d) => add([{ id: d?.id || d?.purchase_request_id, kind: 'pr', key: `pr:${d?.id || d?.purchase_request_id}:recv`, title: t('Purchase request received: {{code}}', { code: d?.code }), at: new Date().toISOString(), path: `/buying/requests/${d?.id || d?.purchase_request_id}` }])),
      bus.on('purchase_request_status_changed', (d) => add([{ id: d?.id || d?.purchase_request_id, kind: 'pr', key: `pr:${d?.id || d?.purchase_request_id}:${d?.status}`, title: t('Purchase request {{status}}: {{code}}', { status: t(d?.status || ''), code: d?.code }), at: new Date().toISOString(), path: `/buying/requests/${d?.id || d?.purchase_request_id}` }])),
      bus.on('purchase_request_po_created', (d) => add([{ id: d?.id || d?.purchase_request_id, kind: 'pr', key: `pr:${d?.id || d?.purchase_request_id}:po`, title: t('Purchase order created from request {{code}}', { code: d?.code }), at: new Date().toISOString(), path: '/buying/orders' }])),
    ];
    return () => offs.forEach((o) => o());
  }, [enabled, load, add, t]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const dismiss = (n: Note) => {
    setNotes((x) => x.filter((y) => y.key !== n.key));
    if (n.kind === 'dn') session.setJSON(DN_DISMISSED, { ...session.getJSON<Record<string, string>>(DN_DISMISSED, {}), [n.id]: n.at || '' });
    else session.setJSON(PR_DISMISSED, [...session.getJSON<string[]>(PR_DISMISSED, []), n.id]);
  };

  if (!enabled) return null;
  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <IconButton icon="bell" label={`${t('Notifications')}${notes.length ? ` (${notes.length})` : ''}`} badge={notes.length > 0} onClick={() => setOpen((o) => !o)} aria-expanded={open} />
      {open && (
        <div className="notif on" role="dialog" aria-label={t('Notifications')} style={{ position: 'absolute', top: 'calc(100% + 8px)' }}>
          <div className="notif-h"><span>{t('Notifications')}</span><span className="spacer" />{notes.length > 0 && <button className="btn gh sm" onClick={() => notes.forEach(dismiss)}>{t('Clear all')}</button>}</div>
          {notes.length === 0 && <div className="empty-state" style={{ padding: 24 }}><Icon name="bell" />{t('You’re all caught up.')}</div>}
          {notes.map((n) => (
            <div className="notif-i" key={n.key}>
              <span className={`pill ${n.kind === 'dn' ? 'info' : 'warn'}`} style={{ padding: 5 }}><Icon name={n.kind === 'dn' ? 'truck' : 'clip'} /></span>
              <div className="row" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
                <button className="link" style={{ textAlign: 'start', flex: 1 }} onClick={() => { setOpen(false); nav(n.path); }}>
                  <b>{n.title}</b>{n.at && <div className="m">{fmtRelative(n.at)}</div>}
                </button>
                <IconButton icon="x" label={t('Dismiss')} onClick={() => dismiss(n)} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
