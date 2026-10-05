import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/ui/Card';
import { Button } from '@/ui/Button';
import { Field, Input } from '@/ui/Field';
import { Banner, Spinner, useConfirm } from '@/ui/Misc';
import { Pill } from '@/ui/Pill';
import { useToast } from '@/ui/Toast';
import { rawJson } from '../components/kit';

interface WaStatus { connected?: boolean; phone?: string; instance_name?: string; status?: string }

/** Evolution-API WhatsApp connection for a store (spec §9.4): connect → QR polling → connected. */
export function WhatsAppPanel({ storeId, storeName, instance, onChanged }: { storeId: string; storeName: string; instance?: string; onChanged: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [confirmEl, ask] = useConfirm();
  const [status, setStatus] = useState<WaStatus | null>(null);
  const [statusErr, setStatusErr] = useState('');
  const [contacts, setContacts] = useState<number | null>(null);
  const [phone, setPhone] = useState('');
  const [qr, setQr] = useState<{ base64?: string; count?: number } | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [busy, setBusy] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const q = `store_id=${encodeURIComponent(storeId)}`;

  const loadStatus = async () => {
    try {
      const s = await rawJson<WaStatus>(`/v1/whatsapp/status?${q}`);
      setStatus(s);
      setStatusErr('');
      if (s.connected) rawJson<{ count: number }>(`/v1/whatsapp/contacts-count?${q}`).then((c) => setContacts(c.count ?? 0)).catch(() => setContacts(null));
      return s;
    } catch (e) {
      setStatusErr((e as Error).message);
      return null;
    }
  };

  useEffect(() => {
    if (instance) loadStatus();
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, instance]);

  const poll = () => {
    const tick = async () => {
      const s = await loadStatus();
      if (s?.connected) {
        setConnecting(false);
        setQr(null);
        toast.success(t('WhatsApp connected successfully!'));
        onChanged();
        return;
      }
      try {
        const r = await rawJson<{ base64?: string; count?: number }>(`/v1/whatsapp/qr?${q}`);
        setQr((cur) => (cur?.count === r.count && cur?.base64 ? cur : r));
      } catch { /* QR not ready yet */ }
      timer.current = setTimeout(tick, 3000);
    };
    timer.current = setTimeout(tick, 4000);
  };

  const connect = async () => {
    setConnecting(true);
    try {
      await rawJson('/v1/whatsapp/connect', { method: 'POST', body: { store_id: storeId, phone: phone.trim() } });
      poll();
    } catch (e) {
      setConnecting(false);
      toast.error((e as Error).message);
    }
  };
  const cancel = () => { clearTimeout(timer.current); setConnecting(false); setQr(null); };

  const act = async (key: string, fn: () => Promise<unknown>, ok?: (r: any) => string) => {
    setBusy(key);
    try {
      const r = await fn();
      if (ok) toast.success(ok(r));
      await loadStatus();
      onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy('');
    }
  };

  const disconnect = async () => {
    if (!(await ask(t('Disconnect WhatsApp from “{{name}}”?', { name: storeName }), { danger: true, confirmLabel: t('Disconnect'), body: t('This deletes the Evolution API instance.') }))) return;
    act('disconnect', () => rawJson(`/v1/whatsapp/disconnect?${q}`, { method: 'DELETE' }), () => t('WhatsApp disconnected'));
  };
  const clearContacts = async () => {
    if (!(await ask(t('Clear synced contacts?'), { danger: true, confirmLabel: t('Clear') }))) return;
    act('clear', () => rawJson(`/v1/whatsapp/contacts?${q}`, { method: 'DELETE' }), () => t('Contacts cleared'));
  };

  return (
    <Card title={t('Connection')} actions={status?.connected ? <Pill tone="good" icon="wa">{t('Connected')}{status.phone ? ` · ${status.phone}` : ''}</Pill> : instance ? <Pill tone="neutral" icon="wa">{t('Not connected')}</Pill> : undefined}>
      <div className="stack">
        {statusErr && <Banner tone="warn">{t('Couldn’t reach the WhatsApp service.')} {statusErr}</Banner>}
        {status?.connected ? (
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span>{contacts === null ? '—' : t('{{n}} contacts', { n: contacts })}</span>
            <div className="row">
              <Button size="sm" icon="refresh" loading={busy === 'sync'} onClick={() => act('sync', () => rawJson('/v1/whatsapp/sync-contacts', { method: 'POST', body: { store_id: storeId } }), (r) => t('Synced {{n}} contacts', { n: r?.count ?? 0 }))}>{t('Sync contacts')}</Button>
              <Button size="sm" variant="ghost" loading={busy === 'clear'} onClick={clearContacts}>{t('Clear contacts')}</Button>
              <Button size="sm" variant="danger" loading={busy === 'disconnect'} onClick={disconnect}>{t('Disconnect')}</Button>
            </div>
          </div>
        ) : connecting ? (
          <div className="stack" style={{ alignItems: 'center' }}>
            {qr?.base64 ? <img src={qr.base64} alt={t('WhatsApp QR code')} style={{ width: 240, height: 240, background: '#fff', borderRadius: 8 }} /> : <div className="row"><Spinner /> {t('Waiting for QR code…')}</div>}
            <p className="muted" style={{ margin: 0, textAlign: 'center' }}>{t('Open WhatsApp → Linked devices → Link a device, and scan this code.')}</p>
            <Button variant="ghost" onClick={cancel}>{t('Cancel')}</Button>
          </div>
        ) : (
          <div className="row" style={{ alignItems: 'flex-end' }}>
            <Field label={t('WhatsApp number')} hint={t('With country code, e.g. 966501234567')}>{(id, d) => <Input id={id} aria-describedby={d} inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />}</Field>
            <Button variant="primary" icon="wa" onClick={connect}>{t('Connect WhatsApp')}</Button>
          </div>
        )}
      </div>
      {confirmEl}
    </Card>
  );
}
