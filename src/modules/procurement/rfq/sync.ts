import { api } from '@/api/client';
import type { RFQProduct } from '../types';

/**
 * Link extracted RFQ products to the catalog (§5.5 autoSyncProducts): per product (max 5 concurrent)
 * search by part number, else exact name (case-insensitive), else create {name, part_number?, unit?}.
 */
export async function syncProducts(storeId: string, products: RFQProduct[], concurrency = 5): Promise<{ products: RFQProduct[]; linked: number; created: number; failed: number }> {
  const out = products.map((p) => ({ ...p }));
  let linked = 0, created = 0, failed = 0;
  const todo = out.map((p, i) => ({ p, i })).filter(({ p }) => !p.product_id && (p.name || '').trim());
  const work = async ({ p, i }: { p: RFQProduct; i: number }) => {
    try {
      let hit: any = null;
      if (p.part_no) {
        const r = await api.get<any[]>('/v1/product', { search: { store_id: storeId, part_number: p.part_no }, limit: 5, select: 'id,name,part_number' });
        hit = (r.result || []).find((x) => String(x.part_number || '').toLowerCase() === p.part_no!.toLowerCase()) || (r.result || [])[0] || null;
      } else {
        const r = await api.get<any[]>('/v1/product', { search: { store_id: storeId, name: p.name }, limit: 10, select: 'id,name,part_number' });
        hit = (r.result || []).find((x) => String(x.name || '').trim().toLowerCase() === p.name.trim().toLowerCase()) || null;
      }
      if (hit) { out[i] = { ...p, product_id: hit.id }; linked++; return; }
      const c = await api.post<any>('/v1/product', { name: p.name.trim(), ...(p.part_no ? { part_number: p.part_no } : {}), ...(p.unit ? { unit: p.unit } : {}), store_id: storeId }, { search: { store_id: storeId } });
      if (c.result?.id) { out[i] = { ...p, product_id: c.result.id }; created++; } else failed++;
    } catch { failed++; }
  };
  for (let k = 0; k < todo.length; k += concurrency) await Promise.all(todo.slice(k, k + concurrency).map(work));
  return { products: out, linked, created, failed };
}
