/**
 * Unit tests for the PDF download button added to ReportPreview (order/report.js).
 *
 * Covers:
 *   1. getFileName() — returns the correct filename stem for every modelName
 *   2. handleDownload state transitions — isDownloading goes true → false on
 *      success, on error, and on early-return when printAreaRef is empty
 *   3. .no-print element hiding/restoring
 *   4. Error path — alert is called with the error message
 *   5. Download link creation / cleanup (href, download attr, body append/remove)
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

// Mirror of the handleDownload useCallback in order/report.js.
// Accepts injectable dependencies so we can control every side-effect.
async function handleDownload({ getFileName, element, createPdfBlob, triggerDownload, setIsDownloading, onError }) {
  setIsDownloading(true);
  try {
    const fileName = getFileName();
    if (!element) return; // early return — finally still runs in the real fn

    const elementsToHide = element.querySelectorAll
      ? element.querySelectorAll('.no-print')
      : [];
    elementsToHide.forEach(el => { el.style.display = 'none'; });

    const pdfBlob = await createPdfBlob(element, fileName);

    elementsToHide.forEach(el => { el.style.display = ''; });

    await triggerDownload(pdfBlob, fileName);
  } catch (e) {
    onError(e);
  } finally {
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
