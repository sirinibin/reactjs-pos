import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/api/client';
import { useAuth, useStoreId } from '@/auth/AuthContext';
import { AsyncPicker } from '@/ui/AsyncPicker';
import { Button, IconButton } from '@/ui/Button';
import { Field, Input, SearchInput, Select } from '@/ui/Field';
import { Icon } from '@/ui/Icon';
import { Banner, EmptyState, ErrorState, Skeleton, useConfirm } from '@/ui/Misc';
import { Modal } from '@/ui/Overlay';
import { Pill } from '@/ui/Pill';
import { useToast } from '@/ui/Toast';
import { usePageMeta } from '@/shell/Workspace';
import { useDebounced } from '@/framework/useListState';
import { Pager } from '@/ui/DataGrid';
import { fmtDateTime, fmtMoney } from '@/lib/format';
import { EP, PATHS, purchaseFromExtraction, type Extraction } from './api';
import { searchPurchases } from './components';
import { BILL_KEY } from './purchases';

interface Attachment { url?: string; filename?: string; content_type?: string }
export interface BillMessage { id: string; purchase_bill_code?: string; sender_name?: string; from?: string; attachments?: Attachment[]; linked_purchase_id?: string; linked_purchase_code?: string; created_at?: string }

export const AI_PROVIDERS = [
  { value: 'gemini', label: 'Google Gemini', model: 'gemini-3.5-flash-lite', key: 'extraction_gemini_api_key' },
  { value: 'openai', label: 'OpenAI', model: 'gpt-4o-mini', key: 'extraction_openai_api_key' },
  { value: 'anthropic', label: 'Anthropic (Claude)', model: '', key: 'extraction_anthropic_api_key' },
  { value: 'groq', label: 'Groq', model: 'meta-llama/llama-4-scout-17b-16e-instruct', key: 'extraction_groq_api_key' },
  { value: 'mistral', label: 'Mistral AI', model: '', key: 'extraction_mistral_api_key' },
  { value: 'openrouter', label: 'OpenRouter', model: '', key: 'extraction_openrouter_api_key' },
];

const LS_P = '_rfq_extract_provider';
const LS_M = '_rfq_extract_model';
const lsGet = (k: string) => { try { return localStorage.getItem(k) || ''; } catch { return ''; } };
const lsSet = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } };
const isImage = (a: Attachment) => !!a.content_type?.startsWith('image/');
const isPdf = (a: Attachment) => a.content_type === 'application/pdf' || (a.filename || '').toLowerCase().endsWith('.pdf');

/** Find or create the vendor and products named on an extracted bill (legacy PurchaseBillsTab.js:535). */
export async function resolveExtraction(x: Extraction, storeId: string) {
  const S = { search: { store_id: storeId } };
  let vendor: any = null;
  const name = (x.vendor_company_name || '').trim();
  const vat = (x.vendor_vat_no || '').trim();
  try {
    if (name && vat) vendor = (await api.get<any>(`${EP.vendor}/vat_no/name`, { vat_no: vat, name, ...S }).catch(() => null))?.result || null;
    if (!vendor && name) {
      const r = await api.get<any[]>(EP.vendor, { search: { store_id: storeId, query: name }, limit: 5, select: 'id,name,vat_no,phone,address' });
      vendor = (r.result || []).find((v) => String(v.name).toLowerCase() === name.toLowerCase()) || (r.result || [])[0] || null;
    }
    if (!vendor && name) {
      const body: Record<string, any> = { store_id: storeId, name, ...(/^3\d{13}3$/.test(vat) ? { vat_no: vat } : {}), ...(x.vendor_mobile ? { phone: x.vendor_mobile } : {}), ...(x.vendor_national_address ? { address: x.vendor_national_address } : {}) };
      vendor = (await api.post<any>(EP.vendor, body, S)).result || null;
    }
  } catch { vendor = null; }
  const ids: (string | null)[] = [];
  for (const p of x.products || []) {
    let id: string | null = null;
    try {
      if (p.part_no) id = (await api.get<any[]>(EP.product, { search: { store_id: storeId, part_number: p.part_no }, limit: 1, select: 'id' })).result?.[0]?.id || null;
      if (!id && p.name) id = (await api.get<any[]>(EP.product, { search: { store_id: storeId, search_text: p.name }, limit: 1, select: 'id' })).result?.[0]?.id || null;
      if (!id) id = (await api.post<any>(EP.product, { store_id: storeId, name: p.name || p.part_no || 'Unknown', ...(p.part_no ? { part_number: p.part_no } : {}), ...(p.unit ? { unit: p.unit } : {}) }, S)).result?.id || null;
    } catch { id = null; }
    ids.push(id);
  }
  return { vendor, ids };
}

function UploadModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const { t } = useTranslation();
  const storeId = useStoreId();
  const toast = useToast();
  const [files, setFiles] = useState<File[]>([]);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const add = (list: FileList | null) => setFiles((f) => [...f, ...Array.from(list || []).filter((x) => /^image\/|pdf$/.test(x.type) || /\.pdf$/i.test(x.name))]);
  const upload = async () => {
    setBusy(true); setDone(0);
    let ok = 0;
    for (const f of files) {
      const fd = new FormData();
      fd.append('files', f, f.name);
      try { await api.post(`${EP.pm}/upload-purchase-bill`, fd, { store_id: storeId }); ok++; } catch (e) { toast.error(`${f.name}: ${(e as Error).message}`); }
      setDone((d) => d + 1);
    }
    setBusy(false);
    if (ok) { toast.success(t('{{n}} bill(s) uploaded', { n: ok })); setFiles([]); onDone(); onClose(); }
  };
  return (
    <Modal open={open} onClose={onClose} title={t('Upload purchase bills')} width={520}
      footer={<><Button variant="ghost" onClick={onClose}>{t('Cancel')}</Button><Button variant="primary" icon="upload" loading={busy} disabled={!files.length} onClick={upload}>{busy ? `${done}/${files.length}` : t('Upload')}</Button></>}>
      <div className="stack" style={{ gap: 10 }}>
        <div className={`bdrop${drag ? ' on' : ''}`} role="button" tabIndex={0} onClick={() => input.current?.click()} onKeyDown={(e) => e.key === 'Enter' && input.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); add(e.dataTransfer.files); }}>
          <Icon name="upload" /><div>{t('Drop images or PDFs here, or click to choose')}</div><div className="hint">{t('Each file is stored as one bill.')}</div>
        </div>
        <input ref={input} type="file" hidden multiple accept="image/*,application/pdf" aria-label={t('Choose files')} onChange={(e) => { add(e.target.files); e.target.value = ''; }} />
        {files.map((f, i) => <div key={i} className="row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}><span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</span><IconButton icon="x" label={`${t('Remove')} ${f.name}`} onClick={() => setFiles(files.filter((_, j) => j !== i))} /></div>)}
      </div>
    </Modal>
  );
}

