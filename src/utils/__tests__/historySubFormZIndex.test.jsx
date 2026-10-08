// Tests for the z-index fix: history modal sub-forms must appear above the
// DraggableHistoryModal (z-index 1150) in all nesting contexts.
//
// Invariant: every product_*_history.js wrapper must ALWAYS pass
// subFormModalClass="above-inner-history-form" to its table component,
// regardless of the extraClass prop (old code only passed it conditionally
// when extraClass === "order-inner-history-modal", leaving the class empty
// when opened from customer-pendings which passes extraClass="").
//
// React 17, CRA, @testing-library/react v11, no TypeScript

// ── table-component mocks — capture the subFormModalClass prop ────────────────
let capturedSalesSubFormClass;
let capturedSalesReturnSubFormClass;
let capturedPurchaseSubFormClass;
let capturedPurchaseReturnSubFormClass;
let capturedDeliveryNoteSubFormClass;
let capturedQuotationSubFormClass;
let capturedQuotationSalesReturnSubFormClass;
let capturedProductHistorySubFormClass;

jest.mock('../../product/sales_history.js', () => {
    const React = require('react');
    return React.forwardRef((props, _ref) => {
        capturedSalesSubFormClass = props.subFormModalClass;
        return React.createElement('div', { 'data-testid': 'sales-history-table' });
    });
});

jest.mock('../../product/sales_return_history.js', () => {
    const React = require('react');
    return React.forwardRef((props, _ref) => {
        capturedSalesReturnSubFormClass = props.subFormModalClass;
        return React.createElement('div', { 'data-testid': 'sales-return-history-table' });
    });
});

jest.mock('../../product/purchase_history.js', () => {
    const React = require('react');
    return React.forwardRef((props, _ref) => {
        capturedPurchaseSubFormClass = props.subFormModalClass;
        return React.createElement('div', { 'data-testid': 'purchase-history-table' });
    });
});

jest.mock('../../product/purchase_return_history.js', () => {
    const React = require('react');
    return React.forwardRef((props, _ref) => {
        capturedPurchaseReturnSubFormClass = props.subFormModalClass;
        return React.createElement('div', { 'data-testid': 'purchase-return-history-table' });
    });
});

jest.mock('../../product/delivery_note_history.js', () => {
    const React = require('react');
    return React.forwardRef((props, _ref) => {
        capturedDeliveryNoteSubFormClass = props.subFormModalClass;
        return React.createElement('div', { 'data-testid': 'delivery-note-history-table' });
    });
});

jest.mock('../../product/quotation_history.js', () => {
    const React = require('react');
    return React.forwardRef((props, _ref) => {
        capturedQuotationSubFormClass = props.subFormModalClass;
        return React.createElement('div', { 'data-testid': 'quotation-history-table' });
    });
});

jest.mock('../../product/quotation_sales_return_history.js', () => {
    const React = require('react');
    return React.forwardRef((props, _ref) => {
        capturedQuotationSalesReturnSubFormClass = props.subFormModalClass;
        return React.createElement('div', { 'data-testid': 'quotation-sales-return-history-table' });
    });
});

jest.mock('../../product/product_history.js', () => {
    const React = require('react');
    return React.forwardRef((props, _ref) => {
        capturedProductHistorySubFormClass = props.subFormModalClass;
        return React.createElement('div', { 'data-testid': 'product-history-table' });
    });
});

// DraggableHistoryModal renders children when show=true
jest.mock('../DraggableHistoryModal.js', () => {
    const React = require('react');
    return ({ show, children }) =>
        show ? React.createElement('div', { 'data-testid': 'draggable-modal' }, children) : null;
});

// ── imports ───────────────────────────────────────────────────────────────────
import React, { createRef } from 'react';
import { render, act } from '@testing-library/react';
import ProductSalesHistory from '../product_sales_history.js';
import ProductSalesReturnHistory from '../product_sales_return_history.js';
import ProductPurchaseHistory from '../product_purchase_history.js';
import ProductPurchaseReturnHistory from '../product_purchase_return_history.js';
import ProductDeliveryNoteHistory from '../product_delivery_note_history.js';
import ProductQuotationHistory from '../product_quotation_history.js';
import ProductQuotationSalesReturnHistory from '../product_quotation_sales_return_history.js';
import ProductHistory from '../product_history.js';

const EXPECTED_CLASS = 'above-inner-history-form';
const PRODUCT = { id: 'p1', name: 'Test Product' };

