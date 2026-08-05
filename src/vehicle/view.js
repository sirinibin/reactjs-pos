import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { useTranslation } from 'react-i18next';
import { Modal, Spinner, Dropdown } from "react-bootstrap";
import { ObjectToSearchQueryParams } from '../utils/queryUtils.js';
import RepairJobKanban from '../repair_job/kanban.js';
import RepairJobCardView from '../repair_job/card_view.js';
import QuotationType3Form from '../quotation/QuotationType3Form.js';
import OrderCreate from '../order/create.js';

function fmtDate(val) {
    if (!val) return '-';
    try { return new Date(val).toLocaleDateString(); } catch { return '-'; }
}
function fmtAmt(val) { return val != null ? parseFloat(val).toFixed(2) : '-'; }

const PER_PAGE = 10;
function Pagination({ page, total, perPage, onChange }) {
    const totalPages = Math.ceil(total / perPage);
    if (totalPages <= 1) return null;
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) pages.push(i);
        else if (pages[pages.length - 1] !== '…') pages.push('…');
    }
    const btn = (disabled, label, onClick) => (
        <button type="button" disabled={disabled} onClick={onClick}
            style={{ border: '1px solid #d1d5db', borderRadius: 4, background: disabled ? '#f9fafb' : '#fff', color: disabled ? '#9ca3af' : '#374151', padding: '3px 9px', fontSize: 12, cursor: disabled ? 'default' : 'pointer' }}>
            {label}
        </button>
    );
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4, padding: '8px 4px 2px' }}>
            <span style={{ fontSize: 12, color: '#6b7280', marginRight: 6 }}>
                {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} / {total}
            </span>
            {btn(page === 1, '‹', () => onChange(page - 1))}
            {pages.map((p, i) => p === '…'
                ? <span key={`e${i}`} style={{ fontSize: 12, color: '#9ca3af', padding: '0 2px' }}>…</span>
                : <button key={p} type="button" onClick={() => onChange(p)}
                    style={{ border: '1px solid ' + (p === page ? '#0052cc' : '#d1d5db'), borderRadius: 4, background: p === page ? '#0052cc' : '#fff', color: p === page ? '#fff' : '#374151', padding: '3px 9px', fontSize: 12, fontWeight: p === page ? 700 : 400, cursor: 'pointer', minWidth: 30 }}>{p}</button>
            )}
            {btn(page === totalPages, '›', () => onChange(page + 1))}
        </div>
    );
}

const HIST_TABS = [
    { key: 'repairs',    label: 'Repair Jobs',        icon: 'bi-tools',             color: '#e65100' },
    { key: 'sales',      label: 'Sales History',      icon: 'bi-receipt',           color: '#2e7d32' },
    { key: 'quotations', label: 'Quotation History',  icon: 'bi-file-earmark-text', color: '#1565c0' },
    { key: 'trello',     label: 'Repair Job Board',   icon: 'bi-kanban',            color: '#0052cc' },
];

