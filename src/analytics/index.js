import React, { useState, useEffect, useRef, forwardRef } from "react";
import Cookies from "universal-cookie";
import AllSales from "./sales/allSales";
import HourlySales from "./sales/hourlySales";
import DailySales from "./sales/dailySales";
import MonthlySales from "./sales/monthlySales";
import YearlySales from "./sales/yearlySales";
import Calendar from "./sales/calendar";



const Analytics = forwardRef((props, ref) => {
    const cookies = new Cookies();
    let [allOrders, setAllOrders] = useState([]);
    let [allExpenses, setAllExpenses] = useState([]);
    let [allPurchases, setAllPurchases] = useState([]);
    let [allSalesReturns, setAllSalesReturns] = useState([]);
    let [allPurchaseReturns, setAllPurchaseReturns] = useState([]);


    const [searchParams, setSearchParams] = useState({});
    let [fettingAllRecordsInProgress, setFettingAllRecordsInProgress] = useState(false);
    let [sortField, setSortField] = useState("created_at");
    let [sortOrder, setSortOrder] = useState("-");
    const [isListLoading, setIsListLoading] = useState(false);

    function ObjectToSearchQueryParams(object) {
        return Object.keys(object)
            .map(function (key) {
                return `search[${key}]=${object[key]}`;
            })
            .join("&");
    }


    async function getAllRecords(model, fields) {
        const requestOptions = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: cookies.get("access_token"),
            },
        };
        let Select = fields;


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

        let size = 1000;

        let records = [];
        var pageNo = 1;

        for (; true;) {
            fettingAllRecordsInProgress = true;
            setFettingAllRecordsInProgress(true);
            let res = await fetch(
                "/v1/" + model + "?" +
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
            records = records.concat(res);
            pageNo++;
        }
        fettingAllRecordsInProgress = false;
        setFettingAllRecordsInProgress(false);

        return records;
    }

    useEffect(async () => {
        let fields = "select=id,code,date,total,net_total,net_profit,loss,shipping_handling_fees,discount_percent,discount,products,customer_name,created_at,vat_price,customer_id,customer.id,customer.vat_no";
        let orders = await getAllRecords("order", fields);
        fields = "select=id,code,date,amount,description,category_name,created_by_name,created_at";
        let expenses = await getAllRecords("expense", fields);

        fields = "select=id,code,date,net_total,discount,vat_price,total,store_id,created_by_name,vendor_name,vendor_invoice_no,status,created_at,updated_at,net_retail_profit,net_wholesale_profit";
        let purchases = await getAllRecords("purchase", fields);

        fields = "select=id,code,date,net_total,created_by_name,customer_name,status,created_at,profit,loss,order_code";
        let salesReturns = await getAllRecords("sales-return", fields);

        fields = "select=id,code,purchase_code,purchase_id,date,net_total,created_by_name,vendor_name,vendor_invoice_no,status,created_at";
        let purchaseReturns = await getAllRecords("purchase-return", fields);


        allOrders = orders;
        setAllOrders(orders);
        // console.log("allOrders:", allOrders);

        allExpenses = expenses;
        setAllExpenses(expenses);
        // console.log("allExpenses:", allExpenses);

        allPurchases = purchases;
        setAllPurchases(purchases);
        // console.log("allPurchases:", allPurchases);

        allSalesReturns = salesReturns;
        setAllSalesReturns(salesReturns);
        console.log("allSalesReturns:", allSalesReturns);

        allPurchaseReturns = purchaseReturns;
        setAllPurchaseReturns(purchaseReturns);
        console.log("allPurchaseReturns:", allPurchaseReturns);

        initAllGraph();
        initHourlyGraph();
        initDailyGraph();
        initMonthlyGraph();
        initYearlyGraph();
        initCalendarGraph();

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);




    const AllGraphRef = useRef();
    async function initAllGraph() {
        if (AllGraphRef.current) {
            AllGraphRef.current.init();
        }
    }

    const HourlyGraphRef = useRef();
    async function initHourlyGraph() {
        if (HourlyGraphRef.current) {
            HourlyGraphRef.current.init();
        }

    }

    const DailyGraphRef = useRef();
    async function initDailyGraph() {
        if (DailyGraphRef.current) {
            DailyGraphRef.current.init();
        }

    }

    const MonthlyGraphRef = useRef();
    async function initMonthlyGraph() {
        if (MonthlyGraphRef.current) {
            MonthlyGraphRef.current.init();
        }
    }

    const YearlyGraphRef = useRef();
    async function initYearlyGraph() {
        if (YearlyGraphRef.current) {
            YearlyGraphRef.current.init();
        }
    }

    const CalendarRef = useRef();
    async function initCalendarGraph() {
        if (CalendarRef.current) {
            CalendarRef.current.init();
        }
    }

    let [columns, setColumns] = useState({
        all: { sales: true, salesProfit: false, expense: false, purchase: false, salesReturn: false, purchaseReturn: false, loss: false },
        hourly: { sales: true, salesProfit: false, expense: false, purchase: false, salesReturn: false, purchaseReturn: false, loss: false },
        daily: { sales: true, salesProfit: false, expense: false, purchase: false, salesReturn: false, purchaseReturn: false, loss: false },
        monthly: { sales: true, salesProfit: false, expense: false, purchase: false, salesReturn: false, purchaseReturn: false, loss: false },
        yearly: { sales: true, salesProfit: false, expense: false, purchase: false, salesReturn: false, purchaseReturn: false, loss: false },
    });


    return (
        <>
            <h2>
                <input type="checkbox" checked={columns.all.sales} onChange={(e) => {
                    columns.all.sales = !columns.all.sales;
                    setColumns({ ...columns });
                    initAllGraph();

                }} />Sales vs &nbsp;
                <input type="checkbox" checked={columns.all.salesProfit} onChange={(e) => {
                    columns.all.salesProfit = !columns.all.salesProfit;
                    setColumns({ ...columns });
                    initAllGraph();

                }} />Sales Profit vs &nbsp;
                <input type="checkbox" checked={columns.all.expense} onChange={(e) => {
                    columns.all.expense = !columns.all.expense;
                    setColumns({ ...columns });
                    initAllGraph();

                }} />Expense vs &nbsp;
                <input type="checkbox" checked={columns.all.purchase} onChange={(e) => {
                    columns.all.purchase = !columns.all.purchase;
                    setColumns({ ...columns });
                    initAllGraph();

                }} />Purchase vs &nbsp;
                <input type="checkbox" checked={columns.all.salesReturn} onChange={(e) => {
                    columns.all.salesReturn = !columns.all.salesReturn;
                    setColumns({ ...columns });
                    initAllGraph();

                }} />Sales Return vs &nbsp;
                <input type="checkbox" checked={columns.all.purchaseReturn} onChange={(e) => {
                    columns.all.purchaseReturn = !columns.all.purchaseReturn;
                    setColumns({ ...columns });
                    initAllGraph();

                }} />Purchase Return vs &nbsp;
                <input type="checkbox" checked={columns.all.loss} onChange={(e) => {
                    columns.all.loss = !columns.all.loss;
                    setColumns({ ...columns });
                    initAllGraph();

                }} />Loss
            </h2>
            <AllSales ref={AllGraphRef}
                allOrders={allOrders}
                allExpenses={allExpenses}
                allPurchases={allPurchases}
                allSalesReturns={allSalesReturns}
                allPurchaseReturns={allPurchaseReturns}
                columns={columns.all}
            />
            <hr />
            <h2>Hourly &nbsp;
                <input type="checkbox" checked={columns.hourly.sales} onChange={(e) => {
                    columns.hourly.sales = !columns.hourly.sales;
                    setColumns({ ...columns });
                    initHourlyGraph();

                }} />Sales vs &nbsp;
                <input type="checkbox" checked={columns.hourly.salesProfit} onChange={(e) => {
                    columns.hourly.salesProfit = !columns.hourly.salesProfit;
                    setColumns({ ...columns });
                    initHourlyGraph();

                }} />Sales Profit vs &nbsp;
                <input type="checkbox" checked={columns.hourly.expense} onChange={(e) => {
                    columns.hourly.expense = !columns.hourly.expense;
                    setColumns({ ...columns });
                    initHourlyGraph();

                }} />Expense vs &nbsp;
                <input type="checkbox" checked={columns.hourly.purchase} onChange={(e) => {
                    columns.hourly.purchase = !columns.hourly.purchase;
                    setColumns({ ...columns });
                    initHourlyGraph();

                }} />Purchase vs &nbsp;
                <input type="checkbox" checked={columns.hourly.salesReturn} onChange={(e) => {
                    columns.hourly.salesReturn = !columns.hourly.salesReturn;
                    setColumns({ ...columns });
                    initHourlyGraph();

                }} />Sales Return vs &nbsp;
                <input type="checkbox" checked={columns.hourly.purchaseReturn} onChange={(e) => {
                    columns.hourly.purchaseReturn = !columns.hourly.purchaseReturn;
                    setColumns({ ...columns });
                    initHourlyGraph();

                }} />Purchase Return vs &nbsp;
                <input type="checkbox" checked={columns.hourly.loss} onChange={(e) => {
                    columns.hourly.loss = !columns.hourly.loss;
                    setColumns({ ...columns });
                    initHourlyGraph();

                }} />Loss
            </h2>
            <HourlySales ref={HourlyGraphRef}
                allOrders={allOrders}
                allExpenses={allExpenses}
                allPurchases={allPurchases}
                allSalesReturns={allSalesReturns}
                allPurchaseReturns={allPurchaseReturns}
                columns={columns.hourly}
            />
            <hr />
            <h2>Daily &nbsp;
                <input type="checkbox" checked={columns.daily.sales} onChange={(e) => {
                    columns.daily.sales = !columns.daily.sales;
                    setColumns({ ...columns });
                    initDailyGraph();

                }} />Sales vs &nbsp;
                <input type="checkbox" checked={columns.daily.salesProfit} onChange={(e) => {
                    columns.daily.salesProfit = !columns.daily.salesProfit;
                    setColumns({ ...columns });
                    initDailyGraph();

                }} />Sales Profit vs &nbsp;
                <input type="checkbox" checked={columns.daily.expense} onChange={(e) => {
                    columns.daily.expense = !columns.daily.expense;
                    setColumns({ ...columns });
                    initDailyGraph();

                }} />Expense vs &nbsp;
                <input type="checkbox" checked={columns.daily.purchase} onChange={(e) => {
                    columns.daily.purchase = !columns.daily.purchase;
                    setColumns({ ...columns });
                    initDailyGraph();

                }} />Purchase vs &nbsp;
                <input type="checkbox" checked={columns.daily.salesReturn} onChange={(e) => {
                    columns.daily.salesReturn = !columns.daily.salesReturn;
                    setColumns({ ...columns });
                    initDailyGraph();

                }} />Sales Return vs &nbsp;
                <input type="checkbox" checked={columns.daily.purchaseReturn} onChange={(e) => {
                    columns.daily.purchaseReturn = !columns.daily.purchaseReturn;
                    setColumns({ ...columns });
                    initDailyGraph();

                }} />Purchase Return vs &nbsp;
                <input type="checkbox" checked={columns.daily.loss} onChange={(e) => {
                    columns.daily.loss = !columns.daily.loss;
                    setColumns({ ...columns });
                    initDailyGraph();

                }} />Loss
            </h2>
            <DailySales ref={DailyGraphRef}
                allOrders={allOrders}
                allExpenses={allExpenses}
                allPurchases={allPurchases}
                allSalesReturns={allSalesReturns}
                allPurchaseReturns={allPurchaseReturns}
                columns={columns.daily}
            />
            <hr />
            <h2>Monthly &nbsp;
                <input type="checkbox" checked={columns.monthly.sales} onChange={(e) => {
                    columns.monthly.sales = !columns.monthly.sales;
                    setColumns({ ...columns });
                    initMonthlyGraph();

                }} />Sales vs &nbsp;
                <input type="checkbox" checked={columns.monthly.salesProfit} onChange={(e) => {
                    columns.monthly.salesProfit = !columns.monthly.salesProfit;
                    setColumns({ ...columns });
                    initMonthlyGraph();

                }} />Sales Profit vs &nbsp;
                <input type="checkbox" checked={columns.monthly.expense} onChange={(e) => {
                    columns.monthly.expense = !columns.monthly.expense;
                    setColumns({ ...columns });
                    initMonthlyGraph();

                }} />Expense vs &nbsp;
                <input type="checkbox" checked={columns.monthly.purchase} onChange={(e) => {
                    columns.monthly.purchase = !columns.monthly.purchase;
                    setColumns({ ...columns });
                    initMonthlyGraph();

                }} />Purchase vs &nbsp;
                <input type="checkbox" checked={columns.monthly.salesReturn} onChange={(e) => {
                    columns.monthly.salesReturn = !columns.monthly.salesReturn;
                    setColumns({ ...columns });
                    initMonthlyGraph();

                }} />Sales Return vs &nbsp;
                <input type="checkbox" checked={columns.monthly.purchaseReturn} onChange={(e) => {
                    columns.monthly.purchaseReturn = !columns.monthly.purchaseReturn;
                    setColumns({ ...columns });
                    initMonthlyGraph();

                }} />Purchase Return vs &nbsp;
                <input type="checkbox" checked={columns.monthly.loss} onChange={(e) => {
                    columns.monthly.loss = !columns.monthly.loss;
                    setColumns({ ...columns });
                    initMonthlyGraph();

                }} />Loss

            </h2>
            <MonthlySales ref={MonthlyGraphRef}
                allOrders={allOrders}
                allExpenses={allExpenses}
                allPurchases={allPurchases}
                allSalesReturns={allSalesReturns}
                allPurchaseReturns={allPurchaseReturns}
                columns={columns.monthly}
            />
            <hr />
            <h2>Yearly &nbsp;
                <input type="checkbox" checked={columns.yearly.sales} onChange={(e) => {
                    columns.yearly.sales = !columns.yearly.sales;
                    setColumns({ ...columns });
                    initYearlyGraph();

                }} />Sales vs &nbsp;
                <input type="checkbox" checked={columns.yearly.salesProfit} onChange={(e) => {
                    columns.yearly.salesProfit = !columns.yearly.salesProfit;
                    setColumns({ ...columns });
                    initYearlyGraph();

                }} />Sales Profit vs &nbsp;
                <input type="checkbox" checked={columns.yearly.expense} onChange={(e) => {
                    columns.yearly.expense = !columns.yearly.expense;
                    setColumns({ ...columns });
                    initYearlyGraph();

                }} />Expense vs &nbsp;
                <input type="checkbox" checked={columns.yearly.purchase} onChange={(e) => {
                    columns.yearly.purchase = !columns.yearly.purchase;
                    setColumns({ ...columns });
                    initYearlyGraph();

                }} />Purchase vs &nbsp;
                <input type="checkbox" checked={columns.yearly.salesReturn} onChange={(e) => {
                    columns.yearly.salesReturn = !columns.yearly.salesReturn;
                    setColumns({ ...columns });
                    initYearlyGraph();

                }} />Sales Return vs &nbsp;
                <input type="checkbox" checked={columns.yearly.purchaseReturn} onChange={(e) => {
                    columns.yearly.purchaseReturn = !columns.yearly.purchaseReturn;
                    setColumns({ ...columns });
                    initYearlyGraph();

                }} />Purchase Return vs &nbsp;
                <input type="checkbox" checked={columns.yearly.loss} onChange={(e) => {
                    columns.yearly.loss = !columns.yearly.loss;
                    setColumns({ ...columns });
                    initYearlyGraph();

                }} />Loss
            </h2>
            <YearlySales ref={YearlyGraphRef}
                allOrders={allOrders}
                allExpenses={allExpenses}
                allPurchases={allPurchases}
                allSalesReturns={allSalesReturns}
                allPurchaseReturns={allPurchaseReturns}
                columns={columns.yearly}
            />
            <hr />
            <Calendar ref={CalendarRef}
                allOrders={allOrders}
                allExpenses={allExpenses}
                allPurchases={allPurchases}
                allSalesReturns={allSalesReturns}
                allPurchaseReturns={allPurchaseReturns}
            />
        </>
    );
});

export default Analytics;
