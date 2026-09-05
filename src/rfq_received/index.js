import React, { useState, useEffect, useCallback } from "react";
import { Badge, Spinner, Button, Modal } from "react-bootstrap";
import ReactPaginate from "react-paginate";
import { useTranslation } from "react-i18next";

const STATUS_CONFIG = {
    received:   { labelKey: "status_received",   bg: "secondary" },
    processing: { labelKey: "status_processing", bg: "warning", text: "dark" },
    forwarded:  { labelKey: "status_forwarded",  bg: "success" },
    failed:     { labelKey: "status_failed",     bg: "danger" },
};

function StatusBadge({ status }) {
    const { t } = useTranslation('common');
    const cfg = STATUS_CONFIG[status] || { labelKey: status, bg: "secondary" };
    return <Badge bg={cfg.bg} text={cfg.text || undefined}>{t(cfg.labelKey)}</Badge>;
}

function ForwardDetail({ rfq, show, onHide }) {
    const { t } = useTranslation('common');
    const [expandedMsg, setExpandedMsg] = useState(null);
    if (!rfq) return null;
    return (
        <Modal show={show} onHide={onHide} size="lg" centered>
            <Modal.Header closeButton>
                <Modal.Title>
                    <i className="bi bi-whatsapp text-success me-2"></i>
                    {t('rfq_detail_title')} — <small className="text-muted fs-6">{t('rfq_from')} {rfq.from_phone} {rfq.from_name && `(${rfq.from_name})`}</small>
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <div className="mb-3">
                    <div className="d-flex align-items-center gap-2 mb-2">
                        <StatusBadge status={rfq.status} />
                        <small className="text-muted">{new Date(rfq.received_at).toLocaleString()}</small>
                        {rfq.processed_at && <small className="text-muted">{t('processed_at')} {new Date(rfq.processed_at).toLocaleString()}</small>}
                    </div>
                    {rfq.categories?.length > 0 && (
                        <div className="mb-2">
                            <strong>{t('categories_identified')}</strong>{' '}
                            {rfq.categories.map(c => <Badge key={c} bg="info" text="dark" className="me-1">{c}</Badge>)}
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

                {rfq.forwarded_to?.length > 0 && (
                    <>
                        <h6 className="fw-semibold">{t('forwarded_to_suppliers')}</h6>
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
                                                    title={t('view_sent_message')}
                                                    onClick={() => setExpandedMsg(expandedMsg === i ? null : i)}
                                                >
                                                    <i className="bi bi-chat-text"></i>
                                                </button>
                                            </td>
                                        </tr>
                                        {expandedMsg === i && (
                                            <tr>
                                                <td colSpan={7} className="bg-light p-0">
                                                    <div className="p-3">
                                                        <div className="d-flex align-items-center justify-content-between mb-2">
                                                            <strong style={{ fontSize: '13px' }}>{t('sent_message_label')}</strong>
                                                            <button
                                                                type="button"
                                                                className="btn btn-outline-secondary btn-sm"
                                                                onClick={() => navigator.clipboard.writeText(r.sent_message || '')}
                                                                title={t('copy_message')}
                                                            >
                                                                <i className="bi bi-clipboard me-1"></i>{t('copy_message')}
                                                            </button>
                                                        </div>
                                                        {r.sent_message
                                                            ? <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px', background: '#fff', border: '1px solid #dee2e6', borderRadius: 4, padding: '10px', margin: 0 }}>{r.sent_message}</pre>
                                                            : <span className="text-muted small">{t('no_message_recorded')}</span>
                                                        }
                                                        {/* Attachments forwarded — reuse original RFQ links, no duplication */}
                                                        {(rfq.media_urls?.length > 0 || rfq.documents?.length > 0) && (
                                                            <div className="mt-2" style={{ fontSize: '12px' }}>
                                                                <strong>{t('attachments_forwarded')}</strong>
                                                                <div className="d-flex flex-wrap gap-2 mt-1">
                                                                    {rfq.media_urls?.map((url, mi) => (
                                                                        <a key={mi} href={url} target="_blank" rel="noreferrer"
                                                                            className="d-flex align-items-center gap-1 border rounded px-2 py-1 text-decoration-none">
                                                                            <i className="bi bi-image text-info"></i>
                                                                            <span>Image {mi + 1}</span>
                                                                        </a>
                                                                    ))}
                                                                    {rfq.documents?.map((doc, di) => {
                                                                        const isPdf = doc.mime_type?.includes('pdf');
                                                                        const isExcel = doc.mime_type?.includes('spreadsheet') || doc.mime_type?.includes('excel') || doc.file_name?.match(/\.xlsx?$/i);
                                                                        const icon = isPdf ? 'bi-file-earmark-pdf text-danger' : isExcel ? 'bi-file-earmark-excel text-success' : 'bi-file-earmark text-secondary';
                                                                        return (
                                                                            <a key={di} href={doc.url} target="_blank" rel="noreferrer"
                                                                                className="d-flex align-items-center gap-1 border rounded px-2 py-1 text-decoration-none">
                                                                                <i className={`bi ${icon}`}></i>
                                                                                <span>{doc.file_name || `Document ${di + 1}`}</span>
                                                                            </a>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                        </div>
                    </>
                )}
            </Modal.Body>
            <Modal.Footer>
                <Button variant="outline-secondary" size="sm" onClick={onHide}>{t('close')}</Button>
            </Modal.Footer>
        </Modal>
    );
}

const STAGE_LABELS = {
    classifying:       "🤖 AI is analysing the message...",
    finding_suppliers: "🔍 Searching for matching suppliers...",
    whatsapp_check:    "📱 Validating WhatsApp numbers...",
    forwarding:        "📤 Forwarding RFQ to suppliers...",
    waiting:           "⏳ Waiting before next message...",
    done:              "✅ All done!",
    failed:            "❌ Processing failed",
    ignored:           "ℹ️ Message not an RFQ — ignored",
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
                <span className="fw-semibold" style={{ fontSize: 14 }}>
                    {STAGE_LABELS[stage] || stage}
                </span>
                <div className="d-flex align-items-center gap-2">
                    <span className="text-muted" style={{ fontSize: 12 }}>{percent}%</span>
                    {isDone && (
                        <button type="button" className="btn-close" style={{ fontSize: 10 }} onClick={onDismiss} />
                    )}
                </div>
            </div>

            {/* Progress bar */}
            <div style={{ height: 6, background: '#e9ecef', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
                <div style={{
                    height: '100%',
                    width: `${percent}%`,
                    background: barColor,
                    borderRadius: 3,
                    transition: 'width 0.4s ease',
                }} />
            </div>

            {/* Current message */}
            <div className="text-muted" style={{ fontSize: 12 }}>{message}</div>

            {/* Per-supplier status badges (when forwarding) */}
            {stage === 'forwarding' && supplier_name && (
                <div className="d-flex align-items-center gap-2 mt-2">
                    <span className="badge" style={{
                        background: status === 'sent' ? '#d1e7dd' : status === 'failed' ? '#f8d7da' : '#fff3cd',
                        color: status === 'sent' ? '#0a3622' : status === 'failed' ? '#58151c' : '#664d03',
                        fontSize: 11,
                    }}>
                        {status === 'sent' ? '✓' : status === 'failed' ? '✗' : '…'} {supplier_name}
                    </span>
                    {market && market !== 'any' && (
                        <span className="badge bg-light text-dark border" style={{ fontSize: 11 }}>
                            📍 {market}
                        </span>
                    )}
                    {total > 0 && (
                        <span className="text-muted" style={{ fontSize: 11 }}>{step}/{total} suppliers</span>
                    )}
                </div>
            )}
        </div>
    );
}

export default function RFQReceivedIndex({ showToastMessage }) {
    const { t } = useTranslation('common');
    const storeId = localStorage.getItem("store_id");
    const token = localStorage.getItem("access_token");

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
    const [liveProgress, setLiveProgress] = useState(null);

    const fetchList = useCallback(async () => {
        if (!storeId) return;
        setIsLoading(true);
        const params = new URLSearchParams({
            store_id: storeId,
            page,
            limit: pageSize,
        });
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
                // Auto-dismiss after 4 s on completion stages
                if (data.stage === 'done' || data.stage === 'ignored') {
                    setTimeout(() => setLiveProgress(p => p?.rfq_id === data.rfq_id ? null : p), 4000);
                }
            } catch (_) {}
        });
        es.onerror = () => {}; // silently reconnect
        return () => es.close();
    }, [storeId, fetchList]);

    const openDetail = async (id) => {
        try {
            const res = await fetch(`/v1/rfq-received/${id}?store_id=${storeId}`, { headers: { Authorization: token } });
            const data = await res.json();
            setSelected(data);
            setShowDetail(true);
        } catch (_) {}
    };

    const reprocess = async (id) => {
        setReprocessing(id);
        try {
            const res = await fetch(`/v1/rfq-received/${id}/process?store_id=${storeId}`, {
                method: 'POST',
                headers: { Authorization: token },
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
                        <option value="forwarded">{t('status_forwarded')}</option>
                        <option value="failed">{t('status_failed')}</option>
                    </select>
                    <Button variant="outline-secondary" size="sm" onClick={fetchList}>
                        <i className="bi bi-arrow-clockwise"></i>
                    </Button>
                </div>
            </div>

            {/* Live Progress Panel */}
            <LiveProgressPanel progress={liveProgress} onDismiss={() => setLiveProgress(null)} />

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
                                <th>{t('col_received_at')}</th>
                                <th>{t('col_from')}</th>
                                <th>{t('col_type')}</th>
                                <th>{t('col_categories')}</th>
                                <th>{t('col_status')}</th>
                                <th>{t('col_forwarded_to')}</th>
                                <th style={{ width: 100 }}>{t('col_actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {list.map(rfq => (
                                <tr key={rfq.id}>
                                    <td style={{ whiteSpace: 'nowrap', fontSize: '13px' }}>
                                        {new Date(rfq.received_at).toLocaleString()}
                                    </td>
                                    <td>
                                        <div className="fw-semibold" style={{ fontSize: '13px' }}>{rfq.from_phone}</div>
                                        {rfq.from_name && <div className="text-muted" style={{ fontSize: '12px' }}>{rfq.from_name}</div>}
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
                                            ? <span className="text-success small"><i className="bi bi-people-fill me-1"></i>{rfq.forwarded_to.length} {rfq.forwarded_to.length !== 1 ? t('suppliers') : t('supplier')}</span>
                                            : <span className="text-muted small">—</span>}
                                    </td>
                                    <td>
                                        <div className="d-flex gap-1">
                                            <Button variant="outline-primary" size="sm" title={t('view_detail')} onClick={() => openDetail(rfq.id)}>
                                                <i className="bi bi-eye"></i>
                                            </Button>
                                            {(rfq.status === 'failed' || rfq.status === 'received') && (
                                                <Button
                                                    variant="outline-warning"
                                                    size="sm"
                                                    title={t('re_process')}
                                                    onClick={() => reprocess(rfq.id)}
                                                    disabled={reprocessing === rfq.id}
                                                >
                                                    {reprocessing === rfq.id
                                                        ? <Spinner animation="border" size="sm" />
                                                        : <i className="bi bi-arrow-clockwise"></i>}
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
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
                onHide={() => { setShowDetail(false); setSelected(null); }}
            />
        </div>
    );
}
