import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/api/client';
import { useStoreId } from '@/auth/AuthContext';
import { Modal } from '@/ui/Overlay';
import { Button } from '@/ui/Button';
import { Field, Input, Select, Textarea } from '@/ui/Field';
import { Banner } from '@/ui/Misc';
import { useToast } from '@/ui/Toast';
import { fmtMoney, parseNumber, toRfc3339 } from '@/lib/format';
import { PAYMENT_METHODS } from './Summary';

/** Record a payment against a document (sales-payment, purchase-payment, return refunds…). */
export function ReceivePaymentModal({ open, onClose, endpoint, parent, balance, title, invalidate = [], methods = PAYMENT_METHODS }: {
  open: boolean; onClose: () => void; endpoint: string; parent: Record<string, any>; balance: number; title: string; invalidate?: string[];
  methods?: { value: string; label: string }[];
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const storeId = useStoreId();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [date, setDate] = useState('');
  const [ref, setRef] = useState('');
  const [desc, setDesc] = useState('');
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) { setAmount(String(Math.max(0, balance))); setMethod('cash'); setDate(toRfc3339(new Date()).slice(0, 16)); setRef(''); setDesc(''); setErrs({}); }
  }, [open, balance]);

  const submit = async () => {
    const a = parseNumber(amount);
    const e: Record<string, string> = {};
    if (!(a > 0)) e.amount = t('Enter an amount greater than zero.');
    else if (a > balance + 0.004) e.amount = t('Amount can’t exceed the balance due ({{b}}).', { b: fmtMoney(balance) });
    if (!date) e.date_str = t('Date is required');
    setErrs(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      await api.post(endpoint, { ...parent, store_id: storeId, amount: a, method, date_str: toRfc3339(new Date(date)), bank_reference: ref || undefined, description: desc || undefined }, { search: { store_id: storeId } });
      [endpoint, ...invalidate].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      toast.success(t('Payment of {{a}} recorded', { a: fmtMoney(a) }));
      onClose();
    } catch (err) {
      if (err instanceof ApiError) setErrs(err.errors);
      else toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const generic = Object.entries(errs).filter(([k]) => !['amount', 'date_str', 'method'].includes(k));
  return (
    <Modal open={open} onClose={onClose} title={title} width={480}
      footer={<><Button variant="ghost" onClick={onClose}>{t('Cancel')}</Button><Button variant="primary" icon="check" loading={busy} onClick={submit}>{t('Record payment')}</Button></>}>
      <div className="stack" style={{ gap: 14 }}>
        <div className="bal due"><span>{t('Balance due')}</span><span className="num">{fmtMoney(balance)}</span></div>
        {generic.length > 0 && <Banner tone="crit">{generic.map(([, m]) => m).join(' · ')}</Banner>}
        <div className="grid-2c">
          <Field label={t('Amount')} required error={errs.amount}>{(id, d) => <Input id={id} aria-describedby={d} inputMode="decimal" className="num" value={amount} onChange={(e) => setAmount(e.target.value)} invalid={!!errs.amount} data-autofocus />}</Field>
          <Field label={t('Method')} required error={errs.method || errs.payment_method}>{(id) => <Select id={id} value={method} onChange={(e) => setMethod(e.target.value)} options={methods.map((m) => ({ ...m, label: t(m.label) }))} />}</Field>
          <Field label={t('Date')} required error={errs.date_str}>{(id) => <Input id={id} type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />}</Field>
          <Field label={t('Bank reference')}>{(id) => <Input id={id} value={ref} onChange={(e) => setRef(e.target.value)} />}</Field>
          <Field label={t('Note')} className="span2">{(id) => <Textarea id={id} rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} />}</Field>
        </div>
      </div>
    </Modal>
  );
}
