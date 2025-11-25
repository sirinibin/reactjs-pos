import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback, useMemo } from "react";
import StockTransferPreview from "./../order/preview.js";
import { Modal, Button, Alert } from "react-bootstrap";
import ProductHistory from "../product/product_history.js";
import ProductCreate from "../product/create.js";
import UserCreate from "../user/create.js";
import { Typeahead, Menu, MenuItem } from "react-bootstrap-typeahead";
import NumberFormat from "react-number-format";
import DatePicker from "react-datepicker";
import { format } from "date-fns";
import StockTransferView from "./view.js";
import "./../order/style.css";
//import BarcodeScannerComponent from "react-qr-barcode-scanner";
//import Quagga from 'quagga';
import ProductView from "../product/view.js";
import { Spinner } from "react-bootstrap";
//import debounce from 'lodash.debounce';
import ResizableTableCell from '../utils/ResizableTableCell.js';
import { Dropdown } from 'react-bootstrap';
import SalesHistory from "../product/sales_history.js";
import SalesReturnHistory from "../product/sales_return_history.js";
import PurchaseHistory from "../product/purchase_history.js";
import PurchaseReturnHistory from "../product/purchase_return_history.js";
import QuotationHistory from "../product/quotation_history.js";
import QuotationSalesReturnHistory from "../product/quotation_sales_return_history.js";
import DeliveryNoteHistory from "../product/delivery_note_history.js";
import Products from "../utils/products.js";
import Quotations from "../utils/quotations.js";
import Quotation from "../quotation/create.js";
import DeliveryNote from "../delivery_note/create.js";
import DeliveryNotes from "../utils/delivery_notes.js";
import Amount from "../utils/amount.js";
import { trimTo2Decimals } from "../utils/numberUtils.js";
import { trimTo8Decimals } from "../utils/numberUtils.js";
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import ImageViewerModal from '../utils/ImageViewerModal.js';
import * as bootstrap from 'bootstrap';
//import OverflowTooltip from "../utils/OverflowTooltip.js";
import { highlightWords } from "../utils/search.js";
import StockTransferPrint from './../order/print.js';
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { DebounceInput } from 'react-debounce-input';


const columnStyle = {
    width: '20%',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    paddingRight: '8px',
    border: "solid 0px"
};

