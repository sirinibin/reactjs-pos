import React, { useState, forwardRef, useImperativeHandle, useRef } from "react";
import { Modal, Table } from 'react-bootstrap';
import Cookies from "universal-cookie";
import NumberFormat from "react-number-format";

//let ThermalPrinterEncoder = require('thermal-printer-encoder');
import ThermalPrinterEncoder from 'thermal-printer-encoder';

import { Button } from "react-bootstrap";
import SalesHistory from "./sales_history.js";
import SalesReturnHistory from "./sales_return_history.js";

import PurchaseHistory from "./purchase_history.js";
import PurchaseReturnHistory from "./purchase_return_history.js";

import QuotationHistory from "./quotation_history.js";

import DeliveryNoteHistory from "./delivery_note_history.js";

const ProductView = forwardRef((props, ref) => {

    useImperativeHandle(ref, () => ({
        open(id) {
            if (id) {
                getProduct(id);
                SetShow(true);
            }

        },

    }));


    let [model, setModel] = useState({});
    const cookies = new Cookies();

    const [show, SetShow] = useState(false);

    function handleClose() {
        SetShow(false);
    };


    function ObjectToSearchQueryParams(object) {
        return Object.keys(object)
            .map(function (key) {
                return `search[${key}]=` + object[key];
            })
            .join("&");
    }

    function getProduct(id) {
        console.log("inside get Product");
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

        fetch('/v1/product/' + id + "?" + queryParams, requestOptions)
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



    function printBarCode(event) {
        console.log("Clicked:");

        console.log(event.target.getAttribute("src"));

        let encoder = new ThermalPrinterEncoder({
            language: 'esc-pos'
        });

        let img = new Image();
        img.src = event.target.getAttribute("src");

        img.onload = function () {
            console.log("Inside onload")
            let result = encoder
                .image(img, 320, 320, 'atkinson')
                .encode();
            console.log("result:", result);

        }


        /*
        const opt = {
            scale: 4
        }
        const elem = barcodeRef.current;
        html2canvas(elem, opt).then(canvas => {
            const iframe = document.createElement('iframe')
            iframe.name = 'printf'
            iframe.id = 'printf'
            iframe.height = 0;
            iframe.width = 0;
            document.body.appendChild(iframe)

            const imgUrl = canvas.toDataURL({
                format: 'jpeg',
                quality: '1.0'
            })

            const style = `
                height:15vh;
                width:35vw;
                position:relative;
                left:0:
                top:0;
                margin-left:250;
                margin-top:3%;
                margin-bottom:50%;
            `;

            const url = `<img style="${style}" src="${imgUrl}"/>`;
            var newWin = window.frames["printf"];
            newWin.document.write(`<body onload="window.print()" >${url}</body>`);
            newWin.document.close();

        });
        */

    }

    const SalesHistoryRef = useRef();
    function openSalesHistory(model) {
        SalesHistoryRef.current.open(model);
    }

    const SalesReturnHistoryRef = useRef();
    function openSalesReturnHistory(model) {
        SalesReturnHistoryRef.current.open(model);
    }


    const PurchaseHistoryRef = useRef();
    function openPurchaseHistory(model) {
        PurchaseHistoryRef.current.open(model);
    }

    const PurchaseReturnHistoryRef = useRef();
    function openPurchaseReturnHistory(model) {
        PurchaseReturnHistoryRef.current.open(model);
    }


    const QuotationHistoryRef = useRef();
    function openQuotationHistory(model) {
        QuotationHistoryRef.current.open(model);
    }

    const DeliveryNoteHistoryRef = useRef();
    function openDeliveryNoteHistory(model) {
        DeliveryNoteHistoryRef.current.open(model);
    }

    return (<>
        <SalesHistory ref={SalesHistoryRef} showToastMessage={props.showToastMessage} />
        <SalesReturnHistory ref={SalesReturnHistoryRef} showToastMessage={props.showToastMessage} />

        <PurchaseHistory ref={PurchaseHistoryRef} showToastMessage={props.showToastMessage} />
        <PurchaseReturnHistory ref={PurchaseReturnHistoryRef} showToastMessage={props.showToastMessage} />

        <QuotationHistory ref={QuotationHistoryRef} showToastMessage={props.showToastMessage} />

        <DeliveryNoteHistory ref={DeliveryNoteHistoryRef} showToastMessage={props.showToastMessage} />

        <Modal show={show} size="xl" onHide={handleClose} animation={false} scrollable={true}>
            <Modal.Header>
                <Modal.Title>Details of Product #{model.name} {model.name_in_arabic ? " / " + model.name_in_arabic : ""} </Modal.Title>

                <div className="col align-self-end text-end">

                    <div class="btn-group">
                        <button type="button" class="btn btn-success dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">
                            History
                        </button>
                        <ul class="dropdown-menu">
                            <li>
                                <div class="dropdown-item" style={{ cursor: "pointer" }} onClick={() => {
                                    openSalesHistory(model);
                                }}>
                                    <i className="bi bi-clock-history"></i> Sales History
                                </div>
                            </li>
                            <li>
                                <div class="dropdown-item" style={{ cursor: "pointer" }} onClick={() => {
                                    openPurchaseHistory(model);
                                }}>
                                    <i className="bi bi-clock-history"></i> Purchase History
                                </div>
                            </li>
                            <li>
                                <div class="dropdown-item" style={{ cursor: "pointer" }} onClick={() => {
                                    openSalesReturnHistory(model);
                                }}>
                                    <i className="bi bi-clock-history"></i> Sales Return History
                                </div>
                            </li>

                            <li>
                                <div class="dropdown-item" style={{ cursor: "pointer" }} onClick={() => {
                                    openPurchaseReturnHistory(model);
                                }}>
                                    <i className="bi bi-clock-history"></i> Purchase Return History
                                </div>
                            </li>
                            <li> <div class="dropdown-item" style={{ cursor: "pointer" }} onClick={() => {
                                openQuotationHistory(model);
                            }}>
                                <i className="bi bi-clock-history"></i> Quotation History
                            </div>
                            </li>
                            <li> <div class="dropdown-item" style={{ cursor: "pointer" }} onClick={() => {
                                openDeliveryNoteHistory(model);
                            }}>
                                <i className="bi bi-clock-history"></i> Delivery Note History
                            </div>
                            </li>
                        </ul>
                    </div>




                    &nbsp;&nbsp;

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
                <Table striped bordered hover responsive="lg">
                    <tbody>
                        <tr>
                            <th  >Barcode (Note:Save & Print):</th>
                            <td>
                                <img alt="Barcode" src={model.barcode_base64} style={{
                                    width: "400px",
                                    height: "300px",
                                }} onClick={printBarCode} />


                            </td>
                            <th>Name:</th><td> {model.name}</td>
                            <th>Name(in Arabic):</th><td> {model.name_in_arabic}</td>
                        </tr>
                        <tr>
                            <th>Store:</th><td> {model.store_name}</td>
                            <th>Store Code:</th><td> {model.store_code}</td>
                            <th>Item Code:</th><td> {model.item_code}</td>
                            <th>Bar Code:</th><td> {model.bar_code}</td>
                            <th>EAN 12:</th><td> {model.ean_12}</td>
                        </tr>
                        <tr>
                            <th>Part Number:</th><td> {model.part_number}</td>
                            <th>Rack / Location:</th><td> {model.rack}</td>
                            <th>Categories:</th><td>
                                <ul>
                                    {model.category_name &&
                                        model.category_name.map((name) => (
                                            <li key={name}>{name}</li>
                                        ))}
                                </ul>
                            </td>
                        </tr>
                        <tr>
                            <th>Unit:</th><td> {model.unit ? model.unit : "Unit(s)"}</td>
                            <th>Created At:</th><td> {model.created_at}</td>
                            <th>Updated At:</th><td> {model.updated_at}</td>
                        </tr>
                        <tr>
                            <th>Created By:</th><td> {model.created_by_name}</td>
                            <th>Updated By:</th><td> {model.updated_by_name}</td>
                        </tr>
                    </tbody>
                </Table>
                <h4>Unit Prices & Stock</h4>
                <div className="table-responsive" style={{ overflowX: "auto" }}>
                    <table className="table table-striped table-sm table-bordered">
                        <thead>
                            <tr className="text-center">
                                {!cookies.get('store_id') ? <th>Store Name</th> : ""}
                                <th>Purchase Unit Price</th>
                                <th>Wholesale Unit Price</th>
                                <th>Retail Unit Price</th>
                                <th>Stock</th>
                            </tr>
                        </thead>
                        <tbody>
                            {model.product_stores && Object.keys(model.product_stores).map((key, index) => {
                                return (!cookies.get('store_id') || cookies.get('store_id') === model.product_stores[key].store_id ? <tr key={index} className="text-center">
                                    {!cookies.get('store_id') ? <td>{model.product_stores[key].store_name}</td> : ""}
                                    <td>
                                        <NumberFormat
                                            value={model.product_stores[key].purchase_unit_price}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            renderText={(value, props) => value}
                                            suffix={" "}
                                        />
                                    </td>
                                    <td>
                                        <NumberFormat
                                            value={model.product_stores[key].wholesale_unit_price}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            renderText={(value, props) => value}
                                            suffix={" "}
                                        />
                                    </td>
                                    <td>
                                        <NumberFormat
                                            value={model.product_stores[key].retail_unit_price}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            renderText={(value, props) => value}
                                            suffix={" "}
                                        />
                                    </td>
                                    <td>{model.product_stores[key].stock}</td>
                                </tr> : "")
                            })}
                        </tbody>
                        {/*
                        <tbody>
                            {model.product_stores && Object.keys(model.product_stores).map((key, index) => {
                                !cookies.get('store_id') || model.product_stores[key].store_id == cookies.get('store_id') ? <tr key={index} className="text-center">
                                    {!cookies.get('store_id') ? <td>{model.product_stores[key].store_name}</td> : ""}
                                    <td>
                                        <NumberFormat
                                            value={model.product_stores[key].purchase_unit_price}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            renderText={(value, props) => value}
                                            suffix={" "}
                                        />
                                    </td>
                                    <td>
                                        <NumberFormat
                                            value={model.product_stores[key].wholesale_unit_price}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            renderText={(value, props) => value}
                                            suffix={" "}
                                        />
                                    </td>
                                    <td>
                                        <NumberFormat
                                            value={model.product_stores[key].retail_unit_price}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            renderText={(value, props) => value}
                                            suffix={" "}
                                        />
                                    </td>
                                    <td>{model.product_stores[key].stock}</td>
                                </tr> : ''
                            ))
                        }
                        </tbody>
                    */}
                    </table>
                </div>
                <h4>Images</h4>
                <div className="table-responsive" style={{ overflowX: "auto" }}>
                    <table className="table table-striped table-sm table-bordered">
                        <thead>
                            <tr className="text-center">
                                <th>SI No.</th>
                                <th>Image</th>
                            </tr>
                        </thead>
                        <tbody>
                            {model.images && model.images.map((image, index) => (
                                <tr key={index} className="text-center">
                                    <td>{index + 1}</td>
                                    <td>
                                        <img alt="Product" src={image + "?" + (Date.now())} key={image} style={{ width: 300, height: 300 }} />
                                    </td>
                                </tr>
                            ))}
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

export default ProductView;