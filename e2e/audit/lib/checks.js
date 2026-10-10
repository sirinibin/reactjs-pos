// Page-level checks every persona runs on every screen it visits: layout (sideways
// overflow, controls off screen, tiny touch targets), translation gaps in Arabic,
// accessibility (axe-core WCAG 2.1 A/AA), console errors, failed API
// calls and how long the screen took. Browser-side functions are self-contained
// (page.evaluate); analyze* functions are pure and unit-tested.

// ---- runs in the browser -------------------------------------------------------
function collectScreen() {
  const W = innerWidth;
  const doc = document.documentElement;
  const vis = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return null;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) === 0) return null;
    return r;
  };
  const name = (el) =>
    (el.getAttribute("aria-label") || el.innerText || el.value || el.title || "").replace(/\s+/g, " ").trim().slice(0, 60);
  const inScroller = (el) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (/(auto|scroll|hidden|clip)/.test(cs.overflowX)) return true;
    }
    return false;
  };
  const controls = [];
  for (const el of document.querySelectorAll("button, a[href], input, select, textarea, [role=button], [role=tab]")) {
    const r = vis(el);
    if (!r) continue;
    controls.push({
      name: name(el),
      tag: el.tagName.toLowerCase(),
      x: Math.round(r.left),
      r: Math.round(r.right),
      w: Math.round(r.width),
      h: Math.round(r.height),
      scroller: inScroller(el),
      hidden: el.closest("[aria-hidden=true], [inert]") != null,
    });
  }
  // visible text that is still English while the page is Arabic
  const latin = [];
  if (doc.lang === "ar") {
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n && latin.length < 40; n = walk.nextNode()) {
      const t = n.nodeValue.replace(/\s+/g, " ").trim();
      if (t.length < 4 || !/[A-Za-z]{3,}/.test(t) || /[؀-ۿ]/.test(t)) continue;
      const p = n.parentElement;
      if (!p || p.closest("script,style,code,pre,[dir=ltr],[lang^=en],input,textarea,.mono,[translate=no]") || !vis(p)) continue;
      latin.push(t.slice(0, 80));
    }
  }
  const nav = performance.getEntriesByType("navigation")[0];
  return {
    url: location.href,
    lang: doc.lang,
    dir: doc.dir,
    width: W,
    scrollWidth: Math.max(doc.scrollWidth, document.body ? document.body.scrollWidth : 0),
    controls,
    latin,
    title: document.title,
    errorText: [...document.querySelectorAll("[role=alert], .alert-danger, .text-danger, .pw-err")]
      .map((e) => e.innerText.trim())
      .filter(Boolean)
      .slice(0, 5),
    domNodes: document.getElementsByTagName("*").length,
    loadMs: nav ? Math.round(nav.loadEventEnd || nav.domComplete || 0) : 0,
    jsHeapMb: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : 0,
  };
}

// ---- pure analysis --------------------------------------------------------------
const ALLOWED_LATIN = /^(?:[A-Z]{2,6}[-\s]?\d*|SAR|VAT|ZATCA|QR|POS|PDF|CSV|Excel|WhatsApp|StartERP|Start POS|StartPOS|E2E Admin|Email|iOS|Android|OK|ID|CR|IBAN|SKU|KG|PCS|ml|kg|pcs|https?:\/\/\S+|[\w.+-]+@[\w.-]+|ZZ AUDIT .*|audit-.*)$/;

