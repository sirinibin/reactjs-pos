import jsPDF from 'jspdf';
import { addCommasToInfoValue, stripSarBreakdown } from './numberUtils';

// ── Colour palette (matches chatbot bi_client.py + avoids low-contrast combos) ─
const DARK_BLUE   = [0,   51, 102];   // #003366  header bg (chatbot exact)
const MID_BLUE    = [85, 136, 187];   // #5588BB  rule / accent
const LIGHT_BLUE  = [176, 196, 222];  // #B0C4DE  header secondary text
const ACCENT_BLUE = [37,  117, 194];  // #2575C2  badges / left bar
const CHARCOAL    = [44,   62,  80];  // #2C3E50  section sub-headers
const DK_TEXT     = [22,   33,  43];  // #16212B  primary body text
const MD_TEXT     = [80,   95, 110];  // #505F6E  labels / secondary
const LT_BG       = [244, 246, 249];  // #F4F6F9  alternating row (chatbot LIGHT_GREY)
const BORDER_CLR  = [206, 212, 218];  // #CED4DA  row dividers
const WHITE       = [255, 255, 255];
const FOOTER_BG   = [22,   33,  50];  // very dark navy for footer
const GREEN       = [21,  128,  79];  // #15804F  profit (WCAG AA on white)
const RED         = [180,  30,  45];  // #B41E2D  loss   (WCAG AA on white)
const LABEL_CLR   = [60,   80, 100];  // label column text (readable dark)

// Map tooltip-optimised colours (designed for dark tooltip backgrounds) to
// high-contrast PDF equivalents that are readable on white paper.
const TOOLTIP_TO_PDF = {
    '#74c0fc': ACCENT_BLUE,  // light blue  → brand blue
    '#69db7c': GREEN,         // light green → dark green (profit)
    '#ffa8a8': RED,           // light pink  → dark red (loss / expense)
    '#f8f9fa': DK_TEXT,       // near-white  → primary dark text
    '#adb5bd': MD_TEXT,       // muted grey  → secondary text
};

function pdfSafeColor(hex, isBold) {
    if (!hex) return isBold ? DK_TEXT : MD_TEXT;
    const mapped = TOOLTIP_TO_PDF[hex.toLowerCase()];
    if (mapped) return mapped;
    return darkenRgb(hexToRgb(hex), 0.65);
}

// ── Shared utilities ───────────────────────────────────────────────────────────
function S(str) {
    if (typeof str !== 'string') return String(str ?? '');
    return str.replace(/[−–—]/g, '-').replace(/[""]/g, '"').replace(/['']/g, "'");
}

export function safeName(str) {
    return str.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}

function hexToRgb(hex) {
    if (!hex || typeof hex !== 'string') return DK_TEXT;
    const h = hex.replace('#', '');
    const s = h.length === 3 ? 2 : 1;
    return [
        parseInt(h.substring(0, s).padEnd(2, h[0]), 16),
        parseInt(h.substring(s, s * 2).padEnd(2, h[s]), 16),
        parseInt(h.substring(s * 2, s * 3).padEnd(2, h[s * 2]), 16),
    ];
}

// Darken a colour to ensure readability on white/light bg
function darkenRgb([r, g, b], factor = 0.65) {
    return [Math.round(r * factor), Math.round(g * factor), Math.round(b * factor)];
}

const ML = 16, MR = 16;

function newDoc() {
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    return { doc, W, H, CW: W - ML - MR };
}

function guard(doc, H, y, need = 10) {
    if (y + need > H - 20) { doc.addPage(); return 20; }
    return y;
}

// ── Drawing primitives ─────────────────────────────────────────────────────────

/**
 * Chatbot-style branded header (matches bi_client.py draw_pdf_header exactly).
 * Returns y position after the header.
 */
