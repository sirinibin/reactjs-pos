/**
 * Unit tests for the "show selected warehouse stock in products table" feature.
 *
 * The same stock-display formula is used across every form that has a warehouse
 * selector in its selected-products table:
 *
 *   order/create.js          (sales types 1, 2, 3)
 *   order/SalesType1Form.js  (type 1 component)
 *   sales_return/create.js
 *   purchase/create.js
 *   purchase_return/create.js
 *   quotation/create.js      (type=invoice forms)
 *   quotation_sales_return/create.js
 *
 * The formula in JSX:
 *
 *   {(store.settings?.enable_warehouse_module &&
 *     store.settings?.show_warehouse_stock_in_selected_products)
 *       ? (selectedProducts[index].warehouse_stocks?.[
 *            selectedProducts[index].warehouse_code || "main_store"
 *          ] ?? selectedProducts[index].stock)
 *       : selectedProducts[index].stock}
 *
 * Also tests:
 *   - store settings checkbox visibility gate
 *     (show_warehouse_stock_in_selected_products only visible when
 *      enable_warehouse_module is true — store/create.js)
 *   - store setting checkbox toggle logic
 */

// ── Extracted logic under test ─────────────────────────────────────────────────

function getDisplayStock(settings, product) {
  if (
    settings?.enable_warehouse_module &&
    settings?.show_warehouse_stock_in_selected_products
  ) {
    return (
      product.warehouse_stocks?.[product.warehouse_code || 'main_store'] ??
      product.stock
    );
  }
  return product.stock;
}

function shouldShowWarehouseStockSetting(settings) {
  return !!settings?.enable_warehouse_module;
}

// Toggle mirrors the onChange handler in store/create.js:
//   formData.settings.show_warehouse_stock_in_selected_products =
//     !formData.settings.show_warehouse_stock_in_selected_products;
function toggleWarehouseStockSetting(settings) {
  return {
    ...settings,
    show_warehouse_stock_in_selected_products:
      !settings.show_warehouse_stock_in_selected_products,
  };
}

// ── 1. Feature disabled — always returns total stock ──────────────────────────

describe('getDisplayStock — feature disabled', () => {
  const totalStock = 42;
  const warehouseStocks = { main_store: 10, wh1: 5 };

  test('settings is null → returns product.stock', () => {
    expect(getDisplayStock(null, { stock: totalStock })).toBe(totalStock);
  });

  test('settings is undefined → returns product.stock', () => {
    expect(getDisplayStock(undefined, { stock: totalStock })).toBe(totalStock);
  });

  test('enable_warehouse_module=false → returns product.stock regardless of other flag', () => {
    const settings = {
      enable_warehouse_module: false,
      show_warehouse_stock_in_selected_products: true,
    };
    expect(
      getDisplayStock(settings, { stock: totalStock, warehouse_stocks: warehouseStocks, warehouse_code: 'wh1' })
    ).toBe(totalStock);
  });

  test('show_warehouse_stock_in_selected_products=false → returns product.stock', () => {
    const settings = {
      enable_warehouse_module: true,
      show_warehouse_stock_in_selected_products: false,
    };
    expect(
      getDisplayStock(settings, { stock: totalStock, warehouse_stocks: warehouseStocks, warehouse_code: 'wh1' })
    ).toBe(totalStock);
  });

  test('both flags false → returns product.stock', () => {
    const settings = {
      enable_warehouse_module: false,
      show_warehouse_stock_in_selected_products: false,
    };
    expect(getDisplayStock(settings, { stock: totalStock })).toBe(totalStock);
  });

  test('settings has neither flag → returns product.stock', () => {
    expect(getDisplayStock({}, { stock: totalStock })).toBe(totalStock);
  });
});

// ── 2. Feature enabled — warehouse_code variants ───────────────────────────────

const ENABLED = {
  enable_warehouse_module: true,
  show_warehouse_stock_in_selected_products: true,
};

