import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback, useMemo } from "react";
import { Modal, Button } from "react-bootstrap";
import { Typeahead } from "react-bootstrap-typeahead";
import StoreCreate from "../store/create.js";
import VendorCreate from "../vendor/create.js";
import ProductCreate from "../product/create.js";
import UserCreate from "../user/create.js";
import SignatureCreate from "../signature/create.js";

import NumberFormat from "react-number-format";
import DatePicker from "react-datepicker";
import { format } from "date-fns";
import { Spinner } from "react-bootstrap";
import PurchaseReturnedView from "./view.js";
import ProductView from "../product/view.js";
import PurchaseView from "./../purchase/view.js";
import { trimTo2Decimals, trimTo8Decimals } from "../utils/numberUtils";
import Preview from "./../order/preview.js";

import { Dropdown } from 'react-bootstrap';
import SalesHistory from "../utils/product_sales_history.js";
import SalesReturnHistory from "./../utils/product_sales_return_history.js";
import PurchaseHistory from "./../utils/product_purchase_history.js";
import PurchaseReturnHistory from "./../utils/product_purchase_return_history.js";
import QuotationHistory from "./../utils/product_quotation_history.js";
import DeliveryNoteHistory from "./../utils/product_delivery_note_history.js";
import Products from "../utils/products.js";
import Amount from "../utils/amount.js";
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import ResizableTableCell from './../utils/ResizableTableCell';
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import ImageViewerModal from './../utils/ImageViewerModal';
//import ProductHistory from "./../product/product_history.js";
import ProductHistory from "../utils/product_history.js";
//import OverflowTooltip from "../utils/OverflowTooltip.js";
import * as bootstrap from 'bootstrap';
import VendorPending from "./../utils/vendor_pending.js";
import Vendors from "./../utils/vendors.js";

import VendorDepositCreate from "../customer_deposit/create.js";
import PurchaseUpdateForm from "../purchase/create.js";
import { useTranslation } from 'react-i18next';
import { getDateLocale } from "../i18n/dateLocales";

