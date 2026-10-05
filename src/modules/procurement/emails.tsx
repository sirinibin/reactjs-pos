import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth, useStoreId } from '@/auth/AuthContext';
import { bus } from '@/realtime/bus';
import { Button, IconButton } from '@/ui/Button';
import { Banner, EmptyState, ErrorState, Segmented, Spinner, useConfirm } from '@/ui/Misc';
import { Field, Input, SearchInput, Textarea } from '@/ui/Field';
import { Drawer, Modal } from '@/ui/Overlay';
import { Pill } from '@/ui/Pill';
import { useToast } from '@/ui/Toast';
import { usePageMeta } from '@/shell/Workspace';
import { useDebounced } from '@/framework/useListState';
import { fmtDateTime } from '@/lib/format';
import { papi, pfetch } from './api';
import { emailName, extractEmail, fixEmailHtml, isEmail, stripHtml } from './logic';
import type { ProcurementMessage, RFQ } from './types';
import { Attachments, Avatar, Bubble } from './components/MessageBits';
import { ExtractModal } from './components/ExtractModal';
import { FileDrop } from './components/common';
import { DiskUsage, MESSAGES, MessagesTable, THREADS, useMessageActions, usePin, useThreads } from './whatsapp';
import './procurement.css';

const THANK_YOU = 'Dear Sir/Madam,\n\nThank you for your email. We have received your request and our team is reviewing it. We will get back to you with our quotation shortly.\n\nBest regards,';

export interface ComposeInit { to: string; subject: string; body: string; replyTo?: ProcurementMessage; forward?: boolean }

/** Reply / forward / new email composer. Reply & forward go through /email-reply (multipart), new mail through /procurement-email-send. */
export function EmailComposer({ init, onClose, onSent }: { init: ComposeInit | null; onClose: () => void; onSent?: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const storeId = useStoreId();
  const [v, setV] = useState({ to: '', subject: '', body: '' });
  const [files, setFiles] = useState<File[]>([]);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (init) { setV({ to: init.to, subject: init.subject, body: init.body }); setFiles([]); setErrs({}); } }, [init]);
  if (!init) return null;
  const title = init.forward ? t('Forward email') : init.replyTo ? t('Reply') : t('New email');
  const translate = async () => {
    if (!v.body.trim()) return;
    try { const r = await papi.post<{ translatedText: string }>('/v1/translate', { text: v.body, target: 'ar' }); if (r.translatedText) setV({ ...v, body: r.translatedText }); }
    catch (e) { toast.error(`${t('Translation failed')}: ${(e as Error).message}`); }
  };
  const send = async () => {
    const e: Record<string, string> = {};
    if (!isEmail(extractEmail(v.to))) e.to = t('Enter a valid recipient email address');
    if (!v.body.trim()) e.body = t('Write a message');
    if (Object.keys(e).length) { setErrs(e); return; }
    setBusy(true); setErrs({});
    try {
      if (init.replyTo) {
        const fd = new FormData();
        fd.append('store_id', storeId); fd.append('to', extractEmail(v.to)); fd.append('subject', v.subject); fd.append('body', v.body);
        files.forEach((f) => fd.append('files', f));
        await pfetch(`${MESSAGES}/${init.replyTo.id}/email-reply`, { method: 'POST', body: fd, query: { store_id: storeId } });
      } else {
        await papi.post('/v1/procurement-email-send', { store_id: storeId, to: extractEmail(v.to), subject: v.subject, body: v.body }, { store_id: storeId });
      }
      toast.success(t('Email sent to {{to}}', { to: extractEmail(v.to) }));
      onSent?.();
      onClose();
    } catch (err) { setErrs({ server: (err as Error).message }); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title={title} width={680}
      footer={<><Button variant="ghost" onClick={onClose}>{t('Cancel')}</Button><Button icon="globe" onClick={translate}>{t('Translate to Arabic')}</Button><Button variant="primary" icon="send" loading={busy} onClick={send}>{t('Send')}</Button></>}>
      <div className="stack">
        {errs.server && <Banner tone="crit">{errs.server}{/outgoing email/i.test(errs.server) && <> <Link className="link" to="/procurement/settings?tab=email" onClick={onClose}>{t('Open email settings')}</Link></>}</Banner>}
        <Field label={t('To')} required error={errs.to}>{(id, d) => <Input id={id} aria-describedby={d} type="email" invalid={!!errs.to} value={v.to} onChange={(e) => setV({ ...v, to: e.target.value })} />}</Field>
        <Field label={t('Subject')}>{(id) => <Input id={id} value={v.subject} onChange={(e) => setV({ ...v, subject: e.target.value })} />}</Field>
        <Field label={t('Message')} required error={errs.body}>{(id, d) => <Textarea id={id} aria-describedby={d} rows={9} value={v.body} onChange={(e) => setV({ ...v, body: e.target.value })} />}</Field>
        {init.replyTo && !init.forward && <div><Button size="sm" variant="ghost" onClick={() => setV({ ...v, body: THANK_YOU })}>{t('Use thank-you reply')}</Button></div>}
        {init.replyTo && <FileDrop files={files} onChange={setFiles} label={t('Attachments')} />}
      </div>
    </Modal>
  );
}

