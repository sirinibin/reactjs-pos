import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { Modal, Button } from "react-bootstrap";
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


const PurchaseReturnedCreate = forwardRef((props, ref) => {

    useImperativeHandle(ref, () => ({
        open(id, purchaseId) {
            errors = {};
            setErrors({ ...errors });
            selectedProducts = [];
            setSelectedProducts([]);

            selectedPurchaseReturnedByUsers = [];
            setSelectedPurchaseReturnedByUsers([]);





            formData = {
                vat_percent: 15.0,
                discount: 0.0,
                discount_percent: 0.0,
                is_discount_percent: false,
                shipping_handling_fees: 0.00,
                date_str: new Date(),
                signature_date_str: format(new Date(), "MMM dd yyyy"),
                payment_status: "paid",
                payment_method: "",
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
            setShow(true);
        },

    }));


    useEffect(() => {
        const listener = event => {
            if (event.code === "Enter" || event.code === "NumpadEnter") {
                console.log("Enter key was pressed. Run your function-purchase return.");
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
                // formData = purchaseReturn;

                formData = {
                    id: purchaseReturn.id,
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

                console.log("formData1.status:", formData.status);


                console.log("purchaseReturn.products:", purchaseReturn.products);

                let selectedProductsTemp = purchaseReturn.products;

                selectedProducts = [];
                for (let i = 0; i < selectedProductsTemp.length; i++) {
                    /*
                    if (selectedProductsTemp[i].quantity > 0) {
                        selectedProductsTemp[i].selected = true;
                    } else {
                        selectedProductsTemp[i].selected = false;
                    }
                    */
                    selectedProducts.push(selectedProductsTemp[i]);

                    selectedProductsTemp[i].purchase_unit_price = selectedProductsTemp[i].purchasereturn_unit_price;
                }


                setSelectedProducts([...selectedProducts]);

                setFormData({ ...formData });
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
                    // date_str: format(new Date(), "MMM dd yyyy"),
                    date_str: new Date(),
                    signature_date_str: format(new Date(), "MMM dd yyyy"),
                    purchase_id: purchase.id,
                    purchase_code: purchase.code,
                    remarks: purchase.remarks,
                    address: purchase.address,
                    phone: purchase.phone,
                    vat_no: purchase.vat_no,
                    //   vendor_invoice_no: purchase.vendor_invoice_no,
                    store_id: purchase.store_id,
                    vendor_id: purchase.vendor_id,
                    vat_percent: purchase.vat_percent,
                    status: purchase.status,
                    purchase_returned_by: purchase.order_placed_by,
                    purchase_returned_by_signature_id: purchase.order_placed_by_signature_id,
                    //  is_discount_percent: purchase.is_discount_percent,
                    discount_percent: purchase.discount_percent,
                    payment_status: "paid",
                    payment_method: "",
                    shipping_handling_fees: purchase.shipping_handling_fees,
                };

                //formData.discount = (purchase.discount - purchase.return_discount);
                formData.discount = 0;

                formData.is_discount_percent = true;


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


                setSelectedProducts([...selectedProducts]);

                setFormData({ ...formData });
                reCalculate();
                setFormData({ ...formData });


            })
            .catch(error => {
                setProcessing(false);
                setErrors(error);
            });
    }


    function handleCreate(event) {
        console.log("formData:", formData);
        console.log("formData.payment_status:" + formData.payment_status);
        event.preventDefault();
        console.log("Inside handle Create");
        console.log("selectedProducts:", selectedProducts);
        let haveErrors = false;


        formData.products = [];
        for (var i = 0; i < selectedProducts.length; i++) {
            /*
            if (!selectedProducts[i].selected) {
                continue;
                // selectedProducts[i].quantity = 0;
            }*/

            formData.products.push({
                product_id: selectedProducts[i].product_id,
                name: selectedProducts[i].name,
                quantity: parseFloat(selectedProducts[i].quantity),
                unit: selectedProducts[i].unit,
                purchasereturn_unit_price: parseFloat(selectedProducts[i].purchase_unit_price),
                selected: selectedProducts[i].selected,
                unit_discount: selectedProducts[i].unit_discount ? parseFloat(selectedProducts[i].unit_discount) : 0,
                unit_discount_percent: selectedProducts[i].unit_discount_percent ? parseFloat(selectedProducts[i].unit_discount_percent) : 0,
            });
        }

        if (!formData.cash_discount) {
            formData.cash_discount = 0.00;
        }


        if (!formData.discount && formData.discount !== 0) {
            errors["discount"] = "Invalid discount";
            setErrors({ ...errors });
            haveErrors = true;
        }

        if (!formData.shipping_handling_fees && formData.shipping_handling_fees !== 0) {
            errors["shipping_handling_fees"] = "Invalid shipping / handling fees";
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

        errors["payment_method"] = "";
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

                setErrors({});
                setProcessing(false);

                console.log("Response:");
                console.log(data);
                if (formData.id) {
                    props.showToastMessage("Purchase return updated successfully!", "success");
                } else {
                    props.showToastMessage("Purchase return created successfully!", "success");
                }

                if (props.refreshList) {
                    props.refreshList();
                }
                handleClose();

                if (props.refreshPurchaseList) {
                    props.refreshPurchaseList();
                }

                openDetailsView(data.result.id);
            })
            .catch((error) => {
                setProcessing(false);
                console.log("Inside catch");
                console.log(error);
                setErrors({ ...error });
                console.error("There was an error!", error);
                props.showToastMessage("Failed to process purchase return!", "danger");
            });
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
            /*
            if (!selectedProducts[i].selected) {
                continue;
                // selectedProducts[i].quantity = 0;
            }*/

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

    const ProductDetailsViewRef = useRef();
    function openProductDetailsView(id) {
        ProductDetailsViewRef.current.open(id);
    }

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
        // balanceAmount = (netTotal - formData.cash_discount) - totalPayment;
        if (!formData.cash_discount) {
            formData.cash_discount = 0.00;
        }

        balanceAmount = (parseFloat(formData.net_total) - parseFloat(parseFloat(formData.cash_discount)?.toFixed(2))) - parseFloat(totalPayment.toFixed(2));
        balanceAmount = parseFloat(balanceAmount.toFixed(2));
        setBalanceAmount(balanceAmount);

        if (balanceAmount === parseFloat((parseFloat(formData.net_total) - parseFloat(parseFloat(formData.cash_discount)?.toFixed(2))).toFixed(2))) {
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

        errors["cash_discount"] = "";
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



        if (formData.net_total && formData.cash_discount > 0 && formData.cash_discount >= formData.net_total) {
            errors["cash_discount"] = "Cash discount should not be >= " + formData.net_total.toString();
            setErrors({ ...errors });
            haveErrors = true
            return false;
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
            /*
            if ((formData.payments_input[key].amount || formData.payments_input[key].amount === 0) && !formData.payments_input[key].deleted) {
                let maxAllowedAmount = (netTotal - formData.cash_discount) - (totalPayment - formData.payments_input[key].amount);

                if (maxAllowedAmount < 0) {
                    maxAllowedAmount = 0;
                }

                
                if (maxAllowedAmount === 0) {
                    errors["payment_amount_" + key] = "Total amount should not exceed " + (netTotal - formData.cash_discount).toFixed(2).toString() + ", Please delete this payment";
                    setErrors({ ...errors });
                    haveErrors = true;
                } else if (formData.payments_input[key].amount > parseFloat(maxAllowedAmount.toFixed(2))) {
                    errors["payment_amount_" + key] = "Amount should not be greater than " + maxAllowedAmount.toFixed(2);
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
        PreviewRef.current.open(model, undefined, "purchase_return");
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

        PreviewRef.current.open(model, "whatsapp", "purchase_return");
    }

    return (
        <>
            <Products ref={ProductsRef} showToastMessage={props.showToastMessage} />
            <SalesHistory ref={SalesHistoryRef} showToastMessage={props.showToastMessage} />
            <SalesReturnHistory ref={SalesReturnHistoryRef} showToastMessage={props.showToastMessage} />
            <PurchaseHistory ref={PurchaseHistoryRef} showToastMessage={props.showToastMessage} />
            <PurchaseReturnHistory ref={PurchaseReturnHistoryRef} showToastMessage={props.showToastMessage} />
            <QuotationHistory ref={QuotationHistoryRef} showToastMessage={props.showToastMessage} />
            <DeliveryNoteHistory ref={DeliveryNoteHistoryRef} showToastMessage={props.showToastMessage} />

            <Preview ref={PreviewRef} />
            <ProductView ref={ProductDetailsViewRef} openUpdateForm={openProductUpdateForm} openCreateForm={openProductCreateForm} />
            <ProductCreate ref={ProductCreateFormRef} showToastMessage={props.showToastMessage} openDetailsView={openProductDetailsView} />



            <PurchaseReturnedView ref={DetailsViewRef} />
            <StoreCreate ref={StoreCreateFormRef} showToastMessage={props.showToastMessage} />
            <UserCreate ref={UserCreateFormRef} showToastMessage={props.showToastMessage} />
            <SignatureCreate ref={SignatureCreateFormRef} showToastMessage={props.showToastMessage} />
            <VendorCreate ref={VendorCreateFormRef} showToastMessage={props.showToastMessage} />
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
                            <i className="bi bi-printer"></i> Print Full Invoice
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
                    {selectedProducts && selectedProducts.length === 0 && "Already Returned All purchased products"}


                    {selectedProducts && selectedProducts.length > 0 && <form className="row g-3 needs-validation" onSubmit={handleCreate}>

                        <div className="col-md-3">
                            <label className="form-label">Vendor Invoice No. (Optional)</label>

                            <div className="input-group mb-3">
                                <input
                                    id="purchase_return_vendor_invoice_no" name="purchase_return_vendor_invoice_no"
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
                                {formData.date_str && !errors.date_str && (
                                    <div style={{ color: "green" }}>
                                        <i className="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>
                        </div>

                        {selectedProducts?.length > 0 && <div className="col-md-2">
                            <label className="form-label">Phone ( 05.. / +966..)</label>

                            <div className="input-group mb-3">
                                <input
                                    id="purchase_return_phone"
                                    name="purchase_return_phone"
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

                        <div className="col-md-1">
                            <Button className={`btn ${!formData.vendor_name && !formData.phone ? "btn-secondary" : "btn-success"} btn-sm`} disabled={!formData.vendor_name && !formData.phone} style={{ marginTop: "30px" }} onClick={sendWhatsAppMessage}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="white" viewBox="0 0 16 16">
                                    <path d="M13.601 2.326A7.875 7.875 0 0 0 8.036 0C3.596 0 0 3.597 0 8.036c0 1.417.37 2.805 1.07 4.03L0 16l3.993-1.05a7.968 7.968 0 0 0 4.043 1.085h.003c4.44 0 8.036-3.596 8.036-8.036 0-2.147-.836-4.166-2.37-5.673ZM8.036 14.6a6.584 6.584 0 0 1-3.35-.92l-.24-.142-2.37.622.63-2.31-.155-.238a6.587 6.587 0 0 1-1.018-3.513c0-3.637 2.96-6.6 6.6-6.6 1.764 0 3.42.69 4.67 1.94a6.56 6.56 0 0 1 1.93 4.668c0 3.637-2.96 6.6-6.6 6.6Zm3.61-4.885c-.198-.1-1.17-.578-1.352-.644-.18-.066-.312-.1-.444.1-.13.197-.51.644-.626.775-.115.13-.23.15-.428.05-.198-.1-.837-.308-1.594-.983-.59-.525-.99-1.174-1.11-1.372-.116-.198-.012-.305.088-.403.09-.09.198-.23.298-.345.1-.115.132-.197.2-.33.065-.13.032-.247-.017-.345-.05-.1-.444-1.07-.61-1.46-.16-.384-.323-.332-.444-.338l-.378-.007c-.13 0-.344.048-.525.23s-.688.672-.688 1.64c0 .967.704 1.9.802 2.03.1.13 1.386 2.116 3.365 2.963.47.203.837.324 1.122.414.472.15.902.13 1.24.08.378-.057 1.17-.48 1.336-.942.165-.462.165-.858.116-.943-.048-.084-.18-.132-.378-.23Z" />
                                </svg>
                            </Button>
                        </div>



                        {selectedProducts?.length > 0 && <div className="col-md-2">
                            <label className="form-label">VAT NO.(15 digits)</label>

                            <div className="input-group mb-3">
                                <input
                                    id="purchase_return_vat_no"
                                    name="purchase_return_vat_no"
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


                        <h2>Select Products</h2>
                        {errors["product_id"] && (
                            <div style={{ color: "red" }}>
                                <i className="bi bi-x-lg"> </i>
                                {errors["product_id"]}
                            </div>
                        )}
                        <div className="table-responsive" style={{ overflowX: "auto", overflowY: "scroll" }}>
                            <table className="table table-striped table-sm table-bordered">
                                <thead>
                                    <tr className="text-center">
                                        <th>Select</th>
                                        <th>SI No.</th>
                                        <th>Part No.</th>
                                        <th>Name</th>
                                        <th>Info</th>
                                        <th>Qty</th>
                                        <th>Unit Price</th>
                                        <th style={{ width: "10%" }}>Unit Disc.</th>
                                        <th style={{ width: "10%" }}>Disc. %</th>
                                        <th>Price</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedProducts.map((product, index) => (
                                        <tr className="text-center">
                                            <td>
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
                                            </td>
                                            <td>{index + 1}</td>
                                            <td>{product.part_number}</td>
                                            <td style={{
                                                textDecoration: "underline",
                                                color: "blue",
                                                cursor: "pointer",
                                            }}
                                                onClick={() => {
                                                    openProductDetailsView(product.product_id);
                                                }}>{product.name}
                                            </td>
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
                                                    <input
                                                        id={`${"purchase_return_product_quantity" + index}`} name={`${"purchase_return_product_quantity" + index}`}
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

                                                            if (parseFloat(e.target.value) === 0) {
                                                                errors["quantity_" + index] = "Quantity should be >0";
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

                                                    <input
                                                        id={`${"purchase_return_product_unit_price" + index}`} name={`${"purchase_return_product_unit_price" + index}`}
                                                        type="number" value={product.purchase_unit_price} className="form-control"

                                                        placeholder="Purchase Return Unit Price" onChange={(e) => {
                                                            errors["purchasereturned_unit_price_" + index] = "";
                                                            setErrors({ ...errors });

                                                            if (!e.target.value) {
                                                                errors["purchasereturned_unit_price_" + index] = "Invalid Purchase Return Unit Price";
                                                                selectedProducts[index].purchase_unit_price = parseFloat(e.target.value);
                                                                setSelectedProducts([...selectedProducts]);
                                                                setErrors({ ...errors });
                                                                return;
                                                            }

                                                            if (e.target.value === 0) {
                                                                errors["purchasereturned_unit_price_" + index] = "Purchase Return Unit Price should be >0";
                                                                selectedProducts[index].purchase_unit_price = parseFloat(e.target.value);
                                                                setSelectedProducts([...selectedProducts]);
                                                                setErrors({ ...errors });
                                                                return;
                                                            }

                                                            selectedProducts[index].purchase_unit_price = parseFloat(e.target.value);
                                                            console.log("selectedProducts[index].purchase_unit_price:", selectedProducts[index].purchase_unit_price);
                                                            setSelectedProducts([...selectedProducts]);
                                                            reCalculate();

                                                        }} />

                                                </div>
                                                {errors["purchasereturned_unit_price_" + index] && (
                                                    <div style={{ color: "red" }}>
                                                        <i className="bi bi-x-lg"> </i>
                                                        {errors["purchasereturned_unit_price_" + index]}
                                                    </div>
                                                )}

                                            </td>
                                            <td>
                                                <div className="input-group mb-3">
                                                    <input
                                                        id={`${"purchase_return_product_unit_discount" + index}`} name={`${"purchase_return_product_unit_discount" + index}`}
                                                        type="number" className="form-control text-end" value={selectedProducts[index].unit_discount} onChange={(e) => {
                                                            selectedProducts[index].is_discount_percent = false;
                                                            if (parseFloat(e.target.value) === 0) {
                                                                selectedProducts[index].unit_discount = parseFloat(e.target.value);
                                                                setFormData({ ...formData });
                                                                errors["discount_" + index] = "";
                                                                setErrors({ ...errors });
                                                                reCalculate(index);
                                                                return;
                                                            }

                                                            if (parseFloat(e.target.value) < 0) {
                                                                selectedProducts[index].unit_discount = parseFloat(e.target.value);
                                                                selectedProducts[index].unit_discount_percent = 0.00;
                                                                setFormData({ ...formData });
                                                                errors["discount_" + index] = "Discount should be >= 0";
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

                                                            errors["discount_" + index] = "";
                                                            errors["discount_percent_" + index] = "";
                                                            setErrors({ ...errors });

                                                            selectedProducts[index].unit_discount = parseFloat(e.target.value);
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
                                                    <input
                                                        id={`${"purchase_return_product_unit_discount_percent" + index}`} name={`${"purchase_return_product_unit_discount_percent" + index}`}

                                                        type="number" className="form-control text-end" value={selectedProducts[index].unit_discount_percent} onChange={(e) => {
                                                            selectedProducts[index].is_discount_percent = true;
                                                            if (parseFloat(e.target.value) === 0) {
                                                                selectedProducts[index].unit_discount_percent = parseFloat(e.target.value);
                                                                setFormData({ ...formData });
                                                                errors["discount_percent_" + index] = "";
                                                                setErrors({ ...errors });
                                                                reCalculate(index);
                                                                return;
                                                            }

                                                            if (parseFloat(e.target.value) < 0) {
                                                                selectedProducts[index].unit_discount_percent = parseFloat(e.target.value);
                                                                selectedProducts[index].unit_discount = 0.00;
                                                                setFormData({ ...formData });
                                                                errors["discount_percent_" + index] = "Discount percent should be >= 0";
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

                                                            errors["discount_percent_" + index] = "";
                                                            errors["discount_" + index] = "";
                                                            setErrors({ ...errors });

                                                            selectedProducts[index].unit_discount_percent = parseFloat(e.target.value);
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
                                            <td className="text-end">
                                                <NumberFormat
                                                    value={((product.purchase_unit_price - product.unit_discount) * product.quantity)?.toFixed(2)}
                                                    displayType={"text"}
                                                    thousandSeparator={true}
                                                    suffix={""}
                                                    renderText={(value, props) => value}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="table-responsive" style={{ overflowX: "auto" }}>
                            <table className="table table-striped table-sm table-bordered">
                                <tbody>
                                    <tr>
                                        <th colSpan="8" className="text-end">Total</th>
                                        <td className="text-end" style={{ width: "180px" }}>
                                            <NumberFormat
                                                value={formData.total}
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
                                                id="purchase_return_shipping_fees" name="purchase_return_shipping_fees"
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
                                                id="purchase_return_discount_percent" name="purchase_return_discount_percent"
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
                                                id="purchase_return_discount" name="purchase_return_discount"
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
                                            {" "}
                                            {errors.discount && (
                                                <div style={{ color: "red" }}>
                                                    {errors.discount}
                                                </div>
                                            )}

                                            {/*
                                            <NumberFormat
                                                value={formData.discount}
                                                displayType={"text"}
                                                thousandSeparator={true}
                                                suffix={" "}
                                                renderText={(value, props) => value}
                                            />
                                            */}
                                        </td>
                                    </tr>
                                    <tr>
                                        <th colSpan="8" className="text-end">VAT: {formData.vat_percent + "%"}</th>
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
                                                value={formData.net_total}
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
                            <input
                                id="purchase_return_cash_discount" name="purchase_return_cash_discount"
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
                            <label className="form-label">Payments received</label>

                            <div class="table-responsive" style={{ maxWidth: "900px" }}>
                                <Button variant="secondary" style={{ alignContent: "right" }} onClick={addNewPayment}>
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
                                                        <input
                                                            id={`${"purchase_return_payment_amount" + key}`} name={`${"purchase_return_payment_amount" + key}`}
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

                                        : formData.id ? "Update" : "Create"
                                    }
                                </Button>}
                        </Modal.Footer>
                    </form>}
                </Modal.Body>

            </Modal>


        </>
    );
});

export default PurchaseReturnedCreate;
