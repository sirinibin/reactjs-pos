import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth, useStoreId } from '@/auth/AuthContext';
import { bus } from '@/realtime/bus';
import { Button, IconButton } from '@/ui/Button';
import { Banner, EmptyState, ErrorState, Segmented, Spinner, useConfirm } from '@/ui/Misc';
import { Field, Input, SearchInput, Select, Textarea } from '@/ui/Field';
import { Drawer, Modal } from '@/ui/Overlay';
import { DataGrid, Pager, type Column } from '@/ui/DataGrid';
import { Pill } from '@/ui/Pill';
import { useToast } from '@/ui/Toast';
import { usePageMeta } from '@/shell/Workspace';
import { useDebounced } from '@/framework/useListState';
import { fmtDateTime, fmtRelative } from '@/lib/format';
import { papi, pfetch } from './api';
import { normPhone, stripHtml } from './logic';
import type { ContactThread, ProcurementMessage, RFQ, RFQSupplier } from './types';
import { Avatar, Bubble } from './components/MessageBits';
import { ExtractModal } from './components/ExtractModal';
import { SupplierForm, SUPPLIERS } from './components/SupplierForm';
import './procurement.css';

export const THREADS = '/v1/procurement-message-threads';
export const MESSAGES = '/v1/procurement-messages';

/** Message actions shared by WhatsApp + email: label/unlink quotation and delete. */
export function useMessageActions(onDone: () => void) {
  const { t } = useTranslation();
  const toast = useToast();
  const storeId = useStoreId();
  const [confirmEl, ask] = useConfirm();
  const toggleQuotation = async (m: ProcurementMessage) => {
    try {
      if (m.is_supplier_quotation) { await papi.post(`${MESSAGES}/${m.id}/link-as-quotation`, { unlink: true }, { store_id: storeId }); toast.success(t('Quotation label removed')); }
      else {
        const r = await papi.post<{ matched_rfq_code?: string }>(`${MESSAGES}/${m.id}/link-as-quotation`, {}, { store_id: storeId });
        toast.success(r.matched_rfq_code ? t('Labelled as supplier quotation — matched to {{c}}', { c: r.matched_rfq_code }) : t('Labelled as supplier quotation'));
      }
      onDone();
    } catch (e) { toast.error((e as Error).message); }
  };
  const remove = async (m: ProcurementMessage) => {
    if (!(await ask(t('Delete this message?'), { danger: true, confirmLabel: t('Delete'), body: t('The message is removed from the procurement inbox.') }))) return;
    try {
      const r = await papi.del<{ retract_warning?: string }>(`${MESSAGES}/${m.id}`, { store_id: storeId });
      toast.success(t('Message deleted'));
      if (r.retract_warning) toast.info(r.retract_warning);
      onDone();
    } catch (e) { toast.error((e as Error).message); }
  };
  return { toggleQuotation, remove, confirmEl };
}

