import React, { forwardRef } from "react";
import PaymentView from '../utils/PaymentView.js';


const SalesReturnPaymentView = forwardRef((props, ref) => (
    <PaymentView
        ref={ref}
        {...props}
        apiPath="/v1/sales-return-payment"
        title={m => `Details of Sales Return Payment  of Sales return #${m.sales_return_code}`}
        renderFirstRow={m => (<>
            <th>Sales Return ID:</th><td> {m.sales_return_code}</td>
            <th>Sales Order ID:</th><td> {m.order_code}</td>
            <th>Amount:</th><td> {m.amount}</td>
            <th>Payment Method:</th><td> {m.method}</td>
            <th>Store Name:</th><td> {m.store_name}</td>
        </>)}
        
        createFormArg={(props) => props.sales_return}
    />
));

export default SalesReturnPaymentView;