function drawHeader(doc, W, title, store) {
    const name   = S(store?.name   || '');
    const branch = S(store?.branch_name || '');
    const vatNo  = store?.vat_no ? `VAT: ${S(store.vat_no)}` : '';
    const crn    = store?.registration_number ? `CRN: ${S(store.registration_number)}` : '';
    const addr   = S(store?.address || '');
    const hasRow3 = vatNo || crn || addr;

    // Header height: taller when company details are present
    const BAR_H = hasRow3 ? 36 : 28;

    // Background
    doc.setFillColor(...DARK_BLUE);
    doc.rect(0, 0, W, BAR_H, 'F');

    // Left accent stripe
    doc.setFillColor(...ACCENT_BLUE);
    doc.rect(0, 0, 4, BAR_H, 'F');

    // Bottom blue rule
    doc.setFillColor(...MID_BLUE);
    doc.rect(0, BAR_H, W, 1.5, 'F');

    const today = new Intl.DateTimeFormat('en-US', { dateStyle: 'long' }).format(new Date());

    // Row 1: store name (left, bold white 13pt) | report title (right, bold white 11pt)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...WHITE);
    if (name) doc.text(name, ML + 4, 11);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(name ? 11 : 15);
    doc.text(S(title), W - MR - 2, 11, { align: 'right' });

    // Row 2: branch (left, light-blue 8.5pt) | generated date (right, light-blue 8pt)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...LIGHT_BLUE);
    if (branch) doc.text(branch, ML + 4, 19);

    doc.setFontSize(8);
    doc.text(`Generated: ${today}`, W - MR - 2, 19, { align: 'right' });

    // Thin rule (chatbot style)
    doc.setDrawColor(...MID_BLUE);
    doc.setLineWidth(0.4);
    doc.line(ML, 22.5, W - MR, 22.5);

    // Row 3: VAT · CRN · Address (7pt, light-blue)
    if (hasRow3) {
        const parts = [vatNo, crn, addr].filter(Boolean);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...LIGHT_BLUE);
        doc.text(parts.join('   ·   '), ML + 4, 30);
    }

    return BAR_H + 6;  // y after header
}

function drawFilterBadge(doc, W, CW, filters, y) {
    const active = Object.entries(filters || {}).filter(([, v]) => v !== undefined && v !== null && v !== '');
    if (!active.length) return y;

    doc.setFillColor(228, 239, 252);
    doc.rect(ML, y, CW, 9, 'F');
    doc.setFillColor(...ACCENT_BLUE);
    doc.rect(ML, y, 3, 9, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...ACCENT_BLUE);
    doc.text('PERIOD:', ML + 5, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...DK_TEXT);
    doc.text(active.map(([k, v]) => `${k}: ${v}`).join('    '), ML + 22, y + 6);

    return y + 13;
}

function drawColumnHeaders(doc, W, y) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...MD_TEXT);
    doc.text('DESCRIPTION', ML + 3, y);
    doc.text('AMOUNT', W - MR - 3, y, { align: 'right' });
    y += 3;
    doc.setDrawColor(...DARK_BLUE);
    doc.setLineWidth(0.5);
    doc.line(ML, y, W - MR, y);
    return y + 5;
}

function drawSectionBanner(doc, W, text, y) {
    doc.setFillColor(...CHARCOAL);
    doc.rect(0, y, W, 11, 'F');
    doc.setFillColor(...ACCENT_BLUE);
    doc.rect(0, y, 4, 11, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...WHITE);
    doc.text(S(text).toUpperCase(), ML + 5, y + 7.5);
    return y + 14;
}

function drawFooter(doc, W, H) {
    const n = doc.getNumberOfPages();
    for (let i = 1; i <= n; i++) {
        doc.setPage(i);
        doc.setFillColor(...FOOTER_BG);
        doc.rect(0, H - 12, W, 12, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...LIGHT_BLUE);
        doc.text('Generated by StartPos', ML, H - 4.5);
        doc.text(`Page ${i} of ${n}`, W / 2, H - 4.5, { align: 'center' });
        doc.text('Confidential', W - MR, H - 4.5, { align: 'right' });
    }
}

