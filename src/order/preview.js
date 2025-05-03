import { React, useState, useRef, forwardRef, useImperativeHandle, useEffect, useCallback, useMemo } from "react";
import { Modal, Button } from 'react-bootstrap';
import PreviewContent from './previewContent.js';

//import { useReactToPrint } from 'react-to-print';
import { Invoice } from '@axenda/zatca';
import html2pdf from 'html2pdf.js';
import "./print.css";


const Preview = forwardRef((props, ref) => {

    function ObjectToSearchQueryParams(object) {
        return Object.keys(object)
            .map(function (key) {
                return `search[${key}]=${object[key]}`;
            })
            .join("&");
    }
    let [whatsAppShare, setWhatsAppShare] = useState(false);
    let [phone, setPhone] = useState("");

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

        if (model.modelName === "sales" || model.modelName === "sales_return") {
            if (model.customer?.vat_no) {
                isSimplified = false;
            } else {
                isSimplified = true;
            }
        }

        if (model.modelName === "sales") {
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
        } else if (model.modelName === "sales_return") {
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
        } else if (model.modelName === "purchase") {
            if (model.payment_status === "not_paid") {
                model.invoiceTitle = "CREDIT PURCHASE TAX INVOICE | فاتورة ضريبة الشراء بالائتمان";
            } else {
                model.invoiceTitle = "PURCHASE TAX INVOICE | فاتورة ضريبة الشراء";
                if (IsCashOnly) {
                    model.invoiceTitle = "CASH PURCHASE TAX INVOICE | فاتورة ضريبة الشراء النقدي";
                }
            }
        } else if (model.modelName === "purchase_return") {
            if (model.payment_status === "not_paid") {
                model.invoiceTitle = "CREDIT PURCHASE RETURN TAX INVOICE | فاتورة ضريبة إرجاع الشراء بالائتمان";
            } else {
                model.invoiceTitle = "PURCHASE RETURN TAX INVOICE | فاتورة ضريبة إرجاع المشتريات";
                if (IsCashOnly) {
                    model.invoiceTitle = "CASH PURCHASE RETURN TAX INVOICE | فاتورة ضريبة إرجاع الشراء النقدي";
                }
            }
        } else if (model.modelName === "quotation") {
            model.invoiceTitle = "QUOTATION / اقتباس";

            if (model.type === "invoice" && model.payment_status === "credit") {
                model.invoiceTitle = "CREDIT TAX INVOICE | فاتورة ضريبة الائتمان";

            } else if (model.type === "invoice" && model.payment_status === "paid") {
                model.invoiceTitle = "TAX INVOICE | الفاتورة الضريبية";
            }
        } else if (model.modelName === "delivery_note") {
            model.invoiceTitle = "DELIVERY NOTE / مذكرة تسليم";
        }

        setModel({ ...model });
    }

    let [modelName, setModelName] = useState("sales");

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
                }
                setPhone(phone);

                setModel({ ...model })
                if (model.id) {
                    await getModel(model.id, modelName);
                }

                if (model.order_id) {
                    await getOrder(model.order_id);
                }

                if (model.store_id) {
                    await getStore(model.store_id);
                }

                if (model.customer_id) {
                    await getCustomer(model.customer_id);
                }

                if (model.vendor_id) {
                    await getVendor(model.vendor_id);
                }

                setInvoiceTitle(modelName);

                if (model.delivered_by) {
                    getUser(model.delivered_by);
                }

                if (model.delivered_by_signature_id) {
                    getSignature(model.delivered_by_signature_id);
                }



                let pageSize = 20;
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

                    if (model.pages[i].products.length < pageSize) {
                        for (let s = model.pages[i].products.length; s < pageSize; s++) {
                            model.pages[i].products.push({});
                        }
                    }

                    top += 1057; //1057
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
                //model.qr_content = getQRCodeContents();
                //setModel({ ...model });

                setShow(true);
                console.log("model:", model);
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
        if (modelName && modelName === "sales") {
            apiPath = "order"
        } else if (modelName && modelName === "sales_return") {
            apiPath = "sales-return"
        } else if (modelName && modelName === "purchase") {
            apiPath = "purchase"
        } else if (modelName && modelName === "purchase_return") {
            apiPath = "purchase-return"
        } else if (modelName && modelName === "quotation") {
            apiPath = "quotation"
        } else if (modelName && modelName === "delivery_note") {
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
        let filename = "";

        if (modelName === "sales") {
            filename = "Sales";
        } else if (modelName === "sales_return") {
            filename = "Sales_Return";
        } else if (modelName === "purchase") {
            filename = "Purchase";
        } else if (modelName === "purchase_return") {
            filename = "Purchase_Return";
        } else if (modelName === "quotation") {
            filename = "Quotation";
        } else if (modelName === "delivery_note") {
            filename = "Delivery_Note";
        }

        if (model.code) {
            filename += "-" + model.code;
        }

        return filename;
    }, [model, modelName])

    const handlePrint = useCallback(() => {
        const element = printAreaRef.current;
        if (!element) return;

        html2pdf().from(element).set({
            margin: 0,
            filename: `${getFileName()}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        }).outputPdf('bloburl').then(blobUrl => {
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
    }, [getFileName]);*/
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


    // Wrap handlePrint in useCallback to avoid unnecessary re-creations
    const autoPrint = useCallback(() => {
        handlePrint();
    }, [handlePrint]);

    const formatPhoneForWhatsApp = useCallback((number) => {
        // Step 1: Remove all non-digit characters
        number = number.replace(/\D/g, '');

        // Step 2: Replace starting 05 with 9665
        if (number.startsWith('05')) {
            number = '966' + number.slice(1);
        }

        return number;
    }, [])

    const openWhatsAppShare = useCallback(async () => {
        console.log("Inside openWhatsAppShare")
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


        if (!whatsAppNo) {
            whatsAppNo = prompt("Enter the WhatsApp number (with country code, e.g., 9665xxxxxxxx):");

            if (!whatsAppNo) {
                // User cancelled or entered nothing
                alert("No number entered. Cannot send message.");
                handleClose();
                return;
            }
        }



        whatsAppNo = formatPhoneForWhatsApp(whatsAppNo);

        console.log(" whatsAppNo:", whatsAppNo);
        const message = `Hello, here is your invoice:\n${window.location.origin}/pdfs/${getFileName()}.pdf`;
        const whatsappUrl = `https://wa.me/${whatsAppNo}?text=${encodeURIComponent(message)}`;

        window.open(whatsappUrl, "_blank");
        handleClose();

    }, [getFileName, model, formatPhoneForWhatsApp, phone]);


    useEffect(() => {
        // Automatically trigger print when component is mounted
        console.log("whatsAppShare:", whatsAppShare);
        const timeout = setTimeout(() => {
            if (whatsAppShare) {
                // openWhatsAppShare();
            } else {
                // autoPrint();
            }
        }, 800); // give some buffer for content to render

        return () => clearTimeout(timeout); // clean up

    }, [autoPrint, whatsAppShare, openWhatsAppShare]);

    const [showSlider, setShowSlider] = useState(false);
    let [selectedText, setSelectedText] = useState("");

    const defaultFontSizes = useMemo(() => ({
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

    const saveToLocalStorage = (key, obj) => {
        localStorage.setItem(key, JSON.stringify(obj));
    };

    const getFromLocalStorage = (key) => {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : null;
    };


    let [fontSizes, setFontSizes] = useState(defaultFontSizes);

    useEffect(() => {
        let storedFontSizes = getFromLocalStorage("fontSizes");
        if (storedFontSizes) {
            setFontSizes({ ...storedFontSizes });
        } else {
            storedFontSizes = {};
        }

        let modelNames = ["sales", "sales_return", "purchase", "purchase_return", "quotation", "delivery_note"];
        for (let key1 in modelNames) {
            for (let key2 in defaultFontSizes) {
                if (!storedFontSizes[modelNames[key1] + "_" + key2]) {
                    storedFontSizes[modelNames[key1] + "_" + key2] = defaultFontSizes[key2];
                }
            }
        }

        setFontSizes({ ...storedFontSizes });


    }, [setFontSizes, modelName, defaultFontSizes]);


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

    return (<>
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


                    {/* Print & Close Buttons */}
                    <div className="d-flex align-items-center">
                        <Button
                            variant={whatsAppShare ? "success" : "primary"}
                            onClick={whatsAppShare ? openWhatsAppShare : handlePrint}
                            className="me-2"
                        >
                            {!whatsAppShare ? (
                                <>
                                    <i className="bi bi-printer"></i> Print
                                </>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="white" viewBox="0 0 16 16">...</svg>
                            )}
                        </Button>
                        <button className="btn-close" onClick={handleClose} aria-label="Close"></button>
                    </div>
                </div>
            </Modal.Header>


            <Modal.Body>
                <div ref={printAreaRef} className="print-area" id="print-area">
                    <PreviewContent model={model} whatsAppShare={whatsAppShare} modelName={modelName} selectText={selectText} fontSizes={fontSizes} />
                </div>
            </Modal.Body>
            <Modal.Footer>
            </Modal.Footer>
        </Modal >
    </>);

});

export default Preview;