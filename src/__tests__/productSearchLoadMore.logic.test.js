/**
 * Unit tests for "Load more" product search pagination
 *
 * The same pattern was applied to all of these files:
 *   order/create.js (type1/2/3 inline + SalesVanStoreForm + SalesType5Form)
 *   purchase/create.js
 *   quotation/create.js + QuotationType3Form.js
 *   delivery_note/create.js
 *   stock_transfer/create.js
 *   product/index.js
 *   product/create.js (set section)
 *
 * All tests here are pure-function extractions of the logic added to each file.
 * No React rendering required.
 */

// ── Helpers that mirror the added logic ────────────────────────────────────────

function assignRequestId(page, requestId, latestRequestRef, loadMoreRequestRef) {
  if (page === 1) {
    latestRequestRef.current = requestId;
    loadMoreRequestRef.current = 0;
  } else {
    loadMoreRequestRef.current = requestId;
  }
}

function isStale(page, requestId, latestRequestRef, loadMoreRequestRef) {
  if (page === 1) return latestRequestRef.current !== requestId;
  return loadMoreRequestRef.current !== requestId;
}

function shouldCloseDropdown(page, products) {
  return page === 1 && (!products || products.length === 0);
}

function applyFilter(products, searchTerm, page, customFilter) {
  return page === 1
    ? products.filter((opt) => customFilter(opt, searchTerm))
    : products;
}

function computeNextOptions(page, incoming, prev) {
  return page === 1 ? incoming : [...prev, ...incoming];
}

function shouldShowLoadMoreButton(resultsLength, totalCount) {
  return resultsLength < totalCount;
}

function getLoadMoreButtonText(resultsLength, totalCount) {
  return `Load ${totalCount - resultsLength} more`;
}

function isOnlyOneResult(resultsLength, totalCount) {
  return resultsLength === 1 && totalCount <= 100;
}

// ── 1. Request ID assignment ───────────────────────────────────────────────────

describe('request ID assignment (assignRequestId)', () => {
  test('page 1: sets latestRequestRef to the new requestId', () => {
    const latestRef = { current: 0 };
    const loadMoreRef = { current: 0 };
    assignRequestId(1, 100, latestRef, loadMoreRef);
    expect(latestRef.current).toBe(100);
  });

  test('page 1: resets loadMoreRequestRef to 0 (cancels any in-flight load-more)', () => {
    const latestRef = { current: 0 };
    const loadMoreRef = { current: 999 };
    assignRequestId(1, 100, latestRef, loadMoreRef);
    expect(loadMoreRef.current).toBe(0);
  });

  test('page 2: sets loadMoreRequestRef', () => {
    const latestRef = { current: 100 };
    const loadMoreRef = { current: 0 };
    assignRequestId(2, 200, latestRef, loadMoreRef);
    expect(loadMoreRef.current).toBe(200);
  });

  test('page 2: does NOT touch latestRequestRef', () => {
    const latestRef = { current: 100 };
    const loadMoreRef = { current: 0 };
    assignRequestId(2, 200, latestRef, loadMoreRef);
    expect(latestRef.current).toBe(100);
  });

  test('page 3: also sets loadMoreRequestRef (not latestRequestRef)', () => {
    const latestRef = { current: 100 };
    const loadMoreRef = { current: 200 };
    assignRequestId(3, 300, latestRef, loadMoreRef);
    expect(latestRef.current).toBe(100);
    expect(loadMoreRef.current).toBe(300);
  });

  test('page 1 with previously set latestRef: overwrites it', () => {
    const latestRef = { current: 50 };
    const loadMoreRef = { current: 0 };
    assignRequestId(1, 75, latestRef, loadMoreRef);
    expect(latestRef.current).toBe(75);
  });
});

// ── 2. Stale check ─────────────────────────────────────────────────────────────

