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
        let columns = [
            { type: "string", label: "Month" }
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
            columns.push({ type: "number", label: "Loss" });
        }

        let data = [];


        if (columns.length > 1) {
            data.push(columns)
        }

        console.log("selectedYear:", monthlySalesSelectedYear);
        let lastMonth = 12;

        for (let month = 1; month <= lastMonth; month++) {

            let sales = 0.00;
            let profit = 0.00;
            let paidSales = 0.00;
            let unpaidSales = 0.00;
            let loss = 0.00;
            if (props.columns.sales || props.columns.salesProfit || props.columns.loss||props.columns.paidSales||props.columns.unpaidSales) {
                for (const sale of props.allOrders) {
                    // console.log("Sale Month:", new Date(sale.date).getMonth() + 1);
                    // console.log("Sale Year:", new Date(sale.date).getFullYear());
                    if ((new Date(sale.date).getMonth() + 1) == month && new Date(sale.date).getFullYear() == monthlySalesSelectedYear) {
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
                    // console.log("Sale Month:", new Date(sale.date).getMonth() + 1);
                    // console.log("Sale Year:", new Date(sale.date).getFullYear());
                    if ((new Date(expense.date).getMonth() + 1) == month &&
                        new Date(expense.date).getFullYear() == monthlySalesSelectedYear) {
                        totalExpense += parseFloat(expense.amount);
                    }
                }
            }

            let totalPurchase = 0.00;
            if (props.columns.purchase) {
                for (const purchase of props.allPurchases) {
                    if ((new Date(purchase.date).getMonth() + 1) == month &&
                        new Date(purchase.date).getFullYear() == monthlySalesSelectedYear) {
                        totalPurchase += parseFloat(purchase.net_total);
                    }
                }
            }

            let totalSalesReturn = 0.00;
            let totalSalesReturnProfit = 0.00;
            let totalSalesReturnLoss = 0.00;
            if (props.columns.salesReturn||props.columns.salesReturnProfit||props.columns.salesReturnLoss) {
                for (const salesReturn of props.allSalesReturns) {
                    if ((new Date(salesReturn.date).getMonth() + 1) == month &&
                        new Date(salesReturn.date).getFullYear() == monthlySalesSelectedYear) {
                        totalSalesReturn += parseFloat(salesReturn.net_total);
                        totalSalesReturnProfit += parseFloat(salesReturn.net_profit);
                        totalSalesReturnLoss += parseFloat(salesReturn.loss);
                    }
                }
            }

            let totalPurchaseReturn = 0.00;
            if (props.columns.purchaseReturn) {
                for (const purchaseReturn of props.allPurchaseReturns) {
                    if ((new Date(purchaseReturn.date).getMonth() + 1) == month &&
                        new Date(purchaseReturn.date).getFullYear() == monthlySalesSelectedYear) {
                        totalPurchaseReturn += parseFloat(purchaseReturn.net_total);
                    }
                }
            }


            let row = [getMonthNameByNumber(month)];

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
        monthlySales = data;
        setMonthlySales(data);
        //setMonthlySales(data);
    }


    const [options, setOptions] = useState({
        title: 'Sales',
        subtitle: '(SAR)',
        legend: { position: 'right' },
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
