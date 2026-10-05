import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AsyncPicker } from '@/ui/AsyncPicker';
import { IconButton } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { EmptyState } from '@/ui/Misc';
import { fmtMoney, parseNumber } from '@/lib/format';
import {
  lineTotal, lineTotalWithVat, setDiscountPercent, setLineDiscountWithVat, setLineTotalWithVat, setQuantity, setUnitDiscount,
  setUnitPrice, setUnitPriceWithVat, type DocLine,
} from './calc';
import { addProductLine, productByBarcode, productToLine, productToOption, searchProducts, partLabel, type PriceSource, type ProductHit } from './lookups';

export type LineColumn = 'unit_price' | 'unit_price_with_vat' | 'unit_discount' | 'line_discount_with_vat' | 'discount_percent' | 'line_total' | 'line_total_with_vat' | 'purchase_price' | 'warehouse';

export interface LinesEditorProps {
  lines: DocLine[];
  onChange: (lines: DocLine[]) => void;
  vat: number;
  storeId: string;
  priceSource: PriceSource;
  columns?: LineColumn[];
  errors?: Record<string, string>;
  warnings?: Record<string, string>;
  readOnly?: boolean;
  /** Lock price/qty/discount edits (e.g. ZATCA-reported sales). */
  locked?: boolean;
  warehouses?: { id: string; code: string; name: string }[];
  /** Show a stock warning when quantity exceeds stock (sales). */
  checkStock?: boolean;
  /** Return documents: max quantity per line. */
  maxQty?: (l: DocLine) => number | undefined;
  allowAdd?: boolean;
  searchExtra?: Record<string, string | number>;
  onToast?: (msg: string, kind?: 'error' | 'success') => void;
}

const DEFAULT_COLS: LineColumn[] = ['unit_price', 'unit_discount', 'line_total', 'line_total_with_vat'];

function NumCell({ value, onCommit, label, invalid, disabled, dp = 2 }: { value: number; onCommit: (n: number) => void; label: string; invalid?: boolean; disabled?: boolean; dp?: number }) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? (value === 0 ? '0' : String(Number(value.toFixed(dp))));
  return (
    <input
      className={`cell num${invalid ? ' err' : ''}`}
      inputMode="decimal"
      aria-label={label}
      aria-invalid={invalid || undefined}
      disabled={disabled}
      value={shown}
      onFocus={(e) => { setDraft(shown); e.currentTarget.select(); }}
      onChange={(e) => { setDraft(e.target.value); }}
      onBlur={() => { if (draft !== null) onCommit(parseNumber(draft)); setDraft(null); }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { (e.currentTarget as HTMLInputElement).blur(); focusNext(e.currentTarget); }
        if (e.key === 'Escape') { setDraft(null); (e.currentTarget as HTMLInputElement).blur(); }
      }}
    />
  );
}

/** Enter moves to the same column on the next row, like a spreadsheet. */
function focusNext(el: HTMLElement) {
  const td = el.closest('td');
  const tr = td?.closest('tr');
  if (!td || !tr) return;
  const idx = Array.from(tr.children).indexOf(td);
  const next = tr.nextElementSibling?.children[idx]?.querySelector<HTMLInputElement>('input,select');
  (next || document.getElementById('doc-add-item'))?.focus();
}

