import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── Child domain component mocks ────────────────────────────────────────────
jest.mock('../../../posting/index.js', () => {
  const React = require('react');
  return React.forwardRef(() => null);
});

jest.mock('../../../utils/WhatsAppModal', () => () => null);

// ── Utility mocks ────────────────────────────────────────────────────────────
jest.mock('../../../utils/numberUtils', () => ({
  addCommasToInfoValue: jest.fn(v => v),
  stripSarBreakdown: jest.fn((v) => v),
}));

jest.mock('../../../utils/pdfGenerator', () => ({
  generateInfoPdf: jest.fn(),
  safeName: jest.fn(s => s),
}));

jest.mock('../../../utils/pdfShare', () => ({
  uploadPdfForShare: jest.fn(),
}));

// ── Timers & fetch ───────────────────────────────────────────────────────────
jest.useFakeTimers();

global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  headers: { get: () => 'application/json' },
  json: () =>
    Promise.resolve({
      result: {},
      data: [],
      total_count: 0,
      store: {},
      settings: {},
    }),
});

afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

// ── Subject under test ───────────────────────────────────────────────────────
import KPICards from '../KPICards';

const defaultProps = {
  store: {},
  orderStats: {},
  salesReturnStats: {},
  purchaseStats: {},
  purchaseReturnStats: {},
  expenseStats: {},
  depositStats: {},
  quotationStats: {},
  qtnSalesReturnStats: {},
  orders: [],
  filters: {},
  employeeStats: {},
  nonVatStats: {},
  vatBoxStats: {},
};

describe('KPICards', () => {
  it('renders without crashing with default (empty) props', () => {
    render(
      <MemoryRouter>
        <KPICards {...defaultProps} />
      </MemoryRouter>
    );
  });

  it('renders without crashing when vatBox and employee modules are enabled', () => {
    render(
      <MemoryRouter>
        <KPICards
          {...defaultProps}
          store={{
            vat_percent: 15,
            settings: {
              enable_vat_box: true,
              enable_employee_module: true,
              non_vat_sales: true,
              enable_sales_in_quotation: true,
              disable_purchases_on_accounts: true,
            },
          }}
          orderStats={{ total_sales: 10000, commission: 200, cash_discount: 50 }}
          salesReturnStats={{ total_sales_return: 500, commission: 10, cash_discount: 5 }}
          purchaseStats={{ total_purchase: 4000, cash_discount: 30, accounted_purchase: 3800, accounted_purchase_cash_discount: 25 }}
          purchaseReturnStats={{ total_purchase_return: 200, cash_discount: 10, accounted_purchase_return: 150, accounted_purchase_return_cash_discount: 8 }}
          expenseStats={{ total: 1500, salary_paid: 300 }}
          depositStats={{ purchase_fund: 100 }}
          quotationStats={{ invoice_total_sales: 2000, invoice_cash_discount: 15 }}
          qtnSalesReturnStats={{ total_quotation_sales_return: 100, cash_discount: 5 }}
          orders={[{ id: 1 }, { id: 2 }]}
          filters={{ from: '2026-01-01', to: '2026-01-31' }}
          employeeStats={{
            salary_balance: -500,
            employee_breakdown: [
              { name: 'Alice', balance: 300, direction: 'owed_to_employee', account_id: 'acc1' },
              { name: 'Bob', balance: 200, direction: 'owes_store', account_id: 'acc2' },
            ],
          }}
          nonVatStats={{ sales: 800, salesReturn: 50 }}
          vatBoxStats={{
            salesVAT: 1304,
            salesReturnVAT: 65,
            purchaseVAT: 496,
            purchaseReturnVAT: 26,
            acctPurchaseVAT: 470,
            acctPurchaseReturnVAT: 20,
            expenseVendorVAT: 190,
          }}
        />
      </MemoryRouter>
    );
  });
});
