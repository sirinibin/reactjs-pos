import React, { useMemo } from "react";
import { Chart } from "react-google-charts";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const ACCOUNT_TYPE_LABELS = {
    asset: "Asset",
    liability: "Liability",
    capital: "Capital",
    expense: "Expense",
    drawing: "Drawing",
    "": "General",
};

export function AccountBalancesChart({ accounts }) {
    const data = useMemo(() => {
        const map = {};
        accounts.forEach(a => {
            const type = ACCOUNT_TYPE_LABELS[a.type || ""] || (a.type || "General");
            if (!map[type]) map[type] = 0;
            map[type] += Math.abs(a.balance || 0);
        });
        const rows = Object.entries(map)
            .filter(([, v]) => v > 0)
            .sort((a, b) => b[1] - a[1])
            .map(([k, v]) => [k, parseFloat(v.toFixed(2))]);
        if (rows.length === 0) return null;
        return [["Account Type", "Balance (SAR)"], ...rows];
    }, [accounts]);

    if (!data) return <p className="text-muted small">No account data</p>;
    return (
        <Chart
            chartType="ColumnChart"
            data={data}
            options={{
                title: "Account Balances by Type",
                colors: ["#36b9cc"],
                legend: { position: "none" },
                vAxis: { title: "SAR" },
                chartArea: { width: "75%", height: "65%" },
            }}
            width="100%"
            height="300px"
        />
    );
}

export function VendorSpendPieChart({ purchases }) {
    const data = useMemo(() => {
        const map = {};
        purchases.forEach(p => {
            const name = p.vendor_name || "Unknown";
            map[name] = (map[name] || 0) + (p.net_total || 0);
        });
        const rows = Object.entries(map)
            .filter(([, v]) => v > 0)
            .sort((a, b) => b[1] - a[1])
            .map(([k, v]) => [k, parseFloat(v.toFixed(2))]);
        if (rows.length === 0) return null;
        return [["Vendor", "Amount (SAR)"], ...rows];
    }, [purchases]);

    if (!data) return <p className="text-muted small">No purchase data</p>;
    return (
        <Chart
            chartType="PieChart"
            data={data}
            options={{
                title: "Purchase Spend by Vendor",
                legend: { position: "right" },
                chartArea: { width: "65%", height: "75%" },
                pieSliceText: "percentage",
            }}
            width="100%"
            height="300px"
        />
    );
}

// Net Revenue = Sales − Sales Returns  (P&L formula)
// P&L Expense = Expenses + Purchases − Purchase Returns
export function PurchaseVsSalesChart({ orders, returns, purchases, purchaseReturns, expenses }) {
    const data = useMemo(() => {
        function buildMap(arr, dateFn, valueFn) {
            const map = {};
            arr.forEach(item => {
                const d = new Date(dateFn(item));
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                map[key] = (map[key] || 0) + valueFn(item);
            });
            return map;
        }
        const salesMap    = buildMap(orders,          o => o.date, o => o.net_total || 0);
        const returnMap   = buildMap(returns,          r => r.date, r => r.net_total || 0);
        const purchaseMap = buildMap(purchases,        p => p.date, p => p.net_total || 0);
        const purRetMap   = buildMap(purchaseReturns,  p => p.date, p => p.net_total || 0);
        const expenseMap  = buildMap(expenses,         e => e.date, e => e.amount    || 0);

        const allKeys = Array.from(new Set([
            ...Object.keys(salesMap), ...Object.keys(returnMap),
            ...Object.keys(purchaseMap), ...Object.keys(purRetMap),
            ...Object.keys(expenseMap),
        ])).sort();

        if (allKeys.length === 0) return null;

        const rows = allKeys.map(k => {
            const [y, m] = k.split("-");
            const label   = `${MONTH_NAMES[parseInt(m, 10) - 1]} ${y}`;
            const revenue = (salesMap[k] || 0) - (returnMap[k] || 0);
            const expense = (expenseMap[k] || 0) + (purchaseMap[k] || 0) - (purRetMap[k] || 0);
            return [label, parseFloat(revenue.toFixed(2)), parseFloat(expense.toFixed(2))];
        });
        return [["Month", "Net Revenue (SAR)", "P&L Expense (SAR)"], ...rows];
    }, [orders, returns, purchases, purchaseReturns, expenses]);

    if (!data) return <p className="text-muted small">No data</p>;
    return (
        <Chart
            chartType="LineChart"
            data={data}
            options={{
                title: "Monthly Net Revenue vs P&L Expense",
                colors: ["#1cc88a", "#e74a3b"],
                legend: { position: "top" },
                vAxis: { title: "SAR" },
                chartArea: { width: "80%", height: "65%" },
                pointSize: 4,
            }}
            width="100%"
            height="320px"
        />
    );
}
