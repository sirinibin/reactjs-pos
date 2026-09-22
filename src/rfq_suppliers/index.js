import React, { useState, useEffect, useCallback } from "react";
import { Badge, Spinner, Button, Modal } from "react-bootstrap";
import ReactPaginate from "react-paginate";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import { WhatsAppChatModal, EmailChatModal } from '../store/ConversationModal.js';

const EMPTY_SUPPLIER = {
    name: '',
    phone: '',
    phone2: '',
    address: '',
    categories: [],
    website: '',
    email: '',
    rating: '',
    is_active: true,
    purchase_market: '',
};

export function SupplierForm({ supplier, onSave, onClose }) {
    const { t } = useTranslation('common');
    const [form, setForm] = useState({ ...EMPTY_SUPPLIER, ...supplier });
    const [catInput, setCatInput] = useState('');
    const [saving, setSaving] = useState(false);
    const [markets, setMarkets] = useState([]);
    const storeId = localStorage.getItem("store_id");
    const token = localStorage.getItem("access_token");

    useEffect(() => {
        if (!storeId) return;
        fetch(`/v1/store/${storeId}`, { headers: { Authorization: token } })
            .then(r => r.json())
            .then(d => setMarkets(d.result?.settings?.purchase_markets || []))
            .catch(() => {});
    }, [storeId, token]);

    const addCategory = () => {
        const c = catInput.trim();
        if (c && !form.categories.includes(c)) {
            setForm(f => ({ ...f, categories: [...f.categories, c] }));
        }
        setCatInput('');
    };

    const removeCategory = (cat) => setForm(f => ({ ...f, categories: f.categories.filter(c => c !== cat) }));

    const handleSave = async () => {
        if (!form.name || !form.phone) { alert(t('supplier_name_phone_required')); return; }
        if (!form.purchase_market) { alert('Market is required. Please select the supplier\'s city/market.'); return; }
        setSaving(true);
        try {
            const isNew = !form.id;
            const url = isNew ? `/v1/rfq-suppliers?store_id=${storeId}` : `/v1/rfq-suppliers/${form.id}?store_id=${storeId}`;
            const method = isNew ? 'POST' : 'PUT';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', Authorization: token },
                body: JSON.stringify({ ...form, store_id: storeId, rating: parseFloat(form.rating) || 0 }),
            });
            const data = await res.json();
            if (data.error) { alert(t('error_prefix') + data.error); return; }
            onSave(data);
        } catch (e) { alert(t('error_prefix') + e.message); }
        setSaving(false);
    };

    return (
        <Modal show onHide={onClose} size="lg" centered>
            <Modal.Header closeButton>
                <Modal.Title>
                    <i className="bi bi-building me-2"></i>
                    {form.id ? t('edit_supplier') : t('add_supplier')}
                    {form.code && <span style={{ fontSize: '13px', fontWeight: 700, color: '#1a56db', marginLeft: '10px', letterSpacing: '0.03em' }}>{form.code}</span>}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <div className="row g-3">
                    <div className="col-md-6">
                        <label className="form-label fw-semibold">{t('supplier_name_label')}</label>
                        <input className="form-control form-control-sm" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={t('supplier_name_placeholder')} />
                    </div>
                    <div className="col-md-6">
                        <label className="form-label fw-semibold">
                            <i className="bi bi-whatsapp text-success me-1"></i>{t('whatsapp_number_label')}
                        </label>
                        <input className="form-control form-control-sm" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder={t('whatsapp_number_placeholder')} />
                    </div>
                    <div className="col-md-6">
                        <label className="form-label fw-semibold">
                            <i className="bi bi-whatsapp text-success me-1"></i>WhatsApp Number 2 <span className="text-muted fw-normal">(optional)</span>
                        </label>
                        <input className="form-control form-control-sm" value={form.phone2 || ''} onChange={e => setForm(f => ({ ...f, phone2: e.target.value }))} placeholder={t('whatsapp_number_placeholder')} />
                    </div>
                    <div className="col-12">
                        <label className="form-label fw-semibold">{t('address_label')}</label>
                        <input className="form-control form-control-sm" value={form.address || ''} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder={t('address_placeholder')} />
                    </div>
                    <div className="col-md-6">
                        <label className="form-label fw-semibold">{t('website_label')}</label>
                        <input className="form-control form-control-sm" value={form.website || ''} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="https://..." />
                    </div>
                    <div className="col-md-6">
                        <label className="form-label fw-semibold">Email</label>
                        <input className="form-control form-control-sm" type="email" value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="contact@supplier.com" />
                        <div className="form-text">Auto-filled from website if left blank</div>
                    </div>
                    <div className="col-md-6">
                        <label className="form-label fw-semibold">{t('purchase_market_col')}</label>
                        <select className="form-control form-control-sm" value={form.purchase_market || ''} onChange={e => setForm(f => ({ ...f, purchase_market: e.target.value }))}>
                            <option value="">— {t('any_market')} —</option>
                            {markets.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                    <div className="col-md-3">
                        <label className="form-label fw-semibold">{t('rating_label')}</label>
                        <input type="number" min="0" max="5" step="0.1" className="form-control form-control-sm" value={form.rating || ''} onChange={e => setForm(f => ({ ...f, rating: parseFloat(e.target.value) || 0 }))} />
                    </div>
                    <div className="col-md-3">
                        <label className="form-label fw-semibold">{t('active_label')}</label>
                        <div className="mt-1">
                            <div className="form-check">
                                <input className="form-check-input" type="checkbox" id="sup_active" checked={!!form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
                                <label className="form-check-label small" htmlFor="sup_active">{t('include_in_rfq_forwarding')}</label>
                            </div>
                        </div>
                    </div>
                    <div className="col-12">
                        <label className="form-label fw-semibold">{t('product_categories_label')}</label>
                        <div className="d-flex flex-wrap gap-1 mb-2">
                            {form.categories?.map(c => (
                                <Badge key={c} bg="secondary" className="d-flex align-items-center gap-1" style={{ cursor: 'pointer' }}>
                                    {c}
                                    <i className="bi bi-x" onClick={() => removeCategory(c)}></i>
                                </Badge>
                            ))}
                        </div>
                        <div className="d-flex gap-2">
                            <input
                                className="form-control form-control-sm"
                                style={{ maxWidth: '300px' }}
                                placeholder={t('add_category_placeholder')}
                                value={catInput}
                                onChange={e => setCatInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && addCategory()}
                            />
                            <Button variant="outline-secondary" size="sm" onClick={addCategory}>{t('add_button')}</Button>
                        </div>
                        <div className="text-muted mt-1" style={{ fontSize: '11px' }}>{t('categories_help_text')}</div>
                    </div>
                </div>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="outline-secondary" size="sm" onClick={onClose}>{t('cancel')}</Button>
                <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
                    {saving ? <Spinner animation="border" size="sm" className="me-1" /> : null}
                    {form.id ? t('save_changes') : t('add_supplier')}
                </Button>
            </Modal.Footer>
        </Modal>
    );
}

export default function RFQSuppliersIndex({ showToastMessage }) {
    const { t } = useTranslation('common');
    const storeId = localStorage.getItem("store_id");
    const token = localStorage.getItem("access_token");
    // eslint-disable-next-line no-unused-vars
    const history = useHistory();

    const [list, setList] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [pageSize] = useState(10);
    const [search, setSearch] = useState("");
    const [editingSupplier, setEditingSupplier] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [chatModal, setChatModal] = useState({ type: null, value: '' });
    const [deleting, setDeleting] = useState(null);
    const [refetching, setRefetching] = useState(null);
    const [backfilling, setBackfilling] = useState(false);
    const [backfillingEmails, setBackfillingEmails] = useState(false);

    const fetchList = useCallback(async ({ silent = false } = {}) => {
        if (!storeId) return;
        if (!silent) setIsLoading(true);
        const scrollY = window.scrollY;
        const params = new URLSearchParams({ store_id: storeId, page, limit: pageSize });
        if (search) params.set("search", search);
        try {
            const res = await fetch(`/v1/rfq-suppliers?${params}`, { headers: { Authorization: token } });
            const data = await res.json();
            setList(data.items || []);
            setTotalCount(data.total_count || 0);
            setTotalPages(Math.ceil((data.total_count || 0) / pageSize));
        } catch (e) {
            if (showToastMessage) showToastMessage(t('error_load_suppliers') + e.message, "danger");
        }
        if (!silent) setIsLoading(false);
        if (silent) requestAnimationFrame(() => window.scrollTo(0, scrollY));
    }, [storeId, token, page, pageSize, search, showToastMessage, t]);

    useEffect(() => { fetchList(); }, [fetchList]);

    // Realtime updates via SSE
    useEffect(() => {
        if (!storeId) return;
        const es = new EventSource(`/v1/rfq-bot/events?store_id=${storeId}`);
        es.addEventListener('supplier_updated', () => fetchList({ silent: true }));
        es.onerror = () => {}; // silently reconnect
        return () => es.close();
    }, [storeId, fetchList]);

    const handleRefetchMaps = async (id) => {
        setRefetching(id);
        try {
            const res = await fetch(`/v1/rfq-suppliers/${id}/refetch-maps?store_id=${storeId}`, {
                method: 'POST',
                headers: { Authorization: token },
            });
            const data = await res.json();
            if (!res.ok) {
                if (showToastMessage) showToastMessage(data.error || t('error_prefix'), "danger");
            } else if (data.status === 'no_match') {
                if (showToastMessage) showToastMessage(t('maps_no_match') || 'No Google Maps result found', "warning");
            } else {
                if (showToastMessage) showToastMessage(t('maps_refetched') || 'Google Maps data updated', "success");
                fetchList({ silent: true });
            }
        } catch (e) {
            if (showToastMessage) showToastMessage(t('error_prefix') + e.message, "danger");
        }
        setRefetching(null);
    };

    const handleDelete = async (id) => {
        if (!window.confirm(t('delete_supplier_confirm'))) return;
        setDeleting(id);
        try {
            const res = await fetch(`/v1/rfq-suppliers/${id}?store_id=${storeId}`, {
                method: 'DELETE',
                headers: { Authorization: token },
            });
            const data = await res.json();
            if (data.success) {
                if (showToastMessage) showToastMessage(t('supplier_deleted'), "success");
                fetchList();
            }
        } catch (e) {
            if (showToastMessage) showToastMessage(t('error_prefix') + e.message, "danger");
        }
        setDeleting(null);
    };

    return (
        <div style={{ padding: '20px' }}>
            {/* Header */}
            <div className="d-flex align-items-center justify-content-between mb-4">
                <div className="d-flex align-items-center gap-3">
                    <i className="bi bi-building-fill text-primary" style={{ fontSize: '1.5rem' }}></i>
                    <div>
                        <h5 className="mb-0 fw-semibold">{t('rfq_suppliers_title')}</h5>
                        <small className="text-muted">{t('rfq_suppliers_subtitle')}</small>
                    </div>
                </div>
                <div className="d-flex align-items-center gap-2">
                    <input
                        className="form-control form-control-sm"
                        style={{ width: '220px' }}
                        placeholder={t('search_suppliers_placeholder')}
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                    />
                    <Button variant="outline-secondary" size="sm" onClick={fetchList} title={t('refresh')}>
                        <i className="bi bi-arrow-clockwise"></i>
                    </Button>
                    <Button
                        variant="outline-info"
                        size="sm"
                        disabled={backfilling}
                        title="Fill missing Market values using Google Maps"
                        onClick={async () => {
                            setBackfilling(true);
                            try {
                                const res = await fetch(`/v1/rfq-suppliers/backfill-markets?store_id=${storeId}`, { method: 'POST', headers: { Authorization: token } });
                                const data = await res.json();
                                if (data.error) { if (showToastMessage) showToastMessage(data.error, 'danger'); }
                                else { if (showToastMessage) showToastMessage(`Markets filled: ${data.updated} updated, ${data.skipped} skipped, ${data.failed} failed`, 'success'); fetchList({ silent: true }); }
                            } catch (e) { if (showToastMessage) showToastMessage('Fill markets error: ' + e.message, 'danger'); }
                            setBackfilling(false);
                        }}
                    >
                        {backfilling ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="bi bi-geo-alt me-1"></i>}
                        Fill Markets
                    </Button>
                    <Button
                        variant="outline-success"
                        size="sm"
                        disabled={backfillingEmails}
                        title="Crawl supplier websites and save missing email addresses"
                        onClick={async () => {
                            setBackfillingEmails(true);
                            try {
                                const res = await fetch(`/v1/rfq-suppliers/backfill-emails?store_id=${storeId}`, { method: 'POST', headers: { Authorization: token } });
                                const data = await res.json();
                                if (data.error) { if (showToastMessage) showToastMessage(data.error, 'danger'); }
                                else { if (showToastMessage) showToastMessage(`Email crawl started for ${data.queued} supplier(s) with websites. Results appear within a minute.`, 'success'); }
                            } catch (e) { if (showToastMessage) showToastMessage('Backfill emails error: ' + e.message, 'danger'); }
                            setBackfillingEmails(false);
                        }}
                    >
                        {backfillingEmails ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="bi bi-envelope-at me-1"></i>}
                        Backfill Emails
                    </Button>
                    <Button variant="primary" size="sm" onClick={() => { setEditingSupplier(null); setShowForm(true); }}>
                        <i className="bi bi-plus-lg me-1"></i>{t('add_supplier')}
                    </Button>
                </div>
            </div>

            <div className="alert alert-info py-2 px-3 small mb-3">
                <i className="bi bi-info-circle me-1"></i>
                {t('rfq_suppliers_info_text1')} <strong>{t('product_categories_label')}</strong>{t('rfq_suppliers_info_text2')}
            </div>

            {/* Table */}
            {isLoading ? (
                <div className="text-center py-5"><Spinner animation="border" /></div>
            ) : list.length === 0 ? (
                <div className="text-center py-5 text-muted">
                    <i className="bi bi-building" style={{ fontSize: '3rem', display: 'block', marginBottom: '12px' }}></i>
                    {t('no_suppliers_yet')}
                </div>
            ) : (
                <>
                <div className="d-flex justify-content-between align-items-center mb-2">
                    <small className="text-muted">
                        Showing {((page - 1) * pageSize + 1).toLocaleString()}–{Math.min(page * pageSize, totalCount).toLocaleString()} of {totalCount.toLocaleString()} | Page {page} of {totalPages.toLocaleString()}
                    </small>
                </div>
                <div className="table-responsive">
                    <table className="table table-hover table-sm align-middle">
                        <thead className="table-light">
                            <tr>
                                <th style={{ whiteSpace: 'nowrap', width: '90px' }}>{t('ID')}</th>
                                <th>{t('col_supplier')}</th>
                                <th><i className="bi bi-whatsapp text-success me-1"></i>{t('col_whatsapp')}</th>
                                <th>{t('col_categories')}</th>
                                <th>{t('col_rating')}</th>
                                <th>{t('purchase_market_col')}</th>
                                <th>{t('col_address')}</th>
                                <th>Email</th>
                                <th>{t('col_status')}</th>
                                <th style={{ whiteSpace: 'nowrap' }}>Created At</th>
                                <th style={{ width: 90 }}>{t('col_actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {list.map((sup, idx) => (
                                <tr key={sup.id}>
                                    <td style={{ fontSize: '11px', color: '#6c757d', whiteSpace: 'nowrap', textAlign: 'center' }}>
                                        {sup.code
                                            ? <div style={{ fontWeight: 700, fontSize: '12px', color: '#1a56db', letterSpacing: '0.02em' }}>{sup.code}</div>
                                            : <div style={{ fontWeight: 600, color: '#aaa' }}>{idx + 1}</div>
                                        }
                                        <button
                                            className="btn btn-link btn-sm p-0"
                                            style={{ fontSize: '10px', color: '#aaa' }}
                                            title={sup.code ? 'Copy Serial ID' : 'Copy ID'}
                                            onClick={() => navigator.clipboard.writeText(sup.code || sup.id)}
                                        >
                                            <i className="bi bi-clipboard" style={{ fontSize: '9px' }}></i>
                                        </button>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                                            <span className="fw-semibold" style={{ fontSize: '13px' }}>{sup.name}</span>
                                            {sup.phone && (
                                                <button type="button" title="Open WhatsApp Conversation"
                                                    onClick={() => setChatModal({ type: 'whatsapp', value: sup.phone.replace(/^\+/, '') })}
                                                    style={{ border: 'none', background: 'none', padding: '0 2px', cursor: 'pointer', fontSize: 13, color: '#25d366', lineHeight: 1 }}>
                                                    <i className="bi bi-whatsapp"></i>
                                                </button>
                                            )}
                                            {sup.email && (
                                                <button type="button" title="Open Email Conversation"
                                                    onClick={() => setChatModal({ type: 'email', value: sup.email })}
                                                    style={{ border: 'none', background: 'none', padding: '0 2px', cursor: 'pointer', fontSize: 13, color: '#0d6efd', lineHeight: 1 }}>
                                                    <i className="bi bi-envelope-fill"></i>
                                                </button>
                                            )}
                                        </div>
                                        {sup.website && (
                                            <a href={sup.website} target="_blank" rel="noreferrer" className="text-muted small">
                                                <i className="bi bi-globe me-1"></i>{new URL(sup.website.startsWith('http') ? sup.website : 'https://' + sup.website).hostname}
                                            </a>
                                        )}
                                        {sup.google_maps_url && (
                                            <div style={{ fontSize: '11px', marginTop: '2px' }}>
                                                <a href={sup.google_maps_url} target="_blank" rel="noreferrer" className="text-primary me-1">
                                                    <i className="bi bi-google me-1"></i>{t('via_maps')}
                                                </a>
                                                <button
                                                    type="button"
                                                    className="btn btn-link btn-sm p-0"
                                                    style={{ fontSize: '11px', verticalAlign: 'baseline' }}
                                                    title="Copy Maps link"
                                                    onClick={() => { navigator.clipboard.writeText(sup.google_maps_url); }}
                                                >
                                                    <i className="bi bi-clipboard"></i>
                                                </button>
                                            </div>
                                        )}
                                        {sup.google_place_id && !sup.google_maps_url && <div className="text-muted" style={{ fontSize: '11px' }}><i className="bi bi-google me-1"></i>{t('via_maps')}</div>}
                                    </td>
                                    <td>
                                        <a href={`https://wa.me/${sup.phone}`} target="_blank" rel="noreferrer" className="text-success small">
                                            <i className="bi bi-whatsapp me-1"></i>{sup.phone}
                                        </a>
                                        {sup.phone2 && (
                                            <div>
                                                <a href={`https://wa.me/${sup.phone2}`} target="_blank" rel="noreferrer" className="text-success small">
                                                    <i className="bi bi-whatsapp me-1"></i>{sup.phone2}
                                                </a>
                                            </div>
                                        )}
                                    </td>
                                    <td style={{ maxWidth: '220px' }}>
                                        {sup.categories?.length > 0
                                            ? sup.categories.slice(0, 4).map(c => <Badge key={c} bg="light" text="dark" className="me-1 mb-1 border" style={{ fontSize: '11px' }}>{c}</Badge>)
                                            : <span className="text-muted small">—</span>}
                                        {sup.categories?.length > 4 && <Badge bg="secondary" style={{ fontSize: '11px' }}>+{sup.categories.length - 4}</Badge>}
                                    </td>
                                    <td>
                                        {sup.rating > 0
                                            ? <span className="small"><i className="bi bi-star-fill text-warning me-1"></i>{sup.rating.toFixed(1)}</span>
                                            : <span className="text-muted small">—</span>}
                                    </td>
                                    <td>
                                        {sup.purchase_market
                                            ? <Badge bg="light" text="dark" className="border" style={{ fontSize: '11px' }}><i className="bi bi-geo-alt me-1 text-secondary"></i>{sup.purchase_market}</Badge>
                                            : <span className="text-muted small">—</span>}
                                    </td>
                                    <td style={{ maxWidth: '200px', fontSize: '12px', color: '#555' }}>
                                        {sup.address
                                            ? <span title={sup.address}>{sup.address.length > 50 ? sup.address.slice(0, 50) + '…' : sup.address}</span>
                                            : <span className="text-muted">—</span>}
                                    </td>
                                    <td style={{ fontSize: '12px' }}>
                                        {sup.email
                                            ? <a href={`mailto:${sup.email}`} className="text-decoration-none text-primary small">{sup.email}</a>
                                            : <span className="text-muted small">—</span>}
                                    </td>
                                    <td>
                                        {sup.is_active
                                            ? <Badge bg="success">{t('status_active')}</Badge>
                                            : <Badge bg="secondary">{t('status_inactive')}</Badge>}
                                    </td>
                                    <td style={{ fontSize: '12px', color: '#555', whiteSpace: 'nowrap' }}>
                                        {sup.added_at ? new Date(sup.added_at).toLocaleDateString() : <span className="text-muted">—</span>}
                                    </td>
                                    <td>
                                        <div className="d-flex gap-1">
                                            <Button variant="outline-primary" size="sm" title={t('edit')} onClick={() => { setEditingSupplier(sup); setShowForm(true); }}>
                                                <i className="bi bi-pencil"></i>
                                            </Button>
                                            <Button
                                                variant="outline-success"
                                                size="sm"
                                                title={t('refetch_maps') || 'Refetch from Google Maps'}
                                                onClick={() => handleRefetchMaps(sup.id)}
                                                disabled={refetching === sup.id}
                                            >
                                                {refetching === sup.id ? <Spinner animation="border" size="sm" /> : <i className="bi bi-google"></i>}
                                            </Button>
                                            <Button
                                                variant="outline-danger"
                                                size="sm"
                                                title={t('delete')}
                                                onClick={() => handleDelete(sup.id)}
                                                disabled={deleting === sup.id}
                                            >
                                                {deleting === sup.id ? <Spinner animation="border" size="sm" /> : <i className="bi bi-trash"></i>}
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
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

            {/* Add/Edit Form Modal */}
            {showForm && (
                <SupplierForm
                    supplier={editingSupplier}
                    onClose={() => { setShowForm(false); setEditingSupplier(null); }}
                    onSave={() => { setShowForm(false); setEditingSupplier(null); fetchList(); if (showToastMessage) showToastMessage(t('supplier_saved'), "success"); }}
                />
            )}
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
        </div>
    );
}
