import React, { useState, forwardRef, useImperativeHandle, useRef } from "react";
import { Modal, Table } from 'react-bootstrap';
import Cookies from "universal-cookie";
import NumberFormat from "react-number-format";
import Barcode from 'react-barcode';
import QRCode from "react-qr-code";
import html2canvas from 'html2canvas';
//let ThermalPrinterEncoder = require('thermal-printer-encoder');
import ThermalPrinterEncoder from 'thermal-printer-encoder';
import ProductCreate from "./create.js";

import { Button } from "react-bootstrap";
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

    function getProductRetailPrice(product) {
        let store_id = cookies.get("store_id");
        if (!store_id || !product.unit_prices) {
            return "";
        }
        for (let i = 0; i < product.unit_prices.length; i++) {
            if (product.unit_prices[i].store_id === store_id) {
                return parseFloat(product.unit_prices[i].retail_unit_price + parseFloat(product.unit_prices[i].retail_unit_price * 0.15)).toFixed(2);
            }
        }
        return "";
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

        let storeParam = "";

        let store_id = cookies.get("store_id");
        if (store_id) {
            storeParam = "?store_id=" + store_id;
        }


        fetch('/v1/product/' + id + storeParam, requestOptions)
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


    const barcodeRef = useRef();
    const qrcodeRef = useRef();


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

    function printQrCode(e) {

        const opt = {
            scale: 4
        }

        const elem = qrcodeRef.current;

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
                height:20vh;
                width:20vw;
                position:absolute;
                left:0:
                top:0;
            `;

            const url = `<img style="${style}" src="${imgUrl}"/>`;
            var newWin = window.frames["printf"];
            newWin.document.write(`<body onload="window.print()">${url}</body>`);
            newWin.document.close();

        });

    }

    return (<>
        <Modal show={show} size="xl" onHide={handleClose} animation={false} scrollable={true}>
            <Modal.Header>
                <Modal.Title>Details of Product #{model.name} </Modal.Title>

                <div className="col align-self-end text-end">

                    <Button variant="primary" onClick={() => {
                        handleClose();
                        props.openCreateForm();
                    }}>
                        <i className="bi bi-clock-history"></i> Sales History
                    </Button>
                    &nbsp;&nbsp;
                    <Button variant="primary" onClick={() => {
                        handleClose();
                        props.openCreateForm();
                    }}>
                        <i className="bi bi-clock-history"></i> Purchase History
                    </Button>
                    &nbsp;&nbsp;

                    <Button variant="primary" onClick={() => {
                        handleClose();
                        props.openCreateForm();
                    }}>
                        <i className="bi bi-clock-history"></i> Quotation History
                    </Button>
                    &nbsp;&nbsp;

                    <Button variant="primary" onClick={() => {
                        handleClose();
                        props.openCreateForm();
                    }}>
                        <i className="bi bi-plus"></i> Create
                    </Button>
                    &nbsp;&nbsp;
                    <Button variant="primary" onClick={() => {
                        handleClose();
                        props.openUpdateForm(model.id);
                    }}>
                        <i className="bi bi-pencil"></i> Edit
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
                            <th>QR code (Note:Click on Image to Print):</th><td> <div ref={qrcodeRef} onClick={printQrCode} style={{
                                cursor: "pointer",
                            }} > {model.ean_12 ? <QRCode value={model.ean_12} size={128} /> : ""}</div> </td>
                        </tr>
                        <tr>
                            <th>Name:</th><td> {model.name}</td>
                            <th>Name(in Arabic):</th><td> {model.name_in_arabic}</td>
                        </tr>
                        <tr>
                            <th>Item Code:</th><td> {model.item_code}</td>
                            <th>Bar Code:</th><td> {model.bar_code}</td>
                            <th>EAN 12:</th><td> {model.ean_12}</td>
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
                <h4>Unit Prices</h4>
                <div className="table-responsive" style={{ overflowX: "auto" }}>
                    <table className="table table-striped table-sm table-bordered">
                        <thead>
                            <tr className="text-center">
                                <th>SI No.</th>
                                <th>Store Name</th>
                                <th>Purchase Unit Price</th>
                                <th>Wholesale Unit Price</th>
                                <th>Retail Unit Price</th>
                            </tr>
                        </thead>
                        <tbody>
                            {model.unit_prices && model.unit_prices.map((unitPrice, index) => (
                                <tr key={index} className="text-center">
                                    <td>{index + 1}</td>
                                    <td>{unitPrice.store_name}</td>
                                    <td>
                                        <NumberFormat
                                            value={unitPrice.purchase_unit_price}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            renderText={(value, props) => value}
                                            suffix={" SAR"}
                                        />
                                    </td>
                                    <td>
                                        <NumberFormat
                                            value={unitPrice.wholesale_unit_price}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            renderText={(value, props) => value}
                                            suffix={" SAR"}
                                        />
                                    </td>
                                    <td>
                                        <NumberFormat
                                            value={unitPrice.retail_unit_price}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            renderText={(value, props) => value}
                                            suffix={" SAR"}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <h4>Stocks</h4>
                <div className="table-responsive" style={{ overflowX: "auto" }}>
                    <table className="table table-striped table-sm table-bordered">
                        <thead>
                            <tr className="text-center">
                                <th>SI No.</th>
                                <th>Store Name</th>
                                <th>Stock</th>
                            </tr>
                        </thead>
                        <tbody>
                            {model.stock && model.stock.map((stock, index) => (
                                <tr key={index} className="text-center">
                                    <td>{index + 1}</td>
                                    <td>{stock.store_name}</td>
                                    <td>
                                        <NumberFormat
                                            value={stock.stock}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            renderText={(value, props) => value}
                                            suffix={" Units"}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
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
                                        <img alt="Product" src={process.env.REACT_APP_API_URL + image + "?" + (Date.now())} key={process.env.REACT_APP_API_URL + image} style={{ width: 300, height: 300 }} />
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