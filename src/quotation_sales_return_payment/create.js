import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { Modal, Button } from "react-bootstrap";

import { Spinner } from "react-bootstrap";
import DatePicker from "react-datepicker";
import { format } from "date-fns";


const QuotationSalesReturnPaymentCreate = forwardRef((props, ref) => {

    useImperativeHandle(ref, () => ({
        open(id, quotationsalesreturn) {
            setQuotationSalesReturn({ ...quotationsalesreturn });
            formData = {
                method: "",
            };

            formData.date_str = new Date();

            if (quotationsalesreturn) {
                formData.quotation_sales_return_id = quotationsalesreturn.id;
                formData.quotation_sales_return_code = quotationsalesreturn.code;

                formData.quotation_id = quotationsalesreturn.quotation_id;
                formData.quotation_code = quotationsalesreturn.quotation_code;

                formData.store_id = quotationsalesreturn.store_id;
            }

            setFormData(formData);
            selectedParentCategories = [];
            setSelectedParentCategories(selectedParentCategories);

            if (id) {
                getQuotationSalesReturnPayment(id);
            }
            errors = {};
            setErrors({ ...errors });
            SetShow(true);
        },

    }));

    let [quotationsalesreturn, setQuotationSalesReturn] = useState({});

    useEffect(() => {
        const listener = event => {
            if (event.code === "Enter" || event.code === "NumpadEnter") {
                console.log("Enter key was pressed. Run your function-product category.");
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


    let [selectedParentCategories, setSelectedParentCategories] = useState([]);

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

    function ObjectToSearchQueryParams(object) {
        return Object.keys(object)
            .map(function (key) {
                return `search[${key}]=${object[key]}`;
            })
            .join("&");
    }


    function getQuotationSalesReturnPayment(id) {
        console.log("inside get Product Category");
        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': localStorage.getItem('access_token'),
            },
        };
        formData = {};
        setFormData({ ...formData });
        selectedParentCategories = [];
        setSelectedParentCategories([...selectedParentCategories]);

        let searchParams = {};
        if (localStorage.getItem("store_id")) {
            searchParams.store_id = localStorage.getItem("store_id");
        }
        let queryParams = ObjectToSearchQueryParams(searchParams);

        fetch('/v1/quotation-sales-return-payment/' + id + "?" + queryParams, requestOptions)
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

                formData = data.result;
                formData.date_str = data.result.date;
                console.log("formData:", formData);

                /*
                formData.quotationsales_return_id = quotationsalesreturn.id;
                formData.quotationsales_return_code = quotationsalesreturn.code;

                formData.order_id = quotationsalesreturn.order_id;
                formData.order_code = quotationsalesreturn.order_code;

                formData.store_id = quotationsalesreturn.store_id;
                 */

                setFormData({ ...formData });
                console.log("formData:", formData);

            })
            .catch(error => {
                setProcessing(false);
                setErrors(error);
            });
    }


    function handleCreate(event) {
        event.preventDefault();
        console.log("Inside handle Create");


        let endPoint = "/v1/quotation-sales-return-payment";
        let method = "POST";
        if (formData.id) {
            endPoint = "/v1/quotation-sales-return-payment/" + formData.id;
            method = "PUT";
        }

        if (formData.amount <= 0) {
            errors["amount"] = "Amount should be > 0:";
            setErrors({ ...errors });
            return;
        }


        /*
        if (formData.amount > quotationsalesreturn.net_total) {
            errors["amount"] = "Amount should be less than or equal to net total amount:" + quotationsalesreturn.net_total;
            setErrors({ ...errors });
            return;
        }
        */

        formData.quotation_id = quotationsalesreturn.quotation_id;
        formData.quotation_code = quotationsalesreturn.quotation_code;

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
                if (formData.id) {
                    if (props.showToastMessage) props.showToastMessage("Payment updated successfully!", "success");
                } else {
                    if (props.showToastMessage) props.showToastMessage("Payment created successfully!", "success");
                }
                if (props.refreshList) {
                    props.refreshList();
                }
                handleClose();
                if (props.refreshQuotationSalesReturnList) {
                    props.refreshQuotationSalesReturnList();
                }
                //if(props.openDetailsView)
                props.openDetailsView(data.result.id);
            })
            .catch((error) => {
                setProcessing(false);
                console.log("Inside catch");
                console.log(error);
                setErrors({ ...error });
                console.error("There was an error!", error);
                if (props.showToastMessage) props.showToastMessage("Failed to process payment!", "danger");
            });
    }



    return (
        <>
            <Modal show={show} size="lg" onHide={handleClose} animation={false} backdrop="static" scrollable={true}>
                <Modal.Header>
                    <Modal.Title>
                        {formData.id ? "Update Payment of quotation sales return #" + formData.quotation_sales_return_code : "Add Payment of quotation sales return  #" + formData.quotation_sales_return_code}
                    </Modal.Title>

                    <div className="col align-self-end text-end">
                        {formData.id ? <Button variant="primary" onClick={() => {
                            handleClose();
                            if (props.openDetailsView)
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
                    </div>
                </Modal.Header>
                <Modal.Body>
                    <form className="row g-3 needs-validation" onSubmit={handleCreate}>

                        <div className="col-md-3">
                            <label className="form-label">Amount*</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.amount ? formData.amount : ""}
                                    type='number'
                                    onChange={(e) => {
                                        console.log("Inside onchange vat ");
                                        if (!e.target.value) {
                                            formData.amount = e.target.value;
                                            errors["amount"] = "Invalid amount";
                                            setErrors({ ...errors });
                                            return;
                                        }

                                        if (parseFloat(e.target.value) <= 0) {
                                            formData.amount = e.target.value;
                                            errors["amount"] = "Amount should be > 0";
                                            setErrors({ ...errors });
                                            return;
                                        }


                                        formData.amount = parseFloat(e.target.value);
                                        errors["amount"] = "";

                                        /*
                                        if (formData.amount > quotationsalesreturn.net_total) {
                                            errors["amount"] = "Amount should be less than or equal to net total amount:" + quotationsalesreturn.net_total;
                                            setErrors({ ...errors });
                                            return;
                                        }
                                        */
                                        setErrors({ ...errors });
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="name"
                                    placeholder="Amount"
                                />
                            </div>
                            {errors.amount && (
                                <div style={{ color: "red" }}>
                                    {errors.amount}
                                </div>
                            )}
                            {formData.amount && !errors.amount && (
                                <div style={{ color: "green" }}>
                                    <i className="bi bi-check-lg"> </i>
                                    Looks good!
                                </div>
                            )}
                        </div>

                        <div className="col-md-6">
                            <label className="form-label">Date*</label>

                            <div className="input-group mb-3">
                                <DatePicker
                                    id="date_str"
                                    selected={formData.date_str ? new Date(formData.date_str) : null}
                                    value={formData.date_str ? format(
                                        new Date(formData.date_str),
                                        "MMMM d, yyyy h:mm aa"
                                    ) : null}
                                    className="form-control"
                                    dateFormat="MMMM d, yyyy h:mm aa"
                                    showTimeSelect
                                    timeIntervals="1"
                                    onChange={(value) => {
                                        console.log("Value", value);
                                        formData.date_str = value;
                                        // formData.date_str = format(new Date(value), "MMMM d yyyy h:mm aa");
                                        setFormData({ ...formData });
                                    }}
                                />

                                {errors.date_str && (
                                    <div style={{ color: "red" }}>
                                        <i className="bi bi-x-lg"> </i>
                                        {errors.date_str}
                                    </div>
                                )}
                            </div>

                        </div>


                        <div className="row">
                            <div className="col-md-3">
                                <label className="form-label">Payment method*</label>

                                <div className="input-group mb-3" >
                                    <select
                                        value={formData.method}
                                        onChange={(e) => {
                                            console.log("Inside onchange payment method");
                                            if (!e.target.value) {
                                                errors["method"] = "Invalid Payment Method";
                                                formData.method = "";
                                                setFormData({ ...formData });
                                                setErrors({ ...errors });
                                                return;
                                            }

                                            errors["method"] = "";
                                            setErrors({ ...errors });

                                            formData.method = e.target.value;
                                            setFormData({ ...formData });
                                            console.log(formData);
                                        }}
                                        className="form-control"
                                    >
                                        <option value="">Select</option>
                                        <option value="cash">Cash</option>
                                        <option value="debit_card">Debit Card</option>
                                        <option value="credit_card">Credit Card</option>
                                        <option value="bank_card">Bank Card</option>
                                        <option value="bank_transfer">Bank Transfer</option>
                                        <option value="bank_cheque">Cheque</option>
                                        <option value="customer_account">Customer Account</option>
                                    </select>
                                    {errors.method && (
                                        <div style={{ color: "red" }}>
                                            {errors.method}
                                        </div>
                                    )}
                                    {formData.method && !errors.method && (
                                        <div style={{ color: "green" }}>
                                            <i className="bi bi-check-lg"> </i>
                                            Looks good!
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="row  g-5">
                            <div className="col-md-3">
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
                                        animation="border"
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

            </Modal>


        </>
    );
});

export default QuotationSalesReturnPaymentCreate;
