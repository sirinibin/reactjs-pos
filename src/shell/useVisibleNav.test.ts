import { describe, expect, it } from 'vitest';
import { inPackage } from './useVisibleNav';

describe('customer package menu filter', () => {
  it('admins and stores without a package see everything', () => {
    expect(inPackage('sales', ['customers'], true)).toBe(true);
    expect(inPackage('sales', [], false)).toBe(true);
    expect(inPackage('sales', undefined, false)).toBe(true);
  });
  it('non-admins only see listed ids', () => {
    expect(inPackage('sales', ['sales', 'customers'], false)).toBe(true);
    expect(inPackage('purchases', ['sales', 'customers'], false)).toBe(false);
  });
  it('v2-only pages follow their legacy parent', () => {
    expect(inPackage('sales_payments', ['sales'], false)).toBe(true);
    expect(inPackage('purchase_payments', ['sales'], false)).toBe(false);
    expect(inPackage('menu_settings', ['sales'], false)).toBe(true);
  });
});