/** One WhatsApp conversation (polls every 3 s; opening marks it read). */
export function WhatsAppChat({ phone, contactName, onBack, onContact }: { phone: string; contactName?: string; onBack?: () => void; onContact?: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const storeId = useStoreId();
  const qc = useQueryClient();
  const key = ['procurement-wa-thread', storeId, phone];
  const q = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => papi.get<{ messages: ProcurementMessage[] | null; total: number }>(`${THREADS}/${encodeURIComponent(phone)}`, { store_id: storeId, type: 'whatsapp', limit: 200 }, signal).then((r) => r.messages || []),
    enabled: !!storeId && !!phone,
    refetchInterval: 3000,
  });
  const msgs = useMemo(() => q.data || [], [q.data]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [extract, setExtract] = useState<ProcurementMessage | null>(null);
  const [recording, setRecording] = useState<MediaRecorder | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const fileIn = useRef<HTMLInputElement>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: key });
  const acts = useMessageActions(refresh);
  const lastId = msgs[msgs.length - 1]?.id;
  useEffect(() => { bottom.current?.scrollIntoView({ block: 'end' }); }, [lastId]);
  useEffect(() => { if (q.isSuccess) bus.emit('wa_unread_changed', { phone }); }, [q.isSuccess, phone]);

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setSending(true);
    try { await papi.post(`${THREADS}/${encodeURIComponent(phone)}/send`, { text: body, store_id: storeId }); setText(''); refresh(); }
    catch (e) { toast.error(`${(e as Error).message} — ${t('free-text messages only work within 24 h of the contact’s last message; use the RFQ template otherwise.')}`); }
    finally { setSending(false); }
  };
  const sendFile = async (f: File | Blob, name?: string) => {
    const fd = new FormData();
    fd.append('file', f, name || (f as File).name || 'file');
    fd.append('store_id', storeId);
    if (text.trim()) fd.append('caption', text.trim());
    setSending(true);
    try { await pfetch(`${THREADS}/${encodeURIComponent(phone)}/send-media`, { method: 'POST', body: fd, query: { store_id: storeId } }); setText(''); refresh(); toast.success(t('Sent')); }
    catch (e) { toast.error((e as Error).message); } finally { setSending(false); }
  };
  const toArabic = async () => {
    if (!text.trim()) return;
    try { const r = await papi.post<{ translatedText: string }>('/v1/translate', { text, target: 'ar' }); if (r.translatedText) setText(r.translatedText); }
    catch (e) { toast.error(`${t('Translation failed')}: ${(e as Error).message}`); }
  };
  const voice = async () => {
    if (recording) { recording.stop(); return; }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') { toast.error(t('Voice recording isn’t supported in this browser.')); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported('audio/ogg') ? 'audio/ogg' : 'audio/webm';
      const rec = new MediaRecorder(stream, { mimeType: mime });
      const chunks: BlobPart[] = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = () => { stream.getTracks().forEach((tr) => tr.stop()); setRecording(null); sendFile(new Blob(chunks, { type: mime }), `voice.${mime.includes('ogg') ? 'ogg' : 'webm'}`); };
      rec.start();
      setRecording(rec);
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="pr-chat">
      <div className="pr-chat-h">
        {onBack && <IconButton icon="undo" label={t('Back to conversations')} onClick={onBack} />}
        <Avatar name={contactName || phone} />
        <div className="t"><b><bdi>{contactName || phone}</bdi></b><span className="muted num" style={{ fontSize: 12 }}>+{normPhone(phone)}</span></div>
        {onContact && <IconButton icon="user" label={t('Contact details')} onClick={onContact} />}
        <IconButton icon="refresh" label={t('Refresh')} onClick={refresh} />
      </div>
      <div className="pr-msgs" aria-live="polite" aria-label={t('Messages')}>
        {q.isError && <ErrorState error={q.error} onRetry={() => q.refetch()} />}
        {q.isPending && <Spinner />}
        {!q.isPending && !msgs.length && !q.isError && <EmptyState icon="wa" title={t('No messages yet')}>{t('Start the conversation below. New contacts must first receive an approved template (e.g. an RFQ).')}</EmptyState>}
        {msgs.map((m) => (
          <Bubble key={m.id} m={m} kind="whatsapp" actions={<>
            {m.direction === 'in' && <IconButton icon="layers" label={t('Extract with AI')} onClick={() => setExtract(m)} />}
            {m.direction === 'in' && <IconButton icon="tag" label={m.is_supplier_quotation ? t('Remove quotation label') : t('Label as quotation')} onClick={() => acts.toggleQuotation(m)} />}
            <IconButton icon="trash" label={t('Delete message')} onClick={() => acts.remove(m)} />
          </>} />
        ))}
        <div ref={bottom} />
      </div>
      <div className="pr-comp">
        <IconButton icon="paper" label={t('Attach file')} onClick={() => fileIn.current?.click()} disabled={sending} />
        <input ref={fileIn} type="file" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) sendFile(f); e.target.value = ''; }} />
        <Textarea aria-label={t('Message')} placeholder={t('Type a message — Ctrl+Enter to send')} value={text} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); send(); } }} rows={1} />
        <IconButton icon="globe" label={t('Translate to Arabic')} onClick={toArabic} />
        <IconButton icon={recording ? 'xc' : 'phone'} label={recording ? t('Stop recording') : t('Record voice note')} onClick={voice} />
        <Button variant="primary" icon="send" loading={sending} onClick={send} aria-label={t('Send')} />
      </div>
      <ExtractModal msg={extract} open={!!extract} onClose={() => setExtract(null)} />
      {acts.confirmEl}
    </div>
  );
}

