import React, { useState, useEffect, useRef, useContext, useCallback, useMemo } from "react";
import SalesReturnCreate from "./create.js";
import SalesReturnView from "./view.js";

import { Typeahead } from "react-bootstrap-typeahead";
import { format } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Button, Spinner, Modal, Alert } from "react-bootstrap";
import ReactPaginate from "react-paginate";

import SalesReturnPaymentCreate from "./../sales_return_payment/create.js";
import SalesReturnPaymentDetailsView from "./../sales_return_payment/view.js";
import SalesReturnPaymentIndex from "./../sales_return_payment/index.js";
import { formatDistanceToNowStrict } from "date-fns";
import { enUS } from "date-fns/locale";
import ReactExport from 'react-data-export';
import OverflowTooltip from "../utils/OverflowTooltip.js";
import { trimTo2Decimals } from "../utils/numberUtils";
import Amount from "../utils/amount.js";
import StatsSummary from "../utils/StatsSummary.js";
import { WebSocketContext } from "./../utils/WebSocketContext.js";
import eventEmitter from "./../utils/eventEmitter";
import Sales from "./../utils/sales.js";
import OrderPreview from "./../order/preview.js";
import ReportPreview from "./../order/report.js";
import OrderPrint from './../order/print.js';
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import CustomerCreate from "./../customer/create.js";


const ExcelFile = ReactExport.ExcelFile;
const ExcelSheet = ReactExport.ExcelFile.ExcelSheet;

const shortLocale = {
    ...enUS,
    formatDistance: (token, count) => {
        const format = {
            xSeconds: `${count}s`,
            xMinutes: `${count}m`,
            xHours: `${count}h`,
            xDays: `${count}d`,
            xMonths: `${count}mo`,
            xYears: `${count}y`,
        };
        return format[token] || "";
    },
};

const TimeAgo = ({ date }) => {
    return <span>{formatDistanceToNowStrict(new Date(date), { locale: shortLocale })} ago</span>;
};

