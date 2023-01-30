import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import Cookies from "universal-cookie";
import { Chart } from "react-google-charts";



const DailySales = forwardRef((props, ref) => {
    const cookies = new Cookies();
    useImperativeHandle(ref, () => ({
        init() {
            makeDailyData();
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

    function makeDailyData() {
        let columns = [
            { type: "date", label: "Date" }
        ];
        if (props.columns.sales) {
            columns.push({ type: "number", label: "Sales" });
        }

        if (props.columns.salesProfit) {
            columns.push({ type: "number", label: "Sales Profit" });
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


        console.log("selectedMonth:", dailySalesSelectedMonth);
        console.log("selectedYear:", dailySalesSelectedYear);
        let lastDay = daysInMonth(dailySalesSelectedMonth, dailySalesSelectedYear);
        console.log("lastDay:", lastDay);
        for (let day = 1; day <= lastDay; day++) {

            let sales = 0.00;
            let profit = 0.00;
            let loss = 0.00;
            if (props.columns.sales || props.columns.salesProfit || props.columns.loss) {
                for (const sale of props.allOrders) {
                    // console.log("Sale Month:", new Date(sale.created_at).getMonth() + 1);
                    // console.log("Sale Year:", new Date(sale.created_at).getFullYear());
                    if ((new Date(sale.created_at).getMonth() + 1) == dailySalesSelectedMonth && new Date(sale.created_at).getFullYear() == dailySalesSelectedYear && new Date(sale.created_at).getDate() == day) {
                        sales += parseFloat(sale.net_total);
                        profit += parseFloat(sale.net_profit);
                        loss += parseFloat(sale.loss);
                    }
                }
            }

            let totalExpense = 0.00;
            if (props.columns.expense) {
                for (const expense of props.allExpenses) {
                    if ((new Date(expense.date).getMonth() + 1) == dailySalesSelectedMonth &&
                        new Date(expense.date).getFullYear() == dailySalesSelectedYear &&
                        new Date(expense.date).getDate() == day) {
                        totalExpense += parseFloat(expense.amount);
                    }
                }
            }

            let totalPurchase = 0.00;
            if (props.columns.purchase) {
                for (const purchase of props.allPurchases) {
                    if ((new Date(purchase.date).getMonth() + 1) == dailySalesSelectedMonth &&
                        new Date(purchase.date).getFullYear() == dailySalesSelectedYear &&
                        new Date(purchase.date).getDate() == day) {
                        totalPurchase += parseFloat(purchase.net_total);
                    }
                }
            }

            let totalSalesReturn = 0.00;
            if (props.columns.salesReturn) {
                for (const salesReturn of props.allSalesReturns) {
                    if ((new Date(salesReturn.date).getMonth() + 1) == dailySalesSelectedMonth &&
                        new Date(salesReturn.date).getFullYear() == dailySalesSelectedYear &&
                        new Date(salesReturn.date).getDate() == day) {
                        totalSalesReturn += parseFloat(salesReturn.net_total);
                    }
                }
            }

            let totalPurchaseReturn = 0.00;
            if (props.columns.purchaseReturn) {
                for (const purchaseReturn of props.allPurchaseReturns) {
                    if ((new Date(purchaseReturn.date).getMonth() + 1) == dailySalesSelectedMonth &&
                        new Date(purchaseReturn.date).getFullYear() == dailySalesSelectedYear &&
                        new Date(purchaseReturn.date).getDate() == day) {
                        totalPurchaseReturn += parseFloat(purchaseReturn.net_total);
                    }
                }
            }

            let row = [new Date(dailySalesSelectedYear, dailySalesSelectedMonth - 1, day)];

            if (props.columns.sales) {
                row.push(parseFloat(sales.toFixed(2)));
            }

            if (props.columns.salesProfit) {
                row.push(parseFloat(profit.toFixed(2)));
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

        dailySales = data;
        setDailySales(data);
    }


    const [options, setOptions] = useState({
        title: '',
        subtitle: '(SAR)',
        legend: { position: 'right' },
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
                                    makeDailyData();
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
                                    makeDailyData();
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
                </div>
            </div>
        </>
    );
});

export default DailySales;
