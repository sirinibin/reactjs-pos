import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { Modal, Button } from "react-bootstrap";
import Cookies from "universal-cookie";
import { Spinner } from "react-bootstrap";
import SalesCashDiscountView from "./view.js";
import { Typeahead } from "react-bootstrap-typeahead";


const SalesCashDiscountCreate = forwardRef((props, ref) => {

    useImperativeHandle(ref, () => ({
        open(id, order) {
            order = order;
            setOrder({ ...order });
            formData = {};
            if (order) {
                formData.order_id = order.id;
                formData.order_code = order.code;
                formData.store_id = order.store_id;

            }
            setFormData(formData);
            selectedParentCategories = [];
            setSelectedParentCategories(selectedParentCategories);

            if (id) {
                getSalesCashDiscount(id);
            }
            SetShow(true);
        },

    }));

    let [order, setOrder] = useState({});

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
    const cookies = new Cookies();

    const [parentCategoryOptions, setParentCategoryOptions] = useState([]);
    let [selectedParentCategories, setSelectedParentCategories] = useState([]);
    const [isProductCategoriesLoading, setIsProductCategoriesLoading] = useState(false);

    //fields
    let [formData, setFormData] = useState({});

    const [show, SetShow] = useState(false);

    function handleClose() {
        SetShow(false);
    }

    useEffect(() => {
        let at = cookies.get("access_token");
        if (!at) {
            window.location = "/";
        }
    });


    function getSalesCashDiscount(id) {
        console.log("inside get Product Category");
        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': cookies.get('access_token'),
            },
        };
        formData = {};
        setFormData({ ...formData });
        selectedParentCategories = [];
        setSelectedParentCategories([...selectedParentCategories]);
        fetch('/v1/sales/cash-discount/' + id, requestOptions)
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


                if (formData.parent_id) {
                    selectedParentCategories = [
                        {
                            id: formData.parent_id,
                            name: formData.parent_name,
                        },
                    ];
                    setSelectedParentCategories([...selectedParentCategories]);

                }

                setFormData({ ...formData });
                console.log("formData:", formData);

            })
            .catch(error => {
                setProcessing(false);
                setErrors(error);
            });
    }

    function ObjectToSearchQueryParams(object) {
        return Object.keys(object)
            .map(function (key) {
                return `search[${key}]=${object[key]}`;
            })
            .join("&");
    }

    function handleCreate(event) {
        event.preventDefault();
        console.log("Inside handle Create");


        console.log("formData.logo:", formData.logo);

        setIsProductCategoriesLoading(true);

        let endPoint = "/v1/sales/cash-discount";
        let method = "POST";
        if (formData.id) {
            endPoint = "/v1/sales/cash-discount/" + formData.id;
            method = "PUT";
        }

        if (formData.amount <= 0) {
            errors["amount"] = "Amount should be > 0:";
            setErrors({ ...errors });
            return;
        }


        if (formData.amount >= order.total) {
            errors["amount"] = "Amount should be less than total amount:" + order.total;
            setErrors({ ...errors });
            return;
        }

        const requestOptions = {
            method: method,
            headers: {
                'Accept': 'application/json',
                "Content-Type": "application/json",
                Authorization: cookies.get("access_token"),
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
                setIsProductCategoriesLoading(false);

                console.log("Response:");
                console.log(data);
                props.showToastMessage("Product Category Created Successfully!", "success");
                if (props.refreshList) {
                    props.refreshList();
                }
                handleClose();
                props.openDetailsView(data.result.id);
            })
            .catch((error) => {
                setProcessing(false);
                setIsProductCategoriesLoading(false);
                console.log("Inside catch");
                console.log(error);
                setErrors({ ...error });
                console.error("There was an error!", error);
                props.showToastMessage("Error Creating SalesCashDiscount!", "danger");
            });
    }

    async function suggestCategories(searchTerm) {
        console.log("Inside handle suggest Categories");
        setParentCategoryOptions([]);

        console.log("searchTerm:" + searchTerm);
        if (!searchTerm) {
            return;
        }

        var params = {
            name: searchTerm,
        };
        var queryString = ObjectToSearchQueryParams(params);
        if (queryString !== "") {
            queryString = "&" + queryString;
        }

        const requestOptions = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: cookies.get("access_token"),
            },
        };

        let Select = "select=id,name";
        setIsProductCategoriesLoading(true);
        let result = await fetch(
            "/v1/sales/cash-discount?" + Select + queryString,
            requestOptions
        );
        let data = await result.json();

        setParentCategoryOptions(data.result);
        setIsProductCategoriesLoading(false);
    }



    return (
        <>
            <Modal show={show} size="lg" onHide={handleClose} animation={false} backdrop="static" scrollable={true}>
                <Modal.Header>
                    <Modal.Title>
                        {formData.id ? "Update Cash Discount for sales order#" + formData.order_code : "Add Cash Discount for sales order #" + formData.order_code}
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
                                /> + " Creating..."

                                : ""
                            }
                            {formData.id ? "Update" : "Create"}

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

                        <div className="col-md-6">
                            <label className="form-label">Amount*</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.amount ? formData.amount : ""}
                                    type='number'
                                    onChange={(e) => {
                                        console.log("Inside onchange vat discount");
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

                                        console.log("order.total:", order.total);
                                        if (formData.amount >= order.total) {
                                            errors["amount"] = "Amount should be less than total amount:" + order.total;
                                            setErrors({ ...errors });
                                            return;
                                        }
                                        setErrors({ ...errors });
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="name"
                                    placeholder="Name"
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
                        <Modal.Footer>
                            <Button variant="secondary" onClick={handleClose}>
                                Close
                            </Button>
                            <Button variant="primary" onClick={handleCreate} >
                                {isProcessing ?
                                    <Spinner
                                        as="span"
                                        animation="bsalescashdiscount"
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

export default SalesCashDiscountCreate;
