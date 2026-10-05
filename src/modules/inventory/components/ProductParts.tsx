import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { request } from '@/api/client';
import { Button, IconButton } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { useConfirm } from '@/ui/Misc';
import { fmtNumber } from '@/lib/format';
import { applyPriceEdit, unitProfit, type PriceField, type StorePrices } from '../lib/pricing';
import { NumInput } from './common';

/** Purchase / wholesale / retail × ex / incl VAT with margin, cross-computed (masters.md §5.3). */
export function PriceGrid({ prices, onChange, vat, errors = {}, marginsEditable, lockPurchaseRetail }: {
  prices: StorePrices; onChange: (p: StorePrices) => void; vat: number; errors?: Record<string, string>; marginsEditable?: boolean; lockPurchaseRetail?: boolean;
}) {
  const { t } = useTranslation();
  const set = (f: PriceField, v: number) => onChange(applyPriceEdit(prices, f, v, vat));
  const tiers = [
    { k: 'purchase' as const, label: t('Purchase'), locked: lockPurchaseRetail },
    { k: 'wholesale' as const, label: t('Wholesale'), locked: false },
    { k: 'retail' as const, label: t('Retail'), locked: lockPurchaseRetail },
  ];
  return (
    <div className="inv-prices" role="group" aria-label={t('Unit prices')}>
      <span className="h" />
      <span className="h">{t('Excl. VAT')}</span>
      <span className="h">{t('Incl. VAT')} ({vat}%)</span>
      <span className="h">{t('Margin')}</span>
      {tiers.map((tier) => {
        const ex = `${tier.k}_unit_price` as const;
        const inc = `${tier.k}_unit_price_with_vat` as const;
        const err = errors[ex];
        const prof = tier.k === 'purchase' ? null : unitProfit(prices[ex], prices.purchase_unit_price);
        return (
          <div key={tier.k} style={{ display: 'contents' }}>
            <span className="t">{tier.label}</span>
            <div><NumInput label={`${tier.label} ${t('Excl. VAT')}`} value={prices[ex]} onValue={(n) => set(ex, n)} invalid={!!err} disabled={tier.locked} />{err && <div className="errmsg" role="alert">{t(err)}</div>}</div>
            <NumInput label={`${tier.label} ${t('Incl. VAT')}`} value={prices[inc]} onValue={(n) => set(inc, n)} disabled={tier.locked} />
            <div className="m">
              {tier.k === 'purchase' ? <span className="muted">—</span>
                : marginsEditable ? <NumInput label={`${tier.label} ${t('Margin')} %`} dp={2} value={prices[`${tier.k}_margin_percent`]} onValue={(n) => set(`${tier.k}_margin_percent`, n)} />
                  : <span className="num" style={{ color: prof && prof.profit < 0 ? 'var(--crit)' : 'var(--good)' }}>{fmtNumber(prof?.percent || 0, 2)}% <span className="muted">· {fmtNumber(prof?.profit || 0)}</span></span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Downscale large photos (legacy: max 2048px, ~1MB, quality .9) before upload; falls back to the original. */
export async function compressImage(file: File): Promise<Blob> {
  try {
    if (typeof createImageBitmap !== 'function' || file.size < 1024 * 1024) return file;
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 2048 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * scale);
    c.height = Math.round(bmp.height * scale);
    c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((res) => c.toBlob(res, 'image/jpeg', 0.9));
    return blob || file;
  } catch {
    return file;
  }
}

/** POST /v1/product/upload-image (multipart id, storeID, image) → {url}. */
export async function uploadProductImage(productId: string, storeId: string, file: File): Promise<string> {
  const fd = new FormData();
  fd.append('id', productId);
  fd.append('storeID', storeId);
  const blob = await compressImage(file);
  fd.append('image', blob, file.name);
  const r = (await request<any>('/v1/product/upload-image', { method: 'POST', body: fd })) as any;
  return r.url as string;
}

export async function deleteProductImage(productId: string, storeId: string, url: string) {
  await request('/v1/product/delete-image', { method: 'POST', query: { url, id: productId, storeID: storeId } });
}

/** Photo gallery: existing URLs (deletable) + queued files (uploaded right after create). */
export function ImageGallery({ images, queued = [], onAdd, onDelete, onRemoveQueued, readOnly, busy }: {
  images: string[]; queued?: File[]; onAdd?: (files: File[]) => void; onDelete?: (url: string) => void; onRemoveQueued?: (i: number) => void; readOnly?: boolean; busy?: boolean;
}) {
  const { t } = useTranslation();
  const input = useRef<HTMLInputElement>(null);
  const [confirmEl, ask] = useConfirm();
  const [previews] = useState(() => new Map<File, string>());
  const preview = (f: File) => {
    if (!previews.has(f)) previews.set(f, typeof URL.createObjectURL === 'function' ? URL.createObjectURL(f) : '');
    return previews.get(f)!;
  };
  return (
    <div className="inv-gallery">
      {images.map((u) => (
        <div className="inv-thumb" key={u}>
          <a href={u} target="_blank" rel="noreferrer"><img src={u} alt={t('Product photo')} loading="lazy" /></a>
          {!readOnly && onDelete && <IconButton icon="trash" label={t('Delete photo')} onClick={async () => { if (await ask(t('Delete this photo?'), { danger: true, confirmLabel: t('Delete') })) onDelete(u); }} />}
        </div>
      ))}
      {queued.map((f, i) => (
        <div className="inv-thumb" key={`q${i}`}>
          {preview(f) ? <img src={preview(f)} alt={f.name} /> : <div className="prod-img"><Icon name="box" /></div>}
          <span className="q">{t('Uploads on save')}</span>
          {onRemoveQueued && <IconButton icon="x" label={`${t('Remove')} ${f.name}`} onClick={() => onRemoveQueued(i)} />}
        </div>
      ))}
      {!readOnly && onAdd && (
        <button type="button" className="inv-drop" onClick={() => input.current?.click()} disabled={busy} aria-label={t('Add photos')}>
          <span>{busy ? <span className="spin" /> : <Icon name="upload" />}<br />{t('Add photos')}</span>
          <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => { const fs = Array.from(e.target.files || []).filter((f) => f.size <= 10 * 1024 * 1024); if (fs.length) onAdd(fs); e.target.value = ''; }} />
        </button>
      )}
      {readOnly && images.length === 0 && <div className="muted">{t('No photos yet.')}</div>}
      {confirmEl}
    </div>
  );
}

/** Open a 35×25mm label print window with the server-rendered barcode label (view.js). */
export function printBarcodeLabel(dataUrl: string, copies = 1, title = 'Barcode') {
  const w = window.open('', '_blank', 'width=420,height=360');
  if (!w) return false;
  const n = Math.max(1, Math.min(500, Math.floor(copies) || 1));
  const imgs = Array.from({ length: n }, () => `<div class="l"><img src="${dataUrl}" alt=""></div>`).join('');
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title.replace(/</g, '&lt;')}</title><style>@page{size:35mm 25mm;margin:0}html,body{margin:0;padding:0}.l{width:35mm;height:25mm;display:flex;align-items:center;justify-content:center;page-break-after:always;overflow:hidden}.l img{max-width:100%;max-height:100%}</style></head><body>${imgs}<script>window.onload=function(){setTimeout(function(){window.print()},150)}${'<'}/script></body></html>`);
  w.document.close();
  return true;
}

export function BarcodeCard({ dataUrl, name, code }: { dataUrl?: string; name: string; code?: string }) {
  const { t } = useTranslation();
  const [copies, setCopies] = useState('1');
  if (!dataUrl) return <div className="muted">{t('No barcode available.')}</div>;
  return (
    <div className="inv-barcode">
      <img src={dataUrl} alt={`${t('Barcode')} ${code || ''}`} width={280} />
      <div className="row" style={{ justifyContent: 'center' }}>
        <label className="row" style={{ gap: 6 }}><span className="muted">{t('Copies')}</span>
          <input className="inp num" style={{ width: 70 }} inputMode="numeric" aria-label={t('Copies')} value={copies} onChange={(e) => setCopies(e.target.value.replace(/\D/g, ''))} />
        </label>
        <Button icon="print" onClick={() => printBarcodeLabel(dataUrl, Number(copies) || 1, name)}>{t('Print label')}</Button>
      </div>
    </div>
  );
}
