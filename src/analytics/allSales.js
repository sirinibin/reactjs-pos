import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import Cookies from "universal-cookie";
import { Chart } from "react-google-charts";



const AllSales = forwardRef((props, ref) => {
    const cookies = new Cookies();
    useImperativeHandle(ref, () => ({
        init() {
            if (props.allOrders.length > 0) {
                makeAllSalesData();
            }
        }
    }));




    let [allSales, setAllSales] = useState([]);
    let [calendarAllSales, setCalendarAllSales] = useState([]);
    let [allSalesSelectedDate, setAllSalesSelectedDate] = useState(new Date().getDate());
    let [allSalesSelectedMonth, setAllSalesSelectedMonth] = useState(new Date().getMonth() + 1);
    let [allSalesSelectedYear, setAllSalesSelectedYear] = useState(new Date().getFullYear());


    function daysInMonth(month, year) {
        return new Date(year, month, 0).getDate();
    }



    function makeAllSalesData() {
        let data = [
            [
                { type: "datetime", label: "Time" },
                { type: "number", label: "Sales" },
                { type: "number", label: "Sales Profit" },
                { type: "number", label: "Loss" },
                // { type: "string", label: "Customer" },
            ],
        ];

        let calendarData = [
            [
                { type: "date", id: "Date" },
                { type: "number", id: "Sales" },
            ],
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
        let dtStrCpy = "";

        let totalSales = [];

        for (const sale of props.allOrders) {
            data.push([
                new Date(sale.created_at),
                parseFloat(sale.net_total.toFixed(2)),
                parseFloat(sale.net_profit.toFixed(2)),
                parseFloat(sale.loss.toFixed(2)),
                // sale.customer_name,
            ]);

            let dt = new Date(sale.created_at);
            let dtStr = dt.getFullYear() + "-" + dt.getMonth() + "-" + dt.getDate();
            if (!totalSales[dtStr]) {
                totalSales[dtStr] = 0;
            }
            totalSales[dtStr] += parseFloat(sale.net_total);
        }


        for (let saleDate in totalSales) {
            let parts = saleDate.split('-');
            calendarData.push([
                new Date(parts[0], parts[1], parts[2]),
                parseFloat(totalSales[saleDate].toFixed(2)),
            ]);
        }

        console.log("calendarData:", calendarData);


        allSales = data;
        setAllSales(data);

        calendarAllSales = calendarData
        setCalendarAllSales(calendarData);
    }

    const [data, setData] = useState([
        [{ type: "datetime", label: "Time" }, "Sales", "Sales Profit", "Loss"],
    ]);

    const [options, setOptions] = useState({
        title: 'Sales',
        displayExactValues: true,
        // displayAnnotationsFilter: true,
        subtitle: '(SAR)',
        legend: { position: 'bottom' },
        hAxis: {
            title: "Time",
        },
        vAxis: {
            title: "Amount(SAR)",
        },
        series: {
            // 0: { curveType: "function", axis: 'Temps' },
            // 1: { curveType: "function", axis: 'Daylight' },
        },
    });

    const [calendarOptions, setCalendarOptions] = useState({
        title: '',
        /*
        subtitle: '(SAR)',
        legend: { position: 'bottom' },
        hAxis: {
            title: "Date",
        },
        vAxis: {
            title: "Amount(SAR)",
        },
        series: {
            // 0: { curveType: "function", axis: 'Temps' },
            // 1: { curveType: "function", axis: 'Daylight' },
        },
        */
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
                        chartType="AnnotationChart"
                        width="100%"
                        height="400px"
                        data={allSales}
                        options={options}
                    /> : ""}
                    {calendarAllSales && calendarAllSales.length > 0 ? <Chart
                        chartType="Calendar"
                        width="100%"
                        height="400px"
                        data={calendarAllSales}
                        options={calendarOptions}
                    /> : ""}
                </div>
            </div>
        </>
    );
});

export default AllSales;
