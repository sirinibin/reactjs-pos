import jsPDF from 'jspdf';
import { addCommasToInfoValue, stripSarBreakdown } from './numberUtils';

// ── Page constants ────────────────────────────────────────────────────────────
const PAGE_W  = 210;   // A4 portrait width  (mm)
const PAGE_H  = 297;   // A4 portrait height (mm)
const ML      = 15;    // left margin
const MR      = 15;    // right margin
const MT      = 15;    // top margin
const MB      = 15;    // bottom margin (footer area)
const CW      = PAGE_W - ML - MR;   // 180 mm usable width
const FOOTER_Y = PAGE_H - MB;

// ── Helpers ───────────────────────────────────────────────────────────────────
export function safeName(str) {
    return String(str ?? '')
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
}

function S(str) {
    if (typeof str !== 'string') return String(str ?? '');
    return str
        .replace(/[−–—]/g, '-')
        .replace(/[""]/g, '"')
        .replace(/['']/g, "'");
}

function makeDoc() {
    return new jsPDF({ unit: 'mm', format: 'a4' });
}

// Add a new page and return the starting y position.
function newPage(doc) {
    doc.addPage();
    return MT;
}

// If adding `need` mm would overflow the page, start a new page.
function guard(doc, y, need = 8) {
    if (y + need > FOOTER_Y - 5) return newPage(doc);
    return y;
}

