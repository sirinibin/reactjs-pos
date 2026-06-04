import React, { useMemo } from "react";
import { Chart } from "react-google-charts";

function fmtT(n) {
    if (!n && n !== 0) return "0.00";
    return Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function tooltipHtml(title, titleColor, lines) {
    const headerStyle  = `font-size:0.8rem;font-weight:700;color:${titleColor};margin-bottom:6px;`;
    const rowStyle     = "font-size:0.75rem;line-height:1.7;white-space:nowrap;";
    const dividerStyle = "border-top:1px solid #495057;margin-top:6px;padding-top:6px;";
    const labelStyle   = "color:#adb5bd;margin-right:4px;";

    let html = `<div style="background:#212529;color:#f8f9fa;padding:10px 14px;border-radius:6px;box-shadow:0 4px 14px rgba(0,0,0,.35);">`;
    html += `<div style="${headerStyle}">${title}</div>`;
    lines.forEach(l => {
        const wrap = l.divider ? dividerStyle : "";
        const val  = l.bold
            ? `<strong style="color:${l.color || "#f8f9fa"}">${l.value}</strong>`
            : `<span style="color:${l.color || "#f8f9fa"}">${l.value}</span>`;
        html += `<div style="${rowStyle}${wrap}"><span style="${labelStyle}">${l.label}:</span>${val}</div>`;
    });
    html += `</div>`;
    return html;
}

// Revenue = Σ (unit_price × quantity) across all sales order line items for this product.
// productSummaries: array of { product_name, sales_revenue, qtn_revenue, total_revenue }
// from GET /v1/dashboard/products. Already sorted by total_revenue descending.
export function TopProductsChart({ productSummaries, store }) {
    const qtnInvoiceAccounting = store?.settings?.quotation_invoice_accounting === true;

    const data = useMemo(() => {
        const top = (productSummaries || []).slice(0, 10);
        if (top.length === 0) return null;

        const header = ["Product", "Revenue (SAR)", { role: "tooltip", type: "string", p: { html: true } }];
        const rows = top.map(r => {
            const lines = [
                { label: "Revenue",      value: `SAR ${fmtT(r.total_revenue)}`, bold: true, color: "#74c0fc" },
                { divider: true, label: "Formula", value: "Σ (unit_price × quantity)" },
                { label: "Sales Orders", value: `SAR ${fmtT(r.sales_revenue)}` },
                ...(qtnInvoiceAccounting ? [{ label: "Qtn. Invoice Orders", value: `SAR ${fmtT(r.qtn_revenue || 0)}` }] : []),
            ];
            return [r.product_name, parseFloat((r.total_revenue || 0).toFixed(2)), tooltipHtml(r.product_name, "#74c0fc", lines)];
        });
        return [header, ...rows];
    }, [productSummaries, qtnInvoiceAccounting]);

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
                tooltip: { isHtml: true },
            }}
            width="100%"
            height="360px"
        />
    );
}


// categorySummaries: array of { category_name, sales, profit } from /v1/dashboard/categories
export function CategoryRevenuePieChart({ categorySummaries }) {
    const data = useMemo(() => {
        const entries = (categorySummaries || []).filter(c => c.sales > 0).slice(0, 12);
        if (entries.length === 0) return null;

        const grandTotal = entries.reduce((s, c) => s + c.sales, 0);
        const header = ["Category", "Revenue (SAR)", { role: "tooltip", type: "string", p: { html: true } }];
        const rows = entries.map(c => {
            const pct = grandTotal > 0 ? ((c.sales / grandTotal) * 100).toFixed(1) : "0.0";
            const lines = [
                { label: "Revenue", value: `SAR ${fmtT(c.sales)}`, bold: true, color: "#74c0fc" },
                { label: "Share",   value: `${pct}% of category revenue` },
                { divider: true, label: "Formula", value: "product_stores.sales (server-aggregated)" },
                { label: "Profit",  value: `SAR ${fmtT(c.profit)}` },
                { label: "Margin",  value: c.sales > 0 ? `${((c.profit / c.sales) * 100).toFixed(1)}%` : "—" },
            ];
            return [c.category_name, parseFloat(c.sales.toFixed(2)), tooltipHtml(c.category_name, "#74c0fc", lines)];
        });
        return [header, ...rows];
    }, [categorySummaries]);

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
                tooltip: { isHtml: true },
            }}
            width="100%"
            height="340px"
        />
    );
}

// categorySummaries: same array as CategoryRevenuePieChart
export function CategoryMarginChart({ categorySummaries }) {
    const data = useMemo(() => {
        const entries = (categorySummaries || [])
            .filter(c => c.sales > 0)
            .map(c => ({ ...c, margin: parseFloat(((c.profit / c.sales) * 100).toFixed(1)) }))
            .sort((a, b) => b.margin - a.margin)
            .slice(0, 10);
        if (entries.length === 0) return null;

        const header = ["Category", "Profit Margin (%)", { role: "tooltip", type: "string", p: { html: true } }];
        const rows = entries.map(c => {
            const lines = [
                { label: "Margin",  value: `${c.margin}%`, bold: true, color: "#1cc88a" },
                { divider: true, label: "Formula", value: "(sales_profit ÷ sales) × 100" },
                { label: "Revenue", value: `SAR ${fmtT(c.sales)}` },
                { label: "Profit",  value: `SAR ${fmtT(c.profit)}` },
                { label: "Source",  value: "server-aggregated (product_stores)" },
            ];
            return [c.category_name, c.margin, tooltipHtml(c.category_name, "#1cc88a", lines)];
        });
        return [header, ...rows];
    }, [categorySummaries]);

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
                tooltip: { isHtml: true },
            }}
            width="100%"
            height="340px"
        />
    );
}

// stockSummary: { out_of_stock, low_stock, healthy_stock, total } from /v1/dashboard/stock
export function StockHealthChart({ stockSummary }) {
    const data = useMemo(() => {
        const { out_of_stock: zero = 0, low_stock: low = 0, healthy_stock: ok = 0, total = 0 } = stockSummary || {};
        if (total === 0) return null;

        const slices = [
            { label: "Out of Stock",   count: zero, color: "#e74a3b", condition: "stock ≤ 0" },
            { label: "Low Stock (< 5)", count: low,  color: "#f6c23e", condition: "1 ≤ stock < 5" },
            { label: "Healthy Stock",  count: ok,   color: "#1cc88a", condition: "stock ≥ 5" },
        ].filter(s => s.count > 0);

        const header = ["Status", "Count", { role: "tooltip", type: "string", p: { html: true } }];
        const rows = slices.map(s => {
            const pct = total > 0 ? ((s.count / total) * 100).toFixed(1) : "0.0";
            const lines = [
                { label: "Products", value: `${s.count.toLocaleString()} of ${total.toLocaleString()}`, bold: true, color: s.color },
                { label: "Share",    value: `${pct}% of all products` },
                { divider: true, label: "Formula", value: `count of products where ${s.condition}` },
            ];
            return [s.label, s.count, tooltipHtml(s.label, s.color, lines)];
        });

        return [header, ...rows];
    }, [stockSummary]);

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
                tooltip: { isHtml: true },
            }}
            width="100%"
            height="300px"
        />
    );
}
