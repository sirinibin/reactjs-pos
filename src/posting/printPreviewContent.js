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
                    height: "1110px",
                    width: "770px",
                    marginTop: (10 + page.top) + "px"
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
                <div className="row" style={{ marginTop: "10px" }}>
                    <div className="col">
                        <u
                        ><h1 className="text-center" style={{ fontSize: "3mm" }}>
                                BALANCE SHEET / ورقة التوازن
                            </h1>
                        </u>
                    </div>
                </div>

                <div className="row table-active" style={{ fontSize: "3.5mm", border: "solid 0px" }}>
                    <div className="col-md-5" style={{ border: "solid 0px", width: "50%" }}>
                        <ul className="list-unstyled mb0 text-start">
                            {/*<li><strong>Order: </strong>#{props.model.code ? props.model.code : "<ID_NUMBER>"}</li>
                            <li><strong>Order Date: </strong> {props.model.date ? format(
                                new Date(props.model.date),
                                "MMM dd yyyy h:mma"
                            ) : "<DATETIME>"} </li>*/}
                            <li>
                                <strong>Account Name: </strong>{props.model.name ? props.model.name : "N/A"}
                            </li>
                            <li><strong>Account Number: </strong>{props.model.number ? props.model.number : "N/A"}
                            </li>
                            {props.model.phone ? <li>
                                <strong>Phone: </strong>{props.model.phone}
                            </li> : ""}
                            {props.model.vat_no ? <li>
                                <strong>VAT #: </strong>{props.model.vat_no}
                            </li> : ""}
                            {props.model.dateValue ? <li>
                                <strong>Date: </strong>{props.model.dateValue ? format(new Date(props.model.dateValue), "MMM dd yyyy") : ""}
                            </li> : ""}
                            {props.model.fromDateValue && props.model.toDateValue ? <li>
                                <strong>Date: </strong>{format(new Date(props.model.fromDateValue), "MMM dd yyyy") + " to " + format(new Date(props.model.toDateValue), "MMM dd yyyy")}
                            </li> : ""}
                            {props.model.fromDateValue && !props.model.toDateValue && !props.model.dateValue ? <li>
                                <strong>Date: </strong>{format(new Date(props.model.fromDateValue), "MMM dd yyyy") + " to present"}
                            </li> : ""}
                            {props.model.toDateValue && !props.model.fromDateValue && !props.model.dateValue ? <li>
                                <strong>Date: </strong>{"upto " + format(new Date(props.model.toDateValue), "MMM dd yyyy")}
                            </li> : ""}
                        </ul>
                    </div>

                    {/*
                    <div className="col-md-2 text-center" style={{ border: "solid 0px", width: "20%", padding: "0px" }}>
                        {props.model.QRImageData ? <img className="text-start" src={props.model.QRImageData} style={{ width: "70px", height: "72px" }} alt="Invoice QR Code" /> : ""}
                        </div>*/}

                    <div className="col-md-5" style={{ border: "solid 0px", width: "50%", alignSelf: "end" }} dir="ltr">
                        <ul className="list-unstyled mb0 text-end" dir="ltr">
                            {/*
                            <li>{props.model.code ? props.model.code : "<ID_NUMBER_ARABIC>"}<strong> :طلب </strong></li>
                    <li><strong>تاريخ الطلب:  </strong>{props.model.date ? getArabicDate(props.model.date) : "<DATETIME_ARABIC>"}</li>*/}
                            <li dir="ltr">
                                {props.model.name ? props.model.name : "غير متاح"} <strong dir="ltr"> :إسم الحساب</strong>
                            </li>
                            <li dir="ltr">{props.model.number ? convertToArabicNumber(props.model.number) : "غير متاح"} <strong dir="ltr">:رقم حساب</strong></li>
                            {props.model.phone ? <li dir="ltr"> <strong>هاتف:</strong> {convertToArabicNumber(props.model.phone)} </li> : ""}
                            {props.model.vat_no ? <li dir="ltr"> <strong>رقم ضريبة القيمة المضافة:</strong> {convertToArabicNumber(props.model.vat_no)} </li> : ""}
                            {props.model.dateValue ? <li dir="ltr">
                                <strong>تاريخ: </strong>{props.model.dateValue ? format(new Date(props.model.dateValue), "dd-MM-yyyy") : ""}
                            </li> : ""}
                            {props.model.fromDateValue && props.model.toDateValue ? <li dir="ltr">
                                <strong>تاريخ: </strong>{format(new Date(props.model.fromDateValue), "dd-MM-yyyy") + " - " + format(new Date(props.model.toDateValue), "dd-MM-yyyy")}
                            </li> : ""}
                            {props.model.fromDateValue && !props.model.toDateValue && !props.model.dateValue ? <li dir="ltr">
                                <strong>تاريخ: </strong>{"من " + format(new Date(props.model.fromDateValue), "dd-MM-yyyy") + " لتقديم"}
                            </li> : ""}
                            {props.model.toDateValue && !props.model.fromDateValue && !props.model.dateValue ? <li dir="ltr">
                                <strong dir="ltr">تاريخ: </strong>{"يصل إلى " + format(new Date(props.model.toDateValue), "dd-MM-yyyy")}
                            </li> : ""}

                        </ul>
                    </div>
                </div>
                <div className="row" style={{ fontSize: "3.5mm" }}>
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
                                className="table table-bordered"
                                style={{ borderRadius: "6px" }}
                            >
                                <thead style={{ fontSize: "3mm" }}>
                                    <tr >
                                        <th className="per1 text-center" style={{ padding: "0px", width: "15%" }}>
                                            <ul
                                                className="list-unstyled"
                                                style={{
                                                    height: "15px"
                                                }}
                                            >
                                                <li>تاريخ</li>
                                                <li>Date</li>
                                            </ul>
                                        </th>
                                        <th className="per3 text-center" colSpan={2} style={{ padding: "0px", width: "30%" }}>
                                            <ul
                                                className="list-unstyled"
                                                style={{
                                                    height: "15px"
                                                }}
                                            >
                                                <li>دَين</li>
                                                <li>Debit</li>
                                            </ul>
                                        </th>
                                        <th className="per68 text-center" colSpan={2} style={{ padding: "0px", width: "30%" }}>
                                            <ul
                                                className="list-unstyled"
                                                style={{
                                                    height: "15px"
                                                }}
                                            >
                                                <li>ائتمان</li>
                                                <li>Credit</li>
                                            </ul>
                                        </th>
                                        <th className="per1 text-center" style={{ padding: "0px", width: "10%" }}>
                                            <ul
                                                className="list-unstyled"
                                                style={{
                                                    height: "15px"
                                                }}
                                            >
                                                <li>كمية</li>
                                                <li>Type</li>
                                            </ul>
                                        </th>
                                        <th className="per10 text-center" style={{ padding: "0px", width: "15%" }}>
                                            <ul
                                                className="list-unstyled"
                                                style={{
                                                    height: "15px"
                                                }}
                                            >
                                                <li>بطاقة تعريف</li>
                                                <li>ID</li>
                                            </ul>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody style={{ fontSize: "2.7mm" }} >
                                    {pageIndex === 0 && props.model && (props.model.debitBalanceBoughtDown > 0 || props.model.creditBalanceBoughtDown > 0) ? <tr>
                                        <td></td>
                                        <td colSpan={2} style={{ textAlign: "right", color: "red" }}><b>
                                            {props.model.debitBalanceBoughtDown > 0 ? "To balance b/d " : ""}
                                            <NumberFormat
                                                value={props.model.debitBalanceBoughtDown > 0 ? props.model.debitBalanceBoughtDown?.toFixed(2) : ""}
                                                displayType={"text"}
                                                thousandSeparator={true}
                                                suffix={""}
                                                renderText={(value, props) => value}
                                            />

                                        </b></td>
                                        <td colSpan={2} style={{ textAlign: "right", color: "red" }}><b>
                                            {props.model.creditBalanceBoughtDown > 0 ? "By balance b/d " : ""}
                                            <NumberFormat
                                                value={props.model.creditBalanceBoughtDown > 0 ? props.model.creditBalanceBoughtDown?.toFixed(2) : ""}
                                                displayType={"text"}
                                                thousandSeparator={true}
                                                suffix={""}
                                                renderText={(value, props) => value}
                                            />

                                        </b></td>
                                        <td></td>
                                        <td></td>
                                    </tr> : ""}

                                    {page.posts && page.posts.filter(post => post.date).map((post, index) => (
                                        <tr key={index} style={{}}>
                                            <td style={{ width: "15%", fontSize: "1.6mm", height: "10px" }} >{post.date ? format(new Date(post.date), "MMM dd yyyy h:mma") : ""}</td>
                                            <td className="text-start" style={{ width: "25%", alignContent: "start", borderRightWidth: "0px", fontSize: "2mm" }}>
                                                {post.debit_account}
                                            </td>
                                            <td className="text-end" style={{ width: "5%", border: "solid 0px", fontSize: "2mm" }}>

                                                <NumberFormat
                                                    value={parseFloat(post.debit_amount)?.toFixed(2)}
                                                    displayType={"text"}
                                                    thousandSeparator={true}
                                                    suffix={""}
                                                    renderText={(value, props) => value}
                                                />
                                            </td>
                                            <td style={{ width: "25%", alignContent: "start", borderRightWidth: "0px", fontSize: "2mm" }}>
                                                {post.credit_account}
                                            </td>
                                            <td className="text-end" style={{ width: "5%", border: "solid 0px", fontSize: "2mm" }}>
                                                <NumberFormat
                                                    value={parseFloat(post.credit_amount)?.toFixed(2)}
                                                    displayType={"text"}
                                                    thousandSeparator={true}
                                                    suffix={""}
                                                    renderText={(value, props) => value}
                                                />
                                            </td>
                                            <td style={{ width: "10%", fontSize: "2mm" }}>{post.reference_model}</td>
                                            <td style={{ width: "15%", fontSize: "1.6mm" }}>{post.reference_code}</td>
                                        </tr>
                                    ))}
                                </tbody>

                                <tfoot style={{ fontSize: "3mm", }}>
                                    {props.model.pages.length === (pageIndex + 1) && props.model && (props.model.debitBalance > 0 || props.model.creditBalance > 0) ? <tr>
                                        <td></td>
                                        <td colSpan={2} style={{ textAlign: "right", color: "red" }}><b>

                                            {props.model.debitBalance > 0 ? "To balance c/d " : ""}
                                            <NumberFormat
                                                value={props.model.debitBalance > 0 ? props.model.debitBalance?.toFixed(2) : ""}
                                                displayType={"text"}
                                                thousandSeparator={true}
                                                suffix={""}
                                                renderText={(value, props) => value}
                                            />

                                        </b></td>
                                        <td colSpan={2} style={{ textAlign: "right", color: "red" }}><b>
                                            {props.model.creditBalance > 0 ? "By balance c/d " : ""}
                                            <NumberFormat
                                                value={props.model.creditBalance > 0 ? props.model.creditBalance?.toFixed(2) : ""}
                                                displayType={"text"}
                                                thousandSeparator={true}
                                                suffix={""}
                                                renderText={(value, props) => value}
                                            />
                                        </b></td>
                                        <td colSpan={2}></td>
                                    </tr> : ""}
                                    {props.model.pages.length === (pageIndex + 1) && props.model ? <tr>
                                        <td></td>
                                        <td colSpan={2} style={{ textAlign: "right" }}><b>
                                            <NumberFormat
                                                value={props.model.creditTotal > props.model.debitTotal ? props.model.creditTotal?.toFixed(2) : props.model.debitTotal?.toFixed(2)}
                                                displayType={"text"}
                                                thousandSeparator={true}
                                                suffix={""}
                                                renderText={(value, props) => value}
                                            />

                                        </b></td>
                                        <td colSpan={2} style={{ textAlign: "right" }}><b>
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

                                    {props.model.pages.length === (pageIndex + 1) ? <tr>
                                        <th colSpan="1" className="text-end" style={{ padding: "2px" }}>
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
                                </tfoot>
                            </table>

                            {props.model.pages.length === (pageIndex + 1) ? <table className="table table-bordered" style={{ fontSize: "3mm" }}>
                                <thead>
                                    <tr>
                                        <th className="text-end" style={{ width: "20%", padding: "2px" }}>
                                            Account Manager إدارة حساب المستخدم:
                                        </th>
                                        <th style={{ width: "30%", padding: "2px" }}> {props.userName ? props.userName : ""}{/*props.model.delivered_by_user ? props.model.delivered_by_user.name : null*/}</th>
                                        {/*
                                        <th className="text-end" style={{ width: "20%", padding: "2px" }}>
                                            Received By استلمت من قبل:
                                        </th>
                                        <th style={{ width: "30%" }}>

                                        </th>
                                    */}
                                    </tr>
                                    <tr>
                                        <th className="text-end" style={{ padding: "2px" }}>
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
                                    <tr>
                                        <th className="text-end" style={{ padding: "2px" }}>
                                            Date تاريخ:
                                        </th>
                                        <th style={{ padding: "2px" }} className="text-center">
                                            {format(new Date(), "MMM dd yyyy h:mma")}  {" / " + getArabicDate(new Date())}
                                        </th>
                                        {/*
                                        <th className="text-end" style={{ padding: "2px" }}>
                                            Date تاريخ:
                                        </th>
                                        <th></th>
            */}
                                    </tr>
                                </thead>
                            </table> : ""}
                        </div>
                    </div>
                </div>
                {props.model.pages.length === (pageIndex + 1) ? <div className="row" style={{ fontSize: "3mm", height: "55px", }}>
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
                </div> : ""}
            </div>
        ))}
    </>);

});

export default BalanceSheetPrintPreviewContent;