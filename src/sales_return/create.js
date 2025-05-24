import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
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
import Preview from "./../order/preview.js";
import { Dropdown } from 'react-bootstrap';
import SalesHistory from "./../product/sales_history.js";
import SalesReturnHistory from "./../product/sales_return_history.js";
import PurchaseHistory from "./../product/purchase_history.js";
import PurchaseReturnHistory from "./../product/purchase_return_history.js";
import QuotationHistory from "./../product/quotation_history.js";
import DeliveryNoteHistory from "./../product/delivery_note_history.js";
import Products from "./../utils/products.js";
import ResizableTableCell from './../utils/ResizableTableCell';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import Amount from "../utils/amount.js";

import ProductCreate from "./../product/create.js";
import ProductView from "./../product/view.js";
import ImageViewerModal from './../utils/ImageViewerModal';

const SalesReturnCreate = forwardRef((props, ref) => {


    function ResetForm() {
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

            formData.cash_discount = 0.00;
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

                setFormData({ ...formData });
                reCalculate();
                setFormData({ ...formData });
                checkWarnings();


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

                    formData.cash_discount = parseFloat(order.cash_discount - order.return_cash_discount);
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


    function RunKeyActions(event, product) {
        const isMac = navigator.userAgentData
            ? navigator.userAgentData.platform === 'macOS'
            : /Mac/i.test(navigator.userAgent);

        const isCmdOrCtrl = isMac ? event.metaKey : event.ctrlKey;

        if (event.key === "F10") {
            openLinkedProducts(product);
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
        } else if (isCmdOrCtrl && event.shiftKey && event.key.toLowerCase() === 'f') {
            openProductImages(product.product_id);
        }
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

            if (unitPrice && /^\d*\.?\d{0,2}$/.test(unitPrice) === false) {
                errors["unit_price_" + i] = "Max decimal points allowed is 2";
                setErrors({ ...errors });
                haveErrors = true;
            }

            let unitPriceWithVAT = parseFloat(selectedProducts[i].unit_price_with_vat);

            if (unitPriceWithVAT && /^\d*\.?\d{0,2}$/.test(unitPriceWithVAT) === false) {
                errors["unit_price_with_vat_" + i] = "Max decimal points allowed is 2";
                setErrors({ ...errors });
                haveErrors = true;
            }


            let unitDiscount = 0.00;

            if (selectedProducts[i].unit_discount) {
                unitDiscount = parseFloat(selectedProducts[i].unit_discount)
                if (/^\d*\.?\d{0,2}$/.test(unitDiscount) === false) {
                    errors["unit_discount_" + i] = "Max decimal points allowed is 2";
                    setErrors({ ...errors });
                    haveErrors = true;
                }
            }

            let unitDiscountWithVAT = 0.00;

            if (selectedProducts[i].unit_discount_with_vat) {
                unitDiscountWithVAT = parseFloat(selectedProducts[i].unit_discount_with_vat)
                if (/^\d*\.?\d{0,2}$/.test(unitDiscountWithVAT) === false) {
                    errors["unit_discount_with_vat_" + i] = "Max decimal points allowed is 2";
                    setErrors({ ...errors });
                    haveErrors = true;
                }
            }

            let unitDiscountPercent = 0.00;

            if (selectedProducts[i].unit_discount_percent) {
                unitDiscountPercent = parseFloat(selectedProducts[i].unit_discount_percent)
                if (/^\d*\.?\d{0,2}$/.test(unitDiscountPercent) === false) {
                    errors["unit_discount_percent_" + i] = "Max decimal points allowed is 2";
                    setErrors({ ...errors });
                    haveErrors = true;
                }
            }

            let unitDiscountPercentWithVAT = 0.00;

            if (selectedProducts[i].unit_discount_percent_with_vat) {
                unitDiscountPercentWithVAT = parseFloat(selectedProducts[i].unit_discount_percent_with_vat)
                if (/^\d*\.?\d{0,2}$/.test(unitDiscountPercent) === false) {
                    errors["unit_discount_percent_with_vat" + i] = "Max decimal points allowed is 2";
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
            });
        }

        if (!formData.cash_discount) {
            formData.cash_discount = 0.00;
        }

        formData.discount = parseFloat(formData.discount);
        formData.discount_percent = parseFloat(formData.discount_percent);

        formData.vat_percent = parseFloat(formData.vat_percent);
        console.log("formData.discount:", formData.discount);


        errors["products"] = "";
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

    let [shipping, setShipping] = useState(0.00);
    let [discount, setDiscount] = useState(0.00);
    let [discountPercent, setDiscountPercent] = useState(0.00);

    let [discountWithVAT, setDiscountWithVAT] = useState(0.00);
    let [discountPercentWithVAT, setDiscountPercentWithVAT] = useState(0.00);


    async function reCalculate(productIndex) {
        console.log("inside reCalculate");

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
                formData.net_total = res.result.net_total;
                formData.vat_price = res.result.vat_price;

                if (res.result.discount_percent) {
                    discountPercent = res.result.discount_percent;
                    setDiscountPercent(discountPercent);
                }


                if (res.result.discount_percent_with_vat) {
                    discountPercentWithVAT = res.result.discount_percent_with_vat;
                    setDiscountPercentWithVAT(discountPercentWithVAT);
                }

                if (res.result.discount) {
                    discount = res.result.discount;
                    setDiscount(discount);
                }

                if (res.result.discount_with_vat) {
                    discountWithVAT = res.result.discount_with_vat;
                    setDiscountWithVAT(discountWithVAT);
                }


                if (res.result.shipping_handling_fees) {
                    formData.shipping_handling_fees = res.result.shipping_handling_fees;
                }


                for (let i = 0; i < selectedProducts?.length; i++) {
                    for (let j = 0; j < res.result?.products?.length; j++) {
                        if (res.result?.products[j].product_id === selectedProducts[i].product_id) {

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
                            }

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


            /*
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
            }*/
            if (!formData.id && order && order.payment_status !== "not_paid") {
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
        balanceAmount = (parseFloat(trimTo2Decimals(formData.net_total)) - parseFloat(parseFloat(trimTo2Decimals(formData.cash_discount)))) - parseFloat(trimTo2Decimals(totalPayment));
        balanceAmount = parseFloat(trimTo2Decimals(balanceAmount));
        setBalanceAmount(balanceAmount);

        if (balanceAmount === (parseFloat(trimTo2Decimals(formData.net_total)) - parseFloat(trimTo2Decimals(formData.cash_discount)))) {
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

        errors["cash_discount"] = "";
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



        if (formData.net_total && formData.cash_discount > 0 && formData.cash_discount >= formData.net_total) {
            errors["cash_discount"] = "Cash discount should not be >= " + trimTo2Decimals(formData.net_total).toString();
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
        //formData.payments_input[key]["deleted"] = true;
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
        ProductsRef.current.open(model, "linked_products");
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
        errors["phone"] = ""
        setErrors({ ...errors });

        if (model.phone) {
            if (!validatePhoneNumber(model.phone)) {
                errors["phone"] = "Invalid phone no."
                setErrors({ ...errors });
                return;
            }
        }

        PreviewRef.current.open(model, "whatsapp", "sales_return");
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

    const renderNetTotalTooltip = (props) => (
        <Tooltip id="label-tooltip" {...props}>
            Total Taxable Amount(without VAT) + VAT Price ( 15% of Taxable Amount)
            {"(" + trimTo2Decimals(formData.total + shipping - discount) + " + " + trimTo2Decimals(formData.vat_price) + ") = " + trimTo2Decimals(formData.net_total)}
        </Tooltip>
    );


    const inputRefs = useRef({});
    const discountRef = useRef(null);

    function openUpdateProductForm(id) {
        ProductCreateFormRef.current.open(id);
    }

    const ProductDetailsViewRef = useRef();
    function openProductDetails(id) {
        ProductDetailsViewRef.current.open(id);
    }

    function checkWarnings() {
        errors = {};
        for (let i = 0; i < selectedProducts.length; i++) {
            if (selectedProducts[i].purchase_unit_price > selectedProducts[i].unit_price) {
                errors["purchase_unit_price_" + i] = "Warning: Purchase unit price is greater than Unit Price(without VAT)"
                setErrors({ ...errors });
            }
        }
    }

    return (
        <>
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
                        {formData.id ? "Update Sales Return #" + formData.code + " for sale #" + formData.order_code : "Create Sales Return for sale #" + formData.order_code}
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
                    {Object.keys(errors).length > 0 ?
                        <div>
                            <ul>
                                {errors && Object.keys(errors).map((key, index) => {
                                    return (errors[key] ? <li style={{ color: "red" }}>{errors[key]}</li> : "");
                                })}
                            </ul></div> : ""}
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
                        </div>}

                        {selectedProducts?.length > 0 && <div className="col-md-1">
                            <Button className={`btn ${!formData.customer_name && !formData.phone ? "btn-secondary" : "btn-success"} btn-sm`} disabled={!formData.customer_name && !formData.phone} style={{ marginTop: "30px" }} onClick={sendWhatsAppMessage}>
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
                        </div>}

                        {selectedProducts?.length > 0 && <div className="col-md-3">
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
                        </div>}

                        {selectedProducts?.length > 0 && <div className="col-md-3" >
                            <label className="form-label">Remarks</label>
                            <div className="input-group mb-3">
                                <textarea
                                    value={formData.remarks}
                                    type='string'
                                    onChange={(e) => {
                                        errors["address"] = "";
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
                                <thead>
                                    <tr className="text-center">
                                        <th>
                                            Select All
                                            <input
                                                type="checkbox"
                                                checked={isAllSelected}
                                                onChange={handleSelectAll}
                                            />
                                        </th>
                                        <th>SI No.</th>
                                        <th>Part No.</th>
                                        <th className="text-start" style={{ minWidth: "250px" }}>Name</th>
                                        <th className="text-start">Info</th>
                                        <th>Purchase Unit Price(without VAT)</th>
                                        <th>Qty</th>
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
                                        <tr key={index} className="text-center">
                                            <td>
                                                <input id={`${"select_sales_return_product" + index}`} name={`${"select_sales_return_product" + index}`} type="checkbox" checked={selectedProducts[index].selected} onChange={(e) => {
                                                    console.log("e.target.value:", e.target.value)
                                                    selectedProducts[index].selected = !selectedProducts[index].selected;
                                                    setSelectedProducts([...selectedProducts]);
                                                    reCalculate();
                                                }} />
                                            </td>
                                            <td>{index + 1}</td>
                                            <td>{product.part_number}</td>
                                            <ResizableTableCell
                                            >
                                                <div className="input-group mb-3">
                                                    <input id={`${"sales_return_product_name" + index}`}
                                                        name={`${"sales_return_product_name" + index}`}
                                                        type="text"
                                                        onWheel={(e) => e.target.blur()}
                                                        value={product.name}
                                                        onKeyDown={(e) => {
                                                            RunKeyActions(e, product);
                                                        }}
                                                        className="form-control"
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
                                                                Linked Products (F10)
                                                            </Dropdown.Item>

                                                            <Dropdown.Item onClick={() => {
                                                                openSalesHistory(product);
                                                            }}>
                                                                <i className="bi bi-clock-history"></i>
                                                                &nbsp;
                                                                Sales History (F4)
                                                            </Dropdown.Item>
                                                            <Dropdown.Item onClick={() => {
                                                                openSalesReturnHistory(product);
                                                            }}>
                                                                <i className="bi bi-clock-history"></i>
                                                                &nbsp;
                                                                Sales Return History (F9)
                                                            </Dropdown.Item>
                                                            <Dropdown.Item onClick={() => {
                                                                openPurchaseHistory(product);
                                                            }}>
                                                                <i className="bi bi-clock-history"></i>
                                                                &nbsp;
                                                                Purchase History (F6)
                                                            </Dropdown.Item>
                                                            <Dropdown.Item onClick={() => {
                                                                openPurchaseReturnHistory(product);
                                                            }}>
                                                                <i className="bi bi-clock-history"></i>
                                                                &nbsp;
                                                                Purchase Return History (F8)
                                                            </Dropdown.Item>
                                                            <Dropdown.Item onClick={() => {
                                                                openDeliveryNoteHistory(product);
                                                            }}>
                                                                <i className="bi bi-clock-history"></i>
                                                                &nbsp;
                                                                Delivery Note History (F3)
                                                            </Dropdown.Item>
                                                            <Dropdown.Item onClick={() => {
                                                                openQuotationHistory(product);
                                                            }}>
                                                                <i className="bi bi-clock-history"></i>
                                                                &nbsp;
                                                                Quotation History  (F2)
                                                            </Dropdown.Item>

                                                            <Dropdown.Item onClick={() => {
                                                                openProductImages(product.product_id);
                                                            }}>
                                                                <i className="bi bi-clock-history"></i>
                                                                &nbsp;
                                                                Images  (CTR + SHIFT + F)
                                                            </Dropdown.Item>

                                                        </Dropdown.Menu>
                                                    </Dropdown>
                                                </div>
                                            </td>
                                            <td>

                                                <div className="input-group mb-3">
                                                    <input id={`${"sales_return_product_purchase_unit_price" + index}`} name={`${"sales_return_product_purchase_unit_price" + index}`}
                                                        type="number" onWheel={(e) => e.target.blur()}
                                                        value={product.purchase_unit_price} disabled={!selectedProducts[index].can_edit} className="form-control text-end"
                                                        placeholder="Purchase Unit Price"
                                                        onKeyDown={(e) => {
                                                            RunKeyActions(e, product);
                                                        }}
                                                        onChange={(e) => {
                                                            errors["purchase_unit_price_" + index] = "";
                                                            setErrors({ ...errors });

                                                            if (!e.target.value) {
                                                                //errors["purchase_unit_price_" + index] = "Invalid purchase unit price";
                                                                selectedProducts[index].purchase_unit_price = "";
                                                                setSelectedProducts([...selectedProducts]);
                                                                //setErrors({ ...errors });
                                                                console.log("errors:", errors);
                                                                return;
                                                            }


                                                            if (e.target.value === 0) {
                                                                // errors["purchase_unit_price_" + index] = "purchase unit price should be > 0";
                                                                selectedProducts[index].purchase_unit_price = parseFloat(e.target.value);
                                                                setSelectedProducts([...selectedProducts]);
                                                                //setErrors({ ...errors });
                                                                //console.log("errors:", errors);
                                                                return;
                                                            }


                                                            if (e.target.value) {
                                                                selectedProducts[index].purchase_unit_price = parseFloat(e.target.value);
                                                                console.log("selectedProducts[index].purchase_unit_price:", selectedProducts[index].purchase_unit_price);
                                                                setSelectedProducts([...selectedProducts]);
                                                                //reCalculate();
                                                            }


                                                            checkWarnings();
                                                            setErrors({ ...errors });

                                                        }} />
                                                    <div
                                                        style={{ color: "red", cursor: "pointer", marginLeft: "3px" }}
                                                        onClick={() => {
                                                            selectedProducts[index].can_edit = !selectedProducts[index].can_edit;
                                                            setSelectedProducts([...selectedProducts]);
                                                        }}
                                                    >
                                                        {selectedProducts[index].can_edit ? <i className="bi bi-floppy"> </i> : <i className="bi bi-pencil"> </i>}
                                                    </div>
                                                    {/*<span className="input-group-text" id="basic-addon2"></span>*/}
                                                </div>
                                                {errors["purchase_unit_price_" + index] && (
                                                    <div style={{ color: "red" }}>
                                                        <i className="bi bi-x-lg"> </i>
                                                        {errors["purchase_unit_price_" + index]}
                                                    </div>
                                                )}

                                            </td>
                                            <td style={{ width: "155px" }}>

                                                <div class="input-group mb-3">
                                                    <input id={`${"sales_return_product_quantity_" + index}`} name={`${"sales_return_product_quantity_" + index}`}
                                                        type="number" onWheel={(e) => e.target.blur()} value={(product.quantity)} className="form-control"
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

                                                            if (e.key === "ArrowLeft") {
                                                                timerRef.current = setTimeout(() => {
                                                                    if ((index + 1) < selectedProducts.length) {
                                                                        inputRefs.current[index + 1][`${"sales_return_unit_discount_with_vat_" + (index + 1)}`]?.focus();
                                                                    }
                                                                }, 100);
                                                            }
                                                        }}
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

                                                            if (parseFloat(e.target.value) === 0) {
                                                                errors["quantity_" + index] = "Quantity should be >0";
                                                                selectedProducts[index].quantity = parseFloat(e.target.value);
                                                                setSelectedProducts([...selectedProducts]);
                                                                setErrors({ ...errors });
                                                                console.log("errors:", errors);
                                                                return;
                                                            }


                                                            product.quantity = parseFloat(e.target.value);
                                                            selectedProducts[index].quantity = parseFloat(e.target.value);
                                                            setSelectedProducts([...selectedProducts]);
                                                            reCalculate();

                                                        }} />
                                                    <span class="input-group-text" id="basic-addon2">{selectedProducts[index].unit ? selectedProducts[index].unit : "Units"}</span>
                                                </div>
                                                {errors["quantity_" + index] && (
                                                    <div style={{ color: "red" }}>
                                                        <i className="bi bi-x-lg"> </i>
                                                        {errors["quantity_" + index]}
                                                    </div>
                                                )}

                                            </td>
                                            <td>
                                                <div className="input-group mb-3">
                                                    <input type="number"
                                                        id={`${"sales_return_product_unit_price" + index}`}
                                                        name={`${"sales_return_product_unit_price" + index}`} onWheel={(e) => e.target.blur()}
                                                        value={product.unit_price} className="form-control text-end"
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
                                                                    reCalculate(index);
                                                                }, 300);
                                                            } else if (e.key === "ArrowLeft") {
                                                                timerRef.current = setTimeout(() => {
                                                                    inputRefs.current[index][`${"sales_return_product_quantity_" + index}`].focus();
                                                                }, 100);
                                                            }
                                                        }}
                                                        onChange={(e) => {
                                                            if (timerRef.current) clearTimeout(timerRef.current);

                                                            errors["unit_price_" + index] = "";
                                                            setErrors({ ...errors });
                                                            if (!e.target.value) {
                                                                // errors["unit_price_" + index] = "Invalid Unit Price";
                                                                selectedProducts[index].unit_price = "";
                                                                selectedProducts[index].unit_price_with_vat = "";
                                                                setSelectedProducts([...selectedProducts]);
                                                                setErrors({ ...errors });
                                                                console.log("errors:", errors);
                                                                return;
                                                            }

                                                            if (e.target.value === 0) {
                                                                //  errors["unit_price_" + index] = "Unit Price should be > 0";
                                                                selectedProducts[index].unit_price = 0
                                                                selectedProducts[index].unit_price_with_vat = 0;
                                                                setSelectedProducts([...selectedProducts]);
                                                                setErrors({ ...errors });
                                                                console.log("errors:", errors);
                                                                return;
                                                            }


                                                            if (/^\d*\.?\d{0,2}$/.test(parseFloat(e.target.value)) === false) {
                                                                errors["unit_price_" + index] = "Max. decimal points allowed is 2";
                                                                setErrors({ ...errors });
                                                            }

                                                            selectedProducts[index].unit_price = parseFloat(e.target.value);


                                                            // selectedProducts[index].unit_price_with_vat = parseFloat(trimTo2Decimals(selectedProducts[index].unit_price * (1 + (formData.vat_percent / 100))));
                                                            // console.log("selectedProducts[index].unit_price:", selectedProducts[index].unit_price);
                                                            setSelectedProducts([...selectedProducts]);
                                                            timerRef.current = setTimeout(() => {
                                                                selectedProducts[index].unit_price_with_vat = parseFloat(trimTo2Decimals(selectedProducts[index].unit_price * (1 + (formData.vat_percent / 100))))
                                                                selectedProducts[index].unit_discount_percent = parseFloat(trimTo2Decimals(((selectedProducts[index].unit_discount / selectedProducts[index].unit_price) * 100)))
                                                                selectedProducts[index].unit_discount_percent_with_vat = parseFloat(trimTo2Decimals(((selectedProducts[index].unit_discount_with_vat / selectedProducts[index].unit_price_with_vat) * 100)))

                                                                reCalculate(index);
                                                            }, 300);


                                                            checkWarnings();
                                                            setErrors({ ...errors });

                                                        }} />

                                                </div>
                                                {errors["unit_price_" + index] && (
                                                    <div style={{ color: "red" }}>
                                                        {errors["unit_price_" + index]}
                                                    </div>
                                                )}

                                            </td>
                                            <td>
                                                <div className="input-group mb-3">
                                                    <input type="number" id={`${"sales_return_product_unit_price_with_vat_" + index}`} name={`${"sales_return_product_unit_price_with_vat_" + index}`} onWheel={(e) => e.target.blur()} value={selectedProducts[index].unit_price_with_vat} className="form-control text-end"

                                                        placeholder="Unit Price(with VAT)"
                                                        ref={(el) => {
                                                            if (!inputRefs.current[index]) inputRefs.current[index] = {};
                                                            inputRefs.current[index][`${"sales_return_product_unit_price_with_vat_" + index}`] = el;
                                                        }}
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
                                                                    reCalculate(index);
                                                                }, 300);
                                                            } else if (e.key === "ArrowLeft") {
                                                                timerRef.current = setTimeout(() => {
                                                                    inputRefs.current[index][`${"sales_return_product_unit_price_" + index}`].focus();
                                                                }, 100);
                                                            }
                                                        }}
                                                        onChange={(e) => {
                                                            if (timerRef.current) clearTimeout(timerRef.current);

                                                            errors["unit_price_with_vat_" + index] = "";
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
                                                                    reCalculate(index);
                                                                }, 300);
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
                                                                    reCalculate(index);
                                                                }, 300);
                                                                return;
                                                            }


                                                            if (/^\d*\.?\d{0,2}$/.test(parseFloat(e.target.value)) === false) {
                                                                errors["unit_price_with_vat_" + index] = "Max. decimal points allowed is 2";
                                                                setErrors({ ...errors });
                                                            }

                                                            selectedProducts[index].unit_price_with_vat = parseFloat(e.target.value);

                                                            setSelectedProducts([...selectedProducts]);
                                                            // Set new debounce timer
                                                            timerRef.current = setTimeout(() => {
                                                                selectedProducts[index].unit_price = parseFloat(trimTo2Decimals(selectedProducts[index].unit_price_with_vat / (1 + (formData.vat_percent / 100))))
                                                                selectedProducts[index].unit_discount_with_vat = parseFloat(trimTo2Decimals(selectedProducts[index].unit_discount * (1 + (formData.vat_percent / 100))))
                                                                selectedProducts[index].unit_discount_percent = parseFloat(trimTo2Decimals(((selectedProducts[index].unit_discount / selectedProducts[index].unit_price) * 100)))
                                                                selectedProducts[index].unit_discount_percent_with_vat = parseFloat(trimTo2Decimals(((selectedProducts[index].unit_discount_with_vat / selectedProducts[index].unit_price_with_vat) * 100)))
                                                                reCalculate(index);
                                                            }, 300);
                                                        }} />
                                                </div>
                                                {errors["unit_price_with_vat_" + index] && (
                                                    <div style={{ color: "red" }}>
                                                        {errors["unit_price_with_vat_" + index]}
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                <div className="input-group mb-3">
                                                    <input type="number" id={`${"sales_return_unit_discount_" + index}`} name={`${"sales_return_unit_discount_" + index}`} onWheel={(e) => e.target.blur()} className="form-control text-end sales_unit_discount"
                                                        value={selectedProducts[index].unit_discount}
                                                        ref={(el) => {
                                                            if (!inputRefs.current[index]) inputRefs.current[index] = {};
                                                            inputRefs.current[index][`${"sales_return_unit_discount_" + index}`] = el;
                                                        }}
                                                        onFocus={() => {
                                                            if (timerRef.current) clearTimeout(timerRef.current);
                                                            timerRef.current = setTimeout(() => {
                                                                inputRefs.current[index][`${"sales_return_unit_discount_" + index}`].select();
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
                                                            if (timerRef.current) clearTimeout(timerRef.current);

                                                            if (parseFloat(e.target.value) === 0) {
                                                                selectedProducts[index].unit_discount = parseFloat(e.target.value);
                                                                setFormData({ ...formData });
                                                                errors["unit_discount_" + index] = "";
                                                                setErrors({ ...errors });
                                                                timerRef.current = setTimeout(() => {
                                                                    reCalculate(index);
                                                                }, 300);
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
                                                                    reCalculate(index);
                                                                }, 300);
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
                                                                    reCalculate(index);
                                                                }, 300);
                                                                //setErrors({ ...errors });
                                                                return;
                                                            }

                                                            errors["unit_discount_" + index] = "";
                                                            errors["unit_discount_percent_" + index] = "";
                                                            setErrors({ ...errors });


                                                            if (/^\d*\.?\d{0,2}$/.test(parseFloat(e.target.value)) === false) {
                                                                errors["unit_discount_" + index] = "Max. decimal points allowed is 2";
                                                                setErrors({ ...errors });
                                                            }

                                                            selectedProducts[index].unit_discount = parseFloat(e.target.value);


                                                            setFormData({ ...formData });
                                                            timerRef.current = setTimeout(() => {
                                                                selectedProducts[index].unit_discount_with_vat = parseFloat(trimTo2Decimals(selectedProducts[index].unit_discount * (1 + (formData.vat_percent / 100))))

                                                                selectedProducts[index].unit_discount_percent = parseFloat(trimTo2Decimals(((selectedProducts[index].unit_discount / selectedProducts[index].unit_price) * 100)))
                                                                selectedProducts[index].unit_discount_percent_with_vat = parseFloat(trimTo2Decimals(((selectedProducts[index].unit_discount_with_vat / selectedProducts[index].unit_price_with_vat) * 100)))
                                                                reCalculate(index);
                                                            }, 300);
                                                        }} />
                                                </div>
                                                {errors["unit_discount_" + index] && (
                                                    <div style={{ color: "red" }}>
                                                        {errors["unit_discount_" + index]}
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                <div className="input-group mb-3">
                                                    <input type="number" id={`${"sales_return_unit_discount_with_vat_" + index}`} name={`${"sales_return_unit_discount_with_vat_" + index}`} onWheel={(e) => e.target.blur()} className="form-control text-end sales_unit_discount" value={selectedProducts[index].unit_discount_with_vat}
                                                        ref={(el) => {
                                                            if (!inputRefs.current[index]) inputRefs.current[index] = {};
                                                            inputRefs.current[index][`${"sales_return_unit_discount_with_vat_" + index}`] = el;
                                                        }}
                                                        onFocus={() => {
                                                            if (timerRef.current) clearTimeout(timerRef.current);
                                                            timerRef.current = setTimeout(() => {
                                                                inputRefs.current[index][`${"sales_return_unit_discount_with_vat_" + index}`].select();
                                                            }, 100);
                                                        }}
                                                        onKeyDown={(e) => {
                                                            RunKeyActions(e, product);

                                                            if (timerRef.current) clearTimeout(timerRef.current);

                                                            if (e.key === "Enter") {
                                                                console.log("selectedProducts.length:", selectedProducts.length)
                                                                console.log("index:", index);
                                                                if (selectedProducts.length > (index - 1) && index > 0) {
                                                                    console.log("Moving to next line");
                                                                    timerRef.current = setTimeout(() => {
                                                                        inputRefs.current[index - 1][`${"sales_return_product_quantity_" + (index - 1)}`]?.focus();
                                                                    }, 100);
                                                                } else {
                                                                    timerRef.current = setTimeout(() => {
                                                                        inputRefs.current[selectedProducts.length - 1][`${"sales_return_product_quantity_" + (selectedProducts.length - 1)}`]?.focus();
                                                                    }, 100);
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
                                                                errors["unit_discount_with_vat" + index] = "";
                                                                setErrors({ ...errors });
                                                                timerRef.current = setTimeout(() => {
                                                                    reCalculate(index);
                                                                }, 300);
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
                                                                    reCalculate(index);
                                                                }, 300);
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
                                                                    reCalculate(index);
                                                                }, 300);
                                                                //setErrors({ ...errors });
                                                                return;
                                                            }

                                                            errors["unit_discount_with_vat_" + index] = "";
                                                            errors["unit_discount_percent_" + index] = "";
                                                            setErrors({ ...errors });


                                                            if (/^\d*\.?\d{0,2}$/.test(parseFloat(e.target.value)) === false) {
                                                                errors["unit_discount_with_vat_" + index] = "Max. decimal points allowed is 2";
                                                                setErrors({ ...errors });
                                                            }

                                                            selectedProducts[index].unit_discount_with_vat = parseFloat(e.target.value); //input


                                                            setFormData({ ...formData });
                                                            timerRef.current = setTimeout(() => {

                                                                selectedProducts[index].unit_discount = parseFloat(trimTo2Decimals(selectedProducts[index].unit_discount_with_vat / (1 + (formData.vat_percent / 100))))
                                                                selectedProducts[index].unit_discount_percent = parseFloat(trimTo2Decimals(((selectedProducts[index].unit_discount / selectedProducts[index].unit_price) * 100)))
                                                                selectedProducts[index].unit_discount_percent_with_vat = parseFloat(trimTo2Decimals(((selectedProducts[index].unit_discount_with_vat / selectedProducts[index].unit_price_with_vat) * 100)))

                                                                reCalculate(index);
                                                            }, 300);
                                                        }} />
                                                </div>
                                                {errors["unit_discount_with_vat_" + index] && (
                                                    <div style={{ color: "red" }}>
                                                        {errors["unit_discount_with_vat_" + index]}
                                                    </div>
                                                )}
                                            </td>
                                            {/*<td>
                                                                                            <div className="input-group mb-3">
                                                                                                <input type="number" id={`${"sales_unit_discount_percent" + index}`} disabled={false} name={`${"sales_unit_discount_percent" + index}`} onWheel={(e) => e.target.blur()} className="form-control text-end" value={selectedProducts[index].unit_discount_percent} onChange={(e) => {
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
                                            <td>
                                                <div className="input-group mb-3">
                                                    <input type="number" id={`${"sales_unit_discount_percent_with_vat_" + index}`}
                                                        disabled={true}
                                                        name={`${"sales_unit_discount_percent_with_vat_" + index}`}
                                                        onWheel={(e) => e.target.blur()} className="form-control text-end"
                                                        value={selectedProducts[index].unit_discount_percent_with_vat} onChange={(e) => {
                                                            if (timerRef.current) clearTimeout(timerRef.current);

                                                            if (parseFloat(e.target.value) === 0) {
                                                                selectedProducts[index].unit_discount_percent = 0.00;
                                                                selectedProducts[index].unit_discount_percent_with_vat = 0.00;
                                                                selectedProducts[index].unit_discount_with_vat = 0.00;
                                                                selectedProducts[index].unit_discount = 0.00;
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
                                                                selectedProducts[index].unit_discount_percent_with_vat = 0.00;
                                                                selectedProducts[index].unit_discount_with_vat = 0.00;
                                                                selectedProducts[index].unit_discount = 0.00;
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
                                                                selectedProducts[index].unit_discount_percent_with_vat = "";
                                                                selectedProducts[index].unit_discount_with_vat = "";
                                                                selectedProducts[index].unit_discount = "";
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

                                                            /*
                                                            if (/^\d*\.?\d{0,2}$/.test(parseFloat(e.target.value)) === false) {
                                                                errors["unit_discount_percent_" + index] = "Max. decimal points allowed is 2";
                                                                setErrors({ ...errors });
                                                            }*/

                                                            selectedProducts[index].unit_discount_percent_with_vat = parseFloat(e.target.value); //input


                                                            //selectedProducts[index].unit_discount_percent_with_vat = parseFloat(trimTo2Decimals(((selectedProducts[index].unit_discount_with_vat / selectedProducts[index].unit_price_with_vat) * 100)))

                                                            setFormData({ ...formData });

                                                            timerRef.current = setTimeout(() => {
                                                                selectedProducts[index].unit_discount_with_vat = parseFloat(trimTo2Decimals(selectedProducts[index].unit_price_with_vat * (selectedProducts[index].unit_discount_percent_with_vat / 100)))
                                                                selectedProducts[index].unit_discount = parseFloat(trimTo2Decimals(selectedProducts[index].unit_discount_with_vat / (1 + (formData.vat_percent / 100))))
                                                                selectedProducts[index].unit_discount_percent = parseFloat(trimTo2Decimals(((selectedProducts[index].unit_discount / selectedProducts[index].unit_price) * 100)))

                                                                reCalculate(index);
                                                            }, 300);
                                                        }} />{""}
                                                </div>
                                                {errors["unit_discount_percent_with_vat_" + index] && (
                                                    <div style={{ color: "red" }}>
                                                        {errors["unit_discount_percent_with_vat_" + index]}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="text-end" >
                                                <Amount amount={trimTo2Decimals((selectedProducts[index].unit_price - selectedProducts[index].unit_discount) * selectedProducts[index].quantity)} />
                                            </td>
                                            <td className="text-end" >
                                                <Amount amount={trimTo2Decimals(((selectedProducts[index].unit_price_with_vat - selectedProducts[index].unit_discount_with_vat) * selectedProducts[index].quantity))} />
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
                                    {/*<tr>
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
                                                    }, 300);
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
                                                    }, 300);
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
                                                    }, 300);
                                                    return;
                                                }

                                                errors["discount_percent"] = "";
                                                errors["discount"] = "";
                                                setErrors({ ...errors });

                                                discountPercent = parseFloat(e.target.value);
                                                setDiscountPercent(discountPercent);
                                                timerRef.current = setTimeout(() => {
                                                    reCalculate();
                                                }, 300);
                                            }} />{"%"}
                                            {errors.discount_percent && (
                                                <div style={{ color: "red" }}>
                                                    {errors.discount_percent}
                                                </div>
                                            )}
                                        </th>
                                        <td className="text-end">
                                            <input type="number" id="sales_discount" disabled={true} name="sales_discount" onWheel={(e) => e.target.blur()} style={{ width: "150px" }} className="text-start" value={discount} onChange={(e) => {
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

                                                    errors["discount"] = "";
                                                    setErrors({ ...errors });
                                                    timerRef.current = setTimeout(() => {
                                                        reCalculate();
                                                    }, 300);
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
                                                    }, 300);
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
                                                    }, 300);

                                                    return;
                                                }

                                                errors["discount"] = "";
                                                errors["discount_percent"] = "";
                                                setErrors({ ...errors });


                                                if (/^\d*\.?\d{0,2}$/.test(parseFloat(e.target.value)) === false) {
                                                    errors["discount"] = "Max. decimal points allowed is 2";
                                                    setErrors({ ...errors });
                                                }

                                                discount = parseFloat(e.target.value);
                                                setDiscount(discount);
                                                //discountPercent = parseFloat(trimTo2Decimals((discount / formData.net_total) * 100))
                                                //setDiscountPercent(discountPercent);

                                                timerRef.current = setTimeout(() => {
                                                    reCalculate();
                                                }, 300);
                                            }} />
                                            {" "}
                                            {errors.discount && (
                                                <div style={{ color: "red" }}>
                                                    {errors.discount}
                                                </div>
                                            )}
                                        </td>
                                    </tr>*/}
                                    <tr>
                                        <th colSpan="8" className="text-end">
                                            Discount(with VAT) <input type="number" id="discount_percent" name="discount_percent" onWheel={(e) => e.target.blur()} disabled={true} style={{ width: "50px" }} className="text-start" value={discountPercentWithVAT} onChange={(e) => {
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

                                                    errors["discount_percent_with_vat"] = "";
                                                    setErrors({ ...errors });
                                                    timerRef.current = setTimeout(() => {
                                                        reCalculate();
                                                    }, 300);
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

                                                    errors["discount_percent"] = "Discount percent should be >= 0";
                                                    setErrors({ ...errors });
                                                    timerRef.current = setTimeout(() => {
                                                        reCalculate();
                                                    }, 300);
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
                                                    }, 300);
                                                    return;
                                                }

                                                errors["discount_percent"] = "";
                                                errors["discount"] = "";
                                                setErrors({ ...errors });

                                                discountPercentWithVAT = parseFloat(e.target.value);
                                                setDiscountPercentWithVAT(discountPercentWithVAT);
                                                timerRef.current = setTimeout(() => {
                                                    reCalculate();
                                                }, 300);
                                            }} />{"%"}
                                            {errors.discount_percent_with_vat && (
                                                <div style={{ color: "red" }}>
                                                    {errors.discount_percent_with_vat}
                                                </div>
                                            )}
                                        </th>
                                        <td className="text-end">
                                            <input type="number" ref={discountRef} id="sales_return_discount_with_vat" name="sales_return_discount_with_vat" onWheel={(e) => e.target.blur()} style={{ width: "150px" }} className="text-start" value={discountWithVAT} onChange={(e) => {
                                                if (timerRef.current) clearTimeout(timerRef.current);
                                                if (parseFloat(e.target.value) === 0) {
                                                    discount = 0;
                                                    discountWithVAT = 0;
                                                    discountPercent = 0
                                                    setDiscount(discount);
                                                    setDiscountWithVAT(discount);
                                                    setDiscountPercent(discount);
                                                    errors["discount"] = "";
                                                    setErrors({ ...errors });
                                                    timerRef.current = setTimeout(() => {
                                                        reCalculate();
                                                    }, 300);
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
                                                    }, 300);
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
                                                    }, 300);

                                                    return;
                                                }

                                                errors["discount"] = "";
                                                errors["discount_percent"] = "";
                                                setErrors({ ...errors });


                                                if (/^\d*\.?\d{0,2}$/.test(parseFloat(e.target.value)) === false) {
                                                    errors["discount"] = "Max. decimal points allowed is 2";
                                                    setErrors({ ...errors });
                                                }

                                                discountWithVAT = parseFloat(e.target.value);
                                                setDiscountWithVAT(discountWithVAT);
                                                //discountPercent = parseFloat(trimTo2Decimals((discount / formData.net_total) * 100))
                                                //setDiscountPercent(discountPercent);

                                                timerRef.current = setTimeout(() => {
                                                    reCalculate();
                                                }, 300);
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
                            <input id="sales_return_cash_discount" name="sales_return_cash_discount"
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
                                                        <select value={formData.payments_input[key].method} disabled={order.payment_status === "not_paid"} className="form-control "
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
                                                            {formData.customer_id && <option value="customer_account">Customer Account</option>}
                                                        </select>
                                                        {errors["payment_method_" + key] && (
                                                            <div style={{ color: "red" }}>
                                                                {errors["payment_method_" + key]}
                                                            </div>
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
