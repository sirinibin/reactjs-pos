import React, { useState, useEffect, useRef, forwardRef, useContext, useCallback, useMemo } from "react";
import OrderCreate from "./create.js";
import OrderView from "./view.js";

import SalesPaymentIndex from "./../sales_payment/index.js";
import SalesReturnIndex from "./../sales_return/index.js";
import SalesReturnCreate from "./../sales_return/create.js";
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
import OrderPreview from "./preview.js";
import ReportPreview from "./report.js";
import OrderPrint from './print.js';
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import CustomerCreate from "./../customer/create.js";
import Draggable2 from "react-draggable";

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
    //deploy to master
    let [enableSelection, setEnableSelection] = useState(false);
    let [pendingView, setPendingView] = useState(false);

    const dragRef = useRef(null);
    const { lastMessage } = useContext(WebSocketContext);




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
                Authorization: localStorage.getItem("access_token"),
            },
        };
        let Select =
            "select=id,code,date,total,net_total,shipping_handling_fees,discount_percent,discount,products,customer_name,created_at,vat_price,vat_percent,customer.id,customer.vat_no,customer.phone";

        if (localStorage.getItem("store_id")) {
            searchParams.store_id = localStorage.getItem("store_id");
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
    let [pageSize, setPageSize] = useState(20);
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
            id: "sales_return",
            name: "Sales Return",
        },
        {
            id: "purchase",
            name: "Purchase",
        },
        {
            id: "customer_account",
            name: "Customer account",
        },
    ];

    const commissionPaymentMethodOptions = [
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
    ];
    const [selectedPaymentMethodList, setSelectedPaymentMethodList] = useState([]);
    const [selectedCommissionPaymentMethodList, setSelectedCommissionPaymentMethodList] = useState([]);


    useEffect(() => {
        if (props.enableSelection) {
            setEnableSelection(props.enableSelection);
        } else {
            setEnableSelection(false);
        }

        if (props.pendingView) {
            setPendingView(props.pendingView);
        } else {
            setPendingView(false);
        }

        if (props.selectedCustomers?.length > 0) {
            searchByMultipleValuesField("customer_id", props.selectedCustomers, true);
        }

        if (props.selectedPaymentStatusList) {
            searchByMultipleValuesField("payment_status", props.selectedPaymentStatusList, true);
        }

        //list();
        if (localStorage.getItem("store_id")) {
            getStore(localStorage.getItem("store_id"));
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
    const [totalSalesReturnSales, setTotalSalesReturnSales] = useState(0.00);
    const [totalPurchaseSales, setTotalPurchaseSales] = useState(0.00);
    const [loss, setLoss] = useState(0.00);


    const [commission, setCommission] = useState(0.00);
    const [commissionPaidByCash, setCommissionPaidByCash] = useState(0.00);
    const [commissionPaidByBank, setCommissionPaidByBank] = useState(0.00);
    //const [returnCount, setReturnCount] = useState(0.00);
    //const [returnPaidAmount, setReturnPaidAmount] = useState(0.00);

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

        fetch('/v1/store/' + id + "?select=id,name,code,zatca.phase,zatca.connected,settings", requestOptions)
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


    const customCustomerFilter = useCallback((option, query) => {
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


    async function suggestCustomers(searchTerm) {
        console.log("Inside handle suggestCustomers");
        setCustomerOptions([]);

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

        let Select = "select=id,code,credit_limit,credit_balance,additional_keywords,remarks,use_remarks_in_sales,vat_no,name,phone,name_in_arabic,phone_in_arabic,search_label";
        // setIsCustomersLoading(true);
        let result = await fetch(
            "/v1/customer?" + Select + queryString,
            requestOptions
        );
        let data = await result.json();

        const filtered = data.result.filter((opt) => customCustomerFilter(opt, searchTerm));

        setCustomerOptions(filtered);
        // setIsCustomersLoading(false);
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

    function searchByMultipleValuesField(field, values, noList) {
        if (field === "created_by") {
            setSelectedCreatedByUsers(values);
        } else if (field === "customer_id") {
            setSelectedCustomers(values);
        } else if (field === "payment_status") {
            setSelectedPaymentStatusList(values);
        } else if (field === "payment_methods") {
            setSelectedPaymentMethodList(values);
        } else if (field === "commission_payment_method") {
            setSelectedCommissionPaymentMethodList(values);
        }

        searchParams[field] = Object.values(values)
            .map(function (model) {
                if (model.name === "UNKNOWN CUSTOMER") {
                    return "unknown_customer";
                }

                return model.id;
            })
            .join(",");

        page = 1;
        setPage(page);

        if (!noList) {
            list();
        }
    }


    const [statsOpen, setStatsOpen] = useState(false);

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
            "select=phone,zatca.compliance_check_last_failed_at,commission,commission_payment_method,zatca.reporting_passed,zatca.compliance_passed,zatca.reporting_passed_at,zatca.compliane_check_passed_at,zatca.reporting_last_failed_at,zatca.reporting_failed_count,zatca.compliance_check_failed_count,id,code,date,net_total,return_count,return_amount,cash_discount,total_payment_received,payments_count,payment_methods,balance_amount,discount_percent,discount,created_by_name,customer_name,customer_name_arabic,status,payment_status,payment_method,created_at,loss,net_loss,net_profit,store_id,total,customer_id";

        if (localStorage.getItem("store_id")) {
            searchParams.store_id = localStorage.getItem("store_id");
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
                setCommission(data.meta.commission);
                setCommissionPaidByCash(data.meta.commission_paid_by_cash);
                setCommissionPaidByBank(data.meta.commission_paid_by_bank);
                setTotalPaidSales(data.meta.paid_sales);
                setTotalUnPaidSales(data.meta.unpaid_sales);
                setTotalCashSales(data.meta.cash_sales);
                setTotalBankAccountSales(data.meta.bank_account_sales);
                setTotalPurchaseSales(data.meta.purchase_sales);
                setTotalSalesReturnSales(data.meta.sales_return_sales);
                //setReturnCount(data.meta.return_count);
                //setReturnPaidAmount(data.meta.return_amount);

            })
            .catch((error) => {
                setIsListLoading(false);
                setIsRefreshInProcess(false);
                console.log(error);
            });
    }, [sortOrder, sortField, page, pageSize, statsOpen, searchParams]);


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
        // alert(field + "," + sortOrder);
        list();
    }

    /*
    useEffect(() => {
        const timer = setTimeout(() => {
            // list();
        }, 300);

        // Cleanup to avoid memory leaks
        return () => clearTimeout(timer);
    }, [pageSize, list]);
    */

    // Add this effect:
    useEffect(() => {
        list();
    }, [pageSize, list]);

    function changePageSize(size) {
        // pageSize = parseInt(size);
        setPageSize(parseInt(size));

        /*
                if (timerRef.current) clearTimeout(timerRef.current);
        
                timerRef.current = setTimeout(() => {
                    list();
                }, 100);*/
    }

    useEffect(() => {
        list();
    }, [page, list]);

    function changePage(newPage) {
        page = parseInt(newPage);
        setPage(page);
        /*
        if (timerRef.current) clearTimeout(timerRef.current);

        timerRef.current = setTimeout(() => {
            list();
        }, 100);*/

        // list();
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


    let [showOrderView, setShowOrderView] = useState(false);

    const DetailsViewRef = useRef();
    function openDetailsView(id) {
        showOrderView = true;
        setShowOrderView(true);
        if (timerRef.current) clearTimeout(timerRef.current);

        timerRef.current = setTimeout(() => {
            DetailsViewRef.current?.open(id);
        }, 50);
    }



    let [showOrderCreateForm, setShowOrderCreateForm] = useState(false);
    const CreateFormRef = useRef();
    function openCreateForm() {
        showOrderCreateForm = true;
        setShowOrderCreateForm(true);

        if (timerRef.current) clearTimeout(timerRef.current);

        timerRef.current = setTimeout(() => {
            CreateFormRef.current?.open();
        }, 50);
    }

    function openUpdateForm(id) {
        setShowOrderCreateForm(true);
        if (timerRef.current) clearTimeout(timerRef.current);

        timerRef.current = setTimeout(() => {
            CreateFormRef.current?.open(id);
        }, 50);
    }




    const SalesReturnListRef = useRef();

    //Sales Payments

    const SalesPaymentListRef = useRef();



    //Sales Return
    let [showSalesReturnCreateForm, setShowSalesReturnCreateForm] = useState(false);
    const SalesReturnCreateRef = useRef();
    function openSalesReturnCreateForm(id) {
        showSalesReturnCreateForm = true;
        setShowSalesReturnCreateForm(true);

        if (timerRef.current) clearTimeout(timerRef.current);

        timerRef.current = setTimeout(() => {
            SalesReturnCreateRef.current?.open(undefined, id);
        }, 100);
    }

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

        let endPoint = "/v1/order/zatca/report/" + id + "?" + queryParams;
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
                if (props.showToastMessage) props.showToastMessage("Invoice reported successfully to Zatca!", "success");
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
                if (props.showToastMessage) props.showToastMessage("Invoice reporting to Zatca failed!", "danger");
                list();
            });
    }

    const [showErrors, setShowErrors] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState(false);

    const printButtonRef = useRef();
    const printA4ButtonRef = useRef();

    const PreviewRef = useRef();
    const openPreview = useCallback((order) => {
        setShowOrderPreview(true);
        setShowPrintTypeSelection(false);


        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            PreviewRef.current?.open(order, undefined, "sales");
        }, 100);
    }, []);

    let [showOrderPreview, setShowOrderPreview] = useState(false);

    const openPrintTypeSelection = useCallback((order) => {
        setSelectedOrder(order);
        if (store.settings?.enable_invoice_print_type_selection) {
            setShowOrderPreview(true);
            setShowPrintTypeSelection(true);
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => {
                printButtonRef.current?.focus();
            }, 100);

        } else {
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => {
                openPreview(order);
            }, 100);
        }
    }, [openPreview, store]);



    const PrintRef = useRef();

    let [showPrint, setShowPrint] = useState(false);

    const openPrint = useCallback(() => {
        // document.removeEventListener('keydown', handleEnterKey);
        setShowPrintTypeSelection(false);


        setShowPrint(true);


        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            PrintRef.current?.open(selectedOrder, "sales");
        }, 100);


    }, [selectedOrder]);




    let [showReportPreview, setShowReportPreview] = useState(false);
    const ReportPreviewRef = useRef();
    function openReportPreview() {
        showReportPreview = true;
        setShowReportPreview(true);

        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            ReportPreviewRef.current?.open("sales_report");
        }, 100);
    }

    function sendWhatsAppMessage(model) {
        showOrderPreview = true;
        setShowOrderPreview(showOrderPreview);

        if (timerRef.current) clearTimeout(timerRef.current);

        timerRef.current = setTimeout(() => {
            PreviewRef.current?.open(model, "whatsapp", "whatsapp_sales");
        }, 100);
    }


    const customerSearchRef = useRef();
    const timerRef = useRef(null);

    let [showPrintTypeSelection, setShowPrintTypeSelection] = useState(false);

    //Table settings
    const defaultColumns = useMemo(() => [
        { key: "actions", label: "Actions", fieldName: "actions", visible: true },
        { key: "select", label: "Select", fieldName: "select", visible: true },
        { key: "id", label: "ID", fieldName: "code", visible: true },
        { key: "date", label: "Date", fieldName: "date", visible: true },
        { key: "customer", label: "Customer", fieldName: "customer_name", visible: true },
        { key: "net_total", label: "Net Total", fieldName: "net_total", visible: true },
        { key: "amount_paid", label: "Amount Paid", fieldName: "total_payment_received", visible: true },
        { key: "credit_balance", label: "Credit Balance", fieldName: "balance_amount", visible: true },
        { key: "reported_to_zatca", label: "Reported to Zatca", fieldName: "zatca.reporting_passed", visible: true },
        { key: "payment_status", label: "Payment Status", fieldName: "payment_status", visible: true },
        { key: "payment_methods", label: "Payment Methods", fieldName: "payment_methods", visible: true },
        { key: "cash_discount", label: "Cash Discount", fieldName: "cash_discount", visible: true },
        { key: "commission", label: "Commission", fieldName: "commission", visible: true },
        { key: "commission_payment_method", label: "Commission Payment Method", fieldName: "commission_payment_method", visible: true },
        { key: "sales_discount", label: "Sales Discount", fieldName: "discount", visible: true },
        { key: "net_profit", label: "Net Profit", fieldName: "net_profit", visible: true },
        { key: "net_loss", label: "Net Loss", fieldName: "net_loss", visible: true },
        { key: "return_count", label: "Return Count", fieldName: "return_count", visible: true },
        { key: "return_paid_amount", label: "Return Paid Amount", fieldName: "return_amount", visible: true },
        { key: "created_by", label: "Created By", fieldName: "created_by", visible: true },
        { key: "created_at", label: "Created At", fieldName: "created_at", visible: true },
        { key: "actions_end", label: "Actions", fieldName: "actions_end", visible: true },
    ], []);


    const [columns, setColumns] = useState(defaultColumns);
    const [showSettings, setShowSettings] = useState(false);
    // Load settings from localStorage
    useEffect(() => {
        let saved = "";
        if (enableSelection === true) {
            saved = localStorage.getItem("select_sales_table_settings");
        } else if (pendingView === true) {
            saved = localStorage.getItem("pending_sales_table_settings");
        } else {
            saved = localStorage.getItem("sales_table_settings");
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
                localStorage.setItem("select_sales_table_settings", JSON.stringify(defaultColumns));
            } else if (pendingView === true) {
                localStorage.setItem("pending_sales_table_settings", JSON.stringify(defaultColumns));
            } else {
                localStorage.setItem("sales_table_settings", JSON.stringify(defaultColumns));
            }

            setColumns(defaultColumns);
        }

        //2nd

    }, [defaultColumns, enableSelection, pendingView]);

    function RestoreDefaultSettings() {
        const clonedDefaults = defaultColumns.map(col => ({ ...col }));

        if (enableSelection === true) {
            localStorage.setItem("select_sales_table_settings", JSON.stringify(clonedDefaults));
        } else if (pendingView === true) {
            localStorage.setItem("pending_sales_table_settings", JSON.stringify(clonedDefaults));
        } else {
            localStorage.setItem("sales_table_settings", JSON.stringify(clonedDefaults));
        }

        setColumns(clonedDefaults);

        setShowSuccess(true);
        setSuccessMessage("Successfully restored to default settings!")
    }

    // Save column settings to localStorage
    /*
    useEffect(() => {
        if (enableSelection === true) {
            localStorage.setItem("select_sales_table_settings", JSON.stringify(columns));
        } else if (pendingView === true) {
            localStorage.setItem("pending_sales_table_settings", JSON.stringify(columns));
        } else {
            localStorage.setItem("sales_table_settings", JSON.stringify(columns));
        }
    }, [columns, enableSelection, pendingView]);*/

    const handleToggleColumn = (index) => {
        const updated = [...columns];
        updated[index].visible = !updated[index].visible;
        setColumns(updated);
        if (enableSelection === true) {
            localStorage.setItem("select_sales_table_settings", JSON.stringify(updated));
        } else if (pendingView === true) {
            localStorage.setItem("pending_sales_table_settings", JSON.stringify(updated));
        } else {
            localStorage.setItem("sales_table_settings", JSON.stringify(updated));
        }
    };

    const onDragEnd = (result) => {
        if (!result.destination) return;
        const reordered = Array.from(columns);
        const [moved] = reordered.splice(result.source.index, 1);
        reordered.splice(result.destination.index, 0, moved);
        setColumns(reordered);

        if (enableSelection === true) {
            localStorage.setItem("select_sales_table_settings", JSON.stringify(reordered));
        } else if (pendingView === true) {
            localStorage.setItem("pending_sales_table_settings", JSON.stringify(reordered));
        } else {
            localStorage.setItem("sales_table_settings", JSON.stringify(reordered));
        }
    };

    const CustomerUpdateFormRef = useRef();
    let [showCustomerUpdateForm, setShowCustomerUpdateForm] = useState(false);
    function openCustomerUpdateForm(id) {
        showCustomerUpdateForm = true;
        setShowCustomerUpdateForm(showCustomerUpdateForm);

        if (timerRef.current) clearTimeout(timerRef.current);

        timerRef.current = setTimeout(() => {
            CustomerUpdateFormRef.current?.open(id);
        }, 100);
    }

    const handleSelected = (selected) => {
        props.onSelectSale(selected); // Send to parent
    };

    const handleUpdated = () => {
        if (props.handleUpdated) {
            props.handleUpdated();
        }
    };


    return (
        <>
            {showCustomerUpdateForm && <CustomerCreate ref={CustomerUpdateFormRef} />}
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
                        Sales Settings
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
                            // Save to localStorage here if needed
                            //setShowSettings(false);
                        }}
                    >
                        Restore to Default
                    </Button>
                </Modal.Footer>
            </Modal>

            {showPrint && <OrderPrint ref={PrintRef} />}
            {showOrderPreview && <OrderPreview ref={PreviewRef} />}
            <Modal show={showPrintTypeSelection} onHide={() => {
                showPrintTypeSelection = false;
                setShowPrintTypeSelection(showPrintTypeSelection);
            }} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Select Print Type</Modal.Title>
                </Modal.Header>
                <Modal.Body className="d-flex justify-content-around">
                    <Button variant="secondary" ref={printButtonRef} onClick={() => {
                        openPrint(selectedOrder);
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
                        openPreview(selectedOrder);
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

            {showReportPreview && <ReportPreview ref={ReportPreviewRef} searchParams={searchParams} sortOrder={sortOrder} sortField={sortField} />}

            {showOrderCreateForm && <OrderCreate ref={CreateFormRef} handleUpdated={handleUpdated} refreshList={list} showToastMessage={props.showToastMessage} openCreateForm={openCreateForm} />}
            {showOrderView && <OrderView ref={DetailsViewRef} openCreateForm={openCreateForm} />}
            {showSalesReturnCreateForm && <SalesReturnCreate ref={SalesReturnCreateRef} showToastMessage={props.showToastMessage} refreshSalesList={list} />}

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
                                    "Cash Sales": totalCashSales,
                                    "Credit Sales": totalUnPaidSales,
                                    "Bank Account Sales": totalBankAccountSales,
                                    "Sales paid By Sales Return": totalSalesReturnSales,
                                    "Sales paid By Purchase": totalPurchaseSales,
                                    "Cash Discount": totalCashDiscount,
                                    "VAT Collected": vatPrice,
                                    "Net Profit %": netProfit && totalSales ? ((netProfit / totalSales) * 100) : "",
                                    "Paid Sales": totalPaidSales,
                                    "Sales Discount": totalDiscount,
                                    "Shipping/Handling fees": totalShippingHandlingFees,
                                    "Net Profit": netProfit,
                                    "Net Loss": loss,
                                    "Commission": commission,
                                    "Commission Paid By Cash": commissionPaidByCash,
                                    "Commission Paid By Bank": commissionPaidByBank,
                                    //"Return Count": returnCount,
                                    //"Return Paid Amount": returnPaidAmount,
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

                        <Button variant="primary" onClick={() => {
                            openReportPreview();
                        }} style={{ marginRight: "8px" }} className="btn btn-primary mb-3">
                            <i className="bi bi-printer"></i>&nbsp;
                            Print Report
                        </Button>

                        <ExcelFile filename={salesReportFileName} element={excelData.length > 0 ? <Button variant="success" className="btn btn-primary mb-3 success" >Download Sales Report(XLS)</Button> : ""}>
                            <ExcelSheet dataSet={excelData} name={salesReportFileName} />
                        </ExcelFile>

                        {excelData.length === 0 ? <Button variant="primary" className="btn btn-primary mb-3" onClick={getAllOrders} >{fettingAllRecordsInProgress ? "Preparing.." : "Sales Report(XLS)"}</Button> : ""}
                        &nbsp;&nbsp;

                        <Button
                            hide={true.toString()}
                            variant="primary"
                            className="btn btn-primary mb-3"
                            onClick={() => {
                                openCreateForm();
                            }}
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
                                    <table className="table table-striped table-bordered table-sm" style={{}}>
                                        <thead>
                                            <tr className="text-center main-header">
                                                {columns.filter(c => c.visible).map((col) => {
                                                    return (<>
                                                        {col.key === "actions" && <th key={col.key}>{col.label}</th>}
                                                        {col.key === "select" && enableSelection && <th key={col.key}>{col.label}</th>}
                                                        {col.key === "reported_to_zatca" && store.zatca?.phase === "2" && store.zatca?.connected && <th>
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
                                                        {col.key !== "actions" && col.key !== "select" && col.key !== "reported_to_zatca" && <th>
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
                                            </tr>
                                            <tr className="text-center sub-header">
                                                {columns.filter(c => c.visible).map((col) => {
                                                    return (<>
                                                        {(col.key === "actions" || col.key === "actions_end") && <th></th>}
                                                        {col.key === "select" && enableSelection && <th></th>}
                                                        {col.key !== "actions" &&
                                                            col.key !== "select" &&
                                                            col.key !== "date" &&
                                                            col.key !== "reported_to_zatca" &&
                                                            col.key !== "payment_status" &&
                                                            col.key !== "payment_methods" &&
                                                            col.key !== "commission_payment_method" &&
                                                            col.key !== "created_by" &&
                                                            col.key !== "created_at" &&
                                                            col.key !== "actions_end" &&
                                                            col.key !== "customer" &&
                                                            <th><input
                                                                type="text"
                                                                id={"sales_" + col.fieldName}
                                                                name={"sales_" + col.fieldName}
                                                                onChange={(e) =>
                                                                    searchByFieldValue(col.fieldName, e.target.value)
                                                                }
                                                                className="form-control"
                                                            /></th>}
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
                                                        {col.key === "commission_payment_method" && <th>
                                                            <Typeahead
                                                                id="commission_payment_method"

                                                                labelKey="name"
                                                                onChange={(selectedItems) => {
                                                                    searchByMultipleValuesField(
                                                                        "commission_payment_method",
                                                                        selectedItems
                                                                    );
                                                                }}
                                                                options={commissionPaymentMethodOptions}
                                                                placeholder="Select payment methods"
                                                                selected={selectedCommissionPaymentMethodList}
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
                                                                autoComplete="off"
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
                                                                        autoComplete="off"
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
                                                                        autoComplete="off"
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
                                                        {col.key === "reported_to_zatca" && store.zatca?.phase === "2" && store.zatca?.connected && <th>
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
                                                                    autoComplete="off"
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
                                                                            autoComplete="off"
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
                                                                            autoComplete="off"
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
                                            </tr>
                                        </thead>

                                        <tbody className="text-center">
                                            {orderList &&
                                                orderList.map((order, index) => (
                                                    <tr key={index}>
                                                        {columns.filter(c => c.visible).map((col) => {
                                                            return (<>
                                                                {(col.key === "actions" || col.key === "actions_end") && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
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
                                                                    <Button className="btn btn-primary btn-sm" onClick={() => {
                                                                        openPrintTypeSelection(order);
                                                                    }}>
                                                                        <i className="bi bi-printer"></i>
                                                                    </Button>
                                                                    &nbsp;
                                                                    <Button className={`btn btn-success btn-sm`} style={{}} onClick={() => {
                                                                        sendWhatsAppMessage(order);
                                                                    }}>
                                                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="white" viewBox="0 0 16 16">
                                                                            <path d="M13.601 2.326A7.875 7.875 0 0 0 8.036 0C3.596 0 0 3.597 0 8.036c0 1.417.37 2.805 1.07 4.03L0 16l3.993-1.05a7.968 7.968 0 0 0 4.043 1.085h.003c4.44 0 8.036-3.596 8.036-8.036 0-2.147-.836-4.166-2.37-5.673ZM8.036 14.6a6.584 6.584 0 0 1-3.35-.92l-.24-.142-2.37.622.63-2.31-.155-.238a6.587 6.587 0 0 1-1.018-3.513c0-3.637 2.96-6.6 6.6-6.6 1.764 0 3.42.69 4.67 1.94a6.56 6.56 0 0 1 1.93 4.668c0 3.637-2.96 6.6-6.6 6.6Zm3.61-4.885c-.198-.1-1.17-.578-1.352-.644-.18-.066-.312-.1-.444.1-.13.197-.51.644-.626.775-.115.13-.23.15-.428.05-.198-.1-.837-.308-1.594-.983-.59-.525-.99-1.174-1.11-1.372-.116-.198-.012-.305.088-.403.09-.09.198-.23.298-.345.1-.115.132-.197.2-.33.065-.13.032-.247-.017-.345-.05-.1-.444-1.07-.61-1.46-.16-.384-.323-.332-.444-.338l-.378-.007c-.13 0-.344.048-.525.23s-.688.672-.688 1.64c0 .967.704 1.9.802 2.03.1.13 1.386 2.116 3.365 2.963.47.203.837.324 1.122.414.472.15.902.13 1.24.08.378-.057 1.17-.48 1.336-.942.165-.462.165-.858.116-.943-.048-.084-.18-.132-.378-.23Z" />
                                                                        </svg>
                                                                    </Button>
                                                                    &nbsp;
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
                                                                </td>}
                                                                {(col.key === "select" && enableSelection) && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                    <Button className="btn btn-success btn-sm" onClick={() => {
                                                                        handleSelected(order);
                                                                    }}>
                                                                        Select
                                                                    </Button>
                                                                </td>}
                                                                {(col.fieldName === "code") && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                    {order.code}
                                                                </td>}
                                                                {(col.fieldName === "date" || col.fieldName === "created_at") && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                    {format(new Date(order[col.key]), "MMM dd yyyy h:mma")}
                                                                </td>}
                                                                {(col.fieldName === "customer_name") && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                    {order.customer_name && <span style={{ cursor: "pointer", color: "blue" }} onClick={() => {
                                                                        openCustomerUpdateForm(order.customer_id);
                                                                    }}><OverflowTooltip value={order.customer_name + (order.customer_name_arabic ? " | " + order.customer_name_arabic : "")} />
                                                                    </span>}
                                                                </td>}
                                                                {(col.fieldName === "net_total") && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                    <Amount amount={trimTo2Decimals(order.net_total)} />
                                                                </td>}
                                                                {(col.fieldName === "total_payment_received") && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                    <Button variant="link" onClick={() => {
                                                                        openOrderPaymentsDialogue(order);
                                                                    }}>
                                                                        <Amount amount={trimTo2Decimals(order.total_payment_received)} />
                                                                    </Button>
                                                                </td>}
                                                                {(col.fieldName === "balance_amount") && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                    <Amount amount={trimTo2Decimals(order.balance_amount)} />
                                                                </td>}
                                                                {(col.fieldName === "zatca.reporting_passed" && store.zatca?.phase === "2" && store.zatca?.connected) && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                    {!order.zatca?.compliance_passed && !order.zatca?.reporting_passed && order.zatca?.compliance_check_failed_count > 0 ? <span className="badge bg-danger">
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
                                                                </td>}
                                                                {(col.fieldName === "payment_status") && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
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
                                                                </td>}
                                                                {(col.fieldName === "payment_methods") && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                    {order.payment_methods &&
                                                                        order.payment_methods.map((name) => (
                                                                            <span className="badge bg-info">{name}</span>
                                                                        ))}
                                                                </td>}
                                                                {(col.fieldName === "cash_discount") && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                    <Amount amount={trimTo2Decimals(order.cash_discount)} />
                                                                </td>}
                                                                {(col.fieldName === "commission") && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                    {order.commission && <Amount amount={trimTo2Decimals(order.commission)} />}
                                                                </td>}
                                                                {(col.fieldName === "commission_payment_method") && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                    {order.commission_payment_method && <span className="badge bg-info">{order.commission_payment_method}</span>}
                                                                </td>}
                                                                {(col.fieldName === "discount") && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                    {trimTo2Decimals(order.discount)}
                                                                </td>}
                                                                {(col.fieldName === "net_profit") && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                    <Amount amount={trimTo2Decimals(order.net_profit)} />
                                                                </td>}
                                                                {(col.fieldName === "net_loss") && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                    <Amount amount={trimTo2Decimals(order.net_loss)} />
                                                                </td>}
                                                                {(col.fieldName === "return_count") && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                    <Button variant="link" onClick={() => {
                                                                        openOrderReturnsDialogue(order);
                                                                    }}>
                                                                        {order.return_count}
                                                                    </Button>
                                                                </td>}
                                                                {(col.fieldName === "return_amount") && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                    <Button variant="link" onClick={() => {
                                                                        openOrderReturnsDialogue(order);
                                                                    }}>
                                                                        {order.return_amount}
                                                                    </Button>
                                                                </td>}
                                                                {(col.fieldName === "created_by") && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                    {order.created_by_name}
                                                                </td>}
                                                            </>)
                                                        })}
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


            <Modal show={showOrderPaymentHistory} size="lg" onHide={handleOrderPaymentHistoryClose} animation={false} scrollable={true}
                backdrop={false}                // ✅ Allow editing background
                keyboard={false}
                centered={false}                // ❌ disable auto-centering
                enforceFocus={false}            // ✅ allow focus outside
                dialogAs={({ children, ...props }) => (
                    <Draggable2 handle=".modal-header" nodeRef={dragRef}>
                        <div
                            ref={dragRef}
                            className="modal-dialog modal-lg"    // ✅ preserve Bootstrap xl class
                            {...props}
                            style={{
                                position: "absolute",
                                top: "10%",
                                left: "20%",
                                transform: "translate(-50%, -50%)",
                                margin: "0",
                                zIndex: 1055,
                                width: "65%",           // Full width inside container
                            }}
                        >
                            <div className="modal-content">{children}</div>
                        </div>
                    </Draggable2>
                )}
            >
                <Modal.Header>
                    <Modal.Title>Payment history of Order #{selectedOrder?.code}</Modal.Title>

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
                    {showOrderPaymentHistory && <SalesPaymentIndex ref={SalesPaymentListRef} showToastMessage={props.showToastMessage} order={selectedOrder} refreshSalesList={list} />}
                </Modal.Body>
            </Modal>

            <Modal show={showOrderReturns} size="lg" onHide={handleOrderReturnsClose} animation={false} scrollable={true}
                backdrop={false}                // ✅ Allow editing background
                keyboard={false}
                centered={false}                // ❌ disable auto-centering
                enforceFocus={false}            // ✅ allow focus outside
                dialogAs={({ children, ...props }) => (
                    <Draggable2 handle=".modal-header" nodeRef={dragRef}>
                        <div
                            ref={dragRef}
                            className="modal-dialog modal-lg"    // ✅ preserve Bootstrap xl class
                            {...props}
                            style={{
                                position: "absolute",
                                top: "10%",
                                left: "20%",
                                transform: "translate(-50%, -50%)",
                                margin: "0",
                                zIndex: 1055,
                                width: "65%",           // Full width inside container
                            }}
                        >
                            <div className="modal-content">{children}</div>
                        </div>
                    </Draggable2>
                )}
            >
                <Modal.Header>
                    <Modal.Title>Sales Returns of Sale Order #{selectedOrder?.code}</Modal.Title>

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
                    {showOrderReturns && <SalesReturnIndex ref={SalesReturnListRef} showToastMessage={props.showToastMessage} order={selectedOrder} refreshSalesList={list} />}
                </Modal.Body>
            </Modal>

        </>
    );
});

export default OrderIndex;
