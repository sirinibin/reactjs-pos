import { React, forwardRef } from "react";
import { resolveImageUrl } from '../utils/imageUtils';
import { format } from "date-fns";
import n2words from 'n2words';
import { trimTo2Decimals } from "../utils/numberUtils";
import Amount from "../utils/amount.js";
import { QRCodeSVG } from "qrcode.react";
import "@emran-alhaddad/saudi-riyal-font/index.css";
import "./noprint.css";

// Local @font-face Arabic fonts — always available to html2canvas (no internet needed)
const AR_LOCAL = "'Noto Naskh Regular', 'IBM Plex Sans Arabic Regular', 'Traditional Arabic', 'Simplified Arabic', 'Noto Naskh Medium', Tahoma, sans-serif";

const C = {
    navy: "#0c1f35",
    navyMid: "#15345a",
    navyLight: "#1d4e8a",
    gold: "#c59a2a",
    goldBorder: "#e8c96b",
    muted: "#64748b",
    mutedLight: "#94a3b8",
    border: "#dde3ea",
    borderLight: "#eef1f5",
    rowAlt: "#f7f9fb",
    white: "#ffffff",
    lightGray: "#f1f5f9",
    midGray: "#e8edf3",
    textDark: "#0f172a",
    textMid: "#334155",
    green: "#15803d",
    greenBg: "#f0fdf4",
    red: "#b91c1c",
    redBg: "#fff5f5",
    accentLight: "#e3f0fd",
    accent: "#1565c0",
    teal: "#0d7490",
};

function toArabicNumerals(str) {
    if (!str) return "";
    return String(str).replace(/[0-9]/g, d => "٠١٢٣٤٥٦٧٨٩"[d]);
}

