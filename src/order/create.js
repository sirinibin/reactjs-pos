import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback, useMemo } from "react";
import OrderPreview from "./preview.js";
import { Modal, Button, Alert } from "react-bootstrap";
//import ProductHistory from "./../product/product_history.js";
import ProductHistory from "../utils/product_history.js";
import SalesHistory from "../utils/product_sales_history.js";
import CustomerCreate from "./../customer/create.js";
import ProductCreate from "./../product/create.js";
import UserCreate from "./../user/create.js";
import SignatureCreate from "./../signature/create.js";
import { Typeahead, Menu, MenuItem } from "react-bootstrap-typeahead";
import NumberFormat from "react-number-format";
import DatePicker from "react-datepicker";
import { format } from "date-fns";
import { getDateLocale } from "../i18n/dateLocales";
import OrderView from "./view.js";
import "./style.css";
import "../tailwind.generated.css";
import { DebounceInput } from 'react-debounce-input';
//import BarcodeScannerComponent from "react-qr-barcode-scanner";
//import Quagga from 'quagga';
import ProductView from "./../product/view.js";
import { Spinner } from "react-bootstrap";
//import debounce from 'lodash.debounce';
import ResizableTableCell from './../utils/ResizableTableCell';
import { Dropdown } from 'react-bootstrap';

import SalesReturnHistory from "./../utils/product_sales_return_history.js";
import PurchaseHistory from "./../utils/product_purchase_history.js";
import PurchaseReturnHistory from "./../utils/product_purchase_return_history.js";
import QuotationHistory from "./../utils/product_quotation_history.js";
import QuotationSalesReturnHistory from "./../utils/product_quotation_sales_return_history.js";
import DeliveryNoteHistory from "./../utils/product_delivery_note_history.js";
import Products from "../utils/products.js";
import Quotations from "./../utils/quotations.js";
import Quotation from "./../quotation/create.js";
import DeliveryNote from "./../delivery_note/create.js";
import DeliveryNotes from "./../utils/delivery_notes.js";
import Customers from "./../utils/customers.js";
import Amount from "../utils/amount.js";
import { trimTo2Decimals } from "../utils/numberUtils";
import { trimTo8Decimals } from "../utils/numberUtils";
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import ImageViewerModal from './../utils/ImageViewerModal';
import * as bootstrap from 'bootstrap';
//import OverflowTooltip from "../utils/OverflowTooltip.js";
import { highlightWords } from "../utils/search.js";
import OrderPrint from './print.js';
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

import PurchaseCreate from "../purchase/create.js";
import CustomerDepositCreate from "../customer_deposit/create.js";
import SalesReturnCreate from "../sales_return/create.js";
import CustomerPending from "./../utils/customer_pending.js";
import Badge from 'react-bootstrap/Badge';
import { useTranslation } from 'react-i18next';
import eventEmitter from '../utils/eventEmitter';

function _dnFormatTimeAgo(isoString) {
    if (!isoString) return '';
    const now = new Date();
    const then = new Date(isoString);
    const diffMs = now - then;
    if (diffMs < 0) return 'just now';
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return diffSec + 's ago';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return diffMin + 'm ago';
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return diffHr + 'h ago';
    return Math.floor(diffHr / 24) + 'd ago';
}
function _dnFormatDateTime(isoString) {
    if (!isoString) return '';
    return new Date(isoString).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true,
    });
}
function _getDnDismissedMap() {
    try { return JSON.parse(localStorage.getItem('dn_dismissed') || '{}'); } catch (_) { return {}; }
}
function _saveDnDismissedMap(map) {
    localStorage.setItem('dn_dismissed', JSON.stringify(map));
}

const columnStyle = {
    width: '20%',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    paddingRight: '8px',
    border: "solid 0px"
};

