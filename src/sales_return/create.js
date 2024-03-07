import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import SalesReturnPreview from "./preview.js";
import { Modal, Button, Form } from "react-bootstrap";
import StoreCreate from "../store/create.js";
import CustomerCreate from "./../customer/create.js";
import ProductCreate from "./../product/create.js";
import UserCreate from "./../user/create.js";
import SignatureCreate from "./../signature/create.js";
import Cookies from "universal-cookie";
import { Typeahead } from "react-bootstrap-typeahead";
import NumberFormat from "react-number-format";
import DatePicker from "react-datepicker";
import { format } from "date-fns";
import { Spinner } from "react-bootstrap";
import SalesReturnView from "./view.js";
import ProductView from "./../product/view.js";

const SalesReturnCreate = forwardRef((props, ref) => {

    useImperativeHandle(ref, () => ({
        open(id, orderId) {

            formData = {
                order_id: orderId,
                vat_percent: 15.0,
                discount: 0.0,
                discountValue: 0.0,
                discount_percent: 0.0,
                is_discount_percent: false,
                //  date_str: format(new Date(), "MMM dd yyyy"),
                date_str: new Date(),
                signature_date_str: format(new Date(), "MMM dd yyyy"),
                status: "received",
                payment_status: "",
                payment_method: "",
                price_type: "retail"
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
            if (cookies.get("user_id")) {
                selectedReceivedByUsers = [{
                    id: cookies.get("user_id"),
                    name: cookies.get("user_name"),
                }];
                formData.received_by = cookies.get("user_id");
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


    function getSalesReturn(id) {
        console.log("inside getSalesReturn id:", id);
        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': cookies.get('access_token'),
            },
        };

        fetch('/v1/sales-return/' + id, requestOptions)
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

                let salesReturn = data.result;
                // formData = purchaseReturn;

                formData = {
                    id: salesReturn.id,
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
                    // shipping_handling_fees: salesReturn.shipping_handling_fees,
                };

                for (var i = 0; i < formData.payments_input.length; i++) {
                    formData.payments_input[i].date_str = formData.payments_input[i].date
                }


                setFormData({ ...formData });

                console.log("formData1.status:", formData.status);


                console.log("purchaseReturn.products:", salesReturn.products);

                let selectedProductsTemp = salesReturn.products;

                selectedProducts = [];
                for (let i = 0; i < selectedProductsTemp.length; i++) {
                    if (selectedProductsTemp[i].quantity > 0) {
                        selectedProductsTemp[i].selected = true;
                    } else {
                        selectedProductsTemp[i].selected = false;
                    }
                    selectedProducts.push(selectedProductsTemp[i]);

                    //selectedProductsTemp[i].purchase_unit_price = selectedProductsTemp[i].purchasereturn_unit_price;
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
                'Authorization': cookies.get('access_token'),
            },
        };

        fetch('/v1/order/' + id, requestOptions)
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
                console.log("order.discount_percent:", order.discount_percent);
                formData.discount_percent = order.discount_percent;
                formData.cash_discount = parseFloat(order.cash_discount-order.return_cash_discount);
                // formData.discount = (order.discount - order.return_discount);

                // formData.discount_percent = order.discount_percent;

                /*
                if (formData.is_discount_percent) {
                    formData.discountValue = formData.discount_percent;
                } else {
                    formData.discountValue = formData.discount;
                }
                */

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

    const selectedDate = new Date();

    //const history = useHistory();
    let [errors, setErrors] = useState({});
    const [isProcessing, setProcessing] = useState(false);
    const cookies = new Cookies();

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
    let [selectedProducts, setSelectedProducts] = useState([]);

    //Received By Auto Suggestion
    const [receivedByUserOptions, setReceivedByUserOptions] = useState([]);
    let [selectedReceivedByUsers, setSelectedReceivedByUsers] = useState([]);
    const [isReceivedByUsersLoading, setIsReceivedByUsersLoading] =
        useState(false);

    //Received By Signature Auto Suggestion
    const [receivedBySignatureOptions, setReceivedBySignatureOptions] =
        useState([]);
    const [selectedReceivedBySignatures, setSelectedReceivedBySignatures] =
        useState([]);
    const [isReceivedBySignaturesLoading, setIsReceivedBySignaturesLoading] =
        useState(false);

    const [show, setShow] = useState(false);

    function handleClose() {
        setShow(false);
    }

    useEffect(() => {
        let at = cookies.get("access_token");
        if (!at) {
            // history.push("/dashboard/salesreturns");
            window.location = "/";
        }
    });


    function ObjectToSearchQueryParams(object) {
        return Object.keys(object)
            .map(function (key) {
                return `search[${key}]=${object[key]}`;
            })
            .join("&");
    }

    async function suggestUsers(searchTerm) {
        console.log("Inside handle suggestUsers");
        setReceivedByUserOptions([]);

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
        setIsReceivedByUsersLoading(true);
        let result = await fetch(
            "/v1/user?" + Select + queryString,
            requestOptions
        );
        let data = await result.json();

        setReceivedByUserOptions(data.result);
        setIsReceivedByUsersLoading(false);
    }

    async function suggestSignatures(searchTerm) {
        console.log("Inside handle suggestSignatures");
        setReceivedBySignatureOptions([]);

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
        setIsReceivedBySignaturesLoading(true);
        let result = await fetch(
            "/v1/signature?" + Select + queryString,
            requestOptions
        );
        let data = await result.json();

        setReceivedBySignatureOptions(data.result);
        setIsReceivedBySignaturesLoading(false);
    }

    function handleCreate(event) {
        event.preventDefault();
        console.log("Inside handle Create");
        console.log("selectedProducts:", selectedProducts);
        console.log("formData.order_id:", formData.order_id);

        formData.products = [];
        for (var i = 0; i < selectedProducts.length; i++) {
            if (!selectedProducts[i].selected) {
                continue;
            }

            formData.products.push({
                product_id: selectedProducts[i].product_id,
                quantity: parseFloat(selectedProducts[i].quantity),
                unit_price: parseFloat(selectedProducts[i].unit_price),
                unit: selectedProducts[i].unit,
            });
        }

        if (!formData.cash_discount) {
            formData.cash_discount = 0.00;
        }

        formData.discount = parseFloat(formData.discount);
        formData.discount_percent = parseFloat(formData.discount_percent);

        formData.vat_percent = parseFloat(formData.vat_percent);
        console.log("formData.discount:", formData.discount);

        let haveErrors = false;

        errors["products"] = "";
        setErrors({ ...errors });

        if (formData.products.length === 0) {
            errors["products"] = "No products added";
            setErrors({ ...errors });
            haveErrors = true;
        }

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

        if (!validatePaymentAmounts()) {
            console.log("Errors on payments")
            haveErrors = true;
        }

        if (haveErrors) {
            console.log("Errors: ", errors);
            return;
        }



        /*
        if (!formData.discountValue && formData.discountValue !== 0) {
            errors["discount"] = "Invalid Discount";
            setErrors({ ...errors });
            return;
        }
        */

        formData.net_total = parseFloat(netTotal);


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
                Authorization: cookies.get("access_token"),
            },
            body: JSON.stringify(formData),
        };

        console.log("formData:", formData);

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
                props.showToastMessage("SalesReturn Created Successfully!", "success");
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
                props.showToastMessage("Error Creating SalesReturn!", "danger");
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
                parseFloat(selectedProducts[i].unit_price) *
                parseFloat(selectedProducts[i].quantity);
        }
        totalPrice = totalPrice.toFixed(2);
        setTotalPrice(totalPrice);
    }

    let [vatPrice, setVatPrice] = useState(0.00);

    /*
    function findVatPrice() {
        vatPrice = ((parseFloat(formData.vat_percent) / 100) * parseFloat(totalPrice - formData.discount)).toFixed(2);;
        console.log("vatPrice:", vatPrice);
        setVatPrice(vatPrice);
    }*/

    function findVatPrice() {
        vatPrice = 0.00;
        if (totalPrice > 0) {
            //+ parseFloat(formData.shipping_handling_fees)
            vatPrice = (parseFloat((parseFloat(formData.vat_percent) / 100)) * (parseFloat(totalPrice) - parseFloat(formData.discount)));
            console.log("vatPrice:", vatPrice);
        }
        setVatPrice(vatPrice);
    }



    let [netTotal, setNetTotal] = useState(0.00);

    function findNetTotal() {
        if (totalPrice > 0) {
            netTotal = (parseFloat(totalPrice) - parseFloat(formData.discount) + parseFloat(vatPrice));
            setNetTotal(netTotal);
        }

        netTotal = Math.round(netTotal * 100) / 100;
        console.log("after rounding netTotal:", netTotal);
        setNetTotal(netTotal);

        if (!formData.id) {
            formData.payments_input = [{
                "date_str": formData.date_str,
                "amount": 0.00,
                "method": "",
                "deleted": false,
            }];
            formData.payments_input[0].amount = parseFloat(netTotal);
        }
        setFormData({ ...formData });
        validatePaymentAmounts();

    }

    let [discountPercent, setDiscountPercent] = useState(0.00);

    /*
    function findDiscountPercent() {
        if (formData.discount >= 0 && totalPrice > 0) {
            discountPercent = parseFloat(parseFloat(formData.discount / totalPrice) * 100);
            setDiscountPercent(discountPercent);
            formData.discount_percent = discountPercent;
            setFormData({ ...formData });
        }
    }
    */



    /*
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
    */

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

    function reCalculate() {
        findTotalPrice();
        //findDiscount();
        //findDiscountPercent();

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

    const CustomerCreateFormRef = useRef();
    const ProductCreateFormRef = useRef();



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


    function getTotalPayments() {
        let totalPayment = 0.00;
        for (var i = 0; i < formData.payments_input?.length; i++) {
            if (formData.payments_input[i].amount && !formData.payments_input[i].deleted) {
                totalPayment += formData.payments_input[i].amount;
            }
        }
        return totalPayment;
    }

    function validatePaymentAmounts() {
        let haveErrors = false;
        if (!netTotal) {
            return true;
        }

        if (formData.cash_discount > 0 && formData.cash_discount >= netTotal) {
            errors["cash_discount"] = "Cash discount should not be >= " + netTotal.toFixed(2).toString();
            setErrors({ ...errors });
            haveErrors = true
            return false;
        }

        let totalPayment = getTotalPayments();
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


            if ((formData.payments_input[key].amount || formData.payments_input[key].amount === 0) && !formData.payments_input[key].deleted) {
                let maxAllowedAmount = (netTotal - formData.cash_discount) - (totalPayment - formData.payments_input[key].amount);

                if (maxAllowedAmount < 0) {
                    maxAllowedAmount = 0;
                }

                if (maxAllowedAmount === 0) {
                    errors["payment_amount_" + key] = "Total amount should not exceed " + (netTotal - formData.cash_discount).toFixed(2).toString() + ", Please delete this payment";
                    setErrors({ ...errors });
                    haveErrors = true;
                } else if (formData.payments_input[key].amount > maxAllowedAmount) {
                    errors["payment_amount_" + key] = "Amount should not be greater than " + maxAllowedAmount.toFixed(2).toString();
                    setErrors({ ...errors });
                    haveErrors = true;
                }
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

    function removePayment(key) {
        formData.payments_input.splice(key, 1);
        //formData.payments_input[key]["deleted"] = true;
        setFormData({ ...formData });
        validatePaymentAmounts();
    }


    return (
        <>
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
                        {formData.id ? "Update Sales Return #" + formData.code + " for sale #" + formData.order_code : "Create Sales Return" + " for sale #" + formData.order_code}
                    </Modal.Title>

                    <div className="col align-self-end text-end">
                        <SalesReturnPreview />
                        <Button variant="primary" onClick={handleCreate} >
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
                    {selectedProducts.length > 0 && <div className="col-md-3">
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
                        {formData.date_str && !errors.date_str && (
                            <div style={{ color: "green" }}>
                                <i className="bi bi-check-lg"> </i>
                                Looks good!
                            </div>
                        )}
                    </div>}

                    {selectedProducts.length === 0 && "Already returned all products"}
                    {selectedProducts.length > 0 && <form className="row g-3 needs-validation" onSubmit={handleCreate}>
                        <h2>Select Products</h2>
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
                                        <th>Price</th>
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
                                                onClick={() => {
                                                    openProductDetailsView(product.product_id);
                                                }}>{product.name}
                                            </td>
                                            <td style={{ width: "155px" }}>

                                                <div class="input-group mb-3">
                                                    <input type="number" value={(product.quantity)} className="form-control"

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
                                                    <input type="number" value={product.unit_price} className="form-control"

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


                                                            selectedProducts[index].unit_price = parseFloat(e.target.value);
                                                            console.log("selectedProducts[index].unit_price:", selectedProducts[index].unit_price);
                                                            setSelectedProducts([...selectedProducts]);
                                                            reCalculate();

                                                        }} />
                                                    <span class="input-group-text" id="basic-addon2">SAR</span>
                                                </div>
                                                {errors["unit_price_" + index] && (
                                                    <div style={{ color: "red" }}>
                                                        <i className="bi bi-x-lg"> </i>
                                                        {errors["unit_price_" + index]}
                                                    </div>
                                                )}

                                            </td>
                                            <td>
                                                <NumberFormat
                                                    value={(product.unit_price * product.quantity).toFixed(2)}
                                                    displayType={"text"}
                                                    thousandSeparator={true}
                                                    suffix={" SAR"}
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
                                        <td colSpan="4"></td>
                                        <td className="text-center">

                                        </td>
                                        <th className="text-end">Total</th>
                                        <td className="text-end" style={{ width: "180px" }}>
                                            <NumberFormat
                                                value={totalPrice}
                                                displayType={"text"}
                                                thousandSeparator={true}
                                                suffix={" SAR"}
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
                                            {/*
                                            Discount(  {formData.discount_percent + "%"})
                                                */}
                                        </th>
                                        <td className="text-end">
                                            <input type="number" style={{ width: "150px" }} className="text-start" value={formData.discount} onChange={(e) => {
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
                                            {" SAR"}
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
                                                suffix={" SAR"}
                                                renderText={(value, props) => value}
                                            />
                                            */}
                                        </td>
                                    </tr>
                                    <tr>
                                        <th colSpan="5" className="text-end">

                                        </th>
                                        <th className="text-end"> VAT: {formData.vat_percent + "%"}</th>
                                        <td className="text-end">
                                            <NumberFormat
                                                value={vatPrice?.toFixed(2)}
                                                displayType={"text"}
                                                thousandSeparator={true}
                                                suffix={" SAR"}
                                                renderText={(value, props) => value}
                                            />
                                        </td>
                                    </tr>
                                    <tr>
                                        <td colSpan="5"></td>
                                        <th className="text-end">Net Total</th>
                                        <th className="text-end">
                                            <NumberFormat
                                                value={netTotal?.toFixed(2)}
                                                displayType={"text"}
                                                thousandSeparator={true}
                                                suffix={" SAR"}
                                                renderText={(value, props) => value}
                                            />
                                        </th>
                                    </tr>
                                </tbody>
                            </table>
                        </div>







                        {/*
                        <div className="col-md-2">
                            <label className="form-label">Discount*</label>

                            <div className="input-group mb-3" >
                                <input
                                    value={formData.discountValue}
                                    style={{ marginRight: "10px" }}
                                    type='number'
                                    onChange={(e) => {
                                        if (parseFloat(e.target.value) === 0) {
                                            formData.discountValue = parseFloat(e.target.value);
                                            setFormData({ ...formData });
                                            errors["discount"] = "";
                                            setErrors({ ...errors });
                                            reCalculate();
                                            return;
                                        }

                                        if (!e.target.value) {
                                            formData.discountValue = "";
                                            errors["discount"] = "Invalid Discount";
                                            setFormData({ ...formData });
                                            setErrors({ ...errors });
                                            return;
                                        }

                                        errors["discount"] = "";
                                        setErrors({ ...errors });

                                        formData.discountValue = e.target.value;
                                        setFormData({ ...formData });
                                        reCalculate();
                                    }}
                                    className="form-control"
                                    id="validationCustom02"
                                    placeholder="Discount"
                                />
                                <Form.Check
                                    type="switch"
                                    id="custom-switch"
                                    label="%"
                                    value={formData.is_discount_percent}
                                    checked={formData.is_discount_percent ? "checked" : null}
                                    onChange={(e) => {
                                        formData.is_discount_percent = !formData.is_discount_percent;
                                        console.log("e.target.value:", formData.is_discount_percent);
                                        setFormData({ ...formData });
                                        reCalculate();
                                    }}
                                />

                            </div>
                            {errors.discount && (
                                <div style={{ color: "red" }}>
                                    <i className="bi bi-x-lg"> </i>
                                    {errors.discount}
                                </div>
                            )}
                            {!errors.discount && (
                                <div style={{ color: "green" }}>
                                    <i className="bi bi-check-lg"> </i>
                                    Looks good!
                                </div>
                            )}
                        </div>
                            */}


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
                            <label className="form-label">Payments Received</label>

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
                                                                let paymentDate = new Date(formData.payments_input[key].date_str)
                                                                let orderDate = new Date(formData.date_str)


                                                                let paymentYear = paymentDate.getFullYear();
                                                                let paymentMonth = paymentDate.getMonth();
                                                                let paymentDay = paymentDate.getDate();
                                                                let paymentMinutes = paymentDate.getMinutes();
                                                                var paymentHours = paymentDate.getHours();

                                                                let orderYear = orderDate.getFullYear();
                                                                let orderMonth = orderDate.getMonth();
                                                                let orderDay = orderDate.getDate();
                                                                let orderMinutes = orderDate.getMinutes();
                                                                var orderHours = orderDate.getHours();

                                                                if (paymentYear == orderYear
                                                                    && paymentMonth == orderMonth
                                                                    && paymentDay == orderDay
                                                                    && paymentHours == orderHours
                                                                    && paymentMinutes == orderMinutes) {
                                                                    formData.date_str = formData.payments_input[key].date_str;

                                                                }
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
                                            <td><b>{getTotalPayments()}</b></td>
                                            <td colSpan={2}></td>
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
                                        animation="bsalesreturn"
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

export default SalesReturnCreate;
