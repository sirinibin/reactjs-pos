import React from "react";
import NumberFormat from "react-number-format";
import { trimTo2Decimals } from "./numberUtils";
import { calcExVAT, calcWithVAT, sumPos } from "./profitCalcs";

function Fmt({ value }) {
    return (
        <NumberFormat
            value={value}
            displayType="text"
            thousandSeparator={true}
            renderText={v => v}
        />
    );
}

export default function ProfitBreakdown({ products = [], commission = 0, cashDiscount = 0, discount = 0, t }) {
    if (!products.length) return null;

    const isLabourName = name => (name || "").toLowerCase() === "labour charge";
    const labour     = products.filter(p =>  p.is_service && isLabourName(p.name));
    const spare      = products.filter(p => !p.is_service);
    const additional = products.filter(p =>  p.is_service && !isLabourName(p.name));

    const deductions = (commission || 0) + (cashDiscount || 0) + (discount || 0);

    // Keep raw floats so net profit arithmetic uses numbers, not strings
    const labourExRaw  = sumPos(labour,     calcExVAT);
    const labourVATRaw = sumPos(labour,     calcWithVAT);
    const spareExRaw   = sumPos(spare,      calcExVAT);
    const spareVATRaw  = sumPos(spare,      calcWithVAT);
    const addExRaw     = sumPos(additional, calcExVAT);
    const addVATRaw    = sumPos(additional, calcWithVAT);

    // Display strings (rounded)
    const labourEx  = trimTo2Decimals(labourExRaw);
    const labourVAT = trimTo2Decimals(labourVATRaw);
    const spareEx   = trimTo2Decimals(spareExRaw);
    const spareVAT  = trimTo2Decimals(spareVATRaw);
    const addEx     = trimTo2Decimals(addExRaw);
    const addVAT    = trimTo2Decimals(addVATRaw);

    // Net profit: sum raw floats first, then round
    const netEx  = trimTo2Decimals(labourExRaw  + spareExRaw  + addExRaw  - deductions);
    const netVAT = trimTo2Decimals(labourVATRaw + spareVATRaw + addVATRaw - deductions);

    const rows = [
        labour.length     && { key: "labour",     label: t("Labour Profit"),     icon: "bi-person-gear",    color: "#e65100", ex: labourEx, vat: labourVAT },
        spare.length      && { key: "spare",      label: t("Spare Profit"),      icon: "bi-box-seam",       color: "#6a1b9a", ex: spareEx,  vat: spareVAT  },
        additional.length && { key: "additional", label: t("Additional Profit"), icon: "bi-three-dots",     color: "#1565c0", ex: addEx,    vat: addVAT    },
    ].filter(Boolean);

    const valColor = v => v >= 0 ? "#15803d" : "#ba1a1a";

    return (
        <section style={{ backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
            {/* Header */}
            <div style={{ padding: "12px 20px", borderBottom: "1px solid #c3c6d7", backgroundColor: "#f2f4f6", display: "flex", alignItems: "center", gap: "8px" }}>
                <i className="bi bi-bar-chart-fill" style={{ color: "#15803d", fontSize: "16px" }}></i>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600, color: "#191c1e", fontFamily: "'Hanken Grotesk', sans-serif" }}>
                    {t("Profit Breakdown")}
                </h3>
            </div>

            <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "380px" }}>
                    <thead>
                        <tr style={{ backgroundColor: "#f8fafc" }}>
                            <th style={thStyle}>{t("Category")}</th>
                            <th style={{ ...thStyle, textAlign: "right" }}>{t("With VAT")}</th>
                            <th style={{ ...thStyle, textAlign: "right" }}>{t("Without VAT")}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(r => (
                            <tr key={r.key} style={{ borderBottom: "1px solid #f1f5f9" }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = "#f8fafc"}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = ""}
                            >
                                <td style={tdLabel}>
                                    <i className={`bi ${r.icon}`} style={{ marginRight: "8px", color: r.color }}></i>
                                    {r.label}
                                </td>
                                <td style={{ ...tdVal, color: valColor(r.vat) }}><Fmt value={r.vat} /></td>
                                <td style={{ ...tdVal, color: valColor(r.ex)  }}><Fmt value={r.ex}  /></td>
                            </tr>
                        ))}

                        {/* Net Profit row */}
                        <tr style={{ backgroundColor: "#f0f9f4", borderTop: "2px solid #c3c6d7" }}>
                            <td style={{ ...tdLabel, fontWeight: 700, color: "#191c1e" }}>
                                <i className="bi bi-graph-up-arrow" style={{ marginRight: "8px", color: "#15803d" }}></i>
                                {t("Net Profit")}
                            </td>
                            <td style={{ ...tdVal, fontSize: "15px", fontWeight: 700, color: valColor(netVAT) }}>
                                <Fmt value={netVAT} />
                            </td>
                            <td style={{ ...tdVal, fontSize: "15px", fontWeight: 700, color: valColor(netEx) }}>
                                <Fmt value={netEx} />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </section>
    );
}

const thStyle = {
    padding: "10px 16px",
    textAlign: "left",
    fontSize: "11px",
    fontWeight: 700,
    color: "#6c757d",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    borderBottom: "2px solid #e2e8f0",
};
const tdLabel = {
    padding: "12px 16px",
    fontSize: "14px",
    color: "#434655",
    fontWeight: 500,
};
const tdVal = {
    padding: "12px 16px",
    textAlign: "right",
    fontSize: "14px",
    fontWeight: 600,
};
