// SalesImportDropdown: the single Import dropdown used by sales form types 4 and 5.
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k) => k }) }));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SalesImportDropdown, { SalesImportMenuItems } from '../SalesImportDropdown';

const poStore = { settings: { enable_purchase_order_module: true } };
const handlers = () => ({
  openQuotations: jest.fn(), openDeliveryNotes: jest.fn(), openImportFromSales: jest.fn(),
  openImportFromPurchase: jest.fn(), openImportFromPO: jest.fn(),
});

describe('SalesImportMenuItems', () => {
  it('lists every source in order when all handlers are given and P.O. is enabled', () => {
    render(<div data-testid="menu"><SalesImportMenuItems store={poStore} {...handlers()} /></div>);
    expect(Array.from(screen.getByTestId('menu').children).map(e => e.textContent))
      .toEqual(['From Quotations', 'From Delivery Notes', 'From Sales', 'From Purchase', 'From P.O.']);
  });

  it('hides From P.O. without the purchase order module', () => {
    render(<div data-testid="menu"><SalesImportMenuItems store={{ settings: {} }} {...handlers()} /></div>);
    expect(screen.queryByText('From P.O.')).toBeNull();
    render(<div><SalesImportMenuItems {...handlers()} /></div>);
    expect(screen.queryByText('From P.O.')).toBeNull();
  });

  it('leaves out sources whose handler is missing', () => {
    render(<div data-testid="menu"><SalesImportMenuItems store={poStore} openImportFromSales={jest.fn()} /></div>);
    expect(screen.getByTestId('menu').children).toHaveLength(1);
    expect(screen.getByText('From Sales')).toBeInTheDocument();
  });

  it('each item calls its own handler with no arguments', () => {
    const h = handlers();
    render(<div><SalesImportMenuItems store={poStore} testIdPrefix="t5-" {...h} /></div>);
    const map = { quotations: h.openQuotations, 'delivery-notes': h.openDeliveryNotes, sales: h.openImportFromSales, purchase: h.openImportFromPurchase, po: h.openImportFromPO };
    Object.entries(map).forEach(([key, fn]) => {
      fireEvent.click(screen.getByTestId(`t5-import-from-${key}-btn`));
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith();
    });
  });
});

describe('SalesImportDropdown', () => {
  it('renders one Import toggle and shows the sources when opened', () => {
    render(<SalesImportDropdown testIdPrefix="t4-" store={poStore} {...handlers()} />);
    const toggle = screen.getByTestId('t4-import-dropdown-btn');
    expect(toggle).toHaveTextContent('Import');
    fireEvent.click(toggle);
    expect(screen.getByTestId('t4-import-from-sales-btn')).toBeInTheDocument();
    expect(screen.getByTestId('t4-import-from-purchase-btn')).toBeInTheDocument();
  });

  it('uses custom toggle content when given', () => {
    render(<SalesImportDropdown toggleContent={<span>ICON</span>} {...handlers()} />);
    expect(screen.getByTestId('import-dropdown-btn')).toHaveTextContent('ICON');
    expect(screen.getByTestId('import-dropdown-btn')).toHaveAttribute('title', 'Import');
  });
});
