import React, { useMemo } from "react";
import { Chart } from "react-google-charts";

export function TopProductsChart({ orders }) {
    const data = useMemo(() => {
        const map = {};
        orders.forEach(o => {
            (o.products || []).forEach(p => {
                const name = p.name || "Unknown";
                if (!map[name]) map[name] = 0;
                map[name] += (p.unit_price || 0) * (p.quantity || 0);
            });
        });
        const top = Object.entries(map)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([k, v]) => [k, parseFloat(v.toFixed(2))]);
        if (top.length === 0) return null;
        return [["Product", "Revenue (SAR)"], ...top];
    }, [orders]);

    if (!data) return <p className="text-muted small">No product sales data</p>;
    return (
        <Chart
            chartType="BarChart"
            data={data}
            options={{
                title: "Top 10 Products by Revenue",
                colors: ["#4e73df"],
                legend: { position: "none" },
                hAxis: { title: "SAR" },
                chartArea: { width: "65%", height: "80%" },
            }}
            width="100%"
            height="360px"
        />
    );
}

function buildCategoryMap(products, storeId) {
    const map = {};
    products.forEach(p => {
        const sd = p.product_stores?.[storeId] || {};
        const cats = Array.isArray(p.category_name) ? p.category_name : (p.category_name ? [p.category_name] : []);
        cats.forEach(cat => {
            if (!cat) return;
            if (!map[cat]) map[cat] = { sales: 0, profit: 0 };
            map[cat].sales += sd.sales || 0;
            map[cat].profit += sd.sales_profit || 0;
        });
    });
    return map;
}

export function CategoryRevenuePieChart({ products, storeId }) {
    const data = useMemo(() => {
        const map = buildCategoryMap(products, storeId);
        const rows = Object.entries(map)
            .filter(([, v]) => v.sales > 0)
            .sort((a, b) => b[1].sales - a[1].sales)
            .slice(0, 12)
            .map(([k, v]) => [k, parseFloat(v.sales.toFixed(2))]);
        if (rows.length === 0) return null;
        return [["Category", "Revenue (SAR)"], ...rows];
    }, [products, storeId]);

    if (!data) return <p className="text-muted small">No category data</p>;
    return (
        <Chart
            chartType="PieChart"
            data={data}
            options={{
                title: "Category Revenue Breakdown",
                legend: { position: "right" },
                chartArea: { width: "60%", height: "75%" },
                pieSliceText: "percentage",
            }}
            width="100%"
            height="340px"
        />
    );
}

export function CategoryMarginChart({ products, storeId }) {
    const data = useMemo(() => {
        const map = buildCategoryMap(products, storeId);
        const rows = Object.entries(map)
            .filter(([, v]) => v.sales > 0)
            .map(([k, v]) => [k, parseFloat(((v.profit / v.sales) * 100).toFixed(1))])
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
        if (rows.length === 0) return null;
        return [["Category", "Profit Margin (%)"], ...rows];
    }, [products, storeId]);

    if (!data) return <p className="text-muted small">No margin data</p>;
    return (
        <Chart
            chartType="BarChart"
            data={data}
            options={{
                title: "Category Profit Margin %",
                colors: ["#1cc88a"],
                legend: { position: "none" },
                hAxis: { title: "Margin %", minValue: 0 },
                chartArea: { width: "65%", height: "80%" },
            }}
            width="100%"
            height="340px"
        />
    );
}

export function StockHealthChart({ products, storeId }) {
    const data = useMemo(() => {
        let zero = 0, low = 0, ok = 0;
        products.forEach(p => {
            const stock = p.product_stores?.[storeId]?.stock ?? 0;
            if (stock <= 0) zero++;
            else if (stock < 5) low++;
            else ok++;
        });
        if (zero + low + ok === 0) return null;
        return [
            ["Status", "Count"],
            ["Out of Stock", zero],
            ["Low Stock (< 5)", low],
            ["Healthy Stock", ok],
        ];
    }, [products, storeId]);

    if (!data) return <p className="text-muted small">No product data</p>;
    return (
        <Chart
            chartType="PieChart"
            data={data}
            options={{
                title: "Stock Health Overview",
                colors: ["#e74a3b", "#f6c23e", "#1cc88a"],
                legend: { position: "right" },
                chartArea: { width: "65%", height: "75%" },
                pieHole: 0.4,
                pieSliceText: "value",
            }}
            width="100%"
            height="300px"
        />
    );
}
