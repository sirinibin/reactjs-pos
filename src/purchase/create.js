import React, { useState, useEffect, useRef, forwardRef, useMemo, useImperativeHandle, useCallback } from "react";
import Preview from "./../order/preview.js";
import { Modal, Button, Alert } from "react-bootstrap";
import VendorCreate from "./../vendor/create.js";
import ProductCreate from "./../product/create.js";
import UserCreate from "./../user/create.js";
import SignatureCreate from "./../signature/create.js";
import { Typeahead, Menu, MenuItem } from "react-bootstrap-typeahead";
import { DebounceInput } from 'react-debounce-input';
import NumberFormat from "react-number-format";
import DatePicker from "react-datepicker";
import { format } from "date-fns";
import { Spinner } from "react-bootstrap";
import ProductView from "./../product/view.js";
import { trimTo2Decimals, trimTo8Decimals } from "../utils/numberUtils";
import ResizableTableCell from './../utils/ResizableTableCell';
import Vendors from "./../utils/vendors.js";
import { Dropdown } from 'react-bootstrap';
import SalesHistory from "../utils/product_sales_history.js";
import SalesReturnHistory from "./../utils/product_sales_return_history.js";
import PurchaseHistory from "./../utils/product_purchase_history.js";
import PurchaseReturnHistory from "./../utils/product_purchase_return_history.js";
import QuotationHistory from "./../utils/product_quotation_history.js";
import DeliveryNoteHistory from "./../utils/product_delivery_note_history.js";
import Products from "../utils/products.js";
import Amount from "../utils/amount.js";
import { OverlayTrigger, Tooltip, Popover } from 'react-bootstrap';
import ImageViewerModal from './../utils/ImageViewerModal';
//import OverflowTooltip from "../utils/OverflowTooltip.js";
import * as bootstrap from 'bootstrap';
import { highlightWords } from "../utils/search.js";
//import ProductHistory from "./../product/product_history.js";
import ProductHistory from "../utils/product_history.js";
//import Resizer from "react-image-file-resizer";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import PurchaseReturnCreate from "../purchase_return/create.js";
import VendorWithdrawalCreate from "../customer_withdrawal/create.js";
import SalesUpdateForm from "../order/create.js";
import VendorPending from "./../utils/vendor_pending.js";
import { useTranslation } from 'react-i18next';
import { getDateLocale } from "../i18n/dateLocales";

const columnStyle = {
    width: '20%',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    paddingRight: '8px',
};

