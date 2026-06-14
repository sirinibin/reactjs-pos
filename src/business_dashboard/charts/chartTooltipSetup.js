import { generateInfoPdf, safeName } from '../../utils/pdfGenerator';
import { uploadPdfForShare } from '../../utils/pdfShare';

// ── Tooltip data store + chart registry ──────────────────────────────────────
// Both stored on window so they survive HMR re-evaluations.
if (typeof window !== 'undefined') {
    if (!window.__cttStore)  { window.__cttStore = {};  window.__cttKey = 0; }
    if (!window.__cttCharts) { window.__cttCharts = new Set(); }
}

function storeData(data) {
    window.__cttKey = (window.__cttKey || 0) + 1;
    window.__cttStore[window.__cttKey] = data;
    return window.__cttKey;
}

// ── Handler installation ──────────────────────────────────────────────────────
// No window.__cttReady guard — always reinstall so HMR picks up the latest code.
// window.__cttCleanup() tears down the previous run before installing fresh ones.
if (typeof window !== 'undefined') {

    if (typeof window.__cttCleanup === 'function') window.__cttCleanup();

    // ── Global CSS (injected once) ────────────────────────────────────────────
    if (!document.getElementById('__ctt_style')) {
        const s = document.createElement('style');
        s.id = '__ctt_style';
        s.textContent = [
            // Prevent pie-chart hover-vibration loop
            '.google-visualization-tooltip { pointer-events: none !important; }',
            // Keep tooltip visible while pinned — beats GC's inline display:none
            '.google-visualization-tooltip.__ctt_pinned {',
            '  display: block !important;',
            '  visibility: visible !important;',
            '  opacity: 1 !important;',
            '}',
            // Restore pointer-events for interactive elements inside the tooltip
            '.ctt-action { pointer-events: auto !important; }',
        ].join('\n');
        document.head.appendChild(s);
    }

    // ── State ─────────────────────────────────────────────────────────────────
    let _mouseX = 0;
    let _mouseY = 0;
    // Suppress re-pinning briefly after an explicit close so the tooltip
    // doesn't reappear the moment the mouse moves near the chart again.
    let _suppressUntil = 0;

    // ── Helpers ───────────────────────────────────────────────────────────────
    function getPinnedEl() {
        return document.querySelector('.google-visualization-tooltip.__ctt_pinned');
    }

    function isMouseOverEl(el) {
        if (!el) return false;
        const r = el.getBoundingClientRect();
        return _mouseX >= r.left && _mouseX <= r.right
            && _mouseY >= r.top  && _mouseY <= r.bottom;
    }

    // Only tooltips that contain our custom action buttons should be pinned.
    // This prevents GC's native default tooltips (e.g. TimingCharts) from
    // being incorrectly pinned by our system.
    function hasCustomContent(el) {
        return !!el.querySelector('[data-ctt-action]');
    }

    function forceHideAll() {
        document.querySelectorAll('.google-visualization-tooltip').forEach(el => {
            el.classList.remove('__ctt_pinned');
            if (el.style.display !== 'none') el.style.display = 'none';
        });
    }

    // ── Auto-close scheduler ──────────────────────────────────────────────────
    // Fires after `delay` ms. If the mouse is still over the tooltip body,
    // reschedules 1 s later. Otherwise calls window.__cttClose() which
    // force-hides + suppresses so the MO cannot immediately re-pin the tooltip.
    function scheduleAutoClose(delay) {
        clearTimeout(window.__cttTimer);
        window.__cttTimer = setTimeout(() => {
            const el = getPinnedEl();
            if (!el) return;
            if (isMouseOverEl(el)) {
                scheduleAutoClose(1000);
            } else {
                window.__cttClose();
            }
        }, delay);
    }

    // ── Public API ────────────────────────────────────────────────────────────
    window.__cttClose = () => {
        clearTimeout(window.__cttTimer);
        _suppressUntil = Date.now() + 600;
        forceHideAll();
        // Clear GC's selection so the tooltip doesn't reappear on hover
        // for the previously-selected data point.
        window.__cttCharts.forEach(c => { try { c.setSelection([]); } catch (_) {} });
    };

    window.__cttEnter = () => clearTimeout(window.__cttTimer);
    window.__cttLeave = () => scheduleAutoClose(5000);

    // ── MutationObserver: pin / suppress ─────────────────────────────────────
    // Observes style/class changes on .google-visualization-tooltip elements.
    // MO fires after each browser task — after GC sets display:block on show,
    // and after GC sets display:none on hide. This is more reliable than
    // mousemove for detecting the tooltip becoming visible.
    const _mo = new MutationObserver(mutations => {
        const relevant = mutations.some(m => {
            if (m.type === 'attributes' &&
                m.target.classList?.contains('google-visualization-tooltip')) return true;
            if (m.type === 'childList') {
                for (const n of m.addedNodes) {
                    if (n.classList?.contains('google-visualization-tooltip')) return true;
                }
            }
            return false;
        });
        if (!relevant) return;

        if (Date.now() < _suppressUntil) {
            // During suppression window: fight GC trying to re-show the tooltip
            forceHideAll();
            return;
        }

        // Pin any newly visible unpinned tooltip that has our custom content
        document.querySelectorAll('.google-visualization-tooltip').forEach(el => {
            if (window.getComputedStyle(el).display !== 'none' &&
                !el.classList.contains('__ctt_pinned') &&
                hasCustomContent(el)) {
                el.classList.add('__ctt_pinned');
                scheduleAutoClose(5000);
            }
        });
    });

    _mo.observe(document.body, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ['style', 'class'],
    });

    // ── mousemove: track cursor + backup pin detection ────────────────────────
    function _onMouseMove(e) {
        _mouseX = e.clientX;
        _mouseY = e.clientY;
        if (Date.now() < _suppressUntil) return;
        document.querySelectorAll('.google-visualization-tooltip').forEach(el => {
            if (window.getComputedStyle(el).display !== 'none' &&
                !el.classList.contains('__ctt_pinned') &&
                hasCustomContent(el)) {
                el.classList.add('__ctt_pinned');
                scheduleAutoClose(5000);
            }
        });
    }

    // ── mousedown: button actions + click-outside ────────────────────────────
    // Using mousedown (not click) because Google Charts intercepts and stops
    // click-event propagation before it reaches document. mousedown is not
    // stopped by GC and is also how click-outside already works.
    // Note: clicking the close button works even when the mouse is over the
    // tooltip body — the "don't close" rule only applies to the auto-close timer.
    function _onMouseDown(e) {
        // Check for a tooltip action button first
        const btn = e.target.closest('[data-ctt-action]');
        if (btn) {
            e.stopPropagation();
            const action = btn.dataset.cttAction;
            const key    = parseInt(btn.dataset.cttKey, 10);
            switch (action) {
                case 'close': window.__cttClose(); break;
                case 'print': window.__cttPrint && window.__cttPrint(key); break;
                case 'pdf':   window.__cttPDF   && window.__cttPDF(key);   break;
                case 'wa':    window.__cttWA    && window.__cttWA(key);    break;
                default: break;
            }
            return;
        }
        // Not a button — close if the click landed outside the tooltip AND
        // there is currently a pinned tooltip (avoid suppressing a fresh open).
        if (!e.target.closest('.google-visualization-tooltip') && getPinnedEl()) {
            window.__cttClose();
        }
    }

    document.addEventListener('mousemove', _onMouseMove, { passive: true });
    document.addEventListener('mousedown', _onMouseDown);

    // ── PDF / Print / WhatsApp ────────────────────────────────────────────────
    window.__cttPrint = key => {
        const d = window.__cttStore[key];
        if (!d) return;
        try {
            const doc = generateInfoPdf('', d.title, null, d.lines, d.filters, d.store);
            doc.autoPrint();
            doc.output('dataurlnewwindow');
        } catch (err) { console.error('Chart tooltip print:', err); }
    };

    window.__cttPDF = key => {
        const d = window.__cttStore[key];
        if (!d) return;
        try {
            const doc = generateInfoPdf('', d.title, null, d.lines, d.filters, d.store);
            doc.save(`${safeName(d.title)}.pdf`);
        } catch (err) { console.error('Chart tooltip PDF:', err); }
    };

    window.__cttWA = async key => {
        const d = window.__cttStore[key];
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
        } catch (err) { console.error('Chart tooltip WA:', err); }
    };

    // ── Cleanup (called on next HMR re-evaluation) ────────────────────────────
    window.__cttCleanup = () => {
        document.removeEventListener('mousemove', _onMouseMove);
        document.removeEventListener('mousedown', _onMouseDown);
        _mo.disconnect();
        clearTimeout(window.__cttTimer);
    };
}

