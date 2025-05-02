import React, { useState, forwardRef, useImperativeHandle, useRef } from "react";
import { Modal, Table } from 'react-bootstrap';

import NumberFormat from "react-number-format";

//let ThermalPrinterEncoder = require('thermal-printer-encoder');
//import ThermalPrinterEncoder from 'thermal-printer-encoder';

import { Button } from "react-bootstrap";
import SalesHistory from "./sales_history.js";
import SalesReturnHistory from "./sales_return_history.js";

import PurchaseHistory from "./purchase_history.js";
import PurchaseReturnHistory from "./purchase_return_history.js";

import QuotationHistory from "./quotation_history.js";

import DeliveryNoteHistory from "./delivery_note_history.js";
import Dropdown from 'react-bootstrap/Dropdown';

import ProductImageGallery from './../utils/ProductImageGallery.js';

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
                'Authorization': localStorage.getItem('access_token'),
            },
        };

        let searchParams = {};
        if (localStorage.getItem("store_id")) {
            searchParams.store_id = localStorage.getItem("store_id");
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



    /*
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

    //}

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


    const PrintBarcode = ({ base64Barcode, productName }) => {
        const handlePrint = () => {
            const printWindow = window.open("", "_blank");
            printWindow.document.write(`
            <html>
              <head>
              <title>${productName}</title> 
                <style>
                  @media print {
                    @page {
                      size: 35mm 25mm; /* Label size */
                      margin: 0; /* No extra margins */
                    }
                    body {
                      margin: 0;
                      padding: 0;
                      display: flex;
                      justify-content: center;
                      align-items: center;
                      height: 25mm;
                    }
                    img {
                      width: 35mm;
                      height: 25mm;
                      object-fit: contain; /* Ensures it fits perfectly */
                    }
                  }
                </style>
              </head>
              <body>
                <img src="${base64Barcode}" />
                <script>window.print(); window.close();</script>
              </body>
            </html>
          `);
            printWindow.document.close();
        };

        return <button onClick={handlePrint}>Print Barcode</button>;
    };

    return (<>
        <SalesHistory ref={SalesHistoryRef} showToastMessage={props.showToastMessage} />
        <SalesReturnHistory ref={SalesReturnHistoryRef} showToastMessage={props.showToastMessage} />

        <PurchaseHistory ref={PurchaseHistoryRef} showToastMessage={props.showToastMessage} />
        <PurchaseReturnHistory ref={PurchaseReturnHistoryRef} showToastMessage={props.showToastMessage} />

        <QuotationHistory ref={QuotationHistoryRef} showToastMessage={props.showToastMessage} />

        <DeliveryNoteHistory ref={DeliveryNoteHistoryRef} showToastMessage={props.showToastMessage} />

        <Modal show={show} fullscreen onHide={handleClose} animation={false} scrollable={true}>
            <Modal.Header>
                <Modal.Title>Details of Product #{model.name} {model.name_in_arabic ? " / " + model.name_in_arabic : ""} </Modal.Title>


                <span style={{ marginLeft: "10px" }}>
                    <Dropdown >
                        <Dropdown.Toggle variant="secondary" id="dropdown-secondary" style={{}}>
                            History
                        </Dropdown.Toggle>

                        <Dropdown.Menu>
                            <Dropdown.Item onClick={() => {
                                openSalesHistory(model);
                            }}>
                                <i className="bi bi-clock-history"></i>
                                &nbsp;
                                Sales History
                            </Dropdown.Item>
                            <Dropdown.Item onClick={() => {
                                openSalesReturnHistory(model);
                            }}>
                                <i className="bi bi-clock-history"></i>
                                &nbsp;
                                Sales Return History
                            </Dropdown.Item>
                            <Dropdown.Item onClick={() => {
                                openPurchaseHistory(model);
                            }}>
                                <i className="bi bi-clock-history"></i>
                                &nbsp;
                                Purchase History
                            </Dropdown.Item>
                            <Dropdown.Item onClick={() => {
                                openPurchaseReturnHistory(model);
                            }}>
                                <i className="bi bi-clock-history"></i>
                                &nbsp;
                                Purchase Return History
                            </Dropdown.Item>
                            <Dropdown.Item onClick={() => {
                                openDeliveryNoteHistory(model);
                            }}>
                                <i className="bi bi-clock-history"></i>
                                &nbsp;
                                Delivery Note History
                            </Dropdown.Item>
                            <Dropdown.Item onClick={() => {
                                openQuotationHistory(model);
                            }}>
                                <i className="bi bi-clock-history"></i>
                                &nbsp;
                                Quotation History
                            </Dropdown.Item>

                        </Dropdown.Menu>
                    </Dropdown>
                </span>

                <div className="col align-self-end text-end">



                    {/*                                            
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
                    </div>*/}

                    {props.openCreateForm ? <Button variant="primary" style={{ marginTop: "3px" }} onClick={() => {
                        handleClose();
                        props.openCreateForm();
                    }}>
                        <i className="bi bi-plus"></i> Create
                    </Button> : ""}
                    &nbsp;&nbsp;
                    {props.openUpdateForm ? <Button variant="primary" style={{ marginTop: "3px" }} onClick={() => {
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
                                }} />

                                <PrintBarcode base64Barcode={model.barcode_base64} productName={model.name} />
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
                            <th>Brand:</th><td> {model.brand_name}</td>
                            <th>Country:</th><td> {model.country_name}</td>
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
                                {!localStorage.getItem('store_id') ? <th>Store Name</th> : ""}
                                <th>Purchase Unit Price</th>
                                <th>Wholesale Unit Price</th>
                                <th>Retail Unit Price</th>
                                <th>Damaged/Missing Stock</th>
                                <th>Stock</th>
                            </tr>
                        </thead>
                        <tbody>
                            {model.product_stores && Object.keys(model.product_stores).map((key, index) => {
                                return (!localStorage.getItem('store_id') || localStorage.getItem('store_id') === model.product_stores[key].store_id ? <tr key={index} className="text-center">
                                    {!localStorage.getItem('store_id') ? <td>{model.product_stores[key].store_name}</td> : ""}
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
                                    <td>{model.product_stores[key].damaged_stock}</td>
                                    <td>{model.product_stores[key].stock}</td>
                                </tr> : "")
                            })}
                        </tbody>
                        {/*
                        <tbody>
                            {model.product_stores && Object.keys(model.product_stores).map((key, index) => {
                                !      localStorage.getItem('store_id') || model.product_stores[key].store_id ==       localStorage.getItem('store_id') ? <tr key={index} className="text-center">
                                    {!      localStorage.getItem('store_id') ? <td>{model.product_stores[key].store_name}</td> : ""}
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
                {model.id && <div className="col-md-12">
                    <label className="form-label">Product photos</label>
                    <ProductImageGallery productID={model.id} storeID={model.store_id} storedImages={model.images} />
                </div>}


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