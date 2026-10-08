import React, { forwardRef } from "react";
import { useTranslation } from "react-i18next";
import PaymentView from '../utils/PaymentView.js';


const SalesCashDiscountView = forwardRef((props, ref) => {
    const { t } = useTranslation('common');
    return (
        <PaymentView
            ref={ref}
            {...props}
            apiPath="/v1/sales-cash-discount"
            title={m => `${t('details_of_sales_cash_discount_of_order')} #${m.order_code}`}
            renderFirstRow={m => (<>
                <th>{t('order_id_label')}</th><td> {m.order_code}</td>
                <th>{t('amount_label')}</th><td> {m.amount}</td>
                <th>{t('store_name_label')}</th><td> {m.store_name}</td>
                <th>{t('payment_method_label')}</th><td> {m.method}</td>
            </>)}

            createFormArg={(props) => props.order}
        />
    );
});

export default SalesCashDiscountView;
