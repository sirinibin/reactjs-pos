import React, { useState } from "react";

function fmt(n) {
    if (n === undefined || n === null || isNaN(n)) return "0.00";
    return Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtCompact(n) {
    if (n === undefined || n === null || isNaN(n)) return "0";
    const abs = Math.abs(n);
    const sign = n < 0 ? "-" : "";
    if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}B`;
    if (abs >= 1_000_000)     return `${sign}${(abs / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
    if (abs >= 1_000)         return `${sign}${(abs / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
    return `${sign}${abs.toFixed(2)}`;
}

function InfoTooltip({ lines }) {
    const [show, setShow] = useState(false);
    return (
        <span
            style={{ position: "relative", display: "inline-flex", alignItems: "center", marginLeft: "5px", verticalAlign: "middle" }}
            onMouseEnter={() => setShow(true)}
            onMouseLeave={() => setShow(false)}
        >
            <i className="bi bi-info-circle-fill" style={{ fontSize: "0.75rem", color: "#adb5bd", cursor: "help" }} />
            {show && (
                <div style={{
                    position: "absolute",
                    top: "130%",
                    left: "50%",
                    transform: "translateX(-50%)",
                    backgroundColor: "#212529",
                    color: "#f8f9fa",
                    padding: "9px 13px",
                    borderRadius: "6px",
                    fontSize: "0.73rem",
                    zIndex: 9999,
                    minWidth: "230px",
                    maxWidth: "340px",
                    boxShadow: "0 4px 14px rgba(0,0,0,0.35)",
                    lineHeight: "1.6",
                    pointerEvents: "none",
                    whiteSpace: "nowrap",
                }}>
                    {/* Arrow pointing up */}
                    <div style={{
                        position: "absolute",
                        bottom: "100%",
                        left: "50%",
                        transform: "translateX(-50%)",
                        width: 0,
                        height: 0,
                        borderLeft: "6px solid transparent",
                        borderRight: "6px solid transparent",
                        borderBottom: "6px solid #212529",
                    }} />
                    {lines.map((line, i) => (
                        <div key={i} style={line.divider ? { borderTop: "1px solid #495057", marginTop: "6px", paddingTop: "6px" } : {}}>
                            {line.label && <span style={{ color: "#adb5bd" }}>{line.label}: </span>}
                            <span style={{ fontWeight: line.bold ? 600 : 400, color: line.color || "#f8f9fa" }}>{line.value}</span>
                        </div>
                    ))}
                </div>
            )}
        </span>
    );
}

function ValueTooltip({ exact, children }) {
    const [show, setShow] = useState(false);
    return (
        <span
            style={{ position: "relative", cursor: "help" }}
            onMouseEnter={() => setShow(true)}
            onMouseLeave={() => setShow(false)}
        >
            {children}
            {show && (
                <div style={{
                    position: "absolute",
                    top: "110%",
                    left: "0",
                    backgroundColor: "#212529",
                    color: "#f8f9fa",
                    padding: "5px 10px",
                    borderRadius: "5px",
                    fontSize: "0.75rem",
                    fontWeight: 400,
                    zIndex: 9999,
                    whiteSpace: "nowrap",
                    boxShadow: "0 3px 10px rgba(0,0,0,0.3)",
                    pointerEvents: "none",
                }}>
                    <div style={{
                        position: "absolute",
                        bottom: "100%",
                        left: "12px",
                        width: 0, height: 0,
                        borderLeft: "5px solid transparent",
                        borderRight: "5px solid transparent",
                        borderBottom: "5px solid #212529",
                    }} />
                    {exact}
                </div>
            )}
        </span>
    );
}

function KPICard({ title, tooltip, value, exact, sub2, icon, color }) {
    return (
        <div className="col-xl-2 col-lg-4 col-md-4 col-sm-6 mb-3">
            <div className="card h-100" style={{ borderLeft: `4px solid ${color}` }}>
                <div className="card-body py-2" style={{ position: "relative" }}>
                    {/* Icon pinned to top-right — never overlaps text */}
                    <div style={{ position: "absolute", top: "10px", right: "10px", fontSize: "1.4rem", color, opacity: 0.5, pointerEvents: "none" }}>
                        <i className={icon} />
                    </div>
                    {/* Text content: padded right so it never reaches the icon */}
                    <div style={{ paddingRight: "2rem" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", marginBottom: "4px" }}>
                            <span style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#6c757d", lineHeight: 1.3 }}>
                                {title}
                            </span>
                            {tooltip && <InfoTooltip lines={tooltip} />}
                        </div>
                        <div style={{ fontSize: "0.95rem", fontWeight: 700, whiteSpace: "nowrap" }}>
                            {exact ? <ValueTooltip exact={exact}>{value}</ValueTooltip> : value}
                        </div>
                        {sub2 && (
                            <div style={{ fontSize: "0.7rem", color: "#6c757d", whiteSpace: "nowrap", marginTop: "2px" }}>
                                {sub2}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function KPICards({
    store,
    orderStats,
    salesReturnStats,
    purchaseStats,
    purchaseReturnStats,
    expenseStats,
    depositStats,
    quotationStats,
    qtnSalesReturnStats,
    orders,
}) {
    // ── Store flags — identical to stats/index.js ──────────────────────────
    const qtnInvoiceAccounting = store?.settings?.quotation_invoice_accounting === true;
    const disablePurchasesOnAccounts = store?.settings?.disable_purchases_on_accounts === true;
    const vatPercent = store?.vat_percent || 15;

    // ── Raw totals ─────────────────────────────────────────────────────────
    const totalSales             = orderStats?.total_sales || 0;
    const totalSalesReturn       = salesReturnStats?.total_sales_return || 0;
    const totalQtnSales          = quotationStats?.invoice_total_sales || 0;
    const totalQtnSalesReturn    = qtnSalesReturnStats?.total_quotation_sales_return || 0;
    const totalExpense            = expenseStats?.total || 0;
    const totalPurchase           = purchaseStats?.total_purchase || 0;
    const totalPurchaseReturn     = purchaseReturnStats?.total_purchase_return || 0;
    const totalDepositPurchaseFund    = depositStats?.purchase_fund || 0;
    const totalAccountedPurchase      = purchaseStats?.accounted_purchase || 0;
    const totalAccountedPurchaseReturn = purchaseReturnStats?.accounted_purchase_return || 0;

    // ── Cash discount totals ───────────────────────────────────────────────
    const totalCashDiscount                    = orderStats?.cash_discount || 0;
    const totalSalesReturnCashDiscount         = salesReturnStats?.cash_discount || 0;
    const totalPurchaseCashDiscount            = purchaseStats?.cash_discount || 0;
    const totalPurchaseReturnCashDiscount      = purchaseReturnStats?.cash_discount || 0;
    const totalAccountedPurchaseCashDiscount        = purchaseStats?.accounted_purchase_cash_discount || 0;
    const totalAccountedPurchaseReturnCashDiscount  = purchaseReturnStats?.accounted_purchase_return_cash_discount || 0;
    const qtnSalesCashDiscount                 = quotationStats?.invoice_cash_discount || 0;
    const qtnSalesReturnCashDiscount           = qtnSalesReturnStats?.cash_discount || 0;

    // ── P&L formula — identical to stats/index.js ─────────────────────────
    const revenue = (totalSales - totalSalesReturn)
        + (qtnInvoiceAccounting ? (totalQtnSales - totalQtnSalesReturn) : 0);

    const purchaseCashDiscountAdj       = disablePurchasesOnAccounts ? totalAccountedPurchaseCashDiscount       : totalPurchaseCashDiscount;
    const purchaseReturnCashDiscountAdj = disablePurchasesOnAccounts ? totalAccountedPurchaseReturnCashDiscount : totalPurchaseReturnCashDiscount;
    const cashDiscountAdj = totalCashDiscount - totalSalesReturnCashDiscount + purchaseReturnCashDiscountAdj - purchaseCashDiscountAdj
        + (qtnInvoiceAccounting ? qtnSalesCashDiscount - qtnSalesReturnCashDiscount : 0);

    const expenseTotal = (disablePurchasesOnAccounts
        ? (totalExpense - totalDepositPurchaseFund + totalAccountedPurchase - totalAccountedPurchaseReturn)
        : (totalExpense + totalPurchase - totalPurchaseReturn))
        + cashDiscountAdj;

    const profitLoss           = revenue - expenseTotal;
    const profitLossVat        = profitLoss * vatPercent / (100 + vatPercent);
    const profitLossWithoutVAT = profitLoss - profitLossVat;
    const isProfitable         = profitLoss >= 0;

    const totalOrders    = orders.length;
    const avgOrderValue  = totalOrders > 0 ? (totalSales / totalOrders) : 0;
    const returnRate     = totalSales > 0 ? (totalSalesReturn / totalSales) * 100 : 0;

    // ── Tooltip line definitions  (exact numbers shown on hover) ──────────

    const revenueTooltip = [
        { label: "Exact", value: `SAR ${fmt(revenue)}`, bold: true, color: "#74c0fc" },
        { divider: true, label: "Gross Sales", value: `SAR ${fmt(totalSales)}` },
        ...(qtnInvoiceAccounting ? [{ label: "Qtn. Sales", value: `+ SAR ${fmt(totalQtnSales)}` }] : []),
        { label: "Sales Returns", value: `− SAR ${fmt(totalSalesReturn)}` },
        ...(qtnInvoiceAccounting ? [{ label: "Qtn. Returns", value: `− SAR ${fmt(totalQtnSalesReturn)}` }] : []),
    ];

    const expenseTooltip = disablePurchasesOnAccounts ? [
        { label: "Exact", value: `SAR ${fmt(expenseTotal)}`, bold: true, color: "#ffa8a8" },
        { divider: true, label: "Expenses", value: `SAR ${fmt(totalExpense)}` },
        { label: "Purchase Return Fund Rcvd", value: `− SAR ${fmt(totalDepositPurchaseFund)}` },
        { label: "Accounted Purchases", value: `+ SAR ${fmt(totalAccountedPurchase)}` },
        { label: "Accounted Pur. Returns", value: `− SAR ${fmt(totalAccountedPurchaseReturn)}` },
        { label: "Sales Cash Discount", value: `+ SAR ${fmt(totalCashDiscount)}` },
        { label: "Acct. Pur. Return C.D.", value: `+ SAR ${fmt(totalAccountedPurchaseReturnCashDiscount)}` },
        { label: "Sales Return Cash Discount", value: `− SAR ${fmt(totalSalesReturnCashDiscount)}` },
        { label: "Acct. Purchase C.D.", value: `− SAR ${fmt(totalAccountedPurchaseCashDiscount)}` },
        ...(qtnInvoiceAccounting ? [
            { label: "Qtn. Sales Cash Discount", value: `+ SAR ${fmt(qtnSalesCashDiscount)}` },
            { label: "Qtn. Sales Ret. Cash Discount", value: `− SAR ${fmt(qtnSalesReturnCashDiscount)}` },
        ] : []),
    ] : [
        { label: "Exact", value: `SAR ${fmt(expenseTotal)}`, bold: true, color: "#ffa8a8" },
        { divider: true, label: "Expenses", value: `SAR ${fmt(totalExpense)}` },
        { label: "Purchases", value: `+ SAR ${fmt(totalPurchase)}` },
        { label: "Purchase Returns", value: `− SAR ${fmt(totalPurchaseReturn)}` },
        { label: "Sales Cash Discount", value: `+ SAR ${fmt(totalCashDiscount)}` },
        { label: "Pur. Return Cash Discount", value: `+ SAR ${fmt(totalPurchaseReturnCashDiscount)}` },
        { label: "Sales Return Cash Discount", value: `− SAR ${fmt(totalSalesReturnCashDiscount)}` },
        { label: "Purchase Cash Discount", value: `− SAR ${fmt(totalPurchaseCashDiscount)}` },
        ...(qtnInvoiceAccounting ? [
            { label: "Qtn. Sales Cash Discount", value: `+ SAR ${fmt(qtnSalesCashDiscount)}` },
            { label: "Qtn. Sales Ret. Cash Discount", value: `− SAR ${fmt(qtnSalesReturnCashDiscount)}` },
        ] : []),
    ];

    const profitTooltip = [
        { label: "Exact (w/ VAT)", value: `SAR ${fmt(Math.abs(profitLoss))}`, bold: true, color: isProfitable ? "#69db7c" : "#ffa8a8" },
        { label: "Exact (w/o VAT)", value: `SAR ${fmt(Math.abs(profitLossWithoutVAT))}`, bold: true },
        { divider: true, label: "Net Revenue", value: `SAR ${fmt(revenue)}` },
        { label: "Total Expense", value: `− SAR ${fmt(expenseTotal)}` },
        { label: `VAT ${vatPercent}%`, value: `SAR ${fmt(profitLossVat)}` },
    ];

    const ordersTooltip = [
        { label: "Total Orders", value: `${totalOrders.toLocaleString()}`, bold: true },
        { divider: true, label: "Gross Sales", value: `SAR ${fmt(totalSales)}` },
        { label: "Avg per Order", value: `SAR ${fmt(avgOrderValue)}` },
    ];

    const avgTooltip = [
        { label: "Exact", value: `SAR ${fmt(avgOrderValue)}`, bold: true, color: "#74c0fc" },
        { divider: true, label: "Gross Sales", value: `SAR ${fmt(totalSales)}` },
        { label: "Orders", value: `÷ ${totalOrders}` },
    ];

    const returnTooltip = [
        { label: "Return Rate", value: `${returnRate.toFixed(2)}%`, bold: true, color: "#ffa8a8" },
        { divider: true, label: "Sales Returns", value: `SAR ${fmt(totalSalesReturn)}` },
        { label: "Gross Sales", value: `SAR ${fmt(totalSales)}` },
    ];

    return (
        <div className="row">
            <KPICard
                title="Net Revenue"
                tooltip={revenueTooltip}
                value={`SAR ${fmtCompact(revenue)}`}
                exact={`SAR ${fmt(revenue)}`}
                icon="bi bi-currency-dollar"
                color="#4e73df"
            />
            <KPICard
                title="Total Expense"
                tooltip={expenseTooltip}
                value={`SAR ${fmtCompact(expenseTotal)}`}
                exact={`SAR ${fmt(expenseTotal)}`}
                icon="bi bi-receipt-cutoff"
                color="#e74a3b"
            />
            <KPICard
                title={isProfitable ? "Net Profit" : "Net Loss"}
                tooltip={profitTooltip}
                value={`SAR ${fmtCompact(Math.abs(profitLoss))}`}
                exact={`SAR ${fmt(Math.abs(profitLoss))} (w/ VAT) · SAR ${fmt(Math.abs(profitLossWithoutVAT))} (w/o VAT)`}
                sub2={`w/o VAT: SAR ${fmtCompact(Math.abs(profitLossWithoutVAT))}`}
                icon={isProfitable ? "bi bi-graph-up-arrow" : "bi bi-graph-down-arrow"}
                color={isProfitable ? "#1cc88a" : "#e74a3b"}
            />
            <KPICard
                title="Total Orders"
                tooltip={ordersTooltip}
                value={totalOrders.toLocaleString()}
                icon="bi bi-receipt"
                color="#f6c23e"
            />
            <KPICard
                title="Avg Order Value"
                tooltip={avgTooltip}
                value={`SAR ${fmtCompact(avgOrderValue)}`}
                exact={`SAR ${fmt(avgOrderValue)}`}
                icon="bi bi-bag"
                color="#36b9cc"
            />
            <KPICard
                title="Return Rate"
                tooltip={returnTooltip}
                value={`${returnRate.toFixed(1)}%`}
                exact={`${returnRate.toFixed(2)}%`}
                icon="bi bi-arrow-return-left"
                color="#858796"
            />
        </div>
    );
}
