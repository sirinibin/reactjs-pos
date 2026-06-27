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
            setPendingAttachments([]);
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
                        if ((event.target.getAttribute("class") || "").includes("description")) {
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

    async function suggestCustomers(searchTerm) {
        console.log("Inside handle suggestCustomers");
        setCustomerOptions([]);


        console.log("searchTerm:" + searchTerm);

        if (!searchTerm) {
            setTimeout(() => {
                openCustomerSearchResult = false;
                setOpenCustomerSearchResult(false);
            }, 300);
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
            "/v1/customer?limit=100&" + Select + queryString,
            requestOptions
        );
        let data = await result.json();

        if (!data.result || data.result.length === 0) {
            openCustomerSearchResult = false;
            setOpenCustomerSearchResult(false);
            return;
        }

        if (data.result) {
            const filtered = data.result.filter((opt) => customFilter(opt, searchTerm));
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
            setOpenCustomerSearchResult(sorted.length > 0);
        } else {
            setCustomerOptions([]);
            setOpenCustomerSearchResult(false);
        }

        //setIsCustomersLoading(false);
    }


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

    async function suggestVendors(searchTerm) {
        console.log("Inside handle suggestVendors");
        setCustomerOptions([]);

        console.log("searchTerm:" + searchTerm);
        if (!searchTerm) {

            setTimeout(() => {
                openVendorSearchResult = false;
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

        let Select = "select=id,credit_balance,credit_limit,additional_keywords,code,vat_no,name,phone,name_in_arabic,phone_in_arabic,search_label";
        // setIsCustomersLoading(true);
        let result = await fetch(
            "/v1/vendor?limit=100&" + Select + queryString,
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

        //setIsCustomersLoading(false);
    }

    function handleCreate(event) {
        if (isProcessing) {
            return;
        }

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


        formData.images_content = pendingAttachments.map(a => a.dataUrl.split(",")[1] || a.dataUrl);

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
    let [totalDiscountAmount, setTotalDiscountAmount] = useState(0.00);
    let [netTotalPaymentAmount, setNetTotalPaymentAmount] = useState(0.00);

    function findTotalPayments() {
        console.log("Inisde findTotalPayments")
        let totalPayment = 0.00;
        let totalDiscountAmount = 0.00;
        for (var i = 0; i < formData.payments?.length; i++) {
            if (formData.payments[i].amount && !formData.payments[i].deleted) {
                // totalPayment += (formData.payments[i].amount - formData.payments[i].discount);
                totalPayment += (formData.payments[i].amount);
                totalDiscountAmount += formData.payments[i].discount;
            }
        }

        totalPaymentAmount = parseFloat(trimTo2Decimals(totalPayment));
        netTotalPaymentAmount = totalPaymentAmount - parseFloat(trimTo2Decimals(totalDiscountAmount));
        netTotalPaymentAmount = parseFloat(trimTo2Decimals(netTotalPaymentAmount));

        setTotalPaymentAmount(totalPaymentAmount);
        setTotalDiscountAmount(totalDiscountAmount);
        setNetTotalPaymentAmount(netTotalPaymentAmount);
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
    // eslint-disable-next-line no-unused-vars
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

    // ── Attachments state & helpers ────────────────────────────────────────
    const [pendingAttachments, setPendingAttachments] = useState([]);
    // Lightbox state
    const [lightbox, setLightbox] = useState(null);
    function openLightbox(items, index) { setLightbox({ items, index }); }
    function closeLightbox() { setLightbox(null); }
    function lightboxPrev() { setLightbox(lb => ({ ...lb, index: lb.index === 0 ? lb.items.length - 1 : lb.index - 1 })); }
    function lightboxNext() { setLightbox(lb => ({ ...lb, index: lb.index === lb.items.length - 1 ? 0 : lb.index + 1 })); }

    function addAttachments(files) {
        const newItems = [];
        let remaining = files.length;
        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                newItems.push({ name: file.name, type: file.type, size: file.size, dataUrl: e.target.result });
                remaining--;
                if (remaining === 0) setPendingAttachments(prev => [...prev, ...newItems]);
            };
            reader.readAsDataURL(file);
        });
    }

    function removePendingAttachment(idx) {
        if (!window.confirm('Remove this attachment? Unsaved files will be discarded.')) return;
        setPendingAttachments(prev => prev.filter((_, i) => i !== idx));
    }

    function removeExistingAttachment(filename) {
        if (!window.confirm('Delete this attachment permanently? This cannot be undone.')) return;
        formData.images = (formData.images || []).filter(f => f !== filename);
        setFormData({ ...formData });
    }

    async function downloadServerFile(url, filename) {
        try {
            const response = await fetch(url, { headers: { 'Authorization': localStorage.getItem('access_token') } });
            if (!response.ok) throw new Error('Failed');
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl; a.download = filename;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        } catch (e) { window.open(url, '_blank'); }
    }
    function getFileIcon(type, name) {
        const ext = (name || '').toLowerCase().split('.').pop();
        if (type && (type.startsWith('image/') || ['jpg','jpeg','png','gif','webp','bmp','pjpeg'].includes(ext))) return 'bi-file-image';
        if (type === 'application/pdf' || ext === 'pdf') return 'bi-file-earmark-pdf';
        if (['xlsx','xls','csv'].includes(ext)) return 'bi-file-earmark-spreadsheet';
        if (['docx','doc'].includes(ext)) return 'bi-file-earmark-word';
        if (['txt','rtf'].includes(ext)) return 'bi-file-earmark-text';
        if (['zip','rar','7z'].includes(ext)) return 'bi-file-earmark-zip';
        return 'bi-file-earmark';
    }
    function getFileLabel(filename) {
        const ext = (filename || '').toLowerCase().split('.').pop();
        if (['jpg','jpeg','png','gif','webp','bmp','pjpeg'].includes(ext)) return 'Image';
        if (ext === 'pdf') return 'PDF Document';
        if (['xlsx','xls'].includes(ext)) return 'Spreadsheet';
        if (['docx','doc'].includes(ext)) return 'Word Document';
        if (['txt','rtf'].includes(ext)) return 'Text File';
        if (['zip','rar','7z'].includes(ext)) return 'Archive';
        if (ext) return ext.toUpperCase() + ' File';
        return 'File';
    }
    function isImageFile(filename, type) {
        const ext = (filename || '').toLowerCase().split('.').pop();
        return (type && type.startsWith('image/')) || ['jpg','jpeg','png','gif','webp','bmp','pjpeg'].includes(ext);
    }
    function downloadDataUrl(dataUrl, name) {
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = name;
        a.click();
    }

    function formatBytes(bytes) {
        if (!bytes) return "";
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
        return (bytes / 1048576).toFixed(1) + " MB";
    }
    // ──────────────────────────────────────────────────────────────────────

    // ── Design tokens ──────────────────────────────────────────────────────
    const CARD = { background: '#ffffff', border: '1px solid #c3c6d7', borderRadius: '8px', padding: '24px', marginBottom: '20px' };
    const INPUT = { border: '1px solid #c3c6d7', borderRadius: '4px', padding: '7px 12px', fontSize: '13px', fontFamily: '"Inter", sans-serif', width: '100%', outline: 'none', color: '#191c1e', background: '#fff' };

    const Label = ({ children, required }) => (
        <label style={{ display: 'block', fontFamily: '"Inter", sans-serif', fontSize: '13px', fontWeight: 600, color: '#191c1e', marginBottom: '4px' }}>
            {children}{required && <span style={{ color: '#ba1a1a', marginLeft: '2px' }}>*</span>}
        </label>
    );
    const ErrMsg = ({ children }) => (
        <div style={{ color: '#ba1a1a', fontSize: '12px', fontFamily: '"Inter", sans-serif', marginTop: '3px' }}>{children}</div>
    );
    const SectionTitle = ({ children, icon }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            {icon && <i className={`bi ${icon}`} style={{ fontSize: '18px', color: '#004ac6' }}></i>}
            <h3 style={{ fontFamily: '"Hanken Grotesk", sans-serif', fontSize: '16px', fontWeight: 600, color: '#191c1e', margin: 0 }}>{children}</h3>
        </div>
    );

    const NAV_TABS = [
        { id: 'party',       label: 'Customer / Vendor', icon: 'bi-people'      },
        { id: 'payments',    label: 'Payments',           icon: 'bi-credit-card' },
        { id: 'attachments', label: 'Attachments',        icon: 'bi-paperclip'  },
    ];

    const [activeTab, setActiveTab] = useState("party");
    // ──────────────────────────────────────────────────────────────────────

    function getErrorTab(key) {
        const k = key.toLowerCase();
        if (['image','photo','attachment'].some(f => k.includes(f))) return 'attachments';
        if (['payment','amount','date','discount','method','bank','description','reference'].some(f => k.includes(f))) return 'payments';
        return 'party';
    }

    const allErrors = Object.entries(errors).filter(([, v]) => v);
    const totalErrors = allErrors.length;

    const tabIds = NAV_TABS.map(t => t.id);
    const currentTabIndex = tabIds.indexOf(activeTab);
    const prevTab = tabIds[currentTabIndex - 1];
    const nextTab = tabIds[currentTabIndex + 1];

    return (
        <>
            {/* Attachment lightbox */}
            {lightbox && (
                <div onClick={closeLightbox} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <button onClick={e => { e.stopPropagation(); closeLightbox(); }} style={{ position: 'absolute', top: 16, right: 20, background: 'none', border: 'none', color: '#fff', fontSize: 28, cursor: 'pointer', zIndex: 2 }}>×</button>
                    {lightbox.items.length > 1 && (
                        <>
                            <button onClick={e => { e.stopPropagation(); lightboxPrev(); }} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: 28, width: 44, height: 44, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
                            <button onClick={e => { e.stopPropagation(); lightboxNext(); }} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: 28, width: 44, height: 44, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
                        </>
                    )}
                    <div onClick={e => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '90vh', position: 'relative' }}>
                        {lightbox.items[lightbox.index]?.isImg
                            ? <img src={lightbox.items[lightbox.index].url} alt="" style={{ maxWidth: '88vw', maxHeight: '86vh', objectFit: 'contain', borderRadius: 4 }} />
                            : <iframe src={lightbox.items[lightbox.index]?.url} title="attachment" style={{ width: '80vw', height: '80vh', border: 'none', borderRadius: 4, background: '#fff' }} />
                        }
                        {lightbox.items.length > 1 && (
                            <div style={{ textAlign: 'center', color: '#ccc', fontSize: 13, marginTop: 8 }}>
                                {lightbox.index + 1} / {lightbox.items.length}
                            </div>
                        )}
                    </div>
                </div>
            )}
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

            <Modal show={show} fullscreen onHide={handleClose} animation={false} backdrop="static" dialogClassName="pw-modal">
                <Modal.Header style={{ background: '#ffffff', borderBottom: '1px solid #c3c6d7', padding: '10px 20px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button type="button" onClick={handleClose}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#434655', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 600, fontFamily: 'Inter, sans-serif', padding: '4px 8px', borderRadius: '4px', flexShrink: 0 }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f0f2f4'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                        <i className="bi bi-arrow-left" style={{ fontSize: '16px' }}></i> Back
                    </button>
                    <Modal.Title style={{ fontFamily: '"Hanken Grotesk", sans-serif', fontSize: '17px', fontWeight: 700, color: '#191c1e', letterSpacing: '-0.01em', flex: 1 }}>
                        {formData.id ? "Update Payment" : "Create New Payment"}
                    </Modal.Title>
                    <div className="d-flex align-items-center gap-2">
                        {formData.id && (
                            <button type="button"
                                style={{ background: '#d0e1fb', color: '#54647a', border: 'none', borderRadius: '4px', padding: '6px 14px', fontSize: '13px', fontWeight: 600, fontFamily: '"Inter", sans-serif', cursor: 'pointer' }}
                                onClick={() => { handleClose(); if (props.openDetailsView) props.openDetailsView(formData.id); }}>
                                <i className="bi bi-eye me-1"></i>View Detail
                            </button>
                        )}
                        <button type="button"
                            style={{ background: '#004ac6', color: '#ffffff', border: 'none', borderRadius: '4px', padding: '6px 18px', fontSize: '13px', fontWeight: 600, fontFamily: '"Inter", sans-serif', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            onClick={handleCreate} disabled={isProcessing}>
                            {isProcessing && <Spinner as="span" animation="border" size="sm" role="status" aria-hidden={true} />}
                            {formData.id ? 'Update' : 'Create'}
                        </button>
                        <button type="button" className="btn-close ms-1" onClick={handleClose} aria-label="Close" />
                    </div>
                </Modal.Header>
                <style>{`
                  @keyframes fadeInDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
                  input[type="number"]::-webkit-outer-spin-button,
                  input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
                  input[type="number"] { -moz-appearance: textfield; }
                  .pw-modal .modal-content { display: flex; flex-direction: column; height: 100%; }
                  .pw-body { padding: 0 !important; overflow: hidden !important; display: flex !important; flex-direction: column !important; flex: 1 !important; min-height: 0 !important; }
                  .pw-form { display: flex; width: 100%; flex: 1; min-height: 0; }
                  .pw-sidebar { width: 200px; background: #f2f4f6; border-right: 1px solid #c3c6d7; padding: 16px 10px; flex-shrink: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; }
                  .pw-sidebar-header { margin-bottom: 16px; }
                  .pw-content { flex: 1; display: flex; flex-direction: column; background: #f7f9fb; min-width: 0; overflow: hidden; }
                  .pw-tab-wrap { max-width: 100%; }
                  .pw-price-cards .col-md-4 { margin-bottom: 16px; }
                  @media (max-width: 767px) {
                    .pw-form { flex-direction: column; }
                    .pw-sidebar { width: 100%; height: auto; flex-direction: row; overflow-x: auto; overflow-y: hidden; border-right: none; border-bottom: 1px solid #c3c6d7; padding: 6px 8px; gap: 4px; }
                    .pw-sidebar-header { display: none; }
                    .pw-sidebar button { flex-shrink: 0; white-space: nowrap; padding: 8px 12px !important; }
                    .pw-content-scroll { padding: 14px 16px !important; }
                    .pw-tab-wrap { max-width: 100%; }
                  }
                  @media (min-width: 768px) and (max-width: 1100px) {
                    .pw-sidebar { width: 170px; }
                    .pw-content-scroll { padding: 16px 20px; }
                    .pw-tab-wrap { max-width: 100%; }
                  }
                  @media (min-height: 600px) and (max-height: 800px) {
                    .pw-content-scroll { padding: 14px 24px; }
                  }
                  @media (max-width: 767px) {
                    .pw-card { padding: 14px !important; margin-bottom: 12px !important; }
                  }
                  @media (min-width: 768px) and (max-width: 1100px) {
                    .pw-card { padding: 16px !important; margin-bottom: 14px !important; }
                  }
                `}</style>
                <Modal.Body className="pw-body">
                    <form onSubmit={handleCreate} className="pw-form">

                        {/* Left Nav Sidebar */}
                        <aside className="pw-sidebar">
                            <div className="pw-sidebar-header">
                                <div style={{ fontFamily: '"Hanken Grotesk", sans-serif', fontSize: '15px', fontWeight: 700, color: '#191c1e', marginBottom: '2px' }}>
                                    {formData.id ? 'Edit Payment' : 'New Payment'}
                                </div>
                                <div style={{ fontFamily: '"Inter", sans-serif', fontSize: '11px', color: '#434655' }}>Payment Wizard</div>
                            </div>
                            {NAV_TABS.map((tab) => (
                                <button key={tab.id} type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '8px',
                                        padding: '9px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%',
                                        background: activeTab === tab.id ? '#2563eb' : 'transparent',
                                        color: activeTab === tab.id ? '#eeefff' : '#434655',
                                        fontFamily: '"Inter", sans-serif', fontSize: '13px', fontWeight: activeTab === tab.id ? 700 : 500,
                                    }}
                                    onMouseEnter={(e) => { if (activeTab !== tab.id) e.currentTarget.style.background = '#e0e3e5'; }}
                                    onMouseLeave={(e) => { if (activeTab !== tab.id) e.currentTarget.style.background = 'transparent'; }}
                                >
                                    <i className={`bi ${tab.icon}`} style={{ fontSize: '15px', flexShrink: 0 }}></i>
                                    <span style={{ flex: 1 }}>{tab.label}</span>
                                </button>
                            ))}
                        </aside>

                        {/* Main Content Area */}
                        <div className="pw-content">
                            <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px", paddingBottom: "8px" }}>
                            <div style={{ overflow: "hidden", maxHeight: totalErrors > 0 ? "500px" : "0", marginBottom: totalErrors > 0 ? "16px" : "0", transition: "max-height 0.25s ease, margin-bottom 0.2s ease" }}>
                              <div style={{ background: "#ffdad6", border: "1px solid #f4adaa", borderRadius: "8px", padding: "12px 16px" }}>
                                <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, color: "#93000a", marginBottom: "8px", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}>
                                  <i className="bi bi-exclamation-circle-fill" style={{ fontSize: "14px" }}></i>
                                  {totalErrors} error{totalErrors > 1 ? "s" : ""} — please fix before saving:
                                </div>
                                {NAV_TABS.map((tab) => {
                                  const tabErrs = allErrors.filter(([k]) => getErrorTab(k) === tab.id);
                                  if (!tabErrs.length) return null;
                                  return (
                                    <div key={tab.id} style={{ marginBottom: "6px" }}>
                                      <button type="button" onClick={() => setActiveTab(tab.id)}
                                        style={{ background: "none", border: "none", padding: 0, fontFamily: "Inter, sans-serif", fontWeight: 700, color: "#004ac6", cursor: "pointer", fontSize: "12px", textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: "4px", marginBottom: "2px" }}>
                                        <i className={`bi ${tab.icon}`} style={{ fontSize: "11px" }}></i> {tab.label}:
                                      </button>
                                      {tabErrs.map(([k, v]) => (
                                        <div key={k} style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#93000a", paddingLeft: "14px" }}>• {v}</div>
                                      ))}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                            <div className="pw-tab-wrap">

                                {/* ── Party Tab ── */}
                                {activeTab === 'party' && (
                                    <>
                                        <div style={CARD}>
                                            <SectionTitle icon="bi-calendar3">Date & Type</SectionTitle>

                                            <div className="row g-3">
                                                <div className="col-md-4">
                                                    <Label required>Type</Label>
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
                                                        style={INPUT}
                                                    >
                                                        <option value="customer" SELECTED>Customer</option>
                                                        <option value="vendor">Vendor</option>
                                                    </select>
                                                    {errors.type && <ErrMsg>{errors.type}</ErrMsg>}
                                                </div>

                                                <div className="col-md-6">
                                                    <Label required>Date</Label>
                                                    <div className="input-group">
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
                                                                setFormData({ ...formData });
                                                            }}
                                                        />
                                                    </div>
                                                    {errors.date_str && <ErrMsg>{errors.date_str}</ErrMsg>}
                                                </div>
                                            </div>
                                        </div>

                                        {formData.type === "customer" && (
                                            <div style={CARD}>
                                                <SectionTitle icon="bi-person">Customer</SectionTitle>
                                                <div className="row g-3 align-items-end">
                                                    <div className="col">
                                                        <Label required>Customer</Label>
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
                                                                    formData.customer_id = "";
                                                                    formData.customer_name = "";
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
                                                                    formData.customerName = "";
                                                                    formData.customer_id = "";
                                                                    formData.customer_name = "";
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
                                                                }, 350);
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
                                                        {errors.customer_id && <ErrMsg>{errors.customer_id}</ErrMsg>}
                                                    </div>
                                                    <div className="col-auto d-flex gap-2">
                                                        <Button hide={true.toString()} onClick={openCustomerCreateForm} className="btn btn-outline-secondary btn-primary btn-sm" type="button" id="button-addon1">
                                                            <i className="bi bi-plus-lg"></i> New
                                                        </Button>
                                                        <Button className="btn btn-primary" onClick={openCustomers}>
                                                            <i className="bi bi-list"></i>
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {formData.type === "vendor" && (
                                            <div style={CARD}>
                                                <SectionTitle icon="bi-building">Vendor</SectionTitle>
                                                <div className="row g-3 align-items-end">
                                                    <div className="col">
                                                        <Label required>Vendor</Label>
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
                                                                }, 350);
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
                                                        {errors.vendor_id && <ErrMsg>{errors.vendor_id}</ErrMsg>}
                                                    </div>
                                                    <div className="col-auto d-flex gap-2">
                                                        <Button hide={true.toString()} onClick={openVendorCreateForm} className="btn btn-outline-secondary btn-primary btn-sm" type="button" id="button-addon1">
                                                            <i className="bi bi-plus-lg"></i> New
                                                        </Button>
                                                        <Button className="btn btn-primary" onClick={openVendors}>
                                                            <i className="bi bi-list"></i>
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div style={CARD}>
                                            <SectionTitle icon="bi-chat-left-text">Remarks</SectionTitle>
                                            <div className="row g-3">
                                                <div className="col-md-8">
                                                    <Label>Remarks</Label>
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
                                                        style={{ ...INPUT, resize: 'vertical', minHeight: '80px' }}
                                                        id="remarks"
                                                        placeholder="Remarks"
                                                    />
                                                    {errors.remarks && <ErrMsg>{errors.remarks}</ErrMsg>}
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* ── Payments Tab ── */}
                                {activeTab === 'payments' && (
                                    <>
                                        <div style={CARD}>
                                            <SectionTitle icon="bi-credit-card">Payments</SectionTitle>

                                            {errors.payments && <ErrMsg>{errors.payments}</ErrMsg>}

                                            <div className="table-responsive">
                                                <Button variant="secondary" style={{ marginBottom: '10px' }} onClick={addNewPayment}>
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
                                                                <tr key={key} style={{ verticalAlign: 'top' }}>
                                                                    <td>
                                                                        <DatePicker
                                                                            id="payment_date_str"
                                                                            selected={formData.payments[key].date_str ? new Date(formData.payments[key].date_str) : null}
                                                                            value={formData.payments[key].date_str ? format(
                                                                                new Date(formData.payments[key].date_str),
                                                                                "MMMM d, yyyy h:mm aa"
                                                                            ) : null}
                                                                            style={INPUT}
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
                                                                            <ErrMsg>{errors["customer_payable_payment_date_" + key]}</ErrMsg>
                                                                        )}
                                                                    </td>
                                                                    <td >
                                                                        <input type='number' id={`${"customer_payable_payment_amount_" + key}`} name={`${"customer_payable_payment_amount_" + key}`} value={formData.payments[key].amount} style={INPUT}
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
                                                                            <ErrMsg>{errors["customer_payable_payment_amount_" + key]}</ErrMsg>
                                                                        )}
                                                                    </td>
                                                                    <td>
                                                                        <input
                                                                            type='number'
                                                                            id={`${"customer_payable_payment_discount_" + key}`}
                                                                            name={`${"customer_payable_payment_discount_" + key}`}
                                                                            value={formData.payments[key].discount}
                                                                            style={INPUT}
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
                                                                            <ErrMsg>{errors["customer_payable_payment_discount_" + key]}</ErrMsg>
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
                                                                            <ErrMsg>{errors["customer_payable_payment_invoice_" + key]}</ErrMsg>
                                                                        )}
                                                                    </td>
                                                                    <td >
                                                                        <select
                                                                            id={`${"customer_payable_payment_method_" + key}`} name={`${"customer_payable_payment_method_" + key}`}
                                                                            value={formData.payments[key].method} style={INPUT}
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
                                                                            <ErrMsg>{errors["customer_payable_payment_method_" + key]}</ErrMsg>
                                                                        )}
                                                                    </td>
                                                                    <td >
                                                                        <input type='text' id={`${"customer_payable_bank_reference_" + key}`} name={`${"customer_payable_bank_reference_" + key}`}
                                                                            value={formData.payments[key].bank_reference} style={INPUT}
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
                                                                            <ErrMsg>{errors["customer_payable_bank_reference_" + key]}</ErrMsg>
                                                                        )}
                                                                    </td>
                                                                    <td>
                                                                        <input type='text' id={`${"customer_payable_description_" + key}`} name={`${"customer_payable_description_" + key}`}
                                                                            value={formData.payments[key].description} style={INPUT}
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
                                                                            <ErrMsg>{errors["customer_payable_description_" + key]}</ErrMsg>
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
                                                                <b>Total</b>
                                                            </td>

                                                            <td><b style={{ marginLeft: "14px" }}>{trimTo2Decimals(totalPaymentAmount)}</b>
                                                                {errors["total_payment"] && (
                                                                    <ErrMsg>{errors["total_payment"]}</ErrMsg>
                                                                )}
                                                            </td>
                                                            <td colSpan={6}>

                                                            </td>

                                                        </tr>
                                                        <tr>
                                                            <td className="text-end">
                                                                <b>Total Discount</b>
                                                            </td>

                                                            <td><b style={{ marginLeft: "14px" }}>{trimTo2Decimals(totalDiscountAmount)}</b>
                                                                {errors["total_discount"] && (
                                                                    <ErrMsg>{errors["total_discount"]}</ErrMsg>
                                                                )}
                                                            </td>
                                                            <td colSpan={6}>
                                                            </td>

                                                        </tr>
                                                        <tr>
                                                            <td className="text-end">
                                                                <b>Net Total</b>
                                                            </td>
                                                            <td><b style={{ marginLeft: "14px" }}>{trimTo2Decimals(netTotalPaymentAmount)}</b>
                                                                {errors["net_total_payment"] && (
                                                                    <ErrMsg>{errors["net_total_payment"]}</ErrMsg>
                                                                )}
                                                            </td>
                                                            <td colSpan={6}>

                                                            </td>

                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* ── Attachments Tab ── */}
                                {activeTab === 'attachments' && (
                                    <>
                                        <div style={CARD}>
                                            <SectionTitle icon="bi-paperclip">Attachments</SectionTitle>

                                            {/* Upload area */}
                                            <label style={{ display: 'block', border: '2px dashed #c3c6d7', borderRadius: '8px', padding: '32px', background: '#f7f9fb', cursor: 'pointer', textAlign: 'center', marginBottom: '20px' }}>
                                                <i className="bi bi-cloud-upload" style={{ fontSize: '32px', color: '#004ac6', display: 'block', marginBottom: '8px' }}></i>
                                                <div style={{ fontFamily: '"Inter", sans-serif', fontSize: '14px', fontWeight: 600, color: '#191c1e', marginBottom: '4px' }}>Click or drag files here</div>
                                                <div style={{ fontFamily: '"Inter", sans-serif', fontSize: '12px', color: '#737686' }}>Images, PDFs, and any file type</div>
                                                <input
                                                    type="file"
                                                    accept="*/*"
                                                    multiple
                                                    style={{ display: 'none' }}
                                                    onChange={(e) => { if (e.target.files && e.target.files.length > 0) { addAttachments(e.target.files); e.target.value = ''; } }}
                                                />
                                            </label>

                                            {/* Existing saved files */}
                                            {(formData.images || []).map((filename, idx) => {
                                                const basename = filename.includes('/') ? filename.split('/').pop() : filename;
                                                const url = `/images/${localStorage.getItem('store_id')}/customer_withdrawals/${basename}`;
                                                const isImg = isImageFile(basename, "");
                                                const label = getFileLabel(basename) + ' ' + (idx + 1);
                                                const downloadName = 'attachment-' + (idx + 1) + '.' + basename.split('.').pop();
                                                const allSaved = (formData.images || []).map((fn, i) => { const bn = fn.includes('/') ? fn.split('/').pop() : fn; return { url: `/images/${localStorage.getItem("store_id")}/customer_withdrawals/${bn}`, isImg: isImageFile(bn, ""), name: getFileLabel(bn) + " " + (i+1) }; });
                                                return (
                                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f7f9fb', border: '1px solid #c3c6d7', borderRadius: '6px', padding: '8px 12px', marginBottom: '8px', fontFamily: '"Inter", sans-serif' }}>
                                                        {isImg ? (
                                                            <img src={url} alt={filename} onClick={() => openLightbox(allSaved, idx)} style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: '4px', flexShrink: 0, cursor: 'pointer' }} />
                                                        ) : (
                                                            <i className={`bi ${getFileIcon(null, filename)}`} style={{ fontSize: '20px', color: '#004ac6', flexShrink: 0 }}></i>
                                                        )}
                                                        <span style={{ flex: 1, fontSize: '13px', color: '#191c1e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
                                                        <button type="button" onClick={() => isImg ? openLightbox(allSaved, idx) : window.open(url, '_blank')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#004ac6', flexShrink: 0, padding: '0 4px', fontSize: '12px', fontWeight: 600, fontFamily: '"Inter", sans-serif', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                            <i className="bi bi-eye" style={{ fontSize: '14px' }}></i>View
                                                        </button>
                                                        <button type="button" onClick={() => downloadServerFile(url, downloadName)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#004ac6', flexShrink: 0, padding: '0 4px', fontSize: '12px', fontWeight: 600, fontFamily: '"Inter", sans-serif', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                            <i className="bi bi-download" style={{ fontSize: '14px' }}></i>Download
                                                        </button>
                                                        <button type="button" onClick={() => removeExistingAttachment(filename)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ba1a1a', flexShrink: 0, padding: '0 4px' }}>
                                                            <i className="bi bi-trash" style={{ fontSize: '15px' }}></i>
                                                        </button>
                                                    </div>
                                                );
                                            })}

                                            {/* Pending (new) attachments */}
                                            {pendingAttachments.map((att, idx) => (
                                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f7f9fb', border: '1px solid #c3c6d7', borderRadius: '6px', padding: '8px 12px', marginBottom: '8px', fontFamily: '"Inter", sans-serif' }}>
                                                    {isImageFile(att.name, att.type) ? (
                                                        <img src={att.dataUrl} alt={att.name} style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: '4px', flexShrink: 0 }} />
                                                    ) : (
                                                        <i className={`bi ${getFileIcon(att.type, att.name)}`} style={{ fontSize: '20px', color: '#004ac6', flexShrink: 0 }}></i>
                                                    )}
                                                    <span style={{ flex: 1, fontSize: '13px', color: '#191c1e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</span>
                                                    <span style={{ fontSize: '11px', color: '#737686', flexShrink: 0 }}>{formatBytes(att.size)}</span>
                                                    {isImageFile(att.name, att.type) && (
                                                        <button type="button" onClick={() => { const pendingImgItems = pendingAttachments.map(f => ({ url: f.dataUrl, isImg: isImageFile(f.name, f.type), name: f.name })); openLightbox(pendingImgItems, idx); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#004ac6', flexShrink: 0, padding: '0 4px', fontSize: '12px', fontWeight: 600, fontFamily: '"Inter", sans-serif', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                            <i className="bi bi-eye" style={{ fontSize: '14px' }}></i>View
                                                        </button>
                                                    )}
                                                    <button type="button" onClick={() => downloadDataUrl(att.dataUrl, att.name)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#004ac6', flexShrink: 0, padding: '0 4px', fontSize: '12px', fontWeight: 600, fontFamily: '"Inter", sans-serif', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                        <i className="bi bi-download" style={{ fontSize: '14px' }}></i>Download
                                                    </button>
                                                    <button type="button" onClick={() => removePendingAttachment(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ba1a1a', flexShrink: 0, padding: '0 4px' }}>
                                                        <i className="bi bi-trash" style={{ fontSize: '15px' }}></i>
                                                    </button>
                                                </div>
                                            ))}

                                            {/* Empty state */}
                                            {(formData.images || []).length === 0 && pendingAttachments.length === 0 && (
                                                <div style={{ color: '#737686', fontFamily: '"Inter", sans-serif', fontSize: '13px', textAlign: 'center', padding: '8px 0' }}>
                                                    No attachments yet.
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}

                            </div>
                            </div>{/* end scrollable inner div */}
                            <div style={{ flexShrink: 0, padding: "12px 28px", borderTop: "1px solid #c3c6d7", background: "#ffffff" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <button type="button" disabled={!prevTab} onClick={() => prevTab && setActiveTab(prevTab)} style={{ background: prevTab ? "#d0e1fb" : "#f0f2f4", color: prevTab ? "#54647a" : "#9aa0b0", border: "none", borderRadius: "4px", padding: "7px 16px", fontSize: "13px", fontWeight: 600, fontFamily: "Inter, sans-serif", cursor: prevTab ? "pointer" : "default", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                                  <i className="bi bi-arrow-left"></i>
                                  {prevTab ? NAV_TABS.find(t => t.id === prevTab)?.label : "Previous"}
                                </button>
                                <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#737686" }}>{currentTabIndex + 1} / {tabIds.length}</span>
                                <button type="button" disabled={!nextTab} onClick={() => nextTab && setActiveTab(nextTab)} style={{ background: nextTab ? "#004ac6" : "#f0f2f4", color: nextTab ? "#ffffff" : "#9aa0b0", border: "none", borderRadius: "4px", padding: "7px 16px", fontSize: "13px", fontWeight: 600, fontFamily: "Inter, sans-serif", cursor: nextTab ? "pointer" : "default", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                                  {nextTab ? NAV_TABS.find(t => t.id === nextTab)?.label : "Next"}
                                  <i className="bi bi-arrow-right"></i>
                                </button>
                              </div>
                            </div>{/* end sticky nav bar wrapper */}
                        </div>

                    </form>
                </Modal.Body>

            </Modal>


        </>
    );
});

export default CustomerWithdrawalCreate;
