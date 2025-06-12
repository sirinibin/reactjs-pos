// src/utils/numberUtils.js
export function trimTo2Decimals(num) {
    if (typeof num !== "number" || isNaN(num)) return "0.00"; // Handle invalid input
    const rounded = Math.round((num + Number.EPSILON) * 100) / 100;
    return rounded.toFixed(2); // Ensure two decimal digits in string
}

export function trimTo3Decimals(num) {
    if (typeof num !== "number" || isNaN(num)) return "0.000"; // Handle invalid input
    const rounded = Math.round((num + Number.EPSILON) * 1000) / 1000;
    return rounded.toFixed(3); // Ensure two decimal digits in string
}


export function trimTo4Decimals(num) {
    if (typeof num !== "number" || isNaN(num)) return "0.0000"; // Handle invalid input
    const rounded = Math.round((num + Number.EPSILON) * 10000) / 10000;
    return rounded.toFixed(4); // Ensure two decimal digits in string
}

