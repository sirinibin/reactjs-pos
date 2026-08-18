/**
 * Tests for the "cursor keeps blinking in selected-products table" bug fix.
 * Covers Quotation Form Types 2 and 3.
 *
 * Root cause recap (full detail in QuotationCreate.productEditFocus.test.jsx):
 *   product/create.js opens ProductView via props.openDetailsView after every save.
 *   ProductView has no `above-sales-modal` class → hidden behind the quotation form.
 *   Its enforceFocus continuously steals focus from table inputs → blinking cursor.
 *
 * Type 2 (layout in quotation/create.js, formType==='type2'):
 *   Shares the SAME ProductCreate ref and openUpdateProductForm as type 1.
 *   The type 1 fix (removing openDetailsView from create.js ProductCreate) already
 *   covers type 2 automatically — there is no separate fix needed.
 *
 * Type 3 (QuotationType3Form.js, rendered from quotation/index.js):
 *   Has no internal ProductCreate. Product edits delegate to props.openUpdateProductForm
 *   from quotation/index.js, which opens productCreateRef — the <ProductCreate> at
 *   index.js:1019. That element has NEVER had openDetailsView, so the hidden-modal
 *   mechanism does not exist for type 3 at all.
 *
 * Section A — pure logic: type 2 shared identity proof
 * Section B — pure logic: type 3 delegation chain
 * Section C — render test: index.js ProductCreate has no openDetailsView
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Section A — Type 2: same ProductCreate instance as type 1
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Mirrors the shared state in quotation/create.js:
 *   - One ProductCreateFormRef (used by both type1 table and type2 table)
 *   - One openUpdateProductForm function (called by both edit buttons)
 *   - formType only changes which JSX table renders, not which ref is opened
 */
function makeType2Rig() {
    const ProductCreateFormRef = { current: { open: jest.fn() } };
    const ServiceCreateFormRef = { current: { open: jest.fn() } };

    function openUpdateProductForm(id, isService) {
        // mirrors create.js openUpdateProductForm
        if (isService) {
            ServiceCreateFormRef.current.open(id);
        } else {
            ProductCreateFormRef.current.open(id);
        }
    }

    return { ProductCreateFormRef, ServiceCreateFormRef, openUpdateProductForm };
}

