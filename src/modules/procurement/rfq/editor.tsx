import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '@/api/client';
import { useAuth, useStoreId } from '@/auth/AuthContext';
import { Button, IconButton } from '@/ui/Button';
import { Banner, ErrorState, Skeleton, Kbd } from '@/ui/Misc';
import { Checkbox, Field, Input, Textarea } from '@/ui/Field';
import { AsyncPicker, type PickerOption } from '@/ui/AsyncPicker';
import { Tag } from '@/ui/Pill';
import { useToast } from '@/ui/Toast';
import { usePageMeta } from '@/shell/Workspace';
import { partyToOption, searchParties, searchProducts, partLabel, type Party, type ProductHit } from '@/framework/doc/lookups';
import { papi, pfetch } from '../api';
import { fileToDataUri, validateRfqForm } from '../logic';
import type { ExtractResult, RFQ, RFQProduct } from '../types';
import { AiPicker, FileDrop, Section, useAiChoice } from '../components/common';
import { RFQ_PATH, useInvalidateRfq, useRfq } from './hooks';
import { syncProducts } from './sync';

export const EXTRACTION_PREFILL_KEY = 'procurement_rfq_extraction';
export interface ExtractionPrefill { data: ExtractResult; msgId?: string; msgCode?: string }

const EXTRACT_ACCEPT = '.jpg,.jpeg,.png,.gif,.webp,.pdf,.xlsx,.xls,.csv,.txt';
const PRODUCT_FILES_ACCEPT = '.jpg,.jpeg,.png,.gif,.webp,.pdf,.xlsx,.xls,.csv';
const blankProduct = (): RFQProduct => ({ name: '', part_no: '', quantity: 1, unit: 'PCE', notes: '' });

interface Form {
  customer: PickerOption<Party> | null; customer_name: string; customer_phone: string; customer_email: string; customer_company: string; customer_city: string; customer_rfq_id: string;
  products: RFQProduct[]; text_content: string; general_instructions: string; categories: string[]; extraction_model: string;
}
const emptyForm = (): Form => ({ customer: null, customer_name: '', customer_phone: '', customer_email: '', customer_company: '', customer_city: '', customer_rfq_id: '', products: [blankProduct()], text_content: '', general_instructions: '', categories: [], extraction_model: '' });

export function formFromRfq(r: RFQ): Form {
  return {
    customer: r.customer_id ? { id: r.customer_id, label: r.customer_name || r.customer_id, data: { id: r.customer_id, name: r.customer_name || '' } } : null,
    customer_name: r.customer_name || '', customer_phone: r.customer_phone || '', customer_email: r.customer_email || '', customer_company: r.customer_company || '', customer_city: r.customer_city || '', customer_rfq_id: r.customer_rfq_id || '',
    products: (r.products || []).length ? (r.products || []).map((p) => ({ ...p })) : [blankProduct()], text_content: r.text_content || '', general_instructions: r.general_instructions || '', categories: r.categories || [], extraction_model: '',
  };
}

/** Apply an extraction result to the form (customer name only + contact, products, categories, model). */
export function applyExtraction(f: Form, d: ExtractResult): Form {
  const products = (d.products || []).filter((p) => (p.name || '').trim()).map((p) => ({ ...blankProduct(), ...p, quantity: Number(p.quantity) || 1, unit: p.unit || 'PCE' }));
  return {
    ...f,
    customer_name: f.customer ? f.customer_name : d.customer_company || d.customer_name || f.customer_name,
    customer_phone: f.customer_phone || d.customer_phone || '',
    customer_email: f.customer_email || d.customer_email || '',
    customer_company: f.customer_company || d.customer_company || '',
    customer_city: f.customer_city || d.customer_city || '',
    products: products.length ? products : f.products,
    general_instructions: f.general_instructions || d.general_instructions || '',
    text_content: f.text_content || d.text_content || '',
    categories: d.product_categories?.length ? d.product_categories : f.categories,
    extraction_model: d.llm_model || f.extraction_model,
  };
}

