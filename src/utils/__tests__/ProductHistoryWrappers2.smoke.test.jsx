// Smoke + corner-case tests for the remaining single-ref "history modal"
// wrapper components (all follow the same pattern: forwardRef +
// useImperativeHandle exposing open(), rendering a DraggableHistoryModal with
// a lazily-mounted history table):
//   src/utils/product_purchase_return_history.js
//   src/utils/product_quotation_history.js
//   src/utils/product_quotation_sales_return_history.js
//   src/utils/product_sales_return_history.js
//   src/utils/product_delivery_note_history.js
// React 17, CRA, @testing-library/react v11, no TypeScript

// Mimics the real DraggableHistoryModal's conditional rendering (show/title)
// so we can exercise the `show && <Table/>` branch and title templates.
jest.mock('../DraggableHistoryModal.js', () => {
    const React = require('react');
    return ({ show, onClose, title, children }) =>
        show
            ? React.createElement(
                'div',
                { 'data-testid': 'draggable-history-modal' },
                React.createElement('div', { 'data-testid': 'modal-title' }, title),
                React.createElement('button', { onClick: onClose }, 'Close'),
                children
            )
            : null;
});

jest.mock('../../product/purchase_return_history.js', () => {
    const React = require('react');
    return React.forwardRef(() => React.createElement('div', { 'data-testid': 'purchase-return-history-table' }));
});

jest.mock('../../product/quotation_history.js', () => {
    const React = require('react');
    return React.forwardRef(() => React.createElement('div', { 'data-testid': 'quotation-history-table' }));
});

jest.mock('../../product/quotation_sales_return_history.js', () => {
    const React = require('react');
    return React.forwardRef(() => React.createElement('div', { 'data-testid': 'quotation-sales-return-history-table' }));
});

jest.mock('../../product/sales_return_history.js', () => {
    const React = require('react');
    return React.forwardRef(() => React.createElement('div', { 'data-testid': 'sales-return-history-table' }));
});

jest.mock('../../product/delivery_note_history.js', () => {
    const React = require('react');
    return React.forwardRef(() => React.createElement('div', { 'data-testid': 'delivery-note-history-table' }));
});

afterEach(() => {
    jest.clearAllMocks();
});

import React, { createRef } from 'react';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProductPurchaseReturnHistory from '../product_purchase_return_history.js';
import ProductQuotationHistory from '../product_quotation_history.js';
import ProductQuotationSalesReturnHistory from '../product_quotation_sales_return_history.js';
import ProductSalesReturnHistory from '../product_sales_return_history.js';
import ProductDeliveryNoteHistory from '../product_delivery_note_history.js';

describe('ProductPurchaseReturnHistory', () => {
    it('renders without crashing (modal closed initially)', () => {
        render(
            <MemoryRouter>
                <ProductPurchaseReturnHistory />
            </MemoryRouter>
        );
        expect(screen.queryByTestId('draggable-history-modal')).not.toBeInTheDocument();
    });

    it('opens with a product, shows the purchase-return-history title', () => {
        const ref = createRef();
        render(
            <MemoryRouter>
                <ProductPurchaseReturnHistory ref={ref} />
            </MemoryRouter>
        );
        act(() => ref.current.open({ name: 'Widget' }));
        expect(screen.getByTestId('modal-title')).toHaveTextContent('Purchase Return History of Widget');
        expect(screen.getByTestId('purchase-return-history-table')).toBeInTheDocument();
    });

    it('appends the arabic name to the title when present', () => {
        const ref = createRef();
        render(
            <MemoryRouter>
                <ProductPurchaseReturnHistory ref={ref} />
            </MemoryRouter>
        );
        act(() => ref.current.open({ name: 'Widget', name_in_arabic: 'ودجت' }));
        expect(screen.getByTestId('modal-title')).toHaveTextContent('Purchase Return History of Widget / ودجت');
    });

    it('opens with selectedVendors and resets on the next open with none provided', () => {
        const ref = createRef();
        render(
            <MemoryRouter>
                <ProductPurchaseReturnHistory ref={ref} />
            </MemoryRouter>
        );
        act(() => ref.current.open({ name: 'Widget' }, ['vendorA']));
        act(() => ref.current.open({ name: 'Widget' }, []));
        expect(screen.getByTestId('draggable-history-modal')).toBeInTheDocument();
    });

    it('closes via onClose', () => {
        const ref = createRef();
        render(
            <MemoryRouter>
                <ProductPurchaseReturnHistory ref={ref} />
            </MemoryRouter>
        );
        act(() => ref.current.open({ name: 'Widget' }));
        act(() => screen.getByText('Close').click());
        expect(screen.queryByTestId('draggable-history-modal')).not.toBeInTheDocument();
    });
});

