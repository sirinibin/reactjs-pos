import { React, useState, useRef, forwardRef, useImperativeHandle, useMemo, useCallback, useEffect } from "react";
import { Modal, Button } from 'react-bootstrap';
import OrderPrintContent from './printContent.js';
import OrderPrintContent2 from './printContent2.js';
import OrderPrintContent3 from './printContent3.js';

import { useReactToPrint } from 'react-to-print';
import { Invoice } from '@axenda/zatca';
//import { format } from "date-fns";

const OrderPrint = forwardRef((props, ref) => {
    // let [InvoiceBackground, setInvoiceBackground] = useState("");
    useImperativeHandle(ref, () => ({
        async open(modelObj, modelNameStr) {
            if (modelNameStr) {
                modelName = modelNameStr;
                setModelName(modelName);
            }


            if (modelObj) {
                model = modelObj;

                if (model.id) {
                    await getModel(model.id, modelName);
                }
                /*
                if (modelObj.id) {
                    await getOrder(modelObj.id);
                }*/

                if (model.store_id) {
                    await getStore(model.store_id);
                }

                if (model.customer_id) {
                    getCustomer(model.customer_id);
                }

                setInvoiceTitle(modelName);


                if (modelName === "sales_return" || modelName === "whatsapp_sales_return" || modelName === "purchase_return" || modelName === "whatsapp_purchase_return" || modelName === "quotation_sales_return" || modelName === "whatsapp_quotation_sales_return") {
                    model.products = model.products?.filter(product => product.selected);
                }


                if (model.store?.code === "PH2" || model.store?.code === "LGK-SIMULATION" || model.store?.code === "LGK") {
                    preparePages();
                } else if (model.store?.code === "YNB" || model.store?.code === "YNB-SIMULATION") {
                    preparePages();
                } else {
                    //  preparePages();

                    if (model.delivered_by) {
                        getUser(model.delivered_by);
                    }

                    let pageSize = 15;

                    model.pageSize = pageSize;
                    let totalProducts = model.products?.length;
                    let top = 0;
                    let totalPagesInt = parseInt(totalProducts / pageSize);
                    let totalPagesFloat = parseFloat(totalProducts / pageSize);

                    let totalPages = totalPagesInt;
                    if ((totalPagesFloat - totalPagesInt) > 0) {
                        totalPages++;
                    }

                    model.total_pages = totalPages;


                    model.pages = [];

                    let offset = 0;

                    for (let i = 0; i < totalPages; i++) {
                        model.pages.push({
                            top: top,
                            products: [],
                            lastPage: false,
                        });

                        for (let j = offset; j < totalProducts; j++) {
                            model.pages[i].products.push(model.products[j]);

                            if (model.pages[i].products.length === pageSize) {
                                break;
                            }
                        }

                        if (totalPages > 1) {
                            top += 994;
                        }

                        //top += 1122;
                        offset += pageSize;
                        if ((i + 1) === totalPages) {
                            model.pages[i].lastPage = true;
                        }
                    }

                    console.log("model.pages:", model.pages);

                    console.log("model.products:", model.products);
                    getQRCodeContents();
                    //model.qr_content = getQRCodeContents();
                    //setModel({ ...model });

                    setShow(true);
                    console.log("model:", model);
                }
            }

        },

    }));

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

    function preparePages() {
        if (fontSizes[modelName + "_printPageSize"]) {
            model.pageSize = fontSizes[modelName + "_printPageSize"];
        } else {
            model.pageSize = 11
        }
        let totalProducts = model.products?.length;
        let top = 10;
        let totalPagesInt = parseInt(totalProducts / model.pageSize);
        let totalPagesFloat = parseFloat(totalProducts / model.pageSize);

        let totalPages = totalPagesInt;
        if ((totalPagesFloat - totalPagesInt) > 0) {
            totalPages++;
        }

        model.total_pages = totalPages;


        model.pages = [];

        let offset = 0;

        for (let i = 0; i < totalPages; i++) {
            model.pages.push({
                top: top,
                products: [],
                lastPage: false,
            });

            for (let j = offset; j < totalProducts; j++) {
                model.pages[i].products.push(model.products[j]);

                if (model.pages[i].products.length === model.pageSize) {
                    break;
                }
            }

            if (totalPages > 1) {
                top += 1058;
            }

            //top += 1122;
            offset += model.pageSize;
            if ((i + 1) === totalPages) {
                model.pages[i].lastPage = true;
            }
        }

        console.log("model.pages:", model.pages);

        console.log("model.products:", model.products);
        getQRCodeContents();
        //model.qr_content = getQRCodeContents();
        //setModel({ ...model });

        setShow(true);
        console.log("model:", model);
    }





    function setInvoiceTitle(modelName) {
        model.modelName = modelName;

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
    /*

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
        }

        if (model.modelName === "sales" || model.modelName === "whatsapp_sales") {
            if (model.store?.zatca?.phase === "1") {
                if (model.payment_status !== "not_paid") {
                    model.invoiceTitle = "TAX INVOICE | الفاتورة الضريبية";
                    if (IsCashOnly) {
                        model.invoiceTitle = "CASH TAX INVOICE | فاتورة ضريبية نقدية";
                    }
                } else if (model.payment_status === "not_paid") {
                    model.invoiceTitle = "CREDIT TAX INVOICE | فاتورة ضريبة الائتمان";
                }
            } else if (model.store?.zatca?.phase === "2") {
                if (isSimplified) {
                    if (model.payment_status === "not_paid") {
                        model.invoiceTitle = "SIMPLIFIED CREDIT TAX INVOICE | فاتورة ضريبة الائتمان المبسطة";
                    } else {
                        model.invoiceTitle = "SIMPLIFIED TAX INVOICE | فاتورة ضريبية مبسطة";
                        if (IsCashOnly) {
                            model.invoiceTitle = "SIMPLIFIED CASH TAX INVOICE | فاتورة ضريبية نقدية مبسطة";
                        }
                    }
                } else {
                    if (model.payment_status === "not_paid") {
                        model.invoiceTitle = "STANDARD CREDIT TAX INVOICE | فاتورة ضريبة الائتمان القياسية";
                    } else {
                        model.invoiceTitle = "STANDARD TAX INVOICE | فاتورة ضريبية قياسية";
                        if (IsCashOnly) {
                            model.invoiceTitle = "STANDARD CASH TAX INVOICE | فاتورة ضريبية نقدية قياسية";
                        }
                    }
                }
            }
        } else if (model.modelName === "sales_return" || model.modelName === "whatsapp_sales_return") {
            if (model.store?.zatca?.phase === "1") {
                model.invoiceTitle = "SALES RETURN TAX INVOICE | فاتورة ضريبة المبيعات المرتجعة";
                if (IsCashOnly) {
                    model.invoiceTitle = "SALES RETURN CASH TAX INVOICE | إقرار مبيعات فاتورة ضريبية نقدية";
                }
            } else if (model.store?.zatca?.phase === "2") {
                if (isSimplified) {
                    model.invoiceTitle = "SIMPLIFIED CREDIT NOTE RETURN TAX INVOICE | إقرار ضريبي مبسط لإقرار إقرار ائتماني";
                    if (IsCashOnly) {
                        model.invoiceTitle = "SIMPLIFIED CREDIT NOTE CASH RETURN TAX INVOICE | مذكرة ائتمان مبسطة، إقرار نقدي، فاتورة ضريبية";
                    }
                } else {
                    model.invoiceTitle = "STANDARD CREDIT NOTE RETURN TAX INVOICE | إقرار ضريبي قياسي لإرجاع فاتورة الائتمان";
                    if (IsCashOnly) {
                        model.invoiceTitle = "STANDARD CREDIT NOTE CASH RETURN TAX INVOICE | سند ائتمان قياسي، إقرار نقدي، فاتورة ضريبية";
                    }
                }
            }
        } else if (model.modelName === "purchase" || model.modelName === "whatsapp_purchase") {
            if (model.payment_status === "not_paid") {
                model.invoiceTitle = "CREDIT PURCHASE TAX INVOICE | فاتورة ضريبة الشراء بالائتمان";
            } else {
                model.invoiceTitle = "PURCHASE TAX INVOICE | فاتورة ضريبة الشراء";
                if (IsCashOnly) {
                    model.invoiceTitle = "CASH PURCHASE TAX INVOICE | فاتورة ضريبة الشراء النقدي";
                }
            }
        } else if (model.modelName === "purchase_return" || model.modelName === "whatsapp_purchase_return") {
            if (model.payment_status === "not_paid") {
                model.invoiceTitle = "CREDIT PURCHASE RETURN TAX INVOICE | فاتورة ضريبة إرجاع الشراء بالائتمان";
            } else {
                model.invoiceTitle = "PURCHASE RETURN TAX INVOICE | فاتورة ضريبة إرجاع المشتريات";
                if (IsCashOnly) {
                    model.invoiceTitle = "CASH PURCHASE RETURN TAX INVOICE | فاتورة ضريبة إرجاع الشراء النقدي";
                }
            }
        } else if (model.modelName === "quotation" || model.modelName === "whatsapp_quotation") {
            model.invoiceTitle = "QUOTATION / اقتباس";

            if (model.type === "invoice" && model.payment_status === "not_paid") {
                model.invoiceTitle = "CREDIT INVOICE | فاتورة ائتمانية";
            } else if (model.type === "invoice") {
                model.invoiceTitle = "INVOICE | فاتورة";
            }
        } else if (model.modelName === "quotation_sales_return" || model.modelName === "whatsapp_quotation_sales_return") {
            if (model.payment_status === "not_paid") {
                model.invoiceTitle = "CREDIT RETURN INVOICE | فاتورة إرجاع الائتمان";
            } else {
                model.invoiceTitle = "RETURN INVOICE | فاتورة الإرجاع";
            }
        } else if (model.modelName === "delivery_note" || model.modelName === "whatsapp_delivery_note") {
            model.invoiceTitle = "DELIVERY NOTE / مذكرة تسليم";
        }

        setModel({ ...model });
    }*/

    let [modelName, setModelName] = useState("sales");

    /*
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
    
                    model = data.result;
                    setModel({ ...model });
    
                    return model;
                })
                .catch(error => {
    
                });
        }*/



    let [model, setModel] = useState({});

    const [show, setShow] = useState(props.show);

    const handleClose = useCallback(() => {
        if (props.onPrintClose) {
            props.onPrintClose();
        }
        setShow(false);
    }, [props]);


    let [qrContent, setQrContent] = useState("");

    function getQRCodeContents() {
        qrContent = "";

        if (model.code) {
            qrContent += "Sales Invoice #: " + model.code + "<br />";
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

                //var d = new Date(model.date);
                //console.log("d:", d);


                /*let d2 = format(
                    new Date(d),
                    "yyyy-MM-dd h:m:mma"
                );*/
                // alert(d);
                //alert(model.date)
                // console.log("d2:", d2);
                // alert(d2)
                //alert(toLocalIsoNoOffset(model.date))
                const invoice = new Invoice({
                    sellerName: model.store_name,
                    vatRegistrationNumber: model.store.vat_no,
                    invoiceTimestamp: toLocalIsoNoOffset(model.date),
                    invoiceTotal: model.net_total.toString(),
                    invoiceVatTotal: model.vat_price.toString(),
                    //uuid: model.uuid,
                    // hash: model.hash ? model.hash : "",
                });

                model.QRImageData = await invoice.render();
                console.log("model.QRImageData:", model.QRImageData);

                setModel({ ...model });
            })
            .catch(error => {

            });
    }


    function ObjectToSearchQueryParams(object) {
        return Object.keys(object)
            .map(function (key) {
                return `search[${key}]=${object[key]}`;
            })
            .join("&");
    }


    function toLocalIsoNoOffset(dateInput) {
        const d = dateInput ? new Date(dateInput) : new Date();
        if (isNaN(d.getTime())) return "";

        const pad = (n, l = 2) => String(n).padStart(l, "0");

        const yyyy = d.getFullYear();
        const MM = pad(d.getMonth() + 1);
        const dd = pad(d.getDate());
        const hh = pad(d.getHours());
        const mm = pad(d.getMinutes());
        const ss = pad(d.getSeconds());

        return `${yyyy}-${MM}-${dd}T${hh}:${mm}:${ss}`;
    }


    function getCustomer(id) {
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

        fetch('/v1/customer/' + id + "?" + queryParams, requestOptions)
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
                let customerData = data.result;
                model.customer = customerData;
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

    /*
    function print() {
        console.log("Print");
    }
    */

    const printAreaRef = useRef();

    function getFileName() {
        let filename = "Sales_Invoice";

        if (model.id) {
            filename += "_#" + model.code;
        }

        return filename;
    }

    /*
    const handlePrint = useReactToPrint({
        content: () => printAreaRef.current,
        documentTitle: getFileName(),
        onAfterPrint: () => {
            handleClose();
        }
    });*/

    const handlePrint = useReactToPrint({
        content: () => printAreaRef.current,
        documentTitle: getFileName(),
        onBeforeGetContent: () => {
            const style = document.createElement("style");
            style.innerHTML = `
                @media print {
                    @page { margin: 0; }
                    body { margin: 0; }
                }
            `;
            document.head.appendChild(style);
        },
        onAfterPrint: () => {
            handleClose();
        },
    });

    const defaultFontSizes = useMemo(() => ({
        "printQrCode": {
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
        "printPageSize": 11,
        "printFont": "Cairo",
        "printReportPageSize": 20,
        "printMarginTop": {
            "value": 0,
            "unit": "px",
            "size": "0px",
            "step": 3
        },
        "printStoreHeader": {
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


    const getFromLocalStorage = useCallback((key) => {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : null;
    }, []);

    const saveToLocalStorage = useCallback((key, obj) => {
        localStorage.setItem(key, JSON.stringify(obj));
    }, []);

    function changePageSize(size) {
        fontSizes[modelName + "_printPageSize"] = parseInt(size);
        setFontSizes({ ...fontSizes });
        saveToLocalStorage("printFontSizes", fontSizes);
        preparePages();
    }
    let [fontSizes, setFontSizes] = useState(defaultFontSizes);

    useEffect(() => {
        let storedFontSizes = getFromLocalStorage("printFontSizes");
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
        saveToLocalStorage("printFontSizes", storedFontSizes);
    }, [setFontSizes, defaultFontSizes, saveToLocalStorage, getFromLocalStorage]);

    // Wrap handlePrint in useCallback to avoid unnecessary re-creations
    /*
    const autoPrint = useCallback(() => {
        handlePrint();
    }, [handlePrint]);
    */


    /*  useEffect(() => {
          // Automatically trigger print when component is mounted
          setTimeout(() => {
              autoPrint();
          }, 500);
      }, [autoPrint]);*/


    useEffect(() => {
        const handleEnterKey = (event) => {
            const tag = event.target.tagName.toLowerCase();
            const isInput = tag === 'input' || tag === 'textarea' || event.target.isContentEditable;

            if (!show) {
                return;
            }

            if (event.key === 'Enter' && !isInput) {
                handlePrint();
            }
        };

        document.addEventListener('keydown', handleEnterKey);
        return () => {
            document.removeEventListener('keydown', handleEnterKey);
        };
    }, [handlePrint, show]); // no dependencies

    return (<>
        <Modal show={show} scrollable={true} size="xl" fullscreen={model.store?.code === "PH2" || model.store?.code === "LGK-SIMULATION" || model.store?.code === "LGK"} onHide={handleClose} animation={false} style={{ overflowY: "auto", height: "auto" }}>
            <Modal.Header className="d-flex flex-wrap align-items-center justify-content-between">
                <Modal.Title>Invoice Preview</Modal.Title>
                <div className="row" style={{ border: "solid 0px" }}>
                    <div className="col align-self-end text-end" style={{ border: "solid 0px", minWidth: "200px" }}>
                        <>
                            <label className="form-label">Page Size:&nbsp;</label>
                            <select
                                value={fontSizes[modelName + "_printPageSize"]}
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

                    <div className="col align-self-end text-end" style={{ border: "solid 0px", minWidth: "100px" }}>
                        <Button variant="primary" className="btn btn-primary mb-3" onClick={handlePrint}>
                            <i className="bi bi-printer"></i> Print
                        </Button>
                        <button
                            type="button"
                            className="btn-close"
                            onClick={handleClose}
                            aria-label="Close"
                        ></button>

                    </div>
                </div>

            </Modal.Header>
            <Modal.Body>
                <div ref={printAreaRef} >
                    {(model.store?.code === "GUOJ" || model.store?.code === "UMLJ") && <OrderPrintContent
                        model={model}
                    />}
                    {(model.store?.code === "PH2" || model.store?.code === "LGK-SIMULATION" || model.store?.code === "LGK") && <OrderPrintContent2
                        model={model}

                    />}
                    {(model.store?.code === "YNB-SIMULATION" || model.store?.code === "YNB") && <OrderPrintContent3
                        model={model}
                    />}
                </div>
            </Modal.Body>
            <Modal.Footer>
                {/*
                <Button variant="secondary" onClick={handleClose}>
                    Close
                </Button>
                <Button variant="primary" onClick={handleClose}>
                    Save Changes
                </Button>
                */}
            </Modal.Footer>
        </Modal>
    </>);

});

export default OrderPrint;