import React, { useState, forwardRef, useImperativeHandle } from "react";
import { Modal } from 'react-bootstrap';
import { ObjectToSearchQueryParams } from '../utils/queryUtils.js';
import { formatInStoreTimezone } from '../utils/dateUtils.js';

const WarehouseView = forwardRef((props, ref) => {

    useImperativeHandle(ref, () => ({
        open(id) {
            if (id) {
                getWarehouse(id);
                SetShow(true);
            }
        },
    }));

    let [model, setModel] = useState({});
    const [show, SetShow] = useState(false);

    function handleClose() { SetShow(false); }

    function getWarehouse(id) {
        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': localStorage.getItem('access_token'),
            },
        };
        let searchParams = {};
        if (localStorage.getItem("store_id")) searchParams.store_id = localStorage.getItem("store_id");
        let queryParams = ObjectToSearchQueryParams(searchParams);
        fetch('/v1/warehouse/' + id + "?" + queryParams, requestOptions)
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();
                if (!response.ok) { return Promise.reject(data && data.errors); }
                model = data.result;
                setModel({ ...model });
            })
            .catch(() => {});
    }

    const DetailRow = ({ label, value, isLast }) => {
        if (!value) return null;
        return (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: isLast ? '0' : '12px', marginBottom: isLast ? '0' : '12px', borderBottom: isLast ? 'none' : '1px solid #c3c6d7' }}>
                <span style={{ fontSize: '14px', color: '#434655', flexShrink: 0 }}>{label}</span>
                <span style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e', textAlign: 'right' }}>{value}</span>
            </div>
        );
    };

    const SectionCard = ({ title, children }) => (
        <section style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ padding: '12px 24px', borderBottom: '1px solid #c3c6d7', backgroundColor: '#f2f4f6' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, lineHeight: '26px', fontFamily: "'Hanken Grotesk', sans-serif", color: '#191c1e' }}>{title}</h3>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '0' }}>
                {children}
            </div>
        </section>
    );

    const hasNationalAddress = model.national_address && Object.values(model.national_address).some(v => v);

    const detailRows = [
        { label: 'Name', value: model.name },
        { label: 'Name (Arabic)', value: model.name_in_arabic },
        { label: 'Code', value: model.code },
        { label: 'Phone', value: model.phone },
        { label: 'Phone (Arabic)', value: model.phone_in_arabic },
        { label: 'Email', value: model.email },
        { label: 'Country', value: model.country_name },
    ].filter(r => r.value);

    const naRows = model.national_address ? [
        { label: 'Short Code', value: model.national_address.short_code },
        { label: 'Building Number', value: model.national_address.building_no },
        { label: 'Building Number (Arabic)', value: model.national_address.building_no_arabic },
        { label: 'Street Name', value: model.national_address.street_name },
        { label: 'Street Name (Arabic)', value: model.national_address.street_name_arabic },
        { label: 'District Name', value: model.national_address.district_name },
        { label: 'District Name (Arabic)', value: model.national_address.district_name_arabic },
        { label: 'City Name', value: model.national_address.city_name },
        { label: 'City Name (Arabic)', value: model.national_address.city_name_arabic },
        { label: 'Zipcode', value: model.national_address.zipcode },
        { label: 'Zipcode (Arabic)', value: model.national_address.zipcode_arabic },
        { label: 'Additional Number', value: model.national_address.additional_no },
        { label: 'Additional Number (Arabic)', value: model.national_address.additional_no_arabic },
        { label: 'Unit Number', value: model.national_address.unit_no },
        { label: 'Unit Number (Arabic)', value: model.national_address.unit_no_arabic },
    ].filter(r => r.value) : [];

    return (
        <Modal show={show} size="xl" onHide={handleClose} animation={false} scrollable={true}>
            <Modal.Body className="p-0" style={{ backgroundColor: '#f7f9fb', fontFamily: "'Inter', sans-serif", position: 'relative' }}>

                {/* Close button */}
                <button type="button" className="btn-close" onClick={handleClose} aria-label="Close"
                    style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 10 }} />

                {/* Page Header */}
                <div style={{ padding: '24px 32px 20px', gap: '16px', borderBottom: '1px solid #c3c6d7', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <button onClick={handleClose} style={{ display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #c3c6d7', backgroundColor: '#ffffff', color: '#434655', padding: '6px 12px', borderRadius: '4px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
                                <i className="bi bi-arrow-left" style={{ fontSize: '14px' }}></i>
                                Back
                            </button>
                            <h1 style={{ margin: 0, fontSize: '28px', lineHeight: '36px', fontWeight: 700, letterSpacing: '-0.02em', fontFamily: "'Hanken Grotesk', sans-serif", color: '#191c1e' }}>
                                {model.name}{model.name_in_arabic ? ' / ' + model.name_in_arabic : ''}
                            </h1>
                            {model.code && (
                                <span style={{ backgroundColor: '#dbeafe', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '2px 8px', borderRadius: '2px', fontSize: '12px', fontWeight: 500, lineHeight: '14px' }}>
                                    {model.code}
                                </span>
                            )}
                        </div>
                        {model.phone && (
                            <p style={{ margin: 0, fontSize: '14px', lineHeight: '20px', color: '#434655', fontWeight: 400 }}>
                                Phone: <span style={{ fontFamily: 'monospace', color: '#004ac6' }}>{model.phone}</span>
                            </p>
                        )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingRight: '32px' }}>
                        {props.openCreateForm && (
                            <button onClick={() => { handleClose(); props.openCreateForm(); }}
                                style={{ display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #c3c6d7', backgroundColor: '#f7f9fb', color: '#191c1e', padding: '8px 16px', borderRadius: '4px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                                <i className="bi bi-plus" style={{ fontSize: '18px' }}></i>
                                Create
                            </button>
                        )}
                        {props.openUpdateForm && (
                            <button onClick={() => { handleClose(); props.openUpdateForm(model.id); }}
                                style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#004ac6', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '4px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                                <i className="bi bi-pencil" style={{ fontSize: '16px' }}></i>
                                Edit
                            </button>
                        )}
                    </div>
                </div>

                {/* Main Content */}
                <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

                    {/* Warehouse Details */}
                    {detailRows.length > 0 && (
                        <SectionCard title="Warehouse Details">
                            {detailRows.map((row, idx) => (
                                <DetailRow key={row.label} label={row.label} value={row.value} isLast={idx === detailRows.length - 1} />
                            ))}
                        </SectionCard>
                    )}

                    {/* National Address */}
                    {hasNationalAddress && naRows.length > 0 && (
                        <SectionCard title="National Address">
                            {naRows.map((row, idx) => (
                                <DetailRow key={row.label} label={row.label} value={row.value} isLast={idx === naRows.length - 1} />
                            ))}
                        </SectionCard>
                    )}

                    {/* Metadata */}
                    {(model.created_at || model.created_by_name) && (
                        <section style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                            <div style={{ padding: '12px 24px', borderBottom: '1px solid #c3c6d7', backgroundColor: '#f2f4f6' }}>
                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, lineHeight: '26px', fontFamily: "'Hanken Grotesk', sans-serif", color: '#191c1e' }}>Metadata</h3>
                            </div>
                            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {model.created_by_name && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #c3c6d7' }}>
                                        <span style={{ fontSize: '14px', color: '#434655' }}>Created By</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#2563eb', color: '#eeefff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700 }}>
                                                {model.created_by_name ? model.created_by_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : ''}
                                            </div>
                                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e' }}>{model.created_by_name}</span>
                                        </div>
                                    </div>
                                )}
                                {model.updated_by_name && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #c3c6d7' }}>
                                        <span style={{ fontSize: '14px', color: '#434655' }}>Updated By</span>
                                        <span style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e' }}>{model.updated_by_name}</span>
                                    </div>
                                )}
                                {model.created_at && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #c3c6d7' }}>
                                        <span style={{ fontSize: '14px', color: '#434655' }}>Created At</span>
                                        <span style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e' }}>{formatInStoreTimezone(model.created_at)}</span>
                                    </div>
                                )}
                                {model.updated_at && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                        <span style={{ fontSize: '14px', color: '#434655', flexShrink: 0 }}>Updated At</span>
                                        <span style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e', textAlign: 'right' }}>{formatInStoreTimezone(model.updated_at)}</span>
                                    </div>
                                )}
                            </div>
                        </section>
                    )}

                </div>
            </Modal.Body>
            <Modal.Footer style={{ backgroundColor: '#ffffff', borderTop: '1px solid #c3c6d7', padding: '12px 32px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button onClick={handleClose} style={{ backgroundColor: '#d0e1fb', color: '#54647a', border: 'none', padding: '8px 24px', borderRadius: '4px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                    Cancel
                </button>
                <button onClick={handleClose} style={{ backgroundColor: '#004ac6', color: '#ffffff', border: 'none', padding: '8px 24px', borderRadius: '4px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                    Close
                </button>
            </Modal.Footer>
        </Modal>
    );
});

export default WarehouseView;
