import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth, useStoreId } from '@/auth/AuthContext';
import { Drawer } from '@/ui/Overlay';
import { Button } from '@/ui/Button';
import { Banner } from '@/ui/Misc';
import { Checkbox, Field, Input, Select } from '@/ui/Field';
import { useToast } from '@/ui/Toast';
import { papi } from '../api';
import { normPhone } from '../logic';
import type { RFQSupplier } from '../types';
import { ChipsInput } from './common';

export const SUPPLIERS = '/v1/rfq-suppliers';

export interface SupplierFormValues { name: string; phone: string; phone2: string; address: string; website: string; email: string; purchase_market: string; rating: string; is_active: boolean; categories: string[] }
const toForm = (s?: Partial<RFQSupplier> | null): SupplierFormValues => ({
  name: s?.name || '', phone: s?.phone || '', phone2: s?.phone2 || '', address: s?.address || '', website: s?.website || '', email: s?.email || '',
  purchase_market: s?.purchase_market || '', rating: s?.rating !== undefined && s?.rating !== null ? String(s.rating) : '', is_active: s?.is_active ?? true, categories: s?.categories || [],
});

/** Client validation (§6.2): name, WhatsApp number and purchase market are required; rating 0–5. */
export function validateSupplier(v: SupplierFormValues, marketRequired: boolean): Record<string, string> {
  const e: Record<string, string> = {};
  if (!v.name.trim()) e.name = 'Name is required';
  if (!normPhone(v.phone)) e.phone = 'WhatsApp number is required';
  else if (normPhone(v.phone).length < 8) e.phone = 'Enter the full international number (e.g. 966501234567)';
  if (marketRequired && !v.purchase_market) e.purchase_market = 'Market is required — choose where this supplier sells';
  const r = Number(v.rating || 0);
  if (!Number.isFinite(r) || r < 0 || r > 5) e.rating = 'Rating must be between 0 and 5';
  if (v.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) e.email = 'Enter a valid email address';
  return e;
}

export function supplierBody(v: SupplierFormValues, storeId: string) {
  return {
    name: v.name.trim(), phone: normPhone(v.phone), phone2: normPhone(v.phone2), address: v.address.trim(), website: v.website.trim(), email: v.email.trim(),
    purchase_market: v.purchase_market, rating: parseFloat(v.rating || '0') || 0, is_active: v.is_active, categories: v.categories, store_id: storeId,
  };
}

/** Create/edit an RFQ supplier (drawer). POST or PUT by id; server errors shown inline. */
export function SupplierForm({ open, supplier, onClose, onSaved }: { open: boolean; supplier?: Partial<RFQSupplier> | null; onClose: () => void; onSaved?: (s: RFQSupplier) => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const storeId = useStoreId();
  const { setting } = useAuth();
  const markets: string[] = setting<string[]>('purchase_markets', []) || [];
  const [v, setV] = useState<SupplierFormValues>(toForm(supplier));
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setV(toForm(supplier)); setErrs({}); } }, [open, supplier]);
  const set = (p: Partial<SupplierFormValues>) => { setV((x) => ({ ...x, ...p })); setErrs({}); };
  const editing = !!supplier?.id;

  const save = async () => {
    const e = validateSupplier(v, markets.length > 0);
    if (Object.keys(e).length) { setErrs(Object.fromEntries(Object.entries(e).map(([k, m]) => [k, t(m)]))); return; }
    setBusy(true);
    try {
      const body = supplierBody(v, storeId);
      const saved = editing ? await papi.put<RFQSupplier>(`${SUPPLIERS}/${supplier!.id}`, body, { store_id: storeId }) : await papi.post<RFQSupplier>(SUPPLIERS, body, { store_id: storeId });
      toast.success(editing ? t('Supplier saved') : t('Supplier added'));
      onSaved?.(saved);
      onClose();
    } catch (err) {
      const m = (err as Error).message;
      setErrs(/phone/i.test(m) ? { phone: m } : { server: m });
    } finally { setBusy(false); }
  };

  return (
    <Drawer open={open} onClose={onClose} title={editing ? t('Edit supplier') : t('Add supplier')} width={520}
      footer={<><Button variant="ghost" onClick={onClose}>{t('Cancel')}</Button><Button variant="primary" icon="check" loading={busy} onClick={save}>{editing ? t('Save changes') : t('Add supplier')}</Button></>}>
      <form className="grid-2c" noValidate onSubmit={(e) => { e.preventDefault(); save(); }}>
        {errs.server && <div className="span2"><Banner tone="crit">{errs.server}</Banner></div>}
        <Field label={t('Name')} required error={errs.name} className="span2">{(id, d) => <Input id={id} aria-describedby={d} invalid={!!errs.name} value={v.name} onChange={(e) => set({ name: e.target.value })} />}</Field>
        <Field label={t('WhatsApp number')} required error={errs.phone} hint={t('International format without +, e.g. 966501234567')}>{(id, d) => <Input id={id} aria-describedby={d} type="tel" className="num" invalid={!!errs.phone} value={v.phone} onChange={(e) => set({ phone: e.target.value })} />}</Field>
        <Field label={t('WhatsApp number 2')}>{(id) => <Input id={id} type="tel" className="num" value={v.phone2} onChange={(e) => set({ phone2: e.target.value })} />}</Field>
        <Field label={t('Address')} className="span2">{(id) => <Input id={id} value={v.address} onChange={(e) => set({ address: e.target.value })} />}</Field>
        <Field label={t('Website')}>{(id) => <Input id={id} type="url" value={v.website} onChange={(e) => set({ website: e.target.value })} />}</Field>
        <Field label={t('Email')} error={errs.email} hint={t('Auto-filled from website if left blank')}>{(id, d) => <Input id={id} aria-describedby={d} type="email" value={v.email} onChange={(e) => set({ email: e.target.value })} />}</Field>
        <Field label={t('Purchase market')} required={markets.length > 0} error={errs.purchase_market} hint={markets.length ? undefined : t('Add purchase markets in Procurement settings → Google')}>
          {(id, d) => <Select id={id} aria-describedby={d} invalid={!!errs.purchase_market} value={v.purchase_market} onChange={(e) => set({ purchase_market: e.target.value })} placeholder={t('Select market')}
            options={[...markets, ...(v.purchase_market && !markets.includes(v.purchase_market) ? [v.purchase_market] : [])].map((m) => ({ value: m, label: m }))} />}
        </Field>
        <Field label={t('Rating')} error={errs.rating}>{(id, d) => <Input id={id} aria-describedby={d} type="number" min={0} max={5} step={0.1} className="num" value={v.rating} onChange={(e) => set({ rating: e.target.value })} />}</Field>
        <div className="span2"><Checkbox label={t('Active (include in RFQ forwarding)')} checked={v.is_active} onChange={(e) => set({ is_active: e.target.checked })} /></div>
        <Field label={t('Categories')} className="span2" hint={t('Categories decide which RFQs this supplier receives. Press Enter to add.')}>{() => <ChipsInput label={t('Categories')} value={v.categories} onChange={(c) => set({ categories: c })} placeholder={t('e.g. Brake parts')} />}</Field>
        <button type="submit" hidden />
      </form>
    </Drawer>
  );
}
