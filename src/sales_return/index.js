import React, { useState, useEffect, useRef } from "react";
import SalesReturnCreate from "./create.js";
import SalesReturnView from "./view.js";
import Cookies from "universal-cookie";
import { Typeahead } from "react-bootstrap-typeahead";
import { format } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Button, Spinner, Badge,Modal } from "react-bootstrap";
import ReactPaginate from "react-paginate";
import NumberFormat from "react-number-format";

import SalesReturnPaymentCreate from "./../sales_return_payment/create.js";
import SalesReturnPaymentDetailsView from "./../sales_return_payment/view.js";
import SalesReturnPaymentIndex from "./../sales_return_payment/index.js";


import ReactExport from 'react-data-export';
const ExcelFile = ReactExport.ExcelFile;
const ExcelSheet = ReactExport.ExcelFile.ExcelSheet;


function SalesReturnIndex(props) {
    const cookies = new Cookies();

    let [totalSalesReturn, setTotalSalesReturn] = useState(0.00);
    let [vatPrice, setVatPrice] = useState(0.00);
    let [totalDiscount, setTotalDiscount] = useState(0.00);
    let [totalPaidSalesReturn, setTotalPaidSalesReturn] = useState(0.00);
    let [totalUnPaidSalesReturn, setTotalUnPaidSalesReturn] = useState(0.00);
    let [totalCashSalesReturn, setTotalCashSalesReturn] = useState(0.00);
    let [totalBankAccountSalesReturn, setTotalBankAccountSalesReturn] = useState(0.00);

    //list
    const [salesreturnList, setSalesReturnList] = useState([]);

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

    useEffect(() => {
        list();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);


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
                { title: "Tax Amount", width: { wpx: 90 } },
                { title: "Net Amount", width: { wpx: 90 } },
            ],
            data: [],
        }];


        let totalAmount = 0;
        let totalTax = 0;

        let invoiceCount = 0;
        for (let returnDate in groupedByDate) {

            console.log("returnDate:", returnDate);
            excelData[0].data.push([{ value: "Inv Date: " + returnDate }]);
            let dayTotal = 0.00;
            let dayTax = 0.00;

            for (var i = 0; i < groupedByDate[returnDate].length > 0; i++) {
                invoiceCount++;
                let salesReturn = groupedByDate[returnDate][i];
                excelData[0].data.push([{ value: "Inv No (" + salesReturn.code + ") - " + invoiceCount + " [" + salesReturn.customer_name + "]" }]);

                if (!salesReturn.products) {
                    continue;
                }

                for (var j = 0; j < salesReturn.products.length; j++) {

                    let product = salesReturn.products[j];

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
                        value: "Discount",
                    }, {
                        value: salesReturn.discount.toFixed(2),
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
                        value: "Tax",
                    }, {
                        value: salesReturn.vat_price.toFixed(2),
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
                        value: "Total",
                    }, {
                        value: (salesReturn.total - salesReturn.discount).toFixed(2),
                    },
                ]);

                dayTotal += salesReturn.total - salesReturn.discount;
                dayTax += salesReturn.vat_price;

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
                    value: "Day Tax",
                }, {
                    value: dayTax.toFixed(2),
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
                    value: "Day Total",
                }, {
                    value: dayTotal.toFixed(2),
                },
            ]);

            totalAmount += dayTotal;
            totalTax += dayTax;


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
                value: "Total Tax",
            }, {
                value: totalTax.toFixed(2),
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
                value: "Total Amount",
            }, {
                value: totalAmount.toFixed(2),
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
                Authorization: cookies.get("access_token"),
            },
        };
        let Select =
            "select=id,code,date,total,net_total,discount_percent,discount,products,customer_name,created_at,vat_price,loss,net_profit";

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

    function searchByMultipleValuesField(field, values) {
        if (field === "created_by") {
            setSelectedCreatedByUsers(values);
        } else if (field === "customer_id") {
            setSelectedCustomers(values);
        } else if (field === "status") {
            setSelectedStatusList(values);
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
            "select=id,code,date,net_total,created_by_name,customer_name,status,created_at,net_profit,loss,order_code,order_id,total_payment_paid,payments_count,payment_methods,payment_status,balance_amount";
        if (cookies.get("store_id")) {
            searchParams.store_id = cookies.get("store_id");
        }

        const d = new Date();
        let diff = d.getTimezoneOffset();
        searchParams["timezone_offset"] = parseFloat(diff / 60);
        searchParams["stats"] = "1"

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

                totalSalesReturn = data.meta.total_sales_return;
                setTotalSalesReturn(totalSalesReturn);

                netProfit = data.meta.net_profit;
                setNetProfit(netProfit);

                loss = data.meta.loss;
                setLoss(loss);

                vatPrice = data.meta.vat_price;
                setVatPrice(vatPrice);

                totalDiscount = data.meta.discount;
                setTotalDiscount(totalDiscount);

                totalPaidSalesReturn = data.meta.paid_sales_return;
                setTotalPaidSalesReturn(totalPaidSalesReturn);

                totalUnPaidSalesReturn = data.meta.unpaid_sales_return;
                setTotalUnPaidSalesReturn(totalUnPaidSalesReturn);

                totalCashSalesReturn = data.meta.cash_sales_return;
                setTotalCashSalesReturn(totalCashSalesReturn);

                totalBankAccountSalesReturn = data.meta.bank_account_sales_return;
                setTotalBankAccountSalesReturn(totalBankAccountSalesReturn);

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
        sortSalesReturn = sortSalesReturn === "-" ? "" : "-";
        setSortSalesReturn(sortSalesReturn);
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

    const CreateFormRef = useRef();

    //Sales Return Payments
    const SalesReturnPaymentCreateRef = useRef();
    function openSalesReturnPaymentCreateForm(order) {
        SalesReturnPaymentCreateRef.current.open(undefined, order);
    }

    const SalesReturnPaymentDetailsViewRef = useRef();
    function openSalesReturnPaymentDetailsView(id) {
        SalesReturnPaymentDetailsViewRef.current.open(id);
    }

    function openSalesReturnPaymentUpdateForm(id) {
        SalesReturnPaymentCreateRef.current.open(id);
    }

    let [netProfit, setNetProfit] = useState(0.00);
    let [loss, setLoss] = useState(0.00);


    let [sortOrder, setSortOrder] = useState("-");
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
            name: "cash",
        },
        {
            id: "bank_account",
            name: "Bank Account / Debit / Credit card",
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

    const SalesReturnPaymentListRef = useRef();

    return (
        <>
            <SalesReturnCreate ref={CreateFormRef} refreshList={list} showToastMessage={props.showToastMessage} />
            <SalesReturnView ref={DetailsViewRef} />

            <SalesReturnPaymentCreate ref={SalesReturnPaymentCreateRef} showToastMessage={props.showToastMessage} openDetailsView={openSalesReturnPaymentDetailsView} />
            <SalesReturnPaymentDetailsView ref={SalesReturnPaymentDetailsViewRef} openUpdateForm={openSalesReturnPaymentUpdateForm} showToastMessage={props.showToastMessage} />

            <div className="container-fluid p-0">
                <div className="row">

                    <div className="col">
                        <h1 className="text-end">
                            Sales Return: <Badge bg="secondary">
                                <NumberFormat
                                    value={totalSalesReturn}
                                    displayType={"text"}
                                    thousandSeparator={true}
                                    suffix={" SAR"}
                                    renderText={(value, props) => value}
                                />
                            </Badge>
                        </h1>
                        <h1 className="text-end">
                            Paid Sales Return: <Badge bg="secondary">
                                <NumberFormat
                                    value={totalPaidSalesReturn.toFixed(2)}
                                    displayType={"text"}
                                    thousandSeparator={true}
                                    suffix={" SAR"}
                                    renderText={(value, props) => value}
                                />
                            </Badge>
                        </h1>
                        <h4 className="text-end">
                            Cash Sales Return: <Badge bg="secondary">
                                <NumberFormat
                                    value={totalCashSalesReturn.toFixed(2)}
                                    displayType={"text"}
                                    thousandSeparator={true}
                                    suffix={" SAR"}
                                    renderText={(value, props) => value}
                                />
                            </Badge>
                        </h4>
                        <h4 className="text-end">
                            Bank Account Sales Return: <Badge bg="secondary">
                                <NumberFormat
                                    value={totalBankAccountSalesReturn.toFixed(2)}
                                    displayType={"text"}
                                    thousandSeparator={true}
                                    suffix={" SAR"}
                                    renderText={(value, props) => value}
                                />
                            </Badge>
                        </h4>
                        <h1 className="text-end">
                            Credit Sales Return: <Badge bg="secondary">
                                <NumberFormat
                                    value={totalUnPaidSalesReturn.toFixed(2)}
                                    displayType={"text"}
                                    thousandSeparator={true}
                                    suffix={" SAR"}
                                    renderText={(value, props) => value}
                                />
                            </Badge>
                        </h1>
                        {cookies.get('admin') === "true" ? <h1 className="text-end">
                            Net Profit Return: <Badge bg="secondary">
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
                            Loss Return: <Badge bg="secondary">
                                <NumberFormat
                                    value={loss}
                                    displayType={"text"}
                                    thousandSeparator={true}
                                    suffix={" SAR"}
                                    renderText={(value, props) => value}
                                />
                            </Badge>
                        </h1> : ""}
                        <h1 className="text-end">
                            Discount Retun: <Badge bg="secondary">
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
                            VAT Return: <Badge bg="secondary">
                                <NumberFormat
                                    value={vatPrice.toFixed(2)}
                                    displayType={"text"}
                                    thousandSeparator={true}
                                    suffix={" SAR"}
                                    renderText={(value, props) => value}
                                />
                            </Badge>
                        </h1>
                    </div>

                </div>

                <div className="row">
                    <div className="col">
                        <h1 className="h3">Sales Returns</h1>
                    </div>

                    <div className="col text-end">
                        <ExcelFile filename={salesReturnReportFileName} element={excelData.length > 0 ? <Button variant="success" className="btn btn-primary mb-3 success" >Download Sales Return Report</Button> : ""}>
                            <ExcelSheet dataSet={excelData} name={salesReturnReportFileName} />
                        </ExcelFile>

                        {excelData.length == 0 ? <Button variant="primary" className="btn btn-primary mb-3" onClick={getAllSalesReturns} >{fettingAllRecordsInProgress ? "Preparing.." : "Sales Return Report"}</Button> : ""}
                        &nbsp;&nbsp;


                        {/*
                        <Button
                            hide={true}
                            variant="primary"
                            className="btn btn-primary mb-3"
                            onClick={openCreateForm}
                        >
                            <i className="bi bi-plus-lg"></i> Create
                        </Button>
                        */}
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
                                            <p className="text-start">No SalesReturns to display</p>
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
                                                            sort("order_code");
                                                        }}
                                                    >
                                                        Order ID
                                                        {sortField === "order_code" && sortSalesReturn === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "order_code" && sortSalesReturn === "" ? (
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
                                                        Payment Paid
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
                                                        {sortField === "net_profit" && sortSalesReturn === "-" ? (
                                                            <i className="bi bi-sort-numeric-down"></i>
                                                        ) : null}
                                                        {sortField === "net_profit" && sortSalesReturn === "" ? (
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
                                                        {sortField === "loss" && sortSalesReturn === "-" ? (
                                                            <i className="bi bi-sort-numeric-down"></i>
                                                        ) : null}
                                                        {sortField === "loss" && sortSalesReturn === "" ? (
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
                                                        {sortField === "created_at" && sortSalesReturn === "-" ? (
                                                            <i className="bi bi-sort-down"></i>
                                                        ) : null}
                                                        {sortField === "created_at" && sortSalesReturn === "" ? (
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
                                                        id="order_code"
                                                        onChange={(e) =>
                                                            searchByFieldValue("order_code", e.target.value)
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
                                                <th></th>
                                            </tr>
                                        </thead>

                                        <tbody className="text-center">
                                            {salesreturnList &&
                                                salesreturnList.map((salesreturn) => (
                                                    <tr key={salesreturn.code}>
                                                        <td>{salesreturn.code}</td>
                                                        <td>{salesreturn.order_code}</td>
                                                        <td>
                                                            {format(
                                                                new Date(salesreturn.date),
                                                                "MMM dd yyyy h:mma"
                                                            )}
                                                        </td>
                                                        <td>{salesreturn.net_total} SAR</td>
                                                        <td>
                                                            <Button variant="link" onClick={() => {
                                                                openPaymentsDialogue(salesreturn);
                                                            }}>
                                                                {salesreturn.total_payment_paid?.toFixed(2)}
                                                            </Button>
                                                        </td>
                                                        <td>{salesreturn.balance_amount?.toFixed(2)}</td>
                                                        <td>
                                                            <Button variant="link" onClick={() => {
                                                                openPaymentsDialogue(salesreturn);
                                                            }}>
                                                                {salesreturn.payments_count}
                                                            </Button>
                                                        </td>
                                                        {cookies.get('admin') === "true" ? <td>{salesreturn.net_profit.toFixed(2)} SAR</td> : ""}
                                                        {cookies.get('admin') === "true" ? <td>{salesreturn.loss ? salesreturn.loss.toFixed(2) : 0.00} SAR</td> : ""}
                                                        <td>{salesreturn.created_by_name}</td>
                                                        <td>{salesreturn.customer_name}</td>

                                                        <td>
                                                            {salesreturn.payment_status == "paid" ?
                                                                <span className="badge bg-success">
                                                                    Paid
                                                                </span> : ""}
                                                            {salesreturn.payment_status == "paid_partially" ?
                                                                <span className="badge bg-warning">
                                                                    Paid Partially
                                                                </span> : ""}
                                                            {salesreturn.payment_status == "not_paid" ?
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
                                                        <td>
                                                            {format(
                                                                new Date(salesreturn.created_at),
                                                                "MMM dd yyyy h:mma"
                                                            )}
                                                        </td>
                                                        <td>
                                                            {/*
                                                        <SalesReturnUpdate id={salesreturn.id} showUpdateButton={{true}} refreshList={list} showToastMessage={props.showToastMessage} />
                                                          <SalesReturnView id={salesreturn.id} showViewButton={{true}} show={false} />
                                                        */}

                                                            <Button className="btn btn-primary btn-sm" onClick={() => {
                                                                openDetailsView(salesreturn.id);
                                                            }}>
                                                                <i className="bi bi-eye"></i>
                                                            </Button>

                                                            <button
                                                                className="btn btn-outline-secondary dropdown-toggle"
                                                                type="button"
                                                                data-bs-toggle="dropdown"
                                                                aria-expanded="false"
                                                            ></button>
                                                            <ul className="dropdown-menu">
                                                                <li>
                                                                    <button className="dropdown-item" onClick={() => {
                                                                        openSalesReturnPaymentCreateForm(salesreturn);
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