/** Full email (drawer): sanitised HTML, attachments, reply/forward/extract/quotation/delete. */
export function EmailDetail({ id, onClose, onChanged }: { id: string | null; onClose: () => void; onChanged?: () => void }) {
  const { t } = useTranslation();
  const storeId = useStoreId();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['procurement-message', storeId, id], queryFn: () => papi.get<ProcurementMessage>(`${MESSAGES}/${id}`, { store_id: storeId }), enabled: !!id && !!storeId });
  const [compose, setCompose] = useState<ComposeInit | null>(null);
  const [extract, setExtract] = useState(false);
  const done = () => { q.refetch(); onChanged?.(); };
  const acts = useMessageActions(done);
  useEffect(() => { if (q.isSuccess) { bus.emit('email_unread_changed'); qc.invalidateQueries({ queryKey: ['procurement-messages'] }); } }, [q.isSuccess, qc]);
  const m = q.data;
  const html = useMemo(() => (m?.body_html ? fixEmailHtml(m.body_html) : ''), [m?.body_html]);
  const rfqId = m?.rfq_received_id || m?.linked_rfq_received_id;
  const rfqCode = m?.rfq_received_code || m?.linked_rfq_received_code;
  const reply = () => m && setCompose({ to: m.direction === 'in' ? extractEmail(m.from) : extractEmail(m.to?.[0]), subject: /^re:/i.test(m.subject || '') ? m.subject || '' : `Re: ${m.subject || ''}`, body: '', replyTo: m });
  const forward = () => m && setCompose({ to: '', subject: `Fwd: ${m.subject || ''}`, body: `\n\n---------- Forwarded message ----------\nFrom: ${m.from}\nSubject: ${m.subject || ''}\n\n${m.body_text || stripHtml(m.body_html)}`, replyTo: m, forward: true });
  return (
    <Drawer open={!!id} onClose={onClose} title={m?.subject || t('Email')} width={860}
      footer={m && <>
        <Button variant="danger" icon="trash" onClick={async () => { await acts.remove(m); }}>{t('Delete')}</Button>
        <span className="spacer" />
        {m.direction === 'in' && <Button icon="tag" onClick={() => acts.toggleQuotation(m)}>{m.is_supplier_quotation ? t('Remove quotation label') : t('Label as quotation')}</Button>}
        {m.direction === 'in' && <Button icon="layers" onClick={() => setExtract(true)}>{t('Extract')}</Button>}
        <Button icon="send" onClick={forward}>{t('Forward')}</Button>
        <Button variant="primary" icon="undo" onClick={reply}>{t('Reply')}</Button>
      </>}>
      {q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : !m ? <Spinner /> : (
        <div className="stack">
          <div className="row" style={{ gap: 6 }}>
            <Pill tone={m.direction === 'in' ? 'info' : 'neutral'} icon={m.direction === 'in' ? 'inbox' : 'send'}>{m.direction === 'in' ? t('Received') : t('Sent')}</Pill>
            {m.provider && <span className="tag">{m.provider}</span>}
            {m.code && <span className="tag mono">{m.code}</span>}
            {m.processed_as_rfq && <Pill tone="good">{t('RFQ created')}</Pill>}
            {rfqId && <Link className="tag mono" to={`/procurement/rfq/${rfqId}`} onClick={onClose}>{rfqCode}</Link>}
            {m.is_supplier_quotation && <Pill tone="warn" icon="tag">{t('Supplier quotation')}</Pill>}
          </div>
          <dl className="pr-kv">
            <dt>{t('From')}</dt><dd><bdi>{emailName(m.from)}</bdi> <span className="muted">&lt;{extractEmail(m.from)}&gt;</span></dd>
            <dt>{t('To')}</dt><dd>{(m.to || []).map(extractEmail).join(', ')}</dd>
            <dt>{t('Date')}</dt><dd className="num">{fmtDateTime(m.message_date)}</dd>
          </dl>
          {m.attachment_missing && <AttachmentMissing m={m} onDone={done} />}
          <Attachments list={m.attachments} />
          {html ? <iframe className="pr-email" title={t('Email body')} sandbox="allow-popups allow-popups-to-escape-sandbox" srcDoc={`<base target="_blank"><style>body{font-family:system-ui,sans-serif;font-size:14px;margin:12px;color:#111;word-break:break-word}img{max-width:100%}</style>${html}`} />
            : <div className="pr-wrap card" style={{ padding: 12 }}>{m.body_text || '—'}</div>}
          <RfqHistory email={extractEmail(m.direction === 'in' ? m.from : m.to?.[0])} onNavigate={onClose} />
        </div>
      )}
      <EmailComposer init={compose} onClose={() => setCompose(null)} onSent={done} />
      <ExtractModal msg={m || null} open={extract} onClose={() => setExtract(false)} />
      {acts.confirmEl}
    </Drawer>
  );
}

