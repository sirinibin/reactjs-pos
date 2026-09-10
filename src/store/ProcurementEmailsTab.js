import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';

const PAGE_SIZE = 20;

const directionBadge = dir =>
    dir === 'in'
        ? <span className="badge" style={{ background: '#dff0d8', color: '#3c763d', fontSize: '11px' }}>&#8595; In</span>
        : <span className="badge" style={{ background: '#d9edf7', color: '#31708f', fontSize: '11px' }}>&#8593; Out</span>;

const providerIcon = p => {
    const icons = { zoho: '🟡', gmail: '🔴', outlook: '🔵', smtp: '📧', sendgrid: '⚡', mailgun: '🔫', ses: '☁️', postmark: '📮', brevo: '🟣', resend: '⚡' };
    return icons[p] || '📧';
};

export default function ProcurementEmailsTab({ storeId }) {
    const { t } = useTranslation();
    const token = localStorage.getItem('access_token');
    const [messages, setMessages] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [direction, setDirection] = useState('');
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const searchTimeout = useRef(null);

    const load = useCallback(async (pg = 1, q = search, dir = direction) => {
        if (!storeId) return;
        setLoading(true);
        try {
            const params = new URLSearchParams({ store_id: storeId, type: 'email', page: pg, limit: PAGE_SIZE });
            if (q) params.set('search', q);
            if (dir) params.set('direction', dir);
            const res = await fetch(`/v1/procurement-messages?${params}`, { headers: { Authorization: token } });
            const data = await res.json();
            setMessages(data.messages || []);
            setTotal(data.total || 0);
            setPage(pg);
        } finally { setLoading(false); }
    }, [storeId, token, search, direction]);

    useEffect(() => { load(1); }, [storeId]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleSearch = e => {
        const q = e.target.value;
        setSearch(q);
        clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => load(1, q, direction), 350);
    };

    const handleDirection = e => {
        const d = e.target.value;
        setDirection(d);
        load(1, search, d);
    };

    const openMessage = async msg => {
        if (!msg.read) {
            // mark read optimistically
            setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, read: true } : m));
        }
        const res = await fetch(`/v1/procurement-messages/${msg.id}`, { headers: { Authorization: token } });
        const data = await res.json();
        setSelected(data);
    };

    const handleDelete = async id => {
        if (!window.confirm(t('Confirm delete this message?'))) return;
        setDeleting(id);
        await fetch(`/v1/procurement-messages/${id}`, { method: 'DELETE', headers: { Authorization: token } });
        setDeleting(null);
        setSelected(null);
        load(page);
    };

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    return (
        <div style={{ padding: '16px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <i className="bi bi-envelope-open" style={{ fontSize: '18px', color: '#2563eb' }}></i>
                <h5 style={{ margin: 0, fontWeight: 600, fontSize: '15px' }}>{t('Emails')}</h5>
                <span className="badge bg-secondary ms-auto">{total} {t('messages')}</span>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                <div className="input-group input-group-sm" style={{ maxWidth: '300px' }}>
                    <span className="input-group-text"><i className="bi bi-search"></i></span>
                    <input
                        className="form-control"
                        placeholder={t('Search from, subject...')}
                        value={search}
                        onChange={handleSearch}
                    />
                </div>
                <select className="form-select form-select-sm" style={{ width: '140px' }} value={direction} onChange={handleDirection}>
                    <option value="">{t('All directions')}</option>
                    <option value="in">{t('Incoming')}</option>
                    <option value="out">{t('Outgoing')}</option>
                </select>
                <button className="btn btn-sm btn-outline-secondary ms-auto" onClick={() => load(page)}>
                    <i className="bi bi-arrow-clockwise"></i>
                </button>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
                <table className="table table-sm table-hover" style={{ fontSize: '13px', minWidth: '600px' }}>
                    <thead>
                        <tr style={{ background: '#f8f9fa' }}>
                            <th style={{ width: 60 }}></th>
                            <th>{t('From')}</th>
                            <th>{t('Subject')}</th>
                            <th style={{ width: 90 }}>{t('Provider')}</th>
                            <th style={{ width: 140 }}>{t('Date')}</th>
                            <th style={{ width: 140 }}>{t('Created At')}</th>
                            <th style={{ width: 80 }}>{t('Attachments')}</th>
                            <th style={{ width: 60 }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && (
                            <tr><td colSpan={8} className="text-center py-4">
                                <span className="spinner-border spinner-border-sm me-2" role="status" />
                                {t('Loading...')}
                            </td></tr>
                        )}
                        {!loading && messages.length === 0 && (
                            <tr><td colSpan={8} className="text-center py-4 text-muted">
                                <i className="bi bi-inbox" style={{ fontSize: '24px', display: 'block', marginBottom: '6px' }}></i>
                                {t('No emails logged yet')}
                            </td></tr>
                        )}
                        {messages.map(msg => (
                            <tr
                                key={msg.id}
                                style={{ cursor: 'pointer', fontWeight: msg.read ? 400 : 700, background: msg.processed_as_rfq ? '#f0fff4' : undefined }}
                                onClick={() => openMessage(msg)}
                            >
                                <td style={{ verticalAlign: 'middle' }}>{directionBadge(msg.direction)}</td>
                                <td style={{ verticalAlign: 'middle', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {msg.from || <span className="text-muted">—</span>}
                                </td>
                                <td style={{ verticalAlign: 'middle', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {msg.processed_as_rfq && <span title={t('Processed as RFQ')} className="me-1">✅</span>}
                                    {msg.subject || <span className="text-muted">{t('(no subject)')}</span>}
                                </td>
                                <td style={{ verticalAlign: 'middle' }}>
                                    <span title={msg.provider}>{providerIcon(msg.provider)} {msg.provider}</span>
                                </td>
                                <td style={{ verticalAlign: 'middle', whiteSpace: 'nowrap', fontSize: '12px', color: '#6c757d' }}>
                                    {msg.message_date ? new Date(msg.message_date).toLocaleString() : '—'}
                                </td>
                                <td style={{ verticalAlign: 'middle', whiteSpace: 'nowrap', fontSize: '12px', color: '#6c757d' }}>
                                    {msg.created_at ? new Date(msg.created_at).toLocaleString() : '—'}
                                </td>
                                <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>
                                    {(msg.attachments || []).length > 0
                                        ? <span className="badge bg-secondary">{msg.attachments.length}</span>
                                        : <span className="text-muted">—</span>}
                                </td>
                                <td style={{ verticalAlign: 'middle' }}>
                                    <button
                                        className="btn btn-sm btn-outline-danger"
                                        title={t('Delete')}
                                        disabled={deleting === msg.id}
                                        onClick={e => { e.stopPropagation(); handleDelete(msg.id); }}
                                    >
                                        {deleting === msg.id
                                            ? <span className="spinner-border spinner-border-sm" role="status" />
                                            : <i className="bi bi-trash3"></i>}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px', marginTop: '8px' }}>
                    <button className="btn btn-sm btn-outline-secondary" disabled={page <= 1} onClick={() => load(page - 1)}>&laquo;</button>
                    <span style={{ padding: '4px 10px', fontSize: '13px' }}>{page} / {totalPages}</span>
                    <button className="btn btn-sm btn-outline-secondary" disabled={page >= totalPages} onClick={() => load(page + 1)}>&raquo;</button>
                </div>
            )}

            {/* Detail Modal */}
            {selected && (
                <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.4)', zIndex: 9999 }}>
                    <div className="modal-dialog modal-lg modal-dialog-scrollable" style={{ maxWidth: '760px' }}>
                        <div className="modal-content">
                            <div className="modal-header" style={{ background: '#f8f9fa' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                        {directionBadge(selected.direction)}
                                        <span style={{ fontSize: '11px', color: '#6c757d' }}>
                                            {providerIcon(selected.provider)} {selected.provider}
                                        </span>
                                        {selected.processed_as_rfq && (
                                            <span className="badge bg-success" style={{ fontSize: '11px' }}>✅ {t('RFQ Created')}</span>
                                        )}
                                    </div>
                                    <h6 className="modal-title mt-1" style={{ fontWeight: 600 }}>
                                        {selected.subject || t('(no subject)')}
                                    </h6>
                                </div>
                                <button className="btn-close" onClick={() => setSelected(null)} />
                            </div>
                            <div className="modal-body">
                                <table className="table table-sm" style={{ fontSize: '13px', marginBottom: '16px' }}>
                                    <tbody>
                                        <tr><th style={{ width: 80, fontWeight: 600 }}>{t('From')}</th><td>{selected.from}</td></tr>
                                        {(selected.to || []).length > 0 && (
                                            <tr><th style={{ fontWeight: 600 }}>{t('To')}</th><td>{(selected.to || []).join(', ')}</td></tr>
                                        )}
                                        <tr>
                                            <th style={{ fontWeight: 600 }}>{t('Date')}</th>
                                            <td>{selected.message_date ? new Date(selected.message_date).toLocaleString() : '—'}</td>
                                        </tr>
                                        <tr>
                                            <th style={{ fontWeight: 600 }}>{t('Created At')}</th>
                                            <td>{selected.created_at ? new Date(selected.created_at).toLocaleString() : '—'}</td>
                                        </tr>
                                    </tbody>
                                </table>

                                {/* Email body — Gmail-style: rendered HTML preferred, plaintext fallback */}
                                <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', background: '#fff', overflow: 'hidden' }}>
                                    <div style={{ maxHeight: '480px', overflow: 'auto', padding: '20px 24px', fontSize: '14px', lineHeight: '1.6', color: '#202124' }}>
                                        {selected.body_html ? (
                                            <div dangerouslySetInnerHTML={{ __html: selected.body_html }} />
                                        ) : (
                                            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, fontFamily: 'inherit', fontSize: '14px' }}>
                                                {selected.body_text || <span style={{ color: '#9aa0a6' }}>{t('(empty body)')}</span>}
                                            </pre>
                                        )}
                                    </div>
                                </div>

                                {/* Attachments — Gmail-style cards */}
                                {(selected.attachments || []).length > 0 && (
                                    <div style={{ marginTop: '16px' }}>
                                        <div style={{ fontSize: '12px', color: '#5f6368', fontWeight: 500, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                            <i className="bi bi-paperclip me-1"></i>{selected.attachments.length} {t('Attachment')}{selected.attachments.length !== 1 ? 's' : ''}
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                            {selected.attachments.map((att, i) => {
                                                const isPDF = att.content_type === 'application/pdf' || att.filename?.toLowerCase().endsWith('.pdf');
                                                const isImage = att.content_type?.startsWith('image/');
                                                const isExcel = att.filename?.match(/\.(xlsx?|csv)$/i);
                                                const icon = isPDF ? 'bi-file-earmark-pdf text-danger' : isImage ? 'bi-file-earmark-image text-primary' : isExcel ? 'bi-file-earmark-excel text-success' : 'bi-file-earmark text-secondary';
                                                return (
                                                    <div key={i} style={{ border: '1px solid #dadce0', borderRadius: '8px', padding: '10px 14px', minWidth: '180px', maxWidth: '220px', background: '#f8f9fa' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                            <i className={`bi ${icon}`} style={{ fontSize: '22px' }}></i>
                                                            <div style={{ overflow: 'hidden' }}>
                                                                <div style={{ fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{att.filename || `Attachment ${i + 1}`}</div>
                                                                {att.size > 0 && <div style={{ fontSize: '11px', color: '#5f6368' }}>{(att.size / 1024).toFixed(0)} KB</div>}
                                                            </div>
                                                        </div>
                                                        {att.url && (
                                                            <a href={att.url} target="_blank" rel="noreferrer" download={att.filename}
                                                                style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#1a73e8', textDecoration: 'none', marginTop: '6px' }}>
                                                                <i className="bi bi-download"></i> Download
                                                            </a>
                                                        )}
                                                        {!att.url && <span style={{ fontSize: '11px', color: '#9aa0a6' }}>Not downloaded</span>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-outline-danger btn-sm" onClick={() => handleDelete(selected.id)}>
                                    <i className="bi bi-trash3 me-1"></i>{t('Delete')}
                                </button>
                                <button className="btn btn-secondary btn-sm" onClick={() => setSelected(null)}>{t('Close')}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