const PurchaseReturnedCreate = forwardRef((props, ref) => {
    const { t, i18n } = useTranslation('common');
    const dateLocale = useMemo(() => getDateLocale(i18n.language), [i18n.language]);
    function ResetForm() {
        cashDiscount = "";
        setCashDiscount(cashDiscount);

        roundingAmount = 0.00;
        setRoundingAmount(roundingAmount);

        shipping = 0.00;
        setShipping(shipping);

        discount = 0.00;
        setDiscount(discount);

        discountPercent = 0.00;
        setDiscountPercent(discountPercent);

        discountWithVAT = 0.00;
        setDiscountWithVAT(discountWithVAT);

        discountPercentWithVAT = 0.00;
        setDiscountPercentWithVAT(discountPercentWithVAT);

    }


    useImperativeHandle(ref, () => ({
        open(id, purchaseId) {
            errors = {};
            setErrors({ ...errors });
            selectedProducts = [];
            setSelectedProducts([]);

            selectedPurchaseReturnedByUsers = [];
            setSelectedPurchaseReturnedByUsers([]);
            purchase = {};
            setPurchase({ ...purchase });

            ResetForm();

            formData = {
                vat_percent: 15.0,
                discount: 0.0,
                discount_percent: 0.0,
                is_discount_percent: false,
                shipping_handling_fees: 0.00,
                date_str: new Date(),
                signature_date_str: format(new Date(), "MMM dd yyyy"),
                payment_status: "paid",
                rounding_amount: 0.00,
                auto_rounding_amount: true,
                payment_method: "",
                payments_input: [
                    {
                        "date_str": formData.date_str,
                        // "amount": "",
                        "amount": 0.00,
                        "method": "",
                        "deleted": false,
                    }
                ],
            };

            /*
            formData.payments_input = [
                {
                    "date_str": formData.date_str,
                    // "amount": "",
                    "amount": 0.00,
                    "method": "",
                    "deleted": false,
                }
            ];*/

            setFormData({ ...formData });

            if (localStorage.getItem("user_id")) {
                selectedPurchaseReturnedByUsers = [{
                    id: localStorage.getItem("user_id"),
                    name: localStorage.getItem("user_name"),
                }];
                formData.purchase_returned_by = localStorage.getItem("user_id");
                setFormData({ ...formData });
                setSelectedPurchaseReturnedByUsers([...selectedPurchaseReturnedByUsers]);
            }

            setFormData({ ...formData });


            if (id) {
                getPurchaseReturn(id);
            }

            if (purchaseId) {
                // reCalculate();
                getPurchase(purchaseId);
            }

            getStore(localStorage.getItem("store_id"));

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
                let storeData = data.result;
                if (storeData?.settings?.default_quotation_validity_days) {
                    formData.validity_days = storeData?.settings?.default_quotation_validity_days;
                }

                if (storeData?.settings?.default_quotation_delivery_days) {
                    formData.delivery_days = storeData?.settings?.default_quotation_delivery_days;
                }

                setFormData(formData);

                store = data.result;
                setStore(store);

            })
            .catch(error => {

            });
    }



    useEffect(() => {
        const listener = event => {
            if (event.code === "Enter" || event.code === "NumpadEnter") {
                console.log("Enter key was pressed. Run your function-purchase return.");
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


    //const history = useHistory();
    let [errors, setErrors] = useState({});
    const [isProcessing, setProcessing] = useState(false);


    //fields
    let [formData, setFormData] = useState({
        vat_percent: 10.0,
        discount: 0.0,
        discount_percent: 0.0,
        is_discount_percent: false,
        //   date_str: format(new Date(), "MMM dd yyyy"),
        date_str: new Date(),
        signature_date_str: format(new Date(), "MMM dd yyyy"),
        payment_status: "paid",
        payment_method: "",
        shipping_handling_fees: 0.00,
    });


    let [selectedProducts, setSelectedProducts] = useState(null);

    //Purchase Returned By Auto Suggestion

    let [selectedPurchaseReturnedByUsers, setSelectedPurchaseReturnedByUsers] = useState([]);


    const [show, setShow] = useState(false);

    function handleClose() {
        setShow(false);
    }

    useEffect(() => {
        let at = localStorage.getItem("access_token");
        if (!at) {
            // history.push("/dashboard/purchasereturneds");
            window.location = "/";
        }
    });



    function getPurchaseReturn(id) {
        console.log("inside get PurchaseReturned id:", id);
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

        fetch('/v1/purchase-return/' + id + "?" + queryParams, requestOptions)
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

                let purchaseReturn = data.result;

                if (data.result?.cash_discount) {
                    cashDiscount = data.result.cash_discount;
                    setCashDiscount(cashDiscount);
                } else {
                    cashDiscount = "";
                    setCashDiscount(cashDiscount);
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
                // formData = purchaseReturn;

                formData = {
                    id: purchaseReturn.id,
                    auto_rounding_amount: purchaseReturn.auto_rounding_amount,
                    code: purchaseReturn.code,
                    purchase_code: purchaseReturn.purchase_code,
                    store_id: purchaseReturn.store_id,
                    vendor_id: purchaseReturn.vendor_id,
                    vendor_name: purchaseReturn.vendor_name,
                    date_str: purchaseReturn.date,
                    // date: purchase.date,
                    vat_percent: purchaseReturn.vat_percent,
                    cash_discount: purchaseReturn.cash_discount,
                    discount: purchaseReturn.discount,
                    discount_percent: purchaseReturn.discount_percent,
                    status: purchaseReturn.status,
                    order_placed_by: purchaseReturn.order_placed_by,
                    order_placed_by_signature_id: purchaseReturn.order_placed_by_signature_id,
                    is_discount_percent: purchaseReturn.is_discount_percent,
                    partial_payment_amount: purchaseReturn.partial_payment_amount,
                    payment_method: purchaseReturn.payment_method,
                    payment_status: purchaseReturn.payment_status,
                    shipping_handling_fees: purchaseReturn.shipping_handling_fees,
                    remarks: purchaseReturn.remarks,
                    address: purchaseReturn.address,
                    phone: purchaseReturn.phone,
                    vat_no: purchaseReturn.vat_no,
                    enable_on_accounts: purchaseReturn.enable_on_accounts,
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

                setFormData({ ...formData });

                let selectedProductsTemp = purchaseReturn.products;

                selectedProducts = [];
                for (let i = 0; i < selectedProductsTemp.length; i++) {
                    selectedProductsTemp[i].purchase_unit_price = selectedProductsTemp[i].purchasereturn_unit_price;
                    selectedProductsTemp[i].purchase_unit_price_with_vat = selectedProductsTemp[i].purchasereturn_unit_price_with_vat;
                    selectedProducts.push(selectedProductsTemp[i]);
                }



                /* setSelectedProducts([...selectedProducts]);
                 selectedProducts.forEach((product, index) => {
                     CalCulateLineTotals(index);
                 });*/

                selectedProducts = purchaseReturn.products;
                setSelectedProducts([...selectedProducts]);

                const updatedProducts = purchaseReturn.products.map((product, index) => {
                    // Calculate line totals without calling setSelectedProducts inside the loop
                    const updatedProduct = { ...product };
                    updatedProduct.line_total = parseFloat(trimTo2Decimals((updatedProduct.purchase_unit_price - updatedProduct.unit_discount) * updatedProduct.quantity));
                    updatedProduct.line_total_with_vat = parseFloat(trimTo2Decimals((updatedProduct.purchase_unit_price_with_vat - updatedProduct.unit_discount_with_vat) * updatedProduct.quantity));
                    return updatedProduct;
                });
                setSelectedProducts(updatedProducts);

                setSelectedVendors([]);
                if (purchaseReturn.vendor_id) {
                    const fallback = { ...(purchaseReturn.vendor || {}), id: purchaseReturn.vendor_id };
                    fetchAndSetVendor(purchaseReturn.vendor_id, fallback);
                }

                setFormData({ ...formData });
                reCalculate();
                checkWarnings();
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

    let [purchase, setPurchase] = useState({});

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

                purchase = data.result;
                setPurchase(purchase);


                // date_str: format(new Date(), "MMM dd yyyy"),
                formData.date_str = new Date();
                formData.signature_date_str = format(new Date(), "MMM dd yyyy");
                formData.purchase_id = purchase.id;
                formData.purchase_code = purchase.code;
                formData.remarks = purchase.remarks;
                formData.address = purchase.address;
                formData.phone = purchase.phone;
                formData.vat_no = purchase.vat_no;
                //   vendor_invoice_no: purchase.vendor_invoice_no,
                formData.store_id = purchase.store_id;
                formData.vendor_id = purchase.vendor_id;
                formData.vat_percent = purchase.vat_percent;
                formData.status = purchase.status;
                formData.purchase_returned_by = purchase.order_placed_by;
                formData.purchase_returned_by_signature_id = purchase.order_placed_by_signature_id;
                //  is_discount_percent: purchase.is_discount_percent,
                formData.discount_percent = purchase.discount_percent;
                formData.payment_status = "paid";
                formData.payment_method = "";
                formData.shipping_handling_fees = purchase.shipping_handling_fees;
                formData.enable_on_accounts = purchase.enable_on_accounts;


                //formData.discount = (purchase.discount - purchase.return_discount);
                formData.discount = 0;

                formData.is_discount_percent = true;

                if (purchase.payment_status === "not_paid") {
                    formData.payments_input = [];
                }


                cashDiscount = parseFloat(purchase.cash_discount - purchase.return_cash_discount);
                setCashDiscount(cashDiscount)

                formData.auto_rounding_amount = purchase.auto_rounding_amount;


                if (!purchase.auto_rounding_amount) {
                    if (data.result?.rounding_amount) {
                        roundingAmount = data.result.rounding_amount;
                        setRoundingAmount(roundingAmount);
                    } else {
                        roundingAmount = 0;
                        setRoundingAmount(roundingAmount);
                    }
                }


                //formData.status = "purchase_returned";

                setFormData({ ...formData });
                console.log("formData1.status:", formData.status);


                let selectedProductsTemp = purchase.products;

                selectedProducts = [];
                for (let i = 0; i < selectedProductsTemp.length; i++) {
                    selectedProductsTemp[i].selected = false;
                    let purchasedQty = selectedProductsTemp[i].quantity - selectedProductsTemp[i].quantity_returned;
                    selectedProductsTemp[i].quantity = purchasedQty;

                    if (purchasedQty > 0) {
                        selectedProducts.push(selectedProductsTemp[i]);
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

                /*
                setSelectedProducts([...selectedProducts]);
                selectedProducts.forEach((product, index) => {
                    CalCulateLineTotals(index);
                });*/

                selectedProducts = purchase.products;
                setSelectedProducts([...selectedProducts]);
                const updatedProducts = purchase.products.map((product, index) => {
                    // Calculate line totals without calling setSelectedProducts inside the loop
                    const updatedProduct = { ...product };
                    updatedProduct.line_total = parseFloat(trimTo2Decimals((updatedProduct.purchase_unit_price - updatedProduct.unit_discount) * updatedProduct.quantity));
                    updatedProduct.line_total_with_vat = parseFloat(trimTo2Decimals((updatedProduct.purchase_unit_price_with_vat - updatedProduct.unit_discount_with_vat) * updatedProduct.quantity));
                    return updatedProduct;
                });
                setSelectedProducts(updatedProducts);

                setSelectedVendors([]);
                if (purchase.vendor_id && purchase.vendor_name && purchase.vendor.search_label) {
                    let selectedVendors = [
                        {
                            id: purchase.vendor_id,
                            name: purchase.vendor_name,
                            search_label: purchase.vendor.search_label,
                        }
                    ];
                    setSelectedVendors([...selectedVendors]);
                }


                reCalculate();
                checkWarnings();
                setFormData({ ...formData });
            })
            .catch(error => {
                setProcessing(false);
                setErrors(error);
            });
    }


    function handleCreate(event) {
        event.preventDefault();

        let haveErrors = false;

        if (!cashDiscount) {
            formData.cash_discount = 0;
        } else {
            formData.cash_discount = cashDiscount;
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


        let selectedProductsCount = 0;
        formData.products = [];
        for (var i = 0; i < selectedProducts.length; i++) {
            let unitPrice = parseFloat(selectedProducts[i].purchase_unit_price);


            delete errors["purchasereturn_unit_price_" + i];
            setErrors({ ...errors });

            if (unitPrice && /^\d*\.?\d{0,8}$/.test(unitPrice) === false) {
                errors["purchasereturn_unit_price_" + i] = t("Max decimal points allowed is 8");
                setErrors({ ...errors });
                haveErrors = true;
            }

            let unitPriceWithVAT = parseFloat(selectedProducts[i].purchase_unit_price_with_vat);

            delete errors["purchasereturn_unit_price_with_vat_" + i];
            setErrors({ ...errors });

            if (unitPriceWithVAT && /^\d*\.?\d{0,8}$/.test(unitPriceWithVAT) === false) {
                errors["purchasereturn_unit_price_with_vat_" + i] = t("Max decimal points allowed is 8");
                setErrors({ ...errors });
                haveErrors = true;
            }


            if (selectedProducts[i].selected) {
                selectedProductsCount++;
            }

            formData.products.push({
                product_id: selectedProducts[i].product_id,
                name: selectedProducts[i].name,
                part_number: selectedProducts[i].part_number,
                quantity: parseFloat(selectedProducts[i].quantity),
                unit: selectedProducts[i].unit,
                purchasereturn_unit_price: parseFloat(selectedProducts[i].purchase_unit_price),
                purchasereturn_unit_price_with_vat: parseFloat(selectedProducts[i].purchase_unit_price_with_vat),
                selected: selectedProducts[i].selected,
                unit_discount: selectedProducts[i].unit_discount ? parseFloat(selectedProducts[i].unit_discount) : 0,
                unit_discount_percent: selectedProducts[i].unit_discount_percent ? parseFloat(selectedProducts[i].unit_discount_percent) : 0,
                unit_discount_with_vat: selectedProducts[i].unit_discount ? parseFloat(selectedProducts[i].unit_discount_with_vat) : 0,
                unit_discount_percent_with_vat: selectedProducts[i].unit_discount_percent ? parseFloat(selectedProducts[i].unit_discount_percent_with_vat) : 0,
                warehouse_id: selectedProducts[i].warehouse_id ? selectedProducts[i].warehouse_id : null,
                warehouse_code: selectedProducts[i].warehouse_code ? selectedProducts[i].warehouse_code : null,
            });
        }


        if (selectedProductsCount === 0) {
            errors["product_id"] = t("No products selected");
            setErrors({ ...errors });
            haveErrors = true;
        }


        if (!formData.discount && formData.discount !== 0) {
            errors["discount"] = t("Invalid discount");
            setErrors({ ...errors });
            haveErrors = true;
        }

        if (!formData.shipping_handling_fees && formData.shipping_handling_fees !== 0) {
            errors["shipping_handling_fees"] = t("Invalid shipping / handling fees");
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

        delete errors["payment_method"];
        setErrors({ ...errors });

        if (haveErrors) {
            console.log("Errors: ", errors);
            return;
        }

        formData.balance_amount = parseFloat(balanceAmount);


        let endPoint = "/v1/purchase-return";
        let method = "POST";
        if (formData.id) {
            endPoint = "/v1/purchase-return/" + formData.id;
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

                if (props.handleUpdated) {
                    props.handleUpdated();
                }

                setErrors({});
                setProcessing(false);

                console.log("Response:");
                console.log(data);
                if (formData.id) {
                    if (props.showToastMessage) props.showToastMessage("Purchase return updated successfully!", "success");
                } else {
                    if (props.showToastMessage) props.showToastMessage("Purchase return created successfully!", "success");
                }

                if (props.refreshList) {
                    props.refreshList();
                }
                handleClose();

                if (props.refreshPurchaseList) {
                    props.refreshPurchaseList();
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
                if (props.showToastMessage) props.showToastMessage("Failed to process purchase return!", "danger");
            });
    }


    function CalCulateLineTotals(index, skipTotal, skipTotalWithVAT) {

        if (!skipTotal) {
            selectedProducts[index].line_total = parseFloat(trimTo2Decimals((selectedProducts[index]?.purchase_unit_price - selectedProducts[index]?.unit_discount) * selectedProducts[index]?.quantity));
        }

        if (!skipTotalWithVAT) {
            selectedProducts[index].line_total_with_vat = parseFloat(trimTo2Decimals((selectedProducts[index]?.purchase_unit_price_with_vat - selectedProducts[index]?.unit_discount_with_vat) * selectedProducts[index]?.quantity));
        }

        setSelectedProducts([...selectedProducts]);
    }

    let [cashDiscount, setCashDiscount] = useState("");
    let [roundingAmount, setRoundingAmount] = useState(0.00);
    let [shipping, setShipping] = useState(0.00);
    let [discount, setDiscount] = useState(0.00);
    let [discountPercent, setDiscountPercent] = useState(0.00);

    let [discountWithVAT, setDiscountWithVAT] = useState(0.00);
    let [discountPercentWithVAT, setDiscountPercentWithVAT] = useState(0.00);

    const latestRequestRef = useRef(0);


    async function reCalculate(productIndex) {
        const requestId = Date.now();
        latestRequestRef.current = requestId;

        //alert("inside calc")
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

            let purchaseReturnUnitPrice = parseFloat(selectedProducts[i].purchase_unit_price);
            delete errors["purchasereturn_unit_price_" + i];

            if (purchaseReturnUnitPrice && /^\d*\.?\d{0,8}$/.test(purchaseReturnUnitPrice) === false) {
                errors["purchasereturn_unit_price_" + i] = t("Max decimal points allowed is 8");
                setErrors({ ...errors });
                return;
            }


            let purchaseReturnUnitPriceWithVAT = parseFloat(selectedProducts[i].purchase_unit_price_with_vat);

            delete errors["purchasereturn_unit_price_with_vat" + i];

            if (purchaseReturnUnitPriceWithVAT && /^\d*\.?\d{0,8}$/.test(purchaseReturnUnitPriceWithVAT) === false) {
                errors["purchasereturn_unit_price_with_vat" + i] = t("Max decimal points allowed is 8");
                setErrors({ ...errors });
                return;

            }



            let unitDiscount = 0.00;

            if (selectedProducts[i].unit_discount) {
                unitDiscount = parseFloat(selectedProducts[i].unit_discount)

                delete errors["purchase_return_unit_discount_" + i];
                setErrors({ ...errors });

                if (/^\d*\.?\d{0,8}$/.test(unitDiscount) === false) {
                    errors["purchase_return_unit_discount_" + i] = t("Max decimal points allowed is 8");
                    setErrors({ ...errors });
                    return;
                }
            }

            let unitDiscountWithVAT = 0.00;

            if (selectedProducts[i].unit_discount_with_vat) {
                unitDiscountWithVAT = parseFloat(selectedProducts[i].unit_discount_with_vat)
                delete errors["purchase_return_unit_discount_" + i];
                setErrors({ ...errors });

                if (/^\d*\.?\d{0,8}$/.test(unitDiscountWithVAT) === false) {
                    errors["purchase_return_unit_discount_" + i] = t("Max decimal points allowed is 8");
                    setErrors({ ...errors });
                    return;
                }
            }


            formData.products.push({
                product_id: selectedProducts[i].product_id,
                quantity: parseFloat(selectedProducts[i].quantity),
                purchasereturn_unit_price: purchaseReturnUnitPrice ? purchaseReturnUnitPrice : 0.00,
                purchasereturn_unit_price_with_vat: purchaseReturnUnitPriceWithVAT ? purchaseReturnUnitPriceWithVAT : 0.00,
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
                "/v1/purchase-return/calculate-net-total",
                requestOptions
            );
            console.log("Done")
            if (!result.ok) {
                return;
            }

            if (latestRequestRef.current !== requestId) return;


            let res = await result.json();
            if (res.result) {
                formData.total = res.result.total;
                formData.total_with_vat = res.result.total_with_vat;
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


                            if (res.result?.products[j].purchasereturn_unit_price) {
                                selectedProducts[i].purchase_unit_price = res.result?.products[j].purchasereturn_unit_price;
                            }

                            if (res.result?.products[j].purchasereturn_unit_price_with_vat) {
                                selectedProducts[i].purchase_unit_price_with_vat = res.result?.products[j].purchasereturn_unit_price_with_vat;
                            }*/
                        }
                    }
                }
                setSelectedProducts([...selectedProducts]);
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
    /*
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
            purchasereturn_unit_price: parseFloat(selectedProducts[i].purchase_unit_price),
            selected: selectedProducts[i].selected,
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

    let result = await fetch(
        "/v1/purchase-return/calculate-net-total",
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
            if (cashDiscount) {
                formData.payments_input[0].amount = formData.payments_input[0].amount - parseFloat(trimTo2Decimals(cashDiscount));
            }
            formData.payments_input[0].amount = parseFloat(trimTo2Decimals(formData.payments_input[0].amount));
        }
    }
    findTotalPayments();
    setFormData({ ...formData });
    validatePaymentAmounts();
}
    */



    const StoreCreateFormRef = useRef();

    const ProductCreateFormRef = useRef();
    function openProductCreateForm() {
        ProductCreateFormRef.current.open();
    }

    function openProductUpdateForm(id) {
        ProductCreateFormRef.current.open(id);
    }

    const VendorCreateFormRef = useRef();

    const UserCreateFormRef = useRef();


    const SignatureCreateFormRef = useRef();


    const PurchaseDetailsViewRef = useRef();

    let [totalPaymentAmount, setTotalPaymentAmount] = useState(0.00);
    let [balanceAmount, setBalanceAmount] = useState(0.00);
    let [paymentStatus, setPaymentStatus] = useState("");

    function findTotalPayments() {
        console.log("Inside findTotalPayments()");
        let totalPayment = 0.00;
        for (var i = 0; i < formData.payments_input?.length; i++) {
            if (formData.payments_input[i].amount && !formData.payments_input[i].deleted) {
                totalPayment += formData.payments_input[i].amount;
            }
        }

        totalPaymentAmount = totalPayment;
        setTotalPaymentAmount(totalPaymentAmount);
        // balanceAmount = (netTotal - cashDiscount) - totalPayment;

        balanceAmount = (parseFloat(trimTo2Decimals(formData.net_total)) - parseFloat(trimTo2Decimals(cashDiscount))) - parseFloat(trimTo2Decimals(totalPayment));
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

    function validatePaymentAmounts() {
        findTotalPayments()

        if (selectedProducts && selectedProducts.filter(product => product.selected).length === 0) {
            return true;
        }

        delete errors["cash_discount"];
        setErrors({ ...errors });
        let haveErrors = false;
        if (!formData.net_total) {
            //removePayment(0, false);
            //totalPaymentAmount = 0.0;
            //setTotalPaymentAmount(0.00);
            //balanceAmount = 0.00;
            //setBalanceAmount(0.00);
            //paymentStatus = "";
            //setPaymentStatus(paymentStatus);
            //return true;
        }



        if (formData.net_total && cashDiscount > 0 && cashDiscount >= formData.net_total) {
            errors["cash_discount"] = t("Cash discount should not be >= ") + formData.net_total.toString();
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
            } /*else if ((new Date(formData.payments_input[key].date_str)) < (new Date(formData.date_str))) {
                errors["payment_date_" + key] = t("Payment date time should be greater than or equal to order date time");
                setErrors({ ...errors });
                haveErrors = true;
            }*/

            if (!formData.payments_input[key].method) {
                errors["payment_method_" + key] = t("Payment method is required");
                setErrors({ ...errors });
                haveErrors = true;
            }
            /*
            if ((formData.payments_input[key].amount || formData.payments_input[key].amount === 0) && !formData.payments_input[key].deleted) {
                let maxAllowedAmount = (netTotal - cashDiscount) - (totalPayment - formData.payments_input[key].amount);

                if (maxAllowedAmount < 0) {
                    maxAllowedAmount = 0;
                }

                
                if (maxAllowedAmount === 0) {
                    errors["payment_amount_" + key] = t("Total amount should not exceed ") + (netTotal - cashDiscount).toFixed(2).toString() + t(", Please delete this payment");
                    setErrors({ ...errors });
                    haveErrors = true;
                } else if (formData.payments_input[key].amount > parseFloat(maxAllowedAmount.toFixed(2))) {
                    errors["payment_amount_" + key] = t("Amount should not be greater than ") + maxAllowedAmount.toFixed(2);
                    setErrors({ ...errors });
                    haveErrors = true;
                }  
            }
            */
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

    function removePayment(key, validatePayments = false) {
        delete errors["payment_amount_" + key];
        delete errors["payment_date_" + key];
        delete errors["payment_method_" + key];

        formData.payments_input.splice(key, 1);
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
        PreviewRef.current.open(model, undefined, "purchase_return");
    }


    const ProductsRef = useRef();
    function openLinkedProducts(model) {
        ProductsRef.current.open(false, "linked_products", model);
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
        PurchaseHistoryRef.current.open(model, selectedVendors);
    }

    let [selectedVendors, setSelectedVendors] = useState([]);
    let [showVendorPending, setShowVendorPending] = useState(false);
    const VendorPendingRef = useRef();
    const VendorsRef = useRef();

    function openVendorPending(vendor) {
        setShowVendorPending(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            VendorPendingRef.current?.open(false, vendor);
        }, 50);
    }

    function fetchAndSetVendor(vendorId, fallbackData) {
        if (!vendorId) return;
        const storeId = localStorage.getItem("store_id");
        const select = "id,code,credit_limit,credit_balance,vat_no,name,phone,phone2,name_in_arabic,phone_in_arabic,search_label";
        fetch(`/v1/vendor/${vendorId}?search[store_id]=${storeId}&select=${select}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', 'Authorization': localStorage.getItem('access_token') },
        })
            .then(async r => {
                const data = r.ok && await r.json();
                if (data?.result) {
                    setSelectedVendors([{ ...data.result }]);
                } else {
                    setSelectedVendors([fallbackData]);
                }
            })
            .catch(() => setSelectedVendors([fallbackData]));
    }

    const handleSelectedVendor = (selectedVendor) => {
        setSelectedVendors([selectedVendor]);
        formData.vendor_id = selectedVendor.id;
        setFormData({ ...formData });
    };

    // Vendor Typeahead search state (used in type2 compact header)
    const [vendorOptions, setVendorOptions] = useState([]);
    let [openVendorSearchResult, setOpenVendorSearchResult] = useState(false);
    const vendorSearchRef = useRef();

    const customVendorFilter = useCallback((option, query) => {
        const normalize = (str) => str?.toLowerCase().replace(/\s+/g, " ").trim() || "";
        const q = normalize(query);
        const qWords = q.split(" ");
        const fields = [
            option.code            || "",
            option.vat_no          || "",
            option.name            || "",
            option.name_in_arabic  || "",
            option.phone           || "",
            option.phone2          || "",
            option.email           || "",
            option.search_label    || "",
            option.phone_in_arabic || "",
            ...(Array.isArray(option.additional_keywords) ? option.additional_keywords : []),
        ];
        const searchable = normalize(fields.join(" "));
        const searchableCompact = fields.join(" ").toLowerCase()
            .replace(/[^\p{L}\p{N}\s]/gu, "")
            .replace(/\s+/g, " ").trim();
        return qWords.every((word) => {
            const wordCompact = word.replace(/[^\p{L}\p{N}]/gu, "");
            return searchable.includes(word) || searchableCompact.includes(wordCompact);
        });
    }, []);

    const vendorPercentOccurrence = (words, vendor) => {
        const fields = [
            vendor.name,
            vendor.name_in_arabic,
            vendor.code,
            vendor.phone,
            vendor.phone2,
            ...(Array.isArray(vendor.additional_keywords) ? vendor.additional_keywords : []),
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
        return searchableWords.length > 0 ? (totalMatches / searchableWords.length) : 0;
    };

    async function suggestVendors(searchTerm) {
        setVendorOptions([]);
        if (!searchTerm) {
            setTimeout(() => { setOpenVendorSearchResult(false); }, 300);
            return;
        }
        var params = { query: searchTerm };
        if (localStorage.getItem("store_id")) { params.store_id = localStorage.getItem("store_id"); }
        var queryString = ObjectToSearchQueryParams(params);
        if (queryString !== "") { queryString = "&" + queryString; }
        const requestOptions = {
            method: "GET",
            headers: { "Content-Type": "application/json", Authorization: localStorage.getItem("access_token") },
        };
        searchTerm = searchTerm.replace(/\s+/g, " ").trim();
        if (!searchTerm) return;
        let Select = "select=id,credit_balance,credit_limit,additional_keywords,code,use_remarks_in_purchases,remarks,vat_no,name,phone,phone2,email,name_in_arabic,phone_in_arabic,search_label";
        let result = await fetch("/v1/vendor?limit=100&" + Select + queryString, requestOptions);
        let data = await result.json();
        if (!data.result || data.result.length === 0) {
            openVendorSearchResult = false;
            setOpenVendorSearchResult(false);
            return;
        }
        openVendorSearchResult = true;
        setOpenVendorSearchResult(true);
        if (data.result) {
            const filtered = data.result.filter((opt) => customVendorFilter(opt, searchTerm));
            const sorted = filtered.sort((a, b) => {
                const searchPhrase = searchTerm.toLowerCase().replace(/\s+/g, " ").trim();
                const getSearchable = (item) => {
                    const fields = [item.code, item.name, item.name_in_arabic, item.phone, item.phone2, item.vat_no,
                        ...(Array.isArray(item.additional_keywords) ? item.additional_keywords : [])];
                    return fields.join(" ").toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
                };
                const aSearchable = getSearchable(a);
                const bSearchable = getSearchable(b);
                const aIndex = aSearchable.indexOf(searchPhrase);
                const bIndex = bSearchable.indexOf(searchPhrase);
                if (aIndex === 0 && bIndex !== 0) return -1;
                if (bIndex === 0 && aIndex !== 0) return 1;
                if (aIndex !== -1 && bIndex !== -1) { if (aIndex < bIndex) return -1; if (bIndex < aIndex) return 1; }
                else if (aIndex !== -1) { return -1; }
                else if (bIndex !== -1) { return 1; }
                const words = searchTerm.toLowerCase().split(" ").filter(Boolean);
                const aPercent = vendorPercentOccurrence(words, a);
                const bPercent = vendorPercentOccurrence(words, b);
                if (aPercent !== bPercent) { return bPercent - aPercent; }
                return 0;
            });
            setVendorOptions(sorted);
        } else {
            setVendorOptions([]);
        }
    }

    function openVendorCreateForm() {
        VendorCreateFormRef.current.open();
    }

    function openVendorUpdateForm(id) {
        VendorCreateFormRef.current.open(id);
    }

    function openVendors() {
        VendorsRef.current.open();
    }

    const PurchaseReturnHistoryRef = useRef();
    function openPurchaseReturnHistory(model) {
        PurchaseReturnHistoryRef.current.open(model, selectedVendors);
    }


    const DeliveryNoteHistoryRef = useRef();
    function openDeliveryNoteHistory(model) {
        DeliveryNoteHistoryRef.current.open(model);
    }


    const QuotationHistoryRef = useRef();
    function openQuotationHistory(model, type) {
        QuotationHistoryRef.current.open(model, [], type);
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
                errors["phone"] = t("Invalid phone no.")
                setErrors({ ...errors });
                return;
            }
        }

        PreviewRef.current.open(model, "whatsapp", "whatsapp_purchase_return");
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

    function openQuotationSalesHistory(model) {
        QuotationHistoryRef.current.open(model, undefined, "invoice");
    }

    const QuotationSalesReturnHistoryRef = useRef();
    function openQuotationSalesReturnHistory(model) {
        QuotationSalesReturnHistoryRef.current.open(model, undefined);
    }

    const SHORTCUTS = {
        DEFAULT: {
            linkedProducts: "Ctrl + Shift + 9",
            productHistory: "Ctrl + Shift + 2",
            salesHistory: "Ctrl + Shift + 3",
            salesReturnHistory: "Ctrl + Shift + 4",
            purchaseHistory: "Ctrl + Shift + 5",
            purchaseReturnHistory: "Ctrl + Shift + 6",
            deliveryNoteHistory: "Ctrl + Shift + 7",
            quotationHistory: "Ctrl + Shift + 8",
            quotationSalesHistory: "Ctrl + Shift + 1",
            quotationSalesReturnHistory: "Ctrl + Shift + Z",
            images: "Ctrl + Shift + F",
        },
        LGK: {
            linkedProducts: "F3",
            productHistory: "Ctrl + Shift + B",
            salesHistory: "F4",
            salesReturnHistory: "F9",
            purchaseHistory: "F6",
            purchaseReturnHistory: "F8",
            deliveryNoteHistory: "Ctrl + Shift + P",
            quotationHistory: "F2",
            quotationSalesHistory: "F10",
            quotationSalesReturnHistory: "Ctrl + Shift + Z",
            images: "Ctrl + Shift + F",
        },
        MBDI: {
            linkedProducts: "Ctrl + Shift + 7",
            productHistory: "Ctrl + Shift + 6",
            salesHistory: "F4",
            salesReturnHistory: "F9",
            purchaseHistory: "F6",
            purchaseReturnHistory: "F8",
            deliveryNoteHistory: "F3",
            quotationHistory: "F2",
            quotationSalesHistory: "F10",
            quotationSalesReturnHistory: "Ctrl + Shift + 8",
            images: "Ctrl + Shift + 9",
        },
    };

    function getShortcut(key) {
        const code = (store && store.code) ? store.code : "DEFAULT";
        return (SHORTCUTS[code] && SHORTCUTS[code][key]) || SHORTCUTS.DEFAULT[key] || "";
    }


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
                openQuotationSalesHistory(product);
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
                openLinkedProducts(product);
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
                openQuotationSalesHistory(product);
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
                openLinkedProducts(product);
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
                case "1": openQuotationSalesHistory(product); return;
                case "2": openProductHistory(product); return;
                case "3": openSalesHistory(product); return;
                case "4": openSalesReturnHistory(product); return;
                case "5": openPurchaseHistory(product); return;
                case "6": openPurchaseReturnHistory(product); return;
                case "7": openDeliveryNoteHistory(product); return;
                case "8": openQuotationHistory(product); return;
                case "9": openLinkedProducts(product); return;
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



    const inputRefs = useRef({});
    const cashDiscountRef = useRef(null);

    const ProductDetailsViewRef = useRef();
    function openProductDetails(id) {
        ProductDetailsViewRef.current.open(id);
    }

    function openUpdateProductForm(id) {
        ProductCreateFormRef.current.open(id);
    }

    let [warnings, setWarnings] = useState({});

    const priceValidationTimer = useRef(null);
    const warningValidationTimer = useRef(null);
    async function checkWarnings(index) {
        if (warningValidationTimer.current) clearTimeout(warningValidationTimer.current);
        warningValidationTimer.current = setTimeout(async () => {
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
        }, 3000);
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

    async function checkErrors(index) {
        if (priceValidationTimer.current) clearTimeout(priceValidationTimer.current);
        priceValidationTimer.current = setTimeout(() => {
            if (index) {
                checkError(index);
            } else {
                for (let i = 0; i < selectedProducts.length; i++) {
                    checkError(i);
                }
            }
        }, 3000);
    }

    function checkError(i) {
        if (selectedProducts[i].quantity && selectedProducts[i].quantity <= 0) {
            errors["quantity_" + i] = t("Quantity should be > 0");
        } else if (!selectedProducts[i].quantity) {
            errors["quantity_" + i] = t("Quantity is required");
        } else {
            delete errors["quantity_" + i];
        }

        if (selectedProducts[i].purchase_unit_price && selectedProducts[i].purchase_unit_price <= 0) {
            errors["purchasereturn_unit_price_" + i] = t("Unit Price(without VAT) should be > 0");
        } else if (!selectedProducts[i].purchase_unit_price) {
            errors["purchasereturn_unit_price_" + i] = t("Unit Price(without VAT) is required");
            //alert(errors["purchasereturn_unit_price_" + i]);
        } else {
            delete errors["purchasereturn_unit_price_" + i];
        }

        if (selectedProducts[i].purchase_unit_price_with_vat && selectedProducts[i].purchase_unit_price_with_vat <= 0) {
            errors["purchasereturn_unit_price_with_vat_" + i] = t("Unit Price(with VAT) should be > 0");
        } else if (!selectedProducts[i].purchase_unit_price) {
            errors["purchasereturn_unit_price_with_vat_" + i] = t("Unit Price(with VAT) is required");
        } else {
            delete errors["purchasereturn_unit_price_with_vat_" + i];
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



    const discountRef = useRef(null);
    const discountWithVATRef = useRef(null);

    const ProductHistoryRef = useRef();
    function openProductHistory(model) {
        ProductHistoryRef.current.open(model);
    }


    //Payment Reference form
    const VendorDepositUpdateFormRef = useRef();
    const PurchaseUpdateFormRef = useRef();
    const paymentValidationTimer = useRef(null);

    let [showReferenceUpdateForm, setShowReferenceUpdateForm] = useState(false);
    let [showPurchaseReturnSPSettings, setShowPurchaseReturnSPSettings] = useState(false);
    const defaultPurchaseReturnSPColumns = [
        { key: 'select', label: 'Select', visible: true },
        { key: 'si_no', label: 'SI No.', visible: true },
        { key: 'part_number', label: 'Part No.', visible: true },
        { key: 'name', label: 'Name', visible: true },
        { key: 'info', label: 'Info', visible: true },
        { key: 'stock', label: 'Stock', visible: true },
        { key: 'qty', label: 'Qty', visible: true },
        { key: 'warehouse', label: 'Remove Stock From', visible: true },
        { key: 'unit_price', label: 'Unit Price(without VAT)', visible: true },
        { key: 'unit_price_with_vat', label: 'Unit Price(with VAT)', visible: true },
        { key: 'unit_discount', label: 'Unit Disc.(without VAT)', visible: true },
        { key: 'unit_discount_with_vat', label: 'Unit Disc.(with VAT)', visible: true },
        { key: 'unit_discount_percent', label: 'Disc. %(without VAT)', visible: true },
        { key: 'price', label: 'Price(without VAT)', visible: true },
        { key: 'price_with_vat', label: 'Price(with VAT)', visible: true },
    ];
    const [purchaseReturnSPColumns, setPurchaseReturnSPColumns] = useState(() => {
        try {
            const saved = localStorage.getItem('purchase_return_sp_table_settings');
            if (saved) {
                const parsed = JSON.parse(saved);
                const merged = defaultPurchaseReturnSPColumns.map(def => {
                    const found = parsed.find(p => p.key === def.key);
                    return found ? { ...def, visible: found.visible } : def;
                });
                return merged;
            }
        } catch (e) { }
        return defaultPurchaseReturnSPColumns;
    });
    useEffect(() => {
        localStorage.setItem('purchase_return_sp_table_settings', JSON.stringify(purchaseReturnSPColumns));
    }, [purchaseReturnSPColumns]);
    const handleTogglePurchaseReturnSPColumn = (key) => {
        setPurchaseReturnSPColumns(cols => cols.map(c => c.key === key ? { ...c, visible: !c.visible } : c));
    };
    const onDragEndPurchaseReturnSP = (result) => {
        if (!result.destination) return;
        const items = Array.from(purchaseReturnSPColumns);
        const [reordered] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reordered);
        setPurchaseReturnSPColumns(items);
    };
    const restoreDefaultPurchaseReturnSPSettings = () => {
        setPurchaseReturnSPColumns(defaultPurchaseReturnSPColumns);
        localStorage.removeItem('purchase_return_sp_table_settings');
    };
    const [formType, setFormType] = useState(() => localStorage.getItem('purchase_return_form_type') || 'type1');
    useEffect(() => { localStorage.setItem('purchase_return_form_type', formType); }, [formType]);
    useEffect(() => {
        if (store?.settings?.purchase_return_create_form_design) {
            setFormType(store.settings.purchase_return_create_form_design);
        }
    }, [store?.settings?.purchase_return_create_form_design]);
    const SC_COL_DEFAULTS_PR = { select: 50, si_no: 40, part_number: 100, name: 200, info: 50, stock: 60, qty: 70, warehouse: 130, unit_price: 130, unit_price_with_vat: 130, unit_discount: 120, unit_discount_with_vat: 120, unit_discount_percent: 90, price: 120, price_with_vat: 120 };
    const [scColWidths, setScColWidths] = useState(() => { try { return JSON.parse(localStorage.getItem('pr_sc_col_widths')) || {}; } catch { return {}; } });
    useEffect(() => { localStorage.setItem('pr_sc_col_widths', JSON.stringify(scColWidths)); }, [scColWidths]);
    function startScColResize(e, colKey, startWidth) {
        const startX = e.clientX;
        function onMouseMove(ev) { const delta = ev.clientX - startX; setScColWidths(prev => ({ ...prev, [colKey]: Math.max(40, startWidth + delta) })); }
        function onMouseUp() { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp); }
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        e.preventDefault();
    }
    function openReferenceUpdateForm(id, referenceModel) {
        showReferenceUpdateForm = true;
        setShowReferenceUpdateForm(showReferenceUpdateForm);

        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            if (referenceModel === "vendor_deposit") {
                VendorDepositUpdateFormRef.current.open(id);
            } else if (referenceModel === "purchase") {
                PurchaseUpdateFormRef.current.open(id);
            }
        }, 50);
    }

    const handleReferenceUpdated = () => {
        if (formData.id) {
            getPurchaseReturn(formData.id);
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
            {showVendorPending && <VendorPending ref={VendorPendingRef} />}
            <Vendors ref={VendorsRef} onSelectVendor={handleSelectedVendor} showToastMessage={props.showToastMessage} />
            {showReferenceUpdateForm && <>
                <VendorDepositCreate ref={VendorDepositUpdateFormRef} onUpdated={handleReferenceUpdated} />
                <PurchaseUpdateForm ref={PurchaseUpdateFormRef} onUpdated={handleReferenceUpdated} />
            </>}
            <ProductHistory ref={ProductHistoryRef} showToastMessage={props.showToastMessage} />
            <ImageViewerModal ref={imageViewerRef} images={productImages} />
            <Products ref={ProductsRef} showToastMessage={props.showToastMessage} />
            <SalesHistory ref={SalesHistoryRef} showToastMessage={props.showToastMessage} />
            <SalesReturnHistory ref={SalesReturnHistoryRef} showToastMessage={props.showToastMessage} />
            <PurchaseHistory ref={PurchaseHistoryRef} showToastMessage={props.showToastMessage} />
            <PurchaseReturnHistory ref={PurchaseReturnHistoryRef} showToastMessage={props.showToastMessage} />
            <QuotationHistory ref={QuotationHistoryRef} showToastMessage={props.showToastMessage} />
            <DeliveryNoteHistory ref={DeliveryNoteHistoryRef} showToastMessage={props.showToastMessage} />

            <Preview ref={PreviewRef} />
            <ProductView ref={ProductDetailsViewRef} openUpdateForm={openProductUpdateForm} openCreateForm={openProductCreateForm} />
            <ProductCreate ref={ProductCreateFormRef} showToastMessage={props.showToastMessage} />

            <PurchaseReturnedView ref={DetailsViewRef} />
            <StoreCreate ref={StoreCreateFormRef} showToastMessage={props.showToastMessage} />
            <UserCreate ref={UserCreateFormRef} showToastMessage={props.showToastMessage} />
            <SignatureCreate ref={SignatureCreateFormRef} showToastMessage={props.showToastMessage} />
            <VendorCreate ref={VendorCreateFormRef} showToastMessage={props.showToastMessage} onUpdated={(updated) => { if (updated && updated.id) { fetchAndSetVendor(updated.id, updated); if (props.refreshList) { props.refreshList(); } } }} />
            <PurchaseView ref={PurchaseDetailsViewRef} />
            <Modal show={show} size="xl" fullscreen onHide={handleClose} animation={false} backdrop="static" scrollable={true}>
                <Modal.Header>
                    <Modal.Title>
                        {formData.id ? "Update Purchase Return #" + formData.code + " for purchase #" + formData.purchase_code : "Create Purchase Return for purchase #" + formData.purchase_code}
                        {/*
                        {formData.purchase_id ? " for Purchase #" + <span style={{
                            textDecoration: "underline",
                            color: "blue",
                            cursor: "pointer",
                        }}
                            onClick={() => {
                                openPurchaseDetailsView(formData.purchase_id);
                            }}> formData.purchase_code : ""} </span> : ""}
                        */}
                    </Modal.Title>

                    <div className="col align-self-end text-end">
                        <Button variant="primary" onClick={openPreview}>
                            <i className="bi bi-printer"></i> {t('Print Full Invoice')}
                        </Button>
                        &nbsp;&nbsp;
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
                                {formData.id && !isProcessing ? t('Update') : !isProcessing ? t('Create') : ""}
                            </Button>}
                        <select value={formType} onChange={(e) => setFormType(e.target.value)} className="form-select form-select-sm" style={{ width: 'auto', fontSize: '11px', padding: '2px 24px 2px 6px', height: '26px', lineHeight: '1.2' }}>
                            <option value="type1">Type 1 (Classic)</option>
                            <option value="type2">Type 2 ✦</option>
                        </select>
                        &nbsp;&nbsp;
                        <button
                            type="button"
                            className="btn-close"
                            onClick={handleClose}
                            aria-label="Close"
                        ></button>
                    </div>
                </Modal.Header>
                <Modal.Body>
                    {errors && Object.keys(errors).some(k => { const m = Array.isArray(errors[k]) ? errors[k][0] : errors[k]; return !!m; }) && (
                        <div style={{ maxHeight: '120px', overflowY: 'auto', padding: '8px 12px', backgroundColor: '#fff0f0', borderLeft: '1px solid #f5c6cb', borderBottom: '1px solid #f5c6cb', boxShadow: '-2px 2px 8px rgba(186,26,26,0.12)', position: 'fixed', top: '56px', right: 0, width: '380px', zIndex: 9999 }}>
                            <ul style={{ marginBottom: 0, paddingLeft: 16 }}>
                                {Object.keys(errors).map((key, index) => { const message = Array.isArray(errors[key]) ? errors[key][0] : errors[key]; return message ? <li key={index} style={{ color: '#dc2626', fontSize: '12px' }}>{t(message)}</li> : null; })}
                            </ul>
                        </div>
                    )}
                    {selectedProducts && selectedProducts.length === 0 && t('Already Returned All purchased products')}


                    {selectedProducts && selectedProducts.length > 0 && <form className="row g-3 needs-validation" onSubmit={handleCreate}>

                        <div className="col-12">
                            <div className="entity-header-grid">

                                {/* LEFT: vendor Typeahead + form fields */}
                                <div>
                                    {/* Vendor search row */}
                                    <div style={{ marginBottom: '12px' }}>
                                        <label className="form-label">{t('Vendor')}</label>
                                        <div className="d-flex gap-1 align-items-center">
                                            <input
                                                type="text"
                                                className="form-control"
                                                disabled
                                                value={selectedVendors?.[0]?.name || formData.vendor_name || ''}
                                                placeholder={t('Vendor')}
                                                style={{ backgroundColor: '#f8f9fa', flex: 1 }}
                                            />
                                            {selectedVendors.length > 0 && formData.vendor_id && (
                                                <Button onClick={() => VendorCreateFormRef.current.open(formData.vendor_id)} className="btn btn-primary btn-sm" type="button" title={t('Edit Vendor')}>
                                                    <i className="bi bi-pencil"></i>
                                                </Button>
                                            )}
                                        </div>
                                        {errors.vendor_id && <div style={{ color: 'red' }}>{errors.vendor_id}</div>}
                                    </div>

                                    {/* Other form fields — 2×3 CSS Grid matching Purchase form */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '231px 1fr 1fr', gap: '8px 45px', alignItems: 'start', maxWidth: '80%', marginTop: '8px' }}>

                                        {/* R1C1: Date */}
                                        <div>
                                            <label className="form-label" style={{ fontSize: '12px', marginBottom: '2px' }}>{t('Date')} *</label>
                                            <DatePicker
                                                id="date_str"
                                                selected={formData.date_str ? new Date(formData.date_str) : null}
                                                value={formData.date_str ? format(new Date(formData.date_str), "MMMM d, yyyy h:mm aa", { locale: dateLocale }) : null}
                                                className="form-control"
                                                dateFormat="MMMM d, yyyy h:mm aa"
                                                locale={dateLocale}
                                                showTimeSelect
                                                timeIntervals="1"
                                                onChange={(value) => { formData.date_str = value; setFormData({ ...formData }); }}
                                            />
                                            {errors.date_str && <div style={{ color: 'red' }}>{t(errors.date_str)}</div>}
                                        </div>

                                        {/* R1C2: Phone + WhatsApp inline */}
                                        <div>
                                            <label className="form-label" style={{ fontSize: '12px', marginBottom: '2px' }}>{t('Phone ( 05.. / +966..)')}</label>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <input
                                                    id="purchase_return_phone" name="purchase_return_phone"
                                                    value={formData.phone || ''}
                                                    type="text"
                                                    onChange={(e) => { delete errors["phone"]; setErrors({ ...errors }); formData.phone = e.target.value; setFormData({ ...formData }); }}
                                                    className="form-control"
                                                    placeholder={t('Phone ( 05.. / +966..)')}
                                                />
                                                <Button className="btn btn-success btn-sm" onClick={sendWhatsAppMessage} style={{ flexShrink: 0 }}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="white" viewBox="0 0 16 16">
                                                        <path d="M13.601 2.326A7.875 7.875 0 0 0 8.036 0C3.596 0 0 3.597 0 8.036c0 1.417.37 2.805 1.07 4.03L0 16l3.993-1.05a7.968 7.968 0 0 0 4.043 1.085h.003c4.44 0 8.036-3.596 8.036-8.036 0-2.147-.836-4.166-2.37-5.673ZM8.036 14.6a6.584 6.584 0 0 1-3.35-.92l-.24-.142-2.37.622.63-2.31-.155-.238a6.587 6.587 0 0 1-1.018-3.513c0-3.637 2.96-6.6 6.6-6.6 1.764 0 3.42.69 4.67 1.94a6.56 6.56 0 0 1 1.93 4.668c0 3.637-2.96 6.6-6.6 6.6Zm3.61-4.885c-.198-.1-1.17-.578-1.352-.644-.18-.066-.312-.1-.444.1-.13.197-.51.644-.626.775-.115.13-.23.15-.428.05-.198-.1-.837-.308-1.594-.983-.59-.525-.99-1.174-1.11-1.372-.116-.198-.012-.305.088-.403.09-.09.198-.23.298-.345.1-.115.132-.197.2-.33.065-.13.032-.247-.017-.345-.05-.1-.444-1.07-.61-1.46-.16-.384-.323-.332-.444-.338l-.378-.007c-.13 0-.344.048-.525.23s-.688.672-.688 1.64c0 .967.704 1.9.802 2.03.1.13 1.386 2.116 3.365 2.963.47.203.837.324 1.122.414.472.15.902.13 1.24.08.378-.057 1.17-.48 1.336-.942.165-.462.165-.858.116-.943-.048-.084-.18-.132-.378-.23Z" />
                                                    </svg>
                                                </Button>
                                            </div>
                                            {errors.phone && <div style={{ color: 'red' }}>{t(errors.phone)}</div>}
                                        </div>

                                        {/* R1C3: VAT NO. */}
                                        <div>
                                            <label className="form-label" style={{ fontSize: '12px', marginBottom: '2px' }}>{t('VAT NO.(15 digits)')}</label>
                                            <input
                                                id="purchase_return_vat_no" name="purchase_return_vat_no"
                                                value={formData.vat_no || ''}
                                                type="text"
                                                onChange={(e) => { delete errors["vat_no"]; setErrors({ ...errors }); formData.vat_no = e.target.value; setFormData({ ...formData }); }}
                                                className="form-control"
                                                placeholder={t('VAT NO.(15 digits)')}
                                            />
                                            {errors.vat_no && <div style={{ color: 'red' }}>{t(errors.vat_no)}</div>}
                                        </div>

                                        {/* R2C1: Vendor Invoice No. */}
                                        <div>
                                            <label className="form-label" style={{ fontSize: '12px', marginBottom: '2px' }}>{t('Vendor Invoice No. (Optional)')}</label>
                                            <input
                                                id="purchase_return_vendor_invoice_no" name="purchase_return_vendor_invoice_no"
                                                value={formData.vendor_invoice_no || ''}
                                                type="text"
                                                onChange={(e) => { delete errors["vendor_invoice_no"]; setErrors({ ...errors }); formData.vendor_invoice_no = e.target.value; setFormData({ ...formData }); }}
                                                className="form-control"
                                                placeholder={t('Vendor Invoice No. (Optional)')}
                                            />
                                            {errors.vendor_invoice_no && <div style={{ color: 'red' }}>{t(errors.vendor_invoice_no)}</div>}
                                        </div>

                                        {/* R2C2: Address */}
                                        <div>
                                            <label className="form-label" style={{ fontSize: '12px', marginBottom: '2px' }}>{t('Address')}</label>
                                            <textarea
                                                value={formData.address || ''}
                                                onChange={(e) => { delete errors["address"]; setErrors({ ...errors }); formData.address = e.target.value; setFormData({ ...formData }); }}
                                                className="form-control"
                                                id="address"
                                                placeholder={t('Address')}
                                                style={{ width: '100%' }}
                                            />
                                            {errors.address && <div style={{ color: 'red' }}>{t(errors.address)}</div>}
                                        </div>

                                        {/* R2C3: Remarks */}
                                        <div>
                                            <label className="form-label" style={{ fontSize: '12px', marginBottom: '2px' }}>{t('Remarks')}</label>
                                            <textarea
                                                value={formData.remarks || ''}
                                                onChange={(e) => { delete errors["remarks"]; setErrors({ ...errors }); formData.remarks = e.target.value; setFormData({ ...formData }); }}
                                                className="form-control"
                                                id="remarks"
                                                placeholder={t('Remarks')}
                                                style={{ width: '100%' }}
                                            />
                                            {errors.remarks && <div style={{ color: 'red' }}>{t(errors.remarks)}</div>}
                                        </div>

                                    </div>
                                </div>{/* end LEFT */}

                                {/* RIGHT: Vendor detail panel */}
                                <div style={{ alignSelf: 'start' }}>
                                    {selectedVendors.length > 0 && formData.vendor_id && (() => {
                                        const v = selectedVendors[0];
                                        return (
                                            <div style={{ padding: '10px 16px', background: 'rgba(0,74,198,0.04)', border: '1px solid #c7d7f5', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                    {v.code && <span style={{ background: '#dbeafe', color: '#1e40af', borderRadius: '4px', padding: '2px 8px', fontSize: '12px', fontWeight: 700, letterSpacing: '0.03em', flexShrink: 0 }}>{v.code}</span>}
                                                    <span className="entity-detail-name" style={{ fontWeight: 700, fontSize: '15px', color: '#191c1e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '260px' }} title={v.name}>{v.name}</span>
                                                    {v.name_in_arabic && <span style={{ fontSize: '13px', color: '#64748b', fontFamily: 'Arial, sans-serif', flexShrink: 0 }}>{v.name_in_arabic}</span>}
                                                </div>
                                                {(v.phone || v.phone2 || v.vat_no) && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                                        {v.phone && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#374151' }}><i className="bi bi-telephone" style={{ color: '#6b7280', fontSize: '12px' }} />{v.phone}</span>}
                                                        {v.phone2 && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#374151' }}><i className="bi bi-telephone" style={{ color: '#6b7280', fontSize: '12px' }} />{v.phone2}</span>}
                                                        {v.vat_no && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#374151' }}><i className="bi bi-receipt" style={{ color: '#6b7280', fontSize: '12px' }} /><span style={{ color: '#6b7280' }}>VAT:</span><strong>{v.vat_no}</strong></span>}
                                                    </div>
                                                )}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', borderTop: '1px solid #e2e8f0', paddingTop: '4px', marginTop: '2px' }}>
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', userSelect: 'none' }} onClick={() => openVendorPending(selectedVendors[0])} title={t('Click to view pendings')}>
                                                        <i className="bi bi-wallet2" style={{ color: '#004ac6', fontSize: '13px' }} />
                                                        <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: 500 }}>{t('Cr.Balance')}:</span>
                                                        <strong style={{ fontSize: '17px', fontWeight: 700, color: (v.credit_balance ?? 0) > 0 ? '#dc2626' : '#16a34a', letterSpacing: '-0.5px', textDecoration: 'underline dotted' }}><Amount amount={trimTo2Decimals(v.credit_balance ?? 0)} /></strong>
                                                        <i className="bi bi-box-arrow-up-right" style={{ color: '#004ac6', fontSize: '10px' }} />
                                                    </span>
                                                    {(v.credit_limit > 0) && (
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                                            <i className="bi bi-shield-check" style={{ color: '#6b7280', fontSize: '13px' }} />
                                                            <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: 500 }}>{t('Limit')}:</span>
                                                            <strong style={{ fontSize: '15px', fontWeight: 700, color: '#374151' }}><Amount amount={trimTo2Decimals(v.credit_limit)} /></strong>
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>{/* end RIGHT */}

                            </div>
                        </div>


                        {errors["product_id"] && (
                            <div style={{ color: "red" }}>
                                <i className="bi bi-x-lg"> </i>
                                {t(errors["product_id"])}
                            </div>
                        )}
                        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0" }}>
                            <Button variant="light" size="sm" title="Table Settings" onClick={() => setShowPurchaseReturnSPSettings(true)}>
                                <i className="bi bi-gear"></i>
                            </Button>
                        </div>
                        {formType === 'type2' ? (
                        <>
                        <section style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '8px' }}>
                          <div className="sc-header-flex" style={{ borderBottom: '1px solid #c3c6d7' }}>
                            {/* Left: vendor search + date + remarks */}
                            <div className="sc-header-left" style={{ padding: '4px 10px', display: 'flex', gap: '6px', alignItems: 'stretch', backgroundColor: '#f2f4f6', borderRight: '1px solid #c3c6d7' }}>
                              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {/* Row 1: Vendor search */}
                                <div className="sc-sub-row sc-customer-row" style={{ alignItems: 'center', flexWrap: 'nowrap' }}>
                                  <div className="sc-customer-search-group">
                                    <div className="sc-search-input" style={{ flex: '1 1 0', minWidth: 0 }}>
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <Typeahead
                                          id="vendor_search_type2"
                                          positionFixed={true}
                                          filterBy={() => true}
                                          labelKey="search_label"
                                          open={openVendorSearchResult}
                                          isLoading={false}
                                          onChange={(selectedItems) => {
                                            delete errors.vendor_id;
                                            setErrors(errors);
                                            if (selectedItems.length === 0) {
                                              delete errors.vendor_id;
                                              formData.vendor_id = "";
                                              setFormData({ ...formData });
                                              setSelectedVendors([]);
                                              return;
                                            }
                                            formData.vendor_id = selectedItems[0].id;
                                            if (selectedItems[0].use_remarks_in_purchases && selectedItems[0].remarks) {
                                              formData.remarks = selectedItems[0].remarks;
                                            }
                                            setOpenVendorSearchResult(false);
                                            setFormData({ ...formData });
                                            setSelectedVendors(selectedItems);
                                          }}
                                          options={vendorOptions}
                                          placeholder={t('Vendor Name / Mob / VAT # / ID')}
                                          selected={selectedVendors}
                                          highlightOnlyResult={true}
                                          ref={vendorSearchRef}
                                          onKeyDown={(e) => {
                                            if (e.key === "Escape") {
                                              delete errors.vendor_id;
                                              setOpenVendorSearchResult(false);
                                              formData.vendor_id = "";
                                              formData.vendor_name = "";
                                              setFormData({ ...formData });
                                              setSelectedVendors([]);
                                              setVendorOptions([]);
                                              vendorSearchRef.current?.clear();
                                            }
                                          }}
                                          onInputChange={(searchTerm) => {
                                            if (searchTerm) { formData.vendor_name = searchTerm; }
                                            setFormData({ ...formData });
                                            if (timerRef.current) clearTimeout(timerRef.current);
                                            timerRef.current = setTimeout(() => { suggestVendors(searchTerm); }, 350);
                                          }}
                                        />
                                      </div>
                                    </div>
                                    <button type="button" onClick={openVendorCreateForm}
                                      style={{ background: '#fff', border: '1px solid #c3c6d7', borderRadius: '4px', padding: '7px 12px', fontSize: '13px', cursor: 'pointer', flexShrink: 0 }}>
                                      <i className="bi bi-plus-lg" />
                                    </button>
                                    {formData.vendor_id && (
                                      <button type="button" onClick={() => openVendorUpdateForm(formData.vendor_id)}
                                        style={{ background: '#fff', border: '1px solid #c3c6d7', borderRadius: '4px', padding: '7px 12px', fontSize: '13px', cursor: 'pointer', flexShrink: 0 }}>
                                        <i className="bi bi-pencil" />
                                      </button>
                                    )}
                                    <button type="button" onClick={openVendors}
                                      style={{ background: '#004ac6', color: '#fff', border: '1px solid transparent', borderRadius: '4px', padding: '7px 12px', fontSize: '13px', cursor: 'pointer', flexShrink: 0 }}>
                                      <i className="bi bi-list" />
                                    </button>
                                  </div>
                                </div>
                                {/* Row 2: Date */}
                                <div className="sc-sub-row" style={{ alignItems: 'center' }}>
                                  <div className="sc-date-input" style={{ flexShrink: 0 }}>
                                    <DatePicker
                                      id="date_str_type2"
                                      selected={formData.date_str ? new Date(formData.date_str) : null}
                                      value={formData.date_str ? format(new Date(formData.date_str), "MMMM d, yyyy h:mm aa", { locale: dateLocale }) : null}
                                      className="form-control form-control-lg"
                                      dateFormat="MMMM d, yyyy h:mm aa"
                                      locale={dateLocale}
                                      showTimeSelect
                                      timeIntervals="1"
                                      popperProps={{ strategy: 'fixed' }}
                                      onChange={(value) => { formData.date_str = value; setFormData({ ...formData }); }}
                                    />
                                  </div>
                                </div>
                                {/* Row 3: Remarks */}
                                <div className="sc-sub-row" style={{ alignItems: 'flex-end' }}>
                                  <textarea
                                    value={formData.remarks || ''}
                                    onChange={(e) => { formData.remarks = e.target.value; setFormData({ ...formData }); }}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); } }}
                                    className="form-control"
                                    placeholder={t('Remarks')}
                                    style={{ resize: 'none', fontSize: '13px', height: '38px', flex: '1 1 0', minWidth: 0 }}
                                  />
                                </div>
                              </div>
                            </div>
                            {/* Right: selected vendor info */}
                            {selectedVendors.length > 0 && formData.vendor_id ? (() => {
                              const v = selectedVendors[0];
                              const sep = <span style={{ width: '1px', height: '12px', background: '#c3c6d7', flexShrink: 0 }} />;
                              const phone = v.phone || formData.phone;
                              const vatNo = v.vat_no || formData.vat_no;
                              return (
                                <div className="sc-header-right" style={{ padding: '4px 14px', background: 'rgba(0,74,198,0.03)', borderLeft: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px', overflow: 'hidden', minHeight: '40px' }}>
                                  {v.code && <span style={{ background: '#dbeafe', color: '#1e40af', borderRadius: '4px', padding: '1px 7px', fontSize: '12px', fontWeight: 700, letterSpacing: '0.03em', flexShrink: 0 }}>{v.code}</span>}
                                  <span style={{ fontWeight: 700, fontSize: '15px', color: '#191c1e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, maxWidth: '280px' }}>{v.name}</span>
                                  {v.name_in_arabic && <><span style={{ color: '#c3c6d7', fontSize: '13px', flexShrink: 0 }}>|</span><span style={{ fontSize: '13px', color: '#64748b', fontFamily: 'Arial, sans-serif' }}>{v.name_in_arabic}</span></>}
                                  {(phone || vatNo) && sep}
                                  {phone && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#374151', flexShrink: 0 }}><i className="bi bi-telephone" style={{ color: '#6b7280', fontSize: '12px' }} />{phone}</span>}
                                  {phone && vatNo && sep}
                                  {vatNo && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#374151', flexShrink: 0 }}><i className="bi bi-receipt" style={{ color: '#6b7280', fontSize: '12px' }} /><span style={{ color: '#6b7280' }}>VAT:</span>{vatNo}</span>}
                                  {(v.credit_balance !== undefined) && (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', userSelect: 'none' }} onClick={() => openVendorPending(v)} title={t('Click to view pendings')}>
                                      <i className="bi bi-wallet2" style={{ color: '#004ac6', fontSize: '13px' }} />
                                      <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: 500 }}>{t('Cr.Balance')}:</span>
                                      <strong style={{ fontSize: '15px', fontWeight: 700, color: (v.credit_balance ?? 0) > 0 ? '#dc2626' : '#16a34a' }}><Amount amount={trimTo2Decimals(v.credit_balance ?? 0)} /></strong>
                                    </span>
                                  )}
                                </div>
                              );
                            })() : <div className="sc-header-right" />}
                          </div>
                        </section>
                        <div style={{ overflowX: 'auto', maxHeight: '55vh', overflowY: 'auto', marginTop: '6px' }}>
                            <table className="sc-type2-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px', tableLayout: 'fixed' }}>
                                <colgroup>{purchaseReturnSPColumns.filter(c => c.visible).map(col => <col key={col.key} style={{ width: `${scColWidths[col.key] ?? SC_COL_DEFAULTS_PR[col.key] ?? 100}px` }} />)}</colgroup>
                                <thead style={{ backgroundColor: '#f1f5f9', position: 'sticky', top: 0, zIndex: 1 }}>
                                    {(() => {
                                        const thStyle = { padding: '10px 12px', fontWeight: 600, borderBottom: '2px solid #c3c6d7', whiteSpace: 'nowrap', position: 'relative', overflow: 'hidden' };
                                        const resizeHandle = (colKey) => (<div onMouseDown={(e) => startScColResize(e, colKey, scColWidths[colKey] ?? SC_COL_DEFAULTS_PR[colKey] ?? 60)} style={{ position: 'absolute', right: 0, top: '20%', bottom: '20%', width: '4px', cursor: 'col-resize', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1px', borderRadius: '2px', backgroundColor: 'transparent' }} onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#dbeafe'; Array.from(e.currentTarget.children).forEach(d => d.style.backgroundColor = '#3b82f6'); }} onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; Array.from(e.currentTarget.children).forEach(d => d.style.backgroundColor = '#b0b7c3'); }}><div style={{ width: '1px', height: '100%', backgroundColor: '#b0b7c3', borderRadius: '1px', pointerEvents: 'none' }} /><div style={{ width: '1px', height: '100%', backgroundColor: '#b0b7c3', borderRadius: '1px', pointerEvents: 'none' }} /></div>);
                                        return (
                                            <tr style={{ fontSize: '12px', fontWeight: 600, color: '#434655', lineHeight: '16px' }}>
                                                {purchaseReturnSPColumns.filter(c => c.visible).map(col => {
                                                    if (col.key === 'select') return <th key={col.key} style={{ ...thStyle, textAlign: 'center' }}>{t("Select All")}<br /><input type="checkbox" className="form-check-input" checked={isAllSelected} onChange={handleSelectAll} />{resizeHandle('select')}</th>;
                                                    if (col.key === 'si_no') return <th key={col.key} style={thStyle}>#&nbsp;{resizeHandle('si_no')}</th>;
                                                    if (col.key === 'part_number') return <th key={col.key} style={thStyle}>{t('Part No.')}{resizeHandle('part_number')}</th>;
                                                    if (col.key === 'name') return <th key={col.key} style={thStyle}>{t('Name')}{resizeHandle('name')}</th>;
                                                    if (col.key === 'info') return <th key={col.key} style={thStyle}>{t('Info')}{resizeHandle('info')}</th>;
                                                    if (col.key === 'stock') return <th key={col.key} style={thStyle}>{t('Stock')}{resizeHandle('stock')}</th>;
                                                    if (col.key === 'warehouse') return store.settings?.enable_warehouse_module ? <th key={col.key} style={thStyle}>{t('Remove Stock From')}{resizeHandle('warehouse')}</th> : null;
                                                    if (col.key === 'qty') return <th key={col.key} style={{ ...thStyle, textAlign: 'center' }}>{t('Qty')}{resizeHandle('qty')}</th>;
                                                    if (col.key === 'unit_price') return <th key={col.key} style={{ ...thStyle, textAlign: 'right' }}>{t('U. Price (ex. VAT)')}{resizeHandle('unit_price')}</th>;
                                                    if (col.key === 'unit_price_with_vat') return <th key={col.key} style={{ ...thStyle, textAlign: 'right' }}>{t('U. Price (inc. VAT)')}{resizeHandle('unit_price_with_vat')}</th>;
                                                    if (col.key === 'unit_discount') return <th key={col.key} style={{ ...thStyle, textAlign: 'right' }}>{t('U. Disc. (ex. VAT)')}{resizeHandle('unit_discount')}</th>;
                                                    if (col.key === 'unit_discount_with_vat') return <th key={col.key} style={{ ...thStyle, textAlign: 'right' }}>{t('U. Disc. (inc. VAT)')}{resizeHandle('unit_discount_with_vat')}</th>;
                                                    if (col.key === 'unit_discount_percent') return <th key={col.key} style={{ ...thStyle, textAlign: 'right' }}>{t('U. Disc. %')}{resizeHandle('unit_discount_percent')}</th>;
                                                    if (col.key === 'price') return <th key={col.key} style={{ ...thStyle, textAlign: 'right' }}>{t('Total (ex. VAT)')}{resizeHandle('price')}</th>;
                                                    if (col.key === 'price_with_vat') return <th key={col.key} style={{ ...thStyle, textAlign: 'right' }}>{t('Total (inc. VAT)')}{resizeHandle('price_with_vat')}</th>;
                                                    return null;
                                                })}
                                            </tr>
                                        );
                                    })()}
                                </thead>
                                <tbody style={{ fontSize: '13px', color: '#191c1e' }}>
                                    {selectedProducts.map((product, index) => {
                                        // Find all indexes with the same product_id
                                        const duplicateIndexes = selectedProducts
                                            .map((p, i) => p.product_id === product.product_id ? i : -1)
                                            .filter(i => i !== -1);
                                        const duplicateCount = duplicateIndexes.length;
                                        return (
                                            <tr className="text-center">
                                                {purchaseReturnSPColumns.filter(c => c.visible).map(col => {
                                                    if (col.key === 'select') return (<td key="select">
                                                        <input
                                                            id={`${"purchase_return_product_select" + index}`} name={`${"purchase_return_product_select" + index}`}
                                                            type="checkbox" checked={selectedProducts[index].selected} onChange={(e) => {
                                                                selectedProducts[index].selected = !selectedProducts[index].selected;
                                                                /*
                                                                if (selectedProducts[index].selected === true) {
                                                                    if (selectedProducts[index].quantity === 0) {
                                                                        selectedProducts[index].quantity = 1;
                                                                    }
                                                                } else {
                                                                    selectedProducts[index].quantity = 0;
                                                                }*/
                                                                setSelectedProducts([...selectedProducts]);
                                                                reCalculate();
                                                            }} />
                                                    </td>);
                                                    if (col.key === 'si_no') return (<td key="si_no" style={{ verticalAlign: 'middle', padding: '0.25rem' }}>{index + 1}</td>);
                                                    // eslint-disable-next-line no-lone-blocks
                                                    {/*<td style={{ verticalAlign: 'middle', padding: '0.25rem', width: "auto", whiteSpace: "nowrap" }}>
                                                <OverflowTooltip maxWidth={120} value={product.prefix_part_number ? product.prefix_part_number + " - " + product.part_number : product.part_number} />
                                            </td>*/}
                                                    if (col.key === 'part_number') return (<ResizableTableCell key="part_number" style={{ verticalAlign: 'middle', padding: '0.25rem' }}
                                                    >
                                                        <input type="text" id={`${"purchase_return_product_part_number" + index}`}
                                                            name={`${"purchase_return_product_part_number" + index}`}
                                                            onWheel={(e) => e.target.blur()}

                                                            value={selectedProducts[index].part_number}
                                                            className={`form-control text-start ${errors["part_number_" + index] ? 'is-invalid' : ''} ${warnings["part_number_" + index] ? 'border-warning text-warning' : ''}`}
                                                            onKeyDown={(e) => {
                                                                RunKeyActions(e, product);
                                                            }}
                                                            placeholder={t('Part No.')} onChange={(e) => {
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
                                                    </ResizableTableCell>);
                                                    if (col.key === 'name') return (<ResizableTableCell key="name" style={{ verticalAlign: 'middle', padding: '0.25rem' }}
                                                    >
                                                        <div className="input-group" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                                            <input type="text" id={`${"purchase_return_product_name" + index}`}
                                                                name={`${"purchase_return_product_name" + index}`}
                                                                onWheel={(e) => e.target.blur()}
                                                                value={product.name}
                                                                className={`form-control text-start ${errors["name_" + index] ? 'is-invalid' : ''} ${warnings["name_" + index] ? 'border-warning text-warning' : ''}`}
                                                                onKeyDown={(e) => {
                                                                    RunKeyActions(e, product);
                                                                }}
                                                                placeholder={t('Name')} onChange={(e) => {
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
                                                    if (col.key === 'info') return (<td key="info" style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
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

                                                                    <Dropdown.Item onClick={() => openQuotationHistory(product, "quotation")}>
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
                                                    </td>);
                                                    if (col.key === 'qty') return (<td key="qty" style={{
                                                        verticalAlign: 'middle',
                                                        padding: '0.25rem',
                                                        whiteSpace: 'nowrap',
                                                        width: 'auto',
                                                        position: 'relative',
                                                    }}>
                                                        <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                                                            <div className="input-group flex-nowrap" style={{ flex: '1 1 auto', minWidth: 0 }}>
                                                                <input
                                                                    style={{ minWidth: "40px", maxWidth: "120px" }}
                                                                    id={`${"purchase_return_product_quantity_" + index}`}
                                                                    name={`${"purchase_return_product_quantity_" + index}`}
                                                                    type="number"
                                                                    value={product.quantity}
                                                                    className="form-control"
                                                                    ref={(el) => {
                                                                        if (!inputRefs.current[index]) inputRefs.current[index] = {};
                                                                        inputRefs.current[index][`${"purchase_return_product_quantity_" + index}`] = el;
                                                                    }}
                                                                    onFocus={() => {
                                                                        if (timerRef.current) clearTimeout(timerRef.current);
                                                                        timerRef.current = setTimeout(() => {
                                                                            inputRefs.current[index][`${"purchase_return_product_quantity_" + index}`].select();
                                                                        }, 100);
                                                                    }}
                                                                    onKeyDown={(e) => {
                                                                        RunKeyActions(e, product);

                                                                        if (e.key === "ArrowLeft") {
                                                                            timerRef.current = setTimeout(() => {
                                                                                if ((index + 1) < selectedProducts.length) {
                                                                                    inputRefs.current[index + 1][`${"purchase_return_unit_discount_with_vat_" + (index + 1)}`]?.focus();
                                                                                }
                                                                            }, 100);
                                                                        }
                                                                    }}

                                                                    placeholder={t('Quantity')}
                                                                    onChange={(e) => {
                                                                        if (timerRef.current) clearTimeout(timerRef.current);
                                                                        delete errors["quantity_" + index];
                                                                        setErrors({ ...errors });

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
                                                                                checkWarnings(index);
                                                                                checkErrors(index);
                                                                                CalCulateLineTotals(index);
                                                                                reCalculate(index);
                                                                            }, 100);
                                                                            return;
                                                                        }


                                                                        product.quantity = parseFloat(e.target.value);
                                                                        selectedProducts[index].quantity = parseFloat(e.target.value);
                                                                        setSelectedProducts([...selectedProducts]);

                                                                        timerRef.current = setTimeout(() => {
                                                                            checkWarnings(index);
                                                                            checkErrors(index);
                                                                            CalCulateLineTotals(index);
                                                                            reCalculate(index);
                                                                        }, 100);


                                                                    }} />
                                                                <span className="input-group-text" id="basic-addon2">{selectedProducts[index].unit ? selectedProducts[index].unit[0]?.toUpperCase() : "P"}</span>
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
                                                    if (col.key === 'warehouse') return store.settings?.enable_warehouse_module ? (<td key="warehouse" style={{
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
                                                            <option value="main_store">{t('Main Store')}</option>
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
                                                    </td>) : null;
                                                    if (col.key === 'unit_price') return (<td key="unit_price" style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                        <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                                                            <div className="input-group flex-nowrap" style={{ flex: '1 1 auto', minWidth: 0 }}>
                                                                <input
                                                                    type="number"
                                                                    id={`${"purchase_return_product_unit_price_" + index}`}
                                                                    name={`${"purchase_return_product_unit_price_" + index}`}
                                                                    onWheel={(e) => e.target.blur()}
                                                                    value={selectedProducts[index].purchase_unit_price}
                                                                    className="form-control text-end"
                                                                    placeholder={t('Unit Price')}
                                                                    ref={(el) => {
                                                                        if (!inputRefs.current[index]) inputRefs.current[index] = {};
                                                                        inputRefs.current[index][`${"purchase_return_product_unit_price_" + index}`] = el;
                                                                    }}
                                                                    onFocus={() => {
                                                                        if (timerRef.current) clearTimeout(timerRef.current);
                                                                        timerRef.current = setTimeout(() => {
                                                                            inputRefs.current[index][`${"purchase_return_product_unit_price_" + index}`].select();
                                                                        }, 100);
                                                                    }}
                                                                    onKeyDown={(e) => {
                                                                        RunKeyActions(e, product);

                                                                        if (timerRef.current) clearTimeout(timerRef.current);
                                                                        if (e.key === "Backspace") {
                                                                            selectedProducts[index].purchase_unit_price_with_vat = "";
                                                                            selectedProducts[index].purchase_unit_price = "";
                                                                            setSelectedProducts([...selectedProducts]);
                                                                            timerRef.current = setTimeout(() => {
                                                                                checkErrors(index);
                                                                                checkWarnings(index);
                                                                                CalCulateLineTotals(index);
                                                                                reCalculate(index);
                                                                            }, 100);
                                                                        } else if (e.key === "ArrowLeft") {
                                                                            timerRef.current = setTimeout(() => {
                                                                                inputRefs.current[index][`${"purchase_return_product_quantity_" + index}`].focus();
                                                                            }, 100);
                                                                        }
                                                                    }}

                                                                    onChange={(e) => {
                                                                        if (timerRef.current) clearTimeout(timerRef.current);

                                                                        delete errors["purchasereturn_unit_price_" + index];

                                                                        setErrors({ ...errors });

                                                                        if (parseFloat(e.target.value) === 0) {
                                                                            selectedProducts[index].purchase_unit_price = e.target.value;
                                                                            selectedProducts[index].purchase_unit_price_with_vat = e.target.value;
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
                                                                            selectedProducts[index].purchase_unit_price = "";
                                                                            selectedProducts[index].purchase_unit_price_with_vat = "";
                                                                            setSelectedProducts([...selectedProducts]);
                                                                            timerRef.current = setTimeout(() => {
                                                                                checkWarnings(index);
                                                                                checkErrors(index);
                                                                                CalCulateLineTotals(index);
                                                                                reCalculate(index);
                                                                            }, 100);
                                                                            return;
                                                                        }

                                                                        if (/^\d*\.?\d{0,8}$/.test(parseFloat(e.target.value)) === false) {
                                                                            errors["purchasereturn_unit_price_" + index] = t("Max. decimal points allowed is 8");
                                                                            setErrors({ ...errors });
                                                                        }

                                                                        selectedProducts[index].purchase_unit_price = parseFloat(e.target.value);


                                                                        // selectedProducts[index].unit_price_with_vat = parseFloat(trimTo2Decimals(selectedProducts[index].unit_price * (1 + (formData.vat_percent / 100))));
                                                                        // console.log("selectedProducts[index].unit_price:", selectedProducts[index].unit_price);
                                                                        setSelectedProducts([...selectedProducts]);
                                                                        timerRef.current = setTimeout(() => {
                                                                            selectedProducts[index].purchase_unit_price_with_vat = parseFloat(trimTo8Decimals(selectedProducts[index].purchase_unit_price * (1 + (formData.vat_percent / 100))))
                                                                            selectedProducts[index].unit_discount_percent = parseFloat(trimTo8Decimals(((selectedProducts[index].unit_discount / selectedProducts[index].purchase_unit_price) * 100)))
                                                                            selectedProducts[index].unit_discount_percent_with_vat = parseFloat(trimTo8Decimals(((selectedProducts[index].unit_discount_with_vat / selectedProducts[index].purchase_unit_price_with_vat) * 100)))

                                                                            checkWarnings(index);
                                                                            checkErrors(index);
                                                                            CalCulateLineTotals(index);
                                                                            reCalculate(index);
                                                                        }, 100);

                                                                    }} />

                                                            </div>
                                                            {(errors[`purchasereturn_unit_price_${index}`] || warnings[`purchasereturn_unit_price_${index}`]) && (
                                                                <i
                                                                    className={`bi bi-exclamation-circle-fill ${errors[`purchasereturn_unit_price_${index}`] ? 'text-danger' : 'text-warning'} ms-2`}
                                                                    data-bs-toggle="tooltip"
                                                                    data-bs-placement="top"
                                                                    data-error={errors[`purchasereturn_unit_price_${index}`] || ''}
                                                                    data-warning={warnings[`purchasereturn_unit_price_${index}`] || ''}
                                                                    title={errors[`purchasereturn_unit_price_${index}`] || warnings[`purchasereturn_unit_price_${index}`] || ''}
                                                                    style={{
                                                                        fontSize: '1rem',
                                                                        cursor: 'pointer',
                                                                        whiteSpace: 'nowrap',
                                                                    }}
                                                                ></i>
                                                            )}
                                                        </div>
                                                    </td>);
                                                    if (col.key === 'unit_price_with_vat') return (<td key="unit_price_with_vat" style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                        <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                                                            <div className="input-group flex-nowrap" style={{ flex: '1 1 auto', minWidth: 0 }}>
                                                                <input type="number"
                                                                    id={`${"purchase_return_product_unit_price_with_vat_" + index}`}
                                                                    name={`${"purchase_return_product_unit_price_with_vat_" + index}`}
                                                                    onWheel={(e) => e.target.blur()}
                                                                    value={selectedProducts[index].purchase_unit_price_with_vat}
                                                                    className="form-control text-end"
                                                                    ref={(el) => {
                                                                        if (!inputRefs.current[index]) inputRefs.current[index] = {};
                                                                        inputRefs.current[index][`${"purchase_return_product_unit_price_with_vat_" + index}`] = el;
                                                                    }}
                                                                    placeholder={t('Unit Price(with VAT)')}
                                                                    onFocus={() => {
                                                                        if (timerRef.current) clearTimeout(timerRef.current);
                                                                        timerRef.current = setTimeout(() => {
                                                                            inputRefs.current[index][`${"purchase_return_product_unit_price_with_vat_" + index}`].select();
                                                                        }, 100);
                                                                    }}

                                                                    onKeyDown={(e) => {
                                                                        RunKeyActions(e, product);

                                                                        if (timerRef.current) clearTimeout(timerRef.current);
                                                                        if (e.key === "Backspace") {
                                                                            selectedProducts[index].purchase_unit_price_with_vat = "";
                                                                            selectedProducts[index].purchase_unit_price = "";
                                                                            setSelectedProducts([...selectedProducts]);
                                                                            timerRef.current = setTimeout(() => {
                                                                                checkErrors(index);
                                                                                checkWarnings(index);
                                                                                CalCulateLineTotals(index);
                                                                                reCalculate(index);
                                                                            }, 300);
                                                                        } else if (e.key === "ArrowLeft") {
                                                                            timerRef.current = setTimeout(() => {
                                                                                inputRefs.current[index][`${"purchase_return_product_unit_price_" + index}`].focus();
                                                                            }, 200);
                                                                        }
                                                                    }}
                                                                    onChange={(e) => {
                                                                        if (timerRef.current) clearTimeout(timerRef.current);

                                                                        delete errors["purchasereturn_unit_price_with_vat_" + index];
                                                                        setErrors({ ...errors });

                                                                        if (parseFloat(e.target.value) === 0) {
                                                                            selectedProducts[index].purchase_unit_price_with_vat = e.target.value;
                                                                            selectedProducts[index].purchase_unit_price = e.target.value;
                                                                            setSelectedProducts([...selectedProducts]);

                                                                            // Set new debounce timer
                                                                            timerRef.current = setTimeout(() => {
                                                                                checkErrors(index);
                                                                                checkWarnings(index);
                                                                                CalCulateLineTotals(index);
                                                                                reCalculate(index);
                                                                            }, 100);
                                                                            return;
                                                                        }

                                                                        if (!e.target.value) {
                                                                            selectedProducts[index].purchase_unit_price_with_vat = "";
                                                                            selectedProducts[index].purchase_unit_price = "";
                                                                            setSelectedProducts([...selectedProducts]);

                                                                            timerRef.current = setTimeout(() => {
                                                                                checkErrors(index);
                                                                                checkWarnings(index);
                                                                                CalCulateLineTotals(index);
                                                                                reCalculate(index);
                                                                            }, 100);
                                                                            return;
                                                                        }

                                                                        if (/^\d*\.?\d{0,8}$/.test(parseFloat(e.target.value)) === false) {
                                                                            errors["purchasereturn_unit_price_with_vat_" + index] = t("Max. decimal points allowed is 8");
                                                                            setErrors({ ...errors });
                                                                        }

                                                                        selectedProducts[index].purchase_unit_price_with_vat = parseFloat(e.target.value);


                                                                        // Set new debounce timer
                                                                        timerRef.current = setTimeout(() => {
                                                                            selectedProducts[index].purchase_unit_price = parseFloat(trimTo8Decimals(selectedProducts[index].purchase_unit_price_with_vat / (1 + (formData.vat_percent / 100))))
                                                                            selectedProducts[index].unit_discount_with_vat = parseFloat(trimTo8Decimals(selectedProducts[index].unit_discount * (1 + (formData.vat_percent / 100))))
                                                                            selectedProducts[index].unit_discount_percent = parseFloat(trimTo8Decimals(((selectedProducts[index].unit_discount / selectedProducts[index].purchase_unit_price) * 100)))
                                                                            selectedProducts[index].unit_discount_percent_with_vat = parseFloat(trimTo8Decimals(((selectedProducts[index].unit_discount_with_vat / selectedProducts[index].purchase_unit_price_with_vat) * 100)))
                                                                            setSelectedProducts([...selectedProducts]);
                                                                            checkErrors(index);
                                                                            checkWarnings(index);
                                                                            CalCulateLineTotals(index);
                                                                            reCalculate(index);
                                                                        }, 100);
                                                                    }} />
                                                            </div>
                                                            {(errors[`purchasereturn_unit_price_with_vat_${index}`] || warnings[`purchasereturn_unit_price_with_vat_${index}`]) && (
                                                                <i
                                                                    className={`bi bi-exclamation-circle-fill ${errors[`purchasereturn_unit_price_with_vat_${index}`] ? 'text-danger' : 'text-warning'} ms-2`}
                                                                    data-bs-toggle="tooltip"
                                                                    data-bs-placement="top"
                                                                    data-error={errors[`purchasereturn_unit_price_with_vat_${index}`] || ''}
                                                                    data-warning={warnings[`purchasereturn_unit_price_with_vat_${index}`] || ''}
                                                                    title={errors[`purchasereturn_unit_price_with_vat_${index}`] || warnings[`purchasereturn_unit_price_with_vat_${index}`] || ''}
                                                                    style={{
                                                                        fontSize: '1rem',
                                                                        cursor: 'pointer',
                                                                        whiteSpace: 'nowrap',
                                                                    }}
                                                                ></i>
                                                            )}
                                                        </div>
                                                    </td>);
                                                    if (col.key === 'unit_discount') return (<td key="unit_discount" style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                        <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                                                            <div className="input-group flex-nowrap" style={{ flex: '1 1 auto', minWidth: 0 }}>
                                                                <input type="number" id={`${"purchase_return_unit_discount_" + index}`} name={`${"purchase_return_unit_discount_" + index}`} onWheel={(e) => e.target.blur()} className="form-control text-end purchase_unit_discount"
                                                                    value={selectedProducts[index].unit_discount}
                                                                    ref={(el) => {
                                                                        if (!inputRefs.current[index]) inputRefs.current[index] = {};
                                                                        inputRefs.current[index][`${"purchase_return_unit_discount_" + index}`] = el;
                                                                    }}
                                                                    onFocus={() => {
                                                                        if (timerRef.current) clearTimeout(timerRef.current);
                                                                        timerRef.current = setTimeout(() => {
                                                                            inputRefs.current[index][`${"purchase_return_unit_discount_" + index}`].select();
                                                                        }, 100);
                                                                    }}
                                                                    onKeyDown={(e) => {
                                                                        RunKeyActions(e, product);

                                                                        if (timerRef.current) clearTimeout(timerRef.current);

                                                                        if (e.key === "Enter") {
                                                                            if (selectedProducts.length > (index - 1) && index > 0) {
                                                                                console.log("Moving to next line");
                                                                                timerRef.current = setTimeout(() => {
                                                                                    inputRefs.current[index - 1][`${"purchase_return_product_quantity_" + (index - 1)}`]?.focus();
                                                                                }, 100);
                                                                            } else {
                                                                                timerRef.current = setTimeout(() => {
                                                                                    inputRefs.current[selectedProducts.length - 1][`${"purchase_return_product_quantity_" + (selectedProducts.length - 1)}`]?.focus();
                                                                                }, 100);
                                                                            }
                                                                        } else if (e.key === "ArrowLeft") {
                                                                            timerRef.current = setTimeout(() => {
                                                                                inputRefs.current[index][`${"purchase_return_product_unit_price_with_vat_" + index}`].focus();
                                                                            }, 100);
                                                                        }
                                                                    }}
                                                                    onChange={(e) => {
                                                                        if (timerRef.current) clearTimeout(timerRef.current);

                                                                        if (parseFloat(e.target.value) === 0) {
                                                                            selectedProducts[index].unit_discount = 0;
                                                                            selectedProducts[index].unit_discount_with_vat = 0.00;
                                                                            selectedProducts[index].unit_discount_percent = 0.00;
                                                                            selectedProducts[index].unit_discount_percent_with_vat = 0.00;
                                                                            setFormData({ ...formData });
                                                                            timerRef.current = setTimeout(() => {
                                                                                checkErrors(index);
                                                                                checkWarnings(index);
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
                                                                                checkErrors(index);
                                                                                checkWarnings(index);
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
                                                                                checkErrors(index);
                                                                                checkWarnings(index);
                                                                                CalCulateLineTotals(index);
                                                                                reCalculate(index);
                                                                            }, 100);
                                                                            //setErrors({ ...errors });
                                                                            return;
                                                                        }

                                                                        delete errors["unit_discount_" + index];
                                                                        delete errors["unit_discount_percent_" + index];
                                                                        setErrors({ ...errors });

                                                                        if (/^\d*\.?\d{0,8}$/.test(parseFloat(e.target.value)) === false) {
                                                                            errors["unit_discount_" + index] = t("Max. decimal points allowed is 8");
                                                                            setErrors({ ...errors });
                                                                        }

                                                                        selectedProducts[index].unit_discount = parseFloat(e.target.value);


                                                                        setFormData({ ...formData });
                                                                        timerRef.current = setTimeout(() => {
                                                                            selectedProducts[index].unit_discount_with_vat = parseFloat(trimTo2Decimals(selectedProducts[index].unit_discount * (1 + (formData.vat_percent / 100))))

                                                                            selectedProducts[index].unit_discount_percent = parseFloat(trimTo2Decimals(((selectedProducts[index].unit_discount / selectedProducts[index].purchase_unit_price) * 100)))
                                                                            selectedProducts[index].unit_discount_percent_with_vat = parseFloat(trimTo2Decimals(((selectedProducts[index].unit_discount_with_vat / selectedProducts[index].purchase_unit_price_with_vat) * 100)))

                                                                            checkErrors(index);
                                                                            checkWarnings(index);
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
                                                                    data-warning={warnings[`unit_discount_${index}`] || ''}
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
                                                    if (col.key === 'unit_discount_with_vat') return (<td key="unit_discount_with_vat" style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                        <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                                                            <div className="input-group flex-nowrap" style={{ flex: '1 1 auto', minWidth: 0 }}>
                                                                <input type="number"
                                                                    id={`${"purchase_return_unit_discount_with_vat_" + index}`}
                                                                    name={`${"purchase_return_unit_discount_with_vat_" + index}`}
                                                                    onWheel={(e) => e.target.blur()}
                                                                    className="form-control text-end"
                                                                    value={selectedProducts[index].unit_discount_with_vat}
                                                                    ref={(el) => {
                                                                        if (!inputRefs.current[index]) inputRefs.current[index] = {};
                                                                        inputRefs.current[index][`${"purchase_return_unit_discount_with_vat_" + index}`] = el;
                                                                    }}
                                                                    onFocus={() => {
                                                                        if (timerRef.current) clearTimeout(timerRef.current);
                                                                        timerRef.current = setTimeout(() => {
                                                                            inputRefs.current[index][`${"purchase_return_unit_discount_with_vat_" + index}`].select();
                                                                        }, 100);
                                                                    }}
                                                                    onKeyDown={(e) => {
                                                                        RunKeyActions(e, product);

                                                                        if (timerRef.current) clearTimeout(timerRef.current);

                                                                        if (e.key === "Enter") {
                                                                            if (selectedProducts.length > (index - 1) && index > 0) {
                                                                                console.log("Moving to next line");
                                                                                timerRef.current = setTimeout(() => {
                                                                                    inputRefs.current[index - 1][`${"purchase_return_product_quantity_" + (index - 1)}`]?.focus();
                                                                                }, 100);
                                                                            } else {
                                                                                timerRef.current = setTimeout(() => {
                                                                                    inputRefs.current[selectedProducts.length - 1][`${"purchase_return_product_quantity_" + (selectedProducts.length - 1)}`]?.focus();
                                                                                }, 100);
                                                                            }
                                                                        } else if (e.key === "ArrowLeft") {
                                                                            timerRef.current = setTimeout(() => {
                                                                                inputRefs.current[index][`${"purchase_return_unit_discount_" + index}`].focus();
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

                                                                            timerRef.current = setTimeout(() => {
                                                                                checkErrors(index);
                                                                                checkWarnings(index);
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
                                                                            errors["unit_discount_" + index] = t("Unit discount should be >= 0");
                                                                            setErrors({ ...errors });
                                                                            timerRef.current = setTimeout(() => {
                                                                                checkErrors(index);
                                                                                checkWarnings(index);
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

                                                                            setFormData({ ...formData });
                                                                            timerRef.current = setTimeout(() => {
                                                                                checkErrors(index);
                                                                                checkWarnings(index);
                                                                                CalCulateLineTotals(index);
                                                                                reCalculate(index);
                                                                            }, 100);

                                                                            return;
                                                                        }

                                                                        delete errors["unit_discount_with_vat_" + index];
                                                                        delete errors["unit_discount_percent_" + index];
                                                                        setErrors({ ...errors });


                                                                        if (/^\d*\.?\d{0,8}$/.test(parseFloat(e.target.value)) === false) {
                                                                            errors["unit_discount_with_vat_" + index] = t("Max. decimal points allowed is 8");
                                                                            setErrors({ ...errors });
                                                                        }

                                                                        selectedProducts[index].unit_discount_with_vat = parseFloat(e.target.value); //input

                                                                        setFormData({ ...formData });
                                                                        timerRef.current = setTimeout(() => {

                                                                            selectedProducts[index].unit_discount = parseFloat(trimTo2Decimals(selectedProducts[index].unit_discount_with_vat / (1 + (formData.vat_percent / 100))))
                                                                            selectedProducts[index].unit_discount_percent = parseFloat(trimTo2Decimals(((selectedProducts[index].unit_discount / selectedProducts[index].unit_price) * 100)))
                                                                            selectedProducts[index].unit_discount_percent_with_vat = parseFloat(trimTo2Decimals(((selectedProducts[index].unit_discount_with_vat / selectedProducts[index].unit_price_with_vat) * 100)))

                                                                            checkErrors(index);
                                                                            checkWarnings(index);
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
                                                    if (col.key === 'unit_discount_percent') return (<td key="unit_discount_percent" style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                        <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                                                            <div className="input-group flex-nowrap" style={{ flex: '1 1 auto', minWidth: 0 }}>
                                                                <input type="number"
                                                                    id={`${"purchase_return_unit_discount_percent" + index}`}
                                                                    disabled={true}
                                                                    name={`${"purchase_return_unit_discount_percent" + index}`}
                                                                    onWheel={(e) => e.target.blur()}
                                                                    className="form-control text-end"
                                                                    value={selectedProducts[index].unit_discount_percent}
                                                                    onChange={(e) => {
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
                                                                                checkErrors(index);
                                                                                checkWarnings(index);
                                                                                CalCulateLineTotals(index);
                                                                                reCalculate(index);
                                                                            }, 100);
                                                                            return;
                                                                        }

                                                                        if (parseFloat(e.target.value) < 0) {
                                                                            selectedProducts[index].unit_discount_percent = 0.00;
                                                                            selectedProducts[index].unit_discount_with_vat = 0.00;
                                                                            selectedProducts[index].unit_discount = 0.00;
                                                                            selectedProducts[index].unit_discount_percent_with_vat = 0.00;
                                                                            setFormData({ ...formData });
                                                                            errors["unit_discount_percent_" + index] = t("Unit discount % should be >= 0");
                                                                            setErrors({ ...errors });
                                                                            timerRef.current = setTimeout(() => {
                                                                                checkErrors(index);
                                                                                checkWarnings(index);
                                                                                CalCulateLineTotals(index);
                                                                                reCalculate(index);
                                                                            }, 100);
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
                                                                                checkErrors(index);
                                                                                checkWarnings(index);
                                                                                CalCulateLineTotals(index);
                                                                                reCalculate(index);
                                                                            }, 100);
                                                                            //setErrors({ ...errors });
                                                                            return;
                                                                        }

                                                                        errors["unit_discount_percent_" + index] = "";
                                                                        errors["unit_discount_" + index] = "";
                                                                        setErrors({ ...errors });

                                                                        selectedProducts[index].unit_discount_percent = parseFloat(e.target.value); //input


                                                                        setFormData({ ...formData });

                                                                        timerRef.current = setTimeout(() => {
                                                                            selectedProducts[index].unit_discount = parseFloat(trimTo8Decimals(selectedProducts[index].purchase_unit_price * (selectedProducts[index].unit_discount_percent / 100)));
                                                                            selectedProducts[index].unit_discount_with_vat = parseFloat(trimTo8Decimals(selectedProducts[index].unit_discount * (1 + (formData.vat_percent / 100))))
                                                                            selectedProducts[index].unit_discount_percent_with_vat = parseFloat(trimTo8Decimals(((selectedProducts[index].unit_discount_with_vat / selectedProducts[index].purchase_unit_price_with_vat) * 100)))

                                                                            checkErrors(index);
                                                                            checkWarnings(index);
                                                                            CalCulateLineTotals(index);
                                                                            reCalculate(index);
                                                                        }, 100);
                                                                    }} />
                                                            </div>
                                                            {(errors[`unit_discount_percent_${index}`] || warnings[`unit_discount_percent_${index}`]) && (
                                                                <i
                                                                    className={`bi bi-exclamation-circle-fill ${errors[`unit_discount_percent_${index}`] ? 'text-danger' : 'text-warning'} ms-2`}
                                                                    data-bs-toggle="tooltip"
                                                                    data-bs-placement="top"
                                                                    data-error={errors[`unit_discount_percent_${index}`] || ''}
                                                                    data-warning={warnings[`unit_discount_percent_${index}`] || ''}
                                                                    title={errors[`unit_discount_percent_${index}`] || warnings[`unit_discount_percent_${index}`] || ''}
                                                                    style={{
                                                                        fontSize: '1rem',
                                                                        cursor: 'pointer',
                                                                        whiteSpace: 'nowrap',
                                                                    }}
                                                                ></i>
                                                            )}
                                                        </div>
                                                    </td>);
                                                    if (col.key === 'price') return (<td key="price" style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                        <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                                                            <div className="input-group flex-nowrap" style={{ flex: '1 1 auto', minWidth: 0 }}>
                                                                <input type="number"
                                                                    id={`${"purchase_return_product_line_total_" + index}`}
                                                                    name={`${"purchase_return_product_line_total_" + index}`}
                                                                    onWheel={(e) => e.target.blur()}
                                                                    value={selectedProducts[index].line_total}
                                                                    className={`form-control text-end ${errors["line_total_" + index] ? 'is-invalid' : ''} ${warnings["line_total_" + index] ? 'border-warning text-warning' : ''}`}
                                                                    placeholder={t('Line total')}
                                                                    ref={(el) => {
                                                                        if (!inputRefs.current[index]) inputRefs.current[index] = {};
                                                                        inputRefs.current[index][`${"purchase_return_product_line_total_" + index}`] = el;
                                                                    }}

                                                                    onFocus={() => {
                                                                        if (timerRef.current) clearTimeout(timerRef.current);
                                                                        timerRef.current = setTimeout(() => {
                                                                            inputRefs.current[index][`${"purchase_return_product_line_total_" + index}`]?.select();
                                                                        }, 20);
                                                                    }}

                                                                    onKeyDown={(e) => {
                                                                        RunKeyActions(e, product);

                                                                        if (timerRef.current) clearTimeout(timerRef.current);
                                                                        if (e.key === "Backspace") {
                                                                            delete errors["line_total_" + index];
                                                                            selectedProducts[index].purchase_unit_price_with_vat = "";
                                                                            selectedProducts[index].purchase_unit_price = "";
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
                                                                                inputRefs.current[index][`${"purchase_return_product_unit_discount_with_vat_" + index}`]?.select();
                                                                            }, 100);
                                                                        }
                                                                    }}

                                                                    onChange={(e) => {
                                                                        delete errors["line_total_" + index];
                                                                        if (timerRef.current) clearTimeout(timerRef.current);
                                                                        if (parseFloat(e.target.value) === 0) {
                                                                            selectedProducts[index].purchase_unit_price = e.target.value;
                                                                            selectedProducts[index].purchase_unit_price_with_vat = e.target.value;
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
                                                                            selectedProducts[index].purchase_unit_price = e.target.value;
                                                                            selectedProducts[index].purchase_unit_price_with_vat = e.target.value;
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


                                                                        if (/^\d*\.?\d{0,8}$/.test(parseFloat(e.target.value)) === false) {
                                                                            errors["line_total_" + index] = t("Max decimal points allowed is 8");
                                                                            setErrors({ ...errors });
                                                                        }

                                                                        selectedProducts[index].line_total = parseFloat(e.target.value);
                                                                        setSelectedProducts([...selectedProducts]);

                                                                        timerRef.current = setTimeout(() => {
                                                                            if (selectedProducts[index].quantity > 0) {
                                                                                selectedProducts[index].purchase_unit_price = parseFloat(trimTo8Decimals((selectedProducts[index].line_total / selectedProducts[index].quantity) + selectedProducts[index].unit_discount));

                                                                                selectedProducts[index].purchase_unit_price_with_vat = parseFloat(trimTo8Decimals(selectedProducts[index].purchase_unit_price * (1 + (formData.vat_percent / 100))))

                                                                                selectedProducts[index].unit_discount_percent = parseFloat(trimTo8Decimals(((selectedProducts[index].unit_discount / selectedProducts[index].purchase_unit_price) * 100)))
                                                                                selectedProducts[index].unit_discount_percent_with_vat = parseFloat(trimTo8Decimals(((selectedProducts[index].unit_discount_with_vat / selectedProducts[index].purchase_unit_price_with_vat) * 100)))
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
                                                    if (col.key === 'price_with_vat') return (<td key="price_with_vat" style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                        <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                                                            <div className="input-group flex-nowrap" style={{ flex: '1 1 auto', minWidth: 0 }}>
                                                                <input type="number"
                                                                    id={`${"purchase_return_product_line_total_with_vat" + index}`}
                                                                    name={`${"purchase_return_product_line_total_with_vat" + index}`}
                                                                    onWheel={(e) => e.target.blur()}
                                                                    value={selectedProducts[index].line_total_with_vat}
                                                                    className={`form-control text-end ${errors["line_total_with_vat" + index] ? 'is-invalid' : ''} ${warnings["line_total_with_vat" + index] ? 'border-warning text-warning' : ''}`}
                                                                    placeholder={t('Line total(with VAT)')}
                                                                    ref={(el) => {
                                                                        if (!inputRefs.current[index]) inputRefs.current[index] = {};
                                                                        inputRefs.current[index][`${"purchase_return_product_line_total_with_vat" + index}`] = el;
                                                                    }}

                                                                    onFocus={() => {
                                                                        if (timerRef.current) clearTimeout(timerRef.current);
                                                                        timerRef.current = setTimeout(() => {
                                                                            inputRefs.current[index][`${"purchase_return_product_line_total_with_vat" + index}`]?.select();
                                                                        }, 20);
                                                                    }}

                                                                    onKeyDown={(e) => {
                                                                        RunKeyActions(e, product);

                                                                        if (timerRef.current) clearTimeout(timerRef.current);
                                                                        if (e.key === "Backspace") {
                                                                            delete errors["line_total_with_vat_" + index];
                                                                            selectedProducts[index].purchase_unit_price_with_vat = "";
                                                                            selectedProducts[index].purchase_unit_price = "";
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
                                                                                inputRefs.current[index][`${"purchase_return_product_line_total_" + index}`]?.select();
                                                                            }, 100);
                                                                        }
                                                                    }}

                                                                    onChange={(e) => {
                                                                        delete errors["line_total_with_vat_" + index];
                                                                        if (timerRef.current) clearTimeout(timerRef.current);
                                                                        if (parseFloat(e.target.value) === 0) {
                                                                            selectedProducts[index].purchase_unit_price = e.target.value;
                                                                            selectedProducts[index].purchase_unit_price_with_vat = e.target.value;
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
                                                                            selectedProducts[index].purchase_unit_price = e.target.value;
                                                                            selectedProducts[index].purchase_unit_price_with_vat = e.target.value;
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
                                                                                selectedProducts[index].purchase_unit_price_with_vat = parseFloat(trimTo8Decimals((selectedProducts[index].line_total_with_vat / selectedProducts[index].quantity) + selectedProducts[index].unit_discount_with_vat));
                                                                                selectedProducts[index].purchase_unit_price = parseFloat(trimTo8Decimals(selectedProducts[index].purchase_unit_price_with_vat / (1 + (formData.vat_percent / 100))))

                                                                                // selectedProducts[index].purchase_unit_price_with_vat = parseFloat(trimTo8Decimals(selectedProducts[index].purchase_unit_price * (1 + (formData.vat_percent / 100))))
                                                                                selectedProducts[index].unit_discount_percent = parseFloat(trimTo8Decimals(((selectedProducts[index].unit_discount / selectedProducts[index].purchase_unit_price) * 100)))
                                                                                selectedProducts[index].unit_discount_percent_with_vat = parseFloat(trimTo8Decimals(((selectedProducts[index].unit_discount_with_vat / selectedProducts[index].purchase_unit_price_with_vat) * 100)))
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
                        </>
                        ) : (
                        <div className="table-responsive" style={{ overflowX: "auto", overflowY: "scroll" }}>
                            <table className="table table-striped table-sm table-bordered">
                                <tbody>
                                    {(<tr className="text-center" style={{ borderBottom: "solid 2px" }}>
                                        {purchaseReturnSPColumns.filter(c => c.visible).map(col => {
                                            if (col.key === 'select') return <th key="select" style={{}}>{t('Select All')} <br /><input style={{}} type="checkbox" checked={isAllSelected} onChange={handleSelectAll} /></th>;
                                            if (col.key === 'si_no') return <th key="si_no">{t('SI No.')}</th>;
                                            if (col.key === 'part_number') return <th key="part_number">{t('Part No.')}</th>;
                                            if (col.key === 'name') return <th key="name" style={{ minWidth: "300px" }}>{t('Name')}</th>;
                                            if (col.key === 'info') return <th key="info">{t('Info')}</th>;
                                            if (col.key === 'stock') return <th key="stock">{t('Stock')}</th>;
                                            if (col.key === 'qty') return <th key="qty">{t('Qty')}</th>;
                                            if (col.key === 'warehouse') return store.settings?.enable_warehouse_module ? <th key="warehouse">{t('Remove Stock From')}</th> : null;
                                            if (col.key === 'unit_price') return <th key="unit_price">{t('Unit Price')}({t('without VAT')})</th>;
                                            if (col.key === 'unit_price_with_vat') return <th key="unit_price_with_vat">{t('Unit Price')}({t('with VAT')})</th>;
                                            if (col.key === 'unit_discount') return <th key="unit_discount">{t('Unit Disc.')}({t('without VAT')})</th>;
                                            if (col.key === 'unit_discount_with_vat') return <th key="unit_discount_with_vat">{t('Unit Disc.')}({t('with VAT')})</th>;
                                            if (col.key === 'unit_discount_percent') return <th key="unit_discount_percent">{t('Disc. %')}({t('without VAT')})</th>;
                                            if (col.key === 'price') return <th key="price">{t('Price')}({t('without VAT')})</th>;
                                            if (col.key === 'price_with_vat') return <th key="price_with_vat">{t('Price')}({t('with VAT')})</th>;
                                            return null;
                                        })}
                                    </tr>)}
                                    {selectedProducts.map((product, index) => {
                                        // Find all indexes with the same product_id
                                        const duplicateIndexes = selectedProducts
                                            .map((p, i) => p.product_id === product.product_id ? i : -1)
                                            .filter(i => i !== -1);
                                        const duplicateCount = duplicateIndexes.length;
                                        return (
                                            <tr className="text-center">
                                                {purchaseReturnSPColumns.filter(c => c.visible).map(col => {
                                                    if (col.key === 'select') return (<td key="select">
                                                        <input
                                                            id={`${"purchase_return_product_select" + index}`} name={`${"purchase_return_product_select" + index}`}
                                                            type="checkbox" checked={selectedProducts[index].selected} onChange={(e) => {
                                                                selectedProducts[index].selected = !selectedProducts[index].selected;
                                                                /*
                                                                if (selectedProducts[index].selected === true) {
                                                                    if (selectedProducts[index].quantity === 0) {
                                                                        selectedProducts[index].quantity = 1;
                                                                    }
                                                                } else {
                                                                    selectedProducts[index].quantity = 0;
                                                                }*/
                                                                setSelectedProducts([...selectedProducts]);
                                                                reCalculate();
                                                            }} />
                                                    </td>);
                                                    if (col.key === 'si_no') return (<td key="si_no" style={{ verticalAlign: 'middle', padding: '0.25rem' }}>{index + 1}</td>);
                                                    // eslint-disable-next-line no-lone-blocks
                                                    {/*<td style={{ verticalAlign: 'middle', padding: '0.25rem', width: "auto", whiteSpace: "nowrap" }}>
                                                <OverflowTooltip maxWidth={120} value={product.prefix_part_number ? product.prefix_part_number + " - " + product.part_number : product.part_number} />
                                            </td>*/}
                                                    if (col.key === 'part_number') return (<ResizableTableCell key="part_number" style={{ verticalAlign: 'middle', padding: '0.25rem' }}
                                                    >
                                                        <input type="text" id={`${"purchase_return_product_part_number" + index}`}
                                                            name={`${"purchase_return_product_part_number" + index}`}
                                                            onWheel={(e) => e.target.blur()}

                                                            value={selectedProducts[index].part_number}
                                                            className={`form-control text-start ${errors["part_number_" + index] ? 'is-invalid' : ''} ${warnings["part_number_" + index] ? 'border-warning text-warning' : ''}`}
                                                            onKeyDown={(e) => {
                                                                RunKeyActions(e, product);
                                                            }}
                                                            placeholder={t('Part No.')} onChange={(e) => {
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
                                                    </ResizableTableCell>);
                                                    if (col.key === 'name') return (<ResizableTableCell key="name" style={{ verticalAlign: 'middle', padding: '0.25rem' }}
                                                    >
                                                        <div className="input-group" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                                            <input type="text" id={`${"purchase_return_product_name" + index}`}
                                                                name={`${"purchase_return_product_name" + index}`}
                                                                onWheel={(e) => e.target.blur()}
                                                                value={product.name}
                                                                className={`form-control text-start ${errors["name_" + index] ? 'is-invalid' : ''} ${warnings["name_" + index] ? 'border-warning text-warning' : ''}`}
                                                                onKeyDown={(e) => {
                                                                    RunKeyActions(e, product);
                                                                }}
                                                                placeholder={t('Name')} onChange={(e) => {
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
                                                    if (col.key === 'info') return (<td key="info" style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
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

                                                                    <Dropdown.Item onClick={() => openQuotationHistory(product, "quotation")}>
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
                                                    </td>);
                                                    if (col.key === 'qty') return (<td key="qty" style={{
                                                        verticalAlign: 'middle',
                                                        padding: '0.25rem',
                                                        whiteSpace: 'nowrap',
                                                        width: 'auto',
                                                        position: 'relative',
                                                    }}>
                                                        <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                                                            <div className="input-group flex-nowrap" style={{ flex: '1 1 auto', minWidth: 0 }}>
                                                                <input
                                                                    style={{ minWidth: "40px", maxWidth: "120px" }}
                                                                    id={`${"purchase_return_product_quantity_" + index}`}
                                                                    name={`${"purchase_return_product_quantity_" + index}`}
                                                                    type="number"
                                                                    value={product.quantity}
                                                                    className="form-control"
                                                                    ref={(el) => {
                                                                        if (!inputRefs.current[index]) inputRefs.current[index] = {};
                                                                        inputRefs.current[index][`${"purchase_return_product_quantity_" + index}`] = el;
                                                                    }}
                                                                    onFocus={() => {
                                                                        if (timerRef.current) clearTimeout(timerRef.current);
                                                                        timerRef.current = setTimeout(() => {
                                                                            inputRefs.current[index][`${"purchase_return_product_quantity_" + index}`].select();
                                                                        }, 100);
                                                                    }}
                                                                    onKeyDown={(e) => {
                                                                        RunKeyActions(e, product);

                                                                        if (e.key === "ArrowLeft") {
                                                                            timerRef.current = setTimeout(() => {
                                                                                if ((index + 1) < selectedProducts.length) {
                                                                                    inputRefs.current[index + 1][`${"purchase_return_unit_discount_with_vat_" + (index + 1)}`]?.focus();
                                                                                }
                                                                            }, 100);
                                                                        }
                                                                    }}

                                                                    placeholder={t('Quantity')}
                                                                    onChange={(e) => {
                                                                        if (timerRef.current) clearTimeout(timerRef.current);
                                                                        delete errors["quantity_" + index];
                                                                        setErrors({ ...errors });

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
                                                                                checkWarnings(index);
                                                                                checkErrors(index);
                                                                                CalCulateLineTotals(index);
                                                                                reCalculate(index);
                                                                            }, 100);
                                                                            return;
                                                                        }


                                                                        product.quantity = parseFloat(e.target.value);
                                                                        selectedProducts[index].quantity = parseFloat(e.target.value);
                                                                        setSelectedProducts([...selectedProducts]);

                                                                        timerRef.current = setTimeout(() => {
                                                                            checkWarnings(index);
                                                                            checkErrors(index);
                                                                            CalCulateLineTotals(index);
                                                                            reCalculate(index);
                                                                        }, 100);


                                                                    }} />
                                                                <span className="input-group-text" id="basic-addon2">{selectedProducts[index].unit ? selectedProducts[index].unit[0]?.toUpperCase() : "P"}</span>
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
                                                    if (col.key === 'warehouse') return store.settings?.enable_warehouse_module ? (<td key="warehouse" style={{
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
                                                            <option value="main_store">{t('Main Store')}</option>
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
                                                    </td>) : null;
                                                    if (col.key === 'unit_price') return (<td key="unit_price" style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                        <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                                                            <div className="input-group flex-nowrap" style={{ flex: '1 1 auto', minWidth: 0 }}>
                                                                <input
                                                                    type="number"
                                                                    id={`${"purchase_return_product_unit_price_" + index}`}
                                                                    name={`${"purchase_return_product_unit_price_" + index}`}
                                                                    onWheel={(e) => e.target.blur()}
                                                                    value={selectedProducts[index].purchase_unit_price}
                                                                    className="form-control text-end"
                                                                    placeholder={t('Unit Price')}
                                                                    ref={(el) => {
                                                                        if (!inputRefs.current[index]) inputRefs.current[index] = {};
                                                                        inputRefs.current[index][`${"purchase_return_product_unit_price_" + index}`] = el;
                                                                    }}
                                                                    onFocus={() => {
                                                                        if (timerRef.current) clearTimeout(timerRef.current);
                                                                        timerRef.current = setTimeout(() => {
                                                                            inputRefs.current[index][`${"purchase_return_product_unit_price_" + index}`].select();
                                                                        }, 100);
                                                                    }}
                                                                    onKeyDown={(e) => {
                                                                        RunKeyActions(e, product);

                                                                        if (timerRef.current) clearTimeout(timerRef.current);
                                                                        if (e.key === "Backspace") {
                                                                            selectedProducts[index].purchase_unit_price_with_vat = "";
                                                                            selectedProducts[index].purchase_unit_price = "";
                                                                            setSelectedProducts([...selectedProducts]);
                                                                            timerRef.current = setTimeout(() => {
                                                                                checkErrors(index);
                                                                                checkWarnings(index);
                                                                                CalCulateLineTotals(index);
                                                                                reCalculate(index);
                                                                            }, 100);
                                                                        } else if (e.key === "ArrowLeft") {
                                                                            timerRef.current = setTimeout(() => {
                                                                                inputRefs.current[index][`${"purchase_return_product_quantity_" + index}`].focus();
                                                                            }, 100);
                                                                        }
                                                                    }}

                                                                    onChange={(e) => {
                                                                        if (timerRef.current) clearTimeout(timerRef.current);

                                                                        delete errors["purchasereturn_unit_price_" + index];

                                                                        setErrors({ ...errors });

                                                                        if (parseFloat(e.target.value) === 0) {
                                                                            selectedProducts[index].purchase_unit_price = e.target.value;
                                                                            selectedProducts[index].purchase_unit_price_with_vat = e.target.value;
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
                                                                            selectedProducts[index].purchase_unit_price = "";
                                                                            selectedProducts[index].purchase_unit_price_with_vat = "";
                                                                            setSelectedProducts([...selectedProducts]);
                                                                            timerRef.current = setTimeout(() => {
                                                                                checkWarnings(index);
                                                                                checkErrors(index);
                                                                                CalCulateLineTotals(index);
                                                                                reCalculate(index);
                                                                            }, 100);
                                                                            return;
                                                                        }

                                                                        if (/^\d*\.?\d{0,8}$/.test(parseFloat(e.target.value)) === false) {
                                                                            errors["purchasereturn_unit_price_" + index] = t("Max. decimal points allowed is 8");
                                                                            setErrors({ ...errors });
                                                                        }

                                                                        selectedProducts[index].purchase_unit_price = parseFloat(e.target.value);


                                                                        // selectedProducts[index].unit_price_with_vat = parseFloat(trimTo2Decimals(selectedProducts[index].unit_price * (1 + (formData.vat_percent / 100))));
                                                                        // console.log("selectedProducts[index].unit_price:", selectedProducts[index].unit_price);
                                                                        setSelectedProducts([...selectedProducts]);
                                                                        timerRef.current = setTimeout(() => {
                                                                            selectedProducts[index].purchase_unit_price_with_vat = parseFloat(trimTo8Decimals(selectedProducts[index].purchase_unit_price * (1 + (formData.vat_percent / 100))))
                                                                            selectedProducts[index].unit_discount_percent = parseFloat(trimTo8Decimals(((selectedProducts[index].unit_discount / selectedProducts[index].purchase_unit_price) * 100)))
                                                                            selectedProducts[index].unit_discount_percent_with_vat = parseFloat(trimTo8Decimals(((selectedProducts[index].unit_discount_with_vat / selectedProducts[index].purchase_unit_price_with_vat) * 100)))

                                                                            checkWarnings(index);
                                                                            checkErrors(index);
                                                                            CalCulateLineTotals(index);
                                                                            reCalculate(index);
                                                                        }, 100);

                                                                    }} />

                                                            </div>
                                                            {(errors[`purchasereturn_unit_price_${index}`] || warnings[`purchasereturn_unit_price_${index}`]) && (
                                                                <i
                                                                    className={`bi bi-exclamation-circle-fill ${errors[`purchasereturn_unit_price_${index}`] ? 'text-danger' : 'text-warning'} ms-2`}
                                                                    data-bs-toggle="tooltip"
                                                                    data-bs-placement="top"
                                                                    data-error={errors[`purchasereturn_unit_price_${index}`] || ''}
                                                                    data-warning={warnings[`purchasereturn_unit_price_${index}`] || ''}
                                                                    title={errors[`purchasereturn_unit_price_${index}`] || warnings[`purchasereturn_unit_price_${index}`] || ''}
                                                                    style={{
                                                                        fontSize: '1rem',
                                                                        cursor: 'pointer',
                                                                        whiteSpace: 'nowrap',
                                                                    }}
                                                                ></i>
                                                            )}
                                                        </div>
                                                    </td>);
                                                    if (col.key === 'unit_price_with_vat') return (<td key="unit_price_with_vat" style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                        <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                                                            <div className="input-group flex-nowrap" style={{ flex: '1 1 auto', minWidth: 0 }}>
                                                                <input type="number"
                                                                    id={`${"purchase_return_product_unit_price_with_vat_" + index}`}
                                                                    name={`${"purchase_return_product_unit_price_with_vat_" + index}`}
                                                                    onWheel={(e) => e.target.blur()}
                                                                    value={selectedProducts[index].purchase_unit_price_with_vat}
                                                                    className="form-control text-end"
                                                                    ref={(el) => {
                                                                        if (!inputRefs.current[index]) inputRefs.current[index] = {};
                                                                        inputRefs.current[index][`${"purchase_return_product_unit_price_with_vat_" + index}`] = el;
                                                                    }}
                                                                    placeholder={t('Unit Price(with VAT)')}
                                                                    onFocus={() => {
                                                                        if (timerRef.current) clearTimeout(timerRef.current);
                                                                        timerRef.current = setTimeout(() => {
                                                                            inputRefs.current[index][`${"purchase_return_product_unit_price_with_vat_" + index}`].select();
                                                                        }, 100);
                                                                    }}

                                                                    onKeyDown={(e) => {
                                                                        RunKeyActions(e, product);

                                                                        if (timerRef.current) clearTimeout(timerRef.current);
                                                                        if (e.key === "Backspace") {
                                                                            selectedProducts[index].purchase_unit_price_with_vat = "";
                                                                            selectedProducts[index].purchase_unit_price = "";
                                                                            setSelectedProducts([...selectedProducts]);
                                                                            timerRef.current = setTimeout(() => {
                                                                                checkErrors(index);
                                                                                checkWarnings(index);
                                                                                CalCulateLineTotals(index);
                                                                                reCalculate(index);
                                                                            }, 300);
                                                                        } else if (e.key === "ArrowLeft") {
                                                                            timerRef.current = setTimeout(() => {
                                                                                inputRefs.current[index][`${"purchase_return_product_unit_price_" + index}`].focus();
                                                                            }, 200);
                                                                        }
                                                                    }}
                                                                    onChange={(e) => {
                                                                        if (timerRef.current) clearTimeout(timerRef.current);

                                                                        delete errors["purchasereturn_unit_price_with_vat_" + index];
                                                                        setErrors({ ...errors });

                                                                        if (parseFloat(e.target.value) === 0) {
                                                                            selectedProducts[index].purchase_unit_price_with_vat = e.target.value;
                                                                            selectedProducts[index].purchase_unit_price = e.target.value;
                                                                            setSelectedProducts([...selectedProducts]);

                                                                            // Set new debounce timer
                                                                            timerRef.current = setTimeout(() => {
                                                                                checkErrors(index);
                                                                                checkWarnings(index);
                                                                                CalCulateLineTotals(index);
                                                                                reCalculate(index);
                                                                            }, 100);
                                                                            return;
                                                                        }

                                                                        if (!e.target.value) {
                                                                            selectedProducts[index].purchase_unit_price_with_vat = "";
                                                                            selectedProducts[index].purchase_unit_price = "";
                                                                            setSelectedProducts([...selectedProducts]);

                                                                            timerRef.current = setTimeout(() => {
                                                                                checkErrors(index);
                                                                                checkWarnings(index);
                                                                                CalCulateLineTotals(index);
                                                                                reCalculate(index);
                                                                            }, 100);
                                                                            return;
                                                                        }

                                                                        if (/^\d*\.?\d{0,8}$/.test(parseFloat(e.target.value)) === false) {
                                                                            errors["purchasereturn_unit_price_with_vat_" + index] = t("Max. decimal points allowed is 8");
                                                                            setErrors({ ...errors });
                                                                        }

                                                                        selectedProducts[index].purchase_unit_price_with_vat = parseFloat(e.target.value);


                                                                        // Set new debounce timer
                                                                        timerRef.current = setTimeout(() => {
                                                                            selectedProducts[index].purchase_unit_price = parseFloat(trimTo8Decimals(selectedProducts[index].purchase_unit_price_with_vat / (1 + (formData.vat_percent / 100))))
                                                                            selectedProducts[index].unit_discount_with_vat = parseFloat(trimTo8Decimals(selectedProducts[index].unit_discount * (1 + (formData.vat_percent / 100))))
                                                                            selectedProducts[index].unit_discount_percent = parseFloat(trimTo8Decimals(((selectedProducts[index].unit_discount / selectedProducts[index].purchase_unit_price) * 100)))
                                                                            selectedProducts[index].unit_discount_percent_with_vat = parseFloat(trimTo8Decimals(((selectedProducts[index].unit_discount_with_vat / selectedProducts[index].purchase_unit_price_with_vat) * 100)))
                                                                            setSelectedProducts([...selectedProducts]);
                                                                            checkErrors(index);
                                                                            checkWarnings(index);
                                                                            CalCulateLineTotals(index);
                                                                            reCalculate(index);
                                                                        }, 100);
                                                                    }} />
                                                            </div>
                                                            {(errors[`purchasereturn_unit_price_with_vat_${index}`] || warnings[`purchasereturn_unit_price_with_vat_${index}`]) && (
                                                                <i
                                                                    className={`bi bi-exclamation-circle-fill ${errors[`purchasereturn_unit_price_with_vat_${index}`] ? 'text-danger' : 'text-warning'} ms-2`}
                                                                    data-bs-toggle="tooltip"
                                                                    data-bs-placement="top"
                                                                    data-error={errors[`purchasereturn_unit_price_with_vat_${index}`] || ''}
                                                                    data-warning={warnings[`purchasereturn_unit_price_with_vat_${index}`] || ''}
                                                                    title={errors[`purchasereturn_unit_price_with_vat_${index}`] || warnings[`purchasereturn_unit_price_with_vat_${index}`] || ''}
                                                                    style={{
                                                                        fontSize: '1rem',
                                                                        cursor: 'pointer',
                                                                        whiteSpace: 'nowrap',
                                                                    }}
                                                                ></i>
                                                            )}
                                                        </div>
                                                    </td>);
                                                    if (col.key === 'unit_discount') return (<td key="unit_discount" style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                        <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                                                            <div className="input-group flex-nowrap" style={{ flex: '1 1 auto', minWidth: 0 }}>
                                                                <input type="number" id={`${"purchase_return_unit_discount_" + index}`} name={`${"purchase_return_unit_discount_" + index}`} onWheel={(e) => e.target.blur()} className="form-control text-end purchase_unit_discount"
                                                                    value={selectedProducts[index].unit_discount}
                                                                    ref={(el) => {
                                                                        if (!inputRefs.current[index]) inputRefs.current[index] = {};
                                                                        inputRefs.current[index][`${"purchase_return_unit_discount_" + index}`] = el;
                                                                    }}
                                                                    onFocus={() => {
                                                                        if (timerRef.current) clearTimeout(timerRef.current);
                                                                        timerRef.current = setTimeout(() => {
                                                                            inputRefs.current[index][`${"purchase_return_unit_discount_" + index}`].select();
                                                                        }, 100);
                                                                    }}
                                                                    onKeyDown={(e) => {
                                                                        RunKeyActions(e, product);

                                                                        if (timerRef.current) clearTimeout(timerRef.current);

                                                                        if (e.key === "Enter") {
                                                                            if (selectedProducts.length > (index - 1) && index > 0) {
                                                                                console.log("Moving to next line");
                                                                                timerRef.current = setTimeout(() => {
                                                                                    inputRefs.current[index - 1][`${"purchase_return_product_quantity_" + (index - 1)}`]?.focus();
                                                                                }, 100);
                                                                            } else {
                                                                                timerRef.current = setTimeout(() => {
                                                                                    inputRefs.current[selectedProducts.length - 1][`${"purchase_return_product_quantity_" + (selectedProducts.length - 1)}`]?.focus();
                                                                                }, 100);
                                                                            }
                                                                        } else if (e.key === "ArrowLeft") {
                                                                            timerRef.current = setTimeout(() => {
                                                                                inputRefs.current[index][`${"purchase_return_product_unit_price_with_vat_" + index}`].focus();
                                                                            }, 100);
                                                                        }
                                                                    }}
                                                                    onChange={(e) => {
                                                                        if (timerRef.current) clearTimeout(timerRef.current);

                                                                        if (parseFloat(e.target.value) === 0) {
                                                                            selectedProducts[index].unit_discount = 0;
                                                                            selectedProducts[index].unit_discount_with_vat = 0.00;
                                                                            selectedProducts[index].unit_discount_percent = 0.00;
                                                                            selectedProducts[index].unit_discount_percent_with_vat = 0.00;
                                                                            setFormData({ ...formData });
                                                                            timerRef.current = setTimeout(() => {
                                                                                checkErrors(index);
                                                                                checkWarnings(index);
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
                                                                                checkErrors(index);
                                                                                checkWarnings(index);
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
                                                                                checkErrors(index);
                                                                                checkWarnings(index);
                                                                                CalCulateLineTotals(index);
                                                                                reCalculate(index);
                                                                            }, 100);
                                                                            //setErrors({ ...errors });
                                                                            return;
                                                                        }

                                                                        delete errors["unit_discount_" + index];
                                                                        delete errors["unit_discount_percent_" + index];
                                                                        setErrors({ ...errors });

                                                                        if (/^\d*\.?\d{0,8}$/.test(parseFloat(e.target.value)) === false) {
                                                                            errors["unit_discount_" + index] = t("Max. decimal points allowed is 8");
                                                                            setErrors({ ...errors });
                                                                        }

                                                                        selectedProducts[index].unit_discount = parseFloat(e.target.value);


                                                                        setFormData({ ...formData });
                                                                        timerRef.current = setTimeout(() => {
                                                                            selectedProducts[index].unit_discount_with_vat = parseFloat(trimTo2Decimals(selectedProducts[index].unit_discount * (1 + (formData.vat_percent / 100))))

                                                                            selectedProducts[index].unit_discount_percent = parseFloat(trimTo2Decimals(((selectedProducts[index].unit_discount / selectedProducts[index].purchase_unit_price) * 100)))
                                                                            selectedProducts[index].unit_discount_percent_with_vat = parseFloat(trimTo2Decimals(((selectedProducts[index].unit_discount_with_vat / selectedProducts[index].purchase_unit_price_with_vat) * 100)))

                                                                            checkErrors(index);
                                                                            checkWarnings(index);
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
                                                                    data-warning={warnings[`unit_discount_${index}`] || ''}
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
                                                    if (col.key === 'unit_discount_with_vat') return (<td key="unit_discount_with_vat" style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                        <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                                                            <div className="input-group flex-nowrap" style={{ flex: '1 1 auto', minWidth: 0 }}>
                                                                <input type="number"
                                                                    id={`${"purchase_return_unit_discount_with_vat_" + index}`}
                                                                    name={`${"purchase_return_unit_discount_with_vat_" + index}`}
                                                                    onWheel={(e) => e.target.blur()}
                                                                    className="form-control text-end"
                                                                    value={selectedProducts[index].unit_discount_with_vat}
                                                                    ref={(el) => {
                                                                        if (!inputRefs.current[index]) inputRefs.current[index] = {};
                                                                        inputRefs.current[index][`${"purchase_return_unit_discount_with_vat_" + index}`] = el;
                                                                    }}
                                                                    onFocus={() => {
                                                                        if (timerRef.current) clearTimeout(timerRef.current);
                                                                        timerRef.current = setTimeout(() => {
                                                                            inputRefs.current[index][`${"purchase_return_unit_discount_with_vat_" + index}`].select();
                                                                        }, 100);
                                                                    }}
                                                                    onKeyDown={(e) => {
                                                                        RunKeyActions(e, product);

                                                                        if (timerRef.current) clearTimeout(timerRef.current);

                                                                        if (e.key === "Enter") {
                                                                            if (selectedProducts.length > (index - 1) && index > 0) {
                                                                                console.log("Moving to next line");
                                                                                timerRef.current = setTimeout(() => {
                                                                                    inputRefs.current[index - 1][`${"purchase_return_product_quantity_" + (index - 1)}`]?.focus();
                                                                                }, 100);
                                                                            } else {
                                                                                timerRef.current = setTimeout(() => {
                                                                                    inputRefs.current[selectedProducts.length - 1][`${"purchase_return_product_quantity_" + (selectedProducts.length - 1)}`]?.focus();
                                                                                }, 100);
                                                                            }
                                                                        } else if (e.key === "ArrowLeft") {
                                                                            timerRef.current = setTimeout(() => {
                                                                                inputRefs.current[index][`${"purchase_return_unit_discount_" + index}`].focus();
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

                                                                            timerRef.current = setTimeout(() => {
                                                                                checkErrors(index);
                                                                                checkWarnings(index);
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
                                                                            errors["unit_discount_" + index] = t("Unit discount should be >= 0");
                                                                            setErrors({ ...errors });
                                                                            timerRef.current = setTimeout(() => {
                                                                                checkErrors(index);
                                                                                checkWarnings(index);
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

                                                                            setFormData({ ...formData });
                                                                            timerRef.current = setTimeout(() => {
                                                                                checkErrors(index);
                                                                                checkWarnings(index);
                                                                                CalCulateLineTotals(index);
                                                                                reCalculate(index);
                                                                            }, 100);

                                                                            return;
                                                                        }

                                                                        delete errors["unit_discount_with_vat_" + index];
                                                                        delete errors["unit_discount_percent_" + index];
                                                                        setErrors({ ...errors });


                                                                        if (/^\d*\.?\d{0,8}$/.test(parseFloat(e.target.value)) === false) {
                                                                            errors["unit_discount_with_vat_" + index] = t("Max. decimal points allowed is 8");
                                                                            setErrors({ ...errors });
                                                                        }

                                                                        selectedProducts[index].unit_discount_with_vat = parseFloat(e.target.value); //input

                                                                        setFormData({ ...formData });
                                                                        timerRef.current = setTimeout(() => {

                                                                            selectedProducts[index].unit_discount = parseFloat(trimTo2Decimals(selectedProducts[index].unit_discount_with_vat / (1 + (formData.vat_percent / 100))))
                                                                            selectedProducts[index].unit_discount_percent = parseFloat(trimTo2Decimals(((selectedProducts[index].unit_discount / selectedProducts[index].unit_price) * 100)))
                                                                            selectedProducts[index].unit_discount_percent_with_vat = parseFloat(trimTo2Decimals(((selectedProducts[index].unit_discount_with_vat / selectedProducts[index].unit_price_with_vat) * 100)))

                                                                            checkErrors(index);
                                                                            checkWarnings(index);
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
                                                    if (col.key === 'unit_discount_percent') return (<td key="unit_discount_percent" style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                        <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                                                            <div className="input-group flex-nowrap" style={{ flex: '1 1 auto', minWidth: 0 }}>
                                                                <input type="number"
                                                                    id={`${"purchase_return_unit_discount_percent" + index}`}
                                                                    disabled={true}
                                                                    name={`${"purchase_return_unit_discount_percent" + index}`}
                                                                    onWheel={(e) => e.target.blur()}
                                                                    className="form-control text-end"
                                                                    value={selectedProducts[index].unit_discount_percent}
                                                                    onChange={(e) => {
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
                                                                                checkErrors(index);
                                                                                checkWarnings(index);
                                                                                CalCulateLineTotals(index);
                                                                                reCalculate(index);
                                                                            }, 100);
                                                                            return;
                                                                        }

                                                                        if (parseFloat(e.target.value) < 0) {
                                                                            selectedProducts[index].unit_discount_percent = 0.00;
                                                                            selectedProducts[index].unit_discount_with_vat = 0.00;
                                                                            selectedProducts[index].unit_discount = 0.00;
                                                                            selectedProducts[index].unit_discount_percent_with_vat = 0.00;
                                                                            setFormData({ ...formData });
                                                                            errors["unit_discount_percent_" + index] = t("Unit discount % should be >= 0");
                                                                            setErrors({ ...errors });
                                                                            timerRef.current = setTimeout(() => {
                                                                                checkErrors(index);
                                                                                checkWarnings(index);
                                                                                CalCulateLineTotals(index);
                                                                                reCalculate(index);
                                                                            }, 100);
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
                                                                                checkErrors(index);
                                                                                checkWarnings(index);
                                                                                CalCulateLineTotals(index);
                                                                                reCalculate(index);
                                                                            }, 100);
                                                                            //setErrors({ ...errors });
                                                                            return;
                                                                        }

                                                                        errors["unit_discount_percent_" + index] = "";
                                                                        errors["unit_discount_" + index] = "";
                                                                        setErrors({ ...errors });

                                                                        selectedProducts[index].unit_discount_percent = parseFloat(e.target.value); //input


                                                                        setFormData({ ...formData });

                                                                        timerRef.current = setTimeout(() => {
                                                                            selectedProducts[index].unit_discount = parseFloat(trimTo8Decimals(selectedProducts[index].purchase_unit_price * (selectedProducts[index].unit_discount_percent / 100)));
                                                                            selectedProducts[index].unit_discount_with_vat = parseFloat(trimTo8Decimals(selectedProducts[index].unit_discount * (1 + (formData.vat_percent / 100))))
                                                                            selectedProducts[index].unit_discount_percent_with_vat = parseFloat(trimTo8Decimals(((selectedProducts[index].unit_discount_with_vat / selectedProducts[index].purchase_unit_price_with_vat) * 100)))

                                                                            checkErrors(index);
                                                                            checkWarnings(index);
                                                                            CalCulateLineTotals(index);
                                                                            reCalculate(index);
                                                                        }, 100);
                                                                    }} />
                                                            </div>
                                                            {(errors[`unit_discount_percent_${index}`] || warnings[`unit_discount_percent_${index}`]) && (
                                                                <i
                                                                    className={`bi bi-exclamation-circle-fill ${errors[`unit_discount_percent_${index}`] ? 'text-danger' : 'text-warning'} ms-2`}
                                                                    data-bs-toggle="tooltip"
                                                                    data-bs-placement="top"
                                                                    data-error={errors[`unit_discount_percent_${index}`] || ''}
                                                                    data-warning={warnings[`unit_discount_percent_${index}`] || ''}
                                                                    title={errors[`unit_discount_percent_${index}`] || warnings[`unit_discount_percent_${index}`] || ''}
                                                                    style={{
                                                                        fontSize: '1rem',
                                                                        cursor: 'pointer',
                                                                        whiteSpace: 'nowrap',
                                                                    }}
                                                                ></i>
                                                            )}
                                                        </div>
                                                    </td>);
                                                    if (col.key === 'price') return (<td key="price" style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                        <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                                                            <div className="input-group flex-nowrap" style={{ flex: '1 1 auto', minWidth: 0 }}>
                                                                <input type="number"
                                                                    id={`${"purchase_return_product_line_total_" + index}`}
                                                                    name={`${"purchase_return_product_line_total_" + index}`}
                                                                    onWheel={(e) => e.target.blur()}
                                                                    value={selectedProducts[index].line_total}
                                                                    className={`form-control text-end ${errors["line_total_" + index] ? 'is-invalid' : ''} ${warnings["line_total_" + index] ? 'border-warning text-warning' : ''}`}
                                                                    placeholder={t('Line total')}
                                                                    ref={(el) => {
                                                                        if (!inputRefs.current[index]) inputRefs.current[index] = {};
                                                                        inputRefs.current[index][`${"purchase_return_product_line_total_" + index}`] = el;
                                                                    }}

                                                                    onFocus={() => {
                                                                        if (timerRef.current) clearTimeout(timerRef.current);
                                                                        timerRef.current = setTimeout(() => {
                                                                            inputRefs.current[index][`${"purchase_return_product_line_total_" + index}`]?.select();
                                                                        }, 20);
                                                                    }}

                                                                    onKeyDown={(e) => {
                                                                        RunKeyActions(e, product);

                                                                        if (timerRef.current) clearTimeout(timerRef.current);
                                                                        if (e.key === "Backspace") {
                                                                            delete errors["line_total_" + index];
                                                                            selectedProducts[index].purchase_unit_price_with_vat = "";
                                                                            selectedProducts[index].purchase_unit_price = "";
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
                                                                                inputRefs.current[index][`${"purchase_return_product_unit_discount_with_vat_" + index}`]?.select();
                                                                            }, 100);
                                                                        }
                                                                    }}

                                                                    onChange={(e) => {
                                                                        delete errors["line_total_" + index];
                                                                        if (timerRef.current) clearTimeout(timerRef.current);
                                                                        if (parseFloat(e.target.value) === 0) {
                                                                            selectedProducts[index].purchase_unit_price = e.target.value;
                                                                            selectedProducts[index].purchase_unit_price_with_vat = e.target.value;
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
                                                                            selectedProducts[index].purchase_unit_price = e.target.value;
                                                                            selectedProducts[index].purchase_unit_price_with_vat = e.target.value;
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


                                                                        if (/^\d*\.?\d{0,8}$/.test(parseFloat(e.target.value)) === false) {
                                                                            errors["line_total_" + index] = t("Max decimal points allowed is 8");
                                                                            setErrors({ ...errors });
                                                                        }

                                                                        selectedProducts[index].line_total = parseFloat(e.target.value);
                                                                        setSelectedProducts([...selectedProducts]);

                                                                        timerRef.current = setTimeout(() => {
                                                                            if (selectedProducts[index].quantity > 0) {
                                                                                selectedProducts[index].purchase_unit_price = parseFloat(trimTo8Decimals((selectedProducts[index].line_total / selectedProducts[index].quantity) + selectedProducts[index].unit_discount));

                                                                                selectedProducts[index].purchase_unit_price_with_vat = parseFloat(trimTo8Decimals(selectedProducts[index].purchase_unit_price * (1 + (formData.vat_percent / 100))))

                                                                                selectedProducts[index].unit_discount_percent = parseFloat(trimTo8Decimals(((selectedProducts[index].unit_discount / selectedProducts[index].purchase_unit_price) * 100)))
                                                                                selectedProducts[index].unit_discount_percent_with_vat = parseFloat(trimTo8Decimals(((selectedProducts[index].unit_discount_with_vat / selectedProducts[index].purchase_unit_price_with_vat) * 100)))
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
                                                    if (col.key === 'price_with_vat') return (<td key="price_with_vat" style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                        <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                                                            <div className="input-group flex-nowrap" style={{ flex: '1 1 auto', minWidth: 0 }}>
                                                                <input type="number"
                                                                    id={`${"purchase_return_product_line_total_with_vat" + index}`}
                                                                    name={`${"purchase_return_product_line_total_with_vat" + index}`}
                                                                    onWheel={(e) => e.target.blur()}
                                                                    value={selectedProducts[index].line_total_with_vat}
                                                                    className={`form-control text-end ${errors["line_total_with_vat" + index] ? 'is-invalid' : ''} ${warnings["line_total_with_vat" + index] ? 'border-warning text-warning' : ''}`}
                                                                    placeholder={t('Line total(with VAT)')}
                                                                    ref={(el) => {
                                                                        if (!inputRefs.current[index]) inputRefs.current[index] = {};
                                                                        inputRefs.current[index][`${"purchase_return_product_line_total_with_vat" + index}`] = el;
                                                                    }}

                                                                    onFocus={() => {
                                                                        if (timerRef.current) clearTimeout(timerRef.current);
                                                                        timerRef.current = setTimeout(() => {
                                                                            inputRefs.current[index][`${"purchase_return_product_line_total_with_vat" + index}`]?.select();
                                                                        }, 20);
                                                                    }}

                                                                    onKeyDown={(e) => {
                                                                        RunKeyActions(e, product);

                                                                        if (timerRef.current) clearTimeout(timerRef.current);
                                                                        if (e.key === "Backspace") {
                                                                            delete errors["line_total_with_vat_" + index];
                                                                            selectedProducts[index].purchase_unit_price_with_vat = "";
                                                                            selectedProducts[index].purchase_unit_price = "";
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
                                                                                inputRefs.current[index][`${"purchase_return_product_line_total_" + index}`]?.select();
                                                                            }, 100);
                                                                        }
                                                                    }}

                                                                    onChange={(e) => {
                                                                        delete errors["line_total_with_vat_" + index];
                                                                        if (timerRef.current) clearTimeout(timerRef.current);
                                                                        if (parseFloat(e.target.value) === 0) {
                                                                            selectedProducts[index].purchase_unit_price = e.target.value;
                                                                            selectedProducts[index].purchase_unit_price_with_vat = e.target.value;
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
                                                                            selectedProducts[index].purchase_unit_price = e.target.value;
                                                                            selectedProducts[index].purchase_unit_price_with_vat = e.target.value;
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
                                                                                selectedProducts[index].purchase_unit_price_with_vat = parseFloat(trimTo8Decimals((selectedProducts[index].line_total_with_vat / selectedProducts[index].quantity) + selectedProducts[index].unit_discount_with_vat));
                                                                                selectedProducts[index].purchase_unit_price = parseFloat(trimTo8Decimals(selectedProducts[index].purchase_unit_price_with_vat / (1 + (formData.vat_percent / 100))))

                                                                                // selectedProducts[index].purchase_unit_price_with_vat = parseFloat(trimTo8Decimals(selectedProducts[index].purchase_unit_price * (1 + (formData.vat_percent / 100))))
                                                                                selectedProducts[index].unit_discount_percent = parseFloat(trimTo8Decimals(((selectedProducts[index].unit_discount / selectedProducts[index].purchase_unit_price) * 100)))
                                                                                selectedProducts[index].unit_discount_percent_with_vat = parseFloat(trimTo8Decimals(((selectedProducts[index].unit_discount_with_vat / selectedProducts[index].purchase_unit_price_with_vat) * 100)))
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
                        )}
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
                                                errors["shipping_handling_fees"] = "";
                                                setErrors({ ...errors });

                                                if (parseFloat(e.target.value) === 0) {
                                                    shipping = 0;
                                                    setShipping(shipping);
                                                    errors["shipping_handling_fees"] = "";
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


                                                if (/^\d*\.?\d{0,2}$/.test(parseFloat(e.target.value)) === false) {
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

                                                    errors["discount_percent"] = "";
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

                                                        errors["discount_percent_with_vat"] = t("Discount percent should be >= 0");
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
                                                    {t(errors.discount_percent_with_vat)}
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
                                                    {t(errors.discount_with_vat)}
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
                                                errors["vat_percent"] = "";
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
                                            errors["vat_percent"] = "";
                                            setErrors({ ...errors });

                                            formData.vat_percent = e.target.value;
                                            reCalculate();
                                            setFormData({ ...formData });
                                            console.log(formData);
                                        }} />{"%"}
                                            {errors.vat_percent && (
                                                <div style={{ color: "red" }}>
                                                    {t(errors.vat_percent)}
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
                                                    {t(errors.rounding_amount)}
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
                            <label className="form-label">{t('Cash discount')}</label>
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
                                    {t(errors.cash_discount)}
                                </div>
                            )}
                        </div>

                        <div className="col-md-8">
                            <label className="form-label">{t('Payments received')}</label>

                            <div class="table-responsive" style={{ maxWidth: "900px" }}>
                                <Button variant="secondary" disabled={purchase?.payment_status === "not_paid"} style={{ alignContent: "right" }} onClick={addNewPayment}>
                                    {t('Create new payment')}
                                </Button>
                                <table class="table table-striped table-sm table-bordered">
                                    <thead>
                                        <th>
                                            {t('Date')}
                                        </th>
                                        <th>
                                            {t('Amount')}
                                        </th>
                                        <th>
                                            {t('Payment Method')}
                                        </th>
                                        <th>
                                            {t('Description')}
                                        </th>
                                        <th>
                                            {t('Reference')}
                                        </th>
                                        <th>
                                            {t('Action')}
                                        </th>
                                    </thead>
                                    <tbody>
                                        {formData.payments_input &&
                                            formData.payments_input.filter(payment => !payment.deleted).map((payment, key) => (
                                                <tr key={key}>
                                                    <td style={{ minWidth: "220px" }}>

                                                        <DatePicker
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
                                                    <td style={{ width: "300px", position: 'relative' }}>
                                                        <input
                                                            id={`${"purchase_return_payment_amount" + key}`} name={`${"purchase_return_payment_amount" + key}`}
                                                            type='number' value={formData.payments_input[key].amount} className="form-control "
                                                            onChange={(e) => {
                                                                errors["payment_amount_" + key] = "";
                                                                setErrors({ ...errors });

                                                                if (!e.target.value) {
                                                                    formData.payments_input[key].amount = e.target.value;
                                                                    setFormData({ ...formData });
                                                                    if (paymentValidationTimer.current) clearTimeout(paymentValidationTimer.current);
                                                                    paymentValidationTimer.current = setTimeout(() => validatePaymentAmounts(), 1000);
                                                                    return;
                                                                }

                                                                formData.payments_input[key].amount = parseFloat(e.target.value);

                                                                if (paymentValidationTimer.current) clearTimeout(paymentValidationTimer.current);
                                                                paymentValidationTimer.current = setTimeout(() => validatePaymentAmounts(), 1000);
                                                                setFormData({ ...formData });
                                                                console.log(formData);
                                                            }}
                                                        />
                                                        {errors["payment_amount_" + key] && (
                                                            <div style={{ position: 'absolute', top: '100%', left: 0, color: 'red', whiteSpace: 'nowrap', zIndex: 10, fontSize: '11px', background: '#fff', padding: '1px 2px' }}>
                                                                <i className="bi bi-x-lg"> </i>
                                                                {t(errors["payment_amount_" + key])}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td style={{ width: "420px", position: 'relative' }}>
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
                                                            <option value="">{t('Select')}</option>
                                                            <option value="cash">{t('Cash')}</option>
                                                            <option value="debit_card">{t('Debit Card')}</option>
                                                            <option value="credit_card">{t('Credit Card')}</option>
                                                            <option value="bank_card">{t('Bank Card')}</option>
                                                            <option value="bank_transfer">{t('Bank Transfer')}</option>
                                                            <option value="bank_cheque">{t('Bank Cheque')}</option>
                                                            <option value="purchase">{t('Purchase')}</option>
                                                            <option value="vendor_account">{t('Vendor Account')}</option>
                                                        </select>
                                                        {errors["payment_method_" + key] && (
                                                            <div style={{ color: "red", position: 'absolute', left: 0, top: '100%', whiteSpace: 'nowrap', zIndex: 100, backgroundColor: '#fff', fontSize: '12px', padding: '2px 4px' }}>
                                                                <i className="bi bi-x-lg"> </i>
                                                                {t(errors["payment_method_" + key])}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td style={{ width: "672px" }}>
                                                        <input type='text' value={formData.payments_input[key].description || ""} className="form-control"
                                                            onChange={(e) => { formData.payments_input[key].description = e.target.value; setFormData({ ...formData }); }}
                                                            placeholder={t("Description")}
                                                        />
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
                                                            Remove
                                                        </Button>

                                                    </td>
                                                </tr>
                                            ))}
                                        <tr>
                                            <td class="text-end">
                                                <b>{t('Total')}</b>
                                            </td>
                                            <td><b style={{ marginLeft: "14px" }}>{totalPaymentAmount?.toFixed(2)}</b>
                                                {errors["total_payment"] && (
                                                    <div style={{ color: "red" }}>
                                                        {t(errors["total_payment"])}
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                <b style={{ marginLeft: "12px", alignSelf: "end" }}>{t('Balance')}: {balanceAmount?.toFixed(2)}</b>
                                                {errors["vendor_credit_limit"] && (
                                                    <div style={{ color: "red" }}>
                                                        {t(errors["vendor_credit_limit"])}
                                                    </div>
                                                )}
                                            </td>
                                            <td colSpan={2}>
                                                <b>{t('Payment Status')}: </b>
                                                {paymentStatus === "paid" ?
                                                    <span className="badge bg-success">
                                                        {t('Paid')}
                                                    </span> : ""}
                                                {paymentStatus === "paid_partially" ?
                                                    <span className="badge bg-warning">
                                                        {t('Paid Partially')}
                                                    </span> : ""}
                                                {paymentStatus === "not_paid" ?
                                                    <span className="badge bg-danger">
                                                        {t('Not Paid')}
                                                    </span> : ""}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>

                            </div>
                        </div>





                        {store.settings?.disable_purchases_on_accounts && <div className="col-md-2">
                            <div className="input-group mb-3">
                                <input type="checkbox"
                                    value={formData.enable_on_accounts}
                                    checked={formData.enable_on_accounts}
                                    onChange={(e) => {
                                        errors["enable_on_accounts"] = "";
                                        formData.enable_on_accounts = !formData.enable_on_accounts;
                                        setFormData({ ...formData });
                                    }}
                                    className=""
                                    id="enable_on_accounts"
                                /> &nbsp;Enable On Accounts
                            </div>
                            <label className="form-label"></label>
                            {errors.enable_on_accounts && (
                                <div style={{ color: "red" }}>
                                    {errors.enable_on_accounts}
                                </div>
                            )}
                        </div>}

                        <Modal.Footer>
                            <Button variant="secondary" onClick={handleClose}>
                                {t('Close')}
                            </Button>

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

                                        : formData.id ? t('Update') : t('Create')
                                    }
                                </Button>}
                        </Modal.Footer>
                    </form>}
                </Modal.Body>

            </Modal>


            {/* Purchase Return SP Table Settings Modal */}
            <Modal show={showPurchaseReturnSPSettings} onHide={() => setShowPurchaseReturnSPSettings(false)} size="md">
                <Modal.Header closeButton>
                    <Modal.Title>Table Settings</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <DragDropContext onDragEnd={onDragEndPurchaseReturnSP}>
                        <Droppable droppableId="purchase-return-sp-columns">
                            {(provided) => (
                                <ul className="list-group" {...provided.droppableProps} ref={provided.innerRef}>
                                    {purchaseReturnSPColumns.map((col, idx) => (
                                        <Draggable key={col.key} draggableId={col.key} index={idx}>
                                            {(provided) => (
                                                <li className="list-group-item d-flex align-items-center gap-2"
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    {...provided.dragHandleProps}>
                                                    <input type="checkbox" checked={col.visible}
                                                        onChange={() => handleTogglePurchaseReturnSPColumn(col.key)} />
                                                    {col.label}
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
                <Modal.Footer>
                    <Button variant="secondary" onClick={restoreDefaultPurchaseReturnSPSettings}>Restore Defaults</Button>
                    <Button variant="primary" onClick={() => setShowPurchaseReturnSPSettings(false)}>Close</Button>
                </Modal.Footer>
            </Modal>

        </>
    );
});

export default PurchaseReturnedCreate;
