import React, { useState, useRef, forwardRef, useImperativeHandle } from "react";
import { Modal, Button, Table } from 'react-bootstrap';
import Cookies from "universal-cookie";
import NumberFormat from "react-number-format";
import OrderPreview from './preview.js';
import OrderPrint from './print.js';
import { format } from "date-fns";
import { QRCodeCanvas } from "qrcode.react";
import { trimTo2Decimals } from "../utils/numberUtils";

const OrderView = forwardRef((props, ref) => {


    useImperativeHandle(ref, () => ({
        open(id) {
            if (id) {
                getOrder(id);
                getCashDiscounts(id);
                getPayments(id);
                SetShow(true);
            }

        },

    }));


    let [model, setModel] = useState({});
    const cookies = new Cookies();



    const [searchParams, setSearchParams] = useState({});

    let [salesCashDiscountList, setSalesCashDiscountList] = useState([]);
    let [totalCashDiscounts, setTotalCashDiscounts] = useState(0.00);

    function getCashDiscounts(order_id) {
        const requestOptions = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: cookies.get("access_token"),
            },
        };
        let Select =
            "select=id,amount,store_name,order_code,order_id,created_by_name,created_at";
        if (cookies.get("store_id")) {
            searchParams.store_id = cookies.get("store_id");
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
                Authorization: cookies.get("access_token"),
            },
        };
        let Select =
            "select=id,amount,method,store_name,order_code,order_id,created_by_name,created_at";
        if (cookies.get("store_id")) {
            searchParams.store_id = cookies.get("store_id");
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
                'Authorization': cookies.get('access_token'),
            },
        };

        let searchParams = {};
        if (cookies.get("store_id")) {
            searchParams.store_id = cookies.get("store_id");
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
        SetShow(false);
    };

    const PreviewRef = useRef();
    function openPreview() {
        PreviewRef.current.open(model);
    }

    const PrintRef = useRef();
    function openPrint() {
        PrintRef.current.open(model);
    }

    function ObjectToSearchQueryParams(object) {
        return Object.keys(object)
            .map(function (key) {
                return `search[${key}]=${object[key]}`;
            })
            .join("&");
    }


    /*
    function trimTo2Decimals(value) {
        return Math.trunc(value * 100) / 100;
    }
        */



    return (<>
        <OrderPreview ref={PreviewRef} />
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

                    <Button variant="secondary" onClick={openPrint}>
                        <i className="bi bi-printer"></i> Print Only Data
                    </Button>

                    &nbsp;&nbsp;
                    <Button variant="primary" onClick={openPreview}>
                        <i className="bi bi-printer"></i> Print Full Invoice
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
                                {cookies.get('admin') === "true" ? <th>Purchase Unit Price</th> : ""}
                                {cookies.get('admin') === "true" ? <th>Purchase Price</th> : ""}
                                {cookies.get('admin') === "true" ? <th>Profit</th> : ""}
                                {cookies.get('admin') === "true" ? <th>Loss</th> : ""}
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
                                    {cookies.get('admin') === "true" ? <td className="text-end">
                                        <NumberFormat
                                            value={trimTo2Decimals(product.purchase_unit_price)}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={" "}
                                            renderText={(value, props) => value}
                                        />
                                    </td> : ""}
                                    {cookies.get('admin') === "true" ? <td className="text-end">
                                        <NumberFormat
                                            value={trimTo2Decimals(product.purchase_unit_price * product.quantity)}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={" "}
                                            renderText={(value, props) => value}
                                        />
                                    </td> : ""}
                                    {cookies.get('admin') === "true" ? <td className="text-end">
                                        <NumberFormat
                                            value={trimTo2Decimals(product.profit)}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={" "}
                                            renderText={(value, props) => value}
                                        />
                                    </td> : ""}
                                    {cookies.get('admin') === "true" ? <td className="text-end">
                                        <NumberFormat
                                            value={trimTo2Decimals(product.loss)}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={" "}
                                            renderText={(value, props) => value}
                                        />
                                    </td> : ""}
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
                                {cookies.get('admin') === "true" ?
                                    <td className="text-end">
                                        <NumberFormat
                                            value={trimTo2Decimals(model.profit)}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={" "}
                                            renderText={(value, props) => value}
                                        />
                                    </td> : ""}
                                {cookies.get('admin') === "true" ? <td className="text-end">
                                    <NumberFormat
                                        value={trimTo2Decimals(model.loss)}
                                        displayType={"text"}
                                        thousandSeparator={true}
                                        suffix={" "}
                                        renderText={(value, props) => value}
                                    />
                                </td> : ""}
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
                                {cookies.get('admin') === "true" ?
                                    <td className="text-end">
                                        <NumberFormat
                                            value={trimTo2Decimals(model.discount - model.return_discount)}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={" "}
                                            renderText={(value, props) => value}
                                        />
                                    </td> : ""}
                                {cookies.get('admin') === "true" ?
                                    <td className="text-end">
                                        0.00
                                    </td> : ""}
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
                                {cookies.get('admin') === "true" ?
                                    <td className="text-end">0.00 </td>
                                    : ""}
                                {cookies.get('admin') === "true" ?
                                    <td className="text-end">0.00</td>
                                    : ""}
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
                                {cookies.get('admin') === "true" ?
                                    <th colSpan="3" className="text-end">Net Profit / Loss</th>
                                    : ""}
                                {cookies.get('admin') === "true" ?
                                    <th className="text-end">
                                        <NumberFormat
                                            value={trimTo2Decimals(model.net_profit)}
                                            displayType={"text"}
                                            suffix={""}
                                            thousandSeparator={true}
                                            renderText={(value, props) => value}
                                        />
                                    </th>
                                    : ""}
                                {cookies.get('admin') === "true" ?
                                    <th className="text-end">
                                        <NumberFormat
                                            value={trimTo2Decimals(model.net_loss)}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={""}
                                            renderText={(value, props) => value}
                                        />
                                    </th> : ""}
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
                            {cookies.get('admin') === "true" ? <th>Profit:</th> : ""}{cookies.get('admin') === "true" ? <td> {model.profit} </td> : ""}
                            {cookies.get('admin') === "true" ? <th>Loss:</th> : ""}{cookies.get('admin') === "true" ? <td> {model.loss} </td> : ""}
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