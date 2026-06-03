import React, { useMemo } from "react";
import { Chart } from "react-google-charts";

export function TopCustomersChart({ customers, storeId }) {
    const data = useMemo(() => {
        const rows = customers
            .map(c => {
                const sd = c.stores?.[storeId] || {};
                return { name: c.name || "Unknown", sales: sd.sales_amount || 0 };
            })
            .filter(r => r.sales > 0 && r.name !== "UNKNOWN")
            .sort((a, b) => b.sales - a.sales)
            .slice(0, 10)
            .map(r => [r.name, parseFloat(r.sales.toFixed(2))]);
        if (rows.length === 0) return null;
        return [["Customer", "Revenue (SAR)"], ...rows];
    }, [customers, storeId]);

    if (!data) return <p className="text-muted small">No customer data</p>;
    return (
        <Chart
            chartType="BarChart"
            data={data}
            options={{
                title: "Top 10 Customers by Revenue",
                colors: ["#4e73df"],
                legend: { position: "none" },
                hAxis: { title: "SAR" },
                chartArea: { width: "60%", height: "80%" },
            }}
            width="100%"
            height="340px"
        />
    );
}

export function OutstandingReceivablesChart({ customers }) {
    const data = useMemo(() => {
        const rows = customers
            .filter(c => (c.credit_balance || 0) > 0)
            .sort((a, b) => b.credit_balance - a.credit_balance)
            .slice(0, 10)
            .map(c => [c.name || "Unknown", parseFloat((c.credit_balance || 0).toFixed(2))]);
        if (rows.length === 0) return null;
        return [["Customer", "Outstanding (SAR)"], ...rows];
    }, [customers]);

    if (!data) return <p className="text-muted small">No outstanding balances</p>;
    return (
        <Chart
            chartType="BarChart"
            data={data}
            options={{
                title: "Outstanding Receivables by Customer",
                colors: ["#e74a3b"],
                legend: { position: "none" },
                hAxis: { title: "SAR" },
                chartArea: { width: "60%", height: "80%" },
            }}
            width="100%"
            height="320px"
        />
    );
}
