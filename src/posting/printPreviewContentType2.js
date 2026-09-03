import { React, forwardRef } from "react";
import { resolveImageUrl } from '../utils/imageUtils';
import { format } from "date-fns";
import n2words from 'n2words';
import Amount from "../utils/amount.js";
import { trimTo2Decimals } from "../utils/numberUtils";

// Local-only Arabic fallback fonts (available to html2canvas even without internet)
const AR_LOCAL = "'Noto Naskh Regular', 'IBM Plex Sans Arabic Regular', 'Traditional Arabic', 'Simplified Arabic', 'Noto Naskh Medium', Tahoma, sans-serif";

// ── palette ────────────────────────────────────────────────────────────────────
const C = {
    navy:         "#0c1f35",
    navyMid:      "#15345a",
    navyLight:    "#1d4e8a",
    gold:         "#c59a2a",
    goldBorder:   "#e8c96b",
    accent:       "#1565c0",
    accentMid:    "#1976d2",
    accentLight:  "#e3f0fd",
    accentBorder: "#90c4f4",
    teal:         "#0d7490",
    muted:        "#64748b",
    mutedLight:   "#94a3b8",
    border:       "#dde3ea",
    borderLight:  "#eef1f5",
    rowAlt:       "#f7f9fb",
    red:          "#b91c1c",
    redBg:        "#fff5f5",
    green:        "#15803d",
    greenBg:      "#f0fdf4",
    orange:       "#c2410c",
    orangeBg:     "#fff7ed",
    orangeBorder: "#fdba74",
    amber:        "#92400e",
    amberBg:      "#fffbeb",
    amberBorder:  "#fcd34d",
    white:        "#ffffff",
    lightGray:    "#f1f5f9",
    midGray:      "#e8edf3",
    textDark:     "#0f172a",
    textMid:      "#334155",
};

