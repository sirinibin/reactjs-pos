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
        },
        {
            label: "2021",
            value: 2021,
        },
    ]);



    let [yearlySales, setYearlySales] = useState([]);

    function makeYearlySalesData() {
        let data = [
            ["Year", "Sales", "Sales Profit", "Expense", "Purchase", "Sales Return", "Purchase Return", "Loss"],
        ];
        let firstYear = 2020;
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

            let totalExpense = 0.00;
            for (const expense of props.allExpenses) {
                if (parseInt(new Date(expense.date).getFullYear()) === year) {
                    totalExpense += parseFloat(expense.amount);
                }
            }

            let totalPurchase = 0.00;
            for (const purchase of props.allPurchases) {
                if (parseInt(new Date(purchase.date).getFullYear()) === year) {
                    totalPurchase += parseFloat(purchase.net_total);
                }
            }

            let totalSalesReturn = 0.00;
            for (const salesReturn of props.allSalesReturns) {
                if (parseInt(new Date(salesReturn.date).getFullYear()) === year) {
                    totalSalesReturn += parseFloat(salesReturn.net_total);
                }
            }

            let totalPurchaseReturn = 0.00;
            for (const purchaseReturn of props.allPurchaseReturns) {
                if (parseInt(new Date(purchaseReturn.date).getFullYear()) === year) {
                    totalPurchaseReturn += parseFloat(purchaseReturn.net_total);
                }
            }

            data.push([
                year.toString(),
                parseFloat(sales.toFixed(2)),
                parseFloat(profit.toFixed(2)),
                parseFloat(totalExpense.toFixed(2)),
                parseFloat(totalPurchase.toFixed(2)),
                parseFloat(totalSalesReturn.toFixed(2)),
                parseFloat(totalPurchaseReturn.toFixed(2)),
                parseFloat(loss.toFixed(2))
            ]);

        }
        yearlySales = data;
        setYearlySales(data);
        //setYearlySales(data);
    }

    const [options, setOptions] = useState({
        title: 'Sales',
        subtitle: '(SAR)',
        legend: { position: 'right' },
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
                <h2>Yearly Sales vs Sales Profit vs Expense vs Purchase vs Sales Return vs Purchase Return</h2>
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