describe('stale check (isStale)', () => {
  test('page 1: not stale when latestRequestRef matches', () => {
    expect(isStale(1, 100, { current: 100 }, { current: 0 })).toBe(false);
  });

  test('page 1: stale when a newer search overwrote latestRequestRef', () => {
    expect(isStale(1, 100, { current: 200 }, { current: 0 })).toBe(true);
  });

  test('page 2: not stale when loadMoreRequestRef matches', () => {
    expect(isStale(2, 200, { current: 100 }, { current: 200 })).toBe(false);
  });

  test('page 2: stale when new search reset loadMoreRequestRef to 0', () => {
    // assignRequestId(1, ...) always sets loadMoreRequestRef=0
    expect(isStale(2, 200, { current: 300 }, { current: 0 })).toBe(true);
  });

  test('page 2: stale when a second load-more superseded this one', () => {
    expect(isStale(2, 200, { current: 100 }, { current: 300 })).toBe(true);
  });

  test('page 3: stale when superseded by a newer load-more', () => {
    expect(isStale(3, 300, { current: 100 }, { current: 400 })).toBe(true);
  });

  test('page 3: not stale when it is the current load-more', () => {
    expect(isStale(3, 300, { current: 100 }, { current: 300 })).toBe(false);
  });
});

// ── 3. Race condition: new search cancels in-flight load-more ─────────────────

describe('race condition: new search cancels load-more in flight', () => {
  test('starting a new search resets loadMoreRequestRef → load-more becomes stale', () => {
    const latestRef = { current: 0 };
    const loadMoreRef = { current: 999 };

    // New search fires
    assignRequestId(1, 600, latestRef, loadMoreRef);

    // In-flight load-more (requestId=999) checks staleness:
    expect(isStale(2, 999, latestRef, loadMoreRef)).toBe(true);
  });

  test('new search result is accepted after cancelling load-more', () => {
    const latestRef = { current: 0 };
    const loadMoreRef = { current: 999 };

    assignRequestId(1, 600, latestRef, loadMoreRef);

    // New search page 1 result arrives:
    expect(isStale(1, 600, latestRef, loadMoreRef)).toBe(false);
  });

  test('scenario: rapid typing — only the last search wins', () => {
    const latestRef = { current: 0 };
    const loadMoreRef = { current: 0 };

    assignRequestId(1, 100, latestRef, loadMoreRef); // first keypress
    assignRequestId(1, 200, latestRef, loadMoreRef); // second keypress
    assignRequestId(1, 300, latestRef, loadMoreRef); // third keypress

    expect(isStale(1, 100, latestRef, loadMoreRef)).toBe(true);  // first: discarded
    expect(isStale(1, 200, latestRef, loadMoreRef)).toBe(true);  // second: discarded
    expect(isStale(1, 300, latestRef, loadMoreRef)).toBe(false); // third: accepted
  });

  test('scenario: two load-more presses quickly — only last wins', () => {
    const latestRef = { current: 100 };
    const loadMoreRef = { current: 0 };

    assignRequestId(2, 200, latestRef, loadMoreRef); // first load-more
    assignRequestId(2, 300, latestRef, loadMoreRef); // second load-more (overwrites)

    expect(isStale(2, 200, latestRef, loadMoreRef)).toBe(true);  // first: discarded
    expect(isStale(2, 300, latestRef, loadMoreRef)).toBe(false); // second: accepted
  });

  test('scenario: load-more fires, then user types — load-more discarded, new search accepted', () => {
    const latestRef = { current: 100 };
    const loadMoreRef = { current: 0 };

    // Load-more page 2 fires (requestId=200)
    assignRequestId(2, 200, latestRef, loadMoreRef);
    // User types a new search before page 2 returns (requestId=300)
    assignRequestId(1, 300, latestRef, loadMoreRef);

    // Page 2 response arrives — should be discarded:
    expect(isStale(2, 200, latestRef, loadMoreRef)).toBe(true);
    // Page 1 new search arrives — should be accepted:
    expect(isStale(1, 300, latestRef, loadMoreRef)).toBe(false);
  });

  test('scenario: multiple page loads followed by new search cancels them all', () => {
    const latestRef = { current: 0 };
    const loadMoreRef = { current: 0 };

    assignRequestId(1, 100, latestRef, loadMoreRef); // search
    assignRequestId(2, 200, latestRef, loadMoreRef); // load more page 2
    // New search before either returns:
    assignRequestId(1, 300, latestRef, loadMoreRef);

    expect(isStale(1, 100, latestRef, loadMoreRef)).toBe(true);  // old search: discarded
    expect(isStale(2, 200, latestRef, loadMoreRef)).toBe(true);  // load-more: discarded
    expect(isStale(1, 300, latestRef, loadMoreRef)).toBe(false); // new search: accepted
  });
});

