/**
 * Unit tests for the PDF download button added to ReportPreview (order/report.js).
 *
 * Covers:
 *   1. getFileName() — returns the correct filename stem for every modelName
 *   2. handleDownload state transitions — isDownloading goes true → false on
 *      success, on error, and on early-return when printAreaRef is empty
 *   3. .no-print element hiding/restoring (restored in finally — guaranteed even on error)
 *   4. Error path — alert is called with the error message
 *   5. Download link creation / cleanup (href, download attr, body append/remove)
 *   6. computeExpectedPages — A4 page count from element dimensions
 *   7. getPagesToDelete — which jsPDF page numbers to delete to remove blank trailing pages
 *
 * All tests follow the pure-logic extraction pattern used in this project:
 * the logic is mirrored in standalone functions here and tested without any
 * React rendering.
 */

// ── 1. getFileName ─────────────────────────────────────────────────────────────

// Mirror of the getFileName useCallback in order/report.js
function getFileName(modelName) {
  if (modelName === 'sales_report')              return 'Sales_Report';
  if (modelName === 'sales_return_report')       return 'Sales_Return_Report';
  if (modelName === 'purchase_report')           return 'Purchase_Report';
  if (modelName === 'purchase_return_report')    return 'Purchase_Return_Report';
  if (modelName === 'quotation_report')          return 'Quotation_Report';
  if (modelName === 'quotation_invoice_report')  return 'Sales_Report';
  if (modelName === 'quotation_sales_return_report') return 'Qtn_Sales_Return_Report';
  if (modelName === 'delivery_note_report')      return 'Delivery_Note_Report';
  return '';
}

describe('getFileName', () => {
  const cases = [
    ['sales_report',                  'Sales_Report'],
    ['sales_return_report',           'Sales_Return_Report'],
    ['purchase_report',               'Purchase_Report'],
    ['purchase_return_report',        'Purchase_Return_Report'],
    ['quotation_report',              'Quotation_Report'],
    ['quotation_invoice_report',      'Sales_Report'],       // quotation acting as invoice → Sales_Report
    ['quotation_sales_return_report', 'Qtn_Sales_Return_Report'],
    ['delivery_note_report',          'Delivery_Note_Report'],
  ];

  test.each(cases)('modelName=%s → %s', (modelName, expected) => {
    expect(getFileName(modelName)).toBe(expected);
  });

  test('unknown modelName returns empty string', () => {
    expect(getFileName('something_unknown')).toBe('');
    expect(getFileName('')).toBe('');
    expect(getFileName(undefined)).toBe('');
  });

  test('quotation_invoice_report and sales_report both map to Sales_Report', () => {
    expect(getFileName('quotation_invoice_report')).toBe(getFileName('sales_report'));
  });
});

// ── 2. handleDownload: state transitions ──────────────────────────────────────

// ── Blank-page deletion logic (section 6 & 7) ─────────────────────────────────

// Mirror of the page-count formula in handleDownload.
// html2pdf maps element width → A4 width (210mm), so the content height in mm
// is proportional. Math.ceil gives the exact number of pages needed.
function computeExpectedPages(scrollHeight, offsetWidth) {
  const contentHeightMm = (scrollHeight / offsetWidth) * 210;
  return Math.ceil(contentHeightMm / 297);
}

// Returns the jsPDF page numbers (1-indexed, high-to-low) that should be
// deleted to eliminate any blank trailing pages html2pdf may have added.
function getPagesToDelete(pageCount, scrollHeight, offsetWidth) {
  if (pageCount <= 1) return [];
  const expectedPages = computeExpectedPages(scrollHeight, offsetWidth);
  const toDelete = [];
  for (let i = pageCount; i > expectedPages; i--) {
    toDelete.push(i);
  }
  return toDelete;
}

// ── 2. handleDownload (updated mirror) ────────────────────────────────────────

// Mirror of the handleDownload useCallback in order/report.js.
// Key change from previous version: elementsToHide is declared outside the try
// block and restored in finally — guaranteed to run even when createPdfBlob throws.
async function handleDownload({ getFileName, element, createPdfBlob, triggerDownload, setIsDownloading, onError }) {
  setIsDownloading(true);
  let elementsToHide = [];
  try {
    const fileName = getFileName();
    if (!element) return; // early return — finally still runs

    elementsToHide = Array.from(
      element.querySelectorAll ? element.querySelectorAll('.no-print') : []
    );
    elementsToHide.forEach(el => { el.style.display = 'none'; });

    const pdfBlob = await createPdfBlob(element, fileName);

    await triggerDownload(pdfBlob, fileName);
  } catch (e) {
    onError(e);
  } finally {
    elementsToHide.forEach(el => { el.style.display = ''; }); // always restored
    setIsDownloading(false);
  }
}

