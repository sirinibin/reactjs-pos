import { useEffect, useRef, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { session } from '@/api/session';
import { Button } from '@/ui/Button';
import { Icon, type IconName } from '@/ui/Icon';
import '../admin.css';

/** Accessible on/off switch (checkbox semantics). */
export function Switch({ label, hint, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode; hint?: ReactNode }) {
  return (
    <label className="adm-sw">
      <span className="lbl">{label}{hint && <small>{hint}</small>}</span>
      <span className="switch"><input type="checkbox" role="switch" {...rest} /><span aria-hidden /></span>
    </label>
  );
}

export interface SectionDef<T extends string> { id: T; label: string; icon: IconName; hidden?: boolean; errors?: number }

/** Vertical section navigation (horizontal scroller on tablets/phones). */
export function SectionNav<T extends string>({ sections, value, onChange, label }: { sections: SectionDef<T>[]; value: T; onChange: (v: T) => void; label: string }) {
  const { t } = useTranslation();
  return (
    <nav className="card adm-nav" role="tablist" aria-label={label} aria-orientation="vertical">
      {sections.filter((s) => !s.hidden).map((s) => (
        <button key={s.id} type="button" role="tab" aria-selected={s.id === value} onClick={() => onChange(s.id)}>
          <Icon name={s.icon} size="s" /><span>{t(s.label)}</span>
          {!!s.errors && <span className="cnt" aria-label={t('{{n}} errors', { n: s.errors })}>{s.errors}</span>}
        </button>
      ))}
    </nav>
  );
}

/** Ctrl/Cmd+S → save (ignores the shortcut while disabled). */
export function useSaveShortcut(save: () => void, enabled = true) {
  const ref = useRef(save);
  ref.current = save;
  useEffect(() => {
    if (!enabled) return;
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); ref.current(); }
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [enabled]);
}

/** Warn before closing the tab with unsaved changes. */
export function useUnsavedGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);
}

/**
 * Raw JSON call for endpoints that do not use the {status,result,errors} envelope
 * (WhatsApp/Evolution helpers return bare objects and `{error}` on failure).
 */
export async function rawJson<T = any>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = session.token();
  if (token) headers.Authorization = token;
  if (init.body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(path, { method: init.method || 'GET', headers, body: init.body !== undefined ? JSON.stringify(init.body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.error) throw new Error(data?.error || data?.errors?.[Object.keys(data.errors)[0]] || `Request failed (${res.status})`);
  return (data?.result !== undefined && data?.status !== undefined ? data.result : data) as T;
}

export const readFileAsDataUrl = (f: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(f);
  });

/** Downscale an image data-URL to fit maxW×maxH (PNG keeps transparency). Falls back to the input. */
export function fitImage(dataUrl: string, maxW: number, maxH: number): Promise<string> {
  return new Promise((resolve) => {
    if (typeof Image === 'undefined') return resolve(dataUrl);
    const img = new Image();
    // Environments that never decode images (jsdom, broken files) keep the original.
    const fallback = setTimeout(() => resolve(dataUrl), 1000);
    img.onload = () => {
      clearTimeout(fallback);
      const k = Math.min(1, maxW / img.width, maxH / img.height);
      if (k >= 1) return resolve(dataUrl);
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      const ctx = c.getContext('2d');
      if (!ctx) return resolve(dataUrl);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      try { resolve(c.toDataURL('image/png')); } catch { resolve(dataUrl); }
    };
    img.onerror = () => { clearTimeout(fallback); resolve(dataUrl); };
    img.src = dataUrl;
  });
}

/** Image chooser with preview, "Not saved yet" marker, change and remove. */
export function ImagePicker({ label, url, pending, onPick, onRemove, maxBytes, accept = 'image/png,image/jpeg,image/webp', fit, hint }: {
  label: string; url?: string; pending?: boolean; onPick: (dataUrl: string) => void; onRemove?: () => void; maxBytes: number; accept?: string; fit?: [number, number]; hint?: ReactNode;
}) {
  const { t } = useTranslation();
  const ref = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState('');
  const pick = async (f: File | undefined) => {
    setErr('');
    if (!f) return;
    if (!f.type.startsWith('image/')) { setErr(t('Choose an image file.')); return; }
    if (f.size > maxBytes) { setErr(t('File is too large (max {{n}}).', { n: `${Math.round(maxBytes / 1024)} KB` })); return; }
    const d = await readFileAsDataUrl(f);
    onPick(fit ? await fitImage(d, fit[0], fit[1]) : d);
  };
  return (
    <div className="adm-img">
      <div className="pv">{url ? <img src={url} alt={label} /> : <span className="muted"><Icon name="upload" /> {t('No image')}</span>}</div>
      <div className="stack" style={{ gap: 8, flex: '1 1 220px' }}>
        <b>{label}</b>
        {pending && <span className="pill warn" style={{ alignSelf: 'flex-start' }}><Icon name="clock" />{t('Not saved yet')}</span>}
        {hint && <div className="hint">{hint}</div>}
        <div className="row">
          <Button icon="upload" onClick={() => ref.current?.click()}>{url ? t('Change') : t('Upload')}</Button>
          {url && onRemove && <Button variant="ghost" icon="trash" onClick={onRemove}>{t('Remove')}</Button>}
        </div>
        <input ref={ref} type="file" accept={accept} hidden aria-label={label} onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
        {err && <div className="errmsg" role="alert"><Icon name="alert" size="xs" /><span>{err}</span></div>}
      </div>
    </div>
  );
}

/** <input type="datetime-local"> value ↔ ISO (browser-local wall clock). */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime()) || d.getFullYear() < 1900) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
export function fromLocalInput(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
