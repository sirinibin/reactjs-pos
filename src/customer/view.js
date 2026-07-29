import React, { useState, useCallback, forwardRef, useImperativeHandle, useRef } from "react";
import { Modal, Spinner, Dropdown } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import ImageGallery from '../utils/ImageGallery.js';
import { ObjectToSearchQueryParams } from '../utils/queryUtils.js';
import { formatInStoreTimezone } from '../utils/dateUtils.js';
import Sales from '../utils/sales.js';
import SalesReturns from '../utils/salesReturn.js';
import Quotations from '../utils/quotations.js';
import QuotationSalesReturns from '../utils/quotation_sales_returns.js';

const storeSettings = (() => { try { return JSON.parse(localStorage.getItem('_store_settings_cache') || 'null'); } catch (_) { return null; } })();
const automobileEnabled = !!storeSettings?.enable_automobile_module;

const TABS = [
    { key: 'details',       label: 'Details',                   icon: 'bi-person-vcard' },
    { key: 'sales',         label: 'Sales History',              icon: 'bi-receipt' },
    { key: 'quotations',    label: 'Quotation History',          icon: 'bi-file-earmark-text' },
    { key: 'repairs',       label: 'Repair Jobs',                icon: 'bi-tools' },
    ...(automobileEnabled ? [{ key: 'vehicles', label: 'Vehicles', icon: 'bi-car-front' }] : []),
    { key: 'churnHistory',  label: 'Churn Risk History',         icon: 'bi-exclamation-triangle' },
    { key: 'clvHistory',    label: 'CLV History',                icon: 'bi-graph-up-arrow' },
];

function fmtDate(val) { if (!val) return '-'; try { return new Date(val).toLocaleDateString(); } catch { return '-'; } }
function fmtAmt(val) { return val != null ? parseFloat(val).toFixed(2) : '-'; }

