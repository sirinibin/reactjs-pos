import React, { useState, useEffect, useRef } from "react";
import PurchaseCreate from "./create.js";
import PurchaseView from "./view.js";
import Cookies from "universal-cookie";
import { Typeahead } from "react-bootstrap-typeahead";
import { format } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Button, Spinner, Badge } from "react-bootstrap";
import ReactPaginate from "react-paginate";
import PurchaseReturnCreate from "./../purchase_return/create.js";
import NumberFormat from "react-number-format";

import PurchaseCashDiscountCreate from "./../purchase_cash_discount/create.js";
import PurchaseCashDiscountDetailsView from "./../purchase_cash_discount/view.js";

import PurchasePaymentCreate from "./../purchase_payment/create.js";
import PurchasePaymentDetailsView from "./../purchase_payment/view.js";


import ReactExport from 'react-data-export';
const ExcelFile = ReactExport.ExcelFile;
const ExcelSheet = ReactExport.ExcelFile.ExcelSheet;

function PurchaseIndex(props) {
    const cookies = new Cookies();

    let [totalPurchase, setTotalPurchase] = useState(0.00);
    let [vatPrice, setVatPrice] = useState(0.00);
    let [totalShippingHandlingFees, setTotalShippingHandlingFees] = useState(0.00);
    let [totalDiscount, setTotalDiscount] = useState(0.00);
    let [netRetailProfit, setNetRetailProfit] = useState(0.00);
    let [netWholesaleProfit, setNetWholesaleProfit] = useState(0.00);

    //list
    const [purchaseList, setPurchaseList] = useState([]);

    //pagination
    let [pageSize, setPageSize] = useState(5);
    let [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalItems, setTotalItems] = useState(1);
    const [currentPageItemsCount, setCurrentPageItemsCount] = useState(0);
    const [offset, setOffset] = useState(0);

    //Date filter
    const [showDateRange, setShowDateRange] = useState(false);
    const selectedDate = new Date();
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

    //Status Auto Suggestion
    const statusOptions = [
        {
            id: "sent",
            name: "Sent",
        },
        {
            id: "pending",
            name: "Pending",
        },
        {
            id: "accepted",
            name: "Accepted",
        },
        {
            id: "rejected",
            name: "Rejected",
        },
        {
            id: "cancelled",
            name: "Cancelled",
        },
        {
            id: "deleted",
            name: "Deleted",
        },
    ];

    const [selectedStatusList, setSelectedStatusList] = useState([]);

    useEffect(() => {
        list();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);


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
        var dayTotalBeforeVAT = 0.00;
        var dayTotalAfterVAT = 0.00;
        var dayVAT = 0.00;

        let invoiceCount = 0;
        for (let purchaseDate in groupedByDate) {

            console.log("purchaseDate:", purchaseDate);
            // excelData[0].data.push([{ value: "Inv Date: " + purchaseDate }]);
            dayTotalBeforeVAT = 0.00;
            dayTotalAfterVAT = 0.00;
            dayVAT = 0.00;

            for (var i = 0; i < groupedByDate[purchaseDate].length > 0; i++) {
                invoiceCount++;
                let purchase = groupedByDate[purchaseDate][i];
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
                    { value: purchase.discount.toFixed(2), style: { alignment: { horizontal: "right" } } },
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
        /*
        excelData[0].data.push([{ value: "Inv No (" + invoiceNo + ") - " + invoiceCount }]);
        excelData[0].data.push([{ value: "Supplier Name: " + purchase.vendor_name }]);
        if (purchase.vendor && purchase.vendor.vat_no) {
            excelData[0].data.push([{ value: "Supplier VAT No.: " + purchase.vendor.vat_no }]);
        } else {
            excelData[0].data.push([{ value: "Supplier VAT No.: N/A" }]);
        }
        */


        /*
        if (!purchase.products) {
            continue;
        }
        */

        /*
        for (var j = 0; j < purchase.products.length; j++) {
     
            let product = purchase.products[j];
     
            excelData[0].data.push([
                {
                    value: product.name
                },
                {
                    value: product.quantity.toFixed(2),
                },
                {
                    value: product.unit ? product.unit : "PCs",
                },
                {
                    value: product.purchase_unit_price ? product.purchase_unit_price.toFixed(2) : 0.00,
                },
                {
                    value: (product.purchase_unit_price * product.quantity).toFixed(2)
                },
                {
                    value: "0.00",
                },
                {
                    value: "0.00",
                },
                {
                    value: "15.00",
                },
                {
                    value: ((product.purchase_unit_price * product.quantity).toFixed(2) * 0.15).toFixed(2),
                },
                {
                    value: (product.purchase_unit_price * product.quantity).toFixed(2),
                },
            ]);
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
            {
                value: "Shipping/Handling Fees",
            }, {
                value: purchase.shipping_handling_fees.toFixed(2),
            },
        ]);
     
        excelData[0].data.push([
            { value: "", },
            { value: "", },
            { value: "", },
            { value: "", },
            { value: "", },
            { value: "", },
            { value: "", },
            { value: "", },
            {
                value: "Total Amount Before VAT",
            }, {
                value: (purchase.total + purchase.shipping_handling_fees).toFixed(2),
            },
        ]);
     
     
        excelData[0].data.push([
            { value: "", },
            { value: "", },
            { value: "", },
            { value: "", },
            { value: "", },
            { value: "", },
            { value: "", },
            { value: "", },
            {
                value: "Discount",
            }, {
                value: purchase.discount.toFixed(2),
            },
        ]);
     
        excelData[0].data.push([
            { value: "", },
            { value: "", },
            { value: "", },
            { value: "", },
            { value: "", },
            { value: "", },
            { value: "", },
            { value: "", },
            {
                value: "Total Amount After Discount",
            }, {
                value: (purchase.total + purchase.shipping_handling_fees - purchase.discount).toFixed(2),
            },
        ]);
     
     
        excelData[0].data.push([
            { value: "", },
            { value: "", },
            { value: "", },
            { value: "", },
            { value: "", },
            { value: "", },
            { value: "", },
            { value: "", },
            {
                value: "VAT Amount",
            }, {
                value: purchase.vat_price.toFixed(2),
            },
        ]);
     
     
     
        excelData[0].data.push([
            { value: "", },
            { value: "", },
            { value: "", },
            { value: "", },
            { value: "", },
            { value: "", },
            { value: "", },
            { value: "", },
            {
                value: "Total Amount After VAT",
            }, {
                value: (purchase.total + purchase.shipping_handling_fees - purchase.discount + purchase.vat_price).toFixed(2),
            },
        ]);
     
        dayTotalBeforeVAT += (purchase.total + purchase.shipping_handling_fees - purchase.discount);
        dayTotalAfterVAT += (purchase.total + purchase.shipping_handling_fees - purchase.discount + purchase.vat_price);
        dayVAT += purchase.vat_price;
     
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
        {
            value: "Day Total Before VAT",
        }, {
            value: dayTotalBeforeVAT.toFixed(2),
        },
    ]);
     
    excelData[0].data.push([
        { value: "", },
        { value: "", },
        { value: "", },
        { value: "", },
        { value: "", },
        { value: "", },
        { value: "", },
        { value: "", },
        {
            value: "Day VAT",
        }, {
            value: dayVAT.toFixed(2),
        },
    ]);
     
     
    excelData[0].data.push([
        { value: "", },
        { value: "", },
        { value: "", },
        { value: "", },
        { value: "", },
        { value: "", },
        { value: "", },
        { value: "", },
        {
            value: "Day Total After VAT",
        }, {
            value: dayTotalAfterVAT.toFixed(2),
        },
    ]);
     
    totalAmountBeforeVAT += dayTotalBeforeVAT;
    totalAmountAfterVAT += dayTotalAfterVAT;
    totalVAT += dayVAT;
     
     
    }//end for1
    */

        /*
        excelData[0].data.push([
            { value: "", },
            { value: "", },
            { value: "", },
            { value: "", },
            { value: "", },
            { value: "", },
            { value: "", },
            { value: "", },
            {
                value: "",
            }, {
                value: "",
            },
        ]);
     
        excelData[0].data.push([
            { value: "", },
            { value: "", },
            { value: "", },
            { value: "", },
            { value: "", },
            { value: "", },
            { value: "", },
            { value: "", },
            {
                value: "Total Amount Before VAT",
            }, {
                value: totalAmountBeforeVAT.toFixed(2),
            },
        ]);
     
        excelData[0].data.push([
            { value: "", },
            { value: "", },
            { value: "", },
            { value: "", },
            { value: "", },
            { value: "", },
            { value: "", },
            { value: "", },
            {
                value: "Total VAT",
            }, {
                value: totalVAT.toFixed(2),
            },
        ]);
     
        excelData[0].data.push([
            { value: "", },
            { value: "", },
            { value: "", },
            { value: "", },
            { value: "", },
            { value: "", },
            { value: "", },
            { value: "", },
            {
                value: "Total Amount After VAT",
            }, {
                value: totalAmountAfterVAT.toFixed(2),
            },
        ]);
        */




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
                Authorization: cookies.get("access_token"),
            },
        };
        let Select =
            "select=id,code,vendor_id,vendor.id,vendor.vat_no,vendor_invoice_no,date,total,net_total,shipping_handling_fees,discount_percent,discount,products,vendor_name,created_at,updated_at,vat_price";

        if (cookies.get("store_id")) {
            searchParams.store_id = cookies.get("store_id");
        }

        const d = new Date();
        let diff = d.getTimezoneOffset();
        console.log("Timezone:", parseFloat(diff / 60));
        searchParams["timezone_offset"] = parseFloat(diff / 60);
        searchParams["stats"] = "1";

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
            name: searchTerm,
        };
        var queryString = ObjectToSearchQueryParams(params);
        if (queryString !== "") {
            queryString = `&${queryString}`;
        }

        const requestOptions = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: cookies.get("access_token"),
            },
        };

        let Select = "select=id,name,phone,name_in_arabic,phone_in_arabic,search_label";
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
                Authorization: cookies.get("access_token"),
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

    function searchByMultipleValuesField(field, values) {
        if (field === "created_by") {
            setSelectedCreatedByUsers(values);
        } else if (field === "vendor_id") {
            setSelectedVendors(values);
        } else if (field === "status") {
            setSelectedStatusList(values);
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

    function list() {
        excelData = [];
        setExcelData(excelData);
        const requestOptions = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: cookies.get("access_token"),
            },
        };
        let Select =
            "select=id,code,date,net_total,discount,vat_price,total,store_id,created_by_name,vendor_name,vendor_invoice_no,status,created_at,updated_at,net_retail_profit,net_wholesale_profit";
        if (cookies.get("store_id")) {
            searchParams.store_id = cookies.get("store_id");
        }

        const d = new Date();
        let diff = d.getTimezoneOffset();
        searchParams["timezone_offset"] = parseFloat(diff / 60);
        searchParams["stats"] = "1";

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

                totalPurchase = data.meta.total_purchase;
                setTotalPurchase(totalPurchase);

                vatPrice = data.meta.vat_price;
                setVatPrice(vatPrice);

                totalShippingHandlingFees = data.meta.shipping_handling_fees;
                setTotalShippingHandlingFees(totalShippingHandlingFees);

                totalDiscount = data.meta.discount;
                setTotalDiscount(totalDiscount);


                netRetailProfit = data.meta.net_retail_profit;
                setNetRetailProfit(netRetailProfit);

                netWholesaleProfit = data.meta.net_wholesale_profit;
                setNetWholesaleProfit(netWholesaleProfit);
            })
            .catch((error) => {
                setIsListLoading(false);
                setIsRefreshInProcess(false);
                console.log(error);
            });
    }

    function sort(field) {
        sortField = field;
        setSortField(sortField);
        sortOrder = sortOrder === "-" ? "" : "-";
        setSortOrder(sortOrder);
        list();
    }

    function changePageSize(size) {
        pageSize = parseInt(size);
        setPageSize(pageSize);
        list();
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

    const PurchaseCashDiscountCreateRef = useRef();
    function openPurchaseCashDiscountCreateForm(order) {
        PurchaseCashDiscountCreateRef.current.open(undefined, order);
    }

    const PurchaseCashDiscountDetailsViewRef = useRef();
    function openPurchaseCashDiscountDetailsView(id) {
        PurchaseCashDiscountDetailsViewRef.current.open(id);
    }

    function openPurchaseCashDiscountUpdateForm(id) {
        PurchaseCashDiscountCreateRef.current.open(id);
    }

    //Purchase Payments
    const PurchasePaymentCreateRef = useRef();
    function openPurchasePaymentCreateForm(purchase) {
        PurchasePaymentCreateRef.current.open(undefined, purchase);
    }

    const PurchasePaymentDetailsViewRef = useRef();
    function openPurchasePaymentDetailsView(id) {
        PurchasePaymentDetailsViewRef.current.open(id);
    }

    function openPurchasePaymentUpdateForm(id) {
        PurchasePaymentCreateRef.current.open(id);
    }

    return (
        <>
            <PurchaseCreate ref={CreateFormRef} refreshList={list} showToastMessage={props.showToastMessage} openDetailsView={openDetailsView} />
            <PurchaseView ref={DetailsViewRef} openUpdateForm={openUpdateForm} openCreateForm={openCreateForm} />
            <PurchaseReturnCreate ref={PurchaseReturnCreateRef} showToastMessage={props.showToastMessage} />

            <PurchaseCashDiscountCreate ref={PurchaseCashDiscountCreateRef} showToastMessage={props.showToastMessage} openDetailsView={openPurchaseCashDiscountDetailsView} />
            <PurchaseCashDiscountDetailsView ref={PurchaseCashDiscountDetailsViewRef} openUpdateForm={openPurchaseCashDiscountUpdateForm} showToastMessage={props.showToastMessage} />

            <PurchasePaymentCreate ref={PurchasePaymentCreateRef} showToastMessage={props.showToastMessage} openDetailsView={openPurchasePaymentDetailsView} />
            <PurchasePaymentDetailsView ref={PurchasePaymentDetailsViewRef} openUpdateForm={openPurchasePaymentUpdateForm} showToastMessage={props.showToastMessage} />

            <div className="container-fluid p-0">
                <div className="row">

                    <div className="col">
                        <h1 className="text-end">
                            Purchases: <Badge bg="secondary">
                                <NumberFormat
                                    value={totalPurchase}
                                    displayType={"text"}
                                    thousandSeparator={true}
                                    suffix={" SAR"}
                                    renderText={(value, props) => value}
                                />
                            </Badge>
                        </h1>
                        <h1 className="text-end">
                            Discounts: <Badge bg="secondary">
                                <NumberFormat
                                    value={totalDiscount.toFixed(2)}
                                    displayType={"text"}
                                    thousandSeparator={true}
                                    suffix={" SAR"}
                                    renderText={(value, props) => value}
                                />
                            </Badge>
                        </h1>
                        <h1 className="text-end">
                            Shipping/Handling fees: <Badge bg="secondary">
                                <NumberFormat
                                    value={totalShippingHandlingFees.toFixed(2)}
                                    displayType={"text"}
                                    thousandSeparator={true}
                                    suffix={" SAR"}
                                    renderText={(value, props) => value}
                                />
                            </Badge>
                        </h1>
                        <h1 className="text-end">
                            VAT paid: <Badge bg="secondary">
                                <NumberFormat
                                    value={vatPrice.toFixed(2)}
                                    displayType={"text"}
                                    thousandSeparator={true}
                                    suffix={" SAR"}
                                    renderText={(value, props) => value}
                                />
                            </Badge>
                        </h1>
                        {cookies.get('admin') === "true" ?
                            <h1 className="text-end">
                                Expected Net Retail Profit: <Badge bg="secondary">
                                    <NumberFormat
                                        value={netRetailProfit}
                                        displayType={"text"}
                                        thousandSeparator={true}
                                        suffix={" SAR"}
                                        renderText={(value, props) => value}
                                    />
                                </Badge>
                            </h1> : ""}
                        {cookies.get('admin') === "true" ?
                            <h1 className="text-end">
                                Expected Net Wholesale Profit: <Badge bg="secondary">
                                    <NumberFormat
                                        value={netWholesaleProfit}
                                        displayType={"text"}
                                        thousandSeparator={true}
                                        suffix={" SAR"}
                                        renderText={(value, props) => value}
                                    />
                                </Badge>
                            </h1> : ""}
                    </div>

                </div>
                <div className="row">
                    <div className="col">
                        <h1 className="h3">Purchases</h1>
                    </div>

                    <div className="col text-end">
                        <ExcelFile filename={purchaseReportFileName} element={excelData.length > 0 ? <Button variant="success" className="btn btn-primary mb-3 success" >Download Purchase Report</Button> : ""}>
                            <ExcelSheet dataSet={excelData} name={purchaseReportFileName} />
                        </ExcelFile>

                        {excelData.length == 0 ? <Button variant="primary" className="btn btn-primary mb-3" onClick={getAllPurchases} >{fettingAllRecordsInProgress ? "Preparing.." : "Purchase Report"}</Button> : ""}
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
                                <div className="table-responsive" style={{ overflowX: "auto" }}>
                                    <table className="table table-striped table-sm table-bordered">
                                        <thead>
                                            <tr className="text-center">


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
                                                            sort("discount");
                                                        }}
                                                    >
                                                        Discount
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
                                                {cookies.get('admin') === "true" ?
                                                    <th>
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
                                                    : ""}
                                                {cookies.get('admin') === "true" ?
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
                                                    </th> : ""}
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
                                                            sort("status");
                                                        }}
                                                    >
                                                        Status
                                                        {sortField === "status" && sortOrder === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "status" && sortOrder === "" ? (
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
                                                        onChange={(selectedItems) => {
                                                            searchByMultipleValuesField(
                                                                "vendor_id",
                                                                selectedItems
                                                            );
                                                        }}
                                                        options={vendorOptions}
                                                        placeholder="name or mob"
                                                        selected={selectedVendors}
                                                        highlightOnlyResult={true}
                                                        onInputChange={(searchTerm, e) => {
                                                            suggestVendors(searchTerm);
                                                        }}
                                                        multiple
                                                    />
                                                </th>
                                                <th>
                                                    <DatePicker
                                                        id="date_str"
                                                        value={dateValue}
                                                        selected={selectedDate}
                                                        className="form-control"
                                                        dateFormat="MMM dd yyyy"
                                                        onChange={(date) => {
                                                            if (!date) {
                                                                setDateValue("");
                                                                searchByDateField("date_str", "");
                                                                return;
                                                            }
                                                            searchByDateField("date_str", date);
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
                                                                selected={selectedDate}
                                                                className="form-control"
                                                                dateFormat="MMM dd yyyy"
                                                                onChange={(date) => {
                                                                    if (!date) {
                                                                        setFromDateValue("");
                                                                        searchByDateField("from_date", "");
                                                                        return;
                                                                    }
                                                                    searchByDateField("from_date", date);
                                                                }}
                                                            />
                                                            To:{" "}
                                                            <DatePicker
                                                                id="to_date"
                                                                value={toDateValue}
                                                                selected={selectedDate}
                                                                className="form-control"
                                                                dateFormat="MMM dd yyyy"
                                                                onChange={(date) => {
                                                                    if (!date) {
                                                                        setToDateValue("");
                                                                        searchByDateField("to_date", "");
                                                                        return;
                                                                    }
                                                                    searchByDateField("to_date", date);
                                                                }}
                                                            />
                                                        </span>
                                                    ) : null}
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
                                                        id="discount"
                                                        onChange={(e) =>
                                                            searchByFieldValue("discount", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        id="vat_price"
                                                        onChange={(e) =>
                                                            searchByFieldValue("vat_price", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                {cookies.get('admin') === "true" ?
                                                    <th>
                                                        <input
                                                            type="text"
                                                            id="net_retail_profit"
                                                            onChange={(e) =>
                                                                searchByFieldValue("net_retail_profit", e.target.value)
                                                            }
                                                            className="form-control"
                                                        />
                                                    </th>
                                                    : ""}
                                                {cookies.get('admin') === "true" ?
                                                    <th>
                                                        <input
                                                            type="text"
                                                            id="net_wholesale_profit"
                                                            onChange={(e) =>
                                                                searchByFieldValue("net_wholesale_profit", e.target.value)
                                                            }
                                                            className="form-control"
                                                        />
                                                    </th> : ""}
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
                                                    <Typeahead
                                                        id="status"
                                                        labelKey="name"
                                                        onChange={(selectedItems) => {
                                                            searchByMultipleValuesField(
                                                                "status",
                                                                selectedItems
                                                            );
                                                        }}
                                                        options={statusOptions}
                                                        placeholder="Select Status"
                                                        selected={selectedStatusList}
                                                        highlightOnlyResult={true}
                                                        multiple
                                                    />
                                                </th>
                                                <th>
                                                    <DatePicker
                                                        id="created_at"
                                                        value={createdAtValue}
                                                        selected={selectedDate}
                                                        className="form-control"
                                                        dateFormat="MMM dd yyyy"
                                                        onChange={(date) => {
                                                            if (!date) {
                                                                setCreatedAtValue("");
                                                                searchByDateField("created_at", "");
                                                                return;
                                                            }
                                                            searchByDateField("created_at", date);
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
                                                                selected={selectedDate}
                                                                className="form-control"
                                                                dateFormat="MMM dd yyyy"
                                                                onChange={(date) => {
                                                                    if (!date) {
                                                                        setCreatedAtFromValue("");
                                                                        searchByDateField("created_at_from", "");
                                                                        return;
                                                                    }
                                                                    searchByDateField("created_at_from", date);
                                                                }}
                                                            />
                                                            To:{" "}
                                                            <DatePicker
                                                                id="created_at_to"
                                                                value={createdAtToValue}
                                                                selected={selectedDate}
                                                                className="form-control"
                                                                dateFormat="MMM dd yyyy"
                                                                onChange={(date) => {
                                                                    if (!date) {
                                                                        setCreatedAtToValue("");
                                                                        searchByDateField("created_at_to", "");
                                                                        return;
                                                                    }
                                                                    searchByDateField("created_at_to", date);
                                                                }}
                                                            />
                                                        </span>
                                                    ) : null}
                                                </th>
                                                <th>
                                                    <DatePicker
                                                        id="updated_at"
                                                        value={updatedAtValue}
                                                        selected={selectedDate}
                                                        className="form-control"
                                                        dateFormat="MMM dd yyyy"
                                                        onChange={(date) => {
                                                            if (!date) {
                                                                setUpdatedAtValue("");
                                                                searchByDateField("updated_at", "");
                                                                return;
                                                            }
                                                            searchByDateField("updated_at", date);
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
                                                                selected={selectedDate}
                                                                className="form-control"
                                                                dateFormat="MMM dd yyyy"
                                                                onChange={(date) => {
                                                                    if (!date) {
                                                                        setUpdatedAtFromValue("");
                                                                        searchByDateField("updated_at_from", "");
                                                                        return;
                                                                    }
                                                                    searchByDateField("updated_at_from", date);
                                                                }}
                                                            />
                                                            To:{" "}
                                                            <DatePicker
                                                                id="updated_at_to"
                                                                value={updatedAtToValue}
                                                                selected={selectedDate}
                                                                className="form-control"
                                                                dateFormat="MMM dd yyyy"
                                                                onChange={(date) => {
                                                                    if (!date) {
                                                                        setUpdatedAtToValue("");
                                                                        searchByDateField("updated_at_to", "");
                                                                        return;
                                                                    }
                                                                    searchByDateField("updated_at_to", date);
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
                                                        <td>{purchase.code}</td>
                                                        <td>{purchase.vendor_invoice_no}</td>
                                                        <td>{purchase.vendor_name}</td>
                                                        <td>
                                                            {format(new Date(purchase.date), "MMM dd yyyy h:mma")}
                                                        </td>
                                                        <td>
                                                            <NumberFormat
                                                                value={purchase.net_total}
                                                                displayType={"text"}
                                                                thousandSeparator={true}
                                                                suffix={" SAR"}
                                                                renderText={(value, props) => value}
                                                            />
                                                        </td>
                                                        <td>
                                                            <NumberFormat
                                                                value={purchase.discount}
                                                                displayType={"text"}
                                                                thousandSeparator={true}
                                                                suffix={" SAR"}
                                                                renderText={(value, props) => value}
                                                            />
                                                        </td>
                                                        <td>
                                                            <NumberFormat
                                                                value={purchase.vat_price}
                                                                displayType={"text"}
                                                                thousandSeparator={true}
                                                                suffix={" SAR"}
                                                                renderText={(value, props) => value}
                                                            />
                                                        </td>
                                                        {cookies.get('admin') === "true" ?
                                                            <td>
                                                                <NumberFormat
                                                                    value={purchase.net_retail_profit}
                                                                    displayType={"text"}
                                                                    thousandSeparator={true}
                                                                    suffix={" SAR"}
                                                                    renderText={(value, props) => value}
                                                                />
                                                            </td>
                                                            : ""}
                                                        {cookies.get('admin') === "true" ?
                                                            <td>
                                                                <NumberFormat
                                                                    value={purchase.net_wholesale_profit}
                                                                    displayType={"text"}
                                                                    thousandSeparator={true}
                                                                    suffix={" SAR"}
                                                                    renderText={(value, props) => value}
                                                                />
                                                            </td>
                                                            : ""}

                                                        <td>{purchase.created_by_name}</td>

                                                        <td>
                                                            <span className="badge bg-success">
                                                                {purchase.status}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            {format(
                                                                new Date(purchase.created_at),
                                                                "MMM dd yyyy h:mma"
                                                            )}
                                                        </td>
                                                        <td>
                                                            {purchase.updated_at ? format(
                                                                new Date(purchase.updated_at),
                                                                "MMM dd yyyy h:mma"
                                                            ) : ""}
                                                        </td>
                                                        <td>
                                                            <Button className="btn btn-light btn-sm" onClick={() => {
                                                                openUpdateForm(purchase.id);
                                                            }}>
                                                                <i className="bi bi-pencil"></i>
                                                            </Button>

                                                            <Button className="btn btn-primary btn-sm" onClick={() => {
                                                                openDetailsView(purchase.id);
                                                            }}>
                                                                <i className="bi bi-eye"></i>
                                                            </Button>

                                                            <button
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


                                                            <button
                                                                className="btn btn-default btn-sm"
                                                                data-bs-toggle="tooltip"
                                                                data-bs-placement="top"
                                                                title="Download"
                                                            >
                                                                <i className="bi bi-download"></i>
                                                            </button>

                                                            <button
                                                                className="btn btn-outline-secondary dropdown-toggle"
                                                                type="button"
                                                                data-bs-toggle="dropdown"
                                                                aria-expanded="false"
                                                            ></button>
                                                            <ul className="dropdown-menu">
                                                                <li>
                                                                    <button className="dropdown-item" onClick={() => {
                                                                        openPurchaseCashDiscountCreateForm(purchase);
                                                                    }}>
                                                                        <i className="bi bi-plus"></i>
                                                                        &nbsp;
                                                                        Add Cash Discount
                                                                    </button>
                                                                </li>
                                                                <li>
                                                                    <button className="dropdown-item" onClick={() => {
                                                                        openPurchasePaymentCreateForm(purchase);
                                                                    }}>
                                                                        <i className="bi bi-plus"></i>
                                                                        &nbsp;
                                                                        Add Payment
                                                                    </button>
                                                                </li>
                                                            </ul>
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
        </>
    );
}

export default PurchaseIndex;
