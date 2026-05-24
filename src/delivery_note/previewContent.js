import { React, forwardRef } from "react";
import { format } from "date-fns";


const DeliveryNotePreviewContent = forwardRef((props, ref) => {

    let persianDigits = "۰۱۲۳٤۵٦۷۸۹";
    let persianMap = persianDigits.split("");


    function convertToPersianNumber(input) {
        if (!input) {
            return "";
        }
        return input.replace(/\d/g, function (m) {
            return persianMap[parseInt(m)];
        });
    }

    function getArabicDate(engishDate) {
        let event = new Date(engishDate);
        let options = {
            /*weekday: 'long', */
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: "numeric",
            minute: "numeric",
            second: "numeric",
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
                    padding: "30px"

                }}

            >
                <div className="row" style={{ fontSize: "3mm" }}>
                    <div className="col">
                        <ul className="list-unstyled text-left">
                            <li><h4 style={{ fontSize: "4mm" }}>{props.model.store ? props.model.store.name : "<STORE_NAME>"}</h4></li>
                            <li>{props.model.store ? props.model.store.title : "<STORE_TITLE>"}</li>
                            {/*<!-- <li><hr /></li> --> */}
                            <li>C.R. / {props.model.store ? props.model.store.registration_number : "<STORE_CR_NO>"}</li>
                            <li>VAT / {props.model.store ? props.model.store.vat_no : "<STORE_VAT_NO>"}</li>
                        </ul>
                    </div>
                    <div className="col">
                        <div className="invoice-logo text-center">
                            {props.model.store && props.model.store.logo ? <img width="100" height="100" src={props.model.store.logo + "?" + (Date.now())} alt="Invoice logo" /> : null}
                        </div>
                    </div>
                    <div className="col">
                        <ul className="list-unstyled text-end">
                            <li>
                                <h4 style={{ fontSize: "4mm" }}>
                                    <strong>
                                        {props.model.store ? props.model.store.name_in_arabic : "<STORE_NAME_ARABIC>"}
                                    </strong>
                                </h4>
                            </li>
                            <li>
                                {props.model.store ? props.model.store.title_in_arabic : "<STORE_TITLE_ARABIC>"}
                            </li>
                            {/* <!-- <li><hr /></li> --> */}
                            <li>{props.model.store ? "رقم التسجيل: " + props.model.store.registration_number_in_arabic : "<STORE_CR_NO_ARABIC>"}</li>
                            <li>{props.model.store ? "ظريبه الشراء: " + props.model.store.vat_no_in_arabic : "<STORE_VAT_NO_ARABIC>"}</li>
                        </ul>
                    </div>
                </div>
                <div className="row">
                    <div className="col">
                        <u
                        >
                            {/*
                        <h1 className="text-center" style={{ fontSize: "4mm" }}>
                            DELIVERYNOTE / اقتباس
                        </h1>
                        */}
                            <h1 className="text-center" style={{ fontSize: "4mm" }}>
                                DELIVERY NOTE / مذكرة تسليم
                            </h1>

                        </u>
                    </div>
                </div>
                <div className="row table-active" style={{ fontSize: "3mm" }}>
                    <div className="col">
                        <ul className="list-unstyled mb0 text-start">
                            {/*
                        <li><strong>DeliveryNote: </strong>#{props.model.code ? props.model.code : "<ID_NUMBER>"}</li>
                        <li><strong>DeliveryNote Date: </strong>{props.model.created_at ? format(
                            new Date(props.model.created_at),
                            "MMM dd yyyy h:mma"
                        ) : "<DATE_TIME>"}</li>
                         */}
                            <li><strong>Delivery Note: </strong>#{props.model.code ? props.model.code : "<ID_NUMBER>"}</li>
                            <li><strong>Delivert Note Date: </strong>{props.model.date ? format(
                                new Date(props.model.date),
                                "MMM dd yyyy h:mma"
                            ) : "<DATE_TIME>"}</li>
                            <li>

                                <strong>Customer: </strong>{props.model.customer ? props.model.customer.name : "<CUSTOMER_NAME>"}
                            </li>
                            <li><strong>VAT Number: </strong>{props.model.customer ? props.model.customer.vat_no : "<CUSTOMER_VAT_NO>"}
                            </li>
                        </ul>
                    </div>
                    <div className="col" dir="ltr">
                        <ul className="list-unstyled mb0 text-end" dir="ltr">
                            <li dir="ltr">{props.model.code ? convertToPersianNumber(props.model.code) + "#" : "<ID_NUMBER_ARABIC>"}<strong> :رقم مذكرة التسليم </strong></li>
                            <li dir="ltr">{props.model.date ? getArabicDate(props.model.date) : "<DATE_ARABIC>"} <strong dir="ltr"> :تاريخ مذكرة التسليم</strong></li>
                            <li dir="ltr">
                                {props.model.customer ? props.model.customer.name_in_arabic : "<CUSTOMER_NAME_ARABIC>"}<strong>:عميل</strong>
                            </li>
                            <li dir="ltr">{props.model.customer ? props.model.customer.vat_no_in_arabic : "<CUSTOMER_VAT_NO_ARABIC>"} <strong>:ظريبه الشراء</strong> </li>
                        </ul>
                    </div>
                </div>
                <div className="row" style={{ fontSize: "3mm" }}>
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
                                className="table table-bordered no-bold"
                                style={{ fontSize: "3mm", borderRadius: "6px" }}
                            >
                                <thead>
                                    <tr>
                                        <th className="per1 text-center" style={{ padding: "0px" }}>
                                            <ul
                                                className="list-unstyled"
                                                style={{
                                                    fontSize: "3mm", height: "35px", marginBottom: "0px"
                                                }}
                                            >
                                                <li>رقم سري</li>
                                                <li>SI No.</li>
                                            </ul>
                                        </th>
                                        <th className="per3 text-center" style={{ padding: "0px" }}>
                                            <ul
                                                className="list-unstyled"
                                                style={{
                                                    fonSize: "3mm", height: "35px", marginBottom: "0px"
                                                }}
                                            >
                                                <li>رمز الصنف</li>
                                                <li>Part No.</li>
                                            </ul>
                                        </th>
                                        <th className="per68 text-center" style={{ padding: "0px" }}>
                                            <ul
                                                className="list-unstyled"
                                                style={{
                                                    fontSize: "3mm", height: "35px", marginBottom: "0px"
                                                }}
                                            >
                                                <li>وصف</li>
                                                <li>Description</li>
                                            </ul>
                                        </th>
                                        <th className="per1 text-center" style={{ padding: "0px" }}>
                                            <ul
                                                className="list-unstyled"
                                                style={{ fontSize: "3mm", height: "35px", marginBottom: "0px" }}
                                            >
                                                <li>كمية</li>
                                                <li>Qty</li>
                                            </ul>
                                        </th>
                                        {props.model.net_total > 0 && <th className="per1 text-center" style={{ padding: "0px" }}>
                                            <ul className="list-unstyled" style={{ fontSize: "3mm", height: "35px", marginBottom: "0px" }}>
                                                <li>سعر الوحدة</li>
                                                <li>Unit Price</li>
                                            </ul>
                                        </th>}
                                        {props.model.net_total > 0 && props.model.total_with_vat > 0 && <th className="per1 text-center" style={{ padding: "0px" }}>
                                            <ul className="list-unstyled" style={{ fontSize: "3mm", height: "35px", marginBottom: "0px" }}>
                                                <li>سعر الوحدة (مع ض.ق.م)</li>
                                                <li>Unit Price(with VAT)</li>
                                            </ul>
                                        </th>}
                                        {props.model.net_total > 0 && <th className="per1 text-center" style={{ padding: "0px" }}>
                                            <ul className="list-unstyled" style={{ fontSize: "3mm", height: "35px", marginBottom: "0px" }}>
                                                <li>خصم</li>
                                                <li>Discount</li>
                                            </ul>
                                        </th>}
                                        {props.model.net_total > 0 && props.model.total_with_vat > 0 && <th className="per1 text-center" style={{ padding: "0px" }}>
                                            <ul className="list-unstyled" style={{ fontSize: "3mm", height: "35px", marginBottom: "0px" }}>
                                                <li>خصم (مع ض.ق.م)</li>
                                                <li>Disc.(with VAT)</li>
                                            </ul>
                                        </th>}
                                        {props.model.net_total > 0 && <th className="per1 text-center" style={{ padding: "0px" }}>
                                            <ul className="list-unstyled" style={{ fontSize: "3mm", height: "35px", marginBottom: "0px" }}>
                                                <li>المجموع</li>
                                                <li>Price</li>
                                            </ul>
                                        </th>}
                                        {props.model.net_total > 0 && props.model.total_with_vat > 0 && <th className="per1 text-center" style={{ padding: "0px" }}>
                                            <ul className="list-unstyled" style={{ fontSize: "3mm", height: "35px", marginBottom: "0px" }}>
                                                <li>المجموع (مع ض.ق.م)</li>
                                                <li>Price(with VAT)</li>
                                            </ul>
                                        </th>}
                                    </tr>
                                </thead>
                                <tbody>

                                    {page.products && page.products.map((product, index) => (
                                        <tr key={index} className="text-center" style={{ height: "20px" }}  >
                                            <td>{index + 1 + (pageIndex * props.model.pageSize)}</td>
                                            <td>{product.prefix_part_number ? product.prefix_part_number + " - " : ""}{product.part_number ? product.part_number : ""}</td>
                                            <td>
                                                {product.name}{product.name_in_arabic ? "/" + product.name_in_arabic : ""}

                                            </td>
                                            <td>{product.quantity}  {product.unit ? product.unit : ""} </td>
                                            {props.model.net_total > 0 && <td>{product.unit_price ? product.unit_price.toFixed(2) : "0.00"}</td>}
                                            {props.model.net_total > 0 && props.model.total_with_vat > 0 && <td>{product.unit_price_with_vat ? product.unit_price_with_vat.toFixed(2) : "0.00"}</td>}
                                            {props.model.net_total > 0 && <td>{product.unit_discount ? product.unit_discount.toFixed(2) : "0.00"}</td>}
                                            {props.model.net_total > 0 && props.model.total_with_vat > 0 && <td>{product.unit_discount_with_vat ? product.unit_discount_with_vat.toFixed(2) : "0.00"}</td>}
                                            {props.model.net_total > 0 && <td>{product.unit_price ? ((product.unit_price - (product.unit_discount || 0)) * product.quantity).toFixed(2) : "0.00"}</td>}
                                            {props.model.net_total > 0 && props.model.total_with_vat > 0 && <td>{product.unit_price_with_vat ? (((product.unit_price_with_vat || 0) - (product.unit_discount_with_vat || 0)) * product.quantity).toFixed(2) : "0.00"}</td>}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {props.model.net_total > 0 && pageIndex === (props.model.pages.length - 1) && (
                                <table className="table table-bordered no-bold" style={{ fontSize: "3mm" }}>
                                    <tbody>
                                        <tr>
                                            <td style={{ width: "75%" }}></td>
                                            <th className="text-end" style={{ width: "12.5%" }}>Total(without VAT) / المجموع الفرعي</th>
                                            <td className="text-end" style={{ width: "12.5%" }}>{props.model.total ? props.model.total.toFixed(2) : "0.00"}</td>
                                        </tr>
                                        {props.model.total_with_vat > 0 && <tr>
                                            <td style={{ width: "75%" }}></td>
                                            <th className="text-end" style={{ width: "12.5%" }}>Total(with VAT) / المجموع مع ض.ق.م</th>
                                            <td className="text-end" style={{ width: "12.5%" }}>{props.model.total_with_vat.toFixed(2)}</td>
                                        </tr>}
                                        {props.model.shipping_handling_fees > 0 && <tr>
                                            <td style={{ width: "75%" }}></td>
                                            <th className="text-end" style={{ width: "12.5%" }}>Shipping / شحن</th>
                                            <td className="text-end" style={{ width: "12.5%" }}>{props.model.shipping_handling_fees.toFixed(2)}</td>
                                        </tr>}
                                        {props.model.discount > 0 && <tr>
                                            <td style={{ width: "75%" }}></td>
                                            <th className="text-end" style={{ width: "12.5%" }}>Discount(without VAT){props.model.discount_percent > 0 ? ` (${props.model.discount_percent}%)` : ""} / خصم</th>
                                            <td className="text-end" style={{ width: "12.5%" }}>{props.model.discount.toFixed(2)}</td>
                                        </tr>}
                                        {props.model.discount_with_vat > 0 && <tr>
                                            <td style={{ width: "75%" }}></td>
                                            <th className="text-end" style={{ width: "12.5%" }}>Discount(with VAT){props.model.discount_percent_with_vat > 0 ? ` (${props.model.discount_percent_with_vat}%)` : ""} / خصم مع ض.ق.م</th>
                                            <td className="text-end" style={{ width: "12.5%" }}>{props.model.discount_with_vat.toFixed(2)}</td>
                                        </tr>}
                                        <tr>
                                            <td style={{ width: "75%" }}></td>
                                            <th className="text-end" style={{ width: "12.5%" }}>VAT {props.model.vat_percent ? "(" + props.model.vat_percent + "%)" : ""} / ضريبة القيمة المضافة</th>
                                            <td className="text-end" style={{ width: "12.5%" }}>{props.model.vat_price ? props.model.vat_price.toFixed(2) : "0.00"}</td>
                                        </tr>
                                        {props.model.rounding_amount !== 0 && props.model.rounding_amount !== undefined && <tr>
                                            <td style={{ width: "75%" }}></td>
                                            <th className="text-end" style={{ width: "12.5%" }}>Rounding / تقريب</th>
                                            <td className="text-end" style={{ width: "12.5%" }}>{props.model.rounding_amount ? props.model.rounding_amount.toFixed(2) : "0.00"}</td>
                                        </tr>}
                                        <tr>
                                            <td style={{ width: "75%" }}></td>
                                            <th className="text-end" style={{ width: "12.5%" }}><strong>Net Total(with VAT) / الإجمالي</strong></th>
                                            <td className="text-end" style={{ width: "12.5%" }}><strong>{props.model.net_total.toFixed(2)}</strong></td>
                                        </tr>
                                    </tbody>
                                </table>
                            )}

                            <table className="table table-bordered no-bold" style={{ fontSize: "3mm" }}>
                                <thead>
                                    <tr>
                                        <th className="text-end" style={{ width: "13%", padding: "0px" }}>
                                            <ul
                                                className="list-unstyled"
                                                style={{ fontSize: "3mm", marginBottom: "0px" }}
                                            >
                                                <li>سلمت بواسطة:</li>
                                                <li>Delivered By:</li>
                                            </ul>
                                        </th>
                                        <th style={{ width: "37%" }}> {props.model.delivered_by_user ? props.model.delivered_by_user.name : null}</th>
                                        <th className="text-end" style={{ width: "13%", padding: "0px" }}>
                                            <ul
                                                className="list-unstyled"
                                                style={{ fontSize: "3mm", marginBottom: "0px" }}
                                            >
                                                <li>استلمت من قبل:</li>
                                                <li>Received By:</li>
                                            </ul>
                                        </th>
                                        <th style={{ width: "37%" }}>

                                        </th>
                                    </tr>
                                    <tr>
                                        <th className="text-end" style={{ padding: "0px" }}>
                                            <ul className="list-unstyled" style={{ fontSize: "3mm" }}>
                                                <li>إمضاء:</li>
                                                <li>Signature:</li>
                                            </ul>
                                        </th>
                                        <th style={{ width: "37%", height: "80px" }}>
                                            {props.model.delivered_by_signature ?
                                                <img alt="Signature" src={props.model.delivered_by_signature.signature + "?" + (Date.now())} key={props.model.delivered_by_signature.signature} style={{ width: 100, height: 80 }} ></img>
                                                : null}
                                        </th>
                                        <th className="text-end" style={{ padding: "0px" }}>
                                            <ul className="list-unstyled" style={{ fontSize: "3mm" }}>
                                                <li>إمضاء:</li>
                                                <li>Signature:</li>
                                            </ul>
                                        </th>
                                        <th></th>
                                    </tr>
                                    <tr>
                                        <th className="text-end" style={{ padding: "0px" }}>
                                            <ul
                                                className="list-unstyled"
                                                style={{
                                                    fontSize: "3mm", marginBottom: "0px"
                                                }}
                                            >
                                                <li>تاريخ:</li>
                                                <li>Date:</li>
                                            </ul>
                                        </th>
                                        <th>
                                            <ul
                                                className="list-unstyled"
                                                style={{
                                                    fontSize: "3mm", height: "35px", marginBottom: "0px"
                                                }}
                                            >
                                                <li>{props.model.signature_date_str ? getArabicDate(props.model.signature_date_str) : ""}</li>
                                                <li> {props.model.signature_date_str ? props.model.signature_date_str : ""}</li>
                                            </ul>
                                        </th>
                                        <th className="text-end" style={{ padding: "0px" }}>
                                            <ul
                                                className="list-unstyled"
                                                style={{
                                                    fontSize: "3mm", marginBottom: "0px"
                                                }}
                                            >
                                                <li>تاريخ:</li>
                                                <li>Date:</li>
                                            </ul>
                                        </th>
                                        <th></th>
                                    </tr>
                                </thead>
                            </table>
                        </div>
                    </div>
                </div>
                <div className="row" style={{ fontSize: "3mm" }}>

                    <div className="col-md-12 text-center">
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

export default DeliveryNotePreviewContent;