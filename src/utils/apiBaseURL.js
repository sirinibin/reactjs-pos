// Public URL of the API that belongs to the site this page was loaded from.
//
// One frontend build is deployed to both the test and the production site, so
// the API host can't be baked in at build time: it is worked out here from the
// page's own host. Only absolute links shown to people or third parties (email
// webhooks, OAuth callbacks) need this; API calls use relative /v1 paths.
export const API_BY_HOST = {
    'startpos.gulfunionozone.com': 'https://startpos-api.gulfunionozone.com',
    'workshop.gulfunionozone.com': 'https://startpos-api.gulfunionozone.com',
    'test.gulfunionozone.com': 'https://startpos-api-test.gulfunionozone.com',
};

const stripSlash = (url) => (url || '').replace(/\/+$/, '');

export function apiBaseURL(
    hostname = typeof window !== 'undefined' ? window.location.hostname : '',
    envURL = process.env.REACT_APP_API_URL,
    origin = typeof window !== 'undefined' ? window.location.origin : '',
) {
    const host = (hostname || '').trim().toLowerCase().replace(/\.$/, '').replace(/^www\./, '');
    if (API_BY_HOST[host]) {
        return API_BY_HOST[host];
    }
    // Local dev and anything else: the build's own setting, else this origin.
    return stripSlash(envURL) || stripSlash(origin);
}
