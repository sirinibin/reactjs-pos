import React, { useState } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── Pure-logic harness: mirrors onDraftSaved / onDraftCreated in QuotationIndex,
//    OrderIndex, and PurchaseIndex (all three use the identical state pattern)
// ─────────────────────────────────────────────────────────────────────────────

describe('Draft count state logic (onDraftSaved / onDraftCreated)', () => {
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
                <button data-testid="save"   onClick={onDraftSaved}>Save Draft</button>
                <button data-testid="create" onClick={onDraftCreated}>Convert Draft</button>
                <button data-testid="toggle" onClick={() => setShowDrafts(d => !d)}>Toggle</button>
            </div>
        );
    }

    function setup() {
        render(<DraftCountHarness />);
        return {
            count:       () => parseInt(screen.getByTestId('count').textContent, 10),
            showDrafts:  () => screen.getByTestId('show').textContent,
            clickSave:   () => fireEvent.click(screen.getByTestId('save')),
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
        clickSave(); clickSave(); clickSave();
        expect(count()).toBe(3);
    });

    test('onDraftCreated decrements draftCount from 1 to 0', () => {
        const { count, clickSave, clickCreate } = setup();
        clickSave();
        clickCreate();
        expect(count()).toBe(0);
    });

    test('onDraftCreated does not decrement draftCount below 0', () => {
        const { count, clickCreate } = setup();
        clickCreate();
        expect(count()).toBe(0);
    });

    test('onDraftCreated called multiple times never shows negative count', () => {
        const { count, clickSave, clickCreate } = setup();
        clickSave();
        clickCreate(); clickCreate(); clickCreate();
        expect(count()).toBe(0);
    });

    test('onDraftCreated sets showDrafts to false', () => {
        const { showDrafts, clickSave, clickCreate, clickToggle } = setup();
        clickToggle();
        expect(showDrafts()).toBe('visible');
        clickSave();
        clickCreate();
        expect(showDrafts()).toBe('hidden');
    });

    test('draftCount correctly reflects multiple save+create cycles', () => {
        const { count, clickSave, clickCreate } = setup();
        clickSave(); clickSave();   // 2
        clickCreate();              // 1
        clickSave();                // 2
        clickCreate(); clickCreate(); // 0
        expect(count()).toBe(0);
    });
});

// ── QuotationIndex smoke: verifies draftCount/showDrafts state is properly
//    declared (undefined variables would throw on render)
// ─────────────────────────────────────────────────────────────────────────────

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

import QuotationIndex from '../index.js';

describe('QuotationIndex — draftCount/showDrafts state declared', () => {
    test('renders without crashing (draftCount and showDrafts are defined)', async () => {
        await act(async () => {
            render(<MemoryRouter><QuotationIndex /></MemoryRouter>);
        });
    });
});
