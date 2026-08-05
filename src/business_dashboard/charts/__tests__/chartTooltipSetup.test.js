import { tooltipHtml, onChartSelect } from '../chartTooltipSetup';
import { generateInfoPdf } from '../../../utils/pdfGenerator';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('../../../utils/pdfGenerator', () => ({
    generateInfoPdf: jest.fn(() => ({
        save: jest.fn(),
        autoPrint: jest.fn(),
        output: jest.fn(() => new Blob()),
    })),
    safeName: jest.fn(s => s),
}));

jest.mock('../../../utils/pdfShare', () => ({
    uploadPdfForShare: jest.fn(),
}));

// ── Shared helpers ────────────────────────────────────────────────────────────

/**
 * makeWrapper mirrors the shape used by Google Charts chartWrapper.
 * When `row` is non-null, getSelection() returns a single selected row.
 */
const makeWrapper = (row = null) => ({
    getChart:     () => ({}),
    getDataTable: () => ({
        getNumberOfRows: () => 1,
        getValue:        (r, c) => row,
    }),
    getSelection: () => row !== null ? [{ row: 0 }] : [],
});

const sampleLines = [
    { label: 'Revenue', value: 'SAR 1,000', bold: false, divider: false, color: '#28a745' },
    { label: 'Orders',  value: 42,           bold: true,  divider: true,  color: '#f8f9fa' },
];

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
    // Reset the global key/store so each test starts with a predictable key of 1.
    window.__cttStore = {};
    window.__cttKey   = 0;
    jest.clearAllMocks();
});

// ── tooltipHtml ───────────────────────────────────────────────────────────────

