/**
 * Tests for pdfGenerator.js
 *
 * jsPDF is intercepted by moduleNameMapper → src/__mocks__/jspdf.js so no real
 * canvas/browser PDF APIs are needed.  Each new jsPDF() returns a fresh set of
 * jest.fn() methods; access the instance via `MockJsPDF.mock.instances[n]`.
 */

// ── numberUtils mock ──────────────────────────────────────────────────────────
jest.mock('../numberUtils', () => ({
    addCommasToInfoValue: (v) => String(v),
    stripSarBreakdown: (v) => String(v),
}));

import MockJsPDF from 'jspdf';
import { safeName, generateInfoPdf, generateSectionPdf } from '../pdfGenerator';

beforeEach(() => {
    MockJsPDF.mockClear();
});

// ── safeName — pure function ──────────────────────────────────────────────────

describe('safeName', () => {
    test('replaces spaces with underscores', () => {
        expect(safeName('hello world')).toBe('hello_world');
    });

    test('replaces special characters with underscores', () => {
        expect(safeName('Invoice #123')).toBe('Invoice_123');
    });

    test('trims leading and trailing underscores', () => {
        const result = safeName('  leading/trailing  ');
        expect(result).not.toMatch(/^_/);
        expect(result).not.toMatch(/_$/);
    });

    test('null does not throw and returns a string', () => {
        expect(() => safeName(null)).not.toThrow();
        expect(typeof safeName(null)).toBe('string');
    });

    test('undefined does not throw and returns a string', () => {
        expect(() => safeName(undefined)).not.toThrow();
        expect(typeof safeName(undefined)).toBe('string');
    });

    test('empty string returns empty string', () => {
        expect(safeName('')).toBe('');
    });

    test('plain alpha string is unchanged', () => {
        expect(safeName('abc')).toBe('abc');
    });

    test('collapses consecutive underscores to one', () => {
        expect(safeName('a__b')).toBe('a_b');
    });
});

// ── generateInfoPdf — smoke tests ────────────────────────────────────────────

describe('generateInfoPdf', () => {
    test('does not throw with minimal arguments', () => {
        expect(() =>
            generateInfoPdf('Title', 'Label', 'Value', {}, {}, {})
        ).not.toThrow();
    });

    test('returns the jsPDF doc instance', () => {
        const doc = generateInfoPdf('Title', 'Label', 'Value', {}, {}, {});
        expect(doc).toBeTruthy();
    });

    test('constructs exactly one jsPDF instance', () => {
        generateInfoPdf('Title', 'Label', 'Value', {}, {}, {});
        expect(MockJsPDF).toHaveBeenCalledTimes(1);
    });

    test('works with store name and numeric field value', () => {
        expect(() =>
            generateInfoPdf('Sales', 'Net Total', '1000', {}, {}, { name: 'My Store' })
        ).not.toThrow();
    });

    test('works with array info breakdown', () => {
        const info = [
            { label: 'Row 1', value: 100, sub_value: '' },
            { label: 'Row 2', value: 200, sub_value: '' },
        ];
        expect(() =>
            generateInfoPdf('Report', 'Total', '300', info, {}, { name: 'Store' })
        ).not.toThrow();
    });
});

// ── generateSectionPdf — smoke tests ─────────────────────────────────────────

describe('generateSectionPdf', () => {
    test('does not throw on empty input', () => {
        expect(() =>
            generateSectionPdf('Section', [], {}, {}, {})
        ).not.toThrow();
    });

    test('constructs exactly one jsPDF instance', () => {
        generateSectionPdf('Summary', [], {}, {}, { name: 'Store' });
        expect(MockJsPDF).toHaveBeenCalledTimes(1);
    });
});
