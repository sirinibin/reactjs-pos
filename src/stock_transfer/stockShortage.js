// A source short of stock doesn't block a stock transfer: the transfer is
// saved and the source stock goes negative. These helpers word the warnings.

// sourceShortageWarning returns the inline warning for a line that moves more
// than the source holds, or "" when the source has enough.
export function sourceShortageWarning(available, quantity, warehouseCode, t = (s) => s) {
    const have = parseFloat(available) || 0;
    const want = parseFloat(quantity) || 0;
    if (want <= 0 || have >= want) return "";
    return t("Warning: Available stock in ") + warehouseCode + t(" is ") + have + t(" (stock will go negative)");
}

// Translation keys avoid "." and ":", which i18next reads as separators.

// stockShortageMessage turns the API's "quantity_<i>" warnings into one toast
// naming the products whose source stock went negative, or "" when none.
export function stockShortageMessage(warnings, products, t = (s) => s) {
    if (!warnings) return "";
    const names = [];
    Object.keys(warnings)
        .filter((k) => /^quantity_\d+$/.test(k))
        .map((k) => parseInt(k.slice("quantity_".length), 10))
        .sort((a, b) => a - b)
        .forEach((i) => {
            const name = (products && products[i] && products[i].name) || t("line") + " " + (i + 1);
            if (!names.includes(name)) names.push(name);
        });
    if (!names.length) return "";
    return t("Saved with a stock shortage, the source stock went negative for") + ": " + names.join(", ");
}
