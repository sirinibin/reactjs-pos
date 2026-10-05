import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useAuth, useStoreId } from '@/auth/AuthContext';
import { Button, IconButton } from '@/ui/Button';
import { Banner, EmptyState, ErrorState, Skeleton, Tabs, useConfirm } from '@/ui/Misc';
import { SearchInput } from '@/ui/Field';
import { Drawer } from '@/ui/Overlay';
import { ObjectHeader, ObjectBody } from '@/ui/ObjectPage';
import { Pill, Tag } from '@/ui/Pill';
import { Icon } from '@/ui/Icon';
import { useToast } from '@/ui/Toast';
import { usePageMeta } from '@/shell/Workspace';
import { fmtDateTime, fmtRelative } from '@/lib/format';
import { mediaUrl, papi } from '../api';
import { latestQuotations, normPhone, extractEmail, stepMeta, STAGE_LABELS, TERMINAL_STAGES } from '../logic';
import type { ContactThread, RFQ, RFQSupplier } from '../types';
import { CopyButton, RfqStatusPill, Section, useRfqEvents } from '../components/common';
import { SupplierForm, SUPPLIERS } from '../components/SupplierForm';
import { Avatar } from '../components/MessageBits';
import type { Progress } from '../components/LiveProgress';
import { WhatsAppChat } from '../whatsapp';
import { EmailThread, EmailDetail } from '../emails';
import { RFQ_PATH, useInvalidateRfq, useRfq, useThreadsForPhones } from './hooks';
import { SendPanel } from './SendPanel';
import { PriceComparison, RepliesPanel } from './Comparison';
import { downloadRfqPdf, RfqPaper } from './print';
import { syncProducts } from './sync';

type TabId = 'overview' | 'items' | 'suppliers' | 'send' | 'prices' | 'replies' | 'timeline' | 'conversations' | 'document';

