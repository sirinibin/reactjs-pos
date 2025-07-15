import React, { useState, useEffect, useRef, forwardRef, useCallback, useImperativeHandle } from "react";
import { Modal, Button } from "react-bootstrap";
import { Spinner } from "react-bootstrap";
import { Typeahead, Menu, MenuItem } from "react-bootstrap-typeahead";
import DatePicker from "react-datepicker";
import { format } from "date-fns";
import CustomerCreate from "./../customer/create.js";
import VendorCreate from "./../vendor/create.js";
import CustomerView from "./../customer/view.js";
import Customers from "./../utils/customers.js";
import Vendors from "./../utils/vendors.js";
import SalesReturns from "./../utils/salesReturn.js";
import Purchases from "./../utils/purchases.js";
import QuotationSalesReturns from "./../utils/quotation_sales_returns.js";
import CustomerDepositPreview from './../customer_deposit/preview.js';
import { trimTo2Decimals } from "../utils/numberUtils";
import PurchaseCreate from "./../purchase/create.js";
import SalesReturnCreate from "./../sales_return/create.js";
import QuotationSalesReturnCreate from "./../quotation_sales_return/create.js";
import { confirm } from 'react-bootstrap-confirmation';
import InfoDialog from './../utils/InfoDialog';
import { highlightWords } from "../utils/search.js";
import Amount from "../utils/amount.js";
import Draggable from "react-draggable";

const columnStyle = {
    width: '20%',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    paddingRight: '8px',
};

