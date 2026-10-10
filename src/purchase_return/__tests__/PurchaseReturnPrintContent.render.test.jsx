/**
 * Render tests for purchase_return/printContent.js (pre-printed stationery layout).
 */
import PurchaseReturnPrintContent from '../printContent';
import { describePrintContent, renderDoc, makeDoc } from '../../testHelpers/invoiceFixtures';

describe('PurchaseReturnPrintContent', () => {
    describePrintContent({ Component: PurchaseReturnPrintContent, title: 'PURCHASE RETURN TAX INVOICE / شراء فاتورة ضريبة الإرجاع', party: 'vendor', priced: true, currencySuffix: '' });

});