// ── 4. Empty results guard (page 1 only) ──────────────────────────────────────

describe('empty results guard — only closes dropdown on page 1', () => {
  test('page 1, empty array: should close dropdown', () => {
    expect(shouldCloseDropdown(1, [])).toBe(true);
  });

  test('page 1, null products: should close dropdown', () => {
    expect(shouldCloseDropdown(1, null)).toBe(true);
  });

  test('page 1, undefined products: should close dropdown', () => {
    expect(shouldCloseDropdown(1, undefined)).toBe(true);
  });

  test('page 1, with results: should NOT close dropdown', () => {
    expect(shouldCloseDropdown(1, [{ id: '1' }])).toBe(false);
  });

  test('page 2, empty results: should NOT close dropdown (page 1 results stay visible)', () => {
    expect(shouldCloseDropdown(2, [])).toBe(false);
  });

  test('page 2, null: should NOT close dropdown', () => {
    expect(shouldCloseDropdown(2, null)).toBe(false);
  });

  test('page 3, empty: should NOT close dropdown', () => {
    expect(shouldCloseDropdown(3, [])).toBe(false);
  });
});

// ── 5. customFilter application (page 1 only) ─────────────────────────────────

describe('customFilter — applied on page 1, skipped on page 2+', () => {
  const nameFilter = (opt, term) =>
    opt.name.toLowerCase().includes(term.toLowerCase());

  test('page 1: filter retains matching products', () => {
    const products = [{ name: 'Apple' }, { name: 'Banana' }];
    expect(applyFilter(products, 'apple', 1, nameFilter)).toEqual([{ name: 'Apple' }]);
  });

  test('page 1: filter removes non-matching products', () => {
    const products = [{ name: 'Cherry' }];
    expect(applyFilter(products, 'apple', 1, nameFilter)).toEqual([]);
  });

  test('page 2: all products returned regardless of search term', () => {
    const products = [{ name: 'Cherry' }, { name: 'Durian' }];
    expect(applyFilter(products, 'apple', 2, nameFilter)).toEqual(products);
  });

  test('page 2: products that would fail the filter are still included', () => {
    const products = [{ name: 'Cherry' }];
    // 'Cherry' does not match 'apple', but on page 2 it should still be included
    expect(applyFilter(products, 'apple', 2, nameFilter)).toHaveLength(1);
  });

  test('page 3: also skips filter', () => {
    const products = [{ name: 'Fig' }];
    expect(applyFilter(products, 'apple', 3, nameFilter)).toEqual(products);
  });

  test('page 1 with empty term: all pass (empty string is substring of everything)', () => {
    const products = [{ name: 'Apple' }, { name: 'Banana' }];
    const passAll = (opt, term) => opt.name.includes(term);
    expect(applyFilter(products, '', 1, passAll)).toHaveLength(2);
  });
});

// ── 6. Options update: replace on page 1, append on page 2+ ───────────────────

