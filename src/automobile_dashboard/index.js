import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { Spinner } from "react-bootstrap";
import { useTranslation } from 'react-i18next';
import { Chart } from "react-google-charts";
import { tooltipHtml, onChartSelect } from '../business_dashboard/charts/chartTooltipSetup';
import { generateInfoPdf, safeName } from '../utils/pdfGenerator';
import { uploadPdfForShare } from '../utils/pdfShare';
import PostingIndex from '../posting/index.js';

function fmt(n) {
    if (n === undefined || n === null || isNaN(Number(n))) return "0.00";
    return Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtCompact(n) {
    if (n === undefined || n === null || isNaN(Number(n))) return "0.00";
    const abs = Math.abs(n);
    const sign = n < 0 ? "-" : "";
    if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}B`;
    if (abs >= 1_000_000)     return `${sign}${(abs / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
    if (abs >= 1_000)         return `${sign}${(abs / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
    return `${sign}${abs.toFixed(2)}`;
}

function fmtMonth(key) {
    if (!key) return '';
    const [y, m] = key.split('-');
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${MONTHS[parseInt(m, 10) - 1]} ${y}`;
}

function calcVat(val, vatPct) {
    const v = val || 0;
    const vat = v * vatPct / (100 + vatPct);
    return { withVAT: v, vat, withoutVAT: v - vat };
}

// ── SVG → PNG ──────────────────────────────────────────────────────────────────
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

function dataUrlToBlob(dataUrl) {
    const [header, b64] = dataUrl.split(",");
    const mime = header.match(/:(.*?);/)[1];
    const bytes = atob(b64);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    return new Blob([arr], { type: mime });
}

async function uploadChartAndGetShareUrl(blob, filename) {
    const res = await fetch(`/v1/chart-image-share?filename=${encodeURIComponent(filename)}`, {
        method: "POST",
        headers: { "Content-Type": "image/png", Authorization: localStorage.getItem("access_token") },
        body: blob,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.status) throw new Error(json.errors?.upload || "Upload failed");
    return json.result.url;
}

function WhatsAppFallbackModal({ dataUrl, title, onClose }) {
    const filename = (title || "chart").replace(/[^a-z0-9]+/gi, "_").toLowerCase() + ".png";
    function handleDownload() {
        const a = document.createElement("a");
        a.href = dataUrl; a.download = filename;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
    }
    return (
        <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
            style={{ position:"fixed", inset:0, zIndex:9999, background:"rgba(0,0,0,0.65)",
                display:"flex", alignItems:"center", justifyContent:"center", padding:"16px" }}>
            <div style={{ background:"#fff", borderRadius:"12px", padding:"20px",
                maxWidth:"480px", width:"100%", boxShadow:"0 8px 32px rgba(0,0,0,0.3)" }}>
                <div className="d-flex align-items-center justify-content-between mb-3">
                    <span className="fw-bold" style={{ fontSize:"0.95rem" }}>
                        <i className="bi bi-whatsapp text-success me-2" />Share via WhatsApp
                    </span>
                    <button className="btn-close" onClick={onClose} />
                </div>
                <div className="alert alert-warning small py-2 mb-3">
                    <i className="bi bi-exclamation-triangle-fill me-2" />
                    Could not upload. Download the image and share manually.
                </div>
                <img src={dataUrl} alt={title}
                    style={{ width:"100%", borderRadius:"8px", border:"1px solid #dee2e6", marginBottom:"16px" }} />
                <button className="btn btn-outline-secondary w-100" onClick={handleDownload}>
                    <i className="bi bi-download me-2" />Download image
                </button>
            </div>
        </div>
    );
}

const BG = '#212529';
const BORDER = '#495057';

// ── KPI Info Tooltip (ⓘ icon popup with Print/PDF/Share) ──────────────────────
function InfoTooltip({ lines, cardTitle, store, filters }) {
    const [show, setShow] = useState(false);
    const [isBusy, setIsBusy] = useState(false);
    const [error, setError] = useState("");
    const triggerRef = useRef(null);
    const tooltipRef = useRef(null);
    const timerRef = useRef(null);

    const clearTimer = useCallback(() => { if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; } }, []);
    const startTimer = useCallback(() => { clearTimer(); timerRef.current = setTimeout(() => setShow(false), 5000); }, [clearTimer]);

    useEffect(() => { if (show) startTimer(); else clearTimer(); return clearTimer; }, [show, startTimer, clearTimer]);

    useEffect(() => {
        if (!show) return;
        const handle = (e) => {
            if (triggerRef.current?.contains(e.target)) return;
            if (tooltipRef.current?.contains(e.target)) return;
            setShow(false);
        };
        document.addEventListener('mousedown', handle);
        return () => document.removeEventListener('mousedown', handle);
    }, [show]);

    async function handlePrint(e) {
        e.stopPropagation();
        try {
            const doc = generateInfoPdf('', cardTitle || 'KPI', null, lines, filters || {}, store || {});
            doc.autoPrint(); doc.output('dataurlnewwindow');
        } catch(err) { setError(err?.message || 'Print failed'); }
    }

    async function handlePDF(e) {
        e.stopPropagation(); setIsBusy(true); setError("");
        try {
            const doc = generateInfoPdf('', cardTitle || 'KPI', null, lines, filters || {}, store || {});
            doc.save(`${safeName(cardTitle || 'KPI')}.pdf`);
        } catch(err) { setError(err?.message || 'PDF failed'); }
        finally { setIsBusy(false); }
    }

    async function handleShare(e) {
        e.stopPropagation(); setIsBusy(true); setError("");
        try {
            const doc = generateInfoPdf('', cardTitle || 'KPI', null, lines, filters || {}, store || {});
            const url = await uploadPdfForShare(doc.output('blob'), `${safeName(cardTitle || 'KPI')}.pdf`);
            window.open(`https://wa.me?text=${encodeURIComponent(`${cardTitle}\n${url}`)}`, '_blank');
        } catch(err) { setError(err?.message || 'Share failed'); }
        finally { setIsBusy(false); }
    }

    const BTN = { background:'none', border:'1px solid rgba(255,255,255,0.25)', color:'#adb5bd', borderRadius:'4px', cursor:'pointer', fontSize:'0.7rem', padding:'2px 9px' };
    const BTN_GRN = { ...BTN, border:'1px solid #28a745', color:'#28a745' };

    return (
        <span style={{ position:"relative", display:"inline-flex", alignItems:"center", marginLeft:"5px", verticalAlign:"middle" }}>
            <i ref={triggerRef} className="bi bi-info-circle-fill"
                style={{ fontSize:"0.75rem", color:"#adb5bd", cursor:"pointer" }}
                onClick={e => { e.stopPropagation(); setShow(p => !p); }} />
            {show && (
                <div ref={tooltipRef}
                    style={{ position:"absolute", top:"130%", left:"50%", transform:"translateX(-50%)",
                        backgroundColor:BG, color:"#f8f9fa", borderRadius:"6px",
                        border:`1px solid ${BORDER}`, fontSize:"0.73rem", zIndex:9999,
                        minWidth:"260px", maxWidth:"400px",
                        boxShadow:"0 4px 14px rgba(0,0,0,.45)", lineHeight:"1.7" }}
                    onMouseEnter={clearTimer} onMouseLeave={startTimer}
                    onClick={e => e.stopPropagation()}>
                    <div style={{ position:"absolute", bottom:"100%", left:"50%", transform:"translateX(-50%)",
                        width:0, height:0, borderLeft:"6px solid transparent",
                        borderRight:"6px solid transparent", borderBottom:`6px solid ${BORDER}` }} />
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                        padding:'7px 10px 7px 14px', borderBottom:`1px solid ${BORDER}`,
                        fontWeight:700, fontSize:'0.8rem' }}>
                        <span>Workshop — {cardTitle || ''}</span>
                        <button type="button" onClick={e => { e.stopPropagation(); setShow(false); }}
                            style={{ background:'none', border:'none', color:'#adb5bd', cursor:'pointer',
                                fontSize:'1.1rem', lineHeight:1, padding:'0 0 0 10px' }}>×</button>
                    </div>
                    {Object.entries(filters || {}).filter(([,v]) => v).length > 0 && (
                        <div style={{ padding:'5px 14px', borderBottom:`1px solid ${BORDER}`,
                            fontSize:'0.72rem', color:'#adb5bd' }}>
                            {Object.entries(filters || {}).filter(([,v]) => v).map(([k,v]) => (
                                <span key={k} style={{ marginRight:'12px' }}>
                                    {k}: <span style={{ color:'#f8f9fa', fontWeight:500 }}>{v}</span>
                                </span>
                            ))}
                        </div>
                    )}
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.75rem' }}>
                        <tbody>
                            {lines.map((line, i) => (
                                <tr key={i}
                                    onClick={line.onClick ? (e) => { e.stopPropagation(); line.onClick(); } : undefined}
                                    style={{ lineHeight:1.7, borderTop: line.divider ? `1px solid ${BORDER}` : 'none',
                                        cursor: line.onClick ? 'pointer' : 'default' }}>
                                    <td style={{ padding: line.divider ? '6px 8px 2px 14px' : '1px 8px 1px 14px',
                                        color:'#adb5bd', whiteSpace:'nowrap', verticalAlign:'top', width:'1%' }}>
                                        {line.label || ''}
                                        {line.link && (
                                            <a href={line.link} target="_blank" rel="noopener noreferrer"
                                                onClick={e => e.stopPropagation()}
                                                style={{ marginLeft:4, color:'#6c97d4', fontSize:'0.68rem' }}>
                                                <i className="bi bi-box-arrow-up-right" />
                                            </a>
                                        )}
                                    </td>
                                    <td style={{ padding: line.divider ? '6px 14px 2px 4px' : '1px 14px 1px 4px',
                                        textAlign:'right', fontWeight: line.bold ? 700 : 400,
                                        color: line.color || '#f8f9fa', whiteSpace:'nowrap' }}>
                                        {line.value}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {error && <div style={{ padding:'4px 14px', color:'#f8a5a5', fontSize:'0.72rem' }}>{error}</div>}
                    <div style={{ display:'flex', gap:'6px', padding:'7px 14px',
                        borderTop:`1px solid ${BORDER}`, justifyContent:'flex-end' }}>
                        <button onClick={handlePrint} style={BTN} disabled={isBusy}>
                            <i className="bi bi-printer me-1" />Print
                        </button>
                        <button onClick={handlePDF} style={BTN} disabled={isBusy}>
                            {isBusy ? <span className="spinner-border spinner-border-sm" style={{ width:'0.65rem', height:'0.65rem' }} />
                                : <><i className="bi bi-file-earmark-arrow-down me-1" />PDF</>}
                        </button>
                        <button onClick={handleShare} style={BTN_GRN} disabled={isBusy}>
                            <i className="bi bi-whatsapp me-1" />Share
                        </button>
                    </div>
                </div>
            )}
        </span>
    );
}

// ── Value hover tooltip (shows exact full number) ─────────────────────────────
function ValueTooltip({ exact, children }) {
    const [show, setShow] = useState(false);
    return (
        <span style={{ position:"relative", cursor:"help" }}
            onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
            {children}
            {show && (
                <div style={{ position:"absolute", top:"110%", left:0, backgroundColor:"#212529",
                    color:"#f8f9fa", padding:"5px 10px", borderRadius:"5px",
                    fontSize:"0.75rem", fontWeight:400, zIndex:9999,
                    whiteSpace:"nowrap", boxShadow:"0 3px 10px rgba(0,0,0,0.3)",
                    pointerEvents:"none" }}>
                    <div style={{ position:"absolute", bottom:"100%", left:"12px", width:0, height:0,
                        borderLeft:"5px solid transparent", borderRight:"5px solid transparent",
                        borderBottom:"5px solid #212529" }} />
                    {exact}
                </div>
            )}
        </span>
    );
}

const CHART_OPTS_BASE = {
    backgroundColor: 'transparent',
    chartArea: { width: '80%', height: '72%' },
    fontName: 'Inter, Hanken Grotesk, sans-serif',
    fontSize: 11,
    legend: { position: 'bottom', textStyle: { fontSize: 11 } },
    animation: { startup: true, duration: 600, easing: 'out' },
    tooltip: { isHtml: true, trigger: 'selection' },
};

// ── ChartCard with Download + WhatsApp ────────────────────────────────────────
function ChartCard({ title, children, height }) {
    const chartRef = useRef(null);
    const [busyLabel, setBusyLabel] = useState(null);
    const [shareError, setShareError] = useState(null);

    async function handleDownload() {
        setBusyLabel("…");
        try {
            const dataUrl = await svgToPng(chartRef.current);
            if (!dataUrl) return;
            const a = document.createElement("a");
            a.href = dataUrl;
            a.download = (title || "chart").replace(/[^a-z0-9]+/gi, "_").toLowerCase() + ".png";
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
        } finally { setBusyLabel(null); }
    }

    async function handleWhatsApp() {
        setBusyLabel("Sharing…");
        try {
            const dataUrl = await svgToPng(chartRef.current);
            if (!dataUrl) return;
            const filename = (title || "chart").replace(/[^a-z0-9]+/gi, "_").toLowerCase() + ".png";
            const blob = dataUrlToBlob(dataUrl);
            let shareUrl;
            try { shareUrl = await uploadChartAndGetShareUrl(blob, filename); }
            catch { setShareError({ dataUrl, title }); return; }
            window.open(`https://wa.me/?text=${encodeURIComponent((title || "chart") + "\n" + shareUrl)}`, "_blank");
        } finally { setBusyLabel(null); }
    }

    return (
        <div className="card shadow-sm border-0 mb-3">
            <div className="card-header bg-white border-bottom py-2 px-3 d-flex align-items-center justify-content-between">
                <span className="fw-semibold text-dark" style={{ fontSize:'0.85rem' }}>{title}</span>
                <div className="d-flex gap-1">
                    <button className="btn btn-sm btn-outline-secondary" onClick={handleDownload}
                        disabled={!!busyLabel} title="Download as PNG"
                        style={{ fontSize:"0.72rem", padding:"2px 8px" }}>
                        <i className="bi bi-download me-1" />Download
                    </button>
                    <button className="btn btn-sm btn-outline-success" onClick={handleWhatsApp}
                        disabled={!!busyLabel} title="Share via WhatsApp"
                        style={{ fontSize:"0.72rem", padding:"2px 8px" }}>
                        <i className="bi bi-whatsapp me-1" />{busyLabel || "WhatsApp"}
                    </button>
                </div>
            </div>
            <div className="card-body p-2" style={{ height: height || 280 }} ref={chartRef}>
                {children}
            </div>
            {shareError && (
                <WhatsAppFallbackModal dataUrl={shareError.dataUrl} title={shareError.title}
                    onClose={() => setShareError(null)} />
            )}
        </div>
    );
}

// ── KPI Card (with VAT breakdown + InfoTooltip) ───────────────────────────────
function KPICard({ title, value, withoutVAT, icon, color, valueColor, note, noteColor, tooltip, store, filters, link }) {
    return (
        <div className="card shadow-sm border-0 h-100" style={{ borderLeft:`4px solid ${color}` }}>
            <div className="card-body d-flex flex-column gap-2">
                <div className="d-flex align-items-center justify-content-between">
                    <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                        <span className="text-uppercase text-muted fw-semibold" style={{ fontSize:'0.72rem', letterSpacing:'0.04em' }}>
                            {title}
                        </span>
                        {tooltip && <InfoTooltip lines={tooltip} cardTitle={title} store={store} filters={filters} />}
                        {link && (
                            <a href={link} target="_blank" rel="noopener noreferrer"
                                title="View Balance Sheet"
                                style={{ fontSize:'0.72rem', color:'#6c757d', textDecoration:'none', lineHeight:1 }}
                                onClick={e => e.stopPropagation()}>
                                <i className="bi bi-box-arrow-up-right" style={{ fontSize:10 }}></i>
                            </a>
                        )}
                    </div>
                    <div className="d-inline-flex align-items-center justify-content-center rounded"
                        style={{ width:38, height:38, background:`${color}15`, color }}>
                        <i className={`bi ${icon}`}></i>
                    </div>
                </div>
                <div className="fw-bold" style={{ fontSize:'1.45rem', color: valueColor || '#191c1e' }}>
                    {withoutVAT !== undefined
                        ? <ValueTooltip exact={`${fmt(value)} (w/ VAT) · ${fmt(withoutVAT)} (w/o VAT)`}>
                            {fmtCompact(value)}
                          </ValueTooltip>
                        : fmtCompact(value)}
                </div>
                {withoutVAT !== undefined && (
                    <div className="small text-muted">w/o VAT: {fmtCompact(withoutVAT)}</div>
                )}
                {note && <div className="small" style={{ color: noteColor || '#6c757d' }}>{note}</div>}
            </div>
        </div>
    );
}

// ── Main component ─────────────────────────────────────────────────────────────
function AutoMobileDashboard() {
    const { t } = useTranslation('common');
    const [dashboard, setDashboard] = useState({});
    const [store, setStore] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const postingRef = useRef();

    // ── Filter state ──────────────────────────────────────────────────────────
    const [filterMode, setFilterMode]     = useState("range");
    const [singleMonth, setSingleMonth]   = useState("");
    const [fromMonth, setFromMonth]       = useState("");
    const [toMonth, setToMonth]           = useState("");
    const [selectedYear, setSelectedYear] = useState("");
    const [appliedFrom, setAppliedFrom]   = useState("");
    const [appliedTo, setAppliedTo]       = useState("");
    const [fullYears, setFullYears]       = useState([]);

    const vatPercent = store?.vat_percent || 15;
    const storeId    = localStorage.getItem("store_id") || "";

    function authHeaders() {
        return { 'Content-Type': 'application/json', Authorization: localStorage.getItem('access_token') };
    }

    useEffect(() => {
        if (!storeId) return;
        fetch(`/v1/store/${storeId}?select=id,name,vat_percent,settings`, { headers: authHeaders() })
            .then(r => r.json()).then(d => { if (d.status) setStore(d.result || {}); })
            .catch(() => {});
    }, [storeId]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!storeId) return;
        loadDashboard();
    }, [storeId, appliedFrom, appliedTo]); // eslint-disable-line react-hooks/exhaustive-deps

    function loadDashboard() {
        const params = new URLSearchParams();
        params.set('search[store_id]', storeId);
        if (appliedFrom) params.set('from_month', appliedFrom);
        if (appliedTo)   params.set('to_month',   appliedTo);
        setIsLoading(true);
        fetch(`/v1/automobile/dashboard?${params.toString()}`, { headers: authHeaders() })
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson ? await response.json() : null;
                if (!response.ok || !data?.status) return Promise.reject(data?.errors || {});
                const result = data.result || {};
                setDashboard(result);
                if (!appliedFrom && !appliedTo && result.monthly_breakdown?.length) {
                    const years = [...new Set(
                        result.monthly_breakdown
                            .filter(m => m.total_profit || m.revenue)
                            .map(m => m.month.slice(0, 4))
                    )].sort((a, b) => b - a);
                    if (years.length) setFullYears(years);
                }
                setIsLoading(false);
            })
            .catch(err => { console.log(err); setDashboard({}); setIsLoading(false); });
    }

    // ── Chart data ────────────────────────────────────────────────────────────
    const monthly = useMemo(() => dashboard.monthly_breakdown || [], [dashboard.monthly_breakdown]);

    const dataMinMonth = useMemo(() => {
        const active = monthly.filter(m => m.total_profit || m.revenue);
        return active.length ? active[0].month : "";
    }, [monthly]);

    const dataMaxMonth = useMemo(() => {
        const active = monthly.filter(m => m.total_profit || m.revenue);
        return active.length ? active[active.length - 1].month : "";
    }, [monthly]);

    const chartFilters = useMemo(() => {
        if (!appliedFrom && !appliedTo) return {};
        if (appliedFrom && appliedTo && appliedFrom === appliedTo) return { Date: appliedFrom };
        return {
            ...(appliedFrom ? { From: appliedFrom } : {}),
            ...(appliedTo   ? { To:   appliedTo   } : {}),
        };
    }, [appliedFrom, appliedTo]);

    const monthlyPLData = useMemo(() => {
        const header = [
            'Month',
            { label: t('Revenue'), type: 'number' },       { role: 'tooltip', type: 'string', p: { html: true } },
            { label: t('Expense'), type: 'number' },        { role: 'tooltip', type: 'string', p: { html: true } },
            { label: t('Profit/Loss'), type: 'number' },    { role: 'tooltip', type: 'string', p: { html: true } },
        ];
        const rows = monthly.map(m => {
            const expense      = m.revenue - m.total_profit;
            const profit       = m.total_profit;
            const isProfitable = profit >= 0;
            const plColor      = isProfitable ? '#69db7c' : '#ffa8a8';
            const plTitle      = isProfitable ? t('Net Profit') : t('Net Loss');
            const rev          = calcVat(m.revenue, vatPercent);
            const exp          = calcVat(expense, vatPercent);
            const pl           = calcVat(Math.abs(profit), vatPercent);
            return [
                fmtMonth(m.month),
                parseFloat(m.revenue.toFixed(2)),
                tooltipHtml(`${t('Revenue')} — ${fmtMonth(m.month)}`, '#74c0fc', [
                    { label: t('Revenue (with VAT)'),    value: `SAR ${fmt(rev.withVAT)}`,    color:'#74c0fc', bold:true },
                    { label: `VAT ${vatPercent}%`,        value: `− ${fmt(rev.vat)}` },
                    { label: t('Revenue (without VAT)'), value: `SAR ${fmt(rev.withoutVAT)}`, color:'#74c0fc', bold:true, divider:true },
                ], store, chartFilters),
                parseFloat(expense.toFixed(2)),
                tooltipHtml(`${t('Expense')} — ${fmtMonth(m.month)}`, '#ffa8a8', [
                    { label: t('Revenue'),      value: fmt(m.revenue) },
                    { label: t('Total Profit'), value: `− ${fmt(m.total_profit)}` },
                    { label: t('Expense (with VAT)'),    value: `SAR ${fmt(exp.withVAT)}`,    color:'#ffa8a8', bold:true, divider:true },
                    { label: `VAT ${vatPercent}%`,        value: `− ${fmt(exp.vat)}` },
                    { label: t('Expense (without VAT)'), value: `SAR ${fmt(exp.withoutVAT)}`, color:'#ffa8a8', bold:true, divider:true },
                ], store, chartFilters),
                parseFloat(profit.toFixed(2)),
                tooltipHtml(`${plTitle} — ${fmtMonth(m.month)}`, plColor, [
                    { label: t('Revenue'),      value: fmt(m.revenue),   color:'#74c0fc' },
                    { label: t('Expense'),       value: `− ${fmt(expense)}`, color:'#ffa8a8' },
                    { label: `${plTitle} (with VAT)`,    value: `SAR ${fmt(pl.withVAT)}`,    bold:true, color:plColor, divider:true },
                    { label: `VAT ${vatPercent}%`,        value: `− ${fmt(pl.vat)}` },
                    { label: `${plTitle} (without VAT)`, value: `SAR ${fmt(pl.withoutVAT)}`, bold:true, color:plColor, divider:true },
                ], store, chartFilters),
            ];
        });
        return [header, ...rows];
    }, [monthly, vatPercent, store, chartFilters, t]);



    const profitPieData = useMemo(() => {
        const lbd = dashboard.labour_breakdown     || {};
        const sbd = dashboard.spare_breakdown      || {};
        const abd = dashboard.additional_breakdown || {};
        return [
            ['Type', 'Amount', { role:'tooltip', type:'string', p:{ html:true } }],
            [t('Labour Profit'), dashboard.labour_profit || 0,
                tooltipHtml(t('Labour Profit'), '#4fc3f7', [
                    { label: t('Sales Profit'),  value: `SAR ${fmt(lbd.sales_profit||0)}`,  color:'#4fc3f7' },
                    { label: t('Return Profit'), value: `− ${fmt(lbd.return_profit||0)}`,   color:'#ffa8a8' },
                    { label: t('Net (with VAT)'),    value: `SAR ${fmt(dashboard.labour_profit||0)}`, color:'#4fc3f7', bold:true, divider:true },
                    { label: `VAT ${vatPercent}%`, value: `− ${fmt((dashboard.labour_profit||0)*vatPercent/(100+vatPercent))}` },
                    { label: t('Net (without VAT)'), value: `SAR ${fmt((dashboard.labour_profit||0)*100/(100+vatPercent))}`, bold:true, divider:true },
                ], store, chartFilters)],
            [t('Spare Profit'), dashboard.spare_profit || 0,
                tooltipHtml(t('Spare Profit'), '#81c784', [
                    { label: t('Sales Profit'),  value: `SAR ${fmt(sbd.sales_profit||0)}`,  color:'#81c784' },
                    { label: t('Return Profit'), value: `− ${fmt(sbd.return_profit||0)}`,   color:'#ffa8a8' },
                    { label: t('Net (with VAT)'),    value: `SAR ${fmt(dashboard.spare_profit||0)}`, color:'#81c784', bold:true, divider:true },
                    { label: `VAT ${vatPercent}%`, value: `− ${fmt((dashboard.spare_profit||0)*vatPercent/(100+vatPercent))}` },
                    { label: t('Net (without VAT)'), value: `SAR ${fmt((dashboard.spare_profit||0)*100/(100+vatPercent))}`, bold:true, divider:true },
                ], store, chartFilters)],
            [t('Additional Profit'), dashboard.additional_profit || 0,
                tooltipHtml(t('Additional Profit'), '#ffb74d', [
                    { label: t('Sales Profit'),  value: `SAR ${fmt(abd.sales_profit||0)}`,  color:'#ffb74d' },
                    { label: t('Return Profit'), value: `− ${fmt(abd.return_profit||0)}`,   color:'#ffa8a8' },
                    { label: t('Net (with VAT)'),    value: `SAR ${fmt(dashboard.additional_profit||0)}`, color:'#ffb74d', bold:true, divider:true },
                    { label: `VAT ${vatPercent}%`, value: `− ${fmt((dashboard.additional_profit||0)*vatPercent/(100+vatPercent))}` },
                    { label: t('Net (without VAT)'), value: `SAR ${fmt((dashboard.additional_profit||0)*100/(100+vatPercent))}`, bold:true, divider:true },
                ], store, chartFilters)],
        ];
    }, [dashboard, vatPercent, store, chartFilters, t]);

    const cashPieData = useMemo(() => [
        ['Type', 'Amount', { role:'tooltip', type:'string', p:{ html:true } }],
        [t('Counter Cash'), dashboard.counter_cash || 0,
            tooltipHtml(t('Counter Cash'), '#1a7a3a', [{ label:'SAR', value: fmt(dashboard.counter_cash||0), color:'#1a7a3a', bold:true }], store, chartFilters)],
        [t('Bank Cash'), dashboard.bank_cash || 0,
            tooltipHtml(t('Bank Cash'), '#004ac6', [{ label:'SAR', value: fmt(dashboard.bank_cash||0), color:'#004ac6', bold:true }], store, chartFilters)],
    ], [dashboard, store, chartFilters, t]);

    const assetBarData = useMemo(() => [
        ['Category', t('Value'), { role:'style' }, { role:'tooltip', type:'string', p:{ html:true } }],
        [t('Spare Parts (Purchase)'), dashboard.spare_parts_value?.purchase_value || 0, '#7986cb',
            tooltipHtml(t('Spare Parts Purchase Value'), '#7986cb', [{ label:'SAR', value: fmt(dashboard.spare_parts_value?.purchase_value||0), color:'#7986cb', bold:true }], store, chartFilters)],
        [t('Spare Parts (Retail)'), dashboard.spare_parts_value?.retail_value || 0, '#4db6ac',
            tooltipHtml(t('Spare Parts Retail Value'), '#4db6ac', [{ label:'SAR', value: fmt(dashboard.spare_parts_value?.retail_value||0), color:'#4db6ac', bold:true }], store, chartFilters)],
        [t('Total Credit'), dashboard.total_credit || 0, '#ff8a65',
            tooltipHtml(t('Total Customer Credit'), '#ff8a65', [{ label:'SAR', value: fmt(dashboard.total_credit||0), color:'#ff8a65', bold:true }], store, chartFilters)],
        [t('Unpaid Bill'), dashboard.unpaid_bill || 0, '#ef5350',
            tooltipHtml(t('Unpaid Bills'), '#ef5350', [{ label:'SAR', value: fmt(dashboard.unpaid_bill||0), color:'#ef5350', bold:true }], store, chartFilters)],
        [t('Additional Expense'), dashboard.additional_expense || 0, '#8d6e63',
            tooltipHtml(t('Additional Expenses'), '#8d6e63', [{ label:'SAR', value: fmt(dashboard.additional_expense||0), color:'#8d6e63', bold:true }], store, chartFilters)],
    ], [dashboard, store, chartFilters, t]);

    // ── KPI sections ──────────────────────────────────────────────────────────
    const kpiSections = useMemo(() => {
        const tp    = calcVat(dashboard.total_profit, vatPercent);
        const mp    = calcVat(dashboard.monthly_profit, vatPercent);
        const lp    = calcVat(dashboard.labour_profit, vatPercent);
        const sp    = calcVat(dashboard.spare_profit, vatPercent);
        const ap    = calcVat(dashboard.additional_profit, vatPercent);

        const tbd  = dashboard.total_profit_breakdown   || {};
        const mbd  = dashboard.monthly_profit_breakdown || {};
        const lbd  = dashboard.labour_breakdown         || {};
        const sbd  = dashboard.spare_breakdown          || {};
        const abd  = dashboard.additional_breakdown     || {};

        const monthName = dashboard.month_name || '';

        return [
            {
                title: t('Profit Overview'),
                cards: [
                    {
                        title: t('Total Profit'), value: tp.withVAT, withoutVAT: tp.withoutVAT,
                        icon:'bi-graph-up-arrow', color:'#004ac6',
                        tooltip: [
                            { label: t('— Revenue —'), value: '', bold:true, color:'#90caf9' },
                            { label: t('Sales'),              value: `SAR ${fmt(tbd.sales_revenue||0)}`,       color:'#90caf9' },
                            { label: t('Sales Returns'),      value: `− ${fmt(tbd.sales_return_revenue||0)}`,  color:'#ffa8a8' },
                            ...(tbd.qtn_revenue ? [
                                { label: t('Quotation Sales'),   value: `SAR ${fmt(tbd.qtn_revenue||0)}`,      color:'#90caf9' },
                                { label: t('Quotation Returns'), value: `− ${fmt(tbd.qtn_return_revenue||0)}`, color:'#ffa8a8' },
                            ] : []),
                            { label: t('Total Revenue'), value: `SAR ${fmt(tbd.total_revenue||0)}`, bold:true, color:'#69db7c', divider:true },
                            { label: t('— Expenses —'), value: '', bold:true, color:'#ffa8a8' },
                            { label: t('Expenses'),      value: `SAR ${fmt(tbd.expense_total||0)}`,  color:'#ffa8a8' },
                            { label: t('Purchases'),     value: `SAR ${fmt(tbd.purchase_total||0)}`, color:'#ffa8a8' },
                            { label: t('Salary Paid'),   value: `SAR ${fmt(tbd.salary_paid||0)}`,    color:'#ffa8a8' },
                            { label: t('Total Expenses'), value: `SAR ${fmt(tbd.total_expenses||0)}`, bold:true, color:'#ffa8a8', divider:true },
                            { label: t('Total Profit (with VAT)'),    value: `SAR ${fmt(tp.withVAT)}`,    bold:true, color:'#90caf9', divider:true },
                            { label: `VAT ${vatPercent}%`,             value: `− ${fmt(tp.vat)}` },
                            { label: t('Total Profit (without VAT)'), value: `SAR ${fmt(tp.withoutVAT)}`, bold:true, color:'#90caf9', divider:true },
                        ],
                    },
                    {
                        title: `${t('Monthly Profit')} (${monthName})`, value: mp.withVAT, withoutVAT: mp.withoutVAT,
                        icon:'bi-calendar-check', color:'#1a7a3a',
                        tooltip: [
                            { label: monthName, value: '', bold:true, color:'#69db7c' },
                            { label: t('— Revenue —'), value: '', bold:true, color:'#90caf9' },
                            { label: t('Sales'),         value: `SAR ${fmt(mbd.sales_revenue||0)}`,       color:'#90caf9' },
                            { label: t('Sales Returns'), value: `− ${fmt(mbd.sales_return_revenue||0)}`,  color:'#ffa8a8' },
                            ...(mbd.qtn_revenue ? [
                                { label: t('Quotation Sales'),   value: `SAR ${fmt(mbd.qtn_revenue||0)}`,      color:'#90caf9' },
                                { label: t('Quotation Returns'), value: `− ${fmt(mbd.qtn_return_revenue||0)}`, color:'#ffa8a8' },
                            ] : []),
                            { label: t('Total Revenue'), value: `SAR ${fmt(mbd.total_revenue||0)}`, bold:true, color:'#69db7c', divider:true },
                            { label: t('— Expenses —'), value: '', bold:true, color:'#ffa8a8' },
                            { label: t('Expenses'),     value: `SAR ${fmt(mbd.expense_total||0)}`,  color:'#ffa8a8' },
                            { label: t('Purchases'),    value: `SAR ${fmt(mbd.purchase_total||0)}`, color:'#ffa8a8' },
                            { label: t('Salary Paid'),  value: `SAR ${fmt(mbd.salary_paid||0)}`,    color:'#ffa8a8' },
                            { label: t('Total Expenses'), value: `SAR ${fmt(mbd.total_expenses||0)}`, bold:true, color:'#ffa8a8', divider:true },
                            { label: t('Monthly Profit (with VAT)'),    value: `SAR ${fmt(mp.withVAT)}`,    bold:true, color:'#69db7c', divider:true },
                            { label: `VAT ${vatPercent}%`,               value: `− ${fmt(mp.vat)}` },
                            { label: t('Monthly Profit (without VAT)'), value: `SAR ${fmt(mp.withoutVAT)}`, bold:true, color:'#69db7c', divider:true },
                        ],
                    },
                    {
                        title: t('Labour Profit'), value: lp.withVAT, withoutVAT: lp.withoutVAT,
                        icon:'bi-person-gear', color:'#e65100',
                        tooltip: [
                            { label: t('Sales Profit (Labour Charge)'),   value: `SAR ${fmt(lbd.sales_profit||0)}`,  color:'#4fc3f7' },
                            { label: t('Return Profit (Labour Charge)'),  value: `− ${fmt(lbd.return_profit||0)}`,   color:'#ffa8a8' },
                            { label: t('Labour Profit (with VAT)'),       value: `SAR ${fmt(lp.withVAT)}`,           bold:true, color:'#4fc3f7', divider:true },
                            { label: `VAT ${vatPercent}%`,                 value: `− ${fmt(lp.vat)}` },
                            { label: t('Labour Profit (without VAT)'),    value: `SAR ${fmt(lp.withoutVAT)}`,        bold:true, color:'#4fc3f7', divider:true },
                        ],
                    },
                    {
                        title: t('Spare Profit'), value: sp.withVAT, withoutVAT: sp.withoutVAT,
                        icon:'bi-box-seam', color:'#6a1b9a',
                        tooltip: [
                            { label: t('Sales Profit (Products)'),   value: `SAR ${fmt(sbd.sales_profit||0)}`,  color:'#81c784' },
                            { label: t('Return Profit (Products)'),  value: `− ${fmt(sbd.return_profit||0)}`,   color:'#ffa8a8' },
                            { label: t('Spare Profit (with VAT)'),   value: `SAR ${fmt(sp.withVAT)}`,           bold:true, color:'#81c784', divider:true },
                            { label: `VAT ${vatPercent}%`,            value: `− ${fmt(sp.vat)}` },
                            { label: t('Spare Profit (without VAT)'),value: `SAR ${fmt(sp.withoutVAT)}`,        bold:true, color:'#81c784', divider:true },
                        ],
                    },
                    {
                        title: t('Additional Profit'), value: ap.withVAT, withoutVAT: ap.withoutVAT,
                        icon:'bi-three-dots', color:'#1565c0',
                        tooltip: [
                            { label: t('Sales Profit (Other Services)'),  value: `SAR ${fmt(abd.sales_profit||0)}`,  color:'#ffb74d' },
                            { label: t('Return Profit (Other Services)'), value: `− ${fmt(abd.return_profit||0)}`,   color:'#ffa8a8' },
                            { label: t('Additional Profit (with VAT)'),   value: `SAR ${fmt(ap.withVAT)}`,           bold:true, color:'#ffb74d', divider:true },
                            { label: `VAT ${vatPercent}%`,                 value: `− ${fmt(ap.vat)}` },
                            { label: t('Additional Profit (without VAT)'),value: `SAR ${fmt(ap.withoutVAT)}`,        bold:true, color:'#ffb74d', divider:true },
                        ],
                    },
                ],
            },
            {
                title: t('Cash & Bank'),
                cards: [
                    { title: t('Counter Cash'), value: dashboard.counter_cash, icon:'bi-cash-stack', color:'#1a7a3a',
                      link: '/dashboard/accounts',
                      tooltip: [{ label:'Cash A/c Balance', value: `SAR ${fmt(dashboard.counter_cash||0)}`, bold:true, color:'#69db7c' }] },
                    { title: t('Bank Cash'), value: dashboard.bank_cash, icon:'bi-bank2', color:'#004ac6',
                      link: '/dashboard/accounts',
                      tooltip: [{ label:'Bank A/c Balance', value: `SAR ${fmt(dashboard.bank_cash||0)}`, bold:true, color:'#74c0fc' }] },
                ],
            },
            {
                title: t('Assets & Liabilities'),
                cards: [
                    {
                        title: t('Spare Parts Asset Value'),
                        value: dashboard.spare_parts_value?.retail_value || 0,
                        icon:'bi-boxes', color:'#6a1b9a',
                        tooltip: [
                            { label: t('Purchase Value'), value: `SAR ${fmt(dashboard.spare_parts_value?.purchase_value||0)}`, color:'#adb5bd' },
                            { label: t('Retail Value'),   value: `SAR ${fmt(dashboard.spare_parts_value?.retail_value||0)}`,   color:'#ce9ffc', bold:true, divider:true },
                        ],
                        note: `${t('Purchase')}: ${fmtCompact(dashboard.spare_parts_value?.purchase_value||0)}`,
                    },
                    { title: t('Total Credit'), value: dashboard.total_credit, icon:'bi-people', color:'#e65100',
                      tooltip: [{ label:'SAR', value: fmt(dashboard.total_credit||0), bold:true, color:'#ffa94d' }] },
                    { title: t('Unpaid Bill'), value: dashboard.unpaid_bill, icon:'bi-receipt-cutoff', color:'#c62828',
                      tooltip: [{ label:'SAR', value: fmt(dashboard.unpaid_bill||0), bold:true, color:'#ffa8a8' }] },
                    {
                        title: t('Salary Balance'), value: dashboard.salary_balance, icon:'bi-person-badge', color:'#ba1a1a',
                        valueColor: dashboard.salary_balance < 0 ? '#ba1a1a' : (dashboard.salary_balance > 0 ? '#0a58ca' : '#191c1e'),
                        note: dashboard.salary_balance < 0 ? t('Owed to Employees') : (dashboard.salary_balance > 0 ? t('Employees Owe Us') : t('Settled')),
                        noteColor: dashboard.salary_balance < 0 ? '#ba1a1a' : (dashboard.salary_balance > 0 ? '#0a58ca' : '#6c757d'),
                        tooltip: [
                            { label: t('Owed to Employees'), value: fmt(dashboard.salary_accrued||0) },
                            { label: t('Salary Paid'),        value: fmt(dashboard.salary_paid||0) },
                            { label: t('Net Balance'),    value: fmt(Math.abs(dashboard.salary_balance||0)), bold: true },
                            ...(dashboard.employee_accounts?.length ? [
                                { label: '── Accounts ──', value: '', divider: true },
                                ...dashboard.employee_accounts.map(a => ({
                                    label: a.name,
                                    value: a.balance < 0
                                        ? `-${fmt(Math.abs(a.balance))} (${t('We Owe')})`
                                        : (a.balance > 0 ? `${fmt(a.balance)} (${t('Owe us')})` : t('Settled')),
                                    color: a.balance < 0 ? '#f8a5a5' : (a.balance > 0 ? '#a3d9a5' : '#adb5bd'),
                                    onClick: () => postingRef.current?.open({ id: a.id }, { title: `${a.name} — Balance Sheet` }),
                                })),
                            ] : []),
                        ],
                    },
                    { title: t('Additional Expense'), value: dashboard.additional_expense, icon:'bi-wallet2', color:'#54647a',
                      tooltip: [{ label:'SAR', value: fmt(dashboard.additional_expense||0), bold:true, color:'#adb5bd' }] },
                ],
            },
        ];
    }, [dashboard, vatPercent, t]);

    const hasMonthly = monthly.length > 0;
    const hasProfit  = (dashboard.labour_profit||0)+(dashboard.spare_profit||0)+(dashboard.additional_profit||0) > 0;
    const hasCash    = (dashboard.counter_cash||0)+(dashboard.bank_cash||0) > 0;
    const chartPeriod = appliedFrom || appliedTo
        ? (appliedFrom === appliedTo ? appliedFrom : `${appliedFrom || '…'} → ${appliedTo || '…'}`)
        : t('Last 12 Months');

    if (isLoading) {
        return (
            <div className="text-center py-5">
                <Spinner animation="border" variant="primary" style={{ width:'3rem', height:'3rem' }} />
                <p className="mt-3 text-muted">{t('Loading dashboard...')}</p>
            </div>
        );
    }

    return (
        <>
        <div className="container-fluid px-3 py-3">
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}.spin{animation:spin .7s linear infinite;display:inline-block;}`}</style>

            {/* Header */}
            <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
                <div>
                    <h4 className="mb-1 fw-bold">
                        <i className="bi bi-speedometer2 me-2 text-primary"></i>{t('Workshop Dashboard')}
                    </h4>
                    <p className="text-muted mb-0 small">{t('Real-time overview of your automobile workshop operations')}</p>
                </div>
                <button onClick={loadDashboard} className="btn btn-sm btn-outline-primary">
                    <i className="bi bi-arrow-clockwise me-1"></i>{t('Refresh')}
                </button>
            </div>

            {/* Filter bar */}
            <div className="d-flex align-items-center gap-2 mb-4 flex-wrap">
                <div className="btn-group btn-group-sm" role="group">
                    <button type="button"
                        className={`btn ${filterMode==="single" ? "btn-primary" : "btn-outline-secondary"}`}
                        onClick={() => { setFilterMode("single"); setFromMonth(""); setToMonth(""); setSelectedYear(""); setAppliedFrom(""); setAppliedTo(""); }}>
                        <i className="bi bi-calendar-date me-1" />Single Month
                    </button>
                    <button type="button"
                        className={`btn ${filterMode==="range" ? "btn-primary" : "btn-outline-secondary"}`}
                        onClick={() => { setFilterMode("range"); setSingleMonth(""); setSelectedYear(""); setAppliedFrom(""); setAppliedTo(""); }}>
                        <i className="bi bi-calendar-range me-1" />Month Range
                    </button>
                    <button type="button"
                        className={`btn ${filterMode==="year" ? "btn-primary" : "btn-outline-secondary"}`}
                        onClick={() => { setFilterMode("year"); setSingleMonth(""); setFromMonth(""); setToMonth(""); setAppliedFrom(""); setAppliedTo(""); }}>
                        <i className="bi bi-calendar3 me-1" />Year
                    </button>
                </div>

                {filterMode==="single" && (
                    <input type="month" className="form-control form-control-sm" style={{ width:"auto" }}
                        value={singleMonth}
                        onChange={e => { setSingleMonth(e.target.value); setAppliedFrom(e.target.value); setAppliedTo(e.target.value); }} />
                )}

                {filterMode==="range" && (
                    <>
                        <input type="month" className="form-control form-control-sm" style={{ width:"auto" }}
                            value={fromMonth}
                            onChange={e => { setFromMonth(e.target.value); setAppliedFrom(e.target.value); }} />
                        <span className="text-muted small">to</span>
                        <input type="month" className="form-control form-control-sm" style={{ width:"auto" }}
                            value={toMonth}
                            onChange={e => { setToMonth(e.target.value); setAppliedTo(e.target.value); }} />
                    </>
                )}

                {filterMode==="year" && (
                    <select className="form-select form-select-sm"
                        style={{ width:"6rem", height:"26px", padding:"0 0.5rem", fontSize:"0.8rem" }}
                        value={selectedYear}
                        onChange={e => {
                            setSelectedYear(e.target.value);
                            setAppliedFrom(e.target.value ? `${e.target.value}-01` : "");
                            setAppliedTo(e.target.value ? `${e.target.value}-12` : "");
                        }}>
                        <option value="">—</option>
                        {fullYears.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                )}

                {(appliedFrom || appliedTo) && (
                    <button className="btn btn-sm btn-outline-secondary"
                        onClick={() => { setSingleMonth(""); setFromMonth(""); setToMonth(""); setSelectedYear(""); setAppliedFrom(""); setAppliedTo(""); }}>
                        Clear
                    </button>
                )}

                {dataMinMonth && dataMaxMonth && (
                    <span className="text-muted small fst-italic ms-1">
                        <i className="bi bi-info-circle me-1" />Data: {dataMinMonth} → {dataMaxMonth}
                    </span>
                )}

                {(appliedFrom || appliedTo) && (
                    <span className="text-muted small fst-italic">
                        {filterMode==="year" && selectedYear ? `Showing: ${selectedYear}`
                            : appliedFrom===appliedTo ? `Showing: ${appliedFrom}`
                            : `Showing: ${appliedFrom||dataMinMonth} → ${appliedTo||dataMaxMonth}`}
                    </span>
                )}
            </div>

            {/* KPI sections */}
            {kpiSections.map(section => (
                <div className="mb-4" key={section.title}>
                    <h5 className="fw-semibold mb-3">{section.title}</h5>
                    <div className="row g-3">
                        {section.cards.map(card => (
                            <div key={card.title} className="col-12 col-md-6 col-xl-4">
                                <KPICard {...card} store={store} filters={chartFilters} />
                            </div>
                        ))}
                    </div>
                </div>
            ))}

            {/* Charts */}
            <h5 className="fw-semibold mb-3 mt-2">{t('Charts & Analytics')}</h5>

            {/* P&L Trend — new chart, full width */}
            <div className="row g-3 mb-3">
                <div className="col-12">
                    <ChartCard title={`${t('Monthly P&L Trend')} (${chartPeriod})`} height={320}>
                        {hasMonthly ? (
                            <Chart
                                chartType="ComboChart"
                                width="100%" height="100%"
                                data={monthlyPLData}
                                chartEvents={[{ eventName:'select', callback:onChartSelect }]}
                                options={{
                                    ...CHART_OPTS_BASE,
                                    tooltip: { isHtml:true, trigger:'selection' },
                                    seriesType: 'bars',
                                    series: {
                                        0: { type:'bars', color:'#4e73df' },
                                        1: { type:'bars', color:'#e74a3b' },
                                        2: { type:'line', color:'#1cc88a', pointSize:5, lineWidth:2 },
                                    },
                                    vAxis: { title:'SAR', textStyle:{ fontSize:10 }, format:'#,##0' },
                                    hAxis: { textStyle:{ fontSize:10 } },
                                    chartArea: { width:'78%', height:'65%' },
                                    legend: { position:'top', textStyle:{ fontSize:11 } },
                                }}
                            />
                        ) : (
                            <div className="d-flex align-items-center justify-content-center h-100 text-muted small">{t('No monthly data available')}</div>
                        )}
                    </ChartCard>
                </div>
            </div>

            {/* Row 2: Profit Pie + Cash Distribution */}
            <div className="row g-3 mb-3">
                <div className="col-12 col-md-6">
                    <ChartCard title={t('Profit Breakdown')} height={260}>
                        {hasProfit ? (
                            <Chart
                                chartType="PieChart"
                                width="100%" height="100%"
                                data={profitPieData}
                                chartEvents={[{ eventName:'select', callback:onChartSelect }]}
                                options={{ ...CHART_OPTS_BASE, colors:['#4fc3f7','#81c784','#ffb74d'], pieHole:0.4, chartArea:{ width:'85%', height:'80%' }, pieSliceText:'percentage' }}
                            />
                        ) : (
                            <div className="d-flex align-items-center justify-content-center h-100 text-muted small">{t('No profit data available')}</div>
                        )}
                    </ChartCard>
                </div>
                <div className="col-12 col-md-6">
                    <ChartCard title={t('Cash Distribution')} height={260}>
                        {hasCash ? (
                            <Chart
                                chartType="PieChart"
                                width="100%" height="100%"
                                data={cashPieData}
                                chartEvents={[{ eventName:'select', callback:onChartSelect }]}
                                options={{ ...CHART_OPTS_BASE, colors:['#1a7a3a','#004ac6'], pieHole:0.4, chartArea:{ width:'85%', height:'80%' }, pieSliceText:'percentage' }}
                            />
                        ) : (
                            <div className="d-flex align-items-center justify-content-center h-100 text-muted small">{t('No cash data available')}</div>
                        )}
                    </ChartCard>
                </div>
            </div>

            {/* Row 3: Assets & Liabilities */}
            <div className="row g-3 mb-3">
                <div className="col-12">
                    <ChartCard title={t('Assets & Liabilities Overview')} height={280}>
                        <Chart
                            chartType="BarChart"
                            width="100%" height="100%"
                            data={assetBarData}
                            chartEvents={[{ eventName:'select', callback:onChartSelect }]}
                            options={{ ...CHART_OPTS_BASE, legend:{ position:'none' }, hAxis:{ title:'SAR', textStyle:{ fontSize:10 }, format:'#,##0' }, vAxis:{ textStyle:{ fontSize:11 } }, chartArea:{ width:'65%', height:'80%' } }}
                        />
                    </ChartCard>
                </div>
            </div>
        </div>
        <PostingIndex ref={postingRef} />
        </>
    );
}

export default AutoMobileDashboard;
