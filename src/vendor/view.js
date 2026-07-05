import React, { useState, forwardRef, useImperativeHandle, useRef } from "react";
import { Modal } from 'react-bootstrap';
import ImageGallery from '../utils/ImageGallery.js';
import { ObjectToSearchQueryParams } from '../utils/queryUtils.js';
import { formatInStoreTimezone } from '../utils/dateUtils.js';

const VendorView = forwardRef((props, ref) => {
    const timerRef = useRef(null);
    const ImageGalleryRef = useRef();

    useImperativeHandle(ref, () => ({
        async open(id) {
            if (id) {
                await getVendor(id);
                if (timerRef.current) clearTimeout(timerRef.current);
                timerRef.current = setTimeout(() => {
                    ImageGalleryRef.current?.open();
                }, 300);
                SetShow(true);
            }
        },
    }));

    let [model, setModel] = useState({});
    const [show, SetShow] = useState(false);

    function handleClose() { SetShow(false); }

    async function getVendor(id) {
        const requestOptions = {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', 'Authorization': localStorage.getItem('access_token') },
        };
        let searchParams = {};
        if (localStorage.getItem("store_id")) searchParams.store_id = localStorage.getItem("store_id");
        let queryParams = ObjectToSearchQueryParams(searchParams);
        await fetch('/v1/vendor/' + id + "?" + queryParams, requestOptions)
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();
                if (!response.ok) return Promise.reject(data && data.errors);
                model = data.result;
                setModel({ ...model });
            })
            .catch(() => {});
    }

    const rowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid #c3c6d7', gap: '16px' };
    const labelStyle = { fontSize: '14px', color: '#434655', flexShrink: 0, minWidth: '160px' };
    const valueStyle = { fontSize: '14px', fontWeight: 500, color: '#191c1e', textAlign: 'right' };

    return (<>
        <Modal show={show} size="xl" onHide={handleClose} animation={false} scrollable={true}>
            <Modal.Body className="p-0" style={{ backgroundColor: '#f7f9fb', fontFamily: "'Inter', sans-serif", position: 'relative' }}>

                {/* Close button */}
                <button type="button" className="btn-close" onClick={handleClose} aria-label="Close"
                    style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 10 }} />

                {/* Page Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center flex-wrap"
                    style={{ padding: '24px 32px 20px', gap: '16px', borderBottom: '1px solid #c3c6d7' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <button onClick={handleClose} style={{ display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #c3c6d7', backgroundColor: '#ffffff', color: '#434655', padding: '6px 12px', borderRadius: '4px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
                                <i className="bi bi-arrow-left" style={{ fontSize: '14px' }}></i> Back
                            </button>
                            <h1 style={{ margin: 0, fontSize: '30px', lineHeight: '38px', fontWeight: 700, letterSpacing: '-0.02em', fontFamily: "'Hanken Grotesk', sans-serif", color: '#191c1e' }}>
                                {model.name || 'Vendor Details'}
                            </h1>
                            {model.title && (
                                <span style={{ backgroundColor: '#dbeafe', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '2px 8px', borderRadius: '2px', fontSize: '12px', fontWeight: 500 }}>
                                    {model.title}
                                </span>
                            )}
                        </div>
                        {model.phone && (
                            <p style={{ margin: 0, fontSize: '14px', color: '#434655' }}>
                                <i className="bi bi-telephone" style={{ marginRight: '6px' }}></i>{model.phone}
                                {model.email && <span style={{ marginLeft: '16px' }}><i className="bi bi-envelope" style={{ marginRight: '6px' }}></i>{model.email}</span>}
                            </p>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center" style={{ gap: '8px', paddingRight: '32px' }}>
                        {props.openCreateForm && (
                            <button onClick={() => { handleClose(); props.openCreateForm(); }} style={{ display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #c3c6d7', backgroundColor: '#f7f9fb', color: '#191c1e', padding: '8px 24px', borderRadius: '4px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                                <i className="bi bi-plus" style={{ fontSize: '18px' }}></i> Create
                            </button>
                        )}
                        {props.openUpdateForm && (
                            <button onClick={() => { handleClose(); props.openUpdateForm(model.id); }} style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#004ac6', color: '#ffffff', border: 'none', padding: '8px 24px', borderRadius: '4px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                                <i className="bi bi-pencil" style={{ fontSize: '18px' }}></i> Edit
                            </button>
                        )}
                    </div>
                </div>

                <div className="p-md md:p-xl" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-lg">
                        <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#434655' }}>Phone</span>
                            <span style={{ fontSize: '18px', fontWeight: 600, color: '#191c1e', fontFamily: "'Hanken Grotesk', sans-serif" }}>{model.phone || '—'}</span>
                            {model.phone_in_arabic && <span style={{ fontSize: '12px', color: '#434655' }}>{model.phone_in_arabic}</span>}
                        </div>
                        <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#434655' }}>VAT No.</span>
                            <span style={{ fontSize: '18px', fontWeight: 600, color: '#191c1e', fontFamily: "'Hanken Grotesk', sans-serif" }}>{model.vat_no || '—'}</span>
                            {model.vat_no_in_arabic && <span style={{ fontSize: '12px', color: '#434655' }}>{model.vat_no_in_arabic}</span>}
                        </div>
                        <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#434655' }}>C.R No.</span>
                            <span style={{ fontSize: '16px', fontWeight: 600, color: '#191c1e', fontFamily: "'Hanken Grotesk', sans-serif" }}>{model.registration_number || '—'}</span>
                        </div>
                        <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#434655' }}>VAT %</span>
                            <span style={{ fontSize: '24px', fontWeight: 600, color: '#004ac6', fontFamily: "'Hanken Grotesk', sans-serif" }}>
                                {model.vat_percent != null ? `${model.vat_percent}%` : '—'}
                            </span>
                        </div>
                    </div>

                    {/* Main Body Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 items-start" style={{ gap: '32px' }}>

                        {/* Left: Details + Photos */}
                        <div className="lg:col-span-8" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

                            {/* Contact & Identity */}
                            <section style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                <div style={{ padding: '12px 24px', borderBottom: '1px solid #c3c6d7', backgroundColor: '#f2f4f6' }}>
                                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, fontFamily: "'Hanken Grotesk', sans-serif", color: '#191c1e' }}>Contact Details</h3>
                                </div>
                                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
                                    {[
                                        { label: 'Name', value: model.name },
                                        { label: 'Name (Arabic)', value: model.name_in_arabic },
                                        { label: 'Title', value: model.title },
                                        { label: 'Title (Arabic)', value: model.title_in_arabic },
                                        { label: 'Phone', value: model.phone },
                                        { label: 'Phone (Arabic)', value: model.phone_in_arabic },
                                        { label: 'Email', value: model.email },
                                        { label: 'Address', value: model.address },
                                        { label: 'Address (Arabic)', value: model.address_in_arabic },
                                        { label: 'VAT No.', value: model.vat_no },
                                        { label: 'VAT No. (Arabic)', value: model.vat_no_in_arabic },
                                        { label: 'VAT %', value: model.vat_percent != null ? `${model.vat_percent}%` : null },
                                        { label: 'C.R No.', value: model.registration_number },
                                        { label: 'C.R No. (Arabic)', value: model.registration_number_in_arabic },
                                    ].filter(r => r.value).map((r, i, arr) => (
                                        <div key={r.label} style={{ ...rowStyle, borderBottom: i < arr.length - 1 ? '1px solid #c3c6d7' : 'none' }}>
                                            <span style={labelStyle}>{r.label}</span>
                                            <span style={valueStyle}>{r.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* National Address */}
                            {model.national_address && (
                                <section style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                    <div style={{ padding: '12px 24px', borderBottom: '1px solid #c3c6d7', backgroundColor: '#f2f4f6' }}>
                                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, fontFamily: "'Hanken Grotesk', sans-serif", color: '#191c1e' }}>National Address</h3>
                                    </div>
                                    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
                                        {[
                                            { label: 'Application No.', value: model.national_address.application_no, arabic: model.national_address.application_no_arabic },
                                            { label: 'Service No.', value: model.national_address.service_no, arabic: model.national_address.service_no_arabic },
                                            { label: 'Customer Account No.', value: model.national_address.customer_account_no, arabic: model.national_address.customer_account_no_arabic },
                                            { label: 'Building No.', value: model.national_address.building_no, arabic: model.national_address.building_no_arabic },
                                            { label: 'Street Name', value: model.national_address.street_name, arabic: model.national_address.street_name_arabic },
                                            { label: 'District', value: model.national_address.district_name, arabic: model.national_address.district_name_arabic },
                                            { label: 'City', value: model.national_address.city_name, arabic: model.national_address.city_name_arabic },
                                            { label: 'Zip Code', value: model.national_address.zipcode, arabic: model.national_address.zipcode_arabic },
                                            { label: 'Additional No.', value: model.national_address.additional_no, arabic: model.national_address.additional_no_arabic },
                                            { label: 'Unit No.', value: model.national_address.unit_no, arabic: model.national_address.unit_no_arabic },
                                        ].filter(r => r.value || r.arabic).map((r, i, arr) => (
                                            <div key={r.label} style={{ ...rowStyle, borderBottom: i < arr.length - 1 ? '1px solid #c3c6d7' : 'none' }}>
                                                <span style={labelStyle}>{r.label}</span>
                                                <span style={valueStyle}>{r.value}{r.arabic ? ` / ${r.arabic}` : ''}</span>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Photos */}
                            <section style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                <div style={{ padding: '12px 24px', borderBottom: '1px solid #c3c6d7', backgroundColor: '#f2f4f6' }}>
                                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, fontFamily: "'Hanken Grotesk', sans-serif", color: '#191c1e' }}>Vendor Photos</h3>
                                </div>
                                <div style={{ padding: '24px' }}>
                                    <ImageGallery ref={ImageGalleryRef} id={model.id} storeID={model.store_id} storedImages={model.images} modelName={"vendor"} />
                                </div>
                            </section>
                        </div>

                        {/* Right: Metadata */}
                        <div className="lg:col-span-4" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                            <section style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                <div style={{ padding: '12px 24px', borderBottom: '1px solid #c3c6d7', backgroundColor: '#f2f4f6' }}>
                                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, fontFamily: "'Hanken Grotesk', sans-serif", color: '#191c1e' }}>Metadata</h3>
                                </div>
                                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #c3c6d7' }}>
                                        <span style={{ fontSize: '14px', color: '#434655' }}>Created By</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#2563eb', color: '#eeefff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700 }}>
                                                {model.created_by_name ? model.created_by_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : ''}
                                            </div>
                                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e' }}>{model.created_by_name || '—'}</span>
                                        </div>
                                    </div>
                                    {model.updated_by_name && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #c3c6d7' }}>
                                            <span style={{ fontSize: '14px', color: '#434655' }}>Updated By</span>
                                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e' }}>{model.updated_by_name}</span>
                                        </div>
                                    )}
                                    {model.created_at && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', paddingBottom: '8px', borderBottom: '1px solid #c3c6d7' }}>
                                            <span style={{ fontSize: '14px', color: '#434655', flexShrink: 0 }}>Created At</span>
                                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e', textAlign: 'right' }}>{formatInStoreTimezone(model.created_at)}</span>
                                        </div>
                                    )}
                                    {model.updated_at && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                            <span style={{ fontSize: '14px', color: '#434655', flexShrink: 0 }}>Last Updated</span>
                                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e', textAlign: 'right' }}>{formatInStoreTimezone(model.updated_at)}</span>
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            </Modal.Body>

            <Modal.Footer style={{ backgroundColor: '#ffffff', borderTop: '1px solid #c3c6d7', padding: '12px 32px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button onClick={handleClose} style={{ backgroundColor: '#d0e1fb', color: '#54647a', border: 'none', padding: '8px 24px', borderRadius: '4px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                    Cancel
                </button>
                {props.openUpdateForm && (
                    <button onClick={() => { handleClose(); props.openUpdateForm(model.id); }} style={{ backgroundColor: '#004ac6', color: '#ffffff', border: 'none', padding: '8px 24px', borderRadius: '4px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                        Edit Vendor
                    </button>
                )}
            </Modal.Footer>
        </Modal>
    </>);
});

export default VendorView;
