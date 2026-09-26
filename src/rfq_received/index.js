import React, { useState, useEffect, useCallback, useRef } from "react";
import { unstable_batchedUpdates } from 'react-dom';
import eventEmitter from '../utils/eventEmitter';
import QuotationCreate from "../quotation/create";
import RFQCreate from "./create";
import CustomerCreate from "../customer/create";
import RFQPreview from "./RFQPreview";
import RFQPreviewContent from "./RFQPreviewContent";
import { Badge, Spinner, Button, Modal, Alert } from "react-bootstrap";
import ReactPaginate from "react-paginate";
import { useTranslation } from "react-i18next";
import { useHistory, useLocation } from "react-router-dom";
import { AI_PROVIDERS, modelsForProvider, fileCapabilityLabel } from '../utils/aiProviders.js';
import EmailDetailModal from '../store/EmailDetailModal.js';
import { SupplierForm } from '../rfq_suppliers/index.js';
import { WhatsAppChatModal, EmailChatModal } from '../store/ConversationModal.js';
import RFQWhatsAppConversationsPanel from './RFQWhatsAppConversationsPanel.js';
import RFQEmailConversationsPanel from './RFQEmailConversationsPanel.js';

// Exported for unit testing — determines whether a WABA template sends a PDF document
// (DOCUMENT header) vs an image (IMAGE header or no media header).
export function rfqTemplateWantsDocument(templateComponents) {
    return (templateComponents || []).some(
        c => (c.type || '').toLowerCase() === 'header' && (c.format || '').toUpperCase() === 'DOCUMENT'
    );
}

const STATUS_CONFIG = {
    received:      { labelKey: "status_received",      bg: "secondary" },
    processing:    { labelKey: "status_processing",    bg: "warning", text: "dark" },
    ready_to_send: { labelKey: "status_ready_to_send", bg: "info", text: "dark" },
    forwarded:     { labelKey: "status_forwarded",     bg: "success" },
    failed:        { labelKey: "status_failed",        bg: "danger" },
    ignored:       { labelKey: "status_ignored",       bg: "secondary" },
};

function StatusBadge({ status }) {
    const { t } = useTranslation('common');
    const cfg = STATUS_CONFIG[status] || { labelKey: status, bg: "secondary" };
    return <Badge bg={cfg.bg} text={cfg.text || undefined}>{t(cfg.labelKey)}</Badge>;
}

// ── Price Comparison Table ────────────────────────────────────────────────────