export function LinesEditor(p: LinesEditorProps) {
  const { t } = useTranslation();
  const cols = p.columns || DEFAULT_COLS;
  const has = (c: LineColumn) => cols.includes(c);
  const editable = !p.readOnly && !p.locked;
  const upd = (i: number, l: DocLine) => p.onChange(p.lines.map((x, j) => (j === i ? l : x)));
  const remove = (i: number) => p.onChange(p.lines.filter((_, j) => j !== i));
  const add = (h: ProductHit) => p.onChange(addProductLine(p.lines, productToLine(h, p.storeId, p.priceSource, p.vat)));
  const [scan, setScan] = useState('');

  const onScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scan.trim()) return;
    const hit = await productByBarcode(p.storeId, scan);
    if (hit) { add(hit); p.onToast?.(`${t('Added')} ${hit.name}`, 'success'); }
    else p.onToast?.(t('No product with that barcode.'), 'error');
    setScan('');
  };

  const head = useMemo(() => [
    { k: 'unit_price', h: t('Unit price'), sub: t('ex VAT') },
    { k: 'unit_price_with_vat', h: t('Unit price'), sub: t('incl. VAT') },
    { k: 'purchase_price', h: t('Cost'), sub: t('ex VAT') },
    { k: 'unit_discount', h: t('Disc.'), sub: t('per unit') },
    { k: 'line_discount_with_vat', h: t('Line disc.'), sub: t('incl. VAT') },
    { k: 'discount_percent', h: t('Disc %'), sub: '' },
    { k: 'line_total', h: t('Amount'), sub: t('ex VAT') },
    { k: 'line_total_with_vat', h: t('Amount'), sub: t('incl. VAT') },
  ].filter((x) => has(x.k as LineColumn)), [cols, t]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div style={{ overflowX: 'auto' }}>
        <table className="lines" aria-label={t('Items')}>
          <thead>
            <tr>
              <th style={{ width: 30 }}>#</th>
              <th>{t('Item')}</th>
              {has('warehouse') && p.warehouses && p.warehouses.length > 0 && <th style={{ width: 130 }}>{t('Warehouse')}</th>}
              <th className="r" style={{ width: 90 }}>{t('Qty')}</th>
              {head.map((x) => <th key={x.k} className="r" style={{ width: 112 }}>{x.h}{x.sub && <div className="muted" style={{ fontWeight: 500, fontSize: 10.5 }}>{x.sub}</div>}</th>)}
              {editable && <th style={{ width: 40 }} aria-label={t('Remove')} />}
            </tr>
          </thead>
          <tbody>
            {p.lines.length === 0 && (
              <tr><td colSpan={10}><EmptyState icon="box" title={t('No items yet')}>{t('Search below, scan a barcode, or import from another document.')}</EmptyState></td></tr>
            )}
            {p.lines.map((l, i) => {
              const err = (k: string) => p.errors?.[`${k}_${i}`];
              const max = p.maxQty?.(l);
              const overStock = p.checkStock && !l.is_service && l.product_id && l.stock !== undefined && l.quantity > (l.stock || 0);
              const belowCost = (l.purchase_unit_price || 0) > 0 && l.unit_price - l.unit_discount < (l.purchase_unit_price || 0) && p.priceSource !== 'purchase';
              return (
                <tr className="ln" key={l.key}>
                  <td className="ix muted">{i + 1}</td>
                  <td className="pn">
                    {editable && !l.product_id ? (
                      <input className={`cell${err('name') ? ' err' : ''}`} style={{ textAlign: 'start' }} aria-label={t('Item name')} value={l.name} onChange={(e) => upd(i, { ...l, name: e.target.value })} />
                    ) : <b>{l.name}</b>}
                    <span>
                      {l.part_number && <span className="mono">{partLabel(l as any)}</span>}
                      {p.checkStock && l.product_id && !l.is_service && (
                        <> · <span className={`stk${overStock ? ' low' : ''}`}>{overStock && '⚠ '}{l.stock ?? 0} {l.unit || ''} {t('in stock')}</span></>
                      )}
                      {belowCost && <> · <span className="stk low">{t('Below cost')}</span></>}
                      {l.quantity_returned ? <> · <span className="muted">{l.quantity_returned} {t('returned')}</span></> : null}
                    </span>
                    {(err('name') || err('product_id')) && <div className="errmsg">{err('name') || err('product_id')}</div>}
                    {p.warnings?.[`quantity_${i}`] && <div className="hint" style={{ color: 'var(--warn)' }}>{p.warnings[`quantity_${i}`]}</div>}
                  </td>
                  {has('warehouse') && p.warehouses && p.warehouses.length > 0 && (
                    <td data-l={t('Warehouse')}>
                      <select className="cell" style={{ textAlign: 'start' }} disabled={!editable} aria-label={t('Warehouse')} value={l.warehouse_id || ''}
                        onChange={(e) => { const w = p.warehouses!.find((x) => x.id === e.target.value); upd(i, { ...l, warehouse_id: w?.id || null, warehouse_code: w?.code || null }); }}>
                        <option value="">{t('Main store')}</option>
                        {p.warehouses.map((w) => <option key={w.id} value={w.id}>{w.code} · {w.name}</option>)}
                      </select>
                    </td>
                  )}
                  <td data-l={t('Qty')}>
                    <NumCell label={t('Quantity')} value={l.quantity} invalid={!!err('quantity')} disabled={!editable} dp={4}
                      onCommit={(n) => upd(i, setQuantity(l, max !== undefined ? Math.min(n, max) : n, p.vat))} />
                    {err('quantity') && <div className="errmsg">{err('quantity')}</div>}
                    {max !== undefined && <div className="hint">{t('max')} {max}</div>}
                  </td>
                  {has('unit_price') && <td data-l={t('Unit price')}><NumCell label={t('Unit price')} value={l.unit_price} invalid={!!err('unit_price')} disabled={!editable} dp={4} onCommit={(n) => upd(i, setUnitPrice(l, n, p.vat))} />{err('unit_price') && <div className="errmsg">{err('unit_price')}</div>}</td>}
                  {has('unit_price_with_vat') && <td data-l={t('Unit price incl. VAT')}><NumCell label={t('Unit price incl. VAT')} value={l.unit_price_with_vat} disabled={!editable} dp={4} onCommit={(n) => upd(i, setUnitPriceWithVat(l, n, p.vat))} /></td>}
                  {has('purchase_price') && <td data-l={t('Cost')} className="r num muted">{fmtMoney(l.purchase_unit_price || 0)}</td>}
                  {has('unit_discount') && <td data-l={t('Disc.')}><NumCell label={t('Unit discount')} value={l.unit_discount} invalid={!!err('unit_discount')} disabled={!editable} dp={4} onCommit={(n) => upd(i, setUnitDiscount(l, n, p.vat))} />{err('unit_discount') && <div className="errmsg">{err('unit_discount')}</div>}</td>}
                  {has('line_discount_with_vat') && <td data-l={t('Line disc.')}><NumCell label={t('Line discount incl. VAT')} value={l.line_discount_with_vat || 0} disabled={!editable} onCommit={(n) => upd(i, setLineDiscountWithVat(l, n, p.vat))} /></td>}
                  {has('discount_percent') && <td data-l={t('Disc %')}><NumCell label={t('Discount percent')} value={l.unit_discount_percent} disabled={!editable} onCommit={(n) => upd(i, setDiscountPercent(l, n, p.vat))} /></td>}
                  {has('line_total') && <td className="r num lt" data-l={t('Amount')} style={{ fontWeight: 600 }}>{fmtMoney(lineTotal(l))}</td>}
                  {has('line_total_with_vat') && (
                    <td data-l={t('Amount incl. VAT')} className={has('line_total') ? 'r num' : 'r num lt'}>
                      {editable ? <NumCell label={t('Amount incl. VAT')} value={lineTotalWithVat(l)} onCommit={(n) => upd(i, setLineTotalWithVat(l, n, p.vat))} /> : fmtMoney(lineTotalWithVat(l))}
                    </td>
                  )}
                  {editable && (
                    <td>
                      <IconButton icon="trash" label={`${t('Remove')} ${l.name}`} disabled={!!l.quantity_returned}
                        title={l.quantity_returned ? t('This item has returns and can’t be removed.') : undefined} onClick={() => remove(i)} />
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {editable && p.allowAdd !== false && (
        <div className="row" style={{ padding: '10px 4px 0', alignItems: 'flex-start' }}>
          <div style={{ flex: '1 1 320px', minWidth: 0 }}>
            <AsyncPicker<ProductHit>
              id="doc-add-item"
              value={null}
              resetOnPick
              aria-label={t('Add item')}
              placeholder={t('Add item — name, part #, brand…  (F2)')}
              load={async (q, s) => (await searchProducts(p.storeId, q, s, p.searchExtra)).map((h) => productToOption(h, p.storeId, p.priceSource))}
              onChange={(o) => o && add(o.data)}
            />
          </div>
          <form onSubmit={onScan} className="inpw hide-sm" style={{ width: 200 }}>
            <Icon name="qr" size="s" />
            <input className="inp" value={scan} onChange={(e) => setScan(e.target.value)} placeholder={t('Scan barcode')} aria-label={t('Scan barcode')} />
          </form>
        </div>
      )}
      {p.errors?.product_id && <div className="errmsg" style={{ padding: '6px 4px' }}><Icon name="alert" size="xs" />{p.errors.product_id}</div>}
    </div>
  );
}
