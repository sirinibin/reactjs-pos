import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import Cookies from "universal-cookie";
import { Chart } from "react-google-charts";



const AllSales = forwardRef((props, ref) => {
    const cookies = new Cookies();
    useImperativeHandle(ref, () => ({
        init() {
            if (props.allOrders.length > 0) {
                makeAllSalesData();
            }
        }
    }));




    let [allSales, setAllSales] = useState([]);

    let [calendarAllSales, setCalendarAllSales] = useState([]);
    let [calendarAllSalesProfit, setCalendarAllSalesProfit] = useState([]);
    let [calendarAllExpenses, setCalendarAllExpenses] = useState([]);
    let [calendarAllPurchases, setCalendarAllPurchases] = useState([]);

    let [calendarAllSalesReturns, setCalendarAllSalesReturns] = useState([]);
    let [calendarAllPurchaseReturns, setCalendarAllPurchaseReturns] = useState([]);


    let [allSalesSelectedDate, setAllSalesSelectedDate] = useState(new Date().getDate());
    let [allSalesSelectedMonth, setAllSalesSelectedMonth] = useState(new Date().getMonth() + 1);
    let [allSalesSelectedYear, setAllSalesSelectedYear] = useState(new Date().getFullYear());


    function daysInMonth(month, year) {
        return new Date(year, month, 0).getDate();
    }



    function makeAllSalesData() {
        let salesData = [
            [
                { type: "datetime", label: "Time" },
                { type: "number", label: "Sales" },
                { type: "number", label: "Sales Profit" },
                { type: "number", label: "Expense" },
                { type: "number", label: "Purchase" },
                { type: "number", label: "Sales Return" },
                { type: "number", label: "Purchase Return" },
                { type: "number", label: "Loss" },
                // { type: "string", label: "Customer" },
            ],
        ];

        let calendarSalesData = [
            [
                { type: "date", id: "Date" },
                { type: "number", id: "Sales" },
            ],
        ];

        let calendarSalesProfitData = [
            [
                { type: "date", id: "Date" },
                { type: "number", id: "Profit" },
            ],
        ];

        let calendarExpenseData = [
            [
                { type: "date", id: "Date" },
                { type: "number", id: "Expense" },
            ],
        ];

        let calendarPurchaseData = [
            [
                { type: "date", id: "Date" },
                { type: "number", id: "Purchase" },
            ],
        ];

        let calendarSalesReturnData = [
            [
                { type: "date", id: "Date" },
                { type: "number", id: "Sales Return" },
            ],
        ];

        let calendarPurchaseReturnData = [
            [
                { type: "date", id: "Date" },
                { type: "number", id: "Purchase Return" },
            ],
        ];

        let dailySales = [];
        let dailySalesProfit = [];

        for (const sale of props.allOrders) {
            salesData.push([
                new Date(sale.created_at),
                parseFloat(sale.net_total.toFixed(2)),
                parseFloat(sale.net_profit.toFixed(2)),
                undefined,
                undefined,
                undefined,//Sales Return
                undefined,//Purchase return
                parseFloat(sale.loss.toFixed(2)),
            ]);

            let dt = new Date(sale.created_at);
            let dtStr = dt.getFullYear() + "-" + dt.getMonth() + "-" + dt.getDate();
            if (!dailySales[dtStr]) {
                dailySales[dtStr] = 0;
            }

            if (!dailySalesProfit[dtStr]) {
                dailySalesProfit[dtStr] = 0;
            }

            dailySales[dtStr] += parseFloat(sale.net_total);
            dailySalesProfit[dtStr] += parseFloat(sale.net_profit);
        }


        for (let saleDate in dailySales) {
            let parts = saleDate.split('-');
            calendarSalesData.push([
                new Date(parts[0], parts[1], parts[2]),
                parseFloat(dailySales[saleDate].toFixed(2)),
            ]);

            calendarSalesProfitData.push([
                new Date(parts[0], parts[1], parts[2]),
                parseFloat(dailySalesProfit[saleDate].toFixed(2)),
            ]);
        }


        calendarAllSales = calendarSalesData
        setCalendarAllSales(calendarSalesData);

        console.log("calendarSalesProfitData:", calendarSalesProfitData);
        calendarAllSalesProfit = calendarSalesProfitData;
        setCalendarAllSalesProfit(calendarSalesProfitData);

        let dailyExpenses = [];
        for (const expense of props.allExpenses) {
            salesData.push([
                new Date(expense.date),
                undefined,
                undefined,
                parseFloat(expense.amount.toFixed(2)),
                undefined,
                undefined,//Sales Return
                undefined,//Purchase return
                undefined,//Loss
            ]);

            let dt = new Date(expense.date);
            let dtStr = dt.getFullYear() + "-" + dt.getMonth() + "-" + dt.getDate();
            if (!dailyExpenses[dtStr]) {
                dailyExpenses[dtStr] = 0;
            }
            dailyExpenses[dtStr] += parseFloat(expense.amount);
        }


        for (let expenseDate in dailyExpenses) {
            let parts = expenseDate.split('-');
            calendarExpenseData.push([
                new Date(parts[0], parts[1], parts[2]),
                parseFloat(dailyExpenses[expenseDate].toFixed(2)),
            ]);
        }

        calendarAllExpenses = calendarExpenseData
        setCalendarAllExpenses(calendarExpenseData);


        let dailyPurchases = [];
        for (const purchase of props.allPurchases) {
            salesData.push([
                new Date(purchase.date),
                undefined,
                undefined,
                undefined,
                parseFloat(purchase.net_total.toFixed(2)),
                undefined,//Sales Return
                undefined,//Purchase return
                undefined,//Loss
            ]);

            let dt = new Date(purchase.date);
            let dtStr = dt.getFullYear() + "-" + dt.getMonth() + "-" + dt.getDate();
            if (!dailyPurchases[dtStr]) {
                dailyPurchases[dtStr] = 0;
            }
            dailyPurchases[dtStr] += parseFloat(purchase.net_total);
        }


        for (let purchaseDate in dailyPurchases) {
            let parts = purchaseDate.split('-');
            calendarPurchaseData.push([
                new Date(parts[0], parts[1], parts[2]),
                parseFloat(dailyPurchases[purchaseDate].toFixed(2)),
            ]);
        }

        calendarAllPurchases = calendarPurchaseData
        setCalendarAllPurchases(calendarPurchaseData);


        //sales returns
        let dailySalesReturns = [];
        for (const salesReturn of props.allSalesReturns) {
            salesData.push([
                new Date(salesReturn.date),
                undefined,
                undefined,
                undefined,
                undefined,
                parseFloat(salesReturn.net_total.toFixed(2)),
                undefined,//Purchase return
                undefined,//Loss
            ]);

            let dt = new Date(salesReturn.date);
            let dtStr = dt.getFullYear() + "-" + dt.getMonth() + "-" + dt.getDate();
            if (!dailySalesReturns[dtStr]) {
                dailySalesReturns[dtStr] = 0;
            }
            dailySalesReturns[dtStr] += parseFloat(salesReturn.net_total);
        }

        for (let salesReturnDate in dailySalesReturns) {
            let parts = salesReturnDate.split('-');
            calendarSalesReturnData.push([
                new Date(parts[0], parts[1], parts[2]),
                parseFloat(dailySalesReturns[salesReturnDate].toFixed(2)),
            ]);
        }

        calendarAllSalesReturns = calendarSalesReturnData
        setCalendarAllSalesReturns(calendarSalesReturnData);


        //purchase returns
        let dailyPurchaseReturns = [];
        for (const purchaseReturn of props.allPurchaseReturns) {
            salesData.push([
                new Date(purchaseReturn.date),
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                parseFloat(purchaseReturn.net_total.toFixed(2)),
                undefined,//Loss
            ]);

            let dt = new Date(purchaseReturn.date);
            let dtStr = dt.getFullYear() + "-" + dt.getMonth() + "-" + dt.getDate();
            if (!dailyPurchaseReturns[dtStr]) {
                dailyPurchaseReturns[dtStr] = 0;
            }
            dailyPurchaseReturns[dtStr] += parseFloat(purchaseReturn.net_total);
        }

        allSales = salesData;
        setAllSales(salesData);

        for (let purchaseReturnDate in dailyPurchaseReturns) {
            let parts = purchaseReturnDate.split('-');
            calendarPurchaseReturnData.push([
                new Date(parts[0], parts[1], parts[2]),
                parseFloat(dailyPurchaseReturns[purchaseReturnDate].toFixed(2)),
            ]);
        }

        calendarAllPurchaseReturns = calendarPurchaseReturnData
        setCalendarAllPurchaseReturns(calendarPurchaseReturnData);
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

    const [calendarSalesOptions, setCalendarSalesOptions] = useState({
        title: 'Daily Sales',
    });

    const [calendarSalesProfitOptions, setCalendarSalesProfitOptions] = useState({
        title: 'Daily Profit',
    });
    const [calendarExpenseOptions, setCalendarExpenseOptions] = useState({
        title: 'Daily Expenses',
    });
    const [calendarPurchaseOptions, setCalendarPurchaseOptions] = useState({
        title: 'Daily Purchases',
    });

    const [calendarSalesReturnOptions, setCalendarSalesReturnOptions] = useState({
        title: 'Daily Sales Returns',
    });

    const [calendarPurchaseReturnOptions, setCalendarPurchaseReturnOptions] = useState({
        title: 'Daily Purchase Returns',
    });




    useEffect(() => {
        // getAllOrders();

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <>
            <div className="container-fluid p-0">
                <h2>Sales vs Sales Profit vs Expense vs Purchase vs Sales Return vs Purchase Return</h2>
                <div className="row">
                    {allSales && allSales.length > 0 ? <Chart
                        chartType="AnnotationChart"
                        width="100%"
                        height="400px"
                        data={allSales}
                        options={salesOptions}
                    /> : ""}
                </div>
                <br /><br />
                <div className="row">
                    {calendarAllSales && calendarAllSales.length > 0 ? <Chart
                        chartType="Calendar"
                        width="100%"
                        height="400px"
                        data={calendarAllSales}
                        options={calendarSalesOptions}
                    /> : ""}
                </div>
                <div className="row">
                    {calendarAllSalesProfit && calendarAllSalesProfit.length > 0 ? <Chart
                        chartType="Calendar"
                        width="100%"
                        height="400px"
                        data={calendarAllSalesProfit}
                        options={calendarSalesProfitOptions}
                    /> : ""}
                </div>
                <div className="row">
                    {calendarAllExpenses && calendarAllExpenses.length > 0 ? <Chart
                        chartType="Calendar"
                        width="100%"
                        height="400px"
                        data={calendarAllExpenses}
                        options={calendarExpenseOptions}
                    /> : ""}
                </div>

                <div className="row" style={{ overflowY: "scroll", height: "700px" }} >
                    {calendarAllPurchases && calendarAllPurchases.length > 0 ? <Chart
                        chartType="Calendar"
                        width="100%"
                        height="700px"
                        data={calendarAllPurchases}
                        options={calendarPurchaseOptions}
                    /> : ""}
                </div>

                <div className="row"  >
                    {calendarAllSalesReturns && calendarAllSalesReturns.length > 0 ? <Chart
                        chartType="Calendar"
                        width="100%"
                        height="400px"
                        data={calendarAllSalesReturns}
                        options={calendarSalesReturnOptions}
                    /> : ""}
                </div>

                <div className="row"  >
                    {calendarAllPurchaseReturns && calendarAllPurchaseReturns.length > 0 ? <Chart
                        chartType="Calendar"
                        width="100%"
                        height="400px"
                        data={calendarAllPurchaseReturns}
                        options={calendarPurchaseReturnOptions}
                    /> : ""}
                </div>
            </div>
        </>
    );
});

export default AllSales;
