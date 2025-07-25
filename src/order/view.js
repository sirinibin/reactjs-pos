import React, { useState, useRef, forwardRef, useImperativeHandle, useEffect, useCallback } from "react";
import { Modal, Button, Table } from 'react-bootstrap';

import NumberFormat from "react-number-format";
import OrderPreview from './preview.js';
import OrderPrint from './print.js';
import { format } from "date-fns";
import { QRCodeCanvas } from "qrcode.react";
import { trimTo2Decimals } from "../utils/numberUtils";

const OrderView = forwardRef((props, ref) => {

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
        console.log("inside get Order");
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
        // model = "";
        setModel("");
        SetShow(false);
    };



    function ObjectToSearchQueryParams(object) {
        return Object.keys(object)
            .map(function (key) {
                return `search[${key}]=${object[key]}`;
            })
            .join("&");
    }


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
            })
            .catch(error => {

            });
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
                <Modal.Title>Select Print Type</Modal.Title>
            </Modal.Header>
            <Modal.Body className="d-flex justify-content-around">

                <Button variant="secondary" ref={printButtonRef} onClick={() => {
                    openPrint();
                }} onKeyDown={(e) => {
                    if (timerRef.current) clearTimeout(timerRef.current);

                    if (e.key === "ArrowRight") {
                        timerRef.current = setTimeout(() => {
                            printA4ButtonRef.current.focus();
                        }, 100);
                    }
                }}>
                    <i className="bi bi-printer"></i> Print
                </Button>

                <Button variant="primary" ref={printA4ButtonRef} onClick={() => {
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
                    <i className="bi bi-printer"></i> Print A4 Invoice
                </Button>
            </Modal.Body>
        </Modal >
        {showOrderPreview && <OrderPreview ref={PreviewRef} />}

        <OrderPrint ref={PrintRef} />
        <Modal show={show} size="xl" onHide={handleClose} animation={false} scrollable={true}>
            <Modal.Header>
                <Modal.Title>Details of Sales Order #{model.code}</Modal.Title>

                <div className="col align-self-end text-end">
                    {props.openCreateForm ? <Button variant="primary" onClick={() => {
                        handleClose();
                        props.openCreateForm();
                    }}>
                        <i className="bi bi-plus"></i> Create
                    </Button> : ""}
                    &nbsp;&nbsp;

                    <Button variant="secondary" onClick={() => {
                        openPrint();
                    }}>
                        <i className="bi bi-printer"></i> Print
                    </Button>

                    &nbsp;&nbsp;
                    <Button variant="primary" onClick={() => {
                        openPreview();
                    }}>
                        <i className="bi bi-printer"></i> Print A4 Invoice
                    </Button>

                    &nbsp;&nbsp;
                    <Button className={`btn btn-success btn-sm`} style={{}} onClick={sendWhatsAppMessage}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="white" viewBox="0 0 16 16">
                            <path d="M13.601 2.326A7.875 7.875 0 0 0 8.036 0C3.596 0 0 3.597 0 8.036c0 1.417.37 2.805 1.07 4.03L0 16l3.993-1.05a7.968 7.968 0 0 0 4.043 1.085h.003c4.44 0 8.036-3.596 8.036-8.036 0-2.147-.836-4.166-2.37-5.673ZM8.036 14.6a6.584 6.584 0 0 1-3.35-.92l-.24-.142-2.37.622.63-2.31-.155-.238a6.587 6.587 0 0 1-1.018-3.513c0-3.637 2.96-6.6 6.6-6.6 1.764 0 3.42.69 4.67 1.94a6.56 6.56 0 0 1 1.93 4.668c0 3.637-2.96 6.6-6.6 6.6Zm3.61-4.885c-.198-.1-1.17-.578-1.352-.644-.18-.066-.312-.1-.444.1-.13.197-.51.644-.626.775-.115.13-.23.15-.428.05-.198-.1-.837-.308-1.594-.983-.59-.525-.99-1.174-1.11-1.372-.116-.198-.012-.305.088-.403.09-.09.198-.23.298-.345.1-.115.132-.197.2-.33.065-.13.032-.247-.017-.345-.05-.1-.444-1.07-.61-1.46-.16-.384-.323-.332-.444-.338l-.378-.007c-.13 0-.344.048-.525.23s-.688.672-.688 1.64c0 .967.704 1.9.802 2.03.1.13 1.386 2.116 3.365 2.963.47.203.837.324 1.122.414.472.15.902.13 1.24.08.378-.057 1.17-.48 1.336-.942.165-.462.165-.858.116-.943-.048-.084-.18-.132-.378-.23Z" />
                        </svg>
                    </Button>


                    <button
                        type="button"
                        className="btn-close"
                        onClick={handleClose}
                        aria-label="Close"
                    ></button>

                </div>
            </Modal.Header>
            <Modal.Body>


                <div className="table-responsive" style={{ overflowX: "auto" }}>
                    <table className="table table-striped table-sm table-bordered">
                        <thead>
                            <tr className="text-center">
                                <th>SI No.</th>
                                <th>Part No.</th>
                                <th>Name</th>
                                <th>Qty</th>
                                <th>Unit Price</th>
                                <th>Disc.</th>
                                <th>Disc. %</th>
                                <th>Price</th>
                                <th>Qty Returned</th>
                                <th>Purchase Unit Price</th>
                                <th>Purchase Price</th>
                                <th>Profit</th>
                                <th>Loss</th>
                            </tr>
                        </thead>
                        <tbody>
                            {model.products && model.products.map((product, index) => (
                                <tr key={product.item_code} className="text-center">
                                    <td>{index + 1}</td>
                                    <td>{product.part_number}</td>
                                    <td>{product.name}{product.name_in_arabic ? " / " + product.name_in_arabic : ""}</td>
                                    <td>{product.quantity}  {product.unit ? product.unit : ""} </td>
                                    <td className="text-end">
                                        <NumberFormat
                                            value={trimTo2Decimals(product.unit_price)}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={" "}
                                            renderText={(value, props) => value}
                                        />
                                    </td>
                                    <td className="text-end">
                                        <NumberFormat
                                            value={product.unit_discount ? trimTo2Decimals(product.unit_discount * product.quantity) : 0.00}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={" "}
                                            renderText={(value, props) => value}
                                        />
                                    </td>
                                    <td className="text-end">
                                        <NumberFormat
                                            value={trimTo2Decimals(product.unit_discount_percent)}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={"%"}
                                            renderText={(value, props) => value}
                                        />
                                    </td>
                                    <td className="text-end">
                                        <NumberFormat
                                            value={trimTo2Decimals((product.unit_price - product.unit_discount) * product.quantity)}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={" "}
                                            renderText={(value, props) => value}
                                        />
                                    </td>
                                    <td>{product.quantity_returned}  {product.unit ? product.unit : ""} </td>
                                    <td className="text-end">
                                        <NumberFormat
                                            value={trimTo2Decimals(product.purchase_unit_price)}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={" "}
                                            renderText={(value, props) => value}
                                        />
                                    </td>
                                    <td className="text-end">
                                        <NumberFormat
                                            value={trimTo2Decimals(product.purchase_unit_price * product.quantity)}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={" "}
                                            renderText={(value, props) => value}
                                        />
                                    </td>
                                    <td className="text-end">
                                        <NumberFormat
                                            value={trimTo2Decimals(product.profit)}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={" "}
                                            renderText={(value, props) => value}
                                        />
                                    </td>
                                    <td className="text-end">
                                        <NumberFormat
                                            value={trimTo2Decimals(product.loss)}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={" "}
                                            renderText={(value, props) => value}
                                        />
                                    </td>
                                </tr>
                            ))}
                            <tr>
                                <th colSpan="7" className="text-end">Total</th>
                                <td className="text-end">
                                    {model.total ? <NumberFormat
                                        value={trimTo2Decimals(model.total)}
                                        displayType={"text"}
                                        thousandSeparator={true}
                                        suffix={" "}
                                        renderText={(value, props) => value}
                                    /> : "0.00 "}
                                </td>
                                <td colSpan="3" ></td>

                                <td className="text-end">
                                    <NumberFormat
                                        value={trimTo2Decimals(model.profit)}
                                        displayType={"text"}
                                        thousandSeparator={true}
                                        suffix={" "}
                                        renderText={(value, props) => value}
                                    />
                                </td>
                                <td className="text-end">
                                    <NumberFormat
                                        value={trimTo2Decimals(model.loss)}
                                        displayType={"text"}
                                        thousandSeparator={true}
                                        suffix={" "}
                                        renderText={(value, props) => value}
                                    />
                                </td>
                            </tr>
                            <tr>
                                <th colSpan="7" className="text-end">
                                    Shipping / Handling Fees
                                </th>
                                <td className="text-end">
                                    {model.shipping_handling_fees ? <NumberFormat
                                        value={trimTo2Decimals(model.shipping_handling_fees)}
                                        displayType={"text"}
                                        thousandSeparator={true}
                                        suffix={" "}
                                        renderText={(value, props) => value}
                                    /> : "0.00 "}
                                </td>
                                <td colSpan="3"></td>
                                <td colSpan="1" className="text-end">0.00</td>
                                <td colSpan="1" className="text-end">0.00</td>
                            </tr>
                            <tr>
                                <th colSpan="7" className="text-end">
                                    Discount
                                </th>
                                <td className="text-end">
                                    {model.discount ? <NumberFormat
                                        value={trimTo2Decimals(model.discount)}
                                        displayType={"text"}
                                        thousandSeparator={true}
                                        suffix={" "}
                                        renderText={(value, props) => value}
                                    /> : "0.00 "}
                                </td>
                                <td colSpan="3"></td>

                                <td className="text-end">
                                    <NumberFormat
                                        value={trimTo2Decimals(model.discount - model.return_discount)}
                                        displayType={"text"}
                                        thousandSeparator={true}
                                        suffix={" "}
                                        renderText={(value, props) => value}
                                    />
                                </td>

                                <td className="text-end">
                                    0.00
                                </td>
                            </tr>
                            <tr>
                                <th colSpan="7" className="text-end">VAT {trimTo2Decimals(model.vat_percent) + "%"}</th>
                                <td className="text-end">
                                    <NumberFormat
                                        value={trimTo2Decimals(model.vat_price)}
                                        displayType={"text"}
                                        thousandSeparator={true}
                                        suffix={" "}
                                        renderText={(value, props) => value}
                                    />
                                </td>
                                <td colSpan="3"></td>
                                <td className="text-end">0.00 </td>
                                <td className="text-end">0.00</td>
                            </tr>
                            <tr>
                                <th colSpan="7" className="text-end">Net Total Before Rounding</th>
                                <th className="text-end">
                                    <NumberFormat
                                        value={trimTo2Decimals((model.net_total - model.rounding_amount))}
                                        displayType={"text"}
                                        thousandSeparator={true}
                                        suffix={""}
                                        renderText={(value, props) => value}
                                    />
                                </th>
                                <th colSpan={3} className="text-end"></th>
                                <td className="text-end">
                                    0.00
                                </td>
                                <td className="text-end">0.00</td>
                            </tr>
                            <tr>
                                <th colSpan="7" className="text-end">Rounding Amount</th>
                                <th className="text-end">
                                    <NumberFormat
                                        value={trimTo2Decimals(model.rounding_amount)}
                                        displayType={"text"}
                                        thousandSeparator={true}
                                        suffix={""}
                                        renderText={(value, props) => value}
                                    />
                                </th>
                                <th colSpan={3} className="text-end"></th>
                                <td className="text-end">
                                    0.00
                                </td>
                                <td className="text-end">0.00</td>
                            </tr>
                            <tr>
                                <th colSpan="7" className="text-end">Net Total</th>
                                <th className="text-end">
                                    <NumberFormat
                                        value={trimTo2Decimals(model.net_total)}
                                        displayType={"text"}
                                        thousandSeparator={true}
                                        suffix={""}
                                        renderText={(value, props) => value}
                                    />
                                </th>
                                <th colSpan={3} className="text-end">Cash discount</th>
                                <td className="text-end">
                                    <NumberFormat
                                        value={trimTo2Decimals(model.cash_discount)}
                                        displayType={"text"}
                                        suffix={""}
                                        thousandSeparator={true}
                                        renderText={(value, props) => value}
                                    />
                                </td>
                                <td className="text-end">0.00</td>
                            </tr>
                            <tr>
                                <td colSpan="8"></td>
                                <th colSpan="3" className="text-end">Net Profit / Loss</th>
                                <th className="text-end">
                                    <NumberFormat
                                        value={trimTo2Decimals(model.net_profit)}
                                        displayType={"text"}
                                        suffix={""}
                                        thousandSeparator={true}
                                        renderText={(value, props) => value}
                                    />
                                </th>
                                <th className="text-end">
                                    <NumberFormat
                                        value={trimTo2Decimals(model.net_loss)}
                                        displayType={"text"}
                                        thousandSeparator={true}
                                        suffix={""}
                                        renderText={(value, props) => value}
                                    />
                                </th>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <h4>Zatca Info</h4>
                <Table striped bordered hover responsive="xl">
                    <tbody>
                        <tr>
                            <td><b>Zatca compliance passed</b><br /> {model.zatca?.compliance_passed ? "YES" : "NO"}</td>
                            <td><b>Zatca compliance passed At</b><br /> {model.zatca?.compliance_passed_at ? format(
                                new Date(model.zatca?.compliance_passed_at),
                                "MMM dd yyyy h:mm:ssa"
                            ) : "Not set"}</td>
                            <td><b>Compliance Invoice Hash</b><br /> {model.zatca?.compliance_invoice_hash} </td>

                        </tr>
                        <tr>
                            <td><b>Zatca reporting/clearance passed</b><br /> {model.zatca?.reporting_passed ? "YES" : "NO"}</td>
                            <td><b>Zatca reporting/clearance passed At</b><br /> {model.zatca?.reporting_passed_at ? format(
                                new Date(model.zatca?.compliance_passed_at),
                                "MMM dd yyyy h:mm:ssa"
                            ) : "Not set"} </td>
                            <td><b>Reported Invoice Hash</b><br />{model.zatca?.reporting_invoice_hash}</td>
                        </tr>
                        <tr>
                            <td><b>Signing time</b><br />{model.zatca?.signing_time ? format(
                                new Date(model.zatca?.signing_time),
                                "MMM dd yyyy h:mm:ssa"
                            ) : "Not set"}</td>
                            <td>
                                {model.zatca?.qr_code ? <QRCodeCanvas value={model.zatca?.qr_code} style={{ width: "128px", height: "128px" }} size={128} /> : ""}
                            </td>
                            <td><b>Previous Invoice Hash(PIH)</b><br /> {model.prev_hash}</td>
                        </tr>
                        <tr>
                            <td><b>Compliance check failed count</b><br />{model.zatca?.compliance_check_failed_count}</td>
                            <td><b>Compliance check last failed at</b><br />{model.zatca?.compliance_check_last_failed_at ? format(
                                new Date(model.zatca?.compliance_check_last_failed_at),
                                "MMM dd yyyy h:mm:ssa"
                            ) : "Not set"}</td>
                            <td>
                                <b>Compliance check errors:</b>
                                <ol>
                                    {model.zatca?.compliance_check_errors &&
                                        model.zatca?.compliance_check_errors.map((error) => (
                                            <li>{error}</li>
                                        ))}
                                </ol>
                            </td>
                            <td><b>Reporting failed count</b><br />{model.zatca?.reporting_failed_count}</td>
                            <td><b>Reporting last failed at</b><br />{model.zatca?.reporting_last_failed_at ? format(
                                new Date(model.zatca?.reporting_last_failed_at),
                                "MMM dd yyyy h:mm:ssa"
                            ) : "Not set"}</td>
                            <td>
                                <b>Reporting errors:</b>
                                <ol>
                                    {model.zatca?.reporting_errors &&
                                        model.zatca?.reporting_errors.map((error) => (
                                            <li>{error}</li>
                                        ))}
                                </ol>
                            </td>
                        </tr>


                    </tbody>
                </Table>

                <Table striped bordered hover responsive="xl">
                    <tbody>
                        <tr>
                            <th>UUID:</th><td> {model.uuid}</td>
                            <th>Invoice Count Value(ICU):</th><td> {model.invoice_count_value}</td>
                            <th>Store:</th><td> {model.store_name}</td>
                            <th>Customer:</th><td> {model.customer_name}</td>
                            <th>Delivered by:</th><td> {model.delivered_by_name}</td>
                        </tr>
                        <tr>
                            <th>Date:</th><td>
                                {model.date ? format(
                                    new Date(model.date),
                                    "MMM dd yyyy h:mm:ssa"
                                ) : "Not set"}
                            </td>
                            <th>VAT %:</th><td> {model.vat_percent}%</td>
                            <th>Discount :</th><td> {model.discount} </td>
                            <th>Discount %:</th><td> {model.discount_percent}</td>
                        </tr>
                        <tr>
                            <th>Status:</th><td> {model.status}</td>
                            <th>Created At:</th><td> {model.created_at}</td>
                            <th>Updated At:</th><td> {model.updated_at}</td>
                        </tr>
                        <tr>
                            <th>Payment Status:</th><td> {model.payment_status}</td>
                            <th>Payment Method:</th><td> {model.payment_method}</td>
                            <th>Partial Payment Amount:</th><td> {model.partial_payment_amount}</td>
                        </tr>
                        <tr>
                            <th>Created By:</th><td> {model.created_by_name}</td>
                            <th>Updated By:</th><td> {model.updated_by_name}</td>
                            <th>Profit:</th>  <td> {model.profit} </td>
                            <th>Loss:</th><td> {model.loss} </td>
                        </tr>
                        <tr>
                            {salesCashDiscountList.length > 0 ?
                                <th>Cash Discounts</th> : ""}
                            {salesCashDiscountList.length > 0 ?
                                <td>
                                    <div className="table-responsive" style={{ overflowX: "auto" }}>
                                        <table className="table table-striped table-sm table-bordered">
                                            <thead>
                                                <tr className="text-center">
                                                    <th>
                                                        Amount
                                                    </th>

                                                    <th>
                                                        Created By
                                                    </th>
                                                    <th>
                                                        Created At
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-center">
                                                {salesCashDiscountList &&
                                                    salesCashDiscountList.map((salescashdiscount) => (
                                                        <tr key={salescashdiscount.id}>
                                                            <td>{trimTo2Decimals(salescashdiscount.amount) + " "}</td>
                                                            <td>{salescashdiscount.created_by_name}</td>
                                                            <td>
                                                                {format(
                                                                    new Date(salescashdiscount.created_at),
                                                                    "MMM dd yyyy H:mma"
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </td> : ""}
                            {salesPaymentList.length > 0 ?
                                <th>Payments</th> : ""}
                            {salesPaymentList.length > 0 ?
                                <td>
                                    <div className="table-responsive" style={{ overflowX: "auto" }}>
                                        <table className="table table-striped table-sm table-bordered">
                                            <thead>
                                                <tr className="text-center">
                                                    <th>
                                                        Amount
                                                    </th>
                                                    <th>
                                                        Payment Method
                                                    </th>

                                                    <th>
                                                        Created By
                                                    </th>
                                                    <th>
                                                        Created At
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-center">
                                                {salesPaymentList &&
                                                    salesPaymentList.map((payment) => (
                                                        <tr key={payment.id}>
                                                            <td>{trimTo2Decimals(payment.amount)}</td>
                                                            <td>{payment.method}</td>
                                                            <td>{payment.created_by_name}</td>
                                                            <td>
                                                                {format(
                                                                    new Date(payment.created_at),
                                                                    "MMM dd yyyy H:mma"
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </td> : ""}
                        </tr>
                    </tbody>
                </Table>

                {/*
                    <form className="row g-3 needs-validation" >
                        
                  
                        <div className="col-md-6">
                            <label className="form-label"
                            >Delivered By*</label
                            >

                            <div className="input-group mb-3">
                                <input type="text" className="form-control" id="validationCustom06" placeholder="Select User" aria-label="Select User" aria-describedby="button-addon4" />
                                <UserCreate showCreateButton={true} />
                                <div className="valid-feedback">Looks good!</div>
                                <div className="invalid-feedback">
                                    Please provide a valid User.
                  </div>
                            </div>
                        </div>
                       

                    </form>
                    */}
            </Modal.Body>
            {/*
                <Modal.Footer>
                    <Button variant="secondary" onClick={this.handleClose}>
                        Close
                </Button>
                    <Button variant="primary" onClick={this.handleClose}>
                        Save Changes
                </Button>
                </Modal.Footer>
                */}
        </Modal >
    </>);

});

export default OrderView;