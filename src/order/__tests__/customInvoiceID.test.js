/**
 * Pure-logic tests for the Custom Sales Invoice ID feature.
 *
 * Tests the conditional display/validation rules without rendering the full
 * form, keeping the suite fast and dependency-free.
 */

// ── helpers that mirror SalesType1Form.js / order/create.js logic ─────────

/**
 * Should the Invoice ID input be shown?
 * Mirrors: store?.settings?.enable_custom_sales_invoice_id
 */
function shouldShowInvoiceInput(storeSettings) {
  return !!(storeSettings && storeSettings.enable_custom_sales_invoice_id);
}

/**
 * Mirrors the frontend validation in handleCreate:
 * if setting enabled AND it's an update AND code is empty/whitespace → error
 */
function validateInvoiceID(storeSettings, isUpdateForm, code) {
  if (
    storeSettings &&
    storeSettings.enable_custom_sales_invoice_id &&
    isUpdateForm &&
    !(code && code.trim())
  ) {
    return "Invoice ID is required";
  }
  return null;
}

/**
 * Derives the placeholder text shown in the input.
 * Mirrors the conditional placeholder in SalesType1Form.js / order/create.js.
 */
function getPlaceholder(isUpdateForm) {
  return isUpdateForm
    ? "Invoice ID (required)"
    : "Leave empty to auto-generate";
}

// ── shouldShowInvoiceInput ─────────────────────────────────────────────────

describe("shouldShowInvoiceInput", () => {
  test("returns false when storeSettings is null", () => {
    expect(shouldShowInvoiceInput(null)).toBe(false);
  });

  test("returns false when storeSettings is undefined", () => {
    expect(shouldShowInvoiceInput(undefined)).toBe(false);
  });

  test("returns false when setting is false", () => {
    expect(shouldShowInvoiceInput({ enable_custom_sales_invoice_id: false })).toBe(false);
  });

  test("returns false when setting is missing", () => {
    expect(shouldShowInvoiceInput({})).toBe(false);
  });

  test("returns true when setting is true", () => {
    expect(shouldShowInvoiceInput({ enable_custom_sales_invoice_id: true })).toBe(true);
  });

  test("returns true regardless of other settings present", () => {
    expect(
      shouldShowInvoiceInput({
        enable_warehouse_module: true,
        enable_custom_sales_invoice_id: true,
        some_other_flag: false,
      })
    ).toBe(true);
  });
});

// ── validateInvoiceID ──────────────────────────────────────────────────────

describe("validateInvoiceID — setting disabled", () => {
  const settings = { enable_custom_sales_invoice_id: false };

  test("no error on update with empty code when setting is off", () => {
    expect(validateInvoiceID(settings, true, "")).toBeNull();
  });

  test("no error on update with null code when setting is off", () => {
    expect(validateInvoiceID(settings, true, null)).toBeNull();
  });
});

describe("validateInvoiceID — setting enabled, create form", () => {
  const settings = { enable_custom_sales_invoice_id: true };

  test("no error with empty code on create (auto-generate)", () => {
    expect(validateInvoiceID(settings, false, "")).toBeNull();
  });

  test("no error with null code on create", () => {
    expect(validateInvoiceID(settings, false, null)).toBeNull();
  });

  test("no error with non-empty code on create", () => {
    expect(validateInvoiceID(settings, false, "INV-001")).toBeNull();
  });
});

describe("validateInvoiceID — setting enabled, update form", () => {
  const settings = { enable_custom_sales_invoice_id: true };

  test("error when code is empty string", () => {
    expect(validateInvoiceID(settings, true, "")).toBe("Invoice ID is required");
  });

  test("error when code is null", () => {
    expect(validateInvoiceID(settings, true, null)).toBe("Invoice ID is required");
  });

  test("error when code is whitespace only", () => {
    expect(validateInvoiceID(settings, true, "   ")).toBe("Invoice ID is required");
  });

  test("no error when code has value", () => {
    expect(validateInvoiceID(settings, true, "INV-001")).toBeNull();
  });

  test("no error when code has leading/trailing spaces but non-empty", () => {
    expect(validateInvoiceID(settings, true, "  INV-001  ")).toBeNull();
  });
});

describe("validateInvoiceID — null/undefined storeSettings", () => {
  test("no error when storeSettings is null", () => {
    expect(validateInvoiceID(null, true, "")).toBeNull();
  });

  test("no error when storeSettings is undefined", () => {
    expect(validateInvoiceID(undefined, true, "")).toBeNull();
  });
});

// ── placeholder text ───────────────────────────────────────────────────────

describe("getPlaceholder", () => {
  test("update form shows required placeholder", () => {
    expect(getPlaceholder(true)).toBe("Invoice ID (required)");
  });

  test("create form shows auto-generate hint", () => {
    expect(getPlaceholder(false)).toBe("Leave empty to auto-generate");
  });
});

// ── invariants ────────────────────────────────────────────────────────────

describe("invariants", () => {
  test("when setting is off, input is never shown regardless of form type", () => {
    const off = { enable_custom_sales_invoice_id: false };
    expect(shouldShowInvoiceInput(off)).toBe(false);
    expect(shouldShowInvoiceInput(off)).toBe(false); // create
  });

  test("when setting is on, validation only blocks empty code on update", () => {
    const on = { enable_custom_sales_invoice_id: true };
    // create: empty is always OK
    expect(validateInvoiceID(on, false, "")).toBeNull();
    // update: empty is always an error
    expect(validateInvoiceID(on, true, "")).toBe("Invoice ID is required");
    // update: non-empty is always OK
    expect(validateInvoiceID(on, true, "X")).toBeNull();
  });

  test("table of all (setting, isUpdate, code) combinations", () => {
    const on = { enable_custom_sales_invoice_id: true };
    const off = { enable_custom_sales_invoice_id: false };
    const cases = [
      // [settings, isUpdate, code, expectError]
      [off, false, "",       false],
      [off, false, "INV-1",  false],
      [off, true,  "",       false],
      [off, true,  "INV-1",  false],
      [on,  false, "",       false],
      [on,  false, "INV-1",  false],
      [on,  true,  "",       true],
      [on,  true,  "   ",    true],
      [on,  true,  "INV-1",  false],
    ];
    cases.forEach(([settings, isUpdate, code, expectError]) => {
      const result = validateInvoiceID(settings, isUpdate, code);
      if (expectError) {
        expect(result).not.toBeNull();
      } else {
        expect(result).toBeNull();
      }
    });
  });
});
