import React, { useEffect, useState, useCallback } from 'react';
import { Link } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { loadSidebarConfig } from './sidebar_menu_config';

function Sidebar(props) {
    const { t } = useTranslation('common');
    const [activeTab, setActiveTab] = useState('');
    const [menuItems, setMenuItems] = useState([]);
    const [store, setStore] = useState({});

    const isAdmin        = localStorage.getItem("user_role") === "Admin";
    const storeId        = localStorage.getItem("store_id");

    const [rbacPermissions, setRbacPermissions] = useState(null);
    const [rbacVersion, setRbacVersion] = useState(0);

    const fetchRbacPermissions = useCallback(() => {
        const at = localStorage.getItem("access_token");
        if (!at || isAdmin) return;
        if (!store?.settings?.enable_rbac_module) return;
        fetch("/v1/user-role/effective-permissions", {
            headers: { Authorization: at },
        })
            .then(r => r.json())
            .then(data => {
                const arr = data.result;
                if (!Array.isArray(arr) || arr.length === 0) {
                    setRbacPermissions(null);
                    return;
                }
                const map = {};
                arr.forEach(p => { map[p.resource] = p; });
                localStorage.setItem("user_permissions", JSON.stringify(arr));
                setRbacPermissions(map);
            })
            .catch(() => setRbacPermissions(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [store, isAdmin]);

    useEffect(() => { fetchRbacPermissions(); }, [fetchRbacPermissions, rbacVersion]);

    const getStore = useCallback(async (id) => {
        if (!id) return;
        const res = await fetch('/v1/store/' + id, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': localStorage.getItem('access_token'),
            },
        }).then(r => r.json()).catch(() => ({}));
        if (res?.result) setStore(res.result);
    }, []);

    useEffect(() => {
        getStore(storeId);
    }, [getStore, storeId]);

    // Reload menu whenever sidebar settings change (storage event fires across tabs,
    // but we also reload on mount so a same-tab save+reload picks up the new config).
    useEffect(() => {
        setMenuItems(loadSidebarConfig());
        function onStorage(e) {
            if (e.key === "sidebar_config") setMenuItems(loadSidebarConfig());
            if (e.key === "rbac_role_updated") setRbacVersion(v => v + 1);
        }
        function onRbacUpdated() { setRbacVersion(v => v + 1); }
        window.addEventListener("storage", onStorage);
        window.addEventListener("rbac_role_updated", onRbacUpdated);
        return () => {
            window.removeEventListener("storage", onStorage);
            window.removeEventListener("rbac_role_updated", onRbacUpdated);
        };
    }, []);

    function toggleActive(path) {
        setActiveTab(path);
        if (window.innerWidth <= 991.98) props.parentCallback();
    }

    // Package tab restriction for non-admin users
    const packageTabIDs = store?.customer_package_tab_ids;
    const hasPackage = Array.isArray(packageTabIDs) && packageTabIDs.length > 0;

    const rbacModuleEnabled = !!store?.settings?.enable_rbac_module;

    // Filter items: respect visibility, adminOnly, warehouseOnly, productsOnly, package, RBAC
    const visibleItems = menuItems.filter(item => {
        if (!item.visible) return false;
        // Hide tabs that require RBAC module when it's disabled
        if (item.requiresRBACModule && !rbacModuleEnabled) return false;
        // adminOnly: blocked for non-admins unless RBAC explicitly grants READ on this resource
        const rbacGrantsRead = rbacModuleEnabled && rbacPermissions && item.resource && rbacPermissions[item.resource]?.read;
        if (item.adminOnly && !isAdmin && !rbacGrantsRead) return false;
        if (item.warehouseOnly && !store?.settings?.enable_warehouse_module) return false;
        if (item.requiresPurchaseOrderModule && store?.id && !store?.settings?.enable_purchase_order_module) return false;
        if (item.purchaseRequestOnly && !store?.settings?.enable_purchase_request_module) return false;
        // productsOnly: hide only when services mode is active but products are not enabled.
        // Backward compat: if neither flag is set (old stores), show everything.
        if (item.productsOnly && store?.settings?.enable_services && !store?.settings?.enable_products) return false;
        if (item.requiresServices && !store?.settings?.enable_services) return false;
        // Package restriction: non-admin users only see tabs in the assigned package
        if (!isAdmin && hasPackage && !packageTabIDs.includes(item.id)) return false;
        // RBAC: if module is enabled and user has explicit role permissions, only show tabs they can read.
        // Admin is exempt. If no permissions are stored (empty roles), default to show all.
        if (rbacModuleEnabled && !isAdmin && rbacPermissions && item.resource) {
            const perm = rbacPermissions[item.resource];
            if (!perm || !perm.read) return false;
        }
        return true;
    });

    return (
        <nav id="sidebar" className={'sidebar ' + props.isSidebarOpen + ' js-sidebar'} style={{ overflowY: 'scroll' }}>
            <div className="sidebar-content js-simplebar">
                <div className="sidebar-brand">
                    <span className="align-middle">Start POS</span>
                </div>

                <ul className="sidebar-nav">
                    {visibleItems.map(item => (
                        <li
                            key={item.id}
                            onClick={() => toggleActive(item.path)}
                            className={activeTab === item.path ? "sidebar-item active" : "sidebar-item"}
                        >
                            <Link to={item.path} className="sidebar-link">
                                <i className={`bi ${item.icon}`} />
                                <span className="align-middle">{t(item.label)}</span>
                            </Link>
                        </li>
                    ))}

                    {/* Settings link — always at the bottom */}
                    <li
                        onClick={() => toggleActive("/dashboard/sidebar-settings")}
                        className={activeTab === "/dashboard/sidebar-settings" ? "sidebar-item active" : "sidebar-item"}
                        style={{ marginTop: "auto", borderTop: "1px solid rgba(255,255,255,0.1)" }}
                    >
                        <Link to="/dashboard/sidebar-settings" className="sidebar-link">
                            <i className="bi bi-list-ul" />
                            <span className="align-middle">{t("Menu Settings")}</span>
                        </Link>
                    </li>
                </ul>

                <div className="sidebar-cta">
                    <div className="sidebar-cta-content" />
                </div>
            </div>
        </nav>
    );
}

export default Sidebar;
