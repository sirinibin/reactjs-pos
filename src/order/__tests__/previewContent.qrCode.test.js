/**
 * Unit tests for the QR code size safe-navigation fix in order/previewContentWithSellerInfo.js
 *
 * Changes covered:
 *   1. Old (crashed): props.fontSizes[props.modelName + "_qrCode"]["width"]?.size
 *      — TypeError when fontSizes["sales_qrCode"] is undefined (e.g. first render before
 *        buildInitialPrintFontSizes populates model-prefixed keys)
 *   2. New (safe):    props.fontSizes[props.modelName + "_qrCode"]?.["width"]?.size
 *      — Optional chaining on the first bracket access prevents the crash
 */

// ── Mirror functions ──────────────────────────────────────────────────────────

// Mirrors (previewContentWithSellerInfo.js — NEW safe pattern):
//   width: props.fontSizes[props.modelName + "_qrCode"]?.["width"]?.size
function getQrCodeSize(fontSizes, modelName, dimension) {
    return fontSizes[modelName + "_qrCode"]?.[dimension]?.size;
}

// Mirrors (previewContentWithSellerInfo.js — OLD broken pattern):
//   width: props.fontSizes[props.modelName + "_qrCode"]["width"]?.size
function getQrCodeSizeBroken(fontSizes, modelName, dimension) {
    return fontSizes[modelName + "_qrCode"][dimension]?.size; // missing ?. after first bracket
}

// ── 1. New safe pattern — all corner cases ────────────────────────────────────

describe('getQrCodeSize — safe optional chaining (new fix)', () => {
    test('fontSizes["sales_qrCode"] is undefined → returns undefined (no crash — was the TypeError)', () => {
        const fontSizes = {};
        expect(getQrCodeSize(fontSizes, 'sales', 'width')).toBeUndefined();
    });

    test('fontSizes["sales_qrCode"] is null → returns undefined', () => {
        const fontSizes = { sales_qrCode: null };
        expect(getQrCodeSize(fontSizes, 'sales', 'width')).toBeUndefined();
    });

    test('fontSizes["sales_qrCode"] exists but ["width"] is undefined → returns undefined', () => {
        const fontSizes = { sales_qrCode: {} };
        expect(getQrCodeSize(fontSizes, 'sales', 'width')).toBeUndefined();
    });

    test('fontSizes["sales_qrCode"]["width"] exists but size is undefined → returns undefined', () => {
        const fontSizes = { sales_qrCode: { width: {} } };
        expect(getQrCodeSize(fontSizes, 'sales', 'width')).toBeUndefined();
    });

    test('fully populated: fontSizes["sales_qrCode"]["width"]["size"] = "138px" → returns "138px"', () => {
        const fontSizes = {
            sales_qrCode: {
                width: { value: 138, unit: 'px', size: '138px', step: 1 },
            },
        };
        expect(getQrCodeSize(fontSizes, 'sales', 'width')).toBe('138px');
    });

    test('fontSizes["sales_qrCode"]["height"]["size"] = "138px" → returns "138px"', () => {
        const fontSizes = {
            sales_qrCode: {
                height: { value: 138, unit: 'px', size: '138px', step: 1 },
            },
        };
        expect(getQrCodeSize(fontSizes, 'sales', 'height')).toBe('138px');
    });

    test('empty fontSizes object → returns undefined', () => {
        expect(getQrCodeSize({}, 'sales', 'width')).toBeUndefined();
    });

    test('modelName="sales", dimension="width" → looks up key "sales_qrCode"', () => {
        const fontSizes = {
            sales_qrCode: { width: { size: '100px' } },
            quotation_qrCode: { width: { size: '999px' } },
        };
        expect(getQrCodeSize(fontSizes, 'sales', 'width')).toBe('100px');
    });

    test('modelName="quotation", dimension="height" → looks up key "quotation_qrCode"', () => {
        const fontSizes = {
            sales_qrCode: { height: { size: '100px' } },
            quotation_qrCode: { height: { size: '200px' } },
        };
        expect(getQrCodeSize(fontSizes, 'quotation', 'height')).toBe('200px');
    });

    test('modelName="purchase" → looks up key "purchase_qrCode"', () => {
        const fontSizes = {
            purchase_qrCode: { width: { size: '150px' } },
        };
        expect(getQrCodeSize(fontSizes, 'purchase', 'width')).toBe('150px');
    });

    test('size value is 0 → returns 0 (not undefined)', () => {
        const fontSizes = {
            sales_qrCode: { width: { size: 0 } },
        };
        expect(getQrCodeSize(fontSizes, 'sales', 'width')).toBe(0);
    });

    test('size value is "" → returns ""', () => {
        const fontSizes = {
            sales_qrCode: { width: { size: '' } },
        };
        expect(getQrCodeSize(fontSizes, 'sales', 'width')).toBe('');
    });
});

// ── 2. Old broken pattern — confirms the original crash ───────────────────────

describe('getQrCodeSizeBroken — old pattern (missing ?. on first bracket access)', () => {
    test('fontSizes["sales_qrCode"] is undefined → throws TypeError (confirms the original crash)', () => {
        const fontSizes = {};
        expect(() => getQrCodeSizeBroken(fontSizes, 'sales', 'width')).toThrow(TypeError);
    });

    test('fontSizes["sales_qrCode"] exists → does NOT throw (old code worked when key was present)', () => {
        const fontSizes = {
            sales_qrCode: { width: { size: '138px' } },
        };
        expect(() => getQrCodeSizeBroken(fontSizes, 'sales', 'width')).not.toThrow();
        expect(getQrCodeSizeBroken(fontSizes, 'sales', 'width')).toBe('138px');
    });
});
