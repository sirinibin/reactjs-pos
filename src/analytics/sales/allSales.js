import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle, memo } from "react";
import { Chart } from "react-google-charts";



const AllSales = forwardRef((props, ref) => {
    useImperativeHandle(ref, () => ({
        init() {
            if (props.allOrders.length > 0) {
                makeAllSalesData();
            }
        }
    }));


    let [allSales, setAllSales] = useState([]);


    function makeAllSalesData() {
        let columns = [
            { type: "datetime", label: "Time" }
        ];
        if (props.columns.all.sales) {
            columns.push({ type: "number", label: "Sales" });
        }

        if (props.columns.all.salesProfit) {
            columns.push({ type: "number", label: "Sales Profit" });
        }

        if (props.columns.all.expense) {
            columns.push({ type: "number", label: "Expense" });
        }

        if (props.columns.all.purchase) {
            columns.push({ type: "number", label: "Purchase" });
        }

        if (props.columns.all.salesReturn) {
            columns.push({ type: "number", label: "Sales Return" });
        }

        if (props.columns.all.purchaseReturn) {
            columns.push({ type: "number", label: "Purchase Return" });
        }

        if (props.columns.all.loss) {
            columns.push({ type: "number", label: "Loss" });
        }

        let salesData = [];


        if (columns.length > 1) {
            salesData.push(columns)
        }


        if (props.columns.all.sales || props.columns.all.salesProfit || props.columns.all.loss) {
            for (const sale of props.allOrders) {
                let row = [new Date(sale.created_at)];

                if (props.columns.all.sales) {
                    row.push(parseFloat(sale.net_total.toFixed(2)));
                }

                if (props.columns.all.salesProfit) {
                    row.push(parseFloat(sale.net_profit.toFixed(2)));
                }

                if (props.columns.all.expense) {
                    row.push(undefined);
                }

                if (props.columns.all.purchase) {
                    row.push(undefined);
                }

                if (props.columns.all.salesReturn) {
                    row.push(undefined);
                }

                if (props.columns.all.purchaseReturn) {
                    row.push(undefined);
                }

                if (props.columns.all.loss) {
                    row.push(parseFloat(sale.loss.toFixed(2)));
                }

                salesData.push(row);
            }
        }

        if (props.columns.all.expense) {
            for (const expense of props.allExpenses) {
                let row = [new Date(expense.date)];

                if (props.columns.all.sales) {
                    row.push(undefined);
                }

                if (props.columns.all.salesProfit) {
                    row.push(undefined);
                }

                if (props.columns.all.expense) {
                    row.push(parseFloat(expense.amount.toFixed(2)));
                }

                if (props.columns.all.purchase) {
                    row.push(undefined);
                }

                if (props.columns.all.salesReturn) {
                    row.push(undefined);
                }

                if (props.columns.all.purchaseReturn) {
                    row.push(undefined);
                }

                if (props.columns.all.loss) {
                    row.push(undefined);
                }

                salesData.push(row);
            }
        }

        if (props.columns.all.purchase) {
            for (const purchase of props.allPurchases) {
                let row = [new Date(purchase.date)];

                if (props.columns.all.sales) {
                    row.push(undefined);
                }

                if (props.columns.all.salesProfit) {
                    row.push(undefined);
                }

                if (props.columns.all.expense) {
                    row.push(undefined);
                }

                if (props.columns.all.purchase) {
                    row.push(parseFloat(purchase.net_total.toFixed(2)));
                }

                if (props.columns.all.salesReturn) {
                    row.push(undefined);
                }

                if (props.columns.all.purchaseReturn) {
                    row.push(undefined);
                }

                if (props.columns.all.loss) {
                    row.push(undefined);
                }

                salesData.push(row);
            }
        }


        if (props.columns.all.salesReturn) {
            for (const salesReturn of props.allSalesReturns) {

                let row = [new Date(salesReturn.date)];

                if (props.columns.all.sales) {
                    row.push(undefined);
                }

                if (props.columns.all.salesProfit) {
                    row.push(undefined);
                }

                if (props.columns.all.expense) {
                    row.push(undefined);
                }

                if (props.columns.all.purchase) {
                    row.push(undefined);
                }

                if (props.columns.all.salesReturn) {
                    row.push(parseFloat(salesReturn.net_total.toFixed(2)));
                }

                if (props.columns.all.purchaseReturn) {
                    row.push(undefined);
                }

                if (props.columns.all.loss) {
                    row.push(undefined);
                }

                salesData.push(row);
            }
        }


        if (props.columns.all.purchaseReturn) {
            for (const purchaseReturn of props.allPurchaseReturns) {
                let row = [new Date(purchaseReturn.date)];

                if (props.columns.all.sales) {
                    row.push(undefined);
                }

                if (props.columns.all.salesProfit) {
                    row.push(undefined);
                }

                if (props.columns.all.expense) {
                    row.push(undefined);
                }

                if (props.columns.all.purchase) {
                    row.push(undefined);
                }

                if (props.columns.all.salesReturn) {
                    row.push(undefined);
                }

                if (props.columns.all.purchaseReturn) {
                    row.push(parseFloat(purchaseReturn.net_total.toFixed(2)));
                }

                if (props.columns.all.loss) {
                    row.push(undefined);
                }

                salesData.push(row);
            }
        }

        allSales = salesData;
        setAllSales(salesData);
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
