import { React, forwardRef } from "react";
import NumberFormat from "react-number-format";
import { format } from "date-fns";
import n2words from 'n2words'
import { QRCodeCanvas } from "qrcode.react";
import { trimTo2Decimals } from "../utils/numberUtils";

const SalesReturnPreviewContent = forwardRef((props, ref) => {

    let persianDigits = "۰۱۲۳۴۵۶۷۸۹";
    let persianMap = persianDigits.split("");

    function convertToPersianNumber(input) {
        return input.replace(/\d/g, function (m) {
            return persianMap[parseInt(m)];
        });
    }

    function getArabicDate(engishDate) {
        let event = new Date(engishDate);
        let options = {
            /*weekday: 'long', */
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

    return (<>
        {props.model.pages && props.model.pages.map((page, pageIndex) => (
            <div
                className="container"
                id="printableArea"
                style={{
                    backgroundColor: "white",
                    border: "solid 2px",
                    borderColor: "silver",
                    borderRadius: "2mm",
                    padding: "20px",
                    marginTop: page.top + "px",
                    height: "110px",
                    width: "770px"
                }}

            >
                <div className="row" style={{ fontSize: "3.5mm" }}>
                    <div className="col">
                        <ul className="list-unstyled text-left">
                            <li><h4 style={{ fontSize: "3.5mm" }}>{props.model.store ? props.model.store.name : "<STORE_NAME>"}</h4></li>
                            <li>{props.model.store ? props.model.store.title : "<STORE_TITLE>"}</li>
                            {/*<!-- <li><hr /></li> --> */}
                            <li>C.R. / {props.model.store ? props.model.store.registration_number : "<STORE_CR_NO>"}</li>
                            <li>VAT / {props.model.store ? props.model.store.vat_no : "<STORE_VAT_NO>"}</li>
                        </ul>
                    </div>
                    <div className="col">
                        <div className="invoice-logo text-center">
                            {props.model.store && props.model.store.logo ? <img width="70" height="70" src={props.model.store.logo + "?" + (Date.now())} alt="Invoice logo" /> : null}
                        </div>
                    </div>
                    <div className="col">
                        <ul className="list-unstyled text-end">
                            <li>
                                <h4 style={{ fontSize: "3.5mm" }}>
                                    <strong>
                                        {props.model.store ? props.model.store.name_in_arabic : "<STORE_NAME_ARABIC>"}
                                    </strong>
                                </h4>
                            </li>
                            <li>
                                {props.model.store ? props.model.store.title_in_arabic : "<STORE_TITLE_ARABIC>"}
                            </li>
                            {/* <!-- <li><hr /></li> --> */}
                            <li>{props.model.store ? props.model.store.registration_number_in_arabic : "<STORE_CR_NO_ARABIC>"} / ‫ت‬.‫س‬</li>
                            <li>{props.model.store ? props.model.store.vat_no_in_arabic : "<STORE_VAT_NO_ARABIC>"} / ‫الضريبي‬ ‫الرقم‬</li>
                        </ul>
                    </div>
                </div>
                <div className="row">
                    <div className="col">
                        <u
                        ><h1 className="text-center" style={{ fontSize: "3mm" }}>

                                {props.model.store?.zatca?.phase === "1" ? "SALES RETURN TAX INVOICE | فاتورة ضريبة المبيعات المرتجعة" : ""}
                                {props.model.store?.zatca?.phase === "2" && props.model.zatca?.reporting_passed && props.model.zatca?.is_simplified ? "SIMPLIFIED CREDIT NOTE TAX INVOICE | مذكرة ائتمان مبسطة، فاتورة ضريبية" : ""}
                                {props.model.store?.zatca?.phase === "2" && !props.model.zatca?.is_simplified ? "STANDARD CREDIT NOTE TAX INVOICE | مذكرة ائتمان قياسية، فاتورة ضريبية" : ""}
                            </h1>
                        </u>
                    </div>
                </div>

                <div className="row table-active" style={{ fontSize: "3.5mm", border: "solid 0px" }}>
                    <div className="col-md-5" style={{ border: "solid 0px", width: "80%" }}>

                        <div class="container" style={{ border: "solid 0px", paddingLeft: "0px", fontSize: "2mm" }}>
                            <div class="row" style={{ border: "solid 0px" }}>
                                <div class="col-7 text-start fw-bold" style={{ border: "solid 0px" }} dir="ltr">Invoice Count Value | قيمة عدد الفاتورة (ICV):</div>
                                <div class="col-5" style={{ border: "solid 0px", marginLeft: "-80px" }} dir="ltr">
                                    {props.model.invoice_count_value ? props.model.invoice_count_value : ""}
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-7 text-start fw-bold" dir="ltr">UUID:</div>
                                <div class="col-6 " style={{ marginLeft: "-80px" }} dir="ltr">
                                    {props.model.uuid ? props.model.uuid : ""}
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-7 text-start fw-bold" dir="ltr">Invoice No. | رقم الفاتورة:</div>
                                <div class="col-6" style={{ marginLeft: "-80px" }} dir="ltr">
                                    {props.model.code ? props.model.code : ""}
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-7 text-start fw-bold" dir="ltr">Invoice Date | تاريخ الفاتورة:</div>
                                <div class="col-6 " style={{ marginLeft: "-80px" }} dir="ltr">
                                    <span dir="ltr"> {props.model.date ? format(
                                        new Date(props.model.date),
                                        "yyyy-MM-dd h:mma"
                                    ) : "<DATETIME>"}
                                    </span>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-7 text-start fw-bold" dir="ltr">Original Invoice No. | رقم الفاتورة الأصلية:</div>
                                <div class="col-6 " dir="ltr" style={{ marginLeft: "-80px" }}>
                                    {props.model.order_code ? props.model.order_code : ""}
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-7 text-start fw-bold" dir="ltr" >Original Invoice Date | تاريخ الفاتورة الأصلية:</div>
                                <div class="col-6 " dir="ltr" style={{ marginLeft: "-80px" }}>
                                    <span dir="ltr"> {props.model.order?.date ? format(
                                        new Date(props.model.order.date),
                                        "yyyy-MM-dd h:mma"
                                    ) : "<DATETIME>"}
                                    </span>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-7 text-start fw-bold" dir="ltr">Customer Name | اسم العميل:</div>
                                <div class="col-6 " dir="ltr" style={{ marginLeft: "-80px" }}>
                                    {props.model.customer ? props.model.customer.name : "N/A"}
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-7 text-start fw-bold" >Customer VAT | ضريبة القيمة المضافة للعملاء:</div>
                                <div class="col-6 " dir="ltr" style={{ marginLeft: "-80px" }}>
                                    <span dir="ltr">{props.model.customer?.vat_no ? "#" + props.model.customer.vat_no : "N/A"}</span>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-7 text-start fw-bold" dir="ltr" >Customer Address | عنوان العميل:</div>
                                <div class="col-6 " dir="ltr" style={{ marginLeft: "-80px" }}>

                                    <span dir="ltr">
                                        {!props.model.customer?.national_address?.building_no && !props.model.customer?.national_address?.unit_no && props.model.customer?.national_address?.street_name && props.model.customer?.national_address?.district_name && props.model.customer?.national_address?.city_name ? props.model.customer?.address : ""}
                                        {props.model.customer?.national_address?.unit_no ? `Unit #${props.model.customer.national_address.unit_no}, ` : ""}
                                        {props.model.customer?.national_address?.building_no ? `Building #${props.model.customer.national_address.building_no}` : ""}
                                        {props.model.customer?.national_address?.street_name ? `, ${props.model.customer.national_address.street_name}` : ""}
                                        {props.model.customer?.national_address?.district_name ? `, ${props.model.customer.national_address.district_name} dist.` : ""}
                                        {props.model.customer?.national_address?.city_name ? `, ${props.model.customer.national_address.city_name}` : ""}
                                        {props.model.customer?.national_address?.zipcode ? ` - ${props.model.customer.national_address.zipcode}` : ""}
                                    </span>
                                </div>
                            </div>
                        </div>
                        {/* 
                        <ul className="list-unstyled mb0 text-start">
                            <li><strong>Invoice Count Value | قيمة عدد الفاتورة (ICV): </strong>{props.model.invoice_count_value ? props.model.invoice_count_value : "<ICV_NUMBER>"}</li>
                            <li><strong>UUID: </strong>{props.model.uuid ? props.model.uuid : "<UUID_STRING>"}</li>
                            <li><strong>Invoice No. | رقم الفاتورة: </strong>{props.model.code ? props.model.code : "<ID_STRING>"}</li>
                            <li><strong>Invoice Date | تاريخ الفاتورة: </strong> <span dir="ltr"> {props.model.date ? format(
                                new Date(props.model.date),
                                "yyyy-MM-dd h:mma"
                            ) : "<DATETIME>"}
                            </span>
                            </li>
                            <li><strong>Original Invoice No. | رقم الفاتورة الأصلية: </strong>{props.model.order_code ? props.model.order_code : "<ID_STRING>"}</li>
                            <li><strong>Original Invoice Date | تاريخ الفاتورة الأصلية: </strong> <span dir="ltr"> {props.model.order?.date ? format(
                                new Date(props.model.order.date),
                                "yyyy-MM-dd h:mma"
                            ) : "<DATETIME>"}
                            </span>
                            </li>
                            <li>
                                <strong>Customer Name | اسم العميل: </strong> {props.model.customer ? props.model.customer.name : "N/A"}
                            </li>
                            <li><strong>Customer VAT  | ضريبة القيمة المضافة للعملاء: </strong> <span dir="ltr">{props.model.customer?.vat_no ? "#" + props.model.customer.vat_no : "N/A"}</span></li>
                            <li><strong>Customer Address  | عنوان العميل: </strong>
                                <span dir="ltr">
                                    {!props.model.customer?.national_address?.building_no && !props.model.customer?.national_address?.unit_no && props.model.customer?.national_address?.street_name && props.model.customer?.national_address?.district_name && props.model.customer?.national_address?.city_name ? props.model.customer?.address : ""}
                                    {props.model.customer?.national_address?.unit_no ? `Unit #${props.model.customer.national_address.unit_no}, ` : ""}
                                    {props.model.customer?.national_address?.building_no ? `Building #${props.model.customer.national_address.building_no}` : ""}
                                    {props.model.customer?.national_address?.street_name ? `, ${props.model.customer.national_address.street_name}` : ""}
                                    {props.model.customer?.national_address?.district_name ? `, ${props.model.customer.national_address.district_name} dist.` : ""}
                                    {props.model.customer?.national_address?.city_name ? `, ${props.model.customer.national_address.city_name}` : ""}
                                    {props.model.customer?.national_address?.zipcode ? ` - ${props.model.customer.national_address.zipcode}` : ""}
                                </span>
                            </li>
                        </ul>*/}
                    </div>
                    <div className="col-md-5" style={{ border: "solid 0px", width: "20%" }}>
                        {props.model.store?.zatca?.phase === "1" && props.model.QRImageData ? <img className="text-start" src={props.model.QRImageData} style={{ width: "108px", height: "108px" }} alt="Invoice QR Code" /> : ""}
                        {props.model.store?.zatca?.phase === "2" && props.model.zatca?.qr_code ? <QRCodeCanvas value={props.model.zatca?.qr_code} style={{ width: "108px", height: "108px" }} size={108} /> : ""}
                    </div>
                </div>
                <div className="row" style={{ fontSize: "3.5mm" }}>
                    <div className="col text-start">
                        {props.model.total_pages ? "Page " + (pageIndex + 1) + " of " + props.model.total_pages : ""}
                    </div>
                    <div className="col text-end">
                        {props.model.total_pages ? convertToPersianNumber(props.model.total_pages.toString()) + " الصفحة " + convertToPersianNumber((pageIndex + 1).toString()) + " من " : ""}
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
                                className="table table-bordered"
                                style={{ borderRadius: "6px" }}
                            >
                                <thead style={{ fontSize: "3mm" }}>
                                    <tr >
                                        <th className="per1 text-center" style={{ padding: "0px", width: "5%" }}>
                                            <ul
                                                className="list-unstyled"
                                                style={{
                                                    height: "15px"
                                                }}
                                            >
                                                <li>رقم سري</li>
                                                <li>SI No.</li>
                                            </ul>
                                        </th>
                                        <th className="per3 text-center" style={{ padding: "0px", width: "8%" }}>
                                            <ul
                                                className="list-unstyled"
                                                style={{
                                                    height: "15px"
                                                }}
                                            >
                                                <li>رقم القطعة</li>
                                                <li>Part No.</li>
                                            </ul>
                                        </th>
                                        <th className="per68 text-center" style={{ padding: "0px", width: "15%" }}>
                                            <ul
                                                className="list-unstyled"
                                                style={{
                                                    height: "15px"
                                                }}
                                            >
                                                <li>وصف</li>
                                                <li>Description</li>
                                            </ul>
                                        </th>
                                        <th className="per1 text-center" style={{ padding: "0px", width: "5%" }}>
                                            <ul
                                                className="list-unstyled"
                                                style={{
                                                    height: "15px"
                                                }}
                                            >
                                                <li>كمية</li>
                                                <li>Qty</li>
                                            </ul>
                                        </th>
                                        <th className="per10 text-center" style={{ padding: "0px", width: "5%" }}>
                                            <ul
                                                className="list-unstyled"
                                                style={{
                                                    height: "15px"
                                                }}
                                            >
                                                <li>سعر الوحدة</li>
                                                <li>Unit Price</li>
                                            </ul>
                                        </th>
                                        <th className="per1 text-center" style={{ padding: "0px", width: "5%" }}>
                                            <ul
                                                className="list-unstyled"
                                                style={{
                                                    height: "15px"
                                                }}
                                            >
                                                <li>تخفيض</li>
                                                <li>Discount</li>
                                            </ul>
                                        </th>
                                        <th className="per20 text-center" style={{ padding: "0px", width: "5%" }}>
                                            <ul
                                                className="list-unstyled"
                                                style={{
                                                    height: "15px"
                                                }}
                                            >
                                                <li>سعر</li>
                                                <li>Price</li>
                                            </ul>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody style={{ fontSize: "2.7mm" }} >
                                    {page.products && page.products.map((product, index) => (
                                        <tr key={product.item_code} className="text-center"  >
                                            <td style={{ padding: "1px", height: "16px" }}>{product.part_number ? index + 1 + (pageIndex * props.model.pageSize) : ""}</td>
                                            <td style={{ padding: "1px" }} >{product.part_number ? product.part_number : ""}</td>
                                            <td style={{ padding: "1px" }}>
                                                {product.name}{product.name_in_arabic ? "/" + product.name_in_arabic : ""}
                                            </td>
                                            <td style={{ padding: "1px" }}>{product.quantity ? product.quantity : ""}  {product.unit ? product.unit : ""}</td>
                                            <td className="text-end" style={{ padding: "1px" }} >
                                                {product.unit_price ? <NumberFormat
                                                    value={trimTo2Decimals(product.unit_price)}
                                                    displayType={"text"}
                                                    thousandSeparator={true}
                                                    suffix={""}
                                                    renderText={(value, props) => value}
                                                /> : ""}
                                            </td>
                                            <td style={{ padding: "1px" }} className="text-end">{product.unit_discount_percent ? "(" + trimTo2Decimals(product.unit_discount_percent) + "%)" : ""}{product.unit_discount ? " " + trimTo2Decimals(product.unit_discount * product.quantity) : ""} </td>
                                            <td style={{ padding: "1px" }} className="text-end">
                                                <NumberFormat
                                                    value={trimTo2Decimals((product.unit_price - product.unit_discount) * product.quantity)}
                                                    displayType={"text"}
                                                    thousandSeparator={true}
                                                    suffix={""}
                                                    renderText={(value, props) => value}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>

                                <tfoot style={{ fontSize: "3mm", }}>
                                    <tr >
                                        <th colSpan="5" className="text-end" style={{ padding: "2px", }} ></th>

                                        <th className="text-end" style={{ padding: "2px" }}>
                                            Total المجموع:
                                        </th>
                                        <th className="text-end" colSpan="2" style={{ padding: "2px", }} >
                                            <NumberFormat
                                                value={trimTo2Decimals(props.model.total)}
                                                displayType={"text"}
                                                thousandSeparator={true}
                                                suffix={""}
                                                renderText={(value, props) => value}
                                            />
                                        </th>
                                    </tr>
                                    <tr>
                                        <th className="text-end" colSpan="6" style={{ padding: "2px" }}>

                                            Shipping / Handling Fees   رسوم الشحن / المناولة:
                                        </th>
                                        <th className="text-end" colSpan="2" style={{ padding: "2px" }}>
                                            <NumberFormat
                                                value={trimTo2Decimals(props.model.shipping_handling_fees)}
                                                displayType={"text"}
                                                thousandSeparator={true}
                                                suffix={""}
                                                renderText={(value, props) => value}
                                            />
                                        </th>
                                    </tr>
                                    <tr>
                                        <th className="text-end" colSpan="6" style={{ padding: "2px" }}>
                                            Discount تخفيض:
                                        </th>
                                        <th className="text-end" colSpan="2" style={{ padding: "2px" }}>
                                            <NumberFormat
                                                value={trimTo2Decimals(props.model.discount)}
                                                displayType={"text"}
                                                thousandSeparator={true}
                                                suffix={""}
                                                renderText={(value, props) => value}
                                            />
                                        </th>
                                    </tr>
                                    <tr>
                                        <th className="text-end" colSpan="5" style={{ padding: "2px" }}>
                                            VAT ضريبة:
                                        </th>
                                        <th className="text-end" colSpan="1" style={{ padding: "2px" }} >{trimTo2Decimals(props.model.vat_percent)}%</th>
                                        <th className="text-end" colSpan="2" style={{ padding: "2px" }}>
                                            <NumberFormat
                                                value={trimTo2Decimals(props.model.vat_price)}
                                                displayType={"text"}
                                                thousandSeparator={true}
                                                suffix={""}
                                                renderText={(value, props) => value}
                                            />
                                        </th>
                                    </tr>

                                    <tr>
                                        <th colSpan="6" className="text-end" style={{ padding: "2px" }}>
                                            Net Total الإجمالي الصافي:
                                        </th>
                                        <th className="text-end" colSpan="2" style={{ padding: "2px" }}>
                                            <NumberFormat
                                                value={trimTo2Decimals(props.model.net_total)}
                                                displayType={"text"}
                                                thousandSeparator={true}
                                                suffix={""}
                                                renderText={(value, props) => value}
                                            />
                                        </th>
                                    </tr>
                                    <tr>
                                        <th colSpan="2" className="text-end" style={{ padding: "2px" }}>
                                            In Words بكلمات:
                                        </th>
                                        <th
                                            colSpan="5"
                                            style={{ padding: "2px" }}

                                        >
                                            <ul
                                                className="list-unstyled"
                                                style={{ marginBottom: "0px" }}
                                            >
                                                <li>{n2words(props.model.net_total, { lang: 'ar' }) + " ريال سعودي  "}</li>
                                                <li>{n2words(props.model.net_total, { lang: 'en' }) + " saudi riyals"}</li>
                                            </ul>
                                        </th>
                                    </tr>
                                </tfoot>
                            </table>

                            <table className="table table-bordered" style={{ fontSize: "3mm" }}>
                                <thead>
                                    <tr>
                                        <th className="text-end" style={{ width: "20%", padding: "2px" }}>
                                            Delivered By سلمت بواسطة:
                                        </th>
                                        <th style={{ width: "30%", padding: "2px" }}> {props.model.delivered_by_user ? props.model.delivered_by_user.name : null}</th>
                                        <th className="text-end" style={{ width: "20%", padding: "2px" }}>
                                            Received By استلمت من قبل:
                                        </th>
                                        <th style={{ width: "30%" }}>

                                        </th>
                                    </tr>
                                    <tr>
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
                                    </tr>
                                    <tr>
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
                                    </tr>
                                </thead>
                            </table>
                        </div>
                    </div>
                </div>
                <div className="row" style={{ fontSize: "3mm", height: "55px", }}>
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
            </div>
        ))}
    </>);

});

export default SalesReturnPreviewContent;