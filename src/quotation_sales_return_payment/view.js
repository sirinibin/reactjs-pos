import React, { forwardRef } from "react";
import PaymentView from '../utils/PaymentView.js';


const QuotationSalesReturnPaymentView = forwardRef((props, ref) => (
    <PaymentView
        ref={ref}
        {...props}
        apiPath="/v1/quotation-sales-return-payment"
        title={m => `Details of QuotationSales Return Payment  of QuotationSales return #${m.quotationsales_return_code}`}
        renderFirstRow={m => (<>
            <th>QuotationSales Return ID:</th><td> {m.quotationsales_return_code}</td>
            <th>QuotationSales Order ID:</th><td> {m.order_code}</td>
            <th>Amount:</th><td> {m.amount}</td>
            <th>Payment Method:</th><td> {m.method}</td>
            <th>Store Name:</th><td> {m.store_name}</td>
        </>)}
        
        createFormArg={(props) => props.quotationsales_return}
    />
));

export default QuotationSalesReturnPaymentView;
