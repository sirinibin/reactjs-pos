// LLM explorer: after the scripted day, Claude drives the same browser as the persona
// for a few steps, looking for what scripts miss (confusing screens, dead ends,
// wrong numbers, missing translations). It sees a screenshot plus a numbered list of the
// controls on screen and answers with one action and any findings, as JSON.
//
// The store guard still checks every request it causes, navigation is limited to the
// app's own /dashboard/... screens, and the API key only ever comes from the
// ANTHROPIC_API_KEY environment variable.
const { SEVERITIES, CATEGORIES } = require("./findings");

// controls the explorer may never press: they would end the persona's session or touch
// the account itself
const OFF_LIMITS = /log ?out|sign ?out|تسجيل الخروج|خروج|delete (store|account)|close account|حذف (المتجر|الحساب)/i;

const ACTIONS = ["click", "fill", "select", "press", "goto", "back", "done"];

const DECISION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["thought", "action", "findings"],
  properties: {
    thought: { type: "string" },
    action: {
      type: "object",
      additionalProperties: false,
      required: ["type", "index", "value"],
      properties: {
        type: { type: "string", enum: ACTIONS },
        index: { type: "integer" },
        value: { type: "string" },
      },
    },
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["severity", "category", "title", "detail"],
        properties: {
          severity: { type: "string", enum: SEVERITIES },
          category: { type: "string", enum: CATEGORIES.filter((c) => c !== "harness") },
          title: { type: "string" },
          detail: { type: "string" },
        },
      },
    },
  },
};

// ---- runs in the browser: numbered list of the visible controls --------------------
function listControls() {
  const out = [];
  let i = 0;
  for (const el of document.querySelectorAll("[data-audit-idx]")) el.removeAttribute("data-audit-idx");
  for (const el of document.querySelectorAll("button, a[href], input, select, textarea, [role=button], [role=tab], [role=menuitem], [role=option]")) {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1 || r.bottom < 0 || r.top > innerHeight * 2) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none") continue;
    if (el.disabled) continue;
    el.setAttribute("data-audit-idx", String(i));
    const label =
      el.getAttribute("aria-label") ||
      (el.labels && el.labels[0] && el.labels[0].innerText) ||
      el.innerText ||
      el.placeholder ||
      el.value ||
      el.title ||
      "";
    out.push({
      i: i++,
      tag: el.tagName.toLowerCase(),
      role: el.getAttribute("role") || "",
      type: el.type || "",
      label: label.replace(/\s+/g, " ").trim().slice(0, 70),
    });
    if (i >= 90) break;
  }
  return { url: location.pathname, title: document.title, controls: out, text: document.body.innerText.replace(/\s+/g, " ").slice(0, 1500) };
}

/** Validates a model decision; returns {ok, decision} or {ok:false, error}. Pure. */
function validateDecision(raw, controlsCount) {
  let d = raw;
  if (typeof raw === "string") {
    try {
      d = JSON.parse(raw);
    } catch {
      return { ok: false, error: "not JSON" };
    }
  }
  if (!d || typeof d !== "object" || !d.action || !ACTIONS.includes(d.action.type)) return { ok: false, error: "bad action" };
  const a = d.action;
  if (["click", "fill", "select"].includes(a.type) && !(Number.isInteger(a.index) && a.index >= 0 && a.index < controlsCount))
    return { ok: false, error: "index out of range" };
  if (a.type === "goto" && !/^\/dashboard\/[\w\-/]+$/.test(a.value || "")) return { ok: false, error: "goto outside the app" };
  if (a.type === "press" && !/^(Enter|Escape|Tab|ArrowDown|ArrowUp|Backspace)$/.test(a.value || "")) return { ok: false, error: "key not allowed" };
  const findings = (Array.isArray(d.findings) ? d.findings : [])
    .filter((f) => f && f.title)
    .map((f) => ({
      severity: SEVERITIES.includes(f.severity) ? f.severity : "low",
      category: CATEGORIES.includes(f.category) && f.category !== "harness" ? f.category : "ux",
      title: String(f.title).slice(0, 160),
      detail: String(f.detail || "").slice(0, 1200),
    }));
  return { ok: true, decision: { thought: String(d.thought || "").slice(0, 400), action: a, findings } };
}

