import { React, useState, useRef, forwardRef, useImperativeHandle, useCallback, useMemo, useEffect } from "react";
import { Modal, Button, Spinner } from 'react-bootstrap';
import CustomerDepositPreviewContent from './previewContent.js';

import { Invoice } from '@axenda/zatca';
import html2pdf from 'html2pdf.js';
import WhatsAppModal from './../utils/WhatsAppModal';


const CustomerDepositPreview = forwardRef((props, ref) => {

    function ObjectToSearchQueryParams(object) {
        return Object.keys(object)
            .map(function (key) {
                return `search[${key}]=${object[key]}`;
            })
            .join("&");
    }

    let [whatsAppShare, setWhatsAppShare] = useState(false);
    let [phone, setPhone] = useState("");
    let [modelName, setModelName] = useState("customer_deposit");

    useImperativeHandle(ref, () => ({
        open(modelObj, whatsapp, modelNameStr) {
            modelName = modelNameStr;
            setModelName(modelName);


            if (modelObj) {
                model = modelObj;
                setModel({ ...model })

                if (model.phone) {
                    phone = model.phone;
                }
                setPhone(phone);


                if (whatsapp) {
                    whatsAppShare = true;
                    setWhatsAppShare(whatsAppShare)
                } else {
                    whatsAppShare = false;
                    setWhatsAppShare(whatsAppShare)
                }


                if (localStorage.getItem("store_id")) {
                    getStore(localStorage.getItem("store_id"));
                }

                if (model.customer_id) {
                    getCustomer(model.customer_id);
                }

                setReceiptTitle(modelName);
                preparePages();

                setShow(true);
                console.log("model:", model);
            }

        },

    }));



    let [model, setModel] = useState({});

    const [show, setShow] = useState(props.show);

    function handleClose() {
        setShow(false);
    }


    function getStore(id) {
        console.log("inside get Store");
        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': localStorage.getItem('access_token'),
            },
        };

        fetch('/v1/store/' + id, requestOptions)
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
    /*
    function print() {
        console.log("Print");
    }
    */

    const printAreaRef = useRef();

    const getFileName = useCallback(() => {
        let filename = "";
        console.log("modelName inside getFileName:", modelName);

        if (modelName === "customer_deposit") {
            filename = "Receipt_receivable";
        } else if (modelName === "customer_withdrawal") {
            filename = "Receipt_payable";
        }

        if (model.id) {
            filename += "_" + model.code;
        }

        return filename;
    }, [model, modelName])

    /*
    const handlePrint = useReactToPrint({
        content: () => printAreaRef.current,
        documentTitle: getFileName(),
        onAfterPrint: () => {
            handleClose();
        }
    });*/

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


    // Wrap handlePrint in useCallback to avoid unnecessary re-creations
    /*
    const autoPrint = useCallback(() => {
        handlePrint();
    }, [handlePrint]);
    */


    /*
    useEffect(() => {
        // Automatically trigger print when component is mounted
        setTimeout(() => {
            autoPrint();
        }, 500);
    }, [autoPrint]);*/


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

    const openWhatsAppShare = useCallback(async () => {
        setIsProcessing(true);
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

        let message = `Hello, Here is your receipt:\n${window.location.origin}/pdfs/${getFileName()}.pdf`;


        if (timerRef.current) clearTimeout(timerRef.current);

        timerRef.current = setTimeout(() => {
            setIsProcessing(false);
            whatsAppNo = formatPhoneForWhatsApp(whatsAppNo);
            setDefaultMessage(message);
            setDefaultNumber(whatsAppNo);
            setShowWhatsAppMessageModal(true);
        }, 100);





    }, [getFileName, model, formatPhoneForWhatsApp, phone]);


    function setReceiptTitle(modelName) {
        model.modelName = modelName;
        console.log("model:", model);
        if (model.modelName === "customer_deposit") {
            model.ReceiptTitle = "PAYMENT RECEIPT (RECEIVABLE) | إيصال الدفع (مستحق القبض)";
        } else if (model.modelName === "customer_withdrawal") {
            model.ReceiptTitle = "  PAYMENT RECEIPT (PAYABLE / REFUND) | إيصال الدفع (مستحق الدفع / مسترد)";
        }

        setModel({ ...model });
    }

    const [showSlider, setShowSlider] = useState(false);
    let [selectedText, setSelectedText] = useState("");

    const defaultFontSizes = useMemo(() => ({
        "pageSize": 15,
        "reportPageSize": 20,
        "font": "Cairo",
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
        if (str === "customer_deposit") {
            return "Customer Receivable"
        } else if (str === "customer_withdrawal") {
            return "Customer Payable"
        }
        return str
            .replace(/_/g, ' ')                   // Replace _ with space
            .split(' ')                            // Split by spaces
            .map(word =>
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() // Capitalize
            )
            .join(' ');                            // Join words back with space
    }


    const selectText = (name) => {
        selectedText = name;
        setSelectedText(name);
        if (!fontSizes[modelName + "_" + selectedText]) {
            fontSizes[modelName + "_" + selectedText] = defaultFontSizes[selectedText];
        }
        setShowSlider(true);
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

        let modelNames = ["customer_deposit", "customer_withdrawal"];
        for (let key1 in modelNames) {
            for (let key2 in defaultFontSizes) {
                if (!storedFontSizes[modelNames[key1] + "_" + key2]) {
                    storedFontSizes[modelNames[key1] + "_" + key2] = defaultFontSizes[key2];
                }
            }
        }

        setFontSizes({ ...storedFontSizes });
        saveToLocalStorage("fontSizes", storedFontSizes);


    }, [setFontSizes, modelName, defaultFontSizes, saveToLocalStorage, getFromLocalStorage]);


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


    const handleFontChange = (e) => {
        // setSelectedFont(e.target.value);
        fontSizes[modelName + "_font"] = e.target.value;
        setFontSizes({ ...fontSizes })
        saveToLocalStorage("fontSizes", fontSizes);
    };

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

        let totalPayments = model.payments.length;
        // let top = 0;
        let totalPagesInt = parseInt(totalPayments / model.pageSize);
        let totalPagesFloat = parseFloat(totalPayments / model.pageSize);

        let totalPages = totalPagesInt;
        if ((totalPagesFloat - totalPagesInt) > 0) {
            totalPages++;
        }

        model.total_pages = totalPages;


        model.pages = [];


        let offset = 0;

        for (let i = 0; i < totalPages; i++) {
            model.pages.push({
                top: 0,
                payments: [],
                lastPage: false,
                firstPage: false,
            });

            for (let j = offset; j < totalPayments; j++) {
                model.pages[i].payments.push(model.payments[j]);
                if (model.pages[i].payments.length === model.pageSize) {
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
    }


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

                    <label htmlFor="font-select">Select Font: </label>
                    <select id="font-select" value={fontSizes[modelName + "_font"]} onChange={handleFontChange}>
                        {fonts.map((font) => (
                            <option key={font.value} value={font.value}>
                                {font.label}
                            </option>
                        ))}
                    </select>

                    {/* Show Store Header - Always fixed here */}
                    {!whatsAppShare && <div className="form-check">
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
                    </div>}

                    {/* Margin Control */}

                    {!whatsAppShare && <div className="d-flex align-items-center border rounded bg-light p-2" style={{ marginRight: "200px" }} >
                        <button className="btn btn-outline-secondary" onClick={() => decrementSize(modelName + "_marginTop")}>−</button>
                        <span className="mx-2">Margin Top: {fontSizes[modelName + "_marginTop"]?.size}</span>
                        <button className="btn btn-outline-secondary" onClick={() => incrementSize(modelName + "_marginTop")}>+</button>
                    </div>}

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
                                <option value="2">2</option>
                                <option value="3">3</option>
                                <option value="4">4</option>
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
                                <option value="17">17</option>
                                <option value="18">18</option>
                                <option value="19">19</option>
                                <option value="20">20</option>
                                <option value="21">21</option>
                                <option value="22">22</option>
                                <option value="23">23</option>
                            </select>
                        </>
                    </div>


                    <div className="col align-self-end text-end">
                        <Button variant="primary" className={`btn ${whatsAppShare ? "btn-success" : "btn-primary"}`} onClick={whatsAppShare ? openWhatsAppShare : handlePrint}>

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
                                {!whatsAppShare && <><i className="bi bi-printer"></i> Print</>}
                                {whatsAppShare && <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="white" viewBox="0 0 16 16">
                                    <path d="M13.601 2.326A7.875 7.875 0 0 0 8.036 0C3.596 0 0 3.597 0 8.036c0 1.417.37 2.805 1.07 4.03L0 16l3.993-1.05a7.968 7.968 0 0 0 4.043 1.085h.003c4.44 0 8.036-3.596 8.036-8.036 0-2.147-.836-4.166-2.37-5.673ZM8.036 14.6a6.584 6.584 0 0 1-3.35-.92l-.24-.142-2.37.622.63-2.31-.155-.238a6.587 6.587 0 0 1-1.018-3.513c0-3.637 2.96-6.6 6.6-6.6 1.764 0 3.42.69 4.67 1.94a6.56 6.56 0 0 1 1.93 4.668c0 3.637-2.96 6.6-6.6 6.6Zm3.61-4.885c-.198-.1-1.17-.578-1.352-.644-.18-.066-.312-.1-.444.1-.13.197-.51.644-.626.775-.115.13-.23.15-.428.05-.198-.1-.837-.308-1.594-.983-.59-.525-.99-1.174-1.11-1.372-.116-.198-.012-.305.088-.403.09-.09.198-.23.298-.345.1-.115.132-.197.2-.33.065-.13.032-.247-.017-.345-.05-.1-.444-1.07-.61-1.46-.16-.384-.323-.332-.444-.338l-.378-.007c-.13 0-.344.048-.525.23s-.688.672-.688 1.64c0 .967.704 1.9.802 2.03.1.13 1.386 2.116 3.365 2.963.47.203.837.324 1.122.414.472.15.902.13 1.24.08.378-.057 1.17-.48 1.336-.942.165-.462.165-.858.116-.943-.048-.084-.18-.132-.378-.23Z" />
                                </svg>}
                            </>}
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
                <div ref={printAreaRef}>
                    <CustomerDepositPreviewContent model={model} modelName={modelName} whatsAppShare={whatsAppShare} selectText={selectText} fontSizes={fontSizes} />
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

export default CustomerDepositPreview;