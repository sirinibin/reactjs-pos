import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import Cookies from "universal-cookie";
import { Chart } from "react-google-charts";



const HourlySales = forwardRef((props, ref) => {
    const cookies = new Cookies();
    useImperativeHandle(ref, () => ({
        init() {
            makeDateOptions();
            if (props.allOrders.length > 0) {
                makeHourlySalesData();
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



    let [hourlySales, setHourlySales] = useState([]);
    let [hourlySalesSelectedDate, setHourlySalesSelectedDate] = useState(new Date().getDate());
    let [hourlySalesSelectedMonth, setHourlySalesSelectedMonth] = useState(new Date().getMonth() + 1);
    let [hourlySalesSelectedYear, setHourlySalesSelectedYear] = useState(new Date().getFullYear());


    function daysInMonth(month, year) {
        return new Date(year, month, 0).getDate();
    }

    function makeDateOptions() {
        let days = daysInMonth(hourlySalesSelectedMonth, hourlySalesSelectedYear);
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

    function makeHourlySalesData() {
        let data = [
            ["Time", "Sales", "Sales Profit", "Loss"],
        ];
        let firstHour = 1;
        //selectedMonth = 1;
        //setSelectedMonth(1);
        console.log("selectedDate:", hourlySalesSelectedDate);
        console.log("selectedMonth:", hourlySalesSelectedMonth);
        console.log("selectedYear:", hourlySalesSelectedYear);
        let lastHour = 24;
        let am = true;
        let timeLabel = "";

        for (let hour = 0; hour < lastHour; hour++) {
            if (hour >= 12) {
                am = false;
                if (hour == 12) {
                    timeLabel = hour.toString() + "pm";
                } else {
                    timeLabel = (hour - 12).toString() + "pm";
                }

            } else {
                timeLabel = hour.toString() + "am";
            }

            let sales = 0.00;
            let profit = 0.00;
            let loss = 0.00;
            for (const sale of props.allOrders) {
                // console.log("Sale Month:", new Date(sale.created_at).getMonth() + 1);
                // console.log("Sale Year:", new Date(sale.created_at).getFullYear());
                if ((new Date(sale.created_at).getMonth() + 1) == hourlySalesSelectedMonth
                    && new Date(sale.created_at).getFullYear() == hourlySalesSelectedYear
                    && new Date(sale.created_at).getDate() == hourlySalesSelectedDate
                    && new Date(sale.created_at).getHours() == hour
                ) {
                    sales += parseFloat(sale.net_total);
                    profit += parseFloat(sale.net_profit);
                    loss += parseFloat(sale.loss);
                }
            }

            data.push([
                timeLabel,
                parseFloat(sales.toFixed(2)),
                parseFloat(profit.toFixed(2)),
                parseFloat(loss.toFixed(2))
            ]);

        }
        console.log(data);
        hourlySales = data;
        setHourlySales(data);
    }

    const [data, setData] = useState([
        ["Time", "Sales", "Sales Profit", "Loss"],
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
                <h2>Hourly Sales</h2>
                <div className="row">

                    <div className="col-md-2">
                        <label className="form-label">Year</label>

                        <div className="input-group mb-3">
                            <select
                                value={hourlySalesSelectedYear}
                                onChange={(e) => {
                                    if (!e.target.value) {
                                        return;
                                    }
                                    hourlySalesSelectedYear = parseInt(e.target.value);
                                    setHourlySalesSelectedYear(parseInt(e.target.value));
                                    makeHourlySalesData();
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
                                value={hourlySalesSelectedMonth}
                                onChange={(e) => {
                                    if (!e.target.value) {
                                        return;
                                    }
                                    makeDateOptions();
                                    hourlySalesSelectedMonth = parseInt(e.target.value);
                                    setHourlySalesSelectedMonth(parseInt(e.target.value));
                                    makeHourlySalesData();
                                }}
                                className="form-control"
                            >
                                {monthOptions.map((option) => (
                                    <option value={option.value}>{option.label}</option>
                                ))}

                            </select>
                        </div>
                    </div>

                    <div className="col-md-2">
                        <label className="form-label">Date</label>

                        <div className="input-group mb-3">
                            <select
                                value={hourlySalesSelectedDate}
                                onChange={(e) => {
                                    if (!e.target.value) {
                                        return;
                                    }
                                    hourlySalesSelectedDate = parseInt(e.target.value);
                                    setHourlySalesSelectedDate(parseInt(e.target.value));
                                    makeHourlySalesData();
                                }}
                                className="form-control"
                            >
                                {dateOptions.map((option) => (
                                    <option value={option.value}>{option.label}</option>
                                ))}

                            </select>
                        </div>
                    </div>

                    {hourlySales && hourlySales.length > 0 ? <Chart
                        chartType="LineChart"
                        width="100%"
                        height="400px"
                        data={hourlySales}
                        options={options}
                    /> : ""}
                </div>
            </div>
        </>
    );
});

export default HourlySales;
