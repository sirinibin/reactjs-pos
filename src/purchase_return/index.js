import React, { useState, useEffect, useRef, useContext, useCallback } from "react";
import PurchaseReturnCreate from "./create.js";
import PurchaseReturnView from "./view.js";

import { Typeahead } from "react-bootstrap-typeahead";
import { format } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Button, Spinner, Modal } from "react-bootstrap";
import ReactPaginate from "react-paginate";

import PurchaseReturnPaymentCreate from "./../purchase_return_payment/create.js";
import PurchaseReturnPaymentDetailsView from "./../purchase_return_payment/view.js";
import PurchaseReturnPaymentIndex from "./../purchase_return_payment/index.js";
import OverflowTooltip from "../utils/OverflowTooltip.js";
import Amount from "../utils/amount.js";
import StatsSummary from "../utils/StatsSummary.js";
import { WebSocketContext } from "./../utils/WebSocketContext.js";
import eventEmitter from "./../utils/eventEmitter";
import Purchases from "./../utils/purchases.js";
import PurchaseReturnPreview from "./preview.js"

import ReactExport from 'react-data-export';
const ExcelFile = ReactExport.ExcelFile;
const ExcelSheet = ReactExport.ExcelFile.ExcelSheet;


function PurchaseReturnIndex(props) {
    const { lastMessage } = useContext(WebSocketContext);


    let [totalPurchaseReturn, setTotalPurchaseReturn] = useState(0.00);
    let [vatPrice, setVatPrice] = useState(0.00);
    let [totalDiscount, setTotalDiscount] = useState(0.00);

    //list
    const [purchasereturnList, setPurchaseReturnList] = useState([]);

    //pagination
    const [pageSize, setPageSize] = useState(20);
    let [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalItems, setTotalItems] = useState(1);
    const [currentPageItemsCount, setCurrentPageItemsCount] = useState(0);
    const [offset, setOffset] = useState(0);

    //Date filter
    const [showDateRange, setShowDateRange] = useState(false);
    let [selectedDate, setSelectedDate] = useState(new Date());
    let [selectedFromDate, setSelectedFromDate] = useState(new Date());
    let [selectedToDate, setSelectedToDate] = useState(new Date());
    let [selectedCreatedAtDate, setSelectedCreatedAtDate] = useState(new Date());
    let [selectedCreatedAtFromDate, setSelectedCreatedAtFromDate] = useState(new Date());
    let [selectedCreatedAtToDate, setSelectedCreatedAtToDate] = useState(new Date());

    let [dateValue, setDateValue] = useState("");
    const [fromDateValue, setFromDateValue] = useState("");
    const [toDateValue, setToDateValue] = useState("");

    //Created At filter
    const [showCreatedAtDateRange, setShowCreatedAtDateRange] = useState(false);
    const [createdAtValue, setCreatedAtValue] = useState("");
    const [createdAtFromValue, setCreatedAtFromValue] = useState("");
    const [createdAtToValue, setCreatedAtToValue] = useState("");

    //loader flag
    const [isListLoading, setIsListLoading] = useState(false);
    const [isRefreshInProcess, setIsRefreshInProcess] = useState(false);

    //Vendor Auto Suggestion
    const [vendorOptions, setVendorOptions] = useState([]);
    const [selectedVendors, setSelectedVendors] = useState([]);

    //Created By User Auto Suggestion
    const [userOptions, setUserOptions] = useState([]);
    const [selectedCreatedByUsers, setSelectedCreatedByUsers] = useState([]);



    useEffect(() => {
        list();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);


    let [allPurchaseReturns, setAllPurchaseReturns] = useState([]);
    let [excelData, setExcelData] = useState([]);
    let [purchaseReturnReportFileName, setPurchaseReturnReportFileName] = useState("Purchase Return Report");
    let [fettingAllRecordsInProgress, setFettingAllRecordsInProgress] = useState(false);

    function prepareExcelData() {
        console.log("Inside prepareExcelData()");
        var groupedByDate = [];
        for (var i = 0; i < allPurchaseReturns.length; i++) {
            let date = format(
                new Date(allPurchaseReturns[i].date),
                "dd-MMM-yyyy"
            );
            if (!groupedByDate[date]) {
                groupedByDate[date] = [];
            }

            groupedByDate[date].push(allPurchaseReturns[i]);

        }

        console.log("groupedByDate:", groupedByDate);

        excelData = [{
            columns: [
                { title: "الرقم التسلسلي - S/L No.", width: { wch: 18 }, style: { fill: { patternType: "solid", fgColor: { rgb: "FFCCEEFF" } }, font: { vertAlign: true, bold: true }, alignment: { horizontal: "center", vertical: "center" } } },//pixels width 
                { title: "تاريخ الفاتورة - Date of Invoice", width: { wch: 25 }, style: { fill: { patternType: "solid", fgColor: { rgb: "FFCCEEFF" } }, font: { vertAlign: true, bold: true }, alignment: { horizontal: "center", vertical: "center" } } },//pixels width
                { title: "رقم الفاتورة - Invoice Number", width: { wch: 25 }, style: { fill: { patternType: "solid", fgColor: { rgb: "FFCCEEFF" } }, font: { vertAlign: true, bold: true }, alignment: { horizontal: "center", vertical: "center" } } },//pixels width
                { title: "اسم المورد بالعربية - Supplier Name", width: { wch: 30 }, style: { fill: { patternType: "solid", fgColor: { rgb: "FFCCEEFF" } }, font: { vertAlign: true, bold: true }, alignment: { horizontal: "center", vertical: "center" } } },//pixels width
                { title: "الرقمالضريبيللمورد - Supplier VAT No", width: { wch: 30 }, style: { fill: { patternType: "solid", fgColor: { rgb: "FFCCEEFF" } }, font: { vertAlign: true, bold: true }, alignment: { horizontal: "center", vertical: "center" } } },//pixels width
                { title: "المبلغ قبل الضريبة - Amount Before VAT", width: { wch: 30 }, style: { fill: { patternType: "solid", fgColor: { rgb: "FFCCEEFF" } }, font: { vertAlign: true, bold: true }, alignment: { horizontal: "center", vertical: "center" } } },//pixels width
                { title: "تخفيض - Discount", width: { wch: 15 }, style: { fill: { patternType: "solid", fgColor: { rgb: "FFCCEEFF" } }, font: { vertAlign: true, bold: true }, alignment: { horizontal: "center", vertical: "center" } } },//pixels width
                { title: "المبلغ بعد الخصم - Amount After Discount", width: { wch: 30 }, style: { fill: { patternType: "solid", fgColor: { rgb: "FFCCEEFF" } }, font: { vertAlign: true, bold: true }, alignment: { horizontal: "center", vertical: "center" } } },//pixels width
                { title: "قيمة الضريبة -  VAT Amount", width: { wch: 20 }, style: { fill: { patternType: "solid", fgColor: { rgb: "FFCCEEFF" } }, font: { vertAlign: true, bold: true }, alignment: { horizontal: "center", vertical: "center" } } },//pixels width
                { title: "الإجمالي شامل الضريبة - Total Amount after VAT", width: { wch: 35 }, style: { fill: { patternType: "solid", fgColor: { rgb: "FFCCEEFF" } }, font: { vertAlign: true, bold: true }, alignment: { horizontal: "center", vertical: "center" } } },//pixels width
                /*
                { title: "Description", width: { wch: 50 } },//pixels width  wpx
                { title: "Quantity", width: { wpx: 90 } },//char width  wch
                { title: "Unit", width: { wpx: 90 } },
                { title: "Rate", width: { wpx: 90 } },
                { title: "Gross", width: { wpx: 90 } },
                { title: "Disc %", width: { wpx: 90 } },
                { title: "Disc", width: { wpx: 90 } },
                { title: "Tax %", width: { wpx: 90 } },
                { title: "Tax Amount", width: { wpx: 180 } },
                { title: "Net Amount", width: { wpx: 90 } },
                */
            ],
            data: [],
        }];


        var totalAmountBeforeVAT = 0.00;
        var totalAmountAfterVAT = 0.00;
        var totalAmountAfterDiscount = 0.00;
        var totalVAT = 0.00;
        var totalDiscount = 0.00;

        let invoiceCount = 0;
        for (let purchaseReturnDate in groupedByDate) {

            console.log("purchaseReturnDate:", purchaseReturnDate);
            // excelData[0].data.push([{ value: "Inv Date: " + purchaseDate }]);


            for (var i2 = 0; i2 < groupedByDate[purchaseReturnDate].length; i2++) {
                invoiceCount++;
                let purchaseReturn = groupedByDate[purchaseReturnDate][i2];
                let invoiceNo = purchaseReturn.vendor_invoice_no ? purchaseReturn.vendor_invoice_no + " / " + purchaseReturn.code : purchaseReturn.code;
                let supplierVatNo = "N/A";
                if (purchaseReturn.vendor && purchaseReturn.vendor.vat_no) {
                    supplierVatNo = purchaseReturn.vendor.vat_no;
                }

                let amountBeforeVAT = (purchaseReturn.total + purchaseReturn.shipping_handling_fees);
                let amountAfterDiscount = (purchaseReturn.total + purchaseReturn.shipping_handling_fees - purchaseReturn.discount);
                let amountAfterVAT = (purchaseReturn.total + purchaseReturn.shipping_handling_fees - purchaseReturn.discount + purchaseReturn.vat_price);

                totalAmountBeforeVAT += amountBeforeVAT;
                totalDiscount += purchaseReturn.discount;
                totalAmountAfterDiscount += amountAfterDiscount;
                totalVAT += purchaseReturn.vat_price;
                totalAmountAfterVAT += amountAfterVAT;

                excelData[0].data.push([
                    { value: invoiceCount, style: { alignment: { horizontal: "center" } } },
                    { value: purchaseReturnDate, style: { alignment: { horizontal: "center" } } },
                    { value: invoiceNo, style: { alignment: { horizontal: "center" } } },
                    { value: purchaseReturn.vendor_name },
                    { value: supplierVatNo, style: { alignment: { horizontal: "center" } } },
                    { value: amountBeforeVAT.toFixed(2), style: { alignment: { horizontal: "right" } } },
                    { value: purchaseReturn.discount?.toFixed(2), style: { alignment: { horizontal: "right" } } },
                    { value: amountAfterDiscount.toFixed(2), style: { alignment: { horizontal: "right" } } },
                    { value: purchaseReturn.vat_price.toFixed(2), style: { alignment: { horizontal: "right" } } },
                    { value: amountAfterVAT.toFixed(2), style: { alignment: { horizontal: "right" } } },
                ]);
            }
        }
        excelData[0].data.push([
            { value: "", },
            { value: "", },
            { value: "", },
            { value: "", },
            { value: "", },
            { value: "", },
            { value: "", },
            { value: "", },
            { value: "", },
            { value: "", },
        ]);

        excelData[0].data.push([
            { value: "", },
            { value: "", },
            { value: "", },
            { value: "", },
            { value: "TOTAL", style: { font: { vertAlign: true, bold: true }, alignment: { horizontal: "right" } } },
            { value: totalAmountBeforeVAT.toFixed(2), style: { font: { vertAlign: true, bold: true }, alignment: { horizontal: "right" } } },
            { value: totalDiscount.toFixed(2), style: { font: { vertAlign: true, bold: true }, alignment: { horizontal: "right" } } },
            { value: totalAmountAfterDiscount.toFixed(2), style: { font: { vertAlign: true, bold: true }, alignment: { horizontal: "right" } } },
            { value: totalVAT.toFixed(2), style: { font: { vertAlign: true, bold: true }, alignment: { horizontal: "right" } } },
            { value: totalAmountAfterVAT.toFixed(2), style: { font: { vertAlign: true, bold: true }, alignment: { horizontal: "right" } } },
        ]);

        setExcelData(excelData);

        console.log("excelData:", excelData);
    }

    function makePurchaseReturnReportFilename() {
        purchaseReturnReportFileName = "Purchase Return Report";
        if (searchParams["from_date"] && searchParams["to_date"]) {
            purchaseReturnReportFileName += " - From " + searchParams["from_date"] + " to " + searchParams["to_date"];
        } else if (searchParams["from_date"]) {
            purchaseReturnReportFileName += " - From " + searchParams["from_date"] + " to " + format(
                new Date(),
                "dd-MMM-yyyy"
            );
        } else if (searchParams["to_date"]) {
            purchaseReturnReportFileName += " - Upto " + searchParams["to_date"];
        } else if (searchParams["date_str"]) {
            purchaseReturnReportFileName += " of " + searchParams["date_str"];
        }

        setPurchaseReturnReportFileName(purchaseReturnReportFileName);
    }
    async function getAllPurchaseReturns() {
        const requestOptions = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: localStorage.getItem("access_token"),
            },
        };
        let Select =
            "select=id,code,vendor_invoice_no,date,total,net_total,discount_percent,discount,products,vendor_name,created_at,vat_price";

        if (localStorage.getItem("store_id")) {
            searchParams.store_id = localStorage.getItem("store_id");
        }

        const d = new Date();
        let diff = d.getTimezoneOffset();
        console.log("Timezone:", parseFloat(diff / 60));
        searchParams["timezone_offset"] = parseFloat(diff / 60);

        if (statsOpen) {
            searchParams["stats"] = "1";
        } else {
            searchParams["stats"] = "0";
        }

        setSearchParams(searchParams);
        let queryParams = ObjectToSearchQueryParams(searchParams);
        if (queryParams !== "") {
            queryParams = "&" + queryParams;
        }

        let size = 500;

        let purchaseReturns = [];
        var pageNo = 1;

        makePurchaseReturnReportFilename();

        for (; true;) {

            fettingAllRecordsInProgress = true;
            setFettingAllRecordsInProgress(true);
            let res = await fetch(
                "/v1/purchase-return?" +
                Select +
                queryParams +
                "&sort=" +
                sortOrder +
                sortField +
                "&page=" +
                pageNo +
                "&limit=" +
                size,
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

                    setIsListLoading(false);
                    if (!data.result || data.result.length === 0) {
                        return [];
                    }


                    // console.log("Orders:", orders);

                    return data.result;


                })
                .catch((error) => {
                    console.log(error);
                    return [];
                    //break;

                });
            if (res.length === 0) {
                break;
            }
            purchaseReturns = purchaseReturns.concat(res);
            pageNo++;
        }

        allPurchaseReturns = purchaseReturns;
        setAllPurchaseReturns(purchaseReturns);

        console.log("allPurchaseReturns:", allPurchaseReturns);
        prepareExcelData();
        fettingAllRecordsInProgress = false;
        setFettingAllRecordsInProgress(false);

    }



    //Search params
    const [searchParams, setSearchParams] = useState({});
    let [sortField, setSortField] = useState("created_at");
    let [sortOrder, setSortOrder] = useState("-");

    function ObjectToSearchQueryParams(object) {
        return Object.keys(object)
            .map(function (key) {
                return `search[${key}]=${object[key]}`;
            })
            .join("&");
    }

    async function suggestVendors(searchTerm) {
        console.log("Inside handle suggestVendors");

        var params = {
            query: searchTerm,
        };

        if (localStorage.getItem("store_id")) {
            params.store_id = localStorage.getItem("store_id");
        }


        var queryString = ObjectToSearchQueryParams(params);
        if (queryString !== "") {
            queryString = `&${queryString}`;
        }

        const requestOptions = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: localStorage.getItem("access_token"),
            },
        };

        let Select = "select=id,code,vat_no,name,phone,name_in_arabic,phone_in_arabic,search_label";
        let result = await fetch(`/v1/vendor?${Select}${queryString}`, requestOptions);
        let data = await result.json();

        setVendorOptions(data.result);
    }

    async function suggestUsers(searchTerm) {
        console.log("Inside handle suggestUsers");
        setVendorOptions([]);

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
                Authorization: localStorage.getItem("access_token"),
            },
        };

        let Select = "select=id,name";
        let result = await fetch(
            "/v1/user?" + Select + queryString,
            requestOptions
        );
        let data = await result.json();

        setUserOptions(data.result);
    }

    function searchByFieldValue(field, value) {
        searchParams[field] = value;

        page = 1;
        setPage(page);
        list();
    }

    function searchByDateField(field, value) {
        if (!value) {
            page = 1;
            searchParams[field] = "";
            setPage(page);
            list();
            return;
        }

        let d = new Date(value);
        d = new Date(d.toUTCString());

        value = format(d, "MMM dd yyyy");
        if (field === "date_str") {
            setDateValue(value);
            setFromDateValue("");
            setToDateValue("");
            searchParams["from_date"] = "";
            searchParams["to_date"] = "";
            searchParams[field] = value;
        } else if (field === "from_date") {
            setFromDateValue(value);
            setDateValue("");
            searchParams["date"] = "";
            searchParams[field] = value;
        } else if (field === "to_date") {
            setToDateValue(value);
            setDateValue("");
            searchParams["date"] = "";
            searchParams[field] = value;
        } else if (field === "created_at") {
            setCreatedAtValue(value);
            setCreatedAtFromValue("");
            setCreatedAtToValue("");
            searchParams["created_at_from"] = "";
            searchParams["created_at_to"] = "";
            searchParams[field] = value;
        }
        if (field === "created_at_from") {
            setCreatedAtFromValue(value);
            setCreatedAtValue("");
            searchParams["created_at"] = "";
            searchParams[field] = value;
        } else if (field === "created_at_to") {
            setCreatedAtToValue(value);
            setCreatedAtValue("");
            searchParams["created_at"] = "";
            searchParams[field] = value;
        }

        page = 1;
        setPage(page);

        list();
    }

    const [selectedPaymentMethodList, setSelectedPaymentMethodList] = useState([]);
    const [selectedPaymentStatusList, setSelectedPaymentStatusList] = useState([]);

    function searchByMultipleValuesField(field, values) {
        if (field === "created_by") {
            setSelectedCreatedByUsers(values);
        } else if (field === "vendor_id") {
            setSelectedVendors(values);
        } else if (field === "payment_status") {
            setSelectedPaymentStatusList(values);
        } else if (field === "payment_methods") {
            setSelectedPaymentMethodList(values);
        }

        searchParams[field] = Object.values(values)
            .map(function (model) {
                return model.id;
            })
            .join(",");

        page = 1;
        setPage(page);

        list();
    }

    let [totalPaidPurchaseReturn, setTotalPaidPurchaseReturn] = useState(0.00);
    let [totalUnPaidPurchaseReturn, setTotalUnPaidPurchaseReturn] = useState(0.00);
    let [totalCashPurchaseReturn, setTotalCashPurchaseReturn] = useState(0.00);
    let [totalBankAccountPurchaseReturn, setTotalBankAccountPurchaseReturn] = useState(0.00);
    let [totalShippingHandlingFees, setTotalShippingHandlingFees] = useState(0.00);

    let [statsOpen, setStatsOpen] = useState(false);

    const list = useCallback(() => {
        setExcelData([]);
        const requestOptions = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: localStorage.getItem("access_token"),
            },
        };
        let Select =
            "select=id,code,purchase_code,cash_discount,purchase_id,date,net_total,created_by_name,vendor_name,vendor_invoice_no,status,created_at,total_payment_paid,payments_count,payment_methods,payment_status,balance_amount,store_id";
        if (localStorage.getItem("store_id")) {
            searchParams.store_id = localStorage.getItem("store_id");
        }

        if (props.purchase) {
            searchParams.purchase_id = props.purchase.id;
        }

        const d = new Date();
        let diff = d.getTimezoneOffset();
        searchParams["timezone_offset"] = parseFloat(diff / 60);

        if (statsOpen) {
            searchParams["stats"] = "1";
        }


        setSearchParams(searchParams);
        let queryParams = ObjectToSearchQueryParams(searchParams);
        if (queryParams !== "") {
            queryParams = "&" + queryParams;
        }

        setIsListLoading(true);
        fetch(
            "/v1/purchase-return?" +
            Select +
            queryParams +
            "&sort=" +
            sortOrder +
            sortField +
            "&page=" +
            page +
            "&limit=" +
            pageSize,
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

                setIsListLoading(false);
                setIsRefreshInProcess(false);
                setPurchaseReturnList(data.result);

                let pageCount = parseInt((data.total_count + pageSize - 1) / pageSize);

                setTotalPages(pageCount);
                setTotalItems(data.total_count);
                setOffset((page - 1) * pageSize);
                setCurrentPageItemsCount(data.result.length);
                setTotalPurchaseReturn(data.meta.total_purchase_return);
                setVatPrice(data.meta.vat_price);
                setTotalDiscount(data.meta.discount);
                setTotalCashDiscount(data.meta.cash_discount);
                setTotalPaidPurchaseReturn(data.meta.paid_purchase_return);
                setTotalUnPaidPurchaseReturn(data.meta.unpaid_purchase_return);
                setTotalCashPurchaseReturn(data.meta.cash_purchase_return);
                setTotalBankAccountPurchaseReturn(data.meta.bank_account_purchase_return);
                setTotalShippingHandlingFees(data.meta.shipping_handling_fees);

            })
            .catch((error) => {
                setIsListLoading(false);
                setIsRefreshInProcess(false);
                console.log(error);
            });
    }, [sortOrder, sortField, page, pageSize, statsOpen, searchParams, props.purchase]);


    const handleSummaryToggle = (isOpen) => {
        statsOpen = isOpen
        setStatsOpen(statsOpen)
    };

    useEffect(() => {
        if (statsOpen) {
            list();  // Call list() whenever statsOpen changes to true
        }
    }, [statsOpen, list]);


    useEffect(() => {
        if (lastMessage) {
            const jsonMessage = JSON.parse(lastMessage.data);
            console.log("Received Message in User list:", jsonMessage);
            if (jsonMessage.event === "purchase_return_updated") {
                list();
            }
        }
    }, [lastMessage, list]);

    useEffect(() => {
        const handleSocketOpen = () => {
            //console.log("WebSocket Opened in sales list");
            list();
        };

        eventEmitter.on("socket_connection_open", handleSocketOpen);

        return () => {
            eventEmitter.off("socket_connection_open", handleSocketOpen); // Cleanup
        };
    }, [list]); // Runs only once when component mounts

    function sort(field) {
        sortField = field;
        setSortField(sortField);
        sortOrder = sortOrder === "-" ? "" : "-";
        setSortOrder(sortOrder);
        list();
    }

    useEffect(() => {
        const timer = setTimeout(() => {
            list();
        }, 300);

        // Cleanup to avoid memory leaks
        return () => clearTimeout(timer);
    }, [pageSize, list]);


    function changePageSize(size) {
        setPageSize(parseInt(size));
    }



    function changePage(newPage) {
        page = parseInt(newPage);
        setPage(page);
        list();
    }


    const DetailsViewRef = useRef();
    function openDetailsView(id) {
        DetailsViewRef.current.open(id);
    }

    const CreateFormRef = useRef();
    function openUpdateForm(id) {
        CreateFormRef.current.open(id);
    }


    //Purchase Return Payments
    const PurchaseReturnPaymentCreateRef = useRef();
    /*
        function openPurchaseReturnPaymentCreateForm(purchaseReturn) {
            PurchaseReturnPaymentCreateRef.current.open(undefined, purchaseReturn);
        }
            */

    const PurchaseReturnPaymentDetailsViewRef = useRef();
    function openPurchaseReturnPaymentDetailsView(id) {
        PurchaseReturnPaymentDetailsViewRef.current.open(id);
    }

    function openPurchaseReturnPaymentUpdateForm(id) {
        PurchaseReturnPaymentCreateRef.current.open(id);
    }

    const [selectedPurchaseReturn, setSelectedPurchaseReturn] = useState({});
    let [showPurchaseReturnPaymentHistory, setShowPurchaseReturnPaymentHistory] = useState(false);

    function openPaymentsDialogue(purchaseReturn) {
        setSelectedPurchaseReturn(purchaseReturn);
        showPurchaseReturnPaymentHistory = true;
        setShowPurchaseReturnPaymentHistory(true);
    }

    function handlePaymentHistoryClose() {
        showPurchaseReturnPaymentHistory = false;
        setShowPurchaseReturnPaymentHistory(false);
        //list();
    }


    const PurchaseReturnPaymentListRef = useRef();

    const paymentStatusOptions = [
        {
            id: "paid",
            name: "Paid",
        },
        {
            id: "not_paid",
            name: "Not Paid",
        },
        {
            id: "paid_partially",
            name: "Paid partially",
        },
    ];
    const paymentMethodOptions = [
        {
            id: "cash",
            name: "Cash",
        },
        {
            id: "debit_card",
            name: "Debit Card",
        },
        {
            id: "credit_card",
            name: "Credit Card",
        },
        {
            id: "bank_card",
            name: "Bank Card",
        },
        {
            id: "bank_transfer",
            name: "Bank Transfer",
        },
        {
            id: "bank_cheque",
            name: "Bank Cheque",
        },
        {
            id: "vendor_account",
            name: "Vendor Account",
        },
    ];

    let [totalCashDiscount, setTotalCashDiscount] = useState(0.00);



    function openCreateForm(purchase) {
        if (purchase) {
            CreateFormRef.current.open(undefined, purchase.id);
        } else {
            CreateFormRef.current.open(undefined, props.purchase.id);
        }
    }

    const PurchasesRef = useRef();
    function openPurchases() {
        PurchasesRef.current.open();
    }

    const handleSelectedPurchase = (selected) => {
        openCreateForm(selected);
    };


    const PreviewRef = useRef();
    function openPreview(model) {
        PreviewRef.current.open(model);
    }

    return (
        <>
            <PurchaseReturnPreview ref={PreviewRef} />
            <Purchases ref={PurchasesRef} onSelectPurchase={handleSelectedPurchase} showToastMessage={props.showToastMessage} />
            <PurchaseReturnCreate ref={CreateFormRef} refreshList={list} refreshPurchaseList={props.refreshPurchaseList} showToastMessage={props.showToastMessage} />
            <PurchaseReturnView ref={DetailsViewRef} />

            <PurchaseReturnPaymentCreate ref={PurchaseReturnPaymentCreateRef} showToastMessage={props.showToastMessage} openDetailsView={openPurchaseReturnPaymentDetailsView} />
            <PurchaseReturnPaymentDetailsView ref={PurchaseReturnPaymentDetailsViewRef} openUpdateForm={openPurchaseReturnPaymentUpdateForm} showToastMessage={props.showToastMessage} />

            <div className="container-fluid p-0">
                <div className="row">

                    <div className="col">

                        <span className="text-end">
                            <StatsSummary
                                title="Purchase Return"
                                stats={{
                                    "Purchase Return": totalPurchaseReturn,
                                    "Paid Purchase Return": totalPaidPurchaseReturn,
                                    "Cash Purchase Return": totalCashPurchaseReturn,
                                    "Bank Account Purchase Return": totalBankAccountPurchaseReturn,
                                    "Credit Purchase Return": totalUnPaidPurchaseReturn,
                                    "Purchase Discount Return": totalDiscount,
                                    "Cash Discount Return": totalCashDiscount,
                                    "Shipping/Handling fees": totalShippingHandlingFees,
                                    "VAT": vatPrice,
                                }}
                                onToggle={handleSummaryToggle}
                            />
                        </span>


                    </div>

                </div>

                <div className="row">
                    <div className="col">
                        <h1 className="h3">Purchase Returns</h1>
                    </div>

                    <div className="col text-end">
                        <ExcelFile filename={purchaseReturnReportFileName} element={excelData.length > 0 ? <Button variant="success" className="btn btn-primary mb-3 success" >Download Purchase Return Report</Button> : ""}>
                            <ExcelSheet dataSet={excelData} name={purchaseReturnReportFileName} />
                        </ExcelFile>

                        {excelData.length === 0 ? <Button variant="primary" className="btn btn-primary mb-3" onClick={getAllPurchaseReturns} >{fettingAllRecordsInProgress ? "Preparing.." : "Purchase Return Report"}</Button> : ""}
                        &nbsp;&nbsp;

                        {/*<div className="col text-end">
                            {props.purchase ? <Button
                                hide={true.toString()}
                                variant="primary"
                                className="btn btn-primary mb-3"
                                onClick={openCreateForm}
                            >
                                <i className="bi bi-plus-lg"></i> Create
                            </Button> : ""}
                        </div>*/}


                        <Button
                            hide={true}
                            variant="primary"
                            className="btn btn-primary mb-3"
                            onClick={openPurchases}
                        >
                            <i className="bi bi-plus-lg"></i> Create
                        </Button>
                    </div>
                </div>

                <div className="row">
                    <div className="col-12">
                        <div className="card">
                            {/*
  <div   className="card-header">
                        <h5   className="card-title mb-0"></h5>
                    </div>
                    */}
                            <div className="card-body">
                                <div className="row">
                                    {totalItems === 0 && (
                                        <div className="col">
                                            <p className="text-start">No Purchase Returns to display</p>
                                        </div>
                                    )}
                                </div>
                                <div className="row" style={{ border: "solid 0px" }}>
                                    <div className="col text-start" style={{ border: "solid 0px" }}>
                                        <Button
                                            onClick={() => {
                                                setIsRefreshInProcess(true);
                                                list();
                                            }}
                                            variant="primary"
                                            disabled={isRefreshInProcess}
                                        >
                                            {isRefreshInProcess ? (
                                                <Spinner
                                                    as="span"
                                                    animation="border"
                                                    size="sm"
                                                    role="status"
                                                    aria-hidden={true}
                                                />
                                            ) : (
                                                <i className="fa fa-refresh"></i>
                                            )}
                                            <span className="visually-hidden">Loading...</span>
                                        </Button>
                                    </div>
                                    <div className="col text-center">
                                        {isListLoading && (
                                            <Spinner animation="grow" variant="primary" />
                                        )}
                                    </div>
                                    <div className="col text-end">
                                        {totalItems > 0 && (
                                            <>
                                                <label className="form-label">Size:&nbsp;</label>
                                                <select
                                                    value={pageSize}
                                                    onChange={(e) => {
                                                        changePageSize(e.target.value);
                                                    }}
                                                    className="form-control pull-right"
                                                    style={{
                                                        border: "solid 1px",
                                                        borderColor: "silver",
                                                        width: "55px",
                                                    }}
                                                >
                                                    <option value="5">
                                                        5
                                                    </option>
                                                    <option value="10">
                                                        10
                                                    </option>
                                                    <option value="20">20</option>
                                                    <option value="40">40</option>
                                                    <option value="50">50</option>
                                                    <option value="100">100</option>
                                                </select>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <br />
                                <div className="row">
                                    <div className="col" style={{ border: "solid 0px" }}>
                                        {totalPages ? <ReactPaginate
                                            breakLabel="..."
                                            nextLabel="next >"
                                            onPageChange={(event) => {
                                                changePage(event.selected + 1);
                                            }}
                                            pageRangeDisplayed={5}
                                            pageCount={totalPages}
                                            previousLabel="< previous"
                                            renderOnZeroPageCount={null}
                                            className="pagination  flex-wrap"
                                            pageClassName="page-item"
                                            pageLinkClassName="page-link"
                                            activeClassName="active"
                                            previousClassName="page-item"
                                            nextClassName="page-item"
                                            previousLinkClassName="page-link"
                                            nextLinkClassName="page-link"
                                            forcePage={page - 1}
                                        /> : ""}
                                    </div>
                                </div>
                                <div className="row">
                                    {totalItems > 0 && (
                                        <>
                                            <div className="col text-start">
                                                <p className="text-start">
                                                    showing {offset + 1}-{offset + currentPageItemsCount} of{" "}
                                                    {totalItems}
                                                </p>
                                            </div>

                                            <div className="col text-end">
                                                <p className="text-end">
                                                    page {page} of {totalPages}
                                                </p>
                                            </div>
                                        </>
                                    )}
                                </div>
                                <div className="table-responsive" style={{ overflowX: "auto", overflowY: "auto", maxHeight: "500px" }}>
                                    <table className="table table-striped table-sm table-bordered">
                                        <thead>
                                            <tr className="text-center">
                                                <th>Actions</th>
                                                <th>
                                                    <b
                                                        style={{
                                                            textDecoration: "underline",
                                                            cursor: "pointer",
                                                        }}
                                                        onClick={() => {
                                                            sort("code");
                                                        }}
                                                    >
                                                        ID
                                                        {sortField === "code" && sortOrder === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "code" && sortOrder === "" ? (
                                                            <i className="bi bi-sort-alpha-up"></i>
                                                        ) : null}
                                                    </b>
                                                </th>
                                                <th>
                                                    <b
                                                        style={{
                                                            textDecoration: "underline",
                                                            cursor: "pointer",
                                                        }}
                                                        onClick={() => {
                                                            sort("vendor_invoice_no");
                                                        }}
                                                    >
                                                        Vendor Invoice No.
                                                        {sortField === "vendor_invoice_no" && sortOrder === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "vendor_invoice_no" && sortOrder === "" ? (
                                                            <i className="bi bi-sort-alpha-up"></i>
                                                        ) : null}
                                                    </b>
                                                </th>
                                                <th>
                                                    <b
                                                        style={{
                                                            textDecoration: "underline",
                                                            cursor: "pointer",
                                                        }}
                                                        onClick={() => {
                                                            sort("vendor_name");
                                                        }}
                                                    >
                                                        Vendor
                                                        {sortField === "vendor_name" &&
                                                            sortOrder === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "vendor_name" && sortOrder === "" ? (
                                                            <i className="bi bi-sort-alpha-up"></i>
                                                        ) : null}
                                                    </b>
                                                </th>
                                                <th>
                                                    <b
                                                        style={{
                                                            textDecoration: "underline",
                                                            cursor: "pointer",
                                                        }}
                                                        onClick={() => {
                                                            sort("purchase_code");
                                                        }}
                                                    >
                                                        Purchase ID
                                                        {sortField === "code" && sortOrder === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "code" && sortOrder === "" ? (
                                                            <i className="bi bi-sort-alpha-up"></i>
                                                        ) : null}
                                                    </b>
                                                </th>
                                                <th>
                                                    <b
                                                        style={{
                                                            textDecoration: "underline",
                                                            cursor: "pointer",
                                                        }}
                                                        onClick={() => {
                                                            sort("date");
                                                        }}
                                                    >
                                                        Date
                                                        {sortField === "date" && sortOrder === "-" ? (
                                                            <i className="bi bi-sort-down"></i>
                                                        ) : null}
                                                        {sortField === "date" && sortOrder === "" ? (
                                                            <i className="bi bi-sort-up"></i>
                                                        ) : null}
                                                    </b>
                                                </th>
                                                <th>
                                                    <b
                                                        style={{
                                                            textDecoration: "underline",
                                                            cursor: "pointer",
                                                        }}
                                                        onClick={() => {
                                                            sort("net_total");
                                                        }}
                                                    >
                                                        Net Total
                                                        {sortField === "net_total" && sortOrder === "-" ? (
                                                            <i className="bi bi-sort-numeric-down"></i>
                                                        ) : null}
                                                        {sortField === "net_total" && sortOrder === "" ? (
                                                            <i className="bi bi-sort-numeric-up"></i>
                                                        ) : null}
                                                    </b>
                                                </th>
                                                <th>
                                                    <b
                                                        style={{
                                                            textDecoration: "underline",
                                                            cursor: "pointer",
                                                        }}
                                                        onClick={() => {
                                                            sort("cash_discount");
                                                        }}
                                                    >
                                                        Cash Discount
                                                        {sortField === "cash_discount" && sortOrder === "-" ? (
                                                            <i className="bi bi-sort-numeric-down"></i>
                                                        ) : null}
                                                        {sortField === "cash_discount" && sortOrder === "" ? (
                                                            <i className="bi bi-sort-numeric-up"></i>
                                                        ) : null}
                                                    </b>
                                                </th>
                                                <th>
                                                    <b
                                                        style={{
                                                            textDecoration: "underline",
                                                            cursor: "pointer",
                                                        }}
                                                        onClick={() => {
                                                            sort("total_payment_paid");
                                                        }}
                                                    >
                                                        Amount Paid
                                                        {sortField === "total_payment_paid" && sortOrder === "-" ? (
                                                            <i className="bi bi-sort-numeric-down"></i>
                                                        ) : null}
                                                        {sortField === "total_payment_paid" && sortOrder === "" ? (
                                                            <i className="bi bi-sort-numeric-up"></i>
                                                        ) : null}
                                                    </b>
                                                </th>
                                                <th>
                                                    <b
                                                        style={{
                                                            textDecoration: "underline",
                                                            cursor: "pointer",
                                                        }}
                                                        onClick={() => {
                                                            sort("balance_amount");
                                                        }}
                                                    >
                                                        Balance
                                                        {sortField === "balance_amount" && sortOrder === "-" ? (
                                                            <i className="bi bi-sort-numeric-down"></i>
                                                        ) : null}
                                                        {sortField === "balance_amount" && sortOrder === "" ? (
                                                            <i className="bi bi-sort-numeric-up"></i>
                                                        ) : null}
                                                    </b>
                                                </th>
                                                {/*<th>
                                                    <b
                                                        style={{
                                                            textDecoration: "underline",
                                                            cursor: "pointer",
                                                        }}
                                                        onClick={() => {
                                                            sort("payments_count");
                                                        }}
                                                    >
                                                        No.of Payments
                                                        {sortField === "payments_count" && sortOrder === "-" ? (
                                                            <i className="bi bi-sort-numeric-down"></i>
                                                        ) : null}
                                                        {sortField === "payments_count" && sortOrder === "" ? (
                                                            <i className="bi bi-sort-numeric-up"></i>
                                                        ) : null}
                                                    </b>
                                                </th>*/}

                                                <th>
                                                    <b
                                                        style={{
                                                            textDecoration: "underline",
                                                            cursor: "pointer",
                                                        }}
                                                        onClick={() => {
                                                            sort("payment_status");
                                                        }}
                                                    >
                                                        Payment Status
                                                        {sortField === "payment_status" && sortOrder === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "payment_status" && sortOrder === "" ? (
                                                            <i className="bi bi-sort-alpha-up"></i>
                                                        ) : null}
                                                    </b>
                                                </th>
                                                <th>
                                                    <b
                                                        style={{
                                                            textDecoration: "underline",
                                                            cursor: "pointer",
                                                        }}
                                                        onClick={() => {
                                                            sort("payment_methods");
                                                        }}
                                                    >
                                                        Payment Methods
                                                        {sortField === "payment_methods" && sortOrder === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "payment_methods" && sortOrder === "" ? (
                                                            <i className="bi bi-sort-alpha-up"></i>
                                                        ) : null}
                                                    </b>
                                                </th>
                                                <th>
                                                    <b
                                                        style={{
                                                            textDecoration: "underline",
                                                            cursor: "pointer",
                                                        }}
                                                        onClick={() => {
                                                            sort("created_by");
                                                        }}
                                                    >
                                                        Created By
                                                        {sortField === "created_by" && sortOrder === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "created_by" && sortOrder === "" ? (
                                                            <i className="bi bi-sort-alpha-up"></i>
                                                        ) : null}
                                                    </b>
                                                </th>
                                                <th>
                                                    <b
                                                        style={{
                                                            textDecoration: "underline",
                                                            cursor: "pointer",
                                                        }}
                                                        onClick={() => {
                                                            sort("created_at");
                                                        }}
                                                    >
                                                        Created At
                                                        {sortField === "created_at" && sortOrder === "-" ? (
                                                            <i className="bi bi-sort-down"></i>
                                                        ) : null}
                                                        {sortField === "created_at" && sortOrder === "" ? (
                                                            <i className="bi bi-sort-up"></i>
                                                        ) : null}
                                                    </b>
                                                </th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>

                                        <thead>
                                            <tr className="text-center">
                                                <th></th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        id="code"
                                                        onChange={(e) =>
                                                            searchByFieldValue("code", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        id="vendor_invoice_no"
                                                        onChange={(e) =>
                                                            searchByFieldValue("vendor_invoice_no", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <Typeahead
                                                        id="vendor_id"
                                                        labelKey="search_label"
                                                        style={{ minWidth: "300px" }}
                                                        onChange={(selectedItems) => {
                                                            searchByMultipleValuesField(
                                                                "vendor_id",
                                                                selectedItems
                                                            );
                                                        }}
                                                        options={vendorOptions}
                                                        placeholder="Vendor Name / Mob / VAT # / ID"
                                                        selected={selectedVendors}
                                                        highlightOnlyResult={true}
                                                        onInputChange={(searchTerm, e) => {
                                                            suggestVendors(searchTerm);
                                                        }}
                                                        multiple
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        id="purchase_code"
                                                        onChange={(e) =>
                                                            searchByFieldValue("purchase_code", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <div style={{ minWidth: "125px" }}>
                                                        <DatePicker
                                                            id="date_str"
                                                            value={dateValue}
                                                            selected={selectedDate}
                                                            className="form-control"
                                                            dateFormat="MMM dd yyyy"
                                                            isClearable={true}
                                                            onChange={(date) => {
                                                                if (!date) {
                                                                    setDateValue("");
                                                                    searchByDateField("date_str", "");
                                                                    return;
                                                                }
                                                                searchByDateField("date_str", date);
                                                                selectedDate = date;
                                                                setSelectedDate(date);
                                                            }}
                                                        />
                                                        <small
                                                            style={{
                                                                color: "blue",
                                                                textDecoration: "underline",
                                                                cursor: "pointer",
                                                            }}
                                                            onClick={(e) => setShowDateRange(!showDateRange)}
                                                        >
                                                            {showDateRange ? "Less.." : "More.."}
                                                        </small>
                                                        <br />

                                                        {showDateRange ? (
                                                            <span className="text-left">
                                                                From:{" "}
                                                                <DatePicker
                                                                    id="from_date"
                                                                    value={fromDateValue}
                                                                    selected={selectedFromDate}
                                                                    className="form-control"
                                                                    dateFormat="MMM dd yyyy"
                                                                    isClearable={true}
                                                                    onChange={(date) => {
                                                                        if (!date) {
                                                                            setFromDateValue("");
                                                                            searchByDateField("from_date", "");
                                                                            return;
                                                                        }
                                                                        searchByDateField("from_date", date);
                                                                        selectedFromDate = date;
                                                                        setSelectedFromDate(date);
                                                                    }}
                                                                />
                                                                To:{" "}
                                                                <DatePicker
                                                                    id="to_date"
                                                                    value={toDateValue}
                                                                    selected={selectedToDate}
                                                                    className="form-control"
                                                                    dateFormat="MMM dd yyyy"
                                                                    isClearable={true}
                                                                    onChange={(date) => {
                                                                        if (!date) {
                                                                            setToDateValue("");
                                                                            searchByDateField("to_date", "");
                                                                            return;
                                                                        }
                                                                        searchByDateField("to_date", date);
                                                                        selectedToDate = date;
                                                                        setSelectedToDate(date);
                                                                    }}
                                                                />
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        id="net_total"
                                                        onChange={(e) =>
                                                            searchByFieldValue("net_total", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        id="cash_discount"
                                                        onChange={(e) =>
                                                            searchByFieldValue("cash_discount", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        id="total_payment_paid"
                                                        onChange={(e) =>
                                                            searchByFieldValue("total_payment_paid", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        id="balance_amount"
                                                        onChange={(e) =>
                                                            searchByFieldValue("balance_amount", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                {/*<th>
                                                    <input
                                                        type="text"
                                                        id="payments_count"
                                                        onChange={(e) =>
                                                            searchByFieldValue("payments_count", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>*/}
                                                <th>
                                                    <Typeahead
                                                        id="payment_status"
                                                        labelKey="name"
                                                        onChange={(selectedItems) => {
                                                            searchByMultipleValuesField(
                                                                "payment_status",
                                                                selectedItems
                                                            );
                                                        }}
                                                        options={paymentStatusOptions}
                                                        placeholder="Select Payment Status"
                                                        selected={selectedPaymentStatusList}
                                                        highlightOnlyResult={true}
                                                        multiple
                                                    />
                                                </th>
                                                <th>
                                                    <Typeahead
                                                        id="payment_methods"
                                                        labelKey="name"
                                                        onChange={(selectedItems) => {
                                                            searchByMultipleValuesField(
                                                                "payment_methods",
                                                                selectedItems
                                                            );
                                                        }}
                                                        options={paymentMethodOptions}
                                                        placeholder="Select payment methods"
                                                        selected={selectedPaymentMethodList}
                                                        highlightOnlyResult={true}
                                                        multiple
                                                    />
                                                </th>
                                                <th>
                                                    <Typeahead
                                                        id="created_by"
                                                        labelKey="name"
                                                        onChange={(selectedItems) => {
                                                            searchByMultipleValuesField(
                                                                "created_by",
                                                                selectedItems
                                                            );
                                                        }}
                                                        options={userOptions}
                                                        placeholder="Select Users"
                                                        selected={selectedCreatedByUsers}
                                                        highlightOnlyResult={true}
                                                        onInputChange={(searchTerm, e) => {
                                                            suggestUsers(searchTerm);
                                                        }}
                                                        multiple
                                                    />
                                                </th>
                                                <th>
                                                    <DatePicker
                                                        id="created_at"
                                                        value={createdAtValue}
                                                        selected={selectedCreatedAtDate}
                                                        className="form-control"
                                                        dateFormat="MMM dd yyyy"
                                                        isClearable={true}
                                                        onChange={(date) => {
                                                            if (!date) {
                                                                setCreatedAtValue("");
                                                                searchByDateField("created_at", "");
                                                                return;
                                                            }
                                                            searchByDateField("created_at", date);
                                                            selectedCreatedAtDate = date;
                                                            setSelectedCreatedAtDate(date);
                                                        }}
                                                    />
                                                    <small
                                                        style={{
                                                            color: "blue",
                                                            textDecoration: "underline",
                                                            cursor: "pointer",
                                                        }}
                                                        onClick={(e) =>
                                                            setShowCreatedAtDateRange(!showCreatedAtDateRange)
                                                        }
                                                    >
                                                        {showCreatedAtDateRange ? "Less.." : "More.."}
                                                    </small>
                                                    <br />

                                                    {showCreatedAtDateRange ? (
                                                        <span className="text-left">
                                                            From:{" "}
                                                            <DatePicker
                                                                id="created_at_from"
                                                                value={createdAtFromValue}
                                                                selected={selectedCreatedAtFromDate}
                                                                className="form-control"
                                                                dateFormat="MMM dd yyyy"
                                                                isClearable={true}
                                                                onChange={(date) => {
                                                                    if (!date) {
                                                                        setCreatedAtFromValue("");
                                                                        searchByDateField("created_at_from", "");
                                                                        return;
                                                                    }
                                                                    searchByDateField("created_at_from", date);
                                                                    selectedCreatedAtFromDate = date;
                                                                    setSelectedCreatedAtFromDate(date);
                                                                }}
                                                            />
                                                            To:{" "}
                                                            <DatePicker
                                                                id="created_at_to"
                                                                value={createdAtToValue}
                                                                selected={selectedCreatedAtToDate}
                                                                className="form-control"
                                                                dateFormat="MMM dd yyyy"
                                                                isClearable={true}
                                                                onChange={(date) => {
                                                                    if (!date) {
                                                                        setCreatedAtToValue("");
                                                                        searchByDateField("created_at_to", "");
                                                                        return;
                                                                    }
                                                                    searchByDateField("created_at_to", date);
                                                                    selectedCreatedAtToDate = date;
                                                                    setSelectedCreatedAtToDate(date);
                                                                }}
                                                            />
                                                        </span>
                                                    ) : null}
                                                </th>
                                                <th></th>
                                            </tr>
                                        </thead>

                                        <tbody className="text-center">
                                            {purchasereturnList &&
                                                purchasereturnList.map((purchasereturn) => (
                                                    <tr key={purchasereturn.code} >
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            <Button className="btn btn-light btn-sm" onClick={() => {
                                                                openUpdateForm(purchasereturn.id);
                                                            }}>
                                                                <i className="bi bi-pencil"></i>
                                                            </Button>
                                                            <Button className="btn btn-primary btn-sm" onClick={() => {
                                                                openDetailsView(purchasereturn.id);
                                                            }}>
                                                                <i className="bi bi-eye"></i>
                                                            </Button>
                                                            &nbsp;

                                                            <Button className="btn btn-primary btn-sm" onClick={() => {
                                                                openPreview(purchasereturn);
                                                            }}>
                                                                <i className="bi bi-printer"></i>
                                                            </Button>
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >{purchasereturn.code}</td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >{purchasereturn.vendor_invoice_no}</td>
                                                        <td className="text-start" style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {purchasereturn.vendor_name && <OverflowTooltip value={purchasereturn.vendor_name} />}
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >{purchasereturn.purchase_code}</td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {format(
                                                                new Date(purchasereturn.date),
                                                                "MMM dd yyyy h:mma"
                                                            )}
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} > <Amount amount={purchasereturn.net_total} /> </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} > <Amount amount={purchasereturn.cash_discount?.toFixed(2)} /> </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            <Button variant="link" onClick={() => {
                                                                openPaymentsDialogue(purchasereturn);
                                                            }}>
                                                                <Amount amount={purchasereturn.total_payment_paid?.toFixed(2)} />

                                                            </Button>
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            <Amount amount={purchasereturn.balance_amount?.toFixed(2)} />

                                                        </td>
                                                        {/*<td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            <Button variant="link" onClick={() => {
                                                                openPaymentsDialogue(purchasereturn);
                                                            }}>
                                                                {purchasereturn.payments_count}
                                                            </Button>
                                                        </td>*/}
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {purchasereturn.payment_status === "paid" ?
                                                                <span className="badge bg-success">
                                                                    Paid
                                                                </span> : ""}
                                                            {purchasereturn.payment_status === "paid_partially" ?
                                                                <span className="badge bg-warning">
                                                                    Paid Partially
                                                                </span> : ""}
                                                            {purchasereturn.payment_status === "not_paid" ?
                                                                <span className="badge bg-danger">
                                                                    Not Paid
                                                                </span> : ""}
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {purchasereturn.payment_methods &&
                                                                purchasereturn.payment_methods.map((name) => (
                                                                    <span className="badge bg-info">{name}</span>
                                                                ))}
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >{purchasereturn.created_by_name}</td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {format(
                                                                new Date(purchasereturn.created_at),
                                                                "MMM dd yyyy h:mma"
                                                            )}
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >

                                                            <Button className="btn btn-light btn-sm" onClick={() => {
                                                                openUpdateForm(purchasereturn.id);
                                                            }}>
                                                                <i className="bi bi-pencil"></i>
                                                            </Button>


                                                            <Button className="btn btn-primary btn-sm" onClick={() => {
                                                                openDetailsView(purchasereturn.id);
                                                            }}>
                                                                <i className="bi bi-eye"></i>
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                </div>

                                {totalPages ? <ReactPaginate
                                    breakLabel="..."
                                    nextLabel="next >"
                                    onPageChange={(event) => {
                                        changePage(event.selected + 1);
                                    }}
                                    pageRangeDisplayed={5}
                                    pageCount={totalPages}
                                    previousLabel="< previous"
                                    renderOnZeroPageCount={null}
                                    className="pagination  flex-wrap"
                                    pageClassName="page-item"
                                    pageLinkClassName="page-link"
                                    activeClassName="active"
                                    previousClassName="page-item"
                                    nextClassName="page-item"
                                    previousLinkClassName="page-link"
                                    nextLinkClassName="page-link"
                                    forcePage={page - 1}
                                /> : ""}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Modal show={showPurchaseReturnPaymentHistory} size="lg" onHide={handlePaymentHistoryClose} animation={false} scrollable={true}>
                <Modal.Header>
                    <Modal.Title>Payment history of Purchase return #{selectedPurchaseReturn.code}</Modal.Title>

                    <div className="col align-self-end text-end">
                        <button
                            type="button"
                            className="btn-close"
                            onClick={handlePaymentHistoryClose}
                            aria-label="Close"
                        ></button>

                    </div>
                </Modal.Header>
                <Modal.Body>
                    <PurchaseReturnPaymentIndex ref={PurchaseReturnPaymentListRef} showToastMessage={props.showToastMessage} purchaseReturn={selectedPurchaseReturn} refreshPurchaseReturnList={list} />
                </Modal.Body>
            </Modal>
        </>
    );
}

export default PurchaseReturnIndex;
