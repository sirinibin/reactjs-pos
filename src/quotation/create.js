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
    let [formData, setFormData] = useState({
        products: [
            {
                product_id: "",
                quantity: 1,
                price: "",
            }
        ]
    });

    let [unitPriceList, setUnitPriceList] = useState([]);


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
    let [selectedProduct, setSelectedProduct] = useState([]);
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

    function GetProductUnitPriceInStore(storeId, unitPriceListArray) {
        if (!unitPriceListArray) {
            return;
        }

        for (var i = 0; i < unitPriceListArray.length; i++) {
            console.log("unitPriceListArray[i]:", unitPriceListArray[i]);
            console.log("store_id:", storeId);

            if (unitPriceListArray[i].store_id === storeId) {
                console.log("macthed")
                console.log("unitPrice.retail_unit_price:", unitPriceListArray[i].retail_unit_price);
                return unitPriceListArray[i].retail_unit_price;
            } else {
                console.log("not matched");
            }
        }
    }

    function GetProductStockInStore(storeId, stockList) {

        for (var i = 0; i < stockList.length; i++) {
            if (stockList[i].store_id === storeId) {
                return stockList[i].stock;
            }
        }
        return 0;
    }

    function SetPriceOfAllProducts(storeId) {
        console.log("inside set price of all products:");
        for (var i = 0; i < formData.products.length; i++) {
            formData.products[i].price = GetProductUnitPriceInStore(storeId, unitPriceList[formData.products[i].product_id]);
            console.log("formData.products[i].price:", formData.products[i].price);
        }
        setFormData({ ...formData });
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


        let Select = "select=id,name,unit_prices,stock";
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


    function addNewProductForm() {

        formData.products.push({
            "product_id": "",
            "quantity": 1,
            "price": "",

        });
        setFormData({ ...formData });

        errors.products.push({
            "product_id": "",
            "quantity": "",
            "price": "",

        });
        setErrors({ ...errors });

        // setFormData({ ...formData });

        console.log("formData.products:", formData.products);
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
                                        setFormData({ ...formData });
                                        setSelectedStores([]);
                                        return;
                                    }
                                    formData.store_id = selectedItems[0].id;
                                    SetPriceOfAllProducts(formData.store_id);
                                    setFormData({ ...formData });
                                    setSelectedStores(selectedItems);
                                }}
                                options={storeOptions}
                                placeholder="Select Store"
                                selected={selectedStores}
                                highlightOnlyResult="true"
                                onInputChange={(searchTerm, e) => { suggestStores(searchTerm); }}
                            />

                            <StoreCreate showCreateButton={true} />
                            <div style={{ color: "red" }} >
                                <i class="bi x-lg"> </i>
                                {errors.store_id}</div>
                            {formData.store_id && !errors.store_id &&
                                <div style={{ color: "green" }} >
                                    <i class="bi bi-check-lg"> </i>
                                    Looks good!</div>
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
                                        setFormData({ ...formData });
                                        setSelectedCustomers([]);
                                        return;
                                    }
                                    formData.customer_id = selectedItems[0].id;
                                    setFormData({ ...formData });
                                    setSelectedCustomers(selectedItems);
                                }}
                                options={customerOptions}
                                placeholder="Select Customer"
                                selected={selectedCustomers}
                                highlightOnlyResult="true"
                                onInputChange={(searchTerm, e) => { suggestCustomers(searchTerm); }}
                            />
                            <CustomerCreate showCreateButton={true} />
                            {errors.customer_id &&
                                <div style={{ color: "red" }} >
                                    <i class="bi bi-x-lg"> </i>
                                    {errors.customer_id}</div>
                            }
                            {formData.customer_id && !errors.customer_id &&
                                <div style={{ color: "green" }} >
                                    <i class="bi bi-check-lg"> </i>
                                    Looks good!</div>
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
                    {formData.products.map(function (product, i) {

                        <div>{"p" + i}</div>
                    })}
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

                                    if (selectedItems.length === 0) {
                                        errors["product_id"] = "Invalid Product selected";
                                        console.log(errors);
                                        setErrors(errors);
                                        // formData.products[i].product_id = "";
                                        // formData.products[i].price = "";
                                        // setFormData({ ...formData });
                                        setSelectedProduct([]);
                                        console.log(errors);
                                        return;
                                    }

                                    errors["product_id"] = "";
                                    setErrors({ ...errors });


                                    if (formData.store_id) {
                                        selectedItems[0].unit_price = GetProductUnitPriceInStore(formData.store_id, selectedItems[0].unit_prices);
                                    }

                                    selectedProduct = selectedItems
                                    console.log("selectedItems:", selectedItems);
                                    setSelectedProduct([...selectedItems]);
                                    console.log("selectedProduct:", selectedProduct);
                                    unitPriceList[selectedItems[0].product_id] = selectedItems[0].unit_prices;
                                    setUnitPriceList(unitPriceList);
                                    // unitPriceList[newProduct.product_id] = selectedItems[0].unit_price;
                                    // setUnitPriceList(unitPriceList);
                                    /*
                                    let newProduct = {
                                        "product_id": selectedItems[0].id,
                                        "name": selectedItems[0].name,
                                    };

                                    if (formData.store_id) {
                                        newProduct.price = GetProductUnitPriceInStore(formData.store_id, selectedItems[0].unit_price);
                                        //formData.products[i].price = GetProductUnitPriceInStore(formData.store_id, selectedItems[0].unit_price);
                                        //setFormData({ ...formData });
                                    }
                                    unitPriceList[newProduct.product_id] = selectedItems[0].unit_price;
                                    setUnitPriceList(unitPriceList);
                                    */


                                    /*
                                    console.log("unitPriceList(on product select):", unitPriceList);
                                    setFormData({ ...formData });
                                    setSelectedProducts(selectedItems);
                                    console.log(formData);
                                    */
                                }}
                                options={productOptions}
                                placeholder="Select Product"
                                selected={selectedProduct}
                                highlightOnlyResult="true"
                                onInputChange={(searchTerm, e) => { suggestProducts(searchTerm); }}
                            />
                            <ProductCreate showCreateButton={true} />
                            {errors.product_id ?
                                <div style={{ color: "red" }} >
                                    <i class="bi bi-x-lg"> </i>
                                    {errors.product_id}</div>
                                : null}
                            {selectedProduct[0] && selectedProduct[0].id && !errors.product_id &&
                                <div style={{ color: "green" }} >
                                    <i class="bi bi-check-lg"> </i>
                                    Looks good!</div>
                            }

                        </div>
                    </div>

                    <div className="col-md-2">
                        <label className="form-label"
                        >Qty*</label
                        >
                        <input
                            onChange={(e) => {
                                console.log("Inside onchange qty");
                                if (isNaN(e.target.value) || e.target.value === "0") {
                                    errors["quantity"] = "Invalid Quantity";
                                    setErrors({ ...errors });
                                    return;
                                }

                                errors["quantity"] = "";
                                setErrors({ ...errors });

                                selectedProduct[0].quantity = e.target.value;
                                setSelectedProduct({ ...selectedProduct });
                                console.log(selectedProduct);
                            }}
                            type="text"
                            className="form-control"
                            id="quantity"
                            placeholder="Quantity"
                            defaultValue="1"

                        />
                        {errors.quantity ?
                            <div style={{ color: "red" }} >
                                <i class="bi bi-x-lg"> </i>
                                {errors.quantity}</div> : null}

                        {selectedProduct[0] && selectedProduct[0].quantity && !errors["quantity"] &&
                            <div style={{ color: "green" }} >
                                <i class="bi bi-check-lg"> </i>
                                Looks good!
                                </div>
                        }
                    </div>
                    <div className="col-md-2">
                        <label className="form-label"
                        >Unit Price*</label
                        >
                        <input
                            type="text"
                            value={selectedProduct[0] ? selectedProduct[0].unit_price : null}
                            onChange={(e) => {
                                console.log("Inside onchange unit price:");

                                if (isNaN(e.target.value) || e.target.value === "0") {
                                    errors["unit_price"] = "Invalid Unit Price";
                                    setErrors({ ...errors });
                                    return;
                                }

                                //setFormData({ ...formData });
                                selectedProduct[0].unit_price = e.target.value;
                                setSelectedProduct([...selectedProduct]);

                                errors["unit_price"] = "";
                                setErrors({ ...errors });

                                //console.log(formData);
                            }}
                            className="form-control"
                            id="unit_price"
                            placeholder="Unit Price"
                            defaultValue=""

                        />

                        {errors.unit_price ?
                            <div style={{ color: "red" }} >
                                <i class="bi bi-x-lg"> </i>{errors.unit_price}</div> : null}
                        {selectedProduct[0] && selectedProduct[0].unit_price && !errors.unit_price &&
                            <div style={{ color: "green" }} >
                                <i class="bi bi-check-lg"> </i>Looks good!</div>
                        }
                    </div>
                    <div className="col-md-2">
                        <label className="form-label">
                            &nbsp;</label
                        >
                        <Button variant="primary" className="btn btn-primary form-control" onClick={addNewProductForm}>
                            <i className="bi bi-plus-lg"></i> ADD
                                </Button>
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
                                        setFormData({ ...formData });
                                        setSelectedDeliveredByUsers([]);
                                        return;
                                    }
                                    formData.delivered_by_user_id = selectedItems[0].id;
                                    setFormData({ ...formData });
                                    setSelectedDeliveredByUsers(selectedItems);
                                }}
                                options={deliveredByUserOptions}
                                placeholder="Select User"
                                selected={selectedDeliveredByUsers}
                                highlightOnlyResult="true"
                                onInputChange={(searchTerm, e) => { suggestUsers(searchTerm); }}
                            />


                            <UserCreate showCreateButton={true} />
                            {errors.delivered_by_user_id ?
                                <div style={{ color: "red" }} >
                                    <i class="bi bi-x-lg"> </i> {errors.delivered_by_user_id}</div>
                                : null}
                            {formData.delivered_by_user_id && !errors.delivered_by_user_id &&
                                <div style={{ color: "green" }} >
                                    <i class="bi bi-check-lg"> </i>Looks good!</div>
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
                                        setFormData({ ...formData });
                                        setSelectedDeliveredBySignatures([]);
                                        return;
                                    }
                                    formData.delivered_by_signature_id = selectedItems[0].id;
                                    setFormData({ ...formData });
                                    setSelectedDeliveredBySignatures(selectedItems);
                                }}
                                options={deliveredBySignatureOptions}
                                placeholder="Select Signature"
                                selected={selectedDeliveredBySignatures}
                                highlightOnlyResult="true"
                                onInputChange={(searchTerm, e) => { suggestSignatures(searchTerm); }}
                            />


                            <SignatureCreate showCreateButton={true} />
                            {errors.delivered_by_signature_id ?
                                <div style={{ color: "red" }} >
                                    <i class="bi bi-x-lg"> </i> {errors.delivered_by_signature_id}</div>
                                : null}
                            {formData.delivered_by_signature_id && !errors.delivered_by_signature_id &&
                                <div style={{ color: "green" }} >
                                    <i class="bi bi-check-lg"> </i> Looks good!</div>
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