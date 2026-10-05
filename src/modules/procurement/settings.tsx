import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Button, IconButton } from '@/ui/Button';
import { Banner, EmptyState, Kbd, Spinner, Tabs, useConfirm } from '@/ui/Misc';
import { Checkbox, Field, Input, Select, Textarea } from '@/ui/Field';
import { Modal } from '@/ui/Overlay';
import { Pill } from '@/ui/Pill';
import { useToast } from '@/ui/Toast';
import { usePageMeta } from '@/shell/Workspace';
import { fmtDateTime } from '@/lib/format';
import { papi, pfetch } from './api';
import { AI_PROVIDERS, modelsForProvider } from './providers';
import { buildTemplateComponents, headerFormat, normPhone, placeholders, titleCase } from './logic';
import type { ExtractResult, TemplateComponent } from './types';
import { AiPicker, ChipsInput, CopyButton, FileDrop, Section, useAiChoice, useRfqEvents } from './components/common';
import './procurement.css';

type S = Record<string, any>;
type TabId = 'whatsapp' | 'bills' | 'email' | 'google' | 'rfq' | 'ai';
const TABS: TabId[] = ['whatsapp', 'bills', 'email', 'google', 'rfq', 'ai'];

/** Only the keys that changed — PUT /v1/store decodes over the stored document, so a partial `settings` is safe. */
export function changedSettings(orig: S, draft: S): S {
  const out: S = {};
  const norm = (v: unknown) => JSON.stringify(v === '' || v === undefined ? null : v);
  Object.keys(draft).forEach((k) => { if (norm(draft[k]) !== norm(orig[k])) out[k] = draft[k]; });
  return out;
}

export function ProcurementSettingsPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const { store, user, refreshStore } = useAuth();
  usePageMeta(t('Procurement settings'), 'gear');
  const [sp, setSp] = useSearchParams();
  const tab = (TABS.includes(sp.get('tab') as TabId) ? sp.get('tab') : 'whatsapp') as TabId;
  const orig = useMemo<S>(() => store?.settings || {}, [store?.settings]);
  const [d, setD] = useState<S>(orig);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => setD(orig), [orig]);
  const canEdit = !!user?.admin || user?.role === 'Admin' || user?.role === 'Manager';
  const changes = useMemo(() => changedSettings(orig, d), [orig, d]);
  const dirty = Object.keys(changes).length > 0;
  const set = (k: string, v: any) => setD((x) => ({ ...x, [k]: v }));

  const save = async () => {
    if (!store || !dirty) return;
    setSaving(true); setErr('');
    try {
      await api.put(`/v1/store/${store.id}`, { settings: changes }, { search: { store_id: store.id } });
      toast.success(t('Procurement settings saved'));
      await refreshStore();
    } catch (e) { setErr((e as Error).message); } finally { setSaving(false); }
  };
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); saveRef.current(); } };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, []);

  if (!store) return <div className="pad"><Spinner /></div>;
  const p = { d, set, storeId: store.id };
  return (
    <section className="pad">
      <div className="ph">
        <div><h1>{t('Procurement settings')}</h1><p>{t('WhatsApp bot, email accounts, AI models and RFQ rules for')} <bdi>{store.name}</bdi></p></div>
        <div className="acts">
          {dirty && <span className="muted">{t('{{n}} unsaved changes', { n: Object.keys(changes).length })}</span>}
          <Button variant="ghost" disabled={!dirty} onClick={() => setD(orig)}>{t('Discard')}</Button>
          <Button variant="primary" icon="check" loading={saving} disabled={!dirty || !canEdit} onClick={save} aria-label={t('Save')}>{t('Save')} <Kbd>Ctrl S</Kbd></Button>
        </div>
      </div>
      {!canEdit && <Banner tone="warn">{t('Only administrators and managers can change store settings.')}</Banner>}
      {err && <Banner tone="crit">{err}</Banner>}
      <div className="card" style={{ marginBottom: 12 }}>
        <Tabs<TabId> className="vtabs" label={t('Settings sections')} value={tab} onChange={(v) => setSp({ tab: v }, { replace: true })} tabs={[
          { id: 'whatsapp', label: t('WhatsApp') }, { id: 'bills', label: t('Purchase bills') }, { id: 'email', label: t('Email') },
          { id: 'google', label: t('Google') }, { id: 'rfq', label: t('RFQ rules') }, { id: 'ai', label: t('AI models') },
        ]} />
      </div>
      <fieldset disabled={!canEdit} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }} className="stack">
        {tab === 'whatsapp' && <WhatsAppTab {...p} />}
        {tab === 'bills' && <BillsTab {...p} />}
        {tab === 'email' && <EmailTab {...p} />}
        {tab === 'google' && <GoogleTab {...p} />}
        {tab === 'rfq' && <RfqTab {...p} />}
        {tab === 'ai' && <AiTab {...p} />}
      </fieldset>
      <div className="mbar"><span className="t">{dirty ? t('{{n}} unsaved changes', { n: Object.keys(changes).length }) : ''}</span><Button variant="primary" icon="check" loading={saving} disabled={!dirty || !canEdit} onClick={save}>{t('Save')}</Button></div>
    </section>
  );
}

interface TabProps { d: S; set: (k: string, v: any) => void; storeId: string }

const Toggle = ({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: ReactNode }) => (
  <div><Checkbox label={label} checked={checked} onChange={(e) => onChange(e.target.checked)} />{hint && <div className="hint" style={{ marginInlineStart: 26 }}>{hint}</div>}</div>
);

function TextSetting({ d, set, k, label, type = 'text', hint, placeholder }: TabProps & { k: string; label: string; type?: string; hint?: string; placeholder?: string }) {
  return <Field label={label} hint={hint}>{(id, desc) => <Input id={id} aria-describedby={desc} type={type} placeholder={placeholder} className={type === 'number' ? 'num' : undefined} value={d[k] ?? ''}
    onChange={(e) => set(k, type === 'number' ? (e.target.value === '' ? 0 : Number(e.target.value)) : e.target.value)} autoComplete={type === 'password' ? 'new-password' : undefined} />}</Field>;
}

/* ── WhatsApp ─────────────────────────────────────────────────────────── */