function systemPrompt(persona, cfg) {
  return [
    `You are ${persona.name}, the ${persona.label} of a small trading shop in Saudi Arabia using the StartPOS web app (sales, quotations, purchases, stock, expenses, accounting) on a ${"$DEVICE"}.`,
    `Your job today: ${persona.goal}`,
    "You are also a meticulous QA auditor. Use the app like a real, busy employee would, and deliberately try corner cases: empty or invalid input, very long or Arabic text, zero/negative/huge numbers, double submits, going back, screens your role should not reach.",
    "Report a finding only for something a real user would notice: wrong or missing data, confusing or untranslated text, broken layout, dead ends, slow or failing actions, a role seeing what it should not. Do not report things that work as expected.",
    "Every turn answer with one action: click/fill/select an element by its index, press a key, goto a /dashboard/... screen (e.g. /dashboard/sales), back, or done when you have explored enough.",
    "Never try to sign out, sign in as someone else, reset passwords, delete the store, or leave the app.",
  ].join("\n");
}

/**
 * Runs the explorer for one persona on an open actor. `client` is an Anthropic SDK client
 * (injected so tests can pass a fake). Returns the number of steps taken.
 */
async function explore(a, persona, { client, model, steps = 12, deviceLabel = "" }) {
  const sys = systemPrompt(persona, a.cfg).replace("$DEVICE", deviceLabel || a.device.label);
  const history = [];
  let taken = 0;
  for (let n = 0; n < steps; n++) {
    if (a.violation) break;
    const view = await a.page.evaluate(listControls).catch(() => null);
    if (!view) break;
    const shot = (await a.page.screenshot({ type: "jpeg", quality: 55 }).catch(() => null))?.toString("base64");
    const user = [
      ...(shot ? [{ type: "image", source: { type: "base64", media_type: "image/jpeg", data: shot } }] : []),
      {
        type: "text",
        text:
          `Screen ${view.url} (${a.lang === "ar" ? "Arabic" : "English"}, ${a.device.label}).\n` +
          `Your last actions: ${history.slice(-6).join(" → ") || "none"}\n` +
          `Visible text: ${view.text}\n` +
          `Controls:\n${view.controls.map((c) => `${c.i}: ${c.tag}${c.role ? "[" + c.role + "]" : ""}${c.type ? "(" + c.type + ")" : ""} ${c.label}`).join("\n")}`,
      },
    ];
    let res;
    try {
      res = await client.messages.create({
        model,
        max_tokens: 4000,
        output_config: { effort: "low", format: { type: "json_schema", schema: DECISION_SCHEMA } },
        system: sys,
        messages: [{ role: "user", content: user }],
      });
    } catch (e) {
      a.finding({ severity: "info", category: "harness", title: "Explorer could not reach the Claude API", detail: String(e.message || e).slice(0, 300) });
      break;
    }
    if (res.stop_reason === "refusal") break;
    const text = (res.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
    const v = validateDecision(text, view.controls.length);
    if (!v.ok) {
      history.push(`(invalid answer: ${v.error})`);
      continue;
    }
    const { action, findings, thought } = v.decision;
    for (const f of findings) a.finding({ ...f, source: "explorer", detail: f.detail + (thought ? `\n\nExplorer note: ${thought}` : ""), screenshot: await a.shot("explorer") });
    if (action.type === "done") break;
    const label = action.index >= 0 ? view.controls[action.index]?.label || "" : "";
    if (action.type === "click" && OFF_LIMITS.test(label)) {
      history.push(`(refused: ${label} is off limits)`);
      continue;
    }
    history.push(`${action.type}${label ? " " + label : ""}${action.value ? " =" + action.value.slice(0, 30) : ""}`);
    await a
      .step(`Explorer: ${action.type} ${label || action.value}`.slice(0, 90), async () => {
        const el = a.page.locator(`[data-audit-idx="${action.index}"]`);
        if (action.type === "click") await el.click({ timeout: 8000 });
        else if (action.type === "fill") await el.fill(action.value, { timeout: 8000 });
        else if (action.type === "select") await el.selectOption({ label: action.value }, { timeout: 8000 }).catch(() => el.selectOption(action.value));
        else if (action.type === "press") await a.page.keyboard.press(action.value);
        else if (action.type === "goto") await a.go(action.value);
        else if (action.type === "back") await a.page.goBack();
        await a.settle(500);
      }, { optional: true })
      .catch((e) => {
        if (e && e.name === "GuardViolation") throw e;
      });
    taken++;
  }
  await a.checkScreen("explorer");
  return taken;
}


module.exports = { OFF_LIMITS, ACTIONS, DECISION_SCHEMA, listControls, validateDecision, systemPrompt, explore };