// Helper: render, open, capture subFormModalClass
function openModal(Component, extraClass) {
    const ref = createRef();
    render(<Component ref={ref} extraClass={extraClass} />);
    act(() => ref.current.open(PRODUCT));
    return ref;
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('subFormModalClass is always "above-inner-history-form"', () => {
    // Case 1: opened from customer-pendings context — extraClass="" (previously empty)
    describe('with extraClass="" (customer-pendings nesting)', () => {
        it('ProductSalesHistory passes above-inner-history-form', () => {
            capturedSalesSubFormClass = undefined;
            openModal(ProductSalesHistory, '');
            expect(capturedSalesSubFormClass).toBe(EXPECTED_CLASS);
        });

        it('ProductSalesReturnHistory passes above-inner-history-form', () => {
            capturedSalesReturnSubFormClass = undefined;
            openModal(ProductSalesReturnHistory, '');
            expect(capturedSalesReturnSubFormClass).toBe(EXPECTED_CLASS);
        });

        it('ProductPurchaseHistory passes above-inner-history-form', () => {
            capturedPurchaseSubFormClass = undefined;
            openModal(ProductPurchaseHistory, '');
            expect(capturedPurchaseSubFormClass).toBe(EXPECTED_CLASS);
        });

        it('ProductPurchaseReturnHistory passes above-inner-history-form', () => {
            capturedPurchaseReturnSubFormClass = undefined;
            openModal(ProductPurchaseReturnHistory, '');
            expect(capturedPurchaseReturnSubFormClass).toBe(EXPECTED_CLASS);
        });

        it('ProductDeliveryNoteHistory passes above-inner-history-form', () => {
            capturedDeliveryNoteSubFormClass = undefined;
            openModal(ProductDeliveryNoteHistory, '');
            expect(capturedDeliveryNoteSubFormClass).toBe(EXPECTED_CLASS);
        });

        it('ProductQuotationHistory passes above-inner-history-form', () => {
            capturedQuotationSubFormClass = undefined;
            openModal(ProductQuotationHistory, '');
            expect(capturedQuotationSubFormClass).toBe(EXPECTED_CLASS);
        });

        it('ProductQuotationSalesReturnHistory passes above-inner-history-form', () => {
            capturedQuotationSalesReturnSubFormClass = undefined;
            openModal(ProductQuotationSalesReturnHistory, '');
            expect(capturedQuotationSalesReturnSubFormClass).toBe(EXPECTED_CLASS);
        });

        it('ProductHistory (generic) passes above-inner-history-form', () => {
            capturedProductHistorySubFormClass = undefined;
            openModal(ProductHistory, '');
            expect(capturedProductHistorySubFormClass).toBe(EXPECTED_CLASS);
        });
    });

    // Case 2: opened from fromHistory=true context — extraClass="order-inner-history-modal"
    describe('with extraClass="order-inner-history-modal" (history nesting)', () => {
        it('ProductSalesHistory passes above-inner-history-form', () => {
            capturedSalesSubFormClass = undefined;
            openModal(ProductSalesHistory, 'order-inner-history-modal');
            expect(capturedSalesSubFormClass).toBe(EXPECTED_CLASS);
        });

        it('ProductSalesReturnHistory passes above-inner-history-form', () => {
            capturedSalesReturnSubFormClass = undefined;
            openModal(ProductSalesReturnHistory, 'order-inner-history-modal');
            expect(capturedSalesReturnSubFormClass).toBe(EXPECTED_CLASS);
        });

        it('ProductPurchaseHistory passes above-inner-history-form', () => {
            capturedPurchaseSubFormClass = undefined;
            openModal(ProductPurchaseHistory, 'order-inner-history-modal');
            expect(capturedPurchaseSubFormClass).toBe(EXPECTED_CLASS);
        });

        it('ProductPurchaseReturnHistory passes above-inner-history-form', () => {
            capturedPurchaseReturnSubFormClass = undefined;
            openModal(ProductPurchaseReturnHistory, 'order-inner-history-modal');
            expect(capturedPurchaseReturnSubFormClass).toBe(EXPECTED_CLASS);
        });

        it('ProductDeliveryNoteHistory passes above-inner-history-form', () => {
            capturedDeliveryNoteSubFormClass = undefined;
            openModal(ProductDeliveryNoteHistory, 'order-inner-history-modal');
            expect(capturedDeliveryNoteSubFormClass).toBe(EXPECTED_CLASS);
        });

        it('ProductQuotationHistory passes above-inner-history-form', () => {
            capturedQuotationSubFormClass = undefined;
            openModal(ProductQuotationHistory, 'order-inner-history-modal');
            expect(capturedQuotationSubFormClass).toBe(EXPECTED_CLASS);
        });

        it('ProductQuotationSalesReturnHistory passes above-inner-history-form', () => {
            capturedQuotationSalesReturnSubFormClass = undefined;
            openModal(ProductQuotationSalesReturnHistory, 'order-inner-history-modal');
            expect(capturedQuotationSalesReturnSubFormClass).toBe(EXPECTED_CLASS);
        });

        it('ProductHistory (generic) passes above-inner-history-form', () => {
            capturedProductHistorySubFormClass = undefined;
            openModal(ProductHistory, 'order-inner-history-modal');
            expect(capturedProductHistorySubFormClass).toBe(EXPECTED_CLASS);
        });
    });

    // Case 3: no extraClass prop at all
    describe('with extraClass=undefined (default)', () => {
        it('ProductSalesHistory passes above-inner-history-form', () => {
            capturedSalesSubFormClass = undefined;
            const ref = createRef();
            render(<ProductSalesHistory ref={ref} />);
            act(() => ref.current.open(PRODUCT));
            expect(capturedSalesSubFormClass).toBe(EXPECTED_CLASS);
        });

        it('ProductPurchaseHistory passes above-inner-history-form', () => {
            capturedPurchaseSubFormClass = undefined;
            const ref = createRef();
            render(<ProductPurchaseHistory ref={ref} />);
            act(() => ref.current.open(PRODUCT));
            expect(capturedPurchaseSubFormClass).toBe(EXPECTED_CLASS);
        });

        it('ProductHistory (generic) passes above-inner-history-form', () => {
            capturedProductHistorySubFormClass = undefined;
            const ref = createRef();
            render(<ProductHistory ref={ref} />);
            act(() => ref.current.open(PRODUCT));
            expect(capturedProductHistorySubFormClass).toBe(EXPECTED_CLASS);
        });
    });
});