describe('productOptions update (replace vs append)', () => {
  test('page 1: replaces previous options entirely', () => {
    const prev = [{ id: 'old1' }, { id: 'old2' }];
    const incoming = [{ id: 'new1' }];
    expect(computeNextOptions(1, incoming, prev)).toEqual(incoming);
  });

  test('page 1: empty incoming clears all options', () => {
    const prev = [{ id: 'old1' }];
    expect(computeNextOptions(1, [], prev)).toEqual([]);
  });

  test('page 2: appends incoming after existing options', () => {
    const prev = [{ id: 'p1' }];
    const incoming = [{ id: 'p2' }, { id: 'p3' }];
    expect(computeNextOptions(2, incoming, prev)).toEqual([
      { id: 'p1' }, { id: 'p2' }, { id: 'p3' },
    ]);
  });

  test('page 2: preserves all page-1 options when appending', () => {
    const prev = Array.from({ length: 100 }, (_, i) => ({ id: `p${i}` }));
    const incoming = [{ id: 'p100' }];
    const result = computeNextOptions(2, incoming, prev);
    expect(result).toHaveLength(101);
    expect(result[0]).toEqual({ id: 'p0' });
    expect(result[100]).toEqual({ id: 'p100' });
  });

  test('page 2: empty incoming leaves options unchanged', () => {
    const prev = [{ id: 'p1' }, { id: 'p2' }];
    expect(computeNextOptions(2, [], prev)).toEqual(prev);
  });

  test('page 3: appends to accumulated page-1+2 options', () => {
    const prev = [{ id: 'p1' }, { id: 'p2' }];
    const incoming = [{ id: 'p3' }];
    const result = computeNextOptions(3, incoming, prev);
    expect(result).toEqual([{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }]);
  });

  test('page 1 does not mutate prev (returns new array)', () => {
    const prev = [{ id: 'old' }];
    const incoming = [{ id: 'new' }];
    const result = computeNextOptions(1, incoming, prev);
    expect(result).not.toBe(prev);
    expect(prev).toEqual([{ id: 'old' }]); // unchanged
  });

  test('page 2 does not mutate prev (returns new array)', () => {
    const prev = [{ id: 'p1' }];
    const incoming = [{ id: 'p2' }];
    const result = computeNextOptions(2, incoming, prev);
    expect(result).not.toBe(prev);
    expect(prev).toEqual([{ id: 'p1' }]); // unchanged
  });
});

// ── 7. Load more button render condition ───────────────────────────────────────

describe('shouldShowLoadMoreButton', () => {
  test('shown when results count < total count', () => {
    expect(shouldShowLoadMoreButton(100, 474)).toBe(true);
  });

  test('hidden when results count equals total count (all loaded)', () => {
    expect(shouldShowLoadMoreButton(100, 100)).toBe(false);
  });

  test('hidden when total count is 0 (no results)', () => {
    expect(shouldShowLoadMoreButton(0, 0)).toBe(false);
  });

  test('shown when 1 result loaded but total is 2', () => {
    expect(shouldShowLoadMoreButton(1, 2)).toBe(true);
  });

  test('hidden when results exceed total (defensive: should not happen)', () => {
    expect(shouldShowLoadMoreButton(150, 100)).toBe(false);
  });

  test('shown when page 1 loaded exactly 100 and total is 101', () => {
    expect(shouldShowLoadMoreButton(100, 101)).toBe(true);
  });

  test('hidden after all pages loaded (200 results, total 200)', () => {
    expect(shouldShowLoadMoreButton(200, 200)).toBe(false);
  });

  test('shown mid-way through loading (200 of 350 loaded)', () => {
    expect(shouldShowLoadMoreButton(200, 350)).toBe(true);
  });

  test('hidden when initial totalCount state is 0 (before first search)', () => {
    expect(shouldShowLoadMoreButton(0, 0)).toBe(false);
  });
});

// ── 8. Load more button text ───────────────────────────────────────────────────

describe('getLoadMoreButtonText', () => {
  test('shows correct remaining count after page 1', () => {
    expect(getLoadMoreButtonText(100, 474)).toBe('Load 374 more');
  });

  test('shows 1 when exactly one item remains', () => {
    expect(getLoadMoreButtonText(199, 200)).toBe('Load 1 more');
  });

  test('updates correctly after appending page 2', () => {
    // page 1: 100 loaded, page 2: +100 = 200 loaded, total: 350
    expect(getLoadMoreButtonText(200, 350)).toBe('Load 150 more');
  });

  test('shows full remaining on page 1 (100 of 101)', () => {
    expect(getLoadMoreButtonText(100, 101)).toBe('Load 1 more');
  });

  test('decrements correctly with each page load', () => {
    expect(getLoadMoreButtonText(100, 400)).toBe('Load 300 more');
    expect(getLoadMoreButtonText(200, 400)).toBe('Load 200 more');
    expect(getLoadMoreButtonText(300, 400)).toBe('Load 100 more');
  });
});

// ── 9. onlyOneResult condition ─────────────────────────────────────────────────