// ── Info-block renderer ────────────────────────────────────────────────────────
function renderInfoBlock(doc, W, H, CW, lines, y, accentRgb) {
    if (!Array.isArray(lines)) return y;

    const descLine   = lines[0] && !lines[0].divider && lines[0].bold ? lines[0] : null;
    const detailLines = descLine ? lines.slice(1) : lines;
    const accent      = accentRgb || ACCENT_BLUE;

    // ── "What it is" description strip ───────────────────────────────────
    if (descLine) {
        y = guard(doc, H, y, 14);
        const textColor = pdfSafeColor(descLine.color || '#2575C2', true);
        const wrapped = doc.splitTextToSize(S(String(descLine.value || '')), CW - 14);
        const bh = wrapped.length * 5.2 + 6;

        doc.setFillColor(250, 252, 255);
        doc.rect(ML, y, CW, bh, 'F');
        doc.setFillColor(...textColor);
        doc.rect(ML, y, 3.5, bh, 'F');
        doc.setDrawColor(...BORDER_CLR);
        doc.setLineWidth(0.2);
        doc.rect(ML, y, CW, bh, 'S');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(...textColor);
        doc.text(wrapped, ML + 6, y + 5.5);
        y += bh + 6;
    }

    // ── Detail rows ───────────────────────────────────────────────────────
    detailLines.forEach(line => {
        y = guard(doc, H, y, 8);

        if (line.divider) {
            doc.setDrawColor(...BORDER_CLR);
            doc.setLineWidth(0.35);
            doc.line(ML, y + 1, W - MR, y + 1);
            y += 5;
        }

        if (line.label || line.value !== undefined) {
            const bold = !!line.bold;

            // Bold rows get a light shaded background
            if (bold) {
                doc.setFillColor(...LT_BG);
                doc.rect(ML, y - 4, CW, 7.5, 'F');
            }

            if (line.label) {
                doc.setFont('helvetica', bold ? 'bold' : 'normal');
                doc.setFontSize(9.5);
                doc.setTextColor(...LABEL_CLR);
                doc.text(S(String(line.label)) + ':', ML + 5, y);
            }

            if (line.value !== undefined) {
                const valueColor = pdfSafeColor(line.color, bold);

                doc.setFont('helvetica', bold ? 'bold' : 'normal');
                doc.setFontSize(9.5);
                doc.setTextColor(...valueColor);
                doc.text(
                    S(stripSarBreakdown(addCommasToInfoValue(String(line.value)), bold)),
                    W - MR - 4, y, { align: 'right' }
                );
            }

            y += bold ? 7 : 6;
        }
    });

    // ── Final total highlight ─────────────────────────────────────────────
    if (descLine) {
        const last = detailLines[detailLines.length - 1];
        if (!last || !last.bold || !last.divider) {
            y = guard(doc, H, y, 14);

            const rawColor = hexToRgb(descLine.color || '#003366');
            const bandColor = darkenRgb(rawColor, 0.75);

            // Solid colored band
            doc.setFillColor(...bandColor);
            doc.rect(ML, y, CW, 10, 'F');

            // White value box on right
            doc.setFillColor(...WHITE);
            doc.rect(W - MR - 58, y + 1, 57, 8, 'F');

            if (descLine.label) {
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9.5);
                doc.setTextColor(...WHITE);
                doc.text(`= ${S(String(descLine.label))}`, ML + 5, y + 7);
            }
            if (descLine.value !== undefined) {
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(10);
                doc.setTextColor(...bandColor);
                doc.text(
                    S(addCommasToInfoValue(String(descLine.value))),
                    W - MR - 4, y + 7, { align: 'right' }
                );
            }
            y += 14;
        }
    }

    return y;
}

// ── Two-pass single-page generation ──────────────────────────────────────────
// Pass 1 renders into a very tall dummy doc to measure content height.
// Pass 2 creates a doc exactly as tall as needed, renders once more.
// Result: always a single-page PDF regardless of content length.

const MEASURE_H  = 3000; // tall enough to never page-break during measurement
const FOOTER_MM  = 16;   // footer band height
const PAGE_W_MM  = 210;

function makeDoc(heightMm) {
    const doc = new jsPDF({ unit: 'mm', format: [PAGE_W_MM, heightMm] });
    return { doc, W: PAGE_W_MM, H: heightMm, CW: PAGE_W_MM - ML - MR };
}

// ── Render bodies (shared by both passes) ─────────────────────────────────────

function _bodyInfo(doc, W, H, CW, sectionTitle, fieldLabel, info, filters, store) {
    let y = drawHeader(doc, W, sectionTitle, store);

    if (fieldLabel) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(...DK_TEXT);
        doc.text(S(fieldLabel), ML, y + 2);
        y += 9;
    }

    y = drawFilterBadge(doc, W, CW, filters, y);
    y += 6;

    doc.setDrawColor(...BORDER_CLR);
    doc.setLineWidth(0.3);
    doc.line(ML, y, W - MR, y);
    y += 6;

    y = renderInfoBlock(doc, W, H, CW, info, y);
    return y;
}

