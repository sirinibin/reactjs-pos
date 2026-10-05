import { useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { ObjectHeader } from '@/ui/ObjectPage';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Field, Input, Select } from '@/ui/Field';
import { Pill } from '@/ui/Pill';
import { Banner, EmptyState, ErrorState, Skeleton, useConfirm } from '@/ui/Misc';
import { useToast } from '@/ui/Toast';
import { usePageMeta } from '@/shell/Workspace';
import { ALL_ITEMS } from '@/shell/nav';
import { fmtDateTime, fmtRelative } from '@/lib/format';
import {
  BUSINESS_CATEGORIES, buildStoreBody, COUNTRY_CODES, countryName, DESIGNS, errorCountByTab, getPath, INVOICE_TITLE_DEFAULTS, newStoreDefaults, resolveImageUrl,
  firstErrorTab, serialPreview, SERIALS, SETTING_GROUPS, setPath, settingOn, SINGLE_TITLES, storeForEdit, TITLE_GROUPS, validateStore, ZATCA_ENVS, zatcaState, type Rec, type StoreTab,
} from '../lib/storeForm';
import { automobileOrder, loadMenuConfig, writeMenuConfig } from '../lib/menuConfig';
import { fromLocalInput, ImagePicker, SectionNav, Switch, toLocalInput, useSaveShortcut, useUnsavedGuard, type SectionDef } from '../components/kit';
import { STORE, STORES_PATH, useStorePerms, ZatcaConnectModal, ZatcaStatusPill } from './shared';
import { WhatsAppPanel } from './WhatsAppPanel';
import { useStore } from './StorePages';

type Errors = Record<string, string>;

export const PROCUREMENT_SETTINGS_PATH = '/procurement/settings';

/** Settings that change behaviour of other screens when toggled (used to word the success toast). */
const AUTOMOBILE = 'enable_automobile_module';

export function StoreEditorPage() {
  const { id } = useParams();
  const q = useStore(id);
  if (id && q.isError) return <div className="pad"><ErrorState error={q.error} onRetry={() => q.refetch()} /></div>;
  if (id && !q.data) return <div className="pad stack"><Skeleton width={260} height={22} /><Skeleton height={320} /></div>;
  return <StoreEditor key={id || 'new'} id={id} existing={q.data} />;
}