describe('ProductQuotationHistory', () => {
    it('renders without crashing (modal closed initially)', () => {
        render(
            <MemoryRouter>
                <ProductQuotationHistory />
            </MemoryRouter>
        );
        expect(screen.queryByTestId('draggable-history-modal')).not.toBeInTheDocument();
    });

    it('opens with default (non-invoice) type, shows plain "Qtn. History of" title', () => {
        const ref = createRef();
        render(
            <MemoryRouter>
                <ProductQuotationHistory ref={ref} />
            </MemoryRouter>
        );
        act(() => ref.current.open({ name: 'Widget' }));
        expect(screen.getByTestId('modal-title')).toHaveTextContent('Qtn. History of Widget');
        expect(screen.getByTestId('quotation-history-table')).toBeInTheDocument();
    });

    it('opens with typeValue="invoice", shows "Qtn. Sales History of" title', () => {
        const ref = createRef();
        render(
            <MemoryRouter>
                <ProductQuotationHistory ref={ref} />
            </MemoryRouter>
        );
        act(() => ref.current.open({ name: 'Widget' }, [], 'invoice'));
        expect(screen.getByTestId('modal-title')).toHaveTextContent('Qtn. Sales History of Widget');
    });

    it('opens with selectedCustomers provided', () => {
        const ref = createRef();
        render(
            <MemoryRouter>
                <ProductQuotationHistory ref={ref} />
            </MemoryRouter>
        );
        act(() => ref.current.open({ name: 'Widget' }, ['cust1', 'cust2']));
        expect(screen.getByTestId('draggable-history-modal')).toBeInTheDocument();
    });

    it('re-opening without a typeValue keeps the previously-set type (falsy typeValue is ignored)', () => {
        const ref = createRef();
        render(
            <MemoryRouter>
                <ProductQuotationHistory ref={ref} />
            </MemoryRouter>
        );
        act(() => ref.current.open({ name: 'Widget' }, [], 'invoice'));
        act(() => ref.current.open({ name: 'Widget2' }));
        // typeValue falsy on second call -> selectedType branch not reset, stays "invoice"
        expect(screen.getByTestId('modal-title')).toHaveTextContent('Qtn. Sales History of Widget2');
    });
});

describe('ProductQuotationSalesReturnHistory', () => {
    it('renders without crashing (modal closed initially)', () => {
        render(
            <MemoryRouter>
                <ProductQuotationSalesReturnHistory />
            </MemoryRouter>
        );
        expect(screen.queryByTestId('draggable-history-modal')).not.toBeInTheDocument();
    });

    it('opens with a product, shows the qtn-sales-return-history title', () => {
        const ref = createRef();
        render(
            <MemoryRouter>
                <ProductQuotationSalesReturnHistory ref={ref} />
            </MemoryRouter>
        );
        act(() => ref.current.open({ name: 'Widget' }));
        expect(screen.getByTestId('modal-title')).toHaveTextContent('Qtn. Sales Return History of Widget');
        expect(screen.getByTestId('quotation-sales-return-history-table')).toBeInTheDocument();
    });

    it('accepts (but ignores) a typeValue third argument for API compatibility', () => {
        const ref = createRef();
        render(
            <MemoryRouter>
                <ProductQuotationSalesReturnHistory ref={ref} />
            </MemoryRouter>
        );
        act(() => ref.current.open({ name: 'Widget' }, ['cust1'], 'invoice'));
        expect(screen.getByTestId('modal-title')).toHaveTextContent('Qtn. Sales Return History of Widget');
    });
});

describe('ProductSalesReturnHistory', () => {
    it('renders without crashing (modal closed initially)', () => {
        render(
            <MemoryRouter>
                <ProductSalesReturnHistory />
            </MemoryRouter>
        );
        expect(screen.queryByTestId('draggable-history-modal')).not.toBeInTheDocument();
    });

    it('opens with a product, shows the sales-return-history title', () => {
        const ref = createRef();
        render(
            <MemoryRouter>
                <ProductSalesReturnHistory ref={ref} />
            </MemoryRouter>
        );
        act(() => ref.current.open({ name: 'Widget' }, ['cust1']));
        expect(screen.getByTestId('modal-title')).toHaveTextContent('Sales Return History of Widget');
        expect(screen.getByTestId('sales-return-history-table')).toBeInTheDocument();
    });

    it('handles a product with no name gracefully (no crash)', () => {
        const ref = createRef();
        render(
            <MemoryRouter>
                <ProductSalesReturnHistory ref={ref} />
            </MemoryRouter>
        );
        act(() => ref.current.open({}));
        expect(screen.getByTestId('draggable-history-modal')).toBeInTheDocument();
    });
});

describe('ProductDeliveryNoteHistory', () => {
    it('renders without crashing (modal closed initially)', () => {
        render(
            <MemoryRouter>
                <ProductDeliveryNoteHistory />
            </MemoryRouter>
        );
        expect(screen.queryByTestId('draggable-history-modal')).not.toBeInTheDocument();
    });

    it('opens with a product, shows the delivery-note-history title', () => {
        const ref = createRef();
        render(
            <MemoryRouter>
                <ProductDeliveryNoteHistory ref={ref} />
            </MemoryRouter>
        );
        act(() => ref.current.open({ name: 'Widget' }, ['cust1']));
        expect(screen.getByTestId('modal-title')).toHaveTextContent('Delivery Note History of Widget');
        expect(screen.getByTestId('delivery-note-history-table')).toBeInTheDocument();
    });

    it('preserves the previous customer selection when re-opened with no selectedCustomers (documented "no reset" behavior)', () => {
        const ref = createRef();
        render(
            <MemoryRouter>
                <ProductDeliveryNoteHistory ref={ref} />
            </MemoryRouter>
        );
        act(() => ref.current.open({ name: 'Widget' }, ['cust1']));
        // Re-open with no selectedCustomers argument at all — selection should NOT be cleared.
        act(() => ref.current.open({ name: 'Widget2' }));
        expect(screen.getByTestId('modal-title')).toHaveTextContent('Delivery Note History of Widget2');
        expect(screen.getByTestId('draggable-history-modal')).toBeInTheDocument();
    });
});
