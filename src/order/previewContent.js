import { React, forwardRef } from "react";
import { format } from "date-fns";
import n2words from 'n2words'
import { QRCodeCanvas } from "qrcode.react";
import { trimTo2Decimals } from "../utils/numberUtils";
import '@emran-alhaddad/saudi-riyal-font/index.css';
import Amount from "../utils/amount.js";

const PreviewContent = forwardRef((props, ref) => {

    let persianDigits = "۰۱۲۳۴۵۶۷۸۹";
    let persianMap = persianDigits.split("");


    function convertToArabicNumber(input) {
        if (Number.isInteger(input)) {
            input = input.toString();
        }

        return input.replace(/\d/g, function (m) {
            return persianMap[parseInt(m)];
        });
    }


    function getArabicDate(engishDate) {
        let event = new Date(engishDate);
        let options = {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: "numeric",
            minute: "numeric",
            second: "numeric",
            //  timeZoneName: "short",
        };
        return event.toLocaleDateString('ar-EG', options)
    }

    let detailsLabelsColumnWidthPercent = "24.62%";
    let detailsValuesColumnWidthPercent = "75.38%";
    let detailsBorderThickness = "solid 0.2px";

    return (<>
        <span ref={ref}>
            {props.model.pages && props.model.pages.map((page, pageIndex) => (
                <div
                    className="container"
                    id="printableArea"
                    style={{
                        backgroundColor: "white",
                        border: "solid 0px",
                        borderColor: "silver",
                        borderRadius: "2mm",
                        paddingLeft: "0px",
                        paddingRight: "0px",
                        paddingTop: "10px",
                        paddingBottom: "4px",
                        marginTop: page.top + "px",
                        height: "auto",
                        width: `${props.whatsAppShare ? "750px" : "750px"}`
                    }}

                >
                    <div className="row">
                        <div className="col">
                            <ul className="list-unstyled text-left">
                                <li>
                                    <h4 className="clickable-text" onClick={() => {
                                        props.selectText("storeName");
                                    }} style={{ fontSize: props.fontSizes[props.modelName + "_storeName"]?.size }}>
                                        {props.model.store ? props.model.store.name : "<STORE_NAME>"}
                                    </h4>
                                </li>
                                <li className="clickable-text" onClick={() => {
                                    props.selectText("storeTitle");
                                }} style={{ fontSize: props.fontSizes[props.modelName + "_storeTitle"]?.size }}>{props.model.store ? props.model.store.title : "<STORE_TITLE>"}</li>
                                {/*<!-- <li><hr /></li> --> */}
                                <li className="clickable-text" onClick={() => {
                                    props.selectText("storeCR");
                                }} style={{ fontSize: props.fontSizes[props.modelName + "_storeCR"]?.size }}>C.R. / {props.model.store ? props.model.store.registration_number : "<STORE_CR_NO>"}</li>
                                <li className="clickable-text" onClick={() => {
                                    props.selectText("storeVAT");
                                }} style={{ fontSize: props.fontSizes[props.modelName + "_storeVAT"]?.size }}>VAT / {props.model.store ? props.model.store.vat_no : "<STORE_VAT_NO>"}</li>
                            </ul>
                        </div>
                        <div className="col">
                            <div className="invoice-logo text-center">
                                {props.model?.store?.logo ? <img width="70" height="70" src={props.model.store.logo + "?" + (Date.now())} alt="Invoice logo" /> : null}
                            </div>
                        </div>
                        <div className="col">
                            <ul className="list-unstyled text-end">
                                <li>
                                    <h4 className="clickable-text" onClick={() => {
                                        props.selectText("storeNameArabic");
                                    }} style={{ fontSize: props.fontSizes[props.modelName + "_storeNameArabic"]?.size }}>
                                        <strong>
                                            {props.model.store ? props.model.store.name_in_arabic : "<STORE_NAME_ARABIC>"}
                                        </strong>
                                    </h4>
                                </li>
                                <li className="clickable-text" onClick={() => {
                                    props.selectText("storeTitleArabic");
                                }} style={{ fontSize: props.fontSizes[props.modelName + "_storeTitleArabic"]?.size }}>
                                    {props.model.store ? props.model.store.title_in_arabic : "<STORE_TITLE_ARABIC>"}
                                </li>
                                {/* <!-- <li><hr /></li> --> */}
                                <li className="clickable-text" onClick={() => {
                                    props.selectText("storeCRArabic");
                                }} style={{ fontSize: props.fontSizes[props.modelName + "_storeCRArabic"]?.size }}>{props.model.store ? props.model.store.registration_number_in_arabic : "<STORE_CR_NO_ARABIC>"}</li>
                                <li className="clickable-text" onClick={() => {
                                    props.selectText("storeVATArabic");
                                }} style={{ fontSize: props.fontSizes[props.modelName + "_storeVATArabic"]?.size }} >{props.model.store ? props.model.store.vat_no_in_arabic : "<STORE_VAT_NO_ARABIC>"}</li>
                            </ul>
                        </div>
                    </div>
                    <div className="row">
                        <div className="col">
                            <u><h1 className="text-center clickable-text" onClick={() => {
                                props.selectText("invoiceTitle");
                            }} style={{ fontSize: props.fontSizes[props.modelName + "_invoiceTitle"]?.size }} >
                                {props.model.invoiceTitle}
                            </h1>
                            </u>
                        </div>
                    </div>

                    <div className="row col-md-14 fw-bold" style={{ border: "solid 0px", fontSize: props.fontSizes[props.modelName + "_invoiceDetails"]?.size, padding: "10px" }} onClick={() => {
                        props.selectText("invoiceDetails");
                    }}>
                        <div className="col-md-12" style={{ border: detailsBorderThickness, marginLeft: "0px", width: `${(props.model.store?.zatca_qr_on_left_bottom || (props.modelName === "quotation" && props.model.type !== "invoice")) ? "100%" : "74%"}` }}>
                            {/*props.model.invoice_count_value && props.model.store?.zatca?.phase === "2" && props.model.zatca?.reporting_passed ? <div className="row" dir="ltr" style={{ border: detailsBorderThickness }} >
                                <div className="col-md-4" dir="ltr" style={{ border: detailsBorderThickness, width: detailsLabelsColumnWidthPercent, padding: "3px" }} >Invoice Count Value | عد الفاتورة (ICV):</div>
                                <div className="col-md-8" dir="ltr" style={{ border: detailsBorderThickness, width: detailsValuesColumnWidthPercent, padding: "3px" }} >  {props.model.invoice_count_value ? props.model.invoice_count_value : ""}</div>
                            </div> : ""*/}
                            {/*props.model.uuid && props.model.store?.zatca?.phase === "2" && props.model.zatca?.reporting_passed ? <div className="row" dir="ltr" style={{ border: detailsBorderThickness }} >
                                <div className="col-md-4" dir="ltr" style={{ border: detailsBorderThickness, width: detailsLabelsColumnWidthPercent, padding: "3px" }} >UUID | معرف فريد:</div>
                                <div className="col-md-8" dir="ltr" style={{ border: detailsBorderThickness, width: detailsValuesColumnWidthPercent, padding: "3px" }} > {props.model.uuid ? props.model.uuid : ""}</div>
                            </div> : ""*/}
                            {props.modelName === "quotation" && props.model.type !== "invoice" && <>
                                <div className="row" dir="ltr" style={{ border: detailsBorderThickness }} >
                                    <div className="col-md-4" dir="ltr" style={{ border: detailsBorderThickness, width: detailsLabelsColumnWidthPercent, padding: "3px" }} >Quotation No. | رقم الاقتباس: </div>
                                    <div className="col-md-8" dir="ltr" style={{ border: detailsBorderThickness, width: detailsValuesColumnWidthPercent, padding: "3px" }} >    {props.model.code ? props.model.code : ""}</div>
                                </div>
                                <div className="row" dir="ltr" style={{ border: detailsBorderThickness }} >
                                    <div className="col-md-4" dir="ltr" style={{ border: detailsBorderThickness, width: detailsLabelsColumnWidthPercent, padding: "3px" }} > Quotation Date | تاريخ الاقتباس: </div>
                                    <div className="col-md-8" dir="ltr" style={{ border: detailsBorderThickness, width: detailsValuesColumnWidthPercent, padding: "3px" }} > {props.model.date ? format(
                                        new Date(props.model.date),
                                        "yyyy-MM-dd h:mma"
                                    ) : "<DATETIME>"} {" | " + getArabicDate(props.model.date)}</div>
                                </div>
                            </>}
                            {(props.modelName !== "quotation" || props.model.type === "invoice") && <>
                                <div className="row" dir="ltr" style={{ border: detailsBorderThickness }} >
                                    <div className="col-md-4" dir="ltr" style={{ border: detailsBorderThickness, width: detailsLabelsColumnWidthPercent, padding: "3px" }} >Invoice No. | رقم الفاتورة:</div>
                                    <div className="col-md-8" dir="ltr" style={{ border: detailsBorderThickness, width: detailsValuesColumnWidthPercent, padding: "3px" }} >    {props.model.code ? props.model.code : ""}</div>
                                </div>
                                <div className="row" dir="ltr" style={{ border: detailsBorderThickness }} >
                                    <div className="col-md-4" dir="ltr" style={{ border: detailsBorderThickness, width: detailsLabelsColumnWidthPercent, padding: "3px" }} > Invoice Date | تاريخ الفاتورة:</div>
                                    <div className="col-md-8" dir="ltr" style={{ border: detailsBorderThickness, width: detailsValuesColumnWidthPercent, padding: "3px" }} > {props.model.date ? format(
                                        new Date(props.model.date),
                                        "yyyy-MM-dd h:mma"
                                    ) : "<DATETIME>"} {" | " + getArabicDate(props.model.date)}</div>
                                </div>
                            </>}
                            {props.model && props.model.order_code && props.modelName === "sales_return" && <div className="row" dir="ltr" style={{ border: "solid 0px" }} >
                                <div className="col-md-4" dir="ltr" style={{ border: detailsBorderThickness, width: detailsLabelsColumnWidthPercent, padding: "3px" }} >Original Invoice No. | رقم الفاتورة الأصلية:</div>
                                <div className="col-md-8" dir="ltr" style={{ border: detailsBorderThickness, width: detailsValuesColumnWidthPercent, padding: "3px" }} >    {props.model.order_code ? props.model.order_code : ""}</div>
                            </div>}
                            {props.model && props.model.order_code && props.model.order?.date && props.modelName === "sales_return" && <div className="row" dir="ltr" style={{ border: "solid 0px" }} >
                                <div className="col-md-4" dir="ltr" style={{ border: detailsBorderThickness, width: detailsLabelsColumnWidthPercent, padding: "3px" }} > Original Invoice Date | تاريخ الفاتورة الأصلية:</div>
                                <div className="col-md-8" dir="ltr" style={{ border: detailsBorderThickness, width: detailsValuesColumnWidthPercent, padding: "3px" }} > {props.model.order?.date ? format(
                                    new Date(props.model.order?.date),
                                    "yyyy-MM-dd h:mma"
                                ) : "<DATETIME>"} {" | " + getArabicDate(props.model.order?.date)}</div>
                            </div>}
                            {props.model && props.model.purchase_code && props.modelName === "purchase_return" && <div className="row" dir="ltr" style={{ border: "solid 0px" }} >
                                <div className="col-md-4" dir="ltr" style={{ border: detailsBorderThickness, width: detailsLabelsColumnWidthPercent, padding: "3px" }} >Original Invoice No. | رقم الفاتورة الأصلية:</div>
                                <div className="col-md-8" dir="ltr" style={{ border: detailsBorderThickness, width: detailsValuesColumnWidthPercent, padding: "3px" }} >    {props.model.purchase_code ? props.model.purchase_code : ""}</div>
                            </div>}
                            {props.model && props.model.purchase_code && props.model.purchase?.date && props.modelName === "purchase_return" && <div className="row" dir="ltr" style={{ border: "solid 0px" }} >
                                <div className="col-md-4" dir="ltr" style={{ border: detailsBorderThickness, width: detailsLabelsColumnWidthPercent, padding: "3px" }} > Original Invoice Date | تاريخ الفاتورة الأصلية:</div>
                                <div className="col-md-8" dir="ltr" style={{ border: detailsBorderThickness, width: detailsValuesColumnWidthPercent, padding: "3px" }} > {props.model.purchase?.date ? format(
                                    new Date(props.model.purchase?.date),
                                    "yyyy-MM-dd h:mma"
                                ) : "<DATETIME>"} {" | " + getArabicDate(props.model.purchase?.date)}</div>
                            </div>}

                            {props.modelName === "sales" || props.modelName === "sales_return" || props.modelName === "quotation" || props.modelName === "delivery_note" ? <>
                                <div className="row" dir="ltr" style={{ border: detailsBorderThickness }} >
                                    <div className="col-md-4" dir="ltr" style={{ border: detailsBorderThickness, width: detailsLabelsColumnWidthPercent, padding: "3px" }} >  Customer Name | اسم العميل:</div>
                                    <div className="col-md-8" dir="ltr" style={{ border: detailsBorderThickness, width: detailsValuesColumnWidthPercent, padding: "3px" }} >
                                        {props.model.customer ? props.model.customer.name : ""}
                                        {!props.model.customer && props.model.customerName ? props.model.customerName : ""}
                                        {!props.model.customerName && !props.model.customer ? "N/A" : ""}
                                        {props.model.customer?.name_in_arabic ? " | " + props.model.customer.name_in_arabic : ""}
                                    </div>
                                </div>

                                <div className="row" dir="ltr" style={{ border: detailsBorderThickness }} >
                                    <div className="col-md-4" dir="ltr" style={{ border: detailsBorderThickness, width: detailsLabelsColumnWidthPercent, padding: "3px" }} >  Customer ID | معرف العميل:</div>
                                    <div className="col-md-8" dir="ltr" style={{ border: detailsBorderThickness, width: detailsValuesColumnWidthPercent, padding: "3px" }} >
                                        {props.model.customer?.code ? props.model.customer.code : "N/A"}

                                    </div>
                                </div>

                                <div className="row" dir="ltr" style={{ border: detailsBorderThickness }} >
                                    <div className="col-md-4" dir="ltr" style={{ border: detailsBorderThickness, width: detailsLabelsColumnWidthPercent, padding: "3px" }} >   Customer VAT  | ضريبة القيمة المضافة للعملاء:</div>
                                    <div className="col-md-8" dir="ltr" style={{ border: detailsBorderThickness, width: detailsValuesColumnWidthPercent, padding: "3px" }} >
                                        {props.model.customer?.vat_no ? props.model.customer.vat_no : ""}
                                        {!props.model.customer && props.model.vat_no ? props.model.vat_no : ""}
                                        {!props.model.customer && !props.model.vat_no ? "N/A" : ""}
                                        {props.model.customer?.vat_no_in_arabic ? " | " + props.model.customer.vat_no_in_arabic : ""}
                                        {!props.model.customer && props.model.vat_no ? " | " + convertToArabicNumber(props.model.vat_no) : ""}
                                    </div>
                                </div>

                                <div className="row" dir="ltr" style={{ border: detailsBorderThickness }} >
                                    <div className="col-md-4" dir="ltr" style={{ border: detailsBorderThickness, width: detailsLabelsColumnWidthPercent, padding: "3px" }} > Customer C.R | رقم تسجيل شركة العميل:</div>
                                    <div className="col-md-8" dir="ltr" style={{ border: detailsBorderThickness, width: detailsValuesColumnWidthPercent, padding: "3px" }} >
                                        {props.model.customer?.registration_number ? props.model.customer.registration_number + " | " + convertToArabicNumber(props.model.customer.registration_number) : "N/A"}
                                    </div>
                                </div>

                                <div className="row" dir="ltr" style={{ border: detailsBorderThickness }} >
                                    <div className="col-md-4" dir="ltr" style={{ border: detailsBorderThickness, width: detailsLabelsColumnWidthPercent, padding: "3px" }} > Customer Address | عنوان العميل:</div>
                                    <div className="col-md-8" dir="ltr" style={{ border: detailsBorderThickness, width: detailsValuesColumnWidthPercent, padding: "3px" }} >
                                        {props.model.address && !props.model.customer ? props.model.address : ""}

                                        {!props.model.customer?.national_address?.building_no && !props.model.customer?.national_address?.unit_no && props.model.customer?.national_address?.street_name && props.model.customer?.national_address?.district_name && props.model.customer?.national_address?.city_name ? props.model.customer?.address : ""}
                                        <span dir="ltr">
                                            {props.model.customer?.national_address?.building_no ? `${props.model.customer.national_address.building_no}` : ""}
                                            {props.model.customer?.national_address?.street_name ? ` ${props.model.customer.national_address.street_name}` : ""}
                                            {props.model.customer?.national_address?.district_name ? ` - ${props.model.customer.national_address.district_name}` : ""}
                                            {props.model.customer?.national_address?.unit_no ? `, Unit #${props.model.customer.national_address.unit_no}` : ""}
                                            {props.model.customer?.national_address?.city_name ? `, ${props.model.customer.national_address.city_name}` : ""}
                                            {props.model.customer?.national_address?.zipcode ? ` - ${props.model.customer.national_address.zipcode}` : ""}
                                            {props.model.customer?.national_address?.additional_no ? ` - ${props.model.customer.national_address.additional_no}` : ""}
                                            {/*props.model.customer?.country_name ? `, ${props.model.customer.country_name}` : ""*/}
                                        </span>

                                        {props.model.address && !props.model.customer ? props.model.address : ""}
                                        {props.model.customer?.national_address?.building_no_arabic && props.model.customer?.national_address?.street_name_arabic && props.model.customer?.national_address?.district_name_arabic && props.model.customer?.national_address?.city_name_arabic && props.model.customer?.national_address?.zipcode_arabic && <span dir="rtl">
                                            <br />
                                            {props.model.customer?.national_address?.building_no_arabic ? `${props.model.customer.national_address.building_no_arabic}  ` : ""}
                                            {props.model.customer?.national_address?.street_name_arabic ? ` ${props.model.customer.national_address.street_name_arabic}` : ""}
                                            {props.model.customer?.national_address?.district_name_arabic ? ` - ${props.model.customer.national_address.district_name_arabic}` : ""}
                                            {props.model.customer?.national_address?.unit_no_arabic ? `,رقم الوحدة ${props.model.customer.national_address.unit_no_arabic}` : ""}
                                            {props.model.customer?.national_address?.city_name_arabic ? `, ${props.model.customer.national_address.city_name_arabic}` : ""}
                                            {props.model.customer?.national_address?.zipcode_arabic ? ` - ${props.model.customer.national_address.zipcode_arabic} ` : ""}
                                            {props.model.customer?.national_address?.additional_no_arabic ? `- ${props.model.customer.national_address.additional_no_arabic} ` : ""}
                                            {/*props.model.customer?.country_name === "Saudi Arabia" ? `المملكة العربية السعودية , ` : ""*/}
                                        </span>}
                                    </div>
                                </div>
                            </> : ""}
                            {props.modelName === "purchase" || props.modelName === "purchase_return" ? <>
                                <div className="row" dir="ltr" style={{ border: detailsBorderThickness }} >
                                    <div className="col-md-4" dir="ltr" style={{ border: detailsBorderThickness, width: detailsLabelsColumnWidthPercent, padding: "3px" }} >  Vendor Name | اسم العميل:</div>
                                    <div className="col-md-8" dir="ltr" style={{ border: detailsBorderThickness, width: detailsValuesColumnWidthPercent, padding: "3px" }} >
                                        {props.model.vendor ? props.model.vendor.name : ""}
                                        {!props.model.vendor && props.model.vendorName ? props.model.vendorName : ""}
                                        {!props.model.vendorName && !props.model.vendor ? "N/A" : ""}
                                    </div>
                                </div>

                                <div className="row" dir="ltr" style={{ border: detailsBorderThickness }} >
                                    <div className="col-md-4" dir="ltr" style={{ border: detailsBorderThickness, width: detailsLabelsColumnWidthPercent, padding: "3px" }} >  Vendor ID | معرف البائع:</div>
                                    <div className="col-md-8" dir="ltr" style={{ border: detailsBorderThickness, width: detailsValuesColumnWidthPercent, padding: "3px" }} >
                                        {props.model.vendor?.code ? props.model.vendor.code : "N/A"}

                                    </div>
                                </div>

                                <div className="row" dir="ltr" style={{ border: detailsBorderThickness }} >
                                    <div className="col-md-4" dir="ltr" style={{ border: detailsBorderThickness, width: detailsLabelsColumnWidthPercent, padding: "3px" }} >  Vendor VAT | ضريبة القيمة المضافة للعملاء:</div>
                                    <div className="col-md-8" dir="ltr" style={{ border: detailsBorderThickness, width: detailsValuesColumnWidthPercent, padding: "3px" }} >
                                        {props.model.vendor?.vat_no ? props.model.vendor.vat_no : ""}
                                        {!props.model.vendor && props.model.vat_no ? props.model.vat_no : ""}
                                        {!props.model.vendor && !props.model.vat_no ? "N/A" : ""}
                                    </div>
                                </div>

                                <div className="row" dir="ltr" style={{ border: detailsBorderThickness }} >
                                    <div className="col-md-4" dir="ltr" style={{ border: detailsBorderThickness, width: detailsLabelsColumnWidthPercent, padding: "3px" }} > Vendor C.R | رقم تسجيل الشركة الموردة:</div>
                                    <div className="col-md-8" dir="ltr" style={{ border: detailsBorderThickness, width: detailsValuesColumnWidthPercent, padding: "3px" }} >
                                        {props.model.vendor?.registration_number ? props.model.vendor.registration_number : "N/A"}
                                    </div>
                                </div>

                                <div className="row" dir="ltr" style={{ border: detailsBorderThickness }} >
                                    <div className="col-md-4" dir="ltr" style={{ border: detailsBorderThickness, width: detailsLabelsColumnWidthPercent, padding: "3px" }} > Vendor Address | عنوان العميل:</div>
                                    <div className="col-md-8" dir="ltr" style={{ border: detailsBorderThickness, width: detailsValuesColumnWidthPercent, padding: "3px" }} >
                                        {props.model.address && !props.model.vendor ? props.model.address : ""}

                                        {!props.model.vendor?.national_address?.building_no && !props.model.vendor?.national_address?.unit_no && props.model.vendor?.national_address?.street_name && props.model.vendor?.national_address?.district_name && props.model.vendor?.national_address?.city_name ? props.model.vendor?.address : ""}
                                        <span dir="ltr">
                                            {props.model.vendor?.national_address?.building_no ? `${props.model.vendor.national_address.building_no}` : ""}
                                            {props.model.vendor?.national_address?.street_name ? ` ${props.model.vendor.national_address.street_name}` : ""}
                                            {props.model.vendor?.national_address?.district_name ? ` - ${props.model.vendor.national_address.district_name}` : ""}
                                            {props.model.vendor?.national_address?.unit_no ? `, Unit #${props.model.vendor.national_address.unit_no}` : ""}
                                            {props.model.vendor?.national_address?.city_name ? `, ${props.model.vendor.national_address.city_name}` : ""}
                                            {props.model.vendor?.national_address?.zipcode ? ` - ${props.model.vendor.national_address.zipcode}` : ""}
                                            {props.model.vendor?.national_address?.additional_no ? ` - ${props.model.vendor.national_address.additional_no}` : ""}
                                            {/*props.model.customer?.country_name ? `, ${props.model.customer.country_name}` : ""*/}
                                        </span>

                                        {props.model.address && !props.model.vendor ? props.model.address : ""}
                                        {props.model.vendor?.national_address?.building_no_arabic && props.model.vendor?.national_address?.street_name_arabic && props.model.vendor?.national_address?.district_name_arabic && props.model.vendor?.national_address?.city_name_arabic && props.model.vendor?.national_address?.zipcode_arabic && <span dir="rtl">
                                            <br />
                                            {props.model.vendor?.national_address?.building_no_arabic ? `${props.model.vendor.national_address.building_no_arabic}  ` : ""}
                                            {props.model.vendor?.national_address?.street_name_arabic ? ` ${props.model.vendor.national_address.street_name_arabic}` : ""}
                                            {props.model.vendor?.national_address?.district_name_arabic ? ` - ${props.model.vendor.national_address.district_name_arabic}` : ""}
                                            {props.model.vendor?.national_address?.unit_no_arabic ? `,رقم الوحدة ${props.model.vendor.national_address.unit_no_arabic}` : ""}
                                            {props.model.vendor?.national_address?.city_name_arabic ? `, ${props.model.vendor.national_address.city_name_arabic}` : ""}
                                            {props.model.vendor?.national_address?.zipcode_arabic ? ` - ${props.model.vendor.national_address.zipcode_arabic} ` : ""}
                                            {props.model.vendor?.national_address?.additional_no_arabic ? `- ${props.model.vendor.national_address.additional_no_arabic} ` : ""}
                                            {/*props.model.customer?.country_name === "Saudi Arabia" ? `المملكة العربية السعودية , ` : ""*/}
                                        </span>}
                                    </div>
                                </div>
                            </> : ""}
                        </div>
                        {!props.model.store?.zatca_qr_on_left_bottom && props.modelName !== "delivery_note" && props.modelName !== "quotation" && <div className="col-md-2" style={{ border: "solid 0px", width: "26%" }}>
                            {props.model.store?.zatca?.phase === "1" && props.model.QRImageData ? <img src={props.model.QRImageData} style={{ width: "138px", height: "138px", border: "solid 0px" }} alt="Invoice QR Code" /> : ""}
                            {props.model.store?.zatca?.phase === "2" && props.model.zatca?.qr_code && props.model.zatca?.reporting_passed ? <QRCodeCanvas value={props.model.zatca?.qr_code} style={{ width: "138px", height: "138px" }} size={138} /> : ""}
                            {props.model.store?.zatca?.phase === "2" && !props.model.zatca?.qr_code ? <img src={props.model.QRImageData} style={{ width: "138px", height: "138px", border: "solid 0px" }} alt="Invoice QR Code" /> : ""}
                        </div>}
                    </div>

                    < div className="row clickable-text" style={{ fontSize: props.fontSizes[props.modelName + "_invoicePageCount"]?.size }} onClick={() => {
                        props.selectText("invoicePageCount");
                    }}>
                        <div className="col text-start">
                            {props.model.total_pages ? "Page " + (pageIndex + 1) + " of " + props.model.total_pages : ""}
                        </div>
                        <div className="col text-end">
                            {props.model.total_pages ? convertToArabicNumber(props.model.total_pages.toString()) + " الصفحة " + convertToArabicNumber((pageIndex + 1).toString()) + " من " : ""}
                        </div>
                    </div>
                    <div className="row">
                        <div className="col">
                            <div
                                className="table-responsive"
                                style={{
                                    overflow: "hidden", outline: "none"
                                }}
                                tabIndex="0"
                            >

                                <table
                                    className="table no-bold table-bordered no-bold"
                                    style={{ borderRadius: "6px" }}
                                >
                                    <thead style={{ fontSize: props.fontSizes[props.modelName + "_tableHead"]?.size, height: "auto" }} onClick={() => {
                                        props.selectText("tableHead");
                                    }} className="fw-bold clickable-text">
                                        <tr style={{}}>
                                            <th className="per5 text-center" style={{ padding: "0px", width: "5%" }}>
                                                <ul
                                                    className="list-unstyled"
                                                    style={{
                                                        height: "auto"
                                                    }}
                                                >
                                                    <li>رقم سري</li>
                                                    <li>SI No.</li>
                                                </ul>
                                            </th>
                                            <th className="per8 text-center" style={{ padding: "0px", width: "8%" }}>
                                                <ul
                                                    className="list-unstyled"
                                                    style={{
                                                        height: "auto"
                                                    }}
                                                >
                                                    <li>رقم القطعة</li>
                                                    <li>Part No.</li>
                                                </ul>
                                            </th>
                                            <th className="per39 text-center" style={{ padding: "0px", width: "39%" }}>
                                                <ul
                                                    className="list-unstyled"
                                                    style={{
                                                        height: "auto"
                                                    }}
                                                >
                                                    <li>وصف</li>
                                                    <li>Description</li>
                                                </ul>
                                            </th>
                                            <th className="per5 text-center" style={{ padding: "0px", width: "5%" }}>
                                                <ul
                                                    className="list-unstyled"
                                                    style={{
                                                        height: "auto"
                                                    }}
                                                >
                                                    <li>كمية</li>
                                                    <li>Qty</li>
                                                </ul>
                                            </th>
                                            {props.modelName !== "delivery_note" && <>
                                                <th className="per8 text-center" style={{ padding: "0px", width: "8%" }}>
                                                    <ul
                                                        className="list-unstyled"
                                                        style={{
                                                            height: "auto"
                                                        }}
                                                    >
                                                        <li>سعر الوحدة</li>
                                                        <li>Unit Price</li>
                                                    </ul>
                                                </th>
                                                <th className="per5 text-center" style={{ padding: "0px", width: "5%" }}>
                                                    <ul
                                                        className="list-unstyled"
                                                        style={{
                                                            height: "auto"
                                                        }}
                                                    >
                                                        <li>تخفيض</li>
                                                        <li>Discount</li>
                                                    </ul>
                                                </th>
                                                <th className="per12 text-center" style={{ padding: "0px", width: "12%" }}>
                                                    <ul
                                                        className="list-unstyled"
                                                        style={{
                                                            height: "auto"
                                                        }}
                                                    >
                                                        <li>السعر (بدون ضريبة القيمة المضافة)</li>
                                                        <li>Price (without VAT)</li>
                                                    </ul>
                                                </th>
                                                <th className="per5 text-center" style={{ padding: "0px", width: "5%" }}>
                                                    <ul
                                                        className="list-unstyled"
                                                        style={{
                                                            height: "auto"
                                                        }}
                                                    >
                                                        <li>ضريبة القيمة المضافة</li>
                                                        <li>VAT({trimTo2Decimals(props.model.vat_percent)}%)</li>
                                                    </ul>
                                                </th>
                                                <th className="per12 text-center" style={{ padding: "0px", width: "12%", maxWidth: "12%" }}>
                                                    <ul
                                                        className="list-unstyled"
                                                        style={{
                                                            height: "auto"
                                                        }}
                                                    >
                                                        <li>السعر (مع ضريبة القيمة المضافة)</li>
                                                        <li>Price (with VAT)</li>
                                                    </ul>
                                                </th>
                                            </>}
                                        </tr>
                                    </thead>
                                    <tbody style={{ fontSize: props.fontSizes[props.modelName + "_tableBody"]?.size }} className="fw-bold clickable-text" onClick={() => {
                                        props.selectText("tableBody");
                                    }} >
                                        {page.products && page.products.map((product, index) => (
                                            <tr key={product.item_code} className="text-center"  >
                                                <td style={{ padding: "1px", height: "16px", maxWidth: "30px" }}>{product.part_number ? index + 1 + (pageIndex * props.model.pageSize) : ""}</td>
                                                <td style={{ padding: "1px" }} >{product.prefix_part_number ? product.prefix_part_number + " - " : ""} {product.part_number ? product.part_number : ""}</td>
                                                <td style={{ padding: "1px" }}>
                                                    {product.name}{product.name_in_arabic ? "/" + product.name_in_arabic : ""}
                                                </td>
                                                <td style={{ padding: "1px" }}>{product.quantity ? product.quantity : ""}  {product.unit ? product.unit : ""}</td>
                                                {props.modelName !== "delivery_note" && <>
                                                    <td className="text-end" style={{ padding: "1px" }} >
                                                        {product.unit_price ? <Amount amount={trimTo2Decimals(product.unit_price)} /> : ""}
                                                        {product.purchase_unit_price && props.modelName === "purchase" ? <Amount amount={trimTo2Decimals(product.purchase_unit_price)} /> : ""}
                                                        {product.purchasereturn_unit_price && props.modelName === "purchase_return" ? <Amount amount={trimTo2Decimals(product.purchasereturn_unit_price)} /> : ""}
                                                    </td>
                                                    <td style={{ padding: "1px" }} className="text-end">{product.unit_discount_percent ? "(" + trimTo2Decimals(product.unit_discount_percent) + "%)" : ""}{product.unit_discount ? " " + trimTo2Decimals(product.unit_discount * product.quantity) : ""} </td>
                                                    <td style={{ padding: "1px" }} className="text-end">

                                                        {product.unit_price ? <Amount amount={trimTo2Decimals((product.unit_price - product.unit_discount) * product.quantity)} /> : ""}
                                                        {product.purchase_unit_price && props.modelName === "purchase" ? <Amount amount={trimTo2Decimals((product.purchase_unit_price - product.unit_discount) * product.quantity)} /> : ""}
                                                        {product.purchasereturn_unit_price && props.modelName === "purchase_return" ? <Amount amount={trimTo2Decimals((product.purchasereturn_unit_price - product.unit_discount) * product.quantity)} /> : ""}
                                                    </td>
                                                    <td style={{ padding: "1px" }} className="text-end">
                                                        {product.unit_price ? <Amount amount={trimTo2Decimals((product.unit_price - product.unit_discount) * product.quantity) * (props.model.vat_percent / 100)} /> : ""}
                                                        {product.purchase_unit_price && props.modelName === "purchase" ? <Amount amount={trimTo2Decimals((product.purchase_unit_price - product.unit_discount) * product.quantity) * (props.model.vat_percent / 100)} /> : ""}
                                                        {product.purchasereturn_unit_price && props.modelName === "purchase_return" ? <Amount amount={trimTo2Decimals((product.purchasereturn_unit_price - product.unit_discount) * product.quantity) * (props.model.vat_percent / 100)} /> : ""}
                                                    </td>
                                                    <td style={{ padding: "1px" }} className="text-end">
                                                        {product.unit_price ? <Amount amount={trimTo2Decimals(((product.unit_price - product.unit_discount) * product.quantity) + (((product.unit_price - product.unit_discount) * product.quantity) * (props.model.vat_percent / 100)))} /> : ""}
                                                        {product.purchase_unit_price && props.modelName === "purchase" ? <Amount amount={trimTo2Decimals(((product.purchase_unit_price - product.unit_discount) * product.quantity) + (((product.purchase_unit_price - product.unit_discount) * product.quantity) * (props.model.vat_percent / 100)))} /> : ""}
                                                        {product.purchasereturn_unit_price && props.modelName === "purchase_return" ? <Amount amount={trimTo2Decimals(((product.purchasereturn_unit_price - product.unit_discount) * product.quantity) + (((product.purchasereturn_unit_price - product.unit_discount) * product.quantity) * (props.model.vat_percent / 100)))} /> : ""}
                                                    </td>
                                                </>}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <table className="table no-bold table-bordered no-bold"
                                    style={{ borderRadius: "6px", marginTop: "-16px" }}>

                                    {props.modelName !== "delivery_note" && <tbody style={{ fontSize: props.fontSizes[props.modelName + "_tableFooter"]?.size }} onClick={() => {
                                        props.selectText("tableFooter");
                                    }} className="fw-bold clickable-text">
                                        <tr >
                                            {props.model.store?.zatca_qr_on_left_bottom && props.modelName !== "quotation" && props.modelName !== "delivery_note" && <th colSpan={2} rowSpan={6} style={{ maxWidth: "138px", maxHeight: "138px", width: "20%" }}>
                                                <div className="col-md-1 text-center" style={{ border: "solid 0px", padding: "0px", maxWidth: "138px", maxHeight: "138px", marginLeft: "-7px", marginTop: "-7px" }}>
                                                    {props.model.store?.zatca?.phase === "1" && props.model.QRImageData ? <img className="text-start" src={props.model.QRImageData} style={{ width: "138px", height: "138px" }} alt="Invoice QR Code" /> : ""}
                                                    {props.model.store?.zatca?.phase === "2" && props.model.zatca?.qr_code && props.model.zatca?.reporting_passed ? <QRCodeCanvas value={props.model.zatca?.qr_code} style={{ width: "138px", height: "138px", border: "solid 0px", }} size={138} /> : ""}
                                                    {props.model.store?.zatca?.phase === "2" && !props.model.zatca?.qr_code ? <img src={props.model.QRImageData} style={{ width: "138px", height: "138px", border: "solid 0px" }} alt="Invoice QR Code" /> : ""}
                                                </div>
                                            </th>}
                                            <th colSpan={props.model.store?.zatca_qr_on_left_bottom && props.model.type !== "quotation" ? 6 : 8} className="text-end" style={{ padding: "2px" }}>
                                                Total (without VAT) الإجمالي (بدون ضريبة القيمة المضافة):
                                            </th>
                                            <td className="text-end" colSpan="1" style={{ padding: "2px", }} >
                                                <Amount amount={trimTo2Decimals(props.model.total)} />
                                            </td>
                                        </tr>
                                        <tr>
                                            <th className="text-end" colSpan={props.model.store?.zatca_qr_on_left_bottom && props.model.type !== "quotation" ? 6 : 8} style={{ padding: "2px" }}>

                                                Shipping / Handling Fees   رسوم الشحن / المناولة:
                                            </th>
                                            <td className="text-end" colSpan="1" style={{ padding: "2px" }}>
                                                <Amount amount={trimTo2Decimals(props.model.shipping_handling_fee)} />
                                            </td>
                                        </tr>
                                        <tr>
                                            <th className="text-end" colSpan={props.model.store?.zatca_qr_on_left_bottom && props.model.type !== "quotation" ? 6 : 8} style={{ padding: "2px" }}>
                                                Total Discount الخصم الإجمالي:
                                            </th>
                                            <td className="text-end" colSpan="1" style={{ padding: "2px" }}>
                                                <Amount amount={trimTo2Decimals(props.model.discount)} />
                                            </td>
                                        </tr>
                                        <tr>
                                            <th colSpan={props.model.store?.zatca_qr_on_left_bottom && props.model.type !== "quotation" ? 6 : 8} className="text-end" style={{ padding: "2px" }}>
                                                Total Taxable Amount (without VAT)  إجمالي المبلغ الخاضع للضريبة (بدون ضريبة القيمة المضافة):
                                            </th>
                                            <td className="text-end" colSpan="1" style={{ padding: "2px" }}>
                                                <Amount amount={trimTo2Decimals((props.model.net_total - props.model.vat_price))} />
                                            </td>
                                        </tr>
                                        <tr>
                                            <th className="text-end" colSpan={props.model.store?.zatca_qr_on_left_bottom && props.model.type !== "quotation" ? 6 : 8} style={{ padding: "2px" }}>
                                                Total VAT {trimTo2Decimals(props.model.vat_percent)}% إجمالي ضريبة القيمة المضافة :
                                            </th>

                                            <td className="text-end" colSpan="1" style={{ padding: "2px" }}>
                                                <Amount amount={trimTo2Decimals(props.model.vat_price)} />

                                            </td>
                                        </tr>

                                        <tr>
                                            <th colSpan={props.model.store?.zatca_qr_on_left_bottom && props.model.type !== "quotation" ? 6 : 8} className="text-end" style={{ padding: "2px", width: "68%" }}>
                                                Net Total (with VAT)  الإجمالي الصافي (مع ضريبة القيمة المضافة):
                                            </th>
                                            <td className="text-end" colSpan="1" style={{ padding: "2px", width: "12%", maxWidth: "12%" }}>
                                                <span className="icon-saudi_riyal">
                                                    <Amount amount={trimTo2Decimals(props.model.net_total)} />
                                                </span>
                                            </td>
                                        </tr>
                                    </tbody>}
                                </table>
                                <table className="table no-bold table-bordered no-bold"
                                    style={{ borderRadius: "6px", marginTop: "-16px" }}
                                >
                                    {props.modelName !== "delivery_note" && <tbody style={{ fontSize: props.fontSizes[props.modelName + "_tableFooter"]?.size }} onClick={() => {
                                        props.selectText("tableFooter");
                                    }} className="fw-bold clickable-text">
                                        <tr>

                                            <th colSpan="2" className="text-end" style={{ padding: "2px" }}>
                                                In Words بكلمات:
                                            </th>
                                            <td
                                                colSpan="7"
                                                style={{ padding: "2px" }}

                                            >
                                                <ul
                                                    className="list-unstyled"
                                                    style={{ marginBottom: "0px" }}
                                                >
                                                    <li>{n2words(props.model.net_total, { lang: 'ar' }) + " ريال سعودي  "}</li>
                                                    <li>{n2words(props.model.net_total, { lang: 'en' }) + " saudi riyals"}</li>
                                                </ul>
                                            </td>
                                        </tr>
                                        <tr>
                                            <th colSpan="2" className="text-end" style={{ padding: "2px" }}>
                                                Remarks ملاحظات:
                                            </th>
                                            <td
                                                colSpan="7"
                                                style={{ padding: "2px" }}

                                            >
                                                {props.model.remarks ? props.model.remarks : ""}
                                            </td>

                                        </tr>
                                        {props.modelName === "quotation" && props.model.type === "quotation" && <>
                                            <tr>

                                                <th colSpan="2" className="text-end" style={{ padding: "2px" }}>
                                                    Validity صحة:
                                                </th>
                                                <th
                                                    colSpan="2"
                                                    style={{ padding: "2px" }}

                                                >
                                                    <span style={{ color: "red" }}> {props.model.validity_days + " days أيام"} </span>
                                                </th>
                                                <th colSpan="2" className="text-end" style={{ padding: "2px" }}>
                                                    Delivery توصيل:
                                                </th>
                                                <th
                                                    colSpan="3"
                                                    style={{ padding: "2px" }}

                                                >
                                                    <span dir="ltr"> Within {props.model.delivery_days} days from the date of payment | خلال {props.model.delivery_days} أيام من تاريخ الدفع</span>
                                                </th>
                                            </tr>


                                            {props.model.pages.length === (pageIndex + 1) && props.model.store?.bank_account && props.model.store?.bank_account?.bank_name ? <tr >
                                                <td colSpan="9" style={{ padding: "0px" }} onClick={(e) => e.stopPropagation()}>

                                                    <table
                                                        className="table table-bordered fw-bold no-bold"
                                                        style={{ borderRadius: "6px" }}

                                                    >
                                                        <thead className="clickable-text" style={{ fontSize: props.fontSizes[props.modelName + "_bankAccountHeader"]?.size }}
                                                            onClick={() => {
                                                                props.selectText("bankAccountHeader");
                                                            }}>
                                                            <tr >
                                                                <th colSpan="5" className="per1 text-center" style={{ padding: "0px" }}>
                                                                    <ul
                                                                        className="list-unstyled"
                                                                        style={{
                                                                            height: "15px"
                                                                        }}
                                                                    >
                                                                        <li>تفاصيل الحساب البنكي</li>
                                                                        <li>Bank Account details</li>
                                                                    </ul>
                                                                </th>
                                                            </tr>
                                                            <tr >
                                                                <th className="per1 text-center" style={{ padding: "0px", width: "5%" }}>
                                                                    <ul
                                                                        className="list-unstyled"
                                                                        style={{
                                                                            height: "auto"
                                                                        }}
                                                                    >
                                                                        <li>اسم البنك</li>
                                                                        <li>Bank Name</li>
                                                                    </ul>
                                                                </th>
                                                                <th className="per1 text-center" style={{ padding: "0px", width: "5%" }}>
                                                                    <ul
                                                                        className="list-unstyled"
                                                                        style={{
                                                                            height: "auto"
                                                                        }}
                                                                    >
                                                                        <li>رقم العميل</li>
                                                                        <li>Customer No.</li>
                                                                    </ul>
                                                                </th>
                                                                <th className="per1 text-center" style={{ padding: "0px", maxWidth: "100px" }}>
                                                                    <ul
                                                                        className="list-unstyled"
                                                                        style={{
                                                                            height: "auto"
                                                                        }}
                                                                    >
                                                                        <li>رقم الحساب المصرفي الدولي</li>
                                                                        <li>IBAN</li>
                                                                    </ul>
                                                                </th>
                                                                <th className="per1 text-center" style={{ padding: "0px", width: "10%" }}>
                                                                    <ul
                                                                        className="list-unstyled"
                                                                        style={{
                                                                            height: "auto"
                                                                        }}
                                                                    >
                                                                        <li>إسم الحساب</li>
                                                                        <li>Account name</li>
                                                                    </ul>
                                                                </th>
                                                                <th className="per1 text-center" style={{ padding: "0px", width: "5%" }}>
                                                                    <ul
                                                                        className="list-unstyled"
                                                                        style={{
                                                                            height: "auto"
                                                                        }}
                                                                    >
                                                                        <li>رقم حساب</li>
                                                                        <li>Account No.</li>
                                                                    </ul>
                                                                </th>

                                                            </tr>
                                                        </thead>
                                                        <tbody style={{ fontSize: props.fontSizes[props.modelName + "_bankAccountBody"]?.size }}
                                                            onClick={() => {
                                                                props.selectText("bankAccountBody");
                                                            }} className="fw-bold clickable-text">
                                                            <tr>
                                                                <td style={{ width: "5%" }}>

                                                                    {props.model.store?.bank_account?.bank_name}
                                                                </td>
                                                                <td style={{ width: "5%" }}>

                                                                    {props.model.store?.bank_account?.customer_no}
                                                                </td>
                                                                <td style={{ maxWidth: "100px" }}>

                                                                    {props.model.store?.bank_account?.iban}
                                                                </td>
                                                                <td style={{ width: "10%" }}>

                                                                    {props.model.store?.bank_account?.account_name}
                                                                </td>
                                                                <td style={{ width: "5%" }}>

                                                                    {props.model.store?.bank_account?.account_no}
                                                                </td>
                                                            </tr>
                                                        </tbody>

                                                    </table>

                                                </td>
                                            </tr> : ""}
                                        </>}
                                    </tbody>}
                                </table>

                                <table className="table table-bordered fw-bold clickable-text" style={{ fontSize: props.fontSizes[props.modelName + "_signature"]?.size }} onClick={() => {
                                    props.selectText("signature");
                                }} >
                                    <thead>
                                        {props.modelName === "delivery_note" && <tr>
                                            <th colSpan="2" className="text-end" style={{ padding: "2px" }}>
                                                Remarks ملاحظات:
                                            </th>
                                            <th
                                                colSpan="7"
                                                style={{ padding: "2px" }}

                                            >
                                                {props.model.remarks ? props.model.remarks : ""}
                                            </th>


                                        </tr>}
                                        {props.model?.store?.show_received_by_footer_in_invoice && <tr>
                                            <th className="text-end" style={{ width: "20%", padding: "2px" }}>
                                                Delivered By سلمت بواسطة:
                                            </th>
                                            <th style={{ width: "30%", padding: "2px" }}> {props.model.delivered_by_user ? props.model.delivered_by_user.name : null}</th>
                                            <th className="text-end" style={{ width: "20%", padding: "2px" }}>
                                                Received By استلمت من قبل:
                                            </th>
                                            <th style={{ width: "30%" }}>

                                            </th>
                                        </tr>}
                                        {/*} <tr>
                                        <th className="text-end" style={{ padding: "2px" }}>
                                            Signature إمضاء:
                                        </th>
                                        <th style={{ width: "30%", height: "30px" }}>
                                            {props.model.delivered_by_signature ?
                                                <img alt="Signature" src={props.model.delivered_by_signature.signature + "?" + (Date.now())} key={props.model.delivered_by_signature.signature} style={{ width: 100, height: 80 }} ></img>
                                                : null}
                                        </th>
                                        <th className="text-end" style={{ padding: "2px" }} >
                                            Signature إمضاء:
                                        </th>
                                        <th></th>
                                    </tr>*/}
                                        {/*<tr>
                                        <th className="text-end" style={{ padding: "2px" }}>
                                            Date تاريخ:
                                        </th>
                                        <th style={{ padding: "2px" }} className="text-center">
                                            {props.model.signature_date_str ? props.model.signature_date_str : ""}  {props.model.signature_date_str ? getArabicDate(props.model.signature_date_str) : ""}
                                        </th>
                                        <th className="text-end" style={{ padding: "2px" }}>
                                            Date تاريخ:
                                        </th>
                                        <th></th>
                                    </tr>*/}
                                    </thead>
                                </table>
                            </div>
                        </div>
                    </div>
                    {
                        props.model.store?.show_address_in_invoice_footer && <div className="row fw-bold clickable-text" style={{ fontSize: props.fontSizes[props.modelName + "_footer"]?.size, height: "55px", }} onClick={() => {
                            props.selectText("footer");
                        }}>
                            <div className="col-md-2 text-start">
                                {/*props.model.QRImageData && <img src={props.model.QRImageData} style={{ width: "122px", height: "114px" }} alt="Invoice QR Code" />*/}
                            </div>
                            <div className="col-md-8 text-center">
                                <ul className="list-unstyled mb0 text-center">
                                    <li>
                                        <b
                                        > {props.model.store ? props.model.store.address_in_arabic : "<STORE_ADDRESS_ARABIC>"}
                                        </b>
                                    </li>
                                    <li>
                                        <strong
                                        >{props.model.store ? props.model.store.address : "<STORE_ADDRESS>"}
                                        </strong>
                                    </li>

                                    <li>
                                        هاتف:<b
                                        > {props.model.store ? props.model.store.phone_in_arabic : "<STORE_PHONE_ARABIC>"}
                                        </b>,
                                        Phone:<strong
                                        >{props.model.store ? props.model.store.phone : "<STORE_PHONE>"}
                                        </strong>
                                    </li>
                                    <li>
                                        <strong>الرمز البريدي:</strong>{props.model.store ? props.model.store.zipcode_in_arabic : "<STORE_ZIPCODE_ARABIC>"},
                                        <strong>Email:{props.model.store ? props.model.store.email : "<STORE_EMAIL>"} </strong>

                                    </li>
                                </ul>
                            </div>
                        </div>
                    }
                </div >
            ))}
        </span >
    </>);

});

export default PreviewContent;