import { React, useState, useRef, forwardRef, useImperativeHandle } from "react";
import { Modal, Button } from 'react-bootstrap';
import OrderPrintContent from './printContent.js';
import Cookies from "universal-cookie";
import { useReactToPrint } from 'react-to-print';
import { Invoice } from '@axenda/zatca';
import { format } from "date-fns";

const PurchasePrint = forwardRef((props, ref) => {

    useImperativeHandle(ref, () => ({
        open(modelObj) {
            if (modelObj) {
                model = modelObj;
                setModel({ ...model })

                if (model.store_id) {
                    getStore(model.store_id);
                }

                if (model.vendor_id) {
                    getVendor(model.vendor_id);
                }

                if (model.delivered_by) {
                    getUser(model.delivered_by);
                }

                if (model.delivered_by_signature_id) {
                    getSignature(model.delivered_by_signature_id);
                }

                let pageSize = 15;
                model.pageSize = pageSize;
                let totalProducts = model.products.length;
                let top = 0;
                let totalPagesInt = parseInt(totalProducts / pageSize);
                let totalPagesFloat = parseFloat(totalProducts / pageSize);

                let totalPages = totalPagesInt;
                if ((totalPagesFloat - totalPagesInt) > 0) {
                    totalPages++;
                }

                model.total_pages = totalPages;


                model.pages = [];


                let offset = 0;

                for (let i = 0; i < totalPages; i++) {
                    model.pages.push({
                        top: top,
                        products: [],
                        lastPage: false,
                    });

                    for (let j = offset; j < totalProducts; j++) {
                        model.pages[i].products.push(model.products[j]);

                        if (model.pages[i].products.length === pageSize) {
                            break;
                        }
                    }

                    top += 1066;
                    offset += pageSize;
                    if ((i + 1) === totalPages) {
                        model.pages[i].lastPage = true;
                    }
                }

                console.log("model.pages:", model.pages);

                console.log("model.products:", model.products);
                getQRCodeContents();
                //model.qr_content = getQRCodeContents();
                //setModel({ ...model });

                setShow(true);
                console.log("model:", model);
            }

        },

    }));

    const cookies = new Cookies();

    let [model, setModel] = useState({});

    const [show, setShow] = useState(props.show);

    function handleClose() {
        setShow(false);
    }


    let [qrContent, setQrContent] = useState("");

    function getQRCodeContents() {
        qrContent = "";

        if (model.code) {
            qrContent += "Sales Invoice #: " + model.code + "<br />";
        }

        if (model.store) {
            qrContent += "Store: " + model.store.name + "<br />";
        }

        if (model.vendor) {
            qrContent += "Vendor: " + model.vendor.name + "<br />";
        }


        if (model.net_total) {
            qrContent += "Net Total: " + model.net_total + "<br />";
        }
        qrContent += "Store: Test <br />";

        setQrContent(qrContent);
        model.qr_content = qrContent;
        setModel({ ...model });
        console.log("QR content:", model.qr_content);

        return model.qr_content;
    }

    function getStore(id) {
        console.log("inside get Store");
        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': cookies.get('access_token'),
            },
        };

        fetch('/v1/store/' + id, requestOptions)
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
                let storeData = data.result;
                model.store = storeData;

                var d = new Date(model.date);
                console.log("d:", d);


                let d2 = format(
                    new Date(d),
                    "yyyy-MM-dd h:m:mma"
                );
                console.log("d2:", d2);
                const invoice = new Invoice({
                    sellerName: model.store_name,
                    vatRegistrationNumber: model.store.vat_no,
                    invoiceTimestamp: d2,
                    invoiceTotal: model.net_total,
                    invoiceVatTotal: model.vat_price,
                });

                model.QRImageData = await invoice.render();
                console.log("model.QRImageData:", model.QRImageData);

                setModel({ ...model });
            })
            .catch(error => {

            });
    }


    function ObjectToSearchQueryParams(object) {
        return Object.keys(object)
            .map(function (key) {
                return `search[${key}]=${object[key]}`;
            })
            .join("&");
    }


    function getVendor(id) {
        console.log("inside get Vendor");
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

        fetch('/v1/vendor/' + id + "?" + queryParams, requestOptions)
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
                let vendorData = data.result;
                model.vendor = vendorData;
                setModel({ ...model });
            })
            .catch(error => {

            });
    }

    function getUser(id) {
        console.log("inside get User(Delivered by)");
        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': cookies.get('access_token'),
            },
        };

        fetch('/v1/user/' + id, requestOptions)
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
                let userData = data.result;
                model.delivered_by_user = userData;
                setModel({ ...model });
            })
            .catch(error => {

            });
    }

    function getSignature(id) {
        console.log("inside get Signature");
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

        fetch('/v1/signature/' + id + "?" + queryParams, requestOptions)
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
                let signatureData = data.result;
                model.delivered_by_signature = signatureData;
                setModel({ ...model });
            })
            .catch(error => {
            });
    }



    /*
    function print() {
        console.log("Print");
    }
    */

    const printAreaRef = useRef();

    function getFileName() {
        let filename = "Sales_Invoice";

        if (model.id) {
            filename += "_#" + model.code;
        }

        return filename;
    }

    const handlePrint = useReactToPrint({
        content: () => printAreaRef.current,
        documentTitle: getFileName(),
    });


    return (<>
        <Modal show={show} scrollable={true} size="xl" onHide={handleClose} animation={false} style={{ overflowY: "auto", height: "auto" }}>
            <Modal.Header>
                <Modal.Title>Invoice Preview</Modal.Title>
                <div className="col align-self-end text-end">
                    <Button variant="primary" className="btn btn-primary mb-3" onClick={handlePrint}>
                        <i className="bi bi-printer"></i> Print
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
                <div ref={printAreaRef} >
                    <OrderPrintContent model={model} />
                </div>
            </Modal.Body>
            <Modal.Footer>
                {/*
                <Button variant="secondary" onClick={handleClose}>
                    Close
                </Button>
                <Button variant="primary" onClick={handleClose}>
                    Save Changes
                </Button>
                */}
            </Modal.Footer>
        </Modal>
    </>);

});

export default PurchasePrint;