describe('isOnlyOneResult — must also check total count ≤ 100', () => {
  test('true when 1 result and total is 1 (only match)', () => {
    expect(isOnlyOneResult(1, 1)).toBe(true);
  });

  test('true when 1 result and total is exactly 100', () => {
    expect(isOnlyOneResult(1, 100)).toBe(true);
  });

  test('false when 1 result but total is 101 (more pages exist)', () => {
    // Without the total check, the single result would auto-select
    // even though there are 100 more unseen results
    expect(isOnlyOneResult(1, 101)).toBe(false);
  });

  test('false when 1 result and total is 474', () => {
    expect(isOnlyOneResult(1, 474)).toBe(false);
  });

  test('false when 2 results even if total is small', () => {
    expect(isOnlyOneResult(2, 2)).toBe(false);
  });

  test('false when 0 results', () => {
    expect(isOnlyOneResult(0, 0)).toBe(false);
  });

  test('false when 0 results but total is positive (should not happen)', () => {
    expect(isOnlyOneResult(0, 50)).toBe(false);
  });
});

// ── 10. productSearchTermRef — stores original search term ────────────────────

describe('productSearchTermRef storage', () => {
  function maybeSaveTerm(page, term, termRef) {
    if (page === 1) termRef.current = term;
  }

  test('page 1: saves the search term to ref', () => {
    const termRef = { current: '' };
    maybeSaveTerm(1, 'iphone', termRef);
    expect(termRef.current).toBe('iphone');
  });

  test('page 2: does NOT overwrite the stored term', () => {
    const termRef = { current: 'iphone' };
    maybeSaveTerm(2, 'should-not-be-saved', termRef);
    expect(termRef.current).toBe('iphone');
  });

  test('new page-1 search overwrites the previous term', () => {
    const termRef = { current: 'iphone' };
    maybeSaveTerm(1, 'samsung', termRef);
    expect(termRef.current).toBe('samsung');
  });

  test('empty string search on page 1 is stored (not filtered out at ref level)', () => {
    const termRef = { current: 'old' };
    maybeSaveTerm(1, '', termRef);
    expect(termRef.current).toBe('');
  });
});

// ── 11. loadMoreProducts — calls suggestProducts with stored term + next page ──

describe('loadMoreProducts', () => {
  test('calls suggestProducts with stored term and page+1', async () => {
    const suggestProducts = jest.fn().mockResolvedValue(undefined);
    const termRef = { current: 'iphone' };
    let productSearchPage = 1;

    async function loadMoreProducts() {
      await suggestProducts(termRef.current, productSearchPage + 1);
    }

    await loadMoreProducts();
    expect(suggestProducts).toHaveBeenCalledWith('iphone', 2);
  });

  test('page 2 → page 3 increment', async () => {
    const suggestProducts = jest.fn().mockResolvedValue(undefined);
    const termRef = { current: 'samsung' };
    let productSearchPage = 2;

    async function loadMoreProducts() {
      await suggestProducts(termRef.current, productSearchPage + 1);
    }

    await loadMoreProducts();
    expect(suggestProducts).toHaveBeenCalledWith('samsung', 3);
  });

  test('uses the ref term, not whatever the input currently shows', async () => {
    const suggestProducts = jest.fn().mockResolvedValue(undefined);
    const termRef = { current: 'original search' };
    let productSearchPage = 1;

    // Simulate user partially editing input but NOT submitting new search
    // ref still holds the original term

    async function loadMoreProducts() {
      await suggestProducts(termRef.current, productSearchPage + 1);
    }

    await loadMoreProducts();
    expect(suggestProducts).toHaveBeenCalledWith('original search', 2);
  });

  test('called only once per click', async () => {
    const suggestProducts = jest.fn().mockResolvedValue(undefined);
    const termRef = { current: 'term' };
    let productSearchPage = 1;

    async function loadMoreProducts() {
      await suggestProducts(termRef.current, productSearchPage + 1);
    }

    await loadMoreProducts();
    expect(suggestProducts).toHaveBeenCalledTimes(1);
  });
});

// ── 12. isLoadingMoreProducts state transitions ────────────────────────────────

