import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { Modal, Button } from "react-bootstrap";
import Cookies from "universal-cookie";
import { Spinner } from "react-bootstrap";
import ProductCategoryView from "./view.js";
import { Typeahead } from "react-bootstrap-typeahead";


const ProductCategoryUpdate = forwardRef((props, ref) => {

    useImperativeHandle(ref, () => ({
        open(id) {
            getProductCategory(id);
            SetShow(true);
        },

    }));


    let [errors, setErrors] = useState({});
    const [isProcessing, setProcessing] = useState(false);
    const cookies = new Cookies();

    const [parentCategoryOptions, setParentCategoryOptions] = useState([]);
    let [selectedParentCategories, setSelectedParentCategories] = useState([]);
    const [isProductCategoriesLoading, setIsProductCategoriesLoading] = useState(false);

    //fields
    let [formData, setFormData] = useState({});

    const [show, SetShow] = useState(false);

    function getProductCategory(id) {
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
        fetch('/v1/product-category/' + id, requestOptions)
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

    function handleClose() {
        SetShow(false);
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

        setIsProductCategoriesLoading(true);
        setProcessing(true);
        fetch("/v1/product-category/" + formData.id, requestOptions)
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
                props.showToastMessage("Product Category Updated Successfully!", "success");
                props.refreshList();
                handleClose();
                openDetailsView(data.result.id);
            })
            .catch((error) => {
                setProcessing(false);
                setIsProductCategoriesLoading(false);
                console.log("Inside catch");
                console.log(error);
                setErrors({ ...error });
                console.error("There was an error!", error);
                props.showToastMessage("Error Creating ProductCategory!", "danger");
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
            "/v1/product-category?" + Select + queryString,
            requestOptions
        );
        let data = await result.json();

        setParentCategoryOptions(data.result);
        setIsProductCategoriesLoading(false);
    }


    const DetailsViewRef = useRef();
    function openDetailsView(id) {
        console.log("id:", id);
        DetailsViewRef.current.open(id);
    }
    return (
        <>
            <ProductCategoryView ref={DetailsViewRef} />
            <Modal show={show} size="lg" onHide={handleClose} animation={false} backdrop={true}>
                <Modal.Header>
                    <Modal.Title>Update Product Category #{formData.name}</Modal.Title>

                    <div className="col align-self-end text-end">
                        {/*
                        <button
                            className="btn btn-primary mb-3"
                            data-bs-toggle="modal"
                            data-bs-target="#previewProductCategoryModal"
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
                            <label className="form-label">Parent(Optional)</label>

                            <div className="input-group mb-3">
                                <Typeahead
                                    id="parent_id"
                                    labelKey="name"
                                    isLoading={isProductCategoriesLoading}
                                    isInvalid={errors.parent_id ? true : false}
                                    onChange={(selectedItems) => {
                                        errors.parent__id = "";
                                        setErrors(errors);
                                        if (selectedItems.length === 0) {
                                            errors.parent_id = "Invalid Parent Category Selected";
                                            setErrors(errors);
                                            formData.parent_id = "";
                                            setFormData({ ...formData });
                                            setSelectedParentCategories([]);
                                            return;
                                        }
                                        formData.parent_id = selectedItems[0].id;
                                        setFormData({ ...formData });
                                        setSelectedParentCategories(selectedItems);
                                    }}
                                    options={parentCategoryOptions}
                                    placeholder="Select Parent Category"
                                    selected={selectedParentCategories}
                                    highlightOnlyResult="true"
                                    onInputChange={(searchTerm, e) => {
                                        suggestCategories(searchTerm);
                                    }}
                                />

                                {errors.parent_id && (
                                    <div style={{ color: "red" }}>
                                        <i class="bi bi-x-lg"> </i>
                                        {errors.parent_id}
                                    </div>
                                )}
                                {formData.parent_id && !errors.parent_id && (
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
                                        animation="bproductcategory"
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

export default ProductCategoryUpdate;