const PurchaseCreate = forwardRef((props, ref) => {
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
        open(id, selectedVendorsValue) {
            errors = {};
            setErrors({ ...errors });
            selectedProducts = [];
            setSelectedProducts([]);

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
                rounding_amount: 0.00,
                auto_rounding_amount: true,
                date_str: new Date(),
                signature_date_str: format(new Date(), "MMM dd yyyy"),
                status: "delivered",
                payment_method: "",
                payment_status: "paid",

            };


            if (selectedVendorsValue?.length > 0) {
                setSelectedVendors([...selectedVendorsValue]);
                formData.vendor_id = selectedVendorsValue[0].id;
                if (selectedVendorsValue[0].use_remarks_in_purchases && selectedVendorsValue[0].remarks) {
                    formData.remarks = selectedVendorsValue[0].remarks;
                }
            }

            ResetForm();

            formData.payments_input = [
                {
                    "date_str": formData.date_str,
                    // "amount": "",
                    "amount": 0.00,
                    "method": "",
                    "deleted": false,
                }
            ];

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
            //reCalculate();
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
                store = data.result;
                setStore(store);

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
        discountValue: 0.0,
        discount_percent: 0.0,
        is_discount_percent: false,
        date_str: format(new Date(), "MMM dd yyyy"),
        signature_date_str: format(new Date(), "MMM dd yyyy"),
        status: "created",
    });



    //Vendor Auto Suggestion
    const [vendorOptions, setVendorOptions] = useState([]);
    let [selectedVendors, setSelectedVendors] = useState([]);
    //const [isVendorsLoading, setIsVendorsLoading] = useState(false);

    //Product Auto Suggestion
    const [productOptions, setProductOptions] = useState([]);
    let selectedProduct = [];
    let [selectedProducts, setSelectedProducts] = useState([]);
    // const [isProductsLoading, setIsProductsLoading] = useState(false);

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


    async function getPurchase(id) {
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
                    formData.commission_payment_method = data.result.commission_payment_method || "";
                } else {
                    commission = "";
                    setCommission(commission);
                    formData.commission_payment_method = "";
                }

                if (data.result?.rounding_amount) {
                    roundingAmount = data.result.rounding_amount;
                    setRoundingAmount(roundingAmount);
                } else {
                    roundingAmount = 0;
                    setRoundingAmount(roundingAmount);
                }


                console.log("data.result?.discount:", data.result?.discount);

                if (data.result?.discount) {
                    discount = (data.result?.discount - data.result?.return_discount);
                    setDiscount(discount);
                }

                if (data.result?.discount_with_vat) {
                    discountWithVAT = (data.result?.discount_with_vat - data.result?.return_discount_with_vat);
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
                    id: purchase.id,
                    enable_on_accounts: purchase.enable_on_accounts,
                    vendor_invoice_no: purchase.vendor_invoice_no,
                    auto_rounding_amount: purchase.auto_rounding_amount,
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


                /* selectedProducts = purchase.products;
                 setSelectedProducts([...selectedProducts]);
                 selectedProducts.forEach((product, index) => {
                     CalCulateLineTotals(index);
                 });*/

                selectedProducts = purchase.products;
                setSelectedProducts([...selectedProducts]);


                const updatedProducts = selectedProducts.map((product, index) => {
                    // Calculate line totals without calling setSelectedProducts inside the loop
                    const updatedProduct = { ...product };
                    updatedProduct.line_total = parseFloat(trimTo2Decimals((updatedProduct.purchase_unit_price - updatedProduct.unit_discount) * updatedProduct.quantity));
                    updatedProduct.line_total_with_vat = parseFloat(trimTo2Decimals((updatedProduct.purchase_unit_price_with_vat - updatedProduct.unit_discount_with_vat) * updatedProduct.quantity));
                    return updatedProduct;
                });
                setSelectedProducts(updatedProducts);

                setSelectedVendors([]);
                if (purchase.vendor_id) {
                    const fallback = { ...(purchase.vendor || {}), id: purchase.vendor_id };
                    fetchAndSetVendor(purchase.vendor_id, fallback);
                }

                reCalculate();
                setFormData({ ...formData });
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


    let [openVendorSearchResult, setOpenVendorSearchResult] = useState(false);

    async function suggestVendors(searchTerm) {
        console.log("Inside handle suggestVendors");
        setVendorOptions([]);

        console.log("searchTerm:" + searchTerm);
        if (!searchTerm) {
            setTimeout(() => {
                setOpenVendorSearchResult(false);
            }, 300);

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

        searchTerm = searchTerm.replace(/\s+/g, " ").trim();
        if (!searchTerm) return;

        let Select = "select=id,credit_balance,credit_limit,additional_keywords,code,use_remarks_in_purchases,remarks,vat_no,name,phone,phone2,email,name_in_arabic,phone_in_arabic,search_label,address";
        // setIsVendorsLoading(true);
        let result = await fetch(
            "/v1/vendor?limit=100&" + Select + queryString,
            requestOptions
        );
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
                    const fields = [
                        item.code,
                        item.name,
                        item.name_in_arabic,
                        item.phone,
                        item.phone2,
                        item.vat_no,
                        ...(Array.isArray(item.additional_keywords) ? item.additional_keywords : []),
                    ];
                    // Use \p{L}\p{N} (Unicode-aware) so Arabic letters are preserved
                    return fields.join(" ").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
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
                const aPercent = vendorPercentOccurrence(words, a);
                const bPercent = vendorPercentOccurrence(words, b);

                if (aPercent !== bPercent) {
                    return bPercent - aPercent;
                }
                return 0;
            });


            setVendorOptions(sorted);
        } else {
            setVendorOptions([]);
        }
        // setIsVendorsLoading(false);
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


    // Helper to calculate percentage of occurrence of search words
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
        // Percentage: matches / total words in searchable fields
        return searchableWords.length > 0 ? (totalMatches / searchableWords.length) : 0;
    };


    const latestRequestRef = useRef(0);

    async function suggestProducts(searchTerm) {
        const requestId = Date.now();
        latestRequestRef.current = requestId;

        setProductOptions([]);

        if (!searchTerm) {
            setTimeout(() => {
                openProductSearchResult = false;
                setOpenProductSearchResult(false);
            }, 300);
            return;
        }

        var params = {
            search_text: searchTerm,
            is_service: false,
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

        let Select = `select=id,rack,allow_duplicates,additional_keywords,search_label,set.name,item_code,prefix_part_number,country_name,brand_name,part_number,name,unit,name_in_arabic,product_stores.${localStorage.getItem('store_id')}.purchase_unit_price,product_stores.${localStorage.getItem('store_id')}.purchase_unit_price_with_vat,product_stores.${localStorage.getItem('store_id')}.retail_unit_price,product_stores.${localStorage.getItem('store_id')}.retail_unit_price_with_vat,product_stores.${localStorage.getItem('store_id')}.wholesale_unit_price,product_stores.${localStorage.getItem('store_id')}.wholesale_unit_price_with_vat,product_stores.${localStorage.getItem('store_id')}.stock,product_stores.${localStorage.getItem('store_id')}.warehouse_stocks,product_stores.${localStorage.getItem('store_id')}.warehouse_racks`;

        const result = await fetch("/v1/product?" + Select + queryString + "&limit=100&sort=-country_name", requestOptions);
        const data = await result.json();
        // Only update if this is the latest request
        if (latestRequestRef.current !== requestId) return;

        let products = data.result || [];

        if (!products || products.length === 0) {
            openProductSearchResult = false;
            setOpenProductSearchResult(false);
            return;
        }

        openProductSearchResult = true;
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

            // Both have no country_name, proceed to search term relevance
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
                // Use \p{L}\p{N} (Unicode-aware) so Arabic letters are preserved
                return fields.join(" ").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
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
            const aPercent = percentOccurrence(words, a);
            const bPercent = percentOccurrence(words, b);

            if (aPercent !== bPercent) {
                return bPercent - aPercent;
            }
            return 0;
        });

        setProductOptions(sorted);
    }

    function handleCreate(event) {
        event.preventDefault();
        console.log("Inside handle Create");
        console.log("selectedProducts:", selectedProducts);

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

            let unitPrice = parseFloat(selectedProducts[i].purchase_unit_price);

            if (unitPrice && /^\d*\.?\d{0,8}$/.test(unitPrice) === false) {
                errors["purchase_unit_price_" + i] = "Max decimal points allowed is 8";
                setErrors({ ...errors });
                return;
            }

            let unitPriceWithVAT = parseFloat(selectedProducts[i].purchase_unit_price_with_vat);

            if (unitPriceWithVAT && /^\d*\.?\d{0,8}$/.test(unitPriceWithVAT) === false) {
                errors["purchase_unit_price_with_vat_" + i] = "Max decimal points allowed is 8";
                setErrors({ ...errors });
                return;
            }


            formData.products.push({
                product_id: selectedProducts[i].product_id,
                name: selectedProducts[i].name,
                part_number: selectedProducts[i].part_number,
                quantity: parseFloat(selectedProducts[i].quantity),
                unit: selectedProducts[i].unit,
                purchase_unit_price: parseFloat(selectedProducts[i].purchase_unit_price),
                purchase_unit_price_with_vat: parseFloat(selectedProducts[i].purchase_unit_price_with_vat),
                retail_unit_price: parseFloat(selectedProducts[i].retail_unit_price),
                retail_unit_price_with_vat: parseFloat(selectedProducts[i].retail_unit_price_with_vat),
                wholesale_unit_price: parseFloat(selectedProducts[i].wholesale_unit_price),
                wholesale_unit_price_with_vat: parseFloat(selectedProducts[i].wholesale_unit_price_with_vat),
                unit_discount: selectedProducts[i].unit_discount ? parseFloat(selectedProducts[i].unit_discount) : 0,
                unit_discount_percent: selectedProducts[i].unit_discount_percent ? parseFloat(selectedProducts[i].unit_discount_percent) : 0,
                unit_discount_with_vat: selectedProducts[i].unit_discount_with_vat ? parseFloat(selectedProducts[i].unit_discount_with_vat) : 0,
                unit_discount_percent_with_vat: selectedProducts[i].unit_discount_percent_with_vat ? parseFloat(selectedProducts[i].unit_discount_percent_with_vat) : 0,
                warehouse_id: selectedProducts[i].warehouse_id ? selectedProducts[i].warehouse_id : null,
                warehouse_code: selectedProducts[i].warehouse_code ? selectedProducts[i].warehouse_code : null,
            });
        }

        formData.discount = parseFloat(formData.discount);
        formData.discount_percent = parseFloat(formData.discount_percent);
        formData.vat_percent = parseFloat(formData.vat_percent);
        formData.net_total = parseFloat(formData.net_total);

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

        if (/^-?\d*\.?\d{0,2}$/.test(parseFloat(formData.rounding_amount)) === false) {
            errors["rounding_amount"] = "Max. decimal points allowed is 2";
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

        if (commission > 0 && !formData.commission_payment_method) {
            errors["commission_payment_method"] = "Payment method is required";
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

                if (props.handleUpdated) {
                    props.handleUpdated();
                }

                setErrors({});
                setProcessing(false);

                if (formData.id) {
                    if (props.showToastMessage) props.showToastMessage("Purchase updated successfully!", "success");
                } else {
                    if (props.showToastMessage) props.showToastMessage("Purchase created successfully!", "success");
                }

                if (props.refreshList) {
                    props.refreshList();
                }
                handleClose();
                if (props.onUpdated) {
                    props.onUpdated();
                }

                if (props.openDetailsView)
                    props.openDetailsView(data.result.id);
            })
            .catch((error) => {
                setProcessing(false);
                console.log("Inside catch");
                console.log(error);
                setErrors({ ...error });
                console.error("There was an error!", error);
                if (props.showToastMessage) props.showToastMessage("Failed to process purchase!", "danger");
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
        if (!product.id && product.product_id) {
            product.id = product.product_id
        }

        if (product.is_service) {
            errors["product_id"] = "Services cannot be added to a purchase order";
            setErrors({ ...errors });
            return false;
        }

        let alreadyAdded = isProductAdded(product.id);
        let index = getProductIndex(product.id);

        if (alreadyAdded && !product.allow_duplicates) {
            selectedProducts[index].quantity = parseFloat(selectedProducts[index].quantity || 0) + 1;
        } else if (!alreadyAdded || product.allow_duplicates) {
            selectedProducts.push({
                product_id: product.id,
                code: product.item_code,
                prefix_part_number: product.prefix_part_number,
                part_number: product.part_number,
                name: product.name,
                quantity: 1,
                product_stores: product.product_stores,
                purchase_unit_price: product.product_stores[localStorage.getItem("store_id")]?.purchase_unit_price ? product.product_stores[formData.store_id]?.purchase_unit_price : 0,
                purchase_unit_price_with_vat: product.product_stores[localStorage.getItem("store_id")]?.purchase_unit_price_with_vat ? product.product_stores[formData.store_id]?.purchase_unit_price_with_vat : 0,
                unit: product.unit ? product.unit : "",
                //  purchase_unit_price: product.product_stores[localStorage.getItem("store_id")]?.purchase_unit_price ? product.product_stores[formData.store_id]?.purchase_unit_price : 0,
                // purchase_unit_price_with_vat: product.product_stores[localStorage.getItem("store_id")]?.purchase_unit_price_with_vat ? product.product_stores[formData.store_id]?.purchase_unit_price_with_vat : 0,
                unit_discount: 0,
                unit_discount_with_vat: 0,
                unit_discount_percent: 0,
                unit_discount_percent_vat: 0,
                stock: product.product_stores[localStorage.getItem("store_id")]?.stock ? product.product_stores[localStorage.getItem("store_id")]?.stock : 0,

            });
        }
        setSelectedProducts([...selectedProducts]);


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

    async function getProductByBarCode(barcode) {
        formData.barcode = barcode;
        setFormData({ ...formData });
        delete errors["bar_code"];
        setErrors({ ...errors });
        if (!formData.barcode) { return; }
        if (formData.barcode.length === 13) {
            formData.barcode = formData.barcode.slice(0, -1);
        }
        const requestOptions = {
            method: "GET",
            headers: { "Content-Type": "application/json", Authorization: localStorage.getItem("access_token") },
        };
        let searchParams = {};
        if (localStorage.getItem("store_id")) { searchParams.store_id = localStorage.getItem("store_id"); }
        let queryParams = ObjectToSearchQueryParams(searchParams);
        if (queryParams !== "") { queryParams = "&" + queryParams; }
        let Select = "select=id,item_code,part_number,name,product_stores,unit,part_number,name_in_arabic";
        let result = await fetch("/v1/product/barcode/" + formData.barcode + "?" + Select + queryParams, requestOptions);
        let data = await result.json();
        let product = data.result;
        if (product) {
            addProduct(product);
        } else {
            errors["bar_code"] = t("Invalid Barcode") + ": " + formData.barcode;
            setErrors({ ...errors });
        }
        formData.barcode = "";
        setFormData({ ...formData });
    }

    /*
  function addProduct(product) {
      console.log("Inside Add product");
      if (!formData.store_id) {
          errors.product_id = "Please Select a Store and try again";
          setErrors({ ...errors });
          return false;
      }


      delete errors.product_id;
      if (!product) {
          errors.product_id = "Invalid Product";
          setErrors({ ...errors });
          return false;
      }

      if (product.product_stores) {
        

          if (product.product_stores && product.product_stores[formData.store_id]?.retail_unit_price) {
              product.purchase_unit_price = product.product_stores[formData.store_id].purchase_unit_price;
              product.purchase_unit_price_with_vat = product.product_stores[formData.store_id].purchase_unit_price_with_vat;
          }


          if (product.product_stores[formData.store_id]?.retail_unit_price) {
              product.retail_unit_price = product.product_stores[formData.store_id].retail_unit_price;
              product.retail_unit_price_with_vat = product.product_stores[formData.store_id].retail_unit_price_with_vat;
          }

          if (product.product_stores[formData.store_id]?.wholesale_unit_price) {
              product.wholesale_unit_price = product.product_stores[formData.store_id].wholesale_unit_price;
              product.wholesale_unit_price_with_vat = product.product_stores[formData.store_id].wholesale_unit_price_with_vat;
          }

          if (product.product_stores[formData.store_id]) {
              product.unit_discount = 0.00;
              product.unit_discount_percent = 0.00;
              product.unit_discount_with_vat = 0.00;
              product.unit_discount_percent_with_vat = 0.00;
          }


         

      }




      let alreadyAdded = false;
      let index = -1;
      let quantity = 0.00;
      product.quantity = 1.00;

      if (isProductAdded(product.id) && !product.allow_duplicates) {
          alreadyAdded = true;
          index = getProductIndex(product.id);
          quantity = parseFloat(selectedProducts[index].quantity);
          // quantity = parseFloat(selectedProducts[index].quantity + product.quantity);
      } else {
          quantity = parseFloat(product.quantity);
      }

      console.log("quantity:", quantity);

      delete errors.quantity;

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
              unit_discount_with_vat: product.unit_discount_with_vat,
              unit_discount_percent_with_vat: product.unit_discount_percent_with_vat,
          };

          if (product.purchase_unit_price) {
              item.purchase_unit_price = parseFloat(trimTo2Decimals(product.purchase_unit_price));
          }
          if (product.purchase_unit_price_with_vat) {
              item.purchase_unit_price_with_vat = parseFloat(trimTo2Decimals(product.purchase_unit_price_with_vat));
          }

          selectedProducts.push(item);

      }
      setSelectedProducts([...selectedProducts]);


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


      timerRef.current = setTimeout(() => {
          index = getProductIndex(product.id);
          CalCulateLineTotals(index)
          reCalculate();
      }, 100);


      return true;
  }*/

    function getProductIndex(productID) {
        for (var i = 0; i < selectedProducts.length; i++) {
            if (selectedProducts[i].product_id === productID) {
                return i;
            }
        }
        return false;
    }

    function removeProduct(product) {
        let index = selectedProducts.indexOf(product);
        if (index === -1) {
            index = getProductIndex(product.id);
        }

        if (index > -1) {
            selectedProducts.splice(index, 1);
            removeWarningAndError(index);
        }

        if (product.quantity_returned > 0) {
            errors["product_" + index] = "This product cannot be removed as it is returned, Note: Please remove the product from purchase return and try again"
            setErrors({ ...errors });
            return;
        }

        setSelectedProducts([...selectedProducts]);
        reCalculate();
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
    let [commission, setCommission] = useState("");
    let [roundingAmount, setRoundingAmount] = useState(0.00);
    let [shipping, setShipping] = useState(0.00);
    let [discount, setDiscount] = useState(0.00);
    let [discountPercent, setDiscountPercent] = useState(0.00);

    let [discountWithVAT, setDiscountWithVAT] = useState(0.00);
    let [discountPercentWithVAT, setDiscountPercentWithVAT] = useState(0.00);

    // Bill Summary (type2) state & helpers
    const _defaultBillSummaryOrder = ['total_without_vat', 'total_with_vat', 'shipping', 'discount_without_vat', 'discount_with_vat', 'taxable_amount', 'vat', 'net_before_rounding', 'rounding_amount', 'net_total'];
    const _billSummaryFieldLabels = { total_without_vat: 'Total(without VAT)', total_with_vat: 'Total(with VAT)', shipping: 'Shipping & Handling Fees', discount_without_vat: 'Purchase Discount(without VAT)', discount_with_vat: 'Purchase Discount(with VAT)', taxable_amount: 'Total Taxable Amount(without VAT)', vat: 'VAT', net_before_rounding: 'Net Total(with VAT) Before Rounding', rounding_amount: 'Rounding Amount', net_total: 'Net Total(with VAT)' };
    const [billSummaryVisible, setBillSummaryVisible] = useState(() => {
        try { const s = localStorage.getItem('purchase_bill_summary_visible_t2'); if (s) return JSON.parse(s); } catch { }
        return Object.fromEntries(_defaultBillSummaryOrder.map(k => [k, true]));
    });
    const [billSummaryOrder, setBillSummaryOrder] = useState(() => {
        try { const s = localStorage.getItem('purchase_bill_summary_order_t2'); if (s) return JSON.parse(s); } catch { }
        return [..._defaultBillSummaryOrder];
    });
    const [showBillSummarySettings, setShowBillSummarySettings] = useState(false);
    const [openSummaryTooltip, setOpenSummaryTooltip] = useState(null);
    useEffect(() => {
        if (!openSummaryTooltip) return;
        const _close = () => setOpenSummaryTooltip(null);
        const _t = setTimeout(() => document.addEventListener('click', _close, { once: true }), 0);
        return () => { clearTimeout(_t); document.removeEventListener('click', _close); };
    }, [openSummaryTooltip]);
    const updateBillSummaryVisible = (key, val) => {
        const next = { ...billSummaryVisible, [key]: val };
        setBillSummaryVisible(next);
        localStorage.setItem('purchase_bill_summary_visible_t2', JSON.stringify(next));
    };
    const billSummaryDragRef = useRef(null);
    const reorderBillSummary = (from, to) => {
        if (from === to) return;
        const arr = [...billSummaryOrder];
        const [item] = arr.splice(from, 1);
        arr.splice(to, 0, item);
        setBillSummaryOrder(arr);
        localStorage.setItem('purchase_bill_summary_order_t2', JSON.stringify(arr));
    };

    // Vendor Section fields (type2) state & helpers
    const _defaultVendorFieldsOrder = ['vendor_search', 'date', 'phone', 'vat_no', 'address', 'remarks'];
    const _vendorFieldLabels = { vendor_search: 'Vendor Search', date: 'Date', phone: 'Phone', vat_no: 'VAT NO.', address: 'Address', remarks: 'Remarks' };
    const [vendorFieldsVisible, setVendorFieldsVisible] = useState(() => {
        try { const s = localStorage.getItem('purchase_vendor_fields_visible_t2'); if (s) return JSON.parse(s); } catch { }
        return Object.fromEntries(_defaultVendorFieldsOrder.map(k => [k, true]));
    });
    const [vendorFieldsOrder, setVendorFieldsOrder] = useState(() => {
        try { const s = localStorage.getItem('purchase_vendor_fields_order_t2'); if (s) return JSON.parse(s); } catch { }
        return [..._defaultVendorFieldsOrder];
    });
    const [showVendorSectionSettings, setShowVendorSectionSettings] = useState(false);
    const vendorFieldsDragRef = useRef(null);
    const updateVendorFieldVisible = (key, val) => {
        const next = { ...vendorFieldsVisible, [key]: val };
        setVendorFieldsVisible(next);
        localStorage.setItem('purchase_vendor_fields_visible_t2', JSON.stringify(next));
    };
    const reorderVendorFields = (from, to) => {
        if (from === to) return;
        const arr = [...vendorFieldsOrder];
        const [item] = arr.splice(from, 1);
        arr.splice(to, 0, item);
        setVendorFieldsOrder(arr);
        localStorage.setItem('purchase_vendor_fields_order_t2', JSON.stringify(arr));
    };

    // Selected Vendor section fields (type2) state & helpers
    const _defaultSelVendorFieldsOrder = ['name', 'code', 'name_arabic', 'credit_limit', 'vat_no', 'credit_balance', 'phone1', 'phone2'];
    const _selVendorFieldLabels = { name: 'Name', code: 'Vendor ID', name_arabic: 'Name (Arabic)', credit_balance: 'Credit Balance', credit_limit: 'Credit Limit', vat_no: 'VAT NO.', phone1: 'Phone 1', phone2: 'Phone 2' };
    const [selVendorFieldsVisible, setSelVendorFieldsVisible] = useState(() => {
        const defaults = Object.fromEntries(_defaultSelVendorFieldsOrder.map(k => [k, true]));
        try { const s = localStorage.getItem('purchase_sel_vendor_fields_visible_t2'); if (s) return { ...defaults, ...JSON.parse(s) }; } catch { }
        return defaults;
    });
    const [selVendorFieldsOrder, setSelVendorFieldsOrder] = useState(() => {
        try {
            const s = localStorage.getItem('purchase_sel_vendor_fields_order_t2');
            if (s) {
                const saved = JSON.parse(s);
                const newKeys = _defaultSelVendorFieldsOrder.filter(k => !saved.includes(k));
                return [...saved, ...newKeys];
            }
        } catch { }
        return [..._defaultSelVendorFieldsOrder];
    });
    const [showSelVendorSettings, setShowSelVendorSettings] = useState(false);
    const selVendorFieldsDragRef = useRef(null);
    const updateSelVendorFieldVisible = (key, val) => {
        const next = { ...selVendorFieldsVisible, [key]: val };
        setSelVendorFieldsVisible(next);
        localStorage.setItem('purchase_sel_vendor_fields_visible_t2', JSON.stringify(next));
    };

    // Popover helpers for bill summary tooltips
    const _scPopoverStyle = { maxWidth: '340px', minWidth: '240px', background: '#212529', border: '1px solid #495057', boxShadow: '0 4px 14px rgba(0,0,0,.45)', borderRadius: '6px', color: '#f8f9fa' };
    const _scPopoverHeaderStyle = { background: '#212529', borderBottom: '1px solid #495057', color: '#f8f9fa', fontSize: '0.78rem', fontWeight: 700, padding: '6px 10px 6px 12px', borderRadius: '6px 6px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
    const _scPopoverBodyStyle = { padding: 0, background: '#212529', borderRadius: '0 0 6px 6px' };
    const _scCloseBtn = () => (
        <button type="button" onClick={(e) => { e.stopPropagation(); setOpenSummaryTooltip(null); }}
            style={{ background: 'none', border: 'none', color: '#adb5bd', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1, padding: '0 0 0 8px' }}>×</button>
    );
    const _scRow = (label, value, divider = false, bold = false, color = null) => (
        <tr style={{ lineHeight: 1.7, borderTop: divider ? '1px solid #495057' : 'none' }}>
            <td style={{ padding: divider ? '5px 6px 2px 12px' : '1px 6px 1px 12px', color: '#adb5bd', whiteSpace: 'nowrap', verticalAlign: 'top', width: '1%', fontSize: '0.74rem' }}>{label}</td>
            <td style={{ padding: divider ? '5px 12px 2px 4px' : '1px 12px 1px 4px', textAlign: 'right', fontWeight: bold ? 700 : 400, color: color || '#f8f9fa', whiteSpace: 'nowrap', fontSize: '0.74rem', fontVariantNumeric: 'tabular-nums' }}>{value}</td>
        </tr>
    );
    const renderTotalWithoutVATTooltip = () => (
        <Popover id="pc-total-ex-vat-tooltip" style={_scPopoverStyle}>
            <Popover.Header style={_scPopoverHeaderStyle}><span>{t("Total (ex. VAT)")}</span>{_scCloseBtn()}</Popover.Header>
            <Popover.Body style={_scPopoverBodyStyle}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>
                    {_scRow(t("Sum of all line totals (ex. VAT)"), '')}
                    {_scRow('= Total (ex. VAT)', `SAR ${trimTo2Decimals(formData.total || 0)}`, true, true, '#74c0fc')}
                </tbody></table>
            </Popover.Body>
        </Popover>
    );
    const renderTotalWithVATTooltip = () => (
        <Popover id="pc-total-inc-vat-tooltip" style={_scPopoverStyle}>
            <Popover.Header style={_scPopoverHeaderStyle}><span>{t("Total (inc. VAT)")}</span>{_scCloseBtn()}</Popover.Header>
            <Popover.Body style={_scPopoverBodyStyle}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>
                    {_scRow(t("Sum of all line totals (inc. VAT)"), '')}
                    {_scRow('= Total (inc. VAT)', `SAR ${trimTo2Decimals(formData.total_with_vat || 0)}`, true, true, '#74c0fc')}
                </tbody></table>
            </Popover.Body>
        </Popover>
    );
    const renderShippingTooltip = () => (
        <Popover id="pc-shipping-tooltip" style={_scPopoverStyle}>
            <Popover.Header style={_scPopoverHeaderStyle}><span>{t("Shipping & Handling")}</span>{_scCloseBtn()}</Popover.Header>
            <Popover.Body style={_scPopoverBodyStyle}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>
                    {_scRow(t("Additional shipping and handling charges"), '')}
                    {_scRow('= Shipping', `SAR ${trimTo2Decimals(shipping || 0)}`, true, true, '#74c0fc')}
                </tbody></table>
            </Popover.Body>
        </Popover>
    );
    const renderDiscountWithoutVATTooltip = () => (
        <Popover id="pc-discount-ex-vat-tooltip" style={_scPopoverStyle}>
            <Popover.Header style={_scPopoverHeaderStyle}><span>{t("Discount (ex. VAT)")}</span>{_scCloseBtn()}</Popover.Header>
            <Popover.Body style={_scPopoverBodyStyle}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>
                    {_scRow(t("Discount applied before VAT"), '')}
                    {_scRow('= Discount', `SAR ${trimTo2Decimals(discount || 0)}`, true, true, '#74c0fc')}
                </tbody></table>
            </Popover.Body>
        </Popover>
    );
    const renderDiscountWithVATTooltip = () => (
        <Popover id="pc-discount-inc-vat-tooltip" style={_scPopoverStyle}>
            <Popover.Header style={_scPopoverHeaderStyle}><span>{t("Discount (inc. VAT)")}</span>{_scCloseBtn()}</Popover.Header>
            <Popover.Body style={_scPopoverBodyStyle}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>
                    {_scRow(t("Discount applied including VAT"), '')}
                    {_scRow('= Discount', `SAR ${trimTo2Decimals(discountWithVAT || 0)}`, true, true, '#74c0fc')}
                </tbody></table>
            </Popover.Body>
        </Popover>
    );
    const renderTaxableAmountTooltip = () => {
        const total = trimTo2Decimals(formData.total || 0);
        const ship = trimTo2Decimals(shipping || 0);
        const disc = trimTo2Decimals(discount || 0);
        const result = trimTo2Decimals((formData.total || 0) + (shipping || 0) - (discount || 0));
        return (
            <Popover id="pc-taxable-tooltip" style={_scPopoverStyle}>
                <Popover.Header style={_scPopoverHeaderStyle}><span>{t("Taxable Amount (ex. VAT)")}</span>{_scCloseBtn()}</Popover.Header>
                <Popover.Body style={_scPopoverBodyStyle}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>
                        {_scRow('Total (ex. VAT)', total)}
                        {_scRow('+ Shipping', ship)}
                        {_scRow('− Discount (ex. VAT)', disc)}
                        {_scRow('= Taxable Amount', `SAR ${result}`, true, true, '#74c0fc')}
                    </tbody></table>
                </Popover.Body>
            </Popover>
        );
    };
    const renderVATTooltip = () => {
        const taxable = trimTo2Decimals((formData.total || 0) + (shipping || 0) - (discount || 0));
        const vatAmt = trimTo2Decimals(formData.vat_price || 0);
        return (
            <Popover id="pc-vat-tooltip" style={_scPopoverStyle}>
                <Popover.Header style={_scPopoverHeaderStyle}><span>{t("VAT")}</span>{_scCloseBtn()}</Popover.Header>
                <Popover.Body style={_scPopoverBodyStyle}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>
                        {_scRow('Taxable Amount', taxable)}
                        {_scRow(`× VAT (${formData.vat_percent || 0}%)`, '')}
                        {_scRow('= VAT', `SAR ${vatAmt}`, true, true, '#74c0fc')}
                    </tbody></table>
                </Popover.Body>
            </Popover>
        );
    };
    const renderNetTotalBeforeRoundingTooltip2 = () => {
        const taxable = trimTo2Decimals((formData.total || 0) + (shipping || 0) - (discount || 0));
        const vat = trimTo2Decimals(formData.vat_price || 0);
        const result = trimTo2Decimals((formData.net_total || 0) - (roundingAmount || 0));
        return (
            <Popover id="pc-net-before-rounding-tooltip" style={_scPopoverStyle}>
                <Popover.Header style={_scPopoverHeaderStyle}><span>{t("Before Rounding")}</span>{_scCloseBtn()}</Popover.Header>
                <Popover.Body style={_scPopoverBodyStyle}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>
                        {_scRow('Taxable Amount', taxable)}
                        {_scRow(`+ VAT (${formData.vat_percent || 0}%)`, vat)}
                        {_scRow('= Before Rounding', `SAR ${result}`, true, true, '#74c0fc')}
                    </tbody></table>
                </Popover.Body>
            </Popover>
        );
    };
    const renderNetTotalTooltip2 = () => {
        const taxable = trimTo2Decimals((formData.total || 0) + (shipping || 0) - (discount || 0));
        const vat = trimTo2Decimals(formData.vat_price || 0);
        const rounding = roundingAmount || 0;
        const net = trimTo2Decimals(formData.net_total || 0);
        return (
            <Popover id="pc-net-total-tooltip" style={_scPopoverStyle}>
                <Popover.Header style={_scPopoverHeaderStyle}><span>{t("Net Total (inc. VAT)")}</span>{_scCloseBtn()}</Popover.Header>
                <Popover.Body style={_scPopoverBodyStyle}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>
                        {_scRow('Taxable Amount', taxable)}
                        {_scRow(`+ VAT (${formData.vat_percent || 0}%)`, vat)}
                        {_scRow(`${rounding >= 0 ? '+ ' : '− '}Rounding`, trimTo2Decimals(Math.abs(rounding)))}
                        {_scRow('= Net Total', `SAR ${net}`, true, true, '#74c0fc')}
                    </tbody></table>
                </Popover.Body>
            </Popover>
        );
    };

    async function reCalculate(productIndex) {
        const requestId = Date.now();
        latestRequestRef.current = requestId;

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

        console.log("DISCOUNT:", discount);

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

            let purchaseUnitPrice = parseFloat(selectedProducts[i].purchase_unit_price);
            console.log("purchaseUnitPrice:", purchaseUnitPrice);
            console.log("selectedProducts[i].unit_price_with_vat:", selectedProducts[i].purchase_unit_price_with_vat);


            let purchaseUnitPriceWithVAT = parseFloat(selectedProducts[i].purchase_unit_price_with_vat);
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
                purchase_unit_price: purchaseUnitPrice ? purchaseUnitPrice : 0.00,
                purchase_unit_price_with_vat: purchaseUnitPriceWithVAT ? purchaseUnitPriceWithVAT : 0.00,
                // purchase_unit_price: selectedProducts[i].purchase_unit_price ? parseFloat(selectedProducts[i].purchase_unit_price) : 0,
                // purchase_unit_price_with_vat: selectedProducts[i].purchase_unit_price_with_vat ? parseFloat(selectedProducts[i].purchase_unit_price_with_vat) : 0,
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
                "/v1/purchase/calculate-net-total",
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


                            if (res.result?.products[j].purchase_unit_price) {
                                selectedProducts[i].purchase_unit_price = res.result?.products[j].purchase_unit_price;
                            }

                            if (res.result?.products[j].purchase_unit_price_with_vat) {
                                selectedProducts[i].purchase_unit_price_with_vat = res.result?.products[j].purchase_unit_price_with_vat;
                            }
                                */

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
        balanceAmount = (parseFloat(trimTo2Decimals(formData.net_total)) - parseFloat(trimTo2Decimals(cashDiscount))) - parseFloat(trimTo2Decimals(totalPayment));

        // alert(formData.net_total + "|" + balanceAmount + "|" + cashDiscount + "|" + totalPayment);

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

    let [totalPaymentAmount, setTotalPaymentAmount] = useState(0.00);
    let [balanceAmount, setBalanceAmount] = useState(0.00);
    let [paymentStatus, setPaymentStatus] = useState("");



    function removePayment(key, validatePayments = false) {
        formData.payments_input.splice(key, 1);

        delete errors["payment_amount_" + key];
        delete errors["payment_date_" + key];
        delete errors["payment_method_" + key];

        //formData.payments_input[key]["deleted"] = true;
        setFormData({ ...formData });
        if (validatePayments) {
            validatePaymentAmounts();
        }
        findTotalPayments()
    }


    function validatePaymentAmounts() {
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
                errors["payment_date_" + key] = "Payment date time should be greater than or equal to order date time";
                setErrors({ ...errors });
                haveErrors = true;
            }*/

            if (!formData.payments_input[key].method) {
                errors["payment_method_" + key] = t("Payment method is required");
                setErrors({ ...errors });
                haveErrors = true;
            }


            if ((formData.payments_input[key].amount || formData.payments_input[key].amount === 0) && !formData.payments_input[key].deleted) {
                let maxAllowedAmount = (formData.net_total - cashDiscount) - (totalPayment - formData.payments_input[key].amount);

                if (maxAllowedAmount < 0) {
                    maxAllowedAmount = 0;
                }

                /*
                
                if (maxAllowedAmount === 0) {
                    errors["payment_amount_" + key] = "Total amount should not exceed " + (formData.net_total - cashDiscount).toFixed(2).toString() + ", Please delete this payment";
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

    const UserCreateFormRef = useRef();



    const SignatureCreateFormRef = useRef();


    const ProductDetailsViewRef = useRef();
    function openProductDetails(id) {
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
        ProductsRef.current.open(true, "linked_products", model);
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

    function openProducts() {
        ProductsRef.current.open(true);
    }


    const handleSelectedProducts = (selected) => {
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
    };

    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState("");


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
        }
        PreviewRef.current.open(model, "whatsapp", "whatsapp_purchase");
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


    const inputRefs = useRef({});
    const cashDiscountRef = useRef(null);
    const commissionRef = useRef(null);

    const vendorSearchRef = useRef();



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
            errors["quantity_" + i] = "Quantity should be > 0";
        } else if (!selectedProducts[i].quantity) {
            errors["quantity_" + i] = "Quantity is required";
        } else {
            delete errors["quantity_" + i];
        }


        if (selectedProducts[i].purchase_unit_price && selectedProducts[i].purchase_unit_price <= 0) {
            errors["purchase_unit_price_" + i] = "Unit Price(without VAT) should be > 0";
        } else if (!selectedProducts[i].purchase_unit_price) {
            errors["purchase_unit_price_" + i] = "Unit Price(without VAT) is required";
        } else {
            delete errors["purchase_unit_price_" + i];
        }

        if (selectedProducts[i].purchase_unit_price_with_vat && selectedProducts[i].purchase_unit_price_with_vat <= 0) {
            errors["purchase_unit_price_with_vat_" + i] = "Unit Price(with VAT) should be > 0";
        } else if (!selectedProducts[i].purchase_unit_price) {
            errors["purchase_unit_price_with_vat_" + i] = "Unit Price(with VAT) is required";
        } else {
            delete errors["purchase_unit_price_with_vat_" + i];
        }


        /*
        if (selectedProducts[i].retail_unit_price && selectedProducts[i].retail_unit_price <= 0) {
            errors["retail_unit_price_" + i] = "Retail Unit Price should be > 0";
        } else {
            delete errors["retail_unit_price_" + i];
        }*/

        // alert(selectedProducts[i].retail_unit_price);


        if (selectedProducts[i].retail_unit_price > 0 && selectedProducts[i].purchase_unit_price > 0) {
            if (selectedProducts[i].purchase_unit_price > selectedProducts[i].retail_unit_price) {
                errors["purchase_unit_price_" + i] = "Unit Price should not be greater than Retail Unit Price(without VAT)";
                errors["retail_unit_price_" + i] = "Retail Unit price should not be less than Purchase Unit Price(without VAT)";

            } else {
                delete errors["purchase_unit_price_" + i];
                delete errors["retail_unit_price_" + i];
            }
        }

        if (selectedProducts[i].wholesale_unit_price > 0 && selectedProducts[i].purchase_unit_price > 0) {
            if (selectedProducts[i].purchase_unit_price > selectedProducts[i].wholesale_unit_price) {
                errors["purchase_unit_price_" + i] = "Unit Price should not be greater than Wholesale Unit Price(without VAT)";
                errors["wholesale_unit_price_" + i] = "Wholesale Unit price should not be less than Purchase Unit Price(without VAT)";

            } else {
                delete errors["purchase_unit_price_" + i];
                delete errors["wholesale_unit_price_" + i];
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

    const onChangeTriggeredRef = useRef(false);

    const ProductHistoryRef = useRef();
    function openProductHistory(model) {
        ProductHistoryRef.current.open(model);
    }

    //Image upload
    /* const [selectedImage, setSelectedImage] = useState(null);
     const [previewUrl, setPreviewUrl] = useState(null);
     const [uploading, setUploading] = useState(false);

    const resizeImage = (file) => {
        return new Promise((resolve) => {
            Resizer.imageFileResizer(
                file,
                800, // max width
                800, // max height
                "JPEG",
                80, // quality
                0, // rotation
                (uri) => {
                    resolve(uri);
                },
                "blob"
            );
        });
    };*/

    /* const handleFileChange = async (e) => {
         const file = e.target.files[0];
         if (!file) return;
 
         const resizedImage = await resizeImage(file);
         setSelectedImage(resizedImage);
         setPreviewUrl(URL.createObjectURL(resizedImage));
     };
    const handleUpload = async () => {
        if (!selectedImage) return;

        const formData = new FormData();
        formData.append("image", selectedImage);

        let endPoint = "/v1/purchase/upload/image";
        let method = "POST";

        let searchParams = {};
        if (localStorage.getItem("store_id")) {
            searchParams.store_id = localStorage.getItem("store_id");
        }
        let queryParams = new URLSearchParams(searchParams).toString();

        const requestOptions = {
            method: method,
            headers: {
                Accept: "application/json",
                Authorization: localStorage.getItem("access_token"),
                // Note: DO NOT add Content-Type manually for multipart/form-data
            },
            body: formData,
        };

        setUploading(true);

        try {
            const response = await fetch(`${endPoint}?${queryParams}`, requestOptions);
            const isJson = response.headers
                .get("content-type")
                ?.includes("application/json");
            const data = isJson ? await response.json() : null;

            if (!response.ok) {
                const error = data?.errors || "Upload failed";
                throw new Error(error);
            }

            // alert("Image uploaded successfully!");
        } catch (error) {
            console.error("Upload error:", error);
            alert("Upload failed");
        } finally {
            setUploading(false);
        }
    };*/

    //Search settings
    const [showProductSearchSettings, setShowProductSearchSettings] = useState(false);
    const defaultSearchProductsColumns = useMemo(() => [
        { key: "select", label: "Select", fieldName: "select", width: 3, visible: true },
        { key: "part_number", label: "Part Number", fieldName: "part_number", width: 12, visible: true },
        { key: "name", label: "Name", fieldName: "name", width: 26, visible: true },
        { key: "unit_price", label: t('S.Unit Price'), fieldName: "unit_price", width: 10, visible: true },
        { key: "stock", label: "Stock", fieldName: "stock", width: 13, visible: true },
        { key: "photos", label: "Photos", fieldName: "photos", width: 5, visible: true },
        { key: "brand", label: "Brand", fieldName: "brand", width: 8, visible: true },
        { key: "purchase_price", label: t('P.Unit Price'), fieldName: "purchase_price", width: 10, visible: true },
        { key: "country", label: t('Country'), fieldName: "country", width: 8, visible: true },
        { key: "rack", label: t('Rack'), fieldName: "rack", width: 5, visible: true },
    ], [t]);



    const [searchProductsColumns, setSearchProductsColumns] = useState(defaultSearchProductsColumns);

    const visibleColumns = searchProductsColumns.filter(c => c.visible);

    const totalWidth = visibleColumns.reduce((sum, col) => sum + col.width, 0);

    const [isWideScreen, setIsWideScreen] = useState(() => window.innerWidth > 1920);
    useEffect(() => {
        const onResize = () => setIsWideScreen(window.innerWidth > 1920);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    const getColumnWidth = (col) => {
        if (isWideScreen) {
            const nameCol = visibleColumns.find(c => c.key === 'name');
            if (nameCol) {
                if (col.key === 'name') return `${(col.width * 1.2 / totalWidth) * 100}%`;
                const afterNameKeys = new Set(['unit_price', 'stock', 'photos', 'brand', 'purchase_price', 'country', 'rack']);
                if (afterNameKeys.has(col.key)) {
                    const afterNameTotal = visibleColumns.filter(c => afterNameKeys.has(c.key)).reduce((s, c) => s + c.width, 0);
                    const boost = nameCol.width * 0.2;
                    return `${((col.width - (col.width / afterNameTotal) * boost) / totalWidth) * 100}%`;
                }
            }
        }
        return `${(col.width / totalWidth) * 100}%`;
    };

    const handleToggleColumn = (index) => {
        const updated = [...searchProductsColumns];
        updated[index].visible = !updated[index].visible;
        setSearchProductsColumns(updated);
        localStorage.setItem("purchase_product_search_settings", JSON.stringify(updated));
    };

    const onDragEnd = (result) => {
        if (!result.destination) return;
        const reordered = Array.from(searchProductsColumns);
        const [moved] = reordered.splice(result.source.index, 1);
        reordered.splice(result.destination.index, 0, moved);
        setSearchProductsColumns(reordered);
        localStorage.setItem("purchase_product_search_settings", JSON.stringify(reordered));
    };



    function RestoreDefaultSettings() {
        const clonedDefaults = defaultSearchProductsColumns.map(col => ({ ...col }));
        localStorage.setItem("purchase_product_search_settings", JSON.stringify(clonedDefaults));
        setSearchProductsColumns(clonedDefaults);

        setShowSuccess(true);
        setSuccessMessage("Successfully restored to default settings!");
    }


    // Load settings from localStorage
    useEffect(() => {
        const clonedDefaults = defaultSearchProductsColumns.map(col => ({ ...col }));

        let saved = localStorage.getItem("purchase_product_search_settings");
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

            localStorage.setItem("purchase_product_search_settings", JSON.stringify(clonedDefaults));
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
        localStorage.setItem("purchase_product_search_settings", JSON.stringify(searchProductsColumns));
    }, [searchProductsColumns]);*/

    const [showSuccess, setShowSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState(false);

    //Payment Reference form
    const PurchaseReturnUpdateFormRef = useRef();
    const VendorWithdrawalUpdateFormRef = useRef();
    const SalesUpdateFormRef = useRef();

    let [showReferenceUpdateForm, setShowReferenceUpdateForm] = useState(false);
    let [showPurchaseSPSettings, setShowPurchaseSPSettings] = useState(false);
    const defaultPurchaseSPColumns = [
        { key: 'delete', label: 'Delete', visible: true },
        { key: 'si_no', label: 'SI No.', visible: true },
        { key: 'part_number', label: 'Part No.', visible: true },
        { key: 'name', label: 'Name', visible: true },
        { key: 'info', label: 'Info', visible: true },
        { key: 'stock', label: 'Stock', visible: true },
        { key: 'qty', label: 'Qty', visible: true },
        { key: 'warehouse', label: 'Add Stock To', visible: true },
        { key: 'unit_price', label: 'Unit Price(without VAT)', visible: true },
        { key: 'unit_price_with_vat', label: 'Unit Price(with VAT)', visible: true },
        { key: 'unit_discount', label: 'Unit Disc.(without VAT)', visible: true },
        { key: 'unit_discount_with_vat', label: 'Unit Disc.(with VAT)', visible: true },
        { key: 'unit_discount_percent', label: 'Unit Disc. %(without VAT)', visible: true },
        { key: 'wholesale_unit_price', label: 'Set Wholesale unit price(without VAT)', visible: true },
        { key: 'retail_unit_price', label: 'Set Retail unit price(without VAT)', visible: true },
        { key: 'price', label: 'Price(without VAT)', visible: true },
        { key: 'price_with_vat', label: 'Price(with VAT)', visible: true },
    ];
    const [purchaseSPColumns, setPurchaseSPColumns] = useState(() => {
        try {
            const saved = localStorage.getItem('purchase_sp_table_settings');
            if (saved) {
                const parsed = JSON.parse(saved);
                const merged = parsed.map(p => {
                    const def = defaultPurchaseSPColumns.find(d => d.key === p.key);
                    return def ? { ...def, visible: p.visible } : null;
                }).filter(Boolean);
                const newCols = defaultPurchaseSPColumns.filter(d => !parsed.find(p => p.key === d.key));
                return [...merged, ...newCols];
            }
        } catch (e) { }
        return defaultPurchaseSPColumns;
    });
    useEffect(() => {
        localStorage.setItem('purchase_sp_table_settings', JSON.stringify(purchaseSPColumns));
    }, [purchaseSPColumns]);
    const handleTogglePurchaseSPColumn = (key) => {
        setPurchaseSPColumns(cols => cols.map(c => c.key === key ? { ...c, visible: !c.visible } : c));
    };
    const onDragEndPurchaseSP = (result) => {
        if (!result.destination) return;
        const items = Array.from(purchaseSPColumns);
        const [reordered] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reordered);
        setPurchaseSPColumns(items);
    };
    const restoreDefaultPurchaseSPSettings = () => {
        setPurchaseSPColumns(defaultPurchaseSPColumns);
        localStorage.removeItem('purchase_sp_table_settings');
    };
    const [formType, setFormType] = useState(() => localStorage.getItem('purchase_form_type') || 'type1');
    useEffect(() => { localStorage.setItem('purchase_form_type', formType); }, [formType]);
    useEffect(() => {
        if (store?.settings?.purchase_create_form_design) {
            setFormType(store.settings.purchase_create_form_design);
        }
    }, [store?.settings?.purchase_create_form_design]);
    const SC_COL_DEFAULTS_P = { si_no: 40, part_number: 100, name: 200, info: 50, purchase_unit_price: 130, stock: 60, qty: 117, warehouse: 130, unit_price: 130, unit_price_with_vat: 130, unit_discount: 120, unit_discount_with_vat: 120, unit_discount_percent: 90, wholesale_unit_price: 130, retail_unit_price: 130, price: 120, price_with_vat: 120, delete: 50 };
    const [scColWidths, setScColWidths] = useState(() => { try { return JSON.parse(localStorage.getItem('p_sc_col_widths')) || {}; } catch { return {}; } });
    useEffect(() => { localStorage.setItem('p_sc_col_widths', JSON.stringify(scColWidths)); }, [scColWidths]);
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
            if (referenceModel === "vendor_withdrawal") {
                VendorWithdrawalUpdateFormRef.current.open(id);
            } else if (referenceModel === "sales") {
                SalesUpdateFormRef.current.open(id);
            } else if (referenceModel === "purchase_return") {
                PurchaseReturnUpdateFormRef.current.open(id);
            }
        }, 50);
    }

    const handleReferenceUpdated = () => {
        if (formData.id) {
            getPurchase(formData.id);
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


    function openVendorUpdateForm(id) {
        VendorCreateFormRef.current.open(id);
    }


    const handleVendorUpdated = (updatedVendor) => {

        // alert(updatedVendor);
        if (updatedVendor.name && updatedVendor.id) {
            // alert("updatedVendor.vendor_name:" + updatedVendor.name);
            let selectedVendors = [
                {
                    id: updatedVendor.id,
                    name: updatedVendor.name,
                    search_label: updatedVendor.search_label,
                }
            ];
            setSelectedVendors([...selectedVendors]);

            formData.vendor_id = updatedVendor.id;
            if (updatedVendor.use_remarks_in_sales && updatedVendor.remarks) {
                formData.remarks = updatedVendor.remarks;
            }

            if (updatedVendor.phone && !formData.phone) {
                formData.phone = updatedVendor.phone;
            }

            setFormData({ ...formData });
        }
    };


    let [showVendorPending, setShowVendorPending] = useState(false);

    const VendorPendingRef = useRef();
    const paymentValidationTimer = useRef(null);
    function openVendorPending(vendor) {
        setShowVendorPending(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            VendorPendingRef.current?.open(false, vendor);
        }, 50);
    }

    return (
        <>

            {showVendorPending && <VendorPending ref={VendorPendingRef} />}
            {showReferenceUpdateForm && <>
                <VendorWithdrawalCreate ref={VendorWithdrawalUpdateFormRef} onUpdated={handleReferenceUpdated} />
                <SalesUpdateForm ref={SalesUpdateFormRef} onUpdated={handleReferenceUpdated} />
                <PurchaseReturnCreate ref={PurchaseReturnUpdateFormRef} onUpdated={handleReferenceUpdated} />
            </>}

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
                            <h6 className="mb-2">{t('Customize Columns')}</h6>
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
                        {t("Close")}
                    </Button>
                    <Button
                        variant="primary"
                        onClick={() => {
                            RestoreDefaultSettings();
                            // Save to localStorage here if needed
                            //setShowSettings(false);
                        }}
                    >
                        {t("Restore to Default")}
                    </Button>
                </Modal.Footer>
            </Modal>
            <ProductHistory ref={ProductHistoryRef} showToastMessage={props.showToastMessage} />
            <ImageViewerModal ref={imageViewerRef} images={productImages} />
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
            <ProductCreate ref={ProductCreateFormRef} showToastMessage={props.showToastMessage} />


            <UserCreate ref={UserCreateFormRef} showToastMessage={props.showToastMessage} />
            <SignatureCreate ref={SignatureCreateFormRef} showToastMessage={props.showToastMessage} />
            <VendorCreate ref={VendorCreateFormRef} onUpdated={handleVendorUpdated} />
            <Modal show={show} size="xl" fullscreen onHide={handleClose} animation={false} backdrop="static" scrollable={true}>
                {formType === 'type2' && (
                    <Modal.Header style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #c3c6d7', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                        {/* Left: title + ZATCA */}
                        <div className="sc-header-title" style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flexShrink: 1 }}>
                            <h1 style={{ margin: 0, fontSize: '20px', lineHeight: '28px', fontWeight: 700, letterSpacing: '-0.01em', fontFamily: "'Hanken Grotesk', sans-serif", color: '#191c1e', whiteSpace: 'nowrap' }}>
                                {formData.id ? t('Update Purchase') + " #" + formData.code : t('Create New Purchase')}
                            </h1>
                            {store?.zatca?.phase === "2" && store?.zatca?.connected && !formData.id && (
                                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#434655', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                    <input type="checkbox" className="form-check-input" id="purchase_report_to_zatca" name="report_to_zatca" checked={formData.enable_report_to_zatca} onChange={(e) => { formData.enable_report_to_zatca = !formData.enable_report_to_zatca; setFormData({ ...formData }); }} style={{ width: '14px', height: '14px', margin: 0 }} />
                                    {t("Report to Zatca")}
                                </label>
                            )}
                        </div>
                        {/* Right: action buttons */}
                        <div className="sc-header-actions">
                            <button type="button" onClick={openPreview} style={{ display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #c3c6d7', backgroundColor: '#f7f9fb', color: '#434655', padding: '6px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}>
                                <i className="bi bi-printer" style={{ fontSize: '14px' }}></i> {t('Print')}
                            </button>
                            <button type="button" onClick={(e) => { e.preventDefault(); handleCreate(e); }} style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#004ac6', color: '#ffffff', border: 'none', padding: '6px 16px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', minWidth: '70px', justifyContent: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                                {isProcessing ? <Spinner as="span" animation="border" size="sm" role="status" aria-hidden={true} /> : <><i className="bi bi-check2" style={{ fontSize: '14px' }}></i> {formData.id ? t('Update') : t('Create')}</>}
                            </button>
                            {store.settings?.enable_purchase_page_selection === true && (
                                <select value={formType} onChange={(e) => setFormType(e.target.value)} className="form-select form-select-sm" style={{ width: 'auto', fontSize: '11px', padding: '2px 24px 2px 6px', height: '30px' }}>
                                    <option value="type2">{t("Type 2")} (Compact)</option>
                                    <option value="type1">{t("Type 1")} (Classic)</option>
                                </select>
                            )}
                            <button type="button" className="btn-close" onClick={handleClose} aria-label="Close" style={{ marginLeft: '4px' }}></button>
                        </div>
                    </Modal.Header>
                )}
                {formType !== 'type2' && (
                    <Modal.Header>
                        <Modal.Title>
                            {formData.id ? t('Update Purchase') + " #" + formData.code : t('Create New Purchase')}
                        </Modal.Title>

                        <div className="col align-self-end text-end">

                            <Button variant="primary" onClick={openPreview}>
                                <i className="bi bi-printer"></i> {t('Print Full Invoice')}
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
                                {formData.id && !isProcessing ? t('Update') : !isProcessing ? t('Create') : ""}
                            </Button>

                            <button
                                type="button"
                                className="btn-close"
                                onClick={handleClose}
                                aria-label="Close"
                            ></button>
                        </div>
                    </Modal.Header>
                )}
                <Modal.Body>
                    {errors && Object.keys(errors).some(k => { const m = Array.isArray(errors[k]) ? errors[k][0] : errors[k]; return !!m; }) && (
                        <div style={{ maxHeight: '120px', overflowY: 'auto', padding: '8px 12px', backgroundColor: '#fff0f0', borderLeft: '1px solid #f5c6cb', borderBottom: '1px solid #f5c6cb', boxShadow: '-2px 2px 8px rgba(186,26,26,0.12)', position: 'fixed', top: '56px', right: 0, width: '380px', zIndex: 9999 }}>
                            <ul style={{ marginBottom: 0, paddingLeft: 16 }}>
                                {Object.keys(errors).map((key, index) => { const message = Array.isArray(errors[key]) ? errors[key][0] : errors[key]; return message ? <li key={index} style={{ color: '#dc2626', fontSize: '12px' }}>{t(message)}</li> : null; })}
                            </ul>
                        </div>
                    )}
                    <form className="row g-3 needs-validation" onSubmit={handleCreate}>
{formType !== 'type2' && (<>
                        <div className="col-12">
                            <div className="entity-header-grid">
                                {/* LEFT: vendor Typeahead + form fields */}
                                <div>
                                    {/* Vendor search row */}
                                    <div style={{ marginBottom: '12px' }}>
                                        <label className="form-label">{t('Vendor')}</label>
                                        <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-start' }}>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <Typeahead
                                                    id="vendor_search"
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
                                                            //setErrors(errors);
                                                            formData.vendor_id = "";
                                                            formData.vendor_name = "";

                                                            setFormData({ ...formData });
                                                            setSelectedVendors([]);
                                                            setVendorOptions([]);
                                                            vendorSearchRef.current?.clear();
                                                        }
                                                    }}
                                                    onInputChange={(searchTerm, e) => {
                                                        if (searchTerm) {
                                                            formData.vendor_name = searchTerm;
                                                        }
                                                        setFormData({ ...formData });
                                                        if (timerRef.current) clearTimeout(timerRef.current);
                                                        timerRef.current = setTimeout(() => {
                                                            suggestVendors(searchTerm);
                                                        }, 350);
                                                    }}

                                                    renderMenu={(results, menuProps, state) => {
                                                        const searchWords = state.text.toLowerCase().split(" ").filter(Boolean);

                                                        return (
                                                            <Menu {...menuProps} style={{ ...(menuProps.style || {}), width: '95vw', maxWidth: '95vw', minWidth: '300px', zIndex: 9999 }}>
                                                                {/* Header */}
                                                                <MenuItem disabled style={{ padding: 0, margin: 0 }}>
                                                                    <div style={{ display: 'flex', fontWeight: 'bold', padding: '4px 8px', borderBottom: '1px solid #ddd' }}>
                                                                        <div style={{ width: '10%' }}>ID</div>
                                                                        <div style={{ width: '50%' }}>Name</div>
                                                                        <div style={{ width: '10%' }}>Phone</div>
                                                                        <div style={{ width: '13%' }}>VAT</div>
                                                                        <div style={{ width: '10%' }}>Credit Balance</div>
                                                                        <div style={{ width: '7%' }}>Credit Limit</div>
                                                                    </div>
                                                                </MenuItem>

                                                                {/* Rows */}
                                                                {results.map((option, index) => {
                                                                    const onlyOneResult = results.length === 1;
                                                                    const isActive = state.activeIndex === index || onlyOneResult;
                                                                    return (
                                                                        <MenuItem option={option} position={index} key={index} style={{ padding: "0px" }}>
                                                                            <div style={{ display: 'flex', padding: '4px 8px' }}>
                                                                                <div style={{ ...columnStyle, width: '10%' }}>
                                                                                    {highlightWords(
                                                                                        option.code,
                                                                                        searchWords,
                                                                                        isActive
                                                                                    )}
                                                                                </div>
                                                                                <div style={{ ...columnStyle, width: '50%' }}>
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
                                                                                    {option.credit_balance && (
                                                                                        <Amount amount={trimTo2Decimals(option.credit_balance)} />
                                                                                    )}
                                                                                </div>
                                                                                <div style={{ ...columnStyle, width: '7%' }}>
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
                                            </div>
                                            <Button hide={true.toString()} onClick={openVendorCreateForm} className="btn btn-outline-secondary btn-primary btn-sm" type="button" id="button-addon1"><i className="bi bi-plus-lg"></i> {t('New')}</Button>
                                            <Button onClick={openVendors} className="btn btn-outline-secondary btn-primary btn-sm" type="button"><i className="bi bi-list"></i></Button>
                                            {selectedVendors.length > 0 && formData.vendor_id && <Button className="btn btn-outline-secondary btn-primary btn-sm" type="button" onClick={() => openVendorUpdateForm(formData.vendor_id)}><i className="bi bi-pencil"></i></Button>}
                                        </div>
                                        {errors.vendor_id && <div style={{ color: 'red' }}>{errors.vendor_id}</div>}
                                    </div>
                                    {/* Other form fields — 2×3 CSS Grid matching Sales form */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '231px 1fr 1fr', gap: '8px 45px', alignItems: 'start', maxWidth: '80%', marginTop: '8px' }}>

                                        {/* R1C1: Date */}
                                        <div>
                                            <label className="form-label" style={{ fontSize: '12px', marginBottom: '2px' }}>{t('Date Time')} *</label>
                                            <DatePicker
                                                id="date_str"
                                                selected={formData.date_str ? new Date(formData.date_str) : null}
                                                value={formData.date_str ? format(new Date(formData.date_str), "MMMM d, yyyy h:mm aa", { locale: dateLocale }) : null}
                                                className="form-control"
                                                dateFormat="MMMM d, yyyy h:mm aa"
                                                locale={dateLocale}
                                                showTimeSelect
                                                timeIntervals="1"
                                                onChange={(value) => {
                                                    formData.date_str = value;
                                                    setFormData({ ...formData });
                                                }}
                                            />
                                            {errors.date_str && <div style={{ color: "red" }}>{errors.date_str}</div>}
                                        </div>

                                        {/* R1C2: Phone + WhatsApp inline */}
                                        <div>
                                            <label className="form-label" style={{ fontSize: '12px', marginBottom: '2px' }}>{t('Phone ( 05.. / +966..)')}</label>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <input id="purchase_phone_no" name="purchase_phone_no"
                                                    value={formData.phone ? formData.phone : ""}
                                                    type='string'
                                                    onChange={(e) => {
                                                        delete errors["phone"];
                                                        setErrors({ ...errors });
                                                        formData.phone = e.target.value;
                                                        setFormData({ ...formData });
                                                    }}
                                                    className="form-control"
                                                    placeholder={t('Phone ( 05.. / +966..)')}
                                                />
                                                <Button className="btn btn-success btn-sm" onClick={sendWhatsAppMessage} style={{ flexShrink: 0 }}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="white" viewBox="0 0 16 16">
                                                        <path d="M13.601 2.326A7.875 7.875 0 0 0 8.036 0C3.596 0 0 3.597 0 8.036c0 1.417.37 2.805 1.07 4.03L0 16l3.993-1.05a7.968 7.968 0 0 0 4.043 1.085h.003c4.44 0 8.036-3.596 8.036-8.036 0-2.147-.836-4.166-2.37-5.673ZM8.036 14.6a6.584 6.584 0 0 1-3.35-.92l-.24-.142-2.37.622.63-2.31-.155-.238a6.587 6.587 0 0 1-1.018-3.513c0-3.637 2.96-6.6 6.6-6.6 1.764 0 3.42.69 4.67 1.94a6.56 6.56 0 0 1 1.93 4.668c0 3.637-2.96 6.6-6.6 6.6Zm3.61-4.885c-.198-.1-1.17-.578-1.352-.644-.18-.066-.312-.1-.444.1-.13.197-.51.644-.626.775-.115.13-.23.15-.428.05-.198-.1-.837-.308-1.594-.983-.59-.525-.99-1.174-1.11-1.372-.116-.198-.012-.305.088-.403.09-.09.198-.23.298-.345.1-.115.132-.197.2-.33.065-.13.032-.247-.017-.345-.05-.1-.444-1.07-.61-1.46-.16-.384-.323-.332-.444-.338l-.378-.007c-.13 0-.344.048-.525.23s-.688.672-.688 1.64c0 .967.704 1.9.802 2.03.1.13 1.386 2.116 3.365 2.963.47.203.837.324 1.122.414.472.15.902.13 1.24.08.378-.057 1.17-.48 1.336-.942.165-.462.165-.858.116-.943-.048-.084-.18-.132-.378-.23Z" />
                                                    </svg>
                                                </Button>
                                            </div>
                                            {errors.phone && <div style={{ color: "red" }}>{errors.phone}</div>}
                                        </div>

                                        {/* R1C3: VAT NO. */}
                                        <div>
                                            <label className="form-label" style={{ fontSize: '12px', marginBottom: '2px' }}>{t('VAT NO.(15 digits)')}</label>
                                            <input id="purchase_vat_no" name="purchase_vat_no"
                                                value={formData.vat_no ? formData.vat_no : ""}
                                                type='string'
                                                onChange={(e) => {
                                                    delete errors["vat_no"];
                                                    setErrors({ ...errors });
                                                    formData.vat_no = e.target.value;
                                                    setFormData({ ...formData });
                                                }}
                                                className="form-control"
                                                placeholder={t('VAT NO.(15 digits)')}
                                            />
                                            {errors.vat_no && <div style={{ color: "red" }}>{errors.vat_no}</div>}
                                        </div>

                                        {/* R2C1: Vendor Invoice No. */}
                                        <div>
                                            <label className="form-label" style={{ fontSize: '12px', marginBottom: '2px' }}>{t('Vendor Invoice No. (Optional)')}</label>
                                            <input id="purchase_vendor_invoice_no" name="purchase_vendor_invoice_no"
                                                value={formData.vendor_invoice_no ? formData.vendor_invoice_no : ""}
                                                type='string'
                                                onChange={(e) => {
                                                    delete errors["vendor_invoice_no"];
                                                    setErrors({ ...errors });
                                                    formData.vendor_invoice_no = e.target.value;
                                                    setFormData({ ...formData });
                                                }}
                                                className="form-control"
                                                placeholder={t('Vendor Invoice No. (Optional)')}
                                            />
                                            {errors.vendor_invoice_no && <div style={{ color: "red" }}>{errors.vendor_invoice_no}</div>}
                                        </div>

                                        {/* R2C2: Address */}
                                        <div>
                                            <label className="form-label" style={{ fontSize: '12px', marginBottom: '2px' }}>{t('Address')}</label>
                                            <textarea
                                                value={formData.address}
                                                onChange={(e) => {
                                                    delete errors["address"];
                                                    setErrors({ ...errors });
                                                    formData.address = e.target.value;
                                                    setFormData({ ...formData });
                                                }}
                                                className="form-control"
                                                id="address"
                                                placeholder={t('Address')}
                                                style={{ width: '100%' }}
                                            />
                                            {errors.address && <div style={{ color: "red" }}>{errors.address}</div>}
                                        </div>

                                        {/* R2C3: Remarks */}
                                        <div>
                                            <label className="form-label" style={{ fontSize: '12px', marginBottom: '2px' }}>{t('Remarks')}</label>
                                            <textarea
                                                value={formData.remarks}
                                                onChange={(e) => {
                                                    delete errors["remarks"];
                                                    setErrors({ ...errors });
                                                    formData.remarks = e.target.value;
                                                    setFormData({ ...formData });
                                                }}
                                                className="form-control"
                                                id="remarks"
                                                placeholder={t('Remarks')}
                                                style={{ width: '100%' }}
                                            />
                                            {errors.remarks && <div style={{ color: "red" }}>{errors.remarks}</div>}
                                        </div>

                                    </div>
                                </div>
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
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', userSelect: 'none' }} onClick={() => openVendorPending(selectedVendors[0])} title="Click to view pendings">
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
                                </div>
                            </div>
                        </div>

                        <div className="col-md-10">
                            <label className="form-label">{t('Product')}*</label>
                            <Typeahead
                                id="product_id"
                                filterBy={() => true}
                                size="lg"
                                ref={productSearchRef}
                                labelKey="search_label"
                                emptyLabel=""
                                clearButton={true}
                                open={openProductSearchResult}
                                isLoading={false}
                                isInvalid={errors.product_id ? true : false}
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

                                    if (formData.store_id) {
                                        addProduct(selectedItems[0]);

                                    }
                                    setOpenProductSearchResult(false);
                                    timerRef.current = setTimeout(() => {
                                        inputRefs.current[(selectedProducts.length - 1)][`${"purchase_product_quantity_" + (selectedProducts.length - 1)}`].select();
                                    }, 100);

                                }}
                                options={productOptions}
                                selected={selectedProduct}
                                onKeyDown={(e) => {
                                    if (timerRef.current) clearTimeout(timerRef.current);

                                    if (e.key === "Escape") {
                                        setProductOptions([]);
                                        setOpenProductSearchResult(false);
                                        timerRef.current = setTimeout(() => {
                                            productSearchRef.current?.clear();
                                        }, 100);
                                    }

                                    timerRef.current = setTimeout(() => {
                                        productSearchRef.current.focus();
                                    }, 100);


                                }}
                                placeholder={t('Part No. | Name | Name in Arabic | Brand | Country')}
                                highlightOnlyResult={true}
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
                                        <Menu {...menuProps} style={{ ...(menuProps.style || {}), width: '95vw', maxWidth: '95vw', minWidth: '300px', zIndex: 9999 }}>
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
                                                            {col.key === "unit_price" && <div style={{ width: getColumnWidth(col), border: "solid 0px", }}>{t('S.Unit Price')}</div>}
                                                            {col.key === "stock" && <div style={{ width: getColumnWidth(col), border: "solid 0px", }}>Stock</div>}
                                                            {col.key === "photos" && <div style={{ width: getColumnWidth(col), border: "solid 0px", }}>Photos</div>}
                                                            {col.key === "brand" && <div style={{ width: getColumnWidth(col), border: "solid 0px", }}>Brand</div>}
                                                            {col.key === "purchase_price" && <div style={{ width: getColumnWidth(col), border: "solid 0px", }}>{t('P.Unit Price')}</div>}
                                                            {col.key === "country" && <div style={{ width: getColumnWidth(col), border: "solid 0px", }}>{t('Country')}</div>}
                                                            {col.key === "rack" && <div style={{ width: getColumnWidth(col), border: "solid 0px", }}>{t('Rack')}</div>}
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
                                                                    {col.key === "rack" && (() => {
                                                                        if (store?.settings?.enable_warehouse_module) {
                                                                            const storeId = localStorage.getItem("store_id");
                                                                            const wRacks = option.product_stores?.[storeId]?.warehouse_racks;
                                                                            const parts = [];
                                                                            if (wRacks?.main_store) parts.push(`MS:${wRacks.main_store}`);
                                                                            if (wRacks) Object.entries(wRacks).filter(([k]) => k !== "main_store").forEach(([k, v]) => { if (v) parts.push(`${k}:${v}`); });
                                                                            const rackText = parts.join(" | ") || option.rack || "";
                                                                            return <div style={{ ...columnStyle, width: getColumnWidth(col), whiteSpace: 'normal', overflow: 'visible' }} title={rackText}>{rackText}</div>;
                                                                        }
                                                                        return <div style={{ ...columnStyle, width: getColumnWidth(col) }}>{highlightWords(option.rack, searchWords, isActive)}</div>;
                                                                    })()}
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

                        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0" }}>
                            <Button variant="light" size="sm" title="Table Settings" onClick={() => setShowPurchaseSPSettings(true)}>
                                <i className="bi bi-gear"></i>
                            </Button>
                        </div>
</>)}
                        {(() => {
                        const purchaseSPTableBodyRows = selectedProducts.map((product, index) => {
                            // Find all indexes with the same product_id
                            const duplicateIndexes = selectedProducts
                                .map((p, i) => p.product_id === product.product_id ? i : -1)
                                .filter(i => i !== -1);
                            const duplicateCount = duplicateIndexes.length;
                            return (
                                <tr className="text-center fixed-row " key={index}
                                    style={{ borderBottom: '1px solid #e2e8f0', transition: 'background-color 0.15s' }}
                                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = ''; }}>
                                    {purchaseSPColumns.filter(c => c.visible).map(col => {
                                        if (col.key === 'delete') return (<td key="delete" style={{ verticalAlign: 'middle', padding: '0.25rem' }} >
                                            <div
                                                style={{ color: "red", cursor: "pointer" }}
                                                onClick={() => {
                                                    removeProduct(product);
                                                }}
                                            >
                                                <i className="bi bi-trash"> </i>
                                            </div>
                                        </td>);
                                        if (col.key === 'si_no') return (<td key="si_no" style={{ verticalAlign: 'middle', padding: '0.25rem' }}>{index + 1}</td>);
                                        // eslint-disable-next-line no-lone-blocks
                                        {/*<td style={{ verticalAlign: 'middle', padding: '0.25rem', width: "auto", whiteSpace: "nowrap" }}>
                                    <OverflowTooltip maxWidth={120} value={product.prefix_part_number ? product.prefix_part_number + " - " + product.part_number : product.part_number} />
                                </td>*/}
                                        if (col.key === 'part_number') return (<ResizableTableCell key="part_number" style={{ verticalAlign: 'middle', padding: '0.25rem' }}
                                        >
                                            <input type="text" id={`${"purchase_product_part_number" + index}`}
                                                name={`${"purchase_product_part_number" + index}`}
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
                                        </ResizableTableCell>);
                                        if (col.key === 'name') return (<ResizableTableCell key="name" style={{ verticalAlign: 'middle', padding: '0.25rem' }}
                                        >
                                            <div className="input-group" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                                <input type="text" id={`${"purchase_product_name" + index}`}
                                                    name={`${"purchase_product_name" + index}`}
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
                                        if (col.key === 'info') return (<td key="info" style={{ verticalAlign: 'middle', padding: '4px 6px', textAlign: 'center' }}>
                                          <Dropdown drop="auto">
                                            <Dropdown.Toggle as="span" id={`info-dd-${index}`} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '6px', cursor: 'pointer', color: '#6b7280', transition: 'background 0.15s, color 0.15s' }}
                                              onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#191c1e'; }}
                                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#6b7280'; }}>
                                              <i className="bi bi-three-dots-vertical" style={{ fontSize: '15px', pointerEvents: 'none' }}></i>
                                            </Dropdown.Toggle>
                                            <Dropdown.Menu style={{ zIndex: 9999, fontSize: '13px', minWidth: '210px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '4px' }} popperConfig={{ modifiers: [{ name: 'preventOverflow', options: { boundary: 'viewport' } }] }}>
                                              <Dropdown.Item style={{ borderRadius: '6px', padding: '7px 12px' }} onClick={() => openLinkedProducts(product)}>
                                                <i className="bi bi-link-45deg me-2" style={{ color: '#6366f1' }}></i>{t('Linked Products')} <span className="text-muted" style={{ fontSize: '11px' }}>({getShortcut('linkedProducts')})</span>
                                              </Dropdown.Item>
                                              <Dropdown.Item style={{ borderRadius: '6px', padding: '7px 12px' }} onClick={() => openProductImages(product.product_id)}>
                                                <i className="bi bi-images me-2" style={{ color: '#0ea5e9' }}></i>{t('Images')} <span className="text-muted" style={{ fontSize: '11px' }}>({getShortcut('images')})</span>
                                              </Dropdown.Item>
                                              <Dropdown.Divider style={{ margin: '4px 0' }} />
                                              <Dropdown.Item style={{ borderRadius: '6px', padding: '7px 12px' }} onClick={() => openProductHistory(product)}>
                                                <i className="bi bi-journal-text me-2" style={{ color: '#64748b' }}></i>{t('Product History')} <span className="text-muted" style={{ fontSize: '11px' }}>({getShortcut('productHistory')})</span>
                                              </Dropdown.Item>
                                              <Dropdown.Item style={{ borderRadius: '6px', padding: '7px 12px' }} onClick={() => openSalesHistory(product)}>
                                                <i className="bi bi-receipt me-2" style={{ color: '#16a34a' }}></i>{t('Sales History')} <span className="text-muted" style={{ fontSize: '11px' }}>({getShortcut('salesHistory')})</span>
                                              </Dropdown.Item>
                                              <Dropdown.Item style={{ borderRadius: '6px', padding: '7px 12px' }} onClick={() => openSalesReturnHistory(product)}>
                                                <i className="bi bi-arrow-return-left me-2" style={{ color: '#dc2626' }}></i>{t('Sales Return History')} <span className="text-muted" style={{ fontSize: '11px' }}>({getShortcut('salesReturnHistory')})</span>
                                              </Dropdown.Item>
                                              <Dropdown.Item style={{ borderRadius: '6px', padding: '7px 12px' }} onClick={() => openPurchaseHistory(product)}>
                                                <i className="bi bi-bag me-2" style={{ color: '#d97706' }}></i>{t('Purchase History')} <span className="text-muted" style={{ fontSize: '11px' }}>({getShortcut('purchaseHistory')})</span>
                                              </Dropdown.Item>
                                              <Dropdown.Item style={{ borderRadius: '6px', padding: '7px 12px' }} onClick={() => openPurchaseReturnHistory(product)}>
                                                <i className="bi bi-bag-x me-2" style={{ color: '#ea580c' }}></i>{t('Purchase Return History')} <span className="text-muted" style={{ fontSize: '11px' }}>({getShortcut('purchaseReturnHistory')})</span>
                                              </Dropdown.Item>
                                              <Dropdown.Item style={{ borderRadius: '6px', padding: '7px 12px' }} onClick={() => openDeliveryNoteHistory(product)}>
                                                <i className="bi bi-truck me-2" style={{ color: '#0891b2' }}></i>{t('Delivery Note History')} <span className="text-muted" style={{ fontSize: '11px' }}>({getShortcut('deliveryNoteHistory')})</span>
                                              </Dropdown.Item>
                                              <Dropdown.Item style={{ borderRadius: '6px', padding: '7px 12px' }} onClick={() => openQuotationHistory(product, "quotation")}>
                                                <i className="bi bi-file-earmark-text me-2" style={{ color: '#7c3aed' }}></i>{t('Quotation History')} <span className="text-muted" style={{ fontSize: '11px' }}>({getShortcut('quotationHistory')})</span>
                                              </Dropdown.Item>
                                              <Dropdown.Item style={{ borderRadius: '6px', padding: '7px 12px' }} onClick={() => openQuotationSalesHistory(product)}>
                                                <i className="bi bi-file-earmark-check me-2" style={{ color: '#0284c7' }}></i>{t('Qtn. Sales History')} <span className="text-muted" style={{ fontSize: '11px' }}>({getShortcut('quotationSalesHistory')})</span>
                                              </Dropdown.Item>
                                              <Dropdown.Item style={{ borderRadius: '6px', padding: '7px 12px' }} onClick={() => openQuotationSalesReturnHistory(product)}>
                                                <i className="bi bi-file-earmark-x me-2" style={{ color: '#be123c' }}></i>{t('Qtn. Sales Return History')} <span className="text-muted" style={{ fontSize: '11px' }}>({getShortcut('quotationSalesReturnHistory')})</span>
                                              </Dropdown.Item>
                                            </Dropdown.Menu>
                                          </Dropdown>
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
                                            padding: '4px 8px',
                                            whiteSpace: 'nowrap',
                                            position: 'relative',
                                            textAlign: 'left',
                                        }}>
                                            <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                                                <div className="input-group flex-nowrap" style={{ width: 'auto', minWidth: 0 }}>
                                                    <input
                                                        style={{ width: "81px", minWidth: "54px" }}
                                                        id={`${"purchase_product_quantity_" + index}`}
                                                        name={`${"purchase_product_quantity_" + index}`}
                                                        type="number"
                                                        value={product.quantity}
                                                        className="form-control"
                                                        placeholder="Quantity"
                                                        ref={(el) => {
                                                            if (!inputRefs.current[index]) inputRefs.current[index] = {};
                                                            inputRefs.current[index][`${"purchase_product_quantity_" + index}`] = el;
                                                        }}
                                                        onFocus={() => {
                                                            if (timerRef.current) clearTimeout(timerRef.current);
                                                            timerRef.current = setTimeout(() => {
                                                                inputRefs.current[index][`${"purchase_product_quantity_" + index}`].select();
                                                            }, 20);
                                                        }}
                                                        onKeyDown={(e) => {
                                                            RunKeyActions(e, product);

                                                            if (timerRef.current) clearTimeout(timerRef.current);
                                                            if (e.key === "ArrowLeft") {
                                                                if ((index + 1) === selectedProducts.length) {
                                                                    timerRef.current = setTimeout(() => {
                                                                        productSearchRef.current?.focus();
                                                                    }, 100);
                                                                } else {
                                                                    timerRef.current = setTimeout(() => {
                                                                        inputRefs.current[(index + 1)][`${"purchase_unit_discount_" + (index + 1)}`].select();
                                                                    }, 50);
                                                                }
                                                            }
                                                        }}
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
                                                    <input type="number"
                                                        id={`${"purchase_product_unit_price_" + index}`}
                                                        name={`${"purchase_product_unit_price_" + index}`}
                                                        onWheel={(e) => e.target.blur()}
                                                        value={selectedProducts[index].purchase_unit_price}
                                                        className="form-control text-end"
                                                        placeholder="Unit Price"
                                                        ref={(el) => {
                                                            if (!inputRefs.current[index]) inputRefs.current[index] = {};
                                                            inputRefs.current[index][`${"purchase_product_unit_price_" + index}`] = el;
                                                        }}
                                                        onFocus={() => {
                                                            if (timerRef.current) clearTimeout(timerRef.current);
                                                            timerRef.current = setTimeout(() => {
                                                                inputRefs.current[index][`${"purchase_product_unit_price_" + index}`].select();
                                                            }, 20);
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
                                                                    CalCulateLineTotals(index);
                                                                    reCalculate(index);
                                                                }, 300);
                                                            } else if (e.key === "ArrowLeft") {
                                                                timerRef.current = setTimeout(() => {
                                                                    inputRefs.current[index][`${"purchase_product_quantity_" + index}`].select();
                                                                }, 50);
                                                            }
                                                        }}
                                                        onChange={(e) => {
                                                            if (timerRef.current) clearTimeout(timerRef.current);
                                                            delete errors["purchase_unit_price_" + index];
                                                            setErrors({ ...errors });

                                                            if (parseFloat(e.target.value) === 0) {
                                                                //  errors["unit_price_" + index] = "Unit Price should be > 0";
                                                                selectedProducts[index].purchase_unit_price = 0
                                                                selectedProducts[index].purchase_unit_price_with_vat = 0;
                                                                setSelectedProducts([...selectedProducts]);
                                                                timerRef.current = setTimeout(() => {
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
                                                                    checkErrors(index);
                                                                    CalCulateLineTotals(index);
                                                                    reCalculate(index);
                                                                }, 100);
                                                                return;
                                                            }



                                                            if (/^\d*\.?\d{0,8}$/.test(parseFloat(e.target.value)) === false) {
                                                                errors["purchase_unit_price_" + index] = "Max. decimal points allowed is 8";
                                                                setErrors({ ...errors });
                                                            }

                                                            selectedProducts[index].purchase_unit_price = parseFloat(e.target.value);
                                                            setSelectedProducts([...selectedProducts]);
                                                            timerRef.current = setTimeout(() => {
                                                                selectedProducts[index].purchase_unit_price_with_vat = parseFloat(trimTo8Decimals(selectedProducts[index].purchase_unit_price * (1 + (formData.vat_percent / 100))))
                                                                selectedProducts[index].unit_discount_percent = parseFloat(trimTo8Decimals(((selectedProducts[index].unit_discount / selectedProducts[index].purchase_unit_price) * 100)))
                                                                selectedProducts[index].unit_discount_percent_with_vat = parseFloat(trimTo8Decimals(((selectedProducts[index].unit_discount_with_vat / selectedProducts[index].purchase_unit_price_with_vat) * 100)))

                                                                CalCulateLineTotals(index);
                                                                reCalculate(index);
                                                            }, 100);

                                                        }} />

                                                </div>
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
                                        if (col.key === 'unit_price_with_vat') return (<td key="unit_price_with_vat" style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                            <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                                                <div className="input-group flex-nowrap" style={{ flex: '1 1 auto', minWidth: 0 }}>
                                                    <input type="number" id={`${"purchase_product_unit_price_with_vat_" + index}`} name={`${"purchase_product_unit_price_with_vat_" + index}`} onWheel={(e) => e.target.blur()}
                                                        value={selectedProducts[index].purchase_unit_price_with_vat} className="form-control text-end"
                                                        ref={(el) => {
                                                            if (!inputRefs.current[index]) inputRefs.current[index] = {};
                                                            inputRefs.current[index][`${"purchase_product_unit_price_with_vat_" + index}`] = el;
                                                        }}
                                                        placeholder="Unit Price(with VAT)"

                                                        onFocus={() => {
                                                            if (timerRef.current) clearTimeout(timerRef.current);
                                                            timerRef.current = setTimeout(() => {
                                                                inputRefs.current[index][`${"purchase_product_unit_price_with_vat_" + index}`].select();
                                                            }, 20);
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
                                                                    CalCulateLineTotals(index);
                                                                    reCalculate(index);
                                                                }, 100);
                                                            } else if (e.key === "ArrowLeft") {
                                                                timerRef.current = setTimeout(() => {
                                                                    inputRefs.current[index][`${"purchase_product_unit_price_" + index}`].select();
                                                                }, 50);
                                                            }
                                                        }}
                                                        onChange={(e) => {
                                                            if (timerRef.current) clearTimeout(timerRef.current);
                                                            delete errors["purchase_unit_price_with_vat_" + index];
                                                            setErrors({ ...errors });

                                                            if (parseFloat(e.target.value) === 0) {
                                                                selectedProducts[index].purchase_unit_price_with_vat = 0;
                                                                selectedProducts[index].purchase_unit_price = 0;
                                                                setSelectedProducts([...selectedProducts]);
                                                                timerRef.current = setTimeout(() => {
                                                                    checkErrors(index);
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
                                                                    CalCulateLineTotals(index);
                                                                    reCalculate(index);
                                                                }, 100);
                                                                return;
                                                            }


                                                            if (/^\d*\.?\d{0,8}$/.test(parseFloat(e.target.value)) === false) {
                                                                errors["purchase_unit_price_with_vat_" + index] = "Max. decimal points allowed is 8";
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
                                                                CalCulateLineTotals(index);
                                                                reCalculate(index);
                                                            }, 100);
                                                        }} />
                                                </div>
                                                {(errors[`purchase_unit_price_with_vat_${index}`] || warnings[`purchase_unit_price_with_vat_${index}`]) && (
                                                    <i
                                                        className={`bi bi-exclamation-circle-fill ${errors[`purchase_unit_price_with_vat_${index}`] ? 'text-danger' : 'text-warning'} ms-2`}
                                                        data-bs-toggle="tooltip"
                                                        data-bs-placement="top"
                                                        data-error={errors[`purchase_unit_price_with_vat_${index}`] || ''}
                                                        data-warning={warnings[`purchase_unit_price_with_vat_${index}`] || ''}
                                                        title={errors[`purchase_unit_price_with_vat_${index}`] || warnings[`purchase_unit_price_with_vat_${index}`] || ''}
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
                                                    <input type="number" id={`${"purchase_unit_discount_" + index}`} name={`${"purchase_unit_discount_" + index}`} onWheel={(e) => e.target.blur()} className="form-control text-end"
                                                        value={selectedProducts[index].unit_discount}
                                                        ref={(el) => {
                                                            if (!inputRefs.current[index]) inputRefs.current[index] = {};
                                                            inputRefs.current[index][`${"purchase_unit_discount_" + index}`] = el;
                                                        }}
                                                        onFocus={() => {
                                                            if (timerRef.current) clearTimeout(timerRef.current);
                                                            timerRef.current = setTimeout(() => {
                                                                inputRefs.current[index][`${"purchase_unit_discount_" + index}`]?.select();
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
                                                                            inputRefs.current[index - 1][`${"purchase_product_quantity_" + (index - 1)}`]?.select();
                                                                        }, 100);
                                                                    }

                                                                }
                                                            } else if (e.key === "ArrowLeft") {
                                                                timerRef.current = setTimeout(() => {
                                                                    inputRefs.current[index][`${"purchase_product_unit_price_" + index}`].select();
                                                                }, 100);
                                                            }
                                                        }}
                                                        onChange={(e) => {
                                                            if (timerRef.current) clearTimeout(timerRef.current);

                                                            if (parseFloat(e.target.value) === 0) {
                                                                selectedProducts[index].unit_discount = 0.00;
                                                                selectedProducts[index].unit_discount_with_vat = 0.00;
                                                                selectedProducts[index].unit_discount_percent = 0.00;
                                                                selectedProducts[index].unit_discount_percent_with_vat = 0.00;
                                                                setFormData({ ...formData });
                                                                delete errors["unit_discount_" + index];
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
                                                                //setErrors({ ...errors });
                                                                return;
                                                            }

                                                            delete errors["unit_discount_" + index];
                                                            delete errors["unit_discount_percent_" + index];
                                                            setErrors({ ...errors });


                                                            if (/^\d*\.?\d{0,8}$/.test(parseFloat(e.target.value)) === false) {
                                                                errors["unit_discount_" + index] = "Max. decimal points allowed is 8";
                                                                setErrors({ ...errors });
                                                            }

                                                            selectedProducts[index].unit_discount = parseFloat(e.target.value);


                                                            setFormData({ ...formData });
                                                            timerRef.current = setTimeout(() => {
                                                                selectedProducts[index].unit_discount_with_vat = parseFloat(trimTo8Decimals(selectedProducts[index].unit_discount * (1 + (formData.vat_percent / 100))))

                                                                selectedProducts[index].unit_discount_percent = parseFloat(trimTo8Decimals(((selectedProducts[index].unit_discount / selectedProducts[index].purchase_unit_price) * 100)))
                                                                selectedProducts[index].unit_discount_percent_with_vat = parseFloat(trimTo8Decimals(((selectedProducts[index].unit_discount_with_vat / selectedProducts[index].purchase_unit_price_with_vat) * 100)))
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
                                                        id={`${"purchase_unit_discount_with_vat_" + index}`}
                                                        name={`${"purchase_unit_discount_with_vat_" + index}`}
                                                        onWheel={(e) => e.target.blur()}
                                                        className="form-control text-end"
                                                        style={{ minWidth: "50px" }}
                                                        value={selectedProducts[index].unit_discount_with_vat}
                                                        ref={(el) => {
                                                            if (!inputRefs.current[index]) inputRefs.current[index] = {};
                                                            inputRefs.current[index][`${"purchase_unit_discount_with_vat_" + index}`] = el;
                                                        }}
                                                        onFocus={() => {
                                                            if (timerRef.current) clearTimeout(timerRef.current);
                                                            timerRef.current = setTimeout(() => {
                                                                inputRefs.current[index][`${"purchase_unit_discount_with_vat_" + index}`]?.select();
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
                                                                            inputRefs.current[index - 1][`${"purchase_product_quantity_" + (index - 1)}`]?.select();
                                                                        }, 100);
                                                                    }

                                                                }
                                                            } else if (e.key === "ArrowLeft") {
                                                                timerRef.current = setTimeout(() => {
                                                                    inputRefs.current[index][`${"purchase_unit_discount_" + index}`].select();
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
                                                                errors["unit_discount_with_vat_" + index] = "Max. decimal points allowed is 8";
                                                                setErrors({ ...errors });
                                                            }

                                                            selectedProducts[index].unit_discount_with_vat = parseFloat(e.target.value); //input


                                                            setFormData({ ...formData });
                                                            timerRef.current = setTimeout(() => {

                                                                selectedProducts[index].unit_discount = parseFloat(trimTo8Decimals(selectedProducts[index].unit_discount_with_vat / (1 + (formData.vat_percent / 100))))
                                                                selectedProducts[index].unit_discount_percent = parseFloat(trimTo8Decimals(((selectedProducts[index].unit_discount / selectedProducts[index].purchase_unit_price) * 100)))
                                                                selectedProducts[index].unit_discount_percent_with_vat = parseFloat(trimTo8Decimals(((selectedProducts[index].unit_discount_with_vat / selectedProducts[index].purchase_unit_price_with_vat) * 100)))

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
                                                        id={`${"purchase_unit_discount_percent" + index}`}
                                                        disabled={true}
                                                        name={`${"purchase_unit_discount_percent" + index}`}
                                                        onWheel={(e) => e.target.blur()}
                                                        className="form-control text-end"
                                                        value={selectedProducts[index].unit_discount_percent} onChange={(e) => {
                                                            if (timerRef.current) clearTimeout(timerRef.current);

                                                            if (parseFloat(e.target.value) === 0) {
                                                                selectedProducts[index].unit_discount_percent = 0.00;
                                                                selectedProducts[index].unit_discount_with_vat = 0.00;
                                                                selectedProducts[index].unit_discount = 0.00;
                                                                selectedProducts[index].unit_discount_percent_with_vat = 0.00;
                                                                setFormData({ ...formData });
                                                                delete errors["unit_discount_percent_" + index];
                                                                setErrors({ ...errors });
                                                                timerRef.current = setTimeout(() => {
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
                                                                selectedProducts[index].unit_discount_with_vat = "";
                                                                selectedProducts[index].unit_discount = "";
                                                                selectedProducts[index].unit_discount_percent_with_vat = "";
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

                                                            selectedProducts[index].unit_discount_percent = parseFloat(e.target.value); //input


                                                            setFormData({ ...formData });

                                                            timerRef.current = setTimeout(() => {
                                                                selectedProducts[index].unit_discount = parseFloat(trimTo8Decimals(selectedProducts[index].purchase_unit_price * (selectedProducts[index].unit_discount_percent / 100)));
                                                                selectedProducts[index].unit_discount_with_vat = parseFloat(trimTo8Decimals(selectedProducts[index].unit_discount * (1 + (formData.vat_percent / 100))))
                                                                selectedProducts[index].unit_discount_percent_with_vat = parseFloat(trimTo8Decimals(((selectedProducts[index].unit_discount_with_vat / selectedProducts[index].purchase_unit_price_with_vat) * 100)))

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
                                        if (col.key === 'wholesale_unit_price') return (<td key="wholesale_unit_price" style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                            <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                                                <div className="input-group flex-nowrap" style={{ flex: '1 1 auto', minWidth: 0 }}>
                                                    <input
                                                        id={`${"purchase_product_wholesale_unit_price" + index}`}
                                                        name={`${"purchase_product_wholesale_unit_price" + index}`}
                                                        type="number"
                                                        value={product.wholesale_unit_price}
                                                        className="form-control"
                                                        placeholder="Wholesale Unit Price"
                                                        onKeyDown={(e) => {
                                                            RunKeyActions(e, product);
                                                        }}
                                                        onChange={(e) => {
                                                            if (timerRef.current) clearTimeout(timerRef.current);
                                                            delete errors["wholesale_unit_price_" + index];
                                                            setErrors({ ...errors });


                                                            if (parseFloat(e.target.value) === 0) {
                                                                selectedProducts[index].wholesale_unit_price = parseFloat(e.target.value);
                                                                setSelectedProducts([...selectedProducts]);
                                                                timerRef.current = setTimeout(() => {
                                                                    checkErrors(index);
                                                                    CalCulateLineTotals(index);
                                                                    reCalculate(index);
                                                                }, 100);
                                                                return;
                                                            }

                                                            if (!e.target.value) {
                                                                selectedProducts[index].wholesale_unit_price = e.target.value;
                                                                setSelectedProducts([...selectedProducts]);
                                                                timerRef.current = setTimeout(() => {
                                                                    checkErrors(index);
                                                                    CalCulateLineTotals(index);
                                                                    reCalculate(index);
                                                                }, 100);
                                                                return;
                                                            }

                                                            selectedProducts[index].wholesale_unit_price = parseFloat(e.target.value);
                                                            setSelectedProducts([...selectedProducts]);
                                                            timerRef.current = setTimeout(() => {
                                                                selectedProducts[index].wholesale_unit_price_with_vat = parseFloat(trimTo8Decimals(selectedProducts[index].wholesale_unit_price * (1 + (store.vat_percent / 100))));
                                                                setSelectedProducts([...selectedProducts]);

                                                                checkErrors(index);
                                                                CalCulateLineTotals(index);
                                                                reCalculate(index);
                                                            }, 100);

                                                        }} />
                                                </div>
                                                {(errors[`wholesale_unit_price_${index}`] || warnings[`wholesale_unit_price_${index}`]) && (
                                                    <i
                                                        className={`bi bi-exclamation-circle-fill ${errors[`wholesale_unit_price_${index}`] ? 'text-danger' : 'text-warning'} ms-2`}
                                                        data-bs-toggle="tooltip"
                                                        data-bs-placement="top"
                                                        data-error={errors[`wholesale_unit_price_${index}`] || ''}
                                                        data-warning={warnings[`wholesale_unit_price_${index}`] || ''}
                                                        title={errors[`wholesale_unit_price_${index}`] || warnings[`wholesale_unit_price_${index}`] || ''}
                                                        style={{
                                                            fontSize: '1rem',
                                                            cursor: 'pointer',
                                                            whiteSpace: 'nowrap',
                                                        }}
                                                    ></i>
                                                )}
                                            </div>
                                        </td>);
                                        if (col.key === 'retail_unit_price') return (<td key="retail_unit_price" style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                            <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                                                <div className="input-group flex-nowrap" style={{ flex: '1 1 auto', minWidth: 0 }}>
                                                    <input
                                                        id={`${"purchase_product_retail_unit_price" + index}`}
                                                        name={`${"purchase_product_retail_unit_price" + index}`}
                                                        type="number"
                                                        value={product.retail_unit_price}
                                                        className="form-control"
                                                        onKeyDown={(e) => {
                                                            RunKeyActions(e, product);
                                                        }}

                                                        placeholder="Retail Unit Price"
                                                        onChange={(e) => {
                                                            if (timerRef.current) clearTimeout(timerRef.current);

                                                            delete errors["retail_unit_price_" + index];
                                                            setErrors({ ...errors });

                                                            if (parseFloat(e.target.value) === 0) {
                                                                selectedProducts[index].retail_unit_price = e.target.value;
                                                                setSelectedProducts([...selectedProducts]);
                                                                timerRef.current = setTimeout(() => {
                                                                    checkErrors(index);
                                                                    CalCulateLineTotals(index);
                                                                    reCalculate(index);
                                                                }, 100);
                                                                return;
                                                            }

                                                            if (!e.target.value) {
                                                                selectedProducts[index].retail_unit_price = parseFloat(e.target.value);
                                                                setSelectedProducts([...selectedProducts]);
                                                                timerRef.current = setTimeout(() => {
                                                                    checkErrors(index);
                                                                    CalCulateLineTotals(index);
                                                                    reCalculate(index);
                                                                }, 100);
                                                                return;
                                                            }

                                                            selectedProducts[index].retail_unit_price = parseFloat(e.target.value);
                                                            setSelectedProducts([...selectedProducts]);
                                                            timerRef.current = setTimeout(() => {
                                                                selectedProducts[index].retail_unit_price_with_vat = parseFloat(trimTo8Decimals(selectedProducts[index].retail_unit_price * (1 + (store.vat_percent / 100))));
                                                                setSelectedProducts([...selectedProducts]);
                                                                checkErrors(index);
                                                                CalCulateLineTotals(index);
                                                                reCalculate(index);
                                                            }, 100);
                                                        }} />

                                                </div>

                                                {(errors[`retail_unit_price_${index}`] || warnings[`retail_unit_price_${index}`]) && (
                                                    <i
                                                        className={`bi bi-exclamation-circle-fill ${errors[`retail_unit_price_${index}`] ? 'text-danger' : 'text-warning'} ms-2`}
                                                        data-bs-toggle="tooltip"
                                                        data-bs-placement="top"
                                                        data-error={errors[`retail_unit_price_${index}`] || ''}
                                                        data-warning={warnings[`retail_unit_price_${index}`] || ''}
                                                        title={errors[`retail_unit_price_${index}`] || warnings[`retail_unit_price_${index}`] || ''}
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
                                                        id={`${"purchase_product_line_total_" + index}`}
                                                        name={`${"purchase_product_line_total_" + index}`}
                                                        onWheel={(e) => e.target.blur()}
                                                        value={selectedProducts[index].line_total}
                                                        className={`form-control text-end ${errors["line_total_" + index] ? 'is-invalid' : ''} ${warnings["line_total_" + index] ? 'border-warning text-warning' : ''}`}
                                                        placeholder="Line total"
                                                        ref={(el) => {
                                                            if (!inputRefs.current[index]) inputRefs.current[index] = {};
                                                            inputRefs.current[index][`${"purchase_product_line_total_" + index}`] = el;
                                                        }}

                                                        onFocus={() => {
                                                            if (timerRef.current) clearTimeout(timerRef.current);
                                                            timerRef.current = setTimeout(() => {
                                                                inputRefs.current[index][`${"purchase_product_line_total_" + index}`]?.select();
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
                                                                    inputRefs.current[index][`${"purchase_product_unit_discount_with_vat_" + index}`]?.select();
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


                                                            if (/^\d*\.?\d{0,2}$/.test(parseFloat(e.target.value)) === false) {
                                                                errors["line_total_" + index] = "Max decimal points allowed is 2";
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
                                                        id={`${"purchase_product_line_total_with_vat" + index}`}
                                                        name={`${"purchase_product_line_total_with_vat" + index}`}
                                                        onWheel={(e) => e.target.blur()}
                                                        value={selectedProducts[index].line_total_with_vat}
                                                        className={`form-control text-end ${errors["line_total_with_vat" + index] ? 'is-invalid' : ''} ${warnings["line_total_with_vat" + index] ? 'border-warning text-warning' : ''}`}
                                                        placeholder="Line total with VAT"
                                                        ref={(el) => {
                                                            if (!inputRefs.current[index]) inputRefs.current[index] = {};
                                                            inputRefs.current[index][`${"purchase_product_line_total_with_vat" + index}`] = el;
                                                        }}

                                                        onFocus={() => {
                                                            if (timerRef.current) clearTimeout(timerRef.current);
                                                            timerRef.current = setTimeout(() => {
                                                                inputRefs.current[index][`${"purchase_product_line_total_with_vat" + index}`]?.select();
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
                                                                    inputRefs.current[index][`${"purchase_product_line_total_" + index}`]?.select();
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
                                                                errors["line_total_with_vat_" + index] = "Max decimal points allowed is 2";
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
                        }).reverse();
                        return formType === 'type2' ? (
                        <div className="col-12">

                        <div style={{ display: 'flex', gap: '12px', alignItems: 'stretch', paddingTop: '8px', marginBottom: '8px' }}>
                        <div style={{ flex: 3, minWidth: 0, background: '#fff', border: '1px solid #c3c6d7', borderRadius: '8px', padding: '10px 14px', position: 'relative' }}>
                          <span style={{ position: 'absolute', top: '-8px', left: '14px', fontSize: '10px', fontWeight: 600, color: '#6b7280', background: '#fff', padding: '0 4px', lineHeight: 1, zIndex: 1, pointerEvents: 'none' }}>{t('Vendor')}</span>
                          <button type="button" onClick={() => setShowVendorSectionSettings(v => !v)}
                            title={t('Customize Vendor Fields')}
                            style={{ position: 'absolute', top: '-9px', right: '14px', background: '#fff', border: '1px solid #c3c6d7', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2, padding: 0 }}>
                            <i className="bi bi-gear-fill" style={{ fontSize: '10px', color: '#6b7280' }} />
                          </button>
                          {showVendorSectionSettings && (
                            <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1060, background: '#fff', border: '1px solid #c3c6d7', borderRadius: '10px', boxShadow: '0 8px 32px rgba(0,0,0,0.18)', width: '360px', padding: '20px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                                <span style={{ fontWeight: 700, fontSize: '14px', color: '#191c1e' }}>{t('Vendor Fields')}</span>
                                <button type="button" onClick={() => setShowVendorSectionSettings(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#6b7280', lineHeight: 1, padding: 0 }}>×</button>
                              </div>
                              {vendorFieldsOrder.map((key, idx) => (
                                <div key={key} draggable
                                  onDragStart={() => { vendorFieldsDragRef.current = idx; }}
                                  onDragOver={e => e.preventDefault()}
                                  onDrop={() => { reorderVendorFields(vendorFieldsDragRef.current, idx); vendorFieldsDragRef.current = null; }}
                                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '6px', marginBottom: '4px', background: '#f3f4f6', cursor: 'grab', border: '1px solid #e5e7eb', userSelect: 'none' }}>
                                  <i className="bi bi-grip-vertical" style={{ color: '#9ca3af', fontSize: '18px', flexShrink: 0 }} />
                                  <input type="checkbox" checked={!!vendorFieldsVisible[key]} onChange={e => updateVendorFieldVisible(key, e.target.checked)} style={{ cursor: 'pointer', width: '16px', height: '16px', flexShrink: 0 }} />
                                  <span style={{ flex: 1, fontSize: '13px', fontWeight: 500, color: '#374151' }}>{t(_vendorFieldLabels[key])}</span>
                                </div>
                              ))}
                              <button type="button" onClick={() => {
                                setVendorFieldsOrder([..._defaultVendorFieldsOrder]);
                                setVendorFieldsVisible(Object.fromEntries(_defaultVendorFieldsOrder.map(k => [k, true])));
                                localStorage.removeItem('purchase_vendor_fields_visible_t2');
                                localStorage.removeItem('purchase_vendor_fields_order_t2');
                              }} style={{ marginTop: '14px', width: '100%', background: '#f9fafb', border: '1px solid #d1d5db', borderRadius: '6px', padding: '7px 0', fontSize: '13px', cursor: 'pointer', color: '#6b7280', fontWeight: 500 }}>
                                {t('Reset to Default')}
                              </button>
                            </div>
                          )}
                          <div>
                            {vendorFieldsOrder.some(k => vendorFieldsVisible[k]) && (
                            <div style={{ display: 'flex', columnGap: '16px', rowGap: '14px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                              {vendorFieldsOrder.filter(k => vendorFieldsVisible[k]).map((key, idx, arr) => {
                              if (key === 'vendor_search') return (
                              <div key="vendor_search" style={{ flex: '0 0 100%', display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <div style={{ flex: '0 0 320px', maxWidth: '320px' }}>
                                  <Typeahead
                                    id="vendor_search_type2"
                                    positionFixed={true}
                                    filterBy={() => true}
                                    labelKey="search_label"
                                    size="lg"
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
                                      if (selectedItems[0].phone && !formData.phone) {
                                        formData.phone = selectedItems[0].phone;
                                      }
                                      if (selectedItems[0].vat_no && !formData.vat_no) {
                                        formData.vat_no = selectedItems[0].vat_no;
                                      }
                                      if (selectedItems[0].address && !formData.address) {
                                        formData.address = selectedItems[0].address;
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
                                    onInputChange={(searchTerm, e) => {
                                      if (searchTerm) { formData.vendor_name = searchTerm; }
                                      setFormData({ ...formData });
                                      if (timerRef.current) clearTimeout(timerRef.current);
                                      timerRef.current = setTimeout(() => { suggestVendors(searchTerm); }, 350);
                                    }}
                                    renderMenu={(results, menuProps, state) => {
                                      const searchWords = state.text.toLowerCase().split(" ").filter(Boolean);
                                      return (
                                        <Menu {...menuProps} style={{ ...(menuProps.style || {}), width: '95vw', maxWidth: '95vw', minWidth: '400px', zIndex: 9999 }}>
                                          <MenuItem disabled style={{ position: 'sticky', top: 0, padding: 0, margin: 0 }}>
                                            <div style={{ display: 'flex', fontWeight: 'bold', color: '#6b7280', padding: '4px 8px', background: '#f8f9fa', borderBottom: '1px solid #e2e8f0', pointerEvents: 'auto' }}>
                                              <div style={{ ...columnStyle, width: '8%' }}>{t('Code')}</div>
                                              <div style={{ ...columnStyle, width: '37%' }}>{t('Name')}</div>
                                              <div style={{ ...columnStyle, width: '13%' }}>{t('Phone 1')}</div>
                                              <div style={{ ...columnStyle, width: '13%' }}>{t('Phone 2')}</div>
                                              <div style={{ ...columnStyle, width: '17%' }}>{t('VAT NO.')}</div>
                                              <div style={{ ...columnStyle, width: '12%' }}>{t('Credit Balance')}</div>
                                            </div>
                                          </MenuItem>
                                          {results.map((option, index) => {
                                            const onlyOne = results.length === 1;
                                            const isActive = state.activeIndex === index || onlyOne;
                                            return (
                                              <MenuItem option={option} position={index} key={index} style={{ padding: "0px" }}>
                                                <div style={{ display: 'flex', padding: '4px 8px' }}>
                                                  <div style={{ ...columnStyle, width: '8%' }}>{highlightWords(option.code, searchWords, isActive)}</div>
                                                  <div style={{ ...columnStyle, width: '37%' }}>{highlightWords(option.name_in_arabic ? `${option.name} - ${option.name_in_arabic}` : option.name, searchWords, isActive)}</div>
                                                  <div style={{ ...columnStyle, width: '13%' }}>{highlightWords(option.phone, searchWords, isActive)}</div>
                                                  <div style={{ ...columnStyle, width: '13%' }}>{highlightWords(option.phone2, searchWords, isActive)}</div>
                                                  <div style={{ ...columnStyle, width: '17%' }}>{highlightWords(option.vat_no, searchWords, isActive)}</div>
                                                  <div style={{ ...columnStyle, width: '12%' }}>{option.credit_balance != null ? <Amount amount={trimTo2Decimals(option.credit_balance)} /> : ''}</div>
                                                </div>
                                              </MenuItem>
                                            );
                                          })}
                                        </Menu>
                                      );
                                    }}
                                  />
                                </div>
                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                  <button type="button" title={t('New Vendor')} onClick={openVendorCreateForm}
                                    style={{ background: '#fff', border: '1px solid #c3c6d7', borderRadius: '4px', padding: '7px 12px', fontSize: '13px', cursor: 'pointer', color: '#434655', flexShrink: 0 }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor='#004ac6'; e.currentTarget.style.color='#004ac6'; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor='#c3c6d7'; e.currentTarget.style.color='#434655'; }}>
                                    <i className="bi bi-plus-lg" />
                                  </button>
                                  {formData.vendor_id && (
                                    <button type="button" title={t('Edit Vendor')} onClick={() => openVendorUpdateForm(formData.vendor_id)}
                                      style={{ background: '#fff', border: '1px solid #c3c6d7', borderRadius: '4px', padding: '7px 12px', fontSize: '13px', cursor: 'pointer', color: '#434655', flexShrink: 0 }}
                                      onMouseEnter={e => { e.currentTarget.style.borderColor='#004ac6'; e.currentTarget.style.color='#004ac6'; }}
                                      onMouseLeave={e => { e.currentTarget.style.borderColor='#c3c6d7'; e.currentTarget.style.color='#434655'; }}>
                                      <i className="bi bi-pencil" />
                                    </button>
                                  )}
                                  <button type="button" title={t('Vendor List')} onClick={openVendors}
                                    style={{ background: '#004ac6', color: '#fff', border: '1px solid transparent', borderRadius: '4px', padding: '7px 12px', fontSize: '13px', cursor: 'pointer', flexShrink: 0 }}>
                                    <i className="bi bi-list" />
                                  </button>
                                </div>
                              </div>
                              );
                              if (key === 'date') return (
                                      <div key="date" style={{ flex: '0 0 185px', position: 'relative' }}>
                                        <span style={{ position: 'absolute', top: '-8px', left: '8px', fontSize: '10px', fontWeight: 600, color: '#6b7280', background: '#fff', padding: '0 4px', lineHeight: 1, zIndex: 1, pointerEvents: 'none' }}>{t('Date')}</span>
                                        <DatePicker
                                          id="date_str_type2"
                                          selected={formData.date_str ? new Date(formData.date_str) : null}
                                          value={formData.date_str ? format(new Date(formData.date_str), "MMMM d, yyyy h:mm aa", { locale: dateLocale }) : null}
                                          className="form-control"
                                          dateFormat="MMMM d, yyyy h:mm aa"
                                          locale={dateLocale}
                                          showTimeSelect
                                          timeIntervals="1"
                                          popperProps={{ strategy: 'fixed' }}
                                          onChange={(value) => { formData.date_str = value; setFormData({ ...formData }); }}
                                        />
                                      </div>
                                    );
                                    if (key === 'phone') return (
                                      <div key="phone" style={{ flex: '0 0 195px', position: 'relative' }}>
                                        <span style={{ position: 'absolute', top: '-8px', left: '8px', fontSize: '10px', fontWeight: 600, color: '#6b7280', background: '#fff', padding: '0 4px', lineHeight: 1, zIndex: 1, pointerEvents: 'none' }}>{t('Phone')}</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                          <input
                                            value={formData.phone || ''}
                                            type="text"
                                            onChange={(e) => { delete errors["phone"]; setErrors({ ...errors }); formData.phone = e.target.value; setFormData({ ...formData }); }}
                                            className="form-control"
                                            placeholder={t('Phone')}
                                            style={{ minWidth: 0 }}
                                          />
                                          <button type="button" title={t('Share via WhatsApp')} onClick={sendWhatsAppMessage}
                                            style={{ background: '#25d366', border: 'none', borderRadius: '4px', padding: '5px 7px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="white" viewBox="0 0 16 16">
                                              <path d="M13.601 2.326A7.875 7.875 0 0 0 8.036 0C3.596 0 0 3.597 0 8.036c0 1.417.37 2.805 1.07 4.03L0 16l3.993-1.05a7.968 7.968 0 0 0 4.043 1.085h.003c4.44 0 8.036-3.596 8.036-8.036 0-2.147-.836-4.166-2.37-5.673ZM8.036 14.6a6.584 6.584 0 0 1-3.35-.92l-.24-.142-2.37.622.63-2.31-.155-.238a6.587 6.587 0 0 1-1.018-3.513c0-3.637 2.96-6.6 6.6-6.6 1.764 0 3.42.69 4.67 1.94a6.56 6.56 0 0 1 1.93 4.668c0 3.637-2.96 6.6-6.6 6.6Zm3.61-4.885c-.198-.1-1.17-.578-1.352-.644-.18-.066-.312-.1-.444.1-.13.197-.51.644-.626.775-.115.13-.23.15-.428.05-.198-.1-.837-.308-1.594-.983-.59-.525-.99-1.174-1.11-1.372-.116-.198-.012-.305.088-.403.09-.09.198-.23.298-.345.1-.115.132-.197.2-.33.065-.13.032-.247-.017-.345-.05-.1-.444-1.07-.61-1.46-.16-.384-.323-.332-.444-.338l-.378-.007c-.13 0-.344.048-.525.23s-.688.672-.688 1.64c0 .967.704 1.9.802 2.03.1.13 1.386 2.116 3.365 2.963.47.203.837.324 1.122.414.472.15.902.13 1.24.08.378-.057 1.17-.48 1.336-.942.165-.462.165-.858.116-.943-.048-.084-.18-.132-.378-.23Z" />
                                            </svg>
                                          </button>
                                        </div>
                                      </div>
                                    );
                                    if (key === 'vat_no') return (
                                      <div key="vat_no" style={{ flex: '0 0 187px', position: 'relative' }}>
                                        <span style={{ position: 'absolute', top: '-8px', left: '8px', fontSize: '10px', fontWeight: 600, color: '#6b7280', background: '#fff', padding: '0 4px', lineHeight: 1, zIndex: 1, pointerEvents: 'none' }}>{t('VAT NO.')}</span>
                                        <input
                                          value={formData.vat_no || ''}
                                          type="text"
                                          onChange={(e) => { delete errors["vat_no"]; setErrors({ ...errors }); formData.vat_no = e.target.value; setFormData({ ...formData }); }}
                                          className="form-control"
                                          placeholder={t('VAT NO.')}
                                        />
                                      </div>
                                    );
                                    if (key === 'address' || key === 'remarks') {
                                      const otherKey = key === 'address' ? 'remarks' : 'address';
                                      if (arr.slice(0, idx).includes(otherKey)) return null;
                                      const otherVisible = arr.includes(otherKey);
                                      const addrTA = (
                                        <div key="address" style={{ flex: 1, minWidth: 0, position: 'relative' }}>
                                          <span style={{ position: 'absolute', top: '-8px', left: '8px', fontSize: '10px', fontWeight: 600, color: '#6b7280', background: '#fff', padding: '0 4px', lineHeight: 1, zIndex: 1, pointerEvents: 'none' }}>{t('Address')}</span>
                                          <textarea value={formData.address || ''} onChange={(e) => { delete errors["address"]; setErrors({ ...errors }); formData.address = e.target.value; setFormData({ ...formData }); }} onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); } }} className="form-control" placeholder={t('Address')} rows={2} style={{ resize: 'none', fontSize: '13px', width: '100%' }} />
                                        </div>
                                      );
                                      const remTA = (
                                        <div key="remarks" style={{ flex: 1, minWidth: 0, position: 'relative' }}>
                                          <span style={{ position: 'absolute', top: '-8px', left: '8px', fontSize: '10px', fontWeight: 600, color: '#6b7280', background: '#fff', padding: '0 4px', lineHeight: 1, zIndex: 1, pointerEvents: 'none' }}>{t('Remarks')}</span>
                                          <textarea value={formData.remarks || ''} onChange={(e) => { formData.remarks = e.target.value; setFormData({ ...formData }); }} onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); } }} className="form-control" placeholder={t('Remarks')} rows={2} style={{ resize: 'none', fontSize: '13px', width: '100%' }} />
                                        </div>
                                      );
                                      return (
                                        <div key="addr-rem-pair" style={{ flex: '0 0 100%', display: 'flex', gap: '16px' }}>
                                          {key === 'address' ? addrTA : remTA}
                                          {otherVisible && (key === 'address' ? remTA : addrTA)}
                                        </div>
                                      );
                                    }
                                    return null;
                                  })}
                                </div>
                              )}
                          </div>
                        </div>{/* end white card */}

                        {/* Selected Vendor section — always occupies flex:2 space so vendor search width stays stable */}
                        <div style={{ flex: 2, minWidth: 0 }}>
                        {formData.vendor_id && selectedVendors.slice(0, 1).map(v => {
                          const phone = v.phone || formData.phone;
                          const phone2 = v.phone2;
                          const vatNo = v.vat_no || formData.vat_no;
                          const creditBalance = v.credit_balance;
                          return (
                            <div key={v.id || 'sel-vendor'} style={{ position: 'relative' }}>
                              <span style={{ position: 'absolute', top: '-8px', left: '14px', fontSize: '10px', fontWeight: 600, color: '#6b7280', background: '#fff', padding: '0 4px', lineHeight: 1, zIndex: 1, pointerEvents: 'none' }}>{t('Selected Vendor')}</span>
                              {/* Selected Vendor settings gear */}
                              <button type="button" onClick={() => setShowSelVendorSettings(s => !s)}
                                title={t('Customize Selected Vendor Fields')}
                                style={{ position: 'absolute', top: '-9px', right: '14px', background: '#fff', border: '1px solid #c3c6d7', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2, padding: 0 }}>
                                <i className="bi bi-gear-fill" style={{ fontSize: '10px', color: '#6b7280' }} />
                              </button>
                              {showSelVendorSettings && (
                                <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1060, background: '#fff', border: '1px solid #c3c6d7', borderRadius: '10px', boxShadow: '0 8px 32px rgba(0,0,0,0.18)', width: '360px', padding: '20px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                                    <span style={{ fontWeight: 700, fontSize: '14px', color: '#191c1e' }}>{t('Selected Vendor Fields')}</span>
                                    <button type="button" onClick={() => setShowSelVendorSettings(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#6b7280', lineHeight: 1, padding: 0 }}>×</button>
                                  </div>
                                  {/* Fixed-position fields (visibility only, no drag) */}
                                  <div style={{ fontSize: '10px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>{t('Fixed Position')}</div>
                                  {['name', 'code', 'name_arabic'].map(key => (
                                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '6px', marginBottom: '4px', background: '#f9fafb', border: '1px solid #e5e7eb', userSelect: 'none' }}>
                                      <i className="bi bi-grip-vertical" style={{ color: '#d1d5db', fontSize: '18px', flexShrink: 0 }} />
                                      <input type="checkbox" checked={!!selVendorFieldsVisible[key]} onChange={e => updateSelVendorFieldVisible(key, e.target.checked)} style={{ cursor: 'pointer', width: '16px', height: '16px', flexShrink: 0 }} />
                                      <span style={{ flex: 1, fontSize: '13px', fontWeight: 500, color: '#374151' }}>{t(_selVendorFieldLabels[key])}</span>
                                    </div>
                                  ))}
                                  {/* Orderable fields (drag + visibility) */}
                                  <div style={{ height: '1px', background: '#e5e7eb', margin: '6px 0' }} />
                                  <div style={{ fontSize: '10px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>{t('Orderable')}</div>
                                  {(() => {
                                    const fixedKeys = ['name', 'code', 'name_arabic'];
                                    const orderable = selVendorFieldsOrder.filter(k => !fixedKeys.includes(k));
                                    return orderable.map((key, localIdx) => (
                                      <div key={key} draggable
                                        onDragStart={() => { selVendorFieldsDragRef.current = localIdx; }}
                                        onDragOver={e => e.preventDefault()}
                                        onDrop={() => {
                                          const from = selVendorFieldsDragRef.current;
                                          const to = localIdx;
                                          selVendorFieldsDragRef.current = null;
                                          if (from === to) return;
                                          const fixed = selVendorFieldsOrder.filter(k => fixedKeys.includes(k));
                                          const ord = selVendorFieldsOrder.filter(k => !fixedKeys.includes(k));
                                          const [item] = ord.splice(from, 1);
                                          ord.splice(to, 0, item);
                                          const newOrder = [...fixed, ...ord];
                                          setSelVendorFieldsOrder(newOrder);
                                          localStorage.setItem('purchase_sel_vendor_fields_order_t2', JSON.stringify(newOrder));
                                        }}
                                        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '6px', marginBottom: '4px', background: '#f3f4f6', cursor: 'grab', border: '1px solid #e5e7eb', userSelect: 'none' }}>
                                        <i className="bi bi-grip-vertical" style={{ color: '#9ca3af', fontSize: '18px', flexShrink: 0 }} />
                                        <input type="checkbox" checked={!!selVendorFieldsVisible[key]} onChange={e => updateSelVendorFieldVisible(key, e.target.checked)} style={{ cursor: 'pointer', width: '16px', height: '16px', flexShrink: 0 }} />
                                        <span style={{ flex: 1, fontSize: '13px', fontWeight: 500, color: '#374151' }}>{t(_selVendorFieldLabels[key])}</span>
                                      </div>
                                    ));
                                  })()}
                                  <button type="button" onClick={() => {
                                    setSelVendorFieldsOrder([..._defaultSelVendorFieldsOrder]);
                                    setSelVendorFieldsVisible(Object.fromEntries(_defaultSelVendorFieldsOrder.map(k => [k, true])));
                                    localStorage.removeItem('purchase_sel_vendor_fields_visible_t2');
                                    localStorage.removeItem('purchase_sel_vendor_fields_order_t2');
                                  }} style={{ marginTop: '14px', width: '100%', background: '#f9fafb', border: '1px solid #d1d5db', borderRadius: '6px', padding: '7px 0', fontSize: '13px', cursor: 'pointer', color: '#6b7280', fontWeight: 500 }}>
                                    {t('Reset to Default')}
                                  </button>
                                </div>
                              )}
                              <div style={{ background: 'rgba(0,74,198,0.05)', border: '1px solid rgba(0,74,198,0.2)', borderRadius: '8px', padding: '12px', height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '6px' }}>

                                {/* Name (left) + Code badge + Credit Balance (right column) */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    {selVendorFieldsVisible['name'] && (
                                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#191c1e', lineHeight: 1.3, wordBreak: 'break-word' }}>{v.name}</div>
                                    )}
                                    {selVendorFieldsVisible['name_arabic'] && v.name_in_arabic && (
                                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#191c1e', direction: 'rtl', lineHeight: 1.3, wordBreak: 'break-word', WebkitTextStroke: '0.4px #191c1e' }}>{v.name_in_arabic}</div>
                                    )}
                                  </div>
                                  {selVendorFieldsVisible['code'] && v.code && (
                                    <span style={{ flexShrink: 0, background: 'rgba(0,74,198,0.1)', color: '#004ac6', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, fontFamily: 'monospace' }}>{v.code}</span>
                                  )}
                                </div>

                                {/* Detail grid: orderable fields, 2-column */}
                                {selVendorFieldsOrder.some(k => !['name', 'name_arabic', 'code'].includes(k) && selVendorFieldsVisible[k]) && (
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', paddingTop: '8px', borderTop: '1px solid rgba(0,74,198,0.15)', marginTop: '2px' }}>
                                    {selVendorFieldsOrder.filter(k => !['name', 'name_arabic', 'code'].includes(k) && selVendorFieldsVisible[k]).map(key => {
                                      if (key === 'credit_balance' && creditBalance !== undefined && creditBalance !== null) return (
                                        <div key="credit_balance" onClick={() => openVendorPending(selectedVendors[0])} style={{ cursor: 'pointer' }}>
                                          <span style={{ display: 'block', fontSize: '9px', fontWeight: 600, color: '#8b8fa8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>{t('Credit Balance')}</span>
                                          <span style={{ fontSize: '15px', fontWeight: 700, color: creditBalance > 0 ? '#dc2626' : creditBalance < 0 ? '#2563eb' : '#16a34a', letterSpacing: '-0.01em' }}>
                                            <NumberFormat value={trimTo2Decimals(creditBalance)} displayType="text" thousandSeparator={true} renderText={val => val} />
                                          </span>
                                        </div>
                                      );
                                      if (key === 'credit_limit' && v.credit_limit !== undefined && v.credit_limit !== null) return (
                                        <div key="credit_limit">
                                          <span style={{ display: 'block', fontSize: '9px', fontWeight: 600, color: '#8b8fa8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>{t('Credit Limit')}</span>
                                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#191c1e', fontFamily: 'monospace' }}><Amount amount={trimTo2Decimals(v.credit_limit)} /></span>
                                        </div>
                                      );
                                      if (key === 'vat_no' && vatNo) return (
                                        <div key="vat_no">
                                          <span style={{ display: 'block', fontSize: '9px', fontWeight: 600, color: '#8b8fa8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>{t('VAT NO.')}</span>
                                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#191c1e', fontFamily: 'monospace' }}>{vatNo}</span>
                                        </div>
                                      );
                                      if (key === 'phone1' && phone) return (
                                        <div key="phone1">
                                          <span style={{ display: 'block', fontSize: '9px', fontWeight: 600, color: '#8b8fa8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>{t('Phone 1')}</span>
                                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#191c1e', fontFamily: 'monospace' }}>{phone}</span>
                                        </div>
                                      );
                                      if (key === 'phone2' && phone2) return (
                                        <div key="phone2">
                                          <span style={{ display: 'block', fontSize: '9px', fontWeight: 600, color: '#8b8fa8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>{t('Phone 2')}</span>
                                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#191c1e', fontFamily: 'monospace' }}>{phone2}</span>
                                        </div>
                                      );
                                      return null;
                                    })}
                                  </div>
                                )}

                              </div>
                            </div>
                          );
                        })}
                        </div>{/* end flex:2 placeholder */}
                        </div>{/* end flex row */}

                        <div style={{ position: 'relative', marginTop: '14px' }}>
                          <span style={{ position: 'absolute', top: '-8px', left: '14px', fontSize: '10px', fontWeight: 600, color: '#6b7280', background: '#fff', padding: '0 4px', lineHeight: 1, zIndex: 1, pointerEvents: 'none' }}>{t('Products')}</span>
                          <button type="button" title="Table Settings" onClick={() => setShowPurchaseSPSettings(true)}
                            style={{ position: 'absolute', top: '-9px', right: '14px', background: '#fff', border: '1px solid #c3c6d7', borderRadius: '4px', padding: '0 5px', cursor: 'pointer', color: '#6b7280', lineHeight: '16px', zIndex: 1, fontSize: '10px' }}
                            onMouseEnter={e => e.currentTarget.style.color='#191c1e'}
                            onMouseLeave={e => e.currentTarget.style.color='#6b7280'}>
                            <i className="bi bi-gear-fill" style={{ fontSize: '10px' }}></i>
                          </button>
                          <div style={{ border: '1px solid #c3c6d7', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', padding: '8px 10px', borderBottom: '1px solid #e2e8f0' }}>
                              <div className="sc-search-input" style={{ flex: '0 0 320px', maxWidth: '320px' }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <Typeahead
                                      id="product_id_type2"
                                      filterBy={() => true}
                                      size="lg"
                                      ref={productSearchRef}
                                      labelKey="search_label"
                                      emptyLabel=""
                                      clearButton={false}
                                      open={openProductSearchResult}
                                      isLoading={false}
                                      isInvalid={!!errors.product_id}
                                      onChange={(selectedItems) => {
                                          if (onChangeTriggeredRef.current) return;
                                          onChangeTriggeredRef.current = true;
                                          setTimeout(() => { onChangeTriggeredRef.current = false; }, 300);
                                          if (selectedItems.length === 0) { errors["product_id"] = "Invalid Product selected"; setErrors(errors); return; }
                                          delete errors["product_id"];
                                          setErrors({ ...errors });
                                          if (formData.store_id) { addProduct(selectedItems[0]); }
                                          productSearchRef.current?.clear();
                                          setOpenProductSearchResult(false);
                                          timerRef.current = setTimeout(() => { inputRefs.current[(selectedProducts.length - 1)][`purchase_product_quantity_${selectedProducts.length - 1}`]?.select(); }, 100);
                                      }}
                                      options={productOptions}
                                      placeholder={t('Part No. | Name | Name in Arabic | Brand | Country')}
                                      highlightOnlyResult={true}
                                      onKeyDown={(e) => {
                                          if (e.key === "Escape") { setProductOptions([]); setOpenProductSearchResult(false); productSearchRef.current?.clear(); }
                                          timerRef.current = setTimeout(() => { productSearchRef.current?.focus(); }, 100);
                                      }}
                                      onInputChange={(searchTerm, e) => {
                                          const requestId = Date.now(); latestRequestRef.current = requestId;
                                          if (timerRef.current) clearTimeout(timerRef.current);
                                          timerRef.current = setTimeout(() => { if (latestRequestRef.current !== requestId) return; suggestProducts(searchTerm); }, 350);
                                      }}
                                      renderMenu={(results, menuProps, state) => {
                                          const searchWords = state.text.toLowerCase().split(" ").filter(Boolean);
                                          return (
                                              <Menu {...menuProps} style={{ ...(menuProps.style || {}), width: '95vw', maxWidth: '95vw', minWidth: '300px', zIndex: 9999 }}>
                                                  <MenuItem disabled style={{ position: 'sticky', top: 0, padding: 0, margin: 0 }}>
                                                      <div style={{ background: '#f8f9fa', zIndex: 2, display: 'flex', fontWeight: 'bold', padding: '4px 8px', border: "solid 0px", borderBottom: '1px solid #ddd', pointerEvents: "auto" }}>
                                                          {searchProductsColumns.filter(c => c.visible).map((col) => (<>
                                                              {col.key === "select" && <div style={{ width: getColumnWidth(col), border: "solid 0px" }}></div>}
                                                              {col.key === "part_number" && <div style={{ width: getColumnWidth(col), border: "solid 0px" }}>Part Number</div>}
                                                              {col.key === "name" && <div style={{ width: getColumnWidth(col), border: "solid 0px" }}>Name</div>}
                                                              {col.key === "unit_price" && <div style={{ width: getColumnWidth(col), border: "solid 0px" }}>{t('S.Unit Price')}</div>}
                                                              {col.key === "stock" && <div style={{ width: getColumnWidth(col), border: "solid 0px" }}>Stock</div>}
                                                              {col.key === "photos" && <div style={{ width: getColumnWidth(col), border: "solid 0px" }}>Photos</div>}
                                                              {col.key === "brand" && <div style={{ width: getColumnWidth(col), border: "solid 0px" }}>Brand</div>}
                                                              {col.key === "purchase_price" && <div style={{ width: getColumnWidth(col), border: "solid 0px" }}>{t('P.Unit Price')}</div>}
                                                              {col.key === "country" && <div style={{ width: getColumnWidth(col), border: "solid 0px" }}>{t('Country')}</div>}
                                                              {col.key === "rack" && <div style={{ width: getColumnWidth(col), border: "solid 0px" }}>{t('Rack')}</div>}
                                                          </>))}
                                                          <div style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", cursor: "pointer" }} onClick={e => { e.stopPropagation(); setShowProductSearchSettings(true); }}>
                                                              <i className="bi bi-gear-fill" />
                                                          </div>
                                                      </div>
                                                  </MenuItem>
                                                  {results.map((option, index) => {
                                                      const onlyOneResult = results.length === 1;
                                                      const isActive = state.activeIndex === index || onlyOneResult;
                                                      let checked = isProductAdded(option.id);
                                                      return (
                                                          <MenuItem option={option} position={index} key={index} style={{ padding: "0px" }}>
                                                              <div style={{ display: 'flex', padding: '4px 8px' }}>
                                                                  {searchProductsColumns.filter(c => c.visible).map((col) => (<>
                                                                      {col.key === "select" && <div className="form-check" style={{ ...columnStyle, width: getColumnWidth(col) }} onClick={e => { e.stopPropagation(); checked = !checked; if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = setTimeout(() => { if (checked) { addProduct(option); } else { removeProduct(option); } }, 100); }}><input className="form-check-input" type="checkbox" value={checked} checked={checked} onClick={e => e.stopPropagation()} onChange={e => { e.preventDefault(); e.stopPropagation(); checked = !checked; if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = setTimeout(() => { if (checked) { addProduct(option); } else { removeProduct(option); } }, 100); }} /></div>}
                                                                      {col.key === "part_number" && <div style={{ ...columnStyle, width: getColumnWidth(col) }}>{highlightWords(option.prefix_part_number ? `${option.prefix_part_number}-${option.part_number}` : option.part_number, searchWords, isActive)}</div>}
                                                                      {col.key === "name" && <div style={{ ...columnStyle, width: getColumnWidth(col) }}>{highlightWords(option.name_in_arabic ? `${option.name} - ${option.name_in_arabic}` : option.name, searchWords, isActive)}</div>}
                                                                      {col.key === "unit_price" && <div style={{ ...columnStyle, width: getColumnWidth(col) }}>{option.product_stores?.[localStorage.getItem("store_id")]?.retail_unit_price && <><Amount amount={trimTo2Decimals(option.product_stores?.[localStorage.getItem("store_id")]?.retail_unit_price)} />+</>}{option.product_stores?.[localStorage.getItem("store_id")]?.retail_unit_price_with_vat && <>|<Amount amount={trimTo2Decimals(option.product_stores?.[localStorage.getItem("store_id")]?.retail_unit_price_with_vat)} /></>}</div>}
                                                                      {col.key === "stock" && <div style={{ ...columnStyle, width: getColumnWidth(col) }}>{(() => { const storeId = localStorage.getItem("store_id"); const ps = option.product_stores?.[storeId]; const totalStock = ps?.stock ?? 0; const ws = ps?.warehouse_stocks ?? {}; const wd = (() => { let d = []; if (ws["main_store"] !== undefined) d.push(`MS: ${ws["main_store"]}`); Object.entries(ws).filter(([k]) => k !== "main_store").forEach(([k, v]) => { d.push(`${k.replace(/^w/, "WH").toUpperCase()}: ${v}`); }); return d.join(", "); })(); return <span>{totalStock}{wd && store.settings.enable_warehouse_module ? ` (${wd})` : ""}</span>; })()}</div>}
                                                                      {col.key === "photos" && <div style={{ ...columnStyle, width: getColumnWidth(col) }}><button type="button" className={isActive ? "btn btn-outline-light btn-sm" : "btn btn-outline-primary btn-sm"} onClick={e => { e.preventDefault(); e.stopPropagation(); openProductImages(option.id); }}><i className="bi bi-images" /></button></div>}
                                                                      {col.key === "brand" && <div style={{ ...columnStyle, width: getColumnWidth(col) }}>{highlightWords(option.brand_name, searchWords, isActive)}</div>}
                                                                      {col.key === "purchase_price" && <div style={{ ...columnStyle, width: getColumnWidth(col) }}>{option.product_stores?.[localStorage.getItem("store_id")]?.purchase_unit_price && <><Amount amount={trimTo2Decimals(option.product_stores?.[localStorage.getItem("store_id")]?.purchase_unit_price)} />+</>}{option.product_stores?.[localStorage.getItem("store_id")]?.purchase_unit_price_with_vat && <>|<Amount amount={trimTo2Decimals(option.product_stores?.[localStorage.getItem("store_id")]?.purchase_unit_price_with_vat)} /></>}</div>}
                                                                      {col.key === "country" && <div style={{ ...columnStyle, width: getColumnWidth(col) }}>{highlightWords(option.country_name, searchWords, isActive)}</div>}
                                                                      {col.key === "rack" && (() => { if (store?.settings?.enable_warehouse_module) { const storeId = localStorage.getItem("store_id"); const wRacks = option.product_stores?.[storeId]?.warehouse_racks; const parts = []; if (wRacks?.main_store) parts.push(`MS:${wRacks.main_store}`); if (wRacks) Object.entries(wRacks).filter(([k]) => k !== "main_store").forEach(([k, v]) => { if (v) parts.push(`${k}:${v}`); }); const rackText = parts.join(" | ") || option.rack || ""; return <div style={{ ...columnStyle, width: getColumnWidth(col), whiteSpace: 'normal', overflow: 'visible' }} title={rackText}>{rackText}</div>; } return <div style={{ ...columnStyle, width: getColumnWidth(col) }}>{highlightWords(option.rack, searchWords, isActive)}</div>; })()}
                                                                  </>))}
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
                              <div style={{ position: 'relative', flex: '0 0 180px', maxWidth: '180px' }}>
                                <DebounceInput
                                  minLength={3}
                                  debounceTimeout={100}
                                  placeholder={t('Scan Barcode')}
                                  className="form-control barcode"
                                  style={{ fontSize: '13px', height: '34px', paddingRight: '8px' }}
                                  value={formData.barcode || ''}
                                  onChange={(e) => getProductByBarCode(e.target.value)}
                                />
                                {errors.bar_code && (
                                  <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 10, whiteSpace: 'nowrap', background: '#fff', border: '1px solid #fca5a5', borderRadius: '3px', padding: '1px 6px', boxShadow: '0 2px 6px rgba(0,0,0,0.1)', color: '#dc2626', fontSize: '11px' }}>{t(errors.bar_code)}</div>
                                )}
                              </div>
                              <button type="button" onClick={openProductCreateForm}
                                style={{ background: '#fff', border: '1px solid #c3c6d7', borderRadius: '4px', padding: '7px 12px', fontSize: '13px', cursor: 'pointer', flexShrink: 0 }}>
                                <i className="bi bi-plus-lg" />
                              </button>
                              <button type="button" onClick={openProducts}
                                style={{ background: '#004ac6', color: '#fff', border: '1px solid transparent', borderRadius: '4px', padding: '7px 12px', fontSize: '13px', cursor: 'pointer', flexShrink: 0 }}>
                                <i className="bi bi-list" />
                              </button>
                            </div>{/* end product search row */}
                            <div style={{ overflowX: 'auto', maxHeight: '55vh', overflowY: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                                <colgroup>
                                    {(() => {
                                        const visCols = purchaseSPColumns.filter(c => c.visible);
                                        const totalW = visCols.reduce((sum, col) => sum + (scColWidths[col.key] ?? SC_COL_DEFAULTS_P[col.key] ?? 100), 0);
                                        return visCols.map(col => {
                                            const w = scColWidths[col.key] ?? SC_COL_DEFAULTS_P[col.key] ?? 100;
                                            return <col key={col.key} style={{ width: `${(w / totalW * 100).toFixed(2)}%` }} />;
                                        });
                                    })()}
                                </colgroup>
                                <thead style={{ backgroundColor: '#f1f5f9', position: 'sticky', top: 0, zIndex: 1 }}>
                                    {(() => {
                                        const thStyle = { padding: '10px 12px', fontWeight: 600, borderBottom: '2px solid #c3c6d7', whiteSpace: 'nowrap', position: 'relative', overflow: 'hidden' };
                                        const resizeHandle = (colKey) => (
                                            <div
                                                onMouseDown={(e) => startScColResize(e, colKey, scColWidths[colKey] ?? SC_COL_DEFAULTS_P[colKey] ?? 60)}
                                                style={{ position: 'absolute', right: 0, top: '20%', bottom: '20%', width: '4px', cursor: 'col-resize', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1px', borderRadius: '2px', backgroundColor: 'transparent' }}
                                                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#dbeafe'; Array.from(e.currentTarget.children).forEach(d => d.style.backgroundColor = '#3b82f6'); }}
                                                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; Array.from(e.currentTarget.children).forEach(d => d.style.backgroundColor = '#b0b7c3'); }}
                                            >
                                                <div style={{ width: '1px', height: '100%', backgroundColor: '#b0b7c3', borderRadius: '1px', pointerEvents: 'none' }} />
                                                <div style={{ width: '1px', height: '100%', backgroundColor: '#b0b7c3', borderRadius: '1px', pointerEvents: 'none' }} />
                                            </div>
                                        );
                                        return (
                                            <tr style={{ fontSize: '12px', fontWeight: 600, color: '#434655', lineHeight: '16px' }}>
                                                {purchaseSPColumns.filter(c => c.visible).map(col => {
                                                    if (col.key === 'delete') return <th key={col.key} style={{ ...thStyle, padding: 0 }}>{resizeHandle('delete')}</th>;
                                                    if (col.key === 'si_no') return <th key={col.key} style={thStyle}>#&nbsp;{resizeHandle('si_no')}</th>;
                                                    if (col.key === 'part_number') return <th key={col.key} style={thStyle}>{t('Part No.')}{resizeHandle('part_number')}</th>;
                                                    if (col.key === 'name') return <th key={col.key} style={thStyle}>{t('Name')}{resizeHandle('name')}</th>;
                                                    if (col.key === 'info') return <th key={col.key} style={thStyle}>{t('Info')}{resizeHandle('info')}</th>;
                                                    if (col.key === 'stock') return <th key={col.key} style={thStyle}>{t('Stock')}{resizeHandle('stock')}</th>;
                                                    if (col.key === 'warehouse') return store.settings?.enable_warehouse_module ? <th key={col.key} style={thStyle}>{t('Add Stock To')}{resizeHandle('warehouse')}</th> : null;
                                                    if (col.key === 'qty') return <th key={col.key} style={{ ...thStyle, textAlign: 'center' }}>{t('Qty')}{resizeHandle('qty')}</th>;
                                                    if (col.key === 'unit_price') return <th key={col.key} style={{ ...thStyle, textAlign: 'right' }}>{t('U. Price (ex. VAT)')}{resizeHandle('unit_price')}</th>;
                                                    if (col.key === 'unit_price_with_vat') return <th key={col.key} style={{ ...thStyle, textAlign: 'right' }}>{t('U. Price (inc. VAT)')}{resizeHandle('unit_price_with_vat')}</th>;
                                                    if (col.key === 'unit_discount') return <th key={col.key} style={{ ...thStyle, textAlign: 'right' }}>{t('U. Disc. (ex. VAT)')}{resizeHandle('unit_discount')}</th>;
                                                    if (col.key === 'unit_discount_with_vat') return <th key={col.key} style={{ ...thStyle, textAlign: 'right' }}>{t('U. Disc. (inc. VAT)')}{resizeHandle('unit_discount_with_vat')}</th>;
                                                    if (col.key === 'unit_discount_percent') return <th key={col.key} style={{ ...thStyle, textAlign: 'right' }}>{t('U. Disc. %')}{resizeHandle('unit_discount_percent')}</th>;
                                                    if (col.key === 'wholesale_unit_price') return <th key={col.key} style={{ ...thStyle, textAlign: 'right' }}>{t('Wholesale Price')}{resizeHandle('wholesale_unit_price')}</th>;
                                                    if (col.key === 'retail_unit_price') return <th key={col.key} style={{ ...thStyle, textAlign: 'right' }}>{t('Retail Price')}{resizeHandle('retail_unit_price')}</th>;
                                                    if (col.key === 'price') return <th key={col.key} style={{ ...thStyle, textAlign: 'right' }}>{t('Total (ex. VAT)')}{resizeHandle('price')}</th>;
                                                    if (col.key === 'price_with_vat') return <th key={col.key} style={{ ...thStyle, textAlign: 'right' }}>{t('Total (inc. VAT)')}{resizeHandle('price_with_vat')}</th>;
                                                    return null;
                                                })}
                                            </tr>
                                        );
                                    })()}
                                </thead>
                                <tbody style={{ fontSize: '13px', color: '#191c1e' }}>
                                    {purchaseSPTableBodyRows}
                                </tbody>
                            </table>
                            </div>{/* end scroll */}
                          </div>{/* end products card */}
                        </div>

                        <div className="sc-post-table" style={{ marginTop: '10px' }}>
                          <div className="sc-post-table-left" style={{ position: 'relative' }}>
                              <span style={{ position: 'absolute', top: '-8px', left: '14px', fontSize: '10px', fontWeight: 600, color: '#6b7280', background: '#fff', padding: '0 4px', lineHeight: 1, zIndex: 1, pointerEvents: 'none' }}>{t('Payments')}</span>
                            <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                              <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '380px' }}>
                                  {formData.payments_input && formData.payments_input.length > 0 && (
                                    <thead style={{ backgroundColor: '#f1f5f9', position: 'sticky', top: 0, zIndex: 1 }}>
                                      <tr style={{ fontSize: '11px', fontWeight: 600, color: '#434655' }}>
                                        {(() => { const th = { padding: '5px 8px', fontWeight: 600, borderBottom: '2px solid #c3c6d7', whiteSpace: 'nowrap' }; return (<>
                                          <th style={{ ...th, width: '150px' }}>{t("Date")}</th>
                                          <th style={{ ...th, width: '100px' }}>{t("Amount")}</th>
                                          <th style={{ ...th, width: '130px' }}>{t("Method")}</th>
                                          <th style={th}>{t("Description")}</th>
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
                                        <td style={{ padding: '3px 6px', width: '150px', position: 'relative' }}>
                                          <DatePicker
                                            id="purchase_payment_date_str_t2"
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
                                        </td>
                                        <td style={{ padding: '3px 6px', width: '100px' }}>
                                          <input type='number' id={`purchase_payment_amount${key}`} name={`purchase_payment_amount${key}`} value={formData.payments_input[key].amount} className={`form-control form-control-sm text-end${errors["payment_amount_" + key] ? ' is-invalid' : ''}`}
                                            onChange={(e) => {
                                              delete errors["payment_amount_" + key]; setErrors({ ...errors });
                                              if (!e.target.value) { formData.payments_input[key].amount = e.target.value; setFormData({ ...formData }); if (paymentValidationTimer.current) clearTimeout(paymentValidationTimer.current); paymentValidationTimer.current = setTimeout(() => validatePaymentAmounts(), 1000); return; }
                                              formData.payments_input[key].amount = parseFloat(e.target.value); if (paymentValidationTimer.current) clearTimeout(paymentValidationTimer.current); paymentValidationTimer.current = setTimeout(() => validatePaymentAmounts(), 1000); setFormData({ ...formData });
                                            }} />
                                        </td>
                                        <td style={{ padding: '3px 6px', width: '160px' }}>
                                          <select value={formData.payments_input[key].method} className={`form-select form-select-sm ${errors['payment_method_' + key] ? 'is-invalid' : ''}`} style={{ fontSize: '12px', height: '26px', padding: '0 24px 0 6px' }}
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
                                            <option value="purchase_return">{t("Purchase Return")}</option>
                                            <option value="vendor_account">{t("Vendor Account")}</option>
                                          </select>
                                        </td>
                                        <td style={{ padding: '3px 6px', minWidth: '140px' }}>
                                          <input type='text' value={formData.payments_input[key].description || ""} className="form-control form-control-sm"
                                            onChange={(e) => { formData.payments_input[key].description = e.target.value; setFormData({ ...formData }); }}
                                            placeholder={t("Description")}
                                          />
                                        </td>
                                        <td style={{ padding: '3px 6px' }}>
                                          {formData.payments_input[key] && (
                                            <span style={{ cursor: "pointer", color: "#004ac6", fontSize: '11px' }} onClick={() => openReferenceUpdateForm(formData.payments_input[key].reference_id, formData.payments_input[key].reference_type)}>
                                              {formData.payments_input[key].reference_code}
                                            </span>
                                          )}
                                        </td>
                                        <td style={{ padding: '3px 4px', textAlign: 'center' }}>
                                          <button type="button" onClick={() => removePayment(key)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: '1px 3px', borderRadius: '4px' }}
                                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fef2f2'}
                                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                            <i className="bi bi-trash" style={{ fontSize: '12px' }}></i>
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                    <tr style={{ borderTop: '2px solid #c3c6d7', backgroundColor: '#f8fafc' }}>
                                      <td style={{ width: '150px' }}></td>
                                      <td colSpan={5} style={{ padding: '5px 8px', position: 'relative' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: '12px', color: '#434655' }}>
                                              {t("Total")}:&nbsp;<strong style={{ color: '#191c1e', fontVariantNumeric: 'tabular-nums' }}>{trimTo2Decimals(totalPaymentAmount)}</strong>
                                            </span>
                                            <span style={{ width: '1px', height: '14px', background: '#c3c6d7', display: 'inline-block' }} />
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', position: 'relative' }}>
                                              <span style={{ fontSize: '12px', color: '#434655', whiteSpace: 'nowrap' }}>{t("Cash Disc.")}:</span>
                                              <input type='number' ref={cashDiscountRef} id="purchase_cash_discount_t2" name="purchase_cash_discount_t2" value={cashDiscount}
                                                className="form-control form-control-sm" style={{ width: '80px', height: '24px', padding: '0 6px', fontSize: '12px' }}
                                                onChange={(e) => {
                                                  delete errors["cash_discount"]; setErrors({ ...errors });
                                                  if (!e.target.value) { cashDiscount = e.target.value; setCashDiscount(cashDiscount); if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = setTimeout(() => { reCalculate(); }, 100); return; }
                                                  cashDiscount = parseFloat(e.target.value); setCashDiscount(cashDiscount);
                                                  if (cashDiscount > 0 && cashDiscount >= formData.net_total) { errors["cash_discount"] = t("Cash discount should not be greater than or equal to Net Total: ") + formData.net_total?.toString(); setErrors({ ...errors }); return; }
                                                  if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = setTimeout(() => { reCalculate(); }, 100);
                                                }}
                                                onKeyDown={(e) => { if (timerRef.current) clearTimeout(timerRef.current); if (e.key === "Backspace") { cashDiscount = ""; setCashDiscount(cashDiscount); if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = setTimeout(() => { reCalculate(); }, 100); return; } }}
                                                onFocus={() => { if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = setTimeout(() => { cashDiscountRef.current?.select(); }, 20); }}
                                              />
                                              {errors.cash_discount && <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 10, whiteSpace: 'nowrap', background: '#fff', border: '1px solid #fca5a5', borderRadius: '3px', padding: '1px 6px', boxShadow: '0 2px 6px rgba(0,0,0,0.1)', color: '#dc2626', fontSize: '11px' }}>{t(errors.cash_discount)}</div>}
                                            </div>
                                            <span style={{ width: '1px', height: '14px', background: '#c3c6d7', display: 'inline-block' }} />
                                            <span style={{ fontSize: '12px', color: '#434655' }}>
                                              {t("Balance")}:&nbsp;<strong style={{ color: balanceAmount > 0 ? '#dc2626' : balanceAmount < 0 ? '#2563eb' : '#16a34a', fontVariantNumeric: 'tabular-nums' }}>{trimTo2Decimals(balanceAmount)}</strong>
                                            </span>
                                            <span style={{ width: '1px', height: '14px', background: '#c3c6d7', display: 'inline-block' }} />
                                            <span style={{ fontSize: '12px', color: '#434655' }}>
                                              {t("Payment Status")}:&nbsp;
                                              {paymentStatus === "paid" && <strong style={{ color: '#16a34a' }}>{t("Paid")}</strong>}
                                              {paymentStatus === "paid_partially" && <strong style={{ color: '#b45309' }}>{t("Paid Partially")}</strong>}
                                              {paymentStatus === "not_paid" && <strong style={{ color: '#dc2626' }}>{t("Not Paid")}</strong>}
                                            </span>
                                          </div>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Button variant="secondary" size="sm" onClick={addNewPayment}><i className="bi bi-plus-lg me-1" />{t("Add Payment")}</Button>
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            </div>
                            </div>
                          <div className="sc-post-table-right">
                            {showBillSummarySettings && (
                              <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 1060, background: "#fff", border: "1px solid #c3c6d7", borderRadius: "10px", padding: "20px", width: "400px", boxShadow: "0 8px 32px rgba(0,0,0,0.22)" }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                  <span style={{ fontWeight: 700, fontSize: "14px", color: '#191c1e' }}>{t("Customize Bill Summary")}</span>
                                  <button type="button" onClick={() => setShowBillSummarySettings(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#6b7280', lineHeight: 1, padding: 0 }}>×</button>
                                </div>
                                {billSummaryOrder.map((key, idx) => (
                                  <div
                                    key={key}
                                    draggable
                                    onDragStart={() => { billSummaryDragRef.current = idx; }}
                                    onDragOver={e => e.preventDefault()}
                                    onDrop={() => { reorderBillSummary(billSummaryDragRef.current, idx); billSummaryDragRef.current = null; }}
                                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '6px', marginBottom: '4px', background: '#f3f4f6', cursor: 'grab', border: '1px solid #e5e7eb', userSelect: 'none' }}
                                  >
                                    <i className="bi bi-grip-vertical" style={{ color: '#9ca3af', fontSize: '18px', flexShrink: 0 }} />
                                    <input
                                      type="checkbox"
                                      checked={!!billSummaryVisible[key]}
                                      onChange={e => updateBillSummaryVisible(key, e.target.checked)}
                                      style={{ cursor: 'pointer', width: '16px', height: '16px', flexShrink: 0 }}
                                    />
                                    <span style={{ flex: 1, fontSize: "13px", fontWeight: 500, color: '#374151' }}>{t(_billSummaryFieldLabels[key])}</span>
                                  </div>
                                ))}
                                <button type="button" onClick={() => {
                                  setBillSummaryOrder(_defaultBillSummaryOrder);
                                  setBillSummaryVisible(Object.fromEntries(_defaultBillSummaryOrder.map(k => [k, true])));
                                  localStorage.removeItem('purchase_bill_summary_visible_t2');
                                  localStorage.removeItem('purchase_bill_summary_order_t2');
                                }} style={{ marginTop: '14px', width: '100%', background: '#f9fafb', border: '1px solid #d1d5db', borderRadius: '6px', padding: '7px 0', fontSize: '13px', cursor: 'pointer', color: '#6b7280', fontWeight: 500 }}>{t("Reset to Default")}</button>
                              </div>
                            )}
                            <div style={{ position: 'relative' }}>
                              <span style={{ position: 'absolute', top: '-8px', left: '14px', fontSize: '10px', fontWeight: 600, color: '#6b7280', background: '#fff', padding: '0 4px', lineHeight: 1, zIndex: 1, pointerEvents: 'none' }}>{t('Bill Summary')}</span>
                              <button type="button" title={t("Customize Bill Summary")} onClick={() => setShowBillSummarySettings(v => !v)}
                                style={{ position: 'absolute', top: '-9px', right: '14px', background: '#fff', border: '1px solid #c3c6d7', borderRadius: '4px', padding: '0 5px', cursor: 'pointer', color: '#6b7280', lineHeight: '16px', zIndex: 1, fontSize: '10px' }}
                                onMouseEnter={e => e.currentTarget.style.color='#191c1e'}
                                onMouseLeave={e => e.currentTarget.style.color='#6b7280'}>
                                <i className="bi bi-gear-fill" style={{ fontSize: '10px' }}></i>
                              </button>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                              <div style={{ padding: '6px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {billSummaryOrder.filter(key => billSummaryVisible[key]).map(key => {
                                  const rowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', lineHeight: '20px' };
                                  switch (key) {
                                    case 'total_without_vat': return (
                                      <div key="total_without_vat" style={rowStyle}>
                                        <span style={{ color: '#434655' }}>{t("Total (ex. VAT)")} <OverlayTrigger placement="left" trigger="click" show={openSummaryTooltip === 'total_ex_vat'} overlay={renderTotalWithoutVATTooltip()}><span style={{ textDecoration: 'underline dotted', cursor: 'pointer', color: '#888' }} onClick={(e) => { e.stopPropagation(); setOpenSummaryTooltip(p => p === 'total_ex_vat' ? null : 'total_ex_vat'); }}>ℹ️</span></OverlayTrigger></span>
                                        <span style={{ fontWeight: 500 }}><NumberFormat value={trimTo2Decimals(formData.total)} displayType={"text"} thousandSeparator={true} suffix={" "} renderText={(value, props) => value} /></span>
                                      </div>
                                    );
                                    case 'total_with_vat': return (
                                      <div key="total_with_vat" style={rowStyle}>
                                        <span style={{ color: '#434655' }}>{t("Total (inc. VAT)")} <OverlayTrigger placement="left" trigger="click" show={openSummaryTooltip === 'total_inc_vat'} overlay={renderTotalWithVATTooltip()}><span style={{ textDecoration: 'underline dotted', cursor: 'pointer', color: '#888' }} onClick={(e) => { e.stopPropagation(); setOpenSummaryTooltip(p => p === 'total_inc_vat' ? null : 'total_inc_vat'); }}>ℹ️</span></OverlayTrigger></span>
                                        <span style={{ fontWeight: 500 }}><NumberFormat value={trimTo2Decimals(formData.total_with_vat)} displayType={"text"} thousandSeparator={true} suffix={" "} renderText={(value, props) => value} /></span>
                                      </div>
                                    );
                                    case 'shipping': return (
                                      <div key="shipping" style={rowStyle}>
                                        <span style={{ color: '#434655' }}>{t("Shipping & Handling")} <OverlayTrigger placement="left" trigger="click" show={openSummaryTooltip === 'shipping'} overlay={renderShippingTooltip()}><span style={{ textDecoration: 'underline dotted', cursor: 'pointer', color: '#888' }} onClick={(e) => { e.stopPropagation(); setOpenSummaryTooltip(p => p === 'shipping' ? null : 'shipping'); }}>ℹ️</span></OverlayTrigger></span>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', position: 'relative' }}>
                                          <input type="number" id="purchase_shipping_fees_t2" name="purchase_shipping_fees_t2" onWheel={(e) => e.target.blur()} style={{ width: "110px" }} className="form-control form-control-sm text-end" value={shipping} onChange={(e) => {
                                            if (timerRef.current) clearTimeout(timerRef.current);
                                            delete errors["shipping_handling_fees"]; setErrors({ ...errors });
                                            if (parseFloat(e.target.value) === 0) { shipping = 0; setShipping(shipping); timerRef.current = setTimeout(() => { reCalculate(); }, 100); return; }
                                            if (parseFloat(e.target.value) < 0) { shipping = 0; setShipping(shipping); timerRef.current = setTimeout(() => { reCalculate(); }, 100); return; }
                                            if (!e.target.value) { shipping = ""; setShipping(shipping); timerRef.current = setTimeout(() => { reCalculate(); }, 100); return; }
                                            if (/^\d*\.?\d{0,2}$/.test(parseFloat(e.target.value)) === false) { errors["shipping_handling_fees"] = t("Max. decimal points allowed is 2"); setErrors({ ...errors }); }
                                            shipping = parseFloat(e.target.value); setShipping(shipping);
                                            timerRef.current = setTimeout(() => { reCalculate(); }, 100);
                                          }} />
                                          {errors.shipping_handling_fees && <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: 10, whiteSpace: 'nowrap', background: '#fff', border: '1px solid #fca5a5', borderRadius: '3px', padding: '1px 6px', boxShadow: '0 2px 6px rgba(0,0,0,0.1)', color: '#dc2626', fontSize: '11px' }}>{errors.shipping_handling_fees}</div>}
                                        </div>
                                      </div>
                                    );
                                    case 'discount_without_vat': return (
                                      <div key="discount_without_vat" style={rowStyle}>
                                        <span style={{ color: '#434655', position: 'relative' }}>
                                          {t("Discount (ex. VAT)")} <input type="number" id="purchase_discount_percent_t2" name="purchase_discount_percent_t2" onWheel={(e) => e.target.blur()} disabled={true} style={{ width: "50px", display: 'inline-block' }} className="form-control form-control-sm d-inline-block text-center" value={discountPercent} onChange={(e) => {
                                            if (timerRef.current) clearTimeout(timerRef.current);
                                            if (parseFloat(e.target.value) === 0) { discount = 0; setDiscount(discount); discountPercentWithVAT = 0; setDiscountPercentWithVAT(discountPercentWithVAT); discountPercent = 0; setDiscountPercent(discountPercent); timerRef.current = setTimeout(() => { reCalculate(); }, 100); return; }
                                            if (parseFloat(e.target.value) < 0) { discountWithVAT = 0; setDiscountWithVAT(discountWithVAT); discountPercentWithVAT = 0; setDiscountPercentWithVAT(discountPercentWithVAT); discount = 0; setDiscount(discount); discountPercent = 0; setDiscountPercent(discountPercent); timerRef.current = setTimeout(() => { reCalculate(); }, 100); return; }
                                            if (!e.target.value) { discountWithVAT = ""; setDiscountWithVAT(discountWithVAT); discountPercentWithVAT = ""; setDiscountPercentWithVAT(discountPercentWithVAT); discount = ""; setDiscount(discount); discountPercent = ""; setDiscountPercent(discountPercent); timerRef.current = setTimeout(() => { reCalculate(); }, 100); return; }
                                            delete errors["discount_percent"]; delete errors["discount"]; setErrors({ ...errors });
                                            discountPercent = parseFloat(e.target.value); setDiscountPercent(discountPercent);
                                            timerRef.current = setTimeout(() => { reCalculate(); }, 100);
                                          }} />{"% "}
                                          <OverlayTrigger placement="left" trigger="click" show={openSummaryTooltip === 'disc_ex_vat'} overlay={renderDiscountWithoutVATTooltip()}><span style={{ textDecoration: 'underline dotted', cursor: 'pointer', color: '#888' }} onClick={(e) => { e.stopPropagation(); setOpenSummaryTooltip(p => p === 'disc_ex_vat' ? null : 'disc_ex_vat'); }}>ℹ️</span></OverlayTrigger>
                                          {errors.discount_percent && <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 10, whiteSpace: 'nowrap', background: '#fff', border: '1px solid #fca5a5', borderRadius: '3px', padding: '1px 6px', boxShadow: '0 2px 6px rgba(0,0,0,0.1)', color: '#dc2626', fontSize: '11px' }}>{errors.discount_percent}</div>}
                                        </span>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', position: 'relative' }}>
                                          <input type="number" id="purchase_discount_t2" name="purchase_discount_t2" onWheel={(e) => e.target.blur()} style={{ width: "110px" }} className="form-control form-control-sm text-end" value={discount} ref={discountRef}
                                            onFocus={() => { if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = setTimeout(() => { discountRef.current?.select(); }, 20); }}
                                            onChange={(e) => {
                                              if (timerRef.current) clearTimeout(timerRef.current);
                                              if (parseFloat(e.target.value) === 0) { discount = 0; setDiscount(discount); discountWithVAT = 0; setDiscountWithVAT(discountWithVAT); discountPercent = 0; setDiscountPercent(discountPercent); discountPercentWithVAT = 0; setDiscountPercentWithVAT(discountPercentWithVAT); delete errors["discount"]; setErrors({ ...errors }); timerRef.current = setTimeout(() => { reCalculate(); }, 100); return; }
                                              if (parseFloat(e.target.value) < 0) { discount = 0; setDiscount(discount); discountWithVAT = 0; setDiscountWithVAT(discountWithVAT); discountPercent = 0; setDiscountPercent(discountPercent); discountPercentWithVAT = 0; setDiscountPercentWithVAT(discountPercentWithVAT); timerRef.current = setTimeout(() => { reCalculate(); }, 100); return; }
                                              if (!e.target.value) { discount = ""; setDiscount(discount); discountWithVAT = ""; setDiscountWithVAT(discountWithVAT); discountPercent = ""; setDiscountPercent(discountPercent); discountPercentWithVAT = ""; setDiscountPercentWithVAT(discountPercentWithVAT); timerRef.current = setTimeout(() => { reCalculate(); }, 100); return; }
                                              delete errors["discount"]; delete errors["discount_percent"]; setErrors({ ...errors });
                                              if (/^\d*\.?\d{0,2}$/.test(parseFloat(e.target.value)) === false) { errors["discount"] = t("Max. decimal points allowed is 2"); setErrors({ ...errors }); }
                                              discount = parseFloat(e.target.value); setDiscount(discount);
                                              timerRef.current = setTimeout(() => { discountWithVAT = parseFloat(trimTo2Decimals(discount * (1 + (formData.vat_percent / 100)))); setDiscountWithVAT(discountWithVAT); reCalculate(); }, 100);
                                            }} />
                                          {errors.discount && <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: 10, whiteSpace: 'nowrap', background: '#fff', border: '1px solid #fca5a5', borderRadius: '3px', padding: '1px 6px', boxShadow: '0 2px 6px rgba(0,0,0,0.1)', color: '#dc2626', fontSize: '11px' }}>{errors.discount}</div>}
                                        </div>
                                      </div>
                                    );
                                    case 'discount_with_vat': return (
                                      <div key="discount_with_vat" style={rowStyle}>
                                        <span style={{ color: '#434655', position: 'relative' }}>
                                          {t("Discount (inc. VAT)")} <input type="number" id="purchase_discount_percent_with_vat_t2" name="purchase_discount_percent_with_vat_t2" onWheel={(e) => e.target.blur()} disabled={true} style={{ width: "50px", display: 'inline-block' }} className="form-control form-control-sm d-inline-block text-center" value={discountPercentWithVAT} onChange={(e) => {
                                            if (timerRef.current) clearTimeout(timerRef.current);
                                            if (parseFloat(e.target.value) === 0) { discountWithVAT = 0; setDiscountWithVAT(discountWithVAT); discountPercentWithVAT = 0; setDiscountPercentWithVAT(discountPercentWithVAT); discount = 0; setDiscount(discount); discountPercent = 0; setDiscountPercent(discountPercent); timerRef.current = setTimeout(() => { reCalculate(); }, 100); return; }
                                            if (parseFloat(e.target.value) < 0) { discountWithVAT = 0; setDiscountWithVAT(discountWithVAT); discountPercentWithVAT = 0; setDiscountPercentWithVAT(discountPercentWithVAT); discount = 0; setDiscount(discount); discountPercent = 0; setDiscountPercent(discountPercent); timerRef.current = setTimeout(() => { reCalculate(); }, 100); return; }
                                            if (!e.target.value) { discountWithVAT = ""; setDiscountWithVAT(discountWithVAT); discountPercentWithVAT = ""; setDiscountPercentWithVAT(discountPercentWithVAT); discount = ""; setDiscount(discount); discountPercent = ""; setDiscountPercent(discountPercent); timerRef.current = setTimeout(() => { reCalculate(); }, 100); return; }
                                            delete errors["discount_percent_with_vat"]; delete errors["discount_with_vat"]; setErrors({ ...errors });
                                            discountPercentWithVAT = parseFloat(e.target.value); setDiscountPercentWithVAT(discountPercentWithVAT);
                                            timerRef.current = setTimeout(() => { reCalculate(); }, 100);
                                          }} />{"% "}
                                          <OverlayTrigger placement="left" trigger="click" show={openSummaryTooltip === 'disc_inc_vat'} overlay={renderDiscountWithVATTooltip()}><span style={{ textDecoration: 'underline dotted', cursor: 'pointer', color: '#888' }} onClick={(e) => { e.stopPropagation(); setOpenSummaryTooltip(p => p === 'disc_inc_vat' ? null : 'disc_inc_vat'); }}>ℹ️</span></OverlayTrigger>
                                          {errors.discount_percent_with_vat && <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 10, whiteSpace: 'nowrap', background: '#fff', border: '1px solid #fca5a5', borderRadius: '3px', padding: '1px 6px', boxShadow: '0 2px 6px rgba(0,0,0,0.1)', color: '#dc2626', fontSize: '11px' }}>{errors.discount_percent_with_vat}</div>}
                                        </span>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', position: 'relative' }}>
                                          <input type="number" id="purchase_discount_with_vat_t2" name="purchase_discount_with_vat_t2" onWheel={(e) => e.target.blur()} style={{ width: "110px" }} className="form-control form-control-sm text-end" value={discountWithVAT} ref={discountWithVATRef}
                                            onFocus={() => { if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = setTimeout(() => { discountWithVATRef.current?.select(); }, 20); }}
                                            onChange={(e) => {
                                              if (timerRef.current) clearTimeout(timerRef.current);
                                              if (parseFloat(e.target.value) === 0) { discount = 0; discountWithVAT = 0; discountPercent = 0; setDiscount(discount); setDiscountWithVAT(discount); setDiscountPercent(discount); delete errors["discount_with_vat"]; setErrors({ ...errors }); timerRef.current = setTimeout(() => { reCalculate(); }, 100); return; }
                                              if (parseFloat(e.target.value) < 0) { discount = 0; discountWithVAT = 0; discountPercent = 0; setDiscount(discount); setDiscountWithVAT(discount); setDiscountPercent(discountPercent); timerRef.current = setTimeout(() => { reCalculate(); }, 100); return; }
                                              if (!e.target.value) { discount = ""; discountWithVAT = ""; discountPercent = ""; setDiscount(discount); setDiscountWithVAT(discount); setDiscountPercent(discountPercent); timerRef.current = setTimeout(() => { reCalculate(); }, 100); return; }
                                              delete errors["discount_with_vat"]; delete errors["discount_percent_with_vat"]; setErrors({ ...errors });
                                              if (/^\d*\.?\d{0,2}$/.test(parseFloat(e.target.value)) === false) { errors["discount_with_vat"] = t("Max. decimal points allowed is 2"); setErrors({ ...errors }); }
                                              discountWithVAT = parseFloat(e.target.value); setDiscountWithVAT(discountWithVAT);
                                              timerRef.current = setTimeout(() => { discount = parseFloat(trimTo2Decimals(discountWithVAT / (1 + (formData.vat_percent / 100)))); setDiscount(discount); reCalculate(); }, 100);
                                            }} />
                                          {errors.discount_with_vat && <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: 10, whiteSpace: 'nowrap', background: '#fff', border: '1px solid #fca5a5', borderRadius: '3px', padding: '1px 6px', boxShadow: '0 2px 6px rgba(0,0,0,0.1)', color: '#dc2626', fontSize: '11px' }}>{errors.discount_with_vat}</div>}
                                        </div>
                                      </div>
                                    );
                                    case 'taxable_amount': return (
                                      <div key="taxable_amount" style={rowStyle}>
                                        <span style={{ color: '#434655' }}>{t("Taxable Amount (ex. VAT)")} <OverlayTrigger placement="left" trigger="click" show={openSummaryTooltip === 'taxable'} overlay={renderTaxableAmountTooltip()}><span style={{ textDecoration: 'underline dotted', cursor: 'pointer', color: '#888' }} onClick={(e) => { e.stopPropagation(); setOpenSummaryTooltip(p => p === 'taxable' ? null : 'taxable'); }}>ℹ️</span></OverlayTrigger></span>
                                        <span style={{ fontWeight: 500 }}><NumberFormat value={trimTo2Decimals(formData.total + shipping - discount)} displayType={"text"} thousandSeparator={true} suffix={" "} renderText={(value, props) => value} /></span>
                                      </div>
                                    );
                                    case 'vat': return (
                                      <div key="vat" style={rowStyle}>
                                        <span style={{ color: '#434655', display: 'flex', alignItems: 'center', gap: '4px', position: 'relative' }}>
                                          {t("VAT")}
                                          <input type="number" id="purchase_vat_percent_t2" name="purchase_vat_percent_t2" onWheel={(e) => e.target.blur()} disabled={true} className="form-control form-control-sm text-center" style={{ width: "54px", display: 'inline-block' }} value={formData.vat_percent} onChange={(e) => {
                                            if (parseFloat(e.target.value) === 0) { formData.vat_percent = parseFloat(e.target.value); setFormData({ ...formData }); delete errors["vat_percent"]; setErrors({ ...errors }); reCalculate(); return; }
                                            if (parseFloat(e.target.value) < 0) { formData.vat_percent = parseFloat(e.target.value); formData.vat_price = 0.00; setFormData({ ...formData }); errors["vat_percent"] = t("VAT percent should be >= 0"); setErrors({ ...errors }); reCalculate(); return; }
                                            if (!e.target.value) { formData.vat_percent = ""; formData.vat_price = 0.00; errors["vat_percent"] = t("Invalid vat percent"); setFormData({ ...formData }); setErrors({ ...errors }); return; }
                                            delete errors["vat_percent"]; setErrors({ ...errors });
                                            formData.vat_percent = e.target.value; reCalculate(); setFormData({ ...formData });
                                          }} />
                                          %
                                          <OverlayTrigger placement="left" trigger="click" show={openSummaryTooltip === 'vat'} overlay={renderVATTooltip()}><span style={{ textDecoration: 'underline dotted', cursor: 'pointer', color: '#888' }} onClick={(e) => { e.stopPropagation(); setOpenSummaryTooltip(p => p === 'vat' ? null : 'vat'); }}>ℹ️</span></OverlayTrigger>
                                          {errors.vat_percent && <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 10, whiteSpace: 'nowrap', background: '#fff', border: '1px solid #fca5a5', borderRadius: '3px', padding: '1px 6px', boxShadow: '0 2px 6px rgba(0,0,0,0.1)', color: '#dc2626', fontSize: '11px' }}>{errors.vat_percent}</div>}
                                        </span>
                                        <span style={{ fontWeight: 500 }}><NumberFormat value={trimTo2Decimals(formData.vat_price)} displayType={"text"} thousandSeparator={true} suffix={" "} renderText={(value, props) => value} /></span>
                                      </div>
                                    );
                                    case 'net_before_rounding': return (
                                      <div key="net_before_rounding" style={rowStyle}>
                                        <span style={{ color: '#434655' }}>{t("Before Rounding")} <OverlayTrigger placement="left" trigger="click" show={openSummaryTooltip === 'before_rounding'} overlay={renderNetTotalBeforeRoundingTooltip2()}><span style={{ textDecoration: 'underline dotted', cursor: 'pointer', color: '#888' }} onClick={(e) => { e.stopPropagation(); setOpenSummaryTooltip(p => p === 'before_rounding' ? null : 'before_rounding'); }}>ℹ️</span></OverlayTrigger></span>
                                        <span style={{ fontWeight: 500 }}><NumberFormat value={trimTo2Decimals(formData.net_total - roundingAmount)} displayType={"text"} thousandSeparator={true} suffix={" "} renderText={(value, props) => value} /></span>
                                      </div>
                                    );
                                    case 'rounding_amount': return (
                                      <div key="rounding_amount" style={rowStyle}>
                                        <span style={{ color: '#434655', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                          {t("Rounding")}
                                          <label style={{ fontSize: '11px', color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', marginBottom: 0 }}>
                                            <input type="checkbox" className="form-check-input" id="purchase_auto_rounding_t2" name="purchase_auto_rounding_t2" style={{ width: "14px", height: "14px", verticalAlign: "middle" }} value={formData.auto_rounding_amount} checked={formData.auto_rounding_amount} onChange={(e) => {
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
                                          <input type="number" id="purchase_rounding_amount_t2" name="purchase_rounding_amount_t2" disabled={formData.auto_rounding_amount} onWheel={(e) => e.target.blur()} style={{ width: "110px" }} className="form-control form-control-sm text-end" value={roundingAmount}
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
                                            }} />
                                          {errors.rounding_amount && <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: 10, whiteSpace: 'nowrap', background: '#fff', border: '1px solid #fca5a5', borderRadius: '3px', padding: '1px 6px', boxShadow: '0 2px 6px rgba(0,0,0,0.1)', color: '#dc2626', fontSize: '11px' }}>{errors.rounding_amount}</div>}
                                        </div>
                                      </div>
                                    );
                                    case 'net_total': return (
                                      <div key="net_total" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '15px', fontWeight: 700, paddingTop: '10px', borderTop: '1px solid #c3c6d7', color: '#191c1e', marginTop: '2px' }}>
                                        <span>{t("Net Total (inc. VAT)")} <OverlayTrigger placement="left" trigger="click" show={openSummaryTooltip === 'net_total'} overlay={renderNetTotalTooltip2()}><span style={{ textDecoration: 'underline dotted', cursor: 'pointer', fontSize: '13px', color: '#888' }} onClick={(e) => { e.stopPropagation(); setOpenSummaryTooltip(p => p === 'net_total' ? null : 'net_total'); }}>ℹ️</span></OverlayTrigger></span>
                                        <span style={{ color: '#004ac6' }}><NumberFormat value={trimTo2Decimals(formData.net_total)} displayType={"text"} thousandSeparator={true} suffix={" "} renderText={(value, props) => value} /></span>
                                      </div>
                                    );
                                    default: return null;
                                  }
                                })}
                              </div>
                            </div>
                            </div>{/* end bill summary wrapper */}
                          </div>
                        </div>{/* end sc-post-table */}
                        </div>
                        ) : (
                        <div className="table-responsive" style={{ overflowX: "auto", maxHeight: "400px", overflowY: "auto" }}>
                            <table className="table table-striped table-sm table-bordered">
                                <thead>
                                    <tr className="text-center">
                                        {purchaseSPColumns.filter(c => c.visible).map(col => {
                                            if (col.key === 'delete') return <th key="delete"></th>;
                                            if (col.key === 'si_no') return <th key="si_no">{t('SI No.')}</th>;
                                            if (col.key === 'part_number') return <th key="part_number">{t('Part No.')}</th>;
                                            if (col.key === 'name') return <th key="name" className="text-start" style={{ minWidth: "250px" }}>{t('Name')}</th>;
                                            if (col.key === 'info') return <th key="info">{t('Info')}</th>;
                                            if (col.key === 'stock') return <th key="stock">{t('Stock')}</th>;
                                            if (col.key === 'qty') return <th key="qty">{t('Qty')}</th>;
                                            if (col.key === 'warehouse') return store.settings?.enable_warehouse_module ? <th key="warehouse">{t('Add Stock To')}</th> : null;
                                            if (col.key === 'unit_price') return <th key="unit_price">{t('Unit Price(without VAT)')}</th>;
                                            if (col.key === 'unit_price_with_vat') return <th key="unit_price_with_vat">{t('Unit Price(with VAT)')}</th>;
                                            if (col.key === 'unit_discount') return <th key="unit_discount">{t('Unit Disc.(without VAT)')}</th>;
                                            if (col.key === 'unit_discount_with_vat') return <th key="unit_discount_with_vat">{t('Unit Disc.(with VAT)')}</th>;
                                            if (col.key === 'unit_discount_percent') return <th key="unit_discount_percent">{t('Unit Disc. %(without VAT)')}</th>;
                                            if (col.key === 'wholesale_unit_price') return <th key="wholesale_unit_price">{t('Set Wholesale unit price(without VAT)')}</th>;
                                            if (col.key === 'retail_unit_price') return <th key="retail_unit_price">{t('Set Retail unit price(without VAT)')}</th>;
                                            if (col.key === 'price') return <th key="price">{t('Price(without VAT)')}</th>;
                                            if (col.key === 'price_with_vat') return <th key="price_with_vat">{t('Price(with VAT)')}</th>;
                                            return null;
                                        })}
                                    </tr>
                                </thead>
                                <tbody>
                                    {purchaseSPTableBodyRows}
                                </tbody>
                            </table>
                        </div>
                        ); })()}

                        {formType !== 'type2' && (<>
                        <div className="table-responsive" style={{ overflowX: "auto" }}>
                            <table className="table table-striped table-sm table-bordered">
                                <tbody>
                                    <tr>


                                        <th colSpan="8" className="text-end">{t('Total(without VAT)')}</th>
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
                                        <th colSpan="8" className="text-end">{t('Total(with VAT)')}</th>
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
                                            {t('Shipping & Handling Fees')}
                                        </th>
                                        <td className="text-end">
                                            <input type="number" id="purchase_shipping_fees" name="purchase_shipping_fees" onWheel={(e) => e.target.blur()} style={{ width: "150px" }} className="text-start" value={shipping} onChange={(e) => {
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
                                            {t('Discount(without VAT)')} <input type="number" id="discount_percent" name="discount_percent" onWheel={(e) => e.target.blur()} disabled={true} style={{ width: "50px" }} className="text-start" value={discountPercent} onChange={(e) => {
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
                                                    }, 20);
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
                                            {t('Discount(with VAT)')} <input
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
                                                    }, 20);
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
                                            {t('Total Taxable Amount(without VAT)')}
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

                                        <th colSpan="8" className="text-end"> {t('VAT')}  <input type="number" id="purchase_vat_percent" name="purchase_vat_percent" onWheel={(e) => e.target.blur()} disabled={true} className="text-center" style={{ width: "50px" }} value={formData.vat_percent} onChange={(e) => {
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
                                            {t('Net Total(with VAT) Before Rounding')}
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

                                        <th colSpan="8" className="text-end">  {t('Rounding Amount')}
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
                                                }} />{" "}{t('Auto Calculate')}{" ["}
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
                                            {t("Net Total(with VAT)")}
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

                        <div className="col-md-12" style={{ maxWidth: "90%" }}>
                            <label className="form-label">{t('Payments Paid')}</label>

                            <div class="table-responsive">
                                <Button variant="secondary" style={{ alignContent: "right", marginBottom: "10px" }} onClick={addNewPayment}>
                                    {t("Create new payment")}
                                </Button>
                                <table class="table table-striped table-sm table-bordered" style={{ width: "100%" }}>
                                    {formData.payments_input && formData.payments_input.length > 0 &&
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
                                                {t("Description")}
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
                                                    <td style={{ minWidth: "80px" }}>

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
                                                                <i className="bi bi-x-lg"> </i>
                                                                {errors["payment_date_" + key]}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td style={{ position: 'relative', minWidth: "96px" }}>
                                                        <input id={`${"purchase_payment_amount" + key}`} name={`${"purchase_payment_amount" + key}`}
                                                            type='number' value={formData.payments_input[key].amount} className="form-control "
                                                            onChange={(e) => {
                                                                delete errors["payment_amount_" + key];
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
                                                                {errors["payment_amount_" + key]}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td style={{ position: 'relative', minWidth: "80px" }}>
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
                                                            <option value="">{t('Select')}</option>
                                                            <option value="cash">{t('Cash')}</option>
                                                            <option value="debit_card">{t('Debit Card')}</option>
                                                            <option value="credit_card">{t('Credit Card')}</option>
                                                            <option value="bank_card">{t('Bank Card')}</option>
                                                            <option value="bank_transfer">{t('Bank Transfer')}</option>
                                                            <option value="bank_cheque">{t('Bank Cheque')}</option>
                                                            <option value="sales">{t('Sales')}</option>
                                                            <option value="purchase_return">{t('Purchase Return')}</option>
                                                            <option value="vendor_account">{t('Vendor Account')}</option>
                                                        </select>
                                                        {errors["payment_method_" + key] && (
                                                            <div style={{ color: "red", position: 'absolute', left: 0, top: '100%', whiteSpace: 'nowrap', zIndex: 100, backgroundColor: '#fff', fontSize: '12px', padding: '2px 4px' }}>
                                                                <i className="bi bi-x-lg"> </i>
                                                                {errors["payment_method_" + key]}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td style={{ minWidth: "347px" }}>
                                                        <input type='text' value={formData.payments_input[key].description || ""} className="form-control"
                                                            onChange={(e) => { formData.payments_input[key].description = e.target.value; setFormData({ ...formData }); }}
                                                            placeholder={t("Description")}
                                                        />
                                                    </td>
                                                    <td style={{ minWidth: "240px" }}>
                                                        {formData.payments_input[key] && (
                                                            <span
                                                                style={{ cursor: "pointer", color: "blue" }}
                                                                onClick={() => openReferenceUpdateForm(formData.payments_input[key].reference_id, formData.payments_input[key].reference_type)}
                                                            >
                                                                {formData.payments_input[key].reference_code}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td style={{ width: "80px", textAlign: 'center' }}>
                                                        <button type="button" onClick={() => removePayment(key)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: '2px 6px', borderRadius: '4px' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fef2f2'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                                            <i className="bi bi-trash" style={{ fontSize: '14px' }}></i>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        <tr>
                                            <td class="text-end">
                                                <b>{t("Total")}</b>
                                            </td>
                                            <td><b style={{ marginLeft: "14px" }}>{totalPaymentAmount?.toFixed(2)}</b>
                                                {errors["total_payment"] && (
                                                    <div style={{ color: "red" }}>
                                                        {errors["total_payment"]}
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                <b style={{ marginLeft: "12px", alignSelf: "end" }}>{t("Balance")}: {balanceAmount?.toFixed(2)}</b>
                                                {errors["vendor_credit_limit"] && (
                                                    <div style={{ color: "red" }}>
                                                        {errors["vendor_credit_limit"]}
                                                    </div>
                                                )}
                                            </td>
                                            <td colSpan={3}>
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
                        <div className="row" style={{ marginTop: "12px" }}>
                            <div className="col-md-2">
                                <label className="form-label">{t("Commission")}</label>
                                <input
                                    type='number'
                                    ref={commissionRef}
                                    id="purchase_commission"
                                    name="purchase_commission"
                                    value={commission}
                                    className="form-control"
                                    onChange={(e) => {
                                        delete errors["commission"];
                                        delete errors["commission_payment_method"];
                                        setErrors({ ...errors });
                                        if (!e.target.value) {
                                            commission = e.target.value;
                                            setCommission(commission);
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
                                        timerRef.current = setTimeout(() => { commissionRef.current?.select(); }, 20);
                                    }}
                                />
                                {errors.commission && (
                                    <div style={{ color: "red" }}>{t(errors.commission)}</div>
                                )}
                            </div>
                            <div className="col-md-2">
                                <label className="form-label">{t("C. Payment Method")}</label>
                                <select
                                    value={formData.commission_payment_method || ""}
                                    className="form-control"
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
                                    <div style={{ color: "red" }}>{t(errors["commission_payment_method"])}</div>
                                )}
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
                                            timerRef.current = setTimeout(() => { reCalculate(); }, 100);
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
                                        timerRef.current = setTimeout(() => { reCalculate(); }, 100);
                                    }}
                                    onKeyDown={(e) => {
                                        if (timerRef.current) clearTimeout(timerRef.current);
                                        if (e.key === "Backspace") {
                                            cashDiscount = "";
                                            setCashDiscount(cashDiscount);
                                            if (timerRef.current) clearTimeout(timerRef.current);
                                            timerRef.current = setTimeout(() => { reCalculate(); }, 100);
                                            return;
                                        }
                                    }}
                                    onFocus={() => {
                                        if (timerRef.current) clearTimeout(timerRef.current);
                                        timerRef.current = setTimeout(() => { cashDiscountRef.current?.select(); }, 20);
                                    }}
                                />
                                {errors.cash_discount && (
                                    <div style={{ color: "red" }}>{errors.cash_discount}</div>
                                )}
                            </div>
                        </div>

                        {/*<div className="col-md-4">
                            <label className="form-label">Import data from Image</label>
                            <Form.Group controlId="formFile" className="mb-3">
                                <Form.Label>Upload Image</Form.Label>
                                <Form.Control type="file" accept="image/*" onChange={handleFileChange} />
                            </Form.Group>

                            {previewUrl && (
                                <div className="mb-3">
                                    <img src={previewUrl} alt="Preview" className="img-thumbnail" style={{ maxWidth: "300px" }} />
                                </div>
                            )}

                            <Button onClick={handleUpload} disabled={uploading}>
                                {uploading ? "Uploading..." : "Upload"}
                            </Button>
                        </div>*/}


                        {store.settings?.disable_purchases_on_accounts && <div className="col-md-2">
                            <div className="input-group mb-3">
                                <input type="checkbox"
                                    value={formData.enable_on_accounts}
                                    checked={formData.enable_on_accounts}
                                    onChange={(e) => {
                                        errors["enable_on_accounts"] = "";
                                        formData.enable_on_accounts = !formData.enable_on_accounts;
                                        setFormData({ ...formData });
                                        console.log(formData);
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
                        </>)}
                    </form>
                </Modal.Body >

            </Modal >


            {/* Purchase SP Table Settings Modal */}
            <Modal show={showPurchaseSPSettings} onHide={() => setShowPurchaseSPSettings(false)} size="md">
                <Modal.Header closeButton>
                    <Modal.Title>Table Settings</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <DragDropContext onDragEnd={onDragEndPurchaseSP}>
                        <Droppable droppableId="purchase-sp-columns">
                            {(provided) => (
                                <ul className="list-group" {...provided.droppableProps} ref={provided.innerRef}>
                                    {purchaseSPColumns.map((col, idx) => (
                                        <Draggable key={col.key} draggableId={col.key} index={idx}>
                                            {(provided) => (
                                                <li className="list-group-item d-flex align-items-center gap-2"
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    {...provided.dragHandleProps}>
                                                    <input type="checkbox" checked={col.visible}
                                                        onChange={() => handleTogglePurchaseSPColumn(col.key)} />
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
                    <Button variant="secondary" onClick={restoreDefaultPurchaseSPSettings}>Restore Defaults</Button>
                    <Button variant="primary" onClick={() => setShowPurchaseSPSettings(false)}>Close</Button>
                </Modal.Footer>
            </Modal>

        </>
    );
});

export default PurchaseCreate;
