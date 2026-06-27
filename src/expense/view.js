import React, { useState, forwardRef, useImperativeHandle } from "react";
import { Modal, Button } from 'react-bootstrap';
import AttachmentsViewer from '../utils/AttachmentsViewer.js';

const ExpenseView = forwardRef((props, ref) => {

    useImperativeHandle(ref, () => ({
        open(id) {
            if (id) {
                getExpense(id);
                SetShow(true);
            }
        },
    }));

    let [model, setModel] = useState({});
    const [show, SetShow] = useState(false);

    function handleClose() {
        SetShow(false);
    }

    function ObjectToSearchQueryParams(object) {
        return Object.keys(object)
            .map(function (key) {
                return `search[${key}]=` + object[key];
            })
            .join("&");
    }

    function getExpense(id) {
        console.log("inside get Expense");
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

        fetch('/v1/expense/' + id + "?" + queryParams, requestOptions)
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();

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

    // eslint-disable-next-line no-unused-vars
    const store = props.store || {};

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

    function formatDate(dateStr) {
        if (!dateStr) return '—';
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
        } catch {
            return dateStr;
        }
    }

    return (<>
        <Modal show={show} size="xl" onHide={handleClose} animation={false} scrollable={true}>
            <Modal.Body className="p-0" style={{ backgroundColor: '#f7f9fb', fontFamily: "'Inter', sans-serif", position: 'relative' }}>

                {/* Close button */}
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
                                Expense #{model.code}
                            </h1>
                            {model.payment_method && (
                                <span style={{ backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', padding: '2px 8px', borderRadius: '2px', fontSize: '12px', fontWeight: 500, lineHeight: '14px' }}>
                                    {formatPaymentMethod(model.payment_method)}
                                </span>
                            )}
                        </div>
                        {model.date && (
                            <p style={{ margin: 0, fontSize: '14px', lineHeight: '20px', color: '#434655', fontWeight: 400 }}>
                                Expense recorded on {formatInStoreTimezone(model.date)}
                            </p>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center" style={{ gap: '8px', paddingRight: '32px' }}>
                        {props.openCreateForm && (
                            <button onClick={() => { handleClose(); props.openCreateForm(); }} style={{ display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #c3c6d7', backgroundColor: '#f7f9fb', color: '#191c1e', padding: '8px 24px', borderRadius: '4px', fontSize: '13px', fontWeight: 600, lineHeight: '16px', cursor: 'pointer' }}>
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

                        {/* Amount */}
                        <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#434655', lineHeight: '16px' }}>Amount</span>
                            <span style={{ fontSize: '24px', fontWeight: 600, lineHeight: '32px', letterSpacing: '-0.01em', color: '#004ac6', fontFamily: "'Hanken Grotesk', sans-serif" }}>
                                {model.amount != null ? Number(model.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                            </span>
                        </div>

                        {/* Category */}
                        <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#434655', lineHeight: '16px' }}>Category</span>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                                {model.category_name && model.category_name.length > 0
                                    ? model.category_name.map((name, i) => (
                                        <span key={i} style={{ fontSize: '16px', fontWeight: 600, lineHeight: '24px', color: '#191c1e', fontFamily: "'Hanken Grotesk', sans-serif" }}>{name}</span>
                                    ))
                                    : <span style={{ fontSize: '16px', fontWeight: 600, lineHeight: '24px', color: '#434655', fontFamily: "'Hanken Grotesk', sans-serif" }}>—</span>
                                }
                            </div>
                        </div>

                        {/* Payment Method */}
                        <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#434655', lineHeight: '16px' }}>Payment Method</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                <i className="bi bi-wallet2" style={{ fontSize: '20px', color: '#505f76' }}></i>
                                <span style={{ fontSize: '18px', fontWeight: 600, lineHeight: '26px', color: '#191c1e', fontFamily: "'Hanken Grotesk', sans-serif" }}>
                                    {formatPaymentMethod(model.payment_method)}
                                </span>
                            </div>
                        </div>

                        {/* Date */}
                        <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#434655', lineHeight: '16px' }}>Date</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                <i className="bi bi-calendar3" style={{ fontSize: '18px', color: '#505f76' }}></i>
                                <span style={{ fontSize: '18px', fontWeight: 600, lineHeight: '26px', color: '#191c1e', fontFamily: "'Hanken Grotesk', sans-serif" }}>
                                    {formatDate(model.date)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Main Body Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 items-start" style={{ gap: '32px' }}>

                        {/* Left Column: Expense Details + Images */}
                        <div className="lg:col-span-8" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

                            {/* Expense Details */}
                            <section style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                <div style={{ padding: '12px 24px', borderBottom: '1px solid #c3c6d7', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f2f4f6' }}>
                                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, lineHeight: '26px', fontFamily: "'Hanken Grotesk', sans-serif", color: '#191c1e' }}>Expense Details</h3>
                                </div>
                                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '0' }}>

                                    {/* Code */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #eceef0' }}>
                                        <span style={{ fontSize: '14px', color: '#434655', fontWeight: 500 }}>Code</span>
                                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#191c1e', fontFamily: 'monospace' }}>{model.code || '—'}</span>
                                    </div>

                                    {/* Description */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '12px 0', borderBottom: '1px solid #eceef0', gap: '16px' }}>
                                        <span style={{ fontSize: '14px', color: '#434655', fontWeight: 500, flexShrink: 0 }}>Description</span>
                                        <span style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e', textAlign: 'right' }}>{model.description || '—'}</span>
                                    </div>

                                    {/* Amount */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #eceef0' }}>
                                        <span style={{ fontSize: '14px', color: '#434655', fontWeight: 500 }}>Amount</span>
                                        <span style={{ fontSize: '16px', fontWeight: 700, color: '#004ac6' }}>
                                            {model.amount != null ? Number(model.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                                        </span>
                                    </div>

                                    {/* Payment Method */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #eceef0' }}>
                                        <span style={{ fontSize: '14px', color: '#434655', fontWeight: 500 }}>Payment Method</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <i className="bi bi-credit-card" style={{ fontSize: '14px', color: '#505f76' }}></i>
                                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e' }}>{formatPaymentMethod(model.payment_method)}</span>
                                        </div>
                                    </div>

                                    {/* Date */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #eceef0' }}>
                                        <span style={{ fontSize: '14px', color: '#434655', fontWeight: 500 }}>Date</span>
                                        <span style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e' }}>{formatDate(model.date)}</span>
                                    </div>

                                    {/* Categories */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '12px 0', gap: '16px' }}>
                                        <span style={{ fontSize: '14px', color: '#434655', fontWeight: 500, flexShrink: 0 }}>Categories</span>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                            {model.category_name && model.category_name.length > 0
                                                ? model.category_name.map((name, i) => (
                                                    <span key={i} style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e', backgroundColor: '#eceef0', padding: '2px 10px', borderRadius: '12px' }}>{name}</span>
                                                ))
                                                : <span style={{ fontSize: '14px', color: '#434655' }}>—</span>
                                            }
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Images */}
                            <AttachmentsViewer images={model.images} title="Attachments" />
                        </div>

                        {/* Right Column: Metadata Sidebar */}
                        <div className="lg:col-span-4" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

                            <section style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                <div style={{ padding: '12px 24px', borderBottom: '1px solid #c3c6d7', backgroundColor: '#f2f4f6' }}>
                                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, lineHeight: '26px', fontFamily: "'Hanken Grotesk', sans-serif", color: '#191c1e' }}>Metadata</h3>
                                </div>
                                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                                    {/* Created By */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #c3c6d7' }}>
                                        <span style={{ fontSize: '14px', color: '#434655' }}>Created By</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#2563eb', color: '#eeefff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700 }}>
                                                {model.created_by_name ? model.created_by_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?'}
                                            </div>
                                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e' }}>{model.created_by_name || '—'}</span>
                                        </div>
                                    </div>

                                    {/* Store */}

                                    {/* Updated By */}
                                    {model.updated_by_name && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #c3c6d7' }}>
                                            <span style={{ fontSize: '14px', color: '#434655' }}>Updated By</span>
                                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e' }}>{model.updated_by_name}</span>
                                        </div>
                                    )}

                                    {/* Created At */}
                                    {model.created_at && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', paddingBottom: '8px', borderBottom: '1px solid #c3c6d7' }}>
                                            <span style={{ fontSize: '14px', color: '#434655', flexShrink: 0 }}>Created At</span>
                                            <span style={{ fontSize: '13px', fontWeight: 500, color: '#191c1e', textAlign: 'right' }}>{formatInStoreTimezone(model.created_at)}</span>
                                        </div>
                                    )}

                                    {/* Last Updated */}
                                    {model.updated_at && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                            <span style={{ fontSize: '14px', color: '#434655', flexShrink: 0 }}>Last Updated</span>
                                            <span style={{ fontSize: '13px', fontWeight: 500, color: '#191c1e', textAlign: 'right' }}>{formatInStoreTimezone(model.updated_at)}</span>
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={handleClose}>
                    Cancel
                </Button>
                <Button variant="primary" onClick={handleClose}>
                    Close
                </Button>
            </Modal.Footer>
        </Modal>
    </>);

});

export default ExpenseView;
