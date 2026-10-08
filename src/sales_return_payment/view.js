import React, { forwardRef } from "react";
import { useTranslation } from "react-i18next";
import PaymentView from '../utils/PaymentView.js';


const SalesReturnPaymentView = forwardRef((props, ref) => {
    const { t } = useTranslation('common');
    return (
        <PaymentView
            ref={ref}
            {...props}
            apiPath="/v1/sales-return-payment"
            title={m => `${t('details_of_sales_return_payment')} #${m.sales_return_code}`}
            renderFirstRow={m => (<>
                <th>{t('sales_return_id_label')}</th><td> {m.sales_return_code}</td>
                <th>{t('sales_order_id_label')}</th><td> {m.order_code}</td>
                <th>{t('amount_label')}</th><td> {m.amount}</td>
                <th>{t('payment_method_label')}</th><td> {m.method}</td>
                <th>{t('store_name_label')}</th><td> {m.store_name}</td>
            </>)}

            createFormArg={(props) => props.sales_return}
        />
    );
});

export default SalesReturnPaymentView;