/** Supplier/customer lookup + RFQ history for a phone. */
export function ContactDrawer({ phone, open, onClose }: { phone: string; open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const storeId = useStoreId();
  const p = normPhone(phone);
  const [edit, setEdit] = useState(false);
  const supplier = useQuery({ queryKey: ['procurement-contact-sup', storeId, p], queryFn: () => papi.get<{ result: RFQSupplier[] }>(SUPPLIERS, { store_id: storeId, search: p, limit: 1 }).then((r) => r.result?.[0] || null), enabled: open && !!p });
  const customer = useQuery({ queryKey: ['procurement-contact-cust', storeId, p], queryFn: () => papi.get<any>('/v1/customer/by-phone', { store_id: storeId, phone: p }).then((r) => (r?.id ? r : r?.result?.id ? r.result : null)).catch(() => null), enabled: open && !!p });
  const supRfqs = useQuery({ queryKey: ['procurement-contact-rfq', storeId, p], queryFn: () => papi.get<{ items: RFQ[] | null }>('/v1/rfq-received', { store_id: storeId, supplier_phone: p, limit: 20 }).then((r) => r.items || []), enabled: open && !!p });
  const custRfqs = useQuery({ queryKey: ['procurement-contact-crfq', storeId, customer.data?.id], queryFn: () => papi.get<{ result: RFQ[] | null }>('/v1/rfq-received', { store_id: storeId, customer_id: customer.data!.id, limit: 50 }).then((r) => r.result || []), enabled: open && !!customer.data?.id });
  const list = (rows: RFQ[] | undefined) => !rows?.length ? <span className="muted">{t('None')}</span> : <ul className="pr-files">{rows.map((r) => <li key={r.id}><Link className="link mono" to={`/procurement/rfq/${r.id}`} onClick={onClose}>{r.code}</Link><bdi className="muted">{r.customer_name}</bdi></li>)}</ul>;
  return (
    <Drawer open={open} onClose={onClose} title={`${t('Contact')} +${p}`} width={440}>
      <div className="stack">
        <section>
          <h4 className="muted" style={{ margin: '0 0 6px' }}>{t('Supplier')}</h4>
          {supplier.isLoading ? <Spinner /> : supplier.data ? (
            <div className="stack" style={{ gap: 6 }}>
              <b><bdi>{supplier.data.name}</bdi></b>
              <span className="muted">{[supplier.data.purchase_market, (supplier.data.categories || []).join(', ')].filter(Boolean).join(' · ')}</span>
              <div><Button size="sm" icon="edit" onClick={() => setEdit(true)}>{t('Edit supplier')}</Button></div>
            </div>
          ) : <div className="row"><span className="muted">{t('Not a saved supplier.')}</span><Button size="sm" icon="plus" onClick={() => setEdit(true)}>{t('Add supplier')}</Button></div>}
        </section>
        <section>
          <h4 className="muted" style={{ margin: '0 0 6px' }}>{t('Customer')}</h4>
          {customer.isLoading ? <Spinner /> : customer.data ? <Link className="link" to={`/sales/customers/${customer.data.id}`} onClick={onClose}><bdi>{customer.data.name}</bdi></Link> : <span className="muted">{t('No customer with this number.')}</span>}
        </section>
        <section><h4 className="muted" style={{ margin: '0 0 6px' }}>{t('Supplier RFQ history')}</h4>{supRfqs.isLoading ? <Spinner /> : list(supRfqs.data)}</section>
        {customer.data && <section><h4 className="muted" style={{ margin: '0 0 6px' }}>{t('Customer RFQs')}</h4>{custRfqs.isLoading ? <Spinner /> : list(custRfqs.data)}</section>}
      </div>
      <SupplierForm open={edit} supplier={supplier.data || { phone: p, name: '' }} onClose={() => setEdit(false)} onSaved={() => supplier.refetch()} />
    </Drawer>
  );
}

function ThreadList({ threads, current, onPick, onPin }: { threads: ContactThread[]; current?: string; onPick: (t: ContactThread) => void; onPin: (t: ContactThread) => void }) {
  const { t } = useTranslation();
  return (
    <div className="pr-threads-l" role="list" aria-label={t('Conversations')}>
      {threads.map((th) => (
        <div key={th.contact_phone} role="listitem" style={{ position: 'relative' }}>
          <button type="button" className="pr-th" aria-current={normPhone(th.contact_phone) === normPhone(current) && current ? 'true' : undefined} onClick={() => onPick(th)}>
            <Avatar name={th.sender_name || th.contact_phone} type={th.sender_type} />
            <span style={{ minWidth: 0 }}>
              <span className="nm" style={{ display: 'block' }}>{th.pinned && '📌 '}<bdi>{th.sender_name || `+${th.contact_phone}`}</bdi></span>
              <span className="lm" style={{ display: 'block' }}>{th.last_message_text || `(${th.last_message_type || t('media message')})`}</span>
            </span>
            <span className="meta">
              <span>{fmtRelative(th.last_message_date)}</span>
              {(th.unread_count || 0) > 0 && <span className="pr-badge" aria-label={t('{{n}} unread', { n: th.unread_count })}>{th.unread_count}</span>}
            </span>
          </button>
          <span style={{ position: 'absolute', insetInlineEnd: 4, bottom: 2 }}>
            <IconButton icon="pin" label={th.pinned ? t('Unpin') : t('Pin')} onClick={() => onPin(th)} style={{ width: 24, height: 24, opacity: th.pinned ? 1 : 0.45 }} />
          </span>
        </div>
      ))}
      {!threads.length && <EmptyState icon="wa" title={t('No conversations')}>{t('WhatsApp messages to the bot number appear here.')}</EmptyState>}
    </div>
  );
}

/** Thread list query for WhatsApp/email inboxes (polling). */
export function useThreads(type: 'whatsapp' | 'email', p: { search: string; from: string; to: string; limit: number }, interval: number) {
  const storeId = useStoreId();
  return useQuery<ContactThread[]>({
    queryKey: ['procurement-threads-list', storeId, type, p],
    queryFn: ({ signal }) => papi.get<{ threads: ContactThread[] | null; total: number }>(THREADS, { store_id: storeId, type, limit: p.limit, search: p.search || undefined, date_from: p.from || undefined, date_to: p.to || undefined }, signal).then((r) => r.threads || []),
    enabled: !!storeId,
    refetchInterval: interval,
    placeholderData: keepPreviousData,
  });
}

export function usePin(type: 'whatsapp' | 'email', onDone: () => void) {
  const storeId = useStoreId();
  const toast = useToast();
  return async (th: ContactThread) => {
    try { await pfetch(`${THREADS}/${encodeURIComponent(th.contact_phone)}/pin`, { method: th.pinned ? 'DELETE' : 'POST', query: { store_id: storeId, type } }); onDone(); }
    catch (e) { toast.error((e as Error).message); }
  };
}

export function DiskUsage() {
  const { t } = useTranslation();
  const storeId = useStoreId();
  const q = useQuery({ queryKey: ['procurement-disk', storeId], queryFn: () => papi.get<{ formatted: string }>(`${MESSAGES}/disk-usage`, { store_id: storeId }), enabled: !!storeId, staleTime: 60_000 });
  return q.data?.formatted ? <span className="muted hide-sm" style={{ fontSize: 12 }}>{q.data.formatted} {t('used')}</span> : null;
}

export function WhatsAppInboxPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const storeId = useStoreId();
  const { isAdmin, can } = useAuth();
  usePageMeta(t('WhatsApp'), 'wa');
  const [sp, setSp] = useSearchParams();
  const view = sp.get('view') === 'all' ? 'all' : 'conv';
  const phone = sp.get('phone') || '';
  const [search, setSearch] = useState('');
  const ds = useDebounced(search, 300);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const threads = useThreads('whatsapp', { search: ds, from, to, limit: 50 }, 5000);
  const pin = usePin('whatsapp', () => threads.refetch());
  const [newPhone, setNewPhone] = useState('');
  const [contact, setContact] = useState(false);
  const [confirmEl, ask] = useConfirm();
  const setParam = (k: string, v: string | null) => setSp((prev) => { const n = new URLSearchParams(prev); if (v) n.set(k, v); else n.delete(k); return n; }, { replace: true });
  const current = (threads.data || []).find((th) => normPhone(th.contact_phone) === normPhone(phone));

  const refetchThreads = threads.refetch;
  useEffect(() => { const off = bus.on('wa_unread_changed', () => { refetchThreads(); }); return () => { off(); }; }, [refetchThreads]);

  const identify = async () => {
    try { const r = await papi.post<{ updated: number }>(`${MESSAGES}/resolve-senders`, { store_id: storeId }, { store_id: storeId }); toast.success(t('Identified {{n}} senders', { n: r.updated ?? 0 })); threads.refetch(); }
    catch (e) { toast.error((e as Error).message); }
  };
  const deleteAll = async () => {
    if (!(await ask(t('Delete all WhatsApp messages?'), { danger: true, confirmLabel: t('Delete all'), body: t('Every WhatsApp message in this store’s procurement inbox will be permanently deleted.') }))) return;
    try { const r = await papi.del<{ deleted: number }>(MESSAGES, { store_id: storeId, type: 'whatsapp' }); toast.success(t('Deleted {{n}} messages', { n: r.deleted ?? 0 })); threads.refetch(); }
    catch (e) { toast.error((e as Error).message); }
  };
  const startNew = () => { const p = normPhone(newPhone); if (p.length < 8) { toast.error(t('Enter the full international number (e.g. 966501234567)')); return; } setNewPhone(''); setParam('phone', p); };

  return (
    <section className="pad">
      <div className="ph">
        <div><h1>{t('WhatsApp')}</h1><p>{t('Supplier and customer conversations on the procurement WhatsApp number')}</p></div>
        <div className="acts">
          <DiskUsage />
          <Segmented label={t('View')} value={view} onChange={(v) => setParam('view', v === 'all' ? 'all' : null)} options={[{ value: 'conv', label: t('Conversations') }, { value: 'all', label: t('All messages') }]} />
          <Button icon="users" onClick={identify}>{t('Identify senders')}</Button>
          {isAdmin && can('procurement_whatsapp', 'delete') && <Button variant="danger" icon="trash" onClick={deleteAll}>{t('Delete all')}</Button>}
        </div>
      </div>
      {view === 'all' ? <MessagesTable type="whatsapp" /> : (
        <div className={`card pr-split${phone ? ' has-chat' : ''}`}>
          <div className="pr-threads">
            <div className="pr-threads-h">
              <SearchInput value={search} onChange={setSearch} placeholder={t('Search name or number…')} aria-label={t('Search conversations')} />
              <div className="row" style={{ flexWrap: 'nowrap' }}>
                <Input type="date" aria-label={t('From')} value={from} onChange={(e) => setFrom(e.target.value)} />
                <Input type="date" aria-label={t('To')} value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
              <form className="row" style={{ flexWrap: 'nowrap' }} onSubmit={(e) => { e.preventDefault(); startNew(); }}>
                <Input type="tel" className="num" aria-label={t('Start new conversation')} placeholder={t('e.g. 971501234567')} value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
                <Button type="submit" icon="plus" aria-label={t('Start new conversation')} />
              </form>
            </div>
            {threads.isError ? <div style={{ padding: 10 }}><ErrorState error={threads.error} onRetry={() => threads.refetch()} /></div>
              : threads.isPending ? <div style={{ padding: 16 }}><Spinner /></div>
              : <ThreadList threads={threads.data || []} current={phone} onPick={(th) => setParam('phone', normPhone(th.contact_phone))} onPin={pin} />}
          </div>
          {phone ? <WhatsAppChat key={phone} phone={phone} contactName={current?.sender_name} onBack={() => setParam('phone', null)} onContact={() => setContact(true)} />
            : <div className="pr-chat" style={{ justifyContent: 'center' }}><EmptyState icon="wa" title={t('Select a conversation')}>{t('Pick a contact on the left or start a new conversation.')}</EmptyState></div>}
        </div>
      )}
      {phone && <ContactDrawer phone={phone} open={contact} onClose={() => setContact(false)} />}
      {confirmEl}
    </section>
  );
}

