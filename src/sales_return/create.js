import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback, useMemo } from "react";
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
import ResizableTableCell from '../utils/ResizableTableCell';
import SalesHistory from "../utils/product_sales_history.js";
import SalesReturnHistory from "./../utils/product_sales_return_history.js";
import PurchaseHistory from "./../utils/product_purchase_history.js";
import PurchaseReturnHistory from "./../utils/product_purchase_return_history.js";
import QuotationHistory from "./../utils/product_quotation_history.js";
import DeliveryNoteHistory from "./../utils/product_delivery_note_history.js";
import Products from "../utils/products.js";
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import Amount from "../utils/amount.js";

import ProductCreate from "./../product/create.js";
import ProductView from "./../product/view.js";
import ImageViewerModal from './../utils/ImageViewerModal';
//import ProductHistory from "./../product/product_history.js";
import ProductHistory from "../utils/product_history.js";
//import OverflowTooltip from "../utils/OverflowTooltip.js";

import CustomerWithdrawalCreate from "../customer_withdrawal/create.js";
import CustomerPending from "./../utils/customer_pending.js";
import SalesCreate from "../order/create.js";
import { useTranslation } from 'react-i18next';
import { getDateLocale } from "../i18n/dateLocales";
import '../order/style.css';
const SalesReturnCreate = forwardRef((props, ref) => {
    const { t, i18n } = useTranslation('common');
    const dateLocale = useMemo(() => getDateLocale(i18n.language), [i18n.language]);

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
            setIsZatcaLocked(false);

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
                signature_date_str: format(new Date(), "MMM dd yyyy", { locale: dateLocale }),
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
    const srFormType = store?.settings?.sales_return_create_form_design || 'type2';
    const [isZatcaLocked, setIsZatcaLocked] = useState(false);

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

                // console.log("Response:");
                // console.log(data);
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

    function fetchAndSetCustomer(customerId, fallbackData) {
        if (!customerId) return;
        const storeId = localStorage.getItem("store_id");
        const select = "id,code,credit_limit,credit_balance,vat_no,name,phone,phone2,email,name_in_arabic,phone_in_arabic,search_label,stores";
        fetch(`/v1/customer/${customerId}?search[store_id]=${storeId}&select=${select}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', 'Authorization': localStorage.getItem('access_token') },
        })
            .then(async r => {
                const data = r.ok && await r.json();
                if (data?.result) {
                    setSelectedCustomers([{ ...data.result, id: data.result.id || customerId }]);
                } else {
                    setSelectedCustomers([fallbackData]);
                }
            })
            .catch(() => setSelectedCustomers([fallbackData]));
    }

    function getSalesReturn(id) {
        //console.log("inside getSalesReturn id:", id);
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

                //console.log("Response:");
                //console.log(data);

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
                    customer_name: salesReturn.customer_name,
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
                    zatca: salesReturn.zatca,
                };

                if (!formData.payments_input) {
                    formData.payments_input = [];
                }

                if (data.result.payments) {
                    //console.log("data.result.payments:", data.result.payments);
                    formData.payments_input = data.result.payments;
                    for (var i = 0; i < formData.payments_input?.length; i++) {
                        formData.payments_input[i].date_str = formData.payments_input[i].date
                    }
                }


                if (formData.customer_name && formData.customer_id) {
                    fetchAndSetCustomer(formData.customer_id, {
                        id: formData.customer_id,
                        name: formData.customer?.name || formData.customer_name,
                        search_label: formData.customer?.search_label || formData.customer_name,
                    });
                }


                /*setSelectedProducts([...selectedProducts]);
                selectedProducts.forEach((product, index) => {
                    CalCulateLineTotals(index);
                });*/

                selectedProducts = salesReturn.products;
                setSelectedProducts([...selectedProducts]);

                const updatedProducts = salesReturn.products.map((product, index) => {
                    // Calculate line totals without calling setSelectedProducts inside the loop
                    const updatedProduct = { ...product };
                    updatedProduct.line_total = parseFloat(trimTo2Decimals((updatedProduct.unit_price - updatedProduct.unit_discount) * updatedProduct.quantity));
                    updatedProduct.line_total_with_vat = parseFloat(trimTo2Decimals((updatedProduct.unit_price_with_vat - updatedProduct.unit_discount_with_vat) * updatedProduct.quantity));
                    return updatedProduct;
                });
                setSelectedProducts(updatedProducts);


                setFormData({ ...formData });
                reCalculate();

                if (salesReturn?.zatca?.reporting_passed) {
                    setIsZatcaLocked(true);
                }

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
                //console.log("Enter key was pressed. Run your function.");
                // event.preventDefault();

                var form = event.target.form;
                if (form && event.target) {
                    var index = Array.prototype.indexOf.call(form, event.target);
                    if (form && form.elements[index + 1]) {
                        if ((event.target.getAttribute("class") || "").includes("barcode")) {
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
        //console.log("inside get SalesReturn");
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

                //console.log("Response sale:");
                //console.log(data);

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

                    /* console.log("selectedProducts:", selectedProducts);
                     setSelectedProducts([...selectedProducts]);
 
                     selectedProducts.forEach((product, index) => {
                         CalCulateLineTotals(index);
                     });*/

                    selectedProducts = order.products;
                    setSelectedProducts([...selectedProducts]);

                    const updatedProducts = order.products.map((product, index) => {
                        // Calculate line totals without calling setSelectedProducts inside the loop
                        const updatedProduct = { ...product };
                        updatedProduct.line_total = parseFloat(trimTo2Decimals((updatedProduct.unit_price - updatedProduct.unit_discount) * updatedProduct.quantity));
                        updatedProduct.line_total_with_vat = parseFloat(trimTo2Decimals((updatedProduct.unit_price_with_vat - updatedProduct.unit_discount_with_vat) * updatedProduct.quantity));
                        return updatedProduct;
                    });
                    setSelectedProducts(updatedProducts);

                    //formData = order;
                    //console.log("order.id:", order.id);
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
                    formData.customer_name = order.customer_name;
                    if (order.customer_id && order.customer_name) {
                        fetchAndSetCustomer(order.customer_id, {
                            id: order.customer_id,
                            name: order.customer_name,
                            search_label: order.customer_name,
                        });
                    }

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


                    setFormData({ ...formData });
                    reCalculate();
                    checkWarnings();
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
    useEffect(() => {
        if (Object.keys(errors).length === 0) return;
        const timer = setTimeout(() => setErrors({}), 5000);
        return () => clearTimeout(timer);
    }, [errors]);
    const _defaultBillSummaryOrder = ['total_without_vat', 'total_with_vat', 'shipping', 'discount_without_vat', 'discount_with_vat', 'taxable_amount', 'vat', 'net_before_rounding', 'rounding_amount', 'net_total'];
    const _billSummaryFieldLabels = { total_without_vat: 'Total(without VAT)', total_with_vat: 'Total(with VAT)', shipping: 'Shipping & Handling Fees', discount_without_vat: 'Sales Discount(without VAT)', discount_with_vat: 'Sales Discount(with VAT)', taxable_amount: 'Total Taxable Amount(without VAT)', vat: 'VAT', net_before_rounding: 'Net Total(with VAT) Before Rounding', rounding_amount: 'Rounding Amount', net_total: 'Net Total(with VAT)' };
    const [billSummaryVisible, setBillSummaryVisible] = useState(() => {
        try { const s = localStorage.getItem('bill_summary_visible_sr'); return s ? JSON.parse(s) : Object.fromEntries(_defaultBillSummaryOrder.map(k => [k, true])); } catch { return Object.fromEntries(_defaultBillSummaryOrder.map(k => [k, true])); }
    });
    const [billSummaryOrder, setBillSummaryOrder] = useState(() => {
        try { const s = localStorage.getItem('bill_summary_order_sr'); return s ? JSON.parse(s) : _defaultBillSummaryOrder; } catch { return _defaultBillSummaryOrder; }
    });
    const [showBillSummarySettings, setShowBillSummarySettings] = useState(false);
    const [openSummaryTooltip, setOpenSummaryTooltip] = useState(null);
    useEffect(() => {
        if (!openSummaryTooltip) return;
        const close = () => setOpenSummaryTooltip(null);
        const timer = setTimeout(() => document.addEventListener('click', close, { once: true }), 0);
        return () => { clearTimeout(timer); document.removeEventListener('click', close); };
    }, [openSummaryTooltip]);
    const updateBillSummaryVisible = (key, val) => {
        const next = { ...billSummaryVisible, [key]: val };
        setBillSummaryVisible(next);
        localStorage.setItem('bill_summary_visible_sr', JSON.stringify(next));
    };
    const reorderBillSummary = (from, to) => {
        if (from === to) return;
        const arr = [...billSummaryOrder];
        arr.splice(to, 0, arr.splice(from, 1)[0]);
        setBillSummaryOrder(arr);
        localStorage.setItem('bill_summary_order_sr', JSON.stringify(arr));
    };
    const billSummaryDragRef = useRef(null);
    const [isProcessing, setProcessing] = useState(false);

    //fields
    let [formData, setFormData] = useState({
        order_id: "",
        vat_percent: 15.0,
        discount: 0.0,
        date_str: format(new Date(), "MMM dd yyyy"),
        signature_date_str: format(new Date(), "MMM dd yyyy", { locale: dateLocale }),
        status: "received",
        payment_status: "",
        payment_method: "",
        price_type: "retail",
    });

    const isZatcaReported = isZatcaLocked || !!formData?.zatca?.reporting_passed;

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
            deliveryNoteHistory: "Ctrl + Shift + P",
            quotationHistory: "F2",
            quotationSalesHistory: "F3",
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
                openQuotationSalesHistory(product);
            } else if (event.key === "F2") {
                openQuotationHistory(product);
            } else if (isCmdOrCtrl && event.shiftKey && event.key.toLowerCase() === 'p') {
                openDeliveryNoteHistory(product);
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
                openQuotationHistory(product, "quotation");
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
        //console.log("inside get Product");
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
        if (isProcessing) {
            return;
        }

        let haveErrors = false;
        event.preventDefault();
        //console.log("Inside handle Create");
        //console.log("selectedProducts:", selectedProducts);
        //console.log("formData.order_id:", formData.order_id);

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
                errors["unit_price_" + i] = t("Max decimal points allowed is 8");
                setErrors({ ...errors });
                haveErrors = true;
            }

            let unitPriceWithVAT = parseFloat(selectedProducts[i].unit_price_with_vat);

            if (unitPriceWithVAT && /^\d*\.?\d{0,8}$/.test(unitPriceWithVAT) === false) {
                errors["unit_price_with_vat_" + i] = t("Max decimal points allowed is 8");
                setErrors({ ...errors });
                haveErrors = true;
            }


            let unitDiscount = 0.00;

            if (selectedProducts[i].unit_discount) {
                unitDiscount = parseFloat(selectedProducts[i].unit_discount)
                if (/^\d*\.?\d{0,8}$/.test(unitDiscount) === false) {
                    errors["unit_discount_" + i] = t("Max decimal points allowed is 8");
                    setErrors({ ...errors });
                    haveErrors = true;
                }
            }

            let unitDiscountWithVAT = 0.00;

            if (selectedProducts[i].unit_discount_with_vat) {
                unitDiscountWithVAT = parseFloat(selectedProducts[i].unit_discount_with_vat)
                if (/^\d*\.?\d{0,8}$/.test(unitDiscountWithVAT) === false) {
                    errors["unit_discount_with_vat_" + i] = t("Max decimal points allowed is 8");
                    setErrors({ ...errors });
                    haveErrors = true;
                }
            }

            let unitDiscountPercent = 0.00;

            if (selectedProducts[i].unit_discount_percent) {
                unitDiscountPercent = parseFloat(selectedProducts[i].unit_discount_percent)
                if (/^\d*\.?\d{0,8}$/.test(unitDiscountPercent) === false) {
                    errors["unit_discount_percent_" + i] = t("Max decimal points allowed is 8");
                    setErrors({ ...errors });
                    haveErrors = true;
                }
            }

            let unitDiscountPercentWithVAT = 0.00;

            if (selectedProducts[i].unit_discount_percent_with_vat) {
                unitDiscountPercentWithVAT = parseFloat(selectedProducts[i].unit_discount_percent_with_vat)
                if (/^\d*\.?\d{0,8}$/.test(unitDiscountPercent) === false) {
                    errors["unit_discount_percent_with_vat" + i] = t("Max decimal points allowed is 8");
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
        // console.log("formData.discount:", formData.discount);


        delete errors["products"];
        setErrors({ ...errors });

        if (selectedProductsCount === 0) {
            errors["products"] = t("No products selected");
            setErrors({ ...errors });
            haveErrors = true;
        }


        if (formData.products.length === 0) {
            errors["products"] = t("No products added");
            setErrors({ ...errors });
            haveErrors = true;
        }





        if (!formData.discount_percent && formData.discount_percent !== 0) {
            errors["discount_percent"] = t("Invalid discount percent");
            setErrors({ ...errors });
            haveErrors = true;
        }

        if (parseFloat(formData.discount_percent) > 100) {
            errors["discount_percent"] = t("Discount percent cannot be > 100");
            setErrors({ ...errors });
            haveErrors = true;
        }

        if (!validatePaymentAmounts()) {
            //console.log("Errors on payments")
            haveErrors = true;
        }

        if (!formData.shipping_handling_fees && formData.shipping_handling_fees !== 0) {
            errors["shipping_handling_fees"] = t("Invalid shipping / handling fees");
            setErrors({ ...errors });
            haveErrors = true;
        }

        if (/^\d*\.?\d{0,2}$/.test(parseFloat(formData.shipping_handling_fees)) === false) {
            errors["shipping_handling_fees"] = t("Max. decimal points allowed is 2");
            setErrors({ ...errors });
            haveErrors = true;
        }



        if (/^-?\d*\.?\d{0,2}$/.test(parseFloat(formData.rounding_amount)) === false) {
            errors["rounding_amount"] = t("Max. decimal points allowed is 2");
            setErrors({ ...errors });
            haveErrors = true;
        }


        if (!formData.discount && formData.discount !== 0) {
            errors["discount"] = t("Invalid discount");
            setErrors({ ...errors });
            haveErrors = true;
        }

        if (/^\d*\.?\d{0,2}$/.test(parseFloat(formData.discount)) === false) {
            errors["discount"] = t("Max. decimal points allowed is 2");
            setErrors({ ...errors });
            haveErrors = true;
        }


        if (haveErrors) {
            //console.log("Errors: ", errors);
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

        //console.log("formData:", formData);

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

                //console.log("Response:");
                //console.log(data);
                if (formData.id) {
                    if (props.showToastMessage) props.showToastMessage(t("Sales return updated successfully!"), "success");
                } else {
                    if (props.showToastMessage) props.showToastMessage(t("Sales return created successfully!"), "success");
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
                //console.log("Inside catch");
                console.log(error);
                setErrors({ ...error });
                //console.error("There was an error!", error);
                if (props.showToastMessage) props.showToastMessage(t("Failed to process sales return!"), "danger");
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

    const latestRequestRef = useRef(0);

    const isAllSelected = selectedProducts?.every((product) => product.selected);

    const renderTooltip = (props) => (
        <Tooltip id="label-tooltip" {...props}>
            {t("Total(without VAT) + Shipping & Handling Fees - Discount(without VAT)")}
            {"(" + trimTo2Decimals(formData.total) + " + " + trimTo2Decimals(shipping) + " - " + trimTo2Decimals(discount) + ") = " + trimTo2Decimals(formData.total + shipping - discount)}
        </Tooltip>
    );

    const renderNetTotalBeforeRoundingTooltip = (props) => (
        <Tooltip id="label-tooltip" {...props}>
            {t("Total Taxable Amount(without VAT) + VAT Price ( {{vatPercent}}% of Taxable Amount)", {
                vatPercent: formData.vat_percent,
            })}
            {"(" + trimTo2Decimals(formData.total + shipping - discount) + " + " + trimTo2Decimals(formData.vat_price) + ") = " + trimTo2Decimals(formData.net_total - roundingAmount)}
        </Tooltip>
    );

    const renderNetTotalTooltip = (props) => (
        <Tooltip id="label-tooltip" {...props}>
            {t("Total Taxable Amount(without VAT) + VAT Price ( {{vatPercent}}% of Taxable Amount)", {
                vatPercent: formData.vat_percent,
            })} {roundingAmount > 0 ? " + Rounding Amount" : " - Rounding Amount"}
            {"(" + trimTo2Decimals(formData.total + shipping - discount) + " + " + trimTo2Decimals(formData.vat_price) + `${roundingAmount > 0 ? " + " : " - "}` + trimTo2Decimals(roundingAmount) + " ) = " + trimTo2Decimals(formData.net_total)}
        </Tooltip>
    );
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

    async function reCalculate(productIndex) {
        const requestId = Date.now();
        latestRequestRef.current = requestId;

        //console.log("inside reCalculate");
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
            //console.log("unitPrice:", unitPrice);
            //console.log("selectedProducts[i].unit_price_with_vat:", selectedProducts[i].unit_price_with_vat);


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
            //console.log("Done")
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
                            //console.log("Discounts updated from server")
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
            // console.error("Failed to parse response:", err);
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
            errors["cash_discount"] = t("Cash discount should not be greater than or equal to {{max}}", { max: trimTo2Decimals(formData.net_total).toString() });
            setErrors({ ...errors });
            haveErrors = true
            return false;
        }

        if (formData.net_total && commission > 0 && commission >= formData.net_total) {
            errors["commission"] = t("Commission should not be greater than or equal to {{max}}", { max: trimTo2Decimals(formData.net_total).toString() });
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
                errors["payment_amount_" + key] = t("Payment amount is required");
                setErrors({ ...errors });
                haveErrors = true;
            } else if (formData.payments_input[key].amount === 0) {
                errors["payment_amount_" + key] = t("Amount should be greater than zero");
                setErrors({ ...errors });
                haveErrors = true;
            }

            if (!formData.payments_input[key].date_str) {
                errors["payment_date_" + key] = t("Payment date is required");
                setErrors({ ...errors });
                haveErrors = true;
            }/* else if ((new Date(formData.payments_input[key].date_str)) < (new Date(formData.date_str))) {
                errors["payment_date_" + key] = "Payment date time should be greater than or equal to order date time";
                setErrors({ ...errors });
                haveErrors = true;
            }*/

            if (!formData.payments_input[key].method) {
                errors["payment_method_" + key] = t("Payment method is required");
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
    function openQuotationHistory(model, type) {
        QuotationHistoryRef.current.open(model, selectedCustomers, type);
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

    let [showCustomerPending, setShowCustomerPending] = useState(false);
    const CustomerPendingRef = useRef();
    function openCustomerPending(customer) {
        setShowCustomerPending(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            CustomerPendingRef.current?.open(false, customer);
        }, 50);
    }



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
            const storeId = localStorage.getItem("store_id");
            const productIds = [...new Set(selectedProducts.map(p => p.product_id).filter(Boolean))];
            if (productIds.length === 0) return;

            const requestOptions = {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: localStorage.getItem("access_token"),
                },
            };

            const CHUNK = 100;
            const chunks = [];
            for (let i = 0; i < productIds.length; i += CHUNK) {
                chunks.push(productIds.slice(i, i + CHUNK));
            }

            const batchResults = await Promise.all(
                chunks.map(async (chunk) => {
                    const queryParams = ObjectToSearchQueryParams({ ids: chunk.join(","), store_id: storeId });
                    try {
                        const res = await fetch(`/v1/product?${queryParams}&limit=${chunk.length}`, requestOptions);
                        const isJson = res.headers.get("content-type")?.includes("application/json");
                        const data = isJson ? await res.json() : null;
                        if (res.ok && data?.result) return data.result;
                    } catch (e) {}
                    return [];
                })
            );

            const productMap = {};
            for (const batch of batchResults) {
                for (const p of batch) { productMap[p.id] = p; }
            }

            for (let i = 0; i < selectedProducts.length; i++) {
                const product = productMap[selectedProducts[i].product_id];
                if (!product || !product.product_stores || !product.product_stores[storeId]) continue;

                const storeData = product.product_stores[storeId];
                const stock = storeData.stock;
                selectedProducts[i].warehouse_stocks = storeData.warehouse_stocks || null;

                if (!selectedProducts[i].warehouse_stocks) {
                    selectedProducts[i].warehouse_stocks = { main_store: stock };
                    for (let j = 0; j < warehouseList.length; j++) {
                        selectedProducts[i].warehouse_stocks[warehouseList[j].code] = 0;
                    }
                }

                const warehouseCode = selectedProducts[i].warehouse_code || "main_store";
                selectedProducts[i].stock = selectedProducts[i].warehouse_stocks[warehouseCode] || 0;
            }

            setSelectedProducts([...selectedProducts]);
            setWarnings({ ...warnings });
        }
    }


    async function checkWarning(i, selectedProduct, skipUpdate) {
        let product = null;
        // if (selectedProduct) {
        // product = selectedProduct;
        //} else {
        product = await getProduct(selectedProducts[i].product_id, `id,product_stores.${localStorage.getItem("store_id")}.stock,product_stores.${localStorage.getItem("store_id")}.warehouse_stocks,store_id`);
        //}


        let stock = 0;

        if (!product) {
            return;
        }

        if (product.product_stores) {
            stock = product.product_stores[localStorage.getItem("store_id")].stock;
            selectedProducts[i].warehouse_stocks = product.product_stores[localStorage.getItem("store_id")]?.warehouse_stocks ? product.product_stores[localStorage.getItem("store_id")]?.warehouse_stocks : null;

            if (!selectedProducts[i].warehouse_stocks) {
                selectedProducts[i].warehouse_stocks = {};
                selectedProducts[i].warehouse_stocks["main_store"] = stock;

                for (var j = 0; j < warehouseList.length; j++) {
                    selectedProducts[i].warehouse_stocks[warehouseList[j].code] = 0;
                }
            }

            let selectedWarehouseCode = selectedProducts[i].warehouse_code ? selectedProducts[i].warehouse_code : "main_store";
            if (!selectedWarehouseCode) {
                selectedWarehouseCode = "main_store";
            }


            selectedProducts[i].stock = selectedProducts[i].warehouse_stocks[selectedWarehouseCode] ? selectedProducts[i].warehouse_stocks[selectedWarehouseCode] : 0;
            if (!skipUpdate) setSelectedProducts([...selectedProducts]);
        }

        /*
        if (!formData.id && selectedProducts[i].quantity > selectedProducts[i].stock) {
            warnings["quantity_" + i] = "Warning: Available stock is " + (selectedProducts[i].stock);
        } else {
            delete warnings["quantity_" + i];
        }*/

        if (!skipUpdate) setWarnings({ ...warnings });
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
            errors["quantity_" + i] = t("Quantity should be > 0");
        } else if (!selectedProducts[i].quantity) {
            errors["quantity_" + i] = t("Quantity is required");
        } else {
            delete errors["quantity_" + i];
        }


        if (selectedProducts[i].unit_price && selectedProducts[i].unit_price <= 0) {
            errors["unit_price_" + i] = t("Unit Price should be > 0");
        } else if (!selectedProducts[i].unit_price) {
            errors["unit_price_" + i] = t("Unit Price is required");
        } else {
            delete errors["unit_price_" + i];
        }


        if (store?.settings?.block_sale_when_purchase_price_is_higher) {
            if (selectedProducts[i].purchase_unit_price && selectedProducts[i].purchase_unit_price <= 0) {
                errors["purchase_unit_price_" + i] = t("Purchase Unit Price should be > 0");
            } else if (!selectedProducts[i].purchase_unit_price) {
                errors["purchase_unit_price_" + i] = t("Purchase Unit Price is required");
            } else {
                delete errors["purchase_unit_price_" + i];
            }
        }



        if (selectedProducts[i].purchase_unit_price > 0 && selectedProducts[i].unit_price > 0) {

            if (selectedProducts[i].purchase_unit_price > selectedProducts[i].unit_price) {
                errors["purchase_unit_price_" + i] = t("Purchase Unit Price should not be greater than Unit Price(without VAT)")
                errors["unit_price_" + i] = t("Unit price should not be less than Purchase Unit Price(without VAT)")
            } else {
                delete errors["purchase_unit_price_" + i];
                delete errors["unit_price_" + i];
            }
        }

        setErrors({ ...errors });
    }



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
    // ── Table Settings state ──
    const [showSPTableSettings, setShowSPTableSettings] = useState(false);
    const defaultSPColumns = useMemo(() => [
        { key: 'select', label: 'Select', visible: true },
        { key: 'si_no', label: 'SI No.', visible: true },
        { key: 'part_number', label: 'Part No.', visible: true },
        { key: 'name', label: 'Name', visible: true },
        { key: 'info', label: 'Info', visible: true },
        { key: 'purchase_unit_price', label: 'Purchase Unit Price(w/o VAT)', visible: true },
        { key: 'stock', label: 'Stock', visible: true },
        { key: 'qty', label: 'Qty', visible: true },
        { key: 'warehouse', label: 'Add Stock To', visible: true },
        { key: 'unit_price', label: 'Unit Price(w/o VAT)', visible: true },
        { key: 'unit_price_with_vat', label: 'Unit Price(with VAT)', visible: true },
        { key: 'unit_discount', label: 'Unit Disc.(w/o VAT)', visible: true },
        { key: 'unit_discount_with_vat', label: 'Unit Disc.(with VAT)', visible: true },
        { key: 'unit_discount_percent', label: 'Unit Disc. %(with VAT)', visible: true },
        { key: 'price', label: 'Price(w/o VAT)', visible: true },
        { key: 'price_with_vat', label: 'Price(with VAT)', visible: true },
    ], []);
    const [spColumns, setSPColumns] = useState(defaultSPColumns);


    const handleToggleSPColumn = (i) => {
        const updated = spColumns.map((c, idx) => idx === i ? { ...c, visible: !c.visible } : c);
        setSPColumns(updated);
        localStorage.setItem('sales_return_sp_table_settings', JSON.stringify(updated));
    };
    const onDragEndSP = (result) => {
        if (!result.destination) return;
        const items = Array.from(spColumns);
        const [moved] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, moved);
        setSPColumns(items);
        localStorage.setItem('sales_return_sp_table_settings', JSON.stringify(items));
    };
    function restoreDefaultSPSettings() {
        setSPColumns(defaultSPColumns);
        localStorage.removeItem('sales_return_sp_table_settings');
    }
    useEffect(() => {
        const saved = localStorage.getItem('sales_return_sp_table_settings');
        if (saved) {
            const savedCols = JSON.parse(saved);
            const savedKeys = new Set(savedCols.map(c => c.key));
            const merged = [
                ...savedCols,
                ...defaultSPColumns.filter(c => !savedKeys.has(c.key)),
            ];
            setSPColumns(merged);
        }
    }, [defaultSPColumns]);
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
        if (show) {
            loadWarehouses();
        }

    }, [loadWarehouses, show]);

    return (
        <>
            {showCustomerPending && <CustomerPending ref={CustomerPendingRef} />}
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


            {srFormType === "type2" && (
            <Modal show={show} size="xl" fullscreen onHide={handleClose} animation={false} backdrop="static" scrollable={true} id="sales_return_create_form">
                <Modal.Header style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #c3c6d7', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                    <div className="sc-header-title" style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flexShrink: 1 }}>
                        <h1 style={{ margin: 0, fontSize: '20px', lineHeight: '28px', fontWeight: 700, letterSpacing: '-0.01em', fontFamily: "'Hanken Grotesk', sans-serif", color: '#191c1e', whiteSpace: 'nowrap' }}>
                            {formData.id ? t("Update Sales Return") + " #" + formData.code : t("Create Sales Return")}
                        </h1>
                        {formData.order_code && (
                            <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: 400, whiteSpace: 'nowrap' }}>
                                {t("for")} <span style={{ cursor: 'pointer', color: '#004ac6', fontWeight: 600, textDecoration: 'underline dotted' }} onClick={() => openReferenceUpdateForm(formData.order_id, "sales")}>#{formData.order_code}</span>
                            </span>
                        )}
                        {store.zatca?.phase === "2" && store.zatca?.connected && !formData.id && (
                            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#434655', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap', marginLeft: '8px' }}>
                                <input type="checkbox" className="form-check-input m-0" id="sales_return_report_to_zatca" name="sales_return_report_to_zatca" checked={formData.enable_report_to_zatca} onChange={(e) => { formData.enable_report_to_zatca = !formData.enable_report_to_zatca; setFormData({ ...formData }); }} style={{ width: '14px', height: '14px' }} />
                                {t("Report to Zatca")}
                            </label>
                        )}
                    </div>
                    <div className="sc-header-actions">
                        <button type="button" onClick={openPreview}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #c3c6d7', backgroundColor: '#f7f9fb', color: '#434655', padding: '6px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}>
                            <i className="bi bi-printer" style={{ fontSize: '13px' }}></i> {t('Print')}
                        </button>
                        {selectedProducts && selectedProducts.length > 0 && (
                            <button type="button" onClick={handleCreate}
                                style={{ display: 'flex', alignItems: 'center', gap: '4px', border: 'none', backgroundColor: '#004ac6', color: '#ffffff', padding: '6px 14px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', minWidth: '80px', justifyContent: 'center' }}>
                                {isProcessing ? <Spinner as="span" animation="border" size="sm" role="status" aria-hidden={true} /> : (formData.id ? t("Update") : t("Create"))}
                            </button>
                        )}
                        <button type="button" onClick={handleClose}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #c3c6d7', backgroundColor: '#f7f9fb', color: '#434655', padding: '6px 9px', borderRadius: '4px', fontSize: '13px', cursor: 'pointer' }}>
                            <i className="bi bi-x-lg" />
                        </button>
                    </div>
                </Modal.Header>
                <Modal.Body style={{ overflowY: 'auto' }}>
                    {errors && Object.keys(errors).some(k => { const m = Array.isArray(errors[k]) ? errors[k][0] : errors[k]; return !!m; }) && (
                        <div className="sc-error-banner" style={{
                            maxHeight: "120px", overflowY: "auto", padding: "8px 12px",
                            backgroundColor: "#fff0f0", borderLeft: "1px solid #f5c6cb",
                            borderBottom: "1px solid #f5c6cb",
                            boxShadow: "-2px 2px 8px rgba(186,26,26,0.12)",
                            position: "fixed", top: "56px", right: 0, width: "380px", zIndex: 9999,
                        }}>
                            <ul style={{ marginBottom: 0, paddingLeft: 16 }}>
                                {Object.keys(errors).map((key, index) => {
                                    const message = Array.isArray(errors[key]) ? errors[key][0] : errors[key];
                                    return message ? (
                                        <li key={index} style={{ color: "#dc2626", fontSize: '12px' }}>{t(message)}</li>
                                    ) : null;
                                })}
                            </ul>
                        </div>
                    )}
                    <section style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '8px' }}>
                        <div className="sc-header-flex" style={{ borderBottom: '1px solid #c3c6d7' }}>
                            {/* Left: date, phone, vat, remarks, address */}
                            <div className="sc-header-left" style={{ padding: '4px 10px', display: 'flex', gap: '6px', alignItems: 'stretch', backgroundColor: '#f2f4f6', borderRight: '1px solid #c3c6d7' }}>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {/* Row 1: Date + Phone + WhatsApp */}
                                    <div className="sc-sub-row" style={{ alignItems: 'center' }}>
                                        <div className="sc-date-input" style={{ flexShrink: 0 }}>
                                            <DatePicker
                                                id="date_str"
                                                selected={formData.date_str ? new Date(formData.date_str) : null}
                                                value={formData.date_str ? format(new Date(formData.date_str), "MMMM d, yyyy h:mm aa", { locale: dateLocale }) : null}
                                                className={`form-control form-control-lg${errors.date_str ? ' is-invalid' : ''}`}
                                                dateFormat="MMMM d, yyyy h:mm aa"
                                                locale={dateLocale}
                                                showTimeSelect
                                                timeIntervals="1"
                                                popperProps={{ strategy: 'fixed' }}
                                                onChange={(value) => { formData.date_str = value; setFormData({ ...formData }); }}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                                            <input
                                                id="sales_return_phone" name="sales_return_phone"
                                                value={formData.phone || ''}
                                                type="text"
                                                onChange={(e) => { delete errors["phone"]; setErrors({ ...errors }); formData.phone = e.target.value; setFormData({ ...formData }); }}
                                                className={`form-control form-control-lg${errors["phone"] ? ' is-invalid' : ''}`}
                                                placeholder={t('Phone')}
                                                style={{ width: '154px' }}
                                            />
                                            <button type="button" onClick={sendWhatsAppMessage}
                                                style={{ background: '#25d366', border: 'none', borderRadius: '4px', padding: '7px 8px', cursor: 'pointer', color: '#fff', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="white" viewBox="0 0 16 16">
                                                    <path d="M13.601 2.326A7.875 7.875 0 0 0 8.036 0C3.596 0 0 3.597 0 8.036c0 1.417.37 2.805 1.07 4.03L0 16l3.993-1.05a7.968 7.968 0 0 0 4.043 1.085h.003c4.44 0 8.036-3.596 8.036-8.036 0-2.147-.836-4.166-2.37-5.673ZM8.036 14.6a6.584 6.584 0 0 1-3.35-.92l-.24-.142-2.37.622.63-2.31-.155-.238a6.587 6.587 0 0 1-1.018-3.513c0-3.637 2.96-6.6 6.6-6.6 1.764 0 3.42.69 4.67 1.94a6.56 6.56 0 0 1 1.93 4.668c0 3.637-2.96 6.6-6.6 6.6Zm3.61-4.885c-.198-.1-1.17-.578-1.352-.644-.18-.066-.312-.1-.444.1-.13.197-.51.644-.626.775-.115.13-.23.15-.428.05-.198-.1-.837-.308-1.594-.983-.59-.525-.99-1.174-1.11-1.372-.116-.198-.012-.305.088-.403.09-.09.198-.23.298-.345.1-.115.132-.197.2-.33.065-.13.032-.247-.017-.345-.05-.1-.444-1.07-.61-1.46-.16-.384-.323-.332-.444-.338l-.378-.007c-.13 0-.344.048-.525.23s-.688.672-.688 1.64c0 .967.704 1.9.802 2.03.1.13 1.386 2.116 3.365 2.963.47.203.837.324 1.122.414.472.15.902.13 1.24.08.378-.057 1.17-.48 1.336-.942.165-.462.165-.858.116-.943-.048-.084-.18-.132-.378-.23Z" />
                                                </svg>
                                            </button>
                                        </div>
                                        <input
                                            id="sales_vat_no" name="sales_vat_no"
                                            value={formData.vat_no || ''}
                                            type="text"
                                            onChange={(e) => { delete errors["vat_no"]; setErrors({ ...errors }); formData.vat_no = e.target.value; setFormData({ ...formData }); }}
                                            className={`form-control form-control-lg${errors["vat_no"] ? ' is-invalid' : ''}`}
                                            placeholder={t('VAT NO.')}
                                            style={{ width: '180px', flexShrink: 0 }}
                                        />
                                    </div>
                                    {/* Row 2: Remarks + Address */}
                                    <div className="sc-sub-row" style={{ alignItems: 'flex-end' }}>
                                        <textarea
                                            value={formData.remarks || ''}
                                            onChange={(e) => { formData.remarks = e.target.value; setFormData({ ...formData }); }}
                                            onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); } }}
                                            className="form-control"
                                            id="remarks"
                                            placeholder={t('Remarks')}
                                            style={{ resize: 'none', fontSize: '13px', height: '38px', flex: '1 1 0', minWidth: 0 }}
                                        />
                                        <textarea
                                            value={formData.address || ''}
                                            onChange={(e) => { delete errors["address"]; setErrors({ ...errors }); formData.address = e.target.value; setFormData({ ...formData }); }}
                                            onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); } }}
                                            className={`form-control${errors["address"] ? ' is-invalid' : ''}`}
                                            id="address"
                                            placeholder={t('Address')}
                                            style={{ resize: 'none', fontSize: '13px', height: '38px', flex: '1 1 0', minWidth: 0 }}
                                        />
                                    </div>
                                </div>
                            </div>
                            {/* Right: Customer info */}
                            {selectedCustomers.length > 0 && formData.customer_id ? (() => {
                                const c = selectedCustomers[0];
                                const storeId = localStorage.getItem("store_id");
                                const cs = c?.stores?.[storeId];
                                const sep = <span style={{ width: '1px', height: '12px', background: '#c3c6d7', flexShrink: 0 }} />;
                                const phone = c.phone || formData.phone;
                                const phone2 = c.phone2;
                                const vatNo = c.vat_no || formData.vat_no;
                                return (
                                    <div className="sc-header-right" style={{ padding: '4px 14px', background: 'rgba(0,74,198,0.03)', borderLeft: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px', overflow: 'hidden', minHeight: '40px' }}>
                                        {c.code && <span style={{ background: '#dbeafe', color: '#1e40af', borderRadius: '4px', padding: '1px 7px', fontSize: '12px', fontWeight: 700, letterSpacing: '0.03em', flexShrink: 0 }}>{c.code}</span>}
                                        <span style={{ fontWeight: 700, fontSize: '15px', color: '#191c1e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, maxWidth: '280px' }}>{c.name}</span>
                                        {c.name_in_arabic && <><span style={{ color: '#c3c6d7', fontSize: '13px', flexShrink: 0 }}>|</span><span style={{ fontSize: '13px', color: '#64748b', fontFamily: 'Arial, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, maxWidth: '200px' }}>{c.name_in_arabic}</span></>}
                                        {(phone || phone2 || vatNo) && sep}
                                        {phone && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#374151', flexShrink: 0 }}><i className="bi bi-telephone" style={{ color: '#6b7280', fontSize: '12px' }} />{phone}</span>}
                                        {phone && phone2 && sep}
                                        {phone2 && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#374151', flexShrink: 0 }}><i className="bi bi-telephone" style={{ color: '#6b7280', fontSize: '12px' }} />{phone2}</span>}
                                        {(phone || phone2) && vatNo && sep}
                                        {vatNo && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#374151', flexShrink: 0 }}><i className="bi bi-receipt" style={{ color: '#6b7280', fontSize: '12px' }} /><span style={{ color: '#6b7280' }}>VAT:</span>{vatNo}</span>}
                                        {sep}
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', cursor: 'pointer', userSelect: 'none', flexShrink: 0 }}
                                            onClick={() => openCustomerPending(selectedCustomers[0])}
                                            title={t("Click to view pendings")}>
                                            <i className="bi bi-wallet2" style={{ color: '#004ac6', fontSize: '13px' }} />
                                            <span style={{ color: '#6b7280' }}>{t("Cr.Balance")}:</span>
                                            <strong style={{ fontSize: '17px', fontWeight: 700, color: (c.credit_balance ?? cs?.credit_balance ?? 0) > 0 ? '#dc2626' : '#16a34a', textDecoration: 'underline dotted' }}><Amount amount={trimTo2Decimals(c.credit_balance ?? cs?.credit_balance ?? 0)} /></strong>
                                            <i className="bi bi-box-arrow-up-right" style={{ color: '#004ac6', fontSize: '10px' }} />
                                        </span>
                                        {(c.credit_limit > 0) && <>{sep}<span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', flexShrink: 0 }}>
                                            <i className="bi bi-shield-check" style={{ color: '#6b7280', fontSize: '13px' }} />
                                            <span style={{ color: '#6b7280' }}>{t("Limit")}:</span>
                                            <strong style={{ fontSize: '15px', fontWeight: 700, color: '#374151' }}><Amount amount={trimTo2Decimals(c.credit_limit)} /></strong>
                                        </span></>}
                                    </div>
                                );
                            })() : <div className="sc-header-right" />}
                        </div>
                    </section>

                    {selectedProducts && selectedProducts.length === 0 && "Already returned all products"}
                    {selectedProducts && selectedProducts.length > 0 && <form className="needs-validation" onSubmit={handleCreate}>
                        <div className="table-responsive" style={{ overflowX: "auto", overflowY: "scroll" }}>
                            <table className="table table-striped table-sm table-bordered">
                                <tbody>
                                    <tr className="text-center" style={{ borderBottom: "solid 2px" }}>
                                        {spColumns.filter(c => c.visible).map(col => {
                                            if (col.key === 'select') return <th key={col.key}>{t("Select All")} <br /><input type="checkbox" className="form-check-input" checked={isAllSelected} onChange={handleSelectAll} /></th>;
                                            if (col.key === 'si_no') return <th key={col.key}>{t('SI No.')}</th>;
                                            if (col.key === 'part_number') return <th key={col.key}>{t('Part No.')}</th>;
                                            if (col.key === 'name') return <th key={col.key} style={{ minWidth: "250px" }}>{t('Name')}</th>;
                                            if (col.key === 'info') return <th key={col.key}>{t('Info')}</th>;
                                            if (col.key === 'purchase_unit_price') return <th key={col.key}>{t('Purchase Unit Price(without VAT)')}</th>;
                                            if (col.key === 'stock') return <th key={col.key}>{t('Stock')}</th>;
                                            if (col.key === 'qty') return <th key={col.key}>{t('Qty')}</th>;
                                            if (col.key === 'warehouse') return store.settings?.enable_warehouse_module ? <th key={col.key}>{t('Add Stock To')}</th> : null;
                                            if (col.key === 'unit_price') return <th key={col.key}>{t('Unit Price(without VAT)')}</th>;
                                            if (col.key === 'unit_price_with_vat') return <th key={col.key}>{t('Unit Price(with VAT)')}</th>;
                                            if (col.key === 'unit_discount') return <th key={col.key}>{t('Unit Disc.(without VAT)')}</th>;
                                            if (col.key === 'unit_discount_with_vat') return <th key={col.key}>{t('Unit Disc.(with VAT)')}</th>;
                                            if (col.key === 'unit_discount_percent') return <th key={col.key}>{t('Unit Disc. %(with VAT)')}</th>;
                                            if (col.key === 'price') return <th key={col.key}>{t('Price(without VAT)')}</th>;
                                            if (col.key === 'price_with_vat') return <th key={col.key}>{t('Price(with VAT)')}</th>;
                                            return null;
                                        })}
                                    </tr>
                                    {selectedProducts.map((product, index) => {
                                        const duplicateIndexes = selectedProducts
                                            .map((p, i) => p.product_id === product.product_id ? i : -1)
                                            .filter(i => i !== -1);
                                        const duplicateCount = duplicateIndexes.length;
                                        return (
                                            <tr key={index} className="text-center">
                                                {spColumns.filter(c => c.visible).map(col => {
                                                    if (col.key === 'select') return (
                                                        <td key="select" style={{ verticalAlign: 'middle', padding: '0.25rem', width: "20px", whiteSpace: "nowrap" }}>
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
                                                        </td>);
                                                    if (col.key === 'si_no') return (<td key="si_no" style={{ verticalAlign: 'middle', padding: '0.25rem', width: "auto", whiteSpace: "nowrap" }}>{index + 1}</td>);
                                                    // eslint-disable-next-line no-lone-blocks
                                                    {/*<td style={{ verticalAlign: 'middle', padding: '4px 8px', width: "auto", whiteSpace: "nowrap" }}>
                                                <OverflowTooltip maxWidth={120} value={product.prefix_part_number ? product.prefix_part_number + " - " + product.part_number : product.part_number} />
                                            </td>*/}
                                                    if (col.key === 'part_number') return (<td key="part_number" style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                                        <input type="text" id={`${"sales_return_product_part_number" + index}`}
                                                            name={`${"sales_return_product_part_number" + index}`}
                                                            onWheel={(e) => e.target.blur()}
                                                            value={product.part_number}
                                                            className={`form-control text-start ${errors["part_number_" + index] ? 'is-invalid' : ''} ${warnings["part_number_" + index] ? 'border-warning text-warning' : ''}`}
                                                            onKeyDown={(e) => {
                                                                RunKeyActions(e, product);
                                                            }}
                                                            placeholder={t("Part No.")} onChange={(e) => {
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
                                                            <OverlayTrigger placement="top" overlay={<Tooltip>{errors[`part_number_${index}`] || warnings[`part_number_${index}`]}</Tooltip>}>
                                                                <i className={`bi bi-exclamation-circle-fill ${errors[`part_number_${index}`] ? 'text-danger' : 'text-warning'} ms-2`} style={{ fontSize: '0.85rem', cursor: 'help' }}></i>
                                                            </OverlayTrigger>
                                                        )}
                                                        </div>
                                                    </td>);
                                                    if (col.key === 'name') return (<td key="name" style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                        <div className="input-group" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
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
                                                                        selectedProducts[index].name = "";
                                                                        setSelectedProducts([...selectedProducts]);
                                                                        console.log("errors:", errors);
                                                                        return;
                                                                    }

                                                                    selectedProducts[index].name = e.target.value;
                                                                    setSelectedProducts([...selectedProducts]);
                                                                }} />

                                                            <div style={{ display: 'flex', alignItems: 'center', marginLeft: '8px', position: 'relative' }}>
                                                                <div
                                                                    style={{ color: "blue", cursor: "pointer", marginLeft: "2px" }}
                                                                    onClick={() => {
                                                                        openUpdateProductForm(product.product_id);
                                                                    }}
                                                                >
                                                                    <i className="bi bi-pencil"> </i>
                                                                </div>

                                                                <div
                                                                    style={{ color: "blue", cursor: "pointer", marginLeft: "8px" }}
                                                                    onClick={() => {
                                                                        openProductDetails(product.product_id);
                                                                    }}
                                                                >
                                                                    <i className="bi bi-eye"> </i>
                                                                </div>

                                                                {duplicateCount > 1 && (
                                                                    <OverlayTrigger
                                                                        placement="top"
                                                                        overlay={
                                                                            <Tooltip id={`duplicate-tooltip-input-${index}`}>
                                                                                {`${duplicateCount - 1} Duplicate${(duplicateCount - 1) > 1 ? 's' : ''}`}
                                                                            </Tooltip>
                                                                        }
                                                                    >
                                                                        <span style={{
                                                                            position: 'absolute',
                                                                            top: '50%',
                                                                            right: '48px',
                                                                            transform: 'translateY(-50%)',
                                                                            display: 'inline-flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            width: '22px',
                                                                            height: '22px',
                                                                            borderRadius: '50%',
                                                                            background: '#ffc107',
                                                                            color: '#212529',
                                                                            fontWeight: 'bold',
                                                                            fontSize: '0.7rem',
                                                                            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                                                                            cursor: 'pointer',
                                                                            border: '2px solid #fff',
                                                                            zIndex: 2
                                                                        }}>
                                                                            {duplicateCount - 1}
                                                                        </span>
                                                                    </OverlayTrigger>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {(errors[`name_${index}`] || warnings[`name_${index}`]) && (
                                                            <OverlayTrigger placement="top" overlay={<Tooltip>{errors[`name_${index}`] || warnings[`name_${index}`] || ''}</Tooltip>}>
                                                                <i
                                                                    className={`bi bi-exclamation-circle-fill ${errors[`name_${index}`] ? 'text-danger' : 'text-warning'} ms-2`}
                                                                    style={{ fontSize: '1rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                                                ></i>
                                                            </OverlayTrigger>
                                                        )}
                                                    </td>);
                                                    if (col.key === 'info') return (<td key="info" style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                        <Dropdown drop="top">
                                                            <Dropdown.Toggle variant="secondary" id="dropdown-secondary" style={{}}>
                                                                <i className="bi bi-info"></i>
                                                            </Dropdown.Toggle>
                                                            <Dropdown.Menu style={{ zIndex: 9999, position: "absolute" }} popperConfig={{ modifiers: [{ name: 'preventOverflow', options: { boundary: 'viewport' } }] }}>
                                                            </Dropdown.Menu>
                                                        </Dropdown>
                                                    </td>);
                                                    if (col.key === 'purchase_unit_price') return (<td key="purchase_unit_price" style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                        <div className="input-group">
                                                            <input
                                                                type="number"
                                                                id={`sales_return_product_purchase_unit_price_${index}`}
                                                                name={`sales_return_product_purchase_unit_price_${index}`}
                                                                className={`form-control text-end ${errors["purchase_unit_price_" + index] ? 'is-invalid' : ''} ${warnings["purchase_unit_price_" + index] ? 'border-warning text-warning' : ''}`}
                                                                onWheel={(e) => e.target.blur()}
                                                                value={product.purchase_unit_price}
                                                                placeholder={t("Purchase Unit Price")}
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
                                                                <OverlayTrigger placement="top" overlay={<Tooltip>{errors[`purchase_unit_price_${index}`] || warnings[`purchase_unit_price_${index}`] || ''}</Tooltip>}>
                                                                    <i
                                                                        className={`bi bi-exclamation-circle-fill ${errors[`purchase_unit_price_${index}`] ? 'text-danger' : 'text-warning'} ms-2`}
                                                                        style={{ fontSize: '1rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                                                    ></i>
                                                                </OverlayTrigger>
                                                            )}
                                                        </div>
                                                    </td>);
                                                    if (col.key === 'stock') return (<td key="stock"
                                                        style={{
                                                            verticalAlign: 'middle',
                                                            padding: '4px 8px',
                                                            whiteSpace: 'nowrap',
                                                            width: 'auto',
                                                            position: 'relative',
                                                        }}
                                                    >
                                                        <OverlayTrigger
                                                            placement="top"
                                                            overlay={
                                                                <Tooltip id={`stock-tooltip-${index}`}>
                                                                    {(() => {
                                                                        const warehouseStocks = selectedProducts[index].warehouse_stocks || {};
                                                                        const orderedEntries = [];
                                                                        if (warehouseStocks.hasOwnProperty("main_store")) {
                                                                            orderedEntries.push(["main_store", warehouseStocks["main_store"]]);
                                                                        }
                                                                        Object.entries(warehouseStocks).forEach(([key, value]) => {
                                                                            if (key !== "main_store") {
                                                                                orderedEntries.push([key, value]);
                                                                            }
                                                                        });
                                                                        const details = orderedEntries
                                                                            .map(([key, value]) => {
                                                                                let name = key === "main_store" ? t("Main Store") : key.replace(/^wh/, "WH").toUpperCase();
                                                                                return `${name}: ${value}`;
                                                                            })
                                                                            .join(", ");
                                                                        return details ? `(${details})` : "(" + t("Main Store") + ": " + selectedProducts[index].stock + ")";
                                                                    })()}
                                                                </Tooltip>
                                                            }
                                                        >
                                                            <span style={{ cursor: "pointer", textDecoration: "underline dotted" }}>
                                                                {selectedProducts[index].stock}
                                                            </span>
                                                        </OverlayTrigger>
                                                    </td>);
                                                    if (col.key === 'qty') return (<td key="qty" style={{
                                                        verticalAlign: 'middle',
                                                        padding: '4px 8px',
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
                                                                    disabled={isZatcaReported}
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
                                                                <OverlayTrigger placement="top" overlay={<Tooltip>{errors[`quantity_${index}`] || warnings[`quantity_${index}`] || ''}</Tooltip>}>
                                                                    <i
                                                                        className={`bi bi-exclamation-circle-fill ${errors[`quantity_${index}`] ? 'text-danger' : 'text-warning'} ms-2`}
                                                                        style={{ fontSize: '1rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                                                    ></i>
                                                                </OverlayTrigger>
                                                            )}
                                                        </div>
                                                    </td>);
                                                    if (col.key === 'warehouse') return store.settings?.enable_warehouse_module ? (<td key="warehouse" style={{
                                                        verticalAlign: 'middle',
                                                        padding: '4px 8px',
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
                                                                checkWarning(index, selectedProducts[index]);
                                                            }}
                                                        >
                                                            <option value="main_store">{t("Main Store")}</option>
                                                            {warehouseList.map((warehouse) => (
                                                                <option key={warehouse.id} value={warehouse.id}>
                                                                    {warehouse.name} ({warehouse.code})
                                                                </option>
                                                            ))}
                                                        </select>
                                                        {errors[`warehouse_${index}`] && (
                                                            <div style={{ color: "red" }}>
                                                                {t(errors[`warehouse_${index}`])}
                                                            </div>
                                                        )}
                                                    </td>) : null;
                                                    if (col.key === 'unit_price') return (<td key="unit_price" style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                        <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                                                            <div className="input-group flex-nowrap" style={{ flex: '1 1 auto', minWidth: 0 }}>
                                                                <input type="number"
                                                                    id={`${"sales_return_product_unit_price_" + index}`}
                                                                    name={`${"sales_return_product_unit_price_" + index}`}
                                                                    onWheel={(e) => e.target.blur()}
                                                                    disabled={isZatcaReported}
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
                                                                            errors["unit_price_" + index] = t("Max decimal points allowed is 8");
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
                                                                <OverlayTrigger placement="top" overlay={<Tooltip>{errors[`unit_price_${index}`] || warnings[`unit_price_${index}`] || ''}</Tooltip>}>
                                                                    <i
                                                                        className={`bi bi-exclamation-circle-fill ${errors[`unit_price_${index}`] ? 'text-danger' : 'text-warning'} ms-2`}
                                                                        style={{ fontSize: '1rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                                                    ></i>
                                                                </OverlayTrigger>
                                                            )}
                                                        </div>
                                                    </td>);
                                                    if (col.key === 'unit_price_with_vat') return (<td key="unit_price_with_vat" style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                        <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                                                            <div className="input-group flex-nowrap" style={{ flex: '1 1 auto', minWidth: 0 }}>
                                                                <input type="number"
                                                                    id={`${"sales_return_product_unit_price_with_vat_" + index}`}
                                                                    name={`${"sales_return_product_unit_price_with_vat_" + index}`}
                                                                    onWheel={(e) => e.target.blur()}
                                                                    disabled={isZatcaReported}
                                                                    value={selectedProducts[index].unit_price_with_vat}
                                                                    className={`form-control text-end ${errors["unit_price_with_vat_" + index] ? 'is-invalid' : ''} ${warnings["unit_price_with_vat_" + index] ? 'border-warning text-warning' : ''}`}
                                                                    ref={(el) => {
                                                                        if (!inputRefs.current[index]) inputRefs.current[index] = {};
                                                                        inputRefs.current[index][`${"sales_return_product_unit_price_with_vat_" + index}`] = el;
                                                                    }}
                                                                    placeholder={t("Unit Price(with VAT)")}

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
                                                                            errors["unit_price_with_vat_" + index] = t("Unit Price should be > 0");
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
                                                                            errors["unit_price_with_vat_" + index] = t("Max decimal points allowed is 8");
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
                                                                <OverlayTrigger placement="top" overlay={<Tooltip>{errors[`unit_price_with_vat_${index}`] || warnings[`unit_price_with_vat_${index}`] || ''}</Tooltip>}>
                                                                    <i
                                                                        className={`bi bi-exclamation-circle-fill ${errors[`unit_price_with_vat_${index}`] ? 'text-danger' : 'text-warning'} ms-2`}
                                                                        style={{ fontSize: '1rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                                                    ></i>
                                                                </OverlayTrigger>
                                                            )}
                                                        </div>
                                                    </td>);
                                                    if (col.key === 'unit_discount') return (<td key="unit_discount" style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                        <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                                                            <div className="input-group flex-nowrap" style={{ flex: '1 1 auto', minWidth: 0 }}>
                                                                <input type="number"
                                                                    id={`${"sales_return_unit_discount_" + index}`}
                                                                    name={`${"sales_return_unit_discount_" + index}`}
                                                                    onWheel={(e) => e.target.blur()}
                                                                    disabled={isZatcaReported}
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
                                                                            errors["unit_discount_" + index] = t("Unit discount should be >= 0");
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
                                                                            errors["unit_discount_" + index] = t("Max decimal points allowed is 8");
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
                                                                <OverlayTrigger placement="top" overlay={<Tooltip>{errors[`unit_discount_${index}`] || warnings[`unit_discount_${index}`] || ''}</Tooltip>}>
                                                                    <i
                                                                        className={`bi bi-exclamation-circle-fill ${errors[`unit_discount_${index}`] ? 'text-danger' : 'text-warning'} ms-2`}
                                                                        style={{ fontSize: '1rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                                                    ></i>
                                                                </OverlayTrigger>
                                                            )}
                                                        </div>
                                                    </td>);
                                                    if (col.key === 'unit_discount_with_vat') return (<td key="unit_discount_with_vat" style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                        <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                                                            <div className="input-group flex-nowrap" style={{ flex: '1 1 auto', minWidth: 0 }}>
                                                                <input type="number"
                                                                    id={`${"sales_return_unit_discount_with_vat_" + index}`}
                                                                    name={`${"sales_return_unit_discount_with_vat_" + index}`}
                                                                    onWheel={(e) => e.target.blur()}
                                                                    disabled={isZatcaReported}
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
                                                                            errors["unit_discount_with_vat_" + index] = t("Max decimal points allowed is 8");
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
                                                                <OverlayTrigger placement="top" overlay={<Tooltip>{errors[`unit_discount_with_vat_${index}`] || warnings[`unit_discount_with_vat_${index}`] || ''}</Tooltip>}>
                                                                    <i
                                                                        className={`bi bi-exclamation-circle-fill ${errors[`unit_discount_with_vat_${index}`] ? 'text-danger' : 'text-warning'} ms-2`}
                                                                        style={{ fontSize: '1rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                                                    ></i>
                                                                </OverlayTrigger>
                                                            )}
                                                        </div>
                                                    </td>);
                                                    // eslint-disable-next-line no-lone-blocks
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
                                                    if (col.key === 'unit_discount_percent') return (<td key="unit_discount_percent" style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                        <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                                                            <div className="input-group flex-nowrap" style={{ flex: '1 1 auto', minWidth: 0 }}>
                                                                <input type="number"
                                                                    id={`${"sales_return_unit_discount_percent_with_vat_" + index}`}
                                                                    disabled={false}
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
                                                                            errors["unit_discount_percent_" + index] = t("Unit discount % should be greater than or equal to 0");
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
                                                                <OverlayTrigger placement="top" overlay={<Tooltip>{errors[`unit_discount_percent_with_vat_${index}`] || warnings[`unit_discount_percent_with_vat_${index}`] || ''}</Tooltip>}>
                                                                    <i
                                                                        className={`bi bi-exclamation-circle-fill ${errors[`unit_discount_percent_with_vat_${index}`] ? 'text-danger' : 'text-warning'} ms-2`}
                                                                        style={{ fontSize: '1rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                                                    ></i>
                                                                </OverlayTrigger>
                                                            )}
                                                        </div>
                                                    </td>);
                                                    if (col.key === 'price') return (<td key="price" style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                        <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                                                            <div className="input-group flex-nowrap" style={{ flex: '1 1 auto', minWidth: 0 }}>
                                                                <input type="number"
                                                                    id={`${"sales_product_line_total_" + index}`}
                                                                    name={`${"sales_product_line_total_" + index}`}
                                                                    onWheel={(e) => e.target.blur()}
                                                                    disabled={isZatcaReported}
                                                                    value={parseFloat(trimTo2Decimals(((selectedProducts[index].unit_price || 0) - (selectedProducts[index].unit_discount || 0)) * (selectedProducts[index].quantity || 0))) || ""}
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
                                                                            errors["line_total_" + index] = t("Max decimal points allowed is 2");
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
                                                                <OverlayTrigger placement="top" overlay={<Tooltip>{errors[`line_total_${index}`] || warnings[`line_total_${index}`] || ''}</Tooltip>}>
                                                                    <i
                                                                        className={`bi bi-exclamation-circle-fill ${errors[`line_total_${index}`] ? 'text-danger' : 'text-warning'} ms-2`}
                                                                        style={{ fontSize: '1rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                                                    ></i>
                                                                </OverlayTrigger>
                                                            )}
                                                        </div>
                                                    </td>);
                                                    if (col.key === 'price_with_vat') return (<td key="price_with_vat" style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                        <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                                                            <div className="input-group flex-nowrap" style={{ flex: '1 1 auto', minWidth: 0 }}>
                                                                <input type="number"
                                                                    id={`${"sales_product_line_total_with_vat" + index}`}
                                                                    name={`${"sales_product_line_total_with_vat" + index}`}
                                                                    onWheel={(e) => e.target.blur()}
                                                                    disabled={isZatcaReported}
                                                                    value={parseFloat(trimTo2Decimals(((selectedProducts[index].unit_price_with_vat || 0) - (selectedProducts[index].unit_discount_with_vat || 0)) * (selectedProducts[index].quantity || 0))) || ""}
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
                                                                            errors["line_total_with_vat_" + index] = t("Max decimal points allowed is 2");
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
                                                                <OverlayTrigger placement="top" overlay={<Tooltip>{errors[`line_total_with_vat_${index}`] || warnings[`line_total_with_vat_${index}`] || ''}</Tooltip>}>
                                                                    <i
                                                                        className={`bi bi-exclamation-circle-fill ${errors[`line_total_with_vat_${index}`] ? 'text-danger' : 'text-warning'} ms-2`}
                                                                        style={{ fontSize: '1rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                                                    ></i>
                                                                </OverlayTrigger>
                                                            )}
                                                        </div>
                                                    </td>);
                                                    return null;
                                                })}
                                            </tr>);
                                    }).reverse()}
                                </tbody>
                            </table>
                        </div>
                        <div className="sc-post-table">
                        <div className="sc-post-table-right">
                        {showBillSummarySettings && (
                            <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 1060, background: "#fff", border: "1px solid #dee2e6", borderRadius: "8px", padding: "16px", width: "320px", boxShadow: "0 8px 32px rgba(0,0,0,0.22)" }}>
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <strong style={{ fontSize: "13px" }}>{t("Customize Bill Summary")}</strong>
                                    <button type="button" className="btn-close" style={{ fontSize: "10px" }} onClick={() => setShowBillSummarySettings(false)}></button>
                                </div>
                                <div style={{ fontSize: "11px", color: "#888", marginBottom: "8px" }}>{t("Toggle visibility or reorder fields")}</div>
                                {billSummaryOrder.map((key, idx) => (
                                    <div key={key} className="d-flex align-items-center gap-2 mb-1"
                                        style={{ padding: "3px 0", borderBottom: "1px solid #f5f5f5", cursor: "grab" }}
                                        draggable
                                        onDragStart={() => { billSummaryDragRef.current = idx; }}
                                        onDragOver={e => e.preventDefault()}
                                        onDrop={() => { reorderBillSummary(billSummaryDragRef.current, idx); billSummaryDragRef.current = null; }}>
                                        <span style={{ color: "#bbb", fontSize: "15px", cursor: "grab", userSelect: "none", flexShrink: 0 }}>⠿</span>
                                        <input type="checkbox" className="form-check-input m-0" checked={!!billSummaryVisible[key]}
                                            onChange={e => updateBillSummaryVisible(key, e.target.checked)}
                                            style={{ width: "14px", height: "14px", flexShrink: 0 }} />
                                        <span style={{ flex: 1, fontSize: "12px" }}>{t(_billSummaryFieldLabels[key])}</span>
                                    </div>
                                ))}
                                <button type="button" className="btn btn-sm btn-outline-secondary mt-2 w-100" style={{ fontSize: "11px" }} onClick={() => {
                                    setBillSummaryOrder(_defaultBillSummaryOrder);
                                    setBillSummaryVisible(Object.fromEntries(_defaultBillSummaryOrder.map(k => [k, true])));
                                    localStorage.removeItem('bill_summary_visible_sr');
                                    localStorage.removeItem('bill_summary_order_sr');
                                }}>{t("Reset to Default")}</button>
                            </div>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                          <div style={{ padding: '6px 16px', borderBottom: '1px solid #c3c6d7', backgroundColor: '#f2f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#191c1e', fontFamily: "'Hanken Grotesk', sans-serif" }}>{t("Bill Summary")}</span>
                            <button type="button" title={t("Customize Bill Summary")} onClick={() => setShowBillSummarySettings(v => !v)}
                              style={{ background: 'none', border: '1px solid #c3c6d7', borderRadius: '4px', padding: '1px 5px', cursor: 'pointer', color: '#6b7280', lineHeight: 1 }}
                              onMouseEnter={e => e.currentTarget.style.color='#191c1e'}
                              onMouseLeave={e => e.currentTarget.style.color='#6b7280'}>
                              <i className="bi bi-gear-fill" style={{ fontSize: '11px' }}></i>
                            </button>
                          </div>
                          <div style={{ padding: '6px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {billSummaryOrder.filter(key => billSummaryVisible[key]).map(key => {
                              const rowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', lineHeight: '20px' };
                              switch (key) {
                                case 'total_without_vat': return (
                                  <div key="total_without_vat" style={rowStyle}>
                                    <span style={{ color: '#434655' }}>{t("Total (ex. VAT)")}</span>
                                    <span style={{ fontWeight: 500 }}><NumberFormat value={trimTo2Decimals(formData.total)} displayType={"text"} thousandSeparator={true} suffix={" "} renderText={(value, props) => value} /></span>
                                  </div>
                                );
                                case 'total_with_vat': return (
                                  <div key="total_with_vat" style={rowStyle}>
                                    <span style={{ color: '#434655' }}>{t("Total (inc. VAT)")}</span>
                                    <span style={{ fontWeight: 500 }}><NumberFormat value={trimTo2Decimals(formData.total_with_vat)} displayType={"text"} thousandSeparator={true} suffix={" "} renderText={(value, props) => value} /></span>
                                  </div>
                                );
                                case 'shipping': return (
                                  <div key="shipping" style={rowStyle}>
                                    <span style={{ color: '#434655' }}>{t("Shipping & Handling")}</span>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', position: 'relative' }}>
                                      <input type="number" id="sales_shipping_fees" name="sales_shipping_fees" onWheel={(e) => e.target.blur()} disabled={isZatcaReported} style={{ width: "110px" }} className="form-control form-control-sm text-end" value={shipping} onChange={(e) => {
                                          if (timerRef.current) clearTimeout(timerRef.current);
                                          delete errors["shipping_handling_fees"]; setErrors({ ...errors });
                                          if (parseFloat(e.target.value) === 0) { shipping = 0; setShipping(shipping); delete errors["shipping_handling_fees"]; setErrors({ ...errors }); timerRef.current = setTimeout(() => { reCalculate(); }, 300); return; }
                                          if (parseFloat(e.target.value) < 0) { shipping = 0; setShipping(shipping); setErrors({ ...errors }); timerRef.current = setTimeout(() => { reCalculate(); }, 300); return; }
                                          if (!e.target.value) { shipping = ""; setShipping(shipping); timerRef.current = setTimeout(() => { reCalculate(); }, 300); return; }
                                          if (/^\d*\.?\d{0,2}$/.test(parseFloat(e.target.value)) === false) { errors["shipping_handling_fees"] = t("Max. decimal points allowed is 2"); setErrors({ ...errors }); }
                                          shipping = parseFloat(e.target.value); setShipping(shipping);
                                          timerRef.current = setTimeout(() => { reCalculate(); }, 300);
                                      }} />
                                      {errors.shipping_handling_fees && <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: 10, whiteSpace: 'nowrap', background: '#fff', border: '1px solid #fca5a5', borderRadius: '3px', padding: '1px 6px', color: '#dc2626', fontSize: '11px' }}>{errors.shipping_handling_fees}</div>}
                                    </div>
                                  </div>
                                );
                                case 'discount_without_vat': return (
                                  <div key="discount_without_vat" style={rowStyle}>
                                    <span style={{ color: '#434655', position: 'relative' }}>
                                      {t("Discount (ex. VAT)")} <input type="number" id="discount_percent" name="discount_percent" onWheel={(e) => e.target.blur()} disabled={true} style={{ width: "50px", display: 'inline-block' }} className="form-control form-control-sm d-inline-block text-center" value={discountPercent} onChange={(e) => {
                                        if (timerRef.current) clearTimeout(timerRef.current);
                                        if (parseFloat(e.target.value) === 0) { discount = 0; setDiscount(discount); discountPercentWithVAT = 0; setDiscountPercentWithVAT(discountPercentWithVAT); discountPercent = 0; setDiscountPercent(discountPercent); delete errors["discount_percent"]; setErrors({ ...errors }); timerRef.current = setTimeout(() => { reCalculate(); }, 100); return; }
                                        if (parseFloat(e.target.value) < 0) { discountWithVAT = 0; setDiscountWithVAT(discountWithVAT); discountPercentWithVAT = 0; setDiscountPercentWithVAT(discountPercentWithVAT); discount = 0; setDiscount(discount); discountPercent = 0; setDiscountPercent(discountPercent); setErrors({ ...errors }); timerRef.current = setTimeout(() => { reCalculate(); }, 100); return; }
                                        if (!e.target.value) { discountWithVAT = ""; setDiscountWithVAT(discountWithVAT); discountPercentWithVAT = ""; setDiscountPercentWithVAT(discountPercentWithVAT); discount = ""; setDiscount(discount); discountPercent = ""; setDiscountPercent(discountPercent); setErrors({ ...errors }); timerRef.current = setTimeout(() => { reCalculate(); }, 100); return; }
                                        delete errors["discount_percent"]; delete errors["discount"]; setErrors({ ...errors });
                                        discountPercent = parseFloat(e.target.value); setDiscountPercent(discountPercent);
                                        timerRef.current = setTimeout(() => { reCalculate(); }, 100);
                                      }} />{"%"}
                                    </span>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', position: 'relative' }}>
                                      <input type="number" id="sales_discount" name="sales_discount" onWheel={(e) => e.target.blur()} disabled={isZatcaReported} style={{ width: "110px" }} className="form-control form-control-sm text-end" value={discount} ref={discountRef}
                                        onFocus={() => { if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = setTimeout(() => { discountRef.current?.select(); }, 20); }}
                                        onChange={(e) => {
                                          if (timerRef.current) clearTimeout(timerRef.current);
                                          if (parseFloat(e.target.value) === 0) { discount = 0; setDiscount(discount); discountWithVAT = 0; setDiscountWithVAT(discountWithVAT); discountPercent = 0; setDiscountPercent(discountPercent); discountPercentWithVAT = 0; setDiscountPercent(discountPercentWithVAT); delete errors["discount"]; setErrors({ ...errors }); timerRef.current = setTimeout(() => { reCalculate(); }, 100); return; }
                                          if (parseFloat(e.target.value) < 0) { discount = 0; setDiscount(discount); discountWithVAT = 0; setDiscountWithVAT(discountWithVAT); discountPercent = 0; setDiscountPercent(discountPercent); discountPercentWithVAT = 0; setDiscountPercent(discountPercentWithVAT); setErrors({ ...errors }); timerRef.current = setTimeout(() => { reCalculate(); }, 100); return; }
                                          if (!e.target.value) { discount = ""; setDiscount(discount); discountWithVAT = ""; setDiscountWithVAT(discountWithVAT); discountPercent = ""; setDiscountPercent(discountPercent); discountPercentWithVAT = ""; setDiscountPercent(discountPercentWithVAT); setErrors({ ...errors }); timerRef.current = setTimeout(() => { reCalculate(); }, 100); return; }
                                          delete errors["discount"]; delete errors["discount_percent"]; setErrors({ ...errors });
                                          if (/^\d*\.?\d{0,2}$/.test(parseFloat(e.target.value)) === false) { errors["discount"] = t("Max. decimal points allowed is 2"); setErrors({ ...errors }); }
                                          discount = parseFloat(e.target.value); setDiscount(discount);
                                          timerRef.current = setTimeout(() => { discountWithVAT = parseFloat(trimTo2Decimals(discount * (1 + (formData.vat_percent / 100)))); setDiscountWithVAT(discountWithVAT); reCalculate(); }, 100);
                                        }} />
                                      {errors.discount && <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: 10, whiteSpace: 'nowrap', background: '#fff', border: '1px solid #fca5a5', borderRadius: '3px', padding: '1px 6px', color: '#dc2626', fontSize: '11px' }}>{errors.discount}</div>}
                                    </div>
                                  </div>
                                );
                                case 'discount_with_vat': return (
                                  <div key="discount_with_vat" style={rowStyle}>
                                    <span style={{ color: '#434655', position: 'relative' }}>
                                      {t("Discount (inc. VAT)")} <input type="number" id="discount_percent_with_vat" name="discount_percent_with_vat" onWheel={(e) => e.target.blur()} disabled={true} style={{ width: "50px", display: 'inline-block' }} className="form-control form-control-sm d-inline-block text-center" value={discountPercentWithVAT} onChange={(e) => {
                                        if (timerRef.current) clearTimeout(timerRef.current);
                                        if (parseFloat(e.target.value) === 0) { discountWithVAT = 0; setDiscountWithVAT(discountWithVAT); discountPercentWithVAT = 0; setDiscountPercentWithVAT(discountPercentWithVAT); discount = 0; setDiscount(discount); discountPercent = 0; setDiscountPercent(discountPercent); delete errors["discount_percent_with_vat"]; setErrors({ ...errors }); timerRef.current = setTimeout(() => { reCalculate(); }, 100); return; }
                                        if (parseFloat(e.target.value) < 0) { discountWithVAT = 0; setDiscountWithVAT(discountWithVAT); discountPercentWithVAT = 0; setDiscountPercentWithVAT(discountPercentWithVAT); discount = 0; setDiscount(discount); discountPercent = 0; setDiscountPercent(discountPercent); errors["discount_percent_with_vat"] = t("Discount percent should be greater than or equal to zero"); setErrors({ ...errors }); timerRef.current = setTimeout(() => { reCalculate(); }, 100); return; }
                                        if (!e.target.value) { discountWithVAT = ""; setDiscountWithVAT(discountWithVAT); discountPercentWithVAT = ""; setDiscountPercentWithVAT(discountPercentWithVAT); discount = ""; setDiscount(discount); discountPercent = ""; setDiscountPercent(discountPercent); setErrors({ ...errors }); timerRef.current = setTimeout(() => { reCalculate(); }, 100); return; }
                                        delete errors["discount_percent_with_vat"]; delete errors["discount_with_vat"]; setErrors({ ...errors });
                                        discountPercentWithVAT = parseFloat(e.target.value); setDiscountPercentWithVAT(discountPercentWithVAT);
                                        timerRef.current = setTimeout(() => { reCalculate(); }, 100);
                                      }} />{"%"}
                                    </span>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', position: 'relative' }}>
                                      <input type="number" id="sales_discount_with_vat" name="sales_discount_with_vat" onWheel={(e) => e.target.blur()} disabled={isZatcaReported} style={{ width: "110px" }} className="form-control form-control-sm text-end" value={discountWithVAT} ref={discountWithVATRef}
                                        onFocus={() => { if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = setTimeout(() => { discountWithVATRef.current?.select(); }, 20); }}
                                        onChange={(e) => {
                                          if (timerRef.current) clearTimeout(timerRef.current);
                                          if (parseFloat(e.target.value) === 0) { discount = 0; discountWithVAT = 0; discountPercent = 0; setDiscount(discount); setDiscountWithVAT(discount); setDiscountPercent(discount); delete errors["discount_with_vat"]; setErrors({ ...errors }); timerRef.current = setTimeout(() => { reCalculate(); }, 100); return; }
                                          if (parseFloat(e.target.value) < 0) { discount = 0.00; discountWithVAT = 0.00; discountPercent = 0.00; setDiscount(discount); setDiscountWithVAT(discount); setDiscountPercent(discountPercent); setErrors({ ...errors }); timerRef.current = setTimeout(() => { reCalculate(); }, 100); return; }
                                          if (!e.target.value) { discount = ""; discountWithVAT = ""; discountPercent = ""; setDiscount(discount); setDiscountWithVAT(discount); setDiscountPercent(discountPercent); setErrors({ ...errors }); timerRef.current = setTimeout(() => { reCalculate(); }, 100); return; }
                                          delete errors["discount_with_vat"]; delete errors["discount_percent_with_vat"]; setErrors({ ...errors });
                                          if (/^\d*\.?\d{0,2}$/.test(parseFloat(e.target.value)) === false) { errors["discount_with_vat"] = t("Max. decimal points allowed is 2"); setErrors({ ...errors }); }
                                          discountWithVAT = parseFloat(e.target.value); setDiscountWithVAT(discountWithVAT);
                                          timerRef.current = setTimeout(() => { discount = parseFloat(trimTo2Decimals(discountWithVAT / (1 + (formData.vat_percent / 100)))); setDiscount(discount); reCalculate(); }, 100);
                                        }} />
                                      {errors.discount_with_vat && <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: 10, whiteSpace: 'nowrap', background: '#fff', border: '1px solid #fca5a5', borderRadius: '3px', padding: '1px 6px', color: '#dc2626', fontSize: '11px' }}>{errors.discount_with_vat}</div>}
                                    </div>
                                  </div>
                                );
                                case 'taxable_amount': return (
                                  <div key="taxable_amount" style={rowStyle}>
                                    <span style={{ color: '#434655' }}>{t("Taxable Amount (ex. VAT)")}</span>
                                    <span style={{ fontWeight: 500 }}><NumberFormat value={trimTo2Decimals(formData.total + shipping - discount)} displayType={"text"} thousandSeparator={true} suffix={" "} renderText={(value, props) => value} /></span>
                                  </div>
                                );
                                case 'vat': return (
                                  <div key="vat" style={rowStyle}>
                                    <span style={{ color: '#434655', display: 'flex', alignItems: 'center', gap: '4px', position: 'relative' }}>
                                      {t("VAT")}
                                      <input type="number" id="sales_vat_percent" name="sales_vat_percent" onWheel={(e) => e.target.blur()} disabled={true} className="form-control form-control-sm text-center" style={{ width: "54px", display: 'inline-block' }} value={formData.vat_percent} onChange={(e) => {
                                        if (parseFloat(e.target.value) === 0) { formData.vat_percent = parseFloat(e.target.value); setFormData({ ...formData }); delete errors["vat_percent"]; setErrors({ ...errors }); reCalculate(); return; }
                                        if (parseFloat(e.target.value) < 0) { formData.vat_percent = parseFloat(e.target.value); formData.vat_price = 0.00; setFormData({ ...formData }); errors["vat_percent"] = t("Vat percent should be greater than or equal to zero"); setErrors({ ...errors }); reCalculate(); return; }
                                        if (!e.target.value) { formData.vat_percent = ""; formData.vat_price = 0.00; errors["vat_percent"] = t("Invalid vat percent"); setFormData({ ...formData }); setErrors({ ...errors }); return; }
                                        delete errors["vat_percent"]; setErrors({ ...errors });
                                        formData.vat_percent = e.target.value; reCalculate(); setFormData({ ...formData });
                                      }} />
                                      %
                                    </span>
                                    <span style={{ fontWeight: 500 }}><NumberFormat value={trimTo2Decimals(formData.vat_price)} displayType={"text"} thousandSeparator={true} suffix={" "} renderText={(value, props) => value} /></span>
                                  </div>
                                );
                                case 'net_before_rounding': return (
                                  <div key="net_before_rounding" style={rowStyle}>
                                    <span style={{ color: '#434655' }}>{t("Before Rounding")}</span>
                                    <span style={{ fontWeight: 500 }}><NumberFormat value={trimTo2Decimals(formData.net_total - roundingAmount)} displayType={"text"} thousandSeparator={true} suffix={" "} renderText={(value, props) => value} /></span>
                                  </div>
                                );
                                case 'rounding_amount': return (
                                  <div key="rounding_amount" style={rowStyle}>
                                    <span style={{ color: '#434655', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      {t("Rounding")}
                                      <label style={{ fontSize: '11px', color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', marginBottom: 0 }}>
                                        <input type="checkbox" className="form-check-input" id="sales_auto_rounding_amount" name="sales_auto_rounding_amount" style={{ width: "14px", height: "14px", verticalAlign: "middle" }} value={formData.auto_rounding_amount} checked={formData.auto_rounding_amount} onChange={(e) => {
                                          if (timerRef.current) clearTimeout(timerRef.current);
                                          setErrors({ ...errors });
                                          formData.auto_rounding_amount = !formData.auto_rounding_amount;
                                          setFormData({ ...formData });
                                          timerRef.current = setTimeout(() => { reCalculate(); }, 100);
                                        }} />
                                        Auto
                                      </label>
                                    </span>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', position: 'relative' }}>
                                      <input type="number" id="sales_rounding_amount" name="sales_rounding_amount" disabled={formData.auto_rounding_amount} onWheel={(e) => e.target.blur()} style={{ width: "110px" }} className="form-control form-control-sm text-end" value={roundingAmount}
                                        onChange={(e) => {
                                          if (timerRef.current) clearTimeout(timerRef.current);
                                          delete errors["rounding_amount"]; setErrors({ ...errors });
                                          if (!e.target.value) { roundingAmount = ""; setRoundingAmount(roundingAmount); timerRef.current = setTimeout(() => { reCalculate(); }, 100); return; }
                                          if (/^-?\d*\.?\d{0,2}$/.test(parseFloat(e.target.value)) === false) { roundingAmount = parseFloat(e.target.value); errors["rounding_amount"] = t("Max. decimal points allowed is 2"); setErrors({ ...errors }); return; }
                                          roundingAmount = parseFloat(e.target.value); setRoundingAmount(roundingAmount);
                                          delete errors["rounding_amount"]; setErrors({ ...errors });
                                          timerRef.current = setTimeout(() => { reCalculate(); }, 100);
                                        }}
                                        onKeyDown={(e) => {
                                          if (timerRef.current) clearTimeout(timerRef.current);
                                          if (e.key === "Backspace") { delete errors["rounding_amount"]; setErrors({ ...errors }); roundingAmount = ""; setRoundingAmount(""); timerRef.current = setTimeout(() => { reCalculate(); }, 100); }
                                        }} />
                                      {errors.rounding_amount && <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: 10, whiteSpace: 'nowrap', background: '#fff', border: '1px solid #fca5a5', borderRadius: '3px', padding: '1px 6px', color: '#dc2626', fontSize: '11px' }}>{errors.rounding_amount}</div>}
                                    </div>
                                  </div>
                                );
                                case 'net_total': return (
                                  <div key="net_total" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '15px', fontWeight: 700, paddingTop: '10px', borderTop: '1px solid #c3c6d7', color: '#191c1e', marginTop: '2px' }}>
                                    <span>{t("Net Total (inc. VAT)")}</span>
                                    <span style={{ color: '#004ac6' }}><NumberFormat value={trimTo2Decimals(formData.net_total)} displayType={"text"} thousandSeparator={true} suffix={" "} renderText={(value, props) => value} /></span>
                                  </div>
                                );
                                default: return null;
                              }
                            })}
                          </div>
                        </div>
                        </div>{/* /sc-post-table-right */}
                        <div className="sc-post-table-left">
                          {/* Payments card */}
                          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                            <div style={{ padding: '6px 16px', borderBottom: '1px solid #c3c6d7', backgroundColor: '#f2f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '13px', fontWeight: 600, color: '#191c1e', fontFamily: "'Hanken Grotesk', sans-serif" }}>{t("Payments Given")}</span>
                              <Button variant="secondary" size="sm" disabled={order.payment_status === "not_paid"} onClick={addNewPayment}><i className="bi bi-plus-lg me-1" />{t("Add Payment")}</Button>
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '380px' }}>
                                {formData.payments_input && formData.payments_input.length > 0 && (
                                  <thead style={{ backgroundColor: '#f1f5f9', position: 'sticky', top: 0, zIndex: 1 }}>
                                    <tr style={{ fontSize: '11px', fontWeight: 600, color: '#434655' }}>
                                      {(() => { const th = { padding: '5px 8px', fontWeight: 600, borderBottom: '2px solid #c3c6d7', whiteSpace: 'nowrap' }; return (<>
                                        <th style={{ ...th, width: '180px' }}>{t("Date")}</th>
                                        <th style={{ ...th, width: '120px' }}>{t("Amount")}</th>
                                        <th style={{ ...th, width: '150px' }}>{t("Method")}</th>
                                        <th style={th}>{t("Reference")}</th>
                                        <th style={{ ...th, width: '36px' }}></th>
                                      </>); })()}
                                    </tr>
                                  </thead>
                                )}
                                <tbody style={{ fontSize: '12px', color: '#191c1e' }}>
                                  {formData.payments_input && formData.payments_input.filter(payment => !payment.deleted).map((payment, key) => (
                                    <tr key={key} style={{ borderBottom: '1px solid #e2e8f0' }}
                                      onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = ''; }}>
                                      <td style={{ padding: '3px 6px', width: '180px', position: 'relative' }}>
                                        <DatePicker
                                          disabled={order.payment_status === "not_paid"}
                                          id="date_str"
                                          selected={formData.payments_input[key].date_str ? new Date(formData.payments_input[key].date_str) : null}
                                          value={formData.payments_input[key].date_str ? format(new Date(formData.payments_input[key].date_str), "d MMM yy h:mm aa", { locale: dateLocale }) : null}
                                          className={`form-control form-control-sm${errors["payment_date_" + key] ? ' is-invalid' : ''}`}
                                          dateFormat="d MMM yy h:mm aa"
                                          locale={dateLocale}
                                          showTimeSelect
                                          timeIntervals="1"
                                          popperProps={{ strategy: 'fixed' }}
                                          onChange={(value) => { formData.payments_input[key].date_str = value; setFormData({ ...formData }); }}
                                        />
                                        {errors["payment_date_" + key] && <div style={{ color: "red", fontSize: '11px' }}>{t(errors["payment_date_" + key])}</div>}
                                      </td>
                                      <td style={{ padding: '3px 6px', width: '120px' }}>
                                        <input id={`${"sales_return_payment_amount" + key}`} name={`${"sales_return_payment_amount" + key}`}
                                          type='number' disabled={order.payment_status === "not_paid"} value={formData.payments_input[key].amount}
                                          className={`form-control form-control-sm text-end${errors["payment_amount_" + key] ? ' is-invalid' : ''}`}
                                          onChange={(e) => {
                                            delete errors["payment_amount_" + key]; setErrors({ ...errors });
                                            if (!e.target.value) { formData.payments_input[key].amount = e.target.value; setFormData({ ...formData }); validatePaymentAmounts(); return; }
                                            formData.payments_input[key].amount = parseFloat(e.target.value); validatePaymentAmounts(); setFormData({ ...formData });
                                          }} />
                                        {errors["payment_amount_" + key] && <div style={{ color: "red", fontSize: '11px' }}>{t(errors["payment_amount_" + key])}</div>}
                                      </td>
                                      <td style={{ padding: '3px 6px', width: '150px' }}>
                                        <select value={formData.payments_input[key].method} disabled={order.payment_status === "not_paid"}
                                          className={`form-select form-select-sm${errors["payment_method_" + key] ? ' is-invalid' : ''}`}
                                          style={{ fontSize: '12px', height: '26px', padding: '0 24px 0 6px' }}
                                          onChange={(e) => {
                                            delete errors["payment_method_" + key]; setErrors({ ...errors });
                                            if (!e.target.value) { errors["payment_method_" + key] = t("Payment method is required"); setErrors({ ...errors }); formData.payments_input[key].method = ""; setFormData({ ...formData }); return; }
                                            formData.payments_input[key].method = e.target.value; setFormData({ ...formData });
                                          }}>
                                          <option value="">{t("Select")}</option>
                                          <option value="cash">{t("Cash")}</option>
                                          <option value="debit_card">{t("Debit Card")}</option>
                                          <option value="credit_card">{t("Credit Card")}</option>
                                          <option value="bank_card">{t("Bank Card")}</option>
                                          <option value="bank_transfer">{t("Bank Transfer")}</option>
                                          <option value="bank_cheque">{t("Bank Cheque")}</option>
                                          <option value="sales">{t("Sales")}</option>
                                          <option value="customer_account">{t("Customer Account")}</option>
                                        </select>
                                        {errors["payment_method_" + key] && <div style={{ color: "red", fontSize: '11px' }}>{t(errors["payment_method_" + key])}</div>}
                                      </td>
                                      <td style={{ padding: '3px 6px' }}>
                                        {formData.payments_input[key] && (
                                          <span style={{ cursor: "pointer", color: "#004ac6", fontSize: '11px' }} onClick={() => openReferenceUpdateForm(formData.payments_input[key].reference_id, formData.payments_input[key].reference_type)}>
                                            {formData.payments_input[key].reference_code}
                                          </span>
                                        )}
                                      </td>
                                      <td style={{ padding: '3px 4px', textAlign: 'center' }}>
                                        <button type="button" disabled={order.payment_status === "not_paid"} onClick={() => removePayment(key)}
                                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: '1px 3px', borderRadius: '4px' }}
                                          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fef2f2'}
                                          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                          <i className="bi bi-trash" style={{ fontSize: '12px' }}></i>
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                  <tr style={{ borderTop: '2px solid #c3c6d7', backgroundColor: '#f8fafc' }}>
                                    <td colSpan={5} style={{ padding: '5px 10px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                                          <span style={{ fontSize: '12px', color: '#434655' }}>{t("Total")}:&nbsp;<strong style={{ color: '#191c1e', fontVariantNumeric: 'tabular-nums' }}>{trimTo2Decimals(totalPaymentAmount)}</strong></span>
                                          <span style={{ width: '1px', height: '14px', background: '#c3c6d7', display: 'inline-block' }} />
                                          <span style={{ fontSize: '12px', color: '#434655' }}>{t("Balance")}:&nbsp;<strong style={{ color: balanceAmount > 0 ? '#dc2626' : balanceAmount < 0 ? '#2563eb' : '#16a34a', fontVariantNumeric: 'tabular-nums' }}>{trimTo2Decimals(balanceAmount)}</strong></span>
                                          {errors["total_payment"] && <span style={{ color: '#dc2626', fontSize: '11px' }}>{t(errors["total_payment"])}</span>}
                                        </div>
                                        <div>
                                          {paymentStatus === "paid" && <span className="badge bg-success" style={{ fontSize: '10px' }}>{t("Paid")}</span>}
                                          {paymentStatus === "paid_partially" && <span className="badge bg-warning text-dark" style={{ fontSize: '10px' }}>{t("Paid Partially")}</span>}
                                          {paymentStatus === "not_paid" && <span className="badge bg-danger" style={{ fontSize: '10px' }}>{t("Not Paid")}</span>}
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                          {/* Cash Discount & Commission card */}
                          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                            <div style={{ padding: '6px 16px', borderBottom: '1px solid #c3c6d7', backgroundColor: '#f2f4f6' }}>
                              <span style={{ fontSize: '13px', fontWeight: 600, color: '#191c1e', fontFamily: "'Hanken Grotesk', sans-serif" }}>{t("Cash Discount & Commission")}</span>
                            </div>
                            <div style={{ padding: '8px 12px', display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', position: 'relative' }}>
                                <label style={{ fontSize: '11px', color: '#434655', marginBottom: '2px', display: 'block', fontWeight: 600 }}>{t("Cash Discount")}</label>
                                <input type='number' ref={cashDiscountRef} id="sales_cash_discount" name="sales_cash_discount" value={cashDiscount}
                                  className="form-control form-control-sm" style={{ width: '110px' }}
                                  onChange={(e) => {
                                    delete errors["cash_discount"]; setErrors({ ...errors });
                                    if (!e.target.value) { cashDiscount = e.target.value; setCashDiscount(cashDiscount); if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = setTimeout(() => { reCalculate(); }, 100); return; }
                                    cashDiscount = parseFloat(e.target.value); setCashDiscount(cashDiscount);
                                    if (cashDiscount > 0 && cashDiscount >= formData.net_total) { errors["cash_discount"] = t("Cash discount should not be greater than or equal to Net Total: {{netTotal}}", { netTotal: formData.net_total?.toString() }); setErrors({ ...errors }); return; }
                                    if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = setTimeout(() => { reCalculate(); }, 100);
                                  }}
                                  onKeyDown={(e) => { if (timerRef.current) clearTimeout(timerRef.current); if (e.key === "Backspace") { cashDiscount = ""; setCashDiscount(cashDiscount); if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = setTimeout(() => { reCalculate(); }, 100); return; } }}
                                  onFocus={() => { if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = setTimeout(() => { cashDiscountRef.current?.select(); }, 20); }}
                                />
                                {errors.cash_discount && <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 10, whiteSpace: 'nowrap', background: '#fff', border: '1px solid #fca5a5', borderRadius: '3px', padding: '1px 6px', color: '#dc2626', fontSize: '11px' }}>{t(errors.cash_discount)}</div>}
                              </div>
                              <div style={{ width: '1px', background: '#e2e8f0', alignSelf: 'stretch', marginTop: '4px' }} />
                              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                                <div style={{ position: 'relative' }}>
                                  <label style={{ fontSize: '11px', color: '#434655', marginBottom: '2px', display: 'block', fontWeight: 600 }}>{t("Commission Amount")}</label>
                                  <input type='number' ref={commissionRef} id="sales_commission" name="sales_commission" value={commission}
                                    className="form-control form-control-sm" style={{ width: '110px' }}
                                    onChange={(e) => {
                                      delete errors["commission"]; delete errors["commission_payment_method"]; setErrors({ ...errors });
                                      if (!e.target.value) { commission = e.target.value; setCommission(commission); setErrors({ ...errors }); return; }
                                      commission = parseFloat(e.target.value); setCommission(commission);
                                      if (commission > 0 && commission >= formData.net_total) { errors["commission"] = t("Commission should not be greater than or equal to Net Total: {{netTotal}}", { netTotal: formData.net_total?.toString() }); setErrors({ ...errors }); return; }
                                      if (commission > 0 && !formData.commission_payment_method) { errors["commission_payment_method"] = t("Payment method is required"); setErrors({ ...errors }); return; }
                                    }}
                                    onKeyDown={(e) => { if (timerRef.current) clearTimeout(timerRef.current); if (e.key === "Backspace") { commission = ""; setCommission(commission); delete errors["commission"]; delete errors["commission_payment_method"]; setErrors({ ...errors }); return; } }}
                                    onFocus={() => { if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = setTimeout(() => { commissionRef.current?.select(); }, 20); }}
                                  />
                                  {errors.commission && <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 10, whiteSpace: 'nowrap', background: '#fff', border: '1px solid #fca5a5', borderRadius: '3px', padding: '1px 6px', color: '#dc2626', fontSize: '10px' }}>{t(errors.commission)}</div>}
                                </div>
                                <div style={{ position: 'relative' }}>
                                  <label style={{ fontSize: '11px', color: '#434655', marginBottom: '2px', display: 'block', fontWeight: 600 }}>{t("Commission Method")}</label>
                                  <select value={formData.commission_payment_method || ''} className="form-select form-select-sm" style={{ width: '160px', fontSize: '12px', height: '26px', padding: '0 24px 0 8px' }}
                                    onChange={(e) => {
                                      delete errors["commission_payment_method"]; setErrors({ ...errors });
                                      if (!e.target.value && commission > 0) { errors["commission_payment_method"] = t("Payment method is required"); setErrors({ ...errors }); formData.commission_payment_method = ""; setFormData({ ...formData }); return; }
                                      formData.commission_payment_method = e.target.value; setFormData({ ...formData });
                                    }}>
                                    <option value="">{t("Select")}</option>
                                    <option value="cash">{t("Cash")}</option>
                                    <option value="debit_card">{t("Debit Card")}</option>
                                    <option value="credit_card">{t("Credit Card")}</option>
                                    <option value="bank_card">{t("Bank Card")}</option>
                                    <option value="bank_transfer">{t("Bank Transfer")}</option>
                                    <option value="bank_cheque">{t("Bank Cheque")}</option>
                                  </select>
                                  {errors["commission_payment_method"] && <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 10, whiteSpace: 'nowrap', background: '#fff', border: '1px solid #fca5a5', borderRadius: '3px', padding: '1px 6px', color: '#dc2626', fontSize: '10px' }}>{t(errors["commission_payment_method"])}</div>}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>{/* /sc-post-table-left */}
                        </div>{/* /sc-post-table */}
                    </form>}
                </Modal.Body>

            </Modal >
            )}
            {srFormType === "type1" && (
            <Modal show={show} size="xl" fullscreen onHide={handleClose} animation={false} backdrop="static" scrollable={true}>
                <Modal.Header>
                    <Modal.Title>
                        {formData.id ? t("Update Sales Return") + "  #" + formData.code + " for sales #" : t("Create Sales Return for Sale") + " #"}
                        {formData.order_code && <span style={{ cursor: "pointer", color: "blue" }} onClick={() => {
                            openReferenceUpdateForm(formData.order_id, "sales");
                        }}>
                            {formData.order_code}
                        </span>}
                    </Modal.Title>
                    {store.zatca?.phase === "2" && store.zatca?.connected && !formData.id && < div style={{ marginLeft: "20px" }}>
                        <input type="checkbox" id="sales_return_report_to_zatca" name="sales_return_report_to_zatca" checked={formData.enable_report_to_zatca} onChange={(e) => {
                            formData.enable_report_to_zatca = !formData.enable_report_to_zatca;
                            setFormData({ ...formData });
                        }} /> {t("Report to Zatca")} <br />
                    </div>}

                    <div className="col align-self-end text-end">

                        <Button variant="primary" onClick={openPreview}>
                            <i className="bi bi-printer"></i> {t("Print Full Invoice")}
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
                                {formData.id && !isProcessing ? t("Update") : !isProcessing ? t("Create") : ""}

                            </Button>}
                        <button
                            type="button"
                            className="btn-close"
                            onClick={handleClose}
                            aria-label={t("Close")}
                        ></button>
                    </div>
                </Modal.Header>
                <Modal.Body>
                    {errors && Object.keys(errors).some(k => { const m = Array.isArray(errors[k]) ? errors[k][0] : errors[k]; return !!m; }) && (
                        <div className="sc-error-banner" style={{ maxHeight: '120px', overflowY: 'auto', padding: '8px 12px', backgroundColor: '#fff0f0', borderLeft: '1px solid #f5c6cb', borderBottom: '1px solid #f5c6cb', boxShadow: '-2px 2px 8px rgba(186,26,26,0.12)', position: 'fixed', top: '56px', right: 0, width: '380px', zIndex: 9999 }}>
                            <ul style={{ marginBottom: 0, paddingLeft: 16 }}>
                                {Object.keys(errors).map((key, index) => { const message = Array.isArray(errors[key]) ? errors[key][0] : errors[key]; return message ? <li key={index} style={{ color: '#dc2626', fontSize: '12px' }}>{t(message)}</li> : null; })}
                            </ul>
                        </div>
                    )}
                    <section style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '8px' }}>
                        <div className="sc-header-flex" style={{ borderBottom: '1px solid #c3c6d7' }}>
                            <div className="sc-header-left" style={{ padding: '4px 10px', display: 'flex', gap: '6px', alignItems: 'stretch', backgroundColor: '#f2f4f6', borderRight: '1px solid #c3c6d7' }}>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {/* Row 1: Customer (disabled) */}
                                    <div>
                                        <label className="form-label" style={{ fontSize: '12px', marginBottom: '2px' }}>{t('Customer')}</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            disabled
                                            value={selectedCustomers?.[0]?.name || formData.customer_name || ''}
                                            placeholder={t('Customer')}
                                            style={{ backgroundColor: '#f8f9fa' }}
                                        />
                                    </div>
                                    {/* Row 2: Date + Phone+WA + VAT + Address + Remarks */}
                                    <div className="sc-sub-row" style={{ alignItems: 'flex-start' }}>
                                        {/* Date */}
                                        <div style={{ flex: '0 0 175px' }}>
                                            <label className="form-label" style={{ fontSize: '12px', marginBottom: '2px' }}>{t('Date')}*</label>
                                            <DatePicker
                                                id="date_str"
                                                selected={formData.date_str ? new Date(formData.date_str) : null}
                                                value={formData.date_str ? format(new Date(formData.date_str), "MMMM d, yyyy h:mm aa", { locale: dateLocale }) : null}
                                                className={`form-control${errors.date_str ? ' is-invalid' : ''}`}
                                                dateFormat="MMMM d, yyyy h:mm aa"
                                                locale={dateLocale}
                                                showTimeSelect
                                                timeIntervals="1"
                                                popperProps={{ strategy: 'fixed' }}
                                                onChange={(value) => { formData.date_str = value; setFormData({ ...formData }); }}
                                            />
                                            {errors.date_str && <div style={{ color: 'red', fontSize: '11px' }}>{t(errors.date_str)}</div>}
                                        </div>
                                        {/* Phone + WhatsApp */}
                                        <div style={{ flex: '0 0 auto' }}>
                                            <label className="form-label" style={{ fontSize: '12px', marginBottom: '2px' }}>{t('Phone')} ( 05.. / +966..)</label>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <input
                                                    id="sales_return_phone" name="sales_return_phone"
                                                    value={formData.phone || ''}
                                                    type="text"
                                                    onChange={(e) => { delete errors["phone"]; setErrors({ ...errors }); formData.phone = e.target.value; setFormData({ ...formData }); }}
                                                    className={`form-control${errors["phone"] ? ' is-invalid' : ''}`}
                                                    placeholder={t('Phone')}
                                                    style={{ width: '115px' }}
                                                />
                                                <button type="button" onClick={sendWhatsAppMessage}
                                                    style={{ background: '#25d366', border: 'none', borderRadius: '4px', padding: '7px 8px', cursor: 'pointer', color: '#fff', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="white" viewBox="0 0 16 16">
                                                        <path d="M13.601 2.326A7.875 7.875 0 0 0 8.036 0C3.596 0 0 3.597 0 8.036c0 1.417.37 2.805 1.07 4.03L0 16l3.993-1.05a7.968 7.968 0 0 0 4.043 1.085h.003c4.44 0 8.036-3.596 8.036-8.036 0-2.147-.836-4.166-2.37-5.673ZM8.036 14.6a6.584 6.584 0 0 1-3.35-.92l-.24-.142-2.37.622.63-2.31-.155-.238a6.587 6.587 0 0 1-1.018-3.513c0-3.637 2.96-6.6 6.6-6.6 1.764 0 3.42.69 4.67 1.94a6.56 6.56 0 0 1 1.93 4.668c0 3.637-2.96 6.6-6.6 6.6Zm3.61-4.885c-.198-.1-1.17-.578-1.352-.644-.18-.066-.312-.1-.444.1-.13.197-.51.644-.626.775-.115.13-.23.15-.428.05-.198-.1-.837-.308-1.594-.983-.59-.525-.99-1.174-1.11-1.372-.116-.198-.012-.305.088-.403.09-.09.198-.23.298-.345.1-.115.132-.197.2-.33.065-.13.032-.247-.017-.345-.05-.1-.444-1.07-.61-1.46-.16-.384-.323-.332-.444-.338l-.378-.007c-.13 0-.344.048-.525.23s-.688.672-.688 1.64c0 .967.704 1.9.802 2.03.1.13 1.386 2.116 3.365 2.963.47.203.837.324 1.122.414.472.15.902.13 1.24.08.378-.057 1.17-.48 1.336-.942.165-.462.165-.858.116-.943-.048-.084-.18-.132-.378-.23Z" />
                                                    </svg>
                                                </button>
                                            </div>
                                            {errors.phone && <div style={{ color: 'red', fontSize: '11px' }}>{t(errors.phone)}</div>}
                                        </div>
                                        {/* VAT */}
                                        <div style={{ flex: '0 0 150px' }}>
                                            <label className="form-label" style={{ fontSize: '12px', marginBottom: '2px' }}>{t('VAT NO.(15 digits)')}</label>
                                            <input
                                                id="sales_vat_no" name="sales_vat_no"
                                                value={formData.vat_no || ''}
                                                type="text"
                                                onChange={(e) => { delete errors["vat_no"]; setErrors({ ...errors }); formData.vat_no = e.target.value; setFormData({ ...formData }); }}
                                                className={`form-control${errors["vat_no"] ? ' is-invalid' : ''}`}
                                                placeholder={t('VAT NO.')}
                                            />
                                            {errors.vat_no && <div style={{ color: 'red', fontSize: '11px' }}>{t(errors.vat_no)}</div>}
                                        </div>
                                        {/* Address */}
                                        <div style={{ flex: '1 1 140px', minWidth: '100px' }}>
                                            <label className="form-label" style={{ fontSize: '12px', marginBottom: '2px' }}>{t('Address')}</label>
                                            <textarea
                                                value={formData.address || ''}
                                                onChange={(e) => { delete errors["address"]; setErrors({ ...errors }); formData.address = e.target.value; setFormData({ ...formData }); }}
                                                onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); } }}
                                                className={`form-control${errors["address"] ? ' is-invalid' : ''}`}
                                                id="address" placeholder={t('Address')}
                                                style={{ resize: 'none', fontSize: '13px', height: '32px' }}
                                            />
                                        </div>
                                        {/* Remarks */}
                                        <div style={{ flex: '1 1 140px', minWidth: '100px' }}>
                                            <label className="form-label" style={{ fontSize: '12px', marginBottom: '2px' }}>{t('Remarks')}</label>
                                            <textarea
                                                value={formData.remarks || ''}
                                                onChange={(e) => { formData.remarks = e.target.value; setFormData({ ...formData }); }}
                                                onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); } }}
                                                className="form-control"
                                                id="remarks" placeholder={t('Remarks')}
                                                style={{ resize: 'none', fontSize: '13px', height: '32px' }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* Right: customer details inline */}
                            {selectedCustomers.length > 0 && formData.customer_id ? (() => {
                                const c = selectedCustomers[0];
                                const storeId = localStorage.getItem("store_id");
                                const cs = c?.stores?.[storeId];
                                const sep = <span style={{ width: '1px', height: '12px', background: '#c3c6d7', flexShrink: 0 }} />;
                                const phone = c.phone || formData.phone;
                                const phone2 = c.phone2;
                                const vatNo = c.vat_no || formData.vat_no;
                                return (
                                    <div className="sc-header-right" style={{ padding: '4px 14px', background: 'rgba(0,74,198,0.03)', borderLeft: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px', overflow: 'hidden', minHeight: '40px' }}>
                                        {c.code && <span style={{ background: '#dbeafe', color: '#1e40af', borderRadius: '4px', padding: '1px 7px', fontSize: '12px', fontWeight: 700, letterSpacing: '0.03em', flexShrink: 0 }}>{c.code}</span>}
                                        <span style={{ fontWeight: 700, fontSize: '15px', color: '#191c1e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, maxWidth: '280px' }}>{c.name}</span>
                                        {c.name_in_arabic && <><span style={{ color: '#c3c6d7', fontSize: '13px', flexShrink: 0 }}>|</span><span style={{ fontSize: '13px', color: '#64748b', fontFamily: 'Arial, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, maxWidth: '200px' }}>{c.name_in_arabic}</span></>}
                                        {(phone || phone2 || vatNo) && sep}
                                        {phone && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#374151', flexShrink: 0 }}><i className="bi bi-telephone" style={{ color: '#6b7280', fontSize: '12px' }} />{phone}</span>}
                                        {phone && phone2 && sep}
                                        {phone2 && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#374151', flexShrink: 0 }}><i className="bi bi-telephone" style={{ color: '#6b7280', fontSize: '12px' }} />{phone2}</span>}
                                        {(phone || phone2) && vatNo && sep}
                                        {vatNo && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#374151', flexShrink: 0 }}><i className="bi bi-receipt" style={{ color: '#6b7280', fontSize: '12px' }} /><span style={{ color: '#6b7280' }}>VAT:</span>{vatNo}</span>}
                                        {sep}
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', cursor: 'pointer', userSelect: 'none', flexShrink: 0 }}
                                            onClick={() => openCustomerPending(selectedCustomers[0])}
                                            title={t("Click to view pendings")}>
                                            <i className="bi bi-wallet2" style={{ color: '#004ac6', fontSize: '13px' }} />
                                            <span style={{ color: '#6b7280' }}>{t("Cr.Balance")}:</span>
                                            <strong style={{ fontSize: '17px', fontWeight: 700, color: (c.credit_balance ?? cs?.credit_balance ?? 0) > 0 ? '#dc2626' : '#16a34a', textDecoration: 'underline dotted' }}>{trimTo2Decimals(c.credit_balance ?? cs?.credit_balance ?? 0)}</strong>
                                            <i className="bi bi-box-arrow-up-right" style={{ color: '#004ac6', fontSize: '10px' }} />
                                        </span>
                                        {(c.credit_limit > 0) && <>{sep}<span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', flexShrink: 0 }}>
                                            <i className="bi bi-shield-check" style={{ color: '#6b7280', fontSize: '13px' }} />
                                            <span style={{ color: '#6b7280' }}>{t("Limit")}:</span>
                                            <strong style={{ fontSize: '15px', fontWeight: 700, color: '#374151' }}>{trimTo2Decimals(c.credit_limit)}</strong>
                                        </span></>}
                                    </div>
                                );
                            })() : <div className="sc-header-right" />}
                        </div>
                    </section>

                    {selectedProducts && selectedProducts.length === 0 && "Already returned all products"}
                    {selectedProducts && selectedProducts.length > 0 && <form className="row g-3 needs-validation" onSubmit={handleCreate}>
                        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0" }}>
                            <button type="button" className="btn btn-sm btn-outline-secondary"
                                onClick={() => setShowSPTableSettings(!showSPTableSettings)}
                                title="Table Settings">
                                <i className="bi bi-gear-fill" style={{ fontSize: "1rem" }} />
                            </button>
                        </div>
                        <div className="table-responsive" style={{ overflowX: "auto", overflowY: "scroll" }}>
                            <table className="table table-striped table-sm table-bordered">
                                <tbody>
                                    <tr className="text-center" style={{ borderBottom: "solid 2px" }}>
                                        {spColumns.filter(c => c.visible).map(col => {
                                            if (col.key === 'select') return <th key={col.key}>{t("Select All")} <br /><input type="checkbox" className="form-check-input" checked={isAllSelected} onChange={handleSelectAll} /></th>;
                                            if (col.key === 'si_no') return <th key={col.key}>{t('SI No.')}</th>;
                                            if (col.key === 'part_number') return <th key={col.key}>{t('Part No.')}</th>;
                                            if (col.key === 'name') return <th key={col.key} style={{ minWidth: "250px" }}>{t('Name')}</th>;
                                            if (col.key === 'info') return <th key={col.key}>{t('Info')}</th>;
                                            if (col.key === 'purchase_unit_price') return <th key={col.key}>{t('Purchase Unit Price(without VAT)')}</th>;
                                            if (col.key === 'stock') return <th key={col.key}>{t('Stock')}</th>;
                                            if (col.key === 'qty') return <th key={col.key}>{t('Qty')}</th>;
                                            if (col.key === 'warehouse') return store.settings?.enable_warehouse_module ? <th key={col.key}>{t('Add Stock To')}</th> : null;
                                            if (col.key === 'unit_price') return <th key={col.key}>{t('Unit Price(without VAT)')}</th>;
                                            if (col.key === 'unit_price_with_vat') return <th key={col.key}>{t('Unit Price(with VAT)')}</th>;
                                            if (col.key === 'unit_discount') return <th key={col.key}>{t('Unit Disc.(without VAT)')}</th>;
                                            if (col.key === 'unit_discount_with_vat') return <th key={col.key}>{t('Unit Disc.(with VAT)')}</th>;
                                            if (col.key === 'unit_discount_percent') return <th key={col.key}>{t('Unit Disc. %(with VAT)')}</th>;
                                            if (col.key === 'price') return <th key={col.key}>{t('Price(without VAT)')}</th>;
                                            if (col.key === 'price_with_vat') return <th key={col.key}>{t('Price(with VAT)')}</th>;
                                            return null;
                                        })}
                                    </tr>
                                    {selectedProducts.map((product, index) => {
                                        // Find all indexes with the same product_id
                                        const duplicateIndexes = selectedProducts
                                            .map((p, i) => p.product_id === product.product_id ? i : -1)
                                            .filter(i => i !== -1);
                                        const duplicateCount = duplicateIndexes.length;
                                        return (
                                            <tr key={index} className="text-center">
                                                {spColumns.filter(c => c.visible).map(col => {
                                                    if (col.key === 'select') return (
                                                        <td key="select" style={{ verticalAlign: 'middle', padding: '0.25rem', width: "20px", whiteSpace: "nowrap" }}>
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
                                                        </td>);
                                                    if (col.key === 'si_no') return (<td key="si_no" style={{ verticalAlign: 'middle', padding: '0.25rem', width: "auto", whiteSpace: "nowrap" }}>{index + 1}</td>);
                                                    // eslint-disable-next-line no-lone-blocks
                                                    {/*<td style={{ verticalAlign: 'middle', padding: '0.25rem', width: "auto", whiteSpace: "nowrap" }}>
                                                <OverflowTooltip maxWidth={120} value={product.prefix_part_number ? product.prefix_part_number + " - " + product.part_number : product.part_number} />
                                            </td>*/}
                                                    if (col.key === 'part_number') return (<ResizableTableCell key="part_number" style={{ verticalAlign: 'middle', padding: '0.25rem', width: "auto", whiteSpace: "nowrap" }}
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
                                                            placeholder={t("Part No.")} onChange={(e) => {
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
                                                            <OverlayTrigger placement="top" overlay={<Tooltip>{errors[`part_number_${index}`] || warnings[`part_number_${index}`] || ''}</Tooltip>}>
                                                                <i
                                                                    className={`bi bi-exclamation-circle-fill ${errors[`part_number_${index}`] ? 'text-danger' : 'text-warning'} ms-2`}
                                                                    style={{ fontSize: '1rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                                                ></i>
                                                            </OverlayTrigger>
                                                        )}

                                                    </ResizableTableCell>);
                                                    if (col.key === 'name') return (<ResizableTableCell key="name" style={{ verticalAlign: 'middle', padding: '0.25rem' }}
                                                    >
                                                        <div className="input-group" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
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
                                                                        selectedProducts[index].name = "";
                                                                        setSelectedProducts([...selectedProducts]);
                                                                        console.log("errors:", errors);
                                                                        return;
                                                                    }

                                                                    selectedProducts[index].name = e.target.value;
                                                                    setSelectedProducts([...selectedProducts]);
                                                                }} />

                                                            <div style={{ display: 'flex', alignItems: 'center', marginLeft: '8px', position: 'relative' }}>
                                                                <div
                                                                    style={{ color: "blue", cursor: "pointer", marginLeft: "2px" }}
                                                                    onClick={() => {
                                                                        openUpdateProductForm(product.product_id);
                                                                    }}
                                                                >
                                                                    <i className="bi bi-pencil"> </i>
                                                                </div>

                                                                <div
                                                                    style={{ color: "blue", cursor: "pointer", marginLeft: "8px" }}
                                                                    onClick={() => {
                                                                        openProductDetails(product.product_id);
                                                                    }}
                                                                >
                                                                    <i className="bi bi-eye"> </i>
                                                                </div>

                                                                {duplicateCount > 1 && (
                                                                    <OverlayTrigger
                                                                        placement="top"
                                                                        overlay={
                                                                            <Tooltip id={`duplicate-tooltip-input-${index}`}>
                                                                                {`${duplicateCount - 1} Duplicate${(duplicateCount - 1) > 1 ? 's' : ''}`}
                                                                            </Tooltip>
                                                                        }
                                                                    >
                                                                        <span style={{
                                                                            position: 'absolute',
                                                                            top: '50%',
                                                                            right: '48px',
                                                                            transform: 'translateY(-50%)',
                                                                            display: 'inline-flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            width: '22px',
                                                                            height: '22px',
                                                                            borderRadius: '50%',
                                                                            background: '#ffc107',
                                                                            color: '#212529',
                                                                            fontWeight: 'bold',
                                                                            fontSize: '0.7rem',
                                                                            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                                                                            cursor: 'pointer',
                                                                            border: '2px solid #fff',
                                                                            zIndex: 2
                                                                        }}>
                                                                            {duplicateCount - 1}
                                                                        </span>
                                                                    </OverlayTrigger>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {(errors[`name_${index}`] || warnings[`name_${index}`]) && (
                                                            <OverlayTrigger placement="top" overlay={<Tooltip>{errors[`name_${index}`] || warnings[`name_${index}`] || ''}</Tooltip>}>
                                                                <i
                                                                    className={`bi bi-exclamation-circle-fill ${errors[`name_${index}`] ? 'text-danger' : 'text-warning'} ms-2`}
                                                                    style={{ fontSize: '1rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                                                ></i>
                                                            </OverlayTrigger>
                                                        )}
                                                    </ResizableTableCell>);
                                                    if (col.key === 'info') return (<td key="info" style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                        <div style={{ zIndex: "9999 !important", position: "absolute !important" }}>
                                                            <Dropdown drop="top">
                                                                <Dropdown.Toggle variant="secondary" id="dropdown-secondary" style={{}}>
                                                                    <i className="bi bi-info"></i>
                                                                </Dropdown.Toggle>
                                                                <Dropdown.Menu style={{ zIndex: 9999, position: "absolute" }} popperConfig={{ modifiers: [{ name: 'preventOverflow', options: { boundary: 'viewport' } }] }}>
                                                                    <Dropdown.Item onClick={() => openLinkedProducts(product)}>
                                                                        <i className="bi bi-link"></i>&nbsp;
                                                                        {t("Linked Products")} ({getShortcut('linkedProducts')})
                                                                    </Dropdown.Item>

                                                                    <Dropdown.Item onClick={() => openProductHistory(product)}>
                                                                        <i className="bi bi-clock-history"></i>&nbsp;
                                                                        {t("History")} ({getShortcut('productHistory')})
                                                                    </Dropdown.Item>

                                                                    <Dropdown.Item onClick={() => openSalesHistory(product)}>
                                                                        <i className="bi bi-clock-history"></i>&nbsp;
                                                                        {t("Sales History")} ({getShortcut('salesHistory')})
                                                                    </Dropdown.Item>

                                                                    <Dropdown.Item onClick={() => openSalesReturnHistory(product)}>
                                                                        <i className="bi bi-clock-history"></i>&nbsp;
                                                                    {t("Sales Return History")} ({getShortcut('salesReturnHistory')})
                                                                </Dropdown.Item>
                                                                <Dropdown.Divider style={{ margin: '4px 0' }} />
                                                                <Dropdown.Item style={{ borderRadius: '6px', padding: '7px 12px' }} onClick={() => openPurchaseHistory(product)}>
                                                                    <i className="bi bi-bag me-2" style={{ color: '#d97706' }}></i>
                                                                    {t("Purchase History")} ({getShortcut('purchaseHistory')})
                                                                </Dropdown.Item>
                                                                <Dropdown.Item style={{ borderRadius: '6px', padding: '7px 12px' }} onClick={() => openPurchaseReturnHistory(product)}>
                                                                    <i className="bi bi-bag-x me-2" style={{ color: '#ea580c' }}></i>
                                                                    {t("Purchase Return History")} ({getShortcut('purchaseReturnHistory')})
                                                                </Dropdown.Item>
                                                                <Dropdown.Divider style={{ margin: '4px 0' }} />
                                                                <Dropdown.Item style={{ borderRadius: '6px', padding: '7px 12px' }} onClick={() => openDeliveryNoteHistory(product)}>
                                                                    <i className="bi bi-truck me-2" style={{ color: '#0891b2' }}></i>
                                                                    {t("Delivery Note History")} ({getShortcut('deliveryNoteHistory')})
                                                                </Dropdown.Item>
                                                                <Dropdown.Item style={{ borderRadius: '6px', padding: '7px 12px' }} onClick={() => openQuotationHistory(product, "quotation")}>
                                                                    <i className="bi bi-file-earmark-text me-2" style={{ color: '#7c3aed' }}></i>
                                                                    {t("Quotation History")} ({getShortcut('quotationHistory')})
                                                                </Dropdown.Item>
                                                                <Dropdown.Item style={{ borderRadius: '6px', padding: '7px 12px' }} onClick={() => openQuotationSalesHistory(product)}>
                                                                    <i className="bi bi-receipt me-2" style={{ color: '#16a34a' }}></i>
                                                                    {t("Qtn. Sales History")} ({getShortcut('quotationSalesHistory')})
                                                                </Dropdown.Item>
                                                                <Dropdown.Item style={{ borderRadius: '6px', padding: '7px 12px' }} onClick={() => openQuotationSalesReturnHistory(product)}>
                                                                    <i className="bi bi-arrow-return-left me-2" style={{ color: '#dc2626' }}></i>
                                                                    {t("Qtn. Sales Return History")} ({getShortcut('quotationSalesReturnHistory')})
                                                                </Dropdown.Item>
                                                                <Dropdown.Item style={{ borderRadius: '6px', padding: '7px 12px' }} onClick={() => openProductImages(product.product_id)}>
                                                                    <i className="bi bi-images me-2" style={{ color: '#64748b' }}></i>
                                                                    {t("Images")} ({getShortcut('images')})
                                                                </Dropdown.Item>
                                                            </Dropdown.Menu>
                                                        </Dropdown>
                                                        </div>
                                                    </td>);
                                                    if (col.key === 'purchase_unit_price') return (<td key="purchase_unit_price" style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                        <div className="input-group">
                                                            <input
                                                                type="number"
                                                                id={`sales_return_product_purchase_unit_price_${index}`}
                                                                name={`sales_return_product_purchase_unit_price_${index}`}
                                                                className={`form-control text-end ${errors["purchase_unit_price_" + index] ? 'is-invalid' : ''} ${warnings["purchase_unit_price_" + index] ? 'border-warning text-warning' : ''}`}
                                                                onWheel={(e) => e.target.blur()}
                                                                value={product.purchase_unit_price}
                                                                placeholder={t("Purchase Unit Price")}
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
                                                                <OverlayTrigger placement="top" overlay={<Tooltip>{errors[`purchase_unit_price_${index}`] || warnings[`purchase_unit_price_${index}`] || ''}</Tooltip>}>
                                                                    <i
                                                                        className={`bi bi-exclamation-circle-fill ${errors[`purchase_unit_price_${index}`] ? 'text-danger' : 'text-warning'} ms-2`}
                                                                        style={{ fontSize: '1rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                                                    ></i>
                                                                </OverlayTrigger>
                                                            )}
                                                        </div>
                                                    </td>);
                                                    if (col.key === 'stock') return (<td key="stock"
                                                        style={{
                                                            verticalAlign: 'middle',
                                                            padding: '0.25rem',
                                                            whiteSpace: 'nowrap',
                                                            width: 'auto',
                                                            position: 'relative',
                                                        }}
                                                    >
                                                        <OverlayTrigger
                                                            placement="top"
                                                            overlay={
                                                                <Tooltip id={`stock-tooltip-${index}`}>
                                                                    {(() => {
                                                                        const warehouseStocks = selectedProducts[index].warehouse_stocks || {};
                                                                        const orderedEntries = [];
                                                                        if (warehouseStocks.hasOwnProperty("main_store")) {
                                                                            orderedEntries.push(["main_store", warehouseStocks["main_store"]]);
                                                                        }
                                                                        Object.entries(warehouseStocks).forEach(([key, value]) => {
                                                                            if (key !== "main_store") {
                                                                                orderedEntries.push([key, value]);
                                                                            }
                                                                        });
                                                                        const details = orderedEntries
                                                                            .map(([key, value]) => {
                                                                                let name = key === "main_store" ? t("Main Store") : key.replace(/^wh/, "WH").toUpperCase();
                                                                                return `${name}: ${value}`;
                                                                            })
                                                                            .join(", ");
                                                                        return details ? `(${details})` : "(" + t("Main Store") + ": " + selectedProducts[index].stock + ")";
                                                                    })()}
                                                                </Tooltip>
                                                            }
                                                        >
                                                            <span style={{ cursor: "pointer", textDecoration: "underline dotted" }}>
                                                                {selectedProducts[index].stock}
                                                            </span>
                                                        </OverlayTrigger>
                                                    </td>);
                                                    if (col.key === 'qty') return (<td key="qty" style={{
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
                                                                    disabled={isZatcaReported}
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
                                                                <OverlayTrigger placement="top" overlay={<Tooltip>{errors[`quantity_${index}`] || warnings[`quantity_${index}`] || ''}</Tooltip>}>
                                                                    <i
                                                                        className={`bi bi-exclamation-circle-fill ${errors[`quantity_${index}`] ? 'text-danger' : 'text-warning'} ms-2`}
                                                                        style={{ fontSize: '1rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                                                    ></i>
                                                                </OverlayTrigger>
                                                            )}
                                                        </div>
                                                    </td>);
                                                    if (col.key === 'warehouse') return store.settings?.enable_warehouse_module ? (<td key="warehouse" style={{
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
                                                                checkWarning(index, selectedProducts[index]);
                                                            }}
                                                        >
                                                            <option value="main_store">{t("Main Store")}</option>
                                                            {warehouseList.map((warehouse) => (
                                                                <option key={warehouse.id} value={warehouse.id}>
                                                                    {warehouse.name} ({warehouse.code})
                                                                </option>
                                                            ))}
                                                        </select>
                                                        {errors[`warehouse_${index}`] && (
                                                            <div style={{ color: "red" }}>
                                                                {t(errors[`warehouse_${index}`])}
                                                            </div>
                                                        )}
                                                    </td>) : null;
                                                    if (col.key === 'unit_price') return (<td key="unit_price" style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                        <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                                                            <div className="input-group flex-nowrap" style={{ flex: '1 1 auto', minWidth: 0 }}>
                                                                <input type="number"
                                                                    id={`${"sales_return_product_unit_price_" + index}`}
                                                                    name={`${"sales_return_product_unit_price_" + index}`}
                                                                    onWheel={(e) => e.target.blur()}
                                                                    disabled={isZatcaReported}
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
                                                                            errors["unit_price_" + index] = t("Max decimal points allowed is 8");
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
                                                                <OverlayTrigger placement="top" overlay={<Tooltip>{errors[`unit_price_${index}`] || warnings[`unit_price_${index}`] || ''}</Tooltip>}>
                                                                    <i
                                                                        className={`bi bi-exclamation-circle-fill ${errors[`unit_price_${index}`] ? 'text-danger' : 'text-warning'} ms-2`}
                                                                        style={{ fontSize: '1rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                                                    ></i>
                                                                </OverlayTrigger>
                                                            )}
                                                        </div>
                                                    </td>);
                                                    if (col.key === 'unit_price_with_vat') return (<td key="unit_price_with_vat" style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                        <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                                                            <div className="input-group flex-nowrap" style={{ flex: '1 1 auto', minWidth: 0 }}>
                                                                <input type="number"
                                                                    id={`${"sales_return_product_unit_price_with_vat_" + index}`}
                                                                    name={`${"sales_return_product_unit_price_with_vat_" + index}`}
                                                                    onWheel={(e) => e.target.blur()}
                                                                    disabled={isZatcaReported}
                                                                    value={selectedProducts[index].unit_price_with_vat}
                                                                    className={`form-control text-end ${errors["unit_price_with_vat_" + index] ? 'is-invalid' : ''} ${warnings["unit_price_with_vat_" + index] ? 'border-warning text-warning' : ''}`}
                                                                    ref={(el) => {
                                                                        if (!inputRefs.current[index]) inputRefs.current[index] = {};
                                                                        inputRefs.current[index][`${"sales_return_product_unit_price_with_vat_" + index}`] = el;
                                                                    }}
                                                                    placeholder={t("Unit Price(with VAT)")}

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
                                                                            errors["unit_price_with_vat_" + index] = t("Unit Price should be > 0");
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
                                                                            errors["unit_price_with_vat_" + index] = t("Max decimal points allowed is 8");
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
                                                                <OverlayTrigger placement="top" overlay={<Tooltip>{errors[`unit_price_with_vat_${index}`] || warnings[`unit_price_with_vat_${index}`] || ''}</Tooltip>}>
                                                                    <i
                                                                        className={`bi bi-exclamation-circle-fill ${errors[`unit_price_with_vat_${index}`] ? 'text-danger' : 'text-warning'} ms-2`}
                                                                        style={{ fontSize: '1rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                                                    ></i>
                                                                </OverlayTrigger>
                                                            )}
                                                        </div>
                                                    </td>);
                                                    if (col.key === 'unit_discount') return (<td key="unit_discount" style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                        <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                                                            <div className="input-group flex-nowrap" style={{ flex: '1 1 auto', minWidth: 0 }}>
                                                                <input type="number"
                                                                    id={`${"sales_return_unit_discount_" + index}`}
                                                                    name={`${"sales_return_unit_discount_" + index}`}
                                                                    onWheel={(e) => e.target.blur()}
                                                                    disabled={isZatcaReported}
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
                                                                            errors["unit_discount_" + index] = t("Unit discount should be >= 0");
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
                                                                            errors["unit_discount_" + index] = t("Max decimal points allowed is 8");
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
                                                                <OverlayTrigger placement="top" overlay={<Tooltip>{errors[`unit_discount_${index}`] || warnings[`unit_discount_${index}`] || ''}</Tooltip>}>
                                                                    <i
                                                                        className={`bi bi-exclamation-circle-fill ${errors[`unit_discount_${index}`] ? 'text-danger' : 'text-warning'} ms-2`}
                                                                        style={{ fontSize: '1rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                                                    ></i>
                                                                </OverlayTrigger>
                                                            )}
                                                        </div>
                                                    </td>);
                                                    if (col.key === 'unit_discount_with_vat') return (<td key="unit_discount_with_vat" style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                        <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                                                            <div className="input-group flex-nowrap" style={{ flex: '1 1 auto', minWidth: 0 }}>
                                                                <input type="number"
                                                                    id={`${"sales_return_unit_discount_with_vat_" + index}`}
                                                                    name={`${"sales_return_unit_discount_with_vat_" + index}`}
                                                                    onWheel={(e) => e.target.blur()}
                                                                    disabled={isZatcaReported}
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
                                                                            errors["unit_discount_with_vat_" + index] = t("Max decimal points allowed is 8");
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
                                                                <OverlayTrigger placement="top" overlay={<Tooltip>{errors[`unit_discount_with_vat_${index}`] || warnings[`unit_discount_with_vat_${index}`] || ''}</Tooltip>}>
                                                                    <i
                                                                        className={`bi bi-exclamation-circle-fill ${errors[`unit_discount_with_vat_${index}`] ? 'text-danger' : 'text-warning'} ms-2`}
                                                                        style={{ fontSize: '1rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                                                    ></i>
                                                                </OverlayTrigger>
                                                            )}
                                                        </div>
                                                    </td>);
                                                    // eslint-disable-next-line no-lone-blocks
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
                                                    if (col.key === 'unit_discount_percent') return (<td key="unit_discount_percent" style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
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
                                                                            errors["unit_discount_percent_" + index] = t("Unit discount % should be greater than or equal to 0");
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
                                                                <OverlayTrigger placement="top" overlay={<Tooltip>{errors[`unit_discount_percent_with_vat_${index}`] || warnings[`unit_discount_percent_with_vat_${index}`] || ''}</Tooltip>}>
                                                                    <i
                                                                        className={`bi bi-exclamation-circle-fill ${errors[`unit_discount_percent_with_vat_${index}`] ? 'text-danger' : 'text-warning'} ms-2`}
                                                                        style={{ fontSize: '1rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                                                    ></i>
                                                                </OverlayTrigger>
                                                            )}
                                                        </div>
                                                    </td>);
                                                    if (col.key === 'price') return (<td key="price" style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                        <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                                                            <div className="input-group flex-nowrap" style={{ flex: '1 1 auto', minWidth: 0 }}>
                                                                <input type="number"
                                                                    id={`${"sales_product_line_total_" + index}`}
                                                                    name={`${"sales_product_line_total_" + index}`}
                                                                    onWheel={(e) => e.target.blur()}
                                                                    disabled={isZatcaReported}
                                                                    value={parseFloat(trimTo2Decimals(((selectedProducts[index].unit_price || 0) - (selectedProducts[index].unit_discount || 0)) * (selectedProducts[index].quantity || 0))) || ""}
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
                                                                            errors["line_total_" + index] = t("Max decimal points allowed is 2");
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
                                                                <OverlayTrigger placement="top" overlay={<Tooltip>{errors[`line_total_${index}`] || warnings[`line_total_${index}`] || ''}</Tooltip>}>
                                                                    <i
                                                                        className={`bi bi-exclamation-circle-fill ${errors[`line_total_${index}`] ? 'text-danger' : 'text-warning'} ms-2`}
                                                                        style={{ fontSize: '1rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                                                    ></i>
                                                                </OverlayTrigger>
                                                            )}
                                                        </div>
                                                    </td>);
                                                    if (col.key === 'price_with_vat') return (<td key="price_with_vat" style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                        <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                                                            <div className="input-group flex-nowrap" style={{ flex: '1 1 auto', minWidth: 0 }}>
                                                                <input type="number"
                                                                    id={`${"sales_product_line_total_with_vat" + index}`}
                                                                    name={`${"sales_product_line_total_with_vat" + index}`}
                                                                    onWheel={(e) => e.target.blur()}
                                                                    disabled={isZatcaReported}
                                                                    value={parseFloat(trimTo2Decimals(((selectedProducts[index].unit_price_with_vat || 0) - (selectedProducts[index].unit_discount_with_vat || 0)) * (selectedProducts[index].quantity || 0))) || ""}
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
                                                                            errors["line_total_with_vat_" + index] = t("Max decimal points allowed is 2");
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
                                                                <OverlayTrigger placement="top" overlay={<Tooltip>{errors[`line_total_with_vat_${index}`] || warnings[`line_total_with_vat_${index}`] || ''}</Tooltip>}>
                                                                    <i
                                                                        className={`bi bi-exclamation-circle-fill ${errors[`line_total_with_vat_${index}`] ? 'text-danger' : 'text-warning'} ms-2`}
                                                                        style={{ fontSize: '1rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                                                    ></i>
                                                                </OverlayTrigger>
                                                            )}
                                                        </div>
                                                    </td>);
                                                    return null;
                                                })}
                                            </tr>);
                                    }).reverse()}
                                </tbody>
                            </table>
                        </div>
                        <div className="table-responsive" style={{ overflowX: "auto" }}>
                            <table className="table table-striped table-sm table-bordered">
                                <tbody>
                                    <tr>
                                        <th colSpan="8" className="text-end">{t("Total(without VAT)")}</th>
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
                                        <th colSpan="8" className="text-end">{t("Total(with VAT)")}</th>
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
                                            {t("Shipping & Handling Fees")}
                                        </th>
                                        <td className="text-end">
                                            <input type="number" id="sales_shipping_fees" name="sales_shipping_fees" onWheel={(e) => e.target.blur()} disabled={isZatcaReported} style={{ width: "150px" }} className="text-start" value={shipping} onChange={(e) => {
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
                                                    errors["shipping_handling_fees"] = t("Max. decimal points allowed is 2");
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
                                                    {t(errors.shipping_handling_fees)}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                    <tr>
                                        <th colSpan="8" className="text-end">
                                            {t("Discount(without VAT)")} <input type="number" id="discount_percent" name="discount_percent" onWheel={(e) => e.target.blur()} disabled={true} style={{ width: "50px" }} className="text-start" value={discountPercent} onChange={(e) => {
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
                                                    {t(errors.discount_percent)}
                                                </div>
                                            )}
                                        </th>
                                        <td className="text-end">
                                            <input type="number"
                                                id="sales_discount"
                                                name="sales_discount"
                                                onWheel={(e) => e.target.blur()} disabled={isZatcaReported} style={{ width: "150px" }}
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
                                                        errors["discount"] = t("Max. decimal points allowed is 2");
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
                                                    {t(errors.discount)}
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

                                                        errors["discount_percent_with_vat"] = t("Discount percent should be greater than or equal to zero");
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
                                                disabled={isZatcaReported}
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
                                                        errors["discount_with_vat"] = t("Max. decimal points allowed is 2");
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
                                            {t("Total Taxable Amount(without VAT)")}
                                            <OverlayTrigger placement="left" overlay={renderTooltip()}>
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

                                        <th colSpan="8" className="text-end"> {t("VAT")}  <input type="number" id="sales_vat_percent" name="sales_vat_percent" onWheel={(e) => e.target.blur()} disabled={true} className="text-center" style={{ width: "50px" }} value={formData.vat_percent} onChange={(e) => {
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
                                                errors["vat_percent"] = t("Vat percent should be greater than or equal to zero");
                                                setErrors({ ...errors });
                                                reCalculate();
                                                return;
                                            }


                                            if (!e.target.value) {
                                                formData.vat_percent = "";
                                                formData.vat_price = 0.00;
                                                //formData.discount_percent = 0.00;
                                                errors["vat_percent"] = t("Invalid vat percent");
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
                                            {t("Net Total(with VAT) Before Rounding")}
                                            <OverlayTrigger placement="left" overlay={renderNetTotalBeforeRoundingTooltip()}>
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

                                        <th colSpan="8" className="text-end">  {t("Rounding Amount")}
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
                                                }} />{" " + t("Auto Calculate") + "]"}
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

                                                            errors["rounding_amount"] = t("Max. decimal points allowed is 2");
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
                                                    {t(errors.rounding_amount)}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                    <tr>
                                        <th colSpan="8" className="text-end">
                                            {t("Net Total(with VAT)")}
                                            <OverlayTrigger placement="left" overlay={renderNetTotalTooltip()}>
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
                            <label className="form-label">{t("Cash discount")}</label>
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
                                        errors["cash_discount"] = t("Cash discount should not be greater than or equal to Net Total: {{netTotal}}", {
                                            netTotal: formData.net_total?.toString(),
                                        });
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
                                    {t(errors.cash_discount)}
                                </div>
                            )}
                        </div>


                        <div className="col-md-8">
                            <label className="form-label">{t("Payments given")}</label>
                            <div class="table-responsive" style={{ maxWidth: "900px" }} >
                                <Button variant="secondary" style={{ alignContent: "right" }} disabled={order.payment_status === "not_paid"} onClick={addNewPayment}>
                                    {t("Create new payment")}
                                </Button>
                                <table class="table table-striped table-sm table-bordered">
                                    <thead>
                                        <th>
                                            {t("Date")}
                                        </th>
                                        <th>
                                            {t("Amount")}
                                        </th>
                                        <th>
                                            {t("Payment method")}
                                        </th>
                                        <th>
                                            {t("Reference")}
                                        </th>
                                        <th>
                                            {t("Action")}
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
                                                                "MMMM d, yyyy h:mm aa",
                                                                { locale: dateLocale }
                                                            ) : null}
                                                            className="form-control"
                                                            dateFormat="MMMM d, yyyy h:mm aa"
                                                            locale={dateLocale}
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
                                                                {t(errors["payment_date_" + key])}
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
                                                                {t(errors["payment_amount_" + key])}
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
                                                                    errors["payment_method_" + key] = t("Payment method is required");
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
                                                            <option value="">{t("Select")}</option>
                                                            <option value="cash">{t("Cash")}</option>
                                                            <option value="debit_card">{t("Debit Card")}</option>
                                                            <option value="credit_card">{t("Credit Card")}</option>
                                                            <option value="bank_card">{t("Bank Card")}</option>
                                                            <option value="bank_transfer">{t("Bank Transfer")}</option>
                                                            <option value="bank_cheque">{t("Bank Cheque")}</option>
                                                            <option value="sales">{t("Sales")}</option>
                                                            <option value="customer_account">{t("Customer Account")}</option>
                                                        </select>
                                                        {errors["payment_method_" + key] && (
                                                            <div style={{ color: "red" }}>
                                                                {t(errors["payment_method_" + key])}
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
                                                            {t("Remove")}
                                                        </Button>

                                                    </td>
                                                </tr>
                                            ))}
                                        <tr>
                                            <td class="text-end">
                                                <b>{t("Total")}</b>
                                            </td>
                                            <td><b style={{ marginLeft: "14px" }}>{trimTo2Decimals(totalPaymentAmount)}</b>
                                                {errors["total_payment"] && (
                                                    <div style={{ color: "red" }}>
                                                        {t(errors["total_payment"])}
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                <b style={{ marginLeft: "12px", alignSelf: "end" }}>{t("Balance")}: {trimTo2Decimals(balanceAmount)}</b>
                                                {errors["customer_credit_limit"] && (
                                                    <div style={{ color: "red" }}>
                                                        {t(errors["customer_credit_limit"])}
                                                    </div>
                                                )}
                                            </td>
                                            <td colSpan={2}>
                                                <b>{t("Payment status")}: </b>
                                                {paymentStatus === "paid" ?
                                                    <span className="badge bg-success">
                                                        {t("Paid")}
                                                    </span> : ""}
                                                {paymentStatus === "paid_partially" ?
                                                    <span className="badge bg-warning">
                                                        {t("Paid Partially")}
                                                    </span> : ""}
                                                {paymentStatus === "not_paid" ?
                                                    <span className="badge bg-danger">
                                                        {t("Not Paid")}
                                                    </span> : ""}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>

                            </div>
                        </div>

                        <div className="row">
                            <div className="col-md-2">
                                <label className="form-label">{t("Commission")}</label>
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
                                            errors["commission"] = t("Commission should not be greater than or equal to Net Total: {{netTotal}}", {
                                                netTotal: formData.net_total?.toString(),
                                            });
                                            setErrors({ ...errors });
                                            return;
                                        }

                                        if (commission > 0 && !formData.commission_payment_method) {
                                            errors["commission_payment_method"] = t("Payment method is required");
                                            setErrors({ ...errors });
                                            return;
                                        }


                                        //console.log(formData);
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
                                <label className="form-label">{t("Commission Payment Method")}</label>
                                <select value={formData.commission_payment_method} className="form-control "
                                    onChange={(e) => {
                                        // errors["payment_method"] = [];
                                        delete errors["commission_payment_method"];
                                        setErrors({ ...errors });

                                        if (!e.target.value && commission > 0) {
                                            errors["commission_payment_method"] = t("Payment method is required");
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
                                    <option value="">{t("Select")}</option>
                                    <option value="cash">{t("Cash")}</option>
                                    <option value="debit_card">{t("Debit Card")}</option>
                                    <option value="credit_card">{t("Credit Card")}</option>
                                    <option value="bank_card">{t("Bank Card")}</option>
                                    <option value="bank_transfer">{t("Bank Transfer")}</option>
                                    <option value="bank_cheque">{t("Bank Cheque")}</option>
                                </select>
                                {errors["commission_payment_method"] && (
                                    <div style={{ color: "red" }}>
                                        {t(errors["commission_payment_method"])}
                                    </div>
                                )}
                            </div>
                        </div>

                        <Modal.Footer>
                            <Button variant="secondary" onClick={handleClose}>
                                {t("Close")}
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

                                        : formData.id ? t("Update") : t("Create")
                                    }
                                </Button>}
                        </Modal.Footer>
                    </form>}
                </Modal.Body>

            </Modal >
            )}

            {/* ── SP Table Settings Modal ── */}
            <Modal show={showSPTableSettings} onHide={() => setShowSPTableSettings(false)} size="sm">
                <Modal.Header closeButton>
                    <Modal.Title>Table Settings</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <button className="btn btn-sm btn-outline-secondary mb-2" onClick={restoreDefaultSPSettings}>
                        Restore Defaults
                    </button>
                    <DragDropContext onDragEnd={onDragEndSP}>
                        <Droppable droppableId="sp-columns">
                            {(provided) => (
                                <ul className="list-group" {...provided.droppableProps} ref={provided.innerRef}>
                                    {spColumns.map((col, i) => (
                                        <Draggable key={col.key} draggableId={col.key} index={i}>
                                            {(provided) => (
                                                <li className="list-group-item d-flex align-items-center gap-2 py-1 px-2"
                                                    ref={provided.innerRef} {...provided.draggableProps}>
                                                    <span {...provided.dragHandleProps} style={{ cursor: 'grab', color: '#888' }}>&#9776;</span>
                                                    <input type="checkbox" className="form-check-input mt-0"
                                                        checked={col.visible} onChange={() => handleToggleSPColumn(i)} />
                                                    <span className="ms-1" style={{ fontSize: '0.85rem' }}>{col.label}</span>
                                                </li>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </ul>
                            )}
                        </Droppable>
                    </DragDropContext>
                </Modal.Body>
            </Modal>
        </>
    );
});

export default SalesReturnCreate;
