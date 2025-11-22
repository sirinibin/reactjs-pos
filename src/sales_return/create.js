import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from "react";
import { Modal, Button } from "react-bootstrap";
import StoreCreate from "../store/create.js";
import CustomerCreate from "./../customer/create.js";
import UserCreate from "./../user/create.js";
import SignatureCreate from "./../signature/create.js";

import NumberFormat from "react-number-format";
import DatePicker from "react-datepicker";
import { format } from "date-fns";
import { Spinner } from "react-bootstrap";
import SalesReturnView from "./view.js";
import { trimTo2Decimals } from "../utils/numberUtils";
import { trimTo8Decimals } from "../utils/numberUtils";
import Preview from "./../order/preview.js";
import { Dropdown } from 'react-bootstrap';
import SalesHistory from "./../product/sales_history.js";
import SalesReturnHistory from "./../product/sales_return_history.js";
import PurchaseHistory from "./../product/purchase_history.js";
import PurchaseReturnHistory from "./../product/purchase_return_history.js";
import QuotationHistory from "./../product/quotation_history.js";
import DeliveryNoteHistory from "./../product/delivery_note_history.js";
import Products from "../utils/products.js";
import ResizableTableCell from './../utils/ResizableTableCell';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
//import Amount from "../utils/amount.js";

import ProductCreate from "./../product/create.js";
import ProductView from "./../product/view.js";
import ImageViewerModal from './../utils/ImageViewerModal';
import ProductHistory from "./../product/product_history.js";
//import OverflowTooltip from "../utils/OverflowTooltip.js";
import * as bootstrap from 'bootstrap';

import CustomerWithdrawalCreate from "../customer_withdrawal/create.js";
import SalesCreate from "../order/create.js";

