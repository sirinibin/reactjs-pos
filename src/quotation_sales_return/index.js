import React, { useState, useEffect, useRef, useContext, useCallback, useMemo } from "react";
import QuotationSalesReturnCreate from "./create.js";
import QuotationSalesReturnView from "./view.js";

import { Typeahead } from "react-bootstrap-typeahead";
import { format } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Button, Spinner, Modal, Alert } from "react-bootstrap";
import ReactPaginate from "react-paginate";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import QuotationSalesReturnPaymentCreate from "./../quotation_sales_return_payment/create.js";
import QuotationSalesReturnPaymentDetailsView from "./../quotation_sales_return_payment/view.js";
import QuotationSalesReturnPaymentIndex from "./../quotation_sales_return_payment/index.js";
import ReactExport from 'react-data-export';
import OverflowTooltip from "../utils/OverflowTooltip.js";
import { trimTo2Decimals } from "../utils/numberUtils";
import Amount from "../utils/amount.js";
import StatsSummary from "../utils/StatsSummary.js";
import { WebSocketContext } from "./../utils/WebSocketContext.js";
import eventEmitter from "./../utils/eventEmitter";
import Quotations from "./../utils/quotations.js";
import OrderPreview from "./../order/preview.js"
import ReportPreview from "./../order/report.js";
import OrderPrint from "./../order/print.js"


const ExcelFile = ReactExport.ExcelFile;
const ExcelSheet = ReactExport.ExcelFile.ExcelSheet;