const VehicleView = forwardRef((props, ref) => {
    const { t } = useTranslation('common');

    // ── Details modal ──
    let [formData, setFormData] = useState({});
    const [show, SetShow] = useState(false);

    // ── History modal ──
    const [histShow, setHistShow] = useState(false);
    const [histVehicle, setHistVehicle] = useState({});
    const [histTab, setHistTab] = useState('repairs');
    // null = not fetched yet; [] / [...] = fetched
    const [histData, setHistData] = useState({ sales: null, quotations: null, repairs: null });
    const [histLoading, setHistLoading] = useState(null); // tab key currently loading
    const [histPage, setHistPage] = useState(1);

    const vehicleIdRef = useRef(null);
    const cardViewRef = useRef();
    const qt3FormRef = useRef();
    const orderCreateRef = useRef();

    // Edit form refs for history tabs
    const histSalesCreateRef = useRef();
    const histQuotationFormRef = useRef();

    function refreshCurrentTab() { fetchHistTab(histTab); }

    async function buildJobPrefill(job, type) {
        const storeId = localStorage.getItem('store_id');
        const headers = { 'Content-Type': 'application/json', Authorization: localStorage.getItem('access_token') };
        const products = (job.parts || []).map(p => {
            const pQty = parseFloat(p.qty) || 1;
            const pUnitDisc = parseFloat(p.unit_discount) || 0;
            const pUnitDiscVat = parseFloat(p.unit_discount_with_vat) || 0;
            return {
                product_id: p.product_id || null, name: p.name || '',
                quantity: pQty,
                unit_price: parseFloat(p.unit_price) || 0,
                unit_price_with_vat: parseFloat(p.unit_price_with_vat) || 0,
                purchase_unit_price: parseFloat(p.purchase_unit_price) || 0,
                purchase_unit_price_with_vat: parseFloat(p.purchase_unit_price_with_vat) || 0,
                unit_discount: pUnitDisc, unit_discount_with_vat: pUnitDiscVat,
                line_discount_with_vat: parseFloat((pUnitDiscVat * pQty).toFixed(2)) || 0,
                unit: p.unit || '', is_service: false,
            };
        });
        const labour = parseFloat(job.labour_charge) || 0;
        if (labour > 0) {
            let labourProductId = null;
            try {
                const r = await fetch(`/v1/product?search[name]=Labour+Charge&search[is_service]=1&search[store_id]=${storeId}&limit=1&select=id,name`, { headers }).then(r => r.json());
                if (r?.result?.[0]) { labourProductId = r.result[0].id; }
                else { const c = await fetch(`/v1/product?search[store_id]=${storeId}`, { method: 'POST', headers, body: JSON.stringify({ name: 'Labour Charge', is_service: true, store_id: storeId }) }).then(r => r.json()); labourProductId = c?.result?.id || null; }
            } catch (e) {}
            const vatFactor = 1.15;
            products.push({ product_id: labourProductId, name: 'Labour Charge', quantity: 1, unit_price: parseFloat((labour / vatFactor).toFixed(4)), unit_price_with_vat: labour, purchase_unit_price: 0, purchase_unit_price_with_vat: 0, unit_discount: 0, unit_discount_with_vat: 0, unit: '', is_service: true });
        }
        return {
            type,
            customer_id: job.customer_id || null,
            customer_name: job.customer_name || '',
            customer: job.customer_id ? { id: job.customer_id, name: job.customer_name } : null,
            vehicle_id: job.vehicle_id || null,
            vehicle_snapshot: job.vehicle_id ? { vehicle_number: job.vehicle_number || '', brand: job.brand || '', model: job.model || '' } : undefined,
            vehicle: job.vehicle_id ? { id: job.vehicle_id, vehicle_number: job.vehicle_number, brand: job.brand, model: job.model } : null,
            km_driven: parseFloat(job.km) || null,
            products,
        };
    }

    useImperativeHandle(ref, () => ({
        open(id, tab) {
            if (tab && tab !== 'details') {
                // Open history modal directly — no details view
                vehicleIdRef.current = id;
                setHistVehicle({});
                setHistData({ sales: null, quotations: null, repairs: null });
                setHistTab(tab);
                setHistPage(1);
                setHistShow(true);
                fetchVehicleBasic(id);
                if (tab !== 'trello') fetchHistTab(tab, id);
            } else {
                // Open details view
                setHistShow(false);
                setHistData({ sales: null, quotations: null, repairs: null });
                vehicleIdRef.current = id;
                getVehicle(id);
                SetShow(true);
            }
        },
    }));

    function handleClose() { SetShow(false); }
    function handleHistClose() { setHistShow(false); setHistData({ sales: null, quotations: null, repairs: null }); }

    useEffect(() => {
        let at = localStorage.getItem("access_token");
        if (!at) { window.location = "/"; }
    });


    async function fetchVehicleBasic(id) {
        try {
            const headers = { 'Content-Type': 'application/json', Authorization: localStorage.getItem('access_token') };
            const storeId = localStorage.getItem('store_id') || '';
            const r = await fetch(`/v1/vehicle/${id}?search[store_id]=${storeId}&select=id,brand,model,variant,vehicle_number,year,customer_id,customer_name`, { headers }).then(r => r.json());
            if (r?.result) setHistVehicle(r.result);
        } catch(e) {}
    }

    function getVehicle(id) {
        const requestOptions = {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', 'Authorization': localStorage.getItem('access_token') },
        };
        let searchParams = {};
        if (localStorage.getItem("store_id")) { searchParams.store_id = localStorage.getItem("store_id"); }
        let queryParams = ObjectToSearchQueryParams(searchParams);
        fetch('/v1/vehicle/' + id + "?" + queryParams, requestOptions)
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();
                if (!response.ok) { return Promise.reject(data && data.errors); }
                formData = data.result;
                setFormData({ ...formData });
            })
            .catch(error => console.log(error));
    }

    async function fetchHistTab(tab, id) {
        const vid = id || vehicleIdRef.current;
        if (!vid) return;
        setHistLoading(tab);
        const storeId = localStorage.getItem('store_id') || '';
        const headers = { 'Content-Type': 'application/json', Authorization: localStorage.getItem('access_token') };
        const qs = `search[vehicle_id]=${vid}&search[store_id]=${storeId}&limit=200&sort=-date`;
        try {
            if (tab === 'sales') {
                const r = await fetch(`/v1/order?${qs}&select=id,code,date,customer_name,net_total,payment_status,km_driven`, { headers }).then(r => r.json());
                setHistData(h => ({ ...h, sales: r?.result || [] }));
            } else if (tab === 'quotations') {
                const r = await fetch(`/v1/quotation?${qs}&select=id,code,date,customer_name,net_total,type,km_driven`, { headers }).then(r => r.json());
                setHistData(h => ({ ...h, quotations: r?.result || [] }));
            } else if (tab === 'repairs') {
                const r = await fetch(`/v1/repair-job?search[vehicle_id]=${vid}&search[store_id]=${storeId}&limit=200&sort=-date_str&select=id,job_number,title,date,status,labour_charge,total,km`, { headers }).then(r => r.json());
                setHistData(h => ({ ...h, repairs: r?.result || [] }));
            }
        } catch(e) { console.error(e); }
        setHistLoading(null);
    }

    function handleHistTabClick(tab) {
        setHistTab(tab);
        setHistPage(1);
        if (tab !== 'trello' && !histData[tab]) {
            fetchHistTab(tab);
        }
    }

    // Open history modal from within the details view
    function openHistFromDetails(tab) {
        const vid = formData.id || vehicleIdRef.current;
        vehicleIdRef.current = vid;
        setHistVehicle(formData);
        setHistData({ sales: null, quotations: null, repairs: null });
        setHistTab(tab);
        setHistPage(1);
        setHistShow(true);
        if (tab !== 'trello') fetchHistTab(tab, vid);
    }

    const CARD = { background: '#ffffff', border: '1px solid #c3c6d7', borderRadius: '8px', padding: '24px', marginBottom: '20px' };
    const VALUE_BOX = { padding: '8px 12px', background: '#f0f2f4', borderRadius: '4px', fontSize: '14px', fontFamily: '"Inter", sans-serif', color: '#191c1e', minHeight: '34px' };
    const Label = ({ children }) => (
        <label style={{ display: 'block', fontFamily: '"Inter", sans-serif', fontSize: '11px', fontWeight: 600, color: '#54647a', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{children}</label>
    );
    const SectionTitle = ({ children, icon }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            {icon && <i className={`bi ${icon}`} style={{ fontSize: '18px', color: '#004ac6' }}></i>}
            <h3 style={{ fontFamily: '"Hanken Grotesk", sans-serif', fontSize: '16px', fontWeight: 600, color: '#191c1e', margin: 0 }}>{children}</h3>
        </div>
    );

    const thStyle = { padding: '8px 10px', fontWeight: 700, fontSize: 11, color: '#54647a', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' };
    const tdStyle = { padding: '8px 10px', fontSize: 13, borderBottom: '1px solid #f0f2f4', verticalAlign: 'middle' };

    const payBadge = (status) => {
        const m = { paid: ['#e8f5e9', '#2e7d32'], not_paid: ['#ffebee', '#c62828'], paid_partially: ['#fff3e0', '#e65100'] };
        const [bg, col] = m[status] || ['#f0f2f4', '#54647a'];
        return <span style={{ background: bg, color: col, borderRadius: 999, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{status?.replace(/_/g, ' ') || '-'}</span>;
    };

    const histVehicleTitle = [histVehicle.brand, histVehicle.model, histVehicle.variant].filter(Boolean).join(' ')
        || histVehicle.vehicle_number || '';

    const rows = histData[histTab];
    const pageRows = rows ? rows.slice((histPage - 1) * PER_PAGE, histPage * PER_PAGE) : null;
    const isLoading = histLoading === histTab;

    return (
        <>
            {/* ── Vehicle Details Modal ── */}
            <Modal show={show} fullscreen onHide={handleClose} animation={false} backdrop="static" dialogClassName="pw-modal">
                <Modal.Header style={{ background: '#ffffff', borderBottom: '1px solid #c3c6d7', padding: '10px 20px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button type="button" onClick={handleClose}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#434655', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 600, fontFamily: '"Inter", sans-serif', padding: '4px 8px', borderRadius: '4px' }}>
                        <i className="bi bi-arrow-left" style={{ fontSize: '16px' }}></i> {t('Back')}
                    </button>
                    <Modal.Title style={{ fontFamily: '"Hanken Grotesk", sans-serif', fontSize: '17px', fontWeight: 700, color: '#191c1e', flex: 1 }}>
                        {formData.brand} {formData.model} {formData.variant}
                        {formData.vehicle_number && <span style={{ marginLeft: 8, fontSize: 13, fontWeight: 500, color: '#6b7280' }}>— {formData.vehicle_number}</span>}
                    </Modal.Title>
                    <div className="d-flex align-items-center gap-2">
                        {props.openUpdateForm && (
                            <button type="button" style={{ background: '#d0e1fb', color: '#54647a', border: 'none', borderRadius: '4px', padding: '6px 14px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                                onClick={() => { handleClose(); props.openUpdateForm(formData.id); }}>
                                <i className="bi bi-pencil me-1"></i>{t('Edit')}
                            </button>
                        )}
                        {formData.id && (
                            <Dropdown align="end">
                                <Dropdown.Toggle variant="outline-secondary" size="sm" id="veh-view-hist" title={t('History')}>
                                    <i className="bi bi-clock-history"></i>
                                </Dropdown.Toggle>
                                <Dropdown.Menu style={{ minWidth: 200 }}>
                                    <Dropdown.Item onClick={() => openHistFromDetails('repairs')}>
                                        <i className="bi bi-tools me-2 text-warning"></i>{t('Repair Jobs')}
                                    </Dropdown.Item>
                                    <Dropdown.Divider />
                                    <Dropdown.Item onClick={() => openHistFromDetails('sales')}>
                                        <i className="bi bi-receipt me-2 text-success"></i>{t('Sales History')}
                                    </Dropdown.Item>
                                    <Dropdown.Item onClick={() => openHistFromDetails('quotations')}>
                                        <i className="bi bi-file-earmark-text me-2 text-info"></i>{t('Quotation History')}
                                    </Dropdown.Item>
                                    <Dropdown.Divider />
                                    <Dropdown.Item onClick={() => openHistFromDetails('trello')}>
                                        <i className="bi bi-kanban me-2" style={{ color: '#0052cc' }}></i>{t('Repair Job Board')}
                                    </Dropdown.Item>
                                </Dropdown.Menu>
                            </Dropdown>
                        )}
                        <button type="button" className="btn-close ms-1" onClick={handleClose} />
                    </div>
                </Modal.Header>

                <style>{`
                    .pw-modal .modal-content { display: flex; flex-direction: column; height: 100%; }
                    .pw-body { padding: 0 !important; overflow: hidden !important; display: flex !important; flex-direction: column !important; flex: 1 !important; min-height: 0 !important; }
                `}</style>

                <Modal.Body className="pw-body">
                    <div style={{ flex: 1, overflow: 'auto', padding: '24px 32px', background: '#f7f9fb' }}>
                        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                            <div style={CARD}>
                                <SectionTitle icon="bi-person">{t('Customer')}</SectionTitle>
                                <div className="row g-3">
                                    <div className="col-12"><Label>{t('Customer Name')}</Label><div style={VALUE_BOX}>{formData.customer_name || '-'}</div></div>
                                </div>
                            </div>
                            <div style={CARD}>
                                <SectionTitle icon="bi-car-front">{t('Vehicle Identification')}</SectionTitle>
                                <div className="row g-3">
                                    <div className="col-md-4"><Label>{t('Brand')}</Label><div style={VALUE_BOX}>{formData.brand || '-'}</div></div>
                                    <div className="col-md-4"><Label>{t('Model')}</Label><div style={VALUE_BOX}>{formData.model || '-'}</div></div>
                                    <div className="col-md-4"><Label>{t('Variant')}</Label><div style={VALUE_BOX}>{formData.variant || '-'}</div></div>
                                    <div className="col-md-4"><Label>{t('Manufacture Year')}</Label><div style={VALUE_BOX}>{formData.year || '-'}</div></div>
                                    <div className="col-md-4"><Label>{t('Color')}</Label><div style={VALUE_BOX}>{formData.color || '-'}</div></div>
                                    <div className="col-md-4"><Label>{t('Current KM')}</Label><div style={VALUE_BOX}>{formData.current_km ? parseFloat(formData.current_km).toLocaleString() : '-'}</div></div>
                                </div>
                            </div>
                            <div style={CARD}>
                                <SectionTitle icon="bi-file-earmark-text">{t('Registration & Technical')}</SectionTitle>
                                <div className="row g-3">
                                    <div className="col-md-6"><Label>{t('Vehicle Number (Plate)')}</Label><div style={VALUE_BOX}>{formData.vehicle_number || '-'}</div></div>
                                    <div className="col-md-6"><Label>{t('Istimara No.')}</Label><div style={VALUE_BOX}>{formData.istimara_no || '-'}</div></div>
                                    <div className="col-md-6"><Label>{t('Chassis Number')}</Label><div style={VALUE_BOX}>{formData.chassis_number || '-'}</div></div>
                                    <div className="col-md-6"><Label>{t('Engine Number')}</Label><div style={VALUE_BOX}>{formData.engine_number || '-'}</div></div>
                                </div>
                            </div>
                            {formData.remarks && (
                                <div style={CARD}>
                                    <SectionTitle icon="bi-chat-square-text">{t('Remarks')}</SectionTitle>
                                    <div style={VALUE_BOX}>{formData.remarks}</div>
                                </div>
                            )}
                        </div>
                    </div>
                </Modal.Body>
            </Modal>

            {/* ── Vehicle History Modal (standalone, no details behind) ── */}
            <Modal show={histShow} size="xl" onHide={handleHistClose} animation={false} backdrop="static" scrollable>
                <Modal.Header style={{ background: '#ffffff', borderBottom: '1px solid #c3c6d7', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Modal.Title style={{ fontFamily: '"Hanken Grotesk", sans-serif', fontSize: '16px', fontWeight: 700, color: '#191c1e', flex: 1 }}>
                        <i className="bi bi-clock-history me-2 text-secondary"></i>{t('Vehicle History')}
                        {histVehicleTitle && (
                            <span style={{ marginLeft: 10, fontSize: 13, fontWeight: 500, color: '#6b7280' }}>
                                — {histVehicleTitle}
                                {histVehicle.vehicle_number && histVehicleTitle !== histVehicle.vehicle_number && ` (${histVehicle.vehicle_number})`}
                            </span>
                        )}
                    </Modal.Title>
                    <button type="button" className="btn-close" onClick={handleHistClose} />
                </Modal.Header>

                {/* Sub-tab bar — pill style */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: '#f4f6f8', borderBottom: '1px solid #e2e8f0', padding: '10px 20px', flexShrink: 0, flexWrap: 'wrap' }}>
                    {HIST_TABS.map(tab => {
                        const isActive = histTab === tab.key;
                        const count = histData[tab.key];
                        return (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => handleHistTabClick(tab.key)}
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 7,
                                    padding: '7px 16px', borderRadius: 999, border: 'none',
                                    cursor: 'pointer', whiteSpace: 'nowrap',
                                    fontSize: 13, fontWeight: isActive ? 700 : 500,
                                    background: isActive ? tab.color : '#ffffff',
                                    color: isActive ? '#ffffff' : '#4b5563',
                                    boxShadow: isActive ? `0 2px 8px ${tab.color}55` : '0 1px 3px rgba(0,0,0,0.08)',
                                    transition: 'all 0.18s ease',
                                    outline: 'none',
                                }}
                            >
                                <i className={`bi ${tab.icon}`} style={{ fontSize: 13, color: isActive ? '#fff' : tab.color }}></i>
                                {t(tab.label)}
                                {count != null && (
                                    <span style={{
                                        background: isActive ? 'rgba(255,255,255,0.25)' : '#f0f2f4',
                                        color: isActive ? '#fff' : '#6b7280',
                                        borderRadius: 999, padding: '1px 7px',
                                        fontSize: 11, fontWeight: 700, lineHeight: 1.4,
                                    }}>
                                        {count?.length || 0}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                <Modal.Body style={histTab === 'trello' ? { padding: 0, height: '65vh', overflowY: 'auto' } : { padding: 0, minHeight: 300 }}>

                    {/* REPAIR JOB BOARD — full-height embedded kanban */}
                    {histTab === 'trello' && (
                        histVehicle.id ? (
                            <RepairJobKanban
                                embedded
                                presetVehicleId={histVehicle.id}
                                presetVehicleLabel={[histVehicle.vehicle_number, histVehicle.brand, histVehicle.model].filter(Boolean).join(' — ')}
                                presetCustomerId={histVehicle.customer_id}
                                presetCustomerName={histVehicle.customer_name}
                                onOpenCard={(jobId) => cardViewRef.current?.open(jobId, 1300)}
                            />
                        ) : (
                            <div style={{ padding: 48, textAlign: 'center' }}><Spinner animation="border" size="sm" /></div>
                        )
                    )}

                    {isLoading && histTab !== 'trello' ? (
                        <div style={{ padding: 48, textAlign: 'center' }}><Spinner animation="border" size="sm" /></div>
                    ) : histTab !== 'trello' && (
                        <div style={{ overflowX: 'auto' }}>

                            {/* REPAIRS */}
                            {histTab === 'repairs' && (
                                <table className="table table-sm mb-0" style={{ minWidth: 750 }}>
                                    <thead><tr style={{ background: '#f7f9fb' }}>
                                        <th style={thStyle}>{t('Job #')}</th>
                                        <th style={thStyle}>{t('Title')}</th>
                                        <th style={thStyle}>{t('Date')}</th>
                                        <th style={thStyle}>{t('Km')}</th>
                                        <th style={thStyle}>{t('Status')}</th>
                                        <th style={{ ...thStyle, textAlign: 'right' }}>{t('Labour')}</th>
                                        <th style={{ ...thStyle, textAlign: 'right' }}>{t('Total')}</th>
                                        <th style={thStyle}></th>
                                    </tr></thead>
                                    <tbody>
                                        {!rows || rows.length === 0 ? (
                                            <tr><td colSpan={8} style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>{t('No repair jobs found')}</td></tr>
                                        ) : (pageRows || []).map(r => (
                                            <tr key={r.id}>
                                                <td style={tdStyle}><span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12 }}>{r.job_number || '-'}</span></td>
                                                <td style={tdStyle}>{r.title || '-'}</td>
                                                <td style={tdStyle}>{fmtDate(r.date)}</td>
                                                <td style={tdStyle}>{r.km != null ? parseFloat(r.km).toLocaleString() + ' km' : '-'}</td>
                                                <td style={tdStyle}><span style={{ fontSize: 11, fontWeight: 700, background: '#f0f4ff', color: '#004ac6', borderRadius: 4, padding: '2px 8px' }}>{r.status || '-'}</span></td>
                                                <td style={{ ...tdStyle, textAlign: 'right' }}>{fmtAmt(r.labour_charge)}</td>
                                                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{fmtAmt(r.total)}</td>
                                                <td style={tdStyle}>
                                                    <button type="button" onClick={() => props.onOpenJobCard ? props.onOpenJobCard(r.id) : cardViewRef.current?.open(r.id, 1300)}
                                                        style={{ background: '#d0e1fb', color: '#1e40af', border: 'none', borderRadius: 4, padding: '3px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                                        <i className="bi bi-pencil me-1"></i>{t('Edit')}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {/* SALES */}
                            {histTab === 'sales' && (
                                <table className="table table-sm mb-0" style={{ minWidth: 750 }}>
                                    <thead><tr style={{ background: '#f7f9fb' }}>
                                        <th style={thStyle}>{t('Code')}</th>
                                        <th style={thStyle}>{t('Date')}</th>
                                        <th style={thStyle}>{t('Customer')}</th>
                                        <th style={thStyle}>{t('Km Driven')}</th>
                                        <th style={{ ...thStyle, textAlign: 'right' }}>{t('Total')}</th>
                                        <th style={thStyle}>{t('Payment')}</th>
                                        <th style={thStyle}></th>
                                    </tr></thead>
                                    <tbody>
                                        {!rows || rows.length === 0 ? (
                                            <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>{t('No sales found')}</td></tr>
                                        ) : (pageRows || []).map(r => (
                                            <tr key={r.id}>
                                                <td style={tdStyle}><span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12 }}>{r.code || '-'}</span></td>
                                                <td style={tdStyle}>{fmtDate(r.date)}</td>
                                                <td style={tdStyle}>{r.customer_name || '-'}</td>
                                                <td style={tdStyle}>{r.km_driven != null ? parseFloat(r.km_driven).toLocaleString() + ' km' : '-'}</td>
                                                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{fmtAmt(r.net_total)}</td>
                                                <td style={tdStyle}>{payBadge(r.payment_status)}</td>
                                                <td style={tdStyle}>
                                                    <button type="button" onClick={() => histSalesCreateRef.current?.openAsType5(r.id)}
                                                        style={{ background: '#d0e1fb', color: '#1e40af', border: 'none', borderRadius: 4, padding: '3px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                                        <i className="bi bi-pencil me-1"></i>{t('Edit')}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {/* QUOTATIONS */}
                            {histTab === 'quotations' && (
                                <table className="table table-sm mb-0" style={{ minWidth: 750 }}>
                                    <thead><tr style={{ background: '#f7f9fb' }}>
                                        <th style={thStyle}>{t('Code')}</th>
                                        <th style={thStyle}>{t('Date')}</th>
                                        <th style={thStyle}>{t('Customer')}</th>
                                        <th style={thStyle}>{t('Type')}</th>
                                        <th style={thStyle}>{t('Km Driven')}</th>
                                        <th style={{ ...thStyle, textAlign: 'right' }}>{t('Total')}</th>
                                        <th style={thStyle}></th>
                                    </tr></thead>
                                    <tbody>
                                        {!rows || rows.length === 0 ? (
                                            <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>{t('No quotations found')}</td></tr>
                                        ) : (pageRows || []).map(r => (
                                            <tr key={r.id}>
                                                <td style={tdStyle}><span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12 }}>{r.code || '-'}</span></td>
                                                <td style={tdStyle}>{fmtDate(r.date)}</td>
                                                <td style={tdStyle}>{r.customer_name || '-'}</td>
                                                <td style={tdStyle}><span style={{ fontSize: 11, fontWeight: 700, background: r.type === 'invoice' ? '#e8f5e9' : '#e3f2fd', color: r.type === 'invoice' ? '#2e7d32' : '#1565c0', borderRadius: 4, padding: '2px 8px' }}>{r.type || 'quotation'}</span></td>
                                                <td style={tdStyle}>{r.km_driven != null ? parseFloat(r.km_driven).toLocaleString() + ' km' : '-'}</td>
                                                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{fmtAmt(r.net_total)}</td>
                                                <td style={tdStyle}>
                                                    <button type="button" onClick={() => histQuotationFormRef.current?.open(r.id, null)}
                                                        style={{ background: '#d0e1fb', color: '#1e40af', border: 'none', borderRadius: 4, padding: '3px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                                        <i className="bi bi-pencil me-1"></i>{t('Edit')}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {rows && rows.length > PER_PAGE && (
                                <Pagination page={histPage} total={rows.length} perPage={PER_PAGE} onChange={setHistPage} />
                            )}
                        </div>
                    )}
                </Modal.Body>
            </Modal>
        <>
            {!props.noRepairJobBoard && <>
                <RepairJobCardView
                    ref={cardViewRef}
                    showToastMessage={props.showToastMessage}
                    onFullEdit={props.onOpenRepairJobUpdate}
                    onCreateSalesInvoice={async (job) => { const p = await buildJobPrefill(job, 'invoice'); orderCreateRef.current?.openWithPrefill(p); }}
                    onCreateQuotation={async (job) => { const p = await buildJobPrefill(job, 'quotation'); qt3FormRef.current?.open(null, p); }}
                />
                <QuotationType3Form ref={qt3FormRef} refreshList={() => {}} showToastMessage={props.showToastMessage} openDetailsView={() => {}} />
                <OrderCreate ref={orderCreateRef} refreshList={() => {}} showToastMessage={props.showToastMessage} openDetailsView={() => {}} />
            </>}
            <OrderCreate ref={histSalesCreateRef} refreshList={refreshCurrentTab} showToastMessage={props.showToastMessage} openDetailsView={() => {}} />
            <QuotationType3Form ref={histQuotationFormRef} apiBase="/v1/quotation" refreshList={refreshCurrentTab} showToastMessage={props.showToastMessage} openDetailsView={() => {}} />
        </>
</>
    );
});

export default VehicleView;
