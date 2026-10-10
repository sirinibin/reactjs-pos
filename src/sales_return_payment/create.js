import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { useTranslation } from "react-i18next";
import { Modal, Button } from "react-bootstrap";

import { Spinner } from "react-bootstrap";
import DatePicker from "react-datepicker";
import { format } from "date-fns";
import { ObjectToSearchQueryParams } from '../utils/queryUtils.js';
import { useEnterKeyNavigation } from '../utils/useEnterKeyNavigation.js';


const SalesReturnPaymentCreate = forwardRef((props, ref) => {

    useImperativeHandle(ref, () => ({
        open(id, salesreturn) {
            setSalesReturn({ ...salesreturn });
            formData = {
                method: "",
            };

            formData.date_str = new Date();

            if (salesreturn) {
                formData.sales_return_id = salesreturn.id;
                formData.sales_return_code = salesreturn.code;

                formData.order_id = salesreturn.order_id;
                formData.order_code = salesreturn.order_code;

                formData.store_id = salesreturn.store_id;
            }

            setFormData(formData);
            selectedParentCategories = [];
            setSelectedParentCategories(selectedParentCategories);

            if (id) {
                getSalesReturnPayment(id);
            }
            errors = {};
            setErrors({ ...errors });
            SetShow(true);
        },

    }));

    let [salesreturn, setSalesReturn] = useState({});

    useEnterKeyNavigation();
    const { t } = useTranslation('common');

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


    function getSalesReturnPayment(id) {
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

        fetch('/v1/sales-return-payment/' + id + "?" + queryParams, requestOptions)
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
                formData.sales_return_id = salesreturn.id;
                formData.sales_return_code = salesreturn.code;

                formData.order_id = salesreturn.order_id;
                formData.order_code = salesreturn.order_code;

                formData.store_id = salesreturn.store_id;
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


        console.log("formData.logo:", formData.logo);

        let endPoint = "/v1/sales-return-payment";
        let method = "POST";
        if (formData.id) {
            endPoint = "/v1/sales-return-payment/" + formData.id;
            method = "PUT";
        }

        if (formData.amount <= 0) {
            errors["amount"] = t("amount_greater_than_zero");
            setErrors({ ...errors });
            return;
        }


        /*
        if (formData.amount > salesreturn.net_total) {
            errors["amount"] = "Amount should be less than or equal to net total amount:" + salesreturn.net_total;
            setErrors({ ...errors });
            return;
        }
        */

        console.log("salesreturn.order_id:", salesreturn.order_id);

        formData.order_id = salesreturn.order_id;
        formData.order_code = salesreturn.order_code;

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
                    if (props.showToastMessage) props.showToastMessage(t("payment_updated_successfully"), "success");
                } else {
                    if (props.showToastMessage) props.showToastMessage(t("payment_created_successfully"), "success");
                }
                if (props.refreshList) {
                    props.refreshList();
                }
                handleClose();
                if (props.refreshSalesReturnList) {
                    props.refreshSalesReturnList();
                }
                // Null-guarded: the host may have no details view (or it is not mounted yet).
                if (props.openDetailsView) props.openDetailsView(data.result.id);
            })
            .catch((error) => {
                setProcessing(false);
                console.log("Inside catch");
                console.log(error);
                setErrors({ ...error });
                console.error("There was an error!", error);
                if (props.showToastMessage) props.showToastMessage(t("failed_to_process_payment"), "danger");
            });
    }



    return (
        <>
            <Modal show={show} size="lg" onHide={handleClose} animation={false} backdrop="static" scrollable={true}>
                <Modal.Header>
                    <Modal.Title>
                        {formData.id ? t('update_payment_of_sales_return') + formData.sales_return_code : t('add_payment_of_sales_return') + formData.sales_return_code}
                    </Modal.Title>

                    <div className="col align-self-end text-end">
                        {formData.id ? <Button variant="primary" onClick={() => {
                            handleClose();
                            if (props.openDetailsView)
                                props.openDetailsView(formData.id);
                        }}>
                            <i className="bi bi-eye"></i> {t('view_detail')}
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
                            {formData.id && !isProcessing ? t('update') : !isProcessing ? t('create') : ""}

                        </Button>
                        <button
                            type="button"
                            className="btn-close"
                            onClick={handleClose}
                            aria-label={t('close')}
                        ></button>
                    </div>
                </Modal.Header>
                <Modal.Body>
                    <form className="row g-3 needs-validation" onSubmit={handleCreate}>

                        <div className="col-md-3">
                            <label className="form-label">{t('amount')}*</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.amount ? formData.amount : ""}
                                    type='number'
                                    onChange={(e) => {
                                        console.log("Inside onchange vat ");
                                        if (!e.target.value) {
                                            formData.amount = e.target.value;
                                            errors["amount"] = t("invalid_amount");
                                            setErrors({ ...errors });
                                            return;
                                        }

                                        if (parseFloat(e.target.value) <= 0) {
                                            formData.amount = e.target.value;
                                            errors["amount"] = t("amount_greater_than_zero");
                                            setErrors({ ...errors });
                                            return;
                                        }


                                        formData.amount = parseFloat(e.target.value);
                                        errors["amount"] = "";

                                        /*
                                        if (formData.amount > salesreturn.net_total) {
                                            errors["amount"] = "Amount should be less than or equal to net total amount:" + salesreturn.net_total;
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
                                    placeholder={t('amount')}
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
                                    {t('looks_good')}
                                </div>
                            )}
                        </div>

                        <div className="col-md-6">
                            <label className="form-label">{t('date')}*</label>

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
                                <label className="form-label">{t('payment_method')}*</label>

                                <div className="input-group mb-3" >
                                    <select
                                        value={formData.method}
                                        onChange={(e) => {
                                            console.log("Inside onchange payment method");
                                            if (!e.target.value) {
                                                errors["method"] = t("invalid_payment_method");
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
                                        <option value="">{t('select')}</option>
                                        <option value="cash">{t('cash')}</option>
                                        <option value="debit_card">{t('debit_card')}</option>
                                        <option value="credit_card">{t('credit_card')}</option>
                                        <option value="bank_card">{t('bank_card')}</option>
                                        <option value="bank_transfer">{t('bank_transfer')}</option>
                                        <option value="bank_cheque">{t('cheque')}</option>
                                        <option value="customer_account">{t('customer_account')}</option>
                                    </select>
                                    {errors.method && (
                                        <div style={{ color: "red" }}>
                                            {errors.method}
                                        </div>
                                    )}
                                    {formData.method && !errors.method && (
                                        <div style={{ color: "green" }}>
                                            <i className="bi bi-check-lg"> </i>
                                            {t('looks_good')}
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
                                {t('close')}
                            </Button>
                            <Button variant="primary" onClick={handleCreate} >
                                {isProcessing ?
                                    <Spinner
                                        as="span"
                                        animation="bsalesreturnpayment"
                                        size="sm"
                                        role="status"
                                        aria-hidden={true}
                                    /> + " " + t('processing')

                                    : formData.id ? t('update') : t('create')
                                }
                            </Button>
                        </Modal.Footer>
                    </form>
                </Modal.Body>

            </Modal>


        </>
    );
});

export default SalesReturnPaymentCreate;