function fmt(v) {
    if (!v && v !== 0) return '—';
    return Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function PriceComparisonTable({ rfq, storeId, onCreateQuotation, onRfqReload }) {
    const { t } = useTranslation('common');
    const token = localStorage.getItem('access_token');

    // Manual reply form state
    const [showAddReply, setShowAddReply] = useState(false);
    const [replyForm, setReplyForm]       = useState({ supplier_name: '', supplier_phone: '', supplier_email: '', raw_text: '' });
    const [addingReply, setAddingReply]   = useState(false);
    const [addError, setAddError]         = useState('');
    const [addOk, setAddOk]               = useState(false);
    // File upload state
    const [uploadingFile, setUploadingFile] = useState(false);
    const [uploadedFileName, setUploadedFileName] = useState('');
    const fileInputRef = useRef(null);
    // Update product prices state
    const [updatingPrices, setUpdatingPrices] = useState(false);
    const [priceUpdateResult, setPriceUpdateResult] = useState(null);
    // Delete supplier reply state
    const [deletingReplyId, setDeletingReplyId] = useState(null);
    const [deleteReplyError, setDeleteReplyError] = useState('');

    // Per-product: selected supplier and margin %
    const products = rfq.products || [];
    const replies  = (rfq.supplier_replies || []).filter(r => r.is_quotation && r.prices?.length > 0);

    // Load default margin from store settings cache
    const defaultMarginPct = (() => {
        try {
            const s = JSON.parse(localStorage.getItem('_store_settings_cache') || 'null');
            const v = parseFloat(s?.default_quotation_margin_percent);
            return (!isNaN(v) && v >= 0) ? v : 35;
        } catch (_) { return 35; }
    })();

    // Deduplicate suppliers: one column per unique supplier (by phone, then name).
    // When a supplier has multiple reply records, keep the latest one (by received_at).
    const supplierMap = new Map(); // key → reply
    for (const r of replies) {
        const key = r.supplier_phone?.trim() || r.supplier_name?.trim() || r.id;
        const existing = supplierMap.get(key);
        if (!existing || (r.received_at && (!existing.received_at || r.received_at > existing.received_at))) {
            supplierMap.set(key, r);
        }
    }
    const suppliers = Array.from(supplierMap.values()).map(r => ({ name: r.supplier_name, phone: r.supplier_phone, id: r.id }));

    // Build price map: productIndex → { supplierId → price }
    const priceMap = {};
    for (const reply of Array.from(supplierMap.values())) {
        for (const p of (reply.prices || [])) {
            if (!priceMap[p.product_index]) priceMap[p.product_index] = {};
            priceMap[p.product_index][reply.id] = p;
        }
    }

    // State: selected supplier per product (default = lowest price supplier)
    const defaultSelections = () => {
        const sel = {};
        products.forEach((_, i) => {
            if (!priceMap[i]) return;
            let lowestId = null, lowestPrice = Infinity;
            for (const [sid, p] of Object.entries(priceMap[i])) {
                if (p.unit_price < lowestPrice) { lowestPrice = p.unit_price; lowestId = sid; }
            }
            sel[i] = lowestId;
        });
        return sel;
    };
    const [selectedSupplier, setSelectedSupplier] = useState(defaultSelections);
    const [margins, setMargins] = useState(() => {
        const m = {};
        // Pre-fill with store default margin; individual product margins loaded in effect below
        products.forEach((_, i) => { m[i] = String(defaultMarginPct); });
        return m;
    });

    // Re-run defaults when rfq changes (new reply added)
    useEffect(() => { setSelectedSupplier(defaultSelections()); }, [rfq.id, (rfq.supplier_replies || []).length]); // eslint-disable-line react-hooks/exhaustive-deps

    // Load each product's stored retail_margin_percent and override default margin
    useEffect(() => {
        const productIDs = products.map(p => p.product_id).filter(Boolean);
        if (!productIDs.length) return;
        let cancelled = false;
        (async () => {
            for (let i = 0; i < products.length; i++) {
                const pid = products[i].product_id;
                if (!pid) continue;
                try {
                    const res = await fetch(
                        `/v1/product/${pid}?search[store_id]=${storeId}&select=product_stores.${storeId}.retail_margin_percent`,
                        { headers: { Authorization: token } }
                    );
                    const data = await res.json();
                    if (cancelled) return;
                    const m = parseFloat(data.result?.product_stores?.[storeId]?.retail_margin_percent);
                    if (!isNaN(m) && m > 0) {
                        setMargins(prev => ({ ...prev, [i]: String(m) }));
                    }
                } catch (_) {}
            }
        })();
        return () => { cancelled = true; };
    }, [rfq.id]); // eslint-disable-line react-hooks/exhaustive-deps

    const retailPrice = (productIndex) => {
        const sid = selectedSupplier[productIndex];
        if (!sid || !priceMap[productIndex]?.[sid]) return null;
        const cost = priceMap[productIndex][sid].unit_price;
        const m = parseFloat(margins[productIndex]);
        if (!isNaN(m) && m > 0) return parseFloat((cost * (1 + m / 100)).toFixed(8));
        return null;
    };

    const handleAddReply = async () => {
        setAddingReply(true);
        setAddError('');
        setAddOk(false);
        try {
            const res = await fetch(`/v1/rfq-received/${rfq.id}/supplier-replies?store_id=${storeId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: token },
                body: JSON.stringify({ ...replyForm, run_llm_extraction: true }),
            });
            const data = await res.json();
            if (data.error) { setAddError(data.error); return; }
            setAddOk(true);
            setReplyForm({ supplier_name: '', supplier_phone: '', supplier_email: '', raw_text: '' });
            setUploadedFileName('');
            setShowAddReply(false);
        } catch (e) { setAddError(e.message); }
        finally { setAddingReply(false); }
    };

    const handleFileUpload = async (file) => {
        if (!file) return;
        setUploadingFile(true);
        setAddError('');
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await fetch(`/v1/rfq-received/${rfq.id}/supplier-replies/parse-file?store_id=${storeId}`, {
                method: 'POST',
                headers: { Authorization: token },
                body: formData,
            });
            const data = await res.json();
            if (data.error) { setAddError(data.error); return; }
            setReplyForm(f => ({ ...f, raw_text: data.extracted_text || '' }));
            setUploadedFileName(data.file_name || file.name);
        } catch (e) { setAddError(e.message); }
        finally { setUploadingFile(false); }
    };

    const handleDeleteReply = async (replyId) => {
        if (!window.confirm(t('Confirm delete this supplier quotation?'))) return;
        setDeletingReplyId(replyId);
        setDeleteReplyError('');
        try {
            const res = await fetch(`/v1/rfq-received/${rfq.id}/supplier-replies/${replyId}?store_id=${storeId}`, {
                method: 'DELETE', headers: { Authorization: token },
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) { setDeleteReplyError(data.error || t('Delete failed')); }
            else if (onRfqReload) { onRfqReload(); }
        } catch (e) { setDeleteReplyError(e.message); }
        finally { setDeletingReplyId(null); }
    };

    const buildQuotationItems = () =>
        products.map((prod, i) => {
            const sid = selectedSupplier[i];
            const priceEntry = sid ? priceMap[i]?.[sid] : null;
            const costPrice = priceEntry ? priceEntry.unit_price : 0;
            const retail = retailPrice(i);
            const supplier = sid ? replies.find(r => r.id === sid) : null;
            return {
                product_id:         prod.product_id || null,
                product_name:       prod.name,
                part_no:            prod.part_no || '',
                quantity:           prod.quantity || 1,
                unit:               prod.unit || '',
                cost_price:         costPrice,
                unit_price:         retail ?? costPrice,
                margin_percent:     parseFloat(margins[i]) || 0,
                supplier_name:      supplier?.supplier_name || '',
                supplier_phone:     supplier?.supplier_phone || '',
            };
        });

    const handleUpdateProductPrices = async () => {
        const items = [];
        products.forEach((prod, i) => {
            if (!prod.product_id) return;
            const sid = selectedSupplier[i];
            if (!sid) return;
            const priceEntry = priceMap[i]?.[sid];
            if (!priceEntry) return;
            const retail = retailPrice(i);
            items.push({
                product_index:      i,
                purchase_unit_price: priceEntry.unit_price,
                retail_unit_price:  retail ?? priceEntry.unit_price,
                vat_included:       !!priceEntry.vat_included,
            });
        });
        if (!items.length) {
            setPriceUpdateResult({ error: t('no_products_to_update') || 'No products with linked catalog entries and selected suppliers.' });
            return;
        }
        setUpdatingPrices(true);
        setPriceUpdateResult(null);
        try {
            const res = await fetch(
                `/v1/rfq-received/${rfq.id}/update-product-prices?store_id=${storeId}`,
                {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', Authorization: token },
                    body: JSON.stringify({ items }),
                }
            );
            const data = await res.json();
            if (!res.ok || data.error) {
                setPriceUpdateResult({ error: data.error || 'Update failed' });
            } else {
                setPriceUpdateResult({ updated: data.updated, skipped: data.skipped });
            }
        } catch (e) {
            setPriceUpdateResult({ error: e.message });
        } finally {
            setUpdatingPrices(false);
        }
    };

    return (
        <div>
            {/* Non-quotation replies summary */}
            {(rfq.supplier_replies || []).length > 0 && (() => {
                // Deduplicate: keep the latest reply per supplier (by phone, then email, then name)
                const seen = new Map();
                (rfq.supplier_replies || []).forEach((r, i) => {
                    const key = r.supplier_phone || r.supplier_email || r.supplier_name || `idx_${i}`;
                    const existing = seen.get(key);
                    if (!existing || new Date(r.received_at) > new Date(existing.received_at)) {
                        seen.set(key, { ...r, _origIdx: i });
                    }
                });
                const dedupedReplies = Array.from(seen.values());
                return (
                <div className="mb-3">
                    <h6 className="fw-semibold mb-2">
                        <i className="bi bi-chat-dots me-2 text-primary"></i>
                        {t('supplier_replies_label')} ({dedupedReplies.length})
                    </h6>
                    {dedupedReplies.map((r, i) => (
                        <div key={r.id || i} className="d-flex align-items-start gap-2 mb-2 p-2 rounded border" style={{ background: r.is_quotation ? '#f0fff4' : '#f8f9fa', fontSize: '13px' }}>
                            <div className="flex-grow-1">
                                <div className="d-flex align-items-center gap-2 mb-1">
                                    <strong>{r.supplier_name || r.supplier_phone || t('unknown_supplier')}</strong>
                                    {r.is_quotation
                                        ? <Badge bg="success" style={{ fontSize: '10px' }}>{t('quotation')}</Badge>
                                        : <Badge bg="secondary" style={{ fontSize: '10px' }}>{t('not_quotation')}</Badge>}
                                    <Badge bg={r.extraction_status === 'done' ? 'light' : r.extraction_status === 'failed' ? 'danger' : 'warning'}
                                        text={r.extraction_status === 'done' ? 'dark' : undefined}
                                        style={{ fontSize: '10px' }}>
                                        {r.extraction_status || 'pending'}
                                    </Badge>
                                    <small className="text-muted">{new Date(r.received_at).toLocaleString()}</small>
                                </div>
                                {r.raw_text && (
                                    <div style={{ color: '#444', whiteSpace: 'pre-wrap' }}>{r.raw_text}</div>
                                )}
                                {r.extraction_error && (
                                    <div className="text-danger" style={{ fontSize: '11px' }}>{r.extraction_error}</div>
                                )}
                            </div>
                            <button
                                className="btn btn-sm btn-outline-danger flex-shrink-0"
                                style={{ fontSize: '11px', padding: '2px 8px', alignSelf: 'flex-start' }}
                                disabled={deletingReplyId === r.id}
                                onClick={() => handleDeleteReply(r.id)}
                                title={t('Delete this quotation')}
                            >
                                {deletingReplyId === r.id
                                    ? <span className="spinner-border spinner-border-sm" />
                                    : <i className="bi bi-trash3"></i>}
                            </button>
                        </div>
                    ))}
                    {deleteReplyError && <div className="text-danger mt-1" style={{ fontSize: '12px' }}>{deleteReplyError}</div>}
                </div>
                );
            })()}

            {addOk && <Alert variant="success" className="py-1 px-2 mb-2" style={{ fontSize: '12px' }}>{t('reply_added_ok')}</Alert>}

            {/* Add Quotation manually */}
            <div className="mb-3">
                {!showAddReply ? (
                    <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => setShowAddReply(true)}>
                        <i className="bi bi-plus-circle me-1"></i>{t('add_quotation')}
                    </button>
                ) : (
                    <div className="border rounded p-3" style={{ background: '#f8f9fa' }}>
                        <h6 className="mb-3" style={{ fontSize: '13px' }}><i className="bi bi-receipt me-1 text-primary"></i>{t('add_quotation')}</h6>

                        {/* Supplier info row */}
                        <div className="row g-2 mb-2">
                            <div className="col-md-4">
                                <input className="form-control form-control-sm" placeholder={t('supplier_name')}
                                    value={replyForm.supplier_name} onChange={e => setReplyForm({ ...replyForm, supplier_name: e.target.value })} />
                            </div>
                            <div className="col-md-4">
                                <input className="form-control form-control-sm" placeholder={t('supplier_phone')}
                                    value={replyForm.supplier_phone} onChange={e => setReplyForm({ ...replyForm, supplier_phone: e.target.value })} />
                            </div>
                            <div className="col-md-4">
                                <input type="email" className="form-control form-control-sm" placeholder={t('supplier_email')}
                                    value={replyForm.supplier_email} onChange={e => setReplyForm({ ...replyForm, supplier_email: e.target.value })} />
                            </div>
                        </div>

                        {/* File upload */}
                        <div className="mb-2">
                            <label className="form-label mb-1" style={{ fontSize: '12px', fontWeight: 600 }}>
                                {t('upload_quotation_file')}
                            </label>
                            <div className="d-flex align-items-center gap-2">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.xlsx,.xls,.csv,.txt"
                                    className="form-control form-control-sm"
                                    style={{ maxWidth: '340px' }}
                                    onChange={e => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0]); }}
                                />
                                {uploadingFile && <Spinner animation="border" size="sm" />}
                                {uploadedFileName && !uploadingFile && (
                                    <span className="text-success" style={{ fontSize: '12px' }}>
                                        <i className="bi bi-check-circle me-1"></i>{uploadedFileName}
                                    </span>
                                )}
                            </div>
                            <small className="text-muted" style={{ fontSize: '11px' }}>
                                {t('upload_quotation_hint')}
                            </small>
                        </div>

                        {/* Quotation text — populated by file upload or typed manually */}
                        <textarea className="form-control form-control-sm mb-2" rows={5}
                            placeholder={t('paste_supplier_reply_text')}
                            value={replyForm.raw_text} onChange={e => setReplyForm({ ...replyForm, raw_text: e.target.value })} />

                        {addError && <div className="text-danger mb-2" style={{ fontSize: '12px' }}>{addError}</div>}
                        <div className="d-flex gap-2">
                            <button type="button" className="btn btn-primary btn-sm" onClick={handleAddReply}
                                disabled={addingReply || !replyForm.raw_text}>
                                {addingReply ? <Spinner animation="border" size="sm" className="me-1" /> : <i className="bi bi-cpu me-1"></i>}
                                {t('save_and_extract')}
                            </button>
                            <button type="button" className="btn btn-outline-secondary btn-sm"
                                onClick={() => { setShowAddReply(false); setUploadedFileName(''); setAddError(''); }}>
                                {t('cancel')}
                            </button>
                        </div>
                        <small className="text-muted d-block mt-1" style={{ fontSize: '11px' }}>
                            {t('llm_extract_hint')}
                        </small>
                    </div>
                )}
            </div>

            {/* Price comparison table */}
            {products.length > 0 && replies.length > 0 && (
                <div>
                    <h6 className="fw-semibold mb-2">
                        <i className="bi bi-table me-2 text-primary"></i>
                        {t('price_comparison_title')}
                    </h6>
                    <div className="table-responsive mb-3">
                        <table className="table table-sm table-bordered align-middle" style={{ fontSize: '12px', minWidth: '600px' }}>
                            <thead className="table-light">
                                <tr>
                                    <th style={{ width: 32 }}>#</th>
                                    <th>{t('col_part_no')}</th>
                                    <th>{t('col_product')}</th>
                                    <th style={{ width: 60 }}>{t('col_qty')}</th>
                                    {suppliers.map(s => (
                                        <th key={s.id} className="text-center" style={{ minWidth: 90, background: '#e8f4fd' }}>
                                            {s.name
                                                ? <span title={s.phone}>{s.name}</span>
                                                : <span style={{ fontSize: '11px', color: '#555' }}><i className="bi bi-whatsapp me-1" style={{ color: '#25d366' }}></i>{s.phone || t('Supplier')}</span>}
                                        </th>
                                    ))}
                                    <th style={{ width: 100 }}>{t('col_selected_supplier')}</th>
                                    <th style={{ width: 80 }}>{t('col_margin_pct')}</th>
                                    <th style={{ width: 90 }}>{t('col_retail_price')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.map((prod, i) => {
                                    const selectedSid = selectedSupplier[i];
                                    const retail = retailPrice(i);
                                    const hasAnyPrice = !!priceMap[i];
                                    return (
                                        <tr key={i} style={{ background: hasAnyPrice ? '#fff' : '#fafafa' }}>
                                            <td className="text-center text-muted">{i + 1}</td>
                                            <td style={{ color: '#666' }}>{prod.part_no || '—'}</td>
                                            <td><strong>{prod.name}</strong></td>
                                            <td className="text-center">{prod.quantity || '—'} {prod.unit}</td>
                                            {suppliers.map(s => {
                                                const p = priceMap[i]?.[s.id];
                                                const isSelected = selectedSid === s.id;
                                                const isLowest = p && suppliers.every(ss => {
                                                    const op = priceMap[i]?.[ss.id];
                                                    return !op || op.unit_price >= p.unit_price;
                                                });
                                                return (
                                                    <td key={s.id} className="text-end" style={{
                                                        background: isSelected ? '#d1e7dd' : isLowest ? '#fff9c4' : undefined,
                                                        fontWeight: isSelected ? 600 : 400,
                                                        cursor: p ? 'pointer' : 'default',
                                                    }}
                                                        title={p ? (isLowest ? '✓ Lowest price' : '') + (p.notes ? '\n' + p.notes : '') : ''}
                                                        onClick={() => { if (p) { const sid = s.id; setSelectedSupplier(prev => ({ ...prev, [i]: sid })); } }}>
                                                        {p ? (
                                                            <span>
                                                                {fmt(p.unit_price)}
                                                                <span className={`ms-1 badge ${p.vat_included ? 'bg-warning text-dark' : 'bg-light text-muted border'}`} style={{ fontSize: '9px', fontWeight: 400 }} title={p.vat_included ? t('Price includes VAT') : t('Price excludes VAT')}>
                                                                    {p.vat_included ? t('incl.VAT') : t('excl.VAT')}
                                                                </span>
                                                            </span>
                                                        ) : <span className="text-muted">—</span>}
                                                        {isLowest && p && <span className="ms-1 text-success" style={{ fontSize: '10px' }}>▼</span>}
                                                    </td>
                                                );
                                            })}
                                            <td>
                                                <select className="form-select form-select-sm" style={{ fontSize: '11px' }}
                                                    value={selectedSid || ''}
                                                    onChange={e => setSelectedSupplier(prev => ({ ...prev, [i]: e.target.value || null }))}>
                                                    <option value="">{t('none')}</option>
                                                    {suppliers.filter(s => priceMap[i]?.[s.id]).map(s => (
                                                        <option key={s.id} value={s.id}>{s.name || s.phone || t('Supplier')}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td>
                                                <div className="input-group input-group-sm">
                                                    <input type="number" className="form-control" style={{ fontSize: '11px' }}
                                                        placeholder="0" min={0} max={1000}
                                                        value={margins[i]}
                                                        onChange={e => setMargins(m => ({ ...m, [i]: e.target.value }))} />
                                                    <span className="input-group-text" style={{ fontSize: '11px' }}>%</span>
                                                </div>
                                            </td>
                                            <td className="text-end" style={{ fontWeight: 600, color: retail ? '#0a6640' : '#999' }}>
                                                {retail ? fmt(retail) : <span className="text-muted">—</span>}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="d-flex align-items-center gap-2 flex-wrap">
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleUpdateProductPrices}
                            disabled={updatingPrices}
                            title={t('update_product_prices_hint') || 'Update purchase & retail prices for linked catalog products'}
                        >
                            {updatingPrices
                                ? <><Spinner animation="border" size="sm" className="me-1" />{t('updating') || 'Updating…'}</>
                                : <><i className="bi bi-arrow-repeat me-1"></i>{t('update_product_prices') || 'Update Product Prices'}</>}
                        </button>
                        <button
                            type="button"
                            className="btn btn-success"
                            onClick={() => onCreateQuotation(buildQuotationItems(), rfq)}
                        >
                            <i className="bi bi-file-earmark-plus me-2"></i>
                            {t('create_quotation')}
                        </button>
                        <small className="text-muted">{t('create_quotation_hint')}</small>
                    </div>
                    {priceUpdateResult && (
                        <div className={`mt-2 alert py-1 px-2 ${priceUpdateResult.error ? 'alert-danger' : 'alert-success'}`} style={{ fontSize: '12px' }}>
                            {priceUpdateResult.error
                                ? priceUpdateResult.error
                                : <>{t('prices_updated_ok') || 'Product prices updated:'} <strong>{priceUpdateResult.updated}</strong> {t('updated') || 'updated'}{priceUpdateResult.skipped > 0 && `, ${priceUpdateResult.skipped} ${t('skipped') || 'skipped (no catalog link)'}`}</>}
                        </div>
                    )}
                </div>
            )}

            {products.length === 0 && (
                <p className="text-muted small">{t('no_products_extracted')}</p>
            )}
            {products.length > 0 && replies.length === 0 && (
                <p className="text-muted small">{t('no_quotation_replies_yet')}</p>
            )}
        </div>
    );
}

// ── Forward / Detail Modal ────────────────────────────────────────────────────

export function ForwardDetail({ rfq, show, onHide, storeId, onCreateQuotation, onOpenQuotation, liveProgress, onSendToSuppliers, onReload, zIndex }) {
    const { t } = useTranslation('common');
    const history = useHistory();
    const [activeTab, setActiveTab] = useState('info');
    const [expandedMsg, setExpandedMsg] = useState(null);
    const [pdfUrl, setPdfUrl] = useState(null);
    const [pdfLoading, setPdfLoading] = useState(false);
    const [showPdfModal, setShowPdfModal] = useState(false);
    const [emailDetail, setEmailDetail]     = useState(null);
    const [emailDetailShow, setEmailDetailShow] = useState(false);
    const [supplierSearch, setSupplierSearch] = useState('');
    const [editingSupplier, setEditingSupplier] = useState(null);
    const [resolvedSuppliers, setResolvedSuppliers] = useState({});
    const [chatModal, setChatModal] = useState({ type: null, value: '' });
    const [supplierConvUnread, setSupplierConvUnread] = useState(0);
    const [customerConvUnread, setCustomerConvUnread] = useState(0);
    const [customerEmailConvUnread, setCustomerEmailConvUnread] = useState(0);
    const rfqPreviewRef = useRef(null);
    const rfqEditRef = useRef(null);
    const customerEditRef = useRef(null);

    // Fetch full supplier records when Suppliers tab is active so we can show
    // market & category values even for older forwarded_to entries that lack them.
    const fetchResolvedSuppliers = useCallback(async () => {
        if (!storeId || !rfq?.forwarded_to?.length) return;
        const token = localStorage.getItem('access_token');
        try {
            const res = await fetch(`/v1/rfq-suppliers?store_id=${storeId}&limit=500`, {
                headers: { Authorization: token },
            });
            const data = await res.json();
            const map = {};
            const addPhone = (phone, supplier) => {
                if (!phone) return;
                map[phone] = supplier;
                // Store both +prefix and no-prefix variants for flexible lookup
                if (phone.startsWith('+')) map[phone.slice(1)] = supplier;
                else map['+' + phone] = supplier;
            };
            (data.result || []).forEach(s => {
                addPhone(s.phone, s);
                addPhone(s.phone2, s);
            });
            setResolvedSuppliers(map);
        } catch (_) {}
    }, [storeId, rfq?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    // Trigger supplier resolution when the suppliers tab becomes active
    useEffect(() => {
        if (activeTab === 'suppliers') fetchResolvedSuppliers();
    }, [activeTab, fetchResolvedSuppliers]);

    if (!rfq) return null;

    const handleSendToSuppliers = () => {
        if (onSendToSuppliers) {
            onSendToSuppliers(rfq);
            return;
        }
        try { sessionStorage.setItem('_rfq_auto_send', rfq.id || rfq._id); } catch (_) {}
        history.push('/dashboard/rfq-received?t=' + Date.now());
        onHide();
    };

    const openLinkedEmail = async () => {
        if (!rfq.procurement_message_id) return;
        const token = localStorage.getItem('access_token');
        try {
            const res = await fetch(`/v1/procurement-messages/${rfq.procurement_message_id}?store_id=${storeId}`, { headers: { Authorization: token } });
            const data = await res.json();
            if (data?.id) { setEmailDetail(data); setEmailDetailShow(true); }
        } catch (_) {}
    };

    const token = localStorage.getItem('access_token');
    const loadPdf = async () => {
        if (pdfUrl) { setShowPdfModal(true); return; }
        setPdfLoading(true);
        try {
            const res = await fetch(`/v1/rfq-received/${rfq.id}/download-pdf?store_id=${storeId}`, {
                headers: { Authorization: token },
            });
            if (!res.ok) return;
            const blob = await res.blob();
            setPdfUrl(URL.createObjectURL(blob));
            setShowPdfModal(true);
        } catch (_) {}
        finally { setPdfLoading(false); }
    };

    const hasReplies = (rfq.supplier_replies || []).length > 0;
    const hasQuotation = (rfq.supplier_replies || []).some(r => r.is_quotation);

    return (
        <>
        <Modal show={show} onHide={onHide} size="xl" centered className="rfq-detail-modal" {...(zIndex ? { style: { zIndex } } : {})}>
            <Modal.Header closeButton>
                <Modal.Title style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flex: 1 }}>
                    <i className="bi bi-whatsapp text-success me-1"></i>
                    {rfq.code && (
                        <span style={{
                            fontFamily: 'monospace',
                            fontSize: '13px',
                            fontWeight: 700,
                            color: '#0a7c42',
                            background: '#e6f4ed',
                            border: '1px solid #b2dfcb',
                            borderRadius: '4px',
                            padding: '1px 7px',
                            letterSpacing: '0.03em',
                        }}>{rfq.code}</span>
                    )}
                    <span>{t('rfq_detail_title')}</span>
                    <small className="text-muted fw-normal" style={{ fontSize: '13px' }}>
                        {t('rfq_from')} {rfq.from_phone}{rfq.from_name && ` (${rfq.from_name})`}
                    </small>
                    {rfq.procurement_message_id && (
                        <button
                            className="btn btn-sm btn-outline-primary"
                            style={{ fontSize: '12px', padding: '3px 10px', whiteSpace: 'nowrap' }}
                            onClick={openLinkedEmail}
                            title="Open linked email"
                        >
                            <i className="bi bi-envelope-fill me-1 text-primary"></i>
                            {rfq.from_phone && rfq.from_phone.includes('@')
                                ? rfq.from_phone
                                : rfq.procurement_message_code || t('Linked Email')}
                        </button>
                    )}
                    {(rfq.quotation_ids || []).length > 0 && (rfq.quotation_codes || []).map((code, ci) => {
                        const qid = (rfq.quotation_ids || [])[ci];
                        return (
                            <button key={ci}
                                className="btn btn-sm btn-outline-success"
                                style={{ fontSize: '12px', padding: '3px 10px', whiteSpace: 'nowrap' }}
                                title={`Open Quotation ${code}`}
                                onClick={() => onOpenQuotation && onOpenQuotation(qid)}
                            >
                                <i className="bi bi-receipt me-1"></i>{code}
                            </button>
                        );
                    })}
                    {rfq.status !== 'cancelled' && (
                        <button
                            className={`btn btn-sm btn-success${(rfq.procurement_message_id || (rfq.quotation_ids || []).length > 0) ? '' : ' ms-auto'}`}
                            style={{ fontSize: '12px', padding: '3px 10px', whiteSpace: 'nowrap' }}
                            onClick={handleSendToSuppliers}
                            title={`Send ${rfq.code || ''} to Suppliers`}
                        >
                            <i className="bi bi-send me-1"></i>Send to Suppliers
                        </button>
                    )}
                    <button
                        className="btn btn-sm btn-outline-warning"
                        style={{ fontSize: '12px', padding: '3px 10px', whiteSpace: 'nowrap' }}
                        onClick={() => rfqEditRef.current?.edit(rfq)}
                        title="Edit RFQ"
                    >
                        <i className="bi bi-pencil me-1"></i>{t('Edit RFQ')}
                    </button>
                    {rfq.customer_id && (
                        <button
                            className="btn btn-sm btn-outline-info"
                            style={{ fontSize: '12px', padding: '3px 10px', whiteSpace: 'nowrap' }}
                            onClick={() => customerEditRef.current?.open(rfq.customer_id)}
                            title="Edit Customer"
                        >
                            <i className="bi bi-person-gear me-1"></i>{t('Edit Customer')}
                        </button>
                    )}
                    <button
                        className="btn btn-sm btn-outline-secondary ms-auto"
                        style={{ fontSize: '12px', padding: '3px 10px', whiteSpace: 'nowrap' }}
                        onClick={() => rfqPreviewRef.current?.open(rfq)}
                        title="View RFQ Preview"
                    >
                        <i className="bi bi-eye me-1"></i>Preview
                    </button>
                </Modal.Title>
            </Modal.Header>
            <Modal.Body style={{ padding: 0 }}>
                {/* Tab nav */}
                <ul className="nav nav-tabs px-3 pt-2" style={{ borderBottom: '1px solid #dee2e6' }}>
                    <li className="nav-item">
                        <button className={`nav-link ${activeTab === 'info' ? 'active' : ''}`} onClick={() => setActiveTab('info')}>
                            <i className="bi bi-info-circle me-1"></i>{t('rfq_tab_info')}
                        </button>
                    </li>
                    <li className="nav-item">
                        <button className={`nav-link ${activeTab === 'suppliers' ? 'active' : ''}`} onClick={() => setActiveTab('suppliers')}>
                            <i className="bi bi-people me-1"></i>{t('rfq_tab_suppliers')}
                            {rfq.forwarded_to?.length > 0 && <Badge bg="secondary" className="ms-1" style={{ fontSize: '10px' }}>{rfq.forwarded_to.length}</Badge>}
                        </button>
                    </li>
                    <li className="nav-item">
                        <button className={`nav-link ${activeTab === 'prices' ? 'active' : ''}`} onClick={() => setActiveTab('prices')}>
                            <i className="bi bi-currency-dollar me-1"></i>{t('rfq_tab_prices')}
                            {hasQuotation && <Badge bg="success" className="ms-1" style={{ fontSize: '10px' }}>✓</Badge>}
                            {hasReplies && !hasQuotation && <Badge bg="warning" text="dark" className="ms-1" style={{ fontSize: '10px' }}>{(rfq.supplier_replies || []).length}</Badge>}
                        </button>
                    </li>
                    <li className="nav-item">
                        <button className={`nav-link ${activeTab === 'timeline' ? 'active' : ''}`} onClick={() => setActiveTab('timeline')}>
                            <i className="bi bi-clock-history me-1"></i>Timeline
                            {rfq.activity_logs?.length > 0 && <Badge bg="light" text="dark" className="ms-1" style={{ fontSize: '10px', border: '1px solid #dee2e6' }}>{rfq.activity_logs.length}</Badge>}
                            {liveProgress && <Badge bg="primary" className="ms-1" style={{ fontSize: '10px', animation: 'rfq-pulse 1.4s ease-in-out infinite' }}>●</Badge>}
                        </button>
                    </li>
                    <li className="nav-item">
                        <button className={`nav-link ${activeTab === 'supplier_conv' ? 'active' : ''}`} onClick={() => setActiveTab('supplier_conv')}>
                            <i className="bi bi-whatsapp me-1"></i>Supplier Conversations
                            {supplierConvUnread > 0 && <span className="badge bg-danger ms-1 rounded-pill" style={{ fontSize: 9 }}>{supplierConvUnread}</span>}
                        </button>
                    </li>
                    <li className="nav-item">
                        <button className={`nav-link ${activeTab === 'customer_conv' ? 'active' : ''}`} onClick={() => setActiveTab('customer_conv')}>
                            <i className="bi bi-person-lines-fill me-1"></i>Customer Conversations
                            {customerConvUnread > 0 && <span className="badge bg-danger ms-1 rounded-pill" style={{ fontSize: 9 }}>{customerConvUnread}</span>}
                        </button>
                    </li>
                    <li className="nav-item">
                        <button className={`nav-link ${activeTab === 'customer_email_conv' ? 'active' : ''}`} onClick={() => setActiveTab('customer_email_conv')}>
                            <i className="bi bi-envelope-fill me-1"></i>Customer Email
                            {customerEmailConvUnread > 0 && <span className="badge bg-danger ms-1 rounded-pill" style={{ fontSize: 9 }}>{customerEmailConvUnread}</span>}
                        </button>
                    </li>
                </ul>

                <div className="p-3">
                    {/* Info tab */}
                    {activeTab === 'info' && (
                        <div>
                            <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
                                <StatusBadge status={rfq.status} />
                                <small className="text-muted">{new Date(rfq.received_at).toLocaleString()}</small>
                                {rfq.processed_at && <small className="text-muted">{t('processed_at')} {new Date(rfq.processed_at).toLocaleString()}</small>}
                                {rfq.procurement_message_code && (
                                    <span
                                        role="button"
                                        tabIndex={0}
                                        onClick={openLinkedEmail}
                                        onKeyDown={e => e.key === 'Enter' && openLinkedEmail()}
                                        style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 700, color: '#1a73e8', background: '#e8f0fe', border: '1px solid #c8d8f5', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                                        title="Open linked email"
                                    >
                                        <i className="bi bi-envelope" style={{ fontSize: '12px' }}></i>
                                        {rfq.procurement_message_code}
                                    </span>
                                )}
                            </div>
                            {rfq.customer_name && (
                                <div className="mb-2">
                                    <strong>{t('customer')}</strong>: {rfq.customer_name}
                                    {rfq.customer_phone && (
                                        <>
                                            <span className="text-muted ms-2"><i className="bi bi-telephone ms-1"></i> {rfq.customer_phone}</span>
                                            <button type="button" title="Open WhatsApp Conversation" onClick={() => setChatModal({ type: 'whatsapp', value: rfq.customer_phone.replace(/^\+/, '') })} style={{ border: 'none', background: 'none', padding: '0 3px', cursor: 'pointer', fontSize: 13, verticalAlign: 'middle' }}>
                                                <i className="bi bi-whatsapp text-success"></i>
                                            </button>
                                        </>
                                    )}
                                    {rfq.customer_email && (
                                        <>
                                            <span className="text-muted ms-2"><i className="bi bi-envelope ms-1"></i> {rfq.customer_email}</span>
                                            <button type="button" title="Open Email Conversation" onClick={() => setChatModal({ type: 'email', value: rfq.customer_email })} style={{ border: 'none', background: 'none', padding: '0 3px', cursor: 'pointer', fontSize: 13, verticalAlign: 'middle' }}>
                                                <i className="bi bi-envelope-fill text-primary"></i>
                                            </button>
                                        </>
                                    )}
                                    {rfq.customer_company && <span className="text-muted ms-2">• {rfq.customer_company}</span>}
                                    {rfq.customer_rfq_id && <span className="ms-2"><i className="bi bi-hash text-muted"></i> <strong>Customer RFQ:</strong> <span className="badge bg-light text-dark border">{rfq.customer_rfq_id}</span></span>}
                                </div>
                            )}
                            {rfq.categories?.length > 0 && (
                                <div className="mb-2">
                                    <strong>{t('categories_identified')}</strong>{' '}
                                    {rfq.categories.map(c => <Badge key={c} bg="info" text="dark" className="me-1">{c}</Badge>)}
                                </div>
                            )}
                            {rfq.products?.length > 0 && (
                                <div className="mb-2">
                                    <strong>{t('products_extracted')}</strong>
                                    <ul className="mb-0 mt-1" style={{ fontSize: '13px' }}>
                                        {rfq.products.map((p, i) => (
                                            <li key={i}>{p.name}{p.part_no && ` (${p.part_no})`}{p.quantity ? ` × ${p.quantity} ${p.unit || ''}` : ''}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {rfq.text_content && (
                                <div className="mb-2">
                                    <strong>{t('message_content')}</strong>
                                    <div className="bg-light rounded p-2 mt-1" style={{ whiteSpace: 'pre-wrap', fontSize: '13px' }}>{rfq.text_content}</div>
                                </div>
                            )}
                            {rfq.media_urls?.length > 0 && (
                                <div className="mb-2">
                                    <strong>{t('images')}</strong>
                                    <div className="d-flex flex-wrap gap-2 mt-1">
                                        {rfq.media_urls.map((url, i) => (
                                            <a key={i} href={url} target="_blank" rel="noreferrer">
                                                <img src={url} alt="RFQ" style={{ height: 80, borderRadius: 4, border: '1px solid #dee2e6' }} />
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {rfq.documents?.length > 0 && (
                                <div className="mb-2">
                                    <strong>{t('attachments')}</strong>
                                    <div className="d-flex flex-wrap gap-2 mt-1">
                                        {rfq.documents.map((doc, i) => {
                                            const isPdf = doc.mime_type?.includes('pdf');
                                            const isExcel = doc.mime_type?.includes('spreadsheet') || doc.mime_type?.includes('excel') || doc.file_name?.match(/\.xlsx?$/i);
                                            const icon = isPdf ? 'bi-file-earmark-pdf text-danger' : isExcel ? 'bi-file-earmark-excel text-success' : 'bi-file-earmark text-secondary';
                                            return (
                                                <a key={i} href={doc.url} target="_blank" rel="noreferrer"
                                                    className="d-flex align-items-center gap-1 border rounded px-2 py-1 text-decoration-none small">
                                                    <i className={`bi ${icon}`} style={{ fontSize: '18px' }}></i>
                                                    <span>{doc.file_name || `Document ${i + 1}`}</span>
                                                </a>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                            {rfq.error_msg && (
                                <div className="alert alert-danger py-2 small">{rfq.error_msg}</div>
                            )}
                        </div>
                    )}

                    {/* Suppliers tab */}
                    {activeTab === 'suppliers' && (
                        <>
                            {rfq.forwarded_to?.length > 0 ? (
                                <>
                                    {/* Search bar */}
                                    <div className="mb-2">
                                        <input
                                            className="form-control form-control-sm"
                                            placeholder={t('search_suppliers_placeholder') || 'Search suppliers…'}
                                            value={supplierSearch}
                                            onChange={e => setSupplierSearch(e.target.value)}
                                            style={{ maxWidth: 320 }}
                                        />
                                    </div>
                                    <div className="table-responsive">
                                        <table className="table table-sm table-bordered align-middle">
                                            <thead className="table-light">
                                                <tr>
                                                    <th>{t('col_supplier')}</th>
                                                    <th>{t('col_whatsapp')}</th>
                                                    <th>{t('sent_from')}</th>
                                                    <th>{t('purchase_market_col')}</th>
                                                    <th>{t('col_category')}</th>
                                                    <th>{t('col_status')}</th>
                                                    <th>{t('col_sent_at')}</th>
                                                    <th style={{ width: 100 }}>{t('col_actions') || 'Actions'}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {rfq.forwarded_to
                                                    .filter(r => {
                                                        if (!supplierSearch.trim()) return true;
                                                        const q = supplierSearch.toLowerCase();
                                                        return (r.supplier_name || '').toLowerCase().includes(q)
                                                            || (r.phone || '').includes(q);
                                                    })
                                                    .map((r, i) => {
                                                        const resolved = resolvedSuppliers[r.phone] || {};
                                                        const market   = r.purchase_market || resolved.purchase_market;
                                                        const category = r.category || (resolved.categories || []).join(', ');
                                                        return (
                                                        <React.Fragment key={i}>
                                                            <tr>
                                                                <td>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                                                                        <span>{r.supplier_name || '—'}</span>
                                                                        {r.phone && (
                                                                            <button type="button" title="Open WhatsApp Conversation" onClick={() => setChatModal({ type: 'whatsapp', value: r.phone.replace(/^\+/, '') })} style={{ border: 'none', background: 'none', padding: '0 2px', cursor: 'pointer', fontSize: 12 }}>
                                                                                <i className="bi bi-whatsapp text-success"></i>
                                                                            </button>
                                                                        )}
                                                                        {(resolved.email) && (
                                                                            <button type="button" title="Open Email Conversation" onClick={() => setChatModal({ type: 'email', value: resolved.email })} style={{ border: 'none', background: 'none', padding: '0 2px', cursor: 'pointer', fontSize: 12 }}>
                                                                                <i className="bi bi-envelope-fill text-primary"></i>
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                    {r.google_maps_url && (
                                                                        <div style={{ fontSize: '11px', marginTop: '2px' }}>
                                                                            <a href={r.google_maps_url} target="_blank" rel="noreferrer" className="text-primary me-1">
                                                                                <i className="bi bi-geo-alt-fill me-1"></i>Maps
                                                                            </a>
                                                                            <button type="button" className="btn btn-link btn-sm p-0" style={{ fontSize: '11px', verticalAlign: 'baseline' }}
                                                                                title="Copy Maps link" onClick={() => navigator.clipboard.writeText(r.google_maps_url)}>
                                                                                <i className="bi bi-clipboard"></i>
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </td>
                                                                <td>
                                                                    <a href={`https://wa.me/${r.phone}`} target="_blank" rel="noreferrer">
                                                                        <i className="bi bi-whatsapp text-success me-1"></i>{r.phone}
                                                                    </a>
                                                                </td>
                                                                <td>
                                                                    {r.sent_from_phone
                                                                        ? <a href={`https://wa.me/${r.sent_from_phone}`} target="_blank" rel="noreferrer">
                                                                            <i className="bi bi-whatsapp text-primary me-1"></i>{r.sent_from_phone}
                                                                          </a>
                                                                        : '—'}
                                                                </td>
                                                                <td>
                                                                    {market
                                                                        ? <span className="badge bg-light text-dark border" style={{ fontSize: '11px' }}><i className="bi bi-geo-alt me-1 text-secondary"></i>{market}</span>
                                                                        : <span className="text-muted">—</span>}
                                                                </td>
                                                                <td>
                                                                    {category
                                                                        ? <span className="badge bg-info text-dark" style={{ fontSize: '11px' }}>{category}</span>
                                                                        : <span className="text-muted">—</span>}
                                                                </td>
                                                                <td><StatusBadge status={r.status} /></td>
                                                                <td style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>{r.sent_at ? new Date(r.sent_at).toLocaleString() : '—'}</td>
                                                                <td className="text-center">
                                                                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                                                        <button
                                                                            type="button"
                                                                            className={`btn btn-sm ${expandedMsg === i ? 'btn-primary' : 'btn-outline-secondary'}`}
                                                                            title={t('col_message')}
                                                                            onClick={() => setExpandedMsg(expandedMsg === i ? null : i)}
                                                                        >
                                                                            <i className="bi bi-chat-text"></i>
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            className="btn btn-sm btn-outline-warning"
                                                                            title={t('edit_supplier') || 'Edit Supplier'}
                                                                            onClick={() => setEditingSupplier(resolved.id ? resolved : { id: r.supplier_id, name: r.supplier_name, phone: r.phone, purchase_market: r.purchase_market || '', category: r.category || '' })}
                                                                        >
                                                                            <i className="bi bi-pencil"></i>
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                            {expandedMsg === i && (
                                                                <tr>
                                                                    <td colSpan={8} className="bg-light p-0">
                                                                        <div className="p-3">
                                                                            <div className="d-flex align-items-center justify-content-between mb-2">
                                                                                <strong style={{ fontSize: '13px' }}>{t('sent_message_label')}</strong>
                                                                                <button type="button" className="btn btn-outline-secondary btn-sm"
                                                                                    onClick={() => navigator.clipboard.writeText(r.sent_message || '')}>
                                                                                    <i className="bi bi-clipboard me-1"></i>{t('copy_message')}
                                                                                </button>
                                                                            </div>
                                                                            {r.sent_message
                                                                                ? <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px', background: '#fff', border: '1px solid #dee2e6', borderRadius: 4, padding: '10px', margin: 0 }}>{r.sent_message}</pre>
                                                                                : <span className="text-muted small">{t('no_message_recorded')}</span>}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            ) : (
                                <p className="text-muted small">{t('no_suppliers_forwarded')}</p>
                            )}
                            {editingSupplier && (
                                <SupplierForm
                                    supplier={editingSupplier}
                                    onSave={() => { setEditingSupplier(null); fetchResolvedSuppliers(); }}
                                    onClose={() => setEditingSupplier(null)}
                                />
                            )}
                        </>
                    )}

                    {/* Prices / Supplier Replies tab */}
                    {activeTab === 'prices' && (
                        <PriceComparisonTable
                            rfq={rfq}
                            storeId={storeId}
                            onCreateQuotation={onCreateQuotation}
                            onRfqReload={onReload}
                        />
                    )}

                    {activeTab === 'timeline' && (
                        <RFQTimeline logs={rfq.activity_logs || []} liveProgress={liveProgress} />
                    )}

                    {activeTab === 'supplier_conv' && (
                        <RFQWhatsAppConversationsPanel
                            storeId={storeId}
                            phones={(rfq.forwarded_to || []).map(s => s.phone).filter(Boolean)}
                            phoneLabels={Object.fromEntries((rfq.forwarded_to || []).filter(s => s.phone).map(s => [s.phone, s.supplier_name || s.name || s.phone]))}
                            chatZIndex={20000}
                            emptyMessage="No suppliers have been added to this RFQ yet."
                            onUnreadCount={setSupplierConvUnread}
                            onEditSupplier={() => setActiveTab('suppliers')}
                        />
                    )}

                    {activeTab === 'customer_conv' && (
                        <RFQWhatsAppConversationsPanel
                            storeId={storeId}
                            phones={rfq.customer_phone ? [rfq.customer_phone] : []}
                            phoneLabels={rfq.customer_phone ? { [rfq.customer_phone]: rfq.customer_name || rfq.customer_phone } : {}}
                            chatZIndex={20000}
                            emptyMessage="Customer phone number is not available. Add a phone number to the customer record."
                            onUnreadCount={setCustomerConvUnread}
                            showEmptyPhones
                        />
                    )}
                    {activeTab === 'customer_email_conv' && (
                        <RFQEmailConversationsPanel
                            storeId={storeId}
                            emails={rfq.customer_email ? [rfq.customer_email] : []}
                            emailLabels={rfq.customer_email ? { [rfq.customer_email]: rfq.customer_name || rfq.customer_email } : {}}
                            chatZIndex={20000}
                            emptyMessage="Customer email address is not available. Add an email to the customer record."
                            onUnreadCount={setCustomerEmailConvUnread}
                            showEmptyEmails
                        />
                    )}
                </div>
            </Modal.Body>
            <Modal.Footer>
                <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={loadPdf}
                    disabled={pdfLoading}
                    title="View / Download RFQ PDF"
                    style={{ marginRight: 'auto' }}
                >
                    {pdfLoading
                        ? <><span className="spinner-border spinner-border-sm me-1" />Loading…</>
                        : <><i className="bi bi-file-earmark-pdf me-1 text-danger"></i>View PDF</>}
                </Button>
                <Button variant="outline-secondary" size="sm" onClick={onHide}>{t('close')}</Button>
            </Modal.Footer>
        </Modal>

        {showPdfModal && pdfUrl && (
            <Modal show onHide={() => setShowPdfModal(false)} size="xl" centered>
                <Modal.Header closeButton>
                    <Modal.Title style={{ fontSize: 15 }}>
                        <i className="bi bi-file-earmark-pdf text-danger me-2"></i>
                        {rfq.code} — RFQ PDF
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ padding: 0, height: '80vh' }}>
                    <iframe src={pdfUrl} title="RFQ PDF" style={{ width: '100%', height: '100%', border: 'none' }} />
                </Modal.Body>
                <Modal.Footer>
                    <a href={pdfUrl} download={`${rfq.code || 'rfq'}.pdf`} className="btn btn-sm btn-primary me-2">
                        <i className="bi bi-download me-1"></i>Download
                    </a>
                    <Button variant="secondary" size="sm" onClick={() => setShowPdfModal(false)}>{t('close')}</Button>
                </Modal.Footer>
            </Modal>
        )}
        <EmailDetailModal
            msg={emailDetail}
            show={emailDetailShow && !!emailDetail}
            onClose={() => setEmailDetailShow(false)}
            storeId={storeId}
            token={localStorage.getItem('access_token')}
        />
        <RFQPreview ref={rfqPreviewRef} />
        <RFQCreate ref={rfqEditRef} showToastMessage={() => {}} onCreated={() => {}} />
        <CustomerCreate ref={customerEditRef} />
        <WhatsAppChatModal
            show={chatModal.type === 'whatsapp'}
            phone={chatModal.value}
            storeId={storeId}
            onHide={() => setChatModal({ type: null, value: '' })}
        />
        <EmailChatModal
            show={chatModal.type === 'email'}
            email={chatModal.value}
            storeId={storeId}
            onHide={() => setChatModal({ type: null, value: '' })}
        />
        </>
    );
}

