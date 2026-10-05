import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth, useStoreId } from '@/auth/AuthContext';
import { session } from '@/api/session';
import { Button, IconButton } from '@/ui/Button';
import { Banner, EmptyState, Spinner } from '@/ui/Misc';
import { Checkbox, Field, Input } from '@/ui/Field';
import { AsyncPicker } from '@/ui/AsyncPicker';
import { Pill } from '@/ui/Pill';
import { useToast } from '@/ui/Toast';
import { papi } from '../api';
import { buildRecipients, buildTemplateComponents, defaultSelected, fillTemplate, headerFormat, normPhone, templateWantsDocument, titleCase, type Recipient } from '../logic';
import type { RFQ, RFQSupplier, SendPreview } from '../types';
import { Section, useRfqEvents } from '../components/common';
import { SUPPLIERS } from '../components/SupplierForm';

const extrasKey = (id: string) => `rfq_extra_${id}`;

/** Send-to-suppliers flow (§5.3): preview → pick recipients → send WABA template; live per-row status via SSE. */
export function SendPanel({ rfq, onSent }: { rfq: RFQ; onSent: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const storeId = useStoreId();
  const { setting, user } = useAuth();
  const [preview, setPreview] = useState<SendPreview | null>(null);
  const [loadErr, setLoadErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [extras, setExtras] = useState<{ name: string; phone: string; market?: string }[]>(() => session.getJSON(extrasKey(rfq.id), []));
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<Record<string, { s: 'sending' | 'sent' | 'failed'; e?: string }>>({});
  const [phase, setPhase] = useState<'preview' | 'sending' | 'done'>('preview');
  const [sendErr, setSendErr] = useState('');
  const [testPhone, setTestPhone] = useState('');
  const [testing, setTesting] = useState(false);
  const forwardMarkets: string[] = setting<string[]>('rfq_forward_markets', []) || [];
  const purchaseMarkets: string[] = setting<string[]>('purchase_markets', []) || [];

  const load = async (attempt = 0): Promise<void> => {
    setLoading(true);
    try {
      const p = await papi.get<SendPreview>(`/v1/rfq-received/${rfq.id}/send-preview`, { store_id: storeId });
      setPreview(p);
      setLoadErr('');
    } catch (e) {
      if (attempt < 2) { await new Promise((r) => setTimeout(r, 2000)); return load(attempt + 1); }
      setLoadErr((e as Error).message);
    } finally { setLoading(false); }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [rfq.id, storeId]);

  const recipients = useMemo(() => buildRecipients(preview, rfq.forwarded_to, extras, rfq.customer_phone).filter((r) => !removed.has(r.phone)), [preview, rfq.forwarded_to, rfq.customer_phone, extras, removed]);
  useEffect(() => { setSelected(defaultSelected(recipients, forwardMarkets)); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview, extras.length]);
  useEffect(() => { session.setJSON(extrasKey(rfq.id), extras.length ? extras : undefined); }, [extras, rfq.id]);

  useRfqEvents(phase === 'sending' ? storeId : undefined, {
    rfq_send_status: (d) => { if (d?.rfq_id === rfq.id && d.phone) setStatus((s) => ({ ...s, [normPhone(d.phone)]: { s: d.status === 'sent' ? 'sent' : 'failed', e: d.error } })); },
    rfq_send_done: (d) => { if (d?.rfq_id === rfq.id) setPhase('done'); },
  });

  const addExtra = (s: { name: string; phone: string; purchase_market?: string }) => {
    const p = normPhone(s.phone);
    if (!p) return;
    setRemoved((r) => { const n = new Set(r); n.delete(p); return n; });
    if (!recipients.some((r) => r.phone === p)) setExtras((x) => [...x, { name: s.name || p, phone: p, market: s.purchase_market }]);
    setSelected((x) => new Set(x).add(p));
  };
  const addByNumber = async (q: string) => {
    const p = normPhone(q);
    if (p.length < 8) { toast.error(t('Enter the full international number (e.g. 966501234567)')); return; }
    addExtra({ name: p, phone: p });
    try { await papi.post(SUPPLIERS, { name: p, phone: p, is_active: true, store_id: storeId }, { store_id: storeId }); } catch { /* already exists — fine */ }
  };

  const wantsDoc = templateWantsDocument(preview?.template_components);
  const send = async () => {
    const list = recipients.filter((r) => selected.has(r.phone) && !r.sent);
    if (!list.length) { toast.error(t('Select at least one supplier.')); return; }
    setSendErr('');
    setPhase('sending');
    setStatus(Object.fromEntries(list.map((r) => [r.phone, { s: 'sending' as const }])));
    try {
      const r = await papi.post<{ sent_count: number; recipient_statuses?: Record<string, string> }>(`/v1/rfq-received/${rfq.id}/send`,
        { prepared_by: user?.name || session.get('user_name') || '', authorized_by: '', user_id: user?.id, recipients: list.map((x) => ({ name: x.name, phone: x.phone })), generate_pdf: wantsDoc }, { store_id: storeId });
      const st = r.recipient_statuses || {};
      setStatus((s) => { const n = { ...s }; Object.entries(st).forEach(([ph, v]) => { n[normPhone(ph)] = { s: v === 'sent' ? 'sent' : 'failed' }; }); return n; });
      toast.success(t('Sent to {{n}} supplier(s)', { n: r.sent_count ?? 0 }));
      const failed = Object.values(st).some((v) => v !== 'sent');
      setPhase(failed ? 'preview' : 'done');
      if (!failed) session.set(extrasKey(rfq.id), null);
      onSent();
    } catch (e) {
      setSendErr((e as Error).message);
      setStatus({});
      setPhase('preview');
    }
  };

  const sendTest = async () => {
    const to = normPhone(testPhone);
    if (to.length < 8) { toast.error(t('Enter the full international number (e.g. 966501234567)')); return; }
    if (!preview?.template_name) { toast.error(t('No WABA template is configured for RFQs.')); return; }
    setTesting(true);
    try {
      const hf = headerFormat(preview.template_components);
      let media: { id: string; type: 'image' | 'document'; filename?: string } | undefined;
      if (hf === 'DOCUMENT') { const g = await papi.post<{ media_id: string }>(`/v1/rfq-received/${rfq.id}/generate-pdf`, {}, { store_id: storeId }); media = { id: g.media_id, type: 'document', filename: `${rfq.code}.pdf` }; }
      else if (hf === 'IMAGE') { const g = await papi.post<{ media_id: string }>(`/v1/rfq-received/${rfq.id}/generate-image`, {}, { store_id: storeId }); media = { id: g.media_id, type: 'image' }; }
      const components = buildTemplateComponents(preview.template_components, preview.pre_filled_vars || {}, media);
      await papi.post('/v1/rfq-bot/waba-test-message', { store_id: storeId, to, template_name: preview.template_name, language_code: preview.template_language || 'en', components });
      toast.success(t('Test message sent to {{p}}', { p: to }));
    } catch (e) { toast.error((e as Error).message); } finally { setTesting(false); }
  };

  if (loading && !preview) return <div className="card pad row"><Spinner /> {t('Loading send preview…')}</div>;
  const warn = loadErr || preview?.error || preview?.config_warning;
  const selCount = recipients.filter((r) => selected.has(r.phone) && !r.sent).length;

  return (
    <div className="stack">
      {warn && (
        <Banner tone={loadErr ? 'crit' : 'warn'}>
          <b>{warn}</b>{' '}
          {/not connected|template|WABA/i.test(warn) && <>{t('Connect the bot WhatsApp number and choose the "RFQ to Supplier" template in')} <Link className="link" to="/procurement/settings?tab=whatsapp">{t('Procurement settings')}</Link>.</>}
          {/supplier/i.test(warn) && !/template/i.test(warn) && <> {t('Add suppliers below or fetch them from Google Maps.')}</>}
        </Banner>
      )}
      {sendErr && <Banner tone="crit">{sendErr}</Banner>}
      <Section title={<>{t('Recipients')} <span className="muted num">({recipients.length})</span></>}
        actions={<Button variant="primary" icon="send" loading={phase === 'sending'} disabled={!selCount} onClick={send}>{t('Send to {{n}} supplier(s)', { n: selCount })}</Button>}>
        <div className="stack">
          {(preview?.rfq_categories || []).length > 0 && <div className="pr-cats"><span className="muted">{t('Categories')}:</span>{preview!.rfq_categories!.map((c) => <span key={c} className="tag">{c}</span>)}</div>}
          {recipients.length === 0 ? <EmptyState icon="users" title={t('No suppliers matched yet')}>{t('Run AI categorisation, add suppliers manually, or fetch them from Google Maps.')}</EmptyState> : (
            <div className="pr-scroll">
              <table className="pr-table" aria-label={t('Recipients')}>
                <thead><tr><th style={{ width: 32 }} /><th>{t('Supplier')}</th><th>{t('WhatsApp')}</th><th>{t('Market')}</th><th>{t('Category')}</th><th>{t('Status')}</th><th /></tr></thead>
                <tbody>
                  {recipients.map((r: Recipient) => {
                    const st = status[r.phone];
                    return (
                      <tr key={r.phone}>
                        <td><input type="checkbox" className="chk" aria-label={`${t('Select')} ${r.name}`} disabled={r.sent || phase === 'sending'} checked={r.sent || selected.has(r.phone)}
                          onChange={(e) => setSelected((s) => { const n = new Set(s); if (e.target.checked) n.add(r.phone); else n.delete(r.phone); return n; })} /></td>
                        <td><bdi>{r.name}</bdi>{r.extra && <span className="muted"> · {t('added')}</span>}</td>
                        <td className="num">{r.phone}</td>
                        <td>{r.market || '—'}</td>
                        <td>{r.category || '—'}</td>
                        <td>{r.sent || st?.s === 'sent' ? <Pill tone="good">{t('Sent')}</Pill> : st?.s === 'sending' ? <Spinner label={t('Sending')} /> : st?.s === 'failed' ? <Pill tone="crit" title={st.e}>{t('Failed')}</Pill> : <span className="muted">{t('Not sent')}</span>}</td>
                        <td>{!r.sent && <IconButton icon="x" label={`${t('Remove')} ${r.name}`} onClick={() => { setRemoved((x) => new Set(x).add(r.phone)); setExtras((x) => x.filter((y) => y.phone !== r.phone)); }} />}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <Field label={t('Add supplier')} hint={t('Search suppliers by name or phone, or type a full number to add it.')}>{(id) => (
            <AsyncPicker id={id} aria-label={t('Add supplier')} value={null} resetOnPick placeholder={t('Search suppliers…')} createLabel={t('Add this number')} onCreate={addByNumber}
              load={async (q, signal) => q.length < 2 ? [] : (await papi.get<{ result: RFQSupplier[] }>(SUPPLIERS, { store_id: storeId, search: q, limit: 8 }, signal)).result?.map((s) => ({ id: s.id || s.phone, label: s.name, sub: [s.phone, s.purchase_market].filter(Boolean).join(' · '), data: s })) || []}
              onChange={(o) => o && addExtra(o.data)} />
          )}</Field>
        </div>
      </Section>

      <MapsFetch rfq={rfq} markets={purchaseMarkets} onFound={(list) => list.forEach((s) => addExtra(s))} />

      <Section title={t('WhatsApp preview')}>
        <div className="grid-2c">
          <div className="pr-mock" aria-label={t('WhatsApp preview')}>
            {preview?.template_name ? <div className="b">{preview.template_body || fillTemplate((preview.template_components || []).find((c) => c.type?.toUpperCase() === 'BODY')?.text, preview.pre_filled_vars || {})}</div>
              : <div className="b">{t('No template selected yet.')}</div>}
            {wantsDoc && <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>📄 {rfq.code}.pdf {t('is attached as the header document')}</div>}
          </div>
          <div className="stack">
            <dl className="pr-kv">
              <dt>{t('Template')}</dt><dd>{preview?.template_name || '—'} {preview?.template_language && <span className="muted">({preview.template_language})</span>}</dd>
              <dt>{t('Header')}</dt><dd>{headerFormat(preview?.template_components) || t('None')}</dd>
            </dl>
            <Field label={t('Send a test message to')}>{(id) => <Input id={id} type="tel" className="num" placeholder="966501234567" value={testPhone} onChange={(e) => setTestPhone(e.target.value)} />}</Field>
            <div><Button icon="send" loading={testing} onClick={sendTest}>{t('Send test')}</Button></div>
          </div>
        </div>
      </Section>
    </div>
  );
}

function MapsFetch({ rfq, markets, onFound }: { rfq: RFQ; markets: string[]; onFound: (s: RFQSupplier[]) => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const storeId = useStoreId();
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<string[]>(markets.map(titleCase));
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [custom, setCustom] = useState('');
  const [min, setMin] = useState('5');
  const [max, setMax] = useState('20');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const run = async () => {
    setErr('');
    if (!picked.size) { setErr(t('Select at least one market.')); return; }
    setBusy(true);
    try {
      const r = await papi.post<{ found: number; from_db: number; from_maps: number; suppliers: RFQSupplier[] }>('/v1/rfq-suppliers/fetch-from-maps',
        { rfq_id: rfq.id, markets: Array.from(picked), min_count: Number(min) || 5, max_count: Math.min(20, Number(max) || 20) }, { store_id: storeId });
      onFound(r.suppliers || []);
      toast.success(t('Found {{n}} suppliers ({{db}} saved, {{maps}} from Maps)', { n: r.found ?? 0, db: r.from_db ?? 0, maps: r.from_maps ?? 0 }));
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <Section title={t('Fetch suppliers from Google Maps')} actions={<Button size="sm" variant="ghost" icon={open ? 'chev' : 'chevr'} onClick={() => setOpen(!open)}>{open ? t('Hide') : t('Show')}</Button>}>
      {open ? (
        <div className="stack">
          {err && <Banner tone="crit">{err}{/API key/i.test(err) && <> <Link className="link" to="/procurement/settings?tab=google">{t('Open Google settings')}</Link></>}</Banner>}
          <div className="row" style={{ flexWrap: 'wrap' }}>
            {list.map((m) => <Checkbox key={m} label={m} checked={picked.has(m)} onChange={(e) => setPicked((p) => { const n = new Set(p); if (e.target.checked) n.add(m); else n.delete(m); return n; })} />)}
            {!list.length && <span className="muted">{t('No purchase markets configured — add one below.')}</span>}
          </div>
          <div className="row" style={{ flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <Field label={t('Custom market')}>{(id) => <Input id={id} value={custom} onChange={(e) => setCustom(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && custom.trim()) { e.preventDefault(); const m = titleCase(custom); setList((l) => (l.includes(m) ? l : [...l, m])); setPicked((p) => new Set(p).add(m)); setCustom(''); } }} />}</Field>
            <Field label={t('Min per category')}>{(id) => <Input id={id} className="num" inputMode="numeric" value={min} onChange={(e) => setMin(e.target.value)} style={{ width: 90 }} />}</Field>
            <Field label={t('Max per category')}>{(id) => <Input id={id} className="num" inputMode="numeric" value={max} onChange={(e) => setMax(e.target.value)} style={{ width: 90 }} />}</Field>
            <Button icon="search" loading={busy} onClick={run}>{t('Fetch suppliers')}</Button>
          </div>
        </div>
      ) : <span className="muted">{t('Find more suppliers for this RFQ’s categories in your purchase markets.')}</span>}
    </Section>
  );
}