function QuotationSalesReturnIndex(props) {
    const ReportPreviewRef = useRef();
    function openReportPreview() {
        ReportPreviewRef.current.open("quotation_sales_return_report");
    }

    const { lastMessage } = useContext(WebSocketContext);
    let [statsOpen, setStatsOpen] = useState(false);


    let [totalQuotationSalesReturn, setTotalQuotationSalesReturn] = useState(0.00);
    let [vatPrice, setVatPrice] = useState(0.00);
    let [totalShippingHandlingFees, setTotalShippingHandlingFees] = useState(0.00);
    let [totalDiscount, setTotalDiscount] = useState(0.00);
    let [totalCashDiscount, setTotalCashDiscount] = useState(0.00);
    let [totalPaidQuotationSalesReturn, setTotalPaidQuotationSalesReturn] = useState(0.00);
    let [totalUnPaidQuotationSalesReturn, setTotalUnPaidQuotationSalesReturn] = useState(0.00);
    let [totalCashQuotationSalesReturn, setTotalCashQuotationSalesReturn] = useState(0.00);
    let [totalBankAccountQuotationSalesReturn, setTotalBankAccountQuotationSalesReturn] = useState(0.00);

    //list
    const [quotationsalesreturnList, setQuotationSalesReturnList] = useState([]);

    //pagination
    let [pageSize, setPageSize] = useState(20);
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

    const [dateValue, setDateValue] = useState("");
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

    //Customer Auto Suggestion
    const [customerOptions, setCustomerOptions] = useState([]);
    const [selectedCustomers, setSelectedCustomers] = useState([]);

    //Created By User Auto Suggestion
    const [userOptions, setUserOptions] = useState([]);
    const [selectedCreatedByUsers, setSelectedCreatedByUsers] = useState([]);

    let [enableSelection, setEnableSelection] = useState(true);
    useEffect(() => {
        if (!props.onSelectQuotationSalesReturn) {
            setEnableSelection(false);
        } else {
            setEnableSelection(true);
        }

        if (props.selectedCustomers?.length > 0) {
            searchByMultipleValuesField("customer_id", props.selectedCustomers, true);
        }

        if (props.selectedPaymentStatusList) {
            searchByMultipleValuesField("payment_status", props.selectedPaymentStatusList, true);
        }

        list();
        if (localStorage.getItem("store_id")) {
            getStore(localStorage.getItem("store_id"));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);



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
                setStore({ ...store });
            })
            .catch(error => {
                // setErrors(error);
            });
    }


    let [allQuotationSalesReturns, setAllQuotationSalesReturns] = useState([]);
    let [excelData, setExcelData] = useState([]);
    let [quotationsalesReturnReportFileName, setQuotationSalesReturnReportFileName] = useState("Quotation Sales Return Report");
    let [fettingAllRecordsInProgress, setFettingAllRecordsInProgress] = useState(false);

    function prepareExcelData() {
        console.log("Inside prepareExcelData()");
        var groupedByDate = [];
        for (var i = 0; i < allQuotationSalesReturns.length; i++) {
            let date = format(
                new Date(allQuotationSalesReturns[i].date),
                "dd-MMM-yyyy"
            );
            if (!groupedByDate[date]) {
                groupedByDate[date] = [];
            }

            groupedByDate[date].push(allQuotationSalesReturns[i]);

        }

        console.log("groupedByDate:", groupedByDate);

        excelData = [{
            columns: [
                { title: "Description", width: { wch: 50 } },//pixels width 
                { title: "Quantity", width: { wpx: 90 } },//char width 
                { title: "Unit", width: { wpx: 90 } },
                { title: "Rate", width: { wpx: 90 } },
                { title: "Gross", width: { wpx: 90 } },
                { title: "Disc %", width: { wpx: 90 } },
                { title: "Disc", width: { wpx: 90 } },
                { title: "Tax %", width: { wpx: 90 } },
                { title: "Tax Amount", width: { wpx: 180 } },
                { title: "Net Amount", width: { wpx: 90 } },
            ],
            data: [],
        }];


        let totalAmountBeforeVAT = 0;
        let totalAmountAfterVAT = 0;
        let totalVAT = 0;

        let invoiceCount = 0;
        for (let returnDate in groupedByDate) {

            console.log("returnDate:", returnDate);
            excelData[0].data.push([{ value: "Inv Date: " + returnDate }]);

            let dayTotalBeforeVAT = 0.00;
            let dayTotalAfterVAT = 0.00;
            let dayVAT = 0.00;

            for (var i2 = 0; i2 < groupedByDate[returnDate].length; i2++) {
                invoiceCount++;
                let quotationsalesReturn = groupedByDate[returnDate][i2];
                excelData[0].data.push([{ value: "Inv No (" + quotationsalesReturn.code + ") - " + invoiceCount + " [" + quotationsalesReturn.customer_name + "]" }]);

                if (!quotationsalesReturn.products) {
                    continue;
                }

                let totalAmountAfterDiscount = quotationsalesReturn.total + quotationsalesReturn.shipping_handling_fees - quotationsalesReturn.discount;
                let totalAmountBeforeVat = quotationsalesReturn.total - quotationsalesReturn.discount + quotationsalesReturn.shipping_handling_fees;
                let totalAmountAfterVat = totalAmountBeforeVat + quotationsalesReturn.vat_price;

                for (var j = 0; j < quotationsalesReturn.products.length; j++) {

                    let product = quotationsalesReturn.products[j];

                    let unitDiscount = 0;

                    if (product.unit_discount) {
                        unitDiscount = product.unit_discount;
                    }

                    let gross_amount = product.unit_price * product.quantity;
                    let vat_percent = quotationsalesReturn.vat_percent ? quotationsalesReturn.vat_percent : 15.00;
                    let tax_amount = ((product.unit_price - unitDiscount) * product.quantity) * parseFloat(vat_percent / 100);
                    let net_amount = (gross_amount - (unitDiscount * product.quantity)) + tax_amount;

                    excelData[0].data.push([
                        {
                            value: product.name
                        },
                        {
                            value: product.quantity,
                        },
                        {
                            value: product.unit ? product.unit : "PCs",
                        },
                        {
                            value: product.unit_price ? trimTo2Decimals(product.unit_price) : 0.00,
                        },
                        {
                            value: trimTo2Decimals(gross_amount)
                        },
                        {
                            value: product.unit_discount_percent ? trimTo2Decimals(product.unit_discount_percent) : "0.00",
                        },
                        {
                            value: product.unit_discount ? trimTo2Decimals(product.unit_discount * product.quantity) : "0.00",
                        },
                        {
                            value: trimTo2Decimals(vat_percent),
                        },
                        {
                            value: trimTo2Decimals(tax_amount),
                        },
                        {
                            value: trimTo2Decimals(net_amount),
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
                        value: trimTo2Decimals(quotationsalesReturn.shipping_handling_fees),
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
                        value: trimTo2Decimals(quotationsalesReturn.discount),
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
                        value: trimTo2Decimals(totalAmountAfterDiscount),
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
                        value: trimTo2Decimals(totalAmountBeforeVat),
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
                        value: trimTo2Decimals(quotationsalesReturn.vat_price),
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
                        value: trimTo2Decimals(totalAmountAfterVat),
                    },
                ]);


                dayVAT += quotationsalesReturn.vat_price;
                dayTotalBeforeVAT += totalAmountBeforeVat;
                dayTotalAfterVAT += totalAmountAfterVat;
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
                    value: trimTo2Decimals(dayTotalBeforeVAT),
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
                    value: trimTo2Decimals(dayVAT),
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
                    value: trimTo2Decimals(dayTotalAfterVAT),
                },
            ]);


            totalAmountBeforeVAT += dayTotalBeforeVAT;
            totalAmountAfterVAT += dayTotalAfterVAT;
            totalVAT += dayVAT;


        }//end for


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
                value: trimTo2Decimals(totalAmountBeforeVAT),
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
                value: trimTo2Decimals(totalVAT),
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
                value: trimTo2Decimals(totalAmountAfterVAT),
            },
        ]);


        setExcelData(excelData);

        console.log("excelData:", excelData);
    }

    function makeQuotationSalesReturnReportFilename() {
        quotationsalesReturnReportFileName = "Quotation Sales Return Report";
        if (searchParams["from_date"] && searchParams["to_date"]) {
            quotationsalesReturnReportFileName += " - From " + searchParams["from_date"] + " to " + searchParams["to_date"];
        } else if (searchParams["from_date"]) {
            quotationsalesReturnReportFileName += " - From " + searchParams["from_date"] + " to " + format(
                new Date(),
                "dd-MMM-yyyy"
            );
        } else if (searchParams["to_date"]) {
            quotationsalesReturnReportFileName += " - Upto " + searchParams["to_date"];
        } else if (searchParams["date_str"]) {
            quotationsalesReturnReportFileName += " of " + searchParams["date_str"];
        }

        setQuotationSalesReturnReportFileName(quotationsalesReturnReportFileName);
    }
    async function getAllQuotationSalesReturns() {
        const requestOptions = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: localStorage.getItem("access_token"),
            },
        };
        let Select =
            "select=id,code,date,total,net_total,discount_percent,discount,products,customer_name,created_at,vat_price,loss,net_profit";

        if (localStorage.getItem("store_id")) {
            searchParams.store_id = localStorage.getItem("store_id");
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

        let quotationsalesReturns = [];
        var pageNo = 1;

        makeQuotationSalesReturnReportFilename();

        for (; true;) {

            fettingAllRecordsInProgress = true;
            setFettingAllRecordsInProgress(true);
            let res = await fetch(
                "/v1/quotation-sales-return?" +
                Select +
                queryParams +
                "&sort=" +
                sortQuotationSalesReturn +
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
            quotationsalesReturns = quotationsalesReturns.concat(res);
            pageNo++;
        }

        allQuotationSalesReturns = quotationsalesReturns;
        setAllQuotationSalesReturns(quotationsalesReturns);

        console.log("allQuotationSalesReturns:", allQuotationSalesReturns);
        prepareExcelData();
        fettingAllRecordsInProgress = false;
        setFettingAllRecordsInProgress(false);

    }


    //Search params
    const [searchParams, setSearchParams] = useState({});
    let [sortField, setSortField] = useState("created_at");
    let [sortQuotationSalesReturn, setSortQuotationSalesReturn] = useState("-");

    function ObjectToSearchQueryParams(object) {
        return Object.keys(object)
            .map(function (key) {
                return `search[${key}]=${object[key]}`;
            })
            .join("&");
    }

    async function suggestCustomers(searchTerm) {
        console.log("Inside handle suggestCustomers");

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

        let Select = "select=id,code,additional_keywords,vat_no,name,phone,name_in_arabic,phone_in_arabic,search_label";
        let result = await fetch(
            `/v1/customer?${Select}${queryString}`,
            requestOptions
        );
        let data = await result.json();

        setCustomerOptions(data.result);
    }

    async function suggestUsers(searchTerm) {
        console.log("Inside handle suggestUsers");
        setCustomerOptions([]);

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

    function searchByMultipleValuesField(field, values, noList) {
        if (field === "created_by") {
            setSelectedCreatedByUsers(values);
        } else if (field === "customer_id") {
            setSelectedCustomers(values);
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

        if (!noList) {
            list();
        }

    }

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
            "select=id,code,date,net_total,created_by_name,customer_name,customer_id,status,created_at,net_profit,net_loss,cash_discount,quotation_code,quotation_id,total_payment_paid,payments_count,payment_methods,payment_status,balance_amount,store_id";
        if (localStorage.getItem("store_id")) {
            searchParams.store_id = localStorage.getItem("store_id");
        }

        if (props.order) {
            searchParams.order_id = props.order.id;
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
            "/v1/quotation-sales-return?" +
            Select +
            queryParams +
            "&sort=" +
            sortQuotationSalesReturn +
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
                setQuotationSalesReturnList(data.result);

                let pageCount = parseInt((data.total_count + pageSize - 1) / pageSize);

                setTotalPages(pageCount);
                setTotalItems(data.total_count);
                setOffset((page - 1) * pageSize);
                setCurrentPageItemsCount(data.result.length);
                setTotalQuotationSalesReturn(data.meta.total_quotation_sales_return);
                setNetProfit(data.meta.net_profit);
                setLoss(data.meta.net_loss);
                setVatPrice(data.meta.vat_price);
                setTotalShippingHandlingFees(data.meta.shipping_handling_fees);
                setTotalDiscount(data.meta.discount);
                setTotalCashDiscount(data.meta.cash_discount);
                setTotalPaidQuotationSalesReturn(data.meta.paid_quotation_sales_return);
                setTotalUnPaidQuotationSalesReturn(data.meta.unpaid_quotation_sales_return);
                setTotalCashQuotationSalesReturn(data.meta.cash_quotation_sales_return);
                setTotalBankAccountQuotationSalesReturn(data.meta.bank_account_quotation_sales_return);

            })
            .catch((error) => {
                setIsListLoading(false);
                setIsRefreshInProcess(false);
                console.log(error);
            });
    }, [sortQuotationSalesReturn, sortField, page, pageSize, statsOpen, searchParams, props.order]);

    useEffect(() => {
        if (statsOpen) {
            list();  // Call list() whenever statsOpen changes to true
        }
    }, [statsOpen, list]);


    useEffect(() => {
        if (lastMessage) {
            const jsonMessage = JSON.parse(lastMessage.data);
            console.log("Received Message in User list:", jsonMessage);
            if (jsonMessage.event === "quotationsales_return_updated") {
                list();
            }
        }
    }, [lastMessage, list]);

    useEffect(() => {
        const handleSocketOpen = () => {
            //console.log("WebSocket Opened in quotationsales list");
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
        sortQuotationSalesReturn = sortQuotationSalesReturn === "-" ? "" : "-";
        setSortQuotationSalesReturn(sortQuotationSalesReturn);
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



    //QuotationSales Return Payments
    const QuotationSalesReturnPaymentCreateRef = useRef();


    const QuotationSalesReturnPaymentDetailsViewRef = useRef();
    function openQuotationSalesReturnPaymentDetailsView(id) {
        QuotationSalesReturnPaymentDetailsViewRef.current.open(id);
    }

    function openQuotationSalesReturnPaymentUpdateForm(id) {
        QuotationSalesReturnPaymentCreateRef.current.open(id);
    }

    let [netProfit, setNetProfit] = useState(0.00);
    let [loss, setLoss] = useState(0.00);


    let sortOrder = "-";
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
            id: "customer_account",
            name: "Customer account",
        },
    ];
    const [selectedPaymentMethodList, setSelectedPaymentMethodList] = useState([]);
    const [selectedPaymentStatusList, setSelectedPaymentStatusList] = useState([]);

    const [selectedQuotationSalesReturn, setSelectedQuotationSalesReturn] = useState({});
    let [showQuotationSalesReturnPaymentHistory, setShowQuotationSalesReturnPaymentHistory] = useState(false);

    function openPaymentsDialogue(quotationsalesReturn) {
        setSelectedQuotationSalesReturn(quotationsalesReturn);
        showQuotationSalesReturnPaymentHistory = true;
        setShowQuotationSalesReturnPaymentHistory(true);
    }

    function handlePaymentHistoryClose() {
        showQuotationSalesReturnPaymentHistory = false;
        setShowQuotationSalesReturnPaymentHistory(false);
        //list();
    }

    const CreateFormRef = useRef();
    function openUpdateForm(id, orderID) {
        CreateFormRef.current.open(id, orderID);
    }

    function openCreateForm(sale) {
        if (sale) {
            CreateFormRef.current.open(undefined, sale.id);
        } else {
            CreateFormRef.current.open(undefined, props.order.id);
        }
    }

    const QuotationSalesReturnPaymentListRef = useRef();


    const handleSummaryToggle = (isOpen) => {
        statsOpen = isOpen
        setStatsOpen(statsOpen);
    };

    const QuotationsRef = useRef();
    function openQuotationSales() {
        QuotationsRef.current.open(true, [], "invoice");
    }

    const handleSelectedQuotationSale = (selected) => {
        openCreateForm(selected);
    };


    /*
    const PreviewRef = useRef();
    function openPreview(model) {
        PreviewRef.current.open(model, undefined, "quotation_sales_return");
    }
        */

    function sendWhatsAppMessage(model) {
        PreviewRef.current.open(model, "whatsapp", "whatsapp_quotation_sales_return");
    }

    const customerSearchRef = useRef();
    const timerRef = useRef(null);

    const handleSelected = (selected) => {
        props.onSelectQuotationSalesReturn(selected); // Send to parent
    };



    //Printing
    let [showPrintTypeSelection, setShowPrintTypeSelection] = useState(false);

    const printButtonRef = useRef();
    const printA4ButtonRef = useRef();

    const PreviewRef = useRef();
    const openPreview = useCallback((quotation) => {
        setShowOrderPreview(true);
        setShowPrintTypeSelection(false);

        if (timerRef.current) clearTimeout(timerRef.current);

        timerRef.current = setTimeout(() => {
            PreviewRef.current?.open(quotation, undefined, "quotation_sales_return");
        }, 100);

    }, []);


    let [showOrderPreview, setShowOrderPreview] = useState(false);

    const openPrintTypeSelection = useCallback((quotationSalesReturn) => {
        setSelectedQuotationSalesReturn(quotationSalesReturn);
        if (store.settings?.enable_invoice_print_type_selection) {
            // showPrintTypeSelection = true;
            setShowOrderPreview(true);
            setShowPrintTypeSelection(true);
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => {
                printButtonRef.current?.focus();
            }, 100);
        } else {
            openPreview(quotationSalesReturn);
        }
    }, [openPreview, store]);



    const PrintRef = useRef();
    const openPrint = useCallback((quotation) => {
        // document.removeEventListener('keydown', handleEnterKey);
        setShowPrintTypeSelection(false);
        PrintRef.current?.open(quotation, "quotation_sales_return");
    }, []);



    //Table settings
    const [showSuccess, setShowSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState(false);

    const defaultColumns = useMemo(() => [
        { key: "actions", label: "Actions", fieldName: "actions", visible: true },
        { key: "select", label: "Select", fieldName: "select", visible: true },
        { key: "id", label: "Qtn. Sales Return ID", fieldName: "code", visible: true },
        { key: "date", label: "Date", fieldName: "date", visible: true },
        { key: "customer", label: "Customer", fieldName: "customer_name", visible: true },
        { key: "net_total", label: "Net Total", fieldName: "net_total", visible: true },
        { key: "amount_paid", label: "Amount Paid", fieldName: "total_payment_paid", visible: true },
        { key: "credit_balance", label: "Credit Balance", fieldName: "balance_amount", visible: true },
        { key: "quotation_code", label: "Qtn. Sales ID", fieldName: "quotation_code", visible: true },
        { key: "payment_status", label: "Payment Status", fieldName: "payment_status", visible: true },
        { key: "payment_methods", label: "Payment Methods", fieldName: "payment_methods", visible: true },
        { key: "cash_discount", label: "Cash Discount", fieldName: "cash_discount", visible: true },
        { key: "discount", label: "Discount", fieldName: "discount", visible: true },
        { key: "net_profit", label: "Net Profit", fieldName: "net_profit", visible: true },
        { key: "net_loss", label: "Net Loss", fieldName: "net_loss", visible: true },
        { key: "created_by", label: "Created By", fieldName: "created_by", visible: true },
        { key: "created_at", label: "Created At", fieldName: "created_at", visible: true },
        { key: "actions_end", label: "Actions", fieldName: "actions_end", visible: true },
    ], []);


    const [columns, setColumns] = useState(defaultColumns);
    const [showSettings, setShowSettings] = useState(false);
    // Load settings from localStorage
    useEffect(() => {
        const saved = localStorage.getItem("quotation_sales_return_table_settings");
        if (saved) setColumns(JSON.parse(saved));

        let missingOrUpdated = false;
        for (let i = 0; i < defaultColumns.length; i++) {
            if (!saved)
                break;

            const savedCol = JSON.parse(saved)?.find(col => col.fieldName === defaultColumns[i].fieldName);

            missingOrUpdated = !savedCol || savedCol.label !== defaultColumns[i].label || savedCol.key !== defaultColumns[i].key;

            if (missingOrUpdated) {
                break
            }
        }

        /*
        for (let i = 0; i < saved.length; i++) {
            const savedCol = defaultColumns.find(col => col.fieldName === saved[i].fieldName);
     
            missingOrUpdated = !savedCol || savedCol.label !== saved[i].label || savedCol.key !== saved[i].key;
     
            if (missingOrUpdated) {
                break
            }
        }*/

        if (missingOrUpdated) {
            localStorage.setItem("quotation_sales_return_table_settings", JSON.stringify(defaultColumns));
            setColumns(defaultColumns);
        }

        //2nd

    }, [defaultColumns]);

    function RestoreDefaultSettings() {
        localStorage.setItem("quotation_sales_return_table_settings", JSON.stringify(defaultColumns));
        setColumns(defaultColumns);

        setShowSuccess(true);
        setSuccessMessage("Successfully restored to default settings!")
    }

    // Save column settings to localStorage
    useEffect(() => {
        localStorage.setItem("quotation_sales_return_table_settings", JSON.stringify(columns));
    }, [columns]);

    const handleToggleColumn = (index) => {
        const updated = [...columns];
        updated[index].visible = !updated[index].visible;
        setColumns(updated);
    };

    const onDragEnd = (result) => {
        if (!result.destination) return;
        const reordered = Array.from(columns);
        const [moved] = reordered.splice(result.source.index, 1);
        reordered.splice(result.destination.index, 0, moved);
        setColumns(reordered);
    };


    return (
        <>
            {/* ⚙️ Settings Modal */}
            <Modal
                show={showSettings}
                onHide={() => setShowSettings(false)}
                centered
                size="lg"
            >
                <Modal.Header closeButton>
                    <Modal.Title>
                        <i
                            className="bi bi-gear-fill"
                            style={{ fontSize: "1.2rem", marginRight: "4px" }}
                            title="Table Settings"

                        />
                        Qtn. Sales Return Settings
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {/* Column Settings */}
                    {showSettings && (
                        <>
                            <h6 className="mb-2">Customize Columns</h6>
                            <DragDropContext onDragEnd={onDragEnd}>
                                <Droppable droppableId="columns">
                                    {(provided) => (
                                        <ul
                                            className="list-group"
                                            {...provided.droppableProps}
                                            ref={provided.innerRef}
                                        >
                                            {columns.map((col, index) => {
                                                return (
                                                    <>
                                                        {col.key === "select" && enableSelection && <Draggable
                                                            key={col.key}
                                                            draggableId={col.key}
                                                            index={index}
                                                        >
                                                            {(provided) => (
                                                                <li
                                                                    className="list-group-item d-flex justify-content-between align-items-center"
                                                                    ref={provided.innerRef}
                                                                    {...provided.draggableProps}
                                                                    {...provided.dragHandleProps}                                                        >
                                                                    <div>
                                                                        <input
                                                                            style={{ width: "20px", height: "20px" }}
                                                                            type="checkbox"
                                                                            className="form-check-input me-2"
                                                                            checked={col.visible}
                                                                            onChange={() => {
                                                                                handleToggleColumn(index);
                                                                            }}
                                                                        />
                                                                        {col.label}
                                                                    </div>
                                                                    <span style={{ cursor: "grab" }}>☰</span>
                                                                </li>
                                                            )}
                                                        </Draggable>}

                                                        {col.key !== "select" && <Draggable
                                                            key={col.key}
                                                            draggableId={col.key}
                                                            index={index}
                                                        >
                                                            {(provided) => (
                                                                <li
                                                                    className="list-group-item d-flex justify-content-between align-items-center"
                                                                    ref={provided.innerRef}
                                                                    {...provided.draggableProps}
                                                                    {...provided.dragHandleProps}                                                        >
                                                                    <div>
                                                                        <input
                                                                            style={{ width: "20px", height: "20px" }}
                                                                            type="checkbox"
                                                                            className="form-check-input me-2"
                                                                            checked={col.visible}
                                                                            onChange={() => {
                                                                                handleToggleColumn(index);
                                                                            }}
                                                                        />
                                                                        {col.label}
                                                                    </div>
                                                                    <span style={{ cursor: "grab" }}>☰</span>
                                                                </li>
                                                            )}
                                                        </Draggable>}
                                                    </>)
                                            })}
                                            {provided.placeholder}
                                        </ul>
                                    )}
                                </Droppable>
                            </DragDropContext>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowSettings(false)}>
                        Close
                    </Button>
                    <Button
                        variant="primary"
                        onClick={() => {
                            RestoreDefaultSettings();
                            // Save to localStorage here if needed
                            //setShowSettings(false);
                        }}
                    >
                        Restore to Default
                    </Button>
                </Modal.Footer>
            </Modal>

            <Modal show={showSuccess} onHide={() => setShowSuccess(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Success</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Alert variant="success">
                        {successMessage}
                    </Alert>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowSuccess(false)}>
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>

            <OrderPrint ref={PrintRef} />
            <Modal show={showPrintTypeSelection} onHide={() => {
                showPrintTypeSelection = false;
                setShowPrintTypeSelection(showPrintTypeSelection);
            }} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Select Print Type</Modal.Title>
                </Modal.Header>
                <Modal.Body className="d-flex justify-content-around">
                    <Button variant="secondary" ref={printButtonRef} onClick={() => {
                        openPrint(selectedQuotationSalesReturn);
                    }} onKeyDown={(e) => {
                        if (timerRef.current) clearTimeout(timerRef.current);

                        if (e.key === "ArrowRight") {
                            timerRef.current = setTimeout(() => {
                                printA4ButtonRef.current.focus();
                            }, 100);
                        }
                    }}>
                        <i className="bi bi-printer"></i> Print
                    </Button>

                    <Button variant="primary" ref={printA4ButtonRef} onClick={() => {
                        openPreview(selectedQuotationSalesReturn);
                    }}
                        onKeyDown={(e) => {
                            if (timerRef.current) clearTimeout(timerRef.current);

                            if (e.key === "ArrowLeft") {
                                timerRef.current = setTimeout(() => {
                                    printButtonRef.current.focus();
                                }, 100);
                            }
                        }}
                    >
                        <i className="bi bi-printer"></i> Print A4 Invoice
                    </Button>
                </Modal.Body>
            </Modal>
            <ReportPreview ref={ReportPreviewRef} searchParams={searchParams} sortOrder={sortOrder} sortField={sortField} />
            {showOrderPreview && <OrderPreview ref={PreviewRef} />}
            <Quotations ref={QuotationsRef} onSelectQuotation={handleSelectedQuotationSale} showToastMessage={props.showToastMessage} />
            <QuotationSalesReturnCreate ref={CreateFormRef} refreshList={list} refreshQuotationSalesList={props.refreshQuotationSalesList} showToastMessage={props.showToastMessage} />
            <QuotationSalesReturnView ref={DetailsViewRef} />

            <QuotationSalesReturnPaymentCreate ref={QuotationSalesReturnPaymentCreateRef} showToastMessage={props.showToastMessage} openDetailsView={openQuotationSalesReturnPaymentDetailsView} />
            <QuotationSalesReturnPaymentDetailsView ref={QuotationSalesReturnPaymentDetailsViewRef} openUpdateForm={openQuotationSalesReturnPaymentUpdateForm} showToastMessage={props.showToastMessage} />

            <div className="container-fluid p-0">
                <div className="row">

                    <div className="col">
                        <span className="text-end">
                            <StatsSummary
                                title="Quotation Sales Return"
                                stats={{
                                    "Sales Return": totalQuotationSalesReturn,
                                    "Cash Sales Return": totalCashQuotationSalesReturn,
                                    "Credit Sales Return": totalUnPaidQuotationSalesReturn,
                                    "Bank Account Sales Return": totalBankAccountQuotationSalesReturn,
                                    "Cash Discount Return": totalCashDiscount,
                                    "VAT Return": vatPrice,
                                    "Net Profit Return %": netProfit && totalQuotationSalesReturn ? ((netProfit / totalQuotationSalesReturn) * 100) : "",
                                    "Paid Sales Return": totalPaidQuotationSalesReturn,
                                    "Sales Discount Return": totalDiscount,
                                    "Shipping/Handling fees Return": totalShippingHandlingFees,
                                    "Net Profit Return": netProfit,
                                    "Net Loss Return": loss,
                                }}
                                onToggle={handleSummaryToggle}
                            />
                        </span>
                    </div>

                </div>

                <div className="row">
                    <div className="col">
                        <h1 className="h3">Quotation Sales Returns</h1>
                    </div>

                    <div className="col text-end">
                        <Button variant="primary" onClick={() => {
                            openReportPreview();
                        }} style={{ marginRight: "8px" }} className="btn btn-primary mb-3">
                            <i className="bi bi-printer"></i>&nbsp;
                            Print Report
                        </Button>

                        <ExcelFile filename={quotationsalesReturnReportFileName} element={excelData.length > 0 ? <Button variant="success" className="btn btn-primary mb-3 success" >Download QuotationSales Return Report</Button> : ""}>
                            <ExcelSheet dataSet={excelData} name={quotationsalesReturnReportFileName} />
                        </ExcelFile>

                        {excelData.length === 0 ? <Button variant="primary" className="btn btn-primary mb-3" onClick={getAllQuotationSalesReturns} >{fettingAllRecordsInProgress ? "Preparing.." : "Quotation Sales Return Report"}</Button> : ""}
                        &nbsp;&nbsp;


                        {/*<div className="col text-end">
                            {props.order ? <Button
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
                            onClick={openQuotationSales}
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
                                            <p className="text-start">No QuotationSalesReturns to display</p>
                                        </div>
                                    )}
                                </div>
                                <div className="row" style={{ bquotationsalesreturn: "solid 0px" }}>
                                    <div className="col text-start" style={{ bquotationsalesreturn: "solid 0px" }}>
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
                                                    animation="bquotationsalesreturn"
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
                                                        bquotationsalesreturn: "solid 1px",
                                                        bquotationsalesreturnColor: "silver",
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
                                    <div className="col" style={{ bquotationsalesreturn: "solid 0px" }}>

                                        {totalPages ? < ReactPaginate
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
                                    <div className="col text-end">
                                        <button
                                            className="btn btn-sm btn-outline-secondary"
                                            onClick={() => {
                                                setShowSettings(!showSettings);
                                            }}
                                        >
                                            <i
                                                className="bi bi-gear-fill"
                                                style={{ fontSize: "1.2rem" }}
                                                title="Table Settings"

                                            />
                                        </button>
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
                                                {columns.filter(c => c.visible).map((col) => {
                                                    return (<>
                                                        {col.key === "actions" && <th key={col.key}>{col.label}</th>}
                                                        {col.key === "select" && enableSelection && <th key={col.key}>{col.label}</th>}
                                                        {col.key !== "actions" && col.key !== "select" && <th>
                                                            <b
                                                                style={{
                                                                    textDecoration: "underline",
                                                                    cursor: "pointer",
                                                                }}
                                                                onClick={() => {
                                                                    sort(col.fieldName);
                                                                }}
                                                            >
                                                                {col.label}
                                                                {sortField === col.fieldName && sortOrder === "-" ? (
                                                                    <i className="bi bi-sort-alpha-up-alt"></i>
                                                                ) : null}
                                                                {sortField === col.fieldName && sortOrder === "" ? (
                                                                    <i className="bi bi-sort-alpha-up"></i>
                                                                ) : null}
                                                            </b>
                                                        </th>}
                                                    </>);
                                                })}
                                                {/*<th>Actions</th>
                                                {enableSelection && <th>Select</th>}
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
                                                        Qtn. Sales Return ID
                                                        {sortField === "code" && sortQuotationSalesReturn === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "code" && sortQuotationSalesReturn === "" ? (
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
                                                        {sortField === "date" && sortQuotationSalesReturn === "-" ? (
                                                            <i className="bi bi-sort-down"></i>
                                                        ) : null}
                                                        {sortField === "date" && sortQuotationSalesReturn === "" ? (
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
                                                            sort("customer_name");
                                                        }}
                                                    >
                                                        Customer
                                                        {sortField === "customer_name" &&
                                                            sortQuotationSalesReturn === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "customer_name" && sortQuotationSalesReturn === "" ? (
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
                                                        {sortField === "net_total" && sortQuotationSalesReturn === "-" ? (
                                                            <i className="bi bi-sort-numeric-down"></i>
                                                        ) : null}
                                                        {sortField === "net_total" && sortQuotationSalesReturn === "" ? (
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
                                                        Amount paid
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
                                                            sort("quotation_code");
                                                        }}
                                                    >
                                                        Qtn. Sales ID
                                                        {sortField === "quotation_code" && sortQuotationSalesReturn === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "quotation_code" && sortQuotationSalesReturn === "" ? (
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
                                                            sort("net_profit");
                                                        }}
                                                    >
                                                        Net Profit
                                                        {sortField === "net_profit" && sortQuotationSalesReturn === "-" ? (
                                                            <i className="bi bi-sort-numeric-down"></i>
                                                        ) : null}
                                                        {sortField === "net_profit" && sortQuotationSalesReturn === "" ? (
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
                                                            sort("net_loss");
                                                        }}
                                                    >
                                                        Net Loss
                                                        {sortField === "net_loss" && sortQuotationSalesReturn === "-" ? (
                                                            <i className="bi bi-sort-numeric-down"></i>
                                                        ) : null}
                                                        {sortField === "net_loss" && sortQuotationSalesReturn === "" ? (
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
                                                            sort("created_by");
                                                        }}
                                                    >
                                                        Created By
                                                        {sortField === "created_by" && sortQuotationSalesReturn === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "created_by" && sortQuotationSalesReturn === "" ? (
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
                                                        {sortField === "created_at" && sortQuotationSalesReturn === "-" ? (
                                                            <i className="bi bi-sort-down"></i>
                                                        ) : null}
                                                        {sortField === "created_at" && sortQuotationSalesReturn === "" ? (
                                                            <i className="bi bi-sort-up"></i>
                                                        ) : null}
                                                    </b>
                                                </th>
                                                <th>Actions</th>*/}
                                            </tr>
                                        </thead>

                                        <thead>
                                            <tr className="text-center">
                                                {columns.filter(c => c.visible).map((col) => {
                                                    return (<>
                                                        {(col.key === "actions" || col.key === "actions_end") && <th></th>}
                                                        {(col.key === "select") && enableSelection && <th></th>}
                                                        {col.key !== "actions" &&
                                                            col.key !== "date" &&
                                                            col.key !== "payment_status" &&
                                                            col.key !== "payment_methods" &&
                                                            col.key !== "created_by" &&
                                                            col.key !== "created_at" &&
                                                            col.key !== "actions_end" &&
                                                            col.key !== "customer" &&
                                                            col.key !== "select" &&
                                                            <th><input
                                                                type="text"
                                                                id={"quotation_sales_return_" + col.fieldName}
                                                                name={"quotation_sales_return_" + col.fieldName}
                                                                onChange={(e) =>
                                                                    searchByFieldValue(col.fieldName, e.target.value)
                                                                }
                                                                className="form-control"
                                                            />
                                                            </th>}
                                                        {col.key === "payment_methods" && <th>
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

                                                        </th>}
                                                        {col.key === "created_by" && <th>
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
                                                        </th>}
                                                        {col.key === "created_at" && <th>
                                                            <DatePicker
                                                                id="created_at"
                                                                value={createdAtValue}
                                                                selected={selectedCreatedAtDate}
                                                                className="form-control"
                                                                dateFormat="MMM dd yyyy"
                                                                isClearable={true}
                                                                onChange={(date) => {
                                                                    if (!date) {
                                                                        //  createdAtValue = "";
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
                                                        </th>}
                                                        {col.key === "payment_status" && <th>
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
                                                        </th>}
                                                        {col.key === "customer" && <th>
                                                            <Typeahead
                                                                id="customer_id"
                                                                filterBy={['additional_keywords']}
                                                                labelKey="search_label"
                                                                style={{ minWidth: "300px" }}
                                                                onChange={(selectedItems) => {
                                                                    searchByMultipleValuesField(
                                                                        "customer_id",
                                                                        selectedItems
                                                                    );
                                                                }}
                                                                options={customerOptions}
                                                                placeholder="Customer Name / Mob / VAT # / ID"
                                                                selected={selectedCustomers}
                                                                highlightOnlyResult={true}
                                                                onInputChange={(searchTerm, e) => {
                                                                    if (timerRef.current) clearTimeout(timerRef.current);
                                                                    timerRef.current = setTimeout(() => {
                                                                        suggestCustomers(searchTerm);
                                                                    }, 100);
                                                                }}
                                                                ref={customerSearchRef}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === "Escape") {
                                                                        setCustomerOptions([]);
                                                                        customerSearchRef.current?.clear();
                                                                    }
                                                                }}
                                                                multiple
                                                            />
                                                        </th>}
                                                        {col.key === "date" && <th>
                                                            <div id="calendar-portal" className="date-picker " style={{ minWidth: "125px" }}>
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

                                                                <br />
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
                                                        </th>}
                                                    </>);
                                                })}

                                                {/* <th></th>
                                                {enableSelection && <th></th>}
                                                <th>
                                                    <input
                                                        type="text"
                                                        id="quotationsales_return_code"
                                                        name="quotationsales_return_code"
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
                                                        id="customer_id"
                                                        filterBy={['additional_keywords']}
                                                        labelKey="search_label"
                                                        style={{ minWidth: "300px" }}
                                                        onChange={(selectedItems) => {
                                                            searchByMultipleValuesField(
                                                                "customer_id",
                                                                selectedItems
                                                            );
                                                        }}
                                                        options={customerOptions}
                                                        placeholder="Customer Name / Mob / VAT # / ID"
                                                        selected={selectedCustomers}
                                                        highlightOnlyResult={true}
                                                        onInputChange={(searchTerm, e) => {
                                                            if (timerRef.current) clearTimeout(timerRef.current);
                                                            timerRef.current = setTimeout(() => {
                                                                suggestCustomers(searchTerm);
                                                            }, 100);
                                                        }}
                                                        ref={customerSearchRef}
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Escape") {
                                                                setCustomerOptions([]);
                                                                customerSearchRef.current?.clear();
                                                            }
                                                        }}
                                                        multiple
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        id="quotationsales_return_net_total"
                                                        name="quotationsales_return_net_total"
                                                        onChange={(e) =>
                                                            searchByFieldValue("net_total", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>

                                                <th>
                                                    <input
                                                        type="text"
                                                        id="quotationsales_return_total_payment_paid"
                                                        name="quotationsales_return_total_payment_paid"
                                                        onChange={(e) =>
                                                            searchByFieldValue("total_payment_paid", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        id="quotationsales_return_balance_amount"
                                                        name="quotationsales_return_balance_amount"
                                                        onChange={(e) =>
                                                            searchByFieldValue("balance_amount", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        id="quotationsales_return_quotation_code"
                                                        name="quotationsales_return_quotation_code"
                                                        onChange={(e) =>
                                                            searchByFieldValue("quotation_code", e.target.value)
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
                                                        id="quotationsales_return_cash_discount"
                                                        name="quotationsales_return_cash_discount"
                                                        onChange={(e) =>
                                                            searchByFieldValue("cash_discount", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        id="quotationsales_return_net_profit"
                                                        name="quotationsales_return_net_profit"
                                                        onChange={(e) =>
                                                            searchByFieldValue("net_profit", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        id="quotationsales_return_net_loss"
                                                        name="quotationsales_return_net_loss"
                                                        onChange={(e) =>
                                                            searchByFieldValue("net_loss", e.target.value)
                                                        }
                                                        className="form-control"
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
                                                <th></th>*/}
                                            </tr>
                                        </thead>
                                        <tbody className="text-center">
                                            {quotationsalesreturnList &&
                                                quotationsalesreturnList.map((quotationSalesReturn, index) => (
                                                    <tr key={index}>
                                                        {columns.filter(c => c.visible).map((col) => {
                                                            return (<>
                                                                {(col.key === "actions" || col.key === "actions_end") && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                    <Button className="btn btn-light btn-sm" onClick={() => {
                                                                        openUpdateForm(quotationSalesReturn.id);
                                                                    }}>
                                                                        <i className="bi bi-pencil"></i>
                                                                    </Button>&nbsp;
                                                                    <Button className="btn btn-primary btn-sm" onClick={() => {
                                                                        openDetailsView(quotationSalesReturn.id);
                                                                    }}>
                                                                        <i className="bi bi-eye"></i>
                                                                    </Button>&nbsp;
                                                                    <Button className="btn btn-primary btn-sm" onClick={() => {
                                                                        openPrintTypeSelection(quotationSalesReturn);
                                                                    }}>
                                                                        <i className="bi bi-printer"></i>
                                                                    </Button>
                                                                    &nbsp;
                                                                    <Button className={`btn btn-success btn-sm`} style={{}} onClick={() => {
                                                                        sendWhatsAppMessage(quotationSalesReturn);
                                                                    }}>
                                                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="white" viewBox="0 0 16 16">
                                                                            <path d="M13.601 2.326A7.875 7.875 0 0 0 8.036 0C3.596 0 0 3.597 0 8.036c0 1.417.37 2.805 1.07 4.03L0 16l3.993-1.05a7.968 7.968 0 0 0 4.043 1.085h.003c4.44 0 8.036-3.596 8.036-8.036 0-2.147-.836-4.166-2.37-5.673ZM8.036 14.6a6.584 6.584 0 0 1-3.35-.92l-.24-.142-2.37.622.63-2.31-.155-.238a6.587 6.587 0 0 1-1.018-3.513c0-3.637 2.96-6.6 6.6-6.6 1.764 0 3.42.69 4.67 1.94a6.56 6.56 0 0 1 1.93 4.668c0 3.637-2.96 6.6-6.6 6.6Zm3.61-4.885c-.198-.1-1.17-.578-1.352-.644-.18-.066-.312-.1-.444.1-.13.197-.51.644-.626.775-.115.13-.23.15-.428.05-.198-.1-.837-.308-1.594-.983-.59-.525-.99-1.174-1.11-1.372-.116-.198-.012-.305.088-.403.09-.09.198-.23.298-.345.1-.115.132-.197.2-.33.065-.13.032-.247-.017-.345-.05-.1-.444-1.07-.61-1.46-.16-.384-.323-.332-.444-.338l-.378-.007c-.13 0-.344.048-.525.23s-.688.672-.688 1.64c0 .967.704 1.9.802 2.03.1.13 1.386 2.116 3.365 2.963.47.203.837.324 1.122.414.472.15.902.13 1.24.08.378-.057 1.17-.48 1.336-.942.165-.462.165-.858.116-.943-.048-.084-.18-.132-.378-.23Z" />
                                                                        </svg>
                                                                    </Button>
                                                                </td>
                                                                }
                                                                {(col.fieldName === "select" && enableSelection) && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                    <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                        <Button className="btn btn-success btn-sm" onClick={() => {
                                                                            handleSelected(quotationSalesReturn);
                                                                        }}>
                                                                            Select
                                                                        </Button>
                                                                    </td>
                                                                </td>}
                                                                {(col.fieldName === "code") && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                    {quotationSalesReturn.code}
                                                                </td>}
                                                                {(col.fieldName === "quotation_code") && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                    {quotationSalesReturn.quotation_code}
                                                                </td>}
                                                                {(col.fieldName === "date" || col.fieldName === "created_at") && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                    {format(new Date(quotationSalesReturn[col.key]), "MMM dd yyyy h:mma")}
                                                                </td>}
                                                                {(col.fieldName === "customer_name") && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                    <OverflowTooltip value={quotationSalesReturn.customer_name} />
                                                                </td>}
                                                                {(col.fieldName === "net_total") && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                    <Amount amount={trimTo2Decimals(quotationSalesReturn.net_total)} />
                                                                </td>}
                                                                {(col.fieldName === "total_payment_paid") && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                    <Button variant="link" onClick={() => {
                                                                        openPaymentsDialogue(quotationSalesReturn);
                                                                    }}>
                                                                        <Amount amount={trimTo2Decimals(quotationSalesReturn.total_payment_paid)} />
                                                                    </Button>
                                                                </td>}
                                                                {(col.fieldName === "balance_amount") && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                    <Amount amount={trimTo2Decimals(quotationSalesReturn.balance_amount)} />
                                                                </td>}
                                                                {(col.fieldName === "payment_status") && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                    {quotationSalesReturn.payment_status === "paid" ?
                                                                        <span className="badge bg-success">
                                                                            Paid
                                                                        </span> : ""}
                                                                    {quotationSalesReturn.payment_status === "paid_partially" ?
                                                                        <span className="badge bg-warning">
                                                                            Paid Partially
                                                                        </span> : ""}
                                                                    {quotationSalesReturn.payment_status === "not_paid" ?
                                                                        <span className="badge bg-danger">
                                                                            Not Paid
                                                                        </span> : ""}
                                                                </td>}
                                                                {(col.fieldName === "payment_methods") && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                    {quotationSalesReturn.payment_methods &&
                                                                        quotationSalesReturn.payment_methods.map((name) => (
                                                                            <span className="badge bg-info">{name}</span>
                                                                        ))}
                                                                </td>}
                                                                {(col.fieldName === "cash_discount") && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                    <Amount amount={trimTo2Decimals(quotationSalesReturn.cash_discount)} />
                                                                </td>}
                                                                {(col.fieldName === "discount") && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                    {trimTo2Decimals(quotationSalesReturn.discount)}
                                                                </td>}
                                                                {(col.fieldName === "net_profit") && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                    <Amount amount={trimTo2Decimals(quotationSalesReturn.net_profit)} />
                                                                </td>}
                                                                {(col.fieldName === "net_loss") && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                    <Amount amount={trimTo2Decimals(quotationSalesReturn.net_loss)} />
                                                                </td>}
                                                                {(col.fieldName === "created_by") && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                    {quotationSalesReturn.created_by_name}
                                                                </td>}
                                                            </>)
                                                        })}

                                                        {/*<td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            <Button className="btn btn-light btn-sm" onClick={() => {
                                                                openUpdateForm(quotationsalesreturn.id, quotationsalesreturn.order_id);
                                                            }}>
                                                                <i className="bi bi-pencil"></i>
                                                            </Button>


                                                            <Button className="btn btn-primary btn-sm" onClick={() => {
                                                                openDetailsView(quotationsalesreturn.id);
                                                            }}>
                                                                <i className="bi bi-eye"></i>
                                                            </Button>
                                                            &nbsp;

                                                            <Button className="btn btn-primary btn-sm" onClick={() => {
                                                                //openPreview(quotationsalesreturn);
                                                                openPrintTypeSelection(quotationsalesreturn);
                                                            }}>
                                                                <i className="bi bi-printer"></i>
                                                            </Button>
                                                            &nbsp;
                                                            <Button className={`btn btn-success btn-sm`} style={{}} onClick={() => {
                                                                sendWhatsAppMessage(quotationsalesreturn);
                                                            }}>
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="white" viewBox="0 0 16 16">
                                                                    <path d="M13.601 2.326A7.875 7.875 0 0 0 8.036 0C3.596 0 0 3.597 0 8.036c0 1.417.37 2.805 1.07 4.03L0 16l3.993-1.05a7.968 7.968 0 0 0 4.043 1.085h.003c4.44 0 8.036-3.596 8.036-8.036 0-2.147-.836-4.166-2.37-5.673ZM8.036 14.6a6.584 6.584 0 0 1-3.35-.92l-.24-.142-2.37.622.63-2.31-.155-.238a6.587 6.587 0 0 1-1.018-3.513c0-3.637 2.96-6.6 6.6-6.6 1.764 0 3.42.69 4.67 1.94a6.56 6.56 0 0 1 1.93 4.668c0 3.637-2.96 6.6-6.6 6.6Zm3.61-4.885c-.198-.1-1.17-.578-1.352-.644-.18-.066-.312-.1-.444.1-.13.197-.51.644-.626.775-.115.13-.23.15-.428.05-.198-.1-.837-.308-1.594-.983-.59-.525-.99-1.174-1.11-1.372-.116-.198-.012-.305.088-.403.09-.09.198-.23.298-.345.1-.115.132-.197.2-.33.065-.13.032-.247-.017-.345-.05-.1-.444-1.07-.61-1.46-.16-.384-.323-.332-.444-.338l-.378-.007c-.13 0-.344.048-.525.23s-.688.672-.688 1.64c0 .967.704 1.9.802 2.03.1.13 1.386 2.116 3.365 2.963.47.203.837.324 1.122.414.472.15.902.13 1.24.08.378-.057 1.17-.48 1.336-.942.165-.462.165-.858.116-.943-.048-.084-.18-.132-.378-.23Z" />
                                                                </svg>
                                                            </Button>
                                                            &nbsp;
                                                        </td>
                                                        {enableSelection && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                            <Button className="btn btn-success btn-sm" onClick={() => {
                                                                handleSelected(quotationsalesreturn);
                                                            }}>
                                                                Select
                                                            </Button>
                                                        </td>}
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >{quotationsalesreturn.code}</td>

                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {format(
                                                                new Date(quotationsalesreturn.date),
                                                                "MMM dd yyyy h:mma"
                                                            )}
                                                        </td>
                                                        <td className="text-start" style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            <OverflowTooltip value={quotationsalesreturn.customer_name} />
                                                        </td>
                                                        <td> <Amount amount={quotationsalesreturn.net_total} /> </td>
                                                        <td>

                                                            <Button variant="link" onClick={() => {
                                                                openPaymentsDialogue(quotationsalesreturn);
                                                            }}>
                                                                <Amount amount={trimTo2Decimals(quotationsalesreturn.total_payment_paid)} />
                                                            </Button>

                                                        </td>
                                                        <td> <Amount amount={trimTo2Decimals(quotationsalesreturn.balance_amount)} /></td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >{quotationsalesreturn.quotation_code}</td>
                                                       
                                                        <td>
                                                            {quotationsalesreturn.payment_status === "paid" ?
                                                                <span className="badge bg-success">
                                                                    Paid
                                                                </span> : ""}
                                                            {quotationsalesreturn.payment_status === "paid_partially" ?
                                                                <span className="badge bg-warning">
                                                                    Paid Partially
                                                                </span> : ""}
                                                            {quotationsalesreturn.payment_status === "not_paid" ?
                                                                <span className="badge bg-danger">
                                                                    Not Paid
                                                                </span> : ""}
                                                        </td>
                                                        <td>

                                                            {quotationsalesreturn.payment_methods &&
                                                                quotationsalesreturn.payment_methods.map((name) => (
                                                                    <span className="badge bg-info">{name}</span>
                                                                ))}

                                                        </td>
                                                        <td>{trimTo2Decimals(quotationsalesreturn.cash_discount)}</td>
                                                        <td> <Amount amount={trimTo2Decimals(quotationsalesreturn.net_profit)} /> </td>
                                                        <td> <Amount amount={trimTo2Decimals(quotationsalesreturn.net_loss)} />  </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >{quotationsalesreturn.created_by_name}</td>

                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {format(
                                                                new Date(quotationsalesreturn.created_at),
                                                                "MMM dd yyyy h:mma"
                                                            )}
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            <Button className="btn btn-light btn-sm" onClick={() => {
                                                                openUpdateForm(quotationsalesreturn.id);
                                                            }}>
                                                                <i className="bi bi-pencil"></i>
                                                            </Button>


                                                            <Button className="btn btn-primary btn-sm" onClick={() => {
                                                                openDetailsView(quotationsalesreturn.id);
                                                            }}>
                                                                <i className="bi bi-eye"></i>
                                                            </Button>
                                                        </td>*/}
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

            <Modal show={showQuotationSalesReturnPaymentHistory} size="lg" onHide={handlePaymentHistoryClose} animation={false} scrollable={true}>
                <Modal.Header>
                    <Modal.Title>Payment history of Qtn. Sales Return #{selectedQuotationSalesReturn.code}</Modal.Title>

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
                    <QuotationSalesReturnPaymentIndex ref={QuotationSalesReturnPaymentListRef} showToastMessage={props.showToastMessage} quotationsalesReturn={selectedQuotationSalesReturn} refreshQuotationSalesReturnList={list} />
                </Modal.Body>
            </Modal>
        </>
    );
}

export default QuotationSalesReturnIndex;
