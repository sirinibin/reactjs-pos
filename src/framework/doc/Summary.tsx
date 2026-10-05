import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/ui/Icon';
import { Button, IconButton } from '@/ui/Button';
import { fmtMoney, parseNumber, toRfc3339 } from '@/lib/format';
import { discountWithVat, discountWithoutVat, newLineKey, paymentSummary, type PaymentRow, type Totals } from './calc';

export interface SummaryValues {
  vat_percent: number;
  shipping_handling_fees: number;
  discount: number;
  discount_with_vat: number;
  auto_rounding_amount: boolean;
  rounding_amount: number;
  cash_discount: number;
}

function Money({ label, value, onChange, disabled, hint }: { label: string; value: number; onChange: (n: number) => void; disabled?: boolean; hint?: string }) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <label className="row" style={{ justifyContent: 'space-between', padding: '4px 0', flexWrap: 'nowrap', color: 'var(--text-2)' }}>
      <span>{label}{hint && <span className="muted" style={{ fontSize: 11 }}> · {hint}</span>}</span>
      <input className="inp num" style={{ width: 120, height: 30, textAlign: 'end' }} inputMode="decimal" disabled={disabled} aria-label={label}
        value={draft ?? String(value || 0)} onFocus={(e) => { setDraft(String(value || 0)); e.currentTarget.select(); }}
        onChange={(e) => setDraft(e.target.value)} onBlur={() => { if (draft !== null) onChange(parseNumber(draft)); setDraft(null); }}
        onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()} />
    </label>
  );
}

export function BillSummary({ totals, values, onChange, features = {}, locked, syncing }: {
  totals: Totals;
  values: SummaryValues;
  onChange: (patch: Partial<SummaryValues>) => void;
  features?: { shipping?: boolean; discount?: boolean; rounding?: boolean; vatEditable?: boolean; cashDiscount?: boolean; hideVat?: boolean };
  locked?: boolean;
  syncing?: boolean;
}) {
  const { t } = useTranslation();
  const f = { shipping: true, discount: true, rounding: true, vatEditable: true, cashDiscount: false, ...features };
  const vat = values.vat_percent;
  return (
    <div className="sum" aria-live="polite">
      <div className="row" style={{ justifyContent: 'space-between', padding: '5px 0', color: 'var(--text-2)' }}><span>{t('Subtotal')}</span><b className="num" style={{ color: 'var(--text)' }}>{fmtMoney(totals.total)}</b></div>
      {f.shipping && <Money label={t('Shipping & handling')} value={values.shipping_handling_fees} disabled={locked} onChange={(n) => onChange({ shipping_handling_fees: n })} />}
      {f.discount && (
        <>
          <Money label={t('Discount')} hint={t('ex VAT')} value={values.discount} disabled={locked} onChange={(n) => onChange({ discount: n, discount_with_vat: discountWithVat(n, vat) })} />
          {!f.hideVat && <Money label={t('Discount')} hint={t('incl. VAT')} value={values.discount_with_vat} disabled={locked} onChange={(n) => onChange({ discount_with_vat: n, discount: discountWithoutVat(n, vat) })} />}
        </>
      )}
      {!f.hideVat && (
        <div className="row" style={{ justifyContent: 'space-between', padding: '5px 0', color: 'var(--text-2)', flexWrap: 'nowrap' }}>
          <span className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
            {t('VAT')}
            {f.vatEditable ? (
              <input className="inp num" style={{ width: 62, height: 28, textAlign: 'end' }} aria-label={t('VAT %')} inputMode="decimal" disabled={locked}
                defaultValue={vat} key={vat} onBlur={(e) => onChange({ vat_percent: Math.max(0, parseNumber(e.target.value)) })} />
            ) : <span className="num">{vat}</span>}%
          </span>
          <b className="num" style={{ color: 'var(--text)' }}>{fmtMoney(totals.vat_price)}</b>
        </div>
      )}
      {f.rounding && (
        <div className="row" style={{ justifyContent: 'space-between', padding: '4px 0', color: 'var(--text-2)', flexWrap: 'nowrap' }}>
          <label className="checkline"><input type="checkbox" className="chk" checked={values.auto_rounding_amount} onChange={(e) => onChange({ auto_rounding_amount: e.target.checked })} disabled={locked} />{t('Auto rounding')}</label>
          {values.auto_rounding_amount ? <b className="num" style={{ color: 'var(--text)' }}>{totals.rounding_amount >= 0 ? '+' : '−'} {fmtMoney(Math.abs(totals.rounding_amount))}</b> : (
            <input className="inp num" style={{ width: 120, height: 30, textAlign: 'end' }} aria-label={t('Rounding')} defaultValue={values.rounding_amount} key={values.rounding_amount}
              onBlur={(e) => onChange({ rounding_amount: parseNumber(e.target.value) })} disabled={locked} />
          )}
        </div>
      )}
      <div className="tot">
        <span>{t('Total')}{syncing && <span className="spin" style={{ marginInlineStart: 8, width: 11, height: 11 }} title={t('Syncing with server')} />}</span>
        <b className="num">{fmtMoney(totals.net_total)}</b>
      </div>
      {f.cashDiscount && <Money label={t('Cash discount')} value={values.cash_discount} onChange={(n) => onChange({ cash_discount: n })} />}
    </div>
  );
}

