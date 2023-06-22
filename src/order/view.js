import React, { useState, useRef, forwardRef, useImperativeHandle } from "react";
import { Modal, Button, Table } from 'react-bootstrap';
import Cookies from "universal-cookie";
import NumberFormat from "react-number-format";
import OrderPreview from './preview.js';
import OrderPrint from './print.js';
import { format } from "date-fns";

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


    let [totalPrice, setTotalPrice] = useState(0.0);
    let [netTotal, setNetTotal] = useState(0.00);
    let [totalQuantity, setTotalQuantity] = useState(0);
    let [vatPrice, setVatPrice] = useState(0.00);
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
           // searchParams.store_id = cookies.get("store_id");
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
            queryParams+"&limit=100",
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

        fetch('/v1/order/' + id, requestOptions)
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

                    <Button variant="primary" onClick={openPrint}>
                        <i className="bi bi-printer"></i> Print
                    </Button>

                    &nbsp;&nbsp;
                    <Button variant="primary" onClick={openPreview}>
                        <i className="bi bi-display"></i> E-Invoice
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
                <Table striped bordered hover responsive="xl">
                    <tbody>
                        <tr>
                            <th>Store:</th><td> {model.store_name}</td>
                            <th>Customer:</th><td> {model.customer_name}</td>
                            <th>Delivered by:</th><td> {model.delivered_by_name}</td>
                        </tr>
                        <tr>
                            <th>Date:</th><td> {model.date_str}</td>
                            <th>VAT %:</th><td> {model.vat_percent}%</td>
                            <th>Discount :</th><td> {model.discount} SAR</td>
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
                            {cookies.get('admin') === "true" ? <th>Profit:</th> : ""}{cookies.get('admin') === "true" ? <td> {model.profit} SAR</td> : ""}
                            {cookies.get('admin') === "true" ? <th>Loss:</th> : ""}{cookies.get('admin') === "true" ? <td> {model.loss} SAR</td> : ""}
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
                                                            <td>{salescashdiscount.amount.toFixed(2) + " SAR"}</td>
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
                                                            <td>{payment.amount.toFixed(2)}</td>
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

                <div className="table-responsive" style={{ overflowX: "auto" }}>
                    <table className="table table-striped table-sm table-bordered">
                        <thead>
                            <tr className="text-center">
                                <th>SI No.</th>
                                <th>Part No.</th>
                                <th>Name</th>
                                <th>Qty</th>
                                <th>Unit Price</th>
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
                                    <td>
                                        <NumberFormat
                                            value={product.unit_price}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={" SAR"}
                                            renderText={(value, props) => value}
                                        />
                                    </td>
                                    <td className="text-end">
                                        <NumberFormat
                                            value={(product.unit_price * product.quantity).toFixed(2)}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={" SAR"}
                                            renderText={(value, props) => value}
                                        />
                                    </td>
                                    <td>{product.quantity_returned}  {product.unit ? product.unit : ""} </td>
                                    {cookies.get('admin') === "true" ? <td>
                                        <NumberFormat
                                            value={product.purchase_unit_price}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={" SAR"}
                                            renderText={(value, props) => value}
                                        />
                                    </td> : ""}
                                    {cookies.get('admin') === "true" ? <td>
                                        <NumberFormat
                                            value={(product.purchase_unit_price * product.quantity).toFixed(2)}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={" SAR"}
                                            renderText={(value, props) => value}
                                        />
                                    </td> : ""}
                                    {cookies.get('admin') === "true" ? <td>
                                        <NumberFormat
                                            value={product.profit}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={" SAR"}
                                            renderText={(value, props) => value}
                                        />
                                    </td> : ""}
                                    {cookies.get('admin') === "true" ? <td>
                                        <NumberFormat
                                            value={product.loss}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={" SAR"}
                                            renderText={(value, props) => value}
                                        />
                                    </td> : ""}
                                </tr>
                            ))}
                            <tr>
                                <td colSpan="4"></td>

                                <th className="text-end">Total</th>
                                <td className="text-end">
                                    {model.total ? <NumberFormat
                                        value={model.total.toFixed(2)}
                                        displayType={"text"}
                                        thousandSeparator={true}
                                        suffix={" SAR"}
                                        renderText={(value, props) => value}
                                    /> : "0.00 SAR"}
                                </td>
                                <td colSpan="3" ></td>
                                {cookies.get('admin') === "true" ?
                                    <td className="text-center">
                                        <NumberFormat
                                            value={model.profit?.toFixed(2)}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={" SAR"}
                                            renderText={(value, props) => value}
                                        />
                                    </td> : ""}
                                {cookies.get('admin') === "true" ? <td className="text-center">
                                    <NumberFormat
                                        value={model.loss?.toFixed(2)}
                                        displayType={"text"}
                                        thousandSeparator={true}
                                        suffix={" SAR"}
                                        renderText={(value, props) => value}
                                    />
                                </td> : ""}
                            </tr>
                            <tr>
                                <th colSpan="5" className="text-end">
                                    Shipping / Handling Fees
                                </th>
                                <td className="text-end">
                                    {model.shipping_handling_fees ? <NumberFormat
                                        value={model.shipping_handling_fees.toFixed(2)}
                                        displayType={"text"}
                                        thousandSeparator={true}
                                        suffix={" SAR"}
                                        renderText={(value, props) => value}
                                    /> : "0.00 SAR"}
                                </td>
                                <td colSpan="3"></td>
                            </tr>
                            <tr>
                                <th colSpan="5" className="text-end">
                                    Discount
                                </th>
                                <td className="text-end">
                                    {model.discount ? <NumberFormat
                                        value={model.discount.toFixed(2)}
                                        displayType={"text"}
                                        thousandSeparator={true}
                                        suffix={" SAR"}
                                        renderText={(value, props) => value}
                                    /> : "0.00 SAR"}
                                </td>
                                <td colSpan="3"></td>
                                {cookies.get('admin') === "true" ?
                                    <td className="text-center">
                                        <NumberFormat
                                            value={(model.discount - model.return_discount).toFixed(2)}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={" SAR"}
                                            renderText={(value, props) => value}
                                        />
                                    </td> : ""}
                                {cookies.get('admin') === "true" ?
                                    <td className="text-center">
                                        <NumberFormat
                                            value={0}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={" SAR"}
                                            renderText={(value, props) => value}
                                        />
                                    </td> : ""}
                            </tr>
                            <tr>
                                <th colSpan="4" className="text-end">

                                </th>
                                <th className="text-end">VAT {model.vat_percent + "%"}</th>
                                <td className="text-end">
                                    <NumberFormat
                                        value={model.vat_price}
                                        displayType={"text"}
                                        thousandSeparator={true}
                                        suffix={" SAR"}
                                        renderText={(value, props) => value}
                                    />
                                </td>
                                <td colSpan="3"></td>
                                {cookies.get('admin') === "true" ?
                                    <td className="text-center">0.00 SAR</td>
                                    : ""}
                                {cookies.get('admin') === "true" ?
                                    <td className="text-center">0.00 SAR</td>
                                    : ""}
                            </tr>
                            <tr>
                                <td colSpan="4"></td>
                                <th className="text-end">Net Total</th>
                                <th className="text-end">
                                    <NumberFormat
                                        value={model.net_total}
                                        displayType={"text"}
                                        thousandSeparator={true}
                                        suffix={" SAR"}
                                        renderText={(value, props) => value}
                                    />
                                </th>
                                {cookies.get('admin') === "true" ?
                                    <th colSpan="3" className="text-end">Net Profit / Loss</th>
                                    : ""}
                                {cookies.get('admin') === "true" ?
                                    <th className="text-center">
                                        <NumberFormat
                                            value={model.net_profit}
                                            displayType={"text"}
                                            suffix={" SAR"}
                                            thousandSeparator={true}
                                            renderText={(value, props) => value}
                                        />
                                    </th>
                                    : ""}
                                {cookies.get('admin') === "true" ?
                                    <th className="text-center">
                                        <NumberFormat
                                            value={model.loss}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={" SAR"}
                                            renderText={(value, props) => value}
                                        />
                                    </th> : ""}
                            </tr>
                        </tbody>
                    </table>
                </div>

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
        </Modal>
    </>);

});

export default OrderView;