// ── Header ────────────────────────────────────────────────────────────────────
function drawHeader(doc, title, store) {
    let y = MT;

    // Store name
    const storeName = store?.name ? S(store.name) : '';
    if (storeName) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(0, 0, 0);
        doc.text(storeName, ML, y + 6);
        y += 9;
    }

    // Additional store info (branch, VAT, address) on one line
    const parts = [
        store?.branch_name,
        store?.vat_no  ? `VAT: ${store.vat_no}` : '',
        store?.address,
    ].filter(Boolean).map(S);
    if (parts.length) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(80, 80, 80);
        doc.text(parts.join('   ·   '), ML, y + 4);
        y += 7;
    }

    // Report title (centered) — omitted when title is blank
    if (title) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(S(title).toUpperCase(), PAGE_W / 2, y + 6, { align: 'center' });
    }

    // Generated date (right-aligned, same line)
    const today = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date());
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${today}`, PAGE_W - MR, y + 6, { align: 'right' });

    y += 10;

    // Separator
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.4);
    doc.line(ML, y, PAGE_W - MR, y);

    return y + 5;
}

// ── Filters ───────────────────────────────────────────────────────────────────
function drawFilters(doc, filters, y) {
    const active = Object.entries(filters || {})
        .filter(([, v]) => v !== undefined && v !== null && v !== '');
    if (!active.length) return y;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(60, 60, 60);
    doc.text(
        'Period:  ' + active.map(([k, v]) => `${k}: ${v}`).join('    |    '),
        ML, y
    );
    return y + 7;
}

// ── Section title bar ─────────────────────────────────────────────────────────
function drawSectionTitle(doc, text, y) {
    doc.setFillColor(230, 230, 230);
    doc.rect(ML, y, CW, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(0, 0, 0);
    doc.text(S(text), ML + 2, y + 5);
    return y + 10;
}

// ── Column header row ─────────────────────────────────────────────────────────
function drawColumnHeaders(doc, y, small = false) {
    const h  = small ? 5.5 : 7;
    const fs = small ? 7   : 9;
    const ty = small ? y + 3.8 : y + 5;
    doc.setFillColor(210, 210, 210);
    doc.rect(ML, y, CW, h, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(fs);
    doc.setTextColor(0, 0, 0);
    doc.text('DESCRIPTION', ML + 2, ty);
    doc.text('AMOUNT', PAGE_W - MR - 2, ty, { align: 'right' });
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.line(ML, y + h, PAGE_W - MR, y + h);
    return y + h + 3;
}

// ── Data row ──────────────────────────────────────────────────────────────────
const ROW_H       = 7;
const ROW_H_SMALL = 5.5;

function drawRow(doc, label, value, y, isTotal, small = false) {
    const rowH = small ? ROW_H_SMALL : ROW_H;
    const ty   = small ? y + 3.8     : y + 5;

    if (isTotal) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(small ? 8 : 9.5);
        doc.setTextColor(0, 0, 0);
        doc.setFillColor(240, 240, 240);
        doc.rect(ML, y, CW, rowH, 'F');
    } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(small ? 7.5 : 9);
        doc.setTextColor(30, 30, 30);
    }

    if (label !== undefined && label !== '') {
        doc.text(S(String(label)) + ':', ML + 2, ty);
    }

    if (value !== undefined && value !== null) {
        const valStr = S(stripSarBreakdown(addCommasToInfoValue(String(value)), isTotal));
        doc.text(valStr, PAGE_W - MR - 2, ty, { align: 'right' });
    }

    // Thin rule
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.1);
    doc.line(ML, y + rowH, PAGE_W - MR, y + rowH);

    return y + rowH;
}

// ── Footer on every page ──────────────────────────────────────────────────────
function drawFooter(doc) {
    const n = doc.getNumberOfPages();
    for (let i = 1; i <= n; i++) {
        doc.setPage(i);
        doc.setDrawColor(150, 150, 150);
        doc.setLineWidth(0.3);
        doc.line(ML, FOOTER_Y - 3, PAGE_W - MR, FOOTER_Y - 3);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        doc.text('Generated by StartPos', ML, FOOTER_Y + 2);
        doc.text(`Page ${i} of ${n}`, PAGE_W / 2, FOOTER_Y + 2, { align: 'center' });
        doc.text('Confidential', PAGE_W - MR, FOOTER_Y + 2, { align: 'right' });
    }
}

// ── Render an info breakdown block ────────────────────────────────────────────
function renderInfoLines(doc, lines, y, small = false) {
    if (!Array.isArray(lines) || !lines.length) return y;

    const descLine = lines[0] && !lines[0].divider && lines[0].bold ? lines[0] : null;
    const detail   = descLine ? lines.slice(1) : lines;
    const rowH     = small ? ROW_H_SMALL : ROW_H;

    // "What it is" description
    if (descLine && descLine.value) {
        y = guard(doc, y, 12);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(small ? 7 : 8.5);
        doc.setTextColor(60, 60, 60);
        const wrapped = doc.splitTextToSize(S(String(descLine.value)), CW - 4);
        doc.text(wrapped, ML + 2, y + (small ? 3 : 4));
        y += wrapped.length * (small ? 4 : 5) + (small ? 3 : 4);
        doc.setDrawColor(160, 160, 160);
        doc.setLineWidth(0.2);
        doc.line(ML, y, PAGE_W - MR, y);
        y += small ? 3 : 4;
    }

    // Detail rows
    detail.forEach((line) => {
        if (!line.label && line.value === undefined) return;

        // Pure divider (no content)
        if (line.divider && !line.label && line.value === undefined) {
            doc.setDrawColor(160, 160, 160);
            doc.setLineWidth(0.2);
            doc.line(ML, y, PAGE_W - MR, y);
            y += small ? 2 : 3;
            return;
        }

        // Bold + grey background only when BOTH bold AND divider are set (total/summary rows).
        // divider-only rows (e.g. "Gross Sales", "Net Revenue") get a thin separator line
        // but are rendered in normal weight.
        const isTotal = !!(line.bold && line.divider);

        if (line.divider && !isTotal) {
            doc.setDrawColor(160, 160, 160);
            doc.setLineWidth(0.2);
            doc.line(ML, y, PAGE_W - MR, y);
            y += small ? 1.5 : 2;
        }

        y = guard(doc, y, rowH + 1);
        y = drawRow(doc, line.label, line.value, y, isTotal, small);
    });

    return y;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Tooltip info PDF — one stat with its breakdown.
 * fieldValue: current numeric value shown prominently under the field title.
 */
export function generateInfoPdf(sectionTitle, fieldLabel, fieldValue, info, filters, store) {
    const doc = makeDoc();
    let y = drawHeader(doc, sectionTitle, store);
    y = drawFilters(doc, filters, y);

    // Field label bar
    y = guard(doc, y, 20);
    y = drawSectionTitle(doc, fieldLabel, y);

    // Headline value — accepts a raw number (auto-formatted) or a pre-formatted string
    if (fieldValue !== undefined && fieldValue !== null && fieldValue !== '') {
        const raw = Number(fieldValue);
        let valStr;
        if (!isNaN(raw)) {
            const isPercent = typeof fieldLabel === 'string' &&
                fieldLabel.includes('%') && !/\d\s*%/.test(fieldLabel);
            valStr = isPercent
                ? `${addCommasToInfoValue(raw.toFixed(2))}%`
                : `SAR ${addCommasToInfoValue(raw.toFixed(2))}`;
        } else {
            valStr = String(fieldValue);  // already formatted (e.g. "5.25%", "150")
        }
        if (valStr) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            doc.setTextColor(0, 0, 0);
            doc.text(S(valStr), PAGE_W - MR, y + 6, { align: 'right' });
            y += 12;
        }
    }

    // Breakdown table
    if (Array.isArray(info) && info.length > 0) {
        y = guard(doc, y, 15);
        y += 2;
        y = drawColumnHeaders(doc, y);
        y = renderInfoLines(doc, info, y);
    }

    drawFooter(doc);
    return doc;
}

/**
 * Full-section PDF — summary table + per-stat breakdowns.
 */
export function generateSectionPdf(title, visibleStats, infoMap, filters, store) {
    const doc = makeDoc();
    let y = drawHeader(doc, title, store);
    y = drawFilters(doc, filters, y);

    // Summary table
    y = guard(doc, y, 20);
    y = drawColumnHeaders(doc, y);

    visibleStats.forEach((stat) => {
        y = guard(doc, y, ROW_H + 1);
        const raw = stat.value;
        const isPercent = typeof stat.label === 'string' &&
            stat.label.includes('%') && !/\d\s*%/.test(stat.label) &&
            typeof raw === 'number';
        const valStr = (raw === '' || raw === undefined || raw === null)
            ? '—'
            : isPercent
                ? `${addCommasToInfoValue(Number(raw).toFixed(2))}%`
                : `SAR ${addCommasToInfoValue(Number(raw).toFixed(2))}`;
        y = drawRow(doc, stat.label, valStr, y, !!stat.bold);
        if (stat.sub) {
            y = guard(doc, y, 6);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(120, 120, 120);
            doc.text(S(stat.sub), PAGE_W - MR, y + 1, { align: 'right' });
            y += 5;
            doc.setTextColor(0, 0, 0);
        }
    });

    // Detailed breakdowns
    const withInfo = visibleStats.filter(s => (infoMap[s.label] || []).length > 0);
    if (withInfo.length > 0) {
        y += 8;

        withInfo.forEach((stat) => {
            y = guard(doc, y, 25);
            y = drawSectionTitle(doc, stat.label, y);

            // Stat headline value (smaller than main table)
            const raw = stat.value;
            if (raw !== '' && raw !== undefined && raw !== null) {
                const isPercent = typeof stat.label === 'string' &&
                    stat.label.includes('%') && !/\d\s*%/.test(stat.label) &&
                    typeof raw === 'number';
                const valStr = isPercent
                    ? `${addCommasToInfoValue(Number(raw).toFixed(2))}%`
                    : `SAR ${addCommasToInfoValue(Number(raw).toFixed(2))}`;
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                doc.setTextColor(0, 0, 0);
                doc.text(S(valStr), PAGE_W - MR, y + 4, { align: 'right' });
                y += 7;
            }

            // Breakdown — smaller size than main statement table
            y = guard(doc, y, 12);
            y = drawColumnHeaders(doc, y, true);
            y = renderInfoLines(doc, infoMap[stat.label] || [], y, true);
            y += 6;
        });
    }

    drawFooter(doc);
    return doc;
}
