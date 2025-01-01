import { React, useState, useRef, forwardRef, useImperativeHandle } from "react";
import { Modal, Button } from 'react-bootstrap';
import BalanceSheetPrintPreviewContent from './printPreviewContent.js';
import Cookies from "universal-cookie";
import { useReactToPrint } from 'react-to-print';
import { format } from "date-fns";

const BalanceSheetPrintPreview = forwardRef((props, ref) => {

    useImperativeHandle(ref, () => ({
        open(modelObj) {
            console.log("modelObj:", modelObj);
            if (modelObj) {
                model = modelObj;
                setModel({ ...model })

                if (model.store_id) {
                    getStore(model.store_id);
                }

                /*
                if (model.created_by) {
                    getUser(model.created_by);
                }
                */

                /*
                if (model.reference_model==="customer") {
                    getCustomer(model.reference_id);
                }
                */

                /*
                if (model.delivered_by) {
                    getUser(model.delivered_by);
                }
                

                if (model.delivered_by_signature_id) {
                    getSignature(model.delivered_by_signature_id);
                }
                */

                let pageSize = 15;
                model.pageSize = pageSize;
                let totalPosts = model.posts.length;
                let top = 0;
                let totalPagesInt = parseInt(totalPosts / pageSize);
                let totalPagesFloat = parseFloat(totalPosts / pageSize);

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
                        posts: [],
                        lastPage: false,
                        firstPage: false,
                    });

                    for (let j = offset; j < totalPosts; j++) {
                        for (let k = 0; k < model.posts[j].posts.length; k++) {
                            model.pages[i].posts.push({
                                "date": model.posts[j].posts[k].date,
                                "debit_account": model.posts[j].posts[k].debit_or_credit === "debit" ? "To " + model.posts[j].posts[k].account_name + " A/c #" + model.posts[j].posts[k].account_number + " Dr." : "",
                                "debit_account_number": model.posts[j].posts[k].debit_or_credit === "debit" ? model.posts[j].posts[k].account_number : "",
                                "credit_account": model.posts[j].posts[k].debit_or_credit === "credit" ? "By " + model.posts[j].posts[k].account_name + " A/c #" + model.posts[j].posts[k].account_number + " Cr." : "",
                                "credit_account_number": model.posts[j].posts[k].debit_or_credit === "credit" ? model.posts[j].posts[k].account_number : "",
                                "debit_or_credit": model.posts[j].posts[k].debit_or_credit,
                                "debit_amount": model.posts[j].posts[k].debit ? model.posts[j].posts[0].debit : "",
                                "credit_amount": model.posts[j].posts[k].credit ? model.posts[j].posts[0].credit : "",
                                "reference_code": model.posts[j].reference_code,
                                "reference_model": model.posts[j].reference_model,
                            });
                        }
                        //  model.pages[i].posts.push(model.posts[j]);

                        if (model.pages[i].posts.length === pageSize) {
                            break;
                        }
                    }

                    if (model.pages[i].posts.length < pageSize) {
                        for (let s = model.pages[i].posts.length; s < pageSize; s++) {
                            model.pages[i].posts.push({});
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
                console.log("model.posts:", model.posts);
                //  getQRCodeContents();
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

            });
    }




    /*
    function print() {
        console.log("Print");
    }
    */

    const printAreaRef = useRef();

    function getFileName() {
        let filename = "";

        if (model.name) {
            filename += model.name + "_acc_#" + model.number;
        }

        filename=filename.split(' ').join('_')

        if (model.dateValue) {
            filename += "_Date_" + format(new Date(model.dateValue), "MMM_dd_yyyy")
        } else if (model.fromDateValue && model.toDateValue) {
            filename += "_Date_" + format(new Date(model.fromDateValue), "MMM_dd_yyyy") + "_to_" + format(new Date(model.toDateValue), "MMM dd yyyy")
        } else if (model.fromDateValue && !model.toDateValue && !model.dateValue) {
            filename += "_Date_from_" + format(new Date(model.fromDateValue), "MMM_dd_yyyy") + "_to_present"
        } else if (model.toDateValue && !model.fromDateValue && !model.dateValue) {
            filename += "_Date_upto_" + format(new Date(model.toDateValue), "MMM_dd_yyyy")
        }

       

        filename += ".pdf"

        return filename;
    }

    const handlePrint = useReactToPrint({
        content: () => printAreaRef.current,
        documentTitle: getFileName(),
    });


    return (<>
        <Modal show={show} scrollable={true} size="xl" fullscreen onHide={handleClose} animation={false}>
            <Modal.Header>
                <Modal.Title>Balance sheet preview</Modal.Title>
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
                    <BalanceSheetPrintPreviewContent model={model} userName={cookies.get("user_name")?cookies.get("user_name"):""} />
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

export default BalanceSheetPrintPreview;