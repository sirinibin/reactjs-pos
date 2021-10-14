import React from "react";
import business_logo from './business_logo.png';
class QuotationPreviewContent extends React.Component {


    render() {
        return <>

            <div
                className="container"
                id="printableArea"
                style={{
                    backgroundColor: "white",
                    border: "solid 2px",
                    borderColor: "silver",
                    borderRadius: "2mm",
                    padding: "10px"
                }}

            >
                <div className="row" style={{ fontSize: "3mm" }}>
                    <div className="col">
                        <ul className="list-unstyled text-left">
                            <li><h4 style={{ fontSize: "4mm" }}>GULF UNION OZONE CO.</h4></li>
                            <li>For Industrial Tools & Spare Parts</li>
                            {/*<!-- <li><hr /></li> --> */}
                            <li>C.R. / 5903506195</li>
                            <li>VAT / 302105134900003</li>
                        </ul>
                    </div>
                    <div className="col">
                        <div className="invoice-logo text-center">
                            <img width="100" src={business_logo} alt="Invoice logo" />
                        </div>
                    </div>
                    <div className="col">
                        <ul className="list-unstyled text-end">
                            <li>
                                <h4 style={{ fontSize: "4mm" }}>
                                    <strong>
                                        شــركــة إتـــحاد الخــــليج أوزون لـــــلتجارة‬
                                    </strong>
                                </h4>
                            </li>
                            <li>
                                ‫واألدوات‬ -‫الغيار‬ ‫قطع‬ -‫الصناعية‬ ‫املعدات‬ -‫البناء‬ ‫ملواد
                            </li>
                            {/* <!-- <li><hr /></li> --> */}
                            <li>٥٩٠٣٥٠٦١٩٥ / ‫ت‬.‫س‬</li>
                            <li>٣٠٢١٠٥١٣٤٩٠٠٠٠٣ / ‫الضريبي‬ ‫الرقم‬</li>
                        </ul>
                    </div>
                </div>
                <div className="row">
                    <div className="col">
                        <u
                        ><h1 className="text-center" style={{ fontSize: "4mm" }}>
                                QUOTATION / اقتباس
                        </h1>
                        </u>
                    </div>
                </div>
                <div className="row table-active" style={{ fontSize: "3mm" }}>
                    <div className="col">
                        <ul className="list-unstyled mb0 text-start">
                            <li><strong>Quotation: </strong>#936988</li>
                            <li><strong>Quotation Date: </strong>October 10th, 2015</li>
                            <li>
                                <strong>Client Name: </strong>CHINA HARBOUR ENGINEERING ARABIA CO.
              LTD.
                           </li>
                            <li><strong>VAT Number: </strong>300451376400003</li>
                        </ul>
                    </div>
                    <div className="col">
                        <ul className="list-unstyled mb0 text-end">
                            <li><strong> اقتباس: </strong>#۹۳٦۹۸۸</li>
                            <li><strong>تاريخ الاقتباس: </strong>10 أكتوبر - 2015</li>
                            <li>
                                <strong>‫لعميل‬ ‫اسم‬: </strong>‫املحدودة‬ ‫العربية‬ ‫انجنيرنج‬
              ‫هاربور‬ ‫شاين‬ ‫شركة‬
                            </li>
                            <li><strong>ظريبه الشراء: </strong>۳۰۰٤٥۱۳۷٦٤۰۰۰۰۳</li>
                        </ul>
                    </div>
                </div>
                <div className="row" style={{ fontSize: "3mm" }}>
                    <div className="col text-start">Page 1 of 1</div>
                    <div className="col text-end">صفحة ۱ من ۱</div>
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
                                                <li>Item Code</li>
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
                                        <th className="per10 text-center" style={{ padding: "0px" }}>
                                            <ul
                                                className="list-unstyled"
                                                style={{ fontSize: "3mm", height: "35px", marginBottom: "0px" }}
                                            >
                                                <li>سعر الوحدة</li>
                                                <li>Unit Price</li>
                                            </ul>
                                        </th>
                                        <th className="per20 text-center" style={{ padding: "0px" }}>
                                            <ul
                                                className="list-unstyled"
                                                style={{ fontSize: "3mm", height: "35px", marginBottom: "0px" }}
                                            >
                                                <li>المبلغ الإجمالي</li>
                                                <li>Total Amount</li>
                                            </ul>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className="text-center">1</td>
                                        <td className="text-center">MMH80900</td>
                                        <td className="text-center">Oil Filter MMH80900</td>
                                        <td className="text-center">1</td>
                                        <td className="text-center">25.00 SAR</td>
                                        <td className="text-center">25.00 SAR</td>
                                    </tr>
                                    <tr>
                                        <td className="text-center">2</td>
                                        <td className="text-center">P777279</td>
                                        <td className="text-center">Air Filter P777279</td>
                                        <td className="text-center">1</td>
                                        <td className="text-center">25.00 SAR</td>
                                        <td className="text-center">25.00 SAR</td>
                                    </tr>
                                    <tr>
                                        <td className="text-center">3</td>
                                        <td className="text-center">EF-1801</td>
                                        <td className="text-center">Diesel Filter EF1801</td>
                                        <td className="text-center">1</td>
                                        <td className="text-center">25.00 SAR</td>
                                        <td className="text-center">25.00 SAR</td>
                                    </tr>
                                    <tr>
                                        <td className="text-center">4</td>
                                        <td className="text-center">P777279</td>
                                        <td className="text-center">Air Filter P777279</td>
                                        <td className="text-center">1</td>
                                        <td className="text-center">25.00 SAR</td>
                                        <td className="text-center">25.00 SAR</td>
                                    </tr>
                                    <tr>
                                        <td className="text-center">5</td>
                                        <td className="text-center">EF-1801</td>
                                        <td className="text-center">Diesel Filter EF1801</td>
                                        <td className="text-center">1</td>
                                        <td className="text-center">25.00 SAR</td>
                                        <td className="text-center">25.00 SAR</td>
                                    </tr>
                                    <tr>
                                        <td className="text-center">6</td>
                                        <td className="text-center">P777279</td>
                                        <td className="text-center">Air Filter P777279</td>
                                        <td className="text-center">1</td>
                                        <td className="text-center">25.00 SAR</td>
                                        <td className="text-center">25.00 SAR</td>
                                    </tr>
                                    <tr>
                                        <td className="text-center">7</td>
                                        <td className="text-center">EF-1801</td>
                                        <td className="text-center">Diesel Filter EF1801</td>
                                        <td className="text-center">1</td>
                                        <td className="text-center">25.00 SAR</td>
                                        <td className="text-center">25.00 SAR</td>
                                    </tr>
                                    <tr>
                                        <td className="text-center">8</td>
                                        <td className="text-center">P777279</td>
                                        <td className="text-center">Air Filter P777279</td>
                                        <td className="text-center">1</td>
                                        <td className="text-center">25.00 SAR</td>
                                        <td className="text-center">25.00 SAR</td>
                                    </tr>
                                    <tr>
                                        <td className="text-center">9</td>
                                        <td className="text-center">EF-1801</td>
                                        <td className="text-center">Diesel Filter EF1801</td>
                                        <td className="text-center">1</td>
                                        <td className="text-center">25.00 SAR</td>
                                        <td className="text-center">25.00 SAR</td>
                                    </tr>
                                    <tr>
                                        <td className="text-center">10</td>
                                        <td className="text-center">P777279</td>
                                        <td className="text-center">Air Filter P777279</td>
                                        <td className="text-center">1</td>
                                        <td className="text-center">25.00 SAR</td>
                                        <td className="text-center">25.00 SAR</td>
                                    </tr>
                                </tbody>

                                <tfoot>
                                    <tr>
                                        <th colSpan="3" className="text-end"></th>
                                        <th className="text-center">10</th>
                                        <th className="text-end" style={{ padding: "0px" }}>
                                            <ul
                                                className="list-unstyled"
                                                style={{
                                                    fontSize: "3mm", marginBottom: "0px"
                                                }}
                                            >
                                                <li>المجموع:</li>
                                                <li>Total:</li>
                                            </ul>
                                        </th>
                                        <th className="text-center" colSpan="2">250.00 SAR</th>
                                    </tr>
                                    <tr>
                                        <th className="text-end" colSpan="4" style={{ padding: "0px" }}>
                                            <ul
                                                className="list-unstyled"
                                                style={{
                                                    fontSize: "3mm", marginBottom: "0px"
                                                }}
                                            >
                                                <li>ضريبة:</li>
                                                <li>VAT:</li>
                                            </ul>
                                        </th>
                                        <th className="text-center" colSpan="1">10%</th>
                                        <th className="text-center" colSpan="2">25.00 SAR</th>
                                    </tr>
                                    <tr>
                                        <th className="text-end" colSpan="5" style={{ padding: "0px" }}>
                                            <ul
                                                className="list-unstyled"
                                                style={{
                                                    fontSize: "3mm", marginBottom: "0px"
                                                }}
                                            >
                                                <li>خصم:</li>
                                                <li>Discount:</li>
                                            </ul>
                                        </th>
                                        <th className="text-center" colSpan="2">10.00 SAR</th>
                                    </tr>
                                    <tr>
                                        <th className="text-end" colSpan="5" style={{ padding: "0px" }}>
                                            <ul
                                                className="list-unstyled"
                                                style={{
                                                    fontSize: "3mm", marginBottom: "0px"
                                                }}
                                            >
                                                <li>الإجمالي الصافي:</li>
                                                <li>Net Total:</li>
                                            </ul>
                                        </th>
                                        <th className="text-center" colSpan="2">265.00 SAR</th>
                                    </tr>
                                    <tr>
                                        <th colSpan="1" className="text-end" style={{ padding: "0px" }}>
                                            <ul
                                                className="list-unstyled"
                                                style={{
                                                    fontSize: "3mm", marginBottom: "0px"
                                                }}
                                            >
                                                <li>بكلمات:</li>
                                                <li>In Words:</li>
                                            </ul>
                                        </th>
                                        <th
                                            colSpan="5"
                                            style={{
                                                paddingLeft: "5px",
                                                paddingTop: "0px",
                                                paddingBottom: "0px"
                                            }}

                                        >
                                            <ul
                                                className="list-unstyled"
                                                style={{ fontSize: "3mm", marginBottom: "0px" }}
                                            >
                                                <li>مائتان وخمسة وستون ريالاً</li>
                                                <li>Two Hundred And Sixty Five Riyals</li>
                                            </ul>
                                        </th>
                                    </tr>
                                </tfoot>
                            </table>

                            <table className="table table-bordered" style={{ fontSize: "3mm" }}>
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
                                        <th style={{ width: "37%" }}></th>
                                        <th className="text-end" style={{ width: "13%", padding: "0px" }}>
                                            <ul
                                                className="list-unstyled"
                                                style={{ fontSize: "3mm", marginBottom: "0px" }}
                                            >
                                                <li>استلمت من قبل:</li>
                                                <li>Received By:</li>
                                            </ul>
                                        </th>
                                        <th style={{ width: "37%" }}></th>
                                    </tr>
                                    <tr>
                                        <th className="text-end" style={{ padding: "0px" }}>
                                            <ul className="list-unstyled" style={{ fontSize: "3mm" }}>
                                                <li>إمضاء:</li>
                                                <li>Signature:</li>
                                            </ul>
                                        </th>
                                        <th style={{ width: "37%", height: "80px" }}></th>
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
                                        <th></th>
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
                    <div className="col">
                        <ul className="list-unstyled mb0 text-center">
                            <li>
                                <b
                                >جدةه ٢٢٥٢٥-٢٢٣١ - رقم الوحدةع - حي الربوة - شارع يحي العلمي
                                    جوال:٩٦٦٥٤٣٢٢٧٨٤
              </b>
                            </li>
                            <li>
                                <strong
                                >Jeddah 22525 - 2231 Unit No.:4 - Al Rabwah Dist. Yahya Al
                                    Mualimi
                                </strong>
                            </li>

                            <li><strong>ظريبه الشراء: </strong>۳۰۰٤٥۱۳۷٦٤۰۰۰۰۳</li>
                            <li>
                                <strong
                                >Email:gulfuniontrading@gmail.com - MOB:-0554322784</strong
                                >
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </>;
    }

}

export default QuotationPreviewContent;