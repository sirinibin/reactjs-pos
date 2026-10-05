import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/api/client';
import { session } from '@/api/session';
import { useAuth } from '@/auth/AuthContext';
import { Modal } from '@/ui/Overlay';
import { Button } from '@/ui/Button';
import { Field, Input } from '@/ui/Field';
import { Banner, Spinner } from '@/ui/Misc';
import { Pill } from '@/ui/Pill';
import { useToast } from '@/ui/Toast';
import { fmtRelative } from '@/lib/format';
import { zatcaState, type Rec } from '../lib/storeForm';
import { eta, fmtDuration, humanBytes, JOB_KINDS, sizeRows, type JobKind, type JobProgress } from '../lib/misc';

export const STORE = '/v1/store';
export const STORES_PATH = '/admin/stores';

/** Who may do what with stores (POST/duplicate/backup/delete are Admin-only server side; SalesMan can't PUT). */
export function useStorePerms() {
  const { isAdmin, user, can } = useAuth();
  const role = user?.role || (user?.admin ? 'Admin' : 'Manager');
  return {
    isAdmin,
    canEdit: isAdmin || (role !== 'SalesMan' && can('stores', 'update')),
    canCreate: isAdmin,
  };
}

export function ZatcaStatusPill({ zatca }: { zatca: Rec | undefined | null }) {
  const { t } = useTranslation();
  const s = zatcaState(zatca);
  if (s === 'phase1') return <Pill tone="neutral" icon="shield">{t('Phase 1')}</Pill>;
  if (s === 'reconnect') return <Pill tone="warn" icon="alert">{t('Reconnect required')}</Pill>;
  if (s === 'connected') return <Pill tone="good" icon="shield" title={zatca?.last_connected_at ? fmtRelative(zatca.last_connected_at) : undefined}>{t('Phase 2 · Connected')}</Pill>;
  return <Pill tone="crit" icon="xc">{t('Phase 2 · Not connected')}</Pill>;
}

