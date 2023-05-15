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
        let columns = [
            { type: "string", label: "Year" }
        ];
        if (props.columns.sales) {
            columns.push({ type: "number", label: "Sales" });
        }

        if (props.columns.salesProfit) {
            columns.push({ type: "number", label: "Sales Profit" });
        }

        if (props.columns.paidSales) {
            columns.push({ type: "number", label: "Paid Sales" });
        }

        if (props.columns.unpaidSales) {
            columns.push({ type: "number", label: "UnPaid Sales" });
        }

        if (props.columns.expense) {
            columns.push({ type: "number", label: "Expense" });
        }

        if (props.columns.purchase) {
            columns.push({ type: "number", label: "Purchase" });
        }

        if (props.columns.salesReturn) {
            columns.push({ type: "number", label: "Sales Return" });
        }

        if (props.columns.purchaseReturn) {
            columns.push({ type: "number", label: "Purchase Return" });
        }

        if (props.columns.loss) {
            columns.push({ type: "number", label: "Loss" });
        }

        let data = [];


        if (columns.length > 1) {
            data.push(columns)
        }

        let firstYear = 2020;
        let lastYear = new Date().getFullYear();

        for (let year = firstYear; year <= parseInt(lastYear); year++) {

            let sales = 0.00;
            let profit = 0.00;
            let paidSales = 0.00;
            let unpaidSales = 0.00;
            let loss = 0.00;
            if (props.columns.sales || props.columns.salesProfit || props.columns.paidSales || props.columns.unpaidSales || props.columns.loss) {
                for (const sale of props.allOrders) {
                    if (parseInt(new Date(sale.created_at).getFullYear()) === year) {
                        sales += parseFloat(sale.net_total);
                        profit += parseFloat(sale.net_profit);
                        
                        if(sale.payment_status=="paid"){
                            paidSales += parseFloat(sale.net_total);
                        }else if(sale.payment_status=="not_paid"){
                            unpaidSales += parseFloat(sale.net_total);
                        }
                        loss += parseFloat(sale.loss);
                    }
                }
            }

            let totalExpense = 0.00;
            if (props.columns.expense) {
                for (const expense of props.allExpenses) {
                    if (parseInt(new Date(expense.date).getFullYear()) === year) {
                        totalExpense += parseFloat(expense.amount);
                    }
                }
            }

            let totalPurchase = 0.00;
            if (props.columns.purchase) {
                for (const purchase of props.allPurchases) {
                    if (parseInt(new Date(purchase.date).getFullYear()) === year) {
                        totalPurchase += parseFloat(purchase.net_total);
                    }
                }
            }

            let totalSalesReturn = 0.00;
            if (props.columns.salesReturn) {
                for (const salesReturn of props.allSalesReturns) {
                    if (parseInt(new Date(salesReturn.date).getFullYear()) === year) {
                        totalSalesReturn += parseFloat(salesReturn.net_total);
                    }
                }
            }

            let totalPurchaseReturn = 0.00;
            if (props.columns.purchaseReturn) {
                for (const purchaseReturn of props.allPurchaseReturns) {
                    if (parseInt(new Date(purchaseReturn.date).getFullYear()) === year) {
                        totalPurchaseReturn += parseFloat(purchaseReturn.net_total);
                    }
                }
            }

            let row = [year.toString()];

            if (props.columns.sales) {
                row.push(parseFloat(sales.toFixed(2)));
            }

            if (props.columns.salesProfit) {
                row.push(parseFloat(profit.toFixed(2)));
            }

            if (props.columns.paidSales) {
                row.push(parseFloat(paidSales.toFixed(2)));
            }

            if (props.columns.unpaidSales) {
                row.push(parseFloat(unpaidSales.toFixed(2)));
            }

            if (props.columns.expense) {
                row.push(parseFloat(totalExpense.toFixed(2)));
            }

            if (props.columns.purchase) {
                row.push(parseFloat(totalPurchase.toFixed(2)));
            }

            if (props.columns.salesReturn) {
                row.push(parseFloat(totalSalesReturn.toFixed(2)));
            }

            if (props.columns.purchaseReturn) {
                row.push(parseFloat(totalPurchaseReturn.toFixed(2)));
            }

            if (props.columns.loss) {
                row.push(parseFloat(loss.toFixed(2)));
            }

            if (row.length > 1) {
                data.push(row);
            }

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