function analyzeScreen(snap, { mobile = false } = {}) {
  const issues = [];
  if (snap.scrollWidth > snap.width + 2)
    issues.push({ severity: "medium", category: "layout", title: "Page scrolls sideways", detail: `content is ${snap.scrollWidth}px wide on a ${snap.width}px screen` });
  // partly on screen only: controls wholly off screen are closed drawers / off-canvas menus
  const off = snap.controls.filter(
    (c) => !c.scroller && !c.hidden && ((c.x < -2 && c.r > 8) || (c.r > snap.width + 2 && c.x < snap.width - 8)),
  );
  if (off.length)
    issues.push({
      severity: "medium",
      category: "layout",
      title: "Controls cut off at the screen edge",
      detail: off
        .slice(0, 6)
        .map((c) => `${c.tag}[${c.name}] at x ${c.x}..${c.r}`)
        .join("; "),
    });
  if (mobile) {
    const tiny = snap.controls.filter((c) => !c.hidden && c.tag !== "a" && (c.w < 24 || c.h < 24) && c.name);
    if (tiny.length >= 3)
      issues.push({
        severity: "low",
        category: "a11y",
        title: "Touch targets smaller than 24×24 px",
        detail: tiny
          .slice(0, 8)
          .map((c) => `${c.tag}[${c.name}] ${c.w}×${c.h}`)
          .join("; "),
      });
  }
  if (snap.lang === "ar") {
    const words = snap.latin.filter((t) => !ALLOWED_LATIN.test(t.trim()));
    if (snap.dir !== "rtl") issues.push({ severity: "high", category: "i18n", title: "Arabic page is not right-to-left", detail: `dir=${snap.dir}` });
    if (words.length >= 2)
      issues.push({ severity: "low", category: "i18n", title: "English text left on an Arabic screen", detail: words.slice(0, 10).join(" · ") });
  }
  if (snap.domNodes > 15000)
    issues.push({ severity: "low", category: "performance", title: "Very large page (DOM nodes)", detail: `${snap.domNodes} elements` });
  return issues;
}

// axe results -> issues (serious/critical only, like the a11y suite's gate)
function analyzeAxe(violations = []) {
  return violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => ({
      severity: v.impact === "critical" ? "high" : "medium",
      category: "a11y",
      title: `Accessibility: ${v.help}`,
      detail: `${v.id} (${v.impact}) on ${v.nodes.length} element(s): ${v.nodes
        .slice(0, 3)
        .map((n) => (n.target || []).join(" "))
        .join(" | ")}. ${v.helpUrl || ""}`,
    }));
}

// console noise we do not report: the fonts the harness never blocks, favicon misses
const IGNORE_CONSOLE = [/Failed to load resource: the server responded with a status of/i, /favicon/i, /Download the React DevTools/i, /net::ERR_BLOCKED_BY_CLIENT/i, /net::ERR_INTERNET_DISCONNECTED/i, /Error fetching IP/i, /api\.ipify\.org/i, /ERR_TUNNEL_CONNECTION_FAILED|ERR_NAME_NOT_RESOLVED/i];

function analyzeConsole(messages = []) {
  const out = [];
  const seen = new Set();
  for (const m of messages) {
    if (IGNORE_CONSOLE.some((r) => r.test(m.text))) continue;
    const key = m.text.replace(/\d+/g, "#").slice(0, 160);
    if (seen.has(key)) continue;
    seen.add(key);
    // the app logs every handled API refusal with console.error("There was an error!", errors)
    const handled = /^There was an error!/.test(m.text);
    out.push({
      severity: m.type === "pageerror" ? "high" : handled ? "low" : "medium",
      category: "console",
      title: m.type === "pageerror" ? "Uncaught error in the page" : handled ? "Handled API error logged to the console" : "Console error",
      detail: m.text.slice(0, 600),
    });
  }
  return out;
}

// API failures: 5xx always; 4xx except the ones the scenario expected (validation, 403s it provoked)
function analyzeNetwork(responses = [], { expected = [] } = {}) {
  const out = [];
  for (const r of responses) {
    if (r.status < 400) continue;
    if (expected.some((e) => (e.status ? e.status === r.status : true) && (e.path ? e.path.test(r.path) : true))) continue;
    out.push({
      severity: r.status >= 500 ? "high" : r.status === 401 ? "medium" : "low",
      category: "network",
      title: `API ${r.status} on ${r.method} ${r.path.replace(/\/[0-9a-f]{24}/g, "/:id")}`,
      detail: (r.body || "").slice(0, 500),
    });
  }
  return out;
}


module.exports = { collectScreen, analyzeScreen, analyzeAxe, analyzeConsole, analyzeNetwork };