const CustomerWithdrawalCreate = forwardRef((props, ref) => {
    useImperativeHandle(ref, () => ({
        open(id) {
            formData = {
                type: "customer",
                images_content: [],
                date_str: new Date(),
                payments: [
                    {
                        date_str: new Date(),
                        amount: 0.00,
                        discount: 0.00,
                        method: "",
                        bank_reference: "",
                        description: "",
                    },
                ],
            };
            setFormData({ ...formData });
            setSelectedCustomers([]);
            setSelectedVendors([]);
            findTotalPayments();

            if (id) {
                getCustomerWithdrawal(id);
            }
            getStore(localStorage.getItem("store_id"));

            SetShow(true);
        },

    }));

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
            })
            .catch(error => {

            });
    }


    useEffect(() => {
        const listener = event => {
            if (event.code === "Enter" || event.code === "NumpadEnter") {
                console.log("Enter key was pressed. Run your function-customerwithdrawal.");
                // event.preventDefault();

                var form = event.target.form;
                if (form && event.target) {
                    var index = Array.prototype.indexOf.call(form, event.target);
                    if (form && form.elements[index + 1]) {
                        if (event.target.getAttribute("class").includes("description")) {
                            form.elements[index].focus();
                            form.elements[index].value += '\r\n';
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



    let [errors, setErrors] = useState({});
    const [isProcessing, setProcessing] = useState(false);


    //fields
    let [formData, setFormData] = useState({
        images_content: [],
        date_str: new Date(),
        payments: [],
    });

    const [show, SetShow] = useState(false);

    function handleClose() {
        SetShow(false);
    }


    function getCustomerWithdrawal(id) {
        console.log("inside get CustomerWithdrawal");
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

        fetch('/v1/customer-withdrawal/' + id + "?" + queryParams, requestOptions)
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

                formData = data.result;
                formData.date_str = data.result.date;


                if (data.result?.payments) {
                    formData.payments = data.result.payments;
                    for (var i = 0; i < formData.payments?.length; i++) {
                        formData.payments[i].date_str = formData.payments[i].date
                    }
                }
                findTotalPayments();

                if (formData.type === "customer" && formData.customer_name && formData.customer_id) {
                    let selectedCustomers = [
                        {
                            id: formData.customer_id,
                            name: formData.customer_name,
                            search_label: formData.customer?.search_label ? formData.customer?.search_label : formData.customer_name,
                        }
                    ];

                    setSelectedCustomers([...selectedCustomers]);
                }


                if (formData.type === "vendor" && formData.vendor_name && formData.vendor_id) {
                    let selectedVendors = [
                        {
                            id: formData.vendor_id,
                            name: formData.vendor_name,
                            search_label: formData.vendor?.search_label ? formData.vendor?.search_label : formData.vendor_name,
                        }
                    ];
                    setSelectedVendors([...selectedVendors]);
                }

                formData.images_content = [];

                setFormData({ ...formData });
            })
            .catch(error => {
                setProcessing(false);
                setErrors(error);
            });
    }


    useEffect(() => {
        let at = localStorage.getItem("access_token");
        if (!at) {
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

    //Customer Auto Suggestion
    const [customerOptions, setCustomerOptions] = useState([]);
    const [selectedCustomers, setSelectedCustomers] = useState([]);

    const [vendorOptions, setVendorOptions] = useState([]);
    const [selectedVendors, setSelectedVendors] = useState([]);
    // const [isCustomersLoading, setIsCustomersLoading] = useState(false);

    const customFilter = useCallback((option, query) => {
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



    const customVendorFilter = useCallback((option, query) => {
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


    let [openVendorSearchResult, setOpenVendorSearchResult] = useState(false);
    let [openCustomerSearchResult, setOpenCustomerSearchResult] = useState(false);

    async function suggestCustomers(searchTerm) {
        console.log("Inside handle suggestCustomers");
        setCustomerOptions([]);


        console.log("searchTerm:" + searchTerm);

        if (!searchTerm) {
            setTimeout(() => {
                openCustomerSearchResult = false;
                setOpenCustomerSearchResult(false);
            }, 100);
            return;
        }

        console.log("searchTerm:" + searchTerm);
        if (!searchTerm) {
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

        let Select = "select=id,credit_balance,credit_limit,additional_keywords,code,vat_no,name,phone,name_in_arabic,phone_in_arabic,search_label";
        // setIsCustomersLoading(true);
        let result = await fetch(
            "/v1/customer?" + Select + queryString,
            requestOptions
        );
        let data = await result.json();

        if (!data.result || data.result.length === 0) {
            openCustomerSearchResult = false;
            setOpenCustomerSearchResult(false);
            return;
        }

        openCustomerSearchResult = true;
        setOpenCustomerSearchResult(true);


        if (data.result) {
            const filtered = data.result.filter((opt) => customFilter(opt, searchTerm));
            setCustomerOptions(filtered);
        } else {
            setCustomerOptions([]);
        }

        //setIsCustomersLoading(false);
    }


    async function suggestVendors(searchTerm) {
        console.log("Inside handle suggestVendors");
        setCustomerOptions([]);

        console.log("searchTerm:" + searchTerm);
        if (!searchTerm) {

            setTimeout(() => {
                openVendorSearchResult = false;
                setOpenVendorSearchResult(false);
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

        let Select = "select=id,credit_balance,credit_limit,additional_keywords,code,vat_no,name,phone,name_in_arabic,phone_in_arabic,search_label";
        // setIsCustomersLoading(true);
        let result = await fetch(
            "/v1/vendor?" + Select + queryString,
            requestOptions
        );
        let data = await result.json();

        if (!data.result || data.result.length === 0) {
            openVendorSearchResult = false
            setOpenVendorSearchResult(false);
            return;
        }

        openVendorSearchResult = true;
        setOpenVendorSearchResult(true);

        if (data.result) {
            const filtered = data.result.filter((opt) => customVendorFilter(opt, searchTerm));
            setVendorOptions(filtered);
        } else {
            setVendorOptions([]);
        }

        //setIsCustomersLoading(false);
    }

    function handleCreate(event) {
        event.preventDefault();
        console.log("Inside handle Create");
        if (!validatePaymentAmounts()) {
            return;
        }


        console.log("category_id:", formData.category_id);

        if (localStorage.getItem("store_id")) {
            formData.store_id = localStorage.getItem("store_id");
        }

        if (formData.type === "customer") {
            formData.vendor_id = "";
        } else if (formData.type === "vendor") {
            formData.customer_id = "";
        }


        let endPoint = "/v1/customer-withdrawal";
        let method = "POST";
        if (formData.id) {
            endPoint = "/v1/customer-withdrawal/" + formData.id;
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
                if (props.showToastMessage) props.showToastMessage("Created Successfully!", "success");
                if (props.refreshList) {
                    props.refreshList();
                }

                if (props.onUpdated) {
                    props.onUpdated();
                }

                handleClose();
                if (props.openDetailsView)
                    props.openDetailsView(data.result.id);
            })
            .catch((error) => {
                setProcessing(false);
                setErrors({ ...error });
                console.error("There was an error!", error);
                if (props.showToastMessage) props.showToastMessage("Error Creating!", "danger");
            });
    }


    function addNewPayment() {
        let date = new Date();
        if (!formData.id) {
            date = formData.date_str;
        }

        if (!formData.payments) {
            formData.payments = [];
        }

        formData.payments.push({
            "date_str": date,
            // "amount": "",
            "amount": 0.00,
            "discount": 0.00,
            "method": "",
            "deleted": false,
        });
        setFormData({ ...formData });
        findTotalPayments();
    }


    function validatePaymentAmounts() {
        errors = {};
        setErrors({ ...errors });

        let haveErrors = false;

        if (!formData.payments || formData.payments?.length === 0) {
            errors["payments"] = "At lease one payment is required";
            setErrors({ ...errors });
            haveErrors = true;
        }

        for (var key = 0; key < formData.payments?.length; key++) {
            errors["customer_payable_payment_amount_" + key] = "";
            errors["customer_payable_payment_discount_" + key] = "";
            errors["customer_payable_payment_date_" + key] = "";
            errors["customer_payable_payment_method_" + key] = "";
            setErrors({ ...errors });

            if (!formData.payments[key].amount) {
                errors["customer_payable_payment_amount_" + key] = "Payment amount is required";
                setErrors({ ...errors });
                haveErrors = true;
            } else if (formData.payments[key].amount <= 0) {
                errors["customer_payable_payment_amount_" + key] = "Amount should be greater than zero";
                setErrors({ ...errors });
                haveErrors = true;
            }

            if (!formData.payments[key].date_str) {
                errors["customer_payable_payment_date_" + key] = "Payment date is required";
                setErrors({ ...errors });
                haveErrors = true;
            }

            if (!formData.payments[key].method) {
                errors["customer_payable_payment_method_" + key] = "Payment method is required";
                setErrors({ ...errors });
                haveErrors = true;
            }
        }

        if (haveErrors) {
            return false;
        }

        return true;
    }

    let [totalPaymentAmount, setTotalPaymentAmount] = useState(0.00);

    function findTotalPayments() {
        console.log("Inisde findTotalPayments")
        let totalPayment = 0.00;
        for (var i = 0; i < formData.payments?.length; i++) {
            if (formData.payments[i].amount && !formData.payments[i].deleted) {
                totalPayment += (formData.payments[i].amount - formData.payments[i].discount);
            }
        }

        totalPaymentAmount = parseFloat(trimTo2Decimals(totalPayment));
        setTotalPaymentAmount(totalPaymentAmount);
        return totalPayment;
    }

    function removePayment(key) {
        formData.payments.splice(key, 1);
        setFormData({ ...formData });
        findTotalPayments()
    }


    const CustomerCreateFormRef = useRef();
    function openCustomerCreateForm() {
        CustomerCreateFormRef.current.open();
    }

    const VendorCreateFormRef = useRef();
    function openVendorCreateForm() {
        VendorCreateFormRef.current.open();
    }

    const CustomerDetailsViewRef = useRef();
    function openCustomerDetailsView(id) {
        CustomerDetailsViewRef.current.open(id);
    }

    const CustomersRef = useRef();
    function openCustomers(model) {
        CustomersRef.current.open();
    }

    const VendorsRef = useRef();
    function openVendors(model) {
        VendorsRef.current.open();
    }


    const handleSelectedCustomer = (selectedCustomer) => {
        console.log("selectedCustomer:", selectedCustomer);
        setSelectedCustomers([selectedCustomer])
        formData.customer_id = selectedCustomer.id;
        setFormData({ ...formData });
    };

    const handleSelectedVendor = (selectedVendor) => {
        console.log("selectedVendor:", selectedVendor);
        setSelectedVendors([selectedVendor])
        formData.vendor_id = selectedVendor.id;
        setFormData({ ...formData });
    };




    let [selectedPaymentIndex, setSelectedPaymentIndex] = useState(null);
    let [showInfo, setShowInfo] = useState(false);
    let [infoMessage, setInfoMessage] = useState("");

    const handleSelectedSalesReturn = (selectedSalesReturn) => {

        if (formData.customer_id !== selectedSalesReturn.customer_id) {
            infoMessage = "The selected sales return is not belongs to the customer " + selectedCustomers[0]?.name;
            setInfoMessage(infoMessage);
            showInfo = true;
            setShowInfo(showInfo);
            return;
        }

        console.log("selectedSalesReturn:", selectedSalesReturn);
        if (selectedSalesReturn.payment_status === "paid") {
            infoMessage = "The selected invoice is already paid";
            setInfoMessage(infoMessage);
            showInfo = true;
            setShowInfo(showInfo);
            return;
        }
        // setSelectedCustomers([selectedCustomer])
        formData.payments[selectedPaymentIndex].invoice_type = "sales_return";
        formData.payments[selectedPaymentIndex].invoice_id = selectedSalesReturn.id;
        formData.payments[selectedPaymentIndex].invoice_code = selectedSalesReturn.code;
        formData.payments[selectedPaymentIndex].amount = parseFloat(trimTo2Decimals(selectedSalesReturn.balance_amount));
        findTotalPayments();
        setFormData({ ...formData });
    };

    const handleSelectedQuotationSalesReturn = (selectedQuotationSalesReturn) => {

        if (formData.customer_id !== selectedQuotationSalesReturn.customer_id) {
            infoMessage = "The selected Qtn. sales return is not belongs to the customer " + selectedCustomers[0]?.name;
            setInfoMessage(infoMessage);
            showInfo = true;
            setShowInfo(showInfo);
            return;
        }

        console.log("selectedQuotationSalesReturn:", selectedQuotationSalesReturn);
        if (selectedQuotationSalesReturn.payment_status === "paid") {
            infoMessage = "The selected invoice is already paid";
            setInfoMessage(infoMessage);
            showInfo = true;
            setShowInfo(showInfo);
            return;
        }
        // setSelectedCustomers([selectedCustomer])
        formData.payments[selectedPaymentIndex].invoice_type = "quotation_sales_return";
        formData.payments[selectedPaymentIndex].invoice_id = selectedQuotationSalesReturn.id;
        formData.payments[selectedPaymentIndex].invoice_code = selectedQuotationSalesReturn.code;
        formData.payments[selectedPaymentIndex].amount = parseFloat(trimTo2Decimals(selectedQuotationSalesReturn.balance_amount));
        findTotalPayments();
        setFormData({ ...formData });
    };

    const handleSelectedPurchase = (selectedPurchase) => {
        if (formData.vendor_id !== selectedPurchase.vendor_id) {
            infoMessage = "The selected Purchase is not belongs to the vendor " + selectedVendors[0]?.name;
            setInfoMessage(infoMessage);
            showInfo = true;
            setShowInfo(showInfo);
            return;
        }

        if (selectedPurchase.payment_status === "paid") {
            infoMessage = "The selected invoice is already paid";
            setInfoMessage(infoMessage);
            showInfo = true;
            setShowInfo(showInfo);
            return;
        }
        // setSelectedCustomers([selectedCustomer])
        formData.payments[selectedPaymentIndex].invoice_type = "purchase";
        formData.payments[selectedPaymentIndex].invoice_id = selectedPurchase.id;
        formData.payments[selectedPaymentIndex].invoice_code = selectedPurchase.code;
        formData.payments[selectedPaymentIndex].amount = parseFloat(trimTo2Decimals(selectedPurchase.balance_amount));
        findTotalPayments();
        setFormData({ ...formData });
    };

    const confirmInvoiceRemoval = async (paymentIndex) => {
        const result = await confirm('Are you sure, you want to remove this invoice from this payment?');
        console.log(result);
        if (result) {
            formData.payments[paymentIndex].invoice_type = "";
            formData.payments[paymentIndex].invoice_id = "";
            formData.payments[paymentIndex].invoice_code = "";
            setFormData({ ...formData });
        }
    };



    const PreviewRef = useRef();
    function openPreview() {
        if (!formData.date) {
            formData.date = formData.date_str;
        }
        PreviewRef.current.open(formData, undefined, "customer_withdrawal");
    }

    const PurchaseUpdateFormRef = useRef();
    function openPurchaseUpdateForm(id) {
        PurchaseUpdateFormRef.current.open(id);
    }

    const SalesReturnUpdateFormRef = useRef();
    function openSalesReturnUpdateForm(id) {
        SalesReturnUpdateFormRef.current.open(id);
    }


    const QuotationSalesReturnUpdateFormRef = useRef();
    function openQuotationSalesReturnUpdateForm(id) {
        QuotationSalesReturnUpdateFormRef.current.open(id);
    }

    const inputRefs = useRef({});
    const timerRef = useRef(null);
    const customerSearchRef = useRef();
    const vendorSearchRef = useRef();

    let [showInvoiceTypeSelection, setShowInvoiceTypeSelection] = useState(false);

    function openInvoiceTypeSelection(paymentIndex) {
        if (formData.type === "customer" && !formData.customer_id) {
            infoMessage = "Please select a customer first then try again!";
            setInfoMessage(infoMessage);
            showInfo = true;
            setShowInfo(showInfo);
            return;
        }

        if (formData.type === "vendor" && !formData.vendor_id) {
            infoMessage = "Please select a vendor first then try again!";
            setInfoMessage(infoMessage);
            showInfo = true;
            setShowInfo(showInfo);
            return;
        }

        selectedPaymentIndex = paymentIndex;
        setSelectedPaymentIndex(selectedPaymentIndex);

        if (formData.type === "customer") {
            showInvoiceTypeSelection = true;
            setShowInvoiceTypeSelection(showInvoiceTypeSelection);
        } else if (formData.type === "vendor") {
            // openPurchaseReturns();
            openPurchases();
        }

        /*
        if (store?.settings?.quotation_invoice_accounting) {
            showInvoiceTypeSelection = true;
            setShowInvoiceTypeSelection(showInvoiceTypeSelection);
        } else {
            openSales();
        }*/
    }

    const SalesReturnsRef = useRef();
    function openSalesReturns() {
        showInvoiceTypeSelection = false;
        setShowInvoiceTypeSelection(showInvoiceTypeSelection);

        let selectedPaymentStatusList = [
            {
                id: "not_paid",
                name: "Not Paid",
            },
            {
                id: "paid_partially",
                name: "Paid partially",
            }
        ];
        SalesReturnsRef.current.open(true, selectedCustomers, selectedPaymentStatusList);
    }

    const PurchasesRef = useRef();
    function openPurchases() {
        let selectedPaymentStatusList = [
            {
                id: "not_paid",
                name: "Not Paid",
            },
            {
                id: "paid_partially",
                name: "Paid partially",
            }
        ];
        PurchasesRef.current.open(true, selectedVendors, selectedPaymentStatusList);
    }

    const QuotationSalesReturnsRef = useRef();
    function openQuotationSalesReturns() {
        showInvoiceTypeSelection = false;
        setShowInvoiceTypeSelection(showInvoiceTypeSelection);

        let selectedPaymentStatusList = [
            {
                id: "not_paid",
                name: "Not Paid",
            },
            {
                id: "paid_partially",
                name: "Paid partially",
            }
        ];
        QuotationSalesReturnsRef.current.open(true, selectedCustomers, selectedPaymentStatusList);
    }


    function ValidateTypeChange(newType) {
        delete errors["type"];
        setErrors({ ...errors });

        for (let i = 0; i < formData.payments?.length; i++) {
            delete errors["customer_payable_payment_invoice_" + i];
            setErrors({ ...errors });

            if (formData.type === "vendor" && newType === "customer") {
                if (formData.payments[i].invoice_type === "purchase") {
                    errors["type"] = "Please remvoe purchase invoices linked to your payments and try again";
                    errors["customer_payable_payment_invoice_" + i] = "Remove this purchase invoice and try again"
                    setErrors({ ...errors });
                    return false;
                }
            } else if (formData.type === "customer" && newType === "vendor") {
                if (formData.payments[i].invoice_type === "sales_return") {
                    errors["type"] = "Please remvoe sales return invoices linked to your payments and try again";
                    errors["customer_payable_payment_invoice_" + i] = "Remove this sales return invoice and try again"
                    setErrors({ ...errors });
                    return false;
                }

                if (formData.payments[i].invoice_type === "quotation_sales_return") {
                    errors["type"] = "Please remvoe quotation sales return invoices linked to your payments and try again";
                    errors["customer_payable_payment_invoice_" + i] = "Remove this quotation sales return invoice and try again"
                    setErrors({ ...errors });
                    return false;
                }
            }
        }
        return true;
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

    const dragRef = useRef(null);

    return (
        <>
            <Modal show={showInvoiceTypeSelection} onHide={() => {
                showInvoiceTypeSelection = false;
                setShowInvoiceTypeSelection(showInvoiceTypeSelection);
            }}
                backdrop={false}
                keyboard={false}
                centered={false}
                enforceFocus={false}
                dialogAs={({ children, ...props }) => (
                    <Draggable handle=".modal-header" nodeRef={dragRef}>
                        <div
                            ref={dragRef}
                            className="modal-dialog"
                            {...props}
                            style={{
                                position: "absolute",
                                top: "27%",
                                left: "27%",
                                transform: "translate(-50%, -50%)",
                                margin: "0",
                                zIndex: 1055,
                                maxWidth: "600px", // or "90%" for responsive
                                width: "100%",
                            }}
                        >
                            <div className="modal-content">{children}</div>
                        </div>
                    </Draggable>
                )}
            >
                <Modal.Header closeButton>
                    <Modal.Title>Select Invoice Type</Modal.Title>
                </Modal.Header>
                <Modal.Body className="d-flex justify-content-around">
                    {formData.type === "customer" && <>
                        <Button variant="primary" onClick={() => {
                            openSalesReturns();
                        }}>
                            Sales Return Invoices
                        </Button>
                        <Button variant="secondary" onClick={() => {
                            openQuotationSalesReturns();
                        }}>
                            Quotation Sales Return Invoices
                        </Button>
                    </>}
                </Modal.Body>
            </Modal>

            <InfoDialog
                show={showInfo}
                message={infoMessage}
                onClose={() => setShowInfo(false)}
            />
            <PurchaseCreate ref={PurchaseUpdateFormRef} />
            <SalesReturnCreate ref={SalesReturnUpdateFormRef} />
            <QuotationSalesReturnCreate ref={QuotationSalesReturnUpdateFormRef} />
            <CustomerDepositPreview ref={PreviewRef} />
            <Customers ref={CustomersRef} onSelectCustomer={handleSelectedCustomer} showToastMessage={props.showToastMessage} />
            <Vendors ref={VendorsRef} onSelectVendor={handleSelectedVendor} showToastMessage={props.showToastMessage} />
            <SalesReturns ref={SalesReturnsRef} onSelectSalesReturn={handleSelectedSalesReturn} showToastMessage={props.showToastMessage} />
            <Purchases ref={PurchasesRef} onSelectPurchase={handleSelectedPurchase} showToastMessage={props.showToastMessage} />
            <QuotationSalesReturns ref={QuotationSalesReturnsRef} onSelectQuotationSalesReturn={handleSelectedQuotationSalesReturn} showToastMessage={props.showToastMessage} />
            <CustomerCreate ref={CustomerCreateFormRef} openDetailsView={openCustomerDetailsView} showToastMessage={props.showToastMessage} />
            <VendorCreate ref={VendorCreateFormRef} showToastMessage={props.showToastMessage} />
            <CustomerView ref={CustomerDetailsViewRef} showToastMessage={props.showToastMessage} />
            <Modal show={show} fullscreen onHide={handleClose} animation={false} backdrop="static" scrollable={true}>
                <Modal.Header>
                    <Modal.Title>
                        {formData.id ? "Update Payable #" + formData.code : "Create New Payable"}
                    </Modal.Title>


                    <div className="col align-self-end text-end">
                        &nbsp;&nbsp;
                        <Button variant="primary" onClick={openPreview}>
                            <i className="bi bi-printer"></i> Print
                        </Button>
                        &nbsp;&nbsp;

                        {formData.id ? <Button variant="primary" onClick={() => {
                            handleClose();
                            if (props.openDetailsView)
                                props.openDetailsView(formData.id);
                        }}>
                            <i className="bi bi-eye"></i> View Detail
                        </Button> : ""}
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
                            {formData.id && !isProcessing ? "Update" : !isProcessing ? "Create" : ""}
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
                    <form className="row g-3 needs-validation" onSubmit={handleCreate}>

                        <div className="row mt-2" >
                            <div className="col-md-2">
                                <label className="form-label">Type*</label>

                                <div className="input-group mb-3">
                                    <select
                                        value={formData.type}
                                        onChange={(e) => {

                                            if (!e.target.value) {
                                                formData.type = "";
                                                errors["type"] = "Invalid type";
                                                setErrors({ ...errors });
                                                return;
                                            }

                                            delete errors["type"];
                                            setErrors({ ...errors });

                                            if (ValidateTypeChange(e.target.value)) {
                                                formData.type = e.target.value;
                                                setFormData({ ...formData });
                                                console.log(formData);
                                            }


                                        }}
                                        className="form-control"
                                    >
                                        <option value="customer" SELECTED>Customer</option>
                                        <option value="vendor">Vendor</option>

                                    </select>
                                </div>
                                {errors.type && (
                                    <div style={{ color: "red" }}>
                                        {errors.type}
                                    </div>
                                )}
                            </div>

                            <div className="col-md-4">
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
                        </div>


                        <div className="row">
                            {formData.type === "customer" && <>
                                <div className="col-md-10" style={{ border: "solid 0px" }}>
                                    <label className="form-label">Customer*</label>
                                    <Typeahead
                                        id="customer_id"
                                        labelKey="search_label"
                                        isLoading={false}
                                        filterBy={() => true}
                                        isInvalid={errors.customer_id ? true : false}
                                        open={openCustomerSearchResult}
                                        onChange={(selectedItems) => {
                                            errors.customer_id = "";
                                            setErrors(errors);
                                            if (selectedItems.length === 0) {
                                                // errors.customer_id = "Invalid Customer selected";
                                                //setErrors(errors);
                                                formData.customer_id = "";
                                                setFormData({ ...formData });
                                                setSelectedCustomers([]);
                                                return;
                                            }
                                            formData.customer_id = selectedItems[0].id;
                                            if (selectedItems[0].use_remarks_in_sales && selectedItems[0].remarks) {
                                                formData.remarks = selectedItems[0].remarks;
                                            }

                                            setFormData({ ...formData });
                                            setSelectedCustomers(selectedItems);
                                            openCustomerSearchResult = false;
                                            setOpenCustomerSearchResult(false);
                                        }}

                                        options={customerOptions}
                                        placeholder="Customer Name / Mob / VAT # / ID"
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
                                                openCustomerSearchResult = false;
                                                setOpenCustomerSearchResult(false);
                                                customerSearchRef.current?.clear();
                                            }
                                        }}
                                        onInputChange={(searchTerm, e) => {
                                            if (searchTerm) {
                                                formData.customerName = searchTerm;
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
                                                            <div style={{ width: '10%' }}>ID</div>
                                                            <div style={{ width: '47%' }}>Name</div>
                                                            <div style={{ width: '10%' }}>Phone</div>
                                                            <div style={{ width: '13%' }}>VAT</div>
                                                            <div style={{ width: '10%' }}>Credit Balance</div>
                                                            <div style={{ width: '10%' }}>Credit Limit</div>
                                                        </div>
                                                    </MenuItem>

                                                    {/* Rows */}
                                                    {results.map((option, index) => {
                                                        const isActive = state.activeIndex === index;
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
                                                                        {option.credit_balance && (
                                                                            <Amount amount={trimTo2Decimals(option.credit_balance)} />
                                                                        )}
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
                                    <Button hide={true.toString()} onClick={openCustomerCreateForm} className="btn btn-outline-secondary btn-primary btn-sm" type="button" id="button-addon1"> <i className="bi bi-plus-lg"></i> New</Button>


                                    {errors.customer_id && (
                                        <div style={{ color: "red" }}>
                                            {errors.customer_id}
                                        </div>
                                    )}

                                </div>
                                <div className="col-md-1">
                                    <Button className="btn btn-primary" style={{ marginTop: "30px" }} onClick={openCustomers}>
                                        <i className="bi bi-list"></i>
                                    </Button>
                                </div>
                            </>}


                            {formData.type === "vendor" && <>
                                <div className="col-md-10" style={{ border: "solid 0px" }}>
                                    <label className="form-label">Vendor*</label>
                                    <Typeahead
                                        id="vendor_id"
                                        labelKey="search_label"
                                        isLoading={false}
                                        filterBy={() => true}
                                        isInvalid={errors.vendor_id ? true : false}
                                        open={openVendorSearchResult}
                                        onChange={(selectedItems) => {
                                            delete errors.vendor_id;
                                            setErrors(errors);
                                            if (selectedItems.length === 0) {
                                                formData.vendor_id = "";
                                                setFormData({ ...formData });
                                                setSelectedVendors([]);
                                                return;
                                            }

                                            formData.vendor_id = selectedItems[0].id;

                                            if (selectedItems[0].use_remarks_in_sales && selectedItems[0].remarks) {
                                                formData.remarks = selectedItems[0].remarks;
                                            }

                                            setFormData({ ...formData });
                                            setSelectedVendors(selectedItems);

                                            openVendorSearchResult = false;
                                            setOpenVendorSearchResult(false);
                                        }}
                                        options={vendorOptions}
                                        placeholder="Vendor Name | Mob | VAT # | ID"
                                        selected={selectedVendors}
                                        highlightOnlyResult={true}
                                        ref={vendorSearchRef}
                                        onKeyDown={(e) => {
                                            if (e.key === "Escape") {
                                                delete errors.vendor_id;
                                                //setErrors(errors);
                                                formData.vendor_id = "";
                                                formData.vendor_name = "";

                                                setFormData({ ...formData });
                                                setSelectedVendors([]);
                                                setVendorOptions([]);
                                                openVendorSearchResult = false;
                                                setOpenVendorSearchResult(false);
                                                vendorSearchRef.current?.clear();
                                            }
                                        }}
                                        onInputChange={(searchTerm, e) => {
                                            if (searchTerm) {
                                                formData.vendorName = searchTerm;
                                            }
                                            if (timerRef.current) clearTimeout(timerRef.current);
                                            timerRef.current = setTimeout(() => {
                                                suggestVendors(searchTerm);
                                            }, 100);
                                        }}

                                        renderMenu={(results, menuProps, state) => {
                                            const searchWords = state.text.toLowerCase().split(" ").filter(Boolean);

                                            return (
                                                <Menu {...menuProps}>
                                                    {/* Header */}
                                                    <MenuItem disabled>
                                                        <div style={{ display: 'flex', fontWeight: 'bold', padding: '4px 8px', borderBottom: '1px solid #ddd' }}>
                                                            <div style={{ width: '10%' }}>ID</div>
                                                            <div style={{ width: '47%' }}>Name</div>
                                                            <div style={{ width: '10%' }}>Phone</div>
                                                            <div style={{ width: '13%' }}>VAT</div>
                                                            <div style={{ width: '10%' }}>Credit Balance</div>
                                                            <div style={{ width: '10%' }}>Credit Limit</div>
                                                        </div>
                                                    </MenuItem>

                                                    {/* Rows */}
                                                    {results.map((option, index) => {
                                                        const isActive = state.activeIndex === index;
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
                                                                        {option.credit_balance && (
                                                                            <Amount amount={trimTo2Decimals(option.credit_balance)} />
                                                                        )}
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
                                    <Button hide={true.toString()} onClick={openVendorCreateForm} className="btn btn-outline-secondary btn-primary btn-sm" type="button" id="button-addon1"> <i className="bi bi-plus-lg"></i> New</Button>

                                    {errors.vendor_id && (
                                        <div style={{ color: "red" }}>
                                            {errors.vendor_id}
                                        </div>
                                    )}
                                </div>
                                <div className="col-md-1">
                                    <Button className="btn btn-primary" style={{ marginTop: "30px" }} onClick={openVendors}>
                                        <i className="bi bi-list"></i>
                                    </Button>
                                </div>
                            </>}
                        </div>


                        <div className="col-md-12">
                            <label className="form-label">Payments</label>
                            {errors.payments && (
                                <div style={{ color: "red" }}>
                                    {errors.payments}
                                </div>
                            )}

                            <div className="table-responsive" style={{}}>
                                <Button variant="secondary" style={{ alignContent: "right", marginBottom: "10px" }} onClick={addNewPayment}>
                                    Create new payment
                                </Button>
                                <table className="table table-striped table-sm table-bordered">
                                    {formData.payments && formData.payments.length > 0 &&
                                        <thead style={{ textAlign: "center" }}>
                                            <th style={{ minWidth: "190px" }}>
                                                Date
                                            </th>
                                            <th style={{ minWidth: "130px" }}>
                                                Amount
                                            </th>
                                            <th style={{ minWidth: "130px" }}>
                                                Discount
                                            </th>
                                            <th style={{ minWidth: "180px" }}>
                                                Invoice
                                            </th>
                                            <th style={{ minWidth: "130px" }}>
                                                Payment method
                                            </th>
                                            <th style={{ minWidth: "140px" }}>
                                                Bank Reference #
                                            </th>
                                            <th style={{ minWidth: "140px" }} >
                                                Description
                                            </th>
                                            <th style={{ minWidth: "100px" }}>
                                                Action
                                            </th>
                                        </thead>}
                                    <tbody>
                                        {formData.payments &&
                                            formData.payments.filter(payment => !payment.deleted).map((payment, key) => (
                                                <tr key={key}>
                                                    <td>
                                                        <DatePicker
                                                            id="payment_date_str"
                                                            selected={formData.payments[key].date_str ? new Date(formData.payments[key].date_str) : null}
                                                            value={formData.payments[key].date_str ? format(
                                                                new Date(formData.payments[key].date_str),
                                                                "MMMM d, yyyy h:mm aa"
                                                            ) : null}
                                                            className="form-control"
                                                            dateFormat="MMMM d, yyyy h:mm aa"
                                                            showTimeSelect
                                                            timeIntervals="1"
                                                            onChange={(value) => {
                                                                console.log("Value", value);
                                                                formData.payments[key].date_str = value;
                                                                setFormData({ ...formData });
                                                            }}
                                                        />
                                                        {errors["customer_payable_payment_date_" + key] && (
                                                            <div style={{ color: "red" }}>

                                                                {errors["customer_payable_payment_date_" + key]}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td >
                                                        <input type='number' id={`${"customer_payable_payment_amount_" + key}`} name={`${"customer_payable_payment_amount_" + key}`} value={formData.payments[key].amount} className="form-control "
                                                            ref={(el) => {
                                                                if (!inputRefs.current[key]) inputRefs.current[key] = {};
                                                                inputRefs.current[key][`${"customer_payable_payment_amount_" + key}`] = el;
                                                            }}
                                                            onFocus={() => {
                                                                if (timerRef.current) clearTimeout(timerRef.current);
                                                                timerRef.current = setTimeout(() => {
                                                                    inputRefs.current[key][`${"customer_payable_payment_amount_" + key}`].select();
                                                                }, 100);
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (timerRef.current) clearTimeout(timerRef.current);

                                                                if (e.key === "ArrowLeft") {
                                                                    timerRef.current = setTimeout(() => {
                                                                        if (key > 0) {
                                                                            inputRefs.current[key - 1][`${"customer_payable_description_" + (key - 1)}`]?.focus();
                                                                        }
                                                                    }, 100);
                                                                } else if (e.key === "Enter") {
                                                                    timerRef.current = setTimeout(() => {
                                                                        inputRefs.current[key][`${"customer_payable_payment_method_" + key}`].focus();
                                                                    }, 100);
                                                                }
                                                            }}

                                                            onChange={(e) => {
                                                                errors["customer_payable_payment_amount_" + key] = "";
                                                                setErrors({ ...errors });

                                                                if (!e.target.value) {
                                                                    formData.payments[key].amount = e.target.value;
                                                                    setFormData({ ...formData });
                                                                    findTotalPayments();
                                                                    //  validatePaymentAmounts();
                                                                    return;
                                                                }

                                                                formData.payments[key].amount = parseFloat(e.target.value);

                                                                // validatePaymentAmounts();
                                                                findTotalPayments();
                                                                setFormData({ ...formData });
                                                                console.log(formData);
                                                            }}
                                                        />
                                                        {errors["customer_payable_payment_amount_" + key] && (
                                                            <div style={{ color: "red", fontSize: "10px" }}>

                                                                {errors["customer_payable_payment_amount_" + key]}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <input
                                                            type='number'
                                                            id={`${"customer_payable_payment_discount_" + key}`}
                                                            name={`${"customer_payable_payment_discount_" + key}`}
                                                            value={formData.payments[key].discount}
                                                            className="form-control "
                                                            ref={(el) => {
                                                                if (!inputRefs.current[key]) inputRefs.current[key] = {};
                                                                inputRefs.current[key][`${"customer_payable_payment_discount_" + key}`] = el;
                                                            }}
                                                            onFocus={() => {
                                                                if (timerRef.current) clearTimeout(timerRef.current);
                                                                timerRef.current = setTimeout(() => {
                                                                    inputRefs.current[key][`${"customer_payable_payment_discount_" + key}`].select();
                                                                }, 100);
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (timerRef.current) clearTimeout(timerRef.current);

                                                                if (e.key === "ArrowLeft") {
                                                                    timerRef.current = setTimeout(() => {
                                                                        inputRefs.current[key][`${"customer_payable_payment_amount_" + (key)}`]?.focus();
                                                                    }, 100);
                                                                } else if (e.key === "Enter") {
                                                                    timerRef.current = setTimeout(() => {
                                                                        inputRefs.current[key][`${"customer_payable_payment_method_" + key}`].focus();
                                                                    }, 100);
                                                                }
                                                            }}

                                                            onChange={(e) => {
                                                                errors["customer_payable_payment_discount_" + key] = "";
                                                                setErrors({ ...errors });

                                                                if (!e.target.value) {
                                                                    formData.payments[key].discount = e.target.value;
                                                                    setFormData({ ...formData });
                                                                    findTotalPayments();
                                                                    //  validatePaymentAmounts();
                                                                    return;
                                                                }

                                                                formData.payments[key].discount = parseFloat(e.target.value);

                                                                // validatePaymentAmounts();
                                                                findTotalPayments();
                                                                setFormData({ ...formData });
                                                                console.log(formData);
                                                            }}
                                                        />
                                                        {errors["customer_payable_payment_discount_" + key] && (
                                                            <div style={{ color: "red", fontSize: "10px" }}>
                                                                {errors["customer_payable_payment_discount_" + key]}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <div className="row" style={{ border: "solid 0px" }}>
                                                            <div className="" style={{ border: "solid 0px", maxWidth: "140px", fontSize: "12px" }}>
                                                                <span style={{ cursor: "pointer", color: "blue" }} onClick={() => {
                                                                    if (formData.payments[key].invoice_type === "purchase") {
                                                                        openPurchaseUpdateForm(formData.payments[key].invoice_id);
                                                                    } else if (formData.payments[key].invoice_type === "quotation_sales_return") {
                                                                        openQuotationSalesReturnUpdateForm(formData.payments[key].invoice_id);
                                                                    } else if (formData.payments[key].invoice_type === "sales_return") {
                                                                        openSalesReturnUpdateForm(formData.payments[key].invoice_id);
                                                                    }

                                                                }}>{formData.payments[key].invoice_code}</span>
                                                                {formData.payments[key].invoice_code && <span className="text-danger"
                                                                    style={{ cursor: "pointer", fontSize: "0.75rem", marginLeft: "3px" }}
                                                                    onClick={() => {
                                                                        confirmInvoiceRemoval(key)
                                                                    }}
                                                                >
                                                                    ❌
                                                                </span>}
                                                            </div>
                                                            <div className="" style={{ border: "solid 0px", width: "40px" }}>
                                                                <Button className="btn btn-primary" style={{ marginLeft: "-12px" }} onClick={() => {
                                                                    openInvoiceTypeSelection(key);
                                                                }}>
                                                                    <i className="bi bi-list"></i>
                                                                </Button>
                                                            </div>
                                                        </div>
                                                        {errors["customer_payable_payment_invoice_" + key] && (
                                                            <div style={{ color: "red" }}>

                                                                {errors["customer_payable_payment_invoice_" + key]}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td >
                                                        <select
                                                            id={`${"customer_payable_payment_method_" + key}`} name={`${"customer_payable_payment_method_" + key}`}
                                                            value={formData.payments[key].method} className="form-control "
                                                            ref={(el) => {
                                                                if (!inputRefs.current[key]) inputRefs.current[key] = {};
                                                                inputRefs.current[key][`${"customer_payable_payment_method_" + key}`] = el;
                                                            }}
                                                            onFocus={() => {
                                                                /*
                                                                if (timerRef.current) clearTimeout(timerRef.current);
                                                                timerRef.current = setTimeout(() => {
                                                                    inputRefs.current[key][`${"customer_payable_payment_method_" + key}`].select();
                                                                }, 100);*/
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (timerRef.current) clearTimeout(timerRef.current);
                                                                if (e.key === "ArrowLeft") {
                                                                    timerRef.current = setTimeout(() => {
                                                                        inputRefs.current[key][`${"customer_payable_payment_discount_" + key}`].focus();
                                                                    }, 100);
                                                                }
                                                            }}
                                                            onChange={(e) => {
                                                                // errors["payment_method"] = [];
                                                                errors["customer_payable_payment_method_" + key] = "";
                                                                setErrors({ ...errors });

                                                                if (!e.target.value) {
                                                                    errors["customer_payable_payment_method_" + key] = "Payment method is required";
                                                                    setErrors({ ...errors });

                                                                    formData.payments[key].method = "";
                                                                    setFormData({ ...formData });
                                                                    return;
                                                                }


                                                                formData.payments[key].method = e.target.value;
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
                                                        </select>
                                                        {errors["customer_payable_payment_method_" + key] && (
                                                            <div style={{ color: "red" }}>

                                                                {errors["customer_payable_payment_method_" + key]}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td >
                                                        <input type='text' id={`${"customer_payable_bank_reference_" + key}`} name={`${"customer_payable_bank_reference_" + key}`}
                                                            value={formData.payments[key].bank_reference} className="form-control "
                                                            ref={(el) => {
                                                                if (!inputRefs.current[key]) inputRefs.current[key] = {};
                                                                inputRefs.current[key][`${"customer_payable_bank_reference_" + key}`] = el;
                                                            }}
                                                            onFocus={() => {
                                                                if (timerRef.current) clearTimeout(timerRef.current);
                                                                timerRef.current = setTimeout(() => {
                                                                    inputRefs.current[key][`${"customer_payable_bank_reference_" + key}`].select();
                                                                }, 100);
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (timerRef.current) clearTimeout(timerRef.current);
                                                                if (e.key === "ArrowLeft") {
                                                                    timerRef.current = setTimeout(() => {
                                                                        inputRefs.current[key][`${"customer_payable_payment_method_" + key}`].focus();
                                                                    }, 100);
                                                                }
                                                            }}
                                                            onChange={(e) => {
                                                                errors["customer_payable_bank_reference_" + key] = "";
                                                                setErrors({ ...errors });

                                                                if (!e.target.value) {
                                                                    formData.payments[key].bank_reference = e.target.value;
                                                                    setFormData({ ...formData });

                                                                    return;
                                                                }

                                                                formData.payments[key].bank_reference = e.target.value;
                                                                setFormData({ ...formData });
                                                            }}
                                                        />
                                                        {errors["customer_payable_bank_reference_" + key] && (
                                                            <div style={{ color: "red" }}>
                                                                {errors["customer_payable_bank_reference_" + key]}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <input type='text' id={`${"customer_payable_description_" + key}`} name={`${"customer_payable_description_" + key}`}
                                                            value={formData.payments[key].description} className="form-control "
                                                            ref={(el) => {
                                                                if (!inputRefs.current[key]) inputRefs.current[key] = {};
                                                                inputRefs.current[key][`${"customer_payable_description_" + key}`] = el;
                                                            }}
                                                            onFocus={() => {
                                                                if (timerRef.current) clearTimeout(timerRef.current);
                                                                timerRef.current = setTimeout(() => {
                                                                    inputRefs.current[key][`${"customer_payable_description_" + key}`].select();
                                                                }, 100);
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (timerRef.current) clearTimeout(timerRef.current);

                                                                if (e.key === "Enter") {
                                                                    if ((key + 1) < formData.payments?.length && formData.payments?.length > 1) {
                                                                        console.log("Moving to next line");
                                                                        timerRef.current = setTimeout(() => {
                                                                            inputRefs.current[key + 1][`${"customer_payable_payment_amount_" + (key + 1)}`]?.focus();
                                                                        }, 100);
                                                                    } else {
                                                                        if ((key + 1) === formData.payments?.length) {
                                                                            timerRef.current = setTimeout(() => {
                                                                                inputRefs.current[0][`${"customer_payable_payment_amount_0"}`]?.focus();
                                                                            }, 100);
                                                                        } else {
                                                                            timerRef.current = setTimeout(() => {
                                                                                inputRefs.current[key][`${"customer_payable_payment_amount_" + (key)}`]?.focus();
                                                                            }, 100);
                                                                        }

                                                                    }
                                                                } else if (e.key === "ArrowLeft") {
                                                                    timerRef.current = setTimeout(() => {
                                                                        inputRefs.current[key][`${"customer_payable_bank_reference_" + key}`].focus();
                                                                    }, 100);
                                                                }
                                                            }}

                                                            onChange={(e) => {
                                                                errors["customer_payable_description_" + key] = "";
                                                                setErrors({ ...errors });

                                                                if (!e.target.value) {
                                                                    formData.payments[key].description = e.target.value;
                                                                    setFormData({ ...formData });

                                                                    return;
                                                                }

                                                                formData.payments[key].description = e.target.value;
                                                                setFormData({ ...formData });
                                                            }}
                                                        />
                                                        {errors["customer_payable_description_" + key] && (
                                                            <div style={{ color: "red" }}>
                                                                {errors["customer_payable_description_" + key]}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td >
                                                        <Button variant="danger" onClick={(event) => {
                                                            removePayment(key);
                                                        }}>
                                                            Remove
                                                        </Button>

                                                    </td>
                                                </tr>
                                            ))}
                                        <tr>
                                            <td className="text-end">
                                                <b>Net Total</b>
                                            </td>
                                            <td><b style={{ marginLeft: "14px" }}>{trimTo2Decimals(totalPaymentAmount)}</b>
                                                {errors["total_payment"] && (
                                                    <div style={{ color: "red" }}>
                                                        {errors["total_payment"]}
                                                    </div>
                                                )}
                                            </td>
                                            <td colSpan={5}>

                                            </td>

                                        </tr>
                                    </tbody>
                                </table>

                            </div>
                        </div>

                        {/*<div className="col-md-3">
                            <label className="form-label">Amount*</label>

                            <div className="input-group mb-3">
                                <input
                                    id="customer_withdrawal_amount"
                                    name="customer_withdrawal_amount"
                                    value={formData.amount ? formData.amount : ""}
                                    type='number'
                                    onChange={(e) => {
                                        errors["amount"] = "";
                                        setErrors({ ...errors });
                                        formData.amount = parseFloat(e.target.value);
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"

                                    placeholder="Amount"
                                />


                            </div>
                            {errors.amount && (
                                <div style={{ color: "red" }}>
                                    {errors.amount}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Payment method*</label>

                            <div className="input-group mb-3">
                                <select
                                    value={formData.payment_method}
                                    onChange={(e) => {
                                        console.log("Inside onchange payment method");
                                        if (!e.target.value) {
                                            formData.payment_method = "";
                                            errors["status"] = "Invalid Payment Method";
                                            setErrors({ ...errors });
                                            return;
                                        }

                                        errors["payment_method"] = "";
                                        setErrors({ ...errors });

                                        formData.payment_method = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                >
                                    <option value="" SELECTED>Select</option>
                                    <option value="cash">Cash</option>
                                    <option value="debit_card">Debit Card</option>
                                    <option value="credit_card">Credit Card</option>
                                    <option value="bank_card">Bank Card</option>
                                    <option value="bank_transfer">Bank Transfer</option>
                                    <option value="bank_cheque">Bank Cheque</option>
                                </select>

                            </div>
                            {errors.payment_method && (
                                <div style={{ color: "red" }}>

                                    {errors.payment_method}
                                </div>
                            )}
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">Bank Ref. No.</label>
                            <div className="input-group mb-3">
                                <input
                                    id="customer_withdrawal_bank_ref"
                                    name="customer_withdrawal_bank_ref"
                                    value={formData.bank_reference_no ? formData.bank_reference_no : ""}
                                    type='text'
                                    onChange={(e) => {
                                        errors["bank_reference_no"] = "";
                                        setErrors({ ...errors });
                                        formData.bank_reference_no = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"

                                    placeholder="Bank reference no."
                                />
                            </div>
                            {errors.bank_reference_no && (
                                <div style={{ color: "red" }}>
                                    {errors.bank_reference_no}
                                </div>
                            )}
                        </div>
                        <div className="col-md-3">
                            <label className="form-label">Description</label>
                            <div className="input-group mb-3">
                                <textarea
                                    value={formData.description ? formData.description : ""}
                                    type='string'
                                    onChange={(e) => {
                                        errors["description"] = "";
                                        setErrors({ ...errors });
                                        formData.description = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control description"
                                    id="description"
                                    placeholder="Description"
                                />
                                {errors.description && (
                                    <div style={{ color: "red" }}>
                                        {errors.description}
                                    </div>
                                )}
                            </div>
                        </div>*/}
                        <div className="col-md-3">
                            <label className="form-label">Remarks</label>
                            <div className="input-group mb-3">
                                <textarea
                                    value={formData.remarks ? formData.remarks : ""}
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
                        <Modal.Footer>
                            <Button variant="secondary" onClick={handleClose}>
                                Close
                            </Button>
                            <Button variant="primary" onClick={handleCreate} >
                                {isProcessing ?
                                    <Spinner
                                        as="span"
                                        animation="bcustomerwithdrawal"
                                        size="sm"
                                        role="status"
                                        aria-hidden={true}
                                    /> + " Processing..."

                                    : formData.id ? "Update" : "Create"
                                }
                            </Button>
                        </Modal.Footer>
                    </form>
                </Modal.Body>

            </Modal >


        </>
    );
});

export default CustomerWithdrawalCreate;
