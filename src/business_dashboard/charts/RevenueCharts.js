import React, { useMemo } from "react";
import { Chart } from "react-google-charts";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function monthKey(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(key) {
    const [y, m] = key.split("-");
    return `${MONTH_NAMES[parseInt(m, 10) - 1]} ${y}`;
}

// Build a map of { key: value } from any array using a date field and value getter
function buildMap(arr, dateFn, valueFn) {
    const map = {};
    arr.forEach(item => {
        const key = monthKey(dateFn(item));
        map[key] = (map[key] || 0) + valueFn(item);
    });
    return map;
}

// ── Chart 1: Monthly P&L Trend ───────────────────────────────────────────────
// Revenue  = Sales − Sales Returns  (P&L formula)
// Expense  = Expenses + Purchases − Purchase Returns
// Profit   = Revenue − Expense
export function MonthlyRevenueTrendChart({ store, orders, returns, purchases, purchaseReturns, expenses }) {
    const data = useMemo(() => {
        const salesMap     = buildMap(orders,          o => o.date, o => o.net_total || 0);
        const returnMap    = buildMap(returns,          r => r.date, r => r.net_total || 0);
        const purchaseMap  = buildMap(purchases,       p => p.date, p => p.net_total || 0);
        const purRetMap    = buildMap(purchaseReturns, p => p.date, p => p.net_total || 0);
        const expenseMap   = buildMap(expenses,        e => e.date, e => e.amount   || 0);

        const allKeys = Array.from(new Set([
            ...Object.keys(salesMap),
            ...Object.keys(returnMap),
            ...Object.keys(purchaseMap),
            ...Object.keys(purRetMap),
            ...Object.keys(expenseMap),
        ])).sort();

        if (allKeys.length === 0) return null;

        const rows = allKeys.map(k => {
            const revenue = (salesMap[k] || 0) - (returnMap[k] || 0);
            const expense = (expenseMap[k] || 0) + (purchaseMap[k] || 0) - (purRetMap[k] || 0);
            const profit  = revenue - expense;
            return [
                monthLabel(k),
                parseFloat(revenue.toFixed(2)),
                parseFloat(expense.toFixed(2)),
                parseFloat(profit.toFixed(2)),
            ];
        });

        return [["Month", "Net Revenue (SAR)", "Expense (SAR)", "Profit/Loss (SAR)"], ...rows];
    }, [orders, returns, purchases, purchaseReturns, expenses]);

    if (!data) return <p className="text-muted small">No data</p>;
    return (
        <Chart
            chartType="ComboChart"
            data={data}
            options={{
                title: "Monthly P&L Trend",
                seriesType: "bars",
                series: {
                    0: { type: "bars",  color: "#4e73df" },
                    1: { type: "bars",  color: "#e74a3b" },
                    2: { type: "line",  color: "#1cc88a", pointSize: 5, lineWidth: 2 },
                },
                legend: { position: "top" },
                vAxis: { title: "SAR" },
                chartArea: { width: "78%", height: "62%" },
            }}
            width="100%"
            height="340px"
        />
    );
}

// ── Chart 2: Cumulative Net Revenue (P&L Revenue) ────────────────────────────
export function CumulativeRevenueChart({ orders, returns }) {
    const data = useMemo(() => {
        const salesMap  = buildMap(orders,   o => o.date, o => o.net_total || 0);
        const returnMap = buildMap(returns,  r => r.date, r => r.net_total || 0);

        const keys = Array.from(new Set([...Object.keys(salesMap), ...Object.keys(returnMap)])).sort();
        if (keys.length === 0) return null;

        let cumulative = 0;
        const rows = keys.map(k => {
            cumulative += (salesMap[k] || 0) - (returnMap[k] || 0);
            return [monthLabel(k), parseFloat(cumulative.toFixed(2))];
        });

        return [["Month", "Cumulative Net Revenue (SAR)"], ...rows];
    }, [orders, returns]);

    if (!data) return <p className="text-muted small">No data</p>;
    return (
        <Chart
            chartType="AreaChart"
            data={data}
            options={{
                title: "Cumulative Net Revenue Growth",
                colors: ["#4e73df"],
                legend: { position: "none" },
                vAxis: { title: "SAR" },
                chartArea: { width: "80%", height: "65%" },
                areaOpacity: 0.3,
            }}
            width="100%"
            height="300px"
        />
    );
}

// ── Chart 3: Last 30 Days Daily Sales (gross — operational view) ─────────────
export function Last30DaysSalesChart({ orders }) {
    const data = useMemo(() => {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 30);
        const map = {};
        orders.forEach(o => {
            const d = new Date(o.date);
            if (d < cutoff) return;
            const key = d.toISOString().slice(0, 10);
            map[key] = (map[key] || 0) + (o.net_total || 0);
        });
        const keys = Object.keys(map).sort();
        if (keys.length === 0) return null;
        return [["Date", "Gross Sales (SAR)"], ...keys.map(k => [k, parseFloat(map[k].toFixed(2))])];
    }, [orders]);

    if (!data) return <p className="text-muted small">No orders in last 30 days</p>;
    return (
        <Chart
            chartType="ColumnChart"
            data={data}
            options={{
                title: "Last 30 Days — Daily Sales",
                colors: ["#36b9cc"],
                legend: { position: "none" },
                vAxis: { title: "SAR" },
                chartArea: { width: "80%", height: "65%" },
            }}
            width="100%"
            height="300px"
        />
    );
}

// ── Chart 4: Sales vs Returns by Month ───────────────────────────────────────
export function SalesVsReturnsChart({ orders, returns }) {
    const data = useMemo(() => {
        const salesMap  = buildMap(orders,  o => o.date, o => o.net_total || 0);
        const returnMap = buildMap(returns, r => r.date, r => r.net_total || 0);

        const keys = Array.from(new Set([...Object.keys(salesMap), ...Object.keys(returnMap)])).sort();
        if (keys.length === 0) return null;

        const rows = keys.map(k => [
            monthLabel(k),
            parseFloat((salesMap[k] || 0).toFixed(2)),
            parseFloat((returnMap[k] || 0).toFixed(2)),
        ]);
        return [["Month", "Gross Sales (SAR)", "Returns (SAR)"], ...rows];
    }, [orders, returns]);

    if (!data) return <p className="text-muted small">No data</p>;
    return (
        <Chart
            chartType="ColumnChart"
            data={data}
            options={{
                title: "Sales vs Returns by Month",
                colors: ["#1cc88a", "#e74a3b"],
                legend: { position: "top" },
                vAxis: { title: "SAR" },
                chartArea: { width: "80%", height: "65%" },
            }}
            width="100%"
            height="320px"
        />
    );
}