// ── Tooltip HTML builder ──────────────────────────────────────────────────────
const D       = '#495057';
const BG      = '#212529';
const BTN     = 'background:none;border:1px solid rgba(255,255,255,0.25);color:#f8f9fa;' +
                'border-radius:4px;cursor:pointer;font-size:0.68rem;padding:2px 8px;';
const BTN_GRN = 'background:none;border:1px solid #28a745;color:#28a745;' +
                'border-radius:4px;cursor:pointer;font-size:0.68rem;padding:2px 8px;';

// Called by chart files via chartEvents: [{ eventName: 'select', callback: onChartSelect }].
// Registers the chart instance so window.__cttClose() can clear its selection on close,
// preventing the tooltip from reappearing on hover for the still-selected data point.
export function onChartSelect({ chartWrapper } = {}) {
    try {
        const chart = chartWrapper?.getChart?.();
        if (chart && window.__cttCharts) window.__cttCharts.add(chart);
    } catch (_) {}
}

export function tooltipHtml(title, titleColor, lines, store, filters) {
    const key = storeData({ title, lines, store: store || {}, filters: filters || {} });

    let html = `<div style="background:${BG};color:#f8f9fa;`
        + `padding:10px 14px 8px 14px;border-radius:6px;`
        + `box-shadow:0 4px 14px rgba(0,0,0,.45);min-width:230px;">`;

    // Header — close button uses data-ctt-action (onclick= may be stripped by GC)
    html += `<div style="display:flex;justify-content:space-between;align-items:center;`
          + `margin-bottom:6px;border-bottom:1px solid ${D};padding-bottom:5px;">`;
    html += `<span style="font-size:0.8rem;font-weight:700;color:${titleColor};">${title}</span>`;
    html += `<button class="ctt-action" data-ctt-action="close"`
          + ` style="${BTN}padding:0 6px;font-size:1rem;line-height:1.2;" title="Close">&#215;</button>`;
    html += `</div>`;

    // Data table
    html += `<table style="width:100%;border-collapse:collapse;font-size:0.75rem;"><tbody>`;
    lines.forEach(l => {
        const bt    = l.divider ? `border-top:1px solid ${D};` : '';
        const pt    = l.divider ? '6px' : '1px';
        const pb    = l.divider ? '2px' : '1px';
        const fw    = l.bold ? 'font-weight:700;' : '';
        const color = l.color || '#f8f9fa';
        const sv    = String(l.value ?? '').trim();
        const isNum = /^[+\-−\d]/.test(sv) || /^SAR\s/i.test(sv);
        html += `<tr style="${bt}">`;
        html += `<td style="color:#adb5bd;white-space:nowrap;padding:${pt} 12px ${pb} 0;vertical-align:top;">`
              + `${l.label || ''}</td>`;
        html += `<td style="text-align:${isNum ? 'right' : 'left'};white-space:nowrap;`
              + `${fw}color:${color};padding:${pt} 0 ${pb} 0;">${l.value}</td>`;
        html += `</tr>`;
    });
    html += `</tbody></table>`;

    // Action bar — all buttons use data-ctt-* (onclick= sanitization-safe)
    html += `<div class="ctt-action" style="display:flex;gap:5px;`
          + `padding:6px 0 0 0;border-top:1px solid ${D};margin-top:5px;justify-content:flex-end;">`;
    html += `<button class="ctt-action" data-ctt-action="print" data-ctt-key="${key}"`
          + ` style="${BTN}" title="Print">Print</button>`;
    html += `<button class="ctt-action" data-ctt-action="pdf" data-ctt-key="${key}"`
          + ` style="${BTN}" title="Download PDF">PDF</button>`;
    html += `<button class="ctt-action" data-ctt-action="wa" data-ctt-key="${key}"`
          + ` style="${BTN_GRN}" title="Share via WhatsApp">Share</button>`;
    html += `</div>`;

    html += `</div>`;
    return html;
}
