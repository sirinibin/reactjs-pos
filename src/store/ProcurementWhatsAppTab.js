import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { AI_PROVIDERS, modelsForProvider, fileCapabilityLabel } from '../utils/aiProviders.js';
import RFQCreate from '../rfq_received/create.js';

const PAGE_SIZE = 20;

const directionBadge = dir =>
    dir === 'in'
        ? <span className="badge" style={{ background: '#d5f0dd', color: '#1e7e34', fontSize: '11px' }}>&#8595; In</span>
        : <span className="badge" style={{ background: '#cce5ff', color: '#004085', fontSize: '11px' }}>&#8593; Out</span>;

const msgTypeIcon = t => {
    const icons = { text: '💬', image: '🖼️', document: '📄', audio: '🎵', voice: '🎙️', video: '🎥', sticker: '🪄' };
    return icons[t] || '💬';
};

const isImageMime = mime => mime && mime.startsWith('image/');
const isAudioMime = mime => mime && mime.startsWith('audio/');
const isVideoMime = mime => mime && mime.startsWith('video/');

const AttachmentPreview = ({ att }) => {
    if (isImageMime(att.content_type)) {
        return (
            <div style={{ marginBottom: '8px' }}>
                <img
                    src={att.url}
                    alt={att.filename}
                    style={{ maxWidth: '100%', maxHeight: '320px', borderRadius: '8px', border: '1px solid #dee2e6', display: 'block' }}
                />
                {att.filename && <div style={{ fontSize: '11px', color: '#6c757d', marginTop: '3px' }}>{att.filename}</div>}
            </div>
        );
    }
    if (isVideoMime(att.content_type)) {
        return (
            <div style={{ marginBottom: '8px' }}>
                <video controls style={{ maxWidth: '100%', maxHeight: '320px', borderRadius: '8px', border: '1px solid #dee2e6', display: 'block' }}>
                    <source src={att.url} type={att.content_type} />
                    Your browser does not support video.
                </video>
                {att.filename && <div style={{ fontSize: '11px', color: '#6c757d', marginTop: '3px' }}>{att.filename}</div>}
            </div>
        );
    }
    if (isAudioMime(att.content_type)) {
        return (
            <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>🎙️</span>
                <audio controls style={{ flex: 1, height: '36px' }}>
                    <source src={att.url} type={att.content_type} />
                    Your browser does not support audio.
                </audio>
            </div>
        );
    }
    const docIcon = att.filename?.endsWith('.pdf') ? '📄' : att.filename?.match(/\.(xls|xlsx)$/) ? '📊' : att.filename?.match(/\.(doc|docx)$/) ? '📝' : '📎';
    return (
        <div style={{ border: '1px solid #dee2e6', borderRadius: '6px', padding: '8px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '18px' }}>{docIcon}</span>
            <span style={{ flex: 1 }}>{att.filename || att.content_type}</span>
            {att.size > 0 && <span className="text-muted">({(att.size / 1024).toFixed(1)} KB)</span>}
            {att.url && (
                <a href={att.url} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-primary" style={{ padding: '2px 8px', fontSize: '11px' }}>
                    <i className="bi bi-download me-1"></i>Download
                </a>
            )}
        </div>
    );
};

const WA_GREEN = '#25D366';

// ── ExtractModal ──────────────────────────────────────────────────────────────
function ExtractModal({ msg, storeId, token, onClose, onCreateRFQ }) {
    const { t } = useTranslation();

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

    const [provider, setProvider]     = useState(defaultProvider.value);
    const [model, setModel]           = useState(defaultModel);
    const [files, setFiles]           = useState([]);
    const [extracting, setExtracting] = useState(false);
    const [result, setResult]         = useState(null);
    const [error, setError]           = useState('');
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

    const isQuotationMode = !!msg.is_supplier_quotation;

    const handleExtract = async () => {
        setError('');
        setResult(null);
        if (!hasApiKey) { setError(t('No API key saved for this provider. Add it under Store → AI Models.')); return; }
        setExtracting(true);
        try {
            if (isQuotationMode) {
                // Supplier quotation mode — use the dedicated price extraction endpoint with selected LLM.
                const url = `/v1/procurement-messages/${msg.id}/extract-quotation?store_id=${storeId}&llm_provider=${encodeURIComponent(provider)}&llm_model=${encodeURIComponent(model)}`;
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { Authorization: token },
                });
                const data = await res.json();
                if (!res.ok) { setError(data.error || t('Extraction failed')); return; }
                setResult({ _quotation: true, ...data });
            } else {
                const fd = new FormData();
                fd.append('llm_provider', provider);
                fd.append('llm_model', model);
                files.forEach(f => fd.append('files', f));
                const res = await fetch(`/v1/procurement-messages/${msg.id}/extract?store_id=${storeId}`, {
                    method: 'POST',
                    headers: { Authorization: token },
                    body: fd,
                });
                const data = await res.json();
                if (!res.ok) { setError(data.error || t('Extraction failed')); return; }
                setResult(data);
            }
        } catch (err) {
            setError(err.message || t('Network error'));
        } finally {
            setExtracting(false);
        }
    };

    return (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.5)', zIndex: 10000 }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="modal-dialog modal-xl modal-dialog-scrollable" style={{ maxWidth: '860px' }}>
                <div className="modal-content">
                    <div className="modal-header" style={{ background: '#f0fff4', borderBottom: `3px solid ${WA_GREEN}` }}>
                        <h6 className="modal-title fw-bold">
                            <i className={`bi ${isQuotationMode ? 'bi-receipt' : 'bi-magic'} me-2 text-success`}></i>
                            {isQuotationMode ? t('Extract Quotation Prices') : t('Extract RFQ Data')}
                            <small className="text-muted fw-normal ms-2" style={{ fontSize: '13px' }}>— {msg.from || t('WhatsApp message')}</small>
                        </h6>
                        <button className="btn-close" onClick={onClose} />
                    </div>
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

                        {/* What will be sent */}
                        <div className="mb-3" style={{ background: '#f8f9fa', borderRadius: '8px', padding: '12px 14px', fontSize: '13px' }}>
                            <div className="fw-semibold mb-1" style={{ fontSize: '13px' }}><i className="bi bi-info-circle me-1 text-primary"></i>{t('Content that will be sent to the LLM:')}</div>
                            <ul style={{ marginBottom: 0, paddingLeft: '20px' }}>
                                <li>{t('WhatsApp message text')}</li>
                                {(msg.attachments || []).filter(a => a.url).length > 0 && (
                                    <li>{(msg.attachments || []).filter(a => a.url).length} {t('attachment(s)')} ({(msg.attachments || []).filter(a => a.url).map(a => a.filename || a.content_type).join(', ')})</li>
                                )}
                                {files.length > 0 && (
                                    <li>{files.length} {t('additional file(s) you uploaded below')}</li>
                                )}
                            </ul>
                        </div>

                        {/* Additional file upload (RFQ mode only — quotation reads from saved attachments) */}
                        <div className="mb-3" hidden={isQuotationMode}>
                            <label className="form-label fw-semibold" style={{ fontSize: '13px' }}>
                                {t('Additional Files')} <span className="text-muted fw-normal" style={{ fontSize: '12px' }}>({t('optional — image, PDF, Excel, CSV, text')})</span>
                            </label>
                            <div
                                style={{ border: '2px dashed #ced4da', borderRadius: '8px', padding: '14px', textAlign: 'center', cursor: 'pointer', background: '#fafafa' }}
                                onClick={() => fileInputRef.current?.click()}
                                onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = WA_GREEN; }}
                                onDragLeave={e => { e.currentTarget.style.borderColor = '#ced4da'; }}
                                onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#ced4da'; setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files || [])]); }}
                            >
                                <i className="bi bi-cloud-upload" style={{ fontSize: '22px', color: '#6c757d' }}></i>
                                <div style={{ fontSize: '13px', color: '#6c757d', marginTop: '4px' }}>{t('Click or drag files here')}</div>
                                <input ref={fileInputRef} type="file" multiple hidden onChange={handleFiles} accept=".pdf,.xlsx,.xls,.csv,.txt,.jpg,.jpeg,.png,.gif,.webp" />
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

                                {/* Supplier quotation prices */}
                                {result._quotation && (
                                    <div className="mb-3">
                                        {result.rfq_code && <div className="mb-2 text-muted" style={{ fontSize: '12px' }}><strong>{t('RFQ Reference')}:</strong> {result.rfq_code}</div>}
                                        {(result.prices || []).length > 0 ? (
                                            <>
                                                <div className="fw-semibold mb-1" style={{ color: '#155724' }}>{t('Extracted Prices')} ({result.price_count})</div>
                                                <div style={{ overflowX: 'auto' }}>
                                                    <table className="table table-sm table-bordered" style={{ fontSize: '12px' }}>
                                                        <thead className="table-light">
                                                            <tr>
                                                                <th>{t('Part No')}</th>
                                                                <th>{t('Product')}</th>
                                                                <th>{t('Qty')}</th>
                                                                <th>{t('Unit Price')}</th>
                                                                <th>{t('Currency')}</th>
                                                                <th>{t('Notes')}</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {result.prices.map((p, i) => (
                                                                <tr key={i}>
                                                                    <td>{p.part_no || '—'}</td>
                                                                    <td>{p.product_name || '—'}</td>
                                                                    <td>{p.quantity || '—'}</td>
                                                                    <td><strong>{p.unit_price?.toFixed(2)}</strong></td>
                                                                    <td>{p.currency || 'SAR'}</td>
                                                                    <td style={{ maxWidth: '200px', whiteSpace: 'pre-wrap', fontSize: '11px' }}>{p.notes || '—'}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                                {msg.linked_rfq_received_code && <div className="text-success mt-1" style={{ fontSize: '12px' }}><i className="bi bi-check2 me-1"></i>{t('Prices saved to')} {msg.linked_rfq_received_code}</div>}
                                            </>
                                        ) : (
                                            <div className="text-muted" style={{ fontSize: '12px' }}>{t('No prices found in document')}</div>
                                        )}
                                        {/* Suggest a matching RFQ when no RFQ ID was in the document */}
                                        {!result.rfq_code && result.suggested_rfq_code && (
                                            <div className="mt-3 p-2" style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '6px', fontSize: '12px' }}>
                                                <i className="bi bi-search me-1 text-warning"></i>
                                                {t('No RFQ ID in document — auto-matched by supplier phone:')}{' '}
                                                <strong>{result.suggested_rfq_code}</strong>
                                                <div className="mt-2 d-flex gap-2 flex-wrap">
                                                    <a href={`/rfq_received/edit/${result.suggested_rfq_id}`} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-primary" style={{ fontSize: '12px' }}>
                                                        <i className="bi bi-box-arrow-up-right me-1"></i>{t('View')} {result.suggested_rfq_code}
                                                    </a>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Customer info (RFQ mode only) */}
                                {!result._quotation && (result.customer_name || result.customer_phone || result.customer_email || result.customer_company) && (
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

                                {/* Products (RFQ mode only) */}
                                {!result._quotation && (result.products || []).length > 0 && (
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

                                {/* Categories (RFQ mode only) */}
                                {!result._quotation && (result.product_categories || []).length > 0 && (
                                    <div className="mb-3">
                                        <div className="fw-semibold mb-1" style={{ color: '#155724' }}><i className="bi bi-tags me-1"></i>{t('Product Categories')}</div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {result.product_categories.map((cat, i) => (
                                                <span key={i} className="badge" style={{ background: '#d1ecf1', color: '#0c5460', fontSize: '12px', padding: '5px 10px', borderRadius: '20px' }}>
                                                    <i className="bi bi-tag me-1"></i>{cat}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* General Instructions (RFQ mode only) */}
                                {!result._quotation && result.general_instructions && (
                                    <div className="mb-3">
                                        <div className="fw-semibold mb-1" style={{ color: '#155724' }}><i className="bi bi-info-circle me-1"></i>{t('General Instructions')}</div>
                                        <div style={{ background: '#fff', border: '1px solid #c3e6cb', borderRadius: '6px', padding: '10px 12px', fontSize: '12px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                            {result.general_instructions}
                                        </div>
                                    </div>
                                )}

                                {/* Raw text if no structured data (RFQ mode only) */}
                                {!result._quotation && !result.products?.length && result.text_content && (
                                    <div>
                                        <div className="fw-semibold mb-1" style={{ color: '#155724' }}>{t('Extracted text')}</div>
                                        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '12px', background: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid #c3e6cb', maxHeight: '300px', overflow: 'auto' }}>{result.text_content}</pre>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="modal-footer">
                        {result && !result._quotation && onCreateRFQ && (
                            <button
                                className="btn btn-success btn-sm me-auto"
                                onClick={() => { onCreateRFQ(result); onClose(); }}
                            >
                                <i className="bi bi-file-earmark-plus me-1"></i>{t('Create RFQ')}
                            </button>
                        )}
                        <button
                            className="btn btn-success btn-sm"
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

export default function ProcurementWhatsAppTab({ storeId }) {
    const { t } = useTranslation();
    const token = localStorage.getItem('access_token');
    const history = useHistory();
    const [messages, setMessages] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [direction, setDirection] = useState('');
    const [rfqFilter, setRfqFilter] = useState('');
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [syncing, setSyncing] = useState(false);
    const [deletingAll, setDeletingAll] = useState(false);
    const [extractMsg, setExtractMsg] = useState(null);
    const [uploadingFor, setUploadingFor] = useState(null);
    const [linkingFor, setLinkingFor] = useState(null);
    const [toast, setToast] = useState(null);
    const toastTimer = useRef(null);
    const rfqCreateRef = useRef(null);
    const isAdmin = localStorage.getItem('user_role') === 'Admin';
    const searchTimeout = useRef(null);

    const storeSettings = (() => { try { return JSON.parse(localStorage.getItem('_store_settings_cache') || 'null'); } catch (_) { return null; } })();
    // eslint-disable-next-line no-unused-vars
    const autoRfqDisabled = storeSettings?.disable_auto_rfq_from_whatsapp === true;

    const showToast = (msg, type = 'success') => {
        clearTimeout(toastTimer.current);
        setToast({ msg, type });
        toastTimer.current = setTimeout(() => setToast(null), 4000);
    };

    const load = useCallback(async (pg = 1, q = search, dir = direction, rfq = rfqFilter) => {
        if (!storeId) return;
        setLoading(true);
        try {
            const params = new URLSearchParams({ store_id: storeId, type: 'whatsapp', page: pg, limit: PAGE_SIZE });
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

    useEffect(() => { load(1); }, [storeId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Auto-refresh every 30 seconds to pick up new incoming WhatsApp messages.
    useEffect(() => {
        const id = setInterval(() => load(1), 30000);
        return () => clearInterval(id);
    }, [load]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleSearch = e => {
        const q = e.target.value;
        setSearch(q);
        clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => load(1, q, direction, rfqFilter), 350);
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

    const openRfqModal = (rfqId, e) => {
        e.stopPropagation();
        history.push(`/dashboard/rfq-received?id=${rfqId}`);
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
                showToast(t('Attachment uploaded successfully'), 'success');
                load(page);
                if (selected && selected.id === id) {
                    setSelected(prev => ({ ...prev, attachments: data.attachments, attachment_missing: false }));
                }
            } else {
                showToast(t('Upload failed: ') + (data.error || t('Unknown error')), 'danger');
            }
        } catch (err) {
            showToast(t('Network error uploading attachment'), 'danger');
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
                <i className="bi bi-whatsapp" style={{ fontSize: '20px', color: WA_GREEN }}></i>
                <h5 style={{ margin: 0, fontWeight: 600, fontSize: '15px' }}>{t('WhatsApp Messages')}</h5>
                <span className="badge bg-secondary ms-auto">{total} {t('messages')}</span>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                <div className="input-group input-group-sm" style={{ maxWidth: '280px' }}>
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
                <select className="form-select form-select-sm" style={{ width: '160px' }} value={rfqFilter} onChange={handleRfqFilter}>
                    <option value="">{t('All messages')}</option>
                    <option value="yes">{t('RFQ Created')}</option>
                    <option value="no">{t('No RFQ')}</option>
                </select>
                <button
                    className="btn btn-sm btn-outline-success ms-auto"
                    disabled={syncing}
                    onClick={async () => {
                        setSyncing(true);
                        await load(1);
                        setSyncing(false);
                    }}
                >
                    {syncing
                        ? <><span className="spinner-border spinner-border-sm me-1" />{t('Syncing…')}</>
                        : <><i className="bi bi-arrow-clockwise me-1"></i>{t('Sync Now')}</>}
                </button>
                {isAdmin && (
                    <button
                        className="btn btn-sm btn-outline-danger"
                        disabled={deletingAll}
                        title={t('Delete all WhatsApp messages (admin only)')}
                        onClick={async () => {
                            if (!window.confirm(t('Delete ALL WhatsApp messages for this store? This cannot be undone.'))) return;
                            setDeletingAll(true);
                            try {
                                await fetch(`/v1/procurement-messages?store_id=${storeId}&type=whatsapp`, {
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

            {/* Count row */}
            {!loading && total > 0 && (
                <div className="d-flex justify-content-between align-items-center mb-2">
                    <small style={{ color: '#6c757d', fontSize: '12px' }}>
                        Showing {((page - 1) * PAGE_SIZE + 1).toLocaleString()}–{Math.min(page * PAGE_SIZE, total).toLocaleString()} of {total.toLocaleString()} | Page {page} of {totalPages.toLocaleString()}
                    </small>
                </div>
            )}

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
                <table className="table table-sm table-hover" style={{ fontSize: '13px', minWidth: '600px' }}>
                    <thead>
                        <tr style={{ background: '#f8f9fa' }}>
                            <th style={{ width: 90 }}>{t('ID')}</th>
                            <th style={{ width: 60 }}></th>
                            <th>{t('From')}</th>
                            <th>{t('Message')}</th>
                            <th style={{ width: 80 }}>{t('Type')}</th>
                            <th style={{ width: 140 }}>{t('Date')}</th>
                            <th style={{ width: 140 }}>{t('Created At')}</th>
                            <th style={{ width: 80 }}>{t('Attachments')}</th>
                            <th style={{ width: 140 }}>{t('RFQ')}</th>
                            <th style={{ width: 110 }}>{t('Actions')}</th>
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
                                <td style={{ verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                    <code style={{ fontSize: '11px', color: '#6c757d' }}>{msg.code || '—'}</code>
                                </td>
                                <td style={{ verticalAlign: 'middle' }}>{directionBadge(msg.direction)}</td>
                                <td style={{ verticalAlign: 'middle', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {msg.from || <span className="text-muted">—</span>}
                                </td>
                                <td style={{ verticalAlign: 'middle', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {msg.processed_as_rfq && (
                                        <span className="badge bg-success me-1" style={{ fontSize: '10px' }} title={msg.rfq_received_code || t('Processed as Customer RFQ')}>
                                            <i className="bi bi-file-earmark-text me-1"></i>{t('Customer RFQ')}
                                            {msg.rfq_received_code && ` (${msg.rfq_received_code})`}
                                        </span>
                                    )}
                                    {msg.is_supplier_quotation && (
                                        <span className="badge bg-info text-dark me-1" style={{ fontSize: '10px' }} title={msg.linked_rfq_received_code ? `${t('Linked to')} ${msg.linked_rfq_received_code}` : t('Supplier Quotation')}>
                                            <i className="bi bi-receipt me-1"></i>{t('Supplier Quotation')}
                                            {msg.linked_rfq_received_code && ` (${msg.linked_rfq_received_code})`}
                                        </span>
                                    )}
                                    {msg.body_text || <span className="text-muted">{t('(media)')}</span>}
                                </td>
                                <td style={{ verticalAlign: 'middle' }}>
                                    <span title={msg.wa_message_type}>{msgTypeIcon(msg.wa_message_type)} {msg.wa_message_type || 'text'}</span>
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
                                            <span className="badge bg-warning text-dark" title={t('Attachment could not be downloaded')}><i className="bi bi-exclamation-triangle-fill me-1"></i>{t('Missing')}</span>
                                            <label
                                                className="btn btn-sm btn-outline-secondary"
                                                style={{ fontSize: '10px', padding: '1px 5px', whiteSpace: 'nowrap', cursor: 'pointer', marginBottom: 0 }}
                                                title={t('Upload attachment manually')}
                                                onClick={e => e.stopPropagation()}
                                            >
                                                {uploadingFor === msg.id ? <i className="bi bi-hourglass-split"></i> : <i className="bi bi-upload"></i>}
                                                <input type="file" style={{ display: 'none' }} disabled={uploadingFor === msg.id} onChange={e => { if (e.target.files[0]) handleUploadAttachment(msg.id, e.target.files[0]); e.target.value = ''; }} />
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
                                            <i className="bi bi-file-earmark-text me-1"></i>{msg.rfq_received_code || t('View RFQ')}
                                        </button>
                                    ) : (
                                        <span className="text-muted" style={{ fontSize: '11px' }}>—</span>
                                    )}
                                </td>
                                <td style={{ verticalAlign: 'middle' }}>
                                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
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
                                        <button
                                            className="btn btn-sm btn-outline-success"
                                            title={t('Extract RFQ data with AI')}
                                            onClick={e => { e.stopPropagation(); setExtractMsg(msg); }}
                                            style={{ fontSize: '11px', padding: '2px 6px', whiteSpace: 'nowrap' }}
                                        >
                                            <i className="bi bi-magic me-1"></i>{t('Extract')}
                                        </button>
                                        <button
                                            className="btn btn-sm btn-outline-danger"
                                            title={t('Delete')}
                                            disabled={deleting === msg.id}
                                            onClick={e => { e.stopPropagation(); handleDelete(msg.id); }}
                                            style={{ fontSize: '11px', padding: '2px 6px' }}
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
                                        {selected.is_supplier_quotation && (
                                            <span className="badge bg-info text-dark" style={{ fontSize: '11px' }}>
                                                <i className="bi bi-receipt me-1"></i>{t('Supplier Quotation')}
                                                {selected.linked_rfq_received_code && ` → ${selected.linked_rfq_received_code}`}
                                            </span>
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
                                            <td>{selected.message_date ? new Date(selected.message_date).toLocaleString() : '—'}</td>
                                        </tr>
                                        <tr>
                                            <th style={{ fontWeight: 600 }}>{t('Created At')}</th>
                                            <td>{selected.created_at ? new Date(selected.created_at).toLocaleString() : '—'}</td>
                                        </tr>
                                    </tbody>
                                </table>

                                {/* WhatsApp bubble */}
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
                                            {new Date(selected.message_date || selected.created_at).toLocaleTimeString()}
                                            {selected.direction === 'out' && <i className="bi bi-check2-all ms-1" style={{ color: '#34b7f1' }}></i>}
                                        </div>
                                    </div>
                                </div>

                                {/* Attachment missing warning */}
                                {selected.attachment_missing && (
                                    <div className="alert alert-warning mt-3" style={{ fontSize: '13px', padding: '10px 14px' }}>
                                        <div className="d-flex align-items-center gap-2">
                                            <i className="bi bi-exclamation-triangle-fill fs-5"></i>
                                            <div>
                                                <strong>{t('Attachment missing')}</strong> — {t('The media could not be downloaded from WhatsApp. You can upload it manually below.')}
                                            </div>
                                        </div>
                                        <label className="btn btn-sm btn-warning mt-2" style={{ cursor: 'pointer' }}>
                                            {uploadingFor === selected.id
                                                ? <><i className="bi bi-hourglass-split me-1"></i>{t('Uploading...')}</>
                                                : <><i className="bi bi-upload me-1"></i>{t('Upload Attachment')}</>}
                                            <input type="file" style={{ display: 'none' }} disabled={uploadingFor === selected.id} onChange={e => { if (e.target.files[0]) handleUploadAttachment(selected.id, e.target.files[0]); e.target.value = ''; }} />
                                        </label>
                                    </div>
                                )}

                                {/* Attachments */}
                                {(selected.attachments || []).length > 0 && (
                                    <div style={{ marginTop: '12px' }}>
                                        <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '8px' }}>{t('Attachments')}</div>
                                        {selected.attachments.map((att, i) => (
                                            <AttachmentPreview key={i} att={att} />
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button
                                    className={`btn btn-sm ${selected.is_supplier_quotation ? 'btn-info' : 'btn-outline-info'} me-auto`}
                                    disabled={linkingFor === selected.id}
                                    title={selected.is_supplier_quotation ? t('Remove Quotation label') : t('Label as Supplier Quotation & auto-match to RFQ')}
                                    onClick={() => handleLinkAsQuotation(selected)}
                                >
                                    {linkingFor === selected.id
                                        ? <span className="spinner-border spinner-border-sm me-1" role="status" />
                                        : <i className="bi bi-receipt me-1"></i>}
                                    {selected.is_supplier_quotation ? t('Remove Quotation Label') : t('Label as Supplier Quotation')}
                                </button>
                                <button className="btn btn-outline-success btn-sm" onClick={() => { setExtractMsg(selected); setSelected(null); }}>
                                    <i className="bi bi-magic me-1"></i>{t('Extract RFQ Data')}
                                </button>
                                <button className="btn btn-outline-danger btn-sm" onClick={() => handleDelete(selected.id)}>
                                    <i className="bi bi-trash3 me-1"></i>{t('Delete')}
                                </button>
                                <button className="btn btn-secondary btn-sm" onClick={() => setSelected(null)}>{t('Close')}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
                onCreated={() => load(page)}
            />
        </div>
    );
}