function WhatsAppTab(p: TabProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const { d, set, storeId } = p;
  const [wabaId, setWabaId] = useState(d.bot_waba_business_account_id || '');
  const hook = `${window.location.origin}/v1/rfq-bot/webhook?store_id=${storeId}`;
  const saveWaba = async () => {
    try { await papi.post('/v1/rfq-bot/waba-business-account-id', { store_id: storeId, waba_business_account_id: wabaId.trim() }); toast.success(t('WABA Business Account ID saved')); } catch (e) { toast.error((e as Error).message); }
  };
  return (
    <>
      <Section title={t('AI RFQ bot')}>
        <Toggle label={t('Enable AI RFQ bot')} checked={!!d.enable_ai_rfq_bot} onChange={(v) => set('enable_ai_rfq_bot', v)} hint={t('Turns on the procurement inboxes and automatic RFQ creation from WhatsApp and email.')} />
      </Section>
      <BotWhatsApp storeId={storeId} />
      <Section title={t('Meta webhook')}>
        <dl className="pr-kv">
          <dt>{t('Callback URL')}</dt><dd className="row" style={{ flexWrap: 'nowrap' }}><code className="mono" style={{ overflowWrap: 'anywhere' }}>{hook}</code><CopyButton text={hook} /></dd>
          <dt>{t('Verify token')}</dt><dd className="row" style={{ flexWrap: 'nowrap' }}><code className="mono">startpos-rfq-verify</code><CopyButton text="startpos-rfq-verify" /></dd>
        </dl>
        <ol className="muted" style={{ margin: '10px 0 0', paddingInlineStart: 18 }}>
          <li>{t('Publish your Meta app (Live mode).')}</li><li>{t('In WhatsApp → Configuration, set the callback URL and verify token, then subscribe to the “messages” field.')}</li><li>{t('Subscribe the app to your WhatsApp Business Account.')}</li>
        </ol>
      </Section>
      <Section title={t('WhatsApp templates')}>
        <div className="stack">
          <div className="row" style={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <Field label={t('WABA Business Account ID')}>{(id) => <Input id={id} className="num" value={wabaId} onChange={(e) => setWabaId(e.target.value)} />}</Field>
            <Button onClick={saveWaba} disabled={!wabaId.trim()}>{t('Save ID')}</Button>
          </div>
          <TemplatePurpose d={d} set={set} storeId={storeId} />
          <div className="grid-2c">
            <TextSetting {...p} k="rfq_message_contact_phone" label={t('RFQ message contact number')} type="tel" hint={t('Fills the contact placeholder in the template; blank uses the bot number.')} />
            <TextSetting {...p} k="rfq_pdf_title" label={t('RFQ document title')} placeholder="REQUEST FOR QUOTATION" />
          </div>
          <Field label={t('RFQ intro')} hint={t('First-contact message sent to new suppliers.')}>{(id) => <Textarea id={id} rows={3} value={d.rfq_intro || ''} onChange={(e) => set('rfq_intro', e.target.value)} />}</Field>
        </div>
      </Section>
      <TemplateTester storeId={storeId} />
    </>
  );
}

function BotWhatsApp({ storeId }: { storeId: string }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [confirmEl, ask] = useConfirm();
  const status = useQuery({ queryKey: ['procurement-bot-status', storeId], queryFn: () => papi.get<{ connected: boolean; phone?: string; phone_number_id?: string }>('/v1/rfq-bot/status', { store_id: storeId }), enabled: !!storeId });
  const [f, setF] = useState({ phone_number_id: '', access_token: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [polling, setPolling] = useState(false);
  useEffect(() => {
    if (!polling) return;
    let n = 0;
    const h = setInterval(async () => {
      n++;
      const r = await status.refetch();
      if (r.data?.connected || n > 20) { setPolling(false); clearInterval(h); }
    }, 3000);
    return () => clearInterval(h);
  }, [polling, status]);
  const connect = async () => {
    if (!f.phone_number_id.trim() || !f.access_token.trim()) { setErr(t('Phone Number ID and Access Token are required.')); return; }
    setBusy(true); setErr('');
    try {
      const r = await papi.post<{ phone?: string; webhook_url?: string }>('/v1/rfq-bot/connect', { store_id: storeId, phone_number_id: f.phone_number_id.trim(), access_token: f.access_token.trim() });
      toast.success(t('Connected {{p}}', { p: r.phone || '' }));
      setF({ phone_number_id: '', access_token: '' });
      setTimeout(() => setPolling(true), 3000);
      status.refetch();
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  const disconnect = async () => {
    if (!(await ask(t('Disconnect the bot WhatsApp number?'), { danger: true, confirmLabel: t('Disconnect'), body: t('RFQs will no longer arrive by WhatsApp and sending to suppliers stops working.') }))) return;
    try { await papi.del('/v1/rfq-bot/disconnect', { store_id: storeId }); toast.success(t('Disconnected')); status.refetch(); } catch (e) { toast.error((e as Error).message); }
  };
  const s = status.data;
  return (
    <Section title={t('Bot WhatsApp number')} actions={s?.connected ? <Pill tone="good">{t('Connected')}</Pill> : <Pill tone="neutral" icon="xc">{t('Not connected')}</Pill>}>
      {status.isLoading ? <Spinner /> : s?.connected ? (
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <span>{t('Number')}: <b className="num">{s.phone || '—'}</b>{s.phone_number_id && <span className="muted"> · ID {s.phone_number_id}</span>}</span>
          <span className="spacer" />
          <Button variant="danger" icon="xc" onClick={disconnect}>{t('Disconnect')}</Button>
        </div>
      ) : (
        <div className="stack">
          <p className="muted" style={{ margin: 0 }}>{t('Connect the WhatsApp Cloud API number that receives RFQs and sends them to suppliers (Meta Business → WhatsApp → API setup).')}</p>
          {err && <Banner tone="crit">{err}</Banner>}
          <div className="grid-2c">
            <Field label={t('Phone Number ID')}>{(id) => <Input id={id} className="num" value={f.phone_number_id} onChange={(e) => setF({ ...f, phone_number_id: e.target.value })} />}</Field>
            <Field label={t('Access token')}>{(id) => <Input id={id} type="password" autoComplete="new-password" value={f.access_token} onChange={(e) => setF({ ...f, access_token: e.target.value })} />}</Field>
          </div>
          <div className="row"><Button variant="primary" icon="wa" loading={busy || polling} onClick={connect}>{polling ? t('Waiting for connection…') : t('Connect')}</Button></div>
        </div>
      )}
      {confirmEl}
    </Section>
  );
}

interface WabaTemplate { name: string; status?: string; language?: string; category?: string; components?: TemplateComponent[] }
function useTemplates(storeId: string) {
  return useQuery({ queryKey: ['procurement-waba-templates', storeId], queryFn: () => papi.get<{ templates: WabaTemplate[] | null }>('/v1/rfq-bot/waba-templates', { store_id: storeId }).then((r) => r.templates || []), enabled: !!storeId, retry: false });
}

function TemplatePurpose({ d, set, storeId }: TabProps) {
  const { t } = useTranslation();
  const q = useTemplates(storeId);
  const opts = (q.data || []).map((x) => ({ value: x.name, label: `${x.name} (${x.language || '—'})${x.status && x.status !== 'APPROVED' ? ` · ${x.status}` : ''}` }));
  const withCurrent = (k: string) => (d[k] && !opts.some((o) => o.value === d[k]) ? [...opts, { value: d[k], label: d[k] }] : opts);
  return (
    <div className="stack">
      {q.isError && <Banner tone="warn">{(q.error as Error).message} {t('Templates are loaded from Meta once the bot number is connected and the WABA ID is saved.')}</Banner>}
      <div className="grid-2c">
        <Field label={t('RFQ to supplier template')}>{(id) => <Select id={id} value={d.waba_template_rfq_supplier || ''} onChange={(e) => set('waba_template_rfq_supplier', e.target.value)} placeholder={t('Not set')} options={withCurrent('waba_template_rfq_supplier')} />}</Field>
        <Field label={t('Invoice share template')}>{(id) => <Select id={id} value={d.waba_template_invoice_share || ''} onChange={(e) => set('waba_template_invoice_share', e.target.value)} placeholder={t('Not set')} options={withCurrent('waba_template_invoice_share')} />}</Field>
      </div>
      <div><Button size="sm" icon="refresh" loading={q.isFetching} onClick={() => q.refetch()}>{t('Refresh templates')}</Button></div>
    </div>
  );
}

function TemplateTester({ storeId }: { storeId: string }) {
  const { t } = useTranslation();
  const toast = useToast();
  const q = useTemplates(storeId);
  const [name, setName] = useState('');
  const [vars, setVars] = useState<Record<string, string>>({});
  const [to, setTo] = useState('');
  const [file, setFile] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const tpl = (q.data || []).find((x) => x.name === name);
  const body = tpl?.components?.find((c) => c.type?.toUpperCase() === 'BODY')?.text;
  const hf = headerFormat(tpl?.components);
  const send = async () => {
    if (!tpl) return;
    if (normPhone(to).length < 8) { toast.error(t('Enter the full international number (e.g. 966501234567)')); return; }
    if ((hf === 'IMAGE' || hf === 'DOCUMENT') && !file.length) { toast.error(t('This template needs a header file.')); return; }
    setBusy(true);
    try {
      let media: { id: string; type: 'image' | 'document'; filename?: string } | undefined;
      if (file.length) {
        const fd = new FormData(); fd.append('file', file[0]);
        const u = await pfetch<{ media_id: string; filename?: string }>('/v1/rfq-bot/upload-media', { method: 'POST', body: fd, query: { store_id: storeId } });
        media = { id: u.media_id, type: hf === 'DOCUMENT' ? 'document' : 'image', filename: u.filename || file[0].name };
      }
      const components = buildTemplateComponents(tpl.components, Object.fromEntries(Object.entries(vars).map(([k, v]) => [`body_${k}`, v])), media);
      await papi.post('/v1/rfq-bot/waba-test-message', { store_id: storeId, to: normPhone(to), template_name: tpl.name, language_code: tpl.language || 'en', components });
      toast.success(t('Test message sent'));
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  if (!q.data?.length) return null;
  return (
    <Section title={t('Template tester')}>
      <div className="stack">
        <Field label={t('Template')}>{(id) => <Select id={id} value={name} onChange={(e) => { setName(e.target.value); setVars({}); setFile([]); }} placeholder={t('Choose a template')} options={(q.data || []).map((x) => ({ value: x.name, label: `${x.name} (${x.language})` }))} />}</Field>
        {tpl && <>
          {body && <div className="pr-mock"><div className="b">{body}</div></div>}
          <div className="grid-2c">{placeholders(body).map((ph) => <Field key={ph} label={`{{${ph}}}`}>{(id) => <Input id={id} value={vars[ph] || ''} onChange={(e) => setVars({ ...vars, [ph]: e.target.value })} />}</Field>)}</div>
          {(hf === 'IMAGE' || hf === 'DOCUMENT') && <FileDrop files={file} onChange={setFile} multiple={false} label={t('Header file')} accept={hf === 'IMAGE' ? '.jpg,.jpeg,.png' : '.pdf'} />}
          <div className="row" style={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <Field label={t('Send to')}>{(id) => <Input id={id} type="tel" className="num" placeholder="966501234567" value={to} onChange={(e) => setTo(e.target.value)} />}</Field>
            <Button icon="send" loading={busy} onClick={send}>{t('Send test')}</Button>
          </div>
        </>}
      </div>
    </Section>
  );
}

/* ── Purchase bills ───────────────────────────────────────────────────── */

function BillsTab({ d, set }: TabProps) {
  const { t } = useTranslation();
  return (
    <Section title={t('Purchase bills tracking')}>
      <div className="stack">
        <Toggle label={t('Track purchase bill images & PDFs')} checked={!!d.enable_purchase_bills_tracking} onChange={(v) => set('enable_purchase_bills_tracking', v)} hint={t('WhatsApp messages from the manager numbers below are collected as purchase bills.')} />
        <Field label={t('Manager WhatsApp numbers')} hint={t('Press Enter after each number.')}>{() => <ChipsInput label={t('Manager WhatsApp numbers')} value={d.purchase_bills_manager_numbers || []} normalize={normPhone} onChange={(v) => set('purchase_bills_manager_numbers', v)} placeholder="966501234567" />}</Field>
      </div>
    </Section>
  );
}

/* ── Email ────────────────────────────────────────────────────────────── */

type FieldSpec = [key: string, label: string, kind?: 'secret' | 'number' | 'bool'];
interface ProviderSpec { value: string; label: string; kind: 'oauth' | 'webhook' | 'imap'; fields: FieldSpec[] }
export const EMAIL_PROVIDERS: ProviderSpec[] = [
  { value: 'gmail', label: 'Gmail', kind: 'oauth', fields: [['rfq_gmail_client_id', 'Client ID'], ['rfq_gmail_client_secret', 'Client secret', 'secret']] },
  { value: 'outlook', label: 'Outlook / Microsoft 365', kind: 'oauth', fields: [['rfq_outlook_tenant_id', 'Tenant ID'], ['rfq_outlook_client_id', 'Client ID'], ['rfq_outlook_client_secret', 'Client secret', 'secret']] },
  { value: 'zoho', label: 'Zoho Mail', kind: 'oauth', fields: [['rfq_zoho_client_id', 'Client ID'], ['rfq_zoho_client_secret', 'Client secret', 'secret'], ['rfq_zoho_smtp_username', 'SMTP username (optional)'], ['rfq_zoho_smtp_password', 'SMTP password (optional)', 'secret']] },
  { value: 'imap', label: 'IMAP (any mailbox)', kind: 'imap', fields: [['rfq_imap_host', 'IMAP host'], ['rfq_imap_port', 'Port', 'number'], ['rfq_imap_username', 'Username'], ['rfq_imap_password', 'Password', 'secret'], ['rfq_imap_use_ssl', 'Use SSL', 'bool']] },
  { value: 'mailgun', label: 'Mailgun (inbound webhook)', kind: 'webhook', fields: [['rfq_mailgun_api_key', 'API key', 'secret'], ['rfq_mailgun_domain', 'Domain']] },
  { value: 'sendgrid', label: 'SendGrid (inbound parse)', kind: 'webhook', fields: [['rfq_sendgrid_api_key', 'API key', 'secret']] },
  { value: 'postmark', label: 'Postmark (inbound)', kind: 'webhook', fields: [['rfq_postmark_server_token', 'Server token', 'secret']] },
  { value: 'ses', label: 'Amazon SES (inbound)', kind: 'webhook', fields: [['rfq_aws_ses_access_key_id', 'Access key ID'], ['rfq_aws_ses_secret_key', 'Secret key', 'secret'], ['rfq_aws_ses_region', 'Region']] },
];
export const OUTGOING_PROVIDERS: { value: string; label: string; fields: FieldSpec[] }[] = [
  { value: 'smtp', label: 'SMTP (Universal)', fields: [['outgoing_email_smtp_host', 'SMTP host'], ['outgoing_email_smtp_port', 'Port', 'number'], ['outgoing_email_smtp_username', 'Username'], ['outgoing_email_smtp_password', 'Password', 'secret'], ['outgoing_email_smtp_use_tls', 'Use TLS', 'bool']] },
  { value: 'sendgrid', label: 'SendGrid', fields: [['outgoing_email_sendgrid_api_key', 'API key', 'secret']] },
  { value: 'mailgun', label: 'Mailgun', fields: [['outgoing_email_mailgun_api_key', 'API key', 'secret'], ['outgoing_email_mailgun_domain', 'Domain']] },
  { value: 'ses', label: 'Amazon SES', fields: [['outgoing_email_ses_access_key_id', 'Access key ID'], ['outgoing_email_ses_secret_key', 'Secret key', 'secret'], ['outgoing_email_ses_region', 'Region']] },
  { value: 'postmark', label: 'Postmark', fields: [['outgoing_email_postmark_server_token', 'Server token', 'secret']] },
  { value: 'brevo', label: 'Brevo', fields: [['outgoing_email_brevo_api_key', 'API key', 'secret']] },
  { value: 'resend', label: 'Resend', fields: [['outgoing_email_resend_api_key', 'API key', 'secret']] },
];

function SpecFields({ fields, v, set }: { fields: FieldSpec[]; v: S; set: (k: string, val: any) => void }) {
  const { t } = useTranslation();
  return (
    <div className="grid-2c">
      {fields.map(([k, label, kind]) => kind === 'bool'
        ? <div key={k} style={{ alignSelf: 'end' }}><Checkbox label={t(label)} checked={!!v[k]} onChange={(e) => set(k, e.target.checked)} /></div>
        : <Field key={k} label={t(label)}>{(id) => <Input id={id} type={kind === 'secret' ? 'password' : 'text'} inputMode={kind === 'number' ? 'numeric' : undefined} className={kind === 'number' ? 'num' : undefined} autoComplete={kind === 'secret' ? 'new-password' : 'off'}
          value={v[k] ?? ''} onChange={(e) => set(k, kind === 'number' ? (e.target.value === '' ? '' : Number(e.target.value.replace(/\D/g, ''))) : e.target.value)} />}</Field>)}
    </div>
  );
}

interface EmailAccount { id: string; provider: string; email?: string; imap_host?: string; imap_port?: number; imap_username?: string; imap_use_ssl?: boolean; smtp_host?: string; smtp_port?: number; smtp_username?: string; last_polled_at?: string }

function EmailTab(p: TabProps) {
  const { t } = useTranslation();
  const { d, set } = p;
  return (
    <>
      <EmailAccounts storeId={p.storeId} fallback={d.rfq_email_accounts} />
      <Section title={t('Incoming email rules')}>
        <div className="stack">
          <Field label={t('Accept only emails containing')} hint={t('Keywords matched in subject/body. Leave empty to accept all emails.')}>{() => <ChipsInput label={t('Keywords')} value={d.incoming_email_keywords || []} onChange={(v) => set('incoming_email_keywords', v)} placeholder={t('e.g. RFQ, quotation')} />}</Field>
          <div className="grid-2c"><TextSetting {...p} k="auto_delete_procurement_messages_days" type="number" label={t('Auto-delete messages after (days)')} hint={t('0 keeps messages forever.')} /></div>
        </div>
      </Section>
      <OutgoingEmail {...p} />
      <Signatures storeId={p.storeId} initial={d.email_signatures || []} />
    </>
  );
}

function EmailAccounts({ storeId, fallback }: { storeId: string; fallback?: EmailAccount[] }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [confirmEl, ask] = useConfirm();
  const q = useQuery({ queryKey: ['procurement-email-accounts', storeId], queryFn: () => papi.get<{ accounts: EmailAccount[] | null }>('/v1/rfq-email/accounts', { store_id: storeId }).then((r) => r.accounts || fallback || []), enabled: !!storeId });
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<EmailAccount | null>(null);
  const accounts = q.data || [];
  const test = async (a: EmailAccount) => {
    try { const r = await papi.post<{ status: string; message?: string }>(`/v1/rfq-email/account/${a.id}/test-imap`, {}, { store_id: storeId }); if (r.status === 'ok') toast.success(r.message || t('IMAP connection OK')); else toast.error(r.message || t('IMAP test failed')); }
    catch (e) { toast.error((e as Error).message); }
  };
  const remove = async (a: EmailAccount) => {
    if (!(await ask(t('Disconnect {{e}}?', { e: a.email || a.provider }), { danger: true, confirmLabel: t('Disconnect') }))) return;
    try { await papi.del(`/v1/rfq-email/account/${a.id}`, { store_id: storeId }); toast.success(t('Disconnected')); q.refetch(); } catch (e) { toast.error((e as Error).message); }
  };
  return (
    <Section title={t('Email sources')} actions={<>
      {accounts.length ? <Pill tone="good">{t('{{n}} accounts', { n: accounts.length })}</Pill> : <Pill tone="neutral" icon="xc">{t('Not connected')}</Pill>}
      <Button icon="plus" onClick={() => setAdding(true)}>{t('Add account')}</Button>
    </>}>
      {q.isLoading ? <Spinner /> : !accounts.length ? <EmptyState icon="mail" title={t('No email accounts connected')}>{t('Connect the mailbox where customers send RFQs and suppliers send quotations.')}</EmptyState> : (
        <div className="pr-grid-cards">
          {accounts.map((a) => (
            <div className="pr-reply" key={a.id}>
              <b><bdi>{a.email || t('(pending authorisation)')}</bdi></b>
              <span className="muted">{EMAIL_PROVIDERS.find((x) => x.value === a.provider)?.label || a.provider}{a.last_polled_at ? ` · ${t('last checked')} ${fmtDateTime(a.last_polled_at)}` : ''}</span>
              <div className="row" style={{ gap: 4 }}>
                <Button size="sm" icon="sliders" onClick={() => setEditing(a)}>{t('IMAP / SMTP')}</Button>
                <Button size="sm" icon="checkc" onClick={() => test(a)}>{t('Test IMAP')}</Button>
                <IconButton icon="trash" label={`${t('Disconnect')} ${a.email || a.provider}`} onClick={() => remove(a)} />
              </div>
            </div>
          ))}
        </div>
      )}
      <AddAccountModal open={adding} storeId={storeId} onClose={() => setAdding(false)} onDone={() => q.refetch()} />
      <AccountSettingsModal account={editing} storeId={storeId} onClose={() => setEditing(null)} onDone={() => q.refetch()} />
      {confirmEl}
    </Section>
  );
}

function AddAccountModal({ open, storeId, onClose, onDone }: { open: boolean; storeId: string; onClose: () => void; onDone: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [provider, setProvider] = useState('gmail');
  const [v, setV] = useState<S>({ rfq_imap_port: 993, rfq_imap_use_ssl: true });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [webhook, setWebhook] = useState('');
  const [waiting, setWaiting] = useState<string | null>(null);
  const spec = EMAIL_PROVIDERS.find((x) => x.value === provider)!;
  useEffect(() => { if (open) { setErr(''); setWebhook(''); setWaiting(null); } }, [open]);
  useEffect(() => {
    if (!waiting) return;
    let n = 0;
    const poll = setInterval(async () => {
      n++;
      try {
        const s = await papi.get<{ connected: boolean; email?: string }>(`/v1/rfq-email/account/${waiting}/status`, { store_id: storeId });
        if (s.connected) { toast.success(t('Connected {{e}}', { e: s.email || '' })); setWaiting(null); onDone(); onClose(); }
      } catch { /* keep polling */ }
      if (n > 100) setWaiting(null);
    }, 3000);
    const onMsg = (e: MessageEvent) => { if (e.data?.rfqEmailOAuth === 'done') { setWaiting(null); onDone(); onClose(); } };
    window.addEventListener('message', onMsg);
    return () => { clearInterval(poll); window.removeEventListener('message', onMsg); };
  }, [waiting, storeId, onDone, onClose, toast, t]);
  const connect = async () => {
    const missing = spec.fields.filter(([k, label, kind]) => kind !== 'bool' && !/optional/i.test(label) && (v[k] === undefined || v[k] === ''));
    if (missing.length) { setErr(t('Fill in: {{f}}', { f: missing.map((m) => t(m[1])).join(', ') })); return; }
    setBusy(true); setErr('');
    try {
      const body: S = { store_id: storeId, provider, callback_url: `${window.location.origin}/v1/rfq-email/oauth-callback` };
      spec.fields.forEach(([k]) => { if (v[k] !== undefined && v[k] !== '') body[k] = v[k]; });
      const r = await papi.post<{ account_id: string; oauth_url?: string; connected?: boolean; email?: string; webhook_url?: string }>('/v1/rfq-email/account', body);
      if (r.oauth_url) { window.open(r.oauth_url, 'rfq_email_oauth', 'width=700,height=600'); setWaiting(r.account_id); }
      else if (r.webhook_url && spec.kind === 'webhook') { setWebhook(r.webhook_url); onDone(); }
      else { toast.success(t('Connected {{e}}', { e: r.email || '' })); onDone(); onClose(); }
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={onClose} title={t('Add email account')} width={620}
      footer={<><Button variant="ghost" onClick={onClose}>{webhook ? t('Done') : t('Cancel')}</Button>{!webhook && <Button variant="primary" loading={busy || !!waiting} onClick={connect}>{waiting ? t('Waiting for authorisation…') : spec.kind === 'oauth' ? t('Authorise') : t('Connect')}</Button>}</>}>
      <div className="stack">
        {err && <Banner tone="crit">{err}</Banner>}
        <Field label={t('Provider')}>{(id) => <Select id={id} value={provider} onChange={(e) => { setProvider(e.target.value); setErr(''); }} options={EMAIL_PROVIDERS.map((x) => ({ value: x.value, label: x.label }))} />}</Field>
        {spec.kind === 'oauth' && <Banner tone="info">{t('Create OAuth credentials with redirect URI')} <code className="mono" style={{ overflowWrap: 'anywhere' }}>{`${window.location.origin}/v1/rfq-email/oauth-callback`}</code>, {t('then authorise in the pop-up window.')}</Banner>}
        <SpecFields fields={spec.fields} v={v} set={(k, val) => setV((x) => ({ ...x, [k]: val }))} />
        {webhook && <Banner tone="good">{t('Point your provider’s inbound webhook to:')} <code className="mono" style={{ overflowWrap: 'anywhere' }}>{webhook}</code> <CopyButton text={webhook} /></Banner>}
      </div>
    </Modal>
  );
}

function AccountSettingsModal({ account, storeId, onClose, onDone }: { account: EmailAccount | null; storeId: string; onClose: () => void; onDone: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [v, setV] = useState<S>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (account) setV({ imap_host: account.imap_host || '', imap_port: account.imap_port || 993, imap_username: account.imap_username || '', imap_use_ssl: account.imap_use_ssl ?? true, imap_password: '', smtp_host: account.smtp_host || '', smtp_port: account.smtp_port || 587, smtp_username: account.smtp_username || '', smtp_password: '' }); }, [account]);
  if (!account) return null;
  const save = async () => {
    setBusy(true);
    try { await papi.patch(`/v1/rfq-email/account/${account.id}/settings`, v, { store_id: storeId }); toast.success(t('Account settings saved')); onDone(); onClose(); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  const f: FieldSpec[] = [['imap_host', 'IMAP host'], ['imap_port', 'IMAP port', 'number'], ['imap_username', 'IMAP username'], ['imap_password', 'IMAP password', 'secret'], ['imap_use_ssl', 'Use SSL', 'bool'], ['smtp_host', 'SMTP host'], ['smtp_port', 'SMTP port', 'number'], ['smtp_username', 'SMTP username'], ['smtp_password', 'SMTP password', 'secret']];
  return (
    <Modal open onClose={onClose} title={`${t('Incoming & outgoing mail')} · ${account.email || account.provider}`} width={620}
      footer={<><Button variant="ghost" onClick={onClose}>{t('Cancel')}</Button><Button variant="primary" loading={busy} onClick={save}>{t('Save')}</Button></>}>
      <div className="stack"><p className="muted" style={{ margin: 0 }}>{t('Passwords are write-only; leave blank to keep the saved one.')}</p><SpecFields fields={f} v={v} set={(k, val) => setV((x) => ({ ...x, [k]: val }))} /></div>
    </Modal>
  );
}

function OutgoingEmail(p: TabProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const { d, set, storeId } = p;
  const spec = OUTGOING_PROVIDERS.find((x) => x.value === d.outgoing_email_provider);
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState(false);
  const test = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to.trim())) { toast.error(t('Enter a valid recipient email address')); return; }
    setBusy(true);
    try { await papi.post('/v1/outgoing-email/test', { to: to.trim() }, { store_id: storeId }); toast.success(t('Test email sent to {{to}}', { to })); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <Section title={t('Outgoing email')}>
      <div className="stack">
        <div className="grid-2c">
          <Field label={t('Provider')}>{(id) => <Select id={id} value={d.outgoing_email_provider || ''} onChange={(e) => set('outgoing_email_provider', e.target.value)} placeholder={t('Use the mailbox’s own SMTP')} options={OUTGOING_PROVIDERS.map((x) => ({ value: x.value, label: x.label }))} />}</Field>
          <span />
          <TextSetting {...p} k="outgoing_email_from_name" label={t('From name')} />
          <TextSetting {...p} k="outgoing_email_from_address" type="email" label={t('From address')} />
        </div>
        {spec && <SpecFields fields={spec.fields} v={d} set={set} />}
        <div className="row" style={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <Field label={t('Send a test email to')} hint={t('Uses the saved settings — save first.')}>{(id, desc) => <Input id={id} aria-describedby={desc} type="email" value={to} onChange={(e) => setTo(e.target.value)} />}</Field>
          <Button icon="send" loading={busy} onClick={test}>{t('Send test')}</Button>
        </div>
      </div>
    </Section>
  );
}

interface Signature { id: string; name: string; content: string; is_default: boolean; is_html: boolean }
function Signatures({ storeId, initial }: { storeId: string; initial: Signature[] }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [list, setList] = useState<Signature[]>(initial);
  const [edit, setEdit] = useState<Signature | null>(null);
  const [confirmEl, ask] = useConfirm();
  useEffect(() => setList(initial), [initial]);
  const persist = async (next: Signature[]) => {
    try { await api.put(`/v1/store/${storeId}/email-signatures`, { email_signatures: next }, { search: { store_id: storeId } }); setList(next); toast.success(t('Signatures saved')); return true; }
    catch (e) { toast.error((e as Error).message); return false; }
  };
  const save = async () => {
    if (!edit) return;
    if (!edit.name.trim()) { toast.error(t('Name is required')); return; }
    let next = list.some((s) => s.id === edit.id) ? list.map((s) => (s.id === edit.id ? edit : s)) : [...list, edit];
    if (edit.is_default) next = next.map((s) => ({ ...s, is_default: s.id === edit.id }));
    if (await persist(next)) setEdit(null);
  };
  const remove = async (s: Signature) => { if (await ask(t('Delete signature “{{n}}”?', { n: s.name }), { danger: true, confirmLabel: t('Delete') })) persist(list.filter((x) => x.id !== s.id)); };
  return (
    <Section title={t('Email signatures')} actions={<Button icon="plus" onClick={() => setEdit({ id: `sig_${Date.now()}`, name: '', content: '', is_default: list.length === 0, is_html: false })}>{t('Add signature')}</Button>}>
      {!list.length ? <span className="muted">{t('No signatures yet.')}</span> : (
        <ul className="pr-files">{list.map((s) => <li key={s.id}><b><bdi>{s.name}</bdi></b>{s.is_default && <Pill tone="info">{t('Default')}</Pill>}<span className="spacer" /><IconButton icon="edit" label={`${t('Edit')} ${s.name}`} onClick={() => setEdit(s)} /><IconButton icon="trash" label={`${t('Delete')} ${s.name}`} onClick={() => remove(s)} /></li>)}</ul>
      )}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={t('Email signature')} width={560} footer={<><Button variant="ghost" onClick={() => setEdit(null)}>{t('Cancel')}</Button><Button variant="primary" onClick={save}>{t('Save')}</Button></>}>
        {edit && <div className="stack">
          <Field label={t('Name')} required>{(id) => <Input id={id} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />}</Field>
          <Field label={t('Content')}>{(id) => <Textarea id={id} rows={6} value={edit.content} onChange={(e) => setEdit({ ...edit, content: e.target.value })} />}</Field>
          <Checkbox label={t('Content is HTML')} checked={edit.is_html} onChange={(e) => setEdit({ ...edit, is_html: e.target.checked })} />
          <Checkbox label={t('Default signature')} checked={edit.is_default} onChange={(e) => setEdit({ ...edit, is_default: e.target.checked })} />
        </div>}
      </Modal>
      {confirmEl}
    </Section>
  );
}

/* ── Google ───────────────────────────────────────────────────────────── */

function GoogleTab(p: TabProps) {
  const { t } = useTranslation();
  const { d, set, storeId } = p;
  const [kw, setKw] = useState('');
  const [market, setMarket] = useState('');
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ places: { name: string; phone?: string; address?: string; rating?: number; maps_url?: string }[] } | null>(null);
  const [err, setErr] = useState('');
  const test = async () => {
    if (!kw.trim() || !d.google_maps_api_key) { setErr(t('Enter an API key and a keyword.')); return; }
    setBusy(true); setErr(''); setRes(null);
    try { setRes(await papi.get('/v1/rfq-bot/test-google-maps', { store_id: storeId, keyword: kw.trim(), market: market || undefined, api_key: d.google_maps_api_key })); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <>
      <Section title={t('Google Maps')}>
        <div className="stack">
          <div className="grid-2c"><TextSetting {...p} k="google_maps_api_key" type="password" label={t('Google Maps API key')} hint={t('Used to find suppliers near your purchase markets (Places API).')} /></div>
          <div className="row" style={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <Field label={t('Test keyword')}>{(id) => <Input id={id} placeholder={t('e.g. auto spare parts')} value={kw} onChange={(e) => setKw(e.target.value)} />}</Field>
            <Field label={t('Market')}>{(id) => <Select id={id} value={market} onChange={(e) => setMarket(e.target.value)} placeholder={t('Any')} options={(d.purchase_markets || []).map((m: string) => ({ value: m, label: m }))} />}</Field>
            <Button icon="search" loading={busy} onClick={test}>{t('Test')}</Button>
          </div>
          {err && <Banner tone="crit">{err}</Banner>}
          {res && <div className="pr-scroll"><table className="pr-table" aria-label={t('Places found')}><thead><tr><th>{t('Name')}</th><th>{t('Phone')}</th><th>{t('Address')}</th><th>{t('Rating')}</th></tr></thead>
            <tbody>{(res.places || []).map((pl, i) => <tr key={i}><td>{pl.maps_url ? <a className="link" href={pl.maps_url} target="_blank" rel="noopener noreferrer">{pl.name}</a> : pl.name}</td><td className="num">{pl.phone}</td><td>{pl.address}</td><td className="num">{pl.rating}</td></tr>)}</tbody></table></div>}
        </div>
      </Section>
      <Section title={t('Purchase markets')}>
        <div className="stack">
          <Field label={t('Cities where you buy')} hint={t('Suppliers are assigned to one of these markets.')}>{() => <ChipsInput label={t('Purchase markets')} value={d.purchase_markets || []} normalize={titleCase} onChange={(v) => set('purchase_markets', v)} placeholder={t('e.g. Riyadh')} />}</Field>
          <div className="grid-2c"><TextSetting {...p} k="rfq_min_suppliers" type="number" label={t('Minimum suppliers per RFQ')} hint={t('Fewer matches triggers a warning (default 2).')} /></div>
        </div>
      </Section>
    </>
  );
}

/* ── RFQ rules ────────────────────────────────────────────────────────── */

function LlmPair({ d, set, prefix, label, hint }: TabProps & { prefix: string; label: string; hint?: string }) {
  const { t } = useTranslation();
  const prov = d[`${prefix}_provider`] || '';
  return (
    <div className="grid-2c">
      <Field label={`${label} — ${t('provider')}`} hint={hint}>{(id) => <Select id={id} value={prov} onChange={(e) => { set(`${prefix}_provider`, e.target.value); set(`${prefix}_model`, modelsForProvider(e.target.value)[0]?.value || ''); }} placeholder={t('Default')} options={AI_PROVIDERS.map((x) => ({ value: x.value, label: x.label }))} />}</Field>
      <Field label={`${label} — ${t('model')}`}>{(id) => <Select id={id} value={d[`${prefix}_model`] || ''} onChange={(e) => set(`${prefix}_model`, e.target.value)} placeholder={t('Default')} options={modelsForProvider(prov).map((m) => ({ value: m.value, label: `${m.label} · ${m.costLabel}` }))} />}</Field>
    </div>
  );
}

function RfqTab(p: TabProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const { d, set, storeId } = p;
  const markets: string[] = d.purchase_markets || [];
  const fwd: string[] = d.rfq_forward_markets || [];
  const [pop, setPop] = useState<{ percent: number; message: string } | null>(null);
  const [checking, setChecking] = useState(false);
  useRfqEvents(pop ? storeId : undefined, { populate_progress: (x) => { if (x?.done) { setPop(null); toast.success(t('Supplier population finished')); } else setPop({ percent: x?.percent || 0, message: x?.message || '' }); } });
  const populate = async () => {
    try { await papi.post('/v1/rfq-bot/populate-suppliers', {}, { store_id: storeId }); setPop({ percent: 0, message: t('Starting…') }); } catch (e) { toast.error((e as Error).message); }
  };
  const checkSenders = async () => {
    setChecking(true);
    try {
      const res = await Promise.all((d.rfq_allowed_senders || []).map((ph: string) => papi.get<{ exists: boolean; note?: string }>('/v1/rfq-bot/check-whatsapp', { store_id: storeId, phone: ph }).then((r) => `${ph}: ${r.exists ? '✓' : '✗'}`).catch((e) => `${ph}: ${(e as Error).message}`)));
      toast.info(res.join(' · ') || t('No senders to check'));
    } finally { setChecking(false); }
  };
  return (
    <>
      <Section title={t('RFQ module & quotations')}>
        <div className="stack">
          <Toggle label={t('Enable RFQ module')} checked={!!d.enable_rfq_module} onChange={(v) => set('enable_rfq_module', v)} hint={t('Shows the RFQ inbox and suppliers (also needs the AI RFQ bot).')} />
          <Toggle label={t('Create RFQ suppliers from purchases')} checked={!!d.enable_rfq_supplier_on_purchase} onChange={(v) => set('enable_rfq_supplier_on_purchase', v)} />
          <div className="grid-2c"><TextSetting {...p} k="default_quotation_margin_percent" type="number" label={t('Default quotation margin %')} hint={t('Used in price comparison when a product has no margin (default 35).')} /></div>
          <Field label={t('Pre-select these markets when sending')}>{() => (
            <div className="row" style={{ flexWrap: 'wrap' }}>
              {markets.length ? markets.map((m) => <Checkbox key={m} label={m} checked={fwd.includes(m)} onChange={(e) => set('rfq_forward_markets', e.target.checked ? [...fwd, m] : fwd.filter((x) => x !== m))} />)
                : <span className="muted">{t('Add purchase markets on the Google tab first.')} <Link className="link" to="/procurement/settings?tab=google">{t('Open Google settings')}</Link></span>}
            </div>
          )}</Field>
        </div>
      </Section>
      <Section title={t('Automatic RFQ creation')}>
        <div className="stack">
          <Toggle label={t('Create RFQs automatically from incoming email')} checked={!d.disable_auto_rfq_from_email} onChange={(v) => set('disable_auto_rfq_from_email', !v)} />
          <Toggle label={t('Create RFQs automatically from incoming WhatsApp')} checked={!d.disable_auto_rfq_from_whatsapp} onChange={(v) => set('disable_auto_rfq_from_whatsapp', !v)} />
          <Field label={t('Allowed WhatsApp senders')} hint={t('Only these numbers can create RFQs. Empty = everyone.')}>{() => <ChipsInput label={t('Allowed senders')} value={d.rfq_allowed_senders || []} normalize={normPhone} onChange={(v) => set('rfq_allowed_senders', v)} placeholder="966501234567" />}</Field>
          <div><Button size="sm" icon="wa" loading={checking} onClick={checkSenders} disabled={!(d.rfq_allowed_senders || []).length}>{t('Check numbers on WhatsApp')}</Button></div>
        </div>
      </Section>
      <Section title={t('AI models per task')}>
        <div className="stack">
          <LlmPair {...p} prefix="rfq_llm" label={t('RFQ parsing')} hint={t('API keys come from the AI models tab.')} />
          <LlmPair {...p} prefix="classify_llm" label={t('Classification')} />
          <LlmPair {...p} prefix="quotation_llm" label={t('Quotation extraction')} />
          <LlmPair {...p} prefix="populate_suppliers_llm" label={t('Supplier population')} />
        </div>
      </Section>
      <Section title={t('Populate RFQ suppliers from vendors')}>
        <div className="stack">
          <p className="muted" style={{ margin: 0 }}>{t('Categorises your vendors with AI, looks them up on Google Maps and adds them as RFQ suppliers.')}</p>
          {pop && <div role="status"><b>{pop.message}</b><div className="pr-bar"><i style={{ width: `${pop.percent}%` }} /></div></div>}
          <div><Button icon="users" loading={!!pop} onClick={populate}>{t('Populate suppliers')}</Button></div>
        </div>
      </Section>
      <ExtractionTest storeId={storeId} />
    </>
  );
}

function ExtractionTest({ storeId }: { storeId: string }) {
  const { t } = useTranslation();
  const ai = useAiChoice();
  const [text, setText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [res, setRes] = useState<ExtractResult | null>(null);
  const run = async () => {
    if (!text.trim() && !files.length) { setErr(t('Enter text or choose a file.')); return; }
    const fd = new FormData();
    fd.append('llm_provider', ai.provider); fd.append('llm_model', ai.model); fd.append('text', text);
    files.forEach((f) => fd.append('files', f));
    setBusy(true); setErr(''); setRes(null);
    try { setRes(await pfetch<ExtractResult>('/v1/procurement-extract-test', { method: 'POST', body: fd, query: { store_id: storeId } })); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <Section title={t('Content extraction test')}>
      <div className="stack">
        <AiPicker ai={ai} compact />
        <Field label={t('Sample enquiry text')}>{(id) => <Textarea id={id} rows={4} value={text} onChange={(e) => setText(e.target.value)} />}</Field>
        <FileDrop files={files} onChange={setFiles} label={t('Sample files')} accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.xlsx,.xls,.csv,.txt" />
        <div><Button icon="layers" loading={busy} onClick={run}>{t('Run test')}</Button></div>
        {err && <Banner tone="crit">{err}</Banner>}
        {res && <>
          <dl className="pr-kv"><dt>{t('Customer')}</dt><dd>{[res.customer_name, res.customer_company, res.customer_phone, res.customer_email].filter(Boolean).join(' · ') || '—'}</dd><dt>{t('Model used')}</dt><dd>{res.llm_model || '—'}</dd></dl>
          <div className="pr-scroll"><table className="pr-table" aria-label={t('Products')}><thead><tr><th>#</th><th>{t('Part No.')}</th><th>{t('Name')}</th><th className="r">{t('Qty')}</th><th>{t('Unit')}</th></tr></thead>
            <tbody>{(res.products || []).map((x, i) => <tr key={i}><td>{i + 1}</td><td>{x.part_no}</td><td>{x.name}</td><td className="r num">{x.quantity}</td><td>{x.unit}</td></tr>)}</tbody></table></div>
          {res.general_instructions && <Banner tone="info">{res.general_instructions}</Banner>}
          {res.text_content && <details><summary className="link">{t('Raw output')}</summary><div className="pr-wrap muted">{res.text_content}</div></details>}
        </>}
      </div>
    </Section>
  );
}

/* ── AI models ────────────────────────────────────────────────────────── */

function AiTab({ d, set }: TabProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const [testing, setTesting] = useState('');
  const test = async (prov: string, key: string) => {
    if (!key) { toast.error(t('Enter a key first.')); return; }
    setTesting(prov);
    try {
      const r = await papi.post<{ connected: boolean; error?: string }>('/v1/rfq-bot/check-llm', { provider: prov, api_key: key, model: modelsForProvider(prov)[0]?.value || '' });
      if (r.connected) toast.success(t('Key works')); else toast.error(r.error || t('Key rejected'));
    } catch (e) { toast.error((e as Error).message); } finally { setTesting(''); }
  };
  return (
    <Section title={t('AI model API keys')}>
      <div className="stack">
        <p className="muted" style={{ margin: 0 }}>{t('Add a key for at least one provider to enable AI extraction of RFQs and supplier quotations. Keys are saved with the store settings.')}</p>
        {AI_PROVIDERS.map((pr) => (
          <div key={pr.value} className="pr-reply">
            <div className="row" style={{ flexWrap: 'wrap' }}>
              <b style={{ flex: 1 }}>{pr.label}</b>
              {d[pr.apiKeyField] ? <Pill tone="good">{t('Key saved')}</Pill> : <Pill tone="neutral" icon="xc">{t('No key')}</Pill>}
              <a className="link" href={pr.docsUrl} target="_blank" rel="noopener noreferrer">{t('Get a key')}</a>
            </div>
            <span className="muted" style={{ fontSize: 12 }}>{pr.keyInstructions}</span>
            <div className="row" style={{ flexWrap: 'nowrap', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}><Field label={`${pr.label} ${t('API key')}`}>{(id) => <Input id={id} type="password" autoComplete="new-password" value={d[pr.apiKeyField] || ''} onChange={(e) => set(pr.apiKeyField, e.target.value)} />}</Field></div>
              <Button size="sm" loading={testing === pr.value} onClick={() => test(pr.value, d[pr.apiKeyField] || '')}>{t('Test key')}</Button>
            </div>
            {pr.value === 'cloudflare' && <Field label={t('Cloudflare account ID')}>{(id) => <Input id={id} value={d.extraction_cloudflare_account_id || ''} onChange={(e) => set('extraction_cloudflare_account_id', e.target.value)} />}</Field>}
            <span className="muted" style={{ fontSize: 11.5 }}>{pr.models.map((m) => `${m.label} (${m.costLabel})`).join(' · ')}</span>
          </div>
        ))}
      </div>
    </Section>
  );
}
