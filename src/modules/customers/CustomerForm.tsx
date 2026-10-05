import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/api/client';
import { useRecord } from '@/api/hooks';
import { useAuth, useStoreId } from '@/auth/AuthContext';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Checkbox, Field, Input, Select, Textarea } from '@/ui/Field';
import { Banner, ErrorState, Segmented, Skeleton, useConfirm } from '@/ui/Misc';
import { KeyValues, ObjectBody, ObjectHeader, SidePanel } from '@/ui/ObjectPage';
import { useToast } from '@/ui/Toast';
import { usePageMeta } from '@/shell/Workspace';
import { fmtDateTime, fmtMoney } from '@/lib/format';
import { currentLang } from '@/i18n';
import { CUSTOMER, deleteCustomerImage, translateToArabic, uploadCustomerImage } from './api';
import { countryName, countryOptions } from './countries';
import { ImageGallery } from './ImageGallery';
import { blankCustomerForm, customerFormToBody, customerToForm, stat, validateCustomer, type Customer, type CustomerForm, type NationalAddress } from './logic';
import { CUSTOMERS_PATH } from './CustomerList';
import './customers.css';

type AddrKey = keyof NationalAddress;

export function CustomerEditorPage() {
  const { id } = useParams();
  const q = useRecord<Customer>(CUSTOMER, id);
  if (id && q.isError) return <div className="pad"><ErrorState error={q.error} onRetry={() => q.refetch()} /></div>;
  if (id && !q.data) return <div className="pad stack"><Skeleton width={260} height={22} /><Skeleton height={300} /></div>;
  return <CustomerEditor key={id || 'new'} existing={id ? q.data : undefined} />;
}

