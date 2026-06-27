import React, { useState, forwardRef, useImperativeHandle, useRef } from "react";
import { Modal } from 'react-bootstrap';
import CustomerDepositPreview from './preview.js';
import AttachmentsViewer from '../utils/AttachmentsViewer.js';

const CustomerDepositView = forwardRef((props, ref) => {
    useImperativeHandle(ref, () => ({
        open(id) {
            if (id) {
                getCustomerDeposit(id);
                SetShow(true);
            }
        },

    }));


    let [model, setModel] = useState({});


    const [show, SetShow] = useState(false);

    function handleClose() {
        SetShow(false);
    };

    function ObjectToSearchQueryParams(object) {
        return Object.keys(object)
            .map(function (key) {
                return `search[${key}]=` + object[key];
            })
            .join("&");
    }

    function getCustomerDeposit(id) {
        console.log("inside get CustomerDeposit");
        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': localStorage.getItem('access_token'),
            },
        };



        let searchParams = {};
        if (localStorage.getItem("store_id")) {
            searchParams.store_id = localStorage.getItem("store_id");
        }
        let queryParams = ObjectToSearchQueryParams(searchParams);


        fetch('/v1/customer-deposit/' + id + "?" + queryParams, requestOptions)
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();

                // check for error response
                if (!response.ok) {
                    const error = (data && data.errors);
                    return Promise.reject(error);
                }

                console.log("Response:");
                console.log(data);

                model = data.result;

                setModel({ ...model });
            })
            .catch(error => {
                // setErrors(error);
            });
    }



    const PreviewRef = useRef();
    function openPreview() {
        PreviewRef.current.open(model, undefined, "customer_deposit");
    }

    function sendWhatsAppMessage() {
        PreviewRef.current.open(model, "whatsapp", "whatsapp_customer_deposit");
    }

    const countryTimezoneMap = {
        'SA': 'Asia/Riyadh', 'AE': 'Asia/Dubai', 'KW': 'Asia/Kuwait',
        'QA': 'Asia/Qatar', 'BH': 'Asia/Bahrain', 'OM': 'Asia/Muscat',
        'IN': 'Asia/Kolkata', 'PK': 'Asia/Karachi', 'BD': 'Asia/Dhaka',
        'LK': 'Asia/Colombo', 'NP': 'Asia/Kathmandu', 'MY': 'Asia/Kuala_Lumpur',
        'SG': 'Asia/Singapore', 'PH': 'Asia/Manila', 'ID': 'Asia/Jakarta',
        'EG': 'Africa/Cairo', 'JO': 'Asia/Amman', 'LB': 'Asia/Beirut',
        'IQ': 'Asia/Baghdad', 'IR': 'Asia/Tehran', 'TR': 'Europe/Istanbul',
        'GB': 'Europe/London', 'DE': 'Europe/Berlin', 'FR': 'Europe/Paris',
        'US': 'America/New_York', 'CA': 'America/Toronto', 'AU': 'Australia/Sydney',
    };

    function formatPaymentMethod(method) {
        if (!method) return "—";
        return method.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }

    function formatInStoreTimezone(dateStr) {
        if (!dateStr) return '';
        const tz = countryTimezoneMap[localStorage.getItem('store_country_code')] || 'UTC';
        const tzLabel = tz.replace('_', ' ');
        try {
            const d = new Date(dateStr);
            const formatted = d.toLocaleString('en-US', {
                timeZone: tz,
                year: 'numeric', month: 'short', day: '2-digit',
                hour: '2-digit', minute: '2-digit', second: '2-digit',
                hour12: true,
            });
            return `${formatted} (${tzLabel})`;
        } catch {
            return dateStr;
        }
    }

    return (<>
        <CustomerDepositPreview ref={PreviewRef} />

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
                                Customer Receivable #{model.code}
                            </h1>
                            {model.payment_method && (
                                <span style={{ backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', padding: '2px 8px', borderRadius: '2px', fontSize: '12px', fontWeight: 500, lineHeight: '14px' }}>
                                    {formatPaymentMethod(model.payment_method)}
                                </span>
                            )}
                        </div>
                        {model.date && (
                            <p style={{ margin: 0, fontSize: '14px', lineHeight: '20px', color: '#434655', fontWeight: 400 }}>
                                Received on {formatInStoreTimezone(model.date)}
                            </p>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center" style={{ gap: '8px', paddingRight: '32px' }}>
                        <button onClick={sendWhatsAppMessage} style={{ display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #c3c6d7', backgroundColor: '#f7f9fb', color: '#191c1e', padding: '8px 24px', borderRadius: '4px', fontSize: '13px', fontWeight: 600, lineHeight: '16px', cursor: 'pointer' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16" style={{ flexShrink: 0 }}>
                                <path d="M13.601 2.326A7.875 7.875 0 0 0 8.036 0C3.596 0 0 3.597 0 8.036c0 1.417.37 2.805 1.07 4.03L0 16l3.993-1.05a7.968 7.968 0 0 0 4.043 1.085h.003c4.44 0 8.036-3.596 8.036-8.036 0-2.147-.836-4.166-2.37-5.673ZM8.036 14.6a6.584 6.584 0 0 1-3.35-.92l-.24-.142-2.37.622.63-2.31-.155-.238a6.587 6.587 0 0 1-1.018-3.513c0-3.637 2.96-6.6 6.6-6.6 1.764 0 3.42.69 4.67 1.94a6.56 6.56 0 0 1 1.93 4.668c0 3.637-2.96 6.6-6.6 6.6Zm3.61-4.885c-.198-.1-1.17-.578-1.352-.644-.18-.066-.312-.1-.444.1-.13.197-.51.644-.626.775-.115.13-.23.15-.428.05-.198-.1-.837-.308-1.594-.983-.59-.525-.99-1.174-1.11-1.372-.116-.198-.012-.305.088-.403.09-.09.198-.23.298-.345.1-.115.132-.197.2-.33.065-.13.032-.247-.017-.345-.05-.1-.444-1.07-.61-1.46-.16-.384-.323-.332-.444-.338l-.378-.007c-.13 0-.344.048-.525.23s-.688.672-.688 1.64c0 .967.704 1.9.802 2.03.1.13 1.386 2.116 3.365 2.963.47.203.837.324 1.122.414.472.15.902.13 1.24.08.378-.057 1.17-.48 1.336-.942.165-.462.165-.858.116-.943-.048-.084-.18-.132-.378-.23Z" />
                            </svg>
                            Share
                        </button>
                        <button onClick={openPreview} style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#004ac6', color: '#ffffff', border: 'none', padding: '8px 24px', borderRadius: '4px', fontSize: '13px', fontWeight: 600, lineHeight: '16px', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                            <i className="bi bi-printer" style={{ fontSize: '18px' }}></i>
                            Print
                        </button>
                        {props.openCreateForm && (
                            <button onClick={() => { handleClose(); props.openCreateForm(); }} style={{ display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #c3c6d7', backgroundColor: '#f7f9fb', color: '#191c1e', padding: '8px 24px', borderRadius: '4px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                                <i className="bi bi-plus" style={{ fontSize: '18px' }}></i>
                                Create
                            </button>
                        )}
                        {props.openUpdateForm && (
                            <button onClick={() => { handleClose(); props.openUpdateForm(model.id); }} style={{ display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #c3c6d7', backgroundColor: '#f7f9fb', color: '#191c1e', padding: '8px 24px', borderRadius: '4px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
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

                        {/* Net Total */}
                        <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#434655', lineHeight: '16px' }}>Net Total</span>
                            <span style={{ fontSize: '24px', fontWeight: 600, lineHeight: '32px', letterSpacing: '-0.01em', color: '#004ac6', fontFamily: "'Hanken Grotesk', sans-serif" }}>
                                {model.net_total != null ? Number(model.net_total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                            </span>
                            <div style={{ marginTop: '4px', fontSize: '12px', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <i className="bi bi-arrow-down-circle" style={{ fontSize: '14px' }}></i>
                                Receivable
                            </div>
                        </div>

                        {/* Payment Methods */}
                        <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#434655', lineHeight: '16px' }}>Payment Methods</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                                <i className="bi bi-wallet2" style={{ fontSize: '18px', color: '#505f76' }}></i>
                                {model.payment_methods && model.payment_methods.length > 0
                                    ? model.payment_methods.map((m, i) => (
                                        <span key={i} style={{ fontSize: '14px', fontWeight: 600, color: '#191c1e', fontFamily: "'Hanken Grotesk', sans-serif" }}>
                                            {formatPaymentMethod(m)}{i < model.payment_methods.length - 1 ? ', ' : ''}
                                        </span>
                                    ))
                                    : <span style={{ fontSize: '16px', fontWeight: 600, color: '#191c1e' }}>—</span>
                                }
                            </div>
                        </div>

                        {/* Customer */}
                        <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#434655', lineHeight: '16px' }}>Customer</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                <i className="bi bi-person-circle" style={{ fontSize: '20px', color: '#505f76' }}></i>
                                <span style={{ fontSize: '16px', fontWeight: 600, lineHeight: '24px', color: '#191c1e', fontFamily: "'Hanken Grotesk', sans-serif" }}>
                                    {model.customer_name || '—'}
                                </span>
                            </div>
                        </div>

                        {/* Date */}
                        <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#434655', lineHeight: '16px' }}>Date</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                <i className="bi bi-calendar3" style={{ fontSize: '20px', color: '#505f76' }}></i>
                                <span style={{ fontSize: '14px', fontWeight: 600, color: '#191c1e', fontFamily: "'Hanken Grotesk', sans-serif" }}>
                                    {formatInStoreTimezone(model.date)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Main Body Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 items-start" style={{ gap: '32px' }}>

                        {/* Left Column: Deposit Details & Payments & Images */}
                        <div className="lg:col-span-8" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

                            {/* Deposit Details Section */}
                            <section style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                <div style={{ padding: '12px 24px', borderBottom: '1px solid #c3c6d7', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#f2f4f6' }}>
                                    <i className="bi bi-receipt" style={{ color: '#505f76' }}></i>
                                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, lineHeight: '26px', fontFamily: "'Hanken Grotesk', sans-serif", color: '#191c1e' }}>Deposit Details</h3>
                                </div>
                                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '0px' }}>
                                    {[
                                        { label: 'Code', value: model.code, mono: true },
                                        { label: 'Net Total', value: model.net_total != null ? Number(model.net_total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : null, bold: true },
                                        { label: 'Total', value: model.total != null ? Number(model.total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : null },
                                        { label: 'Discount', value: model.total_discount != null && model.total_discount > 0 ? Number(model.total_discount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : null },
                                        { label: 'Customer', value: model.customer_name },
                                        { label: 'Date', value: formatInStoreTimezone(model.date) },
                                        { label: 'Bank Reference No.', value: model.bank_reference_no },
                                        { label: 'Description', value: model.description },
                                        { label: 'Remarks', value: model.remarks },
                                    ].filter(r => r.value).map(({ label, value, mono, bold }, i, arr) => (
                                        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '12px 0', borderBottom: i < arr.length - 1 ? '1px solid #c3c6d7' : 'none', gap: '16px' }}>
                                            <span style={{ fontSize: '14px', color: '#434655', flexShrink: 0 }}>{label}</span>
                                            <span style={{ fontSize: '14px', fontWeight: bold ? 700 : 500, color: mono ? '#004ac6' : '#191c1e', fontFamily: mono ? 'monospace' : 'inherit', textAlign: 'right' }}>{value}</span>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* Payments Section */}
                            {model.payments && model.payments.length > 0 && (
                                <section style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                    <div style={{ padding: '12px 24px', borderBottom: '1px solid #c3c6d7', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#f2f4f6' }}>
                                        <i className="bi bi-clock-history" style={{ color: '#505f76' }}></i>
                                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, lineHeight: '26px', fontFamily: "'Hanken Grotesk', sans-serif", color: '#191c1e' }}>Payments</h3>
                                    </div>
                                    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        {model.payments.map((payment, i) => (
                                            <div key={i} className="grid grid-cols-1 md:grid-cols-3" style={{ gap: '16px', padding: '16px', backgroundColor: '#f2f4f6', borderRadius: '4px', border: '1px solid #c3c6d7' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontSize: '12px', fontWeight: 500, color: '#434655', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Amount</span>
                                                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#191c1e' }}>
                                                        {Number(payment.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontSize: '12px', fontWeight: 500, color: '#434655', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Method</span>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <i className="bi bi-credit-card" style={{ fontSize: '12px', color: '#505f76' }}></i>
                                                        <span style={{ fontSize: '14px', color: '#191c1e' }}>{formatPaymentMethod(payment.method || payment.payment_method)}</span>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontSize: '12px', fontWeight: 500, color: '#434655', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</span>
                                                    <span style={{ fontSize: '14px', color: '#191c1e' }}>{formatInStoreTimezone(payment.date || payment.created_at)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Images Section */}
                            <AttachmentsViewer images={model.images} title="Attachments" />
                        </div>

                        {/* Right Column: Sidebar */}
                        <div className="lg:col-span-4" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

                            {/* Metadata */}
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
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #c3c6d7' }}>
                                            <span style={{ fontSize: '14px', color: '#434655' }}>Created At</span>
                                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e' }}>{formatInStoreTimezone(model.created_at)}</span>
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
                <button onClick={openPreview} style={{ backgroundColor: '#004ac6', color: '#ffffff', border: 'none', padding: '8px 24px', borderRadius: '4px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                    Print Receipt
                </button>
            </Modal.Footer>
        </Modal>
    </>);

});

export default CustomerDepositView;
