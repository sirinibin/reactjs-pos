// QuotationImportPicker: quotation picked in step 1 -> products listed -> chosen products imported.
jest.mock('react-bootstrap', () => {
  const React = require('react');
  const Modal = ({ show, children }) => (show ? React.createElement('div', { 'data-testid': 'modal' }, children) : null);
  Modal.Header = ({ children }) => React.createElement('div', null, children);
  Modal.Body = ({ children }) => React.createElement('div', null, children);
  return { Modal };
});

const mockDocPickerOpen = jest.fn();
jest.mock('../../purchase_order/SourceDocumentPicker.js', () => {
  const React = require('react');
  return React.forwardRef((props, ref) => {
    React.useImperativeHandle(ref, () => ({ open: (...args) => mockDocPickerOpen(...args) }));
    return null;
  });
});

import React, { createRef } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import QuotationImportPicker from '../QuotationImportPicker';

const quotation = {
  id: 'q1', code: 'QT-001', customer_name: 'ACME', date: '2026-10-01T00:00:00Z',
  products: [
    { product_id: 'p1', part_number: 'A1', name: 'Oil Filter', quantity: 2, unit_price: 10, unit_price_with_vat: 11.5 },
    { product_id: 'p2', part_number: 'B2', name: 'Air Filter', quantity: 1, unit_price: 20, unit_price_with_vat: 23 },
  ],
};

function openWith(ref, opts) {
  act(() => { ref.current.open(opts); });
  const [callback, type] = mockDocPickerOpen.mock.calls[mockDocPickerOpen.mock.calls.length - 1];
  expect(type).toBe('quotation');
  act(() => { callback(quotation); });
}

beforeEach(() => mockDocPickerOpen.mockReset());

