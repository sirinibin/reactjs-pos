import { api, buildQuery, getStoreId, sortParam, timezoneOffsetHours } from './client';

/**
 * Standard CRUD calls for one REST resource, matching the classic screens:
 *   list    GET    /v1/<name>?select=..&search[..]=..&sort=..&page=..&limit=..
 *   get     GET    /v1/<name>/<id>?search[store_id]=..
 *   create  POST   /v1/<name>?search[store_id]=..
 *   update  PUT    /v1/<name>/<id>?search[store_id]=..
 *   remove  DELETE /v1/<name>/<id>?search[store_id]=..
 *   restore POST   /v1/<name>/restore/<id>?search[store_id]=..
 */
export function createResource(name, { select } = {}) {
    const base = '/v1/' + name;
    const storeSearch = () => ({ store_id: getStoreId() });

    return {
        name,
        list({ search = {}, sort, page = 1, limit = 20, signal, fields } = {}) {
            const query = [
                (fields || select) ? 'select=' + (fields || select) : '',
                buildQuery({
                    search: { ...search, store_id: getStoreId(), timezone_offset: timezoneOffsetHours() },
                    params: { sort: sortParam(sort), page, limit },
                }),
            ].filter(Boolean).join('&');
            return api.get(base, { query, signal }).then(d => ({ rows: d.result || [], total: d.total_count || 0, meta: d.meta }));
        },
        get(id, { signal } = {}) {
            return api.get(base + '/' + id, { query: buildQuery({ search: storeSearch() }), signal }).then(d => d.result);
        },
        create(body) {
            return api.post(base, { ...body, store_id: body.store_id || getStoreId() }, { query: buildQuery({ search: storeSearch() }) }).then(d => d.result);
        },
        update(id, body) {
            return api.put(base + '/' + id, { ...body, store_id: body.store_id || getStoreId() }, { query: buildQuery({ search: storeSearch() }) }).then(d => d.result);
        },
        remove(id) {
            return api.del(base + '/' + id, { query: buildQuery({ search: storeSearch() }) });
        },
        restore(id) {
            return api.post(base + '/restore/' + id, undefined, { query: buildQuery({ search: storeSearch() }) });
        },
    };
}
