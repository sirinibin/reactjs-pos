import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { request, ApiError } from '@/api/client';
import { session } from '@/api/session';
import { useAuth } from '@/auth/AuthContext';
import { Modal } from '@/ui/Overlay';
import { Button } from '@/ui/Button';
import { Field, Input } from '@/ui/Field';
import { Banner } from '@/ui/Misc';
import { Pill } from '@/ui/Pill';
import { useToast } from '@/ui/Toast';

/** 0..4 strength score (admin.md §8.6). */
export function passwordStrength(pw: string): { score: number; label: 'Weak' | 'Fair' | 'Good' | 'Strong'; color: string } {
  let s = 0;
  if (pw.length >= 6) s++;
  if (pw.length >= 10) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  if (s <= 1) return { score: s, label: 'Weak', color: '#e53935' };
  if (s === 2) return { score: s, label: 'Fair', color: '#fb8c00' };
  if (s === 3) return { score: s, label: 'Good', color: '#f9a825' };
  return { score: Math.min(4, s), label: 'Strong', color: '#43a047' };
}

export function ChangePasswordDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const { user } = useAuth();
  const [cur, setCur] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setCur(''); setPw(''); setPw2(''); setErrs({}); } }, [open]);
  const st = passwordStrength(pw);

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!cur) e.current_password = t('Current password is required');
    if (!pw) e.new_password = t('New password is required');
    else if (pw.length < 6) e.new_password = t('Must be at least 6 characters');
    if (!pw2) e.confirm = t('Please confirm your new password');
    else if (pw && pw !== pw2) e.confirm = t('Passwords do not match');
    setErrs(e);
    if (Object.keys(e).length || !user) return;
    setBusy(true);
    try {
      await request(`/v1/user/${user.id}/change-password`, { method: 'PATCH', body: { new_password: pw, current_password: cur } });
      toast.success(t('Password changed successfully'));
      onClose();
    } catch (err) {
      setErrs(err instanceof ApiError ? err.errors : { server: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };
  const other = Object.entries(errs).filter(([k]) => !['current_password', 'new_password', 'confirm'].includes(k));
  return (
    <Modal open={open} onClose={onClose} title={t('Change your password')} width={440}
      footer={<><Button variant="ghost" onClick={onClose}>{t('Cancel')}</Button><Button variant="primary" loading={busy} onClick={submit}>{t('Change password')}</Button></>}>
      <form className="stack" style={{ gap: 12 }} onSubmit={(e) => { e.preventDefault(); submit(); }}>
        {other.length > 0 && <Banner tone="crit">{other.map(([, m]) => m).join(' · ')}</Banner>}
        <Field label={t('Current password')} required error={errs.current_password}>{(id, d) => <Input id={id} aria-describedby={d} type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} data-autofocus />}</Field>
        <Field label={t('New password')} required error={errs.new_password}
          hint={pw ? <span style={{ color: st.color, fontWeight: 600 }}>{t('Strength')}: {t(st.label)}</span> : t('At least 6 characters; longer with numbers and symbols is stronger.')}>
          {(id, d) => <Input id={id} aria-describedby={d} type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />}
        </Field>
        <Field label={t('Confirm new password')} required error={errs.confirm} hint={pw2 && pw === pw2 ? <span style={{ color: 'var(--good)' }}>{t('Passwords match')}</span> : undefined}>
          {(id, d) => <Input id={id} aria-describedby={d} type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />}
        </Field>
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

interface Health { ok: boolean; redis?: { status: string; message?: string; latency?: string }; mongodb?: { status: string; message?: string }; checked_at?: string }
interface SvcStatus { name?: string; port?: string | number; overall?: string; reason?: string; api?: { ok: boolean; message?: string }; redis?: { ok: boolean; message?: string }; mongodb?: { ok: boolean; message?: string }; updated_at?: string }

/** Server status: API health + (when available) the health-monitor service (admin.md §12). */
export function ServerStatusDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const [health, setHealth] = useState<Health | null>(null);
  const [mon, setMon] = useState<{ production?: SvcStatus; test?: SvcStatus } | null>(null);
  const [monErr, setMonErr] = useState('');
  useEffect(() => {
    if (!open) return;
    let alive = true;
    const tick = async () => {
      try {
        const r = await fetch('/v1/health');
        const j = await r.json();
        if (alive) setHealth(j);
      } catch { if (alive) setHealth({ ok: false }); }
      try {
        const r = await fetch('/health-monitor/status', { headers: { Authorization: `Bearer ${session.token() || ''}` } });
        if (!r.ok) throw new Error(r.status === 401 || r.status === 403 ? t('Access denied to the health monitor.') : t('Health monitor returned HTTP {{n}}.', { n: r.status }));
        const ct = r.headers.get('content-type') || '';
        if (!ct.includes('json')) throw new Error(t('Health monitor is not available on this server.'));
        const j = await r.json();
        if (alive) { setMon(j); setMonErr(''); }
      } catch (e) { if (alive) setMonErr((e as Error).message); }
    };
    tick();
    const h = setInterval(tick, 5000);
    return () => { alive = false; clearInterval(h); };
  }, [open, t]);
  const ok = (b?: boolean) => (b ? <Pill tone="good" icon="check">{t('OK')}</Pill> : <Pill tone="crit" icon="xc">{t('Down')}</Pill>);
  const card = (label: string, s?: SvcStatus) => s && (
    <div className="card" style={{ padding: 14 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}><b>{label}</b><Pill tone={s.overall === 'running' ? 'good' : s.overall === 'degraded' ? 'warn' : s.overall === 'down' ? 'crit' : 'info'}>{String(s.overall || 'unknown').toUpperCase()}</Pill></div>
      <div className="kv" style={{ marginTop: 10, gridTemplateColumns: '1fr auto' }}>
        <dt>{t('API service')}</dt><dd>{ok(s.api?.ok)}</dd><dt>Redis</dt><dd>{ok(s.redis?.ok)}</dd><dt>MongoDB</dt><dd>{ok(s.mongodb?.ok)}</dd>
      </div>
      {s.reason && <div className="hint" style={{ marginTop: 6 }}>⚠ {s.reason}</div>}
    </div>
  );
  return (
    <Modal open={open} onClose={onClose} title={t('Server status')} width={620}>
      <div className="stack">
        <div className="card" style={{ padding: 14 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}><b>{t('This server')}</b>{health ? ok(health.ok) : <span className="spin" />}</div>
          {health && (
            <div className="kv" style={{ marginTop: 10, gridTemplateColumns: '1fr auto' }}>
              <dt>Redis</dt><dd>{ok(health.redis?.status === 'ok')}</dd>
              <dt>MongoDB</dt><dd>{ok(health.mongodb?.status === 'ok')}</dd>
            </div>
          )}
        </div>
        {mon ? <div className="grid-2c">{card(t('Production'), mon.production)}{card(t('Test'), mon.test)}</div> : monErr && <div className="hint">{monErr}</div>}
      </div>
    </Modal>
  );
}
