import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from "react";
import OrderPreview from "./preview.js";
import { Modal, Button, Form } from "react-bootstrap";
import StoreCreate from "../store/create.js";
import CustomerCreate from "./../customer/create.js";
import ProductCreate from "./../product/create.js";
import UserCreate from "./../user/create.js";
import SignatureCreate from "./../signature/create.js";
import Cookies from "universal-cookie";
import { Typeahead } from "react-bootstrap-typeahead";
import NumberFormat from "react-number-format";
import DatePicker from "react-datepicker";
import { format } from "date-fns";
import { Spinner } from "react-bootstrap";
import OrderView from "./view.js";
import BarcodeScannerComponent from "react-qr-barcode-scanner";
import Quagga from 'quagga';
import ProductView from "./../product/view.js";

const OrderCreate = forwardRef((props, ref) => {

    useImperativeHandle(ref, () => ({
        open() {
            setShow(true);

        },
    }));
    /*
    function getOrder() {
        console.log("inside get Order");
        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': cookies.get('access_token'),
            },
        };

        fetch('/v1/order/' + props.id, requestOptions)
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

                let order = data.result;

                selectedProducts = order.products;
                setSelectedProducts([...selectedProducts]);


                formData = order;
                setFormData({ ...formData });

                selectedStores = [
                    {
                        id: order.store_id,
                        name: order.store_name,
                    }
                ];

                setSelectedStores(selectedStores);

                let selectedCustomers = [
                    {
                        id: order.customer_id,
                        name: order.customer_name,
                    }
                ];

                let selectedDeliveredByUsers = [
                    {
                        id: order.delivered_by,
                        name: order.delivered_by_name
                    }
                ];

                if (order.delivered_by_signature_id) {
                    let selectedDeliveredBySignatures = [
                        {
                            id: order.delivered_by_signature_id,
                            name: order.delivered_by_signature_name,
                        }
                    ];
                    setSelectedDeliveredBySignatures([...selectedDeliveredBySignatures]);
                }

                setSelectedDeliveredByUsers([...selectedDeliveredByUsers]);


                setSelectedCustomers([...selectedCustomers]);

                reCalculate();
            })
            .catch(error => {
                setProcessing(false);
                setErrors(error);
            });
    }
    */

    /*
    let [barcode, setBarcode] = useState("");
    let [barcodeEnded, setBarcodeEnded] = useState(false);
    const keyPress = useCallback(
        (e) => {
            console.log("e.key:", e.key);

            if (!barcodeEnded && e.key != "Enter") {
                console.log()
                barcode += e.key;
                setBarcode(barcode);
            }

            if (e.key === "Enter") {
                document.removeEventListener("keydown", keyPress);
                console.log("barcode:", barcode);
                barcodeEnded = true;
                setBarcodeEnded(true);
            }

        },
        []
    );

    function addListener() {
        //barcode = "";
        //setBarcode(barcode);
        document.addEventListener("keydown", keyPress);
        console.log("Listener added, barcode:", barcode);
    }
    */
    /*
    useEffect(() => {
        document.addEventListener("keydown", keyPress);
        return () => document.removeEventListener("keydown", keyPress);
    }, [keyPress]);
    */
    /*
    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    });
    let [barcode, setBarcode] = useState("");
    function handleKeyDown(event) {
        console.log("event.key:", event.key);

        /*
        if (event.key == "Enter") {
            barcode = "";
            setBarcode(barcode);
        }
        else if (event.key == "Shift") {
            console.log("barcode:", barcode);
        } else {
            barcode += event.key;
            setBarcode(barcode);
        }
        */

    /*
    if (event.keyCode === KEY_ESCAPE) {
        /* do your action here */
    // }  
    // }

    const selectedDate = new Date();

    //const history = useHistory();
    let [errors, setErrors] = useState({});
    const [isProcessing, setProcessing] = useState(false);
    const cookies = new Cookies();

    //fields
    let [formData, setFormData] = useState({
        vat_percent: 15.0,
        discountValue: 0.0,
        discount: 0.0,
        discount_percent: 0.0,
        is_discount_percent: false,
        date_str: format(new Date(), "MMM dd yyyy"),
        signature_date_str: format(new Date(), "MMM dd yyyy"),
        status: "delivered",
        payment_status: "paid",
        payment_method: "cash",
        price_type: "retail",
    });

    let [unitPriceList, setUnitPriceList] = useState([]);

    //Store Auto Suggestion
    const [storeOptions, setStoreOptions] = useState([]);
    const [selectedStores, setSelectedStores] = useState([]);
    const [isStoresLoading, setIsStoresLoading] = useState(false);

    //Customer Auto Suggestion
    const [customerOptions, setCustomerOptions] = useState([]);
    const [selectedCustomers, setSelectedCustomers] = useState([]);
    const [isCustomersLoading, setIsCustomersLoading] = useState(false);

    //Product Auto Suggestion
    const [productOptions, setProductOptions] = useState([]);
    let [selectedProduct, setSelectedProduct] = useState([]);
    let [selectedProducts, setSelectedProducts] = useState([]);
    const [isProductsLoading, setIsProductsLoading] = useState(false);

    //Delivered By Auto Suggestion
    const [deliveredByUserOptions, setDeliveredByUserOptions] = useState([]);
    const [selectedDeliveredByUsers, setSelectedDeliveredByUsers] = useState([]);
    const [isDeliveredByUsersLoading, setIsDeliveredByUsersLoading] =
        useState(false);

    //Delivered By Signature Auto Suggestion
    const [deliveredBySignatureOptions, setDeliveredBySignatureOptions] =
        useState([]);
    const [selectedDeliveredBySignatures, setSelectedDeliveredBySignatures] =
        useState([]);
    const [isDeliveredBySignaturesLoading, setIsDeliveredBySignaturesLoading] =
        useState(false);

    const [show, setShow] = useState(false);

    function handleClose() {
        setShow(false);
    }

    useEffect(() => {
        let at = cookies.get("access_token");
        if (!at) {
            // history.push("/dashboard/orders");
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

    async function suggestCustomers(searchTerm) {
        console.log("Inside handle suggestCustomers");
        setCustomerOptions([]);

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
        setIsCustomersLoading(true);
        let result = await fetch(
            "/v1/customer?" + Select + queryString,
            requestOptions
        );
        let data = await result.json();

        setCustomerOptions(data.result);
        setIsCustomersLoading(false);
    }

    function handlePriceTypeChange(priceType) {

        console.log("Inside Price type change");
        console.log(priceType);
    }

    function GetProductUnitPriceInStore(storeId, unitPriceListArray) {
        if (!unitPriceListArray) {
            return "";
        }

        for (var i = 0; i < unitPriceListArray.length; i++) {
            console.log("unitPriceListArray[i]:", unitPriceListArray[i]);
            console.log("store_id:", storeId);

            if (unitPriceListArray[i].store_id === storeId) {
                console.log("macthed");
                console.log(
                    "unitPrice.retail_unit_price:",
                    unitPriceListArray[i].retail_unit_price
                );
                if (formData.price_type == "retail") {
                    return unitPriceListArray[i].retail_unit_price;
                } else if (formData.price_type == "wholesale") {
                    return unitPriceListArray[i].wholesale_unit_price;
                } else if (formData.price_type == "purchase") {
                    return unitPriceListArray[i].purchase_unit_price;
                }

            } else {
                console.log("not matched");
            }
        }
        return "";
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
        setDeliveredByUserOptions([]);

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
        setIsDeliveredByUsersLoading(true);
        let result = await fetch(
            "/v1/user?" + Select + queryString,
            requestOptions
        );
        let data = await result.json();

        setDeliveredByUserOptions(data.result);
        setIsDeliveredByUsersLoading(false);
    }

    async function suggestSignatures(searchTerm) {
        console.log("Inside handle suggestSignatures");
        setDeliveredBySignatureOptions([]);

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
        setIsDeliveredBySignaturesLoading(true);
        let result = await fetch(
            "/v1/signature?" + Select + queryString,
            requestOptions
        );
        let data = await result.json();

        setDeliveredBySignatureOptions(data.result);
        setIsDeliveredBySignaturesLoading(false);
    }

    function handleCreate(event) {
        event.preventDefault();

        formData.products = [];
        for (var i = 0; i < selectedProducts.length; i++) {
            formData.products.push({
                product_id: selectedProducts[i].product_id,
                quantity: parseFloat(selectedProducts[i].quantity),
                unit_price: parseFloat(selectedProducts[i].unit_price),
                unit: selectedProducts[i].unit,
            });
        }
        if (!formData.discount && formData.discount != 0) {
            return;
        }

        formData.discount = parseFloat(formData.discount);
        formData.discount_percent = parseFloat(formData.discount_percent);
        formData.vat_percent = parseFloat(formData.vat_percent);
        formData.partial_payment_amount = parseFloat(formData.partial_payment_amount);


        let endPoint = "/v1/order";
        let method = "POST";
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
                props.showToastMessage("Order Created Successfully!", "success");
                if (props.refreshList) {
                    props.refreshList();
                }

                handleClose();
                formData.products = [];
                selectedProducts = [];
                setSelectedProducts([]);
                formData.customer_id = "";
                setSelectedCustomers([]);
                setFormData({ ...formData });
                reCalculate();

                openDetailsView(data.result.id);
            })
            .catch((error) => {
                setProcessing(false);
                console.log("Inside catch");
                console.log(error);
                setErrors({ ...error });
                console.error("There was an error!", error);
                props.showToastMessage("Error Creating Order!", "danger");
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

    function GetProductStockInStore(storeId, stockList) {
        if (!stockList) {
            return 0.0;
        }

        for (var i = 0; i < stockList.length; i++) {
            if (stockList[i].store_id === storeId) {
                return stockList[i].stock;
            }
        }
        return 0.0;
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

        errors.unit_price = "";
        if (
            !selectedProduct[0].unit_price ||
            isNaN(selectedProduct[0].unit_price)
        ) {
            errors.unit_price = "Invalid Unit Price";
            setErrors({ ...errors });
            return;
        }

        if (!formData.store_id) {
            errors.product_id = "Please Select a Store and try again";
            setErrors({ ...errors });
            return;
        }

        let stock = GetProductStockInStore(formData.store_id, selectedProduct[0].stock);
        if (stock < selectedProduct[0].quantity) {
            errors.product_id = "Stock is only " + stock + " in Store: " + selectedStores[0].name + " for this product";
            setErrors({ ...errors });
            return;
        }

        selectedProducts.push({
            product_id: selectedProduct[0].id,
            code: selectedProduct[0].item_code,
            name: selectedProduct[0].name,
            quantity: selectedProduct[0].quantity,
            stock: selectedProduct[0].stock,
            unit_price: parseFloat(selectedProduct[0].unit_price).toFixed(2),
            unit: selectedProduct[0].unit,
        });

        selectedProduct[0].name = "";
        selectedProduct[0].search_label = "";
        selectedProduct[0].id = "";
        selectedProduct[0].quantity = "";
        selectedProduct[0].unit_price = "";
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
                parseFloat(selectedProducts[i].unit_price) *
                parseFloat(selectedProducts[i].quantity);
        }
        totalPrice = totalPrice.toFixed(2);
        setTotalPrice(totalPrice);
    }

    let [vatPrice, setVatPrice] = useState(0.00);

    function findVatPrice() {
        if (totalPrice > 0) {
            vatPrice = ((parseFloat(formData.vat_percent) / 100) * parseFloat(totalPrice)).toFixed(2);;
            console.log("vatPrice:", vatPrice);
            setVatPrice(vatPrice);
        }
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
        if (formData.is_discount_percent) {
            findDiscount();
        } else {
            findDiscountPercent();
        }
        findNetTotal();
    }

    const DetailsViewRef = useRef();
    function openDetailsView(id) {
        DetailsViewRef.current.open(id);
    }

    const camref = useRef();

    const StoreCreateFormRef = useRef();
    function openStoreCreateForm() {
        StoreCreateFormRef.current.open();
    }

    const CustomerCreateFormRef = useRef();
    function openCustomerCreateForm() {
        CustomerCreateFormRef.current.open();
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
            {/*
            <div ref={camref}></div>
        */}

            {/*
            <BarcodeScannerComponent
                width={500}
                height={500}
                onUpdate={(err, result) => {
                    console.log("Result:", result);
                }}
            />
            */}

            <OrderView ref={DetailsViewRef} />
            <ProductView ref={ProductDetailsViewRef} />
            <StoreCreate ref={StoreCreateFormRef} showToastMessage={props.showToastMessage} />
            <CustomerCreate ref={CustomerCreateFormRef} showToastMessage={props.showToastMessage} />
            <ProductCreate ref={ProductCreateFormRef} showToastMessage={props.showToastMessage} />
            <UserCreate ref={UserCreateFormRef} showToastMessage={props.showToastMessage} />
            <SignatureCreate ref={SignatureCreateFormRef} showToastMessage={props.showToastMessage} />


            <Modal show={show} size="xl" onHide={handleClose} animation={false} backdrop="static">
                <Modal.Header>
                    <Modal.Title>
                        {formData.id ? "Update Sales Order #" + formData.code : "Create New Sales Order"}
                    </Modal.Title>

                    <div className="col align-self-end text-end">
                        <OrderPreview />
                        {/*
                        <button
                            className="btn btn-primary mb-3"
                            data-bs-toggle="modal"
                            data-bs-target="#previewOrderModal"
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
                            <label className="form-label">Store*</label>

                            <div className="input-group mb-3">
                                <Typeahead
                                    id="store_id"
                                    labelKey="name"
                                    isLoading={isStoresLoading}
                                    isInvalid={errors.store_id ? true : false}
                                    onChange={(selectedItems) => {
                                        errors.store_id = "";
                                        errors["product_id"] = "";
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

                                        if (formData.store_id) {
                                            if (selectedProduct[0] && selectedProduct[0].stock && selectedProduct[0].quantity) {
                                                let stock = 0;
                                                if (selectedProduct[0].stock) {
                                                    stock = GetProductStockInStore(formData.store_id, selectedProduct[0].stock);
                                                }

                                                if (stock < parseFloat(selectedProduct[0].quantity)) {
                                                    if (selectedStores[0]) {
                                                        errors.product_id = "Stock is only " + stock + " in Store: " + selectedStores[0].name + " for this product";
                                                    } else {
                                                        errors.product_id = "Stock is only " + stock + " in Selected Store for this product";
                                                    }

                                                    setErrors({ ...errors });
                                                }
                                            } else if (selectedProduct[0] && selectedProduct[0].stock) {
                                                let stock = 0;
                                                stock = GetProductStockInStore(formData.store_id, selectedProduct[0].stock);
                                                if (stock === 0) {
                                                    if (selectedStores[0]) {
                                                        errors["product_id"] = "This product is not available in store: " + selectedStores[0].name;
                                                    } else {
                                                        errors["product_id"] = "This product is not available in selected store."
                                                    }
                                                    setErrors({ ...errors });
                                                }
                                            }

                                            if (selectedProduct[0]) {
                                                selectedProduct[0].unit_price = GetProductUnitPriceInStore(
                                                    formData.store_id,
                                                    selectedProduct[0].unit_prices
                                                );
                                                if (!selectedProduct[0].quantity) {
                                                    selectedProduct[0].quantity = 1;
                                                }
                                                setSelectedProduct([...selectedProduct]);
                                            }

                                        }

                                    }
                                    }
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
                            <label className="form-label">Customer*</label>

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
                                    onInputChange={(searchTerm, e) => {
                                        suggestCustomers(searchTerm);
                                    }}
                                />
                                <Button hide={true} onClick={openCustomerCreateForm} className="btn btn-outline-secondary btn-primary btn-sm" type="button" id="button-addon1"> <i className="bi bi-plus-lg"></i> New</Button>
                                {errors.customer_id && (
                                    <div style={{ color: "red" }}>
                                        <i class="bi bi-x-lg"> </i>
                                        {errors.customer_id}
                                    </div>
                                )}
                                {formData.customer_id && !errors.customer_id && (
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
                                            errors["vat_percent"] = "Invalid VAT percentage";
                                            setErrors({ ...errors });
                                            return;
                                        }

                                        errors["vat_percent"] = "";
                                        setErrors({ ...errors });

                                        formData.vat_percent = e.target.value;
                                        findVatPrice();
                                        findNetTotal();
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
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
                                    value={formData.status}
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
                                    <option value="order_placed">Order Placed</option>
                                    <option value="delivered">Delivered</option>
                                    <option value="pending">Pending</option>
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
                        <div className="col-md-12">
                            <label className="form-label">Product*</label>

                         
                                <Typeahead
                                    id="product_id"
                                    size="lg"
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

                                        if (!formData.store_id) {
                                            errors.product_id = "Please Select a Store and try again";
                                            setErrors({ ...errors });
                                            return;
                                        }

                                        if (formData.store_id) {
                                            selectedItems[0].unit_price = GetProductUnitPriceInStore(
                                                formData.store_id,
                                                selectedItems[0].unit_prices
                                            );

                                            let stock = 0;
                                            if (selectedItems[0].stock) {
                                                stock = GetProductStockInStore(formData.store_id, selectedItems[0].stock);
                                            }
                                            if (stock === 0) {
                                                errors["product_id"] = "This product is not available in store: " + selectedStores[0].name;
                                                setErrors({ ...errors });
                                            }


                                        }

                                        selectedProduct = selectedItems;
                                        selectedProduct[0].quantity = 1;
                                        console.log("selectedItems:", selectedItems);
                                        setSelectedProduct([...selectedItems]);
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

                        <div className="col-md-2">
                            <label className="form-label">Price type</label>
                            <select className="form-control" value={formData.price_type}
                                onChange={(e) => {

                                    formData.price_type = e.target.value;
                                    console.log("Inside onchange price type:", formData.price_type);
                                    setFormData({ ...formData });

                                    if (formData.store_id && selectedProduct[0]) {
                                        selectedProduct[0].unit_price = GetProductUnitPriceInStore(
                                            formData.store_id,
                                            selectedProduct[0].unit_prices
                                        );
                                    }


                                }}
                            >
                                <option value="retail" SELECTED>Retail</option>
                                <option value="wholesale">Wholesale</option>
                                <option value="purchase" SELECTED>Purchase</option>
                            </select>
                        </div>
                        <div className="col-md-2">
                            <label className="form-label">Qty{selectedProduct[0] && selectedProduct[0].unit ? "(" + selectedProduct[0].unit + ")" : ""}*</label>
                            <input
                                value={selectedProduct[0] ? selectedProduct[0].quantity : null}
                                onChange={(e) => {

                                    if (!e.target.value) {
                                        if(selectedProduct[0] && selectedProduct[0].quantity){
                                            selectedProduct[0].quantity = "";
                                        }
                                     
                                        setSelectedProduct([...selectedProduct]);
                                        errors["quantity"] = "Quantity is required";
                                        setErrors({ ...errors });
                                        return;
                                    }

                                    if (e.target.value == 0) {
                                        selectedProduct[0].quantity = parseFloat(e.target.value);
                                        setSelectedProduct([...selectedProduct]);
                                        errors["quantity"] = "Quantity should be more than zero";
                                        setErrors({ ...errors });
                                        return;
                                    }



                                    errors["quantity"] = "";
                                    errors["product_id"] = "";
                                    setErrors({ ...errors });

                                    if (selectedProduct[0]) {
                                        selectedProduct[0].quantity = parseFloat(e.target.value);
                                        setSelectedProduct([...selectedProduct]);
                                        console.log(selectedProduct);

                                        let stock = 0;
                                        if (selectedProduct[0].stock) {
                                            stock = GetProductStockInStore(formData.store_id, selectedProduct[0].stock);
                                        }

                                        if (stock < parseFloat(selectedProduct[0].quantity)) {
                                            errors.product_id = "Stock is only " + stock + " in Store: " + selectedStores[0].name + " for this product";
                                            setErrors({ ...errors });
                                        }
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
                                selectedProduct[0].quantity > 0 &&
                                !errors["quantity"] && (
                                    <div style={{ color: "green" }}>
                                        <i class="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                        </div>
                        <div className="col-md-2">
                            <label className="form-label">Unit Price*</label>
                            <input
                                type="text"
                                value={
                                    selectedProduct[0] ? selectedProduct[0].unit_price : null
                                }
                                onChange={(e) => {
                                    console.log("Inside onchange unit price:");

                                    if (isNaN(e.target.value) || e.target.value === "0") {
                                        errors["unit_price"] = "Invalid Unit Price";
                                        setErrors({ ...errors });
                                        return;
                                    }
                                    errors["unit_price"] = "";
                                    setErrors({ ...errors });

                                    //setFormData({ ...formData });
                                    if (selectedProduct[0]) {
                                        selectedProduct[0].unit_price = e.target.value;
                                        setSelectedProduct([...selectedProduct]);
                                    }
                                }}
                                className="form-control"
                                id="unit_price"
                                placeholder="Unit Price"
                                defaultValue=""
                            />

                            {errors.unit_price ? (
                                <div style={{ color: "red" }}>
                                    <i class="bi bi-x-lg"> </i>
                                    {errors.unit_price}
                                </div>
                            ) : null}
                            {selectedProduct[0] &&
                                selectedProduct[0].unit_price &&
                                !errors.unit_price && (
                                    <div style={{ color: "green" }}>
                                        <i class="bi bi-check-lg"> </i>Looks good!
                                    </div>
                                )}
                        </div>
                        <div className="col-md-1">
                            <label className="form-label">&nbsp;</label>
                            <Button
                                variant="primary"
                                className="btn btn-primary form-control"
                                onClick={addProduct}
                            >
                                 ADD
                            </Button>
                        </div>

                        <div className="table-responsive" style={{ overflowX: "auto" }}>
                            <table className="table table-striped table-sm table-bordered">
                                <thead>
                                    <tr className="text-center">
                                        <th>SI No.</th>
                                        <th>CODE</th>
                                        <th>Name</th>
                                        <th>Qty</th>
                                        <th>Unit Price</th>
                                        <th>Price</th>
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

                                                        let stock = 0;
                                                        if (selectedProducts[index].stock) {
                                                            stock = GetProductStockInStore(formData.store_id, selectedProducts[index].stock);
                                                        }

                                                        if (stock < parseFloat(e.target.value)) {
                                                            errors["quantity_" + index] = "Stock is only " + stock + " in Store: " + selectedStores[0].name + " for this product";
                                                            setErrors({ ...errors });
                                                            return;
                                                        }

                                                        selectedProducts[index].quantity = parseFloat(e.target.value);
                                                        console.log("selectedProducts[index].stock:", selectedProducts[index].quantity);
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

                                                <input type="number" value={product.unit_price} className="form-control"

                                                    placeholder="Unit Price" onChange={(e) => {
                                                        errors["unit_price_" + index] = "";
                                                        setErrors({ ...errors });
                                                        if (!e.target.value || e.target.value == 0) {
                                                            errors["unit_price_" + index] = "Invalid Unit Price";
                                                            selectedProducts[index].unit_price = parseFloat(e.target.value);
                                                            setSelectedProducts([...selectedProducts]);
                                                            setErrors({ ...errors });
                                                            console.log("errors:", errors);
                                                            return;
                                                        }
                                                        selectedProducts[index].unit_price = parseFloat(e.target.value);
                                                        console.log("selectedProducts[index].unit_price:", selectedProducts[index].unit_price);
                                                        setSelectedProducts([...selectedProducts]);
                                                        reCalculate();

                                                    }} /> SAR
                                                {errors["unit_price_" + index] && (
                                                    <div style={{ color: "red" }}>
                                                        <i class="bi bi-x-lg"> </i>
                                                        {errors["unit_price_" + index]}
                                                    </div>
                                                )}
                                                {(selectedProducts[index].unit_price && !errors["unit_price_" + index]) ? (
                                                    <div style={{ color: "green" }}>
                                                        <i class="bi bi-check-lg"> </i>
                                                        Looks good!
                                                    </div>
                                                ) : null}
                                            </td>
                                            <td>
                                                <NumberFormat
                                                    value={(product.unit_price * product.quantity).toFixed(2)}
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
                                        <th colSpan="4" className="text-end">
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
                                        <th colSpan="5" className="text-end">
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
                                        <td colSpan="4"></td>
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
                        </div>

                        <div className="col-md-6">
                            <label className="form-label">Delivered By*</label>

                            <div className="input-group mb-3">
                                <Typeahead
                                    id="delivered_by"
                                    labelKey="name"
                                    isLoading={isDeliveredByUsersLoading}
                                    isInvalid={errors.delivered_by ? true : false}
                                    onChange={(selectedItems) => {
                                        errors.delivered_by = "";
                                        setErrors(errors);
                                        if (selectedItems.length === 0) {
                                            errors.delivered_by = "Invalid User Selected";
                                            setErrors(errors);
                                            setFormData({ ...formData });
                                            setSelectedDeliveredByUsers([]);
                                            return;
                                        }
                                        formData.delivered_by = selectedItems[0].id;
                                        setFormData({ ...formData });
                                        setSelectedDeliveredByUsers(selectedItems);
                                    }}
                                    options={deliveredByUserOptions}
                                    placeholder="Select User"
                                    selected={selectedDeliveredByUsers}
                                    highlightOnlyResult="true"
                                    onInputChange={(searchTerm, e) => {
                                        suggestUsers(searchTerm);
                                    }}
                                />

                                <Button hide={true} onClick={openUserCreateForm} className="btn btn-outline-secondary btn-primary btn-sm" type="button" id="button-addon1"> <i className="bi bi-plus-lg"></i> New</Button>
                                {errors.delivered_by ? (
                                    <div style={{ color: "red" }}>
                                        <i class="bi bi-x-lg"> </i> {errors.delivered_by}
                                    </div>
                                ) : null}
                                {formData.delivered_by && !errors.delivered_by && (
                                    <div style={{ color: "green" }}>
                                        <i class="bi bi-check-lg"> </i>Looks good!
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="col-md-6">
                            <label className="form-label">
                                Delivered By Signature(Optional)
                            </label>

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
                                            errors.delivered_by_signature_id =
                                                "Invalid Signature Selected";
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
                                    onInputChange={(searchTerm, e) => {
                                        suggestSignatures(searchTerm);
                                    }}
                                />

                                <Button hide={true} onClick={openSignatureCreateForm} className="btn btn-outline-secondary btn-primary btn-sm" type="button" id="button-addon1"> <i className="bi bi-plus-lg"></i> New</Button>
                                {errors.delivered_by_signature_id ? (
                                    <div style={{ color: "red" }}>
                                        <i class="bi bi-x-lg"> </i>{" "}
                                        {errors.delivered_by_signature_id}
                                    </div>
                                ) : null}
                                {formData.delivered_by_signature_id &&
                                    !errors.delivered_by_signature_id && (
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

                        <div className="col-md-3">
                            <label className="form-label">Payment method*</label>

                            <div className="input-group mb-3">
                                <select
                                    onChange={(e) => {
                                        console.log("Inside onchange payment method");
                                        if (!e.target.value) {
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
                                    <option value="cash">Cash</option>
                                    <option vaue="account_transfer">Account Transfer</option>
                                    <option value="card_payment">Credit/Debit Card</option>
                                </select>
                                {errors.payment_method && (
                                    <div style={{ color: "red" }}>
                                        <i class="bi bi-x-lg"> </i>
                                        {errors.payment_method}
                                    </div>
                                )}
                                {formData.payment_method && !errors.payment_method && (
                                    <div style={{ color: "green" }}>
                                        <i class="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">Payment Status*</label>

                            <div className="input-group mb-3">
                                <select
                                    value={formData.payment_method}
                                    onChange={(e) => {
                                        console.log("Inside onchange payment Status");
                                        if (!e.target.value) {
                                            errors["status"] = "Invalid Payment Status";
                                            setErrors({ ...errors });
                                            return;
                                        }

                                        errors["payment_status"] = "";
                                        setErrors({ ...errors });

                                        formData.payment_method = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                >
                                    <option value="paid">Paid</option>
                                    <option value="pending">Pending</option>
                                    <option value="paid_partially">Paid Partially</option>
                                </select>
                                {errors.payment_status && (
                                    <div style={{ color: "red" }}>
                                        <i class="bi bi-x-lg"> </i>
                                        {errors.payment_status}
                                    </div>
                                )}
                                {formData.payment_status && !errors.payment_status && (
                                    <div style={{ color: "green" }}>
                                        <i class="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>
                        </div>


                        <div className="col-md-4">
                            <label className="form-label">Patial Payment Amount(Optional)</label>

                            <div className="input-group mb-3">
                                <input
                                    type='number'
                                    onChange={(e) => {
                                        console.log("Inside onchange vat discount");
                                        if (isNaN(e.target.value)) {
                                            errors["partial_payment_amount"] = "Invalid Amount";
                                            setErrors({ ...errors });
                                            return;
                                        }

                                        errors["partial_payment_amount"] = "";
                                        setErrors({ ...errors });

                                        formData.partial_payment_amount = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="validationCustom02"
                                    placeholder="Amount"
                                />
                                {errors.partial_payment_amount && (
                                    <div style={{ color: "red" }}>
                                        <i class="bi bi-x-lg"> </i>
                                        {errors.v}
                                    </div>
                                )}
                                {formData.partial_payment_amount && !errors.partial_payment_amount && (
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

export default OrderCreate;