describe('QuotationImportPicker', () => {
  it('opens the quotation picker first, then lists the chosen quotation products', () => {
    const ref = createRef();
    render(<QuotationImportPicker ref={ref} />);
    expect(screen.queryByTestId('modal')).toBeNull();
    openWith(ref, { onImport: jest.fn() });
    expect(screen.getByText('QT-001')).toBeInTheDocument();
    expect(screen.getByText('Oil Filter')).toBeInTheDocument();
    expect(screen.getByText('Air Filter')).toBeInTheDocument();
    expect(screen.getByTestId('qip-import')).toHaveTextContent('Import 2 Products');
  });

  it('imports only the checked products with edited quantities', () => {
    const ref = createRef();
    const onImport = jest.fn();
    render(<QuotationImportPicker ref={ref} />);
    openWith(ref, { onImport });
    fireEvent.click(screen.getByTestId('qip-row-1'));
    const qtyInputs = screen.getAllByRole('spinbutton');
    fireEvent.change(qtyInputs[0], { target: { value: '5' } });
    fireEvent.click(screen.getByTestId('qip-import'));
    expect(onImport).toHaveBeenCalledTimes(1);
    const [products, q] = onImport.mock.calls[0];
    expect(q.id).toBe('q1');
    expect(products).toHaveLength(1);
    expect(products[0]).toMatchObject({ product_id: 'p1', quantity: 5, unit_price: 10 });
    expect(screen.queryByTestId('modal')).toBeNull();
  });

  it('select-all toggles every row and disables import when none are checked', () => {
    const ref = createRef();
    render(<QuotationImportPicker ref={ref} />);
    openWith(ref, { onImport: jest.fn() });
    fireEvent.click(screen.getByTestId('qip-select-all'));
    expect(screen.getByTestId('qip-import')).toBeDisabled();
    fireEvent.click(screen.getByTestId('qip-select-all'));
    expect(screen.getByTestId('qip-import')).toHaveTextContent('Import 2 Products');
  });

  it('filters products by name', () => {
    const ref = createRef();
    render(<QuotationImportPicker ref={ref} />);
    openWith(ref, { onImport: jest.fn() });
    fireEvent.change(screen.getByTestId('qip-filter'), { target: { value: 'air' } });
    expect(screen.queryByText('Oil Filter')).toBeNull();
    expect(screen.getByText('Air Filter')).toBeInTheDocument();
  });

  it('marks products already in the current quotation', () => {
    const ref = createRef();
    render(<QuotationImportPicker ref={ref} />);
    openWith(ref, { onImport: jest.fn(), existingProductIds: ['p2'] });
    expect(screen.getAllByText('Already added')).toHaveLength(1);
  });

  it('refuses the quotation being edited and reopens the picker', () => {
    const ref = createRef();
    const toast = jest.fn();
    render(<QuotationImportPicker ref={ref} showToastMessage={toast} />);
    openWith(ref, { onImport: jest.fn(), excludeId: 'q1' });
    expect(toast).toHaveBeenCalled();
    expect(screen.queryByTestId('modal')).toBeNull();
    expect(mockDocPickerOpen).toHaveBeenCalledTimes(2);
  });

  it('keeps the select-all checkbox checkbox-sized (not stretched by thead input min-width)', () => {
    const ref = createRef();
    render(<QuotationImportPicker ref={ref} />);
    openWith(ref, { onImport: jest.fn() });
    const box = screen.getByTestId('qip-select-all');
    expect(box.style.minWidth).toBe('16px');
    expect(box.style.width).toBe('16px');
  });

  it('passes the form customer to the quotation search', () => {
    const ref = createRef();
    render(<QuotationImportPicker ref={ref} />);
    const customers = [{ id: 'c1', name: 'ACME' }];
    act(() => { ref.current.open({ onImport: jest.fn(), defaultCustomers: customers }); });
    expect(mockDocPickerOpen.mock.calls[0][2]).toBe(customers);
  });

  it('back button reopens the quotation search with the same customer', () => {
    const ref = createRef();
    render(<QuotationImportPicker ref={ref} />);
    const customers = [{ id: 'c1' }];
    openWith(ref, { onImport: jest.fn(), defaultCustomers: customers });
    fireEvent.click(screen.getByText(/Choose another quotation/));
    expect(screen.queryByTestId('modal')).toBeNull();
    expect(mockDocPickerOpen).toHaveBeenCalledTimes(2);
    expect(mockDocPickerOpen.mock.calls[1][2]).toBe(customers);
  });

  it('shows an empty state and disables import for a quotation without products', () => {
    const ref = createRef();
    render(<QuotationImportPicker ref={ref} />);
    act(() => { ref.current.open({ onImport: jest.fn() }); });
    act(() => { mockDocPickerOpen.mock.calls[0][0]({ id: 'q2', code: 'QT-EMPTY', products: [] }); });
    expect(screen.getByText('No products found.')).toBeInTheDocument();
    expect(screen.getByTestId('qip-import')).toBeDisabled();
    expect(screen.getByTestId('qip-select-all')).not.toBeChecked();
  });

  it('hides lines without a product_id', () => {
    const ref = createRef();
    render(<QuotationImportPicker ref={ref} />);
    act(() => { ref.current.open({ onImport: jest.fn() }); });
    act(() => { mockDocPickerOpen.mock.calls[0][0]({ id: 'q3', code: 'QT-X', products: [{ name: 'Free text line' }, null, { product_id: 'p9', name: 'Real Item', quantity: 1 }] }); });
    expect(screen.queryByText('Free text line')).toBeNull();
    expect(screen.getByText('Real Item')).toBeInTheDocument();
    expect(screen.getByTestId('qip-import')).toHaveTextContent('Import 1 Product');
  });

  it.each([['', 1], ['0', 1], ['-3', 1], ['abc', 1], ['2.5', 2.5]])('quantity %p is imported as %p', (typed, expected) => {
    const ref = createRef();
    const onImport = jest.fn();
    render(<QuotationImportPicker ref={ref} />);
    openWith(ref, { onImport });
    fireEvent.click(screen.getByTestId('qip-row-1'));
    fireEvent.change(screen.getAllByRole('spinbutton')[0], { target: { value: typed } });
    fireEvent.click(screen.getByTestId('qip-import'));
    expect(onImport.mock.calls[0][0][0].quantity).toBe(expected);
  });

  it('defaults a source line with zero or missing quantity to 1', () => {
    const ref = createRef();
    render(<QuotationImportPicker ref={ref} />);
    act(() => { ref.current.open({ onImport: jest.fn() }); });
    act(() => { mockDocPickerOpen.mock.calls[0][0]({ id: 'q4', products: [{ product_id: 'a', name: 'A', quantity: 0 }, { product_id: 'b', name: 'B' }] }); });
    screen.getAllByRole('spinbutton').forEach(el => expect(el.value).toBe('1'));
  });

  it('select-all only affects rows matching the filter', () => {
    const ref = createRef();
    const onImport = jest.fn();
    render(<QuotationImportPicker ref={ref} />);
    openWith(ref, { onImport });
    fireEvent.change(screen.getByTestId('qip-filter'), { target: { value: 'air' } });
    fireEvent.click(screen.getByTestId('qip-select-all'));
    fireEvent.change(screen.getByTestId('qip-filter'), { target: { value: '' } });
    expect(screen.getByTestId('qip-import')).toHaveTextContent('Import 1 Product');
    fireEvent.click(screen.getByTestId('qip-import'));
    expect(onImport.mock.calls[0][0].map(p => p.product_id)).toEqual(['p1']);
  });

  it('filters by part number, Arabic name and several words, and shows a no-match state', () => {
    const ref = createRef();
    render(<QuotationImportPicker ref={ref} />);
    act(() => { ref.current.open({ onImport: jest.fn() }); });
    act(() => { mockDocPickerOpen.mock.calls[0][0]({ id: 'q5', products: [
      { product_id: 'a', prefix_part_number: 'AB', part_number: '100', name: 'Oil Filter', name_in_arabic: 'فلتر زيت' },
      { product_id: 'b', part_number: 'XY-9', name: 'Brake Pad' },
    ] }); });
    const filter = screen.getByTestId('qip-filter');
    fireEvent.change(filter, { target: { value: 'xy-9' } });
    expect(screen.getByText('Brake Pad')).toBeInTheDocument();
    expect(screen.queryByText(/Oil Filter/)).toBeNull();
    fireEvent.change(filter, { target: { value: 'زيت' } });
    expect(screen.getByText(/Oil Filter/)).toBeInTheDocument();
    fireEvent.change(filter, { target: { value: '  oil   filter ' } });
    expect(screen.getByText(/Oil Filter/)).toBeInTheDocument();
    fireEvent.change(filter, { target: { value: 'nothing here' } });
    expect(screen.getByText('No products found.')).toBeInTheDocument();
  });

  it('clicking a row toggles it, but typing a quantity does not', () => {
    const ref = createRef();
    render(<QuotationImportPicker ref={ref} />);
    openWith(ref, { onImport: jest.fn() });
    fireEvent.click(screen.getByText('Oil Filter'));
    expect(screen.getByTestId('qip-row-0')).not.toBeChecked();
    fireEvent.click(screen.getAllByRole('spinbutton')[1]);
    expect(screen.getByTestId('qip-row-1')).toBeChecked();
  });

  it('a new quotation selection resets the filter and ticks', () => {
    const ref = createRef();
    render(<QuotationImportPicker ref={ref} />);
    openWith(ref, { onImport: jest.fn() });
    fireEvent.change(screen.getByTestId('qip-filter'), { target: { value: 'air' } });
    fireEvent.click(screen.getByTestId('qip-row-0'));
    fireEvent.click(screen.getByText(/Choose another quotation/));
    act(() => { mockDocPickerOpen.mock.calls[1][0](quotation); });
    expect(screen.getByTestId('qip-filter').value).toBe('');
    expect(screen.getByTestId('qip-import')).toHaveTextContent('Import 2 Products');
  });

  it('row checkboxes are also fixed at 16px', () => {
    const ref = createRef();
    render(<QuotationImportPicker ref={ref} />);
    openWith(ref, { onImport: jest.fn() });
    expect(screen.getByTestId('qip-row-0').style.minWidth).toBe('16px');
  });
});

