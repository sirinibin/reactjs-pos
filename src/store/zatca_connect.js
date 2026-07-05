import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { Modal, Button } from "react-bootstrap";

import { Spinner } from "react-bootstrap";
import { useEnterKeyNavigation } from '../utils/useEnterKeyNavigation.js';

const ZatcaConnect = forwardRef((props, ref) => {

    useImperativeHandle(ref, () => ({
        open(id) {
            setErrors({});
            selectedStores = [];
            setSelectedStores(selectedStores);
            formData = {};
            if (id) {
                formData.id = id;
            }

            setFormData(formData);

            SetShow(true);
        },

    }));

    useEnterKeyNavigation();


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



    function handleConnect(event) {
        event.preventDefault();
        console.log("Inside handle Connect");
        let endPoint = "/v1/store/zatca/connect";
        let method = "POST";

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

        setProcessing(true);
        fetch(endPoint, requestOptions)
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
                if (props.showToastMessage) props.showToastMessage("Store Connected to Zatca Successfully!", "success");
                if (props.refreshList) {
                    props.refreshList();
                }

                handleClose();
            })
            .catch((error) => {
                setProcessing(false);
                console.log(error);
                setErrors({ ...error });
                console.error("There was an error!", error);
                if (props.showToastMessage) props.showToastMessage("Error Connecting to Zatca!", "danger");
            });
    }


    let [selectedStores, setSelectedStores] = useState([]);


    return (
        <>
            <Modal show={show} size="lg" onHide={handleClose} animation={false} backdrop="static" scrollable={true}>
                <Modal.Header>
                    <Modal.Title>
                        {"Connect to Zatca"}
                    </Modal.Title>

                    <div className="col align-self-end text-end">
                        <button
                            type="button"
                            className="btn-close"
                            onClick={handleClose}
                            aria-label="Close"
                        ></button>
                    </div>
                </Modal.Header>
                <Modal.Body>
                    <form className="row g-3 needs-validation" onSubmit={handleConnect}>


                        <div className="col-md-6">
                            <label className="form-label">OTP from Zatca*</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.otp ? formData.otp : ""}
                                    type='string'
                                    onChange={(e) => {
                                        errors["code"] = "";
                                        setErrors({ ...errors });
                                        formData.otp = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="otp"
                                    placeholder="OTP"
                                />



                                <Button variant="primary" style={{ marginLeft: "8px" }} onClick={handleConnect} >
                                    {isProcessing ? <Spinner
                                        as="span"
                                        animation="border"
                                        size="sm"
                                        role="status"
                                        aria-hidden={true}
                                    /> : "Connect"}
                                </Button>

                            </div>

                            {errors.otp && (
                                <div style={{ color: "red" }}>
                                    {errors.otp}
                                </div>
                            )}
                            {formData.otp && !errors.otp && (
                                <div style={{ color: "green" }}>
                                    <i className="bi bi-check-lg"> </i>
                                    Looks good!
                                </div>
                            )}
                        </div>


                        <Modal.Footer>
                            <Button variant="secondary" onClick={handleClose}>
                                Close
                            </Button>
                        </Modal.Footer>
                    </form>
                </Modal.Body>

            </Modal>


        </>
    );
});

export default ZatcaConnect;
