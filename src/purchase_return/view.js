import React, { useState, useRef, forwardRef, useImperativeHandle } from "react";
import Preview from './../order/preview.js';
import { Modal } from 'react-bootstrap';

import NumberFormat from "react-number-format";
import PurchaseReturnPrint from './print.js';
import { useTranslation } from 'react-i18next';

const PurchaseReturnView = forwardRef((props, ref) => {
    const { t } = useTranslation('common');
    useImperativeHandle(ref, () => ({
        open(id) {
            if (id) {
                getPurchaseReturn(id);
                getPayments(id);
                setShow(true);
            }

            if (localStorage.getItem('store_id')) {
                getStore(localStorage.getItem('store_id'));
            }
        },

    }));

    let [model, setModel] = useState({});
    let [store, setStore] = useState({});

    const [show, setShow] = useState(false);

    function handleClose() {
        setShow(false);
    };


    let [purchaseReturnPaymentList, setPurchaseReturnPaymentList] = useState([]);
    let [totalPayments, setTotalPayments] = useState(0.00);

    const [searchParams, setSearchParams] = useState({});

    function ObjectToSearchQueryParams(object) {
        return Object.keys(object)
            .map(function (key) {
                return `search[${key}]=${object[key]}`;
            })
            .join("&");
    }


    function getPayments(purchase_return_id) {
        const requestOptions = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: localStorage.getItem("access_token"),
            },
        };
        let Select =
            "select=id,amount,method,store_name,purchase_return_code,purchase_return_id,created_by_name,created_at";
        if (localStorage.getItem("store_id")) {
            searchParams.store_id = localStorage.getItem("store_id");
        }
        searchParams["purchase_return_id"] = purchase_return_id;
        setSearchParams(searchParams);
        let queryParams = ObjectToSearchQueryParams(searchParams);
        if (queryParams !== "") {
            queryParams = "&" + queryParams;
        }

        fetch(
            "/v1/purchase-return-payment?" +
            Select +
            queryParams,
            requestOptions
        )
            .then(async (response) => {
                const isJson = response.headers
                    .get("content-type")
                    ?.includes("application/json");
                const data = isJson && (await response.json());

                // check for error response
                if (!response.ok) {
                    const error = data && data.errors;
                    return Promise.reject(error);
                }

                setPurchaseReturnPaymentList(data.result);
                totalPayments = data.meta.total_cash_discount;
                setTotalPayments(totalPayments);


            })
            .catch((error) => {
                console.log(error);
            });
    }



    function getPurchaseReturn(id) {
        console.log("inside get PurchaseReturn");
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

        fetch('/v1/purchase-return/' + id + "?" + queryParams, requestOptions)
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
            })
            .catch(error => {});
    }


    const PreviewRef = useRef();
    function openPreview() {
        PreviewRef.current.open(model, undefined, "purchase_return");
    }

    const PrintRef = useRef();
    function openPrint() {
        PrintRef.current.open(model);
    }


    function sendWhatsAppMessage() {
        PreviewRef.current.open(model, "whatsapp", "whatsapp_purchase_return");
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
        const tz = countryTimezoneMap[localStorage.getItem('store_country_code')] || countryTimezoneMap[model?.store_country_code] || 'UTC';
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
        <Preview ref={PreviewRef} />
        <PurchaseReturnPrint ref={PrintRef} />

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
                                {t("Details of Purchase Return")} #{model.code}
                            </h1>
                            {model.status && (
                                <span style={{ backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', padding: '2px 8px', borderRadius: '2px', fontSize: '12px', fontWeight: 500, lineHeight: '14px' }}>
                                    {formatPaymentMethod(model.status)}
                                </span>
                            )}
                            {model.payment_status && (
                                <span style={{ backgroundColor: '#dbeafe', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '2px 8px', borderRadius: '2px', fontSize: '12px', fontWeight: 500, lineHeight: '14px' }}>
                                    {formatPaymentMethod(model.payment_status)}
                                </span>
                            )}
                        </div>
                        {model.date && (
                            <p style={{ margin: 0, fontSize: '14px', lineHeight: '20px', color: '#434655', fontWeight: 400 }}>
                                {t("Return processed on")} {formatInStoreTimezone(model.date)}
                            </p>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center" style={{ gap: '8px', paddingRight: '32px' }}>
                        <button onClick={sendWhatsAppMessage} style={{ display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #c3c6d7', backgroundColor: '#f7f9fb', color: '#191c1e', padding: '8px 24px', borderRadius: '4px', fontSize: '13px', fontWeight: 600, lineHeight: '16px', cursor: 'pointer' }}>
                            <i className="bi bi-share" style={{ fontSize: '18px' }}></i>
                            {t("Share")}
                        </button>
                        <button onClick={openPreview} style={{ display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #c3c6d7', backgroundColor: '#f7f9fb', color: '#191c1e', padding: '8px 24px', borderRadius: '4px', fontSize: '13px', fontWeight: 600, lineHeight: '16px', cursor: 'pointer' }}>
                            <i className="bi bi-file-earmark-pdf" style={{ fontSize: '18px' }}></i>
                            {t("Download PDF")}
                        </button>
                        <button onClick={openPrint} style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#004ac6', color: '#ffffff', border: 'none', padding: '8px 24px', borderRadius: '4px', fontSize: '13px', fontWeight: 600, lineHeight: '16px', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                            <i className="bi bi-printer" style={{ fontSize: '18px' }}></i>
                            {t("Print Invoice")}
                        </button>
                    </div>
                </div>

                {/* Main scrollable content */}
                <div className="p-md md:p-xl" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

                    {/* Summary Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-lg">

                        {/* Return Total */}
                        <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#434655', lineHeight: '16px' }}>{t("Return Total")}</span>
                            <span style={{ fontSize: '24px', fontWeight: 600, lineHeight: '32px', letterSpacing: '-0.01em', color: '#191c1e', fontFamily: "'Hanken Grotesk', sans-serif" }}>
                                <NumberFormat value={model.total?.toFixed(2)} displayType={"text"} thousandSeparator={true} renderText={(v) => v} />
                            </span>
                        </div>

                        {/* VAT */}
                        <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#434655', lineHeight: '16px' }}>{t("VAT")} ({model.vat_percent}%)</span>
                            <span style={{ fontSize: '24px', fontWeight: 600, lineHeight: '32px', letterSpacing: '-0.01em', color: '#191c1e', fontFamily: "'Hanken Grotesk', sans-serif" }}>
                                <NumberFormat value={model.vat_price?.toFixed(2)} displayType={"text"} thousandSeparator={true} renderText={(v) => v} />
                            </span>
                        </div>

                        {/* Net Total */}
                        <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#434655', lineHeight: '16px' }}>{t("Net Total")}</span>
                            <span style={{ fontSize: '24px', fontWeight: 600, lineHeight: '32px', letterSpacing: '-0.01em', color: '#004ac6', fontFamily: "'Hanken Grotesk', sans-serif" }}>
                                <NumberFormat value={model.net_total?.toFixed(2)} displayType={"text"} thousandSeparator={true} renderText={(v) => v} />
                            </span>
                        </div>

                        {/* Supplier */}
                        <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#434655', lineHeight: '16px' }}>{t("Supplier")}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                <i className="bi bi-building" style={{ fontSize: '20px', color: '#505f76' }}></i>
                                <span style={{ fontSize: '18px', fontWeight: 600, lineHeight: '26px', color: '#191c1e', fontFamily: "'Hanken Grotesk', sans-serif" }}>
                                    {model.vendor_name || "—"}
                                </span>
                            </div>
                            {model.vendor_invoice_no && (
                                <div style={{ fontSize: '12px', color: '#434655' }}>
                                    {t("Invoice No.")}: {model.vendor_invoice_no}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Full-width Returned Items Section — OUTSIDE the grid, ABOVE it */}
                    <section style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: '32px' }}>
                        <div style={{ padding: '12px 24px', borderBottom: '1px solid #c3c6d7', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f2f4f6' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, lineHeight: '26px', fontFamily: "'Hanken Grotesk', sans-serif", color: '#191c1e' }}>{t("Returned Items")}</h3>
                            <span style={{ fontSize: '12px', fontWeight: 500, color: '#434655' }}>
                                {model.products ? model.products.filter(p => p.selected).length : 0} {t("Item(s)")}
                            </span>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', minWidth: '700px' }}>
                                <thead style={{ backgroundColor: '#f1f5f9' }}>
                                    <tr style={{ fontSize: '13px', fontWeight: 600, color: '#434655', textTransform: 'uppercase', lineHeight: '16px' }}>
                                        <th style={{ padding: '12px 24px', fontWeight: 600 }}>{t("SI No.")}</th>
                                        <th style={{ padding: '12px 24px', fontWeight: 600 }}>{t("Part No.")}</th>
                                        <th style={{ padding: '12px 24px', fontWeight: 600 }}>{t("Name")}</th>
                                        <th style={{ padding: '12px 24px', textAlign: 'center', fontWeight: 600 }}>{t("Qty")}</th>
                                        <th style={{ padding: '12px 24px', textAlign: 'right', fontWeight: 600 }}>{t("Unit Price")}</th>
                                        <th style={{ padding: '12px 24px', textAlign: 'right', fontWeight: 600 }}>{t("Unit Disc.")}</th>
                                        <th style={{ padding: '12px 24px', textAlign: 'right', fontWeight: 600 }}>{t("Disc. %")}</th>
                                        <th style={{ padding: '12px 24px', textAlign: 'right', fontWeight: 600 }}>{t("Price")}</th>
                                    </tr>
                                </thead>
                                <tbody style={{ fontSize: '14px', lineHeight: '20px', color: '#191c1e' }}>
                                    {model.products && model.products.filter(product => product.selected).map((product, index) => (
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
                                                <NumberFormat
                                                    value={product.purchasereturn_unit_price}
                                                    displayType={"text"}
                                                    thousandSeparator={true}
                                                    renderText={(v) => v}
                                                />
                                            </td>
                                            <td style={{ padding: '12px 24px', textAlign: 'right' }}>
                                                <NumberFormat
                                                    value={(product.unit_discount * product.quantity)?.toFixed(2)}
                                                    displayType={"text"}
                                                    thousandSeparator={true}
                                                    renderText={(v) => v}
                                                />
                                            </td>
                                            <td style={{ padding: '12px 24px', textAlign: 'right' }}>
                                                <NumberFormat
                                                    value={product.unit_discount_percent?.toFixed(2)}
                                                    displayType={"text"}
                                                    thousandSeparator={true}
                                                    suffix="%"
                                                    renderText={(v) => v}
                                                />
                                            </td>
                                            <td style={{ padding: '12px 24px', textAlign: 'right', fontWeight: 700 }}>
                                                <NumberFormat
                                                    value={((product.purchasereturn_unit_price - product.unit_discount) * product.quantity)?.toFixed(2)}
                                                    displayType={"text"}
                                                    thousandSeparator={true}
                                                    renderText={(v) => v}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {/* Totals Summary */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '24px', backgroundColor: '#ffffff' }}>
                            <div style={{ width: '100%', maxWidth: '320px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', lineHeight: '20px' }}>
                                    <span style={{ color: '#434655' }}>{t("Subtotal")}</span>
                                    <span>
                                        <NumberFormat value={model.total?.toFixed(2)} displayType={"text"} thousandSeparator={true} renderText={(v) => v} />
                                    </span>
                                </div>
                                {model.shipping_handling_fees > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', lineHeight: '20px' }}>
                                        <span style={{ color: '#434655' }}>{t("Shipping / Handling Fees")}</span>
                                        <span>
                                            <NumberFormat value={model.shipping_handling_fees?.toFixed(2)} displayType={"text"} thousandSeparator={true} renderText={(v) => v} />
                                        </span>
                                    </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', lineHeight: '20px' }}>
                                    <span style={{ color: '#434655' }}>{t("Discount")} ({model.discount_percent?.toFixed(2)}%)</span>
                                    <span style={{ color: '#ba1a1a' }}>
                                        -{model.discount?.toFixed(2)}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', lineHeight: '20px' }}>
                                    <span style={{ color: '#434655' }}>{t("VAT")} ({model.vat_percent}%)</span>
                                    <span>
                                        <NumberFormat value={model.vat_price?.toFixed(2)} displayType={"text"} thousandSeparator={true} renderText={(v) => v} />
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', lineHeight: '24px', fontWeight: 700, paddingTop: '8px', borderTop: '1px solid #c3c6d7', color: '#191c1e' }}>
                                    <span>{t("Net Total")}</span>
                                    <span style={{ color: '#004ac6' }}>
                                        <NumberFormat value={model.net_total?.toFixed(2)} displayType={"text"} thousandSeparator={true} renderText={(v) => v} />
                                    </span>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Main Body Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 items-start" style={{ gap: '32px' }}>

                        {/* Left Column: Payments */}
                        <div className="lg:col-span-8" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

                            {/* Payment History */}
                            {purchaseReturnPaymentList.length > 0 && (
                                <section style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden', maxHeight: '500px', overflowY: 'auto' }}>
                                    <div style={{ padding: '12px 24px', borderBottom: '1px solid #c3c6d7', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#f2f4f6' }}>
                                        <i className="bi bi-clock-history" style={{ color: '#505f76' }}></i>
                                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, lineHeight: '26px', fontFamily: "'Hanken Grotesk', sans-serif", color: '#191c1e' }}>{t("Payment History")}</h3>
                                    </div>
                                    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        {purchaseReturnPaymentList.map((payment) => (
                                            <div key={payment.id} className="grid grid-cols-1 md:grid-cols-3" style={{ gap: '16px', padding: '16px', backgroundColor: '#f2f4f6', borderRadius: '4px', border: '1px solid #c3c6d7' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontSize: '12px', fontWeight: 500, color: '#434655', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t("Amount")}</span>
                                                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#191c1e' }}>{payment.amount.toFixed(2)}</span>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontSize: '12px', fontWeight: 500, color: '#434655', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t("Method")}</span>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <i className="bi bi-credit-card" style={{ fontSize: '12px', color: '#505f76' }}></i>
                                                        <span style={{ fontSize: '14px', color: '#191c1e' }}>{formatPaymentMethod(payment.method)}</span>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontSize: '12px', fontWeight: 500, color: '#434655', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t("Created At")}</span>
                                                    <span style={{ fontSize: '14px', color: '#191c1e' }}>
                                                        {formatInStoreTimezone(payment.created_at)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}
                        </div>

                        {/* Right Column: Sidebar */}
                        <div className="lg:col-span-4" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

                            {/* Purchase Info Card */}
                            <section style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                <div style={{ padding: '12px 24px', borderBottom: '1px solid #c3c6d7', backgroundColor: '#f2f4f6' }}>
                                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, lineHeight: '26px', fontFamily: "'Hanken Grotesk', sans-serif", color: '#191c1e' }}>{t("Purchase Info")}</h3>
                                </div>
                                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {model.purchase_code && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #c3c6d7' }}>
                                            <span style={{ fontSize: '14px', color: '#434655' }}>{t("Purchase Code")}</span>
                                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#004ac6', fontFamily: 'monospace' }}>{model.purchase_code}</span>
                                        </div>
                                    )}
                                    {model.vendor_invoice_no && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #c3c6d7' }}>
                                            <span style={{ fontSize: '14px', color: '#434655' }}>{t("Vendor Invoice No.")}</span>
                                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e' }}>{model.vendor_invoice_no}</span>
                                        </div>
                                    )}
                                    {model.payment_status && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #c3c6d7' }}>
                                            <span style={{ fontSize: '14px', color: '#434655' }}>{t("Payment Status")}</span>
                                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e' }}>{formatPaymentMethod(model.payment_status)}</span>
                                        </div>
                                    )}
                                    {model.payment_method && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #c3c6d7' }}>
                                            <span style={{ fontSize: '14px', color: '#434655' }}>{t("Payment Method")}</span>
                                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e' }}>{formatPaymentMethod(model.payment_method)}</span>
                                        </div>
                                    )}
                                    {model.partial_payment_amount > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #c3c6d7' }}>
                                            <span style={{ fontSize: '14px', color: '#434655' }}>{t("Partial Payment")}</span>
                                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e' }}>{model.partial_payment_amount}</span>
                                        </div>
                                    )}
                                    {model.cash_discount > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '14px', color: '#434655' }}>{t("Cash Discount")}</span>
                                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#ba1a1a' }}>{model.cash_discount}</span>
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* Metadata */}
                            <section style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden', maxHeight: '500px', overflowY: 'auto' }}>
                                <div style={{ padding: '12px 24px', borderBottom: '1px solid #c3c6d7', backgroundColor: '#f2f4f6' }}>
                                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, lineHeight: '26px', fontFamily: "'Hanken Grotesk', sans-serif", color: '#191c1e' }}>{t("Metadata")}</h3>
                                </div>
                                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #c3c6d7' }}>
                                        <span style={{ fontSize: '14px', color: '#434655' }}>{t("Created By")}</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#2563eb', color: '#eeefff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700 }}>
                                                {model.created_by_name ? model.created_by_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : ''}
                                            </div>
                                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e' }}>{model.created_by_name}</span>
                                        </div>
                                    </div>
                                    {model.purchase_returned_by_name && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #c3c6d7' }}>
                                            <span style={{ fontSize: '14px', color: '#434655' }}>{t("Returned By")}</span>
                                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e' }}>{model.purchase_returned_by_name}</span>
                                        </div>
                                    )}
                                    {model.date && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #c3c6d7' }}>
                                            <span style={{ fontSize: '14px', color: '#434655' }}>{t("Return Date")}</span>
                                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e' }}>
                                                {formatInStoreTimezone(model.date)}
                                            </span>
                                        </div>
                                    )}
                                    {model.signature_date_str && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #c3c6d7' }}>
                                            <span style={{ fontSize: '14px', color: '#434655' }}>{t("Signature Date")}</span>
                                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e' }}>{model.signature_date_str}</span>
                                        </div>
                                    )}
                                    {model.updated_at && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                            <span style={{ fontSize: '14px', color: '#434655', flexShrink: 0 }}>{t("Last Updated")}</span>
                                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e', textAlign: 'right' }}>{formatInStoreTimezone(model.updated_at)}</span>
                                        </div>
                                    )}
                                    {model.updated_by_name && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '14px', color: '#434655' }}>{t("Updated By")}</span>
                                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e' }}>{model.updated_by_name}</span>
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
                    {t("Cancel")}
                </button>
                <button onClick={openPrint} style={{ backgroundColor: '#004ac6', color: '#ffffff', border: 'none', padding: '8px 24px', borderRadius: '4px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                    {t("Print Invoice")}
                </button>
            </Modal.Footer>
        </Modal>
    </>);

});

export default PurchaseReturnView;