export function RfqDetailPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const nav = useNavigate();
  const toast = useToast();
  const storeId = useStoreId();
  const { can, store } = useAuth();
  const [sp, setSp] = useSearchParams();
  const tab = (sp.get('tab') as TabId) || 'overview';
  const setTab = (v: TabId) => setSp((p) => { const n = new URLSearchParams(p); if (v === 'overview') n.delete('tab'); else n.set('tab', v); return n; }, { replace: true });
  const q = useRfq(id);
  const invalidate = useInvalidateRfq();
  const [live, setLive] = useState<Progress | null>(null);
  const [confirmEl, ask] = useConfirm();
  const r = q.data;
  usePageMeta(r?.code, 'inbox');

  useRfqEvents(storeId, {
    rfq_updated: () => q.refetch(),
    rfq_progress: (d) => { if (d?.rfq_id === id) { setLive(TERMINAL_STAGES.has(d.stage) ? null : d); q.refetch(); } },
  });

  if (q.isError) return <div className="pad"><ErrorState error={q.error} onRetry={() => q.refetch()} /></div>;
  if (!r) return <div className="pad stack"><Skeleton width={260} height={22} /><Skeleton height={300} /></div>;

  const quotes = latestQuotations(r.supplier_replies);
  const reprocess = async () => {
    try { await papi.post(`/v1/rfq-received/${r.id}/process`, {}, { store_id: storeId }); toast.success(t('Re-processing {{code}}…', { code: r.code })); setTimeout(() => q.refetch(), 2000); } catch (e) { toast.error((e as Error).message); }
  };
  const remove = async () => {
    if (!(await ask(t('Delete {{code}}?', { code: r.code }), { danger: true, confirmLabel: t('Delete'), body: t('Permanently delete {{code}}? This will also unlink it from any connected email or WhatsApp message.', { code: r.code }) }))) return;
    try { await papi.del(`/v1/rfq-received/${r.id}`, { store_id: storeId }); toast.success(t('Deleted {{code}}', { code: r.code })); invalidate(); nav(RFQ_PATH); } catch (e) { toast.error((e as Error).message); }
  };
  const pdf = async () => { try { await downloadRfqPdf(r, storeId); } catch (e) { toast.error((e as Error).message); } };
  const changed = () => { q.refetch(); invalidate(); };

  return (
    <>
      <ObjectHeader
        crumbs={[{ label: t('AI procurement'), to: RFQ_PATH }, { label: t('RFQ inbox'), to: RFQ_PATH }, { label: r.code }]}
        icon="inbox" title={<span className="mono">{r.code}</span>} pills={<> <RfqStatusPill status={r.status} /></>}
        subtitle={<>{t('from')} <bdi>{r.from_phone || r.customer_phone || '—'}</bdi>{r.from_name ? <> (<bdi>{r.from_name}</bdi>)</> : null} · {fmtDateTime(r.received_at)} · {t(r.source || 'manual')}</>}
        actions={<>
          {r.status !== 'cancelled' && can('rfq_received', 'update') && <Button variant="primary" icon="send" onClick={() => setTab('send')}>{t('Send to suppliers')}</Button>}
          {can('rfq_received', 'update') && <Button icon="edit" onClick={() => nav(`${RFQ_PATH}/${r.id}/edit`)}>{t('Edit')}</Button>}
          <Button icon="print" className="hide-sm" onClick={() => window.open(`${RFQ_PATH}/${r.id}/print`, '_blank', 'noopener')}>{t('Print')}</Button>
          <Button icon="download" className="hide-sm" onClick={pdf}>{t('PDF')}</Button>
          {(r.status === 'failed' || r.status === 'received') && <Button icon="refresh" className="hide-sm" onClick={reprocess}>{t('Re-process')}</Button>}
          {can('rfq_received', 'delete') && <IconButton icon="trash" label={t('Delete')} onClick={remove} />}
        </>}
        facets={[
          { label: t('Customer'), value: <bdi>{r.customer_name || '—'}</bdi> },
          { label: t('Items'), value: (r.products || []).length || (r.attachment_urls || []).length ? `${(r.products || []).length || t('files')}` : '0' },
          { label: t('Suppliers contacted'), value: (r.forwarded_to || []).filter((f) => f.status === 'sent').length },
          { label: t('Quotations'), value: quotes.length, tone: quotes.length ? 'good' : undefined },
          ...(r.customer_rfq_id ? [{ label: t('Customer RFQ ID'), value: r.customer_rfq_id, hideOnMobile: true }] : []),
        ]}
        tabs={<Tabs<TabId> label={t('RFQ sections')} value={tab} onChange={setTab} tabs={[
          { id: 'overview', label: t('Overview') },
          { id: 'items', label: t('Items'), count: (r.products || []).length },
          { id: 'suppliers', label: t('Suppliers'), count: (r.forwarded_to || []).length },
          { id: 'send', label: t('Send'), hidden: r.status === 'cancelled' || !can('rfq_received', 'update') },
          { id: 'prices', label: t('Prices'), count: quotes.length ? '✓' : undefined },
          { id: 'replies', label: t('Replies'), count: (r.supplier_replies || []).length },
          { id: 'timeline', label: t('Timeline') },
          { id: 'conversations', label: t('Conversations') },
          { id: 'document', label: t('Document') },
        ]} />}
      />
      <ObjectBody>
        {r.error_msg && <Banner tone="crit">{r.error_msg}</Banner>}
        {live && <Banner tone="info"><b>{t(STAGE_LABELS[live.stage] || live.stage)}</b> {live.message}</Banner>}
        {tab === 'overview' && <Overview r={r} />}
        {tab === 'items' && <Items r={r} onChanged={changed} />}
        {tab === 'suppliers' && <ForwardedSuppliers r={r} />}
        {tab === 'send' && <SendPanel rfq={r} onSent={changed} />}
        {tab === 'prices' && <PriceComparison rfq={r} onChanged={changed} />}
        {tab === 'replies' && <RepliesPanel rfq={r} onChanged={changed} />}
        {tab === 'timeline' && <Timeline r={r} live={live} />}
        {tab === 'conversations' && <Conversations r={r} />}
        {tab === 'document' && <div className="pr-scroll" style={{ background: 'var(--surface-3)', padding: 12, borderRadius: 8 }}><RfqPaper rfq={r} store={store} /></div>}
      </ObjectBody>
      {confirmEl}
    </>
  );
}