const StockTransferCreate = forwardRef((props, ref) => {
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
            formData.from_warehouse_code = "";
            formData.from_warehouse_id = "";
            formData.to_warehouse_code = "";
            formData.to_warehouse_id = "";
            formData.code = "";

            formData.remarks = ""
            formData.rounding_amount = 0.00;

            formData.auto_rounding_amount = true;
            formData.net_total = 0.00;
            formData.date_str = new Date();

            ResetForm();

            if (id) {
                getStockTransfer(id);
            }

            setFormData({ ...formData });
            reCalculate();
            setShow(true);
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
            getStockTransfer(id);
        }

        setFormData({ ...formData });
        reCalculate();
        setShow(true);

    }

    let [isUpdateForm, setIsUpdateForm] = useState(false);

    function ResetForm() {
        roundingAmount = 0.00;
        setRoundingAmount(roundingAmount);
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
                setFormData({ ...formData });
            })
            .catch(error => {

            });
    }


    async function getStockTransfer(id) {
        console.log("inside get StockTransfer");
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

        await fetch('/v1/stock-transfer/' + id + "?" + queryParams, requestOptions)
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


                selectedProducts.forEach((product, index) => {
                    CalCulateLineTotals(index);
                });


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


    function formatLoadedStockTransfer(data) {
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

        reCalculate();
        setFormData({ ...formData });


        checkWarnings();
        checkErrors();
    }


    async function getPreviousStockTransfer(id) {
        console.log("inside get StockTransfer");
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

        await fetch('/v1/previous-stock-transfer/' + id + "?" + queryParams, requestOptions)
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

    async function getNextStockTransfer(id) {
        console.log("inside get StockTransfer");
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

        await fetch('/v1/next-stock-transfer/' + id + "?" + queryParams, requestOptions)
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

    async function getLastStockTransfer() {
        console.log("inside get StockTransfer");
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

        await fetch("/v1/last-stock-transfer?" + queryParams, requestOptions)
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
                console.log("Enter key was pressed. Run your function-stocktransfer.123");
                // event.preventDefault();



                var form = event.target.form;
                if (form && event.target) {
                    var index = Array.prototype.indexOf.call(form, event.target);
                    console.log("form.elements:", form.elements);
                    if (form && form.elements[index + 1]) {
                        //
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
        date_str: new Date(),
        signature_date_str: format(new Date(), "MMM dd yyyy"),
        store_id: "",
        products: [],
    });


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
            // history.push("/dashboard/stocktransfers");
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

    let [openProductSearchResult, setOpenProductSearchResult] = useState(false);

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
            "/v1/product?" + Select + queryString + "&limit=200&page=2&sort=country_name"
        ];

        const [result1, result2] = await Promise.all([
            fetch(urls[0], requestOptions),
            fetch(urls[1], requestOptions)
        ]);

        const data1 = await result1.json();
        const data2 = await result2.json();

        // Only update if this is the latest request
        if (latestRequestRef.current !== requestId) return;

        // Combine results from both pages
        let products = [
            ...(data1.result || []),
            ...(data2.result || [])
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

            const words = searchTerm.toLowerCase().split(" ").filter(Boolean);
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
            errors["bar_code"] = "Invalid Barcode:" + formData.barcode
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

            if (store?.settings?.block_stocktransfer_when_purchase_price_is_higher) {
                if (selectedProducts[i].purchase_unit_price > selectedProducts[i].unit_price) {
                    errors["purchase_unit_price_" + i] = "Purchase unit price is greater than Unit Price(without VAT)";
                    errors["unit_price_" + i] = "Unit price is less  than Purchase Unit Price(without VAT)";
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
            errors["products"] = "No products added";
            setErrors({ ...errors });
            haveErrors = true;
        }


        if (haveErrors) {
            console.log("Errors: ", errors);
            return;
        }


        formData.vat_percent = parseFloat(formData.vat_percent);
        formData.net_total = parseFloat(formData.net_total);

        if (localStorage.getItem('store_id')) {
            formData.store_id = localStorage.getItem('store_id');
        }


        let endPoint = "/v1/stock-transfer";
        let method = "POST";
        if (isUpdateForm) {
            endPoint = "/v1/stock-transfer/" + formData.id;
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
                    setToastMessage(`Updated Successfully✅`);
                    setShowToast(true);
                    if (props.showToastMessage) {
                        if (props.showToastMessage) props.showToastMessage("StockTransfer updated successfully!", "success");
                    }
                } else {
                    setToastMessage(`Created Successfully✅`);
                    setShowToast(true);
                    if (props.showToastMessage) {
                        if (props.showToastMessage) props.showToastMessage("StockTransfer created successfully!", "success");
                    }
                }

                setTimeout(() => {
                    setToastMessage(`Preparing Print Preview...`);
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


                formatLoadedStockTransfer(data);
                //  reCalculate();

                //openDetailsView(data.result.id);
            })
            .catch((error) => {
                setIsSubmitting(false);
                console.log("Inside catch");
                console.log(error);
                setErrors({ ...error });
                console.error("There was an error!", error);
                if (props.showToastMessage) {
                    if (props.showToastMessage) props.showToastMessage("Failed to process stocktransfer!", "danger");
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


        if (store?.settings?.block_stocktransfer_when_purchase_price_is_higher) {
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
        let product = await getProduct(selectedProducts[i].product_id, `id,product_stores.${localStorage.getItem("store_id")}.stock,product_stores.${localStorage.getItem("store_id")}.warehouse_stocks,store_id`);
        let stock = 0;

        if (!product) {
            return;
        }

        if (product.product_stores && product.product_stores[localStorage.getItem("store_id")]?.stock) {
            stock = product.product_stores[localStorage.getItem("store_id")].stock;
            selectedProducts[i].stock = stock;
            selectedProducts[i].warehouse_stocks = product.product_stores[localStorage.getItem("store_id")]?.warehouse_stocks ? product.product_stores[localStorage.getItem("store_id")]?.warehouse_stocks : { "main_store": stock };

            setSelectedProducts([...selectedProducts]);
        }



        let fromWarehouseCode = formData.from_warehouse_code ? formData.from_warehouse_code : "main_store";
        let toWarehouseCode = formData.to_warehouse_code ? formData.to_warehouse_code : "main_store";

        if (!selectedProducts[i].warehouse_stocks) {
            selectedProducts[i].warehouse_stocks = { [fromWarehouseCode]: 0, [toWarehouseCode]: 0 };
        }

        if (!selectedProducts[i].warehouse_stocks[fromWarehouseCode]) {
            selectedProducts[i].warehouse_stocks[fromWarehouseCode] = 0;
        }
        if (!formData.id && selectedProducts[i].warehouse_stocks[fromWarehouseCode] < selectedProducts[i].quantity) {
            warnings["quantity_" + i] = "Warning: Available stock in " + fromWarehouseCode + " is " + (selectedProducts[i].warehouse_stocks[fromWarehouseCode]);
            /*
           if (formData.id) {
               warnings["quantity_" + i] = "Warning: Available stock is " + (stock + oldQty);
           } else {
               warnings["quantity_" + i] = "Warning: Available stock is " + (stock);
           }*/
        } else {
            delete warnings["quantity_" + i];
        }


        /*
        let oldQty = 0;
        for (let j = 0; j < oldProducts?.length; j++) {
            if (oldProducts[j]?.product_id === selectedProducts[i]?.product_id) {
                if (formData.id) {
                    oldQty = oldProducts[j].quantity;
                    //  alert("ok")

                    if (!selectedProducts[i].stock) {
                        selectedProducts[i].stock = 0;
                    }
                    // selectedProducts[i].stock += oldQty;
                    selectedProducts[i].oldQty = oldQty;

                    let fromStoreCode = formData.from_warehouse_code ? formData.from_warehouse_code : "main_store";
                    let toStoreCode = formData.to_warehouse_code ? formData.to_warehouse_code : "main_store";

                    if (!selectedProducts[i].warehouse_stocks) {
                        selectedProducts[i].warehouse_stocks = { [fromStoreCode]: 0, [toStoreCode]: 0 };
                    }

                    //selectedProducts[i].warehouse_stocks[fromStoreCode] += oldQty;
                    // selectedProducts[i].warehouse_stocks[fromStoreCode]["oldQty"] = oldQty;
                    //selectedProducts[i].warehouse_stocks[toStoreCode]["oldQty"] = oldQty;
                    // selectedProducts[i].warehouse_stocks[toStoreCode] -= oldQty;


                    /*
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
                        */

        /*
        
                            setSelectedProducts([...selectedProducts]);
                        }
                        break;
                    }
                }*/

        /*
if (!selectedProducts[i].warehouse_stocks) {
let fromStoreCode = formData.from_warehouse_code ? formData.from_warehouse_code : "main_store";
selectedProducts[i].warehouse_stocks = { [fromStoreCode]: 0 };
}
*/

        /*
        
                if ((selectedProducts[i].warehouse_stocks[formData.from_warehouse_code] + selectedProducts[i].warehouse_stocks[formData.from_warehouse_code]["oldQty"]) < selectedProducts[i].quantity) {
                    warnings["quantity_" + i] = "Warning: Available stock in " + (formData.from_warehouse_code ? formData.from_warehouse_code : "Main Store") + " is " + (selectedProducts[i].warehouse_stocks[formData.from_warehouse_code]);
                } else {
                    delete warnings["quantity_" + i];
                }*/

        /*
        if (product.product_stores && (stock + oldQty) < selectedProducts[i].quantity) {
            if (formData.id) {
                warnings["quantity_" + i] = "Warning: Available stock is " + (stock + oldQty);
            } else {
                warnings["quantity_" + i] = "Warning: Available stock is " + (stock);
            }
        } else {
            delete warnings["quantity_" + i];
        }*/
        setWarnings({ ...warnings });
    }




    async function getProduct(id, selectStr) {
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

        timerRef.current = setTimeout(() => {
            let index = getProductIndex(product.product_id);

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
        if (timerRef.current) clearTimeout(timerRef.current);

        timerRef.current = setTimeout(() => {
            index = getProductIndex(product.id);
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
            errors["product_" + index] = "This product cannot be removed as it is returned, Note: Please remove the product from stocktransfer return and try again"
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
    let [commission, setCommission] = useState("");
    let [roundingAmount, setRoundingAmount] = useState(0.00);
    let [shipping, setShipping] = useState(0.00);
    let [discount, setDiscount] = useState(0.00);
    let [discountPercent, setDiscountPercent] = useState(0.00);

    let [discountWithVAT, setDiscountWithVAT] = useState(0.00);
    let [discountPercentWithVAT, setDiscountPercentWithVAT] = useState(0.00);



    async function reCalculate(productIndex) {
        console.log("inside reCalculate");

        formData.products = [];
        for (var i = 0; i < selectedProducts.length; i++) {

            let unitPrice = parseFloat(selectedProducts[i].unit_price);
            console.log("unitPrice:", unitPrice);
            console.log("selectedProducts[i].unit_price_with_vat:", selectedProducts[i].unit_price_with_vat);


            let unitPriceWithVAT = parseFloat(selectedProducts[i].unit_price_with_vat);




            let unitDiscount = 0.00;

            if (selectedProducts[i].unit_discount) {
                unitDiscount = parseFloat(selectedProducts[i].unit_discount)
            }

            let unitDiscountWithVAT = 0.00;

            if (selectedProducts[i].unit_discount_with_vat) {
                unitDiscountWithVAT = parseFloat(selectedProducts[i].unit_discount_with_vat)
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
                "/v1/stock-transfer/calculate-net-total",
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


                for (let i = 0; i < selectedProducts?.length; i++) {

                    for (let j = 0; j < res.result?.products?.length; j++) {
                        if (res.result?.products[j].product_id === selectedProducts[i].product_id) {
                            console.log("Discounts updated from server")
                        }
                    }
                }
                setSelectedProducts([...selectedProducts]);

                setFormData({ ...formData });
            }

            setFormData({ ...formData });

        } catch (err) {
            console.error("Failed to parse response:", err);
        }
    }

    const DetailsViewRef = useRef();

    const ProductCreateFormRef = useRef();
    function openProductCreateForm() {
        ProductCreateFormRef.current.open();
    }


    const UserCreateFormRef = useRef();




    //Import products from quotations
    const QuotationsRef = useRef();
    function openQuotations() {
        QuotationsRef.current.open(true, []);
    }


    const QuotationRef = useRef();
    const handleSelectedQuotation = (selectedQuotation) => {
        console.log("Selected Quotation:", selectedQuotation);
        // formData.customer_id = selectedQuotation.customer_id;

        QuotationRef.current.open(selectedQuotation.id, "product_selection");
        //ProductsRef.current.open(selectedQuotation, "quotation_products");
    };


    //Import products from delivery notes
    const DeliveryNotesRef = useRef();
    function openDeliveryNotes(model) {
        DeliveryNotesRef.current.open(true, []);
    }

    const DeliveryNoteRef = useRef();
    const handleSelectedDeliveryNote = (selectedDeliveryNote) => {
        console.log("Selected DeliveryNots:", selectedDeliveryNote);
        DeliveryNoteRef.current.open(selectedDeliveryNote.id, "product_selection");
    };



    const ProductsRef = useRef();
    function openLinkedProducts(model) {
        ProductsRef.current.open(true, "linked_products", model);
    }


    const SalesHistoryRef = useRef();
    function openSalesHistory(model) {
        SalesHistoryRef.current.open(model, []);
    }

    const SalesReturnHistoryRef = useRef();
    function openSalesReturnHistory(model) {
        SalesReturnHistoryRef.current.open(model, []);
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
        DeliveryNoteHistoryRef.current.open(model, []);
    }


    const QuotationHistoryRef = useRef();
    function openQuotationHistory(model) {
        QuotationHistoryRef.current.open(model, [], "quotation");
    }

    function openQuotationSalesHistory(model) {
        QuotationHistoryRef.current.open(model, [], "invoice");
    }

    const QuotationSalesReturnHistoryRef = useRef();
    function openQuotationSalesReturnHistory(model) {
        QuotationSalesReturnHistoryRef.current.open(model, []);
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
            stocktransferReturnHistory: "F9",
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
            stocktransferReturnHistory: "F9",
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


    const handleSelectedProductsFromProducts = (selected) => {
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
        if (selected?.length > 0) {
            setFormData({ ...formData });
        };
    };



    const handleSelectedProducts = async (selected, selectedCustomers, modelName, modelID, modelCode, remarks, model) => {
        console.log("Selected Products:", selected);
        let addedCount = 0;
        for (var i = 0; i < selected.length; i++) {
            if (modelName === "delivery_note") {
                // alert("ok")
                let p = await getProduct(selected[i].product_id);
                p.quantity = selected[i].quantity;
                addProduct(p);
                addedCount++;

            } else if (addProductFromQuotation(selected[i])) {
                addedCount++;
            }
        }


        setToastMessage(`${addedCount} product${addedCount !== 1 ? "s" : ""} added ✅`);
        setShowToast(true);


        if (remarks) {
            formData.remarks = remarks;
            setFormData({ ...formData });
        }


        setTimeout(() => setShowToast(false), 3000);

        if (modelName && modelID && modelCode) {
            if (modelName === "quotation") {
                formData.quotation_id = modelID;
                formData.quotation_code = modelCode;
            }
        }
        setFormData({ ...formData });
        // if(props.showToastMessage) props.showToastMessage("Successfully Added " + selected.length + " products", "success");
    };

    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState("");

    const PreviewRef = useRef();


    const productSearchRef = useRef();

    const timerRef = useRef(null);


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


    // const [filteredOptions, setFilteredOptions] = useState([]);

    //const normalize = (str) => (str || '').toString().toLowerCase();


    const onChangeTriggeredRef = useRef(false);

    const ProductHistoryRef = useRef();
    function openProductHistory(model) {
        ProductHistoryRef.current.open(model);
    }

    //Preview
    /*
    function sendWhatsAppMessage() {
        let model = formData;
        model.products = selectedProducts;
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

        setShowStockTransferPreview(true);
        if (timerRef.current) clearTimeout(timerRef.current);

        timerRef.current = setTimeout(() => {
            PreviewRef.current?.open(model, "whatsapp", "whatsapp_stocktransfer");
        }, 100);
    }*/


    const PrintRef = useRef();
    let [showStockTransferPrintPreview, setShowStockTransferPrintPreview] = useState(false);
    function openPrint() {
        setShowStockTransferPrintPreview(true);
        setShowPrintTypeSelection(false);
        if (timerRef.current) clearTimeout(timerRef.current);

        timerRef.current = setTimeout(() => {
            PrintRef.current.open(formData);
        }, 100);
    }


    let [showStockTransferPreview, setShowStockTransferPreview] = useState(false);
    let [showPrintTypeSelection, setShowPrintTypeSelection] = useState(false);

    const openPreview = useCallback(() => {
        setShowStockTransferPreview(true);
        setShowPrintTypeSelection(false);

        if (timerRef.current) clearTimeout(timerRef.current);

        timerRef.current = setTimeout(() => {
            //if (model.id === stocktransferID) {
            if (!isSubmitting && formData.id && formData.code && formData.date) {
                PreviewRef.current?.open(formData, undefined, "stocktransfer");
            }
            //  handleClose();
            //}

        }, 100);

    }, [formData, isSubmitting]);

    const openPrintTypeSelection = useCallback(() => {
        if (store.settings?.enable_invoice_print_type_selection) {
            // showPrintTypeSelection = true;
            setShowStockTransferPreview(true);
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
        getPreviousStockTransfer(formData.id);
    }

    async function openNextForm() {
        getNextStockTransfer(formData.id);
    }

    async function openLastForm() {
        getLastStockTransfer();
    }

    async function handlePrintClose() {
        openCreateForm();
    }

    //Product Search Settings
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
        localStorage.setItem("stocktransfer_product_search_settings", JSON.stringify(updated));
    };

    const onDragEnd = (result) => {
        if (!result.destination) return;
        const restocktransfered = Array.from(searchProductsColumns);
        const [moved] = restocktransfered.splice(result.source.index, 1);
        restocktransfered.splice(result.destination.index, 0, moved);
        setSearchProductsColumns(restocktransfered);
        localStorage.setItem("stocktransfer_product_search_settings", JSON.stringify(restocktransfered));
    };



    function RestoreDefaultSettings() {
        const clonedDefaults = defaultSearchProductsColumns.map(col => ({ ...col }));
        localStorage.setItem("stocktransfer_product_search_settings", JSON.stringify(clonedDefaults));
        setSearchProductsColumns(clonedDefaults);

        setShowSuccess(true);
        setSuccessMessage("Successfully restored to default settings!");
    }


    // Load settings from localStorage
    useEffect(() => {
        const clonedDefaults = defaultSearchProductsColumns.map(col => ({ ...col }));

        let saved = localStorage.getItem("stocktransfer_product_search_settings");
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

            localStorage.setItem("stocktransfer_product_search_settings", JSON.stringify(clonedDefaults));
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
        localStorage.setItem("stocktransfer_product_search_settings", JSON.stringify(searchProductsColumns));
    }, [searchProductsColumns]);*/

    const [showSuccess, setShowSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState(false);

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
            <Modal show={showSuccess} onHide={() => setShowSuccess(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Success</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Alert variant="success">
                        {successMessage}
                    </Alert>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowSuccess(false)}>
                        Close
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
                        Product Search Settings
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {/* Column Settings */}
                    {showProductSearchSettings && (
                        <>
                            <h6 className="mb-2">Customize Columns</h6>
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
                                                                        {col.label}
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
                        Close
                    </Button>
                    <Button
                        variant="primary"
                        onClick={() => {
                            RestoreDefaultSettings();
                            // Save to localStorage here if needed
                            //setShowSettings(false);
                        }}
                    >
                        Restore to Default
                    </Button>
                </Modal.Footer>
            </Modal>

            <ProductHistory ref={ProductHistoryRef} showToastMessage={props.showToastMessage} />
            {showStockTransferPrintPreview && <StockTransferPrint ref={PrintRef} onPrintClose={handlePrintClose} />}
            {showStockTransferPreview && <StockTransferPreview ref={PreviewRef} onPrintClose={handlePrintClose} />}
            <ImageViewerModal ref={imageViewerRef} images={productImages} />

            <Modal show={showPrintTypeSelection} onHide={() => {
                showPrintTypeSelection = false;
                setShowPrintTypeSelection(showPrintTypeSelection);
            }} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Select Print Type</Modal.Title>
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
                        <i className="bi bi-printer"></i> Print
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
                        <i className="bi bi-printer"></i> Print A4 Invoice
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

            <StockTransferView ref={DetailsViewRef} openCreateForm={props.openCreateForm} />
            <ProductView ref={ProductDetailsViewRef} />
            <ProductCreate ref={ProductCreateFormRef} showToastMessage={props.showToastMessage} />
            <UserCreate ref={UserCreateFormRef} showToastMessage={props.showToastMessage} />


            <Modal show={show} size="xl" fullscreen id="stocktransfer_create_form"
                onHide={handleClose} animation={false} backdrop="static" scrollable={true}>
                <Modal.Header>
                    <Modal.Title>
                        {isUpdateForm ? "Update Stock Transfer #" + formData.code : "Create New Stock Transfer"}

                    </Modal.Title>
                    <div className="col align-self-end text-end">

                        <Button
                            variant="primary"
                            className="btn btn-primary"
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
                            <i className="bi-chevron-double-left"></i> Previous
                        </Button>
                        &nbsp;&nbsp;
                        <Button
                            disabled={!isUpdateForm}
                            variant="primary"
                            className="btn btn-primary"
                            onClick={(e) => {
                                e.preventDefault();

                                openNextForm();
                            }}
                        >
                            Next  <i className="bi-chevron-double-right"></i>
                        </Button>
                        &nbsp;&nbsp;
                        <Button
                            disabled={!isUpdateForm}
                            variant="primary"
                            className="btn btn-primary"
                            onClick={(e) => {
                                e.preventDefault();

                                openCreateForm();
                            }}
                        >
                            <i className="bi bi-plus"></i>  Create New
                        </Button>
                        &nbsp;&nbsp;
                        <Button variant="secondary" disabled={!isUpdateForm} onClick={openPrint}>
                            <i className="bi bi-printer"></i> Print
                        </Button>
                        &nbsp;&nbsp;

                        <Button variant="primary" disabled={!isUpdateForm} onClick={openPreview}>
                            <i className="bi bi-printer"></i> Print A4 Invoice
                        </Button>
                        &nbsp;&nbsp;

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
                            {isUpdateForm && !isSubmitting ? "Update" : !isSubmitting ? "Create" : ""}

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

                    <div style={{
                        maxHeight: "50px",        // Adjust based on design
                        minHeight: "50px",
                        overflowY: "scroll",
                    }}>
                        {isProcessing && (
                            <div

                                style={{
                                    display: "flex",
                                    justifyContent: "center",
                                    alignItems: "center",

                                }}

                            ><Spinner animation="grow" variant="primary" /></div>
                        )}
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
                    <form className="row g-3 needs-validation" onSubmit={e => { e.preventDefault(); handleCreate(e); }} >

                        <div className="col-md-2">
                            <label className="form-label">From Warehouse/Store</label>
                            <div className="input-group mb-2">
                                <select
                                    id={`from_warehouse_id`}
                                    name={`from_warehouse_id`}
                                    className="form-control"
                                    value={formData.from_warehouse_id || "main_store"}
                                    onChange={(e) => {
                                        const selectedValue = e.target.value;

                                        if (selectedValue === "main_store") {
                                            formData.from_warehouse_id = null;
                                            formData.from_warehouse_code = "";
                                        } else {
                                            const selectedWarehouse = warehouseList.find(w => w.id === selectedValue);
                                            if (selectedWarehouse) {
                                                formData.from_warehouse_id = selectedWarehouse.id;
                                                formData.from_warehouse_code = selectedWarehouse.code;
                                            }
                                        }

                                        setFormData({ ...formData });
                                        checkWarnings();
                                    }}
                                >
                                    <option value="main_store">Main Store</option>
                                    {warehouseList.map((warehouse) => (
                                        <option key={warehouse.id} value={warehouse.id}>
                                            {warehouse.name} ({warehouse.code})
                                        </option>
                                    ))}
                                </select>

                            </div>
                            {errors[`from_warehouse_id`] && (
                                <div style={{ color: "red" }}>
                                    {errors[`from_warehouse_id`]}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">To Warehouse/Store</label>
                            <div className="input-group mb-2">
                                <select
                                    id={`to_warehouse_id`}
                                    name={`to_warehouse_id`}
                                    className="form-control"
                                    value={formData.to_warehouse_id || "main_store"}
                                    onChange={(e) => {
                                        const selectedValue = e.target.value;

                                        if (selectedValue === "main_store") {
                                            formData.to_warehouse_id = null;
                                            formData.to_warehouse_code = "";
                                        } else {
                                            const selectedWarehouse = warehouseList.find(w => w.id === selectedValue);
                                            if (selectedWarehouse) {
                                                formData.to_warehouse_id = selectedWarehouse.id;
                                                formData.to_warehouse_code = selectedWarehouse.code;
                                            }
                                        }

                                        setFormData({ ...formData });
                                        checkWarnings();
                                    }}
                                >
                                    <option value="main_store">Main Store</option>
                                    {warehouseList.map((warehouse) => (
                                        <option key={warehouse.id} value={warehouse.id}>
                                            {warehouse.name} ({warehouse.code})
                                        </option>
                                    ))}
                                </select>

                            </div>
                            {errors[`to_warehouse_id`] && (
                                <div style={{ color: "red" }}>
                                    {errors[`to_warehouse_id`]}
                                </div>
                            )}
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
                                        {errors.date_str}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="col-md-3">
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
                        </div>

                        <div className="col-md-2">
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

                                        {errors.bar_code}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="col-md-10" >
                            <label className="form-label">Product Search*</label>
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
                                        inputRefs.current[(selectedProducts.length - 1)][`stocktransfer_product_quantity_${selectedProducts.length - 1}`]?.select();
                                    }, 100);
                                }}
                                options={productOptions}
                                placeholder="Part No. | Name | Name in Arabic | Brand | Country"
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
                                                            {col.key === "part_number" && <div style={{ width: getColumnWidth(col), border: "solid 0px", }}>Part Number</div>}
                                                            {col.key === "name" && <div style={{ width: getColumnWidth(col), border: "solid 0px", }}>Name</div>}
                                                            {col.key === "unit_price" && <div style={{ width: getColumnWidth(col), border: "solid 0px", }}>S.Unit Price</div>}
                                                            {col.key === "stock" && <div style={{ width: getColumnWidth(col), border: "solid 0px", }}>Stock</div>}
                                                            {col.key === "photos" && <div style={{ width: getColumnWidth(col), border: "solid 0px", }}>Photos</div>}
                                                            {col.key === "brand" && <div style={{ width: getColumnWidth(col), border: "solid 0px", }}>Brand</div>}
                                                            {col.key === "purchase_price" && <div style={{ width: getColumnWidth(col), border: "solid 0px", }}>P.Unit Price</div>}
                                                            {col.key === "country" && <div style={{ width: getColumnWidth(col), border: "solid 0px", }}>Country</div>}
                                                            {col.key === "rack" && <div style={{ width: getColumnWidth(col), border: "solid 0px", }}>Rack</div>}
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
                                                                                const warehouseDetails = Object.entries(warehouseStocks)
                                                                                    .map(([key, value]) => {
                                                                                        // Format warehouse name (capitalize and replace underscores)
                                                                                        let name = key === "main_store" ? "MS" : key.replace(/^w/, "W").toUpperCase();
                                                                                        return `${name}:${value}`;
                                                                                    })
                                                                                    .join(", ");

                                                                                // Final display string
                                                                                return (
                                                                                    <span>
                                                                                        {totalStock}
                                                                                        {warehouseDetails ? ` (${warehouseDetails})` : ""}
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

                            <Button hide={true.toString()} onClick={openProductCreateForm} className="btn btn-outline-secondary btn-primary btn-sm" type="button" id="button-addon1"> <i className="bi bi-plus-lg"></i> New</Button>
                            {errors.product_id ? (
                                <div style={{ color: "red" }}>

                                    {errors.product_id}
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
                                        <i className="bi bi-download"></i>    Import
                                    </Dropdown.Toggle>
                                    <Dropdown.Menu >
                                        <Dropdown.Item onClick={() => {
                                            openQuotations();
                                        }}>
                                            <i className="bi bi-file-earmark-text"></i>
                                            &nbsp;
                                            From Quotations
                                        </Dropdown.Item>

                                        <Dropdown.Item onClick={() => {
                                            openDeliveryNotes();
                                        }}>
                                            <i className="bi bi-file-earmark-text"></i>
                                            &nbsp;
                                            From Delivery Notes
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



                        <div className="table-responsive" style={{ overflowX: "auto", maxHeight: "400px", overflowY: "scroll" }}>


                            <table className="table table-striped table-sm table-bordered">
                                <thead>
                                    <tr className="text-center">
                                        <th ></th>
                                        <th >SI No.</th>
                                        <th>Part No.</th>
                                        <th style={{ minWidth: "250px" }}>Name</th>
                                        <th>Info</th>
                                        <th>Purchase Unit Price(without VAT)</th>
                                        <th>Stock</th>
                                        <th style={{ minWidth: "80px", maxWidth: "80px" }}>Qty</th>
                                        <th>Unit Price(without VAT)</th>
                                        <th>Unit Price(with VAT)</th>
                                        <th>Unit Disc.(without VAT)</th>
                                        <th>Unit Disc.(with VAT)</th>
                                        {/*  <th>Unit Disc. %(without VAT)</th>*/}
                                        <th>Unit Disc. %(with VAT)</th>
                                        <th>Price(without VAT)</th>
                                        <th>Price(with VAT)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedProducts.map((product, index) => (
                                        <tr className="text-center fixed-row " key={index}>
                                            <td style={{ verticalAlign: 'middle', padding: '0.25rem' }} >
                                                <div
                                                    style={{ color: "red", cursor: "pointer" }}
                                                    onClick={() => {
                                                        removeProduct(product);
                                                    }}
                                                >
                                                    <i className="bi bi-trash"> </i>
                                                </div>
                                            </td>
                                            <td style={{ verticalAlign: 'middle', padding: '0.25rem' }}>{index + 1}</td>
                                            {/*<td style={{ verticalAlign: 'middle', padding: '0.25rem', width: "auto", whiteSpace: "nowrap" }}>
                                                <OverflowTooltip maxWidth={120} value={product.prefix_part_number ? product.prefix_part_number + " - " + product.part_number : product.part_number} />
                                            </td>*/}
                                            <ResizableTableCell style={{ verticalAlign: 'middle', padding: '0.25rem' }}
                                            >
                                                <input type="text" id={`${"stocktransfer_product_part_number" + index}`}
                                                    name={`${"stocktransfer_product_part_number" + index}`}
                                                    onWheel={(e) => e.target.blur()}

                                                    value={selectedProducts[index].part_number}
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
                                                    <input type="text" id={`${"stocktransfer_product_name" + index}`}
                                                        name={`${"stocktransfer_product_name" + index}`}
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
                                                        id={`stocktransfer_product_purchase_unit_price_${index}`}
                                                        name={`stocktransfer_product_purchase_unit_price_${index}`}
                                                        className={`form-control text-end ${errors["purchase_unit_price_" + index] ? 'is-invalid' : ''} ${warnings["purchase_unit_price_" + index] ? 'border-warning text-warning' : ''}`}
                                                        onWheel={(e) => e.target.blur()}
                                                        value={product.purchase_unit_price}
                                                        placeholder="Purchase Unit Price"
                                                        disabled={true}
                                                        ref={(el) => {
                                                            if (!inputRefs.current[index]) inputRefs.current[index] = {};
                                                            inputRefs.current[index][`${"stocktransfer_product_purchase_unit_price_" + index}`] = el;
                                                        }}
                                                        onFocus={() => {
                                                            if (timerRef.current) clearTimeout(timerRef.current);
                                                            timerRef.current = setTimeout(() => {
                                                                inputRefs.current[index][`${"stocktransfer_product_purchase_unit_price_" + index}`]?.select();
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
                                                                        inputRefs.current[(index + 1)][`${"stocktransfer_unit_discount_with_vat_" + (index + 1)}`]?.select();
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

                                            <td
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
                                                                const stocktransferedEntries = [];
                                                                if (warehouseStocks.hasOwnProperty("main_store")) {
                                                                    stocktransferedEntries.push(["main_store", warehouseStocks["main_store"]]);
                                                                }
                                                                Object.entries(warehouseStocks).forEach(([key, value]) => {
                                                                    if (key !== "main_store") {
                                                                        stocktransferedEntries.push([key, value]);
                                                                    }
                                                                });
                                                                const details = stocktransferedEntries
                                                                    .map(([key, value]) => {
                                                                        let name = key === "main_store" ? "Main Store" : key.replace(/^wh/, "WH").toUpperCase();
                                                                        return `${name}: ${value}`;
                                                                    })
                                                                    .join(", ");
                                                                return details ? `(${details})` : "(Main Store: " + selectedProducts[index].stock + ")";
                                                            })()}
                                                        </Tooltip>
                                                    }
                                                >
                                                    <span style={{ cursor: "pointer", textDecoration: "underline dotted" }}>
                                                        {selectedProducts[index].stock}
                                                    </span>
                                                </OverlayTrigger>
                                            </td>

                                            <td style={{
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
                                                            id={`${"stocktransfer_product_quantity_" + index}`}
                                                            name={`${"stocktransfer_product_quantity" + index}`}
                                                            className={`form-control text-end ${errors["quantity_" + index] ? 'is-invalid' : warnings["quantity_" + index] ? 'border-warning text-warning' : ''}`}
                                                            onWheel={(e) => e.target.blur()}
                                                            value={product.quantity}
                                                            placeholder="Quantity"
                                                            ref={(el) => {
                                                                if (!inputRefs.current[index]) inputRefs.current[index] = {};
                                                                inputRefs.current[index][`${"stocktransfer_product_quantity_" + index}`] = el;
                                                            }}
                                                            onFocus={() => {
                                                                if (timerRef.current) clearTimeout(timerRef.current);
                                                                timerRef.current = setTimeout(() => {
                                                                    inputRefs.current[index][`${"stocktransfer_product_quantity_" + index}`]?.select();
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
                                                                        checkWarnings(index);
                                                                        checkErrors(index);
                                                                        reCalculate(index);
                                                                    }, 100);
                                                                } else if (e.key === "ArrowLeft") {
                                                                    timerRef.current = setTimeout(() => {
                                                                        inputRefs.current[index][`${"stocktransfer_product_purchase_unit_price_" + index}`]?.select();
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
                                                                        checkWarnings(index);
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
                                                                        checkWarnings(index);
                                                                        reCalculate(index);
                                                                    }, 100);
                                                                    return;
                                                                }


                                                                product.quantity = parseFloat(e.target.value);
                                                                selectedProducts[index].quantity = parseFloat(e.target.value);
                                                                timerRef.current = setTimeout(() => {
                                                                    CalCulateLineTotals(index);
                                                                    checkErrors(index);
                                                                    checkWarnings(index);
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

                                            <td style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                                                    <div className="input-group flex-nowrap" style={{ flex: '1 1 auto', minWidth: 0 }}>
                                                        <input type="number"
                                                            id={`${"stocktransfer_product_unit_price_" + index}`}
                                                            name={`${"stocktransfer_product_unit_price_" + index}`}
                                                            onWheel={(e) => e.target.blur()}
                                                            value={selectedProducts[index].unit_price}
                                                            disabled={true}
                                                            className={`form-control text-end ${errors["unit_price_" + index] ? 'is-invalid' : ''} ${warnings["unit_price_" + index] ? 'border-warning text-warning' : ''}`}
                                                            placeholder="Unit Price(without VAT)"
                                                            ref={(el) => {
                                                                if (!inputRefs.current[index]) inputRefs.current[index] = {};
                                                                inputRefs.current[index][`${"stocktransfer_product_unit_price_" + index}`] = el;
                                                            }}

                                                            onFocus={() => {
                                                                if (timerRef.current) clearTimeout(timerRef.current);
                                                                timerRef.current = setTimeout(() => {
                                                                    inputRefs.current[index][`${"stocktransfer_product_unit_price_" + index}`]?.select();
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
                                                                        inputRefs.current[index][`${"stocktransfer_product_quantity_" + index}`]?.select();
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
                                                                    errors["unit_price_" + index] = "Max decimal points allowed is 8";
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
                                            </td>
                                            <td style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                                                    <div className="input-group flex-nowrap" style={{ flex: '1 1 auto', minWidth: 0 }}>
                                                        <input type="number"
                                                            id={`${"stocktransfer_product_unit_price_with_vat_" + index}`}
                                                            name={`${"stocktransfer_product_unit_price_with_vat_" + index}`}
                                                            onWheel={(e) => e.target.blur()}
                                                            value={selectedProducts[index].unit_price_with_vat}
                                                            className={`form-control text-end ${errors["unit_price_with_vat_" + index] ? 'is-invalid' : ''} ${warnings["unit_price_with_vat_" + index] ? 'border-warning text-warning' : ''}`}
                                                            ref={(el) => {
                                                                if (!inputRefs.current[index]) inputRefs.current[index] = {};
                                                                inputRefs.current[index][`${"stocktransfer_product_unit_price_with_vat_" + index}`] = el;
                                                            }}
                                                            placeholder="Unit Price(with VAT)"
                                                            disabled={true}
                                                            onFocus={() => {
                                                                if (timerRef.current) clearTimeout(timerRef.current);
                                                                timerRef.current = setTimeout(() => {
                                                                    inputRefs.current[index][`${"stocktransfer_product_unit_price_with_vat_" + index}`]?.select();
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
                                                                        inputRefs.current[index][`${"stocktransfer_product_unit_price_" + index}`]?.select();
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
                                            </td>
                                            <td style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                                                    <div className="input-group flex-nowrap" style={{ flex: '1 1 auto', minWidth: 0 }}>
                                                        <input type="number"
                                                            id={`${"stocktransfer_unit_discount_" + index}`}
                                                            name={`${"stocktransfer_unit_discount_" + index}`}
                                                            onWheel={(e) => e.target.blur()}
                                                            className={`form-control text-end ${errors["unit_discount_" + index] ? 'is-invalid' : ''} ${warnings["unit_discount_" + index] ? 'border-warning text-warning' : ''}`}
                                                            value={selectedProducts[index].unit_discount}
                                                            ref={(el) => {
                                                                if (!inputRefs.current[index]) inputRefs.current[index] = {};
                                                                inputRefs.current[index][`${"stocktransfer_unit_discount_" + index}`] = el;
                                                            }}
                                                            disabled={true}
                                                            onFocus={() => {
                                                                if (timerRef.current) clearTimeout(timerRef.current);
                                                                timerRef.current = setTimeout(() => {
                                                                    inputRefs.current[index][`${"stocktransfer_unit_discount_" + index}`]?.select();
                                                                }, 20);
                                                            }}
                                                            onKeyDown={(e) => {
                                                                RunKeyActions(e, product);

                                                                if (timerRef.current) clearTimeout(timerRef.current);
                                                                if (e.key === "ArrowLeft") {
                                                                    timerRef.current = setTimeout(() => {
                                                                        inputRefs.current[index][`${"stocktransfer_product_unit_price_with_vat_" + index}`]?.select();
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
                                            </td>
                                            {/*} ref={(el) => inputRefs.current[index] = el}
                                                        onFocus={() => inputRefs.current[index]?.select()}*/}
                                            <td style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                                                    <div className="input-group flex-nowrap" style={{ flex: '1 1 auto', minWidth: 0 }}>
                                                        <input type="number"
                                                            id={`${"stocktransfer_unit_discount_with_vat_" + index}`}
                                                            name={`${"stocktransfer_unit_discount_with_vat_" + index}`}
                                                            onWheel={(e) => e.target.blur()}
                                                            className={`form-control text-end ${errors["unit_discount_with_vat_" + index] ? 'is-invalid' : ''} ${warnings["unit_discount_with_vat_" + index] ? 'border-warning text-warning' : ''}`}
                                                            value={selectedProducts[index].unit_discount_with_vat}
                                                            ref={(el) => {
                                                                if (!inputRefs.current[index]) inputRefs.current[index] = {};
                                                                inputRefs.current[index][`${"stocktransfer_unit_discount_with_vat_" + index}`] = el;
                                                            }}
                                                            onFocus={() => {
                                                                if (timerRef.current) clearTimeout(timerRef.current);
                                                                timerRef.current = setTimeout(() => {
                                                                    inputRefs.current[index][`${"stocktransfer_unit_discount_with_vat_" + index}`]?.select();
                                                                }, 20);
                                                            }}
                                                            disabled={true}
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
                                                                                inputRefs.current[index - 1][`${"stocktransfer_product_quantity_" + (index - 1)}`]?.select();
                                                                            }, 100);
                                                                        }

                                                                    }
                                                                } else if (e.key === "ArrowLeft") {
                                                                    timerRef.current = setTimeout(() => {
                                                                        inputRefs.current[index][`${"stocktransfer_unit_discount_" + index}`]?.select();
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
                                            </td>
                                            {/*<td>
                                                <div className="input-group mb-3">
                                                    <input type="number" 
                                                    id={`${"stocktransfer_unit_discount_percent" + index}`}
                                                     disabled={false} name={`${"stocktransfer_unit_discount_percent" + index}`} 
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
                                            </td>*/}
                                            <td style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                                                    <div className="input-group flex-nowrap" style={{ flex: '1 1 auto', minWidth: 0 }}>
                                                        <input type="number"
                                                            id={`${"stocktransfer_unit_discount_percent_with_vat_" + index}`}
                                                            disabled={true}
                                                            name={`${"stocktransfer_unit_discount_percent_with_vat_" + index}`}
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
                                                            id={`${"stocktransfer_product_line_total_" + index}`}
                                                            name={`${"stocktransfer_product_line_total_" + index}`}
                                                            onWheel={(e) => e.target.blur()}
                                                            value={selectedProducts[index].line_total}
                                                            className={`form-control text-end ${errors["line_total_" + index] ? 'is-invalid' : ''} ${warnings["line_total_" + index] ? 'border-warning text-warning' : ''}`}
                                                            placeholder="Line total"
                                                            disabled={true}
                                                            ref={(el) => {
                                                                if (!inputRefs.current[index]) inputRefs.current[index] = {};
                                                                inputRefs.current[index][`${"stocktransfer_product_line_total_" + index}`] = el;
                                                            }}

                                                            onFocus={() => {
                                                                if (timerRef.current) clearTimeout(timerRef.current);
                                                                timerRef.current = setTimeout(() => {
                                                                    inputRefs.current[index][`${"stocktransfer_product_line_total_" + index}`]?.select();
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
                                                                        inputRefs.current[index][`${"stocktransfer_product_unit_discount_with_vat_" + index}`]?.select();
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
                                                            id={`${"stocktransfer_product_line_total_with_vat" + index}`}
                                                            name={`${"stocktransfer_product_line_total_with_vat" + index}`}
                                                            onWheel={(e) => e.target.blur()}
                                                            value={selectedProducts[index].line_total_with_vat}
                                                            className={`form-control text-end ${errors["line_total_with_vat" + index] ? 'is-invalid' : ''} ${warnings["line_total_with_vat" + index] ? 'border-warning text-warning' : ''}`}
                                                            placeholder="Line total with VAT"
                                                            disabled={true}
                                                            ref={(el) => {
                                                                if (!inputRefs.current[index]) inputRefs.current[index] = {};
                                                                inputRefs.current[index][`${"stocktransfer_product_line_total_with_vat" + index}`] = el;
                                                            }}

                                                            onFocus={() => {
                                                                if (timerRef.current) clearTimeout(timerRef.current);
                                                                timerRef.current = setTimeout(() => {
                                                                    inputRefs.current[index][`${"stocktransfer_product_line_total_with_vat" + index}`]?.select();
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
                                                                        inputRefs.current[index][`${"stocktransfer_product_line_total_" + index}`]?.select();
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
                        <div className="table-responsive">
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

                                        <th colSpan="8" className="text-end"> VAT  <input type="number" id="stocktransfer_vat_percent" name="stocktransfer_vat_percent" onWheel={(e) => e.target.blur()} disabled={true} className="text-center" style={{ width: "50px" }} value={formData.vat_percent} onChange={(e) => {
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
                                                id="stocktransfer_auto_rounding_amount"
                                                name="stocktransfer_auto_rounding_amount"
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
                                                id="stocktransfer_rounding_amount"
                                                name="stocktransfer_rounding_amount"
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


                        <Modal.Footer>
                            <Button variant="secondary" onClick={handleClose}>
                                Close
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
                                {isUpdateForm && !isSubmitting ? "Update" : !isSubmitting ? "Create" : ""}

                            </Button>
                        </Modal.Footer>
                    </form>
                </Modal.Body >

            </Modal >


        </>
    );
});

export default StockTransferCreate;
