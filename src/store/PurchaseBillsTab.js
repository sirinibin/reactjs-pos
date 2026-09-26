import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { AI_PROVIDERS, modelsForProvider } from '../utils/aiProviders.js';
import PurchaseCreate from '../purchase/create.js';
import { ViewButton } from './FileViewerModal.js';

const PAGE_SIZE = 20;

const isImageMime = mime => mime && mime.startsWith('image/');

const ImageLightbox = ({ src, alt, onClose }) => (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 20, background: 'none', border: 'none', color: '#fff', fontSize: '28px', lineHeight: 1, cursor: 'pointer' }}>×</button>
        <img src={src} alt={alt} onClick={e => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '6px', boxShadow: '0 4px 32px rgba(0,0,0,0.6)', cursor: 'default' }} />
    </div>
);

const AttachmentThumb = ({ att }) => {
    const [lightbox, setLightbox] = useState(false);
    if (!att.url) {
        return <span style={{ fontSize: '12px', color: '#adb5bd', fontStyle: 'italic' }}>File not saved</span>;
    }
    if (isImageMime(att.content_type)) {
        return (
            <div style={{ marginBottom: '6px' }}>
                {lightbox && <ImageLightbox src={att.url} alt={att.filename} onClose={() => setLightbox(false)} />}
                <img
                    src={att.url}
                    alt={att.filename}
                    onClick={() => setLightbox(true)}
                    style={{ maxHeight: '140px', maxWidth: '200px', borderRadius: '6px', border: '1px solid #dee2e6', cursor: 'zoom-in', objectFit: 'cover', display: 'block' }}
                />
                <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                    <button className="btn btn-sm btn-outline-secondary" style={{ padding: '2px 8px', fontSize: '11px' }} onClick={() => setLightbox(true)}>
                        <i className="bi bi-eye me-1"></i>View
                    </button>
                    <a href={att.url} download={att.filename || 'image'} target="_blank" rel="noreferrer"
                        className="btn btn-sm btn-outline-primary" style={{ padding: '2px 8px', fontSize: '11px' }}>
                        <i className="bi bi-download me-1"></i>Download
                    </a>
                </div>
            </div>
        );
    }
    const isPdf = (att.filename || '').toLowerCase().endsWith('.pdf') || att.content_type === 'application/pdf';
    const docIcon = isPdf ? '📄' : '📎';
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', border: '1px solid #dee2e6', borderRadius: '6px', padding: '6px 10px', background: '#f8f9fa', marginBottom: '4px' }}>
            <span style={{ fontSize: '20px' }}>{docIcon}</span>
            <span style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{att.filename || att.content_type}</span>
            <div style={{ display: 'flex', gap: '4px' }}>
                <ViewButton att={att} style={{ padding: '2px 8px', fontSize: '11px' }} zIndex={100001} />
                <a href={att.url} download={att.filename || 'file'} target="_blank" rel="noreferrer"
                    className="btn btn-sm btn-outline-primary" style={{ padding: '2px 8px', fontSize: '11px' }}>
                    <i className="bi bi-download me-1"></i>Download
                </a>
            </div>
        </div>
    );
};