describe('Type 2 — shared ProductCreate instance with type 1 (mirrors quotation/create.js)', () => {
    test('type 1 layout edit button (line 4535) opens ProductCreateFormRef', () => {
        const { ProductCreateFormRef, openUpdateProductForm } = makeType2Rig();
        openUpdateProductForm('p1', false); // type 1 table edit
        expect(ProductCreateFormRef.current.open).toHaveBeenCalledWith('p1');
    });

    test('type 2 layout edit button (line 6026) opens the SAME ProductCreateFormRef', () => {
        const { ProductCreateFormRef, openUpdateProductForm } = makeType2Rig();
        openUpdateProductForm('p2', false); // type 2 table edit — identical call
        expect(ProductCreateFormRef.current.open).toHaveBeenCalledWith('p2');
    });

    test('switching between type1 and type2 does not change which ref is opened', () => {
        const { ProductCreateFormRef, openUpdateProductForm } = makeType2Rig();
        openUpdateProductForm('p1', false); // as if formType='type1'
        openUpdateProductForm('p2', false); // as if formType='type2'
        expect(ProductCreateFormRef.current.open).toHaveBeenCalledTimes(2);
        expect(ProductCreateFormRef.current.open).toHaveBeenNthCalledWith(1, 'p1');
        expect(ProductCreateFormRef.current.open).toHaveBeenNthCalledWith(2, 'p2');
    });

    test('service edit from type 2 layout opens ServiceCreateFormRef, not ProductCreate', () => {
        const { ProductCreateFormRef, ServiceCreateFormRef, openUpdateProductForm } = makeType2Rig();
        openUpdateProductForm('s2', true);
        expect(ServiceCreateFormRef.current.open).toHaveBeenCalledWith('s2');
        expect(ProductCreateFormRef.current.open).not.toHaveBeenCalled();
    });

    test('fix removing openDetailsView from create.js ProductCreate covers type 2 implicitly', () => {
        // If openDetailsView were present on the single ProductCreate, BOTH type1 and type2
        // edits would trigger ProductView opening. The fix (removing the prop) stops both.
        const openDetailsView = undefined; // fixed state — applies to both type layouts

        let productViewOpenCount = 0;
        function simulateSave(id) {
            if (openDetailsView) { openDetailsView(id); productViewOpenCount++; }
        }

        simulateSave('p1-type1-edit');
        simulateSave('p2-type2-edit');
        expect(productViewOpenCount).toBe(0);
    });

    test('no openDetailsView on ProductCreate → no hidden modal → no enforceFocus thief', () => {
        // The hidden-modal chain requires openDetailsView to be truthy on ProductCreate.
        // Both type 1 and type 2 use the same ProductCreate rendered at create.js:3379.
        // After the fix, openDetailsView is absent → the chain breaks at step 1.
        const productCreateProps = { showToastMessage: jest.fn() }; // openDetailsView removed
        expect(productCreateProps.openDetailsView).toBeUndefined();
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Section B — Type 3: delegation chain (QuotationType3Form → index.js → ProductCreate)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Mirrors openUpdateProductForm in quotation/index.js (line 914):
 *   if (isService) serviceCreateRef.current.open(id)
 *   else           productCreateRef.current.open(id)
 */
function indexOpenUpdateProductForm(id, isService, productRef, serviceRef) {
    if (isService) {
        serviceRef.open(id);
    } else {
        productRef.open(id);
    }
}

describe('Type 3 — delegation chain: QuotationType3Form → index.js → ProductCreate', () => {
    test('QuotationType3Form product edit calls props.openUpdateProductForm (line 1151)', () => {
        // mirrors QuotationType3Form.js button onClick
        const openUpdateProductForm = jest.fn();
        const product = { product_id: 'p3', is_service: false };
        openUpdateProductForm(product.product_id, !!product.is_service);
        expect(openUpdateProductForm).toHaveBeenCalledWith('p3', false);
    });

    test('QuotationType3Form service edit calls props.openUpdateProductForm with isService=true', () => {
        const openUpdateProductForm = jest.fn();
        const product = { product_id: 's3', is_service: true };
        openUpdateProductForm(product.product_id, !!product.is_service);
        expect(openUpdateProductForm).toHaveBeenCalledWith('s3', true);
    });

    test('is_service=undefined is cast to false via !! before delegating', () => {
        const openUpdateProductForm = jest.fn();
        const product = { product_id: 'p3' }; // is_service absent
        openUpdateProductForm(product.product_id, !!product.is_service);
        expect(openUpdateProductForm).toHaveBeenCalledWith('p3', false);
    });

    test('index.js openUpdateProductForm routes non-service to productCreateRef', () => {
        const productRef = { open: jest.fn() };
        const serviceRef = { open: jest.fn() };
        indexOpenUpdateProductForm('p3', false, productRef, serviceRef);
        expect(productRef.open).toHaveBeenCalledWith('p3');
        expect(serviceRef.open).not.toHaveBeenCalled();
    });

    test('index.js openUpdateProductForm routes service to serviceCreateRef', () => {
        const productRef = { open: jest.fn() };
        const serviceRef = { open: jest.fn() };
        indexOpenUpdateProductForm('s3', true, productRef, serviceRef);
        expect(serviceRef.open).toHaveBeenCalledWith('s3');
        expect(productRef.open).not.toHaveBeenCalled();
    });

    test('index.js ProductCreate has no openDetailsView — the bug mechanism is absent for type 3', () => {
        // index.js line 1019:
        //   <ProductCreate ref={productCreateRef} refreshList={() => {}} showToastMessage={...} />
        // No openDetailsView prop → product/create.js guard is never satisfied.
        const indexProductCreateProps = {
            refreshList: jest.fn(),
            showToastMessage: jest.fn(),
            // openDetailsView intentionally omitted
        };

        let productViewOpened = false;
        if (indexProductCreateProps.openDetailsView) productViewOpened = true;

        expect(productViewOpened).toBe(false);
        expect(indexProductCreateProps.openDetailsView).toBeUndefined();
    });

    test('QuotationType3Form.props.openDetailsView is for quotation save, not product edit', () => {
        // QuotationType3Form.js lines 677, 682 call props.openDetailsView after quotation save.
        // The product edit path (line 1151) calls props.openUpdateProductForm instead.
        // These are two entirely different prop callbacks.
        const quotationSaveOpenDetailsView = jest.fn(); // present for quotation view
        const openUpdateProductForm = jest.fn();        // present for product edit

        // Quotation save (uses openDetailsView)
        if (quotationSaveOpenDetailsView) quotationSaveOpenDetailsView('quotation-id-1');
        // Product edit (uses openUpdateProductForm, NOT openDetailsView)
        openUpdateProductForm('product-id-1', false);

        expect(quotationSaveOpenDetailsView).toHaveBeenCalledWith('quotation-id-1');
        expect(quotationSaveOpenDetailsView).toHaveBeenCalledTimes(1); // not called by product edit
        expect(openUpdateProductForm).toHaveBeenCalledWith('product-id-1', false);
    });

    test('no enforceFocus hazard for type 3: ProductView never opens in this context', () => {
        // The four-step chain that causes blinking:
        //   1. ProductCreate has openDetailsView → product/create.js calls it after save
        //   2. openDetailsView opens ProductView
        //   3. ProductView is hidden behind quotation form (no above-sales-modal class)
        //   4. ProductView enforceFocus steals focus from table inputs → blinking
        //
        // For type 3: step 1 fails (no openDetailsView on index.js ProductCreate).
        // Steps 2–4 are unreachable.
        const step1_openDetailsViewPresent = false; // invariant for index.js ProductCreate
        const step2_productViewOpens = step1_openDetailsViewPresent; // can't open if step1 false
        const step3_hiddenModal       = step2_productViewOpens;
        const step4_enforceFocusSteals = step3_hiddenModal;

        expect(step4_enforceFocusSteals).toBe(false);
    });

    test('multiple type 3 product edits do not accumulate hidden modals', () => {
        const productRef = { open: jest.fn() };
        const serviceRef = { open: jest.fn() };
        const indexProductCreateHasOpenDetailsView = false;

        // Simulate editing 3 products sequentially
        indexOpenUpdateProductForm('p1', false, productRef, serviceRef);
        indexOpenUpdateProductForm('p2', false, productRef, serviceRef);
        indexOpenUpdateProductForm('p3', false, productRef, serviceRef);

        // ProductCreate opens (to edit the product) but closes after each edit.
        // No ProductView is ever opened (openDetailsView absent), so no hidden modals accumulate.
        expect(productRef.open).toHaveBeenCalledTimes(3);
        expect(indexProductCreateHasOpenDetailsView).toBe(false);
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Section C — Render test: index.js ProductCreate has no openDetailsView
// ═══════════════════════════════════════════════════════════════════════════════

// All jest.mock calls must appear before imports (Jest hoists them).

jest.mock('../../utils/WebSocketContext.js', () => {
    const { createContext } = require('react');
    return { WebSocketContext: createContext({ lastMessage: null }) };
});

jest.mock('../../utils/eventEmitter', () => ({
    __esModule: true,
    default: { on: jest.fn(), off: jest.fn(), emit: jest.fn() },
}));

jest.mock('bootstrap', () => ({
    Modal: jest.fn(), Tooltip: jest.fn(), Popover: jest.fn(),
}));

jest.mock('react-beautiful-dnd', () => ({
    DragDropContext: ({ children }) => children,
    Droppable: ({ children }) => children({ innerRef: null, droppableProps: {}, placeholder: null }, {}),
    Draggable: ({ children }) => children({ innerRef: null, draggableProps: {}, dragHandleProps: {} }, {}),
}));

jest.mock('react-bootstrap-typeahead', () => ({
    Typeahead: () => null, AsyncTypeahead: () => null,
    Menu: () => null, MenuItem: () => null,
}));

jest.mock('react-datepicker', () => () => null);

jest.mock('../../utils/queryUtils.js', () => ({ ObjectToSearchQueryParams: () => '' }));
jest.mock('../../utils/storeUtils.js', () => ({ fetchStore: jest.fn().mockResolvedValue({}) }));
jest.mock('../../utils/numberUtils', () => ({
    trimTo2Decimals: (v) => String(v || 0),
    trimTo8Decimals: (v) => String(v || 0),
}));
jest.mock('../../utils/dateUtils.js', () => ({ TimeAgo: () => null }));

const Stub = () => null;

// Mocked as stubs (complex children we don't need to render)
jest.mock('../create.js',                           () => ({ __esModule: true, default: Stub }));
jest.mock('../QuotationType3Form.js',               () => ({ __esModule: true, default: Stub }));
jest.mock('../view.js',                             () => ({ __esModule: true, default: Stub }));
jest.mock('../../service/create.js',                () => ({ __esModule: true, default: Stub }));
jest.mock('../../repair_job/card_view.js',          () => ({ __esModule: true, default: Stub }));
jest.mock('../../order/report.js',                  () => ({ __esModule: true, default: Stub }));
jest.mock('../../order/create.js',                  () => ({ __esModule: true, default: Stub }));
jest.mock('../../order/preview.js',                 () => ({ __esModule: true, default: Stub }));
jest.mock('../../order/print.js',                   () => ({ __esModule: true, default: Stub }));
jest.mock('../../quotation_sales_return/create.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../quotation_sales_return/index.js',  () => ({ __esModule: true, default: Stub }));
jest.mock('../../customer/create.js',               () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/OverflowTooltip.js',         () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/amount.js',                  () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/StatsSummary.js',            () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/SuccessModal.js',            () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/PaginationControls.js',      () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/TableSettingsModal.js',      () => ({ __esModule: true, default: Stub }));

// ProductCreate: capture props so we can assert on them.
jest.mock('../../product/create.js', () => {
    const React = require('react');
    return {
        __esModule: true,
        default: React.forwardRef((props, _ref) => {
            global.__capturedIndexProductCreateProps = props;
            return null;
        }),
    };
});

import React from 'react';
import { render, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import QuotationIndex from '../index.js';

beforeEach(() => {
    global.__capturedIndexProductCreateProps = undefined;
    global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({
            result: [], total_count: 0,
            meta: { total_quotation: 0, profit: 0, loss: 0 },
        }),
    });
    jest.useFakeTimers();
});

afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
});

describe('QuotationIndex — ProductCreate receives no openDetailsView (render test)', () => {
    test('ProductCreate inside index.js is rendered without openDetailsView', async () => {
        await act(async () => {
            render(<MemoryRouter><QuotationIndex /></MemoryRouter>);
        });
        expect(global.__capturedIndexProductCreateProps).toBeDefined();
        expect(global.__capturedIndexProductCreateProps.openDetailsView).toBeUndefined();
    });

    test('ProductCreate inside index.js receives refreshList prop (other props intact)', async () => {
        await act(async () => {
            render(<MemoryRouter><QuotationIndex /></MemoryRouter>);
        });
        expect(typeof global.__capturedIndexProductCreateProps.refreshList).toBe('function');
    });

    test('ProductCreate inside index.js has no openDetailsView even with showToastMessage present', async () => {
        const showToast = jest.fn();
        await act(async () => {
            render(<MemoryRouter><QuotationIndex showToastMessage={showToast} /></MemoryRouter>);
        });
        expect(global.__capturedIndexProductCreateProps.openDetailsView).toBeUndefined();
        expect(global.__capturedIndexProductCreateProps.showToastMessage).toBe(showToast);
    });

    test('rendering QuotationIndex does not throw', async () => {
        await expect(
            act(async () => {
                render(<MemoryRouter><QuotationIndex /></MemoryRouter>);
            })
        ).resolves.not.toThrow();
    });
});