function capitalizeFirst(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// ── Detail row — label on left, value on right ──────────────────────────────
function DRow({ label, labelAr, value, arFont, noBorder }) {
    return (
        <div style={{
            display: "flex",
            borderBottom: noBorder ? "none" : `1px solid ${C.borderLight}`,
            minHeight: "19px",
        }}>
            <div style={{
                width: "42%",
                padding: "3px 6px",
                background: C.lightGray,
                fontWeight: 600,
                fontSize: "8px",
                color: C.textMid,
                borderRight: `1px solid ${C.border}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexShrink: 0,
            }}>
                <span>{label}</span>
                {labelAr && (
                    <span style={{ fontFamily: arFont, color: C.muted, fontSize: "8px" }}>{labelAr}</span>
                )}
            </div>
            <div style={{
                flex: 1,
                padding: "3px 6px",
                fontSize: "8px",
                color: C.textDark,
                wordBreak: "break-word",
            }}>
                {value}
            </div>
        </div>
    );
}

// ── Main component ──────────────────────────────────────────────────────────
const PreviewContentType2 = forwardRef((props, ref) => {
    const m = props.model;
    const mn = props.modelName;
    const st = m?.store;
    const cfg = st?.settings || {};
    const isLP = (idx) => idx === m.pages.length - 1;

    const selFont = props.fontSizes?.[mn + "_font"] || "";
    const arFont = selFont ? `${selFont}, ${AR_LOCAL}` : AR_LOCAL;

    const arCR = st?.registration_number_in_arabic || toArabicNumerals(st?.registration_number);
    const arVAT = st?.vat_no_in_arabic || toArabicNumerals(st?.vat_no);

    // ── Model-name helpers ──────────────────────────────────────────────────
    const forCustomer = ["sales", "whatsapp_sales", "sales_return", "whatsapp_sales_return",
        "quotation", "whatsapp_quotation", "quotation_sales_return", "whatsapp_quotation_sales_return",
        "delivery_note", "whatsapp_delivery_note", "non_vat_sales_return"].includes(mn);
    const forVendor = ["purchase", "whatsapp_purchase", "purchase_return", "whatsapp_purchase_return",
        "purchase_order", "whatsapp_purchase_order"].includes(mn);
    const isQuotation = (mn === "quotation" || mn === "whatsapp_quotation")
        && m.type !== "invoice";
    const isNonVAT = mn === "non_vat_invoice" || mn === "non_vat_sales_return";
    const isDelivery = mn === "delivery_note" || mn === "whatsapp_delivery_note";
    const isTransfer = mn === "stock_transfer" || mn === "whatsapp_stock_transfer";
    const isPO = mn === "purchase_order" || mn === "whatsapp_purchase_order";
    const isPR = mn === "purchase_request" || mn === "whatsapp_purchase_request";
    const showPrices = !isDelivery || cfg.add_price_details_in_delivery_note;
    const hideVAT = !!m.hideVAT;

    const party = forCustomer ? m.customer : forVendor ? m.vendor : null;
    const partyEn = forVendor ? "Vendor" : "Customer";
    const partyAr = forVendor ? "مورد" : "عميل";

    // ── Font sizes ──────────────────────────────────────────────────────────
    const thSz = props.fontSizes?.[mn + "_tableHead"]?.size || "8.5px";
    const tdSz = props.fontSizes?.[mn + "_tableBody"]?.size || "9px";
    const tfSz = props.fontSizes?.[mn + "_tableFooter"]?.size || "9px";
    const showHeader = props.fontSizes?.[mn + "_storeHeader"]?.visible !== false;

    // ── Page width ──────────────────────────────────────────────────────────
    const PW = props.whatsAppShare ? "750px"
        : window.location.pathname.includes("invoice-print") ? "774px"
            : !!(window.__TAURI__ || window.__TAURI_INTERNALS__) ? "calc(100vw - 20px)"
                : "750px";

    // ── QR placement ────────────────────────────────────────────────────────
    const showQRTopRight = !cfg.zatca_qr_on_left_bottom && !isDelivery && !isTransfer && !isQuotation && !isPO && !isPR && !isNonVAT;
    const showQRBottomLeft = !!cfg.zatca_qr_on_left_bottom && !isDelivery && !isTransfer && !isQuotation && !isPO && !isPR && !isNonVAT;

    // ── Document / date labels ───────────────────────────────────────────────
    const docLabels = isPO ? ["Purchase Order No.", "رقم أمر الشراء"]
        : isPR ? ["Purchase Request No.", "رقم طلب الشراء"]
            : isTransfer ? ["Transfer No.", "رقم التحويل"]
                : isQuotation ? ["Quotation No.", "رقم الاقتباس"]
                    : ["Invoice No.", "رقم الفاتورة"];
    const dateLabels = isPO ? ["Purchase Order Date", "تاريخ أمر الشراء"]
        : isPR ? ["Purchase Request Date", "تاريخ طلب الشراء"]
            : isTransfer ? ["Transfer Date", "تاريخ النقل"]
                : isQuotation ? ["Quotation Date", "تاريخ الاقتباس"]
                    : ["Invoice Date", "تاريخ الفاتورة"];

    // ── Items table column widths ────────────────────────────────────────────
    const cols = !showPrices
        ? ["8%", "20%", "52%", "20%"]
        : hideVAT
            ? ["5%", "12%", "32%", "8%", "14%", "13%", "16%"]
            : ["4%", "10%", "28%", "6%", "11%", "12%", "9%", "9%", "11%"];

    // ── QR helper ───────────────────────────────────────────────────────────
    function QRBlock({ size }) {
        const w = props.fontSizes?.[mn + "_qrCode"]?.["width"]?.size || size || "110px";
        const h = props.fontSizes?.[mn + "_qrCode"]?.["height"]?.size || size || "110px";
        if (m.zatca?.qr_code) return (
            <QRCodeSVG value={m.zatca.qr_code} fgColor="#000" bgColor="#fff" level="H" size={520}
                className="qr-print"
                preserveAspectRatio="xMidYMid meet" shapeRendering="crispEdges"
                style={{ width: w, height: h, display: "block", background: "#fff" }}
            />
        );
        if (m.QRImageData) return <img src={m.QRImageData} alt="QR" style={{ width: w, height: h }} />;
        return null;
    }

    // ── Address builder ─────────────────────────────────────────────────────
    function buildAddress(na) {
        if (!na) return "";
        return [na.building_no, na.street_name, na.district_name, na.unit_no ? `Unit ${na.unit_no}` : "", na.city_name, na.zipcode].filter(Boolean).join(", ");
    }

    // ── Per-product unit price ───────────────────────────────────────────────
    function unitPrice(p) {
        if (hideVAT) return p.unit_price_with_vat;
        if (mn === "purchase" || mn === "whatsapp_purchase" || isPO) return p.purchase_unit_price;
        if (mn === "purchase_return" || mn === "whatsapp_purchase_return") return p.purchasereturn_unit_price;
        return p.unit_price;
    }

    // ───────────────────────────────────────────────────────────────────────
    return (
        <span ref={ref}>
            {m.pages && m.pages.map((page, pageIndex) => (
                <div key={pageIndex}
                    className="container"
                    id="printableArea"
                    style={{
                        fontFamily: selFont || undefined,
                        backgroundColor: C.white,
                        padding: 0,
                        marginTop: page.top + "px",
                        marginLeft: "auto",
                        marginRight: "auto",
                        maxWidth: "none",
                        height: "1118px",
                        width: PW,
                        position: "relative",
                        overflow: "hidden",
                        boxSizing: "border-box",
                    }}
                >
                    {/* Background image (special stores) */}
                    {props.invoiceBackground && showHeader && (
                        <img src={props.invoiceBackground} alt=""
                            style={{
                                position: "absolute", left: "50%", transform: "translateX(-50%)",
                                top: 0, width: "105%", height: "1118px", maxWidth: "105%",
                                objectFit: "cover", objectPosition: "top center",
                                zIndex: 0, pointerEvents: "none",
                            }}
                        />
                    )}

                    <div style={{ position: "relative", zIndex: 1 }}>

                        {/* ══════════════════════════════════════════════════════
                            STORE HEADER
                        ══════════════════════════════════════════════════════ */}
                        {showHeader && !props.invoiceBackground && (
                            <div style={{
                                background: `linear-gradient(135deg, ${C.navy} 0%, ${C.navyMid} 100%)`,
                                padding: "10px 16px 0",
                                margin: "8px 8px 0",
                                borderRadius: "8px",
                                overflow: "hidden",
                            }}>
                                <div style={{
                                    display: "grid",
                                    gridTemplateColumns: "1fr auto 1fr",
                                    alignItems: "center",
                                    gap: "10px",
                                    paddingBottom: "10px",
                                }}>
                                    {/* Left — English */}
                                    <div>
                                        {st?.store_name && (
                                            <div style={{ color: C.white, fontSize: "19px", fontWeight: 800, lineHeight: "1.2" }}>
                                                {st.store_name}
                                            </div>
                                        )}
                                        <div className="clickable-text"
                                            onClick={() => props.selectText("storeName")}
                                            style={{
                                                color: C.white,
                                                fontSize: props.fontSizes?.[mn + "_storeName"]?.size || "15px",
                                                fontWeight: 800,
                                                lineHeight: "1.2",
                                            }}>
                                            {st?.name || ""}
                                        </div>
                                        {st?.title && (
                                            <div className="clickable-text"
                                                onClick={() => props.selectText("storeTitle")}
                                                style={{ color: "#93c5fd", fontSize: props.fontSizes?.[mn + "_storeTitle"]?.size || "9px", marginTop: "3px" }}>
                                                {st.title}
                                            </div>
                                        )}
                                        <div style={{ marginTop: "6px", display: "flex", flexDirection: "column", gap: "3px" }}>
                                            <div className="clickable-text"
                                                onClick={() => props.selectText("storeCR")}
                                                style={{ color: C.mutedLight, fontSize: "8px" }}>
                                                <span style={{ color: "#93c5fd", fontWeight: 700, fontSize: "7.5px", letterSpacing: "0.5px", textTransform: "uppercase" }}>C.R.</span>
                                                {" "}{st?.registration_number || ""}
                                            </div>
                                            <div className="clickable-text"
                                                onClick={() => props.selectText("storeVAT")}
                                                style={{ color: C.mutedLight, fontSize: "8px" }}>
                                                <span style={{ color: "#93c5fd", fontWeight: 700, fontSize: "7.5px", letterSpacing: "0.5px", textTransform: "uppercase" }}>VAT</span>
                                                {" "}{st?.vat_no || ""}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Center — Logo */}
                                    <div style={{ textAlign: "center" }}>
                                        {st?.logo ? (
                                            <img
                                                src={resolveImageUrl(st.logo, st.id, "store") + "?" + Date.now()}
                                                alt="logo"
                                                style={{
                                                    width: "64px", height: "64px", objectFit: "contain",
                                                    borderRadius: "8px", background: "rgba(255,255,255,0.1)", padding: "4px",
                                                }}
                                            />
                                        ) : (
                                            <div style={{
                                                width: "64px", height: "64px", borderRadius: "8px",
                                                background: "rgba(255,255,255,0.08)",
                                                display: "flex", alignItems: "center", justifyContent: "center",
                                            }}>
                                                <span style={{ color: C.gold, fontSize: "22px", fontWeight: 800 }}>
                                                    {st?.name?.charAt(0) || "S"}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Right — Arabic (RTL) */}
                                    <div style={{
                                        direction: "rtl",
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "flex-start",
                                        gap: "2px",
                                    }}>
                                        {st?.store_name_in_arabic && (
                                            <div style={{ color: C.white, fontSize: "19px", fontWeight: 800, lineHeight: "1.2", fontFamily: arFont }}>
                                                {st.store_name_in_arabic}
                                            </div>
                                        )}
                                        <div className="clickable-text"
                                            onClick={() => props.selectText("storeNameArabic")}
                                            style={{
                                                color: C.white,
                                                fontSize: props.fontSizes?.[mn + "_storeNameArabic"]?.size || "15px",
                                                fontWeight: 800,
                                                lineHeight: "1.2",
                                                fontFamily: arFont,
                                            }}>
                                            {st?.name_in_arabic || ""}
                                        </div>
                                        {st?.title_in_arabic && (
                                            <div className="clickable-text"
                                                onClick={() => props.selectText("storeTitleArabic")}
                                                style={{ color: "#93c5fd", fontSize: props.fontSizes?.[mn + "_storeTitleArabic"]?.size || "9px", marginTop: "3px", fontFamily: arFont }}>
                                                {st.title_in_arabic}
                                            </div>
                                        )}
                                        <div style={{ marginTop: "6px", display: "flex", flexDirection: "column", gap: "3px" }}>
                                            {arCR && (
                                                <div className="clickable-text"
                                                    onClick={() => props.selectText("storeCRArabic")}
                                                    style={{ color: C.mutedLight, fontSize: "8px" }}>
                                                    <span style={{ color: "#93c5fd", fontWeight: 700, fontSize: "7.5px" }}>س.ت</span>
                                                    {" "}<span style={{ fontFamily: arFont }}>{arCR}</span>
                                                </div>
                                            )}
                                            {arVAT && (
                                                <div className="clickable-text"
                                                    onClick={() => props.selectText("storeVATArabic")}
                                                    style={{ color: C.mutedLight, fontSize: "8px" }}>
                                                    <span style={{ color: "#93c5fd", fontWeight: 700, fontSize: "7.5px" }}>ض.ق.م</span>
                                                    {" "}<span style={{ fontFamily: arFont }}>{arVAT}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Gold accent line */}
                                <div style={{
                                    height: "2px",
                                    background: `linear-gradient(90deg, transparent 0%, ${C.gold} 20%, ${C.goldBorder} 50%, ${C.gold} 80%, transparent 100%)`,
                                }} />
                            </div>
                        )}

                        {/* ══════════════════════════════════════════════════════
                            INVOICE TITLE
                        ══════════════════════════════════════════════════════ */}
                        <div className="clickable-text"
                            onClick={() => props.selectText("invoiceTitle")}
                            style={{
                                background: showHeader && !props.invoiceBackground ? C.midGray : "transparent",
                                border: `1px solid ${C.border}`,
                                borderRadius: "6px",
                                padding: "5px 16px",
                                margin: !showHeader || props.invoiceBackground
                                    ? `${props.fontSizes?.[mn + "_marginTop"]?.size || "0px"} 8px 0`
                                    : "4px 8px 0",
                                textAlign: "center",
                                position: "relative",
                            }}>
                            <span style={{
                                fontSize: props.fontSizes?.[mn + "_invoiceTitle"]?.size || "13px",
                                fontWeight: 800,
                                color: C.navy,
                                letterSpacing: "1.5px",
                                textTransform: "uppercase",
                            }}>
                                {m.invoiceTitle || "INVOICE"}
                            </span>
                            {m.code && m.store?.zatca?.phase === "2" && m.zatca?.reporting_passed && (
                                <a
                                    href={`/zatca/${m.store_id}/${mn === "sales_return" ? "sales-returns" : "sales"}/xml/${m.code}.xml`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        position: "absolute",
                                        right: "10px",
                                        top: "50%",
                                        transform: "translateY(-50%)",
                                        fontSize: "7.5px",
                                        color: C.accent,
                                        textDecoration: "underline",
                                        cursor: "pointer",
                                    }}
                                >
                                    Zatca Signed XML
                                </a>
                            )}
                        </div>

                        {/* ══════════════════════════════════════════════════════
                            DETAILS SECTION
                        ══════════════════════════════════════════════════════ */}
                        <div style={{ display: "flex", margin: "5px 8px 4px", gap: "6px" }}
                            className="clickable-text"
                            onClick={() => props.selectText("invoiceDetails")}>

                            {/* ── Details card ────────────────────────────── */}
                            <div style={{
                                flex: 1,
                                border: `1px solid ${C.border}`,
                                borderRadius: "6px",
                                overflow: "hidden",
                                fontSize: props.fontSizes?.[mn + "_invoiceDetails"]?.size || "8.5px",
                            }}>
                                {/* Invoice / doc number */}
                                <DRow label={docLabels[0]} labelAr={docLabels[1]} value={m.code || ""} arFont={arFont} />
                                {/* Date */}
                                <DRow label={dateLabels[0]} labelAr={dateLabels[1]}
                                    value={m.date ? format(new Date(m.date), "dd MMM yyyy, h:mm a") : ""}
                                    arFont={arFont}
                                />
                                {/* Returns: original invoice */}
                                {m.order_code && (mn === "sales_return" || mn === "whatsapp_sales_return") && (
                                    <DRow label="Original Invoice No." labelAr="رقم الفاتورة الأصلية"
                                        value={m.order_code} arFont={arFont} />
                                )}
                                {m.quotation_code && (mn === "quotation_sales_return" || mn === "whatsapp_quotation_sales_return") && (
                                    <DRow label="Original Invoice No." labelAr="رقم الفاتورة الأصلية"
                                        value={m.quotation_code} arFont={arFont} />
                                )}
                                {m.purchase_code && (mn === "purchase_return" || mn === "whatsapp_purchase_return") && (
                                    <DRow label="Original Invoice No." labelAr="رقم الفاتورة الأصلية"
                                        value={m.purchase_code} arFont={arFont} />
                                )}
                                {/* Customer PO */}
                                {cfg.enable_customer_po_no && m.customer_po_no && (
                                    <DRow label="Customer P.O No." labelAr="رقم أمر الشراء"
                                        value={m.customer_po_no} arFont={arFont} />
                                )}
                                {/* Vehicle */}
                                {cfg.enable_automobile_module && m.vehicle_snapshot && (
                                    <DRow label="Vehicle" labelAr="المركبة"
                                        value={[m.vehicle_snapshot.brand, m.vehicle_snapshot.model, m.vehicle_snapshot.variant].filter(Boolean).join(" ")
                                            + (m.vehicle_snapshot.vehicle_number ? ` | Plate: ${m.vehicle_snapshot.vehicle_number}` : "")
                                            + (m.vehicle_snapshot.year ? ` | ${m.vehicle_snapshot.year}` : "")}
                                        arFont={arFont} noBorder
                                    />
                                )}

                                {/* Party info — in same card when no QR top-right */}
                                {(forCustomer || forVendor) && !showQRTopRight && <>
                                    <div style={{ background: C.navy, padding: "2px 6px" }}>
                                        <span style={{ color: C.gold, fontSize: "7.5px", fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase" }}>
                                            {partyEn} Details
                                        </span>
                                        <span style={{ color: C.mutedLight, fontSize: "7.5px", marginRight: "6px", fontFamily: arFont, float: "right" }}>
                                            بيانات {partyAr}
                                        </span>
                                    </div>
                                    <DRow label={`${partyEn} Name`} labelAr={`اسم ${partyAr}`}
                                        value={<>
                                            {party ? party.name : (m.customerName || m.vendorName || "N/A")}
                                            {party?.name_in_arabic ? ` | ${party.name_in_arabic}` : ""}
                                        </>}
                                        arFont={arFont}
                                    />
                                    {party?.code && (
                                        <DRow label={`${partyEn} ID`} labelAr="معرف" value={party.code} arFont={arFont} />
                                    )}
                                    {(party?.vat_no || (!party && m.vat_no)) && (
                                        <DRow label="VAT No." labelAr="رقم ضريبة القيمة المضافة"
                                            value={party?.vat_no || m.vat_no || ""} arFont={arFont} />
                                    )}
                                    {party?.registration_number && (
                                        <DRow label="C.R. No." labelAr="السجل التجاري"
                                            value={party.registration_number} arFont={arFont} />
                                    )}
                                    {(party?.address || party?.national_address?.building_no) && (
                                        <DRow label="Address" labelAr="عنوان"
                                            value={party?.national_address?.building_no
                                                ? buildAddress(party.national_address)
                                                : (party?.address || "")}
                                            arFont={arFont} noBorder
                                        />
                                    )}
                                </>}
                            </div>

                            {/* ── QR (top-right placement) ─────────────────── */}
                            {showQRTopRight && (
                                <div style={{
                                    flexShrink: 0,
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    padding: "8px",
                                    border: `1px solid ${C.border}`,
                                    borderRadius: "6px",
                                    background: C.white,
                                    minWidth: "130px",
                                }} onClick={(e) => { e.stopPropagation(); props.selectQRCode(); }}>
                                    <QRBlock size="110px" />
                                </div>
                            )}
                        </div>

                        {/* Party info row below QR (when QR is top-right) */}
                        {showQRTopRight && (forCustomer || forVendor) && (
                            <div style={{
                                margin: "0 8px 4px",
                                border: `1px solid ${C.border}`,
                                borderRadius: "6px",
                                overflow: "hidden",
                                fontSize: props.fontSizes?.[mn + "_invoiceDetails"]?.size || "8.5px",
                            }} className="clickable-text" onClick={() => props.selectText("invoiceDetails")}>
                                <div style={{ background: C.navy, padding: "2px 6px" }}>
                                    <span style={{ color: C.gold, fontSize: "7.5px", fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase" }}>
                                        {partyEn} Details
                                    </span>
                                    <span style={{ color: C.mutedLight, fontSize: "7.5px", marginRight: "6px", fontFamily: arFont, float: "right" }}>
                                        بيانات {partyAr}
                                    </span>
                                </div>
                                <div style={{ display: "flex" }}>
                                    <div style={{ flex: 1, borderRight: `1px solid ${C.border}` }}>
                                        <DRow label={`${partyEn} Name`} labelAr={`اسم ${partyAr}`}
                                            value={<>
                                                {party ? party.name : (m.customerName || m.vendorName || "N/A")}
                                                {party?.name_in_arabic ? ` | ${party.name_in_arabic}` : ""}
                                            </>}
                                            arFont={arFont}
                                        />
                                        {(party?.vat_no || (!party && m.vat_no)) && (
                                            <DRow label="VAT No." labelAr="رقم ضريبة القيمة المضافة"
                                                value={party?.vat_no || m.vat_no || ""} arFont={arFont} noBorder />
                                        )}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        {party?.code && (
                                            <DRow label={`${partyEn} ID`} labelAr="معرف" value={party.code} arFont={arFont} />
                                        )}
                                        {party?.registration_number && (
                                            <DRow label="C.R. No." labelAr="السجل التجاري"
                                                value={party.registration_number} arFont={arFont} />
                                        )}
                                        {(party?.address || party?.national_address?.building_no) && (
                                            <DRow label="Address" labelAr="عنوان"
                                                value={party?.national_address?.building_no
                                                    ? buildAddress(party.national_address)
                                                    : (party?.address || "")}
                                                arFont={arFont} noBorder
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── Page count ──────────────────────────────────── */}
                        {m.total_pages > 1 && (
                            <div className="clickable-text"
                                onClick={() => props.selectText("invoicePageCount")}
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    padding: "1px 10px",
                                    fontSize: props.fontSizes?.[mn + "_invoicePageCount"]?.size || "7.5px",
                                    color: C.muted,
                                }}>
                                <span>Page {pageIndex + 1} of {m.total_pages}</span>
                                <span style={{ fontFamily: arFont }}>
                                    {toArabicNumerals(String(pageIndex + 1))} الصفحة من {toArabicNumerals(String(m.total_pages))}
                                </span>
                            </div>
                        )}

                        {/* ══════════════════════════════════════════════════════
                            ITEMS TABLE
                        ══════════════════════════════════════════════════════ */}
                        <div style={{ margin: "0 8px" }}>
                            <table style={{
                                width: "100%",
                                borderCollapse: "collapse",
                                tableLayout: "fixed",
                                border: `1px solid ${C.border}`,
                                overflow: "hidden",
                            }}>
                                <colgroup>
                                    {cols.map((w, i) => <col key={i} style={{ width: w }} />)}
                                </colgroup>
                                <thead>
                                    <tr className="clickable-text"
                                        onClick={(e) => { e.stopPropagation(); props.selectText("tableHead"); }}
                                        style={{ fontSize: thSz, textAlign: "center" }}>
                                        <th style={{ padding: "4px 3px", background: C.navy, color: C.white, borderRight: "1px solid rgba(255,255,255,0.12)", fontWeight: 700 }}>
                                            <div>رقم</div><div>Sn.</div>
                                        </th>
                                        <th style={{ padding: "4px 3px", background: C.navy, color: C.white, borderRight: "1px solid rgba(255,255,255,0.12)", fontWeight: 700 }}>
                                            <div>رقم القطعة</div><div>Part No.</div>
                                        </th>
                                        <th style={{ padding: "4px 3px", background: C.navy, color: C.white, borderRight: "1px solid rgba(255,255,255,0.12)", fontWeight: 700 }}>
                                            <div>وصف</div><div>Description</div>
                                        </th>
                                        <th style={{ padding: "4px 3px", background: C.navy, color: C.white, borderRight: showPrices ? "1px solid rgba(255,255,255,0.12)" : "none", fontWeight: 700 }}>
                                            <div>كمية</div><div>Qty</div>
                                        </th>
                                        {showPrices && <>
                                            <th style={{ padding: "4px 3px", background: C.navy, color: C.white, borderRight: "1px solid rgba(255,255,255,0.12)", fontWeight: 700 }}>
                                                <div>سعر الوحدة</div><div>Unit Price</div>
                                            </th>
                                            {!hideVAT && <>
                                                <th style={{ padding: "4px 3px", background: C.navy, color: C.white, borderRight: "1px solid rgba(255,255,255,0.12)", fontWeight: 700 }}>
                                                    <div>السعر بدون ضريبة</div><div>W/o VAT</div>
                                                </th>
                                                <th style={{ padding: "4px 3px", background: C.navy, color: C.white, borderRight: "1px solid rgba(255,255,255,0.12)", fontWeight: 700 }}>
                                                    <div>ضريبة {trimTo2Decimals(m.vat_percent)}%</div><div>VAT</div>
                                                </th>
                                            </>}
                                            <th style={{ padding: "4px 3px", background: C.navy, color: C.white, borderRight: "1px solid rgba(255,255,255,0.12)", fontWeight: 700 }}>
                                                <div>خصم شامل ض</div><div>Disc W/ VAT</div>
                                            </th>
                                            <th style={{ padding: "4px 3px", background: C.navy, color: C.white, fontWeight: 700 }}>
                                                {!hideVAT
                                                    ? <><div>السعر مع الضريبة</div><div>Line Total</div></>
                                                    : <><div>السعر</div><div>Price</div></>}
                                            </th>
                                        </>}
                                    </tr>
                                </thead>
                                <tbody style={{ fontSize: tdSz }}
                                    className="clickable-text"
                                    onClick={() => props.selectText("tableBody")}>
                                    {page.products && page.products.map((product, idx) => {
                                        const up = unitPrice(product) || 0;
                                        const disc = hideVAT ? (product.unit_discount_with_vat || 0) : (product.unit_discount || 0);
                                        const taxable = (up - disc) * (product.quantity || 0);
                                        const vatAmt = taxable * ((m.vat_percent || 0) / 100);
                                        const total = taxable + vatAmt;
                                        const isAlt = idx % 2 !== 0;
                                        return (
                                            <tr key={product.item_code || idx}
                                                style={{
                                                    background: isAlt ? C.rowAlt : C.white,
                                                    borderBottom: `1px solid ${C.borderLight}`,
                                                    textAlign: "center",
                                                }}>
                                                <td style={{ padding: "4px 3px", borderRight: `1px solid ${C.borderLight}`, color: C.mutedLight, fontSize: "8px" }}>
                                                    {product.part_number ? idx + 1 + pageIndex * (m.pageSize || 0) : ""}
                                                </td>
                                                <td style={{ padding: "4px 3px", borderRight: `1px solid ${C.borderLight}`, color: C.textMid }}>
                                                    {product.prefix_part_number ? `${product.prefix_part_number} - ` : ""}
                                                    {product.part_number || ""}
                                                </td>
                                                <td style={{
                                                    padding: "4px 5px",
                                                    borderRight: `1px solid ${C.borderLight}`,
                                                    textAlign: "left",
                                                    whiteSpace: "normal",
                                                    wordBreak: "break-word",
                                                }}>
                                                    {!cfg.one_line_product_name_in_invoice ? (
                                                        <span dir="ltr" style={{ unicodeBidi: "isolate" }}>
                                                            <span style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{product.name}</span>
                                                            {product.name_in_arabic && <>
                                                                <span style={{ color: C.mutedLight }}> | </span>
                                                                <span dir="rtl" style={{ unicodeBidi: "isolate" }}>{product.name_in_arabic}</span>
                                                            </>}
                                                        </span>
                                                    ) : (
                                                        <span dir="ltr" style={{ unicodeBidi: "isolate" }}>
                                                            <span style={{
                                                                display: "inline-block",
                                                                maxWidth: product.name_in_arabic ? "110px" : "220px",
                                                                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                                                                verticalAlign: "bottom",
                                                            }}>{product.name}</span>
                                                            {product.name_in_arabic && <>
                                                                <span style={{ color: C.mutedLight }}> | </span>
                                                                <span dir="rtl" style={{
                                                                    display: "inline-block", maxWidth: "110px",
                                                                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                                                                    verticalAlign: "bottom", unicodeBidi: "isolate",
                                                                }}>{product.name_in_arabic}</span>
                                                            </>}
                                                        </span>
                                                    )}
                                                </td>
                                                <td style={{ padding: "4px 3px", borderRight: showPrices ? `1px solid ${C.borderLight}` : "none" }}>
                                                    {product.quantity || ""}{!product.is_service && product.unit ? ` ${product.unit}` : ""}
                                                </td>
                                                {showPrices && <>
                                                    <td style={{ padding: "4px 3px", borderRight: `1px solid ${C.borderLight}`, textAlign: "right" }}>
                                                        {up ? <Amount amount={trimTo2Decimals(up)} /> : ""}
                                                    </td>
                                                    {!hideVAT && <>
                                                        <td style={{ padding: "4px 3px", borderRight: `1px solid ${C.borderLight}`, textAlign: "right" }}>
                                                            {up ? <Amount amount={trimTo2Decimals(taxable)} /> : ""}
                                                        </td>
                                                        <td style={{ padding: "4px 3px", borderRight: `1px solid ${C.borderLight}`, textAlign: "right" }}>
                                                            {up ? <Amount amount={trimTo2Decimals(vatAmt)} /> : ""}
                                                        </td>
                                                    </>}
                                                    <td style={{ padding: "4px 3px", borderRight: `1px solid ${C.borderLight}`, textAlign: "right" }}>
                                                        {(product.unit_discount_with_vat || 0) > 0
                                                            ? trimTo2Decimals((product.unit_discount_with_vat || 0) * (product.quantity || 0))
                                                            : ""}
                                                    </td>
                                                    <td style={{ padding: "4px 3px", textAlign: "right" }}>
                                                        {!hideVAT && (up ? <Amount amount={trimTo2Decimals(total)} /> : "")}
                                                        {hideVAT && (product.unit_price_with_vat
                                                            ? <Amount amount={trimTo2Decimals((product.unit_price_with_vat - (product.unit_discount_with_vat || 0)) * (product.quantity || 0))} />
                                                            : "")}
                                                    </td>
                                                </>}
                                            </tr>
                                        );
                                    })}
                                    {/* Stock transfer: total quantity row */}
                                    {isTransfer && isLP(pageIndex) && (
                                        <tr style={{ background: C.lightGray, fontWeight: 700 }}>
                                            <td></td><td></td>
                                            <td style={{ textAlign: "right", padding: "4px 5px", color: C.textDark }}>
                                                Total Quantity | إجمالي الكمية
                                            </td>
                                            <td style={{ textAlign: "center", padding: "4px", color: C.navy }}>
                                                {m.total_quantity}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* ══════════════════════════════════════════════════════
                            LAST PAGE — TOTALS + AMOUNT IN WORDS + SIGNATURE
                        ══════════════════════════════════════════════════════ */}
                        {isLP(pageIndex) && !isDelivery && (
                            <div style={{ margin: "4px 8px 0", fontSize: tfSz }}
                                className="clickable-text"
                                onClick={() => props.selectText("tableFooter")}>

                                {/* ── Totals box (flex divs — NOT table) ──── */}
                                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "4px", gap: "6px" }}>
                                    {/* QR bottom-left */}
                                    {showQRBottomLeft && (
                                        <div style={{
                                            flex: 1,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "flex-start",
                                            padding: "6px",
                                            border: `1px solid ${C.border}`,
                                            borderRadius: "6px",
                                        }} onClick={(e) => { e.stopPropagation(); props.selectQRCode(); }}>
                                            <QRBlock size="100px" />
                                        </div>
                                    )}
                                    {/* Totals */}
                                    <div style={{
                                        width: showQRBottomLeft ? "46%" : "38%",
                                        border: `1px solid ${C.border}`,
                                        borderRadius: "6px",
                                        overflow: "hidden",
                                    }}>
                                        {/* Subtotal */}
                                        <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 8px", borderBottom: `1px solid ${C.borderLight}`, background: C.lightGray }}>
                                            <span style={{ color: C.textMid }}>
                                                {!hideVAT ? "Total (w/o VAT)" : "Total المجموع"}
                                            </span>
                                            <span style={{ fontWeight: 600, color: C.textDark }}>
                                                <Amount amount={trimTo2Decimals(
                                                    hideVAT
                                                        ? m.pages.flatMap(p => p.products || []).reduce((s, p) => s + ((parseFloat(p.unit_price_with_vat) || 0) - (parseFloat(p.unit_discount_with_vat) || 0)) * (parseFloat(p.quantity) || 0), 0)
                                                        : m.total
                                                )} />
                                            </span>
                                        </div>
                                        {/* Shipping */}
                                        {!isTransfer && (
                                            <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 8px", borderBottom: `1px solid ${C.borderLight}` }}>
                                                <span style={{ color: C.textMid }}>Shipping / Handling رسوم الشحن</span>
                                                <span><Amount amount={trimTo2Decimals(m.shipping_handling_fees)} /></span>
                                            </div>
                                        )}
                                        {/* Discount */}
                                        {!isTransfer && (
                                            <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 8px", borderBottom: `1px solid ${C.borderLight}` }}>
                                                <span style={{ color: C.textMid }}>{"Sales Discount خصم المبيعات"}</span>
                                                <span><Amount amount={trimTo2Decimals(m.discount)} /></span>
                                            </div>
                                        )}
                                        {/* Taxable */}
                                        {!hideVAT && (
                                            <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 8px", borderBottom: `1px solid ${C.borderLight}` }}>
                                                <span style={{ color: C.textMid }}>Taxable Amount (w/o VAT)</span>
                                                <span><Amount amount={trimTo2Decimals((m.net_total - m.rounding_amount) - m.vat_price)} /></span>
                                            </div>
                                        )}
                                        {/* VAT */}
                                        {!hideVAT && (
                                            <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 8px", borderBottom: `1px solid ${C.borderLight}` }}>
                                                <span style={{ color: C.textMid }}>VAT ({trimTo2Decimals(m.vat_percent)}%) ضريبة القيمة المضافة</span>
                                                <span><Amount amount={trimTo2Decimals(m.vat_price)} /></span>
                                            </div>
                                        )}
                                        {/* Rounding */}
                                        <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 8px", borderBottom: `1px solid ${C.border}` }}>
                                            <span style={{ color: C.textMid }}>Rounding مبلغ التقريب</span>
                                            <span>{m.rounding_amount ? <Amount amount={trimTo2Decimals(m.rounding_amount)} /> : "0.00"}</span>
                                        </div>
                                        {/* Net total */}
                                        <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 8px", background: C.navy }}>
                                            <span style={{ color: C.white, fontWeight: 700 }}>
                                                {!hideVAT ? "Net Total (with VAT)" : "Net Total صافي المجموع"}
                                            </span>
                                            <span style={{ color: C.gold, fontWeight: 800 }}>
                                                <span style={{ color: C.gold }} className={cfg.show_currency_symbol ? "icon-saudi_riyal print-table-value" : "print-table-value"}>
                                                    <Amount amount={trimTo2Decimals(m.net_total)} />
                                                </span>
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* ── Amount in Words — flex div, NOT table cell ── */}
                                <div style={{
                                    display: "flex",
                                    border: `1px solid ${C.border}`,
                                    borderRadius: "5px",
                                    overflow: "hidden",
                                    marginBottom: "4px",
                                }}>
                                    <div style={{
                                        width: "15%",
                                        padding: "5px 8px",
                                        background: C.lightGray,
                                        borderRight: `1px solid ${C.border}`,
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        textAlign: "center",
                                    }}>
                                        <div style={{ fontWeight: 800, color: C.navy, fontSize: "8px", textTransform: "uppercase", letterSpacing: "0.3px" }}>
                                            In Words
                                        </div>
                                        <div style={{ fontFamily: arFont, color: C.muted, fontSize: "8px", marginTop: "2px" }}>
                                            بكلمات
                                        </div>
                                    </div>
                                    <div style={{ flex: 1, padding: "5px 10px" }}>
                                        {/* Arabic amount — plain div (NOT td) so html2canvas renders Arabic correctly */}
                                        <div style={{ fontFamily: arFont, direction: "rtl", textAlign: "right", lineHeight: "1.6", color: C.textDark }}>
                                            {n2words(m.net_total, { lang: 'ar' })} ريال سعودي
                                        </div>
                                        <div style={{ lineHeight: "1.6", color: C.textMid, fontSize: "8.5px" }}>
                                            {capitalizeFirst(n2words(m.net_total, { lang: 'en' }))} Saudi Riyals
                                        </div>
                                    </div>
                                </div>

                                {/* ── Remarks ───────────────────────────────── */}
                                {m.remarks && (
                                    <div style={{
                                        display: "flex",
                                        border: `1px solid ${C.border}`,
                                        borderRadius: "5px",
                                        overflow: "hidden",
                                        marginBottom: "4px",
                                    }}>
                                        <div style={{
                                            width: "15%",
                                            padding: "5px 8px",
                                            background: C.lightGray,
                                            borderRight: `1px solid ${C.border}`,
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            textAlign: "center",
                                            fontWeight: 700,
                                            color: C.navy,
                                            fontSize: "8px",
                                        }}>
                                            <div>Remarks</div>
                                            <div style={{ fontFamily: arFont, fontWeight: 400, color: C.muted }}>ملاحظات</div>
                                        </div>
                                        <div style={{ flex: 1, padding: "5px 10px", color: C.textDark }}>
                                            {m.remarks}
                                        </div>
                                    </div>
                                )}

                                {/* ── Quotation extras ──────────────────────── */}
                                {isQuotation && (
                                    <>
                                        <div style={{
                                            display: "flex",
                                            border: `1px solid ${C.border}`,
                                            borderRadius: "5px",
                                            overflow: "hidden",
                                            marginBottom: "4px",
                                        }}>
                                            <div style={{ flex: 1, display: "flex", padding: "4px 8px", borderRight: `1px solid ${C.border}`, gap: "6px", alignItems: "center" }}>
                                                <span style={{ fontWeight: 600, color: C.navy, fontSize: "8px" }}>Validity صحة:</span>
                                                <span style={{ color: C.red, fontSize: "8px" }}>{m.validity_days} days أيام</span>
                                            </div>
                                            <div style={{ flex: 2, display: "flex", padding: "4px 8px", gap: "6px", alignItems: "center" }}>
                                                <span style={{ fontWeight: 600, color: C.navy, fontSize: "8px" }}>Delivery توصيل:</span>
                                                <span style={{ fontSize: "7.5px", color: C.textMid }}>
                                                    Within {m.delivery_days} days from payment | خلال {m.delivery_days} أيام من تاريخ الدفع
                                                </span>
                                            </div>
                                        </div>
                                        {m.store?.bank_account?.bank_name && (
                                            <div style={{ border: `1px solid ${C.border}`, borderRadius: "5px", overflow: "hidden", marginBottom: "4px" }}>
                                                <div style={{ background: C.navy, padding: "3px 8px", textAlign: "center" }}>
                                                    <span style={{ color: C.gold, fontSize: "7.5px", fontWeight: 700 }}>Bank Account Details</span>
                                                    <span style={{ color: C.mutedLight, fontSize: "7.5px", marginRight: "8px", fontFamily: arFont }}> تفاصيل الحساب البنكي</span>
                                                </div>
                                                <div style={{ display: "flex" }}>
                                                    {[
                                                        ["Bank Name", "اسم البنك", m.store.bank_account.bank_name],
                                                        ["Customer No.", "رقم العميل", m.store.bank_account.customer_no],
                                                        ["IBAN", "رقم الحساب الدولي", m.store.bank_account.iban],
                                                        ["Account Name", "إسم الحساب", m.store.bank_account.account_name],
                                                        ["Account No.", "رقم حساب", m.store.bank_account.account_no],
                                                    ].map(([en, ar, val], i, arr) => (
                                                        <div key={i} style={{
                                                            flex: 1, padding: "4px 6px",
                                                            borderRight: i < arr.length - 1 ? `1px solid ${C.borderLight}` : "none",
                                                        }}>
                                                            <div style={{ color: C.muted, fontSize: "7px" }}>{en}</div>
                                                            <div style={{ fontFamily: arFont, color: C.muted, fontSize: "7px" }}>{ar}</div>
                                                            <div style={{ fontWeight: 600, color: C.textDark, fontSize: "8px", marginTop: "2px" }}>{val || ""}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}

                        {/* Delivery note remarks */}
                        {isLP(pageIndex) && isDelivery && m.remarks && (
                            <div style={{
                                display: "flex",
                                border: `1px solid ${C.border}`,
                                borderRadius: "5px",
                                overflow: "hidden",
                                margin: "4px 8px",
                                fontSize: tfSz,
                            }}>
                                <div style={{
                                    width: "20%", padding: "5px 8px",
                                    background: C.lightGray, borderRight: `1px solid ${C.border}`,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    fontWeight: 700, color: C.navy, fontSize: "8px",
                                }}>
                                    Remarks ملاحظات
                                </div>
                                <div style={{ flex: 1, padding: "5px 10px", color: C.textDark }}>{m.remarks}</div>
                            </div>
                        )}

                        {/* Received By */}
                        {isLP(pageIndex) && cfg.show_received_by_footer_in_invoice && (
                            <div style={{
                                display: "flex", margin: "4px 8px",
                                border: `1px solid ${C.border}`, borderRadius: "5px", overflow: "hidden",
                                fontSize: tfSz,
                            }}>
                                <div style={{ flex: 1, padding: "4px 8px", borderRight: `1px solid ${C.border}` }}>
                                    <span style={{ fontWeight: 600, color: C.navy, fontSize: "8px" }}>Delivered By سلمت بواسطة: </span>
                                    {m.delivered_by_user?.name || ""}
                                </div>
                                <div style={{ flex: 1, padding: "4px 8px" }}>
                                    <span style={{ fontWeight: 600, color: C.navy, fontSize: "8px" }}>Received By استلمت من قبل: </span>
                                </div>
                            </div>
                        )}

                        {/* ══════════════════════════════════════════════════════
                            SIGNATURE (last page)
                        ══════════════════════════════════════════════════════ */}
                        {isLP(pageIndex) && (
                            <div style={{
                                margin: "4px 8px 0",
                                border: `1px solid ${C.border}`,
                                borderRadius: "6px",
                                overflow: "hidden",
                                fontSize: props.fontSizes?.[mn + "_signature"]?.size || "8.5px",
                            }} className="clickable-text" onClick={() => props.selectText("signature")}>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                                    <div style={{ padding: "8px 14px 10px", borderRight: `1px solid ${C.border}`, minHeight: "52px" }}>
                                        <div style={{
                                            fontWeight: 700, color: C.navy, fontSize: "7.5px",
                                            textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "5px",
                                        }}>
                                            Authorised Signature &nbsp;·&nbsp;{" "}
                                            <span style={{ fontFamily: arFont, letterSpacing: "normal" }}>إمضاء</span>
                                        </div>
                                        <div style={{ height: "26px" }} />
                                        <div style={{ borderTop: `1px solid ${C.navy}`, width: "55%", marginTop: "2px" }} />
                                    </div>
                                    <div style={{ padding: "8px 14px" }}>
                                        <div style={{
                                            fontWeight: 700, color: C.navy, fontSize: "7.5px",
                                            textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "5px",
                                        }}>
                                            Date &nbsp;·&nbsp;{" "}
                                            <span style={{ fontFamily: arFont, letterSpacing: "normal" }}>تاريخ</span>
                                        </div>
                                        <div style={{ fontSize: "10px", fontWeight: 700, color: C.textDark }}>
                                            {m.date ? format(new Date(m.date), "dd MMM yyyy") : format(new Date(), "dd MMM yyyy")}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ══════════════════════════════════════════════════════
                            FOOTER
                        ══════════════════════════════════════════════════════ */}
                        <div className="clickable-text"
                            onClick={() => props.selectText("footer")}
                            style={{
                                margin: "6px 8px 8px",
                                borderRadius: "6px",
                                overflow: "hidden",
                                background: `linear-gradient(135deg, ${C.navy} 0%, ${C.navyMid} 100%)`,
                                fontSize: props.fontSizes?.[mn + "_footer"]?.size || "7.5px",
                            }}>
                            {/* Gold top accent line */}
                            <div style={{
                                height: "2px",
                                background: `linear-gradient(90deg, transparent 0%, ${C.gold} 20%, ${C.goldBorder} 50%, ${C.gold} 80%, transparent 100%)`,
                            }} />
                            <div style={{
                                padding: "6px 14px",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                gap: "8px",
                                flexWrap: "wrap",
                            }}>
                                {/* Address block */}
                                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                    {st?.address && (
                                        <div style={{ color: C.mutedLight }}>{st.address}</div>
                                    )}
                                    {st?.address_in_arabic && (
                                        <div style={{ fontFamily: arFont, color: C.mutedLight, direction: "rtl" }}>{st.address_in_arabic}</div>
                                    )}
                                </div>
                                {/* Contact block */}
                                <div style={{ display: "flex", flexDirection: "column", gap: "2px", alignItems: "flex-end" }}>
                                    {(st?.phone || st?.phone_in_arabic) && (
                                        <div style={{ color: C.mutedLight }}>
                                            {st?.phone && <span>📞 {st.phone}</span>}
                                            {st?.phone_in_arabic && (
                                                <span style={{ fontFamily: arFont, marginRight: "8px" }}> | {st.phone_in_arabic}</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>{/* /zIndex wrapper */}
                </div>
            ))}
        </span>
    );
});

export default PreviewContentType2;
