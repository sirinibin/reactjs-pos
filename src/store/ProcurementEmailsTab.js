import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory, useLocation } from 'react-router-dom';
import { AI_PROVIDERS, modelsForProvider, fileCapabilityLabel } from '../utils/aiProviders.js';
import RFQCreate from '../rfq_received/create.js';
import { ForwardDetail, RFQSendModal } from '../rfq_received/index.js';
import EmailDetailModal from './EmailDetailModal.js';

const PAGE_SIZE = 20;

const directionBadge = dir =>
    dir === 'in'
        ? <span className="badge" style={{ background: '#dff0d8', color: '#3c763d', fontSize: '11px' }}>&#8595; In</span>
        : <span className="badge" style={{ background: '#d9edf7', color: '#31708f', fontSize: '11px' }}>&#8593; Out</span>;

const providerIcon = p => {
    const icons = { zoho: '🟡', gmail: '🔴', outlook: '🔵', smtp: '📧', sendgrid: '⚡', mailgun: '🔫', ses: '☁️', postmark: '📮', brevo: '🟣', resend: '⚡' };
    return icons[p] || '📧';
};

// AI_PROVIDERS and modelsForProvider are imported from ../utils/aiProviders.js

// ── ExtractModal ──────────────────────────────────────────────────────────────
export function ExtractModal({ msg, storeId, token, onClose, onCreateRFQ }) {
    const { t } = useTranslation();
    const [showEmailDetail, setShowEmailDetail] = useState(false);

    const storeSettings = (() => { try { return JSON.parse(localStorage.getItem('_store_settings_cache') || 'null'); } catch (_) { return null; } })();

    const defaultProvider = (() => {
        const last = localStorage.getItem('_rfq_extract_provider');
        if (last && AI_PROVIDERS.find(p => p.value === last)) return AI_PROVIDERS.find(p => p.value === last);
        return AI_PROVIDERS.find(p => storeSettings?.[p.apiKeyField]) || AI_PROVIDERS[0];
    })();

    const defaultModel = (() => {
        const lastProv = localStorage.getItem('_rfq_extract_provider');
        const lastMod  = localStorage.getItem('_rfq_extract_model');
        if (lastProv && lastMod && modelsForProvider(lastProv).find(m => m.value === lastMod)) return lastMod;
        return modelsForProvider(defaultProvider.value)[0]?.value || '';
    })();

    const [provider, setProvider]   = useState(defaultProvider.value);
    const [model, setModel]         = useState(defaultModel);
    const [files, setFiles]         = useState([]);
    const [extracting, setExtracting] = useState(false);
    const [result, setResult]       = useState(null);
    const [error, setError]         = useState('');
    const fileInputRef = useRef(null);

    const handleProviderChange = prov => {
        setProvider(prov);
        const firstModel = modelsForProvider(prov)[0]?.value || '';
        setModel(firstModel);
        try { localStorage.setItem('_rfq_extract_provider', prov); localStorage.setItem('_rfq_extract_model', firstModel); } catch (_) {}
    };

    const activeProviderDef = AI_PROVIDERS.find(p => p.value === provider);
    const hasApiKey = !!(storeSettings?.[activeProviderDef?.apiKeyField]);

    const handleFiles = e => {
        const incoming = Array.from(e.target.files || []);
        setFiles(prev => [...prev, ...incoming]);
        e.target.value = '';
    };

    const removeFile = idx => setFiles(prev => prev.filter((_, i) => i !== idx));

    const handleExtract = async () => {
        setError('');
        setResult(null);
        if (!hasApiKey) { setError(t('No API key saved for this provider. Add it under Store → AI Models.')); return; }
        setExtracting(true);
        const ctrl = new AbortController();
        const timeoutId = setTimeout(() => ctrl.abort(), 300_000); // 5-minute client timeout
        try {
            const fd = new FormData();
            fd.append('llm_provider', provider);
            fd.append('llm_model', model);
            files.forEach(f => fd.append('files', f));
            const res = await fetch(`/v1/procurement-messages/${msg.id}/extract?store_id=${storeId}`, {
                method: 'POST',
                headers: { Authorization: token },
                body: fd,
                signal: ctrl.signal,
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || t('Extraction failed')); return; }
            setResult(data);
        } catch (err) {
            if (err.name === 'AbortError') {
                setError(t('Request timed out after 5 minutes. Try a faster model or smaller attachment.'));
            } else {
                setError(err.message || t('Network error'));
            }
        } finally {
            clearTimeout(timeoutId);
            setExtracting(false);
        }
    };

    return (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.5)', zIndex: 10000 }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="modal-dialog modal-xl modal-dialog-scrollable" style={{ maxWidth: '860px' }}>
                <div className="modal-content">
                    <div className="modal-header" style={{ background: '#f0f4ff' }}>
                        <h6 className="modal-title fw-bold" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <i className="bi bi-magic me-1 text-primary"></i>
                            {t('Extract RFQ Data')}
                            {msg.code && (
                                <span
                                    role="button"
                                    tabIndex={0}
                                    title="View email"
                                    onClick={() => setShowEmailDetail(true)}
                                    style={{ fontSize: '12px', fontWeight: 600, color: '#0d6efd', background: '#e8f0fe', borderRadius: '6px', padding: '2px 8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                >
                                    <i className="bi bi-envelope" style={{ fontSize: '11px' }}></i>
                                    {msg.code}
                                </span>
                            )}
                            {msg.subject && <small className="text-muted fw-normal" style={{ fontSize: '13px' }}>— {msg.subject}</small>}
                        </h6>
                        <button className="btn-close" onClick={onClose} />
                    </div>
                    {showEmailDetail && (
                        <EmailDetailModal
                            msg={msg}
                            show={showEmailDetail}
                            onClose={() => setShowEmailDetail(false)}
                            storeId={storeId}
                            token={token}
                        />
                    )}
                    <div className="modal-body">
                        {/* Provider + Model */}
                        <div className="row g-3 mb-4">
                            <div className="col-md-4">
                                <label className="form-label fw-semibold" style={{ fontSize: '13px' }}>{t('Provider')}</label>
                                <select
                                    className="form-select form-select-sm"
                                    value={provider}
                                    onChange={e => handleProviderChange(e.target.value)}
                                >
                                    {AI_PROVIDERS.map(p => {
                                        const hasKey = !!(storeSettings?.[p.apiKeyField]);
                                        return (
                                            <option key={p.value} value={p.value}>
                                                {p.label}{hasKey ? ' ✅' : ''}
                                            </option>
                                        );
                                    })}
                                </select>
                                {!hasApiKey && (
                                    <div style={{ fontSize: '11px', color: '#dc3545', marginTop: '3px' }}>
                                        No API key saved — add it under Store → AI Models
                                    </div>
                                )}
                                {hasApiKey && (
                                    <div style={{ fontSize: '11px', color: '#198754', marginTop: '3px' }}>
                                        ✅ {t('API key from store settings')}
                                    </div>
                                )}
                            </div>
                            <div className="col-md-8">
                                <label className="form-label fw-semibold" style={{ fontSize: '13px' }}>{t('Model')} <span className="text-muted fw-normal" style={{ fontSize: '11px' }}>({t('sorted cheapest first')})</span></label>
                                <select
                                    className="form-select form-select-sm"
                                    value={model}
                                    onChange={e => { setModel(e.target.value); try { localStorage.setItem('_rfq_extract_model', e.target.value); } catch (_) {} }}
                                >
                                    {modelsForProvider(provider).map(m => (
                                        <option key={m.value} value={m.value}>
                                            {m.label} — {m.costLabel}{m.badge ? ` (${m.badge})` : ''}{fileCapabilityLabel(m)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Slow-model warning */}
                        {modelsForProvider(provider).find(m => m.value === model)?.badge?.includes('Reasoning') && (
                            <div className="alert alert-warning py-2 mb-3" style={{ fontSize: '12px' }}>
                                <i className="bi bi-clock me-1"></i>{t('Reasoning models can take 1–3 minutes. Please wait after clicking Extract.')}
                            </div>
                        )}

                        {/* What will be sent */}
                        <div className="mb-3" style={{ background: '#f8f9fa', borderRadius: '8px', padding: '12px 14px', fontSize: '13px' }}>
                            <div className="fw-semibold mb-1" style={{ fontSize: '13px' }}><i className="bi bi-info-circle me-1 text-primary"></i>{t('Content that will be sent to the LLM:')}</div>
                            <ul style={{ marginBottom: 0, paddingLeft: '20px' }}>
                                <li>{t('Email subject + body text')}</li>
                                {(msg.attachments || []).filter(a => a.url).length > 0 && (
                                    <li>{(msg.attachments || []).filter(a => a.url).length} {t('email attachment(s)')} ({(msg.attachments || []).filter(a => a.url).map(a => a.filename).join(', ')})</li>
                                )}
                                {files.length > 0 && (
                                    <li>{files.length} {t('additional file(s) you uploaded below')}</li>
                                )}
                            </ul>
                        </div>

                        {/* Additional file upload */}
                        <div className="mb-3">
                            <label className="form-label fw-semibold" style={{ fontSize: '13px' }}>
                                {t('Additional Files')} <span className="text-muted fw-normal" style={{ fontSize: '12px' }}>({t('optional — image, PDF, Excel, Word (.docx), CSV, text')})</span>
                            </label>
                            <div
                                style={{ border: '2px dashed #ced4da', borderRadius: '8px', padding: '14px', textAlign: 'center', cursor: 'pointer', background: '#fafafa' }}
                                onClick={() => fileInputRef.current?.click()}
                                onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#0d6efd'; }}
                                onDragLeave={e => { e.currentTarget.style.borderColor = '#ced4da'; }}
                                onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#ced4da'; setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files || [])]); }}
                            >
                                <i className="bi bi-cloud-upload" style={{ fontSize: '22px', color: '#6c757d' }}></i>
                                <div style={{ fontSize: '13px', color: '#6c757d', marginTop: '4px' }}>{t('Click or drag files here')}</div>
                                <input ref={fileInputRef} type="file" multiple hidden onChange={handleFiles} accept=".pdf,.xlsx,.xls,.docx,.csv,.txt,.jpg,.jpeg,.png,.gif,.webp" />
                            </div>
                            {files.length > 0 && (
                                <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {files.map((f, i) => (
                                        <span key={i} className="badge bg-secondary d-flex align-items-center gap-1" style={{ fontSize: '12px', padding: '5px 8px' }}>
                                            {f.name}
                                            <button type="button" style={{ background: 'none', border: 'none', color: 'inherit', padding: 0, cursor: 'pointer', lineHeight: 1 }} onClick={() => removeFile(i)}>×</button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Error */}
                        {error && <div className="alert alert-danger py-2" style={{ fontSize: '13px' }}>{error}</div>}

                        {/* Result */}
                        {result && (
                            <div style={{ background: '#f0fff4', border: '1px solid #c3e6cb', borderRadius: '8px', padding: '16px', fontSize: '13px' }}>
                                <div className="fw-bold mb-3" style={{ fontSize: '14px' }}>
                                    <i className="bi bi-check-circle-fill text-success me-2"></i>
                                    {t('Extraction complete')} {result.llm_model && <span className="text-muted fw-normal" style={{ fontSize: '12px' }}>via {result.llm_model}</span>}
                                </div>

                                {/* Customer info */}
                                {(result.customer_name || result.customer_phone || result.customer_email || result.customer_company) && (
                                    <div className="mb-3">
                                        <div className="fw-semibold mb-1" style={{ color: '#155724' }}>{t('Customer')}</div>
                                        <table className="table table-sm table-bordered" style={{ fontSize: '12px', maxWidth: '480px' }}>
                                            <tbody>
                                                {result.customer_name    && <tr><th style={{ width: 100 }}>{t('Name')}</th><td>{result.customer_name}</td></tr>}
                                                {result.customer_company && <tr><th>{t('Company')}</th><td>{result.customer_company}</td></tr>}
                                                {result.customer_phone   && <tr><th>{t('Phone')}</th><td>{result.customer_phone}</td></tr>}
                                                {result.customer_email   && <tr><th>{t('Email')}</th><td>{result.customer_email}</td></tr>}
                                                {result.customer_vat_no  && <tr><th>{t('VAT No')}</th><td>{result.customer_vat_no}</td></tr>}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {/* Products */}
                                {(result.products || []).length > 0 && (
                                    <div className="mb-3">
                                        <div className="fw-semibold mb-1" style={{ color: '#155724' }}>{t('Products')} ({result.products.length})</div>
                                        <div style={{ overflowX: 'auto' }}>
                                            <table className="table table-sm table-bordered" style={{ fontSize: '12px' }}>
                                                <thead className="table-light">
                                                    <tr>
                                                        <th>#</th>
                                                        <th>{t('Part No')}</th>
                                                        <th>{t('Name / Description')}</th>
                                                        <th>{t('Qty')}</th>
                                                        <th>{t('Unit')}</th>
                                                        <th>{t('Notes')}</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {result.products.map((p, i) => (
                                                        <tr key={i}>
                                                            <td>{i + 1}</td>
                                                            <td>{p.part_no || '—'}</td>
                                                            <td>{p.name}</td>
                                                            <td>{p.quantity || 1}</td>
                                                            <td>{p.unit || '—'}</td>
                                                            <td style={{ maxWidth: '280px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '11px' }}>{p.notes || '—'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* General Instructions */}
                                {result.general_instructions && (
                                    <div className="mb-3">
                                        <div className="fw-semibold mb-1" style={{ color: '#155724' }}><i className="bi bi-info-circle me-1"></i>{t('General Instructions')}</div>
                                        <div style={{ background: '#fff', border: '1px solid #c3e6cb', borderRadius: '6px', padding: '10px 12px', fontSize: '12px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                            {result.general_instructions}
                                        </div>
                                    </div>
                                )}

                                {/* Raw text if no structured data */}
                                {!result.products?.length && result.text_content && (
                                    <div>
                                        <div className="fw-semibold mb-1" style={{ color: '#155724' }}>{t('Extracted text')}</div>
                                        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '12px', background: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid #c3e6cb', maxHeight: '300px', overflow: 'auto' }}>{result.text_content}</pre>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="modal-footer">
                        {result && onCreateRFQ && (
                            <button
                                className="btn btn-success btn-sm me-auto"
                                onClick={() => { onCreateRFQ(result); onClose(); }}
                            >
                                <i className="bi bi-file-earmark-plus me-1"></i>{t('Create RFQ')}
                            </button>
                        )}
                        <button
                            className="btn btn-primary btn-sm"
                            onClick={handleExtract}
                            disabled={extracting || !hasApiKey}
                        >
                            {extracting
                                ? <><span className="spinner-border spinner-border-sm me-1" role="status" />{t('Extracting…')}</>
                                : <><i className="bi bi-magic me-1"></i>{t('Extract')}</>}
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={onClose}>{t('Close')}</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ProcurementEmailsTab({ storeId }) {
    const { t } = useTranslation();
    const token = localStorage.getItem('access_token');
    const history = useHistory();
    const location = useLocation();
    const [messages, setMessages] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    // Pre-fill search from ?email= URL param so linking from supplier/customer opens filtered view
    const [search, setSearch] = useState(() => new URLSearchParams(location.search).get('email') || '');
    const [direction, setDirection] = useState('');
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [syncing, setSyncing] = useState(false);
    const [deletingAll, setDeletingAll] = useState(false);
    const [diskUsage, setDiskUsage] = useState(null);
    const [rfqFilter, setRfqFilter] = useState('');
    // eslint-disable-next-line no-unused-vars
    const [creatingRfq, setCreatingRfq] = useState(null); // message id currently creating RFQ
    const [extractMsg, setExtractMsg] = useState(null);   // message currently being extracted
    const [retryingAttachments, setRetryingAttachments] = useState(null); // message id being retried
    // eslint-disable-next-line no-unused-vars
    const uploadInputRef = useRef(null);
    const rfqCreateRef = useRef(null);
    const [toast, setToast] = useState(null);
    const toastTimer = useRef(null);
    const showToast = (msg, type = 'success') => {
        clearTimeout(toastTimer.current);
        setToast({ msg, type });
        toastTimer.current = setTimeout(() => setToast(null), 4000);
    };
    const [uploadingFor, setUploadingFor] = useState(null); // message id for manual upload
    const [linkingFor, setLinkingFor] = useState(null);
    const [rfqDetail, setRfqDetail] = useState(null);
    const [rfqForSend, setRfqForSend] = useState(null);
    const [showSendModal, setShowSendModal] = useState(false);
    const isAdmin = localStorage.getItem('user_role') === 'Admin';
    const searchTimeout = useRef(null);

    // Read auto-RFQ flag from cached store settings
    const storeSettings = (() => { try { return JSON.parse(localStorage.getItem('_store_settings_cache') || 'null'); } catch (_) { return null; } })();
    // eslint-disable-next-line no-unused-vars
    const autoRfqDisabled = storeSettings?.disable_auto_rfq_from_email === true;

    const load = useCallback(async (pg = 1, q = search, dir = direction, rfq = rfqFilter) => {
        if (!storeId) return;
        setLoading(true);
        try {
            const params = new URLSearchParams({ store_id: storeId, type: 'email', page: pg, limit: PAGE_SIZE });
            if (q) params.set('search', q);
            if (dir) params.set('direction', dir);
            if (rfq) params.set('rfq_filter', rfq);
            const res = await fetch(`/v1/procurement-messages?${params}`, { headers: { Authorization: token } });
            const data = await res.json();
            setMessages(data.messages || []);
            setTotal(data.total || 0);
            setPage(pg);
        } finally { setLoading(false); }
    }, [storeId, token, search, direction, rfqFilter]);

    useEffect(() => {
        load(1);
        if (storeId) {
            fetch(`/v1/procurement-messages/disk-usage?store_id=${storeId}`, { headers: { Authorization: token } })
                .then(r => r.json()).then(d => setDiskUsage(d.formatted)).catch(() => {});
        }
    }, [storeId]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleSearch = e => {
        const q = e.target.value;
        setSearch(q);
        clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => load(1, q, direction), 350);
    };

    const handleDirection = e => {
        const d = e.target.value;
        setDirection(d);
        load(1, search, d, rfqFilter);
    };

    const handleRfqFilter = e => {
        const f = e.target.value;
        setRfqFilter(f);
        load(1, search, direction, f);
    };

    const openRfqModal = async (rfqId, e) => {
        e.stopPropagation();
        try {
            const res = await fetch(`/v1/rfq-received/${rfqId}?store_id=${storeId}`, { headers: { Authorization: token } });
            const data = await res.json();
            if (data?.id) setRfqDetail(data);
        } catch (_) {}
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

    // eslint-disable-next-line no-unused-vars
    const handleCreateRfq = async (id, e) => {
        e.stopPropagation();
        setCreatingRfq(id);
        try {
            const res = await fetch(`/v1/procurement-messages/${id}/create-rfq`, {
                method: 'POST', headers: { Authorization: token },
            });
            const data = await res.json();
            if (res.ok && data.rfq_id) {
                try { sessionStorage.setItem('_rfq_auto_send', data.rfq_id); } catch (_) {}
                history.push('/dashboard/rfq-received?t=' + Date.now());
            } else {
                alert(data.error || t('Failed to create RFQ'));
            }
        } catch (err) {
            alert(t('Network error'));
        } finally {
            setCreatingRfq(null);
        }
    };

    const handleDelete = async id => {
        if (!window.confirm(t('Confirm delete this message?'))) return;
        setDeleting(id);
        await fetch(`/v1/procurement-messages/${id}`, { method: 'DELETE', headers: { Authorization: token } });
        setDeleting(null);
        setSelected(null);
        load(page);
    };

    const handleRetryAttachments = async (id, e) => {
        if (e) e.stopPropagation();
        setRetryingAttachments(id);
        try {
            const resp = await fetch(`/v1/procurement-messages/${id}/retry-attachments`, { method: 'POST', headers: { Authorization: token } });
            const data = await resp.json();
            if (data.success) {
                load(page);
            } else {
                alert(t('Could not download attachment: ') + (data.message || t('Unknown error')));
            }
        } catch (err) {
            alert(t('Network error retrying attachment'));
        }
        setRetryingAttachments(null);
    };

    const handleUploadAttachment = async (id, file, e) => {
        if (e) e.stopPropagation();
        setUploadingFor(id);
        try {
            const form = new FormData();
            form.append('file', file);
            const resp = await fetch(`/v1/procurement-messages/${id}/upload-attachment`, {
                method: 'POST',
                headers: { Authorization: token },
                body: form,
            });
            const data = await resp.json();
            if (data.success) {
                load(page);
                if (selected && selected.id === id) {
                    setSelected(prev => ({ ...prev, attachments: data.attachments, attachment_missing: false }));
                }
            } else {
                alert(t('Upload failed: ') + (data.error || t('Unknown error')));
            }
        } catch (err) {
            alert(t('Network error uploading attachment'));
        }
        setUploadingFor(null);
    };

    const handleLinkAsQuotation = async (msg, e) => {
        if (e) e.stopPropagation();
        setLinkingFor(msg.id);
        try {
            const isLinked = !!msg.is_supplier_quotation;
            const resp = await fetch(`/v1/procurement-messages/${msg.id}/link-as-quotation`, {
                method: 'POST',
                headers: { Authorization: token, 'Content-Type': 'application/json' },
                body: JSON.stringify({ unlink: isLinked }),
            });
            const data = await resp.json();
            if (data.success) {
                const label = isLinked ? t('Quotation label removed') : t('Labelled as Supplier Quotation');
                const rfqInfo = (!isLinked && data.matched_rfq_code) ? ` — ${t('Matched to')} ${data.matched_rfq_code}` : '';
                showToast(label + rfqInfo, 'success');
                load(page);
                if (selected && selected.id === msg.id) {
                    setSelected(prev => ({
                        ...prev,
                        is_supplier_quotation: !isLinked,
                        linked_rfq_received_id: data.matched_rfq_id || prev.linked_rfq_received_id,
                        linked_rfq_received_code: data.matched_rfq_code || prev.linked_rfq_received_code,
                    }));
                }
            } else {
                showToast(t('Error: ') + (data.error || t('Unknown error')), 'danger');
            }
        } catch (err) {
            showToast(t('Network error'), 'danger');
        }
        setLinkingFor(null);
    };

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    return (
        <div style={{ padding: '16px' }}>
            {/* Toast */}
            {toast && (
                <div className={`alert alert-${toast.type === 'danger' ? 'danger' : toast.type === 'success' ? 'success' : 'info'} alert-dismissible py-2`}
                    style={{ position: 'fixed', top: '16px', right: '16px', zIndex: 99999, minWidth: '260px', fontSize: '13px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
                    {toast.msg}
                    <button type="button" className="btn-close" onClick={() => setToast(null)} />
                </div>
            )}
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <i className="bi bi-envelope-open" style={{ fontSize: '18px', color: '#2563eb' }}></i>
                <h5 style={{ margin: 0, fontWeight: 600, fontSize: '15px' }}>{t('Emails')}</h5>
                <span className="badge bg-secondary ms-auto">{total} {t('messages')}</span>
                {diskUsage && (
                    <span className="badge bg-light text-muted border" style={{ fontSize: '11px' }}>
                        <i className="bi bi-hdd me-1"></i>{diskUsage} {t('used')}
                    </span>
                )}
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
                <select className="form-select form-select-sm" style={{ width: '160px' }} value={rfqFilter} onChange={handleRfqFilter}>
                    <option value="">{t('All emails')}</option>
                    <option value="yes">{t('RFQ Created')}</option>
                    <option value="quotation">{t('Quotation')}</option>
                    <option value="other">{t('Other')}</option>
                    <option value="no">{t('No RFQ')}</option>
                </select>
                <button
                    className="btn btn-sm btn-outline-primary ms-auto"
                    disabled={syncing}
                    title={t('Sync now')}
                    onClick={async () => {
                        setSyncing(true);
                        try {
                            await fetch(`/v1/email-accounts/sync?store_id=${storeId}`, {
                                method: 'POST', headers: { Authorization: token },
                            });
                            // Sync runs in background — reload at 5s and again at 12s
                            // to catch emails as they arrive (Zoho API calls take time).
                            setTimeout(() => load(1), 5000);
                            setTimeout(() => { load(1); setSyncing(false); }, 12000);
                        } catch { setSyncing(false); load(page); }
                    }}
                >
                    {syncing
                        ? <><span className="spinner-border spinner-border-sm me-1" role="status" />{t('Syncing…')}</>
                        : <><i className="bi bi-cloud-download me-1"></i>{t('Sync Now')}</>
                    }
                </button>
                <button className="btn btn-sm btn-outline-secondary" onClick={() => load(page)} title={t('Refresh list')}>
                    <i className="bi bi-arrow-clockwise"></i>
                </button>
                {isAdmin && (
                    <button
                        className="btn btn-sm btn-outline-danger"
                        disabled={deletingAll}
                        title={t('Delete all emails (admin only)')}
                        onClick={async () => {
                            if (!window.confirm(t('Delete ALL emails for this store? This cannot be undone.'))) return;
                            setDeletingAll(true);
                            try {
                                await fetch(`/v1/procurement-messages?store_id=${storeId}&type=email`, {
                                    method: 'DELETE', headers: { Authorization: token },
                                });
                                load(1);
                            } finally { setDeletingAll(false); }
                        }}
                    >
                        {deletingAll
                            ? <><span className="spinner-border spinner-border-sm me-1" role="status" />{t('Deleting…')}</>
                            : <><i className="bi bi-trash3-fill me-1"></i>{t('Delete All')}</>}
                    </button>
                )}
            </div>

            {/* Table */}
            {!loading && total > 0 && (
                <div className="d-flex justify-content-between align-items-center mb-2">
                    <small style={{ color: '#6c757d', fontSize: '12px' }}>
                        Showing {((page - 1) * PAGE_SIZE + 1).toLocaleString()}–{Math.min(page * PAGE_SIZE, total).toLocaleString()} of {total.toLocaleString()} | Page {page} of {totalPages.toLocaleString()}
                    </small>
                </div>
            )}
            <div style={{ overflowX: 'auto' }}>
                <table className="table table-sm table-hover" style={{ fontSize: '13px', minWidth: '600px' }}>
                    <thead>
                        <tr style={{ background: '#f8f9fa' }}>
                            <th style={{ width: 90 }}>{t('ID')}</th>
                            <th style={{ width: 60 }}></th>
                            <th>{t('From')}</th>
                            <th>{t('Subject')}</th>
                            <th style={{ width: 90 }}>{t('Provider')}</th>
                            <th style={{ width: 140 }}>{t('Date')}</th>
                            <th style={{ width: 140 }}>{t('Created At')}</th>
                            <th style={{ width: 80 }}>{t('Attachments')}</th>
                            <th style={{ width: 140 }}>{t('RFQ')}</th>
                            <th style={{ width: 100 }}>{t('Actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && (
                            <tr><td colSpan={10} className="text-center py-4">
                                <span className="spinner-border spinner-border-sm me-2" role="status" />
                                {t('Loading...')}
                            </td></tr>
                        )}
                        {!loading && messages.length === 0 && (
                            <tr><td colSpan={10} className="text-center py-4 text-muted">
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
                                <td style={{ verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                    <code style={{ fontSize: '11px', color: '#6c757d' }}>{msg.code || '—'}</code>
                                </td>
                                <td style={{ verticalAlign: 'middle' }}>{directionBadge(msg.direction)}</td>
                                <td style={{ verticalAlign: 'middle', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {msg.from || <span className="text-muted">—</span>}
                                </td>
                                <td style={{ verticalAlign: 'middle', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {msg.processed_as_rfq && <span title={t('Processed as RFQ')} className="me-1">✅</span>}
                                    {msg.is_supplier_quotation && (
                                        <span className="badge bg-info text-dark me-1" style={{ fontSize: '10px' }} title={msg.linked_rfq_received_code ? `${t('Linked to')} ${msg.linked_rfq_received_code}` : t('Supplier Quotation')}>
                                            <i className="bi bi-receipt me-1"></i>{t('Quotation')}
                                            {msg.linked_rfq_received_code && ` (${msg.linked_rfq_received_code})`}
                                        </span>
                                    )}
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
                                    {msg.attachment_missing
                                        ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                            <span className="badge bg-warning text-dark" title={t('Email mentions attachments but none were received')}><i className="bi bi-exclamation-triangle-fill me-1"></i>{t('Missing')}</span>
                                            <button
                                                className="btn btn-sm btn-outline-warning"
                                                style={{ fontSize: '10px', padding: '1px 5px', whiteSpace: 'nowrap' }}
                                                title={t('Retry downloading attachment from Zoho')}
                                                disabled={retryingAttachments === msg.id || uploadingFor === msg.id}
                                                onClick={e => handleRetryAttachments(msg.id, e)}
                                            >
                                                {retryingAttachments === msg.id ? <i className="bi bi-hourglass-split"></i> : <i className="bi bi-arrow-repeat"></i>}
                                            </button>
                                            <label
                                                className="btn btn-sm btn-outline-secondary"
                                                style={{ fontSize: '10px', padding: '1px 5px', whiteSpace: 'nowrap', cursor: 'pointer', marginBottom: 0 }}
                                                title={t('Upload attachment manually')}
                                                onClick={e => e.stopPropagation()}
                                            >
                                                {uploadingFor === msg.id ? <i className="bi bi-hourglass-split"></i> : <i className="bi bi-upload"></i>}
                                                <input type="file" style={{ display: 'none' }} disabled={uploadingFor === msg.id || retryingAttachments === msg.id} onChange={e => { if (e.target.files[0]) handleUploadAttachment(msg.id, e.target.files[0]); e.target.value = ''; }} />
                                            </label>
                                          </span>
                                        : (msg.attachments || []).length > 0
                                            ? <span className="badge bg-secondary">{msg.attachments.length}</span>
                                            : <span className="text-muted">—</span>}
                                </td>
                                <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>
                                    {msg.rfq_received_id ? (
                                        <button
                                            className="btn btn-sm btn-outline-success"
                                            style={{ fontSize: '11px', padding: '2px 6px' }}
                                            title={t('View RFQ')}
                                            onClick={e => openRfqModal(msg.rfq_received_id, e)}
                                        >
                                            <i className="bi bi-file-earmark-text me-1"></i>
                                            {msg.rfq_received_code || t('View RFQ')}
                                        </button>
                                    ) : (
                                        <span className="text-muted" style={{ fontSize: '11px' }}>—</span>
                                    )}
                                </td>
                                <td style={{ verticalAlign: 'middle' }}>
                                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                                        {/* Link as Quotation button */}
                                        <button
                                            className={`btn btn-sm ${msg.is_supplier_quotation ? 'btn-info' : 'btn-outline-info'}`}
                                            title={msg.is_supplier_quotation ? t('Remove Quotation label') : t('Label as Supplier Quotation & auto-match RFQ')}
                                            disabled={linkingFor === msg.id}
                                            onClick={e => { e.stopPropagation(); handleLinkAsQuotation(msg, e); }}
                                            style={{ fontSize: '10px', padding: '2px 5px', whiteSpace: 'nowrap' }}
                                        >
                                            {linkingFor === msg.id
                                                ? <span className="spinner-border spinner-border-sm" role="status" />
                                                : <><i className="bi bi-receipt me-1"></i>{msg.is_supplier_quotation ? t('Unlink') : t('Quotation')}</>}
                                        </button>
                                        {/* Extract button */}
                                        <button
                                            className="btn btn-sm btn-outline-primary"
                                            title={t('Extract RFQ data with AI')}
                                            onClick={e => { e.stopPropagation(); setExtractMsg(msg); }}
                                            style={{ fontSize: '11px', padding: '2px 6px', whiteSpace: 'nowrap' }}
                                        >
                                            <i className="bi bi-magic me-1"></i>{t('Extract')}
                                        </button>
                                        {/* Delete button */}
                                        <button
                                            className="btn btn-sm btn-outline-danger"
                                            title={t('Delete')}
                                            style={{ fontSize: '11px', padding: '2px 6px' }}
                                            disabled={deleting === msg.id}
                                            onClick={e => { e.stopPropagation(); handleDelete(msg.id); }}
                                        >
                                            {deleting === msg.id
                                                ? <span className="spinner-border spinner-border-sm" role="status" />
                                                : <i className="bi bi-trash3"></i>}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px', gap: '4px' }}>
                    <button className="btn btn-sm btn-outline-secondary" disabled={page <= 1} onClick={() => load(page - 1)}>&laquo;</button>
                    <button className="btn btn-sm btn-outline-secondary" disabled={page >= totalPages} onClick={() => load(page + 1)}>&raquo;</button>
                </div>
            )}

            {/* Detail Modal */}
            <EmailDetailModal
                msg={selected}
                show={!!selected}
                onClose={() => setSelected(null)}
                storeId={storeId}
                token={token}
                onExtract={msg => setExtractMsg(msg)}
                onLinkQuotation={handleLinkAsQuotation}
                linkingFor={linkingFor}
                onDeleted={deletedId => { setSelected(null); setMessages(prev => prev.filter(m => m.id !== deletedId)); }}
            />

            {/* Extract Modal */}
            {extractMsg && (
                <ExtractModal
                    msg={extractMsg}
                    storeId={storeId}
                    token={token}
                    onClose={() => setExtractMsg(null)}
                    onCreateRFQ={data => {
                        const msgId = extractMsg?.id;
                        const msgCode = extractMsg?.code;
                        setExtractMsg(null);
                        rfqCreateRef.current?.openFromExtraction(data, msgId, msgCode);
                    }}
                />
            )}

            {/* RFQ Create modal (opened from extraction) */}
            <RFQCreate
                ref={rfqCreateRef}
                showToastMessage={showToast}
                onCreated={newRfq => {
                    if (newRfq?.id) {
                        setRfqForSend(newRfq);
                        setShowSendModal(true);
                    }
                }}
            />

            {/* RFQ Detail modal — opened inline from the RFQ column button */}
            <ForwardDetail
                rfq={rfqDetail}
                show={!!rfqDetail}
                storeId={storeId}
                onHide={() => setRfqDetail(null)}
                onSendToSuppliers={rfq => { setRfqForSend(rfq); setShowSendModal(true); }}
            />

            {/* Send RFQ modal — stays on this page, no navigation */}
            <RFQSendModal
                rfq={rfqForSend}
                storeId={storeId}
                show={showSendModal}
                onHide={() => setShowSendModal(false)}
                onSent={() => load(page)}
            />

        </div>
    );
}
