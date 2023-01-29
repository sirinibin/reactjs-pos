import React, { useState, useEffect, useRef, forwardRef } from "react";
import Cookies from "universal-cookie";
import AllSales from "./sales/allSales";
import HourlySales from "./sales/hourlySales";
import DailySales from "./sales/dailySales";
import MonthlySales from "./sales/monthlySales";
import YearlySales from "./sales/yearlySales";



const Analytics = forwardRef((props, ref) => {
    const cookies = new Cookies();
    let [allOrders, setAllOrders] = useState([]);
    let [allExpenses, setAllExpenses] = useState([]);
    let [allPurchases, setAllPurchases] = useState([]);
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


        allOrders = orders;
        setAllOrders(orders);
        console.log("allOrders:", allOrders);

        allExpenses = expenses;
        setAllExpenses(expenses);
        console.log("allExpenses:", allExpenses);

        allPurchases = purchases;
        setAllPurchases(purchases);
        console.log("allPurchases:", allPurchases);

        initAllSalesGraph();
        initHourlySalesGraph();
        initDailySalesGraph();
        initMonthlySalesGraph();
        initYearlySalesGraph();

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);


    const HourlySalesRef = useRef();
    async function initHourlySalesGraph() {
        if (HourlySalesRef.current) {
            HourlySalesRef.current.init();
        }

    }

    const AllSalesRef = useRef();
    async function initAllSalesGraph() {
        if (AllSalesRef.current) {
            AllSalesRef.current.init();
        }
    }

    const DailySalesRef = useRef();
    async function initDailySalesGraph() {
        if (DailySalesRef.current) {
            DailySalesRef.current.init();
        }

    }

    const MonthlySalesRef = useRef();
    async function initMonthlySalesGraph() {
        if (MonthlySalesRef.current) {
            MonthlySalesRef.current.init();
        }
    }

    const YearlySalesRef = useRef();
    async function initYearlySalesGraph() {
        if (YearlySalesRef.current) {
            YearlySalesRef.current.init();
        }
    }


    return (
        <>
            <AllSales ref={AllSalesRef} allOrders={allOrders} allExpenses={allExpenses} allPurchases={allPurchases} />
            <hr />
            <HourlySales ref={HourlySalesRef} allOrders={allOrders} allExpenses={allExpenses} allPurchases={allPurchases} />
            <hr />
            <DailySales ref={DailySalesRef} allOrders={allOrders} allExpenses={allExpenses} allPurchases={allPurchases} />
            <hr />
            <MonthlySales ref={MonthlySalesRef} allOrders={allOrders} allExpenses={allExpenses} allPurchases={allPurchases} />
            <hr />
            <YearlySales ref={YearlySalesRef} allOrders={allOrders} allExpenses={allExpenses} allPurchases={allPurchases} />
        </>
    );
});

export default Analytics;
