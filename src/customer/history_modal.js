import React, { useState, useRef, forwardRef, useImperativeHandle } from "react";
import { Modal, Spinner } from "react-bootstrap";
import { useTranslation } from 'react-i18next';
import RepairJobCreate from '../repair_job/create.js';
import RepairJobKanban from '../repair_job/kanban.js';
import VehicleCreate from '../vehicle/create.js';
import OrderCreate from '../order/create.js';
import SalesReturnCreate from '../sales_return/create.js';
import QuotationType3Form from '../quotation/QuotationType3Form.js';

function fmtDate(val) {
    if (!val) return '-';
    try { return new Date(val).toLocaleDateString(); } catch { return '-'; }
}
function fmtAmt(val) { return val != null ? parseFloat(val).toFixed(2) : '-'; }

const HIST_TABS = [
    { key: 'repairs',               label: 'Repair Jobs',               icon: 'bi-tools',               color: '#e65100' },
    { key: 'trello',                label: 'Repair Job Board',          icon: 'bi-kanban',              color: '#0052cc' },
    { key: 'vehicles',              label: 'Vehicles',                  icon: 'bi-car-front',            color: '#546e7a' },
    { key: 'sales',                 label: 'Sales History',             icon: 'bi-receipt',              color: '#2e7d32' },
    { key: 'sales_returns',         label: 'Sales Return History',      icon: 'bi-receipt-cutoff',       color: '#b45309' },
    { key: 'quotations',            label: 'Quotation History',         icon: 'bi-file-earmark-text',    color: '#1565c0' },
    { key: 'non_vat_sales',         label: 'Non VAT Sales History',     icon: 'bi-file-earmark-minus',   color: '#6b21a8' },
    { key: 'non_vat_sales_returns', label: 'Non VAT Return History',    icon: 'bi-arrow-return-left',    color: '#9d174d' },
];