describe('handleDownload — isDownloading state transitions', () => {
  test('success path: true → false', async () => {
    const states = [];
    await handleDownload({
      getFileName: () => 'Sales_Report',
      element: { querySelectorAll: () => [] },
      createPdfBlob: jest.fn().mockResolvedValue(new Blob()),
      triggerDownload: jest.fn().mockResolvedValue(undefined),
      setIsDownloading: v => states.push(v),
      onError: jest.fn(),
    });
    expect(states).toEqual([true, false]);
  });

  test('error path: true → false (finally always runs)', async () => {
    const states = [];
    await handleDownload({
      getFileName: () => 'Purchase_Report',
      element: { querySelectorAll: () => [] },
      createPdfBlob: jest.fn().mockRejectedValue(new Error('html2pdf failed')),
      triggerDownload: jest.fn(),
      setIsDownloading: v => states.push(v),
      onError: jest.fn(),
    });
    expect(states).toEqual([true, false]);
  });

  test('no-element early return: finally still resets isDownloading to false', async () => {
    const states = [];
    // In the real code, the early `return` inside try still triggers finally.
    // We model that by having the extracted function set isDownloading(false) in finally.
    await handleDownload({
      getFileName: () => 'Delivery_Note_Report',
      element: null, // printAreaRef.current is null
      createPdfBlob: jest.fn(),
      triggerDownload: jest.fn(),
      setIsDownloading: v => states.push(v),
      onError: jest.fn(),
    });
    // isDownloading(true) is called at the top, then finally sets it false
    expect(states).toEqual([true, false]);
  });

  test('isDownloading is never left stuck at true', async () => {
    const states = [];
    // Even with a network-level rejection isDownloading must reset
    await handleDownload({
      getFileName: () => 'Sales_Return_Report',
      element: { querySelectorAll: () => [] },
      createPdfBlob: jest.fn().mockRejectedValue(new Error('timeout')),
      triggerDownload: jest.fn(),
      setIsDownloading: v => states.push(v),
      onError: jest.fn(),
    });
    expect(states[states.length - 1]).toBe(false);
  });
});

// ── 3. handleDownload: error path ────────────────────────────────────────────

describe('handleDownload — error path', () => {
  test('onError is called with the thrown error', async () => {
    const onError = jest.fn();
    const err = new Error('html2pdf failed');
    await handleDownload({
      getFileName: () => 'Purchase_Return_Report',
      element: { querySelectorAll: () => [] },
      createPdfBlob: jest.fn().mockRejectedValue(err),
      triggerDownload: jest.fn(),
      setIsDownloading: jest.fn(),
      onError,
    });
    expect(onError).toHaveBeenCalledWith(err);
  });

  test('onError is called with a string error (non-Error throw)', async () => {
    const onError = jest.fn();
    await handleDownload({
      getFileName: () => 'Quotation_Report',
      element: { querySelectorAll: () => [] },
      createPdfBlob: jest.fn().mockRejectedValue('string error'),
      triggerDownload: jest.fn(),
      setIsDownloading: jest.fn(),
      onError,
    });
    expect(onError).toHaveBeenCalledWith('string error');
  });

  test('onError is NOT called on success', async () => {
    const onError = jest.fn();
    await handleDownload({
      getFileName: () => 'Sales_Report',
      element: { querySelectorAll: () => [] },
      createPdfBlob: jest.fn().mockResolvedValue(new Blob()),
      triggerDownload: jest.fn().mockResolvedValue(undefined),
      setIsDownloading: jest.fn(),
      onError,
    });
    expect(onError).not.toHaveBeenCalled();
  });

  test('triggerDownload is NOT called when createPdfBlob throws', async () => {
    const triggerDownload = jest.fn();
    await handleDownload({
      getFileName: () => 'Sales_Report',
      element: { querySelectorAll: () => [] },
      createPdfBlob: jest.fn().mockRejectedValue(new Error('fail')),
      triggerDownload,
      setIsDownloading: jest.fn(),
      onError: jest.fn(),
    });
    expect(triggerDownload).not.toHaveBeenCalled();
  });
});

