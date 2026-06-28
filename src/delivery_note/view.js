import React, { useState, useRef, forwardRef, useImperativeHandle } from "react";
import { Modal } from 'react-bootstrap';

import NumberFormat from "react-number-format";
import OrderPreview from './../order/preview.js';
import DeliveryNotePrint from './print.js';
import { trimTo2Decimals } from "../utils/numberUtils";

const DeliveryNoteView = forwardRef((props, ref) => {

    useImperativeHandle(ref, () => ({
        open(id) {
            if (id) {
                getDeliveryNote(id);
                SetShow(true);
            }

            if (localStorage.getItem('store_id')) {
                getStore(localStorage.getItem('store_id'));
            }
        },
    }));

    let [model, setModel] = useState({});
    let [store, setStore] = useState({});

    function ObjectToSearchQueryParams(object) {
        return Object.keys(object)
            .map(function (key) {
                return `search[${key}]=${object[key]}`;
            })
            .join("&");
    }

    function getDeliveryNote(id) {
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

        fetch('/v1/delivery-note/' + id + "?" + queryParams, requestOptions)
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();

                if (!response.ok) {
                    const error = (data && data.errors);
                    return Promise.reject(error);
                }

                model = data.result;
                setModel({ ...model });
            })
            .catch(error => {});
    }

    async function getStore(id) {
        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': localStorage.getItem('access_token'),
            },
        };

        await fetch('/v1/store/' + id, requestOptions)
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();

                if (!response.ok) {
                    const error = (data && data.errors);
                    return Promise.reject(error);
                }

                store = data.result;
                setStore({ ...store });
                if (store.country_code) {
                    localStorage.setItem('store_country_code', store.country_code);
                }
            })
            .catch(error => {});
    }

    const [show, SetShow] = useState(false);

    function handleClose() {
        SetShow(false);
    }

    const PreviewRef = useRef();
    function openPreview() {
        PreviewRef.current.open(model, undefined, "delivery_note");
    }

    const PrintRef = useRef();
    function openPrint() {
        PrintRef.current.open(model);
    }

    const timerRef = useRef(null);
    function sendWhatsAppMessage() {
        if (timerRef.current) clearTimeout(timerRef.current);

        timerRef.current = setTimeout(() => {
            PreviewRef.current.open(model, "whatsapp", "delivery_note");
            handleClose();
        }, 100);
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
    function formatPaymentMethod(method) {
        if (!method) return '—';
        return method.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }

    function formatInStoreTimezone(dateStr) {
        if (!dateStr) return '';
        const tz = countryTimezoneMap[localStorage.getItem('store_country_code')] || countryTimezoneMap[store?.country_code] || 'UTC';
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
        <OrderPreview ref={PreviewRef} />
        <DeliveryNotePrint ref={PrintRef} />

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
                                Details of Delivery Note #{model.code}
                            </h1>
                        </div>
                        {model.date && (
                            <p style={{ margin: 0, fontSize: '14px', lineHeight: '20px', color: '#434655', fontWeight: 400 }}>
                                Delivered on {formatInStoreTimezone(model.date)}
                            </p>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center" style={{ gap: '8px', paddingRight: '32px' }}>
                        <button onClick={sendWhatsAppMessage} style={{ display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #c3c6d7', backgroundColor: '#f7f9fb', color: '#191c1e', padding: '8px 24px', borderRadius: '4px', fontSize: '13px', fontWeight: 600, lineHeight: '16px', cursor: 'pointer' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M13.601 2.326A7.875 7.875 0 0 0 8.036 0C3.596 0 0 3.597 0 8.036c0 1.417.37 2.805 1.07 4.03L0 16l3.993-1.05a7.968 7.968 0 0 0 4.043 1.085h.003c4.44 0 8.036-3.596 8.036-8.036 0-2.147-.836-4.166-2.37-5.673ZM8.036 14.6a6.584 6.584 0 0 1-3.35-.92l-.24-.142-2.37.622.63-2.31-.155-.238a6.587 6.587 0 0 1-1.018-3.513c0-3.637 2.96-6.6 6.6-6.6 1.764 0 3.42.69 4.67 1.94a6.56 6.56 0 0 1 1.93 4.668c0 3.637-2.96 6.6-6.6 6.6Zm3.61-4.885c-.198-.1-1.17-.578-1.352-.644-.18-.066-.312-.1-.444.1-.13.197-.51.644-.626.775-.115.13-.23.15-.428.05-.198-.1-.837-.308-1.594-.983-.59-.525-.99-1.174-1.11-1.372-.116-.198-.012-.305.088-.403.09-.09.198-.23.298-.345.1-.115.132-.197.2-.33.065-.13.032-.247-.017-.345-.05-.1-.444-1.07-.61-1.46-.16-.384-.323-.332-.444-.338l-.378-.007c-.13 0-.344.048-.525.23s-.688.672-.688 1.64c0 .967.704 1.9.802 2.03.1.13 1.386 2.116 3.365 2.963.47.203.837.324 1.122.414.472.15.902.13 1.24.08.378-.057 1.17-.48 1.336-.942.165-.462.165-.858.116-.943-.048-.084-.18-.132-.378-.23Z" />
                            </svg>
                            Share
                        </button>
                        <button onClick={openPreview} style={{ display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #c3c6d7', backgroundColor: '#f7f9fb', color: '#191c1e', padding: '8px 24px', borderRadius: '4px', fontSize: '13px', fontWeight: 600, lineHeight: '16px', cursor: 'pointer' }}>
                            <i className="bi bi-file-earmark-pdf" style={{ fontSize: '18px' }}></i>
                            Print A4
                        </button>
                        <button onClick={openPrint} style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#004ac6', color: '#ffffff', border: 'none', padding: '8px 24px', borderRadius: '4px', fontSize: '13px', fontWeight: 600, lineHeight: '16px', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
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

                        {/* Invoiced */}
                        <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#434655', lineHeight: '16px' }}>Invoiced</span>
                            <span style={{ fontSize: '24px', fontWeight: 700, lineHeight: '32px', color: model.order_id ? '#15803d' : '#ba1a1a', fontFamily: "'Hanken Grotesk', sans-serif" }}>
                                {model.order_id ? 'YES' : 'NO'}
                            </span>
                            {model.order_id && model.order_code && (
                                <div style={{ marginTop: '4px', fontSize: '12px', color: '#004ac6', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <i className="bi bi-receipt" style={{ fontSize: '13px' }}></i>
                                    {model.order_code}
                                </div>
                            )}
                        </div>

                        {/* Item Count */}
                        <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#434655', lineHeight: '16px' }}>Items</span>
                            <span style={{ fontSize: '24px', fontWeight: 600, lineHeight: '32px', letterSpacing: '-0.01em', color: '#191c1e', fontFamily: "'Hanken Grotesk', sans-serif" }}>
                                {model.products?.length || 0}
                            </span>
                            <div style={{ marginTop: '4px', fontSize: '12px', color: '#434655' }}>
                                product(s) in this note
                            </div>
                        </div>

                        {/* Customer */}
                        <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#434655', lineHeight: '16px' }}>Customer</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                <i className="bi bi-person" style={{ fontSize: '20px', color: '#505f76' }}></i>
                                <span style={{ fontSize: '16px', fontWeight: 600, lineHeight: '24px', color: '#191c1e', fontFamily: "'Hanken Grotesk', sans-serif" }}>
                                    {model.customer_name || '—'}
                                </span>
                            </div>
                        </div>

                        {/* Delivery Date */}
                        <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#434655', lineHeight: '16px' }}>Delivery Date</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                <i className="bi bi-calendar3" style={{ fontSize: '20px', color: '#505f76' }}></i>
                                <span style={{ fontSize: '15px', fontWeight: 600, lineHeight: '22px', color: '#191c1e', fontFamily: "'Hanken Grotesk', sans-serif" }}>
                                    {model.date ? formatInStoreTimezone(model.date) : '—'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Full-width Products Section — OUTSIDE the grid, ABOVE it */}
                    <section style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: '32px' }}>
                                <div style={{ padding: '12px 24px', borderBottom: '1px solid #c3c6d7', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f2f4f6' }}>
                                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, lineHeight: '26px', fontFamily: "'Hanken Grotesk', sans-serif", color: '#191c1e' }}>Delivered Items</h3>
                                    <span style={{ fontSize: '12px', fontWeight: 500, color: '#434655' }}>{model.products?.length || 0} Item(s)</span>
                                </div>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', minWidth: '700px' }}>
                                        <thead style={{ backgroundColor: '#f1f5f9' }}>
                                            <tr style={{ fontSize: '13px', fontWeight: 600, color: '#434655', textTransform: 'uppercase', lineHeight: '16px' }}>
                                                <th style={{ padding: '12px 24px', fontWeight: 600 }}>SI No.</th>
                                                <th style={{ padding: '12px 24px', fontWeight: 600 }}>Part No.</th>
                                                <th style={{ padding: '12px 24px', fontWeight: 600 }}>Product Name</th>
                                                <th style={{ padding: '12px 24px', textAlign: 'center', fontWeight: 600 }}>Qty</th>
                                                <th style={{ padding: '12px 24px', textAlign: 'right', fontWeight: 600 }}>Unit Price</th>
                                                <th style={{ padding: '12px 24px', textAlign: 'right', fontWeight: 600 }}>Disc %</th>
                                                <th style={{ padding: '12px 24px', textAlign: 'right', fontWeight: 600 }}>VAT</th>
                                                <th style={{ padding: '12px 24px', textAlign: 'right', fontWeight: 600 }}>Total Price</th>
                                            </tr>
                                        </thead>
                                        <tbody style={{ fontSize: '14px', lineHeight: '20px', color: '#191c1e' }}>
                                            {model.products && model.products.map((product, index) => (
                                                <tr key={index}
                                                    style={{ borderBottom: '1px solid #c3c6d7', transition: 'transform 0.2s ease-out' }}
                                                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateX(4px)'; e.currentTarget.style.backgroundColor = '#f2f4f6'; }}
                                                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateX(0)'; e.currentTarget.style.backgroundColor = ''; }}
                                                >
                                                    <td style={{ padding: '12px 24px' }}>{index + 1}</td>
                                                    <td style={{ padding: '12px 24px', fontFamily: 'monospace', color: '#004ac6' }}>{product.part_number}</td>
                                                    <td style={{ padding: '12px 24px' }}>{product.name}{product.name_in_arabic ? " / " + product.name_in_arabic : ""}</td>
                                                    <td style={{ padding: '12px 24px', textAlign: 'center' }}>{product.quantity} {product.unit || ""}</td>
                                                    <td style={{ padding: '12px 24px', textAlign: 'right' }}>
                                                        <NumberFormat value={trimTo2Decimals(product.unit_price)} displayType={"text"} thousandSeparator={true} renderText={(v) => v} />
                                                    </td>
                                                    <td style={{ padding: '12px 24px', textAlign: 'right' }}>
                                                        <NumberFormat value={trimTo2Decimals(product.unit_discount_percent)} displayType={"text"} thousandSeparator={true} suffix="%" renderText={(v) => v} />
                                                    </td>
                                                    <td style={{ padding: '12px 24px', textAlign: 'right' }}>
                                                        <NumberFormat value={trimTo2Decimals(product.vat_price || 0)} displayType={"text"} thousandSeparator={true} renderText={(v) => v} />
                                                    </td>
                                                    <td style={{ padding: '12px 24px', textAlign: 'right', fontWeight: 700 }}>
                                                        <NumberFormat value={trimTo2Decimals((product.unit_price - (product.unit_discount || 0)) * product.quantity + (product.vat_price || 0))} displayType={"text"} thousandSeparator={true} renderText={(v) => v} />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Totals summary (only when net_total exists) */}
                                {model.net_total > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '24px', backgroundColor: '#ffffff' }}>
                                        <div style={{ width: '100%', maxWidth: '320px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', lineHeight: '20px' }}>
                                                <span style={{ color: '#434655' }}>Total (without VAT)</span>
                                                <span>{model.total ? model.total.toFixed(2) : "0.00"}</span>
                                            </div>
                                            {model.total_with_vat > 0 && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', lineHeight: '20px' }}>
                                                    <span style={{ color: '#434655' }}>Total (with VAT)</span>
                                                    <span>{model.total_with_vat.toFixed(2)}</span>
                                                </div>
                                            )}
                                            {model.shipping_handling_fees > 0 && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', lineHeight: '20px' }}>
                                                    <span style={{ color: '#434655' }}>Shipping / Handling</span>
                                                    <span>{model.shipping_handling_fees.toFixed(2)}</span>
                                                </div>
                                            )}
                                            {model.discount > 0 && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', lineHeight: '20px' }}>
                                                    <span style={{ color: '#434655' }}>
                                                        Discount (without VAT){model.discount_percent > 0 ? ` (${model.discount_percent}%)` : ""}
                                                    </span>
                                                    <span style={{ color: '#ba1a1a' }}>-{model.discount.toFixed(2)}</span>
                                                </div>
                                            )}
                                            {model.discount_with_vat > 0 && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', lineHeight: '20px' }}>
                                                    <span style={{ color: '#434655' }}>
                                                        Discount (with VAT){model.discount_percent_with_vat > 0 ? ` (${model.discount_percent_with_vat}%)` : ""}
                                                    </span>
                                                    <span style={{ color: '#ba1a1a' }}>-{model.discount_with_vat.toFixed(2)}</span>
                                                </div>
                                            )}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', lineHeight: '20px' }}>
                                                <span style={{ color: '#434655' }}>VAT {model.vat_percent ? `(${model.vat_percent}%)` : ""}</span>
                                                <span>{model.vat_price ? model.vat_price.toFixed(2) : "0.00"}</span>
                                            </div>
                                            {model.rounding_amount !== 0 && model.rounding_amount !== undefined && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', lineHeight: '20px' }}>
                                                    <span style={{ color: '#434655' }}>Rounding Amount</span>
                                                    <span>{model.rounding_amount ? model.rounding_amount.toFixed(2) : "0.00"}</span>
                                                </div>
                                            )}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', lineHeight: '24px', fontWeight: 700, paddingTop: '8px', borderTop: '1px solid #c3c6d7', color: '#191c1e' }}>
                                                <span>Net Total (with VAT)</span>
                                                <span style={{ color: '#004ac6' }}>{model.net_total.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                    </section>

                    {/* Metadata */}
                    <section style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                        <div style={{ padding: '12px 24px', borderBottom: '1px solid #c3c6d7', backgroundColor: '#f2f4f6' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, lineHeight: '26px', fontFamily: "'Hanken Grotesk', sans-serif", color: '#191c1e' }}>Metadata</h3>
                        </div>
                                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                                    {/* Created By with avatar */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #c3c6d7' }}>
                                        <span style={{ fontSize: '14px', color: '#434655' }}>Created By</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#2563eb', color: '#eeefff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700 }}>
                                                {model.created_by_name ? model.created_by_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : ''}
                                            </div>
                                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e' }}>{model.created_by_name}</span>
                                        </div>
                                    </div>

                                    {model.customer_name && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #c3c6d7' }}>
                                            <span style={{ fontSize: '14px', color: '#434655' }}>Customer</span>
                                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e' }}>{model.customer_name}</span>
                                        </div>
                                    )}


                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #c3c6d7' }}>
                                        <span style={{ fontSize: '14px', color: '#434655' }}>Invoiced</span>
                                        <span style={{ fontSize: '14px', fontWeight: 700, color: model.order_id ? '#15803d' : '#ba1a1a' }}>
                                            {model.order_id ? 'YES' : 'NO'}
                                        </span>
                                    </div>

                                    {model.order_id && model.order_code && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #c3c6d7' }}>
                                            <span style={{ fontSize: '14px', color: '#434655' }}>Sales ID</span>
                                            <span style={{ fontSize: '14px', fontWeight: 600, color: '#004ac6', fontFamily: 'monospace' }}>{model.order_code}</span>
                                        </div>
                                    )}

                                    {model.delivered_by_name && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #c3c6d7' }}>
                                            <span style={{ fontSize: '14px', color: '#434655' }}>Delivered By</span>
                                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e' }}>{model.delivered_by_name}</span>
                                        </div>
                                    )}

                                    {model.date && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #c3c6d7' }}>
                                            <span style={{ fontSize: '14px', color: '#434655' }}>Delivery Date</span>
                                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e' }}>{formatInStoreTimezone(model.date)}</span>
                                        </div>
                                    )}

                                    {model.created_at && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #c3c6d7' }}>
                                            <span style={{ fontSize: '14px', color: '#434655' }}>Created At</span>
                                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e' }}>{formatInStoreTimezone(model.created_at)}</span>
                                        </div>
                                    )}

                                    {model.updated_at && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', paddingBottom: '8px', borderBottom: '1px solid #c3c6d7' }}>
                                            <span style={{ fontSize: '14px', color: '#434655', flexShrink: 0 }}>Last Updated</span>
                                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e', textAlign: 'right' }}>{formatInStoreTimezone(model.updated_at)}</span>
                                        </div>
                                    )}

                                    {model.updated_by_name && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '14px', color: '#434655' }}>Updated By</span>
                                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e' }}>{model.updated_by_name}</span>
                                        </div>
                                    )}
                                </div>
                    </section>
                </div>
            </Modal.Body>

            <Modal.Footer style={{ backgroundColor: '#ffffff', borderTop: '1px solid #c3c6d7', padding: '12px 32px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button onClick={handleClose} style={{ backgroundColor: '#d0e1fb', color: '#54647a', border: 'none', padding: '8px 24px', borderRadius: '4px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                    Cancel
                </button>
                <button onClick={openPrint} style={{ backgroundColor: '#004ac6', color: '#ffffff', border: 'none', padding: '8px 24px', borderRadius: '4px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                    Print
                </button>
            </Modal.Footer>
        </Modal>
    </>);

});

export default DeliveryNoteView;
