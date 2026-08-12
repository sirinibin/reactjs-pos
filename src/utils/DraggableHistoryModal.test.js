import React from 'react';
import { render, screen } from '@testing-library/react';

// ── mocks (must be before any import that reaches them) ──────────────────────

jest.mock('react-bootstrap', () => {
    const Modal = ({ className, show, children }) =>
        show ? <div data-testid="bs-modal" className={className}>{children}</div> : null;
    Modal.Header = ({ children }) => <div>{children}</div>;
    Modal.Title  = ({ children }) => <div>{children}</div>;
    Modal.Body   = ({ children }) => <div>{children}</div>;
    return { Modal };
});

jest.mock('react-draggable', () => ({
    __esModule: true,
    default: ({ children }) => <div>{children}</div>,
}));

// ── subject ──────────────────────────────────────────────────────────────────

import DraggableHistoryModal from './DraggableHistoryModal';

// ── helpers ──────────────────────────────────────────────────────────────────

function renderModal(extraClass, show = true) {
    return render(
        <DraggableHistoryModal
            show={show}
            onClose={jest.fn()}
            title="Test"
            extraClass={extraClass}
        >
            <span>content</span>
        </DraggableHistoryModal>
    );
}

// ── tests ────────────────────────────────────────────────────────────────────

describe('DraggableHistoryModal – extraClass prop', () => {
    test('1. always contains base classes above-sales-modal and draggable-history-modal', () => {
        renderModal(undefined);
        expect(screen.getByTestId('bs-modal')).toHaveClass('above-sales-modal');
        expect(screen.getByTestId('bs-modal')).toHaveClass('draggable-history-modal');
    });

    test('2. without extraClass the className is exactly the two base classes', () => {
        renderModal(undefined);
        expect(screen.getByTestId('bs-modal').className).toBe(
            'above-sales-modal draggable-history-modal'
        );
    });

    test('3. empty-string extraClass produces no trailing space (className unchanged)', () => {
        renderModal('');
        expect(screen.getByTestId('bs-modal').className).toBe(
            'above-sales-modal draggable-history-modal'
        );
    });

    test('4. extraClass="order-inner-history-modal" is appended to className', () => {
        renderModal('order-inner-history-modal');
        expect(screen.getByTestId('bs-modal')).toHaveClass('order-inner-history-modal');
        expect(screen.getByTestId('bs-modal').className).toBe(
            'above-sales-modal draggable-history-modal order-inner-history-modal'
        );
    });

    test('5. arbitrary extraClass string is appended correctly', () => {
        renderModal('custom-class');
        expect(screen.getByTestId('bs-modal')).toHaveClass('custom-class');
    });

    test('6. when show=false the modal is not rendered', () => {
        renderModal('order-inner-history-modal', false);
        expect(screen.queryByTestId('bs-modal')).toBeNull();
    });

    test('7. children are rendered inside the modal', () => {
        renderModal(undefined);
        expect(screen.getByText('content')).toBeInTheDocument();
    });

    test('8. title is passed through (modal renders without throwing)', () => {
        expect(() =>
            render(
                <DraggableHistoryModal show={true} onClose={jest.fn()} title="My Title" extraClass="">
                    <div />
                </DraggableHistoryModal>
            )
        ).not.toThrow();
    });
});
