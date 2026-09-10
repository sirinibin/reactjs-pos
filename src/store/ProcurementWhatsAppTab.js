import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';

const PAGE_SIZE = 20;

const directionBadge = dir =>
    dir === 'in'
        ? <span className="badge" style={{ background: '#d5f0dd', color: '#1e7e34', fontSize: '11px' }}>&#8595; In</span>
        : <span className="badge" style={{ background: '#cce5ff', color: '#004085', fontSize: '11px' }}>&#8593; Out</span>;

const msgTypeIcon = t => {
    const icons = { text: '💬', image: '🖼️', document: '📄', audio: '🎵', video: '🎥', sticker: '🪄' };
    return icons[t] || '💬';
};

const WA_GREEN = '#25D366';

export default function ProcurementWhatsAppTab({ storeId }) {
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
            const params = new URLSearchParams({ store_id: storeId, type: 'whatsapp', page: pg, limit: PAGE_SIZE });
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
                <i className="bi bi-whatsapp" style={{ fontSize: '20px', color: WA_GREEN }}></i>
                <h5 style={{ margin: 0, fontWeight: 600, fontSize: '15px' }}>{t('WhatsApp Messages')}</h5>
                <span className="badge bg-secondary ms-auto">{total} {t('messages')}</span>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                <div className="input-group input-group-sm" style={{ maxWidth: '300px' }}>
                    <span className="input-group-text"><i className="bi bi-search"></i></span>
                    <input
                        className="form-control"
                        placeholder={t('Search from, content...')}
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
                <table className="table table-sm table-hover" style={{ fontSize: '13px', minWidth: '540px' }}>
                    <thead>
                        <tr style={{ background: '#f8f9fa' }}>
                            <th style={{ width: 60 }}></th>
                            <th>{t('From')}</th>
                            <th>{t('Message')}</th>
                            <th style={{ width: 80 }}>{t('Type')}</th>
                            <th style={{ width: 130 }}>{t('Date')}</th>
                            <th style={{ width: 80 }}>{t('Attachments')}</th>
                            <th style={{ width: 60 }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && (
                            <tr><td colSpan={7} className="text-center py-4">
                                <span className="spinner-border spinner-border-sm me-2" role="status" />
                                {t('Loading...')}
                            </td></tr>
                        )}
                        {!loading && messages.length === 0 && (
                            <tr><td colSpan={7} className="text-center py-4 text-muted">
                                <i className="bi bi-chat-square" style={{ fontSize: '24px', display: 'block', marginBottom: '6px' }}></i>
                                {t('No WhatsApp messages logged yet')}
                            </td></tr>
                        )}
                        {messages.map(msg => (
                            <tr
                                key={msg.id}
                                style={{ cursor: 'pointer', fontWeight: msg.read ? 400 : 700, background: msg.processed_as_rfq ? '#f0fff4' : undefined }}
                                onClick={() => openMessage(msg)}
                            >
                                <td style={{ verticalAlign: 'middle' }}>{directionBadge(msg.direction)}</td>
                                <td style={{ verticalAlign: 'middle', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {msg.from || <span className="text-muted">—</span>}
                                </td>
                                <td style={{ verticalAlign: 'middle', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {msg.processed_as_rfq && <span title={t('Processed as RFQ')} className="me-1">✅</span>}
                                    {msg.body_text || <span className="text-muted">{t('(media)')}</span>}
                                </td>
                                <td style={{ verticalAlign: 'middle' }}>
                                    <span title={msg.wa_message_type}>{msgTypeIcon(msg.wa_message_type)} {msg.wa_message_type || 'text'}</span>
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
                    <div className="modal-dialog modal-lg modal-dialog-scrollable" style={{ maxWidth: '640px' }}>
                        <div className="modal-content">
                            <div className="modal-header" style={{ background: '#f0fdf4', borderBottom: `3px solid ${WA_GREEN}` }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                        <i className="bi bi-whatsapp" style={{ color: WA_GREEN }}></i>
                                        {directionBadge(selected.direction)}
                                        <span style={{ fontSize: '11px', color: '#6c757d' }}>
                                            {msgTypeIcon(selected.wa_message_type)} {selected.wa_message_type || 'text'}
                                        </span>
                                        {selected.processed_as_rfq && (
                                            <span className="badge bg-success" style={{ fontSize: '11px' }}>✅ {t('RFQ Created')}</span>
                                        )}
                                    </div>
                                    <div style={{ fontWeight: 600, fontSize: '14px', marginTop: '4px' }}>
                                        {selected.from || t('Unknown sender')}
                                    </div>
                                </div>
                                <button className="btn-close" onClick={() => setSelected(null)} />
                            </div>
                            <div className="modal-body">
                                <table className="table table-sm" style={{ fontSize: '13px', marginBottom: '16px' }}>
                                    <tbody>
                                        <tr><th style={{ width: 130, fontWeight: 600 }}>{t('From')}</th><td>{selected.from}</td></tr>
                                        {(selected.to || []).length > 0 && (
                                            <tr><th style={{ fontWeight: 600 }}>{t('To')}</th><td>{(selected.to || []).join(', ')}</td></tr>
                                        )}
                                        {selected.waba_phone_number_id && (
                                            <tr><th style={{ fontWeight: 600 }}>{t('WABA Phone ID')}</th><td><code>{selected.waba_phone_number_id}</code></td></tr>
                                        )}
                                        <tr>
                                            <th style={{ fontWeight: 600 }}>{t('Date')}</th>
                                            <td>{selected.created_at ? new Date(selected.created_at).toLocaleString() : '—'}</td>
                                        </tr>
                                    </tbody>
                                </table>

                                {/* WhatsApp bubble style */}
                                <div style={{ display: 'flex', justifyContent: selected.direction === 'out' ? 'flex-end' : 'flex-start' }}>
                                    <div style={{
                                        background: selected.direction === 'out' ? '#dcf8c6' : '#fff',
                                        border: '1px solid #e0e0e0',
                                        borderRadius: selected.direction === 'out' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                        padding: '10px 14px',
                                        maxWidth: '85%',
                                        fontSize: '13px',
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.12)',
                                    }}>
                                        {selected.body_text || <span style={{ color: '#6c757d', fontStyle: 'italic' }}>{t('(media message)')}</span>}
                                        <div style={{ fontSize: '10px', color: '#999', marginTop: '4px', textAlign: 'right' }}>
                                            {selected.created_at ? new Date(selected.created_at).toLocaleTimeString() : ''}
                                            {selected.direction === 'out' && <i className="bi bi-check2-all ms-1" style={{ color: '#34b7f1' }}></i>}
                                        </div>
                                    </div>
                                </div>

                                {(selected.attachments || []).length > 0 && (
                                    <div style={{ marginTop: '12px' }}>
                                        <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '6px' }}>{t('Attachments')}</div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                            {selected.attachments.map((att, i) => (
                                                <div key={i} style={{ border: '1px solid #dee2e6', borderRadius: '6px', padding: '8px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <i className="bi bi-paperclip"></i>
                                                    <span>{att.filename || att.content_type}</span>
                                                    {att.size > 0 && <span className="text-muted">({(att.size / 1024).toFixed(1)} KB)</span>}
                                                    {att.url && (
                                                        <a href={att.url} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-primary" style={{ padding: '2px 8px', fontSize: '11px' }}>
                                                            <i className="bi bi-download me-1"></i>{t('Download')}
                                                        </a>
                                                    )}
                                                </div>
                                            ))}
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
