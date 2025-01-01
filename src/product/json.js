import React, { useState, forwardRef, useImperativeHandle } from "react";
import { Modal, Button } from 'react-bootstrap';

const ProductJson = forwardRef((props, ref) => {

    useImperativeHandle(ref, () => ({
        open(content) {
            jsonContent = content;
            setJsonContent(jsonContent);
            SetShow(true);

        },

    }));

    let [jsonContent, setJsonContent] = useState([]);


    const [show, SetShow] = useState(false);

    function handleClose() {
        SetShow(false);
    };

    let [copied, setCopied] = useState(false);

    function copy() {
        /* Get the text field */
        var copyText = document.getElementById("data");

        //console.log("copyText :", copyText.innerText);
        /* Select the text field */
        //copyText.select();
        //copyText.setSelectionRange(0, 99999); /* For mobile devices */

        /* Copy the text inside the text field */
        navigator.clipboard.writeText(copyText.innerText);
        copied = true;
        setCopied(true);
        /* Alert the copied text */
        // alert("Copied the text: " + copyText.innerText);
    }


    return (<>
        <Modal show={show} size="xl" onHide={handleClose} animation={false} scrollable={true}>
            <Modal.Header>
                <Modal.Title>Json </Modal.Title>

                <div className="col align-self-end text-end">
                    {/*
                        <button
                            className="btn btn-primary mb-3"
                            data-bs-toggle="modal"
                            data-bs-target="#previewProductModal"
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
                <div className="row">
                    <div className="col-md-12 align-self-end text-end">
                        <Button variant="primary" onClick={copy} >
                            {copied ? "Copied" : "Copy"}

                        </Button>
                    </div>
                </div>
                <code>
                    <pre id="data">{JSON.stringify(jsonContent, null, 2)}</pre>

                </code>

            </Modal.Body>

        </Modal>
    </>);

});

export default ProductJson;