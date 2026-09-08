import React, { useState, useEffect, useCallback, useRef } from "react";
import RFQCreate from "./create";
import { Badge, Spinner, Button, Modal, Alert } from "react-bootstrap";
import ReactPaginate from "react-paginate";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";

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

function PriceComparisonTable({ rfq, storeId, onCreateQuotation }) {
    const { t } = useTranslation('common');
    const token = localStorage.getItem('access_token');

    // Manual reply form state
    const [showAddReply, setShowAddReply] = useState(false);
    const [replyForm, setReplyForm]       = useState({ supplier_name: '', supplier_phone: '', raw_text: '' });
    const [addingReply, setAddingReply]   = useState(false);
    const [addError, setAddError]         = useState('');
    const [addOk, setAddOk]               = useState(false);

    // Per-product: selected supplier and margin %
    const products = rfq.products || [];
    const replies  = (rfq.supplier_replies || []).filter(r => r.is_quotation && r.prices?.length > 0);

    // Unique suppliers with quotation replies
    const suppliers = replies.map(r => ({ name: r.supplier_name, phone: r.supplier_phone, id: r.id }));

    // Build price map: productIndex → { supplierId → price }
    const priceMap = {};
    for (const reply of replies) {
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
        products.forEach((_, i) => { m[i] = ''; });
        return m;
    });

    // Re-run defaults when rfq changes (new reply added)
    useEffect(() => { setSelectedSupplier(defaultSelections()); }, [rfq.id, (rfq.supplier_replies || []).length]); // eslint-disable-line react-hooks/exhaustive-deps

    const retailPrice = (productIndex) => {
        const sid = selectedSupplier[productIndex];
        if (!sid || !priceMap[productIndex]?.[sid]) return null;
        const cost = priceMap[productIndex][sid].unit_price;
        const m = parseFloat(margins[productIndex]);
        if (!isNaN(m) && m > 0) return cost * (1 + m / 100);
        return null;
    };

    const handleAddReply = async () => {
        setAddingReply(true);
        setAddError('');
        setAddOk(false);
        try {
            const res = await fetch(`/v1/rfq-received/${rfq.id}/supplier-reply?store_id=${storeId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: token },
                body: JSON.stringify(replyForm),
            });
            const data = await res.json();
            if (data.error) { setAddError(data.error); return; }
            setAddOk(true);
            setReplyForm({ supplier_name: '', supplier_phone: '', raw_text: '' });
            setShowAddReply(false);
        } catch (e) { setAddError(e.message); }
        finally { setAddingReply(false); }
    };

    const buildQuotationItems = () =>
        products.map((prod, i) => {
            const sid = selectedSupplier[i];
            const priceEntry = sid ? priceMap[i]?.[sid] : null;
            const costPrice = priceEntry ? priceEntry.unit_price : 0;
            const retail = retailPrice(i);
            const supplier = sid ? replies.find(r => r.id === sid) : null;
            return {
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

    return (
        <div>
            {/* Non-quotation replies summary */}
            {(rfq.supplier_replies || []).length > 0 && (
                <div className="mb-3">
                    <h6 className="fw-semibold mb-2">
                        <i className="bi bi-chat-dots me-2 text-primary"></i>
                        {t('supplier_replies_label')} ({rfq.supplier_replies.length})
                    </h6>
                    {rfq.supplier_replies.map((r, i) => (
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
                        </div>
                    ))}
                </div>
            )}

            {addOk && <Alert variant="success" className="py-1 px-2 mb-2" style={{ fontSize: '12px' }}>{t('reply_added_ok')}</Alert>}

            {/* Add reply manually */}
            <div className="mb-3">
                {!showAddReply ? (
                    <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setShowAddReply(true)}>
                        <i className="bi bi-plus-circle me-1"></i>{t('add_supplier_reply')}
                    </button>
                ) : (
                    <div className="border rounded p-3" style={{ background: '#f8f9fa' }}>
                        <h6 className="mb-3" style={{ fontSize: '13px' }}>{t('add_supplier_reply')}</h6>
                        <div className="row g-2 mb-2">
                            <div className="col-md-5">
                                <input className="form-control form-control-sm" placeholder={t('supplier_name')}
                                    value={replyForm.supplier_name} onChange={e => setReplyForm({ ...replyForm, supplier_name: e.target.value })} />
                            </div>
                            <div className="col-md-4">
                                <input className="form-control form-control-sm" placeholder={t('supplier_phone')}
                                    value={replyForm.supplier_phone} onChange={e => setReplyForm({ ...replyForm, supplier_phone: e.target.value })} />
                            </div>
                        </div>
                        <textarea className="form-control form-control-sm mb-2" rows={4}
                            placeholder={t('paste_supplier_reply_text')}
                            value={replyForm.raw_text} onChange={e => setReplyForm({ ...replyForm, raw_text: e.target.value })} />
                        {addError && <div className="text-danger mb-2" style={{ fontSize: '12px' }}>{addError}</div>}
                        <div className="d-flex gap-2">
                            <button type="button" className="btn btn-primary btn-sm" onClick={handleAddReply} disabled={addingReply || !replyForm.raw_text}>
                                {addingReply ? <Spinner animation="border" size="sm" className="me-1" /> : null}
                                {t('save_reply')}
                            </button>
                            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setShowAddReply(false)}>
                                {t('cancel')}
                            </button>
                        </div>
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
                                            {s.name || s.phone}
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
                                                        {p ? fmt(p.unit_price) : <span className="text-muted">—</span>}
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
                                                        <option key={s.id} value={s.id}>{s.name || s.phone}</option>
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

                    <button
                        type="button"
                        className="btn btn-success"
                        onClick={() => onCreateQuotation(buildQuotationItems(), rfq)}
                    >
                        <i className="bi bi-file-earmark-plus me-2"></i>
                        {t('create_quotation')}
                    </button>
                    <small className="text-muted ms-2">{t('create_quotation_hint')}</small>
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

function ForwardDetail({ rfq, show, onHide, storeId, onCreateQuotation, liveProgress }) {
    const { t } = useTranslation('common');
    const [activeTab, setActiveTab] = useState('info');
    const [expandedMsg, setExpandedMsg] = useState(null);
    if (!rfq) return null;

    const hasReplies = (rfq.supplier_replies || []).length > 0;
    const hasQuotation = (rfq.supplier_replies || []).some(r => r.is_quotation);

    return (
        <Modal show={show} onHide={onHide} size="xl" centered>
            <Modal.Header closeButton>
                <Modal.Title>
                    <i className="bi bi-whatsapp text-success me-2"></i>
                    {t('rfq_detail_title')} — <small className="text-muted fs-6">{t('rfq_from')} {rfq.from_phone} {rfq.from_name && `(${rfq.from_name})`}</small>
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
                </ul>

                <div className="p-3">
                    {/* Info tab */}
                    {activeTab === 'info' && (
                        <div>
                            <div className="d-flex align-items-center gap-2 mb-2">
                                <StatusBadge status={rfq.status} />
                                <small className="text-muted">{new Date(rfq.received_at).toLocaleString()}</small>
                                {rfq.code && <Badge bg="light" text="dark" style={{ fontSize: '11px', border: '1px solid #dee2e6' }}>{rfq.code}</Badge>}
                                {rfq.processed_at && <small className="text-muted">{t('processed_at')} {new Date(rfq.processed_at).toLocaleString()}</small>}
                            </div>
                            {rfq.customer_name && (
                                <div className="mb-2">
                                    <strong>{t('customer')}</strong>: {rfq.customer_name}
                                    {rfq.customer_phone && <span className="text-muted ms-2"><i className="bi bi-telephone ms-1"></i> {rfq.customer_phone}</span>}
                                    {rfq.customer_company && <span className="text-muted ms-2">• {rfq.customer_company}</span>}
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
                                                <th style={{ width: 80 }}>{t('col_message')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rfq.forwarded_to.map((r, i) => (
                                                <React.Fragment key={i}>
                                                    <tr>
                                                        <td>
                                                            <div>{r.supplier_name || '—'}</div>
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
                                                            {r.purchase_market
                                                                ? <span className="badge bg-light text-dark border" style={{ fontSize: '11px' }}><i className="bi bi-geo-alt me-1 text-secondary"></i>{r.purchase_market}</span>
                                                                : <span className="text-muted">—</span>}
                                                        </td>
                                                        <td>
                                                            {r.category
                                                                ? <span className="badge bg-info text-dark" style={{ fontSize: '11px' }}>{r.category}</span>
                                                                : <span className="text-muted">—</span>}
                                                        </td>
                                                        <td><StatusBadge status={r.status} /></td>
                                                        <td style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>{r.sent_at ? new Date(r.sent_at).toLocaleString() : '—'}</td>
                                                        <td className="text-center">
                                                            <button
                                                                type="button"
                                                                className={`btn btn-sm ${expandedMsg === i ? 'btn-primary' : 'btn-outline-secondary'}`}
                                                                onClick={() => setExpandedMsg(expandedMsg === i ? null : i)}
                                                            >
                                                                <i className="bi bi-chat-text"></i>
                                                            </button>
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
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="text-muted small">{t('no_suppliers_forwarded')}</p>
                            )}
                        </>
                    )}

                    {/* Prices / Supplier Replies tab */}
                    {activeTab === 'prices' && (
                        <PriceComparisonTable
                            rfq={rfq}
                            storeId={storeId}
                            onCreateQuotation={onCreateQuotation}
                        />
                    )}

                    {activeTab === 'timeline' && (
                        <RFQTimeline logs={rfq.activity_logs || []} liveProgress={liveProgress} />
                    )}
                </div>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="outline-secondary" size="sm" onClick={onHide}>{t('close')}</Button>
            </Modal.Footer>
        </Modal>
    );
}

// ── RFQ Timeline ─────────────────────────────────────────────────────────────

const STEP_META = {
    input_received:       { icon: 'bi-inbox-fill',               bg: '#22c55e', label: 'Input Received' },
    rfq_created:          { icon: 'bi-file-earmark-check-fill',  bg: '#3b82f6', label: 'RFQ Created' },
    products_identified:  { icon: 'bi-box-seam-fill',            bg: '#0ea5e9', label: 'Products Identified' },
    customer_identified:  { icon: 'bi-person-fill-check',        bg: '#0ea5e9', label: 'Customer Identified' },
    ai_categorizing:      { icon: 'bi-cpu-fill',                 bg: '#94a3b8', label: 'AI Categorizing' },
    categories_identified:{ icon: 'bi-tags-fill',                bg: '#8b5cf6', label: 'Categories Identified' },
    categories_error:     { icon: 'bi-exclamation-circle-fill',  bg: '#ef4444', label: 'Category Error' },
    ai_skipped:           { icon: 'bi-info-circle-fill',         bg: '#94a3b8', label: 'AI Skipped' },
    suppliers_found:      { icon: 'bi-people-fill',              bg: '#22c55e', label: 'Ready to Send to Suppliers' },
    no_suppliers_found:   { icon: 'bi-exclamation-triangle-fill',bg: '#f59e0b', label: 'No Suppliers Found' },
    suppliers_matched:    { icon: 'bi-shop',                     bg: '#f59e0b', label: 'Suppliers Matched' },
    waiting_approval:     { icon: 'bi-hourglass-split',          bg: '#f59e0b', label: 'Waiting Approval' },
    rfq_sent_to_supplier: { icon: 'bi-send-fill',                bg: '#22c55e', label: 'Sent to Supplier' },
    rfq_send_failed:      { icon: 'bi-exclamation-triangle-fill',bg: '#ef4444', label: 'Send Failed' },
    waiting_replies:      { icon: 'bi-hourglass',                bg: '#94a3b8', label: 'Waiting Replies' },
    supplier_replied:     { icon: 'bi-chat-left-dots-fill',      bg: '#3b82f6', label: 'Supplier Replied' },
    prices_extracted:     { icon: 'bi-cpu-fill',                 bg: '#8b5cf6', label: 'Prices Extracted' },
    prices_updated:       { icon: 'bi-currency-dollar',          bg: '#22c55e', label: 'Prices Updated' },
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
                const isLast = idx === logs.length - 1;
                const isExpanded = expandedIdx === idx;
                const hasDetails = log.details && Object.keys(log.details).length > 0;

                return (
                    <div key={log.id || idx} style={{ display: 'flex', gap: '12px', paddingBottom: isLast ? 0 : '2px' }}>
                        {/* Left column — icon + vertical line */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: '32px' }}>
                            <div style={{
                                width: '32px', height: '32px', borderRadius: '50%',
                                background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
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
                                    <span style={{ fontSize: '12px', fontWeight: 700, color: meta.bg, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
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
                                const llmModel = log.details.llm_model || log.details.model || null;
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
                                        {!prods && Object.entries(log.details).filter(([k]) => k !== 'llm_model' && k !== 'model').map(([k, v]) => (
                                            <div key={k} style={{ display: 'flex', gap: '8px', marginBottom: '2px' }}>
                                                <span style={{ color: '#64748b', minWidth: '120px', flexShrink: 0 }}>{k.replace(/_/g, ' ')}</span>
                                                <span style={{ color: '#1e293b', wordBreak: 'break-word' }}>
                                                    {Array.isArray(v) ? v.join(', ') : String(v)}
                                                </span>
                                            </div>
                                        ))}
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

    const [list, setList] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [pageSize] = useState(10);
    const [statusFilter, setStatusFilter] = useState("");
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState(null);
    const [showDetail, setShowDetail] = useState(false);
    const [reprocessing, setReprocessing] = useState(null);
    const [downloadingPDF, setDownloadingPDF] = useState(null);
    const [liveProgress, setLiveProgress] = useState(null);
    const rfqCreateRef = useRef(null);
    const selectedIdRef = useRef(null);

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

    // Realtime updates via SSE
    useEffect(() => {
        if (!storeId) return;
        const es = new EventSource(`/v1/rfq-bot/events?store_id=${storeId}`);
        es.addEventListener('rfq_received', () => fetchList());
        es.addEventListener('rfq_updated',  () => fetchList());
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
    }, [storeId, token, fetchList]);

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

    const downloadPDF = async (rfq) => {
        setDownloadingPDF(rfq.id);
        try {
            const res = await fetch('/v1/rfq/pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: token },
                body: JSON.stringify({
                    model: rfq,
                    modelName: 'rfq_received',
                    fontSizes: {},
                    filename: `RFQ-${rfq.code || rfq.id}`,
                }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                if (showToastMessage) showToastMessage('PDF generation failed: ' + (err.errors?.pdf || err.errors?.chrome || JSON.stringify(err.errors || err)), 'danger');
                return;
            }
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `RFQ-${rfq.code || rfq.id}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (e) {
            console.error('PDF download error:', e);
            if (showToastMessage) showToastMessage('PDF download failed: ' + e.message, 'danger');
        }
        setDownloadingPDF(null);
    };

    // Quotation pre-fill: store in sessionStorage and navigate to quotation page
    const handleCreateQuotation = (items, rfq) => {
        const prefill = {
            rfq_id:       rfq.id,
            rfq_code:     rfq.code || '',
            customer_id:  rfq.customer_id || null,
            customer_name: rfq.customer_name || '',
            customer_phone: rfq.customer_phone || '',
            items,
        };
        try { sessionStorage.setItem('rfq_quotation_prefill', JSON.stringify(prefill)); } catch (_) {}
        history.push('/dashboard/quotations?from_rfq=1');
        setShowDetail(false);
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
                </div>
            </div>

            {/* Live Progress Panel */}
            <LiveProgressPanel progress={liveProgress} onDismiss={() => setLiveProgress(null)} />

            <RFQCreate ref={rfqCreateRef} showToastMessage={showToastMessage} onCreated={fetchList} />

            {/* Table */}
            {isLoading ? (
                <div className="text-center py-5"><Spinner animation="border" /></div>
            ) : list.length === 0 ? (
                <div className="text-center py-5 text-muted">
                    <i className="bi bi-inbox" style={{ fontSize: '3rem', display: 'block', marginBottom: '12px' }}></i>
                    {t('no_rfq_messages')}
                </div>
            ) : (
                <div className="table-responsive">
                    <table className="table table-hover table-sm align-middle">
                        <thead className="table-light">
                            <tr>
                                <th>{t('col_id')}</th>
                                <th>{t('col_received_at')}</th>
                                <th>{t('col_from')}</th>
                                <th>{t('col_customer')}</th>
                                <th>{t('col_type')}</th>
                                <th>{t('col_categories')}</th>
                                <th>{t('col_status')}</th>
                                <th>{t('col_forwarded_to')}</th>
                                <th>{t('col_replies')}</th>
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
                                        <td>
                                            <div className="fw-semibold" style={{ fontSize: '13px' }}>{rfq.from_phone}</div>
                                            {rfq.from_name && <div className="text-muted" style={{ fontSize: '12px' }}>{rfq.from_name}</div>}
                                        </td>
                                        <td style={{ fontSize: '13px' }}>
                                            {rfq.customer_name
                                                ? <div>{rfq.customer_name}{rfq.customer_company && <div className="text-muted" style={{ fontSize: '11px' }}>{rfq.customer_company}</div>}</div>
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
                                        <td>
                                            <div className="d-flex gap-1">
                                                <Button variant="outline-primary" size="sm" title={t('view_detail')} onClick={() => openDetail(rfq.id)}>
                                                    <i className="bi bi-eye"></i>
                                                </Button>
                                                <Button variant="outline-secondary" size="sm" title={t('edit')} onClick={() => rfqCreateRef.current?.edit(rfq)}>
                                                    <i className="bi bi-pencil"></i>
                                                </Button>
                                                <Button variant="outline-danger" size="sm" title="Download PDF"
                                                    onClick={() => downloadPDF(rfq)} disabled={downloadingPDF === rfq.id}>
                                                    {downloadingPDF === rfq.id
                                                        ? <Spinner animation="border" size="sm" />
                                                        : <i className="bi bi-file-earmark-pdf"></i>}
                                                </Button>
                                                {rfq.status === 'ready_to_send' && (
                                                    <Button variant="outline-success" size="sm" title="Send to Suppliers"
                                                        onClick={() => reprocess(rfq.id)} disabled={reprocessing === rfq.id}>
                                                        {reprocessing === rfq.id
                                                            ? <Spinner animation="border" size="sm" />
                                                            : <><i className="bi bi-send"></i></>}
                                                    </Button>
                                                )}
                                                {(rfq.status === 'failed' || rfq.status === 'received') && (
                                                    <Button variant="outline-warning" size="sm" title={t('re_process')}
                                                        onClick={() => reprocess(rfq.id)} disabled={reprocessing === rfq.id}>
                                                        {reprocessing === rfq.id ? <Spinner animation="border" size="sm" /> : <i className="bi bi-arrow-clockwise"></i>}
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
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="d-flex justify-content-between align-items-center mt-3">
                    <small className="text-muted">{t('total_label')}: {totalCount} {t('rfqs')}</small>
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
                </div>
            )}

            {/* Detail Modal */}
            <ForwardDetail
                rfq={selected}
                show={showDetail}
                storeId={storeId}
                onHide={() => { selectedIdRef.current = null; setShowDetail(false); setSelected(null); }}
                onCreateQuotation={handleCreateQuotation}
                liveProgress={liveProgress?.rfq_id === selected?.id ? liveProgress : null}
            />
        </div>
    );
}
