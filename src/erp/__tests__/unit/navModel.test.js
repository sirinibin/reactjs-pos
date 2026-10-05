import { filterMenuItems, groupMenuItems, findActiveItem, matchesFilter, ITEM_META } from '../../shell/navModel';
import { DEFAULT_MENU } from '../../../sidebar_menu_config';

const all = DEFAULT_MENU.map(m => ({ ...m, visible: true }));
const ids = items => items.map(i => i.id);
const withSettings = settings => ({ id: 's1', settings });

describe('filterMenuItems (same rules as the classic sidebar)', () => {
    it('every classic menu item has a group and icon', () => {
        DEFAULT_MENU.forEach(m => {
            expect(ITEM_META[m.id]).toBeDefined();
            expect(ITEM_META[m.id][1]).toBeTruthy();
        });
    });

    it('hides items the user switched off in Menu Settings', () => {
        const items = all.map(i => (i.id === 'sales' ? { ...i, visible: false } : i));
        expect(ids(filterMenuItems(items, { isAdmin: true, store: withSettings({}) }))).not.toContain('sales');
    });

    it('hides admin-only items for non-admins', () => {
        const out = ids(filterMenuItems(all, { isAdmin: false, store: withSettings({}) }));
        expect(out).not.toContain('users');
        expect(out).not.toContain('analytics');
        expect(ids(filterMenuItems(all, { isAdmin: true, store: withSettings({}) }))).toContain('users');
    });

    it('feature-flagged modules appear only when the store enables them', () => {
        const off = ids(filterMenuItems(all, { isAdmin: true, store: withSettings({}) }));
        ['warehouses', 'stock_transfers', 'vehicles', 'repair_jobs', 'employees', 'non_vat_sales', 'rfq_received', 'purchase_requests', 'qtn_sales_return', 'purchase_bill_images', 'services', 'user_roles']
            .forEach(id => expect(off).not.toContain(id));

        const on = ids(filterMenuItems(all, {
            isAdmin: true,
            store: withSettings({
                enable_warehouse_module: true, enable_automobile_module: true, enable_employee_module: true,
                non_vat_sales: true, enable_ai_rfq_bot: true, enable_rfq_module: true, enable_purchase_request_module: true,
                enable_sales_in_quotation: true, enable_purchase_bills_tracking: true, enable_services: true,
                enable_products: true, enable_rbac_module: true, enable_automobile_dashboard: true,
            }),
        }));
        ['warehouses', 'stock_transfers', 'vehicles', 'repair_jobs', 'employees', 'non_vat_sales', 'rfq_received', 'purchase_requests', 'qtn_sales_return', 'purchase_bill_images', 'services', 'user_roles', 'automobile_dashboard']
            .forEach(id => expect(on).toContain(id));
    });

    it('purchase orders hide only when a loaded store has the module off', () => {
        expect(ids(filterMenuItems(all, { isAdmin: true, store: {} }))).toContain('purchase_orders');
        expect(ids(filterMenuItems(all, { isAdmin: true, store: withSettings({}) }))).not.toContain('purchase_orders');
        expect(ids(filterMenuItems(all, { isAdmin: true, store: withSettings({ enable_purchase_order_module: true }) }))).toContain('purchase_orders');
    });

    it('common dashboard hides only when explicitly false', () => {
        expect(ids(filterMenuItems(all, { isAdmin: true, store: withSettings({}) }))).toContain('dashboard');
        expect(ids(filterMenuItems(all, { isAdmin: true, store: withSettings({ enable_common_dashboard: false }) }))).not.toContain('dashboard');
    });

    it('services-only stores hide product menus; old stores with neither flag show everything', () => {
        const servicesOnly = ids(filterMenuItems(all, { isAdmin: true, store: withSettings({ enable_services: true, enable_products: false }) }));
        expect(servicesOnly).not.toContain('products');
        expect(servicesOnly).toContain('services');
        const legacy = ids(filterMenuItems(all, { isAdmin: true, store: withSettings({}) }));
        expect(legacy).toContain('products');
    });

    it('customer package limits non-admins to the package tabs', () => {
        const store = { id: 's', settings: {}, customer_package_tab_ids: ['sales', 'customers'] };
        expect(ids(filterMenuItems(all, { isAdmin: false, store }))).toEqual(['sales', 'customers']);
        expect(ids(filterMenuItems(all, { isAdmin: true, store }))).toContain('products');
    });

    it('RBAC: non-admins see only resources they can read; read grant unlocks admin-only items', () => {
        const store = withSettings({ enable_rbac_module: true });
        const perms = { sales: { read: true }, users: { read: true }, customers: { read: false } };
        const out = ids(filterMenuItems(all, { isAdmin: false, store, rbacPermissions: perms }));
        expect(out).toEqual(['sales', 'users']);
    });

    it('RBAC with no permission map falls back to the non-RBAC rules', () => {
        const store = withSettings({ enable_rbac_module: true });
        const out = ids(filterMenuItems(all, { isAdmin: false, store, rbacPermissions: null }));
        expect(out).toContain('sales');
        expect(out).not.toContain('users');
    });

    it('handles a missing store object', () => {
        expect(() => filterMenuItems(all, { isAdmin: true, store: undefined })).not.toThrow();
    });
});

