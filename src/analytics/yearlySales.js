import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import Cookies from "universal-cookie";
import { Chart } from "react-google-charts";



const YearlySales = forwardRef((props, ref) => {
    const cookies = new Cookies();
    useImperativeHandle(ref, () => ({
        init() {
            if (props.allOrders.length > 0) {
                makeYearlySalesData();
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



    let [yearlySales, setYearlySales] = useState([]);

    function makeYearlySalesData() {
        let data = [
            ["Year", "Sales", "Sales Profit", "Loss"],
        ];
        let firstYear = 2022;
        let lastYear = new Date().getFullYear();

        for (let year = firstYear; year <= parseInt(lastYear); year++) {

            let sales = 0.00;
            let profit = 0.00;
            let loss = 0.00;
            for (const sale of props.allOrders) {
                if (parseInt(new Date(sale.created_at).getFullYear()) === year) {
                    sales += parseFloat(sale.net_total);
                    profit += parseFloat(sale.net_profit);
                    loss += parseFloat(sale.loss);
                }
            }

            data.push([
                year.toString(),
                parseFloat(sales.toFixed(2)),
                parseFloat(profit.toFixed(2)),
                parseFloat(loss.toFixed(2))
            ]);

        }
        yearlySales = data;
        setYearlySales(data);
        //setYearlySales(data);
    }

    const [data, setData] = useState([
        ["Year", "Sales", "Sales Profit", "Loss"],
    ]);

    const [options, setOptions] = useState({
        title: 'Sales',
        subtitle: '(SAR)',
        legend: { position: 'bottom' },
        hAxis: {
            title: "Year",
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
                <h2>Yearly Sales</h2>
                <div className="row">
                    {yearlySales && yearlySales.length > 0 ? <Chart
                        chartType="LineChart"
                        width="100%"
                        height="400px"
                        data={yearlySales}
                        options={options}
                    /> : ""}
                </div>
            </div>
        </>
    );
});

export default YearlySales;