const thS = { padding: '8px 10px', fontWeight: 700, fontSize: 11, color: '#54647a', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' };
const tdS = { padding: '8px 10px', fontSize: 13, borderBottom: '1px solid #f0f2f4', verticalAlign: 'middle' };
const editBtn = { background: '#d0e1fb', color: '#1e40af', border: 'none', borderRadius: 4, padding: '3px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' };

const payBadge = (status) => {
    const m = { paid: ['#e8f5e9', '#2e7d32'], not_paid: ['#ffebee', '#c62828'], paid_partially: ['#fff3e0', '#e65100'] };
    const [bg, col] = m[status] || ['#f0f2f4', '#54647a'];
    return <span style={{ background: bg, color: col, borderRadius: 999, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{status?.replace(/_/g, ' ') || '-'}</span>;
};

const EMPTY = { repairs: null, vehicles: null, sales: null, sales_returns: null, quotations: null, non_vat_sales: null, non_vat_sales_returns: null };
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

const CustomerHistoryModal = forwardRef((props, ref) => {
    const { t } = useTranslation('common');
    const [show, setShow] = useState(false);
    const [histTab, setHistTab] = useState('repairs');
    const [histData, setHistData] = useState(EMPTY);
    const [histLoading, setHistLoading] = useState(null);
    const [histPage, setHistPage] = useState(1);
    const [customerName, setCustomerName] = useState('');
    const customerIdRef = useRef(null);

    // Edit form refs
    const repairJobCreateRef = useRef();
    const vehicleCreateRef = useRef();
    const orderCreateRef = useRef();
    const salesReturnCreateRef = useRef();
    const quotationFormRef = useRef();
    const nonVatSalesFormRef = useRef();
    const nonVatSalesReturnFormRef = useRef();

    useImperativeHandle(ref, () => ({
        open(customerId, tab) {
            customerIdRef.current = customerId;
            setHistData({ ...EMPTY });
            setHistTab(tab || 'repairs');
            setHistPage(1);
            setCustomerName('');
            setShow(true);
            fetchBasicCustomer(customerId);
            fetchHistTab(tab || 'repairs', customerId);
        },
    }));

    function handleClose() { setShow(false); setHistData({ ...EMPTY }); }

    async function fetchBasicCustomer(id) {
        try {
            const storeId = localStorage.getItem('store_id') || '';
            const r = await fetch(`/v1/customer/${id}?search[store_id]=${storeId}&select=id,name`, {
                headers: { Authorization: localStorage.getItem('access_token') }
            }).then(r => r.json());
            if (r?.result?.name) setCustomerName(r.result.name);
        } catch (e) {}
    }

    async function fetchHistTab(tab, id) {
        if (tab === 'trello') return;
        const cid = id || customerIdRef.current;
        if (!cid) return;
        setHistLoading(tab);
        const storeId = localStorage.getItem('store_id') || '';
        const headers = { Authorization: localStorage.getItem('access_token') };
        const base = `search[customer_id]=${cid}&search[store_id]=${storeId}&limit=200&sort=-date_str`;
        try {
            if (tab === 'repairs') {
                const r = await fetch(`/v1/repair-job?search[customer_id]=${cid}&search[store_id]=${storeId}&limit=200&sort=-date_str&select=id,job_number,title,date_str,status,labour_charge,total,total_with_vat,km`, { headers }).then(r => r.json());
                setHistData(h => ({ ...h, repairs: r?.result || [] }));
            } else if (tab === 'vehicles') {
                const r = await fetch(`/v1/vehicle?search[customer_id]=${cid}&search[store_id]=${storeId}&limit=200&sort=-created_at&select=id,vehicle_number,brand,model,variant,year,color,chassis_number,istimara_no,current_km`, { headers }).then(r => r.json());
                setHistData(h => ({ ...h, vehicles: r?.result || [] }));
            } else if (tab === 'sales') {
                const r = await fetch(`/v1/order?${base}&select=id,code,date_str,customer_name,net_total,payment_status,km_driven,vehicle_number,brand,model`, { headers }).then(r => r.json());
                setHistData(h => ({ ...h, sales: r?.result || [] }));
            } else if (tab === 'sales_returns') {
                const r = await fetch(`/v1/sales-return?${base}&select=id,code,date_str,customer_name,net_total,payment_status,vehicle_number,brand,model`, { headers }).then(r => r.json());
                setHistData(h => ({ ...h, sales_returns: r?.result || [] }));
            } else if (tab === 'quotations') {
                const r = await fetch(`/v1/quotation?${base}&select=id,code,date_str,customer_name,net_total,type,km_driven,vehicle_number,brand,model`, { headers }).then(r => r.json());
                setHistData(h => ({ ...h, quotations: r?.result || [] }));
            } else if (tab === 'non_vat_sales') {
                const r = await fetch(`/v1/non-vat-sales?${base}&select=id,code,date_str,customer_name,net_total,payment_status,km_driven,vehicle_number,brand,model`, { headers }).then(r => r.json());
                setHistData(h => ({ ...h, non_vat_sales: r?.result || [] }));
            } else if (tab === 'non_vat_sales_returns') {
                const r = await fetch(`/v1/non-vat-sales-return?${base}&select=id,code,date_str,customer_name,net_total,payment_status,vehicle_number,brand,model`, { headers }).then(r => r.json());
                setHistData(h => ({ ...h, non_vat_sales_returns: r?.result || [] }));
            }
        } catch (e) { console.error(e); }
        setHistLoading(null);
    }

    function handleTabClick(tab) {
        setHistTab(tab);
        setHistPage(1);
        if (!histData[tab]) fetchHistTab(tab);
    }

    // Refresh current tab after an edit save
    function refreshCurrentTab() { fetchHistTab(histTab); }

    const rows = histData[histTab];
    const pageRows = rows ? rows.slice((histPage - 1) * PER_PAGE, histPage * PER_PAGE) : null;
    const isLoading = histLoading === histTab;

    return (<>
        <Modal show={show} size="xl" onHide={handleClose} animation={false} backdrop="static" scrollable>
            <Modal.Header style={{ background: '#ffffff', borderBottom: '1px solid #c3c6d7', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <Modal.Title style={{ fontFamily: '"Hanken Grotesk", sans-serif', fontSize: '16px', fontWeight: 700, color: '#191c1e', flex: 1 }}>
                    <i className="bi bi-clock-history me-2 text-secondary"></i>{t('Customer History')}
                    {customerName && <span style={{ marginLeft: 10, fontSize: 13, fontWeight: 500, color: '#6b7280' }}>— {customerName}</span>}
                </Modal.Title>
                <button type="button" className="btn-close" onClick={handleClose} />
            </Modal.Header>

            {/* Tab bar */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: '#f4f6f8', borderBottom: '1px solid #e2e8f0', padding: '10px 20px', flexShrink: 0, flexWrap: 'wrap' }}>
                {HIST_TABS.map(tab => {
                    const isActive = histTab === tab.key;
                    const count = histData[tab.key];
                    return (
                        <button key={tab.key} type="button" onClick={() => handleTabClick(tab.key)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 16px', borderRadius: 999, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: 13, fontWeight: isActive ? 700 : 500, background: isActive ? tab.color : '#ffffff', color: isActive ? '#ffffff' : '#4b5563', boxShadow: isActive ? `0 2px 8px ${tab.color}55` : '0 1px 3px rgba(0,0,0,0.08)', transition: 'all 0.18s ease', outline: 'none' }}>
                            <i className={`bi ${tab.icon}`} style={{ fontSize: 13, color: isActive ? '#fff' : tab.color }}></i>
                            {t(tab.label)}
                            {count != null && (
                                <span style={{ background: isActive ? 'rgba(255,255,255,0.25)' : '#f0f2f4', color: isActive ? '#fff' : '#6b7280', borderRadius: 999, padding: '1px 7px', fontSize: 11, fontWeight: 700, lineHeight: 1.4 }}>
                                    {count.length}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            <Modal.Body style={histTab === 'trello' ? { padding: 0, height: '65vh', overflowY: 'auto' } : { padding: 0, minHeight: 300 }}>

                        {/* REPAIR JOB BOARD */}
                        {histTab === 'trello' && (
                            customerIdRef.current ? (
                                <RepairJobKanban
                                    embedded
                                    presetCustomerId={customerIdRef.current}
                                    presetCustomerName={customerName}
                                    onOpenCard={(jobId) => props.onOpenJobCard?.(jobId)}
                                />
                            ) : (
                                <div style={{ padding: 48, textAlign: 'center' }}><Spinner animation="border" size="sm" /></div>
                            )
                        )}

                {isLoading && histTab !== 'trello' ? (
                    <div style={{ padding: 48, textAlign: 'center' }}><Spinner animation="border" size="sm" /></div>
                ) : histTab !== 'trello' && (
                    <div style={{ overflowX: 'auto', margin: '0 16px' }}>

                        {/* REPAIRS */}
                        {histTab === 'repairs' && (
                            <table className="table table-sm mb-0" style={{ minWidth: 700 }}>
                                <thead><tr style={{ background: '#f7f9fb' }}>
                                    <th style={thS}>{t('Job #')}</th>
                                    <th style={thS}>{t('Title')}</th>
                                    <th style={thS}>{t('Date')}</th>
                                    <th style={thS}>{t('Km')}</th>
                                    <th style={thS}>{t('Status')}</th>
                                    <th style={{ ...thS, textAlign: 'right' }}>{t('Labour')}</th>
                                    <th style={{ ...thS, textAlign: 'right' }}>{t('Total')}</th>
                                    <th style={thS}></th>
                                </tr></thead>
                                <tbody>
                                    {!rows || rows.length === 0 ? (
                                        <tr><td colSpan={8} style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>{t('No repair jobs found')}</td></tr>
                                    ) : (pageRows || []).map(r => (
                                        <tr key={r.id}>
                                            <td style={tdS}><span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12 }}>{r.job_number || '-'}</span></td>
                                            <td style={tdS}>{r.title || '-'}</td>
                                            <td style={tdS}>{fmtDate(r.date_str)}</td>
                                            <td style={tdS}>{r.km != null ? parseFloat(r.km).toLocaleString() + ' km' : '-'}</td>
                                            <td style={tdS}><span style={{ fontSize: 11, fontWeight: 700, background: '#f0f4ff', color: '#004ac6', borderRadius: 4, padding: '2px 8px' }}>{r.status || '-'}</span></td>
                                            <td style={{ ...tdS, textAlign: 'right' }}>{fmtAmt(r.labour_charge)}</td>
                                            <td style={{ ...tdS, textAlign: 'right', fontWeight: 600 }}>{fmtAmt(r.total_with_vat != null ? r.total_with_vat : r.total)}</td>
                                            <td style={tdS}>
                                                <button style={editBtn} onClick={() => props.onOpenJobCard ? props.onOpenJobCard(r.id) : repairJobCreateRef.current?.open(r.id)}>
                                                    <i className="bi bi-kanban me-1"></i>{t('Open')}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}

                        {/* VEHICLES */}
                        {histTab === 'vehicles' && (
                            <table className="table table-sm mb-0" style={{ minWidth: 700 }}>
                                <thead><tr style={{ background: '#f7f9fb' }}>
                                    <th style={thS}>{t('Plate')}</th>
                                    <th style={thS}>{t('Brand')}</th>
                                    <th style={thS}>{t('Model')}</th>
                                    <th style={thS}>{t('Year')}</th>
                                    <th style={thS}>{t('Color')}</th>
                                    <th style={thS}>{t('Current KM')}</th>
                                    <th style={thS}>{t('Chassis #')}</th>
                                    <th style={thS}></th>
                                </tr></thead>
                                <tbody>
                                    {!rows || rows.length === 0 ? (
                                        <tr><td colSpan={8} style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>{t('No vehicles found')}</td></tr>
                                    ) : (pageRows || []).map(r => (
                                        <tr key={r.id}>
                                            <td style={tdS}><span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{r.vehicle_number || '-'}</span></td>
                                            <td style={tdS}>{r.brand || '-'}</td>
                                            <td style={tdS}>{r.model || '-'}{r.variant ? ` ${r.variant}` : ''}</td>
                                            <td style={tdS}>{r.year || '-'}</td>
                                            <td style={tdS}>{r.color || '-'}</td>
                                            <td style={tdS}>{r.current_km ? parseFloat(r.current_km).toLocaleString() + ' km' : '-'}</td>
                                            <td style={tdS}>{r.chassis_number || '-'}</td>
                                            <td style={tdS}>
                                                <button style={editBtn} onClick={() => vehicleCreateRef.current?.open(r.id)}>
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
                                    <th style={thS}>{t('Code')}</th>
                                    <th style={thS}>{t('Date')}</th>
                                    <th style={thS}>{t('Customer')}</th>
                                    <th style={thS}>{t('Vehicle')}</th>
                                    <th style={thS}>{t('Km')}</th>
                                    <th style={{ ...thS, textAlign: 'right' }}>{t('Total')}</th>
                                    <th style={thS}>{t('Payment')}</th>
                                    <th style={thS}></th>
                                </tr></thead>
                                <tbody>
                                    {!rows || rows.length === 0 ? (
                                        <tr><td colSpan={8} style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>{t('No records found')}</td></tr>
                                    ) : (pageRows || []).map(r => (
                                        <tr key={r.id}>
                                            <td style={tdS}><span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12 }}>{r.code || '-'}</span></td>
                                            <td style={tdS}>{fmtDate(r.date_str)}</td>
                                            <td style={tdS}>{r.customer_name || '-'}</td>
                                            <td style={tdS}>{r.vehicle_number ? <span>{r.vehicle_number}{(r.brand || r.model) ? <span style={{ color: '#6b7280' }}> — {[r.brand, r.model].filter(Boolean).join(' ')}</span> : null}</span> : '-'}</td>
                                            <td style={tdS}>{r.km_driven != null ? parseFloat(r.km_driven).toLocaleString() + ' km' : '-'}</td>
                                            <td style={{ ...tdS, textAlign: 'right', fontWeight: 600 }}>{fmtAmt(r.net_total)}</td>
                                            <td style={tdS}>{payBadge(r.payment_status)}</td>
                                            <td style={tdS}>
                                                <button style={editBtn} onClick={() => orderCreateRef.current?.openAsType5(r.id)}>
                                                    <i className="bi bi-pencil me-1"></i>{t('Edit')}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}

                        {/* SALES RETURNS */}
                        {histTab === 'sales_returns' && (
                            <table className="table table-sm mb-0" style={{ minWidth: 700 }}>
                                <thead><tr style={{ background: '#f7f9fb' }}>
                                    <th style={thS}>{t('Code')}</th>
                                    <th style={thS}>{t('Date')}</th>
                                    <th style={thS}>{t('Customer')}</th>
                                    <th style={thS}>{t('Vehicle')}</th>
                                    <th style={{ ...thS, textAlign: 'right' }}>{t('Total')}</th>
                                    <th style={thS}>{t('Payment')}</th>
                                    <th style={thS}></th>
                                </tr></thead>
                                <tbody>
                                    {!rows || rows.length === 0 ? (
                                        <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>{t('No records found')}</td></tr>
                                    ) : (pageRows || []).map(r => (
                                        <tr key={r.id}>
                                            <td style={tdS}><span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12 }}>{r.code || '-'}</span></td>
                                            <td style={tdS}>{fmtDate(r.date_str)}</td>
                                            <td style={tdS}>{r.customer_name || '-'}</td>
                                            <td style={tdS}>{r.vehicle_number ? <span>{r.vehicle_number}{(r.brand || r.model) ? <span style={{ color: '#6b7280' }}> — {[r.brand, r.model].filter(Boolean).join(' ')}</span> : null}</span> : '-'}</td>
                                            <td style={{ ...tdS, textAlign: 'right', fontWeight: 600 }}>{fmtAmt(r.net_total)}</td>
                                            <td style={tdS}>{payBadge(r.payment_status)}</td>
                                            <td style={tdS}>
                                                <button style={editBtn} onClick={() => salesReturnCreateRef.current?.open(r.id, null)}>
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
                                    <th style={thS}>{t('Code')}</th>
                                    <th style={thS}>{t('Date')}</th>
                                    <th style={thS}>{t('Customer')}</th>
                                    <th style={thS}>{t('Type')}</th>
                                    <th style={thS}>{t('Vehicle')}</th>
                                    <th style={thS}>{t('Km')}</th>
                                    <th style={{ ...thS, textAlign: 'right' }}>{t('Total')}</th>
                                    <th style={thS}></th>
                                </tr></thead>
                                <tbody>
                                    {!rows || rows.length === 0 ? (
                                        <tr><td colSpan={8} style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>{t('No quotations found')}</td></tr>
                                    ) : (pageRows || []).map(r => (
                                        <tr key={r.id}>
                                            <td style={tdS}><span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12 }}>{r.code || '-'}</span></td>
                                            <td style={tdS}>{fmtDate(r.date_str)}</td>
                                            <td style={tdS}>{r.customer_name || '-'}</td>
                                            <td style={tdS}><span style={{ fontSize: 11, fontWeight: 600, color: '#1565c0' }}>{r.type || '-'}</span></td>
                                            <td style={tdS}>{r.vehicle_number ? <span>{r.vehicle_number}{(r.brand || r.model) ? <span style={{ color: '#6b7280' }}> — {[r.brand, r.model].filter(Boolean).join(' ')}</span> : null}</span> : '-'}</td>
                                            <td style={tdS}>{r.km_driven != null ? parseFloat(r.km_driven).toLocaleString() + ' km' : '-'}</td>
                                            <td style={{ ...tdS, textAlign: 'right', fontWeight: 600 }}>{fmtAmt(r.net_total)}</td>
                                            <td style={tdS}>
                                                <button style={editBtn} onClick={() => quotationFormRef.current?.open(r.id, null)}>
                                                    <i className="bi bi-pencil me-1"></i>{t('Edit')}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}

                        {/* NON VAT SALES */}
                        {histTab === 'non_vat_sales' && (
                            <table className="table table-sm mb-0" style={{ minWidth: 750 }}>
                                <thead><tr style={{ background: '#f7f9fb' }}>
                                    <th style={thS}>{t('Code')}</th>
                                    <th style={thS}>{t('Date')}</th>
                                    <th style={thS}>{t('Customer')}</th>
                                    <th style={thS}>{t('Vehicle')}</th>
                                    <th style={thS}>{t('Km')}</th>
                                    <th style={{ ...thS, textAlign: 'right' }}>{t('Total')}</th>
                                    <th style={thS}>{t('Payment')}</th>
                                    <th style={thS}></th>
                                </tr></thead>
                                <tbody>
                                    {!rows || rows.length === 0 ? (
                                        <tr><td colSpan={8} style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>{t('No records found')}</td></tr>
                                    ) : (pageRows || []).map(r => (
                                        <tr key={r.id}>
                                            <td style={tdS}><span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12 }}>{r.code || '-'}</span></td>
                                            <td style={tdS}>{fmtDate(r.date_str)}</td>
                                            <td style={tdS}>{r.customer_name || '-'}</td>
                                            <td style={tdS}>{r.vehicle_number ? <span>{r.vehicle_number}{(r.brand || r.model) ? <span style={{ color: '#6b7280' }}> — {[r.brand, r.model].filter(Boolean).join(' ')}</span> : null}</span> : '-'}</td>
                                            <td style={tdS}>{r.km_driven != null ? parseFloat(r.km_driven).toLocaleString() + ' km' : '-'}</td>
                                            <td style={{ ...tdS, textAlign: 'right', fontWeight: 600 }}>{fmtAmt(r.net_total)}</td>
                                            <td style={tdS}>{payBadge(r.payment_status)}</td>
                                            <td style={tdS}>
                                                <button style={editBtn} onClick={() => nonVatSalesFormRef.current?.open(r.id, null)}>
                                                    <i className="bi bi-pencil me-1"></i>{t('Edit')}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}

                        {/* NON VAT SALES RETURNS */}
                        {histTab === 'non_vat_sales_returns' && (
                            <table className="table table-sm mb-0" style={{ minWidth: 700 }}>
                                <thead><tr style={{ background: '#f7f9fb' }}>
                                    <th style={thS}>{t('Code')}</th>
                                    <th style={thS}>{t('Date')}</th>
                                    <th style={thS}>{t('Customer')}</th>
                                    <th style={thS}>{t('Vehicle')}</th>
                                    <th style={{ ...thS, textAlign: 'right' }}>{t('Total')}</th>
                                    <th style={thS}>{t('Payment')}</th>
                                    <th style={thS}></th>
                                </tr></thead>
                                <tbody>
                                    {!rows || rows.length === 0 ? (
                                        <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>{t('No records found')}</td></tr>
                                    ) : (pageRows || []).map(r => (
                                        <tr key={r.id}>
                                            <td style={tdS}><span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12 }}>{r.code || '-'}</span></td>
                                            <td style={tdS}>{fmtDate(r.date_str)}</td>
                                            <td style={tdS}>{r.customer_name || '-'}</td>
                                            <td style={tdS}>{r.vehicle_number ? <span>{r.vehicle_number}{(r.brand || r.model) ? <span style={{ color: '#6b7280' }}> — {[r.brand, r.model].filter(Boolean).join(' ')}</span> : null}</span> : '-'}</td>
                                            <td style={{ ...tdS, textAlign: 'right', fontWeight: 600 }}>{fmtAmt(r.net_total)}</td>
                                            <td style={tdS}>{payBadge(r.payment_status)}</td>
                                            <td style={tdS}>
                                                <button style={editBtn} onClick={() => nonVatSalesReturnFormRef.current?.open(r.id, null)}>
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

        {/* Edit forms — mounted outside the history modal so they render above it */}
        <RepairJobCreate ref={repairJobCreateRef} refreshList={refreshCurrentTab} showToastMessage={props.showToastMessage} openDetailsView={() => {}} />
        <VehicleCreate ref={vehicleCreateRef} refreshList={refreshCurrentTab} showToastMessage={props.showToastMessage} openDetailsView={() => {}} />
        <OrderCreate ref={orderCreateRef} refreshList={refreshCurrentTab} showToastMessage={props.showToastMessage} openDetailsView={() => {}} />
        <SalesReturnCreate ref={salesReturnCreateRef} refreshList={refreshCurrentTab} showToastMessage={props.showToastMessage} openDetailsView={() => {}} />
        <QuotationType3Form ref={quotationFormRef} apiBase="/v1/quotation" refreshList={refreshCurrentTab} showToastMessage={props.showToastMessage} openDetailsView={() => {}} />
        <QuotationType3Form ref={nonVatSalesFormRef} apiBase="/v1/non-vat-sales" refreshList={refreshCurrentTab} showToastMessage={props.showToastMessage} openDetailsView={() => {}} />
        <QuotationType3Form ref={nonVatSalesReturnFormRef} apiBase="/v1/non-vat-sales-return" refreshList={refreshCurrentTab} showToastMessage={props.showToastMessage} openDetailsView={() => {}} />
    </>);
});

export default CustomerHistoryModal;
