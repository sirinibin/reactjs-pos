export function ObjectToSearchQueryParams(object) {
    return Object.keys(object)
        .map(function (key) {
            return `search[${key}]=${object[key]}`;
        })
        .join("&");
}
