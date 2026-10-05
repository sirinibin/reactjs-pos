import { lazy } from 'react';
import type { ModuleRoute } from '@/app/routeTypes';
import { registerArabic } from '@/i18n';
import { registerCreate, registerSearch } from '@/shell/commands';
import { api } from '@/api/client';
import { normalizeProductQuery } from '@/framework/doc/lookups';
import { fmtMoney, fmtNumber } from '@/lib/format';
import { ar } from './ar';
import { t as tt } from '@/i18n';
import { partLabel } from './lib/pricing';

const prod = () => import('./products');
const edit = () => import('./productEditor');
const svc = () => import('./services');
const mst = () => import('./masters');
const trf = () => import('./transfers');

export const routes: ModuleRoute[] = [
  { path: '/stock/products', navId: 'products', component: lazy(() => prod().then((m) => ({ default: m.ProductListPage }))) },
  { path: '/stock/products/new', navId: 'products', component: lazy(() => edit().then((m) => ({ default: m.ProductEditorPage }))) },
  { path: '/stock/products/:id', navId: 'products', component: lazy(() => prod().then((m) => ({ default: m.ProductViewPage }))) },
  { path: '/stock/products/:id/edit', navId: 'products', component: lazy(() => edit().then((m) => ({ default: m.ProductEditorPage }))) },
  { path: '/stock/services', navId: 'services', component: lazy(() => svc().then((m) => ({ default: m.ServiceListPage }))) },
  { path: '/stock/categories', navId: 'product_category', component: lazy(() => mst().then((m) => ({ default: m.CategoryListPage }))) },
  { path: '/stock/service-categories', navId: 'service_category', component: lazy(() => mst().then((m) => ({ default: m.ServiceCategoryListPage }))) },
  { path: '/stock/brands', navId: 'product_brand', component: lazy(() => mst().then((m) => ({ default: m.BrandListPage }))) },
  { path: '/stock/warehouses', navId: 'warehouses', component: lazy(() => mst().then((m) => ({ default: m.WarehouseListPage }))) },
  { path: '/stock/transfers', navId: 'stock_transfers', component: lazy(() => trf().then((m) => ({ default: m.TransferListPage }))) },
  { path: '/stock/transfers/new', navId: 'stock_transfers', component: lazy(() => trf().then((m) => ({ default: m.TransferEditorPage }))) },
  { path: '/stock/transfers/:id', navId: 'stock_transfers', component: lazy(() => trf().then((m) => ({ default: m.TransferViewPage }))) },
  { path: '/stock/transfers/:id/edit', navId: 'stock_transfers', component: lazy(() => trf().then((m) => ({ default: m.TransferEditorPage }))) },
];

export function setup() {
  registerArabic(ar);
  registerCreate({ label: 'New product', path: '/stock/products/new', icon: 'box', resource: 'products', navId: 'products' });
  registerCreate({ label: 'New service', path: '/stock/services?new=1', icon: 'wrench', resource: 'services', navId: 'services' });
  registerCreate({ label: 'New stock transfer', path: '/stock/transfers/new', icon: 'swap', resource: 'stock_transfers', navId: 'stock_transfers' });
  registerCreate({ label: 'New product category', path: '/stock/categories?new=1', icon: 'tag', resource: 'product_category', navId: 'product_category' });
  registerCreate({ label: 'New brand', path: '/stock/brands?new=1', icon: 'star', resource: 'product_brand', navId: 'product_brand' });
  registerCreate({ label: 'New warehouse', path: '/stock/warehouses?new=1', icon: 'wh', resource: 'warehouses', navId: 'warehouses' });

  registerSearch({
    id: 'products', group: 'Products', resource: 'products',
    search: async (q, storeId, signal) => {
      const r = await api.get<any[]>('/v1/product', {
        search: { store_id: storeId, search_text: normalizeProductQuery(q), is_service: 0 }, limit: 6,
        select: `id,name,part_number,prefix_part_number,brand_name,product_stores.${storeId}.stock,product_stores.${storeId}.retail_unit_price`,
      }, signal);
      return (r.result || []).map((p) => {
        const ps = p.product_stores?.[storeId] || {};
        return {
          id: `product:${p.id}`, label: [partLabel(p), p.name].filter(Boolean).join(' · '),
          sub: `${fmtMoney(ps.retail_unit_price)} · ${fmtNumber(ps.stock ?? 0, 0)} ${tt('in stock')}${p.brand_name ? ` · ${p.brand_name}` : ''}`,
          icon: 'box' as const, path: `/stock/products/${p.id}`, group: 'Products',
        };
      });
    },
  });
  registerSearch({
    id: 'services', group: 'Services', resource: 'services',
    search: async (q, storeId, signal) => {
      const r = await api.get<any[]>('/v1/product', { search: { store_id: storeId, search_text: q, is_service: 1 }, limit: 4, select: `id,name,service_category_name,product_stores.${storeId}.retail_unit_price` }, signal);
      return (r.result || []).map((p) => ({
        id: `service:${p.id}`, label: p.name, sub: [p.service_category_name, fmtMoney(p.product_stores?.[storeId]?.retail_unit_price)].filter(Boolean).join(' · '),
        icon: 'wrench' as const, path: `/stock/services?edit=${p.id}`, group: 'Services',
      }));
    },
  });
  registerSearch({
    id: 'stock_transfers', group: 'Stock transfers', resource: 'stock_transfers',
    search: async (q, storeId, signal) => {
      if (!/\d/.test(q)) return [];
      const r = await api.get<any[]>('/v1/stock-transfer', { search: { store_id: storeId, code: q }, limit: 4, select: 'id,code,net_total,total_quantity', sort: '-created_at' }, signal);
      return (r.result || []).map((x) => ({ id: `transfer:${x.id}`, label: x.code, sub: `${fmtNumber(x.total_quantity, 0)} · ${fmtMoney(x.net_total)}`, icon: 'swap' as const, path: `/stock/transfers/${x.id}`, group: 'Stock transfers' }));
    },
  });
}
