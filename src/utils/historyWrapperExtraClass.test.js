/**
 * Tests the extraClass → DraggableHistoryModal forwarding and the
 * subFormModalClass computation common to every product_*_history.js wrapper.
 *
 * Wrappers covered:
 *   product_sales_return_history   – representative of the wrappers with a TABLE
 *   product_purchase_history       – second representative (different TABLE mock)
 *   product_delivery_note_history  – also forwards subFormModalClass (post-fix)
 *   product_non_vat_sales_history  – inline content, no TABLE
 *
 * Assertion strategy: mocks embed prop values as data-* attributes so tests can
 * read them from the DOM via screen.getByTestId / toHaveAttribute.  This avoids
 * closure / variable-capture issues that arise because jest.mock() factories are
 * hoisted before module-scope variable declarations.
 *
 * Plain arrow functions are used for component mocks instead of jest.fn() because
 * React requires a component to return JSX/null; jest.fn() wrappers interfere
 * with that contract ("Nothing was returned from render" error).
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';

// ── DraggableHistoryModal mock ────────────────────────────────────────────────
// Renders with data-extra-class so tests can assert what extraClass was received.

jest.mock('./DraggableHistoryModal', () => (props) =>
    props.show
        ? (
            <div
                data-testid="draggable-modal"
                data-extra-class={props.extraClass !== undefined ? props.extraClass : '__undefined__'}
            >
                {props.children}
            </div>
        )
        : null
);

// ── TABLE mocks ───────────────────────────────────────────────────────────────
// Each renders a div whose data-sub-form-modal-class attribute mirrors the prop.

jest.mock('../product/sales_return_history', () => (props) => (
    <div data-testid="sr-table" data-sub-form-modal-class={props.subFormModalClass ?? '__undefined__'} />
));

jest.mock('../product/purchase_history', () => (props) => (
    <div data-testid="pur-table" data-sub-form-modal-class={props.subFormModalClass ?? '__undefined__'} />
));

jest.mock('../product/delivery_note_history', () => (props) => (
    <div data-testid="dn-table" data-sub-form-modal-class={props.subFormModalClass ?? '__undefined__'} />
));

// ── other dependency mocks ────────────────────────────────────────────────────

jest.mock('react-bootstrap', () => ({
    Spinner: () => null,
    Modal: ({ show, children, className }) =>
        show ? <div data-testid="nv-modal" className={className}>{children}</div> : null,
}));
jest.mock('date-fns', () => ({ format: () => '' }));
jest.mock('./numberUtils', () => ({ trimTo2Decimals: (v) => v }));

// PurchaseCreate is imported by product_purchase_history but never triggered here
jest.mock('../purchase/create.js', () => {
    const React = require('react');
    return React.forwardRef(() => null);
});

// ── subjects ──────────────────────────────────────────────────────────────────

import ProductSalesReturnHistory  from './product_sales_return_history';
import ProductPurchaseHistory     from './product_purchase_history';
import ProductDeliveryNoteHistory from './product_delivery_note_history';
import ProductNonVATSalesHistory  from './product_non_vat_sales_history';

// ── helpers ───────────────────────────────────────────────────────────────────

function openWrapper(WrapperComponent, extraClass, openArgs) {
    const ref = React.createRef();
    render(<WrapperComponent ref={ref} extraClass={extraClass} />);
    act(() => {
        if (Array.isArray(openArgs)) {
            ref.current.open(...openArgs);
        } else {
            ref.current.open(openArgs || { name: 'Product A' });
        }
    });
}

function draggableExtraClass() {
    return screen.getByTestId('draggable-modal').getAttribute('data-extra-class');
}

// ── ProductSalesReturnHistory ─────────────────────────────────────────────────

describe('ProductSalesReturnHistory wrapper', () => {
    test('1. extraClass="" → DraggableHistoryModal receives empty extraClass', () => {
        openWrapper(ProductSalesReturnHistory, '', [{ name: 'P' }, []]);
        expect(draggableExtraClass()).toBe('');
    });

    test('2. extraClass="order-inner-history-modal" → DraggableHistoryModal receives it', () => {
        openWrapper(ProductSalesReturnHistory, 'order-inner-history-modal', [{ name: 'P' }, []]);
        expect(draggableExtraClass()).toBe('order-inner-history-modal');
    });

    test('3. extraClass not provided → DraggableHistoryModal extraClass is falsy', () => {
        const ref = React.createRef();
        render(<ProductSalesReturnHistory ref={ref} />);
        act(() => { ref.current.open({ name: 'X' }, []); });
        const ec = draggableExtraClass();
        expect(!ec || ec === '__undefined__').toBe(true);
    });

    test('4. extraClass="" → TABLE receives subFormModalClass=""', () => {
        openWrapper(ProductSalesReturnHistory, '', [{ name: 'P' }, []]);
        expect(screen.getByTestId('sr-table')).toHaveAttribute('data-sub-form-modal-class', '');
    });

    test('5. extraClass="order-inner-history-modal" → TABLE subFormModalClass="above-inner-history-form"', () => {
        openWrapper(ProductSalesReturnHistory, 'order-inner-history-modal', [{ name: 'P' }, []]);
        expect(screen.getByTestId('sr-table')).toHaveAttribute('data-sub-form-modal-class', 'above-inner-history-form');
    });

    test('6. extraClass="something-else" → TABLE receives subFormModalClass=""', () => {
        openWrapper(ProductSalesReturnHistory, 'something-else', [{ name: 'P' }, []]);
        expect(screen.getByTestId('sr-table')).toHaveAttribute('data-sub-form-modal-class', '');
    });

    test('7. modal is shown after open() is called', () => {
        openWrapper(ProductSalesReturnHistory, '', [{ name: 'P' }, []]);
        expect(screen.getByTestId('draggable-modal')).toBeInTheDocument();
    });
});

// ── ProductPurchaseHistory ────────────────────────────────────────────────────

describe('ProductPurchaseHistory wrapper', () => {
    test('8. extraClass="" → TABLE receives subFormModalClass=""', () => {
        openWrapper(ProductPurchaseHistory, '', [{ name: 'P' }, []]);
        expect(screen.getByTestId('pur-table')).toHaveAttribute('data-sub-form-modal-class', '');
    });

    test('9. extraClass="order-inner-history-modal" → subFormModalClass="above-inner-history-form"', () => {
        openWrapper(ProductPurchaseHistory, 'order-inner-history-modal', [{ name: 'P' }, []]);
        expect(screen.getByTestId('pur-table')).toHaveAttribute('data-sub-form-modal-class', 'above-inner-history-form');
    });

    test('10. extraClass forwarded to DraggableHistoryModal for PurchaseHistory', () => {
        openWrapper(ProductPurchaseHistory, 'order-inner-history-modal', [{ name: 'P' }, []]);
        expect(draggableExtraClass()).toBe('order-inner-history-modal');
    });
});

// ── ProductDeliveryNoteHistory ────────────────────────────────────────────────

describe('ProductDeliveryNoteHistory wrapper', () => {
    test('11. extraClass="" → TABLE receives subFormModalClass=""', () => {
        openWrapper(ProductDeliveryNoteHistory, '', [{ name: 'DN' }, []]);
        expect(screen.getByTestId('dn-table')).toHaveAttribute('data-sub-form-modal-class', '');
    });

    test('12. extraClass="order-inner-history-modal" → subFormModalClass="above-inner-history-form" (new fix)', () => {
        openWrapper(ProductDeliveryNoteHistory, 'order-inner-history-modal', [{ name: 'DN' }, []]);
        expect(screen.getByTestId('dn-table')).toHaveAttribute('data-sub-form-modal-class', 'above-inner-history-form');
    });

    test('13. extraClass forwarded to DraggableHistoryModal for DeliveryNoteHistory', () => {
        openWrapper(ProductDeliveryNoteHistory, 'order-inner-history-modal', [{ name: 'DN' }, []]);
        expect(draggableExtraClass()).toBe('order-inner-history-modal');
    });

    test('14. arbitrary extraClass does NOT produce subFormModalClass="above-inner-history-form"', () => {
        openWrapper(ProductDeliveryNoteHistory, 'other-class', [{ name: 'DN' }, []]);
        expect(screen.getByTestId('dn-table')).toHaveAttribute('data-sub-form-modal-class', '');
    });
});

// ── ProductNonVATSalesHistory ─────────────────────────────────────────────────

describe('ProductNonVATSalesHistory wrapper (inline content, no sub-TABLE)', () => {
    test('15. extraClass="order-inner-history-modal" forwarded to DraggableHistoryModal', () => {
        openWrapper(ProductNonVATSalesHistory, 'order-inner-history-modal', { name: 'NV', _id: 'id1' });
        expect(draggableExtraClass()).toBe('order-inner-history-modal');
    });

    test('16. extraClass="" forwarded as empty to DraggableHistoryModal', () => {
        openWrapper(ProductNonVATSalesHistory, '', { name: 'NV', _id: 'id1' });
        expect(draggableExtraClass()).toBe('');
    });
});

// ── subFormModalClass edge-case exhaustion ────────────────────────────────────

describe('subFormModalClass computation: exhaustive string matching', () => {
    // Uses ProductSalesReturnHistory as the representative.
    test('17. only exact "order-inner-history-modal" triggers "above-inner-history-form"', () => {
        const cases = [
            ['',                            ''],
            ['order-inner-history-modal',   'above-inner-history-form'],
            ['ORDER-INNER-HISTORY-MODAL',   ''],    // case-sensitive
            ['order-inner-history',         ''],    // partial prefix
            [' order-inner-history-modal',  ''],    // leading space
            ['order-inner-history-modal ',  ''],    // trailing space
            ['above-inner-history-form',    ''],    // output value, not trigger
        ];

        for (const [extraClass, expected] of cases) {
            const ref = React.createRef();
            render(<ProductSalesReturnHistory ref={ref} extraClass={extraClass} />);
            act(() => { ref.current.open({ name: 'P' }, []); });
            expect(screen.getAllByTestId('sr-table').pop())
                .toHaveAttribute('data-sub-form-modal-class', expected);
        }
    });
});
