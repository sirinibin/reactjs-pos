import React from "react";
import { Dropdown } from "react-bootstrap";
import { useTranslation } from "react-i18next";

// One "Import" dropdown holding every import source of the sales form.
// Sources whose handler isn't passed are left out; From P.O. also needs the purchase order module.
export function SalesImportMenuItems({ store, openQuotations, openDeliveryNotes, openImportFromSales, openImportFromPurchase, openImportFromPO, testIdPrefix = "" }) {
    const { t } = useTranslation("common");
    const items = [
        openQuotations && { key: "quotations", onClick: openQuotations, icon: "bi-file-earmark-text", label: t("From Quotations") },
        openDeliveryNotes && { key: "delivery-notes", onClick: openDeliveryNotes, icon: "bi-file-earmark-text", label: t("From Delivery Notes") },
        openImportFromSales && { key: "sales", onClick: openImportFromSales, icon: "bi-receipt", label: t("From Sales") },
        openImportFromPurchase && { key: "purchase", onClick: openImportFromPurchase, icon: "bi-bag", label: t("From Purchase") },
        openImportFromPO && store?.settings?.enable_purchase_order_module && { key: "po", onClick: openImportFromPO, icon: "bi-file-earmark-arrow-down", label: t("From P.O.") },
    ].filter(Boolean);
    return items.map(it => (
        <Dropdown.Item key={it.key} onClick={() => it.onClick()} data-testid={`${testIdPrefix}import-from-${it.key}-btn`}>
            <i className={`bi ${it.icon} me-1`}></i>{it.label}
        </Dropdown.Item>
    ));
}

export default function SalesImportDropdown({ toggleStyle, toggleClassName, toggleContent, testIdPrefix = "", align, ...handlers }) {
    const { t } = useTranslation("common");
    return (
        <Dropdown style={{ flexShrink: 0 }}>
            <Dropdown.Toggle bsPrefix="btn" className={toggleClassName} style={toggleStyle} title={t("Import")} data-testid={`${testIdPrefix}import-dropdown-btn`}>
                {toggleContent || <><i className="bi bi-download me-1"></i>{t("Import")}</>}
            </Dropdown.Toggle>
            <Dropdown.Menu align={align} style={{ zIndex: 9999 }}>
                <SalesImportMenuItems testIdPrefix={testIdPrefix} {...handlers} />
            </Dropdown.Menu>
        </Dropdown>
    );
}