const CustomerView = forwardRef((props, ref) => {
    const { t } = useTranslation('common');
    const timerRef = useRef(null);
    const ImageGalleryRef = useRef();
    const SalesRef = useRef();
    const SalesReturnsRef = useRef();
    const QuotationsRef = useRef();
    const QtnSalesRef = useRef();
    const QtnSalesReturnsRef = useRef();

    const [model, setModel] = useState({});
    const [show, SetShow] = useState(false);
    const [activeTab, setActiveTab] = useState('details');
    const [history, setHistory] = useState({ sales: [], quotations: [], repairs: [], vehicles: [] });
    const [biHistory, setBiHistory] = useState({ churn_history: [], clv_history: [] });
    const [loadingTab, setLoadingTab] = useState(null);

    useImperativeHandle(ref, () => ({
        async open(id, initialTab) {
            if (!id) return;
            setActiveTab(initialTab || 'details');
            setHistory({ sales: [], quotations: [], repairs: [], vehicles: [] });
            setBiHistory({ churn_history: [], clv_history: [] });
            setLoadingTab(null);
            await getCustomer(id);
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => { ImageGalleryRef.current?.open(); }, 300);
            SetShow(true);
            if (initialTab && initialTab !== 'details') {
                setTimeout(() => fetchHistory(initialTab, id), 300);
            }
        },
    }));

    function handleClose() { SetShow(false); }

    async function getCustomer(id) {
        const requestOptions = { method: 'GET', headers: { 'Content-Type': 'application/json', 'Authorization': localStorage.getItem('access_token') } };
        let searchParams = {};
        if (localStorage.getItem("store_id")) searchParams.store_id = localStorage.getItem("store_id");
        await fetch('/v1/customer/' + id + "?" + ObjectToSearchQueryParams(searchParams), requestOptions)
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();
                if (!response.ok) return;
                setModel(data.result || {});
            }).catch(() => {});
    }

    const fetchHistory = useCallback(async (tab, customerId) => {
        if (!customerId) return;
        setLoadingTab(tab);
        const storeId = localStorage.getItem('store_id');
        const headers = { 'Content-Type': 'application/json', Authorization: localStorage.getItem('access_token') };
        const qs = `search[customer_id]=${customerId}&search[store_id]=${storeId}&limit=200&sort=-date_str`;
        try {
            if (tab === 'sales') {
                const r = await fetch(`/v1/order?${qs}&select=id,code,date_str,customer_name,net_total,payment_status,km_driven`, { headers }).then(r => r.json());
                setHistory(h => ({ ...h, sales: r?.result || [] }));
            } else if (tab === 'quotations') {
                const r = await fetch(`/v1/quotation?${qs}&select=id,code,date_str,customer_name,net_total,type,km_driven`, { headers }).then(r => r.json());
                setHistory(h => ({ ...h, quotations: r?.result || [] }));
            } else if (tab === 'repairs') {
                const r = await fetch(`/v1/repair_job?search[customer_id]=${customerId}&search[store_id]=${storeId}&limit=200&sort=-date_str&select=id,job_number,title,date,status,labour_charge,total,km`, { headers }).then(r => r.json());
                setHistory(h => ({ ...h, repairs: r?.result || [] }));
            } else if (tab === 'vehicles') {
                const r = await fetch(`/v1/vehicle?search[customer_id]=${customerId}&search[store_id]=${storeId}&limit=200&sort=-created_at&select=id,vehicle_number,brand,model,variant,year,color,chassis_number,istimara_no,current_km`, { headers }).then(r => r.json());
                setHistory(h => ({ ...h, vehicles: r?.result || [] }));
            } else if (tab === 'churnHistory' || tab === 'clvHistory') {
                const r = await fetch(`/v1/customer/${customerId}/history?search[store_id]=${storeId}`, { headers }).then(r => r.json());
                if (r?.result) setBiHistory(r.result);
            }
        } catch (e) { console.error(e); }
        setLoadingTab(null);
    }, []);

    function handleTabClick(tab) {
        setActiveTab(tab);
        if (tab !== 'details' && model.id) fetchHistory(tab, model.id);
    }

    const thS = { padding: '8px 10px', fontWeight: 700, fontSize: 11, color: '#54647a', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' };
    const tdS = { padding: '8px 10px', fontSize: 13, borderBottom: '1px solid #f0f2f4', verticalAlign: 'middle' };
    const payBadge = (status) => {
        const m = { paid: ['#e8f5e9', '#2e7d32'], not_paid: ['#ffebee', '#c62828'], paid_partially: ['#fff3e0', '#e65100'] };
        const [bg, col] = m[status] || ['#f0f2f4', '#54647a'];
        return <span style={{ background: bg, color: col, borderRadius: 999, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{status?.replace(/_/g, ' ') || '-'}</span>;
    };

    const rowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid #c3c6d7', gap: '16px' };
    const labelStyle = { fontSize: '14px', color: '#434655', flexShrink: 0, minWidth: '160px' };
    const valueStyle = { fontSize: '14px', fontWeight: 500, color: '#191c1e', textAlign: 'right' };

    return (<>
        <Modal show={show} fullscreen onHide={handleClose} animation={false} backdrop="static" dialogClassName="cust-view-modal">
            <Modal.Header style={{ background: '#fff', borderBottom: '1px solid #c3c6d7', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button type="button" onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#434655', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 600, padding: '4px 8px', borderRadius: '4px' }}>
                    <i className="bi bi-arrow-left" style={{ fontSize: '16px' }}></i> {t('Back')}
                </button>
                <Modal.Title style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: '17px', fontWeight: 700, color: '#191c1e', flex: 1 }}>
                    {model.name || t('Customer Details')}
                    {model.phone && <span style={{ marginLeft: 8, fontSize: 13, fontWeight: 500, color: '#6b7280' }}>— {model.phone}</span>}
                </Modal.Title>
                <div className="d-flex align-items-center gap-2">
                    {props.openUpdateForm && (
                        <button type="button" style={{ background: '#d0e1fb', color: '#54647a', border: 'none', borderRadius: '4px', padding: '6px 14px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                            onClick={() => { handleClose(); props.openUpdateForm(model.id); }}>
                            <i className="bi bi-pencil me-1"></i>{t('Edit')}
                        </button>
                    )}
                    {model.id && (
                        <Dropdown align="end">
                            <Dropdown.Toggle variant="outline-secondary" size="sm" id="cust-view-hist-dd" title="History & Links">
                                <i className="bi bi-clock-history me-1"></i>{t('History')}
                            </Dropdown.Toggle>
                            <Dropdown.Menu style={{ minWidth: 230 }}>
                                <Dropdown.Item onClick={() => handleTabClick('repairs')}>
                                    <i className="bi bi-tools me-2 text-secondary"></i>Repair Jobs
                                </Dropdown.Item>
                                {automobileEnabled && (
                                    <Dropdown.Item onClick={() => handleTabClick('vehicles')}>
                                        <i className="bi bi-car-front me-2 text-secondary"></i>Vehicles
                                    </Dropdown.Item>
                                )}
                                <Dropdown.Divider />
                                <Dropdown.Item onClick={() => SalesRef.current?.open(false, [{ id: model.id, name: model.name }], null)}>
                                    <i className="bi bi-receipt me-2 text-success"></i>Sales History
                                </Dropdown.Item>
                                <Dropdown.Item onClick={() => SalesReturnsRef.current?.open(false, [{ id: model.id, name: model.name }], null)}>
                                    <i className="bi bi-receipt-cutoff me-2 text-warning"></i>Sales Return History
                                </Dropdown.Item>
                                <Dropdown.Divider />
                                <Dropdown.Item onClick={() => QuotationsRef.current?.open(false, [{ id: model.id, name: model.name }], 'quotation', null)}>
                                    <i className="bi bi-clipboard2-check me-2 text-info"></i>Quotation History
                                </Dropdown.Item>
                                <Dropdown.Item onClick={() => QtnSalesRef.current?.open(false, [{ id: model.id, name: model.name }], 'invoice', null)}>
                                    <i className="bi bi-file-earmark-check me-2 text-info"></i>Qtn. Sales History
                                </Dropdown.Item>
                                <Dropdown.Item onClick={() => QtnSalesReturnsRef.current?.open(false, [{ id: model.id, name: model.name }], null)}>
                                    <i className="bi bi-clipboard2-x me-2 text-warning"></i>Qtn. Sales Return History
                                </Dropdown.Item>
                                <Dropdown.Divider />
                                <Dropdown.Item onClick={() => handleTabClick('churnHistory')}>
                                    <i className="bi bi-exclamation-triangle me-2 text-danger"></i>Churn Risk History
                                </Dropdown.Item>
                                <Dropdown.Item onClick={() => handleTabClick('clvHistory')}>
                                    <i className="bi bi-graph-up-arrow me-2 text-primary"></i>CLV History
                                </Dropdown.Item>
                            </Dropdown.Menu>
                        </Dropdown>
                    )}
                    <button type="button" className="btn-close ms-1" onClick={handleClose} />
                </div>
            </Modal.Header>

            <style>{`
                .cust-view-modal .modal-content { display: flex; flex-direction: column; height: 100%; }
                .cust-body { padding: 0 !important; overflow: hidden !important; display: flex !important; flex-direction: column !important; flex: 1 !important; min-height: 0 !important; }
                .cv-tab { border: none; background: none; padding: 8px 16px; font-size: 13px; font-weight: 500; color: #54647a; cursor: pointer; border-bottom: 2px solid transparent; white-space: nowrap; }
                .cv-tab.active { color: #004ac6; border-bottom-color: #004ac6; font-weight: 700; }
                .cv-tab:hover:not(.active) { color: #191c1e; }
            `}</style>

            {/* Tab bar */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#fff', padding: '0 20px', flexShrink: 0, overflowX: 'auto' }}>
                {TABS.map(tab => (
                    <button key={tab.key} className={`cv-tab${activeTab === tab.key ? ' active' : ''}`} onClick={() => handleTabClick(tab.key)}>
                        <i className={`bi ${tab.icon} me-1`}></i>{t(tab.label)}
                    </button>
                ))}
            </div>

            <Modal.Body className="cust-body">
                <div style={{ flex: 1, overflow: 'auto', padding: '24px 32px', background: '#f7f9fb' }}>

                    {/* DETAILS TAB */}
                    {activeTab === 'details' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                            {/* Summary Cards */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                                {[
                                    { label: 'Phone', value: model.phone, sub: model.phone_in_arabic },
                                    { label: 'VAT No.', value: model.vat_no, sub: model.vat_no_in_arabic },
                                    { label: 'C.R No.', value: model.registration_number },
                                    { label: 'Email', value: model.email },
                                ].map(c => (
                                    <div key={c.label} style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#54647a' }}>{c.label}</span>
                                        <span style={{ fontSize: '16px', fontWeight: 600, color: '#191c1e', wordBreak: 'break-all' }}>{c.value || '—'}</span>
                                        {c.sub && <span style={{ fontSize: '11px', color: '#6b7280' }}>{c.sub}</span>}
                                    </div>
                                ))}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '32px', alignItems: 'start' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                    {/* Contact */}
                                    <section style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                        <div style={{ padding: '12px 24px', borderBottom: '1px solid #c3c6d7', backgroundColor: '#f2f4f6' }}>
                                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, fontFamily: "'Hanken Grotesk', sans-serif", color: '#191c1e' }}>Contact Details</h3>
                                        </div>
                                        <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column' }}>
                                            {[
                                                { label: 'Name', value: model.name },
                                                { label: 'Name (Arabic)', value: model.name_in_arabic },
                                                { label: 'Phone', value: model.phone },
                                                { label: 'Email', value: model.email },
                                                { label: 'Address', value: model.address },
                                                { label: 'VAT No.', value: model.vat_no },
                                                { label: 'C.R No.', value: model.registration_number },
                                            ].filter(r => r.value).map((r, i, arr) => (
                                                <div key={r.label} style={{ ...rowStyle, borderBottom: i < arr.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                                                    <span style={labelStyle}>{r.label}</span>
                                                    <span style={valueStyle}>{r.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </section>

                                    {/* Photos */}
                                    <section style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                        <div style={{ padding: '12px 24px', borderBottom: '1px solid #c3c6d7', backgroundColor: '#f2f4f6' }}>
                                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, fontFamily: "'Hanken Grotesk', sans-serif", color: '#191c1e' }}>Photos</h3>
                                        </div>
                                        <div style={{ padding: '24px' }}>
                                            <ImageGallery ref={ImageGalleryRef} id={model.id} storeID={model.store_id} storedImages={model.images} modelName={"customer"} />
                                        </div>
                                    </section>
                                </div>

                                {/* Metadata */}
                                <section style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden', minWidth: '220px' }}>
                                    <div style={{ padding: '12px 24px', borderBottom: '1px solid #c3c6d7', backgroundColor: '#f2f4f6' }}>
                                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, fontFamily: "'Hanken Grotesk', sans-serif", color: '#191c1e' }}>Metadata</h3>
                                    </div>
                                    <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {[
                                            { label: 'Created By', value: model.created_by_name },
                                            { label: 'Updated By', value: model.updated_by_name },
                                            { label: 'Created At', value: model.created_at ? formatInStoreTimezone(model.created_at) : null },
                                            { label: 'Updated At', value: model.updated_at ? formatInStoreTimezone(model.updated_at) : null },
                                        ].filter(r => r.value).map((r, i, arr) => (
                                            <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', paddingBottom: '10px', borderBottom: i < arr.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                                                <span style={{ fontSize: '13px', color: '#54647a' }}>{r.label}</span>
                                                <span style={{ fontSize: '13px', fontWeight: 500, color: '#191c1e', textAlign: 'right' }}>{r.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            </div>
                        </div>
                    )}

                    {/* HISTORY TABS */}
                    {activeTab !== 'details' && (
                        <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                            {loadingTab === activeTab ? (
                                <div style={{ padding: 40, textAlign: 'center' }}><Spinner animation="border" size="sm" /></div>
                            ) : (
                                <div style={{ overflowX: 'auto' }}>
                                    {/* SALES */}
                                    {activeTab === 'sales' && (
                                        <table className="table table-sm mb-0" style={{ minWidth: 700 }}>
                                            <thead><tr style={{ background: '#f7f9fb' }}>
                                                <th style={thS}>{t('Code')}</th>
                                                <th style={thS}>{t('Date')}</th>
                                                <th style={thS}>{t('Km Driven')}</th>
                                                <th style={{ ...thS, textAlign: 'right' }}>{t('Total')}</th>
                                                <th style={thS}>{t('Payment')}</th>
                                            </tr></thead>
                                            <tbody>
                                                {history.sales.length === 0
                                                    ? <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>{t('No sales found')}</td></tr>
                                                    : history.sales.map(r => (
                                                        <tr key={r.id}>
                                                            <td style={tdS}><span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12 }}>{r.code || '-'}</span></td>
                                                            <td style={tdS}>{fmtDate(r.date_str)}</td>
                                                            <td style={tdS}>{r.km_driven != null ? parseFloat(r.km_driven).toLocaleString() + ' km' : '-'}</td>
                                                            <td style={{ ...tdS, textAlign: 'right', fontWeight: 600 }}>{fmtAmt(r.net_total)}</td>
                                                            <td style={tdS}>{payBadge(r.payment_status)}</td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    )}

                                    {/* QUOTATIONS */}
                                    {activeTab === 'quotations' && (
                                        <table className="table table-sm mb-0" style={{ minWidth: 700 }}>
                                            <thead><tr style={{ background: '#f7f9fb' }}>
                                                <th style={thS}>{t('Code')}</th>
                                                <th style={thS}>{t('Date')}</th>
                                                <th style={thS}>{t('Type')}</th>
                                                <th style={thS}>{t('Km Driven')}</th>
                                                <th style={{ ...thS, textAlign: 'right' }}>{t('Total')}</th>
                                            </tr></thead>
                                            <tbody>
                                                {history.quotations.length === 0
                                                    ? <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>{t('No quotations found')}</td></tr>
                                                    : history.quotations.map(r => (
                                                        <tr key={r.id}>
                                                            <td style={tdS}><span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12 }}>{r.code || '-'}</span></td>
                                                            <td style={tdS}>{fmtDate(r.date_str)}</td>
                                                            <td style={tdS}><span style={{ fontSize: 11, fontWeight: 700, background: r.type === 'invoice' ? '#e8f5e9' : '#e3f2fd', color: r.type === 'invoice' ? '#2e7d32' : '#1565c0', borderRadius: 4, padding: '2px 8px' }}>{r.type || 'quotation'}</span></td>
                                                            <td style={tdS}>{r.km_driven != null ? parseFloat(r.km_driven).toLocaleString() + ' km' : '-'}</td>
                                                            <td style={{ ...tdS, textAlign: 'right', fontWeight: 600 }}>{fmtAmt(r.net_total)}</td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    )}

                                    {/* REPAIR JOBS */}
                                    {activeTab === 'repairs' && (
                                        <table className="table table-sm mb-0" style={{ minWidth: 700 }}>
                                            <thead><tr style={{ background: '#f7f9fb' }}>
                                                <th style={thS}>{t('Job #')}</th>
                                                <th style={thS}>{t('Title')}</th>
                                                <th style={thS}>{t('Date')}</th>
                                                <th style={thS}>{t('Km')}</th>
                                                <th style={thS}>{t('Status')}</th>
                                                <th style={{ ...thS, textAlign: 'right' }}>{t('Labour')}</th>
                                                <th style={{ ...thS, textAlign: 'right' }}>{t('Total')}</th>
                                            </tr></thead>
                                            <tbody>
                                                {history.repairs.length === 0
                                                    ? <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>{t('No repair jobs found')}</td></tr>
                                                    : history.repairs.map(r => (
                                                        <tr key={r.id}>
                                                            <td style={tdS}><span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12 }}>{r.job_number || '-'}</span></td>
                                                            <td style={tdS}>{r.title || '-'}</td>
                                                            <td style={tdS}>{fmtDate(r.date)}</td>
                                                            <td style={tdS}>{r.km != null ? parseFloat(r.km).toLocaleString() + ' km' : '-'}</td>
                                                            <td style={tdS}><span style={{ fontSize: 11, fontWeight: 700, background: '#f0f4ff', color: '#004ac6', borderRadius: 4, padding: '2px 8px' }}>{r.status || '-'}</span></td>
                                                            <td style={{ ...tdS, textAlign: 'right' }}>{fmtAmt(r.labour_charge)}</td>
                                                            <td style={{ ...tdS, textAlign: 'right', fontWeight: 600 }}>{fmtAmt(r.total)}</td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    )}

                                    {/* VEHICLES */}
                                    {activeTab === 'vehicles' && (
                                        <table className="table table-sm mb-0" style={{ minWidth: 700 }}>
                                            <thead><tr style={{ background: '#f7f9fb' }}>
                                                <th style={thS}>{t('Vehicle #')}</th>
                                                <th style={thS}>{t('Brand / Model')}</th>
                                                <th style={thS}>{t('Year')}</th>
                                                <th style={thS}>{t('Color')}</th>
                                                <th style={thS}>{t('Istimara No.')}</th>
                                                <th style={thS}>{t('Chassis No.')}</th>
                                                <th style={thS}>{t('Current Km')}</th>
                                            </tr></thead>
                                            <tbody>
                                                {history.vehicles.length === 0
                                                    ? <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>{t('No vehicles found')}</td></tr>
                                                    : history.vehicles.map(r => (
                                                        <tr key={r.id}>
                                                            <td style={tdS}><span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12 }}>{r.vehicle_number || '-'}</span></td>
                                                            <td style={tdS}>{[r.brand, r.model, r.variant].filter(Boolean).join(' ') || '-'}</td>
                                                            <td style={tdS}>{r.year || '-'}</td>
                                                            <td style={tdS}>{r.color || '-'}</td>
                                                            <td style={tdS}>{r.istimara_no || '-'}</td>
                                                            <td style={tdS}>{r.chassis_number || '-'}</td>
                                                            <td style={tdS}>{r.current_km != null ? parseFloat(r.current_km).toLocaleString() + ' km' : '-'}</td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    )}

                                    {/* CHURN RISK HISTORY */}
                                    {activeTab === 'churnHistory' && (
                                        <table className="table table-sm mb-0" style={{ minWidth: 600 }}>
                                            <thead><tr style={{ background: '#f7f9fb' }}>
                                                <th style={thS}>{t('Date')}</th>
                                                <th style={thS}>{t('Tier')}</th>
                                                <th style={thS}>{t('Churn %')}</th>
                                                <th style={thS}>{t('Days Since Last Buy')}</th>
                                                <th style={thS}>{t('Reason')}</th>
                                            </tr></thead>
                                            <tbody>
                                                {(!biHistory.churn_history || biHistory.churn_history.length === 0)
                                                    ? <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>{t('No churn history found')}</td></tr>
                                                    : biHistory.churn_history.map((r, i) => (
                                                        <tr key={i}>
                                                            <td style={tdS}>{fmtDate(r.date)}</td>
                                                            <td style={tdS}><span style={{ fontSize: 11, fontWeight: 700, background: '#fff3e0', color: '#e65100', borderRadius: 4, padding: '2px 8px' }}>{r.tier || '-'}</span></td>
                                                            <td style={tdS}>{r.churn_percent != null ? r.churn_percent + '%' : '-'}</td>
                                                            <td style={tdS}>{r.days_since_last_buy != null ? r.days_since_last_buy + ' days' : '-'}</td>
                                                            <td style={tdS}>{r.reason || '-'}</td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    )}

                                    {/* CLV HISTORY */}
                                    {activeTab === 'clvHistory' && (
                                        <table className="table table-sm mb-0" style={{ minWidth: 600 }}>
                                            <thead><tr style={{ background: '#f7f9fb' }}>
                                                <th style={thS}>{t('Date')}</th>
                                                <th style={thS}>{t('Segment')}</th>
                                                <th style={thS}>{t('Predicted CLV')}</th>
                                                <th style={thS}>{t('Avg Order')}</th>
                                                <th style={thS}>{t('Orders Count')}</th>
                                                <th style={thS}>{t('Total Spend')}</th>
                                            </tr></thead>
                                            <tbody>
                                                {(!biHistory.clv_history || biHistory.clv_history.length === 0)
                                                    ? <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>{t('No CLV history found')}</td></tr>
                                                    : biHistory.clv_history.map((r, i) => (
                                                        <tr key={i}>
                                                            <td style={tdS}>{fmtDate(r.date)}</td>
                                                            <td style={tdS}><span style={{ fontSize: 11, fontWeight: 700, background: '#e8f5e9', color: '#2e7d32', borderRadius: 4, padding: '2px 8px' }}>{r.segment || '-'}</span></td>
                                                            <td style={{ ...tdS, fontWeight: 600 }}>{r.predicted_clv_amount != null ? fmtAmt(r.predicted_clv_amount) : '-'}</td>
                                                            <td style={tdS}>{r.predicted_avg_order_amount != null ? fmtAmt(r.predicted_avg_order_amount) : '-'}</td>
                                                            <td style={tdS}>{r.history_orders_count != null ? r.history_orders_count : '-'}</td>
                                                            <td style={tdS}>{r.history_spend_amount != null ? fmtAmt(r.history_spend_amount) : '-'}</td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </Modal.Body>
        </Modal>
        <Sales ref={SalesRef} />
        <SalesReturns ref={SalesReturnsRef} />
        <Quotations ref={QuotationsRef} />
        <Quotations ref={QtnSalesRef} />
        <QuotationSalesReturns ref={QtnSalesReturnsRef} />
    </>);
});

export default CustomerView;
