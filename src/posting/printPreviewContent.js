import { React, forwardRef } from "react";
import NumberFormat from "react-number-format";
import { format } from "date-fns";
import n2words from 'n2words'

const BalanceSheetPrintPreviewContent = forwardRef((props, ref) => {

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




    function getArabicDateTime(engishDate) {
        let event = new Date(engishDate);
        let options = {
            /*weekday: 'long', */
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: "numeric",
            minute: "numeric",
            second: "numeric",
            //  timeZoneName: "short",
        };
        return event.toLocaleDateString('ar-EG', options)
    }

    function getArabicDate(engishDate) {
        let event = new Date(engishDate);
        let options = {
            /*weekday: 'long', */
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            //  timeZoneName: "short",
        };
        return event.toLocaleDateString('ar-EG', options)
    }

    function toTitleCaseFromUnderscore(str) {
        let newStr = str
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
        if (newStr === "Customer Deposit") {
            return "Customer Payable"
        } else if (newStr === "Customer Withdrawal") {
            return "Customer Receivable"
        }

        return newStr;
    }


    let detailsLabelsColumnWidthPercent = "32%";
    let detailsValuesColumnWidthPercent = "68%";
    let detailsBorderThickness = "0.5px solid black";
    let detailsBorderColor = "black";//#dee2e6
    let tableBorderThickness = "0.5px solid black";

    let accountNameMaxWidth = "80px";



    return (<>
        {props.model.pages && props.model.pages.map((page, pageIndex) => (
            <div
                className="container"
                id="printableArea"
                style={{
                    fontFamily: props.fontSizes[props.modelName + "_font"],
                    backgroundColor: "white",
                    border: "solid 0px",
                    borderColor: "silver",
                    borderRadius: "2mm",
                    paddingLeft: "0px",
                    paddingRight: "0px",
                    paddingTop: "10px",
                    paddingBottom: "4px",
                    marginTop: "0px",
                    height: "1118px",
                    width: `${props.whatsAppShare ? "750px" : "750px"}`
                }}

            >
                {props.fontSizes[props.modelName + "_storeHeader"]?.visible || props.whatsAppShare ? < div className="row">
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
                </div> : ""}

                <div className="row" style={{ marginTop: props.fontSizes[props.modelName + "_storeHeader"]?.visible || props.whatsAppShare ? "0px" : props.fontSizes[props.modelName + "_marginTop"]?.size }}>
                    <div className="col">
                        <u><h1 className="text-center clickable-text fw-bold" onClick={() => {
                            props.selectText("invoiceTitle");
                        }} style={{ fontSize: props.fontSizes[props.modelName + "_invoiceTitle"]?.size }} >
                            BALANCE SHEET / ورقة التوازن
                        </h1>
                        </u>
                    </div>
                </div>

                {pageIndex === 0 && <div className="row col-md-14" style={{ border: "solid 0px", borderColor: detailsBorderColor, fontSize: props.fontSizes[props.modelName + "_invoiceDetails"]?.size, padding: "10px" }} onClick={() => {
                    props.selectText("invoiceDetails");
                }}>
                    <div className="col-md-12" style={{ border: detailsBorderThickness, borderColor: detailsBorderColor, marginLeft: "0px", width: "100%" }}>

                        <div className="row" dir="ltr" style={{ borderBottom: detailsBorderThickness }} >
                            <div className="col-md-4 print-label" dir="ltr" style={{ borderRight: detailsBorderThickness, borderColor: detailsBorderColor, width: detailsLabelsColumnWidthPercent, padding: "3px" }} ><b>Account Name | إسم الحساب:</b></div>
                            <div className="col-md-8 print-value" dir="ltr" style={{ borderColor: detailsBorderColor, width: detailsValuesColumnWidthPercent, padding: "3px" }} >{props.model.name ? props.model.name : ""}</div>
                        </div>
                        <div className="row" dir="ltr" style={{ borderBottom: detailsBorderThickness }} >
                            <div className="col-md-4 print-label" dir="ltr" style={{ borderRight: detailsBorderThickness, borderColor: detailsBorderColor, width: detailsLabelsColumnWidthPercent, padding: "3px" }} ><b>Account Number | رقم الحساب:</b></div>
                            <div className="col-md-8 print-value" dir="ltr" style={{ borderColor: detailsBorderColor, width: detailsValuesColumnWidthPercent, padding: "3px" }} >
                                {props.model.number ? props.model.number : ""}
                            </div>
                        </div>

                        <div className="row" dir="ltr" style={{ borderBottom: detailsBorderThickness }} >
                            <div className="col-md-4 print-label" dir="ltr" style={{ borderRight: detailsBorderThickness, borderColor: detailsBorderColor, width: detailsLabelsColumnWidthPercent, padding: "3px" }} >Date: | تاريخ:</div>
                            <div className="col-md-8 print-value" dir="ltr" style={{ borderColor: detailsBorderColor, width: detailsValuesColumnWidthPercent, padding: "3px" }} >
                                {props.model.dateValue ? format(new Date(props.model.dateValue), "MMM dd yyyy") : ""}
                                {props.model.fromDateValue && props.model.toDateValue && <>
                                    {format(new Date(props.model.fromDateValue), "MMM dd yyyy") + " - " + format(new Date(props.model.toDateValue), "MMM dd yyyy")}
                                    {" | " + getArabicDate(props.model.fromDateValue) + " - " + getArabicDate(props.model.toDateValue)}
                                </>}
                                {props.model.fromDateValue && !props.model.toDateValue && <>
                                    {format(new Date(props.model.fromDateValue), "MMM dd yyyy") + " to present | لتقديم"}
                                </>}
                                {!props.model.fromDateValue && props.model.toDateValue && <>
                                    {"upto | تصل " + format(new Date(props.model.toDateValue), "MMM dd yyyy")}
                                </>}
                            </div>
                        </div>
                        {props.model.reference_model === "customer" ? <>
                            <div className="row" dir="ltr" style={{ borderBottom: detailsBorderThickness }} >
                                <div className="col-md-4 print-label" dir="ltr" style={{ borderRight: detailsBorderThickness, borderColor: detailsBorderColor, width: detailsLabelsColumnWidthPercent, padding: "3px" }} ><b>Customer Name | اسم العميل:</b></div>
                                <div className="col-md-8 print-value" dir="ltr" style={{ borderColor: detailsBorderColor, width: detailsValuesColumnWidthPercent, padding: "3px" }} >
                                    {props.model.customer ? props.model.customer.name : ""}
                                    {!props.model.customer && props.model.customerName ? props.model.customerName : ""}
                                    {!props.model.customerName && !props.model.customer ? "N/A" : ""}
                                    {props.model.customer?.name_in_arabic ? " | " + props.model.customer.name_in_arabic : ""}
                                </div>
                            </div>

                            <div className="row" dir="ltr" style={{ borderBottom: detailsBorderThickness }} >
                                <div className="col-md-4 print-label" dir="ltr" style={{ borderRight: detailsBorderThickness, borderColor: detailsBorderColor, width: detailsLabelsColumnWidthPercent, padding: "3px" }} ><b>Customer ID | معرف العميل:</b></div>
                                <div className="col-md-8 print-value" dir="ltr" style={{ borderColor: detailsBorderColor, width: detailsValuesColumnWidthPercent, padding: "3px" }} >
                                    {props.model.customer?.code ? props.model.customer.code : "N/A"}

                                </div>
                            </div>

                            <div className="row" dir="ltr" style={{ borderBottom: detailsBorderThickness }} >
                                <div className="col-md-4 print-label" dir="ltr" style={{ borderRight: detailsBorderThickness, borderColor: detailsBorderColor, width: detailsLabelsColumnWidthPercent, padding: "3px" }} ><b>Customer VAT  | ضريبة القيمة المضافة للعملاء:</b></div>
                                <div className="col-md-8 print-value" dir="ltr" style={{ borderColor: detailsBorderColor, width: detailsValuesColumnWidthPercent, padding: "3px" }} >
                                    {props.model.customer?.vat_no ? props.model.customer.vat_no : ""}
                                    {!props.model.customer && props.model.vat_no ? props.model.vat_no : ""}
                                    {!props.model.customer && !props.model.vat_no ? "N/A" : ""}
                                    {props.model.customer?.vat_no_in_arabic ? " | " + props.model.customer.vat_no_in_arabic : ""}
                                    {!props.model.customer && props.model.vat_no ? " | " + convertToArabicNumber(props.model.vat_no) : ""}
                                </div>
                            </div>

                            <div className="row" dir="ltr" style={{ borderBottom: detailsBorderThickness }} >
                                <div className="col-md-4 print-label" dir="ltr" style={{ borderRight: detailsBorderThickness, borderColor: detailsBorderColor, width: detailsLabelsColumnWidthPercent, padding: "3px" }} ><b>Customer C.R | رقم تسجيل شركة العميل:</b></div>
                                <div className="col-md-8 print-value" dir="ltr" style={{ borderColor: detailsBorderColor, width: detailsValuesColumnWidthPercent, padding: "3px" }} >
                                    {props.model.customer?.registration_number ? props.model.customer.registration_number + " | " + convertToArabicNumber(props.model.customer.registration_number) : "N/A"}
                                </div>
                            </div>

                            <div className="row" dir="ltr" style={{}} >
                                <div className="col-md-4 print-label" dir="ltr" style={{ borderRight: detailsBorderThickness, borderColor: detailsBorderColor, width: detailsLabelsColumnWidthPercent, padding: "3px" }} ><b>Customer Address | عنوان العميل:</b></div>
                                <div className="col-md-8 print-value" dir="ltr" style={{ borderColor: detailsBorderColor, width: detailsValuesColumnWidthPercent, padding: "3px" }} >
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
                        {props.model.reference_model === "vendor" ? <>
                            <div className="row" dir="ltr" style={{ borderBottom: detailsBorderThickness }} >
                                <div className="col-md-4 print-label" dir="ltr" style={{ borderRight: detailsBorderThickness, width: detailsLabelsColumnWidthPercent, padding: "3px" }} ><b>Vendor Name | اسم العميل:</b></div>
                                <div className="col-md-8 print-value" dir="ltr" style={{ width: detailsValuesColumnWidthPercent, padding: "3px" }} >
                                    {props.model.vendor ? props.model.vendor.name : ""}
                                    {!props.model.vendor && props.model.vendorName ? props.model.vendorName : ""}
                                    {!props.model.vendorName && !props.model.vendor ? "N/A" : ""}
                                </div>
                            </div>

                            <div className="row" dir="ltr" style={{ borderBottom: detailsBorderThickness }} >
                                <div className="col-md-4 print-label" dir="ltr" style={{ borderRight: detailsBorderThickness, width: detailsLabelsColumnWidthPercent, padding: "3px" }} ><b>Vendor ID | معرف البائع:</b></div>
                                <div className="col-md-8 print-value" dir="ltr" style={{ width: detailsValuesColumnWidthPercent, padding: "3px" }} >
                                    {props.model.vendor?.code ? props.model.vendor.code : "N/A"}

                                </div>
                            </div>

                            <div className="row" dir="ltr" style={{ borderBottom: detailsBorderThickness }} >
                                <div className="col-md-4 print-label" dir="ltr" style={{ borderRight: detailsBorderThickness, width: detailsLabelsColumnWidthPercent, padding: "3px" }} ><b>Vendor VAT | ضريبة القيمة المضافة للعملاء:</b></div>
                                <div className="col-md-8 print-value" dir="ltr" style={{ width: detailsValuesColumnWidthPercent, padding: "3px" }} >
                                    {props.model.vendor?.vat_no ? props.model.vendor.vat_no : ""}
                                    {!props.model.vendor && props.model.vat_no ? props.model.vat_no : ""}
                                    {!props.model.vendor && !props.model.vat_no ? "N/A" : ""}
                                </div>
                            </div>

                            <div className="row" dir="ltr" style={{ borderBottom: detailsBorderThickness }} >
                                <div className="col-md-4 print-label" dir="ltr" style={{ borderRight: detailsBorderThickness, width: detailsLabelsColumnWidthPercent, padding: "3px" }} ><b>Vendor C.R | رقم تسجيل الشركة الموردة:</b></div>
                                <div className="col-md-8 print-value" dir="ltr" style={{ width: detailsValuesColumnWidthPercent, padding: "3px" }} >
                                    {props.model.vendor?.registration_number ? props.model.vendor.registration_number : "N/A"}
                                </div>
                            </div>

                            <div className="row" dir="ltr" style={{}} >
                                <div className="col-md-4 print-label" dir="ltr" style={{ borderRight: detailsBorderThickness, width: detailsLabelsColumnWidthPercent, padding: "3px" }} ><b>Vendor Address | عنوان العميل:</b> </div>
                                <div className="col-md-8 print-value    " dir="ltr" style={{ width: detailsValuesColumnWidthPercent, padding: "3px" }} >
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
                </div>}

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
                            className=""
                            style={{
                                overflow: "hidden", outline: "none"
                            }}
                            tabIndex="0"
                        >

                            <table
                                className="table-responsive"
                                style={{ border: tableBorderThickness, width: "100%" }}
                            >
                                <tbody style={{ fontSize: props.fontSizes[props.modelName + "_tableBody"]?.size }} className="clickable-text print-value" onClick={() => {
                                    props.selectText("tableBody");
                                }} >
                                    <tr style={{ borderBottom: tableBorderThickness, fontSize: props.fontSizes[props.modelName + "_tableHead"]?.size, height: "auto" }} onClick={(e) => {
                                        e.stopPropagation();
                                        props.selectText("tableHead");
                                    }}>
                                        <th className="per6 text-center" style={{ padding: "0px", width: "4%", borderRight: tableBorderThickness, borderBottom: tableBorderThickness }}>
                                            <b>
                                                <ul
                                                    className="list-unstyled"
                                                    style={{
                                                        height: "auto",
                                                        marginBottom: "2px"
                                                    }}
                                                >
                                                    <li>رقم</li>
                                                    <li>Sn.</li>
                                                </ul>
                                            </b>
                                        </th>
                                        <th className="per1 text-center" style={{ padding: "0px", width: "14%", borderRight: tableBorderThickness, borderBottom: tableBorderThickness }}>
                                            <ul
                                                className="list-unstyled"
                                                style={{
                                                    height: "auto"
                                                }}
                                            >
                                                <li>تاريخ</li>
                                                <li>Date</li>
                                            </ul>
                                        </th>
                                        <th className="per3 text-center" colSpan={2} style={{ padding: "0px", width: "29%", borderRight: tableBorderThickness, borderBottom: tableBorderThickness }}>
                                            <ul
                                                className="list-unstyled"
                                                style={{
                                                    height: "auto",
                                                    minWidth: "130px"
                                                }}
                                            >
                                                <li>دَين</li>
                                                <li>Debit</li>
                                            </ul>
                                        </th>
                                        <th className="per68 text-center" colSpan={2} style={{ padding: "0px", width: "29%", borderRight: tableBorderThickness, borderBottom: tableBorderThickness }}>
                                            <ul
                                                className="list-unstyled"
                                                style={{
                                                    height: "auto",
                                                    minWidth: "130px"
                                                }}
                                            >
                                                <li>ائتمان</li>
                                                <li>Credit</li>
                                            </ul>
                                        </th>
                                        <th className="per1 text-center" style={{ padding: "0px", width: "9%", borderRight: tableBorderThickness, borderBottom: tableBorderThickness }}>
                                            <ul
                                                className="list-unstyled"
                                                style={{
                                                    height: "auto"
                                                }}
                                            >
                                                <li>كمية</li>
                                                <li>Type</li>
                                            </ul>
                                        </th>
                                        <th className="per10 text-center" style={{ padding: "0px", width: "15%", borderBottom: tableBorderThickness }}>
                                            <ul
                                                className="list-unstyled"
                                                style={{
                                                    height: "auto"
                                                }}
                                            >
                                                <li>بطاقة تعريف</li>
                                                <li>ID</li>
                                            </ul>
                                        </th>
                                    </tr>

                                    {pageIndex === 0 && props.model && (props.model.debitBalanceBoughtDown > 0 || props.model.creditBalanceBoughtDown > 0) ?
                                        <tr style={{ borderBottom: tableBorderThickness }} className="text-center"  >
                                            <td style={{ borderRight: tableBorderThickness, padding: "3px" }}>

                                            </td>
                                            <td style={{ borderRight: tableBorderThickness, padding: "3px" }}></td>
                                            <td colSpan={2} style={{ width: "auto", padding: "3px", whiteSpace: "nowrap", textAlign: "right", color: "red", borderRight: tableBorderThickness }}><b>
                                                {props.model.debitBalanceBoughtDown > 0 ? "To balance b/d " : ""}
                                                <NumberFormat
                                                    value={props.model.debitBalanceBoughtDown > 0 ? props.model.debitBalanceBoughtDown?.toFixed(2) : ""}
                                                    displayType={"text"}
                                                    thousandSeparator={true}
                                                    suffix={""}
                                                    renderText={(value, props) => value}
                                                />

                                            </b></td>
                                            <td colSpan={2} style={{ width: "auto", padding: "3px", whiteSpace: "nowrap", textAlign: "right", color: "red", borderRight: tableBorderThickness }}><b>
                                                {props.model.creditBalanceBoughtDown > 0 ? "By balance b/d " : ""}
                                                <NumberFormat
                                                    value={props.model.creditBalanceBoughtDown > 0 ? props.model.creditBalanceBoughtDown?.toFixed(2) : ""}
                                                    displayType={"text"}
                                                    thousandSeparator={true}
                                                    suffix={""}
                                                    renderText={(value, props) => value}
                                                />

                                            </b></td>
                                            <td style={{ borderRight: tableBorderThickness, padding: "3px" }}></td>
                                            <td></td>
                                        </tr> : ""}

                                    {page.posts && page.posts.filter(post => post.date).map((post, index) => (
                                        <tr style={{ borderBottom: tableBorderThickness, }} key={index}   >
                                            <td style={{ width: "auto", padding: "3px", whiteSpace: "nowrap", borderRight: tableBorderThickness, }} >{post.no}</td>
                                            <td style={{ width: "auto", padding: "3px", whiteSpace: "nowrap", borderRight: tableBorderThickness, }} >{post.date ? format(new Date(post.date), "MMM dd yyyy h:mma") : ""}</td>
                                            <td className="text-start break-text" style={{ width: "auto", padding: "3px", whiteSpace: "nowrap", alignContent: "start", borderRightWidth: "0px" }}>
                                                {/*post.debit_account*/}
                                                {post.debit_account_name && <span>
                                                    <span style={{
                                                        display: 'inline-block',
                                                        maxWidth: accountNameMaxWidth,
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        verticalAlign: 'bottom'
                                                    }}>{post.debit_account_name}</span> A/c {post.debit_account_number} Dr.
                                                </span>}
                                            </td>
                                            <td className="text-end" style={{ width: "auto", padding: "3px", whiteSpace: "nowrap", border: "solid 0px", borderRight: tableBorderThickness }}>

                                                <NumberFormat
                                                    value={parseFloat(post.debit_amount)?.toFixed(2)}
                                                    displayType={"text"}
                                                    thousandSeparator={true}
                                                    suffix={""}
                                                    renderText={(value, props) => value}
                                                />
                                            </td>
                                            <td style={{ width: "auto", padding: "3px", alignContent: "start", whiteSpace: "nowrap", borderRightWidth: "0px" }} className="break-text">
                                                {/*post.credit_account*/}

                                                {post.credit_account_name && <span>
                                                    By <span style={{
                                                        display: 'inline-block',
                                                        maxWidth: accountNameMaxWidth,
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        verticalAlign: 'bottom'
                                                    }}>{post.credit_account_name}</span> A/c {post.credit_account_number} Cr.
                                                </span>}
                                            </td>
                                            <td className="text-end" style={{ width: "auto", padding: "3px", whiteSpace: "nowrap", border: "solid 0px", borderRight: tableBorderThickness }}>
                                                <NumberFormat
                                                    value={parseFloat(post.credit_amount)?.toFixed(2)}
                                                    displayType={"text"}
                                                    thousandSeparator={true}
                                                    suffix={""}
                                                    renderText={(value, props) => value}
                                                />
                                            </td>
                                            <td style={{ width: "auto", whiteSpace: "nowrap", padding: "3px", borderRight: tableBorderThickness }}>{toTitleCaseFromUnderscore(post.reference_model)}</td>
                                            <td style={{ padding: "3px", }} className="break-text">{post.reference_code}</td>
                                        </tr>
                                    ))}
                                    {props.model.pages.length === (pageIndex + 1) && props.model ? <tr style={{ borderBottom: tableBorderThickness }}>
                                        <td className="text-end" colSpan={2} style={{ borderRight: tableBorderThickness, padding: "3px" }}>
                                            <b>Amount</b>
                                        </td>
                                        <td colSpan={2} style={{ textAlign: "right", padding: "3px", borderRight: tableBorderThickness }}><b>
                                            <NumberFormat
                                                value={props.model.debitTotal?.toFixed(2)}
                                                displayType={"text"}
                                                thousandSeparator={true}
                                                suffix={""}
                                                renderText={(value, props) => value}
                                            />

                                        </b></td>
                                        <td colSpan={2} style={{ textAlign: "right", padding: "3px", borderRight: tableBorderThickness }}><b>
                                            <NumberFormat
                                                value={props.model.creditTotal?.toFixed(2)}
                                                displayType={"text"}
                                                thousandSeparator={true}
                                                suffix={""}
                                                renderText={(value, props) => value}
                                            />


                                        </b></td>
                                        <td colSpan={2}></td>

                                    </tr> : ""}


                                    {props.model.pages.length === (pageIndex + 1) && props.model ?
                                        <tr style={{ borderBottom: tableBorderThickness }}>
                                            <th className="text-end" colSpan={2} style={{ borderRight: tableBorderThickness, padding: "3px" }}>
                                                <b>Due Amount</b>
                                            </th>
                                            <th colSpan={2} style={{ textAlign: "right", padding: "3px", color: "red", borderRight: tableBorderThickness }}><b>

                                                {props.model.debitBalance > 0 ? "To balance c/d " : ""}
                                                <NumberFormat
                                                    value={props.model.debitBalance > 0 ? props.model.debitBalance?.toFixed(2) : ""}
                                                    displayType={"text"}
                                                    thousandSeparator={true}
                                                    suffix={""}
                                                    renderText={(value, props) => value}
                                                />

                                            </b></th>
                                            <th colSpan={2} style={{ textAlign: "right", padding: "3px", color: "red", borderRight: tableBorderThickness }}><b>
                                                {props.model.creditBalance > 0 ? "By balance c/d " : ""}
                                                <NumberFormat
                                                    value={props.model.creditBalance > 0 ? props.model.creditBalance?.toFixed(2) : ""}
                                                    displayType={"text"}
                                                    thousandSeparator={true}
                                                    suffix={""}
                                                    renderText={(value, props) => value}
                                                />
                                            </b></th>
                                            <th colSpan={2}></th>
                                        </tr> : ""}

                                    {props.model.pages.length === (pageIndex + 1) && props.model ? <tr style={{ borderBottom: tableBorderThickness }}>
                                        <td className="text-end" colSpan={2} style={{ borderRight: tableBorderThickness, padding: "3px" }}>
                                            <b>Total Amount</b>
                                        </td>
                                        <td colSpan={2} style={{ textAlign: "right", padding: "3px", borderRight: tableBorderThickness }}><b>
                                            <NumberFormat
                                                value={props.model.creditTotal > props.model.debitTotal ? props.model.creditTotal?.toFixed(2) : props.model.debitTotal?.toFixed(2)}
                                                displayType={"text"}
                                                thousandSeparator={true}
                                                suffix={""}
                                                renderText={(value, props) => value}
                                            />

                                        </b></td>
                                        <td colSpan={2} style={{ textAlign: "right", padding: "3px", borderRight: tableBorderThickness }}><b>
                                            <NumberFormat
                                                value={props.model.creditTotal > props.model.debitTotal ? props.model.creditTotal?.toFixed(2) : props.model.debitTotal?.toFixed(2)}
                                                displayType={"text"}
                                                thousandSeparator={true}
                                                suffix={""}
                                                renderText={(value, props) => value}
                                            />


                                        </b></td>
                                        <td colSpan={2}></td>

                                    </tr> : ""}



                                    {props.model.pages.length === (pageIndex + 1) ? <tr style={{ borderBottom: tableBorderThickness }}>
                                        <th colSpan="2" className="text-end" style={{ padding: "2px", borderRight: tableBorderThickness }}>
                                            Balance In Words التوازن في الكلمات:
                                        </th>
                                        <th
                                            colSpan="6"
                                            style={{ padding: "2px" }}

                                        >
                                            <ul
                                                className="list-unstyled"
                                                style={{ marginBottom: "0px" }}
                                            >
                                                <li>{n2words(props.model.balance, { lang: 'ar' }) + " ريال سعودي  "}</li>
                                                <li>{n2words(props.model.balance, { lang: 'en' }) + " saudi riyals"}</li>
                                            </ul>
                                        </th>
                                    </tr> : ""}
                                </tbody>
                            </table>
                            {props.model.pages.length === (pageIndex + 1) ? <table className="table-responsive"
                                style={{ border: tableBorderThickness, width: "100%" }}
                            >
                                <tbody style={{ fontSize: props.fontSizes[props.modelName + "_tableFooter"]?.size }} onClick={() => {
                                    props.selectText("tableFooter");
                                }} className="clickable-text">
                                    {/*<tr>
                                        <th className="text-end" style={{ width: "20%", padding: "2px" }}>
                                            Account Manager إدارة حساب المستخدم:
                                        </th>
                                        <th style={{ width: "30%", padding: "2px" }}> {props.userName ? props.userName : ""}</th>
                            </tr> */}
                                    <tr style={{ borderBottom: tableBorderThickness }}>
                                        <th className="text-end" style={{ padding: "2px", borderRight: tableBorderThickness }}>
                                            Signature إمضاء:
                                        </th>
                                        <th style={{ width: "30%", height: "60px" }}>
                                            {/*props.model.delivered_by_signature ?
                                                <img alt="Signature" src={ props.model.delivered_by_signature.signature + "?" + (Date.now())} key={props.model.delivered_by_signature.signature} style={{ width: 100, height: 80 }} ></img>
                    : null*/}
                                        </th>
                                        {/*
                                        <th className="text-end" style={{ padding: "2px" }} >
                                            Signature إمضاء:
                                        </th>
                                        <th></th>
                */}
                                    </tr>
                                    <tr style={{ borderBottom: tableBorderThickness }}>
                                        <th className="text-end" style={{ padding: "2px", borderRight: tableBorderThickness }}>
                                            Date تاريخ:
                                        </th>
                                        <th style={{ padding: "2px" }} className="text-center">
                                            {format(new Date(), "MMM dd yyyy h:mma")}  {" / " + getArabicDateTime(new Date())}
                                        </th>
                                        {/*
                                        <th className="text-end" style={{ padding: "2px" }}>
                                            Date تاريخ:
                                        </th>
                                        <th></th>
            */}
                                    </tr>
                                </tbody>
                            </table> : ""}
                        </div>
                    </div>
                </div >
                {
                    props.model.pages.length === (pageIndex + 1) && props.model.store?.show_address_in_invoice_footer ? <div className="row clickable-text" style={{ fontSize: props.fontSizes[props.modelName + "_footer"]?.size, height: "55px", }} onClick={() => {
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
                    </div> : ""
                }
            </div >
        ))}
    </>);

});

export default BalanceSheetPrintPreviewContent;