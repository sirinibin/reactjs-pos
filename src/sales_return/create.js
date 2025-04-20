import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { Modal, Button } from "react-bootstrap";
import StoreCreate from "../store/create.js";
import CustomerCreate from "./../customer/create.js";
import ProductCreate from "./../product/create.js";
import UserCreate from "./../user/create.js";
import SignatureCreate from "./../signature/create.js";

import NumberFormat from "react-number-format";
import DatePicker from "react-datepicker";
import { format } from "date-fns";
import { Spinner } from "react-bootstrap";
import SalesReturnView from "./view.js";
import ProductView from "./../product/view.js";
import { trimTo2Decimals } from "../utils/numberUtils";
import SalesReturnPreview from "./preview.js";
import { Dropdown } from 'react-bootstrap';
import SalesHistory from "./../product/sales_history.js";
import SalesReturnHistory from "./../product/sales_return_history.js";
import PurchaseHistory from "./../product/purchase_history.js";
import PurchaseReturnHistory from "./../product/purchase_return_history.js";
import QuotationHistory from "./../product/quotation_history.js";
import DeliveryNoteHistory from "./../product/delivery_note_history.js";
import Products from "./../utils/products.js";

const SalesReturnCreate = forwardRef((props, ref) => {

    useImperativeHandle(ref, () => ({
        open(id, orderId) {
            errors = {};
            setErrors({ ...errors });

            formData = {
                order_id: orderId,
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
                reCalculate();
                getOrder(orderId);
            }
            setShow(true);

        },

    }));



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
                    // date: purchase.date,
                    vat_percent: salesReturn.vat_percent,
                    discount: salesReturn.discount,
                    discount_percent: salesReturn.discount_percent,
                    is_discount_percent: salesReturn.is_discount_percent,
                    payment_status: salesReturn.payment_status,
                    shipping_handling_fees: salesReturn.shipping_handling_fees,
                    remarks: salesReturn.remarks,
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


                if (formData.customer_id) {
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

                console.log("selectedProducts: ", selectedProducts.length);

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

                console.log("Response:");
                console.log(data);

                let order = data.result;

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
                /*
                formData.received_by = order.delivered_by;
                formData.received_by_signature_id = order.delivered_by_signature_id;
                */
                formData.customer_id = order.customer_id;

                // formData.is_discount_percent = order.is_discount_percent;
                formData.is_discount_percent = true;
                formData.discount_percent = order.discount_percent;
                formData.shipping_handling_fees = order.shipping_handling_fees;
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




    function handleCreate(event) {
        let haveErrors = false;

        event.preventDefault();
        console.log("Inside handle Create");
        console.log("selectedProducts:", selectedProducts);
        console.log("formData.order_id:", formData.order_id);

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


            let unitDiscount = 0.00;

            if (selectedProducts[i].unit_discount) {
                unitDiscount = parseFloat(selectedProducts[i].unit_discount)
                if (/^\d*\.?\d{0,2}$/.test(unitDiscount) === false) {
                    errors["unit_discount_" + i] = "Max decimal points allowed is 2";
                    setErrors({ ...errors });
                    haveErrors = true;
                }
            }

            formData.products.push({
                product_id: selectedProducts[i].product_id,
                quantity: parseFloat(selectedProducts[i].quantity),
                unit_price: unitPrice,
                unit: selectedProducts[i].unit,
                selected: selectedProducts[i].selected,
                purchase_unit_price: selectedProducts[i].purchase_unit_price ? parseFloat(selectedProducts[i].purchase_unit_price) : 0,
                unit_discount: unitDiscount,
                unit_discount_percent: selectedProducts[i].unit_discount_percent ? parseFloat(selectedProducts[i].unit_discount_percent) : 0,
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
                    props.showToastMessage("Sales return updated successfully!", "success");
                } else {
                    props.showToastMessage("Sales return created successfully!", "success");
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
                props.showToastMessage("Failed to process sales return!", "danger");
            });
    }


    async function reCalculate(productIndex) {
        if (selectedProducts && selectedProducts[productIndex]) {
            if (selectedProducts[productIndex].is_discount_percent) {
                findProductUnitDiscount(productIndex);
            } else {
                findProductUnitDiscountPercent(productIndex);
            }
        }


        formData.products = [];
        for (var i = 0; i < selectedProducts?.length; i++) {
            let unitPrice = parseFloat(selectedProducts[i].unit_price);

            if (unitPrice && /^\d*\.?\d{0,2}$/.test(unitPrice) === false) {
                errors["unit_price_" + i] = "Max decimal points allowed is 2";
                setErrors({ ...errors });
                return
            }


            let unitDiscount = 0.00;

            if (selectedProducts[i].unit_discount) {
                unitDiscount = parseFloat(selectedProducts[i].unit_discount)
                if (/^\d*\.?\d{0,2}$/.test(unitDiscount) === false) {
                    errors["unit_discount_" + i] = "Max decimal points allowed is 2";
                    setErrors({ ...errors });
                    return
                }
            }

            formData.products.push({
                product_id: selectedProducts[i].product_id,
                quantity: parseFloat(selectedProducts[i].quantity),
                unit_price: unitPrice,
                unit: selectedProducts[i].unit,
                selected: selectedProducts[i].selected,
                purchase_unit_price: selectedProducts[i].purchase_unit_price ? parseFloat(selectedProducts[i].purchase_unit_price) : 0,
                unit_discount: unitDiscount,
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
            "/v1/sales-return/calculate-net-total",
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

    function findProductUnitDiscountPercent(productIndex) {
        let unitPrice = parseFloat(selectedProducts[productIndex].unit_price);
        if (selectedProducts[productIndex].unit_discount
            && parseFloat(selectedProducts[productIndex].unit_discount) >= 0
            && unitPrice > 0) {

            let unitDiscountPercent = parseFloat(parseFloat(selectedProducts[productIndex].unit_discount / unitPrice) * 100);
            selectedProducts[productIndex].unit_discount_percent = unitDiscountPercent;
            setSelectedProducts([...selectedProducts]);
        }
    }

    function findProductUnitDiscount(productIndex) {
        let unitPrice = parseFloat(selectedProducts[productIndex].unit_price);

        if (selectedProducts[productIndex].unit_discount_percent
            && selectedProducts[productIndex].unit_discount_percent >= 0
            && unitPrice > 0) {
            selectedProducts[productIndex].unit_discount = parseFloat(unitPrice * parseFloat(selectedProducts[productIndex].unit_discount_percent / 100));
            setSelectedProducts([...selectedProducts]);
        }
    }



    const StoreCreateFormRef = useRef();

    const CustomerCreateFormRef = useRef();
    const ProductCreateFormRef = useRef();



    const UserCreateFormRef = useRef();


    const SignatureCreateFormRef = useRef();



    const ProductDetailsViewRef = useRef();
    function openProductDetailsView(id) {
        ProductDetailsViewRef.current.open(id);
    }


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
        PreviewRef.current.open(model);
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





    return (
        <>
            <Products ref={ProductsRef} showToastMessage={props.showToastMessage} />
            <SalesHistory ref={SalesHistoryRef} showToastMessage={props.showToastMessage} />
            <SalesReturnHistory ref={SalesReturnHistoryRef} showToastMessage={props.showToastMessage} />

            <PurchaseHistory ref={PurchaseHistoryRef} showToastMessage={props.showToastMessage} />
            <PurchaseReturnHistory ref={PurchaseReturnHistoryRef} showToastMessage={props.showToastMessage} />
            <QuotationHistory ref={QuotationHistoryRef} showToastMessage={props.showToastMessage} />
            <DeliveryNoteHistory ref={DeliveryNoteHistoryRef} showToastMessage={props.showToastMessage} />

            <SalesReturnPreview ref={PreviewRef} />
            <SalesReturnView ref={DetailsViewRef} />
            <ProductView ref={ProductDetailsViewRef} />
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
                    {errors.reporting_to_zatca && (<div style={{ marginBottom: "30px" }}>
                        <input type="checkbox" checked={formData.skip_zatca_reporting} onChange={(e) => {
                            formData.skip_zatca_reporting = !formData.skip_zatca_reporting;
                            setFormData({ ...formData });
                        }} /> Report Later to Zatca
                    </div>)}
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
                                        <th style={{ width: "3%" }}>Select</th>
                                        <th style={{ width: "5%" }}>SI No.</th>
                                        <th style={{ width: "10%" }}>Part No.</th>
                                        <th style={{ width: "22%" }} className="text-start">Name</th>
                                        <th style={{ width: "6%" }} className="text-start">Info</th>
                                        <th style={{ width: "10%" }} >Purchase Unit Price</th>
                                        <th style={{ width: "10%" }}>Qty</th>
                                        <th style={{ width: "10%" }}>Unit Price</th>
                                        <th style={{ width: "10%" }}>Unit Disc.</th>
                                        <th style={{ width: "10%" }}>Unit Disc. %</th>
                                        <th style={{ width: "14%" }} >Price</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedProducts.map((product, index) => (
                                        <tr key={index} className="text-center">
                                            <td>
                                                <input type="checkbox" checked={selectedProducts[index].selected} onChange={(e) => {
                                                    console.log("e.target.value:", e.target.value)
                                                    selectedProducts[index].selected = !selectedProducts[index].selected;
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
                                                className="text-start"
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
                                            <td>

                                                <div className="input-group mb-3">
                                                    <input type="number" onWheel={(e) => e.target.blur()} value={product.purchase_unit_price} disabled={!selectedProducts[index].can_edit} className="form-control text-end"

                                                        placeholder="Purchase Unit Price" onChange={(e) => {
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
                                                    <input type="number" onWheel={(e) => e.target.blur()} value={(product.quantity)} className="form-control"

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
                                            <td style={{ width: "180px" }}>
                                                <div class="input-group mb-3">
                                                    <input type="number" onWheel={(e) => e.target.blur()} value={product.unit_price} className="form-control"

                                                        placeholder="Unit Price" onChange={(e) => {
                                                            errors["unit_price_" + index] = "";
                                                            setErrors({ ...errors });
                                                            if (!e.target.value) {
                                                                errors["unit_price_" + index] = "Invalid Unit Price";
                                                                selectedProducts[index].unit_price = e.target.value;
                                                                setSelectedProducts([...selectedProducts]);
                                                                setErrors({ ...errors });
                                                                console.log("errors:", errors);
                                                                return;
                                                            }

                                                            if (e.target.value === 0) {
                                                                errors["unit_price_" + index] = "Invalid Unit Price should be > 0";
                                                                selectedProducts[index].unit_price = parseFloat(e.target.value);
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
                                                            console.log("selectedProducts[index].unit_price:", selectedProducts[index].unit_price);
                                                            setSelectedProducts([...selectedProducts]);
                                                            reCalculate();

                                                        }} />

                                                </div>
                                                {errors["unit_price_" + index] && (
                                                    <div style={{ color: "red" }}>
                                                        <i className="bi bi-x-lg"> </i>
                                                        {errors["unit_price_" + index]}
                                                    </div>
                                                )}

                                            </td>
                                            <td>
                                                <div className="input-group mb-3">
                                                    <input type="number" onWheel={(e) => e.target.blur()} className="form-control text-end" value={selectedProducts[index].unit_discount} onChange={(e) => {
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

                                                        if (/^\d*\.?\d{0,2}$/.test(parseFloat(e.target.value)) === false) {
                                                            errors["unit_discount_" + index] = "Max. decimal points allowed is 2";
                                                            setErrors({ ...errors });
                                                        }

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
                                                    <input type="number" onWheel={(e) => e.target.blur()} className="form-control text-end" value={selectedProducts[index].unit_discount_percent} onChange={(e) => {
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
                                                            errors["unit_discount_percent_" + index] = "Discount percent should be >= 0";
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
                                            <td className="text-end">
                                                <NumberFormat
                                                    value={trimTo2Decimals((product.unit_price - product.unit_discount) * product.quantity)}
                                                    displayType={"text"}
                                                    thousandSeparator={true}
                                                    suffix={" "}
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
                                        <th colSpan="11" className="text-end">Total</th>
                                        <td className="text-end" style={{ width: "180px" }}>
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
                                        <th colSpan="11" className="text-end">
                                            Shipping & Handling Fees
                                        </th>
                                        <td className="text-end">
                                            <input type="number" onWheel={(e) => e.target.blur()} style={{ width: "150px" }} className="text-start" value={formData.shipping_handling_fees} onChange={(e) => {

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

                                                if (/^\d*\.?\d{0,2}$/.test(parseFloat(e.target.value)) === false) {
                                                    errors["shipping_handling_fees"] = "Max. decimal points allowed is 2";
                                                    setErrors({ ...errors });
                                                }

                                                formData.shipping_handling_fees = parseFloat(e.target.value);
                                                setFormData({ ...formData });
                                                reCalculate();
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
                                        <th colSpan="11" className="text-end">
                                            Discount  <input type="number" onWheel={(e) => e.target.blur()} style={{ width: "50px" }} className="text-start" value={formData.discount_percent} onChange={(e) => {
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

                                                if (/^\d*\.?\d{0,2}$/.test(parseFloat(e.target.value)) === false) {
                                                    errors["discount"] = "Max. decimal points allowed is 2";
                                                    setErrors({ ...errors });
                                                }

                                                formData.discount_percent = parseFloat(e.target.value);
                                                setFormData({ ...formData });
                                                reCalculate();
                                            }} />{"%"}
                                            {errors.discount_percent && (
                                                <div style={{ color: "red" }}>
                                                    {errors.discount_percent}
                                                </div>
                                            )}
                                            {/*
                                            Discount(  {formData.discount_percent + "%"})
                                                */}
                                        </th>
                                        <td className="text-end">
                                            <input type="number" onWheel={(e) => e.target.blur()} style={{ width: "150px" }} className="text-start" value={formData.discount} onChange={(e) => {
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
                                        <th colSpan="11" className="text-end"> VAT: {trimTo2Decimals(formData.vat_percent) + "%"}</th>
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
                                        <th colSpan="11" className="text-end">Net Total</th>
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
                                                            <option value="debit_card">Debit Card</option>
                                                            <option value="credit_card">Credit Card</option>
                                                            <option value="bank_card">Bank Card</option>
                                                            <option value="bank_transfer">Bank Transfer</option>
                                                            <option value="bank_cheque">Bank Cheque</option>
                                                            {formData.customer_id && <option value="customer_account">Customer Account</option>}
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
                                            <td><b style={{ marginLeft: "14px" }}>{trimTo2Decimals(totalPaymentAmount)}</b>
                                                {errors["total_payment"] && (
                                                    <div style={{ color: "red" }}>
                                                        {errors["total_payment"]}
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                <b style={{ marginLeft: "12px", alignSelf: "end" }}>Balance: {trimTo2Decimals(balanceAmount)}</b>
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

            </Modal>


        </>
    );
});

export default SalesReturnCreate;
