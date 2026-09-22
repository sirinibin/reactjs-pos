import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ViewButton } from './FileViewerModal.js';
import { ForwardDetail } from '../rfq_received/index.js';

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
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.4)', zIndex: 9999, display: rfqDetailShow ? 'none' : undefined }}>
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

                    <div className="modal-body">
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
                                    <div dangerouslySetInnerHTML={{ __html: fixEmailHtml(msg.body_html) }} />
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
                            className="btn btn-sm btn-outline-primary me-auto"
                            onClick={handleOpenReply}
                            disabled={replyOpen}
                            title={t('Reply to this email')}
                        >
                            <i className="bi bi-reply me-1"></i>{t('Reply')}
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
        </div>
        <ForwardDetail
            rfq={rfqDetail}
            show={rfqDetailShow && !!rfqDetail}
            onHide={() => { setRfqDetailShow(false); }}
            storeId={storeId}
            zIndex={10001}
        />
    </>
    );
}
