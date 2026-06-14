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

    // Fix pie-chart tooltip vibration: Google Charts makes the tooltip container
    // interactive (pointer-events:auto) when isHtml:true, which causes hover-state
    // thrashing. Override the container to none, then restore auto only on our
    // named action/close elements.
    if (!document.getElementById('__ctt_style')) {
        const s = document.createElement('style');
        s.id = '__ctt_style';
        s.textContent = [
            '.google-visualization-tooltip { pointer-events: none !important; }',
            '.ctt-action { pointer-events: auto !important; }',
        ].join('\n');
        document.head.appendChild(s);
    }

    // ── Sticky tooltip logic ────────────────────────────────────────────────
    // Google Charts hides the tooltip the moment the mouse leaves a data point.
    // We use a MutationObserver to intercept that hide and keep the tooltip
    // visible for 5 s, giving the user time to reach the action buttons.

    let _stickyEl   = null;   // the tooltip element currently being kept alive
    let _allowed    = false;  // true → Google Charts is allowed to hide it
    let _patching   = false;  // re-entrancy guard

    function allowHide() {
        _allowed = true;
        if (_stickyEl) { _stickyEl.style.display = 'none'; }
        _stickyEl = null;
        clearTimeout(window.__cttTimer);
    }

    function keepAlive(el) {
        _allowed  = false;
        _stickyEl = el;
        clearTimeout(window.__cttTimer);
        window.__cttTimer = setTimeout(allowHide, 5000);
    }

    // Observe the whole document for tooltip style changes
    const _obs = new MutationObserver(muts => {
        if (_patching) return;
        for (const m of muts) {
            const el = m.target;
            if (!el.classList?.contains('google-visualization-tooltip')) continue;
            if (m.type !== 'attributes' || m.attributeName !== 'style') continue;

            if (el.style.display === 'none') {
                if (!_allowed && _stickyEl === el) {
                    // Prevent Google Charts from hiding — restore visible
                    _patching = true;
                    el.style.display = 'block';
                    _patching = false;
                }
            } else {
                // Tooltip just became visible (new hover)
                keepAlive(el);
            }
        }
    });
    _obs.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['style'] });

    // Also observe childList in case Google Charts recreates the element
    _obs.observe(document.body, { subtree: true, childList: true });

    window.__cttClose = () => {
        clearTimeout(window.__cttTimer);
        allowHide();
    };

    // Action-bar mouse events: reset 5 s timer while user is in the buttons area
    window.__cttEnter = () => {
        clearTimeout(window.__cttTimer);
        _allowed = false;
    };
    window.__cttLeave = () => {
        clearTimeout(window.__cttTimer);
        window.__cttTimer = setTimeout(allowHide, 5000);
    };

    // Click outside the tooltip → close immediately
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
