import React, { useState, useRef, forwardRef, useImperativeHandle } from "react";
import PurchasePreview from './preview.js';
import { Modal, Button, Table } from 'react-bootstrap';
import Cookies from "universal-cookie";
import NumberFormat from "react-number-format";
import PurchasePrint from './print.js';
import { format } from "date-fns";


const PurchaseView = forwardRef((props, ref) => {

    useImperativeHandle(ref, () => ({
        open(id) {
            if (id) {
                getPurchase(id);
                getCashDiscounts(id);
                getPayments(id);
                setShow(true);
            }

        },

    }));

    let [model, setModel] = useState({});
    const cookies = new Cookies();

    const [show, setShow] = useState(false);

    function handleClose() {
        setShow(false);
    };

    function ObjectToSearchQueryParams(object) {
        return Object.keys(object)
            .map(function (key) {
                return `search[${key}]=${object[key]}`;
            })
            .join("&");
    }


    const [searchParams, setSearchParams] = useState({});

    let [purchaseCashDiscountList, setPurchaseCashDiscountList] = useState([]);
    let [totalCashDiscounts, setTotalCashDiscounts] = useState(0.00);

    function getCashDiscounts(purchase_id) {
        const requestOptions = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: cookies.get("access_token"),
            },
        };
        let Select =
            "select=id,amount,store_name,purchase_code,purchase_id,created_by_name,created_at";
        if (cookies.get("store_id")) {
            searchParams.store_id = cookies.get("store_id");
        }
        searchParams["purchase_id"] = purchase_id;
        setSearchParams(searchParams);
        let queryParams = ObjectToSearchQueryParams(searchParams);
        if (queryParams !== "") {
            queryParams = "&" + queryParams;
        }

        fetch(
            "/v1/purchase-cash-discount?" +
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

                setPurchaseCashDiscountList(data.result);
                totalCashDiscounts = data.meta.total_cash_discount;
                setTotalCashDiscounts(totalCashDiscounts);


            })
            .catch((error) => {
                console.log(error);
            });
    }


    let [purchasePaymentList, setPurchasePaymentList] = useState([]);
    let [totalPayments, setTotalPayments] = useState(0.00);

    function getPayments(purchase_id) {
        const requestOptions = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: cookies.get("access_token"),
            },
        };
        let Select =
            "select=id,amount,method,store_name,purchase_code,purchase_id,created_by_name,created_at";
        if (cookies.get("store_id")) {
            searchParams.store_id = cookies.get("store_id");
        }
        searchParams["purchase_id"] = purchase_id;
        setSearchParams(searchParams);
        let queryParams = ObjectToSearchQueryParams(searchParams);
        if (queryParams !== "") {
            queryParams = "&" + queryParams;
        }

        fetch(
            "/v1/purchase-payment?" +
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

                setPurchasePaymentList(data.result);
                totalPayments = data.meta.total_payment;
                setTotalPayments(totalPayments);


            })
            .catch((error) => {
                console.log(error);
            });
    }

    function getPurchase(id) {
        console.log("inside get Purchase");
        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': cookies.get('access_token'),
            },
        };

        fetch('/v1/purchase/' + id, requestOptions)
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


    const PreviewRef = useRef();
    function openPreview() {
        PreviewRef.current.open(model);
    }

    const PrintRef = useRef();
    function openPrint() {
        PrintRef.current.open(model);
    }

    return (<>
        <PurchasePreview ref={PreviewRef} />
        <PurchasePrint ref={PrintRef} />
        <Modal show={show} size="xl" onHide={handleClose} animation={false} scrollable={true}>
            <Modal.Header>
                <Modal.Title>Details of Purchase #{model.code} </Modal.Title>


                <div className="col align-self-end text-end">
                    <Button variant="primary" onClick={openPrint}>
                        <i className="bi bi-printer"></i> Print
                    </Button>
                    &nbsp;&nbsp;
                    <Button variant="primary" onClick={openPreview}>
                        <i className="bi bi-display"></i> E-Purchase Invoice
                    </Button>
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                    {props.openCreateForm ? <Button variant="primary" onClick={() => {
                        handleClose();
                        props.openCreateForm();
                    }}>
                        <i className="bi bi-plus"></i> Create
                    </Button> : ""}
                    &nbsp;&nbsp;
                    {props.openUpdateForm ? <Button variant="primary" onClick={() => {
                        handleClose();
                        props.openUpdateForm(model.id);
                    }}>
                        <i className="bi bi-pencil"></i> Edit
                    </Button> : ""}

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
                                <th>Purchase Unit Price</th>
                                <th>Purchase Price</th>
                                <th>Qty Returned</th>
                                <th>Wholesale Unit Price</th>
                                <th>Retail Unit Price</th>

                                {cookies.get('admin') === "true" ? <th>Wholesale Profit</th> : ""}
                                {cookies.get('admin') === "true" ? <th>Retail Profit</th> : ""}
                                {cookies.get('admin') === "true" ? <th>Wholesale Loss</th> : ""}
                                {cookies.get('admin') === "true" ? <th>Retail Loss</th> : ""}
                            </tr>
                        </thead>
                        <tbody>
                            {model.products && model.products.map((product, index) => (
                                <tr key={index} className="text-end">
                                    <td>{index + 1}</td>
                                    <td>{product.part_number}</td>
                                    <td>{product.name}{product.name_in_arabic ? " / " + product.name_in_arabic : ""}</td>
                                    <td>{product.quantity}  {product.unit ? product.unit : ""} </td>
                                    <td>
                                        <NumberFormat
                                            value={product.purchase_unit_price}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={" "}
                                            renderText={(value, props) => value}
                                        />
                                    </td>
                                    <td>
                                        <NumberFormat
                                            value={(product.purchase_unit_price * product.quantity).toFixed(2)}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={" "}
                                            renderText={(value, props) => value}
                                        />
                                    </td>
                                    <td>
                                        {product.quantity_returned}  {product.unit ? product.unit : ""}
                                    </td>
                                    <td>
                                        <NumberFormat
                                            value={product.wholesale_unit_price}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={" "}
                                            renderText={(value, props) => value}
                                        />
                                    </td>

                                    <td>
                                        <NumberFormat
                                            value={product.retail_unit_price}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={" "}
                                            renderText={(value, props) => value}
                                        />
                                    </td>
                                    {cookies.get('admin') === "true" ?
                                        <td>
                                            <NumberFormat
                                                value={product.wholesale_profit?.toFixed(2)}
                                                displayType={"text"}
                                                thousandSeparator={true}
                                                suffix={" "}
                                                renderText={(value, props) => value}
                                            />
                                        </td>
                                        : ""}
                                    {cookies.get('admin') === "true" ?
                                        <td>
                                            <NumberFormat
                                                value={product.retail_profit?.toFixed(2)}
                                                displayType={"text"}
                                                thousandSeparator={true}
                                                suffix={" "}
                                                renderText={(value, props) => value}
                                            />
                                        </td>
                                        : ""}
                                    {cookies.get('admin') === "true" ?
                                        <td>
                                            <NumberFormat
                                                value={product.wholesale_loss?.toFixed(2)}
                                                displayType={"text"}
                                                thousandSeparator={true}
                                                suffix={" "}
                                                renderText={(value, props) => value}
                                            />
                                        </td>
                                        : ""}
                                    {cookies.get('admin') === "true" ?
                                        <td>
                                            <NumberFormat
                                                value={product.retail_loss?.toFixed(2)}
                                                displayType={"text"}
                                                thousandSeparator={true}
                                                suffix={" "}
                                                renderText={(value, props) => value}
                                            />
                                        </td>
                                        : ""}
                                </tr>

                            ))}
                            <tr>
                                <th colSpan="5" className="text-end">Total</th>
                                <td className="text-end">
                                    <NumberFormat
                                        value={model.total}
                                        displayType={"text"}
                                        thousandSeparator={true}
                                        suffix={" "}
                                        renderText={(value, props) => value}
                                    />
                                </td>
                                {cookies.get('admin') === "true" ?
                                    <th colSpan="3" className="text-end">Total Profit/Loss</th>
                                    : ""}
                                {cookies.get('admin') === "true" ?
                                    <td className="text-end">
                                        <NumberFormat
                                            value={model.wholesale_profit?.toFixed(2)}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={" "}
                                            renderText={(value, props) => value}
                                        />
                                    </td> : ""}
                                {cookies.get('admin') === "true" ?
                                    <td className="text-end">
                                        <NumberFormat
                                            value={model.retail_profit?.toFixed(2)}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={" "}
                                            renderText={(value, props) => value}
                                        />
                                    </td> : ""}
                                {cookies.get('admin') === "true" ?
                                    <td className="text-end">
                                        <NumberFormat
                                            value={model.wholesale_loss?.toFixed(2)}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={" "}
                                            renderText={(value, props) => value}
                                        />
                                    </td> : ""}
                                {cookies.get('admin') === "true" ?
                                    <td className="text-end">
                                        <NumberFormat
                                            value={model.retail_loss?.toFixed(2)}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={" "}
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
                                        suffix={" "}
                                        renderText={(value, props) => value}
                                    /> : "0.00 "}
                                </td>
                                <td colSpan="3"></td>
                            </tr>
                            <tr>
                                <th colSpan="5" className="text-end">
                                    Discount
                                </th>

                                <td className="text-end">
                                    <NumberFormat
                                        value={model.discount}
                                        displayType={"text"}
                                        thousandSeparator={true}
                                        suffix={" "}
                                        renderText={(value, props) => value}
                                    />
                                </td>
                                <th colSpan="3" className="text-end">

                                </th>
                                {cookies.get('admin') === "true" ?
                                    <td className="text-end">
                                        <NumberFormat
                                            value={model.discount - model.return_discount}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={" "}
                                            renderText={(value, props) => value}
                                        />
                                    </td> : ""}
                                {cookies.get('admin') === "true" ?
                                    <td className="text-end">
                                        <NumberFormat
                                            value={model.discount - model.return_discount}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={" "}
                                            renderText={(value, props) => value}
                                        />
                                    </td> : ""}
                                {cookies.get('admin') === "true" ?
                                    <td className="text-end">
                                        <NumberFormat
                                            value={0}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={" "}
                                            renderText={(value, props) => value}
                                        />
                                    </td> : ""}
                                {cookies.get('admin') === "true" ?
                                    <td className="text-end">
                                        <NumberFormat
                                            value={0}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={" "}
                                            renderText={(value, props) => value}
                                        />
                                    </td> : ""}
                            </tr>
                            <tr>
                                <th colSpan="4" className="text-end">
                                    VAT
                                </th>
                                <td className="text-end">{model.vat_percent + "%"}</td>
                                <td className="text-end">
                                    <NumberFormat
                                        value={model.vat_price}
                                        displayType={"text"}
                                        thousandSeparator={true}
                                        suffix={" "}
                                        renderText={(value, props) => value}
                                    />
                                </td>
                                <th colSpan="3" className="text-end">

                                </th>
                                {cookies.get('admin') === "true" ?
                                    <td className="text-end">
                                        <NumberFormat
                                            value={0}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={" "}
                                            renderText={(value, props) => value}
                                        />
                                    </td>
                                    : ""}
                                {cookies.get('admin') === "true" ?
                                    <td className="text-end">
                                        <NumberFormat
                                            value={0}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={" "}
                                            renderText={(value, props) => value}
                                        />
                                    </td> : ""}
                                {cookies.get('admin') === "true" ?
                                    <td className="text-end">
                                        <NumberFormat
                                            value={0}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={" "}
                                            renderText={(value, props) => value}
                                        />
                                    </td> : ""}
                                {cookies.get('admin') === "true" ?
                                    <td className="text-end">
                                        <NumberFormat
                                            value={0}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={" "}
                                            renderText={(value, props) => value}
                                        />
                                    </td> : ""}
                            </tr>

                            <tr>
                                <td colSpan="4"></td>
                                <th className="text-end">Net Total</th>
                                <th className="text-end">
                                    <NumberFormat
                                        value={model.net_total}
                                        displayType={"text"}
                                        thousandSeparator={true}
                                        suffix={" "}
                                        renderText={(value, props) => value}
                                    />
                                </th>
                                {cookies.get('admin') === "true" ?
                                    <th colSpan="3" className="text-end" >Cash discount</th>
                                    : ""}
                                {cookies.get('admin') === "true" ?
                                    <th className="text-end">
                                        <NumberFormat
                                            value={model.cash_discount}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={" "}
                                            renderText={(value, props) => value}
                                        />
                                    </th>
                                    : ""}
                                {cookies.get('admin') === "true" ?
                                    <th className="text-end">
                                        <NumberFormat
                                            value={model.cash_discount}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={" "}
                                            renderText={(value, props) => value}
                                        />

                                    </th> : ""}
                                {cookies.get('admin') === "true" ?
                                    <th className="text-end">
                                        <NumberFormat
                                            value={0.00}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={" "}
                                            renderText={(value, props) => value}
                                        />
                                    </th> : ""}
                                {cookies.get('admin') === "true" ?
                                    <th className="text-end">
                                        <NumberFormat
                                            value={0.00}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={" "}
                                            renderText={(value, props) => value}
                                        />
                                    </th>
                                    : ""}
                            </tr>
                            <tr>
                                <td colSpan="6"></td>
                                {cookies.get('admin') === "true" ?
                                    <th colSpan="3" className="text-end">Net Profit / Loss</th>
                                    : ""}
                                {cookies.get('admin') === "true" ?
                                    <th className="text-end">
                                        <NumberFormat
                                            value={model.net_wholesale_profit?.toFixed(2)}
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
                                            value={model.net_retail_profit?.toFixed(2)}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={""}
                                            renderText={(value, props) => value}
                                        />
                                    </th> : ""}
                                    {cookies.get('admin') === "true" ?
                                    <th className="text-end">
                                        <NumberFormat
                                            value={model.wholesale_loss}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={" "}
                                            renderText={(value, props) => value}
                                        />
                                    </th> : ""}
                                {cookies.get('admin') === "true" ?
                                    <th className="text-end">
                                        <NumberFormat
                                            value={model.retail_loss}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={" "}
                                            renderText={(value, props) => value}
                                        />
                                    </th>
                                    : ""}
                            </tr>
                        </tbody>
                    </table>
                </div>


                <Table striped bordered hover responsive="lg">
                    <tbody>
                        <tr>
                            <th>Store:</th><td> {model.store_name}</td>
                            <th>Vendor:</th><td> {model.vendor_name}</td>
                            <th>Vendor Invoice No.:</th><td> {model.vendor_invoice_no}</td>
                            <th>Order Placed by:</th><td> {model.order_placed_by_name}</td>
                        </tr>
                        <tr>
                            <th>Date:</th><td> {model.date ? format(
                                new Date(model.date),
                                "MMMM d, yyyy h:mm aa"
                            ) : ""}</td>
                            <th>VAT %:</th><td> {model.vat_percent}%</td>
                            <th>Discount :</th><td> {model.discount} </td>
                            <th>Discount %:</th><td> {model.discount_percent} </td>
                        </tr>
                        <tr>
                            <th>Payment Status:</th><td> {model.payment_status}</td>
                            <th>Payment Method:</th><td> {model.payment_method}</td>
                            <th>Partial Payment Amount:</th><td> {model.partial_payment_amount}</td>
                        </tr>
                        <tr>
                            <th>Status:</th><td> {model.status}</td>
                            <th>Signature Date:</th><td> {model.signature_date_str}</td>
                            <th>Created At:</th><td> {model.created_at}</td>
                            <th>Updated At:</th><td> {model.updated_at}</td>
                        </tr>
                        <tr>
                            <th>Created By:</th><td> {model.created_by_name}</td>
                            <th>Updated By:</th><td> {model.updated_by_name}</td>
                        </tr>
                        <tr>
                            {purchaseCashDiscountList.length > 0 ?
                                <th>Cash Discounts</th> : ""}
                            {purchaseCashDiscountList.length > 0 ?
                                <td>
                                    <div className="table-responsive" style={{ overflowX: "auto" }}>
                                        <table className="table table-striped table-sm table-bordered">
                                            <thead>
                                                <tr className="text-end">
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
                                            <tbody className="text-end">
                                                {purchaseCashDiscountList &&
                                                    purchaseCashDiscountList.map((discount) => (
                                                        <tr key={discount.id}>
                                                            <td>{discount.amount.toFixed(2) + " "}</td>
                                                            <td>{discount.created_by_name}</td>
                                                            <td>
                                                                {format(
                                                                    new Date(discount.created_at),
                                                                    "MMM dd yyyy H:mma"
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </td> : ""}
                            {purchasePaymentList.length > 0 ?
                                <th>Payments</th> : ""}
                            {purchasePaymentList.length > 0 ?
                                <td>
                                    <div className="table-responsive" style={{ overflowX: "auto" }}>
                                        <table className="table table-striped table-sm table-bordered">
                                            <thead>
                                                <tr className="text-end">
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
                                            <tbody className="text-end">
                                                {purchasePaymentList &&
                                                    purchasePaymentList.map((payment) => (
                                                        <tr key={payment.id}>
                                                            <td>{payment.amount.toFixed(2) + " "}</td>
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
        </Modal>
    </>);

});

export default PurchaseView;