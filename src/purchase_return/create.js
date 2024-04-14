import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import PurchaseReturnedPreview from "./preview.js";
import { Modal, Button, Form } from "react-bootstrap";
import StoreCreate from "../store/create.js";
import VendorCreate from "../vendor/create.js";
import ProductCreate from "../product/create.js";
import UserCreate from "../user/create.js";
import SignatureCreate from "../signature/create.js";
import Cookies from "universal-cookie";
import { Typeahead } from "react-bootstrap-typeahead";
import NumberFormat from "react-number-format";
import DatePicker from "react-datepicker";
import { format } from "date-fns";
import { Spinner } from "react-bootstrap";
import PurchaseReturnedView from "./view.js";
import ProductView from "../product/view.js";
import PurchaseView from "./../purchase/view.js";


const PurchaseReturnedCreate = forwardRef((props, ref) => {

    useImperativeHandle(ref, () => ({
        open(id, purchaseId) {
            errors = {};
            setErrors({ ...errors });
            selectedProducts = [];
            setSelectedProducts([]);

            selectedPurchaseReturnedByUsers = [];
            setSelectedPurchaseReturnedByUsers([]);

            selectedPurchaseReturnedBySignatures = [];
            setSelectedPurchaseReturnedBySignatures([]);


            formData = {
                vat_percent: 15.0,
                discount: 0.0,
                discountValue: 0.0,
                discount_percent: 0.0,
                is_discount_percent: false,
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

            if (cookies.get("user_id")) {
                selectedPurchaseReturnedByUsers = [{
                    id: cookies.get("user_id"),
                    name: cookies.get("user_name"),
                }];
                formData.purchase_returned_by = cookies.get("user_id");
                setFormData({ ...formData });
                setSelectedPurchaseReturnedByUsers([...selectedPurchaseReturnedByUsers]);
            }

            setFormData({ ...formData });


            if (id) {
                getPurchaseReturn(id);
            }

            if (purchaseId) {
                reCalculate();
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

    const selectedDate = new Date();

    //const history = useHistory();
    let [errors, setErrors] = useState({});
    const [isProcessing, setProcessing] = useState(false);
    const cookies = new Cookies();

    //fields
    let [formData, setFormData] = useState({
        vat_percent: 10.0,
        discount: 0.0,
        discountValue: 0.0,
        discount_percent: 0.0,
        is_discount_percent: false,
        //   date_str: format(new Date(), "MMM dd yyyy"),
        date_str: new Date(),
        signature_date_str: format(new Date(), "MMM dd yyyy"),
        payment_status: "paid",
        payment_method: "",
    });


    let [selectedProducts, setSelectedProducts] = useState([]);

    //Purchase Returned By Auto Suggestion
    const [purchaseReturnedByUserOptions, setPurchaseReturnedByUserOptions] = useState([]);
    let [selectedPurchaseReturnedByUsers, setSelectedPurchaseReturnedByUsers] = useState([]);
    const [isPurchaseReturnedByUsersLoading, setIsPurchaseReturnedByUsersLoading] = useState(false);

    //Purchase Returned By Signature Auto Suggestion
    const [purchaseReturnedBySignatureOptions, setPurchaseReturnedBySignatureOptions] =
        useState([]);
    let [selectedPurchaseReturnedBySignatures, setSelectedPurchaseReturnedBySignatures] =
        useState([]);
    const [isPurchaseReturnedBySignaturesLoading, setIsPurchaseReturnedBySignaturesLoading] =
        useState(false);

    const [show, setShow] = useState(false);

    function handleClose() {
        setShow(false);
    }

    useEffect(() => {
        let at = cookies.get("access_token");
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
                'Authorization': cookies.get('access_token'),
            },
        };

        fetch('/v1/purchase-return/' + id, requestOptions)
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


    function getPurchase(id) {
        console.log("inside get Purchase");
        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': cookies.get('access_token'),
            },
        };

        fetch('/v1/purchase/' + id, requestOptions)
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
                    //   vendor_invoice_no: purchase.vendor_invoice_no,
                    store_id: purchase.store_id,
                    vendor_id: purchase.vendor_id,
                    vat_percent: purchase.vat_percent,
                    status: purchase.status,
                    purchase_returned_by: purchase.order_placed_by,
                    purchase_returned_by_signature_id: purchase.order_placed_by_signature_id,
                    is_discount_percent: purchase.is_discount_percent,
                    discount_percent: purchase.discount_percent,
                    payment_status: "paid",
                    payment_method: "",
                };

                //formData.discount = (purchase.discount - purchase.return_discount);
                formData.discount = 0;

                if (formData.is_discount_percent) {
                    formData.discountValue = formData.discount_percent;
                } else {
                    formData.discountValue = formData.discount;
                }

                formData.discountValue = 0;

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

    function ObjectToSearchQueryParams(object) {
        return Object.keys(object)
            .map(function (key) {
                return `search[${key}]=${object[key]}`;
            })
            .join("&");
    }

    async function suggestUsers(searchTerm) {
        console.log("Inside handle suggestUsers");
        setPurchaseReturnedByUserOptions([]);

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
                Authorization: cookies.get("access_token"),
            },
        };

        let Select = "select=id,name";
        setIsPurchaseReturnedByUsersLoading(true);
        let result = await fetch(
            "/v1/user?" + Select + queryString,
            requestOptions
        );
        let data = await result.json();

        setPurchaseReturnedByUserOptions(data.result);
        setIsPurchaseReturnedByUsersLoading(false);
    }

    async function suggestSignatures(searchTerm) {
        console.log("Inside handle suggestSignatures");
        setPurchaseReturnedBySignatureOptions([]);

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
                Authorization: cookies.get("access_token"),
            },
        };

        let Select = "select=id,name";
        setIsPurchaseReturnedBySignaturesLoading(true);
        let result = await fetch(
            "/v1/signature?" + Select + queryString,
            requestOptions
        );
        let data = await result.json();

        setPurchaseReturnedBySignatureOptions(data.result);
        setIsPurchaseReturnedBySignaturesLoading(false);
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
                quantity: parseFloat(selectedProducts[i].quantity),
                unit: selectedProducts[i].unit,
                purchasereturn_unit_price: parseFloat(selectedProducts[i].purchase_unit_price),
                selected: selectedProducts[i].selected,
            });
        }

        if (!formData.cash_discount) {
            formData.cash_discount = 0.00;
        }

        formData.discount = parseFloat(formData.discount);
        formData.discount_percent = parseFloat(formData.discount_percent);
        formData.net_total = parseFloat(netTotal);

        formData.vat_percent = parseFloat(formData.vat_percent);
        console.log("formData.discount:", formData.discount);


        if (!formData.discount && formData.discount !== 0) {
            errors["discount"] = "Invalid discount";
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
                Authorization: cookies.get("access_token"),
            },
            body: JSON.stringify(formData),
        };

        setProcessing(true);
        fetch(endPoint, requestOptions)
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
                props.showToastMessage("Purchase Return Created Successfully!", "success");
                if (props.refreshList) {
                    props.refreshList();
                }
                handleClose();
                openDetailsView(data.result.id);
            })
            .catch((error) => {
                setProcessing(false);
                console.log("Inside catch");
                console.log(error);
                setErrors({ ...error });
                console.error("There was an error!", error);
                props.showToastMessage("Error Creating PurchaseReturned!", "danger");
            });
    }


    let [totalPrice, setTotalPrice] = useState(0.0);

    function findTotalPrice() {
        totalPrice = 0.00;
        for (var i = 0; i < selectedProducts.length; i++) {
            if (!selectedProducts[i].selected) {
                continue;
            }
            totalPrice +=
                parseFloat(selectedProducts[i].purchase_unit_price) *
                parseFloat(selectedProducts[i].quantity);
        }
        totalPrice = totalPrice.toFixed(2);
        setTotalPrice(totalPrice);
    }

    let [vatPrice, setVatPrice] = useState(0.00);

    function findVatPrice() {
        if (totalPrice > 0) {
            vatPrice = ((parseFloat(formData.vat_percent) / 100) * parseFloat(totalPrice - formData.discount)).toFixed(2);;
            console.log("vatPrice:", vatPrice);
            setVatPrice(vatPrice);
        }

    }


    let [netTotal, setNetTotal] = useState(0.00);

    function findNetTotal() {
        netTotal = 0.00;
        if (totalPrice > 0) {
            netTotal = (parseFloat(totalPrice) - parseFloat(formData.discount) + parseFloat(vatPrice));
            netTotal = parseFloat(netTotal);
        }
        netTotal = RoundFloat(netTotal, 2);
        // netTotal = Math.round(netTotal * 100) / 100;
        setNetTotal(netTotal);

        if (!formData.payments_input) {
            formData.payments_input = [];
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

            if (netTotal > 0) {
                formData.payments_input[0].amount = parseFloat(netTotal.toFixed(2));
                if (formData.cash_discount) {
                    formData.payments_input[0].amount = formData.payments_input[0].amount - parseFloat(formData.cash_discount?.toFixed(2));
                }
                formData.payments_input[0].amount = parseFloat(formData.payments_input[0].amount.toFixed(2));
            }
        }

        setFormData({ ...formData });
        validatePaymentAmounts();

    }

    function RoundFloat(val, precision) {
        var ratio = Math.pow(10, precision);
        return Math.round(val * ratio) / ratio;
    }


    let [discountPercent, setDiscountPercent] = useState(0.00);

    function findDiscountPercent() {
        if (!formData.discountValue) {
            formData.discount = 0.00;
            formData.discount_percent = 0.00;
            setFormData({ ...formData });
            return;
        }

        formData.discount = formData.discountValue;

        if (formData.discount > 0 && totalPrice > 0) {
            discountPercent = parseFloat(parseFloat(formData.discount / totalPrice) * 100).toFixed(2);
            setDiscountPercent(discountPercent);
            formData.discount_percent = discountPercent;
            setFormData({ ...formData });
        }

    }

    function findDiscount() {
        if (formData.discount_percent >= 0 && totalPrice > 0) {
            formData.discount = parseFloat(totalPrice * parseFloat(formData.discount_percent / 100));
            //formData.discount = Math.round(formData.discount * 100) / 100;
            formData.discount = parseFloat(formData.discount.toFixed(2));
            setFormData({ ...formData });
        }
    }

    function findDiscountPercent() {
        if (formData.discount >= 0 && totalPrice > 0) {
            discountPercent = parseFloat(parseFloat(formData.discount / totalPrice) * 100);
            setDiscountPercent(discountPercent);
            formData.discount_percent = discountPercent;
            //formData.discount_percent = Math.round(formData.discount_percent * 100) / 100;
            setFormData({ ...formData });
        }
    }
    /*

    function findDiscount() {
        if (!formData.discountValue) {
            formData.discount = 0.00;
            formData.discount_percent = 0.00;
            setFormData({ ...formData });
            return;
        }

        formData.discount_percent = formData.discountValue;

        if (formData.discount_percent > 0 && totalPrice > 0) {
            formData.discount = parseFloat(totalPrice * parseFloat(formData.discount_percent / 100)).toFixed(2);
        }
        setFormData({ ...formData });
    }
    */


    function reCalculate() {
        findTotalPrice();
        if (formData.is_discount_percent) {
            findDiscount();
        } else {
            findDiscountPercent();
        }
        findVatPrice();
        findNetTotal();
    }

    const DetailsViewRef = useRef();
    function openDetailsView(id) {
        DetailsViewRef.current.open(id);
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
    function openUserCreateForm() {
        UserCreateFormRef.current.open();
    }


    const SignatureCreateFormRef = useRef();
    function openSignatureCreateForm() {
        SignatureCreateFormRef.current.open();
    }

    const ProductDetailsViewRef = useRef();
    function openProductDetailsView(id) {
        ProductDetailsViewRef.current.open(id);
    }

    const PurchaseDetailsViewRef = useRef();
    function openPurchaseDetailsView(id) {
        PurchaseDetailsViewRef.current.open(id);
    }

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

        balanceAmount = (parseFloat(netTotal.toFixed(2)) - parseFloat(parseFloat(formData.cash_discount)?.toFixed(2))) - parseFloat(totalPayment.toFixed(2));
        balanceAmount = parseFloat(balanceAmount.toFixed(2));
        setBalanceAmount(balanceAmount);

        if (balanceAmount === parseFloat((parseFloat(netTotal.toFixed(2)) - parseFloat(parseFloat(formData.cash_discount)?.toFixed(2))).toFixed(2))) {
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
        errors["cash_discount"] = "";
        setErrors({ ...errors });
        let haveErrors = false;
        if (!netTotal) {
            //removePayment(0, false);
            //totalPaymentAmount = 0.0;
            //setTotalPaymentAmount(0.00);
            //balanceAmount = 0.00;
            //setBalanceAmount(0.00);
            //paymentStatus = "";
            //setPaymentStatus(paymentStatus);
            return true;
        }



        if (formData.cash_discount > 0 && formData.cash_discount >= netTotal) {
            errors["cash_discount"] = "Cash discount should not be >= " + netTotal.toFixed(2).toString();
            setErrors({ ...errors });
            haveErrors = true
            return false;
        }

        let totalPayment = findTotalPayments();
        // errors["payment_date"] = [];
        //errors["payment_method"] = [];
        //errors["payment_amount"] = [];
        for (var key = 0; key < formData.payments_input.length; key++) {
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
            } else if ((new Date(formData.payments_input[key].date_str)) < (new Date(formData.date_str))) {
                errors["payment_date_" + key] = "Payment date time should be greater than or equal to order date time";
                setErrors({ ...errors });
                haveErrors = true;
            }

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



    return (
        <>
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
                        {formData.id ? "Update Purchase Return #" + formData.code + " for purchase #" + formData.purchase_code : "Create Purchase Return" + " for purchase #" + formData.purchase_code}
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
                        <PurchaseReturnedPreview />
                        <Button variant="primary" className="mb-3" onClick={handleCreate} >
                            {isProcessing ?
                                <Spinner
                                    as="span"
                                    animation="border"
                                    size="sm"
                                    role="status"
                                    aria-hidden={true}
                                /> + " Creating..."

                                : ""
                            }
                            {formData.id ? "Update" : "Create"}

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
                    {selectedProducts.length === 0 && "Already Returned All purchased products"}


                    {selectedProducts.length > 0 && <form className="row g-3 needs-validation" onSubmit={handleCreate}>

                        <div className="col-md-3">
                            <label className="form-label">Vendor Invoice No. (Optional)</label>

                            <div className="input-group mb-3">
                                <input
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
                                    id="vendor_invoice_no"
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
                                        <th>Qty</th>
                                        <th>Unit Price</th>
                                        <th>Purchase Return Price</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedProducts.map((product, index) => (
                                        <tr className="text-center">
                                            <td>
                                                <input type="checkbox" checked={selectedProducts[index].selected} onChange={(e) => {
                                                    console.log("e.target.value:", e.target.value)
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
                                            <td style={{ width: "155px" }}>

                                                <div className="input-group mb-3">
                                                    <input type="number" value={product.quantity} className="form-control"

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

                                                    <input type="number" value={product.purchase_unit_price} className="form-control"

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
                                            <td className="text-end">
                                                <NumberFormat
                                                    value={(product.purchase_unit_price * product.quantity).toFixed(2)}
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
                                        <td colSpan="5"></td>
                                        <th className="text-end">Total</th>
                                        <td className="text-end" style={{ width: "180px" }}>
                                            <NumberFormat
                                                value={totalPrice}
                                                displayType={"text"}
                                                thousandSeparator={true}
                                                suffix={""}
                                                renderText={(value, props) => value}
                                            />
                                        </td>
                                    </tr>

                                    <tr>
                                        <th colSpan="6" className="text-end">

                                            Discount  <input type="number" style={{ width: "50px" }} className="text-start" value={formData.discount_percent} onChange={(e) => {
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
                                            <NumberFormat
                                                value={formData.discount}
                                                displayType={"text"}
                                                thousandSeparator={true}
                                                suffix={""}
                                                renderText={(value, props) => value}
                                            />
                                        </td>
                                    </tr>
                                    <tr>
                                        <th colSpan="5" className="text-end">

                                        </th>
                                        <th className="text-end">VAT: {formData.vat_percent + "%"}</th>
                                        <td className="text-end">
                                            <NumberFormat
                                                value={vatPrice}
                                                displayType={"text"}
                                                thousandSeparator={true}
                                                suffix={""}
                                                renderText={(value, props) => value}
                                            />
                                        </td>
                                    </tr>
                                    <tr>
                                        <td colSpan="5"></td>
                                        <th className="text-end">Net Total</th>
                                        <th className="text-end">
                                            <NumberFormat
                                                value={netTotal}
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
                                    if (formData.cash_discount > 0 && formData.cash_discount >= netTotal) {
                                        errors["cash_discount"] = "Cash discount should not be >= " + netTotal.toString();
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
                                                            <option value="bank_account">Bank Account / Debit / Credit Card</option>
                                                            <option value="customer_account">Customer Account</option>
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

                                            </td>
                                            <td>
                                                <b style={{ marginLeft: "12px", alignSelf: "end" }}>Balance: {balanceAmount?.toFixed(2)}</b>
                                            </td>
                                            <td colSpan={1}>
                                                <b>Payment status: </b>
                                                {paymentStatus == "paid" ?
                                                    <span className="badge bg-success">
                                                        Paid
                                                    </span> : ""}
                                                {paymentStatus == "paid_partially" ?
                                                    <span className="badge bg-warning">
                                                        Paid Partially
                                                    </span> : ""}
                                                {paymentStatus == "not_paid" ?
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
                                    /> + " Creating..."

                                    : formData.id ? "Update" : "Create"
                                }
                            </Button>
                        </Modal.Footer>
                    </form>}
                </Modal.Body>

            </Modal>


        </>
    );
});

export default PurchaseReturnedCreate;
