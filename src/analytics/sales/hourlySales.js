import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { Chart } from "react-google-charts";



const HourlySales = forwardRef((props, ref) => {
    useImperativeHandle(ref, () => ({
        init() {
            makeDateOptions();
            if (props.allOrders.length > 0) {
                makeHourlySalesData();
            }
        }
    }));

    const yearOptions = [
        {
            label: "2025",
            value: 2025,
        },
        {
            label: "2024",
            value: 2024,
        },
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
    ];


    const monthOptions = [
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
    ];


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
            columns.push({ type: "number", label: "Sales Return profit" });
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



        if (props.columns.sales || props.columns.salesProfit || props.columns.loss||props.columns.paidSales||props.columns.unpaidSales) {
            for (const sale of props.allOrders) {
                // console.log("Sale Month:", new Date(sale.date).getMonth() + 1);
                // console.log("Sale Year:", new Date(sale.date).getFullYear());
                if ((new Date(sale.date).getMonth() + 1) === hourlySalesSelectedMonth
                    && new Date(sale.date).getFullYear() === hourlySalesSelectedYear
                    && new Date(sale.date).getDate() === hourlySalesSelectedDate
                    // && new Date(sale.date).getHours() == hour
                ) {


                    let row = [new Date(sale.date)];

                    if (props.columns.sales) {
                        row.push(parseFloat(sale.net_total.toFixed(2)));
                    }

                    if (props.columns.salesProfit) {
                        row.push(parseFloat(sale.net_profit.toFixed(2)));
                    }

                    if (props.columns.paidSales) {
                        row.push(parseFloat(sale.total_payment_received.toFixed(2)));
                        /*
                        if(sale.payment_status=="paid"){
                            row.push(parseFloat(sale.net_total.toFixed(2)));
                        }else {
                            row.push(0.00);
                        }
                        */
                    }

                    if (props.columns.unpaidSales) {
                        row.push(parseFloat(sale.balance_amount.toFixed(2)));
                        /*
                        if(sale.payment_status=="not_paid"){
                            row.push(parseFloat(sale.net_total.toFixed(2)));
                        }else {
                            row.push(0.00);
                        }
                        */
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
        }

        if (props.columns.expense) {
            for (const expense of props.allExpenses) {
                if ((new Date(expense.date).getMonth() + 1) === hourlySalesSelectedMonth
                    && new Date(expense.date).getFullYear() === hourlySalesSelectedYear
                    && new Date(expense.date).getDate() === hourlySalesSelectedDate
                ) {

                    let row = [new Date(expense.date)];

                    if (props.columns.sales) {
                        row.push(undefined);
                    }

                    if (props.columns.salesProfit) {
                        row.push(undefined);
                    }

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
        }

        if (props.columns.purchase) {
            for (const purchase of props.allPurchases) {
                if ((new Date(purchase.date).getMonth() + 1) === hourlySalesSelectedMonth
                    && new Date(purchase.date).getFullYear() === hourlySalesSelectedYear
                    && new Date(purchase.date).getDate() === hourlySalesSelectedDate
                ) {
                    let row = [new Date(purchase.date)];

                    if (props.columns.sales) {
                        row.push(undefined);
                    }

                    if (props.columns.salesProfit) {
                        row.push(undefined);
                    }

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
        }

        if (props.columns.salesReturn || props.columns.salesReturnProfit || props.columns.salesReturnLoss) {
            for (const salesReturn of props.allSalesReturns) {
                if ((new Date(salesReturn.date).getMonth() + 1) === hourlySalesSelectedMonth
                    && new Date(salesReturn.date).getFullYear() === hourlySalesSelectedYear
                    && new Date(salesReturn.date).getDate() === hourlySalesSelectedDate
                ) {

                    let row = [new Date(salesReturn.date)];

                    if (props.columns.sales) {
                        row.push(undefined);
                    }

                    if (props.columns.salesProfit) {
                        row.push(undefined);
                    }

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
                        row.push(parseFloat(salesReturn.net_profit.toFixed(2)));
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
        }

        if (props.columns.purchaseReturn) {
            for (const purchaseReturn of props.allPurchaseReturns) {
                if ((new Date(purchaseReturn.date).getMonth() + 1) === hourlySalesSelectedMonth
                    && new Date(purchaseReturn.date).getFullYear() === hourlySalesSelectedYear
                    && new Date(purchaseReturn.date).getDate() === hourlySalesSelectedDate
                ) {

                    let row = [new Date(purchaseReturn.date)];

                    if (props.columns.sales) {
                        row.push(undefined);
                    }

                    if (props.columns.salesProfit) {
                        row.push(undefined);
                    }

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
        }


        hourlySales = data;
        setHourlySales(data);
    }

    const options = {
        title: '',
        subtitle: '(SAR)',
        legend: { position: 'right' },
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
    };

    useEffect(() => {
        // getAllOrders();

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <>
            <div className="container-fluid p-0">
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

                                    hourlySalesSelectedMonth = parseInt(e.target.value);
                                    setHourlySalesSelectedMonth(parseInt(e.target.value));
                                    makeDateOptions();
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