function AttachmentMissing({ m, onDone }: { m: ProcurementMessage; onDone: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const storeId = useStoreId();
  const input = useRef<HTMLInputElement>(null);
  const retry = async () => { try { await papi.post(`${MESSAGES}/${m.id}/retry-attachments`, {}, { store_id: storeId }); toast.success(t('Attachments downloaded')); onDone(); } catch (e) { toast.error((e as Error).message); } };
  const upload = async (f: File) => {
    const fd = new FormData(); fd.append('file', f);
    try { await pfetch(`${MESSAGES}/${m.id}/upload-attachment`, { method: 'POST', body: fd, query: { store_id: storeId } }); toast.success(t('Attachment uploaded')); onDone(); } catch (e) { toast.error((e as Error).message); }
  };
  return (
    <Banner tone="warn">
      {t('Some attachments could not be downloaded — RFQ creation is blocked until they are available.')}{' '}
      {m.provider === 'zoho' && <Button size="sm" onClick={retry}>{t('Retry download')}</Button>}{' '}
      <Button size="sm" icon="upload" onClick={() => input.current?.click()}>{t('Upload')}</Button>
      <input ref={input} type="file" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }} />
    </Banner>
  );
}

function RfqHistory({ email, onNavigate }: { email: string; onNavigate?: () => void }) {
  const { t } = useTranslation();
  const storeId = useStoreId();
  const q = useQuery({ queryKey: ['procurement-rfq-history', storeId, email], queryFn: () => papi.get<{ customer_rfqs: RFQ[] | null; supplier_rfqs: RFQ[] | null }>('/v1/procurement-rfq-history', { store_id: storeId, email }), enabled: !!email && !!storeId });
  const c = q.data?.customer_rfqs || [];
  const s = q.data?.supplier_rfqs || [];
  if (!c.length && !s.length) return null;
  const list = (rows: RFQ[]) => <ul className="pr-files">{rows.map((r) => <li key={r.id}><Link className="link mono" to={`/procurement/rfq/${r.id}`} onClick={onNavigate}>{r.code}</Link><bdi className="muted">{r.customer_name}</bdi></li>)}</ul>;
  return (
    <div className="grid-2c">
      {c.length > 0 && <div><h4 style={{ margin: '0 0 6px' }}>{t('Customer RFQs')}</h4>{list(c)}</div>}
      {s.length > 0 && <div><h4 style={{ margin: '0 0 6px' }}>{t('Supplier RFQs')}</h4>{list(s)}</div>}
    </div>
  );
}

