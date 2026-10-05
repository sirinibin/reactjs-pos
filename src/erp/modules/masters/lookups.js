import { api, buildQuery, getStoreId } from '../../api/client';

/** Suggestions for an id/name lookup on any list endpoint (used by filters and pickers). */
export function lookup(path, { field = 'name', limit = 20, extra = {} } = {}) {
    return query => api
        .get(path, {
            query: 'select=id,name&' + buildQuery({
                search: { ...extra, [field]: query, store_id: getStoreId() },
                params: { limit },
            }),
        })
        .then(d => (d.result || []).map(r => ({ id: r.id, name: r.name })));
}

/** Users for "Created By" filters — the classic lists query /v1/user without a store filter. */
export function lookupUsers(query) {
    return api
        .get('/v1/user', { query: 'select=id,name&' + buildQuery({ search: { name: query } }) })
        .then(d => (d.result || []).map(r => ({ id: r.id, name: r.name })));
}
