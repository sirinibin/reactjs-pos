import React from 'react';

const mockResult = jest.fn();
const mockDoc = { save: mockResult, autoPrint: jest.fn(), output: jest.fn() };

jest.mock('../pdfGenerator', () => ({
    generateSectionPdf: jest.fn(() => mockDoc),
    generateInfoPdf: jest.fn(() => mockDoc),
    safeName: jest.fn((s) => s),
}));

import { generateSectionPdf } from '../pdfGenerator';

beforeEach(() => {
    jest.clearAllMocks();
    // CRA's jest config sets resetMocks: true, which strips the
    // implementation set inside the jest.mock() factory before every test.
    // Re-establish it here so the mock keeps returning mockDoc.
    generateSectionPdf.mockReturnValue(mockDoc);
});

test('generateSectionPdf returns mockDoc after clearAllMocks', () => {
    const result = generateSectionPdf('test', []);
    console.log('result:', result);
    console.log('mockDoc:', mockDoc);
    console.log('result === mockDoc:', result === mockDoc);
    expect(generateSectionPdf).toHaveBeenCalled();
    if (result) {
        result.save('test.pdf');
        expect(mockResult).toHaveBeenCalled();
    } else {
        console.log('result is undefined/null!');
        expect(result).not.toBeUndefined();
    }
});