export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'debit_card', label: 'Debit card' },
  { value: 'credit_card', label: 'Credit card' },
  { value: 'bank_card', label: 'Bank card' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'bank_cheque', label: 'Bank cheque' },
];
const SYSTEM_METHODS: Record<string, string> = { sales_return: 'Sales return', purchase: 'Purchase', customer_account: 'Customer account', purchase_return: 'Purchase return', vendor_account: 'Vendor account' };

export const blankPayment = (amount = 0): PaymentRow => ({ key: newLineKey(), date_str: toRfc3339(new Date()), amount, method: 'cash', deleted: false });

export function PaymentsEditor({ payments, onChange, netTotal, cashDiscount = 0, errors = {}, methods = PAYMENT_METHODS, readOnly, labels }: {
  payments: PaymentRow[]; onChange: (p: PaymentRow[]) => void; netTotal: number; cashDiscount?: number; errors?: Record<string, string>;
  methods?: { value: string; label: string }[] | undefined; readOnly?: boolean;
  /** Override wording, e.g. refunds: { due: 'Still to refund', done: 'Refunded', over: 'Over-refunded' }. */
  labels?: { due?: string; done?: string; over?: string; add?: string };
}) {
  const { t } = useTranslation();
  const s = paymentSummary(netTotal, cashDiscount, payments);
  const visible = payments.map((p, i) => ({ p, i })).filter((x) => !x.p.deleted);
  const set = (i: number, patch: Partial<PaymentRow>) => onChange(payments.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const del = (i: number) => onChange(payments[i].id ? payments.map((x, j) => (j === i ? { ...x, deleted: true } : x)) : payments.filter((_, j) => j !== i));
  return (
    <div className="stack" style={{ gap: 8 }}>
      {visible.length === 0 && <div className="muted" style={{ fontSize: 12.5 }}>{t('No payment recorded — the full amount stays on credit.')}</div>}
      {visible.map(({ p, i }) => {
        const system = !!SYSTEM_METHODS[p.method] || !!p.reference_type;
        return (
          <div key={p.key} className="pay-row">
            <select className="inp" aria-label={t('Payment method')} value={p.method} disabled={readOnly || system} onChange={(e) => set(i, { method: e.target.value })}>
              {system && <option value={p.method}>{t(SYSTEM_METHODS[p.method] || p.method)}</option>}
              {(methods || PAYMENT_METHODS).map((m) => <option key={m.value} value={m.value}>{t(m.label)}</option>)}
            </select>
            <input className={`inp num${errors[`payment_amount_${i}`] ? ' err' : ''}`} style={{ textAlign: 'end' }} inputMode="decimal" aria-label={t('Amount paid')} disabled={readOnly || system}
              defaultValue={p.amount} key={`${p.key}-${p.amount}`} onBlur={(e) => set(i, { amount: parseNumber(e.target.value) })} />
            {!readOnly && !system ? <IconButton icon="trash" label={t('Remove payment')} onClick={() => del(i)} /> : <span title={p.reference_code}><Icon name="lock" size="s" /></span>}
            {p.reference_code && <div className="hint" style={{ gridColumn: '1/-1' }}>{t('Ref')}: {p.reference_code}</div>}
            {(errors[`payment_amount_${i}`] || errors[`payment_method_${i}`] || errors[`payment_date_${i}`]) && <div className="errmsg" style={{ gridColumn: '1/-1' }}>{errors[`payment_amount_${i}`] || errors[`payment_method_${i}`] || errors[`payment_date_${i}`]}</div>}
          </div>
        );
      })}
      {!readOnly && (
        <div className="row">
          <Button variant="ghost" size="sm" icon="plus" onClick={() => onChange([...payments, blankPayment(Math.max(0, s.balance))])}>{t(labels?.add || 'Add payment')}</Button>
          {s.balance > 0 && <Button variant="ghost" size="sm" icon="check" onClick={() => {
            const first = visible.find((x) => !SYSTEM_METHODS[x.p.method] && !x.p.reference_type);
            if (first) set(first.i, { amount: (first.p.amount || 0) + s.balance });
            else onChange([...payments, blankPayment(s.balance)]);
          }}>{t('Mark fully paid')}</Button>}
        </div>
      )}
      {errors.total_payment && <div className="errmsg">{errors.total_payment}</div>}
      <div className={`bal ${s.balance > 0.004 ? 'due' : 'ok'}`}>
        <span>{s.balance > 0.004 ? t(labels?.due || 'Balance due') : s.balance < -0.004 ? t(labels?.over || 'Change to return') : t(labels?.done || 'Fully paid')}</span>
        <span className="num">{fmtMoney(Math.abs(s.balance))}</span>
      </div>
    </div>
  );
}