const SalesReturnCreate = forwardRef((props, ref) => {


    function ResetForm() {
        cashDiscount = "";
        setCashDiscount(cashDiscount);

        commission = "";
        setCommission(commission);

        shipping = 0.00;
        setShipping(shipping);

        roundingAmount = 0.00;
        setRoundingAmount(roundingAmount);

        discount = 0.00;
        setDiscount(discount);

        discountPercent = 0.00;
        setDiscountPercent(discountPercent);

        discountWithVAT = 0.00;
        setDiscountWithVAT(discountWithVAT);

        discountPercentWithVAT = 0.00;
        setDiscountPercentWithVAT(discountPercentWithVAT);

    }

    let [saleReturnID, setSaleReturnID] = useState();
    useImperativeHandle(ref, () => ({
        open(id, orderId) {
            saleReturnID = id;
            setSaleReturnID(id);

            errors = {};
            setErrors({ ...errors });

            formData = {
                order_id: orderId,
                enable_report_to_zatca: false,
                vat_percent: 15.0,
                discount: 0.0,
                discount_percent: 0.0,
                is_discount_percent: false,
                //  date_str: format(new Date(), "MMM dd yyyy"),
                date_str: new Date(),
                signature_date_str: format(new Date(), "MMM dd yyyy"),
                status: "received",
                rounding_amount: 0.00,
                auto_rounding_amount: true,
                payment_status: "",
                payment_method: "",
                price_type: "retail",
                shipping_handling_fees: 0.00,
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

            ResetForm();
            if (localStorage.getItem("user_id")) {
                selectedReceivedByUsers = [{
                    id: localStorage.getItem("user_id"),
                    name: localStorage.getItem("user_name"),
                }];
                formData.received_by = localStorage.getItem("user_id");
                setFormData({ ...formData });
                setSelectedReceivedByUsers([...selectedReceivedByUsers]);
            }
            setFormData({ ...formData });

            if (id) {
                getSalesReturn(id);
            }

            if (orderId) {
                // reCalculate();
                getOrder(orderId);
            }

            if (localStorage.getItem('store_id')) {
                getStore(localStorage.getItem('store_id'));
            }
            setShow(true);

        },

    }));

    let [store, setStore] = useState({});

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
                store = data.result;
                setStore(store);
            })
            .catch(error => {

            });
    }




    function ObjectToSearchQueryParams(object) {
        return Object.keys(object)
            .map(function (key) {
                return `search[${key}]=` + encodeURIComponent(object[key]);
            })
            .join("&");
    }


    let [selectedCustomers, setSelectedCustomers] = useState([]);

    function getSalesReturn(id) {
        console.log("inside getSalesReturn id:", id);
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

        setProcessing(true);
        fetch('/v1/sales-return/' + id + "?" + queryParams, requestOptions)
            .then(async response => {
                setProcessing(false);
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

                let salesReturn = data.result;
                // formData = purchaseReturn;

                if (data.result?.cash_discount) {
                    cashDiscount = data.result.cash_discount;
                    setCashDiscount(cashDiscount);
                } else {
                    cashDiscount = "";
                    setCashDiscount(cashDiscount);
                }

                if (data.result?.commission) {
                    commission = data.result.commission;
                    setCommission(commission);
                } else {
                    commission = "";
                    setCommission(commission);
                }

                if (data.result?.rounding_amount) {
                    roundingAmount = data.result.rounding_amount;
                    setRoundingAmount(roundingAmount);
                } else {
                    roundingAmount = 0;
                    setRoundingAmount(roundingAmount);
                }

                if (data.result?.discount) {
                    discount = (data.result?.discount);
                    setDiscount(discount);
                }

                if (data.result?.discount_with_vat) {
                    discountWithVAT = (data.result?.discount_with_vat);
                    setDiscountWithVAT(discountWithVAT);
                }

                if (data.result?.discount_percent) {
                    discountPercent = data.result?.discount_percent;
                    setDiscountPercent(discountPercent);
                }

                if (data.result?.discount_percent_with_vat) {
                    discountPercentWithVAT = data.result.discount_percent_with_vat;
                    setDiscountPercentWithVAT(discountPercentWithVAT);
                }

                if (data.result?.shipping_handling_fees) {
                    shipping = data.result?.shipping_handling_fees;
                    setShipping(shipping);
                }


                formData = {
                    id: salesReturn.id,
                    auto_rounding_amount: salesReturn.auto_rounding_amount,
                    uuid: salesReturn.uuid,
                    invoice_count_value: salesReturn.invoice_count_value,
                    code: salesReturn.code,
                    order_code: salesReturn.order_code,
                    order_id: salesReturn.order_id,
                    store_id: salesReturn.store_id,
                    customer_id: salesReturn.customer_id,
                    date_str: salesReturn.date,
                    payments_input: salesReturn.payments,
                    cash_discount: salesReturn.cash_discount,
                    vat_no: salesReturn.vat_no,
                    address: salesReturn.address,
                    phone: salesReturn.phone,
                    remarks: salesReturn.remarks,
                    // date: purchase.date,
                    vat_percent: salesReturn.vat_percent,
                    discount: salesReturn.discount,
                    discount_percent: salesReturn.discount_percent,
                    is_discount_percent: salesReturn.is_discount_percent,
                    payment_status: salesReturn.payment_status,
                    shipping_handling_fees: salesReturn.shipping_handling_fees,
                    customer: salesReturn.customer,
                    commission_payment_method: salesReturn.commission_payment_method,
                };

                if (!formData.payments_input) {
                    formData.payments_input = [];
                }

                if (data.result.payments) {
                    console.log("data.result.payments:", data.result.payments);
                    formData.payments_input = data.result.payments;
                    for (var i = 0; i < formData.payments_input?.length; i++) {
                        formData.payments_input[i].date_str = formData.payments_input[i].date
                    }
                }


                if (formData.customer_name && formData.customer_id) {
                    let selectedCustomers = [
                        {
                            id: formData.customer_id,
                            name: formData.customer.name,
                            search_label: formData.customer.search_label,
                        }
                    ];

                    setSelectedCustomers([...selectedCustomers]);
                }




                setFormData({ ...formData });

                console.log("formData1.status:", formData.status);


                console.log("purchaseReturn.products:", salesReturn.products);

                let selectedProductsTemp = salesReturn.products;

                selectedProducts = [];
                for (let i = 0; i < selectedProductsTemp.length; i++) {
                    selectedProducts.push(selectedProductsTemp[i]);

                    //selectedProductsTemp[i].purchase_unit_price = selectedProductsTemp[i].purchasereturn_unit_price;
                }
                console.log("selectedProducts:", selectedProducts);

                console.log("selectedProducts: ", selectedProducts.length);

                setSelectedProducts([...selectedProducts]);
                selectedProducts.forEach((product, index) => {
                    CalCulateLineTotals(index);
                });


                setFormData({ ...formData });
                reCalculate();
                checkWarnings();
                checkErrors();
            })
            .catch(error => {
                setProcessing(false);
                setErrors(error);
            });
    }


    useEffect(() => {
        const listener = event => {
            if (event.code === "Enter" || event.code === "NumpadEnter") {
                console.log("Enter key was pressed. Run your function.");
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

    let [order, setOrder] = useState({});

    function getOrder(id) {
        console.log("inside get SalesReturn");
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

        setProcessing(true);
        fetch('/v1/order/' + id + "?" + queryParams, requestOptions)
            .then(async response => {
                setProcessing(false);
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();

                // check for error response
                if (!response.ok) {
                    const error = (data && data.errors);
                    return Promise.reject(error);
                }

                setErrors({});

                console.log("Response sale:");
                console.log(data);

                order = data.result;
                setOrder(order);
                if (!saleReturnID) {
                    //Case: Create new sales return 
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

                    selectedProducts.forEach((product, index) => {
                        CalCulateLineTotals(index);
                    });

                    //formData = order;
                    console.log("order.id:", order.id);
                    formData.id = "";
                    formData.products = order.products;
                    // formData.order_id = order.id;
                    //console.log("formData.order_id:", formData.order_id);
                    formData.order_code = order.code;
                    formData.store_id = order.store_id;
                    formData.remarks = order.remarks;
                    formData.address = order.address;
                    formData.phone = order.phone;
                    formData.vat_no = order.vat_no;
                    formData.enable_report_to_zatca = false;
                    /*
                    formData.received_by = order.delivered_by;
                    formData.received_by_signature_id = order.delivered_by_signature_id;
                    */
                    formData.customer_id = order.customer_id;

                    // formData.is_discount_percent = order.is_discount_percent;
                    formData.discount_percent = order.discount_percent;
                    formData.shipping_handling_fees = order.shipping_handling_fees;
                    // shipping = order.shipping_handling_fees;
                    // setShipping(shipping);

                    formData.auto_rounding_amount = order.auto_rounding_amount;

                    if (order.payment_status === "not_paid") {
                        formData.payments_input = [];

                    }

                    if (!order.auto_rounding_amount) {
                        if (data.result?.rounding_amount) {
                            roundingAmount = data.result.rounding_amount;
                            setRoundingAmount(roundingAmount);
                        } else {
                            roundingAmount = 0;
                            setRoundingAmount(roundingAmount);
                        }
                    }



                    if (data.result?.discount) {
                        if (data.result?.return_discount) {
                            discount = (data.result?.discount - data.result?.return_discount);
                        } else {
                            discount = (data.result?.discount);
                        }

                        setDiscount(discount);
                    }

                    if (data.result?.discount_with_vat) {
                        if (data.result?.return_discount_with_vat) {
                            discountWithVAT = (data.result?.discount_with_vat - data.result?.return_discount_with_vat);
                        } else {
                            discountWithVAT = (data.result?.discount_with_vat);
                        }

                        setDiscountWithVAT(discountWithVAT);
                    }

                    if (data.result?.discount_percent) {
                        discountPercent = data.result?.discount_percent;
                        setDiscountPercent(discountPercent);
                    }

                    if (data.result?.discount_percent_with_vat) {
                        discountPercentWithVAT = data.result.discount_percent_with_vat;
                        setDiscountPercentWithVAT(discountPercentWithVAT);
                    }

                    if (data.result?.shipping_handling_fees) {
                        shipping = data.result?.shipping_handling_fees;
                        setShipping(shipping);
                    }

                    cashDiscount = parseFloat(order.cash_discount - order.return_cash_discount);
                    setCashDiscount(cashDiscount);

                    commission = parseFloat(order.commission);
                    setCommission(commission);

                    formData.commission_payment_method = order.commission_payment_method;
                    // formData.discount = (order.discount - order.return_discount);

                    // formData.discount_percent = order.discount_percent;



                    // setFormData({ ...formData });
                    console.log("formData:", formData);


                    selectedStores = [
                        {
                            id: order.store_id,
                            name: order.store_name,
                        }
                    ];

                    setSelectedStores(selectedStores);
                    console.log("selectedStores:", selectedStores);
                    setFormData({ ...formData });
                    reCalculate();
                    setFormData({ ...formData });
                }
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

    //const history = useHistory();
    let [errors, setErrors] = useState({});
    const [isProcessing, setProcessing] = useState(false);


    //fields
    let [formData, setFormData] = useState({
        order_id: "",
        vat_percent: 15.0,
        discount: 0.0,
        date_str: format(new Date(), "MMM dd yyyy"),
        signature_date_str: format(new Date(), "MMM dd yyyy"),
        status: "received",
        payment_status: "",
        payment_method: "",
        price_type: "retail",
    });

    let [selectedStores, setSelectedStores] = useState([]);




    //Product Auto Suggestion
    let [selectedProducts, setSelectedProducts] = useState(null);

    //Received By Auto Suggestion

    let [selectedReceivedByUsers, setSelectedReceivedByUsers] = useState([]);


    const [show, setShow] = useState(false);

    function handleClose() {
        setShow(false);
    }

    useEffect(() => {
        let at = localStorage.getItem("access_token");
        if (!at) {
            // history.push("/dashboard/salesreturns");
            window.location = "/";
        }
    });



    function openQuotationSalesHistory(model) {
        QuotationHistoryRef.current.open(model, selectedCustomers, "invoice");
    }

    const QuotationSalesReturnHistoryRef = useRef();
    function openQuotationSalesReturnHistory(model) {
        QuotationSalesReturnHistoryRef.current.open(model, selectedCustomers);
    }
    const SHORTCUTS = {
        DEFAULT: {
            linkedProducts: "Ctrl + Shift + 1",
            productHistory: "Ctrl + Shift + 2",
            salesHistory: "Ctrl + Shift + 3",
            salesReturnHistory: "Ctrl + Shift + 4",
            purchaseHistory: "Ctrl + Shift + 5",
            purchaseReturnHistory: "Ctrl + Shift + 6",
            deliveryNoteHistory: "Ctrl + Shift + 7",
            quotationHistory: "Ctrl + Shift + 8",
            quotationSalesHistory: "Ctrl + Shift + 9",
            quotationSalesReturnHistory: "Ctrl + Shift + Z",
            images: "Ctrl + Shift + F",
        },
        LGK: {
            linkedProducts: "F10",
            productHistory: "Ctrl + Shift + B",
            salesHistory: "F4",
            salesReturnHistory: "F9",
            purchaseHistory: "F6",
            purchaseReturnHistory: "F8",
            deliveryNoteHistory: "F3",
            quotationHistory: "F2",
            quotationSalesHistory: "Ctrl + Shift + P",
            quotationSalesReturnHistory: "Ctrl + Shift + Z",
            images: "Ctrl + Shift + F",
        },
        MBDI: {
            linkedProducts: "F10",
            productHistory: "Ctrl + Shift + 6",
            salesHistory: "F4",
            salesReturnHistory: "F9",
            purchaseHistory: "F6",
            purchaseReturnHistory: "F8",
            deliveryNoteHistory: "F3",
            quotationHistory: "F2",
            quotationSalesHistory: "Ctrl + Shift + 7",
            quotationSalesReturnHistory: "Ctrl + Shift + 8",
            images: "Ctrl + Shift + 9",
        },
    };

    function getShortcut(key) {
        const code = (store && store.code) ? store.code : "DEFAULT";
        return (SHORTCUTS[code] && SHORTCUTS[code][key]) || SHORTCUTS.DEFAULT[key] || "";
    }
    // ...existing code...
    function RunKeyActions(event, product) {
        // detect mac
        const isMac = (typeof navigator !== "undefined") && (
            (navigator.userAgentData && navigator.userAgentData.platform === "macOS") ||
            (navigator.platform && /mac/i.test(navigator.platform)) ||
            /Mac/i.test(navigator.userAgent)
        );
        const isCmdOrCtrl = isMac ? event.metaKey : event.ctrlKey;

        // LGK store uses original simple mapping
        if (store?.code === "LGK") {
            if (event.key === "F10") {
                openLinkedProducts(product);
            } else if (isCmdOrCtrl && event.shiftKey && event.key.toLowerCase() === 'b') {
                openProductHistory(product);
            } else if (event.key === "F4") {
                openSalesHistory(product);
            } else if (event.key === "F9") {
                openSalesReturnHistory(product);
            } else if (event.key === "F6") {
                openPurchaseHistory(product);
            } else if (event.key === "F8") {
                openPurchaseReturnHistory(product);
            } else if (event.key === "F3") {
                openDeliveryNoteHistory(product);
            } else if (event.key === "F2") {
                openQuotationHistory(product);
            } else if (isCmdOrCtrl && event.shiftKey && event.key.toLowerCase() === 'p') {
                openQuotationSalesHistory(product);
            } else if (isCmdOrCtrl && event.shiftKey && event.key.toLowerCase() === 'z') {
                openQuotationSalesReturnHistory(product);
            } else if (isCmdOrCtrl && event.shiftKey && event.key.toLowerCase() === 'f') {
                openProductImages(product.product_id);
            }
            return;
        } else if (store?.code === "MBDI") {
            if (event.key === "F10") {
                openLinkedProducts(product);
            } else if (isCmdOrCtrl && event.shiftKey && event.key.toLowerCase() === '6') {
                openProductHistory(product);
            } else if (event.key === "F4") {
                openSalesHistory(product);
            } else if (event.key === "F9") {
                openSalesReturnHistory(product);
            } else if (event.key === "F6") {
                openPurchaseHistory(product);
            } else if (event.key === "F8") {
                openPurchaseReturnHistory(product);
            } else if (event.key === "F3") {
                openDeliveryNoteHistory(product);
            } else if (event.key === "F2") {
                openQuotationHistory(product);
            } else if (isCmdOrCtrl && event.shiftKey && event.key.toLowerCase() === '7') {
                openQuotationSalesHistory(product);
            } else if (isCmdOrCtrl && event.shiftKey && event.key.toLowerCase() === '8') {
                openQuotationSalesReturnHistory(product);
            } else if (isCmdOrCtrl && event.shiftKey && event.key.toLowerCase() === '9') {
                openProductImages(product.product_id);
            }
            return;
        }

        // Default: require Ctrl/Cmd + Shift for letter shortcuts and numeric mapping
        if (!isCmdOrCtrl || !event.shiftKey) return;

        const rawKey = event.key || "";
        const key = rawKey.toString().toLowerCase();
        const code = event.code || "";
        const keyCode = event.which || event.keyCode || 0;
        const location = event.location || 0; // 3 === Numpad

        // handle letter shortcuts first (Ctrl/Cmd + Shift + <letter>)
        if (key === "b") {
            try { event.preventDefault(); } catch (e) { }
            openProductHistory(product);
            return;
        }
        if (key === "p") {
            try { event.preventDefault(); } catch (e) { }
            openQuotationSalesHistory(product);
            return;
        }
        if (key === "z") {
            try { event.preventDefault(); } catch (e) { }
            openQuotationSalesReturnHistory(product);
            return;
        }
        if (key === "f") {
            try { event.preventDefault(); } catch (e) { }
            openProductImages(product.product_id);
            return;
        }

        // numeric mapping (supports top-row, numpad, shifted symbols and keyCode fallbacks)
        const codeToDigit = {
            Digit1: "1", Digit2: "2", Digit3: "3", Digit4: "4", Digit5: "5",
            Digit6: "6", Digit7: "7", Digit8: "8", Digit9: "9", Digit0: "0",
            Numpad1: "1", Numpad2: "2", Numpad3: "3", Numpad4: "4", Numpad5: "5",
            Numpad6: "6", Numpad7: "7", Numpad8: "8", Numpad9: "9", Numpad0: "0"
        };

        const symbolToDigit = {
            "!": "1", "@": "2", "#": "3", "$": "4", "%": "5",
            "^": "6", "&": "7", "*": "8", "(": "9", ")": "0"
        };

        let digit = null;

        if (code && codeToDigit[code]) {
            digit = codeToDigit[code];
        } else if (rawKey && symbolToDigit[rawKey]) {
            digit = symbolToDigit[rawKey];
        } else if (/^[0-9]$/.test(key)) {
            digit = key;
        } else if (keyCode >= 48 && keyCode <= 57) {
            digit = String(keyCode - 48);
        } else if (keyCode >= 96 && keyCode <= 105) {
            digit = String(keyCode - 96);
        } else if (location === 3 && /^[0-9]$/.test(key)) {
            digit = key;
        }

        if (digit) {
            try { event.preventDefault(); } catch (e) { /* ignore */ }

            switch (digit) {
                case "1": openLinkedProducts(product); return;
                case "2": openProductHistory(product); return;
                case "3": openSalesHistory(product); return;
                case "4": openSalesReturnHistory(product); return;
                case "5": openPurchaseHistory(product); return;
                case "6": openPurchaseReturnHistory(product); return;
                case "7": openDeliveryNoteHistory(product); return;
                case "8": openQuotationHistory(product); return;
                case "9": openQuotationSalesHistory(product); return;
                case "0": openQuotationSalesReturnHistory(product); return;
                default: break;
            }
        }

        return;
    }

    const imageViewerRef = useRef();
    let [productImages, setProductImages] = useState([]);

    async function openProductImages(id) {
        let product = await getProduct(id);
        productImages = product?.images;
        setProductImages(productImages);
        imageViewerRef.current.open(0);
    }

    async function getProduct(id) {
        console.log("inside get Product");
        const requestOptions = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: localStorage.getItem("access_token"),
            },
        };

        let searchParams = {};
        if (localStorage.getItem("store_id")) {
            searchParams.store_id = localStorage.getItem("store_id");
        }
        let queryParams = ObjectToSearchQueryParams(searchParams);

        try {
            const response = await fetch(`/v1/product/${id}?${queryParams}`, requestOptions);
            const isJson = response.headers.get("content-type")?.includes("application/json");
            const data = isJson ? await response.json() : null;

            if (!response.ok) {
                const error = data?.errors || "Unknown error";
                throw error;
            }

            return data.result;  // ✅ return the result here
        } catch (error) {
            setProcessing(false);
            setErrors(error);
            return null;  // ✅ explicitly return null or a fallback if there's an error
        }
    }



    function handleCreate(event) {
        let haveErrors = false;
        event.preventDefault();
        console.log("Inside handle Create");
        console.log("selectedProducts:", selectedProducts);
        console.log("formData.order_id:", formData.order_id);

        if (!cashDiscount) {
            formData.cash_discount = 0;
        } else {
            formData.cash_discount = cashDiscount;
        }

        if (!commission) {
            formData.commission = 0;
        } else {
            formData.commission = commission;
        }


        if (!roundingAmount) {
            formData.rounding_amount = 0;
        } else {
            formData.rounding_amount = roundingAmount;
        }

        if (discount) {
            formData.discount = discount;
        } else {
            formData.discount = 0;
        }

        if (discountWithVAT) {
            formData.discount_with_vat = discountWithVAT;
        } else {
            formData.discount_with_vat = 0;
        }

        if (discountPercent) {
            formData.discount_percent = discountPercent;
        } else {
            formData.discount_percent = 0;
        }

        if (discountPercentWithVAT) {
            formData.discount_percent_with_vat = discountPercentWithVAT;
        } else {
            formData.discount_percent_with_vat = 0;
        }

        formData.products = [];
        let selectedProductsCount = 0
        for (var i = 0; i < selectedProducts?.length; i++) {
            if (selectedProducts[i].selected) {
                selectedProductsCount++;
            }

            let unitPrice = parseFloat(selectedProducts[i].unit_price);

            if (unitPrice && /^\d*\.?\d{0,8}$/.test(unitPrice) === false) {
                errors["unit_price_" + i] = "Max decimal points allowed is 8";
                setErrors({ ...errors });
                haveErrors = true;
            }

            let unitPriceWithVAT = parseFloat(selectedProducts[i].unit_price_with_vat);

            if (unitPriceWithVAT && /^\d*\.?\d{0,8}$/.test(unitPriceWithVAT) === false) {
                errors["unit_price_with_vat_" + i] = "Max decimal points allowed is 8";
                setErrors({ ...errors });
                haveErrors = true;
            }


            let unitDiscount = 0.00;

            if (selectedProducts[i].unit_discount) {
                unitDiscount = parseFloat(selectedProducts[i].unit_discount)
                if (/^\d*\.?\d{0,8}$/.test(unitDiscount) === false) {
                    errors["unit_discount_" + i] = "Max decimal points allowed is 8";
                    setErrors({ ...errors });
                    haveErrors = true;
                }
            }

            let unitDiscountWithVAT = 0.00;

            if (selectedProducts[i].unit_discount_with_vat) {
                unitDiscountWithVAT = parseFloat(selectedProducts[i].unit_discount_with_vat)
                if (/^\d*\.?\d{0,8}$/.test(unitDiscountWithVAT) === false) {
                    errors["unit_discount_with_vat_" + i] = "Max decimal points allowed is 8";
                    setErrors({ ...errors });
                    haveErrors = true;
                }
            }

            let unitDiscountPercent = 0.00;

            if (selectedProducts[i].unit_discount_percent) {
                unitDiscountPercent = parseFloat(selectedProducts[i].unit_discount_percent)
                if (/^\d*\.?\d{0,8}$/.test(unitDiscountPercent) === false) {
                    errors["unit_discount_percent_" + i] = "Max decimal points allowed is 8";
                    setErrors({ ...errors });
                    haveErrors = true;
                }
            }

            let unitDiscountPercentWithVAT = 0.00;

            if (selectedProducts[i].unit_discount_percent_with_vat) {
                unitDiscountPercentWithVAT = parseFloat(selectedProducts[i].unit_discount_percent_with_vat)
                if (/^\d*\.?\d{0,8}$/.test(unitDiscountPercent) === false) {
                    errors["unit_discount_percent_with_vat" + i] = "Max decimal points allowed is 8";
                    setErrors({ ...errors });
                    haveErrors = true;
                }
            }


            /*
            formData.products.push({
                product_id: selectedProducts[i].product_id,
                name: selectedProducts[i].name,
                quantity: parseFloat(selectedProducts[i].quantity),
                unit_price: unitPrice,
                unit: selectedProducts[i].unit,
                selected: selectedProducts[i].selected,
                purchase_unit_price: selectedProducts[i].purchase_unit_price ? parseFloat(selectedProducts[i].purchase_unit_price) : 0,
                unit_discount: unitDiscount,
                unit_discount_percent: selectedProducts[i].unit_discount_percent ? parseFloat(selectedProducts[i].unit_discount_percent) : 0,
            });*/

            formData.products.push({
                product_id: selectedProducts[i].product_id,
                name: selectedProducts[i].name,
                part_number: selectedProducts[i].part_number,
                quantity: parseFloat(selectedProducts[i].quantity),
                unit_price: unitPrice ? unitPrice : 0.00,
                unit_price_with_vat: selectedProducts[i].unit_price_with_vat ? selectedProducts[i].unit_price_with_vat : 0.00,
                purchase_unit_price: selectedProducts[i].purchase_unit_price ? parseFloat(selectedProducts[i].purchase_unit_price) : 0,
                purchase_unit_price_with_vat: selectedProducts[i].purchase_unit_price ? parseFloat(selectedProducts[i].purchase_unit_price_with_vat) : 0,
                unit_discount: unitDiscount,
                unit_discount_with_vat: unitDiscountWithVAT,
                unit_discount_percent: unitDiscountPercent,
                unit_discount_percent_with_vat: unitDiscountPercentWithVAT,
                unit: selectedProducts[i].unit,
                selected: selectedProducts[i].selected,
                warehouse_id: selectedProducts[i].warehouse_id ? selectedProducts[i].warehouse_id : null,
                warehouse_code: selectedProducts[i].warehouse_code ? selectedProducts[i].warehouse_code : null,
            });
        }

        formData.discount = parseFloat(formData.discount);
        formData.discount_percent = parseFloat(formData.discount_percent);

        formData.vat_percent = parseFloat(formData.vat_percent);
        console.log("formData.discount:", formData.discount);


        delete errors["products"];
        setErrors({ ...errors });

        if (selectedProductsCount === 0) {
            errors["products"] = "No products selected";
            setErrors({ ...errors });
            haveErrors = true;
        }


        if (formData.products.length === 0) {
            errors["products"] = "No products added";
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

        if (!validatePaymentAmounts()) {
            console.log("Errors on payments")
            haveErrors = true;
        }

        if (!formData.shipping_handling_fees && formData.shipping_handling_fees !== 0) {
            errors["shipping_handling_fees"] = "Invalid shipping / handling fees";
            setErrors({ ...errors });
            haveErrors = true;
        }

        if (/^\d*\.?\d{0,2}$/.test(parseFloat(formData.shipping_handling_fees)) === false) {
            errors["shipping_handling_fees"] = "Max. decimal points allowed is 2";
            setErrors({ ...errors });
            haveErrors = true;
        }



        if (/^-?\d*\.?\d{0,2}$/.test(parseFloat(formData.rounding_amount)) === false) {
            errors["rounding_amount"] = "Max. decimal points allowed is 2";
            setErrors({ ...errors });
            haveErrors = true;
        }


        if (!formData.discount && formData.discount !== 0) {
            errors["discount"] = "Invalid discount";
            setErrors({ ...errors });
            haveErrors = true;
        }

        if (/^\d*\.?\d{0,2}$/.test(parseFloat(formData.discount)) === false) {
            errors["discount"] = "Max. decimal points allowed is 2";
            setErrors({ ...errors });
            haveErrors = true;
        }


        if (haveErrors) {
            console.log("Errors: ", errors);
            return;
        }


        formData.net_total = parseFloat(formData.net_total);
        formData.total_payment_paid = parseFloat(totalPaymentAmount);
        formData.balance_amount = parseFloat(balanceAmount);

        if (order.payment_status === "not_paid") {
            formData.payments_input = [];
        }


        let endPoint = "/v1/sales-return";
        let method = "POST";
        if (formData.id) {
            endPoint = "/v1/sales-return/" + formData.id;
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

        console.log("formData:", formData);

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

                if (props.handleUpdated) {
                    props.handleUpdated();
                }

                setErrors({});
                setProcessing(false);

                console.log("Response:");
                console.log(data);
                if (formData.id) {
                    if (props.showToastMessage) props.showToastMessage("Sales return updated successfully!", "success");
                } else {
                    if (props.showToastMessage) props.showToastMessage("Sales return created successfully!", "success");
                }

                if (props.refreshList) {
                    props.refreshList();
                }
                handleClose();

                if (props.refreshSalesList) {
                    props.refreshSalesList();
                }

                if (props.onUpdated) {
                    props.onUpdated();
                }

                openDetailsView(data.result.id);
            })
            .catch((error) => {
                setProcessing(false);
                console.log("Inside catch");
                console.log(error);
                setErrors({ ...error });
                console.error("There was an error!", error);
                if (props.showToastMessage) props.showToastMessage("Failed to process sales return!", "danger");
            });
    }

    function CalCulateLineTotals(index, skipTotal, skipTotalWithVAT) {

        if (!skipTotal) {
            selectedProducts[index].line_total = parseFloat(trimTo2Decimals((selectedProducts[index]?.unit_price - selectedProducts[index]?.unit_discount) * selectedProducts[index]?.quantity));
        }

        if (!skipTotalWithVAT) {
            selectedProducts[index].line_total_with_vat = parseFloat(trimTo2Decimals((selectedProducts[index]?.unit_price_with_vat - selectedProducts[index]?.unit_discount_with_vat) * selectedProducts[index]?.quantity));
        }

        setSelectedProducts([...selectedProducts]);
    }

    let [cashDiscount, setCashDiscount] = useState("");
    let [commission, setCommission] = useState("");
    let [roundingAmount, setRoundingAmount] = useState(0.00);
    let [shipping, setShipping] = useState(0.00);
    let [discount, setDiscount] = useState(0.00);
    let [discountPercent, setDiscountPercent] = useState(0.00);

    let [discountWithVAT, setDiscountWithVAT] = useState(0.00);
    let [discountPercentWithVAT, setDiscountPercentWithVAT] = useState(0.00);


    async function reCalculate(productIndex) {
        console.log("inside reCalculate");
        if (!cashDiscount) {
            formData.cash_discount = 0;
        } else {
            formData.cash_discount = cashDiscount;
        }

        if (!commission) {
            formData.commission = 0;
        } else {
            formData.commission = commission;
        }

        if (!roundingAmount) {
            formData.rounding_amount = 0;
        } else {
            formData.rounding_amount = roundingAmount;
        }

        if (!discountWithVAT) {
            formData.discount_with_vat = 0
        } else {
            formData.discount_with_vat = discountWithVAT;
        }

        if (!discount) {
            formData.discount = 0;
        } else {
            formData.discount = discount;
        }

        if (!discountPercent) {
            formData.discount_percent = 0;
        } else {
            formData.discount_percent = discountPercent;
        }

        if (!discountPercentWithVAT) {
            formData.discount_percent_with_vat = 0;
        } else {
            formData.discount_percent_with_vat = discountPercentWithVAT;
        }


        if (!shipping) {
            formData.shipping_handling_fees = 0;
        } else {
            formData.shipping_handling_fees = shipping;
        }



        formData.products = [];
        for (var i = 0; i < selectedProducts.length; i++) {

            let unitPrice = parseFloat(selectedProducts[i].unit_price);
            console.log("unitPrice:", unitPrice);
            console.log("selectedProducts[i].unit_price_with_vat:", selectedProducts[i].unit_price_with_vat);


            let unitPriceWithVAT = parseFloat(selectedProducts[i].unit_price_with_vat);
            /*
            if (unitPrice && /^\d*\.?\d{0,2}$/.test(unitPrice) === false) {
                errors["unit_price_" + i] = "Max decimal points allowed is 2 - WIITHOUT VAT";
                setErrors({ ...errors });
                return;
    
            }
    
          
    
    
            if (unitPriceWithVAT && /^\d*\.?\d{0,2}$/.test(unitPriceWithVAT) === false) {
                errors["unit_price_with_vat" + i] = "Max decimal points allowed is 2 - WITH VAT";
                setErrors({ ...errors });
                return;
    
            }*/



            let unitDiscount = 0.00;

            if (selectedProducts[i].unit_discount) {
                unitDiscount = parseFloat(selectedProducts[i].unit_discount)
                /*
                if (/^\d*\.?\d{0,2}$/.test(unitDiscount) === false) {
                    errors["unit_discount_" + i] = "Max decimal points allowed is 2";
                    setErrors({ ...errors });
                    return;
                }*/
            }

            let unitDiscountWithVAT = 0.00;

            if (selectedProducts[i].unit_discount_with_vat) {
                unitDiscountWithVAT = parseFloat(selectedProducts[i].unit_discount_with_vat)
                /*
                if (/^\d*\.?\d{0,2}$/.test(unitDiscount) === false) {
                    errors["unit_discount_" + i] = "Max decimal points allowed is 2";
                    setErrors({ ...errors });
                    return;
                }*/
            }


            formData.products.push({
                product_id: selectedProducts[i].product_id,
                quantity: parseFloat(selectedProducts[i].quantity),
                unit_price: unitPrice ? unitPrice : 0.00,
                unit_price_with_vat: unitPriceWithVAT ? unitPriceWithVAT : 0.00,
                purchase_unit_price: selectedProducts[i].purchase_unit_price ? parseFloat(selectedProducts[i].purchase_unit_price) : 0,
                purchase_unit_price_with_vat: selectedProducts[i].purchase_unit_price_with_vat ? parseFloat(selectedProducts[i].purchase_unit_price_with_vat) : 0,
                unit_discount: unitDiscount,
                unit_discount_with_vat: unitDiscountWithVAT,
                unit_discount_percent: selectedProducts[i].unit_discount_percent ? parseFloat(selectedProducts[i].unit_discount_percent) : 0,
                unit_discount_percent_with_vat: selectedProducts[i].unit_discount_percent_with_vat ? parseFloat(selectedProducts[i].unit_discount_percent_with_vat) : 0,
                unit: selectedProducts[i].unit,
                selected: selectedProducts[i].selected,
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

        let result;
        try {
            result = await fetch(
                "/v1/sales-return/calculate-net-total",
                requestOptions
            );
            console.log("Done")
            if (!result.ok) {
                return;
            }


            let res = await result.json();
            if (res.result) {
                formData.total = res.result.total;
                formData.total_with_vat = res.result.total_with_vat;
                //  formData.rounding_amount = res.result.rounding_amount;
                formData.net_total = res.result.net_total;
                formData.vat_price = res.result.vat_price;


                if ((res.result.rounding_amount || res.result.rounding_amount === 0) && formData.auto_rounding_amount) {
                    roundingAmount = res.result.rounding_amount;
                    setRoundingAmount(roundingAmount);
                }


                if (res.result.discount_percent) {
                    discountPercent = res.result.discount_percent;
                    setDiscountPercent(discountPercent);
                } else {
                    discountPercent = 0;
                    setDiscountPercent(discountPercent);
                }


                if (res.result.discount_percent_with_vat) {
                    discountPercentWithVAT = res.result.discount_percent_with_vat;
                    setDiscountPercentWithVAT(discountPercentWithVAT);
                } else {
                    discountPercentWithVAT = 0;
                    setDiscountPercentWithVAT(discountPercentWithVAT);
                }

                /*
                if (res.result.discount) {
                    discount = res.result.discount;
                    setDiscount(discount);
                }

                if (res.result.discount_with_vat) {
                    discountWithVAT = res.result.discount_with_vat;
                    setDiscountWithVAT(discountWithVAT);
                }*/


                if (res.result.shipping_handling_fees) {
                    formData.shipping_handling_fees = res.result.shipping_handling_fees;
                }


                for (let i = 0; i < selectedProducts?.length; i++) {
                    for (let j = 0; j < res.result?.products?.length; j++) {
                        if (res.result?.products[j].product_id === selectedProducts[i].product_id) {

                            /*
                            if (res.result?.products[j].unit_discount_percent) {
                                selectedProducts[i].unit_discount_percent = res.result?.products[j].unit_discount_percent;
                            }

                            if (res.result?.products[j].unit_discount_percent_with_vat) {
                                selectedProducts[i].unit_discount_percent_with_vat = res.result?.products[j].unit_discount_percent_with_vat;
                            }

                            if (res.result?.products[j].unit_discount) {
                                selectedProducts[i].unit_discount = res.result?.products[j].unit_discount;
                            }


                            if (res.result?.products[j].unit_price) {
                                selectedProducts[i].unit_price = res.result?.products[j].unit_price;
                            }

                            if (res.result?.products[j].unit_price_with_vat) {
                                selectedProducts[i].unit_price_with_vat = res.result?.products[j].unit_price_with_vat;
                            }*/

                            /*
                            if (res.result?.products[j].unit_price) {
                                selectedProducts[i].unit_price = res.result?.products[j].unit_price;
                            } else if (res.result?.products[j].unit_price === 0 || !res.result?.products[j].unit_price) {
                                selectedProducts[i].unit_price = "";
                            }
    
                            if (res.result?.products[j].unit_price_with_vat) {
                                selectedProducts[i].unit_price_with_vat = res.result?.products[j].unit_price_with_vat;
                            } else if (res.result?.products[j].unit_price_with_vat === 0 || !res.result?.products[j].unit_price_with_vat) {
                                selectedProducts[i].unit_price_with_vat = "";
                            }
                                */
                            console.log("Discounts updated from server")
                        }
                    }
                }
                // setSelectedProducts([...selectedProducts]);
                /*
                    selectedProducts[index].unit_discount_percent
                    selectedProducts = formData.products;
                    setSelectedProducts([...selectedProducts]);
                */
                setFormData({ ...formData });
            }


            if (!formData.id) {
                if (formData.payments_input?.length === 1) {
                    formData.payments_input[0].amount = parseFloat(trimTo2Decimals(formData.net_total));
                    if (formData.payments_input[0].amount > formData.cash_discount) {
                        formData.payments_input[0].amount = parseFloat(trimTo2Decimals(formData.payments_input[0].amount - formData.cash_discount));
                    }

                    if (formData.payments_input[0].amount > order?.total_payment_received) {
                        formData.payments_input[0].amount = order.total_payment_received;
                    }
                }
            } else {
                if (formData.payments_input?.length === 1 && formData.payment_status === "paid") {
                    formData.payments_input[0].amount = parseFloat(trimTo2Decimals(formData.net_total));
                    if (formData.payments_input[0].amount > formData.cash_discount) {
                        formData.payments_input[0].amount = parseFloat(trimTo2Decimals(formData.payments_input[0].amount - formData.cash_discount));
                    }
                }
            }

            findTotalPayments();
            setFormData({ ...formData });
            validatePaymentAmounts();
        } catch (err) {
            console.error("Failed to parse response:", err);
        }
    }



    const StoreCreateFormRef = useRef();

    const CustomerCreateFormRef = useRef();
    const ProductCreateFormRef = useRef();



    const UserCreateFormRef = useRef();


    const SignatureCreateFormRef = useRef();


    let [totalPaymentAmount, setTotalPaymentAmount] = useState(0.00);
    let [balanceAmount, setBalanceAmount] = useState(0.00);
    let [paymentStatus, setPaymentStatus] = useState("");

    function findTotalPayments() {
        let totalPayment = 0.00;
        for (var i = 0; i < formData.payments_input?.length; i++) {
            if (formData.payments_input[i].amount && !formData.payments_input[i].deleted) {
                totalPayment += formData.payments_input[i].amount;
            }
        }

        totalPaymentAmount = totalPayment;
        setTotalPaymentAmount(totalPaymentAmount);
        balanceAmount = (parseFloat(trimTo2Decimals(formData.net_total)) - parseFloat(parseFloat(trimTo2Decimals(cashDiscount)))) - parseFloat(trimTo2Decimals(totalPayment));
        balanceAmount = parseFloat(trimTo2Decimals(balanceAmount));
        setBalanceAmount(balanceAmount);

        if (balanceAmount === (parseFloat(trimTo2Decimals(formData.net_total)) - parseFloat(trimTo2Decimals(cashDiscount)))) {
            paymentStatus = "not_paid"
        } else if (balanceAmount <= 0) {
            paymentStatus = "paid"
        } else if (balanceAmount > 0) {
            paymentStatus = "paid_partially"
        }

        setPaymentStatus(paymentStatus);

        return totalPayment;
    }

    function validatePaymentAmounts() {
        findTotalPayments();

        if (selectedProducts && selectedProducts.filter(product => product.selected).length === 0) {
            return true;
        }

        delete errors["cash_discount"];
        setErrors({ ...errors });
        let haveErrors = false;
        if (!formData.net_total) {
            /*
            removePayment(0,false);
            totalPaymentAmount=0.0;
            setTotalPaymentAmount(0.00);
            balanceAmount=0.00;
            setBalanceAmount(0.00);
            paymentStatus="";
            setPaymentStatus(paymentStatus);
            */
            // return true;
        }



        if (formData.net_total && cashDiscount > 0 && cashDiscount >= formData.net_total) {
            errors["cash_discount"] = "Cash discount should not be >= " + trimTo2Decimals(formData.net_total).toString();
            setErrors({ ...errors });
            haveErrors = true
            return false;
        }

        if (formData.net_total && commission > 0 && commission >= formData.net_total) {
            errors["commission"] = "Commission should not be >= " + trimTo2Decimals(formData.net_total).toString();
            setErrors({ ...errors });
            haveErrors = true
            return false;
        }

        if (order.payment_status === "not_paid") {
            return true;
        }

        // errors["payment_date"] = [];
        //errors["payment_method"] = [];
        //errors["payment_amount"] = [];
        for (var key = 0; key < formData.payments_input?.length; key++) {
            delete errors["payment_amount_" + key];
            delete errors["payment_date_" + key];
            delete errors["payment_method_" + key];
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
            }/* else if ((new Date(formData.payments_input[key].date_str)) < (new Date(formData.date_str))) {
                errors["payment_date_" + key] = "Payment date time should be greater than or equal to order date time";
                setErrors({ ...errors });
                haveErrors = true;
            }*/

            if (!formData.payments_input[key].method) {
                errors["payment_method_" + key] = "Payment method is required";
                setErrors({ ...errors });
                haveErrors = true;
            }
        }

        if (haveErrors) {
            return false;
        }

        return true;
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

    function removePayment(key, validatePayments = false) {
        formData.payments_input.splice(key, 1);

        delete errors["payment_method_" + key];
        setFormData({ ...formData });
        if (validatePayments) {
            validatePaymentAmounts();
        }
        findTotalPayments()
    }

    const DetailsViewRef = useRef();
    function openDetailsView(id) {
        DetailsViewRef.current.open(id);
    }

    const PreviewRef = useRef();
    function openPreview() {
        let model = formData;
        model.products = selectedProducts;
        model.payment_status = paymentStatus;
        model.date = formData.date_str;
        model.uuid = formData.uuid;
        model.invoice_count_value = formData.invoice_count_value;
        model.code = formData.code;
        PreviewRef.current.open(model, undefined, "sales_return");
    }


    const ProductsRef = useRef();
    function openLinkedProducts(model) {
        ProductsRef.current.open(false, "linked_products", model);
    }


    const SalesHistoryRef = useRef();
    function openSalesHistory(model) {
        SalesHistoryRef.current.open(model, selectedCustomers);
    }

    const SalesReturnHistoryRef = useRef();
    function openSalesReturnHistory(model) {
        SalesReturnHistoryRef.current.open(model, selectedCustomers);
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
        DeliveryNoteHistoryRef.current.open(model, selectedCustomers);
    }


    const QuotationHistoryRef = useRef();
    function openQuotationHistory(model) {
        QuotationHistoryRef.current.open(model, selectedCustomers);
    }



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
        delete errors["phone"];
        setErrors({ ...errors });

        if (model.phone) {
            if (!validatePhoneNumber(model.phone)) {
                errors["phone"] = "Invalid phone no."
                setErrors({ ...errors });
                return;
            }
        }

        PreviewRef.current.open(model, "whatsapp", "whatsapp_sales_return");
    }

    const timerRef = useRef(null);

    const isAllSelected = selectedProducts?.every((product) => product.selected);

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            for (let i = 0; i < selectedProducts?.length; i++) {
                selectedProducts[i].selected = true;
            }
        } else {
            for (let i = 0; i < selectedProducts?.length; i++) {
                selectedProducts[i].selected = false;
            }
        }
        setSelectedProducts([...selectedProducts]);
        reCalculate();
    };


    const renderTooltip = (props) => (
        <Tooltip id="label-tooltip" {...props}>
            Total(without VAT) + Shipping & Handling Fees - Discount(without VAT)
            {"(" + trimTo2Decimals(formData.total) + " + " + trimTo2Decimals(shipping) + " - " + trimTo2Decimals(discount) + ") = " + trimTo2Decimals(formData.total + shipping - discount)}
        </Tooltip>
    );

    const renderNetTotalBeforeRoundingTooltip = (props) => (
        <Tooltip id="label-tooltip" {...props}>
            Total Taxable Amount(without VAT) + VAT Price ( 15% of Taxable Amount)
            {"(" + trimTo2Decimals(formData.total + shipping - discount) + " + " + trimTo2Decimals(formData.vat_price) + ") = " + trimTo2Decimals(formData.net_total - roundingAmount)}
        </Tooltip>
    );

    const renderNetTotalTooltip = (props) => (
        <Tooltip id="label-tooltip" {...props}>
            Total Taxable Amount(without VAT) + VAT Price ( 15% of Taxable Amount) {roundingAmount > 0 ? " + Rounding Amount" : " - Rounding Amount"}
            {"(" + trimTo2Decimals(formData.total + shipping - discount) + " + " + trimTo2Decimals(formData.vat_price) + `${roundingAmount > 0 ? " + " : " - "}` + trimTo2Decimals(roundingAmount) + " ) = " + trimTo2Decimals(formData.net_total)}
        </Tooltip>
    );


    const inputRefs = useRef({});
    const cashDiscountRef = useRef(null);
    const commissionRef = useRef(null);

    function openUpdateProductForm(id) {
        ProductCreateFormRef.current.open(id);
    }

    const ProductDetailsViewRef = useRef();
    function openProductDetails(id) {
        ProductDetailsViewRef.current.open(id);
    }

    async function checkWarnings(index) {
        if (index) {
            checkWarning(index);
        } else {
            for (let i = 0; i < selectedProducts.length; i++) {
                checkWarning(i);
            }
        }
    }


    async function checkWarning(i) {
        setWarnings({ ...warnings });
    }

    let [warnings, setWarnings] = useState({});



    async function checkErrors(index) {
        if (index) {
            checkError(index);
        } else {
            for (let i = 0; i < selectedProducts.length; i++) {
                checkError(i);
            }
        }
    }

    function checkError(i) {
        if (selectedProducts[i].quantity && selectedProducts[i].quantity <= 0) {
            errors["quantity_" + i] = "Quantity should be > 0";
        } else if (!selectedProducts[i].quantity) {
            errors["quantity_" + i] = "Quantity is required";
        } else {
            delete errors["quantity_" + i];
        }


        if (selectedProducts[i].unit_price && selectedProducts[i].unit_price <= 0) {
            errors["unit_price_" + i] = "Unit Price should be > 0";
        } else if (!selectedProducts[i].unit_price) {
            errors["unit_price_" + i] = "Unit Price is required";
        } else {
            delete errors["unit_price_" + i];
        }


        if (store?.settings?.block_sale_when_purchase_price_is_higher) {
            if (selectedProducts[i].purchase_unit_price && selectedProducts[i].purchase_unit_price <= 0) {
                errors["purchase_unit_price_" + i] = "Purchase Unit Price should be > 0";
            } else if (!selectedProducts[i].purchase_unit_price) {
                errors["purchase_unit_price_" + i] = "Purchase Unit Price is required";
            } else {
                delete errors["purchase_unit_price_" + i];
            }
        }



        if (selectedProducts[i].purchase_unit_price > 0 && selectedProducts[i].unit_price > 0) {

            if (selectedProducts[i].purchase_unit_price > selectedProducts[i].unit_price) {
                errors["purchase_unit_price_" + i] = "Purchase Unit Price should not be greater than Unit Price(without VAT)"
                errors["unit_price_" + i] = "Unit price should not be less than Purchase Unit Price(without VAT)"
            } else {
                delete errors["purchase_unit_price_" + i];
                delete errors["unit_price_" + i];
            }
        }

        setErrors({ ...errors });
    }


    useEffect(() => {
        const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
        tooltipTriggerList.forEach((el) => {
            // Dispose existing
            const existing = bootstrap.Tooltip.getInstance(el);
            if (existing) existing.dispose();

            // Read new values from attributes
            const errMsg = el.getAttribute('data-error');
            const warnMsg = el.getAttribute('data-warning');
            const tooltipMsg = errMsg || warnMsg || '';

            // Update title
            el.setAttribute('title', tooltipMsg);

            // Create new tooltip instance
            new bootstrap.Tooltip(el);
        });
    }, [errors, warnings]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, []);

    const discountRef = useRef(null);
    const discountWithVATRef = useRef(null);

    const ProductHistoryRef = useRef();
    function openProductHistory(model) {
        ProductHistoryRef.current.open(model);
    }

    //Payment Reference form
    const CustomerWithdrawalUpdateFormRef = useRef();
    const SalesUpdateFormRef = useRef();

    let [showReferenceUpdateForm, setShowReferenceUpdateForm] = useState(false);
    function openReferenceUpdateForm(id, referenceModel) {
        showReferenceUpdateForm = true;
        setShowReferenceUpdateForm(showReferenceUpdateForm);

        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            if (referenceModel === "customer_withdrawal") {
                CustomerWithdrawalUpdateFormRef.current.open(id);
            } else if (referenceModel === "sales") {
                SalesUpdateFormRef.current.open(id);
            }
        }, 50);
    }

    const handleReferenceUpdated = () => {
        if (formData.id) {
            getSalesReturn(formData.id);
        }
    };


    const [warehouseList, setWarehouseList] = useState([]);
    const [searchParams, setSearchParams] = useState({});

    const loadWarehouses = useCallback(() => {
        const requestOptions = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: localStorage.getItem("access_token"),
            },
        };
        let Select =
            "select=id,name,code,created_by_name,created_at";

        const d = new Date();
        let diff = d.getTimezoneOffset();
        searchParams["timezone_offset"] = parseFloat(diff / 60);

        if (localStorage.getItem("store_id")) {
            searchParams.store_id = localStorage.getItem("store_id");
        }

        setSearchParams(searchParams);
        let queryParams = ObjectToSearchQueryParams(searchParams);
        if (queryParams !== "") {
            queryParams = "&" + queryParams;
        }

        fetch(
            "/v1/warehouse?" +
            Select +
            queryParams +
            "&sort=name" +
            "&page=1" +
            "&limit=100",
            requestOptions
        )
            .then(async (response) => {
                const isJson = response.headers
                    .get("content-type")
                    ?.includes("application/json");
                const data = isJson && (await response.json());

                // check for error response
                if (!response.ok) {
                    const error = data && data.errors;
                    return Promise.reject(error);
                }


                setWarehouseList(data.result);
            })
            .catch((error) => {
                console.log(error);
            });
    }, [searchParams]);

    useEffect(() => {
        loadWarehouses();
    }, [loadWarehouses]);

    return (
        <>
            {showReferenceUpdateForm && <>
                <CustomerWithdrawalCreate ref={CustomerWithdrawalUpdateFormRef} onUpdated={handleReferenceUpdated} />
                <SalesCreate ref={SalesUpdateFormRef} onUpdated={handleReferenceUpdated} />
            </>}


            <ProductHistory ref={ProductHistoryRef} showToastMessage={props.showToastMessage} />
            <ImageViewerModal ref={imageViewerRef} images={productImages} />
            <ProductView ref={ProductDetailsViewRef} />
            <Products ref={ProductsRef} showToastMessage={props.showToastMessage} />
            <SalesHistory ref={SalesHistoryRef} showToastMessage={props.showToastMessage} />
            <SalesReturnHistory ref={SalesReturnHistoryRef} showToastMessage={props.showToastMessage} />

            <PurchaseHistory ref={PurchaseHistoryRef} showToastMessage={props.showToastMessage} />
            <PurchaseReturnHistory ref={PurchaseReturnHistoryRef} showToastMessage={props.showToastMessage} />
            <QuotationHistory ref={QuotationHistoryRef} showToastMessage={props.showToastMessage} />
            <DeliveryNoteHistory ref={DeliveryNoteHistoryRef} showToastMessage={props.showToastMessage} />

            <Preview ref={PreviewRef} />
            <SalesReturnView ref={DetailsViewRef} />
            <StoreCreate ref={StoreCreateFormRef} showToastMessage={props.showToastMessage} />
            <CustomerCreate ref={CustomerCreateFormRef} showToastMessage={props.showToastMessage} />
            <ProductCreate ref={ProductCreateFormRef} showToastMessage={props.showToastMessage} />
            <UserCreate ref={UserCreateFormRef} showToastMessage={props.showToastMessage} />
            <SignatureCreate ref={SignatureCreateFormRef} showToastMessage={props.showToastMessage} />


            <Modal show={show} size="xl" fullscreen onHide={handleClose} animation={false} backdrop="static" scrollable={true}>
                <Modal.Header>
                    <Modal.Title>
                        {formData.id ? "Update Sales Return  #" + formData.code + " for sales #" : "Create Sales Return for sale #"}
                        {formData.order_code && <span style={{ cursor: "pointer", color: "blue" }} onClick={() => {
                            openReferenceUpdateForm(formData.order_id, "sales");
                        }}>
                            {formData.order_code}
                        </span>}
                    </Modal.Title>
                    {store.zatca?.phase === "2" && !formData.id && < div style={{ marginLeft: "20px" }}>
                        <input type="checkbox" id="sales_return_report_to_zatca" name="sales_return_report_to_zatca" checked={formData.enable_report_to_zatca} onChange={(e) => {
                            formData.enable_report_to_zatca = !formData.enable_report_to_zatca;
                            setFormData({ ...formData });
                        }} /> Report to Zatca <br />
                    </div>}

                    <div className="col align-self-end text-end">

                        <Button variant="primary" onClick={openPreview}>
                            <i className="bi bi-printer"></i> Print Full Invoice
                        </Button>
                        &nbsp;&nbsp;

                        {selectedProducts && selectedProducts.length > 0 &&
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

                            </Button>}
                        <button
                            type="button"
                            className="btn-close"
                            onClick={handleClose}
                            aria-label="Close"
                        ></button>
                    </div>
                </Modal.Header>
                <Modal.Body>
                    <div style={{
                        maxHeight: "50px",        // Adjust based on design
                        minHeight: "50px",
                        overflowY: "scroll",
                    }}>
                        {errors && Object.keys(errors).length > 0 && (
                            <div
                                style={{
                                    backgroundColor: "#fff0f0",
                                    border: "1px solid #f5c6cb",
                                    padding: "10px",
                                    marginBottom: "10px",
                                    borderRadius: "4px"
                                }}
                            >
                                <ul style={{ marginBottom: 0 }}>
                                    {Object.keys(errors).map((key, index) => {
                                        const message = Array.isArray(errors[key]) ? errors[key][0] : errors[key];
                                        return message ? (
                                            <li key={index} style={{ color: "red" }}>
                                                {message}
                                            </li>
                                        ) : null;
                                    })}
                                </ul>
                            </div>
                        )}
                    </div>
                    <div className="row">
                        {selectedProducts?.length > 0 && <div className="col-md-3" >
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
                            </div>
                            {errors.date_str && (
                                <div style={{ color: "red" }}>
                                    <i className="bi bi-x-lg"> </i>
                                    {errors.date_str}
                                </div>
                            )}

                        </div>}

                        {selectedProducts?.length > 0 && <div className="col-md-2">
                            <label className="form-label">Phone ( 05.. / +966..)</label>

                            <div className="input-group mb-3">
                                <input
                                    id="sales_return_phone"
                                    name="sales_return_phone"
                                    value={formData.phone ? formData.phone : ""}
                                    type='string'
                                    onChange={(e) => {
                                        delete errors["phone"];
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
                        </div>}

                        {selectedProducts?.length > 0 && <div className="col-md-1">
                            <Button className={`btn btn-success btn-sm`} style={{ marginTop: "30px" }} onClick={sendWhatsAppMessage}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="white" viewBox="0 0 16 16">
                                    <path d="M13.601 2.326A7.875 7.875 0 0 0 8.036 0C3.596 0 0 3.597 0 8.036c0 1.417.37 2.805 1.07 4.03L0 16l3.993-1.05a7.968 7.968 0 0 0 4.043 1.085h.003c4.44 0 8.036-3.596 8.036-8.036 0-2.147-.836-4.166-2.37-5.673ZM8.036 14.6a6.584 6.584 0 0 1-3.35-.92l-.24-.142-2.37.622.63-2.31-.155-.238a6.587 6.587 0 0 1-1.018-3.513c0-3.637 2.96-6.6 6.6-6.6 1.764 0 3.42.69 4.67 1.94a6.56 6.56 0 0 1 1.93 4.668c0 3.637-2.96 6.6-6.6 6.6Zm3.61-4.885c-.198-.1-1.17-.578-1.352-.644-.18-.066-.312-.1-.444.1-.13.197-.51.644-.626.775-.115.13-.23.15-.428.05-.198-.1-.837-.308-1.594-.983-.59-.525-.99-1.174-1.11-1.372-.116-.198-.012-.305.088-.403.09-.09.198-.23.298-.345.1-.115.132-.197.2-.33.065-.13.032-.247-.017-.345-.05-.1-.444-1.07-.61-1.46-.16-.384-.323-.332-.444-.338l-.378-.007c-.13 0-.344.048-.525.23s-.688.672-.688 1.64c0 .967.704 1.9.802 2.03.1.13 1.386 2.116 3.365 2.963.47.203.837.324 1.122.414.472.15.902.13 1.24.08.378-.057 1.17-.48 1.336-.942.165-.462.165-.858.116-.943-.048-.084-.18-.132-.378-.23Z" />
                                </svg>
                            </Button>
                        </div>}

                        {selectedProducts?.length > 0 && <div className="col-md-2">
                            <label className="form-label">VAT NO.(15 digits)</label>

                            <div className="input-group mb-3">
                                <input
                                    id="sales_vat_no"
                                    name="sales_vat_no"
                                    value={formData.vat_no ? formData.vat_no : ""}
                                    type='string'
                                    onChange={(e) => {
                                        delete errors["vat_no"];
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
                        </div>}

                        {selectedProducts?.length > 0 && <div className="col-md-3">
                            <label className="form-label">Address</label>
                            <div className="input-group mb-3">
                                <textarea
                                    value={formData.address}
                                    type='string'
                                    onChange={(e) => {
                                        delete errors["address"];
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
                        </div>}

                        {selectedProducts?.length > 0 && <div className="col-md-3" >
                            <label className="form-label">Remarks</label>
                            <div className="input-group mb-3">
                                <textarea
                                    value={formData.remarks}
                                    type='string'
                                    onChange={(e) => {
                                        delete errors["address"];
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
                        </div>}
                    </div>

                    {selectedProducts && selectedProducts.length === 0 && "Already returned all products"}
                    {selectedProducts && selectedProducts.length > 0 && <form className="row g-3 needs-validation" onSubmit={handleCreate}>
                        <h2>Select Products</h2>
                        <div className="table-responsive" style={{ overflowX: "auto", overflowY: "scroll" }}>
                            <table className="table table-striped table-sm table-bordered">
                                <tbody>
                                    <tr className="text-center" style={{ borderBottom: "solid 2px" }}>
                                        <th>
                                            Select All <br />
                                            <input
                                                type="checkbox"
                                                className="form-check-input"
                                                checked={isAllSelected}
                                                onChange={handleSelectAll}
                                            />
                                        </th>
                                        <th>SI No.</th>
                                        <th>Part No.</th>
                                        <th style={{ minWidth: "250px" }}>Name</th>
                                        <th>Info</th>
                                        <th>Purchase Unit Price(without VAT)</th>
                                        <th>Qty</th>
                                        <th>Add Stock To</th>
                                        <th>Unit Price(without VAT)</th>
                                        <th>Unit Price(with VAT)</th>
                                        <th>Unit Disc.(without VAT)</th>
                                        <th>Unit Disc.(with VAT)</th>
                                        {/*  <th>Unit Disc. %(without VAT)</th>*/}
                                        <th>Unit Disc. %(with VAT)</th>
                                        <th>Price(without VAT)</th>
                                        <th>Price(with VAT)</th>
                                    </tr>

                                    {selectedProducts.map((product, index) => (
                                        <tr key={index} className="text-center">
                                            <td style={{ verticalAlign: 'middle', padding: '0.25rem', width: "20px", whiteSpace: "nowrap" }}>
                                                <input
                                                    className="form-check-input"
                                                    id={`${"select_sales_return_product_" + index}`}
                                                    name={`${"select_sales_return_product_" + index}`}
                                                    type="checkbox"
                                                    checked={selectedProducts[index].selected}
                                                    onChange={(e) => {
                                                        console.log("e.target.value:", e.target.value)
                                                        selectedProducts[index].selected = !selectedProducts[index].selected;
                                                        setSelectedProducts([...selectedProducts]);
                                                        reCalculate();
                                                    }} />
                                            </td>
                                            <td style={{ verticalAlign: 'middle', padding: '0.25rem', width: "auto", whiteSpace: "nowrap" }}>{index + 1}</td>
                                            {/*<td style={{ verticalAlign: 'middle', padding: '0.25rem', width: "auto", whiteSpace: "nowrap" }}>
                                                <OverflowTooltip maxWidth={120} value={product.prefix_part_number ? product.prefix_part_number + " - " + product.part_number : product.part_number} />
                                            </td>*/}
                                            <ResizableTableCell style={{ verticalAlign: 'middle', padding: '0.25rem', width: "auto", whiteSpace: "nowrap" }}
                                            >
                                                {/*<OverflowTooltip maxWidth={140} value={product.prefix_part_number ? product.prefix_part_number + " - " + product.part_number : product.part_number} />*/}
                                                <input type="text" id={`${"sales_return_product_part_number" + index}`}
                                                    name={`${"sales_return_product_part_number" + index}`}
                                                    onWheel={(e) => e.target.blur()}
                                                    value={product.part_number}
                                                    className={`form-control text-start ${errors["part_number_" + index] ? 'is-invalid' : ''} ${warnings["part_number_" + index] ? 'border-warning text-warning' : ''}`}
                                                    onKeyDown={(e) => {
                                                        RunKeyActions(e, product);
                                                    }}
                                                    placeholder="Part No." onChange={(e) => {
                                                        delete errors["part_number_" + index];
                                                        setErrors({ ...errors });

                                                        if (!e.target.value) {
                                                            selectedProducts[index].part_number = "";
                                                            setSelectedProducts([...selectedProducts]);
                                                            return;
                                                        }
                                                        selectedProducts[index].part_number = e.target.value;
                                                        setSelectedProducts([...selectedProducts]);
                                                    }} />
                                                {(errors[`part_number_${index}`] || warnings[`part_number_${index}`]) && (
                                                    <i
                                                        className={`bi bi-exclamation-circle-fill ${errors[`part_number_${index}`] ? 'text-danger' : 'text-warning'} ms-2`}
                                                        data-bs-toggle="tooltip"
                                                        data-bs-placement="top"
                                                        data-error={errors[`part_number_${index}`] || ''}
                                                        data-warning={warnings[`part_number_${index}`] || ''}
                                                        title={errors[`part_number_${index}`] || warnings[`part_number_${index}`] || ''}
                                                        style={{
                                                            fontSize: '1rem',
                                                            cursor: 'pointer',
                                                            whiteSpace: 'nowrap',
                                                        }}
                                                    ></i>
                                                )}

                                            </ResizableTableCell>

                                            <ResizableTableCell style={{ verticalAlign: 'middle', padding: '0.25rem' }}
                                            >
                                                <div className="input-group">
                                                    <input type="text" id={`${"sales_return_product_name" + index}`}
                                                        name={`${"sales_return_product_name" + index}`}
                                                        onWheel={(e) => e.target.blur()}
                                                        value={product.name}
                                                        className={`form-control text-start ${errors["name_" + index] ? 'is-invalid' : ''} ${warnings["name_" + index] ? 'border-warning text-warning' : ''}`}
                                                        onKeyDown={(e) => {
                                                            RunKeyActions(e, product);
                                                        }}
                                                        placeholder="Name" onChange={(e) => {
                                                            delete errors["name_" + index];
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
                                                        style={{ color: "blue", cursor: "pointer", marginLeft: "10px" }}
                                                        onClick={() => {
                                                            openUpdateProductForm(product.product_id);
                                                        }}
                                                    >
                                                        <i className="bi bi-pencil"> </i>
                                                    </div>

                                                    <div
                                                        style={{ color: "blue", cursor: "pointer", marginLeft: "10px" }}
                                                        onClick={() => {
                                                            openProductDetails(product.product_id);
                                                        }}
                                                    >
                                                        <i className="bi bi-eye"> </i>
                                                    </div>
                                                </div>
                                                {(errors[`name_${index}`] || warnings[`name_${index}`]) && (
                                                    <i
                                                        className={`bi bi-exclamation-circle-fill ${errors[`name_${index}`] ? 'text-danger' : 'text-warning'} ms-2`}
                                                        data-bs-toggle="tooltip"
                                                        data-bs-placement="top"
                                                        data-error={errors[`name_${index}`] || ''}
                                                        data-warning={warnings[`name_${index}`] || ''}
                                                        title={errors[`name_${index}`] || warnings[`name_${index}`] || ''}
                                                        style={{
                                                            fontSize: '1rem',
                                                            cursor: 'pointer',
                                                            whiteSpace: 'nowrap',
                                                        }}
                                                    ></i>
                                                )}
                                            </ResizableTableCell>
                                            <td style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                <div style={{ zIndex: "9999 !important", position: "absolute !important" }}>
                                                    <Dropdown drop="top">
                                                        <Dropdown.Toggle variant="secondary" id="dropdown-secondary" style={{}}>
                                                            <i className="bi bi-info"></i>
                                                        </Dropdown.Toggle>

                                                        <Dropdown.Menu style={{ zIndex: 9999, position: "absolute" }} popperConfig={{ modifiers: [{ name: 'preventOverflow', options: { boundary: 'viewport' } }] }}>
                                                            <Dropdown.Item onClick={() => openLinkedProducts(product)}>
                                                                <i className="bi bi-link"></i>&nbsp;
                                                                Linked Products ({getShortcut('linkedProducts')})
                                                            </Dropdown.Item>

                                                            <Dropdown.Item onClick={() => openProductHistory(product)}>
                                                                <i className="bi bi-clock-history"></i>&nbsp;
                                                                History ({getShortcut('productHistory')})
                                                            </Dropdown.Item>

                                                            <Dropdown.Item onClick={() => openSalesHistory(product)}>
                                                                <i className="bi bi-clock-history"></i>&nbsp;
                                                                Sales History ({getShortcut('salesHistory')})
                                                            </Dropdown.Item>

                                                            <Dropdown.Item onClick={() => openSalesReturnHistory(product)}>
                                                                <i className="bi bi-clock-history"></i>&nbsp;
                                                                Sales Return History ({getShortcut('salesReturnHistory')})
                                                            </Dropdown.Item>

                                                            <Dropdown.Item onClick={() => openPurchaseHistory(product)}>
                                                                <i className="bi bi-clock-history"></i>&nbsp;
                                                                Purchase History ({getShortcut('purchaseHistory')})
                                                            </Dropdown.Item>

                                                            <Dropdown.Item onClick={() => openPurchaseReturnHistory(product)}>
                                                                <i className="bi bi-clock-history"></i>&nbsp;
                                                                Purchase Return History ({getShortcut('purchaseReturnHistory')})
                                                            </Dropdown.Item>

                                                            <Dropdown.Item onClick={() => openDeliveryNoteHistory(product)}>
                                                                <i className="bi bi-clock-history"></i>&nbsp;
                                                                Delivery Note History ({getShortcut('deliveryNoteHistory')})
                                                            </Dropdown.Item>

                                                            <Dropdown.Item onClick={() => openQuotationHistory(product)}>
                                                                <i className="bi bi-clock-history"></i>&nbsp;
                                                                Quotation History ({getShortcut('quotationHistory')})
                                                            </Dropdown.Item>

                                                            <Dropdown.Item onClick={() => openQuotationSalesHistory(product)}>
                                                                <i className="bi bi-clock-history"></i>&nbsp;
                                                                Qtn. Sales History ({getShortcut('quotationSalesHistory')})
                                                            </Dropdown.Item>

                                                            <Dropdown.Item onClick={() => openQuotationSalesReturnHistory(product)}>
                                                                <i className="bi bi-clock-history"></i>&nbsp;
                                                                Qtn. Sales Return History ({getShortcut('quotationSalesReturnHistory')})
                                                            </Dropdown.Item>

                                                            <Dropdown.Item onClick={() => openProductImages(product.product_id)}>
                                                                <i className="bi bi-clock-history"></i>&nbsp;
                                                                Images ({getShortcut('images')})
                                                            </Dropdown.Item>
                                                        </Dropdown.Menu>
                                                    </Dropdown>
                                                </div>
                                            </td>
                                            <td style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                <div className="input-group">
                                                    <input
                                                        type="number"
                                                        id={`sales_return_product_purchase_unit_price_${index}`}
                                                        name={`sales_return_product_purchase_unit_price_${index}`}
                                                        className={`form-control text-end ${errors["purchase_unit_price_" + index] ? 'is-invalid' : ''} ${warnings["purchase_unit_price_" + index] ? 'border-warning text-warning' : ''}`}
                                                        onWheel={(e) => e.target.blur()}
                                                        value={product.purchase_unit_price}
                                                        placeholder="Purchase Unit Price"
                                                        ref={(el) => {
                                                            if (!inputRefs.current[index]) inputRefs.current[index] = {};
                                                            inputRefs.current[index][`${"sales_return_product_purchase_unit_price_" + index}`] = el;
                                                        }}
                                                        onFocus={() => {
                                                            if (timerRef.current) clearTimeout(timerRef.current);
                                                            timerRef.current = setTimeout(() => {
                                                                inputRefs.current[index][`${"sales_return_product_purchase_unit_price_" + index}`].select();
                                                            }, 100);
                                                        }}
                                                        onKeyDown={(e) => {
                                                            RunKeyActions(e, product);
                                                            if (timerRef.current) clearTimeout(timerRef.current);

                                                            if (e.key === "Backspace") {
                                                                selectedProducts[index].purchase_unit_price = "";
                                                                setSelectedProducts([...selectedProducts]);
                                                                timerRef.current = setTimeout(() => {
                                                                    checkErrors(index);
                                                                    reCalculate(index);
                                                                }, 100);
                                                            } else if (e.key === "ArrowLeft") {
                                                                if ((index + 1) === selectedProducts.length) {
                                                                } else {
                                                                    timerRef.current = setTimeout(() => {
                                                                        inputRefs.current[(index + 1)][`${"sales_return_unit_discount_with_vat_" + (index + 1)}`].focus();
                                                                    }, 100);
                                                                }
                                                            }
                                                        }}
                                                        onChange={(e) => {
                                                            if (timerRef.current) clearTimeout(timerRef.current);

                                                            if (parseFloat(e.target.value) === 0) {
                                                                selectedProducts[index].purchase_unit_price = e.target.value;
                                                                setSelectedProducts([...selectedProducts]);
                                                                timerRef.current = setTimeout(() => {
                                                                    checkErrors(index);
                                                                    reCalculate(index);
                                                                }, 100);
                                                                return;
                                                            }

                                                            if (!e.target.value) {
                                                                selectedProducts[index].purchase_unit_price = e.target.value;
                                                                setSelectedProducts([...selectedProducts]);
                                                                timerRef.current = setTimeout(() => {
                                                                    checkWarnings(index);
                                                                    checkErrors(index);
                                                                    reCalculate(index);
                                                                }, 100);
                                                                return;
                                                            }

                                                            if (e.target.value) {
                                                                selectedProducts[index].purchase_unit_price = parseFloat(e.target.value);
                                                                setSelectedProducts([...selectedProducts]);
                                                            }

                                                            checkErrors(index);
                                                        }}
                                                    />

                                                    {(errors[`purchase_unit_price_${index}`] || warnings[`purchase_unit_price_${index}`]) && (
                                                        <i
                                                            className={`bi bi-exclamation-circle-fill ${errors[`purchase_unit_price_${index}`] ? 'text-danger' : 'text-warning'} ms-2`}
                                                            data-bs-toggle="tooltip"
                                                            data-bs-placement="top"
                                                            data-error={errors[`purchase_unit_price_${index}`] || ''}
                                                            data-warning={warnings[`purchase_unit_price_${index}`] || ''}
                                                            title={errors[`purchase_unit_price_${index}`] || warnings[`purchase_unit_price_${index}`] || ''}
                                                            style={{
                                                                fontSize: '1rem',
                                                                cursor: 'pointer',
                                                                whiteSpace: 'nowrap',
                                                            }}
                                                        ></i>
                                                    )}
                                                </div>
                                            </td>
                                            <td style={{
                                                verticalAlign: 'middle',
                                                padding: '0.25rem',
                                                whiteSpace: 'nowrap',
                                                width: 'auto',
                                                position: 'relative',
                                            }} >
                                                <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                                                    <div className="input-group flex-nowrap" style={{ flex: '1 1 auto', minWidth: 0 }}>
                                                        <input type="number"
                                                            style={{ minWidth: "40px", maxWidth: "120px" }}
                                                            id={`${"sales_return_product_quantity_" + index}`}
                                                            name={`${"sales_return_product_quantity_" + index}`}
                                                            className={`form-control text-end ${errors["quantity_" + index] ? 'is-invalid' : warnings["quantity_" + index] ? 'border-warning text-warning' : ''}`}
                                                            onWheel={(e) => e.target.blur()}
                                                            value={product.quantity}
                                                            placeholder="Quantity"
                                                            ref={(el) => {
                                                                if (!inputRefs.current[index]) inputRefs.current[index] = {};
                                                                inputRefs.current[index][`${"sales_return_product_quantity_" + index}`] = el;
                                                            }}
                                                            onFocus={() => {
                                                                if (timerRef.current) clearTimeout(timerRef.current);
                                                                timerRef.current = setTimeout(() => {
                                                                    inputRefs.current[index][`${"sales_return_product_quantity_" + index}`].select();
                                                                }, 100);
                                                            }}
                                                            onKeyDown={(e) => {
                                                                RunKeyActions(e, product);
                                                                if (timerRef.current) clearTimeout(timerRef.current);
                                                                if (e.key === "Backspace") {
                                                                    selectedProducts[index].quantity = "";
                                                                    setSelectedProducts([...selectedProducts]);
                                                                    timerRef.current = setTimeout(() => {
                                                                        checkWarnings(index);
                                                                        checkErrors(index);
                                                                        CalCulateLineTotals(index);
                                                                        reCalculate(index);
                                                                    }, 100);
                                                                } else if (e.key === "ArrowLeft") {
                                                                    timerRef.current = setTimeout(() => {
                                                                        inputRefs.current[index][`${"sales_return_product_purchase_unit_price_" + index}`].focus();
                                                                    }, 100);
                                                                }
                                                            }}
                                                            onChange={(e) => {
                                                                setErrors({ ...errors });
                                                                if (timerRef.current) clearTimeout(timerRef.current);

                                                                if (parseFloat(e.target.value) === 0) {
                                                                    selectedProducts[index].quantity = e.target.value;
                                                                    setSelectedProducts([...selectedProducts]);
                                                                    timerRef.current = setTimeout(() => {
                                                                        checkWarnings(index);
                                                                        checkErrors(index);
                                                                        CalCulateLineTotals(index);
                                                                        reCalculate(index);
                                                                    }, 100);
                                                                    return;
                                                                }


                                                                if (!e.target.value) {
                                                                    selectedProducts[index].quantity = e.target.value;
                                                                    setSelectedProducts([...selectedProducts]);
                                                                    timerRef.current = setTimeout(() => {
                                                                        checkErrors(index);
                                                                        checkWarnings(index);
                                                                        CalCulateLineTotals(index);
                                                                        reCalculate(index);
                                                                    }, 100);
                                                                    return;
                                                                }


                                                                product.quantity = parseFloat(e.target.value);
                                                                selectedProducts[index].quantity = parseFloat(e.target.value);
                                                                timerRef.current = setTimeout(() => {
                                                                    checkErrors(index);
                                                                    checkWarnings(index);
                                                                    CalCulateLineTotals(index);
                                                                    reCalculate(index);
                                                                }, 100);
                                                            }} />
                                                        <span className="input-group-text text-nowrap">
                                                            {selectedProducts[index].unit ? selectedProducts[index].unit[0]?.toUpperCase() : 'P'}
                                                        </span>
                                                    </div>
                                                    {(errors[`quantity_${index}`] || warnings[`quantity_${index}`]) && (
                                                        <i
                                                            className={`bi bi-exclamation-circle-fill ${errors[`quantity_${index}`] ? 'text-danger' : 'text-warning'} ms-2`}
                                                            data-bs-toggle="tooltip"
                                                            data-bs-placement="top"
                                                            data-error={errors[`quantity_${index}`] || ''}
                                                            data-warning={warnings[`quantity_${index}`] || ''}
                                                            title={errors[`quantity_${index}`] || warnings[`quantity_${index}`] || ''}
                                                            style={{
                                                                fontSize: '1rem',
                                                                cursor: 'pointer',
                                                                whiteSpace: 'nowrap',
                                                            }}
                                                        ></i>
                                                    )}
                                                </div>
                                            </td>
                                            <td style={{
                                                verticalAlign: 'middle',
                                                padding: '0.25rem',
                                                whiteSpace: 'nowrap',
                                                width: 'auto',
                                                position: 'relative',
                                            }} >
                                                <select
                                                    id={`sales_return_product_warehouse_${index}`}
                                                    name={`sales_return_product_warehouse_${index}`}
                                                    className="form-control"
                                                    value={selectedProducts[index].warehouse_id || "main_store"}
                                                    onChange={(e) => {
                                                        const selectedValue = e.target.value;

                                                        if (selectedValue === "main_store") {
                                                            selectedProducts[index].warehouse_id = null;
                                                            selectedProducts[index].warehouse_code = "";
                                                        } else {
                                                            const selectedWarehouse = warehouseList.find(w => w.id === selectedValue);
                                                            if (selectedWarehouse) {
                                                                selectedProducts[index].warehouse_id = selectedWarehouse.id;
                                                                selectedProducts[index].warehouse_code = selectedWarehouse.code;
                                                            }
                                                        }

                                                        setSelectedProducts([...selectedProducts]);
                                                    }}
                                                >
                                                    <option value="main_store">Main Store</option>
                                                    {warehouseList.map((warehouse) => (
                                                        <option key={warehouse.id} value={warehouse.id}>
                                                            {warehouse.name} ({warehouse.code})
                                                        </option>
                                                    ))}
                                                </select>
                                                {errors[`warehouse_${index}`] && (
                                                    <div style={{ color: "red" }}>
                                                        {errors[`warehouse_${index}`]}
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                                                    <div className="input-group flex-nowrap" style={{ flex: '1 1 auto', minWidth: 0 }}>
                                                        <input type="number"
                                                            id={`${"sales_return_product_unit_price_" + index}`}
                                                            name={`${"sales_return_product_unit_price_" + index}`}
                                                            onWheel={(e) => e.target.blur()}
                                                            value={selectedProducts[index].unit_price}
                                                            className={`form-control text-end ${errors["unit_price_" + index] ? 'is-invalid' : ''} ${warnings["unit_price_" + index] ? 'border-warning text-warning' : ''}`}
                                                            placeholder="Unit Price(without VAT)"
                                                            ref={(el) => {
                                                                if (!inputRefs.current[index]) inputRefs.current[index] = {};
                                                                inputRefs.current[index][`${"sales_return_product_unit_price_" + index}`] = el;
                                                            }}

                                                            onFocus={() => {
                                                                if (timerRef.current) clearTimeout(timerRef.current);
                                                                timerRef.current = setTimeout(() => {
                                                                    inputRefs.current[index][`${"sales_return_product_unit_price_" + index}`].select();
                                                                }, 100);
                                                            }}

                                                            onKeyDown={(e) => {
                                                                RunKeyActions(e, product);

                                                                if (timerRef.current) clearTimeout(timerRef.current);
                                                                if (e.key === "Backspace") {
                                                                    selectedProducts[index].unit_price_with_vat = "";
                                                                    selectedProducts[index].unit_price = "";
                                                                    setSelectedProducts([...selectedProducts]);
                                                                    timerRef.current = setTimeout(() => {
                                                                        checkErrors(index);
                                                                        CalCulateLineTotals(index);
                                                                        reCalculate(index);
                                                                    }, 100);
                                                                } else if (e.key === "ArrowLeft") {
                                                                    timerRef.current = setTimeout(() => {
                                                                        inputRefs.current[index][`${"sales_return_product_quantity_" + index}`].focus();
                                                                    }, 100);
                                                                }
                                                            }}
                                                            onChange={(e) => {
                                                                if (timerRef.current) clearTimeout(timerRef.current);
                                                                if (parseFloat(e.target.value) === 0) {
                                                                    selectedProducts[index].unit_price = e.target.value;
                                                                    selectedProducts[index].unit_price_with_vat = e.target.value;
                                                                    setSelectedProducts([...selectedProducts]);
                                                                    timerRef.current = setTimeout(() => {
                                                                        //  checkWarnings(index);
                                                                        checkErrors(index);
                                                                        CalCulateLineTotals(index);
                                                                        reCalculate(index);
                                                                    }, 100);
                                                                    return;
                                                                }

                                                                if (!e.target.value) {
                                                                    selectedProducts[index].unit_price = e.target.value;
                                                                    selectedProducts[index].unit_price_with_vat = e.target.value;
                                                                    setSelectedProducts([...selectedProducts]);
                                                                    timerRef.current = setTimeout(() => {
                                                                        //checkWarnings(index);
                                                                        checkErrors(index);
                                                                        CalCulateLineTotals(index);
                                                                        reCalculate(index);
                                                                    }, 100);
                                                                    return;
                                                                }


                                                                if (/^\d*\.?\d{0,8}$/.test(parseFloat(e.target.value)) === false) {
                                                                    errors["unit_price_" + index] = "Max decimal points allowed is 8";
                                                                    setErrors({ ...errors });
                                                                }

                                                                selectedProducts[index].unit_price = parseFloat(e.target.value);
                                                                setSelectedProducts([...selectedProducts]);

                                                                timerRef.current = setTimeout(() => {
                                                                    selectedProducts[index].unit_price_with_vat = parseFloat(trimTo8Decimals(selectedProducts[index].unit_price * (1 + (formData.vat_percent / 100))))
                                                                    selectedProducts[index].unit_discount_percent = parseFloat(trimTo8Decimals(((selectedProducts[index].unit_discount / selectedProducts[index].unit_price) * 100)))
                                                                    selectedProducts[index].unit_discount_percent_with_vat = parseFloat(trimTo8Decimals(((selectedProducts[index].unit_discount_with_vat / selectedProducts[index].unit_price_with_vat) * 100)))
                                                                    reCalculate(index);
                                                                    CalCulateLineTotals(index);
                                                                    checkErrors(index);
                                                                }, 100);
                                                            }} />

                                                    </div>
                                                    {(errors[`unit_price_${index}`] || warnings[`unit_price_${index}`]) && (
                                                        <i
                                                            className={`bi bi-exclamation-circle-fill ${errors[`unit_price_${index}`] ? 'text-danger' : 'text-warning'} ms-2`}
                                                            data-bs-toggle="tooltip"
                                                            data-bs-placement="top"
                                                            data-error={errors[`unit_price_${index}`] || ''}
                                                            data-warning={warnings[`unit_price_${index}`] || ''}
                                                            title={errors[`unit_price_${index}`] || warnings[`unit_price_${index}`] || ''}
                                                            style={{
                                                                fontSize: '1rem',
                                                                cursor: 'pointer',
                                                                whiteSpace: 'nowrap',
                                                            }}
                                                        ></i>
                                                    )}
                                                </div>
                                            </td>
                                            <td style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                                                    <div className="input-group flex-nowrap" style={{ flex: '1 1 auto', minWidth: 0 }}>
                                                        <input type="number"
                                                            id={`${"sales_return_product_unit_price_with_vat_" + index}`}
                                                            name={`${"sales_return_product_unit_price_with_vat_" + index}`}
                                                            onWheel={(e) => e.target.blur()}
                                                            value={selectedProducts[index].unit_price_with_vat}
                                                            className={`form-control text-end ${errors["unit_price_with_vat_" + index] ? 'is-invalid' : ''} ${warnings["unit_price_with_vat_" + index] ? 'border-warning text-warning' : ''}`}
                                                            ref={(el) => {
                                                                if (!inputRefs.current[index]) inputRefs.current[index] = {};
                                                                inputRefs.current[index][`${"sales_return_product_unit_price_with_vat_" + index}`] = el;
                                                            }}
                                                            placeholder="Unit Price(with VAT)"

                                                            onFocus={() => {
                                                                if (timerRef.current) clearTimeout(timerRef.current);
                                                                timerRef.current = setTimeout(() => {
                                                                    inputRefs.current[index][`${"sales_return_product_unit_price_with_vat_" + index}`].select();
                                                                }, 100);
                                                            }}

                                                            onKeyDown={(e) => {
                                                                RunKeyActions(e, product);

                                                                if (timerRef.current) clearTimeout(timerRef.current);
                                                                if (e.key === "Backspace") {
                                                                    selectedProducts[index].unit_price_with_vat = "";
                                                                    selectedProducts[index].unit_price = "";
                                                                    setSelectedProducts([...selectedProducts]);
                                                                    timerRef.current = setTimeout(() => {
                                                                        CalCulateLineTotals(index);
                                                                        reCalculate(index);
                                                                    }, 100);
                                                                } else if (e.key === "ArrowLeft") {
                                                                    timerRef.current = setTimeout(() => {
                                                                        inputRefs.current[index][`${"sales_return_product_unit_price_" + index}`].focus();
                                                                    }, 200);
                                                                }
                                                            }}
                                                            onChange={(e) => {
                                                                delete errors["unit_price_with_vat_" + index];

                                                                if (timerRef.current) clearTimeout(timerRef.current);

                                                                setErrors({ ...errors });
                                                                if (!e.target.value) {
                                                                    // errors["unit_price_with_vat_" + index] = "";
                                                                    selectedProducts[index].unit_price_with_vat = "";
                                                                    selectedProducts[index].unit_price = "";
                                                                    setSelectedProducts([...selectedProducts]);
                                                                    setErrors({ ...errors });
                                                                    console.log("errors:", errors);
                                                                    // Set new debounce timer
                                                                    timerRef.current = setTimeout(() => {
                                                                        CalCulateLineTotals(index);
                                                                        reCalculate(index);
                                                                    }, 100);
                                                                    return;
                                                                }

                                                                if (e.target.value === 0) {
                                                                    errors["unit_price_with_vat_" + index] = "Unit Price should be > 0";
                                                                    selectedProducts[index].unit_price_with_vat = 0;
                                                                    selectedProducts[index].unit_price = 0;
                                                                    setSelectedProducts([...selectedProducts]);
                                                                    setErrors({ ...errors });
                                                                    console.log("errors:", errors);
                                                                    // Set new debounce timer
                                                                    timerRef.current = setTimeout(() => {
                                                                        CalCulateLineTotals(index);
                                                                        reCalculate(index);
                                                                    }, 100);
                                                                    return;
                                                                }

                                                                if (/^\d*\.?\d{0,8}$/.test(parseFloat(e.target.value)) === false) {
                                                                    errors["unit_price_with_vat_" + index] = "Max decimal points allowed is 8";
                                                                    setErrors({ ...errors });
                                                                }


                                                                selectedProducts[index].unit_price_with_vat = parseFloat(e.target.value);


                                                                setSelectedProducts([...selectedProducts]);
                                                                // Set new debounce timer
                                                                timerRef.current = setTimeout(() => {
                                                                    selectedProducts[index].unit_price = parseFloat(trimTo8Decimals(selectedProducts[index].unit_price_with_vat / (1 + (formData.vat_percent / 100))))
                                                                    selectedProducts[index].unit_discount_with_vat = parseFloat(trimTo8Decimals(selectedProducts[index].unit_discount * (1 + (formData.vat_percent / 100))))

                                                                    selectedProducts[index].unit_discount_percent = parseFloat(trimTo8Decimals(((selectedProducts[index].unit_discount / selectedProducts[index].unit_price) * 100)))
                                                                    selectedProducts[index].unit_discount_percent_with_vat = parseFloat(trimTo8Decimals(((selectedProducts[index].unit_discount_with_vat / selectedProducts[index].unit_price_with_vat) * 100)))

                                                                    CalCulateLineTotals(index);
                                                                    reCalculate(index);
                                                                }, 100);
                                                            }} />
                                                    </div>
                                                    {(errors[`unit_price_with_vat_${index}`] || warnings[`unit_price_with_vat_${index}`]) && (
                                                        <i
                                                            className={`bi bi-exclamation-circle-fill ${errors[`unit_price_with_vat_${index}`] ? 'text-danger' : 'text-warning'} ms-2`}
                                                            data-bs-toggle="tooltip"
                                                            data-bs-placement="top"
                                                            data-error={errors[`unit_price_with_vat_${index}`] || ''}
                                                            data-warning={warnings[`unit_price_with_vat_${index}`] || ''}
                                                            title={errors[`unit_price_with_vat_${index}`] || warnings[`unit_price_with_vat_${index}`] || ''}
                                                            style={{
                                                                fontSize: '1rem',
                                                                cursor: 'pointer',
                                                                whiteSpace: 'nowrap',
                                                            }}
                                                        ></i>
                                                    )}
                                                </div>
                                            </td>
                                            <td style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                                                    <div className="input-group flex-nowrap" style={{ flex: '1 1 auto', minWidth: 0 }}>
                                                        <input type="number"
                                                            id={`${"sales_return_unit_discount_" + index}`}
                                                            name={`${"sales_return_unit_discount_" + index}`}
                                                            onWheel={(e) => e.target.blur()}
                                                            className={`form-control text-end ${errors["unit_discount_" + index] ? 'is-invalid' : ''} ${warnings["unit_discount_" + index] ? 'border-warning text-warning' : ''}`}
                                                            value={selectedProducts[index].unit_discount}
                                                            ref={(el) => {
                                                                if (!inputRefs.current[index]) inputRefs.current[index] = {};
                                                                inputRefs.current[index][`${"sales_return_unit_discount_" + index}`] = el;
                                                            }}
                                                            onFocus={() => {
                                                                if (timerRef.current) clearTimeout(timerRef.current);
                                                                timerRef.current = setTimeout(() => {
                                                                    inputRefs.current[index][`${"sales_return_unit_discount_" + index}`]?.select();
                                                                }, 100);
                                                            }}
                                                            onKeyDown={(e) => {
                                                                RunKeyActions(e, product);

                                                                if (timerRef.current) clearTimeout(timerRef.current);
                                                                if (e.key === "ArrowLeft") {
                                                                    timerRef.current = setTimeout(() => {
                                                                        inputRefs.current[index][`${"sales_return_product_unit_price_with_vat_" + index}`].focus();
                                                                    }, 100);
                                                                }
                                                            }}
                                                            onChange={(e) => {
                                                                delete errors["unit_discount_" + index];
                                                                if (timerRef.current) clearTimeout(timerRef.current);

                                                                if (parseFloat(e.target.value) === 0) {
                                                                    selectedProducts[index].unit_discount = parseFloat(e.target.value);
                                                                    setFormData({ ...formData });

                                                                    setErrors({ ...errors });
                                                                    timerRef.current = setTimeout(() => {
                                                                        CalCulateLineTotals(index);
                                                                        reCalculate(index);
                                                                    }, 100);
                                                                    return;
                                                                }

                                                                if (parseFloat(e.target.value) < 0) {
                                                                    selectedProducts[index].unit_discount = 0.00;
                                                                    selectedProducts[index].unit_discount_with_vat = 0.00;
                                                                    selectedProducts[index].unit_discount_percent = 0.00;
                                                                    selectedProducts[index].unit_discount_percent_with_vat = 0.00;
                                                                    setFormData({ ...formData });
                                                                    errors["unit_discount_" + index] = "Unit discount should be >= 0";
                                                                    setErrors({ ...errors });
                                                                    timerRef.current = setTimeout(() => {
                                                                        CalCulateLineTotals(index);
                                                                        reCalculate(index);
                                                                    }, 100);
                                                                    return;
                                                                }

                                                                if (!e.target.value) {
                                                                    selectedProducts[index].unit_discount = "";
                                                                    selectedProducts[index].unit_discount_with_vat = "";
                                                                    selectedProducts[index].unit_discount_percent = "";
                                                                    selectedProducts[index].unit_discount_percent_with_vat = "";
                                                                    // errors["discount_" + index] = "Invalid Discount";
                                                                    setFormData({ ...formData });
                                                                    timerRef.current = setTimeout(() => {
                                                                        CalCulateLineTotals(index);
                                                                        reCalculate(index);
                                                                    }, 100);
                                                                    //setErrors({...errors});
                                                                    return;
                                                                }

                                                                delete errors["unit_discount_" + index];
                                                                delete errors["unit_discount_percent_" + index];
                                                                setErrors({ ...errors });

                                                                if (/^\d*\.?\d{0,8}$/.test(parseFloat(e.target.value)) === false) {
                                                                    errors["unit_discount_" + index] = "Max decimal points allowed is 8";
                                                                    setErrors({ ...errors });
                                                                }

                                                                selectedProducts[index].unit_discount = parseFloat(e.target.value);


                                                                setFormData({ ...formData });
                                                                timerRef.current = setTimeout(() => {
                                                                    selectedProducts[index].unit_discount_with_vat = parseFloat(trimTo2Decimals(selectedProducts[index].unit_discount * (1 + (formData.vat_percent / 100))))

                                                                    selectedProducts[index].unit_discount_percent = parseFloat(trimTo2Decimals(((selectedProducts[index].unit_discount / selectedProducts[index].unit_price) * 100)))
                                                                    selectedProducts[index].unit_discount_percent_with_vat = parseFloat(trimTo2Decimals(((selectedProducts[index].unit_discount_with_vat / selectedProducts[index].unit_price_with_vat) * 100)))
                                                                    reCalculate(index);
                                                                }, 100);
                                                            }} />
                                                    </div>
                                                    {(errors[`unit_discount_${index}`] || warnings[`unit_discount_${index}`]) && (
                                                        <i
                                                            className={`bi bi-exclamation-circle-fill ${errors[`unit_discount_${index}`] ? 'text-danger' : 'text-warning'} ms-2`}
                                                            data-bs-toggle="tooltip"
                                                            data-bs-placement="top"
                                                            data-error={errors[`unit_discount_${index}`] || ''}
                                                            data-warning={warnings[`unit_discount__${index}`] || ''}
                                                            title={errors[`unit_discount_${index}`] || warnings[`unit_discount_${index}`] || ''}
                                                            style={{
                                                                fontSize: '1rem',
                                                                cursor: 'pointer',
                                                                whiteSpace: 'nowrap',
                                                            }}
                                                        ></i>
                                                    )}
                                                </div>
                                            </td>
                                            {/*} ref={(el) => inputRefs.current[index] = el}
                                                                                                   onFocus={() => inputRefs.current[index]?.select()}*/}
                                            <td style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                                                    <div className="input-group flex-nowrap" style={{ flex: '1 1 auto', minWidth: 0 }}>
                                                        <input type="number"
                                                            id={`${"sales_return_unit_discount_with_vat_" + index}`}
                                                            name={`${"sales_return_unit_discount_with_vat_" + index}`}
                                                            onWheel={(e) => e.target.blur()}
                                                            className={`form-control text-end ${errors["unit_discount_with_vat_" + index] ? 'is-invalid' : ''} ${warnings["unit_discount_with_vat_" + index] ? 'border-warning text-warning' : ''}`}
                                                            value={selectedProducts[index].unit_discount_with_vat}
                                                            ref={(el) => {
                                                                if (!inputRefs.current[index]) inputRefs.current[index] = {};
                                                                inputRefs.current[index][`${"sales_return_unit_discount_with_vat_" + index}`] = el;
                                                            }}
                                                            onFocus={() => {
                                                                if (timerRef.current) clearTimeout(timerRef.current);
                                                                timerRef.current = setTimeout(() => {
                                                                    inputRefs.current[index][`${"sales_return_unit_discount_with_vat_" + index}`]?.select();
                                                                }, 100);
                                                            }}
                                                            onKeyDown={(e) => {
                                                                RunKeyActions(e, product);
                                                                if (timerRef.current) clearTimeout(timerRef.current);

                                                                if (e.key === "Enter") {
                                                                    if ((index + 1) === selectedProducts.length) {
                                                                        timerRef.current = setTimeout(() => {
                                                                            inputRefs.current[index - 1][`${"sales_return_product_purchase_unit_price_" + (index - 1)}`]?.focus();
                                                                        }, 100);
                                                                    } else {
                                                                        if (index === 0) {
                                                                            timerRef.current = setTimeout(() => {
                                                                                inputRefs.current[(selectedProducts.length - 1)][`${"sales_return_product_purchase_unit_price_" + (selectedProducts.length - 1)}`]?.focus();
                                                                            }, 100);
                                                                        } else {
                                                                            console.log("moviing to next line")
                                                                            timerRef.current = setTimeout(() => {
                                                                                inputRefs.current[index - 1][`${"sales_return_product_purchase_unit_price_" + (index - 1)}`]?.focus();
                                                                            }, 100);
                                                                        }
                                                                    }
                                                                } else if (e.key === "ArrowLeft") {
                                                                    timerRef.current = setTimeout(() => {
                                                                        inputRefs.current[index][`${"sales_return_unit_discount_" + index}`].focus();
                                                                    }, 100);
                                                                }
                                                            }}
                                                            onChange={(e) => {
                                                                if (timerRef.current) clearTimeout(timerRef.current);
                                                                if (parseFloat(e.target.value) === 0) {
                                                                    selectedProducts[index].unit_discount_with_vat = 0.00;
                                                                    selectedProducts[index].unit_discount = 0.00;
                                                                    selectedProducts[index].unit_discount_percent = 0.00;
                                                                    selectedProducts[index].unit_discount_percent_with_vat = 0.00;
                                                                    setFormData({ ...formData });
                                                                    delete errors["unit_discount_with_vat" + index];
                                                                    setErrors({ ...errors });
                                                                    timerRef.current = setTimeout(() => {
                                                                        CalCulateLineTotals(index);
                                                                        reCalculate(index);
                                                                    }, 100);
                                                                    return;
                                                                }

                                                                if (parseFloat(e.target.value) < 0) {
                                                                    selectedProducts[index].unit_discount_with_vat = 0.00;
                                                                    selectedProducts[index].unit_discount_percent = 0.00;
                                                                    selectedProducts[index].unit_discount = 0.00;
                                                                    selectedProducts[index].unit_discount_percent_with_vat = 0.00;
                                                                    setFormData({ ...formData });
                                                                    errors["unit_discount_" + index] = "Unit discount should be >= 0";
                                                                    setErrors({ ...errors });
                                                                    timerRef.current = setTimeout(() => {
                                                                        CalCulateLineTotals(index);
                                                                        reCalculate(index);
                                                                    }, 100);
                                                                    return;
                                                                }

                                                                if (!e.target.value) {
                                                                    selectedProducts[index].unit_discount_with_vat = "";
                                                                    selectedProducts[index].unit_discount = "";
                                                                    selectedProducts[index].unit_discount_percent = "";
                                                                    selectedProducts[index].unit_discount_percent_with_vat = "";
                                                                    // errors["discount_" + index] = "Invalid Discount";
                                                                    setFormData({ ...formData });
                                                                    timerRef.current = setTimeout(() => {
                                                                        CalCulateLineTotals(index);
                                                                        reCalculate(index);
                                                                    }, 100);
                                                                    //setErrors({ ...errors });
                                                                    return;
                                                                }

                                                                delete errors["unit_discount_with_vat_" + index];
                                                                delete errors["unit_discount_percent_" + index];
                                                                setErrors({ ...errors });

                                                                if (/^\d*\.?\d{0,8}$/.test(parseFloat(e.target.value)) === false) {
                                                                    errors["unit_discount_with_vat_" + index] = "Max decimal points allowed is 8";
                                                                    setErrors({ ...errors });
                                                                }

                                                                selectedProducts[index].unit_discount_with_vat = parseFloat(e.target.value); //input


                                                                setFormData({ ...formData });
                                                                timerRef.current = setTimeout(() => {

                                                                    selectedProducts[index].unit_discount = parseFloat(trimTo2Decimals(selectedProducts[index].unit_discount_with_vat / (1 + (formData.vat_percent / 100))))
                                                                    selectedProducts[index].unit_discount_percent = parseFloat(trimTo8Decimals(((selectedProducts[index].unit_discount / selectedProducts[index].unit_price) * 100)))
                                                                    selectedProducts[index].unit_discount_percent_with_vat = parseFloat(trimTo8Decimals(((selectedProducts[index].unit_discount_with_vat / selectedProducts[index].unit_price_with_vat) * 100)))

                                                                    CalCulateLineTotals(index);
                                                                    reCalculate(index);
                                                                }, 100);
                                                            }} />
                                                    </div>
                                                    {(errors[`unit_discount_with_vat_${index}`] || warnings[`unit_discount_with_vat_${index}`]) && (
                                                        <i
                                                            className={`bi bi-exclamation-circle-fill ${errors[`unit_discount_with_vat_${index}`] ? 'text-danger' : 'text-warning'} ms-2`}
                                                            data-bs-toggle="tooltip"
                                                            data-bs-placement="top"
                                                            data-error={errors[`unit_discount_with_vat_${index}`] || ''}
                                                            data-warning={warnings[`unit_discount_with_vat_${index}`] || ''}
                                                            title={errors[`unit_discount_with_vat_${index}`] || warnings[`unit_discount_with_vat_${index}`] || ''}
                                                            style={{
                                                                fontSize: '1rem',
                                                                cursor: 'pointer',
                                                                whiteSpace: 'nowrap',
                                                            }}
                                                        ></i>
                                                    )}
                                                </div>
                                            </td>
                                            {/*<td>
                                                                                            <div className="input-group mb-3">
                                                                                                <input type="number" id={`${"sales_return_unit_discount_percent" + index}`} disabled={false} name={`${"sales_return_unit_discount_percent" + index}`} onWheel={(e) => e.target.blur()} className="form-control text-end" value={selectedProducts[index].unit_discount_percent} onChange={(e) => {
                                                                                                    if (timerRef.current) clearTimeout(timerRef.current);
                                            
                                                                                                    if (parseFloat(e.target.value) === 0) {
                                                                                                        selectedProducts[index].unit_discount_percent = 0.00;
                                                                                                        selectedProducts[index].unit_discount_with_vat = 0.00;
                                                                                                        selectedProducts[index].unit_discount = 0.00;
                                                                                                        selectedProducts[index].unit_discount_percent_with_vat = 0.00;
                                                                                                        setFormData({ ...formData });
                                                                                                        errors["unit_discount_percent_" + index] = "";
                                                                                                        setErrors({ ...errors });
                                                                                                        timerRef.current = setTimeout(() => {
                                                                                                            reCalculate(index);
                                                                                                        }, 300);
                                                                                                        return;
                                                                                                    }
                                            
                                                                                                    if (parseFloat(e.target.value) < 0) {
                                                                                                        selectedProducts[index].unit_discount_percent = 0.00;
                                                                                                        selectedProducts[index].unit_discount_with_vat = 0.00;
                                                                                                        selectedProducts[index].unit_discount = 0.00;
                                                                                                        selectedProducts[index].unit_discount_percent_with_vat = 0.00;
                                                                                                        setFormData({ ...formData });
                                                                                                        errors["unit_discount_percent_" + index] = "Unit discount % should be >= 0";
                                                                                                        setErrors({ ...errors });
                                                                                                        timerRef.current = setTimeout(() => {
                                                                                                            reCalculate(index);
                                                                                                        }, 300);
                                                                                                        return;
                                                                                                    }
                                            
                                                                                                    if (!e.target.value) {
                                                                                                        selectedProducts[index].unit_discount_percent = "";
                                                                                                        selectedProducts[index].unit_discount_with_vat = "";
                                                                                                        selectedProducts[index].unit_discount = "";
                                                                                                        selectedProducts[index].unit_discount_percent_with_vat = "";
                                                                                                        //errors["discount_percent_" + index] = "Invalid Discount Percent";
                                                                                                        setFormData({ ...formData });
                                                                                                        timerRef.current = setTimeout(() => {
                                                                                                            reCalculate(index);
                                                                                                        }, 300);
                                                                                                        //setErrors({ ...errors });
                                                                                                        return;
                                                                                                    }
                                            
                                                                                                    errors["unit_discount_percent_" + index] = "";
                                                                                                    errors["unit_discount_" + index] = "";
                                                                                                    setErrors({ ...errors });
                                            
                                                                                                    selectedProducts[index].unit_discount_percent = parseFloat(e.target.value); //input
                                            
                                            
                                                                                                    setFormData({ ...formData });
                                            
                                                                                                    timerRef.current = setTimeout(() => {
                                                                                                        selectedProducts[index].unit_discount = parseFloat(trimTo2Decimals(selectedProducts[index].unit_price * (selectedProducts[index].unit_discount_percent / 100)));
                                                                                                        selectedProducts[index].unit_discount_with_vat = parseFloat(trimTo2Decimals(selectedProducts[index].unit_discount * (1 + (formData.vat_percent / 100))))
                                                                                                        selectedProducts[index].unit_discount_percent_with_vat = parseFloat(trimTo2Decimals(((selectedProducts[index].unit_discount_with_vat / selectedProducts[index].unit_price_with_vat) * 100)))
                                            
                                                                                                        reCalculate(index);
                                                                                                    }, 300);
                                                                                                }} />
                                                                                            </div>
                                                                                            {errors["unit_discount_percent_" + index] && (
                                                                                                <div style={{ color: "red" }}>
                                                                                                    {errors["unit_discount_percent_" + index]}
                                                                                                </div>
                                                                                            )}
                                                                                        </td>*/}
                                            <td style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                                                    <div className="input-group flex-nowrap" style={{ flex: '1 1 auto', minWidth: 0 }}>
                                                        <input type="number"
                                                            id={`${"sales_return_unit_discount_percent_with_vat_" + index}`}
                                                            disabled={true}
                                                            name={`${"sales_return_unit_discount_percent_with_vat_" + index}`}
                                                            onWheel={(e) => e.target.blur()}
                                                            className={`form-control text-end ${errors["unit_discount_percent_with_vat_" + index] ? 'is-invalid' : ''} ${warnings["unit_discount_percent_with_vat_" + index] ? 'border-warning text-warning' : ''}`}
                                                            value={selectedProducts[index].unit_discount_percent_with_vat}
                                                            onChange={(e) => {
                                                                if (timerRef.current) clearTimeout(timerRef.current);

                                                                if (parseFloat(e.target.value) === 0) {
                                                                    selectedProducts[index].unit_discount_percent = 0.00;
                                                                    selectedProducts[index].unit_discount_percent_with_vat = 0.00;
                                                                    selectedProducts[index].unit_discount_with_vat = 0.00;
                                                                    selectedProducts[index].unit_discount = 0.00;
                                                                    setFormData({ ...formData });
                                                                    delete errors["unit_discount_percent_" + index];
                                                                    setErrors({ ...errors });
                                                                    timerRef.current = setTimeout(() => {
                                                                        CalCulateLineTotals(index);
                                                                        reCalculate(index)
                                                                    }, 100);
                                                                    return;
                                                                }

                                                                if (parseFloat(e.target.value) < 0) {
                                                                    selectedProducts[index].unit_discount_percent = 0.00;
                                                                    selectedProducts[index].unit_discount_percent_with_vat = 0.00;
                                                                    selectedProducts[index].unit_discount_with_vat = 0.00;
                                                                    selectedProducts[index].unit_discount = 0.00;
                                                                    setFormData({ ...formData });
                                                                    errors["unit_discount_percent_" + index] = "Unit discount % should be >= 0";
                                                                    setErrors({ ...errors });
                                                                    timerRef.current = setTimeout(() => {
                                                                        CalCulateLineTotals(index);
                                                                        reCalculate(index);
                                                                    }, 100);
                                                                    return;
                                                                }

                                                                if (!e.target.value) {
                                                                    selectedProducts[index].unit_discount_percent = "";
                                                                    selectedProducts[index].unit_discount_percent_with_vat = "";
                                                                    selectedProducts[index].unit_discount_with_vat = "";
                                                                    selectedProducts[index].unit_discount = "";
                                                                    //errors["discount_percent_" + index] = "Invalid Discount Percent";
                                                                    setFormData({ ...formData });
                                                                    timerRef.current = setTimeout(() => {
                                                                        CalCulateLineTotals(index);
                                                                        reCalculate(index);
                                                                    }, 100);
                                                                    //setErrors({ ...errors });
                                                                    return;
                                                                }

                                                                delete errors["unit_discount_percent_" + index];
                                                                delete errors["unit_discount_" + index];
                                                                setErrors({ ...errors });

                                                                /*
                                                                if (/^\d*\.?\d{0, 2}$/.test(parseFloat(e.target.value)) === false) {
                                                            errors["unit_discount_percent_" + index] = "Max. decimal points allowed is 2";
                                                        setErrors({...errors});
                                                                }*/

                                                                selectedProducts[index].unit_discount_percent_with_vat = parseFloat(e.target.value); //input


                                                                //selectedProducts[index].unit_discount_percent_with_vat = parseFloat(trimTo2Decimals(((selectedProducts[index].unit_discount_with_vat / selectedProducts[index].unit_price_with_vat) * 100)))

                                                                setFormData({ ...formData });

                                                                timerRef.current = setTimeout(() => {
                                                                    selectedProducts[index].unit_discount_with_vat = parseFloat(trimTo8Decimals(selectedProducts[index].unit_price_with_vat * (selectedProducts[index].unit_discount_percent_with_vat / 100)))
                                                                    selectedProducts[index].unit_discount = parseFloat(trimTo8Decimals(selectedProducts[index].unit_discount_with_vat / (1 + (formData.vat_percent / 100))))
                                                                    selectedProducts[index].unit_discount_percent = parseFloat(trimTo8Decimals(((selectedProducts[index].unit_discount / selectedProducts[index].unit_price) * 100)))

                                                                    CalCulateLineTotals(index);
                                                                    reCalculate(index);
                                                                }, 100);
                                                            }} />{""}
                                                    </div>
                                                    {(errors[`unit_discount_percent_with_vat_${index}`] || warnings[`unit_discount_percent_with_vat_${index}`]) && (
                                                        <i
                                                            className={`bi bi-exclamation-circle-fill ${errors[`unit_discount_percent_with_vat_${index}`] ? 'text-danger' : 'text-warning'} ms-2`}
                                                            data-bs-toggle="tooltip"
                                                            data-bs-placement="top"
                                                            data-error={errors[`unit_discount_percent_with_vat_${index}`] || ''}
                                                            data-warning={warnings[`unit_discount_percent_with_vat_${index}`] || ''}
                                                            title={errors[`unit_discount_percent_with_vat_${index}`] || warnings[`unit_discount_percent_with_vat_${index}`] || ''}
                                                            style={{
                                                                fontSize: '1rem',
                                                                cursor: 'pointer',
                                                                whiteSpace: 'nowrap',
                                                            }}
                                                        ></i>
                                                    )}
                                                </div>
                                            </td>
                                            <td style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                                                    <div className="input-group flex-nowrap" style={{ flex: '1 1 auto', minWidth: 0 }}>
                                                        <input type="number"
                                                            id={`${"sales_product_line_total_" + index}`}
                                                            name={`${"sales_product_line_total_" + index}`}
                                                            onWheel={(e) => e.target.blur()}
                                                            value={selectedProducts[index].line_total}
                                                            className={`form-control text-end ${errors["line_total_" + index] ? 'is-invalid' : ''} ${warnings["line_total_" + index] ? 'border-warning text-warning' : ''}`}
                                                            placeholder="Line total"
                                                            ref={(el) => {
                                                                if (!inputRefs.current[index]) inputRefs.current[index] = {};
                                                                inputRefs.current[index][`${"sales_product_line_total_" + index}`] = el;
                                                            }}

                                                            onFocus={() => {
                                                                if (timerRef.current) clearTimeout(timerRef.current);
                                                                timerRef.current = setTimeout(() => {
                                                                    inputRefs.current[index][`${"sales_product_line_total_" + index}`]?.select();
                                                                }, 20);
                                                            }}

                                                            onKeyDown={(e) => {
                                                                RunKeyActions(e, product);

                                                                if (timerRef.current) clearTimeout(timerRef.current);
                                                                if (e.key === "Backspace") {
                                                                    delete errors["line_total_" + index];
                                                                    selectedProducts[index].unit_price_with_vat = "";
                                                                    selectedProducts[index].unit_price = "";
                                                                    selectedProducts[index].line_total = "";
                                                                    selectedProducts[index].line_total_with_vat = "";
                                                                    setSelectedProducts([...selectedProducts]);
                                                                    timerRef.current = setTimeout(() => {
                                                                        checkErrors(index);
                                                                        CalCulateLineTotals(index, true);
                                                                        reCalculate(index);
                                                                    }, 100);
                                                                } else if (e.key === "ArrowLeft") {
                                                                    timerRef.current = setTimeout(() => {
                                                                        inputRefs.current[index][`${"sales_product_unit_discount_with_vat_" + index}`]?.select();
                                                                    }, 100);
                                                                }
                                                            }}

                                                            onChange={(e) => {
                                                                delete errors["line_total_" + index];
                                                                if (timerRef.current) clearTimeout(timerRef.current);
                                                                if (parseFloat(e.target.value) === 0) {
                                                                    selectedProducts[index].unit_price = e.target.value;
                                                                    selectedProducts[index].unit_price_with_vat = e.target.value;
                                                                    selectedProducts[index].line_total = e.target.value;
                                                                    selectedProducts[index].line_total_with_vat = e.target.value;
                                                                    setSelectedProducts([...selectedProducts]);
                                                                    timerRef.current = setTimeout(() => {
                                                                        //  checkWarnings(index);
                                                                        checkErrors(index);
                                                                        CalCulateLineTotals(index, true);
                                                                        reCalculate(index);
                                                                    }, 100);
                                                                    return;
                                                                }

                                                                if (!e.target.value) {
                                                                    selectedProducts[index].unit_price = e.target.value;
                                                                    selectedProducts[index].unit_price_with_vat = e.target.value;
                                                                    selectedProducts[index].line_total = e.target.value;
                                                                    selectedProducts[index].line_total_with_vat = e.target.value;
                                                                    setSelectedProducts([...selectedProducts]);
                                                                    timerRef.current = setTimeout(() => {
                                                                        //checkWarnings(index);
                                                                        checkErrors(index);
                                                                        CalCulateLineTotals(index, true);
                                                                        reCalculate(index);
                                                                    }, 100);
                                                                    return;
                                                                }


                                                                if (/^\d*\.?\d{0,2}$/.test(parseFloat(e.target.value)) === false) {
                                                                    errors["line_total_" + index] = "Max decimal points allowed is 2";
                                                                    setErrors({ ...errors });
                                                                }

                                                                selectedProducts[index].line_total = parseFloat(e.target.value);
                                                                setSelectedProducts([...selectedProducts]);

                                                                timerRef.current = setTimeout(() => {
                                                                    if (selectedProducts[index].quantity > 0) {
                                                                        selectedProducts[index].unit_price = parseFloat(trimTo8Decimals((selectedProducts[index].line_total / selectedProducts[index].quantity) + selectedProducts[index].unit_discount));

                                                                        selectedProducts[index].unit_price_with_vat = parseFloat(trimTo8Decimals(selectedProducts[index].unit_price * (1 + (formData.vat_percent / 100))))
                                                                        selectedProducts[index].unit_discount_percent = parseFloat(trimTo8Decimals(((selectedProducts[index].unit_discount / selectedProducts[index].unit_price) * 100)))
                                                                        selectedProducts[index].unit_discount_percent_with_vat = parseFloat(trimTo8Decimals(((selectedProducts[index].unit_discount_with_vat / selectedProducts[index].unit_price_with_vat) * 100)))
                                                                    }
                                                                    CalCulateLineTotals(index, true);
                                                                    reCalculate(index);
                                                                    checkErrors(index);
                                                                }, 100);
                                                            }} />

                                                    </div>
                                                    {(errors[`line_total_${index}`] || warnings[`line_total_${index}`]) && (
                                                        <i
                                                            className={`bi bi-exclamation-circle-fill ${errors[`line_total_${index}`] ? 'text-danger' : 'text-warning'} ms-2`}
                                                            data-bs-toggle="tooltip"
                                                            data-bs-placement="top"
                                                            data-error={errors[`line_total_${index}`] || ''}
                                                            data-warning={warnings[`line_total_${index}`] || ''}
                                                            title={errors[`line_total_${index}`] || warnings[`line_total_${index}`] || ''}
                                                            style={{
                                                                fontSize: '1rem',
                                                                cursor: 'pointer',
                                                                whiteSpace: 'nowrap',
                                                            }}
                                                        ></i>
                                                    )}
                                                </div>
                                            </td>
                                            <td style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                                                    <div className="input-group flex-nowrap" style={{ flex: '1 1 auto', minWidth: 0 }}>
                                                        <input type="number"
                                                            id={`${"sales_product_line_total_with_vat" + index}`}
                                                            name={`${"sales_product_line_total_with_vat" + index}`}
                                                            onWheel={(e) => e.target.blur()}
                                                            value={selectedProducts[index].line_total_with_vat}
                                                            className={`form-control text-end ${errors["line_total_with_vat" + index] ? 'is-invalid' : ''} ${warnings["line_total_with_vat" + index] ? 'border-warning text-warning' : ''}`}
                                                            placeholder="Line total with VAT"
                                                            ref={(el) => {
                                                                if (!inputRefs.current[index]) inputRefs.current[index] = {};
                                                                inputRefs.current[index][`${"sales_product_line_total_with_vat" + index}`] = el;
                                                            }}

                                                            onFocus={() => {
                                                                if (timerRef.current) clearTimeout(timerRef.current);
                                                                timerRef.current = setTimeout(() => {
                                                                    inputRefs.current[index][`${"sales_product_line_total_with_vat" + index}`]?.select();
                                                                }, 20);
                                                            }}

                                                            onKeyDown={(e) => {
                                                                RunKeyActions(e, product);

                                                                if (timerRef.current) clearTimeout(timerRef.current);
                                                                if (e.key === "Backspace") {
                                                                    delete errors["line_total_with_vat_" + index];
                                                                    selectedProducts[index].unit_price_with_vat = "";
                                                                    selectedProducts[index].unit_price = "";
                                                                    selectedProducts[index].line_total = "";
                                                                    selectedProducts[index].line_total_with_vat = "";
                                                                    setSelectedProducts([...selectedProducts]);
                                                                    timerRef.current = setTimeout(() => {
                                                                        checkErrors(index);
                                                                        CalCulateLineTotals(index, false, true);
                                                                        reCalculate(index);
                                                                    }, 100);
                                                                } else if (e.key === "ArrowLeft") {
                                                                    timerRef.current = setTimeout(() => {
                                                                        inputRefs.current[index][`${"sales_product_line_total_" + index}`]?.select();
                                                                    }, 100);
                                                                }
                                                            }}

                                                            onChange={(e) => {
                                                                delete errors["line_total_with_vat_" + index];
                                                                if (timerRef.current) clearTimeout(timerRef.current);
                                                                if (parseFloat(e.target.value) === 0) {
                                                                    selectedProducts[index].unit_price = e.target.value;
                                                                    selectedProducts[index].unit_price_with_vat = e.target.value;
                                                                    selectedProducts[index].line_total = e.target.value;
                                                                    selectedProducts[index].line_total_with_vat = e.target.value;
                                                                    setSelectedProducts([...selectedProducts]);
                                                                    timerRef.current = setTimeout(() => {
                                                                        //  checkWarnings(index);
                                                                        checkErrors(index);
                                                                        CalCulateLineTotals(index, false, true);
                                                                        reCalculate(index);
                                                                    }, 100);
                                                                    return;
                                                                }

                                                                if (!e.target.value) {
                                                                    selectedProducts[index].unit_price = e.target.value;
                                                                    selectedProducts[index].unit_price_with_vat = e.target.value;
                                                                    selectedProducts[index].line_total = e.target.value;
                                                                    selectedProducts[index].line_total_with_vat = e.target.value;
                                                                    setSelectedProducts([...selectedProducts]);
                                                                    timerRef.current = setTimeout(() => {
                                                                        //checkWarnings(index);
                                                                        checkErrors(index);
                                                                        CalCulateLineTotals(index, false, true);
                                                                        reCalculate(index);
                                                                    }, 100);
                                                                    return;
                                                                }


                                                                if (/^\d*\.?\d{0,2}$/.test(parseFloat(e.target.value)) === false) {
                                                                    errors["line_total_with_vat_" + index] = "Max decimal points allowed is 2";
                                                                    setErrors({ ...errors });
                                                                }

                                                                selectedProducts[index].line_total_with_vat = parseFloat(e.target.value);
                                                                setSelectedProducts([...selectedProducts]);

                                                                timerRef.current = setTimeout(() => {
                                                                    if (selectedProducts[index].quantity > 0) {
                                                                        selectedProducts[index].unit_price_with_vat = parseFloat(trimTo8Decimals((selectedProducts[index].line_total_with_vat / selectedProducts[index].quantity) + selectedProducts[index].unit_discount_with_vat));
                                                                        selectedProducts[index].unit_price = parseFloat(trimTo8Decimals(selectedProducts[index].unit_price_with_vat / (1 + (formData.vat_percent / 100))))

                                                                        // selectedProducts[index].unit_price_with_vat = parseFloat(trimTo8Decimals(selectedProducts[index].unit_price * (1 + (formData.vat_percent / 100))))
                                                                        selectedProducts[index].unit_discount_percent = parseFloat(trimTo8Decimals(((selectedProducts[index].unit_discount / selectedProducts[index].unit_price) * 100)))
                                                                        selectedProducts[index].unit_discount_percent_with_vat = parseFloat(trimTo8Decimals(((selectedProducts[index].unit_discount_with_vat / selectedProducts[index].unit_price_with_vat) * 100)))
                                                                    }
                                                                    reCalculate(index);
                                                                    CalCulateLineTotals(index, false, true);
                                                                    checkErrors(index);
                                                                }, 100);
                                                            }} />

                                                    </div>
                                                    {(errors[`line_total_with_vat_${index}`] || warnings[`line_total_with_vat_${index}`]) && (
                                                        <i
                                                            className={`bi bi-exclamation-circle-fill ${errors[`line_total_with_vat_${index}`] ? 'text-danger' : 'text-warning'} ms-2`}
                                                            data-bs-toggle="tooltip"
                                                            data-bs-placement="top"
                                                            data-error={errors[`line_total_with_vat_${index}`] || ''}
                                                            data-warning={warnings[`line_total_with_vat_${index}`] || ''}
                                                            title={errors[`line_total_with_vat_${index}`] || warnings[`line_total_with_vat_${index}`] || ''}
                                                            style={{
                                                                fontSize: '1rem',
                                                                cursor: 'pointer',
                                                                whiteSpace: 'nowrap',
                                                            }}
                                                        ></i>
                                                    )}
                                                </div>
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


                                        <th colSpan="8" className="text-end">Total(without VAT)</th>
                                        <td className="text-end" style={{ width: "200px" }} >
                                            <NumberFormat
                                                value={trimTo2Decimals(formData.total)}
                                                displayType={"text"}
                                                thousandSeparator={true}
                                                suffix={" "}
                                                renderText={(value, props) => value}
                                            />
                                        </td>
                                    </tr>
                                    <tr>
                                        <th colSpan="8" className="text-end">Total(with VAT)</th>
                                        <td className="text-end" style={{ width: "200px" }} >
                                            <NumberFormat
                                                value={trimTo2Decimals(formData.total_with_vat)}
                                                displayType={"text"}
                                                thousandSeparator={true}
                                                suffix={" "}
                                                renderText={(value, props) => value}
                                            />
                                        </td>
                                    </tr>
                                    <tr>
                                        <th colSpan="8" className="text-end">
                                            Shipping & Handling Fees
                                        </th>
                                        <td className="text-end">
                                            <input type="number" id="sales_shipping_fees" name="sales_shipping_fees" onWheel={(e) => e.target.blur()} style={{ width: "150px" }} className="text-start" value={shipping} onChange={(e) => {
                                                if (timerRef.current) clearTimeout(timerRef.current);
                                                delete errors["shipping_handling_fees"];
                                                setErrors({ ...errors });

                                                if (parseFloat(e.target.value) === 0) {
                                                    shipping = 0;
                                                    setShipping(shipping);
                                                    delete errors["shipping_handling_fees"];
                                                    setErrors({ ...errors });
                                                    timerRef.current = setTimeout(() => {
                                                        reCalculate();
                                                    }, 300);

                                                    return;
                                                }

                                                if (parseFloat(e.target.value) < 0) {
                                                    shipping = 0;
                                                    setShipping(shipping);

                                                    // errors["shipping_handling_fees"] = "Shipping / Handling Fees should be > 0";
                                                    setErrors({ ...errors });
                                                    timerRef.current = setTimeout(() => {
                                                        reCalculate();
                                                    }, 300);
                                                    return;
                                                }

                                                if (!e.target.value) {
                                                    shipping = "";
                                                    setShipping(shipping);
                                                    //errors["shipping_handling_fees"] = "Invalid Shipping / Handling Fees";

                                                    setErrors({ ...errors });
                                                    timerRef.current = setTimeout(() => {
                                                        reCalculate();
                                                    }, 300);
                                                    return;
                                                }


                                                if (/^\d*\.?\d{0, 2}$/.test(parseFloat(e.target.value)) === false) {
                                                    errors["shipping_handling_fees"] = "Max. decimal points allowed is 2";
                                                    setErrors({ ...errors });
                                                }


                                                shipping = parseFloat(e.target.value);
                                                setShipping(shipping);
                                                timerRef.current = setTimeout(() => {
                                                    reCalculate();
                                                }, 300);
                                            }} />
                                            {" "}
                                            {errors.shipping_handling_fees && (
                                                <div style={{ color: "red" }}>
                                                    {errors.shipping_handling_fees}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                    <tr>
                                        <th colSpan="8" className="text-end">
                                            Discount(without VAT) <input type="number" id="discount_percent" name="discount_percent" onWheel={(e) => e.target.blur()} disabled={true} style={{ width: "50px" }} className="text-start" value={discountPercent} onChange={(e) => {
                                                if (timerRef.current) clearTimeout(timerRef.current);
                                                if (parseFloat(e.target.value) === 0) {

                                                    discount = 0;
                                                    setDiscount(discount);

                                                    discountPercentWithVAT = 0;
                                                    setDiscountPercentWithVAT(discountPercentWithVAT);

                                                    discount = 0;
                                                    setDiscount(discount);

                                                    discountPercent = 0;
                                                    setDiscountPercent(discountPercent);

                                                    delete errors["discount_percent"];
                                                    setErrors({ ...errors });
                                                    timerRef.current = setTimeout(() => {
                                                        reCalculate();
                                                    }, 100);
                                                    return;
                                                }

                                                if (parseFloat(e.target.value) < 0) {
                                                    discountWithVAT = 0;
                                                    setDiscountWithVAT(discountWithVAT);

                                                    discountPercentWithVAT = 0;
                                                    setDiscountPercentWithVAT(discountPercentWithVAT);

                                                    discount = 0;
                                                    setDiscount(discount);

                                                    discountPercent = 0;
                                                    setDiscountPercent(discountPercent);

                                                    // errors["discount_percent"] = "Discount percent should be >= 0";
                                                    setErrors({ ...errors });
                                                    timerRef.current = setTimeout(() => {
                                                        reCalculate();
                                                    }, 100);
                                                    return;
                                                }

                                                if (!e.target.value) {
                                                    discountWithVAT = "";
                                                    setDiscountWithVAT(discountWithVAT);

                                                    discountPercentWithVAT = "";
                                                    setDiscountPercentWithVAT(discountPercentWithVAT);

                                                    discount = "";
                                                    setDiscount(discount);

                                                    discountPercent = "";
                                                    setDiscountPercent(discountPercent);

                                                    setErrors({ ...errors });
                                                    timerRef.current = setTimeout(() => {
                                                        reCalculate();
                                                    }, 100);
                                                    return;
                                                }

                                                delete errors["discount_percent"];
                                                delete errors["discount"];

                                                setErrors({ ...errors });

                                                discountPercent = parseFloat(e.target.value);
                                                setDiscountPercent(discountPercent);
                                                timerRef.current = setTimeout(() => {
                                                    reCalculate();
                                                }, 100);
                                            }} />{"%"}
                                            {errors.discount_percent && (
                                                <div style={{ color: "red" }}>
                                                    {errors.discount_percent}
                                                </div>
                                            )}
                                        </th>
                                        <td className="text-end">
                                            <input type="number"
                                                id="sales_discount"
                                                name="sales_discount"
                                                onWheel={(e) => e.target.blur()} style={{ width: "150px" }}
                                                className="text-start"
                                                value={discount}
                                                ref={discountRef}
                                                onFocus={() => {
                                                    if (timerRef.current) clearTimeout(timerRef.current);
                                                    timerRef.current = setTimeout(() => {
                                                        discountRef.current.select();
                                                    }, 100);
                                                }}
                                                onChange={(e) => {
                                                    if (timerRef.current) clearTimeout(timerRef.current);
                                                    if (parseFloat(e.target.value) === 0) {
                                                        discount = 0;
                                                        setDiscount(discount);
                                                        discountWithVAT = 0;
                                                        setDiscountWithVAT(discountWithVAT);
                                                        discountPercent = 0
                                                        setDiscountPercent(discountPercent);
                                                        discountPercentWithVAT = 0
                                                        setDiscountPercent(discountPercentWithVAT);

                                                        delete errors["discount"];
                                                        setErrors({ ...errors });
                                                        timerRef.current = setTimeout(() => {

                                                            reCalculate();
                                                        }, 100);
                                                        return;
                                                    }

                                                    if (parseFloat(e.target.value) < 0) {
                                                        discount = 0;
                                                        setDiscount(discount);
                                                        discountWithVAT = 0;
                                                        setDiscountWithVAT(discountWithVAT);
                                                        discountPercent = 0
                                                        setDiscountPercent(discountPercent);
                                                        discountPercentWithVAT = 0
                                                        setDiscountPercent(discountPercentWithVAT);
                                                        // errors["discount"] = "Discount should be >= 0";
                                                        setErrors({ ...errors });
                                                        timerRef.current = setTimeout(() => {

                                                            reCalculate();
                                                        }, 100);
                                                        return;
                                                    }

                                                    if (!e.target.value) {
                                                        discount = "";
                                                        setDiscount(discount);
                                                        discountWithVAT = "";
                                                        setDiscountWithVAT(discountWithVAT);
                                                        discountPercent = "";
                                                        setDiscountPercent(discountPercent);
                                                        discountPercentWithVAT = "";
                                                        setDiscountPercent(discountPercentWithVAT);

                                                        setErrors({ ...errors });
                                                        timerRef.current = setTimeout(() => {

                                                            reCalculate();
                                                        }, 100);

                                                        return;
                                                    }

                                                    delete errors["discount"];
                                                    delete errors["discount_percent"];
                                                    setErrors({ ...errors });


                                                    if (/^\d*\.?\d{0,2}$/.test(parseFloat(e.target.value)) === false) {
                                                        errors["discount"] = "Max. decimal points allowed is 2";
                                                        setErrors({ ...errors });
                                                    }

                                                    discount = parseFloat(e.target.value);
                                                    setDiscount(discount);

                                                    timerRef.current = setTimeout(() => {
                                                        discountWithVAT = parseFloat(trimTo2Decimals(discount * (1 + (formData.vat_percent / 100))))
                                                        setDiscountWithVAT(discountWithVAT);
                                                        reCalculate();
                                                    }, 100);
                                                }} />
                                            {" "}
                                            {errors.discount && (
                                                <div style={{ color: "red" }}>
                                                    {errors.discount}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                    <tr>
                                        <th colSpan="8" className="text-end">
                                            Discount(with VAT) <input
                                                type="number"
                                                id="discount_percent"
                                                name="discount_percent"
                                                onWheel={(e) => e.target.blur()}
                                                disabled={true}
                                                style={{ width: "50px" }} className="text-start"
                                                value={discountPercentWithVAT}
                                                onChange={(e) => {
                                                    if (timerRef.current) clearTimeout(timerRef.current);
                                                    if (parseFloat(e.target.value) === 0) {
                                                        discountWithVAT = 0;
                                                        setDiscountWithVAT(discountWithVAT);

                                                        discountPercentWithVAT = 0;
                                                        setDiscountPercentWithVAT(discountPercentWithVAT);

                                                        discount = 0;
                                                        setDiscount(discount);

                                                        discountPercent = 0;
                                                        setDiscountPercent(discountPercent);

                                                        delete errors["discount_percent_with_vat"];
                                                        setErrors({ ...errors });
                                                        timerRef.current = setTimeout(() => {
                                                            reCalculate();
                                                        }, 100);
                                                        return;
                                                    }

                                                    if (parseFloat(e.target.value) < 0) {
                                                        discountWithVAT = 0;
                                                        setDiscountWithVAT(discountWithVAT);

                                                        discountPercentWithVAT = 0;
                                                        setDiscountPercentWithVAT(discountPercentWithVAT);

                                                        discount = 0;
                                                        setDiscount(discount);

                                                        discountPercent = 0;
                                                        setDiscountPercent(discountPercent);

                                                        errors["discount_percent_with_vat"] = "Discount percent should be >= 0";
                                                        setErrors({ ...errors });
                                                        timerRef.current = setTimeout(() => {
                                                            reCalculate();
                                                        }, 100);
                                                        return;
                                                    }

                                                    if (!e.target.value) {
                                                        discountWithVAT = "";
                                                        setDiscountWithVAT(discountWithVAT);

                                                        discountPercentWithVAT = "";
                                                        setDiscountPercentWithVAT(discountPercentWithVAT);

                                                        discount = "";
                                                        setDiscount(discount);

                                                        discountPercent = "";
                                                        setDiscountPercent(discountPercent);

                                                        setErrors({ ...errors });
                                                        timerRef.current = setTimeout(() => {
                                                            reCalculate();
                                                        }, 100);
                                                        return;
                                                    }

                                                    delete errors["discount_percent_with_vat"];
                                                    delete errors["discount_with_vat"];
                                                    setErrors({ ...errors });

                                                    discountPercentWithVAT = parseFloat(e.target.value);
                                                    setDiscountPercentWithVAT(discountPercentWithVAT);
                                                    timerRef.current = setTimeout(() => {
                                                        reCalculate();
                                                    }, 100);
                                                }} />{"%"}
                                            {errors.discount_percent_with_vat && (
                                                <div style={{ color: "red" }}>
                                                    {errors.discount_percent_with_vat}
                                                </div>
                                            )}
                                        </th>
                                        <td className="text-end">
                                            <input type="number" id="sales_discount" name="sales_discount_with_vat"
                                                onWheel={(e) => e.target.blur()}
                                                style={{ width: "150px" }}
                                                className="text-start"
                                                value={discountWithVAT}
                                                ref={discountWithVATRef}
                                                onFocus={() => {
                                                    if (timerRef.current) clearTimeout(timerRef.current);
                                                    timerRef.current = setTimeout(() => {
                                                        discountWithVATRef.current.select();
                                                    }, 100);
                                                }}
                                                onChange={(e) => {
                                                    if (timerRef.current) clearTimeout(timerRef.current);
                                                    if (parseFloat(e.target.value) === 0) {
                                                        discount = 0;
                                                        discountWithVAT = 0;
                                                        discountPercent = 0
                                                        setDiscount(discount);
                                                        setDiscountWithVAT(discount);
                                                        setDiscountPercent(discount);
                                                        delete errors["discount_with_vat"];
                                                        setErrors({ ...errors });
                                                        timerRef.current = setTimeout(() => {
                                                            reCalculate();
                                                        }, 100);
                                                        return;
                                                    }

                                                    if (parseFloat(e.target.value) < 0) {
                                                        discount = 0.00;
                                                        discountWithVAT = 0.00;
                                                        discountPercent = 0.00;
                                                        setDiscount(discount);
                                                        setDiscountWithVAT(discount);
                                                        setDiscountPercent(discountPercent);
                                                        // errors["discount"] = "Discount should be >= 0";
                                                        setErrors({ ...errors });
                                                        timerRef.current = setTimeout(() => {
                                                            reCalculate();
                                                        }, 100);
                                                        return;
                                                    }

                                                    if (!e.target.value) {
                                                        discount = "";
                                                        discountWithVAT = "";
                                                        discountPercent = "";
                                                        // errors["discount"] = "Invalid Discount";
                                                        setDiscount(discount);
                                                        setDiscountWithVAT(discount);
                                                        setDiscountPercent(discountPercent);
                                                        setErrors({ ...errors });
                                                        timerRef.current = setTimeout(() => {
                                                            reCalculate();
                                                        }, 100);

                                                        return;
                                                    }

                                                    delete errors["discount_with_vat"];
                                                    delete errors["discount_percent_with_vat"];
                                                    setErrors({ ...errors });


                                                    if (/^\d*\.?\d{0,2}$/.test(parseFloat(e.target.value)) === false) {
                                                        errors["discount_with_vat"] = "Max. decimal points allowed is 2";
                                                        setErrors({ ...errors });
                                                    }

                                                    discountWithVAT = parseFloat(e.target.value);
                                                    setDiscountWithVAT(discountWithVAT);

                                                    timerRef.current = setTimeout(() => {
                                                        discount = parseFloat(trimTo2Decimals(discountWithVAT / (1 + (formData.vat_percent / 100))))
                                                        setDiscount(discount);
                                                        reCalculate();
                                                    }, 100);
                                                }} />
                                            {" "}
                                            {errors.discount_with_vat && (
                                                <div style={{ color: "red" }}>
                                                    {errors.discount_with_vat}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                    <tr>
                                        <th colSpan="8" className="text-end">
                                            Total Taxable Amount(without VAT)
                                            <OverlayTrigger placement="right" overlay={renderTooltip}>
                                                <span style={{ textDecoration: 'underline dotted', cursor: 'pointer' }}>ℹ️</span>
                                            </OverlayTrigger>

                                        </th>
                                        <td className="text-end" style={{ width: "200px" }} >
                                            <NumberFormat
                                                value={trimTo2Decimals(formData.total + shipping - discount)}
                                                displayType={"text"}
                                                thousandSeparator={true}
                                                suffix={" "}
                                                renderText={(value, props) => value}
                                            />
                                        </td>
                                    </tr>
                                    <tr>

                                        <th colSpan="8" className="text-end"> VAT  <input type="number" id="sales_vat_percent" name="sales_vat_percent" onWheel={(e) => e.target.blur()} disabled={true} className="text-center" style={{ width: "50px" }} value={formData.vat_percent} onChange={(e) => {
                                            console.log("Inside onchange vat percent");
                                            if (parseFloat(e.target.value) === 0) {
                                                formData.vat_percent = parseFloat(e.target.value);
                                                setFormData({ ...formData });
                                                delete errors["vat_percent"];
                                                setErrors({ ...errors });
                                                reCalculate();
                                                return;
                                            }
                                            if (parseFloat(e.target.value) < 0) {
                                                formData.vat_percent = parseFloat(e.target.value);
                                                formData.vat_price = 0.00;

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
                                            delete errors["vat_percent"];
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
                                                value={trimTo2Decimals(formData.vat_price)}
                                                displayType={"text"}
                                                thousandSeparator={true}
                                                suffix={" "}
                                                renderText={(value, props) => value}
                                            />
                                        </td>
                                    </tr>

                                    <tr>
                                        <th colSpan="8" className="text-end">
                                            Net Total(with VAT) Before Rounding
                                            <OverlayTrigger placement="right" overlay={renderNetTotalBeforeRoundingTooltip}>
                                                <span style={{ textDecoration: 'underline dotted', cursor: 'pointer' }}>ℹ️</span>
                                            </OverlayTrigger>
                                        </th>
                                        <th className="text-end">
                                            <NumberFormat
                                                value={trimTo2Decimals(formData.net_total - roundingAmount)}
                                                displayType={"text"}
                                                thousandSeparator={true}
                                                suffix={" "}
                                                renderText={(value, props) => value}
                                            />
                                        </th>
                                    </tr>
                                    <tr>

                                        <th colSpan="8" className="text-end">  Rounding Amount
                                            [<input type="checkbox"
                                                id="sales_auto_rounding_amount"
                                                name="sales_auto_rounding_amount"
                                                className="text-center"
                                                style={{}}
                                                value={formData.auto_rounding_amount}
                                                checked={formData.auto_rounding_amount}
                                                onChange={(e) => {
                                                    if (timerRef.current) clearTimeout(timerRef.current);
                                                    setErrors({ ...errors });
                                                    formData.auto_rounding_amount = !formData.auto_rounding_amount;
                                                    setFormData({ ...formData });
                                                    timerRef.current = setTimeout(() => {
                                                        reCalculate();
                                                    }, 100);

                                                    console.log(formData);
                                                }} />{" Auto Calculate]"}
                                        </th>
                                        <td className="text-end">
                                            <input type="number"
                                                id="sales_rounding_amount"
                                                name="sales_rounding_amount"
                                                disabled={formData.auto_rounding_amount}
                                                onWheel={(e) => e.target.blur()}
                                                style={{ width: "150px" }}
                                                className="text-start"
                                                value={roundingAmount}
                                                onChange={(e) => {
                                                    if (timerRef.current) clearTimeout(timerRef.current);
                                                    delete errors["rounding_amount"];
                                                    setErrors({ ...errors });

                                                    if (!e.target.value) {
                                                        roundingAmount = "";
                                                        setRoundingAmount(roundingAmount);
                                                        timerRef.current = setTimeout(() => {
                                                            reCalculate();
                                                        }, 100);
                                                        return;
                                                    }

                                                    if (e.target.value) {
                                                        if (/^-?\d*\.?\d{0,2}$/.test(parseFloat(e.target.value)) === false) {
                                                            roundingAmount = parseFloat(e.target.value);

                                                            errors["rounding_amount"] = "Max. decimal points allowed is 2";
                                                            setErrors({ ...errors });
                                                            return;
                                                        }
                                                    }

                                                    roundingAmount = parseFloat(e.target.value)
                                                    setRoundingAmount(roundingAmount);

                                                    delete errors["rounding_amount"];
                                                    setErrors({ ...errors });
                                                    timerRef.current = setTimeout(() => {
                                                        reCalculate();
                                                    }, 100);
                                                }}

                                                onKeyDown={(e) => {
                                                    if (timerRef.current) clearTimeout(timerRef.current);

                                                    if (e.key === "Backspace") {
                                                        delete errors["rounding_amount"];
                                                        setErrors({ ...errors });
                                                        roundingAmount = "";
                                                        setRoundingAmount("");

                                                        timerRef.current = setTimeout(() => {
                                                            reCalculate();
                                                        }, 100);
                                                    }
                                                }}
                                            />
                                            {" "}
                                            {errors.rounding_amount && (
                                                <div style={{ color: "red" }}>
                                                    {errors.rounding_amount}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                    <tr>
                                        <th colSpan="8" className="text-end">
                                            Net Total(with VAT)
                                            <OverlayTrigger placement="right" overlay={renderNetTotalTooltip}>
                                                <span style={{ textDecoration: 'underline dotted', cursor: 'pointer' }}>ℹ️</span>
                                            </OverlayTrigger>
                                        </th>
                                        <th className="text-end">
                                            <NumberFormat
                                                value={trimTo2Decimals(formData.net_total)}
                                                displayType={"text"}
                                                thousandSeparator={true}
                                                suffix={" "}
                                                renderText={(value, props) => value}
                                            />
                                        </th>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Cash discount</label>
                            <input
                                type='number'
                                ref={cashDiscountRef}
                                id="sales_cash_discount"
                                name="sales_cash_discount"
                                value={cashDiscount}
                                className="form-control"
                                onChange={(e) => {
                                    delete errors["cash_discount"];
                                    setErrors({ ...errors });
                                    if (!e.target.value) {
                                        cashDiscount = e.target.value;
                                        setCashDiscount(cashDiscount);

                                        if (timerRef.current) clearTimeout(timerRef.current);
                                        timerRef.current = setTimeout(() => {
                                            // validatePaymentAmounts();
                                            reCalculate();
                                        }, 100);

                                        return;
                                    }

                                    cashDiscount = parseFloat(e.target.value);
                                    setCashDiscount(cashDiscount);

                                    if (cashDiscount > 0 && cashDiscount >= formData.net_total) {
                                        errors["cash_discount"] = "Cash discount should not be greater than or equal to Net Total: " + formData.net_total?.toString();
                                        setErrors({ ...errors });
                                        return;
                                    }

                                    if (timerRef.current) clearTimeout(timerRef.current);
                                    timerRef.current = setTimeout(() => {
                                        //  validatePaymentAmounts();
                                        reCalculate();
                                    }, 100);
                                    console.log(formData);
                                }}

                                onKeyDown={(e) => {
                                    if (timerRef.current) clearTimeout(timerRef.current);

                                    if (e.key === "Backspace") {
                                        cashDiscount = "";
                                        setCashDiscount(cashDiscount);

                                        if (timerRef.current) clearTimeout(timerRef.current);
                                        timerRef.current = setTimeout(() => {
                                            reCalculate();
                                        }, 100);
                                        return;
                                    }
                                }}
                                onFocus={() => {
                                    if (timerRef.current) clearTimeout(timerRef.current);
                                    timerRef.current = setTimeout(() => {
                                        cashDiscountRef.current.select();
                                    }, 20);
                                }}
                            />
                            {errors.cash_discount && (
                                <div style={{ color: "red" }}>
                                    {errors.cash_discount}
                                </div>
                            )}
                        </div>


                        <div className="col-md-8">
                            <label className="form-label">Payments given</label>

                            <div class="table-responsive" style={{ maxWidth: "900px" }} >
                                <Button variant="secondary" style={{ alignContent: "right" }} disabled={order.payment_status === "not_paid"} onClick={addNewPayment}>
                                    Create new payment
                                </Button>
                                <table class="table table-striped table-sm table-bordered">
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
                                            Reference
                                        </th>
                                        <th>
                                            Action
                                        </th>
                                    </thead>
                                    <tbody>
                                        {formData.payments_input &&
                                            formData.payments_input.filter(payment => !payment.deleted).map((payment, key) => (
                                                <tr key={key}>
                                                    <td style={{ minWidth: "220px" }}>

                                                        <DatePicker
                                                            disabled={order.payment_status === "not_paid"}
                                                            id="date_str"
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
                                                        <input id={`${"sales_return_payment_amount" + key}`} name={`${"sales_return_payment_amount" + key}`}
                                                            type='number' disabled={order.payment_status === "not_paid"} value={formData.payments_input[key].amount} className="form-control "
                                                            onChange={(e) => {
                                                                delete errors["payment_amount_" + key];
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
                                                        <select value={formData.payments_input[key].method} disabled={order.payment_status === "not_paid"} className="form-control "
                                                            onChange={(e) => {
                                                                // errors["payment_method"] = [];
                                                                delete errors["payment_method_" + key];
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
                                                            <option value="sales">Sales</option>
                                                            <option value="customer_account">Customer Account</option>
                                                        </select>
                                                        {errors["payment_method_" + key] && (
                                                            <div style={{ color: "red" }}>
                                                                {errors["payment_method_" + key]}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td style={{ width: "200px" }}>
                                                        {formData.payments_input[key] && (
                                                            <span
                                                                style={{ cursor: "pointer", color: "blue" }}
                                                                onClick={() => openReferenceUpdateForm(formData.payments_input[key].reference_id, formData.payments_input[key].reference_type)}
                                                            >
                                                                {formData.payments_input[key].reference_code}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td style={{ width: "200px" }}>
                                                        <Button variant="danger" disabled={order.payment_status === "not_paid"} onClick={(event) => {
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
                                            <td><b style={{ marginLeft: "14px" }}>{trimTo2Decimals(totalPaymentAmount)}</b>
                                                {errors["total_payment"] && (
                                                    <div style={{ color: "red" }}>
                                                        {errors["total_payment"]}
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                <b style={{ marginLeft: "12px", alignSelf: "end" }}>Balance: {trimTo2Decimals(balanceAmount)}</b>
                                                {errors["customer_credit_limit"] && (
                                                    <div style={{ color: "red" }}>
                                                        {errors["customer_credit_limit"]}
                                                    </div>
                                                )}
                                            </td>
                                            <td colSpan={2}>
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

                        <div className="row">
                            <div className="col-md-2">
                                <label className="form-label">Commission</label>
                                <input
                                    type='number'
                                    ref={commissionRef}
                                    id="sales_commission"
                                    name="sales_commission"
                                    value={commission}
                                    className="form-control"
                                    onChange={(e) => {
                                        delete errors["commission"];
                                        delete errors["commission_payment_method"];
                                        setErrors({ ...errors });
                                        if (!e.target.value) {
                                            commission = e.target.value;
                                            setCommission(commission);
                                            setErrors({ ...errors });
                                            return;
                                        }

                                        commission = parseFloat(e.target.value);
                                        setCommission(commission);

                                        if (commission > 0 && commission >= formData.net_total) {
                                            errors["commission"] = "Commission should not be greater than or equal to Net Total: " + formData.net_total?.toString();
                                            setErrors({ ...errors });
                                            return;
                                        }

                                        if (commission > 0 && !formData.commission_payment_method) {
                                            errors["commission_payment_method"] = "Payment method is required";
                                            setErrors({ ...errors });
                                            return;
                                        }


                                        console.log(formData);
                                    }}

                                    onKeyDown={(e) => {
                                        if (timerRef.current) clearTimeout(timerRef.current);

                                        if (e.key === "Backspace") {
                                            commission = "";
                                            setCommission(commission);
                                            delete errors["commission"];
                                            delete errors["commission_payment_method"];
                                            setErrors({ ...errors });
                                            return;
                                        }
                                    }}
                                    onFocus={() => {
                                        if (timerRef.current) clearTimeout(timerRef.current);
                                        timerRef.current = setTimeout(() => {
                                            commissionRef.current?.select();
                                        }, 20);
                                    }}
                                />
                                {errors.commission && (
                                    <div style={{ color: "red" }}>
                                        {errors.commission}
                                    </div>
                                )}
                            </div>
                            <div className="col-md-2">
                                <label className="form-label">Commission Payment Method</label>
                                <select value={formData.commission_payment_method} className="form-control "
                                    onChange={(e) => {
                                        // errors["payment_method"] = [];
                                        delete errors["commission_payment_method"];
                                        setErrors({ ...errors });

                                        if (!e.target.value && commission > 0) {
                                            errors["commission_payment_method"] = "Payment method is required";
                                            setErrors({ ...errors });

                                            formData.commission_payment_method = "";
                                            setFormData({ ...formData });
                                            return;
                                        }

                                        // errors["payment_method"] = "";
                                        //setErrors({ ...errors });

                                        formData.commission_payment_method = e.target.value;
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
                                </select>
                                {errors["commission_payment_method"] && (
                                    <div style={{ color: "red" }}>
                                        {errors["commission_payment_method"]}
                                    </div>
                                )}
                            </div>
                        </div>

                        <Modal.Footer>
                            <Button variant="secondary" onClick={handleClose}>
                                Close
                            </Button>
                            {selectedProducts && selectedProducts.length > 0 &&
                                <Button variant="primary" onClick={handleCreate} >
                                    {isProcessing ?
                                        <Spinner
                                            as="span"
                                            animation="bsalesreturn"
                                            size="sm"
                                            role="status"
                                            aria-hidden={true}
                                        />

                                        : formData.id ? "Update" : "Create"
                                    }
                                </Button>}
                        </Modal.Footer>
                    </form>}
                </Modal.Body>

            </Modal >


        </>
    );
});

export default SalesReturnCreate;