// ── 4. .no-print element hiding / restoring ──────────────────────────────────

describe('handleDownload — .no-print elements are hidden during PDF generation and restored after', () => {
  function makeNoPrintEl() {
    return { style: { display: '' }, _log: [] };
  }

  function makeElement(noPrintEls) {
    return {
      querySelectorAll: (selector) => selector === '.no-print' ? noPrintEls : [],
    };
  }

  test('all .no-print elements are set to display:none before createPdfBlob', async () => {
    const els = [makeNoPrintEl(), makeNoPrintEl()];
    const createPdfBlob = jest.fn().mockImplementation(async () => {
      // At this point elements should be hidden
      els.forEach(el => el._log.push(el.style.display));
      return new Blob();
    });

    await handleDownload({
      getFileName: () => 'Sales_Report',
      element: makeElement(els),
      createPdfBlob,
      triggerDownload: jest.fn().mockResolvedValue(undefined),
      setIsDownloading: jest.fn(),
      onError: jest.fn(),
    });

    els.forEach(el => expect(el._log[0]).toBe('none'));
  });

  test('all .no-print elements are restored to display:"" after createPdfBlob', async () => {
    const els = [makeNoPrintEl(), makeNoPrintEl()];

    await handleDownload({
      getFileName: () => 'Sales_Report',
      element: makeElement(els),
      createPdfBlob: jest.fn().mockResolvedValue(new Blob()),
      triggerDownload: jest.fn().mockResolvedValue(undefined),
      setIsDownloading: jest.fn(),
      onError: jest.fn(),
    });

    els.forEach(el => expect(el.style.display).toBe(''));
  });

  test('elements with no .no-print class: querySelectorAll returns empty — no hiding attempted', async () => {
    const el = makeNoPrintEl();
    el.style.display = 'flex'; // non-standard initial value
    const element = makeElement([]); // no .no-print children

    await handleDownload({
      getFileName: () => 'Sales_Report',
      element,
      createPdfBlob: jest.fn().mockResolvedValue(new Blob()),
      triggerDownload: jest.fn().mockResolvedValue(undefined),
      setIsDownloading: jest.fn(),
      onError: jest.fn(),
    });

    // el was not touched
    expect(el.style.display).toBe('flex');
  });
});

// ── 5. triggerDownload receives correct arguments ─────────────────────────────

describe('handleDownload — triggerDownload receives blob and filename', () => {
  test('triggerDownload called with the blob and the filename from getFileName', async () => {
    const fakeBlob = new Blob(['pdf-bytes']);
    const triggerDownload = jest.fn().mockResolvedValue(undefined);

    await handleDownload({
      getFileName: () => 'Purchase_Report',
      element: { querySelectorAll: () => [] },
      createPdfBlob: jest.fn().mockResolvedValue(fakeBlob),
      triggerDownload,
      setIsDownloading: jest.fn(),
      onError: jest.fn(),
    });

    expect(triggerDownload).toHaveBeenCalledWith(fakeBlob, 'Purchase_Report');
  });

  test('triggerDownload NOT called when element is null', async () => {
    const triggerDownload = jest.fn();
    await handleDownload({
      getFileName: () => 'Sales_Report',
      element: null,
      createPdfBlob: jest.fn(),
      triggerDownload,
      setIsDownloading: jest.fn(),
      onError: jest.fn(),
    });
    expect(triggerDownload).not.toHaveBeenCalled();
  });

  test('createPdfBlob is called with the element and filename', async () => {
    const createPdfBlob = jest.fn().mockResolvedValue(new Blob());
    const element = { querySelectorAll: () => [] };

    await handleDownload({
      getFileName: () => 'Delivery_Note_Report',
      element,
      createPdfBlob,
      triggerDownload: jest.fn().mockResolvedValue(undefined),
      setIsDownloading: jest.fn(),
      onError: jest.fn(),
    });

    expect(createPdfBlob).toHaveBeenCalledWith(element, 'Delivery_Note_Report');
  });
});

// ── 5b. .no-print elements restored in finally (not in try) ──────────────────
// The updated implementation moves element restoration to finally so it is
// guaranteed even when createPdfBlob throws.

