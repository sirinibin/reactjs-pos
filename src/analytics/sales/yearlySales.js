import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { Chart } from "react-google-charts";



const YearlySales = forwardRef((props, ref) => {
    useImperativeHandle(ref, () => ({
        init() {
            if (props.allOrders.length > 0) {
                makeYearlySalesData();
            }
        }
    }));

   


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
            columns.push({ type: "number", label: "Credit Sales" });
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

        if (props.columns.salesReturnProfit) {
            columns.push({ type: "number", label: "Sales Return Profit" });
        }

        if (props.columns.salesReturnLoss) {
            columns.push({ type: "number", label: "Sales Return Loss" });
        }

        if (props.columns.purchaseReturn) {
            columns.push({ type: "number", label: "Purchase Return" });
        }

        if (props.columns.loss) {
            columns.push({ type: "number", label: "Sales Loss" });
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
                    if (parseInt(new Date(sale.date).getFullYear()) === year) {
                        sales += parseFloat(sale.net_total);
                        profit += parseFloat(sale.net_profit);

                        paidSales += parseFloat(sale.total_payment_received);
                        unpaidSales += parseFloat(sale.balance_amount);
                        /*
                        if(sale.payment_status=="paid"){
                            paidSales += parseFloat(sale.net_total);
                        }else if(sale.payment_status=="not_paid"){
                            unpaidSales += parseFloat(sale.net_total);
                        }
                        */

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
            let totalSalesReturnProfit = 0.00;
            let totalSalesReturnLoss = 0.00;
            if (props.columns.salesReturn||props.columns.salesReturnProfit||props.columns.salesReturnLoss) {
                for (const salesReturn of props.allSalesReturns) {
                    if (parseInt(new Date(salesReturn.date).getFullYear()) === year) {
                        totalSalesReturn += parseFloat(salesReturn.net_total);
                        totalSalesReturnProfit += parseFloat(salesReturn.net_profit);
                        totalSalesReturnLoss += parseFloat(salesReturn.loss);
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

            if (props.columns.salesReturnProfit) {
                row.push(parseFloat(totalSalesReturnProfit.toFixed(2)));
            }

            if (props.columns.salesReturnLoss) {
                row.push(parseFloat(totalSalesReturnLoss.toFixed(2)));
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

    const options = {
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
    };
   





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
