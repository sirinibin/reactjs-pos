import React, { useState, useEffect, useRef } from "react";

import KPICards from "./charts/KPICards";
import {
    MonthlyRevenueTrendChart,
    CumulativeRevenueChart,
    Last30DaysSalesChart,
    SalesVsReturnsChart,
} from "./charts/RevenueCharts";
import {
    PaymentMethodPieChart,
    PaymentStatusPieChart,
    CashVsBankTrendChart,
} from "./charts/PaymentCharts";
import {
    TopProductsChart,
    CategoryRevenuePieChart,
    CategoryMarginChart,
    StockHealthChart,
} from "./charts/ProductCharts";
import {
    TopCustomersChart,
    OutstandingReceivablesChart,
} from "./charts/CustomerCharts";
import {
    AccountBalancesChart,
    VendorSpendPieChart,
    PurchaseVsSalesChart,
} from "./charts/FinancialCharts";



const TABS = [
    { id: "overview", label: "Overview", icon: "bi-speedometer2" },
    { id: "revenue", label: "Revenue", icon: "bi-graph-up" },
    { id: "payments", label: "Payments", icon: "bi-credit-card" },
    { id: "products", label: "Products & Inventory", icon: "bi-box-seam" },
    { id: "customers", label: "Customers & Finance", icon: "bi-people" },
];

function SectionTitle({ children }) {
    return (
        <h6 className="text-uppercase text-muted fw-bold mb-3 mt-4"
            style={{ fontSize: "0.75rem", letterSpacing: "0.08em", borderBottom: "1px solid #e3e6f0", paddingBottom: "0.5rem" }}>
            {children}
        </h6>
    );
}

// ── Shared helper: SVG → PNG data URL ────────────────────────────────────────
async function svgToPng(container) {
    const svg = container?.querySelector("svg");
    if (!svg) return null;
    const { width, height } = svg.getBoundingClientRect();
    if (!width || !height) return null;

    const clone = svg.cloneNode(true);
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", width);
    clone.setAttribute("height", height);

    const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bg.setAttribute("width", "100%");
    bg.setAttribute("height", "100%");
    bg.setAttribute("fill", "white");
    clone.insertBefore(bg, clone.firstChild);

    const url = URL.createObjectURL(
        new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml;charset=utf-8" })
    );

    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
            const scale = window.devicePixelRatio || 2;
            const canvas = document.createElement("canvas");
            canvas.width  = width  * scale;
            canvas.height = height * scale;
            const ctx = canvas.getContext("2d");
            ctx.scale(scale, scale);
            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            URL.revokeObjectURL(url);
            resolve(canvas.toDataURL("image/png"));
        };
        img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
        img.src = url;
    });
}

// ── Convert data URL to Blob without fetch (preserves user-gesture chain) ──────
function dataUrlToBlob(dataUrl) {
    const [header, b64] = dataUrl.split(",");
    const mime = header.match(/:(.*?);/)[1];
    const bytes = atob(b64);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    return new Blob([arr], { type: mime });
}