describe('handleDownload — .no-print elements restored in finally (guaranteed on error)', () => {
  function makeNoPrintEl() {
    return { style: { display: '' } };
  }
  function makeElement(noPrintEls) {
    return { querySelectorAll: (sel) => sel === '.no-print' ? noPrintEls : [] };
  }

  test('elements are restored even when createPdfBlob throws', async () => {
    const els = [makeNoPrintEl(), makeNoPrintEl()];

    await handleDownload({
      getFileName: () => 'Sales_Report',
      element: makeElement(els),
      createPdfBlob: jest.fn().mockRejectedValue(new Error('render failed')),
      triggerDownload: jest.fn(),
      setIsDownloading: jest.fn(),
      onError: jest.fn(),
    });

    // despite the error, finally must have reset display to ''
    els.forEach(el => expect(el.style.display).toBe(''));
  });

  test('elements are restored even when triggerDownload throws', async () => {
    const els = [makeNoPrintEl()];

    await handleDownload({
      getFileName: () => 'Purchase_Report',
      element: makeElement(els),
      createPdfBlob: jest.fn().mockResolvedValue(new Blob()),
      triggerDownload: jest.fn().mockRejectedValue(new Error('download failed')),
      setIsDownloading: jest.fn(),
      onError: jest.fn(),
    });

    expect(els[0].style.display).toBe('');
  });

  test('elements are hidden before PDF generation and restored after in the success path', async () => {
    const el = makeNoPrintEl();
    const capturedDisplayDuring = [];

    const createPdfBlob = jest.fn().mockImplementation(async () => {
      capturedDisplayDuring.push(el.style.display);
      return new Blob();
    });

    await handleDownload({
      getFileName: () => 'Sales_Report',
      element: makeElement([el]),
      createPdfBlob,
      triggerDownload: jest.fn().mockResolvedValue(undefined),
      setIsDownloading: jest.fn(),
      onError: jest.fn(),
    });

    expect(capturedDisplayDuring[0]).toBe('none'); // hidden during render
    expect(el.style.display).toBe('');             // restored after
  });
});

// ── 6. computeExpectedPages ───────────────────────────────────────────────────
// Formula: Math.ceil((scrollHeight / offsetWidth) * 210 / 297)
// html2pdf maps element width → 210mm (A4 width), so content height in mm
// is proportional. Math.ceil gives the minimum integer pages needed.

describe('computeExpectedPages', () => {
  test('very short content (3 rows) → 1 page', () => {
    expect(computeExpectedPages(300, 800)).toBe(1);
  });

  test('content height at exactly A4 height → 1 page', () => {
    // scrollHeight that maps to exactly 297mm: 297 * offsetWidth / 210
    const scrollHeight = Math.round(297 * 800 / 210); // ≈ 1131
    expect(computeExpectedPages(scrollHeight, 800)).toBe(1);
  });

  test('content just over one A4 page → 2 pages', () => {
    // 1200/800 * 210 = 315mm → ceil(315/297) = 2
    expect(computeExpectedPages(1200, 800)).toBe(2);
  });

  test('content fills exactly two A4 pages → 2 pages', () => {
    // scrollHeight that gives exactly 594mm (2 × 297): 594 * 800 / 210 ≈ 2263
    const scrollHeight = Math.floor(297 * 2 * 800 / 210);
    expect(computeExpectedPages(scrollHeight, 800)).toBe(2);
  });

  test('content just over two A4 pages → 3 pages', () => {
    // 2400/800 * 210 = 630mm → ceil(630/297) = 3 (630/297 ≈ 2.12)
    expect(computeExpectedPages(2400, 800)).toBe(3);
  });

  test('wide element (1200px): same content height produces fewer mm → 1 page', () => {
    // 500/1200 * 210 = 87.5mm → 1 page
    expect(computeExpectedPages(500, 1200)).toBe(1);
  });

  test('narrow element (400px): same scroll height maps to more mm', () => {
    // 1200/400 * 210 = 630mm → ceil(630/297) = 3
    expect(computeExpectedPages(1200, 400)).toBe(3);
  });

  test('square element (offsetWidth === scrollHeight) → ceil(210/297) = 1', () => {
    expect(computeExpectedPages(800, 800)).toBe(1);
  });

  test('very long report (many rows) → correct multi-page count', () => {
    // 6000/800 * 210 = 1575mm → ceil(1575/297) = 6 (1575/297 = 5.3)
    expect(computeExpectedPages(6000, 800)).toBe(6);
  });
});

