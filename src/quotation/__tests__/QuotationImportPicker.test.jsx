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
});