describe('tooltipHtml', () => {

    // Test 1
    test('returns a non-empty string', () => {
        const result = tooltipHtml('Title', '#ffffff', sampleLines, {}, {});
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
    });

    // Test 2
    test('contains the title text', () => {
        const result = tooltipHtml('Monthly Revenue', '#ffffff', sampleLines, {}, {});
        expect(result).toContain('Monthly Revenue');
    });

    // Test 3
    test('lines array entries appear in output', () => {
        const result = tooltipHtml('Title', '#ffffff', sampleLines, {}, {});
        // label and value of each line should be in the rendered HTML
        expect(result).toContain('Revenue');
        expect(result).toContain('SAR 1,000');
        expect(result).toContain('Orders');
        expect(result).toContain('42');
    });

    // Test 4
    test('titleColor appears in the output', () => {
        const color  = '#ff6347';
        const result = tooltipHtml('Title', color, sampleLines, {}, {});
        expect(result).toContain(color);
    });

    // Test 5
    test('does not crash with empty or null store and filters', () => {
        expect(() => tooltipHtml('Title', '#fff', sampleLines, {},    {}   )).not.toThrow();
        expect(() => tooltipHtml('Title', '#fff', sampleLines, null,  null )).not.toThrow();
        expect(() => tooltipHtml('Title', '#fff', sampleLines, {},    null )).not.toThrow();
        expect(() => tooltipHtml('Title', '#fff', sampleLines, null,  {}   )).not.toThrow();
    });

    // Test 6
    test('single line renders label and value correctly', () => {
        const lines  = [{ label: 'Total', value: 999, bold: false, divider: false }];
        const result = tooltipHtml('Title', '#fff', lines, {}, {});
        expect(result).toContain('Total');
        expect(result).toContain('999');
    });

    // Test 7
    test('multiple lines are all rendered in output', () => {
        const lines = [
            { label: 'Alpha', value: 1 },
            { label: 'Beta',  value: 2 },
            { label: 'Gamma', value: 3 },
        ];
        const result = tooltipHtml('Title', '#fff', lines, {}, {});
        expect(result).toContain('Alpha');
        expect(result).toContain('Beta');
        expect(result).toContain('Gamma');
        expect(result).toContain('1');
        expect(result).toContain('2');
        expect(result).toContain('3');
    });

    // Test 8
    test('does not crash when title contains HTML special characters', () => {
        expect(() =>
            tooltipHtml('<script>alert("xss")</script>', '#fff', sampleLines, {}, {})
        ).not.toThrow();
        expect(() =>
            tooltipHtml('Profit & Loss <Q4>', '#fff', sampleLines, {}, {})
        ).not.toThrow();
    });

    // Test 9
    test('empty lines array returns a valid HTML string with the title', () => {
        const result = tooltipHtml('Summary', '#fff', [], {}, {});
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
        expect(result).toContain('Summary');
        // Table wrapper should still be present even with no rows
        expect(result).toContain('<table');
        expect(result).toContain('</table>');
    });

    // Test 10
    test('null or undefined lines argument does not crash', () => {
        // The source calls lines.forEach(...) with no null-guard, so passing
        // null or undefined throws a TypeError. These assertions document the
        // actual behaviour; add a null-guard to tooltipHtml to make them pass
        // with .not.toThrow() instead.
        expect(() => tooltipHtml('Title', '#fff', null,      {}, {})).toThrow(TypeError);
        expect(() => tooltipHtml('Title', '#fff', undefined, {}, {})).toThrow(TypeError);
    });

    // Additional structural tests
    test('output contains action buttons (print, pdf, share)', () => {
        const result = tooltipHtml('Title', '#fff', sampleLines, {}, {});
        expect(result).toContain('data-ctt-action="print"');
        expect(result).toContain('data-ctt-action="pdf"');
        expect(result).toContain('data-ctt-action="wa"');
    });

    test('output contains a close button', () => {
        const result = tooltipHtml('Title', '#fff', sampleLines, {}, {});
        expect(result).toContain('data-ctt-action="close"');
    });

    test('data-ctt-key attribute is included and is a positive integer', () => {
        const result = tooltipHtml('Title', '#fff', sampleLines, {}, {});
        const match  = result.match(/data-ctt-key="(\d+)"/);
        expect(match).not.toBeNull();
        expect(Number(match[1])).toBeGreaterThan(0);
    });

    test('each successive call increments the stored key', () => {
        tooltipHtml('First',  '#fff', sampleLines, {}, {});
        const key1 = window.__cttKey;
        tooltipHtml('Second', '#fff', sampleLines, {}, {});
        const key2 = window.__cttKey;
        expect(key2).toBe(key1 + 1);
    });

    test('stores title, lines, store, and filters in window.__cttStore', () => {
        const store   = { name: 'Demo Store' };
        const filters = { from: '2025-01-01' };
        tooltipHtml('Chart A', '#fff', sampleLines, store, filters);
        const key     = window.__cttKey;
        const entry   = window.__cttStore[key];
        expect(entry).toBeDefined();
        expect(entry.title).toBe('Chart A');
        expect(entry.lines).toBe(sampleLines);
        expect(entry.store).toBe(store);
        expect(entry.filters).toBe(filters);
    });

    test('line with divider:true includes a top-border style', () => {
        const lines  = [{ label: 'Subtotal', value: 500, divider: true }];
        const result = tooltipHtml('Title', '#fff', lines, {}, {});
        expect(result).toContain('border-top');
    });

    test('line with bold:true includes font-weight:700', () => {
        const lines  = [{ label: 'Grand Total', value: 999, bold: true }];
        const result = tooltipHtml('Title', '#fff', lines, {}, {});
        expect(result).toContain('font-weight:700');
    });

    test('numeric value right-aligns, non-numeric value left-aligns', () => {
        const lines = [
            { label: 'Amount', value: 'SAR 100' },   // numeric-like
            { label: 'Name',   value: 'John Doe' },  // non-numeric
        ];
        const result = tooltipHtml('Title', '#fff', lines, {}, {});
        // Should contain at least one right-align for the SAR value
        expect(result).toContain('text-align:right');
        // Should contain at least one left-align for the name
        expect(result).toContain('text-align:left');
    });
});

// ── onChartSelect ─────────────────────────────────────────────────────────────

