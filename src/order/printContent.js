import { React, forwardRef, useState } from "react";
import NumberFormat from "react-number-format";
import { format } from "date-fns";
import n2words from 'n2words'

const OrderPrintContent = forwardRef((props, ref) => {

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
            month: 'long',
            day: 'numeric',
            hour: "numeric",
            minute: "numeric",
            second: "numeric",
            //  timeZoneName: "short",
        };
        return event.toLocaleDateString('ar-EG', options)
    }


    let [border, setBorder] = useState("0");
    return (<>

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
                    padding: "10px"
                }}


            >
                <h4 style={{ fontSize: "3mm", position: "absolute", left: "100px", top: (14 + page.top) + "px", border: "solid " + border + "px", }}>
                    {props.model.customer && props.model.customer.name ? props.model.customer.name : "N/A"}
                </h4>
                <h4 style={{ fontSize: "3mm", position: "absolute", left: "100px", top: (28 + page.top) + "px", border: "solid " + border + "px", }}>
                    {props.model.customer && props.model.customer.name_in_arabic ? props.model.customer.name_in_arabic : "N/A"}
                </h4>

                <h4 style={{ fontSize: "3mm", position: "absolute", left: "100px", top: (46 + page.top) + "px", border: "solid " + border + "px", }}>
                    {props.model.customer && props.model.customer.vat_no ? props.model.customer.vat_no : "N/A"}
                </h4>
                <h4 style={{ fontSize: "3mm", position: "absolute", left: "105px", top: (60 + page.top) + "px", border: "solid " + border + "px", }}>
                    {props.model.customer && props.model.customer.vat_no_in_arabic ? props.model.customer.vat_no_in_arabic : "N/A"}
                </h4>


                <h4 style={{ fontSize: "3mm", position: "absolute", left: "570px", top: (14 + page.top) + "px", border: "solid " + border + "px", }}>
                    {props.model.created_at ? format(
                        new Date(props.model.created_at),
                        "MMM dd yyyy h:mma"
                    ) : ""}
                </h4>
                <h4 style={{ fontSize: "3mm", position: "absolute", left: "570px", top: (35 + page.top) + "px", border: "solid " + border + "px", }}>
                    {props.model.code ? props.model.code : ""}
                </h4>

                <h4 style={{ fontSize: "3mm", position: "absolute", right: "65px", top: (63 + page.top) + "px", border: "solid " + border + "px", }}>
                    {props.model.total_pages ? "Page " + (pageIndex + 1) + " of " + props.model.total_pages : ""}
                </h4>

                <table style={{ fontSize: "3mm", position: "absolute", left: "18px", top: (119 + page.top) + "px", border: "solid 0px", }}>
                    <tbody>
                        {page.products && page.products.map((product, index) => (
                            <tr key={product.item_code} style={{ paddingTop: "1px", height: "8px", borderBottom: "solid 1px" }}>
                                <td className="text-center" style={{ border: "solid 0px", width: "48px", }}>
                                    <h4 style={{ fontSize: "3mm" }}>{index + 1 + (pageIndex * props.model.pageSize)}
                                    </h4>
                                </td>
                                <td className="text-center" style={{ border: "solid 0px", width: "93px" }} >
                                    <h4 style={{ fontSize: "3mm" }}>
                                        {product.code ? product.code : product.item_code ? product.item_code : null}
                                    </h4>
                                </td>
                                <td className="text-left" style={{ border: "solid 0px", width: "299px", paddingLeft: "5px" }} >
                                    <div style={{ height: "23px" }} >
                                        {product.name_in_arabic ? <h4 style={{ fontSize: "3mm", position: "relative", top: "-2px" }}>
                                            {product.name_in_arabic}
                                        </h4> : ""}
                                        {product.name && product.name_in_arabic ? <h4 style={{ fontSize: "3mm", position: "relative", top: "-11px" }}>
                                            {product.name}
                                        </h4> : ""}
                                        {product.name && !product.name_in_arabic ? <h4 style={{ fontSize: "3mm", position: "relative", top: "2px" }}>
                                            {product.name}
                                        </h4> : ""}
                                    </div>
                                </td>
                                <td className="text-center" style={{ border: "solid 0px", width: "77px", }}>
                                    <h4 style={{ fontSize: "3mm" }}>
                                        {product.quantity}  {product.unit ? product.unit : ""}
                                    </h4>
                                </td>
                                <td className="text-end" style={{ border: "solid 0px", width: "111px", paddingRight: "5px" }}>
                                    <h4 style={{ fontSize: "3mm" }}>
                                        <NumberFormat
                                            value={(product.unit_price).toFixed(2)}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={" SAR"}
                                            renderText={(value, props) => value}
                                        />
                                    </h4>
                                </td>
                                <td className="text-end" style={{ border: "solid 0px", width: "99px", paddingRight: "5px" }} >
                                    <h4 style={{ fontSize: "3mm" }}>
                                        <NumberFormat
                                            value={(product.unit_price * product.quantity).toFixed(2)}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={" SAR"}
                                            renderText={(value, props) => value}
                                        />
                                    </h4>
                                </td>
                            </tr>

                        ))}
                    </tbody>
                </table>

                {page.lastPage ? <table style={{ fontSize: "3mm", position: "absolute", left: "646px", top: (510 + page.top) + "px", border: "solid 0px", }}>
                    <tbody>
                        <tr className="text-end" style={{ verticalAlign: "center", border: "solid 0px", }}>
                            <td style={{ width: "99px", paddingRight: "5px", paddingTop: "10px" }}>
                                <h4 style={{ fontSize: "3mm", height: "9px", }}>
                                    <NumberFormat
                                        displayType={"text"}
                                        value={props.model.total.toFixed(2)}
                                        thousandSeparator={true}
                                        suffix={" SAR"}
                                        renderText={(value, props) => value}
                                    />
                                </h4>
                            </td>
                        </tr>
                        <tr className="text-end" style={{ verticalAlign: "center", border: "solid 0px", }}>
                            <td style={{ width: "99px", paddingRight: "5px", paddingTop: "10px" }}>
                                <h4 style={{ fontSize: "3mm", height: "9px", }}>
                                    <NumberFormat
                                        value={props.model.vat_price.toFixed(2)}
                                        displayType={"text"}
                                        thousandSeparator={true}
                                        suffix={" SAR"}
                                        renderText={(value, props) => value}
                                    />
                                </h4>
                            </td>
                        </tr>
                        <tr className="text-end" style={{ verticalAlign: "center", border: "solid 0px", }}>
                            <td style={{ width: "99px", paddingRight: "5px", paddingTop: "10px" }}>
                                <h4 style={{ fontSize: "3mm", height: "9px", }}>
                                    <NumberFormat
                                        value={props.model.discount.toFixed(2)}
                                        displayType={"text"}
                                        thousandSeparator={true}
                                        suffix={" SAR"}
                                        renderText={(value, props) => value}
                                    />
                                </h4>
                            </td>
                        </tr>
                        <tr className="text-end" style={{ verticalAlign: "center", border: "solid 0px", }}>
                            <td style={{ width: "99px", paddingRight: "5px", paddingTop: "10px" }}>
                                <h4 style={{ fontSize: "3mm", height: "9px", }}>
                                    <NumberFormat
                                        value={props.model.net_total.toFixed(2)}
                                        displayType={"text"}
                                        thousandSeparator={true}
                                        suffix={" SAR"}
                                        renderText={(value, props) => value}
                                    />
                                </h4>
                            </td>
                        </tr>

                    </tbody>
                </table> : ""}



                {page.lastPage ? <h4 style={{ fontSize: "3mm", position: "absolute", right: "320px", top: (555 + page.top) + "px" }}>
                    {n2words(props.model.net_total, { lang: 'ar' }) + "ريال سعودي "}
                </h4> : ""}
                {page.lastPage ? <h4 style={{ fontSize: "3mm", position: "absolute", left: "50px", top: (565 + page.top) + "px" }}>
                    {n2words(props.model.net_total, { lang: 'en' }) + " saudi riyals"}
                </h4> : ""}

                <h4 style={{ fontSize: "3mm", position: "absolute", left: "205px", top: (652 + page.top) + "px" }}>
                    {props.model.delivered_by_user ? props.model.delivered_by_user.name : ""}
                </h4>

                {page.lastPage ? <div style={{ position: "absolute", left: "575px", top: (622 + page.top) + "px" }} >
                    {props.model.QRImageData && <img style={{ width: "182px", height: "174px" }} src={props.model.QRImageData} alt="Invoice QR Code" />}
                </div> : ""}
            </div >
        ))}
    </>);

});

export default OrderPrintContent;