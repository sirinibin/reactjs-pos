import { React, useState, useRef, forwardRef, useImperativeHandle, useCallback, useMemo, useEffect } from "react";
import { Modal, Button } from 'react-bootstrap';
import BalanceSheetPrintPreviewContent from './printPreviewContent.js';
import { format } from "date-fns";
import html2pdf from 'html2pdf.js';

const BalanceSheetPrintPreview = forwardRef((props, ref) => {

    let [whatsAppShare, setWhatsAppShare] = useState(false);

    useImperativeHandle(ref, () => ({
        open(modelObj, whatsapp) {
            console.log("modelObj:", modelObj);
            if (whatsapp) {
                whatsAppShare = true;
                setWhatsAppShare(whatsAppShare)
            } else {
                whatsAppShare = false;
                setWhatsAppShare(whatsAppShare)
            }

            if (modelObj) {
                model = modelObj;
                setModel({ ...model })

                if (model.phone) {
                    phone = model.phone;
                }
                setPhone(phone);


                if (model.store_id) {
                    getStore(model.store_id);
                }

                if (model.reference_model === "customer" && model.reference_id) {
                    getCustomer(model.reference_id);
                }


                if (model.reference_model === "vendor" && model.reference_id) {
                    getVendor(model.reference_id);
                }

                /*
                if (model.created_by) {
                    getUser(model.created_by);
                }
                */

                /*
                if (model.reference_model==="customer") {
                    getCustomer(model.reference_id);
                }
                */

                /*
                if (model.delivered_by) {
                    getUser(model.delivered_by);
                }
                

                if (model.delivered_by_signature_id) {
                    getSignature(model.delivered_by_signature_id);
                }
                */

                preparePages();


                setShow(true);
            }

        },

    }));



    function preparePages() {
        if (fontSizes[modelName + "_balanceSheetpPageSize"]) {
            model.pageSize = fontSizes[modelName + "_balanceSheetpPageSize"];
        } else {
            model.pageSize = 20
        }

        let totalPosts = model.posts.length;
        let top = 0;
        let totalPagesInt = parseInt(totalPosts / model.pageSize);
        let totalPagesFloat = parseFloat(totalPosts / model.pageSize);

        let totalPages = totalPagesInt;
        if ((totalPagesFloat - totalPagesInt) > 0) {
            totalPages++;
        }

        model.total_pages = totalPages;


        model.pages = [];
        let no = 1;
        let offset = 0;

        for (let i = 0; i < totalPages; i++) {
            model.pages.push({
                top: top,
                posts: [],
                lastPage: false,
                firstPage: false,
            });
            for (let j = offset; j < totalPosts; j++) {
                for (let k = 0; k < model.posts[j].posts.length; k++) {
                    model.pages[i].posts.push({
                        "no": no,
                        "date": model.posts[j].posts[k].date,
                        "debit_account": model.posts[j].posts[k].debit_or_credit === "debit" ? "To " + model.posts[j].posts[k].account_name + " A/c #" + model.posts[j].posts[k].account_number + " Dr." : "",
                        "debit_account_number": model.posts[j].posts[k].debit_or_credit === "debit" ? model.posts[j].posts[k].account_number : "",
                        "credit_account": model.posts[j].posts[k].debit_or_credit === "credit" ? "By " + model.posts[j].posts[k].account_name + " A/c #" + model.posts[j].posts[k].account_number + " Cr." : "",
                        "credit_account_number": model.posts[j].posts[k].debit_or_credit === "credit" ? model.posts[j].posts[k].account_number : "",
                        "debit_or_credit": model.posts[j].posts[k].debit_or_credit,
                        "debit_amount": model.posts[j].posts[k].debit ? model.posts[j].posts[0].debit : "",
                        "credit_amount": model.posts[j].posts[k].credit ? model.posts[j].posts[0].credit : "",
                        "reference_code": model.posts[j].reference_code,
                        "reference_model": model.posts[j].reference_model,
                    });
                    no++;
                    if (model.pages[i].posts.length === model.pageSize) {
                        break;
                    }
                }
                if (model.pages[i].posts.length === model.pageSize) {
                    break;
                }
            }

            if (model.pages[i].posts.length < model.pageSize) {
                for (let s = model.pages[i].posts.length; s < model.pageSize; s++) {
                    model.pages[i].posts.push({});
                }
            }
            offset += model.pageSize;

            if (i === 0) {
                model.pages[i].firstPage = true;
            }

            if ((i + 1) === totalPages) {
                model.pages[i].lastPage = true;
            }
        }
    }


    let [model, setModel] = useState({});

    let [show, setShow] = useState(props.show);

    function handleClose() {
        setShow(false);
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

    function ObjectToSearchQueryParams(object) {
        return Object.keys(object)
            .map(function (key) {
                return `search[${key}]=${object[key]}`;
            })
            .join("&");
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

        if (model.name) {
            filename += model.name + "_acc_no_" + model.number;
        }

        filename = filename.split(' ').join('_')

        if (model.dateValue) {
            filename += "_Date_" + format(new Date(model.dateValue), "MMM_dd_yyyy")
        } else if (model.fromDateValue && model.toDateValue) {
            filename += "_Date_" + format(new Date(model.fromDateValue), "MMM_dd_yyyy") + "_to_" + format(new Date(model.toDateValue), "MMM dd yyyy")
        } else if (model.fromDateValue && !model.toDateValue && !model.dateValue) {
            filename += "_Date_from_" + format(new Date(model.fromDateValue), "MMM_dd_yyyy") + "_to_present"
        } else if (model.toDateValue && !model.fromDateValue && !model.dateValue) {
            filename += "_Date_upto_" + format(new Date(model.toDateValue), "MMM_dd_yyyy")
        }


        return filename;
    }, [model])

    /*
    const handlePrint = useReactToPrint({
        content: () => printAreaRef.current,
        documentTitle: getFileName() + ".pdf",
    });*/


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


    const formatPhoneForWhatsApp = useCallback((number) => {
        // Step 1: Remove all non-digit characters
        number = number.replace(/\D/g, '');

        // Step 2: Replace starting 05 with 9665
        if (number.startsWith('05')) {
            number = '966' + number.slice(1);
        }

        return number;
    }, [])

    let [phone, setPhone] = useState("");

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
        } else if (model.phone) {
            whatsAppNo = model.phone
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
        const message = `Hello, here is your balance sheet:\n${window.location.origin}/pdfs/${getFileName()}.pdf`;
        const whatsappUrl = `https://wa.me/${whatsAppNo}?text=${encodeURIComponent(message)}`;

        window.open(whatsappUrl, "_blank");
        handleClose();

    }, [getFileName, model, formatPhoneForWhatsApp, phone]);



    let modelName = "balance_sheet";

    const [showSlider, setShowSlider] = useState(false);
    let [selectedText, setSelectedText] = useState("");

    const defaultFontSizes = useMemo(() => ({
        "pageSize": 15,
        "balanceSheetpPageSize": 20,
        "font": "Noto Naskh Semi Bold",
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

        let modelNames = ["sales", "sales_return", "purchase", "purchase_return", "quotation", "delivery_note", "balance_sheet", "customer_deposit", "customer_withdrawal"];
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

    function changePageSize(size) {
        fontSizes[modelName + "_balanceSheetpPageSize"] = parseInt(size);
        setFontSizes({ ...fontSizes });
        saveToLocalStorage("fontSizes", fontSizes);
        preparePages();
    }


    return (<>
        <Modal show={show} scrollable={true} size="xl" fullscreen onHide={handleClose} animation={false}>
            <Modal.Header>
                <Modal.Title>Balance sheet preview</Modal.Title>
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

                    {!whatsAppShare && <div className="d-flex align-items-center border rounded bg-light p-2" style={{ marginRight: "200px" }}>
                        <button className="btn btn-outline-secondary" onClick={() => decrementSize(modelName + "_marginTop")}>−</button>
                        <span className="mx-2">Margin Top: {fontSizes[modelName + "_marginTop"]?.size}</span>
                        <button className="btn btn-outline-secondary" onClick={() => incrementSize(modelName + "_marginTop")}>+</button>

                    </div>}


                    <>
                        <label className="form-label">Page Size:</label>
                        <select
                            value={fontSizes[modelName + "_balanceSheetpPageSize"]}
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
                            <option value="10">10</option>
                            <option value="15">15</option>
                            <option value="20">20</option>
                            <option value="21">21</option>
                            <option value="22">22</option>
                            <option value="23">23</option>
                            <option value="24">24</option>
                            <option value="25">25</option>
                            <option value="30">30</option>
                            <option value="35">35</option>
                            <option value="40">40</option>
                        </select>
                    </>





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
                </div>

            </Modal.Header>
            <Modal.Body>
                <div ref={printAreaRef}>
                    <BalanceSheetPrintPreviewContent model={model} modelName={modelName} whatsAppShare={whatsAppShare} selectText={selectText} fontSizes={fontSizes} userName={localStorage.getItem("user_name") ? localStorage.getItem("user_name") : ""} />
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

export default BalanceSheetPrintPreview;