const fmtAmt = (v) => {
    if (v == null || v === "" || v === 0) return "";
    const n = parseFloat(trimTo2Decimals(v));
    return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

function arabicDateTime(d) {
    return new Date(d).toLocaleDateString("ar-EG", {
        year: "numeric", month: "long", day: "numeric",
        hour: "numeric", minute: "numeric", second: "numeric",
    });
}

// Convert Western digits to Arabic-Indic numerals
function toArabicNumerals(str) {
    if (!str) return "";
    return String(str).replace(/[0-9]/g, d => "٠١٢٣٤٥٦٧٨٩"[d]);
}

function InfoPair({ label, value }) {
    if (!value) return null;
    return (
        <div style={{ display: "flex", gap: "6px", marginBottom: "5px", fontSize: "10px", alignItems: "flex-start" }}>
            <span style={{
                color: C.mutedLight,
                minWidth: "100px",
                flexShrink: 0,
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: "0.3px",
                fontSize: "8.5px",
                paddingTop: "1px",
            }}>{label}</span>
            <span style={{ color: C.textDark, fontWeight: 700, lineHeight: "1.3" }}>{value}</span>
        </div>
    );
}

// ── main component ─────────────────────────────────────────────────────────────
const BalanceSheetPrintPreviewContentType2 = forwardRef((props, ref) => {
    const isLastPage = (pageIndex) => props.model.pages.length === pageIndex + 1;

    // Put the user-selected document font first so html2canvas uses the same font
    // as the rest of the document (matching Type 1 behaviour), then fall back to
    // local @font-face Arabic fonts that are always available to html2canvas.
    const selectedFont = props.fontSizes[props.modelName + "_font"] || "";
    const arFont = selectedFont
        ? `${selectedFont}, ${AR_LOCAL}`
        : AR_LOCAL;

    const showMinus = props.model.type === "liability" &&
        props.model.store?.settings?.show_minus_on_liability_balance_in_balance_sheet;
    const hideTotalRow = !!props.model.store?.settings?.hide_total_amount_row_in_balance_sheet;

    function closingBalance(raw) {
        if (!raw || raw === 0) return null;
        return showMinus ? raw * -1 : raw;
    }

    function dateLabel() {
        const { dateValue, fromDateValue, toDateValue } = props.model;
        if (dateValue) return format(new Date(dateValue), "MMM dd, yyyy");
        if (fromDateValue && toDateValue)
            return format(new Date(fromDateValue), "MMM dd, yyyy") + " – " + format(new Date(toDateValue), "MMM dd, yyyy");
        if (fromDateValue) return format(new Date(fromDateValue), "MMM dd, yyyy") + " – Present";
        if (toDateValue) return "Up to " + format(new Date(toDateValue), "MMM dd, yyyy");
        return "All Time";
    }

    function buildAddress(entity) {
        const na = entity?.national_address;
        if (!na) return entity?.address || "";
        const parts = [
            na.building_no, na.street_name,
            na.district_name && `– ${na.district_name}`,
            na.unit_no && `Unit #${na.unit_no}`,
            na.city_name,
            na.zipcode,
        ].filter(Boolean);
        return parts.join(" ");
    }

    const dTotal = props.model.debitTotal  || 0;
    const cTotal = props.model.creditTotal || 0;
    const dBal   = props.model.debitBalance  || 0;
    const cBal   = props.model.creditBalance || 0;
    const netBal = props.model.balance || 0;

    const store = props.model.store;

    // Arabic CR & VAT: prefer the _in_arabic field, fall back to converting digits
    const arCR  = store?.registration_number_in_arabic || toArabicNumerals(store?.registration_number);
    const arVAT = store?.vat_no_in_arabic              || toArabicNumerals(store?.vat_no);

    const tStyle = {
        fontFamily: props.fontSizes[props.modelName + "_font"],
        backgroundColor: C.white,
        width: "750px",
        position: "relative",
        overflow: "hidden",
        marginLeft: "auto",
        marginRight: "auto",
    };

    const th = {
        padding: "8px 8px",
        color: C.white,
        backgroundColor: C.navy,
        fontWeight: 700,
        fontSize: props.fontSizes[props.modelName + "_tableHead"]?.size || "9.5px",
        whiteSpace: "nowrap",
        borderRight: `1px solid rgba(255,255,255,0.1)`,
        textAlign: "center",
        letterSpacing: "0.3px",
        textTransform: "uppercase",
    };
    const td = (extra = {}) => ({
        padding: "5px 8px",
        fontSize: props.fontSizes[props.modelName + "_tableBody"]?.size || "10px",
        color: C.textDark,
        borderBottom: `1px solid ${C.borderLight}`,
        borderRight: `1px solid ${C.borderLight}`,
        verticalAlign: "middle",
        ...extra,
    });

    // Shared style for a header info-row (label + value pair inside the header band)
    const hRow = (rtl = false) => ({
        display: "flex",
        alignItems: "center",
        gap: "5px",
        flexDirection: rtl ? "row-reverse" : "row",
        marginTop: "3px",
    });

    return (
        <>
            {props.model.pages && props.model.pages.map((page, pageIndex) => (
                <div key={pageIndex} style={{ ...tStyle, marginTop: page.top + "px", height: "1118px" }}>

                    {/* ── background image ─────────────────────────────────── */}
                    {props.invoiceBackground && props.fontSizes[props.modelName + "_storeHeader"]?.visible && (
                        <img src={props.invoiceBackground} alt="" style={{
                            position: "absolute", top: 0, left: "50%",
                            transform: "translateX(-50%)", width: "105%", height: "1118px",
                            objectFit: "cover", objectPosition: "top center",
                            zIndex: 0, pointerEvents: "none",
                        }} />
                    )}

                    <div style={{ position: "relative", zIndex: 1 }}>

                        {/* ════════════════════════════════════════════════════
                            HEADER BAND
                        ════════════════════════════════════════════════════ */}
                        {props.fontSizes[props.modelName + "_storeHeader"]?.visible && !props.invoiceBackground && (
                            <div style={{
                                background: `linear-gradient(120deg, ${C.navy} 0%, ${C.navyMid} 55%, ${C.navyLight} 100%)`,
                                padding: "0",
                                position: "relative",
                            }}>
                                <div style={{
                                    display: "grid",
                                    gridTemplateColumns: "1fr auto 1fr",
                                    alignItems: "stretch",
                                    padding: "14px 18px 10px 18px",
                                    gap: "12px",
                                }}>

                                    {/* ── LEFT: English ─────────────────────── */}
                                    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                                        {store?.store_name && (
                                            <div style={{ color: C.white, fontSize: "20px", fontWeight: 800, lineHeight: "1.2" }}>
                                                {store.store_name}
                                            </div>
                                        )}
                                        {/* Store name */}
                                        <div style={{
                                            color: C.white,
                                            fontSize: props.fontSizes[props.modelName + "_storeName"]?.size || "16px",
                                            fontWeight: 800,
                                            letterSpacing: "0.3px",
                                            lineHeight: "1.2",
                                        }}>
                                            {store?.name || ""}
                                        </div>

                                        {/* Store title */}
                                        {store?.title && (
                                            <div style={{
                                                color: "#93c5fd",
                                                fontSize: "9.5px",
                                                marginTop: "3px",
                                                fontWeight: 500,
                                                letterSpacing: "0.2px",
                                            }}>
                                                {store.title}
                                            </div>
                                        )}

                                        {/* Divider */}
                                        {(store?.registration_number || store?.vat_no) && (
                                            <div style={{
                                                borderTop: "1px solid rgba(255,255,255,0.15)",
                                                margin: "8px 0 6px",
                                            }} />
                                        )}

                                        {/* C.R. */}
                                        {store?.registration_number && (
                                            <div style={hRow(false)}>
                                                <span style={{
                                                    color: "#7dd3fc",
                                                    fontSize: "8.5px",
                                                    fontWeight: 700,
                                                    letterSpacing: "0.5px",
                                                    minWidth: "26px",
                                                }}>C.R.</span>
                                                <span style={{
                                                    color: "#e2e8f0",
                                                    fontSize: "9px",
                                                    fontWeight: 500,
                                                    letterSpacing: "0.3px",
                                                }}>{store.registration_number}</span>
                                            </div>
                                        )}

                                        {/* VAT */}
                                        {store?.vat_no && (
                                            <div style={hRow(false)}>
                                                <span style={{
                                                    color: "#7dd3fc",
                                                    fontSize: "8.5px",
                                                    fontWeight: 700,
                                                    letterSpacing: "0.5px",
                                                    minWidth: "26px",
                                                }}>VAT</span>
                                                <span style={{
                                                    color: "#e2e8f0",
                                                    fontSize: "9px",
                                                    fontWeight: 500,
                                                    letterSpacing: "0.3px",
                                                }}>{store.vat_no}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* ── CENTER: Logo ──────────────────────── */}
                                    <div style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        padding: "0 8px 14px",
                                    }}>
                                        {store?.logo ? (
                                            <img
                                                src={resolveImageUrl(store.logo, store.id, "store") + "?" + Date.now()}
                                                alt="Logo"
                                                style={{
                                                    width: "72px", height: "72px",
                                                    borderRadius: "12px",
                                                    border: "3px solid rgba(255,255,255,0.28)",
                                                    objectFit: "contain",
                                                    backgroundColor: "white",
                                                    boxShadow: "0 4px 16px rgba(0,0,0,0.35)",
                                                    display: "block",
                                                }}
                                            />
                                        ) : (
                                            <div style={{
                                                width: "72px", height: "72px", borderRadius: "12px",
                                                border: "3px solid rgba(255,255,255,0.2)",
                                                background: "rgba(255,255,255,0.08)",
                                                display: "flex", alignItems: "center", justifyContent: "center",
                                                color: "rgba(255,255,255,0.35)", fontSize: "9px",
                                            }}>LOGO</div>
                                        )}
                                    </div>

                                    {/* ── RIGHT: Arabic ─────────────────────── */}
                                    <div style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        justifyContent: "center",
                                        alignItems: "flex-start",
                                        textAlign: "right",
                                        direction: "rtl",
                                    }}>
                                        {store?.store_name_in_arabic && (
                                            <div style={{ color: C.white, fontSize: "20px", fontWeight: 800, lineHeight: "1.2", fontFamily: arFont }}>
                                                {store.store_name_in_arabic}
                                            </div>
                                        )}
                                        {/* Store name Arabic */}
                                        <div style={{
                                            color: C.white,
                                            fontSize: props.fontSizes[props.modelName + "_storeNameArabic"]?.size || "16px",
                                            fontWeight: 800,
                                            lineHeight: "1.2",
                                            fontFamily: arFont,
                                        }}>
                                            {store?.name_in_arabic || ""}
                                        </div>

                                        {/* Store title Arabic */}
                                        {store?.title_in_arabic && (
                                            <div style={{
                                                color: "#93c5fd",
                                                fontSize: "9.5px",
                                                marginTop: "3px",
                                                fontWeight: 500,
                                                fontFamily: arFont,
                                            }}>
                                                {store.title_in_arabic}
                                            </div>
                                        )}

                                        {/* Divider */}
                                        {(store?.registration_number || store?.vat_no) && (
                                            <div style={{
                                                borderTop: "1px solid rgba(255,255,255,0.15)",
                                                margin: "8px 0 6px",
                                                width: "100%",
                                            }} />
                                        )}

                                        {/* C.R. Arabic */}
                                        {(arCR) && (
                                            <div style={hRow(false)}>
                                                <span style={{
                                                    color: "#7dd3fc",
                                                    fontSize: "8.5px",
                                                    fontWeight: 700,
                                                    letterSpacing: "0.5px",
                                                }}>س.ت.</span>
                                                <span style={{
                                                    color: "#e2e8f0",
                                                    fontSize: "9px",
                                                    fontWeight: 500,
                                                    letterSpacing: "0.3px",
                                                }}>{arCR}</span>
                                            </div>
                                        )}

                                        {/* VAT Arabic */}
                                        {(arVAT) && (
                                            <div style={hRow(false)}>
                                                <span style={{
                                                    color: "#7dd3fc",
                                                    fontSize: "8.5px",
                                                    fontWeight: 700,
                                                    letterSpacing: "0.5px",
                                                }}>ض.م.ق.</span>
                                                <span style={{
                                                    color: "#e2e8f0",
                                                    fontSize: "9px",
                                                    fontWeight: 500,
                                                    letterSpacing: "0.3px",
                                                }}>{arVAT}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* gold accent line at bottom of header */}
                                <div style={{
                                    height: "3px",
                                    background: `linear-gradient(90deg, transparent 0%, ${C.gold} 20%, ${C.goldBorder} 50%, ${C.gold} 80%, transparent 100%)`,
                                }} />
                            </div>
                        )}

                        {/* ════════════════════════════════════════════════════
                            TITLE
                        ════════════════════════════════════════════════════ */}
                        <div style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: props.fontSizes[props.modelName + "_storeHeader"]?.visible && !props.invoiceBackground
                                ? "10px 20px 8px"
                                : (props.fontSizes[props.modelName + "_marginTop"]?.size || "20px") + " 20px 8px",
                            gap: "12px",
                        }}>
                            <div style={{
                                flex: 1, height: "1px",
                                background: `linear-gradient(90deg, transparent, ${C.border})`,
                            }} />
                            <div style={{ textAlign: "center" }}>
                                <div style={{
                                    fontSize: props.fontSizes[props.modelName + "_invoiceTitle"]?.size || "16px",
                                    fontWeight: 900,
                                    color: C.navy,
                                    letterSpacing: "5px",
                                    textTransform: "uppercase",
                                }}>
                                    BALANCE SHEET
                                </div>
                                <div style={{
                                    color: C.mutedLight,
                                    fontSize: "11px",
                                    marginTop: "2px",
                                    fontWeight: 500,
                                    fontFamily: arFont,
                                }}>
                                    ورقة التوازن
                                </div>
                            </div>
                            <div style={{
                                flex: 1, height: "1px",
                                background: `linear-gradient(90deg, ${C.border}, transparent)`,
                            }} />
                        </div>

                        {/* ════════════════════════════════════════════════════
                            ACCOUNT INFO CARD (page 0 only)
                        ════════════════════════════════════════════════════ */}
                        {pageIndex === 0 && (
                            <div
                                style={{
                                    margin: "0 16px 8px",
                                    border: `1px solid ${C.border}`,
                                    borderLeft: `4px solid ${C.accent}`,
                                    borderRadius: "6px",
                                    overflow: "hidden",
                                    fontSize: props.fontSizes[props.modelName + "_invoiceDetails"]?.size || "10px",
                                }}
                                className="clickable-text"
                                onClick={() => props.selectText("invoiceDetails")}
                            >
                                {/* card header */}
                                <div style={{
                                    background: `linear-gradient(90deg, ${C.accentLight} 0%, #f0f7ff 100%)`,
                                    padding: "6px 14px",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    borderBottom: `1px solid ${C.accentBorder}`,
                                }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <div style={{
                                            width: "3px", height: "14px",
                                            background: C.accent,
                                            borderRadius: "2px",
                                        }} />
                                        <span style={{
                                            fontWeight: 800,
                                            color: C.navy,
                                            fontSize: "10.5px",
                                            letterSpacing: "1px",
                                            textTransform: "uppercase",
                                        }}>
                                            Account Statement
                                        </span>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                        {dateLabel() && (
                                            <span style={{
                                                background: C.navy,
                                                color: C.white,
                                                fontSize: "8.5px",
                                                fontWeight: 700,
                                                padding: "2px 10px",
                                                borderRadius: "12px",
                                                letterSpacing: "0.3px",
                                            }}>
                                                {dateLabel()}
                                            </span>
                                        )}
                                        <span style={{ color: C.muted, fontSize: "9px" }}>
                                            {props.model.total_pages
                                                ? `Page 1 of ${props.model.total_pages}`
                                                : ""}
                                        </span>
                                    </div>
                                </div>

                                {/* two-column detail grid */}
                                <div style={{
                                    display: "grid",
                                    gridTemplateColumns: "1fr 1fr",
                                    padding: "10px 14px",
                                    background: C.white,
                                }}>
                                    <div style={{ paddingRight: "14px", borderRight: `1px solid ${C.border}` }}>
                                        <InfoPair
                                            label="Account Name"
                                            value={(props.model.name && props.model.name_arabic)
                                                ? `${props.model.name}  |  ${props.model.name_arabic}`
                                                : props.model.name}
                                        />
                                        <InfoPair label="Account Number" value={props.model.number} />

                                        {props.model.reference_model === "customer" && <>
                                            <InfoPair
                                                label="Customer Name"
                                                value={props.model.customer
                                                    ? (props.model.customer.name + (props.model.customer.name_in_arabic ? `  |  ${props.model.customer.name_in_arabic}` : ""))
                                                    : props.model.customerName || "N/A"}
                                            />
                                            <InfoPair label="Customer ID" value={props.model.customer?.code || "N/A"} />
                                            <InfoPair label="VAT No." value={props.model.customer?.vat_no || props.model.vat_no || "N/A"} />
                                            <InfoPair label="C.R. No." value={props.model.customer?.registration_number || "N/A"} />
                                            <InfoPair label="Address" value={buildAddress(props.model.customer) || props.model.address} />
                                        </>}

                                        {props.model.reference_model === "vendor" && <>
                                            <InfoPair
                                                label="Vendor Name"
                                                value={props.model.vendor
                                                    ? props.model.vendor.name
                                                    : props.model.vendorName || "N/A"}
                                            />
                                            <InfoPair label="Vendor ID" value={props.model.vendor?.code || "N/A"} />
                                            <InfoPair label="VAT No." value={props.model.vendor?.vat_no || props.model.vat_no || "N/A"} />
                                            <InfoPair label="C.R. No." value={props.model.vendor?.registration_number || "N/A"} />
                                            <InfoPair label="Address" value={buildAddress(props.model.vendor) || props.model.address} />
                                        </>}
                                    </div>

                                    <div style={{ paddingLeft: "14px" }}>
                                        <InfoPair label="Period" value={dateLabel()} />
                                        <InfoPair
                                            label="Net Balance"
                                            value={netBal
                                                ? `SAR ${parseFloat(netBal).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                                : "SAR 0.00"}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* page indicator (subsequent pages) */}
                        {pageIndex > 0 && props.model.total_pages && (
                            <div style={{
                                display: "flex", justifyContent: "space-between", alignItems: "center",
                                padding: "5px 16px", fontSize: "9.5px", color: C.muted,
                                borderBottom: `1px solid ${C.border}`,
                                margin: "0 16px 6px",
                                background: C.lightGray,
                                borderRadius: "4px",
                            }}>
                                <span style={{ fontWeight: 600, color: C.navy }}>
                                    {props.model.name}
                                </span>
                                <span>
                                    Page <strong style={{ color: C.navy }}>{pageIndex + 1}</strong> of {props.model.total_pages}
                                </span>
                            </div>
                        )}

                        {/* ════════════════════════════════════════════════════
                            LEDGER TABLE
                        ════════════════════════════════════════════════════ */}
                        <div style={{ margin: "0 16px" }}>
                            <table style={{
                                width: "100%",
                                borderCollapse: "collapse",
                                border: `1px solid ${C.border}`,
                                tableLayout: "fixed",
                            }}>
                                <colgroup>
                                    <col style={{ width: "4%" }} />
                                    <col style={{ width: "11%" }} />
                                    <col style={{ width: "14%" }} />
                                    <col style={{ width: "19%" }} />
                                    <col style={{ width: "11%" }} />
                                    <col style={{ width: "19%" }} />
                                    <col style={{ width: "11%" }} />
                                    <col style={{ width: "11%" }} />
                                </colgroup>

                                <thead>
                                    <tr className="clickable-text" onClick={(e) => { e.stopPropagation(); props.selectText("tableHead"); }}>
                                        <th style={{ ...th, textAlign: "center" }}>#</th>
                                        <th style={{ ...th }}>Date</th>
                                        <th style={{ ...th }}>Reference</th>
                                        <th style={{ ...th, textAlign: "left" }}>Debit Account</th>
                                        <th style={{ ...th, textAlign: "right" }}>Debit</th>
                                        <th style={{ ...th, textAlign: "left" }}>Credit Account</th>
                                        <th style={{ ...th, textAlign: "right" }}>Credit</th>
                                        <th style={{ ...th, textAlign: "right", borderRight: "none" }}>Balance</th>
                                    </tr>
                                </thead>

                                <tbody className="clickable-text" onClick={() => props.selectText("tableBody")}>

                                    {/* ── opening balance row ───────────────── */}
                                    {pageIndex === 0 &&
                                        (props.model.debitBalanceBoughtDown > 0 || props.model.creditBalanceBoughtDown > 0) &&
                                        !props.model.ignoreOpeningBalance && (
                                            <tr style={{ background: C.amberBg }}>
                                                <td style={{ ...td({ background: C.amberBg, borderBottom: `1px solid ${C.amberBorder}`, textAlign: "center" }) }}>
                                                    <span style={{ color: C.mutedLight, fontSize: "9px" }}>—</span>
                                                </td>
                                                <td style={{ ...td({ background: C.amberBg, borderBottom: `1px solid ${C.amberBorder}` }) }}></td>
                                                <td style={{ ...td({ background: C.amberBg, borderBottom: `1px solid ${C.amberBorder}` }) }}>
                                                    <span style={{
                                                        fontWeight: 700, color: C.amber,
                                                        fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.4px",
                                                    }}>Opening Balance</span>
                                                </td>
                                                <td colSpan={2} style={{ ...td({ background: C.amberBg, borderBottom: `1px solid ${C.amberBorder}`, textAlign: "right" }) }}>
                                                    <span style={{ fontWeight: 800, color: C.amber, fontSize: "10px" }}>
                                                        {props.model.debitBalanceBoughtDown > 0 ? fmtAmt(props.model.debitBalanceBoughtDown) : ""}
                                                    </span>
                                                </td>
                                                <td colSpan={2} style={{ ...td({ background: C.amberBg, borderBottom: `1px solid ${C.amberBorder}`, textAlign: "right" }) }}>
                                                    <span style={{ fontWeight: 800, color: C.amber, fontSize: "10px" }}>
                                                        {props.model.creditBalanceBoughtDown > 0 ? fmtAmt(props.model.creditBalanceBoughtDown) : ""}
                                                    </span>
                                                </td>
                                                <td style={{ ...td({ background: C.amberBg, borderBottom: `1px solid ${C.amberBorder}`, borderRight: "none" }) }}></td>
                                            </tr>
                                        )}

                                    {/* ── data rows ────────────────────────── */}
                                    {page.posts && page.posts.filter(p => p.date).map((post, i) => (
                                        <tr key={i} style={{ background: i % 2 === 0 ? C.white : C.rowAlt }}>
                                            <td style={{ ...td({ textAlign: "center" }) }}>
                                                <span style={{ color: C.mutedLight, fontSize: "9px", fontWeight: 500 }}>
                                                    {post.no}
                                                </span>
                                            </td>
                                            <td style={{ ...td({ whiteSpace: "nowrap", fontSize: "9px", color: C.textMid }) }}>
                                                {post.date ? format(new Date(post.date), "dd MMM yyyy") : ""}
                                            </td>
                                            <td style={{ ...td({ fontSize: "9px", wordBreak: "break-all", color: C.textMid }) }}>
                                                {post.reference_code}
                                            </td>
                                            <td style={{ ...td({ fontSize: "9px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }) }}>
                                                {post.debit_account_name && (
                                                    <span style={{ color: C.navyMid, fontWeight: 700 }}>
                                                        {post.debit_account_name}
                                                    </span>
                                                )}
                                                {post.debit_account_number && (
                                                    <span style={{ color: C.mutedLight, marginLeft: "3px", fontSize: "8.5px" }}>
                                                        #{post.debit_account_number}
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ ...td({ textAlign: "right" }) }}>
                                                {post.debit_amount ? (
                                                    <span style={{
                                                        fontWeight: 700, color: C.red,
                                                        background: C.redBg,
                                                        padding: "1px 5px", borderRadius: "3px", fontSize: "9.5px",
                                                    }}>
                                                        {fmtAmt(post.debit_amount)}
                                                    </span>
                                                ) : ""}
                                            </td>
                                            <td style={{ ...td({ fontSize: "9px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }) }}>
                                                {post.credit_account_name && (
                                                    <span style={{ color: C.teal, fontWeight: 700 }}>
                                                        {post.credit_account_name}
                                                    </span>
                                                )}
                                                {post.credit_account_number && (
                                                    <span style={{ color: C.mutedLight, marginLeft: "3px", fontSize: "8.5px" }}>
                                                        #{post.credit_account_number}
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ ...td({ textAlign: "right" }) }}>
                                                {post.credit_amount ? (
                                                    <span style={{
                                                        fontWeight: 700, color: C.green,
                                                        background: C.greenBg,
                                                        padding: "1px 5px", borderRadius: "3px", fontSize: "9.5px",
                                                    }}>
                                                        {fmtAmt(post.credit_amount)}
                                                    </span>
                                                ) : ""}
                                            </td>
                                            <td style={{ ...td({ textAlign: "right", fontWeight: 800, color: C.navy, fontSize: "10px", borderRight: "none" }) }}>
                                                <Amount amount={trimTo2Decimals(post.balance_amount)} />
                                            </td>
                                        </tr>
                                    ))}

                                    {/* ── totals footer (last page only) ───── */}
                                    {isLastPage(pageIndex) && (<>

                                        {/* Period Total */}
                                        <tr>
                                            <td colSpan={3} style={{
                                                ...td({ background: C.accentLight, textAlign: "right" }),
                                                borderTop: `2px solid ${C.accentMid}`,
                                            }}>
                                                <span style={{
                                                    fontWeight: 700, color: C.navy,
                                                    fontSize: "9.5px", textTransform: "uppercase", letterSpacing: "0.5px",
                                                }}>Period Total</span>
                                            </td>
                                            <td colSpan={2} style={{
                                                ...td({ background: C.accentLight, textAlign: "right" }),
                                                borderTop: `2px solid ${C.accentMid}`,
                                            }}>
                                                <span style={{ fontWeight: 800, color: C.navy, fontSize: "11px" }}>
                                                    {fmtAmt(dTotal)}
                                                </span>
                                            </td>
                                            <td colSpan={2} style={{
                                                ...td({ background: C.accentLight, textAlign: "right" }),
                                                borderTop: `2px solid ${C.accentMid}`,
                                            }}>
                                                <span style={{ fontWeight: 800, color: C.navy, fontSize: "11px" }}>
                                                    {fmtAmt(cTotal)}
                                                </span>
                                            </td>
                                            <td style={{
                                                ...td({ background: C.accentLight, borderRight: "none" }),
                                                borderTop: `2px solid ${C.accentMid}`,
                                            }}></td>
                                        </tr>

                                        {/* Closing Balance */}
                                        {(dBal > 0 || cBal > 0) && (
                                            <tr>
                                                <td colSpan={3} style={{
                                                    ...td({ background: C.orangeBg, textAlign: "right" }),
                                                    borderTop: `1px solid ${C.orangeBorder}`,
                                                }}>
                                                    <span style={{
                                                        fontWeight: 700, color: C.orange,
                                                        fontSize: "9.5px", textTransform: "uppercase", letterSpacing: "0.5px",
                                                    }}>Closing Balance</span>
                                                </td>
                                                <td colSpan={2} style={{
                                                    ...td({ background: C.orangeBg, textAlign: "right" }),
                                                    borderTop: `1px solid ${C.orangeBorder}`,
                                                }}>
                                                    <span style={{ fontWeight: 800, color: C.orange, fontSize: "11px" }}>
                                                        {dBal > 0 ? fmtAmt(closingBalance(dBal)) : ""}
                                                    </span>
                                                </td>
                                                <td colSpan={2} style={{
                                                    ...td({ background: C.orangeBg, textAlign: "right" }),
                                                    borderTop: `1px solid ${C.orangeBorder}`,
                                                }}>
                                                    <span style={{ fontWeight: 800, color: C.orange, fontSize: "11px" }}>
                                                        {cBal > 0 ? fmtAmt(closingBalance(cBal)) : ""}
                                                    </span>
                                                </td>
                                                <td style={{
                                                    ...td({ background: C.orangeBg, borderRight: "none" }),
                                                    borderTop: `1px solid ${C.orangeBorder}`,
                                                }}></td>
                                            </tr>
                                        )}

                                        {/* Grand Total */}
                                        {!hideTotalRow && (
                                            <tr>
                                                <td colSpan={3} style={{
                                                    ...td({ background: C.midGray, textAlign: "right" }),
                                                    borderTop: `1px solid ${C.border}`,
                                                }}>
                                                    <span style={{
                                                        fontWeight: 700, color: C.textDark,
                                                        fontSize: "9.5px", textTransform: "uppercase", letterSpacing: "0.5px",
                                                    }}>Grand Total</span>
                                                </td>
                                                <td colSpan={2} style={{
                                                    ...td({ background: C.midGray, textAlign: "right" }),
                                                    borderTop: `1px solid ${C.border}`,
                                                }}>
                                                    <span style={{ fontWeight: 800, color: C.textDark, fontSize: "11px" }}>
                                                        {fmtAmt(Math.max(dTotal, cTotal))}
                                                    </span>
                                                </td>
                                                <td colSpan={2} style={{
                                                    ...td({ background: C.midGray, textAlign: "right" }),
                                                    borderTop: `1px solid ${C.border}`,
                                                }}>
                                                    <span style={{ fontWeight: 800, color: C.textDark, fontSize: "11px" }}>
                                                        {fmtAmt(Math.max(dTotal, cTotal))}
                                                    </span>
                                                </td>
                                                <td style={{
                                                    ...td({ background: C.midGray, borderRight: "none" }),
                                                    borderTop: `1px solid ${C.border}`,
                                                }}></td>
                                            </tr>
                                        )}

                                    </>)}
                                </tbody>
                            </table>

                            {/* Balance in Words — div (not table cell) so html2canvas renders Arabic correctly */}
                            {isLastPage(pageIndex) && (
                                <div style={{ display: "flex", borderTop: `1px solid ${C.border}` }}>
                                    <div style={{
                                        width: "15%",
                                        background: C.lightGray,
                                        padding: "5px 8px",
                                        borderRight: `1px solid ${C.borderLight}`,
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}>
                                        <div style={{
                                            fontWeight: 800, color: C.navy,
                                            fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.4px",
                                        }}>
                                            Balance In Words
                                        </div>
                                        <div style={{ color: C.muted, marginTop: "3px", fontWeight: 500, fontSize: "9px", fontFamily: arFont }}>
                                            التوازن بالكلمات
                                        </div>
                                    </div>
                                    <div style={{ flex: 1, background: C.white, padding: "7px 12px" }}>
                                        <div style={{ fontWeight: 700, color: C.textDark, fontSize: "10px", lineHeight: "1.5" }}>
                                            {(() => {
                                                const w = n2words(netBal, { lang: 'en' }) + " Saudi Riyals Only";
                                                return w.charAt(0).toUpperCase() + w.slice(1);
                                            })()}
                                        </div>
                                        <div style={{
                                            color: C.muted, fontSize: "10px", marginTop: "3px",
                                            lineHeight: "1.5", direction: "rtl", textAlign: "right",
                                            fontFamily: arFont,
                                        }}>
                                            {n2words(netBal, { lang: 'ar' })} ريال سعودي فقط
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ════════════════════════════════════════════════════
                            SIGNATURE / DATE (last page)
                        ════════════════════════════════════════════════════ */}
                        {isLastPage(pageIndex) && (
                            <div style={{
                                margin: "8px 16px 0",
                                border: `1px solid ${C.border}`,
                                borderRadius: "6px",
                                overflow: "hidden",
                            }}>
                                <div style={{
                                    display: "grid",
                                    gridTemplateColumns: "1fr 1fr",
                                    fontSize: props.fontSizes[props.modelName + "_tableFooter"]?.size || "10px",
                                }}>
                                    <div style={{
                                        padding: "10px 16px 12px",
                                        borderRight: `1px solid ${C.border}`,
                                        minHeight: "65px",
                                    }}>
                                        <div style={{
                                            fontWeight: 700, color: C.navy,
                                            fontSize: "8.5px", textTransform: "uppercase",
                                            letterSpacing: "0.5px", marginBottom: "6px",
                                        }}>
                                            Authorised Signature &nbsp; · &nbsp; <span style={{ fontFamily: arFont, letterSpacing: "normal" }}>إمضاء</span>
                                        </div>
                                        <div style={{ height: "32px" }}></div>
                                        <div style={{
                                            borderTop: `1px solid ${C.navy}`,
                                            width: "55%", marginTop: "2px",
                                        }}></div>
                                    </div>
                                    <div style={{ padding: "10px 16px" }}>
                                        <div style={{
                                            fontWeight: 700, color: C.navy,
                                            fontSize: "8.5px", textTransform: "uppercase",
                                            letterSpacing: "0.5px", marginBottom: "6px",
                                        }}>
                                            Date &nbsp; · &nbsp; <span style={{ fontFamily: arFont, letterSpacing: "normal" }}>تاريخ</span>
                                        </div>
                                        <div style={{ fontSize: "11px", color: C.textDark, fontWeight: 700 }}>
                                            {format(new Date(), "dd MMM yyyy")}
                                        </div>
                                        <div style={{ fontSize: "9.5px", color: C.textMid, marginTop: "1px" }}>
                                            {format(new Date(), "h:mm a")}
                                        </div>
                                        <div style={{ fontSize: "9px", color: C.muted, marginTop: "3px", fontFamily: arFont, letterSpacing: "normal" }}>
                                            {arabicDateTime(new Date())}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── store address footer ──────────────────────────── */}
                        {isLastPage(pageIndex) && store?.settings?.show_address_in_invoice_footer && (
                            <div
                                style={{
                                    margin: "6px 16px 0",
                                    padding: "6px 0 4px",
                                    borderTop: `1px solid ${C.border}`,
                                    textAlign: "center",
                                    fontSize: props.fontSizes[props.modelName + "_footer"]?.size || "9px",
                                    color: C.muted,
                                    lineHeight: "1.7",
                                }}
                                className="clickable-text"
                                onClick={() => props.selectText("footer")}
                            >
                                {store?.national_address && [store.national_address.building_no_arabic, store.national_address.street_name_arabic, store.national_address.district_name_arabic, store.national_address.city_name_arabic].filter(Boolean).length > 0 && <div style={{ fontFamily: arFont }}>{[store.national_address.building_no_arabic, store.national_address.street_name_arabic, store.national_address.district_name_arabic, store.national_address.city_name_arabic].filter(Boolean).join('، ')}</div>}
                                {store?.national_address && [store.national_address.building_no, store.national_address.street_name, store.national_address.district_name, store.national_address.city_name].filter(Boolean).length > 0 && <div>{[store.national_address.building_no, store.national_address.street_name, store.national_address.district_name, store.national_address.city_name].filter(Boolean).join(', ')}</div>}
                                {(store?.phone || store?.phone_in_arabic) && (
                                    <div>
                                        {store?.phone_in_arabic && <span style={{ fontFamily: arFont }}>{`هاتف: ${store.phone_in_arabic}  `}</span>}
                                        {store?.phone && `Phone: ${store.phone}`}
                                    </div>
                                )}
                                {store?.email && <div>Email: {store.email}</div>}
                            </div>
                        )}

                    </div>
                </div>
            ))}
        </>
    );
});

export default BalanceSheetPrintPreviewContentType2;