describe('getDisplayStock — feature enabled, warehouse_code determines lookup key', () => {
  const totalStock = 100;
  const warehouseStocks = { main_store: 30, wh1: 12, wh2: 0 };

  test('warehouse_code="" (empty string) → uses "main_store" key', () => {
    const product = { stock: totalStock, warehouse_stocks: warehouseStocks, warehouse_code: '' };
    expect(getDisplayStock(ENABLED, product)).toBe(30);
  });

  test('warehouse_code=undefined → uses "main_store" key', () => {
    const product = { stock: totalStock, warehouse_stocks: warehouseStocks, warehouse_code: undefined };
    expect(getDisplayStock(ENABLED, product)).toBe(30);
  });

  test('warehouse_code="main_store" → uses "main_store" key', () => {
    const product = { stock: totalStock, warehouse_stocks: warehouseStocks, warehouse_code: 'main_store' };
    expect(getDisplayStock(ENABLED, product)).toBe(30);
  });

  test('warehouse_code="wh1" → uses "wh1" key', () => {
    const product = { stock: totalStock, warehouse_stocks: warehouseStocks, warehouse_code: 'wh1' };
    expect(getDisplayStock(ENABLED, product)).toBe(12);
  });

  test('warehouse_code="wh2", stock=0 → returns 0 (not total stock)', () => {
    const product = { stock: totalStock, warehouse_stocks: warehouseStocks, warehouse_code: 'wh2' };
    expect(getDisplayStock(ENABLED, product)).toBe(0);
  });

  test('warehouse_code="main_store", stock=0 → returns 0 (not total stock)', () => {
    const stocks = { main_store: 0, wh1: 5 };
    const product = { stock: totalStock, warehouse_stocks: stocks, warehouse_code: 'main_store' };
    expect(getDisplayStock(ENABLED, product)).toBe(0);
  });
});

// ── 3. Feature enabled — missing/null warehouse_stocks fallback ───────────────

describe('getDisplayStock — feature enabled, fallback to product.stock', () => {
  const totalStock = 55;

  test('warehouse_stocks=undefined → falls back to product.stock', () => {
    const product = { stock: totalStock, warehouse_stocks: undefined, warehouse_code: 'wh1' };
    expect(getDisplayStock(ENABLED, product)).toBe(totalStock);
  });

  test('warehouse_stocks=null → falls back to product.stock', () => {
    const product = { stock: totalStock, warehouse_stocks: null, warehouse_code: 'wh1' };
    expect(getDisplayStock(ENABLED, product)).toBe(totalStock);
  });

  test('warehouse_stocks missing the selected key → falls back to product.stock', () => {
    const product = {
      stock: totalStock,
      warehouse_stocks: { main_store: 10 }, // wh99 not present
      warehouse_code: 'wh99',
    };
    expect(getDisplayStock(ENABLED, product)).toBe(totalStock);
  });

  test('warehouse_stocks[key]=null → null ?? product.stock → falls back to product.stock', () => {
    const product = {
      stock: totalStock,
      warehouse_stocks: { wh1: null },
      warehouse_code: 'wh1',
    };
    expect(getDisplayStock(ENABLED, product)).toBe(totalStock);
  });

  test('warehouse_stocks[key]=undefined → undefined ?? product.stock → falls back to product.stock', () => {
    const product = {
      stock: totalStock,
      warehouse_stocks: { wh1: undefined },
      warehouse_code: 'wh1',
    };
    expect(getDisplayStock(ENABLED, product)).toBe(totalStock);
  });

  test('warehouse_stocks is empty object → key missing → falls back to product.stock', () => {
    const product = { stock: totalStock, warehouse_stocks: {}, warehouse_code: 'wh1' };
    expect(getDisplayStock(ENABLED, product)).toBe(totalStock);
  });
});

// ── 4. Zero stock is NOT treated as falsy ────────────────────────────────────

describe('getDisplayStock — zero warehouse stock is returned as-is (not treated as falsy)', () => {
  test('warehouse_stocks[wh1]=0 returns 0, not product.stock', () => {
    // The ?? operator only falls through on null/undefined, not 0
    const product = {
      stock: 99,
      warehouse_stocks: { wh1: 0 },
      warehouse_code: 'wh1',
    };
    expect(getDisplayStock(ENABLED, product)).toBe(0);
  });

  test('warehouse_stocks[main_store]=0 returns 0, not product.stock', () => {
    const product = {
      stock: 99,
      warehouse_stocks: { main_store: 0 },
      warehouse_code: '',
    };
    expect(getDisplayStock(ENABLED, product)).toBe(0);
  });

  test('product.stock=0 and feature disabled → 0', () => {
    expect(
      getDisplayStock({ enable_warehouse_module: false }, { stock: 0 })
    ).toBe(0);
  });
});

// ── 5. Consistency: feature off ignores warehouse_stocks ─────────────────────

describe('getDisplayStock — feature off: warehouse_stocks is irrelevant', () => {
  const settings = { enable_warehouse_module: false, show_warehouse_stock_in_selected_products: true };

  test('even with warehouse_stocks present, total stock is returned', () => {
    const product = {
      stock: 200,
      warehouse_stocks: { main_store: 1, wh1: 2 },
      warehouse_code: 'wh1',
    };
    expect(getDisplayStock(settings, product)).toBe(200);
  });
});

