import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { Modal, Button } from "react-bootstrap";

import { Spinner } from "react-bootstrap";
import Resizer from "react-image-file-resizer";


const SignatureCreate = forwardRef((props, ref) => {

    useImperativeHandle(ref, () => ({
        open(id) {
            formData = {};
            setFormData({ ...formData });
            if (id) {
                getSignature(id);
            }
            SetShow(true);

        },

    }));

    useEffect(() => {
        const listener = event => {
            if (event.code === "Enter" || event.code === "NumpadEnter") {
                console.log("Enter key was pressed. Run your function.");
                // event.preventDefault();

                var form = event.target.form;
                if (form && event.target) {
                    var index = Array.prototype.indexOf.call(form, event.target);
                    if (form && form.elements[index + 1]) {
                        if (event.target.getAttribute("class").includes("barcode")) {
                            form.elements[index].focus();
                        } else {
                            form.elements[index + 1].focus();
                        }
                        event.preventDefault();
                    }
                }
            }
        };
        document.addEventListener("keydown", listener);
        return () => {
            document.removeEventListener("keydown", listener);
        };
    }, []);

    let [errors, setErrors] = useState({});
    const [isProcessing, setProcessing] = useState(false);


    //fields
    let [formData, setFormData] = useState({});

    const [show, SetShow] = useState(false);

    function handleClose() {
        SetShow(false);
    }

    useEffect(() => {
        let at = localStorage.getItem("access_token");
        if (!at) {
            window.location = "/";
        }
    });


    function resizeFIle(file, w, h, cb) {
        Resizer.imageFileResizer(
            file,
            w,
            h,
            "JPEG",
            100,
            0,
            (uri) => {
                cb(uri);
            },
            "base64"
        );
    }


    function ObjectToSearchQueryParams(object) {
        return Object.keys(object)
            .map(function (key) {
                return `search[${key}]=${object[key]}`;
            })
            .join("&");
    }

    function getSignature(id) {
        console.log("inside get Order");
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

        fetch('/v1/signature/' + id + "?" + queryParams, requestOptions)
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();

                // check for error response
                if (!response.ok) {
                    const error = (data && data.errors);
                    return Promise.reject(error);
                }

                setErrors({});

                console.log("Response:");
                console.log(data);
                let signatureData = data.result;
                signatureData.signature = "";
                setFormData({ ...signatureData });
            })
            .catch(error => {
                setProcessing(false);
                setErrors(error);
            });
    }

    function handleCreate(event) {
        event.preventDefault();
        console.log("Inside handle Create");


        if (formData.vat_percent) {
            formData.vat_percent = parseFloat(formData.vat_percent);
        } else {
            formData.vat_percent = null;
        }

        console.log("formData.logo:", formData.logo);

        let endPoint = "/v1/signature";
        let method = "POST";
        if (formData.id) {
            endPoint = "/v1/signature/" + formData.id;
            method = "PUT";
        }


        const requestOptions = {
            method: method,
            headers: {
                'Accept': 'application/json',
                "Content-Type": "application/json",
                Authorization: localStorage.getItem("access_token"),
            },
            body: JSON.stringify(formData),
        };

        console.log("formData:", formData);

        let searchParams = {};
        if (localStorage.getItem("store_id")) {
            searchParams.store_id = localStorage.getItem("store_id");
        }
        let queryParams = ObjectToSearchQueryParams(searchParams);

        setProcessing(true);
        fetch(endPoint + "?" + queryParams, requestOptions)
            .then(async (response) => {
                const isJson = response.headers
                    .get("content-type")
                    ?.includes("application/json");
                const data = isJson && (await response.json());

                // check for error response
                if (!response.ok) {
                    // get error message from body or default to response status
                    const error = data && data.errors;
                    //const error = data.errors
                    return Promise.reject(error);
                }

                setErrors({});
                setProcessing(false);

                console.log("Response:");
                console.log(data);
                props.showToastMessage("Signature Created Successfully!", "success");
                if (props.refreshList) {
                    props.refreshList();
                }

                handleClose();
                props.openDetailsView(data.result.id);
            })
            .catch((error) => {
                setProcessing(false);
                console.log("Inside catch");
                console.log(error);
                setErrors({ ...error });
                console.error("There was an error!", error);
                props.showToastMessage("Error Creating Signature!", "danger");
            });
    }

    function getTargetDimension(originaleWidth, originalHeight, targetWidth, targetHeight) {

        let ratio = parseFloat(originaleWidth / originalHeight);

        targetWidth = parseInt(targetHeight * ratio);
        targetHeight = parseInt(targetWidth * ratio);

        return { targetWidth: targetWidth, targetHeight: targetHeight };
    }


    return (
        <>
            <Modal show={show} size="lg" onHide={handleClose} animation={false} backdrop="static" scrollable={true}>
                <Modal.Header>
                    <Modal.Title>
                        {formData.id ? "Update Signature #" + formData.name : "Create New Signature"}
                    </Modal.Title>

                    <div className="col align-self-end text-end">
                        {formData.id ? <Button variant="primary" onClick={() => {
                            handleClose();
                            props.openDetailsView(formData.id);
                        }}>
                            <i className="bi bi-eye"></i> View Detail
                        </Button> : ""}
                        &nbsp;&nbsp;
                        <Button variant="primary" onClick={handleCreate} >
                            {isProcessing ?
                                <Spinner
                                    as="span"
                                    animation="border"
                                    size="sm"
                                    role="status"
                                    aria-hidden={true}
                                />

                                : ""
                            }
                            {formData.id && !isProcessing ? "Update" : !isProcessing ? "Create" : ""}

                        </Button>
                        <button
                            type="button"
                            className="btn-close"
                            onClick={handleClose}
                            aria-label="Close"
                        ></button>
                    </div >
                </Modal.Header >
                <Modal.Body>
                    <form className="row g-3 needs-validation" onSubmit={handleCreate}>

                        <div className="col-md-6">
                            <label className="form-label">Name*</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.name ? formData.name : ""}
                                    type='string'
                                    onChange={(e) => {
                                        errors["name"] = "";
                                        setErrors({ ...errors });
                                        formData.name = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="name"
                                    placeholder="Name"
                                />
                                {errors.name && (
                                    <div style={{ color: "red" }}>
                                        <i className="bi bi-x-lg"> </i>
                                        {errors.name}
                                    </div>
                                )}
                                {formData.name && !errors.name && (
                                    <div style={{ color: "green" }}>
                                        <i className="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="col-md-6">
                            <label className="form-label">Signature*</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.signature ? formData.signature : ""}
                                    type='file'
                                    onChange={(e) => {
                                        errors["signature_content"] = "";
                                        setErrors({ ...errors });

                                        if (!e.target.value) {
                                            errors["signature_content"] = "Invalid Signature File";
                                            setErrors({ ...errors });
                                            return;
                                        }

                                        formData.signature = e.target.value;

                                        let file = document.querySelector('#signature').files[0];

                                        let targetHeight = 100;
                                        let targetWidth = 80;


                                        let url = URL.createObjectURL(file);
                                        let img = new Image();

                                        img.onload = function () {
                                            let originaleWidth = img.width;
                                            let originalHeight = img.height;

                                            let targetDimensions = getTargetDimension(originaleWidth, originalHeight, targetWidth, targetHeight);
                                            targetWidth = targetDimensions.targetWidth;
                                            targetHeight = targetDimensions.targetHeight;

                                            resizeFIle(file, targetWidth, targetHeight, (result) => {
                                                formData.signature_content = result;
                                                setFormData({ ...formData });

                                                console.log("formData.logo_content:", formData.logo_content);
                                            });

                                        };
                                        img.src = url;
                                    }}
                                    className="form-control"
                                    id="signature"
                                />
                                {errors.signature_content && (
                                    <div style={{ color: "red" }}>
                                        <i className="bi bi-x-lg"> </i>
                                        {errors.signature_content}
                                    </div>
                                )}
                                {formData.signature_content && !errors.signature_content && (
                                    <div style={{ color: "green" }}>
                                        <i className="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>
                        </div>

                        <Modal.Footer>
                            <Button variant="secondary" onClick={handleClose}>
                                Close
                            </Button>
                            <Button variant="primary" onClick={handleCreate} >
                                {isProcessing ?
                                    <Spinner
                                        as="span"
                                        animation="bsignature"
                                        size="sm"
                                        role="status"
                                        aria-hidden={true}
                                    /> + " Processing..."

                                    : formData.id ? "Update" : "Create"
                                }
                            </Button>
                        </Modal.Footer>
                    </form>
                </Modal.Body>

            </Modal >


        </>
    );
});

export default SignatureCreate;
