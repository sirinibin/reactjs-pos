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
        if (model.modelName === "sales") {
            if (model.store?.zatca?.phase === "1") {
                if (model.payment_status !== "not_paid") {
                    model.invoiceTitle = "TAX INVOICE | الفاتورة الضريبية";
                } else if (model.payment_status === "not_paid") {
                    model.invoiceTitle = "CREDIT TAX INVOICE | فاتورة ضريبة الائتمان";
                }
            } else if (model.store?.zatca?.phase === "2") {
                if (model.zatca?.is_simplified) {
                    if (model.payment_status === "not_paid") {
                        model.invoiceTitle = "SIMPLIFIED CREDIT TAX INVOICE | فاتورة ضريبة الائتمان المبسطة";
                    } else {
                        model.invoiceTitle = "SIMPLIFIED TAX INVOICE | فاتورة ضريبية مبسطة";
                    }

                } else if (!model.zatca?.is_simplified) {
                    if (model.payment_status === "not_paid") {
                        model.invoiceTitle = "STANDARD CREDIT TAX INVOICE | فاتورة ضريبة الائتمان القياسية";
                    } else {
                        model.invoiceTitle = "STANDARD TAX INVOICE | فاتورة ضريبية قياسية";
                    }

                }
            }
        } else if (model.modelName === "sales_return") {
            if (model.store?.zatca?.phase === "1") {
                model.invoiceTitle = "SALES RETURN TAX INVOICE | فاتورة ضريبة المبيعات المرتجعة";
            } else if (model.store?.zatca?.phase === "2") {
                if (model.zatca?.is_simplified) {
                    model.invoiceTitle = "SIMPLIFIED CREDIT NOTE TAX INVOICE | مذكرة ائتمان مبسطة، فاتورة ضريبية";
                } else if (!model.zatca?.is_simplified) {
                    model.invoiceTitle = "STANDARD CREDIT NOTE TAX INVOICE | مذكرة ائتمان قياسية، فاتورة ضريبية";
                }
            }
        } else if (model.modelName === "purchase") {
            if (model.store?.zatca?.phase === "1") {
                if (model.payment_status !== "not_paid") {
                    model.invoiceTitle = "PURCHASE TAX INVOICE | الفاتورة الضريبية";
                } else if (model.payment_status === "not_paid") {
                    model.invoiceTitle = "CREDIT PURCHASE TAX INVOICE | فاتورة ضريبة الائتمان";
                }
            } else if (model.store?.zatca?.phase === "2") {
                if (model.zatca?.is_simplified) {
                    model.invoiceTitle = "PURCHASE TAX INVOICE | فاتورة ضريبة الشراء";
                } else if (!model.zatca?.is_simplified) {
                    model.invoiceTitle = "PURCHASE TAX INVOICE | فاتورة ضريبة الشراء";
                }
            }
        } else if (model.modelName === "purchase_return") {
            if (model.store?.zatca?.phase === "1") {
                model.invoiceTitle = "PURCHASE RETURN TAX INVOICE | فاتورة ضريبة المبيعات المرتجعة";
            } else if (model.store?.zatca?.phase === "2") {
                if (model.zatca?.is_simplified) {
                    model.invoiceTitle = "PURCHASE RETURN TAX INVOICE | فاتورة ضريبة المبيعات المرتجعة";
                } else if (!model.zatca?.is_simplified) {
                    model.invoiceTitle = "PURCHASE RETURN TAX INVOICE | فاتورة ضريبة المبيعات المرتجعة";
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

                setInvoiceTitle(modelName);


                if (model.customer_id) {
                    getCustomer(model.customer_id);
                }

                if (model.vendor_id) {
                    getVendor(model.vendor_id);
                }

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

                console.log("Customer Response:");
                console.log(data);
                let customerData = data.result;
                model.customer = customerData;
                setModel({ ...model });
            })
            .catch(error => {

            });
    }

    function getVendor(id) {
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

        fetch('/v1/vendor/' + id + "?" + queryParams, requestOptions)
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

    /*
    const handleFontSizeChange = (e) => {
        console.log("selectedText:", selectedText);
        console.log("parseFloat(e.target.value):", parseFloat(e.target.value));
        if (selectedText) {
            fontSizes[selectedText].value = parseFloat(e.target.value);
            setFontSizes({ ...fontSizes });
        }
    };*/




    const defaultFontSizes = useMemo(() => ({
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
            let initFontSizes = {};
            let modelNames = ["sales", "sales_return", "purchase", "purchase_return", "quotation", "delivery_note"];
            for (let key1 in modelNames) {
                for (let key2 in defaultFontSizes) {
                    initFontSizes[modelNames[key1] + "_" + key2] = defaultFontSizes[key2];
                }
            }

            setFontSizes({ ...initFontSizes });
        }

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

    const decrement = () => {
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
            <Modal.Header>
                <Modal.Title>{formatModelName(modelName)} Preview</Modal.Title>
                {showSlider && (
                    <div
                        className="border rounded bg-light p-2"
                        style={{ maxWidth: '300px', marginLeft: '200px' }}
                    >


                        <div className="d-flex align-items-center">
                            {/* Range Input */}
                            <button className="btn btn-outline-secondary" onClick={decrement}>−</button>
                            &nbsp;Font Size:{fontSizes[modelName + "_" + selectedText]?.size}&nbsp;
                            {/*<input
                                type="range"
                                className="form-range me-2 flex-grow-1"
                                id="customRange"
                                min="0"
                                max="100"
                                step="0.1"
                                value={fontSizes[selectedText]?.value}
                                onChange={handleFontSizeChange}
                            />*/}

                            <button className="btn btn-outline-secondary" onClick={increment}>+</button>

                            {/* Close Button */}
                            <button
                                className="btn-close"
                                onClick={() => {
                                    setShowSlider(false);
                                }}
                            ></button>
                        </div>
                    </div>


                )}

                <div className="col align-self-end text-end">
                    <Button variant="primary" className={`btn ${whatsAppShare ? "btn-success" : "btn-primary"}`} onClick={whatsAppShare ? openWhatsAppShare : handlePrint}>
                        {!whatsAppShare && <><i className="bi bi-printer"></i> Print</>}
                        {whatsAppShare && <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="white" viewBox="0 0 16 16">
                            <path d="M13.601 2.326A7.875 7.875 0 0 0 8.036 0C3.596 0 0 3.597 0 8.036c0 1.417.37 2.805 1.07 4.03L0 16l3.993-1.05a7.968 7.968 0 0 0 4.043 1.085h.003c4.44 0 8.036-3.596 8.036-8.036 0-2.147-.836-4.166-2.37-5.673ZM8.036 14.6a6.584 6.584 0 0 1-3.35-.92l-.24-.142-2.37.622.63-2.31-.155-.238a6.587 6.587 0 0 1-1.018-3.513c0-3.637 2.96-6.6 6.6-6.6 1.764 0 3.42.69 4.67 1.94a6.56 6.56 0 0 1 1.93 4.668c0 3.637-2.96 6.6-6.6 6.6Zm3.61-4.885c-.198-.1-1.17-.578-1.352-.644-.18-.066-.312-.1-.444.1-.13.197-.51.644-.626.775-.115.13-.23.15-.428.05-.198-.1-.837-.308-1.594-.983-.59-.525-.99-1.174-1.11-1.372-.116-.198-.012-.305.088-.403.09-.09.198-.23.298-.345.1-.115.132-.197.2-.33.065-.13.032-.247-.017-.345-.05-.1-.444-1.07-.61-1.46-.16-.384-.323-.332-.444-.338l-.378-.007c-.13 0-.344.048-.525.23s-.688.672-.688 1.64c0 .967.704 1.9.802 2.03.1.13 1.386 2.116 3.365 2.963.47.203.837.324 1.122.414.472.15.902.13 1.24.08.378-.057 1.17-.48 1.336-.942.165-.462.165-.858.116-.943-.048-.084-.18-.132-.378-.23Z" />
                        </svg>}
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
                <div ref={printAreaRef} className="print-area" id="print-area">
                    <PreviewContent model={model} whatsAppShare={whatsAppShare} modelName={modelName} selectText={selectText} fontSizes={fontSizes} />
                </div>
            </Modal.Body>
            <Modal.Footer>
            </Modal.Footer>
        </Modal>
    </>);

});

export default Preview;