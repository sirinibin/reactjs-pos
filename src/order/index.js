import React, { useState, useEffect, useRef, forwardRef, useContext, useCallback, useMemo } from "react";
import OrderCreate from "./create.js";
import OrderView from "./view.js";

import SalesPaymentIndex from "./../sales_payment/index.js";
import SalesReturnIndex from "./../sales_return/index.js";
import SalesReturnCreate from "./../sales_return/create.js";


import Cookies from "universal-cookie";
import { Typeahead } from "react-bootstrap-typeahead";
import { format } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Button, Spinner, Modal, Alert } from "react-bootstrap";
import ReactPaginate from "react-paginate";
import { formatDistanceToNowStrict } from "date-fns";
import { enUS } from "date-fns/locale";
import OverflowTooltip from "../utils/OverflowTooltip.js";
import { trimTo2Decimals } from "../utils/numberUtils";
import Amount from "../utils/amount.js";
import StatsSummary from "../utils/StatsSummary.js";
import { WebSocketContext } from "./../utils/WebSocketContext.js";
import eventEmitter from "./../utils/eventEmitter";

import "./../utils/stickyHeader.css";


import ReactExport from 'react-data-export';
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


const OrderIndex = forwardRef((props, ref) => {
    const { lastMessage } = useContext(WebSocketContext);

    const cookies = useMemo(() => new Cookies(), []);


    let [allOrders, setAllOrders] = useState([]);
    let [excelData, setExcelData] = useState([]);
    let [salesReportFileName, setSalesReportFileName] = useState("Sales Report");
    let [fettingAllRecordsInProgress, setFettingAllRecordsInProgress] = useState(false);





    function prepareExcelData() {
        console.log("Inside prepareExcelData()");
        var groupedByDate = [];
        for (var i = 0; i < allOrders.length; i++) {
            let date = format(
                new Date(allOrders[i].date),
                "dd-MMM-yyyy"
            );
            if (!groupedByDate[date]) {
                groupedByDate[date] = [];
            }

            groupedByDate[date].push(allOrders[i]);

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
            filename: salesReportFileName,
        }];

        let totalAmountBeforeVAT = 0;
        let totalAmountAfterVAT = 0;
        let totalVAT = 0;

        let invoiceCount = 0;
        for (let orderDate in groupedByDate) {

            //  console.log("orderDate:", orderDate);
            excelData[0].data.push([{ value: "Inv Date: " + orderDate }]);
            let dayTotalBeforeVAT = 0.00;
            let dayTotalAfterVAT = 0.00;
            let dayVAT = 0.00;

            for (var i2 = 0; i2 < groupedByDate[orderDate].length; i2++) {
                invoiceCount++;
                let order = groupedByDate[orderDate][i2];
                excelData[0].data.push([{ value: "Inv No (" + order.code + ") - " + invoiceCount }]);
                excelData[0].data.push([{ value: "Customer: " + order.customer_name }]);
                if (order.customer && order.customer.vat_no) {
                    excelData[0].data.push([{ value: "Customer VAT NO.: " + order.customer.vat_no }]);
                } else {
                    excelData[0].data.push([{ value: "Customer VAT NO.: N/A" }]);
                }

                if (!order.products) {
                    continue;
                }

                let totalAmountAfterDiscount = order.total + order.shipping_handling_fees - order.discount;
                let totalAmountBeforeVat = order.total - order.discount + order.shipping_handling_fees;
                let totalAmountAfterVat = totalAmountBeforeVat + order.vat_price;


                for (var j = 0; j < order.products.length; j++) {
                    let product = order.products[j];
                    let unitDiscount = 0.00;
                    if (product.unit_discount) {
                        unitDiscount = product.unit_discount;
                    }



                    let gross_amount = product.unit_price * product.quantity;
                    let vat_percent = order.vat_percent ? order.vat_percent : 15.00;
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
                            value: product.unit_price ? product.unit_price : 0.00,
                        },
                        {
                            value: trimTo2Decimals(gross_amount),
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
                } //end for

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
                        value: trimTo2Decimals(order.shipping_handling_fees),
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
                        value: trimTo2Decimals(order.discount),
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
                        value: trimTo2Decimals(order.vat_price),
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


                dayVAT += order.vat_price;
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


        }//end for1

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

    function makeSalesReportFilename() {
        salesReportFileName = "Sales Report";
        if (searchParams["created_at_from"] && searchParams["created_at_to"]) {
            salesReportFileName += " - From " + searchParams["created_at_from"] + " to " + searchParams["created_at_to"];
        } else if (searchParams["created_at_from"]) {
            salesReportFileName += " - From " + searchParams["created_at_from"] + " to " + format(
                new Date(),
                "dd-MMM-yyyy"
            );
        } else if (searchParams["created_at_to"]) {
            salesReportFileName += " - Upto " + searchParams["created_at_to"];
        } else if (searchParams["created_at"]) {
            salesReportFileName += " of " + searchParams["created_at"];
        }

        setSalesReportFileName(salesReportFileName);
    }
    async function getAllOrders() {
        const requestOptions = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: cookies.get("access_token"),
            },
        };
        let Select =
            "select=id,code,date,total,net_total,shipping_handling_fees,discount_percent,discount,products,customer_name,created_at,vat_price,vat_percent,customer_id,customer.id,customer.vat_no";

        if (cookies.get("store_id")) {
            searchParams.store_id = cookies.get("store_id");
        }

        const d = new Date();
        let diff = d.getTimezoneOffset();
        console.log("Timezone:", parseFloat(diff / 60));
        searchParams["timezone_offset"] = parseFloat(diff / 60);

        if (statsOpen) {
            searchParams["stats"] = "1";
        }


        setSearchParams(searchParams);
        let queryParams = ObjectToSearchQueryParams(searchParams);
        if (queryParams !== "") {
            queryParams = "&" + queryParams;
        }

        let size = 500;

        let orders = [];
        var pageNo = 1;

        makeSalesReportFilename();

        for (; true;) {

            fettingAllRecordsInProgress = true;
            setFettingAllRecordsInProgress(true);
            let res = await fetch(
                "/v1/order?" +
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
            orders = orders.concat(res);
            pageNo++;
        }

        allOrders = orders;
        setAllOrders(orders);

        console.log("allOrders:", allOrders);
        prepareExcelData();
        fettingAllRecordsInProgress = false;
        setFettingAllRecordsInProgress(false);

    }




    //list
    const [orderList, setOrderList] = useState([]);

    //pagination
    const [pageSize, setPageSize] = useState(20);
    let [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalItems, setTotalItems] = useState(1);
    let [currentPageItemsCount, setCurrentPageItemsCount] = useState(0);
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

    //Customer Auto Suggestion
    const [customerOptions, setCustomerOptions] = useState([]);
    const [selectedCustomers, setSelectedCustomers] = useState([]);

    //Created By User Auto Suggestion
    const [userOptions, setUserOptions] = useState([]);
    const [selectedCreatedByUsers, setSelectedCreatedByUsers] = useState([]);


    //Payment Status Auto Suggestion
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
    const [selectedPaymentStatusList, setSelectedPaymentStatusList] = useState([]);

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


    useEffect(() => {
        list();
        if (cookies.get("store_id")) {
            getStore(cookies.get("store_id"));
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    //Search params
    const [searchParams, setSearchParams] = useState({});
    let [sortField, setSortField] = useState("created_at");
    let [sortOrder, setSortOrder] = useState("-");


    const [totalSales, setTotalSales] = useState(0.00);
    const [netProfit, setNetProfit] = useState(0.00);
    const [vatPrice, setVatPrice] = useState(0.00);
    const [totalShippingHandlingFees, setTotalShippingHandlingFees] = useState(0.00);
    const [totalDiscount, setTotalDiscount] = useState(0.00);
    const [totalCashDiscount, setTotalCashDiscount] = useState(0.00);
    const [totalPaidSales, setTotalPaidSales] = useState(0.00);
    const [totalUnPaidSales, setTotalUnPaidSales] = useState(0.00);
    const [totalCashSales, setTotalCashSales] = useState(0.00);
    const [totalBankAccountSales, setTotalBankAccountSales] = useState(0.00);
    const [loss, setLoss] = useState(0.00);

    let [store, setStore] = useState({});

    function getStore(id) {
        console.log("inside get Store");
        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': cookies.get('access_token'),
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

            });
    }

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

        if (cookies.get("store_id")) {
            params.store_id = cookies.get("store_id");
        }


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

        let Select = "select=id,code,vat_no,name,phone,name_in_arabic,phone_in_arabic,search_label";
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
            searchParams[field] = "";
            page = 1;
            setPage(page);
            list();
            return;
        }

        if (value) {
            let d = new Date(value);
            value = format(d, "MMM dd yyyy");
            console.log("value2:", value);
            console.log(Intl.DateTimeFormat().resolvedOptions().timeZone)
        } else {
            value = "";
        }


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
            console.log("searchParams[field]:", searchParams[field]);
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

    function searchByMultipleValuesField(field, values) {
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

        list();
    }


    const [statsOpen, setStatsOpen] = useState(false);

    const list = useCallback(() => {
        setExcelData([]);

        const requestOptions = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: cookies.get("access_token"),
            },
        };
        let Select =
            "select=zatca.compliance_check_last_failed_at,zatca.reporting_passed,zatca.compliance_passed,zatca.reporting_passed_at,zatca.compliane_check_passed_at,zatca.reporting_last_failed_at,zatca.reporting_failed_count,zatca.compliance_check_failed_count,id,code,date,net_total,return_count,cash_discount,total_payment_received,payments_count,payment_methods,balance_amount,discount_percent,discount,created_by_name,customer_name,status,payment_status,payment_method,created_at,loss,net_loss,net_profit,store_id,total";

        if (cookies.get("store_id")) {
            searchParams.store_id = cookies.get("store_id");
        }

        const d = new Date();
        let diff = d.getTimezoneOffset();
        console.log("Timezone:", parseFloat(diff / 60));
        searchParams["timezone_offset"] = parseFloat(diff / 60);

        console.log("statsOpen:", statsOpen);
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
            "/v1/order?" +
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
                setOrderList(data.result);

                let pageCount = parseInt((data.total_count + pageSize - 1) / pageSize);

                setTotalPages(pageCount);
                setTotalItems(data.total_count);
                setOffset((page - 1) * pageSize);
                setCurrentPageItemsCount(data.result.length);
                setTotalSales(data.meta.total_sales);
                setNetProfit(data.meta.net_profit);
                setLoss(data.meta.net_loss);
                setVatPrice(data.meta.vat_price);
                setTotalShippingHandlingFees(data.meta.shipping_handling_fees);
                setTotalDiscount(data.meta.discount);
                setTotalCashDiscount(data.meta.cash_discount);
                setTotalPaidSales(data.meta.paid_sales);
                setTotalUnPaidSales(data.meta.unpaid_sales);
                setTotalCashSales(data.meta.cash_sales);
                setTotalBankAccountSales(data.meta.bank_account_sales);

            })
            .catch((error) => {
                setIsListLoading(false);
                setIsRefreshInProcess(false);
                console.log(error);
            });
    }, [sortOrder, sortField, page, pageSize, statsOpen, cookies, searchParams]);


    const handleSummaryToggle = (isOpen) => {
        setStatsOpen(isOpen);
    };

    useEffect(() => {
        if (statsOpen) {
            list();  // Call list() whenever statsOpen changes to true
        }
    }, [statsOpen, list]);


    useEffect(() => {
        if (lastMessage) {
            const jsonMessage = JSON.parse(lastMessage.data);
            // console.log("Received Message in User list:", jsonMessage);
            if (jsonMessage.event === "sales_updated") {
                // console.log("Refreshing user list")
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

    let [showOrderPaymentHistory, setShowOrderPaymentHistory] = useState(false);

    const [selectedOrder, setSelectedOrder] = useState({});

    function openOrderPaymentsDialogue(order) {
        setSelectedOrder(order);
        showOrderPaymentHistory = true;
        setShowOrderPaymentHistory(true);
    }



    function handleOrderPaymentHistoryClose() {
        showOrderPaymentHistory = false;
        setShowOrderPaymentHistory(false);
        //list();
    }

    let [showOrderReturns, setShowOrderReturns] = useState(false);
    function openOrderReturnsDialogue(order) {
        setSelectedOrder(order);
        showOrderReturns = true;
        setShowOrderReturns(true);
    }

    function handleOrderReturnsClose() {
        showOrderReturns = false;
        setShowOrderReturns(false);
    }


    const DetailsViewRef = useRef();
    function openDetailsView(id) {
        DetailsViewRef.current.open(id);
    }



    const CreateFormRef = useRef();
    function openCreateForm() {
        CreateFormRef.current.open();
    }

    function openUpdateForm(id) {
        CreateFormRef.current.open(id);
    }




    const SalesReturnListRef = useRef();

    //Sales Payments

    const SalesPaymentListRef = useRef();



    //Sales Return
    const SalesReturnCreateRef = useRef();
    function openSalesReturnCreateForm(id) {
        SalesReturnCreateRef.current.open(undefined, id);
    }

    let [reportingInProgress, setReportingInProgress] = useState(false);


    let [errors, setErrors] = useState({});
    function ReportInvoiceToZatca(id, index) {
        // event.preventDefault();
        if (reportingInProgress === true) {
            return;
        }

        let searchParams = {};
        if (cookies.get("store_id")) {
            searchParams.store_id = cookies.get("store_id");
        }
        let queryParams = ObjectToSearchQueryParams(searchParams);

        let endPoint = "/v1/order/zatca/report/" + id + "?" + queryParams;
        let method = "POST";
        const requestOptions = {
            method: method,
            headers: {
                'Accept': 'application/json',
                "Content-Type": "application/json",
                Authorization: cookies.get("access_token"),
            },
        };

        reportingInProgress = true;
        setReportingInProgress(true);
        orderList[index].zatca.reportingInProgress = true;
        setOrderList([...orderList]);

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

                orderList[index].zatca.reportingInProgress = false;
                setOrderList([...orderList]);

                console.log("Response:");
                console.log(data);
                props.showToastMessage("Invoice reported successfully to Zatca!", "success");
                setShowSuccess(true);
                setSuccessMessage("Successfully Reported to Zatca!")
                list();
            })
            .catch((error) => {
                reportingInProgress = false;
                setReportingInProgress(false);
                orderList[index].zatca.reportingInProgress = false;
                setOrderList([...orderList]);
                setShowErrors(true);
                console.log("Inside catch");
                console.log(error);
                setErrors({ ...error });
                // setErrors({ ...error });
                console.error("There was an error!", error);
                props.showToastMessage("Invoice reporting to Zatca failed!", "danger");
                list();
            });
    }

    const [showErrors, setShowErrors] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState(false);





    return (
        <>
            <OrderCreate ref={CreateFormRef} refreshList={list} showToastMessage={props.showToastMessage} openCreateForm={openCreateForm} />
            <OrderView ref={DetailsViewRef} openCreateForm={openCreateForm} />
            <SalesReturnCreate ref={SalesReturnCreateRef} showToastMessage={props.showToastMessage} refreshSalesList={list} />

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
                                title="Sales"
                                stats={{
                                    "Sales": totalSales,
                                    "Paid Sales": totalPaidSales,
                                    "Cash Sales": totalCashSales,
                                    "Bank Account Sales": totalBankAccountSales,
                                    "Credit Sales": totalUnPaidSales,
                                    "Sales Discount": totalDiscount,
                                    "Cash Discount": totalCashDiscount,
                                    "Shipping/Handling fees": totalShippingHandlingFees,
                                    "VAT Collected": vatPrice,
                                    "Net Profit": netProfit,
                                    "Net Profit %": netProfit && totalSales ? ((netProfit / totalSales) * 100) : "",
                                    "Net Loss": loss,
                                }}
                                onToggle={handleSummaryToggle}
                            />
                        </span>
                    </div>

                </div>
                <div className="row">
                    <div className="col">
                        <h1 className="h3">Sales Orders</h1>
                    </div>


                    <div className="col text-end">

                        <ExcelFile filename={salesReportFileName} element={excelData.length > 0 ? <Button variant="success" className="btn btn-primary mb-3 success" >Download Sales Report</Button> : ""}>
                            <ExcelSheet dataSet={excelData} name={salesReportFileName} />
                        </ExcelFile>

                        {excelData.length === 0 ? <Button variant="primary" className="btn btn-primary mb-3" onClick={getAllOrders} >{fettingAllRecordsInProgress ? "Preparing.." : "Sales Report"}</Button> : ""}
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
                                            <p className="text-start">No Orders to display</p>
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
                                                    <option value="500">500</option>
                                                    <option value="1000">1000</option>
                                                </select>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <br />
                                <div className="row">
                                    <div className="col" style={{ border: "solid 0px", width: "100%" }}>
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
                                    <table className="table table-striped table-bordered table-sm" style={{}}>
                                        <thead>
                                            <tr className="text-center main-header">
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
                                                            sort("total_payment_received");
                                                        }}
                                                    >
                                                        Amount Paid
                                                        {sortField === "total_payment_received" && sortOrder === "-" ? (
                                                            <i className="bi bi-sort-numeric-down"></i>
                                                        ) : null}
                                                        {sortField === "total_payment_received" && sortOrder === "" ? (
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
                                                            sortOrder === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "customer_name" && sortOrder === "" ? (
                                                            <i className="bi bi-sort-alpha-up"></i>
                                                        ) : null}
                                                    </b>
                                                </th>
                                                {/*
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
                                                </th>*/}
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
                                                            sort("discount");
                                                        }}
                                                    >
                                                        Sales Discount
                                                        {sortField === "discount" && sortOrder === "-" ? (
                                                            <i className="bi bi-sort-numeric-down"></i>
                                                        ) : null}
                                                        {sortField === "discount" && sortOrder === "" ? (
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
                                                            sort("discount_percent");
                                                        }}
                                                    >
                                                        Sales Discount %
                                                        {sortField === "discount_percent" && sortOrder === "-" ? (
                                                            <i className="bi bi-sort-numeric-down"></i>
                                                        ) : null}
                                                        {sortField === "discount_percent" && sortOrder === "" ? (
                                                            <i className="bi bi-sort-numeric-up"></i>
                                                        ) : null}
                                                    </b>
                                                </th>*/}
                                                {cookies.get('admin') === "true" ? <th>
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
                                                        {sortField === "net_profit" && sortOrder === "-" ? (
                                                            <i className="bi bi-sort-numeric-down"></i>
                                                        ) : null}
                                                        {sortField === "net_profit" && sortOrder === "" ? (
                                                            <i className="bi bi-sort-numeric-up"></i>
                                                        ) : null}
                                                    </b>
                                                </th> : ""}
                                                {cookies.get('admin') === "true" ? <th>
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
                                                        {sortField === "net_loss" && sortOrder === "-" ? (
                                                            <i className="bi bi-sort-numeric-down"></i>
                                                        ) : null}
                                                        {sortField === "net_loss" && sortOrder === "" ? (
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
                                                            sort("return_count");
                                                        }}
                                                    >
                                                        Returns
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
                                                {/*
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
                                                        */}

                                                <th>Actions</th>
                                            </tr>
                                            <tr className="text-center sub-header">
                                                <th></th>
                                                <th >
                                                    <input
                                                        type="text"
                                                        id="code"
                                                        onChange={(e) =>
                                                            searchByFieldValue("code", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th >
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
                                                        id="total_payment_received"
                                                        onChange={(e) =>
                                                            searchByFieldValue("total_payment_received", e.target.value)
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
                                                <th>
                                                    <Typeahead
                                                        id="customer_id"
                                                        labelKey="search_label"
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
                                                            suggestCustomers(searchTerm);
                                                        }}
                                                        multiple
                                                    />
                                                </th>
                                                {/*
                                                <th>
                                                    <input
                                                        type="text"
                                                        id="payments_count"
                                                        onChange={(e) =>
                                                            searchByFieldValue("payments_count", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>*/}
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
                                                        id="discount"
                                                        onChange={(e) =>
                                                            searchByFieldValue("discount", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                {/*<th>
                                                    <input
                                                        type="text"
                                                        id="discount_percent"
                                                        onChange={(e) =>
                                                            searchByFieldValue("discount_percent", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>*/}
                                                {cookies.get('admin') === "true" ? <th>
                                                    <input
                                                        type="text"
                                                        id="net_profit"
                                                        onChange={(e) =>
                                                            searchByFieldValue("net_profit", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th> : ""}
                                                {cookies.get('admin') === "true" ? <th>
                                                    <input
                                                        type="text"
                                                        id="net_loss"
                                                        onChange={(e) =>
                                                            searchByFieldValue("net_loss", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th> : ""}

                                                <th>
                                                    <input
                                                        type="text"
                                                        id="return_count"
                                                        onChange={(e) =>
                                                            searchByFieldValue("return_count", e.target.value)
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
                                                </th>
                                                {/*
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
                                                    */}

                                                <th style={{ width: "150px" }}></th>
                                            </tr>
                                        </thead>

                                        <tbody className="text-center">
                                            {orderList &&
                                                orderList.map((order, index) => (
                                                    <tr key={index}>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                            <Button className="btn btn-light btn-sm" onClick={() => {
                                                                openUpdateForm(order.id);
                                                            }}>
                                                                <i className="bi bi-pencil"></i>
                                                            </Button>&nbsp;


                                                            <Button className="btn btn-primary btn-sm" onClick={() => {
                                                                openDetailsView(order.id);
                                                            }}>
                                                                <i className="bi bi-eye"></i>
                                                            </Button>&nbsp;
                                                            <Button
                                                                className="btn btn-dark btn-sm"
                                                                data-bs-toggle="tooltip"
                                                                data-bs-placement="top"
                                                                title="Create Sales Return"
                                                                onClick={() => {
                                                                    openSalesReturnCreateForm(order.id);
                                                                }}
                                                            >
                                                                <i className="bi bi-arrow-left"></i> Return
                                                            </Button>
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }}>{order.code}</td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }}>

                                                            {format(new Date(order.date), "MMM dd yyyy h:mma")}

                                                        </td>
                                                        <td> <Amount amount={trimTo2Decimals(order.net_total)} /> </td>

                                                        <td>


                                                            <Button variant="link" onClick={() => {
                                                                openOrderPaymentsDialogue(order);
                                                            }}>
                                                                <Amount amount={trimTo2Decimals(order.total_payment_received)} />

                                                            </Button>

                                                        </td>
                                                        <td> <Amount amount={trimTo2Decimals(order.balance_amount)} /> </td>
                                                        <td className="text-start" >
                                                            <OverflowTooltip value={order.customer_name} />
                                                        </td>
                                                        {store.zatca?.phase === "2" && store.zatca?.connected ? <td style={{ width: "auto", whiteSpace: "nowrap" }}>

                                                            {!order.zatca?.compliance_passed && order.zatca?.compliance_check_failed_count > 0 ? <span className="badge bg-danger">
                                                                Compliance check failed
                                                                {!order.zatca.compliance_passed && order.zatca.compliance_check_last_failed_at ? <span>&nbsp;<TimeAgo date={order.zatca.compliance_check_last_failed_at} />&nbsp;</span> : ""}
                                                                &nbsp;</span> : ""}

                                                            {!order.zatca?.reporting_passed && order.zatca?.reporting_failed_count > 0 ? <span> <span className="badge bg-danger">
                                                                Reporting failed
                                                                {!order.zatca.reporting_passed && order.zatca.reporting_last_failed_at ? <span><TimeAgo date={order.zatca.reporting_last_failed_at} />&nbsp;</span> : ""}
                                                            </span> &nbsp;</span> : ""}

                                                            {order.zatca?.reporting_passed ? <span>&nbsp;<span className="badge bg-success">
                                                                Reported
                                                                {order.zatca.reporting_passed && order.zatca.reporting_passed_at ? <span>&nbsp;<TimeAgo date={order.zatca.reporting_passed_at} />&nbsp;</span> : ""}
                                                                &nbsp;</span></span> : ""}

                                                            {!order.zatca?.reporting_passed && !order.zatca?.compliance_passed && !order.zatca?.reporting_failed_count && !order.zatca?.compliance_check_failed_count ? <span className="badge bg-warning">
                                                                Not Reported
                                                                &nbsp;</span> : ""}

                                                            {!order.zatca.reporting_passed ? <span> &nbsp; <Button disabled={reportingInProgress} style={{ marginTop: "3px" }} className="btn btn btn-sm" onClick={() => {
                                                                ReportInvoiceToZatca(order.id, index);
                                                            }}>

                                                                {!order.zatca?.reportingInProgress && (order.zatca?.reporting_failed_count > 0 || order.zatca?.compliance_check_failed_count > 0) ? <i class="bi bi-bootstrap-reboot"></i> : ""}
                                                                {!order.zatca?.reportingInProgress && (!order.zatca?.reporting_failed_count > 0 && !order.zatca?.compliance_check_failed_count) ? <span class="bi-arrow-right-circle">&nbsp;Report</span> : ""}

                                                                {order.zatca?.reportingInProgress ? <Spinner
                                                                    as="span"
                                                                    animation="border"
                                                                    size="sm"
                                                                    role="status"
                                                                    aria-hidden={true}
                                                                /> : ""}
                                                            </Button></span> : ""}
                                                            {order.zatca?.reporting_passed ? <span>&nbsp;

                                                                <Button onClick={() => {
                                                                    window.open("/zatca/xml/" + order.code + ".xml", "_blank");
                                                                }}><i class="bi bi-filetype-xml"></i> XML
                                                                </Button>
                                                            </span> : ""}
                                                        </td> : ""}
                                                        {/*<td>


                                                            <Button variant="link" onClick={() => {
                                                                openOrderPaymentsDialogue(order);
                                                            }}>
                                                                {order.payments_count}
                                                            </Button>

                                                        </td>*/}
                                                        <td>
                                                            {order.payment_status === "paid" ?
                                                                <span className="badge bg-success">
                                                                    Paid
                                                                </span> : ""}
                                                            {order.payment_status === "paid_partially" ?
                                                                <span className="badge bg-warning">
                                                                    Paid Partially
                                                                </span> : ""}
                                                            {order.payment_status === "not_paid" ?
                                                                <span className="badge bg-danger">
                                                                    Not Paid
                                                                </span> : ""}
                                                        </td>
                                                        <td>

                                                            {order.payment_methods &&
                                                                order.payment_methods.map((name) => (
                                                                    <span className="badge bg-info">{name}</span>
                                                                ))}

                                                        </td>

                                                        <td><Amount amount={trimTo2Decimals(order.cash_discount)} /> </td>
                                                        <td>{trimTo2Decimals(order.discount)} </td>
                                                        {/*<td>{trimTo2Decimals(order.discount_percent)} %</td>*/}
                                                        {cookies.get('admin') === "true" ? <td><Amount amount={trimTo2Decimals(order.net_profit)} /> </td> : ""}
                                                        {cookies.get('admin') === "true" ? <td><Amount amount={trimTo2Decimals(order.net_loss)} />  </td> : ""}

                                                        <td>


                                                            <Button variant="link" onClick={() => {
                                                                openOrderReturnsDialogue(order);
                                                            }}>
                                                                {order.return_count}
                                                            </Button>

                                                        </td>

                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }}>{order.created_by_name}</td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                            {format(
                                                                new Date(order.created_at),
                                                                "MMM dd yyyy h:mma"
                                                            )}
                                                        </td>


                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                            <Button className="btn btn-light btn-sm" onClick={() => {
                                                                openUpdateForm(order.id);
                                                            }}>
                                                                <i className="bi bi-pencil"></i>
                                                            </Button>&nbsp;


                                                            <Button className="btn btn-primary btn-sm" onClick={() => {
                                                                openDetailsView(order.id);
                                                            }}>
                                                                <i className="bi bi-eye"></i>
                                                            </Button>&nbsp;
                                                            <Button
                                                                className="btn btn-dark btn-sm"
                                                                data-bs-toggle="tooltip"
                                                                data-bs-placement="top"
                                                                title="Create Sales Return"
                                                                onClick={() => {
                                                                    openSalesReturnCreateForm(order.id);
                                                                }}
                                                            >
                                                                <i className="bi bi-arrow-left"></i> Return
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
                </div >
            </div >


            <Modal show={showOrderPaymentHistory} size="lg" onHide={handleOrderPaymentHistoryClose} animation={false} scrollable={true}>
                <Modal.Header>
                    <Modal.Title>Payment history of Order #{selectedOrder.code}</Modal.Title>

                    <div className="col align-self-end text-end">
                        <button
                            type="button"
                            className="btn-close"
                            onClick={handleOrderPaymentHistoryClose}
                            aria-label="Close"
                        ></button>

                    </div>
                </Modal.Header>
                <Modal.Body>
                    <SalesPaymentIndex ref={SalesPaymentListRef} showToastMessage={props.showToastMessage} order={selectedOrder} refreshSalesList={list} />
                </Modal.Body>
            </Modal>

            <Modal show={showOrderReturns} size="lg" onHide={handleOrderReturnsClose} animation={false} scrollable={true}>
                <Modal.Header>
                    <Modal.Title>Sales Returns of Sale Order #{selectedOrder.code}</Modal.Title>

                    <div className="col align-self-end text-end">
                        <button
                            type="button"
                            className="btn-close"
                            onClick={handleOrderReturnsClose}
                            aria-label="Close"
                        ></button>

                    </div>
                </Modal.Header>
                <Modal.Body>
                    <SalesReturnIndex ref={SalesReturnListRef} showToastMessage={props.showToastMessage} order={selectedOrder} refreshSalesList={list} />
                </Modal.Body>
            </Modal>

        </>
    );
});

export default OrderIndex;