/** Email conversation with one address (polls every 15 s; opening marks it read). */
export function EmailThread({ email, onBack, onOpenFull }: { email: string; onBack?: () => void; onOpenFull: (id: string) => void }) {
  const { t } = useTranslation();
  const storeId = useStoreId();
  const { isAdmin } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const key = ['procurement-email-thread', storeId, email];
  const q = useQuery({ queryKey: key, queryFn: ({ signal }) => papi.get<{ messages: ProcurementMessage[] | null }>(`${THREADS}/${encodeURIComponent(email)}`, { store_id: storeId, type: 'email', limit: 200 }, signal).then((r) => r.messages || []), enabled: !!email && !!storeId, refetchInterval: 15_000 });
  const msgs = useMemo(() => q.data || [], [q.data]);
  const [compose, setCompose] = useState<ComposeInit | null>(null);
  const [extract, setExtract] = useState<ProcurementMessage | null>(null);
  const [confirmEl, ask] = useConfirm();
  const refresh = () => qc.invalidateQueries({ queryKey: key });
  const acts = useMessageActions(refresh);
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => { bottom.current?.scrollIntoView({ block: 'end' }); }, [msgs.length]);
  useEffect(() => { if (q.isSuccess) bus.emit('email_unread_changed'); }, [q.isSuccess]);
  const latest = msgs[msgs.length - 1];
  const replyTo = (m: ProcurementMessage | undefined) => m && setCompose({ to: email, subject: /^re:/i.test(m.subject || '') ? m.subject || '' : `Re: ${m.subject || ''}`, body: '', replyTo: m });
  const deleteThread = async () => {
    if (!(await ask(t('Delete entire conversation?'), { danger: true, confirmLabel: t('Delete'), body: t('All emails with {{e}} will be deleted.', { e: email }) }))) return;
    try { await papi.del(`${MESSAGES}/thread`, { store_id: storeId, contact: email, type: 'email' }); toast.success(t('Conversation deleted')); onBack?.(); qc.invalidateQueries({ queryKey: ['procurement-threads-list'] }); }
    catch (e) { toast.error((e as Error).message); }
  };
  return (
    <div className="pr-chat">
      <div className="pr-chat-h">
        {onBack && <IconButton icon="undo" label={t('Back to conversations')} onClick={onBack} />}
        <Avatar name={email} />
        <div className="t"><b><bdi>{email}</bdi></b><span className="muted" style={{ fontSize: 12 }}>{t('{{n}} emails', { n: msgs.length })}</span></div>
        <IconButton icon="plus" label={t('New email')} onClick={() => setCompose({ to: email, subject: '', body: '' })} />
        {isAdmin && <IconButton icon="trash" label={t('Delete entire conversation')} onClick={deleteThread} />}
      </div>
      <div className="pr-msgs" aria-label={t('Messages')}>
        {q.isError && <ErrorState error={q.error} onRetry={() => q.refetch()} />}
        {q.isPending && <Spinner />}
        {msgs.map((m) => (
          <Bubble key={m.id} m={m} kind="email" actions={<>
            <IconButton icon="eye" label={t('View full email')} onClick={() => onOpenFull(m.id)} />
            <IconButton icon="undo" label={t('Reply')} onClick={() => replyTo(m)} />
            <IconButton icon="send" label={t('Forward')} onClick={() => setCompose({ to: '', subject: `Fwd: ${m.subject || ''}`, body: `\n\n---------- Forwarded message ----------\n${m.body_text || stripHtml(m.body_html)}`, replyTo: m, forward: true })} />
            {m.direction === 'in' && <IconButton icon="layers" label={t('Extract with AI')} onClick={() => setExtract(m)} />}
            <IconButton icon="trash" label={t('Delete message')} onClick={() => acts.remove(m)} />
          </>} />
        ))}
        <div ref={bottom} />
      </div>
      <div className="pr-comp">
        <Button variant="primary" icon="undo" disabled={!latest} onClick={() => replyTo(latest)}>{t('Reply to latest')}</Button>
      </div>
      <EmailComposer init={compose} onClose={() => setCompose(null)} onSent={refresh} />
      <ExtractModal msg={extract} open={!!extract} onClose={() => setExtract(null)} />
      {acts.confirmEl}{confirmEl}
    </div>
  );
}

