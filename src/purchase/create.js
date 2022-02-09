import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import PurchasePreview from "./preview.js";
import { Modal, Button, Form } from "react-bootstrap";
import StoreCreate from "../store/create.js";
import VendorCreate from "./../vendor/create.js";
import ProductCreate from "./../product/create.js";
import UserCreate from "./../user/create.js";
import SignatureCreate from "./../signature/create.js";
import Cookies from "universal-cookie";
import { Typeahead } from "react-bootstrap-typeahead";
import NumberFormat from "react-number-format";
import DatePicker from "react-datepicker";
import { format } from "date-fns";
import { Spinner } from "react-bootstrap";
import PurchaseView from "./view.js";
import ProductView from "./../product/view.js";


const PurchaseCreate = forwardRef((props, ref) => {

    useImperativeHandle(ref, () => ({
        open(id) {

            selectedProducts = [];
            setSelectedProducts([]);

            selectedStores = [];
            setSelectedStores([]);

            selectedVendors = [];
            setSelectedVendors([]);

            selectedOrderPlacedByUsers = [];
            setSelectedOrderPlacedByUsers([]);

            selectedOrderPlacedBySignatures = [];
            setSelectedOrderPlacedBySignatures([]);


            formData = {
                vat_percent: 15.0,
                discount: 0.0,
                discountValue: 0.0,
                discount_percent: 0.0,
                is_discount_percent: false,
                date_str: format(new Date(), "MMM dd yyyy"),
                signature_date_str: format(new Date(), "MMM dd yyyy"),
                status: "created",
            };

            setFormData({ ...formData });

            if (id) {
                getPurchase(id);
            }
            reCalculate();
            setShow(true);
        },

    }));


    const selectedDate = new Date();

    //const history = useHistory();
    let [errors, setErrors] = useState({});
    const [isProcessing, setProcessing] = useState(false);
    const cookies = new Cookies();

    //fields
    let [formData, setFormData] = useState({
        vat_percent: 10.0,
        discount: 0.0,
        discountValue: 0.0,
        discount_percent: 0.0,
        is_discount_percent: false,
        date_str: format(new Date(), "MMM dd yyyy"),
        signature_date_str: format(new Date(), "MMM dd yyyy"),
        status: "created",
    });

    //Store Auto Suggestion
    const [storeOptions, setStoreOptions] = useState([]);
    let [selectedStores, setSelectedStores] = useState([]);
    const [isStoresLoading, setIsStoresLoading] = useState(false);

    //Vendor Auto Suggestion
    const [vendorOptions, setVendorOptions] = useState([]);
    let [selectedVendors, setSelectedVendors] = useState([]);
    const [isVendorsLoading, setIsVendorsLoading] = useState(false);

    //Product Auto Suggestion
    const [productOptions, setProductOptions] = useState([]);
    let [selectedProduct, setSelectedProduct] = useState([]);
    let [selectedProducts, setSelectedProducts] = useState([]);
    const [isProductsLoading, setIsProductsLoading] = useState(false);

    //Order Placed By Auto Suggestion
    const [orderPlacedByUserOptions, setOrderPlacedByUserOptions] = useState([]);
    let [selectedOrderPlacedByUsers, setSelectedOrderPlacedByUsers] = useState([]);
    const [isOrderPlacedByUsersLoading, setIsOrderPlacedByUsersLoading] = useState(false);

    //Order Placed By Signature Auto Suggestion
    const [orderPlacedBySignatureOptions, setOrderPlacedBySignatureOptions] =
        useState([]);
    let [selectedOrderPlacedBySignatures, setSelectedOrderPlacedBySignatures] =
        useState([]);
    const [isOrderPlacedBySignaturesLoading, setIsOrderPlacedBySignaturesLoading] =
        useState(false);

    const [show, setShow] = useState(false);

    function handleClose() {
        setShow(false);
    }

    useEffect(() => {
        let at = cookies.get("access_token");
        if (!at) {
            // history.push("/dashboard/purchases");
            window.location = "/";
        }
    });


    function getPurchase(id) {
        console.log("inside get Purchase");
        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': cookies.get('access_token'),
            },
        };

        fetch('/v1/purchase/' + id, requestOptions)
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

                let purchase = data.result;
                formData = {
                    id: purchase.id,
                    code: purchase.code,
                    store_id: purchase.store_id,
                    vendor_id: purchase.vendor_id,
                    date_str: purchase.date_str,
                    date: purchase.date,
                    vat_percent: purchase.vat_percent,
                    discount: purchase.discount,
                    discount_percent: purchase.discount_percent,
                    status: purchase.status,
                    order_placed_by: purchase.order_placed_by,
                    order_placed_by_signature_id: purchase.order_placed_by_signature_id,
                    is_discount_percent: purchase.is_discount_percent,
                };

                if (formData.is_discount_percent) {
                    formData.discountValue = formData.discount_percent;
                } else {
                    formData.discountValue = formData.discount;
                }

                selectedProducts = purchase.products;
                setSelectedProducts([...selectedProducts]);


                let selectedStores = [
                    {
                        id: purchase.store_id,
                        name: purchase.store_name,
                    }
                ];

                let selectedVendors = [
                    {
                        id: purchase.vendor_id,
                        name: purchase.vendor_name,
                    }
                ];

                let selectedOrderPlacedByUsers = [
                    {
                        id: purchase.order_placed_by,
                        name: purchase.order_placed_by_name
                    }
                ];

                if (purchase.order_placed_by_signature_id) {
                    let selectedOrderPlacedBySignatures = [
                        {
                            id: purchase.order_placed_by_signature_id,
                            name: purchase.order_placed_by_signature_name,
                        }
                    ];

                    setSelectedOrderPlacedBySignatures([...selectedOrderPlacedBySignatures]);
                }

                setSelectedOrderPlacedByUsers([...selectedOrderPlacedByUsers]);

                setSelectedStores([...selectedStores]);
                setSelectedVendors([...selectedVendors]);

                reCalculate();
                setFormData({ ...formData });


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

    async function suggestStores(searchTerm) {
        console.log("Inside handle suggestStores");
        setStoreOptions([]);

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
        setIsStoresLoading(true);
        let result = await fetch(
            "/v1/store?" + Select + queryString,
            requestOptions
        );
        let data = await result.json();

        setStoreOptions(data.result);
        setIsStoresLoading(false);
    }

    async function suggestVendors(searchTerm) {
        console.log("Inside handle suggestVendors");
        setVendorOptions([]);

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
        setIsVendorsLoading(true);
        let result = await fetch(
            "/v1/vendor?" + Select + queryString,
            requestOptions
        );
        let data = await result.json();

        setVendorOptions(data.result);
        setIsVendorsLoading(false);
    }

    function GetProductUnitPriceInStore(storeId, purchaseUnitPriceListArray) {
        if (!purchaseUnitPriceListArray) {
            return "";
        }

        for (var i = 0; i < purchaseUnitPriceListArray.length; i++) {
            console.log("purchaseUnitPriceListArray[i]:", purchaseUnitPriceListArray[i]);
            console.log("store_id:", storeId);

            if (purchaseUnitPriceListArray[i].store_id === storeId) {
                console.log("macthed");
                console.log(
                    "unitPrice.retail_unit_price:",
                    purchaseUnitPriceListArray[i].purchase_unit_price
                );
                return purchaseUnitPriceListArray[i].purchase_unit_price;
            } else {
                console.log("not matched");
            }
        }
        return "";
    }

    function GetProductStockInStore(storeId, stockList) {
        for (var i = 0; i < stockList.length; i++) {
            if (stockList[i].store_id === storeId) {
                return stockList[i].stock;
            }
        }
        return 0;
    }

    async function suggestProducts(searchTerm) {
        console.log("Inside handle suggestProducts");
        setProductOptions([]);

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

        let Select = "select=id,item_code,name,unit_prices,stock,unit";
        setIsProductsLoading(true);
        let result = await fetch(
            "/v1/product?" + Select + queryString,
            requestOptions
        );
        let data = await result.json();

        setProductOptions(data.result);
        setIsProductsLoading(false);
    }

    async function suggestUsers(searchTerm) {
        console.log("Inside handle suggestUsers");
        setOrderPlacedByUserOptions([]);

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
        setIsOrderPlacedByUsersLoading(true);
        let result = await fetch(
            "/v1/user?" + Select + queryString,
            requestOptions
        );
        let data = await result.json();

        setOrderPlacedByUserOptions(data.result);
        setIsOrderPlacedByUsersLoading(false);
    }

    async function suggestSignatures(searchTerm) {
        console.log("Inside handle suggestSignatures");
        setOrderPlacedBySignatureOptions([]);

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
        setIsOrderPlacedBySignaturesLoading(true);
        let result = await fetch(
            "/v1/signature?" + Select + queryString,
            requestOptions
        );
        let data = await result.json();

        setOrderPlacedBySignatureOptions(data.result);
        setIsOrderPlacedBySignaturesLoading(false);
    }

    function handleCreate(event) {
        event.preventDefault();
        console.log("Inside handle Create");
        console.log("selectedProducts:", selectedProducts);

        formData.products = [];
        for (var i = 0; i < selectedProducts.length; i++) {
            formData.products.push({
                product_id: selectedProducts[i].product_id,
                quantity: parseFloat(selectedProducts[i].quantity),
                unit: selectedProducts[i].unit,
                purchase_unit_price: parseFloat(selectedProducts[i].purchase_unit_price),
                retail_unit_price: parseFloat(selectedProducts[i].retail_unit_price),
                wholesale_unit_price: parseFloat(selectedProducts[i].wholesale_unit_price),
            });
        }

        formData.discount = parseFloat(formData.discount);
        formData.discount_percent = parseFloat(formData.discount_percent);
        formData.vat_percent = parseFloat(formData.vat_percent);
        console.log("formData.discount:", formData.discount);
        console.log("formData.discount_percent:", formData.discount_percent);

        let endPoint = "/v1/purchase";
        let method = "POST";
        if (formData.id) {
            endPoint = "/v1/purchase/" + formData.id;
            method = "PUT";
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

                console.log("Response:");
                console.log(data);
                props.showToastMessage("Purchase Created Successfully!", "success");
                if (props.refreshList) {
                    props.refreshList();
                }
                handleClose();
                openDetailsView(data.result.id);
            })
            .catch((error) => {
                setProcessing(false);
                console.log("Inside catch");
                console.log(error);
                setErrors({ ...error });
                console.error("There was an error!", error);
                props.showToastMessage("Error Creating Purchase!", "danger");
            });
    }

    function isProductAdded(productID) {
        for (var i = 0; i < selectedProducts.length; i++) {
            if (selectedProducts[i].product_id === productID) {
                return true;
            }
        }
        return false;
    }

    function addProduct() {
        console.log("Inside Add product");

        errors.product_id = "";
        if (!selectedProduct[0] || !selectedProduct[0].id) {
            errors.product_id = "No product selected";
            setErrors({ ...errors });
            return;
        }

        if (isProductAdded(selectedProduct[0].id)) {
            errors.product_id = "Product Already Added";
            setErrors({ ...errors });
            return;
        }

        errors.quantity = "";
        console.log("selectedProduct[0].quantity:", selectedProduct[0].quantity);

        if (!selectedProduct[0].quantity || isNaN(selectedProduct[0].quantity)) {
            errors.quantity = "Invalid Quantity";
            setErrors({ ...errors });
            return;
        }

        errors.purchase_unit_price = "";

        if (
            !selectedProduct[0].purchase_unit_price ||
            isNaN(selectedProduct[0].purchase_unit_price)
        ) {
            errors.purchase_unit_price = "Invalid Purchase Unit Price";
            setErrors({ ...errors });
            return;
        }


        errors.wholesale_unit_price = "";
        if (
            !selectedProduct[0].wholesale_unit_price ||
            isNaN(selectedProduct[0].wholesale_unit_price)
        ) {
            errors.wholesale_unit_price = "Invalid Wholesale Unit Price";
            setErrors({ ...errors });
            return;
        }

        errors.retail_unit_price = "";
        if (
            !selectedProduct[0].retail_unit_price ||
            isNaN(selectedProduct[0].retail_unit_price)
        ) {
            errors.retail_unit_price = "Invalid Retail Unit Price";
            setErrors({ ...errors });
            return;
        }


        selectedProducts.push({
            product_id: selectedProduct[0].id,
            code: selectedProduct[0].item_code,
            name: selectedProduct[0].name,
            quantity: selectedProduct[0].quantity,
            purchase_unit_price: parseFloat(selectedProduct[0].purchase_unit_price).toFixed(2),
            retail_unit_price: parseFloat(selectedProduct[0].retail_unit_price).toFixed(2),
            wholesale_unit_price: parseFloat(selectedProduct[0].wholesale_unit_price).toFixed(2),
            unit: selectedProduct[0].unit,
        });

        selectedProduct[0].name = "";
        selectedProduct[0].id = "";
        selectedProduct[0].search_label = "";
        selectedProduct[0].quantity = "";
        selectedProduct[0].purchase_unit_price = "";
        selectedProduct[0].retail_unit_price = "";
        selectedProduct[0].wholesale_unit_price = "";
        selectedProduct[0].unit = "";

        setSelectedProduct([...selectedProduct]);
        setSelectedProducts([...selectedProducts]);
        console.log("selectedProduct:", selectedProduct);
        console.log("selectedProducts:", selectedProducts);
        reCalculate();
    }

    function removeProduct(product) {
        const index = selectedProducts.indexOf(product);
        if (index > -1) {
            selectedProducts.splice(index, 1);
        }
        setSelectedProducts(selectedProducts);
        reCalculate();
    }

    let [totalPrice, setTotalPrice] = useState(0.0);

    function findTotalPrice() {
        totalPrice = 0.00;
        for (var i = 0; i < selectedProducts.length; i++) {
            totalPrice +=
                parseFloat(selectedProducts[i].purchase_unit_price) *
                parseFloat(selectedProducts[i].quantity);
        }
        totalPrice = totalPrice.toFixed(2);
        setTotalPrice(totalPrice);
    }

    let [vatPrice, setVatPrice] = useState(0.00);

    function findVatPrice() {
        vatPrice = ((parseFloat(formData.vat_percent) / 100) * parseFloat(totalPrice)).toFixed(2);;
        console.log("vatPrice:", vatPrice);
        setVatPrice(vatPrice);
    }

    let [netTotal, setNetTotal] = useState(0.00);

    function findNetTotal() {
        if (totalPrice > 0) {
            netTotal = (parseFloat(totalPrice) + parseFloat(vatPrice) - parseFloat(formData.discount)).toFixed(2);
            setNetTotal(netTotal);
        }

    }

    let [discountPercent, setDiscountPercent] = useState(0.00);

    function findDiscountPercent() {
        if (!formData.discountValue) {
            formData.discount = 0.00;
            formData.discount_percent = 0.00;
            setFormData({ ...formData });
            return;
        }

        formData.discount = formData.discountValue;

        if (formData.discount > 0 && totalPrice > 0) {
            discountPercent = parseFloat(parseFloat(formData.discount / totalPrice) * 100).toFixed(2);
            setDiscountPercent(discountPercent);
            formData.discount_percent = discountPercent;
            setFormData({ ...formData });
        }

    }

    function findDiscount() {
        if (!formData.discountValue) {
            formData.discount = 0.00;
            formData.discount_percent = 0.00;
            setFormData({ ...formData });
            return;
        }

        formData.discount_percent = formData.discountValue;

        if (formData.discount_percent > 0 && totalPrice > 0) {
            formData.discount = parseFloat(totalPrice * parseFloat(formData.discount_percent / 100)).toFixed(2);
        }
        setFormData({ ...formData });
    }


    function reCalculate() {
        findTotalPrice();
        findVatPrice();
        findNetTotal();
        if (formData.is_discount_percent) {
            findDiscount();
        } else {
            findDiscountPercent();
        }
    }

    const DetailsViewRef = useRef();
    function openDetailsView(id) {
        DetailsViewRef.current.open(id);
    }


    const StoreCreateFormRef = useRef();
    function openStoreCreateForm() {
        StoreCreateFormRef.current.open();
    }

    const ProductCreateFormRef = useRef();
    function openProductCreateForm() {
        ProductCreateFormRef.current.open();
    }

    const VendorCreateFormRef = useRef();
    function openVendorCreateForm() {
        VendorCreateFormRef.current.open();
    }

    const UserCreateFormRef = useRef();
    function openUserCreateForm() {
        UserCreateFormRef.current.open();
    }


    const SignatureCreateFormRef = useRef();
    function openSignatureCreateForm() {
        SignatureCreateFormRef.current.open();
    }

    const ProductDetailsViewRef = useRef();
    function openProductDetailsView(id) {
        ProductDetailsViewRef.current.open(id);
    }

    return (
        <>
            <ProductView ref={ProductDetailsViewRef} />
            <PurchaseView ref={DetailsViewRef} />
            <StoreCreate ref={StoreCreateFormRef} showToastMessage={props.showToastMessage} />
            <ProductCreate ref={ProductCreateFormRef} showToastMessage={props.showToastMessage} />
            <UserCreate ref={UserCreateFormRef} showToastMessage={props.showToastMessage} />
            <SignatureCreate ref={SignatureCreateFormRef} showToastMessage={props.showToastMessage} />
            <VendorCreate ref={VendorCreateFormRef} showToastMessage={props.showToastMessage} />
            <Modal show={show} size="xl" onHide={handleClose} animation={false} backdrop="static">
                <Modal.Header>
                    <Modal.Title>
                        {formData.id ? "Update Purchase #" + formData.code : "Create New Purchase"}
                    </Modal.Title>

                    <div className="col align-self-end text-end">
                        <PurchasePreview />
                        {/*
                        <button
                            className="btn btn-primary mb-3"
                            data-bs-toggle="modal"
                            data-bs-target="#previewPurchaseModal"
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
                    <form className="row g-3 needs-validation" onSubmit={handleCreate}>
                        <div className="col-md-6">
                            <label className="form-label">Purchase to Store*</label>

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
                                        setFormData({ ...formData });
                                        setSelectedStores(selectedItems);
                                        //SetPriceOfAllProducts(selectedItems[0].id);
                                    }}
                                    options={storeOptions}
                                    placeholder="Select Store"
                                    selected={selectedStores}
                                    highlightOnlyResult="true"
                                    onInputChange={(searchTerm, e) => {
                                        suggestStores(searchTerm);
                                    }}
                                />
                                <Button hide={true} onClick={openStoreCreateForm} className="btn btn-outline-secondary btn-primary btn-sm" type="button" id="button-addon1"> <i className="bi bi-plus-lg"></i> New</Button>

                                <div style={{ color: "red" }}>
                                    <i class="bi x-lg"> </i>
                                    {errors.store_id}
                                </div>
                                {formData.store_id && !errors.store_id && (
                                    <div style={{ color: "green" }}>
                                        <i class="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="col-md-6">
                            <label className="form-label">Purchase From Vendor*</label>

                            <div className="input-group mb-3">
                                <Typeahead
                                    id="vendor_id"
                                    labelKey="name"
                                    isLoading={isVendorsLoading}
                                    isInvalid={errors.vendor_id ? true : false}
                                    onChange={(selectedItems) => {
                                        errors.vendor_id = "";
                                        setErrors(errors);
                                        if (selectedItems.length === 0) {
                                            errors.vendor_id = "Invalid Vendor selected";
                                            setErrors(errors);
                                            formData.vendor_id = "";
                                            setFormData({ ...formData });
                                            setSelectedVendors([]);
                                            return;
                                        }
                                        formData.vendor_id = selectedItems[0].id;
                                        setFormData({ ...formData });
                                        setSelectedVendors(selectedItems);
                                    }}
                                    options={vendorOptions}
                                    placeholder="Select Vendor"
                                    selected={selectedVendors}
                                    highlightOnlyResult="true"
                                    onInputChange={(searchTerm, e) => {
                                        suggestVendors(searchTerm);
                                    }}
                                />
                                <Button hide={true} onClick={openVendorCreateForm} className="btn btn-outline-secondary btn-primary btn-sm" type="button" id="button-addon1"> <i className="bi bi-plus-lg"></i> New</Button>
                                {errors.vendor_id && (
                                    <div style={{ color: "red" }}>
                                        <i class="bi bi-x-lg"> </i>
                                        {errors.vendor_id}
                                    </div>
                                )}
                                {formData.vendor_id && !errors.vendor_id && (
                                    <div style={{ color: "green" }}>
                                        <i class="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="col-md-6">
                            <label className="form-label">Date*</label>

                            <div className="input-group mb-3">
                                <DatePicker
                                    id="date_str"
                                    value={formData.date_str}
                                    selected={selectedDate}
                                    className="form-control"
                                    dateFormat="MMM dd yyyy"
                                    onChange={(value) => {
                                        formData.date_str = format(new Date(value), "MMM dd yyyy");
                                        setFormData({ ...formData });
                                    }}
                                />

                                {errors.date_str && (
                                    <div style={{ color: "red" }}>
                                        <i class="bi bi-x-lg"> </i>
                                        {errors.date_str}
                                    </div>
                                )}
                                {formData.date_str && !errors.date_str && (
                                    <div style={{ color: "green" }}>
                                        <i class="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="col-md-6">
                            <label className="form-label">VAT %*</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.vat_percent}
                                    type='number'
                                    onChange={(e) => {
                                        console.log("Inside onchange vat percent");
                                        if (isNaN(e.target.value)) {
                                            errors["vat_percent"] = "Invalid Quantity";
                                            setErrors({ ...errors });
                                            return;
                                        }

                                        errors["vat_percent"] = "";
                                        setErrors({ ...errors });

                                        formData.vat_percent = e.target.value;
                                        setFormData({ ...formData });
                                        reCalculate();
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    defaultValue="10.00"
                                    id="validationCustom01"
                                    placeholder="VAT %"
                                    aria-label="Select Store"
                                    aria-describedby="button-addon1"
                                />
                                {errors.vat_percent && (
                                    <div style={{ color: "red" }}>
                                        <i class="bi bi-x-lg"> </i>
                                        {errors.vat_percent}
                                    </div>
                                )}
                                {formData.vat_percent && !errors.vat_percent && (
                                    <div style={{ color: "green" }}>
                                        <i class="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="col-md-6">
                            <label className="form-label">Discount*</label>
                            <Form.Check
                                type="switch"
                                id="custom-switch"
                                label="%"
                                value={formData.is_discount_percent}
                                checked={formData.is_discount_percent ? "checked" : null}
                                onChange={(e) => {
                                    formData.is_discount_percent = !formData.is_discount_percent;
                                    console.log("e.target.value:", formData.is_discount_percent);
                                    setFormData({ ...formData });
                                    reCalculate();
                                }}
                            />
                            <div className="input-group mb-3">
                                <input
                                    value={formData.discountValue}
                                    type='number'
                                    onChange={(e) => {
                                        if (e.target.value == 0) {
                                            formData.discountValue = e.target.value;
                                            setFormData({ ...formData });
                                            errors["discount"] = "";
                                            setErrors({ ...errors });
                                            reCalculate();
                                            return;
                                        }

                                        if (!e.target.value) {
                                            formData.discountValue = "";
                                            errors["discount"] = "Invalid Discount";
                                            setFormData({ ...formData });
                                            setErrors({ ...errors });
                                            return;
                                        }

                                        errors["discount"] = "";
                                        setErrors({ ...errors });

                                        formData.discountValue = e.target.value;
                                        setFormData({ ...formData });
                                        reCalculate();
                                    }}
                                    className="form-control"
                                    id="validationCustom02"
                                    placeholder="Discount"
                                    aria-label="Select Customer"
                                    aria-describedby="button-addon2"
                                />
                                {errors.discount && (
                                    <div style={{ color: "red" }}>
                                        <i class="bi bi-x-lg"> </i>
                                        {errors.discount}
                                    </div>
                                )}
                                {!errors.discount && (
                                    <div style={{ color: "green" }}>
                                        <i class="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>

                        </div>
                        <div className="col-md-6">
                            <label className="form-label">Status*</label>

                            <div className="input-group mb-3">
                                <select
                                    onChange={(e) => {
                                        console.log("Inside onchange status");
                                        if (!e.target.value) {
                                            errors["status"] = "Invalid Status";
                                            setErrors({ ...errors });
                                            return;
                                        }

                                        errors["status"] = "";
                                        setErrors({ ...errors });

                                        formData.status = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                >
                                    <option value="created">Created</option>
                                    <option vaue="order_placed">Order Placed</option>
                                    <option value="pending">Pending</option>
                                    <option value="delivered">Delivered</option>
                                    <option value="cancelled">Cancelled</option>
                                    <option value="dispatched">Dispatched</option>
                                </select>
                                {errors.status && (
                                    <div style={{ color: "red" }}>
                                        <i class="bi bi-x-lg"> </i>
                                        {errors.status}
                                    </div>
                                )}
                                {formData.status && !errors.status && (
                                    <div style={{ color: "green" }}>
                                        <i class="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="col-md-3">
                            <label className="form-label">Product*</label>

                            <div className="input-group mb-3">
                                <Typeahead
                                    id="product_id"
                                    labelKey="search_label"
                                    isLoading={isProductsLoading}
                                    isInvalid={errors.product_id ? true : false}
                                    onChange={(selectedItems) => {
                                        if (selectedItems.length === 0) {
                                            errors["product_id"] = "Invalid Product selected";
                                            console.log(errors);
                                            setErrors(errors);
                                            setSelectedProduct([]);
                                            console.log(errors);
                                            return;
                                        }

                                        errors["product_id"] = "";
                                        setErrors({ ...errors });

                                        if (formData.store_id) {
                                            selectedItems[0].purchase_unit_price = GetProductUnitPriceInStore(
                                                formData.store_id,
                                                selectedItems[0].purchase_unit_prices
                                            );

                                        }


                                        selectedProduct = selectedItems;
                                        selectedProduct[0].quantity = 1;
                                        console.log("selectedItems:", selectedItems);
                                        setSelectedProduct([...selectedProduct]);
                                        console.log("selectedProduct:", selectedProduct);
                                    }}
                                    options={productOptions}
                                    placeholder="Select Product"
                                    selected={selectedProduct}
                                    highlightOnlyResult="true"
                                    onInputChange={(searchTerm, e) => {
                                        suggestProducts(searchTerm);
                                    }}
                                />
                                <Button hide={true} onClick={openProductCreateForm} className="btn btn-outline-secondary btn-primary btn-sm" type="button" id="button-addon1"> <i className="bi bi-plus-lg"></i> New</Button>
                                {errors.product_id ? (
                                    <div style={{ color: "red" }}>
                                        <i class="bi bi-x-lg"> </i>
                                        {errors.product_id}
                                    </div>
                                ) : null}
                                {selectedProduct[0] &&
                                    selectedProduct[0].id &&
                                    !errors.product_id && (
                                        <div style={{ color: "green" }}>
                                            <i class="bi bi-check-lg"> </i>
                                            Looks good!
                                        </div>
                                    )}
                            </div>
                        </div>

                        <div className="col-md-1">
                            <label className="form-label">Qty{selectedProduct[0] && selectedProduct[0].unit ? "(" + selectedProduct[0].unit + ")" : ""}*</label>
                            <input
                                value={selectedProduct[0] ? selectedProduct[0].quantity : null}
                                onChange={(e) => {
                                    console.log("Inside onchange qty");
                                    if (!e.target.value) {
                                        errors["quantity"] = "Invalid Quantity";
                                        if (selectedProduct[0]) {
                                            selectedProduct[0].quantity = e.target.value;
                                        }
                                        setErrors({ ...errors });
                                        return;
                                    }

                                    if (e.target.value == 0) {
                                        if (selectedProduct[0]) {
                                            selectedProduct[0].quantity = e.target.value;
                                        }
                                        errors["quantity"] = "Invalid Quantity";
                                        setErrors({ ...errors });
                                        return;
                                    }

                                    errors["quantity"] = "";
                                    setErrors({ ...errors });

                                    if (selectedProduct[0]) {
                                        selectedProduct[0].quantity = parseFloat(e.target.value);
                                        setSelectedProduct([...selectedProduct]);
                                        console.log(selectedProduct);
                                    }
                                }}
                                type="number"
                                className="form-control"
                                id="quantity"
                                placeholder="Quantity"
                            />
                            {errors.quantity ? (
                                <div style={{ color: "red" }}>
                                    <i class="bi bi-x-lg"> </i>
                                    {errors.quantity}
                                </div>
                            ) : null}

                            {selectedProduct[0] &&
                                selectedProduct[0].quantity &&
                                !errors["quantity"] && (
                                    <div style={{ color: "green" }}>
                                        <i class="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                        </div>
                        <div className="col-md-2">
                            <label className="form-label">Purchase Unit Price*</label>
                            <input
                                type="text"
                                value={
                                    selectedProduct[0] ? selectedProduct[0].purchase_unit_price : null
                                }
                                onChange={(e) => {
                                    console.log("Inside onchange purchase unit price:");

                                    if (isNaN(e.target.value) || e.target.value === "0") {
                                        errors["purchase_unit_price"] = "Invalid Purchase Unit Price";
                                        setErrors({ ...errors });
                                        return;
                                    }
                                    errors["purchase_unit_price"] = "";
                                    setErrors({ ...errors });

                                    //setFormData({ ...formData });
                                    if (selectedProduct[0]) {
                                        selectedProduct[0].purchase_unit_price = e.target.value;
                                        setSelectedProduct([...selectedProduct]);
                                    }
                                }}
                                className="form-control"
                                id="purchase_unit_price"
                                placeholder="Purchase Unit Price"
                            />

                            {errors.purchase_unit_price ? (
                                <div style={{ color: "red" }}>
                                    <i class="bi bi-x-lg"> </i>
                                    {errors.purchase_unit_price}
                                </div>
                            ) : null}
                            {selectedProduct[0] &&
                                selectedProduct[0].purchase_unit_price &&
                                !errors.purchase_unit_price && (
                                    <div style={{ color: "green" }}>
                                        <i class="bi bi-check-lg"> </i>Looks good!
                                    </div>
                                )}
                        </div>
                        <div className="col-md-2">
                            <label className="form-label">Wholesale Unit Price*</label>
                            <input
                                type="text"
                                value={
                                    selectedProduct[0] ? selectedProduct[0].wholesale_unit_price : null
                                }
                                onChange={(e) => {
                                    console.log("Inside onchange selling unit price:");

                                    if (isNaN(e.target.value) || e.target.value === "0") {
                                        errors["wholesale_unit_price"] = "Invalid Wholesale Unit Price";
                                        setErrors({ ...errors });
                                        return;
                                    }
                                    errors["wholesale_unit_price"] = "";
                                    setErrors({ ...errors });

                                    //setFormData({ ...formData });
                                    if (selectedProduct[0]) {
                                        selectedProduct[0].wholesale_unit_price = e.target.value;
                                        setSelectedProduct([...selectedProduct]);
                                    }
                                }}
                                className="form-control"
                                id="wholesale_unit_price"
                                placeholder="Wholesale Unit Price"
                                defaultValue=""
                            />

                            {errors.wholesale_unit_price ? (
                                <div style={{ color: "red" }}>
                                    <i class="bi bi-x-lg"> </i>
                                    {errors.wholesale_unit_price}
                                </div>
                            ) : null}
                            {selectedProduct[0] &&
                                selectedProduct[0].wholesale_unit_price &&
                                !errors.wholesale_unit_price && (
                                    <div style={{ color: "green" }}>
                                        <i class="bi bi-check-lg"> </i>Looks good!
                                    </div>
                                )}
                        </div>
                        <div className="col-md-2">
                            <label className="form-label">Retail Unit Price*</label>
                            <input
                                type="text"
                                value={
                                    selectedProduct[0] ? selectedProduct[0].retail_unit_price : null
                                }
                                onChange={(e) => {
                                    console.log("Inside onchange retail unit price:");

                                    if (isNaN(e.target.value) || e.target.value === "0") {
                                        errors["retail_unit_price"] = "Invalid Retail Unit Price";
                                        setErrors({ ...errors });
                                        return;
                                    }
                                    errors["retail_unit_price"] = "";
                                    setErrors({ ...errors });

                                    //setFormData({ ...formData });
                                    if (selectedProduct[0]) {
                                        selectedProduct[0].retail_unit_price = e.target.value;
                                        setSelectedProduct([...selectedProduct]);
                                    }
                                }}
                                className="form-control"
                                id="retail_unit_price"
                                placeholder="Retail Unit Price"
                                defaultValue=""
                            />

                            {errors.retail_unit_price ? (
                                <div style={{ color: "red" }}>
                                    <i class="bi bi-x-lg"> </i>
                                    {errors.retail_unit_price}
                                </div>
                            ) : null}
                            {selectedProduct[0] &&
                                selectedProduct[0].retail_unit_price &&
                                !errors.retails_unit_price && (
                                    <div style={{ color: "green" }}>
                                        <i class="bi bi-check-lg"> </i>Looks good!
                                    </div>
                                )}
                        </div>
                        <div className="col-md-2">
                            <label className="form-label">&nbsp;</label>
                            <Button
                                variant="primary"
                                className="btn btn-primary form-control"
                                onClick={addProduct}
                            >
                                <i className="bi bi-plus-lg"></i> ADD
                            </Button>
                        </div>

                        <table className="table table-striped table-sm table-bordered">
                            <thead>
                                <tr className="text-center">
                                    <th>SI No.</th>
                                    <th>CODE</th>
                                    <th>Name</th>
                                    <th>Qty</th>
                                    <th>Purchase Unit Price</th>
                                    <th>Wholesale Unit Price</th>
                                    <th>Retail Unit Price</th>
                                    <th>Purchase Price</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedProducts.map((product, index) => (
                                    <tr className="text-center">
                                        <td>{index + 1}</td>
                                        <td>{product.code}</td>
                                        <td style={{
                                            "text-decoration": "underline",
                                            color: "blue",
                                            cursor: "pointer",
                                        }}
                                            onClick={() => {
                                                openProductDetailsView(product.product_id);
                                                console.log("okk,id:", product.product_id);
                                            }}>{product.name}
                                        </td>
                                        <td style={{ width: "125px" }}>

                                            <input type="number" value={product.quantity} className="form-control"

                                                placeholder="Quantity" onChange={(e) => {
                                                    errors["quantity_" + index] = "";
                                                    setErrors({ ...errors });
                                                    if (!e.target.value || e.target.value == 0) {
                                                        errors["quantity_" + index] = "Invalid Quantity";
                                                        selectedProducts[index].quantity = e.target.value;
                                                        setSelectedProducts([...selectedProducts]);
                                                        setErrors({ ...errors });
                                                        console.log("errors:", errors);
                                                        return;
                                                    }

                                                    product.quantity = parseFloat(e.target.value);
                                                    reCalculate();

                                                    selectedProducts[index].quantity = parseFloat(e.target.value);
                                                    console.log("selectedProducts[index].quantity:", selectedProducts[index].quantity);
                                                    setSelectedProducts([...selectedProducts]);
                                                    reCalculate();

                                                }} /> {selectedProducts[index].unit ? selectedProducts[index].unit : "Units"}
                                            {errors["quantity_" + index] && (
                                                <div style={{ color: "red" }}>
                                                    <i class="bi bi-x-lg"> </i>
                                                    {errors["quantity_" + index]}
                                                </div>
                                            )}
                                            {((selectedProducts[index].quantity) && !errors["quantity_" + index]) ? (
                                                <div style={{ color: "green" }}>
                                                    <i class="bi bi-check-lg"> </i>
                                                    Looks good!
                                                </div>
                                            ) : null}
                                        </td>
                                        <td style={{ width: "150px" }}>

                                            <input type="number" value={product.purchase_unit_price} className="form-control"

                                                placeholder="Purchase Unit Price" onChange={(e) => {
                                                    errors["purchase_unit_price_" + index] = "";
                                                    setErrors({ ...errors });
                                                    if (!e.target.value || e.target.value == 0) {
                                                        errors["purchase_unit_price_" + index] = "Invalid Purchase Unit Price";
                                                        selectedProducts[index].purchase_unit_price = parseFloat(e.target.value);
                                                        setSelectedProducts([...selectedProducts]);
                                                        setErrors({ ...errors });
                                                        console.log("errors:", errors);
                                                        return;
                                                    }
                                                    selectedProducts[index].purchase_unit_price = parseFloat(e.target.value);
                                                    console.log("selectedProducts[index].purchase_unit_price:", selectedProducts[index].purchase_unit_price);
                                                    setSelectedProducts([...selectedProducts]);
                                                    reCalculate();

                                                }} /> SAR
                                            {errors["purchase_unit_price_" + index] && (
                                                <div style={{ color: "red" }}>
                                                    <i class="bi bi-x-lg"> </i>
                                                    {errors["purchase_unit_price_" + index]}
                                                </div>
                                            )}
                                            {(selectedProducts[index].purchase_unit_price && !errors["purchase_unit_price_" + index]) ? (
                                                <div style={{ color: "green" }}>
                                                    <i class="bi bi-check-lg"> </i>
                                                    Looks good!
                                                </div>
                                            ) : null}
                                        </td>
                                        <td style={{ width: "150px" }}>

                                            <input type="number" value={product.wholesale_unit_price} className="form-control"

                                                placeholder="Wholesale Unit Price" onChange={(e) => {
                                                    errors["wholesale_unit_price_" + index] = "";
                                                    setErrors({ ...errors });
                                                    if (!e.target.value || e.target.value == 0) {
                                                        errors["wholesale_unit_price_" + index] = "Invalid Wholesale Unit Price";
                                                        selectedProducts[index].wholesale_unit_price = parseFloat(e.target.value);
                                                        setSelectedProducts([...selectedProducts]);
                                                        setErrors({ ...errors });
                                                        console.log("errors:", errors);
                                                        return;
                                                    }
                                                    selectedProducts[index].wholesale_unit_price = parseFloat(e.target.value);
                                                    console.log("selectedProducts[index].wholesale_unit_price:", selectedProducts[index].wholesale_unit_price);
                                                    setSelectedProducts([...selectedProducts]);
                                                    reCalculate();

                                                }} /> SAR
                                            {errors["wholesale_unit_price_" + index] && (
                                                <div style={{ color: "red" }}>
                                                    <i class="bi bi-x-lg"> </i>
                                                    {errors["wholesale_unit_price_" + index]}
                                                </div>
                                            )}
                                            {(selectedProducts[index].wholesale_unit_price && !errors["wholesale_unit_price_" + index]) ? (
                                                <div style={{ color: "green" }}>
                                                    <i class="bi bi-check-lg"> </i>
                                                    Looks good!
                                                </div>
                                            ) : null}
                                        </td>
                                        <td style={{ width: "150px" }}>

                                            <input type="number" value={product.retail_unit_price} className="form-control"

                                                placeholder="Retail Unit Price" onChange={(e) => {
                                                    errors["retail_unit_price_" + index] = "";
                                                    setErrors({ ...errors });
                                                    if (!e.target.value || e.target.value == 0) {
                                                        errors["retail_unit_price_" + index] = "Invalid Retail Unit Price";
                                                        selectedProducts[index].retail_unit_price = parseFloat(e.target.value);
                                                        setSelectedProducts([...selectedProducts]);
                                                        setErrors({ ...errors });
                                                        console.log("errors:", errors);
                                                        return;
                                                    }
                                                    selectedProducts[index].retail_unit_price = parseFloat(e.target.value);
                                                    console.log("selectedProducts[index].retail_unit_price:", selectedProducts[index].retail_unit_price);
                                                    setSelectedProducts([...selectedProducts]);
                                                    reCalculate();

                                                }} /> SAR
                                            {errors["retail_unit_price_" + index] && (
                                                <div style={{ color: "red" }}>
                                                    <i class="bi bi-x-lg"> </i>
                                                    {errors["retail_unit_price_" + index]}
                                                </div>
                                            )}
                                            {(selectedProducts[index].retail_unit_price && !errors["retail_unit_price_" + index]) ? (
                                                <div style={{ color: "green" }}>
                                                    <i class="bi bi-check-lg"> </i>
                                                    Looks good!
                                                </div>
                                            ) : null}
                                        </td>
                                        <td>
                                            <NumberFormat
                                                value={(product.purchase_unit_price * product.quantity).toFixed(2)}
                                                displayType={"text"}
                                                thousandSeparator={true}
                                                suffix={" SAR"}
                                                renderText={(value, props) => value}
                                            />
                                        </td>
                                        <td>
                                            <div
                                                style={{ color: "red", cursor: "pointer" }}
                                                onClick={() => {
                                                    removeProduct(product);
                                                }}
                                            >
                                                <i class="bi bi-x-lg"> </i>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                <tr>
                                    <td colSpan="4"></td>
                                    <td colSpan="2"></td>

                                    <th className="text-end">Total</th>
                                    <td className="text-center">
                                        <NumberFormat
                                            value={totalPrice}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={" SAR"}
                                            renderText={(value, props) => value}
                                        />
                                    </td>
                                </tr>
                                <tr>
                                    <th colSpan="6" className="text-end">
                                        VAT
                                    </th>
                                    <td className="text-center">{formData.vat_percent + "%"}</td>
                                    <td className="text-center">
                                        <NumberFormat
                                            value={vatPrice}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={" SAR"}
                                            renderText={(value, props) => value}
                                        />
                                    </td>
                                </tr>
                                <tr>
                                    <th colSpan="7" className="text-end">
                                        Discount(  {formData.discount_percent + "%"})
                                    </th>
                                    <td className="text-center">
                                        <NumberFormat
                                            value={formData.discount}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={" SAR"}
                                            renderText={(value, props) => value}
                                        />
                                    </td>
                                </tr>
                                <tr>
                                    <td colSpan="6"></td>
                                    <th className="text-end">Net Total</th>
                                    <th className="text-center">
                                        <NumberFormat
                                            value={netTotal}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={" SAR"}
                                            renderText={(value, props) => value}
                                        />
                                    </th>
                                </tr>
                            </tbody>
                        </table>

                        <div className="col-md-6">
                            <label className="form-label">Order Placed By*</label>

                            <div className="input-group mb-3">
                                <Typeahead
                                    id="order_placed_by"
                                    labelKey="name"
                                    isLoading={isOrderPlacedByUsersLoading}
                                    isInvalid={errors.order_placed_by ? true : false}
                                    onChange={(selectedItems) => {
                                        errors.order_placed_by = "";
                                        setErrors(errors);
                                        if (selectedItems.length === 0) {
                                            errors.order_placed_by = "Invalid User Selected";
                                            setErrors(errors);
                                            setFormData({ ...formData });
                                            setSelectedOrderPlacedByUsers([]);
                                            return;
                                        }
                                        formData.order_placed_by = selectedItems[0].id;
                                        setFormData({ ...formData });
                                        setSelectedOrderPlacedByUsers(selectedItems);
                                    }}
                                    options={orderPlacedByUserOptions}
                                    placeholder="Select User"
                                    selected={selectedOrderPlacedByUsers}
                                    highlightOnlyResult="true"
                                    onInputChange={(searchTerm, e) => {
                                        suggestUsers(searchTerm);
                                    }}
                                />
                                <Button hide={true} onClick={openUserCreateForm} className="btn btn-outline-secondary btn-primary btn-sm" type="button" id="button-addon1"> <i className="bi bi-plus-lg"></i> New</Button>
                                {errors.order_placed_by ? (
                                    <div style={{ color: "red" }}>
                                        <i class="bi bi-x-lg"> </i> {errors.order_placed_by}
                                    </div>
                                ) : null}
                                {formData.order_placed_by && !errors.order_placed_by && (
                                    <div style={{ color: "green" }}>
                                        <i class="bi bi-check-lg"> </i>Looks good!
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="col-md-6">
                            <label className="form-label">
                                Order Placed By Signature(Optional)
                            </label>

                            <div className="input-group mb-3">
                                <Typeahead
                                    id="order_placed_by_signature_id"
                                    labelKey="name"
                                    isLoading={isOrderPlacedBySignaturesLoading}
                                    isInvalid={errors.order_placed_by_signature_id ? true : false}
                                    onChange={(selectedItems) => {
                                        errors.order_placed_by_signature_id = "";
                                        setErrors(errors);
                                        if (selectedItems.length === 0) {
                                            errors.order_placed_by_signature_id =
                                                "Invalid Signature Selected";
                                            setErrors(errors);
                                            setFormData({ ...formData });
                                            setSelectedOrderPlacedBySignatures([]);
                                            return;
                                        }
                                        formData.order_placed_by_signature_id = selectedItems[0].id;
                                        setFormData({ ...formData });
                                        setSelectedOrderPlacedBySignatures(selectedItems);
                                    }}
                                    options={orderPlacedBySignatureOptions}
                                    placeholder="Select Signature"
                                    selected={selectedOrderPlacedBySignatures}
                                    highlightOnlyResult="true"
                                    onInputChange={(searchTerm, e) => {
                                        suggestSignatures(searchTerm);
                                    }}
                                />

                                <Button hide={true} onClick={openSignatureCreateForm} className="btn btn-outline-secondary btn-primary btn-sm" type="button" id="button-addon1"> <i className="bi bi-plus-lg"></i> New</Button>
                                {errors.order_placed_by_signature_id ? (
                                    <div style={{ color: "red" }}>
                                        <i class="bi bi-x-lg"> </i>{" "}
                                        {errors.order_placed_by_signature_id}
                                    </div>
                                ) : null}
                                {formData.order_placed_by_signature_id &&
                                    !errors.order_placed_by_signature_id && (
                                        <div style={{ color: "green" }}>
                                            <i class="bi bi-check-lg"> </i> Looks good!
                                        </div>
                                    )}
                            </div>
                        </div>
                        <div className="col-md-6">
                            <label className="form-label">Signature Date(Optional)</label>

                            <div className="input-group mb-3">
                                <DatePicker
                                    id="signature_date_str"
                                    value={formData.signature_date_str}
                                    selected={selectedDate}
                                    className="form-control"
                                    dateFormat="MMM dd yyyy"
                                    onChange={(value) => {
                                        formData.signature_date_str = format(new Date(value), "MMM dd yyyy");
                                        setFormData({ ...formData });
                                    }}
                                />

                                {errors.signature_date_str && (
                                    <div style={{ color: "red" }}>
                                        <i class="bi bi-x-lg"> </i>
                                        {errors.signature_date_str}
                                    </div>
                                )}
                                {formData.signature_date_str && !errors.signature_date_str && (
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
                                        animation="border"
                                        size="sm"
                                        role="status"
                                        aria-hidden="true"
                                    /> + " Creating..."

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

export default PurchaseCreate;
