import React, { useState, useRef, forwardRef, useImperativeHandle } from "react";
import { Modal, Button, Table } from 'react-bootstrap';
import Cookies from "universal-cookie";
import NumberFormat from "react-number-format";
import SalesReturnPreview from './preview.js';
import SalesReturnPrint from './print.js';
import { format } from "date-fns";
import { QRCodeCanvas } from "qrcode.react";

const SalesReturnView = forwardRef((props, ref) => {


    useImperativeHandle(ref, () => ({
        open(id) {
            if (id) {
                getSalesReturn(id);
                getPayments(id);
                SetShow(true);
            }

        },

    }));


    let [model, setModel] = useState({});
    const cookies = new Cookies();




    let [salesReturnPaymentList, setSalesReturnPaymentList] = useState([]);
    let [totalPayments, setTotalPayments] = useState(0.00);

    const [searchParams, setSearchParams] = useState({});

    function ObjectToSearchQueryParams(object) {
        return Object.keys(object)
            .map(function (key) {
                return `search[${key}]=${object[key]}`;
            })
            .join("&");
    }


    function getPayments(sales_return_id) {
        const requestOptions = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: cookies.get("access_token"),
            },
        };
        let Select =
            "select=id,amount,method,store_name,sales_return_code,sales_return_id,created_by_name,created_at";
        if (cookies.get("store_id")) {
            searchParams.store_id = cookies.get("store_id");
        }
        searchParams["sales_return_id"] = sales_return_id;
        setSearchParams(searchParams);
        let queryParams = ObjectToSearchQueryParams(searchParams);
        if (queryParams !== "") {
            queryParams = "&" + queryParams;
        }

        fetch(
            "/v1/sales-return-payment?" +
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

                setSalesReturnPaymentList(data.result);
                totalPayments = data.meta.total_payment;
                setTotalPayments(totalPayments);


            })
            .catch((error) => {
                console.log(error);
            });
    }



    function getSalesReturn(id) {
        console.log("inside get SalesReturn");
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

        fetch('/v1/sales-return/' + id + "?" + queryParams, requestOptions)
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


    return (<>
        <SalesReturnPreview ref={PreviewRef} />
        <SalesReturnPrint ref={PrintRef} />
        <Modal show={show} size="xl" onHide={handleClose} animation={false} scrollable={true}>
            <Modal.Header>
                <Modal.Title>Details of SalesReturn #{model.code}</Modal.Title>


                <div className="col align-self-end text-end">
                    <Button variant="primary" className="btn btn-primary mb-3" onClick={openPrint}>
                        <i className="bi bi-printer"></i> Print
                    </Button>


                </div>

                <div className="col align-self-end text-end">
                    <Button variant="primary" className="btn btn-primary mb-3" onClick={openPreview}>
                        <i className="bi bi-display"></i> E-Return Invoice
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
                                {cookies.get('admin') === "true" ? <th>Purchase Unit Price</th> : ""}
                                {cookies.get('admin') === "true" ? <th>Purchase Price</th> : ""}
                                {cookies.get('admin') === "true" ? <th>Profit</th> : ""}
                                {cookies.get('admin') === "true" ? <th>Loss</th> : ""}
                            </tr>
                        </thead>
                        <tbody>
                            {model.products && model.products.filter(product => product.selected).map((product, index) => (
                                <tr key={index} className="text-center">
                                    <td>{index + 1}</td>
                                    <td>{product.part_number}</td>
                                    <td>{product.name}{product.name_in_arabic ? " / " + product.name_in_arabic : ""}</td>
                                    <td>{product.quantity}  {product.unit ? product.unit : ""} </td>
                                    <td className="text-end">
                                        <NumberFormat
                                            value={product.unit_price?.toFixed(2)}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={" "}
                                            renderText={(value, props) => value}
                                        />
                                    </td>
                                    <td className="text-end">
                                        <NumberFormat
                                            value={product.unit_discount ? (product.unit_discount * product.quantity)?.toFixed(2) : 0.00}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={" "}
                                            renderText={(value, props) => value}
                                        />
                                    </td>
                                    <td className="text-end">
                                        <NumberFormat
                                            value={product.unit_discount_percent?.toFixed(2)}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={"%"}
                                            renderText={(value, props) => value}
                                        />
                                    </td>
                                    <td className="text-end">
                                        <NumberFormat
                                            value={((product.unit_price - product.unit_discount) * product.quantity).toFixed(2)}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={" "}
                                            renderText={(value, props) => value}
                                        />
                                    </td>
                                    {cookies.get('admin') === "true" ? <td className="text-end">
                                        <NumberFormat
                                            value={product.purchase_unit_price?.toFixed(2)}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={" "}
                                            renderText={(value, props) => value}
                                        />
                                    </td> : ""}
                                    {cookies.get('admin') === "true" ? <td className="text-end">
                                        <NumberFormat
                                            value={(product.purchase_unit_price * product.quantity).toFixed(2)}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={" "}
                                            renderText={(value, props) => value}
                                        />
                                    </td> : ""}
                                    {cookies.get('admin') === "true" ? <td className="text-end">
                                        <NumberFormat
                                            value={product.profit?.toFixed(2)}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={" "}
                                            renderText={(value, props) => value}
                                        />
                                    </td> : ""}
                                    {cookies.get('admin') === "true" ? <td className="text-end">
                                        <NumberFormat
                                            value={product.loss.toFixed(2)}
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
                                    <NumberFormat
                                        value={model.total?.toFixed(2)}
                                        displayType={"text"}
                                        thousandSeparator={true}
                                        suffix={" "}
                                        renderText={(value, props) => value}
                                    />
                                </td>
                                <td colSpan="2" ></td>
                                {cookies.get('admin') === "true" ?
                                    <td className="text-end">
                                        <NumberFormat
                                            value={model.profit?.toFixed(2)}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={" "}
                                            renderText={(value, props) => value}
                                        />
                                    </td> : ""}
                                {cookies.get('admin') === "true" ? <td className="text-end">
                                    <NumberFormat
                                        value={model.loss?.toFixed(2)}
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
                                        value={model.shipping_handling_fees.toFixed(2)}
                                        displayType={"text"}
                                        thousandSeparator={true}
                                        suffix={" "}
                                        renderText={(value, props) => value}
                                    /> : "0.00 "}
                                </td>
                                <td colSpan="2"></td>
                                <td colSpan="1" className="text-end">0.00</td>
                                <td colSpan="1" className="text-end">0.00</td>
                            </tr>

                            <tr>
                                <th colSpan="7" className="text-end">
                                    Discount {model.discount_percent?.toFixed(2) + "%"}
                                </th>
                                <td className="text-end">
                                    <NumberFormat
                                        value={model.discount?.toFixed(2)}
                                        displayType={"text"}
                                        thousandSeparator={true}
                                        suffix={" "}
                                        renderText={(value, props) => value}
                                    />
                                </td>
                                <td colSpan="2"></td>
                                {cookies.get('admin') === "true" ?
                                    <td className="text-end">
                                        <NumberFormat
                                            value={model.discount?.toFixed(2)}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={" "}
                                            renderText={(value, props) => value}
                                        />
                                    </td> : ""}
                                {cookies.get('admin') === "true" ?
                                    <td className="text-end">
                                        0.00
                                    </td> : "0.00"}

                            </tr>
                            <tr>
                                <th colSpan="7" className="text-end">VAT {model.vat_percent?.toFixed(2) + "%"}</th>
                                <td className="text-end">
                                    <NumberFormat
                                        value={model.vat_price?.toFixed(2)}
                                        displayType={"text"}
                                        thousandSeparator={true}
                                        suffix={" "}
                                        renderText={(value, props) => value}
                                    />
                                </td>
                                <td colSpan="2"></td>
                                {cookies.get('admin') === "true" ?
                                    <td className="text-end">0.00 </td>
                                    : ""}
                                {cookies.get('admin') === "true" ?
                                    <td className="text-end">0.00 </td>
                                    : ""}
                            </tr>
                            <tr>
                                <th colSpan="7" className="text-end">Net Total</th>
                                <th className="text-end">
                                    <NumberFormat
                                        value={model.net_total?.toFixed(2)}
                                        displayType={"text"}
                                        thousandSeparator={true}
                                        suffix={""}
                                        renderText={(value, props) => value}
                                    />
                                </th>
                                <th colSpan={2} className="text-end">Cash discount</th>
                                <td className="text-end">
                                    <NumberFormat
                                        value={model.cash_discount?.toFixed(2)}
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
                                    <th colSpan="2" className="text-end">Net Profit / Loss</th>
                                    : ""}
                                {cookies.get('admin') === "true" ?
                                    <th className="text-end">
                                        <NumberFormat
                                            value={model.net_profit?.toFixed(2)}
                                            displayType={"text"}
                                            suffix={" "}
                                            thousandSeparator={true}
                                            renderText={(value, props) => value}
                                        />
                                    </th>
                                    : ""}
                                {cookies.get('admin') === "true" ?
                                    <th className="text-end">
                                        <NumberFormat
                                            value={model.net_loss?.toFixed(2)}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={" "}
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

                <Table striped bordered hover responsive="lg">
                    <tbody>
                        <tr>
                            <th>UUID:</th><td> {model.uuid}</td>
                            <th>Invoice Count Value(ICU):</th><td> {model.invoice_count_value}</td>
                            <th>Order ID: </th><td> {model.order_code}</td>
                            <th>Store: </th><td> {model.store_name}</td>
                            <th>Customer: </th><td> {model.customer_name}</td>
                            <th>Received by: </th><td> {model.received_by_name}</td>
                        </tr>
                        <tr>
                            <th>Date: </th><td>
                                {model.date ? format(
                                    new Date(model.date),
                                    "MMM dd yyyy h:mma"
                                ) : "Not set"}
                            </td>
                            <th>VAT %: </th><td> {model.vat_percent}%</td>
                            <th>Discount: </th><td> {model.discount} </td>
                            <th>Discount %: </th><td> {model.discount_percent}</td>
                        </tr>
                        <tr>
                            <th>Status: </th><td> {model.status}</td>
                            <th>Created At: </th><td> {model.created_at}</td>
                            <th>Updated At: </th><td> {model.updated_at}</td>
                        </tr>
                        <tr>
                            <th>Created By: </th><td> {model.created_by_name}</td>
                            <th>Updated By: </th><td> {model.updated_by_name}</td>
                        </tr>
                        <tr>
                            {salesReturnPaymentList.length > 0 ?
                                <th>Payments</th> : ""}
                            {salesReturnPaymentList.length > 0 ?
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
                                                {salesReturnPaymentList &&
                                                    salesReturnPaymentList.map((payment) => (
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

export default SalesReturnView;