// ── Upload PNG to our backend → backend uploads to filebin + shortens URL ─────
// Returns the shortened public URL for the chart image.
async function uploadChartAndGetShareUrl(blob, filename) {
    const res = await fetch(`/v1/chart-image-share?filename=${encodeURIComponent(filename)}`, {
        method: "POST",
        headers: {
            "Content-Type": "image/png",
            Authorization: localStorage.getItem("access_token"),
        },
        body: blob,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.status) throw new Error(json.errors?.upload || "Upload failed");
    return json.result.url;
}

// ── Fallback modal shown only when filebin upload fails ───────────────────────
function WhatsAppFallbackModal({ dataUrl, title, onClose }) {
    const filename = (title || "chart").replace(/[^a-z0-9]+/gi, "_").toLowerCase() + ".png";

    function handleDownload() {
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    return (
        <div
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}
            style={{
                position: "fixed", inset: 0, zIndex: 9999,
                background: "rgba(0,0,0,0.65)",
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: "16px",
            }}
        >
            <div style={{
                background: "#fff", borderRadius: "12px", padding: "20px",
                maxWidth: "480px", width: "100%",
                boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
            }}>
                <div className="d-flex align-items-center justify-content-between mb-3">
                    <span className="fw-bold" style={{ fontSize: "0.95rem" }}>
                        <i className="bi bi-whatsapp text-success me-2" />Share via WhatsApp
                    </span>
                    <button className="btn-close" onClick={onClose} />
                </div>
                <div className="alert alert-warning small py-2 mb-3">
                    <i className="bi bi-exclamation-triangle-fill me-2" />
                    Could not upload to filebin.net. Download the image and share it manually.
                </div>
                <img src={dataUrl} alt={title}
                    style={{ width: "100%", borderRadius: "8px", border: "1px solid #dee2e6", marginBottom: "16px" }} />
                <button className="btn btn-outline-secondary w-100" onClick={handleDownload}>
                    <i className="bi bi-download me-2" />Download image
                </button>
            </div>
        </div>
    );
}

// ── ChartCard ─────────────────────────────────────────────────────────────────
function ChartCard({ children }) {
    const chartRef = useRef(null);
    const [busyLabel, setBusyLabel] = useState(null); // null = idle
    const [shareError, setShareError] = useState(null); // { dataUrl, title } on upload failure

    function getChartTitle() {
        const textEl = chartRef.current?.querySelector("svg text");
        return textEl?.textContent?.trim() || "chart";
    }

    async function handleDownload() {
        setBusyLabel("…");
        try {
            const dataUrl = await svgToPng(chartRef.current);
            if (!dataUrl) return;
            const a = document.createElement("a");
            a.href = dataUrl;
            a.download = getChartTitle().replace(/[^a-z0-9]+/gi, "_").toLowerCase() + ".png";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } finally {
            setBusyLabel(null);
        }
    }

    async function handleWhatsApp() {
        setBusyLabel("Sharing…");
        try {
            const dataUrl = await svgToPng(chartRef.current);
            if (!dataUrl) return;

            const title    = getChartTitle();
            const filename = title.replace(/[^a-z0-9]+/gi, "_").toLowerCase() + ".png";
            const blob     = dataUrlToBlob(dataUrl);

            let shareUrl;
            try {
                shareUrl = await uploadChartAndGetShareUrl(blob, filename);
            } catch {
                setShareError({ dataUrl, title });
                return;
            }

            // wa.me/?text= opens the WhatsApp app on mobile and WhatsApp Web on desktop.
            const message = `${title}\n${shareUrl}`;
            window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
        } finally {
            setBusyLabel(null);
        }
    }

    return (
        <div className="card mb-4 shadow-sm">
            <div className="card-body">
                <div className="d-flex justify-content-end gap-1 mb-1">
                    <button
                        className="btn btn-sm btn-outline-secondary"
                        onClick={handleDownload}
                        disabled={!!busyLabel}
                        title="Download as PNG"
                        style={{ fontSize: "0.72rem", padding: "2px 8px" }}
                    >
                        <i className="bi bi-download me-1" />
                        Download
                    </button>
                    <button
                        className="btn btn-sm btn-outline-success"
                        onClick={handleWhatsApp}
                        disabled={!!busyLabel}
                        title="Share via WhatsApp"
                        style={{ fontSize: "0.72rem", padding: "2px 8px" }}
                    >
                        <i className="bi bi-whatsapp me-1" />
                        {busyLabel || "WhatsApp"}
                    </button>
                </div>
                <div ref={chartRef}>
                    {children}
                </div>
            </div>
            {shareError && (
                <WhatsAppFallbackModal
                    dataUrl={shareError.dataUrl}
                    title={shareError.title}
                    onClose={() => setShareError(null)}
                />
            )}
        </div>
    );
}

function Spinner() {
    return (
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "200px" }}>
            <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
            </div>
            <span className="ms-3 text-muted">Loading dashboard data…</span>
        </div>
    );
}

// Payment method keys stored in DashboardDaily (matches Go bson tags without "payment_" prefix)
const PAYMENT_METHODS = ["cash", "debit_card", "bank_card", "credit_card", "bank_transfer", "bank_cheque", "customer_account"];

