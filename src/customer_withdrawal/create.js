import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { Modal, Button } from "react-bootstrap";

import { Spinner } from "react-bootstrap";
import { Typeahead } from "react-bootstrap-typeahead";
import DatePicker from "react-datepicker";
import { format } from "date-fns";
import CustomerCreate from "./../customer/create.js";
import CustomerView from "./../customer/view.js";
import Customers from "./../utils/customers.js";
import SalesReturn from "./../utils/salesReturn.js";
import CustomerWithdrawalPreview from './preview.js';
import { trimTo2Decimals } from "../utils/numberUtils";
import SalesReturnCreate from "./../sales_return/create.js";
import { confirm } from 'react-bootstrap-confirmation';
import InfoDialog from './../utils/InfoDialog';

const CustomerWithdrawalCreate = forwardRef((props, ref) => {
    useImperativeHandle(ref, () => ({
        open(id) {
            formData = {
                images_content: [],
                date_str: new Date(),
            };
            setFormData({ ...formData });
            setSelectedCustomers([]);

            if (id) {
                getCustomerWithdrawal(id);
            }

            SetShow(true);
        },

    }));

    useEffect(() => {
        const listener = event => {
            if (event.code === "Enter" || event.code === "NumpadEnter") {
                console.log("Enter key was pressed. Run your function-customerwithdrawal.");
                // event.preventDefault();

                var form = event.target.form;
                if (form && event.target) {
                    var index = Array.prototype.indexOf.call(form, event.target);
                    if (form && form.elements[index + 1]) {
                        if (event.target.getAttribute("class").includes("description")) {
                            form.elements[index].focus();
                            form.elements[index].value += '\r\n';
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
    let [formData, setFormData] = useState({
        images_content: [],
        date_str: new Date(),
        payments: [],
    });

    const [show, SetShow] = useState(false);

    function handleClose() {
        SetShow(false);
    }


    function getCustomerWithdrawal(id) {
        console.log("inside get CustomerWithdrawal");
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

        fetch('/v1/customer-withdrawal/' + id + "?" + queryParams, requestOptions)
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


                if (data.result?.payments) {
                    formData.payments = data.result.payments;
                    for (var i = 0; i < formData.payments?.length; i++) {
                        formData.payments[i].date_str = formData.payments[i].date
                    }
                }
                findTotalPayments();

                if (formData.customer_name && formData.customer_id) {
                    let selectedCustomers = [
                        {
                            id: formData.customer_id,
                            name: formData.customer_name,
                            search_label: formData.customer.search_label,
                        }
                    ];
                    setSelectedCustomers([...selectedCustomers]);
                }

                formData.images_content = [];
                setFormData({ ...formData });
            })
            .catch(error => {
                setProcessing(false);
                setErrors(error);
            });
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

    //Customer Auto Suggestion
    const [customerOptions, setCustomerOptions] = useState([]);
    const [selectedCustomers, setSelectedCustomers] = useState([]);
    const [isCustomersLoading, setIsCustomersLoading] = useState(false);

    async function suggestCustomers(searchTerm) {
        console.log("Inside handle suggestCustomers");
        setCustomerOptions([]);

        console.log("searchTerm:" + searchTerm);
        if (!searchTerm) {
            return;
        }

        var params = {
            query: searchTerm,
        };

        if (localStorage.getItem("store_id")) {
            params.store_id = localStorage.getItem("store_id");
        }

        var queryString = ObjectToSearchQueryParams(params);
        if (queryString !== "") {
            queryString = "&" + queryString;
        }

        const requestOptions = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: localStorage.getItem("access_token"),
            },
        };

        let Select = "select=id,code,vat_no,name,phone,name_in_arabic,phone_in_arabic,search_label";
        setIsCustomersLoading(true);
        let result = await fetch(
            "/v1/customer?" + Select + queryString,
            requestOptions
        );
        let data = await result.json();

        setCustomerOptions(data.result);
        setIsCustomersLoading(false);
    }

    function handleCreate(event) {
        event.preventDefault();
        console.log("Inside handle Create");
        if (!validatePaymentAmounts()) {
            return;
        }


        console.log("category_id:", formData.category_id);

        if (localStorage.getItem("store_id")) {
            formData.store_id = localStorage.getItem("store_id");
        }


        let endPoint = "/v1/customer-withdrawal";
        let method = "POST";
        if (formData.id) {
            endPoint = "/v1/customer-withdrawal/" + formData.id;
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
                if (props.showToastMessage) props.showToastMessage("Created Successfully!", "success");
                if (props.refreshList) {
                    props.refreshList();
                }

                handleClose();
                if (props.openDetailsView)
                    props.openDetailsView(data.result.id);
            })
            .catch((error) => {
                setProcessing(false);
                setErrors({ ...error });
                console.error("There was an error!", error);
                if (props.showToastMessage) props.showToastMessage("Error Creating!", "danger");
            });
    }


    function addNewPayment() {
        let date = new Date();
        if (!formData.id) {
            date = formData.date_str;
        }

        if (!formData.payments) {
            formData.payments = [];
        }

        formData.payments.push({
            "date_str": date,
            // "amount": "",
            "amount": 0.00,
            "method": "",
            "deleted": false,
        });
        setFormData({ ...formData });
        findTotalPayments();
    }


    function validatePaymentAmounts() {
        errors = {};
        setErrors({ ...errors });

        let haveErrors = false;

        if (!formData.payments || formData.payments?.length === 0) {
            errors["payments"] = "At lease one payment is required";
            setErrors({ ...errors });
            haveErrors = true;
        }

        for (var key = 0; key < formData.payments?.length; key++) {
            errors["customer_payable_payment_amount_" + key] = "";
            errors["customer_payable_payment_date_" + key] = "";
            errors["customer_payable_payment_method_" + key] = "";
            setErrors({ ...errors });

            if (!formData.payments[key].amount) {
                errors["customer_payable_payment_amount_" + key] = "Payment amount is required";
                setErrors({ ...errors });
                haveErrors = true;
            } else if (formData.payments[key].amount <= 0) {
                errors["customer_payable_payment_amount_" + key] = "Amount should be greater than zero";
                setErrors({ ...errors });
                haveErrors = true;
            }

            if (!formData.payments[key].date_str) {
                errors["customer_payable_payment_date_" + key] = "Payment date is required";
                setErrors({ ...errors });
                haveErrors = true;
            }

            if (!formData.payments[key].method) {
                errors["customer_payable_payment_method_" + key] = "Payment method is required";
                setErrors({ ...errors });
                haveErrors = true;
            }
        }

        if (haveErrors) {
            return false;
        }

        return true;
    }

    let [totalPaymentAmount, setTotalPaymentAmount] = useState(0.00);

    function findTotalPayments() {
        console.log("Inisde findTotalPayments")
        let totalPayment = 0.00;
        for (var i = 0; i < formData.payments?.length; i++) {
            if (formData.payments[i].amount && !formData.payments[i].deleted) {
                totalPayment += formData.payments[i].amount;
            }
        }

        totalPaymentAmount = totalPayment;
        setTotalPaymentAmount(totalPaymentAmount);
        return totalPayment;
    }

    function removePayment(key) {
        formData.payments.splice(key, 1);
        setFormData({ ...formData });
        findTotalPayments()
    }


    const CustomerCreateFormRef = useRef();
    function openCustomerCreateForm() {
        CustomerCreateFormRef.current.open();
    }

    const CustomerDetailsViewRef = useRef();
    function openCustomerDetailsView(id) {
        CustomerDetailsViewRef.current.open(id);
    }

    const CustomersRef = useRef();
    function openCustomers(model) {
        CustomersRef.current.open();
    }

    const handleSelectedCustomer = (selectedCustomer) => {
        console.log("selectedCustomer:", selectedCustomer);
        setSelectedCustomers([selectedCustomer])
        formData.customer_id = selectedCustomer.id;
        setFormData({ ...formData });
    };

    const SalesReturnRef = useRef();
    function openSalesReturn(paymentIndex) {
        if (!formData.customer_id) {
            infoMessage = "Please select a customer first then try again!";
            setInfoMessage(infoMessage);
            showInfo = true;
            setShowInfo(showInfo);
            return;
        }

        selectedPaymentIndex = paymentIndex;
        setSelectedPaymentIndex(selectedPaymentIndex);
        let selectedPaymentStatusList = [
            {
                id: "not_paid",
                name: "Not Paid",
            },
            {
                id: "paid_partially",
                name: "Paid partially",
            }
        ];
        SalesReturnRef.current.open(selectedCustomers, selectedPaymentStatusList);
    }

    let [selectedPaymentIndex, setSelectedPaymentIndex] = useState(null);
    let [showInfo, setShowInfo] = useState(false);
    let [infoMessage, setInfoMessage] = useState("");

    const handleSelectedSalesReturn = (selectedSalesReturn) => {
        if (formData.customer_id !== selectedSalesReturn.customer_id) {
            infoMessage = "The selected Sales Return is not belongs to the customer " + selectedCustomers[0]?.name;
            setInfoMessage(infoMessage);
            showInfo = true;
            setShowInfo(showInfo);
            return;
        }

        console.log("selectedSalesReturn:", selectedSalesReturn);
        if (selectedSalesReturn.payment_status === "paid") {
            infoMessage = "The selected invoice is already paid";
            setInfoMessage(infoMessage);
            showInfo = true;
            setShowInfo(showInfo);
            return;
        }
        // setSelectedCustomers([selectedCustomer])
        formData.payments[selectedPaymentIndex].invoice_type = "sales_return";
        formData.payments[selectedPaymentIndex].invoice_id = selectedSalesReturn.id;
        formData.payments[selectedPaymentIndex].invoice_code = selectedSalesReturn.code;
        formData.payments[selectedPaymentIndex].amount = selectedSalesReturn.balance_amount;
        findTotalPayments();
        setFormData({ ...formData });
    };



    const confirmInvoiceRemoval = async (paymentIndex) => {
        const result = await confirm('Are you sure, you want to remove this invoice from this payment?');
        console.log(result);
        if (result) {
            formData.payments[paymentIndex].invoice_type = "";
            formData.payments[paymentIndex].invoice_id = "";
            formData.payments[paymentIndex].invoice_code = "";
            setFormData({ ...formData });
        }
    };



    const PreviewRef = useRef();
    function openPreview() {
        if (!formData.date) {
            formData.date = formData.date_str;
        }
        PreviewRef.current.open(formData, undefined, "customer_withdrawal");
    }

    const SalesReturnUpdateFormRef = useRef();
    function openSalesReturnUpdateForm(id) {
        SalesReturnUpdateFormRef.current.open(id);
    }

    const inputRefs = useRef({});
    const timerRef = useRef(null);

    return (
        <>
            <InfoDialog
                show={showInfo}
                message={infoMessage}
                onClose={() => setShowInfo(false)}
            />
            <SalesReturnCreate ref={SalesReturnUpdateFormRef} />
            <CustomerWithdrawalPreview ref={PreviewRef} />
            <Customers ref={CustomersRef} onSelectCustomer={handleSelectedCustomer} showToastMessage={props.showToastMessage} />
            <SalesReturn ref={SalesReturnRef} onSelectSalesReturn={handleSelectedSalesReturn} showToastMessage={props.showToastMessage} />
            <CustomerCreate ref={CustomerCreateFormRef} openDetailsView={openCustomerDetailsView} showToastMessage={props.showToastMessage} />
            <CustomerView ref={CustomerDetailsViewRef} showToastMessage={props.showToastMessage} />
            <Modal show={show} size="xl" onHide={handleClose} animation={false} backdrop="static" scrollable={true}>
                <Modal.Header>
                    <Modal.Title>
                        {formData.id ? "Update Customer Payable #" + formData.code : "Create New Customer Payable"}
                    </Modal.Title>


                    <div className="col align-self-end text-end">
                        &nbsp;&nbsp;
                        <Button variant="primary" onClick={openPreview}>
                            <i className="bi bi-printer"></i> Print
                        </Button>
                        &nbsp;&nbsp;

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
                        <div className="col-md-6" style={{ border: "solid 0px" }}>
                            <label className="form-label">Customer*</label>
                            <Typeahead
                                id="customer_id"
                                labelKey="search_label"
                                isLoading={isCustomersLoading}
                                filterBy={() => true}
                                isInvalid={errors.customer_id ? true : false}
                                onChange={(selectedItems) => {
                                    errors.customer_id = "";
                                    setErrors(errors);
                                    if (selectedItems.length === 0) {
                                        // errors.customer_id = "Invalid Customer selected";
                                        //setErrors(errors);
                                        formData.customer_id = "";
                                        setFormData({ ...formData });
                                        setSelectedCustomers([]);
                                        return;
                                    }
                                    formData.customer_id = selectedItems[0].id;
                                    if (selectedItems[0].use_remarks_in_salesreturn && selectedItems[0].remarks) {
                                        formData.remarks = selectedItems[0].remarks;
                                    }

                                    setFormData({ ...formData });
                                    setSelectedCustomers(selectedItems);
                                }}
                                options={customerOptions}
                                placeholder="Customer Name / Mob / VAT # / ID"
                                selected={selectedCustomers}
                                highlightOnlyResult={true}
                                onInputChange={(searchTerm, e) => {
                                    if (searchTerm) {
                                        formData.customerName = searchTerm;
                                    }
                                    suggestCustomers(searchTerm);
                                }}
                            />
                            <Button hide={true.toString()} onClick={openCustomerCreateForm} className="btn btn-outline-secondary btn-primary btn-sm" type="button" id="button-addon1"> <i className="bi bi-plus-lg"></i> New</Button>


                            {errors.customer_id && (
                                <div style={{ color: "red" }}>
                                    {errors.customer_id}
                                </div>
                            )}

                        </div>
                        <div className="col-md-1">
                            <Button className="btn btn-primary" style={{ marginTop: "30px" }} onClick={openCustomers}>
                                <i className="bi bi-list"></i>
                            </Button>
                        </div>

                        <div className="col-md-3">
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
                                        {errors.date_str}
                                    </div>
                                )}
                            </div>
                        </div>


                        <div className="col-md-12">
                            <label className="form-label">Payments</label>
                            {errors.payments && (
                                <div style={{ color: "red" }}>
                                    {errors.payments}
                                </div>
                            )}

                            <div className="table-responsive" style={{}}>
                                <Button variant="secondary" style={{ alignContent: "right", marginBottom: "10px" }} onClick={addNewPayment}>
                                    Create new payment
                                </Button>
                                <table className="table table-striped table-sm table-bordered">
                                    {formData.payments && formData.payments.length > 0 &&
                                        <thead style={{ textAlign: "center" }}>
                                            <th style={{ minWidth: "190px" }}>
                                                Date
                                            </th>
                                            <th style={{ minWidth: "130px" }}>
                                                Amount
                                            </th>
                                            <th style={{ minWidth: "180px" }}>
                                                Invoice
                                            </th>
                                            <th style={{ minWidth: "130px" }}>
                                                Payment method
                                            </th>
                                            <th style={{ minWidth: "140px" }}>
                                                Bank Reference #
                                            </th>
                                            <th style={{ minWidth: "140px" }} >
                                                Description
                                            </th>
                                            <th style={{ minWidth: "100px" }}>
                                                Action
                                            </th>
                                        </thead>}
                                    <tbody>
                                        {formData.payments &&
                                            formData.payments.filter(payment => !payment.deleted).map((payment, key) => (
                                                <tr key={key}>
                                                    <td>
                                                        <DatePicker
                                                            id="payment_date_str"
                                                            selected={formData.payments[key].date_str ? new Date(formData.payments[key].date_str) : null}
                                                            value={formData.payments[key].date_str ? format(
                                                                new Date(formData.payments[key].date_str),
                                                                "MMMM d, yyyy h:mm aa"
                                                            ) : null}
                                                            className="form-control"
                                                            dateFormat="MMMM d, yyyy h:mm aa"
                                                            showTimeSelect
                                                            timeIntervals="1"
                                                            onChange={(value) => {
                                                                console.log("Value", value);
                                                                formData.payments[key].date_str = value;
                                                                setFormData({ ...formData });
                                                            }}
                                                        />
                                                        {errors["customer_payable_payment_date_" + key] && (
                                                            <div style={{ color: "red" }}>

                                                                {errors["customer_payable_payment_date_" + key]}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td >
                                                        <input type='number' id={`${"customer_payable_payment_amount_" + key}`} name={`${"customer_payable_payment_amount_" + key}`} value={formData.payments[key].amount} className="form-control "
                                                            ref={(el) => {
                                                                if (!inputRefs.current[key]) inputRefs.current[key] = {};
                                                                inputRefs.current[key][`${"customer_payable_payment_amount_" + key}`] = el;
                                                            }}
                                                            onFocus={() => {
                                                                if (timerRef.current) clearTimeout(timerRef.current);
                                                                timerRef.current = setTimeout(() => {
                                                                    inputRefs.current[key][`${"customer_payable_payment_amount_" + key}`].select();
                                                                }, 100);
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (e.key === "ArrowLeft") {
                                                                    timerRef.current = setTimeout(() => {
                                                                        if (key > 0) {
                                                                            inputRefs.current[key - 1][`${"customer_payable_description_" + (key - 1)}`]?.focus();
                                                                        }
                                                                    }, 100);
                                                                } else if (e.key === "Enter") {
                                                                    timerRef.current = setTimeout(() => {
                                                                        inputRefs.current[key][`${"customer_payable_payment_method_" + key}`].focus();
                                                                    }, 100);
                                                                }
                                                            }}

                                                            onChange={(e) => {
                                                                errors["customer_payable_payment_amount_" + key] = "";
                                                                setErrors({ ...errors });

                                                                if (!e.target.value) {
                                                                    formData.payments[key].amount = e.target.value;
                                                                    setFormData({ ...formData });
                                                                    findTotalPayments();
                                                                    //  validatePaymentAmounts();
                                                                    return;
                                                                }

                                                                formData.payments[key].amount = parseFloat(e.target.value);

                                                                // validatePaymentAmounts();
                                                                findTotalPayments();
                                                                setFormData({ ...formData });
                                                                console.log(formData);
                                                            }}
                                                        />
                                                        {errors["customer_payable_payment_amount_" + key] && (
                                                            <div style={{ color: "red", fontSize: "10px" }}>

                                                                {errors["customer_payable_payment_amount_" + key]}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <div className="row" style={{ border: "solid 0px" }}>
                                                            <div className="" style={{ border: "solid 0px", maxWidth: "140px", fontSize: "12px" }}>
                                                                <span style={{ cursor: "pointer", color: "blue" }} onClick={() => {
                                                                    openSalesReturnUpdateForm(formData.payments[key].invoice_id);
                                                                }}>{formData.payments[key].invoice_code}</span>
                                                                {formData.payments[key].invoice_code && <span className="text-danger"
                                                                    style={{ cursor: "pointer", fontSize: "0.75rem", marginLeft: "3px" }}
                                                                    onClick={() => {
                                                                        confirmInvoiceRemoval(key)
                                                                    }}
                                                                >
                                                                    ❌
                                                                </span>}
                                                            </div>
                                                            <div className="" style={{ border: "solid 0px", width: "40px" }}>
                                                                <Button className="btn btn-primary" style={{ marginLeft: "-12px" }} onClick={() => {
                                                                    openSalesReturn(key);
                                                                }}>
                                                                    <i className="bi bi-list"></i>
                                                                </Button>
                                                            </div>
                                                        </div>
                                                        {errors["customer_payable_payment_invoice_" + key] && (
                                                            <div style={{ color: "red" }}>

                                                                {errors["customer_payable_payment_invoice_" + key]}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td >
                                                        <select
                                                            id={`${"customer_payable_payment_method_" + key}`} name={`${"customer_payable_payment_method_" + key}`}
                                                            value={formData.payments[key].method} className="form-control "
                                                            ref={(el) => {
                                                                if (!inputRefs.current[key]) inputRefs.current[key] = {};
                                                                inputRefs.current[key][`${"customer_payable_payment_method_" + key}`] = el;
                                                            }}
                                                            onFocus={() => {
                                                                /*
                                                                if (timerRef.current) clearTimeout(timerRef.current);
                                                                timerRef.current = setTimeout(() => {
                                                                    inputRefs.current[key][`${"customer_payable_payment_method_" + key}`].select();
                                                                }, 100);*/
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (timerRef.current) clearTimeout(timerRef.current);
                                                                if (e.key === "ArrowLeft") {
                                                                    timerRef.current = setTimeout(() => {
                                                                        inputRefs.current[key][`${"customer_payable_payment_amount_" + key}`].focus();
                                                                    }, 100);
                                                                }
                                                            }}
                                                            onChange={(e) => {
                                                                // errors["payment_method"] = [];
                                                                errors["customer_payable_payment_method_" + key] = "";
                                                                setErrors({ ...errors });

                                                                if (!e.target.value) {
                                                                    errors["customer_payable_payment_method_" + key] = "Payment method is required";
                                                                    setErrors({ ...errors });

                                                                    formData.payments[key].method = "";
                                                                    setFormData({ ...formData });
                                                                    return;
                                                                }


                                                                formData.payments[key].method = e.target.value;
                                                                setFormData({ ...formData });
                                                                console.log(formData);
                                                            }}
                                                        >
                                                            <option value="">Select</option>
                                                            <option value="cash">Cash</option>
                                                            <option value="debit_card">Debit Card</option>
                                                            <option value="credit_card">Credit Card</option>
                                                            <option value="bank_card">Bank Card</option>
                                                            <option value="bank_transfer">Bank Transfer</option>
                                                            <option value="bank_cheque">Bank Cheque</option>
                                                        </select>
                                                        {errors["customer_payable_payment_method_" + key] && (
                                                            <div style={{ color: "red" }}>

                                                                {errors["customer_payable_payment_method_" + key]}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td >
                                                        <input type='text' id={`${"customer_payable_bank_reference_" + key}`} name={`${"customer_payable_bank_reference_" + key}`}
                                                            value={formData.payments[key].bank_reference} className="form-control "
                                                            ref={(el) => {
                                                                if (!inputRefs.current[key]) inputRefs.current[key] = {};
                                                                inputRefs.current[key][`${"customer_payable_bank_reference_" + key}`] = el;
                                                            }}
                                                            onFocus={() => {
                                                                if (timerRef.current) clearTimeout(timerRef.current);
                                                                timerRef.current = setTimeout(() => {
                                                                    inputRefs.current[key][`${"customer_payable_bank_reference_" + key}`].select();
                                                                }, 100);
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (timerRef.current) clearTimeout(timerRef.current);
                                                                if (e.key === "ArrowLeft") {
                                                                    timerRef.current = setTimeout(() => {
                                                                        inputRefs.current[key][`${"customer_payable_payment_method_" + key}`].focus();
                                                                    }, 100);
                                                                }
                                                            }}
                                                            onChange={(e) => {
                                                                errors["customer_payable_bank_reference_" + key] = "";
                                                                setErrors({ ...errors });

                                                                if (!e.target.value) {
                                                                    formData.payments[key].bank_reference = e.target.value;
                                                                    setFormData({ ...formData });

                                                                    return;
                                                                }

                                                                formData.payments[key].bank_reference = e.target.value;
                                                                setFormData({ ...formData });
                                                            }}
                                                        />
                                                        {errors["customer_payable_bank_reference_" + key] && (
                                                            <div style={{ color: "red" }}>
                                                                {errors["customer_payable_bank_reference_" + key]}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <input type='text' id={`${"customer_payable_description_" + key}`} name={`${"customer_payable_description_" + key}`}
                                                            value={formData.payments[key].description} className="form-control "
                                                            ref={(el) => {
                                                                if (!inputRefs.current[key]) inputRefs.current[key] = {};
                                                                inputRefs.current[key][`${"customer_payable_description_" + key}`] = el;
                                                            }}
                                                            onFocus={() => {
                                                                if (timerRef.current) clearTimeout(timerRef.current);
                                                                timerRef.current = setTimeout(() => {
                                                                    inputRefs.current[key][`${"customer_payable_description_" + key}`].select();
                                                                }, 100);
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (timerRef.current) clearTimeout(timerRef.current);

                                                                if (e.key === "Enter") {
                                                                    if ((key + 1) < formData.payments?.length && formData.payments?.length > 1) {
                                                                        console.log("Moving to next line");
                                                                        timerRef.current = setTimeout(() => {
                                                                            inputRefs.current[key + 1][`${"customer_payable_payment_amount_" + (key + 1)}`]?.focus();
                                                                        }, 100);
                                                                    } else {
                                                                        if ((key + 1) === formData.payments?.length) {
                                                                            timerRef.current = setTimeout(() => {
                                                                                inputRefs.current[0][`${"customer_payable_payment_amount_0"}`]?.focus();
                                                                            }, 100);
                                                                        } else {
                                                                            timerRef.current = setTimeout(() => {
                                                                                inputRefs.current[key][`${"customer_payable_payment_amount_" + (key)}`]?.focus();
                                                                            }, 100);
                                                                        }

                                                                    }
                                                                } else if (e.key === "ArrowLeft") {
                                                                    timerRef.current = setTimeout(() => {
                                                                        inputRefs.current[key][`${"customer_payable_bank_reference_" + key}`].focus();
                                                                    }, 100);
                                                                }
                                                            }}

                                                            onChange={(e) => {
                                                                errors["customer_payable_description_" + key] = "";
                                                                setErrors({ ...errors });

                                                                if (!e.target.value) {
                                                                    formData.payments[key].description = e.target.value;
                                                                    setFormData({ ...formData });

                                                                    return;
                                                                }

                                                                formData.payments[key].description = e.target.value;
                                                                setFormData({ ...formData });
                                                            }}
                                                        />
                                                        {errors["customer_payable_description_" + key] && (
                                                            <div style={{ color: "red" }}>
                                                                {errors["customer_payable_description_" + key]}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td >
                                                        <Button variant="danger" onClick={(event) => {
                                                            removePayment(key);
                                                        }}>
                                                            Remove
                                                        </Button>

                                                    </td>
                                                </tr>
                                            ))}
                                        <tr>
                                            <td className="text-end">
                                                <b>Net Total</b>
                                            </td>
                                            <td><b style={{ marginLeft: "14px" }}>{trimTo2Decimals(totalPaymentAmount)}</b>
                                                {errors["total_payment"] && (
                                                    <div style={{ color: "red" }}>
                                                        {errors["total_payment"]}
                                                    </div>
                                                )}
                                            </td>
                                            <td colSpan={5}>

                                            </td>

                                        </tr>
                                    </tbody>
                                </table>

                            </div>
                        </div>

                        {/*<div className="col-md-3">
                            <label className="form-label">Amount*</label>

                            <div className="input-group mb-3">
                                <input
                                    id="customer_withdrawal_amount"
                                    name="customer_withdrawal_amount"
                                    value={formData.amount ? formData.amount : ""}
                                    type='number'
                                    onChange={(e) => {
                                        errors["amount"] = "";
                                        setErrors({ ...errors });
                                        formData.amount = parseFloat(e.target.value);
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"

                                    placeholder="Amount"
                                />


                            </div>
                            {errors.amount && (
                                <div style={{ color: "red" }}>
                                    {errors.amount}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Payment method*</label>

                            <div className="input-group mb-3">
                                <select
                                    value={formData.payment_method}
                                    onChange={(e) => {
                                        console.log("Inside onchange payment method");
                                        if (!e.target.value) {
                                            formData.payment_method = "";
                                            errors["status"] = "Invalid Payment Method";
                                            setErrors({ ...errors });
                                            return;
                                        }

                                        errors["payment_method"] = "";
                                        setErrors({ ...errors });

                                        formData.payment_method = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                >
                                    <option value="" SELECTED>Select</option>
                                    <option value="cash">Cash</option>
                                    <option value="debit_card">Debit Card</option>
                                    <option value="credit_card">Credit Card</option>
                                    <option value="bank_card">Bank Card</option>
                                    <option value="bank_transfer">Bank Transfer</option>
                                    <option value="bank_cheque">Bank Cheque</option>
                                </select>

                            </div>
                            {errors.payment_method && (
                                <div style={{ color: "red" }}>

                                    {errors.payment_method}
                                </div>
                            )}
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">Bank Ref. No.</label>
                            <div className="input-group mb-3">
                                <input
                                    id="customer_withdrawal_bank_ref"
                                    name="customer_withdrawal_bank_ref"
                                    value={formData.bank_reference_no ? formData.bank_reference_no : ""}
                                    type='text'
                                    onChange={(e) => {
                                        errors["bank_reference_no"] = "";
                                        setErrors({ ...errors });
                                        formData.bank_reference_no = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"

                                    placeholder="Bank reference no."
                                />
                            </div>
                            {errors.bank_reference_no && (
                                <div style={{ color: "red" }}>
                                    {errors.bank_reference_no}
                                </div>
                            )}
                        </div>
                        <div className="col-md-3">
                            <label className="form-label">Description</label>
                            <div className="input-group mb-3">
                                <textarea
                                    value={formData.description ? formData.description : ""}
                                    type='string'
                                    onChange={(e) => {
                                        errors["description"] = "";
                                        setErrors({ ...errors });
                                        formData.description = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control description"
                                    id="description"
                                    placeholder="Description"
                                />
                                {errors.description && (
                                    <div style={{ color: "red" }}>
                                        {errors.description}
                                    </div>
                                )}
                            </div>
                        </div>*/}
                        <div className="col-md-3">
                            <label className="form-label">Remarks</label>
                            <div className="input-group mb-3">
                                <textarea
                                    value={formData.remarks ? formData.remarks : ""}
                                    type='string'
                                    onChange={(e) => {
                                        errors["remarks"] = "";
                                        setErrors({ ...errors });
                                        formData.remarks = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="remarks"
                                    placeholder="Remarks"
                                />
                            </div>
                            {errors.remarks && (
                                <div style={{ color: "red" }}>
                                    {errors.remarks}
                                </div>
                            )}
                        </div>
                        <Modal.Footer>
                            <Button variant="secondary" onClick={handleClose}>
                                Close
                            </Button>
                            <Button variant="primary" onClick={handleCreate} >
                                {isProcessing ?
                                    <Spinner
                                        as="span"
                                        animation="bcustomerwithdrawal"
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

export default CustomerWithdrawalCreate;
