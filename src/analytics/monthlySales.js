import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import Cookies from "universal-cookie";
import { Chart } from "react-google-charts";



const MonthlySales = forwardRef((props, ref) => {
    const cookies = new Cookies();
    useImperativeHandle(ref, () => ({
        init() {
            if (props.allOrders.length > 0) {
                makeMonthlySalesData();
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

    function getMonthNameByNumber(number) {
        for (const month of monthOptions) {
            if (month.value == number) {
                return month.label;
            }
        }
    }



    let [monthlySales, setMonthlySales] = useState([]);
    let [monthlySalesSelectedYear, setMonthlySalesSelectedYear] = useState(new Date().getFullYear());


    function makeMonthlySalesData() {
        let data = [
            ["Month", "Sales", "Sales Profit", "Loss"],
        ];
        let firstMonth = 1;
        console.log("selectedYear:", monthlySalesSelectedYear);
        let lastMonth = 12;

        for (let month = 1; month <= lastMonth; month++) {

            let sales = 0.00;
            let profit = 0.00;
            let loss = 0.00;
            for (const sale of props.allOrders) {
                // console.log("Sale Month:", new Date(sale.created_at).getMonth() + 1);
                // console.log("Sale Year:", new Date(sale.created_at).getFullYear());
                if ((new Date(sale.created_at).getMonth() + 1) == month && new Date(sale.created_at).getFullYear() == monthlySalesSelectedYear) {
                    sales += parseFloat(sale.net_total);
                    profit += parseFloat(sale.net_profit);
                    loss += parseFloat(sale.loss);
                }
            }

            data.push([
                getMonthNameByNumber(month),
                parseFloat(sales.toFixed(2)),
                parseFloat(profit.toFixed(2)),
                parseFloat(loss.toFixed(2))
            ]);

        }
        monthlySales = data;
        setMonthlySales(data);
        //setMonthlySales(data);
    }

    const [data, setData] = useState([
        ["Month", "Sales", "Sales Profit", "Loss"],
    ]);

    const [options, setOptions] = useState({
        title: 'Sales',
        subtitle: '(SAR)',
        legend: { position: 'bottom' },
        hAxis: {
            title: "Month",
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
                <h2>Monthly Sales</h2>
                <div className="row">

                    <div className="col-md-2">
                        <label className="form-label">Year</label>

                        <div className="input-group mb-3">
                            <select
                                value={monthlySalesSelectedYear}
                                onChange={(e) => {
                                    if (!e.target.value) {
                                        return;
                                    }
                                    monthlySalesSelectedYear = parseInt(e.target.value);
                                    setMonthlySalesSelectedYear(parseInt(e.target.value));
                                    makeMonthlySalesData();
                                }}
                                className="form-control"
                            >
                                {yearOptions.map((option) => (
                                    <option value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>


                    {monthlySales && monthlySales.length > 0 ? <Chart
                        chartType="LineChart"
                        width="100%"
                        height="400px"
                        data={monthlySales}
                        options={options}
                    /> : ""}
                </div>
            </div>
        </>
    );
});

export default MonthlySales;
