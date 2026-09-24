import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ViewButton } from './FileViewerModal.js';
import { ForwardDetail } from '../rfq_received/index.js';
import RFQWhatsAppConversationsPanel from '../rfq_received/RFQWhatsAppConversationsPanel.js';
import RFQEmailConversationsPanel from '../rfq_received/RFQEmailConversationsPanel.js';

const fixEmailHtml = html => {
    if (!html) return html;
    // Zoho Mail embeds inline images as relative paths like src="/mail/ImageDisplay?..."
    // Make them absolute so the browser can attempt to load them.
    return html
        .replace(/src="\/mail\//g, 'src="https://mail.zoho.com/mail/')
        .replace(/src='\/mail\//g,  "src='https://mail.zoho.com/mail/");
};

const directionBadge = dir =>
    dir === 'in'
        ? <span className="badge" style={{ background: '#dff0d8', color: '#3c763d', fontSize: '11px' }}>&#8595; In</span>
        : <span className="badge" style={{ background: '#d9edf7', color: '#31708f', fontSize: '11px' }}>&#8593; Out</span>;

const providerIcon = p => {
    const icons = { zoho: '🟡', gmail: '🔴', outlook: '🔵', smtp: '📧', sendgrid: '⚡', mailgun: '🔫', ses: '☁️', postmark: '📮', brevo: '🟣', resend: '⚡' };
    return icons[p] || '📧';
};

/**
 * EmailDetailModal — standalone reusable email detail viewer with inline reply.
 *
 * Props:
 *   msg       — the ProcurementMessage object
 *   show      — boolean
 *   onClose   — () => void
 *   storeId   — string  (required for reply API call)
 *   token     — string  (auth token for reply API call)
 *   onExtract — optional (msg) => void — called when Extract button clicked
 *   onLinkQuotation — optional (msg) => void
 */
// Decode HTML entities stored from Zoho API (e.g. &lt; → <)
const decodeHtml = s => (s || '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"');
// Extract bare email from "Name <email>" or "&lt;email&gt;" formats
const extractEmail = raw => {
    const decoded = decodeHtml(raw);
    const m = decoded.match(/<([^>@\s]+@[^>]+)>/);
    if (m) return m[1].trim();
    if (decoded.includes('@')) return decoded.trim();
    return '';
};
// Display name or full decoded string for UI
const displayAddr = raw => {
    const decoded = decodeHtml(raw);
    // If it's just <email@domain>, strip angle brackets
    const m = decoded.match(/^<([^>]+)>$/);
    return m ? m[1] : decoded;
};

function ThreadMessage({ m, t }) {
    const [expanded, setExpanded] = useState(false);
    const isIn = m.direction === 'in';
    const rawBody = m.body_text || m.body_html?.replace(/<[^>]+>/g, ' ') || '';
    const preview = rawBody.trim().slice(0, 180);
    const hasMore = rawBody.trim().length > 180;
    return (
        <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', background: isIn ? '#f8f9fa' : '#f0f4ff', overflow: 'hidden' }}>
            <div
                style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', borderBottom: expanded ? '1px solid #e0e0e0' : 'none' }}
                onClick={() => setExpanded(e => !e)}
            >
                {directionBadge(m.direction)}
                <span style={{ fontSize: '11px', color: '#5f6368', flexShrink: 0 }}>
                    {m.message_date ? new Date(m.message_date).toLocaleString() : '—'}
                </span>
                <span style={{ fontSize: '12px', fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {isIn ? displayAddr(m.from || '') : displayAddr((m.to && m.to[0]) || '')}
                </span>
                {m.subject && (
                    <span style={{ fontSize: '11px', color: '#80868b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px', flexShrink: 0 }}>
                        {m.subject}
                    </span>
                )}
                <i className={`bi bi-chevron-${expanded ? 'up' : 'down'}`} style={{ fontSize: '11px', color: '#80868b', flexShrink: 0 }} />
            </div>
            {!expanded && preview && (
                <div style={{ padding: '5px 14px 8px', fontSize: '12px', color: '#5f6368', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {preview}{hasMore ? '…' : ''}
                </div>
            )}
            {expanded && (
                <div style={{ padding: '14px', fontSize: '13px', lineHeight: '1.6', color: '#202124', maxHeight: '300px', overflowY: 'auto' }}>
                    {m.body_html ? (
                        <div dangerouslySetInnerHTML={{ __html: fixEmailHtml(m.body_html) }} />
                    ) : (
                        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, fontFamily: 'inherit', fontSize: '13px' }}>
                            {m.body_text || <span style={{ color: '#9aa0a6' }}>{t('(empty body)')}</span>}
                        </pre>
                    )}
                </div>
            )}
        </div>
    );
}

export default function EmailDetailModal({ msg, show, onClose, storeId, token, onExtract, onLinkQuotation, linkingFor, onDeleted }) {
    const { t } = useTranslation('common');
    const [replyOpen, setReplyOpen] = useState(false);
    const [replyFrom, setReplyFrom] = useState('');
    const [replyTo, setReplyTo] = useState('');
    const [replyBody, setReplyBody] = useState('');
    const [replySubject, setReplySubject] = useState('');
    const [replySending, setReplySending] = useState(false);
    const [replyStatus, setReplyStatus] = useState(null); // {ok, msg}
    const [replyAttachments, setReplyAttachments] = useState([]); // File[]
    const replyFormRef = useRef(null);
    const replyBodyRef = useRef(null);
    const attachInputRef = useRef(null);
    const [deleting, setDeleting] = useState(false);
    const [translating, setTranslating] = useState(false);
    const [rfqDetail, setRfqDetail]   = useState(null);
    const [rfqDetailShow, setRfqDetailShow] = useState(false);
    const [threadMessages, setThreadMessages] = useState([]);
    const [threadLoading, setThreadLoading] = useState(false);
    // Customer RFQ history
    const [emailRfqOpen, setEmailRfqOpen] = useState(false);
    const [emailRfqList, setEmailRfqList] = useState([]);
    const [emailRfqLoading, setEmailRfqLoading] = useState(false);
    const emailRfqRef = useRef(null);
    const bodyRef = useRef(null);
    const [activeDetailTab, setActiveDetailTab] = useState('email'); // 'email' | 'supplier_conv' | 'customer_conv'
    const [supplierConvUnread, setSupplierConvUnread] = useState(0);
    const [customerConvUnread, setCustomerConvUnread] = useState(0);
    const [customerEmailConvUnread, setCustomerEmailConvUnread] = useState(0);
    // Linked RFQ data (for conversation tabs) — loaded on demand
    const [linkedRfq, setLinkedRfq] = useState(null);

    // Load linked RFQ data (for Supplier/Customer Conversations tabs)
    const loadLinkedRfq = async () => {
        const rfqId = msg?.rfq_received_id || msg?.linked_rfq_received_id;
        if (!rfqId || !storeId || !token || linkedRfq?.id) return;
        try {
            const res  = await fetch(`/v1/rfq-received/${rfqId}?store_id=${storeId}`, { headers: { Authorization: token } });
            const data = await res.json();
            const rfq  = data.result || data;
            if (rfq?.id || rfq?._id) setLinkedRfq(rfq);
        } catch (_) {}
    };

    const loadEmailRfqs = async (email) => {
        if (!email || !storeId || !token) return;
        setEmailRfqLoading(true);
        try {
            const res = await fetch(
                `/v1/rfq-received?store_id=${storeId}&customer_email=${encodeURIComponent(email)}&limit=50`,
                { headers: { Authorization: token } }
            );
            const data = await res.json();
            setEmailRfqList(data.result || []);
        } catch (_) {}
        setEmailRfqLoading(false);
    };

    // Reset tab + linked rfq when a new message opens
    useEffect(() => {
        if (show && msg) { setActiveDetailTab('email'); setLinkedRfq(null); }
    }, [show, msg?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    // Load customer RFQ history when modal opens
    useEffect(() => {
        if (!show || !msg) { setEmailRfqList([]); setEmailRfqOpen(false); return; }
        const email = msg.direction === 'in'
            ? extractEmail(msg.from || '')
            : extractEmail((msg.to && msg.to[0]) || '');
        if (email) loadEmailRfqs(email);
    }, [show, msg?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    // Close RFQ dropdown on outside click
    useEffect(() => {
        const handler = e => {
            if (emailRfqRef.current && !emailRfqRef.current.contains(e.target)) setEmailRfqOpen(false);
        };
        if (emailRfqOpen) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [emailRfqOpen]);

    // Hide broken images in body HTML
    useEffect(() => {
        if (!bodyRef.current) return;
        bodyRef.current.querySelectorAll('img').forEach(img => {
            img.onerror = () => { img.style.display = 'none'; };
            if (img.complete && img.naturalWidth === 0) img.style.display = 'none';
        });
    }, [msg?.body_html]);

    useEffect(() => {
        if (!show || !msg || !storeId || !token) { setThreadMessages([]); return; }
        const contactEmail = msg.direction === 'in'
            ? extractEmail(msg.from || '')
            : extractEmail((msg.to && msg.to[0]) || '');
        if (!contactEmail) { setThreadMessages([]); return; }
        setThreadLoading(true);
        setThreadMessages([]);
        const params = new URLSearchParams({ store_id: storeId, type: 'email', limit: 100 });
        fetch(`/v1/procurement-message-threads/${encodeURIComponent(contactEmail)}?${params}`, {
            headers: { Authorization: token },
        })
            .then(r => r.json())
            .then(data => {
                const all = data.messages || [];
                const others = all
                    .filter(m => m.id !== msg.id)
                    .sort((a, b) => new Date(a.message_date) - new Date(b.message_date));
                setThreadMessages(others);
            })
            .catch(() => {})
            .finally(() => setThreadLoading(false));
    }, [show, msg?.id, storeId, token]); // eslint-disable-line react-hooks/exhaustive-deps

    const openLinkedRfq = async () => {
        if (!msg.rfq_received_id && !msg.linked_rfq_received_id) return;
        const rfqId = msg.rfq_received_id || msg.linked_rfq_received_id;
        try {
            const res = await fetch(`/v1/rfq-received/${rfqId}?store_id=${storeId}`, { headers: { Authorization: token } });
            const data = await res.json();
            const rfq = data.result || data;
            if (rfq?.id || rfq?._id) { setRfqDetail(rfq); setRfqDetailShow(true); }
        } catch (_) {}
    };

    const handleDelete = async () => {
        if (!window.confirm(t('Confirm delete this message?'))) return;
        setDeleting(true);
        try {
            await fetch(`/v1/procurement-messages/${msg.id}?store_id=${storeId}`, {
                method: 'DELETE',
                headers: { Authorization: token },
            });
            onClose();
            onDeleted && onDeleted(msg.id);
        } catch (_) {}
        setDeleting(false);
    };

    if (!msg || !show) return null;

    const THANK_YOU_BODY = `Thank you for reaching out to us. We have received your email and will review it promptly. A member of our team will be in touch with you shortly.\n\nWe appreciate your time and look forward to assisting you.\n\nBest regards`;

    const handleOpenReply = () => {
        const orig = msg.subject || '';
        setReplySubject(orig.toLowerCase().startsWith('re:') ? orig : 'Re: ' + orig);
        setReplyBody('');
        setReplyStatus(null);

        // For inbound messages reply to the sender (msg.from).
        // For outbound messages (store sent it) reply to the original recipient (msg.to[0]).
        const externalAddr = msg.direction === 'out'
            ? extractEmail((msg.to && msg.to[0]) || '')
            : extractEmail(msg.from || '');
        setReplyTo(externalAddr);
        setReplyFrom(extractEmail(msg.direction === 'out' ? (msg.from || '') : ((msg.to && msg.to[0]) || '')));
        setReplyAttachments([]);
        setReplyOpen(true);
        setTimeout(() => {
            replyFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            replyBodyRef.current?.focus();
        }, 80);
    };

    const handleThankYouReply = () => {
        handleOpenReply();
        setReplyBody(THANK_YOU_BODY);
    };

    const handleAddAttachments = (files) => {
        setReplyAttachments(prev => [...prev, ...Array.from(files)]);
    };

    const handleRemoveAttachment = (idx) => {
        setReplyAttachments(prev => prev.filter((_, i) => i !== idx));
    };

    const translateReply = async () => {
        if (!replyBody.trim()) return;
        setTranslating(true);
        try {
            const res = await fetch('/v1/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: token },
                body: JSON.stringify({ text: replyBody, target: 'ar' }),
            });
            const data = await res.json();
            if (data?.translatedText) setReplyBody(data.translatedText);
        } catch (_) {}
        setTranslating(false);
    };

    const handleSendReply = async () => {
        if (!replyBody.trim()) return;
        setReplySending(true);
        setReplyStatus(null);
        try {
            const fd = new FormData();
            fd.append('store_id', storeId);
            fd.append('subject', replySubject);
            fd.append('body', replyBody);
            fd.append('to', replyTo.trim());
            fd.append('from', replyFrom.trim());
            replyAttachments.forEach(f => fd.append('files', f, f.name));

            const res = await fetch(`/v1/procurement-messages/${msg.id}/email-reply?store_id=${storeId}`, {
                method: 'POST',
                headers: { Authorization: token }, // no Content-Type — browser sets multipart boundary
                body: fd,
            });
            const data = await res.json();
            if (res.ok) {
                setReplyStatus({ ok: true, msg: `Reply sent to ${data.to || msg.from}` });
                setReplyOpen(false);
                setReplyBody('');
                setReplyAttachments([]);
            } else {
                setReplyStatus({ ok: false, msg: data.error || 'Failed to send' });
            }
        } catch (e) {
            setReplyStatus({ ok: false, msg: e.message });
        }
        setReplySending(false);
    };

    return (
    <>
        {!rfqDetailShow && <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.4)', zIndex: 9999 }}>
            <div className="modal-dialog modal-lg modal-dialog-scrollable" style={{ maxWidth: '760px' }}>
                <div className="modal-content">
                    <div className="modal-header" style={{ background: '#f8f9fa' }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                {directionBadge(msg.direction)}
                                <span style={{ fontSize: '11px', color: '#6c757d' }}>
                                    {providerIcon(msg.provider)} {msg.provider}
                                </span>
                                {msg.processed_as_rfq && (
                                    <span className="badge bg-success" style={{ fontSize: '11px' }}>✅ {t('RFQ Created')}</span>
                                )}
                                {(msg.rfq_received_code || msg.linked_rfq_received_code) && (
                                    <span
                                        role="button"
                                        tabIndex={0}
                                        onClick={openLinkedRfq}
                                        onKeyDown={e => e.key === 'Enter' && openLinkedRfq()}
                                        style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: 700, color: '#0a7c42', background: '#e6f4ed', border: '1px solid #b2dfcb', borderRadius: '4px', padding: '1px 7px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                        title={t('Open RFQ details')}
                                    >
                                        <i className="bi bi-file-earmark-text"></i>
                                        {msg.rfq_received_code || msg.linked_rfq_received_code}
                                    </span>
                                )}
                                {msg.is_supplier_quotation && (
                                    <span className="badge bg-info text-dark" style={{ fontSize: '11px' }}>
                                        <i className="bi bi-receipt me-1"></i>{t('Supplier Quotation')}
                                        {msg.linked_rfq_received_code && ` → ${msg.linked_rfq_received_code}`}
                                    </span>
                                )}
                            </div>
                            {/* Customer RFQs button */}
                            <div ref={emailRfqRef} style={{ position: 'relative', display: 'inline-block', marginTop: '4px' }}>
                                <button
                                    onClick={() => setEmailRfqOpen(o => !o)}
                                    style={{ background: emailRfqList.length > 0 ? '#e8f0fe' : '#f1f3f4', border: '1px solid #dadce0', borderRadius: '4px', padding: '2px 9px', fontSize: '11px', fontWeight: 600, color: '#1a73e8', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                                    title="View customer RFQ history"
                                >
                                    <i className="bi bi-folder2-open"></i>
                                    Customer RFQs
                                    {emailRfqList.length > 0 && (
                                        <span style={{ background: '#1a73e8', color: '#fff', borderRadius: '10px', padding: '0 5px', fontSize: '10px', minWidth: '16px', textAlign: 'center' }}>{emailRfqList.length}</span>
                                    )}
                                    {emailRfqLoading && <span className="spinner-border spinner-border-sm" style={{ width: '10px', height: '10px', borderWidth: '1.5px' }} />}
                                </button>
                                {emailRfqOpen && (
                                    <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 10200, background: '#fff', border: '1px solid #dadce0', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', minWidth: '360px', maxHeight: '420px', overflowY: 'auto', marginTop: '4px' }}>
                                        {emailRfqLoading && <div style={{ padding: '14px', textAlign: 'center', color: '#80868b', fontSize: '13px' }}><span className="spinner-border spinner-border-sm me-2" />Loading…</div>}
                                        {!emailRfqLoading && emailRfqList.length === 0 && <div style={{ padding: '14px', textAlign: 'center', color: '#80868b', fontSize: '13px' }}>No RFQs found for this customer</div>}
                                        {emailRfqList.map(rfq => (
                                            <div key={rfq.id} style={{ padding: '10px 14px', borderBottom: '1px solid #f0f0f0' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                    <span
                                                        role="button"
                                                        tabIndex={0}
                                                        onClick={() => { setRfqDetail(rfq); setRfqDetailShow(true); setEmailRfqOpen(false); }}
                                                        onKeyDown={e => e.key === 'Enter' && (setRfqDetail(rfq), setRfqDetailShow(true), setEmailRfqOpen(false))}
                                                        style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 700, color: '#0a7c42', background: '#e6f4ed', borderRadius: '4px', padding: '1px 6px', cursor: 'pointer' }}
                                                        title="Open RFQ details"
                                                    >
                                                        {rfq.code}
                                                    </span>
                                                    <span style={{ fontSize: '11px', color: '#5f6368' }}>{rfq.received_at ? new Date(rfq.received_at).toLocaleDateString() : ''}</span>
                                                    {rfq.status && <span style={{ fontSize: '10px', background: '#f0f0f0', borderRadius: '10px', padding: '1px 6px', color: '#444' }}>{rfq.status}</span>}
                                                </div>
                                                {(rfq.forwarded_to || []).length > 0 && (
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                        {rfq.forwarded_to.map((sup, i) => (
                                                            <button
                                                                key={i}
                                                                onClick={() => window.open(`/dashboard/procurement-whatsapp?phone=${encodeURIComponent(sup.phone)}`, '_blank')}
                                                                style={{ background: '#e8f5e9', border: '1px solid #c8e6c9', borderRadius: '12px', padding: '2px 8px', fontSize: '11px', color: '#2e7d32', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                                                                title={`Open WhatsApp chat with ${sup.name || sup.phone}`}
                                                            >
                                                                <i className="bi bi-whatsapp"></i>
                                                                {sup.name || sup.phone}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <h6 className="modal-title mt-1" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                {msg.code && (
                                    <span style={{
                                        fontFamily: 'monospace',
                                        fontSize: '13px',
                                        fontWeight: 700,
                                        color: '#1a73e8',
                                        background: '#e8f0fe',
                                        border: '1px solid #c8d8f5',
                                        borderRadius: '4px',
                                        padding: '1px 7px',
                                        letterSpacing: '0.03em',
                                    }}>{msg.code}</span>
                                )}
                                <span>{msg.subject || t('(no subject)')}</span>
                            </h6>
                        </div>
                        <button className="btn-close" onClick={onClose} />
                    </div>

                    {/* Tab nav */}
                    <ul className="nav nav-tabs px-3 pt-1" style={{ borderBottom: '1px solid #dee2e6', background: '#f8f9fa', fontSize: 13 }}>
                        <li className="nav-item">
                            <button className={`nav-link py-1 ${activeDetailTab === 'email' ? 'active' : ''}`} onClick={() => setActiveDetailTab('email')}>
                                <i className="bi bi-envelope me-1"></i>Email
                            </button>
                        </li>
                        <li className="nav-item">
                            <button className={`nav-link py-1 ${activeDetailTab === 'supplier_conv' ? 'active' : ''}`} onClick={() => { setActiveDetailTab('supplier_conv'); loadLinkedRfq(); }}>
                                <i className="bi bi-whatsapp me-1"></i>Supplier Conversations
                                {supplierConvUnread > 0 && <span className="badge bg-danger ms-1 rounded-pill" style={{ fontSize: 9 }}>{supplierConvUnread}</span>}
                            </button>
                        </li>
                        <li className="nav-item">
                            <button className={`nav-link py-1 ${activeDetailTab === 'customer_conv' ? 'active' : ''}`} onClick={() => { setActiveDetailTab('customer_conv'); loadLinkedRfq(); }}>
                                <i className="bi bi-person-lines-fill me-1"></i>Customer Conversations
                                {customerConvUnread > 0 && <span className="badge bg-danger ms-1 rounded-pill" style={{ fontSize: 9 }}>{customerConvUnread}</span>}
                            </button>
                        </li>
                        <li className="nav-item">
                            <button className={`nav-link py-1 ${activeDetailTab === 'customer_email_conv' ? 'active' : ''}`} onClick={() => { setActiveDetailTab('customer_email_conv'); loadLinkedRfq(); }}>
                                <i className="bi bi-envelope-fill me-1"></i>Customer Email
                                {customerEmailConvUnread > 0 && <span className="badge bg-danger ms-1 rounded-pill" style={{ fontSize: 9 }}>{customerEmailConvUnread}</span>}
                            </button>
                        </li>
                    </ul>

                    {/* Supplier / Customer WhatsApp conversation tabs */}
                    {activeDetailTab !== 'email' && (
                        <div className="modal-body">
                            {activeDetailTab === 'supplier_conv' && (
                                <RFQWhatsAppConversationsPanel
                                    storeId={storeId}
                                    phones={(linkedRfq?.forwarded_to || []).map(s => s.phone).filter(Boolean)}
                                    phoneLabels={Object.fromEntries((linkedRfq?.forwarded_to || []).filter(s => s.phone).map(s => [s.phone, s.supplier_name || s.name || s.phone]))}
                                    chatZIndex={19999}
                                    emptyMessage={msg?.rfq_received_id ? 'Loading RFQ supplier data…' : 'No linked RFQ found for this email. Supplier conversations are available once an RFQ is created from this email.'}
                                    onUnreadCount={setSupplierConvUnread}
                                />
                            )}
                            {activeDetailTab === 'customer_conv' && (
                                <RFQWhatsAppConversationsPanel
                                    storeId={storeId}
                                    phones={linkedRfq?.customer_phone ? [linkedRfq.customer_phone] : []}
                                    phoneLabels={linkedRfq?.customer_phone ? { [linkedRfq.customer_phone]: linkedRfq.customer_name || linkedRfq.customer_phone } : {}}
                                    chatZIndex={19999}
                                    emptyMessage={msg?.rfq_received_id ? 'Loading customer data…' : 'No linked RFQ found. Customer conversation requires a customer with a WhatsApp phone number.'}
                                    onUnreadCount={setCustomerConvUnread}
                                    showEmptyPhones
                                />
                            )}
                            {activeDetailTab === 'customer_email_conv' && (
                                <RFQEmailConversationsPanel
                                    storeId={storeId}
                                    emails={linkedRfq?.customer_email ? [linkedRfq.customer_email] : []}
                                    emailLabels={linkedRfq?.customer_email ? { [linkedRfq.customer_email]: linkedRfq.customer_name || linkedRfq.customer_email } : {}}
                                    chatZIndex={19999}
                                    emptyMessage={msg?.rfq_received_id ? 'Loading customer data…' : 'No linked RFQ found. Customer email conversation requires a customer with an email address.'}
                                    onUnreadCount={setCustomerEmailConvUnread}
                                    showEmptyEmails
                                />
                            )}
                        </div>
                    )}

                    <div className="modal-body" style={{ display: activeDetailTab === 'email' ? undefined : 'none' }}>
                        <table className="table table-sm" style={{ fontSize: '13px', marginBottom: '16px' }}>
                            <tbody>
                                <tr><th style={{ width: 80, fontWeight: 600 }}>{t('From')}</th><td>{displayAddr(msg.from)}</td></tr>
                                {(msg.to || []).length > 0 && (
                                    <tr><th style={{ fontWeight: 600 }}>{t('To')}</th><td>{(msg.to || []).map(displayAddr).join(', ')}</td></tr>
                                )}
                                <tr>
                                    <th style={{ fontWeight: 600 }}>{t('Date')}</th>
                                    <td>{msg.message_date ? new Date(msg.message_date).toLocaleString() : '—'}</td>
                                </tr>
                            </tbody>
                        </table>

                        {/* Email body */}
                        <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', background: '#fff', overflow: 'hidden' }}>
                            <div style={{ maxHeight: '400px', overflow: 'auto', padding: '20px 24px', fontSize: '14px', lineHeight: '1.6', color: '#202124' }}>
                                {msg.body_html ? (
                                    <div ref={bodyRef} dangerouslySetInnerHTML={{ __html: fixEmailHtml(msg.body_html) }} />
                                ) : (
                                    <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, fontFamily: 'inherit', fontSize: '14px' }}>
                                        {msg.body_text || <span style={{ color: '#9aa0a6' }}>{t('(empty body)')}</span>}
                                    </pre>
                                )}
                            </div>
                        </div>

                        {/* Attachments */}
                        {(msg.attachments || []).length > 0 && (
                            <div style={{ marginTop: '16px' }}>
                                <div style={{ fontSize: '12px', color: '#5f6368', fontWeight: 500, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    <i className="bi bi-paperclip me-1"></i>{msg.attachments.length} {t('Attachment')}{msg.attachments.length !== 1 ? 's' : ''}
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                    {msg.attachments.map((att, i) => {
                                        const isImage = att.content_type?.startsWith('image/');
                                        const isPDF   = att.content_type === 'application/pdf' || att.filename?.toLowerCase().endsWith('.pdf');
                                        const isExcel = att.filename?.match(/\.(xlsx?|csv)$/i);
                                        const icon = isPDF ? 'bi-file-earmark-pdf text-danger' : isImage ? 'bi-file-earmark-image text-primary' : isExcel ? 'bi-file-earmark-excel text-success' : 'bi-file-earmark text-secondary';
                                        if (isImage && att.url) {
                                            return (
                                                <div key={i} style={{ border: '1px solid #dadce0', borderRadius: '8px', overflow: 'hidden', background: '#f0f0f0', maxWidth: '240px' }}>
                                                    <img src={att.url} alt={att.filename || `Attachment ${i + 1}`} style={{ display: 'block', maxWidth: '240px', maxHeight: '180px', objectFit: 'contain' }} />
                                                    <div style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                                                        <span style={{ fontSize: '11px', color: '#5f6368', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.filename || `Image ${i + 1}`}</span>
                                                        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                                                            <ViewButton att={att} zIndex={10100} />
                                                            <a href={att.url} target="_blank" rel="noreferrer" download={att.filename} className="btn btn-sm btn-outline-secondary" style={{ padding: '2px 8px', fontSize: '11px' }}>
                                                                <i className="bi bi-download"></i>
                                                            </a>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return (
                                            <div key={i} style={{ border: '1px solid #dadce0', borderRadius: '8px', padding: '10px 14px', minWidth: '160px', maxWidth: '220px', background: '#f8f9fa' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                                    <i className={`bi ${icon}`} style={{ fontSize: '20px' }}></i>
                                                    <div style={{ overflow: 'hidden' }}>
                                                        <div style={{ fontSize: '12px', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{att.filename || `Attachment ${i + 1}`}</div>
                                                        {att.size > 0 && <div style={{ fontSize: '11px', color: '#5f6368' }}>{(att.size / 1024).toFixed(0)} KB</div>}
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                    <ViewButton att={att} zIndex={10100} />
                                                    {att.url && (
                                                        <a href={att.url} target="_blank" rel="noreferrer" download={att.filename} className="btn btn-sm btn-outline-secondary" style={{ padding: '3px 10px', fontSize: '11px' }}>
                                                            <i className="bi bi-download me-1"></i>Download
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Thread replies */}
                        {(threadLoading || threadMessages.length > 0) && (
                            <div style={{ marginTop: '24px' }}>
                                <div style={{ fontSize: '12px', color: '#5f6368', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <i className="bi bi-chat-text"></i>
                                    {t('Conversation Thread')}
                                    {!threadLoading && threadMessages.length > 0 && (
                                        <span style={{ background: '#e8f0fe', color: '#1967d2', borderRadius: '10px', padding: '1px 8px', fontSize: '11px', fontWeight: 600 }}>
                                            {threadMessages.length}
                                        </span>
                                    )}
                                </div>
                                {threadLoading ? (
                                    <div style={{ textAlign: 'center', padding: '14px', color: '#80868b', fontSize: '13px' }}>
                                        <span className="spinner-border spinner-border-sm me-2" />
                                        {t('Loading thread…')}
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {threadMessages.map((m, i) => (
                                            <ThreadMessage key={m.id || i} m={m} t={t} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Reply status */}
                        {replyStatus && (
                            <div className={`alert ${replyStatus.ok ? 'alert-success' : 'alert-danger'} mt-3 py-2`} style={{ fontSize: '13px' }}>
                                {replyStatus.msg}
                            </div>
                        )}

                        {/* Gmail-style inline reply compose */}
                        {replyOpen && (
                            <div
                                ref={replyFormRef}
                                style={{ marginTop: '16px', border: '1px solid #c6d0d7', borderRadius: '8px', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}
                            >
                                {/* Header bar */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px 6px', borderBottom: '1px solid #e8eaed' }}>
                                    <span style={{ fontSize: '13px', color: '#444' }}>
                                        <i className="bi bi-reply me-1" style={{ color: '#1a73e8' }}></i>
                                        <strong>Reply</strong>
                                    </span>
                                    <button className="btn btn-sm" style={{ padding: '2px 6px', color: '#5f6368' }} onClick={() => setReplyOpen(false)} title="Discard">
                                        <i className="bi bi-x-lg"></i>
                                    </button>
                                </div>

                                {/* To row — always visible and editable */}
                                <div style={{ padding: '6px 14px', borderBottom: '1px solid #e8eaed', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '12px', color: '#5f6368', minWidth: 52 }}>To</span>
                                    <input
                                        className="form-control form-control-sm border-0 shadow-none"
                                        value={replyTo}
                                        onChange={e => setReplyTo(e.target.value)}
                                        placeholder="recipient@example.com"
                                        type="email"
                                        style={{ fontSize: '13px', padding: '2px 0', background: 'transparent' }}
                                    />
                                </div>

                                {/* Subject row */}
                                <div style={{ padding: '6px 14px', borderBottom: '1px solid #e8eaed', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '12px', color: '#5f6368', minWidth: 52 }}>Subject</span>
                                    <input
                                        className="form-control form-control-sm border-0 shadow-none"
                                        value={replySubject}
                                        onChange={e => setReplySubject(e.target.value)}
                                        style={{ fontSize: '13px', padding: '2px 0', background: 'transparent' }}
                                    />
                                </div>

                                {/* Body */}
                                <div style={{ padding: '10px 14px 4px' }}>
                                    <textarea
                                        ref={replyBodyRef}
                                        className="form-control border-0 shadow-none"
                                        rows={6}
                                        value={replyBody}
                                        onChange={e => setReplyBody(e.target.value)}
                                        placeholder="Write your reply…"
                                        style={{ fontSize: '13px', resize: 'vertical', background: 'transparent', padding: 0 }}
                                    />
                                </div>

                                {/* Quoted original */}
                                {(msg.body_text || msg.body_html) && (
                                    <div style={{ margin: '4px 14px 8px', borderLeft: '3px solid #dadce0', paddingLeft: '10px', color: '#5f6368', fontSize: '12px', maxHeight: '120px', overflowY: 'auto' }}>
                                        <div style={{ marginBottom: '3px', color: '#80868b' }}>
                                            On {msg.message_date ? new Date(msg.message_date).toLocaleString() : ''}, {displayAddr(msg.from)} wrote:
                                        </div>
                                        <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                            {msg.body_text || msg.body_html?.replace(/<[^>]+>/g, ' ')}
                                        </div>
                                    </div>
                                )}

                                {/* Attachment chips */}
                                {replyAttachments.length > 0 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '6px 14px' }}>
                                        {replyAttachments.map((f, i) => (
                                            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#e8f0fe', borderRadius: '16px', padding: '3px 10px 3px 8px', fontSize: '12px', color: '#1a73e8' }}>
                                                <i className="bi bi-paperclip"></i>
                                                {f.name}
                                                <span style={{ fontSize: '10px', color: '#80868b' }}>({(f.size / 1024).toFixed(0)} KB)</span>
                                                <button onClick={() => handleRemoveAttachment(i)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#5f6368', lineHeight: 1 }}>
                                                    <i className="bi bi-x"></i>
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Footer toolbar */}
                                <div style={{ display: 'flex', alignItems: 'center', padding: '8px 14px 12px', borderTop: '1px solid #e8eaed', gap: '8px' }}>
                                    {/* Send button */}
                                    <button
                                        className="btn btn-sm btn-primary"
                                        onClick={handleSendReply}
                                        disabled={replySending || !replyBody.trim() || !replyTo.includes('@')}
                                        style={{ borderRadius: '20px', padding: '5px 18px', fontWeight: 500 }}
                                    >
                                        {replySending
                                            ? <><span className="spinner-border spinner-border-sm me-1" />Sending…</>
                                            : <><i className="bi bi-send me-1"></i>Send</>}
                                    </button>

                                    {/* Attach file button */}
                                    <button
                                        type="button"
                                        title="Attach files"
                                        onClick={() => attachInputRef.current?.click()}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5f6368', fontSize: '18px', padding: '4px 6px', lineHeight: 1 }}
                                    >
                                        <i className="bi bi-paperclip"></i>
                                    </button>
                                    <input
                                        ref={attachInputRef}
                                        type="file"
                                        multiple
                                        hidden
                                        onChange={e => { handleAddAttachments(e.target.files); e.target.value = ''; }}
                                    />

                                    {/* Translate to Arabic */}
                                    <button
                                        type="button"
                                        title="Translate to Arabic"
                                        onClick={translateReply}
                                        disabled={translating || !replyBody.trim()}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1967d2', fontSize: '16px', padding: '4px 6px', lineHeight: 1, display: 'flex', alignItems: 'center', gap: '3px' }}
                                    >
                                        {translating
                                            ? <span className="spinner-border spinner-border-sm" />
                                            : <><i className="bi bi-translate"></i><span style={{ fontSize: '11px' }}>AR</span></>}
                                    </button>

                                    {/* Discard */}
                                    <button
                                        type="button"
                                        title="Discard"
                                        onClick={() => { setReplyOpen(false); setReplyAttachments([]); }}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5f6368', fontSize: '18px', padding: '4px 6px', lineHeight: 1, marginLeft: 'auto' }}
                                    >
                                        <i className="bi bi-trash3"></i>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="modal-footer" style={{ flexWrap: 'wrap', gap: '6px' }}>
                        {/* Reply button */}
                        <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={handleOpenReply}
                            disabled={replyOpen}
                            title={t('Reply to this email')}
                        >
                            <i className="bi bi-reply me-1"></i>{t('Reply')}
                        </button>
                        {/* Thank you quick-reply */}
                        <button
                            className="btn btn-sm btn-outline-success me-auto"
                            onClick={handleThankYouReply}
                            disabled={replyOpen}
                            title={t('Send a professional acknowledgement reply')}
                        >
                            <i className="bi bi-check2-circle me-1"></i>{t('Thank You Reply')}
                        </button>
                        {onLinkQuotation && (
                            <button
                                className={`btn btn-sm ${msg.is_supplier_quotation ? 'btn-info' : 'btn-outline-info'}`}
                                disabled={linkingFor === msg.id}
                                onClick={() => onLinkQuotation(msg)}
                            >
                                {linkingFor === msg.id
                                    ? <span className="spinner-border spinner-border-sm me-1" />
                                    : <i className="bi bi-receipt me-1"></i>}
                                {msg.is_supplier_quotation ? t('Remove Quotation Label') : t('Label as Supplier Quotation')}
                            </button>
                        )}
                        {onExtract && (
                            <button className="btn btn-outline-primary btn-sm" onClick={() => { onExtract(msg); onClose(); }}>
                                <i className="bi bi-magic me-1"></i>{t('Extract')}
                            </button>
                        )}
                        <button
                            className="btn btn-sm btn-outline-danger ms-auto"
                            onClick={handleDelete}
                            disabled={deleting}
                            title={t('Delete this email')}
                        >
                            {deleting
                                ? <span className="spinner-border spinner-border-sm" />
                                : <><i className="bi bi-trash3 me-1"></i>{t('Delete')}</>}
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={onClose}>{t('Close')}</button>
                    </div>
                </div>
            </div>
        </div>}
        <ForwardDetail
            rfq={rfqDetail}
            show={rfqDetailShow && !!rfqDetail}
            onHide={() => { setRfqDetailShow(false); }}
            storeId={storeId}
            zIndex={19999}
        />
    </>
    );
}