/** Exact request body for POST/PUT (§5 create/update bodies). */
export function rfqBody(f: Form, extra: { productFileUris?: string[]; additionalUris?: string[]; additionalNames?: string[]; msgId?: string; msgCode?: string; editing: boolean }) {
  const products = extra.productFileUris?.length ? [] : f.products.filter((p) => (p.name || '').trim()).map((p) => ({ ...p, name: p.name.trim(), quantity: Number(p.quantity) || 0 }));
  const body: Record<string, any> = {
    customer_id: f.customer?.id || '',
    customer_name: f.customer_name.trim() || f.customer?.label || 'UNKNOWN',
    customer_phone: f.customer_phone.trim(), customer_email: f.customer_email.trim(), customer_company: f.customer_company.trim(), customer_city: f.customer_city.trim(), customer_rfq_id: f.customer_rfq_id.trim(),
    text_content: f.text_content, products, general_instructions: f.general_instructions,
  };
  if (extra.additionalUris) { body.additional_attachment_data_uris = extra.additionalUris; body.additional_attachment_filenames = extra.additionalNames || []; }
  if (!extra.editing) {
    if (extra.productFileUris?.length) body.attachment_data_uris = extra.productFileUris;
    if (f.categories.length) body.product_categories = f.categories;
    if (f.extraction_model) body.extraction_model = f.extraction_model;
    if (extra.msgId) { body.procurement_message_id = extra.msgId; body.procurement_message_code = extra.msgCode || ''; }
  }
  return body;
}

export function RfqEditorPage() {
  const { id } = useParams();
  const q = useRfq(id);
  if (id && q.isError) return <div className="pad"><ErrorState error={q.error} onRetry={() => q.refetch()} /></div>;
  if (id && !q.data) return <div className="pad stack"><Skeleton width={260} height={22} /><Skeleton height={300} /></div>;
  return <RfqEditor key={id || 'new'} existing={q.data} />;
}

