import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import PurchasePreview from "./preview.js";
import { Modal, Button } from "react-bootstrap";
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


            formData = {
                vat_percent: 15.0,
                discount: 0.0,
                discountValue: 0.0,
                discount_percent: 0.0,
                shipping_handling_fees: 0.00,
                partial_payment_amount: 0.00,
                is_discount_percent: false,
                date_str: new Date(),
                signature_date_str: format(new Date(), "MMM dd yyyy"),
                status: "delivered",
                payment_method: "",
                payment_status: "paid",

            };

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


            if (cookies.get('store_id')) {
                formData.store_id = cookies.get('store_id');
                formData.store_name = cookies.get('store_name');
            }

            if (cookies.get("user_id")) {
                selectedOrderPlacedByUsers = [{
                    id: cookies.get("user_id"),
                    name: cookies.get("user_name"),
                }];
                formData.order_placed_by = cookies.get("user_id");
                formData.vat_percent = parseFloat(cookies.get('vat_percent'));
                setFormData({ ...formData });
                setSelectedOrderPlacedByUsers([...selectedOrderPlacedByUsers]);
            }

            setFormData({ ...formData });

            if (id) {
                getPurchase(id);
            }
            reCalculate();
            setShow(true);
        },

    }));

    useEffect(() => {
        const listener = event => {
            if (event.code === "Enter" || event.code === "NumpadEnter") {
                console.log("Enter key was pressed. Run your function-purchase.");
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


    useEffect(() => {
        console.log("inside change on formData:", formData);
        // localStorage

    });


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
    let selectedProduct = [];
    let [selectedProducts, setSelectedProducts] = useState([]);
    const [isProductsLoading, setIsProductsLoading] = useState(false);

    //Order Placed By Auto Suggestion

    let [selectedOrderPlacedByUsers, setSelectedOrderPlacedByUsers] = useState([]);

    //Order Placed By Signature Auto Suggestion

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
                    date_str: purchase.date,
                    // date: purchase.date,
                    vat_percent: purchase.vat_percent,
                    discount: purchase.discount,
                    cash_discount: purchase.cash_discount,
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

                if (data.result.payments) {
                    console.log("data.result.payments:", data.result.payments);
                    formData.payments_input = data.result.payments;
                    for (var i = 0; i < formData.payments_input?.length; i++) {
                        formData.payments_input[i].date_str = formData.payments_input[i].date
                    }
                }

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
                        search_label: purchase.vendor_name,
                    }
                ];

                let selectedOrderPlacedByUsers = [
                    {
                        id: purchase.order_placed_by,
                        name: purchase.order_placed_by_name
                    }
                ];



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

        let Select = "select=id,name,phone,name_in_arabic,phone_in_arabic,search_label";
        setIsVendorsLoading(true);
        let result = await fetch(
            "/v1/vendor?" + Select + queryString,
            requestOptions
        );
        let data = await result.json();

        setVendorOptions(data.result);
        setIsVendorsLoading(false);
    }


    let [openProductSearchResult, setOpenProductSearchResult] = useState(false);

    async function suggestProducts(searchTerm) {
        console.log("Inside handle suggestProducts");
        setProductOptions([]);

        console.log("searchTerm:" + searchTerm);
        if (!searchTerm) {
            openProductSearchResult = false;
            setOpenProductSearchResult(false);
            setIsProductsLoading(false);
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

        let Select = "select=id,item_code,bar_code,name,product_stores,unit,part_number,name_in_arabic";
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

    function handleCreate(event) {
        event.preventDefault();
        console.log("Inside handle Create");
        console.log("selectedProducts:", selectedProducts);

        if (!formData.cash_discount) {
            formData.cash_discount = 0.00;
        }

        formData.products = [];
        for (var i = 0; i < selectedProducts.length; i++) {
            formData.products.push({
                product_id: selectedProducts[i].product_id,
                quantity: parseFloat(selectedProducts[i].quantity),
                unit: selectedProducts[i].unit,
                purchase_unit_price: parseFloat(selectedProducts[i].purchase_unit_price),
                retail_unit_price: parseFloat(selectedProducts[i].retail_unit_price),
                wholesale_unit_price: parseFloat(selectedProducts[i].wholesale_unit_price),
                discount: selectedProducts[i].discount ? parseFloat(selectedProducts[i].discount) : 0,
                discount_percent: selectedProducts[i].discount_percent ? parseFloat(selectedProducts[i].discount_percent) : 0,
            });
        }

        formData.discount = parseFloat(formData.discount);
        formData.discount_percent = parseFloat(formData.discount_percent);
        formData.vat_percent = parseFloat(formData.vat_percent);
        formData.net_total = parseFloat(netTotal);
        console.log("formData.discount:", formData.discount);
        console.log("formData.discount_percent:", formData.discount_percent);

        if (!formData.shipping_handling_fees && formData.shipping_handling_fees !== 0) {
            errors["shipping_handling_fees"] = "Invalid shipping / handling fees";
            setErrors({ ...errors });
            return;
        }

        if (!formData.discount && formData.discount !== 0) {
            errors["discount"] = "Invalid discount";
            setErrors({ ...errors });
            return;
        }

        if (!formData.discount_percent && formData.discount_percent !== 0) {
            errors["discount_percent"] = "Invalid discount percent";
            setErrors({ ...errors });
            return;
        }

        if (parseFloat(formData.discount_percent) > 100) {
            errors["discount_percent"] = "Discount percent cannot be > 100";
            setErrors({ ...errors });
            return;
        }

        if (!formData.vat_percent && formData.vat_percent !== 0) {
            errors["vat_percent"] = "Invalid vat percent";
            setErrors({ ...errors });
            return;
        }

        if (cookies.get('store_id')) {
            formData.store_id = cookies.get('store_id');
        }

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
                props.openDetailsView(data.result.id);
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

        if (product.product_stores) {
            /*
            productStore = GetProductUnitPriceInStore(
                formData.store_id,
                product.stores
            );
            */

            if (product.product_stores[formData.store_id]) {
                product.purchase_unit_price = product.product_stores[formData.store_id].purchase_unit_price;
                product.retail_unit_price = product.product_stores[formData.store_id].retail_unit_price;
                product.wholesale_unit_price = product.product_stores[formData.store_id].wholesale_unit_price;
                product.discount = 0.00;
                product.discount_percent = 0.00;
            }

        }




        let alreadyAdded = false;
        let index = -1;
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

        if (alreadyAdded) {
            selectedProducts[index].quantity = parseFloat(quantity);
            // setSelectedProducts([...selectedProducts]);
        }

        if (!alreadyAdded) {
            let item = {
                product_id: product.id,
                code: product.item_code,
                part_number: product.part_number,
                name: product.name,
                quantity: product.quantity,
                product_stores: product.product_stores,
                unit: product.unit,
                discount: product.discount,
                discount_percent: product.discount_percent,
            };

            if (product.purchase_unit_price) {
                item.purchase_unit_price = parseFloat(product.purchase_unit_price).toFixed(2);
            }

            if (product.retail_unit_price) {
                item.retail_unit_price = parseFloat(product.retail_unit_price).toFixed(2);
            }

            if (product.wholesale_unit_price) {
                item.wholesale_unit_price = parseFloat(product.wholesale_unit_price).toFixed(2);
            }

            selectedProducts.push(item);

        }
        setSelectedProducts([...selectedProducts]);
        reCalculate();

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
        setFormData({ ...formData });
    }

    function getProductIndex(productID) {
        for (var i = 0; i < selectedProducts.length; i++) {
            if (selectedProducts[i].product_id === productID) {
                return i;
            }
        }
        return false;
    }

    function removeProduct(product) {


        const index = selectedProducts.indexOf(product);
        if (index > -1) {
            selectedProducts.splice(index, 1);
        }

        if (product.quantity_returned > 0) {
            errors["product_" + index] = "This product cannot be removed as it is returned, Note: Please remove the product from purchase return and try again"
            setErrors({ ...errors });
            return;
        }

        setSelectedProducts([...selectedProducts]);
        reCalculate();
    }

    let [totalPrice, setTotalPrice] = useState(0.0);

    function findTotalPrice() {
        totalPrice = 0.00;
        for (var i = 0; i < selectedProducts.length; i++) {
            let productDiscount = 0.00;
            if (selectedProducts[i].discount) {
                productDiscount = selectedProducts[i].discount;
            }
            totalPrice +=
                (parseFloat(selectedProducts[i].purchase_unit_price) *
                    parseFloat(selectedProducts[i].quantity)) - productDiscount;
        }
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

        setFormData({ ...formData });
        //  console.log(" netTotal:", netTotal);
        validatePaymentAmounts();

    }

    function RoundFloat(val, precision) {
        var ratio = Math.pow(10, precision);
        return Math.round(val * ratio) / ratio;
    }

    let [discountPercent, setDiscountPercent] = useState(0.00);

    function findDiscountPercent() {
        if (formData.discount >= 0 && totalPrice > 0) {
            discountPercent = parseFloat(parseFloat(formData.discount / totalPrice) * 100).toFixed(2);
            setDiscountPercent(discountPercent);
            formData.discount_percent = discountPercent;
            setFormData({ ...formData });
        }
    }

    function findDiscount() {
        if (formData.discount_percent >= 0 && totalPrice > 0) {
            formData.discount = parseFloat(totalPrice * parseFloat(formData.discount_percent / 100)).toFixed(2);
            setFormData({ ...formData });
        }
    }

    function findProductDiscountPercent(productIndex) {
        let price = (parseFloat(selectedProducts[productIndex].purchase_unit_price) * parseFloat(selectedProducts[productIndex].quantity));
        if (selectedProducts[productIndex] && selectedProducts[productIndex].discount
            && parseFloat(selectedProducts[productIndex].discount) >= 0
            && price > 0) {

            let discountPercent = parseFloat(parseFloat(selectedProducts[productIndex].discount / price) * 100);
            selectedProducts[productIndex].discount_percent = discountPercent;
            setSelectedProducts([...selectedProducts]);

        }
    }

    function findProductDiscount(productIndex) {
        let price = (selectedProducts[productIndex].purchase_unit_price * selectedProducts[productIndex].quantity);

        if (selectedProducts[productIndex] && selectedProducts[productIndex].discount_percent
            && selectedProducts[productIndex].discount_percent >= 0
            && price > 0) {
            selectedProducts[productIndex].discount = parseFloat(price * parseFloat(selectedProducts[productIndex].discount_percent / 100));
            setSelectedProducts([...selectedProducts]);
        }
    }


    function reCalculate(productIndex) {
        if (selectedProducts[productIndex] && selectedProducts[productIndex]) {
            if (selectedProducts[productIndex] && selectedProducts[productIndex].is_discount_percent) {
                findProductDiscount(productIndex);
            } else {
                findProductDiscountPercent(productIndex);
            }
        }

        findTotalPrice();

        if (formData.is_discount_percent) {
            findDiscount();
        } else {
            findDiscountPercent();
        }
        findVatPrice();
        findNetTotal();
    }

    function addNewPayment() {
        let date = new Date();
        if (!formData.id) {
            date = formData.date_str;
        }

        if (!formData.payments_input) {
            formData.payments_input = [];
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
        for (var key = 0; key < formData.payments_input?.length; key++) {
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
            } /*else if ((new Date(formData.payments_input[key].date_str)) < (new Date(formData.date_str))) {
                errors["payment_date_" + key] = "Payment date time should be greater than or equal to order date time";
                setErrors({ ...errors });
                haveErrors = true;
            }*/

            if (!formData.payments_input[key].method) {
                errors["payment_method_" + key] = "Payment method is required";
                setErrors({ ...errors });
                haveErrors = true;
            }


            if ((formData.payments_input[key].amount || formData.payments_input[key].amount === 0) && !formData.payments_input[key].deleted) {
                let maxAllowedAmount = (netTotal - formData.cash_discount) - (totalPayment - formData.payments_input[key].amount);

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


    const StoreCreateFormRef = useRef();
    function openStoreCreateForm() {
        StoreCreateFormRef.current.open();
    }

    const ProductCreateFormRef = useRef();
    function openProductCreateForm() {
        ProductCreateFormRef.current.open();
    }

    function openProductUpdateForm(id) {
        ProductCreateFormRef.current.open(id);
    }

    const VendorCreateFormRef = useRef();
    function openVendorCreateForm() {
        VendorCreateFormRef.current.open();
    }

    const UserCreateFormRef = useRef();



    const SignatureCreateFormRef = useRef();


    const ProductDetailsViewRef = useRef();
    function openProductDetailsView(id) {
        ProductDetailsViewRef.current.open(id);
    }

    return (
        <>
            <ProductView ref={ProductDetailsViewRef} openUpdateForm={openProductUpdateForm} openCreateForm={openProductCreateForm} />
            <ProductCreate ref={ProductCreateFormRef} showToastMessage={props.showToastMessage} openDetailsView={openProductDetailsView} />

            <StoreCreate ref={StoreCreateFormRef} showToastMessage={props.showToastMessage} />

            <UserCreate ref={UserCreateFormRef} showToastMessage={props.showToastMessage} />
            <SignatureCreate ref={SignatureCreateFormRef} showToastMessage={props.showToastMessage} />
            <VendorCreate ref={VendorCreateFormRef} showToastMessage={props.showToastMessage} />
            <Modal show={show} size="xl" fullscreen onHide={handleClose} animation={false} backdrop="static" scrollable={true}>
                <Modal.Header>
                    <Modal.Title>
                        {formData.id ? "Update Purchase #" + formData.code : "Create New Purchase"}
                    </Modal.Title>

                    <div className="col align-self-end text-end">
                        <PurchasePreview />
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
                    {Object.keys(errors).length > 0 ?
                        <div>
                            <ul>

                                {errors && Object.keys(errors).map((key, index) => {
                                    return (errors[key] ? <li style={{ color: "red" }}>{errors[key]}</li> : "");
                                })}
                            </ul></div> : ""}
                    <form className="row g-3 needs-validation" onSubmit={handleCreate}>
                        {!cookies.get('store_name') ? <div className="col-md-6">
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
                                {formData.store_id && !errors.store_id && (
                                    <div style={{ color: "green" }}>
                                        <i className="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>
                        </div> : ""}
                        <div className="col-md-6">
                            <label className="form-label">Purchase From Vendor*</label>
                            <Typeahead
                                id="vendor_id"
                                labelKey="search_label"
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
                                placeholder="Type name or mob"
                                selected={selectedVendors}
                                highlightOnlyResult={true}
                                onInputChange={(searchTerm, e) => {
                                    suggestVendors(searchTerm);
                                }}
                            />
                            <Button hide={true.toString()} onClick={openVendorCreateForm} className="btn btn-outline-secondary btn-primary btn-sm" type="button" id="button-addon1"> <i className="bi bi-plus-lg"></i> New</Button>
                            {errors.vendor_id && (
                                <div style={{ color: "red" }}>
                                    <i className="bi bi-x-lg"> </i>
                                    {errors.vendor_id}
                                </div>
                            )}
                            {formData.vendor_id && !errors.vendor_id && (
                                <div style={{ color: "green" }}>
                                    <i className="bi bi-check-lg"> </i>
                                    Looks good!
                                </div>
                            )}
                        </div>
                        {/*
                        <div className="col-md-3">
                            <label className="form-label">Product Barcode Scan</label>

                            <div className="input-group mb-3">
                                <DebounceInput
                                    minLength={12}
                                    debounceTimeout={500}
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
                                {formData.bar_code && !errors.bar_code && (
                                    <div style={{ color: "green" }}>
                                        <i className="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>
                        </div>
                                */}

                        <div className="col-md-3">
                            <label className="form-label">Vendor Invoice No. (Optional)</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.vendor_invoice_no ? formData.vendor_invoice_no : ""}
                                    type='string'
                                    onChange={(e) => {
                                        errors["vendor_invoice_no"] = "";
                                        setErrors({ ...errors });
                                        formData.vendor_invoice_no = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="vendor_invoice_no"
                                    placeholder="Vendor Invoice No."
                                />
                                {errors.vendor_invoice_no && (
                                    <div style={{ color: "red" }}>
                                        <i className="bi bi-x-lg"> </i>
                                        {errors.vendor_invoice_no}
                                    </div>
                                )}
                                {formData.vendor_invoice_no && !errors.rack && (
                                    <div style={{ color: "green" }}>
                                        <i className="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">Date Time*</label>

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
                            <label className="form-label">Product*</label>


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
                            {selectedProduct[0] &&
                                selectedProduct[0].id &&
                                !errors.product_id && (
                                    <div style={{ color: "green" }}>
                                        <i className="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}

                        </div>

                        <div className="table-responsive" style={{ overflowX: "auto", maxHeight: "400px", overflowY: "auto" }}>
                            <table className="table table-striped table-sm table-bordered">
                                <thead>
                                    <tr className="text-center">
                                        <th style={{ width: "2%" }}>Remove</th>
                                        <th style={{ width: "5%" }}>SI No.</th>
                                        <th style={{ width: "8%" }}>Part No.</th>
                                        <th style={{ width: "20%" }} className="text-start">Name</th>
                                        <th style={{ width: "11%" }}>Qty</th>
                                        <th style={{ width: "11%" }}>Unit Price</th>
                                        <th style={{ width: "10%" }}>Discount</th>
                                        <th style={{ width: "10%" }}>Discount%</th>
                                        <th style={{ width: "11%" }}>Set latest wholesale unit price</th>
                                        <th style={{ width: "11%" }}>Set latest retail unit price</th>
                                        <th style={{ width: "15%" }}>Price</th>

                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedProducts.map((product, index) => (
                                        <tr key={index} className="text-center">
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
                                            <td>{index + 1}</td>
                                            <td>{product.part_number}</td>
                                            <td style={{
                                                textDecoration: "underline",
                                                color: "blue",
                                                cursor: "pointer",
                                            }}
                                                className="text-start"
                                                onClick={() => {
                                                    openProductDetailsView(product.product_id);
                                                    console.log("okk,id:", product.product_id);
                                                }}>{product.name}
                                            </td>
                                            <td style={{ width: "155px" }}>

                                                <div className="input-group mb-3">
                                                    <input type="number" value={product.quantity} className="form-control"

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
                                                                errors["quantity_" + index] = "Invalid Quantity should be > 0";
                                                                selectedProducts[index].quantity = parseFloat(e.target.value);
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

                                                        }} />
                                                    <span className="input-group-text" id="basic-addon2">{selectedProducts[index].unit ? selectedProducts[index].unit : "Units"}</span>
                                                </div>
                                                {errors["quantity_" + index] && (
                                                    <div style={{ color: "red" }}>
                                                        <i className="bi bi-x-lg"> </i>
                                                        {errors["quantity_" + index]}
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ width: "180px" }}>
                                                <div className="input-group mb-3">
                                                    <input type="number" value={product.purchase_unit_price} className="form-control"

                                                        placeholder="Purchase Unit Price" onChange={(e) => {
                                                            errors["purchase_unit_price_" + index] = "";
                                                            setErrors({ ...errors });

                                                            if (!e.target.value) {
                                                                errors["purchase_unit_price_" + index] = "Invalid Purchase Unit Price";
                                                                selectedProducts[index].purchase_unit_price = parseFloat(e.target.value);
                                                                setSelectedProducts([...selectedProducts]);
                                                                setErrors({ ...errors });
                                                                console.log("errors:", errors);
                                                                return;
                                                            }

                                                            if (e.target.value === 0) {
                                                                errors["purchase_unit_price_" + index] = "Purchase Unit Price should be > 0";
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

                                                        }} />
                                                </div>

                                                {errors["purchase_unit_price_" + index] && (
                                                    <div style={{ color: "red" }}>
                                                        <i className="bi bi-x-lg"> </i>
                                                        {errors["purchase_unit_price_" + index]}
                                                    </div>
                                                )}

                                            </td>

                                            <td>
                                                <div className="input-group mb-3">
                                                    <input type="number" className="form-control text-end" value={selectedProducts[index].discount} onChange={(e) => {
                                                        selectedProducts[index].is_discount_percent = false;
                                                        if (parseFloat(e.target.value) === 0) {
                                                            selectedProducts[index].discount = parseFloat(e.target.value);
                                                            setFormData({ ...formData });
                                                            errors["discount_" + index] = "";
                                                            setErrors({ ...errors });
                                                            reCalculate(index);
                                                            return;
                                                        }

                                                        if (parseFloat(e.target.value) < 0) {
                                                            selectedProducts[index].discount = parseFloat(e.target.value);
                                                            selectedProducts[index].discount_percent = 0.00;
                                                            setFormData({ ...formData });
                                                            errors["discount_" + index] = "Discount should be >= 0";
                                                            setErrors({ ...errors });
                                                            reCalculate(index);
                                                            return;
                                                        }

                                                        if (!e.target.value) {
                                                            selectedProducts[index].discount = "";
                                                            selectedProducts[index].discount_percent = "";
                                                            // errors["discount_" + index] = "Invalid Discount";
                                                            setFormData({ ...formData });
                                                            reCalculate(index);
                                                            //setErrors({ ...errors });
                                                            return;
                                                        }

                                                        errors["discount_" + index] = "";
                                                        errors["discount_percent_" + index] = "";
                                                        setErrors({ ...errors });

                                                        selectedProducts[index].discount = parseFloat(e.target.value);
                                                        setFormData({ ...formData });
                                                        reCalculate(index);
                                                    }} />
                                                </div>
                                                {" "}
                                                {errors["discount_" + index] && (
                                                    <div style={{ color: "red" }}>
                                                        {errors["discount_" + index]}
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                <div className="input-group mb-3">
                                                    <input type="number" className="form-control text-end" value={selectedProducts[index].discount_percent} onChange={(e) => {
                                                        selectedProducts[index].is_discount_percent = true;
                                                        if (parseFloat(e.target.value) === 0) {
                                                            selectedProducts[index].discount_percent = parseFloat(e.target.value);
                                                            setFormData({ ...formData });
                                                            errors["discount_percent_" + index] = "";
                                                            setErrors({ ...errors });
                                                            reCalculate(index);
                                                            return;
                                                        }

                                                        if (parseFloat(e.target.value) < 0) {
                                                            selectedProducts[index].discount_percent = parseFloat(e.target.value);
                                                            selectedProducts[index].discount = 0.00;
                                                            setFormData({ ...formData });
                                                            errors["discount_percent_" + index] = "Discount percent should be >= 0";
                                                            setErrors({ ...errors });
                                                            reCalculate(index);
                                                            return;
                                                        }

                                                        if (!e.target.value) {
                                                            selectedProducts[index].discount_percent = "";
                                                            selectedProducts[index].discount = "";
                                                            //errors["discount_percent_" + index] = "Invalid Discount Percent";
                                                            setFormData({ ...formData });
                                                            reCalculate(index);
                                                            //setErrors({ ...errors });
                                                            return;
                                                        }

                                                        errors["discount_percent_" + index] = "";
                                                        errors["discount_" + index] = "";
                                                        setErrors({ ...errors });

                                                        selectedProducts[index].discount_percent = parseFloat(e.target.value);
                                                        setFormData({ ...formData });
                                                        reCalculate(index);
                                                    }} />{""}
                                                </div>
                                                {errors["discount_percent_" + index] && (
                                                    <div style={{ color: "red" }}>
                                                        {errors["discount_percent_" + index]}
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ width: "180px" }}>
                                                <div className="input-group mb-3">
                                                    <input type="number" value={product.wholesale_unit_price} className="form-control"

                                                        placeholder="Wholesale Unit Price" onChange={(e) => {
                                                            errors["wholesale_unit_price_" + index] = "";
                                                            setErrors({ ...errors });
                                                            if (!e.target.value) {
                                                                errors["wholesale_unit_price_" + index] = "Invalid Wholesale Unit Price";
                                                                selectedProducts[index].wholesale_unit_price = parseFloat(e.target.value);
                                                                setSelectedProducts([...selectedProducts]);
                                                                setErrors({ ...errors });
                                                                console.log("errors:", errors);
                                                                return;
                                                            }

                                                            if (e.target.value === 0) {
                                                                errors["wholesale_unit_price_" + index] = "Wholesale Unit Price should be > 0";
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

                                                        }} />

                                                </div>

                                                {errors["wholesale_unit_price_" + index] && (
                                                    <div style={{ color: "red" }}>
                                                        <i className="bi bi-x-lg"> </i>
                                                        {errors["wholesale_unit_price_" + index]}
                                                    </div>
                                                )}

                                            </td>
                                            <td style={{ width: "180px" }}>
                                                <div className="input-group mb-3">
                                                    <input type="number" value={product.retail_unit_price} className="form-control"

                                                        placeholder="Retail Unit Price" onChange={(e) => {
                                                            errors["retail_unit_price_" + index] = "";
                                                            setErrors({ ...errors });
                                                            if (!e.target.value) {
                                                                errors["retail_unit_price_" + index] = "Invalid Retail Unit Price";
                                                                selectedProducts[index].retail_unit_price = parseFloat(e.target.value);
                                                                setSelectedProducts([...selectedProducts]);
                                                                setErrors({ ...errors });
                                                                console.log("errors:", errors);
                                                                return;
                                                            }

                                                            if (e.target.value === 0) {
                                                                errors["retail_unit_price_" + index] = "Retail Unit Price should be > 0";
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

                                                        }} />

                                                </div>

                                                {errors["retail_unit_price_" + index] && (
                                                    <div style={{ color: "red" }}>
                                                        <i className="bi bi-x-lg"> </i>
                                                        {errors["retail_unit_price_" + index]}
                                                    </div>
                                                )}

                                            </td>
                                            <td className="text-end">
                                                <NumberFormat
                                                    value={((product.purchase_unit_price * product.quantity) - product.discount).toFixed(2)}
                                                    displayType={"text"}
                                                    thousandSeparator={true}
                                                    suffix={""}
                                                    renderText={(value, props) => value}
                                                />
                                            </td>

                                        </tr>
                                    )).reverse()}
                                </tbody>
                            </table>
                        </div>

                        <div className="table-responsive" style={{ overflowX: "auto" }}>
                            <table className="table table-striped table-sm table-bordered">
                                <tbody>
                                    <tr>
                                        <th style={{ width: "90%" }} colSpan="8" className="text-end">Total</th>
                                        <td style={{ width: "10%" }} className="text-end">
                                            <NumberFormat
                                                value={totalPrice?.toFixed(2)}
                                                displayType={"text"}
                                                thousandSeparator={true}
                                                suffix={""}
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
                                            {""}
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
                                            {""}
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
                                                suffix={""}
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
                                                suffix={""}
                                                renderText={(value, props) => value}
                                            />
                                        </th>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

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
                            <label className="form-label">Payments Paid</label>

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
                                                            <option value="vendor_account">Vendor Account</option>
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
                                                {paymentStatus === "paid" ?
                                                    <span className="badge bg-success">
                                                        Paid
                                                    </span> : ""}
                                                {paymentStatus === "paid_partially" ?
                                                    <span className="badge bg-warning">
                                                        Paid Partially
                                                    </span> : ""}
                                                {paymentStatus === "not_paid" ?
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
                            <Button variant="primary" onClick={handleCreate} >
                                {isProcessing ?
                                    <Spinner
                                        as="span"
                                        animation="border"
                                        size="sm"
                                        role="status"
                                        aria-hidden={true}
                                    /> + " Creating..."

                                    : formData.id ? "Update" : "Create"
                                }
                            </Button>
                        </Modal.Footer>
                    </form>
                </Modal.Body >

            </Modal >


        </>
    );
});

export default PurchaseCreate;
