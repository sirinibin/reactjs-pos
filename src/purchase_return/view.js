import React, { useState, useRef, forwardRef, useImperativeHandle } from "react";
import PurchaseReturnPreview from './preview.js';
import { Modal, Button, Table } from 'react-bootstrap';
import Cookies from "universal-cookie";
import NumberFormat from "react-number-format";
import PurchaseReturnPrint from './print.js';
import { format } from "date-fns";


const PurchaseReturnView = forwardRef((props, ref) => {

    useImperativeHandle(ref, () => ({
        open(id) {
            if (id) {
                getPurchaseReturn(id);
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

    let [totalPrice, setTotalPrice] = useState(0.0);
    let [netTotal, setNetTotal] = useState(0.00);
    let [totalQuantity, setTotalQuantity] = useState(0);
    let [vatPrice, setVatPrice] = useState(0.00);

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
                Authorization: cookies.get("access_token"),
            },
        };
        let Select =
            "select=id,amount,method,store_name,purchase_return_code,purchase_return_id,created_by_name,created_at";
        if (cookies.get("store_id")) {
            searchParams.store_id = cookies.get("store_id");
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
                'Authorization': cookies.get('access_token'),
            },
        };

        fetch('/v1/purchase-return/' + id, requestOptions)
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
        <PurchaseReturnPreview ref={PreviewRef} />
        <PurchaseReturnPrint ref={PrintRef} />
        <Modal show={show} size="xl" onHide={handleClose} animation={false} scrollable={true}>
            <Modal.Header>
                <Modal.Title>Details of Purchase Return #{model.code} </Modal.Title>

                <div className="col align-self-end text-end">
                    <Button variant="primary" className="btn btn-primary mb-3" onClick={openPrint}>
                        <i className="bi bi-printer"></i> Print
                    </Button>


                </div>

                <div className="col align-self-end text-end">
                    <Button variant="primary" className="btn btn-primary mb-3" onClick={openPreview}>
                        <i className="bi bi-display"></i> E-Purchase Return Invoice
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
                            <tr className="text-end">
                                <th>SI No.</th>
                                <th>Part No.</th>
                                <th>Name</th>
                                <th>Qty</th>
                                <th>Purchase Return Unit Price</th>
                                <th>Purchase Return Price</th>
                            </tr>
                        </thead>
                        <tbody>
                            {model.products && model.products.filter(product => product.selected).map((product, index) => (
                                <tr key={index} className="text-end">
                                    <td>{index + 1}</td>
                                    <td>{product.part_number}</td>
                                    <td>{product.name}{product.name_in_arabic ? " / " + product.name_in_arabic : ""}</td>
                                    <td>{product.quantity}  {product.unit ? product.unit : ""} </td>
                                    <td>
                                        <NumberFormat
                                            value={product.purchasereturn_unit_price}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={" "}
                                            renderText={(value, props) => value}
                                        />
                                    </td>
                                    <td>
                                        <NumberFormat
                                            value={(product.purchasereturn_unit_price * product.quantity).toFixed(2)}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={" "}
                                            renderText={(value, props) => value}
                                        />
                                    </td>
                                </tr>
                            ))}
                            <tr>
                                <td colSpan="4"></td>
                                <th className="text-end">Total</th>
                                <td className="text-end">
                                    <NumberFormat
                                        value={model.total}
                                        displayType={"text"}
                                        thousandSeparator={true}
                                        suffix={" "}
                                        renderText={(value, props) => value}
                                    />
                                </td>
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
                            </tr>
                            <tr>
                                <th colSpan="4" className="text-end">
                                    
                                </th>
                                <td className="text-end">VAT: {model.vat_percent + "%"}</td>
                                <td className="text-end">
                                    <NumberFormat
                                        value={model.vat_price}
                                        displayType={"text"}
                                        thousandSeparator={true}
                                        suffix={" "}
                                        renderText={(value, props) => value}
                                    />
                                </td>
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
                            </tr>
                        </tbody>
                    </table>
                </div>

                <Table striped bordered hover responsive="xl">
                    <tbody>
                        <tr>
                            <th>Purchase Code:</th><td> {model.purchase_code}</td>
                            <th>Purchase ID:</th><td> {model.purchase_id}</td>
                            <th>Vendor:</th><td> {model.vendor_name}</td>
                            <th>Vendor Invoice No.:</th><td> {model.vendor_invoice_no}</td>
                            <th>Purchase Returned by:</th><td> {model.purchase_returned_by_name}</td>
                        </tr>
                        <tr>
                            <th>Store:</th><td> {model.store_name}</td>
                            <th>Vendor:</th><td> {model.vendor_name}</td>
                            <th>Vendor Invoice No.:</th><td> {model.vendor_invoice_no}</td>
                            <th>Purchase Returned by:</th><td> {model.purchase_returned_by_name}</td>
                        </tr>
                        <tr>
                            <th>Date:</th><td> {model.date}</td>
                            <th>VAT %:</th><td> {model.vat_percent}%</td>
                            <th>Cash Discount :</th><td> {model.cash_discount} </td>
                            <th>Discount :</th><td> {model.discount} </td>
                            <th>Discount %:</th><td> {model.discount_percent} </td>
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
                            <th>Payment Status:</th><td> {model.payment_status}</td>
                            <th>Payment Method:</th><td> {model.payment_method}</td>
                            <th>Partial Payment Amount:</th><td> {model.partial_payment_amount}</td>
                        </tr>
                        <tr>
                            {purchaseReturnPaymentList.length > 0 ?
                                <th>Payments</th> : ""}
                            {purchaseReturnPaymentList.length > 0 ?
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
                                            <tbody className="text-end">
                                                {purchaseReturnPaymentList &&
                                                    purchaseReturnPaymentList.map((payment) => (
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

export default PurchaseReturnView;