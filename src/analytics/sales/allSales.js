import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle, memo } from "react";
import { Chart } from "react-google-charts";



const AllSales = forwardRef((props, ref) => {
    useImperativeHandle(ref, () => ({
        init() {
            if (props.allOrders.length > 0) {
                makeAllData();
            }
        }
    }));


    let [allSales, setAllSales] = useState([]);


    function makeAllData() {
        let columns = [
            { type: "datetime", label: "Time" }
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


        if (props.columns.sales || 
            props.columns.salesProfit || 
            props.columns.loss||
            props.columns.paidSales||
            props.columns.unpaidSales
            ) {
            for (const sale of props.allOrders) {
                let row = [new Date(sale.created_at)];

                if (props.columns.sales) {
                    row.push(parseFloat(sale.net_total.toFixed(2)));
                }

                if (props.columns.salesProfit) {
                    row.push(parseFloat(sale.net_profit.toFixed(2)));
                }

                if (props.columns.paidSales) {
                    if(sale.payment_status=="paid"){
                        row.push(parseFloat(sale.net_total.toFixed(2)));
                    }else {
                        row.push(0.00);
                    }
                }

                if (props.columns.unpaidSales) {
                    if(sale.payment_status=="not_paid"){
                        row.push(parseFloat(sale.net_total.toFixed(2)));
                    }else {
                        row.push(0.00);
                    }
                }

                if (props.columns.expense) {
                    row.push(undefined);
                }

                if (props.columns.purchase) {
                    row.push(undefined);
                }

                if (props.columns.salesReturn) {
                    row.push(undefined);
                }

                if (props.columns.salesReturnProfit) {
                    row.push(undefined);
                }

                if (props.columns.salesReturnLoss) {
                    row.push(undefined);
                }

                if (props.columns.purchaseReturn) {
                    row.push(undefined);
                }

                if (props.columns.loss) {
                    row.push(parseFloat(sale.loss.toFixed(2)));
                }

                data.push(row);
            }
        }

        if (props.columns.expense) {
            for (const expense of props.allExpenses) {
                let row = [new Date(expense.date)];

                if (props.columns.sales) {
                    row.push(undefined);
                }

                if (props.columns.salesProfit) {
                    row.push(undefined);
                }

                if (props.columns.expense) {
                    row.push(parseFloat(expense.amount.toFixed(2)));
                }

                if (props.columns.purchase) {
                    row.push(undefined);
                }

                if (props.columns.salesReturn) {
                    row.push(undefined);
                }

                if (props.columns.salesReturnProfit) {
                    row.push(undefined);
                }

                if (props.columns.salesReturnLoss) {
                    row.push(undefined);
                }

                if (props.columns.purchaseReturn) {
                    row.push(undefined);
                }

                if (props.columns.loss) {
                    row.push(undefined);
                }

                data.push(row);
            }
        }

        if (props.columns.purchase) {
            for (const purchase of props.allPurchases) {
                let row = [new Date(purchase.date)];

                if (props.columns.sales) {
                    row.push(undefined);
                }

                if (props.columns.salesProfit) {
                    row.push(undefined);
                }

                if (props.columns.expense) {
                    row.push(undefined);
                }

                if (props.columns.purchase) {
                    row.push(parseFloat(purchase.net_total.toFixed(2)));
                }

                if (props.columns.salesReturn) {
                    row.push(undefined);
                }

                if (props.columns.salesReturnProfit) {
                    row.push(undefined);
                }

                if (props.columns.salesReturnLoss) {
                    row.push(undefined);
                }

                if (props.columns.purchaseReturn) {
                    row.push(undefined);
                }

                if (props.columns.loss) {
                    row.push(undefined);
                }

                data.push(row);
            }
        }


        if (props.columns.salesReturn) {
            for (const salesReturn of props.allSalesReturns) {

                let row = [new Date(salesReturn.date)];

                if (props.columns.sales) {
                    row.push(undefined);
                }

                if (props.columns.salesProfit) {
                    row.push(undefined);
                }

                if (props.columns.expense) {
                    row.push(undefined);
                }

                if (props.columns.purchase) {
                    row.push(undefined);
                }

                if (props.columns.salesReturn) {
                    row.push(parseFloat(salesReturn.net_total.toFixed(2)));
                }

                if (props.columns.salesReturnProfit) {
                    row.push(undefined);
                }

                if (props.columns.salesReturnLoss) {
                    row.push(undefined);
                }

                if (props.columns.purchaseReturn) {
                    row.push(undefined);
                }

                if (props.columns.loss) {
                    row.push(undefined);
                }

                data.push(row);
            }
        }

        if (props.columns.salesReturnProfit) {
            for (const salesReturn of props.allSalesReturns) {

                let row = [new Date(salesReturn.date)];

                if (props.columns.sales) {
                    row.push(undefined);
                }

                if (props.columns.salesProfit) {
                    row.push(undefined);
                }

                if (props.columns.expense) {
                    row.push(undefined);
                }

                if (props.columns.purchase) {
                    row.push(undefined);
                }

                if (props.columns.salesReturn) {
                    row.push(undefined);
                }

                if (props.columns.salesReturnProfit) {
                    row.push(parseFloat(salesReturn.net_profit.toFixed(2)));
                }

                if (props.columns.salesReturnLoss) {
                    row.push(undefined);
                }

                if (props.columns.purchaseReturn) {
                    row.push(undefined);
                }

                if (props.columns.loss) {
                    row.push(undefined);
                }

                data.push(row);
            }
        }

        if (props.columns.salesReturnLoss) {
            for (const salesReturn of props.allSalesReturns) {

                let row = [new Date(salesReturn.date)];

                if (props.columns.sales) {
                    row.push(undefined);
                }

                if (props.columns.salesProfit) {
                    row.push(undefined);
                }

                if (props.columns.expense) {
                    row.push(undefined);
                }

                if (props.columns.purchase) {
                    row.push(undefined);
                }

                if (props.columns.salesReturn) {
                    row.push(undefined);
                }

                if (props.columns.salesReturnProfit) {
                    row.push(undefined);
                }

                if (props.columns.salesReturnLoss) {
                    row.push(parseFloat(salesReturn.loss.toFixed(2)));
                }

                if (props.columns.purchaseReturn) {
                    row.push(undefined);
                }

                if (props.columns.loss) {
                    row.push(undefined);
                }

                data.push(row);
            }
        }


        if (props.columns.purchaseReturn) {
            for (const purchaseReturn of props.allPurchaseReturns) {
                let row = [new Date(purchaseReturn.date)];

                if (props.columns.sales) {
                    row.push(undefined);
                }

                if (props.columns.salesProfit) {
                    row.push(undefined);
                }

                if (props.columns.expense) {
                    row.push(undefined);
                }

                if (props.columns.purchase) {
                    row.push(undefined);
                }

                if (props.columns.salesReturn) {
                    row.push(undefined);
                }

                if (props.columns.salesReturnProfit) {
                    row.push(undefined);
                }

                if (props.columns.salesReturnLoss) {
                    row.push(undefined);
                }

                if (props.columns.purchaseReturn) {
                    row.push(parseFloat(purchaseReturn.net_total.toFixed(2)));
                }

                if (props.columns.loss) {
                    row.push(undefined);
                }

                data.push(row);
            }
        }

        allSales = data;
        setAllSales(data);
    }


    const [salesOptions, setSalesOptions] = useState({
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

    useEffect(() => {
        console.log("Inside useEffect");

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);


    const AllSalesRef = useRef();

    return (
        <>
            <div className="container-fluid p-0">
                <div className="row">
                    {allSales && allSales.length > 0 ? <Chart
                        chartType="AnnotationChart"
                        width="100%"
                        height="400px"
                        data={allSales}
                        options={salesOptions}
                        chartEvents={[
                            {
                                eventName: "ready",
                                callback: ({ chartWrapper, google }) => {
                                    const chart = chartWrapper.getChart();
                                    /*
                                    google.visualization.events.addListener(chart, "onmouseover", e => {
                                        const { row, column } = e;
                                        console.warn("MOUSE OVER ", { row, column });
                                    });
                                    google.visualization.events.addListener(chart, "onmouseout", e => {
                                        const { row, column } = e;
                                        console.warn("MOUSE OUT ", { row, column });
                                    });
                                    */
                                    google.visualization.events.addListener(chart, "select", e => {
                                        console.log(e);
                                        let selection = chart.getSelection();
                                        console.log("selection:", selection);
                                    });
                                    /*
                                    google.visualization.events.addListener(chart, "click", e => {
                                        console.log(e);
                                        //  let selection = chart.getSelection();
                                        // console.log("selection:", selection);
                                    });
                                    */
                                }
                            },
                        ]}

                    /> : ""}
                </div>
                <br /><br />

            </div>
        </>
    );
});

export default memo(AllSales);
