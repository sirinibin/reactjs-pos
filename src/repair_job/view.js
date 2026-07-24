import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { useTranslation } from 'react-i18next';
import { Modal } from "react-bootstrap";
import { format } from "date-fns";
import { ObjectToSearchQueryParams } from '../utils/queryUtils.js';

const STATUS_COLORS = {
    open: { bg: '#e3f2fd', color: '#1565c0' },
    in_progress: { bg: '#fff3e0', color: '#e65100' },
    completed: { bg: '#e8f5e9', color: '#2e7d32' },
    delivered: { bg: '#f3e5f5', color: '#6a1b9a' },
    cancelled: { bg: '#ffebee', color: '#c62828' },
};

const RepairJobView = forwardRef((props, ref) => {

    useImperativeHandle(ref, () => ({
        open(id) {
            getRepairJob(id);
            SetShow(true);
        },
    }));

    const { t } = useTranslation('common');
    let [formData, setFormData] = useState({});
    const [show, SetShow] = useState(false);

    function handleClose() { SetShow(false); }

    useEffect(() => {
        let at = localStorage.getItem("access_token");
        if (!at) { window.location = "/"; }
    });

    function getRepairJob(id) {
        const requestOptions = {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', 'Authorization': localStorage.getItem('access_token') },
        };
        let searchParams = {};
        if (localStorage.getItem("store_id")) { searchParams.store_id = localStorage.getItem("store_id"); }
        let queryParams = ObjectToSearchQueryParams(searchParams);

        fetch('/v1/repair-job/' + id + "?" + queryParams, requestOptions)
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();
                if (!response.ok) { return Promise.reject(data && data.errors); }
                formData = data.result;
                setFormData({ ...formData });
            })
            .catch(error => console.log(error));
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

    function fmtCurrency(val) {
        if (val === undefined || val === null) return "0.00";
        return parseFloat(val).toFixed(2);
    }

    return (
        <>
            <Modal show={show} fullscreen onHide={handleClose} animation={false} backdrop="static" dialogClassName="pw-modal">
                <Modal.Header style={{ background: '#ffffff', borderBottom: '1px solid #c3c6d7', padding: '10px 20px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button type="button" onClick={handleClose}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#434655', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 600, fontFamily: '"Inter", sans-serif', padding: '4px 8px', borderRadius: '4px' }}>
                        <i className="bi bi-arrow-left" style={{ fontSize: '16px' }}></i> {t('Back')}
                    </button>
                    <Modal.Title style={{ fontFamily: '"Hanken Grotesk", sans-serif', fontSize: '17px', fontWeight: 700, color: '#191c1e', flex: 1 }}>
                        {formData.job_number || t('Repair Job')}
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
                `}</style>

                <Modal.Body className="pw-body">
                    <div style={{ flex: 1, overflow: 'auto', padding: '24px 32px', background: '#f7f9fb' }}>
                        <div style={{ maxWidth: '800px', margin: '0 auto' }}>

                            <div style={CARD}>
                                <SectionTitle icon="bi-clipboard2-pulse">{t('Job Information')}</SectionTitle>
                                <div className="row g-3">
                                    <div className="col-md-3"><Label>{t('Job Number')}</Label><div style={VALUE_BOX}>{formData.job_number || '-'}</div></div>
                                    <div className="col-md-3"><Label>{t('Date')}</Label><div style={VALUE_BOX}>{formData.date ? format(new Date(formData.date), "MMM dd yyyy") : '-'}</div></div>
                                    <div className="col-md-3">
                                        <Label>{t('Status')}</Label>
                                        <div style={{ paddingTop: '4px' }}>
                                            {(() => {
                                                const colors = STATUS_COLORS[formData.status] || STATUS_COLORS.open;
                                                return <span style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, background: colors.bg, color: colors.color, textTransform: 'uppercase' }}>
                                                    {t(formData.status === 'in_progress' ? 'In Progress' : formData.status || '-')}
                                                </span>;
                                            })()}
                                        </div>
                                    </div>
                                    <div className="col-md-3"><Label>{t('Est. Delivery')}</Label><div style={VALUE_BOX}>{formData.estimated_delivery ? format(new Date(formData.estimated_delivery), "MMM dd yyyy") : '-'}</div></div>
                                </div>
                            </div>

                            <div style={CARD}>
                                <SectionTitle icon="bi-truck">{t('Vehicle & Technician')}</SectionTitle>
                                <div className="row g-3">
                                    <div className="col-md-4"><Label>{t('Vehicle Number')}</Label><div style={VALUE_BOX}>{formData.vehicle_number || '-'}</div></div>
                                    <div className="col-md-4"><Label>{t('Brand / Model')}</Label><div style={VALUE_BOX}>{formData.brand || '-'} {formData.model || ''}</div></div>
                                    <div className="col-md-2"><Label>{t('KM')}</Label><div style={VALUE_BOX}>{formData.km ? parseFloat(formData.km).toLocaleString() : '-'}</div></div>
                                    <div className="col-md-2"><Label>{t('Technician')}</Label><div style={VALUE_BOX}>{formData.technician_name || '-'}</div></div>
                                </div>
                            </div>

                            <div style={CARD}>
                                <SectionTitle icon="bi-tools">{t('Service Details')}</SectionTitle>
                                <div className="row g-3">
                                    <div className="col-md-6"><Label>{t('Complaint')}</Label><div style={{ ...VALUE_BOX, minHeight: '60px', whiteSpace: 'pre-wrap' }}>{formData.complaint || '-'}</div></div>
                                    <div className="col-md-6"><Label>{t('Inspection')}</Label><div style={{ ...VALUE_BOX, minHeight: '60px', whiteSpace: 'pre-wrap' }}>{formData.inspection || '-'}</div></div>
                                    <div className="col-12"><Label>{t('Work Done')}</Label><div style={{ ...VALUE_BOX, minHeight: '60px', whiteSpace: 'pre-wrap' }}>{formData.work_done || '-'}</div></div>
                                </div>
                            </div>

                            {formData.parts && formData.parts.length > 0 && (
                                <div style={CARD}>
                                    <SectionTitle icon="bi-box-seam">{t('Parts Used')}</SectionTitle>
                                    <div className="table-responsive">
                                        <table className="table table-sm table-bordered table-striped">
                                            <thead>
                                                <tr className="text-center">
                                                    <th>{t('Part Name')}</th>
                                                    <th>{t('Qty')}</th>
                                                    <th>{t('Unit Price')}</th>
                                                    <th>{t('Total')}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-center">
                                                {formData.parts.map((part, idx) => (
                                                    <tr key={idx}>
                                                        <td className="text-start">{part.name}</td>
                                                        <td>{part.qty}</td>
                                                        <td>{fmtCurrency(part.unit_price)}</td>
                                                        <td style={{ fontWeight: 600 }}>{fmtCurrency(part.total_price)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot>
                                                <tr style={{ background: '#f0f2f4' }}>
                                                    <td colSpan="3" className="text-end"><strong>{t('Parts Total')}:</strong></td>
                                                    <td className="text-end"><strong>{fmtCurrency(formData.parts_total)}</strong></td>
                                                </tr>
                                                <tr style={{ background: '#f0f2f4' }}>
                                                    <td colSpan="3" className="text-end"><strong>{t('Labour Charge')}:</strong></td>
                                                    <td className="text-end"><strong>{fmtCurrency(formData.labour_charge)}</strong></td>
                                                </tr>
                                                <tr style={{ background: '#d0e1fb' }}>
                                                    <td colSpan="3" className="text-end"><strong style={{ fontSize: '14px' }}>{t('Grand Total')}:</strong></td>
                                                    <td className="text-end"><strong style={{ fontSize: '14px', color: '#004ac6' }}>{fmtCurrency(formData.total)}</strong></td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>
                </Modal.Body>
            </Modal>
        </>
    );
});

export default RepairJobView;