/** OTP dialog for POST /v1/store/zatca/connect (connect & reconnect). */
export function ZatcaConnectModal({ open, onClose, store, reconnect, onDone }: { open: boolean; onClose: () => void; store: { id: string; name?: string }; reconnect?: boolean; onDone?: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const { store: active, refreshStore } = useAuth();
  const [otp, setOtp] = useState('');
  const [err, setErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setOtp(''); setErr({}); } }, [open]);
  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!otp.trim()) { setErr({ otp: t('OTP is required') }); return; }
    setBusy(true);
    try {
      await api.post(`${STORE}/zatca/connect`, { id: store.id, otp: otp.trim() });
      toast.success(reconnect ? t('Successfully re-connected to ZATCA!') : t('Store connected to ZATCA successfully!'));
      qc.invalidateQueries({ queryKey: [STORE] });
      if (active?.id === store.id) await refreshStore();
      onDone?.();
      onClose();
    } catch (x) {
      setErr(x instanceof ApiError ? x.errors : { otp: (x as Error).message });
      toast.error(t('Error connecting to ZATCA!'));
    } finally {
      setBusy(false);
    }
  };
  const other = Object.entries(err).filter(([k]) => k !== 'otp');
  return (
    <Modal open={open} onClose={onClose} title={reconnect ? t('Reconnect to ZATCA') : t('Connect to ZATCA')} width={480}
      footer={<><Button variant="ghost" onClick={onClose}>{t('Cancel')}</Button><Button variant="primary" icon="shield" loading={busy} onClick={() => submit()}>{reconnect ? t('Reconnect') : t('Connect')}</Button></>}>
      <form className="stack" onSubmit={submit} noValidate>
        {reconnect && <Banner tone="warn"><b>{t('Re-connection required.')}</b> {t('ZATCA-sensitive store details were changed. Reconnect before reporting any invoice.')}</Banner>}
        <p className="muted" style={{ margin: 0 }}>{t('Generate a one-time password in the ZATCA Fatoora portal for')} <b><bdi>{store.name}</bdi></b>{t(', then enter it below.')}</p>
        <Field label={t('OTP from ZATCA')} required error={err.otp}>
          {(id, d) => <Input id={id} aria-describedby={d} inputMode="numeric" autoComplete="one-time-code" value={otp} onChange={(e) => setOtp(e.target.value)} invalid={!!err.otp} data-autofocus />}
        </Field>
        {other.length > 0 && <Banner tone="crit">{other.map(([, m]) => m).join(' · ')}</Banner>}
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

/** Backup / duplicate background jobs with live per-step progress (500 ms polling). */
export function StoreJobModal({ kind, store, open, onClose }: { kind: JobKind; store: Rec; open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const base = `${STORE}/${store.id}/${kind}`;
  const isBackup = kind === 'backup';
  const [size, setSize] = useState<Record<string, number> | null>(null);
  const [sizeErr, setSizeErr] = useState('');
  const [name, setName] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [prog, setProg] = useState<JobProgress | null>(null);
  const [started, setStarted] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [running, setRunning] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; clearTimeout(timer.current); };
  }, []);

  useEffect(() => {
    if (!open) return;
    setSize(null); setSizeErr(''); setProg(null); setStarted(null); setRunning(false); setErrs({});
    setName(isBackup ? '' : `${store.name || ''} (copy)`); setNameAr(store.name_in_arabic ? `${store.name_in_arabic} (نسخة)` : '');
    api.get<Record<string, number>>(`${base}/size`).then((r) => alive.current && setSize(r.result || {})).catch((e) => alive.current && setSizeErr((e as Error).message));
  }, [open, base, isBackup, store.name, store.name_in_arabic]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);

  const download = useCallback((token: string) => {
    const a = document.createElement('a');
    a.href = `${STORE}/${store.id}/backup/file?job_id=${encodeURIComponent(token)}&access_token=${encodeURIComponent(session.token() || '')}`;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, [store.id]);

  const poll = useCallback((jobId: string) => {
    const tick = async () => {
      try {
        const r = await api.get<JobProgress>(`${base}/progress`, { job_id: jobId });
        if (!alive.current) return;
        const p = r.result!;
        setProg(p);
        if (p.done || p.error) {
          setRunning(false);
          if (p.error) toast.error(p.error);
          else if (isBackup && p.file_token) { download(p.file_token); toast.success(t('Backup complete — your download has started.')); }
          else if (!isBackup) { toast.success(t('Store duplicated successfully!')); qc.invalidateQueries({ queryKey: [STORE] }); }
          return;
        }
      } catch (e) {
        if (!alive.current) return;
        setRunning(false);
        toast.error((e as Error).message);
        return;
      }
      timer.current = setTimeout(tick, 500);
    };
    tick();
  }, [base, isBackup, download, toast, t, qc]);

  const start = async () => {
    if (!isBackup && !name.trim()) { setErrs({ new_name: t('Store name is required') }); return; }
    setErrs({});
    try {
      const r = await api.post<{ job_id: string; new_store_id?: string }>(`${base}/start`, isBackup ? undefined : { new_name: name.trim(), new_name_in_arabic: nameAr.trim() });
      setProg({ steps: [], overall_progress: 0, done: false });
      setStarted(Date.now());
      setNow(Date.now());
      setRunning(true);
      poll(r.result!.job_id);
    } catch (e) {
      if (e instanceof ApiError) setErrs(e.errors);
      toast.error((e as Error).message);
    }
  };

  const meta = JOB_KINDS.find((k) => k.kind === kind);
  const title = isBackup ? t('Backup store') : t(meta?.label || 'Duplicate store');
  const elapsed = started ? now - started : 0;
  const remaining = prog ? eta(elapsed, prog.overall_progress) : null;
  const finished = !!prog?.done && !prog.error;

  return (
    <Modal open={open} onClose={running ? () => {} : onClose} title={`${title} — ${store.name || ''}`} width={600}
      footer={<>
        <Button variant="ghost" onClick={onClose} disabled={running}>{finished ? t('Close') : t('Cancel')}</Button>
        {isBackup && finished && prog?.file_token && <Button icon="download" onClick={() => download(prog.file_token!)}>{t('Download again')}</Button>}
        {!finished && <Button variant="primary" icon={isBackup ? 'download' : 'copy'} loading={running} onClick={start} disabled={running}>{isBackup ? t('Start backup') : t('Start duplicate')}</Button>}
        {finished && isBackup && <Button variant="primary" icon="refresh" onClick={start}>{t('Backup again')}</Button>}
      </>}>
      <div className="stack">
        {meta && !isBackup && <p className="muted" style={{ margin: 0 }}>{t(meta.hint)}</p>}
        <div className="card" style={{ padding: 12 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}><b>{t('Size')}</b>{!size && !sizeErr && <span className="row muted"><Spinner /> {t('Calculating…')}</span>}</div>
          {sizeErr && <div className="errmsg">{sizeErr}</div>}
          {size && (
            <dl className="kv" style={{ marginTop: 8 }}>
              {sizeRows(size).map((r) => <FragmentKV key={r.label} k={t(r.label)} v={humanBytes(r.bytes)} />)}
              <FragmentKV k={<b>{t('Total')}</b>} v={<b>{humanBytes(size.total_size)}</b>} />
            </dl>
          )}
        </div>
        {!isBackup && !prog && (
          <div className="grid-2c">
            <Field label={t('New store name')} required error={errs.new_name}>{(id, d) => <Input id={id} aria-describedby={d} value={name} onChange={(e) => setName(e.target.value)} invalid={!!errs.new_name} />}</Field>
            <Field label={t('New store name (Arabic)')}>{(id) => <Input id={id} dir="rtl" value={nameAr} onChange={(e) => setNameAr(e.target.value)} />}</Field>
          </div>
        )}
        {!isBackup && zatcaState(store.zatca) !== 'phase1' && !prog && (
          <Banner tone="info">{t('The copy keeps the {{env}} ZATCA environment but is marked as not connected and all ZATCA credentials are cleared.', { env: store.zatca?.env || '' })}</Banner>
        )}
        {prog && (
          <div className="stack" style={{ gap: 10 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <b>{t('Overall')}</b>
              <span className="num muted">{Math.round(prog.overall_progress)}% · {t('Elapsed')} {fmtDuration(elapsed)}{remaining !== null && running ? ` · ${t('ETA')} ${fmtDuration(remaining)}` : ''}</span>
            </div>
            <div className={`adm-bar${finished ? ' done' : prog.error ? ' err' : ''}`} role="progressbar" aria-label={t('Overall')} aria-valuenow={Math.round(prog.overall_progress)} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${prog.overall_progress}%` }} /></div>
            <ol className="adm-steps">
              {prog.steps.map((s) => (
                <li key={s.id}>
                  <span>{s.status === 'done' ? '✓ ' : s.status === 'error' ? '✗ ' : ''}{s.name}{s.message ? <span className="muted"> · {s.message}</span> : null}</span>
                  <span className="num muted">{s.progress}%</span>
                  <div className={`adm-bar${s.status === 'done' ? ' done' : s.status === 'error' ? ' err' : ''}`}><i style={{ width: `${s.progress}%` }} /></div>
                </li>
              ))}
            </ol>
            {prog.error && <Banner tone="crit">{prog.error}</Banner>}
            {finished && isBackup && <Banner tone="good">{t('Backup complete — your download has started.')} {t('Completed in')} {fmtDuration(elapsed)}</Banner>}
            {finished && !isBackup && (
              <Banner tone="good">
                {t('Store duplicated successfully!')} {prog.new_store_id && <Link to={`${STORES_PATH}/${prog.new_store_id}`} onClick={onClose}>{t('Open')} <bdi>{prog.new_store_name || name}</bdi></Link>}
              </Banner>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

function FragmentKV({ k, v }: { k: React.ReactNode; v: React.ReactNode }) {
  return <><dt>{k}</dt><dd className="num">{v}</dd></>;
}
