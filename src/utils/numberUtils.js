// src/utils/numberUtils.js
export function trimTo2Decimals(num) {
    if (typeof num !== "number") return "0.00"; // Ensure input is a number

    return Math.round((num + Number.EPSILON) * 100) / 100;
    /*
    let strValue = value.toString();
    let decimalIndex = strValue.indexOf(".");

    if (decimalIndex !== -1) {
        strValue = strValue.substring(0, decimalIndex + 3); // Keep only two decimal places
    }

    return parseFloat(strValue).toFixed(2);
    */
}