describe('groupMenuItems', () => {
    const visible = filterMenuItems(all, { isAdmin: true, store: withSettings({ enable_automobile_module: true, enable_employee_module: true }) });

    it('drops empty groups and keeps every item exactly once', () => {
        const groups = groupMenuItems(visible);
        const flat = groups.flatMap(g => g.items.map(i => i.id));
        expect(flat.sort()).toEqual(ids(visible).sort());
        groups.forEach(g => expect(g.items.length).toBeGreaterThan(0));
    });

    it('puts Workshop first only when automobile ordering is requested', () => {
        expect(groupMenuItems(visible, { automobileFirst: true })[0].id).toBe('workshop');
        expect(groupMenuItems(visible, { automobileFirst: false })[0].id).toBe('overview');
    });

    it('keeps the Menu Settings order inside a group', () => {
        const reordered = [visible.find(i => i.id === 'customers'), ...visible.filter(i => i.id !== 'customers')];
        const sales = groupMenuItems(reordered).find(g => g.id === 'sales');
        expect(sales.items[0].id).toBe('customers');
    });

    it('places children right after their parent and flags them', () => {
        const people = groupMenuItems(visible).find(g => g.id === 'people');
        expect(ids(people.items)).toEqual(['employees', 'salaries']);
        expect(people.items[1].isChild).toBe(true);
    });

    it('unknown items fall into Overview instead of disappearing', () => {
        const groups = groupMenuItems([{ id: 'mystery', label: 'Mystery', path: '/x', visible: true }]);
        expect(groups[0].id).toBe('overview');
    });
});

describe('findActiveItem', () => {
    const items = [{ id: 'a', path: '/dashboard/repair-jobs' }, { id: 'b', path: '/dashboard/repair-jobs-board' }, { id: 'c', path: '/dashboard/sales' }];
    it('matches exact and nested paths', () => {
        expect(findActiveItem(items, '/dashboard/sales').id).toBe('c');
        expect(findActiveItem(items, '/dashboard/sales/123').id).toBe('c');
    });
    it('does not confuse prefixes that are not path segments', () => {
        expect(findActiveItem(items, '/dashboard/repair-jobs-board').id).toBe('b');
        expect(findActiveItem(items, '/dashboard/salesreturn')).toBeNull();
    });
});

describe('matchesFilter', () => {
    it('is case-insensitive and trims', () => {
        expect(matchesFilter('Sales Returns', '  RETURN ')).toBe(true);
        expect(matchesFilter('Sales', 'xyz')).toBe(false);
        expect(matchesFilter('Anything', '')).toBe(true);
    });
});
