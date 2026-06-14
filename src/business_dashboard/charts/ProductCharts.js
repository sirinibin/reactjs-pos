import React, { useMemo } from "react";
import { Chart } from "react-google-charts";
import { tooltipHtml } from './chartTooltipSetup';

function fmtT(n) {
    if (!n && n !== 0) return "0.00";
    return Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}


// Revenue = Σ (unit_price × quantity) across all sales order line items for this product.
// productSummaries: array of { product_name, sales_revenue, qtn_revenue, total_revenue }
// from GET /v1/dashboard/products. Already sorted by total_revenue descending.
export function TopProductsChart({ productSummaries, store, filters }) {
    const qtnInvoiceAccounting = store?.settings?.quotation_invoice_accounting === true;
    const vatPercent           = store?.vat_percent || 15;

    const data = useMemo(() => {
        const top = (productSummaries || []).slice(0, 10);
        if (top.length === 0) return null;

        const header = ["Product", "Revenue (SAR)", { role: "tooltip", type: "string", p: { html: true } }];
        const rows = top.map(r => {
            const rev             = r.total_revenue || 0;
            const revVat          = rev * vatPercent / (100 + vatPercent);
            const revWithoutVAT   = rev - revVat;
            const lines = [
                { label: "Formula",               value: "Σ (unit_price × quantity)" },
                { label: "Sales Orders",          value: `${fmtT(r.sales_revenue)}` },
                ...(qtnInvoiceAccounting ? [{ label: "Qtn. Invoice Orders", value: `${fmtT(r.qtn_revenue || 0)}` }] : []),
                { divider: true, label: "Revenue (with VAT)",    value: `SAR ${fmtT(rev)}`, bold: true, color: "#74c0fc" },
                { label: `VAT ${vatPercent}%`,                    value: `− ${fmtT(revVat)}` },
                { divider: true, label: "Revenue (without VAT)", value: `SAR ${fmtT(revWithoutVAT)}`, bold: true, color: "#74c0fc" },
            ];
            return [r.product_name, parseFloat(rev.toFixed(2)), tooltipHtml(r.product_name, "#74c0fc", lines, store, filters)];
        });
        return [header, ...rows];
    }, [productSummaries, qtnInvoiceAccounting, vatPercent, store, filters]);

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
export function CategoryRevenuePieChart({ categorySummaries, store, filters }) {
    const vatPercent = store?.vat_percent || 15;
    const data = useMemo(() => {
        const entries = (categorySummaries || []).filter(c => c.sales > 0).slice(0, 12);
        if (entries.length === 0) return null;

        const grandTotal = entries.reduce((s, c) => s + c.sales, 0);
        const header = ["Category", "Revenue (SAR)", { role: "tooltip", type: "string", p: { html: true } }];
        const rows = entries.map(c => {
            const pct             = grandTotal > 0 ? ((c.sales / grandTotal) * 100).toFixed(1) : "0.0";
            const revVat          = c.sales * vatPercent / (100 + vatPercent);
            const revWithoutVAT   = c.sales - revVat;
            const profitVat       = c.profit * vatPercent / (100 + vatPercent);
            const profitWithoutVAT = c.profit - profitVat;
            const lines = [
                { label: "Share",                value: `${pct}% of category revenue` },
                { label: "Formula",              value: "product_stores.sales (server-aggregated)" },
                { label: "Profit (with VAT)",    value: `${fmtT(c.profit)}` },
                { label: "Profit (without VAT)", value: `${fmtT(profitWithoutVAT)}` },
                { label: "Margin",               value: c.sales > 0 ? `${((c.profit / c.sales) * 100).toFixed(1)}%` : "—" },
                { divider: true, label: "Revenue (with VAT)",    value: `SAR ${fmtT(c.sales)}`, bold: true, color: "#74c0fc" },
                { label: `VAT ${vatPercent}%`,                    value: `− ${fmtT(revVat)}` },
                { divider: true, label: "Revenue (without VAT)", value: `SAR ${fmtT(revWithoutVAT)}`, bold: true, color: "#74c0fc" },
            ];
            return [c.category_name, parseFloat(c.sales.toFixed(2)), tooltipHtml(c.category_name, "#74c0fc", lines, store, filters)];
        });
        return [header, ...rows];
    }, [categorySummaries, vatPercent, store, filters]);

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
export function CategoryMarginChart({ categorySummaries, store, filters }) {
    const vatPercent = store?.vat_percent || 15;
    const data = useMemo(() => {
        const entries = (categorySummaries || [])
            .filter(c => c.sales > 0)
            .map(c => ({ ...c, margin: parseFloat(((c.profit / c.sales) * 100).toFixed(1)) }))
            .sort((a, b) => b.margin - a.margin)
            .slice(0, 10);
        if (entries.length === 0) return null;

        const header = ["Category", "Profit Margin (%)", { role: "tooltip", type: "string", p: { html: true } }];
        const rows = entries.map(c => {
            const revVat           = c.sales  * vatPercent / (100 + vatPercent);
            const revWithoutVAT    = c.sales  - revVat;
            const profitVat        = c.profit * vatPercent / (100 + vatPercent);
            const profitWithoutVAT = c.profit - profitVat;
            const lines = [
                { label: "Formula",               value: "(sales_profit ÷ sales) × 100" },
                { label: "Revenue (with VAT)",    value: `${fmtT(c.sales)}` },
                { label: "Revenue (without VAT)", value: `${fmtT(revWithoutVAT)}` },
                { label: "Profit (with VAT)",     value: `${fmtT(c.profit)}` },
                { label: "Profit (without VAT)",  value: `${fmtT(profitWithoutVAT)}` },
                { label: "Source",                value: "server-aggregated (product_stores)" },
                { divider: true, label: "Margin", value: `${c.margin}%`, bold: true, color: "#1cc88a" },
            ];
            return [c.category_name, c.margin, tooltipHtml(c.category_name, "#1cc88a", lines, store, filters)];
        });
        return [header, ...rows];
    }, [categorySummaries, vatPercent, store, filters]);

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
export function StockHealthChart({ stockSummary, store, filters }) {
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
            return [s.label, s.count, tooltipHtml(s.label, s.color, lines, store, filters)];
        });

        return [header, ...rows];
    }, [stockSummary, store, filters]);

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