function _bodySection(doc, W, H, CW, title, visibleStats, infoMap, filters, store) {
    let y = drawHeader(doc, W, title, store);
    y = drawFilterBadge(doc, W, CW, filters, y);
    y += 6;

    // ── Summary table ─────────────────────────────────────────────────────
    y = drawColumnHeaders(doc, W, y);

    visibleStats.forEach((stat, idx) => {
        if (idx % 2 === 0) {
            doc.setFillColor(...LT_BG);
            doc.rect(ML, y - 4.5, CW, 9, 'F');
        }
        doc.setDrawColor(...BORDER_CLR);
        doc.setLineWidth(0.15);
        doc.line(ML, y + 4, W - MR, y + 4);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(...DK_TEXT);
        doc.text(S(stat.label) + ':', ML + 3, y);

        const isPercent = stat.label.includes('%') && typeof stat.value === 'number';
        const raw = stat.value;
        let valStr = raw === '' || raw === undefined || raw === null
            ? '-'
            : isPercent
                ? `${addCommasToInfoValue(Number(raw).toFixed(2))}%`
                : `SAR ${addCommasToInfoValue(Number(raw).toFixed(2))}`;

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...(stat.colorByValue && typeof raw === 'number'
            ? (raw >= 0 ? GREEN : RED)
            : DK_TEXT));
        doc.text(S(valStr), W - MR - 3, y, { align: 'right' });
        y += 9;
    });

    y += 2;
    doc.setDrawColor(...DARK_BLUE);
    doc.setLineWidth(0.6);
    doc.line(ML, y, W - MR, y);

    // ── Detailed breakdowns ───────────────────────────────────────────────
    const statsWithInfo = visibleStats.filter(s => infoMap[s.label]?.length > 0);

    if (statsWithInfo.length > 0) {
        y += 10;
        y = drawSectionBanner(doc, W, 'Detailed Breakdown', y);

        statsWithInfo.forEach((stat, sIdx) => {
            if (sIdx > 0) {
                y += 4;
                doc.setDrawColor(...BORDER_CLR);
                doc.setLineWidth(0.3);
                doc.line(ML, y, W - MR, y);
                y += 6;
            }

            const infoLines = infoMap[stat.label];
            const descLine  = infoLines[0] && !infoLines[0].divider && infoLines[0].bold ? infoLines[0] : null;
            const accentRgb = descLine?.color ? pdfSafeColor(descLine.color, true) : ACCENT_BLUE;

            doc.setFillColor(237, 242, 248);
            doc.rect(ML, y, CW, 10, 'F');
            doc.setFillColor(...accentRgb);
            doc.rect(ML, y, 3.5, 10, 'F');

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10.5);
            doc.setTextColor(...DK_TEXT);
            doc.text(S(stat.label), ML + 7, y + 7);

            const isPercent = stat.label.includes('%') && typeof stat.value === 'number';
            const raw = stat.value;
            let valStr = '';
            if (raw !== '' && raw !== undefined && raw !== null) {
                valStr = isPercent
                    ? `${addCommasToInfoValue(Number(raw).toFixed(2))}%`
                    : `SAR ${addCommasToInfoValue(Number(raw).toFixed(2))}`;
            }
            if (valStr) {
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(10);
                doc.setTextColor(...(stat.colorByValue && typeof raw === 'number'
                    ? (raw >= 0 ? GREEN : RED) : accentRgb));
                doc.text(S(valStr), W - MR - 4, y + 7, { align: 'right' });
            }

            y += 13;
            y = renderInfoBlock(doc, W, H, CW, infoLines, y, accentRgb);
            y += 3;
        });
    }

    return y;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Single-stat tooltip PDF (ℹ️ Download / Print / WhatsApp).
 * Always single-page — height auto-sized to content.
 */
export function generateInfoPdf(sectionTitle, fieldLabel, info, filters, store) {
    // Pass 1: measure content height (H=MEASURE_H so guard never fires)
    const { doc: d1, W, CW } = makeDoc(MEASURE_H);
    const finalY = _bodyInfo(d1, W, MEASURE_H, CW, sectionTitle, fieldLabel, info, filters, store);

    // Pass 2: create exact-height doc but STILL pass MEASURE_H to render body
    // so guard() never fires and all content stays on the single page.
    const pageH = Math.max(100, finalY + FOOTER_MM + 6);
    const { doc } = makeDoc(pageH);
    _bodyInfo(doc, W, MEASURE_H, CW, sectionTitle, fieldLabel, info, filters, store);
    drawFooter(doc, W, pageH);   // footer positioned at actual page bottom
    return doc;
}

/**
 * Full-section PDF (Download / Print / WhatsApp).
 * Always single-page — height auto-sized to content.
 */
export function generateSectionPdf(title, visibleStats, infoMap, filters, store) {
    // Pass 1: measure
    const { doc: d1, W, CW } = makeDoc(MEASURE_H);
    const finalY = _bodySection(d1, W, MEASURE_H, CW, title, visibleStats, infoMap, filters, store);

    // Pass 2: exact-height doc, render with MEASURE_H so guard never fires
    const pageH = Math.max(150, finalY + FOOTER_MM + 6);
    const { doc } = makeDoc(pageH);
    _bodySection(doc, W, MEASURE_H, CW, title, visibleStats, infoMap, filters, store);
    drawFooter(doc, W, pageH);
    return doc;
}
