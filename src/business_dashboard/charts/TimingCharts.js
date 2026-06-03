import React, { useMemo } from "react";
import { Chart } from "react-google-charts";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function SalesByHourChart({ orders }) {
    const data = useMemo(() => {
        const counts = Array(24).fill(0);
        const totals = Array(24).fill(0);
        orders.forEach(o => {
            const h = new Date(o.date).getHours();
            counts[h]++;
            totals[h] += o.net_total || 0;
        });
        const rows = totals.map((v, h) => [`${String(h).padStart(2, "0")}:00`, parseFloat(v.toFixed(2)), counts[h]]);
        return [["Hour", "Revenue (SAR)", { role: "annotation" }], ...rows];
    }, [orders]);

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
                annotations: { alwaysOutside: false, textStyle: { fontSize: 9 } },
            }}
            width="100%"
            height="320px"
        />
    );
}

export function SalesByDayOfWeekChart({ orders }) {
    const data = useMemo(() => {
        const counts = Array(7).fill(0);
        const totals = Array(7).fill(0);
        orders.forEach(o => {
            const dow = new Date(o.date).getDay(); // 0=Sun
            counts[dow]++;
            totals[dow] += o.net_total || 0;
        });
        const rows = DAY_NAMES.map((name, i) => [name, parseFloat(totals[i].toFixed(2)), counts[i]]);
        return [["Day", "Revenue (SAR)", "Orders"], ...rows];
    }, [orders]);

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
            }}
            width="100%"
            height="320px"
        />
    );
}

export function SalesCalendarChart({ orders }) {
    const data = useMemo(() => {
        const map = {};
        orders.forEach(o => {
            const key = new Date(o.date).toISOString().slice(0, 10);
            map[key] = (map[key] || 0) + (o.net_total || 0);
        });
        const rows = Object.entries(map).map(([k, v]) => [new Date(k), parseFloat(v.toFixed(2))]);
        if (rows.length === 0) return null;
        return [["Date", "Revenue (SAR)"], ...rows];
    }, [orders]);

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
            }}
            width="100%"
            height="180px"
        />
    );
}