function Overview({ r }: { r: RFQ }) {
  const { t } = useTranslation();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="grid-2c" style={{ alignItems: 'start' }}>
      <Section title={t('Customer')}>
        <dl className="pr-kv">
          <dt>{t('Name')}</dt><dd>{r.customer_id ? <Link className="link" to={`/sales/customers/${r.customer_id}`}><bdi>{r.customer_name}</bdi></Link> : <bdi>{r.customer_name || '—'}</bdi>}</dd>
          {r.customer_company && <><dt>{t('Company')}</dt><dd><bdi>{r.customer_company}</bdi></dd></>}
          <dt>{t('Mobile')}</dt><dd>{r.customer_phone ? <><a className="num" href={`tel:${r.customer_phone}`}>{r.customer_phone}</a> <Link className="link" to={`/procurement/whatsapp?phone=${normPhone(r.customer_phone)}`} aria-label={t('WhatsApp chat')}><Icon name="wa" size="s" /></Link></> : '—'}</dd>
          <dt>{t('Email')}</dt><dd>{r.customer_email ? <><a href={`mailto:${r.customer_email}`}>{r.customer_email}</a> <Link className="link" to={`/procurement/emails?view=conv&email=${encodeURIComponent(extractEmail(r.customer_email))}`} aria-label={t('Email conversation')}><Icon name="mail" size="s" /></Link></> : '—'}</dd>
          {r.customer_city && <><dt>{t('City')}</dt><dd>{r.customer_city}</dd></>}
          {r.customer_vat_no && <><dt>{t('VAT')}</dt><dd>{r.customer_vat_no}</dd></>}
          {r.customer_rfq_id && <><dt>{t('Customer RFQ ID')}</dt><dd>{r.customer_rfq_id}</dd></>}
        </dl>
      </Section>
      <Section title={t('Status')}>
        <dl className="pr-kv">
          <dt>{t('Status')}</dt><dd><RfqStatusPill status={r.status} /></dd>
          {r.processed_at && <><dt>{t('Processed')}</dt><dd className="num">{fmtDateTime(r.processed_at)}</dd></>}
          <dt>{t('Categories')}</dt><dd><span className="pr-cats">{(r.categories || []).length ? r.categories!.map((c) => <Tag key={c}>{c}</Tag>) : <span className="muted">{t('Not categorised yet')}</span>}</span></dd>
          {r.procurement_message_id && <><dt>{t('Source message')}</dt><dd>{r.source === 'whatsapp'
            ? <Link className="link" to={`/procurement/whatsapp?phone=${normPhone(r.from_phone)}`}><Icon name="wa" size="s" /> {r.procurement_message_code}</Link>
            : <button type="button" className="link" onClick={() => setMsg(r.procurement_message_id!)}><Icon name="mail" size="s" /> {r.procurement_message_code}</button>}</dd></>}
          {(r.quotation_codes || []).length > 0 && <><dt>{t('Quotations')}</dt><dd className="pr-cats">{r.quotation_codes!.map((c, i) => r.quotation_ids?.[i] ? <Link key={c} className="tag" to={`/sales/quotations/${r.quotation_ids[i]}`}>{c}</Link> : <Tag key={c}>{c}</Tag>)}</dd></>}
        </dl>
      </Section>
      {r.text_content && <Section title={t('Message')}><div className="pr-wrap">{r.text_content}</div></Section>}
      {r.general_instructions && <Section title={t('General instructions')}><div className="pr-wrap">{r.general_instructions}</div></Section>}
      {((r.media_urls || []).length > 0 || (r.documents || []).length > 0 || (r.attachment_urls || []).length > 0) && (
        <Section title={t('Attachments')}>
          <div className="stack">
            <div className="row" style={{ flexWrap: 'wrap' }}>{(r.media_urls || []).map((u) => <a key={u} href={mediaUrl(u)} target="_blank" rel="noopener noreferrer"><img src={mediaUrl(u)} alt="" style={{ maxWidth: 160, maxHeight: 160, borderRadius: 6 }} /></a>)}</div>
            <ul className="pr-files">
              {(r.documents || []).map((d) => <li key={d.url}><Icon name="file" size="s" /><a className="link" href={mediaUrl(d.url)} target="_blank" rel="noopener noreferrer">{d.file_name || d.url.split('/').pop()}</a></li>)}
              {(r.attachment_urls || []).map((u) => <li key={u}><Icon name="paper" size="s" /><a className="link" href={mediaUrl(u)} target="_blank" rel="noopener noreferrer">{u.split('/').pop()}</a></li>)}
            </ul>
          </div>
        </Section>
      )}
      <EmailDetail id={msg} onClose={() => setMsg(null)} />
    </div>
  );
}

