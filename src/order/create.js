import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
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
import "./style.css";
import { DebounceInput } from 'react-debounce-input';
//import BarcodeScannerComponent from "react-qr-barcode-scanner";
//import Quagga from 'quagga';
import ProductView from "./../product/view.js";

const OrderCreate = forwardRef((props, ref) => {


    useImperativeHandle(ref, () => ({
        open(id) {
            errors = {};
            setErrors({ ...errors });
            selectedProducts = [];
            setSelectedProducts([]);

            selectedStores = [];
            setSelectedStores([]);

            selectedCustomers = [];
            setSelectedCustomers([]);



            if (cookies.get("user_id")) {
                selectedDeliveredByUsers = [{
                    id: cookies.get("user_id"),
                    name: cookies.get("user_name"),
                }];
                formData.delivered_by = cookies.get("user_id");
                setFormData({ ...formData });
                setSelectedDeliveredByUsers([...selectedDeliveredByUsers]);
            }

            if (cookies.get('store_id')) {
                formData.store_id = cookies.get('store_id');
                formData.store_name = cookies.get('store_name');
                formData.vat_percent = parseFloat(cookies.get('vat_percent'));
                console.log("formData.store_id:", formData.store_id);
            }

            formData.id = undefined;
            formData.discount = 0.00;
            formData.discount_percent = 0.00;
            formData.shipping_handling_fees = 0.00;
            formData.partial_payment_amount = 0.00;
            formData.cash_discount = 0.00;
            formData.payment_method = "";
            formData.payment_status = "";
            formData.code = "";
            formData.net_total = 0.00;
            formData.date_str = new Date();
            formData.payments_input = [
                {
                    "date_str": formData.date_str,
                    // "amount": "",
                    "amount": 0.00,
                    "method": "",
                    "deleted": false,
                }
            ];
            formData.cash_discount = 0.00;

            if (id) {
                getOrder(id);
            }
            setFormData({ ...formData });
            reCalculate();
            setShow(true);

        },
    }));


    function getOrder(id) {
        console.log("inside get Order");
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

                formData = data.result;
                formData.date_str = data.result.date;
                if (data.result.payments) {
                    console.log("data.result.payments:", data.result.payments);
                    formData.payments_input = data.result.payments;
                    for (var i = 0; i < formData.payments_input?.length; i++) {
                        formData.payments_input[i].date_str = formData.payments_input[i].date
                    }
                }

                /*
                let order = data.result;
                formData = {
                    id: order.id,
                    code: order.code,
                    store_id: purchase.store_id,
                    vendor_id: purchase.vendor_id,
                    date_str: purchase.date,
                    // date: purchase.date,
                    vat_percent: purchase.vat_percent,
                    discount: purchase.discount,
                    discount_percent: purchase.discount_percent,
                    status: purchase.status,
                    order_placed_by: purchase.order_placed_by,
                    order_placed_by_signature_id: purchase.order_placed_by_signature_id,
                    is_discount_percent: purchase.is_discount_percent,
                    partial_payment_amount: purchase.partial_payment_amount,
                    payment_method: purchase.payment_method,
                    payment_status: purchase.payment_status,
                    shipping_handling_fees: purchase.shipping_handling_fees,
                };
                */

                if (formData.is_discount_percent) {
                    formData.discountValue = formData.discount_percent;
                } else {
                    formData.discountValue = formData.discount;
                }

                selectedProducts = formData.products;
                setSelectedProducts([...selectedProducts]);


                let selectedStores = [
                    {
                        id: formData.store_id,
                        name: formData.store_name,
                    }
                ];


                let searchLabel = formData.customer_name;

                let selectedCustomers = [
                    {
                        id: formData.customer_id,
                        name: formData.customer_name,
                        search_label: searchLabel,
                    }
                ];

                /*
                let selectedOrderPlacedByUsers = [
                    {
                        id: formData.created_by,
                        name: formData.created_by_name
                    }
                ];


                setSelectedOrderPlacedByUsers([...selectedOrderPlacedByUsers]);
                */

                setSelectedStores([...selectedStores]);
                setSelectedCustomers([...selectedCustomers]);

                reCalculate();
                setFormData({ ...formData });


            })
            .catch(error => {
                setProcessing(false);
                setErrors(error);
            });
    }

    useEffect(() => {
        const listener = event => {
            if (event.code === "Enter" || event.code === "NumpadEnter") {
                console.log("Enter key was pressed. Run your function-order.123");
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


    const selectedDate = new Date();

    //const history = useHistory();
    let [errors, setErrors] = useState({
        "payment_amount": [],
    });
    const [isProcessing, setProcessing] = useState(false);
    const cookies = new Cookies();

    //fields
    let [formData, setFormData] = useState({
        vat_percent: 15.0,
        discountValue: 0.00,
        discount: 0.00,
        discount_percent: 0.0,
        cash_discount: 0.00,
        is_discount_percent: false,
        date_str: new Date(),
        signature_date_str: format(new Date(), "MMM dd yyyy"),
        status: "delivered",
        payment_status: "",
        payment_method: "",
        price_type: "retail",
        useLaserScanner: false,
        store_id: "",
    });

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

    //Delivered By Auto Suggestion
    let [deliveredByUserOptions, setDeliveredByUserOptions] = useState([]);
    let [selectedDeliveredByUsers, setSelectedDeliveredByUsers] = useState([]);
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
                return `search[${key}]=` + encodeURIComponent(object[key]);
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

        let Select = "select=id,name,phone,name_in_arabic,phone_in_arabic,search_label";
        setIsCustomersLoading(true);
        let result = await fetch(
            "/v1/customer?" + Select + queryString,
            requestOptions
        );
        let data = await result.json();

        setCustomerOptions(data.result);
        setIsCustomersLoading(false);
    }

    function GetProductUnitPriceInStore(storeId, productStores) {
        if (!productStores) {
            return "";
        }

        for (var i = 0; i < productStores.length; i++) {
            console.log("productStores[i]:", productStores[i]);
            console.log("store_id:", storeId);

            if (productStores[i].store_id === storeId) {
                console.log("macthed");
                console.log(
                    "productStores[i].retail_unit_price:",
                    productStores[i].retail_unit_price
                );
                return productStores[i];
                /*
                if (formData.price_type === "retail") {
                    return unitPriceListArray[i].retail_unit_price;
                } else if (formData.price_type === "wholesale") {
                    return unitPriceListArray[i].wholesale_unit_price;
                } else if (formData.price_type === "purchase") {
                    return unitPriceListArray[i].purchase_unit_price;
                }
                */

            } else {
                console.log("not matched");
            }
        }
        return "";
    }



    let [openProductSearchResult, setOpenProductSearchResult] = useState(false);

    async function suggestProducts(searchTerm) {
        console.log("Inside handle suggestProducts");
        setProductOptions([]);

        console.log("searchTerm:" + searchTerm);
        if (!searchTerm) {
            openProductSearchResult = false;
            setOpenProductSearchResult(false);
            return;
        }

        var params = {
            name: searchTerm,
        };

        if (cookies.get("store_id")) {
            params.store_id = cookies.get("store_id");
        }


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

        let Select = "select=id,item_code,bar_code,part_number,name,unit,part_number,name_in_arabic,product_stores";
        setIsProductsLoading(true);
        let result = await fetch(
            "/v1/product?" + Select + queryString + "&limit=200",
            requestOptions
        );
        let data = await result.json();

        let products = data.result;
        if (!products || products.length === 0) {
            openProductSearchResult = false;
            setOpenProductSearchResult(false);
            setIsProductsLoading(false);
            return;
        }

        openProductSearchResult = true;
        setOpenProductSearchResult(true);
        setProductOptions(products);
        setIsProductsLoading(false);

    }

    async function getProductByBarCode(barcode) {
        formData.barcode = barcode;
        setFormData({ ...formData });
        console.log("Inside getProductByBarCode");
        errors["bar_code"] = "";
        setErrors({ ...errors });

        console.log("barcode:" + formData.barcode);
        if (!formData.barcode) {
            return;
        }

        if (formData.barcode.length === 13) {
            formData.barcode = formData.barcode.slice(0, -1);
        }

        const requestOptions = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: cookies.get("access_token"),
            },
        };


        let Select = "select=id,item_code,bar_code,ean_12,part_number,name,product_stores,unit,part_number,name_in_arabic";
        let result = await fetch(
            "/v1/product/barcode/" + formData.barcode + "?" + Select,
            requestOptions
        );
        let data = await result.json();


        let product = data.result;
        if (product) {
            addProduct(product);
        } else {
            errors["bar_code"] = "Invalid Barcode:" + formData.barcode
            setErrors({ ...errors });
        }

        formData.barcode = "";
        setFormData({ ...formData });

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
        let haveErrors = false;

        if (!formData.cash_discount) {
            formData.cash_discount = 0.00;
        }

        formData.products = [];
        for (var i = 0; i < selectedProducts.length; i++) {
            formData.products.push({
                product_id: selectedProducts[i].product_id,
                quantity: parseFloat(selectedProducts[i].quantity),
                unit_price: parseFloat(selectedProducts[i].unit_price),
                unit: selectedProducts[i].unit,
            });
        }

        errors["products"] = "";
        setErrors({ ...errors });

        if (formData.products.length === 0) {
            errors["products"] = "No products added";
            setErrors({ ...errors });
            haveErrors = true;
        }



        if (!validatePaymentAmounts()) {
            console.log("Errors on payments")
            haveErrors = true;
        }




        if (!formData.shipping_handling_fees && formData.shipping_handling_fees !== 0) {
            errors["shipping_handling_fees"] = "Invalid shipping / handling fees";
            setErrors({ ...errors });
            haveErrors = true;
        }

        /*
        if (formData.payment_status === "paid_partially" && !formData.partial_payment_amount && formData.partial_payment_amount !== 0) {
            errors["partial_payment_amount"] = "Invalid partial payment amount";
            setErrors({ ...errors });
            return;
        }

        if (formData.payment_status === "paid_partially" && formData.partial_payment_amount <= 0) {
            errors["partial_payment_amount"] = "Partial payment should be > 0 ";
            setErrors({ ...errors });
            return;
        }

        if (!formData.id && formData.payment_status === "paid_partially" && formData.partial_payment_amount >= netTotal) {
            errors["partial_payment_amount"] = "Partial payment cannot be >= " + netTotal;
            setErrors({ ...errors });
            return;
        }
        

        errors["payment_method"] = "";
        setErrors({ ...errors });
        if (!formData.id && formData.payment_status != "not_paid" && !formData.payment_method) {
            errors["payment_method"] = "Payment method is required";
            setErrors({ ...errors });
            return;
        }
        */


        if (!formData.discount && formData.discount !== 0) {
            errors["discount"] = "Invalid discount";
            setErrors({ ...errors });
            haveErrors = true;
        }

        if (!formData.discount_percent && formData.discount_percent !== 0) {
            errors["discount_percent"] = "Invalid discount percent";
            setErrors({ ...errors });
            haveErrors = true;
        }

        if (parseFloat(formData.discount_percent) > 100) {
            errors["discount_percent"] = "Discount percent cannot be > 100";
            setErrors({ ...errors });
            haveErrors = true;
        }

        if (!formData.vat_percent && formData.vat_percent !== 0) {
            errors["vat_percent"] = "Invalid vat percent";
            setErrors({ ...errors });
            haveErrors = true;
        }

        if (haveErrors) {
            console.log("Errors: ", errors);
            return;
        }



        formData.discount = parseFloat(formData.discount);
        formData.discount_percent = parseFloat(formData.discount_percent);
        formData.vat_percent = parseFloat(formData.vat_percent);
        formData.net_total = parseFloat(netTotal);

        if (cookies.get('store_id')) {
            formData.store_id = cookies.get('store_id');
        }


        let endPoint = "/v1/order";
        let method = "POST";
        if (formData.id) {
            endPoint = "/v1/order/" + formData.id;
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

    function getProductIndex(productID) {
        for (var i = 0; i < selectedProducts.length; i++) {
            if (selectedProducts[i].product_id === productID) {
                return i;
            }
        }
        return false;
    }


    function isProductAdded(productID) {
        for (var i = 0; i < selectedProducts.length; i++) {
            if (selectedProducts[i].product_id === productID) {
                return true;
            }
        }
        return false;
    }

    function GetProductStockInStore(storeId, productStores) {
        if (!productStores) {
            return 0.0;
        }

        for (var i = 0; i < productStores.length; i++) {
            if (productStores[i].store_id === storeId) {
                return productStores[i].stock;
            }
        }
        return 0.0;
    }

    function addProduct(product) {
        console.log("Inside Add product");
        if (!formData.store_id) {
            errors.product_id = "Please Select a Store and try again";
            setErrors({ ...errors });
            return;
        }


        errors.product_id = "";
        if (!product) {
            errors.product_id = "Invalid Product";
            setErrors({ ...errors });
            return;
        }

        /*
        let productStore = GetProductUnitPriceInStore(
            formData.store_id,
            product.stores
        );
        */
        // product.unit_price = productStore.retail_unit_price;

        if (product.product_stores[formData.store_id]) {
            product.unit_price = product.product_stores[formData.store_id].retail_unit_price;
        }


        errors.unit_price = "";
        if (!product.unit_price) {
            errors.unit_price = "Invalid Unit Price";
            setErrors({ ...errors });
            return;
        }

        let alreadyAdded = false;
        let index = false;
        let quantity = 0.00;
        product.quantity = 1.00;


        if (isProductAdded(product.id)) {
            alreadyAdded = true;
            index = getProductIndex(product.id);
            quantity = parseFloat(selectedProducts[index].quantity + product.quantity);
        } else {
            quantity = parseFloat(product.quantity);
        }

        console.log("quantity:", quantity);

        errors.quantity = "";

        //let stock = GetProductStockInStore(formData.store_id, product.stores);
        let stock = 0;

        if (product.product_stores[formData.store_id]) {
            stock = product.product_stores[formData.store_id].stock;
        }

        if (stock < quantity) {
            if (index === false) {
                index = selectedProducts.length;
            }
            // errors["quantity_" + index] = "Stock is only " + stock + " in Store: " + formData.store_name + " for product: " + product.name;
            errors["quantity_" + index] = "Warning: Available stock is " + stock
            console.log("errors:", errors);
            setErrors({ ...errors });
        }

        if (alreadyAdded) {
            selectedProducts[index].quantity = parseFloat(quantity);
        }

        if (!alreadyAdded) {
            selectedProducts.push({
                product_id: product.id,
                code: product.item_code,
                part_number: product.part_number,
                name: product.name,
                quantity: product.quantity,
                product_stores: product.product_stores,
                unit_price: parseFloat(product.unit_price).toFixed(2),
                unit: product.unit,
            });
        }
        setSelectedProducts([...selectedProducts]);
        reCalculate();
    }

    function removeProduct(product) {
        const index = selectedProducts.indexOf(product);
        if (product.quantity_returned > 0) {
            errors["product_" + index] = "This product cannot be removed as it is returned, Note: Please remove the product from sales return and try again"
            setErrors({ ...errors });
            return;
        }

        if (index > -1) {
            selectedProducts.splice(index, 1);
        }
        setSelectedProducts([...selectedProducts]);

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
        // totalPrice = totalPrice.toFixed(2);
        // totalPrice = Math.round(totalPrice * 100) / 100;
        setTotalPrice(totalPrice);
    }

    let [vatPrice, setVatPrice] = useState(0.00);

    function findVatPrice() {
        vatPrice = 0.00;
        if (totalPrice > 0) {
            console.log("formData.vat_percent:", formData.vat_percent);
            //(35.8 / 100) * 10000;

            vatPrice = (parseFloat(formData.vat_percent) / 100) * (parseFloat(totalPrice) + parseFloat(formData.shipping_handling_fees) - parseFloat(formData.discount));
            console.log("vatPrice:", vatPrice);
        }
        setVatPrice(vatPrice);
    }

    let [netTotal, setNetTotal] = useState(0.00);

    function RoundFloat(val, precision) {
        var ratio = Math.pow(10, precision);
        return Math.round(val * ratio) / ratio;
    }

    function findNetTotal() {
        netTotal = 0.00;
        if (totalPrice > 0) {
            netTotal = (parseFloat(totalPrice) + parseFloat(formData.shipping_handling_fees) - parseFloat(formData.discount) + parseFloat(vatPrice));
            netTotal = parseFloat(netTotal);
        }
        netTotal = RoundFloat(netTotal, 2);
        // netTotal = Math.round(netTotal * 100) / 100;
        setNetTotal(netTotal);

        if (!formData.id) {
            let method = "";
            if (formData.payments_input[0]) {
                method = formData.payments_input[0].method;
            }

            formData.payments_input = [{
                "date_str": formData.date_str,
                "amount": 0.00,
                "method": method,
                "deleted": false,
            }];

            if (netTotal > 0) {
                formData.payments_input[0].amount = parseFloat(netTotal.toFixed(2));
                if (formData.cash_discount) {
                    formData.payments_input[0].amount = formData.payments_input[0].amount - parseFloat(formData.cash_discount?.toFixed(2));
                }
                formData.payments_input[0].amount = parseFloat(formData.payments_input[0].amount.toFixed(2));
            }
        }

        /*
        if (formData.payments_input[0].amount === 0) {
            formData.payments_input[0].amount = "";
        }
        */
        setFormData({ ...formData });
        validatePaymentAmounts();
    }

    let [discountPercent, setDiscountPercent] = useState(0.00);

    function findDiscountPercent() {
        if (formData.discount >= 0 && totalPrice > 0) {
            discountPercent = parseFloat(parseFloat(formData.discount / totalPrice) * 100);
            setDiscountPercent(discountPercent);
            formData.discount_percent = discountPercent;
            //formData.discount_percent = Math.round(formData.discount_percent * 100) / 100;
            setFormData({ ...formData });
        }
    }

    function findDiscount() {
        if (formData.discount_percent >= 0 && totalPrice > 0) {
            formData.discount = parseFloat(totalPrice * parseFloat(formData.discount_percent / 100));
            // formData.discount = parseFloat(formData.discount.toFixed(2));
            setFormData({ ...formData });
        }
    }


    function reCalculate() {
        findTotalPrice();
        if (formData.is_discount_percent) {
            findDiscount();
        } else {
            findDiscountPercent();
        }
        findVatPrice();
        findNetTotal();
    }

    const DetailsViewRef = useRef();
    function openDetailsView(id) {
        DetailsViewRef.current.open(id);
    }

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

    function addNewPayment() {
        let date = new Date();
        if (!formData.id) {
            date = formData.date_str;
        }

        formData.payments_input.push({
            "date_str": date,
            // "amount": "",
            "amount": 0.00,
            "method": "",
            "deleted": false,
        });
        setFormData({ ...formData });
        validatePaymentAmounts();
        //validatePaymentAmounts((formData.payments_input.filter(payment => !payment.deleted).length - 1));
    }

    function findTotalPayments() {
        let totalPayment = 0.00;
        for (var i = 0; i < formData.payments_input?.length; i++) {
            if (formData.payments_input[i].amount && !formData.payments_input[i].deleted) {
                totalPayment += formData.payments_input[i].amount;
            }
        }

        totalPaymentAmount = totalPayment;
        console.log("totalPaymentAmount:", totalPaymentAmount);
        setTotalPaymentAmount(totalPaymentAmount);
        console.log("totalPayment:", totalPayment)
        balanceAmount = (parseFloat(netTotal.toFixed(2)) - parseFloat(parseFloat(formData.cash_discount)?.toFixed(2))) - parseFloat(totalPayment.toFixed(2));
        balanceAmount = parseFloat(balanceAmount.toFixed(2));
        setBalanceAmount(balanceAmount);

        if (balanceAmount === parseFloat((parseFloat(netTotal.toFixed(2)) - parseFloat(parseFloat(formData.cash_discount)?.toFixed(2))).toFixed(2))) {
            paymentStatus = "not_paid"
        } else if (balanceAmount <= 0) {
            paymentStatus = "paid"
        } else if (balanceAmount > 0) {
            paymentStatus = "paid_partially"
        }

        setPaymentStatus(paymentStatus);

        return totalPayment;
    }

    let [totalPaymentAmount, setTotalPaymentAmount] = useState(0.00);
    let [balanceAmount, setBalanceAmount] = useState(0.00);
    let [paymentStatus, setPaymentStatus] = useState("");



    function removePayment(key, validatePayments = false) {
        formData.payments_input.splice(key, 1);
        //formData.payments_input[key]["deleted"] = true;
        setFormData({ ...formData });
        if (validatePayments) {
            validatePaymentAmounts();
        }
        findTotalPayments()
    }


    function validatePaymentAmounts() {
        console.log("validatePaymentAmount: netTotal:", netTotal)
        errors["cash_discount"] = "";
        setErrors({ ...errors });

        let haveErrors = false;
        if (!netTotal) {
            /*
            removePayment(0, false);
            totalPaymentAmount = 0.0;
            setTotalPaymentAmount(0.00);
            balanceAmount = 0.00;
            setBalanceAmount(0.00);
            paymentStatus = "";
            setPaymentStatus(paymentStatus);
            */
            return true;
        }


        if (formData.cash_discount > 0 && formData.cash_discount >= netTotal) {
            errors["cash_discount"] = "Cash discount should not be >= " + netTotal.toFixed(2).toString();
            setErrors({ ...errors });
            haveErrors = true
            return false;
        }

        let totalPayment = findTotalPayments();

        // errors["payment_date"] = [];
        //errors["payment_method"] = [];
        //errors["payment_amount"] = [];
        for (var key = 0; key < formData.payments_input.length; key++) {
            errors["payment_amount_" + key] = "";
            errors["payment_date_" + key] = "";
            errors["payment_method_" + key] = "";
            setErrors({ ...errors });

            if (!formData.payments_input[key].amount) {
                errors["payment_amount_" + key] = "Payment amount is required";
                setErrors({ ...errors });
                haveErrors = true;
            } else if (formData.payments_input[key].amount === 0) {
                errors["payment_amount_" + key] = "Amount should be greater than zero";
                setErrors({ ...errors });
                haveErrors = true;
            }

            if (!formData.payments_input[key].date_str) {
                errors["payment_date_" + key] = "Payment date is required";
                setErrors({ ...errors });
                haveErrors = true;
            } else if ((new Date(formData.payments_input[key].date_str)) < (new Date(formData.date_str))) {
                errors["payment_date_" + key] = "Payment date time should be greater than or equal to order date time";
                setErrors({ ...errors });
                haveErrors = true;
            }

            if (!formData.payments_input[key].method) {
                errors["payment_method_" + key] = "Payment method is required";
                setErrors({ ...errors });
                haveErrors = true;
            }


            if ((formData.payments_input[key].amount || formData.payments_input[key].amount === 0) && !formData.payments_input[key].deleted) {
               /* let maxAllowedAmount = (netTotal - formData.cash_discount) - (totalPayment - formData.payments_input[key].amount);

                if (maxAllowedAmount < 0) {
                    maxAllowedAmount = 0;
                }

                /*
                
                if (maxAllowedAmount === 0) {
                    errors["payment_amount_" + key] = "Total amount should not exceed " + (netTotal - formData.cash_discount).toFixed(2).toString() + ", Please delete this payment";
                    setErrors({ ...errors });
                    haveErrors = true;
                } else if (formData.payments_input[key].amount > parseFloat(maxAllowedAmount.toFixed(2))) {
                    errors["payment_amount_" + key] = "Amount should not be greater than " + maxAllowedAmount.toFixed(2);
                    setErrors({ ...errors });
                    haveErrors = true;
                }
                */


            }
        }

        if (haveErrors) {
            return false;
        }

        return true;
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

            <OrderView ref={DetailsViewRef} openCreateForm={props.openCreateForm} />
            <ProductView ref={ProductDetailsViewRef} />
            <StoreCreate ref={StoreCreateFormRef} showToastMessage={props.showToastMessage} />
            <CustomerCreate ref={CustomerCreateFormRef} showToastMessage={props.showToastMessage} />
            <ProductCreate ref={ProductCreateFormRef} showToastMessage={props.showToastMessage} />
            <UserCreate ref={UserCreateFormRef} showToastMessage={props.showToastMessage} />
            <SignatureCreate ref={SignatureCreateFormRef} showToastMessage={props.showToastMessage} />


            <Modal show={show} size="xl" fullscreen
                onHide={handleClose} animation={false} backdrop="static" scrollable={true}>
                <Modal.Header>
                    <Modal.Title>
                        {formData.id ? "Update Sales Order #" + formData.code : "Create New Sales Order"}
                    </Modal.Title>

                    <div className="col align-self-end text-end">
                        <OrderPreview />
                        <Button variant="primary" onClick={handleCreate}>
                            {isProcessing ? formData.id ? "Updating...." : "Creating.." : formData.id ? "Update" : "Create"
                            }
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
                    {Object.keys(errors).length > 0 ?
                        <div>
                            <ul>

                                {errors && Object.keys(errors).map((key, index) => {
                                    console.log("Key",key);
                                    if (Array.isArray(errors[key])) {
                                        return (errors[key][0] ? <li style={{ color: "red" }}>{errors[key]}</li> : "");
                                    } else {
                                        return (errors[key] ? <li style={{ color: "red" }}>{errors[key]}</li> : "");
                                    }

                                })}
                            </ul></div> : ""}

                    <form className="row g-3 needs-validation" onSubmit={e => { e.preventDefault(); handleCreate(e); }} >
                        {!cookies.get('store_name') ? <div className="col-md-6">
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
                                        console.log("formData.store_id:", formData.store_id);
                                        selectedStores = selectedItems;
                                        setSelectedStores([...selectedItems]);

                                        if (formData.store_id) {
                                            if (selectedProduct[0] && selectedProduct[0].product_stores && selectedProduct[0].quantity) {
                                                let stock = 0;
                                                if (selectedProduct[0].product_stores) {
                                                    //stock = GetProductStockInStore(formData.store_id, selectedProduct[0].stores);
                                                    if (selectedProduct[0].product_stores[formData.store_id]) {
                                                        stock = selectedProduct[0].product_stores[formData.store_id].stock
                                                    }
                                                }

                                                if (stock < parseFloat(selectedProduct[0].quantity)) {
                                                    if (selectedStores[0]) {
                                                        errors.product_id = "Stock is only " + stock + " in Store: " + selectedStores[0].name + " for this product";
                                                    } else {
                                                        errors.product_id = "Stock is only " + stock + " in Selected Store for this product";
                                                    }

                                                    setErrors({ ...errors });
                                                }
                                            } else if (selectedProduct[0] && selectedProduct[0].product_stores) {
                                                let stock = 0;
                                                //stock = GetProductStockInStore(formData.store_id, selectedProduct[0].stores);
                                                if (selectedProduct[0].product_stores[formData.store_id]) {
                                                    stock = selectedProduct[0].product_stores[formData.store_id].stock
                                                }

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
                                                /*
                                                selectedProduct[0].unit_price = GetProductUnitPriceInStore(
                                                    formData.store_id,
                                                    selectedProduct[0].stores
                                                );
                                                */
                                                if (selectedProduct[0].product_stores[formData.store_id]) {
                                                    selectedProduct[0].unit_price = selectedProduct[0].product_stores[formData.store_id].retail_unit_price;
                                                }


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
                                    highlightOnlyResult={true}
                                    onInputChange={(searchTerm, e) => {
                                        suggestStores(searchTerm);
                                    }}
                                />

                                <Button hide={true.toString()} onClick={openStoreCreateForm} className="btn btn-outline-secondary btn-primary btn-sm" type="button" id="button-addon1"> <i className="bi bi-plus-lg"></i> New</Button>
                                <div style={{ color: "red" }}>
                                    <i className="bi x-lg"> </i>
                                    {errors.store_id}
                                </div>
                            </div>
                        </div> : ""}

                        <div className="col-md-6" style={{ border: "solid 0px" }}>
                            <label className="form-label">Customer*</label>
                            <Typeahead
                                id="customer_id"
                                labelKey="search_label"
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
                                placeholder="Type name or mob"
                                selected={selectedCustomers}
                                highlightOnlyResult={true}
                                onInputChange={(searchTerm, e) => {
                                    suggestCustomers(searchTerm);
                                }}
                            />
                            <Button hide={true.toString()} onClick={openCustomerCreateForm} className="btn btn-outline-secondary btn-primary btn-sm" type="button" id="button-addon1"> <i className="bi bi-plus-lg"></i> New</Button>
                            {errors.customer_id && (
                                <div style={{ color: "red" }}>
                                    <i className="bi bi-x-lg"> </i>
                                    {errors.customer_id}
                                </div>
                            )}

                        </div>

                        <div className="col-md-3">
                            <label className="form-label">Product Barcode Scan</label>

                            <div className="input-group mb-3">
                                <DebounceInput
                                    minLength={3}
                                    debounceTimeout={100}
                                    placeholder="Scan Barcode"
                                    className="form-control barcode"
                                    value={formData.barcode}
                                    onChange={event => getProductByBarCode(event.target.value)} />
                                {errors.bar_code && (
                                    <div style={{ color: "red" }}>
                                        <i className="bi bi-x-lg"> </i>
                                        {errors.bar_code}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">Date*</label>

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


                        <div className="col-md-12">
                            <label className="form-label">Product Search*</label>
                            {/*  
                            <Form.Check
                                type="switch"
                                as="input"
                                id="use_laser_scanner"
                                label="Use Laser Scanner to Read Barcode"
                                onChange={(e) => {

                                    formData.useLaserScanner = !formData.useLaserScanner;

                                    if (formData.useLaserScanner) {
                                        console.log("adding keydown event");
                                        document.addEventListener("keydown", keyPress);
                                    } else {
                                        console.log("removing keydown event");
                                        document.removeEventListener("keydown", keyPress);
                                    }

                                    console.log("e.target.value:", formData.useLaserScanner);

                                    setFormData({ ...formData });

                                }}
                            />
                            */}

                            <Typeahead
                                id="product_id"
                                size="lg"
                                labelKey="search_label"
                                emptyLabel=""
                                clearButton={true}
                                open={openProductSearchResult}
                                isLoading={isProductsLoading}
                                isInvalid={errors.product_id ? true : false}
                                onChange={(selectedItems) => {
                                    if (selectedItems.length === 0) {
                                        errors["product_id"] = "Invalid Product selected";
                                        setErrors(errors);
                                        return;
                                    }
                                    errors["product_id"] = "";
                                    setErrors({ ...errors });

                                    if (formData.store_id) {
                                        addProduct(selectedItems[0]);

                                    }
                                    setOpenProductSearchResult(false);
                                }}
                                options={productOptions}
                                selected={selectedProduct}
                                placeholder="Search By Part No. / Name / Name in Arabic"
                                highlightOnlyResult={true}
                                onInputChange={(searchTerm, e) => {
                                    suggestProducts(searchTerm);
                                }}
                            />
                            <Button hide={true.toString()} onClick={openProductCreateForm} className="btn btn-outline-secondary btn-primary btn-sm" type="button" id="button-addon1"> <i className="bi bi-plus-lg"></i> New</Button>
                            {errors.product_id ? (
                                <div style={{ color: "red" }}>
                                    <i className="bi bi-x-lg"> </i>
                                    {errors.product_id}
                                </div>
                            ) : ""}
                        </div>



                        <div className="table-responsive" style={{ overflowX: "auto", maxHeight: "400px", overflowY: "auto" }}>
                            <table className="table table-striped table-sm table-bordered">
                                <thead>
                                    <tr className="text-center">
                                        <th style={{ width: "3%" }}>Remove</th>
                                        <th style={{ width: "5%" }}>SI No.</th>
                                        <th style={{ width: "10%" }}>Part No.</th>
                                        <th style={{ width: "30%" }} className="text-start">Name</th>
                                        <th style={{ width: "15%" }} >Qty</th>
                                        <th style={{ width: "18%" }}>Unit Price</th>
                                        <th style={{ width: "32%" }}>Price</th>

                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedProducts.map((product, index) => (
                                        <tr className="text-center" key={index}>
                                            <td>
                                                <div
                                                    style={{ color: "red", cursor: "pointer" }}
                                                    onClick={() => {
                                                        removeProduct(product);
                                                    }}
                                                >
                                                    <i className="bi bi-x-lg"> </i>
                                                </div>
                                            </td>
                                            <td >{index + 1}</td>
                                            <td  >{product.part_number}</td>
                                            <td style={{
                                                textDecoration: "underline",
                                                color: "blue",
                                                cursor: "pointer",

                                            }}
                                                className="text-start"
                                                onClick={() => {
                                                    openProductDetailsView(product.product_id);
                                                }}>
                                                {product.name}

                                                {errors["product_" + index] && (
                                                    <div style={{ color: "red" }}>
                                                        {errors["product_" + index]}
                                                    </div>
                                                )}
                                            </td>
                                            <td >

                                                <div className="input-group mb-3">
                                                    <input type="number" value={product.quantity} className="form-control text-end"

                                                        placeholder="Quantity" onChange={(e) => {
                                                            errors["quantity_" + index] = "";
                                                            setErrors({ ...errors });
                                                            if (!e.target.value) {
                                                                errors["quantity_" + index] = "Invalid Quantity";
                                                                selectedProducts[index].quantity = e.target.value;
                                                                setSelectedProducts([...selectedProducts]);
                                                                setErrors({ ...errors });
                                                                console.log("errors:", errors);
                                                                return;
                                                            }

                                                            if (e.target.value === 0) {
                                                                errors["quantity_" + index] = "Quantity should be > 0";
                                                                selectedProducts[index].quantity = e.target.value;
                                                                setSelectedProducts([...selectedProducts]);
                                                                setErrors({ ...errors });
                                                                console.log("errors:", errors);
                                                                return;
                                                            }

                                                            product.quantity = parseFloat(e.target.value);
                                                            selectedProducts[index].quantity = parseFloat(e.target.value);
                                                            reCalculate();

                                                            let stock = 0;
                                                            if (selectedProducts[index].product_stores) {
                                                                stock = selectedProducts[index].product_stores[formData.store_id]?.stock;
                                                                // stock = GetProductStockInStore(formData.store_id, selectedProducts[index].stores);
                                                            }

                                                            if (stock < parseFloat(e.target.value) && selectedProducts[index].product_stores) {
                                                                // errors["quantity_" + index] = " Warning: Stock is only " + stock + " in Store: " + formData.store_name + " for this product";
                                                                errors["quantity_" + index] = " Warning: Available stock is " + stock;
                                                                setErrors({ ...errors });
                                                                return;
                                                            }

                                                            selectedProducts[index].quantity = parseFloat(e.target.value);
                                                            console.log("selectedProducts[index].quantity:", selectedProducts[index].quantity);
                                                            setSelectedProducts([...selectedProducts]);
                                                            reCalculate();

                                                        }} />
                                                    <span className="input-group-text" id="basic-addon2">{selectedProducts[index].unit ? selectedProducts[index].unit : "Units"}</span>
                                                </div>
                                                {errors["quantity_" + index] && (
                                                    <div style={{ color: "red" }}>
                                                        {errors["quantity_" + index]}
                                                    </div>
                                                )}

                                            </td>
                                            <td>

                                                <div className="input-group mb-3">
                                                    <input type="number" value={product.unit_price} className="form-control text-end"

                                                        placeholder="Unit Price" onChange={(e) => {
                                                            errors["unit_price_" + index] = "";
                                                            setErrors({ ...errors });
                                                            if (!e.target.value) {
                                                                errors["unit_price_" + index] = "Invalid Unit Price";
                                                                selectedProducts[index].unit_price = parseFloat(e.target.value);
                                                                setSelectedProducts([...selectedProducts]);
                                                                setErrors({ ...errors });
                                                                console.log("errors:", errors);
                                                                return;
                                                            }

                                                            if (e.target.value === 0) {
                                                                errors["unit_price_" + index] = "Unit Price should be > 0";
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

                                                        }} />
                                                    <span className="input-group-text" id="basic-addon2">SAR</span>
                                                </div>
                                                {errors["unit_price_" + index] && (
                                                    <div style={{ color: "red" }}>
                                                        <i className="bi bi-x-lg"> </i>
                                                        {errors["unit_price_" + index]}
                                                    </div>
                                                )}

                                            </td>
                                            <td className="text-end" >
                                                <NumberFormat
                                                    value={(product.unit_price * product.quantity).toFixed(2)}
                                                    displayType={"text"}
                                                    thousandSeparator={true}
                                                    suffix={" SAR"}
                                                    renderText={(value, props) => value}
                                                />
                                            </td>
                                        </tr>
                                    )).reverse()}
                                </tbody>
                            </table>
                        </div>
                        <div className="table-responsive">
                            <table className="table table-striped table-sm table-bordered">
                                <tbody>
                                    <tr>


                                        <th colSpan="8" className="text-end">Total</th>
                                        <td className="text-end" style={{ width: "200px" }} >
                                            <NumberFormat
                                                value={totalPrice?.toFixed(2)}
                                                displayType={"text"}
                                                thousandSeparator={true}
                                                suffix={" SAR"}
                                                renderText={(value, props) => value}
                                            />
                                        </td>
                                    </tr>
                                    <tr>
                                        <th colSpan="8" className="text-end">
                                            Shipping & Handling Fees
                                        </th>
                                        <td className="text-end">
                                            <input type="number" style={{ width: "150px" }} className="text-start" value={formData.shipping_handling_fees} onChange={(e) => {

                                                if (parseFloat(e.target.value) === 0) {
                                                    formData.shipping_handling_fees = parseFloat(e.target.value);
                                                    setFormData({ ...formData });
                                                    errors["shipping_handling_fees"] = "";
                                                    setErrors({ ...errors });
                                                    reCalculate();
                                                    return;
                                                }

                                                if (parseFloat(e.target.value) < 0) {
                                                    formData.shipping_handling_fees = parseFloat(e.target.value);
                                                    setFormData({ ...formData });
                                                    errors["shipping_handling_fees"] = "Shipping / Handling Fees should be > 0";
                                                    setErrors({ ...errors });
                                                    reCalculate();
                                                    return;
                                                }

                                                if (!e.target.value) {
                                                    formData.shipping_handling_fees = "";
                                                    errors["shipping_handling_fees"] = "Invalid Shipping / Handling Fees";
                                                    setFormData({ ...formData });
                                                    setErrors({ ...errors });
                                                    return;
                                                }

                                                errors["shipping_handling_fees"] = "";
                                                setErrors({ ...errors });

                                                formData.shipping_handling_fees = parseFloat(e.target.value);
                                                setFormData({ ...formData });
                                                reCalculate();
                                            }} />
                                            {" SAR"}
                                            {errors.shipping_handling_fees && (
                                                <div style={{ color: "red" }}>
                                                    {errors.shipping_handling_fees}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                    <tr>
                                        <th colSpan="8" className="text-end">
                                            Discount  <input type="number" style={{ width: "50px" }} className="text-start" value={formData.discount_percent} onChange={(e) => {
                                                formData.is_discount_percent = true;
                                                if (parseFloat(e.target.value) === 0) {
                                                    formData.discount_percent = parseFloat(e.target.value);
                                                    setFormData({ ...formData });
                                                    errors["discount_percent"] = "";
                                                    setErrors({ ...errors });
                                                    reCalculate();
                                                    return;
                                                }

                                                if (parseFloat(e.target.value) < 0) {
                                                    formData.discount_percent = parseFloat(e.target.value);
                                                    formData.discount = 0.00;
                                                    setFormData({ ...formData });
                                                    errors["discount_percent"] = "Discount percent should be >= 0";
                                                    setErrors({ ...errors });
                                                    reCalculate();
                                                    return;
                                                }

                                                if (!e.target.value) {
                                                    formData.discount_percent = "";
                                                    formData.discount = 0.00;
                                                    errors["discount_percent"] = "Invalid Discount Percent";
                                                    setFormData({ ...formData });
                                                    setErrors({ ...errors });
                                                    return;
                                                }

                                                errors["discount_percent"] = "";
                                                errors["discount"] = "";
                                                setErrors({ ...errors });

                                                formData.discount_percent = parseFloat(e.target.value);
                                                setFormData({ ...formData });
                                                reCalculate();
                                            }} />{"%"}
                                            {errors.discount_percent && (
                                                <div style={{ color: "red" }}>
                                                    {errors.discount_percent}
                                                </div>
                                            )}
                                        </th>
                                        <td className="text-end">
                                            <input type="number" style={{ width: "150px" }} className="text-start" value={formData.discount} onChange={(e) => {
                                                formData.is_discount_percent = false;
                                                if (parseFloat(e.target.value) === 0) {
                                                    formData.discount = parseFloat(e.target.value);
                                                    setFormData({ ...formData });
                                                    errors["discount"] = "";
                                                    setErrors({ ...errors });
                                                    reCalculate();
                                                    return;
                                                }

                                                if (parseFloat(e.target.value) < 0) {
                                                    formData.discount = parseFloat(e.target.value);
                                                    formData.discount_percent = 0.00;
                                                    setFormData({ ...formData });
                                                    errors["discount"] = "Discount should be >= 0";
                                                    setErrors({ ...errors });
                                                    reCalculate();
                                                    return;
                                                }

                                                if (!e.target.value) {
                                                    formData.discount = "";
                                                    formData.discount_percent = 0.00;
                                                    errors["discount"] = "Invalid Discount";
                                                    setFormData({ ...formData });
                                                    reCalculate();
                                                    setErrors({ ...errors });
                                                    return;
                                                }

                                                errors["discount"] = "";
                                                errors["discount_percent"] = "";
                                                setErrors({ ...errors });

                                                formData.discount = parseFloat(e.target.value);
                                                setFormData({ ...formData });
                                                reCalculate();
                                            }} />
                                            {" SAR"}
                                            {errors.discount && (
                                                <div style={{ color: "red" }}>
                                                    {errors.discount}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                    <tr>

                                        <th colSpan="8" className="text-end"> VAT  <input type="number" className="text-center" style={{ width: "50px" }} value={formData.vat_percent} onChange={(e) => {
                                            console.log("Inside onchange vat percent");
                                            if (parseFloat(e.target.value) === 0) {
                                                formData.vat_percent = parseFloat(e.target.value);
                                                setFormData({ ...formData });
                                                errors["vat_percent"] = "";
                                                setErrors({ ...errors });
                                                reCalculate();
                                                return;
                                            }
                                            if (parseFloat(e.target.value) < 0) {
                                                formData.vat_percent = parseFloat(e.target.value);
                                                vatPrice = 0.00;
                                                setVatPrice(vatPrice);
                                                setFormData({ ...formData });
                                                errors["vat_percent"] = "Vat percent should be >= 0";
                                                setErrors({ ...errors });
                                                reCalculate();
                                                return;
                                            }


                                            if (!e.target.value) {
                                                formData.vat_percent = "";
                                                vatPrice = 0.00;
                                                setVatPrice(vatPrice);
                                                //formData.discount_percent = 0.00;
                                                errors["vat_percent"] = "Invalid vat percent";
                                                setFormData({ ...formData });
                                                setErrors({ ...errors });
                                                return;
                                            }
                                            errors["vat_percent"] = "";
                                            setErrors({ ...errors });

                                            formData.vat_percent = e.target.value;
                                            reCalculate();
                                            setFormData({ ...formData });
                                            console.log(formData);
                                        }} />{"%"}
                                            {errors.vat_percent && (
                                                <div style={{ color: "red" }}>
                                                    {errors.vat_percent}
                                                </div>
                                            )}
                                        </th>
                                        <td className="text-end">
                                            <NumberFormat
                                                value={vatPrice?.toFixed(2)}
                                                displayType={"text"}
                                                thousandSeparator={true}
                                                suffix={" SAR"}
                                                renderText={(value, props) => value}
                                            />
                                        </td>
                                    </tr>
                                    <tr>

                                        <th colSpan="8" className="text-end">Net Total</th>
                                        <th className="text-end">
                                            <NumberFormat
                                                value={netTotal?.toFixed(2)}
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
                        {/*
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
                                    highlightOnlyResult={true}
                                    onInputChange={(searchTerm, e) => {
                                        suggestSignatures(searchTerm);
                                    }}
                                />

                                <Button hide={true.toString()} onClick={openSignatureCreateForm} className="btn btn-outline-secondary btn-primary btn-sm" type="button" id="button-addon1"> <i className="bi bi-plus-lg"></i> New</Button>
                                {errors.delivered_by_signature_id ? (
                                    <div style={{ color: "red" }}>
                                        <i className="bi bi-x-lg"> </i>{" "}
                                        {errors.delivered_by_signature_id}
                                    </div>
                                ) : ""}
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
                                        <i className="bi bi-x-lg"> </i>
                                        {errors.signature_date_str}
                                    </div>
                                )}
                            </div>
                        </div>
                                */}
                        <div className="col-md-2">
                            <label className="form-label">Cash discount</label>
                            <input type='number' value={formData.cash_discount} className="form-control "
                                onChange={(e) => {
                                    errors["cash_discount"] = "";
                                    setErrors({ ...errors });
                                    if (!e.target.value) {
                                        formData.cash_discount = e.target.value;
                                        setFormData({ ...formData });
                                        validatePaymentAmounts();
                                        return;
                                    }
                                    formData.cash_discount = parseFloat(e.target.value);
                                    if (formData.cash_discount > 0 && formData.cash_discount >= netTotal) {
                                        errors["cash_discount"] = "Cash discount should not be >= " + netTotal.toString();
                                        setErrors({ ...errors });
                                        return;
                                    }

                                    setFormData({ ...formData });
                                    validatePaymentAmounts();
                                    console.log(formData);
                                }}
                            />
                            {errors.cash_discount && (
                                <div style={{ color: "red" }}>
                                    <i className="bi bi-x-lg"> </i>
                                    {errors.cash_discount}
                                </div>
                            )}
                        </div>

                        <div className="col-md-8">
                            <label className="form-label">Payments Received</label>

                            <div class="table-responsive" style={{ maxWidth: "900px" }}>
                                <Button variant="secondary" style={{ alignContent: "right", marginBottom: "10px" }} onClick={addNewPayment}>
                                    Create new payment
                                </Button>
                                <table class="table table-striped table-sm table-bordered">
                                    {formData.payments_input && formData.payments_input.length > 0 &&
                                        <thead>
                                            <th>
                                                Date
                                            </th>
                                            <th>
                                                Amount
                                            </th>
                                            <th>
                                                Payment method
                                            </th>
                                            <th>
                                                Action
                                            </th>
                                        </thead>}
                                    <tbody>
                                        {formData.payments_input &&
                                            formData.payments_input.filter(payment => !payment.deleted).map((payment, key) => (
                                                <tr key={key}>
                                                    <td style={{ minWidth: "220px" }}>

                                                        <DatePicker
                                                            id="payment_date_str"
                                                            selected={formData.payments_input[key].date_str ? new Date(formData.payments_input[key].date_str) : null}
                                                            value={formData.payments_input[key].date_str ? format(
                                                                new Date(formData.payments_input[key].date_str),
                                                                "MMMM d, yyyy h:mm aa"
                                                            ) : null}
                                                            className="form-control"
                                                            dateFormat="MMMM d, yyyy h:mm aa"
                                                            showTimeSelect
                                                            timeIntervals="1"
                                                            onChange={(value) => {
                                                                console.log("Value", value);
                                                                formData.payments_input[key].date_str = value;
                                                                setFormData({ ...formData });
                                                            }}
                                                        />
                                                        {errors["payment_date_" + key] && (
                                                            <div style={{ color: "red" }}>
                                                                <i className="bi bi-x-lg"> </i>
                                                                {errors["payment_date_" + key]}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td style={{ width: "300px" }}>
                                                        <input type='number' value={formData.payments_input[key].amount} className="form-control "
                                                            onChange={(e) => {
                                                                errors["payment_amount_" + key] = "";
                                                                setErrors({ ...errors });

                                                                if (!e.target.value) {
                                                                    formData.payments_input[key].amount = e.target.value;
                                                                    setFormData({ ...formData });
                                                                    validatePaymentAmounts();
                                                                    return;
                                                                }

                                                                formData.payments_input[key].amount = parseFloat(e.target.value);

                                                                validatePaymentAmounts();
                                                                setFormData({ ...formData });
                                                                console.log(formData);
                                                            }}
                                                        />
                                                        {errors["payment_amount_" + key] && (
                                                            <div style={{ color: "red" }}>
                                                                <i className="bi bi-x-lg"> </i>
                                                                {errors["payment_amount_" + key]}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td style={{ width: "200px" }}>
                                                        <select value={formData.payments_input[key].method} className="form-control "
                                                            onChange={(e) => {
                                                                // errors["payment_method"] = [];
                                                                errors["payment_method_" + key] = "";
                                                                setErrors({ ...errors });

                                                                if (!e.target.value) {
                                                                    errors["payment_method_" + key] = "Payment method is required";
                                                                    setErrors({ ...errors });

                                                                    formData.payments_input[key].method = "";
                                                                    setFormData({ ...formData });
                                                                    return;
                                                                }

                                                                // errors["payment_method"] = "";
                                                                //setErrors({ ...errors });

                                                                formData.payments_input[key].method = e.target.value;
                                                                setFormData({ ...formData });
                                                                console.log(formData);
                                                            }}
                                                        >
                                                            <option value="">Select</option>
                                                            <option value="cash">Cash</option>
                                                            <option value="bank_account">Bank Account / Debit / Credit Card</option>
                                                            <option value="customer_account">Customer Account</option>
                                                        </select>
                                                        {errors["payment_method_" + key] && (
                                                            <div style={{ color: "red" }}>
                                                                <i className="bi bi-x-lg"> </i>
                                                                {errors["payment_method_" + key]}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td style={{ width: "200px" }}>
                                                        <Button variant="danger" onClick={(event) => {
                                                            removePayment(key);
                                                        }}>
                                                            Remove
                                                        </Button>

                                                    </td>
                                                </tr>
                                            ))}
                                        <tr>
                                            <td class="text-end">
                                                <b>Total</b>
                                            </td>
                                            <td><b style={{ marginLeft: "14px" }}>{totalPaymentAmount?.toFixed(2)}</b>

                                            </td>
                                            <td>
                                                <b style={{ marginLeft: "12px", alignSelf: "end" }}>Balance: {balanceAmount?.toFixed(2)}</b>
                                            </td>
                                            <td colSpan={1}>
                                                <b>Payment status: </b>
                                                {paymentStatus == "paid" ?
                                                    <span className="badge bg-success">
                                                        Paid
                                                    </span> : ""}
                                                {paymentStatus == "paid_partially" ?
                                                    <span className="badge bg-warning">
                                                        Paid Partially
                                                    </span> : ""}
                                                {paymentStatus == "not_paid" ?
                                                    <span className="badge bg-danger">
                                                        Not Paid
                                                    </span> : ""}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                      
                        <Modal.Footer>
                            <Button variant="secondary" onClick={handleClose}>
                                Close
                            </Button>
                            <Button variant="primary" onClick={handleCreate}>
                                {isProcessing ? formData.id ? "Updating...." : "Creating.." : formData.id ? "Update" : "Create"
                                }
                            </Button>
                        </Modal.Footer>
                    </form>
                </Modal.Body>

            </Modal >


        </>
    );
});

export default OrderCreate;