const OrderCreate = forwardRef((props, ref) => {
    const { t, i18n } = useTranslation('common');
    const dateLocale = useMemo(() => getDateLocale(i18n.language), [i18n.language]);

    useImperativeHandle(ref, () => ({
        async open(id) {
            if (id) {
                isUpdateForm = true;
            } else {
                isUpdateForm = false;
            }
            setIsUpdateForm(isUpdateForm)
            //ResetFormData();
            errors = {};
            setErrors({ ...errors });
            warnings = {};
            setWarnings({ ...warnings });

            selectedProducts = [];
            setSelectedProducts([]);

            selectedCustomers = [];
            setSelectedCustomers([]);
            formData.customer_id = "";
            formData.customer_name = "";
            formData.customerName = "";
            customerSearchRef?.current?.clear();

            if (localStorage.getItem("user_id")) {
                selectedDeliveredByUsers = [{
                    id: localStorage.getItem("user_id"),
                    name: localStorage.getItem("user_name"),
                }];
                formData.delivered_by = localStorage.getItem("user_id");
                setFormData({ ...formData });
                setSelectedDeliveredByUsers([...selectedDeliveredByUsers]);
            }

            if (localStorage.getItem('store_id')) {
                getStore(localStorage.getItem('store_id'));
                formData["store_id"] = localStorage.getItem('store_id');
                formData["store_name"] = localStorage.getItem('store_name');
                setFormData({ ...formData });
                console.log("formData.store_id:", formData.store_id);
                console.log("formData.store_id:", formData.store_id);
            }

            discount = 0;
            setDiscount(discount);

            discountPercentWithVAT = 0;
            setDiscountPercentWithVAT(discountPercentWithVAT);

            discount = 0;
            setDiscount(discount);

            discountPercent = 0;
            setDiscountPercent(discountPercent);



            formData.id = undefined;
            formData.vat_no = "";
            formData.enable_report_to_zatca = false;
            formData.customerName = "";
            formData.discount = 0.00;
            formData.phone = "";
            formData.code = "";
            formData.discount_percent = 0.00;
            formData.discount_percent_with_vat = 0.00;
            formData.discount_with_vat = 0.00;
            formData.shipping_handling_fees = 0.00;
            formData.partial_payment_amount = 0.00;
            formData.payment_method = "";
            formData.payment_status = "";
            formData.remarks = ""
            formData.rounding_amount = 0.00;
            formData.return_amount = 0.00;
            formData.auto_rounding_amount = true;
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

            ResetForm();

            if (id) {
                getOrder(id);
            }

            setFormData({ ...formData });
            reCalculate();
            setShow(true);
        },
        async openForDeliveryNote(dnId) {
            // Open in create mode, then auto-import the delivery note products
            await this.open();
            setTimeout(() => {
                handleSelectedDeliveryNote({ id: dnId });
            }, 200);
        },
    }));

    async function open(id) {
        if (id) {
            isUpdateForm = true;
        } else {
            isUpdateForm = false;
        }
        setIsUpdateForm(isUpdateForm)
        //ResetFormData();
        errors = {};
        setErrors({ ...errors });
        warnings = {};
        setWarnings({ ...warnings });

        selectedProducts = [];
        setSelectedProducts([]);

        selectedCustomers = [];
        setSelectedCustomers([]);
        formData.customer_id = "";
        formData.customer_name = "";
        formData.customerName = "";
        customerSearchRef?.current?.clear();

        if (localStorage.getItem("user_id")) {
            selectedDeliveredByUsers = [{
                id: localStorage.getItem("user_id"),
                name: localStorage.getItem("user_name"),
            }];
            formData.delivered_by = localStorage.getItem("user_id");
            setFormData({ ...formData });
            setSelectedDeliveredByUsers([...selectedDeliveredByUsers]);
        }

        if (localStorage.getItem('store_id')) {
            getStore(localStorage.getItem('store_id'));
            formData["store_id"] = localStorage.getItem('store_id');
            formData["store_name"] = localStorage.getItem('store_name');
            setFormData({ ...formData });
            console.log("formData.store_id:", formData.store_id);
            console.log("formData.store_id:", formData.store_id);
        }

        discount = 0;
        setDiscount(discount);

        discountPercentWithVAT = 0;
        setDiscountPercentWithVAT(discountPercentWithVAT);

        discount = 0;
        setDiscount(discount);

        discountPercent = 0;
        setDiscountPercent(discountPercent);


        formData.id = undefined;

        formData.vat_no = "";
        formData.enable_report_to_zatca = false;
        formData.discount = 0.00;
        formData.phone = "";
        formData.code = "";
        formData.discount_percent = 0.00;
        formData.discount_percent_with_vat = 0.00;
        formData.discount_with_vat = 0.00;
        formData.shipping_handling_fees = 0.00;
        formData.partial_payment_amount = 0.00;
        formData.payment_method = "";
        formData.payment_status = "";
        formData.remarks = ""
        formData.rounding_amount = 0.00;
        formData.auto_rounding_amount = true;
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

        ResetForm();

        if (id) {
            getOrder(id);
        }

        setFormData({ ...formData });
        reCalculate();
        setShow(true);

    }

    let [isUpdateForm, setIsUpdateForm] = useState(false);

    function ResetForm() {
        cashDiscount = "";
        setCashDiscount(cashDiscount);

        commission = "";
        setCommission(commission);

        shipping = 0.00;
        setShipping(shipping);

        discount = 0.00;
        setDiscount(discount);

        roundingAmount = 0.00;
        setRoundingAmount(roundingAmount);

        discountPercent = 0.00;
        setDiscountPercent(discountPercent);

        discountWithVAT = 0.00;
        setDiscountWithVAT(discountWithVAT);

        discountPercentWithVAT = 0.00;
        setDiscountPercentWithVAT(discountPercentWithVAT);

    }

    let [oldProducts, setOldProducts] = useState([]);

    let [store, setStore] = useState({});

    async function getStore(id) {
        console.log("inside get Store");
        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': localStorage.getItem('access_token'),
            },
        };

        await fetch('/v1/store/' + id, requestOptions)
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
                formData.vat_percent = parseFloat(store.vat_percent);
                if (store?.zatca?.phase !== "2") {
                    formData.enable_report_to_zatca = false;
                }
                setFormData({ ...formData });
            })
            .catch(error => {

            });
    }


    async function getOrder(id) {
        console.log("inside get Order");
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

        await fetch('/v1/order/' + id + "?" + queryParams, requestOptions)
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

                setProcessing(false);

                formData = data.result;
                oldProducts = formData.products.map(obj => ({ ...obj }));
                setOldProducts([...oldProducts]);

                formData.enable_report_to_zatca = false;
                formData.date_str = data.result.date;

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
                    discount = formData.discount;
                    setDiscount(discount);
                }

                if (data.result?.discount_with_vat) {
                    discountWithVAT = formData.discount_with_vat;
                    setDiscountWithVAT(discountWithVAT);
                }

                if (data.result?.discount_percent) {
                    discountPercent = formData.discount_percent;
                    setDiscountPercent(discountPercent);
                }

                if (data.result?.shipping_handling_fees) {
                    shipping = formData.shipping_handling_fees;
                    setShipping(shipping);
                }


                if (data.result?.payments) {
                    console.log("data.result.payments:", data.result.payments);
                    formData.payments_input = data.result.payments;
                    for (var i = 0; i < formData.payments_input?.length; i++) {
                        formData.payments_input[i].date_str = formData.payments_input[i].date
                    }
                    setFormData({ ...formData });
                }

                if (formData.is_discount_percent) {
                    formData.discountValue = formData.discount_percent;
                } else {
                    formData.discountValue = formData.discount;
                }

                selectedProducts = formData.products;
                setSelectedProducts([...selectedProducts]);


                /*selectedProducts.forEach((product, index) => {
                    CalCulateLineTotals(index);
                });*/

                const updatedProducts = selectedProducts.map((product, index) => {
                    // Calculate line totals without calling setSelectedProducts inside the loop
                    const updatedProduct = { ...product };
                    updatedProduct.line_total = parseFloat(trimTo2Decimals((updatedProduct.unit_price - updatedProduct.unit_discount) * updatedProduct.quantity));
                    updatedProduct.line_total_with_vat = parseFloat(trimTo2Decimals((updatedProduct.unit_price_with_vat - updatedProduct.unit_discount_with_vat) * updatedProduct.quantity));
                    return updatedProduct;
                });
                setSelectedProducts(updatedProducts);


                if (formData.customer_name && formData.customer_id) {
                    let selectedCustomers = [
                        {
                            id: formData.customer_id,
                            name: formData.customer_name,
                            vat_no: formData.customer?.vat_no || "",
                            search_label: formData.customer?.search_label || "",
                            credit_balance: formData.customer?.credit_balance || 0,
                        }
                    ];
                    setSelectedCustomers([...selectedCustomers]);
                }

                reCalculate();
                setFormData({ ...formData });


                checkWarnings();
                checkErrors();
            })
            .catch(error => {
                setProcessing(false);
                setErrors(error);
            });
    }


    function formatLoadedSales(data) {
        oldProducts = formData.products.map(obj => ({ ...obj }));
        setOldProducts([...oldProducts]);

        formData.enable_report_to_zatca = false;
        formData.date_str = data.result.date;

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
            discount = formData.discount;
            setDiscount(discount);
        }

        if (data.result?.discount_with_vat) {
            discountWithVAT = formData.discount_with_vat;
            setDiscountWithVAT(discountWithVAT);
        }

        if (data.result?.discount_percent) {
            discountPercent = formData.discount_percent;
            setDiscountPercent(discountPercent);
        }

        if (data.result?.shipping_handling_fees) {
            shipping = formData.shipping_handling_fees;
            setShipping(shipping);
        }


        if (data.result?.payments) {
            console.log("data.result.payments:", data.result.payments);
            formData.payments_input = data.result.payments;
            for (var i = 0; i < formData.payments_input?.length; i++) {
                formData.payments_input[i].date_str = formData.payments_input[i].date
            }
            setFormData({ ...formData });
        }

        if (formData.is_discount_percent) {
            formData.discountValue = formData.discount_percent;
        } else {
            formData.discountValue = formData.discount;
        }

        selectedProducts = formData.products;
        setSelectedProducts([...selectedProducts]);


        selectedProducts.forEach((product, index) => {
            CalCulateLineTotals(index);
        });


        if (formData.customer_name && formData.customer_id && formData.customer_name && formData.customer?.search_label) {
            let selectedCustomers = [
                {
                    id: formData.customer_id,
                    name: formData.customer_name,
                    search_label: formData.customer.search_label,
                }
            ];
            setSelectedCustomers([...selectedCustomers]);
        }

        reCalculate();
        setFormData({ ...formData });


        checkWarnings();
        checkErrors();
    }


    async function getPreviousOrder(id) {
        console.log("inside get Order");
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

        await fetch('/v1/previous-order/' + id + "?" + queryParams, requestOptions)
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();

                // check for error response
                if (!response.ok) {
                    const error = (data && data.errors);
                    return Promise.reject(error);
                }

                setErrors({});

                setProcessing(false);
                console.log("Response:");
                console.log(data);

                if (!data.result) {
                    disablePreviousButton = true;
                    setDisablePreviousButton(true);
                    return;
                } else {
                    disablePreviousButton = false;
                    setDisablePreviousButton(false);
                }

                ResetForm();

                formData = data.result;
                oldProducts = formData.products.map(obj => ({ ...obj }));
                setOldProducts([...oldProducts]);

                formData.enable_report_to_zatca = false;
                formData.date_str = data.result.date;

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
                    discount = formData.discount;
                    setDiscount(discount);
                }

                if (data.result?.discount_with_vat) {
                    discountWithVAT = formData.discount_with_vat;
                    setDiscountWithVAT(discountWithVAT);
                }

                if (data.result?.discount_percent) {
                    discountPercent = formData.discount_percent;
                    setDiscountPercent(discountPercent);
                }

                if (data.result?.shipping_handling_fees) {
                    shipping = formData.shipping_handling_fees;
                    setShipping(shipping);
                }


                if (data.result?.payments) {
                    console.log("data.result.payments:", data.result.payments);
                    formData.payments_input = data.result.payments;
                    for (var i = 0; i < formData.payments_input?.length; i++) {
                        formData.payments_input[i].date_str = formData.payments_input[i].date
                    }
                    setFormData({ ...formData });
                }

                if (formData.is_discount_percent) {
                    formData.discountValue = formData.discount_percent;
                } else {
                    formData.discountValue = formData.discount;
                }

                selectedProducts = formData.products;
                setSelectedProducts([...selectedProducts]);


                selectedProducts.forEach((product, index) => {
                    CalCulateLineTotals(index);
                });


                if (formData.customer_name && formData.customer_id) {
                    let selectedCustomers = [
                        {
                            id: formData.customer_id,
                            name: formData.customer_name,
                            search_label: formData.customer.search_label,
                        }
                    ];
                    setSelectedCustomers([...selectedCustomers]);
                }

                reCalculate();
                setFormData({ ...formData });


                checkWarnings();
                checkErrors();
            })
            .catch(error => {
                setProcessing(false);
                setErrors(error);
            });
    }

    async function getNextOrder(id) {
        console.log("inside get Order");
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

        await fetch('/v1/next-order/' + id + "?" + queryParams, requestOptions)
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();

                // check for error response
                if (!response.ok) {
                    const error = (data && data.errors);
                    return Promise.reject(error);
                }

                setErrors({});

                setProcessing(false);

                console.log("Response:");
                console.log(data);


                if (!data.result) {
                    isUpdateForm = false;
                    setIsUpdateForm(false);

                    openCreateForm();
                    return;
                }

                isUpdateForm = true;
                setIsUpdateForm(true);

                disablePreviousButton = false;
                setDisablePreviousButton(false);

                ResetForm();


                formData = data.result;

                oldProducts = formData.products.map(obj => ({ ...obj }));
                setOldProducts([...oldProducts]);

                formData.enable_report_to_zatca = false;
                formData.date_str = data.result.date;



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
                    discount = formData.discount;
                    setDiscount(discount);
                }

                if (data.result?.discount_with_vat) {
                    discountWithVAT = formData.discount_with_vat;
                    setDiscountWithVAT(discountWithVAT);
                }

                if (data.result?.discount_percent) {
                    discountPercent = formData.discount_percent;
                    setDiscountPercent(discountPercent);
                }

                if (data.result?.shipping_handling_fees) {
                    shipping = formData.shipping_handling_fees;
                    setShipping(shipping);
                }


                if (data.result?.payments) {
                    console.log("data.result.payments:", data.result.payments);
                    formData.payments_input = data.result.payments;
                    for (var i = 0; i < formData.payments_input?.length; i++) {
                        formData.payments_input[i].date_str = formData.payments_input[i].date
                    }
                    setFormData({ ...formData });
                }

                if (formData.is_discount_percent) {
                    formData.discountValue = formData.discount_percent;
                } else {
                    formData.discountValue = formData.discount;
                }

                selectedProducts = formData.products;
                setSelectedProducts([...selectedProducts]);


                selectedProducts.forEach((product, index) => {
                    CalCulateLineTotals(index);
                });


                if (formData.customer_name && formData.customer_id) {
                    let selectedCustomers = [
                        {
                            id: formData.customer_id,
                            name: formData.customer_name,
                            search_label: formData.customer.search_label,
                        }
                    ];
                    setSelectedCustomers([...selectedCustomers]);
                }

                reCalculate();
                setFormData({ ...formData });


                checkWarnings();
                checkErrors();
            })
            .catch(error => {
                setProcessing(false);
                setErrors(error);
            });
    }

    async function getLastOrder() {
        console.log("inside get Order");
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

        await fetch("/v1/last-order?" + queryParams, requestOptions)
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();

                // check for error response
                if (!response.ok) {
                    const error = (data && data.errors);
                    return Promise.reject(error);
                }

                setErrors({});

                setProcessing(false);

                console.log("Response:");
                console.log(data);

                if (data.result) {
                    isUpdateForm = true;
                    setIsUpdateForm(true);
                } else {
                    isUpdateForm = false;
                    setIsUpdateForm(false);
                }
                formData = data.result;
                oldProducts = formData.products.map(obj => ({ ...obj }));
                setOldProducts([...oldProducts]);

                formData.enable_report_to_zatca = false;
                formData.date_str = data.result.date;

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
                    discount = formData.discount;
                    setDiscount(discount);
                }

                if (data.result?.discount_with_vat) {
                    discountWithVAT = formData.discount_with_vat;
                    setDiscountWithVAT(discountWithVAT);
                }

                if (data.result?.discount_percent) {
                    discountPercent = formData.discount_percent;
                    setDiscountPercent(discountPercent);
                }

                if (data.result?.shipping_handling_fees) {
                    shipping = formData.shipping_handling_fees;
                    setShipping(shipping);
                }


                if (data.result?.payments) {
                    console.log("data.result.payments:", data.result.payments);
                    formData.payments_input = data.result.payments;
                    for (var i = 0; i < formData.payments_input?.length; i++) {
                        formData.payments_input[i].date_str = formData.payments_input[i].date
                    }
                    setFormData({ ...formData });
                }

                if (formData.is_discount_percent) {
                    formData.discountValue = formData.discount_percent;
                } else {
                    formData.discountValue = formData.discount;
                }

                selectedProducts = formData.products;
                setSelectedProducts([...selectedProducts]);


                selectedProducts.forEach((product, index) => {
                    CalCulateLineTotals(index);
                });


                if (formData.customer_name && formData.customer_id) {
                    let selectedCustomers = [
                        {
                            id: formData.customer_id,
                            name: formData.customer_name,
                            search_label: formData.customer.search_label,
                        }
                    ];
                    setSelectedCustomers([...selectedCustomers]);
                }

                reCalculate();
                setFormData({ ...formData });


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
                //console.log("Enter key was pressed. Run your function-order.123");
                // event.preventDefault();



                var form = event.target.form;
                if (form && event.target) {
                    var index = Array.prototype.indexOf.call(form, event.target);
                    // console.log("form.elements:", form.elements);
                    if (form && form.elements[index + 1]) {
                        //
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


    //const history = useHistory();
    let [warnings, setWarnings] = useState({});

    let [errors, setErrors] = useState({
        "payment_amount": [],
    });
    const [isProcessing, setProcessing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);


    //fields
    let [formData, setFormData] = useState({
        vat_percent: 15.0,
        discountValue: 0.00,
        discount: 0.00,
        discount_percent: 0.0,
        cash_discount: 0.00,
        is_discount_percent: false,
        date_str: new Date(),
        signature_date_str: format(new Date(), "MMM dd yyyy", { locale: dateLocale }),
        status: "delivered",
        payment_status: "",
        payment_method: "",
        price_type: "retail",
        useLaserScanner: false,
        store_id: "",
        products: [],
    });

    //Customer Auto Suggestion
    const [customerOptions, setCustomerOptions] = useState([]);
    let [selectedCustomers, setSelectedCustomers] = useState([]);
    //const [isCustomersLoading, setIsCustomersLoading] = useState(false);

    //Product Auto Suggestion
    const [productOptions, setProductOptions] = useState([]);
    // let [selectedProduct, setSelectedProduct] = useState([]);
    let [selectedProducts, setSelectedProducts] = useState([]);
    // const [isProductsLoading, setIsProductsLoading] = useState(false);

    //Delivered By Auto Suggestion
    let [selectedDeliveredByUsers, setSelectedDeliveredByUsers] = useState([]);

    //Delivered By Signature Auto Suggestion

    const [show, setShow] = useState(false);

    function handleClose() {
        setShow(false);
    }

    useEffect(() => {
        let at = localStorage.getItem("access_token");
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


    const customCustomerFilter = useCallback((option, query) => {
        const normalize = (str) => str?.toLowerCase().replace(/\s+/g, " ").trim() || "";

        const q = normalize(query);
        const qWords = q.split(" ");

        const fields = [
            option.code,
            option.vat_no,
            option.name,
            option.name_in_arabic,
            option.phone,
            option.search_label,
            option.phone_in_arabic,
            ...(Array.isArray(option.additional_keywords) ? option.additional_keywords : []),
        ];

        const searchable = normalize(fields.join(" "));

        return qWords.every((word) => searchable.includes(word));
    }, []);


    async function suggestCustomers(searchTerm) {
        //console.log("Inside handle suggestCustomers");
        setCustomerOptions([]);

        //console.log("searchTerm:" + searchTerm);
        if (!searchTerm) {
            setTimeout(() => {
                setOpenCustomerSearchResult(false);
            }, 100);
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

        let Select = "select=id,code,credit_limit,credit_balance,additional_keywords,remarks,use_remarks_in_sales,vat_no,name,phone,name_in_arabic,phone_in_arabic,search_label,stores";
        // setIsCustomersLoading(true);
        let result = await fetch(
            "/v1/customer?limit=100&" + Select + queryString,
            requestOptions
        );
        let data = await result.json();

        if (!data.result || data.result.length === 0) {
            setOpenCustomerSearchResult(false);
            return;
        }

        setOpenCustomerSearchResult(true);



        const filtered = data.result.filter((opt) => customCustomerFilter(opt, searchTerm));

        const sorted = filtered.sort((a, b) => {
            const searchPhrase = searchTerm.toLowerCase().replace(/\s+/g, " ").trim();

            const getSearchable = (item) => {
                const fields = [
                    item.code,
                    item.name,
                    item.name_in_arabic,
                    item.phone,
                    item.phone2,
                    item.vat_no,
                    ...(Array.isArray(item.additional_keywords) ? item.additional_keywords : []),
                ];
                // Normalize: lowercase, collapse spaces, remove punctuation except spaces
                return fields.join(" ").toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
            };

            const aSearchable = getSearchable(a);
            const bSearchable = getSearchable(b);

            // Find index of the phrase in each string
            const aIndex = aSearchable.indexOf(searchPhrase);
            const bIndex = bSearchable.indexOf(searchPhrase);

            if (aIndex === 0 && bIndex !== 0) return -1;
            if (bIndex === 0 && aIndex !== 0) return 1;

            // If both contain the phrase, sort by earliest occurrence
            if (aIndex !== -1 && bIndex !== -1) {
                if (aIndex < bIndex) return -1;
                if (bIndex < aIndex) return 1;
            } else if (aIndex !== -1) {
                return -1; // a contains phrase, b does not
            } else if (bIndex !== -1) {
                return 1; // b contains phrase, a does not
            }

            const words = searchTerm.toLowerCase().split(" ").filter(Boolean);


            // Calculate percentage of occurrence
            const aPercent = customerPercentOccurrence(words, a);
            const bPercent = customerPercentOccurrence(words, b);

            if (aPercent !== bPercent) {
                return bPercent - aPercent;
            }
            return 0;
        });

        setCustomerOptions(sorted);
        // setIsCustomersLoading(false);
    }



    let [openProductSearchResult, setOpenProductSearchResult] = useState(false);
    let [openCustomerSearchResult, setOpenCustomerSearchResult] = useState(false);



    const customFilter = useCallback((option, query) => {
        const normalize = (str) => str?.toLowerCase().replace(/\s+/g, " ").trim() || "";

        const q = normalize(query);
        const qWords = q.split(" ");

        let partNoLabel = "";
        if (option.prefix_part_number) {
            partNoLabel = option.prefix_part_number + "-" + option.part_number;
        }

        const fields = [
            partNoLabel,
            option.prefix_part_number,
            option.part_number,
            option.name,
            option.name_in_arabic,
            option.country_name,
            option.brand_name,
            ...(Array.isArray(option.additional_keywords) ? option.additional_keywords : []),
        ];

        const searchable = normalize(fields.join(" "));

        return qWords.every((word) => searchable.includes(word));
    }, []);



    // Helper to calculate percentage of occurrence of search words
    const percentOccurrence = (words, product) => {
        let partNoLabel = product.prefix_part_number ? product.prefix_part_number + "-" + product.part_number : "";
        const fields = [
            partNoLabel,
            product.prefix_part_number,
            product.part_number,
            product.name,
            product.name_in_arabic,
            product.country_name,
            product.brand_name,
            ...(Array.isArray(product.additional_keywords) ? product.additional_keywords : []),
        ];
        const searchable = fields.join(" ").toLowerCase();
        const searchableWords = searchable.split(/\s+/).filter(Boolean);
        let totalMatches = 0;
        words.forEach(word => {
            if (word) {
                const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
                const matches = searchable.match(regex);
                totalMatches += matches ? matches.length : 0;
            }
        });
        // Percentage: matches / total words in searchable fields
        return searchableWords.length > 0 ? (totalMatches / searchableWords.length) : 0;
    };


    // Helper to calculate percentage of occurrence of search words
    const customerPercentOccurrence = (words, customer) => {
        const fields = [
            customer.name,
            customer.name_in_arabic,
            customer.code,
            customer.phone,
            customer.phone2,
            ...(Array.isArray(customer.additional_keywords) ? customer.additional_keywords : []),
        ];
        const searchable = fields.join(" ").toLowerCase();
        const searchableWords = searchable.split(/\s+/).filter(Boolean);
        let totalMatches = 0;
        words.forEach(word => {
            if (word) {
                const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
                const matches = searchable.match(regex);
                totalMatches += matches ? matches.length : 0;
            }
        });
        // Percentage: matches / total words in searchable fields
        return searchableWords.length > 0 ? (totalMatches / searchableWords.length) : 0;
    };


    const latestRequestRef = useRef(0);

    const suggestProducts = useCallback(async (searchTerm) => {
        const requestId = Date.now();
        latestRequestRef.current = requestId;

        setProductOptions([]);

        if (!searchTerm) {
            setTimeout(() => {
                setOpenProductSearchResult(false);
            }, 300);
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

        let Select = `select=id,rack,allow_duplicates,additional_keywords,search_label,set.name,item_code,prefix_part_number,country_name,brand_name,part_number,name,unit,name_in_arabic,product_stores.${localStorage.getItem('store_id')}.purchase_unit_price,product_stores.${localStorage.getItem('store_id')}.purchase_unit_price_with_vat,product_stores.${localStorage.getItem('store_id')}.retail_unit_price,product_stores.${localStorage.getItem('store_id')}.retail_unit_price_with_vat,product_stores.${localStorage.getItem('store_id')}.stock,product_stores.${localStorage.getItem('store_id')}.warehouse_stocks`;

        // Fetch page 1 and page 2 in parallel
        const urls = [
            "/v1/product?" + Select + queryString + "&limit=200&page=1&sort=country_name",
            "/v1/product?" + Select + queryString + "&limit=200&page=2&sort=country_name",
            "/v1/product?" + Select + queryString + "&limit=200&page=3&sort=country_name"
        ];

        const [result1, result2, result3] = await Promise.all([
            fetch(urls[0], requestOptions),
            fetch(urls[1], requestOptions),
            fetch(urls[2], requestOptions)
        ]);

        const data1 = await result1.json();
        const data2 = await result2.json();
        const data3 = await result3.json();

        // Only update if this is the latest request
        if (latestRequestRef.current !== requestId) return;

        // Combine results from both pages
        let products = [
            ...(data1.result || []),
            ...(data2.result || []),
            ...(data3.result || [])
        ];

        if (!products || products.length === 0) {
            setOpenProductSearchResult(false);
            return;
        }

        setOpenProductSearchResult(true);

        const filtered = products.filter((opt) => customFilter(opt, searchTerm));

        const sorted = filtered.sort((a, b) => {
            const aHasCountry = a.country_name && a.country_name.trim() !== "";
            const bHasCountry = b.country_name && b.country_name.trim() !== "";

            if (aHasCountry && bHasCountry) {
                return a.country_name.localeCompare(b.country_name);
            }
            if (aHasCountry && !bHasCountry) {
                return -1;
            }
            if (!aHasCountry && bHasCountry) {
                return 1;
            }

            const searchPhrase = searchTerm.toLowerCase().replace(/\s+/g, " ").trim();

            const getSearchable = (item) => {
                let partNoLabel = item.prefix_part_number ? item.prefix_part_number + "-" + item.part_number : "";
                const fields = [
                    partNoLabel,
                    // item.prefix_part_number,
                    // item.part_number,
                    item.name,
                    item.name_in_arabic,
                    item.country_name,
                    item.brand_name,
                    ...(Array.isArray(item.additional_keywords) ? item.additional_keywords : []),
                ];
                // Normalize: lowercase, collapse spaces, remove punctuation except spaces
                return fields.join(" ").toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
            };

            const aSearchable = getSearchable(a);
            const bSearchable = getSearchable(b);

            // Find index of the phrase in each string
            const aIndex = aSearchable.indexOf(searchPhrase);
            const bIndex = bSearchable.indexOf(searchPhrase);

            if (aIndex === 0 && bIndex !== 0) return -1;
            if (bIndex === 0 && aIndex !== 0) return 1;

            // If both contain the phrase, sort by earliest occurrence
            if (aIndex !== -1 && bIndex !== -1) {
                if (aIndex < bIndex) return -1;
                if (bIndex < aIndex) return 1;
            } else if (aIndex !== -1) {
                return -1; // a contains phrase, b does not
            } else if (bIndex !== -1) {
                return 1; // b contains phrase, a does not
            }



            const words = searchTerm.toLowerCase().split(" ").filter(Boolean);


            // Calculate percentage of occurrence
            const aPercent = percentOccurrence(words, a);
            const bPercent = percentOccurrence(words, b);

            if (aPercent !== bPercent) {
                return bPercent - aPercent;
            }
            return 0;
        });

        setProductOptions(sorted);

    }, [customFilter]);


    async function getProductByBarCode(barcode) {
        formData.barcode = barcode;
        setFormData({ ...formData });
        console.log("Inside getProductByBarCode");
        delete errors["bar_code"];
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
                Authorization: localStorage.getItem("access_token"),
            },
        };


        let searchParams = {};
        if (localStorage.getItem("store_id")) {
            searchParams.store_id = localStorage.getItem("store_id");
        }
        let queryParams = ObjectToSearchQueryParams(searchParams);
        if (queryParams !== "") {
            queryParams = "&" + queryParams;
        }

        let Select = "select=id,item_code,part_number,name,product_stores,unit,part_number,name_in_arabic";
        let result = await fetch(
            "/v1/product/barcode/" + formData.barcode + "?" + Select + queryParams,
            requestOptions
        );
        let data = await result.json();


        let product = data.result;
        if (product) {
            addProduct(product);
        } else {
            errors["bar_code"] = t("Invalid Barcode") + ":" + formData.barcode
            setErrors({ ...errors });
        }

        formData.barcode = "";
        setFormData({ ...formData });

    }



    function handleCreate(event) {
        event.preventDefault();

        if (isSubmitting) {
            return;
        }

        if (errors.blocked) {
            return;
        }

        let haveErrors = false;

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
            formData.discountWithVAT = 0;
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
        for (var i = 0; i < selectedProducts.length; i++) {

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

            if (store?.settings?.block_sale_when_purchase_price_is_higher) {
                if (selectedProducts[i].purchase_unit_price > selectedProducts[i].unit_price) {
                    errors["purchase_unit_price_" + i] = t("Purchase unit price is greater than Unit Price(without VAT)");
                    errors["unit_price_" + i] = t("Unit price is less  than Purchase Unit Price(without VAT)");
                    setErrors({ ...errors });
                    haveErrors = true;
                } else {
                    delete errors["purchase_unit_price_" + i];
                    delete errors["unit_price_" + i];
                }
            }



            formData.products.push({
                product_id: selectedProducts[i].product_id,
                part_number: selectedProducts[i].part_number,
                name: selectedProducts[i].name,
                quantity: parseFloat(selectedProducts[i].quantity),
                unit_price: unitPrice ? unitPrice : 0.00,
                unit_price_with_vat: selectedProducts[i].unit_price_with_vat ? selectedProducts[i].unit_price_with_vat : 0.00,
                purchase_unit_price: selectedProducts[i].purchase_unit_price ? parseFloat(selectedProducts[i].purchase_unit_price) : 0,
                purchase_unit_price_with_vat: selectedProducts[i].purchase_unit_price ? parseFloat(selectedProducts[i].purchase_unit_price_with_vat) : 0,
                unit_discount: unitDiscount,
                unit_discount_with_vat: unitDiscountWithVAT,
                unit_discount_percent: selectedProducts[i].unit_discount_percent ? parseFloat(selectedProducts[i].unit_discount_percent) : 0,
                unit_discount_percent_with_vat: selectedProducts[i].unit_discount_percent_with_vat ? parseFloat(selectedProducts[i].unit_discount_percent_with_vat) : 0,
                unit: selectedProducts[i].unit,
                warehouse_id: selectedProducts[i].warehouse_id ? selectedProducts[i].warehouse_id : null,
                warehouse_code: selectedProducts[i].warehouse_code ? selectedProducts[i].warehouse_code : null,
            });
        }

        delete errors["products"];
        setErrors({ ...errors });

        if (formData.products.length === 0) {
            errors["products"] = t("No products added");
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

        if (parseFloat(formData.shipping_handling_fees) < 0) {
            errors["shipping_handling_fees"] = t("shipping cost should not be < 0");
            setErrors({ ...errors });
            haveErrors = true;
        }

        if (/^\d*\.?\d{0,2}$/.test(parseFloat(formData.shipping_handling_fees)) === false) {
            errors["shipping_handling_fees"] = t("Max. decimal points allowed is 2");
            setErrors({ ...errors });
            haveErrors = true;
        }

        if (/^\d*\.?\d{0,2}$/.test(parseFloat(formData.discount)) === false) {
            errors["discount"] = t("Max. decimal points allowed is 2");
            setErrors({ ...errors });
            haveErrors = true;
        }

        if (/^-?\d*\.?\d{0,2}$/.test(parseFloat(formData.rounding_amount)) === false) {
            errors["rounding_amount"] = t("Max. decimal points allowed is 2");
            setErrors({ ...errors });
            haveErrors = true;
        }

        if (parseFloat(formData.discount) < 0) {
            errors["discount"] = t("discount should not be < 0");
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

        if (!formData.vat_percent && formData.vat_percent !== 0) {
            errors["vat_percent"] = t("Invalid vat percent");
            setErrors({ ...errors });
            haveErrors = true;
        }

        if (haveErrors) {
            //console.log("Errors: ", errors);
            return;
        }



        formData.discount = parseFloat(formData.discount);
        formData.rounding_amount = parseFloat(formData.rounding_amount);
        formData.discount_percent = parseFloat(formData.discount_percent);
        formData.vat_percent = parseFloat(formData.vat_percent);
        formData.net_total = parseFloat(formData.net_total);
        formData.balance_amount = parseFloat(balanceAmount);

        if (localStorage.getItem('store_id')) {
            formData.store_id = localStorage.getItem('store_id');
        }


        let endPoint = "/v1/order";
        let method = "POST";
        if (isUpdateForm) {
            endPoint = "/v1/order/" + formData.id;
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

        setIsSubmitting(true);
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
                setIsSubmitting(false);

                console.log("Response:");
                console.log(data);

                if (props.handleUpdated) {
                    props.handleUpdated();
                }

                if (formData.id) {
                    setToastMessage(t(`Updated Successfully`) + "✅");
                    setShowToast(true);
                    if (props.showToastMessage) {
                        if (props.showToastMessage) props.showToastMessage("Sale updated successfully!", "success");
                    }
                } else {
                    setToastMessage(t(`Created Successfully`) + "✅");
                    setShowToast(true);
                    if (props.showToastMessage) {
                        if (props.showToastMessage) props.showToastMessage("Sale created successfully!", "success");
                    }
                }

                setTimeout(() => {
                    setToastMessage(t(`Preparing Print Preview`) + "...");
                    setShowToast(true);
                    setTimeout(() => setShowToast(false), 1000);
                }, 800);



                if (props.refreshList) {
                    props.refreshList();
                }

                // handleClose();
                /*    formData.products = [];
                    selectedProducts = [];
                    setSelectedProducts([]);
                    formData.customer_id = "";
                    setSelectedCustomers([]);*/
                if (data.result?.id) {
                    isUpdateForm = true;
                    setIsUpdateForm(true);
                }
                formData = data.result;
                //formData.date = data.result?.date;
                //formData.code = data.result?.code;
                // alert(formData.code + "|" + formData.date);
                setFormData({ ...formData });
                openPrintTypeSelection();

                if (props.onUpdated) {
                    props.onUpdated();
                }

                // openCreateForm();


                formatLoadedSales(data);
                //  reCalculate();

                //openDetailsView(data.result.id);
            })
            .catch((error) => {
                setIsSubmitting(false);
                //console.log("Inside catch");
                //console.log(error);
                setErrors({ ...error });
                //console.error("There was an error!", error);
                if (props.showToastMessage) {
                    if (props.showToastMessage) props.showToastMessage("Failed to process sale!", "danger");
                }

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



    function removeWarningAndError(i) {
        delete warnings["quantity_" + i];
        delete errors["quantity_" + i];
        delete errors["purchase_unit_price_" + i];
        delete warnings["purchase_unit_price_" + i];
        delete warnings["unit_price_" + i];
        setErrors({ ...errors });
        setWarnings({ ...warnings });
    }

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
        console.log("INSIDE CHECK ERROR");

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


    async function checkWarnings(index) {
        if (index) {
            checkWarning(index);
        } else {
            for (let i = 0; i < selectedProducts.length; i++) {
                checkWarning(i);
            }
        }
    }


    async function checkWarning(i, selectedProduct) {
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
            setSelectedProducts([...selectedProducts]);
        }

        if (!formData.id && selectedProducts[i].quantity > selectedProducts[i].stock) {
            warnings["quantity_" + i] = t("Warning: Available stock is") + " " + (selectedProducts[i].stock);
        } else {
            delete warnings["quantity_" + i];
        }

        setWarnings({ ...warnings });

        /*
        if (product.product_stores && product.product_stores[localStorage.getItem("store_id")]?.stock) {
            stock = product.product_stores[localStorage.getItem("store_id")].stock;
            selectedProducts[i].stock = stock;
            selectedProducts[i].warehouse_stocks = product.product_stores[localStorage.getItem("store_id")]?.warehouse_stocks ? product.product_stores[localStorage.getItem("store_id")]?.warehouse_stocks : {};
    
            setSelectedProducts([...selectedProducts]);
        }
    
    
        let oldQty = 0;
        for (let j = 0; j < oldProducts?.length; j++) {
            if (oldProducts[j]?.product_id === selectedProducts[i]?.product_id) {
                if (formData.id) {
                    oldQty = oldProducts[j].quantity;
                    if (!selectedProducts[i].stock) {
                        selectedProducts[i].stock = 0;
                    }
                    selectedProducts[i].stock += oldQty;
    
    
                    if (!selectedProducts[i].warehouse_stocks) {
                        selectedProducts[i].warehouse_stocks = {};
                    }
    
                    if (oldProducts[j].warehouse_code) {
                        if (!selectedProducts[i].warehouse_stocks[oldProducts[j].warehouse_code]) {
                            selectedProducts[i].warehouse_stocks[oldProducts[j].warehouse_code] = 0;
                        }
    
                        selectedProducts[i].warehouse_stocks[oldProducts[j].warehouse_code] += oldQty;
                    } else {
                        selectedProducts[i].warehouse_stocks["main_store"] = selectedProducts[i].stock;
                    }
    
    
    
                    setSelectedProducts([...selectedProducts]);
                }
                break;
            }
        }
    
    
        
    
        if (product.product_stores && (stock + oldQty) < selectedProducts[i].quantity) {
            if (formData.id) {
                warnings["quantity_" + i] = "Warning: Available stock is " + (stock + oldQty);
            } else {
                warnings["quantity_" + i] = "Warning: Available stock is " + (stock);
            }
        } else {
            delete warnings["quantity_" + i];
        }
        */

    }




    async function getProduct(id, selectStr) {
        // console.log("inside get Product");
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
            const response = await fetch(`/v1/product/${id}?${queryParams}${selectStr ? "&select=" + selectStr : ""}`, requestOptions);
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

    const timerRef2 = useRef({});
    function addProductFromQuotation(product) {
        let alreadyAdded = isProductAdded(product.product_id);

        selectedProducts.push({
            product_id: product.product_id,
            code: product.item_code,
            prefix_part_number: product.prefix_part_number,
            part_number: product.part_number,
            name: product.name,
            quantity: product.quantity,
            //  product_stores: product.product_stores,
            unit_price: product.unit_price ? product.unit_price : 0,
            unit_price_with_vat: product.unit_price_with_vat ? product.unit_price_with_vat : 0,
            unit: product.unit ? product.unit : "",
            purchase_unit_price: product.purchase_unit_price ? product.purchase_unit_price : 0,
            purchase_unit_price_with_vat: product.purchase_unit_price_with_vat ? product.purchase_unit_price_with_vat : 0,
            unit_discount: product.unit_discount ? product.unit_discount : 0,
            unit_discount_with_vat: product.unit_discount_with_vat ? product.unit_discount_with_vat : 0,
            unit_discount_percent: product.unit_discount_percent ? product.unit_discount_percent : 0,
            unit_discount_percent_vat: product.unit_discount_percent_with_vat ? product.unit_discount_percent_with_vat : 0,
        });

        setSelectedProducts([...selectedProducts]);
        // if (timerRef.current) clearTimeout(timerRef.current);
        let index = getProductIndex(product.product_id);



        if (timerRef2 && timerRef2.current && timerRef2?.current?.[index]) clearTimeout(timerRef2.current[index]);

        if (!timerRef2?.current?.[index]) {
            timerRef2.current[index] = {};
        }

        timerRef2.current[index] = setTimeout(() => {


            if (alreadyAdded) {
                index = selectedProducts?.length - 1;
            }
            // alert(selectedProducts.length);
            // alert(index);

            CalCulateLineTotals(index);
            checkWarnings(index);
            checkErrors(index);
            reCalculate(index);
        }, 100);
        return true;
    }

    function addProduct(product) {
        if (!product.id && product.product_id) {
            product.id = product.product_id
        }

        let qty = 1;

        if (product.quantity) {
            qty = product.quantity;
        }

        console.log(product);
        let alreadyAdded = isProductAdded(product.id);
        let index = getProductIndex(product.id);

        if (!alreadyAdded || product.allow_duplicates) {
            selectedProducts.push({
                product_id: product.id,
                code: product.item_code,
                prefix_part_number: product.prefix_part_number,
                part_number: product.part_number,
                name: product.name,
                quantity: qty,
                product_stores: product.product_stores,
                unit_price: product.product_stores[localStorage.getItem("store_id")]?.retail_unit_price ? product.product_stores[formData.store_id]?.retail_unit_price : 0,
                unit_price_with_vat: product.product_stores[localStorage.getItem("store_id")]?.retail_unit_price_with_vat ? product.product_stores[formData.store_id]?.retail_unit_price_with_vat : 0,
                unit: product.unit ? product.unit : "",
                purchase_unit_price: product.product_stores[localStorage.getItem("store_id")]?.purchase_unit_price ? product.product_stores[formData.store_id]?.purchase_unit_price : 0,
                purchase_unit_price_with_vat: product.product_stores[localStorage.getItem("store_id")]?.purchase_unit_price_with_vat ? product.product_stores[formData.store_id]?.purchase_unit_price_with_vat : 0,
                unit_discount: 0,
                unit_discount_with_vat: 0,
                unit_discount_percent: 0,
                unit_discount_percent_vat: 0,
                stock: product.product_stores[localStorage.getItem("store_id")]?.stock ? product.product_stores[localStorage.getItem("store_id")]?.stock : 0,

            });
        }
        setSelectedProducts([...selectedProducts]);
        index = getProductIndex(product.id);

        if (timerRef2.current[index]) clearTimeout(timerRef2.current[index]);

        if (!timerRef2.current[index]) {
            timerRef2.current[index] = {};
        }

        timerRef2.current[index] = setTimeout(() => {

            if (alreadyAdded && product.allow_duplicates) {
                index = selectedProducts?.length - 1;
            }

            CalCulateLineTotals(index);
            checkWarnings(index);
            checkErrors(index);
            reCalculate(index);
        }, 100);
        return true;
    }

    function removeProduct(product) {
        let index = selectedProducts.indexOf(product);
        if (index === -1) {
            index = getProductIndex(product.id);
        }
        if (product.quantity_returned > 0) {
            errors["product_" + index] = t("This product cannot be removed as it is returned, Note: Please remove the product from sales return and try again");
            alert(t("This product cannot be removed as it is returned, Note: Please remove the product from sales return and try again"));
            setErrors({ ...errors });
            return;
        }

        if (index > -1) {
            selectedProducts.splice(index, 1);
            removeWarningAndError(index);
        }
        setSelectedProducts([...selectedProducts]);

        if (timerRef.current) clearTimeout(timerRef.current);

        timerRef.current = setTimeout(() => {
            reCalculate();
        }, 100);
    }


    /*
    function findFormData.total() {
        formData.total = 0.00;
        for (var i = 0; i < selectedProducts.length; i++) {
            let productUnitDiscount = 0.00;
            if (selectedProducts[i].unit_discount) {
                productUnitDiscount = selectedProducts[i].unit_discount;
            }
            formData.total +=
                (parseFloat(selectedProducts[i].unit_price - productUnitDiscount) *
                    parseFloat(selectedProducts[i].quantity));
        }
     
        // formData.total = Math.round(formData.total * 100) / 100;
        setFormData.total(formData.total);
    }
    */

    //let [vatPrice, setVatPrice] = useState(0.00);


    /*
    function findVatPrice() {
        vatPrice = 0.00;
        if (formData.total > 0) {
            console.log("formData.vat_percent:", formData.vat_percent);
            //(35.8 / 100) * 10000;
     
            vatPrice = (parseFloat(formData.vat_percent) / 100) * (parseFloat(formData.total) + parseFloat(formData.shipping_handling_fees) - parseFloat(formData.discount));
            console.log("vatPrice:", vatPrice);
        }
        setVatPrice(vatPrice);
    }
        */



    /*
    function RoundFloat(val, precision) {
        var ratio = Math.pow(10, precision);
        return Math.round(val * ratio) / ratio;
    }*/

    /*
    function findNetTotal() {
        formData.net_total = 0.00;
        if (formData.total > 0) {
            formData.net_total = (parseFloat(formData.total) + parseFloat(formData.shipping_handling_fees) - parseFloat(formData.discount) + parseFloat(vatPrice));
            formData.net_total = parseFloat(formData.net_total);
        }
        formData.net_total = RoundFloat(formData.net_total, 2);
        // formData.net_total = Math.round(formData.net_total * 100) / 100;
        setFormData.net_total(formData.net_total);
     
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
     
        /*
        if (formData.payments_input[0].amount === 0) {
            formData.payments_input[0].amount = "";
        }
        */
    // setFormData({ ...formData });
    // validatePaymentAmounts();
    //}


    /*
    function findProductUnitDiscountPercent(productIndex) {
        let unitPrice = parseFloat(selectedProducts[productIndex].unit_price);
        if (selectedProducts[productIndex].unit_discount
            && parseFloat(selectedProducts[productIndex].unit_discount) >= 0
            && unitPrice > 0) {
     
            let unitDiscountPercent = parseFloat(parseFloat(selectedProducts[productIndex].unit_discount / unitPrice) * 100);
            //selectedProducts[productIndex].unit_discount_percent = parseFloat(trimTo2Decimals(unitDiscountPercent));
            selectedProducts[productIndex].unit_discount_percent = unitDiscountPercent;
            setSelectedProducts([...selectedProducts]);
        }
    }
     
    function findProductUnitDiscount(productIndex) {
        let unitPrice = parseFloat(selectedProducts[productIndex].unit_price);
     
        if (selectedProducts[productIndex].unit_discount_percent
            && selectedProducts[productIndex].unit_discount_percent >= 0
            && unitPrice > 0) {
            //selectedProducts[productIndex].unit_discount = parseFloat(trimTo2Decimals(unitPrice * parseFloat(selectedProducts[productIndex].unit_discount_percent / 100)));
            selectedProducts[productIndex].unit_discount = parseFloat(unitPrice * parseFloat(selectedProducts[productIndex].unit_discount_percent / 100));
            setSelectedProducts([...selectedProducts]);
        }
    }*/


    /*
    function findDiscountPercent() {
        if (formData.discount >= 0 && formData.total > 0) {
            discountPercent = parseFloat(parseFloat(formData.discount / formData.total) * 100);
            setDiscountPercent(discountPercent);
            formData.discount_percent = discountPercent;
            //formData.discount_percent = Math.round(formData.discount_percent * 100) / 100;
            setFormData({ ...formData });
        }
    }*/

    /*
    function findDiscount() {
    if (formData.discount_percent >= 0 && formData.total > 0) {
        formData.discount = parseFloat(formData.total * parseFloat(formData.discount_percent / 100));
        setFormData({ ...formData });
    }
    }
    */

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
    let [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState(false);
    let [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false);
    let [commission, setCommission] = useState("");
    let [roundingAmount, setRoundingAmount] = useState(0.00);
    let [shipping, setShipping] = useState(0.00);
    let [discount, setDiscount] = useState(0.00);
    let [discountPercent, setDiscountPercent] = useState(0.00);

    let [discountWithVAT, setDiscountWithVAT] = useState(0.00);
    let [discountPercentWithVAT, setDiscountPercentWithVAT] = useState(0.00);



    async function reCalculate(productIndex) {
        const requestId = Date.now();
        latestRequestRef.current = requestId;

        console.log("inside reCalculate");

        if (!cashDiscount) {
            formData.cash_discount = 0;
        } else {
            formData.cash_discount = cashDiscount;
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

        /*
        if (!roundingAmount) {
            formData.rounding_amount = 0;
        } else {
            formData.rounding_amount = roundingAmount;
        }*/

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
                "/v1/order/calculate-net-total",
                requestOptions
            );
            //console.log("Done")
            if (!result.ok) {
                return;
            }

            if (latestRequestRef.current !== requestId) return;


            let res = await result.json();
            if (res.result) {
                formData.total = res.result.total;
                formData.total_with_vat = res.result.total_with_vat;
                // formData.rounding_amount = res.result.rounding_amount;
                formData.net_total = res.result.net_total;
                formData.vat_price = res.result.vat_price;



                if ((res.result.rounding_amount || res.result.rounding_amount === 0) && formData.auto_rounding_amount) {
                    roundingAmount = res.result.rounding_amount;
                    setRoundingAmount(roundingAmount);
                } /*else {
                    roundingAmount = 0;
                    setRoundingAmount(roundingAmount);
                }*/

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


                if (res.result.shipping_handling_fees) {
                    formData.shipping_handling_fees = res.result.shipping_handling_fees;
                }


                for (let i = 0; i < selectedProducts?.length; i++) {

                    for (let j = 0; j < res.result?.products?.length; j++) {
                        if (res.result?.products[j].product_id === selectedProducts[i].product_id) {
                            //console.log("Discounts updated from server")
                        }
                    }
                }
                setSelectedProducts([...selectedProducts]);

                setFormData({ ...formData });
            }

            if (!cashDiscount) {
                formData.cash_discount = 0;
            } else {
                formData.cash_discount = cashDiscount;
            }

            if (!formData.id) {
                if (formData.payments_input?.length === 1) {
                    formData.payments_input[0].amount = parseFloat(trimTo2Decimals(formData.net_total));
                    if (formData.payments_input[0].amount > formData.cash_discount) {
                        formData.payments_input[0].amount = parseFloat(trimTo2Decimals(formData.payments_input[0].amount - formData.cash_discount));
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


        } catch (err) {
            // console.error("Failed to parse response:", err);
        }
    }



    function findTotalPayments() {
        //console.log("Inisde findTotalPayments")
        let totalPayment = 0.00;
        for (var i = 0; i < formData.payments_input?.length; i++) {
            if (formData.payments_input[i].amount && !formData.payments_input[i].deleted) {
                totalPayment += formData.payments_input[i].amount;
            }
        }

        //totalPaymentAmount = totalPayment;
        // alert(totalPaymentAmount)
        // console.log("totalPaymentAmount:", totalPaymentAmount);
        setTotalPaymentAmount(totalPaymentAmount);
        //console.log("totalPayment:", totalPayment)
        balanceAmount = (parseFloat(trimTo2Decimals(formData.net_total)) - parseFloat(parseFloat(trimTo2Decimals(cashDiscount)))) - parseFloat(trimTo2Decimals(totalPayment));
        balanceAmount = parseFloat(trimTo2Decimals(balanceAmount));
        setBalanceAmount(balanceAmount);

        if (balanceAmount === parseFloat((parseFloat(trimTo2Decimals(formData.net_total)) - parseFloat(trimTo2Decimals(cashDiscount))))) {
            paymentStatus = "not_paid"
        } else if (balanceAmount <= 0) {
            paymentStatus = "paid"
        } else if (balanceAmount > 0) {
            paymentStatus = "paid_partially"
        }

        setPaymentStatus(paymentStatus);

        return totalPayment;
    }

    const DetailsViewRef = useRef();
    /*
    function openDetailsView(id) {
        DetailsViewRef.current.open(id);
    }*/

    const CustomerCreateFormRef = useRef();
    function openCustomerCreateForm() {
        CustomerCreateFormRef.current.open();
    }

    const ProductCreateFormRef = useRef();
    function openProductCreateForm() {
        ProductCreateFormRef.current.open();
    }


    const UserCreateFormRef = useRef();



    const SignatureCreateFormRef = useRef();


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


    let [totalPaymentAmount, setTotalPaymentAmount] = useState(0.00);
    let [balanceAmount, setBalanceAmount] = useState(0.00);
    let [paymentStatus, setPaymentStatus] = useState("");



    function removePayment(key, validatePayments = false) {
        formData.payments_input.splice(key, 1);

        delete errors["payment_method_" + key];
        //formData.payments_input[key]["deleted"] = true;
        setFormData({ ...formData });
        if (validatePayments) {
            validatePaymentAmounts();
        }
        findTotalPayments()
    }


    function validatePaymentAmounts() {
        //console.log("validatePaymentAmount: formData.net_total:", formData.net_total)
        delete errors["cash_discount"];
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


        if (cashDiscount > 0 && cashDiscount >= formData.net_total) {
            errors["cash_discount"] = t("Cash discount should not be greater than or equal to {{max}}", { max: trimTo2Decimals(formData.net_total).toString() });
            setErrors({ ...errors });
            haveErrors = true
            return false;
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
            } /* else if ((new Date(formData.payments_input[key].date_str)) < (new Date(formData.date_str))) {
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

        findTotalPayments();

        if (haveErrors) {
            return false;
        }

        return true;
    }

    //Import products from quotations
    const QuotationsRef = useRef();
    function openQuotations() {
        QuotationsRef.current.open(true, selectedCustomers);
    }


    const QuotationRef = useRef();
    const handleSelectedQuotation = (selectedQuotation) => {
        console.log("Selected Quotation:", selectedQuotation);
        // formData.customer_id = selectedQuotation.customer_id;

        QuotationRef.current.open(selectedQuotation.id, "product_selection");
        //ProductsRef.current.open(selectedQuotation, "quotation_products");
    };

    const handleSelectedCustomer = (selectedCustomer) => {
        console.log("selectedCustomer:", selectedCustomer);
        setSelectedCustomers([selectedCustomer])
        formData.customer_id = selectedCustomer.id;
        setFormData({ ...formData });
    };

    //Import products from delivery notes
    const DeliveryNotesRef = useRef();
    function openDeliveryNotes(model) {
        DeliveryNotesRef.current.open(true, selectedCustomers);
    }

    const DeliveryNoteRef = useRef();
    const handleSelectedDeliveryNote = async (selectedDeliveryNote) => {
        console.log("Selected DeliveryNots:", selectedDeliveryNote);
        if (store?.settings?.skip_product_selection_while_delivery_note_import) {
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
            try {
                const response = await fetch('/v1/delivery-note/' + selectedDeliveryNote.id + '?' + queryParams, requestOptions);
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();
                if (!response.ok) return;
                const dn = data.result;
                const customers = dn.customer_id ? [{ id: dn.customer_id, name: dn.customer_name, search_label: dn.customer_name || "" }] : [];
                const dnModel = store?.settings?.add_price_details_in_delivery_note ? dn : undefined;
                await handleSelectedProducts(dn.products || [], customers, "delivery_note", dn.id, dn.code, dn.remarks, dnModel);
            } catch (e) {
                console.log(e);
            }
        } else {
            DeliveryNoteRef.current.open(selectedDeliveryNote.id, "product_selection");
        }
    };



    const ProductsRef = useRef();
    function openLinkedProducts(model) {
        ProductsRef.current.open(true, "linked_products", model);
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

    function openQuotationSalesHistory(model) {
        QuotationHistoryRef.current.open(model, selectedCustomers, "invoice");
    }

    const QuotationSalesReturnHistoryRef = useRef();
    function openQuotationSalesReturnHistory(model) {
        QuotationSalesReturnHistoryRef.current.open(model, selectedCustomers);
    }

    const CustomersRef = useRef();
    function openCustomers(model) {
        CustomersRef.current.open();
    }

    function openProducts() {
        ProductsRef.current.open(true);
    }

    // ...existing code...
    // add near top of component (after `let [store, setStore] = useState({});` or before RunKeyActions)
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


    const handleSelectedProductsFromProducts = (selected) => {
        console.log("Selected Products:", selected);
        let addedCount = 0;
        for (var i = 0; i < selected.length; i++) {
            if (addProduct(selected[i])) {
                addedCount++;
            }
        }


        setToastMessage(t(`{{addedCount}} product(s) are added`, { addedCount: addedCount }) + "✅");
        setShowToast(true);

        setTimeout(() => setShowToast(false), 3000);
        if (selected?.length > 0) {
            setFormData({ ...formData });
        };
    };



    const handleSelectedProducts = async (selected, selectedCustomers, modelName, modelID, modelCode, remarks, model) => {
        console.log("Selected Products:", selected);
        let addedCount = 0;
        for (var i = 0; i < selected.length; i++) {
            if (modelName === "delivery_note") {
                if (store?.settings?.add_price_details_in_delivery_note) {
                    // Use prices stored in the delivery note item directly
                    addProductFromQuotation({ ...selected[i], item_code: selected[i].code });
                } else {
                    let p = await getProduct(selected[i].product_id);
                    p.quantity = selected[i].quantity;
                    addProduct(p);
                }
                addedCount++;

            } else if (addProductFromQuotation(selected[i])) {
                addedCount++;
            }
        }


        //setToastMessage(`${addedCount} product${addedCount !== 1 ? "s" : ""} added ✅`);
        setToastMessage(t(`{{addedCount}} product(s) are added`, { addedCount: addedCount }) + "✅");
        setShowToast(true);
        if (selectedCustomers && !formData.id) {
            formData.customer_id = selectedCustomers[0]?.id;

            setSelectedCustomers(selectedCustomers);
        }

        if (remarks) {
            formData.remarks = remarks;
            setFormData({ ...formData });
        }

        if (model?.cash_discount) {
            cashDiscount = model.cash_discount;
            setCashDiscount(cashDiscount);
            setFormData({ ...formData });
        }

        if (model?.commission) {
            commission = model.commission;
            setCommission(commission);
            setFormData({ ...formData });
        }


        if (model?.shipping_handling_fees) {
            shipping = model.shipping_handling_fees;
            setShipping(shipping);
            setFormData({ ...formData });
        }

        if (model?.discount) {
            discount = model.discount;
            setDiscount(discount);
            setFormData({ ...formData });
        }

        if (model?.discount_with_vat) {
            discountWithVAT = model.discount_with_vat;
            setDiscountWithVAT(discountWithVAT);
            setFormData({ ...formData });
        }

        setTimeout(() => setShowToast(false), 3000);

        if (modelName && modelID && modelCode) {
            if (modelName === "quotation") {
                formData.quotation_id = modelID;
                formData.quotation_code = modelCode;
            } else if (modelName === "delivery_note") {
                formData.delivery_note_id = modelID;
            }
        }
        setFormData({ ...formData });
        // if(props.showToastMessage) props.showToastMessage("Successfully Added " + selected.length + " products", "success");
    };

    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState("");

    const PreviewRef = useRef();
    /*
    function openPreview() {
        let model = formData;
        model.products = selectedProducts;
        model.payment_status = paymentStatus;
        model.date = formData.date_str;
        if (!formData.code) {
            formData.code = Math.floor(10000 + Math.random() * 90000).toString();;
        }
        PreviewRef.current.open(model, undefined, "sales");
    }
        */






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

    const productSearchRef = useRef();

    const timerRef = useRef(null);


    const renderTooltip = (props) => (
        <Tooltip id="label-tooltip" {...props}>
            {t("Total(without VAT)")} + {t("Shipping & Handling Fees")} - {t("Discount(without VAT)")}
            {"(" + trimTo2Decimals(formData.total) + " + " + trimTo2Decimals(shipping) + " - " + trimTo2Decimals(discount) + ") = " + trimTo2Decimals(formData.total + shipping - discount)}
        </Tooltip>
    );

    const renderNetTotalBeforeRoundingTooltip = (props) => (
        <Tooltip id="label-tooltip" {...props}>
            {t("Total Taxable Amount(without VAT)")} + {t("VAT Price ( {{vatPercent}}% of Taxable Amount)", { vatPercent: formData.vat_percent })}
            {"(" + trimTo2Decimals(formData.total + shipping - discount) + " + " + trimTo2Decimals(formData.vat_price) + ") = " + trimTo2Decimals(formData.net_total - roundingAmount)}
        </Tooltip>
    );

    const renderNetTotalTooltip = (props) => (
        <Tooltip id="label-tooltip" {...props}>
            {t("Total Taxable Amount(without VAT)")} + {t("VAT Price ( {{vatPercent}}% of Taxable Amount)", { vatPercent: formData.vat_percent })} {roundingAmount > 0 ? " + " + t("Rounding Amount") : " - " + t("Rounding Amount")}
            {"(" + trimTo2Decimals(formData.total + shipping - discount) + " + " + trimTo2Decimals(formData.vat_price) + `${roundingAmount > 0 ? " + " : " - "}` + trimTo2Decimals(roundingAmount) + " ) = " + trimTo2Decimals(formData.net_total)}
        </Tooltip>
    );

    const renderTotalWithoutVATTooltip = (props) => (
        <Tooltip id="total-without-vat-tooltip" {...props}>
            {t("Sum of all product prices (excluding VAT)")}
            {" = "}{trimTo2Decimals(formData.total)}
        </Tooltip>
    );
    const renderTotalWithVATTooltip = (props) => (
        <Tooltip id="total-with-vat-tooltip" {...props}>
            {t("Sum of all product prices (including VAT)")}
            {" = "}{trimTo2Decimals(formData.total_with_vat)}
        </Tooltip>
    );
    const renderShippingTooltip = (props) => (
        <Tooltip id="shipping-tooltip" {...props}>
            {t("Additional shipping and handling charges added to the order")}
        </Tooltip>
    );
    const renderDiscountWithoutVATTooltip = (props) => (
        <Tooltip id="discount-without-vat-tooltip" {...props}>
            {t("Discount amount applied before VAT calculation")}
        </Tooltip>
    );
    const renderDiscountWithVATTooltip = (props) => (
        <Tooltip id="discount-with-vat-tooltip" {...props}>
            {t("Discount amount applied including VAT")}
        </Tooltip>
    );
    const renderVATTooltip = (props) => (
        <Tooltip id="vat-tooltip" {...props}>
            {t("Value Added Tax")} ({formData.vat_percent}% {t("of Total Taxable Amount")})
            {" = "}{trimTo2Decimals(formData.vat_price)}
        </Tooltip>
    );

    const inputRefs = useRef({});
    const cashDiscountRef = useRef(null);
    const commissionRef = useRef(null);
    /*
    const handleFocus = (rowIdx, field) => {
        const ref = inputRefs.current?.[rowIdx]?.[field];
        if (ref && ref.select) {
            ref.select();
        }
    };*/

    const customerSearchRef = useRef();


    function openUpdateProductForm(id) {
        ProductCreateFormRef.current.open(id);
    }

    const ProductDetailsViewRef = useRef();
    function openProductDetails(id) {
        ProductDetailsViewRef.current.open(id);
    }

    const imageViewerRef = useRef();
    let [productImages, setProductImages] = useState([]);

    async function openProductImages(id) {
        let product = await getProduct(id);
        productImages = product?.images;
        setProductImages(productImages);
        imageViewerRef.current.open(0);
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

    // const [filteredOptions, setFilteredOptions] = useState([]);

    //const normalize = (str) => (str || '').toString().toLowerCase();


    const CustomerUpdateFormRef = useRef();
    function openCustomerUpdateForm(id) {
        CustomerUpdateFormRef.current.open(id);
    }

    const handleCustomerUpdated = (updatedCustomer) => {

        // alert(updatedCustomer);
        if (updatedCustomer.name && updatedCustomer.id) {
            // alert("updatedCustomer.customer_name:" + updatedCustomer.name);
            let selectedCustomers = [
                {
                    id: updatedCustomer.id,
                    name: updatedCustomer.name,
                    search_label: updatedCustomer.search_label,
                }
            ];
            setSelectedCustomers([...selectedCustomers]);

            formData.customer_id = updatedCustomer.id;
            if (updatedCustomer.use_remarks_in_sales && updatedCustomer.remarks) {
                formData.remarks = updatedCustomer.remarks;
            }

            if (updatedCustomer.phone && !formData.phone) {
                formData.phone = updatedCustomer.phone;
            }

            setFormData({ ...formData });

        }


    };


    const onChangeTriggeredRef = useRef(false);

    const ProductHistoryRef = useRef();
    function openProductHistory(model) {
        ProductHistoryRef.current.open(model);
    }

    //Preview
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
                errors["phone"] = t("Invalid phone no.")
                setErrors({ ...errors });
                return;
            }
        }

        setShowOrderPreview(true);
        if (timerRef.current) clearTimeout(timerRef.current);

        timerRef.current = setTimeout(() => {
            PreviewRef.current?.open(model, "whatsapp", "whatsapp_sales");
        }, 100);
    }


    const PrintRef = useRef();
    let [showOrderPrintPreview, setShowOrderPrintPreview] = useState(false);
    function openPrint() {
        setShowOrderPrintPreview(true);
        setShowPrintTypeSelection(false);
        if (timerRef.current) clearTimeout(timerRef.current);

        timerRef.current = setTimeout(() => {
            PrintRef.current.open(formData);
        }, 100);
    }


    let [showOrderPreview, setShowOrderPreview] = useState(false);
    let [showPrintTypeSelection, setShowPrintTypeSelection] = useState(false);

    const openPreview = useCallback(() => {
        setShowOrderPreview(true);
        setShowPrintTypeSelection(false);

        if (timerRef.current) clearTimeout(timerRef.current);

        timerRef.current = setTimeout(() => {
            //if (model.id === salesID) {
            if (!isSubmitting && formData.id && formData.code && formData.date) {
                PreviewRef.current?.open(formData, undefined, "sales");
            }
            //  handleClose();
            //}

        }, 100);

    }, [formData, isSubmitting]);

    const openPrintTypeSelection = useCallback(() => {
        if (store.settings?.enable_invoice_print_type_selection) {
            // showPrintTypeSelection = true;
            setShowOrderPreview(true);
            setShowPrintTypeSelection(true);
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => {
                printButtonRef.current?.focus();
            }, 100);

        } else {
            //openPreview();

            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => {
                if (!isSubmitting) {
                    openPreview();
                }
            }, 100);
        }
    }, [openPreview, store, isSubmitting]);

    const printButtonRef = useRef();
    const printA4ButtonRef = useRef();

    //const CreateFormRef = useRef();
    let [disablePreviousButton, setDisablePreviousButton] = useState(false)
    async function openCreateForm() {
        disablePreviousButton = false;
        setDisablePreviousButton(false);
        if (!isSubmitting) {
            open();
        }
        // CreateFormRef.current.open();
    }

    async function openPreviousForm() {
        getPreviousOrder(formData.id);
    }

    async function openNextForm() {
        getNextOrder(formData.id);
    }

    async function openLastForm() {
        getLastOrder();
    }

    async function handlePrintClose() {
        openCreateForm();
    }

    // Product Search Settings

    // Customer & Order Details settings
    const [showCustomerDetailsSettings, setShowCustomerDetailsSettings] = useState(false);
    const defaultCustomerDetailsFields = useMemo(() => [
        { key: "customer_selection", label: "Customer Selection", visible: true },
        { key: "barcode_scan", label: "Product Barcode Scan", visible: true },
        { key: "date", label: "Date", visible: true },
        { key: "phone", label: "Phone", visible: true },
        { key: "vat_no", label: "VAT NO.", visible: true },
        { key: "address", label: "Address", visible: true },
        { key: "remarks", label: "Remarks", visible: true },
        { key: "cash_discount", label: "Cash discount", visible: true },
        { key: "commission", label: "Commission", visible: true },
        { key: "commission_payment_method", label: "Commission Payment Method", visible: true },
    ], []);
    const [customerDetailsFields, setCustomerDetailsFields] = useState(defaultCustomerDetailsFields);

    const handleToggleCustomerDetailsField = (index) => {
        const updated = [...customerDetailsFields];
        updated[index].visible = !updated[index].visible;
        setCustomerDetailsFields(updated);
        localStorage.setItem("sales_customer_details_settings", JSON.stringify(updated));
    };

    const onDragEndCustomerDetailsFields = (result) => {
        if (!result.destination) return;
        const reordered = Array.from(customerDetailsFields);
        const [moved] = reordered.splice(result.source.index, 1);
        reordered.splice(result.destination.index, 0, moved);
        setCustomerDetailsFields(reordered);
        localStorage.setItem("sales_customer_details_settings", JSON.stringify(reordered));
    };

    function RestoreDefaultCustomerDetailsSettings() {
        const clonedDefaults = defaultCustomerDetailsFields.map(col => ({ ...col }));
        localStorage.setItem("sales_customer_details_settings", JSON.stringify(clonedDefaults));
        setCustomerDetailsFields(clonedDefaults);
        setShowSuccess(true);
        setSuccessMessage(t("Successfully restored to default settings!"));
    }

    const renderCustomerDetailField = (field) => {
        switch (field.key) {
            case "customer_selection":
                return (
                    <div key={field.key}>
                        <label className="block font-label-md text-on-surface-variant mb-1">{t("Customer Selection")}</label>
                        <div className="flex gap-1 align-items-center">
                            <div className="relative flex-1">
                                <Typeahead
                                    id="customer_id"
                                    positionFixed={true}
                                    filterBy={() => true}
                                    labelKey="search_label"
                                    inputProps={{ className: 'form-control bg-surface-bright border border-outline-variant rounded px-sm py-1.5 focus:ring-1 focus:ring-primary focus:border-primary h-[34px] w-full text-body-md' }}
                                    isLoading={false}
                                    emptyLabel=""
                                    clearButton={false}
                                    open={openCustomerSearchResult}
                                    onChange={(selectedItems) => {
                                        delete errors.customer_id;
                                        setErrors(errors);
                                        if (selectedItems.length === 0) {
                                            delete errors.customer_id;
                                            delete errors.blocked;
                                            formData.customer_id = "";
                                            formData.customer_name = "";
                                            formData.customerName = "";
                                            setFormData({ ...formData });
                                            setSelectedCustomers([]);
                                            setOpenCustomerSearchResult(false);
                                            return;
                                        }

                                        formData.customer_id = selectedItems[0].id;
                                        if (selectedItems[0].use_remarks_in_sales && selectedItems[0].remarks) {
                                            formData.remarks = selectedItems[0].remarks;
                                        }

                                        if (selectedItems[0].phone && !formData.phone) {
                                            formData.phone = selectedItems[0].phone;
                                        }

                                        setFormData({ ...formData });
                                        setSelectedCustomers(selectedItems);
                                        setOpenCustomerSearchResult(false);

                                        if (store?.settings?.block_sales_after_pending_count > 0) {
                                            const storeId = localStorage.getItem("store_id");
                                            const cs = selectedItems[0]?.stores?.[storeId];
                                            const pendingCount = (cs?.sales_not_paid_count || 0) + (cs?.sales_paid_partially_count || 0);
                                            if (pendingCount >= store.settings.block_sales_after_pending_count) {
                                                errors.blocked = `Customer has ${pendingCount} unpaid sale(s). New sales are blocked until existing sales are paid.`;
                                            } else {
                                                delete errors.blocked;
                                            }
                                            setErrors({ ...errors });
                                        }
                                    }}
                                    options={customerOptions}
                                    placeholder={t('Customer Name / Mob / VAT # / ID')}
                                    selected={selectedCustomers}
                                    highlightOnlyResult={true}
                                    ref={customerSearchRef}
                                    onKeyDown={(e) => {
                                        if (e.key === "Escape") {
                                            delete errors.customer_id;
                                            formData.customer_id = "";
                                            formData.customer_name = "";
                                            formData.customerName = "";
                                            setFormData({ ...formData });
                                            setSelectedCustomers([]);
                                            setCustomerOptions([]);
                                            setOpenCustomerSearchResult(false);
                                            customerSearchRef.current?.clear();
                                        }
                                    }}
                                    onInputChange={(searchTerm, e) => {
                                        if (searchTerm) {
                                            formData.customerName = searchTerm;
                                            formData.customer_name = searchTerm;
                                            setFormData({ ...formData });
                                        }

                                        if (timerRef.current) clearTimeout(timerRef.current);
                                        timerRef.current = setTimeout(() => {
                                            suggestCustomers(searchTerm);
                                        }, 100);
                                    }}
                                    renderMenu={(results, menuProps, state) => {
                                        return (
                                            <Menu {...menuProps} style={{ ...menuProps.style, minWidth: '900px', width: 'max-content', maxWidth: '95vw', zIndex: 9999 }}>
                                                <MenuItem disabled style={{ background: '#f8f9fa' }}>
                                                    <div style={{ display: 'flex', fontWeight: 'bold', padding: '4px 8px', borderBottom: '1px solid #ddd' }}>
                                                        <div style={{ width: '10%' }}>{t("ID")}</div>
                                                        <div style={{ width: '47%' }}>{t("Name")}</div>
                                                        <div style={{ width: '10%' }}>{t("Phone")}</div>
                                                        <div style={{ width: '13%' }}>{t("VAT NO.")}</div>
                                                        <div style={{ width: '10%' }}>{t("Credit Balance")}</div>
                                                        <div style={{ width: '10%' }}>{t("Credit Limit")}</div>
                                                    </div>
                                                </MenuItem>
                                                {results.map((option, index) => (
                                                    <MenuItem option={option} position={index} key={index}>
                                                        <div style={{ display: 'flex', padding: '4px 8px' }}>
                                                            <div style={{ ...columnStyle, width: '10%' }}>{option.code}</div>
                                                            <div style={{ ...columnStyle, width: '47%' }}>{option.name} {option.name_in_arabic ? `(${option.name_in_arabic})` : ""}</div>
                                                            <div style={{ ...columnStyle, width: '10%' }}>{option.phone}</div>
                                                            <div style={{ ...columnStyle, width: '13%' }}>{option.vat_no}</div>
                                                            <div style={{ ...columnStyle, width: '10%' }}><Amount amount={trimTo2Decimals(option.credit_balance)} /></div>
                                                            <div style={{ ...columnStyle, width: '10%' }}><Amount amount={trimTo2Decimals(option.credit_limit)} /></div>
                                                        </div>
                                                    </MenuItem>
                                                ))}
                                            </Menu>
                                        );
                                    }}
                                />
                            </div>
                            <div className="flex gap-xs shrink-0 align-items-center">
                                {formData.customer_id && (
                                    <button type="button" className="p-2 bg-surface-container hover:bg-surface-dim border border-outline-variant/30 rounded flex items-center justify-center cursor-pointer" style={{ height: '34px' }} onClick={() => openCustomerUpdateForm(formData.customer_id)}>
                                        <i className="bi bi-pencil text-on-surface-variant"></i>
                                    </button>
                                )}
                                <button type="button" className="px-2 bg-primary hover:opacity-90 border-0 text-on-primary rounded flex items-center justify-center cursor-pointer" style={{ height: '34px' }} onClick={openCustomerCreateForm}>
                                    <i className="bi bi-plus-lg text-[18px]"></i>
                                </button>
                                <button type="button" className="p-2 bg-surface-container hover:bg-surface-dim border border-outline-variant/30 rounded flex items-center justify-center cursor-pointer" style={{ height: '34px' }} onClick={openCustomers}>
                                    <i className="bi bi-list text-on-surface-variant"></i>
                                </button>
                            </div>
                        </div>
                        {errors.customer_id && (
                            <div style={{ color: "red" }} className="small mt-1">{t(errors.customer_id)}</div>
                        )}
                        {errors.blocked && (
                            <div style={{ color: "red" }} className="small mt-1 fw-semibold">{errors.blocked}</div>
                        )}

                        {selectedCustomers.length > 0 && formData.customer_id && (
                            <div className="bg-primary-container/5 border border-primary-container/20 rounded-lg p-sm space-y-1 mt-sm">
                                <div className="flex justify-between items-center">
                                    <span className="font-label-sm uppercase tracking-wider text-primary font-bold">{t("Selected Customer")}</span>
                                    <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded font-data-mono text-[10px] font-bold">{selectedCustomers[0].code}</span>
                                </div>
                                <div className="font-headline-md text-[14px] text-on-surface fw-bold mt-1">{selectedCustomers[0].name_in_arabic ? `${selectedCustomers[0].name} (${selectedCustomers[0].name_in_arabic})` : selectedCustomers[0].name}</div>
                                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-label-sm text-on-surface-variant pt-1 border-t border-outline-variant/30 mt-1">
                                    {selectedCustomers[0].vat_no && (
                                        <div>
                                            <span className="opacity-60 block text-[9px] uppercase">{t("VAT NO.")}</span>
                                            <span className="font-data-mono text-on-surface font-semibold">{selectedCustomers[0].vat_no}</span>
                                        </div>
                                    )}
                                    {selectedCustomers[0].phone && (
                                        <div>
                                            <span className="opacity-60 block text-[9px] uppercase">{t("Phone")}</span>
                                            <span className="font-data-mono text-on-surface font-semibold">{selectedCustomers[0].phone}</span>
                                        </div>
                                    )}
                                    {selectedCustomers[0].credit_balance !== undefined && (
                                        <div>
                                            <span className="opacity-60 block text-[9px] uppercase">{t("Credit Balance")}</span>
                                            <span className="text-primary font-semibold font-data-mono"><Amount amount={trimTo2Decimals(selectedCustomers[0].credit_balance)} /></span>
                                        </div>
                                    )}
                                    {selectedCustomers[0].credit_limit !== undefined && selectedCustomers[0].credit_limit > 0 && (
                                        <div>
                                            <span className="opacity-60 block text-[9px] uppercase">{t("Credit Limit")}</span>
                                            <span className="text-on-surface font-semibold font-data-mono"><Amount amount={trimTo2Decimals(selectedCustomers[0].credit_limit)} /></span>
                                        </div>
                                    )}
                                </div>
                                <div className="pt-1 flex justify-end">
                                    <Button variant="btn btn-sm btn-primary py-0 px-2 text-[11px]" onClick={() => openCustomerPending(selectedCustomers[0])}>{t('Pendings')}</Button>
                                </div>
                            </div>
                        )}
                    </div>
                );
            case "barcode_scan":
                return (
                    <div key={field.key}>
                        <label className="block font-label-md text-on-surface-variant mb-1">{t("Product Barcode Scan")}</label>
                        <div className="relative">
                            <DebounceInput
                                minLength={3}
                                debounceTimeout={100}
                                placeholder={t('Scan Barcode')}
                                className="form-control bg-surface-bright border border-outline-variant rounded px-sm py-1.5 focus:ring-1 focus:ring-primary focus:border-primary h-[34px] w-full text-body-md"
                                value={formData.barcode}
                                onChange={(event) => getProductByBarCode(event.target.value)}
                            />
                            {errors.bar_code && (
                                <div style={{ color: "red" }} className="small mt-1">{t(errors.bar_code)}</div>
                            )}
                        </div>
                    </div>
                );
            case "date":
                return (
                    <div key={field.key} className="grid grid-cols-2 gap-sm">
                        <div className="col-span-2">
                            <label className="block font-label-md text-on-surface-variant mb-1">{t('Date') + " *"}</label>
                            <DatePicker
                                id="date_str"
                                selected={formData.date_str ? new Date(formData.date_str) : null}
                                value={formData.date_str ? format(
                                    new Date(formData.date_str),
                                    "MMMM d, yyyy h:mm aa",
                                    { locale: dateLocale }
                                ) : null}
                                className="form-control bg-surface-bright border border-outline-variant rounded px-sm py-1.5 h-[34px] w-full text-body-md"
                                dateFormat="MMMM d, yyyy h:mm aa"
                                locale={dateLocale}
                                showTimeSelect
                                timeIntervals="1"
                                onChange={(value) => {
                                    formData.date_str = value;
                                    setFormData({ ...formData });
                                }}
                            />
                            {errors.date_str && (
                                <div style={{ color: "red" }} className="small mt-1">{t(errors.date_str)}</div>
                            )}
                        </div>
                    </div>
                );
            case "phone":
                return (
                    <div key={field.key}>
                        <label className="block font-label-md text-on-surface-variant mb-1">{t('Phone') + "( 05.. / +966..)"}</label>
                        <div className="flex gap-1">
                            <input
                                id="sales_phone"
                                name="sales_phone"
                                value={formData.phone ? formData.phone : ""}
                                type='string'
                                onChange={(e) => {
                                    delete errors["phone"];
                                    setErrors({ ...errors });
                                    formData.phone = e.target.value;
                                    setFormData({ ...formData });
                                }}
                                className="form-control bg-surface-bright border border-outline-variant rounded px-sm py-1.5 h-[34px] w-full text-body-md"
                                placeholder={t('Phone')}
                            />
                            <button type="button" className="px-2.5 bg-[#25D366] hover:opacity-90 border-0 text-white rounded flex items-center justify-center cursor-pointer" style={{ height: '34px' }} onClick={sendWhatsAppMessage}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="white" viewBox="0 0 16 16">
                                    <path d="M13.601 2.326A7.875 7.875 0 0 0 8.036 0C3.596 0 0 3.597 0 8.036c0 1.417.37 2.805 1.07 4.03L0 16l3.993-1.05a7.968 7.968 0 0 0 4.043 1.085h.003c4.44 0 8.036-3.596 8.036-8.036 0-2.147-.836-4.166-2.37-5.673ZM8.036 14.6a6.584 6.584 0 0 1-3.35-.92l-.24-.142-2.37.622.63-2.31-.155-.238a6.587 6.587 0 0 1-1.018-3.513c0-3.637 2.96-6.6 6.6-6.6 1.764 0 3.42.69 4.67 1.94a6.56 6.56 0 0 1 1.93 4.668c0 3.637-2.96 6.6-6.6 6.6Zm3.61-4.885c-.198-.1-1.17-.578-1.352-.644-.18-.066-.312-.1-.444.1-.13.197-.51.644-.626.775-.115.13-.23.15-.428.05-.198-.1-.837-.308-1.594-.983-.59-.525-.99-1.174-1.11-1.372-.116-.198-.012-.305.088-.403.09-.09.198-.23.298-.345.1-.115.132-.197.2-.33.065-.13.032-.247-.017-.345-.05-.1-.444-1.07-.61-1.46-.16-.384-.323-.332-.444-.338l-.378-.007c-.13 0-.344.048-.525.23s-.688.672-.688 1.64c0 .967.704 1.9.802 2.03.1.13 1.386 2.116 3.365 2.963.47.203.837.324 1.122.414.472.15.902.13 1.24.08.378-.057 1.17-.48 1.336-.942.165-.462.165-.858.116-.943-.048-.084-.18-.132-.378-.23Z" />
                                </svg>
                            </button>
                        </div>
                        {errors.phone && (
                            <div style={{ color: "red" }} className="small mt-1">{t(errors.phone)}</div>
                        )}
                    </div>
                );
            case "vat_no":
                return (
                    <div key={field.key}>
                        <label className="block font-label-md text-on-surface-variant mb-1">{t('VAT NO.(15 digits)')}</label>
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
                            }}
                            className="form-control bg-surface-bright border border-outline-variant rounded px-sm py-1.5 h-[34px] w-full text-body-md"
                            placeholder={t('VAT NO.')}
                        />
                        {errors.vat_no && (
                            <div style={{ color: "red" }} className="small mt-1">{t(errors.vat_no)}</div>
                        )}
                    </div>
                );
            case "address":
                return (
                    <div key={field.key}>
                        <label className="block font-label-md text-on-surface-variant mb-1">{t('Address')}</label>
                        <textarea
                            value={formData.address}
                            onChange={(e) => {
                                delete errors["address"];
                                setErrors({ ...errors });
                                formData.address = e.target.value;
                                setFormData({ ...formData });
                            }}
                            className="form-control bg-surface-bright border border-outline-variant rounded px-sm py-1 w-full text-body-md"
                            id="address"
                            rows="2"
                            placeholder={t('Address')}
                        />
                        {errors.address && (
                            <div style={{ color: "red" }} className="small mt-1">{t(errors.address)}</div>
                        )}
                    </div>
                );
            case "remarks":
                return (
                    <div key={field.key}>
                        <label className="block font-label-md text-on-surface-variant mb-1">{t('Remarks')}</label>
                        <textarea
                            value={formData.remarks}
                            onChange={(e) => {
                                delete errors["remarks"];
                                setErrors({ ...errors });
                                formData.remarks = e.target.value;
                                setFormData({ ...formData });
                            }}
                            className="form-control bg-surface-bright border border-outline-variant rounded px-sm py-1 w-full text-body-md"
                            id="remarks"
                            rows="2"
                            placeholder={t('Remarks')}
                        />
                        {errors.remarks && (
                            <div style={{ color: "red" }} className="small mt-1">{t(errors.remarks)}</div>
                        )}
                    </div>
                );
            case "cash_discount":
                return (
                    <div key={field.key}>
                        <label className="block font-label-md text-on-surface-variant mb-1">{t('Cash discount')}</label>
                        <input
                            type='number'
                            ref={cashDiscountRef}
                            id="sales_cash_discount"
                            name="sales_cash_discount"
                            value={cashDiscount}
                            className="form-control bg-surface-bright border border-outline-variant rounded px-sm py-1 h-[34px] w-full text-body-md"
                            onChange={(e) => {
                                delete errors["cash_discount"];
                                setErrors({ ...errors });
                                if (!e.target.value) {
                                    cashDiscount = e.target.value;
                                    setCashDiscount(cashDiscount);
                                    if (timerRef.current) clearTimeout(timerRef.current);
                                    timerRef.current = setTimeout(() => {
                                        reCalculate();
                                    }, 100);
                                    return;
                                }
                                cashDiscount = parseFloat(e.target.value);
                                setCashDiscount(cashDiscount);
                                if (cashDiscount > 0 && cashDiscount >= formData.net_total) {
                                    errors["cash_discount"] = t("Cash discount should not be greater than or equal to Net Total: ") + formData.net_total?.toString();
                                    setErrors({ ...errors });
                                    return;
                                }
                                if (timerRef.current) clearTimeout(timerRef.current);
                                timerRef.current = setTimeout(() => {
                                    reCalculate();
                                }, 100);
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
                                }
                            }}
                            onFocus={() => {
                                if (timerRef.current) clearTimeout(timerRef.current);
                                timerRef.current = setTimeout(() => {
                                    cashDiscountRef.current?.select();
                                }, 20);
                            }}
                        />
                        {errors.cash_discount && (
                            <div style={{ color: "red" }} className="small mt-1">
                                {errors.cash_discount}
                            </div>
                        )}
                    </div>
                );
            case "commission":
                return (
                    <div key={field.key}>
                        <label className="block font-label-md text-on-surface-variant mb-1">{t('Commission')}</label>
                        <input
                            type='number'
                            ref={commissionRef}
                            id="sales_commission"
                            name="sales_commission"
                            value={commission}
                            className="form-control bg-surface-bright border border-outline-variant rounded px-sm py-1 h-[34px] w-full text-body-md"
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
                                    errors["commission"] = t("Commission should not be greater than or equal to Net Total: ") + formData.net_total?.toString();
                                    setErrors({ ...errors });
                                    return;
                                }
                                if (commission > 0 && !formData.commission_payment_method) {
                                    errors["commission_payment_method"] = t("Payment method is required");
                                    setErrors({ ...errors });
                                }
                            }}
                            onKeyDown={(e) => {
                                if (timerRef.current) clearTimeout(timerRef.current);
                                if (e.key === "Backspace") {
                                    commission = "";
                                    setCommission(commission);
                                    delete errors["commission"];
                                    delete errors["commission_payment_method"];
                                    setErrors({ ...errors });
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
                            <div style={{ color: "red" }} className="small mt-1">
                                {t(errors.commission)}
                            </div>
                        )}
                    </div>
                );
            case "commission_payment_method":
                return (
                    <div key={field.key}>
                        <label className="block font-label-md text-on-surface-variant mb-1">{t('Commission Payment Method')}</label>
                        <select
                            value={formData.commission_payment_method}
                            className="w-full bg-surface-bright border border-outline-variant rounded px-sm py-1 form-control text-body-md h-[34px]"
                            onChange={(e) => {
                                delete errors["commission_payment_method"];
                                setErrors({ ...errors });
                                if (!e.target.value && commission > 0) {
                                    errors["commission_payment_method"] = t("Payment method is required");
                                    setErrors({ ...errors });
                                    formData.commission_payment_method = "";
                                    setFormData({ ...formData });
                                    return;
                                }
                                formData.commission_payment_method = e.target.value;
                                setFormData({ ...formData });
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
                            <div style={{ color: "red" }} className="small mt-1">
                                {t(errors["commission_payment_method"])}
                            </div>
                        )}
                    </div>
                );
            default:
                return null;
        }
    };

    useEffect(() => {
        const saved = localStorage.getItem("sales_customer_details_settings");
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) {
                    setCustomerDetailsFields(defaultCustomerDetailsFields.map((defaultField) => {
                        const savedField = parsed.find((item) => item.key === defaultField.key);
                        return savedField ? { ...defaultField, visible: savedField.visible } : defaultField;
                    }));
                    return;
                }
            } catch (_error) {
                // ignore invalid saved config
            }
        }
        setCustomerDetailsFields(defaultCustomerDetailsFields);
    }, [defaultCustomerDetailsFields]);

    const [showProductSearchSettings, setShowProductSearchSettings] = useState(false);

    // Initial column config

    const defaultSearchProductsColumns = useMemo(() => [
        { key: "select", label: "Select", fieldName: "select", width: 3, visible: true },
        { key: "part_number", label: "Part Number", fieldName: "part_number", width: 12, visible: true },
        { key: "name", label: "Name", fieldName: "name", width: 26, visible: true },
        { key: "unit_price", label: "S.Unit Price", fieldName: "unit_price", width: 10, visible: true },
        { key: "stock", label: "Stock", fieldName: "stock", width: 13, visible: true },
        { key: "photos", label: "Photos", fieldName: "photos", width: 5, visible: true },
        { key: "brand", label: "Brand", fieldName: "brand", width: 8, visible: true },
        { key: "purchase_price", label: "P.Unit Price", fieldName: "purchase_price", width: 10, visible: true },
        { key: "country", label: "Country", fieldName: "country", width: 8, visible: true },
        { key: "rack", label: "Rack", fieldName: "rack", width: 5, visible: true },
    ], []);



    const [searchProductsColumns, setSearchProductsColumns] = useState(defaultSearchProductsColumns);

    const visibleColumns = searchProductsColumns.filter(c => c.visible);

    const totalWidth = visibleColumns.reduce((sum, col) => sum + col.width, 0);

    const getColumnWidth = (col) => `${(col.width / totalWidth) * 100}%`;

    const handleToggleColumn = (index) => {
        const updated = [...searchProductsColumns];
        updated[index].visible = !updated[index].visible;
        setSearchProductsColumns(updated);
        localStorage.setItem("sales_product_search_settings", JSON.stringify(updated));
    };

    const onDragEnd = (result) => {
        if (!result.destination) return;
        const reordered = Array.from(searchProductsColumns);
        const [moved] = reordered.splice(result.source.index, 1);
        reordered.splice(result.destination.index, 0, moved);
        setSearchProductsColumns(reordered);
        localStorage.setItem("sales_product_search_settings", JSON.stringify(reordered));
    };



    function RestoreDefaultSettings() {
        const clonedDefaults = defaultSearchProductsColumns.map(col => ({ ...col }));
        localStorage.setItem("sales_product_search_settings", JSON.stringify(clonedDefaults));
        setSearchProductsColumns(clonedDefaults);

        setShowSuccess(true);
        setSuccessMessage(t("Successfully restored to default settings!"));
    }

    // Selected Products Table Settings
    const [showSelectedProductsSettings, setShowSelectedProductsSettings] = useState(false);
    const defaultSelectedProductsColumns = useMemo(() => [
        { key: "delete", label: "Delete", visible: true },
        { key: "si_no", label: "SI No.", visible: true },
        { key: "part_number", label: "Part No.", visible: true },
        { key: "name", label: "Name", visible: true },
        { key: "info", label: "Info", visible: true },
        { key: "purchase_unit_price", label: "Purchase Unit Price(without VAT)", visible: true },
        { key: "stock", label: "Stock", visible: true },
        { key: "warehouse", label: "Remove Stock From", visible: true },
        { key: "qty", label: "Qty", visible: true },
        { key: "unit_price", label: "Unit Price(without VAT)", visible: true },
        { key: "unit_price_with_vat", label: "Unit Price(with VAT)", visible: true },
        { key: "unit_discount", label: "Unit Disc.(without VAT)", visible: true },
        { key: "unit_discount_with_vat", label: "Unit Disc.(with VAT)", visible: true },
        { key: "unit_discount_percent", label: "Unit Disc. %(with VAT)", visible: true },
        { key: "price", label: "Price(without VAT)", visible: true },
        { key: "price_with_vat", label: "Price(with VAT)", visible: true },
    ], []);

    const [selectedProductsColumns, setSelectedProductsColumns] = useState(defaultSelectedProductsColumns);


    const handleToggleSelectedProductsColumn = (index) => {
        const updated = [...selectedProductsColumns];
        updated[index].visible = !updated[index].visible;
        setSelectedProductsColumns(updated);
        localStorage.setItem("sales_selected_products_table_settings", JSON.stringify(updated));
    };

    const onDragEndSelectedProducts = (result) => {
        if (!result.destination) return;
        const reordered = Array.from(selectedProductsColumns);
        const [moved] = reordered.splice(result.source.index, 1);
        reordered.splice(result.destination.index, 0, moved);
        setSelectedProductsColumns(reordered);
        localStorage.setItem("sales_selected_products_table_settings", JSON.stringify(reordered));
    };

    function RestoreDefaultSelectedProductsSettings() {
        const clonedDefaults = defaultSelectedProductsColumns.map(col => ({ ...col }));
        localStorage.setItem("sales_selected_products_table_settings", JSON.stringify(clonedDefaults));
        setSelectedProductsColumns(clonedDefaults);
        setShowSuccess(true);
        setSuccessMessage(t("Successfully restored to default settings!"));
    }

    useEffect(() => {
        const saved = localStorage.getItem("sales_selected_products_table_settings");
        if (saved) {
            setSelectedProductsColumns(JSON.parse(saved));
        }
    }, []);

    // Load settings from localStorage
    useEffect(() => {
        const clonedDefaults = defaultSearchProductsColumns.map(col => ({ ...col }));

        let saved = localStorage.getItem("sales_product_search_settings");
        if (saved) {
            setSearchProductsColumns(JSON.parse(saved));
        } else {
            setSearchProductsColumns(clonedDefaults.map(col => ({ ...col })));
        }

        let missingOrUpdated = false;
        for (let i = 0; i < clonedDefaults.length; i++) {
            if (!saved) break;

            const savedCol = JSON.parse(saved)?.find(col => col.fieldName === clonedDefaults[i].fieldName);
            missingOrUpdated = !savedCol || savedCol.label !== clonedDefaults[i].label || savedCol.key !== clonedDefaults[i].key;
            if (missingOrUpdated) break;
        }

        if (missingOrUpdated) {

            localStorage.setItem("sales_product_search_settings", JSON.stringify(clonedDefaults));
            setSearchProductsColumns(clonedDefaults);
        }
    }, [defaultSearchProductsColumns]);


    // Skip the first run so we don't overwrite saved settings during initial hydration
    /*
    const isFirstRun = useRef(true);
    useEffect(() => {
        if (isFirstRun.current) {
            isFirstRun.current = false;
            return;
        }
        localStorage.setItem("sales_product_search_settings", JSON.stringify(searchProductsColumns));
    }, [searchProductsColumns]);*/

    const [showSuccess, setShowSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState(false);

    const [formType, setFormType] = useState(() => localStorage.getItem('order_form_type') || 'type1');
    useEffect(() => {
        localStorage.setItem('order_form_type', formType);
    }, [formType]);

    // When Enable Sales Page Selection is off, force formType to type1
    useEffect(() => {
        if (store.settings && store.settings.enable_sales_page_selection !== true) {
            setFormType('type1');
        }
    }, [store.settings]);

    useEffect(() => {
        if (formType !== 'type1') {
            const hasVisible = customerDetailsFields.some((field) => field.visible);
            if (!hasVisible) {
                setIsLeftSidebarCollapsed(true);
            }
        }
    }, [formType, customerDetailsFields]);

    // ── Delivery Note Reminder Notifications ─────────────────────────────────
    const [dnNotifications, setDnNotifications] = useState([]);
    const [, setDnTick] = useState(0);
    const dnNotificationsRef = useRef([]);

    function addDnNotification(notif) {
        const current = dnNotificationsRef.current;
        if (current.find(n => n.id === notif.id)) return;
        const stamped = { ...notif, arrived_at: notif.arrived_at || notif.notify_at || new Date().toISOString() };
        const updated = [...current, stamped];
        dnNotificationsRef.current = updated;
        setDnNotifications([...updated]);
    }

    function dismissDnNotification(id, persist = false) {
        const notif = dnNotificationsRef.current.find(n => n.id === id);
        const updated = dnNotificationsRef.current.filter(n => n.id !== id);
        dnNotificationsRef.current = updated;
        setDnNotifications([...updated]);
        if (persist && notif) {
            const map = _getDnDismissedMap();
            map[id] = notif.notify_at || '';
            _saveDnDismissedMap(map);
        }
    }

    function openSalesFromDnInForm(notif) {
        // Already on the sales page — emit directly so index.js loads the DN
        eventEmitter.emit("create_sales_from_dn", { id: notif.id, code: notif.code });
    }

    // Fetch active reminders on mount
    useEffect(() => {
        const fetchDnReminders = async () => {
            const storeId = localStorage.getItem("store_id");
            const token = localStorage.getItem("access_token");
            if (!storeId || !token) return;
            try {
                const res = await fetch(`/v1/delivery-note/reminders?search[store_id]=${storeId}`, {
                    headers: { Authorization: "Bearer " + token },
                });
                const data = await res.json();
                if (data.status && Array.isArray(data.result)) {
                    const dismissed = _getDnDismissedMap();
                    data.result.forEach(dn => {
                        if (dismissed[dn.id] === (dn.notify_at || '')) return;
                        addDnNotification({ id: dn.id, code: dn.code, notify_at: dn.notify_at });
                    });
                }
            } catch (_) { }
        };
        fetchDnReminders();
        eventEmitter.on("socket_connection_open", fetchDnReminders);
        return () => eventEmitter.off("socket_connection_open", fetchDnReminders);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Real-time reminder push
    useEffect(() => {
        const handleReminder = (data) => {
            if (data && data.id && data.code) {
                addDnNotification({ id: data.id, code: data.code, notify_at: data.notify_at });
            }
        };
        eventEmitter.on("delivery_note_reminder", handleReminder);
        return () => eventEmitter.off("delivery_note_reminder", handleReminder);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Auto-dismiss when the linked sale is created
    useEffect(() => {
        const handleLinked = (data) => {
            if (data && data.delivery_note_id) dismissDnNotification(data.delivery_note_id);
        };
        eventEmitter.on("delivery_note_order_linked", handleLinked);
        return () => eventEmitter.off("delivery_note_order_linked", handleLinked);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Re-render every 60 s so "time ago" stays current
    useEffect(() => {
        const timer = setInterval(() => setDnTick(t => t + 1), 60000);
        return () => clearInterval(timer);
    }, []);
    // ─────────────────────────────────────────────────────────────────────────

    const _defaultBillSummaryOrder = ['total_without_vat', 'total_with_vat', 'shipping', 'discount_without_vat', 'discount_with_vat', 'taxable_amount', 'vat', 'net_before_rounding', 'rounding_amount', 'net_total'];
    const _billSummaryFieldLabels = { total_without_vat: 'Total(without VAT)', total_with_vat: 'Total(with VAT)', shipping: 'Shipping & Handling Fees', discount_without_vat: 'Sales Discount(without VAT)', discount_with_vat: 'Sales Discount(with VAT)', taxable_amount: 'Total Taxable Amount(without VAT)', vat: 'VAT', net_before_rounding: 'Net Total(with VAT) Before Rounding', rounding_amount: 'Rounding Amount', net_total: 'Net Total(with VAT)' };
    const [billSummaryVisible, setBillSummaryVisible] = useState(() => {
        try { const s = localStorage.getItem('bill_summary_visible_t1'); if (s) return JSON.parse(s); } catch { }
        return Object.fromEntries(_defaultBillSummaryOrder.map(k => [k, true]));
    });
    const [billSummaryOrder, setBillSummaryOrder] = useState(() => {
        try { const s = localStorage.getItem('bill_summary_order_t1'); if (s) return JSON.parse(s); } catch { }
        return _defaultBillSummaryOrder;
    });
    const [showBillSummarySettings, setShowBillSummarySettings] = useState(false);
    const updateBillSummaryVisible = (key, val) => {
        const next = { ...billSummaryVisible, [key]: val };
        setBillSummaryVisible(next);
        localStorage.setItem('bill_summary_visible_t1', JSON.stringify(next));
    };
    // Type 2 Bill Summary settings
    const [billSummaryVisibleT2, setBillSummaryVisibleT2] = useState(() => {
        try { const s = localStorage.getItem('bill_summary_visible_t2'); if (s) return JSON.parse(s); } catch { }
        return Object.fromEntries(_defaultBillSummaryOrder.map(k => [k, true]));
    });
    const [billSummaryOrderT2, setBillSummaryOrderT2] = useState(() => {
        try { const s = localStorage.getItem('bill_summary_order_t2'); if (s) return JSON.parse(s); } catch { }
        return [..._defaultBillSummaryOrder];
    });
    const [showBillSummarySettingsT2, setShowBillSummarySettingsT2] = useState(false);
    const updateBillSummaryVisibleT2 = (key, val) => {
        const next = { ...billSummaryVisibleT2, [key]: val };
        setBillSummaryVisibleT2(next);
        localStorage.setItem('bill_summary_visible_t2', JSON.stringify(next));
    };
    const billSummaryDragRef = useRef(null);
    const reorderBillSummaryT1 = (from, to) => {
        if (from === to) return;
        const arr = [...billSummaryOrder];
        const [item] = arr.splice(from, 1);
        arr.splice(to, 0, item);
        setBillSummaryOrder(arr);
        localStorage.setItem('bill_summary_order_t1', JSON.stringify(arr));
    };
    const reorderBillSummaryT2 = (from, to) => {
        if (from === to) return;
        const arr = [...billSummaryOrderT2];
        const [item] = arr.splice(from, 1);
        arr.splice(to, 0, item);
        setBillSummaryOrderT2(arr);
        localStorage.setItem('bill_summary_order_t2', JSON.stringify(arr));
    };

    //Payment Reference form
    const PurchaseUpdateFormRef = useRef();
    const CustomerDepositUpdateFormRef = useRef();
    const SalesReturnUpdateFormRef = useRef();

    let [showReferenceUpdateForm, setShowReferenceUpdateForm] = useState(false);
    function openReferenceUpdateForm(id, referenceModel) {
        showReferenceUpdateForm = true;
        setShowReferenceUpdateForm(showReferenceUpdateForm);

        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            if (referenceModel === "customer_deposit") {
                CustomerDepositUpdateFormRef.current.open(id);
            } else if (referenceModel === "sales_return") {
                SalesReturnUpdateFormRef.current.open(id);
            } else if (referenceModel === "purchase") {
                PurchaseUpdateFormRef.current.open(id);
            }
        }, 50);
    }

    const handleReferenceUpdated = () => {
        if (formData.id) {
            getOrder(formData.id);
        }
    };


    let [showCustomerPending, setShowCustomerPending] = useState(false);

    const CustomerPendingRef = useRef();
    function openCustomerPending(customer) {
        setShowCustomerPending(true);

        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            CustomerPendingRef.current?.open(false, customer);
        }, 50);
    }

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
                <CustomerDepositCreate ref={CustomerDepositUpdateFormRef} onUpdated={handleReferenceUpdated} />
                <SalesReturnCreate ref={SalesReturnUpdateFormRef} onUpdated={handleReferenceUpdated} />
                <PurchaseCreate ref={PurchaseUpdateFormRef} onUpdated={handleReferenceUpdated} />
            </>}

            <Modal show={showSuccess} onHide={() => setShowSuccess(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>{t('Success')}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Alert variant="success">
                        {successMessage}
                    </Alert>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowSuccess(false)}>
                        {t('Close')}
                    </Button>
                </Modal.Footer>
            </Modal>

            <Modal
                show={showProductSearchSettings}
                onHide={() => setShowProductSearchSettings(false)}
                centered
                size="lg"
            >
                <Modal.Header closeButton>
                    <Modal.Title>
                        <i
                            className="bi bi-gear-fill"
                            style={{ fontSize: "1.2rem", marginRight: "4px" }}
                            title="Table Settings"

                        />
                        {t("Product Search Settings")}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {/* Column Settings */}
                    {showProductSearchSettings && (
                        <>
                            <h6 className="mb-2">{t("Customize Columns")}</h6>
                            <DragDropContext onDragEnd={onDragEnd}>
                                <Droppable droppableId="columns">
                                    {(provided) => (
                                        <ul
                                            className="list-group"
                                            {...provided.droppableProps}
                                            ref={provided.innerRef}
                                        >
                                            {searchProductsColumns.map((col, index) => {
                                                return (
                                                    <>
                                                        <Draggable
                                                            key={col.key}
                                                            draggableId={col.key}
                                                            index={index}
                                                        >
                                                            {(provided) => (
                                                                <li
                                                                    className="list-group-item d-flex justify-content-between align-items-center"
                                                                    ref={provided.innerRef}
                                                                    {...provided.draggableProps}
                                                                    {...provided.dragHandleProps}                                                        >
                                                                    <div>
                                                                        <input
                                                                            style={{ width: "20px", height: "20px" }}
                                                                            type="checkbox"
                                                                            className="form-check-input me-2"
                                                                            checked={col.visible}
                                                                            onChange={() => {
                                                                                handleToggleColumn(index);
                                                                            }}
                                                                        />
                                                                        {t(col.label)}
                                                                    </div>
                                                                    <span style={{ cursor: "grab" }}>☰</span>
                                                                </li>
                                                            )}
                                                        </Draggable>
                                                    </>)
                                            })}
                                            {provided.placeholder}
                                        </ul>
                                    )}
                                </Droppable>
                            </DragDropContext>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowProductSearchSettings(false)}>
                        {t('Close')}
                    </Button>
                    <Button
                        variant="primary"
                        onClick={() => {
                            RestoreDefaultSettings();
                        }}
                    >
                        {t('Restore to Default')}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* ⚙️ Selected Products Table Settings Modal */}
            <Modal
                show={showSelectedProductsSettings}
                onHide={() => setShowSelectedProductsSettings(false)}
                centered
                size="lg"
            >
                <Modal.Header closeButton>
                    <Modal.Title>
                        <i
                            className="bi bi-gear-fill"
                            style={{ fontSize: "1.2rem", marginRight: "4px" }}
                            title="Table Settings"
                        />
                        {t("Selected Products Table Settings")}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {showSelectedProductsSettings && (
                        <>
                            <h6 className="mb-2">{t("Customize Columns")}</h6>
                            <DragDropContext onDragEnd={onDragEndSelectedProducts}>
                                <Droppable droppableId="selectedProductsColumns">
                                    {(provided) => (
                                        <ul
                                            className="list-group"
                                            {...provided.droppableProps}
                                            ref={provided.innerRef}
                                        >
                                            {selectedProductsColumns.map((col, index) => (
                                                <Draggable key={col.key} draggableId={"spc-" + col.key} index={index}>
                                                    {(provided) => (
                                                        <li
                                                            className="list-group-item d-flex justify-content-between align-items-center"
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            {...provided.dragHandleProps}
                                                        >
                                                            <div>
                                                                <input
                                                                    style={{ width: "20px", height: "20px" }}
                                                                    type="checkbox"
                                                                    className="form-check-input me-2"
                                                                    checked={col.visible}
                                                                    onChange={() => handleToggleSelectedProductsColumn(index)}
                                                                />
                                                                {t(col.label)}
                                                            </div>
                                                            <span style={{ cursor: "grab" }}>☰</span>
                                                        </li>
                                                    )}
                                                </Draggable>
                                            ))}
                                            {provided.placeholder}
                                        </ul>
                                    )}
                                </Droppable>
                            </DragDropContext>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowSelectedProductsSettings(false)}>
                        {t('Close')}
                    </Button>
                    <Button
                        variant="primary"
                        onClick={() => RestoreDefaultSelectedProductsSettings()}
                    >
                        {t('Restore to Default')}
                    </Button>
                </Modal.Footer>
            </Modal>

            <Modal
                show={showCustomerDetailsSettings}
                onHide={() => setShowCustomerDetailsSettings(false)}
                centered
                size="lg"
            >
                <Modal.Header closeButton>
                    <Modal.Title>
                        <i
                            className="bi bi-gear-fill"
                            style={{ fontSize: "1.2rem", marginRight: "4px" }}
                            title={t("Customer & Order Details Settings")}
                        />
                        {t("Customer & Order Details Settings")}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {showCustomerDetailsSettings && (
                        <>
                            <p className="mb-3 text-label-sm text-on-surface-variant">
                                {t("Choose which customer and order details appear in the sidebar, and drag to reorder them.")}
                            </p>
                            <DragDropContext onDragEnd={onDragEndCustomerDetailsFields}>
                                <Droppable droppableId="customerDetailsFields">
                                    {(provided) => (
                                        <ul
                                            className="list-group"
                                            {...provided.droppableProps}
                                            ref={provided.innerRef}
                                        >
                                            {customerDetailsFields.map((field, index) => (
                                                <Draggable key={field.key} draggableId={"cdf-" + field.key} index={index}>
                                                    {(provided) => (
                                                        <li
                                                            className="list-group-item d-flex justify-content-between align-items-center"
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            {...provided.dragHandleProps}
                                                        >
                                                            <div>
                                                                <input
                                                                    style={{ width: "20px", height: "20px" }}
                                                                    type="checkbox"
                                                                    className="form-check-input me-2"
                                                                    checked={field.visible}
                                                                    onChange={() => handleToggleCustomerDetailsField(index)}
                                                                />
                                                                {t(field.label)}
                                                            </div>
                                                            <span style={{ cursor: "grab" }}>☰</span>
                                                        </li>
                                                    )}
                                                </Draggable>
                                            ))}
                                            {provided.placeholder}
                                        </ul>
                                    )}
                                </Droppable>
                            </DragDropContext>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowCustomerDetailsSettings(false)}>
                        {t('Close')}
                    </Button>
                    <Button variant="primary" onClick={() => RestoreDefaultCustomerDetailsSettings()}>
                        {t('Restore to Default')}
                    </Button>
                </Modal.Footer>
            </Modal>

            <ProductHistory ref={ProductHistoryRef} showToastMessage={props.showToastMessage} />
            {showOrderPrintPreview && <OrderPrint ref={PrintRef} onPrintClose={handlePrintClose} />}
            {showOrderPreview && <OrderPreview ref={PreviewRef} onPrintClose={handlePrintClose} />}
            <CustomerCreate ref={CustomerUpdateFormRef} showToastMessage={props.showToastMessage} onUpdated={handleCustomerUpdated} />
            <ImageViewerModal ref={imageViewerRef} images={productImages} />

            <Modal show={showPrintTypeSelection} onHide={() => {
                showPrintTypeSelection = false;
                setShowPrintTypeSelection(showPrintTypeSelection);
            }} centered>
                <Modal.Header closeButton>
                    <Modal.Title>{t('Select Print Type')}</Modal.Title>
                </Modal.Header>
                <Modal.Body className="d-flex justify-content-around">



                    <Button variant="secondary" ref={printButtonRef} onClick={() => {
                        openPrint();
                    }} onKeyDown={(e) => {
                        if (timerRef.current) clearTimeout(timerRef.current);

                        if (e.key === "ArrowRight") {
                            timerRef.current = setTimeout(() => {
                                printA4ButtonRef.current.focus();
                            }, 100);
                        }
                    }}>
                        <i className="bi bi-printer"></i> {t('Print')}
                    </Button>

                    <Button variant="primary" ref={printA4ButtonRef} onClick={() => {
                        openPreview();
                    }}
                        onKeyDown={(e) => {
                            if (timerRef.current) clearTimeout(timerRef.current);

                            if (e.key === "ArrowLeft") {
                                timerRef.current = setTimeout(() => {
                                    printButtonRef.current.focus();
                                }, 100);
                            }
                        }}
                    >
                        <i className="bi bi-printer"></i> {t('Print A4 Invoice')}
                    </Button>
                </Modal.Body>
            </Modal >

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

            <Customers ref={CustomersRef} onSelectCustomer={handleSelectedCustomer} showToastMessage={props.showToastMessage} />
            <Quotation ref={QuotationRef} onSelectProducts={handleSelectedProducts} showToastMessage={props.showToastMessage} />
            <DeliveryNote ref={DeliveryNoteRef} onSelectProducts={handleSelectedProducts} showToastMessage={props.showToastMessage} />
            <Quotations ref={QuotationsRef} onSelectQuotation={handleSelectedQuotation} showToastMessage={props.showToastMessage} />
            <DeliveryNotes ref={DeliveryNotesRef} onSelectDeliveryNote={handleSelectedDeliveryNote} showToastMessage={props.showToastMessage} />
            <Products ref={ProductsRef} onSelectProducts={handleSelectedProductsFromProducts} showToastMessage={props.showToastMessage} />
            <SalesHistory ref={SalesHistoryRef} showToastMessage={props.showToastMessage} />
            <SalesReturnHistory ref={SalesReturnHistoryRef} showToastMessage={props.showToastMessage} />

            <PurchaseHistory ref={PurchaseHistoryRef} showToastMessage={props.showToastMessage} />
            <PurchaseReturnHistory ref={PurchaseReturnHistoryRef} showToastMessage={props.showToastMessage} />
            <QuotationHistory ref={QuotationHistoryRef} showToastMessage={props.showToastMessage} />
            <QuotationSalesReturnHistory ref={QuotationSalesReturnHistoryRef} showToastMessage={props.showToastMessage} />
            <DeliveryNoteHistory ref={DeliveryNoteHistoryRef} showToastMessage={props.showToastMessage} />

            <OrderView ref={DetailsViewRef} openCreateForm={props.openCreateForm} />
            <ProductView ref={ProductDetailsViewRef} />
            <CustomerCreate ref={CustomerCreateFormRef} showToastMessage={props.showToastMessage} />
            <ProductCreate ref={ProductCreateFormRef} showToastMessage={props.showToastMessage} />
            <UserCreate ref={UserCreateFormRef} showToastMessage={props.showToastMessage} />
            <SignatureCreate ref={SignatureCreateFormRef} showToastMessage={props.showToastMessage} />


            <Modal show={show} size="xl" fullscreen id="sales_create_form"
                onHide={handleClose} animation={false} backdrop="static" scrollable={true}>
                {formType === "type1" && (
                    <Modal.Header>
                        <Modal.Title>
                            {isUpdateForm ? t("Update Sales") + " #" + formData.code : t("Create New Sales Order")}
                        </Modal.Title>
                        {!isUpdateForm && store?.zatca?.phase === "2" && <div style={{ marginLeft: "20px" }}>
                            <input type="checkbox" className="form-check-input" id="sales_report_to_zatca" name="report_to_zatca" checked={formData.enable_report_to_zatca} onChange={(e) => {
                                formData.enable_report_to_zatca = !formData.enable_report_to_zatca;
                                setFormData({ ...formData });
                            }} style={{ width: "16px", height: "16px", verticalAlign: "middle", marginRight: "6px" }} /> {t("Report to Zatca")} <br />
                        </div>}
                        <div className="col align-self-end text-end">
                            <Button variant="primary" className="btn btn-primary" disabled={disablePreviousButton} onClick={(e) => { e.preventDefault(); if (isUpdateForm) { openPreviousForm(); } else { openLastForm(); } }}>
                                <i className="bi-chevron-double-left"></i> {t('Previous')}
                            </Button>
                            &nbsp;&nbsp;
                            <Button disabled={!isUpdateForm} variant="primary" className="btn btn-primary" onClick={(e) => { e.preventDefault(); openNextForm(); }}>
                                {t('Next')} <i className="bi-chevron-double-right"></i>
                            </Button>
                            &nbsp;&nbsp;
                            <Button disabled={!isUpdateForm} variant="primary" className="btn btn-primary" onClick={(e) => { e.preventDefault(); openCreateForm(); }}>
                                <i className="bi bi-plus"></i> {t('Create New')}
                            </Button>
                            &nbsp;&nbsp;
                            <Button variant="secondary" disabled={!isUpdateForm} onClick={openPrint}>
                                <i className="bi bi-printer"></i> {t('Print')}
                            </Button>
                            &nbsp;&nbsp;
                            <Button variant="primary" disabled={!isUpdateForm} onClick={openPreview}>
                                <i className="bi bi-printer"></i> {t('Print A4 Invoice')}
                            </Button>
                            &nbsp;&nbsp;
                            <Button variant="primary" style={{ minWidth: "80px" }} onClick={(e) => { e.preventDefault(); handleCreate(e); }}>
                                {isSubmitting ? <Spinner as="span" animation="border" size="sm" role="status" aria-hidden={true} /> : ""}
                                {isUpdateForm && !isSubmitting ? t('Update') : !isSubmitting ? t('Create') : ""}
                            </Button>
                            &nbsp;&nbsp;
                            {store.settings?.enable_sales_page_selection === true && (
                                <><select value={formType} onChange={(e) => setFormType(e.target.value)} className="form-select form-select-sm d-inline-block" style={{ width: "auto", fontSize: "11px", padding: "2px 24px 2px 6px", height: "26px", lineHeight: "1.2" }}>
                                    <option value="type2">{t("Type 2")} (New)</option>
                                    <option value="type1">{t("Type 1")} (Classic)</option>
                                </select>&nbsp;&nbsp;</>
                            )}
                            {/* ── DN Reminder Bell ── */}
                            {store.settings?.enable_notification === true && (
                                <Dropdown style={{ display: "inline-block", verticalAlign: "middle" }}>
                                    <Dropdown.Toggle as="span" style={{ cursor: "pointer", position: "relative", display: "inline-block", padding: "0 6px" }} id="dn-bell-t1">
                                        <i className="bi bi-bell fs-6"></i>
                                        {dnNotifications.length > 0 && (
                                            <span style={{ position: "absolute", top: "-4px", right: "1px", background: "red", color: "white", borderRadius: "50%", fontSize: "10px", fontWeight: "bold", minWidth: "16px", height: "16px", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 2px" }}>
                                                {dnNotifications.length}
                                            </span>
                                        )}
                                    </Dropdown.Toggle>
                                    <Dropdown.Menu align="end" style={{ minWidth: "320px", maxHeight: "400px", overflowY: "auto" }}>
                                        {dnNotifications.length === 0 ? (
                                            <Dropdown.ItemText className="text-muted small">No pending reminders</Dropdown.ItemText>
                                        ) : (
                                            dnNotifications.map(notif => (
                                                <div key={notif.id} style={{ display: "flex", alignItems: "flex-start", padding: "8px 14px", borderBottom: "1px solid #f0f0f0", gap: "6px" }}>
                                                    <div style={{ flex: 1, cursor: "pointer", minWidth: 0 }} onClick={() => openSalesFromDnInForm(notif)}>
                                                        <div style={{ fontSize: "13px", lineHeight: "1.4" }}>
                                                            <i className="bi bi-file-earmark-text text-primary me-2"></i>
                                                            Create Sales for DN <strong>{notif.code}</strong>
                                                        </div>
                                                        {notif.arrived_at && (
                                                            <div style={{ fontSize: "11px", color: "#888", marginTop: "3px" }}>
                                                                {_dnFormatDateTime(notif.arrived_at)}
                                                                <span style={{ marginLeft: "6px", fontWeight: 600, color: "#555" }}>· {_dnFormatTimeAgo(notif.arrived_at)}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <button onClick={(e) => { e.stopPropagation(); dismissDnNotification(notif.id, true); }} title="Dismiss" style={{ background: "none", border: "none", cursor: "pointer", color: "#aaa", fontSize: "16px", lineHeight: 1, padding: "0 2px", flexShrink: 0 }}>&times;</button>
                                                </div>
                                            ))
                                        )}
                                    </Dropdown.Menu>
                                </Dropdown>
                            )}
                            &nbsp;&nbsp;
                            <button type="button" className="btn-close" onClick={handleClose} aria-label="Close"></button>
                        </div>
                    </Modal.Header>
                )}
                {/* ==================== 💻 STITCH COMPACT HEADER (56px) ==================== */}
                {formType !== "type1" && <header className="bg-surface-container-lowest border-b border-outline-variant flex justify-between items-center px-md py-xs h-[56px] sticky top-0 z-50">
                    <div className="flex items-center gap-sm">
                        <span className="font-headline-lg text-headline-lg font-black text-primary">Start POS</span>
                        <div className="h-5 w-px bg-outline-variant mx-xs"></div>
                        <h1 className="font-headline-md text-headline-md text-on-surface m-0">
                            {isUpdateForm ? t("Update Sales") + " #" + formData.code : t("New Sales Order")}
                        </h1>
                        {!isUpdateForm && store?.zatca?.phase === "2" && (
                            <label style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "16px", cursor: "pointer" }}>
                                <input
                                    type="checkbox"
                                    className="form-check-input"
                                    id="sales_report_to_zatca"
                                    name="report_to_zatca"
                                    checked={formData.enable_report_to_zatca}
                                    onChange={(e) => {
                                        formData.enable_report_to_zatca = !formData.enable_report_to_zatca;
                                        setFormData({ ...formData });
                                    }}
                                    style={{ width: "14px", height: "14px", cursor: "pointer", flexShrink: 0, marginTop: 0 }}
                                />
                                <span style={{ fontSize: "12px", fontWeight: 600, color: "#434655" }}>{t("Report to Zatca")}</span>
                            </label>
                        )}
                    </div>
                    <div className="flex items-center gap-xs">
                        <Button
                            variant="secondary"
                            className="flex items-center gap-xs px-sm py-1 bg-secondary-container text-on-secondary-container rounded hover:bg-surface-variant transition-colors font-label-md border-0"
                            disabled={disablePreviousButton}
                            onClick={(e) => {
                                e.preventDefault();
                                if (isUpdateForm) {
                                    openPreviousForm();
                                } else {
                                    openLastForm();
                                }
                            }}
                        >
                            <span className="material-symbols-outlined text-[16px]">chevron_left</span> {t('Prev')}
                        </Button>
                        <Button
                            disabled={!isUpdateForm}
                            variant="secondary"
                            className="flex items-center gap-xs px-sm py-1 bg-secondary-container text-on-secondary-container rounded hover:bg-surface-variant transition-colors font-label-md border-0"
                            onClick={(e) => {
                                e.preventDefault();
                                openNextForm();
                            }}
                        >
                            {t('Next')} <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                        </Button>
                        <Button
                            disabled={!isUpdateForm}
                            variant="primary"
                            className="flex items-center gap-xs px-sm py-1 bg-primary text-on-primary rounded hover:bg-primary-container transition-colors font-label-md border-0"
                            onClick={(e) => {
                                e.preventDefault();
                                openCreateForm();
                            }}
                        >
                            <span className="material-symbols-outlined text-[16px]">add</span> {t('New')}
                        </Button>
                        <div className="h-5 w-px bg-outline-variant mx-xs"></div>
                        <button type="button" className="p-1 text-on-surface-variant hover:text-primary transition-colors border-0 bg-transparent cursor-pointer" onClick={openPrint} disabled={!isUpdateForm} title={t("Print")}>
                            <span className="material-symbols-outlined">print</span>
                        </button>
                        <button type="button" className="p-1 text-on-surface-variant hover:text-primary transition-colors border-0 bg-transparent cursor-pointer" onClick={openPreview} disabled={!isUpdateForm} title={t("Print A4 Invoice")}>
                            <span className="material-symbols-outlined">picture_as_pdf</span>
                        </button>
                        <Button
                            variant="primary"
                            className="bg-primary-container text-on-primary-container px-md py-1.5 rounded-lg font-bold text-label-md ml-xs border-0"
                            onClick={(e) => {
                                e.preventDefault();
                                handleCreate(e);
                            }}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden={true} className="mr-1" />
                            ) : null}
                            {isUpdateForm ? t('Update') : t('Create')}
                        </Button>
                        {store.settings?.enable_sales_page_selection === true && (
                            <><div className="h-5 w-px bg-outline-variant mx-xs"></div>
                                <select
                                    value={formType}
                                    onChange={(e) => setFormType(e.target.value)}
                                    style={{ fontSize: "12px", padding: "2px 6px", borderRadius: "4px", border: "1px solid var(--md-sys-color-outline-variant, #ccc)", background: "var(--md-sys-color-surface-container, #f5f5f5)", color: "var(--md-sys-color-on-surface, #1c1b1f)", cursor: "pointer" }}
                                    title={t("Form Type")}
                                >
                                    <option value="type2">{t("Type 2")} ✦</option>
                                    <option value="type1">{t("Type 1")} (Classic)</option>
                                </select></>
                        )}
                        {/* ── DN Reminder Bell (Type 2) ── */}
                        {store.settings?.enable_notification === true && (
                            <Dropdown>
                                <Dropdown.Toggle as="span" style={{ cursor: "pointer", position: "relative", display: "inline-flex", alignItems: "center", padding: "0 4px" }} id="dn-bell-t2">
                                    <span className="material-symbols-outlined" style={{ fontSize: "22px", color: "var(--md-sys-color-on-surface-variant, #49454f)" }}>notifications</span>
                                    {dnNotifications.length > 0 && (
                                        <span style={{ position: "absolute", top: "-2px", right: "0px", background: "red", color: "white", borderRadius: "50%", fontSize: "10px", fontWeight: "bold", minWidth: "16px", height: "16px", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 2px" }}>
                                            {dnNotifications.length}
                                        </span>
                                    )}
                                </Dropdown.Toggle>
                                <Dropdown.Menu align="end" style={{ minWidth: "320px", maxHeight: "400px", overflowY: "auto" }}>
                                    {dnNotifications.length === 0 ? (
                                        <Dropdown.ItemText className="text-muted small">No pending reminders</Dropdown.ItemText>
                                    ) : (
                                        dnNotifications.map(notif => (
                                            <div key={notif.id} style={{ display: "flex", alignItems: "flex-start", padding: "8px 14px", borderBottom: "1px solid #f0f0f0", gap: "6px" }}>
                                                <div style={{ flex: 1, cursor: "pointer", minWidth: 0 }} onClick={() => openSalesFromDnInForm(notif)}>
                                                    <div style={{ fontSize: "13px", lineHeight: "1.4" }}>
                                                        <i className="bi bi-file-earmark-text text-primary me-2"></i>
                                                        Create Sales for DN <strong>{notif.code}</strong>
                                                    </div>
                                                    {notif.arrived_at && (
                                                        <div style={{ fontSize: "11px", color: "#888", marginTop: "3px" }}>
                                                            {_dnFormatDateTime(notif.arrived_at)}
                                                            <span style={{ marginLeft: "6px", fontWeight: 600, color: "#555" }}>· {_dnFormatTimeAgo(notif.arrived_at)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <button onClick={(e) => { e.stopPropagation(); dismissDnNotification(notif.id, true); }} title="Dismiss" style={{ background: "none", border: "none", cursor: "pointer", color: "#aaa", fontSize: "16px", lineHeight: 1, padding: "0 2px", flexShrink: 0 }}>&times;</button>
                                            </div>
                                        ))
                                    )}
                                </Dropdown.Menu>
                            </Dropdown>
                        )}
                        <button type="button" className="text-on-surface-variant hover:text-error transition-colors ml-xs border-0 bg-transparent flex items-center justify-center cursor-pointer" onClick={handleClose} title={t("Close")}>
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                </header>}
                <Modal.Body className={formType !== "type1" ? "type2-active" : ""} style={formType !== "type1" ? { padding: 0, position: "relative" } : { overflowY: "auto" }}>
                    {isProcessing && (
                        <div style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: "rgba(255, 255, 255, 0.65)",
                            zIndex: 9999,
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            alignItems: "center",
                            backdropFilter: "blur(2px)",
                            gap: "10px",
                        }}>
                            <Spinner animation="border" variant="primary" style={{ width: "3rem", height: "3rem" }} />
                            <span className="font-label-lg font-bold text-primary">{t("Loading Order details...")}</span>
                        </div>
                    )}
                    {errors && Object.keys(errors).length > 0 && (
                        <div style={{
                            maxHeight: "120px",
                            overflowY: "auto",
                            padding: "8px 12px",
                            backgroundColor: "#fff0f0",
                            borderBottom: "1px solid #f5c6cb",
                            ...(formType !== "type1" ? {
                                position: "absolute",
                                top: 0,
                                right: 0,
                                width: "380px",
                                zIndex: 200,
                                borderLeft: "1px solid #f5c6cb",
                                boxShadow: "-2px 2px 8px rgba(186,26,26,0.12)",
                            } : {})
                        }}>
                            <ul style={{ marginBottom: 0 }}>
                                {Object.keys(errors).map((key, index) => {
                                    const message = Array.isArray(errors[key]) ? errors[key][0] : errors[key];
                                    return message ? (
                                        <li key={index} style={{ color: "red" }}>
                                            {t(message)}
                                        </li>
                                    ) : null;
                                })}
                            </ul>
                        </div>
                    )}
                    {formType === "type1" && (
                        <form className="row g-3 needs-validation" onSubmit={e => { e.preventDefault(); handleCreate(e); }} >
                            <div className="col-md-10" style={{ border: "solid 0px" }}>
                                <label className="form-label">{t('Customer')}</label>
                                <Typeahead
                                    id="customer_id"
                                    filterBy={() => true}
                                    labelKey="search_label"
                                    isLoading={false}
                                    emptyLabel=""
                                    clearButton={false}
                                    open={openCustomerSearchResult}
                                    onChange={(selectedItems) => {
                                        delete errors.customer_id;
                                        setErrors(errors);
                                        if (selectedItems.length === 0) {
                                            delete errors.customer_id;
                                            delete errors.blocked;
                                            //setErrors(errors);
                                            formData.customer_id = "";
                                            formData.customer_name = "";
                                            formData.customerName = "";
                                            setFormData({ ...formData });
                                            setSelectedCustomers([]);
                                            setOpenCustomerSearchResult(false);
                                            return;
                                        }

                                        formData.customer_id = selectedItems[0].id;
                                        if (selectedItems[0].use_remarks_in_sales && selectedItems[0].remarks) {
                                            formData.remarks = selectedItems[0].remarks;
                                        }

                                        if (selectedItems[0].phone && !formData.phone) {
                                            formData.phone = selectedItems[0].phone;
                                        }

                                        setFormData({ ...formData });
                                        setSelectedCustomers(selectedItems);
                                        setOpenCustomerSearchResult(false);

                                        // Warn immediately if this customer has too many unpaid sales
                                        if (store?.settings?.block_sales_after_pending_count > 0) {
                                            const storeId = localStorage.getItem("store_id");
                                            const cs = selectedItems[0]?.stores?.[storeId];
                                            const pendingCount = (cs?.sales_not_paid_count || 0) + (cs?.sales_paid_partially_count || 0);
                                            if (pendingCount >= store.settings.block_sales_after_pending_count) {
                                                errors.blocked = `Customer has ${pendingCount} unpaid sale(s). New sales are blocked until existing sales are paid.`;
                                            } else {
                                                delete errors.blocked;
                                            }
                                            setErrors({ ...errors });
                                        }
                                    }}
                                    options={customerOptions}
                                    placeholder={t('Customer Name / Mob / VAT # / ID')}
                                    selected={selectedCustomers}
                                    highlightOnlyResult={true}
                                    ref={customerSearchRef}
                                    onKeyDown={(e) => {
                                        if (e.key === "Escape") {
                                            delete errors.customer_id;
                                            //setErrors(errors);
                                            formData.customer_id = "";
                                            formData.customer_name = "";
                                            formData.customerName = "";
                                            setFormData({ ...formData });
                                            setSelectedCustomers([]);
                                            setCustomerOptions([]);
                                            setOpenCustomerSearchResult(false);
                                            customerSearchRef.current?.clear();
                                        }
                                    }}
                                    onInputChange={(searchTerm, e) => {
                                        if (searchTerm) {
                                            formData.customerName = searchTerm;
                                            formData.customer_name = searchTerm;
                                            setFormData({ ...formData });
                                        }

                                        if (timerRef.current) clearTimeout(timerRef.current);
                                        timerRef.current = setTimeout(() => {
                                            suggestCustomers(searchTerm);
                                        }, 100);
                                    }}
                                    renderMenu={(results, menuProps, state) => {
                                        const searchWords = state.text.toLowerCase().split(" ").filter(Boolean);

                                        return (
                                            <Menu {...menuProps}>
                                                {/* Header */}
                                                <MenuItem disabled>
                                                    <div style={{ display: 'flex', fontWeight: 'bold', padding: '4px 8px', borderBottom: '1px solid #ddd' }}>
                                                        <div style={{ width: '10%' }}>{t("ID")}</div>
                                                        <div style={{ width: '47%' }}>{t("Name")}</div>
                                                        <div style={{ width: '10%' }}>{t("Phone")}</div>
                                                        <div style={{ width: '13%' }}>{t("VAT NO.")}</div>
                                                        <div style={{ width: '10%' }}>{t("Credit Balance")}</div>
                                                        <div style={{ width: '10%' }}>{t("Credit Limit")}</div>
                                                    </div>
                                                </MenuItem>

                                                {/* Rows */}
                                                {results.map((option, index) => {
                                                    const onlyOneResult = results.length === 1;
                                                    const isActive = state.activeIndex === index || onlyOneResult;
                                                    return (
                                                        <MenuItem option={option} position={index} key={index}>
                                                            <div style={{ display: 'flex', padding: '4px 8px' }}>
                                                                <div style={{ ...columnStyle, width: '10%' }}>
                                                                    {highlightWords(
                                                                        option.code,
                                                                        searchWords,
                                                                        isActive
                                                                    )}
                                                                </div>
                                                                <div style={{ ...columnStyle, width: '47%' }}>
                                                                    {highlightWords(
                                                                        option.name_in_arabic
                                                                            ? `${option.name} - ${option.name_in_arabic}`
                                                                            : option.name,
                                                                        searchWords,
                                                                        isActive
                                                                    )}
                                                                </div>
                                                                <div style={{ ...columnStyle, width: '10%' }}>
                                                                    {highlightWords(option.phone, searchWords, isActive)}
                                                                </div>
                                                                <div style={{ ...columnStyle, width: '13%' }}>
                                                                    {highlightWords(option.vat_no, searchWords, isActive)}
                                                                </div>
                                                                <div style={{ ...columnStyle, width: '10%' }}>
                                                                    <div
                                                                        tabIndex={-1}
                                                                        className={isActive ? "btn btn-outline-light btn-sm" : "btn btn-outline-primary btn-sm"}
                                                                        onMouseDown={e => e.preventDefault()} // <-- This prevents menu from closing
                                                                        onClick={(e) => {
                                                                            e.preventDefault();
                                                                            e.stopPropagation();

                                                                            // openBalanceSheetDialogue(customer.account);
                                                                            openCustomerPending(option);
                                                                        }}>
                                                                        <Amount amount={trimTo2Decimals(option.credit_balance)} />
                                                                    </div>
                                                                </div>
                                                                <div style={{ ...columnStyle, width: '10%' }}>
                                                                    {option.credit_limit && (
                                                                        <Amount amount={trimTo2Decimals(option.credit_limit)} />
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </MenuItem>
                                                    );
                                                })}
                                            </Menu>
                                        );
                                    }}
                                />
                                <Button hide={true.toString()} onClick={openCustomerCreateForm} className="btn btn-outline-secondary btn-primary btn-sm" type="button" id="button-addon1"> <i className="bi bi-plus-lg"></i> {t('New')}</Button>

                                {selectedCustomers.length > 0 && formData.customer_id && <Button style={{ marginLeft: "8px" }} variant="btn btn-sm btn-primary" onClick={() => {
                                    openCustomerPending(selectedCustomers[0]);
                                }} >
                                    {t('Pendings')}
                                    <Badge bg="danger" style={{ marginLeft: "2px" }}>
                                        <Amount amount={trimTo2Decimals(selectedCustomers[0]?.credit_balance)} />
                                    </Badge>
                                </Button>}

                                {errors.customer_id && (
                                    <div style={{ color: "red" }}>
                                        {t(errors.customer_id)}
                                    </div>
                                )}
                                {errors.blocked && (
                                    <div style={{ color: "red", marginTop: "4px" }}>
                                        {errors.blocked}
                                    </div>
                                )}

                            </div>
                            <div className="col-md-1">
                                {formData.customer_id && <><Button className="btn btn-default" style={{ marginTop: "30px" }} onClick={() => {
                                    openCustomerUpdateForm(formData.customer_id);
                                }}>
                                    <i class="bi bi-pencil"></i>
                                </Button>&nbsp;</>}

                                <Button className="btn btn-primary" style={{ marginTop: "30px" }} onClick={openCustomers}>
                                    <i class="bi bi-list"></i>
                                </Button>


                            </div>

                            <div className="col-md-2">
                                <label className="form-label">{t('Product Barcode Scan')}</label>

                                <div className="input-group mb-3">
                                    <DebounceInput
                                        minLength={3}
                                        debounceTimeout={100}
                                        placeholder={t('Scan Barcode')}
                                        className="form-control barcode"
                                        value={formData.barcode}
                                        onChange={event => getProductByBarCode(event.target.value)} />
                                    {errors.bar_code && (
                                        <div style={{ color: "red" }}>

                                            {t(errors.bar_code)}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="col-md-3">
                                <label className="form-label">{t('Date') + " *"}</label>
                                <div className="input-group mb-3">
                                    <DatePicker
                                        id="date_str"
                                        selected={formData.date_str ? new Date(formData.date_str) : null}
                                        value={formData.date_str ? format(
                                            new Date(formData.date_str),
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
                                            formData.date_str = value;
                                            // formData.date_str = format(new Date(value), "MMMM d yyyy h:mm aa");
                                            setFormData({ ...formData });
                                        }}
                                    />

                                    {errors.date_str && (
                                        <div style={{ color: "red" }}>
                                            {t(errors.date_str)}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="col-md-2">
                                <label className="form-label">{t('Phone') + "( 05.. / +966..)"}</label>

                                <div className="input-group mb-3">
                                    <input
                                        id="sales_phone"
                                        name="sales_phone"
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

                                        placeholder={t('Phone')}
                                    />
                                </div>
                                {errors.phone && (
                                    <div style={{ color: "red" }}>

                                        {t(errors.phone)}
                                    </div>
                                )}
                            </div>

                            <div className="col-md-1">
                                <Button className={`btn btn-success btn-sm`} style={{ marginTop: "30px" }} onClick={sendWhatsAppMessage}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="white" viewBox="0 0 16 16">
                                        <path d="M13.601 2.326A7.875 7.875 0 0 0 8.036 0C3.596 0 0 3.597 0 8.036c0 1.417.37 2.805 1.07 4.03L0 16l3.993-1.05a7.968 7.968 0 0 0 4.043 1.085h.003c4.44 0 8.036-3.596 8.036-8.036 0-2.147-.836-4.166-2.37-5.673ZM8.036 14.6a6.584 6.584 0 0 1-3.35-.92l-.24-.142-2.37.622.63-2.31-.155-.238a6.587 6.587 0 0 1-1.018-3.513c0-3.637 2.96-6.6 6.6-6.6 1.764 0 3.42.69 4.67 1.94a6.56 6.56 0 0 1 1.93 4.668c0 3.637-2.96 6.6-6.6 6.6Zm3.61-4.885c-.198-.1-1.17-.578-1.352-.644-.18-.066-.312-.1-.444.1-.13.197-.51.644-.626.775-.115.13-.23.15-.428.05-.198-.1-.837-.308-1.594-.983-.59-.525-.99-1.174-1.11-1.372-.116-.198-.012-.305.088-.403.09-.09.198-.23.298-.345.1-.115.132-.197.2-.33.065-.13.032-.247-.017-.345-.05-.1-.444-1.07-.61-1.46-.16-.384-.323-.332-.444-.338l-.378-.007c-.13 0-.344.048-.525.23s-.688.672-.688 1.64c0 .967.704 1.9.802 2.03.1.13 1.386 2.116 3.365 2.963.47.203.837.324 1.122.414.472.15.902.13 1.24.08.378-.057 1.17-.48 1.336-.942.165-.462.165-.858.116-.943-.048-.084-.18-.132-.378-.23Z" />
                                    </svg>
                                </Button>
                            </div>



                            <div className="col-md-2">
                                <label className="form-label">{t('VAT NO.(15 digits)')}</label>

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

                                        placeholder={t('VAT NO.')}
                                    />
                                </div>
                                {errors.vat_no && (
                                    <div style={{ color: "red" }}>

                                        {t(errors.vat_no)}
                                    </div>
                                )}
                            </div>

                            <div className="col-md-3">
                                <label className="form-label">{t('Address')}</label>
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
                                        placeholder={t('Address')}
                                    />
                                </div>
                                {errors.address && (
                                    <div style={{ color: "red" }}>

                                        {t(errors.address)}
                                    </div>
                                )}
                            </div>
                            <div className="col-md-3">
                                <label className="form-label">{t('Remarks')}</label>
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
                                        placeholder={t('Remarks')}
                                    />
                                </div>
                                {errors.remarks && (
                                    <div style={{ color: "red" }}>

                                        {t(errors.remarks)}
                                    </div>
                                )}
                            </div>
                            <div className="col-md-10" >
                                <label className="form-label">{t('Product Search') + "*"}</label>
                                <Typeahead
                                    id="product_id"
                                    filterBy={() => true}
                                    size="lg"
                                    ref={productSearchRef}
                                    labelKey="search_label"
                                    inputProps={{ className: 'productSearch' }}
                                    emptyLabel=""
                                    clearButton={false}
                                    open={openProductSearchResult}
                                    isLoading={false}
                                    isInvalid={!!errors.product_id}
                                    onChange={(selectedItems) => {
                                        if (onChangeTriggeredRef.current) return;
                                        onChangeTriggeredRef.current = true;

                                        // Reset after short delay
                                        setTimeout(() => {
                                            onChangeTriggeredRef.current = false;
                                        }, 300);


                                        if (selectedItems.length === 0) {
                                            errors["product_id"] = "Invalid Product selected";
                                            setErrors(errors);
                                            return;
                                        }
                                        delete errors["product_id"];
                                        setErrors({ ...errors });

                                        addProduct(selectedItems[0]);
                                        productSearchRef.current?.clear();
                                        setOpenProductSearchResult(false);

                                        timerRef.current = setTimeout(() => {
                                            inputRefs.current[(selectedProducts.length - 1)][`sales_product_quantity_${selectedProducts.length - 1}`]?.select();
                                        }, 100);
                                    }}
                                    options={productOptions}
                                    placeholder={t('Part No. | Name | Name in Arabic | Brand | Country')}
                                    highlightOnlyResult={true}
                                    onKeyDown={(e) => {
                                        if (e.key === "Escape") {
                                            setProductOptions([]);
                                            setOpenProductSearchResult(false);
                                            productSearchRef.current?.clear();
                                        }

                                        timerRef.current = setTimeout(() => {
                                            productSearchRef.current?.focus();
                                        }, 100);
                                    }}
                                    onInputChange={(searchTerm, e) => {
                                        const requestId = Date.now();
                                        latestRequestRef.current = requestId;

                                        if (timerRef.current) clearTimeout(timerRef.current);
                                        timerRef.current = setTimeout(() => {
                                            if (latestRequestRef.current !== requestId) return;

                                            suggestProducts(searchTerm);
                                        }, 350);
                                    }}
                                    renderMenu={(results, menuProps, state) => {
                                        const searchWords = state.text.toLowerCase().split(" ").filter(Boolean);

                                        return (
                                            <Menu {...menuProps}>
                                                {/* Header */}
                                                <MenuItem disabled style={{ position: 'sticky', top: 0, padding: 0, margin: 0 }}>
                                                    <div style={{
                                                        background: '#f8f9fa',
                                                        zIndex: 2,
                                                        display: 'flex',
                                                        fontWeight: 'bold',
                                                        padding: '4px 8px',
                                                        border: "solid 0px",
                                                        borderBottom: '1px solid #ddd',
                                                        pointerEvents: "auto" // <-- allow click here
                                                    }}>
                                                        {searchProductsColumns.filter(c => c.visible).map((col) => {
                                                            return (<>
                                                                {col.key === "select" && <div style={{ width: getColumnWidth(col), border: "solid 0px", }}></div>}
                                                                {col.key === "part_number" && <div style={{ width: getColumnWidth(col), border: "solid 0px", }}>{t("Part Number")}</div>}
                                                                {col.key === "name" && <div style={{ width: getColumnWidth(col), border: "solid 0px", }}>{t("Name")}</div>}
                                                                {col.key === "unit_price" && <div style={{ width: getColumnWidth(col), border: "solid 0px", }}>{t("S.Unit Price")}</div>}
                                                                {col.key === "stock" && <div style={{ width: getColumnWidth(col), border: "solid 0px", }}>{t("Stock")}</div>}
                                                                {col.key === "photos" && <div style={{ width: getColumnWidth(col), border: "solid 0px", }}>{t("Photos")}</div>}
                                                                {col.key === "brand" && <div style={{ width: getColumnWidth(col), border: "solid 0px", }}>{t("Brand")}</div>}
                                                                {col.key === "purchase_price" && <div style={{ width: getColumnWidth(col), border: "solid 0px", }}>{t("P.Unit Price")}</div>}
                                                                {col.key === "country" && <div style={{ width: getColumnWidth(col), border: "solid 0px", }}>{t("Country")}</div>}
                                                                {col.key === "rack" && <div style={{ width: getColumnWidth(col), border: "solid 0px", }}>{t("Rack")}</div>}
                                                            </>)
                                                        })}
                                                        {/* Settings icon on right */}
                                                        <div
                                                            style={{
                                                                position: "absolute",
                                                                right: "8px",
                                                                top: "50%",
                                                                transform: "translateY(-50%)",
                                                                cursor: "pointer",
                                                            }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setShowProductSearchSettings(true);
                                                            }}
                                                        >
                                                            <i className="bi bi-gear-fill" />
                                                        </div>
                                                    </div>
                                                </MenuItem>

                                                {/* Rows */}
                                                {results.map((option, index) => {

                                                    const onlyOneResult = results.length === 1;
                                                    const isActive = state.activeIndex === index || onlyOneResult;

                                                    let checked = isProductAdded(option.id);
                                                    return (
                                                        <MenuItem option={option} position={index} key={index} style={{ padding: "0px" }}>
                                                            <div style={{ display: 'flex', padding: '4px 8px' }}>
                                                                {searchProductsColumns.filter(c => c.visible).map((col) => {
                                                                    return (<>
                                                                        {col.key === "select" &&
                                                                            <div
                                                                                className="form-check"
                                                                                style={{ ...columnStyle, width: getColumnWidth(col) }}
                                                                                onClick={e => {
                                                                                    e.stopPropagation();     // Stop click bubbling to parent MenuItem
                                                                                    checked = !checked;

                                                                                    if (timerRef.current) clearTimeout(timerRef.current);
                                                                                    timerRef.current = setTimeout(() => {
                                                                                        if (checked) {
                                                                                            addProduct(option);
                                                                                        } else {
                                                                                            removeProduct(option);
                                                                                        }
                                                                                    }, 100);

                                                                                }}
                                                                            >
                                                                                <input
                                                                                    className="form-check-input"
                                                                                    type="checkbox"
                                                                                    value={checked}
                                                                                    checked={checked}
                                                                                    onClick={e => {
                                                                                        e.stopPropagation();     // Stop click bubbling to parent MenuItem
                                                                                    }}
                                                                                    onChange={e => {
                                                                                        e.preventDefault();      // Prevent default selection behavior
                                                                                        e.stopPropagation();

                                                                                        checked = !checked;

                                                                                        if (timerRef.current) clearTimeout(timerRef.current);
                                                                                        timerRef.current = setTimeout(() => {
                                                                                            if (checked) {
                                                                                                addProduct(option);
                                                                                            } else {
                                                                                                removeProduct(option);
                                                                                            }
                                                                                        }, 100);
                                                                                    }}
                                                                                />
                                                                            </div>
                                                                        }
                                                                        {col.key === "part_number" &&
                                                                            <div style={{ ...columnStyle, width: getColumnWidth(col) }}>
                                                                                {highlightWords(
                                                                                    option.prefix_part_number
                                                                                        ? `${option.prefix_part_number}-${option.part_number}`
                                                                                        : option.part_number,
                                                                                    searchWords,
                                                                                    isActive
                                                                                )}
                                                                            </div>
                                                                        }
                                                                        {col.key === "name" &&
                                                                            <div style={{ ...columnStyle, width: getColumnWidth(col) }}>
                                                                                {highlightWords(
                                                                                    option.name_in_arabic
                                                                                        ? `${option.name} - ${option.name_in_arabic}`
                                                                                        : option.name,
                                                                                    searchWords,
                                                                                    isActive
                                                                                )}
                                                                            </div>
                                                                        }
                                                                        {col.key === "unit_price" &&
                                                                            <div style={{ ...columnStyle, width: getColumnWidth(col) }}>
                                                                                {option.product_stores?.[localStorage.getItem("store_id")]?.retail_unit_price && (
                                                                                    <>
                                                                                        <Amount amount={trimTo2Decimals(option.product_stores?.[localStorage.getItem("store_id")]?.retail_unit_price)} />+
                                                                                    </>
                                                                                )}
                                                                                {option.product_stores?.[localStorage.getItem("store_id")]?.retail_unit_price_with_vat && (
                                                                                    <>
                                                                                        |<Amount amount={trimTo2Decimals(option.product_stores?.[localStorage.getItem("store_id")]?.retail_unit_price_with_vat)} />
                                                                                    </>
                                                                                )}
                                                                            </div>
                                                                        }
                                                                        {col.key === "stock" &&
                                                                            <div style={{ ...columnStyle, width: getColumnWidth(col) }}>
                                                                                {(() => {
                                                                                    const storeId = localStorage.getItem("store_id");
                                                                                    const productStore = option.product_stores?.[storeId];
                                                                                    const totalStock = productStore?.stock ?? 0;
                                                                                    const warehouseStocks = productStore?.warehouse_stocks ?? {};

                                                                                    // Build warehouse stock details string
                                                                                    const warehouseDetails = (() => {
                                                                                        // Always show MS first
                                                                                        let details = [];
                                                                                        if (warehouseStocks["main_store"] !== undefined) {
                                                                                            details.push(`MS: ${warehouseStocks["main_store"]}`);
                                                                                        }
                                                                                        Object.entries(warehouseStocks)
                                                                                            .filter(([key]) => key !== "main_store")
                                                                                            .forEach(([key, value]) => {
                                                                                                details.push(`${key.replace(/^w/, "WH").toUpperCase()}: ${value}`);
                                                                                            });
                                                                                        return details.join(", ");
                                                                                    })();

                                                                                    // Final display string
                                                                                    return (
                                                                                        <span>
                                                                                            {totalStock}
                                                                                            {warehouseDetails && store.settings.enable_warehouse_module ? ` (${warehouseDetails})` : ""}
                                                                                        </span>
                                                                                    );
                                                                                })()}
                                                                            </div>
                                                                        }
                                                                        {col.key === "photos" &&
                                                                            <div style={{ ...columnStyle, width: getColumnWidth(col) }}>
                                                                                <button
                                                                                    type="button"
                                                                                    className={isActive ? "btn btn-outline-light btn-sm" : "btn btn-outline-primary btn-sm"}
                                                                                    onClick={(e) => {
                                                                                        e.preventDefault();
                                                                                        e.stopPropagation();
                                                                                        openProductImages(option.id);
                                                                                    }}
                                                                                >
                                                                                    <i className="bi bi-images" aria-hidden="true" />
                                                                                </button>
                                                                            </div>
                                                                        }
                                                                        {col.key === "brand" &&
                                                                            <div style={{ ...columnStyle, width: getColumnWidth(col) }}>
                                                                                {highlightWords(option.brand_name, searchWords, isActive)}
                                                                            </div>
                                                                        }
                                                                        {col.key === "purchase_price" &&
                                                                            <div style={{ ...columnStyle, width: getColumnWidth(col) }}>
                                                                                {option.product_stores?.[localStorage.getItem("store_id")]?.purchase_unit_price && (
                                                                                    <>
                                                                                        <Amount amount={trimTo2Decimals(option.product_stores?.[localStorage.getItem("store_id")]?.purchase_unit_price)} />+
                                                                                    </>
                                                                                )}
                                                                                {option.product_stores?.[localStorage.getItem("store_id")]?.purchase_unit_price_with_vat && (
                                                                                    <>
                                                                                        |<Amount amount={trimTo2Decimals(option.product_stores?.[localStorage.getItem("store_id")]?.purchase_unit_price_with_vat)} />
                                                                                    </>
                                                                                )}
                                                                            </div>
                                                                        }
                                                                        {col.key === "country" &&
                                                                            <div style={{ ...columnStyle, width: getColumnWidth(col) }}>
                                                                                {highlightWords(option.country_name, searchWords, isActive)}
                                                                            </div>
                                                                        }
                                                                        {col.key === "rack" &&
                                                                            <div style={{ ...columnStyle, width: getColumnWidth(col) }}>
                                                                                {highlightWords(option.rack, searchWords, isActive)}
                                                                            </div>
                                                                        }
                                                                    </>)
                                                                })}
                                                            </div>
                                                        </MenuItem>
                                                    );
                                                })}
                                            </Menu>
                                        );
                                    }}
                                />

                                <Button hide={true.toString()} onClick={openProductCreateForm} className="btn btn-outline-secondary btn-primary btn-sm" type="button" id="button-addon1"> <i className="bi bi-plus-lg"></i> {t('New')}</Button>
                                {errors.product_id ? (
                                    <div style={{ color: "red" }}>

                                        {t(errors.product_id)}
                                    </div>
                                ) : ""}
                            </div>

                            <div className="col-md-1">
                                <Button className="btn btn-primary" style={{ marginTop: "30px" }} onClick={openProducts}>
                                    <i class="bi bi-list"></i>
                                </Button>
                            </div>

                            <div className="col-md-1">
                                <div style={{ zIndex: "9999 !important", marginTop: "30px" }}>
                                    <Dropdown style={{}}>
                                        <Dropdown.Toggle variant="success" id="dropdown-basic">
                                            <i className="bi bi-download"></i>    {t('Import')}
                                        </Dropdown.Toggle>
                                        <Dropdown.Menu >
                                            <Dropdown.Item onClick={() => {
                                                openQuotations();
                                            }}>
                                                <i className="bi bi-file-earmark-text"></i>
                                                &nbsp;
                                                {t('From Quotations')}
                                            </Dropdown.Item>

                                            <Dropdown.Item onClick={() => {
                                                openDeliveryNotes();
                                            }}>
                                                <i className="bi bi-file-earmark-text"></i>
                                                &nbsp;
                                                {t('From Delivery Notes')}
                                            </Dropdown.Item>
                                        </Dropdown.Menu>
                                    </Dropdown>

                                    {/*<div className="input-group mb-4">*/}
                                    {/*<Dropdown drop="top" variant="success">
                                    <Dropdown.Toggle variant="success" id="dropdown-secondary" style={{}}>
                                        <i className="bi bi-download"></i>    Import Product from
                                    </Dropdown.Toggle>


                                    <Dropdown.Menu >
                                        <Dropdown.Item onClick={() => {
                                            openLinkedProducts();
                                        }}>
                                            <i className="bi bi-file-earmark-text"></i>
                                            &nbsp;
                                            Quotations
                                        </Dropdown.Item>

                                        <Dropdown.Item onClick={() => {
                                            openSalesHistory();
                                        }}>
                                            <i className="bi bi-file-earmark-text"></i>
                                            &nbsp;
                                            Delivery Notes
                                        </Dropdown.Item>
                                    </Dropdown.Menu>
                                </Dropdown>*/}
                                </div>
                            </div>



                            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0" }}>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-outline-secondary"
                                    onClick={() => setShowSelectedProductsSettings(!showSelectedProductsSettings)}
                                    title={t("Table Settings")}
                                >
                                    <i className="bi bi-gear-fill" style={{ fontSize: "1rem" }} />
                                </button>
                            </div>
                            <div className="table-responsive" style={{ overflowX: "auto", maxHeight: "400px", overflowY: "scroll" }}>


                                <table className="table table-striped table-sm table-bordered">
                                    <thead>
                                        <tr className="text-center">
                                            {selectedProductsColumns.filter(c => c.visible).map(col => {
                                                if (col.key === 'delete') return <th key={col.key}></th>;
                                                if (col.key === 'si_no') return <th key={col.key}>{t('SI No.')}</th>;
                                                if (col.key === 'part_number') return <th key={col.key}>{t('Part No.')}</th>;
                                                if (col.key === 'name') return <th key={col.key} style={{ minWidth: "250px" }}>{t('Name')}</th>;
                                                if (col.key === 'info') return <th key={col.key}>{t('Info')}</th>;
                                                if (col.key === 'purchase_unit_price') return <th key={col.key}>{t('Purchase Unit Price(without VAT)')}</th>;
                                                if (col.key === 'stock') return <th key={col.key}>{t('Stock')}</th>;
                                                if (col.key === 'warehouse') return store.settings?.enable_warehouse_module ? <th key={col.key}>{t('Remove Stock From')}</th> : null;
                                                if (col.key === 'qty') return <th key={col.key} style={{ minWidth: "80px", maxWidth: "80px" }}>{t('Qty')}</th>;
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
                                    </thead>
                                    <tbody>
                                        {selectedProducts.map((product, index) => {
                                            // Find all indexes with the same product_id
                                            const duplicateIndexes = selectedProducts
                                                .map((p, i) => p.product_id === product.product_id ? i : -1)
                                                .filter(i => i !== -1);
                                            const duplicateCount = duplicateIndexes.length;
                                            return (
                                                <tr
                                                    className="text-center fixed-row"
                                                    key={index}>
                                                    {selectedProductsColumns.filter(c => c.visible).map(col => {
                                                        if (col.key === 'delete') return (<td style={{ verticalAlign: 'middle', padding: '0.25rem' }} >
                                                            <div
                                                                style={{ color: "red", cursor: "pointer" }}
                                                                onClick={() => {
                                                                    removeProduct(product);
                                                                }}
                                                            >
                                                                <i className="bi bi-trash"> </i>
                                                            </div>
                                                        </td>);
                                                        if (col.key === 'si_no') return (<td style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                            {index + 1}

                                                        </td>);
                                                        if (col.key === 'part_number') return (<ResizableTableCell style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                                                <input type="text" id={`sales_product_part_number${index}`}
                                                                    name={`sales_product_part_number${index}`}
                                                                    onWheel={(e) => e.target.blur()}
                                                                    value={selectedProducts[index].part_number}
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
                                                                    <i
                                                                        className={`bi bi-exclamation-circle-fill ${errors[`part_number_${index}`] ? 'text-danger' : 'text-warning'} ms-2`}
                                                                        data-bs-toggle="tooltip"
                                                                        data-bs-placement="top"
                                                                        data-error={errors[`part_number_${index}`] || ''}
                                                                        data-warning={warnings[`part_number_${index}`] || ''}
                                                                        title={errors[`part_number_${index}`] || warnings[`part_number_${index}`] || ''}
                                                                        style={{
                                                                            fontSize: '0.85rem',
                                                                            cursor: 'pointer',
                                                                            whiteSpace: 'nowrap',
                                                                        }}
                                                                    ></i>
                                                                )}

                                                            </div>
                                                        </ResizableTableCell>);
                                                        if (col.key === 'name') return (<ResizableTableCell style={{ verticalAlign: 'middle', padding: '0.25rem' }}
                                                        >
                                                            <div className="input-group" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                                                <input type="text" id={`${"sales_product_name" + index}`}
                                                                    name={`${"sales_product_name" + index}`}
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
                                                        </ResizableTableCell>);
                                                        if (col.key === 'info') return (<td style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
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

                                                                        <Dropdown.Item onClick={() => openPurchaseHistory(product)}>
                                                                            <i className="bi bi-clock-history"></i>&nbsp;
                                                                            {t("Purchase History")} ({getShortcut('purchaseHistory')})
                                                                        </Dropdown.Item>

                                                                        <Dropdown.Item onClick={() => openPurchaseReturnHistory(product)}>
                                                                            <i className="bi bi-clock-history"></i>&nbsp;
                                                                            {t("Purchase Return History")} ({getShortcut('purchaseReturnHistory')})
                                                                        </Dropdown.Item>

                                                                        <Dropdown.Item onClick={() => openDeliveryNoteHistory(product)}>
                                                                            <i className="bi bi-clock-history"></i>&nbsp;
                                                                            {t("Delivery Note History")} ({getShortcut('deliveryNoteHistory')})
                                                                        </Dropdown.Item>

                                                                        <Dropdown.Item onClick={() => openQuotationHistory(product, "quotation")}>
                                                                            <i className="bi bi-clock-history"></i>&nbsp;
                                                                            {t("Quotation History")} ({getShortcut('quotationHistory')})
                                                                        </Dropdown.Item>

                                                                        <Dropdown.Item onClick={() => openQuotationSalesHistory(product)}>
                                                                            <i className="bi bi-clock-history"></i>&nbsp;
                                                                            {t("Qtn. Sales History")} ({getShortcut('quotationSalesHistory')})
                                                                        </Dropdown.Item>

                                                                        <Dropdown.Item onClick={() => openQuotationSalesReturnHistory(product)}>
                                                                            <i className="bi bi-clock-history"></i>&nbsp;
                                                                            {t("Qtn. Sales Return History")} ({getShortcut('quotationSalesReturnHistory')})
                                                                        </Dropdown.Item>

                                                                        <Dropdown.Item onClick={() => openProductImages(product.product_id)}>
                                                                            <i className="bi bi-clock-history"></i>&nbsp;
                                                                            {t("Images")} ({getShortcut('images')})
                                                                        </Dropdown.Item>
                                                                    </Dropdown.Menu>

                                                                </Dropdown>
                                                            </div>

                                                        </td>);

                                                        if (col.key === 'purchase_unit_price') return (<td style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                            <div className="input-group">
                                                                <input
                                                                    type="number"
                                                                    id={`sales_product_purchase_unit_price_${index}`}
                                                                    name={`sales_product_purchase_unit_price_${index}`}
                                                                    className={`form-control text-end ${errors["purchase_unit_price_" + index] ? 'is-invalid' : ''} ${warnings["purchase_unit_price_" + index] ? 'border-warning text-warning' : ''}`}
                                                                    onWheel={(e) => e.target.blur()}
                                                                    value={product.purchase_unit_price}
                                                                    placeholder={t("Purchase Unit Price")}
                                                                    ref={(el) => {
                                                                        if (!inputRefs.current[index]) inputRefs.current[index] = {};
                                                                        inputRefs.current[index][`${"sales_product_purchase_unit_price_" + index}`] = el;
                                                                    }}
                                                                    onFocus={() => {
                                                                        if (timerRef.current) clearTimeout(timerRef.current);
                                                                        timerRef.current = setTimeout(() => {
                                                                            inputRefs.current[index][`${"sales_product_purchase_unit_price_" + index}`]?.select();
                                                                        }, 20);
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
                                                                                timerRef.current = setTimeout(() => {
                                                                                    productSearchRef.current?.focus();
                                                                                }, 100);
                                                                            } else {
                                                                                timerRef.current = setTimeout(() => {
                                                                                    inputRefs.current[(index + 1)][`${"sales_unit_discount_with_vat_" + (index + 1)}`]?.select();
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
                                                        </td>);

                                                        if (col.key === 'stock') return (<td
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
                                                        if (col.key === 'warehouse') return store.settings?.enable_warehouse_module ? (<td style={{
                                                            verticalAlign: 'middle',
                                                            padding: '0.25rem',
                                                            whiteSpace: 'nowrap',
                                                            width: 'auto',
                                                            position: 'relative',
                                                        }} >
                                                            <select
                                                                id={`sales_product_warehouse_${index}`}
                                                                name={`sales_product_warehouse_${index}`}
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
                                                        if (col.key === 'qty') return (<td style={{
                                                            verticalAlign: 'middle',
                                                            padding: '0.25rem',
                                                            whiteSpace: 'nowrap',
                                                            width: 'auto',
                                                            position: 'relative',
                                                        }} >
                                                            <div className="d-flex align-items-center" style={{}}>
                                                                <div className="input-group flex-nowrap" style={{ flex: '1 1 auto' }}>
                                                                    <input type="number"
                                                                        style={{ minWidth: "80px", maxWidth: "80px" }}
                                                                        id={`${"sales_product_quantity_" + index}`}
                                                                        name={`${"sales_product_quantity" + index}`}
                                                                        className={`form-control text-end ${errors["quantity_" + index] ? 'is-invalid' : warnings["quantity_" + index] ? 'border-warning text-warning' : ''}`}
                                                                        onWheel={(e) => e.target.blur()}
                                                                        value={product.quantity}
                                                                        placeholder="Quantity"
                                                                        ref={(el) => {
                                                                            if (!inputRefs.current[index]) inputRefs.current[index] = {};
                                                                            inputRefs.current[index][`${"sales_product_quantity_" + index}`] = el;
                                                                        }}
                                                                        onFocus={() => {
                                                                            if (timerRef.current) clearTimeout(timerRef.current);
                                                                            timerRef.current = setTimeout(() => {
                                                                                inputRefs.current[index][`${"sales_product_quantity_" + index}`]?.select();
                                                                            }, 20);
                                                                        }}
                                                                        onKeyDown={(e) => {
                                                                            RunKeyActions(e, product);
                                                                            if (timerRef.current) clearTimeout(timerRef.current);

                                                                            if (e.key === "Backspace") {
                                                                                selectedProducts[index].quantity = "";
                                                                                setSelectedProducts([...selectedProducts]);
                                                                                timerRef.current = setTimeout(() => {
                                                                                    CalCulateLineTotals(index);
                                                                                    checkWarning(index, selectedProducts[index]);
                                                                                    checkErrors(index);
                                                                                    reCalculate(index);
                                                                                }, 100);
                                                                            } else if (e.key === "ArrowLeft") {
                                                                                timerRef.current = setTimeout(() => {
                                                                                    inputRefs.current[index][`${"sales_product_purchase_unit_price_" + index}`]?.select();
                                                                                }, 100);
                                                                            }
                                                                        }}
                                                                        onChange={(e) => {
                                                                            if (timerRef.current) clearTimeout(timerRef.current);

                                                                            if (parseFloat(e.target.value) === 0) {
                                                                                selectedProducts[index].quantity = e.target.value;
                                                                                setSelectedProducts([...selectedProducts]);
                                                                                timerRef.current = setTimeout(() => {
                                                                                    CalCulateLineTotals(index);
                                                                                    checkWarning(index, selectedProducts[index]);
                                                                                    checkErrors(index);
                                                                                    reCalculate(index);
                                                                                }, 100);
                                                                                return;
                                                                            }


                                                                            if (!e.target.value) {
                                                                                selectedProducts[index].quantity = e.target.value;
                                                                                setSelectedProducts([...selectedProducts]);
                                                                                timerRef.current = setTimeout(() => {
                                                                                    CalCulateLineTotals(index);
                                                                                    checkErrors(index);
                                                                                    checkWarning(index, selectedProducts[index]);
                                                                                    reCalculate(index);
                                                                                }, 100);
                                                                                return;
                                                                            }


                                                                            product.quantity = parseFloat(e.target.value);
                                                                            selectedProducts[index].quantity = parseFloat(e.target.value);
                                                                            timerRef.current = setTimeout(() => {
                                                                                CalCulateLineTotals(index);
                                                                                checkErrors(index);
                                                                                checkWarning(index, selectedProducts[index]);
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
                                                        </td>);

                                                        if (col.key === 'unit_price') return (<td style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                            <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                                                                <div className="input-group flex-nowrap" style={{ flex: '1 1 auto', minWidth: 0 }}>
                                                                    <input type="number"
                                                                        id={`${"sales_product_unit_price_" + index}`}
                                                                        name={`${"sales_product_unit_price_" + index}`}
                                                                        onWheel={(e) => e.target.blur()}
                                                                        value={selectedProducts[index].unit_price}
                                                                        className={`form-control text-end ${errors["unit_price_" + index] ? 'is-invalid' : ''} ${warnings["unit_price_" + index] ? 'border-warning text-warning' : ''}`}
                                                                        placeholder="Unit Price(without VAT)"
                                                                        ref={(el) => {
                                                                            if (!inputRefs.current[index]) inputRefs.current[index] = {};
                                                                            inputRefs.current[index][`${"sales_product_unit_price_" + index}`] = el;
                                                                        }}

                                                                        onFocus={() => {
                                                                            if (timerRef.current) clearTimeout(timerRef.current);
                                                                            timerRef.current = setTimeout(() => {
                                                                                inputRefs.current[index][`${"sales_product_unit_price_" + index}`]?.select();
                                                                            }, 20);
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
                                                                                    checkErrors(index);
                                                                                    reCalculate(index);
                                                                                }, 100);
                                                                            } else if (e.key === "ArrowLeft") {
                                                                                timerRef.current = setTimeout(() => {
                                                                                    inputRefs.current[index][`${"sales_product_quantity_" + index}`]?.select();
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
                                                                                    CalCulateLineTotals(index);
                                                                                    checkErrors(index);
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
                                                                                    CalCulateLineTotals(index);
                                                                                    checkErrors(index);
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
                                                                                selectedProducts[index].unit_discount_percent = parseFloat(trimTo2Decimals(((selectedProducts[index].unit_discount / selectedProducts[index].unit_price) * 100)))
                                                                                selectedProducts[index].unit_discount_percent_with_vat = parseFloat(trimTo2Decimals(((selectedProducts[index].unit_discount_with_vat / selectedProducts[index].unit_price_with_vat) * 100)))
                                                                                CalCulateLineTotals(index);
                                                                                reCalculate(index);
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
                                                        </td>);
                                                        if (col.key === 'unit_price_with_vat') return (<td style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                            <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                                                                <div className="input-group flex-nowrap" style={{ flex: '1 1 auto', minWidth: 0 }}>
                                                                    <input type="number"
                                                                        id={`${"sales_product_unit_price_with_vat_" + index}`}
                                                                        name={`${"sales_product_unit_price_with_vat_" + index}`}
                                                                        onWheel={(e) => e.target.blur()}
                                                                        value={selectedProducts[index].unit_price_with_vat}
                                                                        className={`form-control text-end ${errors["unit_price_with_vat_" + index] ? 'is-invalid' : ''} ${warnings["unit_price_with_vat_" + index] ? 'border-warning text-warning' : ''}`}
                                                                        ref={(el) => {
                                                                            if (!inputRefs.current[index]) inputRefs.current[index] = {};
                                                                            inputRefs.current[index][`${"sales_product_unit_price_with_vat_" + index}`] = el;
                                                                        }}
                                                                        placeholder={t("Unit Price(with VAT)")}

                                                                        onFocus={() => {
                                                                            if (timerRef.current) clearTimeout(timerRef.current);
                                                                            timerRef.current = setTimeout(() => {
                                                                                inputRefs.current[index][`${"sales_product_unit_price_with_vat_" + index}`]?.select();
                                                                            }, 20);
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
                                                                                    inputRefs.current[index][`${"sales_product_unit_price_" + index}`]?.select();
                                                                                }, 50);
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
                                                                                selectedProducts[index].unit_discount_with_vat = parseFloat(trimTo2Decimals(selectedProducts[index].unit_discount * (1 + (formData.vat_percent / 100))))

                                                                                selectedProducts[index].unit_discount_percent = parseFloat(trimTo2Decimals(((selectedProducts[index].unit_discount / selectedProducts[index].unit_price) * 100)))
                                                                                selectedProducts[index].unit_discount_percent_with_vat = parseFloat(trimTo2Decimals(((selectedProducts[index].unit_discount_with_vat / selectedProducts[index].unit_price_with_vat) * 100)))

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
                                                        </td>);
                                                        if (col.key === 'unit_discount') return (<td style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                            <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                                                                <div className="input-group flex-nowrap" style={{ flex: '1 1 auto', minWidth: 0 }}>
                                                                    <input type="number"
                                                                        id={`${"sales_unit_discount_" + index}`}
                                                                        name={`${"sales_unit_discount_" + index}`}
                                                                        onWheel={(e) => e.target.blur()}
                                                                        className={`form-control text-end ${errors["unit_discount_" + index] ? 'is-invalid' : ''} ${warnings["unit_discount_" + index] ? 'border-warning text-warning' : ''}`}
                                                                        value={selectedProducts[index].unit_discount}
                                                                        ref={(el) => {
                                                                            if (!inputRefs.current[index]) inputRefs.current[index] = {};
                                                                            inputRefs.current[index][`${"sales_unit_discount_" + index}`] = el;
                                                                        }}
                                                                        onFocus={() => {
                                                                            if (timerRef.current) clearTimeout(timerRef.current);
                                                                            timerRef.current = setTimeout(() => {
                                                                                inputRefs.current[index][`${"sales_unit_discount_" + index}`]?.select();
                                                                            }, 20);
                                                                        }}
                                                                        onKeyDown={(e) => {
                                                                            RunKeyActions(e, product);

                                                                            if (timerRef.current) clearTimeout(timerRef.current);
                                                                            if (e.key === "ArrowLeft") {
                                                                                timerRef.current = setTimeout(() => {
                                                                                    inputRefs.current[index][`${"sales_product_unit_price_with_vat_" + index}`]?.select();
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
                                                                                errors["unit_discount_" + index] = t("Unit discount should be greater than or equal 0");
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
                                                                                selectedProducts[index].unit_discount_with_vat = parseFloat(trimTo8Decimals(selectedProducts[index].unit_discount * (1 + (formData.vat_percent / 100))))

                                                                                selectedProducts[index].unit_discount_percent = parseFloat(trimTo8Decimals(((selectedProducts[index].unit_discount / selectedProducts[index].unit_price) * 100)))
                                                                                selectedProducts[index].unit_discount_percent_with_vat = parseFloat(trimTo8Decimals(((selectedProducts[index].unit_discount_with_vat / selectedProducts[index].unit_price_with_vat) * 100)))
                                                                                CalCulateLineTotals(index);
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
                                                        </td>);
                                                        /*} ref={(el) => inputRefs.current[index] = el}
                                                            onFocus={() => inputRefs.current[index]?.select()}*/
                                                        if (col.key === 'unit_discount_with_vat') return (<td style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                            <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                                                                <div className="input-group flex-nowrap" style={{ flex: '1 1 auto', minWidth: 0 }}>
                                                                    <input type="number"
                                                                        id={`${"sales_unit_discount_with_vat_" + index}`}
                                                                        name={`${"sales_unit_discount_with_vat_" + index}`}
                                                                        onWheel={(e) => e.target.blur()}
                                                                        className={`form-control text-end ${errors["unit_discount_with_vat_" + index] ? 'is-invalid' : ''} ${warnings["unit_discount_with_vat_" + index] ? 'border-warning text-warning' : ''}`}
                                                                        value={selectedProducts[index].unit_discount_with_vat}
                                                                        ref={(el) => {
                                                                            if (!inputRefs.current[index]) inputRefs.current[index] = {};
                                                                            inputRefs.current[index][`${"sales_unit_discount_with_vat_" + index}`] = el;
                                                                        }}
                                                                        onFocus={() => {
                                                                            if (timerRef.current) clearTimeout(timerRef.current);
                                                                            timerRef.current = setTimeout(() => {
                                                                                inputRefs.current[index][`${"sales_unit_discount_with_vat_" + index}`]?.select();
                                                                            }, 20);
                                                                        }}
                                                                        onKeyDown={(e) => {
                                                                            RunKeyActions(e, product);

                                                                            if (timerRef.current) clearTimeout(timerRef.current);

                                                                            if (e.key === "Enter") {
                                                                                if ((index + 1) === selectedProducts.length) {
                                                                                    timerRef.current = setTimeout(() => {
                                                                                        productSearchRef.current?.focus();
                                                                                    }, 100);
                                                                                } else {
                                                                                    if (index === 0) {
                                                                                        console.log("moviing to discount")
                                                                                        timerRef.current = setTimeout(() => {
                                                                                            // discountRef.current?.focus();
                                                                                            productSearchRef.current?.focus();
                                                                                        }, 100);
                                                                                    } else {
                                                                                        console.log("moviing to next line")
                                                                                        timerRef.current = setTimeout(() => {
                                                                                            inputRefs.current[index - 1][`${"sales_product_quantity_" + (index - 1)}`]?.select();
                                                                                        }, 100);
                                                                                    }

                                                                                }
                                                                            } else if (e.key === "ArrowLeft") {
                                                                                timerRef.current = setTimeout(() => {
                                                                                    inputRefs.current[index][`${"sales_unit_discount_" + index}`]?.select();
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
                                                                                errors["unit_discount_" + index] = t("Unit discount should be greater than or equal to zero");
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

                                                                                selectedProducts[index].unit_discount = parseFloat(trimTo8Decimals(selectedProducts[index].unit_discount_with_vat / (1 + (formData.vat_percent / 100))))
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
                                                        </td>);
                                                        /*<td>
                                                    <div className="input-group mb-3">
                                                        <input type="number" 
                                                        id={`${"sales_unit_discount_percent" + index}`}
                                                         disabled={false} name={`${"sales_unit_discount_percent" + index}`} 
                                                         onWheel={(e) => e.target.blur()} className="form-control text-end" 
                                                         value={selectedProducts[index].unit_discount_percent} onChange={(e) => {
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
                                                                selectedProducts[index].unit_discount = parseFloat(trimTo8Decimals(selectedProducts[index].unit_price * (selectedProducts[index].unit_discount_percent / 100)));
                                                                selectedProducts[index].unit_discount_with_vat = parseFloat(trimTo8Decimals(selectedProducts[index].unit_discount * (1 + (formData.vat_percent / 100))))
                                                                selectedProducts[index].unit_discount_percent_with_vat = parseFloat(trimTo8Decimals(((selectedProducts[index].unit_discount_with_vat / selectedProducts[index].unit_price_with_vat) * 100)))
    
                                                                reCalculate(index);
                                                            }, 300);
                                                        }} />
                                                    </div>
                                                    {errors["unit_discount_percent_" + index] && (
                                                        <div style={{ color: "red" }}>
                                                            {errors["unit_discount_percent_" + index]}
                                                        </div>
                                                    )}
                                                </td>*/
                                                        if (col.key === 'unit_discount_percent') return (<td style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                            <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                                                                <div className="input-group flex-nowrap" style={{ flex: '1 1 auto', minWidth: 0 }}>
                                                                    <input type="number"
                                                                        id={`${"sales_unit_discount_percent_with_vat_" + index}`}
                                                                        disabled={true}
                                                                        name={`${"sales_unit_discount_percent_with_vat_" + index}`}
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
                                                                                errors["unit_discount_percent_" + index] = t("Unit discount % should be greater than or equal to zero");
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
                                                        </td>);
                                                        if (col.key === 'price') return (<td style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
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
                                                        </td>);
                                                        if (col.key === 'price_with_vat') return (<td style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
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
                                                        </td>);
                                                        return null;
                                                    })}
                                                </tr>);
                                        }).reverse()}

                                    </tbody>
                                </table>
                            </div>
                            <div style={{ position: "relative" }}>
                                {/* Settings centered overlay panel */}
                                {showBillSummarySettings && (
                                    <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 1060, background: "#fff", border: "1px solid #dee2e6", borderRadius: "8px", padding: "16px", width: "320px", boxShadow: "0 8px 32px rgba(0,0,0,0.22)" }}>
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                            <strong style={{ fontSize: "13px" }}>{t("Customize Bill Summary")}</strong>
                                            <button type="button" className="btn-close" style={{ fontSize: "10px" }} onClick={() => setShowBillSummarySettings(false)}></button>
                                        </div>
                                        <div style={{ fontSize: "11px", color: "#888", marginBottom: "8px" }}>{t("Toggle visibility or reorder fields")}</div>
                                        {billSummaryOrder.map((key, idx) => (
                                            <div
                                                key={key}
                                                className="d-flex align-items-center gap-2 mb-1"
                                                style={{ padding: "3px 0", borderBottom: "1px solid #f5f5f5", cursor: "grab" }}
                                                draggable
                                                onDragStart={() => { billSummaryDragRef.current = idx; }}
                                                onDragOver={e => e.preventDefault()}
                                                onDrop={() => { reorderBillSummaryT1(billSummaryDragRef.current, idx); billSummaryDragRef.current = null; }}
                                            >
                                                <span style={{ color: "#bbb", fontSize: "15px", cursor: "grab", userSelect: "none", flexShrink: 0 }}>⠿</span>
                                                <input
                                                    type="checkbox"
                                                    className="form-check-input m-0"
                                                    checked={!!billSummaryVisible[key]}
                                                    onChange={e => updateBillSummaryVisible(key, e.target.checked)}
                                                    style={{ width: "14px", height: "14px", flexShrink: 0 }}
                                                />
                                                <span style={{ flex: 1, fontSize: "12px" }}>{t(_billSummaryFieldLabels[key])}</span>
                                            </div>
                                        ))}
                                        <button type="button" className="btn btn-sm btn-outline-secondary mt-2 w-100" style={{ fontSize: "11px" }} onClick={() => {
                                            setBillSummaryOrder(_defaultBillSummaryOrder);
                                            setBillSummaryVisible(Object.fromEntries(_defaultBillSummaryOrder.map(k => [k, true])));
                                            localStorage.removeItem('bill_summary_visible_t1');
                                            localStorage.removeItem('bill_summary_order_t1');
                                        }}>{t("Reset to Default")}</button>
                                    </div>
                                )}
                                <div className="table-responsive">
                                    <table className="table table-striped table-sm table-bordered">
                                        <thead>
                                            <tr>
                                                <th colSpan="9" style={{ padding: "3px 8px", background: "#f8f9fa", fontWeight: "normal" }}>
                                                    <div className="d-flex justify-content-between align-items-center">
                                                        <small className="text-muted">{t("Bill Summary")}</small>
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-outline-secondary p-0"
                                                            style={{ width: "20px", height: "20px", lineHeight: 1 }}
                                                            title={t("Customize Bill Summary")}
                                                            onClick={() => setShowBillSummarySettings(v => !v)}
                                                        >
                                                            <i className="bi bi-gear" style={{ fontSize: "11px" }}></i>
                                                        </button>
                                                    </div>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {billSummaryOrder.filter(key => billSummaryVisible[key]).map(key => {
                                                switch (key) {
                                                    case 'total_without_vat': return (
                                                        <tr key="total_without_vat">
                                                            <th colSpan="8" className="text-end">
                                                                {t("Total(without VAT)")}
                                                                <OverlayTrigger placement="left" overlay={renderTotalWithoutVATTooltip}>
                                                                    <span style={{ textDecoration: 'underline dotted', cursor: 'pointer', marginLeft: '4px' }}>ℹ️</span>
                                                                </OverlayTrigger>
                                                            </th>
                                                            <td className="text-end" style={{ width: "200px" }}>
                                                                <NumberFormat value={trimTo2Decimals(formData.total)} displayType={"text"} thousandSeparator={true} suffix={" "} renderText={(value, props) => value} />
                                                            </td>
                                                        </tr>
                                                    );
                                                    case 'total_with_vat': return (
                                                        <tr key="total_with_vat">
                                                            <th colSpan="8" className="text-end">
                                                                {t("Total(with VAT)")}
                                                                <OverlayTrigger placement="left" overlay={renderTotalWithVATTooltip}>
                                                                    <span style={{ textDecoration: 'underline dotted', cursor: 'pointer', marginLeft: '4px' }}>ℹ️</span>
                                                                </OverlayTrigger>
                                                            </th>
                                                            <td className="text-end" style={{ width: "200px" }}>
                                                                <NumberFormat value={trimTo2Decimals(formData.total_with_vat)} displayType={"text"} thousandSeparator={true} suffix={" "} renderText={(value, props) => value} />
                                                            </td>
                                                        </tr>
                                                    );
                                                    case 'shipping': return (
                                                        <tr key="shipping">
                                                            <th colSpan="8" className="text-end">
                                                                {t("Shipping & Handling Fees")}
                                                                <OverlayTrigger placement="left" overlay={renderShippingTooltip}>
                                                                    <span style={{ textDecoration: 'underline dotted', cursor: 'pointer', marginLeft: '4px' }}>ℹ️</span>
                                                                </OverlayTrigger>
                                                            </th>
                                                            <td className="text-end">
                                                                <input type="number" id="sales_shipping_fees" name="sales_shipping_fees" onWheel={(e) => e.target.blur()} style={{ width: "150px" }} className="form-control form-control-sm" value={shipping} onChange={(e) => {
                                                                    if (timerRef.current) clearTimeout(timerRef.current);
                                                                    delete errors["shipping_handling_fees"];
                                                                    setErrors({ ...errors });
                                                                    if (parseFloat(e.target.value) === 0) { shipping = 0; setShipping(shipping); delete errors["shipping_handling_fees"]; setErrors({ ...errors }); timerRef.current = setTimeout(() => { reCalculate(); }, 100); return; }
                                                                    if (parseFloat(e.target.value) < 0) { shipping = 0.00; setShipping(shipping); setErrors({ ...errors }); timerRef.current = setTimeout(() => { reCalculate(); }, 100); return; }
                                                                    if (!e.target.value) { shipping = ""; setShipping(shipping); setErrors({ ...errors }); timerRef.current = setTimeout(() => { reCalculate(); }, 100); return; }
                                                                    if (/^\d*\.?\d{0,2}$/.test(parseFloat(e.target.value)) === false) { errors["shipping_handling_fees"] = t("Max. decimal points allowed is 2"); setErrors({ ...errors }); }
                                                                    shipping = parseFloat(e.target.value); setShipping(shipping);
                                                                    timerRef.current = setTimeout(() => { reCalculate(); }, 100);
                                                                }} />
                                                                {errors.shipping_handling_fees && <div style={{ color: "red" }}>{errors.shipping_handling_fees}</div>}
                                                            </td>
                                                        </tr>
                                                    );
                                                    case 'discount_without_vat': return (
                                                        <tr key="discount_without_vat">
                                                            <th colSpan="8" className="text-end">
                                                                {t("Discount(without VAT)")} <input type="number" id="discount_percent" name="discount_percent" onWheel={(e) => e.target.blur()} disabled={true} style={{ width: "50px" }} className="form-control form-control-sm d-inline-block" value={discountPercent} onChange={(e) => {
                                                                    if (timerRef.current) clearTimeout(timerRef.current);
                                                                    if (parseFloat(e.target.value) === 0) { discount = 0; setDiscount(discount); discountPercentWithVAT = 0; setDiscountPercentWithVAT(discountPercentWithVAT); discountPercent = 0; setDiscountPercent(discountPercent); errors["discount_percent"] = ""; setErrors({ ...errors }); timerRef.current = setTimeout(() => { reCalculate(); }, 100); return; }
                                                                    if (parseFloat(e.target.value) < 0) { discountWithVAT = 0; setDiscountWithVAT(discountWithVAT); discountPercentWithVAT = 0; setDiscountPercentWithVAT(discountPercentWithVAT); discount = 0; setDiscount(discount); discountPercent = 0; setDiscountPercent(discountPercent); setErrors({ ...errors }); timerRef.current = setTimeout(() => { reCalculate(); }, 100); return; }
                                                                    if (!e.target.value) { discountWithVAT = ""; setDiscountWithVAT(discountWithVAT); discountPercentWithVAT = ""; setDiscountPercentWithVAT(discountPercentWithVAT); discount = ""; setDiscount(discount); discountPercent = ""; setDiscountPercent(discountPercent); setErrors({ ...errors }); timerRef.current = setTimeout(() => { reCalculate(); }, 100); return; }
                                                                    delete errors["discount_percent"]; delete errors["discount"]; setErrors({ ...errors });
                                                                    discountPercent = parseFloat(e.target.value); setDiscountPercent(discountPercent);
                                                                    timerRef.current = setTimeout(() => { reCalculate(); }, 100);
                                                                }} />{"%"}
                                                                <OverlayTrigger placement="left" overlay={renderDiscountWithoutVATTooltip}>
                                                                    <span style={{ textDecoration: 'underline dotted', cursor: 'pointer', marginLeft: '4px' }}>ℹ️</span>
                                                                </OverlayTrigger>
                                                                {errors.discount_percent && <div style={{ color: "red" }}>{errors.discount_percent}</div>}
                                                            </th>
                                                            <td className="text-end">
                                                                <input type="number" id="sales_discount" name="sales_discount" onWheel={(e) => e.target.blur()} style={{ width: "150px" }} className="form-control form-control-sm" value={discount} ref={discountRef}
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
                                                                {errors.discount && <div style={{ color: "red" }}>{errors.discount}</div>}
                                                            </td>
                                                        </tr>
                                                    );
                                                    case 'discount_with_vat': return (
                                                        <tr key="discount_with_vat">
                                                            <th colSpan="8" className="text-end">
                                                                {t("Discount(with VAT)")} <input type="number" id="discount_percent_with_vat" name="discount_percent_with_vat" onWheel={(e) => e.target.blur()} disabled={true} style={{ width: "50px" }} className="form-control form-control-sm d-inline-block" value={discountPercentWithVAT} onChange={(e) => {
                                                                    if (timerRef.current) clearTimeout(timerRef.current);
                                                                    if (parseFloat(e.target.value) === 0) { discountWithVAT = 0; setDiscountWithVAT(discountWithVAT); discountPercentWithVAT = 0; setDiscountPercentWithVAT(discountPercentWithVAT); discount = 0; setDiscount(discount); discountPercent = 0; setDiscountPercent(discountPercent); delete errors["discount_percent_with_vat"]; setErrors({ ...errors }); timerRef.current = setTimeout(() => { reCalculate(); }, 100); return; }
                                                                    if (parseFloat(e.target.value) < 0) { discountWithVAT = 0; setDiscountWithVAT(discountWithVAT); discountPercentWithVAT = 0; setDiscountPercentWithVAT(discountPercentWithVAT); discount = 0; setDiscount(discount); discountPercent = 0; setDiscountPercent(discountPercent); errors["discount_percent_with_vat"] = t("Discount percent should be greater than or equal to zero"); setErrors({ ...errors }); timerRef.current = setTimeout(() => { reCalculate(); }, 100); return; }
                                                                    if (!e.target.value) { discountWithVAT = ""; setDiscountWithVAT(discountWithVAT); discountPercentWithVAT = ""; setDiscountPercentWithVAT(discountPercentWithVAT); discount = ""; setDiscount(discount); discountPercent = ""; setDiscountPercent(discountPercent); setErrors({ ...errors }); timerRef.current = setTimeout(() => { reCalculate(); }, 100); return; }
                                                                    delete errors["discount_percent_with_vat"]; delete errors["discount_with_vat"]; setErrors({ ...errors });
                                                                    discountPercentWithVAT = parseFloat(e.target.value); setDiscountPercentWithVAT(discountPercentWithVAT);
                                                                    timerRef.current = setTimeout(() => { reCalculate(); }, 100);
                                                                }} />{"%"}
                                                                <OverlayTrigger placement="left" overlay={renderDiscountWithVATTooltip}>
                                                                    <span style={{ textDecoration: 'underline dotted', cursor: 'pointer', marginLeft: '4px' }}>ℹ️</span>
                                                                </OverlayTrigger>
                                                                {errors.discount_percent_with_vat && <div style={{ color: "red" }}>{errors.discount_percent_with_vat}</div>}
                                                            </th>
                                                            <td className="text-end">
                                                                <input type="number" id="sales_discount_with_vat" name="sales_discount_with_vat" onWheel={(e) => e.target.blur()} style={{ width: "150px" }} className="form-control form-control-sm" value={discountWithVAT} ref={discountWithVATRef}
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
                                                                {errors.discount_with_vat && <div style={{ color: "red" }}>{errors.discount_with_vat}</div>}
                                                            </td>
                                                        </tr>
                                                    );
                                                    case 'taxable_amount': return (
                                                        <tr key="taxable_amount">
                                                            <th colSpan="8" className="text-end">
                                                                {t("Total Taxable Amount(without VAT)")}
                                                                <OverlayTrigger placement="right" overlay={renderTooltip}>
                                                                    <span style={{ textDecoration: 'underline dotted', cursor: 'pointer', marginLeft: '4px' }}>ℹ️</span>
                                                                </OverlayTrigger>
                                                            </th>
                                                            <td className="text-end" style={{ width: "200px" }}>
                                                                <NumberFormat value={trimTo2Decimals(formData.total + shipping - discount)} displayType={"text"} thousandSeparator={true} suffix={" "} renderText={(value, props) => value} />
                                                            </td>
                                                        </tr>
                                                    );
                                                    case 'vat': return (
                                                        <tr key="vat">
                                                            <th colSpan="8" className="text-end">
                                                                {t("VAT")} <input type="number" id="sales_vat_percent" name="sales_vat_percent" onWheel={(e) => e.target.blur()} disabled={true} className="form-control form-control-sm d-inline-block text-center" style={{ width: "50px" }} value={formData.vat_percent} onChange={(e) => {
                                                                    console.log("Inside onchange vat percent");
                                                                    if (parseFloat(e.target.value) === 0) { formData.vat_percent = parseFloat(e.target.value); setFormData({ ...formData }); delete errors["vat_percent"]; setErrors({ ...errors }); reCalculate(); return; }
                                                                    if (parseFloat(e.target.value) < 0) { formData.vat_percent = parseFloat(e.target.value); formData.vat_price = 0.00; setFormData({ ...formData }); errors["vat_percent"] = t("VAT percent should be greater than or equal to zero"); setErrors({ ...errors }); reCalculate(); return; }
                                                                    if (!e.target.value) { formData.vat_percent = ""; formData.vat_price = 0.00; errors["vat_percent"] = t("Invalid vat percent"); setFormData({ ...formData }); setErrors({ ...errors }); return; }
                                                                    delete errors["vat_percent"]; setErrors({ ...errors });
                                                                    formData.vat_percent = e.target.value; reCalculate(); setFormData({ ...formData });
                                                                }} />{"%"}
                                                                <OverlayTrigger placement="left" overlay={renderVATTooltip}>
                                                                    <span style={{ textDecoration: 'underline dotted', cursor: 'pointer', marginLeft: '4px' }}>ℹ️</span>
                                                                </OverlayTrigger>
                                                                {errors.vat_percent && <div style={{ color: "red" }}>{errors.vat_percent}</div>}
                                                            </th>
                                                            <td className="text-end">
                                                                <NumberFormat value={trimTo2Decimals(formData.vat_price)} displayType={"text"} thousandSeparator={true} suffix={" "} renderText={(value, props) => value} />
                                                            </td>
                                                        </tr>
                                                    );
                                                    case 'net_before_rounding': return (
                                                        <tr key="net_before_rounding">
                                                            <th colSpan="8" className="text-end">
                                                                {t("Net Total(with VAT) Before Rounding")}
                                                                <OverlayTrigger placement="right" overlay={renderNetTotalBeforeRoundingTooltip}>
                                                                    <span style={{ textDecoration: 'underline dotted', cursor: 'pointer', marginLeft: '4px' }}>ℹ️</span>
                                                                </OverlayTrigger>
                                                            </th>
                                                            <th className="text-end">
                                                                <NumberFormat value={trimTo2Decimals(formData.net_total - roundingAmount)} displayType={"text"} thousandSeparator={true} suffix={" "} renderText={(value, props) => value} />
                                                            </th>
                                                        </tr>
                                                    );
                                                    case 'rounding_amount': return (
                                                        <tr key="rounding_amount">
                                                            <th colSpan="8" className="text-end">
                                                                {t("Rounding Amount")}
                                                                [<input type="checkbox" id="sales_auto_rounding_amount" name="sales_auto_rounding_amount" className="form-check-input" style={{ width: "14px", height: "14px", verticalAlign: "middle" }} value={formData.auto_rounding_amount} checked={formData.auto_rounding_amount} onChange={(e) => {
                                                                    if (timerRef.current) clearTimeout(timerRef.current);
                                                                    setErrors({ ...errors });
                                                                    formData.auto_rounding_amount = !formData.auto_rounding_amount;
                                                                    setFormData({ ...formData });
                                                                    timerRef.current = setTimeout(() => { reCalculate(); }, 100);
                                                                }} />{" " + t("Auto Calculate") + "]"}
                                                            </th>
                                                            <td className="text-end">
                                                                <input type="number" id="sales_rounding_amount" name="sales_rounding_amount" disabled={formData.auto_rounding_amount} onWheel={(e) => e.target.blur()} style={{ width: "150px" }} className="form-control form-control-sm" value={roundingAmount}
                                                                    onChange={(e) => {
                                                                        if (timerRef.current) clearTimeout(timerRef.current);
                                                                        delete errors["rounding_amount"]; setErrors({ ...errors });
                                                                        if (!e.target.value) { roundingAmount = ""; setRoundingAmount(roundingAmount); timerRef.current = setTimeout(() => { reCalculate(); }, 100); return; }
                                                                        if (e.target.value) { if (/^-?\d*\.?\d{0,2}$/.test(parseFloat(e.target.value)) === false) { roundingAmount = parseFloat(e.target.value); errors["rounding_amount"] = t("Max. decimal points allowed is 2"); setErrors({ ...errors }); return; } }
                                                                        roundingAmount = parseFloat(e.target.value); setRoundingAmount(roundingAmount);
                                                                        delete errors["rounding_amount"]; setErrors({ ...errors });
                                                                        timerRef.current = setTimeout(() => { reCalculate(); }, 100);
                                                                    }}
                                                                    onKeyDown={(e) => {
                                                                        if (timerRef.current) clearTimeout(timerRef.current);
                                                                        if (e.key === "Backspace") { delete errors["rounding_amount"]; setErrors({ ...errors }); roundingAmount = ""; setRoundingAmount(""); timerRef.current = setTimeout(() => { reCalculate(); }, 100); }
                                                                    }}
                                                                />
                                                                {errors.rounding_amount && <div style={{ color: "red" }}>{errors.rounding_amount}</div>}
                                                            </td>
                                                        </tr>
                                                    );
                                                    case 'net_total': return (
                                                        <tr key="net_total">
                                                            <th colSpan="8" className="text-end">
                                                                {t("Net Total(with VAT)")}
                                                                <OverlayTrigger placement="right" overlay={renderNetTotalTooltip}>
                                                                    <span style={{ textDecoration: 'underline dotted', cursor: 'pointer', marginLeft: '4px' }}>ℹ️</span>
                                                                </OverlayTrigger>
                                                            </th>
                                                            <th className="text-end">
                                                                <NumberFormat value={trimTo2Decimals(formData.net_total)} displayType={"text"} thousandSeparator={true} suffix={" "} renderText={(value, props) => value} />
                                                            </th>
                                                        </tr>
                                                    );
                                                    default: return null;
                                                }
                                            })}
                                        </tbody>
                                    </table>
                                </div>
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
                                    options={}
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
                                    locale={dateLocale}
                                    onChange={(value) => {
                                        formData.signature_date_str = format(new Date(value), "MMM dd yyyy");
                                        setFormData({ ...formData });
                                    }}
                                />

                                {errors.signature_date_str && (
                                    <div style={{ color: "red" }}>
                                       
                                        {errors.signature_date_str}
                                    </div>
                                )}
                            </div>
                        </div>
                                */}
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
                                            errors["cash_discount"] = t("Cash discount should not be greater than or equal to Net Total: ") + formData.net_total?.toString();
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
                                            cashDiscountRef.current?.select();
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
                                <label className="form-label">{t("Payments Received")}</label>

                                <div class="table-responsive" style={{ maxWidth: "900px" }}>
                                    <Button variant="secondary" style={{ alignContent: "right", marginBottom: "10px" }} onClick={addNewPayment}>
                                        {t("Create New Payment")}
                                    </Button>
                                    <table class="table table-striped table-sm table-bordered">
                                        {formData.payments_input && formData.payments_input?.length > 0 &&
                                            <thead>
                                                <th>
                                                    {t("Date")}
                                                </th>
                                                <th>
                                                    {t("Amount")}
                                                </th>
                                                <th>
                                                    {t("Payment Method")}
                                                </th>
                                                <th>
                                                    {t("Reference")}
                                                </th>
                                                <th>
                                                    {t("Action")}
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

                                                                    {t(errors["payment_date_" + key])}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td style={{ width: "300px" }}>
                                                            <input type='number' id={`${"sales_payment_amount" + key}`} name={`${"sales_payment_amount" + key}`} value={formData.payments_input[key].amount} className="form-control "
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

                                                                    {t(errors["payment_amount_" + key])}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td style={{ width: "200px" }}>
                                                            <select value={formData.payments_input[key].method} className="form-control "
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
                                                                <option value="sales_return">{t("Sales Return")}</option>
                                                                <option value="purchase">{t("Purchase")}</option>
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
                                                            <Button variant="danger" onClick={(event) => {
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
                                                errors["commission"] = t("Commission should not be greater than or equal to Net Total: ") + formData.net_total?.toString();
                                                setErrors({ ...errors });
                                                return;
                                            }

                                            if (commission > 0 && !formData.commission_payment_method) {
                                                errors["commission_payment_method"] = t("Payment method is required");
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
                                            {t(errors.commission)}
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
                                <Button
                                    variant="primary"
                                    style={{ minWidth: "80px" }}
                                    onClick={(e) => {
                                        e.preventDefault();

                                        handleCreate(e);
                                    }}>
                                    {isSubmitting ?
                                        <Spinner
                                            as="span"
                                            animation="border"
                                            size="sm"
                                            role="status"
                                            aria-hidden={true}
                                        />

                                        : ""
                                    }
                                    {isUpdateForm && !isSubmitting ? t("Update") : !isSubmitting ? t("Create") : ""}

                                </Button>
                            </Modal.Footer>
                        </form >
                    )}
                    {
                        formType !== "type1" && (
                            <form className="main-height flex flex-col lg:flex-row overflow-hidden w-full" onSubmit={e => { e.preventDefault(); handleCreate(e); }} >
                                <aside className={isLeftSidebarCollapsed
                                    ? "hidden"
                                    : "w-full lg:w-[350px] lg:shrink-0 border-r border-outline-variant bg-surface-container-lowest sidebar-scroll p-md space-y-md pos-scroll"}>

                                    <div className="flex justify-between items-center pb-xs border-b border-outline-variant/30 mb-sm">
                                        <span className="font-label-md uppercase tracking-wider text-on-surface-variant m-0">{t("Customer & Order Details")}</span>
                                        <div className="flex items-center gap-xs">
                                            <button type="button" onClick={() => setShowCustomerDetailsSettings(true)} className="p-1 hover:bg-surface-variant rounded border-0 bg-transparent text-on-surface-variant flex items-center justify-center cursor-pointer" title={t("Configure Customer & Order Details")}>
                                                <i className="bi bi-gear-fill text-[18px]"></i>
                                            </button>
                                            <button type="button" onClick={() => setIsLeftSidebarCollapsed(true)} className="p-1 hover:bg-surface-variant rounded border-0 bg-transparent text-on-surface-variant flex items-center justify-center cursor-pointer" title={t("Collapse Left Sidebar")}>
                                                <i className="bi bi-chevron-bar-left text-[18px]"></i>
                                            </button>
                                        </div>
                                    </div>

                                    {customerDetailsFields.filter((field) => field.visible).length === 0 ? (
                                        <div className="rounded-lg border border-dashed border-outline-variant/40 p-sm text-label-md text-on-surface-variant">
                                            {t("No customer or order fields are active. Open settings to enable fields.")}
                                        </div>
                                    ) : (
                                        customerDetailsFields.filter((field) => field.visible).map((field) => renderCustomerDetailField(field))
                                    )}
                                </aside> {/* Close left sidebar */}
                                <div className="w-full flex-1 min-w-0 flex flex-col bg-surface overflow-hidden">

                                    {/* Product Search Bar */}
                                    <div className="p-sm bg-surface-container border-b border-outline-variant flex items-center justify-between gap-sm">
                                        <div className="flex items-center flex-1 max-w-xl">
                                            {isLeftSidebarCollapsed && (
                                                <button type="button" onClick={() => setIsLeftSidebarCollapsed(false)} className="p-1 hover:bg-surface-variant rounded border-0 bg-transparent text-on-surface-variant flex items-center justify-center cursor-pointer mr-2 shrink-0 animate-pulse" title={t("Expand Left Sidebar")}>
                                                    <i className="bi bi-chevron-bar-right text-[18px]"></i>
                                                </button>
                                            )}
                                            <div className="relative flex-1">
                                                <Typeahead
                                                    id="product_id"
                                                    positionFixed={true}
                                                    filterBy={() => true}
                                                    ref={productSearchRef}
                                                    labelKey="search_label"
                                                    inputProps={{ className: 'form-control bg-surface-bright border border-outline-variant rounded px-sm py-1 focus:ring-1 focus:ring-primary focus:border-primary h-[34px] w-full text-body-md productSearch' }}
                                                    emptyLabel=""
                                                    clearButton={false}
                                                    open={openProductSearchResult}
                                                    isLoading={false}
                                                    isInvalid={!!errors.product_id}
                                                    onChange={(selectedItems) => {
                                                        if (onChangeTriggeredRef.current) return;
                                                        onChangeTriggeredRef.current = true;
                                                        setTimeout(() => { onChangeTriggeredRef.current = false; }, 300);
                                                        if (selectedItems.length === 0) {
                                                            errors["product_id"] = "Invalid Product selected";
                                                            setErrors(errors);
                                                            return;
                                                        }
                                                        delete errors["product_id"];
                                                        setErrors({ ...errors });
                                                        addProduct(selectedItems[0]);
                                                        productSearchRef.current?.clear();
                                                        setOpenProductSearchResult(false);
                                                        timerRef.current = setTimeout(() => {
                                                            inputRefs.current[(selectedProducts.length - 1)][`sales_product_quantity_${selectedProducts.length - 1}`]?.select();
                                                        }, 100);
                                                    }}
                                                    options={productOptions}
                                                    placeholder={t('Part No. | Name | Name in Arabic | Brand | Country')}
                                                    highlightOnlyResult={true}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Escape") {
                                                            setProductOptions([]);
                                                            setOpenProductSearchResult(false);
                                                            productSearchRef.current?.clear();
                                                        }
                                                        timerRef.current = setTimeout(() => {
                                                            productSearchRef.current?.focus();
                                                        }, 100);
                                                    }}
                                                    onInputChange={(searchTerm, e) => {
                                                        const requestId = Date.now();
                                                        latestRequestRef.current = requestId;
                                                        if (timerRef.current) clearTimeout(timerRef.current);
                                                        timerRef.current = setTimeout(() => {
                                                            if (latestRequestRef.current !== requestId) return;
                                                            suggestProducts(searchTerm);
                                                        }, 350);
                                                    }}
                                                    renderMenu={(results, menuProps, state) => {
                                                        return (
                                                            <Menu {...menuProps} style={{ ...menuProps.style, minWidth: '1100px', width: 'max-content', maxWidth: '95vw', zIndex: 9999 }}>
                                                                {/* Header */}
                                                                <MenuItem disabled style={{ position: 'sticky', top: 0, padding: 0, margin: 0 }}>
                                                                    <div style={{
                                                                        background: '#f8f9fa',
                                                                        zIndex: 2,
                                                                        display: 'flex',
                                                                        fontWeight: 'bold',
                                                                        padding: '4px 8px',
                                                                        borderBottom: '1px solid #ddd',
                                                                        pointerEvents: "auto"
                                                                    }}>
                                                                        {searchProductsColumns.filter(c => c.visible).map((col) => {
                                                                            return (
                                                                                <React.Fragment key={col.key}>
                                                                                    {col.key === "select" && <div style={{ width: getColumnWidth(col) }}></div>}
                                                                                    {col.key === "part_number" && <div style={{ width: getColumnWidth(col) }}>{t("Part Number")}</div>}
                                                                                    {col.key === "name" && <div style={{ width: getColumnWidth(col) }}>{t("Name")}</div>}
                                                                                    {col.key === "unit_price" && <div style={{ width: getColumnWidth(col) }}>{t("S.Unit Price")}</div>}
                                                                                    {col.key === "stock" && <div style={{ width: getColumnWidth(col) }}>{t("Stock")}</div>}
                                                                                    {col.key === "photos" && <div style={{ width: getColumnWidth(col) }}>{t("Photos")}</div>}
                                                                                    {col.key === "brand" && <div style={{ width: getColumnWidth(col) }}>{t("Brand")}</div>}
                                                                                    {col.key === "purchase_price" && <div style={{ width: getColumnWidth(col) }}>{t("P.Unit Price")}</div>}
                                                                                    {col.key === "country" && <div style={{ width: getColumnWidth(col) }}>{t("Country")}</div>}
                                                                                    {col.key === "rack" && <div style={{ width: getColumnWidth(col) }}>{t("Rack")}</div>}
                                                                                </React.Fragment>
                                                                            )
                                                                        })}
                                                                        <div
                                                                            style={{
                                                                                position: "absolute",
                                                                                right: "8px",
                                                                                top: "50%",
                                                                                transform: "translateY(-50%)",
                                                                                cursor: "pointer",
                                                                            }}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setShowProductSearchSettings(true);
                                                                            }}
                                                                        >
                                                                            <i className="bi bi-gear-fill" />
                                                                        </div>
                                                                    </div>
                                                                </MenuItem>

                                                                {/* Rows */}
                                                                {results.map((option, index) => {
                                                                    const onlyOneResult = results.length === 1;
                                                                    const isActive = state.activeIndex === index || onlyOneResult;
                                                                    let checked = isProductAdded(option.id);
                                                                    return (
                                                                        <MenuItem option={option} position={index} key={index} style={{ padding: "0px" }}>
                                                                            <div style={{ display: 'flex', padding: '4px 8px' }}>
                                                                                {searchProductsColumns.filter(c => c.visible).map((col) => {
                                                                                    return (
                                                                                        <React.Fragment key={col.key}>
                                                                                            {col.key === "select" &&
                                                                                                <div
                                                                                                    className="form-check"
                                                                                                    style={{ ...columnStyle, width: getColumnWidth(col) }}
                                                                                                    onClick={e => {
                                                                                                        e.stopPropagation();
                                                                                                        checked = !checked;
                                                                                                        if (timerRef.current) clearTimeout(timerRef.current);
                                                                                                        timerRef.current = setTimeout(() => {
                                                                                                            if (checked) { addProduct(option); } else { removeProduct(option); }
                                                                                                        }, 100);
                                                                                                    }}
                                                                                                >
                                                                                                    <input
                                                                                                        className="form-check-input"
                                                                                                        type="checkbox"
                                                                                                        value={checked}
                                                                                                        checked={checked}
                                                                                                        onClick={e => { e.stopPropagation(); }}
                                                                                                        onChange={e => {
                                                                                                            e.preventDefault();
                                                                                                            e.stopPropagation();
                                                                                                            checked = !checked;
                                                                                                            if (timerRef.current) clearTimeout(timerRef.current);
                                                                                                            timerRef.current = setTimeout(() => {
                                                                                                                if (checked) { addProduct(option); } else { removeProduct(option); }
                                                                                                            }, 100);
                                                                                                        }}
                                                                                                    />
                                                                                                </div>
                                                                                            }
                                                                                            {col.key === "part_number" &&
                                                                                                <div style={{ ...columnStyle, width: getColumnWidth(col) }}>
                                                                                                    {highlightWords(
                                                                                                        option.prefix_part_number
                                                                                                            ? `${option.prefix_part_number}-${option.part_number}`
                                                                                                            : option.part_number,
                                                                                                        state.text.toLowerCase().split(" ").filter(Boolean),
                                                                                                        isActive
                                                                                                    )}
                                                                                                </div>
                                                                                            }
                                                                                            {col.key === "name" &&
                                                                                                <div style={{ ...columnStyle, width: getColumnWidth(col) }}>
                                                                                                    {highlightWords(
                                                                                                        option.name_in_arabic
                                                                                                            ? `${option.name} (${option.name_in_arabic})`
                                                                                                            : option.name,
                                                                                                        state.text.toLowerCase().split(" ").filter(Boolean),
                                                                                                        isActive
                                                                                                    )}
                                                                                                </div>
                                                                                            }
                                                                                            {col.key === "unit_price" &&
                                                                                                <div style={{ ...columnStyle, width: getColumnWidth(col) }}>
                                                                                                    {option.product_stores?.[localStorage.getItem("store_id")]?.retail_unit_price && (
                                                                                                        <><Amount amount={trimTo2Decimals(option.product_stores?.[localStorage.getItem("store_id")]?.retail_unit_price)} />+</>
                                                                                                    )}
                                                                                                    {option.product_stores?.[localStorage.getItem("store_id")]?.retail_unit_price_with_vat && (
                                                                                                        <>|<Amount amount={trimTo2Decimals(option.product_stores?.[localStorage.getItem("store_id")]?.retail_unit_price_with_vat)} /></>
                                                                                                    )}
                                                                                                </div>
                                                                                            }
                                                                                            {col.key === "stock" &&
                                                                                                <div style={{ ...columnStyle, width: getColumnWidth(col) }}>
                                                                                                    {(() => {
                                                                                                        const storeId = localStorage.getItem("store_id");
                                                                                                        const productStore = option.product_stores?.[storeId];
                                                                                                        const totalStock = productStore?.stock ?? 0;
                                                                                                        const warehouseStocks = productStore?.warehouse_stocks ?? {};
                                                                                                        const warehouseDetails = (() => {
                                                                                                            let details = [];
                                                                                                            if (warehouseStocks["main_store"] !== undefined) { details.push(`MS: ${warehouseStocks["main_store"]}`); }
                                                                                                            Object.entries(warehouseStocks).filter(([key]) => key !== "main_store").forEach(([key, value]) => { details.push(`${key.replace(/^w/, "WH").toUpperCase()}: ${value}`); });
                                                                                                            return details.join(", ");
                                                                                                        })();
                                                                                                        return (<span>{totalStock}{warehouseDetails && store.settings.enable_warehouse_module ? ` (${warehouseDetails})` : ""}</span>);
                                                                                                    })()}
                                                                                                </div>
                                                                                            }
                                                                                            {col.key === "photos" &&
                                                                                                <div style={{ ...columnStyle, width: getColumnWidth(col) }}>
                                                                                                    <button
                                                                                                        type="button"
                                                                                                        className={isActive ? "btn btn-outline-light btn-sm" : "btn btn-outline-primary btn-sm"}
                                                                                                        onClick={(e) => {
                                                                                                            e.preventDefault();
                                                                                                            e.stopPropagation();
                                                                                                            openProductImages(option.id);
                                                                                                        }}
                                                                                                    >
                                                                                                        <i className="bi bi-images" aria-hidden="true" />
                                                                                                    </button>
                                                                                                </div>
                                                                                            }
                                                                                            {col.key === "brand" &&
                                                                                                <div style={{ ...columnStyle, width: getColumnWidth(col) }}>
                                                                                                    {option.brand_name}
                                                                                                </div>
                                                                                            }
                                                                                            {col.key === "purchase_price" &&
                                                                                                <div style={{ ...columnStyle, width: getColumnWidth(col) }}>
                                                                                                    {option.product_stores?.[localStorage.getItem("store_id")]?.purchase_unit_price && (
                                                                                                        <><Amount amount={trimTo2Decimals(option.product_stores?.[localStorage.getItem("store_id")]?.purchase_unit_price)} />+</>
                                                                                                    )}
                                                                                                    {option.product_stores?.[localStorage.getItem("store_id")]?.purchase_unit_price_with_vat && (
                                                                                                        <>|<Amount amount={trimTo2Decimals(option.product_stores?.[localStorage.getItem("store_id")]?.purchase_unit_price_with_vat)} /></>
                                                                                                    )}
                                                                                                </div>
                                                                                            }
                                                                                            {col.key === "country" &&
                                                                                                <div style={{ ...columnStyle, width: getColumnWidth(col) }}>
                                                                                                    {option.country_name}
                                                                                                </div>
                                                                                            }
                                                                                            {col.key === "rack" &&
                                                                                                <div style={{ ...columnStyle, width: getColumnWidth(col) }}>
                                                                                                    {option.rack_name}
                                                                                                </div>
                                                                                            }
                                                                                        </React.Fragment>
                                                                                    )
                                                                                })}
                                                                            </div>
                                                                        </MenuItem>
                                                                    );
                                                                })}
                                                            </Menu>
                                                        );
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        <div className="flex gap-xs align-items-center shrink-0">
                                            <button type="button" className="px-3 bg-primary hover:opacity-90 text-on-primary rounded font-label-md flex items-center gap-1 border-0 cursor-pointer" style={{ height: '34px' }} onClick={openProducts}>
                                                <i className="bi bi-plus-circle text-[16px]"></i> {t("Add")}
                                            </button>

                                            {/* Compact Green Import Dropdown */}
                                            <div style={{ height: '34px' }}>
                                                <Dropdown>
                                                    <Dropdown.Toggle variant="success" id="dropdown-import" className="px-3 rounded font-label-md flex items-center gap-1 border-0 cursor-pointer" style={{ height: '34px', backgroundColor: '#10b981' }}>
                                                        <i className="bi bi-download text-[16px]"></i> {t('Import')}
                                                    </Dropdown.Toggle>
                                                    <Dropdown.Menu align="end">
                                                        <Dropdown.Item onClick={openQuotations}>
                                                            <i className="bi bi-file-earmark-text mr-1"></i> {t('From Quotations')}
                                                        </Dropdown.Item>
                                                        <Dropdown.Item onClick={openDeliveryNotes}>
                                                            <i className="bi bi-file-earmark-text mr-1"></i> {t('From Delivery Notes')}
                                                        </Dropdown.Item>
                                                    </Dropdown.Menu>
                                                </Dropdown>
                                            </div>

                                            <button
                                                type="button"
                                                className="p-1 hover:bg-surface-variant rounded border-0 bg-transparent text-on-surface-variant flex items-center justify-center cursor-pointer ml-1"
                                                onClick={() => setShowSelectedProductsSettings(!showSelectedProductsSettings)}
                                                title={t("Table Settings")}
                                                style={{ height: '34px', width: '34px' }}
                                            >
                                                <i className="bi bi-gear-fill" style={{ fontSize: "1rem" }} />
                                            </button>

                                            {isRightPanelCollapsed ? (
                                                <button
                                                    type="button"
                                                    className="p-1 hover:bg-surface-variant rounded border-0 bg-transparent text-on-surface-variant flex items-center justify-center cursor-pointer animate-pulse"
                                                    onClick={() => setIsRightPanelCollapsed(false)}
                                                    title={t("Expand Right Sidebar")}
                                                    style={{ height: '34px', width: '34px' }}
                                                >
                                                    <i className="bi bi-layout-sidebar-reverse text-[18px]"></i>
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    className="p-1 hover:bg-surface-variant rounded border-0 bg-transparent text-on-surface-variant flex items-center justify-center cursor-pointer"
                                                    onClick={() => setIsRightPanelCollapsed(true)}
                                                    title={t("Collapse Right Sidebar")}
                                                    style={{ height: '34px', width: '34px' }}
                                                >
                                                    <i className="bi bi-layout-sidebar-reverse text-[18px]"></i>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="table-container bg-surface-container-lowest border border-outline-variant rounded-lg" style={{ overflowX: "auto", maxHeight: "400px", overflowY: "auto" }}>
                                        <table className="w-full text-left border-collapse text-[12px] bg-surface-container-lowest">
                                            <thead className="bg-surface-container-high text-on-surface-variant sticky top-0 z-10 font-label-sm uppercase tracking-tight">
                                                <tr>
                                                    {selectedProductsColumns.filter(c => c.visible).map(col => {
                                                        let alignClass = "text-left";
                                                        if (['delete', 'si_no', 'info', 'stock', 'qty'].includes(col.key)) alignClass = "text-center";
                                                        if (['purchase_unit_price', 'unit_price', 'unit_price_with_vat', 'unit_discount', 'unit_discount_with_vat', 'unit_discount_percent', 'price', 'price_with_vat'].includes(col.key)) alignClass = "text-right";

                                                        let customStyle = {};
                                                        if (col.key === 'name') customStyle = { minWidth: "250px" };
                                                        if (col.key === 'qty') customStyle = { minWidth: "80px", maxWidth: "80px" };

                                                        if (col.key === 'warehouse' && !store.settings?.enable_warehouse_module) return null;

                                                        let label = "";
                                                        if (col.key === 'si_no') label = t('SI No.');
                                                        if (col.key === 'part_number') label = t('Part No.');
                                                        if (col.key === 'name') label = t('Name');
                                                        if (col.key === 'info') label = t('Info');
                                                        if (col.key === 'purchase_unit_price') label = t('Purchase Unit Price(without VAT)');
                                                        if (col.key === 'stock') label = t('Stock');
                                                        if (col.key === 'warehouse') label = t('Remove Stock From');
                                                        if (col.key === 'qty') label = t('Qty');
                                                        if (col.key === 'unit_price') label = t('Unit Price(without VAT)');
                                                        if (col.key === 'unit_price_with_vat') label = t('Unit Price(with VAT)');
                                                        if (col.key === 'unit_discount') label = t('Unit Disc.(without VAT)');
                                                        if (col.key === 'unit_discount_with_vat') label = t('Unit Disc.(with VAT)');
                                                        if (col.key === 'unit_discount_percent') label = t('Unit Disc. %(with VAT)');
                                                        if (col.key === 'price') label = t('Price(without VAT)');
                                                        if (col.key === 'price_with_vat') label = t('Price(with VAT)');

                                                        return (
                                                            <th key={col.key} className={`p-2 border-b border-outline-variant font-bold text-on-surface-variant ${alignClass}`} style={customStyle}>
                                                                {label}
                                                            </th>
                                                        );
                                                    })}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-outline-variant/30 font-body-md bg-surface-container-lowest">
                                                {selectedProducts.map((product, index) => {
                                                    // Find all indexes with the same product_id
                                                    const duplicateIndexes = selectedProducts
                                                        .map((p, i) => p.product_id === product.product_id ? i : -1)
                                                        .filter(i => i !== -1);
                                                    const duplicateCount = duplicateIndexes.length;
                                                    return (
                                                        <tr
                                                            className="text-center fixed-row"
                                                            key={index}>
                                                            {selectedProductsColumns.filter(c => c.visible).map(col => {
                                                                if (col.key === 'delete') return (<td style={{ verticalAlign: 'middle', padding: '0.25rem' }} >
                                                                    <div
                                                                        style={{ color: "red", cursor: "pointer" }}
                                                                        onClick={() => {
                                                                            removeProduct(product);
                                                                        }}
                                                                    >
                                                                        <i className="bi bi-trash"> </i>
                                                                    </div>
                                                                </td>);
                                                                if (col.key === 'si_no') return (<td style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                                    {index + 1}

                                                                </td>);
                                                                if (col.key === 'part_number') return (<ResizableTableCell style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                                                        <input type="text" id={`sales_product_part_number${index}`}
                                                                            name={`sales_product_part_number${index}`}
                                                                            onWheel={(e) => e.target.blur()}
                                                                            value={selectedProducts[index].part_number}
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
                                                                            <i
                                                                                className={`bi bi-exclamation-circle-fill ${errors[`part_number_${index}`] ? 'text-danger' : 'text-warning'} ms-2`}
                                                                                data-bs-toggle="tooltip"
                                                                                data-bs-placement="top"
                                                                                data-error={errors[`part_number_${index}`] || ''}
                                                                                data-warning={warnings[`part_number_${index}`] || ''}
                                                                                title={errors[`part_number_${index}`] || warnings[`part_number_${index}`] || ''}
                                                                                style={{
                                                                                    fontSize: '0.85rem',
                                                                                    cursor: 'pointer',
                                                                                    whiteSpace: 'nowrap',
                                                                                }}
                                                                            ></i>
                                                                        )}

                                                                    </div>
                                                                </ResizableTableCell>);
                                                                if (col.key === 'name') return (<ResizableTableCell style={{ verticalAlign: 'middle', padding: '0.25rem' }}
                                                                >
                                                                    <div className="input-group" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                                                        <input type="text" id={`${"sales_product_name" + index}`}
                                                                            name={`${"sales_product_name" + index}`}
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
                                                                </ResizableTableCell>);
                                                                if (col.key === 'info') return (<td style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
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

                                                                                <Dropdown.Item onClick={() => openPurchaseHistory(product)}>
                                                                                    <i className="bi bi-clock-history"></i>&nbsp;
                                                                                    {t("Purchase History")} ({getShortcut('purchaseHistory')})
                                                                                </Dropdown.Item>

                                                                                <Dropdown.Item onClick={() => openPurchaseReturnHistory(product)}>
                                                                                    <i className="bi bi-clock-history"></i>&nbsp;
                                                                                    {t("Purchase Return History")} ({getShortcut('purchaseReturnHistory')})
                                                                                </Dropdown.Item>

                                                                                <Dropdown.Item onClick={() => openDeliveryNoteHistory(product)}>
                                                                                    <i className="bi bi-clock-history"></i>&nbsp;
                                                                                    {t("Delivery Note History")} ({getShortcut('deliveryNoteHistory')})
                                                                                </Dropdown.Item>

                                                                                <Dropdown.Item onClick={() => openQuotationHistory(product, "quotation")}>
                                                                                    <i className="bi bi-clock-history"></i>&nbsp;
                                                                                    {t("Quotation History")} ({getShortcut('quotationHistory')})
                                                                                </Dropdown.Item>

                                                                                <Dropdown.Item onClick={() => openQuotationSalesHistory(product)}>
                                                                                    <i className="bi bi-clock-history"></i>&nbsp;
                                                                                    {t("Qtn. Sales History")} ({getShortcut('quotationSalesHistory')})
                                                                                </Dropdown.Item>

                                                                                <Dropdown.Item onClick={() => openQuotationSalesReturnHistory(product)}>
                                                                                    <i className="bi bi-clock-history"></i>&nbsp;
                                                                                    {t("Qtn. Sales Return History")} ({getShortcut('quotationSalesReturnHistory')})
                                                                                </Dropdown.Item>

                                                                                <Dropdown.Item onClick={() => openProductImages(product.product_id)}>
                                                                                    <i className="bi bi-clock-history"></i>&nbsp;
                                                                                    {t("Images")} ({getShortcut('images')})
                                                                                </Dropdown.Item>
                                                                            </Dropdown.Menu>

                                                                        </Dropdown>
                                                                    </div>

                                                                </td>);

                                                                if (col.key === 'purchase_unit_price') return (<td style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                                    <div className="input-group">
                                                                        <input
                                                                            type="number"
                                                                            id={`sales_product_purchase_unit_price_${index}`}
                                                                            name={`sales_product_purchase_unit_price_${index}`}
                                                                            className={`form-control text-end ${errors["purchase_unit_price_" + index] ? 'is-invalid' : ''} ${warnings["purchase_unit_price_" + index] ? 'border-warning text-warning' : ''}`}
                                                                            onWheel={(e) => e.target.blur()}
                                                                            value={product.purchase_unit_price}
                                                                            placeholder={t("Purchase Unit Price")}
                                                                            ref={(el) => {
                                                                                if (!inputRefs.current[index]) inputRefs.current[index] = {};
                                                                                inputRefs.current[index][`${"sales_product_purchase_unit_price_" + index}`] = el;
                                                                            }}
                                                                            onFocus={() => {
                                                                                if (timerRef.current) clearTimeout(timerRef.current);
                                                                                timerRef.current = setTimeout(() => {
                                                                                    inputRefs.current[index][`${"sales_product_purchase_unit_price_" + index}`]?.select();
                                                                                }, 20);
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
                                                                                        timerRef.current = setTimeout(() => {
                                                                                            productSearchRef.current?.focus();
                                                                                        }, 100);
                                                                                    } else {
                                                                                        timerRef.current = setTimeout(() => {
                                                                                            inputRefs.current[(index + 1)][`${"sales_unit_discount_with_vat_" + (index + 1)}`]?.select();
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
                                                                </td>);

                                                                if (col.key === 'stock') return (<td
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
                                                                if (col.key === 'warehouse') return store.settings?.enable_warehouse_module ? (<td style={{
                                                                    verticalAlign: 'middle',
                                                                    padding: '0.25rem',
                                                                    whiteSpace: 'nowrap',
                                                                    width: 'auto',
                                                                    position: 'relative',
                                                                }} >
                                                                    <select
                                                                        id={`sales_product_warehouse_${index}`}
                                                                        name={`sales_product_warehouse_${index}`}
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
                                                                if (col.key === 'qty') return (<td style={{
                                                                    verticalAlign: 'middle',
                                                                    padding: '0.25rem',
                                                                    whiteSpace: 'nowrap',
                                                                    width: 'auto',
                                                                    position: 'relative',
                                                                }} >
                                                                    <div className="d-flex align-items-center" style={{}}>
                                                                        <div className="input-group flex-nowrap" style={{ flex: '1 1 auto' }}>
                                                                            <input type="number"
                                                                                style={{ minWidth: "80px", maxWidth: "80px" }}
                                                                                id={`${"sales_product_quantity_" + index}`}
                                                                                name={`${"sales_product_quantity" + index}`}
                                                                                className={`form-control text-end ${errors["quantity_" + index] ? 'is-invalid' : warnings["quantity_" + index] ? 'border-warning text-warning' : ''}`}
                                                                                onWheel={(e) => e.target.blur()}
                                                                                value={product.quantity}
                                                                                placeholder="Quantity"
                                                                                ref={(el) => {
                                                                                    if (!inputRefs.current[index]) inputRefs.current[index] = {};
                                                                                    inputRefs.current[index][`${"sales_product_quantity_" + index}`] = el;
                                                                                }}
                                                                                onFocus={() => {
                                                                                    if (timerRef.current) clearTimeout(timerRef.current);
                                                                                    timerRef.current = setTimeout(() => {
                                                                                        inputRefs.current[index][`${"sales_product_quantity_" + index}`]?.select();
                                                                                    }, 20);
                                                                                }}
                                                                                onKeyDown={(e) => {
                                                                                    RunKeyActions(e, product);
                                                                                    if (timerRef.current) clearTimeout(timerRef.current);

                                                                                    if (e.key === "Backspace") {
                                                                                        selectedProducts[index].quantity = "";
                                                                                        setSelectedProducts([...selectedProducts]);
                                                                                        timerRef.current = setTimeout(() => {
                                                                                            CalCulateLineTotals(index);
                                                                                            checkWarning(index, selectedProducts[index]);
                                                                                            checkErrors(index);
                                                                                            reCalculate(index);
                                                                                        }, 100);
                                                                                    } else if (e.key === "ArrowLeft") {
                                                                                        timerRef.current = setTimeout(() => {
                                                                                            inputRefs.current[index][`${"sales_product_purchase_unit_price_" + index}`]?.select();
                                                                                        }, 100);
                                                                                    }
                                                                                }}
                                                                                onChange={(e) => {
                                                                                    if (timerRef.current) clearTimeout(timerRef.current);

                                                                                    if (parseFloat(e.target.value) === 0) {
                                                                                        selectedProducts[index].quantity = e.target.value;
                                                                                        setSelectedProducts([...selectedProducts]);
                                                                                        timerRef.current = setTimeout(() => {
                                                                                            CalCulateLineTotals(index);
                                                                                            checkWarning(index, selectedProducts[index]);
                                                                                            checkErrors(index);
                                                                                            reCalculate(index);
                                                                                        }, 100);
                                                                                        return;
                                                                                    }


                                                                                    if (!e.target.value) {
                                                                                        selectedProducts[index].quantity = e.target.value;
                                                                                        setSelectedProducts([...selectedProducts]);
                                                                                        timerRef.current = setTimeout(() => {
                                                                                            CalCulateLineTotals(index);
                                                                                            checkErrors(index);
                                                                                            checkWarning(index, selectedProducts[index]);
                                                                                            reCalculate(index);
                                                                                        }, 100);
                                                                                        return;
                                                                                    }


                                                                                    product.quantity = parseFloat(e.target.value);
                                                                                    selectedProducts[index].quantity = parseFloat(e.target.value);
                                                                                    timerRef.current = setTimeout(() => {
                                                                                        CalCulateLineTotals(index);
                                                                                        checkErrors(index);
                                                                                        checkWarning(index, selectedProducts[index]);
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
                                                                </td>);

                                                                if (col.key === 'unit_price') return (<td style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                                    <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                                                                        <div className="input-group flex-nowrap" style={{ flex: '1 1 auto', minWidth: 0 }}>
                                                                            <input type="number"
                                                                                id={`${"sales_product_unit_price_" + index}`}
                                                                                name={`${"sales_product_unit_price_" + index}`}
                                                                                onWheel={(e) => e.target.blur()}
                                                                                value={selectedProducts[index].unit_price}
                                                                                className={`form-control text-end ${errors["unit_price_" + index] ? 'is-invalid' : ''} ${warnings["unit_price_" + index] ? 'border-warning text-warning' : ''}`}
                                                                                placeholder="Unit Price(without VAT)"
                                                                                ref={(el) => {
                                                                                    if (!inputRefs.current[index]) inputRefs.current[index] = {};
                                                                                    inputRefs.current[index][`${"sales_product_unit_price_" + index}`] = el;
                                                                                }}

                                                                                onFocus={() => {
                                                                                    if (timerRef.current) clearTimeout(timerRef.current);
                                                                                    timerRef.current = setTimeout(() => {
                                                                                        inputRefs.current[index][`${"sales_product_unit_price_" + index}`]?.select();
                                                                                    }, 20);
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
                                                                                            checkErrors(index);
                                                                                            reCalculate(index);
                                                                                        }, 100);
                                                                                    } else if (e.key === "ArrowLeft") {
                                                                                        timerRef.current = setTimeout(() => {
                                                                                            inputRefs.current[index][`${"sales_product_quantity_" + index}`]?.select();
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
                                                                                            CalCulateLineTotals(index);
                                                                                            checkErrors(index);
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
                                                                                            CalCulateLineTotals(index);
                                                                                            checkErrors(index);
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
                                                                                        selectedProducts[index].unit_discount_percent = parseFloat(trimTo2Decimals(((selectedProducts[index].unit_discount / selectedProducts[index].unit_price) * 100)))
                                                                                        selectedProducts[index].unit_discount_percent_with_vat = parseFloat(trimTo2Decimals(((selectedProducts[index].unit_discount_with_vat / selectedProducts[index].unit_price_with_vat) * 100)))
                                                                                        CalCulateLineTotals(index);
                                                                                        reCalculate(index);
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
                                                                </td>);
                                                                if (col.key === 'unit_price_with_vat') return (<td style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                                    <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                                                                        <div className="input-group flex-nowrap" style={{ flex: '1 1 auto', minWidth: 0 }}>
                                                                            <input type="number"
                                                                                id={`${"sales_product_unit_price_with_vat_" + index}`}
                                                                                name={`${"sales_product_unit_price_with_vat_" + index}`}
                                                                                onWheel={(e) => e.target.blur()}
                                                                                value={selectedProducts[index].unit_price_with_vat}
                                                                                className={`form-control text-end ${errors["unit_price_with_vat_" + index] ? 'is-invalid' : ''} ${warnings["unit_price_with_vat_" + index] ? 'border-warning text-warning' : ''}`}
                                                                                ref={(el) => {
                                                                                    if (!inputRefs.current[index]) inputRefs.current[index] = {};
                                                                                    inputRefs.current[index][`${"sales_product_unit_price_with_vat_" + index}`] = el;
                                                                                }}
                                                                                placeholder={t("Unit Price(with VAT)")}

                                                                                onFocus={() => {
                                                                                    if (timerRef.current) clearTimeout(timerRef.current);
                                                                                    timerRef.current = setTimeout(() => {
                                                                                        inputRefs.current[index][`${"sales_product_unit_price_with_vat_" + index}`]?.select();
                                                                                    }, 20);
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
                                                                                            inputRefs.current[index][`${"sales_product_unit_price_" + index}`]?.select();
                                                                                        }, 50);
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
                                                                                        selectedProducts[index].unit_discount_with_vat = parseFloat(trimTo2Decimals(selectedProducts[index].unit_discount * (1 + (formData.vat_percent / 100))))

                                                                                        selectedProducts[index].unit_discount_percent = parseFloat(trimTo2Decimals(((selectedProducts[index].unit_discount / selectedProducts[index].unit_price) * 100)))
                                                                                        selectedProducts[index].unit_discount_percent_with_vat = parseFloat(trimTo2Decimals(((selectedProducts[index].unit_discount_with_vat / selectedProducts[index].unit_price_with_vat) * 100)))

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
                                                                </td>);
                                                                if (col.key === 'unit_discount') return (<td style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                                    <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                                                                        <div className="input-group flex-nowrap" style={{ flex: '1 1 auto', minWidth: 0 }}>
                                                                            <input type="number"
                                                                                id={`${"sales_unit_discount_" + index}`}
                                                                                name={`${"sales_unit_discount_" + index}`}
                                                                                onWheel={(e) => e.target.blur()}
                                                                                className={`form-control text-end ${errors["unit_discount_" + index] ? 'is-invalid' : ''} ${warnings["unit_discount_" + index] ? 'border-warning text-warning' : ''}`}
                                                                                value={selectedProducts[index].unit_discount}
                                                                                ref={(el) => {
                                                                                    if (!inputRefs.current[index]) inputRefs.current[index] = {};
                                                                                    inputRefs.current[index][`${"sales_unit_discount_" + index}`] = el;
                                                                                }}
                                                                                onFocus={() => {
                                                                                    if (timerRef.current) clearTimeout(timerRef.current);
                                                                                    timerRef.current = setTimeout(() => {
                                                                                        inputRefs.current[index][`${"sales_unit_discount_" + index}`]?.select();
                                                                                    }, 20);
                                                                                }}
                                                                                onKeyDown={(e) => {
                                                                                    RunKeyActions(e, product);

                                                                                    if (timerRef.current) clearTimeout(timerRef.current);
                                                                                    if (e.key === "ArrowLeft") {
                                                                                        timerRef.current = setTimeout(() => {
                                                                                            inputRefs.current[index][`${"sales_product_unit_price_with_vat_" + index}`]?.select();
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
                                                                                        errors["unit_discount_" + index] = t("Unit discount should be greater than or equal 0");
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
                                                                                        selectedProducts[index].unit_discount_with_vat = parseFloat(trimTo8Decimals(selectedProducts[index].unit_discount * (1 + (formData.vat_percent / 100))))

                                                                                        selectedProducts[index].unit_discount_percent = parseFloat(trimTo8Decimals(((selectedProducts[index].unit_discount / selectedProducts[index].unit_price) * 100)))
                                                                                        selectedProducts[index].unit_discount_percent_with_vat = parseFloat(trimTo8Decimals(((selectedProducts[index].unit_discount_with_vat / selectedProducts[index].unit_price_with_vat) * 100)))
                                                                                        CalCulateLineTotals(index);
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
                                                                </td>);
                                                                if (col.key === 'unit_discount_with_vat') return (<td style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                                    <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                                                                        <div className="input-group flex-nowrap" style={{ flex: '1 1 auto', minWidth: 0 }}>
                                                                            <input type="number"
                                                                                id={`${"sales_unit_discount_with_vat_" + index}`}
                                                                                name={`${"sales_unit_discount_with_vat_" + index}`}
                                                                                onWheel={(e) => e.target.blur()}
                                                                                className={`form-control text-end ${errors["unit_discount_with_vat_" + index] ? 'is-invalid' : ''} ${warnings["unit_discount_with_vat_" + index] ? 'border-warning text-warning' : ''}`}
                                                                                value={selectedProducts[index].unit_discount_with_vat}
                                                                                ref={(el) => {
                                                                                    if (!inputRefs.current[index]) inputRefs.current[index] = {};
                                                                                    inputRefs.current[index][`${"sales_unit_discount_with_vat_" + index}`] = el;
                                                                                }}
                                                                                onFocus={() => {
                                                                                    if (timerRef.current) clearTimeout(timerRef.current);
                                                                                    timerRef.current = setTimeout(() => {
                                                                                        inputRefs.current[index][`${"sales_unit_discount_with_vat_" + index}`]?.select();
                                                                                    }, 20);
                                                                                }}
                                                                                onKeyDown={(e) => {
                                                                                    RunKeyActions(e, product);

                                                                                    if (timerRef.current) clearTimeout(timerRef.current);

                                                                                    if (e.key === "Enter") {
                                                                                        if ((index + 1) === selectedProducts.length) {
                                                                                            timerRef.current = setTimeout(() => {
                                                                                                productSearchRef.current?.focus();
                                                                                            }, 100);
                                                                                        } else {
                                                                                            if (index === 0) {
                                                                                                console.log("moviing to discount")
                                                                                                timerRef.current = setTimeout(() => {
                                                                                                    // discountRef.current?.focus();
                                                                                                    productSearchRef.current?.focus();
                                                                                                }, 100);
                                                                                            } else {
                                                                                                console.log("moviing to next line")
                                                                                                timerRef.current = setTimeout(() => {
                                                                                                    inputRefs.current[index - 1][`${"sales_product_quantity_" + (index - 1)}`]?.select();
                                                                                                }, 100);
                                                                                            }

                                                                                        }
                                                                                    } else if (e.key === "ArrowLeft") {
                                                                                        timerRef.current = setTimeout(() => {
                                                                                            inputRefs.current[index][`${"sales_unit_discount_" + index}`]?.select();
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
                                                                                        errors["unit_discount_" + index] = t("Unit discount should be greater than or equal to zero");
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

                                                                                        selectedProducts[index].unit_discount = parseFloat(trimTo8Decimals(selectedProducts[index].unit_discount_with_vat / (1 + (formData.vat_percent / 100))))
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
                                                                </td>);
                                                                if (col.key === 'unit_discount_percent') return (<td style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                                    <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                                                                        <div className="input-group flex-nowrap" style={{ flex: '1 1 auto', minWidth: 0 }}>
                                                                            <input type="number"
                                                                                id={`${"sales_unit_discount_percent_with_vat_" + index}`}
                                                                                disabled={true}
                                                                                name={`${"sales_unit_discount_percent_with_vat_" + index}`}
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
                                                                                        errors["unit_discount_percent_" + index] = t("Unit discount % should be greater than or equal to zero");
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

                                                                                    selectedProducts[index].unit_discount_percent_with_vat = parseFloat(e.target.value); //input


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
                                                                </td>);
                                                                if (col.key === 'price') return (<td style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
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
                                                                </td>);
                                                                if (col.key === 'price_with_vat') return (<td style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
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
                                                                </td>);
                                                                return null;
                                                            })}
                                                        </tr>);
                                                }).reverse()}

                                            </tbody>
                                        </table>
                                    </div> {/* Close table-container */}
                                </div> {/* Close center panel flex-col wrapper */}

                                {/* Right Sidebar: Payments & Summary */}
                                <aside className={isRightPanelCollapsed
                                    ? "hidden"
                                    : "w-full lg:w-[360px] lg:shrink-0 border-l border-outline-variant bg-surface-container-low sidebar-scroll flex flex-col pos-scroll"}>

                                    {/* Bill Summary (Top Focused Panel) */}
                                    <div className="bg-inverse-surface text-inverse-on-surface p-md space-y-sm shadow-inner rounded-b-lg">
                                        <div style={{ position: "relative" }}>
                                            <div className="flex justify-between items-center mb-xs">
                                                <div className="flex items-center">
                                                    <button type="button" onClick={() => setIsRightPanelCollapsed(true)} className="p-1 hover:bg-white/20 rounded border-0 bg-transparent text-primary-fixed flex items-center justify-center cursor-pointer mr-2 shrink-0" title={t("Collapse Right Sidebar")}>
                                                        <i className="bi bi-layout-sidebar-reverse text-[16px]"></i>
                                                    </button>
                                                    <h2 className="font-headline-md text-primary-fixed m-0">{t("Bill Summary")}</h2>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button type="button" onClick={() => setShowBillSummarySettingsT2(v => !v)} title={t("Customize Bill Summary")} className="border-0 bg-transparent text-primary-fixed-dim hover:text-primary-fixed p-0 flex items-center justify-center cursor-pointer" style={{ lineHeight: 1 }}>
                                                        <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>settings</span>
                                                    </button>
                                                    <span className="material-symbols-outlined text-primary-fixed-dim">receipt_long</span>
                                                </div>
                                            </div>
                                            {showBillSummarySettingsT2 && (
                                                <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 1060, background: "rgba(22,33,48,0.98)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", padding: "16px", width: "320px", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
                                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                                        <strong style={{ fontSize: "13px", color: "rgba(255,255,255,0.9)" }}>{t("Customize Bill Summary")}</strong>
                                                        <button type="button" className="btn-close btn-close-white" style={{ fontSize: "10px" }} onClick={() => setShowBillSummarySettingsT2(false)}></button>
                                                    </div>
                                                    <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", marginBottom: "8px" }}>{t("Toggle visibility or reorder fields")}</div>
                                                    {billSummaryOrderT2.map((key, idx) => (
                                                        <div
                                                            key={key}
                                                            className="d-flex align-items-center gap-2 mb-1"
                                                            style={{ padding: "3px 0", borderBottom: "1px solid rgba(255,255,255,0.07)", cursor: "grab" }}
                                                            draggable
                                                            onDragStart={() => { billSummaryDragRef.current = idx; }}
                                                            onDragOver={e => e.preventDefault()}
                                                            onDrop={() => { reorderBillSummaryT2(billSummaryDragRef.current, idx); billSummaryDragRef.current = null; }}
                                                        >
                                                            <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "15px", cursor: "grab", userSelect: "none", flexShrink: 0 }}>⠿</span>
                                                            <input type="checkbox" className="form-check-input m-0" checked={!!billSummaryVisibleT2[key]} onChange={e => updateBillSummaryVisibleT2(key, e.target.checked)} style={{ width: "14px", height: "14px", flexShrink: 0 }} />
                                                            <span style={{ flex: 1, fontSize: "12px", color: "rgba(255,255,255,0.8)" }}>{t(_billSummaryFieldLabels[key])}</span>
                                                        </div>
                                                    ))}
                                                    <button type="button" className="btn btn-sm btn-outline-light mt-2 w-100" style={{ fontSize: "11px" }} onClick={() => {
                                                        setBillSummaryOrderT2([..._defaultBillSummaryOrder]);
                                                        setBillSummaryVisibleT2(Object.fromEntries(_defaultBillSummaryOrder.map(k => [k, true])));
                                                        localStorage.removeItem('bill_summary_visible_t2');
                                                        localStorage.removeItem('bill_summary_order_t2');
                                                    }}>{t("Reset to Default")}</button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-1.5 text-body-md">
                                            {billSummaryOrderT2.filter(key => billSummaryVisibleT2[key]).map(key => {
                                                switch (key) {
                                                    case 'total_without_vat': return (
                                                        <div key="total_without_vat" className="flex justify-between opacity-80">
                                                            <span className="flex items-center gap-1">{t("Total (without VAT)")} <OverlayTrigger placement="left" overlay={renderTotalWithoutVATTooltip}><span style={{ cursor: 'pointer', fontSize: '12px' }}>ℹ️</span></OverlayTrigger></span>
                                                            <span className="font-data-mono">{trimTo2Decimals(formData.total)}</span>
                                                        </div>
                                                    );
                                                    case 'total_with_vat': return (
                                                        <div key="total_with_vat" className="flex justify-between opacity-80">
                                                            <span className="flex items-center gap-1">{t("Total (with VAT)")} <OverlayTrigger placement="left" overlay={renderTotalWithVATTooltip}><span style={{ cursor: 'pointer', fontSize: '12px' }}>ℹ️</span></OverlayTrigger></span>
                                                            <span className="font-data-mono">{trimTo2Decimals(formData.total_with_vat)}</span>
                                                        </div>
                                                    );
                                                    case 'shipping': return (
                                                        <div key="shipping" className="flex justify-between items-center">
                                                            <span className="opacity-80 flex items-center gap-1">{t("Shipping & Handling Fees")} <OverlayTrigger placement="left" overlay={renderShippingTooltip}><span style={{ cursor: 'pointer', fontSize: '12px' }}>ℹ️</span></OverlayTrigger></span>
                                                            <div className="flex flex-col items-end">
                                                                <input
                                                                    type="number"
                                                                    id="sales_shipping_fees"
                                                                    name="sales_shipping_fees"
                                                                    onWheel={(e) => e.target.blur()}
                                                                    className="w-20 bg-white/10 border border-white/20 rounded px-1.5 py-0.5 text-right text-body-md text-inverse-on-surface focus:outline-none focus:border-primary-fixed"
                                                                    value={shipping}
                                                                    onChange={(e) => {
                                                                        if (timerRef.current) clearTimeout(timerRef.current);
                                                                        delete errors["shipping_handling_fees"];
                                                                        setErrors({ ...errors });
                                                                        if (parseFloat(e.target.value) === 0) {
                                                                            shipping = 0;
                                                                            setShipping(shipping);
                                                                            delete errors["shipping_handling_fees"];
                                                                            setErrors({ ...errors });
                                                                            timerRef.current = setTimeout(() => { reCalculate(); }, 300);
                                                                            return;
                                                                        }
                                                                        if (parseFloat(e.target.value) < 0) {
                                                                            shipping = 0;
                                                                            setShipping(shipping);
                                                                            setErrors({ ...errors });
                                                                            timerRef.current = setTimeout(() => { reCalculate(); }, 300);
                                                                            return;
                                                                        }
                                                                        if (!e.target.value) {
                                                                            shipping = "";
                                                                            setShipping(shipping);
                                                                            setErrors({ ...errors });
                                                                            timerRef.current = setTimeout(() => { reCalculate(); }, 300);
                                                                            return;
                                                                        }
                                                                        if (/^\d*\.?\d{0,2}$/.test(parseFloat(e.target.value)) === false) {
                                                                            errors["shipping_handling_fees"] = t("Max. decimal points allowed is 2");
                                                                            setErrors({ ...errors });
                                                                        }
                                                                        shipping = parseFloat(e.target.value);
                                                                        setShipping(shipping);
                                                                        timerRef.current = setTimeout(() => { reCalculate(); }, 300);
                                                                    }}
                                                                />
                                                                {errors.shipping_handling_fees && (
                                                                    <div style={{ color: "red" }} className="text-[10px] mt-0.5">
                                                                        {errors.shipping_handling_fees}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                    case 'discount_without_vat': return (
                                                        <div key="discount_without_vat" className="flex justify-between items-center">
                                                            <span className="opacity-80 flex items-center gap-1">{t("Sales Discount(without VAT)")} <OverlayTrigger placement="left" overlay={renderDiscountWithoutVATTooltip}><span style={{ cursor: 'pointer', fontSize: '12px' }}>ℹ️</span></OverlayTrigger></span>
                                                            <div className="flex flex-col items-end">
                                                                <input
                                                                    type="number"
                                                                    id="sales_discount"
                                                                    name="sales_discount"
                                                                    onWheel={(e) => e.target.blur()}
                                                                    className="w-20 bg-white/10 border border-white/20 rounded px-1.5 py-0.5 text-right text-body-md text-inverse-on-surface focus:outline-none focus:border-primary-fixed"
                                                                    value={discount}
                                                                    ref={discountRef}
                                                                    onFocus={() => {
                                                                        if (timerRef.current) clearTimeout(timerRef.current);
                                                                        timerRef.current = setTimeout(() => { discountRef.current?.select(); }, 20);
                                                                    }}
                                                                    onChange={(e) => {
                                                                        if (timerRef.current) clearTimeout(timerRef.current);
                                                                        if (parseFloat(e.target.value) === 0) {
                                                                            discount = 0; setDiscount(discount);
                                                                            discountWithVAT = 0; setDiscountWithVAT(discountWithVAT);
                                                                            discountPercent = 0; setDiscountPercent(discountPercent);
                                                                            discountPercentWithVAT = 0; setDiscountPercent(discountPercentWithVAT);
                                                                            delete errors["discount"]; setErrors({ ...errors });
                                                                            timerRef.current = setTimeout(() => { reCalculate(); }, 100);
                                                                            return;
                                                                        }
                                                                        if (parseFloat(e.target.value) < 0) {
                                                                            discount = 0; setDiscount(discount);
                                                                            discountWithVAT = 0; setDiscountWithVAT(discountWithVAT);
                                                                            discountPercent = 0; setDiscountPercent(discountPercent);
                                                                            discountPercentWithVAT = 0; setDiscountPercent(discountPercentWithVAT);
                                                                            setErrors({ ...errors });
                                                                            timerRef.current = setTimeout(() => { reCalculate(); }, 100);
                                                                            return;
                                                                        }
                                                                        if (!e.target.value) {
                                                                            discount = ""; setDiscount(discount);
                                                                            discountWithVAT = ""; setDiscountWithVAT(discountWithVAT);
                                                                            discountPercent = ""; setDiscountPercent(discountPercent);
                                                                            discountPercentWithVAT = ""; setDiscountPercent(discountPercentWithVAT);
                                                                            setErrors({ ...errors });
                                                                            timerRef.current = setTimeout(() => { reCalculate(); }, 100);
                                                                            return;
                                                                        }
                                                                        delete errors["discount"]; delete errors["discount_percent"]; setErrors({ ...errors });
                                                                        if (/^\d*\.?\d{0,2}$/.test(parseFloat(e.target.value)) === false) {
                                                                            errors["discount"] = t("Max. decimal points allowed is 2"); setErrors({ ...errors });
                                                                        }
                                                                        discount = parseFloat(e.target.value); setDiscount(discount);
                                                                        timerRef.current = setTimeout(() => {
                                                                            discountWithVAT = parseFloat(trimTo2Decimals(discount * (1 + (formData.vat_percent / 100))));
                                                                            setDiscountWithVAT(discountWithVAT);
                                                                            reCalculate();
                                                                        }, 100);
                                                                    }}
                                                                />
                                                                {errors.discount && (
                                                                    <div style={{ color: "red" }} className="text-[10px] mt-0.5">{errors.discount}</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                    case 'discount_with_vat': return (
                                                        <div key="discount_with_vat" className="flex justify-between items-center">
                                                            <span className="opacity-80 flex items-center gap-1">{t("Sales Discount(with VAT)")} <OverlayTrigger placement="left" overlay={renderDiscountWithVATTooltip}><span style={{ cursor: 'pointer', fontSize: '12px' }}>ℹ️</span></OverlayTrigger></span>
                                                            <div className="flex flex-col items-end">
                                                                <input
                                                                    type="number"
                                                                    id="sales_discount_with_vat"
                                                                    name="sales_discount_with_vat"
                                                                    onWheel={(e) => e.target.blur()}
                                                                    className="w-20 bg-white/10 border border-white/20 rounded px-1.5 py-0.5 text-right text-body-md text-inverse-on-surface focus:outline-none focus:border-primary-fixed"
                                                                    value={discountWithVAT}
                                                                    ref={discountWithVATRef}
                                                                    onFocus={() => {
                                                                        if (timerRef.current) clearTimeout(timerRef.current);
                                                                        timerRef.current = setTimeout(() => { discountWithVATRef.current?.select(); }, 20);
                                                                    }}
                                                                    onChange={(e) => {
                                                                        if (timerRef.current) clearTimeout(timerRef.current);
                                                                        if (parseFloat(e.target.value) === 0) {
                                                                            discount = 0; discountWithVAT = 0; discountPercent = 0;
                                                                            setDiscount(discount); setDiscountWithVAT(discount); setDiscountPercent(discount);
                                                                            delete errors["discount_with_vat"]; setErrors({ ...errors });
                                                                            timerRef.current = setTimeout(() => { reCalculate(); }, 100);
                                                                            return;
                                                                        }
                                                                        if (parseFloat(e.target.value) < 0) {
                                                                            discount = 0.00; discountWithVAT = 0.00; discountPercent = 0.00;
                                                                            setDiscount(discount); setDiscountWithVAT(discount); setDiscountPercent(discountPercent);
                                                                            setErrors({ ...errors });
                                                                            timerRef.current = setTimeout(() => { reCalculate(); }, 100);
                                                                            return;
                                                                        }
                                                                        if (!e.target.value) {
                                                                            discount = ""; discountWithVAT = ""; discountPercent = "";
                                                                            setDiscount(discount); setDiscountWithVAT(discount); setDiscountPercent(discountPercent);
                                                                            setErrors({ ...errors });
                                                                            timerRef.current = setTimeout(() => { reCalculate(); }, 100);
                                                                            return;
                                                                        }
                                                                        delete errors["discount_with_vat"]; delete errors["discount_percent_with_vat"]; setErrors({ ...errors });
                                                                        if (/^\d*\.?\d{0,2}$/.test(parseFloat(e.target.value)) === false) {
                                                                            errors["discount_with_vat"] = t("Max. decimal points allowed is 2"); setErrors({ ...errors });
                                                                        }
                                                                        discountWithVAT = parseFloat(e.target.value); setDiscountWithVAT(discountWithVAT);
                                                                        timerRef.current = setTimeout(() => {
                                                                            discount = parseFloat(trimTo2Decimals(discountWithVAT / (1 + (formData.vat_percent / 100))));
                                                                            setDiscount(discount);
                                                                            reCalculate();
                                                                        }, 100);
                                                                    }}
                                                                />
                                                                {errors.discount_with_vat && (
                                                                    <div style={{ color: "red" }} className="text-[10px] mt-0.5">{errors.discount_with_vat}</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                    case 'taxable_amount': return (
                                                        <div key="taxable_amount" className="flex justify-between opacity-80">
                                                            <span style={{ cursor: "help" }} title={`${t("Total(without VAT)")} + ${t("Shipping & Handling Fees")} - ${t("Discount(without VAT)")} (${trimTo2Decimals(formData.total)} + ${trimTo2Decimals(shipping)} - ${trimTo2Decimals(discount)}) = ${trimTo2Decimals(formData.total + shipping - discount)}`}>{t("Total Taxable Amount(without VAT)")}</span>
                                                            <span className="font-data-mono">{trimTo2Decimals(formData.total + shipping - discount)}</span>
                                                        </div>
                                                    );
                                                    case 'vat': return (
                                                        <div key="vat" className="flex justify-between opacity-80">
                                                            <span className="flex items-center gap-1">{t("VAT") + ` (${formData.vat_percent}%)`} <OverlayTrigger placement="left" overlay={renderVATTooltip}><span style={{ cursor: 'pointer', fontSize: '12px' }}>ℹ️</span></OverlayTrigger></span>
                                                            <span className="font-data-mono">{trimTo2Decimals(formData.vat_price)}</span>
                                                        </div>
                                                    );
                                                    case 'net_before_rounding': return (
                                                        <div key="net_before_rounding" className="flex justify-between opacity-80">
                                                            <span className="flex items-center gap-1">{t("Net Total Before Rounding")} <OverlayTrigger placement="left" overlay={renderNetTotalBeforeRoundingTooltip}><span style={{ cursor: 'pointer', fontSize: '12px' }}>ℹ️</span></OverlayTrigger></span>
                                                            <span className="font-data-mono">{trimTo2Decimals(formData.total + shipping - discount + formData.vat_price)}</span>
                                                        </div>
                                                    );
                                                    case 'rounding_amount': return (
                                                        <div key="rounding_amount" className="flex justify-between items-center">
                                                            <div className="flex items-center gap-xs">
                                                                <span className="opacity-80">{t("Rounding Amount")}</span>
                                                                <label className="flex items-center gap-1 cursor-pointer mb-0">
                                                                    <input
                                                                        type="checkbox"
                                                                        id="sales_auto_rounding_amount"
                                                                        name="sales_auto_rounding_amount"
                                                                        className="w-3.5 h-3.5 rounded-sm text-primary focus:ring-primary m-0"
                                                                        checked={formData.auto_rounding_amount}
                                                                        onChange={() => {
                                                                            if (timerRef.current) clearTimeout(timerRef.current);
                                                                            setErrors({ ...errors });
                                                                            formData.auto_rounding_amount = !formData.auto_rounding_amount;
                                                                            setFormData({ ...formData });
                                                                            timerRef.current = setTimeout(() => { reCalculate(); }, 100);
                                                                        }}
                                                                    />
                                                                    <span className="text-[10px] text-primary-fixed block leading-none">{t("Auto")}</span>
                                                                </label>
                                                            </div>
                                                            <div className="flex flex-col items-end">
                                                                <input
                                                                    type="number"
                                                                    id="sales_rounding_amount"
                                                                    name="sales_rounding_amount"
                                                                    disabled={formData.auto_rounding_amount}
                                                                    onWheel={(e) => e.target.blur()}
                                                                    className="w-20 bg-white/10 border border-white/20 rounded px-1.5 py-0.5 text-right text-body-md text-inverse-on-surface focus:outline-none focus:border-primary-fixed disabled:opacity-40"
                                                                    value={roundingAmount}
                                                                    onChange={(e) => {
                                                                        if (timerRef.current) clearTimeout(timerRef.current);
                                                                        delete errors["rounding_amount"]; setErrors({ ...errors });
                                                                        if (!e.target.value) {
                                                                            roundingAmount = ""; setRoundingAmount(roundingAmount);
                                                                            timerRef.current = setTimeout(() => { reCalculate(); }, 100);
                                                                            return;
                                                                        }
                                                                        if (/^-?\d*\.?\d{0,2}$/.test(parseFloat(e.target.value)) === false) {
                                                                            roundingAmount = parseFloat(e.target.value);
                                                                            errors["rounding_amount"] = t("Max. decimal points allowed is 2"); setErrors({ ...errors });
                                                                            return;
                                                                        }
                                                                        roundingAmount = parseFloat(e.target.value); setRoundingAmount(roundingAmount);
                                                                        timerRef.current = setTimeout(() => { reCalculate(); }, 100);
                                                                    }}
                                                                    onKeyDown={(e) => {
                                                                        if (timerRef.current) clearTimeout(timerRef.current);
                                                                        if (e.key === "Backspace") {
                                                                            delete errors["rounding_amount"]; setErrors({ ...errors });
                                                                            roundingAmount = ""; setRoundingAmount("");
                                                                            timerRef.current = setTimeout(() => { reCalculate(); }, 100);
                                                                        }
                                                                    }}
                                                                />
                                                                {errors.rounding_amount && (
                                                                    <div style={{ color: "red" }} className="text-[10px] mt-0.5">
                                                                        {errors.rounding_amount}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                    case 'net_total': return (
                                                        <React.Fragment key="net_total">
                                                            <hr className="border-white/10 my-xs" />
                                                            <div className="flex justify-between items-end pt-2">
                                                                <div>
                                                                    <span style={{ display: "block", fontSize: "11px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)", marginBottom: "4px", cursor: "help" }} title={`${t("Total Taxable Amount(without VAT)")} + ${t("VAT Price ( {{vatPercent}}% of Taxable Amount)", { vatPercent: formData.vat_percent })} ${roundingAmount > 0 ? "+ " + t("Rounding Amount") : "- " + t("Rounding Amount")} (${trimTo2Decimals(formData.total + shipping - discount)} + ${trimTo2Decimals(formData.vat_price)} ${roundingAmount > 0 ? "+ " : "- "}${trimTo2Decimals(roundingAmount)}) = ${trimTo2Decimals(formData.net_total)}`}>{t("Net Payable")}</span>
                                                                    <span className="font-data-mono" style={{ fontSize: "52px", fontWeight: 800, lineHeight: 1.05, color: "#ffffff", letterSpacing: "0.5px" }}>{trimTo2Decimals(formData.net_total)}</span>
                                                                </div>
                                                                <span style={{ fontSize: "15px", fontWeight: 600, color: "rgba(255,255,255,0.45)", marginBottom: "8px", letterSpacing: "0.05em" }}>SAR</span>
                                                            </div>
                                                        </React.Fragment>
                                                    );
                                                    default: return null;
                                                }
                                            })}
                                        </div>
                                    </div>

                                    {/* Payments Section (Scrollable Area) */}
                                    <div className="p-md flex-1 overflow-y-auto space-y-md pos-scroll">
                                        <div className="space-y-sm">
                                            <div className="flex justify-between items-center">
                                                <h3 className="font-label-md uppercase tracking-wider text-on-surface-variant m-0">{t("Payments")}</h3>
                                                <button type="button" className="text-[10px] bg-secondary hover:opacity-90 text-on-secondary px-2 py-1 rounded border-0 cursor-pointer" onClick={addNewPayment}>
                                                    {t("ADD")}
                                                </button>
                                            </div>

                                            {formData.payments_input &&
                                                formData.payments_input.filter(payment => !payment.deleted).map((payment, key) => (
                                                    <div key={key} className="bg-surface-container-lowest border border-outline-variant/30 rounded p-sm space-y-2">
                                                        <div className="grid grid-cols-2 gap-2">
                                                            {/* Payment Method */}
                                                            <div>
                                                                <label className="block text-[10px] opacity-60 uppercase mb-0.5">{t("Method")}</label>
                                                                <select
                                                                    value={payment.method}
                                                                    className="w-full bg-transparent border-0 border-b border-outline-variant/50 focus:ring-0 focus:border-primary py-0.5 px-0 text-body-md"
                                                                    onChange={(e) => {
                                                                        delete errors["payment_method_" + key];
                                                                        setErrors({ ...errors });
                                                                        if (!e.target.value) {
                                                                            errors["payment_method_" + key] = t("Payment method is required");
                                                                            setErrors({ ...errors });
                                                                            formData.payments_input[key].method = "";
                                                                            setFormData({ ...formData });
                                                                            return;
                                                                        }
                                                                        formData.payments_input[key].method = e.target.value;
                                                                        setFormData({ ...formData });
                                                                    }}
                                                                >
                                                                    <option value="">{t("Select")}</option>
                                                                    <option value="cash">{t("Cash")}</option>
                                                                    <option value="debit_card">{t("Debit Card")}</option>
                                                                    <option value="credit_card">{t("Credit Card")}</option>
                                                                    <option value="bank_card">{t("Bank Card")}</option>
                                                                    <option value="bank_transfer">{t("Bank Transfer")}</option>
                                                                    <option value="bank_cheque">{t("Bank Cheque")}</option>
                                                                    <option value="sales_return">{t("Sales Return")}</option>
                                                                    <option value="purchase">{t("Purchase")}</option>
                                                                </select>
                                                                {errors["payment_method_" + key] && (
                                                                    <div style={{ color: "red" }} className="text-[10px] mt-0.5">
                                                                        {t(errors["payment_method_" + key])}
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Amount */}
                                                            <div>
                                                                <label className="block text-[10px] opacity-60 uppercase mb-0.5 text-right">{t("Amount")}</label>
                                                                <input
                                                                    type='number'
                                                                    value={payment.amount}
                                                                    className="w-full bg-transparent border-0 border-b border-outline-variant/50 focus:ring-0 focus:border-primary text-right py-0.5 px-0 text-body-md font-semibold"
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
                                                                    }}
                                                                />
                                                                {errors["payment_amount_" + key] && (
                                                                    <div style={{ color: "red" }} className="text-[10px] mt-0.5 text-right">
                                                                        {t(errors["payment_amount_" + key])}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Date Picker */}
                                                        <div>
                                                            <label className="block text-[10px] opacity-60 uppercase mb-0.5">{t("Payment Date")}</label>
                                                            <DatePicker
                                                                selected={payment.date_str ? new Date(payment.date_str) : null}
                                                                value={payment.date_str ? format(
                                                                    new Date(payment.date_str),
                                                                    "MMMM d, yyyy h:mm aa",
                                                                    { locale: dateLocale }
                                                                ) : null}
                                                                className="w-full bg-transparent border-0 border-b border-outline-variant/50 focus:ring-0 focus:border-primary py-0.5 px-0 text-body-md"
                                                                dateFormat="MMMM d, yyyy h:mm aa"
                                                                locale={dateLocale}
                                                                showTimeSelect
                                                                timeIntervals="1"
                                                                onChange={(value) => {
                                                                    formData.payments_input[key].date_str = value;
                                                                    setFormData({ ...formData });
                                                                }}
                                                            />
                                                            {errors["payment_date_" + key] && (
                                                                <div style={{ color: "red" }} className="text-[10px] mt-0.5">
                                                                    {t(errors["payment_date_" + key])}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Reference No / Link & Delete button */}
                                                        <div className="flex justify-between items-center pt-1">
                                                            {payment.reference_code ? (
                                                                <span
                                                                    className="text-[11px] text-primary hover:underline cursor-pointer font-data-mono"
                                                                    onClick={() => openReferenceUpdateForm(payment.reference_id, payment.reference_type)}
                                                                >
                                                                    {payment.reference_code}
                                                                </span>
                                                            ) : (
                                                                <span className="text-[10px] opacity-40 italic">{t("No Reference")}</span>
                                                            )}

                                                            <button type="button" className="text-[11px] text-error hover:underline bg-transparent border-0 cursor-pointer font-semibold" onClick={() => removePayment(key)}>
                                                                {t("Remove")}
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))
                                            }
                                        </div>

                                        {/* Dynamic Balancing Status & Rounding summary */}
                                        <div className="p-sm bg-surface-dim/30 rounded border border-outline-variant/20 space-y-1">
                                            <div className="flex justify-between text-body-md font-semibold">
                                                <span>{t("Total Payments")}</span>
                                                <span className="font-data-mono">{trimTo2Decimals(totalPaymentAmount)}</span>
                                            </div>
                                            <div className="flex justify-between text-body-md font-semibold">
                                                <span>{t("Balance Due")}</span>
                                                <span className={`font-data-mono font-bold ${balanceAmount > 0 ? "text-error" : "text-success"}`}>{trimTo2Decimals(balanceAmount)}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-label-sm pt-1 border-t border-outline-variant/20 mt-1">
                                                <span>{t("Payment Status")}</span>
                                                {paymentStatus === "paid" ? (
                                                    <span className="text-[10px] text-success bg-success/10 px-2 rounded-full font-bold">
                                                        {t("Paid")}
                                                    </span>
                                                ) : paymentStatus === "paid_partially" ? (
                                                    <span className="text-[10px] text-warning bg-warning/10 px-2 rounded-full font-bold">
                                                        {t("Paid Partially")}
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] text-error bg-error/10 px-2 rounded-full font-bold">
                                                        {t("Not Paid")}
                                                    </span>
                                                )}
                                            </div>
                                            {errors.total_payment && (
                                                <div style={{ color: "red" }} className="text-[10px] mt-1 text-center">
                                                    {t(errors.total_payment)}
                                                </div>
                                            )}
                                            {errors.customer_credit_limit && (
                                                <div style={{ color: "red" }} className="text-[10px] mt-1 text-center">
                                                    {t(errors.customer_credit_limit)}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Fixed Bottom Action Buttons */}
                                    <div className="p-md grid grid-cols-2 gap-sm bg-surface-container border-t border-outline-variant">
                                        <Button
                                            variant="secondary"
                                            className="bg-surface-container-highest border border-outline-variant text-on-surface-variant py-2 rounded font-bold text-sm hover:bg-surface-variant transition-colors flex items-center justify-center gap-1 border-0 cursor-pointer"
                                            onClick={handleClose}
                                        >
                                            <i className="bi bi-x-circle text-[16px]"></i> {t("Discard")}
                                        </Button>
                                        <Button
                                            variant="primary"
                                            className="bg-primary text-on-primary py-2 rounded font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-1 border-0 cursor-pointer"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                handleCreate(e);
                                            }}
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting ? (
                                                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden={true} className="mr-1" />
                                            ) : (
                                                <i className="bi bi-check-circle text-[16px]"></i>
                                            )}
                                            {" "}
                                            {isUpdateForm ? t("Update") : t("Create")}
                                        </Button>
                                    </div>
                                </aside>
                            </form>
                        )
                    }
                </Modal.Body >
            </Modal >


        </>
    );
});

export default OrderCreate;
