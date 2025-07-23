import { React, forwardRef } from "react";
import NumberFormat from "react-number-format";
import { format } from "date-fns";
import n2words from 'n2words'
import { QRCodeCanvas } from "qrcode.react";
import { trimTo2Decimals } from "../utils/numberUtils";
import "./print2.css";

const OrderPrintContent2 = forwardRef((props, ref) => {
    //Non-A4
    let border = "0";
    return (<>
        <span ref={ref}>
            {props.model.pages && props.model.pages.map((page, pageIndex) => (
                <div
                    key={pageIndex}
                    className="container"
                    id="printableArea"
                    style={{
                        backgroundColor: "white",
                        border: "solid 0px",
                        borderColor: "silver",
                        borderRadius: "3mm",
                        padding: "10px",
                        /* minHeight: "700px",*/

                        height: "1058px"
                    }}

                >
                    <h2 className="print-value" style={{ textAlign: "center", minWidth: "350px", fontSize: "4mm", position: "absolute", left: "300px", top: (179 + page.top) + "px", border: "solid " + border + "px", textDecoration: "underline", }}>
                        {/*"TAX INVOICE / فاتورة ضريبية"*/}
                        {props.model.invoiceTitle}
                    </h2>

                    <h4 className="print-value" style={{ fontSize: "3mm", position: "absolute", left: "395px", top: (208 + page.top) + "px", border: "solid " + border + "px", }}>
                        {props.model.code ? props.model.code : ""}
                    </h4>

                    <h4 className="print-value text-center" style={{ fontSize: "3.5mm", maxWidth: "450px", minWidth: "450px", position: "absolute", left: "350px", top: (234 + page.top) + "px", border: "solid " + border + "px", }}>
                        {props.model.customer && props.model.customer.name ? props.model.customer.name : "N/A"}
                    </h4>


                    <h4 className="print-value" style={{ fontSize: "3.5mm", position: "absolute", left: "600px", top: (198 + page.top) + "px", border: "solid " + border + "px", }}>
                        {props.model.date ? format(
                            new Date(props.model.date),
                            "yyyy-MM-dd"
                        ) : ""}
                        &nbsp;&nbsp;&nbsp;&nbsp;
                        {props.model.date ? format(
                            new Date(props.model.date),
                            "h:mma"
                        ) : ""}
                    </h4>

                    {/*
                    <h4 style={{ fontSize: "3mm", position: "absolute", left: "100px", top: (28 + page.top) + "px", border: "solid " + border + "px", }}>
                        {props.model.customer && props.model.customer.name_in_arabic ? props.model.customer.name_in_arabic : "N/A"}
                    </h4>

                    <h4 style={{ fontSize: "3mm", position: "absolute", left: "100px", top: (46 + page.top) + "px", border: "solid " + border + "px", }}>
                        {props.model.customer && props.model.customer.vat_no ? props.model.customer.vat_no : "N/A"}
                    </h4>
                    <h4 style={{ fontSize: "3mm", position: "absolute", left: "105px", top: (60 + page.top) + "px", border: "solid " + border + "px", }}>
                        {props.model.customer && props.model.customer.vat_no_in_arabic ? props.model.customer.vat_no_in_arabic : "N/A"}
                    </h4>


                    <h4 style={{ fontSize: "3mm", position: "absolute", right: "69px", top: (63 + page.top) + "px", border: "solid " + border + "px", }}>
                        {props.model.total_pages ? "Page " + (pageIndex + 1) + " of " + props.model.total_pages : ""}
                    </h4>*/}

                    <table className="print-value" style={{ fontSize: "3mm", position: "absolute", left: "90px", top: (340 + page.top) + "px", border: "solid 0px", }}>
                        <tbody>
                            {page.products && page.products.map((product, index) => (
                                <tr key={product.item_code} style={{ paddingTop: "1px", height: "6px", borderBottom: "solid 1px" }}>
                                    <td className="text-center " style={{ border: "solid 0px", width: "35px", }}>
                                        <h4 className="print-value" style={{ fontSize: "3mm", maxWidth: "35px" }}>
                                            {index + 1 + (pageIndex * props.model.pageSize)}
                                        </h4>
                                    </td>
                                    <td className="text-left" style={{ border: "solid 0px", width: "120px", height: "auto", }} >
                                        {props.model?.store?.settings?.one_line_product_name_in_print_invoice && <div
                                            style={{ //one_line_product_name_in_invoice
                                                display: 'inline-block',
                                                maxWidth: `120px`,
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                verticalAlign: 'bottom'
                                            }}
                                        >
                                            <h4 className="print-value-new" style={{ fontSize: "3mm", maxWidth: "120px", height: "auto", }}>
                                                {product.prefix_part_number ? product.prefix_part_number + " - " : ""}{product.part_number ? product.part_number : ""}
                                            </h4>
                                        </div>}
                                        {!props.model?.store?.settings?.one_line_product_name_in_print_invoice && <div>
                                            <h4 className="print-value-new" style={{ fontSize: "3mm", maxWidth: "120px", height: "auto", }}>
                                                {product.prefix_part_number ? product.prefix_part_number + " - " : ""}{product.part_number ? product.part_number : ""}
                                            </h4>
                                        </div>}
                                    </td>
                                    <td className="text-left" style={{ border: "solid 0px", width: "350px", paddingLeft: "10px" }} >
                                        {props.model?.store?.settings?.one_line_product_name_in_print_invoice && <div
                                            style={{ //one_line_product_name_in_invoice
                                                display: 'inline-block',
                                                maxWidth: `350px`,
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                verticalAlign: 'bottom'
                                            }}
                                        >
                                            {product.name && product.name_in_arabic ? <h4 className="print-value-new" style={{ fontSize: "3mm", position: "relative", top: "-11px" }}>
                                                {product.name + " | "}
                                                <span dir="rtl">{product.name_in_arabic}</span>
                                            </h4> : ""}
                                            {product.name && !product.name_in_arabic ? <h4 className="print-value-new" style={{ fontSize: "3mm", position: "relative", top: "2px", border: "solid 0px" }}>
                                                {product.name}
                                            </h4> : ""}
                                            {/*product.name_in_arabic ? <h4 className="print-value" dir="rtl" style={{ fontSize: "3mm", position: "relative", top: "-2px" }}>
                                                {product.name_in_arabic}
                                            </h4> : ""*/}
                                        </div>}
                                        {!props.model?.store?.settings?.one_line_product_name_in_print_invoice && <div>
                                            {product.name && product.name_in_arabic ? <h4 className="print-value-new" style={{ fontSize: "3mm", position: "relative", top: "-11px" }}>
                                                {product.name + " | "}
                                                <span dir="rtl">{product.name_in_arabic}</span>
                                            </h4> : ""}
                                            {product.name && !product.name_in_arabic ? <h4 className="print-value-new" style={{ fontSize: "3mm", position: "relative", top: "2px", border: "solid 0px" }}>
                                                {product.name}
                                            </h4> : ""}
                                            {/*product.name_in_arabic ? <h4 className="print-value" dir="rtl" style={{ fontSize: "3mm", position: "relative", top: "-2px" }}>
                                                {product.name_in_arabic}
                                            </h4> : ""*/}
                                        </div>}
                                    </td>
                                    <td className="text-center" style={{ border: "solid 0px", width: "65px", }}>
                                        <h4 className="print-value" style={{ fontSize: "3mm", maxWidth: "65px" }}>
                                            {product.quantity}  {product.unit ? product.unit : ""}
                                        </h4>
                                    </td>
                                    <td className="text-end" style={{ border: "solid 0px", width: "75px", paddingRight: "5px" }}>

                                        <h4 className="print-value" style={{ fontSize: "3mm", maxWidth: "75px" }}>

                                            <NumberFormat
                                                value={trimTo2Decimals(product.unit_price)}
                                                displayType={"text"}
                                                thousandSeparator={true}
                                                suffix={""}
                                                renderText={(value, props) => value}
                                            />

                                            {product.unit_discount ? " [" + trimTo2Decimals(product.unit_discount * product.quantity) + " off]" : ""}
                                        </h4>

                                    </td>
                                    <td className="text-end" style={{ border: "solid 0px", width: "92px", paddingRight: "5px" }} >
                                        <h4 className="print-value" style={{ fontSize: "3mm", maxWidth: "92px" }}>
                                            <NumberFormat
                                                value={trimTo2Decimals((product.unit_price - product.unit_discount) * product.quantity)}
                                                displayType={"text"}
                                                thousandSeparator={true}
                                                suffix={""}
                                                renderText={(value, props) => value}
                                            />
                                        </h4>
                                    </td>
                                </tr>

                            ))}
                        </tbody>
                    </table>

                    {page.lastPage ? <table className="print-value" style={{ minWidth: "150px", fontSize: "3mm", position: "absolute", left: "678px", top: (745 + page.top) + "px", border: "solid 0px", }}>
                        <tbody>
                            <tr className="text-end" style={{ verticalAlign: "center", border: "solid 0px", }}>
                                <td style={{ width: "99px", paddingRight: "5px", paddingTop: "10px" }}>
                                    <h4 className="print-value" style={{ fontSize: "3mm", height: "9px", }}>
                                        <NumberFormat
                                            displayType={"text"}
                                            value={trimTo2Decimals(props.model.total)}
                                            thousandSeparator={true}
                                            suffix={""}
                                            renderText={(value, props) => value}
                                        />

                                    </h4>
                                </td>
                            </tr>

                            <tr className="text-end" style={{ verticalAlign: "center", border: "solid 0px", }}>
                                <td style={{ paddingRight: "5px", paddingTop: "13px" }}>
                                    <h4 className="print-value" style={{ fontSize: "3mm", height: "9px", }}>
                                        <NumberFormat
                                            value={trimTo2Decimals(props.model.discount)}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={""}
                                            renderText={(value, props) => value}
                                        />
                                    </h4>
                                </td>
                            </tr>

                            <tr className="text-end" style={{ verticalAlign: "center", border: "solid 0px", }}>
                                <td style={{ paddingRight: "5px", paddingTop: "13px" }}>
                                    <h4 className="print-value" style={{ fontSize: "3mm", height: "9px", }}>
                                        <NumberFormat
                                            value={trimTo2Decimals(props.model.vat_price)}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={""}
                                            renderText={(value, props) => value}
                                        />
                                    </h4>
                                </td>
                            </tr>

                            <tr className="text-end" style={{ verticalAlign: "center", border: "solid 0px", }}>
                                <td style={{ paddingRight: "5px", paddingTop: "13px" }}>
                                    <h4 className="print-value" style={{ fontSize: "3.2mm", height: "9px", }}>
                                        <NumberFormat
                                            value={trimTo2Decimals(props.model.net_total)}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={""}
                                            renderText={(value, props) => value}
                                        />
                                    </h4>
                                </td>
                            </tr>
                        </tbody>
                    </table> : ""}

                    <span dir="ltr" className="print-value" style={{ fontSize: "2.8mm", position: "absolute", left: "95px", top: (775 + page.top) + "px" }} >
                        <h4>Cust. Address:</h4>
                    </span>

                    <span dir="ltr" className="print-value" style={{ fontSize: "2.8mm", position: "absolute", left: "95px", maxWidth: "550px", top: (795 + page.top) + "px" }} >
                        {props.model.customer?.national_address?.building_no ? `${props.model.customer.national_address.building_no}` : ""}
                        {props.model.customer?.national_address?.street_name ? ` ${props.model.customer.national_address.street_name}` : ""}
                        {props.model.customer?.national_address?.district_name ? ` - ${props.model.customer.national_address.district_name}` : ""}
                        {props.model.customer?.national_address?.unit_no ? `, Unit #${props.model.customer.national_address.unit_no}` : ""}
                        {props.model.customer?.national_address?.city_name ? `, ${props.model.customer.national_address.city_name}` : ""}
                        {props.model.customer?.national_address?.zipcode ? ` - ${props.model.customer.national_address.zipcode}` : ""}
                        {props.model.customer?.national_address?.additional_no ? ` - ${props.model.customer.national_address.additional_no}` : ""}
                    </span>


                    {/*
                    {page.lastPage && props.model.shipping_handling_fees && props.model.shipping_handling_fees > 0 ? <h4 style={{ fontSize: "3mm", position: "absolute", left: "480px", top: (513 + page.top) + "px" }}>
                        {"Shipping / Handling Fees: "}
                    </h4> : ""}

                    {page.lastPage && props.model.shipping_handling_fees ? <h4 style={{ fontSize: "3mm", position: "absolute", left: "686px", top: (513 + page.top) + "px" }}>
                        {trimTo2Decimals(props.model.shipping_handling_fees)}
                    </h4> : ""}*/}


                    {page.lastPage && props.model?.modelName !== "delivery_note" ? <h4 className="print-value" style={{ fontSize: "3.5mm", position: "absolute", left: "100px", top: (845 + page.top) + "px" }}>
                        {n2words(props.model.net_total, { lang: 'en' }) + " saudi riyals"}
                    </h4> : ""}

                    {page.lastPage && props.model?.modelName !== "delivery_note" ? <h4 className="print-value" dir="rtl" style={{ fontSize: "3.5mm", position: "absolute", right: "545px", top: (855 + page.top) + "px" }}>
                        {n2words(props.model.net_total, { lang: 'ar' }) + " ريال سعودي  "}
                    </h4> : ""}


                    {/*<h4 style={{ fontSize: "3mm", position: "absolute", left: "205px", top: (664 + page.top) + "px" }}>
                        {props.model.delivered_by_user ? props.model.delivered_by_user.name : ""}
                    </h4>*/}

                    {page.lastPage && props.model?.modelName !== "quotation" && props.model?.modelName !== "quotation_sales_return" && props.model?.modelName !== "delivery_note" ? <div className="print-value" style={{ position: "absolute", left: "95px", top: (640 + page.top) + "px" }} >
                        {/*!props.model.zatca?.qr_code && props.model.QRImageData ? <img className="text-start" src={props.model.QRImageData} style={{ width: "102px", height: "94px" }} alt="Invoice QR Code" /> : ""*/}
                        {/*props.model.zatca?.qr_code ? <QRCodeCanvas value={props.model.zatca?.qr_code} style={{ width: "102px", height: "94px" }} size={100} / > : ""*/}
                        {props.model.store?.zatca?.phase === "1" && props.model.QRImageData ? <img src={props.model.QRImageData} style={{ width: "100px", height: "100px", border: "solid 0px" }} alt="Invoice QR Code" /> : ""}
                        {props.model.store?.zatca?.phase === "2" && props.model.zatca?.qr_code && props.model.zatca?.reporting_passed ? <QRCodeCanvas value={props.model.zatca?.qr_code} style={{ width: "100px", height: "100px" }} size={100} /> : ""}
                        {props.model.store?.zatca?.phase === "2" && !props.model.zatca?.qr_code ? <img src={props.model.QRImageData} style={{ width: "100px", height: "100px", border: "solid 0px" }} alt="Invoice QR Code" /> : ""}

                    </div> : ""}

                    <h4 className="print-value" style={{ fontSize: "2.8mm", position: "absolute", left: "162px", top: (760 + page.top) + "px", border: "solid " + border + "px", }}>
                        {props.model.remarks ? props.model.remarks : "N/A"}
                    </h4>


                    <h4 className="print-value" style={{ fontSize: "4.7mm", position: "absolute", left: "200px", top: (813 + page.top) + "px", border: "solid " + border + "px", }}>
                        {props.model.customer && props.model.customer.vat_no ? props.model.customer.vat_no : "N/A"}
                    </h4>
                </div>

            ))}
        </span>
    </>);

});

export default OrderPrintContent2;