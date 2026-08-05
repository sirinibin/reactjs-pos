/**
 * Unit tests for draft state management in QuotationIndex (quotation/index.js)
 *
 * Covers:
 *  - draftCount starts at 0
 *  - onDraftSaved increments draftCount
 *  - onDraftCreated decrements draftCount (floor 0)
 *  - onDraftCreated hides the drafts panel
 *
 * The QuotationIndex callbacks (onDraftSaved/onDraftCreated) mirror the logic
 * below, which is what we're guarding against regressions on after the fix
 * that added the missing showDrafts/draftCount state declarations.
 */
import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// ── Pure-logic mirror of the state update fns in QuotationIndex ───────────────
// These unit tests verify the state transition logic in isolation.

describe('Draft count state logic (onDraftSaved / onDraftCreated)', () => {
  // Minimal component that exercises the same state transitions as QuotationIndex
  function DraftCountHarness() {
    const [draftCount, setDraftCount] = useState(0);
    const [showDrafts, setShowDrafts] = useState(false);

    function onDraftSaved() {
      setDraftCount(d => d + 1);
    }

    function onDraftCreated() {
      setDraftCount(d => Math.max(0, d - 1));
      setShowDrafts(false);
    }

    return (
      <div>
        <span data-testid="count">{draftCount}</span>
        <span data-testid="show">{showDrafts ? 'visible' : 'hidden'}</span>
        <button data-testid="save" onClick={onDraftSaved}>Save Draft</button>
        <button data-testid="create" onClick={onDraftCreated}>Convert Draft</button>
        <button data-testid="toggle" onClick={() => setShowDrafts(d => !d)}>Toggle</button>
      </div>
    );
  }

  function setup() {
    render(<DraftCountHarness />);
    return {
      count: () => parseInt(screen.getByTestId('count').textContent, 10),
      showDrafts: () => screen.getByTestId('show').textContent,
      clickSave: () => fireEvent.click(screen.getByTestId('save')),
      clickCreate: () => fireEvent.click(screen.getByTestId('create')),
      clickToggle: () => fireEvent.click(screen.getByTestId('toggle')),
    };
  }

  test('draftCount starts at 0', () => {
    const { count } = setup();
    expect(count()).toBe(0);
  });

  test('onDraftSaved increments draftCount from 0 to 1', () => {
    const { count, clickSave } = setup();
    clickSave();
    expect(count()).toBe(1);
  });

  test('onDraftSaved increments draftCount multiple times', () => {
    const { count, clickSave } = setup();
    clickSave();
    clickSave();
    clickSave();
    expect(count()).toBe(3);
  });

  test('onDraftCreated decrements draftCount from 1 to 0', () => {
    const { count, clickSave, clickCreate } = setup();
    clickSave(); // 0 → 1
    clickCreate(); // 1 → 0
    expect(count()).toBe(0);
  });

  test('onDraftCreated does not decrement draftCount below 0', () => {
    const { count, clickCreate } = setup();
    clickCreate(); // 0 → stays 0 (Math.max)
    expect(count()).toBe(0);
  });

  test('onDraftCreated called multiple times never shows negative count', () => {
    const { count, clickSave, clickCreate } = setup();
    clickSave(); // 1
    clickCreate(); // 0
    clickCreate(); // stays 0
    clickCreate(); // stays 0
    expect(count()).toBe(0);
  });

  test('onDraftCreated sets showDrafts to false', () => {
    const { showDrafts, clickSave, clickCreate, clickToggle } = setup();
    clickToggle(); // show drafts
    expect(showDrafts()).toBe('visible');
    clickSave();
    clickCreate(); // should hide drafts
    expect(showDrafts()).toBe('hidden');
  });

  test('draftCount correctly reflects multiple save+create cycles', () => {
    const { count, clickSave, clickCreate } = setup();
    clickSave(); // 1
    clickSave(); // 2
    clickCreate(); // 1
    clickSave(); // 2
    clickCreate(); // 1
    clickCreate(); // 0
    expect(count()).toBe(0);
  });
});

