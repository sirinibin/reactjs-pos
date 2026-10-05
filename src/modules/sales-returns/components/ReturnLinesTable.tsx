import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/ui/Icon';
import { Button } from '@/ui/Button';
import { fmtMoney, parseNumber } from '@/lib/format';
import { lineTotalWithVat, setUnitDiscount, setUnitPrice } from '@/framework/doc/calc';
import type { ReturnLine } from '../logic';

export function NumInput({ value, onCommit, label, invalid, disabled, dp = 2 }: { value: number; onCommit: (n: number) => void; label: string; invalid?: boolean; disabled?: boolean; dp?: number }) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? String(Number((value || 0).toFixed(dp)));
  return (
    <input className={`cell num${invalid ? ' err' : ''}`} inputMode="decimal" aria-label={label} aria-invalid={invalid || undefined} disabled={disabled} value={shown}
      onFocus={(e) => { setDraft(shown); e.currentTarget.select(); }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => { if (draft !== null) onCommit(parseNumber(draft)); setDraft(null); }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        if (e.key === 'Escape') { setDraft(null); e.currentTarget.blur(); }
      }} />
  );
}

/**
 * Lines of the original document with a checkbox per line ("selected"), sold / already-returned
 * info and a quantity capped at what can still be returned.
 */
export function ReturnLinesTable({ lines, onChange, vat, locked, errors = {}, priceEditable, showVat = true }: {
  lines: ReturnLine[]; onChange: (l: ReturnLine[]) => void; vat: number; locked?: boolean; errors?: Record<string, string>; priceEditable?: boolean; showVat?: boolean;
}) {
  const { t } = useTranslation();
  const upd = (i: number, l: ReturnLine) => onChange(lines.map((x, j) => (j === i ? l : x)));
  const selectable = lines.filter((l) => l.max > 0 || l.selected);
  const allOn = selectable.length > 0 && selectable.every((l) => l.selected);
  const nSel = lines.filter((l) => l.selected).length;
  const setAll = (on: boolean) => onChange(lines.map((l) => (l.max > 0 || l.selected ? { ...l, selected: on, quantity: on && !l.selected ? l.max : l.quantity } : l)));
  const err = (k: string, i: number) => errors[`${k}_${i}`];
  return (
    <div>
      <div className="sr-head">
        <label className="checkline">
          <input type="checkbox" className="chk" checked={allOn} disabled={locked || selectable.length === 0} onChange={(e) => setAll(e.target.checked)} aria-label={t('Select all items')} />
          <span>{t('Select all')}</span>
        </label>
        <span className="muted">{t('{{n}} of {{m}} items selected', { n: nSel, m: lines.length })}</span>
        <span className="spacer" />
        {!locked && nSel > 0 && <Button size="sm" variant="ghost" icon="x" onClick={() => setAll(false)}>{t('Clear')}</Button>}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="lines sr-lines" aria-label={t('Items')}>
          <thead>
            <tr>
              <th style={{ width: 30 }}>#</th>
              <th>{t('Item')}</th>
              <th className="r" style={{ width: 100 }}>{t('Return qty')}</th>
              <th className="r" style={{ width: 120 }}>{t('Unit price')}{showVat && <div className="muted" style={{ fontWeight: 500, fontSize: 10.5 }}>{t('ex VAT')}</div>}</th>
              <th className="r" style={{ width: 110 }}>{t('Disc.')}<div className="muted" style={{ fontWeight: 500, fontSize: 10.5 }}>{t('per unit')}</div></th>
              <th className="r" style={{ width: 120 }}>{t('Amount')}{showVat && <div className="muted" style={{ fontWeight: 500, fontSize: 10.5 }}>{t('incl. VAT')}</div>}</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => {
              const none = l.max <= 0 && !l.selected;
              const editable = !locked && l.selected;
              return (
                <tr key={l.key} className={`ln${l.selected ? '' : ' off'}`}>
                  <td className="ix muted">{i + 1}</td>
                  <td className="pn">
                    <label className="checkline">
                      <input type="checkbox" className="chk" checked={l.selected} disabled={locked || none} aria-label={`${t('Return')} ${l.name}`}
                        onChange={(e) => upd(i, { ...l, selected: e.target.checked, quantity: e.target.checked && !(l.quantity > 0) ? l.max : l.quantity })} />
                      <span style={{ minWidth: 0 }}>
                        <b><bdi>{l.name}</bdi></b>
                        <span className="sr-meta">
                          {l.part_number && <span className="mono">{l.part_number} · </span>}
                          <span className="num">{t('Sold')} {l.sold} {l.unit || ''}</span>
                          {l.already > 0 && <span className="num"> · {t('Returned')} {l.already}</span>}
                          {none ? <span className="full"> · {t('Fully returned')}</span> : <span className="num"> · {t('max')} {l.max}</span>}
                        </span>
                      </span>
                    </label>
                    {(err('name', i) || err('product_id', i)) && <div className="errmsg">{err('name', i) || err('product_id', i)}</div>}
                  </td>
                  <td data-l={t('Return qty')}>
                    <NumInput label={`${t('Return quantity')} ${l.name}`} value={l.quantity} dp={4} invalid={!!err('quantity', i)} disabled={!editable}
                      onCommit={(n) => upd(i, { ...l, quantity: Math.max(0, Math.min(n, l.max)) })} />
                    {err('quantity', i) && <div className="errmsg">{err('quantity', i)}</div>}
                  </td>
                  <td data-l={t('Unit price')}>
                    {priceEditable ? (
                      <>
                        <NumInput label={`${t('Unit price')} ${l.name}`} value={l.unit_price} dp={4} invalid={!!err('unit_price', i)} disabled={!editable} onCommit={(n) => upd(i, { ...l, ...setUnitPrice(l, n, vat) })} />
                        {err('unit_price', i) && <div className="errmsg">{err('unit_price', i)}</div>}
                      </>
                    ) : <span className="num" style={{ display: 'block', textAlign: 'end' }}>{fmtMoney(showVat ? l.unit_price : l.unit_price_with_vat)}</span>}
                  </td>
                  <td data-l={t('Disc.')}>
                    {priceEditable ? (
                      <>
                        <NumInput label={`${t('Unit discount')} ${l.name}`} value={l.unit_discount} dp={4} invalid={!!err('unit_discount', i)} disabled={!editable} onCommit={(n) => upd(i, { ...l, ...setUnitDiscount(l, n, vat) })} />
                        {err('unit_discount', i) && <div className="errmsg">{err('unit_discount', i)}</div>}
                      </>
                    ) : <span className="num muted" style={{ display: 'block', textAlign: 'end' }}>{(showVat ? l.unit_discount : l.unit_discount_with_vat) ? fmtMoney(showVat ? l.unit_discount : l.unit_discount_with_vat) : '—'}</span>}
                  </td>
                  <td className="r num lt" data-l={t('Amount')} style={{ fontWeight: 600 }}>{l.selected ? fmtMoney(lineTotalWithVat(l)) : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {errors.product_id && <div className="errmsg" style={{ padding: '6px 4px' }}><Icon name="alert" size="xs" />{errors.product_id}</div>}
    </div>
  );
}
