import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { Modal, Button } from "react-bootstrap";
import Cookies from "universal-cookie";
import { Spinner } from "react-bootstrap";
import ProductView from "./view.js";
import { Typeahead } from "react-bootstrap-typeahead";


const ProductUpdate = forwardRef((props, ref) => {

    useImperativeHandle(ref, () => ({
        open(id) {
            formData = {};
            selectedCategories = [];
            setSelectedCategories(selectedCategories);
            setFormData(formData);

            getProduct(id);
            SetShow(true);
        },

    }));

    let [selectedCategories, setSelectedCategories] = useState([]);
    let [categoryOptions, setCategoryOptions] = useState([]);

    let [errors, setErrors] = useState({});
    const [isProcessing, setProcessing] = useState(false);
    const cookies = new Cookies();

    //fields
    let [formData, setFormData] = useState({});

    const [show, SetShow] = useState(false);

    function handleClose() {
        SetShow(false);
    }


    function getProduct(id) {
        console.log("inside get Product");
        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': cookies.get('access_token'),
            },
        };

        fetch('/v1/product/' + id, requestOptions)
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
                let categoryIds = data.result.category_id;
                let categoryNames = data.result.category_name;

                selectedCategories = [];
                if (categoryIds && categoryNames) {
                    for (var i = 0; i < categoryIds.length; i++) {
                        selectedCategories.push({
                            id: categoryIds[i],
                            name: categoryNames[i],
                        });
                    }
                }

                setSelectedCategories(selectedCategories);

                setFormData({ ...data.result });
            })
            .catch(error => {
                setProcessing(false);
                setErrors(error);
            });
    }


    async function suggestCategories(searchTerm) {
        console.log("Inside handle suggest Categories");

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
        let result = await fetch(
            "/v1/product-category?" + Select + queryString,
            requestOptions
        );
        let data = await result.json();

        setCategoryOptions(data.result);
    }

    useEffect(() => {
        let at = cookies.get("access_token");
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

    function getBase64(file, cb) {
        let reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = function () {
            cb(reader.result);
        };
        reader.onerror = function (error) {
            console.log('Error: ', error);
        };
    }

    function handleUpdate(event) {
        event.preventDefault();
        console.log("Inside handle Update");

        formData.category_id = [];
        for (var i = 0; i < selectedCategories.length; i++) {
            formData.category_id.push(selectedCategories[i].id);
        }

        console.log("category_id:", formData.category_id);

        const requestOptions = {
            method: "PUT",
            headers: {
                'Accept': 'application/json',
                "Content-Type": "application/json",
                Authorization: cookies.get("access_token"),
            },
            body: JSON.stringify(formData),
        };

        console.log("formData:", formData);

        setProcessing(true);
        fetch("/v1/product/" + formData.id, requestOptions)
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
                props.showToastMessage("Product Updated Successfully!", "success");
                props.refreshList();
                handleClose();
                openDetailsView(data.result.id);
            })
            .catch((error) => {
                setProcessing(false);
                console.log("Inside catch");
                console.log(error);
                setErrors({ ...error });
                console.error("There was an error!", error);
                props.showToastMessage("Error Creating Product!", "danger");
            });
    }

    const DetailsViewRef = useRef();
    function openDetailsView(id) {
        console.log("id:", id);
        DetailsViewRef.current.open(id);
    }
    return (
        <>
            <ProductView ref={DetailsViewRef} />
            <Modal show={show} size="lg" onHide={handleClose} animation={false} backdrop={true}>
                <Modal.Header>
                    <Modal.Title>Update New Product</Modal.Title>

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
                    <form className="row g-3 needs-validation" onSubmit={handleUpdate}>

                        <div className="col-md-6">
                            <label className="form-label">Name*</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.name}
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
                                        <i class="bi bi-x-lg"> </i>
                                        {errors.name}
                                    </div>
                                )}
                                {formData.name && !errors.name && (
                                    <div style={{ color: "green" }}>
                                        <i class="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="col-md-6">
                            <label className="form-label">Name In Arabic (Optional)</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.name_in_arabic}
                                    type='string'
                                    onChange={(e) => {
                                        errors["v"] = "";
                                        setErrors({ ...errors });
                                        formData.name_in_arabic = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="name_in_arabic"
                                    placeholder="Name In Arabic"
                                />
                                {errors.name_in_arabic && (
                                    <div style={{ color: "red" }}>
                                        <i class="bi bi-x-lg"> </i>
                                        {errors.name_in_arabic}
                                    </div>
                                )}
                                {formData.name_in_arabic && !errors.name_in_arabic && (
                                    <div style={{ color: "green" }}>
                                        <i class="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="col-md-6">
                            <label className="form-label">Item CODE(Optional)</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.item_code}
                                    type='string'
                                    onChange={(e) => {
                                        errors["phone"] = "";
                                        setErrors({ ...errors });
                                        formData.item_code = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="item_code"
                                    placeholder="Item Code"
                                />
                                {errors.item_code && (
                                    <div style={{ color: "red" }}>
                                        <i class="bi bi-x-lg"> </i>
                                        {errors.item_code}
                                    </div>
                                )}
                                {formData.item_code && !errors.item_code && (
                                    <div style={{ color: "green" }}>
                                        <i class="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>
                        </div>


                        <div className="col-md-6">
                            <label className="form-label">Categories*</label>

                            <div className="input-group mb-3">

                                <Typeahead
                                    id="category_id"
                                    labelKey="name"

                                    isInvalid={errors.category_id ? true : false}
                                    onChange={(selectedItems) => {
                                        errors.category_id = "";
                                        setErrors(errors);
                                        if (selectedItems.length === 0) {
                                            errors.category_id = "Invalid Category selected";
                                            setErrors(errors);
                                            setFormData({ ...formData });
                                            setSelectedCategories([]);
                                            return;
                                        }
                                        setFormData({ ...formData });
                                        setSelectedCategories(selectedItems);
                                    }}
                                    options={categoryOptions}
                                    placeholder="Select Categories"
                                    selected={selectedCategories}
                                    highlightOnlyResult="true"
                                    onInputChange={(searchTerm, e) => {
                                        suggestCategories(searchTerm);
                                    }}
                                    multiple
                                />

                                {errors.category_id && (
                                    <div style={{ color: "red" }}>
                                        <i class="bi bi-x-lg"> </i>
                                        {errors.category_id}
                                    </div>
                                )}
                                {formData.category_id && !errors.category_id && (
                                    <div style={{ color: "green" }}>
                                        <i class="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>
                        </div>

                        <Modal.Footer>
                            <Button variant="secondary" onClick={handleClose}>
                                Close
                            </Button>
                            <Button variant="primary" type="submit" >
                                {isProcessing ?
                                    <Spinner
                                        as="span"
                                        animation="bproduct"
                                        size="sm"
                                        role="status"
                                        aria-hidden="true"
                                    /> + " Creating..."

                                    : "Update"
                                }
                            </Button>
                        </Modal.Footer>
                    </form>
                </Modal.Body>

            </Modal>


        </>
    );
});

export default ProductUpdate;
