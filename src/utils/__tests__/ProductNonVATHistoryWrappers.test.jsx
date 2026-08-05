// Corner-case tests for:
//   src/utils/product_non_vat_sales_history.js
//   src/utils/product_non_vat_sales_return_history.js
// Both fetch a history list on open(model) and render a loading spinner /
// empty-state / data table depending on fetch outcome.
// React 17, CRA, @testing-library/react v11, no TypeScript

jest.mock('../DraggableHistoryModal.js', () => {
    const React = require('react');
    return ({ show, title, children }) =>
        show
            ? React.createElement(
                'div',
                { 'data-testid': 'draggable-history-modal' },
                React.createElement('div', { 'data-testid': 'modal-title' }, title),
                children
            )
            : null;
});

import React, { createRef } from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProductNonVATSalesHistory from '../product_non_vat_sales_history.js';
import ProductNonVATSalesReturnHistory from '../product_non_vat_sales_return_history.js';

beforeEach(() => {
    localStorage.setItem('store_id', 'store-1');
    localStorage.setItem('access_token', 'token-abc');
});

afterEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
});

function mockFetchOnce(result) {
    global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ result }),
    });
}

describe('ProductNonVATSalesHistory', () => {
    it('renders without crashing (modal closed initially)', () => {
        render(
            <MemoryRouter>
                <ProductNonVATSalesHistory />
            </MemoryRouter>
        );
        expect(screen.queryByTestId('draggable-history-modal')).not.toBeInTheDocument();
    });

    it('shows the empty state when the API returns no rows', async () => {
        mockFetchOnce([]);
        const ref = createRef();
        render(
            <MemoryRouter>
                <ProductNonVATSalesHistory ref={ref} />
            </MemoryRouter>
        );
        await act(async () => ref.current.open({ id: 'p1', name: 'Widget' }));
        expect(screen.getByTestId('modal-title')).toHaveTextContent('Non VAT Sales History of Widget');
        expect(await screen.findByText(/No non-VAT sales history found/)).toBeInTheDocument();
    });

    it('renders a data row with formatted values when the API returns results', async () => {
        mockFetchOnce([
            {
                id: 'row1',
                date: '2024-05-01T00:00:00Z',
                non_vat_sales_code: 'NVS-001',
                customer_name: 'Acme Co',
                quantity: 3,
                unit_price: 10.5,
                price: 31.567,
            },
        ]);
        const ref = createRef();
        render(
            <MemoryRouter>
                <ProductNonVATSalesHistory ref={ref} />
            </MemoryRouter>
        );
        await act(async () => ref.current.open({ id: 'p1', name: 'Widget' }));
        expect(await screen.findByText('NVS-001')).toBeInTheDocument();
        expect(screen.getByText('Acme Co')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('renders "—" placeholders for rows missing optional fields', async () => {
        mockFetchOnce([{ id: 'row2' }]);
        const ref = createRef();
        render(
            <MemoryRouter>
                <ProductNonVATSalesHistory ref={ref} />
            </MemoryRouter>
        );
        await act(async () => ref.current.open({ id: 'p1', name: 'Widget' }));
        await waitFor(() => expect(screen.getAllByText('—').length).toBeGreaterThan(0));
    });

    it('does not call fetch when the product has neither product_id nor id (guard clause)', async () => {
        global.fetch = jest.fn();
        const ref = createRef();
        render(
            <MemoryRouter>
                <ProductNonVATSalesHistory ref={ref} />
            </MemoryRouter>
        );
        await act(async () => ref.current.open({ name: 'No Id Product' }));
        expect(global.fetch).not.toHaveBeenCalled();
        expect(await screen.findByText(/No non-VAT sales history found/)).toBeInTheDocument();
    });

    it('recovers gracefully (empty state, no crash) when fetch rejects', async () => {
        global.fetch = jest.fn().mockRejectedValue(new Error('network down'));
        const ref = createRef();
        render(
            <MemoryRouter>
                <ProductNonVATSalesHistory ref={ref} />
            </MemoryRouter>
        );
        await act(async () => ref.current.open({ id: 'p1', name: 'Widget' }));
        expect(await screen.findByText(/No non-VAT sales history found/)).toBeInTheDocument();
    });

    it('open(null) does not crash (model defaults to {})', async () => {
        const ref = createRef();
        render(
            <MemoryRouter>
                <ProductNonVATSalesHistory ref={ref} />
            </MemoryRouter>
        );
        await act(async () => ref.current.open(null));
        expect(screen.getByTestId('draggable-history-modal')).toBeInTheDocument();
    });
});

describe('ProductNonVATSalesReturnHistory', () => {
    it('renders without crashing (modal closed initially)', () => {
        render(
            <MemoryRouter>
                <ProductNonVATSalesReturnHistory />
            </MemoryRouter>
        );
        expect(screen.queryByTestId('draggable-history-modal')).not.toBeInTheDocument();
    });

    it('shows the empty state when the API returns no rows', async () => {
        mockFetchOnce([]);
        const ref = createRef();
        render(
            <MemoryRouter>
                <ProductNonVATSalesReturnHistory ref={ref} />
            </MemoryRouter>
        );
        await act(async () => ref.current.open({ id: 'p1', name: 'Widget' }));
        expect(screen.getByTestId('modal-title')).toHaveTextContent('Non VAT Sales Return History of Widget');
        expect(await screen.findByText(/No non-VAT sales return history found/)).toBeInTheDocument();
    });

    it('renders a data row with formatted values when the API returns results', async () => {
        mockFetchOnce([
            {
                id: 'row1',
                date: '2024-05-01T00:00:00Z',
                non_vat_sales_return_code: 'NVSR-001',
                customer_name: 'Acme Co',
                quantity: 2,
                unit_price: 5,
                price: 10,
            },
        ]);
        const ref = createRef();
        render(
            <MemoryRouter>
                <ProductNonVATSalesReturnHistory ref={ref} />
            </MemoryRouter>
        );
        await act(async () => ref.current.open({ id: 'p1', name: 'Widget' }));
        expect(await screen.findByText('NVSR-001')).toBeInTheDocument();
    });

    it('does not call fetch when the product has neither product_id nor id (guard clause)', async () => {
        global.fetch = jest.fn();
        const ref = createRef();
        render(
            <MemoryRouter>
                <ProductNonVATSalesReturnHistory ref={ref} />
            </MemoryRouter>
        );
        await act(async () => ref.current.open({ name: 'No Id Product' }));
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('recovers gracefully (empty state, no crash) when fetch rejects', async () => {
        global.fetch = jest.fn().mockRejectedValue(new Error('network down'));
        const ref = createRef();
        render(
            <MemoryRouter>
                <ProductNonVATSalesReturnHistory ref={ref} />
            </MemoryRouter>
        );
        await act(async () => ref.current.open({ id: 'p1', name: 'Widget' }));
        expect(await screen.findByText(/No non-VAT sales return history found/)).toBeInTheDocument();
    });

    it('uses product_id over id when both are present', async () => {
        mockFetchOnce([]);
        const ref = createRef();
        render(
            <MemoryRouter>
                <ProductNonVATSalesReturnHistory ref={ref} />
            </MemoryRouter>
        );
        await act(async () => ref.current.open({ product_id: 'pid-1', id: 'id-2', name: 'Widget' }));
        await waitFor(() => expect(global.fetch).toHaveBeenCalled());
        const calledUrl = global.fetch.mock.calls[0][0];
        expect(calledUrl).toContain('pid-1');
    });
});
