import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { useTranslation } from 'react-i18next';
import { Modal } from "react-bootstrap";
import { ObjectToSearchQueryParams } from '../utils/queryUtils.js';

const VehicleView = forwardRef((props, ref) => {

    useImperativeHandle(ref, () => ({
        open(id) {
            getVehicle(id);
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
        </>
    );
});

export default VehicleView;