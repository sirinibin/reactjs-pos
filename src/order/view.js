import React, { useState, useRef, forwardRef, useImperativeHandle } from "react";
import { Modal, Button, Table } from 'react-bootstrap';
import Cookies from "universal-cookie";
import NumberFormat from "react-number-format";
import OrderPreview from './preview.js';

const OrderView = forwardRef((props, ref) => {


    useImperativeHandle(ref, () => ({
        open(id) {
            if (id) {
                getOrder(id);
                SetShow(true);
            }

        },

    }));


    let [model, setModel] = useState({});
    const cookies = new Cookies();



    const [isProcessing, setProcessing] = useState(false);
    let [totalPrice, setTotalPrice] = useState(0.0);
    let [netTotal, setNetTotal] = useState(0.00);
    let [totalQuantity, setTotalQuantity] = useState(0);
    let [vatPrice, setVatPrice] = useState(0.00);

    function findTotalPrice() {
        totalPrice = 0.00;
        console.log("model.products:", model.products);
        for (var i = 0; i < model.products.length; i++) {
            totalPrice +=
                parseFloat(model.products[i].unit_price) *
                parseFloat(model.products[i].quantity);
        }
        totalPrice = totalPrice.toFixed(2);
        console.log("totalPrice:", totalPrice);
        setTotalPrice(totalPrice);
    }

    function findTotalQuantity() {
        totalQuantity = 0;
        for (var i = 0; i < model.products.length; i++) {
            totalQuantity += parseFloat(model.products[i].quantity);
        }
        console.log("totalQuantity:", totalQuantity);
        setTotalQuantity(totalQuantity);
    }


    function findVatPrice() {
        vatPrice = ((parseFloat(model.vat_percent) / 100) * parseFloat(totalPrice)).toFixed(2);;
        console.log("vatPrice:", vatPrice);
        setVatPrice(vatPrice);
    }

    function findNetTotal() {
        netTotal = (parseFloat(totalPrice) + parseFloat(vatPrice) - parseFloat(model.discount)).toFixed(2);
        setNetTotal(netTotal);
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

        setProcessing(true);
        fetch('/v1/order/' + id, requestOptions)
            .then(async response => {
                setProcessing(false);
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

                findTotalPrice();
                findTotalQuantity();
                findVatPrice();
                findNetTotal();
            })
            .catch(error => {
                setProcessing(false);
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


    return (<>
        <OrderPreview ref={PreviewRef} />
        <Modal show={show} size="xl" onHide={handleClose} animation={false}>
            <Modal.Header>
                <Modal.Title>Details of Sales Order #{model.code}</Modal.Title>

                <div className="col align-self-end text-end">
                    <Button variant="primary" className="btn btn-primary mb-3" onClick={openPreview}>
                        <i className="bi bi-display"></i> Preview
                    </Button>
                    {/*
                        <button
                            className="btn btn-primary mb-3"
                            data-bs-toggle="modal"
                            data-bs-target="#previewOrderModal"
                        >
                            <i className="bi bi-display"></i> Preview
                        </button> */}
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
                    <tr>
                        <th>Store:</th><td> {model.store_name}</td>
                        <th>Customer:</th><td> {model.customer_name}</td>
                        <th>Delivered by:</th><td> {model.delivered_by_name}</td>
                    </tr>
                    <tr>
                        <th>Date:</th><td> {model.date_str}</td>
                        <th>VAT %:</th><td> {model.vat_percent}%</td>
                        <th>Discount :</th><td> {model.discount} SAR</td>
                        <th>Discount %:</th><td> {model.discount_percent} SAR</td>
                    </tr>
                    <tr>
                        <th>Status:</th><td> {model.status}</td>
                        <th>Created At:</th><td> {model.created_at}</td>
                        <th>Updated At:</th><td> {model.updated_at}</td>
                    </tr>
                    <tr>
                        <th>Created By:</th><td> {model.created_by_name}</td>
                        <th>Updated By:</th><td> {model.updated_by_name}</td>
                        <th>Profit :</th><td> {model.profit} SAR</td>
                        <th>Loss:</th><td> {model.loss} SAR</td>
                    </tr>

                </Table>

                <div className="table-responsive" style={{ overflowX: "auto" }}>
                    <table className="table table-striped table-sm table-bordered">
                        <thead>
                            <tr className="text-center">
                                <th>SI No.</th>
                                <th>CODE</th>
                                <th>Name</th>
                                <th>Qty</th>
                                <th>Unit Price</th>
                                <th>Price</th>
                                <th>Qty Returned</th>
                                <th>Purchase Unit Price</th>
                                <th>Purchase Price</th>
                                <th>Profit</th>
                            </tr>
                        </thead>
                        <tbody>
                            {model.products && model.products.map((product, index) => (
                                <tr className="text-center">
                                    <td>{index + 1}</td>
                                    <td>{product.item_code}</td>
                                    <td>{product.name}</td>
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
                                    <td>
                                        <NumberFormat
                                            value={(product.unit_price * product.quantity).toFixed(2)}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={" SAR"}
                                            renderText={(value, props) => value}
                                        />
                                    </td>
                                    <td>{product.quantity_returned}  {product.unit ? product.unit : ""} </td>
                                    <td>
                                        <NumberFormat
                                            value={product.purchase_unit_price}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={" SAR"}
                                            renderText={(value, props) => value}
                                        />
                                    </td>
                                    <td>
                                        <NumberFormat
                                            value={(product.purchase_unit_price * product.quantity).toFixed(2)}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={" SAR"}
                                            renderText={(value, props) => value}
                                        />
                                    </td>
                                    <td>
                                        <NumberFormat
                                            value={product.profit}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={" SAR"}
                                            renderText={(value, props) => value}
                                        />
                                    </td>
                                </tr>
                            ))}
                            <tr>
                                <td colSpan="4"></td>

                                <th className="text-end">Total</th>
                                <td className="text-center">
                                    <NumberFormat
                                        value={totalPrice}
                                        displayType={"text"}
                                        thousandSeparator={true}
                                        suffix={" SAR"}
                                        renderText={(value, props) => value}
                                    />
                                </td>
                                <td colSpan="3" ></td>
                                <td className="text-center">
                                    <NumberFormat
                                        value={model.profit}
                                        displayType={"text"}
                                        thousandSeparator={true}
                                        suffix={" SAR"}
                                        renderText={(value, props) => value}
                                    />
                                </td>
                            </tr>
                            <tr>
                                <th colSpan="4" className="text-end">
                                    VAT
                                </th>
                                <td className="text-center">{model.vat_percent + "%"}</td>
                                <td className="text-center">
                                    <NumberFormat
                                        value={vatPrice}
                                        displayType={"text"}
                                        thousandSeparator={true}
                                        suffix={" SAR"}
                                        renderText={(value, props) => value}
                                    />
                                </td>
                                <td colSpan="3"></td>
                                <td className="text-center">0 SAR</td>
                            </tr>
                            <tr>
                                <th colSpan="5" className="text-end">
                                    Discount
                                </th>
                                <td className="text-center">
                                    <NumberFormat
                                        value={model.discount}
                                        displayType={"text"}
                                        thousandSeparator={true}
                                        suffix={" SAR"}
                                        renderText={(value, props) => value}
                                    />
                                </td>
                                <td colSpan="3"></td>
                                <td className="text-center">
                                    <NumberFormat
                                        value={(0 - model.discount)}
                                        displayType={"text"}
                                        thousandSeparator={true}
                                        suffix={" SAR"}
                                        renderText={(value, props) => value}
                                    />
                                </td>
                            </tr>
                            <tr>
                                <td colSpan="4"></td>
                                <th className="text-end">Net Total</th>
                                <th className="text-center">
                                    <NumberFormat
                                        value={netTotal}
                                        displayType={"text"}
                                        thousandSeparator={true}
                                        suffix={" SAR"}
                                        renderText={(value, props) => value}
                                    />
                                </th>
                                <th colSpan="3" className="text-end">Net Profit</th>
                                <th className="text-center">
                                    <NumberFormat
                                        value={model.net_profit}
                                        displayType={"text"}
                                        thousandSeparator={true}
                                        suffix={" SAR"}
                                        renderText={(value, props) => value}
                                    />
                                </th>
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