function RfqEditor({ existing }: { existing?: RFQ }) {
  const { t } = useTranslation();
  const nav = useNavigate();
  const toast = useToast();
  const storeId = useStoreId();
  const { can } = useAuth();
  const [sp] = useSearchParams();
  const editing = !!existing;
  usePageMeta(editing ? `${t('Edit')} ${existing!.code}` : t('New RFQ'), 'inbox');
  const [f, setF] = useState<Form>(() => (existing ? formFromRfq(existing) : emptyForm()));
  const [link, setLink] = useState<{ msgId?: string; msgCode?: string }>({});
  const [extractFiles, setExtractFiles] = useState<File[]>([]);
  const [productFiles, setProductFiles] = useState<File[]>([]);
  const [extraFiles, setExtraFiles] = useState<File[]>([]);
  const [keptExtra, setKeptExtra] = useState<{ url: string; name: string }[]>(() => (existing?.additional_attachment_urls || []).map((u, i) => ({ url: u, name: existing?.additional_attachment_filenames?.[i] || u.split('/').pop() || u })));
  const [syncCatalog, setSyncCatalog] = useState(true);
  const [extracting, setExtracting] = useState<'' | 'files' | 'text'>('');
  const [extractErr, setExtractErr] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const ai = useAiChoice();
  const invalidate = useInvalidateRfq();
  const formRef = useRef<HTMLFormElement>(null);
  const set = (p: Partial<Form>) => { setF((x) => ({ ...x, ...p })); setErr(''); };
  const setProduct = (i: number, p: Partial<RFQProduct>) => setF((x) => ({ ...x, products: x.products.map((y, j) => (j === i ? { ...y, ...p } : y)) }));

  // Prefill from an email/WhatsApp extraction (ExtractModal → "Create RFQ").
  useEffect(() => {
    if (editing || sp.get('from') !== 'extraction') return;
    let pre: ExtractionPrefill | null = null;
    try { pre = JSON.parse(sessionStorage.getItem(EXTRACTION_PREFILL_KEY) || 'null'); } catch { pre = null; }
    if (!pre) return;
    sessionStorage.removeItem(EXTRACTION_PREFILL_KEY);
    setF((x) => applyExtraction(x, pre!.data));
    setLink({ msgId: pre.msgId, msgCode: pre.msgCode });
    const d = pre.data;
    if (d.customer_name || d.customer_company) {
      api.post<any>('/v1/customer/find-or-create', { name: d.customer_company || d.customer_name, phone: d.customer_phone, email: d.customer_email, company: d.customer_company, contact_person: d.customer_contact_person, city_name: d.customer_city }, { store_id: storeId })
        .then((r) => { const c = r.result; if (c?.id) setF((x) => ({ ...x, customer: partyToOption(c), customer_name: c.name || x.customer_name })); })
        .catch(() => { /* customer linking is best-effort */ });
    }
  }, [editing, sp, storeId]);

  const extract = async (mode: 'files' | 'text') => {
    setExtractErr('');
    if (mode === 'files' && !extractFiles.length) { setExtractErr(t('Choose at least one file to extract from.')); return; }
    if (mode === 'text' && !f.text_content.trim()) { setExtractErr(t('Enter the enquiry text first.')); return; }
    const fd = new FormData();
    if (mode === 'files') extractFiles.forEach((x) => fd.append('files', x));
    else fd.append('text_content', f.text_content);
    fd.append('llm_provider', ai.provider);
    fd.append('llm_model', ai.model);
    setExtracting(mode);
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 5 * 60_000);
    try {
      const d = await pfetch<ExtractResult>('/v1/rfq-received/extract', { method: 'POST', body: fd, query: { store_id: storeId }, signal: ac.signal });
      setF((x) => applyExtraction({ ...x, products: x.products.filter((p) => p.name.trim()) }, d));
      toast.success(t('Extracted {{n}} products', { n: (d.products || []).length }));
    } catch (e) {
      setExtractErr((e as Error).name === 'AbortError' ? t('Extraction timed out after 5 minutes.') : (e as Error).message);
    } finally { clearTimeout(timer); setExtracting(''); }
  };

  const submit = async () => {
    const v = validateRfqForm({ products: f.products, text_content: f.text_content, productFiles: productFiles.length });
    if (v) { setErr(t(v)); return; }
    setSaving(true);
    try {
      let form = f;
      if (syncCatalog && !productFiles.length && f.products.some((p) => p.name.trim() && !p.product_id)) {
        const r = await syncProducts(storeId, f.products);
        form = { ...f, products: r.products };
        setF(form);
        if (r.linked || r.created) toast.info(t('Catalog: {{l}} linked, {{c}} created', { l: r.linked, c: r.created }));
        if (r.failed) toast.error(t('{{n}} products could not be linked to the catalog', { n: r.failed }));
      }
      const productFileUris = await Promise.all(productFiles.map(fileToDataUri));
      const newExtra = await Promise.all(extraFiles.map(fileToDataUri));
      const additionalUris = editing || extraFiles.length ? [...keptExtra.map((k) => k.url), ...newExtra] : undefined;
      const additionalNames = [...keptExtra.map((k) => k.name), ...extraFiles.map((x) => x.name)];
      const body = rfqBody(form, { productFileUris, additionalUris, additionalNames, msgId: link.msgId, msgCode: link.msgCode, editing });
      if (editing) {
        await papi.put<RFQ>(`/v1/rfq-received/${existing!.id}`, body, { store_id: storeId });
        toast.success(t('Saved {{code}}', { code: existing!.code }));
        invalidate();
        nav(`${RFQ_PATH}/${existing!.id}`);
      } else {
        const r = await papi.post<{ id: string; code: string }>('/v1/rfq-received', body, { store_id: storeId });
        toast.success(t('RFQ created: {{code}}', { code: r.code }));
        invalidate();
        nav(`${RFQ_PATH}/${r.id}?tab=send`);
      }
    } catch (e) {
      setErr((e as Error).message);
    } finally { setSaving(false); }
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); submit(); } };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  });

  const loadCustomers = (qq: string, s: AbortSignal) => searchParties('customer', storeId, qq, s).then((r) => r.map(partyToOption));
  const loadProducts = (qq: string, s: AbortSignal) => searchProducts(storeId, qq, s).then((r) => r.map((p: ProductHit) => ({ id: p.id, label: p.name, sub: partLabel(p), data: p })));
  const namedCount = useMemo(() => f.products.filter((p) => p.name.trim()).length, [f.products]);
  const cancel = () => nav(editing ? `${RFQ_PATH}/${existing!.id}` : RFQ_PATH);
  if (!can('rfq_received', editing ? 'update' : 'create')) return <div className="pad"><Banner tone="warn">{t('You don’t have permission to do this.')}</Banner></div>;

  return (
    <section className="pad">
      <div className="ph">
        <div>
          <h1>{editing ? `${t('Edit RFQ')} ${existing!.code}` : t('New RFQ')}</h1>
          <p>{t('Capture the customer’s request, review the extracted items, then send it to suppliers.')}</p>
          {link.msgCode && <p><Tag>{t('From message')} {link.msgCode}</Tag></p>}
        </div>
        <div className="acts">
          <Button variant="ghost" onClick={cancel}>{t('Cancel')}</Button>
          <Button variant="primary" icon="check" loading={saving} onClick={submit} aria-label={t('Save')}>{t('Save')} <Kbd>Ctrl S</Kbd></Button>
        </div>
      </div>
      <form ref={formRef} className="stack" onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate>
        {err && <Banner tone="crit">{err}</Banner>}
        <Section title={t('Customer')}>
          <div className="fgrid">
            <Field label={t('Customer')} className="span2">{(id) => <AsyncPicker id={id} aria-label={t('Customer')} value={f.customer} eager clearable placeholder={t('Search customers…')} load={loadCustomers}
              onChange={(o) => set({ customer: o, customer_name: o?.label || f.customer_name, customer_phone: o?.data?.phone || f.customer_phone, customer_email: o?.data?.email || f.customer_email })} />}</Field>
            <Field label={t('Customer name')}>{(id) => <Input id={id} value={f.customer_name} onChange={(e) => set({ customer_name: e.target.value })} />}</Field>
            <Field label={t('Company')}>{(id) => <Input id={id} value={f.customer_company} onChange={(e) => set({ customer_company: e.target.value })} />}</Field>
            <Field label={t('Customer mobile')}>{(id) => <Input id={id} type="tel" className="num" value={f.customer_phone} onChange={(e) => set({ customer_phone: e.target.value })} />}</Field>
            <Field label={t('Customer email')}>{(id) => <Input id={id} type="email" value={f.customer_email} onChange={(e) => set({ customer_email: e.target.value })} />}</Field>
            <Field label={t('City')}>{(id) => <Input id={id} value={f.customer_city} onChange={(e) => set({ customer_city: e.target.value })} />}</Field>
            <Field label={t('Customer RFQ ID')}>{(id) => <Input id={id} placeholder="e.g. PO-2025-001" value={f.customer_rfq_id} onChange={(e) => set({ customer_rfq_id: e.target.value })} />}</Field>
          </div>
        </Section>

        <Section title={t('AI extraction')}>
          <div className="stack">
            <p className="muted" style={{ margin: 0 }}>{t('Upload the customer’s enquiry (PDF, Excel, image or text) and let AI fill in the customer and items. Large files with reasoning models can take 1–3 minutes.')}</p>
            <FileDrop files={extractFiles} onChange={setExtractFiles} accept={EXTRACT_ACCEPT} label={t('Files to extract from')} />
            <AiPicker ai={ai} compact />
            {extractErr && <Banner tone="crit">{extractErr}{/API key/i.test(extractErr) && <> <Link className="link" to="/procurement/settings?tab=ai">{t('Open AI models settings')}</Link></>}</Banner>}
            <div className="row"><Button icon="layers" loading={extracting === 'files'} disabled={!!extracting} onClick={() => extract('files')}>{t('Extract from files')}</Button></div>
          </div>
        </Section>

        <Section title={<>{t('Products required')} <span className="muted num">({namedCount})</span></>} actions={<Button size="sm" icon="plus" onClick={() => set({ products: [...f.products, blankProduct()] })}>{t('Add row')}</Button>}>
          <div className="stack">
            {f.categories.length > 0 && <div className="pr-cats"><span className="muted">{t('Categories')}:</span>{f.categories.map((c) => <Tag key={c}>{c}</Tag>)}</div>}
            {productFiles.length > 0 ? <Banner tone="info">{t('Product files replace the products table on the RFQ document.')}</Banner> : (
              <div className="pr-scroll">
                <table className="pr-table" aria-label={t('Products required')}>
                  <thead><tr><th>#</th><th>{t('Part No.')}</th><th style={{ minWidth: 200 }}>{t('Product name')}</th><th className="r">{t('Qty')}</th><th>{t('Unit')}</th><th style={{ minWidth: 140 }}>{t('Notes')}</th><th /></tr></thead>
                  <tbody>
                    {f.products.map((p, i) => (
                      <tr key={i}>
                        <td className="num">{i + 1}</td>
                        <td><Input aria-label={`${t('Part No.')} ${i + 1}`} value={p.part_no || ''} onChange={(e) => setProduct(i, { part_no: e.target.value, product_id: undefined })} style={{ width: 120 }} /></td>
                        <td><Input aria-label={`${t('Product name')} ${i + 1}`} value={p.name} onChange={(e) => setProduct(i, { name: e.target.value, product_id: undefined })} />{p.product_id && <small className="muted">✓ {t('Linked to catalog')}</small>}</td>
                        <td><Input aria-label={`${t('Qty')} ${i + 1}`} className="num" inputMode="decimal" value={p.quantity ?? ''} onChange={(e) => setProduct(i, { quantity: e.target.value === '' ? undefined : Number(e.target.value.replace(/[^\d.]/g, '')) })} style={{ width: 70 }} /></td>
                        <td><Input aria-label={`${t('Unit')} ${i + 1}`} value={p.unit || ''} onChange={(e) => setProduct(i, { unit: e.target.value })} style={{ width: 70 }} /></td>
                        <td><Input aria-label={`${t('Notes')} ${i + 1}`} value={p.notes || ''} onChange={(e) => setProduct(i, { notes: e.target.value })} /></td>
                        <td><IconButton icon="trash" label={`${t('Remove row')} ${i + 1}`} onClick={() => set({ products: f.products.length > 1 ? f.products.filter((_, j) => j !== i) : [blankProduct()] })} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {!productFiles.length && (
              <div className="grid-2c">
                <Field label={t('Add from catalog')}>{(id) => <AsyncPicker id={id} aria-label={t('Add from catalog')} value={null} resetOnPick placeholder={t('Search products…')} load={loadProducts}
                  onChange={(o) => o && set({ products: [...f.products.filter((p) => p.name.trim()), { product_id: o.data.id, name: o.data.name, part_no: partLabel(o.data) || o.data.part_number, quantity: 1, unit: o.data.unit || 'PCE', notes: '' }] })} />}</Field>
                <div style={{ alignSelf: 'end' }}><Checkbox label={t('Link new items to the product catalog on save (creates missing products)')} checked={syncCatalog} onChange={(e) => setSyncCatalog(e.target.checked)} /></div>
              </div>
            )}
            {!editing && <FileDrop files={productFiles} onChange={setProductFiles} accept={PRODUCT_FILES_ACCEPT} label={t('Or attach product files')} hint={t('These replace the products table (cannot be changed after creation)')} />}
          </div>
        </Section>

        <Section title={t('Additional description / enquiry text')}>
          <div className="stack">
            <Textarea aria-label={t('Additional description / enquiry text')} rows={5} value={f.text_content} onChange={(e) => set({ text_content: e.target.value })} />
            <div className="row"><Button icon="layers" loading={extracting === 'text'} disabled={!!extracting} onClick={() => extract('text')}>{t('Extract from text')}</Button></div>
          </div>
        </Section>

        <Section title={t('General instructions')}>
          <Textarea aria-label={t('General instructions')} rows={3} value={f.general_instructions} onChange={(e) => set({ general_instructions: e.target.value })} />
        </Section>

        <Section title={t('Additional detail files')}>
          <div className="stack">
            {keptExtra.length > 0 && (
              <ul className="pr-files">{keptExtra.map((k) => <li key={k.url}><bdi>{k.name}</bdi><IconButton icon="x" label={`${t('Remove')} ${k.name}`} onClick={() => setKeptExtra(keptExtra.filter((x) => x.url !== k.url))} /></li>)}</ul>
            )}
            <FileDrop files={extraFiles} onChange={setExtraFiles} label={t('Files shown below the products on the RFQ')} accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.xlsx,.xls,.csv" />
          </div>
        </Section>
        <button type="submit" hidden />
      </form>
      <div className="mbar">
        <Button variant="ghost" onClick={cancel}>{t('Cancel')}</Button>
        <Button variant="primary" icon="check" loading={saving} onClick={submit}>{t('Save')}</Button>
      </div>
    </section>
  );
}
