// Pure helpers behind <PriceInput> (src/components/PriceInput.js): what a
// cashier may type into a unit price box, and how a stored price is shown.

export const PRICE_MAX_DECIMALS = 8;

// Arabic-Indic (٠-٩) and Extended Arabic-Indic / Persian (۰-۹) digits.
const ARABIC_DIGITS = /[٠-٩۰-۹]/g;

function toAsciiDigit(ch) {
    const code = ch.charCodeAt(0);
    return String(code >= 0x06F0 ? code - 0x06F0 : code - 0x0660);
}

/**
 * Cleans what was typed or pasted into a price box so it is always a valid,
 * non-negative decimal in progress: "12", "12.", ".5", "0.05", "".
 *  - Arabic digits become 0-9; the Arabic decimal mark (٫) and a comma become "."
 *  - spaces, thousands separators (٬), currency text, signs and "e" are dropped
 *  - only the first "." is kept, and at most `maxDecimals` digits after it
 */
export function sanitizePriceInput(raw, maxDecimals = PRICE_MAX_DECIMALS) {
    if (raw === null || raw === undefined) return "";
    let s = String(raw).replace(ARABIC_DIGITS, toAsciiDigit);
    // "1,234.50" and "1,234,567" use thousands separators; "12,5" uses a decimal comma.
    if (s.includes(".") || (s.match(/,/g) || []).length > 1) {
        s = s.replace(/[,٬]/g, "");
    }
    s = s.replace(/[٫,]/g, ".");
    s = s.replace(/[^0-9.]/g, "");

    const dot = s.indexOf(".");
    if (dot === -1) return s;
    const intPart = s.slice(0, dot);
    const decimals = s.slice(dot + 1).replace(/\./g, "").slice(0, Math.max(0, maxDecimals));
    if (maxDecimals <= 0) return intPart;
    return `${intPart}.${decimals}`;
}

/** Number for a sanitized draft, or "" while nothing numeric has been typed. */
export function parsePriceDraft(draft) {
    if (draft === "" || draft === "." || draft === null || draft === undefined) return "";
    const n = parseFloat(draft);
    return isNaN(n) ? "" : n;
}

function toNumber(value) {
    if (value === "" || value === null || value === undefined) return null;
    const n = typeof value === "number" ? value : parseFloat(value);
    return isFinite(n) ? n : null;
}

/**
 * How a stored price reads while the box is not being edited:
 * at least 2 decimals, at most `maxDisplayDecimals`, no trailing zeros beyond 2.
 * 115 → "115.00", 10.005 → "10.005", 8.69565217 → "8.6957", "" → "".
 */
export function formatPriceDisplay(value, maxDisplayDecimals = 4) {
    const n = toNumber(value);
    if (n === null) return "";
    const fixed = n.toFixed(maxDisplayDecimals);
    const [i, d = ""] = fixed.split(".");
    const trimmed = d.replace(/0+$/, "").padEnd(2, "0");
    return `${i}.${trimmed}`;
}

/**
 * What the box holds when editing starts: the full stored precision without
 * float noise or padding, so nothing is lost. 115 → "115", 8.69565217 → "8.69565217".
 */
export function formatPriceForEditing(value, maxDecimals = PRICE_MAX_DECIMALS) {
    const n = toNumber(value);
    if (n === null) return "";
    return String(parseFloat(n.toFixed(maxDecimals)));
}

/**
 * Whether a key press should also reach the form's own onKeyDown (shortcuts,
 * Enter/Tab navigation, F-key history panels) or stays inside the price box.
 * Editing keys never leave the box, so a stray Backspace only deletes a digit
 * and typing never cancels the form's pending recalculation. ArrowLeft/Right,
 * Home and End leave the box only when the caret is already at that edge or
 * the whole value is selected (the state right after focusing).
 */
export function shouldForwardPriceKey({ key, ctrlKey, metaKey, altKey }, { selectionStart, selectionEnd, length }) {
    if (ctrlKey || metaKey || altKey) return true;
    if (key === "Backspace" || key === "Delete") return false;
    if (typeof key === "string" && key.length === 1) return false; // printable character
    const allSelected = selectionStart === 0 && selectionEnd === length;
    const collapsed = selectionStart === selectionEnd;
    if (key === "ArrowLeft" || key === "Home") return allSelected || (collapsed && selectionStart === 0);
    if (key === "ArrowRight" || key === "End") return allSelected || (collapsed && selectionEnd === length);
    return true;
}

/**
 * The other half of a with/without VAT pair, at the precision the forms store.
 * Returns "" for an empty price so both boxes clear together.
 */
export function counterpartPrice(value, vatPercent, direction) {
    const n = toNumber(value);
    if (n === null) return "";
    const factor = 1 + ((parseFloat(vatPercent) || 0) / 100);
    const result = direction === "toWithVat" ? n * factor : n / factor;
    return parseFloat(result.toFixed(PRICE_MAX_DECIMALS));
}
