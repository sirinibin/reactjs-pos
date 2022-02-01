import { React, useState, useRef, forwardRef, useImperativeHandle } from "react";
import { Modal, Button } from 'react-bootstrap';
import QuotationPreviewContent from './previewContent.js';
import Cookies from "universal-cookie";
import { useReactToPrint } from 'react-to-print';

const SalesReturnPreview = forwardRef((props, ref) => {

    useImperativeHandle(ref, () => ({
        open(modelObj) {
            if (modelObj) {
                model = modelObj;
                setModel({ ...model })

                if (model.store_id) {
                    getStore(model.store_id);
                }

                if (model.customer_id) {
                    getCustomer(model.customer_id);
                }

                if (model.received_by) {
                    getUser(model.received_by);
                }

                if (model.received_by_signature_id) {
                    getSignature(model.received_by_signature_id);
                }

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

    const [isProcessing, setProcessing] = useState(false);

    function handleClose() {
        setShow(false);
    }


    let [qrContent, setQrContent] = useState("");
    let [qrContentLoaded, setQrContentLoaded] = useState(false);

    function getQRCodeContents() {
        qrContent = "";

        if (model.code) {
            qrContent += "Quotation #: " + model.code + "<br />";
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
                setModel({ ...model });
            })
            .catch(error => {
                setProcessing(false);
            });
    }



    function getCustomer(id) {
        console.log("inside get Customer");
        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': cookies.get('access_token'),
            },
        };

        fetch('/v1/customer/' + id, requestOptions)
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
                let customerData = data.result;
                model.customer = customerData;
                setModel({ ...model });
            })
            .catch(error => {
                setProcessing(false);
            });
    }

    function getUser(id) {
        console.log("inside get User(Received by)");
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
                model.received_by_user = userData;
                setModel({ ...model });
            })
            .catch(error => {
                setProcessing(false);
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

        fetch('/v1/signature/' + id, requestOptions)
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
                model.received_by_signature = signatureData;
                setModel({ ...model });
            })
            .catch(error => {
                setProcessing(false);
            });
    }



    /*
    function print() {
        console.log("Print");
    }
    */

    const printAreaRef = useRef();

    function getFileName() {
        let filename = "Quotation";

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
        <Modal show={show} scrollable={true} size="xl" onHide={handleClose} animation={false}>
            <Modal.Header>
                <Modal.Title>Quotation Preview</Modal.Title>
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
                    <QuotationPreviewContent model={model} />
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

export default SalesReturnPreview;