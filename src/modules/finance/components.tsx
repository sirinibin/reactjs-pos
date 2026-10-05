import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/api/client';
import type { PickerOption } from '@/ui/AsyncPicker';
import { Button, IconButton } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { Tag } from '@/ui/Pill';
import { fmtMoney } from '@/lib/format';
import { paymentLabel, type Account } from './logic';
import { toLocalInput, type PendingFile } from './bodies';
import './finance.css';

export { toLocalInput, type PendingFile };

// ------------------------------------------------------------ lookups (AsyncPicker loaders)

export async function loadUsers(storeId: string, q: string, signal?: AbortSignal): Promise<PickerOption[]> {
  const r = await api.get<any[]>('/v1/user', { search: { store_id: storeId, name: q || undefined }, limit: 20, select: 'id,name' }, signal);
  return (r.result || []).map((u) => ({ id: u.id, label: u.name, data: u }));
}

export async function loadExpenseCategories(storeId: string, q: string, signal?: AbortSignal): Promise<PickerOption[]> {
  const r = await api.get<any[]>('/v1/expense-category', { search: { store_id: storeId, name: q || undefined }, limit: 20, select: 'id,name,parent_name', sort: 'name' }, signal);
  return (r.result || []).map((c) => ({ id: c.id, label: c.name, sub: c.parent_name || undefined, data: c }));
}

export async function loadAccounts(storeId: string, q: string, signal?: AbortSignal): Promise<PickerOption<Account>[]> {
  const r = await api.get<Account[]>('/v1/account', {
    search: { store_id: storeId, search: q || undefined }, limit: 20,
    select: 'id,name,name_arabic,phone,number,search_label,open,balance,debit_or_credit_balance,type,reference_model,reference_id',
  }, signal);
  return (r.result || []).map((a) => ({
    id: a.id, label: a.search_label || `${a.name} A/c #${a.number}`, sub: [a.type, a.phone].filter(Boolean).join(' · ') || undefined,
    right: `${fmtMoney(a.balance)} ${a.debit_or_credit_balance === 'debit_balance' ? 'Dr' : a.debit_or_credit_balance === 'credit_balance' ? 'Cr' : ''}`, data: a,
  }));
}

/** Image/file URL for an attachment: the API stores either a full "/cdn/…" path or a bare file name. */
export function attachmentUrl(name: string, storeId: string, folder: string): string {
  if (/^(https?:)?\//.test(name)) return name;
  return `/images/${storeId}/${folder}/${name}`;
}

// ------------------------------------------------------------ small display pieces

export function Money({ value, strong, tone }: { value: number | null | undefined; strong?: boolean; tone?: 'crit' | 'good' | 'muted' }) {
  const style = tone === 'crit' ? { color: 'var(--crit)' } : tone === 'good' ? { color: 'var(--good)' } : tone === 'muted' ? { color: 'var(--text-4)' } : undefined;
  return strong ? <b className="num" style={style}>{fmtMoney(value)}</b> : <span className="num" style={style}>{fmtMoney(value)}</span>;
}

export function PayTag({ method }: { method?: string | null }) {
  const { t } = useTranslation();
  return method ? <Tag>{t(paymentLabel(method))}</Tag> : <span className="muted">—</span>;
}


const readAsDataUrl = (f: Blob) => new Promise<string>((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(String(r.result));
  r.onerror = () => rej(r.error);
  r.readAsDataURL(f);
});

/** Fit an image inside max×max and re-encode as JPEG (legacy react-image-file-resizer 400×400). */
export async function resizeImage(file: File, max = 400): Promise<string> {
  const url = await readAsDataUrl(file);
  if (typeof document === 'undefined' || !file.type.startsWith('image/')) return url;
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const k = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(img.width * k));
    c.height = Math.max(1, Math.round(img.height * k));
    const ctx = c.getContext('2d');
    if (!ctx) return url;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.95);
  } catch {
    return url;
  }
}


/** Drag & drop / pick files; returns data URLs (the API takes base64 in images_content). */
export function FileDrop({ onFiles, accept, multiple = true, label, resize }: { onFiles: (f: PendingFile[]) => void; accept?: string; multiple?: boolean; label?: ReactNode; resize?: number }) {
  const { t } = useTranslation();
  const ref = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const take = async (list: FileList | null) => {
    if (!list?.length) return;
    const files = Array.from(list).slice(0, multiple ? 20 : 1);
    const out: PendingFile[] = [];
    for (const f of files) out.push({ name: f.name, size: f.size, type: f.type, dataUrl: resize && f.type.startsWith('image/') ? await resizeImage(f, resize) : await readAsDataUrl(f) });
    onFiles(out);
  };
  return (
    <div className={`fdrop${over ? ' over' : ''}`} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files); }}>
      <Icon name="upload" />
      <span>{label || t('Drop files here or')}</span>
      <Button size="sm" onClick={() => ref.current?.click()}>{t('Choose file')}</Button>
      <input ref={ref} type="file" hidden accept={accept} multiple={multiple} aria-label={t('Choose file')} onChange={(e) => { take(e.target.files); e.target.value = ''; }} />
    </div>
  );
}

export function Thumb({ src, name, onRemove }: { src: string; name: string; onRemove?: () => void }) {
  const { t } = useTranslation();
  const isImg = /^data:image\//.test(src) || /\.(jpe?g|png|gif|webp|bmp)$/i.test(src);
  return (
    <div className="thumb">
      <a href={src} target="_blank" rel="noopener noreferrer" title={name}>
        {isImg ? <img src={src} alt={name} /> : <span className="thumb-f"><Icon name="paper" /><small>{name.split('.').pop()?.toUpperCase()}</small></span>}
      </a>
      {onRemove && <IconButton icon="x" label={`${t('Remove')} ${name}`} className="thumb-x" onClick={onRemove} />}
    </div>
  );
}

/** Small hook: run an effect once a value is truthy (opens drawers from ?new=1 / ?open=id). */
export function useOnce(cond: boolean, fn: () => void) {
  const done = useRef(false);
  useEffect(() => {
    if (cond && !done.current) {
      done.current = true;
      fn();
    }
  }, [cond, fn]);
}
