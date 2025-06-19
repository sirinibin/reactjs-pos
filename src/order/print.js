import { React, useState, useRef, forwardRef, useImperativeHandle } from "react";
import { Modal, Button } from 'react-bootstrap';
import OrderPrintContent from './printContent.js';
import OrderPrintContent2 from './printContent2.js';

import { useReactToPrint } from 'react-to-print';
import { Invoice } from '@axenda/zatca';
import { format } from "date-fns";
import LGKInvoiceBackground from './../INVOICE3.jpeg';

const OrderPrint = forwardRef((props, ref) => {
    let [InvoiceBackground, setInvoiceBackground] = useState("");
    useImperativeHandle(ref, () => ({
        async open(modelObj, modelNameStr) {
            if (modelNameStr) {
                modelName = modelNameStr;
                setModelName(modelName);
            }


            if (modelObj) {
                if (modelObj.id) {
                    await getOrder(modelObj.id);
                }

                if (model.store_id) {
                    await getStore(model.store_id);
                }

                if (model.customer_id) {
                    getCustomer(model.customer_id);
                }

                setInvoiceTitle(modelName);



                if (model.store?.code === "PH2") {
                    InvoiceBackground = LGKInvoiceBackground;
                    setInvoiceBackground(InvoiceBackground);
                }



                if (model.delivered_by) {
                    getUser(model.delivered_by);
                }


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

                    top += 1066;
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

        },

    }));


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
    }

    let [modelName, setModelName] = useState("sales");

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

                var d = new Date(model.date);
                console.log("d:", d);


                let d2 = format(
                    new Date(d),
                    "yyyy-MM-dd h:m:mma"
                );
                console.log("d2:", d2);
                const invoice = new Invoice({
                    sellerName: model.store_name,
                    vatRegistrationNumber: model.store.vat_no,
                    invoiceTimestamp: d2,
                    invoiceTotal: model.net_total,
                    invoiceVatTotal: model.vat_price,
                    uuid: model.uuid,
                    hash: model.hash ? model.hash : "",
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

    const handlePrint = useReactToPrint({
        content: () => printAreaRef.current,
        documentTitle: getFileName(),
        onAfterPrint: () => {
            handleClose();
        }
    });


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


    return (<>
        <Modal show={show} scrollable={true} size="xl" fullscreen={model.store?.code === "PH2"} onHide={handleClose} animation={false} style={{ overflowY: "auto", height: "auto" }}>
            <Modal.Header>
                <Modal.Title>Invoice Preview</Modal.Title>
                <div className="col align-self-end text-end">
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

            </Modal.Header>
            <Modal.Body>
                <div ref={printAreaRef} >
                    {model.store?.code === "GUOJ" && <OrderPrintContent
                        model={model}
                    />}
                    {model.store?.code === "PH2" && <OrderPrintContent2
                        model={model}
                        invoiceBackground={InvoiceBackground}
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