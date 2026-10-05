import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, IconButton } from '@/ui/Button';
import { Modal } from '@/ui/Overlay';

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/**
 * Photo gallery used by the customer form/360: shows saved URLs and queued files.
 * Saved images are removed via `onRemoveSaved`; queued files are kept by the parent and uploaded after create.
 */
export function ImageGallery({ saved = [], queued = [], onAdd, onRemoveSaved, onRemoveQueued, busy, readOnly }: {
  saved?: string[]; queued?: File[]; onAdd?: (files: File[]) => void; onRemoveSaved?: (url: string) => void; onRemoveQueued?: (i: number) => void; busy?: boolean; readOnly?: boolean;
}) {
  const { t } = useTranslation();
  const input = useRef<HTMLInputElement>(null);
  const [zoom, setZoom] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const previews = useMemo(() => queued.map((f) => (typeof URL.createObjectURL === 'function' ? URL.createObjectURL(f) : '')), [queued]);
  useEffect(() => () => previews.forEach((u) => u && URL.revokeObjectURL?.(u)), [previews]);

  const pick = (list: FileList | null) => {
    const files = Array.from(list || []);
    const bad = files.filter((f) => !f.type.startsWith('image/') || f.size > MAX_IMAGE_BYTES);
    setErr(bad.length ? t('Only images up to 10 MB can be added.') : '');
    const ok = files.filter((f) => !bad.includes(f));
    if (ok.length) onAdd?.(ok);
    if (input.current) input.current.value = '';
  };

  const empty = saved.length === 0 && queued.length === 0;
  return (
    <div className="cu-gallery">
      {empty && readOnly && <div className="muted">{t('No photos yet.')}</div>}
      <div className="cu-thumbs">
        {saved.map((u) => (
          <figure key={u} className="cu-thumb">
            <button type="button" className="cu-thumb-img" onClick={() => setZoom(u)} aria-label={t('View photo')}><img src={u} alt="" loading="lazy" /></button>
            {!readOnly && onRemoveSaved && <IconButton icon="trash" label={t('Remove photo')} className="cu-thumb-x" onClick={() => onRemoveSaved(u)} />}
          </figure>
        ))}
        {queued.map((f, i) => (
          <figure key={`${f.name}-${i}`} className="cu-thumb queued" title={t('Uploads when you save')}>
            <span className="cu-thumb-img">{previews[i] ? <img src={previews[i]} alt="" /> : <span className="muted">{f.name}</span>}</span>
            {onRemoveQueued && <IconButton icon="x" label={t('Remove photo')} className="cu-thumb-x" onClick={() => onRemoveQueued(i)} />}
          </figure>
        ))}
        {!readOnly && onAdd && (
          <label className="cu-thumb cu-add">
            <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => pick(e.target.files)} aria-label={t('Add photos')} />
            <Button icon="upload" size="sm" variant="ghost" loading={busy} onClick={() => input.current?.click()}>{t('Add photos')}</Button>
          </label>
        )}
      </div>
      {err && <div className="errmsg" role="alert">{err}</div>}
      <Modal open={!!zoom} onClose={() => setZoom(null)} title={t('Photo')} width={900}>
        {zoom && <img src={zoom} alt="" style={{ maxWidth: '100%', display: 'block', margin: '0 auto' }} />}
      </Modal>
    </div>
  );
}
