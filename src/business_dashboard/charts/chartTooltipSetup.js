import { generateInfoPdf, safeName } from '../../utils/pdfGenerator';
import { uploadPdfForShare } from '../../utils/pdfShare';

// Module-level store shared across all chart files (ES module singleton)
let _key = 0;
const _store = {};

function storeData(data) {
    _key += 1;
    _store[_key] = data;
    return _key;
}

// Set up global handlers once
if (typeof window !== 'undefined' && !window.__cttReady) {
    window.__cttReady = true;

    // ── Global CSS ──────────────────────────────────────────────────────────
    // 1. pointer-events:none on the tooltip container stops pie-chart vibration
    //    (the hover-detection loop Google Charts creates when isHtml:true).
    // 2. .__ctt_pinned keeps the tooltip visible via CSS !important — this
    //    beats Google Charts' inline el.style.display='none' without any fight.
    // 3. .ctt-action restores pointer-events so buttons are clickable.
    if (!document.getElementById('__ctt_style')) {
        const s = document.createElement('style');
        s.id = '__ctt_style';
        s.textContent = [
            '.google-visualization-tooltip { pointer-events: none !important; }',
            '.google-visualization-tooltip.__ctt_pinned {',
            '  display: block !important;',
            '  visibility: visible !important;',
            '  opacity: 1 !important;',
            '}',
            '.ctt-action { pointer-events: auto !important; }',
        ].join('\n');
        document.head.appendChild(s);
    }

    // ── Sticky-tooltip state ────────────────────────────────────────────────
    let _pinEl = null;

    function pinTooltip(el) {
        if (_pinEl && _pinEl !== el) unpinTooltip(_pinEl);
        _pinEl = el;
        el.classList.add('__ctt_pinned');
        clearTimeout(window.__cttTimer);
        window.__cttTimer = setTimeout(() => unpinTooltip(el), 5000);
    }

    function unpinTooltip(el) {
        if (el) el.classList.remove('__ctt_pinned');
        if (_pinEl === el) _pinEl = null;
        clearTimeout(window.__cttTimer);
    }

    // MutationObserver fires AFTER all mutations in the current task complete,
    // so if Google Charts shows+hides the tooltip in one event handler we only
    // see the hidden state. Instead, poll on every mousemove — fast enough to
    // pin the tooltip before it becomes invisible to the user.
    document.addEventListener('mousemove', () => {
        const els = document.querySelectorAll('.google-visualization-tooltip');
        els.forEach(el => {
            if (window.getComputedStyle(el).display !== 'none' &&
                !el.classList.contains('__ctt_pinned')) {
                pinTooltip(el);
            }
        });
    }, { passive: true });

    window.__cttClose = () => {
        if (_pinEl) unpinTooltip(_pinEl);
    };

    // Action-bar: cancel the countdown while the user is over the buttons
    window.__cttEnter = () => clearTimeout(window.__cttTimer);
    window.__cttLeave = () => {
        clearTimeout(window.__cttTimer);
        if (_pinEl) {
            const el = _pinEl;
            window.__cttTimer = setTimeout(() => unpinTooltip(el), 5000);
        }
    };

    // Click outside the tooltip → unpin immediately
    document.addEventListener('mousedown', e => {
        if (!e.target.closest('.google-visualization-tooltip')) {
            window.__cttClose();
        }
    });

    window.__cttPrint = key => {
        const d = _store[key];
        if (!d) return;
        try {
            const doc = generateInfoPdf('', d.title, null, d.lines, d.filters, d.store);
            doc.autoPrint();
            doc.output('dataurlnewwindow');
        } catch (e) { console.error('Chart tooltip print:', e); }
    };

    window.__cttPDF = key => {
        const d = _store[key];
        if (!d) return;
        try {
            const doc = generateInfoPdf('', d.title, null, d.lines, d.filters, d.store);
            doc.save(`${safeName(d.title)}.pdf`);
        } catch (e) { console.error('Chart tooltip PDF:', e); }
    };

    window.__cttWA = async key => {
        const d = _store[key];
        if (!d) return;
        try {
            const doc = generateInfoPdf('', d.title, null, d.lines, d.filters, d.store);
            const url = await uploadPdfForShare(doc.output('blob'), `${safeName(d.title)}.pdf`);
            const msg = `Hello, here is the chart: ${d.title}\n${url}`;
            let tauriShell = null;
            try {
                let w = window;
                while (w) {
                    if (w.__TAURI__?.shell?.open) { tauriShell = w.__TAURI__.shell; break; }
                    if (w === w.parent) break;
                    w = w.parent;
                }
            } catch (_) {}
            const waUrl = `https://wa.me?text=${encodeURIComponent(msg)}`;
            if (tauriShell) await tauriShell.open(waUrl);
            else window.open(waUrl, '_blank');
        } catch (e) { console.error('Chart tooltip WA:', e); }
    };
}