export function EmailInboxPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const storeId = useStoreId();
  const { isAdmin, can } = useAuth();
  usePageMeta(t('Emails'), 'mail');
  const [sp, setSp] = useSearchParams();
  const view = sp.get('view') === 'conv' ? 'conv' : 'all';
  const email = sp.get('email') || '';
  const openId = sp.get('msg');
  const setParam = (k: string, v: string | null) => setSp((prev) => { const n = new URLSearchParams(prev); if (v) n.set(k, v); else n.delete(k); return n; }, { replace: true });
  const [search, setSearch] = useState('');
  const ds = useDebounced(search, 350);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const threads = useThreads('email', { search: ds, from, to, limit: 80 }, view === 'conv' ? 15_000 : 0);
  const pin = usePin('email', () => threads.refetch());
  const [syncing, setSyncing] = useState(false);
  const [compose, setCompose] = useState<ComposeInit | null>(null);
  const [confirmEl, ask] = useConfirm();
  const qc = useQueryClient();
  const reload = () => { qc.invalidateQueries({ queryKey: ['procurement-messages'] }); threads.refetch(); };
  const lastSeen = useRef<string>('');
  useEffect(() => {
    const top = (threads.data || []).map((x) => x.last_message_date || '').sort().pop() || '';
    if (lastSeen.current && top > lastSeen.current) toast.info(t('New email received'));
    if (top) lastSeen.current = top;
  }, [threads.data, toast, t]);
  useEffect(() => { const off = bus.on('email_unread_changed', () => { qc.invalidateQueries({ queryKey: ['procurement-messages'] }); }); return () => { off(); }; }, [qc]);

  const sync = async () => {
    setSyncing(true);
    try {
      await papi.post('/v1/email-accounts/sync', {}, { store_id: storeId });
      toast.success(t('Sync started — new emails appear in a few seconds'));
      setTimeout(reload, 5000); setTimeout(reload, 12000);
    } catch (e) { toast.error((e as Error).message); } finally { setSyncing(false); }
  };
  const deleteAll = async () => {
    if (!(await ask(t('Delete all emails?'), { danger: true, confirmLabel: t('Delete all'), body: t('Every email in this store’s procurement inbox will be permanently deleted.') }))) return;
    try { const r = await papi.del<{ deleted: number }>(MESSAGES, { store_id: storeId, type: 'email' }); toast.success(t('Deleted {{n}} messages', { n: r.deleted ?? 0 })); reload(); } catch (e) { toast.error((e as Error).message); }
  };
  const backfill = async () => {
    try { const r = await papi.post<{ updated: number }>(`${MESSAGES}/resolve-senders`, { store_id: storeId }, { store_id: storeId }); toast.success(t('Identified {{n}} senders', { n: r.updated ?? 0 })); threads.refetch(); } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <section className="pad">
      <div className="ph">
        <div><h1>{t('Emails')}</h1><p>{t('Procurement mailbox — customer enquiries and supplier quotations')}</p></div>
        <div className="acts">
          <DiskUsage />
          <Segmented label={t('View')} value={view} onChange={(v) => setParam('view', v === 'conv' ? 'conv' : null)} options={[{ value: 'all', label: t('All messages') }, { value: 'conv', label: t('Conversations') }]} />
          <Button icon="refresh" loading={syncing} onClick={sync}>{t('Sync now')}</Button>
          <Button icon="users" onClick={backfill}>{t('Identify senders')}</Button>
          {isAdmin && can('procurement_emails', 'delete') && <Button variant="danger" icon="trash" onClick={deleteAll}>{t('Delete all')}</Button>}
          <Button variant="primary" icon="plus" onClick={() => setCompose({ to: '', subject: '', body: '' })}>{t('New email')}</Button>
        </div>
      </div>
      {view === 'all' ? <MessagesTable type="email" initialSearch={email} onOpen={(m) => setParam('msg', m.id)} /> : (
        <div className={`card pr-split${email ? ' has-chat' : ''}`}>
          <div className="pr-threads">
            <div className="pr-threads-h">
              <SearchInput value={search} onChange={setSearch} placeholder={t('Search by email address…')} aria-label={t('Search conversations')} />
              <div className="row" style={{ flexWrap: 'nowrap' }}>
                <Input type="date" aria-label={t('From')} value={from} onChange={(e) => setFrom(e.target.value)} />
                <Input type="date" aria-label={t('To')} value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
            </div>
            {threads.isError ? <div style={{ padding: 10 }}><ErrorState error={threads.error} onRetry={() => threads.refetch()} /></div> : threads.isPending ? <div style={{ padding: 16 }}><Spinner /></div> : (
              <div className="pr-threads-l" role="list" aria-label={t('Conversations')}>
                {(threads.data || []).map((th) => (
                  <div role="listitem" key={th.contact_phone} style={{ position: 'relative' }}>
                    <button type="button" className="pr-th" aria-current={th.contact_phone === email ? 'true' : undefined} onClick={() => setParam('email', th.contact_phone)}>
                      <Avatar name={th.sender_name || th.contact_phone} type={th.sender_type} />
                      <span style={{ minWidth: 0 }}><span className="nm" style={{ display: 'block' }}>{th.pinned && '📌 '}<bdi>{th.sender_name || th.contact_phone}</bdi></span><span className="lm" style={{ display: 'block' }}>{th.last_message_text}</span></span>
                      <span className="meta"><span className="num">{th.message_count}</span>{(th.unread_count || 0) > 0 && <span className="pr-badge">{th.unread_count}</span>}</span>
                    </button>
                    <span style={{ position: 'absolute', insetInlineEnd: 4, bottom: 2 }}><IconButton icon="pin" label={th.pinned ? t('Unpin') : t('Pin')} onClick={() => pin(th)} style={{ width: 24, height: 24, opacity: th.pinned ? 1 : 0.45 }} /></span>
                  </div>
                ))}
                {!(threads.data || []).length && <EmptyState icon="mail" title={t('No conversations')}>{t('Connect an email account in Procurement settings, then press Sync now.')}</EmptyState>}
              </div>
            )}
          </div>
          {email ? <EmailThread key={email} email={email} onBack={() => setParam('email', null)} onOpenFull={(id) => setParam('msg', id)} />
            : <div className="pr-chat" style={{ justifyContent: 'center' }}><EmptyState icon="mail" title={t('Select a conversation')} /></div>}
        </div>
      )}
      <EmailDetail id={openId} onClose={() => setParam('msg', null)} onChanged={reload} />
      <EmailComposer init={compose} onClose={() => setCompose(null)} onSent={reload} />
      {confirmEl}
    </section>
  );
}