function PurchaseBillExtractModal({ msg, storeId, token, onClose, onCreatePurchase }) {
    const { t } = useTranslation();

    const storeSettings = (() => { try { return JSON.parse(localStorage.getItem('_store_settings_cache') || 'null'); } catch (_) { return null; } })();

    const defaultProvider = (() => {
        const last = localStorage.getItem('_rfq_extract_provider');
        if (last && AI_PROVIDERS.find(p => p.value === last)) return AI_PROVIDERS.find(p => p.value === last);
        return AI_PROVIDERS.find(p => storeSettings?.[p.apiKeyField]) || AI_PROVIDERS[0];
    })();

    const defaultModel = (() => {
        const lastProv = localStorage.getItem('_rfq_extract_provider');
        const lastMod = localStorage.getItem('_rfq_extract_model');
        if (lastProv && lastMod && modelsForProvider(lastProv).find(m => m.value === lastMod)) return lastMod;
        return modelsForProvider(defaultProvider.value)[0]?.value || '';
    })();

    const [provider, setProvider] = useState(defaultProvider.value);
    const [model, setModel] = useState(defaultModel);
    const [files, setFiles] = useState([]);
    const [extracting, setExtracting] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const fileInputRef = useRef(null);

    const activeProviderDef = AI_PROVIDERS.find(p => p.value === provider);
    const hasApiKey = !!(storeSettings?.[activeProviderDef?.apiKeyField]);

    const handleProviderChange = prov => {
        setProvider(prov);
        const firstModel = modelsForProvider(prov)[0]?.value || '';
        setModel(firstModel);
        try { localStorage.setItem('_rfq_extract_provider', prov); localStorage.setItem('_rfq_extract_model', firstModel); } catch (_) {}
    };

    const handleExtract = async () => {
        setError('');
        setResult(null);
        if (!hasApiKey) { setError(t('No API key saved for this provider. Add it under Store → AI Models.')); return; }
        setExtracting(true);
        try {
            const fd = new FormData();
            fd.append('llm_provider', provider);
            fd.append('llm_model', model);
            files.forEach(f => fd.append('files', f));
            const res = await fetch(`/v1/procurement-messages/${msg.id}/extract-purchase-bill?store_id=${storeId}`, {
                method: 'POST',
                headers: { Authorization: token },
                body: fd,
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || t('Extraction failed')); return; }
            setResult(data);
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
                    <div className="modal-header" style={{ background: '#f0fff4', borderBottom: '3px solid #25D366' }}>
                        <h6 className="modal-title fw-bold" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <i className="bi bi-receipt me-2 text-success"></i>
                            {t('Extract Purchase Bill Data')}
                            {msg.purchase_bill_code && (
                                <span className="badge" style={{ background: '#1a4d2e', color: '#fff', fontSize: '12px', fontWeight: 700 }}>{msg.purchase_bill_code}</span>
                            )}
                            <small className="text-muted fw-normal" style={{ fontSize: '13px' }}>— {msg.sender_name || msg.from}</small>
                        </h6>
                        <button className="btn-close" onClick={onClose} />
                    </div>
                    <div className="modal-body">
                        <div className="row g-3 mb-4">
                            <div className="col-md-4">
                                <label className="form-label fw-semibold" style={{ fontSize: '13px' }}>{t('Provider')}</label>
                                <select className="form-select form-select-sm" value={provider} onChange={e => handleProviderChange(e.target.value)}>
                                    {AI_PROVIDERS.map(p => {
                                        const hasKey = !!(storeSettings?.[p.apiKeyField]);
                                        return <option key={p.value} value={p.value}>{p.label}{hasKey ? ' ✅' : ''}</option>;
                                    })}
                                </select>
                                {!hasApiKey && <div style={{ fontSize: '11px', color: '#dc3545', marginTop: '3px' }}>No API key — add it under Store → AI Models</div>}
                            </div>
                            <div className="col-md-8">
                                <label className="form-label fw-semibold" style={{ fontSize: '13px' }}>{t('Model')}</label>
                                <select className="form-select form-select-sm" value={model} onChange={e => { setModel(e.target.value); try { localStorage.setItem('_rfq_extract_model', e.target.value); } catch (_) {} }}>
                                    {modelsForProvider(provider).map(m => (
                                        <option key={m.value} value={m.value}>{m.label} — {m.costLabel}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="mb-3" style={{ background: '#f8f9fa', borderRadius: '8px', padding: '12px 14px', fontSize: '13px' }}>
                            <div className="fw-semibold mb-1"><i className="bi bi-info-circle me-1 text-primary"></i>{t('Content sent to LLM:')}</div>
                            <ul style={{ marginBottom: 0, paddingLeft: '20px' }}>
                                {(msg.attachments || []).filter(a => a.url).map((a, i) => (
                                    <li key={i}>{a.filename || a.content_type}</li>
                                ))}
                                {files.length > 0 && <li>{files.length} {t('additional uploaded file(s)')}</li>}
                            </ul>
                        </div>

                        <div className="mb-3">
                            <label className="form-label fw-semibold" style={{ fontSize: '13px' }}>{t('Additional Files')} <span className="text-muted fw-normal" style={{ fontSize: '12px' }}>({t('optional')})</span></label>
                            <div
                                style={{ border: '2px dashed #ced4da', borderRadius: '8px', padding: '14px', textAlign: 'center', cursor: 'pointer', background: '#fafafa' }}
                                onClick={() => fileInputRef.current?.click()}
                                onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#25D366'; }}
                                onDragLeave={e => { e.currentTarget.style.borderColor = '#ced4da'; }}
                                onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#ced4da'; setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files || [])]); }}
                            >
                                <i className="bi bi-cloud-upload" style={{ fontSize: '22px', color: '#6c757d' }}></i>
                                <div style={{ fontSize: '13px', color: '#6c757d', marginTop: '4px' }}>{t('Click or drag files here')}</div>
                                <input ref={fileInputRef} type="file" multiple hidden onChange={e => { setFiles(prev => [...prev, ...Array.from(e.target.files || [])]); e.target.value = ''; }} accept=".pdf,.jpg,.jpeg,.png,.gif,.webp" />
                            </div>
                            {files.length > 0 && (
                                <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {files.map((f, i) => (
                                        <span key={i} className="badge bg-secondary d-flex align-items-center gap-1" style={{ fontSize: '12px', padding: '5px 8px' }}>
                                            {f.name}
                                            <button type="button" style={{ background: 'none', border: 'none', color: 'inherit', padding: 0, cursor: 'pointer', lineHeight: 1 }} onClick={() => setFiles(prev => prev.filter((_, ii) => ii !== i))}>×</button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {error && <div className="alert alert-danger py-2" style={{ fontSize: '13px' }}>{error}</div>}

                        {result && (
                            <div style={{ background: '#f0fff4', border: '1px solid #c3e6cb', borderRadius: '8px', padding: '16px', fontSize: '13px' }}>
                                <div className="fw-bold mb-3" style={{ fontSize: '14px' }}>
                                    <i className="bi bi-check-circle-fill text-success me-2"></i>
                                    {t('Extraction complete')} {result.llm_model && <span className="text-muted fw-normal" style={{ fontSize: '12px' }}>via {result.llm_model}</span>}
                                </div>

                                {/* Vendor Info */}
                                {(result.vendor_company_name || result.vendor_vat_no || result.vendor_mobile || result.vendor_cr_no || result.vendor_national_address) && (
                                    <div className="mb-3">
                                        <div className="fw-semibold mb-1" style={{ color: '#155724' }}><i className="bi bi-building me-1"></i>{t('Vendor Info')}</div>
                                        <table className="table table-sm table-bordered" style={{ fontSize: '12px', maxWidth: '520px' }}>
                                            <tbody>
                                                {result.vendor_company_name    && <tr><th style={{ width: 140 }}>{t('Company Name')}</th><td>{result.vendor_company_name}</td></tr>}
                                                {result.vendor_vat_no          && <tr><th>{t('VAT No')}</th><td>{result.vendor_vat_no}</td></tr>}
                                                {result.vendor_mobile          && <tr><th>{t('Mobile')}</th><td>{result.vendor_mobile}</td></tr>}
                                                {result.vendor_cr_no           && <tr><th>{t('CR Number')}</th><td>{result.vendor_cr_no}</td></tr>}
                                                {result.vendor_national_address && <tr><th>{t('Address')}</th><td>{result.vendor_national_address}</td></tr>}
                                                {result.invoice_number         && <tr><th>{t('Invoice No')}</th><td>{result.invoice_number}</td></tr>}
                                                {result.invoice_date           && <tr><th>{t('Invoice Date')}</th><td>{result.invoice_date}</td></tr>}
                                                {result.total_amount > 0       && <tr><th>{t('Total')}</th><td><strong>{result.total_amount?.toFixed(2)}</strong></td></tr>}
                                                {result.tax_amount > 0         && <tr><th>{t('Tax (VAT)')}</th><td>{result.tax_amount?.toFixed(2)}</td></tr>}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {/* Products */}
                                {(result.products || []).length > 0 && (
                                    <div className="mb-3">
                                        <div className="fw-semibold mb-1" style={{ color: '#155724' }}><i className="bi bi-box-seam me-1"></i>{t('Products')} ({result.products.length})</div>
                                        <div style={{ overflowX: 'auto' }}>
                                            <table className="table table-sm table-bordered" style={{ fontSize: '12px' }}>
                                                <thead className="table-light">
                                                    <tr>
                                                        <th>#</th>
                                                        <th>{t('Part No')}</th>
                                                        <th>{t('Name / Description')}</th>
                                                        <th>{t('Qty')}</th>
                                                        <th>{t('Unit Price')}</th>
                                                        <th>{t('Unit')}</th>
                                                        <th>{t('Notes')}</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {result.products.map((p, i) => (
                                                        <tr key={i}>
                                                            <td>{i + 1}</td>
                                                            <td>{p.part_no || '—'}</td>
                                                            <td>{p.name || '—'}</td>
                                                            <td>{p.quantity || 1}</td>
                                                            <td>{p.unit_price > 0 ? p.unit_price?.toFixed(2) : '—'}</td>
                                                            <td>{p.unit || '—'}</td>
                                                            <td style={{ maxWidth: '200px', fontSize: '11px' }}>{p.notes || '—'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {!result.vendor_company_name && !(result.products || []).length && result.text_content && (
                                    <div>
                                        <div className="fw-semibold mb-1" style={{ color: '#155724' }}>{t('Extracted text')}</div>
                                        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '12px', background: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid #c3e6cb', maxHeight: '300px', overflow: 'auto' }}>{result.text_content}</pre>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="modal-footer">
                        {result && onCreatePurchase && (
                            <button
                                className="btn btn-success btn-sm me-auto"
                                onClick={() => { onCreatePurchase(result, msg.id, msg.code); onClose(); }}
                            >
                                <i className="bi bi-cart-plus me-1"></i>{t('Create Purchase')}
                            </button>
                        )}
                        <button className="btn btn-success btn-sm" onClick={handleExtract} disabled={extracting || !hasApiKey}>
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

export default function PurchaseBillsTab({ storeId }) {
    const { t } = useTranslation();
    const token = localStorage.getItem('access_token');
    const [messages, setMessages] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [extractMsg, setExtractMsg] = useState(null);
    const purchaseCreateRef = useRef(null);

    const load = useCallback(async (pg = 1, s = search) => {
        if (!storeId) return;
        setLoading(true);
        try {
            const params = new URLSearchParams({
                store_id: storeId,
                type: 'whatsapp',
                direction: 'in',
                has_attachments: 'true',
                purchase_bills: 'true',
                page: pg,
                limit: PAGE_SIZE,
            });
            if (s) params.set('search', s);
            const res = await fetch(`/v1/procurement-messages?${params}`, { headers: { Authorization: token } });
            const data = await res.json();
            setMessages(data.messages || []);
            setTotal(data.total || 0);
        } catch (_) {}
        finally { setLoading(false); }
    }, [storeId, token, search]);

    useEffect(() => { load(1); }, [storeId]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleSearch = e => {
        e.preventDefault();
        setPage(1);
        load(1, search);
    };

    const handleCreatePurchase = (extractedData, msgId, msgCode) => {
        if (purchaseCreateRef.current) {
            purchaseCreateRef.current.openFromExtraction(extractedData, msgId, msgCode);
        }
    };

    const totalPages = Math.ceil(total / PAGE_SIZE);

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <h5 className="mb-0" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="bi bi-receipt" style={{ color: '#198754' }}></i>
                    {t('Purchase Bill images/PDFs')}
                    {total > 0 && <span className="badge bg-secondary" style={{ fontSize: '12px' }}>{total}</span>}
                </h5>
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px' }}>
                    <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder={t('Search by sender / phone…')}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ width: '220px' }}
                    />
                    <button type="submit" className="btn btn-sm btn-outline-secondary"><i className="bi bi-search"></i></button>
                </form>
                <button className="btn btn-sm btn-outline-secondary" onClick={() => load(page)} disabled={loading}>
                    {loading ? <span className="spinner-border spinner-border-sm" /> : <i className="bi bi-arrow-clockwise"></i>}
                </button>
            </div>

            {loading && <div className="text-center py-4"><span className="spinner-border text-success" /></div>}

            {!loading && messages.length === 0 && (
                <div className="text-center py-5 text-muted">
                    <i className="bi bi-receipt" style={{ fontSize: '40px', display: 'block', marginBottom: '10px', opacity: 0.3 }}></i>
                    <div style={{ fontSize: '14px' }}>{t('No purchase bill images/PDFs received yet.')}</div>
                    <div style={{ fontSize: '12px', marginTop: '6px', color: '#adb5bd' }}>{t('Messages with attachments from Purchase Managers Numbers appear here.')}</div>
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {messages.map(msg => (
                    <div key={msg.id} style={{ border: '1px solid #dee2e6', borderRadius: '10px', padding: '14px 16px', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                    {msg.purchase_bill_code && (
                                        <span className="badge" style={{ background: '#1a4d2e', color: '#fff', fontSize: '12px', fontWeight: 700, letterSpacing: '0.5px', padding: '3px 8px', borderRadius: '6px' }}>
                                            {msg.purchase_bill_code}
                                        </span>
                                    )}
                                    <i className="bi bi-whatsapp" style={{ color: '#25D366' }}></i>
                                    {msg.sender_name || msg.from}
                                    {msg.sender_name && msg.from && msg.sender_name !== msg.from && (
                                        <span className="text-muted fw-normal" style={{ fontSize: '12px' }}>{msg.from}</span>
                                    )}
                                </div>
                                <div style={{ fontSize: '11px', color: '#6c757d', marginTop: '2px' }}>
                                    {msg.code && <span className="badge bg-light text-dark me-1 border" style={{ fontSize: '10px' }}>{msg.code}</span>}
                                    {msg.message_date ? new Date(msg.message_date).toLocaleString() : new Date(msg.created_at).toLocaleString()}
                                </div>
                            </div>
                            <button
                                className="btn btn-sm btn-success"
                                style={{ fontSize: '12px' }}
                                onClick={() => setExtractMsg(msg)}
                            >
                                <i className="bi bi-magic me-1"></i>{t('Extract')}
                            </button>
                        </div>

                        {msg.body_text && (
                            <div style={{ fontSize: '13px', color: '#495057', marginBottom: '10px', maxHeight: '60px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {msg.body_text}
                            </div>
                        )}

                        {(msg.attachments || []).length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {msg.attachments.map((att, i) => (
                                    <AttachmentThumb key={i} att={att} />
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginTop: '20px' }}>
                    <button className="btn btn-sm btn-outline-secondary" disabled={page <= 1} onClick={() => { const p = page - 1; setPage(p); load(p); }}>‹</button>
                    <span style={{ padding: '4px 12px', fontSize: '13px', lineHeight: '30px' }}>{page} / {totalPages}</span>
                    <button className="btn btn-sm btn-outline-secondary" disabled={page >= totalPages} onClick={() => { const p = page + 1; setPage(p); load(p); }}>›</button>
                </div>
            )}

            {extractMsg && (
                <PurchaseBillExtractModal
                    msg={extractMsg}
                    storeId={storeId}
                    token={token}
                    onClose={() => setExtractMsg(null)}
                    onCreatePurchase={handleCreatePurchase}
                />
            )}

            <PurchaseCreate ref={purchaseCreateRef} />
        </div>
    );
}