/** Paged message table for WhatsApp or email (All messages view, §7.2/§7.5). */
export function MessagesTable({ type, onOpen, initialSearch = '' }: { type: 'whatsapp' | 'email'; onOpen?: (m: ProcurementMessage) => void; initialSearch?: string }) {
  const { t } = useTranslation();
  const storeId = useStoreId();
  const [search, setSearch] = useState(initialSearch);
  const ds = useDebounced(search, 350);
  const [direction, setDirection] = useState(type === 'email' ? 'in' : '');
  const [rfqFilter, setRfqFilter] = useState('');
  const [hasAtt, setHasAtt] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [extract, setExtract] = useState<ProcurementMessage | null>(null);
  const [reply, setReply] = useState<ProcurementMessage | null>(null);
  useEffect(() => setPage(1), [ds, direction, rfqFilter, hasAtt, from, to]);
  const q = useQuery<{ messages: ProcurementMessage[] | null; total: number }>({
    queryKey: ['procurement-messages', storeId, type, ds, direction, rfqFilter, hasAtt, from, to, page],
    queryFn: ({ signal }) => papi.get<{ messages: ProcurementMessage[] | null; total: number }>(MESSAGES, { store_id: storeId, type, direction: direction || undefined, search: ds || undefined, rfq_filter: rfqFilter || undefined, has_attachments: hasAtt ? 'true' : undefined, date_from: from || undefined, date_to: to || undefined, page, limit: 20 }, signal),
    enabled: !!storeId,
    placeholderData: keepPreviousData,
  });
  const acts = useMessageActions(() => q.refetch());
  const rows = q.data?.messages || [];
  const columns: Column<ProcurementMessage>[] = [
    { key: 'code', header: t('ID'), className: 'code', render: (m) => <span className="mono">{m.code}</span> },
    { key: 'dir', header: t('Direction'), render: (m) => <Pill tone={m.direction === 'in' ? 'info' : 'neutral'} icon={m.direction === 'in' ? 'inbox' : 'send'}>{m.direction === 'in' ? t('Incoming') : t('Outgoing')}</Pill> },
    { key: 'from', header: t('From'), className: 'two', render: (m) => <><b><bdi>{m.sender_name || m.from}</bdi></b><span>{m.sender_type ? t(m.sender_type) : ''}</span></> },
    { key: 'msg', header: type === 'email' ? t('Subject') : t('Message'), render: (m) => (
      <span style={{ fontWeight: m.read === false && m.direction === 'in' ? 700 : undefined }}>
        {m.processed_as_rfq && '✅ '}{(type === 'email' ? m.subject : m.body_text || stripHtml(m.body_html))?.slice(0, 90) || (m.wa_message_type ? `(${m.wa_message_type})` : '—')}
        {m.is_supplier_quotation && <> <span className="tag">{t('Quotation')}{m.linked_rfq_received_code ? ` (${m.linked_rfq_received_code})` : ''}</span></>}
      </span>) },
    ...(type === 'email' ? [{ key: 'provider', header: t('Provider'), hideBelow: 'xl' as const, render: (m: ProcurementMessage) => m.provider || '—' }] : []),
    { key: 'date', header: t('Date'), render: (m) => <span className="num">{fmtDateTime(m.message_date)}</span> },
    { key: 'att', header: t('Attachments'), hideBelow: 'lg', render: (m) => <>{(m.attachments || []).length || '—'}{m.attachment_missing && <> <Pill tone="warn">{t('Missing')}</Pill></>}</> },
    { key: 'rfq', header: t('RFQ'), render: (m) => m.rfq_received_id ? <Link className="link mono" to={`/procurement/rfq/${m.rfq_received_id}`} onClick={(e) => e.stopPropagation()}>{m.rfq_received_code}</Link> : '—' },
  ];
  return (
    <div className="card">
      <div className="gridbar" style={{ flexWrap: 'wrap' }}>
        <SearchInput value={search} onChange={setSearch} placeholder={type === 'email' ? t('Search from, subject or body…') : t('Search sender or text…')} aria-label={t('Search messages')} />
        <Select aria-label={t('Direction')} value={direction} onChange={(e) => setDirection(e.target.value)} style={{ width: 'auto' }} options={[{ value: '', label: t('All directions') }, { value: 'in', label: t('Incoming') }, { value: 'out', label: t('Outgoing') }]} />
        <Select aria-label={t('RFQ filter')} value={rfqFilter} onChange={(e) => setRfqFilter(e.target.value)} style={{ width: 'auto' }} options={[{ value: '', label: t('All messages') }, { value: 'yes', label: t('RFQ created') }, { value: 'quotation', label: t('Quotation') }, { value: 'other', label: t('Other') }, { value: 'no', label: t('No RFQ') }]} />
        <label className="checkline"><input type="checkbox" className="chk" checked={hasAtt} onChange={(e) => setHasAtt(e.target.checked)} /><span>{t('With attachments')}</span></label>
        <Input type="date" aria-label={t('From')} value={from} onChange={(e) => setFrom(e.target.value)} style={{ width: 'auto' }} />
        <Input type="date" aria-label={t('To')} value={to} onChange={(e) => setTo(e.target.value)} style={{ width: 'auto' }} />
        <span className="spacer" />
        <span className="muted num">{t('{{n}} messages', { n: q.data?.total ?? 0 })}</span>
        <IconButton icon="refresh" label={t('Refresh')} onClick={() => q.refetch()} />
      </div>
      {q.isError ? <div style={{ padding: 12 }}><ErrorState error={q.error} onRetry={() => q.refetch()} /></div> : (
        <DataGrid<ProcurementMessage> label={type === 'email' ? t('Emails') : t('WhatsApp messages')} columns={columns} rows={rows} rowKey={(m) => m.id} loading={q.isPending}
          onRowClick={(m) => (onOpen ? onOpen(m) : setReply(m))}
          rowActions={(m) => <span className="row" style={{ gap: 0, flexWrap: 'nowrap' }}>
            {m.direction === 'in' && <IconButton icon="tag" label={m.is_supplier_quotation ? t('Remove quotation label') : t('Label as quotation')} onClick={() => acts.toggleQuotation(m)} />}
            {m.direction === 'in' && <IconButton icon="layers" label={t('Extract with AI')} onClick={() => setExtract(m)} />}
            <IconButton icon="trash" label={t('Delete message')} onClick={() => acts.remove(m)} />
          </span>}
          mobileCard={(m) => ({ title: <span className="mono">{m.code}</span>, amount: m.direction === 'in' ? t('Incoming') : t('Outgoing'), subtitle: <bdi>{m.sender_name || m.from}</bdi>, meta: <>{fmtDateTime(m.message_date)} · {(type === 'email' ? m.subject : m.body_text)?.slice(0, 60)}</> })}
          empty={<EmptyState icon={type === 'email' ? 'mail' : 'wa'} title={t('No messages')}>{t('Try different filters, or check the connection in Procurement settings.')}</EmptyState>} />
      )}
      <Pager page={page} pageSize={20} total={q.data?.total || 0} onPage={setPage} />
      <ExtractModal msg={extract} open={!!extract} onClose={() => setExtract(null)} />
      {type === 'whatsapp' && <WaReplyModal msg={reply} onClose={() => setReply(null)} onSent={() => q.refetch()} />}
      {acts.confirmEl}
    </div>
  );
}

