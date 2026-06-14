import React, { useMemo } from "react";
import { Chart } from "react-google-charts";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// All three charts now accept `dailyData` — an array of DashboardDaily records
// from the /v1/dashboard/daily endpoint. Each record has:
//   date_str: "2025-01-15", sales_amount: number, hourly_sales: [24 floats]

export function SalesByHourChart({ dailyData }) {
    const data = useMemo(() => {
        const totals = new Array(24).fill(0);
        (dailyData || []).forEach(d => {
            (d.hourly_sales || []).forEach((amt, h) => {
                if (h >= 0 && h < 24) totals[h] += amt;
            });
        });
        const rows = totals.map((v, h) => [
            `${String(h).padStart(2, "0")}:00`,
            parseFloat(v.toFixed(2)),
        ]);
        return [["Hour", "Revenue (SAR)"], ...rows];
    }, [dailyData]);

    return (
        <Chart
            chartType="ColumnChart"
            data={data}
            options={{
                title: "Sales by Hour of Day",
                colors: ["#4e73df"],
                legend: { position: "none" },
                vAxis: { title: "Revenue (SAR)" },
                hAxis: { title: "Hour" },
                chartArea: { width: "80%", height: "65%" },
                tooltip: { trigger: 'selection' },
            }}
            width="100%"
            height="320px"
        />
    );
}

export function SalesByDayOfWeekChart({ dailyData }) {
    const data = useMemo(() => {
        const totals = new Array(7).fill(0);
        const counts = new Array(7).fill(0);
        (dailyData || []).forEach(d => {
            // Use noon to avoid DST boundary issues when parsing YYYY-MM-DD
            const dow = new Date(d.date_str + "T12:00:00").getDay();
            totals[dow] += d.sales_amount || 0;
            counts[dow] += d.sales_count  || 0;
        });
        const rows = DAY_NAMES.map((name, i) => [name, parseFloat(totals[i].toFixed(2)), counts[i]]);
        return [["Day", "Revenue (SAR)", "Orders"], ...rows];
    }, [dailyData]);

    return (
        <Chart
            chartType="ColumnChart"
            data={data}
            options={{
                title: "Sales by Day of Week",
                colors: ["#36b9cc"],
                legend: { position: "none" },
                vAxis: { title: "Revenue (SAR)" },
                chartArea: { width: "80%", height: "65%" },
                tooltip: { trigger: 'selection' },
            }}
            width="100%"
            height="320px"
        />
    );
}

export function SalesCalendarChart({ dailyData }) {
    const data = useMemo(() => {
        const rows = (dailyData || [])
            .filter(d => (d.sales_amount || 0) > 0)
            .map(d => [new Date(d.date_str + "T12:00:00"), parseFloat((d.sales_amount || 0).toFixed(2))]);
        if (rows.length === 0) return null;
        return [["Date", "Revenue (SAR)"], ...rows];
    }, [dailyData]);

    if (!data) return <p className="text-muted small">No data</p>;
    return (
        <Chart
            chartType="Calendar"
            data={data}
            options={{
                title: "Daily Sales Activity",
                calendar: {
                    cellSize: 14,
                    dayOfWeekLabel: { fontName: "Arial", fontSize: 10 },
                },
                tooltip: { trigger: 'none' },
            }}
            width="100%"
            height="180px"
        />
    );
}