/** Item extraction review: what the AI/user captured, catalog link status, one-click linking. */
function Items({ r, onChanged }: { r: RFQ; onChanged: () => void }) {
  const { t } = useTranslation();
  const nav = useNavigate();
  const toast = useToast();
  const storeId = useStoreId();
  const { can } = useAuth();
  const [busy, setBusy] = useState(false);
  const products = r.products || [];
  const unlinked = products.filter((p) => !p.product_id).length;
  const link = async () => {
    setBusy(true);
    try {
      const s = await syncProducts(storeId, products);
      await papi.put(`/v1/rfq-received/${r.id}`, {
        customer_id: r.customer_id || '', customer_name: r.customer_name || '', customer_phone: r.customer_phone || '', customer_email: r.customer_email || '', customer_company: r.customer_company || '',
        customer_city: r.customer_city || '', customer_rfq_id: r.customer_rfq_id || '', text_content: r.text_content || '', general_instructions: r.general_instructions || '', products: s.products,
      }, { store_id: storeId });
      toast.success(t('Catalog: {{l}} linked, {{c}} created', { l: s.linked, c: s.created }));
      onChanged();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <Section title={t('Items requested')} actions={<>
      {unlinked > 0 && can('rfq_received', 'update') && <Button icon="box" loading={busy} onClick={link}>{t('Link {{n}} to catalog', { n: unlinked })}</Button>}
      {can('rfq_received', 'update') && <Button icon="edit" onClick={() => nav(`${RFQ_PATH}/${r.id}/edit`)}>{t('Edit items')}</Button>}
    </>}>
      {!products.length ? (
        (r.attachment_urls || []).length ? <Banner tone="info">{t('This RFQ uses attached product files instead of an item list.')}</Banner> : <EmptyState icon="box" title={t('No items captured')}>{t('Edit the RFQ to add items or extract them with AI.')}</EmptyState>
      ) : (
        <div className="pr-scroll">
          <table className="pr-table" aria-label={t('Items requested')}>
            <thead><tr><th>#</th><th>{t('Part No.')}</th><th>{t('Product')}</th><th className="r">{t('Qty')}</th><th>{t('Unit')}</th><th>{t('Notes')}</th><th>{t('Catalog')}</th></tr></thead>
            <tbody>{products.map((p, i) => (
              <tr key={i}><td className="num">{i + 1}</td><td>{p.part_no || '—'}</td><td><bdi>{p.name}</bdi>{p.name_in_arabic && <div className="muted" dir="rtl">{p.name_in_arabic}</div>}</td><td className="r num">{p.quantity ?? ''}</td><td>{p.unit}</td><td className="pr-wrap">{p.notes}</td>
                <td>{p.product_id ? <Link to={`/stock/products/${p.product_id}`}><Pill tone="good">{t('Linked')}</Pill></Link> : <Pill tone="warn">{t('Not linked')}</Pill>}</td></tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {r.extracted_text && <details style={{ marginTop: 12 }}><summary className="link">{t('Extracted text')}</summary><div className="pr-wrap muted" style={{ marginTop: 6 }}>{r.extracted_text}</div></details>}
    </Section>
  );
}

function useSupplierIndex() {
  const storeId = useStoreId();
  return useQuery({
    queryKey: ['procurement-suppliers-all', storeId],
    queryFn: () => papi.get<{ result: RFQSupplier[] | null }>(SUPPLIERS, { store_id: storeId, limit: 500 }).then((x) => {
      const m = new Map<string, RFQSupplier>();
      (x.result || []).forEach((s) => { [s.phone, s.phone2].forEach((p) => { if (normPhone(p)) m.set(normPhone(p), s); }); });
      return m;
    }),
    enabled: !!storeId,
    staleTime: 60_000,
  });
}

function ForwardedSuppliers({ r }: { r: RFQ }) {
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [edit, setEdit] = useState<Partial<RFQSupplier> | null>(null);
  const idx = useSupplierIndex();
  const rows = (r.forwarded_to || []).filter((f) => !q || `${f.supplier_name} ${f.phone} ${f.purchase_market} ${f.category}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <Section title={t('Suppliers contacted')} actions={<SearchInput value={q} onChange={setQ} placeholder={t('Filter suppliers…')} aria-label={t('Filter suppliers')} />}>
      {!(r.forwarded_to || []).length ? <EmptyState icon="users" title={t('Not sent to any supplier yet')}>{t('Use the Send tab to send this RFQ to matching suppliers.')}</EmptyState> : (
        <div className="pr-scroll">
          <table className="pr-table" aria-label={t('Suppliers contacted')}>
            <thead><tr><th>{t('Supplier')}</th><th>{t('WhatsApp')}</th><th>{t('Sent from')}</th><th>{t('Market')}</th><th>{t('Category')}</th><th>{t('Status')}</th><th>{t('Sent at')}</th><th /></tr></thead>
            <tbody>{rows.map((f, i) => {
              const sup = idx.data?.get(normPhone(f.phone));
              return (
                <tr key={`${f.phone}-${i}`}>
                  <td><bdi>{f.supplier_name || sup?.name || '—'}</bdi>{f.google_maps_url && <> <a className="link" href={f.google_maps_url} target="_blank" rel="noopener noreferrer" aria-label={t('Google Maps')}><Icon name="pin" size="xs" /></a></>}</td>
                  <td className="num"><Link className="link" to={`/procurement/whatsapp?phone=${normPhone(f.phone)}`}>{f.phone}</Link></td>
                  <td className="num">{f.sent_from_phone || '—'}</td><td>{f.purchase_market || '—'}</td><td>{f.category || '—'}</td>
                  <td>{f.status === 'sent' ? <Pill tone="good">{t('Sent')}</Pill> : f.status === 'failed' ? <Pill tone="crit" title={f.error_msg}>{t('Failed')}</Pill> : <Pill tone="warn">{t('Pending')}</Pill>}</td>
                  <td className="num">{fmtDateTime(f.sent_at)}</td>
                  <td><span className="row" style={{ gap: 0, flexWrap: 'nowrap' }}>
                    {f.sent_message && <IconButton icon="eye" label={t('Show sent message')} onClick={() => setOpen(open === f.phone ? null : f.phone)} />}
                    <IconButton icon="edit" label={t('Edit supplier')} onClick={() => setEdit(sup || { name: f.supplier_name || '', phone: f.phone, purchase_market: f.purchase_market })} />
                  </span></td>
                </tr>
              );
            })}</tbody>
          </table>
          {open && (() => { const f = (r.forwarded_to || []).find((x) => x.phone === open); return f?.sent_message ? <div className="pr-mock" style={{ marginTop: 10 }}><div className="row"><b style={{ flex: 1 }}>{f.supplier_name}</b><CopyButton text={f.sent_message} /></div><div className="b">{f.sent_message}</div></div> : null; })()}
        </div>
      )}
      <SupplierForm open={!!edit} supplier={edit} onClose={() => setEdit(null)} onSaved={() => idx.refetch()} />
    </Section>
  );
}

function Timeline({ r, live }: { r: RFQ; live: Progress | null }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState<number | null>(null);
  const logs = r.activity_logs || [];
  return (
    <Section title={t('Timeline')}>
      {!logs.length && !live ? <EmptyState icon="clock" title={t('No activity yet')} /> : (
        <ol className="feed">
          {logs.map((l, i) => {
            const m = stepMeta(l.step, l.details);
            const has = l.details && Object.keys(l.details).length > 0;
            return (
              <li key={l.id || i}>
                <span className={`dot ${m.tone === 'good' ? 'g' : m.tone === 'info' ? 'b' : ''}`} style={m.tone === 'crit' ? { background: 'var(--crit-bg)', color: 'var(--crit)' } : m.tone === 'warn' ? { background: 'var(--warn-bg)', color: 'var(--warn)' } : undefined}><Icon name={m.icon} size="xs" /></span>
                <div style={{ minWidth: 0 }}>
                  <b>{t(m.label)}</b>
                  <div className="pr-wrap">{l.message}</div>
                  <div className="m">{fmtDateTime(l.at)} · {fmtRelative(l.at)}{has && <> · <button type="button" className="link" onClick={() => setOpen(open === i ? null : i)}>{open === i ? t('Hide details') : t('Details')}</button></>}</div>
                  {open === i && <pre className="pr-wrap" style={{ fontSize: 11, background: 'var(--surface-2)', padding: 8, borderRadius: 6, margin: '6px 0 0' }}>{JSON.stringify(l.details, null, 2)}</pre>}
                </div>
              </li>
            );
          })}
          {live && <li><span className="dot b"><span className="spin" /></span><div><b>{t(STAGE_LABELS[live.stage] || live.stage)}</b><div>{live.message}</div></div></li>}
        </ol>
      )}
    </Section>
  );
}

function Conversations({ r }: { r: RFQ }) {
  const { t } = useTranslation();
  const idx = useSupplierIndex();
  const supplierPhones = Array.from(new Set((r.forwarded_to || []).map((f) => normPhone(f.phone)).filter(Boolean)));
  const customerPhone = normPhone(r.customer_phone);
  const phones = [...supplierPhones, ...(customerPhone ? [customerPhone] : [])];
  const wa = useThreadsForPhones(phones, 'whatsapp');
  const supplierEmails = Array.from(new Set([
    ...(r.supplier_replies || []).map((x) => extractEmail(x.supplier_email)).filter(Boolean),
    ...supplierPhones.map((p) => extractEmail(idx.data?.get(p)?.email)).filter(Boolean),
  ]));
  const customerEmail = extractEmail(r.customer_email);
  const emails = [...(customerEmail ? [customerEmail] : []), ...supplierEmails];
  const em = useThreadsForPhones(emails, 'email');
  const [chat, setChat] = useState<{ kind: 'wa' | 'email'; key: string; name?: string } | null>(null);
  const [full, setFull] = useState<string | null>(null);
  const byKey = (list: ContactThread[] | undefined, k: string) => (list || []).find((x) => normPhone(x.contact_phone) === normPhone(k) || x.contact_phone === k);
  const names = useMemo(() => new Map((r.forwarded_to || []).map((f) => [normPhone(f.phone), f.supplier_name || ''])), [r.forwarded_to]);
  const Card = ({ kind, k, label, role }: { kind: 'wa' | 'email'; k: string; label: string; role: string }) => {
    const th = byKey(kind === 'wa' ? wa.data : em.data, k);
    return (
      <button type="button" className="pr-th card" style={{ borderRadius: 8 }} onClick={() => setChat({ kind, key: k, name: label })}>
        <Avatar name={label} type={role} />
        <span style={{ minWidth: 0 }}><span className="nm" style={{ display: 'block' }}><bdi>{label}</bdi> <span className="muted">· {t(role)}</span></span><span className="lm" style={{ display: 'block' }}>{th?.last_message_text || t('No messages yet')}</span></span>
        <span className="meta">{th?.last_message_date && <span>{fmtRelative(th.last_message_date)}</span>}{(th?.unread_count || 0) > 0 && <span className="pr-badge">{th!.unread_count}</span>}</span>
      </button>
    );
  };
  return (
    <div className="stack">
      <Section title={<><Icon name="wa" size="s" /> {t('WhatsApp')}</>}>
        {!phones.length ? <span className="muted">{t('No phone numbers on this RFQ yet.')}</span> : (
          <div className="pr-grid-cards">
            {customerPhone && <Card kind="wa" k={customerPhone} label={r.customer_name || `+${customerPhone}`} role="customer" />}
            {supplierPhones.map((p) => <Card key={p} kind="wa" k={p} label={names.get(p) || idx.data?.get(p)?.name || `+${p}`} role="supplier" />)}
          </div>
        )}
      </Section>
      <Section title={<><Icon name="mail" size="s" /> {t('Email')}</>}>
        {!emails.length ? <span className="muted">{t('No email addresses on this RFQ yet.')}</span> : (
          <div className="pr-grid-cards">
            {customerEmail && <Card kind="email" k={customerEmail} label={customerEmail} role="customer" />}
            {supplierEmails.map((e) => <Card key={e} kind="email" k={e} label={e} role="supplier" />)}
          </div>
        )}
      </Section>
      <Drawer open={!!chat} onClose={() => setChat(null)} title={chat?.name || ''} width={640}>
        <div style={{ height: 'calc(100dvh - 130px)', display: 'flex' }}>
          {chat?.kind === 'wa' && <WhatsAppChat phone={chat.key} contactName={chat.name} />}
          {chat?.kind === 'email' && <EmailThread email={chat.key} onOpenFull={setFull} />}
        </div>
      </Drawer>
      <EmailDetail id={full} onClose={() => setFull(null)} />
    </div>
  );
}
