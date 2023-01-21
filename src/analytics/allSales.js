import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import Cookies from "universal-cookie";
import { Chart } from "react-google-charts";



const AllSales = forwardRef((props, ref) => {
    const cookies = new Cookies();
    useImperativeHandle(ref, () => ({
        init() {
            makeDateOptions();
            if (props.allOrders.length > 0) {
                makeAllSalesData();
            }
        }
    }));

    const [yearOptions, setYearOptions] = useState([
        {
            label: "2023",
            value: 2023,
        },
        {
            label: "2022",
            value: 2022,
        }
    ]);
    const [monthOptions, setMonthOptions] = useState([
        {
            label: "JAN",
            value: 1,
        },
        {
            label: "FEB",
            value: 2,
        },
        {
            label: "MAR",
            value: 3,
        },
        {
            label: "APR",
            value: 4,
        },
        {
            label: "MAY",
            value: 5,
        },
        {
            label: "JUN",
            value: 6,
        },
        {
            label: "JULY",
            value: 7,
        },
        {
            label: "AUG",
            value: 8,
        },
        {
            label: "SEP",
            value: 9,
        },
        {
            label: "OCT",
            value: 10,
        },
        {
            label: "NOV",
            value: 11,
        },
        {
            label: "DEC",
            value: 12,
        },
    ]);

    let [dateOptions, setDateOptions] = useState([]);



    let [allSales, setAllSales] = useState([]);
    let [allSalesSelectedDate, setAllSalesSelectedDate] = useState(new Date().getDate());
    let [allSalesSelectedMonth, setAllSalesSelectedMonth] = useState(new Date().getMonth() + 1);
    let [allSalesSelectedYear, setAllSalesSelectedYear] = useState(new Date().getFullYear());


    function daysInMonth(month, year) {
        return new Date(year, month, 0).getDate();
    }

    function makeDateOptions() {
        let days = daysInMonth(allSalesSelectedMonth, allSalesSelectedYear);
        let options = [];
        for (let i = 1; i <= days; i++) {
            options.push({
                label: i,
                value: i,
            });
        }

        dateOptions = options;
        setDateOptions(options);
    }

    function makeAllSalesData() {
        let data = [
            [{ type: "datetime", label: "Time" }, "Sales", "Sales Profit", "Loss"],
        ];
        let firstHour = 1;
        //selectedMonth = 1;
        //setSelectedMonth(1);
        console.log("selectedDate:", allSalesSelectedDate);
        console.log("selectedMonth:", allSalesSelectedMonth);
        console.log("selectedYear:", allSalesSelectedYear);
        let lastHour = 24;
        let am = true;
        let timeLabel = "";

        for (const sale of props.allOrders) {
            data.push([
                new Date(sale.created_at),
                parseFloat(sale.net_total.toFixed(2)),
                parseFloat(sale.net_profit.toFixed(2)),
                parseFloat(sale.loss.toFixed(2))
            ]);
        }
        allSales = data;
        setAllSales(data);
    }

    const [data, setData] = useState([
        [{ type: "datetime", label: "Time" }, "Sales", "Sales Profit", "Loss"],
    ]);

    const [options, setOptions] = useState({
        title: 'Sales',
        subtitle: '(SAR)',
        legend: { position: 'bottom' },
        hAxis: {
            title: "Time(Hrs)",
        },
        vAxis: {
            title: "Amount(SAR)",
        },
        series: {
            // 0: { curveType: "function", axis: 'Temps' },
            // 1: { curveType: "function", axis: 'Daylight' },
        },
    });





    useEffect(() => {
        // getAllOrders();

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <>
            <div className="container-fluid p-0">
                <h2>All Sales</h2>
                <div className="row">
                    {allSales && allSales.length > 0 ? <Chart
                        chartType="LineChart"
                        width="100%"
                        height="400px"
                        data={allSales}
                        options={options}
                    /> : ""}
                </div>
            </div>
        </>
    );
});

export default AllSales;
