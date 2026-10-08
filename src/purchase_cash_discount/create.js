import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { useTranslation } from "react-i18next";
import { Modal, Button } from "react-bootstrap";

import { Spinner } from "react-bootstrap";
import { ObjectToSearchQueryParams } from '../utils/queryUtils.js';
import { useEnterKeyNavigation } from '../utils/useEnterKeyNavigation.js';


const PurchaseCashDiscountCreate = forwardRef((props, ref) => {

    useImperativeHandle(ref, () => ({
        open(id, purchase) {
            setPurchase({ ...purchase });
            formData = {};
            if (purchase) {
                formData.purchase_id = purchase.id;
                formData.purchase_code = purchase.code;
                formData.store_id = purchase.store_id;
            }

            setFormData(formData);
            selectedParentCategories = [];
            setSelectedParentCategories(selectedParentCategories);

            if (id) {
                getPurchaseCashDiscount(id);
            }
            errors = {};
            setErrors({ ...errors });
            SetShow(true);
        },

    }));

    let [purchase, setPurchase] = useState({});

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


    function getPurchaseCashDiscount(id) {
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

        fetch('/v1/purchase-cash-discount/' + id + "?" + queryParams, requestOptions)
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
                console.log("formData:", formData);

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


        let endPoint = "/v1/purchase-cash-discount";
        let method = "POST";
        if (formData.id) {
            endPoint = "/v1/purchase-cash-discount/" + formData.id;
            method = "PUT";
        }

        if (formData.amount <= 0) {
            errors["amount"] = t("amount_greater_than_zero");
            setErrors({ ...errors });
            return;
        }


        if (formData.amount >= purchase.total) {
            errors["amount"] = t("amount_should_be_less_than_total") + purchase.total;
            setErrors({ ...errors });
            return;
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
                if (props.showToastMessage) props.showToastMessage(t("cash_discount_created_successfully"), "success");
                if (props.refreshList) {
                    props.refreshList();
                }
                handleClose();
                if (props.openDetailsView)
                    props.openDetailsView(data.result.id);
            })
            .catch((error) => {
                setProcessing(false);
                console.log("Inside catch");
                console.log(error);
                setErrors({ ...error });
                console.error("There was an error!", error);
                if (props.showToastMessage) props.showToastMessage(t("error_creating_purchase_cash_discount"), "danger");
            });
    }


    return (
        <>
            <Modal show={show} size="lg" onHide={handleClose} animation={false} backdrop="static" scrollable={true}>
                <Modal.Header>
                    <Modal.Title>
                        {formData.id ? t('update_cash_discount_for_purchase') + formData.purchase_code : t('add_cash_discount_for_purchase') + formData.purchase_code}
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

                        <div className="col-md-6">
                            <label className="form-label">{t('amount')}*</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.amount ? formData.amount : ""}
                                    type='number'
                                    onChange={(e) => {
                                        console.log("Inside onchange vat discount");
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

                                        console.log("purchase.total:", purchase.total);
                                        if (formData.amount >= purchase.total) {
                                            errors["amount"] = t("amount_should_be_less_than_total") + purchase.total;
                                            setErrors({ ...errors });
                                            return;
                                        }
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
                        <Modal.Footer>
                            <Button variant="secondary" onClick={handleClose}>
                                {t('close')}
                            </Button>
                            <Button variant="primary" onClick={handleCreate} >
                                {isProcessing ?
                                    <Spinner
                                        as="span"
                                        animation="bpurchasecashdiscount"
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

export default PurchaseCashDiscountCreate;
