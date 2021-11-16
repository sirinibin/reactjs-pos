import React, { useState, useEffect } from "react";
import QuotationPreview from './preview.js';
import { Modal, Button } from 'react-bootstrap';
import StoreCreate from '../store/create.js';
import CustomerCreate from './../customer/create.js';
import ProductCreate from './../product/create.js';
import UserCreate from './../user/create.js';
import SignatureCreate from './../signature/create.js';
import Cookies from 'universal-cookie';
import { Typeahead } from 'react-bootstrap-typeahead';


function QuotationCreate(props) {

    //const history = useHistory();
    let [errors, setErrors] = useState({});
    const [isProcessing, setProcessing] = useState(false);
    const cookies = new Cookies();

    //fields
    let [formData, setFormData] = useState({});

    //Store Auto Suggestion
    const [storeOptions, setStoreOptions] = useState([]);
    const [selectedStores, setSelectedStores] = useState([]);
    const [isStoresLoading, setIsStoresLoading,] = useState(false);

    //Customer Auto Suggestion
    const [customerOptions, setCustomerOptions] = useState([]);
    const [selectedCustomers, setSelectedCustomers] = useState([]);
    const [isCustomersLoading, setIsCustomersLoading,] = useState(false);

    //Product Auto Suggestion
    const [productOptions, setProductOptions] = useState([]);
    const [selectedProducts, setSelectedProducts] = useState([]);
    const [isProductsLoading, setIsProductsLoading] = useState(false);


    //Delivered By Auto Suggestion
    const [deliveredByUserOptions, setDeliveredByUserOptions] = useState([]);
    const [selectedDeliveredByUsers, setSelectedDeliveredByUsers] = useState([]);
    const [isDeliveredByUsersLoading, setIsDeliveredByUsersLoading] = useState(false);

    //Delivered By Signature Auto Suggestion
    const [deliveredBySignatureOptions, setDeliveredBySignatureOptions] = useState([]);
    const [selectedDeliveredBySignatures, setSelectedDeliveredBySignatures] = useState([]);
    const [isDeliveredBySignaturesLoading, setIsDeliveredBySignaturesLoading] = useState(false);



    const [show, SetShow] = useState(false);

    function handleClose() {
        SetShow(false);
    };

    function handleShow() {
        SetShow(true);
    };


    useEffect(() => {
        let at = cookies.get("access_token");
        if (!at) {
            // history.push("/dashboard/quotations");
            window.location = "/";
        }
    });




    function ObjectToSearchQueryParams(object) {
        return Object.keys(object).map(function (key) {
            return `search[${key}]=${object[key]}`;
        }).join('&');
    }


    async function suggestStores(searchTerm) {
        console.log("Inside handle suggestStores");
        setStoreOptions([]);

        console.log("searchTerm:" + searchTerm);
        if (!searchTerm) {
            return
        }

        var params = {
            name: searchTerm,
        };
        var queryString = ObjectToSearchQueryParams(params);
        if (queryString !== "") {
            queryString = "&" + queryString;
        }


        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': cookies.get('access_token'),
            },
        };


        let Select = "select=id,name";
        setIsStoresLoading(true);
        let result = await fetch('/v1/store?' + Select + queryString, requestOptions);
        let data = await result.json();

        setStoreOptions(data.result);
        setIsStoresLoading(false);
    }

    async function suggestCustomers(searchTerm) {
        console.log("Inside handle suggestCustomers");
        setCustomerOptions([]);

        console.log("searchTerm:" + searchTerm);
        if (!searchTerm) {
            return
        }

        var params = {
            name: searchTerm,
        };
        var queryString = ObjectToSearchQueryParams(params);
        if (queryString !== "") {
            queryString = "&" + queryString;
        }


        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': cookies.get('access_token'),
            },
        };


        let Select = "select=id,name";
        setIsCustomersLoading(true);
        let result = await fetch('/v1/customer?' + Select + queryString, requestOptions);
        let data = await result.json();

        setCustomerOptions(data.result);
        setIsCustomersLoading(false);
    }


    async function suggestProducts(searchTerm) {
        console.log("Inside handle suggestProducts");
        setProductOptions([]);

        console.log("searchTerm:" + searchTerm);
        if (!searchTerm) {
            return
        }

        var params = {
            name: searchTerm,
        };
        var queryString = ObjectToSearchQueryParams(params);
        if (queryString !== "") {
            queryString = "&" + queryString;
        }


        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': cookies.get('access_token'),
            },
        };


        let Select = "select=id,name";
        setIsProductsLoading(true);
        let result = await fetch('/v1/product?' + Select + queryString, requestOptions);
        let data = await result.json();

        setProductOptions(data.result);
        setIsProductsLoading(false);
    }


    async function suggestUsers(searchTerm) {
        console.log("Inside handle suggestUsers");
        setDeliveredByUserOptions([]);

        console.log("searchTerm:" + searchTerm);
        if (!searchTerm) {
            return
        }

        var params = {
            name: searchTerm,
        };
        var queryString = ObjectToSearchQueryParams(params);
        if (queryString !== "") {
            queryString = "&" + queryString;
        }


        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': cookies.get('access_token'),
            },
        };


        let Select = "select=id,name";
        setIsDeliveredByUsersLoading(true);
        let result = await fetch('/v1/user?' + Select + queryString, requestOptions);
        let data = await result.json();

        setDeliveredByUserOptions(data.result);
        setIsDeliveredByUsersLoading(false);
    }

    async function suggestSignatures(searchTerm) {
        console.log("Inside handle suggestSignatures");
        setDeliveredBySignatureOptions([]);

        console.log("searchTerm:" + searchTerm);
        if (!searchTerm) {
            return
        }

        var params = {
            name: searchTerm,
        };
        var queryString = ObjectToSearchQueryParams(params);
        if (queryString !== "") {
            queryString = "&" + queryString;
        }


        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': cookies.get('access_token'),
            },
        };


        let Select = "select=id,name";
        setIsDeliveredBySignaturesLoading(true);
        let result = await fetch('/v1/signature?' + Select + queryString, requestOptions);
        let data = await result.json();

        setDeliveredBySignatureOptions(data.result);
        setIsDeliveredBySignaturesLoading(false);
    }

    function handleSubmit(event) {
        console.log("Inside handle Submit");
        event.preventDefault();
        var data = {
            email: event.target[0].value,
            password: event.target[1].value,
        };

        const requestOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        };

        setProcessing(true);
        fetch('/v1/quotation', requestOptions)
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();

                // check for error response
                if (!response.ok) {
                    // get error message from body or default to response status
                    const error = (data && data.errors);
                    //const error = data.errors
                    return Promise.reject(error);
                }

                setErrors({});

                console.log("Response:");
                console.log(data);
            })
            .catch(error => {
                setProcessing(false);
                console.log("Inside catch");
                console.log(error);
                setErrors(error);
                console.error('There was an error!', error);
            });


    }



    return (<>
        {props.showCreateButton && (
            <Button hide={true} variant="primary" className="btn btn-primary mb-3" onClick={handleShow}>
                <i className="bi bi-plus-lg"></i> Create
            </Button>
        )}
        <Modal show={show} size="lg" onHide={handleClose} animation={false}>
            <Modal.Header>
                <Modal.Title>Create New Quotation</Modal.Title>

                <div className="col align-self-end text-end">
                    <QuotationPreview />
                    {/*
                        <button
                            className="btn btn-primary mb-3"
                            data-bs-toggle="modal"
                            data-bs-target="#previewQuotationModal"
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
                <form className="row g-3 needs-validation" >
                    <div className="col-md-6">
                        <label className="form-label"
                        >Store*</label>

                        <div className="input-group mb-3">
                            <Typeahead
                                id="store_id"
                                labelKey="name"
                                isLoading={isStoresLoading}
                                isInvalid={errors.store_id ? true : false}
                                onChange={(selectedItems) => {
                                    errors.store_id = "";
                                    setErrors(errors);
                                    if (selectedItems.length === 0) {
                                        errors.store_id = "Invalid Store selected";
                                        setErrors(errors);
                                        setFormData(formData);
                                        setSelectedStores([]);
                                        return;
                                    }
                                    formData.store_id = selectedItems[0].id;
                                    setFormData(formData);
                                    setSelectedStores(selectedItems);
                                }}
                                options={storeOptions}
                                placeholder="Select Store"
                                selected={selectedStores}
                                highlightOnlyResult="true"
                                onInputChange={(searchTerm, e) => { suggestStores(searchTerm); }}
                            />

                            <StoreCreate showCreateButton={true} />
                            <div style={{ color: "red" }} >{errors.store_id}</div>
                            {formData.store_id && !errors.store_id &&
                                <div style={{ color: "green" }} >Looks good!</div>
                            }
                        </div>
                    </div>
                    <div className="col-md-6">
                        <label className="form-label"
                        >Customer*</label
                        >

                        <div className="input-group mb-3">
                            <Typeahead
                                id="customer_id"
                                labelKey="name"
                                isLoading={isCustomersLoading}
                                isInvalid={errors.customer_id ? true : false}
                                onChange={(selectedItems) => {
                                    errors.customer_id = "";
                                    setErrors(errors);
                                    if (selectedItems.length === 0) {
                                        errors.customer_id = "Invalid Customer selected";
                                        setErrors(errors);
                                        formData.customer_id = "";
                                        setFormData(formData);
                                        setSelectedCustomers([]);
                                        return;
                                    }
                                    formData.customer_id = selectedItems[0].id;
                                    setFormData(formData);
                                    setSelectedCustomers(selectedItems);
                                }}
                                options={customerOptions}
                                placeholder="Select Customer"
                                selected={selectedCustomers}
                                highlightOnlyResult="true"
                                onInputChange={(searchTerm, e) => { suggestCustomers(searchTerm); }}
                            />
                            <CustomerCreate showCreateButton={true} />
                            <div style={{ color: "red" }} >{errors.customer_id}</div>
                            {formData.customer_id && !errors.customer_id &&
                                <div style={{ color: "green" }} >Looks good!</div>
                            }
                        </div>
                    </div>
                    <div className="col-md-6">
                        <label className="form-label"
                        >VAT %*</label>

                        <div className="input-group mb-3">
                            <input type="text" className="form-control" value="10.00" id="validationCustom01" placeholder="VAT %" aria-label="Select Store" aria-describedby="button-addon1" />
                            <div className="valid-feedback">Looks good!</div>
                            <div className="invalid-feedback">
                                Please provide a valid Store.
                                    </div>
                        </div>
                    </div>
                    <div className="col-md-6">
                        <label className="form-label"
                        >Discount*</label
                        >

                        <div className="input-group mb-3">
                            <input type="text" className="form-control" value="0.00" id="validationCustom02" placeholder="Discount" aria-label="Select Customer" aria-describedby="button-addon2" />
                            <div className="valid-feedback">Looks good!</div>
                            <div className="invalid-feedback">
                                Please provide a valid Customer.
                                </div>
                        </div>
                    </div>
                    <div className="col-md-6">
                        <label className="form-label"
                        >Product*</label
                        >

                        <div className="input-group mb-3">
                            <Typeahead
                                id="product_id"
                                labelKey="name"
                                isLoading={isProductsLoading}
                                isInvalid={errors.product_id ? true : false}
                                onChange={(selectedItems) => {
                                    errors.product_id = "";
                                    setErrors(errors);
                                    if (selectedItems.length === 0) {
                                        errors.product_id = "Invalid Product selected";
                                        setErrors(errors);
                                        formData.product_id = "";
                                        setFormData(formData);
                                        setSelectedProducts([]);
                                        return;
                                    }
                                    formData.product_id = selectedItems[0].id;
                                    setFormData(formData);
                                    setSelectedProducts(selectedItems);
                                }}
                                options={productOptions}
                                placeholder="Select Product"
                                selected={selectedProducts}
                                highlightOnlyResult="true"
                                onInputChange={(searchTerm, e) => { suggestProducts(searchTerm); }}
                            />
                            <ProductCreate showCreateButton={true} />
                            <div style={{ color: "red" }} >{errors.product_id}</div>
                            {formData.product_id && !errors.product_id &&
                                <div style={{ color: "green" }} >Looks good!</div>
                            }
                        </div>
                    </div>

                    <div className="col-md-2">
                        <label className="form-label"
                        >Qty*</label
                        >
                        <input
                            type="text"
                            className="form-control"
                            id="validationCustom04"
                            placeholder="Quantity"
                            defaultValue="1"

                        />

                        <div className="valid-feedback">Looks good!</div>
                        <div className="invalid-feedback">
                            Please provide a valid Quantity.
                            </div>
                    </div>
                    <div className="col-md-2">
                        <label className="form-label"
                        >Price*</label
                        >
                        <input
                            type="text"
                            className="form-control"
                            id="validationCustom04"
                            placeholder="Price"
                            defaultValue="100.00"

                        />

                        <div className="valid-feedback">Looks good!</div>
                        <div className="invalid-feedback">
                            Please provide a valid Quantity.
                            </div>
                    </div>
                    <div className="col-md-2">
                        <label className="form-label">
                            &nbsp;</label
                        >
                        <a href="/" className="btn-primary form-control"><i className="align-middle me-1" data-feather="plus"></i> ADD</a>
                    </div>

                    <div className="col-md-6">
                        <label className="form-label"
                        >Delivered By*</label
                        >

                        <div className="input-group mb-3">
                            <Typeahead
                                id="delivered_by_user_id"
                                labelKey="name"
                                isLoading={isDeliveredByUsersLoading}
                                isInvalid={errors.delivered_by_user_id ? true : false}
                                onChange={(selectedItems) => {
                                    errors.delivered_by_user_id = "";
                                    setErrors(errors);
                                    if (selectedItems.length === 0) {
                                        errors.delivered_by_user_id = "Invalid User Selected";
                                        setErrors(errors);
                                        setFormData(formData);
                                        setSelectedDeliveredByUsers([]);
                                        return;
                                    }
                                    formData.delivered_by_user_id = selectedItems[0].id;
                                    setFormData(formData);
                                    setSelectedDeliveredByUsers(selectedItems);
                                }}
                                options={deliveredByUserOptions}
                                placeholder="Select User"
                                selected={selectedDeliveredByUsers}
                                highlightOnlyResult="true"
                                onInputChange={(searchTerm, e) => { suggestUsers(searchTerm); }}
                            />


                            <UserCreate showCreateButton={true} />
                            <div style={{ color: "red" }} >{errors.delivered_by_user_id}</div>
                            {formData.delivered_by_user_id && !errors.delivered_by_user_id &&
                                <div style={{ color: "green" }} >Looks good!</div>
                            }
                        </div>
                    </div>

                    <div className="col-md-6">
                        <label className="form-label"
                        >Delivered By Signature(Optional)</label
                        >

                        <div className="input-group mb-3">
                            <Typeahead
                                id="delivered_by_signature_id"
                                labelKey="name"
                                isLoading={isDeliveredBySignaturesLoading}
                                isInvalid={errors.delivered_by_signature_id ? true : false}
                                onChange={(selectedItems) => {
                                    errors.delivered_by_signature_id = "";
                                    setErrors(errors);
                                    if (selectedItems.length === 0) {
                                        errors.delivered_by_signature_id = "Invalid Signature Selected";
                                        setErrors(errors);
                                        setFormData(formData);
                                        setSelectedDeliveredBySignatures([]);
                                        return;
                                    }
                                    formData.delivered_by_signature_id = selectedItems[0].id;
                                    setFormData(formData);
                                    setSelectedDeliveredBySignatures(selectedItems);
                                }}
                                options={deliveredBySignatureOptions}
                                placeholder="Select Signature"
                                selected={selectedDeliveredBySignatures}
                                highlightOnlyResult="true"
                                onInputChange={(searchTerm, e) => { suggestSignatures(searchTerm); }}
                            />


                            <SignatureCreate showCreateButton={true} />
                            <div style={{ color: "red" }} >{errors.delivered_by_signature_id}</div>
                            {formData.delivered_by_signature_id && !errors.delivered_by_signature_id &&
                                <div style={{ color: "green" }} >Looks good!</div>
                            }
                        </div>
                    </div>

                    <div className="col-md-6">
                        <label className="form-label"
                        >Status*</label>

                        <div className="input-group mb-3">
                            <select className="form-control">
                                <option value="created">Created</option>
                                <option vaue="delivered">Delivered</option>
                                <option value="pending">Pending</option>
                                <option value="accepted">Accepted</option>
                                <option value="rejected">Rejected</option>
                                <option value="cancelled" >Cancelled</option>
                            </select>

                            <div className="valid-feedback">Looks good!</div>
                            <div className="invalid-feedback">
                                Please provide a valid Store.
                                    </div>
                        </div>
                    </div>

                </form>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={handleClose}>
                    Close
                </Button>
                <Button variant="primary" onClick={handleClose}>
                    Save Changes
                </Button>
            </Modal.Footer>
        </Modal>
    </>);
}

export default QuotationCreate;