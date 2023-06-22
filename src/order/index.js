import React, { useState, useEffect, useRef, forwardRef } from "react";
import OrderCreate from "./create.js";
import OrderView from "./view.js";
import SalesReturnCreate from "./../sales_return/create.js";

import SalesCashDiscountCreate from "./../sales_cash_discount/create.js";
import SalesCashDiscountDetailsView from "./../sales_cash_discount/view.js";

import SalesPaymentCreate from "./../sales_payment/create.js";
import SalesPaymentDetailsView from "./../sales_payment/view.js";

import Cookies from "universal-cookie";
import { Typeahead } from "react-bootstrap-typeahead";
import { format } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Button, Spinner, Badge } from "react-bootstrap";
import ReactPaginate from "react-paginate";
import NumberFormat from "react-number-format";


import ReactExport from 'react-data-export';
const ExcelFile = ReactExport.ExcelFile;
const ExcelSheet = ReactExport.ExcelFile.ExcelSheet;


const OrderIndex = forwardRef((props, ref) => {


    const cookies = new Cookies();


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
        let totalDiscount = 0;
        let totalAmountAfterDiscount = 0;
        let totalShippingFees = 0;

        let invoiceCount = 0;
        for (let orderDate in groupedByDate) {

            console.log("orderDate:", orderDate);
            excelData[0].data.push([{ value: "Inv Date: " + orderDate }]);
            let dayTotalBeforeVAT = 0.00;
            let dayTotalAfterVAT = 0.00;
            let dayVAT = 0.00;
            let dayDiscount = 0.00;
            let dayShippingFees = 0.00;

            for (var i = 0; i < groupedByDate[orderDate].length > 0; i++) {
                invoiceCount++;
                let order = groupedByDate[orderDate][i];
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

                for (var j = 0; j < order.products.length; j++) {

                    let product = order.products[j];

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
                            value: product.unit_price ? product.unit_price.toFixed(2) : 0.00,
                        },
                        {
                            value: (product.unit_price * product.quantity).toFixed(2)
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
                            value: ((product.unit_price * product.quantity).toFixed(2) * 0.15).toFixed(2),
                        },
                        {
                            value: (product.unit_price * product.quantity).toFixed(2),
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
                        value: order.shipping_handling_fees.toFixed(2),
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
                        value: ((order.total + order.shipping_handling_fees)).toFixed(2),
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
                        value: order.discount.toFixed(2),
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
                        value: ((order.total + order.shipping_handling_fees) - order.discount).toFixed(2),
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
                        value: order.vat_price.toFixed(2),
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
                        value: ((order.total + order.shipping_handling_fees) - order.discount + order.vat_price).toFixed(2),
                    },
                ]);


                dayVAT += order.vat_price;
                dayTotalBeforeVAT += (order.total + order.shipping_handling_fees) - order.discount;
                dayTotalAfterVAT += (order.total + order.shipping_handling_fees) - order.discount + order.vat_price;
                dayDiscount += order.discount;
                dayShippingFees += order.shipping_handling_fees;

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
            "select=id,code,date,total,net_total,shipping_handling_fees,discount_percent,discount,products,customer_name,created_at,vat_price,customer_id,customer.id,customer.vat_no";

        if (cookies.get("store_id")) {
            searchParams.store_id = cookies.get("store_id");
        }

        const d = new Date();
        let diff = d.getTimezoneOffset();
        console.log("Timezone:", parseFloat(diff / 60));
        searchParams["timezone_offset"] = parseFloat(diff / 60);

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

    //loader flag
    const [isListLoading, setIsListLoading] = useState(false);
    const [isRefreshInProcess, setIsRefreshInProcess] = useState(false);

    //Customer Auto Suggestion
    const [customerOptions, setCustomerOptions] = useState([]);
    const [selectedCustomers, setSelectedCustomers] = useState([]);

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
            name: "cash",
        },
        {
            id: "bank_account",
            name: "Bank Account / Debit / Credit card",
        },
    ];
    const [selectedPaymentMethodList, setSelectedPaymentMethodList] = useState([]);
   

    useEffect(() => {
        list();

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    //Search params
    const [searchParams, setSearchParams] = useState({});
    let [sortField, setSortField] = useState("created_at");
    let [sortOrder, setSortOrder] = useState("-");


    let [totalSales, setTotalSales] = useState(0.00);
    let [netProfit, setNetProfit] = useState(0.00);
    let [vatPrice, setVatPrice] = useState(0.00);
    let [totalShippingHandlingFees, setTotalShippingHandlingFees] = useState(0.00);
    let [totalDiscount, setTotalDiscount] = useState(0.00);


    let [loss, setLoss] = useState(0.00);

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
        } else if (field === "status") {
            setSelectedStatusList(values);
        } else if (field === "payment_status") {
            setSelectedPaymentStatusList(values);
        }else if (field === "payment_methods") {
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
            "select=id,code,date,net_total,total_payment_received,payments_count,payment_methods,balance_amount,discount_percent,discount,created_by_name,customer_name,status,payment_status,payment_method,created_at,loss,net_profit,store_id,total";

        if (cookies.get("store_id")) {
            searchParams.store_id = cookies.get("store_id");
        }

        const d = new Date();
        let diff = d.getTimezoneOffset();
        console.log("Timezone:", parseFloat(diff / 60));
        searchParams["timezone_offset"] = parseFloat(diff / 60);

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

                totalSales = data.meta.total_sales;
                setTotalSales(totalSales);

                netProfit = data.meta.net_profit;
                setNetProfit(netProfit);

                loss = data.meta.loss;
                setLoss(loss);

                vatPrice = data.meta.vat_price;
                setVatPrice(vatPrice);

                totalShippingHandlingFees = data.meta.shipping_handling_fees;
                setTotalShippingHandlingFees(totalShippingHandlingFees);

                totalDiscount = data.meta.discount;
                setTotalDiscount(totalDiscount);

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


    const DetailsViewRef = useRef();
    function openDetailsView(id) {
        DetailsViewRef.current.open(id);
    }

    const SalesReturnCreateRef = useRef();
    function openSalesReturnForm(id) {
        SalesReturnCreateRef.current.open(id);
    }

    const CreateFormRef = useRef();
    function openCreateForm() {
        CreateFormRef.current.open();
    }

    function openUpdateForm(id) {
        CreateFormRef.current.open(id);
    }

    //Cash Discounts
    const SalesCashDiscountCreateRef = useRef();
    function openSalesCashDiscountCreateForm(order) {
        SalesCashDiscountCreateRef.current.open(undefined, order);
    }

    const SalesCashDiscountDetailsViewRef = useRef();
    function openSalesCashDiscountDetailsView(id) {
        SalesCashDiscountDetailsViewRef.current.open(id);
    }

    function openSalesCashDiscountUpdateForm(id) {
        SalesCashDiscountCreateRef.current.open(id);
    }

    //Sales Payments
    const SalesPaymentCreateRef = useRef();
    function openSalesPaymentCreateForm(order) {
        SalesPaymentCreateRef.current.open(undefined, order);
    }

    const SalesPaymentDetailsViewRef = useRef();
    function openSalesPaymentDetailsView(id) {
        SalesPaymentDetailsViewRef.current.open(id);
    }

    function openSalesPaymentUpdateForm(id) {
        SalesPaymentCreateRef.current.open(id);
    }


    return (
        <>
            <OrderCreate ref={CreateFormRef} refreshList={list} showToastMessage={props.showToastMessage} openCreateForm={openCreateForm} />
            <OrderView ref={DetailsViewRef} openCreateForm={openCreateForm} />
            <SalesReturnCreate ref={SalesReturnCreateRef} showToastMessage={props.showToastMessage} />

            <SalesCashDiscountCreate ref={SalesCashDiscountCreateRef} showToastMessage={props.showToastMessage} openDetailsView={openSalesCashDiscountDetailsView} />
            <SalesCashDiscountDetailsView ref={SalesCashDiscountDetailsViewRef} openUpdateForm={openSalesCashDiscountUpdateForm} showToastMessage={props.showToastMessage} />


            <SalesPaymentCreate ref={SalesPaymentCreateRef} showToastMessage={props.showToastMessage} openDetailsView={openSalesPaymentDetailsView} refreshSalesList={list} />
            <SalesPaymentDetailsView ref={SalesPaymentDetailsViewRef} openUpdateForm={openSalesPaymentUpdateForm} showToastMessage={props.showToastMessage} />

            <div className="container-fluid p-0">
                <div className="row">
                    <div className="col">
                        <h1 className="text-end">
                            Sales: <Badge bg="secondary">
                                <NumberFormat
                                    value={totalSales}
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
                            VAT Collected: <Badge bg="secondary">
                                <NumberFormat
                                    value={vatPrice.toFixed(2)}
                                    displayType={"text"}
                                    thousandSeparator={true}
                                    suffix={" SAR"}
                                    renderText={(value, props) => value}
                                />
                            </Badge>
                        </h1>

                        {cookies.get('admin') === "true" ? <h1 className="text-end">
                            Net Profit: <Badge bg="secondary">
                                <NumberFormat
                                    value={netProfit}
                                    displayType={"text"}
                                    thousandSeparator={true}
                                    suffix={" SAR"}
                                    renderText={(value, props) => value}
                                />
                            </Badge>
                        </h1> : ""}
                        {cookies.get('admin') === "true" ? <h1 className="text-end">
                            Loss: <Badge bg="secondary">
                                <NumberFormat
                                    value={loss}
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
                        <h1 className="h3">Sales Orders</h1>
                    </div>


                    <div className="col text-end">

                        <ExcelFile filename={salesReportFileName} element={excelData.length > 0 ? <Button variant="success" className="btn btn-primary mb-3 success" >Download Sales Report</Button> : ""}>
                            <ExcelSheet dataSet={excelData} name={salesReportFileName} />
                        </ExcelFile>

                        {excelData.length == 0 ? <Button variant="primary" className="btn btn-primary mb-3" onClick={getAllOrders} >{fettingAllRecordsInProgress ? "Preparing.." : "Sales Report"}</Button> : ""}
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
                                                </select>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <br />
                                <div className="row">
                                    <div className="col" style={{ border: "solid 0px",width:"100%" }}>
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
                                                        Payment Received
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
                                                            sort("discount_percent");
                                                        }}
                                                    >
                                                        Discount %
                                                        {sortField === "discount_percent" && sortOrder === "-" ? (
                                                            <i className="bi bi-sort-numeric-down"></i>
                                                        ) : null}
                                                        {sortField === "discount_percent" && sortOrder === "" ? (
                                                            <i className="bi bi-sort-numeric-up"></i>
                                                        ) : null}
                                                    </b>
                                                </th>
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
                                                            sort("loss");
                                                        }}
                                                    >
                                                        Loss
                                                        {sortField === "loss" && sortOrder === "-" ? (
                                                            <i className="bi bi-sort-numeric-down"></i>
                                                        ) : null}
                                                        {sortField === "loss" && sortOrder === "" ? (
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
                                                    <input
                                                        type="text"
                                                        id="payments_count"
                                                        onChange={(e) =>
                                                            searchByFieldValue("payments_count", e.target.value)
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
                                                        id="discount_percent"
                                                        onChange={(e) =>
                                                            searchByFieldValue("discount_percent", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
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
                                                        id="loss"
                                                        onChange={(e) =>
                                                            searchByFieldValue("loss", e.target.value)
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
                                                        id="customer_id"
                                                        labelKey="search_label"
                                                        onChange={(selectedItems) => {
                                                            searchByMultipleValuesField(
                                                                "customer_id",
                                                                selectedItems
                                                            );
                                                        }}
                                                        options={customerOptions}
                                                        placeholder="name or mob"
                                                        selected={selectedCustomers}
                                                        highlightOnlyResult={true}
                                                        onInputChange={(searchTerm, e) => {
                                                            suggestCustomers(searchTerm);
                                                        }}
                                                        multiple
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
                                                    <DatePicker
                                                        id="created_at"
                                                        value={createdAtValue}
                                                        selected={selectedDate}
                                                        className="form-control"
                                                        dateFormat="MMM dd yyyy"
                                                        onChange={(date) => {
                                                            if (!date) {
                                                                //  createdAtValue = "";
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
                                                orderList.map((order) => (
                                                    <tr key={order.code}>
                                                        <td>{order.code}</td>
                                                        <td>
                                                            {format(new Date(order.date), "MMM dd yyyy h:mma")}
                                                        </td>
                                                        <td>{order.net_total?.toFixed(2)}</td>
                                                        <td>{order.total_payment_received?.toFixed(2)}</td>
                                                        <td>{order.balance_amount?.toFixed(2)}</td>
                                                        <td>{order.payments_count}</td>
                                                        <td>{order.discount.toFixed(2)} SAR</td>
                                                        <td>{order.discount_percent.toFixed(2)} %</td>
                                                        {cookies.get('admin') === "true" ? <td>{order.net_profit.toFixed(2)} SAR</td> : ""}
                                                        {cookies.get('admin') === "true" ? <td>{order.loss ? order.loss.toFixed(2) : 0.00} SAR</td> : ""}
                                                        <td>{order.created_by_name}</td>
                                                        <td>{order.customer_name}</td>
                                                        <td>
                                                            {order.payment_status == "paid" ?
                                                                <span className="badge bg-success">
                                                                    Paid
                                                                </span> : ""}
                                                            {order.payment_status == "paid_partially" ?
                                                                <span className="badge bg-warning">
                                                                    Paid Partially
                                                                </span> : ""}
                                                            {order.payment_status == "not_paid" ?
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
                                                        <td>
                                                            {format(
                                                                new Date(order.created_at),
                                                                "MMM dd yyyy h:mma"
                                                            )}
                                                        </td>
                                                        {/*
                                                        <td>
                                                            <span className="badge bg-success">
                                                                {order.status}
                                                            </span>
                                                            </td>*/}

                                                        <td>
                                                            {/*
                                                        <OrderUpdate id={order.id} showUpdateButton={{true}} refreshList={list} showToastMessage={props.showToastMessage} />
                                                          <OrderView id={order.id} showViewButton={{true}} show={false} />
                                                        */}

                                                            <Button className="btn btn-light btn-sm" onClick={() => {
                                                                openUpdateForm(order.id);
                                                            }}>
                                                                <i className="bi bi-pencil"></i>
                                                            </Button>


                                                            <Button className="btn btn-primary btn-sm" onClick={() => {
                                                                openDetailsView(order.id);
                                                            }}>
                                                                <i className="bi bi-eye"></i>
                                                            </Button>
                                                            <button
                                                                className="btn btn-dark btn-sm"
                                                                data-bs-toggle="tooltip"
                                                                data-bs-placement="top"
                                                                title="Create Sales Return"
                                                                onClick={() => {
                                                                    openSalesReturnForm(order.id);
                                                                }}
                                                            >
                                                                <i className="bi bi-arrow-left"></i> Return
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
                                                                        openSalesCashDiscountCreateForm(order);
                                                                    }}>
                                                                        <i className="bi bi-plus"></i>
                                                                        &nbsp;
                                                                        Add Cash Discount
                                                                    </button>
                                                                </li>
                                                                <li>
                                                                    <button className="dropdown-item" onClick={() => {
                                                                        openSalesPaymentCreateForm(order);
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
});

export default OrderIndex;
