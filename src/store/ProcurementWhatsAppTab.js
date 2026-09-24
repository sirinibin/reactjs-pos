import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory, useLocation } from 'react-router-dom';
import { AI_PROVIDERS, modelsForProvider, fileCapabilityLabel } from '../utils/aiProviders.js';
import RFQCreate from '../rfq_received/create.js';
import { ForwardDetail, RFQSendModal } from '../rfq_received/index.js';
import QuotationCreate from '../quotation/create.js';
import EmailDetailModal from './EmailDetailModal.js';
import { ViewButton } from './FileViewerModal.js';

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

const ImageLightbox = ({ src, alt, onClose }) => (
    <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}
    >
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 20, background: 'none', border: 'none', color: '#fff', fontSize: '28px', lineHeight: 1, cursor: 'pointer' }}>×</button>
        <img
            src={src}
            alt={alt}
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '6px', boxShadow: '0 4px 32px rgba(0,0,0,0.6)', cursor: 'default' }}
        />
    </div>
);

const AttachmentPreview = ({ att }) => {
    const [lightbox, setLightbox] = useState(false);
    if (isImageMime(att.content_type)) {
        return (
            <div style={{ marginBottom: '8px' }}>
                {lightbox && <ImageLightbox src={att.url} alt={att.filename} onClose={() => setLightbox(false)} />}
                <img
                    src={att.url}
                    alt={att.filename}
                    onClick={() => setLightbox(true)}
                    style={{ maxWidth: '100%', maxHeight: '320px', borderRadius: '8px', border: '1px solid #dee2e6', display: 'block', cursor: 'zoom-in' }}
                />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '3px' }}>
                    {att.filename && <span style={{ fontSize: '11px', color: '#6c757d' }}>{att.filename}</span>}
                    {att.url && (
                        <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
                            <button className="btn btn-sm btn-outline-secondary" style={{ padding: '2px 8px', fontSize: '11px' }} onClick={() => setLightbox(true)}>
                                <i className="bi bi-eye me-1"></i>View
                            </button>
                            <a href={att.url} download={att.filename || 'image'} target="_blank" rel="noreferrer"
                                className="btn btn-sm btn-outline-primary" style={{ padding: '2px 8px', fontSize: '11px' }}>
                                <i className="bi bi-download me-1"></i>Download
                            </a>
                        </div>
                    )}
                </div>
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '3px' }}>
                    {att.filename && <span style={{ fontSize: '11px', color: '#6c757d' }}>{att.filename}</span>}
                    {att.url && (
                        <a href={att.url} download={att.filename || 'video'} target="_blank" rel="noreferrer"
                            className="btn btn-sm btn-outline-primary" style={{ padding: '2px 8px', fontSize: '11px', marginLeft: 'auto' }}>
                            <i className="bi bi-download me-1"></i>Download
                        </a>
                    )}
                </div>
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
        <div style={{ border: '1px solid #dee2e6', borderRadius: '8px', padding: '8px 10px', fontSize: '12px', marginBottom: '6px', minWidth: 0, whiteSpace: 'normal', wordBreak: 'normal', background: '#fafafa' }}>
            {/* Row 1: icon + filename */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <span style={{ fontSize: '20px', flexShrink: 0 }}>{docIcon}</span>
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500, fontSize: '12px' }}>{att.filename || att.content_type}</span>
            </div>
            {/* Row 2: size + action buttons */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ color: '#6c757d', fontSize: '11px' }}>{att.size > 0 ? `${(att.size / 1024).toFixed(1)} KB` : ''}</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                    <ViewButton att={att} />
                    {att.url && (
                        <a href={att.url} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-primary" style={{ padding: '3px 12px', fontSize: '11px' }}>
                            <i className="bi bi-download me-1"></i>Download
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
};

const WA_GREEN = '#25D366';

// ── ExtractModal ──────────────────────────────────────────────────────────────
function ExtractModal({ msg, storeId, token, onClose, onCreateRFQ, onViewRFQ }) {
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

    // ── Add Price to RFQ flow ──────────────────────────────────────
    const [addPhase, setAddPhase]           = useState(null); // null | 'picking' | 'mapping' | 'saving' | 'done'
    const [rfqList, setRfqList]             = useState([]);
    const [loadingRFQs, setLoadingRFQs]     = useState(false);
    const [rfqListError, setRfqListError]   = useState('');
    const [selectedRFQ, setSelectedRFQ]     = useState(null);
    const [priceRows, setPriceRows]         = useState([]);
    const [saveError, setSaveError]         = useState('');

    const matchExtractedPrice = (rfqProduct, rfqIndex, extractedPrices) => {
        if (rfqProduct.part_no) {
            const m = extractedPrices.find(p => (p.part_no || '').toLowerCase() === rfqProduct.part_no.toLowerCase());
            if (m) return m;
        }
        const byIdx = extractedPrices.find(p => p.product_index === rfqIndex);
        if (byIdx) return byIdx;
        return extractedPrices.length === 1 ? extractedPrices[0] : null;
    };

    const handleAddPriceToRFQ = async () => {
        setAddPhase('picking');
        setRfqListError('');
        setRfqList([]);
        setSelectedRFQ(null);
        setSaveError('');
        setLoadingRFQs(true);
        try {
            const phone = (msg.from || '').replace(/^\+/, '');
            const res = await fetch(`/v1/rfq-received?store_id=${storeId}&supplier_phone=${encodeURIComponent(phone)}`, {
                headers: { Authorization: token },
            });
            const data = await res.json();
            if (data.error) { setRfqListError(data.error); return; }
            setRfqList(data.items || []);
        } catch (e) { setRfqListError(e.message); }
        finally { setLoadingRFQs(false); }
    };

    const handleSelectRFQ = (rfq) => {
        setSelectedRFQ(rfq);
        const prices = result.prices || [];
        const rows = (rfq.products || []).map((prod, i) => {
            const matched = matchExtractedPrice(prod, i, prices);
            return {
                productIndex: i,
                productName: prod.name || prod.part_no || `Product ${i + 1}`,
                partNo: prod.part_no || '',
                qty: prod.quantity || 1,
                unit: prod.unit || '',
                unitPrice: matched ? matched.unit_price : 0,
                currency: matched ? (matched.currency || 'SAR') : (prices[0]?.currency || 'SAR'),
            };
        });
        setPriceRows(rows);
        setSaveError('');
        setAddPhase('mapping');
    };

    const handleSavePrices = async () => {
        setAddPhase('saving');
        setSaveError('');
        try {
            const body = {
                supplier_name:  msg.sender_name || msg.from_name || msg.from || '',
                supplier_phone: (msg.from || '').replace(/^\+/, ''),
                raw_text:       '',
                prices: priceRows.map(r => ({
                    product_index: r.productIndex,
                    product_name:  r.productName,
                    part_no:       r.partNo,
                    unit_price:    parseFloat(r.unitPrice) || 0,
                    quantity:      r.qty,
                    currency:      r.currency,
                })),
                run_llm_extraction: false,
            };
            const res = await fetch(`/v1/rfq-received/${selectedRFQ.id}/supplier-replies?store_id=${storeId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: token },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (data.error) { setSaveError(data.error); setAddPhase('mapping'); return; }
            setAddPhase('done');
            // Auto-update product catalog purchase prices (retail auto-computed from stored margin in backend)
            try {
                const priceUpdateItems = priceRows
                    .filter(r => parseFloat(r.unitPrice) > 0)
                    .map(r => ({
                        product_index:      r.productIndex,
                        purchase_unit_price: parseFloat(r.unitPrice) || 0,
                        retail_unit_price:  0, // backend will derive from stored margin if available
                        vat_included:       false,
                    }));
                if (priceUpdateItems.length > 0) {
                    await fetch(`/v1/rfq-received/${selectedRFQ.id}/update-product-prices?store_id=${storeId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json', Authorization: token },
                        body: JSON.stringify({ items: priceUpdateItems }),
                    });
                }
            } catch (_) {}
        } catch (e) { setSaveError(e.message); setAddPhase('mapping'); }
    };

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
                        <h6 className="modal-title fw-bold" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <i className={`bi ${isQuotationMode ? 'bi-receipt' : 'bi-magic'} me-2 text-success`}></i>
                            {isQuotationMode ? t('Extract Quotation Prices') : t('Extract RFQ Data')}
                            <small className="text-muted fw-normal" style={{ fontSize: '13px' }}>— {msg.sender_name || msg.from || t('WhatsApp message')}</small>
                            {msg.linked_rfq_received_code && msg.linked_rfq_received_id && (
                                <span
                                    role="button"
                                    tabIndex={0}
                                    title={t('Open linked RFQ')}
                                    onClick={() => onViewRFQ && onViewRFQ(msg.linked_rfq_received_id)}
                                    onKeyDown={e => { if (e.key === 'Enter') onViewRFQ && onViewRFQ(msg.linked_rfq_received_id); }}
                                    style={{ fontSize: '12px', fontWeight: 600, color: '#0d6efd', background: '#e8f0fe', border: '1px solid #c8d8f5', borderRadius: '6px', padding: '2px 8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                >
                                    <i className="bi bi-file-earmark-text" style={{ fontSize: '11px' }}></i>
                                    {msg.linked_rfq_received_code}
                                </span>
                            )}
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
                                        {/* General quotation conditions (validity, delivery, payment) */}
                                        {result.general_notes && (
                                            <div className="mt-2 p-2" style={{ background: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: '6px', fontSize: '12px' }}>
                                                <i className="bi bi-info-circle me-1 text-secondary"></i>
                                                <strong>{t('Quotation Terms')}:</strong> {result.general_notes}
                                            </div>
                                        )}
                                        {/* Suggest a matching RFQ when no RFQ ID was in the document */}
                                        {!result.rfq_code && result.suggested_rfq_code && (
                                            <div className="mt-3 p-2" style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '6px', fontSize: '12px' }}>
                                                <i className="bi bi-search me-1 text-warning"></i>
                                                {t('No RFQ ID in document — auto-matched by supplier phone:')}{' '}
                                                <strong>{result.suggested_rfq_code}</strong>
                                                <div className="mt-2 d-flex gap-2 flex-wrap">
                                                    <button className="btn btn-sm btn-outline-primary" style={{ fontSize: '12px' }} onClick={() => onViewRFQ && onViewRFQ(result.suggested_rfq_id)}>
                                                        <i className="bi bi-file-earmark-text me-1"></i>{t('View')} {result.suggested_rfq_code}
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* ── Add Price to RFQ ── */}
                                        {(result.prices || []).length > 0 && addPhase === null && (
                                            <div className="mt-3">
                                                <button className="btn btn-sm btn-success" style={{ fontSize: '12px' }} onClick={handleAddPriceToRFQ}>
                                                    <i className="bi bi-plus-circle me-1"></i>{t('Add Price to RFQ')}
                                                </button>
                                            </div>
                                        )}

                                        {/* Step 1: Pick RFQ */}
                                        {addPhase === 'picking' && (
                                            <div className="mt-3 p-3" style={{ border: '1px solid #dee2e6', borderRadius: '8px', fontSize: '12px', background: '#fff' }}>
                                                <div className="fw-semibold mb-2" style={{ fontSize: '13px' }}>
                                                    <i className="bi bi-search me-1 text-primary"></i>{t('Select RFQ to add pricing to')}
                                                    <span className="text-muted fw-normal ms-2" style={{ fontSize: '11px' }}>({t('RFQs sent to')} {msg.from})</span>
                                                </div>
                                                {loadingRFQs && <div className="text-muted"><span className="spinner-border spinner-border-sm me-1"></span>{t('Loading…')}</div>}
                                                {rfqListError && <div className="alert alert-danger py-1 px-2 mb-2">{rfqListError}</div>}
                                                {!loadingRFQs && rfqList.length === 0 && !rfqListError && (
                                                    <div className="text-muted">{t('No RFQs found for this supplier phone.')}</div>
                                                )}
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '260px', overflowY: 'auto' }}>
                                                    {rfqList.map(rfq => (
                                                        <div key={rfq.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', border: '1px solid #e9ecef', borderRadius: '6px', background: '#fafafa' }}>
                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                <strong>{rfq.code}</strong>
                                                                {rfq.customer_name && <span className="text-muted ms-2">{rfq.customer_name}</span>}
                                                                <span className="badge bg-secondary ms-2" style={{ fontSize: '10px' }}>{(rfq.products || []).length} {t('products')}</span>
                                                                {rfq.status && <span className="badge ms-1" style={{ fontSize: '10px', background: '#e8f4fd', color: '#0a58ca' }}>{rfq.status}</span>}
                                                            </div>
                                                            <button className="btn btn-sm btn-outline-primary" style={{ fontSize: '11px', whiteSpace: 'nowrap' }} onClick={() => handleSelectRFQ(rfq)}>
                                                                {t('Select')}
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                                <button className="btn btn-sm btn-outline-secondary mt-2" style={{ fontSize: '11px' }} onClick={() => setAddPhase(null)}>{t('Cancel')}</button>
                                            </div>
                                        )}

                                        {/* Step 2: Review & edit prices per product */}
                                        {(addPhase === 'mapping' || addPhase === 'saving') && selectedRFQ && (
                                            <div className="mt-3 p-3" style={{ border: '1px solid #dee2e6', borderRadius: '8px', fontSize: '12px', background: '#fff' }}>
                                                <div className="fw-semibold mb-2" style={{ fontSize: '13px' }}>
                                                    <i className="bi bi-currency-dollar me-1 text-success"></i>
                                                    {t('Add pricing to')} <strong>{selectedRFQ.code}</strong>
                                                </div>
                                                <div style={{ overflowX: 'auto' }}>
                                                    <table className="table table-sm table-bordered mb-2" style={{ fontSize: '12px' }}>
                                                        <thead className="table-light">
                                                            <tr>
                                                                <th>{t('Product')}</th>
                                                                <th>{t('Part No')}</th>
                                                                <th>{t('Qty')}</th>
                                                                <th style={{ minWidth: '110px' }}>{t('Unit Price')}</th>
                                                                <th>{t('Currency')}</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {priceRows.map((row, i) => (
                                                                <tr key={i}>
                                                                    <td>{row.productName}</td>
                                                                    <td className="text-muted">{row.partNo || '—'}</td>
                                                                    <td>{row.qty}</td>
                                                                    <td>
                                                                        <input
                                                                            type="number"
                                                                            min="0"
                                                                            step="0.01"
                                                                            className="form-control form-control-sm"
                                                                            style={{ fontSize: '12px', padding: '2px 6px' }}
                                                                            value={row.unitPrice}
                                                                            onChange={e => setPriceRows(prev => prev.map((r, ri) => ri === i ? { ...r, unitPrice: e.target.value } : r))}
                                                                        />
                                                                    </td>
                                                                    <td>{row.currency}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                                {saveError && <div className="alert alert-danger py-1 px-2 mb-2">{saveError}</div>}
                                                <div className="d-flex gap-2 flex-wrap">
                                                    <button className="btn btn-sm btn-success" style={{ fontSize: '12px' }} onClick={handleSavePrices} disabled={addPhase === 'saving'}>
                                                        {addPhase === 'saving' ? <><span className="spinner-border spinner-border-sm me-1"></span>{t('Saving…')}</> : <><i className="bi bi-check-lg me-1"></i>{t('Add')}</>}
                                                    </button>
                                                    <button className="btn btn-sm btn-outline-secondary" style={{ fontSize: '12px' }} onClick={() => setAddPhase('picking')} disabled={addPhase === 'saving'}>{t('Back')}</button>
                                                    <button className="btn btn-sm btn-outline-secondary" style={{ fontSize: '12px' }} onClick={() => setAddPhase(null)} disabled={addPhase === 'saving'}>{t('Cancel')}</button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Step 3: Done */}
                                        {addPhase === 'done' && selectedRFQ && (
                                            <div className="mt-3 d-flex align-items-center gap-2 p-2" style={{ background: '#d1e7dd', border: '1px solid #a3cfbb', borderRadius: '6px', fontSize: '12px' }}>
                                                <i className="bi bi-check-circle-fill text-success"></i>
                                                <span>{t('Prices saved to')} <strong>{selectedRFQ.code}</strong></span>
                                                <button className="btn btn-sm btn-outline-success ms-2" style={{ fontSize: '11px' }} onClick={() => onViewRFQ && onViewRFQ(selectedRFQ.id)}>
                                                    <i className="bi bi-file-earmark-text me-1"></i>{t('View RFQ')}
                                                </button>
                                                <button className="btn btn-sm btn-link text-muted ms-auto" style={{ fontSize: '11px' }} onClick={() => setAddPhase(null)}>{t('Dismiss')}</button>
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

export default function ProcurementWhatsAppTab({ storeId, initialPhone: initialPhoneProp }) {
    const { t } = useTranslation();
    const token = localStorage.getItem('access_token');
    const history = useHistory();
    const location = useLocation();
    // Phone from initialPhone prop (modal use) or URL param ?phone=... — auto-open a specific contact's conversation
    const initialPhoneRef = useRef(
        initialPhoneProp || new URLSearchParams(location.search).get('phone') || ''
    );
    const [messages, setMessages] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [direction, setDirection] = useState('');
    const [rfqFilter, setRfqFilter] = useState('');
    const [attachmentFilter, setAttachmentFilter] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [syncing, setSyncing] = useState(false);
    const [deletingAll, setDeletingAll] = useState(false);
    const [resolvingSenders, setResolvingSenders] = useState(false);
    const [diskUsage, setDiskUsage] = useState(null);
    const [extractMsg, setExtractMsg] = useState(null);
    const [uploadingFor, setUploadingFor] = useState(null);
    const [linkingFor, setLinkingFor] = useState(null);
    const [toast, setToast] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [sendingReply, setSendingReply] = useState(false);
    const [replyError, setReplyError] = useState(null);
    const [translatingReply, setTranslatingReply] = useState(false);
    const [translatingCompose, setTranslatingCompose] = useState(false);
    // Conversation threading state
    const [viewMode, setViewMode] = useState('conversations');
    const [threads, setThreads] = useState([]);
    const [threadsLoading, setThreadsLoading] = useState(false);
    const [selectedThread, setSelectedThread] = useState(null);
    const [threadMessages, setThreadMessages] = useState([]);
    const [threadMsgLoading, setThreadMsgLoading] = useState(false);
    const [composeText, setComposeText] = useState('');
    const [sendingMsg, setSendingMsg] = useState(false);
    const [sendMsgError, setSendMsgError] = useState(null);
    const [threadSearch, setThreadSearch] = useState('');
    const [showNewConvInput, setShowNewConvInput] = useState(false);
    const [newConvPhone, setNewConvPhone] = useState('');
    const chatBottomRef = useRef(null);
    const chatContainerRef = useRef(null);
    // Responsive: mobile hides one panel at a time
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [mobilePanel, setMobilePanel] = useState('threads'); // 'threads' | 'chat'
    // File attach
    const [attachedFile, setAttachedFile] = useState(null); // {file, preview, type}
    const fileInputRef = useRef(null);
    // Voice recording
    const [recording, setRecording] = useState(false);
    const [recSeconds, setRecSeconds] = useState(0);
    const mediaRecRef = useRef(null);
    const recChunksRef = useRef([]);
    const recTimerRef = useRef(null);
    const [sendingMedia, setSendingMedia] = useState(false);
    const [deletingMsgId, setDeletingMsgId] = useState(null);
    const [hoveredMsgId, setHoveredMsgId] = useState(null);
    const [translations, setTranslations] = useState({}); // { [msgId]: { loading, text, error } }
    const [copiedMsgId, setCopiedMsgId] = useState(null);
    const [rfqHistoryOpen, setRfqHistoryOpen] = useState(false);
    const [rfqHistoryList, setRfqHistoryList] = useState([]);
    const [rfqHistoryLoading, setRfqHistoryLoading] = useState(false);
    const rfqHistoryRef = useRef(null);
    const rfqHistoryPhoneRef = useRef(null); // phone for which history is already loaded
    const [rfqDetailItem, setRfqDetailItem] = useState(null);
    const [rfqDetailShow, setRfqDetailShow] = useState(false);
    const [rfqForSend, setRfqForSend] = useState(null);
    const [showSendModal, setShowSendModal] = useState(false);
    const [emailDetailMsg, setEmailDetailMsg] = useState(null);
    const [emailDetailShow, setEmailDetailShow] = useState(false);
    // Forward modal state
    const [forwardMsg, setForwardMsg]                     = useState(null);
    const [forwardTab, setForwardTab]                     = useState('contacts'); // 'contacts'|'wa'|'email'
    const [forwardSearch, setForwardSearch]               = useState('');
    const [forwardSelected, setForwardSelected]           = useState(new Set());
    const [forwardSending, setForwardSending]             = useState(false);
    const [forwardStatus, setForwardStatus]               = useState(null);
    const [forwardPickedRfq, setForwardPickedRfq]         = useState(null);
    const [forwardEmailBody, setForwardEmailBody]         = useState('');
    const [forwardEmailSubject, setForwardEmailSubject]   = useState('');
    const [forwardEmailStatus, setForwardEmailStatus]     = useState(null);

    // Customer lookup state
    const [customerByPhone, setCustomerByPhone] = useState({}); // phone → { id, name }
    const [threadCustomer, setThreadCustomer] = useState(null);
    const [customerRfqOpen, setCustomerRfqOpen] = useState(false);
    const [customerRfqList, setCustomerRfqList] = useState([]);
    const [customerRfqLoading, setCustomerRfqLoading] = useState(false);
    const customerRfqRef = useRef(null);
    const customerRfqPhoneRef = useRef(null);

    const loadRFQHistory = useCallback(async (phone, force = false) => {
        if (!phone) return;
        if (!force && rfqHistoryPhoneRef.current === phone) return; // already loaded for this phone
        rfqHistoryPhoneRef.current = phone;
        setRfqHistoryLoading(true);
        setRfqHistoryList([]);
        try {
            const res = await fetch(`/v1/rfq-received?store_id=${storeId}&supplier_phone=${encodeURIComponent(phone)}&limit=20`, {
                headers: { Authorization: token },
            });
            const data = await res.json();
            setRfqHistoryList(data.items || data.result || []);
        } catch (_) {}
        setRfqHistoryLoading(false);
    }, [storeId, token]);

    // Look up a single customer by phone; returns { id, name } or null
    const lookupCustomerByPhone = useCallback(async (phone) => {
        if (!phone) return null;
        try {
            const res = await fetch(`/v1/customer/by-phone?store_id=${storeId}&phone=${encodeURIComponent(phone)}`, {
                headers: { Authorization: token },
            });
            if (!res.ok) return null;
            const data = await res.json();
            return data.id ? { id: data.id, name: data.name } : null;
        } catch (_) { return null; }
    }, [storeId, token]);

    // Batch-enrich threads with customer info for phones not yet in customerByPhone
    const enrichThreadsWithCustomers = useCallback(async (threadList) => {
        const phonesToLookup = threadList
            .map(th => th.contact_phone)
            .filter(p => p && !(p in customerByPhone));
        if (phonesToLookup.length === 0) return;
        // Look up in parallel (max 15 at once)
        const slice = phonesToLookup.slice(0, 15);
        const results = await Promise.all(slice.map(async p => {
            const c = await lookupCustomerByPhone(p);
            return [p, c]; // [phone, customer|null]
        }));
        const updates = {};
        results.forEach(([p, c]) => { updates[p] = c; });
        setCustomerByPhone(prev => ({ ...prev, ...updates }));
    }, [customerByPhone, lookupCustomerByPhone]); // eslint-disable-line react-hooks/exhaustive-deps

    // Load customer quotations (sales quotations) for selected thread's customer
    const loadCustomerRfqs = useCallback(async (customerId, force = false) => {
        if (!customerId) return;
        if (!force && customerRfqPhoneRef.current === customerId) return;
        customerRfqPhoneRef.current = customerId;
        setCustomerRfqLoading(true);
        setCustomerRfqList([]);
        try {
            const res = await fetch(`/v1/rfq-received?store_id=${storeId}&customer_id=${customerId}&limit=50`, {
                headers: { Authorization: token },
            });
            const data = await res.json();
            setCustomerRfqList(data.result || []);
        } catch (_) {}
        setCustomerRfqLoading(false);
    }, [storeId, token]);

    const fetchAndOpenPreview = useCallback(async (rfqId) => {
        try {
            const res = await fetch(`/v1/rfq-received/${rfqId}?store_id=${storeId}`, {
                headers: { Authorization: token },
            });
            const data = await res.json();
            const rfq = data.result || data;
            if (rfq?.id || rfq?._id) {
                setRfqDetailItem(rfq);
                setRfqDetailShow(true);
            }
        } catch (_) {}
    }, [storeId, token]);

    const fetchAndOpenEmail = useCallback(async (msgId) => {
        try {
            const res = await fetch(`/v1/procurement-messages/${msgId}?store_id=${storeId}`, {
                headers: { Authorization: token },
            });
            const data = await res.json();
            const msg = data.result || data;
            if (msg?.id || msg?._id) {
                setEmailDetailMsg(msg);
                setEmailDetailShow(true);
            }
        } catch (_) {}
    }, [storeId, token]);

    // Auto-load RFQ history count when a thread is selected (so badge appears immediately)
    useEffect(() => {
        if (selectedThread?.contact_phone) {
            rfqHistoryPhoneRef.current = null; // reset cache so new thread loads fresh
            setRfqHistoryList([]);
            setRfqHistoryOpen(false);
            loadRFQHistory(selectedThread.contact_phone);
            // Look up customer for selected thread
            setThreadCustomer(customerByPhone[selectedThread.contact_phone] ?? undefined); // undefined = unknown yet
            if (!(selectedThread.contact_phone in customerByPhone)) {
                lookupCustomerByPhone(selectedThread.contact_phone).then(c => {
                    setThreadCustomer(c);
                    setCustomerByPhone(prev => ({ ...prev, [selectedThread.contact_phone]: c }));
                });
            } else {
                setThreadCustomer(customerByPhone[selectedThread.contact_phone]);
            }
            // Reset customer RFQ panel
            setCustomerRfqOpen(false);
            setCustomerRfqList([]);
            customerRfqPhoneRef.current = null;
        }
    }, [selectedThread?.contact_phone]); // eslint-disable-line react-hooks/exhaustive-deps

    // Close Customer RFQ panel on outside click
    useEffect(() => {
        if (!customerRfqOpen) return;
        const handler = (e) => {
            if (customerRfqRef.current && !customerRfqRef.current.contains(e.target)) {
                setCustomerRfqOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [customerRfqOpen]);

    // Close RFQ history panel on outside click
    useEffect(() => {
        if (!rfqHistoryOpen) return;
        const handler = (e) => {
            if (rfqHistoryRef.current && !rfqHistoryRef.current.contains(e.target)) {
                setRfqHistoryOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [rfqHistoryOpen]);

    const translateMsg = useCallback(async (msgId, text) => {
        if (!text) return;
        setTranslations(prev => ({ ...prev, [msgId]: { loading: true, text: null } }));
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
    }, [token]);

    const copyMsg = useCallback((msgId, text) => {
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            setCopiedMsgId(msgId);
            setTimeout(() => setCopiedMsgId(id => id === msgId ? null : id), 1500);
        });
    }, []);
    const toastTimer = useRef(null);
    const rfqCreateRef = useRef(null);
    const quotationCreateRef = useRef(null);
    const isAdmin = localStorage.getItem('user_role') === 'Admin';
    const searchTimeout = useRef(null);

    const storeSettings = (() => { try { return JSON.parse(localStorage.getItem('_store_settings_cache') || 'null'); } catch (_) { return null; } })();
    // eslint-disable-next-line no-unused-vars
    const autoRfqDisabled = storeSettings?.disable_auto_rfq_from_whatsapp === true;

    const handleCreateQuotation = (items, rfq) => {
        const prefill = {
            rfq_id:                    rfq.id,
            rfq_code:                  rfq.code || '',
            rfq_received_id:           rfq.id,
            rfq_received_code:         rfq.code || '',
            customer_id:               rfq.customer_id || null,
            customer_name:             rfq.customer_name || '',
            customer_phone:            rfq.customer_phone || '',
            procurement_message_id:    rfq.procurement_message_id || null,
            procurement_message_code:  rfq.procurement_message_code || '',
            items,
        };
        try { sessionStorage.setItem('rfq_quotation_prefill_active', JSON.stringify(prefill)); } catch (_) {}
        quotationCreateRef.current?.open();
    };

    const showToast = (msg, type = 'success') => {
        clearTimeout(toastTimer.current);
        setToast({ msg, type });
        toastTimer.current = setTimeout(() => setToast(null), 4000);
    };

    const translateReplyText = async () => {
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

    const translateComposeText = async () => {
        if (!composeText.trim()) return;
        setTranslatingCompose(true);
        try {
            const res = await fetch('/v1/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: token },
                body: JSON.stringify({ text: composeText, target: 'ar' }),
            });
            const data = await res.json();
            if (data?.translatedText) setComposeText(data.translatedText);
        } catch (_) {}
        setTranslatingCompose(false);
    };

    const handleSendReply = async () => {
        if (!selected || !replyText.trim() || sendingReply) return;
        setSendingReply(true);
        setReplyError(null);
        try {
            const res = await fetch(`/v1/procurement-messages/${selected.id}/reply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: token },
                body: JSON.stringify({ text: replyText.trim(), store_id: storeId }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                setReplyError(data.error || t('Failed to send reply'));
            } else {
                setReplyText('');
                showToast(t('Reply sent'));
                load(page);
            }
        } catch (e) {
            setReplyError(t('Network error'));
        } finally {
            setSendingReply(false);
        }
    };

    // ── Conversation threading ────────────────────────────────────────────────

    const loadThreads = useCallback(async (q = threadSearch, silent = false) => {
        if (!storeId) return;
        if (!silent) setThreadsLoading(true);
        try {
            const params = new URLSearchParams({ store_id: storeId, type: 'whatsapp', limit: 50 });
            if (q) params.set('search', q);
            const res = await fetch(`/v1/procurement-message-threads?${params}`, { headers: { Authorization: token } });
            const data = await res.json();
            const next = data.threads || [];
            // Only update state when something actually changed — avoids re-rendering the list on every poll
            setThreads(prev => {
                const prevSig = prev.map(t => t.contact_phone + '|' + t.message_count + '|' + t.unread_count).join(',');
                const nextSig = next.map(t => t.contact_phone + '|' + t.message_count + '|' + t.unread_count).join(',');
                return prevSig === nextSig ? prev : next;
            });
            // Enrich threads with customer info for phones not yet resolved
            enrichThreadsWithCustomers(next);
        } catch (_) {} finally { if (!silent) setThreadsLoading(false); }
    }, [storeId, token, threadSearch, enrichThreadsWithCustomers]); // eslint-disable-line react-hooks/exhaustive-deps

    const togglePin = useCallback(async (th, msgType) => {
        const method = th.pinned ? 'DELETE' : 'POST';
        try {
            await fetch(`/v1/procurement-message-threads/${encodeURIComponent(th.contact_phone)}/pin?store_id=${storeId}&type=${msgType}`, {
                method, headers: { Authorization: token },
            });
            loadThreads(threadSearch, true);
        } catch (_) {}
    }, [storeId, token, threadSearch, loadThreads]); // eslint-disable-line react-hooks/exhaustive-deps

    const loadThread = useCallback(async (contactPhone, silent = false) => {
        if (!storeId || !contactPhone) return;
        if (!silent) setThreadMsgLoading(true);
        try {
            const params = new URLSearchParams({ store_id: storeId, type: 'whatsapp', limit: 100 });
            const res = await fetch(`/v1/procurement-message-threads/${encodeURIComponent(contactPhone)}?${params}`, { headers: { Authorization: token } });
            const data = await res.json();
            const next = data.messages || [];
            // Only update state when messages actually changed — prevents bubble re-renders on every poll
            setThreadMessages(prev => {
                const prevLast = prev.length > 0 ? prev[prev.length - 1]?.id : '';
                const nextLast = next.length > 0 ? next[next.length - 1]?.id : '';
                if (prev.length === next.length && prevLast === nextLast) return prev;
                return next;
            });
            if (!silent) {
                setThreads(prev => prev.map(t => t.contact_phone === contactPhone ? { ...t, unread_count: 0 } : t));
            }
        } catch (_) {} finally { if (!silent) setThreadMsgLoading(false); }
    }, [storeId, token]);

    const startNewConversation = () => {
        const phone = newConvPhone.trim().replace(/\s+/g, '');
        if (!phone) return;
        const thread = { contact_phone: phone, contact_name: phone };
        setSelectedThread(thread);
        loadThread(phone);
        setComposeText('');
        setSendMsgError(null);
        setShowNewConvInput(false);
        setNewConvPhone('');
        if (isMobile) setMobilePanel('chat');
    };

    const handleSendInThread = async () => {
        if (!selectedThread || !composeText.trim() || sendingMsg) return;
        setSendingMsg(true);
        setSendMsgError(null);
        try {
            const res = await fetch(`/v1/procurement-message-threads/${encodeURIComponent(selectedThread.contact_phone)}/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: token },
                body: JSON.stringify({ text: composeText.trim(), store_id: storeId }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                setSendMsgError(data.error || t('Failed to send message'));
            } else {
                setComposeText('');
                loadThread(selectedThread.contact_phone, true);
                loadThreads();
            }
        } catch (_) {
            setSendMsgError(t('Network error'));
        } finally { setSendingMsg(false); }
    };

    // Resize listener for responsive layout
    useEffect(() => {
        const handler = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handler);
        return () => window.removeEventListener('resize', handler);
    }, []);


    // When a thread is selected on mobile, switch to chat panel
    useEffect(() => {
        if (selectedThread && isMobile) setMobilePanel('chat');
    }, [selectedThread, isMobile]);

    // Auto-scroll to bottom when thread messages change
    // Scroll to bottom after messages finish loading (not during — spinner hides messages so scrollHeight is wrong while loading).
    useEffect(() => {
        if (!threadMsgLoading) {
            // rAF ensures messages are painted before we measure scrollHeight
            requestAnimationFrame(() => {
                const el = chatContainerRef.current;
                if (el) el.scrollTop = el.scrollHeight;
            });
        }
    }, [threadMsgLoading, threadMessages]);

    const handleSendMedia = async (fileOrBlob, mimeType, filename) => {
        if (!selectedThread || sendingMedia) return;
        setSendingMedia(true);
        setSendMsgError(null);
        try {
            const fd = new FormData();
            const blob = fileOrBlob instanceof Blob ? fileOrBlob : fileOrBlob;
            fd.append('file', new File([blob], filename || 'file', { type: mimeType }));
            fd.append('store_id', storeId);
            const res = await fetch(`/v1/procurement-message-threads/${encodeURIComponent(selectedThread.contact_phone)}/send-media`, {
                method: 'POST', headers: { Authorization: token }, body: fd,
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                setSendMsgError(data.error || t('Failed to send'));
            } else {
                setAttachedFile(null);
                loadThread(selectedThread.contact_phone, true);
                loadThreads();
            }
        } catch (_) {
            setSendMsgError(t('Network error'));
        } finally { setSendingMedia(false); }
    };

    const handleStartRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mr = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg' });
            recChunksRef.current = [];
            mr.ondataavailable = e => { if (e.data.size > 0) recChunksRef.current.push(e.data); };
            mr.onstop = () => {
                stream.getTracks().forEach(t => t.stop());
                clearInterval(recTimerRef.current);
                const mime = mr.mimeType || 'audio/webm';
                const blob = new Blob(recChunksRef.current, { type: mime });
                const ext = mime.includes('ogg') ? 'voice.ogg' : 'voice.webm';
                handleSendMedia(blob, mime, ext);
                setRecording(false);
                setRecSeconds(0);
            };
            mr.start();
            mediaRecRef.current = mr;
            setRecording(true);
            setRecSeconds(0);
            recTimerRef.current = setInterval(() => setRecSeconds(s => s + 1), 1000);
        } catch (e) {
            setSendMsgError(t('Microphone access denied'));
        }
    };

    const handleStopRecording = () => {
        if (mediaRecRef.current && mediaRecRef.current.state !== 'inactive') {
            mediaRecRef.current.stop();
        }
    };

    const load = useCallback(async (pg = 1, q = search, dir = direction, rfq = rfqFilter, hasAtt = attachmentFilter) => {
        if (!storeId) return;
        setLoading(true);
        try {
            const params = new URLSearchParams({ store_id: storeId, type: 'whatsapp', page: pg, limit: PAGE_SIZE });
            if (q) params.set('search', q);
            if (dir) params.set('direction', dir);
            if (rfq) params.set('rfq_filter', rfq);
            if (hasAtt) params.set('has_attachments', 'true');
            const res = await fetch(`/v1/procurement-messages?${params}`, { headers: { Authorization: token } });
            const data = await res.json();
            setMessages(data.messages || []);
            setTotal(data.total || 0);
            setPage(pg);
        } finally { setLoading(false); }
    }, [storeId, token, search, direction, rfqFilter, attachmentFilter]);

    useEffect(() => {
        load(1);
        loadThreads();
        if (storeId) {
            fetch(`/v1/procurement-messages/disk-usage?store_id=${storeId}`, { headers: { Authorization: token } })
                .then(r => r.json()).then(d => setDiskUsage(d.formatted)).catch(() => {});
        }
    }, [storeId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Auto-select thread when arriving via ?phone= URL param
    useEffect(() => {
        const phone = initialPhoneRef.current;
        if (!phone || !threads.length) return;
        const normalised = phone.replace(/^\+/, '');
        const found = threads.find(t =>
            t.contact_phone === phone ||
            t.contact_phone === '+' + phone ||
            t.contact_phone === normalised
        );
        const thread = found || { contact_phone: phone, contact_name: phone };
        setSelectedThread(thread);
        loadThread(phone);
        setViewMode('conversations');
        initialPhoneRef.current = ''; // consume so it doesn't re-trigger
    }, [threads]); // eslint-disable-line react-hooks/exhaustive-deps

    // Fast poll: refresh active thread every 3 seconds for near-realtime incoming messages.
    const selectedThreadRef = useRef(selectedThread);
    useEffect(() => { selectedThreadRef.current = selectedThread; }, [selectedThread]);

    useEffect(() => {
        const fastId = setInterval(() => {
            if (selectedThreadRef.current) {
                loadThread(selectedThreadRef.current.contact_phone, true);
            }
        }, 3000);
        const slowId = setInterval(() => {
            loadThreads(undefined, true); // silent — no spinner, only updates if data changed
        }, 5000);
        return () => { clearInterval(fastId); clearInterval(slowId); };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleSearch = e => {
        const q = e.target.value;
        setSearch(q);
        clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => load(1, q, direction, rfqFilter, attachmentFilter), 350);
    };

    const handleDirection = e => {
        const d = e.target.value;
        setDirection(d);
        load(1, search, d, rfqFilter, attachmentFilter);
    };

    const handleRfqFilter = e => {
        const f = e.target.value;
        setRfqFilter(f);
        load(1, search, direction, f, attachmentFilter);
    };

    const handleAttachmentFilter = () => {
        const next = !attachmentFilter;
        setAttachmentFilter(next);
        load(1, search, direction, rfqFilter, next);
    };

    const openRfqModal = (rfqId, e) => {
        e.stopPropagation();
        history.push(`/dashboard/rfq-received?id=${rfqId}`);
    };

    const openMessage = async msg => {
        if (!msg.read) {
            setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, read: true } : m));
        }
        setReplyText('');
        setReplyError(null);
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
                {diskUsage && (
                    <span className="badge bg-light text-muted border" style={{ fontSize: '11px' }}>
                        <i className="bi bi-hdd me-1"></i>{diskUsage} {t('used')}
                    </span>
                )}
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
                    className={`btn btn-sm ${attachmentFilter ? 'btn-secondary' : 'btn-outline-secondary'}`}
                    onClick={handleAttachmentFilter}
                    title={t('Show only messages with attachments')}
                >
                    <i className="bi bi-paperclip me-1"></i>{t('Has Attachments')}
                </button>
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
                <button
                    className="btn btn-sm btn-outline-primary"
                    disabled={resolvingSenders}
                    title={t('Identify sender names from RFQ suppliers & customers for all messages')}
                    onClick={async () => {
                        setResolvingSenders(true);
                        try {
                            const res = await fetch(`/v1/procurement-messages/resolve-senders?store_id=${storeId}`, {
                                method: 'POST', headers: { Authorization: token },
                            });
                            const data = await res.json();
                            showToast(t(`Resolved ${data.updated || 0} sender(s)`));
                            load(page);
                            loadThreads();
                        } catch (_) {
                            showToast(t('Failed to resolve senders'), 'danger');
                        } finally { setResolvingSenders(false); }
                    }}
                >
                    {resolvingSenders
                        ? <><span className="spinner-border spinner-border-sm me-1" role="status" />{t('Resolving...')}</>
                        : <><i className="bi bi-person-check me-1"></i>{t('Identify Senders')}</>}
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

            {/* View mode toggle */}
            <div className="btn-group btn-group-sm mb-3" role="group">
                <button
                    type="button"
                    className={`btn ${viewMode === 'conversations' ? 'btn-success' : 'btn-outline-success'}`}
                    onClick={() => setViewMode('conversations')}
                >
                    <i className="bi bi-chat-dots me-1"></i>{t('Conversations')}
                </button>
                <button
                    type="button"
                    className={`btn ${viewMode === 'messages' ? 'btn-secondary' : 'btn-outline-secondary'}`}
                    onClick={() => setViewMode('messages')}
                >
                    <i className="bi bi-list-ul me-1"></i>{t('All Messages')}
                </button>
            </div>

            {/* ── Conversations view ─────────────────────────────────────────── */}
            {viewMode === 'conversations' && (
                <div style={{ display: 'flex', border: '1px solid #dee2e6', borderRadius: '8px', overflow: 'hidden', height: isMobile ? 'calc(100vh - 200px)' : 'calc(100vh - 280px)', minHeight: '400px', background: '#f5f5f5' }}>
                    {/* Contact list — hidden on mobile when chat is open */}
                    <div style={{ width: isMobile ? '100%' : '280px', minWidth: isMobile ? undefined : '200px', borderRight: isMobile ? 'none' : '1px solid #dee2e6', background: '#fff', display: (isMobile && mobilePanel === 'chat') ? 'none' : 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '10px', borderBottom: '1px solid #dee2e6', background: '#f8f9fa' }}>
                            <div style={{ display: 'flex', gap: '6px', marginBottom: showNewConvInput ? '8px' : 0 }}>
                                <input
                                    className="form-control form-control-sm"
                                    placeholder={t('Search contacts...')}
                                    value={threadSearch}
                                    onChange={e => {
                                        setThreadSearch(e.target.value);
                                        clearTimeout(searchTimeout.current);
                                        searchTimeout.current = setTimeout(() => loadThreads(e.target.value), 350);
                                    }}
                                />
                                <button
                                    type="button"
                                    title={t('Start new conversation')}
                                    onClick={() => { setShowNewConvInput(v => !v); setNewConvPhone(''); }}
                                    style={{ flexShrink: 0, border: 'none', background: WA_GREEN, color: '#fff', borderRadius: '4px', padding: '0 8px', fontSize: '16px', cursor: 'pointer' }}
                                >
                                    <i className="bi bi-plus-lg"></i>
                                </button>
                            </div>
                            {showNewConvInput && (
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <input
                                        className="form-control form-control-sm"
                                        placeholder={t('Phone number (e.g. 971501234567)')}
                                        value={newConvPhone}
                                        autoFocus
                                        onChange={e => setNewConvPhone(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') startNewConversation(); if (e.key === 'Escape') { setShowNewConvInput(false); setNewConvPhone(''); } }}
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-success"
                                        disabled={!newConvPhone.trim()}
                                        onClick={startNewConversation}
                                        style={{ flexShrink: 0 }}
                                    >
                                        <i className="bi bi-arrow-right"></i>
                                    </button>
                                </div>
                            )}
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {threadsLoading && <div className="text-center py-3"><span className="spinner-border spinner-border-sm text-success" /></div>}
                            {!threadsLoading && threads.length === 0 && (
                                <div style={{ padding: '24px', textAlign: 'center', color: '#6c757d', fontSize: '13px' }}>
                                    <i className="bi bi-chat-dots fs-4 d-block mb-2"></i>{t('No conversations yet')}
                                </div>
                            )}
                            {threads.map(th => (
                                <div
                                    key={th.contact_phone}
                                    onClick={() => { setSelectedThread(th); loadThread(th.contact_phone); setComposeText(''); setSendMsgError(null); }}
                                    style={{
                                        padding: '10px 12px',
                                        borderBottom: '1px solid #f0f0f0',
                                        cursor: 'pointer',
                                        background: selectedThread?.contact_phone === th.contact_phone ? '#e8f5e9' : th.pinned ? '#fffde7' : '#fff',
                                        borderLeft: selectedThread?.contact_phone === th.contact_phone ? `3px solid ${WA_GREEN}` : th.pinned ? '3px solid #f9a825' : '3px solid transparent',
                                        position: 'relative',
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ overflow: 'hidden', flex: 1 }}>
                                            {(() => {
                                                const custInfo = customerByPhone[th.contact_phone];
                                                const displayName = th.sender_name || custInfo?.name || th.contact_phone;
                                                const isSupplier = th.sender_type === 'supplier';
                                                const isCustomer = th.sender_type === 'customer' || !!custInfo?.id;
                                                return (
                                                    <>
                                                        <div style={{ fontWeight: 600, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            {th.pinned && <i className="bi bi-pin-fill" style={{ color: '#f9a825', fontSize: '11px', flexShrink: 0 }}></i>}
                                                            <i className="bi bi-whatsapp me-1" style={{ color: WA_GREEN }}></i>
                                                            {displayName}
                                                        </div>
                                                        {(isSupplier || isCustomer || displayName !== th.contact_phone) && (
                                                            <div style={{ fontSize: '10px', color: '#6c757d', marginTop: '1px', display: 'flex', alignItems: 'center', gap: '3px', flexWrap: 'wrap' }}>
                                                                {isSupplier && (
                                                                    <span className="badge bg-warning text-dark" style={{ fontSize: '9px' }}>
                                                                        <i className="bi bi-truck me-1"></i>{t('Supplier')}
                                                                    </span>
                                                                )}
                                                                {isCustomer && (
                                                                    <span className="badge bg-primary" style={{ fontSize: '9px' }}>
                                                                        <i className="bi bi-person me-1"></i>{t('Customer')}
                                                                    </span>
                                                                )}
                                                                {!isSupplier && !isCustomer && null}
                                                                {(displayName !== th.contact_phone) && <span style={{ marginLeft: '2px' }}>{th.contact_phone}</span>}
                                                            </div>
                                                        )}
                                                    </>
                                                );
                                            })()}
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', marginLeft: '4px' }}>
                                            <span style={{ fontSize: '10px', color: '#6c757d', whiteSpace: 'nowrap' }}>
                                                {th.last_message_date ? new Date(th.last_message_date).toLocaleDateString() : ''}
                                            </span>
                                            <button
                                                onClick={e => { e.stopPropagation(); togglePin(th, 'whatsapp'); }}
                                                title={th.pinned ? t('Unpin') : t('Pin conversation')}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0', color: th.pinned ? '#f9a825' : '#ccc', fontSize: '12px', lineHeight: 1 }}
                                            >
                                                <i className={`bi ${th.pinned ? 'bi-pin-fill' : 'bi-pin'}`}></i>
                                            </button>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '3px' }}>
                                        <span style={{ fontSize: '12px', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>
                                            {th.last_message_text || t('(media)')}
                                        </span>
                                        {th.unread_count > 0 && (
                                            <span className="badge rounded-pill" style={{ background: WA_GREEN, fontSize: '10px', minWidth: '20px' }}>{th.unread_count}</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Chat panel — hidden on mobile when thread list is showing */}
                    <div style={{ flex: 1, display: (isMobile && mobilePanel === 'threads') ? 'none' : 'flex', flexDirection: 'column', background: '#ece5dd' }}>
                        {!selectedThread ? (
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6c757d', fontSize: '14px' }}>
                                <div style={{ textAlign: 'center' }}>
                                    <i className="bi bi-chat-dots fs-1 d-block mb-3" style={{ color: WA_GREEN, opacity: 0.5 }}></i>
                                    {t('Select a conversation to start chatting')}
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Chat header */}
                                <div style={{ background: '#075e54', color: '#fff', position: 'relative' }}>
                                    <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        {isMobile && (
                                            <button className="btn btn-sm" style={{ color: '#fff', padding: '2px 8px' }} onClick={() => { setMobilePanel('threads'); }}>
                                                <i className="bi bi-arrow-left"></i>
                                            </button>
                                        )}
                                        {(() => {
                                            const _isSelectedSupplier = selectedThread.sender_type === 'supplier';
                                            const _isSelectedCustomer = selectedThread.sender_type === 'customer' || !!threadCustomer?.id;
                                            return (
                                                <>
                                                    <i className="bi bi-whatsapp fs-5"></i>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontWeight: 600, fontSize: '14px' }}>
                                                            {selectedThread.sender_name || threadCustomer?.name || selectedThread.contact_phone}
                                                        </div>
                                                        <div style={{ fontSize: '11px', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                                                            {(selectedThread.sender_name || threadCustomer?.name) && <span>{selectedThread.contact_phone} · </span>}
                                                            <span>{selectedThread.message_count} {t('messages')}</span>
                                                            {_isSelectedSupplier && <span className="badge bg-warning text-dark" style={{ fontSize: '9px' }}><i className="bi bi-truck me-1"></i>{t('Supplier')}</span>}
                                                            {_isSelectedCustomer && <span className="badge bg-info text-dark" style={{ fontSize: '9px' }}><i className="bi bi-person me-1"></i>{t('Customer')}</span>}
                                                        </div>
                                                    </div>
                                                    {/* Supplier RFQs button — only for suppliers */}
                                                    {_isSelectedSupplier && <div ref={rfqHistoryRef} style={{ position: 'relative' }}>
                                            <button
                                                title={t('Supplier RFQ History')}
                                                onClick={() => {
                                                    const opening = !rfqHistoryOpen;
                                                    setRfqHistoryOpen(opening);
                                                    if (opening) { setCustomerRfqOpen(false); loadRFQHistory(selectedThread.contact_phone, true); }
                                                }}
                                                style={{ background: rfqHistoryOpen ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '8px', color: '#fff', padding: '5px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px' }}
                                            >
                                                <i className="bi bi-file-earmark-text"></i>
                                                <span style={{ fontSize: '12px' }}>{t('Supplier RFQs')}</span>
                                                {rfqHistoryList.length > 0 && (
                                                    <span style={{ background: '#25d366', borderRadius: '10px', fontSize: '11px', fontWeight: 700, padding: '1px 7px', lineHeight: 1.4, color: '#fff' }}>
                                                        {rfqHistoryList.length}
                                                    </span>
                                                )}
                                                {rfqHistoryLoading && rfqHistoryList.length === 0 && (
                                                    <span className="spinner-border spinner-border-sm text-white" style={{ width: '10px', height: '10px' }} />
                                                )}
                                            </button>
                                            {/* Supplier RFQ history dropdown */}
                                            {rfqHistoryOpen && (
                                                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '6px', background: '#fff', borderRadius: '10px', boxShadow: '0 4px 20px rgba(0,0,0,0.18)', minWidth: '300px', maxWidth: '380px', zIndex: 999, overflow: 'hidden' }}>
                                                    <div style={{ padding: '10px 14px', background: '#f8f9fa', borderBottom: '1px solid #e9ecef', fontSize: '13px', fontWeight: 600, color: '#212529', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <i className="bi bi-file-earmark-text text-success"></i>
                                                        {t('Supplier RFQ History')} — {selectedThread.sender_name || threadCustomer?.name || selectedThread.contact_phone}
                                                    </div>
                                                    <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
                                                        {rfqHistoryLoading && (
                                                            <div style={{ padding: '20px', textAlign: 'center', color: '#6c757d' }}>
                                                                <span className="spinner-border spinner-border-sm me-2" />
                                                                {t('Loading…')}
                                                            </div>
                                                        )}
                                                        {!rfqHistoryLoading && rfqHistoryList.length === 0 && (
                                                            <div style={{ padding: '20px', textAlign: 'center', color: '#6c757d', fontSize: '13px' }}>
                                                                <i className="bi bi-inbox me-2"></i>{t('No RFQs found for this contact')}
                                                            </div>
                                                        )}
                                                        {!rfqHistoryLoading && rfqHistoryList.map(rfq => (
                                                            <div
                                                                key={rfq.id}
                                                                style={{ borderBottom: '1px solid #f0f0f0' }}
                                                            >
                                                                <button
                                                                    onClick={() => { setRfqHistoryOpen(false); fetchAndOpenPreview(rfq.id); }}
                                                                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px 6px', background: 'none', border: 'none', color: '#212529', cursor: 'pointer', transition: 'background 0.15s' }}
                                                                    onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
                                                                    onMouseLeave={e => e.currentTarget.style.background = ''}
                                                                >
                                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                                            <span style={{ fontWeight: 600, fontSize: '13px', color: '#16a34a' }}>{rfq.code || rfq.id}</span>
                                                                            {rfq.procurement_message_code && (
                                                                                <span
                                                                                    role="button"
                                                                                    tabIndex={0}
                                                                                    onClick={e => { e.stopPropagation(); setRfqHistoryOpen(false); fetchAndOpenEmail(rfq.procurement_message_id); }}
                                                                                    onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); setRfqHistoryOpen(false); fetchAndOpenEmail(rfq.procurement_message_id); } }}
                                                                                    style={{ background: '#e8f0fe', border: '1px solid #c8d8f5', borderRadius: '10px', padding: '1px 7px', fontSize: '11px', color: '#1a56db', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 500 }}
                                                                                    title="Open linked email"
                                                                                >
                                                                                    <i className="bi bi-envelope" style={{ fontSize: '10px' }}></i>
                                                                                    {rfq.procurement_message_code}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <span style={{ fontSize: '11px', color: '#6c757d', whiteSpace: 'nowrap' }}>
                                                                            {rfq.created_at ? new Date(rfq.created_at).toLocaleDateString() : ''}
                                                                        </span>
                                                                    </div>
                                                                    {rfq.customer_name && (
                                                                        <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '3px' }}>
                                                                            <i className="bi bi-person me-1"></i>{rfq.customer_name}
                                                                        </div>
                                                                    )}
                                                                    {(rfq.products || []).length > 0 && (
                                                                        <div style={{ fontSize: '11px', color: '#6c757d', marginTop: '2px' }}>
                                                                            <i className="bi bi-box-seam me-1"></i>
                                                                            {(rfq.products || []).slice(0, 3).map(p => p.name).join(', ')}
                                                                            {(rfq.products || []).length > 3 && <span> +{rfq.products.length - 3} more</span>}
                                                                        </div>
                                                                    )}
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>}
                                        {/* Customer RFQs button — only for customers */}
                                        {_isSelectedCustomer && <div ref={customerRfqRef} style={{ position: 'relative' }}>
                                            <button
                                                title={t('Customer Quotation History')}
                                                onClick={() => {
                                                    const opening = !customerRfqOpen;
                                                    setCustomerRfqOpen(opening);
                                                    if (opening) {
                                                        setRfqHistoryOpen(false);
                                                        const cid = threadCustomer?.id;
                                                        if (cid) loadCustomerRfqs(cid, true);
                                                    }
                                                }}
                                                style={{ background: customerRfqOpen ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '8px', color: '#fff', padding: '5px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px' }}
                                            >
                                                <i className="bi bi-person-lines-fill"></i>
                                                <span style={{ fontSize: '12px' }}>{t('Customer RFQs')}</span>
                                                {customerRfqList.length > 0 && (
                                                    <span style={{ background: '#0d6efd', borderRadius: '10px', fontSize: '11px', fontWeight: 700, padding: '1px 7px', lineHeight: 1.4, color: '#fff' }}>
                                                        {customerRfqList.length}
                                                    </span>
                                                )}
                                                {customerRfqLoading && customerRfqList.length === 0 && (
                                                    <span className="spinner-border spinner-border-sm text-white" style={{ width: '10px', height: '10px' }} />
                                                )}
                                            </button>
                                            {/* Customer RFQ dropdown */}
                                            {customerRfqOpen && (
                                                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '6px', background: '#fff', borderRadius: '10px', boxShadow: '0 4px 20px rgba(0,0,0,0.18)', minWidth: '300px', maxWidth: '420px', zIndex: 999, overflow: 'hidden' }}>
                                                    <div style={{ padding: '10px 14px', background: '#e8f0fe', borderBottom: '1px solid #c8d8f5', fontSize: '13px', fontWeight: 600, color: '#1a56db', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <i className="bi bi-person-lines-fill"></i>
                                                        {t('Customer RFQs')} — {threadCustomer?.name || selectedThread.sender_name || selectedThread.contact_phone}
                                                    </div>
                                                    {!threadCustomer?.id && (
                                                        <div style={{ padding: '20px', textAlign: 'center', color: '#6c757d', fontSize: '13px' }}>
                                                            <i className="bi bi-person-x me-2"></i>{t('No customer found for this number')}
                                                        </div>
                                                    )}
                                                    {threadCustomer?.id && (
                                                        <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
                                                            {customerRfqLoading && (
                                                                <div style={{ padding: '20px', textAlign: 'center', color: '#6c757d' }}>
                                                                    <span className="spinner-border spinner-border-sm me-2" />
                                                                    {t('Loading…')}
                                                                </div>
                                                            )}
                                                            {!customerRfqLoading && customerRfqList.length === 0 && (
                                                                <div style={{ padding: '20px', textAlign: 'center', color: '#6c757d', fontSize: '13px' }}>
                                                                    <i className="bi bi-inbox me-2"></i>{t('No RFQs found for this customer')}
                                                                </div>
                                                            )}
                                                            {!customerRfqLoading && customerRfqList.map(q => (
                                                                <div key={q.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                                                    <button
                                                                        onClick={() => { setCustomerRfqOpen(false); fetchAndOpenPreview(q.id); }}
                                                                        style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px 6px', background: 'none', border: 'none', color: '#212529', cursor: 'pointer', transition: 'background 0.15s' }}
                                                                        onMouseEnter={e => e.currentTarget.style.background = '#f0f4ff'}
                                                                        onMouseLeave={e => e.currentTarget.style.background = ''}
                                                                    >
                                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                                                <span style={{ fontWeight: 600, fontSize: '13px', color: '#1a56db' }}>{q.code || q.id}</span>
                                                                                {q.procurement_message_code && (
                                                                                    <span
                                                                                        role="button"
                                                                                        tabIndex={0}
                                                                                        onClick={e => { e.stopPropagation(); setCustomerRfqOpen(false); fetchAndOpenEmail(q.procurement_message_id); }}
                                                                                        onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); setCustomerRfqOpen(false); fetchAndOpenEmail(q.procurement_message_id); } }}
                                                                                        style={{ background: '#e8f0fe', border: '1px solid #c8d8f5', borderRadius: '10px', padding: '1px 7px', fontSize: '11px', color: '#1a56db', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 500 }}
                                                                                        title="Open linked email"
                                                                                    >
                                                                                        <i className="bi bi-envelope" style={{ fontSize: '10px' }}></i>
                                                                                        {q.procurement_message_code}
                                                                                    </span>
                                                                                )}
                                                                                {q.status && <span className={`badge ${q.status === 'confirmed' ? 'bg-success' : q.status === 'cancelled' ? 'bg-danger' : 'bg-secondary'}`} style={{ fontSize: '10px' }}>{q.status}</span>}
                                                                            </div>
                                                                            <span style={{ fontSize: '11px', color: '#6c757d', whiteSpace: 'nowrap' }}>
                                                                                {q.created_at ? new Date(q.created_at).toLocaleDateString() : ''}
                                                                            </span>
                                                                        </div>
                                                                        {q.net_total > 0 && (
                                                                            <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600, marginTop: '3px' }}>
                                                                                {Number(q.net_total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                            </div>
                                                                        )}
                                                                        {(q.products || []).length > 0 && (
                                                                            <div style={{ fontSize: '11px', color: '#6c757d', marginTop: '2px' }}>
                                                                                <i className="bi bi-box-seam me-1"></i>
                                                                                {(q.products || []).slice(0, 3).map(p => p.name).join(', ')}
                                                                                {(q.products || []).length > 3 && <span> +{q.products.length - 3} more</span>}
                                                                            </div>
                                                                        )}
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>}
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                                {/* Messages area */}
                                <div ref={chatContainerRef} style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {threadMsgLoading && <div className="text-center py-4"><span className="spinner-border spinner-border-sm" /></div>}
                                    {!threadMsgLoading && threadMessages.map(msg => {
                                        const isOut = msg.direction === 'out';
                                        const isHovered = hoveredMsgId === msg.id;
                                        const isDeleting = deletingMsgId === msg.id;

                                        const doDelete = async () => {
                                            setDeletingMsgId(msg.id);
                                            try {
                                                await fetch(`/v1/procurement-messages/${msg.id}`, { method: 'DELETE', headers: { Authorization: token } });
                                                setThreadMessages(prev => prev.filter(m => m.id !== msg.id));
                                            } finally { setDeletingMsgId(null); }
                                        };

                                        // On mobile the icon is always visible; on desktop it shows on hover.
                                        const btnVisible = isMobile || isHovered;
                                        const trans = translations[msg.id];
                                        const isCopied = copiedMsgId === msg.id;

                                        const MsgMenu = ({ side }) => (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', opacity: btnVisible ? 1 : 0, transition: 'opacity 0.15s' }}>
                                                {/* Copy */}
                                                <button
                                                    onClick={e => { e.stopPropagation(); copyMsg(msg.id, msg.body_text); }}
                                                    disabled={!msg.body_text}
                                                    style={{ background: isCopied ? 'rgba(5,150,105,0.75)' : 'rgba(0,0,0,0.22)', border: 'none', borderRadius: '50%', width: '26px', height: '26px', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                    title={t('Copy message')}
                                                >
                                                    <i className={`bi ${isCopied ? 'bi-check2' : 'bi-clipboard'}`} style={{ fontSize: '12px', color: '#fff' }}></i>
                                                </button>
                                                {/* Translate */}
                                                {msg.body_text && (
                                                    <button
                                                        onClick={e => { e.stopPropagation(); translateMsg(msg.id, msg.body_text); }}
                                                        disabled={trans?.loading}
                                                        style={{ background: trans?.text ? 'rgba(59,130,246,0.75)' : 'rgba(0,0,0,0.22)', border: 'none', borderRadius: '50%', width: '26px', height: '26px', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                        title={t('Translate to English')}
                                                    >
                                                        {trans?.loading
                                                            ? <span className="spinner-border spinner-border-sm text-white" style={{ width: '10px', height: '10px' }} />
                                                            : <i className="bi bi-translate" style={{ fontSize: '12px', color: '#fff' }}></i>}
                                                    </button>
                                                )}
                                                {/* Add Quotation Prices to RFQ (PDF or image) */}
                                                {(msg.attachments || []).some(a => a.content_type === 'application/pdf' || a.filename?.toLowerCase().endsWith('.pdf') || isImageMime(a.content_type)) && (
                                                    <button
                                                        onClick={e => {
                                                            e.stopPropagation();
                                                            setExtractMsg({ ...msg, is_supplier_quotation: true });
                                                        }}
                                                        style={{ background: 'rgba(22,163,74,0.80)', border: 'none', borderRadius: '50%', width: '26px', height: '26px', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                        title={t('Add Quotation Prices to RFQ')}
                                                    >
                                                        <i className="bi bi-file-earmark-plus" style={{ fontSize: '12px', color: '#fff' }}></i>
                                                    </button>
                                                )}
                                                {/* Forward */}
                                                <button
                                                    onClick={e => {
                                                        e.stopPropagation();
                                                        setForwardMsg(msg);
                                                        setForwardTab('contacts');
                                                        setForwardSearch('');
                                                        setForwardSelected(new Set());
                                                        setForwardStatus(null);
                                                        setForwardPickedRfq(null);
                                                        setForwardEmailBody(msg.body_text || '');
                                                        setForwardEmailSubject('');
                                                        setForwardEmailStatus(null);
                                                    }}
                                                    style={{ background: 'rgba(0,0,0,0.22)', border: 'none', borderRadius: '50%', width: '26px', height: '26px', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                    title={t('Forward message')}
                                                >
                                                    <i className="bi bi-forward" style={{ fontSize: '12px', color: '#fff' }}></i>
                                                </button>
                                                {/* Delete */}
                                                <button
                                                    onClick={e => { e.stopPropagation(); doDelete(); }}
                                                    disabled={isDeleting}
                                                    style={{ background: 'rgba(0,0,0,0.22)', border: 'none', borderRadius: '50%', width: '26px', height: '26px', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                    title={t('Delete message')}
                                                >
                                                    {isDeleting
                                                        ? <span className="spinner-border spinner-border-sm text-white" style={{ width: '10px', height: '10px' }} />
                                                        : <i className="bi bi-trash3" style={{ fontSize: '12px', color: '#fff' }}></i>}
                                                </button>
                                            </div>
                                        );

                                        return (
                                            <div key={msg.id}
                                                style={{ display: 'flex', justifyContent: isOut ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: '4px', position: 'relative' }}
                                                onMouseEnter={() => !isMobile && setHoveredMsgId(msg.id)}
                                                onMouseLeave={() => { if (!isMobile) setHoveredMsgId(null); }}
                                            >
                                                {!isOut && <MsgMenu side="left" />}

                                                <div style={{
                                                    background: isOut ? '#dcf8c6' : '#fff',
                                                    borderRadius: isOut ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                                    padding: '8px 12px',
                                                    maxWidth: '70%',
                                                    fontSize: '13px',
                                                    whiteSpace: 'pre-wrap',
                                                    wordBreak: 'break-word',
                                                    boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                                                    opacity: isDeleting ? 0.4 : 1,
                                                    transition: 'opacity 0.2s',
                                                }}>
                                                    <div>{msg.body_text
                                                        ? <span style={{ whiteSpace: 'pre-line' }}>{msg.body_text}</span>
                                                        : msg.wa_message_type === 'contacts'
                                                            ? <span><i className="bi bi-person-vcard me-1"></i>{t('Contact card')}</span>
                                                            : <span style={{ color: '#999', fontStyle: 'italic' }}>{t('(media)')}</span>}
                                                    </div>
                                                    {/* Inline translation result */}
                                                    {trans?.text && (
                                                        <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid rgba(0,0,0,0.1)', color: '#1e40af', fontSize: '12px', fontStyle: 'normal' }}>
                                                            <span style={{ fontSize: '10px', color: '#6b7280', display: 'block', marginBottom: '2px' }}><i className="bi bi-translate me-1"></i>English</span>
                                                            {trans.text}
                                                        </div>
                                                    )}
                                                    {trans?.error && (
                                                        <div style={{ marginTop: '4px', fontSize: '11px', color: '#dc3545' }}>{t('Translation failed')}</div>
                                                    )}
                                                    {(msg.attachments || []).map((att, ai) => (
                                                        <div key={ai} style={{ marginTop: '4px', whiteSpace: 'normal', wordBreak: 'normal' }}>
                                                            <AttachmentPreview att={att} />
                                                        </div>
                                                    ))}
                                                    {/* Extract Quotation Prices button — only for incoming messages with PDF attachments */}
                                                    {!isOut && (msg.attachments || []).some(a =>
                                                        a.content_type === 'application/pdf' ||
                                                        (a.filename || '').toLowerCase().endsWith('.pdf')
                                                    ) && (
                                                        <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid rgba(0,0,0,0.08)' }}>
                                                            <button
                                                                className="btn btn-sm btn-outline-info"
                                                                style={{ fontSize: '11px', padding: '2px 8px', whiteSpace: 'nowrap' }}
                                                                title={t('Extract Quotation Prices with AI')}
                                                                onClick={e => { e.stopPropagation(); setExtractMsg({ ...msg, is_supplier_quotation: true }); }}
                                                            >
                                                                <i className="bi bi-receipt me-1"></i>{t('Extract Quotation Prices')}
                                                            </button>
                                                        </div>
                                                    )}
                                                    <div style={{ fontSize: '10px', color: '#999', textAlign: 'right', marginTop: '2px' }}>
                                                        {new Date(msg.message_date || msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        {isOut && <i className="bi bi-check2-all ms-1" style={{ color: '#34b7f1' }}></i>}
                                                    </div>
                                                </div>

                                                {isOut && <MsgMenu side="right" />}
                                            </div>
                                        );
                                    })}
                                    <div ref={chatBottomRef} />
                                </div>
                                {/* Compose box */}
                                <div style={{ padding: '10px 12px', background: '#f0f0f0', borderTop: '1px solid #ddd' }}>
                                    {sendMsgError && <div className="text-danger mb-1" style={{ fontSize: '12px' }}>{sendMsgError}</div>}

                                    {/* Attached file preview */}
                                    {attachedFile && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', borderRadius: '12px', padding: '6px 10px', marginBottom: '8px', fontSize: '12px' }}>
                                            {attachedFile.type === 'image'
                                                ? <img src={attachedFile.preview} alt="" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px' }} />
                                                : <i className="bi bi-file-earmark fs-4 text-primary"></i>}
                                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{attachedFile.file.name}</span>
                                            <button className="btn-close" style={{ fontSize: '10px' }} onClick={() => setAttachedFile(null)} />
                                        </div>
                                    )}

                                    {/* Voice recording indicator */}
                                    {recording ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#fff', borderRadius: '20px', padding: '8px 14px' }}>
                                            <span style={{ color: '#dc3545', fontWeight: 600, fontSize: '13px' }}>
                                                <i className="bi bi-record-circle me-1"></i>
                                                {t('Recording')} {String(Math.floor(recSeconds / 60)).padStart(2, '0')}:{String(recSeconds % 60).padStart(2, '0')}
                                            </span>
                                            <button className="btn btn-danger btn-sm ms-auto" style={{ borderRadius: '50%', width: '36px', height: '36px', padding: 0 }} onClick={handleStopRecording} title={t('Stop & Send')}>
                                                <i className="bi bi-stop-fill"></i>
                                            </button>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end' }}>
                                            {/* File attach */}
                                            <input ref={fileInputRef} type="file" style={{ display: 'none' }} accept="image/*,audio/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
                                                onChange={e => {
                                                    const f = e.target.files[0];
                                                    if (!f) return;
                                                    const isImg = f.type.startsWith('image/');
                                                    const preview = isImg ? URL.createObjectURL(f) : null;
                                                    setAttachedFile({ file: f, preview, type: isImg ? 'image' : 'doc' });
                                                    e.target.value = '';
                                                }}
                                            />
                                            <button className="btn btn-outline-secondary btn-sm" style={{ borderRadius: '50%', width: '38px', height: '38px', padding: 0, flexShrink: 0 }}
                                                onClick={() => fileInputRef.current?.click()} title={t('Attach file or photo')} disabled={sendingMsg || sendingMedia}>
                                                <i className="bi bi-paperclip"></i>
                                            </button>

                                            {/* Mic / voice record */}
                                            <button className="btn btn-outline-secondary btn-sm" style={{ borderRadius: '50%', width: '38px', height: '38px', padding: 0, flexShrink: 0 }}
                                                onClick={handleStartRecording} title={t('Record voice message')} disabled={sendingMsg || sendingMedia}>
                                                <i className="bi bi-mic"></i>
                                            </button>

                                            {/* Text area */}
                                            <textarea
                                                className="form-control"
                                                rows={2}
                                                placeholder={t('Type a message… (Shift+Enter for new line)')}
                                                value={composeText}
                                                disabled={sendingMsg || sendingMedia}
                                                style={{ fontSize: '13px', resize: 'none', borderRadius: '20px', padding: '8px 14px' }}
                                                onChange={e => { setComposeText(e.target.value); setSendMsgError(null); }}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                        e.preventDefault();
                                                        if (attachedFile) { handleSendMedia(attachedFile.file, attachedFile.file.type, attachedFile.file.name); } else { handleSendInThread(); }
                                                    }
                                                }}
                                            />

                                            {/* Translate to Arabic */}
                                            <button
                                                className="btn btn-outline-primary"
                                                style={{ borderRadius: '50%', width: '38px', height: '38px', padding: 0, flexShrink: 0, fontSize: '14px' }}
                                                disabled={!composeText.trim() || translatingCompose || sendingMsg}
                                                onClick={translateComposeText}
                                                title={t('Translate to Arabic')}
                                            >
                                                {translatingCompose
                                                    ? <span className="spinner-border spinner-border-sm" />
                                                    : <i className="bi bi-translate"></i>}
                                            </button>

                                            {/* Send button */}
                                            <button
                                                className="btn btn-success"
                                                style={{ borderRadius: '50%', width: '42px', height: '42px', padding: 0, flexShrink: 0 }}
                                                disabled={(attachedFile ? sendingMedia : !composeText.trim()) || sendingMsg || sendingMedia}
                                                onClick={() => { if (attachedFile) { handleSendMedia(attachedFile.file, attachedFile.file.type, attachedFile.file.name); } else { handleSendInThread(); } }}
                                                title={t('Send (Ctrl+Enter)')}
                                            >
                                                {(sendingMsg || sendingMedia)
                                                    ? <span className="spinner-border spinner-border-sm" role="status" />
                                                    : <i className="bi bi-send-fill"></i>}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ── All Messages view (original flat table) ────────────────────── */}
            {viewMode === 'messages' && <>
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
                        {(() => {
                            const today = new Date(); today.setHours(0,0,0,0);
                            const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
                            let lastDateKey = null;
                            const rows = [];
                            messages.forEach(msg => {
                                const d = msg.message_date ? new Date(msg.message_date) : null;
                                if (d) {
                                    const dDay = new Date(d); dDay.setHours(0,0,0,0);
                                    const dateKey = dDay.getTime();
                                    if (dateKey !== lastDateKey) {
                                        lastDateKey = dateKey;
                                        const label = dateKey === today.getTime() ? t('Today') : dateKey === yesterday.getTime() ? t('Yesterday') : d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
                                        rows.push(
                                            <tr key={`date-${dateKey}`}>
                                                <td colSpan={10} style={{ background: 'var(--date-sep-bg, #f0f4f8)', textAlign: 'center', fontSize: '11px', color: '#6c757d', padding: '4px 8px', fontWeight: 600, borderTop: '2px solid #dee2e6' }}>
                                                    {label}
                                                </td>
                                            </tr>
                                        );
                                    }
                                }
                                rows.push(
                            <tr
                                key={msg.id}
                                style={{ cursor: 'pointer', fontWeight: msg.read ? 400 : 700, background: msg.processed_as_rfq ? '#f0fff4' : undefined }}
                                onClick={() => openMessage(msg)}
                            >
                                <td style={{ verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                    <code style={{ fontSize: '11px', color: '#6c757d' }}>{msg.code || '—'}</code>
                                </td>
                                <td style={{ verticalAlign: 'middle' }}>{directionBadge(msg.direction)}</td>
                                <td style={{ verticalAlign: 'middle', maxWidth: '180px' }}>
                                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msg.from || <span className="text-muted">—</span>}</div>
                                    {msg.sender_name && (
                                        <div style={{ fontSize: '11px', marginTop: '1px' }}>
                                            <span className={`badge ${msg.sender_type === 'supplier' ? 'bg-warning text-dark' : 'bg-primary'}`} style={{ fontSize: '10px' }}>
                                                {msg.sender_type === 'supplier' ? <i className="bi bi-truck me-1"></i> : <i className="bi bi-person me-1"></i>}
                                                {msg.sender_name}
                                            </span>
                                        </div>
                                    )}
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
                                    {msg.body_text
                                        ? msg.body_text
                                        : msg.wa_message_type === 'contacts'
                                            ? <span className="text-muted"><i className="bi bi-person-vcard me-1"></i>{t('Contact card')}</span>
                                            : <span className="text-muted">{t('(media)')}</span>}
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
                                );
                            });
                            return rows;
                        })()}
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
            </>}

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

                                {/* Reply compose box — only for incoming messages */}
                                {selected.direction === 'in' && (
                                    <div style={{ marginTop: '16px', borderTop: '1px solid #e9ecef', paddingTop: '12px' }}>
                                        <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '8px', color: '#198754' }}>
                                            <i className="bi bi-reply me-1"></i>{t('Reply to')} {selected.from}
                                        </div>
                                        <textarea
                                            className="form-control"
                                            rows={3}
                                            placeholder={t('Type your reply...')}
                                            value={replyText}
                                            disabled={sendingReply}
                                            style={{ fontSize: '13px', resize: 'vertical' }}
                                            onChange={e => { setReplyText(e.target.value); setReplyError(null); }}
                                            onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSendReply(); }}
                                        />
                                        {replyError && (
                                            <div className="text-danger" style={{ fontSize: '12px', marginTop: '4px' }}>{replyError}</div>
                                        )}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                                            <button
                                                className="btn btn-outline-primary btn-sm"
                                                disabled={!replyText.trim() || translatingReply}
                                                onClick={translateReplyText}
                                                title="Translate to Arabic"
                                            >
                                                {translatingReply
                                                    ? <span className="spinner-border spinner-border-sm" />
                                                    : <><i className="bi bi-translate me-1"></i>EN → AR</>}
                                            </button>
                                            <button
                                                className="btn btn-success btn-sm"
                                                disabled={!replyText.trim() || sendingReply}
                                                onClick={handleSendReply}
                                            >
                                                {sendingReply
                                                    ? <><span className="spinner-border spinner-border-sm me-1" role="status" />{t('Sending...')}</>
                                                    : <><i className="bi bi-send me-1"></i>{t('Send Reply')}</>}
                                            </button>
                                        </div>
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
                    onViewRFQ={fetchAndOpenPreview}
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
                    load(page);
                    if (newRfq?.id) {
                        setRfqForSend(newRfq);
                        setShowSendModal(true);
                    }
                }}
            />

            {/* ── Forward Modal ────────────────────────────────────────────────── */}
            {forwardMsg && (
                <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.45)', zIndex: 10200 }} onClick={e => { if (e.target === e.currentTarget) setForwardMsg(null); }}>
                    <div className="modal-dialog modal-lg" style={{ maxWidth: '540px' }}>
                        <div className="modal-content">
                            <div className="modal-header py-2">
                                <h6 className="modal-title mb-0"><i className="bi bi-forward me-2 text-success"></i>{t('Forward Message')}</h6>
                                <button className="btn-close" onClick={() => setForwardMsg(null)} />
                            </div>
                            {/* Tabs */}
                            <ul className="nav nav-tabs px-3 pt-2" style={{ borderBottom: '1px solid #dee2e6' }}>
                                {[
                                    { key: 'contacts', icon: 'bi-whatsapp', label: t('All Contacts') },
                                    { key: 'wa',       icon: 'bi-person-check', label: t('Customer WhatsApp') },
                                    { key: 'email',    icon: 'bi-envelope-arrow-up', label: t('Customer Email') },
                                ].map(tab => (
                                    <li key={tab.key} className="nav-item">
                                        <button className={`nav-link py-1 px-2 ${forwardTab === tab.key ? 'active' : ''}`} style={{ fontSize: '12px' }}
                                            onClick={() => { setForwardTab(tab.key); setForwardStatus(null); setForwardEmailStatus(null); setForwardPickedRfq(null); }}>
                                            <i className={`bi ${tab.icon} me-1`}></i>{tab.label}
                                        </button>
                                    </li>
                                ))}
                            </ul>

                            <div className="modal-body" style={{ maxHeight: '50vh', overflowY: 'auto', padding: '12px' }}>
                                {/* Original message preview */}
                                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '8px 10px', marginBottom: '10px', fontSize: '12px', color: '#166534' }}>
                                    <i className="bi bi-chat-text me-1"></i>
                                    {forwardMsg.body_text ? forwardMsg.body_text.slice(0, 120) + (forwardMsg.body_text.length > 120 ? '…' : '') : t('(media message)')}
                                    {(forwardMsg.attachments || []).filter(a => a.url).length > 0 && (
                                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                                            {(forwardMsg.attachments || []).filter(a => a.url).map((att, i) => (
                                                isImageMime(att.content_type)
                                                    ? <img key={i} src={att.url} alt="" style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #bbf7d0' }} />
                                                    : <span key={i} style={{ fontSize: '11px', background: '#dcfce7', borderRadius: '4px', padding: '2px 6px' }}><i className="bi bi-paperclip me-1"></i>{att.filename || att.content_type}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* ── Tab: All Contacts ── */}
                                {forwardTab === 'contacts' && (
                                    <div>
                                        <input className="form-control form-control-sm mb-2" placeholder={t('Search contacts…')}
                                            value={forwardSearch} onChange={e => setForwardSearch(e.target.value)} />
                                        <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                                            {threads
                                                .filter(th => th.contact_phone !== selectedThread?.contact_phone)
                                                .filter(th => !forwardSearch || (th.sender_name || th.contact_phone || '').toLowerCase().includes(forwardSearch.toLowerCase()))
                                                .map(th => {
                                                    const phone = th.contact_phone;
                                                    const label = th.sender_name ? `${th.sender_name} (${phone})` : phone;
                                                    const checked = forwardSelected.has(phone);
                                                    return (
                                                        <label key={phone} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 4px', cursor: 'pointer', borderRadius: '5px', fontSize: '13px' }}
                                                            className="hover-bg-light">
                                                            <input type="checkbox" checked={checked} onChange={() => {
                                                                setForwardSelected(prev => {
                                                                    const n = new Set(prev);
                                                                    if (n.has(phone)) n.delete(phone); else n.add(phone);
                                                                    return n;
                                                                });
                                                            }} />
                                                            <i className="bi bi-whatsapp text-success" style={{ fontSize: '14px' }}></i>
                                                            <span style={{ flex: 1 }}>{label}</span>
                                                        </label>
                                                    );
                                                })}
                                        </div>
                                        {forwardStatus && (
                                            <div className={`alert alert-${forwardStatus.ok ? 'success' : 'danger'} py-1 px-2 mt-2`} style={{ fontSize: '12px' }}>{forwardStatus.msg}</div>
                                        )}
                                    </div>
                                )}

                                {/* ── Tab: Customer WhatsApp ── */}
                                {forwardTab === 'wa' && (
                                    <div>
                                        {rfqHistoryList.length === 0 && <div className="text-muted" style={{ fontSize: '13px' }}>{t('No linked RFQs for this conversation.')}</div>}
                                        {rfqHistoryList.map(rfq => (
                                            <div key={rfq.id} style={{ border: '1px solid #dee2e6', borderRadius: '6px', padding: '8px 10px', marginBottom: '6px', background: forwardPickedRfq?.id === rfq.id ? '#f0fdf4' : '#fff', cursor: 'pointer' }}
                                                onClick={() => setForwardPickedRfq(rfq)}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
                                                    <div>
                                                        <span style={{ fontWeight: 600, fontSize: '12px', color: '#16a34a' }}>{rfq.code}</span>
                                                        {rfq.customer_name && <span className="ms-2" style={{ fontSize: '12px' }}>{rfq.customer_name}</span>}
                                                    </div>
                                                    {rfq.customer_phone
                                                        ? <span style={{ fontSize: '12px', color: '#0f9d58' }}><i className="bi bi-whatsapp me-1"></i>{rfq.customer_phone}</span>
                                                        : <span style={{ fontSize: '11px', color: '#dc3545' }}><i className="bi bi-exclamation-circle me-1"></i>{t('No WA number')}</span>}
                                                </div>
                                            </div>
                                        ))}
                                        {forwardPickedRfq && !forwardPickedRfq.customer_phone && (
                                            <div className="alert alert-warning py-1 px-2" style={{ fontSize: '12px' }}>
                                                {t('No WhatsApp number available for the customer in this RFQ.')}
                                            </div>
                                        )}
                                        {forwardStatus && (
                                            <div className={`alert alert-${forwardStatus.ok ? 'success' : 'danger'} py-1 px-2 mt-2`} style={{ fontSize: '12px' }}>{forwardStatus.msg}</div>
                                        )}
                                    </div>
                                )}

                                {/* ── Tab: Customer Email ── */}
                                {forwardTab === 'email' && (
                                    <div>
                                        {rfqHistoryList.length === 0 && <div className="text-muted" style={{ fontSize: '13px' }}>{t('No linked RFQs for this conversation.')}</div>}
                                        {rfqHistoryList.map(rfq => (
                                            <div key={rfq.id} style={{ border: '1px solid #dee2e6', borderRadius: '6px', padding: '8px 10px', marginBottom: '6px', background: forwardPickedRfq?.id === rfq.id ? '#e8f0fe' : '#fff', cursor: 'pointer' }}
                                                onClick={() => {
                                                    setForwardPickedRfq(rfq);
                                                    if (rfq.customer_email) {
                                                        setForwardEmailSubject(`Fwd: ${rfq.code || 'Message'}`);
                                                        const attLines = (forwardMsg.attachments || [])
                                                            .filter(a => a.url)
                                                            .map(a => `${window.location.origin}${a.url.startsWith('/') ? '' : '/'}${a.url}`);
                                                        const parts = [forwardMsg.body_text, ...attLines].filter(Boolean);
                                                        setForwardEmailBody(parts.join('\n\n'));
                                                    }
                                                    setForwardEmailStatus(null);
                                                }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
                                                    <div>
                                                        <span style={{ fontWeight: 600, fontSize: '12px', color: '#1a56db' }}>{rfq.code}</span>
                                                        {rfq.customer_name && <span className="ms-2" style={{ fontSize: '12px' }}>{rfq.customer_name}</span>}
                                                    </div>
                                                    {rfq.customer_email
                                                        ? <span style={{ fontSize: '12px', color: '#1a73e8' }}><i className="bi bi-envelope me-1"></i>{rfq.customer_email}</span>
                                                        : <span style={{ fontSize: '11px', color: '#dc3545' }}><i className="bi bi-exclamation-circle me-1"></i>{t('No email')}</span>}
                                                </div>
                                            </div>
                                        ))}
                                        {forwardPickedRfq && (
                                            <div style={{ marginTop: '10px', borderTop: '1px solid #dee2e6', paddingTop: '10px' }}>
                                                {/* To field */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', padding: '6px 10px', background: forwardPickedRfq.customer_email ? '#eff6ff' : '#fff3cd', borderRadius: '5px', border: `1px solid ${forwardPickedRfq.customer_email ? '#bfdbfe' : '#ffc107'}` }}>
                                                    <i className={`bi ${forwardPickedRfq.customer_email ? 'bi-envelope-fill text-primary' : 'bi-exclamation-triangle-fill text-warning'}`} style={{ fontSize: '13px' }}></i>
                                                    <span style={{ fontSize: '12px' }}>
                                                        <strong>{t('To:')} </strong>
                                                        {forwardPickedRfq.customer_email
                                                            ? <span style={{ color: '#1d4ed8' }}>{forwardPickedRfq.customer_email}</span>
                                                            : <span style={{ color: '#92400e' }}>{t('No email address available for this customer')}</span>}
                                                    </span>
                                                </div>
                                                {forwardPickedRfq.customer_email && (
                                                    <>
                                                        <input className="form-control form-control-sm mb-2" placeholder={t('Subject')}
                                                            value={forwardEmailSubject} onChange={e => setForwardEmailSubject(e.target.value)} />
                                                        <textarea className="form-control form-control-sm mb-2" rows={4} placeholder={t('Message body…')}
                                                            value={forwardEmailBody} onChange={e => setForwardEmailBody(e.target.value)} />
                                                        {(forwardMsg.attachments || []).filter(a => a.url).length > 0 && (
                                                            <div style={{ fontSize: '11px', color: '#6c757d', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                <i className="bi bi-paperclip"></i>
                                                                <span>{t('Attachment links included in body:')}{' '}{(forwardMsg.attachments || []).filter(a => a.url).map(a => a.filename || a.content_type).join(', ')}</span>
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        )}
                                        {forwardEmailStatus && (
                                            <div className={`alert alert-${forwardEmailStatus.ok ? 'success' : 'danger'} py-1 px-2 mt-2`} style={{ fontSize: '12px' }}>{forwardEmailStatus.msg}</div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="modal-footer py-2">
                                <button className="btn btn-secondary btn-sm" onClick={() => setForwardMsg(null)}>{t('Cancel')}</button>

                                {/* Forward to all contacts */}
                                {forwardTab === 'contacts' && (
                                    <button className="btn btn-success btn-sm" disabled={forwardSelected.size === 0 || forwardSending}
                                        onClick={async () => {
                                            setForwardSending(true);
                                            setForwardStatus(null);
                                            const mediaAtts = (forwardMsg.attachments || []).filter(a => a.url);
                                            // Pre-fetch media blobs once so we don't re-download per contact
                                            const blobs = await Promise.all(mediaAtts.map(async att => {
                                                try { const r = await fetch(att.url); return { blob: await r.blob(), att }; }
                                                catch (_) { return null; }
                                            }));
                                            let ok = 0, fail = 0;
                                            for (const phone of forwardSelected) {
                                                try {
                                                    // Send text if present
                                                    if (forwardMsg.body_text?.trim()) {
                                                        const res = await fetch(`/v1/procurement-message-threads/${encodeURIComponent(phone)}/send`, {
                                                            method: 'POST',
                                                            headers: { Authorization: token, 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({ store_id: storeId, text: forwardMsg.body_text }),
                                                        });
                                                        if (!res.ok) { fail++; continue; }
                                                    }
                                                    // Send each attachment
                                                    for (const item of blobs.filter(Boolean)) {
                                                        const fd = new FormData();
                                                        fd.append('file', new File([item.blob], item.att.filename || 'media', { type: item.att.content_type || item.blob.type }));
                                                        fd.append('store_id', storeId);
                                                        await fetch(`/v1/procurement-message-threads/${encodeURIComponent(phone)}/send-media`, {
                                                            method: 'POST', headers: { Authorization: token }, body: fd,
                                                        });
                                                    }
                                                    ok++;
                                                } catch (_) { fail++; }
                                            }
                                            setForwardSending(false);
                                            setForwardStatus({ ok: fail === 0, msg: fail === 0 ? `${t('Forwarded to')} ${ok} ${t('contact(s)')}` : `${ok} ${t('sent')}, ${fail} ${t('failed')}` });
                                            if (fail === 0) setForwardSelected(new Set());
                                        }}>
                                        {forwardSending
                                            ? <><span className="spinner-border spinner-border-sm me-1" />{t('Sending…')}</>
                                            : <><i className="bi bi-forward me-1"></i>{t('Forward to')} {forwardSelected.size} {t('contact(s)')}</>}
                                    </button>
                                )}

                                {/* Forward to customer WhatsApp */}
                                {forwardTab === 'wa' && forwardPickedRfq?.customer_phone && (
                                    <button className="btn btn-success btn-sm"
                                        onClick={async () => {
                                            const phone = forwardPickedRfq.customer_phone;
                                            const th = threads.find(t => t.contact_phone === phone) || { contact_phone: phone, sender_name: forwardPickedRfq.customer_name || '' };
                                            setSelectedThread(th);
                                            loadThread(phone);
                                            if (forwardMsg.body_text) setComposeText(forwardMsg.body_text);
                                            // Set first attachment so user can send it
                                            const firstAtt = (forwardMsg.attachments || []).find(a => a.url);
                                            if (firstAtt) {
                                                try {
                                                    const blob = await fetch(firstAtt.url).then(r => r.blob());
                                                    const file = new File([blob], firstAtt.filename || 'media', { type: firstAtt.content_type || blob.type });
                                                    setAttachedFile({ file, preview: firstAtt.url, type: isImageMime(firstAtt.content_type) ? 'image' : 'doc' });
                                                } catch (_) {}
                                            }
                                            setForwardMsg(null);
                                        }}>
                                        <i className="bi bi-whatsapp me-1"></i>{t('Open Chat')}
                                    </button>
                                )}

                                {/* Forward to customer Email */}
                                {forwardTab === 'email' && forwardPickedRfq?.customer_email && forwardEmailBody.trim() && (
                                    <button className="btn btn-primary btn-sm" disabled={forwardSending}
                                        onClick={async () => {
                                            setForwardSending(true);
                                            setForwardEmailStatus(null);
                                            try {
                                                const res = await fetch(`/v1/procurement-email-send?store_id=${storeId}`, {
                                                    method: 'POST',
                                                    headers: { Authorization: token, 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ to: forwardPickedRfq.customer_email, subject: forwardEmailSubject, body: forwardEmailBody }),
                                                });
                                                const data = await res.json();
                                                if (res.ok && !data.error) {
                                                    setForwardEmailStatus({ ok: true, msg: t('Email sent successfully') });
                                                    setTimeout(() => setForwardMsg(null), 1500);
                                                } else {
                                                    setForwardEmailStatus({ ok: false, msg: data.error || t('Failed to send email') });
                                                }
                                            } catch (_) {
                                                setForwardEmailStatus({ ok: false, msg: t('Network error') });
                                            } finally { setForwardSending(false); }
                                        }}>
                                        {forwardSending
                                            ? <><span className="spinner-border spinner-border-sm me-1" />{t('Sending…')}</>
                                            : <><i className="bi bi-envelope-arrow-up me-1"></i>{t('Send Email')}</>}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* RFQ Detail modal (opened from RFQ history in WhatsApp conversation header) */}
            <ForwardDetail
                rfq={rfqDetailItem}
                show={rfqDetailShow}
                onHide={() => setRfqDetailShow(false)}
                storeId={storeId}
                onCreateQuotation={handleCreateQuotation}
                onSendToSuppliers={rfq => { setRfqForSend(rfq); setShowSendModal(true); }}
            />
            <QuotationCreate ref={quotationCreateRef} showToastMessage={(msg, type) => showToast(msg, type)} refreshList={() => {}} />

            {/* Send RFQ modal — stays on this page, no navigation */}
            <RFQSendModal
                rfq={rfqForSend}
                storeId={storeId}
                show={showSendModal}
                onHide={() => setShowSendModal(false)}
                onSent={() => {}}
            />

            {/* Email Detail modal (opened from linked email badge in RFQ history) */}
            <EmailDetailModal
                msg={emailDetailMsg}
                show={emailDetailShow}
                onClose={() => setEmailDetailShow(false)}
                storeId={storeId}
                token={token}
            />
        </div>
    );
}
