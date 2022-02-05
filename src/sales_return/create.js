import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from "react";
import SalesReturnPreview from "./preview.js";
import { Modal, Button } from "react-bootstrap";
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
import SalesReturnView from "./view.js";
import BarcodeScannerComponent from "react-qr-barcode-scanner";
import Quagga from 'quagga';
import ProductView from "./../product/view.js";

const SalesReturnCreate = forwardRef((props, ref) => {

    useImperativeHandle(ref, () => ({
        open(id) {
            formData = {
                order_id: id,
                vat_percent: 15.0,
                discount: 0.0,
                date_str: format(new Date(), "MMM dd yyyy"),
                signature_date_str: format(new Date(), "MMM dd yyyy"),
                status: "received",
                payment_status: "paid",
                payment_method: "cash",
                price_type: "retail"
            };
            setFormData({ ...formData });
            if (id) {
                getOrder(id);
            }
            setShow(true);

        },

    }));

    function getOrder(id) {
        console.log("inside get SalesReturn");
        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': cookies.get('access_token'),
            },
        };

        fetch('/v1/order/' + id, requestOptions)
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

                let selectedProductsTemp = order.products;
                selectedProducts = [];
                for (let i = 0; i < selectedProductsTemp.length; i++) {
                    selectedProductsTemp[i].selected = false;
                    let soldQty = selectedProductsTemp[i].quantity - selectedProductsTemp[i].quantity_returned;
                    selectedProductsTemp[i].quantity = soldQty;

                    if (soldQty > 0) {
                        selectedProducts.push(selectedProductsTemp[i]);
                    }
                }

                // selectedProducts = selectedProductsTemp

                console.log("selectedProducts:", selectedProducts);
                setSelectedProducts([...selectedProducts]);



                //formData = order;
                console.log("order.id:", order.id);
                formData.id = "";
                formData.products = order.products;
                // formData.order_id = order.id;
                //console.log("formData.order_id:", formData.order_id);
                formData.order_code = order.code;
                formData.store_id = order.store_id;
                formData.received_by = order.delivered_by;
                formData.received_by_signature_id = order.delivered_by_signature_id;
                formData.customer_id = order.customer_id;

                // formData.discount = 0.0;

                setFormData({ ...formData });
                console.log("formData:", formData);


                selectedStores = [
                    {
                        id: order.store_id,
                        name: order.store_name,
                    }
                ];

                setSelectedStores(selectedStores);
                console.log("selectedStores:", selectedStores);

                let selectedCustomers = [
                    {
                        id: order.customer_id,
                        name: order.customer_name,
                    }
                ];

                let selectedReceivedByUsers = [
                    {
                        id: order.delivered_by,
                        name: order.delivered_by_name
                    }
                ];

                if (order.delivered_by_signature_id) {
                    let selectedReceivedBySignatures = [
                        {
                            id: order.delivered_by_signature_id,
                            name: order.delivered_by_signature_name,
                        }
                    ];
                    setSelectedReceivedBySignatures([...selectedReceivedBySignatures]);
                }

                setSelectedReceivedByUsers([...selectedReceivedByUsers]);


                setSelectedCustomers([...selectedCustomers]);


                reCalculate();
            })
            .catch(error => {
                setProcessing(false);
                setErrors(error);
            });
    }

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
        order_id: "",
        vat_percent: 15.0,
        discount: 0.0,
        date_str: format(new Date(), "MMM dd yyyy"),
        signature_date_str: format(new Date(), "MMM dd yyyy"),
        status: "received",
        payment_status: "paid",
        payment_method: "cash",
        price_type: "retail",
    });

    let [unitPriceList, setUnitPriceList] = useState([]);

    //Store Auto Suggestion
    const [storeOptions, setStoreOptions] = useState([]);
    let [selectedStores, setSelectedStores] = useState([]);
    const [isStoresLoading, setIsStoresLoading] = useState(false);

    //Customer Auto Suggestion
    const [customerOptions, setCustomerOptions] = useState([]);
    let [selectedCustomers, setSelectedCustomers] = useState([]);
    const [isCustomersLoading, setIsCustomersLoading] = useState(false);

    //Product Auto Suggestion
    const [productOptions, setProductOptions] = useState([]);
    let [selectedProduct, setSelectedProduct] = useState([]);
    let [selectedProducts, setSelectedProducts] = useState([]);
    const [isProductsLoading, setIsProductsLoading] = useState(false);

    //Received By Auto Suggestion
    const [receivedByUserOptions, setReceivedByUserOptions] = useState([]);
    let [selectedReceivedByUsers, setSelectedReceivedByUsers] = useState([]);
    const [isReceivedByUsersLoading, setIsReceivedByUsersLoading] =
        useState(false);

    //Received By Signature Auto Suggestion
    const [receivedBySignatureOptions, setReceivedBySignatureOptions] =
        useState([]);
    const [selectedReceivedBySignatures, setSelectedReceivedBySignatures] =
        useState([]);
    const [isReceivedBySignaturesLoading, setIsReceivedBySignaturesLoading] =
        useState(false);

    const [show, setShow] = useState(false);

    function handleClose() {
        setShow(false);
    }

    useEffect(() => {
        let at = cookies.get("access_token");
        if (!at) {
            // history.push("/dashboard/salesreturns");
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
        setReceivedByUserOptions([]);

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
        setIsReceivedByUsersLoading(true);
        let result = await fetch(
            "/v1/user?" + Select + queryString,
            requestOptions
        );
        let data = await result.json();

        setReceivedByUserOptions(data.result);
        setIsReceivedByUsersLoading(false);
    }

    async function suggestSignatures(searchTerm) {
        console.log("Inside handle suggestSignatures");
        setReceivedBySignatureOptions([]);

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
        setIsReceivedBySignaturesLoading(true);
        let result = await fetch(
            "/v1/signature?" + Select + queryString,
            requestOptions
        );
        let data = await result.json();

        setReceivedBySignatureOptions(data.result);
        setIsReceivedBySignaturesLoading(false);
    }

    function handleCreate(event) {
        event.preventDefault();
        console.log("Inside handle Create");
        console.log("selectedProducts:", selectedProducts);
        console.log("formData.order_id:", formData.order_id);

        formData.products = [];
        for (var i = 0; i < selectedProducts.length; i++) {
            if (!selectedProducts[i].selected) {
                continue;
            }

            formData.products.push({
                product_id: selectedProducts[i].product_id,
                quantity: parseFloat(selectedProducts[i].quantity),
                unit_price: parseFloat(selectedProducts[i].unit_price),
                unit: selectedProducts[i].unit,
            });
        }

        //return;
        formData.discount = parseFloat(formData.discount);
        formData.vat_percent = parseFloat(formData.vat_percent);
        formData.partial_payment_amount = parseFloat(formData.partial_payment_amount);
        console.log("formData.discount:", formData.discount);


        let endPoint = "/v1/sales-return";
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
                props.showToastMessage("SalesReturn Created Successfully!", "success");
                // props.refreshList();
                handleClose();

                openDetailsView(data.result.id);
            })
            .catch((error) => {
                setProcessing(false);
                console.log("Inside catch");
                console.log(error);
                setErrors({ ...error });
                console.error("There was an error!", error);
                props.showToastMessage("Error Creating SalesReturn!", "danger");
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
            if (!selectedProducts[i].selected) {
                continue;
            }
            totalPrice +=
                parseFloat(selectedProducts[i].unit_price) *
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
        netTotal = (parseFloat(totalPrice) + parseFloat(vatPrice) - parseFloat(formData.discount)).toFixed(2);
        setNetTotal(netTotal);
    }

    function reCalculate() {
        findTotalPrice();
        findVatPrice();
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

            <SalesReturnView ref={DetailsViewRef} />
            <ProductView ref={ProductDetailsViewRef} />
            <StoreCreate ref={StoreCreateFormRef} showToastMessage={props.showToastMessage} />
            <CustomerCreate ref={CustomerCreateFormRef} showToastMessage={props.showToastMessage} />
            <ProductCreate ref={ProductCreateFormRef} showToastMessage={props.showToastMessage} />
            <UserCreate ref={UserCreateFormRef} showToastMessage={props.showToastMessage} />
            <SignatureCreate ref={SignatureCreateFormRef} showToastMessage={props.showToastMessage} />


            <Modal show={show} size="xl" onHide={handleClose} animation={false} backdrop={true}>
                <Modal.Header>
                    <Modal.Title>
                        {"Create Sales Return for Sales Order #" + formData.order_code}
                    </Modal.Title>

                    <div className="col align-self-end text-end">
                        <SalesReturnPreview />
                        {/*
                        <button
                            className="btn btn-primary mb-3"
                            data-bs-toggle="modal"
                            data-bs-target="#previewSalesReturnModal"
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
                    {selectedProducts.length == 0 && "Already Returned All sold products"}
                    {selectedProducts.length > 0 && <form className="row g-3 needs-validation" onSubmit={handleCreate}>
                        <h2>Select Products</h2>
                        {errors["product_id"] && (
                            <div style={{ color: "red" }}>
                                <i class="bi bi-x-lg"> </i>
                                {errors["product_id"]}
                            </div>
                        )}
                        <div className="table-responsive" style={{ overflowX: "auto" }}>
                            <table className="table table-striped table-sm table-bordered">
                                <thead>
                                    <tr className="text-center">
                                        <th>Select</th>
                                        <th>SI No.</th>
                                        <th>CODE</th>
                                        <th>Name</th>
                                        <th>Qty</th>
                                        <th>Unit Price</th>
                                        <th>Price</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedProducts.map((product, index) => (
                                        <tr className="text-center">
                                            <td>
                                                <input type="checkbox" checked={selectedProducts[index].selected} onChange={(e) => {
                                                    console.log("e.target.value:", e.target.value)
                                                    selectedProducts[index].selected = !selectedProducts[index].selected;
                                                    setSelectedProducts([...selectedProducts]);
                                                    reCalculate();
                                                }} />
                                            </td>
                                            <td>{index + 1}</td>
                                            <td>{product.item_code}</td>
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

                                                <input type="number" value={(product.quantity)} className="form-control"

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
                                                        selectedProducts[index].quantity = parseFloat(e.target.value);
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
                                        </tr>
                                    ))}
                                    <tr>
                                        <td colSpan="4"></td>
                                        <td className="text-center">

                                        </td>
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
                                        <th colSpan="5" className="text-end">
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
                                        <th colSpan="6" className="text-end">
                                            Discount
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
                                        <td colSpan="5"></td>
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

                        <div className="col-md-4">
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

                        <div className="col-md-4">
                            <label className="form-label">Discount*</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.discount}
                                    type='number'
                                    onChange={(e) => {
                                        console.log("Inside onchange vat discount");
                                        if (isNaN(e.target.value)) {
                                            errors["discount"] = "Invalid Discount";
                                            setErrors({ ...errors });
                                            return;
                                        }

                                        errors["discount"] = "";
                                        setErrors({ ...errors });

                                        formData.discount = e.target.value;
                                        findNetTotal();
                                        setFormData({ ...formData });
                                        console.log(formData);
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
                        <div className="col-md-4">
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
                                    <option value="received">Received</option>
                                    <option value="salesreturn_placed">Sales Return Placed</option>
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

                        <div className="col-md-6">
                            <label className="form-label">Received By*</label>

                            <div className="input-group mb-3">
                                <Typeahead
                                    id="received_by"
                                    labelKey="name"
                                    isLoading={isReceivedByUsersLoading}
                                    isInvalid={errors.received_by ? true : false}
                                    onChange={(selectedItems) => {
                                        errors.received_by = "";
                                        setErrors(errors);
                                        if (selectedItems.length === 0) {
                                            errors.received_by = "Invalid User Selected";
                                            setErrors(errors);
                                            setFormData({ ...formData });
                                            setSelectedReceivedByUsers([]);
                                            return;
                                        }
                                        formData.received_by = selectedItems[0].id;
                                        setFormData({ ...formData });
                                        setSelectedReceivedByUsers(selectedItems);
                                    }}
                                    options={receivedByUserOptions}
                                    placeholder="Select User"
                                    selected={selectedReceivedByUsers}
                                    highlightOnlyResult="true"
                                    onInputChange={(searchTerm, e) => {
                                        suggestUsers(searchTerm);
                                    }}
                                />

                                <Button hide={true} onClick={openUserCreateForm} className="btn btn-outline-secondary btn-primary btn-sm" type="button" id="button-addon1"> <i className="bi bi-plus-lg"></i> New</Button>
                                {errors.received_by ? (
                                    <div style={{ color: "red" }}>
                                        <i class="bi bi-x-lg"> </i> {errors.received_by}
                                    </div>
                                ) : null}
                                {formData.received_by && !errors.received_by && (
                                    <div style={{ color: "green" }}>
                                        <i class="bi bi-check-lg"> </i>Looks good!
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="col-md-6">
                            <label className="form-label">
                                Received By Signature(Optional)
                            </label>

                            <div className="input-group mb-3">
                                <Typeahead
                                    id="received_by_signature_id"
                                    labelKey="name"
                                    isLoading={isReceivedBySignaturesLoading}
                                    isInvalid={errors.received_by_signature_id ? true : false}
                                    onChange={(selectedItems) => {
                                        errors.received_by_signature_id = "";
                                        setErrors(errors);
                                        if (selectedItems.length === 0) {
                                            errors.received_by_signature_id =
                                                "Invalid Signature Selected";
                                            setErrors(errors);
                                            setFormData({ ...formData });
                                            setSelectedReceivedBySignatures([]);
                                            return;
                                        }
                                        formData.received_by_signature_id = selectedItems[0].id;
                                        setFormData({ ...formData });
                                        setSelectedReceivedBySignatures(selectedItems);
                                    }}
                                    options={receivedBySignatureOptions}
                                    placeholder="Select Signature"
                                    selected={selectedReceivedBySignatures}
                                    highlightOnlyResult="true"
                                    onInputChange={(searchTerm, e) => {
                                        suggestSignatures(searchTerm);
                                    }}
                                />

                                <Button hide={true} onClick={openSignatureCreateForm} className="btn btn-outline-secondary btn-primary btn-sm" type="button" id="button-addon1"> <i className="bi bi-plus-lg"></i> New</Button>
                                {errors.received_by_signature_id ? (
                                    <div style={{ color: "red" }}>
                                        <i class="bi bi-x-lg"> </i>{" "}
                                        {errors.received_by_signature_id}
                                    </div>
                                ) : null}
                                {formData.received_by_signature_id &&
                                    !errors.received_by_signature_id && (
                                        <div style={{ color: "green" }}>
                                            <i class="bi bi-check-lg"> </i> Looks good!
                                        </div>
                                    )}
                            </div>
                        </div>

                        <div className="col-md-4">
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
                                        //findNetTotal();
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
                                        animation="bsalesreturn"
                                        size="sm"
                                        role="status"
                                        aria-hidden="true"
                                    /> + " Creating..."

                                    : formData.id ? "Update" : "Create"
                                }
                            </Button>
                        </Modal.Footer>
                    </form>}
                </Modal.Body>

            </Modal>


        </>
    );
});

export default SalesReturnCreate;
