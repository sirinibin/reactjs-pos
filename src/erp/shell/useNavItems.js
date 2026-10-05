import { useCallback, useEffect, useMemo, useState } from 'react';
import { loadSidebarConfig } from '../../sidebar_menu_config';
import { applyDocumentDirection } from '../../i18n/config';
import { filterMenuItems } from './navModel';

/**
 * Loads the menu the same way the classic Sidebar does: Menu Settings
 * order/visibility from localStorage, the current store's feature flags and
 * (for non-admins with RBAC on) the user's effective permissions.
 */
export function useNavItems() {
    const isAdmin = localStorage.getItem('user_role') === 'Admin';
    const storeId = localStorage.getItem('store_id');
    const [menuItems, setMenuItems] = useState(() => loadSidebarConfig());
    const [store, setStore] = useState({});
    const [rbacPermissions, setRbacPermissions] = useState(null);
    const [rbacVersion, setRbacVersion] = useState(0);

    const getStore = useCallback(async id => {
        if (!id) return;
        const res = await fetch('/v1/store/' + id, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', Authorization: localStorage.getItem('access_token') },
        }).then(r => r.json()).catch(() => ({}));
        if (res && res.result) {
            setStore(res.result);
            const useRTL = !!(res.result.settings && res.result.settings.use_rtl_for_arabic);
            localStorage.setItem('use_rtl_for_arabic', useRTL ? 'true' : 'false');
            applyDocumentDirection();
        }
    }, []);

    useEffect(() => { getStore(storeId); }, [getStore, storeId]);

    const rbacOn = !!(store && store.settings && store.settings.enable_rbac_module);
    useEffect(() => {
        const at = localStorage.getItem('access_token');
        if (!at || isAdmin || !rbacOn) return;
        fetch('/v1/user-role/effective-permissions', { headers: { Authorization: at } })
            .then(r => r.json())
            .then(data => {
                const arr = data.result;
                if (!Array.isArray(arr) || arr.length === 0) {
                    setRbacPermissions(null);
                    return;
                }
                const map = {};
                arr.forEach(p => { map[p.resource] = p; });
                localStorage.setItem('user_permissions', JSON.stringify(arr));
                setRbacPermissions(map);
            })
            .catch(() => setRbacPermissions(null));
    }, [isAdmin, rbacOn, rbacVersion]);

    useEffect(() => {
        function onStorage(e) {
            if (e.key === 'sidebar_config') setMenuItems(loadSidebarConfig());
            if (e.key === 'rbac_role_updated') setRbacVersion(v => v + 1);
            if (e.key === 'store_settings_updated') getStore(storeId);
        }
        function onRbacUpdated() { setRbacVersion(v => v + 1); }
        window.addEventListener('storage', onStorage);
        window.addEventListener('rbac_role_updated', onRbacUpdated);
        return () => {
            window.removeEventListener('storage', onStorage);
            window.removeEventListener('rbac_role_updated', onRbacUpdated);
        };
    }, [getStore, storeId]);

    const items = useMemo(
        () => filterMenuItems(menuItems, { isAdmin, store, rbacPermissions }),
        [menuItems, isAdmin, store, rbacPermissions]
    );

    return { items, store };
}
