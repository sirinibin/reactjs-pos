import React, { useState, useRef, forwardRef, useImperativeHandle, useEffect, useCallback } from "react";
import { Modal, Button } from 'react-bootstrap';

import NumberFormat from "react-number-format";
import OrderPreview from './preview.js';
import OrderPrint from './print.js';
import { QRCodeCanvas } from "qrcode.react";
import { trimTo2Decimals } from "../utils/numberUtils";
import { useTranslation } from 'react-i18next';
import { ObjectToSearchQueryParams } from '../utils/queryUtils.js';
import { formatInStoreTimezone, formatPaymentMethod } from '../utils/dateUtils.js';
import { fetchStore } from '../utils/storeUtils.js';

const OrderView = forwardRef((props, ref) => {
    const { t } = useTranslation('common');

    let [salesID, setSalesID] = useState("");
    useImperativeHandle(ref, () => ({

        open(id) {
            if (id) {
                salesID = id;
                setSalesID(salesID);
                getOrder(id);
                getCashDiscounts(id);
                getPayments(id);
                SetShow(true);
            }


            if (localStorage.getItem('store_id')) {
                getStore(localStorage.getItem('store_id'));
            }

        },

    }));


    let [model, setModel] = useState({});




    const [searchParams, setSearchParams] = useState({});

    let [salesCashDiscountList, setSalesCashDiscountList] = useState([]);
    let [totalCashDiscounts, setTotalCashDiscounts] = useState(0.00);

    function getCashDiscounts(order_id) {
        const requestOptions = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: localStorage.getItem("access_token"),
            },
        };
        let Select =
            "select=id,amount,store_name,order_code,order_id,created_by_name,created_at";
        if (localStorage.getItem("store_id")) {
            searchParams.store_id = localStorage.getItem("store_id");
        }
        searchParams["order_id"] = order_id;
        setSearchParams(searchParams);
        let queryParams = ObjectToSearchQueryParams(searchParams);
        if (queryParams !== "") {
            queryParams = "&" + queryParams;
        }

        fetch(
            "/v1/sales-cash-discount?" +
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

                setSalesCashDiscountList(data.result);
                totalCashDiscounts = data.meta.total_cash_discount;
                setTotalCashDiscounts(totalCashDiscounts);


            })
            .catch((error) => {
                console.log(error);
            });
    }


    let [salesPaymentList, setSalesPaymentList] = useState([]);
    let [totalPayments, setTotalPayments] = useState(0.00);

    function getPayments(order_id) {
        const requestOptions = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: localStorage.getItem("access_token"),
            },
        };
        let Select =
            "select=id,amount,method,store_name,order_code,order_id,created_by_name,created_at";
        if (localStorage.getItem("store_id")) {
            searchParams.store_id = localStorage.getItem("store_id");
        }
        searchParams["order_id"] = order_id;
        setSearchParams(searchParams);
        let queryParams = ObjectToSearchQueryParams(searchParams);
        if (queryParams !== "") {
            queryParams = "&" + queryParams;
        }

        fetch(
            "/v1/sales-payment?" +
            Select +
            queryParams + "&limit=100",
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

                setSalesPaymentList(data.result);
                totalPayments = data.meta.total_cash_discount;
                setTotalPayments(totalPayments);


            })
            .catch((error) => {
                console.log(error);
            });
    }


    function getOrder(id) {
        // console.log("inside get Order");
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


        fetch('/v1/order/' + id + "?" + queryParams, requestOptions)
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();

                // check for error response
                if (!response.ok) {
                    const error = (data && data.errors);
                    return Promise.reject(error);
                }

                // setErrors({});

                // console.log("Response:");
                // console.log(data);

                model = data.result;

                setModel({ ...model });
            })
            .catch(error => {
                // setErrors(error);
            });
    }

    const [show, SetShow] = useState(false);

    function handleClose() {
        // model = "";
        setModel("");
        SetShow(false);
    };




    let [store, setStore] = useState({});

    async function getStore(id) {
        try {
            const data = await fetchStore(id);
            setStore({ ...data });
        } catch (error) { }
    }


    let [showOrderPreview, setShowOrderPreview] = useState(false);
    let [showPrintTypeSelection, setShowPrintTypeSelection] = useState(false);

    const timerRef = useRef(null);
    const PreviewRef = useRef();

    const openPreview = useCallback(() => {
        setShowOrderPreview(true);
        setShowPrintTypeSelection(false);


        if (timerRef.current) clearTimeout(timerRef.current);

        timerRef.current = setTimeout(() => {
            if (model.id === salesID) {
                PreviewRef.current?.open(model, undefined, "sales");
                handleClose();
            }

        }, 100);

    }, [model, salesID]);

    function sendWhatsAppMessage() {
        setShowPrintTypeSelection(false);
        setShowOrderPreview(true);


        if (timerRef.current) clearTimeout(timerRef.current);

        timerRef.current = setTimeout(() => {
            PreviewRef.current?.open(model, "whatsapp", "whatsapp_sales");
            handleClose();
        }, 100);
    }

    const PrintRef = useRef();
    const openPrint = useCallback(() => {
        // document.removeEventListener('keydown', handleEnterKey);
        setShowPrintTypeSelection(false);

        PrintRef.current?.open(model, "sales");
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



    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, []);








    return (<>

        <Modal show={showPrintTypeSelection} onHide={() => {
            showPrintTypeSelection = false;
            setShowPrintTypeSelection(showPrintTypeSelection);
        }} centered>
            <Modal.Header closeButton>
                <Modal.Title>{t("Select Print Type")}</Modal.Title>
            </Modal.Header>
            <Modal.Body className="d-flex justify-content-around">
                <Button variant="secondary" ref={printButtonRef} onClick={() => { openPrint(); }} onKeyDown={(e) => {
                    if (timerRef.current) clearTimeout(timerRef.current);
                    if (e.key === "ArrowRight") {
                        timerRef.current = setTimeout(() => { printA4ButtonRef.current.focus(); }, 100);
                    }
                }}>
                    <i className="bi bi-printer"></i> {t("Print")}
                </Button>
                <Button variant="primary" ref={printA4ButtonRef} onClick={() => { openPreview(); }} onKeyDown={(e) => {
                    if (timerRef.current) clearTimeout(timerRef.current);
                    if (e.key === "ArrowLeft") {
                        timerRef.current = setTimeout(() => { printButtonRef.current.focus(); }, 100);
                    }
                }}>
                    <i className="bi bi-printer"></i> {t("Print A4 Invoice")}
                </Button>
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
                                {t("Details of Sales")} #{model.code}
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
                                {t("Order processed on")} {formatInStoreTimezone(model.date, store?.country_code)}
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
                            {model.payment_status === 'paid' && (
                                <div style={{ marginTop: '4px', fontSize: '12px', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <i className="bi bi-arrow-up-right" style={{ fontSize: '14px' }}></i>
                                    {t("Fully settled")}
                                </div>
                            )}
                        </div>

                        {/* Total VAT */}
                        <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#434655', lineHeight: '16px' }}>{t("Total VAT ({{vatPercent}}%)", { vatPercent: trimTo2Decimals(model.vat_percent) })}</span>
                            <span style={{ fontSize: '24px', fontWeight: 600, lineHeight: '32px', letterSpacing: '-0.01em', color: '#191c1e', fontFamily: "'Hanken Grotesk', sans-serif" }}>
                                <NumberFormat value={trimTo2Decimals(model.vat_price)} displayType={"text"} thousandSeparator={true} renderText={(v) => v} />
                            </span>
                        </div>

                        {/* Net Profit */}
                        <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#434655', lineHeight: '16px' }}>{t("Net Profit")}</span>
                            <span style={{ fontSize: '24px', fontWeight: 600, lineHeight: '32px', letterSpacing: '-0.01em', color: '#004ac6', fontFamily: "'Hanken Grotesk', sans-serif" }}>
                                <NumberFormat value={trimTo2Decimals(model.net_profit)} displayType={"text"} thousandSeparator={true} renderText={(v) => v} />
                            </span>
                            {model.net_profit > 0 && model.net_total > 0 && (
                                <div style={{ marginTop: '4px', fontSize: '12px', color: '#004ac6', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <i className="bi bi-graph-up" style={{ fontSize: '14px' }}></i>
                                    {trimTo2Decimals((model.net_profit / model.net_total) * 100)}% {t("Margin")}
                                </div>
                            )}
                        </div>

                        {/* Payment Methods */}
                        <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#434655', lineHeight: '16px' }}>{t("Payment Methods")}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                <i className="bi bi-wallet2" style={{ fontSize: '20px', color: '#505f76' }}></i>
                                <span style={{ fontSize: '18px', fontWeight: 600, lineHeight: '26px', color: '#191c1e', fontFamily: "'Hanken Grotesk', sans-serif" }}>
                                    {salesPaymentList.length > 0
                                        ? [...new Set(salesPaymentList.map(p => formatPaymentMethod(p.method)))].join(', ')
                                        : formatPaymentMethod(model.payment_method)}
                                </span>
                            </div>
                            {model.partial_payment_amount > 0 && (
                                <div style={{ fontSize: '12px', color: '#434655' }}>
                                    {t("Partial")}: <NumberFormat value={trimTo2Decimals(model.partial_payment_amount)} displayType={"text"} thousandSeparator={true} renderText={(v) => v} />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Full-width Products Section — OUTSIDE the grid, ABOVE it */}
                    <section style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: '32px' }}>
                        <div style={{ padding: '12px 24px', borderBottom: '1px solid #c3c6d7', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f2f4f6' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, lineHeight: '26px', fontFamily: "'Hanken Grotesk', sans-serif", color: '#191c1e' }}>{t("Sold Items")}</h3>
                            <span style={{ fontSize: '12px', fontWeight: 500, color: '#434655' }}>{model.products?.length || 0} {t("Item(s)")}</span>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', minWidth: '700px' }}>
                                        <thead style={{ backgroundColor: '#f1f5f9' }}>
                                            <tr style={{ fontSize: '13px', fontWeight: 600, color: '#434655', textTransform: 'uppercase', lineHeight: '16px' }}>
                                                <th style={{ padding: '12px 24px', fontWeight: 600 }}>{t("SI No.")}</th>
                                                <th style={{ padding: '12px 24px', fontWeight: 600 }}>{t("Part No.")}</th>
                                                <th style={{ padding: '12px 24px', fontWeight: 600 }}>{t("Product Name")}</th>
                                                <th style={{ padding: '12px 24px', textAlign: 'center', fontWeight: 600 }}>{t("Qty")}</th>
                                                <th style={{ padding: '12px 24px', textAlign: 'right', fontWeight: 600 }}>{t("Unit Price")}</th>
                                                <th style={{ padding: '12px 24px', textAlign: 'right', fontWeight: 600 }}>{t("Disc %")}</th>
                                                <th style={{ padding: '12px 24px', textAlign: 'right', fontWeight: 600 }}>{t("VAT")}</th>
                                                <th style={{ padding: '12px 24px', textAlign: 'right', fontWeight: 600 }}>{t("Total Price")}</th>
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
                        {/* Totals Summary */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '24px', backgroundColor: '#ffffff' }}>
                            <div style={{ width: '100%', maxWidth: '320px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', lineHeight: '20px' }}>
                                    <span style={{ color: '#434655' }}>{t("Subtotal")}</span>
                                    <span><NumberFormat value={trimTo2Decimals(model.total)} displayType={"text"} thousandSeparator={true} renderText={(v) => v} /></span>
                                </div>
                                {model.shipping_handling_fees > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', lineHeight: '20px' }}>
                                        <span style={{ color: '#434655' }}>{t("Shipping / Handling Fees")}</span>
                                        <span><NumberFormat value={trimTo2Decimals(model.shipping_handling_fees)} displayType={"text"} thousandSeparator={true} renderText={(v) => v} /></span>
                                    </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', lineHeight: '20px' }}>
                                    <span style={{ color: '#434655' }}>{t("Discount")}</span>
                                    <span style={{ color: '#ba1a1a' }}>-<NumberFormat value={trimTo2Decimals(model.discount || 0)} displayType={"text"} thousandSeparator={true} renderText={(v) => v} /></span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', lineHeight: '20px' }}>
                                    <span style={{ color: '#434655' }}>{t("VAT ({{vatPercent}}%)", { vatPercent: trimTo2Decimals(model.vat_percent) })}</span>
                                    <span><NumberFormat value={trimTo2Decimals(model.vat_price)} displayType={"text"} thousandSeparator={true} renderText={(v) => v} /></span>
                                </div>
                                {model.rounding_amount !== 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', lineHeight: '20px' }}>
                                        <span style={{ color: '#434655' }}>{t("Rounding Amount")}</span>
                                        <span><NumberFormat value={trimTo2Decimals(model.rounding_amount)} displayType={"text"} thousandSeparator={true} renderText={(v) => v} /></span>
                                    </div>
                                )}
                                {model.cash_discount > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', lineHeight: '20px' }}>
                                        <span style={{ color: '#434655' }}>{t("Cash Discount")}</span>
                                        <span style={{ color: '#ba1a1a' }}>-<NumberFormat value={trimTo2Decimals(model.cash_discount)} displayType={"text"} thousandSeparator={true} renderText={(v) => v} /></span>
                                    </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', lineHeight: '24px', fontWeight: 700, paddingTop: '8px', borderTop: '1px solid #c3c6d7', color: '#191c1e' }}>
                                    <span>{t("Net Total")}</span>
                                    <span style={{ color: '#004ac6' }}>
                                        <NumberFormat value={trimTo2Decimals(model.net_total)} displayType={"text"} thousandSeparator={true} renderText={(v) => v} />
                                    </span>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Main Body Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 items-start" style={{ gap: '32px' }}>

                        {/* Left Column: Payments & Cash Discounts */}
                        <div className="lg:col-span-8" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

                            {/* Cash Discounts */}
                            {salesCashDiscountList.length > 0 && (
                                <section style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden', maxHeight: '500px', overflowY: 'auto' }}>
                                    <div style={{ padding: '12px 24px', borderBottom: '1px solid #c3c6d7', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <i className="bi bi-tag" style={{ color: '#505f76' }}></i>
                                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, lineHeight: '26px', fontFamily: "'Hanken Grotesk', sans-serif", color: '#191c1e' }}>{t("Cash Discounts")}</h3>
                                    </div>
                                    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        {salesCashDiscountList.map((cd) => (
                                            <div key={cd.id} className="grid grid-cols-1 md:grid-cols-3" style={{ gap: '16px', padding: '16px', backgroundColor: '#f2f4f6', borderRadius: '4px', border: '1px solid #c3c6d7' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontSize: '12px', fontWeight: 500, color: '#434655', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t("Amount")}</span>
                                                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#191c1e' }}>{trimTo2Decimals(cd.amount)}</span>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontSize: '12px', fontWeight: 500, color: '#434655', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t("Created By")}</span>
                                                    <span style={{ fontSize: '14px', color: '#191c1e' }}>{cd.created_by_name}</span>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontSize: '12px', fontWeight: 500, color: '#434655', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t("Created At")}</span>
                                                    <span style={{ fontSize: '14px', color: '#191c1e' }}>{formatInStoreTimezone(cd.created_at, store?.country_code)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Payment History */}
                            {salesPaymentList.length > 0 && (
                                <section style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden', maxHeight: '500px', overflowY: 'auto' }}>
                                    <div style={{ padding: '12px 24px', borderBottom: '1px solid #c3c6d7', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <i className="bi bi-clock-history" style={{ color: '#505f76' }}></i>
                                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, lineHeight: '26px', fontFamily: "'Hanken Grotesk', sans-serif", color: '#191c1e' }}>{t("Payment History")}</h3>
                                    </div>
                                    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        {salesPaymentList.map((payment) => (
                                            <div key={payment.id} className="grid grid-cols-1 md:grid-cols-3" style={{ gap: '16px', padding: '16px', backgroundColor: '#f2f4f6', borderRadius: '4px', border: '1px solid #c3c6d7' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontSize: '12px', fontWeight: 500, color: '#434655', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t("Amount")}</span>
                                                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#191c1e' }}>{trimTo2Decimals(payment.amount)}</span>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontSize: '12px', fontWeight: 500, color: '#434655', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t("Method")}</span>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <i className="bi bi-credit-card" style={{ fontSize: '12px', color: '#505f76' }}></i>
                                                        <span style={{ fontSize: '14px', color: '#191c1e' }}>{formatPaymentMethod(payment.method)}</span>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontSize: '12px', fontWeight: 500, color: '#434655', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t("Date")}</span>
                                                    <span style={{ fontSize: '14px', color: '#191c1e' }}>{formatInStoreTimezone(payment.date || payment.created_at, store?.country_code)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}
                        </div>

                        {/* Right Column: Sidebar */}
                        <div className="lg:col-span-4" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

                            {/* Zatca Info Card */}
                            <section style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                <div style={{ padding: '12px 24px', borderBottom: '1px solid #c3c6d7', backgroundColor: '#f2f4f6' }}>
                                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, lineHeight: '26px', fontFamily: "'Hanken Grotesk', sans-serif", color: '#191c1e' }}>{t("Zatca Info")}</h3>
                                </div>
                                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: '16px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontSize: '12px', fontWeight: 500, color: '#434655' }}>{t("Zatca Status")}</span>
                                            <span style={{ fontSize: '14px', fontWeight: 700, color: model.zatca?.reporting_passed ? '#15803d' : '#ba1a1a' }}>
                                                {model.zatca?.reporting_passed ? t("YES") : t("NO (Pending)")}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontSize: '12px', fontWeight: 500, color: '#434655' }}>{t("Reported At")}</span>
                                            <span style={{ fontSize: '14px', color: model.zatca?.reporting_passed_at ? '#191c1e' : '#434655', fontStyle: model.zatca?.reporting_passed_at ? 'normal' : 'italic' }}>
                                                {model.zatca?.reporting_passed_at ? formatInStoreTimezone(model.zatca.reporting_passed_at, store?.country_code) : t("Not set")}
                                            </span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <span style={{ fontSize: '12px', fontWeight: 500, color: '#434655' }}>UUID</span>
                                        <span style={{ fontSize: '12px', fontFamily: 'monospace', wordBreak: 'break-all', backgroundColor: '#eceef0', padding: '4px 8px', borderRadius: '4px' }}>{model.uuid}</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <span style={{ fontSize: '12px', fontWeight: 500, color: '#434655' }}>{t("Reported Invoice Hash")}</span>
                                        {model.zatca?.reporting_invoice_hash
                                            ? <span style={{ fontSize: '12px', fontFamily: 'monospace', wordBreak: 'break-all', backgroundColor: '#eceef0', padding: '4px 8px', borderRadius: '4px' }}>{model.zatca.reporting_invoice_hash}</span>
                                            : <>
                                                <div style={{ height: '16px', width: '100%', backgroundColor: '#e6e8ea', borderRadius: '4px' }}></div>
                                                <span style={{ fontSize: '12px', fontStyle: 'italic', color: '#434655', marginTop: '4px' }}>{t("Awaiting reporting signature")}</span>
                                              </>
                                        }
                                    </div>
                                    {model.zatca?.qr_code && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <span style={{ fontSize: '12px', fontWeight: 500, color: '#434655' }}>{t("QR Code")}</span>
                                            <QRCodeCanvas value={model.zatca.qr_code} size={96} />
                                        </div>
                                    )}
                                    {model.zatca?.signing_time && (
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontSize: '12px', fontWeight: 500, color: '#434655' }}>{t("Signing time")}</span>
                                            <span style={{ fontSize: '14px', color: '#191c1e' }}>{formatInStoreTimezone(model.zatca.signing_time, store?.country_code)}</span>
                                        </div>
                                    )}
                                    {model.zatca?.compliance_check_failed_count > 0 && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <span style={{ fontSize: '12px', color: '#ba1a1a' }}>{t("Compliance check failed")}: {model.zatca.compliance_check_failed_count}</span>
                                            {model.zatca?.compliance_check_errors?.length > 0 && (
                                                <ol style={{ fontSize: '12px', color: '#ba1a1a', paddingLeft: '16px', margin: 0 }}>
                                                    {model.zatca.compliance_check_errors.map((err, i) => <li key={i}>{err}</li>)}
                                                </ol>
                                            )}
                                        </div>
                                    )}
                                    {model.zatca?.reporting_failed_count > 0 && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <span style={{ fontSize: '12px', color: '#ba1a1a' }}>{t("Reporting failed")}: {model.zatca.reporting_failed_count}</span>
                                            {model.zatca?.reporting_errors?.length > 0 && (
                                                <ol style={{ fontSize: '12px', color: '#ba1a1a', paddingLeft: '16px', margin: 0 }}>
                                                    {model.zatca.reporting_errors.map((err, i) => <li key={i}>{err}</li>)}
                                                </ol>
                                            )}
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
                                    {model.customer_name && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #c3c6d7' }}>
                                            <span style={{ fontSize: '14px', color: '#434655' }}>{t("Customer")}</span>
                                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e' }}>{model.customer_name}</span>
                                        </div>
                                    )}
                                    {model.delivered_by_name && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #c3c6d7' }}>
                                            <span style={{ fontSize: '14px', color: '#434655' }}>{t("Delivered by")}</span>
                                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e' }}>{model.delivered_by_name}</span>
                                        </div>
                                    )}
                                    {model.date && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #c3c6d7' }}>
                                            <span style={{ fontSize: '14px', color: '#434655' }}>{t("Creation Date")}</span>
                                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e' }}>{formatInStoreTimezone(model.date, store?.country_code)}</span>
                                        </div>
                                    )}
                                    {model.updated_at && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                            <span style={{ fontSize: '14px', color: '#434655', flexShrink: 0 }}>{t("Last Updated")}</span>
                                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e', textAlign: 'right' }}>{formatInStoreTimezone(model.updated_at, store?.country_code)}</span>
                                        </div>
                                    )}
                                    {model.updated_by_name && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '14px', color: '#434655' }}>{t("Updated By")}</span>
                                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e' }}>{model.updated_by_name}</span>
                                        </div>
                                    )}
                                    {model.prev_hash && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <span style={{ fontSize: '14px', color: '#434655' }}>{t("Previous Invoice Hash")}</span>
                                            <span style={{ fontSize: '11px', fontFamily: 'monospace', wordBreak: 'break-all', backgroundColor: '#eceef0', padding: '4px 8px', borderRadius: '4px' }}>{model.prev_hash}</span>
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
                <button onClick={() => { const id = model.id; handleClose(); props.openUpdateForm && props.openUpdateForm(id); }} style={{ backgroundColor: '#004ac6', color: '#ffffff', border: 'none', padding: '8px 24px', borderRadius: '4px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                    {t("Update Sale")}
                </button>
            </Modal.Footer>
        </Modal>
    </>);

});

export default OrderView;