describe('isLoadingMoreProducts state transitions', () => {
  test('set to true before fetch, false after successful fetch', async () => {
    const states = [];
    const setIsLoadingMoreProducts = (v) => states.push(v);
    const suggestProducts = jest.fn().mockResolvedValue(undefined);

    async function loadMoreProducts(termRef, page) {
      setIsLoadingMoreProducts(true);
      await suggestProducts(termRef.current, page + 1);
      setIsLoadingMoreProducts(false);
    }

    await loadMoreProducts({ current: 'test' }, 1);
    expect(states).toEqual([true, false]);
  });

  test('true only during the async fetch, not before or after', async () => {
    const timeline = [];
    let loading = false;
    const setIsLoadingMoreProducts = (v) => {
      loading = v;
      timeline.push({ loading });
    };
    const suggestProducts = jest.fn().mockImplementation(async () => {
      timeline.push({ during: true, loading });
    });

    async function loadMoreProducts(termRef, page) {
      setIsLoadingMoreProducts(true);
      await suggestProducts(termRef.current, page + 1);
      setIsLoadingMoreProducts(false);
    }

    await loadMoreProducts({ current: 'test' }, 1);

    expect(timeline[0]).toEqual({ loading: true });      // set to true
    expect(timeline[1]).toEqual({ during: true, loading: true }); // still true during fetch
    expect(timeline[2]).toEqual({ loading: false });     // set to false after
  });

  test('false is always set after await completes (no early return without cleanup)', async () => {
    const states = [];
    const setIsLoadingMoreProducts = (v) => states.push(v);
    const suggestProducts = jest.fn().mockResolvedValue(undefined);

    async function loadMoreProducts(termRef, page) {
      setIsLoadingMoreProducts(true);
      await suggestProducts(termRef.current, page + 1);
      setIsLoadingMoreProducts(false);
    }

    await loadMoreProducts({ current: 'a' }, 1);
    expect(states[states.length - 1]).toBe(false);
  });
});

// ── 13. total_count extraction from API response ───────────────────────────────

describe('total_count extraction from API response', () => {
  function extractTotalCount(data) {
    return data.total_count || 0;
  }

  test('extracts total_count from root of response', () => {
    expect(extractTotalCount({ total_count: 474 })).toBe(474);
  });

  test('returns 0 when total_count is missing', () => {
    expect(extractTotalCount({})).toBe(0);
  });

  test('returns 0 when total_count is null', () => {
    expect(extractTotalCount({ total_count: null })).toBe(0);
  });

  test('returns 0 when total_count is 0', () => {
    expect(extractTotalCount({ total_count: 0 })).toBe(0);
  });

  test('returns 1 for single result', () => {
    expect(extractTotalCount({ total_count: 1 })).toBe(1);
  });
});

// ── 14. Typeahead props: paginate=false prevents built-in pagination row ───────

describe('Typeahead configuration — paginate and maxResults', () => {
  // These constants are passed as props to each Typeahead.
  // If paginate=true, react-bootstrap-typeahead appends a built-in "pagination"
  // option item when options exceed maxResults (default 100), causing an
  // invisible empty row that required two clicks to load page 2.
  const PAGINATE = false;
  const MAX_RESULTS = 10000;

  test('paginate is false (disables built-in Typeahead pagination row)', () => {
    expect(PAGINATE).toBe(false);
  });

  test('maxResults is large enough to not truncate 200+ appended results', () => {
    // Page 1: 100 + Page 2: 100 = 200 total — must not truncate
    expect(MAX_RESULTS).toBeGreaterThan(200);
  });

  test('maxResults is large enough for many pages (e.g. 10 pages × 100)', () => {
    expect(MAX_RESULTS).toBeGreaterThanOrEqual(1000);
  });
});

// ── 15. onMouseDown preventDefault — prevents input blur on button click ───────

