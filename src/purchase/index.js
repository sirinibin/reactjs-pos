import React, { useState, useEffect, useRef, useContext, useCallback } from "react";
import PurchaseCreate from "./create.js";
import PurchaseView from "./view.js";

import { Typeahead } from "react-bootstrap-typeahead";
import { format } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Button, Spinner, Modal } from "react-bootstrap";
import ReactPaginate from "react-paginate";
import PurchaseReturnCreate from "./../purchase_return/create.js";

import PurchasePaymentIndex from "./../purchase_payment/index.js";
import PurchaseReturnIndex from "./../purchase_return/index.js";
import OverflowTooltip from "../utils/OverflowTooltip.js";
import Amount from "../utils/amount.js";
import StatsSummary from "../utils/StatsSummary.js";
import { WebSocketContext } from "./../utils/WebSocketContext.js";
import eventEmitter from "./../utils/eventEmitter";
import Preview from "./../order/preview.js";
import ReportPreview from "./../order/report.js";


import ReactExport from 'react-data-export';
const ExcelFile = ReactExport.ExcelFile;
const ExcelSheet = ReactExport.ExcelFile.ExcelSheet;

function PurchaseIndex(props) {
    const ReportPreviewRef = useRef();
    function openReportPreview() {
        ReportPreviewRef.current.open("purchase_report");
    }


    const { lastMessage } = useContext(WebSocketContext);


    let [totalPurchase, setTotalPurchase] = useState(0.00);
    let [vatPrice, setVatPrice] = useState(0.00);
    let [totalShippingHandlingFees, setTotalShippingHandlingFees] = useState(0.00);
    let [totalDiscount, setTotalDiscount] = useState(0.00);
    let [totalCashDiscount, setTotalCashDiscount] = useState(0.00);
    //let [netRetailProfit, setNetRetailProfit] = useState(0.00);
    //let [netWholesaleProfit, setNetWholesaleProfit] = useState(0.00);
    const [returnCount, setReturnCount] = useState(0.00);
    const [returnPaidAmount, setReturnPaidAmount] = useState(0.00);

    //list
    const [purchaseList, setPurchaseList] = useState([]);

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

    let [selectedUpdatedAtDate, setSelectedUpdatedAtDate] = useState(new Date());
    let [selectedUpdatedAtFromDate, setSelectedUpdatedAtFromDate] = useState(new Date());
    let [selectedUpdatedAtToDate, setSelectedUpdatedAtToDate] = useState(new Date());


    const [dateValue, setDateValue] = useState("");
    const [fromDateValue, setFromDateValue] = useState("");
    const [toDateValue, setToDateValue] = useState("");

    //Created At filter
    const [showCreatedAtDateRange, setShowCreatedAtDateRange] = useState(false);
    const [createdAtValue, setCreatedAtValue] = useState("");
    const [createdAtFromValue, setCreatedAtFromValue] = useState("");
    const [createdAtToValue, setCreatedAtToValue] = useState("");

    //Updated At filter
    const [showUpdatedAtDateRange, setShowUpdatedAtDateRange] = useState(false);
    const [updatedAtValue, setUpdatedAtValue] = useState("");
    const [updatedAtFromValue, setUpdatedAtFromValue] = useState("");
    const [updatedAtToValue, setUpdatedAtToValue] = useState("");

    //loader flag
    const [isListLoading, setIsListLoading] = useState(false);
    const [isRefreshInProcess, setIsRefreshInProcess] = useState(false);

    //Vendor Auto Suggestion
    const [vendorOptions, setVendorOptions] = useState([]);
    const [selectedVendors, setSelectedVendors] = useState([]);

    //Created By User Auto Suggestion
    const [userOptions, setUserOptions] = useState([]);
    const [selectedCreatedByUsers, setSelectedCreatedByUsers] = useState([]);

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


    useEffect(() => {
        list();
        getStore(localStorage.getItem("store_id"));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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


    let [allPurchases, setAllPurchases] = useState([]);
    let [excelData, setExcelData] = useState([]);
    let [purchaseReportFileName, setPurchaseReportFileName] = useState("Purchase Report");
    let [fettingAllRecordsInProgress, setFettingAllRecordsInProgress] = useState(false);

    function prepareExcelData() {
        console.log("Inside prepareExcelData()");
        var groupedByDate = [];
        for (var i = 0; i < allPurchases.length; i++) {
            let date = format(
                new Date(allPurchases[i].date),
                "dd-MMM-yyyy"
            );
            if (!groupedByDate[date]) {
                groupedByDate[date] = [];
            }

            groupedByDate[date].push(allPurchases[i]);

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
        for (let purchaseDate in groupedByDate) {

            console.log("purchaseDate:", purchaseDate);
            // excelData[0].data.push([{ value: "Inv Date: " + purchaseDate }]);


            for (var i2 = 0; i2 < groupedByDate[purchaseDate].length; i2++) {
                invoiceCount++;
                let purchase = groupedByDate[purchaseDate][i2];
                let invoiceNo = purchase.vendor_invoice_no ? purchase.vendor_invoice_no + " / " + purchase.code : purchase.code;
                let supplierVatNo = "N/A";
                if (purchase.vendor && purchase.vendor.vat_no) {
                    supplierVatNo = purchase.vendor.vat_no;
                }

                let amountBeforeVAT = (purchase.total + purchase.shipping_handling_fees);
                let amountAfterDiscount = (purchase.total + purchase.shipping_handling_fees - purchase.discount);
                let amountAfterVAT = (purchase.total + purchase.shipping_handling_fees - purchase.discount + purchase.vat_price);

                totalAmountBeforeVAT += amountBeforeVAT;
                totalDiscount += purchase.discount;
                totalAmountAfterDiscount += amountAfterDiscount;
                totalVAT += purchase.vat_price;
                totalAmountAfterVAT += amountAfterVAT;

                excelData[0].data.push([
                    { value: invoiceCount, style: { alignment: { horizontal: "center" } } },
                    { value: purchaseDate, style: { alignment: { horizontal: "center" } } },
                    { value: invoiceNo, style: { alignment: { horizontal: "center" } } },
                    { value: purchase.vendor_name },
                    { value: supplierVatNo, style: { alignment: { horizontal: "center" } } },
                    { value: amountBeforeVAT.toFixed(2), style: { alignment: { horizontal: "right" } } },
                    { value: purchase.discount?.toFixed(2), style: { alignment: { horizontal: "right" } } },
                    { value: amountAfterDiscount.toFixed(2), style: { alignment: { horizontal: "right" } } },
                    { value: purchase.vat_price.toFixed(2), style: { alignment: { horizontal: "right" } } },
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

    function makePurchaseReportFilename() {
        purchaseReportFileName = "Purchase Report";
        if (searchParams["from_date"] && searchParams["to_date"]) {
            purchaseReportFileName += " - From " + searchParams["from_date"] + " to " + searchParams["to_date"];
        } else if (searchParams["from_date"]) {
            purchaseReportFileName += " - From " + searchParams["from_date"] + " to " + format(
                new Date(),
                "dd-MMM-yyyy"
            );
        } else if (searchParams["to_date"]) {
            purchaseReportFileName += " - Upto " + searchParams["to_date"];
        } else if (searchParams["date_str"]) {
            purchaseReportFileName += " of " + searchParams["date_str"];
        }

        setPurchaseReportFileName(purchaseReportFileName);
    }
    async function getAllPurchases() {
        const requestOptions = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: localStorage.getItem("access_token"),
            },
        };
        let Select =
            "select=id,code,vendor_id,vendor.id,vendor.vat_no,vendor_invoice_no,date,total,net_total,shipping_handling_fees,discount_percent,discount,products,vendor_name,created_at,updated_at,vat_price";

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

        let purchases = [];
        var pageNo = 1;

        makePurchaseReportFilename();

        for (; true;) {

            fettingAllRecordsInProgress = true;
            setFettingAllRecordsInProgress(true);
            let res = await fetch(
                "/v1/purchase?" +
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
            purchases = purchases.concat(res);
            pageNo++;
        }

        allPurchases = purchases;
        setAllPurchases(purchases);

        console.log("allPurchases:", allPurchases);
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

        let Select = "select=id,additional_keywords,code,vat_no,name,phone,name_in_arabic,phone_in_arabic,search_label";
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
        } else if (field === "updated_at") {
            setUpdatedAtValue(value);
            setUpdatedAtFromValue("");
            setUpdatedAtToValue("");
            searchParams["updated_at_from"] = "";
            searchParams["updated_at_to"] = "";
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

        if (field === "updated_at_from") {
            setUpdatedAtFromValue(value);
            setUpdatedAtValue("");
            searchParams["updated_at"] = "";
            searchParams[field] = value;
        } else if (field === "updated_at_to") {
            setUpdatedAtToValue(value);
            setUpdatedAtValue("");
            searchParams["updated_at"] = "";
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

    let [totalPaidPurchase, setTotalPaidPurchase] = useState(0.00);
    let [totalUnPaidPurchase, setTotalUnPaidPurchase] = useState(0.00);
    let [totalCashPurchase, setTotalCashPurchase] = useState(0.00);
    let [totalBankAccountPurchase, setTotalBankAccountPurchase] = useState(0.00);


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
            "select=id,code,date,net_total,return_count,return_amount,cash_discount,discount,vat_price,total,store_id,created_by_name,vendor_name,vendor_invoice_no,status,created_at,updated_at,net_retail_profit,net_wholesale_profit,total_payment_paid,payments_count,payment_methods,payment_status,balance_amount";
        if (localStorage.getItem("store_id")) {
            searchParams.store_id = localStorage.getItem("store_id");
        }

        const d = new Date();
        let diff = d.getTimezoneOffset();
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

        setIsListLoading(true);
        fetch(
            "/v1/purchase?" +
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
                setPurchaseList(data.result);

                let pageCount = parseInt((data.total_count + pageSize - 1) / pageSize);

                setTotalPages(pageCount);
                setTotalItems(data.total_count);
                setOffset((page - 1) * pageSize);
                setCurrentPageItemsCount(data.result.length);
                setTotalPurchase(data.meta.total_purchase);
                setVatPrice(data.meta.vat_price);
                setTotalShippingHandlingFees(data.meta.shipping_handling_fees);
                setTotalDiscount(data.meta.discount);
                setTotalCashDiscount(data.meta.cash_discount);
                // setNetRetailProfit(data.meta.net_retail_profit);
                // setNetWholesaleProfit(data.meta.net_wholesale_profit);
                setTotalPaidPurchase(data.meta.paid_purchase);
                setTotalUnPaidPurchase(data.meta.unpaid_purchase);
                setTotalCashPurchase(data.meta.cash_purchase);
                setTotalBankAccountPurchase(data.meta.bank_account_purchase);
                setReturnCount(data.meta.return_count);
                setReturnPaidAmount(data.meta.return_amount);

            })
            .catch((error) => {
                setIsListLoading(false);
                setIsRefreshInProcess(false);
                console.log(error);
            });
    }, [sortOrder, sortField, page, pageSize, statsOpen, searchParams]);

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
            if (jsonMessage.event === "purchase_updated") {
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


    function openUpdateForm(id) {
        CreateFormRef.current.open(id);
    }

    const DetailsViewRef = useRef();
    function openDetailsView(id) {
        DetailsViewRef.current.open(id);
    }

    const CreateFormRef = useRef();
    function openCreateForm() {
        CreateFormRef.current.open();
    }

    const PurchaseReturnCreateRef = useRef();
    function openPurchaseReturnForm(id) {
        PurchaseReturnCreateRef.current.open(undefined, id);
    }


    //Purchase Payments

    const [selectedPurchase, setSelectedPurchase] = useState({});
    let [showPurchasePaymentHistory, setShowPurchasePaymentHistory] = useState(false);

    function openPaymentsDialogue(purchase) {
        setSelectedPurchase(purchase);
        showPurchasePaymentHistory = true;
        setShowPurchasePaymentHistory(true);
    }

    function handlePaymentHistoryClose() {
        showPurchasePaymentHistory = false;
        setShowPurchasePaymentHistory(false);
        //list();
    }


    const PurchasePaymentListRef = useRef();

    let [showPurchaseReturns, setShowPurchaseReturns] = useState(false);
    function openPurchaseReturnsDialogue(purchase) {
        setSelectedPurchase(purchase);
        showPurchaseReturns = true;
        setShowPurchaseReturns(true);
    }

    function handlePurchaseReturnsClose() {
        showPurchaseReturns = false;
        setShowPurchaseReturns(false);
    }

    const PurchaseReturnListRef = useRef();


    const PreviewRef = useRef();
    function openPreview(model) {
        PreviewRef.current.open(model, undefined, "purchase");
    }



    function sendWhatsAppMessage(model) {
        PreviewRef.current.open(model, "whatsapp", "whatsapp_purchase");
    }

    const vendorSearchRef = useRef();
    const timerRef = useRef(null);

    return (
        <>
            <ReportPreview ref={ReportPreviewRef} searchParams={searchParams} sortOrder={sortOrder} sortField={sortField} />
            <Preview ref={PreviewRef} />
            <PurchaseCreate ref={CreateFormRef} refreshList={list} showToastMessage={props.showToastMessage} openDetailsView={openDetailsView} />
            <PurchaseView ref={DetailsViewRef} openUpdateForm={openUpdateForm} openCreateForm={openCreateForm} />
            <PurchaseReturnCreate ref={PurchaseReturnCreateRef} showToastMessage={props.showToastMessage} />

            <div className="container-fluid p-0">
                <div className="row">

                    <div className="col">
                        <span className="text-end">
                            <StatsSummary
                                title="Purchase"
                                stats={{
                                    "Cash purchase": totalCashPurchase,
                                    "Credit purchase": totalUnPaidPurchase,
                                    "Bank account purchase": totalBankAccountPurchase,
                                    "Cash discount": totalCashDiscount,
                                    "VAT paid": vatPrice,
                                    "Purchase": totalPurchase,
                                    "Paid purchase": totalPaidPurchase,
                                    "Purchase discount": totalDiscount,
                                    "Shipping/Handling fees": totalShippingHandlingFees,
                                    "Return Count": returnCount,
                                    "Return Paid Amount": returnPaidAmount,
                                }}

                                onToggle={handleSummaryToggle}
                            />
                        </span>
                    </div>

                </div>
                <div className="row">
                    <div className="col">
                        <h1 className="h3">Purchases</h1>
                    </div>

                    <div className="col text-end">
                        <Button variant="primary" onClick={() => {
                            openReportPreview();
                        }} style={{ marginRight: "8px" }} className="btn btn-primary mb-3">
                            <i className="bi bi-printer"></i>&nbsp;
                            Print Report
                        </Button>

                        <ExcelFile filename={purchaseReportFileName} element={excelData.length > 0 ? <Button variant="success" className="btn btn-primary mb-3 success" >Download Purchase Report</Button> : ""}>
                            <ExcelSheet dataSet={excelData} name={purchaseReportFileName} />
                        </ExcelFile>

                        {excelData.length === 0 ? <Button variant="primary" className="btn btn-primary mb-3" onClick={getAllPurchases} >{fettingAllRecordsInProgress ? "Preparing.." : "Purchase Report"}</Button> : ""}
                        &nbsp;&nbsp;

                        <Button
                            hide={true.toString()}
                            variant="primary"
                            className="btn btn-primary mb-3"
                            onClick={openCreateForm}
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
                                            <p className="text-start">No Purchases to display</p>
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
                                                        Credit Balance
                                                        {sortField === "balance_amount" && sortOrder === "-" ? (
                                                            <i className="bi bi-sort-numeric-down"></i>
                                                        ) : null}
                                                        {sortField === "balance_amount" && sortOrder === "" ? (
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
                                                </th>
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
                                                            sort("discount");
                                                        }}
                                                    >
                                                        Purchase Discount
                                                        {sortField === "discount" && sortOrder === "-" ? (
                                                            <i className="bi bi-sort-numeric-down"></i>
                                                        ) : null}
                                                        {sortField === "discount" && sortOrder === "" ? (
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
                                                            sort("vat_price");
                                                        }}
                                                    >
                                                        VAT
                                                        {sortField === "vat_price" && sortOrder === "-" ? (
                                                            <i className="bi bi-sort-numeric-down"></i>
                                                        ) : null}
                                                        {sortField === "vat_price" && sortOrder === "" ? (
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
                                                            sort("return_count");
                                                        }}
                                                    >
                                                        Return Count
                                                        {sortField === "return_count" && sortOrder === "-" ? (
                                                            <i className="bi bi-sort-numeric-down"></i>
                                                        ) : null}
                                                        {sortField === "return_count" && sortOrder === "" ? (
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
                                                            sort("return_amount");
                                                        }}
                                                    >
                                                        Return Paid Amount
                                                        {sortField === "return_amount" && sortOrder === "-" ? (
                                                            <i className="bi bi-sort-numeric-down"></i>
                                                        ) : null}
                                                        {sortField === "return_amount" && sortOrder === "" ? (
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
                                                            sort("retail_profit");
                                                        }}
                                                    >
                                                        Expected Net Retail Profit
                                                        {sortField === "net_retail_profit" && sortOrder === "-" ? (
                                                            <i className="bi bi-sort-numeric-down"></i>
                                                        ) : null}
                                                        {sortField === "net_retail_profit" && sortOrder === "" ? (
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
                                                            sort("wholesale_profit");
                                                        }}
                                                    >
                                                        Expected Net Wholesale Profit
                                                        {sortField === "net_wholesale_profit" && sortOrder === "-" ? (
                                                            <i className="bi bi-sort-numeric-down"></i>
                                                        ) : null}
                                                        {sortField === "net_wholesale_profit" && sortOrder === "" ? (
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
                                                <th>
                                                    <b
                                                        style={{
                                                            textDecoration: "underline",
                                                            cursor: "pointer",
                                                        }}
                                                        onClick={() => {
                                                            sort("updated_at");
                                                        }}
                                                    >
                                                        Updated At
                                                        {sortField === "updated_at" && sortOrder === "-" ? (
                                                            <i className="bi bi-sort-down"></i>
                                                        ) : null}
                                                        {sortField === "updated_at" && sortOrder === "" ? (
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
                                                        id="purchase_code"
                                                        name="purchase_code"
                                                        onChange={(e) =>
                                                            searchByFieldValue("code", e.target.value)
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
                                                    <Typeahead
                                                        style={{ minWidth: "300px" }}
                                                        id="vendor_id"
                                                        filterBy={['additional_keywords']}
                                                        labelKey="search_label"
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
                                                        ref={vendorSearchRef}
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Escape") {
                                                                setVendorOptions([]);
                                                                vendorSearchRef.current?.clear();
                                                            }
                                                        }}
                                                        onInputChange={(searchTerm, e) => {
                                                            if (timerRef.current) clearTimeout(timerRef.current);
                                                            timerRef.current = setTimeout(() => {
                                                                suggestVendors(searchTerm);
                                                            }, 100);
                                                        }}
                                                        multiple
                                                    />
                                                </th>

                                                <th>
                                                    <input
                                                        type="text"
                                                        id="purchase_net_total"
                                                        name="purchase_net_total"
                                                        onChange={(e) =>
                                                            searchByFieldValue("net_total", e.target.value)
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
                                                        id="purchase_balance_amount"
                                                        name="purchase_balance_amount"
                                                        onChange={(e) =>
                                                            searchByFieldValue("balance_amount", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        id="purchase_cash_discount"
                                                        name="purchase_cash_discount"
                                                        onChange={(e) =>
                                                            searchByFieldValue("cash_discount", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        id="purchase_vendor_invoice_no"
                                                        name="purchase_vendor_invoice_no"
                                                        onChange={(e) =>
                                                            searchByFieldValue("vendor_invoice_no", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        id="purchase_payments_count"
                                                        name="purchase_payments_count"
                                                        onChange={(e) =>
                                                            searchByFieldValue("payments_count", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
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
                                                    <input
                                                        type="text"
                                                        id="purchase_discount"
                                                        name="purchase_discount"
                                                        onChange={(e) =>
                                                            searchByFieldValue("discount", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        id="purchase_vat_price"
                                                        name="purchase_vat_price"
                                                        onChange={(e) =>
                                                            searchByFieldValue("vat_price", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        id="purchase_return_count"
                                                        name="purchase_return_count"
                                                        onChange={(e) =>
                                                            searchByFieldValue("return_count", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        id="purchase_return_amount"
                                                        name="purchase_return_amount"
                                                        onChange={(e) =>
                                                            searchByFieldValue("return_amount", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>

                                                {/*<th>
                                                    <input
                                                        type="text"
                                                        id="purchase_net_retail_profit"
                                                        name="purchase_net_retail_profit"
                                                        onChange={(e) =>
                                                            searchByFieldValue("net_retail_profit", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>

                                                <th>
                                                    <input
                                                        type="text"
                                                        id="purchase_net_wholesale_profit"
                                                        name="purchase_net_wholesale_profit"
                                                        onChange={(e) =>
                                                            searchByFieldValue("net_wholesale_profit", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>*/}
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
                                                <th>
                                                    <DatePicker
                                                        id="updated_at"
                                                        value={updatedAtValue}
                                                        selected={selectedUpdatedAtDate}
                                                        className="form-control"
                                                        dateFormat="MMM dd yyyy"
                                                        isClearable={true}
                                                        onChange={(date) => {
                                                            if (!date) {
                                                                setUpdatedAtValue("");
                                                                searchByDateField("updated_at", "");
                                                                return;
                                                            }
                                                            searchByDateField("updated_at", date);
                                                            selectedUpdatedAtDate = date;
                                                            setSelectedUpdatedAtDate(date);

                                                        }}
                                                    />
                                                    <small
                                                        style={{
                                                            color: "blue",
                                                            textDecoration: "underline",
                                                            cursor: "pointer",
                                                        }}
                                                        onClick={(e) =>
                                                            setShowUpdatedAtDateRange(!showUpdatedAtDateRange)
                                                        }
                                                    >
                                                        {showUpdatedAtDateRange ? "Less.." : "More.."}
                                                    </small>
                                                    <br />

                                                    {showUpdatedAtDateRange ? (
                                                        <span className="text-left">
                                                            From:{" "}
                                                            <DatePicker
                                                                id="updated_at_from"
                                                                value={updatedAtFromValue}
                                                                selected={selectedUpdatedAtFromDate}
                                                                className="form-control"
                                                                dateFormat="MMM dd yyyy"
                                                                isClearable={true}
                                                                onChange={(date) => {
                                                                    if (!date) {
                                                                        setUpdatedAtFromValue("");
                                                                        searchByDateField("updated_at_from", "");
                                                                        return;
                                                                    }
                                                                    searchByDateField("updated_at_from", date);
                                                                    selectedUpdatedAtFromDate = date;
                                                                    setSelectedUpdatedAtFromDate(date);
                                                                }}
                                                            />
                                                            To:{" "}
                                                            <DatePicker
                                                                id="updated_at_to"
                                                                value={updatedAtToValue}
                                                                selected={selectedUpdatedAtToDate}
                                                                className="form-control"
                                                                dateFormat="MMM dd yyyy"
                                                                isClearable={true}
                                                                onChange={(date) => {
                                                                    if (!date) {
                                                                        setUpdatedAtToValue("");
                                                                        searchByDateField("updated_at_to", "");
                                                                        return;
                                                                    }
                                                                    searchByDateField("updated_at_to", date);
                                                                    selectedUpdatedAtToDate = date;
                                                                    setSelectedUpdatedAtToDate(date);
                                                                }}
                                                            />
                                                        </span>
                                                    ) : null}
                                                </th>
                                                <th></th>
                                            </tr>
                                        </thead>

                                        <tbody className="text-center">
                                            {purchaseList &&
                                                purchaseList.map((purchase) => (
                                                    <tr key={purchase.code}>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            <Button className="btn btn-light btn-sm" onClick={() => {
                                                                openUpdateForm(purchase.id);
                                                            }}>
                                                                <i className="bi bi-pencil"></i>
                                                            </Button>

                                                            &nbsp;<Button className="btn btn-primary btn-sm" onClick={() => {
                                                                openDetailsView(purchase.id);
                                                            }}>
                                                                <i className="bi bi-eye"></i>
                                                            </Button>
                                                            &nbsp;

                                                            <Button className="btn btn-primary btn-sm" onClick={() => {
                                                                openPreview(purchase);
                                                            }}>
                                                                <i className="bi bi-printer"></i>
                                                            </Button>
                                                            &nbsp;

                                                            <Button className={`btn btn-success btn-sm`} onClick={() => {
                                                                sendWhatsAppMessage(purchase);
                                                            }}>
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="white" viewBox="0 0 16 16">
                                                                    <path d="M13.601 2.326A7.875 7.875 0 0 0 8.036 0C3.596 0 0 3.597 0 8.036c0 1.417.37 2.805 1.07 4.03L0 16l3.993-1.05a7.968 7.968 0 0 0 4.043 1.085h.003c4.44 0 8.036-3.596 8.036-8.036 0-2.147-.836-4.166-2.37-5.673ZM8.036 14.6a6.584 6.584 0 0 1-3.35-.92l-.24-.142-2.37.622.63-2.31-.155-.238a6.587 6.587 0 0 1-1.018-3.513c0-3.637 2.96-6.6 6.6-6.6 1.764 0 3.42.69 4.67 1.94a6.56 6.56 0 0 1 1.93 4.668c0 3.637-2.96 6.6-6.6 6.6Zm3.61-4.885c-.198-.1-1.17-.578-1.352-.644-.18-.066-.312-.1-.444.1-.13.197-.51.644-.626.775-.115.13-.23.15-.428.05-.198-.1-.837-.308-1.594-.983-.59-.525-.99-1.174-1.11-1.372-.116-.198-.012-.305.088-.403.09-.09.198-.23.298-.345.1-.115.132-.197.2-.33.065-.13.032-.247-.017-.345-.05-.1-.444-1.07-.61-1.46-.16-.384-.323-.332-.444-.338l-.378-.007c-.13 0-.344.048-.525.23s-.688.672-.688 1.64c0 .967.704 1.9.802 2.03.1.13 1.386 2.116 3.365 2.963.47.203.837.324 1.122.414.472.15.902.13 1.24.08.378-.057 1.17-.48 1.336-.942.165-.462.165-.858.116-.943-.048-.084-.18-.132-.378-.23Z" />
                                                                </svg>
                                                            </Button>

                                                            &nbsp;<button
                                                                className="btn btn-dark btn-sm"
                                                                data-bs-toggle="tooltip"
                                                                data-bs-placement="top"
                                                                title="Create Purchase Return"
                                                                onClick={() => {
                                                                    openPurchaseReturnForm(purchase.id);
                                                                }}
                                                            >
                                                                <i className="bi bi-arrow-left"></i> Return
                                                            </button>
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >{purchase.code}</td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {format(new Date(purchase.date), "MMM dd yyyy h:mma")}
                                                        </td>
                                                        <td className="text-start" style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {purchase.vendor_name && <OverflowTooltip value={purchase.vendor_name} />}
                                                        </td>

                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            <Amount amount={purchase.net_total} />
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            <Button variant="link" onClick={() => {
                                                                openPaymentsDialogue(purchase);
                                                            }}>
                                                                <Amount amount={purchase.total_payment_paid?.toFixed(2)} />
                                                            </Button>
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} > <Amount amount={purchase.balance_amount?.toFixed(2)} /> </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >  <Amount amount={purchase.cash_discount?.toFixed(2)} /> </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >{purchase.vendor_invoice_no}</td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            <Button variant="link" onClick={() => {
                                                                openPaymentsDialogue(purchase);
                                                            }}>
                                                                {purchase.payments_count}
                                                            </Button>
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {purchase.payment_status === "paid" ?
                                                                <span className="badge bg-success">
                                                                    Paid
                                                                </span> : ""}
                                                            {purchase.payment_status === "paid_partially" ?
                                                                <span className="badge bg-warning">
                                                                    Paid Partially
                                                                </span> : ""}
                                                            {purchase.payment_status === "not_paid" ?
                                                                <span className="badge bg-danger">
                                                                    Not Paid
                                                                </span> : ""}
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {purchase.payment_methods &&
                                                                purchase.payment_methods.map((name) => (
                                                                    <span className="badge bg-info">{name}</span>
                                                                ))}
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            <Amount amount={purchase.discount} />

                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            <Amount amount={purchase.vat_price} />

                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            <Button variant="link" onClick={() => {
                                                                openPurchaseReturnsDialogue(purchase);
                                                            }}>
                                                                {purchase.return_count}
                                                            </Button>
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            <Button variant="link" onClick={() => {
                                                                openPurchaseReturnsDialogue(purchase);
                                                            }}>
                                                                {purchase.return_amount}
                                                            </Button>
                                                        </td>

                                                        {/*<td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            <Amount amount={purchase.net_retail_profit} />

                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            <Amount amount={purchase.net_wholesale_profit} />

                                                        </td>*/}
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >{purchase.created_by_name}</td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {format(
                                                                new Date(purchase.created_at),
                                                                "MMM dd yyyy h:mma"
                                                            )}
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {purchase.updated_at ? format(
                                                                new Date(purchase.updated_at),
                                                                "MMM dd yyyy h:mma"
                                                            ) : ""}
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            <Button className="btn btn-light btn-sm" onClick={() => {
                                                                openUpdateForm(purchase.id);
                                                            }}>
                                                                <i className="bi bi-pencil"></i>
                                                            </Button>

                                                            &nbsp;<Button className="btn btn-primary btn-sm" onClick={() => {
                                                                openDetailsView(purchase.id);
                                                            }}>
                                                                <i className="bi bi-eye"></i>
                                                            </Button>

                                                            &nbsp;<button
                                                                className="btn btn-dark btn-sm"
                                                                data-bs-toggle="tooltip"
                                                                data-bs-placement="top"
                                                                title="Create Purchase Return"
                                                                onClick={() => {
                                                                    openPurchaseReturnForm(purchase.id);
                                                                }}
                                                            >
                                                                <i className="bi bi-arrow-left"></i> Return
                                                            </button>
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

            <Modal show={showPurchasePaymentHistory} size="lg" onHide={handlePaymentHistoryClose} animation={false} scrollable={true}>
                <Modal.Header>
                    <Modal.Title>Payment history of Purchase #{selectedPurchase.code}</Modal.Title>

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
                    <PurchasePaymentIndex ref={PurchasePaymentListRef} showToastMessage={props.showToastMessage} purchase={selectedPurchase} refreshPurchaseList={list} />
                </Modal.Body>
            </Modal>

            <Modal show={showPurchaseReturns} size="lg" onHide={handlePurchaseReturnsClose} animation={false} scrollable={true}>
                <Modal.Header>
                    <Modal.Title>Purchase Returns of Purchase Order #{selectedPurchase.code}</Modal.Title>

                    <div className="col align-self-end text-end">
                        <button
                            type="button"
                            className="btn-close"
                            onClick={handlePurchaseReturnsClose}
                            aria-label="Close"
                        ></button>

                    </div>
                </Modal.Header>
                <Modal.Body>
                    <PurchaseReturnIndex ref={PurchaseReturnListRef} showToastMessage={props.showToastMessage} purchase={selectedPurchase} refreshPurchaseList={list} />
                </Modal.Body>
            </Modal>
        </>
    );
}

export default PurchaseIndex;
