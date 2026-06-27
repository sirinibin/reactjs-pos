import React, { useState, useRef, forwardRef, useImperativeHandle, useCallback, useEffect } from "react";
import { Modal } from 'react-bootstrap';

import NumberFormat from "react-number-format";
import OrderPreview from './../order/preview.js';
import OrderPrint from './../order/print.js';
import { trimTo2Decimals } from "../utils/numberUtils";
import { useTranslation } from 'react-i18next';

const QuotationView = forwardRef((props, ref) => {
    const { t } = useTranslation('common');

    useImperativeHandle(ref, () => ({
        open(id) {
            if (id) {
                getQuotation(id);
                SetShow(true);
            }

            if (localStorage.getItem('store_id')) {
                getStore(localStorage.getItem('store_id'));
            }
        },

    }));


    let [store, setStore] = useState({});

    async function getStore(id) {
        console.log("inside get Store");
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

                // check for error response
                if (!response.ok) {
                    const error = (data && data.errors);
                    return Promise.reject(error);
                }

                console.log("Response:");
                console.log(data);
                store = data.result;
                setStore({ ...store });
                if (store.country_code) {
                    localStorage.setItem('store_country_code', store.country_code);
                }
            })
            .catch(error => {

            });
    }


    let [model, setModel] = useState({});

    function ObjectToSearchQueryParams(object) {
        return Object.keys(object)
            .map(function (key) {
                return `search[${key}]=${object[key]}`;
            })
            .join("&");
    }


    function getQuotation(id) {
        console.log("inside get Quotation");
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

        fetch('/v1/quotation/' + id + "?" + queryParams, requestOptions)
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();

                // check for error response
                if (!response.ok) {
                    const error = (data && data.errors);
                    return Promise.reject(error);
                }

                // setErrors({});

                console.log("Response:");
                console.log(data);

                model = data.result;

                setModel({ ...model });
            })
            .catch(error => {
                // setErrors(error);
            });
    }

    const [show, SetShow] = useState(false);

    function handleClose() {
        SetShow(false);
    };

    function sendWhatsAppMessage() {
        showOrderPreview = true;
        setShowOrderPreview(true);
        if (timerRef.current) clearTimeout(timerRef.current);

        timerRef.current = setTimeout(() => {
            PreviewRef.current?.open(model, "whatsapp", "whatsapp_quotation");
            handleClose();
        }, 100);
    }

    //Printing

    let [showOrderPreview, setShowOrderPreview] = useState(false);
    let [showPrintTypeSelection, setShowPrintTypeSelection] = useState(false);

    const timerRef = useRef(null);
    const PreviewRef = useRef();

    const openPreview = useCallback(() => {
        setShowOrderPreview(true);
        setShowPrintTypeSelection(false);


        if (timerRef.current) clearTimeout(timerRef.current);

        timerRef.current = setTimeout(() => {
            PreviewRef.current?.open(model, undefined, "quotation");
            handleClose();
        }, 100);

    }, [model]);

    const PrintRef = useRef();
    const openPrint = useCallback(() => {
        // document.removeEventListener('keydown', handleEnterKey);
        setShowPrintTypeSelection(false);

        PrintRef.current?.open(model, "quotation");
        handleClose();
    }, [model]);



    const printButtonRef = useRef();
    const printA4ButtonRef = useRef();
    const openPrintTypeSelection = useCallback(() => {
        if (store.settings?.enable_invoice_print_type_selection) {
            // showPrintTypeSelection = true;
            setShowOrderPreview(true);
            setShowPrintTypeSelection(true);
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => {
                printButtonRef.current?.focus();
            }, 100);

        } else {
            openPreview();
        }
    }, [openPreview, store]);

    const handleEnterKey = useCallback((event) => {
        const tag = event.target.tagName.toLowerCase();
        const isInput = tag === 'input' || tag === 'textarea' || event.target.isContentEditable;

        if (!show) {
            return;
        }

        if (event.key === 'Enter' && !isInput) {
            openPrintTypeSelection();
            // Call your function here
        }
    }, [openPrintTypeSelection, show]);

    useEffect(() => {
        document.addEventListener('keydown', handleEnterKey);
        return () => {
            document.removeEventListener('keydown', handleEnterKey);
        };
    }, [handleEnterKey]);

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

        <Modal show={showPrintTypeSelection} onHide={() => {
            showPrintTypeSelection = false;
            setShowPrintTypeSelection(showPrintTypeSelection);
        }} centered>
            <Modal.Header closeButton>
                <Modal.Title>{t("Select Print Type")}</Modal.Title>
            </Modal.Header>
            <Modal.Body className="d-flex justify-content-around">

                <button className="btn btn-secondary" ref={printButtonRef} onClick={() => {
                    openPrint();
                }} onKeyDown={(e) => {
                    if (timerRef.current) clearTimeout(timerRef.current);

                    if (e.key === "ArrowRight") {
                        timerRef.current = setTimeout(() => {
                            printA4ButtonRef.current.focus();
                        }, 100);
                    }
                }}>
                    <i className="bi bi-printer"></i> {t("Print")}
                </button>

                <button className="btn btn-primary" ref={printA4ButtonRef} onClick={() => {
                    openPreview();
                }}
                    onKeyDown={(e) => {
                        if (timerRef.current) clearTimeout(timerRef.current);

                        if (e.key === "ArrowLeft") {
                            timerRef.current = setTimeout(() => {
                                printButtonRef.current.focus();
                            }, 100);
                        }
                    }}
                >
                    <i className="bi bi-printer"></i> {t("Print A4 Invoice")}
                </button>
            </Modal.Body>
        </Modal>

        {showOrderPreview && <OrderPreview ref={PreviewRef} />}
        <OrderPrint ref={PrintRef} />

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
                                {t("Details of Quotation")} #{model.code}
                            </h1>
                            {model.status && model.type === 'invoice' && (
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
                                {t("Quotation created on")} {formatInStoreTimezone(model.date)}
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
                            {t("Print Quotation")}
                        </button>
                        {props.openCreateForm && (
                            <button onClick={() => { handleClose(); props.openCreateForm(); }} style={{ display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #c3c6d7', backgroundColor: '#f7f9fb', color: '#191c1e', padding: '8px 24px', borderRadius: '4px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                                <i className="bi bi-plus" style={{ fontSize: '18px' }}></i>
                                {t("Create")}
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
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#434655', lineHeight: '16px' }}>{t("Net Total")}</span>
                            <span style={{ fontSize: '24px', fontWeight: 600, lineHeight: '32px', letterSpacing: '-0.01em', color: '#191c1e', fontFamily: "'Hanken Grotesk', sans-serif" }}>
                                <NumberFormat value={trimTo2Decimals(model.net_total)} displayType={"text"} thousandSeparator={true} renderText={(v) => v} />
                            </span>
                        </div>

                        {/* Total VAT */}
                        <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#434655', lineHeight: '16px' }}>
                                {t("Total VAT")} ({trimTo2Decimals(model.vat_percent)}%)
                            </span>
                            <span style={{ fontSize: '24px', fontWeight: 600, lineHeight: '32px', letterSpacing: '-0.01em', color: '#191c1e', fontFamily: "'Hanken Grotesk', sans-serif" }}>
                                <NumberFormat value={trimTo2Decimals(model.vat_price)} displayType={"text"} thousandSeparator={true} renderText={(v) => v} />
                            </span>
                        </div>

                        {/* Net Profit */}
                        <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#434655', lineHeight: '16px' }}>{t("Net Profit")}</span>
                            <span style={{ fontSize: '24px', fontWeight: 600, lineHeight: '32px', letterSpacing: '-0.01em', color: '#004ac6', fontFamily: "'Hanken Grotesk', sans-serif" }}>
                                <NumberFormat value={trimTo2Decimals(model.net_profit || 0)} displayType={"text"} thousandSeparator={true} renderText={(v) => v} />
                            </span>
                            {model.net_profit > 0 && model.net_total > 0 && (
                                <div style={{ marginTop: '4px', fontSize: '12px', color: '#004ac6', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <i className="bi bi-graph-up" style={{ fontSize: '13px' }}></i>
                                    {trimTo2Decimals((model.net_profit / model.net_total) * 100)}% {t("Margin")}
                                </div>
                            )}
                        </div>

                        {model.type === 'invoice' ? (
                            /* Payment Methods — shown when type=invoice */
                            <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ fontSize: '13px', fontWeight: 600, color: '#434655', lineHeight: '16px' }}>{t("Payment Methods")}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                                    <i className="bi bi-wallet2" style={{ fontSize: '18px', color: '#505f76' }}></i>
                                    {model.payment_methods && model.payment_methods.length > 0
                                        ? model.payment_methods.map((m, i) => (
                                            <span key={i} style={{ fontSize: '16px', fontWeight: 600, color: '#191c1e', fontFamily: "'Hanken Grotesk', sans-serif" }}>
                                                {formatPaymentMethod(m)}{i < model.payment_methods.length - 1 ? ', ' : ''}
                                            </span>
                                        ))
                                        : <span style={{ fontSize: '16px', fontWeight: 600, color: '#191c1e' }}>—</span>
                                    }
                                </div>
                                {model.payment_status && (
                                    <div style={{ marginTop: '4px', fontSize: '12px', color: model.payment_status === 'paid' ? '#15803d' : '#ba1a1a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <i className={`bi bi-${model.payment_status === 'paid' ? 'check-circle-fill' : 'clock'}`} style={{ fontSize: '12px' }}></i>
                                        {formatPaymentMethod(model.payment_status)}
                                    </div>
                                )}
                                {model.balance_amount > 0 && (
                                    <div style={{ fontSize: '12px', color: '#ba1a1a' }}>
                                        {t("Balance")}: <NumberFormat value={trimTo2Decimals(model.balance_amount)} displayType={"text"} thousandSeparator={true} renderText={(v) => v} />
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* Status — shown when not invoice */
                            <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ fontSize: '13px', fontWeight: 600, color: '#434655', lineHeight: '16px' }}>{t("Status")}</span>
                                <span style={{ fontSize: '18px', fontWeight: 600, lineHeight: '26px', color: '#191c1e', fontFamily: "'Hanken Grotesk', sans-serif" }}>
                                    {formatPaymentMethod(model.status) || "—"}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Full-width Products Section — outside the grid, above it */}
                    <section style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: '0' }}>
                        <div style={{ padding: '12px 24px', borderBottom: '1px solid #c3c6d7', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f2f4f6' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, lineHeight: '26px', fontFamily: "'Hanken Grotesk', sans-serif", color: '#191c1e' }}>{t("Quoted Items")}</h3>
                            <span style={{ fontSize: '12px', fontWeight: 500, color: '#434655' }}>{model.products?.length || 0} {t("Item(s)")}</span>
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
                                    <th style={{ padding: '12px 24px', textAlign: 'right', fontWeight: 600 }}>{t("Disc.")}</th>
                                    <th style={{ padding: '12px 24px', textAlign: 'right', fontWeight: 600 }}>{t("Disc. %")}</th>
                                    <th style={{ padding: '12px 24px', textAlign: 'right', fontWeight: 600 }}>{t("Price")}</th>
                                    <th style={{ padding: '12px 24px', textAlign: 'right', fontWeight: 600 }}>{t("Purchase Unit Price")}</th>
                                    <th style={{ padding: '12px 24px', textAlign: 'right', fontWeight: 600 }}>{t("Purchase Price")}</th>
                                    <th style={{ padding: '12px 24px', textAlign: 'right', fontWeight: 600 }}>{t("Profit")}</th>
                                    <th style={{ padding: '12px 24px', textAlign: 'right', fontWeight: 600 }}>{t("Loss")}</th>
                                </tr>
                            </thead>
                            <tbody style={{ fontSize: '14px', lineHeight: '20px', color: '#191c1e' }}>
                                {model.products && model.products.map((product, index) => (
                                    <tr key={product.item_code}
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
                                            <NumberFormat value={trimTo2Decimals((product.unit_discount || 0) * product.quantity)} displayType={"text"} thousandSeparator={true} renderText={(v) => v} />
                                        </td>
                                        <td style={{ padding: '12px 24px', textAlign: 'right' }}>
                                            <NumberFormat value={trimTo2Decimals(product.unit_discount_percent)} displayType={"text"} thousandSeparator={true} suffix="%" renderText={(v) => v} />
                                        </td>
                                        <td style={{ padding: '12px 24px', textAlign: 'right', fontWeight: 700 }}>
                                            <NumberFormat value={trimTo2Decimals((product.unit_price - (product.unit_discount || 0)) * product.quantity)} displayType={"text"} thousandSeparator={true} renderText={(v) => v} />
                                        </td>
                                        <td style={{ padding: '12px 24px', textAlign: 'right' }}>
                                            <NumberFormat value={trimTo2Decimals(product.purchase_unit_price)} displayType={"text"} thousandSeparator={true} renderText={(v) => v} />
                                        </td>
                                        <td style={{ padding: '12px 24px', textAlign: 'right' }}>
                                            <NumberFormat value={trimTo2Decimals((product.purchase_unit_price || 0) * product.quantity)} displayType={"text"} thousandSeparator={true} renderText={(v) => v} />
                                        </td>
                                        <td style={{ padding: '12px 24px', textAlign: 'right' }}>
                                            <NumberFormat value={trimTo2Decimals(product.profit)} displayType={"text"} thousandSeparator={true} renderText={(v) => v} />
                                        </td>
                                        <td style={{ padding: '12px 24px', textAlign: 'right' }}>
                                            <NumberFormat value={trimTo2Decimals(product.loss)} displayType={"text"} thousandSeparator={true} renderText={(v) => v} />
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
                                        <NumberFormat value={trimTo2Decimals(model.total)} displayType={"text"} thousandSeparator={true} renderText={(v) => v} />
                                    </span>
                                </div>
                                {model.shipping_handling_fees > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', lineHeight: '20px' }}>
                                        <span style={{ color: '#434655' }}>{t("Shipping / Handling Fees")}</span>
                                        <span>
                                            <NumberFormat value={trimTo2Decimals(model.shipping_handling_fees)} displayType={"text"} thousandSeparator={true} renderText={(v) => v} />
                                        </span>
                                    </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', lineHeight: '20px' }}>
                                    <span style={{ color: '#434655' }}>{t("Discount")}</span>
                                    <span style={{ color: '#ba1a1a' }}>
                                        -<NumberFormat value={trimTo2Decimals(model.discount || 0)} displayType={"text"} thousandSeparator={true} renderText={(v) => v} />
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', lineHeight: '20px' }}>
                                    <span style={{ color: '#434655' }}>{t("VAT")} ({trimTo2Decimals(model.vat_percent)}%)</span>
                                    <span>
                                        <NumberFormat value={trimTo2Decimals(model.vat_price)} displayType={"text"} thousandSeparator={true} renderText={(v) => v} />
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', lineHeight: '24px', fontWeight: 700, paddingTop: '8px', borderTop: '1px solid #c3c6d7', color: '#191c1e' }}>
                                    <span>{t("Net Total")}</span>
                                    <span style={{ color: '#004ac6' }}>
                                        <NumberFormat value={trimTo2Decimals(model.net_total)} displayType={"text"} thousandSeparator={true} renderText={(v) => v} />
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', lineHeight: '20px', paddingTop: '4px' }}>
                                    <span style={{ color: '#434655' }}>{t("Net Profit")}</span>
                                    <span style={{ color: '#004ac6', fontWeight: 600 }}>
                                        <NumberFormat value={trimTo2Decimals(model.net_profit)} displayType={"text"} thousandSeparator={true} renderText={(v) => v} />
                                    </span>
                                </div>
                                {model.net_loss > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', lineHeight: '20px' }}>
                                        <span style={{ color: '#434655' }}>{t("Net Loss")}</span>
                                        <span style={{ color: '#ba1a1a', fontWeight: 600 }}>
                                            <NumberFormat value={trimTo2Decimals(model.net_loss)} displayType={"text"} thousandSeparator={true} renderText={(v) => v} />
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* Sidebar */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

                            {/* Metadata */}
                            <section style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                <div style={{ padding: '12px 24px', borderBottom: '1px solid #c3c6d7', backgroundColor: '#f2f4f6' }}>
                                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, lineHeight: '26px', fontFamily: "'Hanken Grotesk', sans-serif", color: '#191c1e' }}>{t("Metadata")}</h3>
                                </div>
                                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #c3c6d7' }}>
                                        <span style={{ fontSize: '14px', color: '#434655' }}>{t("Created By")}</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#2563eb', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700 }}>
                                                {model.created_by_name ? model.created_by_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : ''}
                                            </div>
                                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e' }}>{model.created_by_name}</span>
                                        </div>
                                    </div>
                                    {model.customer_name && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #c3c6d7' }}>
                                            <span style={{ fontSize: '14px', color: '#434655' }}>{t("Customer")}</span>
                                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e' }}>{model.customer_name}</span>
                                        </div>
                                    )}
                                    {model.delivered_by_name && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #c3c6d7' }}>
                                            <span style={{ fontSize: '14px', color: '#434655' }}>{t("Delivered By")}</span>
                                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e' }}>{model.delivered_by_name}</span>
                                        </div>
                                    )}
                                    {model.date && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #c3c6d7' }}>
                                            <span style={{ fontSize: '14px', color: '#434655' }}>{t("Date")}</span>
                                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e' }}>
                                                {formatInStoreTimezone(model.date)}
                                            </span>
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
                                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e' }}>
                                                <NumberFormat value={trimTo2Decimals(model.partial_payment_amount)} displayType={"text"} thousandSeparator={true} renderText={(v) => v} />
                                            </span>
                                        </div>
                                    )}
                                    {model.vat_percent > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #c3c6d7' }}>
                                            <span style={{ fontSize: '14px', color: '#434655' }}>{t("VAT %")}</span>
                                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e' }}>{trimTo2Decimals(model.vat_percent)}%</span>
                                        </div>
                                    )}
                                    {model.discount_percent > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #c3c6d7' }}>
                                            <span style={{ fontSize: '14px', color: '#434655' }}>{t("Discount %")}</span>
                                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e' }}>{trimTo2Decimals(model.discount_percent)}%</span>
                                        </div>
                                    )}
                                    {model.profit > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #c3c6d7' }}>
                                            <span style={{ fontSize: '14px', color: '#434655' }}>{t("Profit")}</span>
                                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#004ac6' }}>
                                                <NumberFormat value={trimTo2Decimals(model.profit)} displayType={"text"} thousandSeparator={true} renderText={(v) => v} />
                                            </span>
                                        </div>
                                    )}
                                    {model.loss > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #c3c6d7' }}>
                                            <span style={{ fontSize: '14px', color: '#434655' }}>{t("Loss")}</span>
                                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#ba1a1a' }}>
                                                <NumberFormat value={trimTo2Decimals(model.loss)} displayType={"text"} thousandSeparator={true} renderText={(v) => v} />
                                            </span>
                                        </div>
                                    )}
                                    {model.created_at && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #c3c6d7' }}>
                                            <span style={{ fontSize: '14px', color: '#434655' }}>{t("Created At")}</span>
                                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e' }}>{formatInStoreTimezone(model.created_at)}</span>
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
            </Modal.Body>
            <Modal.Footer style={{ backgroundColor: '#ffffff', borderTop: '1px solid #c3c6d7', padding: '12px 32px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button onClick={handleClose} style={{ backgroundColor: '#d0e1fb', color: '#54647a', border: 'none', padding: '8px 24px', borderRadius: '4px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                    {t("Cancel")}
                </button>
                <button onClick={openPrint} style={{ backgroundColor: '#004ac6', color: '#ffffff', border: 'none', padding: '8px 24px', borderRadius: '4px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                    {t("Print Quotation")}
                </button>
            </Modal.Footer>
        </Modal>
    </>);

});

export default QuotationView;
