/**
 * Render tests for sales_return/printContent.js (pre-printed stationery layout).
 */
import SalesReturnPrintContent from '../printContent';
import { describePrintContent, renderDoc, makeDoc } from '../../testHelpers/invoiceFixtures';

describe('SalesReturnPrintContent', () => {
    describePrintContent({ Component: SalesReturnPrintContent, title: 'RETURN INVOICE / فاتورة الإرجاع', party: 'customer', priced: true, currencySuffix: '' });

});
