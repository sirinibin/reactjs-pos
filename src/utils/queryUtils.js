export function ObjectToSearchQueryParams(object) {
    return Object.keys(object)
        .filter(key => object[key] !== undefined && object[key] !== null && object[key] !== '')
        .map(function (key) {
            return `search[${encodeURIComponent(key)}]=${encodeURIComponent(object[key])}`;
        })
        .join("&");
}