// ── 6. Store settings UI visibility gate ─────────────────────────────────────

describe('shouldShowWarehouseStockSetting — only visible when warehouse module is on', () => {
  test('returns true when enable_warehouse_module=true', () => {
    expect(shouldShowWarehouseStockSetting({ enable_warehouse_module: true })).toBe(true);
  });

  test('returns false when enable_warehouse_module=false', () => {
    expect(shouldShowWarehouseStockSetting({ enable_warehouse_module: false })).toBe(false);
  });

  test('returns false when settings is null', () => {
    expect(shouldShowWarehouseStockSetting(null)).toBe(false);
  });

  test('returns false when settings is undefined', () => {
    expect(shouldShowWarehouseStockSetting(undefined)).toBe(false);
  });

  test('returns false when settings is empty object', () => {
    expect(shouldShowWarehouseStockSetting({})).toBe(false);
  });

  test('coerces truthy non-boolean to true', () => {
    expect(shouldShowWarehouseStockSetting({ enable_warehouse_module: 1 })).toBe(true);
  });
});

// ── 7. Store settings toggle logic ───────────────────────────────────────────

describe('toggleWarehouseStockSetting', () => {
  test('false → true', () => {
    const settings = { enable_warehouse_module: true, show_warehouse_stock_in_selected_products: false };
    expect(toggleWarehouseStockSetting(settings).show_warehouse_stock_in_selected_products).toBe(true);
  });

  test('true → false', () => {
    const settings = { enable_warehouse_module: true, show_warehouse_stock_in_selected_products: true };
    expect(toggleWarehouseStockSetting(settings).show_warehouse_stock_in_selected_products).toBe(false);
  });

  test('does not mutate the original settings object', () => {
    const settings = { enable_warehouse_module: true, show_warehouse_stock_in_selected_products: false };
    toggleWarehouseStockSetting(settings);
    expect(settings.show_warehouse_stock_in_selected_products).toBe(false);
  });

  test('preserves other settings fields', () => {
    const settings = {
      enable_warehouse_module: true,
      show_warehouse_stock_in_selected_products: false,
      some_other_setting: 'value',
    };
    const result = toggleWarehouseStockSetting(settings);
    expect(result.some_other_setting).toBe('value');
    expect(result.enable_warehouse_module).toBe(true);
  });

  test('double toggle restores original value', () => {
    const settings = { enable_warehouse_module: true, show_warehouse_stock_in_selected_products: true };
    const result = toggleWarehouseStockSetting(toggleWarehouseStockSetting(settings));
    expect(result.show_warehouse_stock_in_selected_products).toBe(true);
  });
});

// ── 8. End-to-end scenario: switching warehouses updates displayed stock ──────

describe('getDisplayStock — realistic multi-warehouse scenarios', () => {
  const warehouseStocks = { main_store: 50, wh_riyadh: 20, wh_jeddah: 0 };

  test('user selects wh_riyadh: shows 20 instead of total', () => {
    const product = { stock: 70, warehouse_stocks: warehouseStocks, warehouse_code: 'wh_riyadh' };
    expect(getDisplayStock(ENABLED, product)).toBe(20);
  });

  test('user switches to wh_jeddah (zero stock): shows 0', () => {
    const product = { stock: 70, warehouse_stocks: warehouseStocks, warehouse_code: 'wh_jeddah' };
    expect(getDisplayStock(ENABLED, product)).toBe(0);
  });

  test('user clears selection (empty string): shows main_store stock (50)', () => {
    const product = { stock: 70, warehouse_stocks: warehouseStocks, warehouse_code: '' };
    expect(getDisplayStock(ENABLED, product)).toBe(50);
  });

  test('feature disabled during the same session: always shows total (70)', () => {
    const DISABLED = { enable_warehouse_module: true, show_warehouse_stock_in_selected_products: false };
    const product = { stock: 70, warehouse_stocks: warehouseStocks, warehouse_code: 'wh_riyadh' };
    expect(getDisplayStock(DISABLED, product)).toBe(70);
  });

  test('product with no warehouse_stocks yet: shows total regardless of selection', () => {
    const product = { stock: 70, warehouse_stocks: undefined, warehouse_code: 'wh_riyadh' };
    expect(getDisplayStock(ENABLED, product)).toBe(70);
  });
});
