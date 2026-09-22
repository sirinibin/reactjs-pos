/**
 * Unit tests for Task 3: quotation_ids accumulation in handleSelectedProducts.
 *
 * We test the pure logic extracted from order/create.js handleSelectedProducts:
 * when modelName === "quotation", both the single quotation_id and the
 * quotation_ids array must be updated without duplicates.
 */

function applyQuotationLink(formData, modelID, modelCode) {
    formData.quotation_id = modelID;
    formData.quotation_code = modelCode;
    if (!formData.quotation_ids) formData.quotation_ids = [];
    if (!formData.quotation_ids.includes(modelID)) formData.quotation_ids.push(modelID);
    if (!formData.quotation_codes) formData.quotation_codes = [];
    if (!formData.quotation_codes.includes(modelCode)) formData.quotation_codes.push(modelCode);
    return formData;
}

describe('quotation_ids accumulation', () => {
    test('sets quotation_id and initialises quotation_ids array on first import', () => {
        const fd = {};
        applyQuotationLink(fd, 'qt-001', 'Q-001');
        expect(fd.quotation_id).toBe('qt-001');
        expect(fd.quotation_code).toBe('Q-001');
        expect(fd.quotation_ids).toEqual(['qt-001']);
        expect(fd.quotation_codes).toEqual(['Q-001']);
    });

    test('accumulates multiple distinct quotation IDs without losing the first', () => {
        const fd = {};
        applyQuotationLink(fd, 'qt-001', 'Q-001');
        applyQuotationLink(fd, 'qt-002', 'Q-002');
        applyQuotationLink(fd, 'qt-003', 'Q-003');
        // quotation_id points to the last imported (most recent)
        expect(fd.quotation_id).toBe('qt-003');
        expect(fd.quotation_ids).toHaveLength(3);
        expect(fd.quotation_ids).toContain('qt-001');
        expect(fd.quotation_ids).toContain('qt-002');
        expect(fd.quotation_ids).toContain('qt-003');
        expect(fd.quotation_codes).toContain('Q-001');
        expect(fd.quotation_codes).toContain('Q-003');
    });

    test('does not add duplicate IDs when the same quotation is imported twice', () => {
        const fd = {};
        applyQuotationLink(fd, 'qt-001', 'Q-001');
        applyQuotationLink(fd, 'qt-001', 'Q-001');
        expect(fd.quotation_ids).toHaveLength(1);
        expect(fd.quotation_codes).toHaveLength(1);
    });

    test('preserves existing quotation_ids when importing a new one', () => {
        const fd = { quotation_ids: ['existing-id'], quotation_codes: ['Q-000'] };
        applyQuotationLink(fd, 'qt-new', 'Q-new');
        expect(fd.quotation_ids).toEqual(['existing-id', 'qt-new']);
        expect(fd.quotation_codes).toEqual(['Q-000', 'Q-new']);
    });
});
