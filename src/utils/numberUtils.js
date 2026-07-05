// src/utils/numberUtils.js
export function trimTo2Decimals(num) {
    if (typeof num !== "number" || isNaN(num) || !isFinite(num)) return "0.00"; // Handle invalid input
    const rounded = Math.round((num + Number.EPSILON) * 100) / 100;
    return rounded.toFixed(2); // Ensure two decimal digits in string
}

export function trimTo3Decimals(num) {
    if (typeof num !== "number" || isNaN(num) || !isFinite(num)) return "0.000"; // Handle invalid input
    const rounded = Math.round((num + Number.EPSILON) * 1000) / 1000;
    return rounded.toFixed(3); // Ensure two decimal digits in string
}


export function trimTo4Decimals(num) {
    if (typeof num !== "number" || isNaN(num) || !isFinite(num)) return "0.0000"; // Handle invalid input
    const rounded = Math.round((num + Number.EPSILON) * 10000) / 10000;
    return rounded.toFixed(4); // Ensure two decimal digits in string
}

export function trimTo8Decimals(num) {
    if (typeof num !== "number" || isNaN(num) || !isFinite(num)) return "0.00000000"; // Handle invalid input
    const rounded = Math.round((num + Number.EPSILON) * 100000000) / 100000000;
    return rounded.toFixed(8); // Ensure two decimal digits in string
}

// Strip "SAR " from non-bold breakdown lines; bold totals keep it.
// e.g. "− SAR 12,345.67" → "− 12,345.67"   "SAR 552,137.90"(bold) → unchanged
export function stripSarBreakdown(str, isBold) {
    if (isBold || typeof str !== 'string') return str;
    // Match optional leading sign (+, -, Unicode minus −) then "SAR " and remove just "SAR "
    return str.replace(/^(\s*[+\-−]\s*)?SAR\s+/i, '$1');
}

// Add comma separators to numbers ≥ 1000 inside tooltip info value strings.
// Numbers < 1000 and non-numeric text pass through unchanged.
export function addCommasToInfoValue(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/\d+(\.\d+)?/g, (match) => {
        const n = parseFloat(match);
        if (isNaN(n) || n < 1000) return match;
        const decimals = match.includes('.') ? match.split('.')[1].length : 0;
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        }).format(n);
    });
}
