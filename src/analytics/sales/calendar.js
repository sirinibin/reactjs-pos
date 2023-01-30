import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import Cookies from "universal-cookie";
import { Chart } from "react-google-charts";



const Calendar = forwardRef((props, ref) => {
    useImperativeHandle(ref, () => ({
        init() {
            if (props.allOrders.length > 0) {
                makeData();
            }
        }
    }));



    let [calendarAllSales, setCalendarAllSales] = useState([]);
    let [calendarAllSalesProfit, setCalendarAllSalesProfit] = useState([]);
    let [calendarAllExpenses, setCalendarAllExpenses] = useState([]);
    let [calendarAllPurchases, setCalendarAllPurchases] = useState([]);
    let [calendarAllSalesReturns, setCalendarAllSalesReturns] = useState([]);
    let [calendarAllPurchaseReturns, setCalendarAllPurchaseReturns] = useState([]);



    function makeData() {

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
            let dt = new Date(purchaseReturn.date);
            let dtStr = dt.getFullYear() + "-" + dt.getMonth() + "-" + dt.getDate();
            if (!dailyPurchaseReturns[dtStr]) {
                dailyPurchaseReturns[dtStr] = 0;
            }
            dailyPurchaseReturns[dtStr] += parseFloat(purchaseReturn.net_total);
        }


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
        console.log("Inside useEffect");

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);


    return (
        <>
            <div className="container-fluid p-0">
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

export default Calendar;