// ── RFQ Timeline ─────────────────────────────────────────────────────────────

const STEP_META = {
    input_received:          { icon: 'bi-inbox-fill',               bg: '#22c55e', label: 'Input Received' },
    rfq_created:             { icon: 'bi-file-earmark-check-fill',  bg: '#3b82f6', label: 'RFQ Created' },
    products_identified:     { icon: 'bi-box-seam-fill',            bg: '#0ea5e9', label: 'Products Identified' },
    customer_identified:     { icon: 'bi-person-fill-check',        bg: '#0ea5e9', label: 'Customer Identified' },
    ai_categorizing:         { icon: 'bi-cpu-fill',                 bg: '#94a3b8', label: 'AI Categorizing' },
    categories_identified:   { icon: 'bi-tags-fill',                bg: '#8b5cf6', label: 'Categories Identified' },
    categories_error:        { icon: 'bi-exclamation-circle-fill',  bg: '#ef4444', label: 'Category Error' },
    ai_skipped:              { icon: 'bi-info-circle-fill',         bg: '#94a3b8', label: 'AI Skipped' },
    suppliers_found:         { icon: 'bi-people-fill',              bg: '#22c55e', label: 'Ready to Send to Suppliers' },
    no_suppliers_found:      { icon: 'bi-exclamation-triangle-fill',bg: '#f59e0b', label: 'No Suppliers Found' },
    suppliers_below_minimum: { icon: 'bi-exclamation-triangle-fill',bg: '#f59e0b', label: 'Suppliers Below Minimum' },
    suppliers_matched:       { icon: 'bi-shop',                     bg: '#f59e0b', label: 'Suppliers Matched' },
    waiting_approval:        { icon: 'bi-hourglass-split',          bg: '#f59e0b', label: 'Waiting Approval' },
    rfq_sent_to_supplier:    { icon: 'bi-send-fill',                bg: '#22c55e', label: 'Sent to Supplier' },
    rfq_send_failed:         { icon: 'bi-exclamation-triangle-fill',bg: '#ef4444', label: 'Send Failed' },
    template_sent:           { icon: 'bi-whatsapp',                 bg: '#25d366', label: 'Sent via WhatsApp' },
    waiting_replies:         { icon: 'bi-hourglass',                bg: '#94a3b8', label: 'Waiting Replies' },
    supplier_replied:        { icon: 'bi-chat-left-dots-fill',      bg: '#3b82f6', label: 'Supplier Replied' },
    prices_extracted:        { icon: 'bi-cpu-fill',                 bg: '#8b5cf6', label: 'Prices Extracted' },
    prices_updated:          { icon: 'bi-currency-dollar',          bg: '#22c55e', label: 'Prices Updated' },
};

