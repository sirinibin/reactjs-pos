import React, { useState, useEffect, useRef, forwardRef } from "react";
import Cookies from "universal-cookie";
import AllSales from "./allSales";
import HourlySales from "./hourlySales";
import DailySales from "./dailySales";
import MonthlySales from "./monthlySales";
import YearlySales from "./yearlySales";



const Analytics = forwardRef((props, ref) => {
    const cookies = new Cookies();
    let [allOrders, setAllOrders] = useState([]);
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


    async function getAllOrders() {
        const requestOptions = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: cookies.get("access_token"),
            },
        };
        let Select =
            "select=id,code,date,total,net_total,net_profit,loss,shipping_handling_fees,discount_percent,discount,products,customer_name,created_at,vat_price,customer_id,customer.id,customer.vat_no";

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

        //makeSalesReportFilename();

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
        //prepareExcelData();
        fettingAllRecordsInProgress = false;
        setFettingAllRecordsInProgress(false);
        initAllSalesGraph();
        initHourlySalesGraph();
        initDailySalesGraph();
        initMonthlySalesGraph();
        initYearlySalesGraph();

    }




    useEffect(() => {
        getAllOrders();

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);


    const HourlySalesRef = useRef();
    function initHourlySalesGraph() {
        if (HourlySalesRef.current) {
            HourlySalesRef.current.init();
        }

    }

    const AllSalesRef = useRef();
    function initAllSalesGraph() {
        AllSalesRef.current.init();
    }

    const DailySalesRef = useRef();
    function initDailySalesGraph() {
        DailySalesRef.current.init();
    }

    const MonthlySalesRef = useRef();
    function initMonthlySalesGraph() {
        MonthlySalesRef.current.init();
    }

    const YearlySalesRef = useRef();
    function initYearlySalesGraph() {
        YearlySalesRef.current.init();
    }


    return (
        <>
            <AllSales ref={AllSalesRef} allOrders={allOrders} />
            <hr />
            <HourlySales ref={HourlySalesRef} allOrders={allOrders} />
            <hr />
            <DailySales ref={DailySalesRef} allOrders={allOrders} />
            <hr />
            <MonthlySales ref={MonthlySalesRef} allOrders={allOrders} />
            <hr />
            <YearlySales ref={YearlySalesRef} allOrders={allOrders} />
        </>
    );
});

export default Analytics;
