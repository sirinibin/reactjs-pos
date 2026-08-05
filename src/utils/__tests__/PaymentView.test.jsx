import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import PaymentView from '../PaymentView';

// ---------------------------------------------------------------------------
// react-bootstrap mock
// ---------------------------------------------------------------------------
jest.mock('react-bootstrap', () => {
    const Modal = ({ show, children }) =>
        show ? <div data-testid="modal">{children}</div> : null;
    Modal.Header = ({ children }) => (
        <div data-testid="modal-header">{children}</div>
    );
    Modal.Title = ({ children }) => (
        <span data-testid="modal-title">{children}</span>
    );
    Modal.Body = ({ children }) => (
        <div data-testid="modal-body">{children}</div>
    );
    const Table = ({ children }) => <table>{children}</table>;
    const Button = ({ children, onClick }) => (
        <button onClick={onClick}>{children}</button>
    );
    return { Modal, Table, Button };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const MOCK_MODEL = {
    id: '123',
    amount: 500,
    date: '2024-01-15T10:00:00Z',
    created_by_name: 'Admin',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
    updated_by_name: 'Admin',
};

function makeFetchMock(model = MOCK_MODEL, ok = true) {
    return jest.fn().mockResolvedValue({
        ok,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({ result: model }),
    });
}

function defaultProps(overrides = {}) {
    return {
        apiPath: '/v1/sales-payment',
        title: jest.fn((m) => (m && m.id ? `Payment ${m.id}` : 'Payment')),
        renderFirstRow: jest.fn((m) => (
            <>
                <th>Amount</th>
                <td data-testid="amount-cell">{m && m.amount}</td>
            </>
        )),
        openUpdateForm: jest.fn(),
        ...overrides,
    };
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------
beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('access_token', 'test-token');
    localStorage.setItem('store_id', 'store-abc');
});

afterEach(() => jest.restoreAllMocks());

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('PaymentView', () => {
    test('1. Modal is initially hidden (show=false)', () => {
        const ref = React.createRef();
        render(<PaymentView ref={ref} {...defaultProps()} />);
        expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
    });

    test('2. After ref.current.open(id), modal becomes visible', async () => {
        global.fetch = makeFetchMock();
        const ref = React.createRef();
        render(<PaymentView ref={ref} {...defaultProps()} />);
        await act(async () => {
            ref.current.open('123');
        });
        expect(screen.getByTestId('modal')).toBeInTheDocument();
    });

    test('3. On open, fetch is called with the correct apiPath/id URL', async () => {
        global.fetch = makeFetchMock();
        const ref = React.createRef();
        render(<PaymentView ref={ref} {...defaultProps()} />);
        await act(async () => {
            ref.current.open('123');
        });
        expect(global.fetch).toHaveBeenCalledTimes(1);
        const calledUrl = global.fetch.mock.calls[0][0];
        expect(calledUrl).toContain('/v1/sales-payment/123');
    });

    test('4. store_id is included as a query param when set in localStorage', async () => {
        global.fetch = makeFetchMock();
        const ref = React.createRef();
        render(<PaymentView ref={ref} {...defaultProps()} />);
        await act(async () => {
            ref.current.open('123');
        });
        const calledUrl = global.fetch.mock.calls[0][0];
        expect(calledUrl).toContain('store-abc');
    });

    test('5. Authorization header is set from localStorage access_token', async () => {
        global.fetch = makeFetchMock();
        const ref = React.createRef();
        render(<PaymentView ref={ref} {...defaultProps()} />);
        await act(async () => {
            ref.current.open('123');
        });
        const requestOptions = global.fetch.mock.calls[0][1];
        expect(requestOptions.headers['Authorization']).toBe('test-token');
    });

    test('6. After successful fetch, model data is rendered in the table', async () => {
        global.fetch = makeFetchMock();
        const ref = React.createRef();
        render(<PaymentView ref={ref} {...defaultProps()} />);
        await act(async () => {
            ref.current.open('123');
        });
        await waitFor(() => {
            expect(screen.getByTestId('amount-cell')).toHaveTextContent('500');
        });
    });

    test('7. renderFirstRow prop is called with the fetched model', async () => {
        global.fetch = makeFetchMock();
        const props = defaultProps();
        const ref = React.createRef();
        render(<PaymentView ref={ref} {...props} />);
        await act(async () => {
            ref.current.open('123');
        });
        await waitFor(() => {
            const calls = props.renderFirstRow.mock.calls;
            const calledWithFetchedModel = calls.some(([m]) => m && m.id === '123');
            expect(calledWithFetchedModel).toBe(true);
        });
    });

    test('8. Close button hides the modal', async () => {
        global.fetch = makeFetchMock();
        const ref = React.createRef();
        render(<PaymentView ref={ref} {...defaultProps()} />);
        await act(async () => {
            ref.current.open('123');
        });
        expect(screen.getByTestId('modal')).toBeInTheDocument();
        fireEvent.click(document.querySelector('.btn-close'));
        expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
    });

    test('9. Edit button calls props.openUpdateForm(model.id)', async () => {
        global.fetch = makeFetchMock();
        const props = defaultProps();
        const ref = React.createRef();
        render(<PaymentView ref={ref} {...props} />);
        await act(async () => {
            ref.current.open('123');
        });
        await waitFor(() => screen.getByTestId('amount-cell'));
        fireEvent.click(screen.getByText(/Edit/));
        expect(props.openUpdateForm).toHaveBeenCalledWith('123');
    });

    test('10. Create button appears when openCreateForm is provided and calls it with createFormArg result', async () => {
        global.fetch = makeFetchMock();
        const openCreateForm = jest.fn();
        const createFormArg = jest.fn((p, m) => ({ entityId: m.id }));
        const props = defaultProps({ openCreateForm, createFormArg });
        const ref = React.createRef();
        render(<PaymentView ref={ref} {...props} />);
        await act(async () => {
            ref.current.open('123');
        });
        await waitFor(() => screen.getByTestId('amount-cell'));
        const createBtn = screen.getByRole('button', { name: /Create/i });
        expect(createBtn).toBeInTheDocument();
        fireEvent.click(createBtn);
        expect(openCreateForm).toHaveBeenCalledWith({ entityId: '123' });
    });

    test('11. Create button is absent when openCreateForm prop is not provided', async () => {
        global.fetch = makeFetchMock();
        const ref = React.createRef();
        render(<PaymentView ref={ref} {...defaultProps()} />);
        await act(async () => {
            ref.current.open('123');
        });
        expect(screen.queryByRole('button', { name: /Create/i })).not.toBeInTheDocument();
    });

    test('12. Fetch failure (not ok response) is silently caught — no crash', async () => {
        global.fetch = makeFetchMock(MOCK_MODEL, false);
        const ref = React.createRef();
        render(<PaymentView ref={ref} {...defaultProps()} />);
        await expect(
            act(async () => {
                ref.current.open('123');
            })
        ).resolves.not.toThrow();
        // Modal is shown (setShow happens before fetch resolves)
        expect(screen.getByTestId('modal')).toBeInTheDocument();
    });

    test('13. title function receives the model and its return value is shown in modal header', async () => {
        global.fetch = makeFetchMock();
        const props = defaultProps({
            title: jest.fn((m) => (m && m.id ? `Invoice #${m.id}` : 'Loading')),
        });
        const ref = React.createRef();
        render(<PaymentView ref={ref} {...props} />);
        await act(async () => {
            ref.current.open('123');
        });
        await waitFor(() => {
            expect(screen.getByTestId('modal-title')).toHaveTextContent('Invoice #123');
        });
    });

    test('14. open() with no id does NOT open the modal', () => {
        const ref = React.createRef();
        render(<PaymentView ref={ref} {...defaultProps()} />);
        act(() => {
            ref.current.open();
        });
        expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
    });
});
