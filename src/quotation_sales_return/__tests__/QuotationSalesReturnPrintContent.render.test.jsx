/**
 * Render tests for quotation_sales_return/printContent.js (pre-printed stationery layout).
 */
import QuotationSalesReturnPrintContent from '../printContent';
import { describePrintContent, renderDoc, makeDoc } from '../../testHelpers/invoiceFixtures';

describe('QuotationSalesReturnPrintContent', () => {
    describePrintContent({ Component: QuotationSalesReturnPrintContent, title: 'RETURN INVOICE / فاتورة الإرجاع', party: 'customer', priced: true, currencySuffix: '' });

});
