import React, { useState, useEffect, useRef, useCallback } from "react";
import WhatsAppModal from '../../utils/WhatsAppModal';
import { addCommasToInfoValue, stripSarBreakdown } from '../../utils/numberUtils';
import { generateInfoPdf, safeName } from '../../utils/pdfGenerator';
import { uploadPdfForShare } from '../../utils/pdfShare';

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

const BG = '#212529';
const BORDER = '#495057';

function InfoTooltip({ lines, cardTitle, fieldValue, filters, store }) {
    const [show, setShow] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isSharingWA, setIsSharingWA] = useState(false);
    const [showWAModal, setShowWAModal] = useState(false);
    const [waMessage, setWaMessage] = useState("");
    const [error, setError] = useState("");
    const autoCloseRef = useRef(null);
    const triggerRef = useRef(null);
    const tooltipRef = useRef(null);

    const clearAutoClose = useCallback(() => {
        if (autoCloseRef.current) { clearTimeout(autoCloseRef.current); autoCloseRef.current = null; }
    }, []);

    const startAutoClose = useCallback(() => {
        clearAutoClose();
        autoCloseRef.current = setTimeout(() => setShow(false), 5000);
    }, [clearAutoClose]);

    useEffect(() => {
        if (show) startAutoClose(); else clearAutoClose();
        return clearAutoClose;
    }, [show, startAutoClose, clearAutoClose]);

    useEffect(() => {
        if (!show) return;
        const handleDocClick = (e) => {
            if (triggerRef.current?.contains(e.target)) return;
            if (tooltipRef.current?.contains(e.target)) return;
            if (e.target.closest('.modal')) return;
            setShow(false);
        };
        document.addEventListener('mousedown', handleDocClick);
        return () => document.removeEventListener('mousedown', handleDocClick);
    }, [show]);

    const handlePrint = (e) => {
        e.stopPropagation();
        try {
            const doc = generateInfoPdf('', cardTitle || 'KPI', fieldValue, lines, filters, store);
            doc.autoPrint();
            doc.output('dataurlnewwindow');
        } catch (err) { setError(err?.message || 'Print failed'); }
    };

    const handleDownload = async (e) => {
        e.stopPropagation();
        setIsDownloading(true); setError("");
        try {
            const doc = generateInfoPdf('', cardTitle || 'KPI', fieldValue, lines, filters, store);
            doc.save(`${safeName(cardTitle || 'KPI')}.pdf`);
        } catch (err) { setError(err?.message || 'PDF failed'); }
        finally { setIsDownloading(false); }
    };

    const handleWAShare = async (e) => {
        e.stopPropagation();
        setIsSharingWA(true); setError("");
        try {
            const doc = generateInfoPdf('', cardTitle || 'KPI', fieldValue, lines, filters, store);
            const pdfBlob = doc.output('blob');
            const fn = `${safeName(cardTitle || 'KPI')}.pdf`;
            const publicUrl = await uploadPdfForShare(pdfBlob, fn);
            setWaMessage(`Hello, here is ${cardTitle || 'KPI'}:\n${publicUrl}`);
            setShowWAModal(true);
        } catch (err) { setError(err?.message || 'Failed to upload PDF for sharing'); }
        finally { setIsSharingWA(false); }
    };

    const handleWAChoice = ({ type, number, message }) => {
        let url = type === 'number' && number
            ? (() => { let p = number.replace(/\D/g, ''); if (p.startsWith('05')) p = '966' + p.slice(1);
                return navigator.userAgent.toLowerCase().includes('windows')
                    ? `https://web.whatsapp.com/send?phone=${p}&text=${encodeURIComponent(message)}`
                    : `https://wa.me/${p}?text=${encodeURIComponent(message)}`; })()
            : `https://wa.me?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    const descLine = lines && lines[0] && !lines[0].divider && lines[0].bold ? lines[0] : null;
    const detailLines = descLine ? lines.slice(1) : (lines || []);

    return (
        <span style={{ position: "relative", display: "inline-flex", alignItems: "center", marginLeft: "5px", verticalAlign: "middle" }}>
            <i
                ref={triggerRef}
                className="bi bi-info-circle-fill"
                style={{ fontSize: "0.75rem", color: "#adb5bd", cursor: "pointer" }}
                onClick={(e) => { e.stopPropagation(); setShow(p => !p); }}
            />
            {show && (
                <div
                    ref={tooltipRef}
                    style={{
                        position: "absolute", top: "130%", left: "50%", transform: "translateX(-50%)",
                        backgroundColor: BG, color: "#f8f9fa", borderRadius: "6px",
                        border: `1px solid ${BORDER}`, fontSize: "0.73rem", zIndex: 9999,
                        minWidth: "260px", maxWidth: "400px",
                        boxShadow: "0 4px 14px rgba(0,0,0,0.45)", lineHeight: "1.7",
                    }}
                    onMouseEnter={clearAutoClose}
                    onMouseLeave={startAutoClose}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Up arrow */}
                    <div style={{ position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)",
                        width: 0, height: 0, borderLeft: "6px solid transparent",
                        borderRight: "6px solid transparent", borderBottom: `6px solid ${BORDER}` }} />

                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '7px 10px 7px 14px', borderBottom: `1px solid ${BORDER}`,
                        fontWeight: 700, fontSize: '0.8rem' }}>
                        <span>Dashboard — {cardTitle || ''}</span>
                        <button type="button" onClick={(e) => { e.stopPropagation(); setShow(false); }}
                            style={{ background: 'none', border: 'none', color: '#adb5bd', cursor: 'pointer',
                                fontSize: '1.1rem', lineHeight: 1, padding: '0 0 0 10px' }} title="Close">×</button>
                    </div>

                    {/* Date filters */}
                    {Object.entries(filters || {}).filter(([, v]) => v).length > 0 && (
                        <div style={{ padding: '5px 14px', borderBottom: `1px solid ${BORDER}`,
                            fontSize: '0.72rem', color: '#adb5bd', lineHeight: 1.7 }}>
                            {Object.entries(filters || {}).filter(([, v]) => v).map(([k, v]) => (
                                <span key={k} style={{ marginRight: '12px' }}>
                                    {k}: <span style={{ color: '#f8f9fa', fontWeight: 500 }}>{v}</span>
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Description */}
                    {descLine && (
                        <div style={{ padding: '8px 14px', fontWeight: 600, color: descLine.color || '#f8f9fa',
                            borderBottom: `1px solid ${BORDER}`, fontSize: '0.78rem', lineHeight: 1.5 }}>
                            {addCommasToInfoValue(descLine.value)}
                        </div>
                    )}

                    {/* Detail lines table */}
                    {detailLines.length > 0 && (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                            <tbody>
                                {detailLines.map((line, i) => (
                                    <tr key={i} style={{ lineHeight: 1.7, borderTop: line.divider ? `1px solid ${BORDER}` : 'none' }}>
                                        <td style={{ padding: line.divider ? '6px 8px 2px 14px' : '1px 8px 1px 14px',
                                            color: '#adb5bd', whiteSpace: 'nowrap', verticalAlign: 'top', width: '1%' }}>
                                            {line.label || ''}
                                        </td>
                                        <td style={{ padding: line.divider ? '6px 14px 2px 4px' : '1px 14px 1px 4px',
                                            textAlign: 'right', fontWeight: line.bold ? 700 : 400,
                                            color: line.color || '#f8f9fa', whiteSpace: 'nowrap',
                                            fontVariantNumeric: 'tabular-nums' }}>
                                            {stripSarBreakdown(addCommasToInfoValue(line.value), line.bold)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {error && <div style={{ padding: '4px 14px', color: '#f8a5a5', fontSize: '0.72rem' }}>{error}</div>}

                    {/* Action bar */}
                    <div style={{ display: 'flex', gap: '6px', padding: '7px 14px',
                        borderTop: `1px solid ${BORDER}`, justifyContent: 'flex-end' }}>
                        <button onClick={handlePrint}
                            style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)',
                                color: '#adb5bd', borderRadius: '4px', cursor: 'pointer',
                                fontSize: '0.7rem', padding: '2px 9px' }}>
                            <i className="bi bi-printer me-1" />Print
                        </button>
                        <button onClick={handleDownload} disabled={isDownloading}
                            style={{ background: 'none', border: `1px solid rgba(255,255,255,0.3)`,
                                color: '#f8f9fa', borderRadius: '4px', cursor: 'pointer',
                                fontSize: '0.7rem', padding: '2px 9px' }}>
                            {isDownloading
                                ? <span className="spinner-border spinner-border-sm" style={{ width: '0.65rem', height: '0.65rem' }} />
                                : <><i className="bi bi-file-earmark-arrow-down me-1" />PDF</>}
                        </button>
                        <button onClick={handleWAShare} disabled={isSharingWA}
                            style={{ background: 'none', border: '1px solid #28a745',
                                color: '#28a745', borderRadius: '4px', cursor: 'pointer',
                                fontSize: '0.7rem', padding: '2px 9px' }}>
                            {isSharingWA
                                ? <span className="spinner-border spinner-border-sm" style={{ width: '0.65rem', height: '0.65rem' }} />
                                : <><i className="bi bi-whatsapp me-1" />Share</>}
                        </button>
                    </div>
                </div>
            )}
            <WhatsAppModal show={showWAModal} onClose={() => setShowWAModal(false)}
                onChoice={handleWAChoice} defaultMessage={waMessage} hideMessage={true} />
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

function KPICard({ title, tooltip, fieldValue, value, exact, sub2, icon, color, filters, store }) {
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
                            {tooltip && <InfoTooltip lines={tooltip} cardTitle={title} fieldValue={fieldValue} filters={filters} store={store} />}
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
    filters,
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
        { label: "Gross Sales", value: `${fmt(totalSales)}` },
        ...(qtnInvoiceAccounting ? [{ label: "Qtn. Sales", value: `+ ${fmt(totalQtnSales)}` }] : []),
        { label: "Sales Returns", value: `− ${fmt(totalSalesReturn)}` },
        ...(qtnInvoiceAccounting ? [{ label: "Qtn. Returns", value: `− ${fmt(totalQtnSalesReturn)}` }] : []),
        { divider: true, label: "Net Revenue", value: `SAR ${fmt(revenue)}`, bold: true },
    ];

    const expenseTooltip = disablePurchasesOnAccounts ? [
        { label: "Expenses", value: `${fmt(totalExpense)}` },
        { label: "Purchase Return Fund Rcvd", value: `− ${fmt(totalDepositPurchaseFund)}` },
        { label: "Accounted Purchases", value: `+ ${fmt(totalAccountedPurchase)}` },
        { label: "Accounted Pur. Returns", value: `− ${fmt(totalAccountedPurchaseReturn)}` },
        { label: "Sales Cash Discount", value: `+ ${fmt(totalCashDiscount)}` },
        { label: "Acct. Pur. Return C.D.", value: `+ ${fmt(totalAccountedPurchaseReturnCashDiscount)}` },
        { label: "Sales Return C.D.", value: `− ${fmt(totalSalesReturnCashDiscount)}` },
        { label: "Acct. Purchase C.D.", value: `− ${fmt(totalAccountedPurchaseCashDiscount)}` },
        ...(qtnInvoiceAccounting ? [
            { label: "Qtn. Sales C.D.", value: `+ ${fmt(qtnSalesCashDiscount)}` },
            { label: "Qtn. Sales Ret. C.D.", value: `− ${fmt(qtnSalesReturnCashDiscount)}` },
        ] : []),
        { divider: true, label: "Total Expense", value: `SAR ${fmt(expenseTotal)}`, bold: true },
    ] : [
        { label: "Expenses", value: `${fmt(totalExpense)}` },
        { label: "Purchases", value: `+ ${fmt(totalPurchase)}` },
        { label: "Purchase Returns", value: `− ${fmt(totalPurchaseReturn)}` },
        { label: "Sales Cash Discount", value: `+ ${fmt(totalCashDiscount)}` },
        { label: "Pur. Return C.D.", value: `+ ${fmt(totalPurchaseReturnCashDiscount)}` },
        { label: "Sales Return C.D.", value: `− ${fmt(totalSalesReturnCashDiscount)}` },
        { label: "Purchase C.D.", value: `− ${fmt(totalPurchaseCashDiscount)}` },
        ...(qtnInvoiceAccounting ? [
            { label: "Qtn. Sales C.D.", value: `+ ${fmt(qtnSalesCashDiscount)}` },
            { label: "Qtn. Sales Ret. C.D.", value: `− ${fmt(qtnSalesReturnCashDiscount)}` },
        ] : []),
        { divider: true, label: "Total Expense", value: `SAR ${fmt(expenseTotal)}`, bold: true },
    ];

    const profitTooltip = [
        { label: "Net Revenue", value: `${fmt(revenue)}` },
        { label: "Total Expense", value: `− ${fmt(expenseTotal)}` },
        { label: `VAT ${vatPercent}%`, value: `${fmt(profitLossVat)}` },
        { divider: true, label: isProfitable ? "Net Profit" : "Net Loss", value: `SAR ${fmt(Math.abs(profitLoss))}`, bold: true },
    ];

    const ordersTooltip = [
        { label: "Gross Sales", value: `SAR ${fmt(totalSales)}` },
        { label: "Avg per Order", value: `SAR ${fmt(avgOrderValue)}` },
        { divider: true, label: "Total Orders", value: `${totalOrders.toLocaleString()}`, bold: true },
    ];

    const avgTooltip = [
        { label: "Gross Sales", value: `SAR ${fmt(totalSales)}` },
        { label: "Orders", value: `÷ ${totalOrders}` },
        { divider: true, label: "Avg Order Value", value: `SAR ${fmt(avgOrderValue)}`, bold: true },
    ];

    const returnTooltip = [
        { label: "Sales Returns", value: `SAR ${fmt(totalSalesReturn)}` },
        { label: "Gross Sales", value: `SAR ${fmt(totalSales)}` },
        { divider: true, label: "Return Rate", value: `${returnRate.toFixed(2)}%`, bold: true },
    ];

    return (
        <div className="row">
            <KPICard filters={filters} store={store}
                title="Net Revenue"
                tooltip={revenueTooltip}
                fieldValue={revenue}
                value={`${fmtCompact(revenue)}`}
                exact={`${fmt(revenue)}`}
                icon="bi bi-currency-dollar"
                color="#4e73df"
            />
            <KPICard filters={filters} store={store}
                title="Total Expense"
                tooltip={expenseTooltip}
                fieldValue={expenseTotal}
                value={`${fmtCompact(expenseTotal)}`}
                exact={`${fmt(expenseTotal)}`}
                icon="bi bi-receipt-cutoff"
                color="#e74a3b"
            />
            <KPICard filters={filters} store={store}
                title={isProfitable ? "Net Profit" : "Net Loss"}
                tooltip={profitTooltip}
                fieldValue={Math.abs(profitLoss)}
                value={`${fmtCompact(Math.abs(profitLoss))}`}
                exact={`${fmt(Math.abs(profitLoss))} (w/ VAT) · ${fmt(Math.abs(profitLossWithoutVAT))} (w/o VAT)`}
                sub2={`w/o VAT: ${fmtCompact(Math.abs(profitLossWithoutVAT))}`}
                icon={isProfitable ? "bi bi-graph-up-arrow" : "bi bi-graph-down-arrow"}
                color={isProfitable ? "#1cc88a" : "#e74a3b"}
            />
            <KPICard filters={filters} store={store}
                title="Total Orders"
                tooltip={ordersTooltip}
                fieldValue={`${totalOrders.toLocaleString()} orders`}
                value={totalOrders.toLocaleString()}
                icon="bi bi-receipt"
                color="#5c6bc0"
            />
            <KPICard filters={filters} store={store}
                title="Avg Order Value"
                tooltip={avgTooltip}
                fieldValue={avgOrderValue}
                value={`${fmtCompact(avgOrderValue)}`}
                exact={`${fmt(avgOrderValue)}`}
                icon="bi bi-bag"
                color="#36b9cc"
            />
            <KPICard filters={filters} store={store}
                title="Return Rate"
                tooltip={returnTooltip}
                fieldValue={`${returnRate.toFixed(2)}%`}
                value={`${returnRate.toFixed(1)}%`}
                exact={`${returnRate.toFixed(2)}%`}
                icon="bi bi-arrow-return-left"
                color="#858796"
            />
        </div>
    );
}
