import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import Preview from "./../order/preview.js";
import { Modal, Button } from "react-bootstrap";
import StoreCreate from "../store/create.js";
import VendorCreate from "./../vendor/create.js";
import ProductCreate from "./../product/create.js";
import UserCreate from "./../user/create.js";
import SignatureCreate from "./../signature/create.js";

import { Typeahead } from "react-bootstrap-typeahead";
import NumberFormat from "react-number-format";
import DatePicker from "react-datepicker";
import { format } from "date-fns";
import { Spinner } from "react-bootstrap";
import ProductView from "./../product/view.js";
import { trimTo2Decimals } from "../utils/numberUtils";
import ResizableTableCell from './../utils/ResizableTableCell';
import Vendors from "./../utils/vendors.js";
import { Dropdown } from 'react-bootstrap';

import SalesHistory from "./../product/sales_history.js";
import SalesReturnHistory from "./../product/sales_return_history.js";
import PurchaseHistory from "./../product/purchase_history.js";
import PurchaseReturnHistory from "./../product/purchase_return_history.js";
import QuotationHistory from "./../product/quotation_history.js";
import DeliveryNoteHistory from "./../product/delivery_note_history.js";
import Products from "./../utils/products.js";


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


            if (localStorage.getItem('store_id')) {
                getStore(localStorage.getItem('store_id'));
                formData.store_id = localStorage.getItem('store_id');
                formData.store_name = localStorage.getItem('store_name');
            }

            if (localStorage.getItem("user_id")) {
                selectedOrderPlacedByUsers = [{
                    id: localStorage.getItem("user_id"),
                    name: localStorage.getItem("user_name"),
                }];
                formData.order_placed_by = localStorage.getItem("user_id");
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

    function getStore(id) {
        console.log("inside get Store");
        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': localStorage.getItem('access_token'),
            },
        };

        fetch('/v1/store/' + id, requestOptions)
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();

                // check for error response
                if (!response.ok) {
                    const error = (data && data.errors);
                    return Promise.reject(error);
                }

                console.log("Response:");
                console.log(data);
                let store = data.result;
                formData.vat_percent = parseFloat(store.vat_percent);
                setFormData({ ...formData });
            })
            .catch(error => {

            });
    }

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
                        } else if (event.target.getAttribute("class").includes("purchase_unit_discount")) {
                            //console.log("OKKK");
                            moveToProductSearch();
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
        let at = localStorage.getItem("access_token");
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
                'Authorization': localStorage.getItem('access_token'),
            },
        };

        let searchParams = {};
        if (localStorage.getItem("store_id")) {
            searchParams.store_id = localStorage.getItem("store_id");
        }
        let queryParams = ObjectToSearchQueryParams(searchParams);

        fetch('/v1/purchase/' + id + "?" + queryParams, requestOptions)
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
                    vendor_name: purchase.vendor_name,
                    date_str: purchase.date,
                    phone: purchase.phone,
                    vat_no: purchase.vat_no,
                    address: purchase.address,
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
                    remarks: purchase.remarks,
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

                setSelectedVendors([]);
                if (purchase.vendor_id && purchase.vendor_name) {
                    let selectedVendors = [
                        {
                            id: purchase.vendor_id,
                            name: purchase.vendor_name,
                            search_label: purchase.vendor.search_label,
                        }
                    ];
                    setSelectedVendors([...selectedVendors]);
                }


                let selectedOrderPlacedByUsers = [
                    {
                        id: purchase.order_placed_by,
                        name: purchase.order_placed_by_name
                    }
                ];



                setSelectedOrderPlacedByUsers([...selectedOrderPlacedByUsers]);

                setSelectedStores([...selectedStores]);


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
                Authorization: localStorage.getItem("access_token"),
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
            query: searchTerm,
        };

        if (localStorage.getItem("store_id")) {
            params.store_id = localStorage.getItem("store_id");
        }


        var queryString = ObjectToSearchQueryParams(params);
        if (queryString !== "") {
            queryString = "&" + queryString;
        }

        const requestOptions = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: localStorage.getItem("access_token"),
            },
        };

        let Select = "select=id,code,use_remarks_in_purchases,remarks,vat_no,name,phone,name_in_arabic,phone_in_arabic,search_label";
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
            setTimeout(() => {
                openProductSearchResult = false;
                setOpenProductSearchResult(false);
            }, 300);


            setIsProductsLoading(false);
            return;
        }

        var params = {
            search_text: searchTerm,
        };

        if (localStorage.getItem("store_id")) {
            params.store_id = localStorage.getItem("store_id");
        }

        var queryString = ObjectToSearchQueryParams(params);
        if (queryString !== "") {
            queryString = "&" + queryString;
        }

        const requestOptions = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: localStorage.getItem("access_token"),
            },
        };

        // let Select = "select=id,item_code,bar_code,name,product_stores,unit,part_number,name_in_arabic";
        let Select = `select=id,item_code,prefix_part_number,country_name,brand_name,part_number,name,unit,name_in_arabic,product_stores.${localStorage.getItem('store_id')}.purchase_unit_price,product_stores.${localStorage.getItem('store_id')}.retail_unit_price,product_stores.${localStorage.getItem('store_id')}.stock,product_stores.${localStorage.getItem('store_id')}.retail_unit_price,product_stores.${localStorage.getItem('store_id')}.with_vat`;
        setIsProductsLoading(true);
        let result = await fetch(
            "/v1/product?" + Select + queryString + "&limit=200&sort=-country_name",
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
        /*
        const sortedProducts = products
            .filter(item => item.country_name)                        // Keep only items with name
            .sort((a, b) => a.country_name.localeCompare(b.country_name))     // Sort alphabetically
            .concat(products.filter(item => !item.country_name));*/

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
                name: selectedProducts[i].name,
                quantity: parseFloat(selectedProducts[i].quantity),
                unit: selectedProducts[i].unit,
                purchase_unit_price: parseFloat(selectedProducts[i].purchase_unit_price),
                retail_unit_price: parseFloat(selectedProducts[i].retail_unit_price),
                wholesale_unit_price: parseFloat(selectedProducts[i].wholesale_unit_price),
                unit_discount: selectedProducts[i].unit_discount ? parseFloat(selectedProducts[i].unit_discount) : 0,
                unit_discount_percent: selectedProducts[i].unit_discount_percent ? parseFloat(selectedProducts[i].unit_discount_percent) : 0,
            });
        }

        formData.discount = parseFloat(formData.discount);
        formData.discount_percent = parseFloat(formData.discount_percent);
        formData.vat_percent = parseFloat(formData.vat_percent);
        formData.net_total = parseFloat(formData.net_total);
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

        if (localStorage.getItem('store_id')) {
            formData.store_id = localStorage.getItem('store_id');
        }
        formData.balance_amount = parseFloat(balanceAmount);


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
                Authorization: localStorage.getItem("access_token"),
            },
            body: JSON.stringify(formData),
        };

        let searchParams = {};
        if (localStorage.getItem("store_id")) {
            searchParams.store_id = localStorage.getItem("store_id");
        }
        let queryParams = ObjectToSearchQueryParams(searchParams);

        setProcessing(true);
        fetch(endPoint + "?" + queryParams, requestOptions)
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
                if (formData.id) {
                    props.showToastMessage("Purchase updated successfully!", "success");
                } else {
                    props.showToastMessage("Purchase created successfully!", "success");
                }

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
                props.showToastMessage("Failed to process purchase!", "danger");
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
            return false;
        }


        errors.product_id = "";
        if (!product) {
            errors.product_id = "Invalid Product";
            setErrors({ ...errors });
            return false;
        }

        if (product.product_stores) {
            /*
            productStore = GetProductUnitPriceInStore(
                formData.store_id,
                product.stores
            );
            */

            if (product.product_stores[formData.store_id]?.retail_unit_price) {
                if (product.product_stores[formData.store_id]?.with_vat) {
                    product.retail_unit_price = parseFloat(trimTo2Decimals(product.product_stores[formData.store_id].retail_unit_price / (1 + (formData.vat_percent / 100))));
                } else {
                    product.retail_unit_price = product.product_stores[formData.store_id].retail_unit_price;
                }

            }

            if (product.product_stores[formData.store_id]?.purchase_unit_price) {
                if (product.product_stores[formData.store_id]?.with_vat) {
                    product.purchase_unit_price = parseFloat(trimTo2Decimals(product.product_stores[formData.store_id].purchase_unit_price / (1 + (formData.vat_percent / 100))));
                } else {
                    product.purchase_unit_price = product.product_stores[formData.store_id].purchase_unit_price;
                }
            }

            if (product.product_stores[formData.store_id]?.wholesale_unit_price) {
                if (product.product_stores[formData.store_id]?.with_vat) {
                    product.wholesale_unit_price = parseFloat(product.product_stores[formData.store_id].wholesale_unit_price / (1 + (formData.vat_percent / 100)));
                } else {
                    product.wholesale_unit_price = product.product_stores[formData.store_id].wholesale_unit_price;
                }
            }

            if (product.product_stores[formData.store_id]) {
                product.unit_discount = 0.00;
                product.unit_discount_percent = 0.00;
            }


            /*
            if (product.product_stores[formData.store_id]) {
                product.purchase_unit_price = product.product_stores[formData.store_id].purchase_unit_price;
                product.retail_unit_price = product.product_stores[formData.store_id].retail_unit_price;
                product.wholesale_unit_price = product.product_stores[formData.store_id].wholesale_unit_price;
                product.unit_discount = 0.00;
                product.unit_discount_percent = 0.00;
            }
            */

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
                unit_discount: product.unit_discount,
                unit_discount_percent: product.unit_discount_percent,
            };

            if (product.purchase_unit_price) {
                item.purchase_unit_price = parseFloat(product.purchase_unit_price).toFixed(2);
            }

            /*
            if (product.retail_unit_price) {
                item.retail_unit_price = parseFloat(product.retail_unit_price).toFixed(2);
            }
         
            if (product.wholesale_unit_price) {
                item.wholesale_unit_price = parseFloat(product.wholesale_unit_price).toFixed(2);
            }*/

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
        return true;
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

    function findProductUnitDiscountPercent(productIndex) {
        let unitPrice = parseFloat(selectedProducts[productIndex].purchase_unit_price);
        if (selectedProducts[productIndex].unit_discount
            && parseFloat(selectedProducts[productIndex].unit_discount) >= 0
            && unitPrice > 0) {

            let unitDiscountPercent = parseFloat(parseFloat(selectedProducts[productIndex].unit_discount / unitPrice) * 100);
            selectedProducts[productIndex].unit_discount_percent = unitDiscountPercent;
            setSelectedProducts([...selectedProducts]);
        }
    }

    function findProductUnitDiscount(productIndex) {
        let unitPrice = parseFloat(selectedProducts[productIndex].purchase_unit_price);

        if (selectedProducts[productIndex].unit_discount_percent
            && selectedProducts[productIndex].unit_discount_percent >= 0
            && unitPrice > 0) {
            selectedProducts[productIndex].unit_discount = parseFloat(unitPrice * parseFloat(selectedProducts[productIndex].unit_discount_percent / 100));
            setSelectedProducts([...selectedProducts]);
        }
    }


    async function reCalculate(productIndex) {
        if (selectedProducts[productIndex] && selectedProducts[productIndex]) {
            if (selectedProducts[productIndex] && selectedProducts[productIndex].is_discount_percent) {
                findProductUnitDiscount(productIndex);
            } else {
                findProductUnitDiscountPercent(productIndex);
            }
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
                unit_discount: selectedProducts[i].unit_discount ? parseFloat(selectedProducts[i].unit_discount) : 0,
                unit_discount_percent: selectedProducts[i].unit_discount_percent ? parseFloat(selectedProducts[i].unit_discount_percent) : 0,
            });
        }


        const requestOptions = {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: localStorage.getItem("access_token"),
            },
            body: JSON.stringify(formData),
        };

        console.log("Calucalting")
        let result = await fetch(
            "/v1/purchase/calculate-net-total",
            requestOptions
        );
        console.log("Done")
        let res = await result.json();

        if (res.result) {
            formData.total = res.result.total;
            formData.net_total = res.result.net_total;
            formData.vat_price = res.result.vat_price;
            formData.discount_percent = res.result.discount_percent;
            formData.discount = res.result.discount;
            setFormData({ ...formData });
        }


        if (!formData.id) {
            let method = "";
            if (formData.payments_input && formData.payments_input[0]) {
                method = formData.payments_input[0].method;
            }

            formData.payments_input = [{
                "date_str": formData.date_str,
                "amount": 0.00,
                "method": method,
                "deleted": false,
            }];

            if (formData.net_total > 0) {
                formData.payments_input[0].amount = parseFloat(trimTo2Decimals(formData.net_total));
                if (formData.cash_discount) {
                    formData.payments_input[0].amount = formData.payments_input[0].amount - parseFloat(trimTo2Decimals(formData.cash_discount));
                }
                formData.payments_input[0].amount = parseFloat(trimTo2Decimals(formData.payments_input[0].amount));
            }
        }
        findTotalPayments();
        setFormData({ ...formData });
        validatePaymentAmounts();
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
        balanceAmount = (parseFloat(formData.net_total.toFixed(2)) - parseFloat(parseFloat(formData.cash_discount)?.toFixed(2))) - parseFloat(totalPayment.toFixed(2));
        balanceAmount = parseFloat(balanceAmount.toFixed(2));
        setBalanceAmount(balanceAmount);

        if (balanceAmount === parseFloat((parseFloat(formData.net_total.toFixed(2)) - parseFloat(parseFloat(formData.cash_discount)?.toFixed(2))).toFixed(2))) {
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
        console.log("validatePaymentAmount: formData.net_total:", formData.net_total)
        errors["cash_discount"] = "";
        setErrors({ ...errors });

        let haveErrors = false;
        if (!formData.net_total) {
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


        if (formData.cash_discount > 0 && formData.cash_discount >= formData.net_total) {
            errors["cash_discount"] = "Cash discount should not be >= " + formData.net_total.toFixed(2).toString();
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
                let maxAllowedAmount = (formData.net_total - formData.cash_discount) - (totalPayment - formData.payments_input[key].amount);

                if (maxAllowedAmount < 0) {
                    maxAllowedAmount = 0;
                }

                /*
                
                if (maxAllowedAmount === 0) {
                    errors["payment_amount_" + key] = "Total amount should not exceed " + (formData.net_total - formData.cash_discount).toFixed(2).toString() + ", Please delete this payment";
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

    const VendorsRef = useRef();
    function openVendors(model) {
        VendorsRef.current.open();
    }

    const handleSelectedVendor = (selectedVendor) => {
        console.log("selectedVendor:", selectedVendor);
        setSelectedVendors([selectedVendor])
        formData.vendor_id = selectedVendor.id;
        setFormData({ ...formData });
    };

    const PreviewRef = useRef();
    function openPreview() {
        let model = formData;
        model.products = selectedProducts;
        model.payment_status = paymentStatus;
        model.date = formData.date_str;
        model.code = formData.code;

        PreviewRef.current.open(model, undefined, "purchase");
    }


    const ProductsRef = useRef();
    function openLinkedProducts(model) {
        ProductsRef.current.open(model, "linked_products");
    }


    const SalesHistoryRef = useRef();
    function openSalesHistory(model) {
        SalesHistoryRef.current.open(model);
    }

    const SalesReturnHistoryRef = useRef();
    function openSalesReturnHistory(model) {
        SalesReturnHistoryRef.current.open(model);
    }


    const PurchaseHistoryRef = useRef();
    function openPurchaseHistory(model) {
        PurchaseHistoryRef.current.open(model);
    }

    const PurchaseReturnHistoryRef = useRef();
    function openPurchaseReturnHistory(model) {
        PurchaseReturnHistoryRef.current.open(model);
    }


    const DeliveryNoteHistoryRef = useRef();
    function openDeliveryNoteHistory(model) {
        DeliveryNoteHistoryRef.current.open(model);
    }


    const QuotationHistoryRef = useRef();
    function openQuotationHistory(model) {
        QuotationHistoryRef.current.open(model);
    }

    function openProducts() {
        ProductsRef.current.open();
    }


    const handleSelectedProducts = (selected) => {
        console.log("Selected Products:", selected);
        let addedCount = 0;
        for (var i = 0; i < selected.length; i++) {
            if (addProduct(selected[i])) {
                addedCount++;
            }
        }
        setToastMessage(`${addedCount} product${addedCount !== 1 ? "s" : ""} added ✅`);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };

    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState("");

    function validatePhoneNumber(input) {
        // Remove everything except digits and plus
        let s = input.trim().replace(/[^\d+]/g, "");

        if (s.startsWith("+")) {
            // International number: must be + followed by 6 to 15 digits
            return /^\+\d{6,15}$/.test(s);
        } else if (s.startsWith("05")) {
            // Saudi local number: must be 05 followed by 8 digits
            return /^05\d{8}$/.test(s);
        } else {
            return false;
        }
    }

    function sendWhatsAppMessage() {
        let model = formData;
        model.products = selectedProducts;
        model.payment_status = paymentStatus;
        model.date = formData.date_str;

        if (!formData.code) {
            formData.code = Math.floor(10000 + Math.random() * 90000).toString();;
            model.code = formData.code;
        }

        errors["phone"] = ""
        setErrors({ ...errors });

        if (model.phone) {
            if (!validatePhoneNumber(model.phone)) {
                errors["phone"] = "Invalid phone no."
                setErrors({ ...errors });
                return;
            }
        }
        PreviewRef.current.open(model, "whatsapp", "purchase");
    }

    function moveToProductQuantityInputBox() {
        setTimeout(() => {
            let index = (selectedProducts.length - 1);
            const input = document.getElementById('purchase_product_quantity_' + index);
            console.log("Moving to qty field");
            input?.focus();

        }, 500);
    }

    function moveToProductSearch() {
        setTimeout(() => {
            productSearchRef.current?.focus();
        }, 500);
    }

    const productSearchRef = useRef();

    const timerRef = useRef(null);

    return (
        <>
            <div
                className="toast-container position-fixed top-0 end-0 p-3"
                style={{ zIndex: 9999 }}
            >
                <div
                    className={`toast align-items-center text-white bg-success ${showToast ? "show" : "hide"}`}
                    role="alert"
                    aria-live="assertive"
                    aria-atomic="true"
                >
                    <div className="d-flex">
                        <div className="toast-body">{toastMessage}</div>
                        <button
                            type="button"
                            className="btn-close btn-close-white me-2 m-auto"
                            onClick={() => setShowToast(false)}
                        ></button>
                    </div>
                </div>
            </div>

            <Products ref={ProductsRef} onSelectProducts={handleSelectedProducts} showToastMessage={props.showToastMessage} />
            <SalesHistory ref={SalesHistoryRef} showToastMessage={props.showToastMessage} />
            <SalesReturnHistory ref={SalesReturnHistoryRef} showToastMessage={props.showToastMessage} />
            <PurchaseHistory ref={PurchaseHistoryRef} showToastMessage={props.showToastMessage} />
            <PurchaseReturnHistory ref={PurchaseReturnHistoryRef} showToastMessage={props.showToastMessage} />
            <QuotationHistory ref={QuotationHistoryRef} showToastMessage={props.showToastMessage} />
            <DeliveryNoteHistory ref={DeliveryNoteHistoryRef} showToastMessage={props.showToastMessage} />

            <Preview ref={PreviewRef} />
            <Vendors ref={VendorsRef} onSelectVendor={handleSelectedVendor} showToastMessage={props.showToastMessage} />
            <ProductView ref={ProductDetailsViewRef} openUpdateForm={openProductUpdateForm} openCreateForm={openProductCreateForm} />
            <ProductCreate ref={ProductCreateFormRef} showToastMessage={props.showToastMessage} openDetailsView={openProductDetailsView} />

            <StoreCreate ref={StoreCreateFormRef} showToastMessage={props.showToastMessage} />

            <UserCreate ref={UserCreateFormRef} showToastMessage={props.showToastMessage} />
            <SignatureCreate ref={SignatureCreateFormRef} showToastMessage={props.showToastMessage} />
            <VendorCreate ref={VendorCreateFormRef} showToastMessage={props.showToastMessage} />
            <Modal show={show} size="xl" keyboard={false} fullscreen onHide={handleClose} animation={false} backdrop="static" scrollable={true}>
                <Modal.Header>
                    <Modal.Title>
                        {formData.id ? "Update Purchase #" + formData.code : "Create New Purchase"}
                    </Modal.Title>

                    <div className="col align-self-end text-end">

                        <Button variant="primary" onClick={openPreview}>
                            <i className="bi bi-printer"></i> Print Full Invoice
                        </Button>
                        &nbsp;&nbsp;
                        &nbsp;&nbsp;
                        <Button variant="primary" onClick={handleCreate} >
                            {isProcessing ?
                                <Spinner
                                    as="span"
                                    animation="border"
                                    size="sm"
                                    role="status"
                                    aria-hidden={true}
                                />

                                : ""
                            }
                            {formData.id && !isProcessing ? "Update" : !isProcessing ? "Create" : ""}
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
                        {!localStorage.getItem('store_name') ? <div className="col-md-6">
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
                            <label className="form-label">Vendor</label>
                            <Typeahead
                                id="vendor_id"
                                labelKey="search_label"
                                isLoading={isVendorsLoading}
                                onChange={(selectedItems) => {
                                    errors.vendor_id = "";
                                    setErrors(errors);
                                    if (selectedItems.length === 0) {
                                        errors.vendor_id = "";
                                        //setErrors(errors);
                                        formData.vendor_id = "";
                                        setFormData({ ...formData });
                                        setSelectedVendors([]);
                                        return;
                                    }
                                    formData.vendor_id = selectedItems[0].id;
                                    if (selectedItems[0].use_remarks_in_purchases && selectedItems[0].remarks) {
                                        formData.remarks = selectedItems[0].remarks;
                                    }
                                    setFormData({ ...formData });
                                    setSelectedVendors(selectedItems);
                                }}
                                options={vendorOptions}
                                placeholder="Vendor Name / Mob / VAT # / ID"
                                selected={selectedVendors}
                                highlightOnlyResult={true}
                                onInputChange={(searchTerm, e) => {
                                    if (searchTerm) {
                                        formData.vendor_name = searchTerm;
                                    }
                                    setFormData({ ...formData });
                                    suggestVendors(searchTerm);
                                }}
                            />
                            <Button hide={true.toString()} onClick={openVendorCreateForm} className="btn btn-outline-secondary btn-primary btn-sm" type="button" id="button-addon1"> <i className="bi bi-plus-lg"></i> New</Button>
                            {errors.vendor_id && (
                                <div style={{ color: "red" }}>
                                    {errors.vendor_id}
                                </div>
                            )}
                        </div>
                        <div className="col-md-1">
                            <Button className="btn btn-primary" style={{ marginTop: "30px" }} onClick={openVendors}>
                                <i class="bi bi-list"></i>
                            </Button>
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

                        <div className="col-md-2">
                            <label className="form-label">Vendor Invoice No. (Optional)</label>

                            <div className="input-group mb-3">
                                <input id="purchase_vendor_invoice_no" name="purchase_vendor_invoice_no"
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

                        <div className="col-md-2">
                            <label className="form-label">Phone ( 05.. / +966..)</label>

                            <div className="input-group mb-3">
                                <input
                                    id="purchase_phone_no" name="purchase_phone_no"
                                    value={formData.phone ? formData.phone : ""}
                                    type='string'
                                    onChange={(e) => {
                                        errors["phone"] = "";
                                        setErrors({ ...errors });
                                        formData.phone = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    placeholder="Phone"
                                />
                            </div>
                            {errors.phone && (
                                <div style={{ color: "red" }}>

                                    {errors.phone}
                                </div>
                            )}
                        </div>

                        <div className="col-md-1">
                            <Button className={`btn ${!formData.vendor_name && !formData.phone ? "btn-secondary" : "btn-success"} btn-sm`} disabled={!formData.vendor_name && !formData.phone} style={{ marginTop: "30px" }} onClick={sendWhatsAppMessage}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="white" viewBox="0 0 16 16">
                                    <path d="M13.601 2.326A7.875 7.875 0 0 0 8.036 0C3.596 0 0 3.597 0 8.036c0 1.417.37 2.805 1.07 4.03L0 16l3.993-1.05a7.968 7.968 0 0 0 4.043 1.085h.003c4.44 0 8.036-3.596 8.036-8.036 0-2.147-.836-4.166-2.37-5.673ZM8.036 14.6a6.584 6.584 0 0 1-3.35-.92l-.24-.142-2.37.622.63-2.31-.155-.238a6.587 6.587 0 0 1-1.018-3.513c0-3.637 2.96-6.6 6.6-6.6 1.764 0 3.42.69 4.67 1.94a6.56 6.56 0 0 1 1.93 4.668c0 3.637-2.96 6.6-6.6 6.6Zm3.61-4.885c-.198-.1-1.17-.578-1.352-.644-.18-.066-.312-.1-.444.1-.13.197-.51.644-.626.775-.115.13-.23.15-.428.05-.198-.1-.837-.308-1.594-.983-.59-.525-.99-1.174-1.11-1.372-.116-.198-.012-.305.088-.403.09-.09.198-.23.298-.345.1-.115.132-.197.2-.33.065-.13.032-.247-.017-.345-.05-.1-.444-1.07-.61-1.46-.16-.384-.323-.332-.444-.338l-.378-.007c-.13 0-.344.048-.525.23s-.688.672-.688 1.64c0 .967.704 1.9.802 2.03.1.13 1.386 2.116 3.365 2.963.47.203.837.324 1.122.414.472.15.902.13 1.24.08.378-.057 1.17-.48 1.336-.942.165-.462.165-.858.116-.943-.048-.084-.18-.132-.378-.23Z" />
                                </svg>
                            </Button>
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">VAT NO.(15 digits)</label>

                            <div className="input-group mb-3">
                                <input
                                    id="purchase_vat_no" name="purchase_vat_no"
                                    value={formData.vat_no ? formData.vat_no : ""}
                                    type='string'
                                    onChange={(e) => {
                                        errors["vat_no"] = "";
                                        setErrors({ ...errors });
                                        formData.vat_no = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    placeholder="VAT NO."
                                />
                            </div>
                            {errors.vat_no && (
                                <div style={{ color: "red" }}>

                                    {errors.vat_no}
                                </div>
                            )}
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">Address</label>
                            <div className="input-group mb-3">
                                <textarea
                                    value={formData.address}
                                    type='string'
                                    onChange={(e) => {
                                        errors["address"] = "";
                                        setErrors({ ...errors });
                                        formData.address = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="address"
                                    placeholder="Address"
                                />
                            </div>
                            {errors.address && (
                                <div style={{ color: "red" }}>

                                    {errors.address}
                                </div>
                            )}
                        </div>

                        <div className="col-md-3" >
                            <label className="form-label">Remarks</label>
                            <div className="input-group mb-3">
                                <textarea
                                    value={formData.remarks}
                                    type='string'
                                    onChange={(e) => {
                                        errors["remarks"] = "";
                                        setErrors({ ...errors });
                                        formData.remarks = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="remarks"
                                    placeholder="Remarks"
                                />
                            </div>
                            {errors.remarks && (
                                <div style={{ color: "red" }}>
                                    {errors.remarks}
                                </div>
                            )}
                        </div>

                        <div className="col-md-8">
                            <label className="form-label">Product*</label>
                            <Typeahead
                                id="product_id"
                                size="lg"
                                ref={productSearchRef}
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
                                    moveToProductQuantityInputBox();
                                }}
                                options={productOptions}
                                selected={selectedProduct}
                                onKeyDown={(e) => {
                                    if (e.code === "Escape") {
                                        setProductOptions([]);
                                        setOpenProductSearchResult(false);
                                        productSearchRef.current?.clear();
                                    }

                                    moveToProductSearch();
                                }}
                                placeholder="Part No. | Name | Name in Arabic | Brand | Country"
                                highlightOnlyResult={true}
                                filterBy={() => true}
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
                        <div className="col-md-1">
                            <Button className="btn btn-primary" style={{ marginTop: "30px" }} onClick={openProducts}>
                                <i class="bi bi-list"></i>
                            </Button>
                        </div>

                        <div className="table-responsive" style={{ overflowX: "auto", maxHeight: "400px", overflowY: "auto" }}>
                            <table className="table table-striped table-sm table-bordered">
                                <thead>
                                    <tr className="text-center">
                                        <th></th>
                                        <th>SI No.</th>
                                        <th >Part No.</th>
                                        <th className="text-start" style={{ minWidth: "250px" }}>
                                            Name
                                        </th>
                                        <th >Info</th>
                                        <th >Qty</th>
                                        <th >Unit Price(without VAT)</th>
                                        <th >Unit Disc.(without VAT)</th>
                                        <th >Disc. %</th>
                                        <th >Set latest wholesale unit price(without VAT)</th>
                                        <th >Set latest retail unit price(without VAT)</th>
                                        <th >Price</th>

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
                                                    <i className="bi bi-trash"> </i>
                                                </div>
                                            </td>
                                            <td>{index + 1}</td>
                                            <td>{product.part_number}</td>
                                            <ResizableTableCell
                                            >
                                                <div className="input-group mb-3">
                                                    <input
                                                        id={`${"purchase_product_name" + index}`} name={`${"purchase_product_name" + index}`}
                                                        type="text" onWheel={(e) => e.target.blur()} value={product.name} disabled={!selectedProducts[index].can_edit_name} className="form-control"
                                                        placeholder="Name" onChange={(e) => {
                                                            errors["name_" + index] = "";
                                                            setErrors({ ...errors });

                                                            if (!e.target.value) {
                                                                //errors["purchase_unit_price_" + index] = "Invalid purchase unit price";
                                                                selectedProducts[index].name = "";
                                                                setSelectedProducts([...selectedProducts]);
                                                                //setErrors({ ...errors });
                                                                console.log("errors:", errors);
                                                                return;
                                                            }


                                                            selectedProducts[index].name = e.target.value;
                                                            setSelectedProducts([...selectedProducts]);
                                                        }} />
                                                    <div
                                                        style={{ color: "red", cursor: "pointer", marginLeft: "3px" }}
                                                        onClick={() => {
                                                            selectedProducts[index].can_edit_name = !selectedProducts[index].can_edit_name;
                                                            setSelectedProducts([...selectedProducts]);
                                                        }}
                                                    >
                                                        {selectedProducts[index].can_edit_name ? <i className="bi bi-floppy"> </i> : <i className="bi bi-pencil"> </i>}
                                                    </div>

                                                    <div
                                                        style={{ color: "blue", cursor: "pointer", marginLeft: "10px" }}
                                                        onClick={() => {
                                                            openProductDetailsView(product.product_id);
                                                        }}
                                                    >
                                                        <i className="bi bi-eye"> </i>
                                                    </div>
                                                </div>
                                                {errors["name_" + index] && (
                                                    <div style={{ color: "red" }}>

                                                        {errors["name_" + index]}
                                                    </div>
                                                )}
                                            </ResizableTableCell>
                                            <td>
                                                <div style={{ zIndex: "9999 !important", position: "absolute !important" }}>
                                                    <Dropdown drop="top">
                                                        <Dropdown.Toggle variant="secondary" id="dropdown-secondary" style={{}}>
                                                            <i className="bi bi-info"></i>
                                                        </Dropdown.Toggle>

                                                        <Dropdown.Menu style={{ zIndex: 9999, position: "absolute" }} popperConfig={{ modifiers: [{ name: 'preventOverflow', options: { boundary: 'viewport' } }] }}>
                                                            <Dropdown.Item onClick={() => {
                                                                openLinkedProducts(product);
                                                            }}>
                                                                <i className="bi bi-link"></i>
                                                                &nbsp;
                                                                Linked Products
                                                            </Dropdown.Item>

                                                            <Dropdown.Item onClick={() => {
                                                                openSalesHistory(product);
                                                            }}>
                                                                <i className="bi bi-clock-history"></i>
                                                                &nbsp;
                                                                Sales History
                                                            </Dropdown.Item>
                                                            <Dropdown.Item onClick={() => {
                                                                openSalesReturnHistory(product);
                                                            }}>
                                                                <i className="bi bi-clock-history"></i>
                                                                &nbsp;
                                                                Sales Return History
                                                            </Dropdown.Item>
                                                            <Dropdown.Item onClick={() => {
                                                                openPurchaseHistory(product);
                                                            }}>
                                                                <i className="bi bi-clock-history"></i>
                                                                &nbsp;
                                                                Purchase History
                                                            </Dropdown.Item>
                                                            <Dropdown.Item onClick={() => {
                                                                openPurchaseReturnHistory(product);
                                                            }}>
                                                                <i className="bi bi-clock-history"></i>
                                                                &nbsp;
                                                                Purchase Return History
                                                            </Dropdown.Item>
                                                            <Dropdown.Item onClick={() => {
                                                                openDeliveryNoteHistory(product);
                                                            }}>
                                                                <i className="bi bi-clock-history"></i>
                                                                &nbsp;
                                                                Delivery Note History
                                                            </Dropdown.Item>
                                                            <Dropdown.Item onClick={() => {
                                                                openQuotationHistory(product);
                                                            }}>
                                                                <i className="bi bi-clock-history"></i>
                                                                &nbsp;
                                                                Quotation History
                                                            </Dropdown.Item>

                                                        </Dropdown.Menu>
                                                    </Dropdown>
                                                </div>
                                            </td>
                                            <td style={{ width: "155px" }}>

                                                <div className="input-group mb-3">
                                                    <input id={`${"purchase_product_quantity_" + index}`} name={`${"purchase_product_quantity_" + index}`}
                                                        type="number" value={product.quantity} className="form-control"
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
                                                    <input id={`${"purchase_product_unit_price" + index}`} name={`${"purchase_product_unit_price" + index}`}
                                                        type="number" value={product.purchase_unit_price} className="form-control"

                                                        onKeyDown={(e) => {
                                                            if (e.code === "Backspace") {
                                                                if (timerRef.current) clearTimeout(timerRef.current);
                                                                selectedProducts[index].purchase_unit_price = "";
                                                                setSelectedProducts([...selectedProducts]);
                                                                timerRef.current = setTimeout(() => {
                                                                    reCalculate(index);
                                                                }, 300);
                                                            }
                                                        }}

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
                                                    <input
                                                        id={`${"purchase_product_unit_discount" + index}`} name={`${"purchase_product_unit_discount" + index}`}
                                                        type="number" className="form-control text-end purchase_unit_discount" value={selectedProducts[index].unit_discount} onChange={(e) => {
                                                            selectedProducts[index].is_discount_percent = false;
                                                            if (parseFloat(e.target.value) === 0) {
                                                                selectedProducts[index].unit_discount = parseFloat(e.target.value);
                                                                setFormData({ ...formData });
                                                                errors["unit_discount_" + index] = "";
                                                                setErrors({ ...errors });
                                                                reCalculate(index);
                                                                return;
                                                            }

                                                            if (parseFloat(e.target.value) < 0) {
                                                                selectedProducts[index].unit_discount = parseFloat(e.target.value);
                                                                selectedProducts[index].unit_discount_percent = 0.00;
                                                                setFormData({ ...formData });
                                                                errors["unit_discount_" + index] = "Unit discount should be >= 0";
                                                                setErrors({ ...errors });
                                                                reCalculate(index);
                                                                return;
                                                            }

                                                            if (!e.target.value) {
                                                                selectedProducts[index].unit_discount = "";
                                                                selectedProducts[index].unit_discount_percent = "";
                                                                // errors["discount_" + index] = "Invalid Discount";
                                                                setFormData({ ...formData });
                                                                reCalculate(index);
                                                                //setErrors({ ...errors });
                                                                return;
                                                            }

                                                            errors["unit_discount_" + index] = "";
                                                            errors["unit_discount_percent_" + index] = "";
                                                            setErrors({ ...errors });

                                                            selectedProducts[index].unit_discount = parseFloat(e.target.value);
                                                            setFormData({ ...formData });
                                                            reCalculate(index);
                                                        }} />
                                                </div>
                                                {" "}
                                                {errors["unit_discount_" + index] && (
                                                    <div style={{ color: "red" }}>
                                                        {errors["unit_discount_" + index]}
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                <div className="input-group mb-3">
                                                    <input
                                                        id={`${"purchase_product_unit_discount_percent" + index}`} name={`${"purchase_product_unit_discount_percent" + index}`}
                                                        type="number" disabled={true} className="form-control text-end" value={selectedProducts[index].unit_discount_percent} onChange={(e) => {
                                                            selectedProducts[index].is_discount_percent = true;
                                                            if (parseFloat(e.target.value) === 0) {
                                                                selectedProducts[index].unit_discount_percent = parseFloat(e.target.value);
                                                                setFormData({ ...formData });
                                                                errors["unit_discount_percent_" + index] = "";
                                                                setErrors({ ...errors });
                                                                reCalculate(index);
                                                                return;
                                                            }

                                                            if (parseFloat(e.target.value) < 0) {
                                                                selectedProducts[index].unit_discount_percent = parseFloat(e.target.value);
                                                                selectedProducts[index].unit_discount = 0.00;
                                                                setFormData({ ...formData });
                                                                errors["unit_discount_percent_" + index] = "Unit discount percent should be >= 0";
                                                                setErrors({ ...errors });
                                                                reCalculate(index);
                                                                return;
                                                            }

                                                            if (!e.target.value) {
                                                                selectedProducts[index].unit_discount_percent = "";
                                                                selectedProducts[index].unit_discount = "";
                                                                //errors["discount_percent_" + index] = "Invalid Discount Percent";
                                                                setFormData({ ...formData });
                                                                reCalculate(index);
                                                                //setErrors({ ...errors });
                                                                return;
                                                            }

                                                            errors["unit_discount_percent_" + index] = "";
                                                            errors["unit_discount_" + index] = "";
                                                            setErrors({ ...errors });

                                                            selectedProducts[index].unit_discount_percent = parseFloat(e.target.value);
                                                            setFormData({ ...formData });
                                                            reCalculate(index);
                                                        }} />{""}
                                                </div>
                                                {errors["unit_discount_percent_" + index] && (
                                                    <div style={{ color: "red" }}>
                                                        {errors["unit_discount_percent_" + index]}
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ width: "180px" }}>
                                                <div className="input-group mb-3">
                                                    <input
                                                        id={`${"purchase_product_wholesale_unit_price" + index}`} name={`${"purchase_product_wholesale_unit_price" + index}`}
                                                        type="number" value={product.wholesale_unit_price} className="form-control"

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
                                                    <input
                                                        id={`${"purchase_product_retail_unit_price" + index}`} name={`${"purchase_product_retail_unit_price" + index}`}
                                                        type="number" value={product.retail_unit_price} className="form-control"

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
                                                    value={((product.purchase_unit_price - product.unit_discount) * product.quantity).toFixed(2)}
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
                                                value={formData.total?.toFixed(2)}
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
                                            <input
                                                id="purchase_shipping_fees" name="purchase_shipping_fees"
                                                type="number" style={{ width: "150px" }} className="text-start" value={formData.shipping_handling_fees} onChange={(e) => {

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
                                            Discount  <input
                                                id="purchase_discount_percent" name="purchase_discount_percent"
                                                type="number" style={{ width: "50px" }} className="text-start" value={formData.discount_percent} onChange={(e) => {
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
                                            <input
                                                id="purchase_discount" name="purchase_discount"
                                                type="number" style={{ width: "150px" }} className="text-start" value={formData.discount} onChange={(e) => {
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

                                        <th colSpan="8" className="text-end"> VAT  <input
                                            id="purchase_vat_percent" name="purchase_vat_percent"
                                            type="number" className="text-center" style={{ width: "50px" }} value={formData.vat_percent} onChange={(e) => {
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
                                                    setFormData({ ...formData });
                                                    errors["vat_percent"] = "Vat percent should be >= 0";
                                                    setErrors({ ...errors });
                                                    reCalculate();
                                                    return;
                                                }


                                                if (!e.target.value) {
                                                    formData.vat_percent = "";
                                                    formData.vat_price = 0.00;
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
                                                value={formData.vat_price}
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
                                                value={formData.net_total?.toFixed(2)}
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
                            <input id="purchase_cash_discount" name="purchase_cash_discount"
                                type='number' value={formData.cash_discount} className="form-control "
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
                                    if (formData.cash_discount > 0 && formData.cash_discount >= formData.net_total) {
                                        errors["cash_discount"] = "Cash discount should not be >= " + formData.net_total.toString();
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
                                                        <input id={`${"purchase_payment_amount" + key}`} name={`${"purchase_payment_amount" + key}`}
                                                            type='number' value={formData.payments_input[key].amount} className="form-control "
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
                                                            <option value="debit_card">Debit Card</option>
                                                            <option value="credit_card">Credit Card</option>
                                                            <option value="bank_card">Bank Card</option>
                                                            <option value="bank_transfer">Bank Transfer</option>
                                                            <option value="bank_cheque">Bank Cheque</option>
                                                            {formData.vendor_name && <option value="vendor_account">Vendor Account</option>}
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
                                                {errors["total_payment"] && (
                                                    <div style={{ color: "red" }}>
                                                        {errors["total_payment"]}
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                <b style={{ marginLeft: "12px", alignSelf: "end" }}>Balance: {balanceAmount?.toFixed(2)}</b>
                                                {errors["vendor_credit_limit"] && (
                                                    <div style={{ color: "red" }}>
                                                        {errors["vendor_credit_limit"]}
                                                    </div>
                                                )}
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
                                    />

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