function StoreEditor({ id, existing }: { id?: string; existing?: Rec }) {
  const { t, i18n } = useTranslation();
  const nav = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const { store: active, refreshStore } = useAuth();
  const { isAdmin, canEdit, canCreate } = useStorePerms();
  const [sp, setSp] = useSearchParams();
  const initial = useMemo(() => (existing ? storeForEdit(existing) : newStoreDefaults()), [existing]);
  const [s, setS] = useState<Rec>(initial);
  const [baseline, setBaseline] = useState(() => JSON.stringify(initial));
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [zatcaOpen, setZatcaOpen] = useState(false);
  const [confirmEl, ask] = useConfirm();
  const tab = (sp.get('tab') as StoreTab) || 'general';
  const setTab = (v: StoreTab) => setSp((p) => { const n = new URLSearchParams(p); if (v === 'general') n.delete('tab'); else n.set('tab', v); return n; }, { replace: true });
  const dirty = JSON.stringify(s) !== baseline;
  useUnsavedGuard(dirty);
  usePageMeta(id ? `${t('Settings')} · ${existing?.name || ''}` : t('New store'), 'store');

  const locks = useQuery<Rec>({
    queryKey: [STORE, 'locks', id],
    queryFn: async () => (await api.get<Rec>(`${STORE}/${id}/serial-locks`)).result || {},
    enabled: !!id,
  });
  const packages = useQuery<{ id: string; name: string }[]>({
    queryKey: ['/v1/customer-package', 'admin-select'],
    queryFn: async () => (await api.get<any[]>('/v1/customer-package', { limit: 500, select: 'id,name' })).result || [],
    enabled: isAdmin,
    retry: false,
  });

  const set = (path: string, v: unknown) => {
    setS((x) => setPath(x, path, v));
    const errKey = path.replace(/\./g, '_').replace(/^settings_/, 'settings.');
    if (errors[errKey] || errors[path]) setErrors((e) => ({ ...e, [errKey]: '', [path]: '' }));
  };
  const v = (path: string) => getPath(s, path) ?? '';
  const st: Rec = s.settings || {};
  const zatcaConnected = existing?.zatca?.phase === '2' && !!existing?.zatca?.connected;
  const errCount = errorCountByTab(errors);
  const editable = id ? canEdit : canCreate;

  const save = async () => {
    if (saving || !editable) return;
    const local = validateStore(s);
    if (Object.keys(local).length) {
      setErrors(local);
      setTab(firstErrorTab(local) || 'general');
      toast.error(t('Please fix the highlighted fields.'));
      return;
    }
    setSaving(true);
    const turnedOnAutomobile = !!st[AUTOMOBILE] && !existing?.settings?.[AUTOMOBILE];
    try {
      const body = buildStoreBody(s);
      const r = id ? await api.put<Rec>(`${STORE}/${id}`, body) : await api.post<Rec>(STORE, body);
      const saved = r.result as Rec;
      setErrors({});
      qc.invalidateQueries({ queryKey: [STORE] });
      if (turnedOnAutomobile) writeMenuConfig(automobileOrder(loadMenuConfig(ALL_ITEMS.map((i) => i.id))));
      if (!id) {
        toast.success(t('Store created successfully!'));
        nav(`${STORES_PATH}/${saved.id}`, { replace: true });
        return;
      }
      const next = storeForEdit(saved);
      setS(next);
      setBaseline(JSON.stringify(next));
      if (active?.id === id) await refreshStore();
      if (saved.zatca?.zatca_reconnect_required) {
        toast.info(t('ZATCA-sensitive fields changed. Please reconnect to ZATCA.'));
        setTimeout(() => setZatcaOpen(true), 400);
      } else toast.success(t('Store updated successfully!'));
    } catch (e) {
      if (e instanceof ApiError) {
        setErrors(e.errors);
        const first = firstErrorTab(e.errors);
        if (first) setTab(first);
      }
      toast.error(t('Failed to save store. Please fix the errors and try again.'));
    } finally {
      setSaving(false);
    }
  };
  useSaveShortcut(save, editable);

  const clearReconnect = async () => {
    try {
      await api.put(`${STORE}/${id}/zatca/clear-reconnect`, {});
      set('zatca.zatca_reconnect_required', false);
      setBaseline((b) => { const o = JSON.parse(b); o.zatca = { ...(o.zatca || {}), zatca_reconnect_required: false }; return JSON.stringify(o); });
      qc.invalidateQueries({ queryKey: [STORE] });
      toast.success(t('Re-connect prompt cleared'));
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const sections: SectionDef<StoreTab>[] = [
    { id: 'general', label: 'Company', icon: 'building', errors: errCount.general },
    { id: 'address', label: 'National address', icon: 'pin', errors: errCount.address },
    { id: 'contact', label: 'Contact', icon: 'phone', errors: errCount.contact },
    { id: 'bank', label: 'Bank account', icon: 'bank' },
    { id: 'zatca', label: 'ZATCA', icon: 'shield', errors: errCount.zatca },
    { id: 'titles', label: 'Invoice titles', icon: 'file' },
    { id: 'serials', label: 'Document numbering', icon: 'layers', errors: errCount.serials },
    { id: 'preferences', label: 'Preferences', icon: 'sliders', errors: errCount.preferences },
    { id: 'designs', label: 'Print & layout', icon: 'print' },
    { id: 'images', label: 'Logo & images', icon: 'upload', errors: errCount.images },
    { id: 'opening', label: 'Opening balances', icon: 'coins', errors: errCount.opening },
    { id: 'whatsapp', label: 'WhatsApp', icon: 'wa', hidden: !id },
    { id: 'procurement', label: 'Procurement & AI', icon: 'inbox', hidden: !id },
    { id: 'maintenance', label: 'Maintenance', icon: 'wrench', hidden: !id || !isAdmin },
  ];

  if (!editable) {
    return <div className="pad"><EmptyState icon="lock" title={t('You don’t have access to this page.')}>{t('Only administrators and managers can change store settings.')}</EmptyState></div>;
  }

  const txt = (path: string, label: string, o: { required?: boolean; dir?: 'rtl' | 'ltr'; err?: string; type?: string; inputMode?: 'numeric' | 'decimal' | 'email' | 'tel'; maxLength?: number; placeholder?: string; span?: boolean; hint?: string } = {}) => {
    const ek = o.err || path.replace(/\./g, '_');
    return (
      <Field label={t(label)} required={o.required} error={errors[ek]} className={o.span ? 'span2' : undefined} hint={o.hint ? t(o.hint) : undefined}>
        {(fid, d) => <Input id={fid} aria-describedby={d} type={o.type || 'text'} dir={o.dir} inputMode={o.inputMode} maxLength={o.maxLength} placeholder={o.placeholder} invalid={!!errors[ek]} value={v(path)} onChange={(e) => set(path, e.target.value)} />}
      </Field>
    );
  };

  const content: Record<StoreTab, () => ReactNode> = {
    general: () => (
      <>
        {s.zatca?.zatca_reconnect_required && (
          <Banner tone="warn"><b>{t('ZATCA reconnection required.')}</b> {t('Key store details have changed. Reconnect to ZATCA before reporting invoices.')}
            <div className="row" style={{ marginTop: 8 }}><Button size="sm" icon="shield" onClick={() => setZatcaOpen(true)}>{t('Reconnect to ZATCA')}</Button>{isAdmin && <Button size="sm" variant="ghost" onClick={clearReconnect}>{t('Relieve from re-connect prompt')}</Button>}</div>
          </Banner>
        )}
        {zatcaConnected && <Banner tone="info">{t('This store is connected to ZATCA. Changing the name, branch, CR, VAT number, category or address requires reconnecting.')}</Banner>}
        <Card title={t('Legal identity')}>
          <div className="fgrid">
            {txt('name', 'Registered company name', { required: true, span: true })}
            {txt('name_in_arabic', 'Registered company name (Arabic)', { required: true, dir: 'rtl', span: true })}
            {txt('store_name', 'Store display name', { span: true, hint: 'Optional — shown instead of the registered name.' })}
            {txt('store_name_in_arabic', 'Store display name (Arabic)', { dir: 'rtl', span: true })}
            {txt('registration_number', 'Commercial registration (CRN)', { required: true })}
            {txt('vat_no', 'VAT number', { required: true, inputMode: 'numeric', maxLength: 15, hint: '15 digits, starts and ends with 3' })}
            {txt('vat_percent', 'VAT %', { required: true, inputMode: 'decimal' })}
            <Field label={t('Business category')} required error={errors.business_category}>
              {(fid, d) => (
                <Select id={fid} aria-describedby={d} value={s.business_category || ''} invalid={!!errors.business_category} onChange={(e) => set('business_category', e.target.value)} placeholder={t('Select…')}
                  options={[...BUSINESS_CATEGORIES, ...(s.business_category && !BUSINESS_CATEGORIES.includes(s.business_category) ? [s.business_category] : [])].map((c) => ({ value: c, label: t(c) }))} />
              )}
            </Field>
          </div>
        </Card>
        <Card title={t('Branch')}>
          <div className="fgrid">
            {txt('code', 'Branch code', { required: true })}
            {txt('branch_name', 'Branch name', { required: true })}
            {txt('title', 'Invoice title')}
            {txt('title_in_arabic', 'Invoice title (Arabic)', { dir: 'rtl' })}
            {isAdmin && (
              <Field label={t('Customer package')} className="span2" hint={t('Non-admin users only see the menu items in this package.')}>
                {(fid, d) => <Select id={fid} aria-describedby={d} value={s.customer_package_id || ''} onChange={(e) => { const p = packages.data?.find((x) => x.id === e.target.value); setS((x) => ({ ...x, customer_package_id: e.target.value || null, customer_package_name: p?.name || '' })); }} placeholder={t('— No package —')} options={(packages.data || []).map((p) => ({ value: p.id, label: p.name }))} />}
              </Field>
            )}
          </div>
        </Card>
      </>
    ),
    address: () => (
      <Card title={t('National address')} sub={t('Printed on invoices and sent to ZATCA.')}>
        <div className="fgrid">
          <Field label={t('Country')} required error={errors.country_code} className="span2">
            {(fid, d) => <Select id={fid} aria-describedby={d} value={s.country_code || ''} invalid={!!errors.country_code} placeholder={t('Select…')}
              onChange={(e) => setS((x) => ({ ...x, country_code: e.target.value, country_name: countryName(e.target.value) }))}
              options={[...COUNTRY_CODES, ...(s.country_code && !COUNTRY_CODES.includes(s.country_code) ? [s.country_code] : [])].map((c) => ({ value: c, label: `${countryName(c, i18n.language === 'ar' ? 'ar' : 'en')} (${c})` }))} />}
          </Field>
          {txt('national_address.short_code', 'Short address code')}
          {txt('national_address.building_no', 'Building number', { required: true, inputMode: 'numeric', maxLength: 4 })}
          {txt('national_address.street_name', 'Street name', { required: true })}
          {txt('national_address.street_name_arabic', 'Street name (Arabic)', { required: true, dir: 'rtl' })}
          {txt('national_address.district_name', 'District', { required: true })}
          {txt('national_address.district_name_arabic', 'District (Arabic)', { required: true, dir: 'rtl' })}
          {txt('national_address.city_name', 'City', { required: true })}
          {txt('national_address.city_name_arabic', 'City (Arabic)', { required: true, dir: 'rtl' })}
          {txt('national_address.zipcode', 'Zipcode', { required: true, inputMode: 'numeric', maxLength: 5 })}
          {txt('national_address.additional_no', 'Additional number', { inputMode: 'numeric' })}
          {txt('national_address.unit_no', 'Unit number')}
        </div>
      </Card>
    ),
    contact: () => (
      <Card title={t('Contact')}>
        <div className="fgrid">
          {txt('phone', 'Phone', { required: true, type: 'tel', inputMode: 'tel', placeholder: 'e.g. +966 11 456 7890', span: true })}
          {txt('email', 'Email', { required: true, type: 'email', span: true })}
        </div>
      </Card>
    ),
    bank: () => (
      <Card title={t('Bank account')} sub={t('Printed on invoices so customers can pay by transfer.')}>
        <div className="fgrid">
          {txt('bank_account.bank_name', 'Bank name', { span: true })}
          {txt('bank_account.account_name', 'Account name', { span: true })}
          {txt('bank_account.account_no', 'Account number')}
          {txt('bank_account.iban', 'IBAN')}
          {txt('bank_account.customer_no', 'Customer number')}
        </div>
      </Card>
    ),
    zatca: () => <ZatcaSection s={s} existing={existing} set={set} errors={errors} isAdmin={isAdmin} onConnect={() => setZatcaOpen(true)} onClearReconnect={clearReconnect} onChanged={() => qc.invalidateQueries({ queryKey: [STORE] })} />,
    titles: () => (
      <>
        <Card title={t('Document titles')} sub={t('Format: ENGLISH | عربي. Paid, credit (unpaid) and cash variants are chosen automatically when printing.')}
          actions={<Button size="sm" variant="ghost" icon="undo" onClick={() => set('settings.invoice', JSON.parse(JSON.stringify(INVOICE_TITLE_DEFAULTS)))}>{t('Restore defaults')}</Button>}>
          <div className="fgrid">
            {SINGLE_TITLES.map((x) => <div key={x.key} className="span2">{txt(`settings.invoice.${x.key}`, x.label)}</div>)}
          </div>
        </Card>
        {TITLE_GROUPS.map((g) => (
          <Card key={g.path} title={t(g.label)}>
            <div className="grid-3c">
              {(['paid', 'credit', 'cash'] as const).map((k) => <div key={k}>{txt(`settings.invoice.${g.path}.${k}`, k === 'paid' ? 'Paid' : k === 'credit' ? 'Credit' : 'Cash')}</div>)}
            </div>
          </Card>
        ))}
      </>
    ),
    serials: () => (
      <Card title={t('Document numbering')} sub={t('Codes are generated as PREFIX-0001. Start numbers lock once documents exist.')}>
        <table className="adm-serials" aria-label={t('Document numbering')}>
          <thead><tr><th>{t('Document')}</th><th>{t('Prefix')}</th><th>{t('Padding')}</th><th>{t('Starts at')}</th><th>{t('Example')}</th></tr></thead>
          <tbody>
            {SERIALS.map((r) => {
              const base = `${r.key}_serial_number`;
              const locked = !!(r.lock && locks.data?.[r.lock]);
              const cell = (f: 'prefix' | 'padding_count' | 'start_from_count', label: string, disabled = false) => (
                <td data-l={t(label)}>
                  <Input aria-label={`${t(r.label)} ${t(label)}`} value={v(`${base}.${f}`)} disabled={disabled} inputMode={f === 'prefix' ? undefined : 'numeric'} className={f === 'prefix' ? 'mono' : 'num'}
                    invalid={!!errors[`${base}_${f}`]} title={errors[`${base}_${f}`] || (disabled ? t('Locked — documents already exist') : undefined)} onChange={(e) => set(`${base}.${f}`, f === 'prefix' ? e.target.value : e.target.value.replace(/[^\d]/g, ''))} />
                  {errors[`${base}_${f}`] && <div className="errmsg" role="alert">{errors[`${base}_${f}`]}</div>}
                </td>
              );
              return (
                <tr key={r.key}>
                  <td>{t(r.label)}{locked && <> <Pill tone="neutral" icon="lock">{t('Locked')}</Pill></>}</td>
                  {cell('prefix', 'Prefix')}
                  {cell('padding_count', 'Padding')}
                  {cell('start_from_count', 'Starts at', locked)}
                  <td className="pv mono muted" data-l={t('Example')}>{serialPreview(s[base])}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    ),
    preferences: () => (
      <>
        {SETTING_GROUPS.filter((g) => g.id !== 'system').map((g) => (
          <Card key={g.id} title={t(g.title)}>
            <div className="adm-switches">
              {g.items.map((d) => d.type === 'int' ? (
                <label className="adm-sw" key={d.key}>
                  <span className="lbl">{t(d.label)}{errors[`settings.${d.key}`] && <small className="errmsg">{errors[`settings.${d.key}`]}</small>}</span>
                  <Input aria-label={t(d.label)} inputMode="numeric" className="num" value={st[d.key] ?? ''} invalid={!!errors[`settings.${d.key}`]} onChange={(e) => set(`settings.${d.key}`, e.target.value.replace(/[^\d]/g, ''))} />
                </label>
              ) : (
                <Switch key={d.key} label={t(d.label)} checked={settingOn(st, d)} onChange={(e) => {
                  set(`settings.${d.key}`, e.target.checked);
                  if (d.key === AUTOMOBILE) {
                    const cur = st.sales_create_form_design;
                    if (e.target.checked && (!cur || cur === 'type1')) set('settings.sales_create_form_design', 'type5');
                    if (!e.target.checked && cur === 'type5') set('settings.sales_create_form_design', 'type1');
                  }
                }} />
              ))}
            </div>
          </Card>
        ))}
      </>
    ),
    designs: () => (
      <>
        <Card title={t('Layouts')} sub={t('Choose the layout used for previews, PDFs and entry forms.')}>
          <div className="fgrid">
            {DESIGNS.map((d) => (
              <Field key={d.key} label={t(d.label)}>
                {(fid) => <Select id={fid} value={st[d.key] || 'type1'} onChange={(e) => set(`settings.${d.key}`, e.target.value)}
                  options={d.options.filter((o) => !(d.automobileOnly === o.value && !st[AUTOMOBILE])).map((o) => ({ value: o.value, label: t(o.label) }))} />}
              </Field>
            ))}
          </div>
        </Card>
        <Card title={t('System')}>
          <div className="adm-switches">
            {SETTING_GROUPS.find((g) => g.id === 'system')!.items.map((d) => <Switch key={d.key} label={t(d.label)} checked={settingOn(st, d)} onChange={(e) => set(`settings.${d.key}`, e.target.checked)} />)}
          </div>
        </Card>
        {id && <ServerSyncCard storeId={id} settings={existing?.settings || {}} onChanged={() => qc.invalidateQueries({ queryKey: [STORE] })} />}
      </>
    ),
    images: () => (
      <>
        <Card title={t('Logo')}>
          <ImagePicker label={t('Store logo')} maxBytes={500 * 1024} fit={[600, 200]}
            url={s.logo_content || (s.remove_logo ? '' : resolveImageUrl(s.logo, s.id || '', 'store'))} pending={!!s.logo_content}
            hint={t('Recommended 300×100 px transparent PNG, up to 500 KB.')}
            onPick={(d) => setS((x) => ({ ...x, logo_content: d, remove_logo: false }))}
            onRemove={async () => { if (await ask(t('Remove the logo?'), { danger: true, confirmLabel: t('Remove') })) setS((x) => ({ ...x, logo: '', logo_content: '', remove_logo: true })); }} />
          {errors.logo_content && <div className="errmsg">{errors.logo_content}</div>}
        </Card>
        <Card title={t('Invoice background')}>
          <ImagePicker label={t('Invoice background image')} maxBytes={2 * 1024 * 1024}
            url={s.invoice_background_content || (s.remove_invoice_background ? '' : resolveImageUrl(s.invoice_background, s.id || '', 'store'))} pending={!!s.invoice_background_content}
            hint={t('A4 at 150 dpi (1240×1754 px) or 595×842 px, PNG or JPG, up to 2 MB.')}
            onPick={(d) => setS((x) => ({ ...x, invoice_background_content: d, remove_invoice_background: false }))}
            onRemove={async () => { if (await ask(t('Remove the invoice background?'), { danger: true, confirmLabel: t('Remove') })) setS((x) => ({ ...x, invoice_background: '', invoice_background_content: '', remove_invoice_background: true })); }} />
          {errors.invoice_background_content && <div className="errmsg">{errors.invoice_background_content}</div>}
        </Card>
      </>
    ),
    opening: () => (
      <Card title={t('Opening balances')} sub={t('Posted to the ledger when saved. Amounts must be 0 or more; a date is required for any amount.')}>
        <div className="fgrid">
          {(['cash', 'bank'] as const).map((k) => (
            <div key={k} className="span2 grid-2c">
              <Field label={t(k === 'cash' ? 'Cash opening balance' : 'Bank opening balance')} error={errors[`settings.${k}_opening_balance`]}>
                {(fid, d) => <Input id={fid} aria-describedby={d} inputMode="decimal" className="num" value={st[`${k}_opening_balance`] ?? ''} invalid={!!errors[`settings.${k}_opening_balance`]} onChange={(e) => set(`settings.${k}_opening_balance`, e.target.value)} />}
              </Field>
              <Field label={t('As of')} error={errors[`settings.${k}_opening_balance_date`]}>
                {(fid, d) => <Input id={fid} aria-describedby={d} type="datetime-local" value={toLocalInput(st[`${k}_opening_balance_date`])} invalid={!!errors[`settings.${k}_opening_balance_date`]} onChange={(e) => set(`settings.${k}_opening_balance_date`, fromLocalInput(e.target.value))} />}
              </Field>
            </div>
          ))}
        </div>
      </Card>
    ),
    whatsapp: () => (
      <>
        <Card title={t('WhatsApp (Evolution API)')} sub={t('Send invoices as PDF attachments from your own WhatsApp number instead of a link.')}>
          <div className="stack">
            <Switch label={t('Send documents through the connected WhatsApp number')} checked={!!st.use_whatsapp_api} onChange={(e) => set('settings.use_whatsapp_api', e.target.checked)} />
            <div className="fgrid">
              {txt('settings.evolution_api_url', 'Evolution API URL', { placeholder: 'http://localhost:8081', span: true })}
              {txt('settings.evolution_api_key', 'Evolution API key', { placeholder: 'startpos-evo-local-key' })}
              {txt('settings.evolution_instance_name', 'Instance name', { placeholder: 'startpos' })}
            </div>
            {dirty && <div className="hint">{t('Save your changes before connecting.')}</div>}
          </div>
        </Card>
        {id && <WhatsAppPanel storeId={id} storeName={existing?.name || ''} instance={existing?.settings?.evolution_instance_name} onChanged={() => qc.invalidateQueries({ queryKey: [STORE] })} />}
      </>
    ),
    procurement: () => (
      <Card title={t('Procurement & AI settings')}>
        <div className="stack">
          <p className="muted" style={{ margin: 0 }}>{t('The AI RFQ bot, procurement WhatsApp, purchase-bill tracking, email accounts & signatures, Google, RFQ and AI model settings are managed in the procurement workspace.')}</p>
          <ul style={{ margin: 0, paddingInlineStart: 18 }}>
            {['WhatsApp bot', 'Purchase bills', 'Email settings', 'Google settings', 'RFQ settings', 'AI models'].map((x) => <li key={x}>{t(x)}</li>)}
          </ul>
          <div><Link className="btn" to={`${PROCUREMENT_SETTINGS_PATH}?store=${id}`}>{t('Open procurement settings')}</Link></div>
        </div>
      </Card>
    ),
    maintenance: () => <MaintenanceSection storeId={id!} storeName={existing?.name || ''} ask={ask} />,
  };

  const saveBtn = <Button variant="primary" icon="check" loading={saving} onClick={save}>{t(id ? 'Save changes' : 'Create store')} <kbd className="hide-sm" style={{ background: 'rgba(255,255,255,.15)', color: '#fff', borderColor: 'rgba(255,255,255,.25)' }}>Ctrl S</kbd></Button>;
  return (
    <>
      <ObjectHeader
        crumbs={[{ label: t('Admin'), to: STORES_PATH }, { label: t('Stores'), to: STORES_PATH }, ...(id ? [{ label: <bdi>{existing?.code || existing?.name}</bdi>, to: `${STORES_PATH}/${id}` }] : []), { label: id ? t('Settings') : t('New') }]}
        icon="store"
        title={id ? <bdi>{existing?.name}</bdi> : t('New store')}
        pills={<>{' '}{id && <ZatcaStatusPill zatca={s.zatca} />}{dirty && <Pill tone="warn" icon="clock">{t('Unsaved')}</Pill>}</>}
        subtitle={id && existing?.zatca?.last_connected_at ? `${t('ZATCA last connected')}: ${fmtDateTime(existing.zatca.last_connected_at)}` : undefined}
        actions={<div className="row doc-actions">
          <Button variant="ghost" onClick={() => nav(id ? `${STORES_PATH}/${id}` : STORES_PATH)}>{t(dirty ? 'Discard' : 'Close')}</Button>
          {saveBtn}
        </div>}
      />
      {Object.values(errors).some(Boolean) && (
        <div style={{ padding: '12px 24px 0' }}>
          <Banner tone="crit"><b>{t('Couldn’t save.')}</b> {Object.entries(errors).filter(([, m]) => m).slice(0, 4).map(([, m]) => t(m)).join(' · ')}</Banner>
        </div>
      )}
      <div className="adm-layout">
        <SectionNav label={t('Store settings sections')} sections={sections} value={tab} onChange={setTab} />
        <div className="adm-sec" role="tabpanel" aria-label={t(sections.find((x) => x.id === tab)?.label || '')}>{(content[tab] || content.general)()}</div>
      </div>
      <div className="mbar">
        <div className="t"><span>{id ? t('Store settings') : t('New store')}</span><b style={{ fontSize: 14 }}>{dirty ? t('Unsaved changes') : t('All changes saved')}</b></div>
        <Button variant="primary" icon="check" loading={saving} onClick={save}>{t('Save')}</Button>
      </div>
      {confirmEl}
      {id && <ZatcaConnectModal open={zatcaOpen} onClose={() => setZatcaOpen(false)} store={{ id, name: existing?.name }} reconnect={zatcaState(s.zatca) === 'reconnect'}
        onDone={() => { set('zatca.zatca_reconnect_required', false); qc.invalidateQueries({ queryKey: [STORE] }); }} />}
    </>
  );
}

function ZatcaSection({ s, existing, set, errors, isAdmin, onConnect, onClearReconnect, onChanged }: {
  s: Rec; existing?: Rec; set: (p: string, v: unknown) => void; errors: Errors; isAdmin: boolean; onConnect: () => void; onClearReconnect: () => void; onChanged: () => void;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const [confirmEl, ask] = useConfirm();
  const z: Rec = existing?.zatca || {};
  const savedPhase2 = z.phase === '2';
  const disconnect = async () => {
    if (!(await ask(t('Disconnect this store from ZATCA?'), { danger: true, confirmLabel: t('Disconnect'), body: t('Invoices will not be reported until you connect again.') }))) return;
    try {
      await api.post(`${STORE}/zatca/disconnect`, { id: existing!.id });
      toast.success(t('Disconnected from ZATCA'));
      onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  const cred = (k: string, label: string) => ({ k: t(label), v: <span className="adm-cred">{z[k] ? String(z[k]) : '—'}</span> });
  return (
    <>
      <Card title={t('E-invoicing phase')}>
        <div className="fgrid">
          <Field label={t('ZATCA phase')} className="span2">
            {(fid) => <Select id={fid} value={s.zatca?.phase || '1'} onChange={(e) => set('zatca.phase', e.target.value)} options={[{ value: '1', label: t('Phase 1 — generation') }, { value: '2', label: t('Phase 2 — integration') }]} />}
          </Field>
          {s.zatca?.phase === '2' && (
            <Field label={t('Environment')} required error={errors.zatca_env} className="span2">
              {(fid, d) => <Select id={fid} aria-describedby={d} value={s.zatca?.env || ''} invalid={!!errors.zatca_env} placeholder={t('Select…')} onChange={(e) => set('zatca.env', e.target.value)} options={ZATCA_ENVS.map((o) => ({ value: o.value, label: t(o.label) }))} />}
            </Field>
          )}
        </div>
        {s.zatca?.phase === '2' && !savedPhase2 && existing && <div className="hint" style={{ marginTop: 8 }}>{t('Save to switch to phase 2, then connect with an OTP.')}</div>}
      </Card>
      {existing && savedPhase2 && (
        <Card title={t('Connection')} actions={<ZatcaStatusPill zatca={s.zatca} />}>
          <div className="stack">
            {z.zatca_reconnect_required && <Banner tone="warn">{t('Key store details have changed. Reconnect to ZATCA before reporting invoices.')}</Banner>}
            <dl className="kv">
              <dt>{t('Environment')}</dt><dd>{z.env || '—'}</dd>
              <dt>{t('Connected')}</dt><dd>{z.connected ? t('Yes') : t('No')}</dd>
              <dt>{t('Last connected')}</dt><dd>{z.last_connected_at ? `${fmtDateTime(z.last_connected_at)} (${fmtRelative(z.last_connected_at)})` : '—'}</dd>
              <dt>{t('Last disconnected')}</dt><dd>{z.last_disconnected_at ? fmtDateTime(z.last_disconnected_at) : '—'}</dd>
              <dt>{t('Failed attempts')}</dt><dd className="num">{z.connection_failed_count ?? 0}</dd>
              <dt>{t('Last failure')}</dt><dd>{z.connection_last_failed_at ? fmtDateTime(z.connection_last_failed_at) : '—'}</dd>
            </dl>
            {(z.connection_errors || []).length > 0 && <Banner tone="crit">{(z.connection_errors as string[]).join(' · ')}</Banner>}
            <div className="row">
              <Button variant="primary" icon="shield" onClick={onConnect}>{z.connected ? t('Reconnect') : t('Connect to ZATCA')}</Button>
              {z.zatca_reconnect_required && isAdmin && <Button variant="ghost" onClick={onClearReconnect}>{t('Relieve from re-connect prompt')}</Button>}
              {z.connected && isAdmin && <Button variant="danger" icon="xc" onClick={disconnect}>{t('Disconnect')}</Button>}
            </div>
          </div>
        </Card>
      )}
      {existing && savedPhase2 && isAdmin && (
        <Card title={t('Credentials')} sub={t('Read-only. Issued by ZATCA during onboarding.')}>
          <details>
            <summary style={{ cursor: 'pointer', fontWeight: 600 }}>{t('Show credentials')}</summary>
            <div style={{ marginTop: 10 }}>
              <dl className="kv">
                {[cred('otp', 'OTP'), cred('compliance_request_id', 'Compliance request ID'), cred('production_request_id', 'Production request ID'), cred('csr', 'CSR'), cred('private_key', 'Private key'),
                  cred('binary_security_token', 'Binary security token'), cred('secret', 'Secret'), cred('production_binary_security_token', 'Production binary security token'), cred('production_secret', 'Production secret')]
                  .map((x, i) => <FragmentPair key={i} k={x.k} v={x.v} />)}
              </dl>
            </div>
          </details>
        </Card>
      )}
      {confirmEl}
    </>
  );
}

function FragmentPair({ k, v }: { k: ReactNode; v: ReactNode }) {
  return <><dt>{k}</dt><dd className="adm-cred">{v}</dd></>;
}

/** Server copies of the menu configuration and print preview settings. */
function ServerSyncCard({ storeId, settings, onChanged }: { storeId: string; settings: Rec; onChanged: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [busy, setBusy] = useState('');
  const printKeys = Object.keys(settings.print_settings || {}).length;
  const menuItems = (settings.sidebar_config || []).length;
  const act = async (key: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(key);
    try { await fn(); toast.success(ok); onChanged(); } catch (e) { toast.error((e as Error).message); } finally { setBusy(''); }
  };
  return (
    <Card title={t('Server copies')} sub={t('Used when syncing is switched on above.')}>
      <div className="stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span>{t('Menu settings')}: <b className="num">{menuItems}</b> {t('items stored')}</span>
          <div className="row">
            <Button size="sm" loading={busy === 'menu-push'} onClick={() => act('menu-push', () => api.put(`${STORE}/${storeId}/sidebar-config`, { sidebar_config: loadMenuConfig(ALL_ITEMS.map((i) => i.id)) }), t('Menu settings uploaded'))}>{t('Upload my menu')}</Button>
            {menuItems > 0 && <Button size="sm" variant="ghost" loading={busy === 'menu-clear'} onClick={() => act('menu-clear', () => api.put(`${STORE}/${storeId}/sidebar-config`, { sidebar_config: [] }), t('Server menu cleared'))}>{t('Clear')}</Button>}
          </div>
        </div>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span>{t('Print settings')}: <b className="num">{printKeys}</b> {t('documents customised')}</span>
          {printKeys > 0 && <Button size="sm" variant="ghost" loading={busy === 'print-clear'} onClick={() => act('print-clear', () => api.put(`${STORE}/${storeId}/print-settings`, { print_settings: {} }), t('Server print settings cleared'))}>{t('Reset')}</Button>}
        </div>
      </div>
    </Card>
  );
}

function MaintenanceSection({ storeId, storeName, ask }: { storeId: string; storeName: string; ask: ReturnType<typeof useConfirm>[1] }) {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const [busy, setBusy] = useState('');
  const populate = async () => {
    if (!(await ask(t('Add sample data to “{{name}}”?', { name: storeName }), { body: t('Creates demo customers, vehicles, technicians, products and repair jobs.'), confirmLabel: t('Add test data') }))) return;
    setBusy('populate');
    try {
      const r = await api.post<Rec>(`${STORE}/${storeId}/populate-test-data`);
      const c = r.result || {};
      toast.success(t('Test data added: {{c}} customers, {{v}} vehicles, {{te}} technicians, {{p}} products, {{j}} repair jobs', { c: c.customers ?? 0, v: c.vehicles ?? 0, te: c.technicians ?? 0, p: c.products ?? 0, j: c.repair_jobs ?? 0 }));
      qc.invalidateQueries();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy('');
    }
  };
  const clear = async () => {
    if (!(await ask(t('Clear all data of “{{name}}”?', { name: storeName }), { danger: true, confirmLabel: t('Continue'), body: t('Every sale, purchase, product, customer and ledger entry of this store will be deleted. Settings are kept.') }))) return;
    if (!(await ask(t('This cannot be undone. Really clear the data?'), { danger: true, confirmLabel: t('Clear data') }))) return;
    setBusy('clear');
    try {
      const r = await api.post<Rec>(`${STORE}/${storeId}/clear-data`);
      toast.success(t('Store data cleared ({{n}} collections dropped)', { n: r.result?.dropped_collections ?? 0 }));
      qc.invalidateQueries();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy('');
    }
  };
  return (
    <>
      <Card title={t('Test data')}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="muted">{t('Fill the store with realistic sample records for training or demos.')}</span>
          <Button icon="plus" loading={busy === 'populate'} onClick={populate}>{t('Populate test data')}</Button>
        </div>
      </Card>
      <Card title={t('Danger zone')}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="muted">{t('Delete every document of this store while keeping its settings.')}</span>
          <Button variant="danger" icon="trash" loading={busy === 'clear'} onClick={clear}>{t('Clear data')}</Button>
        </div>
      </Card>
    </>
  );
}
