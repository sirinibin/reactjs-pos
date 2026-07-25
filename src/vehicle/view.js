import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { useTranslation } from 'react-i18next';
import { Modal, Spinner } from "react-bootstrap";
import { ObjectToSearchQueryParams } from '../utils/queryUtils.js';

const TABS = [
    { key: 'details', label: 'Details', icon: 'bi-car-front' },
    { key: 'sales', label: 'Sales History', icon: 'bi-receipt' },
    { key: 'quotations', label: 'Quotation History', icon: 'bi-file-earmark-text' },
    { key: 'repairs', label: 'Repair Jobs', icon: 'bi-tools' },
];

function fmtDate(val) {
    if (!val) return '-';
    try { return new Date(val).toLocaleDateString(); } catch { return '-'; }
}
function fmtAmt(val) { return val != null ? parseFloat(val).toFixed(2) : '-'; }

const VehicleView = forwardRef((props, ref) => {
    useImperativeHandle(ref, () => ({
        open(id, initialTab) {
            const tab = initialTab || 'details';
            setActiveTab(tab);
            setHistory({ sales: [], quotations: [], repairs: [] });
            setLoadingTab(null);
            getVehicle(id);
            SetShow(true);
            if (tab !== 'details') {
                setTimeout(() => fetchHistory(tab, id), 300);
            }
        },
    }));

    const { t } = useTranslation('common');
    let [formData, setFormData] = useState({});
    const [show, SetShow] = useState(false);
    const [activeTab, setActiveTab] = useState('details');
    const [history, setHistory] = useState({ sales: [], quotations: [], repairs: [] });
    const [loadingTab, setLoadingTab] = useState(null);

    function handleClose() { SetShow(false); }

    useEffect(() => {
        let at = localStorage.getItem("access_token");
        if (!at) { window.location = "/"; }
    });

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

    const fetchHistory = useCallback(async (tab, vehicleId) => {
        if (!vehicleId) return;
        setLoadingTab(tab);
        const storeId = localStorage.getItem('store_id');
        const headers = { 'Content-Type': 'application/json', Authorization: localStorage.getItem('access_token') };
        const qs = `search[vehicle_id]=${vehicleId}&search[store_id]=${storeId}&limit=200&sort=-date`;
        try {
            if (tab === 'sales') {
                const r = await fetch(`/v1/order?${qs}&select=id,code,date,customer_name,net_total,payment_status,km_driven`, { headers }).then(r => r.json());
                setHistory(h => ({ ...h, sales: r?.result || [] }));
            } else if (tab === 'quotations') {
                const r = await fetch(`/v1/quotation?${qs}&select=id,code,date,customer_name,net_total,type,km_driven`, { headers }).then(r => r.json());
                setHistory(h => ({ ...h, quotations: r?.result || [] }));
            } else if (tab === 'repairs') {
                const r = await fetch(`/v1/repair-job?search[vehicle_id]=${vehicleId}&search[store_id]=${storeId}&limit=200&sort=-date_str&select=id,job_number,title,date,status,labour_charge,total,km`, { headers }).then(r => r.json());
                setHistory(h => ({ ...h, repairs: r?.result || [] }));
            }
        } catch (e) { console.error(e); }
        setLoadingTab(null);
    }, []);

    function handleTabClick(tab) {
        setActiveTab(tab);
        if (tab !== 'details' && formData.id) {
            fetchHistory(tab, formData.id);
        }
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

    return (
        <>
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
                        <button type="button" className="btn-close ms-1" onClick={handleClose} />
                    </div>
                </Modal.Header>

                <style>{`
                    .pw-modal .modal-content { display: flex; flex-direction: column; height: 100%; }
                    .pw-body { padding: 0 !important; overflow: hidden !important; display: flex !important; flex-direction: column !important; flex: 1 !important; min-height: 0 !important; }
                    .veh-tab { border: none; background: none; padding: 8px 16px; font-size: 13px; font-weight: 500; color: #54647a; cursor: pointer; border-bottom: 2px solid transparent; white-space: nowrap; }
                    .veh-tab.active { color: #004ac6; border-bottom-color: #004ac6; font-weight: 700; }
                    .veh-tab:hover:not(.active) { color: #191c1e; }
                `}</style>

                {/* Tab bar */}
                <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#fff', padding: '0 20px', flexShrink: 0, overflowX: 'auto' }}>
                    {TABS.map(tab => (
                        <button key={tab.key} className={`veh-tab${activeTab === tab.key ? ' active' : ''}`} onClick={() => handleTabClick(tab.key)}>
                            <i className={`bi ${tab.icon} me-1`}></i>{t(tab.label)}
                        </button>
                    ))}
                </div>

                <Modal.Body className="pw-body">
                    <div style={{ flex: 1, overflow: 'auto', padding: '24px 32px', background: '#f7f9fb' }}>

                        {/* DETAILS TAB */}
                        {activeTab === 'details' && (
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
                                                    <th style={thStyle}>{t('Code')}</th>
                                                    <th style={thStyle}>{t('Date')}</th>
                                                    <th style={thStyle}>{t('Customer')}</th>
                                                    <th style={thStyle}>{t('Km Driven')}</th>
                                                    <th style={{ ...thStyle, textAlign: 'right' }}>{t('Total')}</th>
                                                    <th style={thStyle}>{t('Payment')}</th>
                                                </tr></thead>
                                                <tbody>
                                                    {history.sales.length === 0 ? (
                                                        <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>{t('No sales found')}</td></tr>
                                                    ) : history.sales.map(r => (
                                                        <tr key={r.id}>
                                                            <td style={tdStyle}><span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12 }}>{r.code || '-'}</span></td>
                                                            <td style={tdStyle}>{fmtDate(r.date)}</td>
                                                            <td style={tdStyle}>{r.customer_name || '-'}</td>
                                                            <td style={tdStyle}>{r.km_driven != null ? parseFloat(r.km_driven).toLocaleString() + ' km' : '-'}</td>
                                                            <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{fmtAmt(r.net_total)}</td>
                                                            <td style={tdStyle}>{payBadge(r.payment_status)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}

                                        {/* QUOTATIONS */}
                                        {activeTab === 'quotations' && (
                                            <table className="table table-sm mb-0" style={{ minWidth: 700 }}>
                                                <thead><tr style={{ background: '#f7f9fb' }}>
                                                    <th style={thStyle}>{t('Code')}</th>
                                                    <th style={thStyle}>{t('Date')}</th>
                                                    <th style={thStyle}>{t('Customer')}</th>
                                                    <th style={thStyle}>{t('Type')}</th>
                                                    <th style={thStyle}>{t('Km Driven')}</th>
                                                    <th style={{ ...thStyle, textAlign: 'right' }}>{t('Total')}</th>
                                                </tr></thead>
                                                <tbody>
                                                    {history.quotations.length === 0 ? (
                                                        <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>{t('No quotations found')}</td></tr>
                                                    ) : history.quotations.map(r => (
                                                        <tr key={r.id}>
                                                            <td style={tdStyle}><span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12 }}>{r.code || '-'}</span></td>
                                                            <td style={tdStyle}>{fmtDate(r.date)}</td>
                                                            <td style={tdStyle}>{r.customer_name || '-'}</td>
                                                            <td style={tdStyle}><span style={{ fontSize: 11, fontWeight: 700, background: r.type === 'invoice' ? '#e8f5e9' : '#e3f2fd', color: r.type === 'invoice' ? '#2e7d32' : '#1565c0', borderRadius: 4, padding: '2px 8px' }}>{r.type || 'quotation'}</span></td>
                                                            <td style={tdStyle}>{r.km_driven != null ? parseFloat(r.km_driven).toLocaleString() + ' km' : '-'}</td>
                                                            <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{fmtAmt(r.net_total)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}

                                        {/* REPAIR JOBS */}
                                        {activeTab === 'repairs' && (
                                            <table className="table table-sm mb-0" style={{ minWidth: 700 }}>
                                                <thead><tr style={{ background: '#f7f9fb' }}>
                                                    <th style={thStyle}>{t('Job #')}</th>
                                                    <th style={thStyle}>{t('Title')}</th>
                                                    <th style={thStyle}>{t('Date')}</th>
                                                    <th style={thStyle}>{t('Km')}</th>
                                                    <th style={thStyle}>{t('Status')}</th>
                                                    <th style={{ ...thStyle, textAlign: 'right' }}>{t('Labour')}</th>
                                                    <th style={{ ...thStyle, textAlign: 'right' }}>{t('Total')}</th>
                                                </tr></thead>
                                                <tbody>
                                                    {history.repairs.length === 0 ? (
                                                        <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>{t('No repair jobs found')}</td></tr>
                                                    ) : history.repairs.map(r => (
                                                        <tr key={r.id}>
                                                            <td style={tdStyle}><span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12 }}>{r.job_number || '-'}</span></td>
                                                            <td style={tdStyle}>{r.title || '-'}</td>
                                                            <td style={tdStyle}>{fmtDate(r.date)}</td>
                                                            <td style={tdStyle}>{r.km != null ? parseFloat(r.km).toLocaleString() + ' km' : '-'}</td>
                                                            <td style={tdStyle}><span style={{ fontSize: 11, fontWeight: 700, background: '#f0f4ff', color: '#004ac6', borderRadius: 4, padding: '2px 8px' }}>{r.status || '-'}</span></td>
                                                            <td style={{ ...tdStyle, textAlign: 'right' }}>{fmtAmt(r.labour_charge)}</td>
                                                            <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{fmtAmt(r.total)}</td>
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
        </>
    );
});

export default VehicleView;
