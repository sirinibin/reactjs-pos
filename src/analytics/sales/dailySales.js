import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import Cookies from "universal-cookie";
import { Chart } from "react-google-charts";



const DailySales = forwardRef((props, ref) => {
    const cookies = new Cookies();
    useImperativeHandle(ref, () => ({
        init() {
            if (props.allOrders.length > 0) {
                makeDailySalesData();
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
        },
        {
            label: "2021",
            value: 2021,
        },
        {
            label: "2020",
            value: 2020,
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


    let [dailySales, setDailySales] = useState([]);
    let [dailySalesSelectedMonth, setDailySalesSelectedMonth] = useState(new Date().getMonth() + 1);
    let [dailySalesSelectedYear, setDailySalesSelectedYear] = useState(new Date().getFullYear());


    function daysInMonth(month, year) {
        return new Date(year, month, 0).getDate();
    }

    function makeDailySalesData() {
        let data = [
            ["Date", "Sales", "Sales Profit", "Expense", "Purchase", "Loss"],
        ];

        console.log("selectedMonth:", dailySalesSelectedMonth);
        console.log("selectedYear:", dailySalesSelectedYear);
        let lastDay = daysInMonth(dailySalesSelectedMonth, dailySalesSelectedYear);
        console.log("lastDay:", lastDay);
        for (let day = 1; day <= lastDay; day++) {

            let sales = 0.00;
            let profit = 0.00;
            let loss = 0.00;
            for (const sale of props.allOrders) {
                // console.log("Sale Month:", new Date(sale.created_at).getMonth() + 1);
                // console.log("Sale Year:", new Date(sale.created_at).getFullYear());
                if ((new Date(sale.created_at).getMonth() + 1) == dailySalesSelectedMonth && new Date(sale.created_at).getFullYear() == dailySalesSelectedYear && new Date(sale.created_at).getDate() == day) {
                    sales += parseFloat(sale.net_total);
                    profit += parseFloat(sale.net_profit);
                    loss += parseFloat(sale.loss);
                }
            }

            let totalExpense = 0.00;
            for (const expense of props.allExpenses) {
                if ((new Date(expense.date).getMonth() + 1) == dailySalesSelectedMonth &&
                    new Date(expense.date).getFullYear() == dailySalesSelectedYear &&
                    new Date(expense.date).getDate() == day) {
                    totalExpense += parseFloat(expense.amount);
                }
            }

            let totalPurchase = 0.00;
            for (const purchase of props.allPurchases) {
                if ((new Date(purchase.date).getMonth() + 1) == dailySalesSelectedMonth &&
                    new Date(purchase.date).getFullYear() == dailySalesSelectedYear &&
                    new Date(purchase.date).getDate() == day) {
                    totalPurchase += parseFloat(purchase.net_total);
                }
            }

            data.push([
                day,
                parseFloat(sales.toFixed(2)),
                parseFloat(profit.toFixed(2)),
                parseFloat(totalExpense.toFixed(2)),
                parseFloat(totalPurchase.toFixed(2)),
                parseFloat(loss.toFixed(2))
            ]);
        }
        dailySales = data;
        setDailySales(data);
    }

    const [data, setData] = useState([
        ["Date", "Sales", "Sales Profit", "Loss"],
    ]);

    const [calendarData, setCalendarData] = useState([
        { type: "date", id: "Date" },
        { type: "number", id: "Sales" },
    ]);

    const [options, setOptions] = useState({
        title: 'Daily Sales vs Sales Profit vs Expense vs Purchase',
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
    });


    useEffect(() => {
        // getAllOrders();

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <>
            <div className="container-fluid p-0">
                <h2>Daily Sales vs Sales Profit vs Expense vs Purchase</h2>
                <div className="row">

                    <div className="col-md-2">
                        <label className="form-label">Year</label>

                        <div className="input-group mb-3">
                            <select
                                value={dailySalesSelectedYear}
                                onChange={(e) => {
                                    if (!e.target.value) {
                                        return;
                                    }
                                    dailySalesSelectedYear = parseInt(e.target.value);
                                    setDailySalesSelectedYear(parseInt(e.target.value));
                                    makeDailySalesData();
                                }}
                                className="form-control"
                            >
                                {yearOptions.map((option) => (
                                    <option value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="col-md-2">
                        <label className="form-label">Month</label>

                        <div className="input-group mb-3">
                            <select
                                value={dailySalesSelectedMonth}
                                onChange={(e) => {
                                    if (!e.target.value) {
                                        return;
                                    }
                                    dailySalesSelectedMonth = parseInt(e.target.value);
                                    setDailySalesSelectedMonth(parseInt(e.target.value));
                                    makeDailySalesData();
                                }}
                                className="form-control"
                            >
                                {monthOptions.map((option) => (
                                    <option value={option.value}>{option.label}</option>
                                ))}

                            </select>
                        </div>
                    </div>

                    {dailySales && dailySales.length > 0 ? <Chart
                        chartType="LineChart"
                        width="100%"
                        height="400px"
                        data={dailySales}
                        options={options}
                    /> : ""}
                    {/*calendarDailySales && calendarDailySales.length > 0 ? <Chart
                        chartType="Calendar"
                        width="100%"
                        height="400px"
                        data={calendarDailySales}
                        options={calendarOptions}
                    /> : ""*/}
                </div>
            </div>
        </>
    );
});

export default DailySales;