function fmtLogTime(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
        + ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function RFQTimeline({ logs, liveProgress }) {
    const [expandedIdx, setExpandedIdx] = React.useState(null);
    const isProcessing = liveProgress && liveProgress.stage !== 'done' && liveProgress.stage !== 'failed'
        && liveProgress.stage !== 'ignored' && liveProgress.stage !== 'suppliers_found'
        && liveProgress.stage !== 'ai_skipped';

    if ((!logs || logs.length === 0) && !liveProgress) {
        return (
            <div className="text-center text-muted py-5" style={{ fontSize: '13px' }}>
                <i className="bi bi-clock-history" style={{ fontSize: '28px', display: 'block', marginBottom: '8px', opacity: 0.4 }}></i>
                No activity logged yet for this RFQ.
            </div>
        );
    }

    return (
        <div style={{ padding: '4px 0', maxHeight: '520px', overflowY: 'auto' }}>
            {(logs || []).map((log, idx) => {
                const meta = STEP_META[log.step] || { icon: 'bi-dot', bg: '#94a3b8', label: log.step };
                // For template_sent (manual WhatsApp send), show red bullet when the send failed
                const bg = (log.step === 'template_sent' && log.details?.status === 'failed') ? '#ef4444' : meta.bg;
                const isLast = idx === logs.length - 1;
                const isExpanded = expandedIdx === idx;
                const hasDetails = log.details && Object.keys(log.details).length > 0;

                return (
                    <div key={log.id || idx} style={{ display: 'flex', gap: '12px', paddingBottom: isLast ? 0 : '2px' }}>
                        {/* Left column — icon + vertical line */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: '32px' }}>
                            <div style={{
                                width: '32px', height: '32px', borderRadius: '50%',
                                background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                            }}>
                                <i className={`bi ${meta.icon}`} style={{ color: '#fff', fontSize: '14px' }}></i>
                            </div>
                            {!isLast && (
                                <div style={{ width: '2px', flex: 1, background: '#e2e8f0', minHeight: '20px', margin: '2px 0' }} />
                            )}
                        </div>

                        {/* Right column — content */}
                        <div style={{ flex: 1, minWidth: 0, paddingBottom: isLast ? 0 : '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <span style={{ fontSize: '12px', fontWeight: 700, color: bg, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                        {meta.label}
                                    </span>
                                    <p style={{ margin: '1px 0 0', fontSize: '13px', color: '#1e293b', lineHeight: 1.45 }}>
                                        {log.message}
                                    </p>
                                </div>
                                <div style={{ flexShrink: 0, textAlign: 'right' }}>
                                    <span style={{ fontSize: '11px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                                        {log.at ? fmtLogTime(log.at) : ''}
                                    </span>
                                    {hasDetails && (
                                        <button
                                            type="button"
                                            onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                                            style={{ display: 'block', marginTop: '2px', marginLeft: 'auto', fontSize: '11px', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                            {isExpanded ? 'hide details ▲' : 'details ▼'}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Expanded details */}
                            {isExpanded && hasDetails && (() => {
                                const prods = log.step === 'products_identified' && Array.isArray(log.details.products)
                                    ? log.details.products : null;
                                const suppList = log.step === 'suppliers_found' && Array.isArray(log.details.suppliers)
                                    ? log.details.suppliers : null;
                                const llmModel = log.details.llm_model || log.details.model || null;
                                const skipKeys = new Set(['llm_model', 'model', 'suppliers']);
                                return (
                                    <div style={{ marginTop: '6px', background: '#f8fafc', borderRadius: '6px', padding: '8px 10px', fontSize: '12px' }}>
                                        {prods && prods.length > 0 && (
                                            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: llmModel ? '8px' : 0 }}>
                                                <thead>
                                                    <tr style={{ background: '#e2e8f0' }}>
                                                        <th style={{ padding: '3px 6px', textAlign: 'left', fontWeight: 600, color: '#475569', width: '30%' }}>Part No.</th>
                                                        <th style={{ padding: '3px 6px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Product Name</th>
                                                        <th style={{ padding: '3px 6px', textAlign: 'right', fontWeight: 600, color: '#475569', width: '60px' }}>Qty</th>
                                                        <th style={{ padding: '3px 6px', textAlign: 'left', fontWeight: 600, color: '#475569', width: '50px' }}>Unit</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {prods.map((p, pi) => (
                                                        <tr key={pi} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                            <td style={{ padding: '3px 6px', color: '#64748b' }}>{p.part_no || '—'}</td>
                                                            <td style={{ padding: '3px 6px', color: '#1e293b', fontWeight: 500 }}>{p.name || '—'}</td>
                                                            <td style={{ padding: '3px 6px', textAlign: 'right', color: '#1e293b' }}>{p.quantity != null ? p.quantity : 1}</td>
                                                            <td style={{ padding: '3px 6px', color: '#64748b' }}>{p.unit || '—'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                        {!prods && Object.entries(log.details).filter(([k]) => !skipKeys.has(k)).map(([k, v]) => (
                                            <div key={k} style={{ display: 'flex', gap: '8px', marginBottom: '2px' }}>
                                                <span style={{ color: '#64748b', minWidth: '120px', flexShrink: 0 }}>{k.replace(/_/g, ' ')}</span>
                                                <span style={{ color: '#1e293b', wordBreak: 'break-word' }}>
                                                    {Array.isArray(v) ? v.join(', ') : String(v)}
                                                </span>
                                            </div>
                                        ))}
                                        {suppList && suppList.length > 0 && (
                                            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '8px' }}>
                                                <thead>
                                                    <tr style={{ background: '#e2e8f0' }}>
                                                        <th style={{ padding: '3px 6px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Supplier</th>
                                                        <th style={{ padding: '3px 6px', textAlign: 'left', fontWeight: 600, color: '#475569', width: '140px' }}>Phone</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {suppList.map((s, si) => (
                                                        <tr key={si} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                            <td style={{ padding: '3px 6px', color: '#1e293b', fontWeight: 500 }}>{s.name || '—'}</td>
                                                            <td style={{ padding: '3px 6px', color: '#64748b', fontFamily: 'monospace' }}>{s.phone || '—'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                        {llmModel && (
                                            <div style={{ marginTop: prods ? '4px' : 0, display: 'flex', alignItems: 'center', gap: '6px', color: '#6b7280', fontSize: '11px' }}>
                                                <i className="bi bi-robot" style={{ color: '#7c3aed' }}></i>
                                                <span>Extracted using: <strong style={{ color: '#4c1d95' }}>{llmModel}</strong></span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                );
            })}

            {/* Live processing row — pulsing spinner at the bottom while background job runs */}
            {liveProgress && (
                <div style={{ display: 'flex', gap: '12px', paddingBottom: 0, marginTop: (logs && logs.length > 0) ? '0' : '0' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: '32px' }}>
                        {(logs && logs.length > 0) && (
                            <div style={{ width: '2px', height: '20px', background: '#e2e8f0', margin: '0 0 2px 0' }} />
                        )}
                        <div style={{
                            width: '32px', height: '32px', borderRadius: '50%',
                            background: isProcessing ? '#0d6efd' : (liveProgress.stage === 'failed' ? '#ef4444' : '#22c55e'),
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                            animation: isProcessing ? 'rfq-pulse 1.4s ease-in-out infinite' : 'none',
                        }}>
                            <i className={`bi ${isProcessing ? 'bi-arrow-repeat' : (liveProgress.stage === 'failed' ? 'bi-x-lg' : 'bi-check-lg')}`}
                               style={{ color: '#fff', fontSize: '14px', animation: isProcessing ? 'rfq-spin 1.2s linear infinite' : 'none' }}></i>
                        </div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0, paddingBottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: isProcessing ? '#0d6efd' : '#22c55e', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            {isProcessing ? 'Processing…' : (STAGE_LABELS[liveProgress.stage] || liveProgress.stage)}
                        </span>
                        <p style={{ margin: '1px 0 0', fontSize: '13px', color: '#1e293b', lineHeight: 1.45 }}>{liveProgress.message}</p>
                        {isProcessing && liveProgress.percent > 0 && (
                            <div style={{ height: 4, background: '#e9ecef', borderRadius: 2, overflow: 'hidden', marginTop: 5, maxWidth: 220 }}>
                                <div style={{ height: '100%', width: `${liveProgress.percent}%`, background: '#0d6efd', borderRadius: 2, transition: 'width 0.5s ease' }} />
                            </div>
                        )}
                    </div>
                </div>
            )}
            <style>{`
                @keyframes rfq-pulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
                @keyframes rfq-spin  { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
            `}</style>
        </div>
    );
}

// ── Live Progress Panel ───────────────────────────────────────────────────────

const STAGE_LABELS = {
    classifying:           "🤖 AI is analysing the RFQ...",
    categories_identified: "🏷️ Categories identified — searching suppliers...",
    finding_suppliers:     "🔍 Searching for matching suppliers...",
    suppliers_found:       "✅ Ready to send to suppliers!",
    ai_skipped:            "ℹ️ AI categorization skipped",
    whatsapp_check:        "📱 Validating WhatsApp numbers...",
    forwarding:            "📤 Forwarding RFQ to suppliers...",
    waiting:               "⏳ Waiting before next message...",
    done:                  "✅ All done!",
    failed:                "❌ Processing failed",
    ignored:               "ℹ️ Message not an RFQ — ignored",
};

// ── RFQSendModal ─────────────────────────────────────────────────────────────

export function RFQSendModal({ rfq, storeId, show, onHide, onSent, onViewDetails, initialTab, initialPhone }) {
    const token = localStorage.getItem('access_token');
    const rfqPreviewRef = useRef(null);
    useEffect(() => {
        if (!show) return;
        const apply = () => {
            const el = document.querySelector('.modal.rfq-send-modal-wrap');
            if (el) el.style.setProperty('z-index', '1600', 'important');
        };
        apply();
        const t = setTimeout(apply, 80);
        return () => clearTimeout(t);
    }, [show]);

    const [chatModal, setChatModal] = useState({ type: null, value: '' });
    const [preview, setPreview]                   = useState(null);
    const [loadingPreview, setLoadingPreview]       = useState(false);
    const [storeData, setStoreData]               = useState(null);
    const [phase, setPhase]                       = useState('preview'); // preview | sending | done
    const [sendModalTab, setSendModalTab]          = useState(initialTab || 'send'); // send | supplier_conv | customer_conv
    const [sendSupplierConvUnread, setSendSupplierConvUnread] = useState(0);
    const [sendCustomerConvUnread, setSendCustomerConvUnread] = useState(0);
    const [sendCustomerEmailConvUnread, setSendCustomerEmailConvUnread] = useState(0);

    // Sync tab when initialTab changes (e.g. opened from header notification)
    useEffect(() => { if (show && initialTab) setSendModalTab(initialTab); }, [show, initialTab]); // eslint-disable-line react-hooks/exhaustive-deps
    const [supplierStatuses, setSupplierStatuses] = useState({});
    const [sentPhones, setSentPhones]             = useState(new Set()); // phones already successfully sent
    const [error, setError]                       = useState('');
    const [emailDetail, setEmailDetail]           = useState(null);
    const [emailDetailShow, setEmailDetailShow]   = useState(false);
    const toTitleCase = s => s.trim().replace(/\w\S*/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase());

    const openLinkedEmail = async () => {
        if (!rfq?.procurement_message_id) return;
        try {
            const res = await fetch(`/v1/procurement-messages/${rfq.procurement_message_id}?store_id=${storeId}`, { headers: { Authorization: token } });
            const data = await res.json();
            if (data?.id) { setEmailDetail(data); setEmailDetailShow(true); }
        } catch (_) {}
    };

    // Supplier selection + manual additions
    const [selectedPhones, setSelectedPhones]     = useState(new Set());
    const [extraSuppliers, setExtraSuppliers]     = useState([]); // [{name, phone}]
    // Autocomplete for adding suppliers
    const [addQuery, setAddQuery]                 = useState('');
    const [addSuggestions, setAddSuggestions]     = useState([]);
    const [showAddSugg, setShowAddSugg]           = useState(false);
    const addTimerRef                             = useRef(null);
    // Test message
    const [testPhone, setTestPhone]               = useState('');
    const [testSending, setTestSending]           = useState(false);
    const [testResult, setTestResult]             = useState(null); // null | 'ok' | 'err: ...'
    const esRef                                   = useRef(null);
    const customerEditRef                         = useRef(null);
    // PDF view/download
    const [pdfUrl, setPdfUrl]                     = useState(null);
    const [pdfLoading, setPdfLoading]             = useState(false);
    const [showPdfModal, setShowPdfModal]         = useState(false);
    // Supplier view modal
    const [viewingSupplier, setViewingSupplier]   = useState(null);
    // Google Maps supplier fetch
    const [mapsOpen, setMapsOpen]                 = useState(false);
    const [mapsMarkets, setMapsMarkets]           = useState(new Set());
    const [mapsMinCount, setMapsMinCount]         = useState('5');
    const [mapsMaxCount, setMapsMaxCount]         = useState('20');
    const [mapsFetching, setMapsFetching]         = useState(false);
    const [mapsResult, setMapsResult]             = useState(null); // null | { found: N, added: N } | { error: '...' }
    const [mapsCustomInput, setMapsCustomInput]   = useState('');
    const [removedFromList, setRemovedFromList]   = useState(new Set());

    // Fetch full store object (needed for RFQPreviewContent logo/header)
    useEffect(() => {
        if (!show || !storeId) return;
        fetch(`/v1/store/${storeId}`, { headers: { Authorization: token } })
            .then(r => r.json()).then(d => setStoreData(d.result || d)).catch(() => {});
    }, [show, storeId]); // eslint-disable-line react-hooks/exhaustive-deps

    const loadPdf = async () => {
        if (pdfUrl) { setShowPdfModal(true); return; }
        setPdfLoading(true);
        try {
            const res = await fetch(`/v1/rfq-received/${rfq.id}/download-pdf?store_id=${storeId}`, {
                headers: { Authorization: token },
            });
            if (!res.ok) return;
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            setPdfUrl(url);
            setShowPdfModal(true);
        } catch (e) { /* silent */ }
        finally { setPdfLoading(false); }
    };

    // Load preview on open — always, regardless of forwarded status
    useEffect(() => {
        if (!show || !rfq) return;
        setError(''); setPreview(null); setSupplierStatuses({});
        setAddQuery(''); setAddSuggestions([]); setShowAddSugg(false);
        setTestPhone(''); setTestResult(null);
        setPdfUrl(null); setShowPdfModal(false);
        setPhase('preview');
        // Do NOT reset sendModalTab here — useState(initialTab||'send') on mount
        // already initialises correctly, and overriding it here would fight the
        // tab set by the notification click handler.
        if (!initialTab) setSendModalTab('send');
        setMapsResult(null); setMapsOpen(false); setMapsCustomInput(''); setRemovedFromList(new Set());

        // Restore extra recipients from localStorage (persist across modal open/close)
        const _lsKey = `rfq_extra_${rfq.id}`;
        const storedExtras = (() => { try { return JSON.parse(localStorage.getItem(_lsKey) || '[]'); } catch { return []; } })();
        setExtraSuppliers(storedExtras);

        // Build the set of phones already successfully sent
        const alreadySent = new Set(
            (rfq?.forwarded_to || []).filter(r => r.status === 'sent').map(r => r.phone)
        );
        setSentPhones(alreadySent);

        setLoadingPreview(true);
        const controller = new AbortController();
        const applyData = (data) => {
            setError(data.error || data.config_warning || '');
            if (!data.error) {
                setPreview(data);
                const extraPhones = storedExtras.filter(s => !alreadySent.has(s.phone)).map(s => s.phone);
                setSelectedPhones(new Set([...extraPhones, ...(data.suppliers || []).filter(s => !alreadySent.has(s.phone)).map(s => s.phone)]));
            }
            setLoadingPreview(false);
        };
        const doFetch = (attempt) => {
            fetch(`/v1/rfq-received/${rfq.id}/send-preview?store_id=${storeId}`, { headers: { Authorization: token }, signal: controller.signal })
                .then(r => r.json())
                .then(applyData)
                .catch(e => {
                    if (e.name === 'AbortError') return;
                    if (attempt < 2) {
                        setTimeout(() => doFetch(attempt + 1), 2000);
                    } else {
                        setError('Failed to load preview. Please close and reopen the modal.');
                        setLoadingPreview(false);
                    }
                });
        };
        doFetch(1);
        return () => controller.abort();
    }, [show, rfq?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!show) { esRef.current?.close(); esRef.current = null; }
    }, [show]);

    // Persist extra recipients to localStorage so they survive modal close/reopen
    useEffect(() => {
        if (!rfq?.id || !show) return;
        try {
            if (extraSuppliers.length > 0) localStorage.setItem(`rfq_extra_${rfq.id}`, JSON.stringify(extraSuppliers));
            else localStorage.removeItem(`rfq_extra_${rfq.id}`);
        } catch (_) {}
    }, [extraSuppliers]); // eslint-disable-line react-hooks/exhaustive-deps

    // All rows shown in recipient list — always from preview.suppliers, augmented with extras
    // Also surface any forwarded_to entries not in the preview list (e.g. phones outside categories)
    const previewPhones = new Set((preview?.suppliers || []).map(s => s.phone));
    const forwardedExtras = (rfq?.forwarded_to || [])
        .filter(r => !previewPhones.has(r.phone))
        .map(r => ({ name: r.supplier_name, phone: r.phone, category: r.category, purchase_market: r.purchase_market }));
    const baseSuppliers = [
        ...(preview?.suppliers || []).map(s => ({ name: s.name, phone: s.phone, category: s.category, categories: s.categories, id: s.id, purchase_market: s.purchase_market })),
        ...forwardedExtras,
    ];
    const _customerPhone = (rfq?.customer_phone || '').replace(/\D/g, '');
    const _allSuppliers = [...baseSuppliers, ...extraSuppliers.map(s => ({ ...s }))];
    const _seenPhones = new Set();
    const supplierList = _allSuppliers.filter(s => {
        if (_seenPhones.has(s.phone)) return false;
        _seenPhones.add(s.phone);
        if (removedFromList.has(s.phone)) return false;
        if (_customerPhone && s.phone && s.phone.replace(/\D/g, '').endsWith(_customerPhone.slice(-9))) return false;
        return true;
    });

    const togglePhone = (phone) => {
        setSelectedPhones(prev => {
            const next = new Set(prev);
            next.has(phone) ? next.delete(phone) : next.add(phone);
            return next;
        });
    };

    const addSupplierDirect = (s) => {
        const phone = s.phone.trim().replace(/\s+/g, '');
        if (!phone) return;
        // Skip if already in the list
        if (supplierList.some(e => e.phone === phone)) {
            setAddQuery(''); setShowAddSugg(false); return;
        }
        const name = s.name || phone;
        setExtraSuppliers(prev => [...prev, { name, phone }]);
        setSelectedPhones(prev => new Set([...prev, phone]));
        setAddQuery(''); setAddSuggestions([]); setShowAddSugg(false);
        // Persist to rfq_suppliers DB — if it already exists the 409 is silently ignored
        if (!s.id) {
            fetch(`/v1/rfq-suppliers?store_id=${storeId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: token },
                body: JSON.stringify({ name, phone }),
            }).then(r => r.json()).then(data => {
                if (data.id) setExtraSuppliers(prev => prev.map(e => e.phone === phone ? { ...e, id: data.id } : e));
            }).catch(() => {});
        }
    };

    const searchAddSuppliers = (q) => {
        clearTimeout(addTimerRef.current);
        if (q.length < 2) { setAddSuggestions([]); setShowAddSugg(false); return; }
        addTimerRef.current = setTimeout(() => {
            fetch(`/v1/rfq-suppliers?store_id=${storeId}&search=${encodeURIComponent(q)}&limit=8`, { headers: { Authorization: token } })
                .then(r => r.json())
                .then(d => { setAddSuggestions(d.items || []); setShowAddSugg(true); })
                .catch(() => {});
        }, 250);
    };

    const fetchFromMaps = async () => {
        if (mapsMarkets.size === 0) return;
        setMapsFetching(true);
        setMapsResult(null);
        try {
            const res = await fetch(`/v1/rfq-suppliers/fetch-from-maps?store_id=${storeId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: token },
                body: JSON.stringify({ rfq_id: rfq.id, markets: [...mapsMarkets], min_count: Math.max(1, parseInt(mapsMinCount) || 5), max_count: Math.min(20, Math.max(1, parseInt(mapsMaxCount) || 20)) }),
            });
            const data = await res.json();
            if (data.error) { setMapsResult({ error: data.error }); return; }
            const newSups = (data.suppliers || []);
            const _custPhone = (rfq?.customer_phone || '').replace(/\D/g, '');
            // Add found suppliers to RECIPIENTS, deduplicating and excluding the customer's own phone
            const currentPhones = new Set(supplierList.map(s => s.phone));
            const toAdd = newSups.filter(s => {
                if (!s.phone || currentPhones.has(s.phone)) return false;
                if (_custPhone && s.phone.replace(/\D/g, '').endsWith(_custPhone.slice(-9))) return false;
                return true;
            });
            if (toAdd.length > 0) {
                setExtraSuppliers(prev => [...prev, ...toAdd.map(s => ({ id: s.id, name: s.name, phone: s.phone, purchase_market: s.purchase_market, categories: s.categories }))]);
                setSelectedPhones(prev => { const next = new Set(prev); toAdd.forEach(s => next.add(s.phone)); return next; });
            }
            setMapsResult({ found: data.found, added: toAdd.length, fromDb: data.from_db ?? 0, fromMaps: data.from_maps ?? 0 });
        } catch (e) {
            setMapsResult({ error: e.message });
        } finally {
            setMapsFetching(false);
        }
    };

    // Derive attachment type from template header — no user choice needed
    const templateWantsDoc = rfqTemplateWantsDocument(preview?.template_components);

    const handleSend = async () => {
        // Only send to selected phones that haven't been sent to yet
        const recipients = supplierList.filter(s => selectedPhones.has(s.phone) && !sentPhones.has(s.phone));
        if (!recipients.length) return;
        setPhase('sending');

        const initial = {};
        recipients.forEach(s => { initial[s.phone] = 'pending'; });
        setSupplierStatuses(initial);

        if (esRef.current) esRef.current.close();
        const es = new EventSource(`/v1/rfq-bot/events?store_id=${storeId}`);
        esRef.current = es;
        es.addEventListener('rfq_send_status', e => {
            try {
                const d = JSON.parse(e.data);
                if (d.rfq_id === rfq.id)
                    setSupplierStatuses(prev => ({ ...prev, [d.phone]: d.status === 'sent' ? 'sent' : 'failed_' + (d.error || '') }));
            } catch (_) {}
        });
        es.addEventListener('rfq_send_done', e => {
            try {
                const d = JSON.parse(e.data);
                if (d.rfq_id === rfq.id) { es.close(); esRef.current = null; setPhase('done'); onSent?.(); try { localStorage.removeItem(`rfq_extra_${rfq.id}`); } catch (_) {} }
            } catch (_) {}
        });

        try {
            const userName = localStorage.getItem('user_name') || '';
            const res = await fetch(`/v1/rfq-received/${rfq.id}/send?store_id=${storeId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: token },
                body: JSON.stringify({
                    prepared_by: userName,
                    authorized_by: '',
                    recipients: recipients.map(s => ({ name: s.name, phone: s.phone })),
                    generate_pdf: templateWantsDoc,
                }),
            });
            const data = await res.json();
            if (data.error) {
                setError(data.error); setPhase('preview'); es.close(); esRef.current = null;
            } else if (data.success) {
                // Apply per-supplier statuses from HTTP response (SSE may have been missed)
                const statuses = data.recipient_statuses || {};
                setSupplierStatuses(prev => ({ ...prev, ...statuses }));

                // Update sentPhones with newly sent ones
                const newlySent = new Set(Object.entries(statuses).filter(([, v]) => v === 'sent').map(([k]) => k));
                setSentPhones(prev => new Set([...prev, ...newlySent]));

                // Deselect the just-sent suppliers
                setSelectedPhones(prev => { const next = new Set(prev); newlySent.forEach(p => next.delete(p)); return next; });

                onSent?.(); es.close(); esRef.current = null;

                // If all suppliers in the list are now sent → done, else back to preview
                const allNowSent = supplierList.every(s => newlySent.has(s.phone) || sentPhones.has(s.phone));
                setPhase(allNowSent ? 'done' : 'preview');
            }
        } catch (e) {
            setError('Send failed: ' + e.message);
            setPhase('preview'); es.close(); esRef.current = null;
        }
    };

    // Build template components exactly like WABATemplateTesterWidget, with pre-filled RFQ values
    const buildRFQComponents = ({ mediaId = null, mediaType = 'image' } = {}) => {
        const comps = preview?.template_components || [];
        const vars = preview?.pre_filled_vars || {};
        const components = [];
        for (const comp of comps) {
            const type = (comp.type || '').toLowerCase();
            const fmt  = (comp.format || '').toUpperCase();
            if (type === 'header') {
                if ((fmt === 'IMAGE' || fmt === 'DOCUMENT') && mediaId) {
                    const mtype = mediaType || 'image';
                    const mediaObj = { id: mediaId };
                    if (mtype === 'document') mediaObj.filename = `${rfq?.code || 'RFQ'}.pdf`;
                    components.push({ type: 'HEADER', parameters: [{ type: mtype, [mtype]: mediaObj }] });
                }
            } else if (type === 'body') {
                const placeholders = [...(comp.text || '').matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1]);
                if (placeholders.length > 0) {
                    const isNamed = placeholders.some(p => isNaN(p));
                    const parameters = placeholders.map(p => {
                        const val = vars[`body_${p}`] || '-';
                        const param = { type: 'text', text: val };
                        if (isNamed) param.parameter_name = p;
                        return param;
                    });
                    components.push({ type: 'BODY', parameters });
                }
            }
        }
        return components;
    };

    const handleTestSend = async () => {
        const p = testPhone.trim().replace(/\s+/g, '');
        if (!p) return;
        setTestSending(true); setTestResult(null);
        try {
            let mediaId = null;
            let mediaType = templateWantsDoc ? 'document' : 'image';
            try {
                const endpoint = templateWantsDoc
                    ? `/v1/rfq-received/${rfq.id}/generate-pdf?store_id=${storeId}`
                    : `/v1/rfq-received/${rfq.id}/generate-image?store_id=${storeId}`;
                const res = await fetch(endpoint, { method: 'POST', headers: { Authorization: token } });
                const data = await res.json();
                if (data.media_id) mediaId = data.media_id;
            } catch (_) { /* attachment optional */ }

            const components = buildRFQComponents({ mediaId, mediaType });
            const res = await fetch('/v1/rfq-bot/waba-test-message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: token },
                body: JSON.stringify({
                    store_id:      storeId,
                    to:            p,
                    template_name: preview?.template_name,
                    language_code: preview?.template_language || 'en',
                    components,
                }),
            });
            const data = await res.json();
            setTestResult(data.sent ? 'ok' : 'err: ' + (data.error || 'Failed'));
        } catch (e) {
            setTestResult('err: ' + e.message);
        }
        setTestSending(false);
    };

    const statusIcon = (s) => {
        // Already sent in a previous batch
        if (sentPhones.has(s.phone)) return <i className="bi bi-check2-circle text-success" style={{ fontSize: 18 }} title="Already sent"></i>;
        if (phase === 'preview' || phase === 'done') return null;
        const st = supplierStatuses[s.phone];
        if (st === undefined) return null; // not in this send batch (unselected)
        if (st === 'pending') return <Spinner animation="border" size="sm" />;
        if (st === 'sent') return <i className="bi bi-check2-circle text-success" style={{ fontSize: 18 }}></i>;
        return <i className="bi bi-x-circle text-danger" style={{ fontSize: 18 }} title={st.replace('failed_', '')}></i>;
    };

    // WhatsApp mockup constants
    const A4_WIDTH = 794, THUMB_W = 290, THUMB_H = 190;
    const thumbScale = THUMB_W / A4_WIDTH;

    const isSending = phase === 'sending';
    const isDone    = phase === 'done';
    // Unsent = in selectedPhones, in supplierList, and NOT already sent
    const unsentSelected = [...selectedPhones].filter(p => supplierList.some(s => s.phone === p) && !sentPhones.has(p));
    const canSend = phase === 'preview' && !loadingPreview && !error && unsentSelected.length > 0;
    // Progress
    const totalCount = supplierList.length;
    const sentCount  = supplierList.filter(s => sentPhones.has(s.phone)).length;
    const progressPct = totalCount > 0 ? Math.round((sentCount / totalCount) * 100) : 0;

    return (
        <>
        <Modal show={show} onHide={onHide} size="xl" centered scrollable className="rfq-send-modal-wrap">
            <Modal.Header closeButton style={{ background: '#f8f9fa' }}>
                <Modal.Title style={{ fontSize: 17, display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <i className="bi bi-whatsapp me-2" style={{ color: '#25d366' }}></i>
                    {`Send RFQ #${rfq?.code || ''} to Suppliers`}
                    {rfq?.customer_city && (
                        <span style={{ fontSize: '13px', color: '#555', fontWeight: 'normal', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <i className="bi bi-geo-alt-fill" style={{ color: '#888' }}></i>
                            {rfq.customer_city}
                        </span>
                    )}
                    {onViewDetails && (
                        <button
                            className="btn btn-sm btn-outline-secondary"
                            style={{ fontSize: '11px', padding: '2px 8px', fontWeight: 'normal' }}
                            onClick={onViewDetails}
                            title="View RFQ details"
                        >
                            <i className="bi bi-list-ul me-1"></i>View Details
                        </button>
                    )}
                    {rfq?.procurement_message_id && (
                        <button
                            className="btn btn-sm btn-outline-primary"
                            style={{ fontSize: '11px', padding: '2px 8px', fontWeight: 'normal', whiteSpace: 'nowrap' }}
                            onClick={openLinkedEmail}
                            title="Open linked email"
                        >
                            <i className={`bi ${rfq.procurement_message_code?.startsWith('WA-') ? 'bi-whatsapp text-success' : 'bi-envelope-fill text-primary'} me-1`}></i>
                            {rfq.procurement_message_code || 'Linked Message'}
                        </button>
                    )}
                    <button
                        className="btn btn-sm btn-outline-primary"
                        style={{ fontSize: '11px', padding: '2px 8px', fontWeight: 'normal' }}
                        onClick={() => rfqPreviewRef.current?.open(rfq)}
                        title="View RFQ Preview"
                    >
                        <i className="bi bi-eye me-1"></i>Preview
                    </button>
                    {rfq?.customer_id && (
                        <button
                            className="btn btn-sm btn-outline-info"
                            style={{ fontSize: '11px', padding: '2px 8px', fontWeight: 'normal', whiteSpace: 'nowrap' }}
                            onClick={() => customerEditRef.current?.open(rfq.customer_id)}
                            title="Edit Customer"
                        >
                            <i className="bi bi-person-gear me-1"></i>Edit Customer
                        </button>
                    )}
                </Modal.Title>
            </Modal.Header>

            <Modal.Body style={{ padding: 0 }}>
                {/* ── Tab nav ── */}
                <ul className="nav nav-tabs px-4 pt-2" style={{ borderBottom: '1px solid #dee2e6', background: '#f8f9fa' }}>
                    <li className="nav-item">
                        <button className={`nav-link ${sendModalTab === 'send' ? 'active' : ''}`} onClick={() => setSendModalTab('send')}>
                            <i className="bi bi-send me-1"></i>Send
                        </button>
                    </li>
                    <li className="nav-item">
                        <button className={`nav-link ${sendModalTab === 'supplier_conv' ? 'active' : ''}`} onClick={() => setSendModalTab('supplier_conv')}>
                            <i className="bi bi-whatsapp me-1"></i>Supplier Conversations
                            {sendSupplierConvUnread > 0 && <span className="badge bg-danger ms-1 rounded-pill" style={{ fontSize: 9 }}>{sendSupplierConvUnread}</span>}
                        </button>
                    </li>
                    <li className="nav-item">
                        <button className={`nav-link ${sendModalTab === 'customer_conv' ? 'active' : ''}`} onClick={() => setSendModalTab('customer_conv')}>
                            <i className="bi bi-person-lines-fill me-1"></i>Customer Conversations
                            {sendCustomerConvUnread > 0 && <span className="badge bg-danger ms-1 rounded-pill" style={{ fontSize: 9 }}>{sendCustomerConvUnread}</span>}
                        </button>
                    </li>
                    <li className="nav-item">
                        <button className={`nav-link ${sendModalTab === 'customer_email_conv' ? 'active' : ''}`} onClick={() => setSendModalTab('customer_email_conv')}>
                            <i className="bi bi-envelope-fill me-1"></i>Customer Email
                            {sendCustomerEmailConvUnread > 0 && <span className="badge bg-danger ms-1 rounded-pill" style={{ fontSize: 9 }}>{sendCustomerEmailConvUnread}</span>}
                        </button>
                    </li>
                </ul>

                <div style={{ padding: '20px 24px' }}>
                {error && <Alert variant="danger" className="mb-3">{error}</Alert>}

                {sendModalTab === 'supplier_conv' ? (
                    <RFQWhatsAppConversationsPanel
                        storeId={storeId}
                        phones={(rfq?.forwarded_to || []).map(s => s.phone).filter(Boolean)}
                        phoneLabels={Object.fromEntries((rfq?.forwarded_to || []).filter(s => s.phone).map(s => [s.phone, s.supplier_name || s.name || s.phone]))}
                        chatZIndex={20000}
                        emptyMessage="No suppliers have been sent this RFQ yet."
                        onUnreadCount={setSendSupplierConvUnread}
                        onEditSupplier={() => setSendModalTab('send')}
                        initialChatPhone={sendModalTab === 'supplier_conv' ? initialPhone : null}
                    />
                ) : sendModalTab === 'customer_conv' ? (
                    <RFQWhatsAppConversationsPanel
                        storeId={storeId}
                        phones={rfq?.customer_phone ? [rfq.customer_phone] : []}
                        phoneLabels={rfq?.customer_phone ? { [rfq.customer_phone]: rfq.customer_name || rfq.customer_phone } : {}}
                        chatZIndex={20000}
                        emptyMessage="Customer phone number is not available. Add a phone number to the customer record."
                        onUnreadCount={setSendCustomerConvUnread}
                        initialChatPhone={sendModalTab === 'customer_conv' ? initialPhone : null}
                        showEmptyPhones
                    />
                ) : sendModalTab === 'customer_email_conv' ? (
                    <RFQEmailConversationsPanel
                        storeId={storeId}
                        emails={rfq?.customer_email ? [rfq.customer_email] : []}
                        emailLabels={rfq?.customer_email ? { [rfq.customer_email]: rfq.customer_name || rfq.customer_email } : {}}
                        chatZIndex={20000}
                        emptyMessage="Customer email address is not available. Add an email to the customer record."
                        onUnreadCount={setSendCustomerEmailConvUnread}
                        showEmptyEmails
                    />
                ) : loadingPreview ? (
                    <div className="text-center py-5">
                        <Spinner animation="border" />
                        <div className="text-muted mt-2">Loading preview…</div>
                    </div>
                ) : (
                    <div className="row g-4">

                        {/* ── Left: WhatsApp message mockup ── */}
                        <div className="col-md-6">
                            <div className="text-muted fw-semibold mb-2" style={{ fontSize: 11, letterSpacing: 1 }}>MESSAGE PREVIEW</div>
                            <div style={{ maxWidth: THUMB_W + 50, margin: '0 auto', borderRadius: 14, overflow: 'hidden', boxShadow: '0 6px 24px rgba(0,0,0,0.18)' }}>
                                {/* WA header */}
                                <div style={{ background: '#075e54', color: '#fff', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ width: 40, height: 40, background: '#128c7e', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <i className="bi bi-building" style={{ fontSize: 17 }}></i>
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: 14 }}>{storeData?.name || preview?.store_name || 'Your Store'}</div>
                                        <div style={{ fontSize: 11, opacity: 0.8 }}>WhatsApp Business</div>
                                    </div>
                                </div>
                                {/* Chat area */}
                                <div style={{ background: '#eae2da', padding: '14px 10px', minHeight: 280 }}>
                                    {/* Incoming/supplier contact line */}
                                    <div style={{ textAlign: 'center', marginBottom: 10 }}>
                                        <span style={{ background: 'rgba(255,255,255,0.75)', borderRadius: 8, padding: '2px 10px', fontSize: 11, color: '#555' }}>
                                            Today
                                        </span>
                                    </div>
                                    {/* Outgoing message bubble */}
                                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                        <div style={{ background: '#dcf8c6', borderRadius: '10px 2px 10px 10px', overflow: 'hidden', width: THUMB_W, boxShadow: '0 1px 3px rgba(0,0,0,0.18)', maxWidth: '85%' }}>
                                            {templateWantsDoc ? (
                                                /* PDF document card */
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderBottom: '1px solid rgba(0,0,0,0.07)', background: '#f7f7f7' }}>
                                                    <div style={{ width: 40, height: 48, background: '#e53935', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                        <i className="bi bi-file-earmark-pdf-fill" style={{ fontSize: 22, color: '#fff' }}></i>
                                                    </div>
                                                    <div style={{ overflow: 'hidden' }}>
                                                        <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                            {rfq?.code}.pdf
                                                        </div>
                                                        <div style={{ fontSize: 11, color: '#888' }}>PDF · RFQ Document</div>
                                                    </div>
                                                </div>
                                            ) : (
                                                /* Image thumbnail */
                                                <div style={{ width: THUMB_W, height: THUMB_H, background: '#f0f0f0', overflow: 'hidden', position: 'relative', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
                                                    {storeData && rfq ? (
                                                        <div style={{ position: 'absolute', top: 0, left: 0, width: A4_WIDTH, transformOrigin: 'top left', transform: `scale(${thumbScale})`, pointerEvents: 'none' }}>
                                                            <RFQPreviewContent rfq={rfq} store={storeData} />
                                                        </div>
                                                    ) : (
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#bbb' }}>
                                                            <i className="bi bi-file-earmark-image" style={{ fontSize: 42 }}></i>
                                                        </div>
                                                    )}
                                                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.35)', color: '#fff', fontSize: 10, padding: '2px 6px', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                        <i className="bi bi-image"></i> RFQ {rfq?.code} — tap to view
                                                    </div>
                                                </div>
                                            )}
                                            {/* Template text */}
                                            <div style={{ padding: '8px 10px 2px', fontSize: 13, whiteSpace: 'pre-line', lineHeight: 1.55, color: '#111' }}>
                                                {preview?.template_body
                                                    ? preview.template_body
                                                    : <span style={{ color: '#aaa', fontStyle: 'italic' }}>Template text not available</span>}
                                            </div>
                                            {/* Timestamp */}
                                            <div style={{ textAlign: 'right', fontSize: 11, color: '#888', padding: '2px 8px 7px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 3 }}>
                                                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                <i className="bi bi-check2-all" style={{ color: '#4fc3f7', fontSize: 14 }}></i>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ── Test message section ── */}
                            {!isSending && (
                                <div style={{ marginTop: 18, background: '#f8f9fa', borderRadius: 10, padding: '14px 16px', border: '1px solid #e9ecef' }}>
                                    <div className="fw-semibold mb-2" style={{ fontSize: 12, color: '#555' }}>
                                        <i className="bi bi-send-check me-1 text-primary"></i>Test this message
                                    </div>
                                    <div className="d-flex gap-2">
                                        <input
                                            className="form-control form-control-sm"
                                            placeholder="WhatsApp number (e.g. 971501234567)"
                                            value={testPhone}
                                            onChange={e => { setTestPhone(e.target.value); setTestResult(null); }}
                                            style={{ flex: 1 }}
                                        />
                                        <Button size="sm" variant="outline-primary" onClick={handleTestSend} disabled={testSending || !testPhone.trim()}>
                                            {testSending ? <Spinner animation="border" size="sm" /> : 'Send Test'}
                                        </Button>
                                    </div>
                                    {testResult && (
                                        <div className={`mt-2 small ${testResult === 'ok' ? 'text-success' : 'text-danger'}`}>
                                            {testResult === 'ok'
                                                ? <><i className="bi bi-check2-circle me-1"></i>Test message sent successfully</>
                                                : <><i className="bi bi-exclamation-circle me-1"></i>{testResult.replace('err: ', '')}</>}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* ── Right: Recipient list ── */}
                        <div className="col-md-6">
                            {/* Progress bar */}
                            {totalCount > 0 && (
                                <div style={{ marginBottom: 10 }}>
                                    <div className="d-flex justify-content-between align-items-center mb-1">
                                        <span className="text-muted fw-semibold" style={{ fontSize: 11, letterSpacing: 1 }}>RECIPIENTS</span>
                                        <span style={{ fontSize: 12, color: sentCount === totalCount && totalCount > 0 ? '#198754' : '#555' }}>
                                            {sentCount} / {totalCount} sent ({progressPct}%)
                                            {!isSending && !isDone && unsentSelected.length > 0 && (
                                                <span className="ms-2 text-muted">· {unsentSelected.length} selected</span>
                                            )}
                                        </span>
                                    </div>
                                    <div style={{ height: 6, background: '#e9ecef', borderRadius: 4, overflow: 'hidden' }}>
                                        <div style={{ width: `${progressPct}%`, height: '100%', background: sentCount === totalCount ? '#198754' : '#0d6efd', borderRadius: 4, transition: 'width 0.5s ease' }}></div>
                                    </div>
                                </div>
                            )}
                            {totalCount === 0 && (
                                <div className="text-muted fw-semibold mb-2" style={{ fontSize: 11, letterSpacing: 1 }}>RECIPIENTS</div>
                            )}

                            {supplierList.length === 0 && !loadingPreview && (
                                <Alert variant="warning" className="py-2 small">
                                    No suppliers found. Make sure product categories are identified first.
                                </Alert>
                            )}

                            {/* Remove-all-by-market buttons */}
                            {(() => {
                                const marketCounts = {};
                                supplierList.forEach(s => {
                                    if (s.purchase_market) {
                                        const mk = toTitleCase(s.purchase_market);
                                        marketCounts[mk] = (marketCounts[mk] || 0) + 1;
                                    }
                                });
                                const markets = Object.keys(marketCounts);
                                if (markets.length === 0 || isSending) return null;
                                return (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                                        {markets.map(mkt => (
                                            <button key={mkt}
                                                title={`Remove all ${mkt} suppliers from this list`}
                                                onClick={() => {
                                                    const phones = supplierList.filter(s => s.purchase_market && toTitleCase(s.purchase_market) === mkt && !sentPhones.has(s.phone)).map(s => s.phone);
                                                    setRemovedFromList(prev => new Set([...prev, ...phones]));
                                                    setSelectedPhones(prev => { const next = new Set(prev); phones.forEach(p => next.delete(p)); return next; });
                                                    setExtraSuppliers(prev => prev.filter(ex => !ex.purchase_market || toTitleCase(ex.purchase_market) !== mkt));
                                                }}
                                                style={{ fontSize: 11, padding: '2px 10px', borderRadius: 20, border: '1px solid #fca5a5', background: '#fef2f2', color: '#b91c1c', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <i className="bi bi-x-circle" style={{ fontSize: 10 }}></i>
                                                Remove all: {mkt}
                                                <span style={{ background: '#fca5a5', color: '#7f1d1d', borderRadius: 10, padding: '0 5px', fontSize: 10, fontWeight: 700, marginLeft: 2 }}>{marketCounts[mkt]}</span>
                                            </button>
                                        ))}
                                    </div>
                                );
                            })()}

                            <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #f0f0f0', borderRadius: 8 }}>
                                {supplierList.map((s, i) => {
                                    const alreadySent = sentPhones.has(s.phone);
                                    const isSelected  = selectedPhones.has(s.phone);
                                    const isExtra     = extraSuppliers.some(e => e.phone === s.phone);
                                    const clickable   = !alreadySent && !isSending;
                                    return (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderBottom: '1px solid #f5f5f5', background: alreadySent ? '#f0fff4' : (isSelected ? '#f0fff4' : 'white'), cursor: clickable ? 'pointer' : 'default', opacity: alreadySent ? 0.75 : 1 }}
                                            onClick={() => clickable && togglePhone(s.phone)}>
                                            {/* Checkbox — disabled for already-sent */}
                                            <input type="checkbox" checked={isSelected || alreadySent} readOnly disabled={alreadySent || isSending}
                                                style={{ width: 16, height: 16, cursor: clickable ? 'pointer' : 'default', flexShrink: 0, accentColor: '#25d366' }} />
                                            {/* Avatar */}
                                            <div style={{ width: 36, height: 36, background: alreadySent ? '#198754' : (isExtra ? '#0d6efd' : '#25d366'), borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <i className={`bi ${isExtra ? 'bi-person-plus-fill' : 'bi-person-fill'} text-white`} style={{ fontSize: 15 }}></i>
                                            </div>
                                            {/* Info */}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <span style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0 }}>{s.name}</span>
                                                    {s.id && (
                                                        <button
                                                            title="View supplier details"
                                                            onClick={e => { e.stopPropagation(); setViewingSupplier(s); }}
                                                            style={{ flexShrink: 0, border: 'none', background: 'none', padding: '0 2px', color: '#6c757d', fontSize: 13, lineHeight: 1, cursor: 'pointer' }}>
                                                            <i className="bi bi-eye"></i>
                                                        </button>
                                                    )}
                                                    {s.phone && (
                                                        <button
                                                            title="Open WhatsApp Conversation"
                                                            onClick={e => { e.stopPropagation(); setChatModal({ type: 'whatsapp', value: s.phone.replace(/^\+/, '') }); }}
                                                            style={{ flexShrink: 0, border: 'none', background: 'none', padding: '0 2px', color: '#25d366', fontSize: 13, lineHeight: 1, cursor: 'pointer' }}>
                                                            <i className="bi bi-whatsapp"></i>
                                                        </button>
                                                    )}
                                                    {s.email && (
                                                        <button
                                                            title="Open Email Conversation"
                                                            onClick={e => { e.stopPropagation(); setChatModal({ type: 'email', value: s.email }); }}
                                                            style={{ flexShrink: 0, border: 'none', background: 'none', padding: '0 2px', color: '#0d6efd', fontSize: 13, lineHeight: 1, cursor: 'pointer' }}>
                                                            <i className="bi bi-envelope-fill"></i>
                                                        </button>
                                                    )}
                                                </div>
                                                <div style={{ fontSize: 11, color: '#555' }}>
                                                    <i className="bi bi-whatsapp me-1" style={{ color: '#25d366' }}></i>{s.phone}
                                                    {alreadySent && <span className="ms-2 text-success">· sent</span>}
                                                    {s.purchase_market && (
                                                        <span style={{ marginLeft: 6, padding: '1px 6px', borderRadius: 10, background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', fontWeight: 600, fontSize: 9 }}>
                                                            {s.purchase_market}
                                                        </span>
                                                    )}
                                                </div>
                                                {/* Supplier categories */}
                                                {(s.categories || []).length > 0 && (
                                                    <div style={{ marginTop: 3, display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                                                        {s.categories.map((cat, ci) => {
                                                            const rfqCats = (rfq?.categories || []).map(c => c.toLowerCase());
                                                            const matches = rfqCats.some(rc => rc === cat.toLowerCase() || rc.includes(cat.toLowerCase()) || cat.toLowerCase().includes(rc));
                                                            return (
                                                                <span key={ci} style={{
                                                                    fontSize: 9, padding: '1px 5px', borderRadius: 10,
                                                                    background: matches ? '#dcfce7' : '#f1f5f9',
                                                                    color: matches ? '#166534' : '#64748b',
                                                                    border: `1px solid ${matches ? '#86efac' : '#e2e8f0'}`,
                                                                    fontWeight: matches ? 600 : 400,
                                                                }}>{cat}</span>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                            {/* Status icon */}
                                            <div style={{ flexShrink: 0, width: 22, textAlign: 'center' }}>
                                                {statusIcon(s)}
                                            </div>
                                            {/* Remove button — removes from this list only, not from rfq-suppliers DB */}
                                            {!alreadySent && !isSending && (
                                                <button
                                                    title="Remove from recipients list"
                                                    onClick={e => {
                                                        e.stopPropagation();
                                                        setRemovedFromList(prev => new Set([...prev, s.phone]));
                                                        setSelectedPhones(prev => { const next = new Set(prev); next.delete(s.phone); return next; });
                                                        if (isExtra) setExtraSuppliers(prev => prev.filter(ex => ex.phone !== s.phone));
                                                    }}
                                                    style={{ flexShrink: 0, border: 'none', background: 'none', padding: '2px 4px', color: '#dc3545', fontSize: 13, lineHeight: 1, cursor: 'pointer', borderRadius: 4, opacity: 0.7 }}>
                                                    <i className="bi bi-x-circle"></i>
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* ── Add supplier (autocomplete) ── */}
                            {!isSending && (
                                <div style={{ marginTop: 12, padding: '12px', background: '#f8f9fa', borderRadius: 8, border: '1px solid #e9ecef', position: 'relative' }}>
                                    <div className="fw-semibold mb-2" style={{ fontSize: 12, color: '#555' }}>
                                        <i className="bi bi-person-plus me-1 text-primary"></i>Add supplier
                                    </div>
                                    <input
                                        className="form-control form-control-sm"
                                        placeholder="Type name or WhatsApp number…"
                                        value={addQuery}
                                        autoComplete="off"
                                        onChange={e => { setAddQuery(e.target.value); searchAddSuppliers(e.target.value); }}
                                        onKeyDown={e => {
                                            if (e.key === 'Escape') { setShowAddSugg(false); }
                                            if (e.key === 'Enter') {
                                                const q = addQuery.trim().replace(/\s+/g, '');
                                                if (addSuggestions.length > 0) addSupplierDirect(addSuggestions[0]);
                                                else if (q) addSupplierDirect({ name: q, phone: q });
                                            }
                                        }}
                                        onFocus={() => addSuggestions.length > 0 && setShowAddSugg(true)}
                                        onBlur={() => setTimeout(() => setShowAddSugg(false), 150)}
                                    />
                                    {showAddSugg && addSuggestions.length > 0 && (
                                        <div style={{ position: 'absolute', left: 12, right: 12, top: '100%', marginTop: 2, background: '#fff', border: '1px solid #dee2e6', borderRadius: 8, boxShadow: '0 6px 18px rgba(0,0,0,0.12)', zIndex: 1050, maxHeight: 220, overflowY: 'auto' }}>
                                            {addSuggestions.map((s, i) => (
                                                <div key={i}
                                                    onMouseDown={() => addSupplierDirect(s)}
                                                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', cursor: 'pointer', borderBottom: i < addSuggestions.length - 1 ? '1px solid #f5f5f5' : 'none' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = '#f0f4ff'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'white'}
                                                >
                                                    <div style={{ width: 32, height: 32, background: '#0d6efd', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                        <i className="bi bi-person-fill text-white" style={{ fontSize: 14 }}></i>
                                                    </div>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                                                        <div style={{ fontSize: 11, color: '#555' }}>
                                                            <i className="bi bi-whatsapp me-1" style={{ color: '#25d366' }}></i>{s.phone}
                                                            {s.category && <span className="ms-2 text-muted">{s.category}</span>}
                                                        </div>
                                                    </div>
                                                    <i className="bi bi-plus-circle text-primary" style={{ fontSize: 16 }}></i>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── Fetch suppliers from Google Maps ── */}
                            {!isSending && (
                                <div style={{ marginTop: 10 }}>
                                    <button
                                        className="btn btn-sm w-100 text-start"
                                        style={{ background: mapsOpen ? '#e8f0fe' : '#f8f9fa', border: '1px solid #dee2e6', borderRadius: 8, padding: '8px 12px', fontWeight: 600, fontSize: 12, color: '#1a56db', display: 'flex', alignItems: 'center', gap: 6 }}
                                        onClick={() => { setMapsOpen(o => !o); setMapsResult(null); }}
                                    >
                                        <i className="bi bi-google me-1"></i>
                                        Fetch suppliers from Google Maps
                                        <i className={`bi bi-chevron-${mapsOpen ? 'up' : 'down'} ms-auto`}></i>
                                    </button>

                                    {mapsOpen && (
                                        <div style={{ background: '#f0f4ff', border: '1px solid #c7d7fc', borderRadius: '0 0 8px 8px', padding: '12px', marginTop: -1 }}>

                                            {/* Result flash message */}
                                            {mapsResult && (() => {
                                                const isOk = !mapsResult.error && mapsResult.found > 0;
                                                const isWarn = !mapsResult.error && !mapsResult.found;
                                                const color = mapsResult.error || isWarn ? '#842029' : '#0a3622';
                                                const bg    = mapsResult.error || isWarn ? '#f8d7da' : '#d1e7dd';
                                                const bdr   = mapsResult.error || isWarn ? '#f5c2c7' : '#a3cfbb';
                                                return (
                                                    <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 8, border: `1px solid ${bdr}`, background: bg, color, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                                                        <i className={`bi ${isOk ? 'bi-check-circle-fill' : 'bi-exclamation-circle-fill'}`} style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}></i>
                                                        <div>
                                                            {mapsResult.error
                                                                ? <span style={{ fontWeight: 600, fontSize: 13 }}>{mapsResult.error}</span>
                                                                : isOk
                                                                    ? <>
                                                                        <div style={{ fontWeight: 700, fontSize: 13 }}>{mapsResult.found} supplier{mapsResult.found !== 1 ? 's' : ''} found</div>
                                                                        <div style={{ fontSize: 12, marginTop: 2 }}>
                                                                            <span style={{ background: '#dbeafe', color: '#1d4ed8', borderRadius: 4, padding: '1px 6px', marginRight: 6 }}>
                                                                                <i className="bi bi-database-fill me-1"></i>{mapsResult.fromDb ?? 0} from our DB
                                                                            </span>
                                                                            <span style={{ background: '#dcfce7', color: '#166534', borderRadius: 4, padding: '1px 6px', marginRight: 6 }}>
                                                                                <i className="bi bi-map-fill me-1"></i>{mapsResult.fromMaps ?? 0} from Google Maps
                                                                            </span>
                                                                            <span style={{ color: '#6c757d' }}>{mapsResult.added} new added to list</span>
                                                                        </div>
                                                                      </>
                                                                    : <span style={{ fontWeight: 600, fontSize: 13 }}>No suppliers found. Try different markets or ensure product categories are identified.</span>}
                                                        </div>
                                                    </div>
                                                );
                                            })()}

                                            {/* Market chips */}
                                            <div style={{ fontSize: 11, color: '#374151', fontWeight: 600, marginBottom: 6 }}>
                                                Select markets to search:
                                            </div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                                                {[...(storeData?.settings?.purchase_markets || []), ...[...mapsMarkets].filter(m => !(storeData?.settings?.purchase_markets || []).includes(m))].map((m, i) => (
                                                    <label key={i} onClick={() => setMapsMarkets(prev => { const next = new Set(prev); next.has(m) ? next.delete(m) : next.add(m); return next; })}
                                                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, border: `1px solid ${mapsMarkets.has(m) ? '#2563eb' : '#cbd5e1'}`, background: mapsMarkets.has(m) ? '#dbeafe' : '#fff', cursor: 'pointer', fontSize: 12, fontWeight: mapsMarkets.has(m) ? 600 : 400, color: mapsMarkets.has(m) ? '#1d4ed8' : '#374151', userSelect: 'none' }}>
                                                        <i className={`bi bi-geo-alt${mapsMarkets.has(m) ? '-fill' : ''}`}></i>
                                                        {m}
                                                    </label>
                                                ))}
                                            </div>

                                            {/* Add custom market */}
                                            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                                                <input
                                                    className="form-control form-control-sm"
                                                    placeholder="Add market (e.g. Dubai, Cairo…)"
                                                    value={mapsCustomInput}
                                                    onChange={e => setMapsCustomInput(e.target.value)}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') {
                                                            const v = toTitleCase(mapsCustomInput);
                                                            if (v) { setMapsMarkets(prev => new Set([...prev, v])); setMapsCustomInput(''); }
                                                        }
                                                    }}
                                                    style={{ fontSize: 12 }}
                                                />
                                                <button
                                                    className="btn btn-sm btn-outline-primary"
                                                    style={{ whiteSpace: 'nowrap', fontSize: 12 }}
                                                    onClick={() => {
                                                        const v = toTitleCase(mapsCustomInput);
                                                        if (v) { setMapsMarkets(prev => new Set([...prev, v])); setMapsCustomInput(''); }
                                                    }}
                                                >
                                                    + Add
                                                </button>
                                            </div>

                                            {/* Min / Max count */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8, flexWrap: 'wrap' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>Min. suppliers per category:</label>
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        max={20}
                                                        value={mapsMinCount}
                                                        onChange={e => setMapsMinCount(e.target.value)}
                                                        onBlur={e => { const v = parseInt(e.target.value); setMapsMinCount(isNaN(v) || v < 1 ? '5' : String(Math.min(v, 20))); }}
                                                        style={{ width: 64, padding: '3px 6px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12 }}
                                                    />
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>Max. suppliers per category:</label>
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        max={20}
                                                        value={mapsMaxCount}
                                                        onChange={e => setMapsMaxCount(e.target.value)}
                                                        onBlur={e => { const v = parseInt(e.target.value); setMapsMaxCount(isNaN(v) || v < 1 ? '20' : String(Math.min(v, 20))); }}
                                                        style={{ width: 64, padding: '3px 6px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12 }}
                                                    />
                                                </div>
                                            </div>

                                            <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 10 }}>
                                                {rfq?.categories?.length || 0} categor{(rfq?.categories?.length || 0) !== 1 ? 'ies' : 'y'} × {mapsMarkets.size} market{mapsMarkets.size !== 1 ? 's' : ''} = {(rfq?.categories?.length || 0) * mapsMarkets.size} Google Maps search{(rfq?.categories?.length || 0) * mapsMarkets.size !== 1 ? 'es' : ''}
                                            </div>

                                            <button
                                                className="btn btn-sm btn-primary w-100"
                                                disabled={mapsFetching || mapsMarkets.size === 0}
                                                onClick={fetchFromMaps}
                                                style={{ fontSize: 12, fontWeight: 600 }}
                                            >
                                                {mapsFetching
                                                    ? <><Spinner animation="border" size="sm" className="me-1" />Searching Google Maps…</>
                                                    : <><i className="bi bi-search me-1"></i>Fetch Suppliers</>}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {isDone && (
                                <Alert variant="success" className="mt-3 py-2 small">
                                    <i className="bi bi-check2-circle me-2"></i>
                                    RFQ sent to all {sentCount} supplier(s).
                                </Alert>
                            )}
                        </div>
                    </div>
                )}
                </div>
            </Modal.Body>

            <Modal.Footer style={{ background: '#f8f9fa' }}>
                <Button variant="secondary" onClick={onHide}>
                    {isDone ? 'Close' : 'Cancel'}
                </Button>
                {/* PDF view / download */}
                <Button variant="outline-secondary" onClick={loadPdf} disabled={pdfLoading} title="View / Download RFQ PDF" style={{ marginRight: 'auto' }}>
                    {pdfLoading
                        ? <><Spinner animation="border" size="sm" className="me-1" />Generating…</>
                        : <><i className="bi bi-file-earmark-pdf me-1"></i>View PDF</>}
                </Button>
                {sendModalTab === 'send' && (
                    <Button variant="success" onClick={handleSend} disabled={!canSend || isSending}>
                        {isSending
                            ? <><Spinner animation="border" size="sm" className="me-2" />Sending…</>
                            : <><i className="bi bi-send-fill me-2"></i>Confirm & Send ({unsentSelected.length})</>}
                    </Button>
                )}
            </Modal.Footer>
        </Modal>

        {/* Supplier view modal */}
        {viewingSupplier && (
            <Modal show onHide={() => setViewingSupplier(null)} size="md" centered>
                <Modal.Header closeButton>
                    <Modal.Title style={{ fontSize: 16 }}>
                        <i className="bi bi-building me-2"></i>{viewingSupplier.name}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ padding: '20px 24px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <i className="bi bi-whatsapp" style={{ color: '#25d366', fontSize: 16 }}></i>
                            <span style={{ fontSize: 14 }}>{viewingSupplier.phone}</span>
                        </div>
                        {viewingSupplier.address && (
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                                <i className="bi bi-geo-alt" style={{ color: '#6c757d', fontSize: 15, marginTop: 1 }}></i>
                                <span style={{ fontSize: 13, color: '#444' }}>{viewingSupplier.address}</span>
                            </div>
                        )}
                        {viewingSupplier.purchase_market && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <i className="bi bi-pin-map" style={{ color: '#6c757d', fontSize: 15 }}></i>
                                <span style={{ fontSize: 13, color: '#444' }}>{viewingSupplier.purchase_market}</span>
                            </div>
                        )}
                        {viewingSupplier.rating > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <i className="bi bi-star-fill" style={{ color: '#f59e0b', fontSize: 14 }}></i>
                                <span style={{ fontSize: 13, color: '#444' }}>{viewingSupplier.rating.toFixed(1)} / 5.0</span>
                            </div>
                        )}
                        {viewingSupplier.website && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <i className="bi bi-globe" style={{ color: '#6c757d', fontSize: 14 }}></i>
                                <a href={viewingSupplier.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13 }}>{viewingSupplier.website}</a>
                            </div>
                        )}
                        {viewingSupplier.google_maps_url && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <i className="bi bi-map" style={{ color: '#6c757d', fontSize: 14 }}></i>
                                <a href={viewingSupplier.google_maps_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13 }}>View on Google Maps</a>
                            </div>
                        )}
                        {(viewingSupplier.categories || []).length > 0 && (
                            <div>
                                <div style={{ fontSize: 11, color: '#6c757d', fontWeight: 600, marginBottom: 6, letterSpacing: 0.5 }}>PRODUCT CATEGORIES</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                    {viewingSupplier.categories.map((cat, ci) => {
                                        const rfqCats = (rfq?.categories || []).map(c => c.toLowerCase());
                                        const matches = rfqCats.some(rc => rc === cat.toLowerCase() || rc.includes(cat.toLowerCase()) || cat.toLowerCase().includes(rc));
                                        return (
                                            <span key={ci} style={{
                                                fontSize: 11, padding: '3px 9px', borderRadius: 12,
                                                background: matches ? '#dcfce7' : '#f1f5f9',
                                                color: matches ? '#166534' : '#64748b',
                                                border: `1px solid ${matches ? '#86efac' : '#e2e8f0'}`,
                                                fontWeight: matches ? 600 : 400,
                                            }}>{cat}{matches ? ' ✓' : ''}</span>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </Modal.Body>
                <Modal.Footer style={{ background: '#f8f9fa', justifyContent: 'space-between' }}>
                    <a href={`/dashboard/rfq-suppliers?search=${encodeURIComponent(viewingSupplier.name || '')}`}
                        target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-secondary">
                        <i className="bi bi-box-arrow-up-right me-1"></i>Open in Suppliers Page
                    </a>
                    <Button variant="secondary" size="sm" onClick={() => setViewingSupplier(null)}>Close</Button>
                </Modal.Footer>
            </Modal>
        )}

        {/* PDF viewer modal */}
        {showPdfModal && pdfUrl && (
            <Modal show onHide={() => setShowPdfModal(false)} size="xl" centered>
                <Modal.Header closeButton>
                    <Modal.Title style={{ fontSize: 16 }}>
                        <i className="bi bi-file-earmark-pdf me-2 text-danger"></i>
                        {rfq?.code}.pdf
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ padding: 0, height: '80vh' }}>
                    <iframe src={pdfUrl} title="RFQ PDF" style={{ width: '100%', height: '100%', border: 'none' }} />
                </Modal.Body>
                <Modal.Footer style={{ background: '#f8f9fa' }}>
                    <Button variant="secondary" onClick={() => setShowPdfModal(false)}>Close</Button>
                    <a href={pdfUrl} download={`${rfq?.code || 'RFQ'}.pdf`} className="btn btn-primary">
                        <i className="bi bi-download me-1"></i>Download PDF
                    </a>
                </Modal.Footer>
            </Modal>
        )}
        <RFQPreview ref={rfqPreviewRef} />
        <CustomerCreate ref={customerEditRef} />
        <EmailDetailModal
            msg={emailDetail}
            show={emailDetailShow && !!emailDetail}
            onClose={() => setEmailDetailShow(false)}
            storeId={storeId}
            token={token}
        />
        <WhatsAppChatModal
            show={chatModal.type === 'whatsapp'}
            phone={chatModal.value}
            storeId={storeId}
            onHide={() => setChatModal({ type: null, value: '' })}
        />
        <EmailChatModal
            show={chatModal.type === 'email'}
            email={chatModal.value}
            storeId={storeId}
            onHide={() => setChatModal({ type: null, value: '' })}
        />
        </>
    );
}

// eslint-disable-next-line no-unused-vars
function RFQRepliesPanel({ rfq, storeId, onAdded, replies }) {
    const token                                     = localStorage.getItem('access_token');
    const storeSettings = (() => { try { return JSON.parse(localStorage.getItem('_store_settings_cache') || 'null'); } catch (_) { return null; } })();

    // Provider/model for file extraction — default to last used or first provider with a key
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

    const [uploadProvider, setUploadProvider]       = React.useState(defaultProvider.value);
    const [uploadModel, setUploadModel]             = React.useState(defaultModel);
    const [expanded, setExpanded]                   = React.useState(null);
    const [uploading, setUploading]                 = React.useState(false);
    const [uploadResult, setUploadResult]           = React.useState(null); // { file_name, file_type, prices, is_quotation, extracted_text }
    const [uploadError, setUploadError]             = React.useState('');
    const [supplierName, setSupplierName]           = React.useState('');
    const [supplierPhone, setSupplierPhone]         = React.useState('');
    const [confirming, setConfirming]               = React.useState(false);
    const [confirmError, setConfirmError]           = React.useState('');
    const fileInputRef                              = React.useRef(null);

    const handleProviderChange = prov => {
        setUploadProvider(prov);
        const firstModel = modelsForProvider(prov)[0]?.value || '';
        setUploadModel(firstModel);
        try { localStorage.setItem('_rfq_extract_provider', prov); localStorage.setItem('_rfq_extract_model', firstModel); } catch (_) {}
    };

    const handleFileSelect = async (file) => {
        if (!file || !rfq?.id || !storeId) return;
        setUploading(true);
        setUploadError('');
        setUploadResult(null);
        setConfirmError('');
        try {
            const fd = new FormData();
            fd.append('file', file);
            const params = new URLSearchParams({ store_id: storeId });
            if (uploadProvider) params.set('llm_provider', uploadProvider);
            if (uploadModel)    params.set('llm_model', uploadModel);
            const res = await fetch(`/v1/rfq-received/${rfq.id}/supplier-replies/parse-file?${params}`, {
                method: 'POST',
                headers: { Authorization: token },
                body: fd,
            });
            const data = await res.json();
            if (data.error) { setUploadError(data.error); return; }
            setUploadResult(data);
            if (data.supplier_name)  setSupplierName(data.supplier_name);
            if (data.supplier_phone) setSupplierPhone(data.supplier_phone);
        } catch (e) { setUploadError(e.message); }
        finally { setUploading(false); }
    };

    const handleConfirm = async () => {
        if (!uploadResult || !rfq?.id) return;
        setConfirming(true);
        setConfirmError('');
        try {
            const body = {
                supplier_name:  supplierName.trim(),
                supplier_phone: supplierPhone.trim(),
                raw_text:       uploadResult.extracted_text || '',
                prices:         uploadResult.prices || [],
                run_llm_extraction: false,
            };
            const res = await fetch(`/v1/rfq-received/${rfq.id}/supplier-replies?store_id=${storeId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: token },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (data.error) { setConfirmError(data.error); return; }
            setUploadResult(null);
            setSupplierName('');
            setSupplierPhone('');
            if (fileInputRef.current) fileInputRef.current.value = '';
            onAdded?.();
        } catch (e) { setConfirmError(e.message); }
        finally { setConfirming(false); }
    };

    const uploadSection = (
        <div style={{ marginBottom: 16, border: '1px dashed #ced4da', borderRadius: 10, padding: 14, background: '#fafafa' }}>
            <div className="fw-semibold mb-2" style={{ fontSize: 13, color: '#444' }}>
                <i className="bi bi-upload me-2 text-primary"></i>Upload Supplier Quotation File
            </div>
            {/* Provider & model selection */}
            {!uploadResult && (
                <div className="row g-2 mb-2">
                    <div className="col-sm-5">
                        <select
                            className="form-select form-select-sm"
                            style={{ fontSize: 12 }}
                            value={uploadProvider}
                            onChange={e => handleProviderChange(e.target.value)}
                        >
                            {AI_PROVIDERS.map(p => (
                                <option key={p.value} value={p.value}>{p.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-sm-7">
                        <select
                            className="form-select form-select-sm"
                            style={{ fontSize: 12 }}
                            value={uploadModel}
                            onChange={e => { setUploadModel(e.target.value); try { localStorage.setItem('_rfq_extract_model', e.target.value); } catch (_) {} }}
                        >
                            {modelsForProvider(uploadProvider).map(m => (
                                <option key={m.value} value={m.value}>
                                    {m.label} — {m.costLabel}{fileCapabilityLabel(m)}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            )}
            {!uploadResult && !uploading && (
                <div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.xlsx,.xls,.csv,.txt,.png,.jpg,.jpeg,.webp"
                        style={{ display: 'none' }}
                        onChange={e => handleFileSelect(e.target.files?.[0])}
                    />
                    <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => fileInputRef.current?.click()}
                        style={{ fontSize: 12 }}
                    >
                        <i className="bi bi-file-earmark-arrow-up me-1"></i>Choose File (PDF, Excel, Image)
                    </button>
                </div>
            )}
            {uploading && (
                <div className="d-flex align-items-center gap-2 text-muted" style={{ fontSize: 13 }}>
                    <span className="spinner-border spinner-border-sm"></span> Extracting prices from file…
                </div>
            )}
            {uploadError && <div className="alert alert-danger py-1 px-2 mt-2" style={{ fontSize: 12 }}>{uploadError}</div>}
            {uploadResult && (
                <div>
                    <div className="d-flex align-items-center gap-2 mb-2" style={{ fontSize: 12, color: '#555' }}>
                        <i className="bi bi-file-earmark-check text-success"></i>
                        <strong>{uploadResult.file_name}</strong>
                        <span className="badge bg-secondary" style={{ fontSize: 10 }}>{uploadResult.file_type}</span>
                        {uploadResult.is_quotation && <span className="badge bg-success" style={{ fontSize: 10 }}>Quotation</span>}
                    </div>
                    {/* Supplier info */}
                    <div className="row g-2 mb-2">
                        <div className="col-sm-6">
                            <input
                                className="form-control form-control-sm"
                                placeholder="Supplier name (optional)"
                                value={supplierName}
                                onChange={e => setSupplierName(e.target.value)}
                                style={{ fontSize: 12 }}
                            />
                        </div>
                        <div className="col-sm-6">
                            <input
                                className="form-control form-control-sm"
                                placeholder="Supplier phone (optional)"
                                value={supplierPhone}
                                onChange={e => setSupplierPhone(e.target.value)}
                                style={{ fontSize: 12 }}
                            />
                        </div>
                    </div>
                    {/* Extracted prices */}
                    {(uploadResult.prices || []).length > 0 ? (
                        <div style={{ overflowX: 'auto', marginBottom: 10 }}>
                            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: '#e8f4fd' }}>
                                        <th style={{ padding: '5px 8px', textAlign: 'left' }}>Product</th>
                                        <th style={{ padding: '5px 8px', textAlign: 'left' }}>Part No</th>
                                        <th style={{ padding: '5px 8px', textAlign: 'right' }}>Qty</th>
                                        <th style={{ padding: '5px 8px', textAlign: 'right' }}>Unit Price</th>
                                        <th style={{ padding: '5px 8px', textAlign: 'left' }}>Currency</th>
                                        <th style={{ padding: '5px 8px', textAlign: 'center' }}>VAT</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {uploadResult.prices.map((p, pi) => (
                                        <tr key={pi} style={{ borderTop: '1px solid #f0f0f0' }}>
                                            <td style={{ padding: '5px 8px' }}>{p.product_name || '—'}</td>
                                            <td style={{ padding: '5px 8px', color: '#666' }}>{p.part_no || '—'}</td>
                                            <td style={{ padding: '5px 8px', textAlign: 'right' }}>{p.quantity != null ? p.quantity : '—'}</td>
                                            <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 600, color: '#198754' }}>
                                                {p.unit_price != null ? p.unit_price.toLocaleString() : '—'}
                                            </td>
                                            <td style={{ padding: '5px 8px' }}>{p.currency || 'SAR'}</td>
                                            <td style={{ padding: '5px 8px', textAlign: 'center' }}>
                                                <span style={{ fontSize: 10, color: p.vat_included ? '#198754' : '#6c757d' }}>
                                                    {p.vat_included ? 'Incl.' : 'Excl.'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-muted mb-2" style={{ fontSize: 12 }}>No prices found in the file.</div>
                    )}
                    {uploadResult.general_notes && (
                        <div className="mb-2 p-2" style={{ background: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: 6, fontSize: 12 }}>
                            <i className="bi bi-info-circle me-1 text-secondary"></i>
                            <strong>Quotation Terms:</strong> {uploadResult.general_notes}
                        </div>
                    )}
                    {confirmError && <div className="alert alert-danger py-1 px-2 mb-2" style={{ fontSize: 12 }}>{confirmError}</div>}
                    <div className="d-flex gap-2">
                        <button className="btn btn-sm btn-success" onClick={handleConfirm} disabled={confirming} style={{ fontSize: 12 }}>
                            {confirming ? <span className="spinner-border spinner-border-sm me-1"></span> : <i className="bi bi-check-lg me-1"></i>}
                            Add to RFQ
                        </button>
                        <button className="btn btn-sm btn-outline-secondary" onClick={() => { setUploadResult(null); setUploadError(''); if (fileInputRef.current) fileInputRef.current.value = ''; }} style={{ fontSize: 12 }}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );

    if (!replies || replies.length === 0) {
        return (
            <div>
                {uploadSection}
                <div className="text-center py-4 text-muted">
                    <i className="bi bi-chat-left-dots" style={{ fontSize: 40, display: 'block', marginBottom: 12, opacity: 0.35 }}></i>
                    <div style={{ fontSize: 14 }}>No replies received yet</div>
                    <div style={{ fontSize: 12, marginTop: 4 }}>Supplier replies to this RFQ will appear here</div>
                </div>
            </div>
        );
    }

    return (
        <div>
            {uploadSection}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {replies.map((r, i) => {
                const isOpen = expanded === i;
                const ts = r.received_at ? new Date(r.received_at).toLocaleString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
                const isQuote = r.is_quotation;
                const statusColor = r.extraction_status === 'done' ? '#198754' : r.extraction_status === 'failed' ? '#dc3545' : '#f59e0b';
                return (
                    <div key={r.id || i} style={{ border: `1px solid ${isQuote ? '#c3e6cb' : '#dee2e6'}`, borderRadius: 10, overflow: 'hidden', background: isQuote ? '#f0fff4' : '#fff' }}>
                        {/* Header row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer' }}
                            onClick={() => setExpanded(isOpen ? null : i)}>
                            <div style={{ width: 36, height: 36, background: isQuote ? '#198754' : '#6c757d', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <i className={`bi ${isQuote ? 'bi-currency-dollar' : 'bi-chat-left-text'} text-white`} style={{ fontSize: 15 }}></i>
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 600, fontSize: 13 }}>
                                    {r.supplier_name || r.supplier_phone || 'Unknown supplier'}
                                    {isQuote && <span className="ms-2 badge" style={{ background: '#d1e7dd', color: '#0a3622', fontSize: 10, fontWeight: 600 }}>Quotation</span>}
                                </div>
                                <div style={{ fontSize: 11, color: '#555', display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 2 }}>
                                    {r.supplier_phone && <span><i className="bi bi-whatsapp me-1" style={{ color: '#25d366' }}></i>{r.supplier_phone}</span>}
                                    {ts && <span><i className="bi bi-clock me-1"></i>{ts}</span>}
                                    {r.source && <span className="text-muted">via {r.source}</span>}
                                    {r.extraction_status && (
                                        <span style={{ color: statusColor }}>
                                            <i className={`bi ${r.extraction_status === 'done' ? 'bi-check-circle' : r.extraction_status === 'failed' ? 'bi-x-circle' : 'bi-hourglass-split'} me-1`}></i>
                                            {r.extraction_status === 'done' ? 'Prices extracted' : r.extraction_status === 'failed' ? 'Extraction failed' : 'Extracting…'}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <i className={`bi bi-chevron-${isOpen ? 'up' : 'down'} text-muted`} style={{ fontSize: 14, flexShrink: 0 }}></i>
                        </div>

                        {/* Expanded body */}
                        {isOpen && (
                            <div style={{ padding: '0 14px 14px', borderTop: '1px solid #f0f0f0' }}>
                                {/* Raw text */}
                                {r.raw_text && (
                                    <div style={{ marginTop: 10 }}>
                                        <div style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 4, letterSpacing: 0.5 }}>MESSAGE</div>
                                        <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, background: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: 6, padding: '10px 12px', margin: 0, fontFamily: 'inherit', lineHeight: 1.6 }}>
                                            {r.raw_text}
                                        </pre>
                                    </div>
                                )}
                                {/* Media */}
                                {r.media_urls?.length > 0 && (
                                    <div style={{ marginTop: 10 }}>
                                        <div style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 6, letterSpacing: 0.5 }}>ATTACHMENTS</div>
                                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                            {r.media_urls.map((url, mi) => (
                                                <a key={mi} href={url} target="_blank" rel="noreferrer"
                                                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: '#fff', border: '1px solid #dee2e6', borderRadius: 6, fontSize: 12, color: '#0d6efd', textDecoration: 'none' }}>
                                                    <i className="bi bi-paperclip"></i>Attachment {mi + 1}
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {/* Extracted prices */}
                                {r.prices?.length > 0 && (
                                    <div style={{ marginTop: 10 }}>
                                        <div style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 6, letterSpacing: 0.5 }}>EXTRACTED PRICES</div>
                                        <div style={{ overflowX: 'auto' }}>
                                            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                                                <thead>
                                                    <tr style={{ background: '#f0f0f0' }}>
                                                        <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>Product</th>
                                                        <th style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>Unit Price</th>
                                                        <th style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>Qty</th>
                                                        <th style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>Total</th>
                                                        <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600 }}>Notes</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {r.prices.map((p, pi) => {
                                                        const total = (p.unit_price && p.quantity) ? (p.unit_price * p.quantity) : null;
                                                        return (
                                                        <tr key={pi} style={{ borderTop: '1px solid #f0f0f0' }}>
                                                            <td style={{ padding: '7px 10px' }}>{p.product_name || p.part_no || '—'}</td>
                                                            <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 600, color: '#198754' }}>
                                                                {p.unit_price != null ? p.unit_price.toLocaleString() : '—'}
                                                                {p.currency ? ' ' + p.currency : ''}
                                                            </td>
                                                            <td style={{ padding: '7px 10px', textAlign: 'right' }}>{p.quantity != null ? p.quantity : '—'}</td>
                                                            <td style={{ padding: '7px 10px', textAlign: 'right' }}>
                                                                {total != null ? total.toLocaleString() : '—'}
                                                                {p.currency ? ' ' + p.currency : ''}
                                                            </td>
                                                            <td style={{ padding: '7px 10px', color: '#666', fontSize: 12 }}>{p.notes || ''}</td>
                                                        </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                                {/* Quotation-wide terms (validity, delivery, payment) */}
                                {r.general_notes && (
                                    <div style={{ marginTop: 10, padding: '8px 10px', background: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: 6, fontSize: 12 }}>
                                        <i className="bi bi-info-circle me-1 text-secondary"></i>
                                        <strong>Quotation Terms:</strong> {r.general_notes}
                                    </div>
                                )}
                                {/* Extraction error */}
                                {r.extraction_status === 'failed' && r.extraction_error && (
                                    <div className="mt-2 text-danger small">
                                        <i className="bi bi-exclamation-circle me-1"></i>{r.extraction_error}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
            </div>
        </div>
    );
}

function LiveProgressPanel({ progress, onDismiss }) {
    if (!progress) return null;
    const { stage, percent, message, supplier_name, market, status, step, total } = progress;
    const isDone   = stage === 'done' || stage === 'failed' || stage === 'ignored';
    const isError  = stage === 'failed';
    const isIgnore = stage === 'ignored';
    const barColor = isError ? '#dc3545' : isIgnore ? '#6c757d' : isDone ? '#198754' : '#0d6efd';
    const bgColor  = isError ? '#fff5f5' : isIgnore ? '#f8f9fa' : '#f0f9ff';
    const borderColor = isError ? '#f5c2c7' : isIgnore ? '#dee2e6' : '#b6d4fe';
    return (
        <div style={{ background: bgColor, border: `1px solid ${borderColor}`, borderRadius: 8, padding: '14px 16px', marginBottom: 16 }}>
            <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="fw-semibold" style={{ fontSize: 14 }}>{STAGE_LABELS[stage] || stage}</span>
                <div className="d-flex align-items-center gap-2">
                    <span className="text-muted" style={{ fontSize: 12 }}>{percent}%</span>
                    {isDone && <button type="button" className="btn-close" style={{ fontSize: 10 }} onClick={onDismiss} />}
                </div>
            </div>
            <div style={{ height: 6, background: '#e9ecef', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
                <div style={{ height: '100%', width: `${percent}%`, background: barColor, borderRadius: 3, transition: 'width 0.4s ease' }} />
            </div>
            <div className="text-muted" style={{ fontSize: 12 }}>{message}</div>
            {stage === 'forwarding' && supplier_name && (
                <div className="d-flex align-items-center gap-2 mt-2">
                    <span className="badge" style={{
                        background: status === 'sent' ? '#d1e7dd' : status === 'failed' ? '#f8d7da' : '#fff3cd',
                        color: status === 'sent' ? '#0a3622' : status === 'failed' ? '#58151c' : '#664d03', fontSize: 11,
                    }}>
                        {status === 'sent' ? '✓' : status === 'failed' ? '✗' : '…'} {supplier_name}
                    </span>
                    {market && market !== 'any' && <span className="badge bg-light text-dark border" style={{ fontSize: 11 }}>📍 {market}</span>}
                    {total > 0 && <span className="text-muted" style={{ fontSize: 11 }}>{step}/{total} suppliers</span>}
                </div>
            )}
        </div>
    );
}

// ── Main Index Component ──────────────────────────────────────────────────────

export default function RFQReceivedIndex({ showToastMessage }) {
    const { t } = useTranslation('common');
    const storeId = localStorage.getItem("store_id");
    const token = localStorage.getItem("access_token");
    const history = useHistory();
    const location = useLocation();

    const isAdmin = localStorage.getItem("user_role") === "Admin";
    const enableRFQModule = (() => { try { return !!JSON.parse(localStorage.getItem('_store_settings_cache') || 'null')?.enable_rfq_module; } catch (_) { return false; } })();

    const [list, setList] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [pageSize, setPageSize] = useState(() => { try { return parseInt(localStorage.getItem('rfq_page_size') || '10', 10); } catch (_) { return 10; } });
    const [statusFilter, setStatusFilter] = useState("");
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState(null);
    const [showDetail, setShowDetail] = useState(false);
    const [reprocessing, setReprocessing] = useState(null);
    const [showSendModal, setShowSendModal] = useState(false);
    const [rfqForSend, setRfqForSend] = useState(null);
    const [procMsgModal, setProcMsgModal] = useState({ show: false, loading: false, msg: null, code: '' });
    const [liveProgress, setLiveProgress] = useState(null);
    const [deletingAll, setDeletingAll] = useState(false);
    const [deletingRFQId, setDeletingRFQId] = useState(null);
    const [deleteConfirmRFQ, setDeleteConfirmRFQ] = useState(null);
    const [rfqUnreadMap, setRfqUnreadMap] = useState({}); // { rfqId → total unread count }
    const [pendingSendTab, setPendingSendTab] = useState(null);
    const [pendingSendPhone, setPendingSendPhone] = useState(null);
    const rfqCreateRef = useRef(null);
    const quotationCreateRef = useRef(null);
    const selectedIdRef = useRef(null);
    const rfqPreviewRef = useRef(null);

    const refreshSelected = useCallback((id) => {
        const targetId = id || selectedIdRef.current;
        if (!targetId) return;
        fetch(`/v1/rfq-received/${targetId}?store_id=${storeId}`, { headers: { Authorization: token } })
            .then(r => r.json())
            .then(d => { if (d && !d.error && selectedIdRef.current === targetId) setSelected(d); })
            .catch(() => {});
    }, [storeId, token]);

    const fetchList = useCallback(async () => {
        if (!storeId) return;
        setIsLoading(true);
        const params = new URLSearchParams({ store_id: storeId, page, limit: pageSize });
        if (statusFilter) params.set("status", statusFilter);
        if (search) params.set("search", search);
        try {
            const res = await fetch(`/v1/rfq-received?${params}`, { headers: { Authorization: token } });
            const data = await res.json();
            setList(data.items || []);
            setTotalCount(data.total_count || 0);
            setTotalPages(Math.ceil((data.total_count || 0) / pageSize));
        } catch (e) {
            if (showToastMessage) showToastMessage(t('error_load_rfqs') + e.message, "danger");
        }
        setIsLoading(false);
    }, [storeId, token, page, pageSize, statusFilter, search, showToastMessage, t]);

    useEffect(() => { fetchList(); }, [fetchList]);

    // Batch-fetch WhatsApp unread counts for all visible RFQs
    useEffect(() => {
        if (!list?.length || !storeId || !token) return;
        const phoneToRfqIds = {};
        list.forEach(rfq => {
            (rfq.forwarded_to || []).forEach(s => {
                if (!s.phone) return;
                const norm = s.phone.replace(/^\+/, '');
                if (!phoneToRfqIds[norm]) phoneToRfqIds[norm] = [];
                if (!phoneToRfqIds[norm].includes(rfq.id)) phoneToRfqIds[norm].push(rfq.id);
            });
            if (rfq.customer_phone) {
                const norm = rfq.customer_phone.replace(/^\+/, '');
                if (!phoneToRfqIds[norm]) phoneToRfqIds[norm] = [];
                if (!phoneToRfqIds[norm].includes(rfq.id)) phoneToRfqIds[norm].push(rfq.id);
            }
        });
        const allPhones = Object.keys(phoneToRfqIds);
        if (!allPhones.length) return;
        const params = new URLSearchParams({ store_id: storeId, type: 'whatsapp', limit: '1000', phones: allPhones.join(',') });
        fetch(`/v1/procurement-message-threads?${params}`, { headers: { Authorization: token } })
            .then(r => r.json())
            .then(data => {
                const newMap = {};
                (data.threads || []).forEach(t => {
                    if (!t.unread_count) return;
                    const norm = (t.contact_phone || '').replace(/^\+/, '');
                    (phoneToRfqIds[norm] || []).forEach(rfqId => {
                        newMap[rfqId] = (newMap[rfqId] || 0) + t.unread_count;
                    });
                });
                setRfqUnreadMap(newMap);
            })
            .catch(() => {});
    }, [list, storeId, token]);

    // Handle openRfqConversations events (emitted by Topbar header WhatsApp badge)
    // and pendingRfqConversations stored in sessionStorage when navigating from another page
    useEffect(() => {
        const handleOpen = async ({ rfqId, tab, phone }) => {
            if (!rfqId || !storeId || !token) return;
            try {
                const res = await fetch(`/v1/rfq-received/${rfqId}?store_id=${storeId}`, { headers: { Authorization: token } });
                const data = await res.json();
                if (data?.id) {
                    // Batch all updates so the modal mounts with all props correct in one render
                    unstable_batchedUpdates(() => {
                        setPendingSendTab(tab || 'supplier_conv');
                        setPendingSendPhone(phone || null);
                        setRfqForSend(data);
                        setShowSendModal(true);
                    });
                }
            } catch (_) {}
        };
        eventEmitter.on('openRfqConversations', handleOpen);

        // Check sessionStorage for pending navigation from another page
        const pending = sessionStorage.getItem('pendingRfqConversations');
        if (pending) {
            sessionStorage.removeItem('pendingRfqConversations');
            try { handleOpen(JSON.parse(pending)); } catch (_) {}
        }

        return () => eventEmitter.off('openRfqConversations', handleOpen);
    }, [storeId, token]); // eslint-disable-line react-hooks/exhaustive-deps

    // Auto-open detail when ?id= is in URL (e.g. navigated from procurement emails "View RFQ")
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const id = params.get('id');
        if (id && storeId) {
            openDetail(id);
            // Strip the param so refreshes don't re-open
            history.replace('/dashboard/rfq-received');
        }
    }, [location.search, storeId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Auto-open edit form when ?edit= is in URL (e.g. "View RFQ" from Extract Quotation Prices modal)
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const editId = params.get('edit');
        if (editId && storeId && token) {
            history.replace('/dashboard/rfq-received');
            fetch(`/v1/rfq-received/${editId}?store_id=${storeId}`, { headers: { Authorization: token } })
                .then(r => r.json())
                .then(d => { if (d && !d.error) rfqCreateRef.current?.edit(d); })
                .catch(() => {});
        }
    }, [location.search, storeId, token]); // eslint-disable-line react-hooks/exhaustive-deps

    // Auto-open "Send to Suppliers" modal after RFQ creation from email/WhatsApp.
    // Signal is passed via sessionStorage (_rfq_auto_send). Navigation uses ?t=<ts> to ensure
    // location.search changes so this effect re-fires even when already on this page.
    useEffect(() => {
        if (!storeId || !token) return;
        // Always clean the ?t= timestamp param from the URL so it doesn't persist
        const params = new URLSearchParams(location.search);
        if (params.has('t') || params.has('send')) {
            history.replace('/dashboard/rfq-received');
        }
        let sendId = null;
        try {
            sendId = sessionStorage.getItem('_rfq_auto_send');
            if (sendId) sessionStorage.removeItem('_rfq_auto_send');
        } catch (_) {}
        // Also support legacy ?send= URL param for direct links
        if (!sendId) {
            sendId = params.get('send');
        }
        if (!sendId) return;
        fetch(`/v1/rfq-received/${sendId}?store_id=${storeId}`, { headers: { Authorization: token } })
            .then(r => r.json())
            .then(d => { if (d && !d.error) { setRfqForSend(d); setShowSendModal(true); } })
            .catch(() => {});
    }, [location.search, storeId, token]); // eslint-disable-line react-hooks/exhaustive-deps

    // Realtime updates via SSE
    useEffect(() => {
        if (!storeId) return;
        const es = new EventSource(`/v1/rfq-bot/events?store_id=${storeId}`);
        es.addEventListener('rfq_received', () => fetchList());
        es.addEventListener('rfq_updated',  () => { fetchList(); refreshSelected(); });
        es.addEventListener('rfq_progress', (e) => {
            try {
                const data = JSON.parse(e.data);
                setLiveProgress(data);
                // If the detail modal is open for this exact RFQ, refresh it so
                // the timeline picks up the new log entries in real time.
                if (data.rfq_id && selectedIdRef.current === data.rfq_id) {
                    fetch(`/v1/rfq-received/${data.rfq_id}?store_id=${storeId}`, { headers: { Authorization: token } })
                        .then(r => r.json())
                        .then(d => { if (d && !d.error) setSelected(d); })
                        .catch(() => {});
                }
                if (data.stage === 'done' || data.stage === 'ignored' || data.stage === 'suppliers_found' || data.stage === 'ai_skipped') {
                    setTimeout(() => setLiveProgress(p => p?.rfq_id === data.rfq_id ? null : p), 5000);
                }
            } catch (_) {}
        });
        es.onerror = () => {};
        return () => es.close();
    }, [storeId, token, fetchList, refreshSelected]);

    const openDetail = async (id) => {
        try {
            const res = await fetch(`/v1/rfq-received/${id}?store_id=${storeId}`, { headers: { Authorization: token } });
            const data = await res.json();
            selectedIdRef.current = id;
            setSelected(data);
            setShowDetail(true);
        } catch (_) {}
    };

    const reprocess = async (id) => {
        setReprocessing(id);
        try {
            const res = await fetch(`/v1/rfq-received/${id}/process?store_id=${storeId}`, {
                method: 'POST', headers: { Authorization: token },
            });
            const data = await res.json();
            if (data.success) {
                if (showToastMessage) showToastMessage(t('rfq_processing_started'), "success");
                setTimeout(fetchList, 2000);
            }
        } catch (e) {
            if (showToastMessage) showToastMessage(t('error_prefix') + e.message, "danger");
        }
        setReprocessing(null);
    };

    const openSendModal = (rfq) => {
        setRfqForSend(rfq);
        setShowSendModal(true);
    };

    const openProcurementMsgModal = async (msgId, code) => {
        setProcMsgModal({ show: true, loading: true, msg: null, code: code || '' });
        try {
            const res = await fetch(`/v1/procurement-messages/${msgId}?store_id=${storeId}`, {
                headers: { Authorization: token },
            });
            const data = await res.json();
            setProcMsgModal({ show: true, loading: false, msg: data, code: code || '' });
        } catch {
            setProcMsgModal({ show: true, loading: false, msg: null, code: code || '' });
        }
    };

    const downloadPDF = (rfq) => {
        rfqPreviewRef.current?.open(rfq);
    };

    const handleDeleteRFQ = async (rfq) => {
        setDeleteConfirmRFQ(null);
        setDeletingRFQId(rfq.id);
        try {
            const res = await fetch(`/v1/rfq-received/${rfq.id}?store_id=${storeId}`, { method: 'DELETE', headers: { Authorization: token } });
            if (!res.ok) throw new Error('Delete failed');
            setList(prev => prev.filter(r => r.id !== rfq.id));
            if (selected?.id === rfq.id) { setSelected(null); setShowDetail(false); }
        } catch (e) {
            if (showToastMessage) showToastMessage('Failed to delete RFQ', 'danger');
        } finally {
            setDeletingRFQId(null);
        }
    };

    const handleDeleteAll = async () => {
        if (!window.confirm(t('Confirm delete ALL RFQ records? This cannot be undone.'))) return;
        setDeletingAll(true);
        try {
            await fetch(`/v1/rfq-received?store_id=${storeId}`, { method: 'DELETE', headers: { Authorization: token } });
            setSelected(null);
            setShowDetail(false);
            fetchList();
        } catch (e) {
            if (showToastMessage) showToastMessage(t('Failed to delete all RFQ records'), 'danger');
        } finally {
            setDeletingAll(false);
        }
    };

    // Open an existing quotation by ID in the QuotationCreate modal.
    const handleOpenQuotation = (id) => {
        if (!id) return;
        quotationCreateRef.current?.open(id);
    };

    // Quotation pre-fill: open QuotationCreate modal inline (no navigation)
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

    return (
        <div style={{ padding: '20px' }}>
            {/* Header */}
            <div className="d-flex align-items-center justify-content-between mb-4">
                <div className="d-flex align-items-center gap-3">
                    <i className="bi bi-inbox-fill text-primary" style={{ fontSize: '1.5rem' }}></i>
                    <div>
                        <h5 className="mb-0 fw-semibold">{t('rfq_received_title')}</h5>
                        <small className="text-muted">{t('rfq_received_subtitle')}</small>
                    </div>
                </div>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                    <input
                        className="form-control form-control-sm"
                        style={{ width: '220px' }}
                        placeholder={t('search_rfq_placeholder')}
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                    />
                    <select
                        className="form-control form-control-sm"
                        style={{ width: '160px' }}
                        value={statusFilter}
                        onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                    >
                        <option value="">{t('all_statuses')}</option>
                        <option value="received">{t('status_received')}</option>
                        <option value="processing">{t('status_processing')}</option>
                        <option value="ready_to_send">{t('status_ready_to_send')}</option>
                        <option value="forwarded">{t('status_forwarded')}</option>
                        <option value="failed">{t('status_failed')}</option>
                    </select>
                    <Button variant="outline-secondary" size="sm" onClick={fetchList}>
                        <i className="bi bi-arrow-clockwise"></i>
                    </Button>
                    <Button variant="primary" size="sm" onClick={() => rfqCreateRef.current?.open()}>
                        <i className="bi bi-plus-lg me-1"></i>Create New
                    </Button>
                    {isAdmin && (
                        <Button
                            variant="outline-danger"
                            size="sm"
                            disabled={deletingAll}
                            onClick={handleDeleteAll}
                            title={t('Delete All RFQ records (admin only)')}
                        >
                            {deletingAll
                                ? <span className="spinner-border spinner-border-sm" role="status" />
                                : <><i className="bi bi-trash3 me-1"></i>{t('Delete All')}</>}
                        </Button>
                    )}
                </div>
            </div>

            {/* Live Progress Panel */}
            <LiveProgressPanel progress={liveProgress} onDismiss={() => setLiveProgress(null)} />

            <RFQCreate ref={rfqCreateRef} showToastMessage={showToastMessage} onCreated={newRfq => {
                fetchList();
                if (newRfq?.id) { setRfqForSend(newRfq); setShowSendModal(true); }
            }} />
            <QuotationCreate ref={quotationCreateRef} showToastMessage={showToastMessage} refreshList={() => {}} />
            <RFQPreview ref={rfqPreviewRef} />
            <RFQSendModal
                key={`${rfqForSend?.id || ''}:${pendingSendTab || ''}`}
                rfq={rfqForSend}
                storeId={storeId}
                show={showSendModal}
                onHide={() => { setShowSendModal(false); setPendingSendTab(null); setPendingSendPhone(null); }}
                onSent={() => { fetchList(); refreshSelected(rfqForSend?.id); }}
                onViewDetails={rfqForSend?.id ? () => { setShowSendModal(false); openDetail(rfqForSend.id); } : undefined}
                initialTab={pendingSendTab}
                initialPhone={pendingSendPhone}
            />

            {/* Table */}
            {isLoading ? (
                <div className="text-center py-5"><Spinner animation="border" /></div>
            ) : list.length === 0 ? (
                <div className="text-center py-5 text-muted">
                    <i className="bi bi-inbox" style={{ fontSize: '3rem', display: 'block', marginBottom: '12px' }}></i>
                    {t('no_rfq_messages')}
                </div>
            ) : (
                <>
                <div className="d-flex justify-content-between align-items-center mb-2">
                    <small className="text-muted">
                        Showing {((page - 1) * pageSize + 1).toLocaleString()}–{Math.min(page * pageSize, totalCount).toLocaleString()} of {totalCount.toLocaleString()} | Page {page} of {totalPages.toLocaleString()}
                    </small>
                    <div className="d-flex align-items-center gap-2">
                        <small className="text-muted">Rows per page:</small>
                        <select
                            className="form-select form-select-sm"
                            style={{ width: 'auto' }}
                            value={pageSize}
                            onChange={e => {
                                const v = parseInt(e.target.value, 10);
                                try { localStorage.setItem('rfq_page_size', String(v)); } catch (_) {}
                                setPageSize(v);
                                setPage(1);
                            }}
                        >
                            {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                    </div>
                </div>
                <div className="table-responsive">
                    <table className="table table-hover table-sm align-middle">
                        <thead className="table-light">
                            <tr>
                                <th>{t('col_id')}</th>
                                <th>{t('col_received_at')}</th>
                                <th>{t('col_customer')}</th>
                                <th>Customer RFQ ID</th>
                                <th>Email</th>
                                <th>Mobile</th>
                                <th>{t('col_type')}</th>
                                <th>{t('col_categories')}</th>
                                <th>{t('col_status')}</th>
                                <th>{t('col_forwarded_to')}</th>
                                <th>{t('col_replies')}</th>
                                {enableRFQModule && <th style={{ width: 120 }}>{t('Quotations')}</th>}
                                <th style={{ width: 110 }}>Message</th>
                                <th style={{ width: 100 }}>{t('col_actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {list.map(rfq => {
                                const quotationReplies = (rfq.supplier_replies || []).filter(r => r.is_quotation).length;
                                return (
                                    <tr key={rfq.id}>
                                        <td style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                                            {rfq.code
                                                ? <span className="badge bg-light text-dark border">{rfq.code}</span>
                                                : <span className="text-muted">—</span>}
                                        </td>
                                        <td style={{ whiteSpace: 'nowrap', fontSize: '13px' }}>
                                            {new Date(rfq.received_at).toLocaleString()}
                                        </td>
                                        <td style={{ fontSize: '13px' }}>
                                            {rfq.customer_name
                                                ? <div>{rfq.customer_name}{rfq.customer_company && <div className="text-muted" style={{ fontSize: '11px' }}>{rfq.customer_company}</div>}</div>
                                                : <span className="text-muted">—</span>}
                                        </td>
                                        <td style={{ fontSize: '13px', whiteSpace: 'nowrap' }}>
                                            {rfq.customer_rfq_id
                                                ? <span className="badge bg-light text-dark border">{rfq.customer_rfq_id}</span>
                                                : <span className="text-muted">—</span>}
                                        </td>
                                        <td style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                                            {rfq.customer_email
                                                ? <a href={`mailto:${rfq.customer_email}`} style={{ color: 'inherit' }}>{rfq.customer_email}</a>
                                                : <span className="text-muted">—</span>}
                                        </td>
                                        <td style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                                            {rfq.customer_phone
                                                ? <a href={`tel:${rfq.customer_phone}`} style={{ color: 'inherit' }}>{rfq.customer_phone}</a>
                                                : <span className="text-muted">—</span>}
                                        </td>
                                        <td>
                                            <Badge bg={rfq.message_type === 'image' ? 'info' : rfq.message_type === 'mixed' ? 'secondary' : 'light'} text="dark">
                                                {rfq.message_type === 'image' && <i className="bi bi-image me-1"></i>}
                                                {rfq.message_type === 'text' && <i className="bi bi-chat-text me-1"></i>}
                                                {rfq.message_type === 'mixed' && <i className="bi bi-file-earmark-image me-1"></i>}
                                                {rfq.message_type}
                                            </Badge>
                                        </td>
                                        <td style={{ maxWidth: '200px' }}>
                                            {rfq.categories?.length > 0
                                                ? rfq.categories.slice(0, 3).map(c => <Badge key={c} bg="secondary" className="me-1 mb-1" style={{ fontSize: '11px' }}>{c}</Badge>)
                                                : <span className="text-muted small">—</span>}
                                        </td>
                                        <td><StatusBadge status={rfq.status} /></td>
                                        <td>
                                            {rfq.forwarded_to?.length > 0
                                                ? <span className="text-success small"><i className="bi bi-people-fill me-1"></i>{rfq.forwarded_to.length}</span>
                                                : <span className="text-muted small">—</span>}
                                        </td>
                                        <td>
                                            {(rfq.supplier_replies || []).length > 0 ? (
                                                <span className={`small ${quotationReplies > 0 ? 'text-success fw-semibold' : 'text-warning'}`}>
                                                    <i className={`bi ${quotationReplies > 0 ? 'bi-currency-dollar' : 'bi-chat-dots'} me-1`}></i>
                                                    {quotationReplies > 0 ? `${quotationReplies} quotes` : `${(rfq.supplier_replies || []).length} replies`}
                                                </span>
                                            ) : <span className="text-muted small">—</span>}
                                        </td>
                                        {enableRFQModule && (
                                            <td style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                                                {(rfq.quotation_codes || []).length > 0
                                                    ? rfq.quotation_codes.map((code, ci) => {
                                                        const qid = (rfq.quotation_ids || [])[ci];
                                                        return (
                                                            <Badge key={ci} bg="success" className="me-1" style={{ cursor: 'pointer', fontSize: '11px' }}
                                                                onClick={() => quotationCreateRef.current?.open(qid)}
                                                                title={`Open Quotation ${code}`}>
                                                                <i className="bi bi-receipt me-1"></i>{code}
                                                            </Badge>
                                                        );
                                                    })
                                                    : <span className="text-muted">—</span>}
                                            </td>
                                        )}
                                        <td style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                                            {rfq.procurement_message_id
                                                ? <button
                                                    className="btn btn-sm btn-outline-secondary"
                                                    style={{ fontSize: '11px', padding: '2px 6px' }}
                                                    onClick={() => openProcurementMsgModal(rfq.procurement_message_id, rfq.procurement_message_code)}
                                                  >
                                                    <i className={`bi ${rfq.source === 'email' ? 'bi-envelope' : 'bi-whatsapp'} me-1`}></i>
                                                    {rfq.procurement_message_code || 'View'}
                                                  </button>
                                                : <span className="text-muted">—</span>}
                                        </td>
                                        <td>
                                            <div className="d-flex gap-1">
                                                <Button variant="outline-primary" size="sm" title={t('view_detail')} onClick={() => openDetail(rfq.id)}>
                                                    <i className="bi bi-eye"></i>
                                                </Button>
                                                <Button variant="outline-secondary" size="sm" title={t('edit')} onClick={() => rfqCreateRef.current?.edit(rfq)}>
                                                    <i className="bi bi-pencil"></i>
                                                </Button>
                                                <Button variant="outline-danger" size="sm" title="Preview & Download PDF"
                                                    onClick={() => downloadPDF(rfq)}>
                                                    <i className="bi bi-file-earmark-pdf"></i>
                                                </Button>
                                                {rfq.status === 'ready_to_send' && (
                                                    <Button variant="outline-success" size="sm" title="Preview & Send to Suppliers via WhatsApp"
                                                        onClick={() => openSendModal(rfq)}>
                                                        <i className="bi bi-send"></i>
                                                    </Button>
                                                )}
                                                {rfq.status === 'forwarded' && (
                                                    <Button variant="outline-primary" size="sm" title="View Send Status / Conversations"
                                                        onClick={() => openSendModal(rfq)}
                                                        style={{ position: 'relative' }}>
                                                        <i className="bi bi-whatsapp"></i>
                                                        {rfqUnreadMap[rfq.id] > 0 && (
                                                            <span style={{
                                                                position: 'absolute', top: -5, right: -5,
                                                                background: '#dc3545', color: '#fff',
                                                                borderRadius: '50%', width: 16, height: 16,
                                                                fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                fontWeight: 700, lineHeight: 1,
                                                            }}>{rfqUnreadMap[rfq.id]}</span>
                                                        )}
                                                    </Button>
                                                )}
                                                {(rfq.status === 'failed' || rfq.status === 'received') && (
                                                    <Button variant="outline-warning" size="sm" title={t('re_process')}
                                                        onClick={() => reprocess(rfq.id)} disabled={reprocessing === rfq.id}>
                                                        {reprocessing === rfq.id ? <Spinner animation="border" size="sm" /> : <i className="bi bi-arrow-clockwise"></i>}
                                                    </Button>
                                                )}
                                                {isAdmin && (
                                                    <Button variant="outline-danger" size="sm" title="Delete RFQ"
                                                        onClick={() => setDeleteConfirmRFQ(rfq)}
                                                        disabled={deletingRFQId === rfq.id}>
                                                        {deletingRFQId === rfq.id ? <Spinner animation="border" size="sm" /> : <i className="bi bi-trash"></i>}
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                </>
            )}

            {/* Pagination */}
            <div className="d-flex justify-content-end mt-3">
                {totalPages > 1 && (
                    <ReactPaginate
                        pageCount={totalPages}
                        forcePage={page - 1}
                        onPageChange={({ selected }) => setPage(selected + 1)}
                        containerClassName="pagination pagination-sm mb-0"
                        pageClassName="page-item"
                        pageLinkClassName="page-link"
                        previousClassName="page-item"
                        previousLinkClassName="page-link"
                        nextClassName="page-item"
                        nextLinkClassName="page-link"
                        activeClassName="active"
                        previousLabel="‹"
                        nextLabel="›"
                        marginPagesDisplayed={1}
                        pageRangeDisplayed={4}
                    />
                )}
            </div>

            {/* Delete Confirm Modal */}
            {deleteConfirmRFQ && (
                <Modal show onHide={() => setDeleteConfirmRFQ(null)} centered size="sm">
                    <Modal.Header closeButton>
                        <Modal.Title style={{ fontSize: '15px' }}>Delete RFQ</Modal.Title>
                    </Modal.Header>
                    <Modal.Body style={{ fontSize: '14px' }}>
                        Permanently delete <strong>{deleteConfirmRFQ.code}</strong>? This will also unlink it from any connected email or WhatsApp message.
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" size="sm" onClick={() => setDeleteConfirmRFQ(null)}>Cancel</Button>
                        <Button variant="danger" size="sm" onClick={() => handleDeleteRFQ(deleteConfirmRFQ)}>Delete</Button>
                    </Modal.Footer>
                </Modal>
            )}

            {/* Detail Modal */}
            <ForwardDetail
                rfq={selected}
                show={showDetail}
                storeId={storeId}
                onHide={() => { selectedIdRef.current = null; setShowDetail(false); setSelected(null); }}
                onCreateQuotation={handleCreateQuotation}
                onOpenQuotation={handleOpenQuotation}
                liveProgress={liveProgress?.rfq_id === selected?.id ? liveProgress : null}
                onSendToSuppliers={rfq => { setRfqForSend(rfq); setShowSendModal(true); }}
                onReload={refreshSelected}
            />

            {/* Procurement Message Modal */}
            {procMsgModal.show && (
                <div className="modal show d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.5)' }}
                    onClick={e => { if (e.target === e.currentTarget) setProcMsgModal(s => ({ ...s, show: false })); }}>
                    <div className="modal-dialog modal-lg modal-dialog-scrollable">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    {procMsgModal.msg?.type === 'email'
                                        ? <><i className="bi bi-envelope-fill text-primary me-2"></i>Email Message</>
                                        : <><i className="bi bi-whatsapp text-success me-2"></i>WhatsApp Message</>}
                                    {procMsgModal.code && <span className="badge bg-secondary ms-2" style={{ fontSize: '13px' }}>{procMsgModal.code}</span>}
                                </h5>
                                <button className="btn-close" onClick={() => setProcMsgModal(s => ({ ...s, show: false }))} />
                            </div>
                            <div className="modal-body">
                                {procMsgModal.loading && (
                                    <div className="text-center py-4">
                                        <span className="spinner-border spinner-border-sm me-2" />Loading…
                                    </div>
                                )}
                                {!procMsgModal.loading && !procMsgModal.msg && (
                                    <div className="text-center text-muted py-4">Message not found</div>
                                )}
                                {!procMsgModal.loading && procMsgModal.msg && (() => {
                                    const m = procMsgModal.msg;
                                    return (
                                        <>
                                            <table className="table table-sm" style={{ fontSize: '13px', marginBottom: '16px' }}>
                                                <tbody>
                                                    <tr><th style={{ width: 110, fontWeight: 600 }}>ID</th><td><code style={{ fontSize: '11px' }}>{m.id}</code></td></tr>
                                                    <tr><th style={{ fontWeight: 600 }}>Direction</th><td>{m.direction === 'in' ? '⬇️ Incoming' : '⬆️ Outgoing'}</td></tr>
                                                    <tr><th style={{ fontWeight: 600 }}>From</th><td>{m.from || '—'}</td></tr>
                                                    {(m.to || []).length > 0 && <tr><th style={{ fontWeight: 600 }}>To</th><td>{m.to.join(', ')}</td></tr>}
                                                    {m.subject && <tr><th style={{ fontWeight: 600 }}>Subject</th><td>{m.subject}</td></tr>}
                                                    <tr><th style={{ fontWeight: 600 }}>Provider</th><td>{m.provider}</td></tr>
                                                    <tr><th style={{ fontWeight: 600 }}>Date</th><td>{m.message_date ? new Date(m.message_date).toLocaleString() : '—'}</td></tr>
                                                    <tr><th style={{ fontWeight: 600 }}>Created At</th><td>{m.created_at ? new Date(m.created_at).toLocaleString() : '—'}</td></tr>
                                                </tbody>
                                            </table>

                                            {/* Body */}
                                            {m.type === 'email' ? (
                                                <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', background: '#fff', overflow: 'hidden' }}>
                                                    <div style={{ maxHeight: '480px', overflow: 'auto', padding: '20px 24px', fontSize: '14px', lineHeight: '1.6', color: '#202124' }}>
                                                        {m.body_html
                                                            ? <div dangerouslySetInnerHTML={{ __html: m.body_html }} />
                                                            : <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, fontFamily: 'inherit', fontSize: '14px' }}>{m.body_text || <span style={{ color: '#9aa0a6' }}>(empty body)</span>}</pre>
                                                        }
                                                    </div>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', justifyContent: m.direction === 'out' ? 'flex-end' : 'flex-start' }}>
                                                    <div style={{ background: m.direction === 'out' ? '#dcf8c6' : '#fff', border: '1px solid #e0e0e0', borderRadius: m.direction === 'out' ? '16px 16px 4px 16px' : '16px 16px 16px 4px', padding: '10px 14px', maxWidth: '85%', fontSize: 13, whiteSpace: 'pre-wrap', wordBreak: 'break-word', boxShadow: '0 1px 2px rgba(0,0,0,0.12)' }}>
                                                        {m.body_text || <em style={{ color: '#999' }}>(media message)</em>}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Attachments — Gmail-style cards */}
                                            {(m.attachments || []).length > 0 && (
                                                <div style={{ marginTop: '16px' }}>
                                                    <div style={{ fontSize: '12px', color: '#5f6368', fontWeight: 500, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                                        <i className="bi bi-paperclip me-1"></i>{m.attachments.length} Attachment{m.attachments.length !== 1 ? 's' : ''}
                                                    </div>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                        {m.attachments.map((att, i) => {
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
                                                                    {att.url
                                                                        ? <a href={att.url} target="_blank" rel="noopener noreferrer" download={att.filename}
                                                                            style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#1a73e8', textDecoration: 'none', marginTop: '6px' }}>
                                                                            <i className="bi bi-download"></i> Download
                                                                          </a>
                                                                        : <span style={{ fontSize: '11px', color: '#9aa0a6' }}>Not downloaded</span>
                                                                    }
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={() => setProcMsgModal(s => ({ ...s, show: false }))}>Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