function SalesReturnIndex(props) {
    let [enableSelection, setEnableSelection] = useState(false);

    const ReportPreviewRef = useRef();
    function openReportPreview() {
        ReportPreviewRef.current.open("sales_return_report");
    }

    const { lastMessage } = useContext(WebSocketContext);
    let [statsOpen, setStatsOpen] = useState(false);


    let [totalSalesReturn, setTotalSalesReturn] = useState(0.00);
    let [vatPrice, setVatPrice] = useState(0.00);
    let [totalShippingHandlingFees, setTotalShippingHandlingFees] = useState(0.00);
    let [totalDiscount, setTotalDiscount] = useState(0.00);
    let [totalCashDiscount, setTotalCashDiscount] = useState(0.00);
    let [totalPaidSalesReturn, setTotalPaidSalesReturn] = useState(0.00);
    let [totalUnPaidSalesReturn, setTotalUnPaidSalesReturn] = useState(0.00);
    let [totalCashSalesReturn, setTotalCashSalesReturn] = useState(0.00);
    let [totalBankAccountSalesReturn, setTotalBankAccountSalesReturn] = useState(0.00);

    //list
    const [salesreturnList, setSalesReturnList] = useState([]);

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


    useEffect(() => {
        if (props.enableSelection) {
            setEnableSelection(props.enableSelection);
        } else {
            setEnableSelection(false);
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


    const [showErrors, setShowErrors] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState(false);

    let [reportingInProgress, setReportingInProgress] = useState(false);

    let [errors, setErrors] = useState({});
    function ReportInvoiceToZatca(id, index) {
        // event.preventDefault();
        if (reportingInProgress === true) {
            return;
        }

        let searchParams = {};
        if (localStorage.getItem("store_id")) {
            searchParams.store_id = localStorage.getItem("store_id");
        }
        let queryParams = ObjectToSearchQueryParams(searchParams);

        let endPoint = "/v1/sales-return/zatca/report/" + id + "?" + queryParams;
        let method = "POST";
        const requestOptions = {
            method: method,
            headers: {
                'Accept': 'application/json',
                "Content-Type": "application/json",
                Authorization: localStorage.getItem("access_token"),
            },
        };

        reportingInProgress = true;
        setReportingInProgress(true);

        salesreturnList[index].zatca.reportingInProgress = true;
        setSalesReturnList([...salesreturnList]);

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


                reportingInProgress = false;
                setReportingInProgress(false);

                salesreturnList[index].zatca.reportingInProgress = false;
                setSalesReturnList([...salesreturnList]);

                console.log("Response:");
                console.log(data);
                if (props.showToastMessage) props.showToastMessage("Invoice reported successfully to Zatca!", "success");
                setShowSuccess(true);
                setSuccessMessage("Successfully Reported to Zatca!")
                list();
            })
            .catch((error) => {
                reportingInProgress = false;
                setReportingInProgress(false);
                salesreturnList[index].zatca.reportingInProgress = false;
                setSalesReturnList([...salesreturnList]);
                setShowErrors(true);
                console.log("Inside catch");
                console.log(error);
                setErrors({ ...error });
                // setErrors({ ...error });
                console.error("There was an error!", error);
                if (props.showToastMessage) props.showToastMessage("Invoice reporting to Zatca failed!", "danger");
                list();
            });
    }


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


    let [allSalesReturns, setAllSalesReturns] = useState([]);
    let [excelData, setExcelData] = useState([]);
    let [salesReturnReportFileName, setSalesReturnReportFileName] = useState("Sales Return Report");
    let [fettingAllRecordsInProgress, setFettingAllRecordsInProgress] = useState(false);

    function prepareExcelData() {
        console.log("Inside prepareExcelData()");
        var groupedByDate = [];
        for (var i = 0; i < allSalesReturns.length; i++) {
            let date = format(
                new Date(allSalesReturns[i].date),
                "dd-MMM-yyyy"
            );
            if (!groupedByDate[date]) {
                groupedByDate[date] = [];
            }

            groupedByDate[date].push(allSalesReturns[i]);

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
                let salesReturn = groupedByDate[returnDate][i2];
                excelData[0].data.push([{ value: "Inv No (" + salesReturn.code + ") - " + invoiceCount + " [" + salesReturn.customer_name + "]" }]);

                if (!salesReturn.products) {
                    continue;
                }

                let totalAmountAfterDiscount = salesReturn.total + salesReturn.shipping_handling_fees - salesReturn.discount;
                let totalAmountBeforeVat = salesReturn.total - salesReturn.discount + salesReturn.shipping_handling_fees;
                let totalAmountAfterVat = totalAmountBeforeVat + salesReturn.vat_price;

                for (var j = 0; j < salesReturn.products.length; j++) {

                    let product = salesReturn.products[j];

                    let unitDiscount = 0;

                    if (product.unit_discount) {
                        unitDiscount = product.unit_discount;
                    }

                    let gross_amount = product.unit_price * product.quantity;
                    let vat_percent = salesReturn.vat_percent ? salesReturn.vat_percent : 15.00;
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
                        value: trimTo2Decimals(salesReturn.shipping_handling_fees),
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
                        value: trimTo2Decimals(salesReturn.discount),
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
                        value: trimTo2Decimals(salesReturn.vat_price),
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


                dayVAT += salesReturn.vat_price;
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

    function makeSalesReturnReportFilename() {
        salesReturnReportFileName = "Sales Return Report";
        if (searchParams["from_date"] && searchParams["to_date"]) {
            salesReturnReportFileName += " - From " + searchParams["from_date"] + " to " + searchParams["to_date"];
        } else if (searchParams["from_date"]) {
            salesReturnReportFileName += " - From " + searchParams["from_date"] + " to " + format(
                new Date(),
                "dd-MMM-yyyy"
            );
        } else if (searchParams["to_date"]) {
            salesReturnReportFileName += " - Upto " + searchParams["to_date"];
        } else if (searchParams["date_str"]) {
            salesReturnReportFileName += " of " + searchParams["date_str"];
        }

        setSalesReturnReportFileName(salesReturnReportFileName);
    }
    async function getAllSalesReturns() {
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

        let salesReturns = [];
        var pageNo = 1;

        makeSalesReturnReportFilename();

        for (; true;) {

            fettingAllRecordsInProgress = true;
            setFettingAllRecordsInProgress(true);
            let res = await fetch(
                "/v1/sales-return?" +
                Select +
                queryParams +
                "&sort=" +
                sortSalesReturn +
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
            salesReturns = salesReturns.concat(res);
            pageNo++;
        }

        allSalesReturns = salesReturns;
        setAllSalesReturns(salesReturns);

        console.log("allSalesReturns:", allSalesReturns);
        prepareExcelData();
        fettingAllRecordsInProgress = false;
        setFettingAllRecordsInProgress(false);

    }


    //Search params
    const [searchParams, setSearchParams] = useState({});
    let [sortField, setSortField] = useState("created_at");
    let [sortSalesReturn, setSortSalesReturn] = useState("-");

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
            "select=zatca.compliance_check_last_failed_at,zatca.reporting_passed,zatca.compliance_passed,zatca.reporting_passed_at,zatca.compliane_check_passed_at,zatca.reporting_last_failed_at,zatca.reporting_failed_count,zatca.compliance_check_failed_count,id,code,date,net_total,created_by_name,customer_id,customer_name,status,created_at,net_profit,net_loss,cash_discount,discount,order_code,order_id,total_payment_paid,payments_count,payment_methods,payment_status,balance_amount,store_id";
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
            "/v1/sales-return?" +
            Select +
            queryParams +
            "&sort=" +
            sortSalesReturn +
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
                setSalesReturnList(data.result);

                let pageCount = parseInt((data.total_count + pageSize - 1) / pageSize);

                setTotalPages(pageCount);
                setTotalItems(data.total_count);
                setOffset((page - 1) * pageSize);
                setCurrentPageItemsCount(data.result.length);
                setTotalSalesReturn(data.meta.total_sales_return);
                setNetProfit(data.meta.net_profit);
                setLoss(data.meta.net_loss);
                setVatPrice(data.meta.vat_price);
                setTotalShippingHandlingFees(data.meta.shipping_handling_fees);
                setTotalDiscount(data.meta.discount);
                setTotalCashDiscount(data.meta.cash_discount);
                setTotalPaidSalesReturn(data.meta.paid_sales_return);
                setTotalUnPaidSalesReturn(data.meta.unpaid_sales_return);
                setTotalCashSalesReturn(data.meta.cash_sales_return);
                setTotalBankAccountSalesReturn(data.meta.bank_account_sales_return);

            })
            .catch((error) => {
                setIsListLoading(false);
                setIsRefreshInProcess(false);
                console.log(error);
            });
    }, [sortSalesReturn, sortField, page, pageSize, statsOpen, searchParams, props.order]);

    useEffect(() => {
        if (statsOpen) {
            list();  // Call list() whenever statsOpen changes to true
        }
    }, [statsOpen, list]);


    useEffect(() => {
        if (lastMessage) {
            const jsonMessage = JSON.parse(lastMessage.data);
            console.log("Received Message in User list:", jsonMessage);
            if (jsonMessage.event === "sales_return_updated") {
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
        sortSalesReturn = sortSalesReturn === "-" ? "" : "-";
        setSortSalesReturn(sortSalesReturn);
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



    //Sales Return Payments
    const SalesReturnPaymentCreateRef = useRef();


    const SalesReturnPaymentDetailsViewRef = useRef();
    function openSalesReturnPaymentDetailsView(id) {
        SalesReturnPaymentDetailsViewRef.current.open(id);
    }

    function openSalesReturnPaymentUpdateForm(id) {
        SalesReturnPaymentCreateRef.current.open(id);
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

    const [selectedSalesReturn, setSelectedSalesReturn] = useState({});
    let [showSalesReturnPaymentHistory, setShowSalesReturnPaymentHistory] = useState(false);

    function openPaymentsDialogue(salesReturn) {
        setSelectedSalesReturn(salesReturn);
        showSalesReturnPaymentHistory = true;
        setShowSalesReturnPaymentHistory(true);
    }

    function handlePaymentHistoryClose() {
        showSalesReturnPaymentHistory = false;
        setShowSalesReturnPaymentHistory(false);
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

    const SalesReturnPaymentListRef = useRef();


    const handleSummaryToggle = (isOpen) => {
        statsOpen = isOpen
        setStatsOpen(statsOpen);
    };

    const SalesRef = useRef();
    function openSales() {
        SalesRef.current.open(true);
    }

    const handleSelectedSale = (selected) => {
        openCreateForm(selected);
    };

    let [showOrderPreview, setShowOrderPreview] = useState(false);
    const printButtonRef = useRef();
    const printA4ButtonRef = useRef();

    const PreviewRef = useRef();
    const openPreview = useCallback((salesReturn) => {
        setShowOrderPreview(true);
        setShowPrintTypeSelection(false);


        if (timerRef.current) clearTimeout(timerRef.current);

        timerRef.current = setTimeout(() => {
            PreviewRef.current?.open(salesReturn, undefined, "sales_return");
        }, 100);

    }, []);


    function sendWhatsAppMessage(model) {
        showOrderPreview = true;
        setShowOrderPreview(showOrderPreview);

        if (timerRef.current) clearTimeout(timerRef.current);

        timerRef.current = setTimeout(() => {
            PreviewRef.current.open(model, "whatsapp", "whatsapp_sales_return");
        }, 100);
    }

    const customerSearchRef = useRef();
    const timerRef = useRef(null);


    let [showPrintTypeSelection, setShowPrintTypeSelection] = useState(false);

    /*
    function openPrintTypeSelection(model) {
        setSelectedSalesReturn({ ...model });
        if (store.settings.enable_invoice_print_type_selection) {
            showPrintTypeSelection = true;
            setShowPrintTypeSelection(true);
        } else {
            openPreview(model);
        }
    }*/

    const openPrintTypeSelection = useCallback((salesReturn) => {
        setSelectedSalesReturn(salesReturn);
        if (store.settings?.enable_invoice_print_type_selection) {
            // showPrintTypeSelection = true;
            setShowOrderPreview(true);
            setShowPrintTypeSelection(true);
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => {
                printButtonRef.current?.focus();
            }, 100);

        } else {
            openPreview(salesReturn);
        }
    }, [openPreview, store]);

    const PrintRef = useRef();
    const openPrint = useCallback((salesReturn) => {
        setShowPrintTypeSelection(false);
        PrintRef.current?.open(salesReturn, "sales_return");
    }, []);


    //Table settings

    const defaultColumns = useMemo(() => [
        { key: "actions", label: "Actions", fieldName: "actions", visible: true },
        { key: "select", label: "Select", fieldName: "select", visible: true },
        { key: "id", label: "ID", fieldName: "code", visible: true },
        { key: "date", label: "Date", fieldName: "date", visible: true },
        { key: "customer", label: "Customer", fieldName: "customer_name", visible: true },
        { key: "net_total", label: "Net Total", fieldName: "net_total", visible: true },
        { key: "total_payment_paid", label: "Amount Paid", fieldName: "total_payment_paid", visible: true },
        { key: "credit_balance", label: "Credit Balance", fieldName: "balance_amount", visible: true },
        { key: "reported_to_zatca", label: "Reported to Zatca", fieldName: "zatca.reporting_passed", visible: true },
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

    useEffect(() => {
        let saved = "";
        if (enableSelection === true) {
            saved = localStorage.getItem("select_sales_return_table_settings");
        } else {
            saved = localStorage.getItem("sales_return_table_settings");
        }

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
            if (enableSelection === true) {
                localStorage.setItem("select_sales_return_table_settings", JSON.stringify(defaultColumns));
            } else {
                localStorage.setItem("sales_return_table_settings", JSON.stringify(defaultColumns));
            }
            setColumns(defaultColumns);
        }

        //2nd

    }, [defaultColumns, enableSelection]);

    function RestoreDefaultSettings() {
        if (enableSelection === true) {
            localStorage.setItem("select_sales_return_table_settings", JSON.stringify(defaultColumns));
        } else {
            localStorage.setItem("sales_return_table_settings", JSON.stringify(defaultColumns));
        }
        setColumns(defaultColumns);

        setShowSuccess(true);
        setSuccessMessage("Successfully restored to default settings!")
    }

    // Save column settings to localStorage
    useEffect(() => {
        localStorage.setItem("sales_return_table_settings", JSON.stringify(columns));
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

    const CustomerUpdateFormRef = useRef();
    function openCustomerUpdateForm(id) {
        CustomerUpdateFormRef.current.open(id);
    }


    const handleSelected = (selected) => {
        props.onSelectSalesReturn(selected); // Send to parent
    };

    return (
        <>
            <CustomerCreate ref={CustomerUpdateFormRef} />
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
                        Sales Return Settings
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
                                                        {((col.key === "select" && enableSelection) || col.key !== "select") && <Draggable
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
                        }}
                    >
                        Restore to Default
                    </Button>
                </Modal.Footer>
            </Modal>


            <Modal show={showPrintTypeSelection} onHide={() => {
                showPrintTypeSelection = false;
                setShowPrintTypeSelection(showPrintTypeSelection);
            }} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Select Print Type</Modal.Title>
                </Modal.Header>
                <Modal.Body className="d-flex justify-content-around">
                    <Button variant="secondary" ref={printButtonRef} onClick={() => {
                        openPrint(selectedSalesReturn);
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
                        openPreview(selectedSalesReturn);
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
            <OrderPrint ref={PrintRef} />
            <ReportPreview ref={ReportPreviewRef} searchParams={searchParams} sortOrder={sortOrder} sortField={sortField} />
            {showOrderPreview && <OrderPreview ref={PreviewRef} />}
            <Sales ref={SalesRef} onSelectSale={handleSelectedSale} showToastMessage={props.showToastMessage} />
            <SalesReturnCreate ref={CreateFormRef} refreshList={list} refreshSalesList={props.refreshSalesList} showToastMessage={props.showToastMessage} />
            <SalesReturnView ref={DetailsViewRef} />

            <SalesReturnPaymentCreate ref={SalesReturnPaymentCreateRef} showToastMessage={props.showToastMessage} openDetailsView={openSalesReturnPaymentDetailsView} />
            <SalesReturnPaymentDetailsView ref={SalesReturnPaymentDetailsViewRef} openUpdateForm={openSalesReturnPaymentUpdateForm} showToastMessage={props.showToastMessage} />

            {/* Error Modal */}
            <Modal show={showErrors} onHide={() => setShowErrors(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Error</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Alert variant="danger">
                        ❌ Oops! Something went wrong. Please try again later.
                    </Alert>
                    {Object.keys(errors).length > 0 ?
                        <div>
                            <ul>

                                {errors && Object.keys(errors).map((key, index) => {
                                    console.log("Key", key);
                                    if (Array.isArray(errors[key])) {
                                        return (errors[key][0] ? <li style={{ color: "red" }}>{errors[key]}</li> : "");
                                    } else {
                                        return (errors[key] ? <li style={{ color: "red" }}>{errors[key]}</li> : "");
                                    }

                                })}
                            </ul></div> : ""}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowErrors(false)}>
                        Close
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



            <div className="container-fluid p-0">
                <div className="row">

                    <div className="col">
                        <span className="text-end">
                            <StatsSummary
                                title="Sales Return"
                                stats={{
                                    "Sales Return": totalSalesReturn,
                                    "Cash Sales Return": totalCashSalesReturn,
                                    "Credit Sales Return": totalUnPaidSalesReturn,
                                    "Bank Account Sales Return": totalBankAccountSalesReturn,
                                    "Cash Discount Return": totalCashDiscount,
                                    "VAT Return": vatPrice,
                                    "Net Profit Return %": netProfit && totalSalesReturn ? ((netProfit / totalSalesReturn) * 100) : "",
                                    "Paid Sales Return": totalPaidSalesReturn,
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
                        <h1 className="h3">Sales Returns</h1>
                    </div>

                    <div className="col text-end">
                        <Button variant="primary" onClick={() => {
                            openReportPreview();
                        }} style={{ marginRight: "8px" }} className="btn btn-primary mb-3">
                            <i className="bi bi-printer"></i>&nbsp;
                            Print Report
                        </Button>

                        <ExcelFile filename={salesReturnReportFileName} element={excelData.length > 0 ? <Button variant="success" className="btn btn-primary mb-3 success" >Download Sales Return Report</Button> : ""}>
                            <ExcelSheet dataSet={excelData} name={salesReturnReportFileName} />
                        </ExcelFile>

                        {excelData.length === 0 ? <Button variant="primary" className="btn btn-primary mb-3" onClick={getAllSalesReturns} >{fettingAllRecordsInProgress ? "Preparing.." : "Sales Return Report"}</Button> : ""}
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
                            onClick={openSales}
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
                                            <p className="text-start">No Sales Returns to display</p>
                                        </div>
                                    )}
                                </div>
                                <div className="row" style={{ bsalesreturn: "solid 0px" }}>
                                    <div className="col text-start" style={{ bsalesreturn: "solid 0px" }}>
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
                                                    animation="bsalesreturn"
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
                                                        bsalesreturn: "solid 1px",
                                                        bsalesreturnColor: "silver",
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
                                    <div className="col" style={{ bsalesreturn: "solid 0px" }}>

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
                                                        {col.key === "zatca.reporting_passed" && store.zatca?.phase === "2" && store.zatca?.connected && <th>
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
                                                        {col.key !== "actions" && col.key !== "select" && col.key !== "zatca.reporting_passed" && <th>
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
                                                        Sales Return ID
                                                        {sortField === "code" && sortSalesReturn === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "code" && sortSalesReturn === "" ? (
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
                                                        {sortField === "date" && sortSalesReturn === "-" ? (
                                                            <i className="bi bi-sort-down"></i>
                                                        ) : null}
                                                        {sortField === "date" && sortSalesReturn === "" ? (
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
                                                            sortSalesReturn === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "customer_name" && sortSalesReturn === "" ? (
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
                                                        {sortField === "net_total" && sortSalesReturn === "-" ? (
                                                            <i className="bi bi-sort-numeric-down"></i>
                                                        ) : null}
                                                        {sortField === "net_total" && sortSalesReturn === "" ? (
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
                                                            sort("order_code");
                                                        }}
                                                    >
                                                        Sales ID
                                                        {sortField === "order_code" && sortSalesReturn === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "order_code" && sortSalesReturn === "" ? (
                                                            <i className="bi bi-sort-alpha-up"></i>
                                                        ) : null}
                                                    </b>
                                                </th>

                                               
                                                {store.zatca?.phase === "2" && store.zatca?.connected ? <th>
                                                    <b
                                                        style={{
                                                            textDecoration: "underline",
                                                            cursor: "pointer",
                                                        }}
                                                        onClick={() => {
                                                            sort("zatca.reporting_passed");
                                                        }}
                                                    >
                                                        Reported to Zatca
                                                        {sortField === "zatca.reporting_passed" && sortOrder === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "zatca.reporting_passed" && sortOrder === "" ? (
                                                            <i className="bi bi-sort-alpha-up"></i>
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
                                                        {sortField === "net_profit" && sortSalesReturn === "-" ? (
                                                            <i className="bi bi-sort-numeric-down"></i>
                                                        ) : null}
                                                        {sortField === "net_profit" && sortSalesReturn === "" ? (
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
                                                        {sortField === "net_loss" && sortSalesReturn === "-" ? (
                                                            <i className="bi bi-sort-numeric-down"></i>
                                                        ) : null}
                                                        {sortField === "net_loss" && sortSalesReturn === "" ? (
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
                                                        {sortField === "created_by" && sortSalesReturn === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "created_by" && sortSalesReturn === "" ? (
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
                                                        {sortField === "created_at" && sortSalesReturn === "-" ? (
                                                            <i className="bi bi-sort-down"></i>
                                                        ) : null}
                                                        {sortField === "created_at" && sortSalesReturn === "" ? (
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
                                                        {col.key === "select" && enableSelection && <th></th>}
                                                        {col.key !== "actions" &&
                                                            col.key !== "select" &&
                                                            col.key !== "date" &&
                                                            col.key !== "zatca.reporting_passed" &&
                                                            col.key !== "payment_status" &&
                                                            col.key !== "payment_methods" &&
                                                            col.key !== "created_by" &&
                                                            col.key !== "created_at" &&
                                                            col.key !== "actions_end" &&
                                                            col.key !== "customer" &&
                                                            <th><input
                                                                type="text"
                                                                id={"sales_return_" + col.fieldName}
                                                                name={"sales_return_" + col.fieldName}
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
                                                        {col.key === "zatca.reporting_passed" && store.zatca?.phase === "2" && store.zatca?.connected && <th>
                                                            <select
                                                                onChange={(e) => {
                                                                    searchByFieldValue("zatca.reporting_passed", e.target.value);
                                                                }}
                                                            >
                                                                <option value="" SELECTED>Select</option>
                                                                <option value="reported">REPORTED</option>
                                                                <option value="compliance_failed">COMPLIANCE FAILED</option>
                                                                <option value="reporting_failed">REPORTING FAILED</option>
                                                                <option value="not_reported">NOT REPORTED</option>
                                                            </select>
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
                                                <th>
                                                    <input
                                                        type="text"
                                                        id="sales_return_code"
                                                        name="sales_return_code"
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
                                                        id="sales_return_net_total"
                                                        name="sales_return_net_total"
                                                        onChange={(e) =>
                                                            searchByFieldValue("net_total", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>

                                                <th>
                                                    <input
                                                        type="text"
                                                        id="sales_return_total_payment_paid"
                                                        name="sales_return_total_payment_paid"
                                                        onChange={(e) =>
                                                            searchByFieldValue("total_payment_paid", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        id="sales_return_balance_amount"
                                                        name="sales_return_balance_amount"
                                                        onChange={(e) =>
                                                            searchByFieldValue("balance_amount", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        id="sales_return_order_code"
                                                        name="sales_return_order_code"
                                                        onChange={(e) =>
                                                            searchByFieldValue("order_code", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>

                                               
                                                {store.zatca?.phase === "2" && store.zatca?.connected ? <th>
                                                    <select
                                                        onChange={(e) => {
                                                            searchByFieldValue("zatca.reporting_passed", e.target.value);
                                                        }}
                                                    >
                                                        <option value="" SELECTED>Select</option>
                                                        <option value="reported">REPORTED</option>
                                                        <option value="compliance_failed">COMPLIANCE FAILED</option>
                                                        <option value="reporting_failed">REPORTING FAILED</option>
                                                        <option value="not_reported">NOT REPORTED</option>
                                                    </select>
                                                </th> : ""}
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
                                                        id="sales_return_cash_discount"
                                                        name="sales_return_cash_discount"
                                                        onChange={(e) =>
                                                            searchByFieldValue("cash_discount", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        id="sales_return_net_profit"
                                                        name="sales_return_net_profit"
                                                        onChange={(e) =>
                                                            searchByFieldValue("net_profit", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        id="sales_return_net_loss"
                                                        name="sales_return_net_loss"
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
                                            {salesreturnList &&
                                                salesreturnList.map((salesReturn, index) => (
                                                    <tr key={index}>
                                                        {columns.filter(c => c.visible).map((col) => {
                                                            return (<>
                                                                {(col.key === "actions" || col.key === "actions_end") && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                    <Button className="btn btn-light btn-sm" onClick={() => {
                                                                        openUpdateForm(salesReturn.id);
                                                                    }}>
                                                                        <i className="bi bi-pencil"></i>
                                                                    </Button>&nbsp;
                                                                    <Button className="btn btn-primary btn-sm" onClick={() => {
                                                                        openDetailsView(salesReturn.id);
                                                                    }}>
                                                                        <i className="bi bi-eye"></i>
                                                                    </Button>&nbsp;
                                                                    <Button className="btn btn-primary btn-sm" onClick={() => {
                                                                        openPrintTypeSelection(salesReturn);
                                                                    }}>
                                                                        <i className="bi bi-printer"></i>
                                                                    </Button>
                                                                    &nbsp;
                                                                    <Button className={`btn btn-success btn-sm`} style={{}} onClick={() => {
                                                                        sendWhatsAppMessage(salesReturn);
                                                                    }}>
                                                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="white" viewBox="0 0 16 16">
                                                                            <path d="M13.601 2.326A7.875 7.875 0 0 0 8.036 0C3.596 0 0 3.597 0 8.036c0 1.417.37 2.805 1.07 4.03L0 16l3.993-1.05a7.968 7.968 0 0 0 4.043 1.085h.003c4.44 0 8.036-3.596 8.036-8.036 0-2.147-.836-4.166-2.37-5.673ZM8.036 14.6a6.584 6.584 0 0 1-3.35-.92l-.24-.142-2.37.622.63-2.31-.155-.238a6.587 6.587 0 0 1-1.018-3.513c0-3.637 2.96-6.6 6.6-6.6 1.764 0 3.42.69 4.67 1.94a6.56 6.56 0 0 1 1.93 4.668c0 3.637-2.96 6.6-6.6 6.6Zm3.61-4.885c-.198-.1-1.17-.578-1.352-.644-.18-.066-.312-.1-.444.1-.13.197-.51.644-.626.775-.115.13-.23.15-.428.05-.198-.1-.837-.308-1.594-.983-.59-.525-.99-1.174-1.11-1.372-.116-.198-.012-.305.088-.403.09-.09.198-.23.298-.345.1-.115.132-.197.2-.33.065-.13.032-.247-.017-.345-.05-.1-.444-1.07-.61-1.46-.16-.384-.323-.332-.444-.338l-.378-.007c-.13 0-.344.048-.525.23s-.688.672-.688 1.64c0 .967.704 1.9.802 2.03.1.13 1.386 2.116 3.365 2.963.47.203.837.324 1.122.414.472.15.902.13 1.24.08.378-.057 1.17-.48 1.336-.942.165-.462.165-.858.116-.943-.048-.084-.18-.132-.378-.23Z" />
                                                                        </svg>
                                                                    </Button>
                                                                </td>
                                                                }
                                                                {(col.key === "select" && enableSelection) && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                    <Button className="btn btn-success btn-sm" onClick={() => {
                                                                        handleSelected(salesReturn);
                                                                    }}>
                                                                        Select
                                                                    </Button>
                                                                </td>}
                                                                {(col.fieldName === "code") && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                    {salesReturn.code}
                                                                </td>}
                                                                {(col.fieldName === "date" || col.fieldName === "created_at") && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                    {format(new Date(salesReturn[col.key]), "MMM dd yyyy h:mma")}
                                                                </td>}
                                                                {(col.fieldName === "customer_name") && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                    {salesReturn.customer_name && <span style={{ cursor: "pointer", color: "blue" }} onClick={() => {
                                                                        openCustomerUpdateForm(salesReturn.customer_id);
                                                                    }}><OverflowTooltip value={salesReturn.customer_name} />
                                                                    </span>}
                                                                </td>}
                                                                {(col.fieldName === "net_total") && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                    <Amount amount={trimTo2Decimals(salesReturn.net_total)} />
                                                                </td>}
                                                                {(col.fieldName === "total_payment_paid") && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                    <Button variant="link" onClick={() => {
                                                                        openPaymentsDialogue(salesReturn);
                                                                    }}>
                                                                        <Amount amount={trimTo2Decimals(salesReturn.total_payment_paid)} />
                                                                    </Button>
                                                                </td>}
                                                                {(col.fieldName === "balance_amount") && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                    <Amount amount={trimTo2Decimals(salesReturn.balance_amount)} />
                                                                </td>}
                                                                {(col.fieldName === "zatca.reporting_passed" && store.zatca?.phase === "2" && store.zatca?.connected) && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                    {!salesReturn.zatca?.compliance_passed && !salesReturn.zatca?.reporting_passed && salesReturn.zatca?.compliance_check_failed_count > 0 ? <span className="badge bg-danger">
                                                                        Compliance check failed
                                                                        {!salesReturn.zatca.compliance_passed && salesReturn.zatca.compliance_check_last_failed_at ? <span>&nbsp;<TimeAgo date={salesReturn.zatca.compliance_check_last_failed_at} />&nbsp;</span> : ""}
                                                                        &nbsp;</span> : ""}
                                                                    {!salesReturn.zatca?.reporting_passed && salesReturn.zatca?.reporting_failed_count > 0 ? <span> <span className="badge bg-danger">
                                                                        Reporting failed
                                                                        {!salesReturn.zatca.reporting_passed && salesReturn.zatca.reporting_last_failed_at ? <span><TimeAgo date={salesReturn.zatca.reporting_last_failed_at} />&nbsp;</span> : ""}
                                                                    </span> &nbsp;</span> : ""}
                                                                    {salesReturn.zatca?.reporting_passed ? <span>&nbsp;<span className="badge bg-success">
                                                                        Reported
                                                                        {salesReturn.zatca.reporting_passed && salesReturn.zatca.reporting_passed_at ? <span>&nbsp;<TimeAgo date={salesReturn.zatca.reporting_passed_at} />&nbsp;</span> : ""}
                                                                        &nbsp;</span></span> : ""}

                                                                    {!salesReturn.zatca?.reporting_passed && !salesReturn.zatca?.compliance_passed && !salesReturn.zatca?.reporting_failed_count && !salesReturn.zatca?.compliance_check_failed_count ? <span className="badge bg-warning">
                                                                        Not Reported
                                                                        &nbsp;</span> : ""}
                                                                    {!salesReturn.zatca.reporting_passed ? <span> &nbsp; <Button disabled={reportingInProgress} style={{ marginTop: "3px" }} className="btn btn btn-sm" onClick={() => {
                                                                        ReportInvoiceToZatca(salesReturn.id, index);
                                                                    }}>
                                                                        {!salesReturn.zatca?.reportingInProgress && (salesReturn.zatca?.reporting_failed_count > 0 || salesReturn.zatca?.compliance_check_failed_count > 0) ? <i class="bi bi-bootstrap-reboot"></i> : ""}
                                                                        {!salesReturn.zatca?.reportingInProgress && (!salesReturn.zatca?.reporting_failed_count > 0 && !salesReturn.zatca?.compliance_check_failed_count) ? <span class="bi-arrow-right-circle">&nbsp;Report</span> : ""}
                                                                        {salesReturn.zatca?.reportingInProgress ? <Spinner
                                                                            as="span"
                                                                            animation="border"
                                                                            size="sm"
                                                                            role="status"
                                                                            aria-hidden={true}
                                                                        /> : ""}
                                                                    </Button></span> : ""}
                                                                    {salesReturn.zatca?.reporting_passed ? <span>&nbsp;
                                                                        <Button onClick={() => {
                                                                            window.open("/zatca/returns/xml/" + salesReturn.code + ".xml", "_blank");
                                                                        }}><i class="bi bi-filetype-xml"></i> XML
                                                                        </Button>
                                                                    </span> : ""}
                                                                </td>}
                                                                {(col.fieldName === "payment_status") && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                    {salesReturn.payment_status === "paid" ?
                                                                        <span className="badge bg-success">
                                                                            Paid
                                                                        </span> : ""}
                                                                    {salesReturn.payment_status === "paid_partially" ?
                                                                        <span className="badge bg-warning">
                                                                            Paid Partially
                                                                        </span> : ""}
                                                                    {salesReturn.payment_status === "not_paid" ?
                                                                        <span className="badge bg-danger">
                                                                            Not Paid
                                                                        </span> : ""}
                                                                </td>}
                                                                {(col.fieldName === "payment_methods") && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                    {salesReturn.payment_methods &&
                                                                        salesReturn.payment_methods.map((name) => (
                                                                            <span className="badge bg-info">{name}</span>
                                                                        ))}
                                                                </td>}
                                                                {(col.fieldName === "cash_discount") && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                    <Amount amount={trimTo2Decimals(salesReturn.cash_discount)} />
                                                                </td>}
                                                                {(col.fieldName === "discount") && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                    {trimTo2Decimals(salesReturn.discount)}
                                                                </td>}
                                                                {(col.fieldName === "net_profit") && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                    <Amount amount={trimTo2Decimals(salesReturn.net_profit)} />
                                                                </td>}
                                                                {(col.fieldName === "net_loss") && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                    <Amount amount={trimTo2Decimals(salesReturn.net_loss)} />
                                                                </td>}
                                                                {(col.fieldName === "created_by") && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                    {salesReturn.created_by_name}
                                                                </td>}
                                                            </>)
                                                        })}
                                                        {/* <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            <Button className="btn btn-light btn-sm" onClick={() => {
                                                                openUpdateForm(salesreturn.id, salesreturn.order_id);
                                                            }}>
                                                                <i className="bi bi-pencil"></i>
                                                            </Button>


                                                            <Button className="btn btn-primary btn-sm" onClick={() => {
                                                                openDetailsView(salesreturn.id);
                                                            }}>
                                                                <i className="bi bi-eye"></i>
                                                            </Button>
                                                            &nbsp;

                                                            <Button className="btn btn-primary btn-sm" onClick={() => {
                                                                // openPreview(salesreturn);
                                                                openPrintTypeSelection(salesreturn);
                                                            }}>
                                                                <i className="bi bi-printer"></i>
                                                            </Button>
                                                            &nbsp;
                                                            <Button className={`btn btn-success btn-sm`} style={{}} onClick={() => {
                                                                sendWhatsAppMessage(salesreturn);
                                                            }}>
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="white" viewBox="0 0 16 16">
                                                                    <path d="M13.601 2.326A7.875 7.875 0 0 0 8.036 0C3.596 0 0 3.597 0 8.036c0 1.417.37 2.805 1.07 4.03L0 16l3.993-1.05a7.968 7.968 0 0 0 4.043 1.085h.003c4.44 0 8.036-3.596 8.036-8.036 0-2.147-.836-4.166-2.37-5.673ZM8.036 14.6a6.584 6.584 0 0 1-3.35-.92l-.24-.142-2.37.622.63-2.31-.155-.238a6.587 6.587 0 0 1-1.018-3.513c0-3.637 2.96-6.6 6.6-6.6 1.764 0 3.42.69 4.67 1.94a6.56 6.56 0 0 1 1.93 4.668c0 3.637-2.96 6.6-6.6 6.6Zm3.61-4.885c-.198-.1-1.17-.578-1.352-.644-.18-.066-.312-.1-.444.1-.13.197-.51.644-.626.775-.115.13-.23.15-.428.05-.198-.1-.837-.308-1.594-.983-.59-.525-.99-1.174-1.11-1.372-.116-.198-.012-.305.088-.403.09-.09.198-.23.298-.345.1-.115.132-.197.2-.33.065-.13.032-.247-.017-.345-.05-.1-.444-1.07-.61-1.46-.16-.384-.323-.332-.444-.338l-.378-.007c-.13 0-.344.048-.525.23s-.688.672-.688 1.64c0 .967.704 1.9.802 2.03.1.13 1.386 2.116 3.365 2.963.47.203.837.324 1.122.414.472.15.902.13 1.24.08.378-.057 1.17-.48 1.336-.942.165-.462.165-.858.116-.943-.048-.084-.18-.132-.378-.23Z" />
                                                                </svg>
                                                            </Button>
                                                            &nbsp;
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >{salesreturn.code}</td>

                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {format(
                                                                new Date(salesreturn.date),
                                                                "MMM dd yyyy h:mma"
                                                            )}
                                                        </td>
                                                        <td className="text-start" style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            <OverflowTooltip value={salesreturn.customer_name} />
                                                        </td>
                                                        <td> <Amount amount={salesreturn.net_total} /> </td>
                                                        <td>

                                                            <Button variant="link" onClick={() => {
                                                                openPaymentsDialogue(salesreturn);
                                                            }}>
                                                                <Amount amount={trimTo2Decimals(salesreturn.total_payment_paid)} />
                                                            </Button>

                                                        </td>
                                                        <td> <Amount amount={trimTo2Decimals(salesreturn.balance_amount)} /></td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >{salesreturn.order_code}</td>

                                                        {store.zatca?.phase === "2" && store.zatca?.connected ? <td style={{ width: "auto", whiteSpace: "nowrap" }}>

                                                            {!salesreturn.zatca?.compliance_passed && salesreturn.zatca?.compliance_check_failed_count > 0 ? <span className="badge bg-danger">
                                                                Compliance check failed
                                                                {!salesreturn.zatca.compliance_passed && salesreturn.zatca.compliance_check_last_failed_at ? <span>&nbsp;<TimeAgo date={salesreturn.zatca.compliance_check_last_failed_at} />&nbsp;</span> : ""}
                                                                &nbsp;</span> : ""}

                                                            {!salesreturn.zatca?.reporting_passed && salesreturn.zatca?.reporting_failed_count > 0 ? <span> <span className="badge bg-danger">
                                                                Reporting failed
                                                                {!salesreturn.zatca.reporting_passed && salesreturn.zatca.reporting_last_failed_at ? <span><TimeAgo date={salesreturn.zatca.reporting_last_failed_at} />&nbsp;</span> : ""}
                                                            </span> &nbsp;</span> : ""}

                                                            {salesreturn.zatca?.reporting_passed ? <span>&nbsp;<span className="badge bg-success">
                                                                Reported
                                                                {salesreturn.zatca.reporting_passed && salesreturn.zatca.reporting_passed_at ? <span>&nbsp;<TimeAgo date={salesreturn.zatca.reporting_passed_at} />&nbsp;</span> : ""}
                                                                &nbsp;</span></span> : ""}

                                                            {!salesreturn.zatca?.reporting_passed && !salesreturn.zatca?.compliance_passed && !salesreturn.zatca?.reporting_failed_count && !salesreturn.zatca?.compliance_check_failed_count ? <span className="badge bg-warning">
                                                                Not Reported
                                                                &nbsp;</span> : ""}

                                                            {!salesreturn.zatca.reporting_passed ? <span> &nbsp; <Button disabled={reportingInProgress} style={{ marginTop: "3px" }} className="btn btn btn-sm" onClick={() => {
                                                                ReportInvoiceToZatca(salesreturn.id, index);
                                                            }}>

                                                                {!salesreturn.zatca?.reportingInProgress && (salesreturn.zatca?.reporting_failed_count > 0 || salesreturn.zatca?.compliance_check_failed_count > 0) ? <i class="bi bi-bootstrap-reboot"></i> : ""}
                                                                {!salesreturn.zatca?.reportingInProgress && (!salesreturn.zatca?.reporting_failed_count > 0 && !salesreturn.zatca?.compliance_check_failed_count) ? <span class="bi-arrow-right-circle">&nbsp;Report</span> : ""}
                                                                {salesreturn.zatca?.reportingInProgress ? <Spinner
                                                                    as="span"
                                                                    animation="border"
                                                                    size="sm"
                                                                    role="status"
                                                                    aria-hidden={true}
                                                                /> : ""}
                                                            </Button></span> : ""}
                                                            {salesreturn.zatca?.reporting_passed ? <span>&nbsp;

                                                                <Button onClick={() => {
                                                                    window.open("/zatca/returns/xml/" + salesreturn.code + ".xml", "_blank");
                                                                }}><i class="bi bi-filetype-xml"></i> XML
                                                                </Button>
                                                            </span> : ""}
                                                        </td> : ""}
                                                      
                                                        <td>
                                                            {salesreturn.payment_status === "paid" ?
                                                                <span className="badge bg-success">
                                                                    Paid
                                                                </span> : ""}
                                                            {salesreturn.payment_status === "paid_partially" ?
                                                                <span className="badge bg-warning">
                                                                    Paid Partially
                                                                </span> : ""}
                                                            {salesreturn.payment_status === "not_paid" ?
                                                                <span className="badge bg-danger">
                                                                    Not Paid
                                                                </span> : ""}
                                                        </td>
                                                        <td>

                                                            {salesreturn.payment_methods &&
                                                                salesreturn.payment_methods.map((name) => (
                                                                    <span className="badge bg-info">{name}</span>
                                                                ))}

                                                        </td>
                                                        <td>{trimTo2Decimals(salesreturn.cash_discount)}</td>
                                                        <td> <Amount amount={trimTo2Decimals(salesreturn.net_profit)} /> </td>
                                                        <td> <Amount amount={trimTo2Decimals(salesreturn.net_loss)} />  </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >{salesreturn.created_by_name}</td>

                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {format(
                                                                new Date(salesreturn.created_at),
                                                                "MMM dd yyyy h:mma"
                                                            )}
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            <Button className="btn btn-light btn-sm" onClick={() => {
                                                                openUpdateForm(salesreturn.id);
                                                            }}>
                                                                <i className="bi bi-pencil"></i>
                                                            </Button>


                                                            <Button className="btn btn-primary btn-sm" onClick={() => {
                                                                openDetailsView(salesreturn.id);
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

            <Modal show={showSalesReturnPaymentHistory} size="lg" onHide={handlePaymentHistoryClose} animation={false} scrollable={true}>
                <Modal.Header>
                    <Modal.Title>Payment history of Sales Return #{selectedSalesReturn.code}</Modal.Title>

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
                    <SalesReturnPaymentIndex ref={SalesReturnPaymentListRef} showToastMessage={props.showToastMessage} salesReturn={selectedSalesReturn} refreshSalesReturnList={list} />
                </Modal.Body>
            </Modal>
        </>
    );
}

export default SalesReturnIndex;
