import React, { useState, useEffect, useRef, forwardRef } from "react";
import Cookies from "universal-cookie";
import { Chart } from "react-google-charts";



const Analytics = forwardRef((props, ref) => {
    const cookies = new Cookies();

    const [dailySales, setDailySales] = useState([]);
    let [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    let [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    function daysInMonth(month, year) {
        return new Date(year, month, 0).getDate();
    }

    function makeDailySalesData() {
        let data = [
            ["Day", "Sales"],
        ];
        let firstDay = 1;
        //selectedMonth = 1;
        //setSelectedMonth(1);
        console.log("selectedMonth:", selectedMonth);
        console.log("selectedYear:", selectedYear);
        let lastDay = daysInMonth(selectedMonth, selectedYear);
        console.log("lastDay:", lastDay);
        for (let day = 1; day <= lastDay; day++) {

            let sales = 0.00;
            for (const sale of allOrders) {
                // console.log("Sale Month:", new Date(sale.created_at).getMonth() + 1);
                // console.log("Sale Year:", new Date(sale.created_at).getFullYear());
                if ((new Date(sale.created_at).getMonth() + 1) == selectedMonth && new Date(sale.created_at).getFullYear() == selectedYear && new Date(sale.created_at).getDate() == day) {
                    sales += parseFloat(sale.net_total);
                }
            }

            data.push([day, parseFloat(sales.toFixed(2))]);
            sales = 0.00;

        }
        console.log(data);
    }

    const [data, setData] = useState([
        ["Day", "Sales"],
        [1, 10],
        [2, 23],
        [3, 17],
        [4, 18],
        [5, 9],
        [6, 11],
        [7, 27],
        [8, 27],
        [9, 27],
        [10, 27],
        [11, 27],
        [12, 27],
        [13, 27],
        [14, 27],
        [15, 27],
        [16, 27],
        [17, 27],
        [18, 27],
        [19, 27],
        [20, 27],
        [21, 27],
        [22, 27],
        [23, 27],
        [24, 27],
        [25, 27],
        [26, 27],
    ]);

    const [options, setOptions] = useState({
        title: 'Sales',
        subtitle: '(SAR)',
        legend: { position: 'bottom' },
        hAxis: {
            title: "Day",
        },
        vAxis: {
            title: "Amount",
        },
        series: {
            0: { curveType: "function", axis: 'Temps' },
            1: { curveType: "function", axis: 'Daylight' },
        },
    });



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
        makeDailySalesData();

    }




    useEffect(() => {
        getAllOrders();

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <>
            <div className="container-fluid p-0">
                <div className="row">
                    Analytics

                    <Chart
                        chartType="LineChart"
                        width="100%"
                        height="400px"
                        data={data}
                        options={options}
                    />
                </div>
            </div>
        </>
    );
});

export default Analytics;
