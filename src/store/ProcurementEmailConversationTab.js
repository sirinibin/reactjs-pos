import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import EmailDetailModal from './EmailDetailModal.js';
import RFQCreate from '../rfq_received/create.js';
import { ExtractModal } from './ProcurementEmailsTab.js';
import { ForwardDetail } from '../rfq_received/index.js';

const EMAIL_ACCENT = '#1a73e8';
const EMAIL_BG    = '#f1f3f4';

function extractEmail(str) {
    if (!str) return '';
    // Decode HTML entities (&lt; → <, &gt; → >, &amp; → &)
    const decoded = str.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"');
    const m = decoded.match(/<([^>@\s]+@[^>]+)>/);
    if (m) return m[1].trim().toLowerCase();
    const m2 = decoded.match(/[A-Za-z0-9._%+\-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/); // eslint-disable-line no-useless-escape
    return m2 ? m2[0].toLowerCase() : '';
}

function stripHtml(html) {
    if (!html) return '';
    // Remove style/script blocks entirely, then strip remaining tags
    return html
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

export default function ProcurementEmailConversationTab({ storeId, initialEmail: initialEmailProp }) {
    const { t } = useTranslation();
    const token = localStorage.getItem('access_token');
    const history = useHistory();

    // ── Thread list ─────────────────────────────────────────────────────────
    const [threads, setThreads]               = useState([]);
    const [threadsLoading, setThreadsLoading] = useState(false);
    const [threadSearch, setThreadSearch]     = useState('');
    const [selectedThread, setSelectedThread] = useState(null);

    // ── Thread messages ──────────────────────────────────────────────────────
    const [threadMessages, setThreadMessages]       = useState([]);
    const [threadMsgLoading, setThreadMsgLoading]   = useState(false);

    // ── Reply compose ────────────────────────────────────────────────────────
    const [replyText, setReplyText]             = useState('');
    const [replySubject, setReplySubject]       = useState('');
    const [replyAttachments, setReplyAttachments] = useState([]);
    const attachInputRef                         = useRef(null);
    const [replying, setReplying]               = useState(false);
    const [translatingReply, setTranslatingReply] = useState(false);
    const [replyStatus, setReplyStatus]         = useState(null);
    const [replyToMsg, setReplyToMsg]           = useState(null); // specific message being replied to
    const replyComposeRef                        = useRef(null);

    // ── Email detail modal ───────────────────────────────────────────────────
    const [detailMsg, setDetailMsg]   = useState(null);
    const [detailOpen, setDetailOpen] = useState(false);

    // ── RFQ create / extract ─────────────────────────────────────────────────
    const rfqCreateRef = useRef(null);
    const [extractMsg, setExtractMsg] = useState(null);
    const [rfqDetail, setRfqDetail] = useState(null);
    const [toast, setToast]       = useState(null);
    const toastTimer              = useRef(null);

    // ── Forward compose ──────────────────────────────────────────────────────
    const [forwardMsg, setForwardMsg]         = useState(null);
    const [forwardTo, setForwardTo]           = useState('');
    const [forwardSubject, setForwardSubject] = useState('');
    const [forwardBody, setForwardBody]       = useState('');
    const [forwarding, setForwarding]         = useState(false);

    // ── RFQ history modal ────────────────────────────────────────────────────
    const [rfqHistoryMsg, setRfqHistoryMsg]       = useState(null);
    const [rfqHistory, setRfqHistory]             = useState(null);
    const [rfqHistoryLoading, setRfqHistoryLoading] = useState(false);
    const [rfqHistoryTab, setRfqHistoryTab]       = useState('customer');

    // ── Resolve senders ──────────────────────────────────────────────────────
    const [resolvingSenders, setResolvingSenders] = useState(false);

    // ── Per-message actions ───────────────────────────────────────────────────
    const [copiedMsgId, setCopiedMsgId]         = useState(null);
    const [deletingMsgId, setDeletingMsgId]     = useState(null);
    const [translations, setTranslations]       = useState({});

    // ── Delete conversation (admin only) ──────────────────────────────────────
    const [deletingThread, setDeletingThread]   = useState(false);
    const isAdmin = localStorage.getItem('user_role') === 'Admin';

    const deleteThread = async () => {
        if (!selectedThread) return;
        const contact = selectedThread.contact_phone;
        if (!window.confirm(t('Delete ALL emails in this conversation? This cannot be undone.'))) return;
        setDeletingThread(true);
        try {
            const params = new URLSearchParams({ store_id: storeId, contact, type: 'email' });
            const res = await fetch(`/v1/procurement-messages/thread?${params}`, {
                method: 'DELETE', headers: { Authorization: token },
            });
            const data = await res.json();
            if (res.ok) {
                loadThreads('', true);
                setSelectedThread(null);
                setThreadMessages([]);
            } else {
                alert(data.error || t('Failed to delete conversation'));
            }
        } catch (_) { alert(t('Network error')); }
        setDeletingThread(false);
    };

    const copyMsg = (msgId, text) => {
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            setCopiedMsgId(msgId);
            setTimeout(() => setCopiedMsgId(id => id === msgId ? null : id), 1500);
        });
    };

    const translateMsg = async (msgId, text) => {
        if (!text) return;
        setTranslations(prev => ({ ...prev, [msgId]: { loading: true } }));
        try {
            const res = await fetch('/v1/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: token },
                body: JSON.stringify({ text, target: 'en' }),
            });
            const data = await res.json();
            setTranslations(prev => ({ ...prev, [msgId]: { loading: false, text: data.translatedText || '' } }));
        } catch (_) {
            setTranslations(prev => ({ ...prev, [msgId]: { loading: false, error: true } }));
        }
    };

    const deleteMsg = async (msgId) => {
        if (!window.confirm(t('Confirm delete this message?'))) return;
        setDeletingMsgId(msgId);
        try {
            await fetch(`/v1/procurement-messages/${msgId}`, { method: 'DELETE', headers: { Authorization: token } });
            setThreadMessages(prev => prev.filter(m => m.id !== msgId));
            loadThreads('', true);
        } finally { setDeletingMsgId(null); }
    };

    const handleForward = async () => {
        if (!forwardTo.trim() || !forwardMsg) return;
        setForwarding(true);
        try {
            const fd = new FormData();
            fd.append('body', forwardBody || '(forwarded)');
            fd.append('subject', forwardSubject);
            fd.append('to', forwardTo.trim());
            const res = await fetch(`/v1/procurement-messages/${forwardMsg.id}/email-reply`, {
                method: 'POST', headers: { Authorization: token }, body: fd,
            });
            const data = await res.json();
            if (res.ok && !data.error) {
                setForwardMsg(null); setForwardTo(''); setForwardBody(''); setForwardSubject('');
                showToast(t('Email forwarded'));
                loadThread(selectedThread.contact_phone, true);
            } else {
                showToast(data.error || t('Failed to forward'), 'danger');
            }
        } catch (_) { showToast(t('Network error'), 'danger'); }
        setForwarding(false);
    };

    const openRfqHistory = async (email) => {
        setRfqHistoryMsg(true);
        setRfqHistory(null);
        setRfqHistoryLoading(true);
        setRfqHistoryTab(selectedThread?.sender_type === 'supplier' ? 'supplier' : 'customer');
        if (!email) { setRfqHistoryLoading(false); setRfqHistory({ customer_rfqs: [], supplier_rfqs: [] }); return; }
        try {
            const params = new URLSearchParams({ store_id: storeId, email });
            const res = await fetch(`/v1/procurement-rfq-history?${params}`, { headers: { Authorization: token } });
            const data = await res.json();
            setRfqHistory(data);
        } catch (_) { setRfqHistory({ customer_rfqs: [], supplier_rfqs: [] }); }
        setRfqHistoryLoading(false);
    };

    const handleResolveSenders = async () => {
        setResolvingSenders(true);
        try {
            const res = await fetch(`/v1/procurement-messages/resolve-senders?store_id=${storeId}`, {
                method: 'POST', headers: { Authorization: token },
            });
            const data = await res.json();
            showToast(`Names resolved: ${data.updated || 0} updated`);
            loadThreads('', true);
        } catch (_) { showToast(t('Failed to resolve names'), 'danger'); }
        setResolvingSenders(false);
    };

    // ── Misc ─────────────────────────────────────────────────────────────────
    const chatContainerRef = useRef(null);
    const searchTimeout    = useRef(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [mobilePanel, setMobilePanel] = useState('threads');

    useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    const showToast = (msg, type = 'success') => {
        clearTimeout(toastTimer.current);
        setToast({ msg, type });
        toastTimer.current = setTimeout(() => setToast(null), 4000);
    };

    // ── Load thread list ──────────────────────────────────────────────────────
    const loadThreads = useCallback(async (q = threadSearch, silent = false) => {
        if (!storeId) return;
        if (!silent) setThreadsLoading(true);
        try {
            const params = new URLSearchParams({ store_id: storeId, type: 'email', limit: 80 });
            if (q) params.set('search', q);
            const res = await fetch(`/v1/procurement-message-threads?${params}`, { headers: { Authorization: token } });
            const data = await res.json();
            setThreads(data.threads || []);
        } catch (_) {}
        if (!silent) setThreadsLoading(false);
    }, [storeId, token, threadSearch]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { loadThreads(); }, [storeId]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Auto-refresh (polling) ────────────────────────────────────────────────
    const lastThreadDatesRef   = useRef({}); // contactPhone → last_message_date string
    const lastMsgCountRef      = useRef(0);  // message count in open thread

    useEffect(() => {
        if (!storeId) return;
        const POLL_MS = 15000;

        const pollThreads = async () => {
            try {
                const params = new URLSearchParams({ store_id: storeId, type: 'email', limit: 80 });
                const res = await fetch(`/v1/procurement-message-threads?${params}`, { headers: { Authorization: token } });
                const data = await res.json();
                const incoming = data.threads || [];

                // Detect if any thread has a newer last_message_date than what we know
                let anyNew = false;
                incoming.forEach(th => {
                    const prev = lastThreadDatesRef.current[th.contact_phone];
                    if (prev && th.last_message_date && th.last_message_date > prev) anyNew = true;
                    lastThreadDatesRef.current[th.contact_phone] = th.last_message_date;
                });
                // Also detect brand-new threads
                if (incoming.length > Object.keys(lastThreadDatesRef.current).length) anyNew = true;

                setThreads(incoming);
                if (anyNew) showToast('New email received', 'info');
            } catch (_) {}
        };

        // Initialise ref on first load
        const initRef = async () => {
            try {
                const params = new URLSearchParams({ store_id: storeId, type: 'email', limit: 80 });
                const res = await fetch(`/v1/procurement-message-threads?${params}`, { headers: { Authorization: token } });
                const data = await res.json();
                (data.threads || []).forEach(th => {
                    lastThreadDatesRef.current[th.contact_phone] = th.last_message_date;
                });
            } catch (_) {}
        };
        initRef();

        const id = setInterval(pollThreads, POLL_MS);
        return () => clearInterval(id);
    }, [storeId, token]); // eslint-disable-line react-hooks/exhaustive-deps

    // Poll the open conversation for new messages
    useEffect(() => {
        if (!storeId || !selectedThread) return;
        const POLL_MS = 15000;

        const pollConversation = async () => {
            try {
                const params = new URLSearchParams({ store_id: storeId, type: 'email', limit: 100 });
                const res = await fetch(
                    `/v1/procurement-message-threads/${encodeURIComponent(selectedThread.contact_phone)}?${params}`,
                    { headers: { Authorization: token } }
                );
                const data = await res.json();
                const msgs = data.messages || [];
                if (msgs.length > lastMsgCountRef.current && lastMsgCountRef.current > 0) {
                    setThreadMessages(msgs);
                    setThreads(prev => prev.map(t =>
                        t.contact_phone === selectedThread.contact_phone ? { ...t, unread_count: 0 } : t
                    ));
                } else if (lastMsgCountRef.current === 0) {
                    // first load — just sync the count
                }
                lastMsgCountRef.current = msgs.length;
            } catch (_) {}
        };

        lastMsgCountRef.current = 0; // reset on thread change
        const id = setInterval(pollConversation, POLL_MS);
        return () => clearInterval(id);
    }, [storeId, token, selectedThread]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Pin / unpin ──────────────────────────────────────────────────────────
    const togglePin = useCallback(async (th) => {
        const method = th.pinned ? 'DELETE' : 'POST';
        try {
            await fetch(`/v1/procurement-message-threads/${encodeURIComponent(th.contact_phone)}/pin?store_id=${storeId}&type=email`, {
                method, headers: { Authorization: token },
            });
            loadThreads('', true);
        } catch (_) {}
    }, [storeId, token, loadThreads]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Load thread messages ──────────────────────────────────────────────────
    const loadThread = useCallback(async (contactEmail, silent = false) => {
        if (!storeId || !contactEmail) return;
        if (!silent) setThreadMsgLoading(true);
        try {
            const params = new URLSearchParams({ store_id: storeId, type: 'email', limit: 100 });
            const res = await fetch(
                `/v1/procurement-message-threads/${encodeURIComponent(contactEmail)}?${params}`,
                { headers: { Authorization: token } }
            );
            const data = await res.json();
            setThreadMessages(data.messages || []);
            // Clear unread badge
            setThreads(prev => prev.map(t => t.contact_phone === contactEmail ? { ...t, unread_count: 0 } : t));
        } catch (_) {}
        if (!silent) setThreadMsgLoading(false);
    }, [storeId, token]); // eslint-disable-line react-hooks/exhaustive-deps

    // Auto-select thread when initialEmail prop is provided (e.g. opened from a modal)
    const initialEmailRef = useRef(initialEmailProp || '');
    useEffect(() => {
        const email = initialEmailRef.current;
        if (!email || !threads.length) return;
        const found = threads.find(t =>
            t.contact_phone === email || (t.contact_phone || '').toLowerCase() === email.toLowerCase()
        );
        const thread = found || { contact_phone: email, contact_name: email };
        setSelectedThread(thread);
        loadThread(email);
        initialEmailRef.current = '';
    }, [threads]); // eslint-disable-line react-hooks/exhaustive-deps

    // Auto-scroll to bottom when messages load
    useEffect(() => {
        if (!threadMsgLoading && chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [threadMsgLoading, threadMessages]);

    // Switch to chat panel on mobile after selecting a thread
    useEffect(() => {
        if (selectedThread && isMobile) setMobilePanel('chat');
    }, [selectedThread, isMobile]);

    // ── Reply ────────────────────────────────────────────────────────────────
    const buildSubject = (base) => {
        const s = (base || '').trim();
        return /^re:/i.test(s) ? s : 'Re: ' + s;
    };

    const openReplyTo = (msg) => {
        setReplyToMsg(msg);
        setReplySubject(buildSubject(msg.subject));
        setReplyStatus(null);
        setTimeout(() => replyComposeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
    };

    const translateReply = async () => {
        if (!replyText.trim()) return;
        setTranslatingReply(true);
        try {
            const res = await fetch('/v1/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: token },
                body: JSON.stringify({ text: replyText, target: 'ar' }),
            });
            const data = await res.json();
            if (data?.translatedText) setReplyText(data.translatedText);
        } catch (_) {}
        setTranslatingReply(false);
    };

    const handleReply = async () => {
        if (!replyText.trim()) return;
        // Use the explicitly selected message, or fall back to last inbound → most recent
        const msgs = [...threadMessages].reverse();
        const refMsg = replyToMsg || msgs.find(m => m.direction === 'in') || msgs[0];
        if (!refMsg) return;
        // Reply-to address: for inbound use msg.from; for outbound use msg.to[0]
        const toAddr = refMsg.direction === 'out'
            ? extractEmail((refMsg.to && refMsg.to[0]) || '') || extractEmail(selectedThread.contact_phone)
            : extractEmail(refMsg.from || '') || extractEmail(selectedThread.contact_phone) || selectedThread.contact_phone;
        setReplying(true);
        setReplyStatus(null);
        try {
            const fd = new FormData();
            fd.append('body', replyText);
            fd.append('subject', replySubject || buildSubject(refMsg.subject));
            fd.append('to', toAddr);
            fd.append('store_id', storeId);
            replyAttachments.forEach(f => fd.append('files', f, f.name));
            const res = await fetch(`/v1/procurement-messages/${refMsg.id}/email-reply`, {
                method: 'POST',
                headers: { Authorization: token },
                body: fd,
            });
            const data = await res.json();
            if (res.ok && !data.error) {
                setReplyText('');
                setReplySubject('');
                setReplyAttachments([]);
                setReplyToMsg(null);
                setReplyStatus({ ok: true, msg: t('Reply sent') });
                loadThread(selectedThread.contact_phone, true);
                loadThreads('', true);
            } else {
                setReplyStatus({ ok: false, msg: data.error || t('Failed to send reply') });
            }
        } catch (_) {
            setReplyStatus({ ok: false, msg: t('Network error') });
        }
        setReplying(false);
    };

    // ── Open full detail modal ────────────────────────────────────────────────
    const openDetail = async (msgId) => {
        try {
            const res = await fetch(`/v1/procurement-messages/${msgId}?store_id=${storeId}`, { headers: { Authorization: token } });
            const data = await res.json();
            if (data?.id) { setDetailMsg(data); setDetailOpen(true); }
        } catch (_) {}
    };


    // ── Helpers ──────────────────────────────────────────────────────────────
    const formatDate = d => {
        if (!d) return '';
        const dt = new Date(d);
        const today = new Date();
        const isToday = dt.toDateString() === today.toDateString();
        return isToday
            ? dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : dt.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    const senderLabel = th => th.sender_name || th.contact_phone;

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div style={{ position: 'relative' }}>
            {/* Toast */}
            {toast && (
                <div className={`alert alert-${toast.type} py-2 px-3`}
                    style={{ position: 'fixed', top: 16, right: 16, zIndex: 9999, fontSize: '13px', minWidth: '220px', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                    {toast.msg}
                </div>
            )}

            <div style={{ display: 'flex', border: '1px solid #dee2e6', borderRadius: '8px', overflow: 'hidden', height: isMobile ? 'calc(100vh - 200px)' : 'calc(100vh - 280px)', minHeight: '400px', background: EMAIL_BG }}>

                {/* ── Left: thread list ───────────────────────────────────── */}
                <div style={{ width: isMobile ? '100%' : '290px', minWidth: isMobile ? undefined : '220px', borderRight: isMobile ? 'none' : '1px solid #dee2e6', background: '#fff', display: (isMobile && mobilePanel === 'chat') ? 'none' : 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '10px', borderBottom: '1px solid #dee2e6', background: '#f8f9fa' }}>
                        <input
                            className="form-control form-control-sm mb-1"
                            placeholder={t('Search by email address...')}
                            value={threadSearch}
                            onChange={e => {
                                setThreadSearch(e.target.value);
                                clearTimeout(searchTimeout.current);
                                searchTimeout.current = setTimeout(() => loadThreads(e.target.value), 350);
                            }}
                        />
                        <button
                            onClick={handleResolveSenders}
                            disabled={resolvingSenders}
                            className="btn btn-outline-secondary btn-sm w-100"
                            style={{ fontSize: '11px' }}
                            title="Backfill sender names for all threads"
                        >
                            {resolvingSenders
                                ? <span className="spinner-border spinner-border-sm me-1" />
                                : <i className="bi bi-person-check me-1"></i>}
                            Resolve Names
                        </button>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {threadsLoading && <div className="text-center py-3"><span className="spinner-border spinner-border-sm text-primary" /></div>}
                        {!threadsLoading && threads.length === 0 && (
                            <div style={{ padding: '24px', textAlign: 'center', color: '#6c757d', fontSize: '13px' }}>
                                <i className="bi bi-envelope fs-4 d-block mb-2"></i>{t('No email conversations yet')}
                            </div>
                        )}
                        {threads.map(th => (
                            <div
                                key={th.contact_phone}
                                onClick={() => { setSelectedThread(th); loadThread(th.contact_phone); setReplyText(''); setReplyStatus(null); setReplyToMsg(null); }}
                                style={{
                                    padding: '10px 12px', borderBottom: '1px solid #f0f0f0', cursor: 'pointer',
                                    background: selectedThread?.contact_phone === th.contact_phone ? '#e8f0fe' : th.pinned ? '#fffde7' : '#fff',
                                    borderLeft: selectedThread?.contact_phone === th.contact_phone ? `3px solid ${EMAIL_ACCENT}` : th.pinned ? '3px solid #f9a825' : '3px solid transparent',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ overflow: 'hidden', flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            {th.pinned && <i className="bi bi-pin-fill" style={{ color: '#f9a825', fontSize: '11px', flexShrink: 0 }}></i>}
                                            <i className="bi bi-envelope me-1" style={{ color: EMAIL_ACCENT }}></i>
                                            {senderLabel(th)}
                                        </div>
                                        {th.sender_name && (
                                            <div style={{ fontSize: '10px', color: '#6c757d', marginTop: '1px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <span className={`badge ${th.sender_type === 'supplier' ? 'bg-warning text-dark' : 'bg-primary'}`} style={{ fontSize: '9px' }}>
                                                    {th.sender_type === 'supplier' ? <i className="bi bi-truck me-1"></i> : <i className="bi bi-person me-1"></i>}
                                                    {th.sender_type === 'supplier' ? t('Supplier') : t('Customer')}
                                                </span>
                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{th.contact_phone}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', marginLeft: '4px' }}>
                                        <span style={{ fontSize: '10px', color: '#6c757d', whiteSpace: 'nowrap' }}>
                                            {th.last_message_date ? formatDate(th.last_message_date) : ''}
                                        </span>
                                        <button
                                            onClick={e => { e.stopPropagation(); togglePin(th); }}
                                            title={th.pinned ? t('Unpin') : t('Pin conversation')}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0', color: th.pinned ? '#f9a825' : '#ccc', fontSize: '12px', lineHeight: 1 }}
                                        >
                                            <i className={`bi ${th.pinned ? 'bi-pin-fill' : 'bi-pin'}`}></i>
                                        </button>
                                        {th.unread_count > 0 && (
                                            <span className="badge rounded-pill" style={{ background: EMAIL_ACCENT, fontSize: '10px', minWidth: '20px' }}>{th.unread_count}</span>
                                        )}
                                    </div>
                                </div>
                                <div style={{ fontSize: '11px', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '3px' }}>
                                    {stripHtml(th.last_message_text) || t('(no content)')}
                                </div>
                                <div style={{ fontSize: '10px', color: '#aaa', marginTop: '1px' }}>{th.message_count} {t('email(s)')}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Right: conversation ─────────────────────────────────── */}
                <div style={{ flex: 1, display: (isMobile && mobilePanel === 'threads') ? 'none' : 'flex', flexDirection: 'column', background: EMAIL_BG }}>
                    {!selectedThread ? (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6c757d', fontSize: '14px' }}>
                            <div style={{ textAlign: 'center' }}>
                                <i className="bi bi-envelope fs-1 d-block mb-3" style={{ color: EMAIL_ACCENT, opacity: 0.4 }}></i>
                                {t('Select a conversation to view emails')}
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Conversation header */}
                            <div style={{ background: '#1558b0', color: '#fff', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                                {isMobile && (
                                    <button onClick={() => setMobilePanel('threads')} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '0 4px' }}>
                                        <i className="bi bi-arrow-left"></i>
                                    </button>
                                )}
                                <div style={{ flex: 1, overflow: 'hidden' }}>
                                    <div style={{ fontWeight: 600, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        <i className="bi bi-envelope me-2"></i>
                                        {senderLabel(selectedThread)}
                                    </div>
                                    <div style={{ fontSize: '11px', opacity: 0.8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {selectedThread.contact_phone}
                                        {selectedThread.sender_name && selectedThread.sender_name !== selectedThread.contact_phone && (
                                            <span className={`badge ms-2 ${selectedThread.sender_type === 'supplier' ? 'bg-warning text-dark' : 'bg-light text-dark'}`} style={{ fontSize: '9px' }}>
                                                {selectedThread.sender_type === 'supplier' ? t('Supplier') : t('Customer')}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => openRfqHistory(selectedThread.contact_phone)}
                                    style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', cursor: 'pointer', padding: '5px 10px', borderRadius: '6px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}
                                    title="View linked RFQs for this contact"
                                >
                                    {selectedThread.sender_type === 'supplier'
                                        ? <><i className="bi bi-truck me-1"></i>Supplier RFQs</>
                                        : selectedThread.sender_type === 'customer'
                                        ? <><i className="bi bi-person me-1"></i>Customer RFQs</>
                                        : <><i className="bi bi-clock-history me-1"></i>RFQ History</>
                                    }
                                    {rfqHistory && (() => {
                                        const count = selectedThread.sender_type === 'supplier'
                                            ? (rfqHistory.supplier_rfqs || []).length
                                            : (rfqHistory.customer_rfqs || []).length;
                                        return count > 0 ? <span style={{ background: '#fff', color: '#1558b0', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700 }}>{count}</span> : null;
                                    })()}
                                </button>
                                <button
                                    onClick={() => loadThread(selectedThread.contact_phone, false)}
                                    style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px 8px', borderRadius: '4px', opacity: 0.85 }}
                                    title={t('Refresh')}
                                >
                                    <i className="bi bi-arrow-clockwise"></i>
                                </button>
                                {isAdmin && (
                                    <button
                                        onClick={deleteThread}
                                        disabled={deletingThread}
                                        style={{ background: 'rgba(220,53,69,0.85)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', cursor: 'pointer', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}
                                        title={t('Delete entire conversation (admin only)')}
                                    >
                                        {deletingThread
                                            ? <span className="spinner-border spinner-border-sm" style={{ width: '12px', height: '12px' }} />
                                            : <><i className="bi bi-trash3-fill"></i><span style={{ fontSize: '11px' }}>{t('Delete')}</span></>
                                        }
                                    </button>
                                )}
                            </div>

                            {/* Messages area */}
                            <div ref={chatContainerRef} style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {threadMsgLoading && <div className="text-center py-4"><span className="spinner-border spinner-border-sm text-primary" /></div>}
                                {!threadMsgLoading && threadMessages.length === 0 && (
                                    <div style={{ textAlign: 'center', color: '#6c757d', fontSize: '13px', padding: '32px 0' }}>
                                        {t('No emails in this conversation')}
                                    </div>
                                )}
                                {!threadMsgLoading && threadMessages.map(msg => {
                                    const isOut = msg.direction === 'out';
                                    const isDeleting = deletingMsgId === msg.id;
                                    const isCopied = copiedMsgId === msg.id;
                                    const trans = translations[msg.id];
                                    const bodyText = stripHtml(msg.body_text || '');

                                    const isReply = /^re:/i.test(msg.subject || '');

                                    return (
                                        <div key={msg.id}
                                            style={{ opacity: isDeleting ? 0.4 : 1, transition: 'opacity 0.2s', display: 'flex', flexDirection: 'column', alignItems: isOut ? 'flex-end' : 'flex-start' }}
                                        >
                                            {/* Sender label above bubble */}
                                            <div style={{ fontSize: '11px', color: '#888', marginBottom: '3px', paddingLeft: isOut ? 0 : '4px', paddingRight: isOut ? '4px' : 0 }}>
                                                {isOut
                                                    ? <><i className="bi bi-send-fill me-1" style={{ color: '#198754' }}></i><span style={{ color: '#198754', fontWeight: 600 }}>{isReply ? t('You replied') : t('You sent')}</span></>
                                                    : <><i className="bi bi-envelope-arrow-down-fill me-1" style={{ color: '#1a73e8' }}></i><span style={{ color: '#1a73e8', fontWeight: 600 }}>{msg.from || t('Received')}</span></>
                                                }
                                            </div>

                                            {/* Bubble card — max 82% width, aligned left or right */}
                                            <div style={{
                                                maxWidth: '82%',
                                                width: 'fit-content',
                                                background: isOut ? '#dcf8c6' : '#fff',
                                                border: isOut ? '1px solid #b2dfa0' : '1px solid #dadce0',
                                                borderRadius: isOut ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                                                boxShadow: '0 1px 3px rgba(0,0,0,0.10)',
                                                overflow: 'hidden',
                                                minWidth: '220px',
                                            }}>
                                                {/* Bubble header: subject + date */}
                                                <div style={{ background: isOut ? '#c8f0ae' : '#f0f4ff', padding: '8px 14px', borderBottom: isOut ? '1px solid #b2dfa0' : '1px solid #d8e4ff' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0, flex: 1 }}>
                                                            {msg.code && (
                                                                <span style={{ fontFamily: 'monospace', fontSize: '10px', fontWeight: 700, color: '#1a73e8', background: '#e8f0fe', border: '1px solid #c8d8f5', borderRadius: '4px', padding: '0 5px', flexShrink: 0 }}>
                                                                    {msg.code}
                                                                </span>
                                                            )}
                                                            <span style={{ fontWeight: 600, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#202124' }} title={msg.subject}>
                                                                {msg.subject || t('(no subject)')}
                                                            </span>
                                                        </div>
                                                        <span style={{ fontSize: '11px', color: '#5f6368', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                                            {msg.message_date ? new Date(msg.message_date).toLocaleString() : ''}
                                                        </span>
                                                    </div>
                                                    {/* To field for sent messages */}
                                                    {isOut && (msg.to || []).length > 0 && (
                                                        <div style={{ fontSize: '11px', color: '#5f6368', marginTop: '4px' }}>
                                                            <span style={{ fontWeight: 600 }}>{t('To')}: </span>{(msg.to || []).join(', ')}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Email body */}
                                                <div style={{ padding: '12px 16px', fontSize: '14px', lineHeight: '1.6', color: '#202124', maxHeight: '500px', overflowY: 'auto' }}>
                                                    {msg.body_html ? (
                                                        <div dangerouslySetInnerHTML={{ __html: msg.body_html }} />
                                                    ) : (
                                                        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, fontFamily: 'inherit', fontSize: '14px' }}>
                                                            {bodyText || <span style={{ color: '#9aa0a6' }}>{t('(empty body)')}</span>}
                                                        </pre>
                                                    )}
                                                </div>

                                                {/* Inline translation */}
                                                {trans?.text && (
                                                    <div style={{ margin: '0 16px 10px', paddingTop: '8px', borderTop: '1px solid #e8eaed', color: '#1e40af', fontSize: '13px' }}>
                                                        <span style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '4px' }}><i className="bi bi-translate me-1"></i>{t('English translation')}</span>
                                                        {trans.text}
                                                    </div>
                                                )}
                                                {trans?.error && <div style={{ margin: '0 16px 8px', fontSize: '12px', color: '#dc3545' }}>{t('Translation failed')}</div>}

                                                {/* Attachments */}
                                                {(msg.attachments || []).length > 0 && (
                                                    <div style={{ padding: '10px 16px', borderTop: '1px solid #e8eaed' }}>
                                                        <div style={{ fontSize: '11px', color: '#5f6368', fontWeight: 500, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                                            <i className="bi bi-paperclip me-1"></i>
                                                            {msg.attachments.length} {t('Attachment')}{msg.attachments.length !== 1 ? 's' : ''}
                                                        </div>
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                            {msg.attachments.map((att, ai) => {
                                                                const isImg = att.content_type?.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(att.filename || '');
                                                                const isPDF = att.content_type === 'application/pdf' || /\.pdf$/i.test(att.filename || '');
                                                                const isXls = /\.(xlsx?|csv)$/i.test(att.filename || '');
                                                                const icon  = isPDF ? 'bi-file-earmark-pdf text-danger' : isImg ? 'bi-file-earmark-image text-primary' : isXls ? 'bi-file-earmark-excel text-success' : 'bi-file-earmark text-secondary';
                                                                if (isImg && att.url) {
                                                                    return (
                                                                        <div key={ai} style={{ border: '1px solid #dadce0', borderRadius: '8px', overflow: 'hidden', background: '#f0f0f0', maxWidth: '200px' }}>
                                                                            <img src={att.url} alt={att.filename || `Attachment ${ai + 1}`} style={{ display: 'block', maxWidth: '200px', maxHeight: '150px', objectFit: 'contain' }} />
                                                                            <div style={{ padding: '5px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                                                                                <span style={{ fontSize: '11px', color: '#5f6368', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.filename}</span>
                                                                                <a href={att.url} target="_blank" rel="noreferrer" download={att.filename} className="btn btn-sm btn-outline-secondary" style={{ padding: '1px 6px', fontSize: '11px', flexShrink: 0 }}>
                                                                                    <i className="bi bi-download"></i>
                                                                                </a>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                }
                                                                return (
                                                                    <div key={ai} style={{ border: '1px solid #dadce0', borderRadius: '8px', padding: '8px 12px', minWidth: '140px', maxWidth: '210px', background: '#f8f9fa', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                            <i className={`bi ${icon}`} style={{ fontSize: '20px', flexShrink: 0 }}></i>
                                                                            <div style={{ overflow: 'hidden' }}>
                                                                                <div style={{ fontSize: '12px', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{att.filename || `Attachment ${ai + 1}`}</div>
                                                                                {att.size > 0 && <div style={{ fontSize: '11px', color: '#5f6368' }}>{(att.size / 1024).toFixed(0)} KB</div>}
                                                                            </div>
                                                                        </div>
                                                                        {att.url && (
                                                                            <a href={att.url} target="_blank" rel="noreferrer" download={att.filename} className="btn btn-sm btn-outline-secondary" style={{ padding: '2px 8px', fontSize: '11px', alignSelf: 'flex-start' }}>
                                                                                <i className="bi bi-download me-1"></i>Download
                                                                            </a>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Action bar */}
                                                <div style={{ padding: '6px 12px 8px', borderTop: '1px solid #e8eaed', display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center', background: isOut ? '#d5f0be' : '#f8f9fa', justifyContent: isOut ? 'flex-end' : 'flex-start' }}>
                                                    <button onClick={() => openReplyTo(msg)} className="btn btn-sm btn-outline-success" style={{ fontSize: '11px', padding: '2px 8px' }} title={t('Reply')}>
                                                        <i className="bi bi-reply me-1"></i>{t('Reply')}
                                                    </button>
                                                    <button onClick={e => { e.stopPropagation(); setForwardMsg(msg); setForwardSubject(/^fwd:/i.test(msg.subject || '') ? msg.subject : 'Fwd: ' + (msg.subject || '')); setForwardTo(''); setForwardBody(''); }}
                                                        className="btn btn-sm btn-outline-secondary" style={{ fontSize: '11px', padding: '2px 8px' }}>
                                                        <i className="bi bi-forward me-1"></i>{t('Forward')}
                                                    </button>
                                                    {msg.direction === 'in' && !msg.processed_as_rfq && (
                                                        <button onClick={() => setExtractMsg(msg)} className="btn btn-sm btn-outline-primary" style={{ fontSize: '11px', padding: '2px 8px' }}>
                                                            <i className="bi bi-magic me-1"></i>{t('Extract')}
                                                        </button>
                                                    )}
                                                    {msg.rfq_received_code && (
                                                        <button
                                                            className="btn btn-sm"
                                                            style={{ fontFamily: 'monospace', fontSize: '10px', background: '#e6f4ed', border: '1px solid #b2dfcb', borderRadius: '4px', padding: '2px 6px', color: '#0a7c42' }}
                                                            title="View RFQ details"
                                                            onClick={async e => {
                                                                e.stopPropagation();
                                                                if (!msg.rfq_received_id) return;
                                                                const tok = localStorage.getItem('access_token');
                                                                const stId = localStorage.getItem('store_id');
                                                                try {
                                                                    const res = await fetch(`/v1/rfq-received/${msg.rfq_received_id}?store_id=${stId}`, { headers: { Authorization: tok } });
                                                                    const data = await res.json();
                                                                    if (data?.id) setRfqDetail(data);
                                                                } catch (_) {}
                                                            }}
                                                        >
                                                            <i className="bi bi-link me-1"></i>{msg.rfq_received_code}
                                                        </button>
                                                    )}
                                                    <button onClick={e => { e.stopPropagation(); openDetail(msg.id); }} className="btn btn-sm btn-outline-primary" style={{ fontSize: '11px', padding: '2px 6px' }} title={t('View full email')}>
                                                        <i className="bi bi-eye me-1"></i>{t('View')}
                                                    </button>
                                                    {bodyText && (
                                                        <button onClick={e => { e.stopPropagation(); copyMsg(msg.id, bodyText); }} className="btn btn-sm btn-outline-secondary" style={{ fontSize: '11px', padding: '2px 6px' }} title={t('Copy')}>
                                                            <i className={`bi ${isCopied ? 'bi-check2' : 'bi-clipboard'}`}></i>
                                                        </button>
                                                    )}
                                                    {bodyText && (
                                                        <button onClick={e => { e.stopPropagation(); translateMsg(msg.id, bodyText); }} disabled={trans?.loading} className="btn btn-sm btn-outline-secondary" style={{ fontSize: '11px', padding: '2px 6px' }} title={t('Translate')}>
                                                            {trans?.loading ? <span className="spinner-border spinner-border-sm" style={{ width: '10px', height: '10px' }} /> : <i className="bi bi-translate"></i>}
                                                        </button>
                                                    )}
                                                    <button onClick={e => { e.stopPropagation(); deleteMsg(msg.id); }} disabled={isDeleting} className="btn btn-sm btn-outline-danger" style={{ fontSize: '11px', padding: '2px 6px' }} title={t('Delete')}>
                                                        {isDeleting ? <span className="spinner-border spinner-border-sm" style={{ width: '10px', height: '10px' }} /> : <i className="bi bi-trash3"></i>}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Reply compose */}
                            <div ref={replyComposeRef} style={{ borderTop: '1px solid #dee2e6', background: '#fff', padding: '10px 12px', flexShrink: 0 }}>
                                {/* Replying-to banner */}
                                {replyToMsg && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#e8f0fe', border: '1px solid #c6d0d7', borderRadius: '6px', padding: '5px 10px', marginBottom: '8px', fontSize: '12px' }}>
                                        <i className="bi bi-reply text-primary" style={{ flexShrink: 0 }}></i>
                                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#1558b0' }}>
                                            <strong>{t('Replying to')}:</strong> {replyToMsg.subject || '(no subject)'} — <span style={{ fontStyle: 'italic', color: '#555' }}>{replyToMsg.from || (replyToMsg.to && replyToMsg.to[0]) || ''}</span>
                                        </span>
                                        <button
                                            onClick={() => { setReplyToMsg(null); setReplySubject(''); }}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', padding: '0 2px', fontSize: '14px', lineHeight: 1, flexShrink: 0 }}
                                            title={t('Cancel — reply to latest message instead')}
                                        >×</button>
                                    </div>
                                )}
                                {replyStatus && (
                                    <div className={`alert alert-${replyStatus.ok ? 'success' : 'danger'} py-1 px-2 mb-2`} style={{ fontSize: '12px' }}>
                                        {replyStatus.msg}
                                    </div>
                                )}
                                <input
                                    className="form-control form-control-sm mb-1"
                                    placeholder={t('Subject (optional)')}
                                    value={replySubject}
                                    onChange={e => setReplySubject(e.target.value)}
                                    style={{ fontSize: '12px' }}
                                />
                                {/* Attached files — shown above textarea so they're always visible */}
                                {replyAttachments.length > 0 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '6px', padding: '6px 8px', background: '#f0f4ff', border: '1px solid #d0daf5', borderRadius: '6px' }}>
                                        {replyAttachments.map((f, i) => (
                                            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#e8f0fe', border: '1px solid #c6d0d7', borderRadius: '12px', padding: '2px 8px', fontSize: '11px' }}>
                                                <i className="bi bi-paperclip" style={{ fontSize: '10px' }}></i>
                                                {f.name}
                                                <span style={{ fontSize: '10px', color: '#888' }}>({(f.size / 1024).toFixed(0)} KB)</span>
                                                <button
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', lineHeight: 1, color: '#c0392b', fontWeight: 700 }}
                                                    title={t('Remove')}
                                                    onClick={() => setReplyAttachments(prev => prev.filter((_, j) => j !== i))}
                                                >×</button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                                    <textarea
                                        className="form-control"
                                        rows={2}
                                        placeholder={t('Write a reply...')}
                                        value={replyText}
                                        onChange={e => setReplyText(e.target.value)}
                                        style={{ fontSize: '13px', resize: 'none' }}
                                        onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleReply(); }}
                                    />
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <button
                                            onClick={handleReply}
                                            disabled={replying || !replyText.trim()}
                                            className="btn btn-primary btn-sm"
                                            style={{ height: '38px', minWidth: '60px', fontSize: '12px' }}
                                        >
                                            {replying ? <span className="spinner-border spinner-border-sm" /> : <><i className="bi bi-send me-1"></i>{t('Send')}</>}
                                        </button>
                                        <button
                                            className="btn btn-outline-primary btn-sm"
                                            title={t('Translate to Arabic')}
                                            disabled={!replyText.trim() || translatingReply}
                                            style={{ height: '38px', fontSize: '12px' }}
                                            onClick={translateReply}
                                        >
                                            {translatingReply
                                                ? <span className="spinner-border spinner-border-sm" />
                                                : <><i className="bi bi-translate me-1"></i>AR</>}
                                        </button>
                                        <button
                                            className="btn btn-outline-secondary btn-sm position-relative"
                                            title={t('Attach files')}
                                            style={{ height: '38px', fontSize: '14px' }}
                                            onClick={() => attachInputRef.current?.click()}
                                        >
                                            <i className="bi bi-paperclip"></i>
                                            {replyAttachments.length > 0 && (
                                                <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#1558b0', color: '#fff', borderRadius: '50%', width: '16px', height: '16px', fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                                                    {replyAttachments.length}
                                                </span>
                                            )}
                                        </button>
                                        <input
                                            ref={attachInputRef}
                                            type="file"
                                            multiple
                                            style={{ display: 'none' }}
                                            onChange={e => {
                                                const files = Array.from(e.target.files || []);
                                                if (files.length > 0) setReplyAttachments(prev => [...prev, ...files]);
                                                e.target.value = '';
                                            }}
                                        />
                                    </div>
                                </div>
                                <div style={{ fontSize: '10px', color: '#aaa', marginTop: '3px' }}>Ctrl+Enter to send</div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Email detail modal */}
            <EmailDetailModal
                msg={detailMsg}
                show={detailOpen && !!detailMsg}
                onClose={() => setDetailOpen(false)}
                storeId={storeId}
                token={token}
                onExtract={msg => { setDetailOpen(false); setExtractMsg(msg); }}
                onDeleted={deletedId => {
                    setDetailOpen(false);
                    setThreadMessages(prev => prev.filter(m => m.id !== deletedId));
                    loadThreads('', true);
                }}
            />

            {/* Forward modal */}
            {forwardMsg && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: '#fff', borderRadius: '10px', width: '480px', maxWidth: '95vw', boxShadow: '0 8px 32px rgba(0,0,0,0.2)', padding: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                            <span style={{ fontWeight: 600, fontSize: '15px' }}><i className="bi bi-forward me-2 text-primary"></i>Forward Email</span>
                            <button onClick={() => setForwardMsg(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#6c757d' }}>×</button>
                        </div>
                        <div className="mb-2">
                            <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>To *</label>
                            <input className="form-control form-control-sm" type="email" placeholder="recipient@example.com" value={forwardTo} onChange={e => setForwardTo(e.target.value)} autoFocus />
                        </div>
                        <div className="mb-2">
                            <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Subject</label>
                            <input className="form-control form-control-sm" value={forwardSubject} onChange={e => setForwardSubject(e.target.value)} />
                        </div>
                        <div className="mb-2">
                            <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Message (optional)</label>
                            <textarea className="form-control" rows={2} style={{ fontSize: '12px', resize: 'none' }} placeholder="Add a note..." value={forwardBody} onChange={e => setForwardBody(e.target.value)} />
                        </div>
                        {forwardMsg.body_text && (
                            <div style={{ background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '6px', padding: '8px 10px', fontSize: '11px', color: '#555', maxHeight: '80px', overflowY: 'auto', marginBottom: '12px' }}>
                                <div style={{ fontWeight: 600, marginBottom: '4px', color: '#888' }}>— Original message —</div>
                                {stripHtml(forwardMsg.body_text).slice(0, 400)}
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setForwardMsg(null)} className="btn btn-outline-secondary btn-sm">Cancel</button>
                            <button onClick={handleForward} disabled={forwarding || !forwardTo.trim()} className="btn btn-primary btn-sm">
                                {forwarding ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="bi bi-forward me-1"></i>}
                                Forward
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* RFQ History modal */}
            {rfqHistoryMsg && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: '#fff', borderRadius: '10px', width: '560px', maxWidth: '95vw', maxHeight: '80vh', boxShadow: '0 8px 32px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid #dee2e6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 600, fontSize: '15px' }}><i className="bi bi-clock-history me-2 text-primary"></i>RFQ History</span>
                            <button onClick={() => { setRfqHistoryMsg(false); setRfqHistory(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#6c757d' }}>×</button>
                        </div>
                        {/* Tabs */}
                        <div style={{ display: 'flex', borderBottom: '1px solid #dee2e6', padding: '0 20px', gap: '4px' }}>
                            {['customer', 'supplier'].map(tab => (
                                <button key={tab} onClick={() => setRfqHistoryTab(tab)}
                                    style={{ background: 'none', border: 'none', borderBottom: rfqHistoryTab === tab ? '2px solid #1a73e8' : '2px solid transparent', padding: '8px 12px', fontSize: '12px', fontWeight: rfqHistoryTab === tab ? 600 : 400, color: rfqHistoryTab === tab ? '#1a73e8' : '#555', cursor: 'pointer' }}>
                                    {tab === 'customer' ? <><i className="bi bi-person me-1"></i>Customer RFQs</> : <><i className="bi bi-truck me-1"></i>Supplier RFQs</>}
                                    {rfqHistory && (
                                        <span className="badge ms-1" style={{ background: '#e8f0fe', color: '#1a73e8', fontSize: '10px' }}>
                                            {tab === 'customer' ? (rfqHistory.customer_rfqs || []).length : (rfqHistory.supplier_rfqs || []).length}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
                            {rfqHistoryLoading && <div className="text-center py-4"><span className="spinner-border spinner-border-sm text-primary" /></div>}
                            {!rfqHistoryLoading && rfqHistory && (() => {
                                const items = rfqHistoryTab === 'customer' ? (rfqHistory.customer_rfqs || []) : (rfqHistory.supplier_rfqs || []);
                                if (!items.length) return <div style={{ textAlign: 'center', color: '#6c757d', fontSize: '13px', padding: '24px' }}>No RFQs found</div>;
                                return items.map(rfq => (
                                    <div key={rfq.id} style={{ border: '1px solid #dee2e6', borderRadius: '8px', padding: '10px 12px', marginBottom: '8px', fontSize: '12px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1a73e8', background: '#e8f0fe', borderRadius: '4px', padding: '1px 6px' }}>{rfq.code}</span>
                                            <span className={`badge ${rfq.status === 'forwarded' ? 'bg-success' : rfq.status === 'failed' ? 'bg-danger' : 'bg-secondary'}`} style={{ fontSize: '10px' }}>{rfq.status}</span>
                                        </div>
                                        {rfq.customer_name && <div style={{ color: '#333' }}><i className="bi bi-person me-1 text-secondary"></i>{rfq.customer_name}</div>}
                                        {rfq.products?.length > 0 && (
                                            <div style={{ color: '#555', marginTop: '2px' }}>
                                                <i className="bi bi-box me-1 text-secondary"></i>{rfq.products.slice(0, 3).map(p => p.name).join(', ')}{rfq.products.length > 3 ? ` +${rfq.products.length - 3} more` : ''}
                                            </div>
                                        )}
                                        <div style={{ color: '#888', marginTop: '4px' }}>{rfq.received_at ? new Date(rfq.received_at).toLocaleDateString() : ''}</div>
                                    </div>
                                ));
                            })()}
                        </div>
                    </div>
                </div>
            )}

            {/* Extract modal */}
            {extractMsg && (
                <ExtractModal
                    msg={extractMsg}
                    storeId={storeId}
                    token={token}
                    onClose={() => setExtractMsg(null)}
                    onCreateRFQ={(data) => {
                        const msgId = extractMsg?.id;
                        const msgCode = extractMsg?.code;
                        setExtractMsg(null);
                        rfqCreateRef.current?.openFromExtraction(data, msgId, msgCode);
                    }}
                />
            )}

            {/* RFQ create modal */}
            <RFQCreate
                ref={rfqCreateRef}
                showToastMessage={showToast}
                onCreated={newRfq => {
                    if (newRfq?.id) {
                        try { sessionStorage.setItem('_rfq_auto_send', newRfq.id); } catch (_) {}
                        history.push('/dashboard/rfq-received?t=' + Date.now());
                    }
                }}
            />

            {/* RFQ Detail modal — opened from RFQ code badge */}
            <ForwardDetail
                rfq={rfqDetail}
                show={!!rfqDetail}
                storeId={localStorage.getItem('store_id')}
                onHide={() => setRfqDetail(null)}
            />
        </div>
    );
}