function ExtractModal({ msg, onClose }: { msg: BillMessage | null; onClose: () => void }) {
  const { t } = useTranslation();
  const storeId = useStoreId();
  const { store } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const vat = store?.vat_percent ?? 15;
  const [provider, setProvider] = useState(() => lsGet(LS_P) || AI_PROVIDERS.find((p) => store?.settings?.[p.key])?.value || 'gemini');
  const [model, setModel] = useState(() => lsGet(LS_M) || AI_PROVIDERS.find((p) => p.value === (lsGet(LS_P) || 'gemini'))?.model || '');
  const [res, setRes] = useState<Extraction | null>(null);
  const [busy, setBusy] = useState<'' | 'x' | 'c'>('');
  const [err, setErr] = useState('');
  if (!msg) return null;
  const extract = async () => {
    setBusy('x'); setErr('');
    lsSet(LS_P, provider); lsSet(LS_M, model);
    const fd = new FormData();
    fd.append('llm_provider', provider);
    fd.append('llm_model', model);
    try {
      const r = await api.post<any>(`${EP.pm}/${msg.id}/extract-purchase-bill`, fd, { store_id: storeId });
      setRes(((r as any).result || r) as Extraction);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : (e as Error).message);
    } finally { setBusy(''); }
  };
  const create = async () => {
    if (!res) return;
    setBusy('c');
    try {
      const { vendor, ids } = await resolveExtraction(res, storeId);
      sessionStorage.setItem(BILL_KEY(msg.id), JSON.stringify(purchaseFromExtraction(res, vendor, ids, vat)));
      nav(`${PATHS.purchases}/new?from_bill=${msg.id}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(''); }
  };
  return (
    <Modal open onClose={onClose} title={`${t('Extract bill')} · ${msg.purchase_bill_code || ''}`} width={760}
      footer={<><Button variant="ghost" onClick={onClose}>{t('Close')}</Button>{res ? <Button variant="primary" icon="cart" loading={busy === 'c'} onClick={create}>{t('Create purchase')}</Button> : <Button variant="primary" icon="sliders" loading={busy === 'x'} onClick={extract}>{t('Extract')}</Button>}</>}>
      <div className="stack" style={{ gap: 12 }}>
        <div className="grid-2c">
          <Field label={t('AI provider')}>{(id) => <Select id={id} value={provider} onChange={(e) => { setProvider(e.target.value); setModel(AI_PROVIDERS.find((p) => p.value === e.target.value)?.model || ''); }} options={AI_PROVIDERS.map((p) => ({ value: p.value, label: p.label }))} />}</Field>
          <Field label={t('Model')} hint={t('Leave blank for the provider default.')}>{(id, d) => <Input id={id} aria-describedby={d} value={model} onChange={(e) => setModel(e.target.value)} />}</Field>
        </div>
        {err && <Banner tone="crit">{err}</Banner>}
        {res && (
          <>
            <Banner tone="good">{t('Extraction complete')}</Banner>
            <dl className="bkv">
              <dt>{t('Vendor')}</dt><dd><bdi>{res.vendor_company_name || '—'}</bdi></dd>
              <dt>{t('VAT no.')}</dt><dd className="num">{res.vendor_vat_no || '—'}</dd>
              <dt>{t('Invoice #')}</dt><dd>{res.invoice_number || '—'}</dd>
              <dt>{t('Invoice date')}</dt><dd>{res.invoice_date || '—'}</dd>
              <dt>{t('Total')}</dt><dd className="num">{res.total_amount != null ? fmtMoney(res.total_amount) : '—'}</dd>
            </dl>
            <div style={{ overflowX: 'auto' }}>
              <table className="lines" aria-label={t('Extracted items')}>
                <thead><tr><th>{t('Part #')}</th><th>{t('Item')}</th><th className="r">{t('Qty')}</th><th className="r">{t('Unit price')}</th></tr></thead>
                <tbody>{(res.products || []).map((p, i) => <tr key={i}><td className="mono">{p.part_no || '—'}</td><td>{p.name}</td><td className="r num">{p.quantity} {p.unit}</td><td className="r num">{fmtMoney(p.unit_price)}</td></tr>)}</tbody>
              </table>
            </div>
            <div className="hint">{t('Missing vendors and products are created automatically when you continue.')}</div>
          </>
        )}
      </div>
    </Modal>
  );
}

function LinkModal({ msg, onClose, onDone }: { msg: BillMessage | null; onClose: () => void; onDone: () => void }) {
  const { t } = useTranslation();
  const storeId = useStoreId();
  const toast = useToast();
  if (!msg) return null;
  const link = async (p: { id: string; label: string }) => {
    try {
      await api.post(`${EP.pm}/${msg.id}/link-purchase`, { purchase_id: p.id, purchase_code: p.label }, { store_id: storeId });
      toast.success(t('Bill image linked to {{code}}', { code: p.label }));
      onDone(); onClose();
    } catch (e) { toast.error(e instanceof ApiError ? e.message : (e as Error).message); }
  };
  return (
    <Modal open onClose={onClose} title={t('Link to purchase bill')} width={480}>
      <AsyncPicker aria-label={t('Purchase bill')} value={null} eager autoFocus placeholder={t('Search bill #…')} load={(q, s) => searchPurchases(storeId, q, s)} onChange={(o) => o && link(o)} />
    </Modal>
  );
}

export function BillImagesPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const storeId = useStoreId();
  const { can } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  usePageMeta(t('Bill images & PDFs'), 'paper');
  const [qDraft, setQDraft] = useState('');
  const q = useDebounced(qDraft, 300);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(24);
  const [upload, setUpload] = useState(false);
  const [extract, setExtract] = useState<BillMessage | null>(null);
  const [linking, setLinking] = useState<BillMessage | null>(null);
  const [confirmEl, ask] = useConfirm();
  const params = { store_id: storeId, has_attachments: 'true', purchase_bills: 'true', page, limit: size, search: q || undefined };
  const res = useQuery({
    queryKey: [EP.pm, 'bills', params],
    queryFn: async ({ signal }) => { const r = (await api.get<any>(EP.pm, params as any, signal)) as any; return { rows: (r.messages || []) as BillMessage[], total: Number(r.total) || 0 }; },
    enabled: !!storeId,
    placeholderData: keepPreviousData,
  });
  const refresh = () => qc.invalidateQueries({ queryKey: [EP.pm] });
  const remove = async (m: BillMessage) => {
    if (!(await ask(t('Delete this bill?'), { body: t('The uploaded image or PDF is deleted. This can’t be undone.'), danger: true, confirmLabel: t('Delete') }))) return;
    try { await api.del(`${EP.pm}/${m.id}`, { store_id: storeId }); toast.success(t('Bill deleted')); refresh(); } catch (e) { toast.error((e as Error).message); }
  };
  const canCreate = can('purchase_bill_images', 'create');

  return (
    <section className="pad">
      <div className="ph">
        <div><h1>{t('Bill images & PDFs')}</h1><p>{t('Scanned vendor bills — extract them with AI and turn them into purchase bills')}</p></div>
        <div className="acts">{canCreate && <Button variant="primary" icon="upload" onClick={() => setUpload(true)}>{t('Upload bills')}</Button>}</div>
      </div>
      <div className="card">
        <div className="gridbar">
          <SearchInput value={qDraft} onChange={(v) => { setQDraft(v); setPage(1); }} placeholder={t('Search sender or phone…')} aria-label={t('Search')} />
          <span className="spacer" />
          <IconButton icon="refresh" label={t('Refresh')} onClick={() => res.refetch()} />
        </div>
        {res.isError ? <div style={{ padding: 12 }}><ErrorState error={res.error} onRetry={() => res.refetch()} /></div>
          : res.isLoading ? <div className="bills">{[0, 1, 2].map((i) => <Skeleton key={i} height={220} />)}</div>
          : !res.data?.rows.length ? <EmptyState icon="paper" title={t('No bills yet')} action={canCreate ? <Button icon="upload" onClick={() => setUpload(true)}>{t('Upload bills')}</Button> : undefined}>{t('Upload photos or PDFs of vendor bills to keep them with your purchases.')}</EmptyState>
          : (
            <div className="bills" role="list" aria-label={t('Bills')}>
              {res.data.rows.map((m) => {
                const att = (m.attachments || []).filter((a) => a.url);
                const first = att[0];
                return (
                  <article className="bill" role="listitem" key={m.id} aria-label={m.purchase_bill_code || m.id}>
                    <a className="bill-thumb" href={first?.url} target="_blank" rel="noreferrer" aria-label={t('Open file')}>
                      {first && isImage(first) ? <img src={first.url} alt={first.filename || ''} loading="lazy" /> : <Icon name={first && isPdf(first) ? 'paper' : 'file'} />}
                    </a>
                    <div className="bill-b">
                      <div className="row" style={{ justifyContent: 'space-between' }}><b className="mono">{m.purchase_bill_code || '—'}</b>{m.linked_purchase_id ? <Pill tone="good" icon="check">{t('Linked')}</Pill> : <Pill tone="warn">{t('Not linked')}</Pill>}</div>
                      <span className="muted"><bdi>{m.sender_name || m.from || '—'}</bdi></span>
                      <span className="muted num" style={{ fontSize: 12 }}>{fmtDateTime(m.created_at)} · {att.length} {t('file(s)')}</span>
                    </div>
                    <div className="bill-acts">
                      {m.linked_purchase_id ? <Button size="sm" icon="eye" onClick={() => nav(`${PATHS.purchases}/${m.linked_purchase_id}`)}>{m.linked_purchase_code || t('View purchase')}</Button> : (
                        <>
                          {can('purchases', 'create') && <Button size="sm" variant="primary" icon="sliders" onClick={() => setExtract(m)}>{t('Extract')}</Button>}
                          <Button size="sm" icon="clip" onClick={() => setLinking(m)}>{t('Link')}</Button>
                        </>
                      )}
                      {can('purchase_bill_images', 'delete') && <IconButton icon="trash" label={`${t('Delete')} ${m.purchase_bill_code || ''}`} onClick={() => remove(m)} />}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        <Pager page={page} pageSize={size} total={res.data?.total || 0} onPage={setPage} onPageSize={(n) => { setSize(n); setPage(1); }} sizes={[24, 48, 96]} />
      </div>
      <UploadModal open={upload} onClose={() => setUpload(false)} onDone={refresh} />
      <ExtractModal key={extract?.id || 'none'} msg={extract} onClose={() => setExtract(null)} />
      <LinkModal msg={linking} onClose={() => setLinking(null)} onDone={refresh} />
      {confirmEl}
    </section>
  );
}