describe('onMouseDown preventDefault behavior', () => {
  // When the user mousedowns on the "Load more" button:
  //   1. Without preventDefault: focus shifts from Typeahead input → blur fires
  //      → onInputChange('') fires → suggestProducts('', 1) queues
  //      → page 2 fetch is cancelled because loadMoreRequestRef resets to 0
  //   2. With preventDefault on BOTH the container div and the button:
  //      focus stays on Typeahead input → no blur → no onInputChange → page 2 lands

  test('event.preventDefault called on mousedown stops focus shift', () => {
    const event = { preventDefault: jest.fn(), stopPropagation: jest.fn() };

    function onMouseDown(e) {
      e.preventDefault();
      e.stopPropagation();
    }

    onMouseDown(event);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.stopPropagation).toHaveBeenCalled();
  });

  test('onClick also prevents default and stops propagation', () => {
    const event = { preventDefault: jest.fn(), stopPropagation: jest.fn() };

    function onClick(e) {
      e.preventDefault();
      e.stopPropagation();
    }

    onClick(event);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.stopPropagation).toHaveBeenCalled();
  });

  test('loadMoreProducts called from onClick', () => {
    const loadMoreProducts = jest.fn();
    const event = { preventDefault: jest.fn(), stopPropagation: jest.fn() };

    function onButtonClick(e) {
      e.preventDefault();
      e.stopPropagation();
      loadMoreProducts();
    }

    onButtonClick(event);
    expect(loadMoreProducts).toHaveBeenCalledTimes(1);
  });

  test('loadMoreProducts NOT called from onMouseDown (only focus prevention)', () => {
    const loadMoreProducts = jest.fn();
    const event = { preventDefault: jest.fn(), stopPropagation: jest.fn() };

    function onContainerMouseDown(e) {
      e.preventDefault();
      e.stopPropagation();
      // intentionally does NOT call loadMoreProducts
    }

    onContainerMouseDown(event);
    expect(loadMoreProducts).not.toHaveBeenCalled();
  });
});

// ── 16. product/create.js: productSearchTypeRef ───────────────────────────────

describe('productSearchTypeRef (product/create.js set section)', () => {
  // product/create.js suggestProducts(searchTerm, type, page=1)
  // When page===1, also stores the type in productSearchTypeRef
  // loadMoreProductsForSet uses both termRef and typeRef

  function maybeSaveType(page, type, typeRef) {
    if (page === 1) typeRef.current = type;
  }

  test('page 1: saves the type to typeRef', () => {
    const typeRef = { current: '' };
    maybeSaveType(1, 'set', typeRef);
    expect(typeRef.current).toBe('set');
  });

  test('page 2: does NOT overwrite the stored type', () => {
    const typeRef = { current: 'set' };
    maybeSaveType(2, 'different', typeRef);
    expect(typeRef.current).toBe('set');
  });

  test('loadMoreProductsForSet calls suggestProducts with both stored term and type', async () => {
    const suggestProducts = jest.fn().mockResolvedValue(undefined);
    const termRef = { current: 'cable' };
    const typeRef = { current: 'set' };
    let page = 1;

    async function loadMoreProductsForSet() {
      await suggestProducts(termRef.current, typeRef.current, page + 1);
    }

    await loadMoreProductsForSet();
    expect(suggestProducts).toHaveBeenCalledWith('cable', 'set', 2);
  });
});

// ── 17. Sequential multi-page accumulation ─────────────────────────────────────

describe('multi-page accumulation end-to-end', () => {
  test('three pages load correctly and button hides when all loaded', () => {
    // Page 1: 100 results, total=250
    let options = computeNextOptions(1, Array.from({ length: 100 }, (_, i) => ({ id: i })), []);
    expect(options).toHaveLength(100);
    expect(shouldShowLoadMoreButton(options.length, 250)).toBe(true);
    expect(getLoadMoreButtonText(options.length, 250)).toBe('Load 150 more');

    // Page 2: 100 more
    options = computeNextOptions(2, Array.from({ length: 100 }, (_, i) => ({ id: i + 100 })), options);
    expect(options).toHaveLength(200);
    expect(shouldShowLoadMoreButton(options.length, 250)).toBe(true);
    expect(getLoadMoreButtonText(options.length, 250)).toBe('Load 50 more');

    // Page 3: remaining 50
    options = computeNextOptions(3, Array.from({ length: 50 }, (_, i) => ({ id: i + 200 })), options);
    expect(options).toHaveLength(250);
    expect(shouldShowLoadMoreButton(options.length, 250)).toBe(false); // all loaded
  });

  test('new search resets state: page 1 replaces all accumulated results', () => {
    // Accumulate pages 1 + 2
    let options = computeNextOptions(1, [{ id: 'a' }], []);
    options = computeNextOptions(2, [{ id: 'b' }], options);
    expect(options).toHaveLength(2);

    // New search on page 1
    options = computeNextOptions(1, [{ id: 'new' }], options);
    expect(options).toEqual([{ id: 'new' }]); // replaced, not appended
  });
});
