import React, { useState, forwardRef, useImperativeHandle } from "react";
import { resolveImageUrl } from '../utils/imageUtils';
import { Modal } from 'react-bootstrap';
import { formatInStoreTimezone } from '../utils/dateUtils.js';
import { fetchStore } from '../utils/storeUtils.js';

const StoreView = forwardRef((props, ref) => {

    useImperativeHandle(ref, () => ({
        open(id) {
            if (id) {
                getStore(id);
                SetShow(true);
            }

        },

    }));


    let [model, setModel] = useState({});


    const [show, SetShow] = useState(false);

    function handleClose() {
        SetShow(false);
    };


    async function getStore(id) {
        try {
            const data = await fetchStore(id);
            setModel({ ...data });
        } catch (error) { }
    }


    return (<>
        <Modal show={show} size="xl" onHide={handleClose} animation={false} scrollable={true}>
            <Modal.Body className="p-0" style={{ backgroundColor: '#f7f9fb', fontFamily: "'Inter', sans-serif", position: 'relative' }}>

                {/* Close button - always top right */}
                <button
                    type="button"
                    className="btn-close"
                    onClick={handleClose}
                    aria-label="Close"
                    style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 10 }}
                ></button>

                {/* Page Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center flex-wrap" style={{ padding: '24px 32px 20px', gap: '16px', borderBottom: '1px solid #c3c6d7' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
<button onClick={handleClose} style={{ display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #c3c6d7', backgroundColor: '#ffffff', color: '#434655', padding: '6px 12px', borderRadius: '4px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
                                <i className="bi bi-arrow-left" style={{ fontSize: '14px' }}></i>
                                Back
                            </button>
                            <h1 style={{ margin: 0, fontSize: '30px', lineHeight: '38px', fontWeight: 700, letterSpacing: '-0.02em', fontFamily: "'Hanken Grotesk', sans-serif", color: '#191c1e' }}>
                                {model.name}
                            </h1>
                            {model.zatca?.phase && (
                                <span style={{ backgroundColor: '#dbeafe', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '2px 8px', borderRadius: '2px', fontSize: '12px', fontWeight: 500, lineHeight: '14px' }}>
                                    ZATCA Phase {model.zatca.phase}
                                </span>
                            )}
                            {model.zatca?.connected && (
                                <span style={{ backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', padding: '2px 8px', borderRadius: '2px', fontSize: '12px', fontWeight: 500, lineHeight: '14px' }}>
                                    Connected
                                </span>
                            )}
                        </div>
                        {model.business_category && (
                            <p style={{ margin: 0, fontSize: '14px', lineHeight: '20px', color: '#434655', fontWeight: 400 }}>
                                {model.business_category}
                            </p>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center" style={{ gap: '8px', paddingRight: '32px' }}>
                        {props.openCreateForm && (
                            <button onClick={() => { handleClose(); props.openCreateForm(); }} style={{ display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #c3c6d7', backgroundColor: '#f7f9fb', color: '#191c1e', padding: '8px 24px', borderRadius: '4px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                                <i className="bi bi-plus" style={{ fontSize: '18px' }}></i>
                                Create
                            </button>
                        )}
                        {props.openUpdateForm && (
                            <button onClick={() => { handleClose(); props.openUpdateForm(model.id); }} style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#004ac6', color: '#ffffff', border: 'none', padding: '8px 24px', borderRadius: '4px', fontSize: '13px', fontWeight: 600, lineHeight: '16px', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                                <i className="bi bi-pencil" style={{ fontSize: '18px' }}></i>
                                Edit
                            </button>
                        )}
                    </div>
                </div>

                {/* Main scrollable content */}
                <div className="p-md md:p-xl" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

                    {/* Summary Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-lg">

                        {/* VAT No */}
                        <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#434655', lineHeight: '16px' }}>VAT No.</span>
                            <span style={{ fontSize: '20px', fontWeight: 600, lineHeight: '32px', letterSpacing: '-0.01em', color: '#191c1e', fontFamily: "'Hanken Grotesk', sans-serif" }}>
                                {model.vat_no || '—'}
                            </span>
                            {model.vat_percent !== undefined && (
                                <div style={{ marginTop: '4px', fontSize: '12px', color: '#434655', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <i className="bi bi-percent" style={{ fontSize: '14px' }}></i>
                                    {model.vat_percent}% VAT
                                </div>
                            )}
                        </div>

                        {/* Phone */}
                        <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#434655', lineHeight: '16px' }}>Phone</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                <i className="bi bi-telephone" style={{ fontSize: '20px', color: '#505f76' }}></i>
                                <span style={{ fontSize: '18px', fontWeight: 600, lineHeight: '26px', color: '#191c1e', fontFamily: "'Hanken Grotesk', sans-serif" }}>
                                    {model.phone || '—'}
                                </span>
                            </div>
                        </div>

                        {/* Email */}
                        <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#434655', lineHeight: '16px' }}>Email</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                <i className="bi bi-envelope" style={{ fontSize: '20px', color: '#505f76' }}></i>
                                <span style={{ fontSize: '16px', fontWeight: 600, lineHeight: '26px', color: '#191c1e', fontFamily: "'Hanken Grotesk', sans-serif", wordBreak: 'break-all' }}>
                                    {model.email || '—'}
                                </span>
                            </div>
                        </div>

                        {/* Registration Number */}
                        <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#434655', lineHeight: '16px' }}>C.R No.</span>
                            <span style={{ fontSize: '18px', fontWeight: 600, lineHeight: '32px', letterSpacing: '-0.01em', color: '#191c1e', fontFamily: "'Hanken Grotesk', sans-serif" }}>
                                {model.registration_number || '—'}
                            </span>
                            {model.registration_number_in_arabic && (
                                <div style={{ fontSize: '12px', color: '#434655' }}>
                                    {model.registration_number_in_arabic}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Main Body Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 items-start" style={{ gap: '32px' }}>

                        {/* Left Column: Store Details */}
                        <div className="lg:col-span-8" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

                            {/* Basic Info Section */}
                            <section style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                <div style={{ padding: '12px 24px', borderBottom: '1px solid #c3c6d7', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f2f4f6' }}>
                                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, lineHeight: '26px', fontFamily: "'Hanken Grotesk', sans-serif", color: '#191c1e' }}>Store Information</h3>
                                </div>
                                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: '16px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <span style={{ fontSize: '12px', fontWeight: 500, color: '#434655', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name</span>
                                            <span style={{ fontSize: '14px', fontWeight: 600, color: '#191c1e' }}>{model.name || '—'}</span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <span style={{ fontSize: '12px', fontWeight: 500, color: '#434655', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name (Arabic)</span>
                                            <span style={{ fontSize: '14px', fontWeight: 600, color: '#191c1e', direction: 'rtl' }}>{model.name_in_arabic || '—'}</span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <span style={{ fontSize: '12px', fontWeight: 500, color: '#434655', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Title</span>
                                            <span style={{ fontSize: '14px', color: '#191c1e' }}>{model.title || '—'}</span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <span style={{ fontSize: '12px', fontWeight: 500, color: '#434655', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Title (Arabic)</span>
                                            <span style={{ fontSize: '14px', color: '#191c1e', direction: 'rtl' }}>{model.title_in_arabic || '—'}</span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <span style={{ fontSize: '12px', fontWeight: 500, color: '#434655', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Branch Code</span>
                                            <span style={{ fontSize: '14px', color: '#191c1e', fontFamily: 'monospace' }}>{model.code || '—'}</span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <span style={{ fontSize: '12px', fontWeight: 500, color: '#434655', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Branch Name</span>
                                            <span style={{ fontSize: '14px', color: '#191c1e' }}>{model.branch_name || '—'}</span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <span style={{ fontSize: '12px', fontWeight: 500, color: '#434655', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Address</span>
                                            <span style={{ fontSize: '14px', color: '#191c1e' }}>{model.address || '—'}</span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <span style={{ fontSize: '12px', fontWeight: 500, color: '#434655', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Address (Arabic)</span>
                                            <span style={{ fontSize: '14px', color: '#191c1e', direction: 'rtl' }}>{model.address_in_arabic || '—'}</span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <span style={{ fontSize: '12px', fontWeight: 500, color: '#434655', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Zipcode</span>
                                            <span style={{ fontSize: '14px', color: '#191c1e' }}>{model.zipcode || '—'}</span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <span style={{ fontSize: '12px', fontWeight: 500, color: '#434655', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Zipcode (Arabic)</span>
                                            <span style={{ fontSize: '14px', color: '#191c1e', direction: 'rtl' }}>{model.zipcode_in_arabic || '—'}</span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <span style={{ fontSize: '12px', fontWeight: 500, color: '#434655', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Phone (Arabic)</span>
                                            <span style={{ fontSize: '14px', color: '#191c1e', direction: 'rtl' }}>{model.phone_in_arabic || '—'}</span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <span style={{ fontSize: '12px', fontWeight: 500, color: '#434655', textTransform: 'uppercase', letterSpacing: '0.05em' }}>VAT No. (Arabic)</span>
                                            <span style={{ fontSize: '14px', color: '#191c1e', direction: 'rtl' }}>{model.vat_no_in_arabic || '—'}</span>
                                        </div>
                                    </div>

                                    {/* Logo */}
                                    <div style={{ paddingTop: '16px', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <span style={{ fontSize: '12px', fontWeight: 500, color: '#434655', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Logo</span>
                                        <img
                                            alt="Logo"
                                            src={resolveImageUrl(model.logo, model.id, "store") + "?" + Date.now()}
                                            key={model.logo}
                                            style={{ width: 100, height: 100, borderRadius: '8px', border: '1px solid #e2e8f0', objectFit: 'contain', backgroundColor: '#f7f9fb' }}
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* National Address */}
                            {model.national_address && (
                                <section style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                    <div style={{ padding: '12px 24px', borderBottom: '1px solid #c3c6d7', backgroundColor: '#f2f4f6' }}>
                                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, lineHeight: '26px', fontFamily: "'Hanken Grotesk', sans-serif", color: '#191c1e' }}>National Address</h3>
                                    </div>
                                    <div style={{ padding: '24px' }}>
                                        <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: '16px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <span style={{ fontSize: '12px', fontWeight: 500, color: '#434655', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Building Number</span>
                                                <span style={{ fontSize: '14px', color: '#191c1e' }}>{model.national_address.building_no || '—'}</span>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <span style={{ fontSize: '12px', fontWeight: 500, color: '#434655', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Building Number (Arabic)</span>
                                                <span style={{ fontSize: '14px', color: '#191c1e', direction: 'rtl' }}>{model.national_address.building_no_arabic || '—'}</span>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <span style={{ fontSize: '12px', fontWeight: 500, color: '#434655', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Street Name</span>
                                                <span style={{ fontSize: '14px', color: '#191c1e' }}>{model.national_address.street_name || '—'}</span>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <span style={{ fontSize: '12px', fontWeight: 500, color: '#434655', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Street Name (Arabic)</span>
                                                <span style={{ fontSize: '14px', color: '#191c1e', direction: 'rtl' }}>{model.national_address.street_name_arabic || '—'}</span>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <span style={{ fontSize: '12px', fontWeight: 500, color: '#434655', textTransform: 'uppercase', letterSpacing: '0.05em' }}>District Name</span>
                                                <span style={{ fontSize: '14px', color: '#191c1e' }}>{model.national_address.district_name || '—'}</span>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <span style={{ fontSize: '12px', fontWeight: 500, color: '#434655', textTransform: 'uppercase', letterSpacing: '0.05em' }}>District Name (Arabic)</span>
                                                <span style={{ fontSize: '14px', color: '#191c1e', direction: 'rtl' }}>{model.national_address.district_name_arabic || '—'}</span>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <span style={{ fontSize: '12px', fontWeight: 500, color: '#434655', textTransform: 'uppercase', letterSpacing: '0.05em' }}>City Name</span>
                                                <span style={{ fontSize: '14px', color: '#191c1e' }}>{model.national_address.city_name || '—'}</span>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <span style={{ fontSize: '12px', fontWeight: 500, color: '#434655', textTransform: 'uppercase', letterSpacing: '0.05em' }}>City Name (Arabic)</span>
                                                <span style={{ fontSize: '14px', color: '#191c1e', direction: 'rtl' }}>{model.national_address.city_name_arabic || '—'}</span>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <span style={{ fontSize: '12px', fontWeight: 500, color: '#434655', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ZipCode</span>
                                                <span style={{ fontSize: '14px', color: '#191c1e' }}>{model.national_address.zipcode || '—'}</span>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <span style={{ fontSize: '12px', fontWeight: 500, color: '#434655', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ZipCode (Arabic)</span>
                                                <span style={{ fontSize: '14px', color: '#191c1e', direction: 'rtl' }}>{model.national_address.zipcode_arabic || '—'}</span>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <span style={{ fontSize: '12px', fontWeight: 500, color: '#434655', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Additional Number</span>
                                                <span style={{ fontSize: '14px', color: '#191c1e' }}>{model.national_address.additional_no || '—'}</span>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <span style={{ fontSize: '12px', fontWeight: 500, color: '#434655', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Additional Number (Arabic)</span>
                                                <span style={{ fontSize: '14px', color: '#191c1e', direction: 'rtl' }}>{model.national_address.additional_no_arabic || '—'}</span>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <span style={{ fontSize: '12px', fontWeight: 500, color: '#434655', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Unit Number</span>
                                                <span style={{ fontSize: '14px', color: '#191c1e' }}>{model.national_address.unit_no || '—'}</span>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <span style={{ fontSize: '12px', fontWeight: 500, color: '#434655', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Unit Number (Arabic)</span>
                                                <span style={{ fontSize: '14px', color: '#191c1e', direction: 'rtl' }}>{model.national_address.unit_no_arabic || '—'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            )}

                            {/* Serial Numbers */}
                            <section style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                <div style={{ padding: '12px 24px', borderBottom: '1px solid #c3c6d7', backgroundColor: '#f2f4f6' }}>
                                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, lineHeight: '26px', fontFamily: "'Hanken Grotesk', sans-serif", color: '#191c1e' }}>Serial Numbers</h3>
                                </div>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                                        <thead style={{ backgroundColor: '#f1f5f9' }}>
                                            <tr style={{ fontSize: '13px', fontWeight: 600, color: '#434655', textTransform: 'uppercase', lineHeight: '16px' }}>
                                                <th style={{ padding: '12px 24px', fontWeight: 600 }}>Model</th>
                                                <th style={{ padding: '12px 24px', fontWeight: 600 }}>Prefix</th>
                                                <th style={{ padding: '12px 24px', fontWeight: 600 }}>Padding Count</th>
                                                <th style={{ padding: '12px 24px', fontWeight: 600 }}>Counting Start From</th>
                                            </tr>
                                        </thead>
                                        <tbody style={{ fontSize: '14px', lineHeight: '20px', color: '#191c1e' }}>
                                            {model.sales_serial_number && (
                                                <tr style={{ borderBottom: '1px solid #c3c6d7' }}>
                                                    <td style={{ padding: '12px 24px', fontWeight: 500 }}>Sales</td>
                                                    <td style={{ padding: '12px 24px', fontFamily: 'monospace', color: '#004ac6' }}>{model.sales_serial_number.prefix}</td>
                                                    <td style={{ padding: '12px 24px' }}>{model.sales_serial_number.padding_count}</td>
                                                    <td style={{ padding: '12px 24px' }}>{model.sales_serial_number.start_from_count}</td>
                                                </tr>
                                            )}
                                            {model.sales_return_serial_number && (
                                                <tr style={{ borderBottom: '1px solid #c3c6d7' }}>
                                                    <td style={{ padding: '12px 24px', fontWeight: 500 }}>Sales Return</td>
                                                    <td style={{ padding: '12px 24px', fontFamily: 'monospace', color: '#004ac6' }}>{model.sales_return_serial_number.prefix}</td>
                                                    <td style={{ padding: '12px 24px' }}>{model.sales_return_serial_number.padding_count}</td>
                                                    <td style={{ padding: '12px 24px' }}>{model.sales_return_serial_number.start_from_count}</td>
                                                </tr>
                                            )}
                                            {model.purchase_serial_number && (
                                                <tr style={{ borderBottom: '1px solid #c3c6d7' }}>
                                                    <td style={{ padding: '12px 24px', fontWeight: 500 }}>Purchase</td>
                                                    <td style={{ padding: '12px 24px', fontFamily: 'monospace', color: '#004ac6' }}>{model.purchase_serial_number.prefix}</td>
                                                    <td style={{ padding: '12px 24px' }}>{model.purchase_serial_number.padding_count}</td>
                                                    <td style={{ padding: '12px 24px' }}>{model.purchase_serial_number.start_from_count}</td>
                                                </tr>
                                            )}
                                            {model.purchase_return_serial_number && (
                                                <tr style={{ borderBottom: '1px solid #c3c6d7' }}>
                                                    <td style={{ padding: '12px 24px', fontWeight: 500 }}>Purchase Return</td>
                                                    <td style={{ padding: '12px 24px', fontFamily: 'monospace', color: '#004ac6' }}>{model.purchase_return_serial_number.prefix}</td>
                                                    <td style={{ padding: '12px 24px' }}>{model.purchase_return_serial_number.padding_count}</td>
                                                    <td style={{ padding: '12px 24px' }}>{model.purchase_return_serial_number.start_from_count}</td>
                                                </tr>
                                            )}
                                            {model.quotation_serial_number && (
                                                <tr style={{ borderBottom: '1px solid #c3c6d7' }}>
                                                    <td style={{ padding: '12px 24px', fontWeight: 500 }}>Quotation</td>
                                                    <td style={{ padding: '12px 24px', fontFamily: 'monospace', color: '#004ac6' }}>{model.quotation_serial_number.prefix}</td>
                                                    <td style={{ padding: '12px 24px' }}>{model.quotation_serial_number.padding_count}</td>
                                                    <td style={{ padding: '12px 24px' }}>{model.quotation_serial_number.start_from_count}</td>
                                                </tr>
                                            )}
                                            {model.customer_serial_number && (
                                                <tr style={{ borderBottom: '1px solid #c3c6d7' }}>
                                                    <td style={{ padding: '12px 24px', fontWeight: 500 }}>Customer</td>
                                                    <td style={{ padding: '12px 24px', fontFamily: 'monospace', color: '#004ac6' }}>{model.customer_serial_number.prefix}</td>
                                                    <td style={{ padding: '12px 24px' }}>{model.customer_serial_number.padding_count}</td>
                                                    <td style={{ padding: '12px 24px' }}>{model.customer_serial_number.start_from_count}</td>
                                                </tr>
                                            )}
                                            {model.vendor_serial_number && (
                                                <tr>
                                                    <td style={{ padding: '12px 24px', fontWeight: 500 }}>Vendor</td>
                                                    <td style={{ padding: '12px 24px', fontFamily: 'monospace', color: '#004ac6' }}>{model.vendor_serial_number.prefix}</td>
                                                    <td style={{ padding: '12px 24px' }}>{model.vendor_serial_number.padding_count}</td>
                                                    <td style={{ padding: '12px 24px' }}>{model.vendor_serial_number.start_from_count}</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </section>

                            {/* Bank Account */}
                            {model.bank_account && (
                                <section style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                    <div style={{ padding: '12px 24px', borderBottom: '1px solid #c3c6d7', backgroundColor: '#f2f4f6' }}>
                                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, lineHeight: '26px', fontFamily: "'Hanken Grotesk', sans-serif", color: '#191c1e' }}>Bank Account</h3>
                                    </div>
                                    <div style={{ padding: '24px' }}>
                                        <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: '16px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <span style={{ fontSize: '12px', fontWeight: 500, color: '#434655', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bank Name</span>
                                                <span style={{ fontSize: '14px', color: '#191c1e' }}>{model.bank_account.bank_name || '—'}</span>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <span style={{ fontSize: '12px', fontWeight: 500, color: '#434655', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Customer No.</span>
                                                <span style={{ fontSize: '14px', color: '#191c1e', fontFamily: 'monospace' }}>{model.bank_account.customer_no || '—'}</span>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <span style={{ fontSize: '12px', fontWeight: 500, color: '#434655', textTransform: 'uppercase', letterSpacing: '0.05em' }}>IBAN</span>
                                                <span style={{ fontSize: '14px', color: '#004ac6', fontFamily: 'monospace' }}>{model.bank_account.iban || '—'}</span>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <span style={{ fontSize: '12px', fontWeight: 500, color: '#434655', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Account Name</span>
                                                <span style={{ fontSize: '14px', color: '#191c1e' }}>{model.bank_account.account_name || '—'}</span>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <span style={{ fontSize: '12px', fontWeight: 500, color: '#434655', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Account No.</span>
                                                <span style={{ fontSize: '14px', color: '#191c1e', fontFamily: 'monospace' }}>{model.bank_account.account_no || '—'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            )}
                        </div>

                        {/* Right Column: Sidebar */}
                        <div className="lg:col-span-4" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

                            {/* ZATCA Info Card */}
                            <section style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                <div style={{ padding: '12px 24px', borderBottom: '1px solid #c3c6d7', backgroundColor: '#f2f4f6' }}>
                                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, lineHeight: '26px', fontFamily: "'Hanken Grotesk', sans-serif", color: '#191c1e' }}>ZATCA</h3>
                                </div>
                                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #c3c6d7' }}>
                                        <span style={{ fontSize: '14px', color: '#434655' }}>Phase</span>
                                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#191c1e' }}>
                                            {model.zatca?.phase ? "Phase " + model.zatca.phase : "Phase 1"}
                                        </span>
                                    </div>
                                    {model.zatca?.phase === "2" && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #c3c6d7' }}>
                                            <span style={{ fontSize: '14px', color: '#434655' }}>Environment</span>
                                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e' }}>{model.zatca?.env || '—'}</span>
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #c3c6d7' }}>
                                        <span style={{ fontSize: '14px', color: '#434655' }}>Connected</span>
                                        <span style={{
                                            fontSize: '13px', fontWeight: 600,
                                            color: model.zatca?.connected ? '#15803d' : '#ba1a1a',
                                            backgroundColor: model.zatca?.connected ? '#dcfce7' : '#fee2e2',
                                            border: model.zatca?.connected ? '1px solid #bbf7d0' : '1px solid #fecaca',
                                            padding: '2px 8px', borderRadius: '2px'
                                        }}>
                                            {model.zatca?.connected ? 'YES' : 'NO'}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', paddingBottom: '8px', borderBottom: '1px solid #c3c6d7' }}>
                                        <span style={{ fontSize: '14px', color: '#434655', flexShrink: 0 }}>Last Connected At</span>
                                        <span style={{ fontSize: '13px', fontWeight: 500, color: '#191c1e', textAlign: 'right' }}>
                                            {model.zatca?.last_connected_at
                                                ? formatInStoreTimezone(model.zatca.last_connected_at)
                                                : <span style={{ fontStyle: 'italic', color: '#434655' }}>Not set</span>}
                                        </span>
                                    </div>
                                    {/* Connection failures */}
                                    {(model.zatca?.connection_failed_count > 0 || model.zatca?.connection_errors?.length > 0) && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '13px', color: '#ba1a1a' }}>Connection Failed Count</span>
                                                <span style={{ fontSize: '13px', fontWeight: 700, color: '#ba1a1a' }}>{model.zatca?.connection_failed_count}</span>
                                            </div>
                                            {model.zatca?.connection_last_failed_at && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                    <span style={{ fontSize: '12px', color: '#ba1a1a' }}>Last Failed At</span>
                                                    <span style={{ fontSize: '12px', color: '#ba1a1a' }}>
                                                        {formatInStoreTimezone(model.zatca.connection_last_failed_at)}
                                                    </span>
                                                </div>
                                            )}
                                            {model.zatca?.connection_errors?.length > 0 && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    <span style={{ fontSize: '12px', fontWeight: 500, color: '#ba1a1a' }}>Connection Errors</span>
                                                    <ol style={{ fontSize: '12px', color: '#ba1a1a', paddingLeft: '16px', margin: 0 }}>
                                                        {model.zatca.connection_errors.map((error, i) => (
                                                            <li key={i}>{error}</li>
                                                        ))}
                                                    </ol>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* Metadata Card */}
                            <section style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                <div style={{ padding: '12px 24px', borderBottom: '1px solid #c3c6d7', backgroundColor: '#f2f4f6' }}>
                                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, lineHeight: '26px', fontFamily: "'Hanken Grotesk', sans-serif", color: '#191c1e' }}>Metadata</h3>
                                </div>
                                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #c3c6d7' }}>
                                        <span style={{ fontSize: '14px', color: '#434655' }}>Created By</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#2563eb', color: '#eeefff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700 }}>
                                                {model.created_by_name ? model.created_by_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : ''}
                                            </div>
                                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e' }}>{model.created_by_name}</span>
                                        </div>
                                    </div>
                                    {model.created_at && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #c3c6d7' }}>
                                            <span style={{ fontSize: '14px', color: '#434655' }}>Created At</span>
                                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e' }}>{formatInStoreTimezone(model.created_at)}</span>
                                        </div>
                                    )}
                                    {model.updated_by_name && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #c3c6d7' }}>
                                            <span style={{ fontSize: '14px', color: '#434655' }}>Updated By</span>
                                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e' }}>{model.updated_by_name}</span>
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
                <button onClick={handleClose} style={{ backgroundColor: '#004ac6', color: '#ffffff', border: 'none', padding: '8px 24px', borderRadius: '4px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                    Close
                </button>
            </Modal.Footer>
        </Modal>
    </>);

});

export default StoreView;