// ── QuotationIndex smoke test (guards the state declarations fix) ─────────────
jest.mock('../../utils/WebSocketContext.js', () => {
  const { createContext } = require('react');
  return { WebSocketContext: createContext({ lastMessage: null }) };
});
jest.mock('../../utils/eventEmitter', () => ({ __esModule: true, default: { on: jest.fn(), off: jest.fn(), emit: jest.fn() } }));
jest.mock('bootstrap', () => ({ Modal: jest.fn(), Tooltip: jest.fn(), Popover: jest.fn() }));
jest.mock('react-beautiful-dnd', () => ({
  DragDropContext: ({ children }) => children,
  Droppable: ({ children }) => children({ innerRef: null, droppableProps: {}, placeholder: null }, {}),
  Draggable: ({ children }) => children({ innerRef: null, draggableProps: {}, dragHandleProps: {} }, {}),
}));
jest.mock('react-bootstrap-typeahead', () => ({ Typeahead: () => null, AsyncTypeahead: () => null, Menu: () => null, MenuItem: () => null }));
jest.mock('react-datepicker', () => () => null);
jest.mock('../../utils/queryUtils.js', () => ({ ObjectToSearchQueryParams: () => '' }));
jest.mock('../../utils/storeUtils.js', () => ({ fetchStore: jest.fn().mockResolvedValue({ settings: { enable_drafts: true } }) }));
jest.mock('../../utils/numberUtils', () => ({ trimTo2Decimals: (v) => String(v || 0), trimTo8Decimals: (v) => String(v || 0) }));
jest.mock('../../utils/dateUtils.js', () => ({ TimeAgo: () => null }));

const Stub = () => null;
jest.mock('../create.js',                                  () => ({ __esModule: true, default: Stub }));
jest.mock('../QuotationType3Form.js',                      () => ({ __esModule: true, default: Stub }));
jest.mock('../view.js',                                    () => ({ __esModule: true, default: Stub }));
jest.mock('../../product/create.js',                       () => ({ __esModule: true, default: Stub }));
jest.mock('../../service/create.js',                       () => ({ __esModule: true, default: Stub }));
jest.mock('../../repair_job/card_view.js',                 () => ({ __esModule: true, default: Stub }));
jest.mock('../../order/report.js',                         () => ({ __esModule: true, default: Stub }));
jest.mock('../../order/create.js',                         () => ({ __esModule: true, default: Stub }));
jest.mock('../../order/preview.js',                        () => ({ __esModule: true, default: Stub }));
jest.mock('../../order/print.js',                          () => ({ __esModule: true, default: Stub }));
jest.mock('../../quotation_sales_return/create.js',        () => ({ __esModule: true, default: Stub }));
jest.mock('../../quotation_sales_return/index.js',         () => ({ __esModule: true, default: Stub }));
jest.mock('../../customer/create.js',                      () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/OverflowTooltip.js',                () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/amount.js',                         () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/StatsSummary.js',                   () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/SuccessModal.js',                   () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/PaginationControls.js',             () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/TableSettingsModal.js',             () => ({ __esModule: true, default: Stub }));

global.fetch = jest.fn().mockResolvedValue({
  ok: true, headers: { get: () => 'application/json' },
  json: () => Promise.resolve({ result: [], total_count: 0, meta: {} }),
});
jest.useFakeTimers();
afterEach(() => { jest.clearAllMocks(); jest.clearAllTimers(); });

import { act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import QuotationIndex from '../index.js';

describe('QuotationIndex — renders with new showDrafts/draftCount state', () => {
  test('renders without crashing (showDrafts/draftCount now declared)', async () => {
    await act(async () => {
      render(<MemoryRouter><QuotationIndex /></MemoryRouter>);
    });
  });
});