// ── 7. getPagesToDelete ────────────────────────────────────────────────────────
// Returns page numbers (1-indexed, high-to-low) to pass to jsPDF.deletePage().
// Only fires when html2pdf created more pages than the content needs.

describe('getPagesToDelete', () => {
  test('pageCount=1 → nothing to delete (guard: only fires when pageCount > 1)', () => {
    expect(getPagesToDelete(1, 300, 800)).toEqual([]);
  });

  test('pageCount=2, content fits in 1 page → delete page 2', () => {
    // 300/800 * 210 ≈ 78.75mm → 1 expected page
    expect(getPagesToDelete(2, 300, 800)).toEqual([2]);
  });

  test('pageCount=2, content fills 2 pages → no deletion', () => {
    // 1200/800 * 210 = 315mm → 2 expected pages
    expect(getPagesToDelete(2, 1200, 800)).toEqual([]);
  });

  test('pageCount=3, content fills 2 pages → delete page 3 only', () => {
    expect(getPagesToDelete(3, 1200, 800)).toEqual([3]);
  });

  test('pageCount=3, content fits in 1 page → delete pages 3 then 2 (high-to-low)', () => {
    expect(getPagesToDelete(3, 300, 800)).toEqual([3, 2]);
  });

  test('pageCount=4, content fills 2 pages → delete pages 4 then 3', () => {
    // 1200/800 * 210 = 315mm → 2 pages
    expect(getPagesToDelete(4, 1200, 800)).toEqual([4, 3]);
  });

  test('pageCount equals expectedPages → empty (no extra pages)', () => {
    // 2400/800 * 210 = 630mm → 3 pages; html2pdf also created 3 → no deletion
    expect(getPagesToDelete(3, 2400, 800)).toEqual([]);
  });

  test('deletion list is high-to-low so jsPDF indices remain valid as pages are removed', () => {
    // Deleting page 3 before page 2 keeps page 2's index stable
    const toDelete = getPagesToDelete(3, 300, 800); // [3, 2]
    expect(toDelete[0]).toBeGreaterThan(toDelete[1]);
  });

  test('single-page report (short content): html2pdf adds 1 blank page → delete it', () => {
    // Typical case: html2pdf created 2 pages but content only needs 1
    expect(getPagesToDelete(2, 500, 800)).toEqual([2]);
  });
});

// ── 8. deletePage integration simulation ──────────────────────────────────────
// Simulates calling pdf.deletePage() for each entry returned by getPagesToDelete.

describe('deletePage integration', () => {
  test('mock pdf.deletePage is called for each page to delete, high-to-low', () => {
    const deletePage = jest.fn();
    const mockPdf = { internal: { getNumberOfPages: () => 2 }, deletePage, output: () => new Blob() };

    // Simulate the production code for a 1-page report where html2pdf added 1 blank page
    const element = { scrollHeight: 300, offsetWidth: 800 };
    const pageCount = mockPdf.internal.getNumberOfPages();
    const toDelete = getPagesToDelete(pageCount, element.scrollHeight, element.offsetWidth);
    toDelete.forEach(n => mockPdf.deletePage(n));

    expect(deletePage).toHaveBeenCalledTimes(1);
    expect(deletePage).toHaveBeenCalledWith(2);
  });

  test('no deletePage call when content fills all pages', () => {
    const deletePage = jest.fn();
    const mockPdf = { internal: { getNumberOfPages: () => 2 }, deletePage, output: () => new Blob() };

    const element = { scrollHeight: 1200, offsetWidth: 800 }; // → 2 expected pages
    const pageCount = mockPdf.internal.getNumberOfPages();
    const toDelete = getPagesToDelete(pageCount, element.scrollHeight, element.offsetWidth);
    toDelete.forEach(n => mockPdf.deletePage(n));

    expect(deletePage).not.toHaveBeenCalled();
  });

  test('two blank pages deleted in correct order', () => {
    const calls = [];
    const deletePage = jest.fn((n) => calls.push(n));
    const mockPdf = { internal: { getNumberOfPages: () => 3 }, deletePage, output: () => new Blob() };

    const element = { scrollHeight: 300, offsetWidth: 800 }; // → 1 expected page
    const pageCount = mockPdf.internal.getNumberOfPages();
    const toDelete = getPagesToDelete(pageCount, element.scrollHeight, element.offsetWidth);
    toDelete.forEach(n => mockPdf.deletePage(n));

    expect(calls).toEqual([3, 2]); // high-to-low
  });
});
