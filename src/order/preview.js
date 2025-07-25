import { React, useState, useRef, forwardRef, useImperativeHandle, useEffect, useCallback, useMemo } from "react";
import { Modal, Button, Spinner } from 'react-bootstrap';
import PreviewContent from './previewContent.js';
import PreviewContentWithSellerInfo from './previewContentWithSellerInfo.js';

//import { useReactToPrint } from 'react-to-print';
import { Invoice } from '@axenda/zatca';
import html2pdf from 'html2pdf.js';
import "./print.css";
import WhatsAppModal from './../utils/WhatsAppModal';
import MBDIInvoiceBackground from './../INVOICE.jpg';
import LGKInvoiceBackground from './../LGK_WHATSAPP.png';
//import jsPDF from "jspdf";
//import html2canvas from "html2canvas";


const Preview = forwardRef((props, ref) => {
    let [InvoiceBackground, setInvoiceBackground] = useState("");

    useImperativeHandle(ref, () => ({
        async open(modelObj, whatsapp, modelNameStr) {
            modelName = modelNameStr;
            setModelName(modelName);

            if (whatsapp) {
                whatsAppShare = true;
                setWhatsAppShare(whatsAppShare)
            } else {
                whatsAppShare = false;
                setWhatsAppShare(whatsAppShare)
            }

            if (modelObj) {
                model = modelObj;

                if (model.phone) {
                    phone = model.phone;
                } else {
                    phone = "";
                }

                setPhone(phone);

                setModel({ ...model })
                if (model.id) {
                    await getModel(model.id, modelName);
                }

                if (model.order_id) {
                    await getOrder(model.order_id);
                }

                if (model.quotation_id) {
                    await getQuotation(model.quotation_id);
                }

                if (model.store_id) {
                    await getStore(model.store_id);


                    if (whatsAppShare) {
                        if (model.store.code === "MBDI") {
                            InvoiceBackground = MBDIInvoiceBackground;
                        } else if (model.store.code === "LGK-SIMULATION" || model.store.code === "LGK" || model.store.code === "PH2") {
                            InvoiceBackground = LGKInvoiceBackground;
                        }

                        setInvoiceBackground(InvoiceBackground);
                        fontSizes[modelName + "_storeHeader"] = {
                            "visible": false,
                        }
                        if (fontSizes[modelName + "_marginTop"].value === 0) {
                            fontSizes[modelName + "_marginTop"] = {
                                "value": 153,
                                "unit": "px",
                                "size": "153px",
                                "step": 3
                            };
                        }
                        setFontSizes({ ...fontSizes });
                        saveToLocalStorage("fontSizes", fontSizes);
                    }
                }

                if (model.customer_id) {
                    await getCustomer(model.customer_id);
                }

                if (model.vendor_id) {
                    await getVendor(model.vendor_id);
                }

                setInvoiceTitle(modelName);
                setHideVAT(modelName);

                if (model.delivered_by) {
                    getUser(model.delivered_by);
                }

                if (model.delivered_by_signature_id) {
                    getSignature(model.delivered_by_signature_id);
                }

                preparePages();

                /*

                let pageSize = 15;
                model.pageSize = pageSize;
                let totalProducts = model.products.length;
                let top = 0;
                let totalPagesInt = parseInt(totalProducts / pageSize);
                let totalPagesFloat = parseFloat(totalProducts / pageSize);

                let totalPages = totalPagesInt;
                if ((totalPagesFloat - totalPagesInt) > 0) {
                    totalPages++;
                }

                model.total_pages = totalPages;


                model.pages = [];
                model.qrOnLeftBottom = true;


                let offset = 0;

                for (let i = 0; i < totalPages; i++) {
                    model.pages.push({
                        top: top,
                        products: [],
                        lastPage: false,
                        firstPage: false,
                    });

                    for (let j = offset; j < totalProducts; j++) {
                        model.pages[i].products.push(model.products[j]);
                        if (model.pages[i].products.length === pageSize) {
                            break;
                        }
                    }
                    /*
                    if (model.pages[i].products.length < pageSize) {
                        for (let s = model.pages[i].products.length; s < pageSize; s++) {
                            model.pages[i].products.push({});
                        }
                    }*/

                //top += 1057; //1057
                /*   top += 5; //1057
                   offset += pageSize;

                   if (i === 0) {
                       model.pages[i].firstPage = true;
                   }

                   if ((i + 1) === totalPages) {
                       model.pages[i].lastPage = true;
                   }
               }

               console.log("model.pages:", model.pages);
               console.log("model.products:", model.products);




               getQRCodeContents();
               */
                //model.qr_content = getQRCodeContents();
                //setModel({ ...model });

                setShow(true);
                console.log("model:", model);
            }

        },

    }));



    function ObjectToSearchQueryParams(object) {
        return Object.keys(object)
            .map(function (key) {
                return `search[${key}]=${object[key]}`;
            })
            .join("&");
    }
    let [whatsAppShare, setWhatsAppShare] = useState(false);
    let [phone, setPhone] = useState("");

    /*
     {props.model.store?.settings?.hide_quotation_invoice_vat ? <>
                                                    {(props.modelName === "quotation" && props.model.type === "invoice") || (props.modelName === "whatsapp_quotation" && props.model.type === "invoice") || props.modelName === "quotation_sales_return" || props.modelName === "whatsapp_quotation_sales_return" ? "" : <Amount amount={trimTo2Decimals(props.model.vat_price)} />}
                                                </> : <Amount amount={trimTo2Decimals(props.model.vat_price)} />}
    */

    function setHideVAT(modelName) {
        if (model.store?.settings.hide_quotation_invoice_vat) {
            if (((modelName === "quotation" || modelName === "whatsapp_quotation") && model.type === "invoice") || modelName === "quotation_sales_return" || modelName === "whatsapp_quotation_sales_return") {
                model.hideVAT = true;
            } else {
                model.hideVAT = false;
            }
        } else {
            model.hideVAT = false;
        }
    }

    function setInvoiceTitle(modelName) {
        model.modelName = modelName;

        console.log("model.modelName", model.modelName);
        console.log("model:", model);

        var IsCashOnly = true;
        if (model.payment_methods?.length === 0 || model.payment_status === "not_paid") {
            IsCashOnly = false;
        }

        for (let i = 0; i < model.payment_methods?.length; i++) {
            if (model.payment_methods[i] !== "cash") {
                IsCashOnly = false;
                break;
            }
        }

        var isSimplified = true;

        if (model.modelName === "sales" || model.modelName === "whatsapp_sales" || model.modelName === "sales_return" || model.modelName === "whatsapp_sales_return") {
            if (model.customer?.vat_no) {
                isSimplified = false;
            } else {
                isSimplified = true;
            }
        } else if (model.modelName === "purchase" || model.modelName === "whatsapp_purchase" || model.modelName === "purchase_return" || model.modelName === "whatsapp_purchase_return") {
            if (model.vendor?.vat_no) {
                isSimplified = false;
            } else {
                isSimplified = true;
            }
        }

        if (model.modelName === "sales" || model.modelName === "whatsapp_sales") {
            if (model.store?.zatca?.phase === "1") {
                if (model.payment_status !== "not_paid") {
                    //model.invoiceTitle = "TAX INVOICE | الفاتورة الضريبية";
                    model.invoiceTitle = model.store.settings.invoice.phase1.sales_titles.paid;
                    if (IsCashOnly) {
                        // model.invoiceTitle = "CASH TAX INVOICE | فاتورة ضريبية نقدية";
                        model.invoiceTitle = model.store.settings.invoice.phase1.sales_titles.cash;
                    }
                } else if (model.payment_status === "not_paid") {
                    // model.invoiceTitle = "CREDIT TAX INVOICE | فاتورة ضريبة الائتمان";
                    model.invoiceTitle = model.store.settings.invoice.phase1.sales_titles.credit;
                }
            } else if (model.store?.zatca?.phase === "2") {
                if (isSimplified) {
                    if (model.payment_status === "not_paid") {
                        // model.invoiceTitle = "SIMPLIFIED CREDIT TAX INVOICE | فاتورة ضريبة الائتمان المبسطة";
                        model.invoiceTitle = model.store.settings.invoice.phase2.sales_titles.credit;
                    } else {
                        //  model.invoiceTitle = "SIMPLIFIED TAX INVOICE | فاتورة ضريبية مبسطة";
                        model.invoiceTitle = model.store.settings.invoice.phase2.sales_titles.paid;
                        if (IsCashOnly) {
                            // model.invoiceTitle = "SIMPLIFIED CASH TAX INVOICE | فاتورة ضريبية نقدية مبسطة";
                            model.invoiceTitle = model.store.settings.invoice.phase2.sales_titles.cash;
                        }
                    }
                } else {
                    if (model.payment_status === "not_paid") {
                        // model.invoiceTitle = "STANDARD CREDIT TAX INVOICE | فاتورة ضريبة الائتمان القياسية";
                        model.invoiceTitle = model.store.settings?.invoice?.phase2_b2b?.sales_titles?.credit;
                    } else {
                        //model.invoiceTitle = "STANDARD TAX INVOICE | فاتورة ضريبية قياسية";
                        model.invoiceTitle = model.store.settings?.invoice?.phase2_b2b?.sales_titles?.paid;
                        if (IsCashOnly) {
                            // model.invoiceTitle = "STANDARD CASH TAX INVOICE | فاتورة ضريبية نقدية قياسية";
                            model.invoiceTitle = model.store.settings?.invoice?.phase2_b2b?.sales_titles?.cash;
                        }
                    }
                }
            }
        } else if (model.modelName === "sales_return" || model.modelName === "whatsapp_sales_return") {
            if (model.store?.zatca?.phase === "1") {
                //model.invoiceTitle = "SALES RETURN TAX INVOICE | فاتورة ضريبة المبيعات المرتجعة";
                model.invoiceTitle = model.store.settings?.invoice?.phase1?.sales_return_titles?.paid;
                if (IsCashOnly) {
                    //model.invoiceTitle = "SALES RETURN CASH TAX INVOICE | إقرار مبيعات فاتورة ضريبية نقدية";
                    model.invoiceTitle = model.store.settings?.invoice?.phase1?.sales_return_titles?.cash;
                }
            } else if (model.store?.zatca?.phase === "2") {
                if (isSimplified) {
                    // model.invoiceTitle = "SIMPLIFIED CREDIT NOTE RETURN TAX INVOICE | إقرار ضريبي مبسط لإقرار إقرار ائتماني";
                    model.invoiceTitle = model.store.settings?.invoice?.phase2?.sales_return_titles?.paid;
                    if (IsCashOnly) {
                        // model.invoiceTitle = "SIMPLIFIED CREDIT NOTE CASH RETURN TAX INVOICE | مذكرة ائتمان مبسطة، إقرار نقدي، فاتورة ضريبية";
                        model.invoiceTitle = model.store.settings?.invoice?.phase2?.sales_return_titles?.cash;
                    }

                    if (model.payment_status === "not_paid") {
                        model.invoiceTitle = model.store.settings?.invoice?.phase2?.sales_return_titles?.credit;
                    }
                } else {
                    // model.invoiceTitle = "STANDARD CREDIT NOTE RETURN TAX INVOICE | إقرار ضريبي قياسي لإرجاع فاتورة الائتمان";
                    model.invoiceTitle = model.store.settings?.invoice?.phase2_b2b?.sales_return_titles?.paid;
                    if (IsCashOnly) {
                        // model.invoiceTitle = "STANDARD CREDIT NOTE CASH RETURN TAX INVOICE | سند ائتمان قياسي، إقرار نقدي، فاتورة ضريبية";
                        model.invoiceTitle = model.store.settings?.invoice?.phase2_b2b?.sales_return_titles?.cash;
                    }

                    if (model.payment_status === "not_paid") {
                        model.invoiceTitle = model.store.settings?.invoice?.phase2_b2b?.sales_return_titles?.credit;
                    }
                }
            }
        } else if (model.modelName === "purchase" || model.modelName === "whatsapp_purchase") {
            if (model.payment_status === "not_paid") {
                // model.invoiceTitle = "CREDIT PURCHASE TAX INVOICE | فاتورة ضريبة الشراء بالائتمان";
                if (model.store?.zatca?.phase === "1") {
                    model.invoiceTitle = model.store.settings?.invoice?.phase1?.purchase_titles?.credit;
                } else if (model.store?.zatca?.phase === "2") {
                    if (isSimplified) {
                        model.invoiceTitle = model.store.settings?.invoice?.phase2?.purchase_titles?.credit;
                    } else {
                        model.invoiceTitle = model.store.settings?.invoice?.phase2_b2b?.purchase_titles?.credit;
                    }
                }

            } else {
                // model.invoiceTitle = "PURCHASE TAX INVOICE | فاتورة ضريبة الشراء";
                if (model.store?.zatca?.phase === "1") {
                    model.invoiceTitle = model.store.settings?.invoice?.phase1?.purchase_titles?.paid;
                } else if (model.store?.zatca?.phase === "2") {
                    if (isSimplified) {
                        model.invoiceTitle = model.store.settings?.invoice?.phase2?.purchase_titles?.paid;
                    } else {
                        model.invoiceTitle = model.store.settings?.invoice?.phase2_b2b?.purchase_titles?.paid;
                    }
                }

                if (IsCashOnly) {
                    // model.invoiceTitle = "CASH PURCHASE TAX INVOICE | فاتورة ضريبة الشراء النقدي";
                    if (model.store?.zatca?.phase === "1") {
                        model.invoiceTitle = model.store.settings?.invoice?.phase1?.purchase_titles?.cash;
                    } else if (model.store?.zatca?.phase === "2") {
                        if (isSimplified) {
                            model.invoiceTitle = model.store.settings?.invoice?.phase2?.purchase_titles?.cash;
                        } else {
                            model.invoiceTitle = model.store.settings?.invoice?.phase2_b2b?.purchase_titles?.cash;
                        }
                    }
                }
            }
        } else if (model.modelName === "purchase_return" || model.modelName === "whatsapp_purchase_return") {
            if (model.payment_status === "not_paid") {
                //model.invoiceTitle = "CREDIT PURCHASE RETURN TAX INVOICE | فاتورة ضريبة إرجاع الشراء بالائتمان";
                if (model.store?.zatca?.phase === "1") {
                    model.invoiceTitle = model.store.settings?.invoice?.phase1?.purchase_return_titles?.credit;
                } else if (model.store?.zatca?.phase === "2") {
                    if (isSimplified) {
                        model.invoiceTitle = model.store.settings?.invoice?.phase2?.purchase_return_titles?.credit;
                    } else {
                        model.invoiceTitle = model.store.settings?.invoice?.phase2_b2b?.purchase_return_titles?.credit;
                    }
                }

            } else {
                //  model.invoiceTitle = "PURCHASE RETURN TAX INVOICE | فاتورة ضريبة إرجاع المشتريات";
                if (model.store?.zatca?.phase === "1") {
                    model.invoiceTitle = model.store.settings?.invoice?.phase1?.purchase_return_titles?.paid;
                } else if (model.store?.zatca?.phase === "2") {
                    if (isSimplified) {
                        model.invoiceTitle = model.store.settings?.invoice?.phase2?.purchase_return_titles?.paid;
                    } else {
                        model.invoiceTitle = model.store.settings?.invoice?.phase2_b2b?.purchase_return_titles?.paid;
                    }
                }

                if (IsCashOnly) {
                    // model.invoiceTitle = "CASH PURCHASE RETURN TAX INVOICE | فاتورة ضريبة إرجاع الشراء النقدي";
                    if (model.store?.zatca?.phase === "1") {
                        model.invoiceTitle = model.store.settings?.invoice?.phase1?.purchase_return_titles?.cash;
                    } else if (model.store?.zatca?.phase === "2") {
                        if (isSimplified) {
                            model.invoiceTitle = model.store.settings?.invoice?.phase2?.purchase_return_titles?.cash;
                        } else {
                            model.invoiceTitle = model.store.settings?.invoice?.phase2_b2b?.purchase_return_titles?.cash;
                        }
                    }
                }
            }
        } else if (model.modelName === "quotation" || model.modelName === "whatsapp_quotation") {
            //  model.invoiceTitle = "QUOTATION / اقتباس";
            model.invoiceTitle = model.store.settings?.invoice?.quotation_title;

            if (model.type === "invoice" && model.payment_status === "not_paid") {
                //  model.invoiceTitle = "CREDIT INVOICE | فاتورة ائتمانية";
                model.invoiceTitle = model.store.settings?.invoice?.quotation_sales_titles.credit;
                /*if (model.store.code === "LGK-SIMULATION" || model.store.code === "LGK") {
                   // model.invoiceTitle = "CREDIT SALES ORDER | أمر مبيعات الائتمان";

                }*/
            } else if (model.type === "invoice") {
                //model.invoiceTitle = "INVOICE | فاتورة";
                model.invoiceTitle = model.store.settings?.invoice?.quotation_sales_titles.paid;
                /*if (model.store.code === "LGK-SIMULATION" || model.store.code === "LGK") {
                    model.invoiceTitle = "SALES ORDER | أمر المبيعات";
                }*/
            }

        } else if (model.modelName === "quotation_sales_return" || model.modelName === "whatsapp_quotation_sales_return") {
            if (model.payment_status === "not_paid") {
                // model.invoiceTitle = "CREDIT RETURN INVOICE | فاتورة إرجاع الائتمان";
                model.invoiceTitle = model.store.settings?.invoice?.quotation_sales_return_titles.credit;
            } else {
                // model.invoiceTitle = "RETURN INVOICE | فاتورة الإرجاع";
                model.invoiceTitle = model.store.settings?.invoice?.quotation_sales_return_titles.paid;
            }
        } else if (model.modelName === "delivery_note" || model.modelName === "whatsapp_delivery_note") {
            // model.invoiceTitle = "DELIVERY NOTE / مذكرة تسليم";
            model.invoiceTitle = model.store.settings?.invoice?.delivery_note_title;
        }

        setModel({ ...model });
    }

    let [modelName, setModelName] = useState("sales");

    function changePageSize(size) {
        fontSizes[modelName + "_pageSize"] = parseInt(size);
        setFontSizes({ ...fontSizes });
        saveToLocalStorage("fontSizes", fontSizes);
        preparePages();
    }

    function preparePages() {
        if (fontSizes[modelName + "_pageSize"]) {
            model.pageSize = fontSizes[modelName + "_pageSize"];
        } else {
            model.pageSize = 15
        }

        if (modelName === "sales_return" || modelName === "whatsapp_sales_return" || modelName === "purchase_return" || modelName === "whatsapp_purchase_return" || modelName === "quotation_sales_return" || modelName === "whatsapp_quotation_sales_return") {
            model.products = model.products?.filter(product => product.selected);
        }


        let totalProducts = model.products?.length;

        // let top = 0;
        let totalPagesInt = parseInt(totalProducts / model.pageSize);
        let totalPagesFloat = parseFloat(totalProducts / model.pageSize);

        let totalPages = totalPagesInt;
        if ((totalPagesFloat - totalPagesInt) > 0) {
            totalPages++;
        }

        model.total_pages = totalPages;


        model.pages = [];
        model.qrOnLeftBottom = true;


        let offset = 0;

        for (let i = 0; i < totalPages; i++) {
            model.pages.push({
                top: 0,
                products: [],
                lastPage: false,
                firstPage: false,
            });

            for (let j = offset; j < totalProducts; j++) {
                /* if (modelName == "sales_return" && !model.products[j].selected) {
                     continue
                 }*/

                model.pages[i].products.push(model.products[j]);
                if (model.pages[i].products.length === model.pageSize) {
                    break;
                }
            }
            /*
            if (model.pages[i].products.length < pageSize) {
                for (let s = model.pages[i].products.length; s < pageSize; s++) {
                    model.pages[i].products.push({});
                }
            }*/

            //top += 1057; //1057
            //top += 5; //1057
            offset += model.pageSize;

            if (i === 0) {
                model.pages[i].firstPage = true;
            }

            if ((i + 1) === totalPages) {
                model.pages[i].lastPage = true;
            }
        }

        console.log("model.pages:", model.pages);
        console.log("model.products:", model.products);
        getQRCodeContents();
    }


    async function getModel(id, modelName) {
        console.log("inside get Order");
        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': localStorage.getItem('access_token'),
            },
        };

        let searchParams = {};
        if (localStorage.getItem("store_id")) {
            searchParams.store_id = localStorage.getItem("store_id");
        }
        let queryParams = ObjectToSearchQueryParams(searchParams);

        let apiPath = "";
        if (modelName && (modelName === "sales" || modelName === "whatsapp_sales")) {
            apiPath = "order"
        } else if (modelName && (modelName === "sales_return" || modelName === "whatsapp_sales_return")) {
            apiPath = "sales-return"
        } else if (modelName && (modelName === "purchase" || modelName === "whatsapp_purchase")) {
            apiPath = "purchase"
        } else if (modelName && (modelName === "purchase_return" || modelName === "whatsapp_purchase_return")) {
            apiPath = "purchase-return"
        } else if (modelName && (modelName === "quotation" || modelName === "whatsapp_quotation")) {
            apiPath = "quotation"
        } else if (modelName && (modelName === "quotation_sales_return" || modelName === "whatsapp_quotation_sales_return")) {
            apiPath = "quotation-sales-return"
        } else if (modelName && (modelName === "delivery_note" || modelName === "whatsapp_delivery_note")) {
            apiPath = "delivery-note"
        }

        await fetch('/v1/' + apiPath + '/' + id + "?" + queryParams, requestOptions)
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();

                // check for error response
                if (!response.ok) {
                    const error = (data && data.errors);
                    return Promise.reject(error);
                }

                console.log("Response:");
                console.log(data);

                model = data.result;
                setModel({ ...model });
                return model;
            })
            .catch(error => {

            });
    }

    async function getOrder(id) {
        console.log("inside get Order");
        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': localStorage.getItem('access_token'),
            },
        };

        let searchParams = {};
        if (localStorage.getItem("store_id")) {
            searchParams.store_id = localStorage.getItem("store_id");
        }
        let queryParams = ObjectToSearchQueryParams(searchParams);



        await fetch('/v1/order/' + id + "?" + queryParams, requestOptions)
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();

                // check for error response
                if (!response.ok) {
                    const error = (data && data.errors);
                    return Promise.reject(error);
                }

                console.log("Response:");
                console.log(data);

                model.order = data.result;
                setModel({ ...model });

                return model;
            })
            .catch(error => {

            });
    }

    async function getQuotation(id) {
        console.log("inside get Quotation");
        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': localStorage.getItem('access_token'),
            },
        };

        let searchParams = {};
        if (localStorage.getItem("store_id")) {
            searchParams.store_id = localStorage.getItem("store_id");
        }
        let queryParams = ObjectToSearchQueryParams(searchParams);



        await fetch('/v1/quotation/' + id + "?" + queryParams, requestOptions)
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();

                // check for error response
                if (!response.ok) {
                    const error = (data && data.errors);
                    return Promise.reject(error);
                }

                console.log("Response:");
                console.log(data);

                model.quotation = data.result;
                setModel({ ...model });

                return model;
            })
            .catch(error => {

            });
    }



    let [model, setModel] = useState({});

    const [show, setShow] = useState(props.show);

    function handleClose() {
        setShow(false);
    }


    let [qrContent, setQrContent] = useState("");

    function getQRCodeContents() {
        qrContent = "";

        if (model.code) {
            qrContent += "Invoice #: " + model.code + "<br />";
        }

        if (model.store) {
            qrContent += "Store: " + model.store.name + "<br />";
        }

        if (model.customer) {
            qrContent += "Customer: " + model.customer.name + "<br />";
        }


        if (model.net_total) {
            qrContent += "Net Total: " + model.net_total + "<br />";
        }
        qrContent += "Store: Test <br />";

        setQrContent(qrContent);
        model.qr_content = qrContent;
        setModel({ ...model });
        console.log("QR content:", model.qr_content);

        return model.qr_content;
    }

    async function getStore(id) {
        console.log("inside get Store");
        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': localStorage.getItem('access_token'),
            },
        };

        await fetch('/v1/store/' + id, requestOptions)
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();

                // check for error response
                if (!response.ok) {
                    const error = (data && data.errors);
                    return Promise.reject(error);
                }

                console.log("Response:");
                console.log(data);
                let storeData = data.result;
                model.store = storeData;

                const invoice = new Invoice({
                    sellerName: model.store_name,
                    vatRegistrationNumber: model.store.vat_no,
                    invoiceTimestamp: model.date,
                    invoiceTotal: model.net_total,
                    invoiceVatTotal: model.vat_price,
                    // uuid: model.uuid,
                    invoiceHash: model.hash ? model.hash : "",
                });

                model.QRImageData = await invoice.render();
                console.log("model.QRImageData:", model.QRImageData);

                setModel({ ...model });
            })
            .catch(error => {

            });
    }



    async function getCustomer(id) {
        console.log("inside get Customer");
        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': localStorage.getItem('access_token'),
            },
        };

        let searchParams = {};
        if (localStorage.getItem("store_id")) {
            searchParams.store_id = localStorage.getItem("store_id");
        }
        let queryParams = ObjectToSearchQueryParams(searchParams);

        await fetch('/v1/customer/' + id + "?" + queryParams, requestOptions)
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();

                // check for error response
                if (!response.ok) {
                    const error = (data && data.errors);
                    return Promise.reject(error);
                }

                console.log("Customer Response:");
                console.log(data);
                let customerData = data.result;
                model.customer = customerData;
                setModel({ ...model });
            })
            .catch(error => {

            });
    }

    async function getVendor(id) {
        console.log("inside get Customer");
        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': localStorage.getItem('access_token'),
            },
        };

        let searchParams = {};
        if (localStorage.getItem("store_id")) {
            searchParams.store_id = localStorage.getItem("store_id");
        }
        let queryParams = ObjectToSearchQueryParams(searchParams);

        await fetch('/v1/vendor/' + id + "?" + queryParams, requestOptions)
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();

                // check for error response
                if (!response.ok) {
                    const error = (data && data.errors);
                    return Promise.reject(error);
                }

                console.log("Customer Response:");
                console.log(data);
                let vendorData = data.result;
                model.vendor = vendorData;
                setModel({ ...model });
            })
            .catch(error => {

            });
    }

    function getUser(id) {
        console.log("inside get User(Delivered by)");
        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': localStorage.getItem('access_token'),
            },
        };

        fetch('/v1/user/' + id, requestOptions)
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();

                // check for error response
                if (!response.ok) {
                    const error = (data && data.errors);
                    return Promise.reject(error);
                }


                console.log("Response:");
                console.log(data);
                let userData = data.result;
                model.delivered_by_user = userData;
                setModel({ ...model });
            })
            .catch(error => {

            });
    }

    function getSignature(id) {
        console.log("inside get Signature");
        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': localStorage.getItem('access_token'),
            },
        };


        let searchParams = {};
        if (localStorage.getItem("store_id")) {
            searchParams.store_id = localStorage.getItem("store_id");
        }
        let queryParams = ObjectToSearchQueryParams(searchParams);

        fetch('/v1/signature/' + id + "?" + queryParams, requestOptions)
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();

                // check for error response
                if (!response.ok) {
                    const error = (data && data.errors);
                    return Promise.reject(error);
                }

                console.log("Response:");
                console.log(data);
                let signatureData = data.result;
                model.delivered_by_signature = signatureData;
                setModel({ ...model });
            })
            .catch(error => {
            });
    }



    /*
    function print() {
        console.log("Print");
    }
    */

    const printAreaRef = useRef();

    const getFileName = useCallback(() => {
        let filename = model.store.code + "_";

        if (modelName === "sales" || modelName === "whatsapp_sales") {
            filename += "Sales";
        } else if (modelName === "sales_return" || modelName === "whatsapp_sales_return") {
            filename += "Sales_Return";
        } else if (modelName === "purchase" || modelName === "whatsapp_purchase") {
            filename += "Purchase";
        } else if (modelName === "purchase_return" || modelName === "whatsapp_purchase_return") {
            filename += "Purchase_Return";
        } else if (modelName === "quotation" || modelName === "whatsapp_quotation") {
            filename += "Quotation";
        } else if (modelName === "quotation_sales_return" || modelName === "whatsapp_quotation_sales_return") {
            filename += "Qtn_Sales_Return";
        } else if (modelName === "delivery_note" || modelName === "whatsapp_delivery_note") {
            filename += "Delivery_Note";
        }

        if (model.code) {
            filename += "-" + model.code;
        }

        return filename;
    }, [model, modelName])



    const handlePrint = useCallback(() => {
        setIsProcessing(true);
        const element = printAreaRef.current;
        if (!element) return;

        html2pdf().from(element).set({
            margin: 0,
            filename: `${getFileName()}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        }).outputPdf('bloburl').then(blobUrl => {
            setIsProcessing(false);
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = blobUrl;
            document.body.appendChild(iframe);

            iframe.onload = () => {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();
            };
        });
    }, [getFileName]);



    /*
    const handlePrint = async () => {
      const element = printAreaRef.current;
      if (!element) return;
    
      const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
      });
    
      const imgData = canvas.toDataURL("image/jpeg", 1.0);
      const pdf = new jsPDF("p", "mm", "a4");
    
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${getFileName()}.pdf`);
    };*/

    /*
     
     
            const handlePrint = useCallback(async () => {
                const element = printAreaRef.current;
                if (!element) return;
     
                const opt = {
                    margin: 0,
                    filename: `${getFileName()}.pdf`,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2, useCORS: true, logging: true },
                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                };
     
                const pdfBlob = await html2pdf().from(element).set(opt).outputPdf('blob');
     
                // Create a blob URL
                const blobUrl = URL.createObjectURL(pdfBlob);
     
                // Open the PDF in a new window or iframe and trigger print
                const printWindow = window.open(blobUrl);
                if (printWindow) {
                    printWindow.onload = function () {
                        printWindow.focus();
                        printWindow.print();
                    };
                } else {
                    alert("Popup blocked! Please allow popups for this website.");
                }
            }, [getFileName]);
            */
    /*
    const handlePrint = useReactToPrint({
        content: () => printAreaRef.current,
        documentTitle: getFileName(),
        onAfterPrint: () => {
            handleClose();
        }
    });*/

    /*
    const saveFileToServer = useReactToPrint({
        content: () => printAreaRef.current,
        documentTitle: getFileName(),
        onAfterPrint: () => {
            handleClose();
        }
    });*/




    const formatPhoneForWhatsApp = useCallback((number) => {
        // Step 1: Remove all non-digit characters
        number = number.replace(/\D/g, '');

        // Step 2: Replace starting 05 with 9665
        if (number.startsWith('05')) {
            number = '966' + number.slice(1);
        }

        return number;
    }, [])

    const timerRef = useRef(null);
    const [defaultNumber, setDefaultNumber] = useState("");
    const [defaultMessage, setDefaultMessage] = useState("");
    let [isProcessing, setIsProcessing] = useState(false);

    const openWhatsAppShare = useCallback(async () => {
        setIsProcessing(true);
        const element = printAreaRef.current;
        if (!element) return;

        const opt = {
            margin: 0,
            filename: `${getFileName()}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        const pdfBlob = await html2pdf().from(element).set(opt).outputPdf('blob');

        // Upload to your server
        const formData = new FormData();
        formData.append("file", pdfBlob, `${getFileName()}.pdf`);

        await fetch("/v1/upload-pdf", { method: "POST", body: formData });
        // const { fileUrl } = await res.json();


        // Share via WhatsApp
        console.log(" model.phone:", model.phone);




        let whatsAppNo = "";

        if (phone) {
            whatsAppNo = phone;
        } else if (model.customer?.phone) {
            whatsAppNo = model.customer?.phone
        } else if (model.vendor?.phone) {
            whatsAppNo = model.vendor?.phone
        }


        let message = "";
        if (modelName === "quotation" && model?.type !== "invoice") {
            message = `Hello, here is your Quotation:\n${window.location.origin}/pdfs/${getFileName()}.pdf`;
        } else if (modelName === "delivery_note" || modelName === "whatsapp_delivery_note") {
            message = `Hello, here is your Delivery Note:\n${window.location.origin}/pdfs/${getFileName()}.pdf`;
        } else if (modelName === "sales_return" || modelName === "whatsapp_sales_return") {
            message = `Hello, here is your Return Invoice:\n${window.location.origin}/pdfs/${getFileName()}.pdf`;
        } else if (modelName === "quotation_sales_return" || modelName === "whatsapp_quotation_sales_return") {
            message = `Hello, here is your Return Invoice:\n${window.location.origin}/pdfs/${getFileName()}.pdf`;
        } else {
            message = `Hello, here is your Invoice:\n${window.location.origin}/pdfs/${getFileName()}.pdf`;
        }

        if (timerRef.current) clearTimeout(timerRef.current);

        timerRef.current = setTimeout(() => {
            setIsProcessing(false);
            whatsAppNo = formatPhoneForWhatsApp(whatsAppNo);
            setDefaultMessage(message);
            setDefaultNumber(whatsAppNo);
            setShowWhatsAppMessageModal(true);
        }, 100);

    }, [getFileName, model, phone, modelName, formatPhoneForWhatsApp]);

    const [showWhatsAppMessageModal, setShowWhatsAppMessageModal] = useState(false);
    const handleChoice = ({ type, number, message }) => {
        let whatsappUrl = "";
        if (type === "number" && number) {
            whatsappUrl = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
        } else if (type === "contacts") {
            whatsappUrl = `https://wa.me?text=${encodeURIComponent(message)}`;
        }

        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            window.open(whatsappUrl, "_blank");
        }, 100);

    };


    const [showSlider, setShowSlider] = useState(false);
    const [showQrCodeSlider, setShowQrCodeSlider] = useState(false);
    let [selectedText, setSelectedText] = useState("");

    const defaultFontSizes = useMemo(() => ({
        "qrCode": {
            "height": {
                "value": 138,
                "unit": "px",
                "size": "138px",
                "step": 1
            },
            "width": {
                "value": 138,
                "unit": "px",
                "size": "138px",
                "step": 1
            },
        },
        "pageSize": 15,
        "font": "Cairo",
        "reportPageSize": 20,
        "marginTop": {
            "value": 0,
            "unit": "px",
            "size": "0px",
            "step": 3
        },
        "storeHeader": {
            "visible": true,
        },
        "storeName": {
            "value": 3.5,
            "unit": "mm",
            "size": "3.5mm",
            "step": 0.1,
        },
        "storeTitle": {
            "value": 2.8,
            "unit": "mm",
            "size": "3.8mm",
            "step": 0.1,
        },
        "storeCR": {
            "value": 2.2,
            "unit": "mm",
            "size": "2.2mm",
            "step": 0.1,
        },
        "storeVAT": {
            "value": 2.2,
            "unit": "mm",
            "size": "2.2mm",
            "step": 0.1,
        },
        "storeNameArabic": {
            "value": 3.5,
            "unit": "mm",
            "size": "3.5mm",
            "step": 0.1,
        },
        "storeTitleArabic": {
            "value": 2.8,
            "unit": "mm",
            "size": "3.8mm",
            "step": 0.1,
        },
        "storeCRArabic": {
            "value": 2.2,
            "unit": "mm",
            "size": "2.2mm",
            "step": 0.1,
        },
        "storeVATArabic": {
            "value": 2.2,
            "unit": "mm",
            "size": "2.2mm",
            "step": 0.1,
        },
        "invoiceTitle": {
            "value": 3,
            "unit": "mm",
            "size": "3mm",
            "step": 0.1,
        },
        "invoiceDetails": {
            "value": 2.2,
            "unit": "mm",
            "size": "2.2mm",
            "step": 0.1,
        },
        "invoicePageCount": {
            "value": 2.2,
            "unit": "mm",
            "size": "2.2mm",
            "step": 0.1,
        },
        "tableHead": {
            "value": 2.2,
            "unit": "mm",
            "size": "2.2mm",
            "step": 0.1,
        },
        "tableBody": {
            "value": 2.2,
            "unit": "mm",
            "size": "2.2mm",
            "step": 0.1,
        },
        "tableFooter": {
            "value": 2.2,
            "unit": "mm",
            "size": "2.2mm",
            "step": 0.1,
        },
        "signature": {
            "value": 2.2,
            "unit": "mm",
            "size": "2.2mm",
            "step": 0.1,
        },
        "footer": {
            "value": 2.2,
            "unit": "mm",
            "size": "2.2mm",
            "step": 0.1,
        },
        "bankAccountHeader": {
            "value": 2.2,
            "unit": "mm",
            "size": "2.2mm",
            "step": 0.1,
        },
        "bankAccountBody": {
            "value": 2.2,
            "unit": "mm",
            "size": "2.2mm",
            "step": 0.1,
        },
    }), []);

    const selectText = (name) => {
        selectedText = name;
        setSelectedText(name);
        if (!fontSizes[modelName + "_" + selectedText]) {
            fontSizes[modelName + "_" + selectedText] = defaultFontSizes[selectedText];
        }
        setShowSlider(true);
    };

    const selectQRCode = () => {
        selectedText = "";
        setSelectedText("");
        if (!fontSizes[modelName + "_qrCode"]) {
            fontSizes[modelName + "_qrCode"] = defaultFontSizes[modelName + "_qrCode"];
        }
        setShowQrCodeSlider(true);
    };

    const saveToLocalStorage = useCallback((key, obj) => {
        localStorage.setItem(key, JSON.stringify(obj));
    }, []);

    const getFromLocalStorage = useCallback((key) => {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : null;
    }, []);


    let [fontSizes, setFontSizes] = useState(defaultFontSizes);

    useEffect(() => {
        let storedFontSizes = getFromLocalStorage("fontSizes");
        if (storedFontSizes) {
            setFontSizes({ ...storedFontSizes });
        } else {
            storedFontSizes = {};
        }

        let modelNames = [
            "sales",
            "whatsapp_sales",
            "sales_return",
            "whatsapp_sales_return",
            "purchase",
            "whatsapp_purchase",
            "purchase_return",
            "whatsapp_purchase_return",
            "quotation",
            "whatsapp_quotation",
            "quotation_sales_return",
            "whatsapp_quotation_sales_return",
            "delivery_note",
            "whatsapp_delivery_note",
            "customer_deposit",
            "whatsapp_customer_deposit",
            "customer_withdrawal",
            "whatsapp_customer_withdrawal",
            "balance_sheet",
            "whatsapp_balance_sheet"
        ];
        for (let key1 in modelNames) {
            for (let key2 in defaultFontSizes) {
                if (!storedFontSizes[modelNames[key1] + "_" + key2]) {
                    storedFontSizes[modelNames[key1] + "_" + key2] = defaultFontSizes[key2];
                }
            }
        }
        setFontSizes({ ...storedFontSizes });
        saveToLocalStorage("fontSizes", storedFontSizes);
    }, [setFontSizes, defaultFontSizes, saveToLocalStorage, getFromLocalStorage]);


    const increment = () => {
        if (selectedText) {
            if (!fontSizes[modelName + "_" + selectedText]) {
                fontSizes[modelName + "_" + selectedText] = defaultFontSizes[selectedText];
            }

            fontSizes[modelName + "_" + selectedText].value += fontSizes[modelName + "_" + selectedText].step;
            fontSizes[modelName + "_" + selectedText]["value"] = parseFloat(Math.min(fontSizes[modelName + "_" + selectedText]?.value).toFixed(2));
            fontSizes[modelName + "_" + selectedText]["size"] = fontSizes[modelName + "_" + selectedText]?.value + fontSizes[modelName + "_" + selectedText]?.unit;
            setFontSizes({ ...fontSizes });
            saveToLocalStorage("fontSizes", fontSizes);
        }
    };

    const decrement = (element) => {
        if (selectedText) {
            if (!fontSizes[modelName + "_" + selectedText]) {
                fontSizes[modelName + "_" + selectedText] = defaultFontSizes[selectedText];
            }

            fontSizes[modelName + "_" + selectedText].value -= fontSizes[modelName + "_" + selectedText].step;
            fontSizes[modelName + "_" + selectedText].value = parseFloat(Math.min(fontSizes[modelName + "_" + selectedText].value).toFixed(2));
            fontSizes[modelName + "_" + selectedText].size = fontSizes[modelName + "_" + selectedText].value + fontSizes[modelName + "_" + selectedText].unit;
            setFontSizes({ ...fontSizes });
            saveToLocalStorage("fontSizes", fontSizes);
        }
    };


    const QrSize = (operation, attribute) => {

        if (!fontSizes[modelName + "_qrCode"]) {
            fontSizes[modelName + "_qrCode"] = defaultFontSizes["qrCode"];
        }
        if (operation === "increment") {
            fontSizes[modelName + "_qrCode"][attribute].value += fontSizes[modelName + "_qrCode"][attribute].step;
        } else if (operation === "decrement") {
            fontSizes[modelName + "_qrCode"][attribute].value -= fontSizes[modelName + "_qrCode"][attribute].step;
        }

        fontSizes[modelName + "_qrCode"][attribute]["value"] = parseFloat(Math.min(fontSizes[modelName + "_qrCode"][attribute]?.value).toFixed(2));
        fontSizes[modelName + "_qrCode"][attribute]["size"] = fontSizes[modelName + "_qrCode"][attribute]?.value + fontSizes[modelName + "_qrCode"][attribute]?.unit;
        setFontSizes({ ...fontSizes });
        saveToLocalStorage("fontSizes", fontSizes);
    };



    const incrementSize = (element) => {
        if (element) {
            if (!fontSizes[element]) {
                fontSizes[element] = defaultFontSizes[element];
            }

            fontSizes[element].value += fontSizes[element].step;
            fontSizes[element]["value"] = parseFloat(Math.min(fontSizes[element]?.value).toFixed(2));
            fontSizes[element]["size"] = fontSizes[element]?.value + fontSizes[element]?.unit;
            setFontSizes({ ...fontSizes });
            saveToLocalStorage("fontSizes", fontSizes);
        }
    };

    const decrementSize = (element) => {
        if (element) {
            if (!fontSizes[element]) {
                fontSizes[element] = defaultFontSizes[element];
            }

            fontSizes[element].value -= fontSizes[element].step;
            fontSizes[element].value = parseFloat(Math.min(fontSizes[element].value).toFixed(2));
            fontSizes[element].size = fontSizes[element].value + fontSizes[element].unit;
            setFontSizes({ ...fontSizes });
            saveToLocalStorage("fontSizes", fontSizes);
        }
    };

    function formatModelName(str) {
        return str
            .replace(/_/g, ' ')                   // Replace _ with space
            .split(' ')                            // Split by spaces
            .map(word =>
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() // Capitalize
            )
            .join(' ');                            // Join words back with space
    }


    const fonts = [
        { label: 'Calibri Light', value: "Calibri Light" },
        { label: 'IBM Plex Sans Arabic Regular', value: "IBM Plex Sans Arabic Regular" },
        { label: 'Sakkal Majalla', value: 'Sakkal Majalla' },
        { label: 'Arial', value: 'Arial' },
        { label: 'Tahoma', value: 'Tahoma' },
        { label: 'Akhbar Regular', value: 'Akhbar Regular' },
        { label: 'Thuluth Regular', value: 'Thuluth Regular' },
        { label: 'Simplified Arabic', value: 'Simplified Arabic' },
        { label: 'Traditional Arabic', value: 'Traditional Arabic' },
        { label: 'Andulus', value: 'Andulus' },
        { label: 'Noto Naskh Bold', value: 'Noto Naskh Bold' },
        { label: 'Noto Naskh Semi Bold', value: 'Noto Naskh Semi Bold' },
        { label: 'Noto Naskh Regular', value: 'Noto Naskh Regular' },
        { label: 'Noto Naskh Medium', value: 'Noto Naskh Medium' },
        { label: 'Wafeq Regular', value: 'Wafeq Regular' },
        { label: 'Wafeq Light', value: 'Wafeq Light' },
        { label: 'Cairo', value: 'Cairo' },
        { label: 'Amiri', value: 'Amiri' },
        { label: 'Noto Naskh Arabic', value: '"Noto Naskh Arabic"' },
        { label: 'Noto Kufi Arabic', value: '"Noto Kufi Arabic"' },
        { label: 'Changa', value: 'Changa' },
        { label: 'Lateef', value: 'Lateef' },
        { label: 'Harmattan', value: 'Harmattan' },
        { label: 'Scheherazade New', value: '"Scheherazade New"' },
        { label: 'Reem Kufi', value: '"Reem Kufi"' },
        { label: 'El Messiri', value: '"El Messiri"' },
        { label: 'Tajawal', value: 'Tajawal' },
        { label: 'Almarai', value: 'Almarai' },
        { label: 'Markazi Text', value: '"Markazi Text"' },
        { label: 'Aref Ruqaa', value: '"Aref Ruqaa"' },
        { label: 'Baloo Bhaijaan 2', value: '"Baloo Bhaijaan 2"' }
    ];

    //const [selectedFont, setSelectedFont] = useState(fontSizes[modelName + "_font"]);

    const handleFontChange = (e) => {
        // setSelectedFont(e.target.value);
        fontSizes[modelName + "_font"] = e.target.value;
        setFontSizes({ ...fontSizes })
        saveToLocalStorage("fontSizes", fontSizes);
    };





    useEffect(() => {
        const handleEnterKey = (event) => {
            const tag = event.target.tagName.toLowerCase();
            const isInput = tag === 'input' || tag === 'textarea' || event.target.isContentEditable;

            if (!show) {
                return;
            }

            if (event.key === 'Enter' && !isInput) {
                //handlePrint()

                if (whatsAppShare) {
                    openWhatsAppShare();
                } else {
                    handlePrint();
                }
                // openPrintTypeSelection();
                // Call your function here
            }
        };

        document.addEventListener('keydown', handleEnterKey);
        return () => {
            document.removeEventListener('keydown', handleEnterKey);
        };
    }, [handlePrint, openWhatsAppShare, whatsAppShare, show]); // no dependencies


    return (<>
        <WhatsAppModal
            show={showWhatsAppMessageModal}
            onClose={() => setShowWhatsAppMessageModal(false)}
            onChoice={handleChoice}
            defaultNumber={defaultNumber}
            defaultMessage={defaultMessage}
        />

        <Modal show={show} scrollable={true} size="xl" fullscreen onHide={handleClose} animation={false}>
            <Modal.Header className="d-flex flex-wrap align-items-center justify-content-between">
                {/* Left: Title */}
                <div className="flex-grow-1">
                    <Modal.Title>{formatModelName(modelName)} Preview</Modal.Title>
                </div>

                {/* Right: Fixed control block */}
                <div className="d-flex flex-wrap align-items-center" style={{ gap: '10px' }}>
                    {/* Slider */}
                    {showSlider && (
                        <div className="d-flex align-items-center border rounded bg-light p-2">
                            <button className="btn btn-outline-secondary" onClick={decrement}>−</button>
                            <span className="mx-2">Font Size: {fontSizes[modelName + "_" + selectedText]?.size}</span>
                            <button className="btn btn-outline-secondary" onClick={increment}>+</button>
                            <button className="btn-close ms-2" onClick={() => setShowSlider(false)}></button>
                        </div>
                    )}

                    {showQrCodeSlider && (
                        <>
                            <div className="d-flex align-items-center border rounded bg-light p-2">
                                <button className="btn btn-outline-secondary" onClick={() => {
                                    QrSize("decrement", "width");
                                }}>−</button>
                                <span className="mx-2">Width: {fontSizes[modelName + "_qrCode"]["width"]?.size}</span>
                                <button className="btn btn-outline-secondary" onClick={() => {
                                    QrSize("increment", "width");
                                }}>+</button>


                                <button className="btn btn-outline-secondary" style={{ marginLeft: "10px" }} onClick={() => {
                                    QrSize("decrement", "height");
                                }}>−</button>
                                <span className="mx-2">Height: {fontSizes[modelName + "_qrCode"]["height"]?.size}</span>
                                <button className="btn btn-outline-secondary" onClick={() => {
                                    QrSize("increment", "height");
                                }}>+</button>
                                <button className="btn-close ms-2" onClick={() => setShowQrCodeSlider(false)}></button>

                            </div>
                            {/* <div className="d-flex align-items-center border rounded bg-light p-2">
                                <button className="btn btn-outline-secondary" onClick={() => {
                                    QrSize("decrement", "height");
                                }}>−</button>
                                <span className="mx-2">Height: {fontSizes[modelName + "_qrCode"]["height"]?.size}</span>
                                <button className="btn btn-outline-secondary" onClick={() => {
                                    QrSize("increment", "height");
                                }}>+</button>
                                <button className="btn-close ms-2" onClick={() => setShowQrCodeSlider(false)}></button>
                            </div>*/}
                        </>
                    )}

                    <label htmlFor="font-select">Select Font: </label>
                    <select id="font-select" value={fontSizes[modelName + "_font"]} onChange={handleFontChange}>
                        {fonts.map((font) => (
                            <option key={font.value} value={font.value}>
                                {font.label}
                            </option>
                        ))}
                    </select>

                    {/* Show Store Header - Always fixed here */}
                    <div className="form-check">
                        <input
                            type="checkbox"
                            className="form-check-input"
                            id="storeHeaderCheck"
                            checked={fontSizes[modelName + "_storeHeader"]?.visible}
                            onChange={() => {
                                fontSizes[modelName + "_storeHeader"].visible = !fontSizes[modelName + "_storeHeader"]?.visible;

                                setFontSizes({ ...fontSizes });

                                saveToLocalStorage("fontSizes", fontSizes);
                            }}
                        />
                        <label htmlFor="storeHeaderCheck" className="form-check-label">Show Store Header</label>
                    </div>



                    {/* Margin Control */}

                    <div className="d-flex align-items-center border rounded bg-light p-2" style={{ marginRight: "200px" }}>
                        <button className="btn btn-outline-secondary" onClick={() => decrementSize(modelName + "_marginTop")}>−</button>
                        <span className="mx-2">Margin Top: {fontSizes[modelName + "_marginTop"]?.size}</span>
                        <button className="btn btn-outline-secondary" onClick={() => incrementSize(modelName + "_marginTop")}>+</button>
                    </div>

                    <div className="col ">
                        <>
                            <label className="form-label">Page Size:&nbsp;</label>
                            <select
                                value={fontSizes[modelName + "_pageSize"]}
                                onChange={(e) => {
                                    changePageSize(e.target.value);
                                }}
                                className="form-control pull-right"
                                style={{
                                    border: "solid 1px",
                                    borderColor: "silver",
                                    width: "55px",
                                }}
                            >
                                <option value="5">5</option>
                                <option value="6">6</option>
                                <option value="7">7</option>
                                <option value="8">8</option>
                                <option value="9">9</option>
                                <option value="10">10</option>
                                <option value="11">11</option>
                                <option value="12">12</option>
                                <option value="13">13</option>
                                <option value="14">14</option>
                                <option value="15">15</option>
                                <option value="16">16</option>
                            </select>
                        </>
                    </div>




                    {/* Print & Close Buttons */}
                    <div className="d-flex align-items-center">
                        <Button
                            variant={whatsAppShare ? "success" : "primary"}
                            onClick={whatsAppShare ? openWhatsAppShare : handlePrint}
                            className="me-2"
                        >
                            {isProcessing ?
                                <Spinner
                                    as="span"
                                    animation="border"
                                    size="sm"
                                    role="status"
                                    aria-hidden={true}
                                />

                                : ""
                            }

                            {!isProcessing && <>
                                {!whatsAppShare ? (
                                    <>
                                        <i className="bi bi-printer"></i> Print
                                    </>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="white" viewBox="0 0 16 16">
                                        <path d="M13.601 2.326A7.875 7.875 0 0 0 8.036 0C3.596 0 0 3.597 0 8.036c0 1.417.37 2.805 1.07 4.03L0 16l3.993-1.05a7.968 7.968 0 0 0 4.043 1.085h.003c4.44 0 8.036-3.596 8.036-8.036 0-2.147-.836-4.166-2.37-5.673ZM8.036 14.6a6.584 6.584 0 0 1-3.35-.92l-.24-.142-2.37.622.63-2.31-.155-.238a6.587 6.587 0 0 1-1.018-3.513c0-3.637 2.96-6.6 6.6-6.6 1.764 0 3.42.69 4.67 1.94a6.56 6.56 0 0 1 1.93 4.668c0 3.637-2.96 6.6-6.6 6.6Zm3.61-4.885c-.198-.1-1.17-.578-1.352-.644-.18-.066-.312-.1-.444.1-.13.197-.51.644-.626.775-.115.13-.23.15-.428.05-.198-.1-.837-.308-1.594-.983-.59-.525-.99-1.174-1.11-1.372-.116-.198-.012-.305.088-.403.09-.09.198-.23.298-.345.1-.115.132-.197.2-.33.065-.13.032-.247-.017-.345-.05-.1-.444-1.07-.61-1.46-.16-.384-.323-.332-.444-.338l-.378-.007c-.13 0-.344.048-.525.23s-.688.672-.688 1.64c0 .967.704 1.9.802 2.03.1.13 1.386 2.116 3.365 2.963.47.203.837.324 1.122.414.472.15.902.13 1.24.08.378-.057 1.17-.48 1.336-.942.165-.462.165-.858.116-.943-.048-.084-.18-.132-.378-.23Z" />
                                    </svg>
                                )}
                            </>}
                        </Button>
                        {/*
                        
                           <Button variant="primary" onClick={handleCreate}>
                                                    {isProcessing ?
                                                        <Spinner
                                                            as="span"
                                                            animation="border"
                                                            size="sm"
                                                            role="status"
                                                            aria-hidden={true}
                                                        />
                        
                                                        : ""
                                                    }
                                                    {formData.id && !isProcessing ? "Update" : !isProcessing ? "Create" : ""}
                        
                                                </Button>

                        */}
                        <button className="btn-close" onClick={handleClose} aria-label="Close"></button>
                    </div>
                </div>
            </Modal.Header>


            <Modal.Body>
                <div ref={printAreaRef} className="print-area" id="print-area">
                    {!model.store?.settings?.show_seller_info_in_invoice && <PreviewContent
                        model={model}
                        invoiceBackground={InvoiceBackground}
                        whatsAppShare={whatsAppShare}
                        modelName={modelName}
                        selectText={selectText}
                        selectQRCode={selectQRCode}
                        fontSizes={fontSizes} />}
                    {model.store?.settings?.show_seller_info_in_invoice && <PreviewContentWithSellerInfo
                        model={model}
                        invoiceBackground={InvoiceBackground}
                        whatsAppShare={whatsAppShare}
                        modelName={modelName}
                        selectText={selectText}
                        selectQRCode={selectQRCode}
                        fontSizes={fontSizes} />}
                </div>
            </Modal.Body>
            <Modal.Footer>
            </Modal.Footer>
        </Modal >
    </>);

});

export default Preview;