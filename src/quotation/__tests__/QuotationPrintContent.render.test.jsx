/**
 * Render tests for quotation/printContent.js (pre-printed stationery layout).
 */
import QuotationPrintContent from '../printContent';
import { describePrintContent, renderDoc, makeDoc } from '../../testHelpers/invoiceFixtures';

describe('QuotationPrintContent', () => {
    describePrintContent({ Component: QuotationPrintContent, title: 'QUOTATION / اقتباس', party: 'customer', priced: true, currencySuffix: ' SAR' });

});
