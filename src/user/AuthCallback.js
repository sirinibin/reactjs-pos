import { useEffect } from 'react';
import { getLandingPath } from '../sidebar_menu_config';
import { fetchStore } from '../utils/storeUtils.js';

async function doMe(accessToken) {
        try {
            const res = await fetch('/v1/me', {
                headers: { Authorization: accessToken },
            });
            if (!res.ok) { window.location.replace('/'); return; }
            const data = await res.json();
            const user = data.result;

            const storeIDs = user.store_ids || [];
            const storeNames = user.store_names || [];

            if (user.role !== 'Admin' && storeIDs.length === 0) {
                localStorage.removeItem('access_token');
                window.location.replace('/');
                return;
            }

            const userId = user.id;
            const lastStoreId = localStorage.getItem('last_store_' + userId);

            if (user.role !== 'Admin') {
                let storeId = storeIDs[0];
                let storeName = storeNames[0];
                if (lastStoreId && storeIDs.includes(lastStoreId)) {
                    const idx = storeIDs.indexOf(lastStoreId);
                    storeId = lastStoreId;
                    storeName = storeNames[idx] || storeNames[0];
                }
                localStorage.setItem('store_name', storeName);
                localStorage.setItem('store_id', storeId);
                if (storeId) localStorage.setItem('last_store_' + userId, storeId);
                if (storeId) {
                    try {
                        const storeData = await fetchStore(storeId);
                        if (storeData?.settings) {
                            localStorage.setItem('_store_settings_cache', JSON.stringify(storeData.settings));
                        }
                    } catch (_) {}
                }
            } else {
                if (lastStoreId) {
                    try {
                        const storeData = await fetchStore(lastStoreId, 'id,name,branch_name,settings');
                        if (storeData) {
                            localStorage.setItem('store_id', storeData.id);
                            localStorage.setItem('store_name', storeData.name);
                            localStorage.setItem('last_store_' + userId, storeData.id);
                            if (storeData.branch_name) {
                                localStorage.setItem('branch_name', storeData.branch_name);
                            } else {
                                localStorage.removeItem('branch_name');
                            }
                            if (storeData.settings) {
                                localStorage.setItem('_store_settings_cache', JSON.stringify(storeData.settings));
                            }
                        } else {
                            await getFirstStoreForAdmin(accessToken, userId);
                        }
                    } catch (_) {
                        await getFirstStoreForAdmin(accessToken, userId);
                    }
                } else {
                    await getFirstStoreForAdmin(accessToken, userId);
                }
            }

            localStorage.setItem('user_name', user.name);
            localStorage.setItem('user_id', user.id);
            const resolvedRole = user.role || 'Manager';
            localStorage.setItem('user_role', resolvedRole);
            localStorage.setItem('admin', user.admin === true ? 'true' : 'false');
            if (user.photo) localStorage.setItem('user_photo', user.photo);

            try {
                const permRes = await fetch('/v1/user-role/effective-permissions', {
                    headers: { Authorization: accessToken },
                });
                const permData = await permRes.json();
                if (permData.result && permData.result.length > 0) {
                    localStorage.setItem('user_permissions', JSON.stringify(permData.result));
                } else {
                    localStorage.removeItem('user_permissions');
                }
            } catch (_) {
                localStorage.removeItem('user_permissions');
            }

            window.location.replace(getLandingPath());
        } catch (_) {
            window.location.replace('/');
        }
    }

async function getFirstStoreForAdmin(token, userId) {
        try {
            const res = await fetch('/v1/store?select=id,name,branch_name&limit=1', {
                headers: { 'Content-Type': 'application/json', Authorization: token },
            });
            const data = res.ok && await res.json();
            const stores = data?.result;
            if (stores && stores.length > 0) {
                const first = stores[0];
                localStorage.setItem('store_name', first.name);
                localStorage.setItem('store_id', first.id);
                if (first.branch_name) {
                    localStorage.setItem('branch_name', first.branch_name);
                } else {
                    localStorage.removeItem('branch_name');
                }
                if (userId) localStorage.setItem('last_store_' + userId, first.id);
                try {
                    const storeData = await fetchStore(first.id);
                    if (storeData?.settings) {
                        localStorage.setItem('_store_settings_cache', JSON.stringify(storeData.settings));
                    }
                } catch (_) {}
            }
        } catch (_) {}
}

// AuthCallback handles /auth?at=<access_token>
// Used by external login pages (e.g. workshop.gulfunionozone.com) that have
// already obtained an access token and need to hand it to the React app.
function AuthCallback() {
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const accessToken = params.get('at');
        if (!accessToken) {
            window.location.replace('/');
            return;
        }
        localStorage.setItem('access_token', accessToken);
        doMe(accessToken);
    }, []);

    return null;
}

export default AuthCallback;