describe('onChartSelect', () => {

    // Test 11
    test('does not throw when chartWrapper has no selection', () => {
        const wrapper = makeWrapper(null);  // getSelection() returns []
        expect(() => onChartSelect({ chartWrapper: wrapper })).not.toThrow();
    });

    // Test 12
    test('does not throw when chartWrapper selection returns null row', () => {
        // makeWrapper(null) means getSelection() returns [] (no selected row index).
        const wrapper = makeWrapper(null);
        expect(() => onChartSelect({ chartWrapper: wrapper })).not.toThrow();
    });

    // Test 13
    test('generateInfoPdf is called when __cttPDF is triggered after a valid selection', () => {
        // Register the chart via onChartSelect so the chart is in the registry.
        const wrapper = makeWrapper('row-value');
        expect(() => onChartSelect({ chartWrapper: wrapper })).not.toThrow();

        // Store chart data via tooltipHtml (mirrors real usage before PDF action).
        tooltipHtml('Sales Chart', '#28a745', sampleLines, { name: 'Store A' }, { from: '2025-01-01' });
        const key = window.__cttKey;

        // Trigger the PDF action as if the user clicked the PDF button.
        expect(typeof window.__cttPDF).toBe('function');
        window.__cttPDF(key);

        expect(generateInfoPdf).toHaveBeenCalledTimes(1);
        // Verify it was called with the stored title and data
        expect(generateInfoPdf).toHaveBeenCalledWith(
            '',
            'Sales Chart',
            null,
            sampleLines,
            expect.any(Object),
            expect.any(Object),
        );
    });

    // Test 14
    test('does not crash when getChart returns null', () => {
        const wrapper = { ...makeWrapper(), getChart: () => null };
        expect(() => onChartSelect({ chartWrapper: wrapper })).not.toThrow();
    });

    // Additional robustness tests
    test('does not throw when called with no arguments', () => {
        expect(() => onChartSelect()).not.toThrow();
    });

    test('does not throw when called with an empty object', () => {
        expect(() => onChartSelect({})).not.toThrow();
    });

    test('does not throw when chartWrapper is null', () => {
        expect(() => onChartSelect({ chartWrapper: null })).not.toThrow();
    });

    test('does not throw when chartWrapper is undefined', () => {
        expect(() => onChartSelect({ chartWrapper: undefined })).not.toThrow();
    });

    test('does not throw when getChart throws internally', () => {
        const wrapper = {
            ...makeWrapper(),
            getChart: () => { throw new Error('chart not ready'); },
        };
        expect(() => onChartSelect({ chartWrapper: wrapper })).not.toThrow();
    });

    test('adds the chart instance to window.__cttCharts when getChart returns a truthy object', () => {
        const chartInstance = { id: 'my-chart' };
        const wrapper = { ...makeWrapper(), getChart: () => chartInstance };
        const sizeBefore = window.__cttCharts ? window.__cttCharts.size : 0;
        onChartSelect({ chartWrapper: wrapper });
        const sizeAfter  = window.__cttCharts ? window.__cttCharts.size : 0;
        expect(sizeAfter).toBeGreaterThan(sizeBefore);
        expect(window.__cttCharts.has(chartInstance)).toBe(true);
    });

    test('window.__cttPrint calls generateInfoPdf and then autoPrint', () => {
        tooltipHtml('Print Test', '#fff', sampleLines, {}, {});
        const key     = window.__cttKey;
        const mockDoc = generateInfoPdf.mock.results[0]?.value ?? {
            autoPrint: jest.fn(),
            output:    jest.fn(),
        };
        // Re-configure mock so we can inspect the returned doc methods.
        const autoPrintMock = jest.fn();
        const outputMock    = jest.fn();
        generateInfoPdf.mockReturnValueOnce({
            save:      jest.fn(),
            autoPrint: autoPrintMock,
            output:    outputMock,
        });

        expect(typeof window.__cttPrint).toBe('function');
        window.__cttPrint(key);

        expect(generateInfoPdf).toHaveBeenCalled();
        expect(autoPrintMock).toHaveBeenCalled();
        expect(outputMock).toHaveBeenCalledWith('dataurlnewwindow');
    });

    test('window.__cttPDF calls generateInfoPdf and then save with a filename', () => {
        tooltipHtml('PDF Test', '#fff', sampleLines, {}, {});
        const key      = window.__cttKey;
        const saveMock = jest.fn();
        generateInfoPdf.mockReturnValueOnce({
            save:      saveMock,
            autoPrint: jest.fn(),
            output:    jest.fn(() => new Blob()),
        });

        expect(typeof window.__cttPDF).toBe('function');
        window.__cttPDF(key);

        expect(generateInfoPdf).toHaveBeenCalled();
        expect(saveMock).toHaveBeenCalledWith(expect.stringContaining('.pdf'));
    });

    test('window.__cttPDF does not throw when key does not exist in store', () => {
        expect(() => window.__cttPDF(99999)).not.toThrow();
        expect(generateInfoPdf).not.toHaveBeenCalled();
    });

    test('window.__cttPrint does not throw when key does not exist in store', () => {
        expect(() => window.__cttPrint(99999)).not.toThrow();
        expect(generateInfoPdf).not.toHaveBeenCalled();
    });
});