function WaReplyModal({ msg, onClose, onSent }: { msg: ProcurementMessage | null; onClose: () => void; onSent: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const storeId = useStoreId();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => { setText(''); setErr(''); }, [msg?.id]);
  if (!msg) return null;
  const send = async () => {
    if (!text.trim()) { setErr(t('Type a reply first.')); return; }
    setBusy(true); setErr('');
    try { await papi.post(`${MESSAGES}/${msg.id}/reply`, { text: text.trim(), store_id: storeId }); toast.success(t('Reply sent')); onSent(); onClose(); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title={`${msg.code} · ${msg.sender_name || msg.from}`} width={600}
      footer={<><Link className="btn" to={`/procurement/whatsapp?phone=${normPhone(msg.from)}`} onClick={onClose}>{t('Open conversation')}</Link><Button variant="primary" icon="send" loading={busy} onClick={send}>{t('Send reply')}</Button></>}>
      <div className="stack">
        <Bubble m={msg} kind="whatsapp" />
        {err && <Banner tone="crit">{err}</Banner>}
        <Field label={t('Reply')} hint={t('Free-text replies only work within 24 h of the contact’s last message.')}>{(id) => <Textarea id={id} rows={3} value={text} onChange={(e) => setText(e.target.value)} />}</Field>
      </div>
    </Modal>
  );
}