const D  = '#495057';
const BG = '#212529';
const BTN = 'background:none;border:1px solid rgba(255,255,255,0.25);color:#f8f9fa;' +
            'border-radius:4px;cursor:pointer;font-size:0.68rem;padding:2px 8px;';
const BTN_GREEN = 'background:none;border:1px solid #28a745;color:#28a745;' +
                  'border-radius:4px;cursor:pointer;font-size:0.68rem;padding:2px 8px;';

export function onChartSelect() {
    setTimeout(() => {
        const els = document.querySelectorAll('.google-visualization-tooltip');
        els.forEach(el => {
            const style = window.getComputedStyle(el);
            if (style.display !== 'none' && style.visibility !== 'hidden') {
                el.classList.add('__ctt_pinned');
                clearTimeout(window.__cttTimer);
                window.__cttTimer = setTimeout(() => {
                    el.classList.remove('__ctt_pinned');
                }, 5000);
            }
        });
    }, 50);
}

export function tooltipHtml(title, titleColor, lines, store, filters) {
    const key = storeData({ title, lines, store: store || {}, filters: filters || {} });

    // The .google-visualization-tooltip container has pointer-events:none injected
    // via global CSS above, so no pie-chart vibration.  Only .ctt-action children
    // restore pointer-events:auto so buttons remain clickable.
    let html = `<div style="background:${BG};color:#f8f9fa;`
        + `padding:10px 14px 8px 14px;border-radius:6px;`
        + `box-shadow:0 4px 14px rgba(0,0,0,.45);min-width:230px;">`;

    // ── Header (title + close ×) ────────────────────────────────────────────
    html += `<div style="display:flex;justify-content:space-between;align-items:center;`
          + `margin-bottom:6px;border-bottom:1px solid ${D};padding-bottom:5px;">`;
    html += `<span style="font-size:0.8rem;font-weight:700;color:${titleColor};">${title}</span>`;
    html += `<button class="ctt-action" onclick="event.stopPropagation();window.__cttClose()" `
          + `style="${BTN}padding:0 6px;font-size:1rem;line-height:1.2;" title="Close">&#215;</button>`;
    html += `</div>`;

    // ── Data table ──────────────────────────────────────────────────────────
    html += `<table style="width:100%;border-collapse:collapse;font-size:0.75rem;"><tbody>`;
    lines.forEach(l => {
        const bt    = l.divider ? `border-top:1px solid ${D};` : '';
        const pt    = l.divider ? '6px' : '1px';
        const pb    = l.divider ? '2px' : '1px';
        const fw    = l.bold ? 'font-weight:700;' : '';
        const color = l.color || '#f8f9fa';
        html += `<tr style="${bt}">`;
        html += `<td style="color:#adb5bd;white-space:nowrap;padding:${pt} 12px ${pb} 0;vertical-align:top;">`
              + `${l.label || ''}</td>`;
        html += `<td style="text-align:right;white-space:nowrap;${fw}color:${color};`
              + `padding:${pt} 0 ${pb} 0;">${l.value}</td>`;
        html += `</tr>`;
    });
    html += `</tbody></table>`;

    // ── Action bar — .ctt-action restores pointer-events:auto via CSS ──────
    html += `<div class="ctt-action" style="display:flex;gap:5px;`
          + `padding:6px 0 0 0;border-top:1px solid ${D};margin-top:5px;justify-content:flex-end;"`
          + ` onmouseenter="window.__cttEnter()" onmouseleave="window.__cttLeave()">`;
    html += `<button class="ctt-action" onclick="event.stopPropagation();window.__cttPrint(${key})" `
          + `style="${BTN}" title="Print">Print</button>`;
    html += `<button class="ctt-action" onclick="event.stopPropagation();window.__cttPDF(${key})" `
          + `style="${BTN}" title="Download PDF">PDF</button>`;
    html += `<button class="ctt-action" onclick="event.stopPropagation();window.__cttWA(${key})" `
          + `style="${BTN_GREEN}" title="Share via WhatsApp">Share</button>`;
    html += `</div>`;

    html += `</div>`;
    return html;
}