export function CustomerEditor({ existing }: { existing?: Customer }) {
  const { t } = useTranslation();
  const nav = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const storeId = useStoreId();
  const { store, can, setting } = useAuth();
  const id = existing?.id;
  const [f, setF] = useState<CustomerForm>(() => (existing ? customerToForm(existing) : blankCustomerForm()));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [queued, setQueued] = useState<File[]>([]);
  const [images, setImages] = useState<string[]>(existing?.images || []);
  const [uploading, setUploading] = useState(false);
  const autoAr = useRef<Partial<Record<string, string>>>({});
  const [confirmDlg, ask] = useConfirm();
  const zatcaPhase2 = store?.zatca?.phase === '2';
  const autoTranslate = setting<boolean>('enable_auto_translation_to_arabic') === true;
  const title = id ? `${t('Edit')} ${existing?.name || ''}` : t('New customer');
  usePageMeta(title, 'users');

  const set = (patch: Partial<CustomerForm>) => {
    setF((x) => ({ ...x, ...patch }));
    setDirty(true);
    const keys = Object.keys(patch);
    if (keys.some((k) => errors[k])) setErrors((e) => { const n = { ...e }; keys.forEach((k) => delete n[k]); return n; });
  };
  const setAddr = (k: AddrKey, v: string) => {
    setF((x) => ({ ...x, national_address: { ...x.national_address, [k]: v } }));
    setDirty(true);
    const ek = `national_address_${k}`;
    if (errors[ek]) setErrors((e) => { const n = { ...e }; delete n[ek]; return n; });
  };

  /** Auto-translate an English field into its Arabic twin on blur (only if the twin is empty or was auto-filled). */
  const translate = async (text: string, current: string, apply: (v: string) => void, key: string) => {
    if (!autoTranslate || !text.trim()) return;
    if (current && current !== autoAr.current[key]) return;
    const ar = await translateToArabic(text);
    if (ar) { autoAr.current[key] = ar; apply(ar); }
  };

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const save = useCallback(async () => {
    const e = validateCustomer(f, { zatcaPhase2 });
    setErrors(e);
    if (Object.keys(e).length) { toast.error(t('Please fix the highlighted fields.')); return; }
    setSaving(true);
    try {
      const body = { store_id: storeId, ...customerFormToBody(f) };
      const r = id ? await api.put<Customer>(`${CUSTOMER}/${id}`, body, { search: { store_id: storeId } }) : await api.post<Customer>(CUSTOMER, body, { search: { store_id: storeId } });
      const newId = r.result?.id || id;
      let failed = 0;
      if (!id && newId && queued.length) {
        for (const file of queued) {
          try { await uploadCustomerImage(newId, storeId, file); } catch { failed++; }
        }
      }
      setDirty(false);
      qc.invalidateQueries({ queryKey: [CUSTOMER] });
      toast.success(id ? t('Saved') : t('{{name}} created', { name: r.result?.name || f.name }));
      if (failed) toast.error(t('{{n}} photo(s) could not be uploaded.', { n: failed }));
      if (newId) nav(`${CUSTOMERS_PATH}/${newId}`, { replace: !id });
    } catch (err) {
      if (err instanceof ApiError) { setErrors(err.errors); toast.error(err.message); }
      else toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }, [f, zatcaPhase2, storeId, id, queued, qc, toast, t, nav]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); void save(); }
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [save]);

  const cancel = () => nav(id ? `${CUSTOMERS_PATH}/${id}` : CUSTOMERS_PATH);

  const addImages = async (files: File[]) => {
    if (!id) { setQueued((q) => [...q, ...files]); setDirty(true); return; }
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of files) urls.push(await uploadCustomerImage(id, storeId, file));
      setImages((x) => [...x, ...urls.filter(Boolean)]);
      qc.invalidateQueries({ queryKey: [CUSTOMER] });
      toast.success(t('Photo uploaded'));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };
  const removeImage = async (url: string) => {
    if (!id || !(await ask(t('Remove this photo?'), { danger: true, confirmLabel: t('Remove') }))) return;
    try {
      await deleteCustomerImage(id, storeId, url);
      setImages((x) => x.filter((u) => u !== url));
      qc.invalidateQueries({ queryKey: [CUSTOMER] });
      toast.success(t('Photo removed'));
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const canSave = can('customers', id ? 'update' : 'create');
  const known = new Set(['name', 'name_in_arabic', 'code', 'email', 'phone', 'phone2', 'contact_person', 'country_code', 'vat_no', 'registration_number', 'remarks', 'credit_limit', 'opening_balance', 'opening_balance_type', 'opening_balance_date']);
  const otherErrors = Object.entries(errors).filter(([k, m]) => m && !known.has(k) && !k.startsWith('national_address_'));
  const lang = currentLang();
  const err = (k: string) => (errors[k] ? t(errors[k]) : undefined);

  const text = (k: keyof CustomerForm, label: string, opts: { required?: boolean; type?: string; dir?: 'rtl' | 'ltr'; inputMode?: 'numeric' | 'decimal' | 'tel' | 'email'; maxLength?: number; placeholder?: string; span2?: boolean; hint?: string; onBlur?: () => void } = {}) => (
    <Field label={t(label)} required={opts.required} error={err(k)} hint={opts.hint ? t(opts.hint) : undefined} className={opts.span2 ? 'span2' : undefined}>
      {(fid, d) => (
        <Input id={fid} aria-describedby={d} invalid={!!errors[k]} type={opts.type || 'text'} dir={opts.dir} inputMode={opts.inputMode} maxLength={opts.maxLength}
          placeholder={opts.placeholder ? t(opts.placeholder) : undefined} value={String(f[k] ?? '')} onChange={(e) => set({ [k]: e.target.value } as Partial<CustomerForm>)} onBlur={opts.onBlur} />
      )}
    </Field>
  );
  const addr = (k: AddrKey, label: string, opts: { dir?: 'rtl'; inputMode?: 'numeric'; maxLength?: number; onBlur?: () => void } = {}) => (
    <Field label={t(label)} error={err(`national_address_${k}`)}>
      {(fid, d) => <Input id={fid} aria-describedby={d} invalid={!!errors[`national_address_${k}`]} dir={opts.dir} inputMode={opts.inputMode} maxLength={opts.maxLength} value={f.national_address[k]} onChange={(e) => setAddr(k, e.target.value)} onBlur={opts.onBlur} />}
    </Field>
  );

  const actions = (
    <>
      <Button variant="ghost" onClick={cancel}>{t('Cancel')}</Button>
      <Button variant="primary" icon="check" onClick={() => void save()} loading={saving} disabled={!canSave}>
        {t(id ? 'Save changes' : 'Save')} <kbd className="hide-sm" style={{ background: 'rgba(255,255,255,.15)', color: '#fff', borderColor: 'rgba(255,255,255,.25)' }}>Ctrl S</kbd>
      </Button>
    </>
  );

  return (
    <>
      <ObjectHeader
        crumbs={[{ label: t('Sales'), to: CUSTOMERS_PATH }, { label: t('Customers'), to: CUSTOMERS_PATH }, ...(id ? [{ label: existing?.code || '', to: `${CUSTOMERS_PATH}/${id}` }] : []), { label: id ? t('Edit') : t('New') }]}
        icon="users" title={title} actions={actions}
      />
      <ObjectBody side={
        <SidePanel sections={[
          ...(id ? [{
            title: t('Credit & balances'), body: <KeyValues items={[
              { k: t('Credit balance'), v: <span className="num" style={(existing?.credit_balance || 0) > 0 ? { color: 'var(--warn)' } : undefined}>{fmtMoney(existing?.credit_balance)}</span> },
              { k: t('Qtn. credit invoices'), v: <span className="num">{fmtMoney(stat(existing, storeId, 'quotation_invoice_balance_amount'))}</span> },
              { k: t('Qtn. paid invoices'), v: <span className="num">{fmtMoney(stat(existing, storeId, 'quotation_invoice_paid_amount'))}</span> },
            ]} />,
          }] : []),
          { title: t('Tips'), body: <ul className="cu-tips"><li>{t('Leave ID empty to generate the next customer number.')}</li><li>{t('Names are saved in capitals.')}</li><li>{t('VAT customers get tax invoices; others get simplified invoices.')}</li></ul> },
          ...(id ? [{ title: t('Record'), body: <KeyValues items={[{ k: t('Created by'), v: existing?.created_by_name || '—' }, { k: t('Created at'), v: fmtDateTime(existing?.created_at) }, { k: t('Updated by'), v: existing?.updated_by_name || '—' }, { k: t('Updated at'), v: fmtDateTime(existing?.updated_at) }]} /> }] : []),
        ]} />
      }>
        {otherErrors.length > 0 && <Banner tone="crit"><b>{t('Couldn’t save.')}</b> {otherErrors.map(([, m]) => t(m)).join(' · ')}</Banner>}
        <form onSubmit={(e) => { e.preventDefault(); void save(); }} noValidate className="stack">
          <Card title={t('Identity')}>
            <div className="fgrid">
              {text('name', 'Name', { required: true, span2: true, onBlur: () => translate(f.name, f.name_in_arabic, (v) => set({ name_in_arabic: v }), 'name') })}
              {text('name_in_arabic', 'Name (Arabic)', { dir: 'rtl', span2: true, hint: autoTranslate ? 'Filled automatically from the English name — you can edit it.' : undefined })}
              {text('code', 'ID', { placeholder: 'Auto', maxLength: 40 })}
              {text('vat_no', 'VAT no.', { inputMode: 'numeric', maxLength: 15, placeholder: '3XXXXXXXXXXXXX3' })}
              {text('registration_number', 'C.R. no.', { maxLength: 20 })}
              <Field label={t('Country')} error={err('country_code')}>
                {(fid) => <Select id={fid} value={f.country_code} onChange={(e) => set({ country_code: e.target.value, country_name: countryName(e.target.value) })} options={countryOptions(lang)} placeholder={t('Not set')} />}
              </Field>
            </div>
          </Card>
          <Card title={t('Contact')}>
            <div className="fgrid">
              {text('contact_person', 'Contact person')}
              {text('phone', 'Phone', { type: 'tel', inputMode: 'tel', placeholder: '05XXXXXXXX' })}
              {text('phone2', 'Phone 2', { type: 'tel', inputMode: 'tel' })}
              {text('email', 'Email', { type: 'email', inputMode: 'email' })}
            </div>
          </Card>
          <Card title={t('National address')} sub={zatcaPhase2 && f.vat_no ? t('Required for ZATCA tax invoices: 4-digit building no. and 5-digit postal code.') : t('Printed on tax invoices.')}>
            <div className="fgrid">
              {addr('building_no', 'Building no.', { inputMode: 'numeric', maxLength: 4 })}
              {addr('street_name', 'Street', { onBlur: () => translate(f.national_address.street_name, f.national_address.street_name_arabic, (v) => setAddr('street_name_arabic', v), 'street') })}
              {addr('street_name_arabic', 'Street (Arabic)', { dir: 'rtl' })}
              {addr('unit_no', 'Unit no.', { inputMode: 'numeric' })}
              {addr('district_name', 'District', { onBlur: () => translate(f.national_address.district_name, f.national_address.district_name_arabic, (v) => setAddr('district_name_arabic', v), 'district') })}
              {addr('district_name_arabic', 'District (Arabic)', { dir: 'rtl' })}
              {addr('city_name', 'City', { onBlur: () => translate(f.national_address.city_name, f.national_address.city_name_arabic, (v) => setAddr('city_name_arabic', v), 'city') })}
              {addr('city_name_arabic', 'City (Arabic)', { dir: 'rtl' })}
              {addr('zipcode', 'Postal code', { inputMode: 'numeric', maxLength: 5 })}
              {addr('additional_no', 'Additional no.', { inputMode: 'numeric', maxLength: 4 })}
              {addr('short_code', 'Short address', { maxLength: 8 })}
            </div>
          </Card>
          <Card title={t('Credit & opening balance')}>
            <div className="fgrid">
              {text('credit_limit', 'Credit limit', { inputMode: 'decimal', placeholder: '0.00', hint: '0 = no limit' })}
              <div className="field span2 cu-ob-dir">
                <label>{t('Opening balance direction')}</label>
                <Segmented label={t('Opening balance direction')} value={f.opening_balance_type} onChange={(v) => set({ opening_balance_type: v })}
                  options={[{ value: 'receivable', label: t('Customer owes store') }, { value: 'payable', label: t('Store owes customer') }]} />
              </div>
              {text('opening_balance', 'Opening balance', { inputMode: 'decimal', placeholder: '0.00' })}
              {text('opening_balance_date', 'As of', { type: 'datetime-local' })}
            </div>
            {existing?.opening_balance_posted && <div className="hint" style={{ marginTop: 10 }}>{t('The opening balance is posted to the ledger. Changing the amount, date or direction re-posts it.')}</div>}
          </Card>
          <Card title={t('Remarks')}>
            <div className="stack" style={{ gap: 10 }}>
              <Field label={t('Remarks')} error={err('remarks')}>{(fid) => <Textarea id={fid} rows={3} value={f.remarks} onChange={(e) => set({ remarks: e.target.value })} />}</Field>
              <Checkbox label={t('Use remarks in sales')} checked={f.use_remarks_in_sales} onChange={(e) => set({ use_remarks_in_sales: e.target.checked })} />
            </div>
          </Card>
          <Card title={t('Customer photos')} sub={!id ? t('Photos upload right after the customer is created.') : undefined}>
            <ImageGallery saved={images} queued={queued} busy={uploading} onAdd={(fs) => void addImages(fs)} onRemoveSaved={(u) => void removeImage(u)}
              onRemoveQueued={(i) => setQueued((q) => q.filter((_, j) => j !== i))} />
          </Card>
          <button type="submit" hidden />
        </form>
      </ObjectBody>
      <div className="mbar">
        <div className="t"><span>{t('Customer')}</span><b style={{ fontSize: 15 }}><bdi>{f.name || '—'}</bdi></b></div>
        <Button variant="primary" icon="check" onClick={() => void save()} loading={saving} disabled={!canSave}>{t('Save')}</Button>
      </div>
      {confirmDlg}
    </>
  );
}