export default function BusinessDashboard() {
    const [activeTab, setActiveTab] = useState("overview");
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);
    const [recomputing, setRecomputing] = useState(false);
    const [recomputeCountdown, setRecomputeCountdown] = useState(0);

    // ── Precomputed dashboard state ────────────────────────────────────────────
    const [store, setStore]                         = useState({});
    const [monthlyData, setMonthlyData]             = useState([]);  // DashboardMonthly[]
    const [productSummaries, setProductSummaries]   = useState([]);
    const [customerSummaries, setCustomerSummaries] = useState([]);
    const [outstandingSummaries, setOutstandingSummaries] = useState([]);
    const [categorySummaries, setCategorySummaries] = useState([]);
    const [vendorSummaries, setVendorSummaries]     = useState([]);
    const [accountSummaries, setAccountSummaries]   = useState([]);
    const [stockSummary, setStockSummary]           = useState({});

    // Month / Year filter (YYYY-MM strings)
    const [filterMode, setFilterMode]       = useState("range"); // "single" | "range" | "year"
    const [singleMonth, setSingleMonth]     = useState("");
    const [fromMonth, setFromMonth]         = useState("");
    const [toMonth, setToMonth]             = useState("");
    const [selectedYear, setSelectedYear]   = useState("");
    const [appliedFrom, setAppliedFrom]     = useState("");
    const [appliedTo, setAppliedTo]         = useState("");

    // Full year list — populated only on unfiltered loads so it always covers
    // the complete store history, not just the currently-filtered date range.
    const [fullYears, setFullYears]         = useState([]);

    // Derived data range — first and last month that have actual data.
    // monthlyData is already zero-filtered and sorted ascending by month_str.
    const dataMinMonth = monthlyData.length > 0 ? monthlyData[0].month_str : "";
    const dataMaxMonth = monthlyData.length > 0 ? monthlyData[monthlyData.length - 1].month_str : "";


    const storeId = localStorage.getItem("store_id") || "";

    function authHeaders() {
        return { "Content-Type": "application/json", Authorization: localStorage.getItem("access_token") };
    }

    async function fetchDashboard(path) {
        const res = await fetch(path, { method: "GET", headers: authHeaders() })
            .then(r => r.json()).catch(() => ({ status: false }));
        if (!res.status) return null;
        return res.result;
    }

    async function fetchOne(path) {
        const res = await fetch(path, { method: "GET", headers: authHeaders() })
            .then(r => r.json()).catch(() => ({ status: false }));
        return res?.status ? (res.result || {}) : {};
    }

    useEffect(() => {
        if (!storeId) return;

        async function load() {
            setLoading(true);

            // Dashboard endpoints accept YYYY-MM month strings.
            const monthQ = [
                appliedFrom ? `from_month=${appliedFrom}` : "",
                appliedTo   ? `to_month=${appliedTo}`     : "",
            ].filter(Boolean).join("&");
            const base = `store_id=${storeId}${monthQ ? "&" + monthQ : ""}`;

            const [
                storeData,
                monthly,
                products,
                customers,
                outstanding,
                categories,
                vendors,
                accounts,
                stock,
            ] = await Promise.all([
                fetchOne(`/v1/store/${storeId}?select=id,name,branch_name,vat_no,registration_number,address,settings,vat_percent`),
                fetchDashboard(`/v1/dashboard/monthly?${base}`),
                fetchDashboard(`/v1/dashboard/products?${base}&limit=10`),
                fetchDashboard(`/v1/dashboard/customers?${base}&limit=10`),
                fetchDashboard(`/v1/dashboard/outstanding?store_id=${storeId}&limit=10`),
                fetchDashboard(`/v1/dashboard/categories?store_id=${storeId}`),
                fetchDashboard(`/v1/dashboard/vendors?${base}`),
                fetchDashboard(`/v1/dashboard/accounts?store_id=${storeId}`),
                fetchDashboard(`/v1/dashboard/stock?store_id=${storeId}`),
            ]);

            setStore(storeData);
            // Keep only months that have at least one non-zero financial value so
            // charts don't render empty bars for months before/after actual activity.
            const filtered = (monthly || []).filter(d =>
                (d.sales_amount          || 0) +
                (d.sales_return_amount   || 0) +
                (d.purchase_amount       || 0) +
                (d.expense_amount        || 0) +
                (d.qtn_invoice_amount    || 0) > 0
            );
            setMonthlyData(filtered);

            // Capture the full year list only on unfiltered loads so the year
            // dropdown always shows the complete store history, not just the
            // currently-active date range.
            if (!appliedFrom && !appliedTo) {
                const years = [...new Set(filtered.map(d => d.month_str.slice(0, 4)))]
                    .sort((a, b) => b - a);
                setFullYears(years);
            }
            setProductSummaries(products    || []);
            setCustomerSummaries(customers  || []);
            setOutstandingSummaries(outstanding || []);
            setCategorySummaries(categories || []);
            setVendorSummaries(vendors      || []);
            setAccountSummaries(accounts    || []);
            setStockSummary(stock           || {});
            setLoading(false);
        }

        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [storeId, appliedFrom, appliedTo, refreshKey]);

    // ── Synthetic arrays derived from monthlyData ──────────────────────────────
    // Each monthly record maps to one synthetic entry. month_str "YYYY-MM" is
    // converted to the 1st of that month so existing chart components that group
    // by month work unchanged.

    const monthDate = (d) => d.month_str + "-01T12:00:00";

    // Core sales synthetic arrays (date + value + cash_discount)
    const synOrders     = React.useMemo(() => monthlyData.map(d => ({ date: monthDate(d), net_total: d.sales_amount || 0, cash_discount: d.sales_cash_discount || 0 })), [monthlyData]);
    const synReturns    = React.useMemo(() => monthlyData.map(d => ({ date: monthDate(d), net_total: d.sales_return_amount || 0, cash_discount: d.sales_return_cash_discount || 0 })), [monthlyData]);
    const synPur        = React.useMemo(() => monthlyData.map(d => ({ date: monthDate(d), net_total: d.purchase_amount || 0, cash_discount: d.purchase_cash_discount || 0 })), [monthlyData]);
    const synPurRet     = React.useMemo(() => monthlyData.map(d => ({ date: monthDate(d), net_total: d.purchase_return_amount || 0, cash_discount: d.purchase_return_cash_discount || 0 })), [monthlyData]);
    const synExpenses   = React.useMemo(() => monthlyData.map(d => ({ date: monthDate(d), amount:    d.expense_amount || 0 })), [monthlyData]);
    const synAcctPur    = React.useMemo(() => monthlyData.map(d => ({ date: monthDate(d), net_total: d.accounted_purchase_amount || 0, cash_discount: d.accounted_purchase_cash_discount || 0 })), [monthlyData]);
    const synAcctPurRet = React.useMemo(() => monthlyData.map(d => ({ date: monthDate(d), net_total: d.accounted_purchase_return_amount || 0, cash_discount: d.accounted_purchase_return_cash_discount || 0 })), [monthlyData]);

    // Quotation invoice synthetic array
    const synQtnInvoices = React.useMemo(() =>
        monthlyData.map(d => ({
            date: monthDate(d), type: "invoice",
            net_total: d.qtn_invoice_amount || 0,
            cash_discount: d.qtn_sales_cash_discount || 0,
            payment_status: "paid",
            payments: PAYMENT_METHODS
                .map(m => ({ method: m, amount: d["qtn_payment_" + m] || 0 }))
                .filter(p => p.amount > 0),
        })).filter(d => d.net_total > 0 || d.payments.length > 0)
    , [monthlyData]);

    const synQtnReturns = React.useMemo(() =>
        monthlyData.map(d => ({ date: monthDate(d), net_total: d.qtn_invoice_return_amount || 0, cash_discount: d.qtn_sales_return_cash_discount || 0 }))
    , [monthlyData]);

    // Customer deposits
    const synDeposits = React.useMemo(() =>
        monthlyData.map(d => ({
            date: monthDate(d),
            payments: d.deposit_purchase_fund > 0 ? [{ method: "purchase_fund", amount: d.deposit_purchase_fund }] : [],
        }))
    , [monthlyData]);

    // Expanded payments array: one object per method per month
    const synPayments = React.useMemo(() =>
        monthlyData.flatMap(d =>
            PAYMENT_METHODS.map(m => ({
                date:   monthDate(d),
                method: m,
                amount: d["payment_" + m] || 0,
            })).filter(p => p.amount > 0)
        )
    , [monthlyData]);

    // Synthetic orders with payment_status for PaymentStatusPieChart
    const synOrdersWithStatus = React.useMemo(() => [
        ...monthlyData.map(d => ({ date: d.month_str, net_total: d.paid_amount    || 0, payment_status: "paid" })),
        ...monthlyData.map(d => ({ date: d.month_str, net_total: d.unpaid_amount  || 0, payment_status: "not_paid" })),
        ...monthlyData.map(d => ({ date: d.month_str, net_total: d.partial_amount || 0, payment_status: "paid_partially" })),
    ], [monthlyData]);

    // KPI stats computed from monthly totals
    const kpiStats = React.useMemo(() => {
        const sum = f => monthlyData.reduce((s, d) => s + (d[f] || 0), 0);
        return {
            orderStats:          { total_sales: sum("sales_amount"), cash_discount: sum("sales_cash_discount"), commission: sum("sales_commission") },
            salesReturnStats:    { total_sales_return: sum("sales_return_amount"), cash_discount: sum("sales_return_cash_discount"), commission: sum("sales_return_commission") },
            quotationStats:      { invoice_total_sales: sum("qtn_invoice_amount"), invoice_cash_discount: sum("qtn_sales_cash_discount") },
            qtnSalesReturnStats: { total_quotation_sales_return: sum("qtn_invoice_return_amount"), cash_discount: sum("qtn_sales_return_cash_discount") },
            expenseStats:        { total:                        sum("expense_amount") },
            purchaseStats:       { total_purchase: sum("purchase_amount"), accounted_purchase: sum("accounted_purchase_amount"), cash_discount: sum("purchase_cash_discount"), accounted_purchase_cash_discount: sum("accounted_purchase_cash_discount") },
            purchaseReturnStats: { total_purchase_return: sum("purchase_return_amount"), accounted_purchase_return: sum("accounted_purchase_return_amount"), cash_discount: sum("purchase_return_cash_discount"), accounted_purchase_return_cash_discount: sum("accounted_purchase_return_cash_discount") },
            depositStats:        { purchase_fund:                sum("deposit_purchase_fund") },
            orderCount:          monthlyData.reduce((s, d) => s + (d.sales_count || 0), 0),
        };
    }, [monthlyData]);

    const chartFilters = {
        ...(appliedFrom ? { 'From': appliedFrom } : {}),
        ...(appliedTo   ? { 'To':   appliedTo   } : {}),
    };

    return (
        <div className="container-fluid px-3 py-3">
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}.spin{animation:spin .7s linear infinite;display:inline-block;}`}</style>
            {/* Page header */}
            <div className="d-flex align-items-center justify-content-between mb-3">
                <h4 className="mb-0 fw-bold">
                    <i className="bi bi-speedometer2 me-2 text-primary" />
                    Business Dashboard
                </h4>
                <div className="d-flex align-items-center gap-2">
                    <span className="text-muted small">
                        {localStorage.getItem("store_name") || ""}
                    </span>
                    <button
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => setRefreshKey(k => k + 1)}
                        disabled={loading}
                        title="Refresh dashboard data"
                    >
                        <i className={`bi bi-arrow-clockwise${loading ? " spin" : ""}`} />
                    </button>
                    <button
                        className="btn btn-sm btn-outline-warning"
                        disabled={recomputing || loading}
                        title="Recompute all monthly data from scratch (fixes stale cash discount totals)"
                        onClick={async () => {
                            if (!storeId) return;
                            setRecomputing(true);
                            let secs = 30;
                            setRecomputeCountdown(secs);
                            try {
                                await fetch(`/v1/dashboard/backfill?store_id=${storeId}&months=0`, {
                                    method: "POST",
                                    headers: authHeaders(),
                                });
                                const interval = setInterval(() => {
                                    secs -= 1;
                                    setRecomputeCountdown(secs);
                                    if (secs <= 0) {
                                        clearInterval(interval);
                                        setRecomputing(false);
                                        setRecomputeCountdown(0);
                                        setRefreshKey(k => k + 1);
                                    }
                                }, 1000);
                            } catch {
                                setRecomputing(false);
                                setRecomputeCountdown(0);
                            }
                        }}
                    >
                        <i className={`bi bi-database-gear${recomputing ? " spin" : ""}`} />
                        {recomputing ? ` Recomputing… ${recomputeCountdown}s` : " Recompute"}
                    </button>
                </div>
            </div>

            {/* Month / Year filter */}
            <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
                <div className="btn-group btn-group-sm" role="group">
                    <button
                        type="button"
                        className={`btn ${filterMode === "single" ? "btn-primary" : "btn-outline-secondary"}`}
                        onClick={() => {
                            setFilterMode("single");
                            setFromMonth(""); setToMonth(""); setSelectedYear("");
                            setAppliedFrom(""); setAppliedTo("");
                        }}
                    >
                        <i className="bi bi-calendar-date me-1" />Single Month
                    </button>
                    <button
                        type="button"
                        className={`btn ${filterMode === "range" ? "btn-primary" : "btn-outline-secondary"}`}
                        onClick={() => {
                            setFilterMode("range");
                            setSingleMonth(""); setSelectedYear("");
                            setAppliedFrom(""); setAppliedTo("");
                        }}
                    >
                        <i className="bi bi-calendar-range me-1" />Month Range
                    </button>
                    <button
                        type="button"
                        className={`btn ${filterMode === "year" ? "btn-primary" : "btn-outline-secondary"}`}
                        onClick={() => {
                            setFilterMode("year");
                            setSingleMonth(""); setFromMonth(""); setToMonth("");
                            setAppliedFrom(""); setAppliedTo("");
                        }}
                    >
                        <i className="bi bi-calendar3 me-1" />Year
                    </button>
                </div>

                {filterMode === "single" && (
                    <input
                        type="month"
                        className="form-control form-control-sm"
                        style={{ width: "auto" }}
                        value={singleMonth}
                        min={dataMinMonth}
                        max={dataMaxMonth}
                        onChange={e => {
                            setSingleMonth(e.target.value);
                            setAppliedFrom(e.target.value);
                            setAppliedTo(e.target.value);
                        }}
                    />
                )}

                {filterMode === "range" && (
                    <>
                        <input
                            type="month"
                            className="form-control form-control-sm"
                            style={{ width: "auto" }}
                            value={fromMonth}
                            min={dataMinMonth}
                            max={dataMaxMonth}
                            placeholder={dataMinMonth}
                            onChange={e => {
                                setFromMonth(e.target.value);
                                setAppliedFrom(e.target.value);
                            }}
                        />
                        <span className="text-muted small">to</span>
                        <input
                            type="month"
                            className="form-control form-control-sm"
                            style={{ width: "auto" }}
                            value={toMonth}
                            min={dataMinMonth}
                            max={dataMaxMonth}
                            placeholder={dataMaxMonth}
                            onChange={e => {
                                setToMonth(e.target.value);
                                setAppliedTo(e.target.value);
                            }}
                        />
                    </>
                )}

                {filterMode === "year" && (
                    <select
                        className="form-select form-select-sm"
                        style={{ width: "6rem", height: "26px", padding: "0 0.5rem", fontSize: "0.8rem" }}
                        value={selectedYear}
                        onChange={e => {
                            setSelectedYear(e.target.value);
                            setAppliedFrom(e.target.value ? `${e.target.value}-01` : "");
                            setAppliedTo(e.target.value ? `${e.target.value}-12` : "");
                        }}
                    >
                        <option value="">—</option>
                        {fullYears.map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                )}

                {(appliedFrom || appliedTo) && (
                    <button
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => {
                            setSingleMonth(""); setFromMonth(""); setToMonth(""); setSelectedYear("");
                            setAppliedFrom(""); setAppliedTo("");
                        }}
                    >
                        Clear
                    </button>
                )}

                {/* Data range hint */}
                {dataMinMonth && dataMaxMonth && (
                    <span className="text-muted small fst-italic ms-1">
                        <i className="bi bi-info-circle me-1" />
                        Data: {dataMinMonth} → {dataMaxMonth}
                    </span>
                )}

                {(appliedFrom || appliedTo) && (
                    <span className="text-muted small fst-italic">
                        {filterMode === "year" && selectedYear
                            ? `Showing: ${selectedYear}`
                            : appliedFrom === appliedTo
                                ? `Showing: ${appliedFrom}`
                                : `Showing: ${appliedFrom || dataMinMonth} → ${appliedTo || dataMaxMonth}`}
                    </span>
                )}
            </div>

            {/* Tab navigation */}
            <ul className="nav nav-tabs mb-3">
                {TABS.map(tab => (
                    <li className="nav-item" key={tab.id}>
                        <button
                            className={`nav-link${activeTab === tab.id ? " active" : ""}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            <i className={`bi ${tab.icon} me-1`} />
                            {tab.label}
                        </button>
                    </li>
                ))}
            </ul>

            {loading ? (
                <Spinner />
            ) : (
                <>
                    {/* ── Tab 1: Overview ── */}
                    {activeTab === "overview" && (
                        <div>
                            <SectionTitle>Key Performance Indicators</SectionTitle>
                            <KPICards
                                store={store}
                                orderStats={kpiStats.orderStats}
                                salesReturnStats={kpiStats.salesReturnStats}
                                purchaseStats={kpiStats.purchaseStats}
                                purchaseReturnStats={kpiStats.purchaseReturnStats}
                                expenseStats={kpiStats.expenseStats}
                                depositStats={kpiStats.depositStats}
                                quotationStats={kpiStats.quotationStats}
                                qtnSalesReturnStats={kpiStats.qtnSalesReturnStats}
                                orders={{ length: kpiStats.orderCount }}
                                filters={{
                                    ...(appliedFrom ? { 'From': appliedFrom } : {}),
                                    ...(appliedTo   ? { 'To':   appliedTo   } : {}),
                                }}
                            />
                            <div className="row mt-4">
                                <div className="col-lg-6">
                                    <ChartCard>
                                        <MonthlyRevenueTrendChart store={store} filters={chartFilters} orders={synOrders} returns={synReturns} purchases={synPur} purchaseReturns={synPurRet} expenses={synExpenses} quotations={synQtnInvoices} quotationSalesReturns={synQtnReturns} accountedPurchases={synAcctPur} accountedPurchaseReturns={synAcctPurRet} customerDeposits={synDeposits} />
                                    </ChartCard>
                                </div>
                                <div className="col-lg-6">
                                    <ChartCard>
                                        <PaymentStatusPieChart orders={synOrdersWithStatus} store={store} filters={chartFilters} quotations={synQtnInvoices} />
                                    </ChartCard>
                                </div>
                            </div>
                            <div className="row">
                                <div className="col-lg-6">
                                    <ChartCard>
                                        <CategoryRevenuePieChart categorySummaries={categorySummaries} store={store} filters={chartFilters} />
                                    </ChartCard>
                                </div>
                                <div className="col-lg-6">
                                    <ChartCard>
                                        <StockHealthChart stockSummary={stockSummary} store={store} filters={chartFilters} />
                                    </ChartCard>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Tab 2: Revenue ── */}
                    {activeTab === "revenue" && (
                        <div>
                            <SectionTitle>Revenue Trends</SectionTitle>
                            <div className="row">
                                <div className="col-12">
                                    <ChartCard>
                                        <MonthlyRevenueTrendChart store={store} filters={chartFilters} orders={synOrders} returns={synReturns} purchases={synPur} purchaseReturns={synPurRet} expenses={synExpenses} quotations={synQtnInvoices} quotationSalesReturns={synQtnReturns} accountedPurchases={synAcctPur} accountedPurchaseReturns={synAcctPurRet} customerDeposits={synDeposits} />
                                    </ChartCard>
                                </div>
                            </div>
                            <div className="row">
                                <div className="col-lg-6">
                                    <ChartCard>
                                        <CumulativeRevenueChart store={store} filters={chartFilters} orders={synOrders} returns={synReturns} quotations={synQtnInvoices} quotationSalesReturns={synQtnReturns} />
                                    </ChartCard>
                                </div>
                                <div className="col-lg-6">
                                    <ChartCard>
                                        <Last30DaysSalesChart orders={synOrders} store={store} filters={chartFilters} />
                                    </ChartCard>
                                </div>
                            </div>
                            <div className="row">
                                <div className="col-12">
                                    <ChartCard>
                                        <SalesVsReturnsChart orders={synOrders} returns={synReturns} store={store} filters={chartFilters} />
                                    </ChartCard>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Tab 3: Payments ── */}
                    {activeTab === "payments" && (
                        <div>
                            <SectionTitle>Payment Analysis</SectionTitle>
                            <div className="row">
                                <div className="col-lg-6">
                                    <ChartCard>
                                        <PaymentMethodPieChart payments={synPayments} store={store} filters={chartFilters} quotations={synQtnInvoices} />
                                    </ChartCard>
                                </div>
                                <div className="col-lg-6">
                                    <ChartCard>
                                        <PaymentStatusPieChart orders={synOrdersWithStatus} store={store} filters={chartFilters} quotations={synQtnInvoices} />
                                    </ChartCard>
                                </div>
                            </div>
                            <div className="row">
                                <div className="col-12">
                                    <ChartCard>
                                        <CashVsBankTrendChart payments={synPayments} store={store} filters={chartFilters} quotations={synQtnInvoices} />
                                    </ChartCard>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Tab 4: Products & Inventory ── */}
                    {activeTab === "products" && (
                        <div>
                            <SectionTitle>Product Performance</SectionTitle>
                            <div className="row">
                                <div className="col-12">
                                    <ChartCard>
                                        <TopProductsChart productSummaries={productSummaries} store={store} filters={chartFilters} />
                                    </ChartCard>
                                </div>
                            </div>
                            <div className="row">
                                <div className="col-lg-6">
                                    <ChartCard>
                                        <CategoryRevenuePieChart categorySummaries={categorySummaries} store={store} filters={chartFilters} />
                                    </ChartCard>
                                </div>
                                <div className="col-lg-6">
                                    <ChartCard>
                                        <CategoryMarginChart categorySummaries={categorySummaries} store={store} filters={chartFilters} />
                                    </ChartCard>
                                </div>
                            </div>
                            <SectionTitle>Inventory Health</SectionTitle>
                            <div className="row">
                                <div className="col-lg-6">
                                    <ChartCard>
                                        <StockHealthChart stockSummary={stockSummary} store={store} filters={chartFilters} />
                                    </ChartCard>
                                </div>
                                <div className="col-lg-6">
                                    <div className="card mb-4 shadow-sm">
                                        <div className="card-body">
                                            <h6 className="text-muted mb-3">Stock Summary</h6>
                                            <div>
                                                <div className="d-flex justify-content-between py-2 border-bottom">
                                                    <span><i className="bi bi-circle-fill text-danger me-2" />Out of Stock</span>
                                                    <strong>{(stockSummary.out_of_stock || 0).toLocaleString()} products</strong>
                                                </div>
                                                <div className="d-flex justify-content-between py-2 border-bottom">
                                                    <span><i className="bi bi-circle-fill text-warning me-2" />Low Stock (&lt; 5 units)</span>
                                                    <strong>{(stockSummary.low_stock || 0).toLocaleString()} products</strong>
                                                </div>
                                                <div className="d-flex justify-content-between py-2">
                                                    <span><i className="bi bi-circle-fill text-success me-2" />Healthy Stock</span>
                                                    <strong>{(stockSummary.healthy_stock || 0).toLocaleString()} products</strong>
                                                </div>
                                                <div className="d-flex justify-content-between py-2 border-top mt-2">
                                                    <span className="fw-bold">Total Products</span>
                                                    <strong>{(stockSummary.total || 0).toLocaleString()}</strong>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Tab 5: Customers & Finance ── */}
                    {activeTab === "customers" && (
                        <div>
                            <SectionTitle>Customer Intelligence</SectionTitle>
                            <div className="row">
                                <div className="col-lg-6">
                                    <ChartCard>
                                        <TopCustomersChart customerSummaries={customerSummaries} store={store} filters={chartFilters} />
                                    </ChartCard>
                                </div>
                                <div className="col-lg-6">
                                    <ChartCard>
                                        <OutstandingReceivablesChart outstandingSummaries={outstandingSummaries} store={store} filters={chartFilters} />
                                    </ChartCard>
                                </div>
                            </div>
                            <SectionTitle>Financial Overview</SectionTitle>
                            <div className="row">
                                <div className="col-lg-6">
                                    <ChartCard>
                                        <AccountBalancesChart accountSummaries={accountSummaries} />
                                    </ChartCard>
                                </div>
                                <div className="col-lg-6">
                                    <ChartCard>
                                        <VendorSpendPieChart vendorSummaries={vendorSummaries} store={store} filters={chartFilters} />
                                    </ChartCard>
                                </div>
                            </div>
                            <div className="row">
                                <div className="col-12">
                                    <ChartCard>
                                        <PurchaseVsSalesChart store={store} filters={chartFilters} orders={synOrders} returns={synReturns} purchases={synPur} purchaseReturns={synPurRet} expenses={synExpenses} quotations={synQtnInvoices} quotationSalesReturns={synQtnReturns} accountedPurchases={synAcctPur} accountedPurchaseReturns={synAcctPurRet} customerDeposits={synDeposits} />
                                    </ChartCard>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
