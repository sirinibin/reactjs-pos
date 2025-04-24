// src/utils/numberUtils.js
export function trimTo2Decimals(num) {
    if (typeof num !== "number" || isNaN(num)) return "0.00"; // Handle invalid input
    const rounded = Math.round((num + Number.EPSILON) * 100) / 100;
    return rounded.toFixed(2); // Ensure two decimal digits in string
}
