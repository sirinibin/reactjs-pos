import { React, useState, useRef, forwardRef, useImperativeHandle, useEffect, useCallback } from "react";
import { Modal, Button } from 'react-bootstrap';
import CustomerWithdrawalPreviewContent from './previewContent.js';

import { useReactToPrint } from 'react-to-print';
import { Invoice } from '@axenda/zatca';


const CustomerWithdrawalPreview = forwardRef((props, ref) => {

    function ObjectToSearchQueryParams(object) {
        return Object.keys(object)
            .map(function (key) {
                return `search[${key}]=${object[key]}`;
            })
            .join("&");
    }

    useImperativeHandle(ref, () => ({
        open(modelObj) {
            if (modelObj) {
                model = modelObj;
                setModel({ ...model })

                if (localStorage.getItem("store_id")) {
                    getStore(localStorage.getItem("store_id"));
                }

                if (model.customer_id) {
                    getCustomer(model.customer_id);
                }

                let pageSize = 20;
                model.pageSize = pageSize;
                let totalProducts = 1
                let top = 0;
                let totalPagesInt = parseInt(totalProducts / pageSize);
                let totalPagesFloat = parseFloat(totalProducts / pageSize);

                let totalPages = totalPagesInt;
                if ((totalPagesFloat - totalPagesInt) > 0) {
                    totalPages++;
                }

                model.total_pages = totalPages;


                model.pages = [];
                model.products = [{}];
                model.net_total = model.amount;


                let offset = 0;

                for (let i = 0; i < totalPages; i++) {
                    model.pages.push({
                        top: top,
                        products: [],
                        lastPage: false,
                        firstPage: false,
                    });

                    for (let j = offset; j < totalProducts; j++) {
                        model.pages[i].products.push(model.products[j]);
                        if (model.pages[i].products.length === pageSize) {
                            break;
                        }
                    }

                    if (model.pages[i].products.length < pageSize) {
                        for (let s = model.pages[i].products.length; s < pageSize; s++) {
                            model.pages[i].products.push({});
                        }
                    }

                    top += 1057; //1057
                    offset += pageSize;

                    if (i === 0) {
                        model.pages[i].firstPage = true;
                    }

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



    let [model, setModel] = useState({});

    const [show, setShow] = useState(props.show);

    function handleClose() {
        setShow(false);
    }


    let [qrContent, setQrContent] = useState("");

    function getQRCodeContents() {
        qrContent = "";

        if (model.code) {
            qrContent += "Invoice #: " + model.code + "<br />";
        }

        if (model.store) {
            qrContent += "Store: " + model.store.name + "<br />";
        }

        if (model.customer) {
            qrContent += "Customer: " + model.customer.name + "<br />";
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
                'Authorization': localStorage.getItem('access_token'),
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

                const invoice = new Invoice({
                    sellerName: model.store_name,
                    vatRegistrationNumber: model.store.vat_no,
                    invoiceTimestamp: model.date,
                    invoiceTotal: model.net_total,
                    invoiceVatTotal: model.vat_price,
                    // uuid: model.uuid,
                    invoiceHash: model.hash ? model.hash : "",
                });

                model.QRImageData = await invoice.render();
                console.log("model.QRImageData:", model.QRImageData);

                setModel({ ...model });
            })
            .catch(error => {

            });
    }



    function getCustomer(id) {
        console.log("inside get Customer");
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

        fetch('/v1/customer/' + id + "?" + queryParams, requestOptions)
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();

                // check for error response
                if (!response.ok) {
                    const error = (data && data.errors);
                    return Promise.reject(error);
                }

                console.log("Customer Response:");
                console.log(data);
                let customerData = data.result;
                model.customer = customerData;
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
        let filename = "Receipt";

        if (model.id) {
            filename += "_#" + model.code;
        }

        return filename;
    }

    const handlePrint = useReactToPrint({
        content: () => printAreaRef.current,
        documentTitle: getFileName(),
        onAfterPrint: () => {
            handleClose();
        }
    });


    // Wrap handlePrint in useCallback to avoid unnecessary re-creations
    const autoPrint = useCallback(() => {
        handlePrint();
    }, [handlePrint]);


    useEffect(() => {
        // Automatically trigger print when component is mounted
        setTimeout(() => {
            autoPrint();
        }, 500);
    }, [autoPrint]);


    return (<>
        <Modal show={show} scrollable={true} size="xl" fullscreen onHide={handleClose} animation={false}>
            <Modal.Header>
                <Modal.Title>Customer Payable Preview</Modal.Title>
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
                <div ref={printAreaRef}>
                    <CustomerWithdrawalPreviewContent model={model} />
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

export default CustomerWithdrawalPreview;