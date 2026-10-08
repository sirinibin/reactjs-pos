import React, { forwardRef } from "react";
import { useTranslation } from "react-i18next";
import PaymentView from '../utils/PaymentView.js';
import { formatInStoreTimezone } from '../utils/dateUtils.js';

const PurchaseCashDiscountView = forwardRef((props, ref) => {
    const { t } = useTranslation('common');
    return (
        <PaymentView
            ref={ref}
            {...props}
            apiPath="/v1/purchase-cash-discount"
            title={m => `${t('details_of_purchase_cash_discount_of_purchase')} #${m.purchase_code}`}
            renderFirstRow={m => (<>
                <th>{t('purchase_id_label')}</th><td> {m.purchase_code}</td>
                <th>{t('amount_label')}</th><td> {m.amount}</td>
                <th>{t('store_name_label')}</th><td> {m.store_name}</td>
            </>)}
            renderSecondRow={m => (<>
                <th>{t('created_by_label')}</th><td> {m.created_by_name}</td>
                <th>{t('created_at_label')}</th><td> {formatInStoreTimezone(m.created_at)}</td>
                <th>{t('updated_at_label')}</th><td> {formatInStoreTimezone(m.updated_at)}</td>
            </>)}
            createFormArg={(props) => props.purchase}
        />
    );
});

export default PurchaseCashDiscountView;
