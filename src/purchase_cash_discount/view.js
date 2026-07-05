import React, { forwardRef } from "react";
import PaymentView from '../utils/PaymentView.js';
import { formatInStoreTimezone } from '../utils/dateUtils.js';

const PurchaseCashDiscountView = forwardRef((props, ref) => (
    <PaymentView
        ref={ref}
        {...props}
        apiPath="/v1/purchase-cash-discount"
        title={m => `Details of Purchase Cash Discount of Purchase #${m.purchase_code}`}
        renderFirstRow={m => (<>
            <th>Purchase ID:</th><td> {m.purchase_code}</td>
            <th>Amount:</th><td> {m.amount}</td>
            <th>Store Name:</th><td> {m.store_name}</td>
        </>)}
        renderSecondRow={m => (<>
            <th>Created By:</th><td> {m.created_by_name}</td>
            <th>Created At:</th><td> {formatInStoreTimezone(m.created_at)}</td>
            <th>Updated At:</th><td> {formatInStoreTimezone(m.updated_at)}</td>
        </>)}
        createFormArg={(props) => props.purchase}
    />
));

export default PurchaseCashDiscountView;
